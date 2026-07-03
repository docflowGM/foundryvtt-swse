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

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { HooksRegistry } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js";
import { registerCombatHooks } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/combat-hooks.js";
import { registerActorHooks } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/actor-hooks.js";
import { registerUIHooks } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/ui-hooks.js";
import { registerRerollListeners } from "/systems/foundryvtt-swse/scripts/species/species-reroll-handler.js";
import { SWSECombatActionBrowser } from "/systems/foundryvtt-swse/scripts/apps/combat-action-browser.js";
import { isMobileCandidate } from "/systems/foundryvtt-swse/scripts/ui/mobile-mode-detector.js";
import { registerMobilePrompt } from "/systems/foundryvtt-swse/scripts/ui/mobile-mode-prompt.js";
import LightsaberLightSync from "/systems/foundryvtt-swse/scripts/utils/lightsaber-light-sync.js";
import MobileMode from "/systems/foundryvtt-swse/scripts/ui/mobile-mode-manager.js";
import { FeatActionListeners } from "/systems/foundryvtt-swse/scripts/engine/feats/feat-action-listeners.js";
import { registerGrappleFeatActions } from "/systems/foundryvtt-swse/scripts/engine/feats/grapple-feat-actions.js";
import { registerGrappleRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/grapple-runtime-patches.js";
import { registerRiflemasterNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/riflemaster-normalization-hooks.js";
import { registerRiflemasterRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/riflemaster-runtime-patches.js";
import { registerPistoleerNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/pistoleer-normalization-hooks.js";
import { registerPistoleerRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/pistoleer-runtime-patches.js";
import { registerSniperNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/sniper-normalization-hooks.js";
import { registerSniperRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/sniper-runtime-patches.js";
import { registerDualWeaponMasteryNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/dual-weapon-mastery-normalization-hooks.js";
import { registerDualWieldRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/dual-wield-runtime-patches.js";

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
        // Initialize mobile mode system
        if (MobileMode?.init) {
            MobileMode.init();
            SWSELogger.log('Mobile Mode initialized');
        } else {
            SWSELogger.warn('Mobile Mode system not available');
        }

        // Register mobile prompt (only shows on eligible devices)
        registerMobilePrompt(isMobileCandidate);
        SWSELogger.log('Mobile Mode prompt registered');

        // Initialize lightsaber light synchronization (ties blade color to token light)
        LightsaberLightSync.registerAutoSyncHooks();
        SWSELogger.log('Lightsaber Light Sync hooks registered');

        // Initialize species reroll system
        registerRerollListeners();
        SWSELogger.log('Species Trait Engine initialized');

        // Initialize feat action listeners (Sadistic Strike, Stay Up, etc.)
        FeatActionListeners.initialize();
        SWSELogger.log('Feat Action Listeners initialized');

        // Expose assisted grapple feat helpers for sheets/macros/action bars.
        registerGrappleFeatActions();
        SWSELogger.log('Grapple Feat Actions initialized');

        // Patch canonical SWSEGrappling methods for metadata-backed feats and RAW tie behavior.
        registerGrappleRuntimePatches();
        SWSELogger.log('Grapple Runtime Patches initialized');

        // Normalize and patch Riflemaster rifle-specific benefits.
        registerRiflemasterNormalizationHooks();
        registerRiflemasterRuntimePatches();
        SWSELogger.log('Riflemaster Feat Hooks initialized');

        // Normalize and patch Pistoleer pistol-specific benefits.
        registerPistoleerNormalizationHooks();
        registerPistoleerRuntimePatches();
        SWSELogger.log('Pistoleer Feat Hooks initialized');

        // Normalize and patch Sniper soft-cover suppression.
        registerSniperNormalizationHooks();
        registerSniperRuntimePatches();
        SWSELogger.log('Sniper Feat Hooks initialized');

        // Normalize Dual Weapon Mastery I/II/III slugs and expose dual-wield combat shape.
        registerDualWeaponMasteryNormalizationHooks();
        registerDualWieldRuntimePatches();
        SWSELogger.log('Dual Weapon Mastery and Dual Wield Shape Hooks initialized');

        // Initialize Combat Action Browser (Token HUD button)
        SWSECombatActionBrowser.init();
        SWSELogger.log('Combat Action Browser initialized');

        // Log hook statistics
        const stats = HooksRegistry.getStats();
        SWSELogger.log(`Hooks active: ${stats.active}/${stats.total}`);
    });
}
