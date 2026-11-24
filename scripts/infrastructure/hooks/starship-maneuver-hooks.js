import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
/**
 * Starship Maneuver Hooks
 * Handles automatic maneuver grants when feats are added or abilities change
 * PHASE 10: Recursive guards prevent infinite item creation loops
 */

import { StarshipManeuverManager } from "/systems/foundryvtt-swse/scripts/utils/starship-maneuver-manager.js";
import { CAPABILITY_SLUGS } from "/systems/foundryvtt-swse/scripts/constants/capability-slugs.js";

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
    options.oldAbilities = foundry.utils.deepClone(actor.system.abilities);
  });

  Hooks.on('updateActor', async (actor, changes, options, userId) => {
    // Only process on the updating user's client
    if (game.user.id !== userId) {return;}

    // PHASE 10: Guard against re-entrant ability checks from maneuver grants
    if (options?.meta?.guardKey === 'starship-maneuver-grant') {return;}

    // PHASE 2: Skip if actor is currently in an in-flight mutation transaction
    // This prevents re-entrant writes during the original update
    if (ActorEngine.isActorMutationInFlight(actor.id)) {
      SWSELogger.debug(`[StarshipManeuverHooks] Deferring ability check for ${actor.name} — mutation in flight`);
      return;
    }

    // Check if abilities were updated and we have old values
    if (!changes.system?.abilities || !options.oldAbilities) {return;}

    // Check if actor has Starship Tactics feat
    const hasStartshipTactics = actor.items.some(item =>
      item.type === 'feat' && (
        item.system?.slug === CAPABILITY_SLUGS.STARSHIP_TACTICS ||
        item.name === 'Starship Tactics'  // Fallback for items without slug
      )
    );
    if (!hasStartshipTactics) {return;}

    const oldAbilities = options.oldAbilities;
    const newAbilities = actor.system.abilities;

    SWSELogger.log('SWSE | Starship Maneuvers | Checking for Wisdom modifier increase');

    await StarshipManeuverManager.handleAbilityIncrease(actor, oldAbilities, newAbilities);
  });

  // Maneuvers are regained by SuiteInstanceRecovery (GM-confirmed rest / natural 20 Pilot activation), not by the Combat document being deleted.
}
