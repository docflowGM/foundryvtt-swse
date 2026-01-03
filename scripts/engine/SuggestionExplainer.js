/**
 * SuggestionExplainer
 *
 * Generates one-line "why" explanations for suggestions.
 * Template system with dynamic context filling.
 * Avoids repetition by tracking recently-used templates.
 *
 * Phase 1B: Stubs only. Phase 1C: Implement templates + filling.
 */

import { SWSELogger } from '../utils/logger.js';

export class SuggestionExplainer {

  /**
   * Generate one-line explanation for why a suggestion is made
   * @param {Object} suggestion - { itemName, tier, theme, category }
   * @param {Actor} actor
   * @param {Object} context - { mentorAlignment, classSynergy, buildCoherence, anchor, synergy }
   * @returns {string} One-line explanation (max ~100 chars)
   */
  static generateExplanation(suggestion, actor, context) {
    // TODO: Phase 1C - Implement explanation generation
    // Template selection logic based on suggestion properties
    // Fill in dynamic variables from context
    return "Legal option for your character.";
  }

  /**
   * Get all available explanation templates
   * @returns {Object} { templateKey: template string, ... }
   */
  static getTemplates() {
    // TODO: Phase 1C - Return template registry
    return {
      prestige_path: "Step toward {prestigeClass}—you're {percentComplete}% there.",
      anchor_support: "Strengthens your {anchorName} playstyle.",
      synergy_match: "{existingFeat} works perfectly with this.",
      theme_continuity: "You've been building {themeName}—this continues that path.",
      class_synergy: "Fits {className}'s core mechanics.",
      gap_fill: "Your group lacks {partyRole}—this could help.",
      skill_enhancement: "Boosts a skill you rely on.",
      attribute_alignment: "Uses your strong {highestAttribute}.",
      chain_continuation: "Builds on {precedingFeat}.",
      fallback: "Legal option for your character."
    };
  }

  /**
   * Fill template variables with dynamic context
   * @param {string} template
   * @param {Object} variables - { prestigeClass, anchorName, themeName, etc }
   * @returns {string} Filled template
   */
  static fillTemplate(template, variables) {
    // TODO: Phase 1C - Implement variable substitution
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(`{${key}}`, value || 'unknown');
    }
    return result;
  }

  /**
   * Check if explanation has been recently used (avoid repetition)
   * @param {string} explanation
   * @param {Actor} actor
   * @param {number} levelsBack - Default 3
   * @returns {boolean} Is this explanation fresh?
   */
  static isExplanationFresh(explanation, actor, levelsBack = 3) {
    // TODO: Phase 1C - Implement freshness check
    // Check actor.system.suggestionEngine.explanationContext.lastUsedTemplates
    return true;
  }

  /**
   * Get explanation template variant (if primary was recent)
   * @param {string} templateKey
   * @param {Actor} actor
   * @returns {string} Alternative template variant
   */
  static getTemplateVariant(templateKey, actor) {
    // TODO: Phase 1C - Implement variant logic
    return this.getTemplates()[templateKey] || this.getTemplates().fallback;
  }

  /**
   * Initialize explanation context
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async initializeStorage(actor) {
    // TODO: Phase 1C - Implement init
    if (!actor.system.suggestionEngine) {
      actor.system.suggestionEngine = {};
    }
    if (!actor.system.suggestionEngine.explanationContext) {
      actor.system.suggestionEngine.explanationContext = {
        lastUsedTemplates: {},
        currentAnchorName: null,
        currentTheme: null,
        partyGapRole: null,
        recentlyTakenItems: []
      };
    }
    SWSELogger.log('[SuggestionExplainer] Storage initialized');
  }
}
