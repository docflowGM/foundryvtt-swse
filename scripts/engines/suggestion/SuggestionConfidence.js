/**
 * SuggestionConfidence
 *
 * Pure scoring engine for suggestion confidence.
 * Converts multiple normalized signals into one explainable confidence score.
 *
 * Inputs:
 * - mentorAlignment: 0-1 (how well matches mentor intent)
 * - classSynergy: 0-1 (class/feat/talent synergy)
 * - historyModifier: 0-1 (player acceptance rate from history)
 * - buildCoherence: 0-1 (internal build consistency)
 * - opportunityCost: 0-1 (hidden costs, capped at 0.3)
 *
 * Output:
 * - confidence: 0-1 score
 * - confidenceLevel: "Strong" | "Suggested" | "Possible"
 * - breakdown: detailed input scores for tuning/debugging
 *
 * Phase 1C: Complete implementation with locked formula.
 */

import { SWSELogger } from '../../utils/logger.js';

export class SuggestionConfidence {

  /**
   * Constructor for dependency injection
   * All dependencies are optional; methods safely default on null
   * @param {Object} deps - { mentorProfile, historyTracker, synergyEvaluator, coherenceAnalyzer, opportunityCostAnalyzer }
   */
  constructor(deps = {}) {
    this.mentorProfile = deps.mentorProfile || null;
    this.historyTracker = deps.historyTracker || null;
    this.synergyEvaluator = deps.synergyEvaluator || null;
    this.coherenceAnalyzer = deps.coherenceAnalyzer || null;
    this.opportunityCostAnalyzer = deps.opportunityCostAnalyzer || null;
  }

  /**
   * Calculate confidence for a suggested item
   * Pure function: no side effects, safe to call multiple times
   *
   * @param {Object} params - { actor, item, theme, category, level, archetypeMatch }
   * @returns {Object} { confidence: 0-1, confidenceLevel, breakdown }
   */
  calculate({ actor, item, theme, category, level, archetypeMatch = null } = {}) {
    try {
      // --- Pull normalized inputs (all 0-1, defaulting to 0.5 = neutral) ---

      // Mentor alignment: from questionnaire biases
      const mentorAlignment = this.mentorProfile?.getBias?.(actor, theme) ?? 0.5;

      // Class synergy: feat/talent fits with class
      const classSynergy = this.synergyEvaluator?.evaluateSynergy?.(item, actor) ?? 0.5;

      // Build coherence: how well suggestion fits actor's existing build
      const coherenceResult = this.coherenceAnalyzer?.analyzeSuggestionCoherence?.(item, actor);
      const buildCoherence = coherenceResult?.score ?? 0.5;
      // Note: coherenceResult.breakdown { attributeCoherence, talentClustering, combatStyle, classProgression }
      // available for detailed debugging but not included in top-level confidence breakdown

      // History modifier: acceptance rate from PlayerHistoryTracker
      const historyModifier = this.historyTracker?.getAcceptanceRateByTheme?.(actor, theme) ?? 0.5;

      // Opportunity cost: hidden costs (prestige delay, stat conflicts, etc.)
      // Capped at 0.3 to never zero out a suggestion
      let opportunityCost = this.opportunityCostAnalyzer?.computeCost?.(item, actor)?.cost ?? 0;
      opportunityCost = Math.min(0.3, Math.max(0, opportunityCost));

      // --- Apply formula: weighted sum with opportunity cost dampener ---

      // Base weighted score
      const baseScore =
        mentorAlignment * 0.30 +      // Mentor intent weight
        classSynergy * 0.25 +          // Synergy weight
        buildCoherence * 0.20 +        // Coherence weight
        historyModifier * 0.25;        // History weight (grows over time)

      // Apply opportunity cost dampener
      // opportunityCost ∈ [0, 0.3], so multiplier ∈ [0.7, 1.0]
      const finalScore = baseScore * (1 - opportunityCost);

      // Clamp to [0, 1]
      const confidence = Math.max(0, Math.min(1, finalScore));

      // Categorize into confidence level
      const confidenceLevel =
        confidence >= 0.7 ? 'Strong' :
        confidence >= 0.4 ? 'Suggested' :
        'Possible';

      SWSELogger.log(
        `[ConfidenceCalculator] ${item?.name || 'unknown'}: ${confidence.toFixed(2)} (${confidenceLevel})`
      );

      return {
        confidence,
        confidenceLevel,
        breakdown: {
          mentorAlignment: parseFloat(mentorAlignment.toFixed(2)),
          classSynergy: parseFloat(classSynergy.toFixed(2)),
          buildCoherence: parseFloat(buildCoherence.toFixed(2)),
          historyModifier: parseFloat(historyModifier.toFixed(2)),
          opportunityCost: parseFloat(opportunityCost.toFixed(2))
        }
      };
    } catch (err) {
      SWSELogger.error('[ConfidenceCalculator] Error calculating confidence:', err);
      // Safe fallback: neutral score on error
      return {
        confidence: 0.5,
        confidenceLevel: 'Suggested',
        breakdown: {
          mentorAlignment: 0.5,
          classSynergy: 0.5,
          buildCoherence: 0.5,
          historyModifier: 0.5,
          opportunityCost: 0
        }
      };
    }
  }

  /**
   * Static convenience method for backward compatibility
   * Creates instance, calculates, returns result
   * @param {Object} params
   * @returns {Object} { confidence, confidenceLevel, breakdown }
   */
  static calculate(params = {}) {
    const instance = new SuggestionConfidence();
    return instance.calculate(params);
  }

  /**
   * Get confidence level from 0-1 score
   * Threshold definitions:
   *   >= 0.7: "Strong" (high confidence, prioritize)
   *   >= 0.4: "Suggested" (medium confidence, show)
   *   < 0.4: "Possible" (low confidence, collapse by default)
   *
   * @param {number} confidence - 0-1
   * @returns {string} "Strong" | "Suggested" | "Possible"
   */
  static getConfidenceLevel(confidence) {
    if (confidence >= 0.7) {return 'Strong';}
    if (confidence >= 0.4) {return 'Suggested';}
    return 'Possible';
  }
}
