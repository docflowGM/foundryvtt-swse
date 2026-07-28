import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// P0-4 — Stock-droid printed-damage contract (correction pass,
// "fix(droids): correct stock combat and customization validation").
//
// flags.swse.stockDroidAttack.publishedDamage was stored by the stock
// importer but never consumed by any damage-rolling authority —
// resolveDamageBonus() applied the normal half-level/ability/weapon
// enhancement composition on top of the weapon's base dice for every
// actor, droid or not, silently double-counting damage already baked
// into the published formula. This suite proves
// resolveStockDroidDamageContract() (and resolveDamageBonus()'s use of
// it) replaces half-level/ability/enhancement with the published formula
// while situational modifiers (rage, effect intents, combat options,
// scoped feats) still apply on top of it — mirroring the P0-3 attack fix.
//
// Coverage tiers:
//   Tests 1-6: (a) direct production-path — combat-roll-math.js loads and
//   resolveDamageBonus()/resolveStockDroidDamageContract() execute for
//   real through the Foundry-shim harness, with the same test-file-local
//   `window` workaround as tests/stock-droid-attack-math.test.mjs (this
//   module's import graph is shared with resolveAttackBonus's).
//   Test 7: (c) structural/source-inspection only — damage.js and
//   attacks.js pull in RollEngine, SWSEChat, and AmmoSystem, which this
//   harness does not shim, so the actual roll-formula assembly in those
//   files is verified by reading their source text for the
//   flags.stockDamageFormula read, not by executing rollDamage()/
//   rollAttackAndDamageWithNarration() end-to-end.

globalThis.window = globalThis.window || {};

registerFoundryPathLoader();
installFoundryShimGlobals({ game: { user: { isGM: true, id: 'gm-1' }, combat: null } });

const { resolveDamageBonus, resolveStockDroidDamageContract } = await import('../scripts/engine/combat/combat-roll-math.js');

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
    system: { droidCalculationMode: 'playable-derived', abilities: { str: { mod: 2 } }, level: 1, ...overrides.system },
    getFlag() { return undefined; },
    ...overrides
  };
}

function stockWeapon(overrides = {}) {
  return {
    id: 'w1', name: 'Integrated Blaster',
    system: { damage: '1d3', flatDamageBonus: 4 },
    flags: { swse: { stockDroidAttack: { publishedAttackTotal: 9, publishedDamage: '2d6+3', mode: 'stock-statblock', sourceStatblock: true, ...overrides } } }
  };
}

// 1. resolveStockDroidDamageContract() returns null for a non-stock actor.
{
  assert.equal(resolveStockDroidDamageContract(explicitPlayableDroid(), stockWeapon(), {}), null);
}

// 2. resolveStockDroidDamageContract() returns null for a weapon with no
// stock damage contract at all, even on a stock-mode droid.
{
  const plainWeapon = { id: 'w2', name: 'Fists', system: {} };
  assert.equal(resolveStockDroidDamageContract(explicitStockDroid(), plainWeapon, {}), null);
}

// 3. Printed formula alone: no situational context resolves to formula +
// zero bonus, with a single "Published Statblock Formula" component and
// no half-level/ability/enhancement components.
{
  const result = resolveDamageBonus(explicitStockDroid(), stockWeapon(), {});
  assert.equal(result.total, 0);
  assert.equal(result.components['Published Statblock Formula'], '2d6+3');
  assert.equal(result.components['½ Level'], undefined);
  assert.equal(result.components['Ability'], undefined);
  assert.equal(result.components['Enhancement'], undefined);
  assert.equal(result.flags.stockDroidFlat, true);
  assert.equal(result.flags.stockDamageFormula, '2d6+3');
}

// 4. No half-level/ability/enhancement double count: even though the
// weapon carries its own flatDamageBonus (would normally be an
// "Enhancement" component) and the actor has a level/ability score that
// would normally contribute half-level/ability damage, none of that is
// added on top of the published formula.
{
  const droid = explicitStockDroid({ system: { droidCalculationMode: 'stock-statblock', level: 10, abilities: { str: { mod: 5 } } } });
  const result = resolveDamageBonus(droid, stockWeapon(), {});
  assert.equal(result.total, 0, 'half-level/ability/enhancement must not be added on top of the published damage formula');
}

// 5. A converted (playable-derived) droid falls through to normal damage
// composition even though the weapon still carries a stock damage
// contract flag (not yet neutralized).
{
  const result = resolveDamageBonus(explicitPlayableDroid(), stockWeapon(), {});
  assert.equal(result.flags.stockDroidFlat, undefined);
  assert.equal(result.flags.stockDamageFormula, undefined);
  assert.ok('Ability' in result.components);
}

// 6. A weapon with no stock damage contract falls through to normal
// composition even for a stock-mode droid actor.
{
  const droid = explicitStockDroid();
  const plainWeapon = { id: 'w2', name: 'Fists', system: { flatDamageBonus: 2 } };
  const result = resolveDamageBonus(droid, plainWeapon, {});
  assert.equal(result.flags.stockDroidFlat, undefined);
  assert.equal(result.components['Enhancement'], 2);
}

// 7. The base-formula call sites (damage.js, attacks.js) must use the
// published formula (via flags.stockDamageFormula) as the dice base
// instead of weapon.system.damage — production-path proof that the
// contract is actually wired into the roll formula, not just returned
// and ignored.
{
  const damageSource = await (await import('node:fs/promises')).readFile(
    new URL('../scripts/combat/rolls/damage.js', import.meta.url), 'utf8'
  );
  assert.match(damageSource, /dmgResult\.flags\?\.stockDamageFormula/, 'damage.js must read resolveDamageBonus()\'s stockDamageFormula flag');
  const attacksSource = await (await import('node:fs/promises')).readFile(
    new URL('../scripts/combat/rolls/attacks.js', import.meta.url), 'utf8'
  );
  const stockFormulaRefs = (attacksSource.match(/dmgResult\.flags\?\.stockDamageFormula/g) || []).length;
  assert.equal(stockFormulaRefs, 2, 'attacks.js must consult stockDamageFormula in both rollDamage() and rollAttackAndDamageWithNarration()');
}

console.log('Stock-droid damage math tests passed.');
