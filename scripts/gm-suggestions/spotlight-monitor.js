/**
 * GM Suggestion Module: Spotlight & Agency Balancer
 *
 * Detects when one or more players are being quietly sidelined.
 * Triggers when suggestion quality diverges significantly between players.
 */

import { INSIGHT_TYPES, validateInsight } from './insight-types.js';

export class SpotlightMonitor {
  /**
   * Evaluate a suggestion report for spotlight imbalances
   * @param {Object} report - SuggestionReport
   * @returns {Object|null} GMInsight or null if no condition met
   */
  static evaluate(report) {
    const { perActor, partyAggregate } = report;

    // Threshold: spotlight imbalance is significant if > 0.4
    const IMBALANCE_THRESHOLD = 0.4;

    if (partyAggregate.spotlightImbalance < IMBALANCE_THRESHOLD) {
      return null;
    }

    // Find actors with low suggestion quality
    const actorQuality = Object.entries(perActor).map(([actorId, profile]) => ({
      actorId,
      confidenceBand: profile.confidenceBand,
      suggestionCount: profile.suggestions?.length || 0,
      roleTag: profile.roleTags?.[0] || 'unknown'
    }));

    // Identify underserved actors (WEAK or FALLBACK confidence)
    const underserved = actorQuality.filter(
      aq => aq.confidenceBand === 'WEAK' || aq.confidenceBand === 'FALLBACK'
    );

    if (underserved.length === 0) {
      return null;
    }

    // Build evidence
    const evidence = [];
    evidence.push(`Spotlight imbalance: ${(partyAggregate.spotlightImbalance * 100).toFixed(0)}%`);

    underserved.forEach(actor => {
      evidence.push(`${actor.roleTag} (${actor.actorId.slice(0, 8)}...): ${actor.confidenceBand} confidence, ${actor.suggestionCount} suggestions`);
    });

    const insight = {
      type: INSIGHT_TYPES.SPOTLIGHT_IMBALANCE,
      severity: underserved.length > 1 ? 'high' : 'medium',
      summary: `${underserved.length} player(s) have constrained decision space`,
      evidence,
      affectedActors: underserved.map(a => a.actorId),
      suggestedLevers: [
        'Introduce a tactical hook aligned to underserved player(s)',
        'Shift enemy behavior to create new decision vectors',
        'Add an environmental interaction or NPC ally action',
        'Grant temporary mechanical advantage or resource',
        'Call for explicit player input: "What would you like to try?"'
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
