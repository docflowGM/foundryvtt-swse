/**
 * ENERGY SHIELD VISUAL SERVICE
 *
 * Renders visual energy shield auras around tokens when shields are active.
 * Pure cosmetic layer - weapon state drives visuals, never vice versa.
 *
 * Features:
 * - Translucent spherical field around token
 * - Subtle animated shimmer
 * - Flicker animation on deactivation
 * - Color-based on shield type
 * - HP-based opacity feedback
 *
 * Integration:
 * - Watches actor.items for active shields (isShield = true)
 * - Renders only when shield.system.active === true
 * - Removes on deactivation or destruction
 * - Optional: Adjust opacity based on remaining HP
 *
 * Architecture:
 * - State-driven (weapon state determines visuals)
 * - Non-invasive (no combat logic changes)
 * - Multiplicative (stacks with other visuals)
 */

import { SWSELogger as swseLogger } from "../utils/logger.js";

export class EnergyShieldVisualService {
  // Track active shields by token ID
  static #activeShields = new Map();

  /**
   * Apply shield visual effect to a token
   *
   * @param {Token} token - The token to apply shield to
   * @param {string} colorHex - Hex color code (e.g., "#00aaff")
   * @param {number} [shieldHP=100] - Current shield HP for opacity calculation
   * @param {number} [maxHP=100] - Maximum shield HP
   * @returns {PIXI.Graphics} The shield graphic for tracking
   */
  static applyShield(token, colorHex, shieldHP = 100, maxHP = 100) {
    if (!token || !colorHex) return null;

    // Remove existing shield first to avoid duplicates
    this.removeShield(token);

    try {
      // Create shield graphics
      const shield = new PIXI.Graphics();
      shield.name = "swse-shield-aura";
      shield.lineStyle(3, parseInt(colorHex.slice(1), 16), 0.8);
      shield.drawCircle(0, 0, token.w * 0.6);

      // Base alpha determined by HP percentage
      const hpPercent = Math.max(0.2, shieldHP / maxHP);
      shield.alpha = 0.2 + hpPercent * 0.3; // Range: 0.2 to 0.5

      // Position at token center
      shield.position.set(token.center.x, token.center.y);

      // Store reference for tracking
      shield._tokenId = token.id;
      shield._colorHex = colorHex;
      shield._maxHP = maxHP;

      canvas.stage.addChild(shield);

      // Start shimmer animation
      this.#animateShield(shield, hpPercent);

      // Track shield
      this.#activeShields.set(token.id, shield);

      swseLogger.debug(`[EnergyShield] Shield applied to ${token.name}`);
      return shield;
    } catch (err) {
      swseLogger.error("[EnergyShield] Failed to apply shield:", err);
      return null;
    }
  }

  /**
   * Update existing shield (e.g., when HP changes)
   * Adjusts opacity based on remaining HP
   *
   * @param {Token} token - The token with shield
   * @param {number} currentHP - Current shield HP
   * @param {number} maxHP - Maximum shield HP
   */
  static updateShield(token, currentHP, maxHP) {
    if (!token) return;

    const shield = this.#activeShields.get(token.id);
    if (!shield) return;

    try {
      const hpPercent = Math.max(0.2, currentHP / maxHP);
      shield.alpha = 0.2 + hpPercent * 0.3;

      swseLogger.debug(`[EnergyShield] Updated ${token.name} shield to ${currentHP}/${maxHP}`);
    } catch (err) {
      swseLogger.error("[EnergyShield] Failed to update shield:", err);
    }
  }

  /**
   * Remove shield visual from token
   *
   * @param {Token} token - The token to remove shield from
   */
  static removeShield(token) {
    if (!token) return;

    const shield = this.#activeShields.get(token.id);
    if (!shield) return;

    try {
      canvas.stage.removeChild(shield);
      shield.destroy();
      this.#activeShields.delete(token.id);

      swseLogger.debug(`[EnergyShield] Shield removed from ${token.name}`);
    } catch (err) {
      swseLogger.error("[EnergyShield] Failed to remove shield:", err);
    }
  }

  /**
   * Collapse shield with flicker effect
   * Called when shield is destroyed or deactivated
   *
   * @param {Token} token - The token with shield
   */
  static async collapseShield(token) {
    if (!token) return;

    const shield = this.#activeShields.get(token.id);
    if (!shield) return;

    try {
      // Flicker animation
      let flickerCount = 0;
      const maxFlickers = 10;

      return new Promise((resolve) => {
        const flicker = () => {
          shield.visible = !shield.visible;
          flickerCount++;

          if (flickerCount >= maxFlickers) {
            // Remove shield after flicker complete
            canvas.stage.removeChild(shield);
            shield.destroy();
            this.#activeShields.delete(token.id);

            swseLogger.debug(`[EnergyShield] Shield collapsed on ${token.name}`);
            resolve();
          } else {
            // Flicker interval: 50ms
            setTimeout(flicker, 50);
          }
        };

        // Start flicker
        flicker();
      });
    } catch (err) {
      swseLogger.error("[EnergyShield] Failed to collapse shield:", err);
    }
  }

  /**
   * Subtle shimmer animation for active shield
   * Creates oscillating alpha effect
   * @private
   */
  static #animateShield(shield, baseIntensity = 1) {
    if (!shield) return;

    let growing = true;
    let baseAlpha = shield.alpha;

