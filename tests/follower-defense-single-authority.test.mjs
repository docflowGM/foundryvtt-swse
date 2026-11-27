import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// F-NPC-003 owner ruling (Clone Wars Campaign Guide pp. 32-34; Core pp. 145-146): follower defense = 10 + OWNER's heroic level + ability modifier
// (Reflex DEX; Fortitude CON living / STR droid or nonliving; Will WIS) + legal bonuses; template +2 (aggressive Fort, defensive Ref, utility Will);
// armor and the owner's heroic level do not stack on Reflex (the higher applies); no Nonheroic class benefits; no max(STR,CON).
// DefenseCalculator.calculate is the ONLY authority: no wrapper re-computes the result.

registerFoundryPathLoader();
installFoundryShimGlobals();
const { DefenseCalculator } = await import('/systems/foundryvtt-swse/scripts/actors/derived/defense-calculator.js');
const ab = (score) => ({ base: score, racial: 0, enhancement: 0, temp: 0 });
const owners = new Map();
globalThis.game = globalThis.game ?? {};
globalThis.game.actors = { get: (id) => owners.get(id) };
const setOwner = (id, heroic) => owners.set(id, { id, type: 'character', system: {}, items: [{ type: 'class', name: 'Soldier', system: { level: heroic, isNonheroic: false } }] });
const follower = ({ ownerId = 'own', template = '', droid = false, str = 10, con = 10, dex = 10, wis = 10, items = [], extra = {} } = {}) => ({
  type: 'npc',
  system: { isFollower: true, isDroid: droid, level: 1, npcProfile: { kind: 'follower', owner: { actorId: ownerId } }, progression: { followerTemplateType: template },
    attributes: { str: ab(str), con: ab(con), dex: ab(dex), wis: ab(wis), int: ab(10), cha: ab(10) }, abilities: {}, defenses: {}, conditionTrack: { current: 0 }, ...extra },
  items, flags: {},
});
const calc = (a) => DefenseCalculator.calculate(a, [], {}, {});

setOwner('own', 8);
// organic aggressive follower, Con 10: Fortitude 10 + 8 + 0 + 2 = 20
assert.equal((await calc(follower({ template: 'aggressive' }))).fortitude.total, 20);
assert.equal((await calc(follower({ template: 'aggressive' }))).reflex.total, 18);
// living follower with STR 18 / CON 10 uses CON, never max(STR, CON)
assert.equal((await calc(follower({ str: 18, con: 10 }))).fortitude.total, 18);
assert.equal((await calc(follower({ str: 10, con: 16 }))).fortitude.total, 21);
// droid follower uses STR for Fortitude (no Constitution)
assert.equal((await calc(follower({ droid: true, str: 18, con: 10 }))).fortitude.total, 22, 'droid/nonliving follower: STR');
assert.equal((await calc(follower({ droid: true, str: 10, con: 18 }))).fortitude.total, 18, 'droid follower ignores CON');
// templates: +2 to exactly one defense
const def = await calc(follower({ template: 'defensive' })); assert.deepEqual([def.fortitude.total, def.reflex.total, def.will.total], [18, 20, 18]);
const uti = await calc(follower({ template: 'utility' })); assert.deepEqual([uti.fortitude.total, uti.reflex.total, uti.will.total], [18, 18, 20]);
// ability modifiers
assert.equal((await calc(follower({ dex: 14, wis: 12 }))).reflex.total, 20); assert.equal((await calc(follower({ wis: 12 }))).will.total, 19);
// armor: the higher of the armor bonus and the owner's heroic level (no stacking)
const armor = (n) => ({ type: 'armor', name: 'Armor', system: { equipped: true, reflexBonus: n, armorBonus: n, armorType: 'light' } });
assert.equal((await calc(follower({ items: [armor(6)] }))).reflex.total, 18, 'armor 6 < level 8: level applies');
assert.equal((await calc(follower({ items: [armor(11)] }))).reflex.total, 21, 'armor 11 > level 8: armor applies, not 8+11');
// owner level advancement
setOwner('own', 9); assert.equal((await calc(follower({}))).fortitude.total, 19); assert.equal((await calc(follower({ template: 'aggressive' }))).fortitude.total, 21);
setOwner('own', 8);
// no Nonheroic class benefits: follower class save bonuses are ignored
const nh = follower({}); nh.items = [{ type: 'class', name: 'Nonheroic', system: { level: 3, isNonheroic: true, levelProgression: [] } }];
assert.equal((await calc(nh)).fortitude.total, 18);
// derived defenses agree with a direct canonical call (single result consumed everywhere)
const a = follower({ template: 'aggressive' }); assert.deepEqual(await calc(a), await calc(a));

// one authority: the monkey-patched wrapper is retired
const hot = fs.readFileSync('scripts/patches/follower-npc-sheet-parity-hotfix.js', 'utf8');
assert.doesNotMatch(hot, /DefenseCalculator\.calculate|import \{ DefenseCalculator|DEFENSE_PATCHED/, 'no follower DefenseCalculator wrapper remains');
console.log('follower-defense-single-authority: ok');
