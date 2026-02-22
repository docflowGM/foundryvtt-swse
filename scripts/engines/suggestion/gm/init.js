/**
 * GM Suggestion System Initialization
 *
 * Integrates all GM modules:
 * - Report schema validation
 * - Monitor modules (pressure, spotlight, pacing, tuning)
 * - Insight aggregation bus
 * - GM panel UI
 */

import { InsightBus } from './insight-bus.js';
import { GMSuggestionPanel } from './gm-suggestion-panel.js';
import { SWSELogger } from '../utils/logger.js';

export function initializeGMSuggestions() {
  // Register UI panel
  GMSuggestionPanel.register();

  // Initialize insight bus (which registers all monitors)
  Hooks.once('ready', () => {
    if (game.user.isGM) {
      InsightBus.initialize();
      SWSELogger.log('[GM Suggestions] System initialized for GM');
    }
  });
}

/**
 * Emit a suggestion report to trigger GM modules
 * Call this from your suggestion engine when evaluation completes
 *
 * @param {Object} report - SuggestionReport object
 */
export function emitSuggestionReport(report) {
  try {
    Hooks.callAll('swse:suggestion-report-ready', report);
  } catch (err) {
    console.warn('[GM Suggestions] Error emitting report:', err);
  }
}

/**
 * Get current GM insights (for UI or debugging)
 * @returns {Object[]} Array of active insights
 */
export function getGMInsights() {
  return InsightBus.getActiveInsights();
}

/**
 * Open GM suggestion panel (macro-friendly)
 */
export function openGMPanel() {
  if (!game.user.isGM) {
    ui.notifications.warn('GM Suggestion Panel is GM-only');
    return;
  }
  GMSuggestionPanel.open();
}
