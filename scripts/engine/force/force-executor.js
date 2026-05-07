/**
 * ForceExecutor — Complete execution flow for Force powers
 *
 * Handles:
 * - Force power activation (use/discard logic)
 * - Force power recovery
 * - Dark Side Point tracking
 * - Natural 20 mechanics
 * - Force Point expenditure
 * - Animation feedback
 * - Chat message generation
 *
 * Routes all mutations through ActorEngine and SWSEChat.
 */

import { ForceEngine } from "/systems/foundryvtt-swse/scripts/engine/force/force-engine.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { RollCore } from "/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js";
import { AnimationEngine } from "/systems/foundryvtt-swse/scripts/engine/animation-engine.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { ForcePowerEffectsEngine } from "/systems/foundryvtt-swse/scripts/engine/force/force-power-effects-engine.js";

export class ForceExecutor {
  /**
   * Activate/recover a force power
   * @param {Actor} actor - Actor activating power
   * @param {string} powerId - Force power item ID
   * @param {boolean} recover - Is this a recovery action?
   * @returns {Object} Activation result
   */
  static async activateForce(actor, powerId, recover = false) {
    try {
      const power = actor.items.get(powerId);
      if (!power || (power.type !== "force-power" && power.type !== "forcepower")) {
        throw new Error("Force power not found");
      }

      const isDiscarded = power.system?.discarded || false;

      // Validate state
      if (recover && !isDiscarded) {
        throw new Error("Force power is already active");
      }

      if (!recover && isDiscarded) {
        // Already discarded, can't use
        throw new Error("Force power is discarded");
      }

      // Update power state
      const plan = {
        update: {
          "items": {
            [powerId]: {
              "system.discarded": recover ? false : true,
              "system.lastUsed": Date.now()
            }
          }
        }
      };

      await ActorEngine.apply(actor, plan);

      // Check for dark side usage (optional mechanic)
      const hasDarkSide = power.system?.darkSideOption || false;
      if (hasDarkSide && !recover) {
        // Player used dark side - increase DSP
        await ForceEngine.gainDarkSidePoint(actor, `Used ${power.name} with dark side`);
      }

      // Generate chat message
      await this._generateForceActivationMessage(actor, power, recover);

      // Animate
      const element = document.querySelector(`[data-item-id="${powerId}"]`);
      if (element) {
        if (recover) {
          AnimationEngine.animateForceActivation(element);
        } else {
          AnimationEngine.animateForceDiscard(element);
        }
      }

      return {
        success: true,
        power: power.name,
        recovered: recover,
        darkSideUsed: hasDarkSide && !recover
      };
    } catch (err) {
      console.error("Force activation failed:", err);
      ui?.notifications?.error?.(`Force activation failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Execute Force power roll (check against DC)
   * @param {Actor} actor - Actor using power
   * @param {string} powerId - Force power ID
   * @param {Object} options - Roll options
   * @param {number} options.baseDC - Base DC for the power
   * @param {number} options.bonus - Additional roll bonus
   * @param {boolean} options.useForce - Spend Force Point?
   * @returns {Object} Roll result
   */
  static async executeForcePower(actor, powerId, options = {}) {
    try {
      const power = actor.items.get(powerId);
      if (!power) throw new Error("Force power not found");

      const { baseDC = 10, bonus = 0, useForce = false } = options;

      // Check if power is already discarded
      if (power.system?.discarded) {
        throw new Error(`${power.name} is already discarded`);
      }

      // Validate Force Point expenditure
      let spentForce = false;
      if (useForce) {
        const fpValue = SchemaAdapters.getForcePoints(actor);
        if (fpValue <= 0) {
          throw new Error("No Force Points available");
        }
        spentForce = true;
      }

      // Roll the force power check through the shared roll execution layer.
      const rollResult = await RollCore.execute({
        actor,
        domain: 'force-power.activation',
        baseBonus: bonus,
        rollOptions: { baseDice: '1d20' },
        rollData: actor.getRollData?.() ?? {},
        context: { powerId, powerName: power.name }
      });
      if (!rollResult.success || !rollResult.roll) {
        throw new Error(rollResult.error || 'Force power roll failed');
      }
      const roll = rollResult.roll;

      const total = rollResult.finalTotal;
      const isCritical = roll.dice[0].results[0].result === 20;
      const isFumble = roll.dice[0].results[0].result === 1;

      // Check if successful
      const success = total >= baseDC;

      // Handle natural 20 effects
      if (isCritical) {
        await ForceEngine.recordNatural20(actor, power.name);
      }

      // Handle dark side consequences (optional)
      if (!success && power.system?.darkSideBacklash) {
        await ForceEngine.gainDarkSidePoint(actor, `Failed use of ${power.name}`);
      }

      // Spend Force Point if applicable
      if (spentForce) {
        const currentFP = SchemaAdapters.getForcePoints(actor);
        const plan = {
          update: {
            "system.forcePoints.value": Math.max(0, currentFP - 1)
          }
        };
        await ActorEngine.apply(actor, plan);
      }

      // Mark power as used
      await this.activateForce(actor, powerId, false);

      // Apply force power effects if successful
      if (success) {
        await ForcePowerEffectsEngine.applyPowerEffect(actor, power, total);
      }

      // Generate chat message
      await this._generateForcePowerRollMessage(
        actor,
        power,
        roll,
        total,
        baseDC,
        success,
        isCritical
      );

      return {
        success,
        roll: total,
        dc: baseDC,
        isCritical,
        isFumble,
        powerName: power.name,
        forcePowerSpent: spentForce
      };
    } catch (err) {
      console.error("Force power execution failed:", err);
      ui?.notifications?.error?.(`Force power failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Mass recovery of discarded Force powers
   * Typically occurs during a rest or via meditation
   * @param {Actor} actor - Actor recovering powers
   * @param {Array<string>} powerIds - Array of power IDs to recover (or null for all)
   * @returns {Object} Recovery result
   */
  static async recoverForcePowers(actor, powerIds = null) {
    try {
      let powersToRecover = [];

      if (powerIds && powerIds.length > 0) {
        // Recover specific powers
        powersToRecover = powerIds.map(id => actor.items.get(id)).filter(p => p && p.system?.discarded);
      } else {
        // Recover all discarded force powers
        powersToRecover = actor.items.filter(item =>
          (item.type === "force-power" || item.type === "forcepower") && item.system?.discarded
        );
      }

      if (powersToRecover.length === 0) {
        throw new Error("No force powers to recover");
      }

      // Build mutation plan
      const updates = {};
      powersToRecover.forEach(power => {
        updates[power.id] = {
          "system.discarded": false,
          "system.lastRecovered": Date.now()
        };
      });

      const plan = {
        update: {
          "items": updates
        }
      };

      await ActorEngine.apply(actor, plan);

      // Remove any active effects from recovered powers
      for (const power of powersToRecover) {
        await ForcePowerEffectsEngine.removePowerEffects(actor, power);
      }

      // Generate chat message
      await SWSEChat.postHTML({
        actor,
        content: `<div class="swse-force-recovery">
          <h3>${actor.name} recovers Force powers</h3>
          <ul>
            ${powersToRecover.map(p => `<li>${p.name}</li>`).join("")}
          </ul>
        </div>`
      });

      return {
        success: true,
        recovered: powersToRecover.length,
        powers: powersToRecover.map(p => p.name)
      };
    } catch (err) {
      console.error("Force recovery failed:", err);
      ui?.notifications?.error?.(`Force recovery failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  /**
   * Generate Force power activation message
   * @private
   */
  static async _generateForceActivationMessage(actor, power, recovered) {
    try {
      const content = `
        <div class="swse-force-message">
          <h3>${actor.name} ${recovered ? "recovers" : "uses"} ${power.name}</h3>
          <div class="power-details">
            <strong>Type:</strong> ${power.system?.powerType || "Unknown"}<br>
            <strong>Range:</strong> ${power.system?.range || "Personal"}<br>
            <strong>Duration:</strong> ${power.system?.duration || "Instant"}
          </div>
          ${power.system?.description ? `<p>${power.system.description}</p>` : ""}
        </div>
      `;

      await SWSEChat.postHTML({
        actor,
        content
      });
    } catch (err) {
      console.error("Force message generation failed:", err);
    }
  }

  /**
   * Generate Force power roll message
   * @private
   */
  static async _generateForcePowerRollMessage(
    actor,
    power,
    roll,
    total,
    baseDC,
    success,
    isCritical
  ) {
    try {
      const successText = success ? "SUCCESS" : "FAILURE";
      const successClass = success ? "success" : "failure";

      const content = `
        <div class="swse-force-roll">
          <h3>${actor.name} uses ${power.name}</h3>
          <div class="roll-result ${successClass}">
            <strong>Check:</strong> ${total} vs DC ${baseDC}
            <div class="result-text">${successText}</div>
            ${isCritical ? '<div class="critical">CRITICAL SUCCESS!</div>' : ""}
          </div>
          <div class="roll-formula">${roll.formula}</div>
        </div>
      `;

      await SWSEChat.postHTML({
        actor,
        content
      });
    } catch (err) {
      console.error("Force roll message generation failed:", err);
    }
  }
}
