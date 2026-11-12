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
  const manifest = { characterLevel: 4, abilityIncreases: { required: true, count: 2 } };
  const set = AbilityScorePlanBuilder.buildSet({ mode: 'levelup', actor: a, attr: { mode: 'levelup-ability-increase', increases: { str: 1, dex: 1 }, abilityIncreaseLevel: 4 }, manifest, getAllocationMode: mode, source: 'progression-finalizer', entitlementCheck: (l) => ProgressionFinalizer._abilityEntitlementCheck(a, l, manifest) });
  assert.equal(set['system.attributes.str.base'], 13); assert.equal(set['system.attributes.dex.base'], 13);
  const rec = set['system.progression.lastAbilityIncrease'];
  assert.equal(rec.level, 4); assert.equal(rec.entitlementId, 'ability-increase-level-4'); assert.match(rec.transactionId, /^abtx-/);
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
  assert.match(src, /beginAbilityIncreaseTransaction\(actor, mutationPlan, \{/);
  assert.match(src, /level: levelUpManifest\?\.characterLevel \|\| null,/, 'the dead inline writer is intentionally untouched (C5)');
});

// ---- EVD-01 / EVD-02: the entitlement must exist, with a KNOWN count, before anything is awarded --------------------------------
const build = (a, attr, check, manifest = null) => AbilityScorePlanBuilder.buildSet({ mode: 'levelup', actor: a, attr, manifest, getAllocationMode: mode, source: 'progression-finalizer', entitlementCheck: check });
await check('EVD-01c. an unknown (null / 0 / missing) entitlement count is never coerced: nothing is awarded; a wrong count is refused', () => {
  const a = actorAt(9);
  for (const count of [null, undefined, 0, NaN, '']) assert.throws(() => build(a, attrFor(8), () => ({ exists: true, count })), e => e.code === 'ENTITLEMENT_COUNT_UNKNOWN', String(count));
  assert.throws(() => build(a, attrFor(8, { con: 1 }), () => ({ exists: true, count: 2 })), e => e.code === 'ENTITLEMENT_COUNT_MISMATCH');
  assert.throws(() => build(a, attrFor(8, { con: 1, wis: 1, str: 1 }), () => ({ exists: true, count: 2 })), e => e.code === 'ENTITLEMENT_COUNT_MISMATCH');
  assert.deepEqual(histLevels(a), []);
});
await check('EVD-02a. the entitlement must EXIST: no check, a negative check, or a missing slot refuses before any score is computed', () => {
  const a = actorAt(9);
  assert.throws(() => build(a, attrFor(8), null), e => e.code === 'ENTITLEMENT_UNVALIDATED');
  assert.throws(() => build(a, attrFor(8), () => ({ exists: false, reason: 'x' })), e => e.code === 'ENTITLEMENT_NOT_FOUND');
  assert.throws(() => build(a, attrFor(8), () => ({ exists: true, count: 2, rulesDeferred: true })), e => e.code === 'ENTITLEMENT_COUNT_DEFERRED');
});
await check('EVD-02b. REAL authorities: a level that grants no ability increase, or a future level, is refused through the real reconciler slot list; a real level is accepted', () => {
  const a = actorAt(9);
  for (const level of [5, 9, 12]) assert.throws(() => compile(a, reconcileSession({ ...attrFor(level) })), e => e.code === 'ENTITLEMENT_NOT_FOUND', `level ${level}`);
  assert.deepEqual(compile(a, reconcileSession(attrFor(4))).set['system.progression.abilityIncreaseHistory'].map(r => r.level), [4]);
  assert.deepEqual(histLevels(a), []);
});
await check('EVD-02c. a normal level-up is checked against the level-up manifest: not required, or a different level, is refused', () => {
  const a = actorAt(3);
  assert.equal(ProgressionFinalizer._abilityEntitlementCheck(a, 4, { characterLevel: 4, abilityIncreases: { required: false, count: 0 } }).exists, false);
  assert.equal(ProgressionFinalizer._abilityEntitlementCheck(a, 8, { characterLevel: 4, abilityIncreases: { required: true, count: 2 } }).exists, false);
  const ok = ProgressionFinalizer._abilityEntitlementCheck(a, 4, { characterLevel: 4, abilityIncreases: { required: true, count: 2 } });
  assert.equal(ok.exists, true); assert.equal(ok.count, 2);
});
await check('EVD-02d. droid / Nonheroic: the count is a pending rules question, so the reconcile-route Apply is refused (RECON-002/003)', () => {
  const d = actorAt(9); d.type = 'droid';
  assert.throws(() => compile(d, reconcileSession(attrFor(8))), e => e.code === 'ENTITLEMENT_COUNT_DEFERRED');
});
await check('EVD-02e. the SAME existence check runs again at the ActorEngine boundary: if the entitlement disappears after preparation, nothing is committed', async () => {
  const a = actorAt(9);
  const p = compile(a, reconcileSession(attrFor(8)));
  a.system.level = 5; a.system.progression.classLevels = [{ class: 'Soldier', classId: 'soldier', level: 5 }]; a.items[0].system.level = 5; a._stats.modifiedTime += 1;
  engineCalls = 0;
  const res = await ProgressionFinalizer._applyMutationPlan(a, p);
  assert.equal(res.success, false); assert.equal(res.code, 'ENTITLEMENT_NOT_FOUND'); assert.equal(engineCalls, 0);
  const noId = actorAt(9); const p2 = compile(noId, reconcileSession(attrFor(8)));
  delete p2.set['system.progression.lastAbilityIncrease'].transactionId;
  assert.equal((await ProgressionFinalizer._applyMutationPlan(noId, p2)).code, 'MISSING_TRANSACTION_ID');
});

