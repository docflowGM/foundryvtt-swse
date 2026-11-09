import assert from 'node:assert/strict';
import test from 'node:test';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Weapon three-gate audit W4 golden cases M-01..M-04, M-07, M-20 against the PRODUCTION damage composition (resolveDamageComposition +
// buildDamageFormula) with real canonical registry records. Rule chain printed in each case:
//   Printed rule (Core Rulebook, Combat Statistics > Damage) -> canonical field -> production consumer -> expected -> actual.
// Remaining M-ids are covered by existing suites (see docs/audits/weapon-v2-3gate-consumer-closure.md, section "Gate C matrix").
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { resolveDamageComposition, buildDamageFormula } = await import('/systems/foundryvtt-swse/scripts/engine/combat/combat-roll-math.js');

const ab = (m) => ({ base: 10 + m * 2, racial: 0, enhancement: 0, temp: 0 });
const col = (l) => { const a = [...l]; a.get = (id) => a.find((i) => i.id === id); return a; };
// level 5 hero: half heroic level = floor(5/2) = 2
const hero = (items, { str = 3, dex = 4 } = {}) => ({ id: 'a1', name: 'Hero', type: 'character', flags: { swse: {} }, effects: [], getFlag() {}, getRollData() { return {}; }, items: col(items),
  system: { bab: 5, level: 5, size: 'medium', attributes: { str: ab(str), dex: ab(dex), con: ab(0), int: ab(0), wis: ab(0), cha: ab(0) }, abilities: {}, skills: {}, derived: {}, forcePoints: { value: 1, max: 5 } } });
const weapon = (k, cat) => ({ id: `w-${k}`, name: 'Renamed', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: k } } }, system: { damage: '9d9', damageType: 'sonic', equipped: true, weaponCategory: cat } });
const formulaOf = (A, w, profileId, ctx = {}) => buildDamageFormula(resolveDamageComposition(A, w, { weaponForm: { identityKey: w.flags.swse.canonicalWeapon.identityKey, profileId }, ...ctx })).replace(/\s/g, '');

test('M-01: L5 hero, STR +3, one-handed ordinary non-light melee 2d8 (Vibrosword) -> 2d8 + 2 (half level) + 3 (STR)', () => {
  const w = weapon('weapon-vibrosword', 'melee'); const A = hero([w]);
  assert.equal(formulaOf(A, w, 'melee', { wieldedHands: 1 }), '2d8+5');
});

test('M-02: same hero wielding it two-handed -> positive STR is doubled: 2d8 + 2 + 6', () => {
  const w = weapon('weapon-vibrosword', 'melee'); const A = hero([w]);
  assert.equal(formulaOf(A, w, 'melee', { wieldedHands: 2 }), '2d8+8');
});

test('M-03: a LIGHT weapon (Vibrodagger) wielded two-handed does NOT double STR: 2d4 + 2 + 3', () => {
  const w = weapon('weapon-vibrodagger', 'melee'); const A = hero([w]);
  assert.equal(formulaOf(A, w, 'primary', { wieldedHands: 2 }), '2d4+5');
  assert.equal(formulaOf(A, w, 'primary', { wieldedHands: 1 }), '2d4+5');
});

test('M-04: ordinary ranged blaster pistol (DEX +4, STR +3) -> 3d6 + 2; neither DEX nor STR reaches damage', () => {
  const w = weapon('weapon-blaster-pistol', 'ranged'); const A = hero([w]);
  assert.equal(formulaOf(A, w, 'primary'), '3d6+2');
});

test('M-07: negative STR two-handed with a non-light weapon is not doubled (only a positive bonus doubles): 2d8 + 2 - 2', () => {
  const w = weapon('weapon-vibrosword', 'melee'); const A = hero([w], { str: -2 });
  assert.equal(formulaOf(A, w, 'melee', { wieldedHands: 2 }), '2d8');
  assert.equal(formulaOf(A, w, 'melee', { wieldedHands: 1 }), '2d8');
});

test('M-20: a canonical-hinted weapon whose identity does not resolve never falls back to the Item dice (no silent 1d6 / 9d9)', () => {
  const bad = weapon('weapon-not-in-registry', 'ranged'); const A = hero([bad]);
  assert.throws(() => resolveDamageComposition(A, bad, { weaponForm: { identityKey: 'weapon-not-in-registry', profileId: 'primary' } }));
});
