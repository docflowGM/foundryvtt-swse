/**
 * Follower Emitter
 *
 * Listens to follower creation and level-up events and emits into Holonet.
 * Hooks into progression completion and follower creation flows.
 *
 * Preference checks and publish are delegated to HolonetEmissionService.
 */

import { HolonetEmissionService } from '../subsystems/holonet-emission-service.js';
import { HolonetPreferences } from '../holonet-preferences.js';
import { FollowerSource } from '../sources/follower-source.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';
import { SOURCE_FAMILY } from '../contracts/enums.js';

export class FollowerEmitter {
  static #initialized = false;

  static async initialize() {
    if (this.#initialized) return;
    this.#initialized = true;

    // Hook into progression completion for follower level-ups
    Hooks.on('swseProgressionLevelUp', (data) => {
      this.onFollowerLevelUp(data).catch(err => {
        console.error('[Holonet] Follower emitter (level-up) failed:', err);
      });
    });

    // Hook into follower creation
    Hooks.on('createActor', (actor, options, userId) => {
      this.onFollowerCreated(actor, options, userId).catch(err => {
        console.error('[Holonet] Follower emitter (created) failed:', err);
      });
    });

    console.log('[Holonet] Follower emitter initialized');
  }

  /**
   * Emit when a follower levels up
   *
   * @param {Object} data
   */
  static async onFollowerLevelUp(data) {
    const { actor, fromLevel, toLevel, xpGained } = data;
    if (!actor || typeof toLevel !== 'number') return;

    // Check if this is a follower
    if (!this.isFollower(actor)) return;

    // Find the owner player
    const ownerUser = game.users?.find(u => {
      const ownedActors = u.character?.system?.ownedActors ?? [];
      return ownedActors.some(o => o.id === actor.id);
    });

    if (!ownerUser) return;

    const dedupeKey = `follower-level-${actor.id}-${toLevel}`;

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.FOLLOWER,
      categoryId: HolonetPreferences.CATEGORIES.FOLLOWER,
      dedupeKey,
      skipDedupe: true, // Each level-up is unique
      createRecord: () => {
        const record = FollowerSource.createFollowerLeveledNotification({
          followerId: actor.id,
          followerName: actor.name,
          ownerActorId: ownerUser.character.id,
          ownerName: ownerUser.character.name,
          playerUserId: ownerUser.id,
          previousLevel: fromLevel,
          newLevel: toLevel,
          body: `${actor.name} has reached level ${toLevel}.`
        });
        record.audience = HolonetAudience.singlePlayer(ownerUser.id);
        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Follower level-up emitted: ${actor.name} → level ${toLevel}`);
    } else if (!result.skipped) {
      console.error('[Holonet] Failed to emit follower level-up:', result.reason);
    }
  }

  /**
   * Emit when a new follower is created
   *
   * @param {Actor} actor
   * @param {Object} options
   * @param {string} userId
   */
  static async onFollowerCreated(actor, options, userId) {
    // Check if this is a follower
    if (!this.isFollower(actor)) return;

    // Find the owner player
    const ownerUser = game.users?.find(u => {
      const ownedActors = u.character?.system?.ownedActors ?? [];
      return ownedActors.some(o => o.id === actor.id);
    });

    if (!ownerUser) return;

    const dedupeKey = `follower-created-${actor.id}`;

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.FOLLOWER,
      categoryId: HolonetPreferences.CATEGORIES.FOLLOWER,
      dedupeKey,
      skipDedupe: true, // Follower creation is unique
      createRecord: () => {
        const record = FollowerSource.createFollowerCreatedNotification({
          followerId: actor.id,
          followerName: actor.name,
          ownerActorId: ownerUser.character.id,
          ownerName: ownerUser.character.name,
          playerUserId: ownerUser.id,
          body: `${actor.name} has begun following you.`
        });
        record.audience = HolonetAudience.singlePlayer(ownerUser.id);
        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Follower created emitted: ${actor.name}`);
    } else if (!result.skipped) {
      console.error('[Holonet] Failed to emit follower created:', result.reason);
    }
  }

  /**
   * Check if an actor is a follower
   *
   * @param {Actor} actor
   * @returns {boolean}
   */
  static isFollower(actor) {
    // Followers are typically companions/henchmen, not player characters
    // Check for follower-specific metadata or type
    if (actor.type === 'character' && actor.system?.followerTemplate) return true;
    if (actor.type === 'npc' && actor.system?.isFollower) return true;
    if (actor.getFlag('foundryvtt-swse', 'isFollower')) return true;

    return false;
  }
}
