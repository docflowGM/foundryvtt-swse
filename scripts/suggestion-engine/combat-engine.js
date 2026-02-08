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
    const combatants = combat?.combatants || [];
    const pcCombatants = combatants.filter(c => c.actor && !c.actor.type.includes('npc'));
    const npcCombatants = combatants.filter(c => c.actor && c.actor.type.includes('npc'));

    // Simple placeholder metrics
    const hpRatios = combatants
      .map(c => c.actor?.system?.hp?.value / c.actor?.system?.hp?.max || 0.5)
      .filter(Boolean);

    const avgHP = hpRatios.length > 0 ? hpRatios.reduce((a, b) => a + b) / hpRatios.length : 0.5;

    // Pressure: higher when PCs are low HP and enemies are fresh
    const pressureIndex = Math.max(0, Math.min(1, (1 - avgHP) * (npcCombatants.length / Math.max(1, pcCombatants.length))));

    return {
      optionEntropy: 0.5,              // Placeholder
      convergenceScore: 0.3,           // Placeholder
      pressureIndex,
      confidenceMean: 0.6,             // Placeholder
      confidenceVariance: 0.1,         // Placeholder
      intentDistribution: { defensive: 0.4, offensive: 0.3, utility: 0.3 },
      roleCoverage: {
        tank: { expected: 1, actual: 1 },
        striker: { expected: 2, actual: 1 },
        support: { expected: 1, actual: 0 }
      },
      spotlightImbalance: 0.2          // Placeholder
    };
  }

  /**
   * Evaluate diagnostic signals
   * @private
   */
  static _evaluateDiagnostics(combat) {
    return {
      fallbackRate: 0.15,              // Placeholder: % of fallback suggestions
      repeatedSuggestionRate: 0.1,     // Placeholder: % repetition
      defensiveBias: 0.25,             // Placeholder: defensive suggestion bias
      perceptionMismatch: false,       // Placeholder
      evaluationWarnings: []
    };
  }

  /**
   * Generate placeholder tactical suggestions
   * @private
   */
  static _generateSuggestions(actor, combat) {
    // For now: return empty array (placeholder)
    // Future: connect to tactical AI or decision tree
    return [];
  }

  /**
   * Calculate confidence band based on actor state
   * @private
   */
  static _calculateConfidence(actor, combat) {
    const hpPercent = actor?.system?.hp?.value / actor?.system?.hp?.max || 0.5;

    if (hpPercent > 0.75) return 'STRONG';
    if (hpPercent > 0.5) return 'MODERATE';
    if (hpPercent > 0.25) return 'WEAK';
    return 'FALLBACK';
  }

  /**
   * Get role tags for an actor
   * @private
   */
  static _getRoleTags(actor) {
    // Placeholder: extract from class, feats, etc.
    return ['unknown'];
  }

  /**
   * Get intent vector (what player is trying to do)
   * @private
   */
  static _getIntentVector(combatant) {
    // Placeholder: infer from last action, positioning, etc.
    return ['unknown'];
  }
}
