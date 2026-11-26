import test from 'node:test';
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
// 3G baseline (mannequin preparation, docs/architecture/v2-contracts/PRG-mannequin-preparation.md): CHARACTERIZATION of today's level-up summary
// projection helpers in SummaryStep. These are the manual formulas the unified mannequin (3N-PRG) will replace; the tests pin current behavior so the
// parity work can tell a deliberate correction from an accidental regression. They assert what the code does today, NOT that it is rules-correct.
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
test('projected defense class bonuses keep the max per defense and only consider a NEW class once', async () => {
  const cls = (name, f, r, w) => ({ name, system: { defenses: { fortitude: f, reflex: r, will: w } } });
  const current = [cls('Soldier', 1, 1, 0), cls('Scout', 0, 2, 0)];
  assert.deepEqual(await step._getMaxDefenseBonuses(current), { fortitude: 1, reflex: 2, will: 0 });
  const existing = await step._getProjectedDefenseBonuses(current, { name: 'Soldier', system: { defenses: { fortitude: 9, reflex: 9, will: 9 } } });
  assert.deepEqual(existing, { fortitude: 1, reflex: 2, will: 0 }, 'an already-held class does not change the projection');
  const added = await step._getProjectedDefenseBonuses(current, cls('Jedi', 1, 1, 2));
  assert.deepEqual(added, { fortitude: 1, reflex: 2, will: 2 }, 'a new class contributes its per-defense maximum');
});
test('summary keys normalize to snake_case', () => {
  assert.equal(step._normalizeSummaryKey('Force & Shadow  Adept'), 'force_and_shadow_adept');
});
test('level-up summary pins the inline formulas that the mannequin will replace (documented in PRG-mannequin-preparation.md)', async () => {
  const fs = await import('node:fs');
  const src = fs.readFileSync('scripts/apps/progression-framework/steps/summary-step.js', 'utf8');
  // these exact expressions are the replacement targets; if one changes, update the PRG contract doc and the parity fixtures together
  assert.match(src, /const afterDT = afterFort;/);
  assert.match(src, /afterReflex = beforeReflex - currentDexMod - \(currentClassBonuses\.reflex \|\| 0\) \+ afterDexMod/);
  assert.match(src, /afterGrapple = beforeGrapple - beforeBAB - currentStrMod \+ afterBAB \+ afterStrMod/);
  assert.match(src, /5 \+ Math\.floor\(newLevel \/ 4\) \* 5/);
});
