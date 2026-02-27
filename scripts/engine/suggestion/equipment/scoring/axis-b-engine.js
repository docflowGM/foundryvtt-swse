/**
 * Axis B Engine: Hit-Likelihood Bias Scoring
 *
 * Models contextual factors affecting hit probability WITHOUT dice rolling.
 * Uses weighted biasing to favor weapons that fit character attributes.
 *
 * Factors:
 * - Attacking attribute (STR vs DEX)
 * - Accuracy traits (accurate, inaccurate, autofire)
 * - Range profile interaction
 * - Proficiency alignment (soft penalty, not exclusion)
 *
 * Output: 0-1 bias factor where:
 *   > 1.0 = favorable for this character
 *   1.0 = neutral
 *   < 1.0 = unfavorable (but still available)
 */

export class AxisBEngine {
  /**
   * Compute Axis B (Hit-Likelihood Bias) score
   * @param {Object} weapon - The weapon item
   * @param {Object} charContext - Character context from WeaponScoringEngine
   * @returns {Object} Axis B score breakdown
   */
  static computeHitLikelihoodAxis(weapon, charContext) {
    const attributes = charContext.attributes || {};
    const proficiencies = charContext.proficiencies || {};

    // Base factor starts at 1.0 (neutral)
    let factor = 1.0;

    // Apply attribute matching (largest influence)
    const attributeFactor = this._computeAttributeFactor(
      weapon.system?.attackAttribute,
      attributes
    );
    factor *= attributeFactor;

    // Apply accuracy trait modifier
    const accuracyFactor = this._computeAccuracyFactor(
      weapon.system?.accuracy,
      weapon.system?.attackAttribute
    );
    factor *= accuracyFactor;

    // Apply range profile interaction
    const rangeFactor = this._computeRangeFactor(
      weapon.system?.range,
      weapon.system?.group,
      charContext.playstyleHints
    );
    factor *= rangeFactor;

    // Apply proficiency soft penalty (if applicable)
    const proficiencyFactor = this._computeProficiencyFactor(
      weapon.system?.group,
      proficiencies
    );
    factor *= proficiencyFactor;

    // Apply armor interference (if character is heavily armored)
    const armorFactor = this._computeArmorFactor(
      weapon.system?.attackAttribute,
      charContext.armorCategory,
      weapon.system?.group
    );
    factor *= armorFactor;

    // Normalize to 0-1 range
    const normalizedScore = Math.min(1.0, Math.max(0.1, factor / 1.5));

    // Determine bias direction
    const biasDirection = factor > 1.1 ? 'favorable' : factor < 0.9 ? 'unfavorable' : 'neutral';

    return {
      // Base computation
      rawFactor: factor,
      normalizedScore,
      biasDirection,

      // Component factors (for explanation)
      components: {
        attributeFactor,
        accuracyFactor,
        rangeFactor,
        proficiencyFactor,
        armorFactor
      },

      // Weapon properties
      attackAttribute: weapon.system?.attackAttribute || 'str',
      accuracy: weapon.system?.accuracy || 'standard',
      range: weapon.system?.range || 'melee',
      weaponGroup: weapon.system?.group || 'unknown',

      // Character context
      charStrengthMod: attributes.str || 0,
      charDexMod: attributes.dex || 0,
      armorCategory: charContext.armorCategory || 'none',
      playstyle: charContext.playstyleHints || [],

      // Confidence
      confidence: this._confidenceInBiasMeasurement(weapon, charContext)
    };
  }

  /**
   * Compute attribute matching factor
   * Weapons are better matched when they use the character's stronger attribute
   * @private
   */
  static _computeAttributeFactor(weaponAttribute, charAttributes) {
    const attr = weaponAttribute || 'str';
    const charStr = charAttributes.str || 0;
    const charDex = charAttributes.dex || 0;

    if (attr === 'str') {
      // STR weapon
      if (charStr >= charDex + 2) {
        return 1.3; // Strong STR advantage
      } else if (charStr >= charDex) {
        return 1.1; // Moderate STR advantage
      } else if (charStr >= charDex - 1) {
        return 1.0; // Roughly equal
      } else {
        return 0.8; // Weak STR, prefer DEX
      }
    } else if (attr === 'dex') {
      // DEX weapon
      if (charDex >= charStr + 2) {
        return 1.3; // Strong DEX advantage
      } else if (charDex >= charStr) {
        return 1.1; // Moderate DEX advantage
      } else if (charDex >= charStr - 1) {
        return 1.0; // Roughly equal
      } else {
        return 0.8; // Weak DEX, prefer STR
      }
    } else if (attr === 'both' || attr === 'finesse') {
      // Uses better attribute
      const better = Math.max(charStr, charDex);
      const worse = Math.min(charStr, charDex);

      if (better >= worse + 2) {
        return 1.2; // Good flexibility
      } else {
        return 1.1; // Can use either
      }
    }

    return 1.0; // Unknown attribute, neutral
  }

