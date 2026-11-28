import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// DC-RULE-001 (owner ruling 2026-11-27): the OPTIONAL alternative Block house rule (BlockMechanicalAlternative; not the published Jedi Block talent) rolls a
// weapon attack with the authoritative attack calculation and appends NO half-level bonus (neither half heroic nor half character level).
// Failing before: the roll added the pre-DC "effective half level" (e.g. +3 for Soldier 6).
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.game = { ...(globalThis.game ?? {}), settings: { get: () => false }, user: { isGM: true }, actors: { get: () => null } };
const rolls = [];
globalThis.SWSE = { ...(globalThis.SWSE ?? {}), RollEngine: { safeRoll: async (formula) => { rolls.push(formula); return { total: 15 }; } } };
const { BlockMechanicalAlternative } = await import('/systems/foundryvtt-swse/scripts/houserules/houserule-block-mechanic.js');

const cls = (level, nonheroic = false) => ({ type: 'class', name: nonheroic ? 'Nonheroic' : 'Soldier', system: { level, isNonheroic: nonheroic } });
const actorOf = (items, bab) => ({ id: 'b', name: 'B', type: 'character', items,
  system: { level: items.reduce((s, c) => s + c.system.level, 0), bab, attributes: { str: { mod: 2 }, dex: { mod: 1 } } },
  getFlag: () => 0, setFlag: async () => {}, getRollData: () => ({}) });
const weapon = { name: 'Vibroblade', system: { attackAttribute: 'str', attackBonus: 1 } };
const penalty = (a) => BlockMechanicalAlternative.getBlockPenalty(a);

for (const [label, items, bab] of [['heroic Soldier 6', [cls(6)], 6], ['multiclass NH4/Soldier2', [cls(4, true), cls(2)], 3], ['Nonheroic 4', [cls(4, true)], 3], ['Nonheroic 10/Soldier 5', [cls(10, true), cls(5)], 8]]) {
  const a = actorOf(items, bab);
  rolls.length = 0;
  const r = await BlockMechanicalAlternative.executeBlock(a, weapon, 10);
  const expected = bab + 2 + 1 + penalty(a);
  assert.equal(r.totalBonus, expected, `${label}: BAB + ability + weapon + repeat-attempt penalty, no half level`);
  assert.equal(rolls[0], `1d20 + ${expected}`);
  console.log(`  ok  ${label}: +${expected}`);
}
const src = (await import('node:fs')).readFileSync('scripts/houserules/houserule-block-mechanic.js', 'utf8');
assert.ok(!/getEffectiveHalfLevel|getHalfHeroicLevel|getHalfCharacterLevel/.test(src.replace(/\/\/.*$/gm, '')), 'the alternative Block mechanic references no half-level helper');
console.log('houserule-block-no-half-level: ok');
