/**
 * Explainability Generator
 *
 * Generates 2-4 human-readable explanations for every weapon suggestion.
 * Explanations are tied directly to:
 *   - Character attributes and build
 *   - Weapon metadata
 *   - Scoring decisions
 *
 * Goal: Player understands WHY a weapon is suggested
 */

export class ExplainabilityGenerator {
  /**
   * Generate explanation array for a weapon
   * @param {Object} weapon - The weapon item
   * @param {Object} charContext - Character context
   * @param {Object} axisA - Damage score breakdown
   * @param {Object} axisB - Hit-likelihood score breakdown
   * @param {Object} combined - Combined score breakdown
   * @param {Object} options - Generation options
   * @returns {Array} Array of 2-4 explanation strings
   */
  static generateExplanations(
    weapon,
    charContext,
    axisA,
    axisB,
    combined,
    options = {}
  ) {
    const explanations = [];

    // PRIMARY EXPLANATION: Axis A
    const damageExplanation = this._explainDamageScore(weapon, axisA, charContext);
    if (damageExplanation) {
      explanations.push(damageExplanation);
    }

    // SECONDARY EXPLANATION: Axis B
    const hitExplanation = this._explainHitLikelihoodScore(weapon, axisB, charContext);
    if (hitExplanation) {
      explanations.push(hitExplanation);
    }

    // TERTIARY EXPLANATION: Attribute match or mismatch
    const attributeExplanation = this._explainAttributeAlignment(weapon, charContext, axisB);
    if (attributeExplanation) {
      explanations.push(attributeExplanation);
    }

    // QUATERNARY EXPLANATION: Proficiency or context
    const contextExplanation = this._explainContextFactors(weapon, charContext, axisB, combined);
    if (contextExplanation) {
      explanations.push(contextExplanation);
    }

    // If we have fewer than 2 explanations, something is wrong
    if (explanations.length === 0) {
      explanations.push('This weapon is available for your character');
    }

    // Cap at 4 explanations for clarity
    return explanations.slice(0, 4);
  }

  /**
   * Explain the Axis A (damage) score
   * @private
   */
  static _explainDamageScore(weapon, axisA, charContext) {
    const { averageDamage, band, damageFormula } = axisA;

    if (band === 'extreme') {
      return `Exceptional damage potential (${averageDamage.toFixed(1)} avg)—this is a top-tier impact weapon`;
    }

    if (band === 'high') {
      return `High damage output (${averageDamage.toFixed(1)} avg per hit)—strong finishing power`;
    }

    if (band === 'medium_high') {
      return `Good damage (${averageDamage.toFixed(1)} avg per hit)—reliable impact`;
    }

    if (band === 'medium') {
      return `Solid damage (${averageDamage.toFixed(1)} avg per hit)—standard effectiveness`;
    }

    if (band === 'medium_low') {
      return `Moderate damage (${averageDamage.toFixed(1)} avg)—effective for skirmishing`;
    }

    if (band === 'low') {
      return `Light damage (${averageDamage.toFixed(1)} avg)—best as a secondary or finishing weapon`;
    }

    return null;
  }

