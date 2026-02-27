/**
 * force-secret-suggestion-engine.js
 * Suggests Force Secrets based on character commitment and alignment
 *
 * Conservatively suggests Force Secrets based on:
 * - Sustained Force investment (multiple powers + techniques)
 * - Character's Force path (institution bias)
 * - Archetype alignment
 * - Pattern detection
 *
 * Philosophy: Force Secrets are earned through demonstrated commitment,
 * not handed out freely. Suggestions should feel like natural progressions
 * of a character's established Force identity.
 */

import { SWSELogger } from '../../../utils/logger.js';
import { UNIFIED_TIERS, getTierMetadata } from '../../suggestion/suggestion-unified-tiers.js';
import {
  PRESTIGE_ARCHETYPE_MAP,
  BASE_ARCHETYPE_MAP,
  DEFAULT_ARCHETYPE,
  FORCE_SECRET_ARCHETYPE_THRESHOLDS,
  FORCE_SECRET_INSTITUTION_THRESHOLDS,
  FORCE_SECRET_DSP_THRESHOLDS,
  ITEM_TYPES
} from './suggestion-constants.js';

/**
 * Deprecated: Use UNIFIED_TIERS instead
 * Kept for backwards compatibility during migration
 * @deprecated
 */
export const FORCE_SECRET_TIERS = {
  PERFECT_FIT: UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW,  // 5 - All conditions met + high archetype match
  EXCELLENT_MATCH: UNIFIED_TIERS.PATH_CONTINUATION,   // 4 - Most conditions met + archetype match
  GOOD_MATCH: UNIFIED_TIERS.CATEGORY_SYNERGY,         // 3 - All mandatory conditions + moderate match
  AVAILABLE_FIT: UNIFIED_TIERS.ABILITY_SYNERGY,       // 2 - Meets minimum requirements
  MARGINAL: UNIFIED_TIERS.THEMATIC_FIT,               // 1 - Barely meets requirements
  POSSIBLE: UNIFIED_TIERS.THEMATIC_FIT,               // 1 - Could be learned
  NOT_YET: UNIFIED_TIERS.AVAILABLE                    // 0 - Does not meet requirements
};

export class ForceSecretSuggestionEngine {
  /**
   * Suggest a Force Secret based on character state
   * @param {Actor} actor - The character
   * @param {Array} available - Available secrets
   * @param {Set} selected - Already selected secret IDs
   * @returns {Promise<Object>} Suggested secret
   */
  static async suggestSecret(actor, available = [], selected = new Set()) {
    try {
      const suggestions = await this.suggestForceSecrets(available, actor, {});

      // Return first suggestion not yet selected
      for (const suggestion of suggestions) {
        if (!selected.has(suggestion.id)) {
          return { ...suggestion, ...suggestion.suggestion };
        }
      }

      // Fallback to first available if all suggested ones selected
      return available[0] || null;
    } catch (e) {
      console.warn('ForceSecretSuggestionEngine error:', e);
      return this._simpleSuggest(available, selected);
    }
  }

  /**
   * Suggest Force Secrets for a character
   * Extremely conservative - only suggests when commitment is clear
   * @param {Array} availableSecrets - Secrets the character can select
   * @param {Object} actor - The actor/character
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Filtered suggestions (only tier 3+)
   */
  static async suggestForceSecrets(availableSecrets = [], actor = null, options = {}) {
    if (!availableSecrets || availableSecrets.length === 0) {
      return [];
    }

    const knownPowers = this._getKnownForcePowers(actor);
    const knownTechniques = this._getKnownForceTechniques(actor);
    const archetype = this._getCharacterArchetype(actor);
    const institution = this._getInstitution(actor);

    const suggestions = [];

    for (const secret of availableSecrets) {
      const suggestion = this._scoreSecret(
        secret,
        knownPowers,
        knownTechniques,
        archetype,
        institution,
        options
      );

      // Only suggest secrets that meet minimum viable investment (tier 2+)
      if (suggestion && suggestion.tier >= UNIFIED_TIERS.ABILITY_SYNERGY) {
        suggestions.push({
          id: secret.id,
          name: secret.name,
          type: 'force-secret',
          suggestion,
          tier: suggestion.tier,
          score: suggestion.score,
          reasons: suggestion.reasons,
          requirementsMetCount: suggestion.requirementsMetCount
        });
      }
    }

    // Sort by tier (descending) then score (descending)
    suggestions.sort((a, b) => {
      if (b.tier !== a.tier) {return b.tier - a.tier;}
      return b.score - a.score;
    });

    SWSELogger.log(
      `[FORCE-SECRET-SUGGESTION] Found ${suggestions.length} eligible Force Secrets for ${archetype || 'unknown'} with ${knownPowers.length} powers, ${knownTechniques.length} techniques`
    );

    return suggestions;
  }