// ---- EVR-01: the COMPLETE entitlement contract is revalidated at the final boundary ----------------------------------------------
const fresh = () => { const a = actorAt(9); return { a, p: compile(a, reconcileSession(attrFor(8))) }; };
const okCheck = () => ({ exists: true, count: 2, rulesDeferred: false });
const begin = (a, p, over = {}) => G.beginAbilityIncreaseTransaction(a, p, { entitlementCheck: okCheck, getAllocationMode: mode, ...over });
await check('EVR-01a. a valid, unchanged contract passes the boundary; the record carries the contract it was built under', () => {
  const { a, p } = fresh();
  const rec = p.set['system.progression.lastAbilityIncrease'];
  assert.equal(rec.entitledCount, 2); assert.equal(rec.allocationMode, 'raw_two_different');
  const g = begin(a, p); assert.equal(g.ok, true); g.release();
});
await check('EVR-01b. the entitlement COUNT changed after compilation => stale plan refused (up, down, unknown, absent)', () => {
  for (const [count, code] of [[1, 'ENTITLEMENT_CHANGED'], [3, 'ENTITLEMENT_CHANGED'], [null, 'ENTITLEMENT_COUNT_UNKNOWN'], [0, 'ENTITLEMENT_COUNT_UNKNOWN'], [undefined, 'ENTITLEMENT_COUNT_UNKNOWN']]) {
    const { a, p } = fresh(); const g = begin(a, p, { entitlementCheck: () => ({ exists: true, count, rulesDeferred: false }) });
    assert.equal(g.ok, false); assert.equal(g.code, code, String(count));
  }
});
await check('EVR-01c. the entitlement became rules-deferred after compilation => refused', () => {
  const { a, p } = fresh(); const g = begin(a, p, { entitlementCheck: () => ({ exists: true, count: 2, rulesDeferred: true }) });
  assert.equal(g.code, 'ENTITLEMENT_COUNT_DEFERRED');
});
await check('EVR-01d. the allocation house rule changed (or cannot be read) after compilation => refused', () => {
  const { a, p } = fresh();
  assert.equal(begin(a, p, { getAllocationMode: () => 'allow_stacked_two' }).code, 'ALLOCATION_RULE_CHANGED');
  assert.equal(begin(a, p, { getAllocationMode: () => null }).code, 'ALLOCATION_RULE_UNKNOWN');
  assert.equal(begin(a, p, { getAllocationMode: null }).code, 'ALLOCATION_RULE_UNKNOWN');
});
await check('EVR-01e. through the REAL boundary: actor turns into a droid after compilation (count becomes a pending rule) => nothing committed', async () => {
  const { a, p } = fresh(); a.type = 'droid'; engineCalls = 0;
  const res = await ProgressionFinalizer._applyMutationPlan(a, p);
  assert.equal(res.success, false); assert.ok(['ENTITLEMENT_COUNT_DEFERRED', 'ENTITLEMENT_CHANGED'].includes(res.code), res.code); assert.equal(engineCalls, 0);
});

