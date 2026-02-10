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
      return `Exceptional damage potential (${averageDamage.toFixed(1)} avg from ${damageFormula})`;
    }

    if (band === 'high') {
      return `High damage output (${averageDamage.toFixed(1)} avg per hit)`;
    }

    if (band === 'medium') {
      return `Solid damage (${averageDamage.toFixed(1)} avg per hit)`;
    }

    if (band === 'low') {
      return `Light weapon, good for finishing or ranged harassment`;
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
      reasons.push(`Matches your high ${attrName}`);
    } else if (components.attributeFactor < 0.85) {
      const attrName = attr === 'str' ? 'Strength' : 'Dexterity';
      reasons.push(`Doesn't align well with your low ${attrName}`);
    }

    // Accuracy trait
    if (accuracy.includes('accurate')) {
      reasons.push('Has improved accuracy');
    } else if (accuracy.includes('inaccurate')) {
      reasons.push('Less accurate than standard');
    }

    // Range interaction
    if (components.rangeFactor > 1.1) {
      reasons.push('Works well with your playstyle');
    } else if (components.rangeFactor < 0.95) {
      reasons.push('Different playstyle than your build');
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

    // Proficiency
    const group = (weapon.system?.group || '').toLowerCase();
    const { proficiencies } = charContext;

    if (group.includes('simple') && proficiencies.simple) {
      reasons.push('You are proficient with simple weapons');
    } else if (group.includes('advanced') && !proficiencies.advanced) {
      reasons.push('Requires advanced proficiency (which you lack)');
    } else if (group.includes('exotic') && !proficiencies.advanced) {
      reasons.push('Exotic weapon - requires specialized training');
    }

    // Armor interference
    if (charContext.armorCategory === 'heavy' && axisB.components.armorFactor < 1.0) {
      reasons.push('Heavy armor reduces effectiveness slightly');
    }

    // Price tier (if available)
    if (weapon.system?.price) {
      if (weapon.system.price > 5000) {
        reasons.push('Premium cost - investment item');
      }
    }

    // Tier note
    if (combined.tier === 'excellent' || combined.tier === 'perfect') {
      reasons.push(`Top-tier recommendation for you`);
    } else if (combined.tier === 'marginal') {
      reasons.push(`Consider this only if specialized tactics require it`);
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