  /**
   * Score a single Force Secret
   * @private
   */
  static _scoreSecret(secret, knownPowers = [], knownTechniques = [], archetype = '', institution = '', options = {}) {
    const enrichedData = secret.flags?.swse?.suggestion ||
                        secret.system?.suggestion ||
                        {};

    const requiredCategories = enrichedData.requiredCategories || [];
    const minimumPowers = enrichedData.minimumPowers || 2;
    const minimumTechniques = enrichedData.minimumTechniques || 1;
    const archetypeBias = enrichedData.archetypeBias || {};
    const institutionBias = enrichedData.institutionBias || {};

    let requirementsMetCount = 0;
    const reasons = [];

    // Check Category Requirement (mandatory)
    if (requiredCategories.length === 0) {
      // No specific category requirement - more permissive
      requirementsMetCount++;
    } else {
      // Simplified check: if player has multiple powers, likely has some categories
      if (knownPowers.length >= minimumPowers) {
        requirementsMetCount++;
        reasons.push(`Demonstrated knowledge of relevant Force categories`);
      }
    }

    // Check Power Count (mandatory)
    if (knownPowers.length >= minimumPowers) {
      requirementsMetCount++;
      reasons.push(`Known ${knownPowers.length} Force Powers (requires ${minimumPowers})`);
    } else {
      reasons.push(`Need ${minimumPowers - knownPowers.length} more Force Powers`);
      return { tier: UNIFIED_TIERS.AVAILABLE, score: 0, reasons, requirementsMetCount: 0 };
    }

    // Check Technique Count (mandatory)
    if (knownTechniques.length >= minimumTechniques) {
      requirementsMetCount++;
      reasons.push(`Known ${knownTechniques.length} Force Techniques (requires ${minimumTechniques})`);
    } else {
      reasons.push(`Need ${minimumTechniques - knownTechniques.length} more Force Techniques`);
      return { tier: UNIFIED_TIERS.AVAILABLE, score: 0, reasons, requirementsMetCount: 0 };
    }

    // If we got here, mandatory requirements are met
    let score = 1.0;
    let tier = UNIFIED_TIERS.ABILITY_SYNERGY;

    // SECONDARY: Archetype Alignment
    const archetypeBonus = archetypeBias[archetype] || 1.0;
    score *= archetypeBonus;

    if (archetypeBonus >= FORCE_SECRET_ARCHETYPE_THRESHOLDS.PERFECT_FIT_MIN) {
      tier = UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW;
      reasons.push(`${archetype} path perfected`);
    } else if (archetypeBonus >= FORCE_SECRET_ARCHETYPE_THRESHOLDS.EXCELLENT_MATCH_MIN) {
      tier = UNIFIED_TIERS.PATH_CONTINUATION;
      reasons.push(`Strong ${archetype} alignment`);
    } else if (archetypeBonus > FORCE_SECRET_ARCHETYPE_THRESHOLDS.GOOD_MATCH_MIN) {
      tier = Math.max(tier, UNIFIED_TIERS.CATEGORY_SYNERGY);
      reasons.push(`${archetype} compatible`);
    }

    // TERTIARY: Institution Alignment
    const institutionBonus = institutionBias[institution] || 1.0;
    score *= institutionBonus;

    if (institutionBonus < FORCE_SECRET_INSTITUTION_THRESHOLDS.ANTI_ALIGNMENT_MAX) {
      score *= FORCE_SECRET_INSTITUTION_THRESHOLDS.ANTI_ALIGNMENT_PENALTY; // Heavily discourage anti-alignment (dark secret for Jedi, etc)
      reasons.push(`⚠️ Warning: Conflicts with ${institution} philosophy`);
    } else if (institutionBonus > FORCE_SECRET_INSTITUTION_THRESHOLDS.ALIGNED_MIN) {
      reasons.push(`Aligned with ${institution} teachings`);
    }

    return {
      tier,
      score: Number(score.toFixed(2)),
      reasons,
      requirementsMetCount
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
   * Get list of Force Techniques known by character
   * @private
   */
  static _getKnownForceTechniques(actor = null) {
    const techniques = [];

    if (actor) {
      // From full actor (levelup/play mode)
      actor.items
        .filter(item => item.type === ITEM_TYPES.FEAT && item.system?.featType === ITEM_TYPES.FEAT_TYPE_FORCE)
        .forEach(tech => techniques.push(tech.name));
    }

    return techniques;
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
   * Determine character's institution/alignment
   * @private
   */
  static _getInstitution(actor = null) {
    const dsp = actor?.system?.swse?.darkSidePoints || 0;
    const maxDSP = actor?.system?.swse?.maxDarkSidePoints || 1;

    // Check explicit institution
    const explicit = actor?.system?.swse?.institution;
    if (explicit) {
      return explicit.toLowerCase();
    }

    // Infer from dark side points
    const dspPercent = maxDSP > 0 ? dsp / maxDSP : 0;
    if (dspPercent > FORCE_SECRET_DSP_THRESHOLDS.SITH_RATIO) {return 'sith';}
    if (dspPercent < FORCE_SECRET_DSP_THRESHOLDS.JEDI_RATIO) {return 'jedi';}
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
   * Map base class to archetype
   * @private
   */
  static _getArchetypeForBaseClass(baseClass = '') {
    return BASE_ARCHETYPE_MAP[baseClass] || DEFAULT_ARCHETYPE;
  }

  /**
   * Simple suggestion: suggest first available secret not yet selected
   * @private
   */
  static _simpleSuggest(available = [], selected = new Set()) {
    for (const secret of available) {
      const id = secret.id || secret._id || secret.name;
      if (!selected.has(id)) {
        return secret;
      }
    }
    return available[0] || null;
  }
}
