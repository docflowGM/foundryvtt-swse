/**
 * SWSE Level Up System
 * Handles character leveling with class selection and HP rolls
 * Uses enhanced version for visual talent trees and multi-classing
 *
 * NOTE: This module is maintained for backwards compatibility.
 * The enhanced level-up system (SWSELevelUpEnhanced) should be used for all
 * level-up operations.
 */

import { SWSELogger, swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SWSELevelUpEnhanced } from "/systems/foundryvtt-swse/scripts/apps/swse-levelup-enhanced.js";
import { RolloutSettings } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/rollout/rollout-settings.js";

export class SWSELevelUp {
    /**
     * Open enhanced level up dialog (RECOMMENDED)
     * @param {Actor} actor - The actor to level up
     * @returns {Promise<boolean>} True if leveled up, false if cancelled
     */
    static async openEnhanced(actor) {
        if (!actor) {
            ui.notifications.error('No actor provided for level up.');
            return false;
        }

        // PHASE 4 STEP 5: Check if legacy level-up should be offered
        const rolloutMode = RolloutSettings.getRolloutMode();
        const legacyAvailable = RolloutSettings.shouldSupportLegacyFallback();

        if (rolloutMode === 'legacy-fallback' && legacyAvailable) {
            // Legacy fallback mode - legacy level-up is available
            swseLogger.log('[SWSELevelUp] Opening legacy level-up (fallback mode)');
        } else if (!legacyAvailable && rolloutMode !== 'default' && rolloutMode !== 'internal') {
            // Not in a mode that supports legacy fallback - should use unified
            swseLogger.warn(`[SWSELevelUp] Legacy level-up not available in "${rolloutMode}" mode. Use unified progression instead.`);
            ui.notifications.info('Unified level-up is now the primary system. Opening unified progression...');
            const { launchProgression } = await import('/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js');
            await launchProgression(actor);
            return true;
        }

        try {
            const levelUpDialog = new SWSELevelUpEnhanced(actor);
            levelUpDialog.render(true);
            return true;
        } catch (err) {
            // If the enhanced dialog fails (e.g., incomplete character redirect),
            // the error is expected and handled internally
            if (err.message?.includes('redirecting to character generator')) {
                return false;
            }
            swseLogger.error('SWSE Level Up | Error opening enhanced dialog:', err);
            ui.notifications.error('Failed to open level up dialog.');
            return false;
        }
    }
}
