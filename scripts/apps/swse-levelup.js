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
import { launchProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";

export class SWSELevelUp {
    /**
     * Open enhanced level up dialog (RECOMMENDED)
     * @param {Actor} actor - The actor to level up
     * @returns {Promise<boolean>} True if leveled up, false if cancelled
     */
    static async openEnhanced(actor, options = {}) {
        if (!actor) {
            ui.notifications.error('No actor provided for level up.');
            return false;
        }

        try {
            await launchProgression(actor, options);
            return true;
        } catch (err) {
            swseLogger.error('SWSE Level Up | Error opening unified level-up:', err);
            ui.notifications.error('Failed to open level up dialog.');
            return false;
        }
    }
}
