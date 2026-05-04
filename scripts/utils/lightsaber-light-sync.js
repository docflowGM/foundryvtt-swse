/**
 * LIGHTSABER TOKEN LIGHT SYNCHRONIZATION
 *
 * Keeps token light state in sync with lightsaber weapon state.
 * When weapon state changes → light updates accordingly.
 *
 * Principle: Weapon state drives visuals, not vice versa.
 *
 * States:
 * - Weapon active + equipped + emitLight flag → Light ON
 * - Weapon inactive OR unequipped OR flag false → Light OFF
 *
 * No direct light manipulation from crystal logic.
 * All changes routed through weapon state.
 */

import { BLADE_COLOR_MAP } from "/systems/foundryvtt-swse/scripts/data/blade-colors.js";
import { SWSELogger as swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { getSwseFlag } from "/systems/foundryvtt-swse/scripts/utils/flags/swse-flags.js";

export class LightsaberLightSync {
  /**
   * Synchronize all actor tokens with their active lightsaber light state
   *
   * Call this:
   * - After weapon state changes (deactivate, equip/unequip)
   * - After emitLight flag toggle
   * - After blade color changes
   *
   * @param {Actor} actor - The actor to sync
   * @param {Item} [weapon] - Optional: specific weapon that changed (optimization)
   */
  static async syncActorTokenLight(actor, weapon = null) {
    if (!actor) return;

    try {
      const tokens = actor.getActiveTokens?.() || [];
      if (!tokens.length) {
        swseLogger.debug(`[LightsaberLightSync] No active tokens for ${actor.name}`);
        return;
      }

      // Find the active, equipped lightsaber with emitLight enabled
      const activeSaber = this.#getActiveLightsaber(actor);

      // Update all tokens for this actor
      for (const token of tokens) {
        await this.#updateTokenLight(token, activeSaber);
      }
    } catch (err) {
      swseLogger.error("[LightsaberLightSync] Sync failed:", err);
    }
  }

  /**
   * Find the active, equipped lightsaber that should emit light
   *
   * Criteria:
   * - Type: weapon
   * - Subtype: lightsaber
   * - Active: true (or system.active if field name differs)
   * - Equipped: true
   * - Flag: emitLight = true
   *
   * Returns first match (only one should emit at a time)
   *
   * @private
   */
  static #getActiveLightsaber(actor) {
    const lightsabers = actor.items?.filter(
      item => {
        const system = item.system ?? {};
        return item.type === "lightsaber"
          || (item.type === "weapon" && (system.subtype === "lightsaber" || system.weaponCategory === "lightsaber" || system.isLightsaber === true))
          || item.flags?.["foundryvtt-swse"]?.isLightsaber === true
          || item.flags?.swse?.isLightsaber === true;
      }
    ) || [];

    for (const saber of lightsabers) {
      const isActive = saber.system?.activated === true || saber.system?.active === true;
      const isEquipped = saber.system?.equipped === true || saber.system?.equippable?.equipped === true;
      const emitsLight = getSwseFlag(saber, 'emitLight') === true;

      if (isActive && isEquipped && emitsLight) {
        return saber; // Found active, equipped, light-emitting saber
      }
    }

    return null; // No active lightsaber found
  }

  /**
   * Update a single token's light state
   *
   * If lightsaber is active:
   * - Extract blade color from flags
   * - Apply light effect with color
   *
   * If lightsaber is inactive/unequipped:
   * - Remove light effect entirely
   *
   * @private
   */
  static async #updateTokenLight(token, activeSaber) {
    if (!token?.document) return;

    if (!activeSaber) {
      // No active saber → turn off light
      await token.document.update({
        light: {
          dim: 0,
          bright: 0
        }
      });
      return;
    }

    // Active saber → apply light with blade color
    const bladeColor = getSwseFlag(activeSaber, 'bladeColor') || "blue";
    const hex = BLADE_COLOR_MAP[bladeColor] ?? "#00ffff";

    await token.document.update({
      light: {
        dim: 20,
        bright: 10,
        color: hex,
        alpha: 0.3,
        animation: {
          type: "pulse",
          speed: 3,
          intensity: 2
        }
      }
    });
  }

  /**
   * Optional: Cinematic flicker before light turns off
   *
   * Use this for dramatic moments (unstable crystal deactivation, etc.)
   * Flickers intensely for 600ms, then turns off
   *
   * @param {Actor} actor - Actor to flicker
   * @param {number} [duration=600] - Flicker duration in ms
   */
  static async flickerTokenLight(actor, duration = 600) {
    if (!actor) return;

    const tokens = actor.getActiveTokens?.() || [];
    if (!tokens.length) return;

    try {
      // Activate intense flicker
      for (const token of tokens) {
        await token.document.update({
          light: {
            dim: 20,
            bright: 10,
            animation: {
              type: "pulse",
              speed: 8,    // Fast pulse
              intensity: 5  // Intense
            }
          }
        });
      }

      // After duration, sync to normal state (which turns off if weapon inactive)
      await new Promise(resolve => setTimeout(resolve, duration));
      await this.syncActorTokenLight(actor);
    } catch (err) {
      swseLogger.error("[LightsaberLightSync] Flicker failed:", err);
    }
  }

  /**
   * Reset token light to default (no light)
   * Use if light state gets corrupted
   *
   * @param {Actor} actor - Actor whose tokens to reset
   */
  static async resetTokenLight(actor) {
    if (!actor) return;

    const tokens = actor.getActiveTokens?.() || [];
    if (!tokens.length) return;

    try {
      for (const token of tokens) {
        await token.document.update({
          light: {
            dim: 0,
            bright: 0
          }
        });
      }
      swseLogger.info(`[LightsaberLightSync] Reset light for ${actor.name}`);
    } catch (err) {
      swseLogger.error("[LightsaberLightSync] Reset failed:", err);
    }
  }

  /**
   * Register hooks to auto-sync light on relevant changes
   * Call this during system init
   */
  static registerAutoSyncHooks() {
    // Hook: Item updated (weapon state, equipped, flags, blade color)
    Hooks.on("preUpdateItem", (item, changes) => {
      if (!item.isEmbedded) return;

      const actor = item.actor;
      if (!actor) return;

      // Check if relevant fields changed
      const relevantFields = [
        "system.activated",
        "system.active",
        "system.equipped",
        "system.equippable.equipped",
        "flags.swse.emitLight",
        "flags.swse.bladeColor",
        "flags.foundryvtt-swse.emitLight",
        "flags.foundryvtt-swse.bladeColor"
      ];

      let needsSync = false;
      for (const field of relevantFields) {
        const nestedValue = this.#getNestedValue(changes, field);
        if (nestedValue !== undefined) {
          needsSync = true;
          break;
        }
      }

      const system = item.system ?? {};
      const isLightsaber = item.type === "lightsaber"
        || (item.type === "weapon" && (system.subtype === "lightsaber" || system.weaponCategory === "lightsaber" || system.isLightsaber === true))
        || item.flags?.["foundryvtt-swse"]?.isLightsaber === true
        || item.flags?.swse?.isLightsaber === true;

      if (needsSync && isLightsaber) {
        // Schedule sync after update completes
        Hooks.once("updateItem", () => {
          this.syncActorTokenLight(actor, item);
        });
      }
    });

    swseLogger.info("[LightsaberLightSync] Auto-sync hooks registered");
  }

  /**
   * Get nested object value by dot notation path
   * @private
   */
  static #getNestedValue(obj, path) {
    const keys = path.split(".");
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }
}

