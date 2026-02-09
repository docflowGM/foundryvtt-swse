/* scripts/rolls/roll-manager.js
   Centralized roll creation/evaluation and message helpers.
*/
export class RollManager {
  static async safeRoll(formula, data = {}, options = {}) {
    try {
      const roll = globalThis.SWSE.RollEngine.safeRoll(formula, data);
      await roll.evaluate({ async: true });
      return roll;
    } catch (err) {
      swseLogger.error('SWSE | Roll failed:', formula, err);
      ui.notifications?.error?.('A roll failed — see console for details.');
      return null;
    }
  }

  static async rollToChat(roll, chatData = {}) {
    if (!roll) {return null;}
    try {
      const speaker = chatData.speaker || ChatMessage.getSpeaker();
      const content = roll.render(); // default rendering
      const messageData = foundry.utils.mergeObject({
        user: game.user?.id,
        speaker,
        content,
        flags: { swse: { roll: true } }
      }, chatData, { inplace: false });
      return ChatMessage.create(messageData);
    } catch (err) {
      swseLogger.error('SWSE | rollToChat failed', err);
      return null;
    }
  }
}
