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

import { SWSELogger } from '../../../utils/logger.js';
import { UNIFIED_TIERS, getTierMetadata } from '../../suggestion/suggestion-unified-tiers.js';
import {
  PRESTIGE_ARCHETYPE_MAP,
  BASE_ARCHETYPE_MAP,
  DEFAULT_ARCHETYPE,
  FORCE_TECHNIQUE_ARCHETYPE_THRESHOLDS,
  FORCE_TECHNIQUE_NO_POWER_PENALTY,
  ITEM_TYPES
} from './suggestion-constants.js';

/**
 * Deprecated: Use UNIFIED_TIERS instead
 * Kept for backwards compatibility during migration
 * @deprecated
 */
export const FORCE_TECHNIQUE_TIERS = {
  POWER_SYNERGY_HIGH: UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW,     // 5 - Known power + strong archetype match
  POWER_SYNERGY_MED: UNIFIED_TIERS.PATH_CONTINUATION,           // 4 - Known power + medium archetype match
  POWER_SYNERGY_LOW: UNIFIED_TIERS.CATEGORY_SYNERGY,            // 3 - Known power + weak/no archetype match
  ARCHETYPE_ONLY: UNIFIED_TIERS.ABILITY_SYNERGY,               // 2 - No known power, but strong archetype
  AVAILABLE: UNIFIED_TIERS.THEMATIC_FIT,                        // 1 - Available but no synergy
  FALLBACK: UNIFIED_TIERS.AVAILABLE                             // 0 - Last resort
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
    let tier = UNIFIED_TIERS.THEMATIC_FIT;
    const reasons = [];

    if (!technique) {return null;}

    // Load enriched technique data if available
    const enrichedData = technique.flags?.swse?.suggestion ||
                       technique.system?.suggestion ||
                       {};

    const associatedPowers = enrichedData.associatedPowers || [];
    const powerSynergyWeight = enrichedData.powerSynergyWeight || 1.5;
    const archBias = enrichedData.archetypeBias || {};

    // PRIMARY: Power Synergy Check
    const matchedPowers = associatedPowers.filter(powerName =>
      knownPowers.some(kp =>
        kp.toLowerCase().trim() === powerName.toLowerCase().trim()
      )
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

      // Set tier based on synergy strength
      if (archetypeBonus >= FORCE_TECHNIQUE_ARCHETYPE_THRESHOLDS.HIGH_SYNERGY_MIN) {
        tier = UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW;
      } else if (archetypeBonus >= FORCE_TECHNIQUE_ARCHETYPE_THRESHOLDS.MED_SYNERGY_MIN) {
        tier = UNIFIED_TIERS.PATH_CONTINUATION;
      } else if (archetypeBonus > FORCE_TECHNIQUE_ARCHETYPE_THRESHOLDS.LOW_SYNERGY_MIN) {
        tier = UNIFIED_TIERS.CATEGORY_SYNERGY;
      } else {
        tier = UNIFIED_TIERS.CATEGORY_SYNERGY;
      }
    } else {
      // No known power: apply heavy penalty but check archetype
      score *= FORCE_TECHNIQUE_NO_POWER_PENALTY;
      reasons.push(`Requires known Force Power`);

      const archetypeBonus = archBias[archetype] || 1.0;
      if (archetypeBonus > 1.0) {
        score *= archetypeBonus;
        tier = UNIFIED_TIERS.ABILITY_SYNERGY;
        reasons.push(`${archetype} has strong affinity`);
      } else {
        tier = UNIFIED_TIERS.THEMATIC_FIT;
      }
    }

    return {
      tier,
      score: Number(score.toFixed(2)),
      reasons
    };
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
        .forEach(power => powers.push(power.name));
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