  /**
   * Explain the Axis B (hit likelihood) score
   * @private
   */
  static _explainHitLikelihoodScore(weapon, axisB, charContext) {
    const { biasDirection, components } = axisB;
    const attr = weapon.system?.attackAttribute || 'str';
    const accuracy = weapon.system?.accuracy || 'standard';

    // Build explanation from components
    const reasons = [];

    // Attribute match
    if (components.attributeFactor > 1.15) {
      const attrName = attr === 'str' ? 'Strength' : 'Dexterity';
      reasons.push(`Aligns with your strong ${attrName} focus`);
    } else if (components.attributeFactor > 0.95) {
      const attrName = attr === 'str' ? 'Strength' : 'Dexterity';
      reasons.push(`Compatible with your ${attrName} modifier`);
    } else if (components.attributeFactor < 0.85) {
      const attrName = attr === 'str' ? 'Strength' : 'Dexterity';
      reasons.push(`Poor fit with your attribute profile (needs ${attrName})`);
    }

    // Accuracy trait
    if (accuracy.includes('accurate')) {
      reasons.push('Accurate—improves your hit consistency');
    } else if (accuracy.includes('inaccurate')) {
      reasons.push('Less reliable—you'll miss more often');
    } else if (accuracy.includes('autofire')) {
      reasons.push('Autofire—trades accuracy for volume');
    }

    // Range interaction (from playstyle)
    if (charContext.playstyleHints?.includes('mobile')) {
      if (components.rangeFactor > 1.1) {
        reasons.push('Supports your mobile tactics');
      } else if (components.rangeFactor < 0.9) {
        reasons.push('Conflicts with your mobility focus');
      }
    } else if (charContext.playstyleHints?.includes('stationary')) {
      if (components.rangeFactor > 1.1) {
        reasons.push('Matches your stationary stance');
      }
    }

    if (reasons.length > 0) {
      return reasons.join('; ');
    }

    return null;
  }

  /**
   * Explain attribute alignment
   * @private
   */
  static _explainAttributeAlignment(weapon, charContext, axisB) {
    const attr = (weapon.system?.attackAttribute || 'str').toLowerCase();
    const strMod = charContext.attributes?.str || 0;
    const dexMod = charContext.attributes?.dex || 0;

    if (attr === 'str') {
      if (strMod > dexMod) {
        return `Aligns with your Strength focus (STR +${strMod})`;
      } else if (strMod < dexMod) {
        return `Uses Strength (+${strMod}), but you favor Dexterity (+${dexMod})`;
      }
    } else if (attr === 'dex') {
      if (dexMod > strMod) {
        return `Aligns with your Dexterity focus (DEX +${dexMod})`;
      } else if (dexMod < strMod) {
        return `Uses Dexterity (+${dexMod}), but you favor Strength (+${strMod})`;
      }
    }

    return null;
  }

  /**
   * Explain proficiency, armor, or other context factors
   * @private
   */
  static _explainContextFactors(weapon, charContext, axisB, combined) {
    const reasons = [];

    // Proficiency (check for issues first)
    const group = (weapon.system?.group || '').toLowerCase();
    const { proficiencies } = charContext;

    if (group.includes('advanced') && !proficiencies.advanced) {
      reasons.push('⚠ Advanced weapon—you lack proficiency (apply attack penalty)');
    } else if (group.includes('exotic') && !proficiencies.advanced) {
      reasons.push('⚠ Exotic weapon—requires specialized training you don\'t have');
    } else if (group.includes('simple') && proficiencies.simple) {
      reasons.push('You are proficient with simple weapons');
    }

    // Armor interference
    if (charContext.armorCategory === 'heavy' && axisB.components?.armorFactor < 1.0) {
      const penalty = Math.round((1.0 - (axisB.components?.armorFactor || 1.0)) * 100);
      reasons.push(`Heavy armor reduces your effectiveness (~${penalty}% penalty)`);
    } else if (charContext.armorCategory === 'medium' && axisB.components?.armorFactor < 1.0) {
      reasons.push('Medium armor slightly restricts this weapon');
    }

    // Price tier (only if notably expensive)
    if (weapon.system?.price) {
      if (weapon.system.price > 5000) {
        reasons.push('Premium cost—significant resource investment');
      } else if (weapon.system.price < 100) {
        reasons.push('Inexpensive—easy to acquire');
      }
    }

    // Tier-based guidance
    if (combined.tier === 'perfect' || combined.tier === 'excellent') {
      reasons.push('Strong overall fit for your character');
    } else if (combined.tier === 'marginal') {
      reasons.push('Situational use—consider as backup only');
    } else if (combined.tier === 'poor') {
      reasons.push('Poor fit—alternatives are significantly better');
    }

    if (reasons.length > 0) {
      return reasons[0]; // Return the most important one
    }

    return null;
  }

  /**
   * Generate detailed explanation object for UI display
   * (Alternative to string array, for rich UI)
   */
  static generateDetailedExplanations(
    weapon,
    charContext,
    axisA,
    axisB,
    combined,
    options = {}
  ) {
    return {
      summary: this.generateExplanations(weapon, charContext, axisA, axisB, combined, options).join(' / '),

      detailed: {
        damage: {
          label: 'Damage Potential',
          description: this._explainDamageScore(weapon, axisA, charContext),
          score: axisA.normalizedScore,
          band: axisA.band,
          rawValue: axisA.averageDamage
        },

        accuracy: {
          label: 'Hit-Likelihood Fit',
          description: this._explainHitLikelihoodScore(weapon, axisB, charContext),
          score: axisB.normalizedScore,
          bias: axisB.biasDirection
        },

        attributes: {
          label: 'Attribute Alignment',
          description: this._explainAttributeAlignment(weapon, charContext, axisB),
          weaponAttribute: weapon.system?.attackAttribute || 'str',
          charStrength: charContext.attributes?.str || 0,
          charDexterity: charContext.attributes?.dex || 0
        },

        context: {
          label: 'Other Factors',
          description: this._explainContextFactors(weapon, charContext, axisB, combined),
          proficiencies: charContext.proficiencies,
          armor: charContext.armorCategory
        }
      },

      reasoning: {
        tradeoffType: combined.tradeoffType,
        guidance: combined.guidance,
        rationale: combined.rationale
      }
    };
  }

  /**
   * Format explanation for tooltip/hover
   */
  static generateTooltip(explanations, combined) {
    const lines = explanations.map((exp, idx) => `• ${exp}`);

    lines.push('');
    lines.push(`Overall: ${combined.tier}`);

    if (combined.guidance && combined.guidance.length > 0) {
      lines.push(`Tip: ${combined.guidance[0]}`);
    }

    return lines.join('\n');
  }
}

export default ExplainabilityGenerator;
