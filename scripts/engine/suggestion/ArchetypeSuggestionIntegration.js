/**
 * ArchetypeSuggestionIntegration
 *
 * Bridges the ArchetypeAffinityEngine with the suggestion generation system.
 *
 * Responsibilities:
 * - Apply archetype weighting to suggestion scores
 * - Generate archetype-aware explanations
 * - Integrate with existing BuildCoherenceAnalyzer scores
 * - Manage affinity lifecycle (caching, drift detection, updates)
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import {
  calculateArchetypeAffinity,
  weightSuggestions,
  explainSuggestion,
  getActorAffinity,
  recalculateActorAffinity,
  extractCharacterState,
  flattenArchetypes,
  affinityNeedsRecompute,
  loadArchetypeData
} from "/systems/foundryvtt-swse/scripts/engine/suggestion/ArchetypeAffinityEngine.js';

// ─────────────────────────────────────────────────────────────
// SUGGESTION WEIGHTING
// ─────────────────────────────────────────────────────────────

/**
 * Apply archetype affinity boost to a suggestion score
 *
 * Takes an existing suggestion score (from coherence analyzer, etc)
 * and applies archetype affinity bias on top.
 *
 * @param {string} suggestionName - Item name
 * @param {number} baseScore - Score from other systems (0-1)
 * @param {Object} archetypeAffinity - Current affinity scores
 * @param {Object} archetypes - Flattened archetypes
 * @param {number} boostMultiplier - How much to boost (default 0.75)
 * @returns {number} Weighted score
 */
export function applyArchetypeWeighting(
  suggestionName,
  baseScore,
  archetypeAffinity,
  archetypes,
  boostMultiplier = 0.75
) {
  try {
    const baseSuggestions = { [suggestionName]: baseScore };
    const weighted = weightSuggestions(baseSuggestions, archetypeAffinity, archetypes);
    return weighted[suggestionName] || baseScore;
  } catch (err) {
    SWSELogger.warn('[ArchetypeSuggestionIntegration] Error applying weighting:', err);
    return baseScore;
  }
}

/**
 * Apply archetype weighting to multiple suggestions
 *
 * @param {Array<Object>} suggestions - [{ name, score }, ...]
 * @param {Object} archetypeAffinity
 * @param {Object} archetypes
 * @returns {Array<Object>} Weighted suggestions with metadata
 */
export function applySuggestionWeighting(suggestions, archetypeAffinity, archetypes) {
  try {
    const baseSuggestions = {};

    // Convert suggestions to score map
    for (const suggestion of suggestions) {
      baseSuggestions[suggestion.name] = suggestion.score || 0;
    }

    // Apply archetype weighting
    const weighted = weightSuggestions(baseSuggestions, archetypeAffinity, archetypes);

    // Add affinity boost metadata
    const result = [];
    for (const suggestion of suggestions) {
      const newScore = weighted[suggestion.name];
      const boost = newScore - (suggestion.score || 0);

      result.push({
        ...suggestion,
        archetypeWeightedScore: newScore,
        archetypeBoost: Math.round(boost * 1000) / 1000,
        hasAffinityBoost: boost > 0.001
      });
    }

    return result;
  } catch (err) {
    SWSELogger.warn('[ArchetypeSuggestionIntegration] Error weighting suggestions:', err);
    return suggestions.map(s => ({
      ...s,
      archetypeWeightedScore: s.score,
      archetypeBoost: 0,
      hasAffinityBoost: false
    }));
  }
}

// ─────────────────────────────────────────────────────────────
// EXPLANATION INTEGRATION
// ─────────────────────────────────────────────────────────────

/**
 * Get archetype-aware explanation for a suggestion
 *
 * @param {string} suggestionName
 * @param {Actor} actor
 * @returns {Promise<string>} Explanation text
 */
export async function getArchetypeExplanation(suggestionName, actor) {
  try {
    const affinityResult = await getActorAffinity(actor);

    if (affinityResult.error || Object.keys(affinityResult.affinity).length === 0) {
      return 'This is a solid option for your character build.';
    }

    const data = await loadArchetypeData();
    const archetypes = flattenArchetypes(data);
    return explainSuggestion(suggestionName, affinityResult.affinity, archetypes);
  } catch (err) {
    SWSELogger.warn('[ArchetypeSuggestionIntegration] Error getting explanation:', err);
    return 'This is a solid option for your character build.';
  }
}

/**
 * Get explanations for multiple suggestions
 *
 * @param {Array<string>} suggestionNames
 * @param {Actor} actor
 * @returns {Promise<Object>} { name: explanation }
 */
