/**
 * ============================================
 * Class Prerequisites System Initialization
 * ============================================
 *
 * Called at system load to:
 * 1. Load all class documents from compendium
 * 2. Normalize prestige class prerequisites
 * 3. Cache normalized prerequisites
 * 4. Ensure both prerequisite engine and suggestion engine can read the same data
 *
 * INVARIANT:
 * SuggestionEngine and PrerequisiteEngine consume the SAME normalizedPrereqs.
 * If a class is illegal, it must never be suggested.
 *
 * ============================================
 */

import { normalizeAndCacheAll } from "/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/class-prerequisites-cache.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Initialize class prerequisites cache.
 * Call this once when the system loads.
 *
 * @returns {Promise<Object>} - Initialization stats
 */
export async function initializeClassPrerequisitesCache() {
    try {
        SWSELogger.log('[ClassPrereqInit] Initializing class prerequisites cache...');

        // Get classes from registry
        if (!ClassesRegistry.isInitialized()) {
            SWSELogger.warn('[ClassPrereqInit] ClassesRegistry not initialized. Cache not initialized.');
            return { success: false, error: 'ClassesRegistry not initialized' };
        }

        // Load all class documents
        SWSELogger.log('[ClassPrereqInit] Loading class documents from registry...');
        const classDocuments = ClassesRegistry.getAll();
        SWSELogger.log(`[ClassPrereqInit] Loaded ${classDocuments.length} class documents`);

        // Normalize and cache
        const stats = normalizeAndCacheAll(classDocuments);

        SWSELogger.log('[ClassPrereqInit] Class prerequisites cache initialized', stats);
        return {
            success: true,
            stats
        };
    } catch (error) {
        SWSELogger.error('[ClassPrereqInit] Error initializing cache:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Hook this into the 'ready' event.
 * In your main system load file, call:
 *
 * Hooks.once('ready', () => {
 *   import('./scripts/progression/prerequisites/class-prerequisites-init.js')
 *     .then(m => m.initializeClassPrerequisitesCache());
 * });
 */
