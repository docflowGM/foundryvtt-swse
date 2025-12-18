/**
 * Shared Utility Helpers
 * AUTO-GENERATED
 */

export class SWSEUtils {
  static getSelectedActor() {
    return canvas.tokens.controlled[0]?.actor ?? null;
  }

  static getTargetActor() {
    return game.user.targets.first()?.actor ?? null;
  }

  static async rollSkill(actor, skillId) {
    return await CONFIG.SWSE.Roll.quick(`1d20 + @skills.${skillId}.mod`, actor.getRollData());
  }

  static postChat(title, html) {
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: game.swse?.actor ?? null }),
      flavor: title,
      content: html
    });
  }

  static assertActor(actor) {
    if (!actor) throw new Error("Actor is required.");
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.Utils = SWSEUtils;

  game.swse = game.swse ?? {};
  game.swse.utils = SWSEUtils;
});