    const shimmer = () => {
      // Only animate if shield still exists
      if (!shield.parent) return;

      // Oscillate alpha between 80% and 100% of base
      const variation = 0.2 * baseIntensity;
      if (growing) {
        shield.alpha += 0.015;
        if (shield.alpha >= baseAlpha + variation) {
          growing = false;
        }
      } else {
        shield.alpha -= 0.015;
        if (shield.alpha <= baseAlpha - variation) {
          growing = true;
        }
      }

      requestAnimationFrame(shimmer);
    };

    requestAnimationFrame(shimmer);
  }

  /**
   * Register hooks to auto-manage shields
   * Call this during system init
   */
  static registerAutoShieldHooks() {
    // Hook: Item updated (shield activated/deactivated/destroyed)
    Hooks.on("updateItem", async (item, changes) => {
      if (!item.isEmbedded) return;

      const actor = item.actor;
      if (!actor) return;

      // Check if this is a shield item
      if (item.type !== "equipment" || !item.system?.isShield) return;

      // Get actor's tokens
      const tokens = actor.getActiveTokens?.() || [];
      if (!tokens.length) return;

      // Check shield state change
      const wasActive = item.system.active === true;
      const isNowActive = changes.system?.active === true;
      const isDestroyed = changes.system?.hp === 0 || changes.system?.remaining === 0;

      for (const token of tokens) {
        if (isNowActive && !isDestroyed) {
          // Shield activated
          const colorHex = item.system?.shieldColor || "#00aaff";
          const shieldHP = item.system?.hp ?? item.system?.remaining ?? 100;
          const maxHP = item.system?.maxHP ?? 100;

          this.applyShield(token, colorHex, shieldHP, maxHP);
        } else if (!isNowActive && wasActive) {
          // Shield deactivated
          this.collapseShield(token);
        } else if (isDestroyed) {
          // Shield destroyed
          this.collapseShield(token);
        }
      }
    });

    // Hook: Item deleted (shield removed from inventory)
    Hooks.on("deleteItem", (item) => {
      if (!item.isEmbedded) return;
      if (item.type !== "equipment" || !item.system?.isShield) return;

      const actor = item.actor;
      if (!actor) return;

      const tokens = actor.getActiveTokens?.() || [];
      for (const token of tokens) {
        this.collapseShield(token);
      }
    });

    swseLogger.info("[EnergyShield] Auto-shield hooks registered");
  }

  /**
   * Sync all actor shields on scene load
   * Ensures shields are displayed if they should be
   *
   * @param {Actor} actor - The actor to sync
   */
  static syncActorShields(actor) {
    if (!actor) return;

    const tokens = actor.getActiveTokens?.() || [];
    if (!tokens.length) return;

    try {
      // Find all active shields
      const shields = actor.items?.filter(
        (i) => i.type === "equipment" && i.system?.isShield && i.system?.active === true
      ) ?? [];

      for (const token of tokens) {
        if (shields.length === 0) {
          // No active shields, remove any visual
          this.removeShield(token);
        } else {
          // Apply first active shield (only one per token)
          const shield = shields[0];
          const colorHex = shield.system?.shieldColor || "#00aaff";
          const shieldHP = shield.system?.hp ?? shield.system?.remaining ?? 100;
          const maxHP = shield.system?.maxHP ?? 100;

          this.applyShield(token, colorHex, shieldHP, maxHP);
        }
      }
    } catch (err) {
      swseLogger.error("[EnergyShield] Failed to sync shields:", err);
    }
  }

  /**
   * Remove all active shields (scene cleanup)
   */
  static clearAllShields() {
    for (const [tokenId, shield] of this.#activeShields.entries()) {
      try {
        canvas.stage.removeChild(shield);
        shield.destroy();
      } catch (err) {
        swseLogger.warn(`[EnergyShield] Failed to clear shield for token ${tokenId}:`, err);
      }
    }

    this.#activeShields.clear();
    swseLogger.debug("[EnergyShield] All shields cleared");
  }
}

export default EnergyShieldVisualService;

/**
 * Shield Item Schema Reference
 * ============================
 *
 * Each shield item needs:
 *
 * {
 *   "type": "equipment",
 *   "system": {
 *     "isShield": true,
 *     "shieldColor": "blue",  // or "red", "green", "purple"
 *     "active": false,
 *     "hp": 100,              // Current shield HP
 *     "maxHP": 100            // Max shield HP
 *   }
 * }
 *
 * Color Options:
 * - blue: "#00aaff"
 * - red: "#ff4444"
 * - green: "#44ff44"
 * - purple: "#aa44ff"
 * - cyan: "#00ffff"
 * - orange: "#ff8800"
 *
 * Integration Points:
 *
 * 1. On Item Activation:
 *    if (item.system.active) {
 *      EnergyShieldVisualService.applyShield(token, item.system.shieldColor);
 *    }
 *
 * 2. On Item Deactivation:
 *    EnergyShieldVisualService.collapseShield(token);
 *
 * 3. On HP Change:
 *    EnergyShieldVisualService.updateShield(token, currentHP, maxHP);
 *
 * 4. On Shield Destruction:
 *    EnergyShieldVisualService.collapseShield(token);
 *
 * 5. During System Init:
 *    EnergyShieldVisualService.registerAutoShieldHooks();
 *
 * 6. On Scene Load:
 *    for (const actor of game.actors) {
 *      EnergyShieldVisualService.syncActorShields(actor);
 *    }
 */
