/**
 * Armor Explainability Generator
 *
 * Generates 2-4 human-readable reasons for armor scoring.
 * Each explanation maps to a component or design decision.
 */

export class ArmorExplainabilityGenerator {
  /**
   * Generate explanations for armor score
   * @param {Object} armor - The armor item
   * @param {Object} charContext - Character context
   * @param {Object} axisA - Axis A (survivability) result
   * @param {Object} axisB - Axis B (mobility) result
   * @param {Number} roleAlignment - Role alignment score
   * @param {Number} finalScore - Final combined score
   * @param {Object} options - Display options
   * @returns {Array} Array of 2-4 explanation strings
   */
  static generateExplanations(
    armor,
    charContext,
    axisA,
    axisB,
    roleAlignment,
    finalScore,
    options = {}
  ) {
    const explanations = [];

    // Primary explanation: Survivability (Axis A)
    explanations.push(this._explainSurvivability(armor, axisA, charContext));

    // Secondary explanation: Mobility cost (Axis B)
    explanations.push(this._explainMobility(armor, axisB, charContext));

    // Tertiary explanation: Role alignment
    if (roleAlignment > 8) {
      explanations.push(`Strong fit for your ${charContext.primaryRole} role`);
    } else if (roleAlignment > 0) {
      explanations.push(`Supports your ${charContext.primaryRole} playstyle`);
    } else if (roleAlignment < -5) {
      explanations.push(`Works against your ${charContext.primaryRole} tactics`);
    }

    // Quaternary explanation: Special context
    const contextExplanation = this._explainContext(armor, charContext);
    if (contextExplanation) {
      explanations.push(contextExplanation);
    }

    return explanations.slice(0, 4); // Limit to 4 explanations
  }

  /**
   * Explain survivability axis
   * @private
   */
  static _explainSurvivability(armor, axisA, charContext) {
    const soak = armor.system?.soak || 0;

    if (soak === 0) {
      return 'No armor protection';
    }

    let explanation = '';

    // Explain the band
    switch (axisA.band) {
      case 'high':
        explanation = 'Strong armor bonus';
        break;
      case 'medium_high':
        explanation = 'Good armor bonus';
        break;
      case 'medium':
        explanation = 'Moderate armor bonus';
        break;
      case 'medium_low':
        explanation = 'Light armor bonus';
        break;
      case 'low':
        explanation = 'Minimal armor bonus';
        break;
      default:
        explanation = `+${soak} soak`;
    }

    // Add talent context
    if (charContext.talents?.improvedArmoredDefense) {
      explanation += ' (scales with your level)';
    } else if (charContext.talents?.armoredDefense) {
      explanation += ' (maintains value as you level)';
    } else if (axisA.band === 'low' || axisA.band === 'medium_low') {
      explanation += ' (diminishes at higher levels)';
    }

    return explanation;
  }

  /**
   * Explain mobility axis
   * @private
   */
  static _explainMobility(armor, axisB, charContext) {
    if (axisB.category === 'light') {
      return 'No mobility penalty';
    }

    let explanation = '';

    if (axisB.category === 'medium') {
      explanation = 'Moderate mobility penalty';
    } else if (axisB.category === 'heavy') {
      explanation = 'Heavy mobility penalty';
    }

    // Add character-specific context
    const charDex = charContext.attributes?.dex || 0;
    if (charDex > 2 && axisB.category === 'heavy') {
      explanation += ' (especially costly for your DEX)';
    }

    // Armor Mastery context
    if (charContext.talents?.armorMastery && axisB.category !== 'light') {
      explanation += ' (Armor Mastery mitigates)';
    }

    return explanation;
  }

  /**
   * Explain contextual factors
   * @private
   */
  static _explainContext(armor, charContext) {
    const category = armor.system?.category || 'light';
    const price = armor.system?.price || 0;

    // Proficiency context
    const proficiencies = charContext.proficiencies || {};
    let profText = null;

    if (category === 'light' && !proficiencies.light) {
      profText = 'No proficiency in light armor';
    } else if (category === 'medium' && !proficiencies.medium) {
      profText = 'No proficiency in medium armor';
    } else if (category === 'heavy' && !proficiencies.heavy) {
      profText = 'No proficiency in heavy armor';
    }

    if (profText) {
      return profText;
    }

    // Price context (only if notably expensive)
    if (price > 1000) {
      return 'Premium cost';
    }

    return null;
  }
}

export default ArmorExplainabilityGenerator;
