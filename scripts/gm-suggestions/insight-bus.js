/**
 * GM Insight Aggregation Bus
 *
 * Collects insights from all GM modules.
 * Stores latest insights in memory.
 * Provides read-only getter for UI panels.
 */

import { PressureMonitor } from './pressure-monitor.js';
import { SpotlightMonitor } from './spotlight-monitor.js';
import { PacingMonitor } from './pacing-monitor.js';
import { TuningAdvisor } from './tuning-advisor.js';

export class InsightBus {
  static _activeInsights = [];
  static _initialized = false;

  /**
   * Initialize all GM modules and register hooks
   */
  static initialize() {
    if (this._initialized) return;
    this._initialized = true;

    // Register all monitor modules
    PressureMonitor.register();
    SpotlightMonitor.register();
    PacingMonitor.register();
    TuningAdvisor.register();

    // Listen for insight emissions and collect them
    Hooks.on('swse:gm-insight-emitted', (insight) => {
      this._addInsight(insight);
    });

    console.log('[InsightBus] Initialized with 4 GM monitor modules');
  }

  /**
   * Add an insight to the active collection
   * @private
   */
  static _addInsight(insight) {
    if (!insight || !insight.type) return;

    // Remove older insights of same type (keep latest only per type)
    this._activeInsights = this._activeInsights.filter(i => i.type !== insight.type);

    // Add new insight with timestamp
    this._activeInsights.push({
      ...insight,
      emittedAt: Date.now()
    });

    // Limit total active insights to 10
    if (this._activeInsights.length > 10) {
      this._activeInsights = this._activeInsights.slice(-10);
    }

    // Notify UI systems that insights have changed
    Hooks.callAll('swse:gm-insights-updated', this._activeInsights);
  }

  /**
   * Get all active insights (read-only)
   * @returns {Object[]} Array of active insights
   */
  static getActiveInsights() {
    return Object.freeze([...this._activeInsights]);
  }

  /**
   * Get highest severity insight
   * @returns {Object|null}
   */
  static getHighestSeverityInsight() {
    const severityRank = { critical: 4, high: 3, medium: 2, low: 1 };
    return this._activeInsights.reduce((highest, current) => {
      const currentRank = severityRank[current.severity] || 0;
      const highestRank = severityRank[highest?.severity] || 0;
      return currentRank > highestRank ? current : highest;
    }, null);
  }

  /**
   * Get insights of a specific type
   * @param {string} type - INSIGHT_TYPES value
   * @returns {Object[]} Matching insights
   */
  static getInsightsByType(type) {
    return this._activeInsights.filter(i => i.type === type);
  }

  /**
   * Clear all insights (for scene/encounter end)
   */
  static clear() {
    this._activeInsights = [];
    Hooks.callAll('swse:gm-insights-updated', []);
  }

  /**
   * Get a summary of current insight health
   * @returns {Object}
   */
  static getSummary() {
    return Object.freeze({
      activeCount: this._activeInsights.length,
      highestSeverity: this.getHighestSeverityInsight()?.severity || 'none',
      types: [...new Set(this._activeInsights.map(i => i.type))],
      lastUpdated: this._activeInsights[this._activeInsights.length - 1]?.emittedAt || null
    });
  }
}
