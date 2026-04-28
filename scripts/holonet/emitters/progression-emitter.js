/**
 * Progression Emitter
 *
 * Listens to real progression state changes and emits into Holonet.
 * Hooks into existing ActorEngine.applyProgression flow.
 */

import { HolonetEngine } from '../holonet-engine.js';
import { HolonetPreferences } from '../holonet-preferences.js';
import { ProgressionSource } from '../sources/progression-source.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';

export class ProgressionEmitter {
  static #initialized = false;

  /**
   * Initialize progression emitter
   * Registers hook for swseProgressionLevelUp
   */
  static async initialize() {
    if (this.#initialized) return;
    this.#initialized = true;

    // Hook into ActorEngine.applyProgression level-up event
    Hooks.on('swseProgressionLevelUp', (data) => {
      this.onProgressionLevelUp(data).catch(err => {
        console.error('[Holonet] Progression emitter failed:', err);
      });
    });

    console.log('[Holonet] Progression emitter initialized');
  }

  /**
   * Emit level-available event when player levels up
   */
  static async onProgressionLevelUp(data) {
    const { actor, fromLevel, toLevel, xpGained } = data;

    if (!actor || typeof toLevel !== 'number') {
      return;
    }

    // Check preferences
    if (!HolonetPreferences.shouldNotify(HolonetPreferences.CATEGORIES.PROGRESSION)) {
      return;
    }

    // Get the player who owns this actor
    const ownerUser = game.users?.find(u => u.character?.id === actor.id);
    if (!ownerUser) {
      console.warn('[Holonet] Progression emitter: actor has no owner user', actor.id);
      return;
    }

    try {
      // Create level-completed event
      const completedEvent = ProgressionSource.createLevelCompletedEvent({
        actorId: actor.id,
        actorName: actor.name,
        playerUserId: ownerUser.id,
        newLevel: toLevel,
        previousLevel: fromLevel,
        body: `Congratulations! ${actor.name} has reached level ${toLevel}.`
      });

      // Set audience to single player
      completedEvent.audience = HolonetAudience.singlePlayer(ownerUser.id);

      // Publish
      await HolonetEngine.publish(completedEvent);

      console.log(`[Holonet] Progression emitted: ${actor.name} level ${toLevel}`);
    } catch (err) {
      console.error('[Holonet] Failed to emit progression event:', err);
    }
  }
}
