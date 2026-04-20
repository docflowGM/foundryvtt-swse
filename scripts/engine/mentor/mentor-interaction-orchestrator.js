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
import { TrajectoryPlanningEngine } from "/systems/foundryvtt-swse/scripts/engine/analysis/trajectory-planning-engine.js";
import { MentorJudgmentEngine } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-judgment-engine.js";
import { REASON_ATOMS } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-reason-atoms.js";
import { getMentor } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-json-loader.js";
import { getEncouragementLine } from "/systems/foundryvtt-swse/scripts/dialogue/runtime/getEncouragementLine.js";
import { getJudgmentOverlay } from "/systems/foundryvtt-swse/scripts/dialogue/runtime/getJudgmentOverlay.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { AddressEngine } from "/systems/foundryvtt-swse/scripts/engine/mentor/address-engine.js";
import { AddressPolicy } from "/systems/foundryvtt-swse/scripts/engine/mentor/address-policy.js";

export class MentorInteractionOrchestrator {
  /**
   * Handle mentor interaction for a given mode and context
   *
   * @param {Object} context - Interaction context
   * @param {string} context.mode - "selection", "reflection", "hybrid", or "trajectory"
   * @param {Object} context.actor - Foundry actor document
   * @param {Object} context.mentorId - Mentor ID (e.g., "miraj", "lead")
   * @param {Object} context.suggestion - Optional: suggestion object (for selection/hybrid)
   * @param {Object} context.item - Optional: item object (feat/talent being selected)
   * @param {Object} context.pendingData - Optional: pending level-up selections
   *
   * @returns {Promise<Object>} Structured advisory output
   *   {
   *     mode: "selection" | "reflection" | "hybrid" | "trajectory",
   *     primaryAdvice: string,
   *     strategicInsight?: string,
   *     priorities?: array,
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

      if (!mode || !["selection", "reflection", "hybrid", "trajectory"].includes(mode)) {
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
        case "trajectory":
          return await this._handleTrajectoryMode(actor, mentorId);
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

    // Convert tier to intensity for advisory type determination
    const intensity = this._tierToIntensity(tier);

    // Use strength_reinforcement for selection mode (positive context)
    const advisoryType = "strength_reinforcement";

    // Load mentor data and inject judgment overlay
    const mentorData = await getMentor(mentorId);
    const adviceWithOverlay = await this._injectJudgmentOverlay(
      mentorData,
      advisoryType,
      intensity,
      mentorResponse,
      actor,
      "selection"
    );

    return {
      mode: "selection",
      primaryAdvice: adviceWithOverlay,
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

    // Determine advisory tier from signal severity
    const tier = conflictSignals.some(s => s.severity === "high") ? "high" : "medium";

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

    // Load mentor data and inject deterministic encouragement_line
    const mentorData = await getMentor(mentorId);

    // Determine advisory type from primary conflict signal
    const advisoryType = this._determineAdvisoryType(conflictSignals);

    // Inject judgment overlay deterministically
    const adviceWithOverlay = await this._injectJudgmentOverlay(
      mentorData,
      advisoryType,
      tier,
      primaryAdvice,
      actor,
      "reflection"
    );

    const payload = {
      mode: "reflection",
      primaryAdvice: adviceWithOverlay,
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

    payload.encouragement_line = getEncouragementLine(mentorData, tier);

    return payload;
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
   * TRAJECTORY MODE: Forward-looking strategic planning
   * Uses TrajectoryPlanningEngine to identify next high-impact steps
   * Optional: includes emergent archetype insight if no declared archetype
   * Advisory only—no simulation, no mutation
   *
   * @private
   */
  static async _handleTrajectoryMode(actor, mentorId) {
    // Generate trajectory plan
    const plan = await TrajectoryPlanningEngine.plan(actor);

    // Convert priorities to advisory atoms for mentor rendering
    const advisoryAtoms = this._prioritiesToAdvisoryAtoms(plan.priorities);

    // Generate primary trajectory advice
    const primaryAdvice = await this._renderTrajectoryAdvice(
      mentorId,
      plan,
      advisoryAtoms
    );

    // Optionally include emergent archetype insight if no declared archetype
    let emergentInsight = null;
    const system = actor.system || {};
    if (!system.archetypeId) {
      const emergent = await BuildAnalysisEngine.detectEmergentArchetype(actor);
      if (emergent.bestMatch) {
        emergentInsight = emergent.reasoning;
      }
    }

    // Load mentor data and inject judgment overlay for trajectory
    const mentorData = await getMentor(mentorId);
    const advisoryType = "long_term_trajectory";
    const tier = "high"; // Trajectory is high-intensity forward planning
    const adviceWithOverlay = await this._injectJudgmentOverlay(
      mentorData,
      advisoryType,
      tier,
      primaryAdvice,
      actor,
      "trajectory"
    );

    // Build result
    const result = {
      mode: "trajectory",
      primaryAdvice: adviceWithOverlay,
      priorities: plan.priorities,
      horizon: plan.horizon,
      deterministic: true
    };

    // Add emergent insight if available
    if (emergentInsight) {
      result.emergentInsight = emergentInsight;
    }

    return result;
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

    // Map signal categories to canonical mentor atoms (PascalCase)
    const categoryMap = {
      // Commitment conflicts → CommitmentIgnored atom
      "commitment_conflict": REASON_ATOMS.CommitmentIgnored,
      "commitment_deviation": REASON_ATOMS.CommitmentIgnored,

      // Goal conflicts → GoalDeviation
      "goal_conflict": REASON_ATOMS.GoalDeviation,
      "path_deviation": REASON_ATOMS.GoalDeviation,

      // Pattern misalignment → PatternConflict
      "pattern_mismatch": REASON_ATOMS.PatternConflict,
      "identity_shift": REASON_ATOMS.PatternConflict,

      // Readiness issues → ReadinessLacking
      "readiness_gap": REASON_ATOMS.ReadinessLacking,
      "premature_selection": REASON_ATOMS.ReadinessLacking,

      // Risk signals → RiskIncreased
      "vulnerability": REASON_ATOMS.RiskIncreased,
      "exposure": REASON_ATOMS.RiskIncreased,

      // Exploration signals → ExplorationSignal
      "exploration": REASON_ATOMS.ExplorationSignal,
      "unusual_choice": REASON_ATOMS.ExplorationSignal
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

    // Map strength signals to canonical mentor atoms (PascalCase)
    const categoryMap = {
      "synergy": REASON_ATOMS.SynergyPresent,
      "alignment": REASON_ATOMS.PatternAlignment,
      "specialization": REASON_ATOMS.SynergyPresent,
      "coherence": REASON_ATOMS.SynergyPresent
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

  /**
   * Convert trajectory priorities to mentor advisory atoms
   * Maps priority categories to mentor-understood atoms
   *
   * @private
   */
  static _prioritiesToAdvisoryAtoms(priorities) {
    const atoms = [];

    const categoryMap = {
      prestige: "prestige_advancement",
      attribute: "attribute_development",
      feat: "feat_selection",
      talent: "talent_selection",
      skill: "skill_focus",
      "conflict_correction": "conflict_resolution",
      role: "role_reinforcement"
    };

    for (const priority of priorities) {
      const atom = categoryMap[priority.category];
      if (atom && !atoms.includes(atom)) {
        atoms.push(atom);
      }
    }

    return atoms;
  }

  /**
   * Render mentor trajectory advice from plan
   * Explains priorities in mentor's voice
   *
   * @private
   */
  static async _renderTrajectoryAdvice(mentorId, plan, atoms) {
    try {
      const mentor = MentorJudgmentEngine.getMentor(mentorId);
      if (!mentor) {
        return "The mentor observes your path with interest.";
      }

      // Build trajectory summary from priorities
      let summary = "";

      if (plan.priorities.length === 0) {
        return "Your path is well-established. Continue as you are.";
      }

      // Get top priority for primary focus
      const topPriority = plan.priorities[0];
      switch (topPriority.category) {
        case "prestige":
          summary = "Your prestige advancement requires immediate focus.";
          break;
        case "attribute":
          summary = `Developing your ${topPriority.explanationContext.attribute} attribute is key.`;
          break;
        case "feat":
        case "talent":
          summary = `Adding ${topPriority.category} to your arsenal would strengthen your position.`;
          break;
        default:
          summary = "Several strategic options present themselves.";
      }

      // Add horizon context
      if (plan.horizon > 0) {
        summary += ` You have roughly ${plan.horizon} level(s) to work with.`;
      }

      return summary;
    } catch (error) {
      SWSELogger.debug("[MentorInteractionOrchestrator] Trajectory advice error:", error);
      return "The mentor considers your future carefully.";
    }
  }

  /**
   * Determine advisory type from conflict signals
   * Maps signal categories to routing matrix advisory types
   *
   * @private
   */
  static _determineAdvisoryType(conflictSignals) {
    // If no conflicts, default to strength reinforcement
    if (!conflictSignals || conflictSignals.length === 0) {
      return "strength_reinforcement";
    }

    const primarySignal = conflictSignals[0];
    const category = primarySignal?.category || "";

    // Map signal categories to advisory types
    const categoryMap = {
      // Commitment issues → conflict
      "commitment_conflict": "conflict",
      "commitment_deviation": "conflict",

      // Goal/path issues → drift
      "goal_conflict": "drift",
      "path_deviation": "drift",

      // Pattern/identity issues → hybrid_identity
      "pattern_mismatch": "hybrid_identity",
      "identity_shift": "hybrid_identity",

      // Readiness gaps → specialization_warning
      "readiness_gap": "specialization_warning",
      "premature_selection": "specialization_warning",

      // Vulnerability/risk → specialization_warning
      "vulnerability": "specialization_warning",
      "exposure": "specialization_warning",

      // Exploration → prestige_planning
      "exploration": "prestige_planning",
      "unusual_choice": "prestige_planning"
    };

    return categoryMap[category] || "conflict";
  }

  /**
   * Inject judgment overlay and mentor address into advisory output
   * Deterministic prepending of emotional routing judgment
   * Optional mentor address invocation (nickname/greeting)
   *
   * @private
   */
  static async _injectJudgmentOverlay(
    mentorData,
    advisoryType,
    tier,
    advisoryText,
    actor,
    mode
  ) {
    try {
      const overlay = getJudgmentOverlay(mentorData, advisoryType, tier);
      let finalText = `${overlay}\n\n${advisoryText}`;

      // Determine if address should be invoked
      const policy = AddressPolicy.evaluate({
        advisoryType,
        tier,
        isLevelUp: mode === "selection",
        isFirstLevelInClass: false, // planned: derive from actor if needed
        isTalkInitiated: mode !== "selection"
      });

      if (policy.shouldInvoke) {
        const address = AddressEngine.resolve({
          mentorId: mentorData.mentorId,
          actorName: actor.name,
          tier,
          forceLiteral: policy.forceLiteral
        });

        if (policy.position === "start") {
          finalText = `${address.text}. ${finalText}`;
        } else {
          finalText = `${finalText}, ${address.text}.`;
        }
      }

      return finalText;
    } catch (error) {
      SWSELogger.debug("[MentorInteractionOrchestrator] Judgment overlay error:", error);
      // No overlay on failure—return advisory unchanged
      return advisoryText;
    }
  }
}
