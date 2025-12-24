/**
 * Initialization Hooks
 * System initialization and setup hooks
 *
 * @module init-hooks
 * @description
 * Manages system initialization:
 * - init: Core system setup
 * - ready: Post-initialization setup
 *
 * NOTE: These hooks are registered directly (not through HooksRegistry)
 * because they need to run before the registry itself is activated.
 */

import { SWSELogger } from '../utils/logger.js';
import { HooksRegistry } from './hooks-registry.js';
import { ThemeLoader } from '../theme-loader.js';
import { registerCombatHooks } from './combat-hooks.js';
import { registerActorHooks } from './actor-hooks.js';
import { registerUIHooks } from './ui-hooks.js';
import { registerRerollListeners } from '../species/species-reroll-handler.js';

/**
 * Register initialization hooks
 * These are registered directly, not through the registry
 */
export function registerInitHooks() {
    /**
     * Init hook - runs once during system initialization
     * This is where we register all other hooks
     */
    Hooks.once('init', async function() {
        SWSELogger.log("Initializing SWSE System");

        // Register all hook categories
        registerCombatHooks();
        registerActorHooks();
        registerUIHooks();

        // Activate all registered hooks
        HooksRegistry.activateAll();

        SWSELogger.log("SWSE Hooks activated");
    });

    /**
     * Ready hook - runs once after all systems are initialized
     * This is for setup that requires other systems to be ready
     */
    Hooks.once('ready', async function() {
        SWSELogger.log("SWSE System Ready");

        // Initialize theme system
        ThemeLoader.initialize();

        // Initialize species reroll system
        registerRerollListeners();
        SWSELogger.log("Species Trait Engine initialized");

        // Log hook statistics
        const stats = HooksRegistry.getStats();
        SWSELogger.log(`Hooks active: ${stats.active}/${stats.total}`);
    });
}