// ---- EVR-02: exact plan / evidence equivalence BEFORE commit -------------------------------------------------------------------
await check('EVR-02a. a record that claims two increases but a plan with only one score mutation is refused before ActorEngine', async () => {
  const { a, p } = fresh(); delete p.set['system.attributes.wis.base']; engineCalls = 0;
  const res = await ProgressionFinalizer._applyMutationPlan(a, p);
  assert.equal(res.success, false); assert.equal(res.code, 'PLAN_EVIDENCE_MISMATCH'); assert.match(res.error, /wis/); assert.equal(engineCalls, 0);
  assert.equal(a.system.attributes.con.base, 12); assert.deepEqual(histLevels(a), []);
});
await check('EVR-02b. a stray ability-score mutation for an UNSELECTED ability, or a wrong planned value, is refused', async () => {
  const stray = fresh(); stray.p.set['system.attributes.str.base'] = 13;
  assert.equal(begin(stray.a, stray.p).code, 'PLAN_EVIDENCE_MISMATCH');
  const other = fresh(); other.p.set['system.attributes.cha.temp'] = 2;
  assert.equal(begin(other.a, other.p).code, 'PLAN_EVIDENCE_MISMATCH');
  const wrong = fresh(); wrong.p.set['system.attributes.con.base'] = 15;
  assert.ok(['SCORES_CHANGED', 'PLAN_EVIDENCE_MISMATCH'].includes(begin(wrong.a, wrong.p).code));
});
await check('EVR-02c. the history record in the plan must be the latest-event record exactly (selection, entitlement, transaction)', () => {
  const diff = fresh(); diff.p.set['system.progression.abilityIncreaseHistory'][0].increases = { str: 1, dex: 1 };
  assert.equal(begin(diff.a, diff.p).code, 'PLAN_EVIDENCE_MISMATCH');
  const missing = fresh(); missing.p.set['system.progression.abilityIncreaseHistory'] = [];
  assert.equal(begin(missing.a, missing.p).code, 'PLAN_EVIDENCE_MISMATCH');
  const twice = fresh(); twice.p.set['system.progression.abilityIncreaseHistory'].push(structuredClone(twice.p.set['system.progression.abilityIncreaseHistory'][0]));
  assert.equal(begin(twice.a, twice.p).code, 'PLAN_EVIDENCE_MISMATCH');
});

// ---- EVR-04: malformed selections are REJECTED, never clamped ------------------------------------------------------------------------
await check('EVR-04. invalid selections are rejected as submitted (excess, negative, fractional, non-numeric, null, unknown key, wrong total); a legal selection is kept exactly', () => {
  const a = actorAt(9);
  const mk = (inc, m = mode) => AbilityScorePlanBuilder.buildSet({ mode: 'levelup', actor: a, attr: { ...attrFor(8), increases: inc }, manifest: null, getAllocationMode: m, source: 'progression-finalizer', entitlementCheck: () => ({ exists: true, count: 2 }) });
  const cases = [
    [{ con: 2 }, 'ALLOCATION_NOT_ALLOWED'], [{ con: 3 }, 'ALLOCATION_NOT_ALLOWED'], [{ con: -1, wis: 3 }, 'INVALID_SELECTION_VALUE'], [{ con: 0.5, wis: 1.5 }, 'INVALID_SELECTION_VALUE'],
    [{ con: 'x', wis: 1 }, 'INVALID_SELECTION_VALUE'], [{ con: NaN, wis: 1 }, 'INVALID_SELECTION_VALUE'], [{ con: null, wis: 1 }, 'INVALID_SELECTION_VALUE'], [{ con: '1', wis: 1 }, 'INVALID_SELECTION_VALUE'],
    [{ con: 1, foo: 1 }, 'UNKNOWN_ABILITY'], [{ con: 1 }, 'ENTITLEMENT_COUNT_MISMATCH'], [{ con: 1, wis: 1, str: 1 }, 'ENTITLEMENT_COUNT_MISMATCH'], [[1, 1], 'INVALID_SELECTION'],
  ];
  for (const [inc, code] of cases) assert.throws(() => mk(inc), e => e.code === code, `${JSON.stringify(inc)} -> ${code}`);
  assert.deepEqual(histLevels(a), []);
  const ok = mk({ con: 1, wis: 1, str: 0, dex: undefined });
  assert.deepEqual(ok['system.progression.lastAbilityIncrease'].increases, { con: 1, wis: 1 });
  const stacked = mk({ con: 2 }, () => 'allow_stacked_two');
  assert.deepEqual(stacked['system.progression.lastAbilityIncrease'].increases, { con: 2 }); assert.equal(stacked['system.progression.lastAbilityIncrease'].allocationMode, 'allow_stacked_two');
});
console.log('ability-increase-entitlement-integrity.test.mjs: all assertions passed');
