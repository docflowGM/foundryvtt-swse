/**
 * Progression Emitter
 *
 * Listens to real progression state changes and emits into Holonet.
 * Hooks into existing ActorEngine.applyProgression flow.
 *
 * Preference checks and publish are delegated to HolonetEmissionService.
 * Progression events do not dedupe by default (each level-up is distinct).
 */

import { HolonetEmissionService } from '../subsystems/holonet-emission-service.js';
import { HolonetPreferences } from '../holonet-preferences.js';
import { ProgressionSource } from '../sources/progression-source.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';
import { SOURCE_FAMILY } from '../contracts/enums.js';

export class ProgressionEmitter {
  static #initialized = false;

  static async initialize() {
    if (this.#initialized) return;
    this.#initialized = true;

    Hooks.on('swseProgressionLevelUp', (data) => {
      this.onProgressionLevelUp(data).catch(err => {
        console.error('[Holonet] Progression emitter failed:', err);
      });
    });

    console.log('[Holonet] Progression emitter initialized');
  }

  static async onProgressionLevelUp(data) {
    const { actor, fromLevel, toLevel, xpGained } = data;
    if (!actor || typeof toLevel !== 'number') return;

    const ownerUser = game.users?.find(u => u.character?.id === actor.id);
    if (!ownerUser) {
      console.warn('[Holonet] Progression emitter: actor has no owner user', actor.id);
      return;
    }

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.PROGRESSION,
      categoryId: HolonetPreferences.CATEGORIES.PROGRESSION,
      // No dedupeKey: each level-up is a unique event (actor + level uniquely identifies it
      // but we want it emitted even if retried, so skip deduplication here)
      skipDedupe: true,
      createRecord: () => {
        const record = ProgressionSource.createLevelCompletedEvent({
          actorId: actor.id,
          actorName: actor.name,
          playerUserId: ownerUser.id,
          newLevel: toLevel,
          previousLevel: fromLevel,
          body: `Congratulations! ${actor.name} has reached level ${toLevel}.`
        });
        record.audience = HolonetAudience.singlePlayer(ownerUser.id);
        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Progression emitted: ${actor.name} level ${toLevel}`);
    } else if (!result.skipped) {
      console.error('[Holonet] Failed to emit progression event:', result.reason);
    }
  }
}
