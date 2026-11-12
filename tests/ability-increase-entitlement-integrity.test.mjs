/**
 * Checkpoint A - ability-increase entitlement integrity (C4 / C2 / C1). Real AbilityScorePlanBuilder, real ProgressionFinalizer compile
 * helpers and the real transaction boundary (_applyMutationPlan); only ActorEngine.applyMutationPlan is a stub that applies plan.set to an
 * in-memory actor. Node harness - not Foundry runtime verification.
 */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };
globalThis.localStorage ??= { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document ??= { addEventListener() {}, createElement: () => ({}) };
globalThis.foundry.applications ??= { api: { ApplicationV2: class {}, DialogV2: class {}, HandlebarsApplicationMixin: (b) => b } };
const { character } = await import('./helpers/recon-fixture.mjs');
const { settleDerived } = await import('./helpers/derived-lifecycle-fixture.mjs');
const { AbilityScorePlanBuilder } = await import(new URL('../scripts/apps/progression-framework/shell/mutation/ability-score-plan-builder.js', import.meta.url).href);
const G = await import(new URL('../scripts/apps/progression-framework/shell/mutation/ability-increase-guard.js', import.meta.url).href);
const { ProgressionFinalizer } = await import(new URL('../scripts/apps/progression-framework/shell/progression-finalizer.js', import.meta.url).href);
const { ProgressionReconciler } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/progression-reconciler.js');
const check = async (name, fn) => { G._resetAbilityIncreaseGuard(); await fn(); console.log(`PASS ${name}`); };

const mode = () => 'raw_two_different';
function setPath(obj, path, value) { const k = path.split('.'); let o = obj; for (const p of k.slice(0, -1)) o = (o[p] ??= {}); o[k.at(-1)] = value; }
function actorAt(level, history = [], bases = {}) {
  const a = character({ classes: [['Soldier', level]] });
  a.system.attributes = Object.fromEntries(['str', 'dex', 'con', 'int', 'wis', 'cha'].map(k => [k, { base: bases[k] ?? 12, racial: 0, enhancement: 0, temp: 0 }]));
  a.system.progression.abilityIncreaseHistory = history;
  return a;
}
// stub engine: applies plan.set to the in-memory actor (the only thing ActorEngine contributes to these assertions)
let engineCalls = 0; let failNext = false; let gate = null;
globalThis.game.swse = { ActorEngine: { updateActor: async (actor, patch) => { for (const [k, v] of Object.entries(patch)) setPath(actor, k, structuredClone(v)); }, applyMutationPlan: async (actor, plan) => {
  engineCalls += 1; if (gate) await gate; if (failNext) { failNext = false; throw new Error('engine failure'); }
  for (const [k, v] of Object.entries(plan.set || {})) setPath(actor, k, structuredClone(v));
} } };
const reconcileSession = (attr) => ({ mode: 'levelup', progressionSession: { reconciliation: { mode: 'reconcile' }, draftSelections: { attributes: attr } } });
const attrFor = (level, increases = { con: 1, wis: 1 }) => ({ mode: 'levelup-ability-increase', increases, abilityIncreaseLevel: level, slotId: `ability-increase-level-${level}`, slotType: 'ability-increase', characterLevel: level });
const compile = (actor, session) => { const plan = { set: {} }; ProgressionFinalizer._applyAbilityScoreBuilder(actor, session, plan); return plan; };
const histLevels = (a) => a.system.progression.abilityIncreaseHistory.map(r => r.level);

await check('1. normal level-up (full manifest): records the entering level, entitlement id, +1 to each chosen score', () => {
  const a = actorAt(3);
  const set = AbilityScorePlanBuilder.buildSet({ mode: 'levelup', actor: a, attr: { mode: 'levelup-ability-increase', increases: { str: 1, dex: 1 }, abilityIncreaseLevel: 4 }, manifest: { characterLevel: 4 }, getAllocationMode: mode, source: 'progression-finalizer' });
  assert.equal(set['system.attributes.str.base'], 13); assert.equal(set['system.attributes.dex.base'], 13);
  const rec = set['system.progression.lastAbilityIncrease'];
  assert.equal(rec.level, 4); assert.equal(rec.entitlementId, 'ability-increase-level-4');
  assert.deepEqual(set['system.progression.abilityIncreaseHistory'].map(r => r.level), [4]);
});
await check('2. chargen completion fabricates no level-up increase history', () => {
  const a = actorAt(1);
  const set = AbilityScorePlanBuilder.buildSet({ mode: 'chargen', actor: a, attr: {}, attrValues: { str: 14 }, getAllocationMode: mode });
  assert.equal('system.progression.abilityIncreaseHistory' in set, false); assert.equal('system.progression.lastAbilityIncrease' in set, false);
});
await check('3. REGRESSION: level 9 character resolves the level 8 entitlement through the real reconcile-mode finalizer compile (no manifest)', () => {
  const a = actorAt(9);
  const plan = compile(a, reconcileSession(attrFor(8)));
  assert.equal(plan.set['system.attributes.con.base'], 13); assert.equal(plan.set['system.attributes.wis.base'], 13);
  assert.equal(plan.set['system.attributes.str.base'], undefined, 'unselected scores untouched');
  const hist = plan.set['system.progression.abilityIncreaseHistory'];
  assert.deepEqual(hist.map(r => r.level), [8]); assert.equal(hist[0].entitlementId, 'ability-increase-level-8');
  assert.equal(hist.some(r => r.level === 9 || r.level === 0 || r.level == null), false, 'no level 9 / 0 / null record');
});
await check('4. entitlement identity fails closed: missing, invalid, zero, null, string junk and conflicting levels never mutate and never default to the current level', () => {
  const a = actorAt(9);
  const bad = [
    [{ ...attrFor(8), abilityIncreaseLevel: undefined, slotId: undefined }, 'MISSING_ENTITLEMENT_LEVEL'],
    [{ ...attrFor(8), abilityIncreaseLevel: null, slotId: undefined }, 'MISSING_ENTITLEMENT_LEVEL'],
    [{ ...attrFor(8), abilityIncreaseLevel: 0 }, 'INVALID_ENTITLEMENT_LEVEL'],
    [{ ...attrFor(8), abilityIncreaseLevel: -4 }, 'INVALID_ENTITLEMENT_LEVEL'],
    [{ ...attrFor(8), abilityIncreaseLevel: 'eight' }, 'INVALID_ENTITLEMENT_LEVEL'],
    [{ ...attrFor(8), abilityIncreaseLevel: 8.5 }, 'INVALID_ENTITLEMENT_LEVEL'],
    [{ ...attrFor(8), slotId: 'feat-slot-3' }, 'INVALID_ENTITLEMENT_LEVEL'],
    [{ ...attrFor(8), slotId: 'ability-increase-level-4' }, 'ENTITLEMENT_LEVEL_CONFLICT'],
  ];
  for (const [attr, code] of bad) assert.throws(() => compile(a, reconcileSession(attr)), e => e.code === code, code);
  assert.deepEqual(histLevels(a), []);
});
await check('5. single-step route: uses the carried entitlement level; with none it fails closed instead of using the actor\'s current level', () => {
  const a = actorAt(9);
  const ok = ProgressionFinalizer._compileSingleStepAttributeSet(a, attrFor(8));
  assert.deepEqual(ok['system.progression.abilityIncreaseHistory'].map(r => r.level), [8]);
  assert.throws(() => ProgressionFinalizer._compileSingleStepAttributeSet(a, { ...attrFor(8), abilityIncreaseLevel: undefined, slotId: undefined, characterLevel: 9 }), e => e.code === 'MISSING_ENTITLEMENT_LEVEL');
});
await check('6. apply once: scores rise once, level 8 recorded, level 4 record and other levels untouched; reconciler sees level 8 satisfied and no level 9 slot', async () => {
  const a = actorAt(9, [{ level: 4, characterLevel: 4, increases: { str: 1, dex: 1 }, source: 'progression-finalizer' }]);
  const plan = compile(a, reconcileSession(attrFor(8)));
  const res = await ProgressionFinalizer._applyMutationPlan(a, plan);
  assert.equal(res.success !== false, true, JSON.stringify(res));
  assert.equal(a.system.attributes.con.base, 13); assert.equal(a.system.attributes.wis.base, 13); assert.equal(a.system.attributes.str.base, 12);
  assert.deepEqual(histLevels(a), [4, 8]);
  settleDerived(a);
  const slots = ProgressionReconciler.safeReconcileActor(a, { output: 'report', fresh: true }).slots.abilityIncreases;
  assert.equal(slots.find(s => s.characterLevel === 8).status, 'filled');
  assert.equal(slots.some(s => s.characterLevel === 9), false);
});
await check('7. duplicate application is refused at the transaction boundary and at a fresh compile: no second award', async () => {
  const a = actorAt(9);
  const plan = compile(a, reconcileSession(attrFor(8)));
  await ProgressionFinalizer._applyMutationPlan(a, plan);
  engineCalls = 0;
  const again = await ProgressionFinalizer._applyMutationPlan(a, plan);              // same prepared plan re-submitted
  assert.equal(again.success, false); assert.equal(again.code, 'ENTITLEMENT_ALREADY_RECORDED'); assert.equal(engineCalls, 0, 'ActorEngine was never called');
  assert.throws(() => compile(a, reconcileSession(attrFor(8))), e => e.code === 'ENTITLEMENT_ALREADY_RECORDED');
  assert.equal(a.system.attributes.con.base, 13, 'increased exactly once');
});
await check('8. concurrent submission from one client: the second is refused while the first is in flight', async () => {
  const a = actorAt(9);
  const plan1 = compile(a, reconcileSession(attrFor(8))); const plan2 = compile(a, reconcileSession(attrFor(8)));
  let release; gate = new Promise(r => { release = r; }); engineCalls = 0;
  const first = ProgressionFinalizer._applyMutationPlan(a, plan1);
  await new Promise(r => setImmediate(r));
  const second = await ProgressionFinalizer._applyMutationPlan(a, plan2);
  assert.equal(second.success, false); assert.equal(second.code, 'APPLICATION_IN_PROGRESS');
  release(); gate = null; await first;
  assert.equal(engineCalls, 1); assert.equal(a.system.attributes.con.base, 13);
});
await check('9. scores changed between preparation and commit (other client / manual edit): refused, nothing written', async () => {
  const a = actorAt(9);
  const plan = compile(a, reconcileSession(attrFor(8)));
  a.system.attributes.con.base = 14; engineCalls = 0;
  const res = await ProgressionFinalizer._applyMutationPlan(a, plan);
  assert.equal(res.success, false); assert.equal(res.code, 'SCORES_CHANGED'); assert.equal(engineCalls, 0);
  assert.deepEqual(histLevels(a), []);
});
await check('10. a failed mutation records nothing and releases the guard so a retry is possible', async () => {
  const a = actorAt(9);
  const plan = compile(a, reconcileSession(attrFor(8)));
  failNext = true;
  const res = await ProgressionFinalizer._applyMutationPlan(a, plan);
  assert.equal(res.success, false); assert.deepEqual(histLevels(a), []); assert.equal(a.system.attributes.con.base, 12);
  const retry = await ProgressionFinalizer._applyMutationPlan(a, plan);
  assert.equal(retry.success !== false, true); assert.deepEqual(histLevels(a), [8]);
});
await check('11. wiring (static): single-step compile no longer falls back to the current level; builder is the live writer; the dead inline block was not edited', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync('scripts/apps/progression-framework/shell/progression-finalizer.js', 'utf8');
  assert.doesNotMatch(src, /characterLevel: Number\(attr\?\.abilityIncreaseLevel \|\| attr\?\.characterLevel \|\| attr\?\.level \|\| actor\?\.system\?\.level/);
  assert.match(src, /beginAbilityIncreaseTransaction\(actor, mutationPlan\)/);
  assert.match(src, /level: levelUpManifest\?\.characterLevel \|\| null,/, 'the dead inline writer is intentionally untouched (C5)');
});
console.log('ability-increase-entitlement-integrity.test.mjs: all assertions passed');
