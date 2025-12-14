// scripts/engine/roll-engine.js
import { swseLogger } from "../utils/logger.js";

export const RollEngine = {
  /**
   * Rolls a formula and evaluates it (async safe)
   * @param {string} formula - Roll formula, e.g., "1d20+3"
   * @param {object} data - Data context for the roll
   * @returns {Promise<Roll|null>} Evaluated Roll or null if error
   */
  async safeRoll(formula, data = {}) {
    try {
      const roll = new Roll(formula, data);
      await roll.evaluate(); // ✅ v13-compatible, async evaluation
      return roll;
    } catch (err) {
      swseLogger.error("RollEngine.safeRoll failed", formula, err);
      ui.notifications?.error?.("A roll failed; check console.");
      return null;
    }
  },

  /**
   * Sends a roll to chat
   * @param {Roll} roll - The evaluated roll
   * @param {object} chatData - Optional chat message data
   * @returns {Promise<ChatMessage|null>}
   */
  async rollToChat(roll, chatData = {}) {
    if (!roll) return null;
    try {
      const content = await roll.render();
      const message = mergeObject(
        {
          user: game.user?.id,
          speaker: chatData.speaker || ChatMessage.getSpeaker(),
          content,
          flavor: chatData.flavor || "",
          flags: { swse: { roll: true } }
        },
        chatData,
        { inplace: false }
      );
      return ChatMessage.create(message);
    } catch (err) {
      swseLogger.error("RollEngine.rollToChat failed", err);
      return null;
    }
  },

  /**
   * Rolls an attack and sends to chat
   * @param {Actor} actor
   * @param {Item} item
   * @param {object} data
   */
  async rollAttack(actor, item, data = {}) {
    const formula = item?.system?.attack?.formula || data.formula || "1d20";
    const roll = await this.safeRoll(formula, data);
    if (roll) {
      await this.rollToChat(roll, {
        speaker: ChatMessage.getSpeaker({ actor: actor?.id }),
        flavor: `Attack: ${item?.name || ""}`
      });
    }
    return roll;
  },

  /**
   * Rolls a skill and sends to chat
   * @param {Actor} actor
   * @param {string} skillKey
   * @param {object} data
   */
  async rollSkill(actor, skillKey, data = {}) {
    const formula = data.formula || "1d20";
    const roll = await this.safeRoll(formula, data);
    if (roll) {
      await this.rollToChat(roll, {
        speaker: ChatMessage.getSpeaker({ actor: actor?.id }),
        flavor: `Skill: ${skillKey}`
      });
    }
    return roll;
  }
};
