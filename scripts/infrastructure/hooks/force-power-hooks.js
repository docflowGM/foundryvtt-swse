import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
/**
 * Force Power Hooks
 * Handles automatic force power grants when feats are added or abilities change
 * PHASE 10: Recursive guards prevent infinite item creation loops
 * PHASE 2: In-flight mutation guard prevents re-entrant writes
 */

import { ForcePowerManager } from "/systems/foundryvtt-swse/scripts/utils/force-power-manager.js";
import { ForcePowerEffectsEngine } from "/systems/foundryvtt-swse/scripts/engine/force/force-power-effects-engine.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

export function initializeForcePowerHooks() {

  /**
   * Hook into item creation to detect Force Sensitivity and Force Training feats
   */
  Hooks.on('createItem', async (item, options, userId) => {
    // Only process on the creating user's client
    if (game.user.id !== userId) {return;}

    // PHASE 10: Guard against re-entrant item creation from force power grants
    if (options?.meta?.guardKey === 'force-power-grant') {return;}

    // Only process feats
    if (item.type !== 'feat') {return;}

    // Only process if item has a parent actor
    if (!item.parent || item.parent.documentName !== 'Actor') {return;}

    const actor = item.parent;
    const featName = item.name.toLowerCase();

    SWSELogger.log(`SWSE | Force Powers | Feat added: ${item.name}`);

    // Check for Force Sensitivity
    if (featName.includes('force sensitivity') || featName === 'force sensitive') {
      SWSELogger.log('SWSE | Force Powers | Detected Force Sensitivity feat');
      await ForcePowerManager.handleForceSensitivity(actor);
    }

    // Check for Force Training
    if (featName.includes('force training')) {
      SWSELogger.log('SWSE | Force Powers | Detected Force Training feat');

      // Check prerequisite
      if (!ForcePowerManager.hasForceSensitivity(actor)) {
        ui.notifications.warn(`${actor.name} must have Force Sensitivity before taking Force Training!`);
        // Optionally remove the feat
        // await item.delete();
        return;
      }

      await ForcePowerManager.handleForceTraining(actor);
    }
  });

  /**
   * Hook into actor updates to detect ability score increases
   */
  Hooks.on('preUpdateActor', async (actor, changes, options, userId) => {
    // Only process on the updating user's client
    if (game.user.id !== userId) {return;}

    // Check if abilities are being updated
    if (!changes.system?.abilities) {return;}

    // Store old abilities for comparison
    options.oldAbilities = foundry.utils.deepClone(actor.system.attributes);
  });

  Hooks.on('updateActor', async (actor, changes, options, userId) => {
    // Only process on the updating user's client
    if (game.user.id !== userId) {return;}

    // PHASE 10: Guard against re-entrant ability checks from force power grants
    if (options?.meta?.guardKey === 'force-power-grant') {return;}

    // PHASE 2: Skip if actor is currently in an in-flight mutation transaction
    // This prevents re-entrant writes during the original update
    if (ActorEngine.isActorMutationInFlight(actor.id)) {
      SWSELogger.debug(`[ForcePowerHooks] Deferring ability check for ${actor.name} — mutation in flight`);
      return;
    }

    // Check if abilities were updated and we have old values
    if (!changes.system?.abilities || !options.oldAbilities) {return;}

    // Check if actor has Force Training
    if (ForcePowerManager.countForceTrainingFeats(actor) === 0) {return;}

    const oldAbilities = options.oldAbilities;
    const newAbilities = actor.system.attributes;

    SWSELogger.log('SWSE | Force Powers | Checking for ability modifier increase');

    await ForcePowerManager.handleAbilityIncrease(actor, oldAbilities, newAbilities);
  });

  /**
   * Hook into combat end to regain all Force Powers
   */
  Hooks.on('deleteCombat', async (combat, options, userId) => {
    SWSELogger.log('SWSE | Force Powers | Combat ended, regaining Force Powers for all combatants');

    // Regain Force Powers for all actors who were in combat
    for (const combatant of combat.combatants) {
      if (!combatant.actor) {continue;}

      const spentPowers = combatant.actor.items.filter(i =>
        (i.type === 'forcepower' || i.type === 'force-power') && i.system.spent
      );

      if (spentPowers.length > 0) {
        // PHASE 2B: Batch all power updates and route through ActorEngine
        const updates = spentPowers.map(power => ({
          _id: power.id,
          'system.spent': false
        }));

        if (globalThis.SWSE?.ActorEngine?.updateOwnedItems) {
          await globalThis.SWSE.ActorEngine.updateOwnedItems(combatant.actor, updates, {
            meta: { guardKey: 'force-power-grant' }
          });
        } else {
          // Fallback for non-Foundry environments
          for (const power of spentPowers) {
            await power.update({ 'system.spent': false });
          }
        }

        if (combatant.actor.isOwner) {
          ui.notifications.info(`Combat ended. ${combatant.actor.name} regained ${spentPowers.length} Force Power(s)`);
        }
      }
    }
  });

  /**
   * Hook into item deletion to remove associated force power effects
   */
  Hooks.on('deleteItem', async (item, options, userId) => {
    // Only process on the deleting user's client
    if (game.user.id !== userId) {return;}

    // Only process force powers
    if (!['forcepower', 'force-power'].includes(item.type)) {return;}

    // Only process if item has a parent actor
    if (!item.parent || item.parent.documentName !== 'Actor') {return;}

    const actor = item.parent;

    // Remove any active effects from this force power
    await ForcePowerEffectsEngine.removePowerEffects(actor, item);

    SWSELogger.log(`SWSE | Force Power Effects | Cleaned up effects for deleted power: ${item.name}`);
  });

  SWSELogger.log('SWSE | Force Power hooks initialized');
}
