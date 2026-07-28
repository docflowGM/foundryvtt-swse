import assert from 'node:assert/strict';

// R4-4 — scripts/domain/droids/stock-droid-damage-formula.js: pure
// die-based damage-formula construction extracted so a stock droid's
// published damage formula combines correctly with die-based combat
// options (Rapid Shot/Rapid Strike's die-step, Deadeye/Burst Fire/Mighty
// Swing's extra weapon dice) instead of dropping them entirely.
//
// Coverage tier: (a) direct production-path — zero Foundry dependency,
// loaded and executed for real.

const { parseDamageFormula, stepDieSides, buildStockDroidDamageFormula } = await import('../scripts/domain/droids/stock-droid-damage-formula.js');

// --- parseDamageFormula ---

{
  assert.deepEqual(parseDamageFormula('2d6+3'), { diceCount: 2, sides: 6, flatModifier: 3 });
  assert.deepEqual(parseDamageFormula('3d8-1'), { diceCount: 3, sides: 8, flatModifier: -1 });
  assert.deepEqual(parseDamageFormula('1d4'), { diceCount: 1, sides: 4, flatModifier: 0 });
  assert.deepEqual(parseDamageFormula('d6'), { diceCount: 1, sides: 6, flatModifier: 0 });
}

{
  // No dice expression at all -> null.
  assert.equal(parseDamageFormula('5'), null);
  assert.equal(parseDamageFormula(''), null);
  assert.equal(parseDamageFormula(null), null);
}

// --- stepDieSides ---

{
  assert.equal(stepDieSides(6, 0), 6, 'zero steps must not change the die');
  assert.equal(stepDieSides(6, 1), 8, 'one step up the ladder: d6 -> d8');
  assert.equal(stepDieSides(6, 2), 10, 'two steps up: d6 -> d10');
  assert.equal(stepDieSides(12, 5), 12, 'clamped at the top of the ladder');
  assert.equal(stepDieSides(2, -5), 2, 'clamped at the bottom of the ladder');
  assert.equal(stepDieSides(6, -1), 4, 'stepping down: d6 -> d4');
  assert.equal(stepDieSides(20, 1), 20, 'a die not on the ladder is returned unchanged');
}

// --- buildStockDroidDamageFormula ---

// 1. No modifiers at all -> canonical re-rendering of the same dice/flat.
{
  assert.equal(buildStockDroidDamageFormula('2d6+3', {}), '2d6 + 3');
}

// 2. Die-step increase steps the SIZE, not the dice COUNT — the exact
// defect named in the review ("should become the equivalent of 3d6+3, not
// 4d6+6 and not 2d6+3+2d6" — the die-size-stepped analogue of that example
// is 2d8+3, not 3d6+3).
{
  assert.equal(buildStockDroidDamageFormula('2d6+3', { dieStepIncreases: 1 }), '2d8 + 3');
}

// 3. Extra weapon dice add a die at the (already-stepped) size, never at
// the original size.
{
  assert.equal(buildStockDroidDamageFormula('2d6+3', { extraWeaponDice: 1 }), '2d6 + 1d6 + 3');
  assert.equal(buildStockDroidDamageFormula('2d6+3', { dieStepIncreases: 1, extraWeaponDice: 1 }), '2d8 + 1d8 + 3');
}

// 4. Multiple extra dice.
{
  assert.equal(buildStockDroidDamageFormula('1d8+2', { extraWeaponDice: 2 }), '1d8 + 2d8 + 2');
}

// 5. Negative flat modifier preserved with a minus sign, not "+ -1".
{
  assert.equal(buildStockDroidDamageFormula('3d8-1', { dieStepIncreases: 1 }), '3d10 - 1');
}

// 6. Zero flat modifier is omitted entirely.
{
  assert.equal(buildStockDroidDamageFormula('1d4', { dieStepIncreases: 1 }), '1d6');
}

// 7. An unparseable published formula is returned unchanged rather than
// throwing.
{
  assert.equal(buildStockDroidDamageFormula('special', { dieStepIncreases: 1 }), 'special');
}

// 8. Pure — repeated calls with the same input produce the same output.
{
  const a = buildStockDroidDamageFormula('2d6+3', { dieStepIncreases: 1, extraWeaponDice: 1 });
  const b = buildStockDroidDamageFormula('2d6+3', { dieStepIncreases: 1, extraWeaponDice: 1 });
  assert.equal(a, b);
}

console.log('stock-droid-damage-formula.js production-path tests passed.');
