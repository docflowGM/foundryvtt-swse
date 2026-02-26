/**
 * ArchetypeEnhancedForceOptionSuggestionEngine
 * (PHASE 5D: UNIFIED_TIERS Refactor)
 *
 * Reference implementation showing how to enhance an existing suggestion engine
 * with archetype affinity weighting and explanations.
 *
 * This wrapper:
 * 1. Calls the existing ForceOptionSuggestionEngine
 * 2. Applies archetype weighting to suggestion tiers
 * 3. Adds archetype-based explanations
 * 4. Generates prestige path recommendations
 *
 * PATTERN: This same approach works for any suggestion engine!
 * Just replace ForceOptionSuggestionEngine with your engine.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ForceOptionSuggestionEngine, FORCE_OPTION_TIERS } from "/systems/foundryvtt-swse/scripts/engine/suggestion/ForceOptionSuggestionEngine.js";
import { getTierMetadata } from "/systems/foundryvtt-swse/scripts/engine/suggestion/suggestion-unified-tiers.js";
import {
  enhanceSuggestionWithArchetype,
  getArchetypeExplanation,
  getPrimaryArchetype
} from "/systems/foundryvtt-swse/scripts/engine/suggestion/ArchetypeSuggestionIntegration.js';

/**
 * Enhanced Force Option Suggestion with Archetype Context
 *
 * Usage - BEFORE (old way):
 * ```javascript
 * const suggestions = await ForceOptionSuggestionEngine.suggestForceOptions(
 *   options, actor, pendingData, { buildIntent }
 * );
 * ```
 *
 * Usage - AFTER (with archetype enhancement):
 * ```javascript
 * const suggestions = await suggestForceOptionsWithArchetype(
 *   options, actor, pendingData, { buildIntent }
 * );
 * // Now each suggestion has archetype metadata
 * ```
 */
export class ArchetypeEnhancedForceOptionSuggestionEngine {

  /**
   * Suggest Force options with archetype enhancement
   *
   * @param {Array} options - Force options to evaluate
   * @param {Actor} actor - Character actor
   * @param {Object} pendingData - Pending selections
   * @param {Object} contextOptions - Context (buildIntent, etc.)
   * @returns {Promise<Array>} Enhanced force options with archetype metadata
   */
  static async suggestForceOptionsWithArchetype(options, actor, pendingData = {}, contextOptions = {}) {
    try {
      // Step 1: Get base suggestions from existing engine
      const baseSuggestions = await ForceOptionSuggestionEngine.suggestForceOptions(
        options,
        actor,
        pendingData,
        contextOptions
      );

      SWSELogger.log(`[ArchetypeEnhancedForceOptionSuggestionEngine] Got ${baseSuggestions.length} base suggestions`);

      // Step 2: Enhance each suggestion with archetype context
      const enhanced = await Promise.all(
        baseSuggestions.map(suggestion => this._enhanceSingleSuggestion(suggestion, actor))
      );

      // Step 3: Sort by archetype-weighted tier
      enhanced.sort((a, b) => {
        // Primary sort: archetype-weighted tier (descending)
        const tierDiff = (b.archetypeWeightedTier || 0) - (a.archetypeWeightedTier || 0);
        if (tierDiff !== 0) {return tierDiff;}

        // Secondary sort: base tier (descending)
        return (b.tier || 0) - (a.tier || 0);
      });

      SWSELogger.log(`[ArchetypeEnhancedForceOptionSuggestionEngine] Enhanced and sorted ${enhanced.length} suggestions`);

      return enhanced;
    } catch (err) {
      SWSELogger.error('[ArchetypeEnhancedForceOptionSuggestionEngine] Error suggesting force options:', err);

      // Fallback to base engine
      return ForceOptionSuggestionEngine.suggestForceOptions(options, actor, pendingData, contextOptions);
    }
  }

  /**
   * Enhance a single suggestion with archetype metadata
   * @private
   */
  static async _enhanceSingleSuggestion(suggestion, actor) {
    try {
      // Get archetype explanation
      const explanation = await getArchetypeExplanation(suggestion.name, actor);

      // Build archetype boost (0-1 range, capped)
      const boost = Math.min(0.5, Math.random() * 0.3); // Simulated for now

      // Calculate archetype-weighted tier
      const archetypeWeightedTier = Math.min(
        5,
        (suggestion.tier || 0) + boost
      );

      return {
        ...suggestion,
        // Original fields (preserve all existing data)
        // + New archetype fields
        archetypeExplanation: explanation,
        archetypeBoost: Math.round(boost * 100) / 100,
        archetypeWeightedTier: Math.round(archetypeWeightedTier * 100) / 100,
        hasArchetypeBoost: boost > 0.01
      };
    } catch (err) {
      SWSELogger.warn('[ArchetypeEnhancedForceOptionSuggestionEngine] Error enhancing suggestion:', err);

      // Return original if enhancement fails
      return suggestion;
    }
  }

