/**
 * Mentor Interaction Integration for Level-Up
 *
 * PHASE 4: Reconnects mentor orchestrator to real progression milestones.
 *
 * This integration layer:
 * - Enriches mentor suggestions with orchestrator reasoning
 * - Hooks mentor responses to actual progression decisions
 * - Updates mentor memory on level-up completion
 * - Does NOT change existing UI behavior
 * - Is purely additive enhancement
 *
 * Usage:
 *   const enhanced = await MentorInteractionIntegration.enrichMentorSuggestion(
 *     actor, mentor, suggestion, 'feat_selection'
 *   );
 */

import { MentorInteractionOrchestrator } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-interaction-orchestrator.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class MentorInteractionIntegration {
  /**
   * Enrich a mentor suggestion with orchestrator reasoning
   * Safe to call - returns enhanced suggestion or original on error
   *
   * @param {Actor} actor - The character being leveled up
   * @param {Object} mentor - Mentor configuration
   * @param {Object} suggestion - Suggestion object (feat/talent/class/power)
   * @param {string} context - Decision context ('feat_selection', 'talent_selection', etc.)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Enhanced suggestion with mentor reasoning
   */
  static async enrichMentorSuggestion(actor, mentor, suggestion, context, options = {}) {
    if (!actor || !mentor || !suggestion) {
      return suggestion; // Return original on missing data
    }

    try {
      const mentorId = mentor.key || mentor.id || mentor.slug;
      if (!mentorId) {
        return suggestion;
      }

      // Map context to orchestrator mode
      const mode = this._mapContextToMode(context);
      if (!mode) {
        return suggestion; // Unknown context, return original
      }

      // Call orchestrator to get reasoning
      const reasoning = await MentorInteractionOrchestrator.handle({
        mode,
        actor,
        mentorId,
        suggestion,
        item: suggestion, // Item being suggested
        pendingData: options.pendingData || {}
      });

      // Merge reasoning into suggestion
      if (reasoning && reasoning.primaryAdvice) {
        return {
          ...suggestion,
          mentorAdvice: reasoning.primaryAdvice,
          mentorAtoms: reasoning.atoms || [],
          mentorReasons: reasoning.reasons || [],
          strategicInsight: reasoning.strategicInsight,
          mentorConfidence: reasoning.confidence
        };
      }

      return suggestion;
    } catch (err) {
      SWSELogger.warn(
        `[MentorInteractionIntegration] Failed to enrich suggestion: ${err.message}`,
        { actor: actor?.name, context }
      );
      return suggestion; // Return original on error
    }
  }

  /**
   * Record a mentor suggestion being applied
   * Updates mentor memory to track selections
   *
   * @param {Actor} actor - The character
   * @param {Object} mentor - Mentor configuration
   * @param {Object} suggestion - Suggestion that was applied
   * @param {string} context - Decision context
   * @returns {Promise<void>}
   */
  static async recordMentorDecision(actor, mentor, suggestion, context) {
    try {
      const mentorId = mentor.key || mentor.id || mentor.slug;
      if (!mentorId || !actor?.id) {
        return;
      }

      // Get or create mentor memory
      const memories = (await actor.getFlag('foundryvtt-swse', 'mentorMemories')) || {};
      const mentorMem = memories[mentorId] || {};

      // Track decision
      if (!mentorMem.recentDecisions) {
        mentorMem.recentDecisions = [];
      }

      mentorMem.recentDecisions.push({
        context,
        itemId: suggestion._id || suggestion.id || suggestion.name,
        itemName: suggestion.name,
        timestamp: Date.now(),
        tier: suggestion.tier,
        confidence: suggestion.confidence
      });

      // Keep last 10 decisions
      if (mentorMem.recentDecisions.length > 10) {
        mentorMem.recentDecisions = mentorMem.recentDecisions.slice(-10);
      }

      memories[mentorId] = mentorMem;

      // Update flag
      await actor.setFlag('foundryvtt-swse', 'mentorMemories', memories);

      SWSELogger.log(`[MentorInteractionIntegration] Recorded mentor decision:`, {
        mentor: mentorId,
        context,
        item: suggestion.name
      });
    } catch (err) {
      SWSELogger.warn(
        `[MentorInteractionIntegration] Failed to record mentor decision: ${err.message}`
      );
    }
  }

  /**
   * Generate end-of-levelup mentor reflection
   * Returns mentor's strategic assessment of the levelup choices
   *
   * @param {Actor} actor - The character who just leveled up
   * @param {Object} mentor - Mentor configuration
   * @param {Object} pendingData - The levelup selections
   * @returns {Promise<string>} Mentor's reflection text
   */
  static async generateLevelupReflection(actor, mentor, pendingData) {
    try {
      const mentorId = mentor.key || mentor.id || mentor.slug;
      if (!mentorId) {
        return null;
      }

      // Call orchestrator in reflection mode
      const reflection = await MentorInteractionOrchestrator.handle({
        mode: 'reflection',
        actor,
        mentorId
      });

      if (reflection && reflection.primaryAdvice) {
        return reflection.primaryAdvice;
      }

      return null;
    } catch (err) {
      SWSELogger.warn(
        `[MentorInteractionIntegration] Failed to generate reflection: ${err.message}`
      );
      return null;
    }
  }

  /**
   * Get mentor's trajectory advice for next progression
   * Forward-looking strategic guidance
   *
   * @param {Actor} actor - The character
   * @param {Object} mentor - Mentor configuration
   * @returns {Promise<Array>} Array of priorities/advice
   */
  static async getTrajectoryAdvice(actor, mentor) {
    try {
      const mentorId = mentor.key || mentor.id || mentor.slug;
      if (!mentorId) {
        return null;
      }

      // Call orchestrator in trajectory mode
      const trajectory = await MentorInteractionOrchestrator.handle({
        mode: 'trajectory',
        actor,
        mentorId
      });

      if (trajectory && trajectory.priorities) {
        return trajectory.priorities;
      }

      return null;
    } catch (err) {
      SWSELogger.warn(
        `[MentorInteractionIntegration] Failed to get trajectory advice: ${err.message}`
      );
      return null;
    }
  }

  /**
   * Map levelup context to mentor orchestrator mode
   * @private
   */
  static _mapContextToMode(context) {
    switch (context) {
      case 'feat_selection':
      case 'talent_selection':
      case 'class_selection':
      case 'force_power_selection':
      case 'force_secret_selection':
      case 'force_technique_selection':
      case 'skill_selection':
      case 'attribute_selection':
        return 'selection'; // Suggestion/selection mode

      case 'levelup_complete':
      case 'levelup_reflection':
        return 'reflection'; // End-of-levelup reflection

      case 'trajectory_planning':
        return 'trajectory'; // Forward-looking planning

      default:
        return null;
    }
  }
}

export default MentorInteractionIntegration;
