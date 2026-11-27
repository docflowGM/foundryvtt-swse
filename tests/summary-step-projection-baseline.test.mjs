import test from 'node:test';
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// 3N-PRG Stage D: the level-up summary no longer computes projected BAB/defenses/DT/grapple/Second Wind itself; every "after" value comes from the
// progression mannequin (tests/prg-mannequin-parity-stage-c.test.mjs holds the parity evidence against the real finalization path). Remaining here: the
// small display helpers and source guards that keep the retired formulas from returning.
globalThis.window = globalThis.window || {}; window.addEventListener ??= () => {}; window.removeEventListener ??= () => {};
globalThis.document ??= { createElement: () => ({ style: {}, appendChild() {}, setAttribute() {} }), addEventListener() {}, body: { appendChild() {} }, head: { appendChild() {} } };
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {}; globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => 'x'; globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = { on() {}, once() {}, callAll() {}, call() {} };
const { SummaryStep } = await import('../scripts/apps/progression-framework/steps/summary-step.js');
const P = SummaryStep.prototype;
const step = Object.create(P);

test('ability modifier: floor((score-10)/2), 10 when the score is missing/zero', () => {
  assert.equal(step._abilityMod(14), 2); assert.equal(step._abilityMod(9), -1); assert.equal(step._abilityMod(8), -1); assert.equal(step._abilityMod(undefined), 0);
});
test('projected attribute scores prefer the projection and fall back per ability', () => {
  const fallback = { str: 10, dex: 12, con: 14, int: 8, wis: 13, cha: 9 };
  const out = step._getProjectedAttributeScores({ attributes: { str: { score: 16 }, wis: { score: 15 } } }, fallback);
  assert.deepEqual(out, { str: 16, dex: 12, con: 14, int: 8, wis: 15, cha: 9 });
});
test('retired preview formulas stay retired; the summary consumes the mannequin facade (3N-PRG Stage D)', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync('scripts/apps/progression-framework/steps/summary-step.js', 'utf8');
  assert.match(src, /getMannequinProjection\(/);
  for (const gone of [/_computeProjectedBAB/, /_getMaxDefenseBonuses/, /_getProjectedDefenseBonuses/, /const afterDT = afterFort;/, /afterReflex = beforeReflex - currentDexMod/, /afterGrapple = beforeGrapple - beforeBAB/, /5 \+ Math\.floor\(newLevel \/ 4\) \* 5/]) {
    assert.doesNotMatch(src, gone, String(gone));
  }
});
