import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// P0-3 — Stock-droid attack math correction (correction pass,
// "fix(droids): correct stock combat and customization validation").
//
// resolveAttackBonus() previously used an unconditional early `return` for
// any stock-droid weapon carrying a published attack contract — its own
// doc comment claimed every situational modifier (range, firing-into-melee,
// condition-track, attack penalty, combat options, rage, effect intents,
// scoped feats) "still applies on top of it", but the code returned before
// any of that ran. This suite proves the corrected base/situational split:
// BAB + ability + enhancement + proficiency are replaced by the published
// total (isStockDroidFlat gates those specific terms to 0), while every
// situational modifier still composes normally on top of it.
//
// Coverage tier: (a) direct production-path — combat-roll-math.js loads
// and resolveAttackBonus() executes for real through the Foundry-shim
// harness. The one hard blocker (resolveAttackBonus reads
// `window.SWSE?.TalentActionLinker` unconditionally, and `window` is not
// among the harness's shimmed globals — confirmed by grep of
// tests/helpers/foundry-shim/globals.mjs's SHIM_KEYS) is worked around
// locally below with a minimal `globalThis.window` stub, rather than
// changing the shared shim (window is a real global in every browser/
// Electron/Foundry runtime this code actually ships to; this is a
// test-harness gap, not a production one).

globalThis.window = globalThis.window || {};

registerFoundryPathLoader();
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' }, combat: null } });

const { resolveAttackBonus } = await import('../scripts/engine/combat/combat-roll-math.js');

function explicitStockDroid(overrides = {}) {
  return {
    id: 'droid-1', type: 'droid', name: 'Test Droid',
    items: [],
    flags: {},
    system: { droidCalculationMode: 'stock-statblock', ...overrides.system },
    getFlag() { return undefined; },
    ...overrides
  };
}

function explicitPlayableDroid(overrides = {}) {
  return {
    id: 'droid-2', type: 'droid', name: 'Playable Droid',
    items: [],
    flags: {},
    system: { droidCalculationMode: 'playable-derived', bab: 4, abilities: { str: { mod: 2 }, dex: { mod: 1 } }, ...overrides.system },
    getFlag() { return undefined; },
    ...overrides
  };
}

function stockWeapon(overrides = {}) {
  return {
    id: 'w1', name: 'Integrated Blaster',
    system: { attackBonus: 0, damage: '2d6' },
    flags: { swse: { stockDroidAttack: { publishedAttackTotal: 9, publishedDamage: '2d6+3', mode: 'stock-statblock', sourceStatblock: true, ...overrides } } }
  };
}

// 1. Printed total alone: a stock droid with no situational context at all
// resolves to exactly the published total, with a single "Published
// Statblock Total" component and no BAB/Ability/Enhancement components.
{
  const result = resolveAttackBonus(explicitStockDroid(), stockWeapon(), null, {});
  assert.equal(result.total, 9);
  assert.equal(result.components['Published Statblock Total'], 9);
  assert.equal(result.components['BAB'], undefined);
  assert.equal(result.components['Ability (STR)'], undefined);
  assert.equal(result.components['Ability (DEX)'], undefined);
  assert.equal(result.flags.stockDroidFlat, true);
}

// 2. Range penalty still applies on top of the published total.
{
  const result = resolveAttackBonus(explicitStockDroid(), stockWeapon(), null, { rangeBand: 'medium' });
  assert.equal(result.total, 9 - 5);
  assert.equal(result.components['Range Penalty'], -5);
}

// 3. Condition-track penalty still applies on top of the published total.
{
  const droid = explicitStockDroid({ system: { droidCalculationMode: 'stock-statblock', conditionTrack: { penalty: -5 } } });
  const result = resolveAttackBonus(droid, stockWeapon(), null, {});
  assert.equal(result.total, 9 - 5);
  assert.equal(result.components['CT Penalty'], -5);
}

// 4. Firing-into-melee penalty still applies on top of the published total.
{
  const result = resolveAttackBonus(explicitStockDroid(), stockWeapon(), null, { firingIntoMelee: true });
  assert.equal(result.total, 9 - 5);
  assert.equal(result.components['Firing Into Melee'], -5);
}

// 5. Explicit attack-penalty context still applies on top of the published
// total.
{
  const droid = explicitStockDroid({ system: { droidCalculationMode: 'stock-statblock', attackPenalty: -2 } });
  const result = resolveAttackBonus(droid, stockWeapon(), null, {});
  assert.equal(result.total, 9 - 2);
  assert.equal(result.components['Attack Penalty'], -2);
}

// 6. No BAB/ability/enhancement double count: even when the weapon ALSO
// carries a flat attackBonus (the field getWeaponFlatAttackBonus() would
// normally read as an enhancement bonus), a stock droid's total ignores it
// entirely — it is already baked into the published total.
{
  const weapon = stockWeapon();
  weapon.system.attackBonus = 4;
  const result = resolveAttackBonus(explicitStockDroid(), weapon, null, {});
  assert.equal(result.total, 9, 'weapon.system.attackBonus must not be added on top of the published total');
  assert.equal(result.components['Enhancement'], undefined);
}

// 7. A weapon with no stock attack contract at all falls through to normal
// composition even for a stock-mode droid actor (no published total to use).
{
  const droid = explicitStockDroid({ system: { droidCalculationMode: 'stock-statblock', bab: 3, abilities: { str: { mod: 1 } } } });
  const plainWeapon = { id: 'w2', name: 'Fists', system: {} };
  const result = resolveAttackBonus(droid, plainWeapon, null, {});
  assert.equal(result.flags.stockDroidFlat, undefined);
  assert.ok('BAB' in result.components);
}

// 8. A converted (playable-derived) droid falls through to normal
// BAB/ability composition even though the weapon still carries a stock
// attack contract flag (not yet neutralized) — mode gates the decision,
// not weapon flag presence alone.
{
  const result = resolveAttackBonus(explicitPlayableDroid(), stockWeapon(), null, {});
  assert.notEqual(result.total, 9);
  assert.ok('BAB' in result.components);
  assert.equal(result.flags.stockDroidFlat, undefined);
}

// 9. Combined situational stack: multiple situational modifiers all apply
// simultaneously on top of the published total, and their sum matches
// exactly (published total + range + firing-into-melee + attack penalty).
{
  const droid = explicitStockDroid({ system: { droidCalculationMode: 'stock-statblock', attackPenalty: -1 } });
  const result = resolveAttackBonus(droid, stockWeapon(), null, { rangeBand: 'short', firingIntoMelee: true });
  assert.equal(result.total, 9 - 2 - 5 - 1);
}

console.log('Stock-droid attack math tests passed.');
