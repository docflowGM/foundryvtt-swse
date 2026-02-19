/**
 * MountEngine — Clean Actor ↔ Actor mount relationship layer
 *
 * Design goals:
 *   - v2 compliant
 *   - No flags (uses document data)
 *   - No sheet shadow state
 *   - Engine-level logic, not UI hacks
 *   - Fully reversible (dismount cleanly)
 *   - No vehicle contamination
 *
 * Mounts stay creatures. Vehicles stay vehicles.
 * No shared engine abstraction.
 *
 * Schema used:
 *   Rider: system.mounted = { isMounted: false, mountId: null }
 *   Mount: system.mount   = { riderIds: [] }
 */

import { SWSELogger } from '../../utils/logger.js';
import { ActorEngine } from '../../actors/engine/actor-engine.js';

export class MountEngine {

  /* -------------------------------------------------------------------------- */
  /*  MOUNTING                                                                  */
  /* -------------------------------------------------------------------------- */

  /**
   * Mount a rider on a creature mount.
   * Establishes bidirectional relationship.
   *
   * @param {Actor} rider - The character to mount
   * @param {Actor} mount - The creature being ridden
   * @returns {Promise<boolean>} Success
   */
  static async mountRider(rider, mount) {
    if (!rider || !mount) {
      SWSELogger.warn('MountEngine: Missing rider or mount');
      return false;
    }

    // Validate: mount must be a creature (not a vehicle)
    if (mount.type === 'vehicle') {
      SWSELogger.warn('MountEngine: Cannot mount a vehicle. Use crew positions instead.');
      ui.notifications?.warn('Vehicles use crew positions, not the mount system.');
      return false;
    }

    // Validate: rider cannot already be mounted
    if (rider.system.mounted?.isMounted) {
      SWSELogger.warn(`MountEngine: ${rider.name} is already mounted.`);
      ui.notifications?.warn(`${rider.name} is already mounted. Dismount first.`);
      return false;
    }

    // Validate: cannot mount yourself
    if (rider.id === mount.id) {
      return false;
    }

    // Update rider
    await ActorEngine.updateActor(rider, {
      'system.mounted.isMounted': true,
      'system.mounted.mountId': mount.id
    });

    // Update mount
    const riders = [...(mount.system.mount?.riderIds ?? [])];
    if (!riders.includes(rider.id)) {
      riders.push(rider.id);
    }

    await ActorEngine.updateActor(mount, {
      'system.mount.riderIds': riders
    });

    // Post chat notification
    await ChatMessage.create({
      content: `<div class="swse-mount-msg">
        <strong>${rider.name}</strong> mounts <strong>${mount.name}</strong>.
      </div>`,
      speaker: ChatMessage.getSpeaker({ actor: rider })
    });

    SWSELogger.info(`MountEngine: ${rider.name} mounted ${mount.name}`);
    return true;
  }

  /* -------------------------------------------------------------------------- */
  /*  DISMOUNTING                                                               */
  /* -------------------------------------------------------------------------- */

  /**
   * Dismount a rider from their mount.
   *
   * @param {Actor} rider - The mounted character
   * @param {Actor} [mount] - The mount (auto-resolved if not provided)
   * @returns {Promise<boolean>} Success
   */
  static async dismountRider(rider, mount = null) {
    if (!rider) return false;

    if (!rider.system.mounted?.isMounted) {
      return false;
    }

    // Auto-resolve mount if not provided
    if (!mount) {
      const mountId = rider.system.mounted.mountId;
      mount = mountId ? game.actors?.get(mountId) : null;
    }

    // Update rider
    await ActorEngine.updateActor(rider, {
      'system.mounted.isMounted': false,
      'system.mounted.mountId': null
    });

    // Update mount (remove rider from list)
    if (mount) {
      const riders = (mount.system.mount?.riderIds ?? [])
        .filter(id => id !== rider.id);

      await ActorEngine.updateActor(mount, {
        'system.mount.riderIds': riders
      });
    }

    // Post chat notification
    await ChatMessage.create({
      content: `<div class="swse-mount-msg">
        <strong>${rider.name}</strong> dismounts${mount ? ` from <strong>${mount.name}</strong>` : ''}.
      </div>`,
      speaker: ChatMessage.getSpeaker({ actor: rider })
    });

    SWSELogger.info(`MountEngine: ${rider.name} dismounted`);
    return true;
  }

  /* -------------------------------------------------------------------------- */
  /*  MOVEMENT OVERRIDE                                                         */
  /* -------------------------------------------------------------------------- */

  /**
   * Get effective movement for an actor, considering mount.
   * Does NOT mutate the actor's stored movement.
   *
   * @param {Actor} actor
   * @returns {number|null} Mount's speed, or null if not mounted
   */
  static getMountedSpeed(actor) {
    if (!actor?.system?.mounted?.isMounted) return null;

    const mountId = actor.system.mounted.mountId;
    if (!mountId) return null;

    const mount = game.actors?.get(mountId);
    if (!mount) return null;

    return mount.system.speed ?? mount.system.effectiveSpeed ?? 6;
  }

  /* -------------------------------------------------------------------------- */
  /*  INITIATIVE HANDLING                                                       */
  /* -------------------------------------------------------------------------- */

