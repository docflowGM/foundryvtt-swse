import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// WEALTH-RD-001 / WEALTH-Q1 (open): higher-level creation keeps the SINGLE payout evaluation (multiplier x 5,000 at the starting level), never a
// cumulative per-level award; but the multiplier must come from the COUNTED CLASS LEVELS (Noble levels under RAW, Lineage-eligible class levels under
// Expanded Wealth), never from the character level. A Noble 2 / Soldier 3 creation has five character levels and two Noble levels.
for (const l of ['log', 'info', 'debug', 'warn']) console[l] = () => {};
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone = (v) => JSON.parse(JSON.stringify(v));
globalThis.window = globalThis.window ?? { addEventListener() {}, removeEventListener() {} };
globalThis.localStorage = globalThis.localStorage ?? { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.Hooks = { on() {}, once() {}, callAll() {}, call() {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
const store = new Map();
globalThis.game = { ...(globalThis.game ?? {}), settings: { get: (ns, k) => store.get(k), set: async () => {}, settings: { has: (k) => k === 'foundryvtt-swse.wealthPayoutMode' } }, actors: { get: () => null } };
const mode = (v) => { if (v === undefined) store.delete('wealthPayoutMode'); else store.set('wealthPayoutMode', v); };
const { ProgressionEconomyPlanBuilder: B } = await import('../scripts/apps/progression-framework/shell/mutation/progression-economy-plan-builder.js');

const wealth = { name: 'Wealth', type: 'talent' };
const noble = { name: 'Noble' }, soldier = { name: 'Soldier' };
const agent = { name: 'Corporate Agent', system: { talentTreeIds: ['lineage'] } };
const jedi = { name: 'Jedi' };
const create = (classLevels, startingLevel, extra = {}) => ({ class: classLevels[0].class, classLevels, talents: [wealth], survey: { startingLevel }, ...extra });
const grant = (sel, lvl) => B.computeChargenWealthGrant(sel, null, { targetLevel: lvl });

// RAW: Noble 2 / Soldier 3 (5 character levels) => 2 Noble levels
mode(undefined);
assert.equal(grant(create([{ class: noble, level: 2 }, { class: soldier, level: 3 }], 5), 5), 10000, 'Noble 2 / Soldier 3: 2 x 5,000, not 5 x 5,000');
assert.equal(grant(create([{ class: soldier, level: 3 }, { class: noble, level: 2 }], 5), 5), 10000, 'class order does not matter');
assert.equal(grant(create([{ class: soldier, level: 5 }], 5), 5), 0, 'no Noble levels => 0');
assert.equal(grant(create([{ class: noble, level: 3 }, { class: agent, level: 2 }], 5), 5), 15000, 'RAW: a Lineage-eligible prestige class does not count');
// single-class creation is unchanged (level == class level)
assert.equal(grant(create([{ class: noble, level: 5 }], 5), 5), 25000);
assert.equal(grant({ class: noble, talents: [wealth], survey: { startingLevel: 5 } }, 5), 25000, 'no explicit class levels: the selected class holds the starting level (existing behavior)');
// Expanded Wealth: mixed Lineage-eligible classes
mode('lineage-levels');
assert.equal(grant(create([{ class: noble, level: 2 }, { class: agent, level: 3 }], 5), 5), 25000, 'Noble 2 + Corporate Agent 3 = 5 counted levels');
assert.equal(grant(create([{ class: noble, level: 2 }, { class: soldier, level: 3 }], 5), 5), 10000, 'Soldier levels never count');
assert.equal(grant(create([{ class: jedi, level: 5 }], 5), 5), 0);
// SINGLE payout, never cumulative: the same classes with Wealth acquired at different levels pay the same one evaluation
for (const acquiredAt of [1, 3, 5]) {
  const sel = create([{ class: noble, level: 5 }], 5, { talents: [{ ...wealth, characterLevel: acquiredAt }] });
  assert.equal(grant(sel, 5), 25000, `Wealth acquired at level ${acquiredAt}: one payout, no per-level cumulation`);
}
mode(undefined);
// provenance of a chargen grant: mode + class-level basis (not the character level) and what was awarded
{
  const a = { id: 'a', items: [], flags: { swse: { progressionHistory: {} } }, system: {} };
  const sel = create([{ class: noble, level: 2 }, { class: soldier, level: 3 }], 5);
  const hist = B.withChargenWealthHistory(a, sel, { targetLevel: 5 });
  const w = hist['swse.talent.wealth'];
  assert.equal(w.lastMode, 'noble-levels'); assert.equal(w.lastClassLevelBasis, 2); assert.equal(w.lastGrantedCredits, 10000);
  assert.deepEqual(w.characterLevelsGranted, [5], 'the single payout belongs to the starting character level; intermediate levels were not paid');
  assert.deepEqual(w.grantLog, [{ characterLevel: 5, mode: 'noble-levels', classLevelBasis: 2, credits: 10000, source: 'chargen-finalizer' }]);
}
// level-up with Wealth owned but NO history: only this level's grant is logged (no fabricated past payouts)
{
  const a = { id: 'a', type: 'character', items: [{ type: 'class', name: 'Noble', system: { classId: 'noble', level: 3 } }, wealth], system: { level: 3 }, flags: { swse: { progressionHistory: {} } } };
  assert.equal(B.computeLevelupWealthGrant(a, { class: noble }, { mode: 'levelup', targetLevel: 4 }), 20000);
  const w = B.withLevelupWealthHistory(a, { class: noble }, { mode: 'levelup', targetLevel: 4 }, 20000)['swse.talent.wealth'];
  assert.deepEqual(w.characterLevelsGranted, [4]); assert.equal(w.grantLog.length, 1);
}
process.stdout.write('wealth-multiclass-creation: ok\n');
