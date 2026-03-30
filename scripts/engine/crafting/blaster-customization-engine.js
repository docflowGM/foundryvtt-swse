/**
 * BLASTER CUSTOMIZATION ENGINE
 *
 * Handles modification of existing blaster weapons
 * Pure business logic - zero UI coupling
 * Routes mutations through ActorEngine for proper authorization
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/engine/actor/actor-engine.js";

export class BlasterCustomizationEngine {
  /**
   * Apply blaster configuration changes
   *
   * @param {Actor} actor - The owner of the weapon
   * @param {Item} item - The blaster weapon to modify
   * @param {Object} config - { boltColor, fxType }
   * @returns {Object} { success: boolean, reason?: string }
   */
  static async apply(actor, item, config) {
    try {
      // Validate inputs
      if (!actor || !item) {
        return { success: false, reason: "actor_or_item_missing" };
      }

      if (!config.boltColor || !config.fxType) {
        return { success: false, reason: "invalid_config" };
      }

      // Prepare mutation
      const updates = {
        "flags.swse.boltColor": config.boltColor,
        "flags.swse.fxType": config.fxType,
        "flags.swse.modifiedAt": game.time.worldTime,
        "flags.swse.modifiedBy": actor.id
      };

      // Apply via engine (authorized mutation)
      await ActorEngine.applyMutationPlan(actor, {
        set: updates
      }, item);

      SWSELogger.log(`Blaster configuration applied: ${item.name}`);
      return { success: true };
    } catch (err) {
      SWSELogger.error("Blaster configuration failed:", err);
      return { success: false, reason: "engine_error" };
    }
  }
}