export default LightsaberLightSync;

/**
 * Integration Points
 * ==================
 *
 * 1. In Phase 3 Unstable Crystal Logic:
 *
 *    await ActorEngine.updateEmbeddedDocuments(actor, "Item", [{
 *      _id: weapon.id,
 *      "system.active": false
 *    }]);
 *
 *    // Flicker effect optional
 *    await LightsaberLightSync.flickerTokenLight(actor, 600);
 *
 *    // Sync light to new state
 *    await LightsaberLightSync.syncActorTokenLight(actor, weapon);
 *
 *
 * 2. In Item Sheet Emit Light Toggle:
 *
 *    await item.update({
 *      "flags.swse.emitLight": enabled
 *    });
 *
 *    await LightsaberLightSync.syncActorTokenLight(actor, item);
 *
 *
 * 3. During System Init:
 *
 *    LightsaberLightSync.registerAutoSyncHooks();
 *
 *    // Or manually sync when needed:
 *    await LightsaberLightSync.syncActorTokenLight(actor);
 *
 *
 * 4. Debug/Recovery:
 *
 *    // Reset light if corrupted
 *    await LightsaberLightSync.resetTokenLight(actor);
 *
 *
 * Architectural Guarantee
 * ======================
 *
 * Weapon state → Light sync → Visual output
 *
 * No direct light manipulation from crystal logic.
 * No ghost lights or desync.
 * All changes routed through weapon state.
 * Safe, reversible, fully testable.
 */
