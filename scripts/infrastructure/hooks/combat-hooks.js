import { ProgressionEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/progression-engine.js";
/**
 * Combat Lifecycle Hooks
 * All combat-related hook handlers consolidated here
 *
 * @module combat-hooks
 * @description
 * Manages all combat lifecycle hooks with proper execution ordering:
 * - createCombat: Combat initialization
 * - combatRound: Round tracking
 * - combatTurn: Turn tracking, condition recovery, automation
 * - deleteCombat: Combat cleanup, species trait reset
 * - SWSE Roll hooks: FX integration (projectiles, blade effects, etc.)
 */

import { HooksRegistry } from "/systems/foundryvtt-swse/scripts/infrastructure/hooks/hooks-registry.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SpeciesRerollHandler } from "/systems/foundryvtt-swse/scripts/species/species-reroll-handler.js";
import { NativeProjectileService } from "/systems/foundryvtt-swse/scripts/visual/native-projectile-service.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { EncounterUseTracker } from "/systems/foundryvtt-swse/scripts/engine/feats/encounter-use-tracker.js";

/**
 * Register all combat-related hooks
 * Called during system initialization
 */
export function registerCombatHooks() {
    SWSELogger.log('Registering combat hooks');

    // Check if automation is enabled
    const automationEnabled = HouseRuleService.isEnabled('enableAutomation');
    const conditionRecoveryEnabled = HouseRuleService.isEnabled('autoConditionRecovery');

    // Combat creation
    HooksRegistry.register('createCombat', handleCombatCreate, {
        id: 'combat-create',
        priority: 0,
        description: 'Initialize combat tracking',
        category: 'combat',
        enabled: automationEnabled
    });

    // Combat round tracking
    HooksRegistry.register('combatRound', handleCombatRound, {
        id: 'combat-round',
        priority: 0,
        description: 'Track combat rounds',
        category: 'combat',
        enabled: automationEnabled
    });

    // Combat turn tracking (FIRST - before condition recovery)
    HooksRegistry.register('combatTurn', handleCombatTurn, {
        id: 'combat-turn-tracking',
        priority: 0,
        description: 'Track combat turns and log current combatant',
        category: 'combat',
        enabled: automationEnabled
    });

    // Combat turn - condition recovery (AFTER turn tracking)
    HooksRegistry.register('combatTurn', handleConditionRecovery, {
        id: 'combat-turn-condition-recovery',
        priority: 10,
        description: 'Prompt for condition recovery at turn start',
        category: 'combat',
        enabled: conditionRecoveryEnabled
    });

    // Combat deletion - reset encounter traits
    HooksRegistry.register('deleteCombat', handleCombatEnd, {
        id: 'combat-end-species-reset',
        priority: 0,
        description: 'Reset once-per-encounter species traits when combat ends',
        category: 'combat',
        enabled: true // Always enabled - species traits should reset
    });

    // PHASE 6: FX Integration - Wire projectile FX to attack rolls
    // Triggered after attack rolls to render projectile animations
    Hooks.on('swse.postRollAttack', handlePostAttackFX);
    SWSELogger.log('Post-attack FX hook registered');
}

/**
 * Handle combat creation
 * Initializes combat tracking and emits phase change
 *
 * @param {Combat} combat - The combat being created
 * @param {Object} options - Creation options
 * @param {string} userId - The user ID creating the combat
 */
function handleCombatCreate(combat, options, userId) {
    SWSELogger.log('Combat created:', combat.name);
    // Emit phase-changed hook so scene controls can re-filter
    Hooks.callAll('swse:phase-changed', 'combat');
}

/**
 * Handle combat round changes
 * Tracks and logs combat rounds
 *
 * @param {Combat} combat - The combat tracker
 * @param {Object} updateData - The update data
 * @param {Object} updateOptions - Update options
 */
function handleCombatRound(combat, updateData, updateOptions) {
    SWSELogger.log(`Combat Round ${combat.round}`);
}

/**
 * Handle combat turn changes
 * Tracks and logs whose turn it is
 *
 * @param {Combat} combat - The combat tracker
 * @param {Object} updateData - The update data
 * @param {Object} updateOptions - Update options
 */
function handleCombatTurn(combat, updateData, updateOptions) {
    const combatant = combat.combatant;
    if (combatant?.actor) {
        SWSELogger.log(`Turn: ${combatant.actor.name}`);
    }
}

/**
 * Handle condition recovery at turn start
 * Prompts player to attempt condition track recovery
 *
 * @param {Combat} combat - The combat tracker
 * @param {Object} updateData - The update data
 * @param {Object} updateOptions - Update options
 */
async function handleConditionRecovery(combat, updateData, updateOptions) {
    const combatant = combat.combatant;
    if (!combatant) {return;}

    const actor = combatant.actor;
    if (!actor) {return;}

    // RAW note: Recover Action is not an Endurance check. It requires 3 Swift Actions
    // spent in the same round or across consecutive rounds, and cannot be used while
    // the condition is Persistent. This hook only expires stale progress when
    // rounds are skipped so actors do not keep illegal recovery credit forever.
    const progress = actor.getFlag?.('foundryvtt-swse', 'conditionRecoverProgress');
    if (!progress) {return;}

    const round = Number(combat.round ?? 0);
    const progressRound = Number(progress.round ?? -999);
    const sameCombat = progress.combatId === combat.id;
    if (!sameCombat || round > progressRound + 1) {
      await actor.unsetFlag?.('foundryvtt-swse', 'conditionRecoverProgress');
    }
}

/**
 * Handle combat end (deletion)
 * Resets once-per-encounter species traits and reroll uses for all combatants
 *
 * @param {Combat} combat - The combat being deleted
 * @param {Object} options - Deletion options
 * @param {string} userId - The user ID deleting the combat
 */
async function handleCombatEnd(combat, options, userId) {
    SWSELogger.log('Combat ended - resetting encounter-limited features');

    // Get all combatants from the combat
    for (const combatant of combat.combatants) {
        const actor = combatant.actor;
        if (!actor) {continue;}

        try {
            // Reset species encounter traits
            await SpeciesRerollHandler.resetEncounterTraits(actor);
            SWSELogger.log(`Reset species traits for ${actor.name}`);

            // Reset encounter-limited reroll uses
            await EncounterUseTracker.resetAllUses(actor);
            SWSELogger.log(`Reset encounter-limited features for ${actor.name}`);
        } catch (err) {
            SWSELogger.error(`Error resetting encounter features for ${actor.name}:`, err);
        }
    }

    // Emit phase-changed hook so scene controls can re-filter
    Hooks.callAll('swse:phase-changed', 'narrative');
}

/**
 * Handle post-attack FX
 * Fires projectile animations for attack rolls when cinematic effects are enabled
 *
 * @param {Object} context - The attack roll context
 * @param {Object} context.weapon - The weapon used for the attack
 * @param {Actor} context.attacker - The actor performing the attack
 * @param {Actor} context.target - The target actor
 * @param {Token} context.attackerToken - Token of attacker
 * @param {Token} context.targetToken - Token of target
 * @param {Object} context.outcome - Attack outcome details
 */
async function handlePostAttackFX(context) {
    // Check if cinematic effects are enabled
    const cinematicEffectsEnabled = HouseRuleService.isEnabled('enableCinematicEffects');
    if (!cinematicEffectsEnabled) {
        return;
    }

    const { weapon, attackerToken, targetToken, outcome } = context;

    // Validate required context
    if (!weapon || !attackerToken || !targetToken) {
        return;
    }

    try {
        // Fire projectile with weapon and token data
        await NativeProjectileService.fire(attackerToken, targetToken, weapon, context);
    } catch (err) {
        SWSELogger.error('Error firing projectile FX:', err);
    }
}
