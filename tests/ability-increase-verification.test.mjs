/** Checkpoint C - post-commit verification evidence for ability increases. Real finalizer boundary + reader; ActorEngine stubbed. Node harness only. */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document ??= { addEventListener() {}, createElement: () => ({}) };
globalThis.foundry.applications ??= { api: { ApplicationV2: class {}, DialogV2: class {}, HandlebarsApplicationMixin: (b) => b } };
const { character } = await import('./helpers/recon-fixture.mjs');
const G = await import(new URL('../scripts/apps/progression-framework/shell/mutation/ability-increase-guard.js', import.meta.url).href);
const { ProgressionFinalizer } = await import(new URL('../scripts/apps/progression-framework/shell/progression-finalizer.js', import.meta.url).href);
const R = await import(new URL('../scripts/apps/progression-framework/shell/reconciliation/progression-completion-reader.js', import.meta.url).href);
const check = async (name, fn) => { G._resetAbilityIncreaseGuard(); await fn(); console.log(`PASS ${name}`); };
function setPath(obj, path, value) { const k = path.split('.'); let o = obj; for (const p of k.slice(0, -1)) o = (o[p] ??= {}); o[k.at(-1)] = value; }
const actorAt = (level) => { const a = character({ classes: [['Soldier', level]] }); a.system.attributes = Object.fromEntries(['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => [k, { base: 12, racial: 0, enhancement: 0, temp: 0 }])); a.system.progression.abilityIncreaseHistory = []; return a; };
let mode = 'ok'; let updateFails = false; const updates = [];
globalThis.game.swse = { ActorEngine: {
  updateActor: async (actor, patch) => { if (updateFails) throw new Error('persist failed'); updates.push(patch); for (const [k, v] of Object.entries(patch)) setPath(actor, k, structuredClone(v)); },
  applyMutationPlan: async (actor, plan) => {
    if (mode === 'throw') throw new Error('engine failure');
    for (const [k, v] of Object.entries(plan.set || {})) { if (mode === 'drop-score' && k === 'system.attributes.wis.base') continue; setPath(actor, k, structuredClone(v)); }
  } } };
const attr = { mode: 'levelup-ability-increase', increases: { con: 1, wis: 1 }, abilityIncreaseLevel: 8, slotId: 'ability-increase-level-8', characterLevel: 8 };
const plan = (a) => { const p = { set: { 'system.progression.completedSessionId': 'sess-1' } }; ProgressionFinalizer._applyAbilityScoreBuilder(a, { mode: 'levelup', progressionSession: { reconciliation: { mode: 'reconcile' }, draftSelections: { attributes: attr } } }, p); return p; };
const comp = (a) => R.getAbilityIncreaseCompletion(a, 8, { expectedCount: 2 });

await check('1. the plan itself carries NO verification (nothing is labelled verified before the mutation succeeded)', () => {
  const p = plan(actorAt(9));
  assert.equal(p.set['system.progression.abilityIncreaseHistory'].some(r => r.verification), false);
  assert.equal(JSON.stringify(p.set).includes('verified'), false);
});
await check('2. after a successful commit the marker is recorded on the existing history record and the reader reports SYSTEM_VERIFIED', async () => {
  const a = actorAt(9); mode = 'ok'; updates.length = 0;
  const res = await ProgressionFinalizer._applyMutationPlan(a, plan(a));
  assert.equal(res.success !== false, true);
  const rec = a.system.progression.abilityIncreaseHistory[0];
  assert.equal(rec.verification.state, 'verified'); assert.equal(rec.verification.sessionId, 'sess-1'); assert.deepEqual(rec.verification.checks, { scores: true, record: true, latest: true }); assert.equal(rec.verification.transactionId, rec.transactionId); assert.match(rec.transactionId, /^abtx-/);
  assert.equal(a.system.progression.abilityIncreaseHistory.length, 1, 'no second receipt array / record');
  const c = comp(a); assert.equal(c.classification, R.COMPLETION.SYSTEM_VERIFIED); assert.deepEqual(c.references.sessionIds, ['sess-1']);
  assert.equal(updates.length, 1);
});
await check('3. a failed mutation records no evidence at all', async () => {
  const a = actorAt(9); mode = 'throw';
  const res = await ProgressionFinalizer._applyMutationPlan(a, plan(a));
  assert.equal(res.success, false); assert.deepEqual(a.system.progression.abilityIncreaseHistory, []); assert.equal(comp(a).classification, R.COMPLETION.UNVERIFIABLE);
});
await check('4. commit reported success but a score did not persist: recorded as FAILED, never SYSTEM_VERIFIED', async () => {
  const a = actorAt(9); mode = 'drop-score';
  await ProgressionFinalizer._applyMutationPlan(a, plan(a));
  const rec = a.system.progression.abilityIncreaseHistory[0];
  assert.equal(rec.verification.state, 'failed'); assert.equal(rec.verification.checks.scores, false); assert.ok(rec.verification.reasons.some(r => /wis/.test(r)));
  assert.equal(comp(a).classification, R.COMPLETION.SYSTEM_COMMITTED_UNVERIFIED);
});
await check('5. the marker cannot be persisted: the finalization still succeeds and the record stays committed-unverified', async () => {
  const a = actorAt(9); mode = 'ok'; updateFails = true;
  const res = await ProgressionFinalizer._applyMutationPlan(a, plan(a));
  updateFails = false;
  assert.equal(res.success !== false, true); assert.equal(a.system.progression.abilityIncreaseHistory[0].verification, undefined);
  assert.equal(comp(a).classification, R.COMPLETION.SYSTEM_COMMITTED_UNVERIFIED);
});
await check('6. C8: a later manual edit of the score does not erase the historical evidence (history is not reconstructed from current scores)', async () => {
  const a = actorAt(9); mode = 'ok';
  await ProgressionFinalizer._applyMutationPlan(a, plan(a));
  a.system.attributes.con.base = 9;
  assert.equal(comp(a).classification, R.COMPLETION.SYSTEM_VERIFIED); assert.deepEqual(comp(a).applied, { con: 1, wis: 1 });
});
await check('7. plans with no ability increase are untouched (no marker, no extra update)', async () => {
  const a = actorAt(9); mode = 'ok'; updates.length = 0;
  const res = await ProgressionFinalizer._applyMutationPlan(a, { set: { 'system.hp.max': 40 } });
  assert.equal(res.success !== false, true); assert.equal(updates.length, 0);
});

// ---- EVD-03: every intended effect and the exact transaction identity -------------------------------------------------------------
const planned = () => { const a = actorAt(9); const p = plan(a); const before = Object.fromEntries(['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => [k, a.system.attributes[k].base])); return { a, p, before }; };
const applied = (a, p) => { for (const [k, v] of Object.entries(p.set)) setPath(a, k, structuredClone(v)); return a; };
await check('EVD-03a. an UNSELECTED score that changed during the commit fails verification', () => {
  const { a, p, before } = planned(); applied(a, p); a.system.attributes.str.base = 13;
  const v = G.verifyAbilityIncreaseCommit(a, p, { before });
  assert.equal(v.state, 'failed'); assert.equal(v.checks.scores, false); assert.ok(v.reasons.some(r => /str/.test(r)));
});
await check('EVD-03b. identity is the unique transaction id: a look-alike record (same level, entitlement and increases, different id) does not verify', () => {
  const { a, p, before } = planned(); applied(a, p);
  a.system.progression.abilityIncreaseHistory[0].transactionId = 'abtx-someone-else';
  assert.equal(G.verifyAbilityIncreaseCommit(a, p, { before }).state, 'failed');
  const dup = planned(); applied(dup.a, dup.p); dup.a.system.progression.abilityIncreaseHistory.push(structuredClone(dup.a.system.progression.abilityIncreaseHistory[0]));
  const v = G.verifyAbilityIncreaseCommit(dup.a, dup.p, { before: dup.before });
  assert.equal(v.state, 'failed'); assert.ok(v.reasons.some(r => /more than once/.test(r)));
});
await check('EVD-03c. the latest-event record must be the same transaction; changed increases or a missing record fail', () => {
  const { a, p, before } = planned(); applied(a, p);
  a.system.progression.lastAbilityIncrease = { ...a.system.progression.lastAbilityIncrease, transactionId: 'abtx-other' };
  assert.equal(G.verifyAbilityIncreaseCommit(a, p, { before }).checks.latest, false);
  const b = planned(); applied(b.a, b.p); b.a.system.progression.abilityIncreaseHistory[0].increases = { str: 1, dex: 1 };
  assert.equal(G.verifyAbilityIncreaseCommit(b.a, b.p, { before: b.before }).checks.record, false);
  const c = planned(); applied(c.a, c.p); c.a.system.progression.abilityIncreaseHistory = [];
  assert.equal(G.verifyAbilityIncreaseCommit(c.a, c.p, { before: c.before }).state, 'failed');
});
await check('EVD-03d. with no pre-commit snapshot there is no basis to verify unselected scores, so verification fails closed', () => {
  const { a, p } = planned(); applied(a, p);
  assert.equal(G.verifyAbilityIncreaseCommit(a, p, {}).state, 'failed');
});

// ---- EVD-04: post-commit evidence must not overwrite newer history ----------------------------------------------------------------
await check('EVD-04a. concurrent-append race: history that changes between the read and the write is detected and rebuilt (the newer record survives)', async () => {
  const newer = { level: 4, characterLevel: 4, increases: { str: 1, dex: 1 }, source: 'progression-finalizer', transactionId: 'abtx-newer', entitlementId: 'ability-increase-level-4' };
  const E = globalThis.game.swse.ActorEngine; const realUpdate = E.updateActor; const realApply = E.applyMutationPlan;
  // run once WITHOUT interference to learn which history read is the pre-write recheck, then inject the newer record exactly there
  async function run(injectAt) {
    const a = actorAt(9); mode = 'ok'; const p = plan(a); let injected = false; let readsAtWrite = 0; let n = 0; const stored = [];
    E.applyMutationPlan = async (actor, pl) => {
      await realApply(actor, pl); stored.push(...actor.system.progression.abilityIncreaseHistory);
      Object.defineProperty(actor.system.progression, 'abilityIncreaseHistory', { configurable: true, enumerable: true,
        get() { n += 1; if (injectAt && n === injectAt && !injected) { injected = true; stored.push(newer); } return stored; },
        set(v) { stored.length = 0; stored.push(...v); } });
    };
    E.updateActor = async (actor, patch) => { readsAtWrite = n; return realUpdate(actor, patch); };
    await ProgressionFinalizer._applyMutationPlan(a, p);
    E.applyMutationPlan = realApply; E.updateActor = realUpdate;
    return { hist: stored, injected, readsAtWrite };
  }
  const probe = await run(0);
  const recheckRead = probe.readsAtWrite;                                 // the last read before the write is the pre-write recheck
  const raced = await run(recheckRead);
  assert.ok(raced.injected, 'the race was exercised at the pre-write recheck');
  assert.ok(raced.hist.some(r => r.transactionId === 'abtx-newer'), 'the newer record was not overwritten');
  assert.equal(raced.hist.find(r => r.level === 8).verification?.state, 'verified');
});
await check('EVD-04b. a missing record is never resurrected, and an already-verified record is not written again', async () => {
  const a = actorAt(9); mode = 'ok'; updates.length = 0;
  const p = plan(a);
  await ProgressionFinalizer._applyMutationPlan(a, p);                 // verified once
  updates.length = 0;
  await ProgressionFinalizer._recordAbilityIncreaseVerification(a, p, { str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12 });
  assert.equal(updates.length, 0, 'idempotent: no second write');
  const gone = actorAt(9); const pg = plan(gone); applied(gone, pg); gone.system.progression.abilityIncreaseHistory = [];
  updates.length = 0; await ProgressionFinalizer._recordAbilityIncreaseVerification(gone, pg, { str: 12, dex: 12, con: 12, int: 12, wis: 12, cha: 12 });
  assert.equal(updates.length, 0); assert.deepEqual(gone.system.progression.abilityIncreaseHistory, []);
});
console.log('ability-increase-verification.test.mjs: all assertions passed');