  /**
   * Compute accuracy trait modifier
   * - accurate: improved hit chance
   * - inaccurate: reduced hit chance
   * - autofire: special handling (likely less accurate but higher potential)
   * @private
   */
  static _computeAccuracyFactor(accuracyTrait, attackAttribute) {
    const trait = (accuracyTrait || '').toLowerCase();

    if (trait.includes('accurate')) {
      return 1.2; // +20% bias for accuracy
    }

    if (trait.includes('inaccurate')) {
      return 0.85; // -15% bias for inaccuracy
    }

    if (trait.includes('autofire') || trait.includes('rapid')) {
      // Autofire has higher volume but potentially lower hit chance per shot
      return 0.95; // Slight penalty
    }

    if (trait.includes('burst') || trait.includes('semi')) {
      return 1.0; // Neutral
    }

    return 1.0; // Default: neutral
  }

  /**
   * Compute range profile interaction
   * Characters with high DEX/mobility prefer ranged weapons
   * Characters with high STR/stationary prefer melee
   * @private
   */
  static _computeRangeFactor(rangeProfile, weaponGroup, playstyleHints) {
    const range = (rangeProfile || 'melee').toLowerCase();
    const hints = playstyleHints || [];

    // Melee weapons
    if (range === 'melee' || range === 'close') {
      if (hints.includes('melee-preferred')) {
        return 1.15; // Good fit for melee playstyle
      }
      if (hints.includes('mobile')) {
        return 0.9; // Mobile characters less suited to melee
      }
      return 1.0; // Neutral
    }

    // Ranged weapons
    if (range === 'ranged' || range === 'medium' || range === 'long') {
      if (hints.includes('ranged-preferred')) {
        return 1.15; // Good fit for ranged playstyle
      }
      if (hints.includes('stationary')) {
        return 0.95; // Stationary characters slightly less suited (but still viable)
      }
      return 1.0; // Neutral
    }

    return 1.0; // Unknown range
  }

  /**
   * Compute proficiency soft penalty
   * Missing proficiencies reduce bias but do NOT exclude the weapon
   * @private
   */
  static _computeProficiencyFactor(weaponGroup, proficiencies) {
    const group = (weaponGroup || '').toLowerCase();

    // Simple weapons: most characters proficient
    if (group.includes('simple')) {
      return proficiencies.simple ? 1.0 : 0.85; // Mild penalty if not proficient
    }

    // Advanced weapons: require advanced proficiency
    if (group.includes('advanced') || group.includes('rifle') || group.includes('heavy')) {
      return proficiencies.advanced ? 1.0 : 0.8; // Moderate penalty if not proficient
    }

    // Exotic weapons: significant penalty if not proficient, but not excluded
    if (group.includes('exotic') || group.includes('rare')) {
      return proficiencies.advanced ? 1.0 : 0.7; // Larger penalty
    }

    // Armor proficiency affects melee weapons
    if (group.includes('melee') || group.includes('lightsaber')) {
      return proficiencies.armor ? 1.0 : 0.9; // Small penalty
    }

    return 1.0; // Unknown group, neutral
  }

  /**
   * Compute armor interference factor
   * Heavy armor slightly impairs DEX-based attacks and mobility weapons
   * @private
   */
  static _computeArmorFactor(attackAttribute, armorCategory, weaponGroup) {
    if (!armorCategory || armorCategory === 'none') {
      return 1.0; // No armor, no interference
    }

    const attr = (attackAttribute || 'str').toLowerCase();
    const armor = (armorCategory || '').toLowerCase();
    const group = (weaponGroup || '').toLowerCase();

    // Heavy armor reduces DEX-based attacks
    if (armor === 'heavy') {
      if (attr === 'dex') {
        return 0.95; // Small penalty for DEX-based in heavy armor
      }
      if (group.includes('finesse') || group.includes('ranged')) {
        return 0.97; // Minor penalty for ranged in heavy armor
      }
    }

    // Medium armor has mild effect
    if (armor === 'medium') {
      if (attr === 'dex') {
        return 0.98; // Very small penalty
      }
    }

    return 1.0; // Light armor or no interference
  }

  /**
   * Assess confidence in bias measurement
   * @private
   */
  static _confidenceInBiasMeasurement(weapon, charContext) {
    let confidence = 0.8;

    // High confidence if character attributes are clear
    const str = charContext.attributes?.str ?? 0;
    const dex = charContext.attributes?.dex ?? 0;
    if (Math.abs(str - dex) >= 2) {
      confidence = 0.9; // Clear attribute differentiation
    }

    // Reduce confidence if weapon properties are unclear
    if (!weapon.system?.attackAttribute) {
      confidence *= 0.8;
    }

    // Reduce confidence if playstyle is unclear
    if (!charContext.playstyleHints || charContext.playstyleHints.length === 0) {
      confidence *= 0.9;
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Get human-friendly description of bias
   */
  static describeBias(biasDirection, rawFactor) {
    if (biasDirection === 'favorable') {
      return `Favorable to your build (${(rawFactor * 100).toFixed(0)}%)`;
    } else if (biasDirection === 'unfavorable') {
      return `Less optimal for your build (${(rawFactor * 100).toFixed(0)}%)`;
    } else {
      return `Neutral for your build`;
    }
  }
}

export default AxisBEngine;
