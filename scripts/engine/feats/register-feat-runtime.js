/**
 * Feat Runtime Registration Manifest
 *
 * @module register-feat-runtime
 * @description
 * Single orchestrator for all feat normalization + runtime-patch registration.
 * Extracted from init-hooks.js to stop every new feat family competing for edits
 * in that file. init-hooks.js now imports ONE symbol and makes ONE call.
 *
 * ORDER IS SIGNIFICANT. Normalization hooks generally run before the runtime
 * patches that consume the metadata they produce. The sequence below is the exact
 * order previously inlined in the `ready` hook of init-hooks.js — do not reorder
 * without understanding the normalize→patch dependency for each family.
 *
 * Registration groups (in order):
 *   1.  grapple feat normalization / actions / runtime / expanded runtime
 *   2.  Force Point feat hooks
 *   3.  droid combat feat hooks
 *   4.  weapon-style feat hooks (Riflemaster, Pistoleer, Sniper, Dual Weapon)
 *   5.  core combat reaction hooks
 *   6.  core attack option hooks
 *   7.  rage hooks
 *   8.  area / explosives hooks
 *   9.  mobility / positioning hooks
 *   10. defense / avoidance hooks + defense feat runtime patches
 *   11. attack options hooks
 *   12. melee / close combat hooks
 *   13. ranged combat hooks
 *   14. damage / threshold hooks + combat feat damage runtime patches
 *   15. species / origin hooks
 *
 * The per-group SWSELogger.log() calls are preserved so boot-time visibility is
 * identical to the previous inlined version.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { registerGrappleFeatActions } from "/systems/foundryvtt-swse/scripts/engine/feats/grapple-feat-actions.js";
import { registerGrappleRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/grapple-runtime-patches.js";
import { registerGrappleExpandedRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/grapple-expanded-runtime-patches.js";
import { registerGrappleFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/grapple-feat-normalization-hooks.js";
import { registerForcePointFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/force-point-feat-normalization-hooks.js";
import { registerForcePointFeatActions } from "/systems/foundryvtt-swse/scripts/engine/feats/force-point-feat-actions.js";
import { registerForceTrainingEntitlementRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/force-training-entitlement-runtime-patches.js";
import { registerForcePointServiceRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/force-point-service-runtime-patches.js";
import { registerTelekineticProdigyRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/telekinetic-prodigy-runtime-patches.js";
import { registerDroidCombatFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/droid-combat-feat-normalization-hooks.js";
import { registerDroidCombatRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/droid-combat-runtime-patches.js";
import { registerDroidCombatActionAdapter } from "/systems/foundryvtt-swse/scripts/engine/combat/droid-combat-action-adapter.js";
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
import { registerDefenseAvoidanceFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/defense-avoidance-feat-normalization-hooks.js";
import { registerAttackOptionsFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/attack-options-feat-normalization-hooks.js";
import { registerMeleeCloseCombatFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/melee-close-combat-feat-normalization-hooks.js";
import { registerRangedCombatFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/ranged-combat-feat-normalization-hooks.js";
import { registerDamageThresholdFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/damage-threshold-feat-normalization-hooks.js";
import { registerSpeciesOriginFeatNormalizationHooks } from "/systems/foundryvtt-swse/scripts/engine/feats/species-origin-feat-normalization-hooks.js";
import { registerCombatFeatDamageRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/combat-feat-damage-runtime-patches.js";
import { registerDefenseFeatRuntimePatches } from "/systems/foundryvtt-swse/scripts/engine/feats/defense-feat-runtime-patches.js";

/**
 * Register all feat normalization + runtime systems, in dependency order.
 * Call once from the `ready` hook (init-hooks.js).
 */