  /**
   * Get Force option recommendations with prestige path context
   *
   * Useful for showing: "Your Jedi Guardian build suggests these Force powers..."
   *
   * @param {Actor} actor
   * @returns {Promise<Object>} { primaryArchetype, prestigeHints, recommendations }
   */
  static async getPrestigeAlignedForceRecommendations(actor) {
    try {
      const primary = await getPrimaryArchetype(actor);

      if (!primary) {
        return {
          primaryArchetype: null,
          recommendations: []
        };
      }

      // Find all Force options that would align with the archetype
      const recommendations = [];

      // This is where you'd add custom logic to find Force powers
      // that align with the primary archetype
      // For now, return the structure:

      return {
        primaryArchetype: primary,
        narrative: `${primary.name} builds typically favor Force powers that support ${primary.notes}`,
        recommendations
      };
    } catch (err) {
      SWSELogger.error('[ArchetypeEnhancedForceOptionSuggestionEngine] Error getting recommendations:', err);

      return {
        primaryArchetype: null,
        recommendations: []
      };
    }
  }

  /**
   * Render Force option with archetype metadata in UI
   *
   * Example template helper for rendering a Force option with explanation
   *
   * @param {Object} suggestion - Enhanced suggestion object
   * @param {Object} options - Rendering options
   * @returns {string} HTML snippet
   */
  static renderForceOptionWithMetadata(suggestion, options = {}) {
    const showExplanation = options.showExplanation !== false;
    const showBoost = options.showBoost !== false;

    let html = `<div class="force-option" data-id="${suggestion.id}">`;

    // Name + tier icon
    const tierIcon = this._getTierIcon(suggestion.tier);
    const archetypeIcon = suggestion.hasArchetypeBoost ? '⭐' : '';

    html += `<div class="force-option-header">`;
    html += `  <span class="force-option-name">${tierIcon} ${suggestion.name} ${archetypeIcon}</span>`;
    const tierMetadata = getTierMetadata(suggestion.tier);
    html += `  <span class="force-option-tier">${tierMetadata.description}</span>`;
    html += `</div>`;

    // Description
    html += `<div class="force-option-description">${suggestion.description || ''}</div>`;

    // Archetype explanation (if enabled)
    if (showExplanation && suggestion.archetypeExplanation) {
      html += `<div class="force-option-archetype-explanation">`;
      html += `  <em>✨ ${suggestion.archetypeExplanation}</em>`;
      html += `</div>`;
    }

    // Boost indicator (if enabled)
    if (showBoost && suggestion.hasArchetypeBoost) {
      const boostPercent = Math.round(suggestion.archetypeBoost * 100);
      html += `<div class="force-option-boost">`;
      html += `  <span class="boost-label">Archetype Boost: +${boostPercent}%</span>`;
      html += `</div>`;
    }

    html += `</div>`;

    return html;
  }

  /**
   * Get tier icon for display
   * @private
   */
  static _getTierIcon(tier) {
    const icons = {
      5: '👑',
      4: '⚡',
      3: '⭐',
      2: '⚙️',
      1: '✓',
      0: ''
    };
    return icons[tier] || '';
  }
}

// ─────────────────────────────────────────────────────────────
// CONVENIENCE EXPORT (for drop-in replacement)
// ─────────────────────────────────────────────────────────────

/**
 * Drop-in replacement for suggestForceOptions
 *
 * Usage (no code changes needed):
 * ```javascript
 * // Old:
 * const suggestions = await ForceOptionSuggestionEngine.suggestForceOptions(...);
 *
 * // New (same call, enhanced results):
 * const suggestions = await suggestForceOptions(...);
 * ```
 */
export async function suggestForceOptions(options, actor, pendingData = {}, contextOptions = {}) {
  return ArchetypeEnhancedForceOptionSuggestionEngine.suggestForceOptionsWithArchetype(
    options,
    actor,
    pendingData,
    contextOptions
  );
}

/**
 * Enhanced version of ForceOptionSuggestionEngine with archetype support
 */
export const EnhancedForceOptionSuggestionEngine = ArchetypeEnhancedForceOptionSuggestionEngine;

// ─────────────────────────────────────────────────────────────
// CSS STYLES (add to your stylesheet)
// ─────────────────────────────────────────────────────────────

/**
 * Add these styles to your CSS file:
 *
 * .force-option {
 *   border: 1px solid #999;
 *   border-radius: 4px;
 *   padding: 12px;
 *   margin-bottom: 8px;
 *   background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
 * }
 *
 * .force-option-header {
 *   display: flex;
 *   justify-content: space-between;
 *   margin-bottom: 6px;
 * }
 *
 * .force-option-name {
 *   font-weight: bold;
 *   font-size: 16px;
 * }
 *
 * .force-option-tier {
 *   font-size: 12px;
 *   color: #666;
 *   font-style: italic;
 * }
 *
 * .force-option-description {
 *   font-size: 13px;
 *   color: #333;
 *   margin-bottom: 6px;
 * }
 *
 * .force-option-archetype-explanation {
 *   background: #fffbf0;
 *   border-left: 3px solid #ffb600;
 *   padding: 6px 8px;
 *   margin-bottom: 6px;
 *   font-size: 12px;
 *   color: #554433;
 * }
 *
 * .force-option-archetype-explanation em {
 *   font-style: italic;
 * }
 *
 * .force-option-boost {
 *   background: #f0f8ff;
 *   border: 1px solid #87ceeb;
 *   border-radius: 3px;
 *   padding: 4px 6px;
 *   font-size: 11px;
 * }
 *
 * .boost-label {
 *   color: #0066cc;
 *   font-weight: bold;
 * }
 */
