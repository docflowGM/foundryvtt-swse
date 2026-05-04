/**
 * SWSE Roll Engine
 *
 * Compatibility facade for arbitrary formula rolls.
 *
 * V2 boundary:
 * - Roll execution delegates to RollCore.
 * - Chat output is opt-in and routes through SWSEChat.
 * - This facade must not contain rule math or actor mutation.
 */

import { RollCore } from "/systems/foundryvtt-swse/scripts/engine/roll/roll-core.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";

export class RollEngine {

  /**
   * Perform a dice roll safely through RollCore.
   * @param {string} formula - Dice formula (ex: "4d6dl", "1d20+5")
   * @param {object} data - Roll data context
   * @param {object} options - { flavor, chat, actor, speaker, domain, context }
   * @returns {Promise<Roll>}
   */
  static async safeRoll(formula, data = {}, options = {}) {
    if (!formula) {
      throw new Error("RollEngine.safeRoll: No formula provided");
    }

    try {
      const result = await RollCore.executeFormula({
        formula,
        rollData: data,
        actor: options.actor ?? null,
        domain: options.domain ?? 'formula',
        context: options.context ?? {}
      });

      if (!result?.success || !result.roll) {
        throw new Error(result?.error || `Failed to execute formula "${formula}"`);
      }

      const roll = result.roll;

      // Optional debug logging via Sentinel
      if (globalThis.SWSE?.Debugger) {
        globalThis.SWSE.Debugger.log("roll", {
          formula,
          total: roll.total,
          result: roll.result,
          domain: result.domain
        });
      }

      // V2-safe chat is opt-in. Callers that own visible UX should normally use
      // SWSEChat.postRoll directly after receiving the Roll.
      if (options.chat === true || options.toChat === true) {
        await SWSEChat.postRoll({
          roll,
          actor: options.actor ?? null,
          speaker: options.speaker ?? null,
          flavor: options.flavor || "Roll",
          flags: options.flags ?? {},
          context: {
            ...(options.context ?? {}),
            rollType: options.domain ?? 'formula',
            formula
          }
        });
      }

      return roll;

    } catch (err) {
      console.error("SWSE RollEngine error:", err);

      if (globalThis.SWSE?.Debugger) {
        globalThis.SWSE.Debugger.log("roll-error", {
          formula,
          error: err.message
        });
      }

      throw err;
    }
  }

  /** Ability score generation. */
  static async rollAbilityScore(options = {}) {
    const roll = await this.safeRoll("4d6dl", {}, {
      ...options,
      domain: 'ability-score-generation',
      flavor: options.flavor || "Ability Score Roll",
      chat: options.chat === true
    });
    return roll.total;
  }

  /** Generic d20 roll. */
  static async rollD20(modifier = 0, options = {}) {
    const formula = modifier ? `1d20 + ${modifier}` : "1d20";
    return this.safeRoll(formula, options.rollData ?? {}, {
      ...options,
      domain: options.domain ?? 'd20',
      flavor: options.flavor || "d20 Roll",
      chat: options.chat === true
    });
  }

  /** Damage formula roll. */
  static async rollDamage(formula, options = {}) {
    return this.safeRoll(formula, options.rollData ?? {}, {
      ...options,
      domain: options.domain ?? 'damage',
      flavor: options.flavor || "Damage Roll",
      chat: options.chat === true
    });
  }

  /** Check roll (skills, attacks, saves, etc). */
  static async rollCheck(modifier = 0, options = {}) {
    const formula = modifier ? `1d20 + ${modifier}` : "1d20";
    return this.safeRoll(formula, options.rollData ?? {}, {
      ...options,
      domain: options.domain ?? 'check',
      flavor: options.flavor || "Check Roll",
      chat: options.chat === true
    });
  }
}
