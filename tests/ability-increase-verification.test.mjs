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
  assert.equal(rec.verification.state, 'verified'); assert.equal(rec.verification.sessionId, 'sess-1'); assert.deepEqual(rec.verification.checks, { scores: true, record: true });
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
console.log('ability-increase-verification.test.mjs: all assertions passed');
