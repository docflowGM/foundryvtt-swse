import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Transaction & Progression SSOT: ONE Wealth-talent grant calculation (ProgressionEconomyPlanBuilder). The summary step (chargen + level-up preview) and the
// finalizer used to carry their own copies; a preview must equal what finalization grants. Figures below use the builder's existing arithmetic
// (lineage-eligible class levels x 5,000); this test pins consistency between consumers, not a sourcebook rule.
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

const { SummaryStep } = await import('../scripts/apps/progression-framework/steps/summary-step.js');
const { ProgressionEconomyPlanBuilder } = await import('../scripts/apps/progression-framework/shell/mutation/progression-economy-plan-builder.js');
const step = Object.create(SummaryStep.prototype); step._startingLevel = 3;
const wealth = { name: 'Wealth', type: 'talent' };
const customLineage = { name: 'Custom Heir', system: { talentTreeIds: ['lineage'] } };

// chargen: the summary preview equals the builder's grant, including a lineage-tree class that is not named Noble
for (const [label, cls, expected] of [['Noble', { name: 'Noble' }, 15000], ['Soldier (not eligible)', { name: 'Soldier' }, 0], ['lineage-tree class', customLineage, 15000]]) {
  const selections = { class: cls, talents: [wealth], survey: { startingLevel: 3 } };
  const builder = ProgressionEconomyPlanBuilder.computeChargenWealthGrant(selections, null, { targetLevel: 3 });
  assert.equal(builder, expected, `${label}: builder grant`);
  assert.equal(step._computeWealthCreditGrant(cls, selections), builder, `${label}: the summary preview equals the grant that finalization compiles`);
}
// no Wealth talent => 0 everywhere
assert.equal(step._computeWealthCreditGrant({ name: 'Noble' }, { class: { name: 'Noble' }, talents: [], survey: { startingLevel: 3 } }), 0);

// level-up: preview == builder, and a level already granted is not granted twice
{
  const actor = { id: 'a', items: [{ type: 'class', name: 'Noble', system: { classId: 'noble', level: 2 } }, { type: 'talent', name: 'Wealth' }], system: { level: 2 }, flags: { swse: { progressionHistory: {} } } };
  const selections = { class: { name: 'Noble' } };
  const direct = ProgressionEconomyPlanBuilder.computeLevelupWealthGrant(actor, selections, { mode: 'levelup', targetLevel: 3 });
  assert.equal(direct, 15000, 'Noble 2 -> 3 with Wealth: lineage levels after level-up x 5,000');
  assert.equal(step._computeLevelupWealthCreditGrant(actor, selections, { name: 'Noble' }, { targetLevel: 3 }), direct, 'preview equals builder');
  const granted = { ...actor, flags: { swse: { progressionHistory: { 'swse.talent.wealth': { characterLevelsGranted: [3] } } } } };
  assert.equal(ProgressionEconomyPlanBuilder.computeLevelupWealthGrant(granted, selections, { mode: 'levelup', targetLevel: 3 }), 0, 'no duplicate grant for the same character level');
}
// one implementation: the finalizer and the summary step carry no copy of the rule
const fin = fs.readFileSync('scripts/apps/progression-framework/shell/progression-finalizer.js', 'utf8');
const sum = fs.readFileSync('scripts/apps/progression-framework/steps/summary-step.js', 'utf8');
assert.doesNotMatch(fin, /\* 5000/); assert.doesNotMatch(sum, /\* 5000/);
assert.doesNotMatch(fin, /static _computeLevelupWealthCreditGrant/);
process.stdout.write('progression-wealth-single-calculation: ok\n');
