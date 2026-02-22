/**
 * Initialization Hooks
 * System initialization and setup hooks
 *
 * @module init-hooks
 * @description
 * Manages system initialization hook registration.
 * Called from index.js during the init hook to register combat, actor, and UI hooks.
 * Also registers a ready hook for species reroll system initialization.
 */

import { SWSELogger } from '../utils/logger.js';
import { HooksRegistry } from './hooks-registry.js';
import { registerCombatHooks } from './combat-hooks.js';
import { registerActorHooks } from './actor-hooks.js';
import { registerUIHooks } from './ui-hooks.js';
import { registerRerollListeners } from '../species/species-reroll-handler.js';

/**
 * Register initialization hooks
 * Called from index.js during the init hook - executes immediately since init is already running
 */
export function registerInitHooks() {
    SWSELogger.log('Registering SWSE hook categories');

    // Register all hook categories - called directly since we're already in init hook
    registerCombatHooks();
    registerActorHooks();
    registerUIHooks();

    // Activate all registered hooks
    HooksRegistry.activateAll();

    SWSELogger.log('SWSE Hooks activated');

    /**
     * Ready hook - runs once after all systems are initialized
     * This registration is valid since ready hasn't fired yet
     */
    Hooks.once('ready', async function() {
        // Initialize species reroll system
        registerRerollListeners();
        SWSELogger.log('Species Trait Engine initialized');

        // Log hook statistics
        const stats = HooksRegistry.getStats();
        SWSELogger.log(`Hooks active: ${stats.active}/${stats.total}`);
    });
}
