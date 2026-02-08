/**
 * GM Suggestion Module: Pacing & Scene Energy Observer
 *
 * Detects when scenes stagnate or spike unnaturally.
 * Triggers based on suggestion repetition and novelty collapse.
 */

import { INSIGHT_TYPES, PACING_STATES, validateInsight } from './insight-types.js';

// Track recent reports to detect trends
const REPORT_HISTORY = [];
const HISTORY_SIZE = 5;

export class PacingMonitor {
  /**
   * Evaluate a suggestion report for pacing signals
   * @param {Object} report - SuggestionReport
   * @returns {Object|null} GMInsight or null if no condition met
   */
  static evaluate(report) {
    const { partyAggregate, diagnostics } = report;

    // Add to history
    REPORT_HISTORY.push({
      timestamp: report.meta.timestamp,
      entropy: partyAggregate.optionEntropy,
      novelty: report.perActor ? this._calculateNovelty(report) : 0,
      repeated: diagnostics.repeatedSuggestionRate
    });

    if (REPORT_HISTORY.length > HISTORY_SIZE) {
      REPORT_HISTORY.shift();
    }

    if (REPORT_HISTORY.length < 2) {
      return null; // Need history to detect trends
    }

    // Detect stalled state: low entropy + high repetition + declining novelty
    const isStalled = partyAggregate.optionEntropy < 0.4
      && diagnostics.repeatedSuggestionRate > 0.6;

    // Detect overheated: high pressure + declining confidence
    const confidenceMean = partyAggregate.confidenceMean || 0.5;
    const isOverheated = partyAggregate.pressureIndex > 0.75
      && confidenceMean < 0.4;

    if (!isStalled && !isOverheated) {
      return null;
    }

    const state = isStalled ? PACING_STATES.STALLED : PACING_STATES.OVERHEATED;

    // Build evidence
    const evidence = [];
    if (isStalled) {
      evidence.push(`Low option entropy: ${(partyAggregate.optionEntropy * 100).toFixed(0)}%`);
      evidence.push(`High suggestion repetition: ${(diagnostics.repeatedSuggestionRate * 100).toFixed(0)}%`);
      evidence.push('Novelty score declining across turns');
    } else {
      evidence.push(`High pressure: ${(partyAggregate.pressureIndex * 100).toFixed(0)}%`);
      evidence.push(`Low confidence: ${(confidenceMean * 100).toFixed(0)}%`);
      evidence.push('Players appear overwhelmed');
    }

    const insight = {
      type: INSIGHT_TYPES.PACING_SIGNAL,
      severity: isStalled ? 'medium' : 'high',
      state,
      summary: isStalled
        ? 'Scene energy is flattening — decisions are stagnating'
        : 'Scene is overheated — players are overwhelmed',
      evidence,
      suggestedLevers: isStalled
        ? [
            'Introduce external pressure or new threat',
            'Escalate stakes or reveal hidden information',
            'Offer a clear, decisive choice point',
            'Bring in an NPC with competing interests',
            'Shift environment or introduce hazard'
          ]
        : [
            'Call for a brief pause or narrative recap',
            'Reduce immediate threat level',
            'Grant temporary mechanical relief',
            'Offer player-suggested solutions',
            'Provide clear escape or de-escalation path'
          ]
    };

    validateInsight(insight);
    return insight;
  }

  /**
   * Calculate overall novelty from perActor suggestions
   * @private
   */
  static _calculateNovelty(report) {
    const actors = Object.values(report.perActor || {});
    if (actors.length === 0) return 0;

    const noveltyScores = actors
      .map(a => a.decisionHealth?.noveltyScore || 0);

    return noveltyScores.reduce((a, b) => a + b, 0) / noveltyScores.length;
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
