/**
 * GM Suggestion System — Test Harness
 *
 * Create synthetic SuggestionReports for testing the GM modules.
 * Call these from the browser console to test the system without full combat logic.
 *
 * Usage:
 *   SWSE.testHarness.emitHighPressureReport()
 *   SWSE.testHarness.emitSpotlightImbalanceReport()
 *   SWSE.testHarness.emitStalledPacingReport()
 *   SWSE.testHarness.emitTuningMismatchReport()
 */

import { createSuggestionReport, generateReportId } from './report-schema.js';
import { emitSuggestionReport } from '../gm-suggestions/init.js';

export const testHarness = {
  /**
   * Emit a high-pressure scenario
   */
  emitHighPressureReport() {
    const report = createSuggestionReport({
      meta: {
        reportId: generateReportId(),
        timestamp: Date.now(),
        phase: 'combat',
        sceneId: 'test-scene',
        combatId: 'test-combat',
        engineVersion: '1.0.0',
        evaluationReason: 'manual-test'
      },
      perActor: {
        'actor-1': {
          actorId: 'actor-1',
          roleTags: ['striker'],
          suggestions: [],
          confidenceBand: 'FALLBACK',
          decisionHealth: { optionEntropy: 0.2, constraintLevel: 0.8, noveltyScore: 0.1 },
          intentVector: ['defensive'],
          suppressionFlags: ['low-hp'],
          reasoningSummary: 'Actor 1 is in defensive fallback'
        },
        'actor-2': {
          actorId: 'actor-2',
          roleTags: ['support'],
          suggestions: [],
          confidenceBand: 'FALLBACK',
          decisionHealth: { optionEntropy: 0.15, constraintLevel: 0.9, noveltyScore: 0.05 },
          intentVector: ['defensive'],
          suppressionFlags: [],
          reasoningSummary: 'Actor 2 is in defensive fallback'
        }
      },
      partyAggregate: {
        optionEntropy: 0.25,
        convergenceScore: 0.85,
        pressureIndex: 0.85,  // ← HIGH PRESSURE
        confidenceMean: 0.25,
        confidenceVariance: 0.05,
        intentDistribution: { defensive: 0.9, offensive: 0.05, utility: 0.05 },
        roleCoverage: { striker: { expected: 1, actual: 1 }, support: { expected: 1, actual: 1 } },
        spotlightImbalance: 0.15
      },
      diagnostics: {
        fallbackRate: 0.7,     // ← HIGH FALLBACK
        repeatedSuggestionRate: 0.3,
        defensiveBias: 0.75,   // ← HIGH DEFENSIVE BIAS
        perceptionMismatch: false,
        evaluationWarnings: []
      }
    });

    emitSuggestionReport(report);
    console.log('[Test] High-pressure report emitted → Pressure Monitor should trigger');
  },

  /**
   * Emit a spotlight imbalance scenario
   */
  emitSpotlightImbalanceReport() {
    const report = createSuggestionReport({
      meta: {
        reportId: generateReportId(),
        timestamp: Date.now(),
        phase: 'combat',
        sceneId: 'test-scene',
        combatId: 'test-combat',
        engineVersion: '1.0.0',
        evaluationReason: 'manual-test'
      },
      perActor: {
        'actor-1': {
          actorId: 'actor-1',
          roleTags: ['striker'],
          suggestions: [
            { id: 's1', label: 'Attack', category: 'attack', score: 0.9, confidence: 0.95, reasonCodes: [], explanation: 'Strong attack option' }
          ],
          confidenceBand: 'STRONG',
          decisionHealth: { optionEntropy: 0.8, constraintLevel: 0.1, noveltyScore: 0.8 },
          intentVector: ['offensive'],
          suppressionFlags: [],
          reasoningSummary: 'Actor 1 has strong options'
        },
        'actor-2': {
          actorId: 'actor-2',
          roleTags: ['support'],
          suggestions: [],
          confidenceBand: 'FALLBACK',
          decisionHealth: { optionEntropy: 0.1, constraintLevel: 0.9, noveltyScore: 0.05 },
          intentVector: ['generic'],
          suppressionFlags: ['no-synergy'],
          reasoningSummary: 'Actor 2 has limited tactical options'
        }
      },
      partyAggregate: {
        optionEntropy: 0.45,
        convergenceScore: 0.3,
        pressureIndex: 0.4,
        confidenceMean: 0.65,
        confidenceVariance: 0.3,  // ← HIGH VARIANCE
        intentDistribution: { offensive: 0.7, defensive: 0.2, utility: 0.1 },
        roleCoverage: { striker: { expected: 1, actual: 1 }, support: { expected: 1, actual: 0 } },
        spotlightImbalance: 0.55   // ← HIGH IMBALANCE
      },
      diagnostics: {
        fallbackRate: 0.5,
        repeatedSuggestionRate: 0.4,
        defensiveBias: 0.2,
        perceptionMismatch: false,
        evaluationWarnings: []
      }
    });

    emitSuggestionReport(report);
    console.log('[Test] Spotlight imbalance report emitted → Spotlight Monitor should trigger');
  },

  /**
   * Emit a stalled pacing scenario
   */
  emitStalledPacingReport() {
    const report = createSuggestionReport({
      meta: {
        reportId: generateReportId(),
        timestamp: Date.now(),
        phase: 'combat',
        sceneId: 'test-scene',
        combatId: 'test-combat',
        engineVersion: '1.0.0',
        evaluationReason: 'manual-test'
      },
      perActor: {
        'actor-1': {
          actorId: 'actor-1',
          roleTags: ['striker'],
          suggestions: [
            { id: 's1', label: 'Attack 1', category: 'attack', score: 0.5, confidence: 0.5, reasonCodes: [], explanation: 'Generic attack' }
          ],
          confidenceBand: 'MODERATE',
          decisionHealth: { optionEntropy: 0.3, constraintLevel: 0.4, noveltyScore: 0.2 },
          intentVector: ['attack'],
          suppressionFlags: [],
          reasoningSummary: 'Actor 1 repeating same actions'
        }
      },
      partyAggregate: {
        optionEntropy: 0.25,  // ← LOW ENTROPY
        convergenceScore: 0.7,
        pressureIndex: 0.45,
        confidenceMean: 0.55,
        confidenceVariance: 0.1,
        intentDistribution: { attack: 0.8, defense: 0.1, utility: 0.1 },
        roleCoverage: { striker: { expected: 1, actual: 1 } },
        spotlightImbalance: 0.1
      },
      diagnostics: {
        fallbackRate: 0.1,
        repeatedSuggestionRate: 0.75,  // ← HIGH REPETITION
        defensiveBias: 0.05,
        perceptionMismatch: false,
        evaluationWarnings: ['Scene has been same combats for 4+ rounds']
      }
    });

    emitSuggestionReport(report);
    console.log('[Test] Stalled pacing report emitted → Pacing Monitor should trigger');
  },

  /**
   * Emit a tuning mismatch scenario
   */
  emitTuningMismatchReport() {
    const report = createSuggestionReport({
      meta: {
        reportId: generateReportId(),
        timestamp: Date.now(),
        phase: 'combat',
        sceneId: 'test-scene',
        combatId: 'test-combat',
        engineVersion: '1.0.0',
        evaluationReason: 'manual-test'
      },
      perActor: {
        'actor-1': {
          actorId: 'actor-1',
          roleTags: ['striker'],
          suggestions: [],
          confidenceBand: 'WEAK',
          decisionHealth: { optionEntropy: 0.3, constraintLevel: 0.5, noveltyScore: 0.3 },
          intentVector: ['defensive'],
          suppressionFlags: [],
          reasoningSummary: 'Actor 1 appears to be struggling'
        }
      },
      partyAggregate: {
        optionEntropy: 0.4,
        convergenceScore: 0.5,
        pressureIndex: 0.2,  // ← LOW PRESSURE (mathematically)
        confidenceMean: 0.35, // ← LOW CONFIDENCE (feels harder)
        confidenceVariance: 0.1,
        intentDistribution: { defensive: 0.6, offensive: 0.3, utility: 0.1 },
        roleCoverage: { striker: { expected: 1, actual: 1 } },
        spotlightImbalance: 0.2
      },
      diagnostics: {
        fallbackRate: 0.3,
        repeatedSuggestionRate: 0.2,
        defensiveBias: 0.5,
        perceptionMismatch: true,  // ← MISMATCH FLAG
        evaluationWarnings: ['Encounter math (pressure 0.2) vs player perception (confidence 0.35) mismatch']
      }
    });

    emitSuggestionReport(report);
    console.log('[Test] Tuning mismatch report emitted → Tuning Advisor should trigger');
  },

  /**
   * Clear all insights
   */
  async clearInsights() {
    const { InsightBus } = await import('./scripts/gm-suggestions/insight-bus.js');
    InsightBus.clear();
    console.log('[Test] All insights cleared');
  }
};
