/**
 * Suggestion Context Builder - Phase 6 Consolidation
 *
 * Unified helper for building suggestion display context in chargen and levelup.
 * Eliminates duplication of pendingData construction and suggestion service integration.
 *
 * CANONICAL: Single entry point for suggestion context assembly across all progression flows.
 */

import { SuggestionService } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionService.js";
import { SpeciesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js";

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
    const selectedPowers = characterData.forcePowers !== undefined
      ? characterData.forcePowers
      : actor.items?.filter(i => i.type === 'force-power').map(i => ({ id: i._id, name: i.name })) || [];

    const selectedForceTechniques = characterData.forceTechniques !== undefined
      ? characterData.forceTechniques
      : actor.items?.filter(i => i.type === 'force-technique').map(i => ({ id: i._id, name: i.name })) || [];

    const selectedForceSecrets = characterData.forceSecrets !== undefined
      ? characterData.forceSecrets
      : actor.items?.filter(i => i.type === 'force-secret').map(i => ({ id: i._id, name: i.name })) || [];

    const mentorBiases = this._mergeMentorBiases(
      actor?.system?.swse?.mentorBuildIntentBiases || {},
      actor?.system?.swse?.classSurveyIntentBiases || {},
      characterData?.mentorBiases || {}
    );

    const selectedSpecies = this._resolveSelectedSpecies(actor, characterData);
    const selectedSpeciesName = selectedSpecies?.name || this._resolveFallbackSpeciesName(actor, characterData) || null;
    const selectedSpeciesTags = Array.from(new Set([
      ...(selectedSpecies?.tags || []),
      ...this._buildSpeciesIdentityTags(selectedSpeciesName)
    ]));

    return {
      selectedFeats,
      selectedClass,
      selectedTalents,
      selectedSkills,
      abilityIncreases,
      selectedSpecies,
      selectedSpeciesName,
      selectedSpeciesTags,
      selectedPowers,
      selectedForceTechniques,
      selectedForceSecrets,
      background: characterData.background ?? actor.system?.background ?? null,
      survey: characterData.survey ?? actor.system?.survey ?? null,
      mentorBiases,
      classSurveyResponses: actor?.system?.swse?.classSurveyResponses || {},
      species: selectedSpecies ?? characterData.species ?? null
    };
  }


  static _mergeMentorBiases(...sources) {
    const out = {};
    const mergeArray = (key, values = []) => {
      if (!Array.isArray(out[key])) out[key] = [];
      for (const value of values || []) {
        if (value && !out[key].includes(value)) out[key].push(value);
      }
    };
    const mergeWeights = (key, values = {}) => {
      if (!out[key] || typeof out[key] !== 'object' || Array.isArray(out[key])) out[key] = {};
      for (const [name, value] of Object.entries(values || {})) {
        out[key][name] = (out[key][name] || 0) + Number(value || 0);
      }
    };

    for (const source of sources || []) {
      for (const [key, value] of Object.entries(source || {})) {
        if (Array.isArray(value)) mergeArray(key, value);
        else if (value && typeof value === 'object') mergeWeights(key, value);
        else if (value !== undefined && value !== null && out[key] === undefined) out[key] = value;
      }
    }
    if (Array.isArray(out.prestigeClassTargets) && out.prestigeClassTargets.length) {
      out.prestigeClassTarget = out.prestigeClassTargets[0];
    }
    return out;
  }

  static _resolveSelectedSpecies(actor, characterData = {}) {
    const candidates = [
      characterData.selectedSpecies,
      characterData.species,
      characterData.speciesId,
      characterData.speciesName,
      actor?.items?.find?.((item) => item.type === 'species')?.name,
      actor?.system?.species,
      actor?.system?.species?.name,
      actor?.system?.details?.species,
      actor?.system?.race
    ];

    for (const candidate of candidates) {
      const resolved = this._lookupSpecies(candidate);
      if (resolved) return resolved;
    }

    return null;
  }

  static _lookupSpecies(candidate) {
    if (!candidate) return null;

    if (candidate && typeof candidate === 'object') {
      if (candidate.name && Array.isArray(candidate.tags) && candidate.abilityScores) {
        return {
          ...candidate,
          tags: [...(candidate.tags || [])]
        };
      }

      const candidateId = candidate.id || candidate._id || candidate.speciesId || null;
      const candidateName = candidate.name || candidate.label || candidate.value || candidate.speciesName || null;
      if (candidateId && SpeciesRegistry.getById?.(candidateId)) {
        return SpeciesRegistry.getById(candidateId);
      }
      if (candidateName && SpeciesRegistry.getByName?.(candidateName)) {
        return SpeciesRegistry.getByName(candidateName);
      }
    }

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (!trimmed) return null;
      return SpeciesRegistry.getById?.(trimmed)
        || SpeciesRegistry.getByName?.(trimmed)
        || (SpeciesRegistry.getAll?.() || []).find((entry) => String(entry?.name || '').toLowerCase() == trimmed.toLowerCase())
        || null;
    }

    return null;
  }

  static _resolveFallbackSpeciesName(actor, characterData = {}) {
    const candidates = [
      characterData.selectedSpecies?.name,
      characterData.speciesName,
      typeof characterData.species === 'string' ? characterData.species : characterData.species?.name,
      actor?.items?.find?.((item) => item.type === 'species')?.name,
      actor?.system?.species?.name,
      typeof actor?.system?.species === 'string' ? actor.system.species : null,
      actor?.system?.details?.species,
      actor?.system?.race
    ];

    return candidates.find((value) => typeof value === 'string' && value.trim()) || null;
  }

  static _buildSpeciesIdentityTags(name) {
    if (!name) return [];
    const normalized = String(name)
      .toLowerCase()
      .replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    if (!normalized) return [];
    const compact = normalized.replace(/_/g, '');
    return Array.from(new Set([
      'species',
      'heritage',
      `species_${normalized}`,
      compact && compact !== normalized ? `species_${compact}` : null
    ].filter(Boolean)));
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
