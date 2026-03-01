/**
 * MENTOR INTERACTION ORCHESTRATOR
 *
 * Coordinates three interaction modes for mentor advisory:
 * 1. Selection Mode - During level-up (uses SuggestionEngine)
 * 2. Reflection Mode - Character sheet review (uses BuildAnalysisEngine)
 * 3. Hybrid Mode - Choice evaluation in build context (combines both)
 *
 * This orchestrator has NO side effects:
 * - Does NOT modify SuggestionEngine
 * - Does NOT modify BuildAnalysisEngine
 * - Does NOT modify MentorJudgmentEngine
 * - Does NOT mutate actor
 * - Is purely deterministic
 * - Preserves both architecture A and B
 *
 * ARCHITECTURAL BOUNDARY:
 * - Suggestion output from SuggestionEngine (Architecture A) is used directly
 * - Analysis output from BuildAnalysisEngine (Architecture B) is converted to advisory atoms
 * - Mentor rendering uses existing systems (MentorJudgmentEngine + MentorAtomPhrases)
 * - No refactoring of existing systems
 */

import { SuggestionEngine } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionEngine.js";
import { BuildAnalysisEngine } from "/systems/foundryvtt-swse/scripts/engine/analysis/build-analysis-engine.js";
import { MentorJudgmentEngine } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-judgment-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class MentorInteractionOrchestrator {
  /**
   * Handle mentor interaction for a given mode and context
   *
   * @param {Object} context - Interaction context
   * @param {string} context.mode - "selection", "reflection", or "hybrid"
   * @param {Object} context.actor - Foundry actor document
   * @param {Object} context.mentorId - Mentor ID (e.g., "miraj", "lead")
   * @param {Object} context.suggestion - Optional: suggestion object (for selection/hybrid)
   * @param {Object} context.item - Optional: item object (feat/talent being selected)
   * @param {Object} context.pendingData - Optional: pending level-up selections
   *
   * @returns {Promise<Object>} Structured advisory output
   *   {
   *     mode: "selection" | "reflection" | "hybrid",
   *     primaryAdvice: string,
   *     strategicInsight?: string,
   *     metrics?: object,
   *     conflicts?: array,
   *     deterministic: true
   *   }
   */
  static async handle(context) {
    try {
      // Validate context
      const { mode, actor, mentorId, suggestion, item, pendingData = {} } = context;

      if (!actor) {
        throw new Error("[MentorInteractionOrchestrator] Missing actor");
      }

      if (!mode || !["selection", "reflection", "hybrid"].includes(mode)) {
        throw new Error(`[MentorInteractionOrchestrator] Invalid mode: ${mode}`);
      }

      if (!mentorId) {
        throw new Error("[MentorInteractionOrchestrator] Missing mentorId");
      }

      // Route to appropriate handler
      switch (mode) {
        case "selection":
          return await this._handleSelectionMode(actor, mentorId, suggestion, item);
        case "reflection":
          return await this._handleReflectionMode(actor, mentorId);
        case "hybrid":
          return await this._handleHybridMode(actor, mentorId, suggestion, item, pendingData);
        default:
          throw new Error(`[MentorInteractionOrchestrator] Unhandled mode: ${mode}`);
      }
    } catch (error) {
      SWSELogger.error("[MentorInteractionOrchestrator] Error:", error);
      // Return safe fallback
      return {
        mode: context?.mode || "unknown",
        primaryAdvice: "The mentor is silent.",
        deterministic: true,
        error: error.message
      };
    }
  }

  /**
   * SELECTION MODE: Level-up suggestion
   * Uses SuggestionEngine output directly
   * Returns mentor-voiced suggestion explanation
   *
   * @private
   */
  static async _handleSelectionMode(actor, mentorId, suggestion, item) {
    // If no suggestion provided, return neutral response
    if (!suggestion) {
      return {
        mode: "selection",
        primaryAdvice: this._getMentorNeutralPhrase(mentorId),
        deterministic: true
      };
    }

    // Extract tier and reason from suggestion
    const tier = suggestion.tier || 0;
    const reasonCode = suggestion.reasonCode || "FALLBACK";
    const atoms = suggestion.reason?.atoms || [];

    // Generate mentor response using existing MentorJudgmentEngine
    const mentorResponse = await this._renderMentorResponse(
      mentorId,
      reasonCode,
      tier,
      atoms
    );

    return {
      mode: "selection",
      primaryAdvice: mentorResponse,
      suggestionTier: tier,
      reasonCode: reasonCode,
      confidence: suggestion.confidence || 0,
      deterministic: true
    };
  }

  /**
   * REFLECTION MODE: Character sheet review
   * Uses BuildAnalysisEngine analysis
   * Converts conflict/strength signals to mentor advisory atoms
   * Returns structured advisory summary
   *
   * @private
   */
  static async _handleReflectionMode(actor, mentorId) {
    // Analyze actor with BuildAnalysisEngine
    const analysis = await BuildAnalysisEngine.analyze(actor);

    // Extract signals
    const conflictSignals = analysis.conflictSignals || [];
    const strengthSignals = analysis.strengthSignals || [];
    const metrics = analysis.metrics || {};

    // Convert signals to mentor advisory atoms
    const advisoryAtoms = this._signalsToAdvisoryAtoms(conflictSignals, strengthSignals);

    // Generate primary advisory response
    const primaryAdvice = await this._renderAdvisoryResponse(
      mentorId,
      advisoryAtoms,
      conflictSignals,
      strengthSignals
    );

    // Generate strategic insight if conflicts exist
    let strategicInsight = null;
    if (conflictSignals.length > 0) {
      strategicInsight = await this._renderStrategicInsight(
        mentorId,
        conflictSignals,
        metrics
      );
    }

    return {
      mode: "reflection",
      primaryAdvice: primaryAdvice,
      strategicInsight: strategicInsight,
      conflicts: this._formatConflicts(conflictSignals),
      strengths: this._formatStrengths(strengthSignals),
      metrics: {
        coherenceRating: metrics.coherenceScore || 0,
        buildBalance: metrics.classBalance || 0,
        specialization: metrics.specializationScore || 0
      },
      deterministic: true
    };
  }

  /**
   * HYBRID MODE: Choice evaluation in build context
   * Combines Selection Mode (immediate advice) with Reflection Mode (strategic context)
   * Both layers present in correct order
   * No content duplication
   *
   * @private
   */
  static async _handleHybridMode(actor, mentorId, suggestion, item, pendingData) {
    // Execute Selection Mode for the chosen item
    const selectionResult = await this._handleSelectionMode(
      actor,
      mentorId,
      suggestion,
      item
    );

    // Execute Reflection Mode for overall build state
    const reflectionResult = await this._handleReflectionMode(actor, mentorId);

    // Merge deterministically: immediate advice first, strategic second
    const merged = {
      mode: "hybrid",
      primaryAdvice: selectionResult.primaryAdvice,
      suggestedItem: item?.name || null,
      suggestionTier: selectionResult.suggestionTier || 0,
      deterministic: true
    };

    // Add strategic context ONLY if it differs from immediate advice
    // and adds material value (has conflicts or significant insights)
    if (reflectionResult.strategicInsight && reflectionResult.conflicts?.length > 0) {
      merged.strategicContext = {
        advice: reflectionResult.strategicInsight,
        conflicts: reflectionResult.conflicts,
        strengths: reflectionResult.strengths
      };
    }

    return merged;
  }

  /**
   * Convert conflict/strength signals to mentor advisory atoms
   * Maps signal categories → advisor-relevant atoms
   *
   * @private
   */
  static _signalsToAdvisoryAtoms(conflictSignals, strengthSignals) {
    const atoms = [];

    // Conflict atoms
    for (const signal of conflictSignals) {
      const atom = this._mapSignalToAtom(signal);
      if (atom && !atoms.includes(atom)) {
        atoms.push(atom);
      }
    }

    // Strength atoms (positive)
    for (const signal of strengthSignals) {
      const atom = this._mapStrengthToAtom(signal);
      if (atom && !atoms.includes(atom)) {
        atoms.push(atom);
      }
    }

    return atoms;
  }

  /**
   * Map a conflict signal to a mentor advisory atom
   * These atoms are compatible with MentorAtomPhrases and MentorJudgmentEngine
   *
   * @private
   */
  static _mapSignalToAtom(signal) {
    const { category, severity } = signal;

    // Map signal categories to mentor atoms
    const categoryMap = {
      // Commitment conflicts → commitment_ignored atom
      "commitment_conflict": "commitment_ignored",
      "commitment_deviation": "commitment_ignored",

      // Goal conflicts → goal_deviation
      "goal_conflict": "goal_deviation",
      "path_deviation": "goal_deviation",

      // Pattern misalignment → pattern_conflict
      "pattern_mismatch": "pattern_conflict",
      "identity_shift": "pattern_conflict",

      // Readiness issues → readiness_lacking
      "readiness_gap": "readiness_lacking",
      "premature_selection": "readiness_lacking",

      // Risk signals → risk_increased
      "vulnerability": "risk_increased",
      "exposure": "exposure",

      // Exploration signals → exploration_signal
      "exploration": "exploration_signal",
      "unusual_choice": "exploration_signal"
    };

    return categoryMap[category] || null;
  }

  /**
   * Map a strength signal to an advisory atom (positive)
   *
   * @private
   */
  static _mapStrengthToAtom(signal) {
    const { category } = signal;

    const categoryMap = {
      "synergy": "synergy_present",
      "alignment": "synergy_present",
      "specialization": "feat_reinforces_core_strength",
      "coherence": "synergy_present"
    };

    return categoryMap[category] || null;
  }

  /**
   * Render mentor response for a suggestion
   * Uses existing MentorJudgmentEngine + MentorAtomPhrases
   *
   * @private
   */
  static async _renderMentorResponse(mentorId, reasonCode, tier, atoms) {
    try {
      // Get mentor instance
      const mentor = MentorJudgmentEngine.getMentor(mentorId);
      if (!mentor) {
        return `The mentor has nothing to say about this choice.`;
      }

      // Build intensity from tier (maps 0-6 to intensity levels)
      const intensity = this._tierToIntensity(tier);

      // Get phrase from mentor
      // Using existing phrase library for deterministic output
      if (atoms && atoms.length > 0) {
        const response = await mentor.respondToAtoms(atoms, intensity);
        return response || `The mentor considers your choice.`;
      } else {
        return `The mentor has nothing to say about this choice.`;
      }
    } catch (error) {
      SWSELogger.debug("[MentorInteractionOrchestrator] Mentor response error:", error);
      return `The mentor is silent.`;
    }
  }

  /**
   * Render mentor advisory response from atoms
   *
   * @private
   */
  static async _renderAdvisoryResponse(mentorId, atoms, conflictSignals, strengthSignals) {
    try {
      const mentor = MentorJudgmentEngine.getMentor(mentorId);
      if (!mentor) {
        return "The mentor observes your progress.";
      }

      // Determine intensity from signal severity
      const hasHighSeverity = conflictSignals.some(s => s.severity === "high");
      const intensity = hasHighSeverity ? "high" : "medium";

      // Generate response from atoms
      if (atoms.length > 0) {
        const response = await mentor.respondToAtoms(atoms, intensity);
        return response || "The mentor considers your path.";
      } else {
        return "The mentor finds your path sound.";
      }
    } catch (error) {
      SWSELogger.debug("[MentorInteractionOrchestrator] Advisory response error:", error);
      return "The mentor is silent.";
    }
  }

  /**
   * Render strategic insight about build conflicts
   *
   * @private
   */
  static async _renderStrategicInsight(mentorId, conflictSignals, metrics) {
    try {
      const mentor = MentorJudgmentEngine.getMentor(mentorId);
      if (!mentor) {
        return null;
      }

      // Extract primary conflict type
      const primaryConflict = conflictSignals[0];
      if (!primaryConflict) return null;

      // Build strategic atom from conflict
      const strategicAtom = this._mapSignalToAtom(primaryConflict);
      if (!strategicAtom) return null;

      // Generate insight
      const insight = await mentor.respondToAtoms([strategicAtom], "high");
      return insight || null;
    } catch (error) {
      SWSELogger.debug("[MentorInteractionOrchestrator] Strategic insight error:", error);
      return null;
    }
  }

  /**
   * Map suggestion tier (0-6) to mentor intensity level
   * Higher tier = higher intensity
   *
   * @private
   */
  static _tierToIntensity(tier) {
    if (tier >= 5) return "very_high";
    if (tier >= 4) return "high";
    if (tier >= 3) return "medium";
    if (tier >= 1) return "low";
    return "very_low";
  }

  /**
   * Get neutral mentor phrase for missing suggestions
   *
   * @private
   */
  static _getMentorNeutralPhrase(mentorId) {
    // Map mentors to neutral phrases
    const neutralPhrases = {
      miraj: "The mentor observes your choice.",
      lead: "The mentor nods slightly.",
      breach: "The mentor says nothing.",
      default: "The mentor is silent."
    };

    return neutralPhrases[mentorId] || neutralPhrases.default;
  }

  /**
   * Format conflict signals for output
   *
   * @private
   */
  static _formatConflicts(signals) {
    return signals.map(signal => ({
      type: signal.category,
      severity: signal.severity,
      evidence: signal.evidence?.slice(0, 2) || [] // Limit evidence output
    }));
  }

  /**
   * Format strength signals for output
   *
   * @private
   */
  static _formatStrengths(signals) {
    return signals.map(signal => ({
      type: signal.category,
      strength: signal.strength,
      evidence: signal.evidence?.slice(0, 2) || []
    }));
  }
}