export async function getArchetypeExplanationBatch(suggestionNames, actor) {
  try {
    const affinityResult = await getActorAffinity(actor);

    if (affinityResult.error || Object.keys(affinityResult.affinity).length === 0) {
      const result = {};
      for (const name of suggestionNames) {
        result[name] = 'This is a solid option for your character build.';
      }
      return result;
    }

    const data = await loadArchetypeData();
    const archetypes = flattenArchetypes(data);
    const explanations = {};

    for (const name of suggestionNames) {
      explanations[name] = explainSuggestion(name, affinityResult.affinity, archetypes);
    }

    return explanations;
  } catch (err) {
    SWSELogger.warn('[ArchetypeSuggestionIntegration] Error batch explaining:', err);
    const result = {};
    for (const name of suggestionNames) {
      result[name] = 'This is a solid option for your character build.';
    }
    return result;
  }
}

// ─────────────────────────────────────────────────────────────
// ACTOR LIFECYCLE HOOKS
// ─────────────────────────────────────────────────────────────

/**
 * Called when character changes (feats added, talents selected, etc)
 * Updates affinity if character state changed
 *
 * @param {Actor} actor
 * @param {Array<string>} changedPaths - Paths that were updated
 * @returns {Promise<Object>} { updated: boolean, reason: string }
 */
export async function handleCharacterChange(actor, changedPaths = []) {
  try {
    // Only recalculate if relevant changes occurred
    const relevantChanges = changedPaths.some(path =>
      path.includes('items') ||  // Feats/talents
      path.includes('attributes')  // Ability scores
    );

    if (!relevantChanges && changedPaths.length > 0) {
      return { updated: false, reason: 'No relevant character changes' };
    }

    const stored = actor.system.flags?.swse?.archetypeAffinity;
    const characterState = extractCharacterState(actor);

    // Check if recomputation is needed
    if (stored && !affinityNeedsRecompute(stored, characterState)) {
      return { updated: false, reason: 'No state drift detected' };
    }

    // Recalculate
    const result = await recalculateActorAffinity(actor);

    return {
      updated: !!result.affinity,
      reason: 'Character state changed - affinity recalculated',
      stats: {
        archetypeCount: Object.keys(result.affinity || {}).length,
        prestigeHints: (result.buildGuidance?.prestigeHints || []).length
      }
    };
  } catch (err) {
    SWSELogger.error('[ArchetypeSuggestionIntegration] Error handling character change:', err);
    return { updated: false, error: err.message };
  }
}

/**
 * Called after character levels up
 * Recomputes affinity and checks for prestige path hints
 *
 * @param {Actor} actor
 * @returns {Promise<Object>} Update result
 */
