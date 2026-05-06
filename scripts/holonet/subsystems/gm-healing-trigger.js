/**
 * GM Healing Trigger
 *
 * Provides a centralized interface for GMs to trigger natural healing across eligible actors.
 * Integrates with Holonet to emit healing notifications.
 *
 * Does NOT modify healing mechanics; only triggers the existing recovery process.
 */

import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { HealingEmitter } from '../emitters/healing-emitter.js';

export class GMHealingTrigger {
  /**
   * Trigger natural healing for all eligible actors.
   * Only GMs can call this.
   *
   * @param {Object} options
   * @param {boolean} [options.isFullRest=true] Whether to trigger full rest
   * @param {boolean} [options.skipHolonetNotification=false] Skip Holonet healing notifications
   * @returns {Promise<{success: boolean, healed: Array, skipped: Array, error?: string}>}
   */
  static async triggerNaturalHealing(options = {}) {
    if (!game.user?.isGM) {
      return { success: false, error: 'Only GMs can trigger natural healing' };
    }

    const { isFullRest = true, skipHolonetNotification = false } = options;

    const healed = [];
    const skipped = [];

    // Iterate through all actors
    for (const actor of game.actors || []) {
      if (!this.isEligibleForHealing(actor)) {
        skipped.push({ id: actor.id, name: actor.name, reason: 'not_eligible' });
        continue;
      }

      try {
        const healingResult = await this.healActor(actor);
        if (healingResult.success) {
          healed.push({
            id: actor.id,
            name: actor.name,
            hpRecovered: healingResult.hpRecovered,
            vitalityRecovered: healingResult.vitalityRecovered
          });
        } else {
          skipped.push({ id: actor.id, name: actor.name, reason: 'healing_failed' });
        }
      } catch (err) {
        console.error(`[GMHealingTrigger] Failed to heal ${actor.name}:`, err);
        skipped.push({ id: actor.id, name: actor.name, reason: 'error', error: err.message });
      }
    }

    // Fire rest completion hook for Holonet to pick up
    if (!skipHolonetNotification && healed.length > 0) {
      Hooks.callAll('restCompleted', {
        isFullRest,
        duration: isFullRest ? 480 : 60,
        triggeredByGM: true,
        triggerTime: Date.now()
      });
    }

    return {
      success: true,
      healed,
      skipped,
      totalHealed: healed.length,
      totalSkipped: skipped.length
    };
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

    // Must be alive
    const currentHp = actor.system?.hp?.value ?? 0;
    if (currentHp <= 0) return false;

    return true;
  }

  /**
   * Heal a single actor using recovery mechanics
   *
   * @param {Actor} actor
   * @returns {Promise<{success: boolean, hpRecovered?: number, vitalityRecovered?: number, error?: string}>}
   */
  static async healActor(actor) {
    if (!actor) {
      return { success: false, error: 'Invalid actor' };
    }

    try {
      // Import recovery mechanics
      const { RecoveryMechanics } = await import('/systems/foundryvtt-swse/scripts/houserules/houserule-recovery.js');

      // Perform recovery
      const result = await RecoveryMechanics.performRecovery(actor);

      return {
        success: result.success,
        hpRecovered: result.hpRecovered ?? 0,
        vitalityRecovered: result.vitalityRecovered ?? 0,
        error: result.error ?? result.message
      };
    } catch (err) {
      console.error(`[GMHealingTrigger] Error healing actor ${actor.name}:`, err);
      return {
        success: false,
        error: err.message
      };
    }
  }

  /**
   * Get a summary of what will happen if healing is triggered
   *
   * @returns {Promise<{eligible: number, ineligible: number, reasons: Object}>}
   */
  static async getHealingSummary() {
    const eligible = [];
    const ineligible = [];
    const reasons = { not_eligible: 0, alive: 0, character: 0 };

    for (const actor of game.actors || []) {
      if (this.isEligibleForHealing(actor)) {
        eligible.push({ id: actor.id, name: actor.name });
      } else {
        if (actor.type !== 'character') reasons.character++;
        else if ((actor.system?.hp?.value ?? 0) <= 0) reasons.alive++;
        else if (actor.system?.isDroid || actor.system?.isVehicle) reasons.not_eligible++;

        ineligible.push({ id: actor.id, name: actor.name });
      }
    }

    return {
      eligible: eligible.length,
      ineligible: ineligible.length,
      eligibleActors: eligible,
      ineligibleActors: ineligible,
      reasons
    };
  }
}
