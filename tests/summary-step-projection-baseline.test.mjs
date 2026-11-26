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

// ---- 3G characterization fixtures (mannequin parity inputs): CURRENT behavior of the projected-BAB helper, not a rules claim. ----
// Class definitions come from the ClassesDB registry (seeded here); calculateTotalBAB falls back to a hard-coded class-name table
// (Jedi/Soldier full, else 3/4) when a registry class carries no levelProgression/babProgression. That estimation is a 3N-DC defect to be
// replaced, so the pins that use it are labelled and the others use explicit progression data.
const { ClassesDB } = await import('../scripts/data/classes-db.js');
const prog = (n, f) => Array.from({ length: n }, (_, i) => ({ level: i + 1, bab: f(i + 1) }));
const seed = (name, levelProgression = undefined) => ClassesDB.classes.set(name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), { name, id: name.toLowerCase().replace(/[^a-z0-9]+/g, '_'), ...(levelProgression ? { levelProgression } : {}) });
seed('Soldier', prog(20, (l) => l)); seed('Scoundrel', prog(20, (l) => Math.floor(l * 0.75))); seed('Jedi', prog(20, (l) => l));
seed('Elite Trooper', prog(10, (l) => l)); seed('Bare Full'); seed('Bare Other');
const owned = (name, level) => ({ type: 'class', name, id: name, system: { classId: name, level } });
const actorWith = (items) => ({ system: {}, items });
test('same-class level-up: the existing class gains one level', async () => {
  assert.equal(await step._computeProjectedBAB(actorWith([owned('Soldier', 3)]), { name: 'Soldier' }), 4);
});
test('new-class multiclass: a level-1 entry of the selected class is added to the existing total', async () => {
  const soldier = owned('Soldier', 3);
  assert.equal(await step._computeProjectedBAB(actorWith([soldier]), { name: 'Scoundrel' }), 3);
  assert.equal(await step._computeProjectedBAB(actorWith([soldier]), { name: 'Jedi' }), 4);
});
test('prestige entry: treated exactly like any new class (no special casing in the projection)', async () => {
  assert.equal(await step._computeProjectedBAB(actorWith([owned('Soldier', 7)]), { name: 'Elite Trooper' }), 8);
});
test('no class selected: projection equals the actor\'s current computation', async () => {
  assert.equal(await step._computeProjectedBAB(actorWith([owned('Soldier', 2)]), null), 2);
});
test('ability-score level / wounded actor: BAB projection reads neither ability scores nor HP', async () => {
  const actor = { system: { hp: { value: 1, max: 40 }, attributes: { str: { base: 8 } } }, items: [owned('Soldier', 4)] };
  assert.equal(await step._computeProjectedBAB(actor, null), 4);
});
test('ESTIMATION FALLBACK (not certified; 3N-DC replaces it): a registry class with no progression data uses the name table', async () => {
  seed('Soldier'); // strip progression data from the registry entry
  assert.equal(await step._computeProjectedBAB(actorWith([owned('Soldier', 4)]), null), 4);
  seed('Scoundrel');
  assert.equal(await step._computeProjectedBAB(actorWith([owned('Scoundrel', 4)]), null), 3);
});
