/**
 * SuggestionEngineHooks
 *
 * Central registry for all suggestion engine event hooks.
 * Wires callbacks for feat selection, level-up, mentor dialog, etc.
 *
 * Phase 1B: Hook registration only. Phase 1C: Implement callbacks.
 */

import { SWSELogger } from '../utils/logger.js';
import { PlayerHistoryTracker } from './PlayerHistoryTracker.js';
import { BuildIdentityAnchor } from './BuildIdentityAnchor.js';
import { PivotDetector } from './PivotDetector.js';

export class SuggestionEngineHooks {

  /**
   * Initialize all hooks
   * Called during system ready
   */
  static initialize() {
    SWSELogger.log('[SuggestionEngineHooks] Initializing all hooks');

    // TODO: Phase 1C - Implement hook callbacks
    // Hooks.on('swse:feat-selected', this.onFeatSelected.bind(this));
    // Hooks.on('swse:talent-selected', this.onTalentSelected.bind(this));
    // Hooks.on('swse:level-up-complete', this.onLevelUpComplete.bind(this));
    // Hooks.on('swse:mentor-dialog-complete', this.onMentorDialogComplete.bind(this));
    // Hooks.on('swse:suggestion-ignored', this.onSuggestionIgnored.bind(this));

    SWSELogger.log('[SuggestionEngineHooks] Hooks initialized (stubs)');
  }

  /**
   * Handle feat selection event
   */
  static async onFeatSelected(actor, featId, level) {
    // TODO: Phase 1C - Implement callback logic
    SWSELogger.log(`[Hook] Feat selected: ${featId} at level ${level}`);
    // await PlayerHistoryTracker.recordSuggestionAccepted(actor, featId);
    // await BuildIdentityAnchor.validateAndUpdateAnchor(actor);
    // await PivotDetector.updatePivotState(actor);
  }

  /**
   * Handle talent selection event
   */
  static async onTalentSelected(actor, talentId, level) {
    // TODO: Phase 1C - Implement callback logic
    SWSELogger.log(`[Hook] Talent selected: ${talentId} at level ${level}`);
    // Same as onFeatSelected
  }

  /**
   * Handle level-up completion
   */
  static async onLevelUpComplete(actor, newLevel) {
    // TODO: Phase 1C - Implement callback logic
    SWSELogger.log(`[Hook] Level-up complete: ${newLevel}`);
    // await PlayerHistoryTracker.recalculateMetrics(actor);
    // Check for anchor confirmation dialog
    // Check for pivot detection
  }

  /**
   * Handle mentor dialog completion (suggestions finalized)
   */
  static async onMentorDialogComplete(actor, suggestionsShown) {
    // TODO: Phase 1C - Implement callback logic
    SWSELogger.log(`[Hook] Mentor dialog complete, ${suggestionsShown?.length || 0} suggestions shown`);
    // Mark any unselected suggestions as "passiveIgnored"
  }

  /**
   * Handle suggestion explicitly ignored (player said "no")
   */
  static async onSuggestionIgnored(actor, suggestionId, category) {
    // TODO: Phase 1C - Implement callback logic
    SWSELogger.log(`[Hook] Suggestion ignored: ${suggestionId} (${category})`);
    // await PlayerHistoryTracker.recordSuggestionIgnored(actor, suggestionId);
  }
}
