/**
 * Ability Usage Tracking
 * Simple wrapper for marking abilities as used via ActivationLimitEngine
 */

import { ActivationLimitEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/ActivationLimitEngine.js";

export class AbilityUsage {
  /**
   * Mark an ability as used by an actor
   * @param {Actor} actor - The actor using the ability
   * @param {string} abilityId - The item ID of the ability
   */
  static async markUsed(actor, abilityId) {
    if (!actor || !abilityId) return;

    const ability = actor.items.get(abilityId);
    if (!ability) return;

    // Record the activation in the limit engine
    ActivationLimitEngine.recordActivation(actor, abilityId, ability.system?.limitType || 'round');
  }
}
