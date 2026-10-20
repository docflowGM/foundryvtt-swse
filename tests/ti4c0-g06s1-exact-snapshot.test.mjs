/**
 * TI4-C0 / G06-S1 — exact transactional snapshot certification.
 *
 * Real modules under test, NOT mocked at the restore seam:
 *   - scripts/governance/actor-engine/actor-engine.js   (imported by FILE path; its applyMutationPlan / _rollbackTransactionalPlan / restoreFromSnapshot are the real ones)
 *   - scripts/governance/snapshot/snapshot-service.js   (the REAL SnapshotService, reached through the real ActorEngine.restoreFromSnapshot wrapper)
 * Only the plan's own stages (_applyCreateOps / _applySetOps / recalcAll / _validateMutationPlan) are injected, and the shim's fake ActorEngine
 * (the object SnapshotService itself mutates the actor through) is a plain-object stand-in for Foundry documents. Level: L1 (offline, one client).
 * No Foundry runtime claim: see docs/audits/transaction-integrity/ti4-c0-g06s1-checkpoint.md.
 *
 * The runner RECORDS each case's failure rather than stopping at the first, so a fail-before run shows exactly which behaviours are missing.
 */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
import { fakeActorEngineCallLog, resetFakeActorEngine } from './helpers/foundry-shim/fakes/actor-engine.fake.mjs';

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn: () => {}, info: () => {}, error: () => {} } };

