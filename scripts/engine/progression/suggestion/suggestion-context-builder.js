/**
 * Suggestion Context Builder - Phase 6 Consolidation
 *
 * Unified helper for building suggestion display context in chargen and levelup.
 * Eliminates duplication of pendingData construction and suggestion service integration.
 *
 * CANONICAL: Single entry point for suggestion context assembly across all progression flows.
 */

import { SuggestionService } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js";

export class SuggestionContextBuilder {
  /**
   * Build pending data object from actor and optional character data override
   * CANONICAL: All progression flows should use this to construct pendingData
   *
   * @param {Object} actor - Character actor
   * @param {Object} characterData - Override character data (from chargen transient state)
   * @returns {Object} Pending data object with selected feats, classes, skills, talents
   */
  static buildPendingData(actor, characterData = {}) {
    // Prefer character data override (chargen transient), fall back to actor items (levelup live)
    const selectedFeats = characterData.feats !== undefined
      ? characterData.feats
      : actor.items?.filter(i => i.type === 'feat').map(i => ({ id: i._id, name: i.name })) || [];

    const selectedClass = characterData.classes?.[0]
      ? characterData.classes[0]
      : actor.system?.progression?.classLevels?.[0];

    const selectedTalents = characterData.talents !== undefined
      ? characterData.talents
      : actor.system?.progression?.talents || [];

    const selectedSkills = characterData.skills !== undefined
      ? Array.isArray(characterData.skills)
        ? characterData.skills
        : Object.entries(characterData.skills || {})
          .filter(([, value]) => value === true || value?.trained === true)
          .map(([key]) => ({ key }))
      : Object.entries(actor.system?.skills || {})
          .filter(([, value]) => value === true || value?.trained === true)
          .map(([key]) => ({ key }));

    const abilityIncreases = characterData.abilityIncreases || {};

    return {
      selectedFeats,
      selectedClass,
      selectedTalents,
      selectedSkills,
      abilityIncreases
    };
  }

  /**
   * Get suggestions for a specific domain, with unified context handling
   * CANONICAL: Single call point for getting suggestions across chargen/levelup
   *
   * @param {Object} actor - Character actor
   * @param {string} context - Context ('chargen' or 'levelup')
   * @param {string} domain - Domain ('feats', 'talents', 'force-powers', etc.)
   * @param {Array} available - Available items for suggestion
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Array of suggestions with enrichment
   */
  static async getSuggestionsForDomain(
    actor,
    context,
    domain,
    available,
    options = {}
  ) {
    const {
      characterData = {},
      mentor = null,
      engineOptions = {},
      persist = true
    } = options;

    const pendingData = this.buildPendingData(actor, characterData);

    const suggestions = await SuggestionService.getSuggestions(
      actor,
      context,
      {
        domain,
        available,
        pendingData,
        engineOptions,
        persist
      }
    );

    // If mentor enrichment requested, apply mentor-specific reasoning
    if (mentor && options.enrichMentor) {
      // This would call MentorInteractionIntegration.enrichMentorSuggestion
      // for each suggestion, but keeping that separate for now
      return suggestions;
    }

    return suggestions;
  }

  /**
   * Validate that pending data contains required fields
   * @param {Object} pendingData - Pending data to validate
   * @returns {boolean} True if valid
   */
  static isValidPendingData(pendingData) {
    return (
      pendingData &&
      Array.isArray(pendingData.selectedFeats) &&
      Array.isArray(pendingData.selectedTalents) &&
      Array.isArray(pendingData.selectedSkills)
    );
  }
}

export default SuggestionContextBuilder;
