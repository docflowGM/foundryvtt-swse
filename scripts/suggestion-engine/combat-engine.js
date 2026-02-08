/**
 * Combat Suggestion Engine
 *
 * Evaluates tactical decision space during combat.
 * Emits a SuggestionReport that triggers all GM modules.
 *
 * Integration points:
 * - Called after each combat turn
 * - Called on significant state changes (combat start/end, reinforcements, etc.)
 * - Optional: called on manual GM request
 */

import { createSuggestionReport, generateReportId, validateSuggestionReport } from './report-schema.js';
import { emitSuggestionReport } from '../gm-suggestions/init.js';
import { getCurrentPhase } from '../state/phase.js';
import { SWSELogger } from '../utils/logger.js';
import { TacticalEvaluator } from './tactical-evaluator.js';

export class CombatSuggestionEngine {
  /**
   * Evaluate tactical decision space
   * @param {Object} options
   * @returns {Object} SuggestionReport
   */
  static async evaluate(options = {}) {
    const {
      combat = game.combat,
      reason = 'manual'
    } = options;

    if (!combat) {
      return null;
    }

    try {
      // Build report structure
      const report = createSuggestionReport({
        meta: {
          reportId: generateReportId(),
          timestamp: Date.now(),
          phase: getCurrentPhase(),
          sceneId: combat?.scene?.id || null,
          combatId: combat?.id || null,
          engineVersion: '1.0.0',
          evaluationReason: reason
        },

        perActor: this._evaluatePerActor(combat),
        partyAggregate: this._evaluatePartyAggregate(combat),
        diagnostics: this._evaluateDiagnostics(combat)
      });

      // Validate before emission
      validateSuggestionReport(report);

      // Emit to trigger GM modules
      emitSuggestionReport(report);

      SWSELogger.log(`[CombatSuggestionEngine] Report emitted (${reason})`, {
        actorCount: Object.keys(report.perActor).length,
        pressure: report.partyAggregate.pressureIndex,
        entropy: report.partyAggregate.optionEntropy
      });

      return report;
    } catch (err) {
      console.error('[CombatSuggestionEngine] Evaluation failed:', err);
      return null;
    }
  }

  /**
   * Evaluate per-actor tactical state
   * @private
   */
  static _evaluatePerActor(combat) {
    const perActor = {};

    const combatants = combat?.combatants || [];

    combatants.forEach(combatant => {
      if (!combatant.actor) return;

      const actorId = combatant.actor.id;

      perActor[actorId] = {
        actorId,
        roleTags: this._getRoleTags(combatant.actor),

        suggestions: this._generateSuggestions(combatant.actor, combat),

        confidenceBand: this._calculateConfidence(combatant.actor, combat),

        decisionHealth: {
          optionEntropy: Math.random() * 0.5 + 0.3, // Placeholder: 0.3-0.8
          constraintLevel: Math.random() * 0.3,      // Placeholder: 0-0.3
          noveltyScore: Math.random() * 0.6 + 0.2    // Placeholder: 0.2-0.8
        },

        intentVector: this._getIntentVector(combatant),

        suppressionFlags: [],

        reasoningSummary: `Actor is in ${combatant.isActive ? 'active' : 'inactive'} state`
      };
    });

    return perActor;
  }

  /**
   * Evaluate party-level aggregate metrics
   * @private
   */
  static _evaluatePartyAggregate(combat) {
    return TacticalEvaluator.evaluatePartyAggregate(combat);
  }

  /**
   * Evaluate diagnostic signals
   * @private
   */
  static _evaluateDiagnostics(combat) {
    return TacticalEvaluator.evaluateDiagnostics(combat);
  }

  /**
   * Generate tactical suggestions
   * @private
   */
  static _generateSuggestions(actor, combat) {
    return TacticalEvaluator.generateSuggestions(actor, combat);
  }

  /**
   * Calculate confidence band based on actor state
   * @private
   */
  static _calculateConfidence(actor, combat) {
    return TacticalEvaluator.calculateConfidenceBand(actor, combat);
  }

  /**
   * Get role tags for an actor
   * @private
   */
  static _getRoleTags(actor) {
    return TacticalEvaluator.getRoleTags(actor);
  }

  /**
   * Get intent vector (what player is trying to do)
   * @private
   */
  static _getIntentVector(combatant) {
    return TacticalEvaluator.getIntentVector(combatant);
  }
}
