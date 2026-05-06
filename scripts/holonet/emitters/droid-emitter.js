/**
 * Droid Emitter
 *
 * Listens to droid damage and repair events and emits into Holonet.
 * Hooks into actor update to detect droid HP changes.
 *
 * Preference checks and publish are delegated to HolonetEmissionService.
 */

import { HolonetEmissionService } from '../subsystems/holonet-emission-service.js';
import { HolonetPreferences } from '../holonet-preferences.js';
import { DroidSource } from '../sources/droid-source.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';
import { SOURCE_FAMILY } from '../contracts/enums.js';

export class DroidEmitter {
  static #initialized = false;
  static #previousHpState = new Map(); // Track previous HP for delta detection

  static async initialize() {
    if (this.#initialized) return;
    this.#initialized = true;

    Hooks.on('updateActor', (actor, changes, options, userId) => {
      this.onUpdateActor(actor, changes, options, userId).catch(err => {
        console.error('[Holonet] Droid emitter failed:', err);
      });
    });

    console.log('[Holonet] Droid emitter initialized');
  }

  static async onUpdateActor(actor, changes, options, userId) {
    // Only process droids
    if (!actor.system?.isDroid) return;

    // Skip if owned by NPC (only notify players of their own droids)
    const ownerUser = game.users?.find(u => u.character?.id === actor.system?.ownedBy);
    if (!ownerUser) return;

    // Skip if no HP data changed
    if (!changes['system.hp']?.value && !changes['system.hp']?.max) return;

    const previousHp = this.#previousHpState.get(actor.id) ?? actor.system?.hp?.value ?? 0;
    const currentHp = actor.system?.hp?.value ?? 0;
    const maxHp = actor.system?.hp?.max ?? 100;

    // Update state
    this.#previousHpState.set(actor.id, currentHp);

    // Determine notification type
    let notificationType = null;
    let body = null;

    if (currentHp > previousHp) {
      // Repaired
      notificationType = 'repair';
      const healAmount = currentHp - previousHp;
      body = `${actor.name} was repaired. HP: ${previousHp} → ${currentHp} (+${healAmount})`;
    } else if (currentHp < previousHp) {
      // Damaged
      notificationType = 'damage';
      const damageAmount = previousHp - currentHp;
      body = `${actor.name} sustained damage. HP: ${previousHp} → ${currentHp} (-${damageAmount})`;

      // Check if droid is now disabled (HP at 0 or below)
      if (currentHp <= 0) {
        notificationType = 'disabled';
        body = `${actor.name} has been disabled.`;
      }
    } else {
      return; // No change
    }

    const dedupeKey = `droid-${actor.id}-hp-${currentHp}`;

    const result = await HolonetEmissionService.emit({
      sourceFamily: SOURCE_FAMILY.DROID,
      categoryId: HolonetPreferences.CATEGORIES.DROID,
      dedupeKey,
      dedupeWindowMs: 5000, // 5s window to avoid spam from rapid updates
      createRecord: () => {
        let record;

        if (notificationType === 'repair') {
          record = DroidSource.createDroidRepairNotification({
            droidId: actor.id,
            droidName: actor.name,
            actorId: actor.system?.ownedBy,
            playerUserId: ownerUser.id,
            previousHp,
            newHp: currentHp,
            body
          });
        } else if (notificationType === 'disabled') {
          record = DroidSource.createDroidDisabledNotification({
            droidId: actor.id,
            droidName: actor.name,
            actorId: actor.system?.ownedBy,
            playerUserId: ownerUser.id,
            body
          });
        } else {
          record = DroidSource.createDroidDamageNotification({
            droidId: actor.id,
            droidName: actor.name,
            actorId: actor.system?.ownedBy,
            playerUserId: ownerUser.id,
            previousHp,
            newHp: currentHp,
            body
          });
        }

        record.audience = HolonetAudience.singlePlayer(ownerUser.id);
        return record;
      }
    });

    if (result.ok) {
      console.log(`[Holonet] Droid ${notificationType} emitted: ${actor.name}`);
    } else if (!result.skipped) {
      console.error('[Holonet] Failed to emit droid event:', result.reason);
    }
  }

  /**
   * Clear HP state on actor deletion
   */
  static onDeleteActor(actor, options, userId) {
    this.#previousHpState.delete(actor.id);
  }
}
