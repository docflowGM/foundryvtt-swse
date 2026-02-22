import { ProgressionEngine } from '../engines/progression/engine/progression-engine.js';
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
 */

import { HooksRegistry } from './hooks-registry.js';
import { SWSELogger } from '../utils/logger.js';
import { SpeciesRerollHandler } from '../species/species-reroll-handler.js';

/**
 * Register all combat-related hooks
 * Called during system initialization
 */
export function registerCombatHooks() {
    SWSELogger.log('Registering combat hooks');

    // Check if automation is enabled
    const automationEnabled = game.settings.get('foundryvtt-swse', 'enableAutomation');
    const conditionRecoveryEnabled = game.settings.get('foundryvtt-swse', 'autoConditionRecovery');

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

    // Check if actor is on condition track
    const conditionTrack = actor.system.conditionTrack;
    if (!conditionTrack || conditionTrack.current <= 0) {return;}
    if (conditionTrack.persistent) {return;}

    // Prompt for recovery
    const recover = await SWSEDialogV2.confirm({
        title: game.i18n.localize('SWSE.Dialogs.ConditionRecovery.Title'),
        content: game.i18n.format('SWSE.Dialogs.ConditionRecovery.Content', {
            name: actor.name,
            current: conditionTrack.current
        })
    });

    if (!recover) {return;}

    // Make recovery check
    const endurance = actor.system.skills?.endurance;
    const bonus = endurance?.total || 0;
    const roll = await globalThis.SWSE.RollEngine.safeRoll(`1d20 + ${bonus}`).evaluate({ async: true });

    await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor }),
        flavor: game.i18n.localize('SWSE.Chat.Flavors.ConditionRecovery')
    } , { create: true });

    if (roll.total >= 10) {
        globalThis.SWSE.ActorEngine.updateActor(actor, {
            'system.conditionTrack.current': Math.max(0, conditionTrack.current - 1)
        });


        ui.notifications.info(
            game.i18n.format('SWSE.Notifications.Condition.RecoverySuccess', { name: actor.name })
        );
    } else {
        ui.notifications.warn(
            game.i18n.format('SWSE.Notifications.Condition.RecoveryFailed', { name: actor.name })
        );
    }
}

/**
 * Handle combat end (deletion)
 * Resets once-per-encounter species traits for all combatants
 *
 * @param {Combat} combat - The combat being deleted
 * @param {Object} options - Deletion options
 * @param {string} userId - The user ID deleting the combat
 */
async function handleCombatEnd(combat, options, userId) {
    SWSELogger.log('Combat ended - resetting species encounter traits');

    // Get all combatants from the combat
    for (const combatant of combat.combatants) {
        const actor = combatant.actor;
        if (!actor) {continue;}

        try {
            // Reset species encounter traits
            await SpeciesRerollHandler.resetEncounterTraits(actor);
            SWSELogger.log(`Reset species traits for ${actor.name}`);
        } catch (err) {
            SWSELogger.error(`Error resetting species traits for ${actor.name}:`, err);
        }
    }

    // Emit phase-changed hook so scene controls can re-filter
    Hooks.callAll('swse:phase-changed', 'narrative');
}
