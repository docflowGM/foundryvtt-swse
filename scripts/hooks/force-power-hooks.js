/**
 * Force Power Hooks
 * Handles automatic force power grants when feats are added or abilities change
 */

import { ForcePowerManager } from '../utils/force-power-manager.js';

export function initializeForcePowerHooks() {

  /**
   * Hook into item creation to detect Force Sensitivity and Force Training feats
   */
  Hooks.on('createItem', async (item, options, userId) => {
    // Only process on the creating user's client
    if (game.user.id !== userId) return;

    // Only process feats
    if (item.type !== 'feat') return;

    // Only process if item has a parent actor
    if (!item.parent || item.parent.documentName !== 'Actor') return;

    const actor = item.parent;
    const featName = item.name.toLowerCase();

    console.log(`SWSE | Force Powers | Feat added: ${item.name}`);

    // Check for Force Sensitivity
    if (featName.includes('force sensitivity') || featName === 'force sensitive') {
      console.log('SWSE | Force Powers | Detected Force Sensitivity feat');
      await ForcePowerManager.handleForceSensitivity(actor);
    }

    // Check for Force Training
    if (featName.includes('force training')) {
      console.log('SWSE | Force Powers | Detected Force Training feat');

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
    if (game.user.id !== userId) return;

    // Check if abilities are being updated
    if (!changes.system?.abilities) return;

    // Store old abilities for comparison
    options.oldAbilities = foundry.utils.duplicate(actor.system.abilities);
  });

  Hooks.on('updateActor', async (actor, changes, options, userId) => {
    // Only process on the updating user's client
    if (game.user.id !== userId) return;

    // Check if abilities were updated and we have old values
    if (!changes.system?.abilities || !options.oldAbilities) return;

    // Check if actor has Force Training
    if (ForcePowerManager.countForceTrainingFeats(actor) === 0) return;

    const oldAbilities = options.oldAbilities;
    const newAbilities = actor.system.abilities;

    console.log('SWSE | Force Powers | Checking for ability modifier increase');

    await ForcePowerManager.handleAbilityIncrease(actor, oldAbilities, newAbilities);
  });

  console.log('SWSE | Force Power hooks initialized');
}
