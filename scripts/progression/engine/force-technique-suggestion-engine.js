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

import { SWSELogger } from '../../utils/logger.js';

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
      if (archetypeBonus >= 1.5) {
        tier = FORCE_TECHNIQUE_TIERS.POWER_SYNERGY_HIGH;
      } else if (archetypeBonus >= 1.2) {
        tier = FORCE_TECHNIQUE_TIERS.POWER_SYNERGY_MED;
      } else if (archetypeBonus > 1.0) {
        tier = FORCE_TECHNIQUE_TIERS.POWER_SYNERGY_LOW;
      } else {
        tier = FORCE_TECHNIQUE_TIERS.POWER_SYNERGY_LOW;
      }
    } else {
      // No known power: apply heavy penalty but check archetype
      score *= 0.5;
      reasons.push(`Requires known Force Power`);

      const archetypeBonus = archBias[archetype] || 1.0;
      if (archetypeBonus > 1.0) {
        score *= archetypeBonus;
        tier = FORCE_TECHNIQUE_TIERS.ARCHETYPE_ONLY;
        reasons.push(`${archetype} has strong affinity`);
      } else {
        tier = FORCE_TECHNIQUE_TIERS.AVAILABLE;
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
        .filter(item => item.type === 'forcepower')
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

    return 'neutral';
  }

  /**
   * Map prestige class to archetype
   * @private
   */
  static _getArchetypeForPrestigeClass(prestige = '') {
    const prestigeArchetypeMap = {
      'Jedi Guardian': 'jedi_guardian',
      'Jedi Sentinel': 'jedi_sentinel',
      'Jedi Consular': 'jedi_consular',
      'Jedi Ace Pilot': 'jedi_ace_pilot',
      'Jedi Healer': 'jedi_healer',
      'Jedi Battlemaster': 'jedi_battlemaster',
      'Jedi Shadow': 'jedi_shadow',
      'Jedi Weapon Master': 'jedi_weapon_master',
      'Jedi Mentor': 'jedi_mentor',
      'Jedi Seer': 'jedi_seer',
      'Jedi Archivist': 'jedi_archivist',
      'Sith Marauder': 'sith_marauder',
      'Sith Assassin': 'sith_assassin',
      'Sith Acolyte': 'sith_acolyte',
      'Sith Alchemist': 'sith_alchemist',
      'Sith Mastermind': 'sith_mastermind',
      'Sith Juggernaut': 'sith_juggernaut',
      'Emperor\'s Shield': 'emperors_shield',
      'Imperial Knight Errant': 'imperial_knight_errant',
      'Imperial Knight Inquisitor': 'imperial_knight_inquisitor'
    };

    return prestigeArchetypeMap[prestige] || 'neutral';
  }

  /**
   * Map base class to archetype (approximation)
   * @private
   */
  static _getArchetypeForBaseClass(baseClass = '') {
    const baseArchetypeMap = {
      'Jedi': 'jedi_consular',
      'Soldier': 'jedi_guardian',
      'Scout': 'jedi_sentinel',
      'Scoundrel': 'jedi_shadow',
      'Noble': 'jedi_mentor'
    };

    return baseArchetypeMap[baseClass] || 'neutral';
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
