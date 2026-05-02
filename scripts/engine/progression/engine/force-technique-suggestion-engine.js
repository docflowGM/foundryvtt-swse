/**
 * force-technique-suggestion-engine.js
 * Suggests Force Techniques based on Power synergy and archetype alignment
 *
 * Suggests Force Techniques based on:
 * - Known Force Powers (primary signal)
 * - Character archetype alignment
 * - Category synergy
 *
 * Philosophy: Techniques should feel like refinements of known powers,
 * not random upgrades.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import {
  PRESTIGE_ARCHETYPE_MAP,
  BASE_ARCHETYPE_MAP,
  DEFAULT_ARCHETYPE,
  FORCE_TECHNIQUE_ARCHETYPE_THRESHOLDS,
  FORCE_TECHNIQUE_NO_POWER_PENALTY,
  ITEM_TYPES
} from "/systems/foundryvtt-swse/scripts/engine/progression/engine/suggestion-constants.js";

export const FORCE_TECHNIQUE_TIERS = {
  POWER_SYNERGY_HIGH: 5,    // Known power + strong archetype match
  POWER_SYNERGY_MED: 4,     // Known power + medium archetype match
  POWER_SYNERGY_LOW: 3,     // Known power + weak/no archetype match
  ARCHETYPE_ONLY: 2,        // No known power, but strong archetype
  AVAILABLE: 1,             // Available but no synergy
  FALLBACK: 0               // Last resort
};

export class ForceTechniqueSuggestionEngine {
  /**
   * Suggest a Force Technique based on character state
   * @param {Actor} actor - The character
   * @param {Array} available - Available techniques
   * @param {Set} selected - Already selected technique IDs
   * @returns {Promise<Object>} Suggested technique
   */
  static async suggestTechnique(actor, available = [], selected = new Set()) {
    try {
      const suggestions = await this.suggestForceOptions(available, actor, {});

      // Return first suggestion not yet selected
      for (const suggestion of suggestions) {
        if (!selected.has(suggestion.id)) {
          return { ...suggestion, ...suggestion.suggestion };
        }
      }

      // Fallback to first available if all suggested ones selected
      return available[0] || null;
    } catch (e) {
      console.warn('ForceTechniqueSuggestionEngine error:', e);
      return this._simpleSuggest(available, selected);
    }
  }

  /**
   * Suggest Force Techniques for a character
   * @param {Array} availableTechniques - Techniques the character can select
   * @param {Object} actor - The actor/character
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Sorted array of suggestions with scores
   */
  static async suggestForceOptions(availableTechniques = [], actor = null, options = {}) {
    if (!availableTechniques || availableTechniques.length === 0) {
      return [];
    }

    const knownPowers = this._getKnownForcePowers(actor);
    const archetype = this._getCharacterArchetype(actor);

    const suggestions = [];

    for (const technique of availableTechniques) {
      const suggestion = this._scoreTechnique(
        technique,
        knownPowers,
        archetype,
        options
      );

      if (suggestion) {
        suggestions.push({
          id: technique.id,
          name: technique.name,
          type: 'force-technique',
          suggestion,
          tier: suggestion.tier,
          score: suggestion.score,
          reasons: suggestion.reasons
        });
      }
    }

    // Sort by tier (descending) then score (descending)
    suggestions.sort((a, b) => {
      if (b.tier !== a.tier) {return b.tier - a.tier;}
      return b.score - a.score;
    });

    SWSELogger.log(
      `[FORCE-TECH-SUGGESTION] Suggested ${suggestions.length} techniques for ${archetype || 'unknown'} archetype`
    );

    return suggestions;
  }

  /**
   * Score a single Force Technique
   * @private
   */
  static _scoreTechnique(technique, knownPowers = [], archetype = '', options = {}) {
    let score = 1.0;
    let tier = FORCE_TECHNIQUE_TIERS.AVAILABLE;
    const reasons = [];

    if (!technique) {return null;}

    // Load enriched technique data if available
    const enrichedData = technique.flags?.swse?.suggestion ||
                       technique.system?.suggestion ||
                       {};

    const associatedPowers = enrichedData.associatedPowers || [];
    const powerSynergyWeight = enrichedData.powerSynergyWeight || 1.5;
    const archBias = enrichedData.archetypeBias || {};
    const normalizedKnownPowers = knownPowers.map((power) => ({
      ...power,
      normalizedName: this._normalizePowerName(power?.name || power)
    }));
    const formPowerCount = normalizedKnownPowers.filter((power) => power.isForm).length;
    const isFormFocusedSuite = normalizedKnownPowers.length > 0 && formPowerCount / normalizedKnownPowers.length >= 0.75;
    const isUtfTechnique = this._isUseTheForceTechnique(technique);

    // PRIMARY: Power Synergy Check
    const matchedPowers = associatedPowers.filter(powerName =>
      normalizedKnownPowers.some(kp => kp.normalizedName === this._normalizePowerName(powerName))
    );

    if (matchedPowers.length > 0) {
      // Character knows at least one associated power
      score *= powerSynergyWeight;
      reasons.push(`Refines known power: ${matchedPowers.join(', ')}`);

      // SECONDARY: Archetype alignment when power is known
      const archetypeBonus = archBias[archetype] || 1.0;
      score *= archetypeBonus;

      if (archetypeBonus > 1.0) {
        reasons.push(`${archetype} specializes in this technique`);
      }

      const matchedFormPowers = matchedPowers.filter((powerName) => normalizedKnownPowers.some((power) => power.normalizedName === this._normalizePowerName(powerName) && power.isForm));
      if (matchedFormPowers.length > 0) {
        score *= 1.15;
        reasons.push('Refines lightsaber form powers already central to your suite');
      }

      // Set tier based on synergy strength
      if (archetypeBonus >= FORCE_TECHNIQUE_ARCHETYPE_THRESHOLDS.HIGH_SYNERGY_MIN) {
        tier = FORCE_TECHNIQUE_TIERS.POWER_SYNERGY_HIGH;
      } else if (archetypeBonus >= FORCE_TECHNIQUE_ARCHETYPE_THRESHOLDS.MED_SYNERGY_MIN) {
        tier = FORCE_TECHNIQUE_TIERS.POWER_SYNERGY_MED;
      } else if (archetypeBonus > FORCE_TECHNIQUE_ARCHETYPE_THRESHOLDS.LOW_SYNERGY_MIN) {
        tier = FORCE_TECHNIQUE_TIERS.POWER_SYNERGY_LOW;
      } else {
        tier = FORCE_TECHNIQUE_TIERS.POWER_SYNERGY_LOW;
      }
    } else {
      // No known power: apply heavy penalty but check archetype
      score *= FORCE_TECHNIQUE_NO_POWER_PENALTY;
      reasons.push(`Requires known Force Power`);

      const archetypeBonus = archBias[archetype] || 1.0;
      if (isFormFocusedSuite && isUtfTechnique) {
        score *= 1.35;
        tier = FORCE_TECHNIQUE_TIERS.ARCHETYPE_ONLY;
        reasons.push('Your suite is dominated by lightsaber forms, so refining Use the Force execution has extra value');
      }
      if (archetypeBonus > 1.0) {
        score *= archetypeBonus;
        tier = Math.max(tier, FORCE_TECHNIQUE_TIERS.ARCHETYPE_ONLY);
        reasons.push(`${archetype} has strong affinity`);
      } else if (tier !== FORCE_TECHNIQUE_TIERS.ARCHETYPE_ONLY) {
        tier = FORCE_TECHNIQUE_TIERS.AVAILABLE;
      }
    }

    return {
      tier,
      score: Number(score.toFixed(2)),
      reasons
    };
  }


  static _normalizePowerName(value = '') {
    return String(value || '').trim().toLowerCase();
  }

  static _isUseTheForceTechnique(technique = {}) {
    const benefit = String(technique.system?.benefit || technique.system?.description || technique.description || '').toLowerCase();
    const name = String(technique.name || '').toLowerCase();
    const prerequisite = String(technique.system?.prerequisite || '').toLowerCase();
    return benefit.includes('use the force')
      || benefit.includes('telepathy ability')
      || benefit.includes('sense surroundings')
      || benefit.includes('sense force')
      || name.includes('sense surroundings')
      || name.includes('sense force')
      || name.includes('telepathy')
      || prerequisite.includes('sense surroundings')
      || prerequisite.includes('sense force')
      || prerequisite.includes('telepathy');
  }

  /**
   * Get list of Force Powers known by character
   * @private
   */
  static _getKnownForcePowers(actor = null) {
    const powers = [];

    if (actor) {
      // From full actor (levelup/play mode)
      actor.items
        .filter(item => item.type === ITEM_TYPES.FORCE_POWER)
        .forEach(power => {
          const tags = Array.isArray(power.system?.tags) ? power.system.tags : [];
          powers.push({
            name: power.name,
            isForm: Boolean(power.system?.form) || tags.some(tag => String(tag || '').toLowerCase() === 'lightsaber-form'),
            tags
          });
        });
    }

    return powers;
  }

  /**
   * Determine character's primary archetype
   * @private
   */
  static _getCharacterArchetype(actor = null) {
    // Try to determine from prestige class
    const prestigeClass = actor?.system?.swse?.prestigeClass;

    if (prestigeClass) {
      return this._getArchetypeForPrestigeClass(prestigeClass);
    }

    // Try base class
    const baseClass = actor?.system?.swse?.class;

    if (baseClass) {
      return this._getArchetypeForBaseClass(baseClass);
    }

    return DEFAULT_ARCHETYPE;
  }

  /**
   * Map prestige class to archetype
   * @private
   */
  static _getArchetypeForPrestigeClass(prestige = '') {
    return PRESTIGE_ARCHETYPE_MAP[prestige] || DEFAULT_ARCHETYPE;
  }

  /**
   * Map base class to archetype (approximation)
   * @private
   */
  static _getArchetypeForBaseClass(baseClass = '') {
    return BASE_ARCHETYPE_MAP[baseClass] || DEFAULT_ARCHETYPE;
  }

  /**
   * Simple suggestion: suggest first available technique not yet selected
   * @private
   */
  static _simpleSuggest(available = [], selected = new Set()) {
    for (const technique of available) {
      const id = technique.id || technique._id || technique.name;
      if (!selected.has(id)) {
        return technique;
      }
    }
    return available[0] || null;
  }
}