const { ActorEngine } = await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href);
const { SnapshotService } = await import('/systems/foundryvtt-swse/scripts/governance/snapshot/snapshot-service.js');
const { ActorEngine: FakeEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { SWSELogger } = await import('/systems/foundryvtt-swse/scripts/core/logger.js');

for (const level of ['log', 'info', 'warn', 'error', 'debug']) { if (SWSELogger[level]) SWSELogger[level] = () => {}; }

/* ---------------------------------------------------------------------------------------------- */
/* Harness                                                                                         */
/* ---------------------------------------------------------------------------------------------- */
const STAGES = ['_applyCreateOps', '_applyDeleteOps', '_applySetOps', '_applyUpdateOps', '_applyAddOps', 'recalcAll', '_validateMutationPlan'];
const savedStages = Object.fromEntries(STAGES.map((k) => [k, ActorEngine[k]]));
const FAKE_METHODS = ['updateActor', 'createEmbeddedDocuments', 'updateEmbeddedDocuments', 'deleteEmbeddedDocuments'];
const savedFake = Object.fromEntries(FAKE_METHODS.map((k) => [k, FakeEngine[k]]));
const savedActor = globalThis.Actor;
const savedGame = globalThis.game;
const clone = (v) => JSON.parse(JSON.stringify(v));

/** A Foundry-like actor: source `toObject(true)` is LEGACY-shaped (no actorId/schemaVersion/scope), embedded docs expose toObject(). */
function mkActor() {
  const mkDoc = (o) => ({ ...o, toObject() { const { toObject, ...rest } = this; return clone(rest); } });
  const actor = {
    id: 'actor1',
    name: 'Test Actor',
    img: 'icons/actor.png',
    type: 'character',
    folder: null,
    sort: 0,
    system: { credits: 100, hp: { value: 10, max: 10 }, notes: 'original' },
    flags: { 'foundryvtt-swse': { snapshots: [{ id: 'persisted-1' }], marker: 'keep' }, other: { a: 1 } },
    ownership: { default: 0, userA: 3 },
    prototypeToken: { name: 'Test Actor', width: 1 },
    items: [mkDoc({ _id: 'itemA', name: 'Blaster', type: 'weapon', system: { qty: 1 }, flags: {} }), mkDoc({ _id: 'itemB', name: 'Armor', type: 'armor', system: { qty: 2 }, flags: {} })],
    effects: [mkDoc({ _id: 'fxA', name: 'Buff', disabled: false, changes: [{ key: 'system.x', value: '1' }] })],
    setFlagCalls: 0,
    setFlag() { this.setFlagCalls++; },
    toObject() {
      return clone({ _id: this.id, name: this.name, type: this.type, img: this.img, folder: this.folder, sort: this.sort, system: this.system, flags: this.flags,
        ownership: this.ownership, prototypeToken: this.prototypeToken, items: this.items.map((i) => i.toObject ? i.toObject() : i), effects: this.effects.map((e) => e.toObject ? e.toObject() : e) });
    }
  };
  return actor;
}
const itemsOf = (a) => a.items;
const effectsOf = (a) => a.effects;
const view = (a) => ({
  name: a.name, img: a.img, system: clone(a.system), flags: clone(a.flags), ownership: clone(a.ownership), prototypeToken: clone(a.prototypeToken),
  items: itemsOf(a).map((i) => { const { toObject, id, ...r } = i; return clone(r); }).sort((x, y) => x._id.localeCompare(y._id)),
  effects: effectsOf(a).map((e) => { const { toObject, id, ...r } = e; return clone(r); }).sort((x, y) => x._id.localeCompare(y._id))
});

/** Installs plan-stage injection. The restore path (ActorEngine.restoreFromSnapshot → SnapshotService) is NOT stubbed. */
function install({ mutate, created = [], deleteDocs, registryKeep = [] } = {}) {
  resetFakeActorEngineAll();
  const calls = { create: 0, set: 0, recalc: 0, validate: 0, del: 0 };
  const injected = new Error('set stage failed');
  const registry = new Map(created.map((id) => [id, { id }]));
  // The shim fake stamps a non-Foundry `id` alias onto re-created documents; a real Foundry source object has only `_id`. Strip it so the
  // fake does not manufacture a content mismatch that Foundry would not.
  const fakeCreate = FakeEngine.createEmbeddedDocuments;
  FakeEngine.createEmbeddedDocuments = async (a, n, data, o) => { const out = await fakeCreate.call(FakeEngine, a, n, data, o); for (const d of out) delete d.id; return out; };
  ActorEngine._validateMutationPlan = () => { calls.validate++; };
  ActorEngine._applyCreateOps = async (specs, tempIdMap) => { calls.create++; for (const id of created) tempIdMap[`tmp_${id}`] = id; };
  ActorEngine._applyDeleteOps = async () => {};
  ActorEngine._applySetOps = async () => { calls.set++; if (mutate) await mutate(); throw injected; };
  ActorEngine._applyUpdateOps = async () => {};
  ActorEngine._applyAddOps = async () => {};
  ActorEngine.recalcAll = async () => { calls.recalc++; };
  globalThis.Actor = { deleteDocuments: async (ids) => { calls.del++; const docs = deleteDocs ? await deleteDocs(ids) : ids.map((id) => ({ id })); for (const id of ids) if (!registryKeep.includes(id)) registry.delete(id); return docs; } };
  globalThis.game = { ...(savedGame ?? {}), actors: { get: (id) => registry.get(id) } };
  return { calls, injected };
}
function resetFakeActorEngineAll() { resetFakeActorEngine(); }
function restoreAll() {
  for (const k of STAGES) ActorEngine[k] = savedStages[k];
  for (const k of FAKE_METHODS) FakeEngine[k] = savedFake[k];
  globalThis.Actor = savedActor; globalThis.game = savedGame;
}
async function runPlan(actor, options = {}, plan = { set: { 'system.credits': 5 }, create: { actors: [{ temporaryId: 'x' }] } }) {
  try { await ActorEngine.applyMutationPlan(actor, plan, { validate: false, rederive: false, source: 's1.test', ...options }); return null; } catch (e) { return e; }
}
/** Realistic mid-plan damage across every field the full-actor scope promises. */
function damage(actor) {
  return () => {
    actor.name = 'Renamed'; actor.img = 'icons/other.png';
    actor.system.credits = 5; actor.system.hp.value = 1; actor.system.addedLater = 'x'; delete actor.system.notes;
    actor.flags.other.a = 2; actor.flags['foundryvtt-swse'].marker = 'changed'; actor.flags.addedFlag = { z: 1 };
    actor.ownership.userA = 0; actor.ownership.userB = 2;
    actor.prototypeToken.name = 'Changed'; actor.prototypeToken.width = 5;
    const items = itemsOf(actor);
    items.find((i) => i._id === 'itemA').system.qty = 9;
    items.splice(items.findIndex((i) => i._id === 'itemB'), 1);
    items.push({ _id: 'itemNew', name: 'Added', type: 'gear', system: {}, flags: {} });
    const fx = effectsOf(actor);
    fx.find((e) => e._id === 'fxA').disabled = true;
    fx.push({ _id: 'fxNew', name: 'Added fx', disabled: false, changes: [] });
  };
}
const mutatedWritesToSnapshotHistory = () => fakeActorEngineCallLog.filter((c) => c.method === 'updateActor' && Object.keys(c.data ?? {}).some((k) => /snapshots/.test(k)));

const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`  PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message.split('\n')[0] }); console.log(`  FAIL  ${name}\n        -> ${e.message.split('\n')[0]}`); }
  finally { restoreAll(); }
}
const v2 = (actor, over = {}) => ({ actorId: actor.id, schemaVersion: 2, scope: 'full-actor', name: actor.name, img: actor.img, system: clone(actor.system), flags: clone(actor.flags),
  ownership: clone(actor.ownership), prototypeToken: clone(actor.prototypeToken), items: itemsOf(actor).map((i) => i.toObject ? i.toObject() : clone(i)), effects: effectsOf(actor).map((e) => e.toObject ? e.toObject() : clone(e)), ...over });
const noMutationCalls = () => fakeActorEngineCallLog.filter((c) => ['updateActor', 'createEmbeddedDocuments', 'updateEmbeddedDocuments', 'deleteEmbeddedDocuments'].includes(c.method));

/* ---------------------------------------------------------------------------------------------- */
/* 1. the legacy snapshot (today's toObject(true)) restores matching content but cannot be exact     */
/* ---------------------------------------------------------------------------------------------- */
await check('1. legacy snapshot (actor.toObject(true)) restores matching content but reports exact:false → INDETERMINATE', async () => {
  const actor = mkActor();
  const before = view(actor);
  const legacy = actor.toObject(true);
  assert.equal(legacy.schemaVersion, undefined, 'precondition: toObject(true) carries no schemaVersion');
  install({ mutate: damage(actor) });
  damage(actor)();
  const rollback = await ActorEngine._rollbackTransactionalPlan(actor, legacy, {}, 's1.test');
  assert.equal(rollback.legacySnapshot, true);
  assert.equal(rollback.target.verdict, 'INEXACT');
  assert.equal(rollback.target.exact, false);
  assert.equal(rollback.outcome, 'INDETERMINATE');
  assert.deepEqual(view(actor), before, 'content did restore; exactness is simply not certifiable for a legacy snapshot');
});

/* ---------------------------------------------------------------------------------------------- */
/* 2. principal: a genuinely restored actor, snapshotted by applyMutationPlan, is certified exact   */
/* ---------------------------------------------------------------------------------------------- */
await check('2. transactional failure: genuine restore of root, system, flags, ownership, prototypeToken, Items and Effects → FAILED_COMPENSATED, exact', async () => {
  const actor = mkActor();
  const before = view(actor);
  const s = install({ mutate: damage(actor) });
  const err = await runPlan(actor, { transactional: true });
  assert.equal(err, s.injected, 'the SAME original error object is propagated');
  assert.equal(err.message, 'set stage failed');
  assert.equal(err.rollback.legacySnapshot, false);
  assert.equal(err.rollback.target.verdict, 'EXACT');
  assert.equal(err.rollback.target.exact, true);
  assert.equal(err.rollback.compensation, 'EXACT');
  assert.equal(err.rollbackOutcome, 'FAILED_COMPENSATED');
  assert.equal(err.partialMutationPossible, undefined, 'a verified rollback does not claim a partial mutation');
  assert.deepEqual(view(actor), before, 'every field in the declared scope is back, with stable Item and Effect ids');
});

await check('2b. the captured snapshot is schema-v2 with the full declared scope and is isolated from later mutation', async () => {
  const actor = mkActor();
  let captured = null;
  install({ mutate: async () => {} });
  const orig = ActorEngine._rollbackTransactionalPlan;
  ActorEngine._rollbackTransactionalPlan = async function (a, snap, ...rest) { captured = snap; return orig.call(this, a, snap, ...rest); };
  try {
    actor.system.credits = 100;
    const err = await runPlan(actor, { transactional: true });
    assert.ok(err);
  } finally { ActorEngine._rollbackTransactionalPlan = orig; }
  assert.ok(captured, 'a snapshot was captured');
  assert.equal(captured.schemaVersion, 2);
  assert.equal(captured.actorId, 'actor1');
  assert.equal(captured.scope, 'full-actor');
  for (const k of ['name', 'img', 'system', 'flags', 'ownership', 'prototypeToken', 'items', 'effects']) assert.ok(k in captured, `snapshot carries ${k}`);
  assert.deepEqual(captured.items.map((i) => i._id).sort(), ['itemA', 'itemB']);
  assert.deepEqual(captured.effects.map((e) => e._id), ['fxA']);
  actor.system.credits = 0; actor.flags.other.a = 99; itemsOf(actor)[0].system.qty = 77;
  assert.equal(captured.system.credits, 100, 'snapshot is a deep copy, not a live reference');
  assert.equal(captured.flags.other.a, 1);
  assert.equal(captured.items[0].system.qty, 1);
});

await check('2c. documented scope boundary: the schema-v2 snapshot does NOT carry fields outside SnapshotService full-actor scope (_id, type, folder, sort)', async () => {
  const actor = mkActor();
  const snap = SnapshotService.captureExactSnapshot ? SnapshotService.captureExactSnapshot(actor) : null;
  assert.ok(snap, 'SnapshotService exposes the in-memory schema-v2 capture');
  const legacyKeys = Object.keys(actor.toObject(true)).sort();
  const covered = Object.keys(snap).filter((k) => legacyKeys.includes(k));
  const outOfScope = legacyKeys.filter((k) => !(k in snap));
  assert.deepEqual(outOfScope.sort(), ['_id', 'folder', 'sort', 'type'], 'out-of-scope root fields are exactly those the restoration plan never reads or writes');
  assert.ok(covered.length >= 8);
});

/* ---------------------------------------------------------------------------------------------- */
/* 3-4. identity / schema / scope rejected BEFORE any mutation                                       */
/* ---------------------------------------------------------------------------------------------- */
for (const [label, over, code] of [
  ['3. snapshot for a different Actor', { actorId: 'someone-else' }, 'SNAPSHOT_ACTOR_MISMATCH'],
  ['3b. schema-v2 snapshot with no actorId', { actorId: undefined }, 'SNAPSHOT_ACTOR_MISMATCH'],
  ['4. unsupported schemaVersion', { schemaVersion: 3 }, 'SNAPSHOT_SCHEMA_UNSUPPORTED'],
  ['4b. unsupported scope', { scope: 'everything' }, 'SNAPSHOT_SCOPE_UNSUPPORTED']
]) {
  await check(`${label} → rejected before any mutation, INDETERMINATE`, async () => {
    const actor = mkActor();
    install();
    damage(actor)();
    const dmg = view(actor);
    const rollback = await ActorEngine._rollbackTransactionalPlan(actor, v2(mkActor(), over), {}, 's1.test');
    assert.equal(rollback.outcome, 'INDETERMINATE');
    assert.equal(rollback.target.verdict, 'FAILED');
    assert.equal(rollback.target.code, code);
    assert.equal(noMutationCalls().length, 0, 'no mutation was attempted');
    assert.deepEqual(view(actor), dmg, 'the actor was left untouched');
  });
}

/* ---------------------------------------------------------------------------------------------- */
/* 5. root and embedded differences that survive the restore are detected                            */
/* ---------------------------------------------------------------------------------------------- */
await check('5. a root difference that survives the restore (ownership write dropped) is detected → INDETERMINATE', async () => {
  const actor = mkActor();
  const s = install({ mutate: damage(actor) });
  const realUpdate = FakeEngine.updateActor;
  FakeEngine.updateActor = async (a, data, o) => realUpdate.call(FakeEngine, a, Object.fromEntries(Object.entries(data).filter(([k]) => !k.startsWith('ownership'))), o);
  const err = await runPlan(actor, { transactional: true });
  assert.equal(err, s.injected);
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.partialMutationPossible, true);
  assert.notEqual(err.rollback.target.verdict, 'EXACT');
  assert.equal(err.rollback.target.contentVerified, false);
});

await check('5b. an embedded Item whose content differs after the restore (update dropped) is detected → INDETERMINATE', async () => {
  const actor = mkActor();
  install({ mutate: damage(actor) });
  FakeEngine.updateEmbeddedDocuments = async () => [];
  const err = await runPlan(actor, { transactional: true });
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.notEqual(err.rollback.target.verdict, 'EXACT');
  assert.equal(err.rollback.target.contentVerified, false);
});

await check('5c. a re-created Item that does not keep its id (identity not preserved) is detected → INDETERMINATE', async () => {
  const actor = mkActor();
  install({ mutate: damage(actor) });
  const realCreate = FakeEngine.createEmbeddedDocuments;
  FakeEngine.createEmbeddedDocuments = (a, n, data, o) => realCreate.call(FakeEngine, a, n, data.map((d) => ({ ...d, _forceIdConflict: true })), o);
  const err = await runPlan(actor, { transactional: true });
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.notEqual(err.rollback.target.verdict, 'EXACT');
});

/* ---------------------------------------------------------------------------------------------- */
/* 6. missing Item / ActiveEffect identity prevents exact certification                              */
/* ---------------------------------------------------------------------------------------------- */
for (const [label, build] of [
  ['an Item with no _id', (a) => v2(a, { items: [...v2(a).items, { name: 'Anonymous', type: 'gear', system: {}, flags: {} }] })],
  ['an Effect with no _id', (a) => v2(a, { effects: [...v2(a).effects, { name: 'Anonymous fx', disabled: false, changes: [] }] })],
  ['duplicate Item ids', (a) => v2(a, { items: [...v2(a).items, { ...v2(a).items[0] }] })]
]) {
  await check(`6. snapshot with ${label} cannot be certified exact, even if the service reports exact`, async () => {
    const actor = mkActor();
    install();
    const rollback = await ActorEngine._rollbackTransactionalPlan(actor, build(actor), {}, 's1.test');
    assert.equal(rollback.outcome, 'INDETERMINATE');
    assert.notEqual(rollback.target.verdict, 'EXACT');
    assert.ok(rollback.reasons.includes('snapshot-identity-incomplete'), `reasons=${rollback.reasons}`);
  });
}

await check('6b. defensive: a restore result claiming exact:true while its own verification says content mismatched is NOT certified (stubbed service result)', async () => {
  const actor = mkActor();
  install();
  const orig = ActorEngine.restoreFromSnapshot;
  ActorEngine.restoreFromSnapshot = async () => ({ success: true, exact: true, verification: { rootMatched: true, itemsMatched: false, effectsMatched: true } });
  try {
    const rollback = await ActorEngine._rollbackTransactionalPlan(actor, v2(actor), {}, 's1.test');
    assert.equal(rollback.outcome, 'INDETERMINATE');
    assert.equal(rollback.target.verdict, 'INEXACT');
    assert.equal(rollback.target.exactDowngraded, true);
  } finally { ActorEngine.restoreFromSnapshot = orig; }
});

/* ---------------------------------------------------------------------------------------------- */
/* 7. interrupted restoration never reports compensation                                             */
/* ---------------------------------------------------------------------------------------------- */
await check('7. restoration interrupted mid-way (Item re-create throws) → INDETERMINATE, no compensation claim', async () => {
  const actor = mkActor();
  const s = install({ mutate: damage(actor) });
  FakeEngine.createEmbeddedDocuments = async () => { throw new Error('create refused'); };
  const err = await runPlan(actor, { transactional: true });
  assert.equal(err, s.injected);
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.partialMutationPossible, true);
  assert.equal(err.rollback.target.verdict, 'FAILED');
  assert.equal(err.rollback.target.failedStep, 'items');
  assert.equal(err.rollback.target.partialMutation, true);
});

await check('7b. interruption AND failed service compensation → INDETERMINATE', async () => {
  const actor = mkActor();
  install({ mutate: damage(actor) });
  FakeEngine.createEmbeddedDocuments = async () => { throw new Error('create refused'); };
  FakeEngine.deleteEmbeddedDocuments = async () => { throw new Error('delete refused'); };
  const err = await runPlan(actor, { transactional: true });
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.notEqual(err.rollback.compensation, 'EXACT');
});

/* ---------------------------------------------------------------------------------------------- */
/* 8-9. whole-scope verdict, original error retained                                                 */
/* ---------------------------------------------------------------------------------------------- */
await check('8. exact target restore + CREATE-bucket actors verifiably removed → FAILED_COMPENSATED', async () => {
  const actor = mkActor();
  const before = view(actor);
  const s = install({ mutate: damage(actor), created: ['created1', 'created2'] });
  const err = await runPlan(actor, { transactional: true });
  assert.equal(err, s.injected);
  assert.equal(err.rollbackOutcome, 'FAILED_COMPENSATED');
  assert.equal(err.rollback.created.verifiedAbsent, true);
  assert.deepEqual(view(actor), before);
});

await check('8b. exact target restore but a CREATE-bucket actor remains → INDETERMINATE (whole-scope verdict, PARTIAL)', async () => {
  const actor = mkActor();
  install({ mutate: damage(actor), created: ['created1', 'created2'], registryKeep: ['created2'] });
  const err = await runPlan(actor, { transactional: true });
  assert.equal(err.rollback.target.verdict, 'EXACT');
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.rollback.compensation, 'PARTIAL');
  assert.deepEqual(err.rollback.created.stillPresent, ['created2']);
  assert.equal(err.partialMutationPossible, true);
});

await check('9. failed restoration keeps the original mutation error and INDETERMINATE (restore failure does not replace it)', async () => {
  const actor = mkActor();
  const s = install({ mutate: damage(actor) });
  FakeEngine.updateActor = async () => { throw new Error('root update refused'); };
  const err = await runPlan(actor, { transactional: true });
  assert.equal(err, s.injected);
  assert.equal(err.message, 'set stage failed');
  assert.equal(err.rollbackOutcome, 'INDETERMINATE');
  assert.equal(err.rollback.target.verdict, 'FAILED');
});

/* ---------------------------------------------------------------------------------------------- */
/* 10-12. unchanged success / nontransactional paths; no persistence; no retry                        */
/* ---------------------------------------------------------------------------------------------- */
await check('10. a SUCCESSFUL transactional plan is unchanged: no restore, no rollback fields, no mutation by the snapshot', async () => {
  const actor = mkActor();
  install();
  ActorEngine._applySetOps = async () => {};
  const err = await runPlan(actor, { transactional: true });
  assert.equal(err, null);
  assert.equal(noMutationCalls().length, 0);
  assert.equal(actor.setFlagCalls, 0);
});

await check('10b. a NONtransactional plan captures nothing and rolls nothing back', async () => {
  const actor = mkActor();
  let toObjectCalls = 0; const t = actor.toObject.bind(actor); actor.toObject = (...a) => { toObjectCalls++; return t(...a); };
  const s = install({ mutate: damage(actor) });
  const err = await runPlan(actor, {});
  assert.equal(err, s.injected);
  assert.equal(err.rollback, undefined);
  assert.equal(err.rollbackOutcome, undefined);
  assert.equal(toObjectCalls, 0);
  assert.equal(noMutationCalls().length, 0);
});

await check('11. snapshot capture performs no persisted snapshot-history write (flag untouched, no setFlag, no snapshots path written)', async () => {
  const actor = mkActor();
  const ring = clone(actor.flags['foundryvtt-swse'].snapshots);
  install({ mutate: damage(actor) });
  const err = await runPlan(actor, { transactional: true });
  assert.equal(err.rollbackOutcome, 'FAILED_COMPENSATED');
  assert.equal(actor.setFlagCalls, 0, 'no flag was written through the document API');
  assert.deepEqual(mutatedWritesToSnapshotHistory(), [], 'no restore write targeted the snapshot-history flag');
  assert.deepEqual(actor.flags['foundryvtt-swse'].snapshots, ring, 'the persisted snapshot ring is exactly as before (no entry added, none removed)');
});

await check('12. no automatic retry / re-execution: each plan stage runs once; rollback deletes created actors once and never re-applies the plan', async () => {
  const actor = mkActor();
  const s = install({ mutate: damage(actor), created: ['created1'] });
  const err = await runPlan(actor, { transactional: true });
  assert.equal(err.rollbackOutcome, 'FAILED_COMPENSATED');
  assert.equal(s.calls.create, 1);
  assert.equal(s.calls.set, 1);
  assert.equal(s.calls.recalc, 0);
  assert.equal(s.calls.del, 1);
});

await check('13. a snapshot capture that throws fails the plan BEFORE any stage runs (nothing mutated, nothing to roll back)', async () => {
  const actor = mkActor();
  actor.toObject = () => { throw new Error('capture boom'); };
  Object.defineProperty(actor, 'system', { get() { throw new Error('capture boom'); }, configurable: true });
  const s = install({ mutate: damage(mkActor()) });
  const err = await runPlan(actor, { transactional: true });
  assert.ok(err, 'the plan fails');
  assert.equal(s.calls.create, 0);
  assert.equal(s.calls.set, 0);
  assert.equal(err.rollback, undefined, 'no rollback was attempted because nothing was applied');
});

/* ---------------------------------------------------------------------------------------------- */
/* 14. caller compatibility with the REAL restore: G06 caller behaviour is preserved                  */
/* ---------------------------------------------------------------------------------------------- */
const { ProgressionFinalizer } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-finalizer.js');
const { LightsaberConstructionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/crafting/lightsaber-construction-engine.js');
const savedResolve = ProgressionFinalizer._resolveActorEngine;
const roll = { finalDc: 20, rollTotal: 23, modifier: 13, rollRaw: 10, checkMode: 'roll', cost: 1500 };

await check('14a. PROGRESSION: a genuinely, exactly rolled-back failure is an ordinary failure with FAILED_COMPENSATED evidence (no indeterminate warning)', async () => {
  const actor = mkActor(); const before = view(actor);
  install({ mutate: damage(actor) });
  ProgressionFinalizer._resolveActorEngine = () => ActorEngine;
  try {
    const r = await ProgressionFinalizer._applyMutationPlan(actor, { set: { 'system.credits': 5 } });
    assert.equal(r.success, false);
    assert.equal(r.rollbackOutcome, 'FAILED_COMPENSATED');
    assert.equal(r.indeterminate, undefined);
    assert.equal(r.partialMutationPossible, undefined);
    assert.deepEqual(view(actor), before);
  } finally { ProgressionFinalizer._resolveActorEngine = savedResolve; }
});

await check('14b. PROGRESSION: a restore that does not verify exact still surfaces the indeterminate warning', async () => {
  const actor = mkActor();
  install({ mutate: damage(actor) });
  FakeEngine.updateEmbeddedDocuments = async () => [];
  ProgressionFinalizer._resolveActorEngine = () => ActorEngine;
  try {
    const r = await ProgressionFinalizer._applyMutationPlan(actor, { set: { 'system.credits': 5 } });
    assert.equal(r.success, false);
    assert.equal(r.indeterminate, true);
    assert.equal(r.rollbackOutcome, 'INDETERMINATE');
    assert.equal(r.partialMutationPossible, true);
    assert.match(r.error, /set stage failed/);
    assert.match(r.error, /could not be verified/);
  } finally { ProgressionFinalizer._resolveActorEngine = savedResolve; }
});

await check('14c. LIGHTSABER: exact rollback → plain mutation_failed (not indeterminate); inexact rollback → indeterminate with the original roll preserved', async () => {
  const a1 = mkActor();
  install({ mutate: damage(a1) });
  const e1 = await runPlan(a1, { transactional: true });
  const ok = LightsaberConstructionEngine.mutationFailureResult(e1, roll);
  assert.equal(ok.reason, 'mutation_failed'); assert.equal(ok.rollbackOutcome, 'FAILED_COMPENSATED'); assert.equal(ok.indeterminate, undefined);
  restoreAll();
  const a2 = mkActor();
  install({ mutate: damage(a2) });
  FakeEngine.updateEmbeddedDocuments = async () => [];
  const e2 = await runPlan(a2, { transactional: true });
  const bad = LightsaberConstructionEngine.mutationFailureResult(e2, roll);
  assert.equal(bad.reason, 'mutation_failed'); assert.equal(bad.indeterminate, true); assert.equal(bad.rollbackOutcome, 'INDETERMINATE');
  for (const k of ['finalDc', 'rollTotal', 'modifier', 'rollRaw', 'checkMode']) assert.equal(bad[k], roll[k]);
});

/* ---------------------------------------------------------------------------------------------- */
const failed = results.filter((r) => !r.ok);
console.log(`\nTI4-C0/G06-S1 exact snapshot: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log('FAILED:'); for (const f of failed) console.log(`  - ${f.name}: ${f.error}`); process.exit(1); }
