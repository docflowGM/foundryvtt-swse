/**
 * GM Suggestion Module: Pressure & Lethality Monitor
 *
 * Detects when the decision space is collapsing due to environmental pressure.
 * Triggers when players are being forced into defensive postures.
 */

import { INSIGHT_TYPES, INSIGHT_SEVERITY, validateInsight } from "/systems/foundryvtt-swse/scripts/engine/suggestion/gm/insight-types.js";

export class PressureMonitor {
  /**
   * Evaluate a suggestion report for pressure signals
   * @param {Object} report - SuggestionReport
   * @returns {Object|null} GMInsight or null if no condition met
   */
  static evaluate(report) {
    const { partyAggregate, diagnostics } = report;

    // Thresholds
    const PRESSURE_THRESHOLD = 0.7;
    const FALLBACK_THRESHOLD = 0.5;
    const DEFENSIVE_BIAS_THRESHOLD = 0.65;

    // Check pressure signals
    const pressureHigh = partyAggregate.pressureIndex > PRESSURE_THRESHOLD;
    const fallbackHigh = diagnostics.fallbackRate > FALLBACK_THRESHOLD;
    const defensiveBiasHigh = diagnostics.defensiveBias > DEFENSIVE_BIAS_THRESHOLD;

    // No insight if conditions not met
    if (!pressureHigh && !fallbackHigh && !defensiveBiasHigh) {
      return null;
    }

    // Determine severity
    let severity = INSIGHT_SEVERITY.MEDIUM;
    if (pressureHigh && fallbackHigh) {severity = INSIGHT_SEVERITY.HIGH;}
    if (pressureHigh && fallbackHigh && defensiveBiasHigh) {severity = INSIGHT_SEVERITY.CRITICAL;}

    // Build evidence array
    const evidence = [];
    if (pressureHigh) {
      evidence.push(`Pressure index: ${(partyAggregate.pressureIndex * 100).toFixed(0)}%`);
    }
    if (fallbackHigh) {
      evidence.push(`${(diagnostics.fallbackRate * 100).toFixed(0)}% of suggestions are fallback (generic)`);
    }
    if (defensiveBiasHigh) {
      evidence.push(`Defensive bias detected: ${(diagnostics.defensiveBias * 100).toFixed(0)}%`);
    }

    const insight = {
      type: INSIGHT_TYPES.PRESSURE_WARNING,
      severity,
      summary: `Players responding defensively under sustained pressure`,
      evidence,
      suggestedLevers: [
        'Reduce enemy focus fire or action economy',
        'Introduce positional advantage or cover',
        'Telegraph an enemy weakness or limitation',
        'Offer a clear escape vector',
        'Grant a temporary respite or safe zone'
      ]
    };

    validateInsight(insight);
    return insight;
  }

  /**
   * Register hook listener
   */
  static register() {
    Hooks.on('swse:suggestion-report-ready', (report) => {
      const insight = this.evaluate(report);
      if (insight) {
        Hooks.callAll('swse:gm-insight-emitted', insight);
      }
    });
  }
}