export function registerFeatRuntime() {
    // Normalize grapple feats into metadata consumed by the existing Grapple engine.
    registerGrappleFeatNormalizationHooks();
    SWSELogger.log('Grapple Feat Normalization Hooks initialized');

    // Expose assisted grapple feat helpers for sheets/macros/action bars.
    registerGrappleFeatActions();
    SWSELogger.log('Grapple Feat Actions initialized');

    // Patch canonical SWSEGrappling methods for metadata-backed feats and RAW tie behavior.
    registerGrappleRuntimePatches();
    SWSELogger.log('Grapple Runtime Patches initialized');

    // Patch expanded grapple feat riders that hook damage/action helpers.
    registerGrappleExpandedRuntimePatches();
    SWSELogger.log('Expanded Grapple Feat Runtime Patches initialized');

    // Normalize and expose Force Point / Force Power feat helpers.
    registerForcePointFeatNormalizationHooks();
    registerForcePointFeatActions();
    registerForceTrainingEntitlementRuntimePatches();
    registerForcePointServiceRuntimePatches();
    registerTelekineticProdigyRuntimePatches();
    SWSELogger.log('Force Point Feat Hooks initialized');

    // Normalize, expose, and inject droid-focused combat/utility feat helpers.
    registerDroidCombatFeatNormalizationHooks();
    registerDroidCombatRuntimePatches();
    registerDroidCombatActionAdapter();
    SWSELogger.log('Droid Combat Feat Hooks initialized');

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

    // Normalize and expose core combat reaction feats such as Cleave and Combat Reflexes.
    registerCoreCombatReactionNormalizationHooks();
    registerCoreCombatReactionRuntimePatches();
    SWSELogger.log('Core Combat Reaction Feat Hooks initialized');

    // Normalize and patch core attack-option feats such as Power Attack, Rapid Shot, and Flurry.
    registerCoreAttackOptionNormalizationHooks();
    registerCoreAttackOptionRuntimePatches();
    SWSELogger.log('Core Attack Option Feat Hooks initialized');

    // Normalize Rage feat modifiers into the Rage engine rule contract.
    registerRageFeatNormalizationHooks();
    SWSELogger.log('Rage Feat Hooks initialized');

    // Normalize Area & Explosives feats into attack-option or advisory metadata.
    registerAreaExplosivesFeatNormalizationHooks();
    SWSELogger.log('Area & Explosives Feat Hooks initialized');

    // Normalize Mobility & Positioning feats into movement, reaction, or positioning metadata.
    registerMobilityPositioningFeatNormalizationHooks();
    SWSELogger.log('Mobility & Positioning Feat Hooks initialized');

    // Normalize Defense & Avoidance feats into defense and threshold metadata.
    registerDefenseAvoidanceFeatNormalizationHooks();
    SWSELogger.log('Defense & Avoidance Feat Hooks initialized');

    // Consume static defense feat metadata through the existing ModifierEngine pipeline.
    registerDefenseFeatRuntimePatches();
    SWSELogger.log('Defense Feat Runtime Patches initialized');

    // Normalize small Attack Options feats into reaction, draw, and stun metadata.
    registerAttackOptionsFeatNormalizationHooks();
    SWSELogger.log('Attack Options Feat Hooks initialized');

    // Normalize Melee & Close Combat feats into melee/full-attack metadata.
    registerMeleeCloseCombatFeatNormalizationHooks();
    SWSELogger.log('Melee & Close Combat Feat Hooks initialized');

    // Normalize Ranged Combat feats into ranged-reaction and thrown-weapon metadata.
    registerRangedCombatFeatNormalizationHooks();
    SWSELogger.log('Ranged Combat Feat Hooks initialized');

    // Normalize Damage & Threshold feats into damage-rider and combo metadata.
    registerDamageThresholdFeatNormalizationHooks();
    SWSELogger.log('Damage & Threshold Feat Hooks initialized');

    // Patch runtime damage resolution for exact combat feat damage rules.
    registerCombatFeatDamageRuntimePatches();
    SWSELogger.log('Combat Feat Damage Runtime Patches initialized');

    // Normalize Species & Origin feats into metadata-only species-origin classifications.
    registerSpeciesOriginFeatNormalizationHooks();
    SWSELogger.log('Species & Origin Feat Hooks initialized');
}
