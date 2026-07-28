/**
 * Stock-Droid Damage Formula Builder — pure, dependency-free construction of
 * the final damage-roll formula for a stock-statblock droid's published-
 * statblock damage formula (see resolveStockDroidDamageContract() in
 * combat-roll-math.js for where that formula is read off the actor/weapon).
 *
 * R4-4 — the published formula correctly REPLACES normal half-level/
 * ability/enhancement composition (see resolveStockDroidDamageContract() in
 * combat-roll-math.js), but a prior pass of that fix went too far: it also
 * discarded every DIE-BASED situational modifier (Rapid Shot/Rapid Strike's
 * damageDieStepBonus, Deadeye/Burst Fire/Mighty Swing's
 * damageExtraWeaponDice, and critical-hit damageDieStepBonus), so a stock
 * droid using those combat options paid their attack penalty/ammunition
 * cost with none of their damage benefit. Those modifiers must still act on
 * the published formula's DICE portion, exactly as they act on an ordinary
 * weapon's system.damage — only half-level/ability/enhancement (never
 * die-based) are what the published total already bakes in.
 *
 * Centralized here (rather than duplicated per roll call site) so
 * damage.js, attacks.js's rollDamage(), and attacks.js's
 * rollAttackAndDamageWithNarration() cannot drift apart on how a stock
 * droid's published formula combines with die-based combat options —
 * resolveStockDroidDamageContract() calls this once and every call site
 * consumes the already-correct result via flags.stockDamageFormula.
 *
 * Die-stepping ladder and the "step size, then add extra dice at the
 * stepped size" order are copied from attacks.js's own
 * stepDamageDieFormula()/buildExtraWeaponDiceFormula() (the ordinary-weapon
 * implementation) specifically so a stock droid and a normal weapon step
 * dice identically — not a parallel, potentially-diverging reimplementation.
 */

const DAMAGE_DIE_LADDER = Object.freeze([2, 3, 4, 6, 8, 10, 12]);

/**
 * Parse a dice+flat-modifier damage formula (e.g. "2d6+3", "3d8-1", "1d4")
 * into its structural parts. Pure. Returns null if no dice expression is
 * found at all (a malformed or purely-flat published formula).
 *
 * @param {string} formula
 * @returns {{diceCount: number, sides: number, flatModifier: number}|null}
 */
export function parseDamageFormula(formula) {
  const text = String(formula ?? '').trim();
  const diceMatch = text.match(/(\d*)d(\d+)/i);
  if (!diceMatch) return null;
  const diceCount = Number(diceMatch[1]) || 1;
  const sides = Number(diceMatch[2]);
  if (!Number.isFinite(sides) || sides <= 0) return null;

  let flatModifier = 0;
  const remainder = text.slice(diceMatch.index + diceMatch[0].length);
  const flatMatch = remainder.match(/^\s*([+-])\s*(\d+)/);
  if (flatMatch) {
    flatModifier = Number(flatMatch[2]) * (flatMatch[1] === '-' ? -1 : 1);
  }

  return { diceCount, sides, flatModifier };
}

/**
 * Step a die's side count up (or down) the standard SWSE damage-die
 * ladder (d2/d3/d4/d6/d8/d10/d12), clamped to the ladder's ends. Pure.
 * Mirrors attacks.js's stepDamageDieFormula()'s per-die substitution exactly.
 *
 * @param {number} sides
 * @param {number} steps
 * @returns {number}
 */
export function stepDieSides(sides, steps = 0) {
  const count = Number(steps) || 0;
  if (count === 0) return sides;
  const index = DAMAGE_DIE_LADDER.indexOf(Number(sides));
  if (index < 0) return sides;
  const nextIndex = Math.max(0, Math.min(DAMAGE_DIE_LADDER.length - 1, index + count));
  return DAMAGE_DIE_LADDER[nextIndex];
}

/**
 * Build the final damage formula for a stock-statblock droid weapon,
 * applying die-based situational modifiers to the published formula's DICE
 * portion while preserving its flat modifier untouched. Pure.
 *
 * Example: a published "2d6+3" baseline with dieStepIncreases: 1 becomes
 * "2d8+3" (die SIZE stepped, dice COUNT unchanged); with extraWeaponDice: 1
 * on top of that becomes "2d8+1d8+3" (one extra die at the already-stepped
 * size, matching buildExtraWeaponDiceFormula()'s "die size after stepping"
 * behavior) — never "3d6+3" (wrong: steps count instead of size) and never
 * "2d6+3+2d6" (wrong: ignores the step, adds dice at the original size).
 *
 * @param {string} publishedFormula
 * @param {{dieStepIncreases?: number, extraWeaponDice?: number}} [modifiers]
 * @returns {string} the adjusted formula, or the original string unchanged
 *   if it has no parseable dice expression to adjust.
 */
export function buildStockDroidDamageFormula(publishedFormula, { dieStepIncreases = 0, extraWeaponDice = 0 } = {}) {
  const parsed = parseDamageFormula(publishedFormula);
  if (!parsed) return String(publishedFormula ?? '');

  const steppedSides = stepDieSides(parsed.sides, dieStepIncreases);
  const extraCount = Number(extraWeaponDice) || 0;

  let formula = `${parsed.diceCount}d${steppedSides}`;
  if (extraCount > 0) {
    formula += ` + ${extraCount}d${steppedSides}`;
  }
  if (parsed.flatModifier > 0) {
    formula += ` + ${parsed.flatModifier}`;
  } else if (parsed.flatModifier < 0) {
    formula += ` - ${Math.abs(parsed.flatModifier)}`;
  }

  return formula;
}
