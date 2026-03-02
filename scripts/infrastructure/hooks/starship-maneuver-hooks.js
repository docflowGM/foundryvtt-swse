import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
/**
 * Starship Maneuver Hooks
 * Handles automatic maneuver grants when feats are added or abilities change
 * PHASE 10: Recursive guards prevent infinite item creation loops
 */

import { StarshipManeuverManager } from "/systems/foundryvtt-swse/scripts/utils/starship-maneuver-manager.js";

export function initializeStarshipManeuverHooks() {

  /**
   * Hook into item creation to detect Starship Tactics feat
   */
  Hooks.on('createItem', async (item, options, userId) => {
    // Only process on the creating user's client
    if (game.user.id !== userId) {return;}

    // PHASE 10: Guard against re-entrant item creation from maneuver grants
    if (options?.meta?.guardKey === 'starship-maneuver-grant') {return;}

    // Only process feats
    if (item.type !== 'feat') {return;}

    // Only process if item has a parent actor
    if (!item.parent || item.parent.documentName !== 'Actor') {return;}

    const actor = item.parent;
    const featName = item.name.toLowerCase();

    SWSELogger.log(`SWSE | Starship Maneuvers | Feat added: ${item.name}`);

    // Check for Starship Tactics feat
    if (featName === 'starship tactics' || featName.includes('starship tactics')) {
      SWSELogger.log('SWSE | Starship Maneuvers | Detected Starship Tactics feat');
      await StarshipManeuverManager.handleStartshipTactics(actor);
    }
  });

  /**
   * Hook into actor updates to detect ability score increases (specifically WIS)
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

    // PHASE 10: Guard against re-entrant ability checks from maneuver grants
    if (options?.meta?.guardKey === 'starship-maneuver-grant') {return;}

    // Check if abilities were updated and we have old values
    if (!changes.system?.abilities || !options.oldAbilities) {return;}

    // Check if actor has Starship Tactics feat
    const hasStartshipTactics = actor.items.some(item =>
      item.type === 'feat' && (item.name === 'Starship Tactics' || item.name.includes('Starship Tactics'))
    );
    if (!hasStartshipTactics) {return;}

    const oldAbilities = options.oldAbilities;
    const newAbilities = actor.system.attributes;

    SWSELogger.log('SWSE | Starship Maneuvers | Checking for Wisdom modifier increase');

    await StarshipManeuverManager.handleAbilityIncrease(actor, oldAbilities, newAbilities);
  });

  /**
   * Hook into combat end to regain all Starship Maneuvers
   */
  Hooks.on('deleteCombat', async (combat, options, userId) => {
    SWSELogger.log('SWSE | Starship Maneuvers | Combat ended, regaining Starship Maneuvers for all combatants');

    // Regain Starship Maneuvers for all actors who were in combat
    for (const combatant of combat.combatants) {
      if (!combatant.actor) {continue;}

      const spentManeuvers = combatant.actor.items.filter(i =>
        i.type === 'maneuver' && i.system.spent
      );

      if (spentManeuvers.length > 0) {
        // PHASE 3.0: Route through ActorEngine for governance
        const updates = spentManeuvers.map(m => ({
          _id: m.id,
          'system.spent': false
        }));
        await ActorEngine.updateItems(combatant.actor, updates);
        SWSELogger.log(`SWSE | Starship Maneuvers | Regained ${spentManeuvers.length} maneuvers for ${combatant.actor.name}`);
      }
    }
  });
}