export async function handleLevelUp(actor) {
  try {
    SWSELogger.log(`[ArchetypeSuggestionIntegration] Level up for ${actor.name}`);

    const result = await recalculateActorAffinity(actor);
    const buildGuidance = result.buildGuidance || {};

    // Check for new prestige hints
    const prestigeHints = buildGuidance.prestigeHints || [];
    const primaryHints = prestigeHints.filter(h => h.strength === 'primary');

    if (primaryHints.length > 0) {
      SWSELogger.log(
        `[ArchetypeSuggestionIntegration] New prestige paths detected for ${actor.name}:`,
        primaryHints.map(h => h.prestigeOptions).flat()
      );
    }

    return {
      updated: true,
      affinity: result.affinity,
      buildGuidance,
      prestigeHints
    };
  } catch (err) {
    SWSELogger.error('[ArchetypeSuggestionIntegration] Error handling level up:', err);
    return { updated: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────
// SUGGESTION ENGINE INTEGRATION HOOKS
// ─────────────────────────────────────────────────────────────

/**
 * Enhance a suggestion with archetype context
 *
 * Takes a suggestion object and adds:
 * - archetypeWeightedScore: Score adjusted by archetype affinity
 * - archetypeExplanation: Narrative explanation
 * - affinityBoost: Raw boost amount
 * - hasArchetypeBoost: Whether this suggestion has a boost
 *
 * @param {Object} suggestion - { id, name, score, type, ... }
 * @param {Actor} actor
 * @returns {Promise<Object>} Enhanced suggestion
 */
export async function enhanceSuggestionWithArchetype(suggestion, actor) {
  try {
    const affinityResult = await getActorAffinity(actor);

    if (affinityResult.error || Object.keys(affinityResult.affinity).length === 0) {
      return {
        ...suggestion,
        archetypeWeightedScore: suggestion.score,
        archetypeExplanation: 'This is a solid option for your character build.',
        affinityBoost: 0,
        hasArchetypeBoost: false
      };
    }

    const data = await loadArchetypeData();
    const archetypes = flattenArchetypes(data);
    const archetypeAffinity = affinityResult.affinity;

    // Apply weighting
    const weightedScore = applyArchetypeWeighting(
      suggestion.name,
      suggestion.score || 0,
      archetypeAffinity,
      archetypes
    );

    const boost = weightedScore - (suggestion.score || 0);

    // Get explanation
    const explanation = explainSuggestion(suggestion.name, archetypeAffinity, archetypes);

    return {
      ...suggestion,
      archetypeWeightedScore: Math.round(weightedScore * 10000) / 10000,
      archetypeExplanation: explanation,
      affinityBoost: Math.round(boost * 10000) / 10000,
      hasArchetypeBoost: boost > 0.001,
      affinityData: archetypeAffinity
    };
  } catch (err) {
    SWSELogger.warn('[ArchetypeSuggestionIntegration] Error enhancing suggestion:', err);
    return {
      ...suggestion,
      archetypeWeightedScore: suggestion.score,
      archetypeExplanation: 'This is a solid option for your character build.',
      affinityBoost: 0,
      hasArchetypeBoost: false
    };
  }
}

/**
 * Batch enhance multiple suggestions
 *
 * @param {Array<Object>} suggestions
 * @param {Actor} actor
 * @returns {Promise<Array<Object>>} Enhanced suggestions
 */
export async function enhanceSuggestionsWithArchetype(suggestions, actor) {
  try {
    const results = [];

    for (const suggestion of suggestions) {
      const enhanced = await enhanceSuggestionWithArchetype(suggestion, actor);
      results.push(enhanced);
    }

    return results;
  } catch (err) {
    SWSELogger.error('[ArchetypeSuggestionIntegration] Error batch enhancing:', err);
    return suggestions.map(s => ({
      ...s,
      archetypeWeightedScore: s.score,
      archetypeExplanation: 'This is a solid option for your character build.',
      affinityBoost: 0,
      hasArchetypeBoost: false
    }));
  }
}

// ─────────────────────────────────────────────────────────────
// PRESTIGE PATH INTEGRATION
// ─────────────────────────────────────────────────────────────

/**
 * Get prestige path recommendations for an actor
 *
 * Returns structured prestige hints from buildGuidance.prestigeHints
 *
 * @param {Actor} actor
 * @returns {Promise<Array<Object>>} Prestige hints
 */
export async function getPrestigePathRecommendations(actor) {
  try {
    const buildGuidance = actor.system.flags?.swse?.buildGuidance;

    if (!buildGuidance) {
      // Trigger affinity calculation if not yet done
      const result = await recalculateActorAffinity(actor);
      return result.buildGuidance?.prestigeHints || [];
    }

    return buildGuidance.prestigeHints || [];
  } catch (err) {
    SWSELogger.warn('[ArchetypeSuggestionIntegration] Error getting prestige recommendations:', err);
    return [];
  }
}

/**
 * Get primary archetype for an actor (highest affinity)
 *
 * @param {Actor} actor
 * @returns {Promise<Object|null>} { name, affinity, notes } or null
 */
export async function getPrimaryArchetype(actor) {
  try {
    const affinityResult = await getActorAffinity(actor);
    const archetypeAffinity = affinityResult.affinity || {};

    if (Object.keys(archetypeAffinity).length === 0) {
      return null;
    }

    // Find highest affinity
    let maxName = null;
    let maxAffinity = 0;

    for (const [name, affinity] of Object.entries(archetypeAffinity)) {
      if (affinity > maxAffinity) {
        maxAffinity = affinity;
        maxName = name;
      }
    }

    if (!maxName) {
      return null;
    }

    // Find archetype details
    const data = await loadArchetypeData();
    const archetypes = flattenArchetypes(data);
    const archetype = archetypes[maxName];

    return {
      name: archetype?.name || maxName,
      affinity: maxAffinity,
      notes: archetype?.notes || 'Character build archetype',
      rawName: maxName
    };
  } catch (err) {
    SWSELogger.warn('[ArchetypeSuggestionIntegration] Error getting primary archetype:', err);
    return null;
  }
}

/**
 * Format affinity scores for display
 *
 * @param {Object} affinity - { archetypeName: score }
 * @param {number} topN - Show top N archetypes
 * @returns {Array<Object>} Formatted for display
 */
export function formatAffinityForDisplay(affinity, topN = 3) {
  return Object.entries(affinity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([name, score]) => ({
      name,
      score: Math.round(score * 1000) / 1000,
      percentage: Math.round(score * 100),
      bar: '█'.repeat(Math.round(score * 10)) + '░'.repeat(10 - Math.round(score * 10))
    }));
}
