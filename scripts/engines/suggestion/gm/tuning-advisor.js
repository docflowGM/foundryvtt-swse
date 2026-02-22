/**
 * GM Suggestion Module: Encounter Tuning Advisor
 *
 * Translates suggestion engine signals into concrete adjustment advice.
 * Non-automatic: GM decides whether to apply suggestions.
 */

import { INSIGHT_TYPES, validateInsight } from './insight-types.js';

export class TuningAdvisor {
  /**
   * Evaluate a suggestion report for tuning signals
   * @param {Object} report - SuggestionReport
   * @returns {Object|null} GMInsight or null if no condition met
   */
  static evaluate(report) {
    const { partyAggregate, diagnostics } = report;

    // Calculate perception mismatch: high pressure but high confidence = players don't perceive threat
    // Low pressure but low confidence = encounter feels harder than it is
    const pressureIndex = partyAggregate.pressureIndex || 0;
    const confidenceMean = partyAggregate.confidenceMean || 0.5;

    const perceptionMismatch = diagnostics.perceptionMismatch || false;

    // Only emit if there's actionable mismatch
    if (!perceptionMismatch && Math.abs(pressureIndex - confidenceMean) < 0.3) {
      return null;
    }

    // Determine tuning direction
    let direction = 'neutral';
    let confidence = 0.5;

    if (confidenceMean < 0.4 && pressureIndex > 0.6) {
      direction = 'easier'; // Feels harder than it is
      confidence = Math.min(0.95, pressureIndex - confidenceMean);
    } else if (confidenceMean > 0.7 && pressureIndex < 0.4) {
      direction = 'harder'; // Too easy
      confidence = 0.6;
    }

    if (direction === 'neutral') {
      return null;
    }

    // Build suggested adjustments
    const suggestedAdjustments = this._buildAdjustments(direction, partyAggregate, diagnostics);

    const insight = {
      type: INSIGHT_TYPES.TUNING_ADVICE,
      severity: 'medium',
      confidence,
      summary: direction === 'easier'
        ? `Encounter feels harder than balanced math suggests`
        : `Encounter may be too easy relative to party capability`,
      evidence: [
        `Pressure: ${(pressureIndex * 100).toFixed(0)}%`,
        `Confidence: ${(confidenceMean * 100).toFixed(0)}%`,
        `Mismatch: ${(Math.abs(pressureIndex - confidenceMean) * 100).toFixed(0)}%`
      ],
      suggestedAdjustments,
      notes: 'These are suggestions only. Apply at your discretion.'
    };

    validateInsight(insight);
    return insight;
  }

  /**
   * Generate specific adjustments based on tuning direction
   * @private
   */
  static _buildAdjustments(direction, partyAggregate, diagnostics) {
    if (direction === 'easier') {
      return [
        {
          category: 'enemy',
          action: 'Reduce enemy HP by 10–20%'
        },
        {
          category: 'enemy',
          action: 'Grant one fewer round of enemy actions'
        },
        {
          category: 'behavior',
          action: 'Shift enemy to suppression tactics instead of focus fire'
        },
        {
          category: 'environment',
          action: 'Add cover, difficult terrain, or escape vector'
        },
        {
          category: 'mechanic',
          action: 'Grant temporary advantage (inspiration, blessing, buff)'
        }
      ];
    } else {
      return [
        {
          category: 'enemy',
          action: 'Increase enemy HP by 10–15%'
        },
        {
          category: 'enemy',
          action: 'Add reinforcements or elite enemy variant'
        },
        {
          category: 'behavior',
          action: 'Increase enemy action economy or tactical coordination'
        },
        {
          category: 'environment',
          action: 'Remove friendly cover or add environmental hazards'
        },
        {
          category: 'mechanic',
          action: 'Introduce a time pressure or escalating consequence'
        }
      ];
    }
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
