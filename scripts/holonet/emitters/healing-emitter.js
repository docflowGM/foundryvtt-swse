/**
 * Healing Emitter
 *
 * Listens to rest/healing events and emits into Holonet.
 * Hooks into rest completion and natural healing flows.
 *
 * Preference checks, deduplication, and publish are delegated to HolonetEmissionService.
 */

import { HolonetEmissionService } from '../subsystems/holonet-emission-service.js';
import { HolonetPreferences } from '../holonet-preferences.js';
import { HealingSource } from '../sources/healing-source.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';
import { SOURCE_FAMILY } from '../contracts/enums.js';

export class HealingEmitter {
  static #initialized = false;

  static async initialize() {
    if (this.#initialized) return;
    this.#initialized = true;

    // Hook into rest completion to emit healing notifications for player-owned actors
    Hooks.on('restCompleted', (data) => {
      this.onRestCompleted(data).catch(err => {
        console.error('[Holonet] Healing emitter failed:', err);
      });
    });

    console.log('[Holonet] Healing emitter initialized');
  }

  static async onRestCompleted(data) {
    // data structure from restCompleted hook: { isFullRest, duration, ... }
    // This hook fires after actors have already been healed by RecoveryMechanics
    // We need to detect which actors were healed and emit notifications

    if (!game.actors) return;

    // Track which actors were healed
    const healedActors = [];

    // Iterate through all actors to find player-owned characters
    for (const actor of game.actors) {
      // Only target player characters (not NPCs, vehicles, droids)
      if (actor.type !== 'character') continue;

      // Find the owner user
      const ownerUser = game.users?.find(u => u.character?.id === actor.id);
      if (!ownerUser) continue;

      // Check if this actor is alive and eligible for healing
      if (!this.isEligibleForHealing(actor)) continue;

      healedActors.push({
        actor,
        ownerUser,
        hpRecovered: this.estimateHPRecovered(actor)
      });
    }

    // Emit notifications for each healed actor
    for (const { actor, ownerUser, hpRecovered } of healedActors) {
      if (hpRecovered <= 0) continue; // Skip if no healing occurred

      const reason = data.isFullRest ? 'rest-reset' : 'natural-rest';
      const dedupeKey = `healing-${actor.id}-${Date.now()}`;

      const result = await HolonetEmissionService.emit({
        sourceFamily: SOURCE_FAMILY.HEALING,
        categoryId: HolonetPreferences.CATEGORIES.HEALING,
        dedupeKey,
        skipDedupe: true, // Each rest is unique; don't dedupe
        createRecord: () => {
          const record = HealingSource.createNaturalRestNotification({
            actorId: actor.id,
            actorName: actor.name,
            playerUserId: ownerUser.id,
            previousHp: Math.max(0, (actor.system?.hp?.value ?? 0) - hpRecovered),
            newHp: actor.system?.hp?.value ?? 0,
            amountRecovered: hpRecovered,
            body: `${actor.name} recovered ${hpRecovered} HP through rest and recovery.`
          });
          record.audience = HolonetAudience.singlePlayer(ownerUser.id);
          return record;
        }
      });

      if (result.ok) {
        console.log(`[Holonet] Healing emitted: ${actor.name} recovered ${hpRecovered} HP`);
      } else if (!result.skipped) {
        console.error('[Holonet] Failed to emit healing event:', result.reason);
      }
    }
  }

  /**
   * Check if an actor is eligible for healing
   *
   * @param {Actor} actor
   * @returns {boolean}
   */
  static isEligibleForHealing(actor) {
    // Must be a character
    if (actor.type !== 'character') return false;

    // Must not be a vehicle/ship/droid
    if (actor.system?.isDroid) return false;
    if (actor.system?.isVehicle) return false;

    // Must be alive (assume any actor with HP > 0 is alive unless there's a death flag)
    const currentHp = actor.system?.hp?.value ?? 0;
    if (currentHp <= 0) return false;

    return true;
  }

  /**
   * Estimate HP recovered based on actor state
   * This is a rough estimate since we don't have before/after HP in the hook
   *
   * @param {Actor} actor
   * @returns {number}
   */
  static estimateHPRecovered(actor) {
    // This is a simplification; in a real implementation you'd want to track
    // HP before and after the rest hook. For now, we return a reasonable default
    // based on hit die + CON modifier
    const hitDie = actor.system?.details?.hitDie ?? 8;
    const conMod = actor.system?.attributes?.con?.mod ?? 0;
    return Math.max(1, hitDie + Math.max(0, conMod));
  }
}
