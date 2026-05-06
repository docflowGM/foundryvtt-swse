/**
 * Follower Emitter
 *
 * Listens to follower creation, level-up, death, and healing events and emits into Holonet.
 * Hooks into progression completion, follower creation flows, and actor updates.
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
  static #previousState = new Map(); // Track follower HP and status

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

    // Hook into actor updates for death and healing detection
    Hooks.on('updateActor', (actor, changes, options, userId) => {
      this.onUpdateActor(actor, changes, options, userId).catch(err => {
        console.error('[Holonet] Follower emitter (update) failed:', err);
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
   * Detect HP and status changes to emit death and healing notifications
   */
  static async onUpdateActor(actor, changes, options, userId) {
    // Only process followers with explicit markers (aggressive filtering)
    if (!this.isFollower(actor)) return;

    // Skip non-owned followers
    const ownerUser = game.users?.find(u => {
      const ownedActors = u.character?.system?.ownedActors ?? [];
      return ownedActors.some(o => o.id === actor.id);
    });
    if (!ownerUser) return;

    // Only care about HP and status changes
    const hpChanged = changes['system.hp']?.value !== undefined;
    const statusChanged = changes['system.deadState'] !== undefined ||
                          changes['system.conditions']?.dead !== undefined;
    if (!hpChanged && !statusChanged) return;

    const followerId = actor.id;
    const prevState = this.#previousState.get(followerId) || this.#buildFollowerState(actor);
    const currState = this.#buildFollowerState(actor);

    this.#previousState.set(followerId, currState);

    // Detect and emit changes
    await this.#detectAndEmitChanges(actor, ownerUser, prevState, currState);
  }

  /**
   * Build current follower state snapshot
   */
  static #buildFollowerState(actor) {
    const isDead = actor.system?.deadState || actor.system?.conditions?.dead || actor.system?.hp?.value <= 0;
    return {
      hp: actor.system?.hp?.value ?? 0,
      maxHp: actor.system?.hp?.max ?? 1,
      isDead
    };
  }

  /**
   * Detect death and healing transitions
   */
  static async #detectAndEmitChanges(actor, ownerUser, prevState, currState) {
    // Check death transition (alive → dead)
    if (!prevState.isDead && currState.isDead) {
      await this.#emitFollowerKilled(actor, ownerUser, prevState.hp, currState.hp);
    }

    // Check healing transition (HP increase while alive)
    if (!currState.isDead && currState.hp > prevState.hp && prevState.hp > 0) {
      const amountRecovered = currState.hp - prevState.hp;
      await this.#emitFollowerHealed(actor, ownerUser, prevState.hp, currState.hp, amountRecovered);
    }
  }

  /**
   * Emit when a follower is killed/defeated
   */
  static async #emitFollowerKilled(actor, ownerUser, previousHp, currentHp) {
    const dedupeKey = `follower-killed-${actor.id}`;

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.FOLLOWER,
      categoryId: HolonetPreferences.CATEGORIES.FOLLOWER,
      dedupeKey,
      dedupeWindowMs: 10000, // Prevent multiple death notifications in 10 seconds
      createRecord: () => {
        const record = FollowerSource.createFollowerKilledNotification({
          followerId: actor.id,
          followerName: actor.name,
          ownerActorId: ownerUser.character.id,
          ownerName: ownerUser.character.name,
          playerUserId: ownerUser.id,
          previousHp,
          newHp: currentHp,
          body: `${actor.name} has been defeated.`
        });
        record.audience = HolonetAudience.singlePlayer(ownerUser.id);
        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Follower killed emitted: ${actor.name}`);
    }
  }

  /**
   * Emit when a follower recovers from wounds
   */
  static async #emitFollowerHealed(actor, ownerUser, previousHp, currentHp, amountRecovered) {
    const dedupeKey = `follower-healed-${actor.id}-${currentHp}`;

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.FOLLOWER,
      categoryId: HolonetPreferences.CATEGORIES.FOLLOWER,
      dedupeKey,
      dedupeWindowMs: 5000, // Prevent multiple heal notifications in 5 seconds
      createRecord: () => {
        const record = FollowerSource.createFollowerHealedNotification({
          followerId: actor.id,
          followerName: actor.name,
          ownerActorId: ownerUser.character.id,
          ownerName: ownerUser.character.name,
          playerUserId: ownerUser.id,
          previousHp,
          newHp: currentHp,
          amountRecovered,
          body: `${actor.name} recovered ${amountRecovered} HP. Health: ${previousHp} → ${currentHp}`
        });
        record.audience = HolonetAudience.singlePlayer(ownerUser.id);
        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Follower healed emitted: ${actor.name} recovered ${amountRecovered} HP`);
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

  /**
   * Clear state on actor deletion
   */
  static onDeleteActor(actor, options, userId) {
    this.#previousState.delete(actor.id);
  }
}