  /**
   * Get initiative modifier for a mounted actor.
   * When mounted, use mount's initiative result.
   *
   * @param {Actor} actor
   * @returns {{ useMountInit: boolean, mountInitiative: number|null }}
   */
  static getMountedInitiative(actor) {
    if (!actor?.system?.mounted?.isMounted) {
      return { useMountInit: false, mountInitiative: null };
    }

    const mountId = actor.system.mounted.mountId;
    if (!mountId) return { useMountInit: false, mountInitiative: null };

    const mount = game.actors?.get(mountId);
    if (!mount) return { useMountInit: false, mountInitiative: null };

    const initTotal = mount.system.skills?.initiative?.total ?? 0;
    return { useMountInit: true, mountInitiative: initTotal };
  }

  /* -------------------------------------------------------------------------- */
  /*  QUERY HELPERS                                                             */
  /* -------------------------------------------------------------------------- */

  /**
   * Check if an actor is currently mounted.
   *
   * @param {Actor} actor
   * @returns {boolean}
   */
  static isMounted(actor) {
    return actor?.system?.mounted?.isMounted === true;
  }

  /**
   * Get the mount of a rider.
   *
   * @param {Actor} rider
   * @returns {Actor|null}
   */
  static getMount(rider) {
    if (!rider?.system?.mounted?.isMounted) return null;
    const mountId = rider.system.mounted.mountId;
    return mountId ? (game.actors?.get(mountId) ?? null) : null;
  }

  /**
   * Get all riders on a mount.
   *
   * @param {Actor} mount
   * @returns {Actor[]}
   */
  static getRiders(mount) {
    const riderIds = mount?.system?.mount?.riderIds ?? [];
    return riderIds
      .map(id => game.actors?.get(id))
      .filter(Boolean);
  }

  /**
   * Check if an actor is a mount with riders.
   *
   * @param {Actor} actor
   * @returns {boolean}
   */
  static hasRiders(actor) {
    return (actor?.system?.mount?.riderIds?.length ?? 0) > 0;
  }

  /* -------------------------------------------------------------------------- */
  /*  EDGE CASE HANDLERS                                                        */
  /* -------------------------------------------------------------------------- */

  /**
   * Auto-dismount all riders when a mount dies/is reduced to 0 HP.
   * Should be called from the damage system when a creature drops.
   *
   * @param {Actor} mount
   * @returns {Promise<void>}
   */
  static async onMountDeath(mount) {
    if (!mount || !this.hasRiders(mount)) return;

    const riders = this.getRiders(mount);
    for (const rider of riders) {
      await this.dismountRider(rider, mount);
    }

    await ChatMessage.create({
      content: `<div class="swse-mount-msg">
        <strong>${mount.name}</strong> falls! All riders are automatically dismounted.
      </div>`,
      speaker: ChatMessage.getSpeaker({ actor: mount })
    });
  }

  /**
   * Clean up stale mount references.
   * Useful when actors are deleted or data becomes inconsistent.
   *
   * @param {Actor} actor
   * @returns {Promise<void>}
   */
  static async cleanupStaleReferences(actor) {
    if (!actor) return;

    // If mounted, verify mount still exists
    if (actor.system.mounted?.isMounted) {
      const mountId = actor.system.mounted.mountId;
      const mount = mountId ? game.actors?.get(mountId) : null;

      if (!mount) {
        await actor.update({
          'system.mounted.isMounted': false,
          'system.mounted.mountId': null
        });
        SWSELogger.info(`MountEngine: Cleaned stale mount reference for ${actor.name}`);
      }
    }

    // If has riders, verify all riders still exist
    if (actor.system.mount?.riderIds?.length) {
      const validIds = actor.system.mount.riderIds.filter(id => game.actors?.has(id));

      if (validIds.length !== actor.system.mount.riderIds.length) {
        await actor.update({
          'system.mount.riderIds': validIds
        });
        SWSELogger.info(`MountEngine: Cleaned stale rider references for ${actor.name}`);
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /*  HOOK REGISTRATION                                                         */
  /* -------------------------------------------------------------------------- */

  /**
   * Register hooks for mount system integration.
   * Call during system initialization.
   */
  static registerHooks() {
    // When a combatant rolls initiative, check if they're mounted
    Hooks.on('preCreateCombatant', (combatant, data) => {
      const actor = combatant.actor;
      if (!actor?.system?.mounted?.isMounted) return;

      const mountId = actor.system.mounted.mountId;
      if (!mountId) return;

      // Find the mount's combatant in the same combat
      const combat = combatant.parent;
      if (!combat) return;

      const mountCombatant = combat.combatants.find(c => c.actorId === mountId);
      if (mountCombatant?.initiative != null) {
        data.initiative = mountCombatant.initiative;
      }
    });

    // When an actor is deleted, clean up mount references
    Hooks.on('deleteActor', async (actor) => {
      // If this was a mount, dismount all riders
      if (actor.system?.mount?.riderIds?.length) {
        for (const riderId of actor.system.mount.riderIds) {
          const rider = game.actors?.get(riderId);
          if (rider?.system?.mounted?.isMounted) {
            await rider.update({
              'system.mounted.isMounted': false,
              'system.mounted.mountId': null
            });
          }
        }
      }

      // If this was a rider, remove from mount's list
      if (actor.system?.mounted?.isMounted) {
        const mountId = actor.system.mounted.mountId;
        const mount = mountId ? game.actors?.get(mountId) : null;
        if (mount?.system?.mount?.riderIds?.length) {
          const riders = mount.system.mount.riderIds.filter(id => id !== actor.id);
          await mount.update({ 'system.mount.riderIds': riders });
        }
      }
    });
  }
}
