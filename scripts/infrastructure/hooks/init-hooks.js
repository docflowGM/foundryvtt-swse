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
import { registerGrappleFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/grapple-feat-normalization-hooks.js";
import { registerRiflemasterNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/riflemaster-normalization-hooks.js";
import { registerRiflemasterRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/riflemaster-runtime-patches.js";
import { registerPistoleerNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/pistoleer-normalization-hooks.js";
import { registerPistoleerRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/pistoleer-runtime-patches.js";
import { registerSniperNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/sniper-normalization-hooks.js";
import { registerSniperRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/sniper-runtime-patches.js";
import { registerDualWeaponMasteryNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/dual-weapon-mastery-normalization-hooks.js";
import { registerDualWieldRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/dual-wield-runtime-patches.js";
import { registerCoreCombatReactionNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/core-combat-reaction-normalization-hooks.js";
import { registerCoreCombatReactionRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/core-combat-reaction-runtime-patches.js";
import { registerCoreAttackOptionNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/core-attack-option-normalization-hooks.js";
import { registerCoreAttackOptionRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/core-attack-option-runtime-patches.js";
import { registerRageFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/rage-feat-normalization-hooks.js";
import { registerAreaExplosivesFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/area-explosives-feat-normalization-hooks.js";
import { registerMobilityPositioningFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/mobility-positioning-feat-normalization-hooks.js";
import { registerMobilityPositioningRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/mobility-positioning-runtime-patches.js";
import { registerDefenseAvoidanceFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/defense-avoidance-feat-normalization-hooks.js";
import { registerDefenseAvoidanceRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/defense-avoidance-runtime-patches.js";
import { registerAttackOptionsFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/attack-options-feat-normalization-hooks.js";
import { registerMeleeCloseCombatFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/melee-close-combat-feat-normalization-hooks.js";
import { registerRangedCombatFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/ranged-combat-feat-normalization-hooks.js";
import { registerDamageThresholdFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/damage-threshold-feat-normalization-hooks.js";
import { registerSpeciesOriginFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/species-origin-feat-normalization-hooks.js";
import { registerCombatFeatDamageRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/combat-feat-damage-runtime-patches.js";

/**
 * Register initialization hooks
 * Called from index.js during the init hook - executes immediately since init is already running
 */
export function registerInitHooks() {
    SWSELogger.log('Registering SWSE hook categories');

    registerCombatHooks();
    registerActorHooks();
    registerUIHooks();

    HooksRegistry.activateAll();

    SWSELogger.log('SWSE Hooks activated');

    Hooks.once('ready', async function() {
        if (MobileMode?.init) {
            MobileMode.init();
            SWSELogger.log('Mobile Mode initialized');
        } else {
            SWSELogger.warn('Mobile Mode system not available');
        }

        registerMobilePrompt(isMobileCandidate);
        SWSELogger.log('Mobile Mode prompt registered');

        LightsaberLightSync.registerAutoSyncHooks();
        SWSELogger.log('Lightsaber Light Sync hooks registered');

        registerRerollListeners();
        SWSELogger.log('Species Trait Engine initialized');

        FeatActionListeners.initialize();
        SWSELogger.log('Feat Action Listeners initialized');

        registerGrappleFeatNormalizationHooks();
        registerGrappleFeatActions();
        registerGrappleRuntimePatches();
        SWSELogger.log('Grapple Feat Hooks initialized');

        registerRiflemasterNormalizationHooks();
        registerRiflemasterRuntimePatches();
        SWSELogger.log('Riflemaster Feat Hooks initialized');

        registerPistoleerNormalizationHooks();
        registerPistoleerRuntimePatches();
        SWSELogger.log('Pistoleer Feat Hooks initialized');

        registerSniperNormalizationHooks();
        registerSniperRuntimePatches();
        SWSELogger.log('Sniper Feat Hooks initialized');

        registerDualWeaponMasteryNormalizationHooks();
        registerDualWieldRuntimePatches();
        SWSELogger.log('Dual Weapon Mastery and Dual Wield Shape Hooks initialized');

        registerCoreCombatReactionNormalizationHooks();
        registerCoreCombatReactionRuntimePatches();
        SWSELogger.log('Core Combat Reaction Feat Hooks initialized');

        registerCoreAttackOptionNormalizationHooks();
        registerCoreAttackOptionRuntimePatches();
        SWSELogger.log('Core Attack Option Feat Hooks initialized');

        registerRageFeatNormalizationHooks();
        SWSELogger.log('Rage Feat Hooks initialized');

        registerAreaExplosivesFeatNormalizationHooks();
        SWSELogger.log('Area & Explosives Feat Hooks initialized');

        registerMobilityPositioningFeatNormalizationHooks();
        registerMobilityPositioningRuntimePatches();
        SWSELogger.log('Mobility & Positioning Feat Hooks initialized');

        registerDefenseAvoidanceFeatNormalizationHooks();
        registerDefenseAvoidanceRuntimePatches();
        SWSELogger.log('Defense & Avoidance Feat Hooks initialized');

        registerAttackOptionsFeatNormalizationHooks();
        SWSELogger.log('Attack Options Feat Hooks initialized');

        registerMeleeCloseCombatFeatNormalizationHooks();
        SWSELogger.log('Melee & Close Combat Feat Hooks initialized');

        registerRangedCombatFeatNormalizationHooks();
        SWSELogger.log('Ranged Combat Feat Hooks initialized');

        registerDamageThresholdFeatNormalizationHooks();
        SWSELogger.log('Damage & Threshold Feat Hooks initialized');

        registerCombatFeatDamageRuntimePatches();
        SWSELogger.log('Combat Feat Damage Runtime Patches initialized');

        registerSpeciesOriginFeatNormalizationHooks();
        SWSELogger.log('Species & Origin Feat Hooks initialized');

        SWSECombatActionBrowser.init();
        SWSELogger.log('Combat Action Browser initialized');

        const stats = HooksRegistry.getStats();
        SWSELogger.log(`Hooks active: ${stats.active}/${stats.total}`);
    });
}
