/**
 * TI4-C0 / G06 — ActorEngine.applyMutationPlan({ transactional:true }) must not claim a successful rollback it did not verify.
 *
 * Real production module under test: scripts/governance/actor-engine/actor-engine.js (imported by FILE path so the Node shim's fake ActorEngine,
 * which replaces the Foundry-absolute specifier, is bypassed). Fault injection is realistic: the plan's own stages (_applyCreateOps / _applySetOps ...)
 * and the restore (restoreFromSnapshot, whose result shape is the real SnapshotService contract) are the injected seams; Actor.deleteDocuments and
 * the world-actor registry are the CREATE-bucket seams. Level: L1 (one client, offline). No Foundry runtime claim.
 *
 * The runner RECORDS each case's failure instead of stopping at the first, so a fail-before run shows exactly which behaviors the defect breaks.
 */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const notes = { error: [], warn: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };

const { ActorEngine } = await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href);
const { SWSELogger } = await import('/systems/foundryvtt-swse/scripts/core/logger.js');

/* ------------------------------------------------------------------------------------------ */
/* Harness                                                                                     */
/* ------------------------------------------------------------------------------------------ */
const STAGES = ['_applyCreateOps', '_applyDeleteOps', '_applySetOps', '_applyUpdateOps', '_applyAddOps', 'recalcAll', 'restoreFromSnapshot', '_validateMutationPlan', '_rollbackTransactionalPlan'];
const savedStages = Object.fromEntries(STAGES.map((k) => [k, ActorEngine[k]]));
const savedActor = globalThis.Actor;
const savedGame = globalThis.game;

const logLines = [];
for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
  const orig = SWSELogger[level]?.bind(SWSELogger);
  if (!orig) continue;
  SWSELogger[level] = (...a) => { logLines.push({ level, msg: String(a[0]) }); };
}

function mkActor() {
  return { id: 'actor1', name: 'Test Actor', items: [], toObject: () => ({ name: 'Test Actor', system: { credits: 100 }, items: [], effects: [] }) };
}

/**
 * Installs one scenario:
 *   fail          which stage throws ('set' by default; the thrown Error object is returned as `injected`)
 *   created       CREATE-bucket world actors the plan "created" (ids)
 *   restore       async () => result | throws        (what ActorEngine.restoreFromSnapshot returns)
 *   deleteDocs    async (ids) => docs | throws      (Actor.deleteDocuments)
 *   registryKeep  ids that remain in game.actors after the delete call (a resolved delete that did not delete)
 */
function install({ fail = 'set', created = [], restore, deleteDocs, registryKeep = [] } = {}) {
  const calls = { create: 0, set: 0, restore: 0, del: 0, recalc: 0, validate: 0 };
  const injected = new Error('set stage failed');
  const registry = new Map(created.map((id) => [id, { id }]));
  ActorEngine._validateMutationPlan = () => { calls.validate++; };
  ActorEngine._applyCreateOps = async (specs, tempIdMap) => { calls.create++; for (const id of created) tempIdMap[`tmp_${id}`] = id; };
  ActorEngine._applyDeleteOps = async () => {};
  ActorEngine._applySetOps = async () => { calls.set++; if (fail === 'set') throw injected; };
  ActorEngine._applyUpdateOps = async () => {};
  ActorEngine._applyAddOps = async () => {};
  ActorEngine.recalcAll = async () => { calls.recalc++; };
  ActorEngine.restoreFromSnapshot = async (...a) => { calls.restore++; calls.restoreArgs = a; if (!restore) throw new Error('unexpected restore'); return restore(...a); };
  globalThis.Actor = {
    deleteDocuments: async (ids) => {
      calls.del++; calls.deleted = ids;
      const docs = deleteDocs ? await deleteDocs(ids) : ids.map((id) => ({ id }));
      for (const id of ids) if (!registryKeep.includes(id)) registry.delete(id);
      return docs;
    }
  };
  globalThis.game = { ...(savedGame ?? {}), actors: { get: (id) => registry.get(id) } };
  return { calls, injected, registry };
}
function restoreAll() {
  for (const k of STAGES) ActorEngine[k] = savedStages[k];
  globalThis.Actor = savedActor; globalThis.game = savedGame;
}
async function runPlan(actor, options = {}, plan = { set: { 'system.credits': 5 }, create: { actors: [{ temporaryId: 'x' }] } }) {
  logLines.length = 0;
  try { await ActorEngine.applyMutationPlan(actor, plan, { validate: false, rederive: false, source: 'g06.test', ...options }); return null; } catch (e) { return e; }
}
const rolledBackClaims = () => logLines.filter((l) => /rolled back to pre-plan snapshot/i.test(l.msg));

