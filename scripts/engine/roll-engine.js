// scripts/engine/roll-engine.js
import { swseLogger } from "../utils/logger.js";

export const RollEngine = {
  async safeRoll(formula, data = {}, options = {}) {
    try {
      const roll = globalThis.SWSE.RollEngine.safeRoll(formula, data);
      await roll.evaluate({async: true});
      return roll;
    } catch (err) {
      swseLogger.error("RollEngine.safeRoll failed", formula, err);
      ui.notifications?.error?.("A roll failed; check console.");
      return null;
    }
  },

  async rollToChat(roll, chatData = {}) {
    if (!roll) return null;
    try {
      const content = await roll.render();
      const message = mergeObject({
        user: game.user?.id,
        speaker: chatData.speaker || ChatMessage.getSpeaker(),
        content,
        flavor: chatData.flavor || "",
        flags: { swse: { roll: true } }
      }, chatData, { inplace: false });
      return ChatMessage.create(message);
    } catch (err) {
      swseLogger.error("RollEngine.rollToChat failed", err);
      return null;
    }
  },

  // centralised wrappers for common roll types
  async rollAttack(actor, item, data={}) {
    // Example: item.system.formula or default
    const formula = item?.system?.attack?.formula || data.formula || "1d20";
    const roll = await this.safeRoll(formula, data);
    await this.rollToChat(roll, {speaker: ChatMessage.getSpeaker({actor: actor?.id}), flavor: `Attack: ${item?.name || ''}`});
    return roll;
  },

  async rollSkill(actor, skillKey, data={}) {
    const formula = data.formula || "1d20";
    const roll = await this.safeRoll(formula, data);
    await this.rollToChat(roll, {speaker: ChatMessage.getSpeaker({actor: actor?.id}), flavor: `Skill: ${skillKey}`});
    return roll;
  }
};
