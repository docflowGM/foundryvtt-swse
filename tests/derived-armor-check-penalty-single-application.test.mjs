import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// 3N-DC P0 (owner directive): the armor check penalty comes from ONE place (resolveArmorUsageEffects via ModifierEngine). Before the fix the skill pass
// ALSO read a persisted system.armor.checkPenalty / system.derived.armor.checkPenalty (no live writer; legacy data) and added it again: an actor
// carrying that stale field read -3 where the single application gives +2 (half character level 2 + trained 5 + dex 0 + armor -5).
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.game = { ...(globalThis.game ?? {}), settings: { get: () => false }, user: { isGM: true }, actors: { get: () => null } };
const { DerivedCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/derived-calculator.js');

let uid = 0;
const mk = (extraSystem = {}) => ({ id: `acp${++uid}`, type: 'character', _stats: { modifiedTime: uid }, effects: [], flags: {},
  items: [{ type: 'class', name: 'Soldier', system: { level: 4, isNonheroic: false } },
    { type: 'armor', name: 'Test Armor', id: 'a1', system: { equipped: true, armorType: 'medium', armorCheckPenalty: -5, armor: { checkPenalty: -5 } } }],
  system: { level: 4, size: 'medium', hp: { max: 30, value: 30 }, progression: {}, conditionTrack: { current: 0 },
    attributes: Object.fromEntries(['str', 'dex', 'con', 'int', 'wis', 'cha'].map((k) => [k, { base: 10 }])),
    skills: { acrobatics: { trained: true, focused: false, miscMod: 0, selectedAbility: 'dex' } }, ...extraSystem } });
const skill = async (a) => (await DerivedCalculator.computeAll(a))['system.derived.skills'].acrobatics;

const clean = await skill(mk());
assert.equal(clean.total, 2, 'one -5 armor check penalty: 2 + 5 + 0 - 5');
const stale = await skill(mk({ armor: { checkPenalty: -5 } }));
assert.equal(stale.total, 2, 'a stale persisted system.armor.checkPenalty must not add a second -5');
const staleDerived = await skill(mk({ derived: { armor: { checkPenalty: -5 } } }));
assert.equal(staleDerived.total, 2, 'nor a stale system.derived.armor.checkPenalty');
assert.equal(stale.math.verified, true, 'the breakdown sums to the total');
console.log('derived-armor-check-penalty-single-application: ok');
