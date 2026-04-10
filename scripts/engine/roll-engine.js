/**
 * SWSE Roll Engine
 * Centralized roll handler for Saga Edition mechanics
 * Integrates with Sentinel debugger and Foundry's chat system
 */

export class RollEngine {

  /**
   * Perform a dice roll safely
   * @param {string} formula - Dice formula (ex: "4d6dl", "1d20+5")
   * @param {object} data - Roll data context
   * @param {object} options - { flavor, chat }
   * @returns {Promise<Roll>}
   */
  static async safeRoll(formula, data = {}, options = {}) {

    if (!formula) {
      throw new Error("RollEngine.safeRoll: No formula provided");
    }

    try {

      const roll = new Roll(formula, data);
      await roll.evaluate();

      // Optional debug logging via Sentinel
      if (globalThis.SWSE?.Debugger) {
        globalThis.SWSE.Debugger.log("roll", {
          formula,
          total: roll.total,
          result: roll.result
        });
      }

      // Auto-send to chat unless disabled
      if (options.chat !== false) {
        await roll.toMessage({
          flavor: options.flavor || "Roll"
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


  /**
   * Ability score generation
   * Standard: 4d6 drop lowest
   * @returns {Promise<number>} The ability score total
   */
  static async rollAbilityScore() {

    const roll = await this.safeRoll("4d6dl", {}, {
      flavor: "Ability Score Roll"
    });

    return roll.total;
  }


  /**
   * Generic d20 roll
   * @param {number} modifier - Modifier to apply
   * @param {object} options - Roll options
   * @returns {Promise<Roll>}
   */
  static async rollD20(modifier = 0, options = {}) {

    const formula = modifier ? `1d20 + ${modifier}` : "1d20";

    return this.safeRoll(formula, {}, {
      flavor: options.flavor || "d20 Roll"
    });
  }


  /**
   * Damage roll
   * @param {string} formula - Damage formula
   * @param {object} options - Roll options
   * @returns {Promise<Roll>}
   */
  static async rollDamage(formula, options = {}) {

    return this.safeRoll(formula, {}, {
      flavor: options.flavor || "Damage Roll"
    });
  }


  /**
   * Check roll (skills, attacks, saves, etc)
   * @param {number} modifier - Modifier to apply
   * @param {object} options - Roll options
   * @returns {Promise<Roll>}
   */
  static async rollCheck(modifier = 0, options = {}) {

    const formula = modifier ? `1d20 + ${modifier}` : "1d20";

    return this.safeRoll(formula, {}, {
      flavor: options.flavor || "Check Roll"
    });
  }
}
