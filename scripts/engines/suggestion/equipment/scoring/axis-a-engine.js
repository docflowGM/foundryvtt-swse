/**
 * Axis A Engine: Damage-on-Hit Scoring
 *
 * Computes raw average dice damage from weapon damage formula.
 * This represents the impact potential of a weapon, NOT throughput.
 *
 * Does NOT consider:
 * - Rate of fire
 * - Critical multipliers
 * - Feats or talents
 * - Character bonuses (except raw damage dice)
 *
 * Formula: Average of NdX = N * (X+1) / 2
 * Examples:
 *   1d4 = 2.5
 *   2d6 = 7
 *   3d8 = 13.5
 *   3d10 = 16.5
 */

export class AxisAEngine {
  /**
   * Compute Axis A (Damage-on-Hit) score
   * @param {Object} weapon - The weapon item
   * @returns {Object} Axis A score breakdown
   */
  static computeDamageAxis(weapon) {
    const damageFormula = weapon.system?.damage || '';
    const damageType = weapon.system?.damageType || 'unknown';

    // Parse and compute average damage from dice formula
    const averageDamage = this._parseAverageDamage(damageFormula);

    // Normalize to 0-1 band based on weapon type context
    const { normalizedScore, band } = this._normalizeDamageScore(
      averageDamage,
      weapon.system?.group || 'unknown'
    );

    return {
      // Raw computation
      damageFormula,
      averageDamage,
      damageType,

      // Normalized to 0-1 for comparison
      normalizedScore,
      band, // 'low', 'medium', 'high', 'extreme'

      // Supporting data
      diceBreakdown: this._breakdownDice(damageFormula),
      weaponGroup: weapon.system?.group || 'unknown',

      // Confidence in this score
      confidence: this._confidenceInDamageScore(damageFormula, weapon)
    };
  }

  /**
   * Parse damage formula and compute average damage
   * Handles: "XdY", "XdY+Z", "XdY-Z", etc.
   * @private
   */
  static _parseAverageDamage(damageFormula) {
    if (!damageFormula || typeof damageFormula !== 'string') {
      return 0;
    }

    // Match pattern: XdY[±Z]
    const match = damageFormula.match(/(\d+)d(\d+)([+-]?\d+)?/i);
    if (!match) {
      return 0;
    }

    const numDice = parseInt(match[1], 10);
    const diceSize = parseInt(match[2], 10);
    const modifier = match[3] ? parseInt(match[3], 10) : 0;

    // Average of XdY = X * (Y+1) / 2
    const average = (numDice * (diceSize + 1)) / 2;

    return average + modifier;
  }

  /**
   * Break down dice formula into components
   * @private
   */
  static _breakdownDice(damageFormula) {
    if (!damageFormula || typeof damageFormula !== 'string') {
      return { numDice: 0, diceSize: 0, modifier: 0 };
    }

    const match = damageFormula.match(/(\d+)d(\d+)([+-]?\d+)?/i);
    if (!match) {
      return { numDice: 0, diceSize: 0, modifier: 0 };
    }

    return {
      numDice: parseInt(match[1], 10),
      diceSize: parseInt(match[2], 10),
      modifier: match[3] ? parseInt(match[3], 10) : 0
    };
  }

  /**
   * Normalize damage to 0-1 score based on weapon group context
   * Different weapon groups have different damage expectations
   * @private
   */
  static _normalizeDamageScore(averageDamage, weaponGroup) {
    // Define damage bands by weapon group
    const bands = {
      'simple-melee': { low: 5, medium: 8, high: 12 },
      'simple-ranged': { low: 4, medium: 7, high: 10 },
      'advanced-melee': { low: 8, medium: 12, high: 16 },
      'advanced-ranged': { low: 7, medium: 11, high: 15 },
      'exotic': { low: 10, medium: 15, high: 20 },
      'grenades': { low: 8, medium: 12, high: 18 },
      'default': { low: 6, medium: 10, high: 14 }
    };

    const bandThresholds = bands[weaponGroup] || bands.default;

    // Classify into band
    let band, score;
    if (averageDamage <= bandThresholds.low) {
      band = 'low';
      score = Math.min(1.0, averageDamage / bandThresholds.low * 0.33);
    } else if (averageDamage <= bandThresholds.medium) {
      band = 'medium';
      score =
        0.33 +
        ((averageDamage - bandThresholds.low) /
          (bandThresholds.medium - bandThresholds.low)) *
          0.33;
    } else if (averageDamage <= bandThresholds.high) {
      band = 'high';
      score =
        0.66 +
        ((averageDamage - bandThresholds.medium) /
          (bandThresholds.high - bandThresholds.medium)) *
          0.27;
    } else {
      band = 'extreme';
      score = Math.min(1.0, 0.93 + (averageDamage - bandThresholds.high) / 20 * 0.07);
    }

    return { normalizedScore: score, band };
  }

  /**
   * Assess confidence in damage score
   * Higher confidence when damage formula is clear and explicit
   * @private
   */
  static _confidenceInDamageScore(damageFormula, weapon) {
    let confidence = 0.8; // Base confidence

    // Reduce confidence if formula is unclear
    if (!damageFormula || damageFormula.trim() === '') {
      return 0.2;
    }

    // Increase confidence for clear, standard formulas
    if (/^\d+d\d+([+-]\d+)?$/.test(damageFormula)) {
      confidence = 0.95;
    }

    // Reduce confidence for complex formulas (may include feats/talents)
    if (damageFormula.includes('(') || damageFormula.includes('if')) {
      confidence = 0.6;
    }

    return confidence;
  }

  /**
   * Get a human-friendly description of damage
   */
  static describeDamage(averageDamage, band) {
    const descriptions = {
      low: `Low damage (${averageDamage.toFixed(1)} avg)`,
      medium: `Moderate damage (${averageDamage.toFixed(1)} avg)`,
      high: `High damage (${averageDamage.toFixed(1)} avg)`,
      extreme: `Extreme damage (${averageDamage.toFixed(1)} avg)`
    };

    return descriptions[band] || `${averageDamage.toFixed(1)} average damage`;
  }
}

export default AxisAEngine;
