import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// OWNER-APPROVED HOUSE RULE (WEALTH-RD-001): Wealth payout = 5,000 x counted class levels. Default mode `noble-levels` (RAW, Core p.44): only Noble levels
// count. Optional `lineage-levels` (Expanded Wealth): the existing Lineage-eligible class-level counting. One engine (ProgressionEconomyPlanBuilder) serves
// both; previews, the ledger and finalization all call it. Figures use 5,000 x levels as the owner's worked examples do.
for (const l of ['log', 'info', 'debug', 'warn']) console[l] = () => {};
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = { api: { ApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}, DocumentSheetV2: class {}, DialogV2: class {} } };
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {}, __SWSE_CONTRACT_INITIALIZED__: false };
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.document = globalThis.document ?? { createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }), readyState: 'complete', addEventListener() {}, removeEventListener() {}, activeElement: null, body: { appendChild() {} }, head: { appendChild() {} } };
globalThis.Hooks = { on() {}, once() {}, callAll() {}, call() {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };

// settings harness: HouseRuleService reads through game.settings (+ the registered-key check)
const store = new Map();
const setMode = (v) => { if (v === undefined) store.delete('wealthPayoutMode'); else store.set('wealthPayoutMode', v); };
globalThis.game = { ...(globalThis.game ?? {}), settings: { get: (ns, k) => store.get(k), set: async (ns, k, v) => { store.set(k, v); }, settings: { has: (k) => k === 'foundryvtt-swse.wealthPayoutMode' } }, actors: { get: () => null } };

const { ProgressionEconomyPlanBuilder: B } = await import('../scripts/apps/progression-framework/shell/mutation/progression-economy-plan-builder.js');
const { SummaryStep } = await import('../scripts/apps/progression-framework/steps/summary-step.js');
const { ProgressionRules } = await import('../scripts/engine/progression/ProgressionRules.js');
const step = Object.create(SummaryStep.prototype);

const wealth = { name: 'Wealth', type: 'talent' };
const cls = (name, level, extra = {}) => ({ type: 'class', name, system: { classId: name.toLowerCase().replace(/\s+/g, '_'), level, ...extra } });
const lineagePrestige = (name, level) => cls(name, level, { talentTreeIds: ['lineage'] });
const actorOf = (...classes) => ({ id: 'a', type: 'character', items: [...classes, wealth], system: { level: classes.reduce((s, c) => s + c.system.level, 0) }, flags: { swse: { progressionHistory: {} } } });
const levelup = (a, picked, mode = 'levelup') => B.computeLevelupWealthGrant(a, { class: picked }, { mode, targetLevel: a.system.level + 1 });

// 11. setting absent / legacy / unknown => RAW
for (const v of [undefined, '', 'bogus', 'LINEAGE']) { setMode(v); assert.equal(ProgressionRules.getWealthPayoutMode(), 'noble-levels', `value ${JSON.stringify(v)}`); }
setMode('lineage-levels'); assert.equal(ProgressionRules.getWealthPayoutMode(), 'lineage-levels'); setMode(undefined);

// ---- RAW (default) ----
// 1. Noble gaining a Noble level: Noble 3 -> 4 = 20,000
assert.equal(levelup(actorOf(cls('Noble', 3)), { name: 'Noble' }), 20000);
// 2. Noble 3 multiclassing into Soldier: still 15,000 (Wealth triggers, multiplier unchanged)
assert.equal(levelup(actorOf(cls('Noble', 3)), { name: 'Soldier' }), 15000);
// 3. Noble 3 entering a Lineage-eligible prestige class: 15,000 under RAW (prestige levels do not count)
assert.equal(levelup(actorOf(cls('Noble', 3)), { name: 'Corporate Agent', system: { talentTreeIds: ['lineage'] } }), 15000);
// 4. Wealth with no Noble levels: 0
assert.equal(levelup(actorOf(cls('Soldier', 4)), { name: 'Soldier' }), 0);
assert.equal(levelup(actorOf(lineagePrestige('Corporate Agent', 2)), { name: 'Corporate Agent', system: { talentTreeIds: ['lineage'] } }), 0, 'RAW: only Noble levels count');

// ---- Expanded Wealth ----
setMode('lineage-levels');
// 5. multiple eligible classes: Noble 3 + Corporate Agent 2 gaining a Corporate Agent level = (3+3) x 5,000
assert.equal(levelup(actorOf(cls('Noble', 3), lineagePrestige('Corporate Agent', 2)), { name: 'Corporate Agent', system: { talentTreeIds: ['lineage'] } }), 30000);
assert.equal(levelup(actorOf(cls('Noble', 3)), { name: 'Corporate Agent', system: { talentTreeIds: ['lineage'] } }), 20000, 'a Lineage-eligible prestige entry counts');
// 6. non-eligible classes never count; they do not increase the multiplier
assert.equal(levelup(actorOf(cls('Noble', 3), cls('Soldier', 2)), { name: 'Soldier' }), 15000);
assert.equal(levelup(actorOf(cls('Soldier', 4)), { name: 'Soldier' }), 0);
// total character level is never substituted for eligible class levels
assert.equal(levelup(actorOf(cls('Noble', 1), cls('Soldier', 8)), { name: 'Soldier' }), 5000);
setMode(undefined);

// 7/8. chargen (Wealth acquired during advancement) and preview == grant parity in both modes
for (const [mode, noble, lineageClass] of [[undefined, 15000, 0], ['noble-levels', 15000, 0], ['lineage-levels', 15000, 15000]]) {
  setMode(mode);
  const sel = (c) => ({ class: c, talents: [wealth], survey: { startingLevel: 3 } });
  assert.equal(B.computeChargenWealthGrant(sel({ name: 'Noble' }), null, { targetLevel: 3 }), noble, `noble chargen (${mode})`);
  const custom = { name: 'Corporate Agent', system: { talentTreeIds: ['lineage'] } };
  assert.equal(B.computeChargenWealthGrant(sel(custom), null, { targetLevel: 3 }), lineageClass, `lineage class chargen (${mode})`);
  step._startingLevel = 3;
  assert.equal(step._computeWealthCreditGrant(custom, sel(custom)), lineageClass, 'summary preview == builder');
  const a = actorOf(cls('Noble', 2));
  assert.equal(step._computeLevelupWealthCreditGrant(a, { class: { name: 'Noble' } }, { name: 'Noble' }, { targetLevel: 3 }), levelup(a, { name: 'Noble' }), 'level-up preview == builder');
}
setMode(undefined);

// 12. provenance: mode and class-level basis recorded in the Wealth history (and on the ledger grant), existing fields preserved
{
  const a = actorOf(cls('Noble', 3));
  const hist = B.withLevelupWealthHistory(a, { class: { name: 'Soldier' } }, { mode: 'levelup', targetLevel: 4 }, 15000);
  const w = hist['swse.talent.wealth'];
  assert.equal(w.lastMode, 'noble-levels'); assert.equal(w.lastClassLevelBasis, 3); assert.equal(w.lastGrantedCredits, 15000);
  assert.ok(Array.isArray(w.characterLevelsGranted) && w.characterLevelsGranted.includes(4));
  assert.deepEqual(w.grantLog.at(-1), { characterLevel: 4, mode: 'noble-levels', classLevelBasis: 3, credits: 15000, source: 'levelup-finalizer' });
  setMode('lineage-levels');
  const h2 = B.withLevelupWealthHistory(actorOf(cls('Noble', 3), lineagePrestige('Corporate Agent', 1)), { class: { name: 'Corporate Agent', system: { talentTreeIds: ['lineage'] } } }, { mode: 'levelup', targetLevel: 5 }, 25000);
  assert.equal(h2['swse.talent.wealth'].lastMode, 'lineage-levels'); assert.equal(h2['swse.talent.wealth'].lastClassLevelBasis, 5);
  setMode(undefined);
  const g = B.compileChargenCreditGrants({ summary: {}, baseStartingCredits: 3000, wealthBonus: 15000, wealthMode: 'noble-levels', wealthClassLevelBasis: 3 }).grants.find((x) => x.id === 'chargen:wealth-talent');
  assert.equal(g.ruleRef, 'wealth-payout:noble-levels:levels=3');
}
// 9/10. mode switching never rewrites history or wallets; a level already granted is not granted again in either mode
{
  const granted = { ...actorOf(cls('Noble', 3)), system: { level: 3, credits: 777 }, flags: { swse: { progressionHistory: { 'swse.talent.wealth': { characterLevelsGranted: [4], lastMode: 'lineage-levels', lastClassLevelBasis: 9, lastGrantedCredits: 45000, grantLog: [{ characterLevel: 4, mode: 'lineage-levels', classLevelBasis: 9, credits: 45000, source: 'levelup-finalizer' }] } } } } };
  const before = JSON.stringify(granted);
  for (const mode of [undefined, 'lineage-levels']) { setMode(mode); assert.equal(levelup(granted, { name: 'Noble' }), 0, `replay of level 4 grants nothing (${mode})`); }
  assert.equal(JSON.stringify(granted), before, 'calculating never mutates the actor, wallet or history');
  setMode(undefined);
  const next = B.withLevelupWealthHistory({ ...granted, system: { level: 4 } }, { class: { name: 'Noble' } }, { mode: 'levelup', targetLevel: 5 }, 25000)['swse.talent.wealth'];
  assert.deepEqual(next.grantLog.map((e) => [e.characterLevel, e.mode]), [[4, 'lineage-levels'], [5, 'noble-levels']], 'earlier entries keep the mode they were granted under');
}
// no second multiplier formula outside the builder
for (const f of ['scripts/apps/progression-framework/steps/summary-step.js', 'scripts/apps/progression-framework/shell/progression-finalizer.js']) assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /\* 5000|5000 \*/, f);
process.stdout.write('wealth-payout-mode: ok\n');
