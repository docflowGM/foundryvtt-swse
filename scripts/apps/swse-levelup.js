/**
 * SWSE Level Up System
 * Handles character leveling with class selection and HP rolls
 * Uses enhanced version for visual talent trees and multi-classing
 *
 * NOTE: This module is maintained for backwards compatibility.
 * The enhanced level-up system (SWSELevelUpEnhanced) should be used for all
 * level-up operations.
 */

import { SWSELogger, swseLogger } from '../utils/logger.js';
import { SWSELevelUpEnhanced } from './swse-levelup-enhanced.js';

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
