/**
 * Armor Axis A Engine - Survivability Gain
 *
 * Evaluates how much survivability an armor piece adds relative to character level.
 *
 * Core Insight:
 * Armor bonus provides FIXED soak, but Heroic Level grows with character level.
 * At low levels: armor bonus is significant relative to Heroic Level
 * At high levels: armor bonus matters less without talent support
 *
 * Talents change the evaluation:
 * - Armored Defense: Removes level-scaling penalty (no longer "falls behind")
 * - Improved Armored Defense: Armor scales positively with level
 * - (Armor Mastery affects Axis B, not Axis A)
 *
 * Scoring:
 * 1. Compute armor bonus relative to Heroic Level
 * 2. Assign band (low/medium_low/medium/medium_high/high)
 * 3. Apply talent modifiers
 * 4. Normalize to 0-16 (same scale as weapon Axis A)
 */

export class ArmorAxisAEngine {
  /**
   * Compute survivability axis for armor
   * @param {Object} armor - The armor item
   * @param {Object} charContext - Character context with level, talents, etc.
   * @returns {Object} Axis A result with score, band, withTalents, details
   */
  static computeSurvivabilityAxis(armor, charContext) {
    const armorBonus = armor.system?.soak || 0;
    const charLevel = charContext.level || 1;
    const heroicLevel = charLevel; // Heroic Level bonus is implicit at character level

    // Baseline: how much soak relative to Heroic Level?
    const relativeSoak = armorBonus / (heroicLevel + 2); // +2 avoid division by zero at level 1

    // Assign band based on relative value
    const band = this._assignBand(relativeSoak, armorBonus, heroicLevel);

    // Base score from band
    let score = this._getBandScore(band);

    // Apply talent modifiers
    const talentModifier = this._applyTalentModifiers(
      band,
      armorBonus,
      heroicLevel,
      charContext.talents
    );

    score += talentModifier;

    // Clamp to 0-16 (matching weapon Axis A range)
    score = Math.max(0, Math.min(16, score));

    return {
      score,
      band,
      relativeSoak,
      armorBonus,
      heroicLevel,
      withTalents: {
        armoredDefense: charContext.talents?.armoredDefense ?? false,
        improvedArmoredDefense: charContext.talents?.improvedArmoredDefense ?? false
      },
      details: {
        explanation: this._generateExplanation(band, charContext.talents)
      }
    };
  }

  /**
   * Assign band based on relative soak and character level
   * @private
   */
  static _assignBand(relativeSoak, armorBonus, heroicLevel) {
    // Bands reflect how "relevant" the armor bonus is at this level
    // Low: bonus is small relative to level (usually high level)
    // Medium: bonus is moderate relative to level
    // High: bonus is large relative to level (usually low level)

    if (armorBonus === 0) {
      return 'none';
    }

    if (relativeSoak >= 0.5) {
      return 'high'; // Strong bonus at this level
    } else if (relativeSoak >= 0.3) {
      return 'medium_high';
    } else if (relativeSoak >= 0.15) {
      return 'medium';
    } else if (relativeSoak >= 0.08) {
      return 'medium_low';
    } else {
      return 'low'; // Weak bonus relative to level
    }
  }

  /**
   * Get base score for band
   * Mirrors weapon Axis A band scoring
   * @private
   */
  static _getBandScore(band) {
    const scores = {
      none: 0,
      low: 2,
      medium_low: 5,
      medium: 8,
      medium_high: 11,
      high: 14
    };
    return scores[band] || 0;
  }

  /**
   * Apply talent modifiers to base score
   * @private
   */
  static _applyTalentModifiers(band, armorBonus, heroicLevel, talents = {}) {
    let modifier = 0;

    // Without any talents, armor bonus loses relevance at high levels
    // (already reflected in band assignment, so no additional penalty here)

    // Armored Defense: removes the "falls behind" problem
    if (talents.armoredDefense) {
      // Shift band up by one if currently low/medium_low
      if (band === 'low') {
        modifier += 3; // low → medium_low equivalent
      } else if (band === 'medium_low') {
        modifier += 2; // medium_low → medium equivalent
      }
    }

    // Improved Armored Defense: armor scales with level
    if (talents.improvedArmoredDefense) {
      // Strongest modifier: allows even high-level characters to benefit
      if (band === 'low' || band === 'medium_low') {
        modifier += 4; // Boost significantly for late-level scaling
      } else if (band === 'medium') {
        modifier += 2;
      }
    }

    return modifier;
  }

  /**
   * Generate human explanation for Axis A
   * @private
   */
  static _generateExplanation(band, talents = {}) {
    if (band === 'none') {
      return 'No armor soak';
    }

    let baseText = '';
    switch (band) {
      case 'high':
        baseText = 'Strong protection';
        break;
      case 'medium_high':
        baseText = 'Good protection';
        break;
      case 'medium':
        baseText = 'Moderate protection';
        break;
      case 'medium_low':
        baseText = 'Light protection';
        break;
      case 'low':
        baseText = 'Minimal protection';
        break;
    }

    // Add talent context
    if (talents.improvedArmoredDefense) {
      return `${baseText} (scales well with level)`;
    } else if (talents.armoredDefense) {
      return `${baseText} (maintains value as you level)`;
    } else if (band === 'low' || band === 'medium_low') {
      return `${baseText} (diminishes as you level without talents)`;
    }

    return baseText;
  }
}

export default ArmorAxisAEngine;
