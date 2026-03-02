/**
 * starship-domain-lifecycle.js
 * Handles starship-maneuvers domain lifecycle when Starship Tactics feat is added/removed
 *
 * PHASE 3.1: Domain unlock/lock and cleanup on feat changes.
 *
 * Responsibilities:
 * 1. On Starship Tactics feat ADD: unlock starship-maneuvers domain
 * 2. On Starship Tactics feat REMOVE: lock domain + cleanup excess maneuvers
 * 3. NO UI-level logic - pure infrastructure
 *
 * Integration: These handlers are called from ActorEngine feat add/remove hooks
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ManeuverAuthorityEngine } from "/systems/foundryvtt-swse/scripts/engine/progression/engine/maneuver-authority-engine.js";

export class StarshipDomainLifecycle {
  /**
   * Handle Starship Tactics feat addition
   * Unlocks the starship-maneuvers domain
   *
   * @param {Actor} actor - The actor gaining the feat
   * @returns {Promise<void>}
   */
  static async handleStarshipTacticsFeatAdded(actor) {
    if (!actor) {
      swseLogger.warn('[STARSHIP DOMAIN] handleStarshipTacticsFeatAdded called with no actor');
      return;
    }

    try {
      const unlockedDomains = actor.system?.progression?.unlockedDomains || [];

      // Only add if not already present
      if (!unlockedDomains.includes('starship-maneuvers')) {
        unlockedDomains.push('starship-maneuvers');

        await ActorEngine.updateActor(actor, {
          'system.progression.unlockedDomains': unlockedDomains
        });

        swseLogger.log('[STARSHIP DOMAIN] Added starship-maneuvers domain for feat addition', {
          actor: actor.name
        });
      }
    } catch (e) {
      swseLogger.error('[STARSHIP DOMAIN] Error handling feat addition', e);
    }
  }

  /**
   * Handle Starship Tactics feat removal
   * Locks the starship-maneuvers domain and cleans up excess maneuvers
   *
   * @param {Actor} actor - The actor losing the feat
   * @returns {Promise<void>}
   */
  static async handleStarshipTacticsFeatRemoved(actor) {
    if (!actor) {
      swseLogger.warn('[STARSHIP DOMAIN] handleStarshipTacticsFeatRemoved called with no actor');
      return;
    }

    try {
      const unlockedDomains = actor.system?.progression?.unlockedDomains || [];

      // Remove domain if present
      if (unlockedDomains.includes('starship-maneuvers')) {
        const filtered = unlockedDomains.filter(d => d !== 'starship-maneuvers');

        await ActorEngine.updateActor(actor, {
          'system.progression.unlockedDomains': filtered
        });

        swseLogger.log('[STARSHIP DOMAIN] Removed starship-maneuvers domain for feat removal', {
          actor: actor.name
        });
      }

      // CLEANUP: Check if capacity was reduced and remove excess maneuvers
      const currentCapacity = await ManeuverAuthorityEngine.getManeuverCapacity(actor);
      const currentSelections = actor.system?.starshipManeuverSuite?.maneuvers || [];

      if (currentSelections.length > currentCapacity) {
        const excessCount = currentSelections.length - currentCapacity;
        const truncated = currentSelections.slice(0, currentCapacity);

        await ActorEngine.updateActor(actor, {
          'system.starshipManeuverSuite.maneuvers': truncated
        });

        swseLogger.warn('[STARSHIP CLEANUP] Removed excess maneuvers after capacity reduction', {
          actor: actor.name,
          removed: excessCount,
          remaining: truncated.length,
          newCapacity: currentCapacity
        });
      }
    } catch (e) {
      swseLogger.error('[STARSHIP DOMAIN] Error handling feat removal', e);
    }
  }
}