const exactOk = () => ({ success: true, exact: true, usable: true, requiresManualReview: false, verification: { rootMatched: true, itemsMatched: true, effectsMatched: true } });

/* ------------------------------------------------------------------------------------------ */
const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`  PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message.split('\n')[0] }); console.log(`  FAIL  ${name}\n        -> ${e.message.split('\n')[0]}`); }
  finally { restoreAll(); }
}

/* ---- restoration verdicts ---- */
await check('restore {success:false, exact:false} is INDETERMINATE, the original error is preserved, and no "rolled back" claim is logged', async () => {
  const s = install({ restore: async () => ({ success: false, exact: false, code: 'SNAPSHOT_ROOT_RESTORE_FAILED', failedStep: 'root', partialMutation: true, compensationAttempted: true, compensationSucceeded: false, error: 'root update refused' }) });
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err, s.injected, 'the SAME error object is propagated');
  assert.equal(err.message, 'set stage failed');
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.rollback.outcome, 'INDETERMINATE');
  assert.equal(err.partialMutationPossible, true);
  assert.equal(err.rollback.target.verdict, 'FAILED');
  assert.equal(err.rollback.target.code, 'SNAPSHOT_ROOT_RESTORE_FAILED');
  assert.equal(rolledBackClaims().length, 0, 'no successful-rollback log line');
});

await check('restore {success:true, exact:false} (inexact / legacy) is INDETERMINATE, never a compensation claim', async () => {
  install({ restore: async () => ({ success: true, exact: false, usable: false, requiresManualReview: true, verification: { rootMatched: true, itemsMatched: true, effectsMatched: true } }) });
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.partialMutationPossible, true);
  assert.equal(err.rollback.compensation, 'INEXACT');
  assert.equal(err.rollback.target.verdict, 'INEXACT');
  assert.equal(rolledBackClaims().length, 0);
});

await check('restore THROWS: INDETERMINATE; the original error and the restore error are both preserved', async () => {
  const s = install({ restore: async () => { throw new Error('restore boom'); } });
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err, s.injected);
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.partialMutationPossible, true);
  assert.equal(err.rollback.target.verdict, 'THREW');
  assert.equal(err.rollback.target.restoreError, 'restore boom');
  assert.equal(rolledBackClaims().length, 0);
});

for (const [label, value] of [['undefined', undefined], ['null', null], ['a string', 'ok'], ['{}', {}], ['{success:"yes"}', { success: 'yes', exact: true }], ['an array', []]]) {
  await check(`restore returns a MALFORMED result (${label}): INDETERMINATE, not treated as success`, async () => {
    install({ restore: async () => value });
    const err = await runPlan(mkActor(), { transactional: true });
    assert.equal(err.rollbackOutcome, 'INDETERMINATE');
    assert.equal(err.partialMutationPossible, true);
    assert.equal(err.rollback.target.verdict, 'MALFORMED');
    assert.equal(rolledBackClaims().length, 0);
  });
}

await check('a verified exact restore with nothing created is FAILED_COMPENSATED, partialMutationPossible is NOT set, and the rolled-back line is logged once', async () => {
  const s = install({ restore: async () => exactOk() });
  const err = await runPlan(mkActor(), { transactional: true }, { set: { 'system.credits': 5 } });
  assert.equal(err, s.injected);
  assert.equal(err.rollbackOutcome, 'FAILED_COMPENSATED');
  assert.equal(err.rollback.outcome, 'FAILED_COMPENSATED');
  assert.equal(err.rollback.compensation, 'EXACT');
  assert.equal(err.partialMutationPossible, undefined, 'not flagged partial when whole-scope compensation is verified');
  assert.equal(rolledBackClaims().length, 1);
});

/* ---- CREATE-bucket scope ---- */
await check('target restore exact but CREATE cleanup THROWS and the actor is still present: INDETERMINATE (PARTIAL)', async () => {
  const s = install({ created: ['w1', 'w2'], restore: async () => exactOk(), deleteDocs: async () => { throw new Error('delete refused'); }, registryKeep: ['w1', 'w2'] });
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err, s.injected);
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.partialMutationPossible, true);
  assert.equal(err.rollback.compensation, 'PARTIAL');
  assert.deepEqual(err.rollback.created.stillPresent.sort(), ['w1', 'w2']);
  assert.equal(err.rollback.created.verifiedAbsent, false);
  assert.equal(rolledBackClaims().length, 0);
});

await check('CREATE cleanup succeeds (verified absent) but the target restore is inexact: INDETERMINATE', async () => {
  install({ created: ['w1'], restore: async () => ({ success: true, exact: false }) });
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.rollback.created.verifiedAbsent, true);
  assert.equal(err.rollback.target.verdict, 'INEXACT');
  assert.equal(err.rollback.compensation, 'PARTIAL', 'part of the scope (created actors) is verified, the target is not');
  assert.equal(rolledBackClaims().length, 0);
});

await check('a RESOLVED delete call is not proof of deletion when the registry still holds the actor', async () => {
  install({ created: ['w1'], restore: async () => exactOk(), deleteDocs: async (ids) => ids.map((id) => ({ id })), registryKeep: ['w1'] });
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.deepEqual(err.rollback.created.stillPresent, ['w1']);
  assert.equal(err.rollback.created.verifiedAbsent, false);
});

await check('CREATE cleanup verified absent + exact target restore is FAILED_COMPENSATED covering BOTH parts of the scope', async () => {
  const s = install({ created: ['w1', 'w2'], restore: async () => exactOk() });
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err, s.injected);
  assert.equal(err.rollbackOutcome, 'FAILED_COMPENSATED');
  assert.equal(err.rollback.created.verifiedAbsent, true);
  assert.deepEqual(s.calls.deleted, ['w1', 'w2']);
  assert.equal(err.partialMutationPossible, undefined);
  assert.equal(rolledBackClaims().length, 1);
});

await check('a delete call that THROWS but leaves the registry empty is verified by state (cleanup effective), and the error is still recorded', async () => {
  const s = install({ created: ['w1'], restore: async () => exactOk() });
  // the world actor really was removed server-side, then the acknowledgement was lost
  globalThis.Actor.deleteDocuments = async (ids) => { for (const id of ids) s.registry.delete(id); throw new Error('ack lost'); };
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err.rollback.created.error, 'ack lost');
  assert.equal(err.rollback.created.verifiedAbsent, true, 'verification is by observed state, not by the call result');
});

await check('both parts fail: INDETERMINATE with compensation FAILED', async () => {
  install({ created: ['w1'], restore: async () => ({ success: false, exact: false }), deleteDocs: async () => { throw new Error('nope'); }, registryKeep: ['w1'] });
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.rollback.compensation, 'FAILED');
});

/* ---- review correction 1: R1 (CREATE cleanup needs OBSERVED absence) and R2 (registry read failures cannot mask the original error) ---- */
await check('R1: registry UNAVAILABLE, the delete call returns every requested id: cleanup is UNVERIFIED, the outcome is INDETERMINATE (never FAILED_COMPENSATED), the returned ids are kept as diagnostics', async () => {
  const s = install({ created: ['w1', 'w2'], restore: async () => exactOk() });
  globalThis.game = { ...(savedGame ?? {}) }; delete globalThis.game.actors;   // no world-actor registry to observe
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err, s.injected);
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.partialMutationPossible, true);
  assert.equal(err.rollback.created.verifiedAbsent, false);
  assert.deepEqual(err.rollback.created.unverifiable, ['w1', 'w2']);
  assert.deepEqual(err.rollback.created.returnedIds, ['w1', 'w2'], 'the API-returned ids are retained as DIAGNOSTIC evidence only');
  assert.equal(err.rollback.created.registryAvailable, false);
  assert.ok(err.rollback.reasons.includes('created-cleanup-unverified'));
  assert.equal(err.rollback.compensation, 'PARTIAL');
  assert.equal(rolledBackClaims().length, 0);
});

await check('R1: registry present but its `get` is not callable: same — unverified, INDETERMINATE', async () => {
  install({ created: ['w1'], restore: async () => exactOk() });
  globalThis.game = { ...(savedGame ?? {}), actors: {} };
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.rollback.created.verifiedAbsent, false);
  assert.equal(err.rollback.created.registryAvailable, false);
});

await check('R1: registry UNAVAILABLE and the delete call THROWS: INDETERMINATE, the delete error is recorded', async () => {
  install({ created: ['w1'], restore: async () => exactOk(), deleteDocs: async () => { throw new Error('delete refused'); } });
  globalThis.game = { ...(savedGame ?? {}) }; delete globalThis.game.actors;
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.rollback.created.error, 'delete refused');
  assert.equal(err.rollback.created.verifiedAbsent, false);
  assert.ok(err.rollback.reasons.includes('created-cleanup-failed'));
});

await check('R1: registry AVAILABLE and every created actor observed absent: FAILED_COMPENSATED (accepted behavior unchanged); absent ids are listed', async () => {
  install({ created: ['w1', 'w2'], restore: async () => exactOk() });
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err.rollbackOutcome, 'FAILED_COMPENSATED');
  assert.deepEqual(err.rollback.created.absentIds, ['w1', 'w2']);
  assert.equal(err.rollback.created.registryAvailable, true);
  assert.deepEqual(err.rollback.created.registryErrors, []);
});

await check('R1: registry AVAILABLE and at least one created actor remains: INDETERMINATE, the remaining actor is named', async () => {
  install({ created: ['w1', 'w2'], restore: async () => exactOk(), registryKeep: ['w2'] });
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.deepEqual(err.rollback.created.stillPresent, ['w2']);
  assert.deepEqual(err.rollback.created.absentIds, ['w1']);
});

await check('R2: game.actors.get THROWS for the first id: the ORIGINAL error is still the propagated error; the registry failure is secondary evidence; INDETERMINATE; no verified-rollback log; nothing re-run', async () => {
  const s = install({ created: ['w1', 'w2'], restore: async () => exactOk() });
  globalThis.game = { ...(savedGame ?? {}), actors: { get: (id) => { if (id === 'w1') throw new Error('registry read failed'); return undefined; } } };
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err, s.injected, 'identity of the original mutation error is preserved');
  assert.equal(err.message, 'set stage failed');
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.partialMutationPossible, true);
  assert.deepEqual(err.rollback.created.registryErrors, [{ id: 'w1', error: 'registry read failed' }]);
  assert.ok(err.rollback.created.unverifiable.includes('w1'));
  assert.equal(err.rollback.created.verifiedAbsent, false);
  assert.equal(rolledBackClaims().length, 0);
  assert.equal(s.calls.set, 1); assert.equal(s.calls.restore, 1); assert.equal(s.calls.del, 1);
});

await check('R2: a LATER lookup throws after an earlier id was observed absent: the earlier observation is kept, the failed one is unverifiable, INDETERMINATE, the original error propagates', async () => {
  const s = install({ created: ['w1', 'w2'], restore: async () => exactOk() });
  globalThis.game = { ...(savedGame ?? {}), actors: { get: (id) => { if (id === 'w2') throw new Error('second lookup failed'); return undefined; } } };
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err, s.injected);
  assert.deepEqual(err.rollback.created.absentIds, ['w1']);
  assert.deepEqual(err.rollback.created.unverifiable, ['w2']);
  assert.deepEqual(err.rollback.created.registryErrors, [{ id: 'w2', error: 'second lookup failed' }]);
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.partialMutationPossible, true);
});

await check('R2: reading game.actors ITSELF throws: treated as an unavailable registry, the original error still propagates', async () => {
  const s = install({ created: ['w1'], restore: async () => exactOk() });
  const g = { ...(savedGame ?? {}) }; Object.defineProperty(g, 'actors', { get() { throw new Error('game.actors getter failed'); } });
  globalThis.game = g;
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err, s.injected);
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.rollback.created.registryAvailable, false);
  assert.ok(/game\.actors getter failed/.test(JSON.stringify(err.rollback.created.registryErrors)));
});

await check('R2: even an UNEXPECTED failure inside the rollback helper cannot replace the original error: the error propagates with INDETERMINATE evidence', async () => {
  const s = install({ restore: async () => exactOk() });
  ActorEngine._rollbackTransactionalPlan = async () => { throw new Error('helper blew up'); };
  const err = await runPlan(mkActor(), { transactional: true });
  assert.equal(err, s.injected);
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.partialMutationPossible, true);
  assert.ok(err.rollback.reasons.includes('rollback-verification-threw'));
  assert.match(JSON.stringify(err.rollback), /helper blew up/);
  assert.equal(rolledBackClaims().length, 0);
});

/* ---- unchanged paths ---- */
await check('a plan that succeeds behaves as before: no restore, no delete, no rollback fields, no throw', async () => {
  const s = install({ fail: 'none', created: ['w1'], restore: async () => exactOk() });
  const err = await runPlan(mkActor(), { transactional: true, rederive: true });
  assert.equal(err, null);
  assert.equal(s.calls.restore, 0); assert.equal(s.calls.del, 0); assert.equal(s.calls.recalc, 1);
});

await check('a NON-transactional failure keeps its semantics: no restore, no cleanup, no rollback evidence, no partialMutationPossible', async () => {
  const s = install({ created: ['w1'], restore: async () => exactOk() });
  const err = await runPlan(mkActor(), { transactional: false });
  assert.equal(err, s.injected);
  assert.equal(s.calls.restore, 0); assert.equal(s.calls.del, 0);
  assert.equal(err.rollback, undefined); assert.equal(err.rollbackOutcome, undefined); assert.equal(err.partialMutationPossible, undefined);
});

await check('a failure BEFORE the snapshot exists restores nothing and attaches no rollback evidence', async () => {
  const s = install({ restore: async () => exactOk() });
  ActorEngine._validateMutationPlan = () => { throw new Error('invalid plan'); };
  const err = await runPlan(mkActor(), { transactional: true, validate: true });
  assert.equal(err.message, 'invalid plan');
  assert.equal(s.calls.restore, 0); assert.equal(s.calls.create, 0);
  assert.equal(err.rollback, undefined); assert.equal(err.partialMutationPossible, undefined);
});

await check('compensation never replays the operation: each stage runs once, restore once, delete once', async () => {
  const s = install({ created: ['w1'], restore: async () => ({ success: false, exact: false }) });
  await runPlan(mkActor(), { transactional: true });
  assert.equal(s.calls.create, 1); assert.equal(s.calls.set, 1); assert.equal(s.calls.restore, 1); assert.equal(s.calls.del, 1);
});

await check('a non-Error throw is wrapped so rollback evidence can still be attached; the cause is preserved', async () => {
  install({ restore: async () => ({ success: false, exact: false }) });
  ActorEngine._applySetOps = async () => { throw 'plain string failure'; };
  const err = await runPlan(mkActor(), { transactional: true }, { set: { a: 1 } });
  assert.ok(err instanceof Error);
  assert.equal(err.cause, 'plain string failure');
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
});

await check('the evidence is machine-readable and claims no L2/L3 guarantee', async () => {
  install({ created: ['w1'], restore: async () => ({ success: true, exact: false, requiresManualReview: true }) });
  const err = await runPlan(mkActor(), { transactional: true });
  const text = JSON.stringify(err.rollback);
  assert.ok(!/\bL[23]\b|durable|cross-client/i.test(text), 'no L2/L3/durability wording in the evidence');
  assert.equal(err.rollback.level, 'L1');
  assert.equal(typeof err.rollback.legacySnapshot, 'boolean');
  assert.ok(Array.isArray(err.rollback.reasons) && err.rollback.reasons.length >= 1);
  assert.doesNotThrow(() => JSON.parse(text));
});

// G06-S1: applyMutationPlan no longer CAPTURES a legacy snapshot (it captures the SnapshotService schema-v2 snapshot; see tests/ti4c0-g06s1-exact-snapshot.test.mjs).
// The rule this case guards is unchanged: a LEGACY snapshot (no schemaVersion) handed to the rollback helper can never be certified exact. It is now exercised directly.
await check('a LEGACY snapshot (no schemaVersion) handed to the rollback helper cannot verify exact — recorded honestly, never manufactured', async () => {
  const s = install({ restore: async () => ({ success: true, exact: false }) });
  const legacy = mkActor().toObject();
  assert.equal(legacy.schemaVersion, undefined, 'a legacy snapshot carries no schemaVersion');
  const rollback = await ActorEngine._rollbackTransactionalPlan(mkActor(), legacy, {}, 'g06.test');
  assert.equal(s.calls.restoreArgs?.[1], legacy);
  assert.equal(rollback.legacySnapshot, true);
  assert.equal(rollback.outcome, 'INDETERMINATE');
});

/* ---- callers ---- */
const { ProgressionFinalizer } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js');
const savedResolve = ProgressionFinalizer._resolveActorEngine;
const savedSync = ProgressionFinalizer._syncPostApplyState;

await check('PROGRESSION: an uncertain rollback is surfaced as INDETERMINATE (not an ordinary retryable failure) with machine-readable evidence, and the post-apply sync is not run', async () => {
  install({ created: ['w1'], restore: async () => ({ success: true, exact: false }) });
  let syncCalls = 0; ProgressionFinalizer._syncPostApplyState = async () => { syncCalls++; };
  ProgressionFinalizer._resolveActorEngine = () => ActorEngine;
  try {
    const r = await ProgressionFinalizer._applyMutationPlan(mkActor(), { set: { 'system.credits': 5 }, create: { actors: [{ temporaryId: 'x' }] } });
    assert.equal(r.success, false);
    assert.equal(r.indeterminate, true);
    assert.equal(r.rollbackOutcome, 'INDETERMINATE');
    assert.equal(r.partialMutationPossible, true);
    assert.equal(r.rollback.outcome, 'INDETERMINATE');
    assert.match(r.error, /set stage failed/, 'the original error text is kept');
    assert.match(r.error, /could not be verified|partially|may/i, 'the message does not read as a clean failure');
    assert.equal(syncCalls, 0, 'no post-apply sync after a failed plan');
  } finally { ProgressionFinalizer._resolveActorEngine = savedResolve; ProgressionFinalizer._syncPostApplyState = savedSync; }
});

await check('PROGRESSION: a verified compensated failure stays an ordinary failure, carrying FAILED_COMPENSATED evidence', async () => {
  install({ restore: async () => exactOk() });
  ProgressionFinalizer._resolveActorEngine = () => ActorEngine;
  try {
    const r = await ProgressionFinalizer._applyMutationPlan(mkActor(), { set: { 'system.credits': 5 } });
    assert.equal(r.success, false);
    assert.equal(r.indeterminate, undefined);
    assert.equal(r.rollbackOutcome, 'FAILED_COMPENSATED');
    assert.equal(r.partialMutationPossible, undefined);
    assert.equal(r.error, 'set stage failed');
  } finally { ProgressionFinalizer._resolveActorEngine = savedResolve; }
});

await check('PROGRESSION: a failure that carries no rollback evidence keeps the original simple shape', async () => {
  ProgressionFinalizer._resolveActorEngine = () => ({ applyMutationPlan: async () => { throw new Error('engine said no'); } });
  try {
    const r = await ProgressionFinalizer._applyMutationPlan(mkActor(), { set: {} });
    assert.deepEqual(r, { success: false, error: 'engine said no' });
  } finally { ProgressionFinalizer._resolveActorEngine = savedResolve; }
});

await check('PROGRESSION: the finalizer no longer claims a failed plan always leaves the actor unchanged', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../scripts/apps/progression-framework/shell/progression-finalizer.js', import.meta.url), 'utf8');
  assert.ok(!/should leave the actor unchanged/.test(src));
  assert.ok(!/Only if that rollback itself fails is error\.partialMutationPossible set/.test(src));
});

/* ---- lightsaber caller ---- */
const { LightsaberConstructionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/crafting/lightsaber-construction-engine.js');

await check('LIGHTSABER: an uncertain rollback is reported as indeterminate with the ORIGINAL roll preserved; no reroll, no second credit transaction, no retry', async () => {
  const helperName = ['mutationFailureResult', 'describeMutationFailure'].find((n) => typeof LightsaberConstructionEngine[n] === 'function');
  assert.ok(helperName, 'the engine exposes the failure-mapping helper used by its mutation catch');
  const roll = { finalDc: 20, rollTotal: 23, modifier: 13, rollRaw: 10, checkMode: 'roll', cost: 1500 };
  install({ restore: async () => ({ success: true, exact: false }) });
  const err = await runPlan(mkActor(), { transactional: true });
  const out = LightsaberConstructionEngine[helperName](err, roll);
  assert.equal(out.success, false);
  assert.equal(out.reason, 'mutation_failed', 'the existing reason code is kept');
  assert.equal(out.indeterminate, true);
  assert.equal(out.rollbackOutcome, 'INDETERMINATE');
  assert.equal(out.partialMutationPossible, true);
  for (const k of ['finalDc', 'rollTotal', 'modifier', 'rollRaw', 'checkMode']) assert.equal(out[k], roll[k], `original roll value ${k} preserved`);
  assert.equal(out.retry, undefined, 'no retry instruction');
});

await check('LIGHTSABER: a verified compensated failure keeps the original simple reason and is not marked indeterminate', async () => {
  const helperName = ['mutationFailureResult', 'describeMutationFailure'].find((n) => typeof LightsaberConstructionEngine[n] === 'function');
  assert.ok(helperName);
  install({ restore: async () => exactOk() });
  const err = await runPlan(mkActor(), { transactional: true }, { set: { a: 1 } });
  const out = LightsaberConstructionEngine[helperName](err, { finalDc: 20, rollTotal: 23, modifier: 13, rollRaw: 10, checkMode: 'roll', cost: 1500 });
  assert.equal(out.success, false); assert.equal(out.reason, 'mutation_failed');
  assert.equal(out.indeterminate, undefined);
  assert.equal(out.rollbackOutcome, 'FAILED_COMPENSATED');
});

await check('LIGHTSABER: the mutation catch uses the mapping helper and performs no second roll, plan or retry', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../scripts/engine/crafting/lightsaber-construction-engine.js', import.meta.url), 'utf8');
  const start = src.indexOf('Construction mutation failed');
  const end = src.indexOf('attemptConstruction failed:', start);
  assert.ok(start > 0 && end > start);
  const catchBody = src.slice(start - 60, end);
  assert.match(catchBody, /mutationFailureResult|describeMutationFailure/);
  assert.ok(!/safeRoll|applyMutationPlan|attemptConstruction/.test(catchBody), 'the catch does not roll, re-apply or retry');
});

await check('WORKBENCH: the failure view never asserts "credits were not deducted" for an indeterminate result', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync(new URL('../scripts/apps/customization/item-customization-workbench.js', import.meta.url), 'utf8');
  const i = src.indexOf('_getLightsaberResultView(result = null)');
  const view = src.slice(i, i + 2600);
  const guard = view.indexOf('result.indeterminate');
  const claim = view.indexOf('No item was created and credits were not deducted');
  assert.ok(guard > 0 && claim > 0 && guard < claim, 'the indeterminate branch precedes (and excludes) the clean-failure claim');
  assert.match(view, /Construction Uncertain/);
  assert.match(view, /do not retry or roll again/i);
});

/* ------------------------------------------------------------------------------------------ */
const failed = results.filter((r) => !r.ok);
console.log(`\nTI4-C0 G06 rollback verification: ${results.length - failed.length}/${results.length} passed.`);
if (failed.length) { console.error(`${failed.length} FAILED:`); for (const f of failed) console.error(`  - ${f.name}`); process.exit(1); }
