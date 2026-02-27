/**
 * SuggestionEngineHooks
 *
 * Phase 2: Event Hook Wiring
 * Phase F: Refactored to use SuggestionStateService (separation of concerns)
 *
 * Central registry for all suggestion engine event hooks.
 * Wires callbacks for feat/talent selection, level-up, mentor dialog, etc.
 *
 * GOVERNANCE: This module orchestrates state changes but does NOT mutate directly.
 * All state persistence goes through SuggestionStateService.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { PlayerHistoryTracker } from "/systems/foundryvtt-swse/scripts/engine/suggestion/PlayerHistoryTracker.js";
import { BuildIdentityAnchor } from "/systems/foundryvtt-swse/scripts/engine/suggestion/BuildIdentityAnchor.js";
import { PivotDetector } from "/systems/foundryvtt-swse/scripts/engine/suggestion/PivotDetector.js";
import { SuggestionStateService } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionStateService.js";

export class SuggestionEngineHooks {

  /**
   * Initialize all hooks
   * Called during system ready
   */
  static initialize() {
    SWSELogger.log('[SuggestionEngineHooks] Initializing Phase 2 hooks');

    // Register Foundry hooks (if available)
    if (typeof Hooks !== 'undefined') {
      Hooks.on('swse:feat-selected', this.onFeatSelected.bind(this));
      Hooks.on('swse:talent-selected', this.onTalentSelected.bind(this));
      Hooks.on('swse:level-up-complete', this.onLevelUpComplete.bind(this));
      Hooks.on('swse:mentor-dialog-complete', this.onMentorDialogComplete.bind(this));
      Hooks.on('swse:suggestion-ignored', this.onSuggestionIgnored.bind(this));
    }

    SWSELogger.log('[SuggestionEngineHooks] All hooks registered');
  }

  /**
   * Handle feat/talent selection event
   * Called when player selects a feat or talent
   * Updates history, anchor, and pivot state
   */
  static async onSelectionMade(actor, itemId, itemName, category, theme) {
    try {
      // Initialize storage if needed
      await PlayerHistoryTracker.initializeStorage(actor);
      await BuildIdentityAnchor.initializeStorage(actor);
      await PivotDetector.initializeStorage(actor);

      // Record the selection in history
      // Note: This assumes the suggestion was already recorded as "shown"
      // We'll mark it as accepted
      const history = actor.system.suggestionEngine?.history?.recent || [];
      const matchingEntry = history.find(e => e.itemId === itemId);
      if (matchingEntry) {
        await PlayerHistoryTracker.recordSuggestionAccepted(actor, matchingEntry.id);
      }

      // Recalculate metrics based on updated history
      await PlayerHistoryTracker.recalculateMetrics(actor);

      // Update anchor state (may propose or advance state)
      const anchorResult = await BuildIdentityAnchor.validateAndUpdateAnchor(actor);
      if (anchorResult.updated) {
        SWSELogger.log(`[Hooks] Anchor state changed: ${anchorResult.newState}`);
      }

      // Update pivot state (may transition between states)
      const pivotResult = PivotDetector.updatePivotState(actor);
      if (pivotResult.transitioned && pivotResult.newState) {
        // Route through SuggestionStateService instead of direct mutation
        await SuggestionStateService.updatePivotState(actor, pivotResult.newState);
        swseLogger.log(`[Hooks] Pivot state changed: ${pivotResult.newState} (divergence: ${pivotResult.divergence.toFixed(2)})`);
      }
    } catch (err) {
      SWSELogger.error('[Hooks] Error in selection handler:', err);
    }
  }

  /**
   * Handle feat selection event
   */
  static async onFeatSelected(actor, featId, featName, theme) {
    SWSELogger.log(`[Hook] Feat selected: ${featName}`);
    await this.onSelectionMade(actor, featId, featName, 'feat', theme);
  }

  /**
   * Handle talent selection event
   */
  static async onTalentSelected(actor, talentId, talentName, theme) {
    SWSELogger.log(`[Hook] Talent selected: ${talentName}`);
    await this.onSelectionMade(actor, talentId, talentName, 'talent', theme);
  }

  /**
   * Handle level-up completion
   * Called after a level-up dialog closes
   * Validates anchors, checks for pivots, and prepares next suggestions
   */
  static async onLevelUpComplete(actor, newLevel) {
    try {
      SWSELogger.log(`[Hook] Level-up complete: level ${newLevel}`);

      // Initialize all storages
      await PlayerHistoryTracker.initializeStorage(actor);
      await BuildIdentityAnchor.initializeStorage(actor);
      await PivotDetector.initializeStorage(actor);

      // Recalculate metrics based on new selections
      await PlayerHistoryTracker.recalculateMetrics(actor);

      // Validate and update anchor state
      const anchorResult = await BuildIdentityAnchor.validateAndUpdateAnchor(actor);
      if (anchorResult.updated) {
        SWSELogger.log(`[Hooks] Anchor updated at level ${newLevel}: ${anchorResult.newState}`);
        // TODO: Could trigger UI element to ask player for confirmation if PROPOSED
      }

      // Update pivot state based on recent picks
      const pivotResult = PivotDetector.updatePivotState(actor);
      if (pivotResult.transitioned && pivotResult.newState) {
        // Route through SuggestionStateService instead of direct mutation
        await SuggestionStateService.updatePivotState(actor, pivotResult.newState);
        swseLogger.log(`[Hooks] Pivot state: ${pivotResult.newState} (divergence: ${pivotResult.divergence.toFixed(2)})`);
      }

      // Store level-up metadata through SuggestionStateService
      await SuggestionStateService.updateMetadata(actor, {
        lastLevelUp: Date.now(),
        lastUpdatedAtLevel: newLevel
      });
    } catch (err) {
      SWSELogger.error('[Hooks] Error in level-up handler:', err);
    }
  }

  /**
   * Handle mentor dialog completion
   * Called when the mentor dialog closes
   * Marks any unselected suggestions as passively ignored
   */
  static async onMentorDialogComplete(actor, suggestionsShown) {
    try {
      SWSELogger.log(`[Hook] Mentor dialog complete, ${suggestionsShown?.length || 0} suggestions shown`);

      if (!suggestionsShown || suggestionsShown.length === 0) {
        return;
      }

      // For any suggestion shown but not selected, mark as passiveIgnored
      const history = actor.system.suggestionEngine?.history?.recent || [];
      for (const suggestion of suggestionsShown) {
        const entry = history.find(e => e.itemId === suggestion.itemId);
        if (entry && !entry.outcome) {
          // Suggestion was shown but player didn't select it
          await PlayerHistoryTracker.recordSuggestionPassiveIgnored(actor, entry.id);
        }
      }

      // Recalculate metrics with the passive ignores
      await PlayerHistoryTracker.recalculateMetrics(actor);
    } catch (err) {
      SWSELogger.error('[Hooks] Error in mentor dialog handler:', err);
    }
  }

  /**
   * Handle suggestion explicitly ignored
   * Called when player explicitly rejects a suggestion (clicks "No thanks")
   */
  static async onSuggestionIgnored(actor, suggestionId, category) {
    try {
      SWSELogger.log(`[Hook] Suggestion explicitly ignored: ${suggestionId}`);

      // Record the explicit ignore
      await PlayerHistoryTracker.recordSuggestionIgnored(actor, suggestionId);

      // Recalculate metrics (explicit ignores affect acceptance rates)
      await PlayerHistoryTracker.recalculateMetrics(actor);
    } catch (err) {
      SWSELogger.error('[Hooks] Error in ignore handler:', err);
    }
  }
}
