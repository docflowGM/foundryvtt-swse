/* scripts/rolls/roll-manager.js
   Centralized roll creation/evaluation and message helpers.
*/
export class RollManager {
  static async safeRoll(formula, data = {}, options = {}) {
    try {
      const roll = new Roll(formula, data);
      await roll.evaluate({async: true});
      return roll;
    } catch (err) {
      console.error('SWSE | Roll failed:', formula, err);
      ui.notifications?.error?.('A roll failed — see console for details.');
      return null;
    }
  }

  static async rollToChat(roll, chatData = {}) {
    if (!roll) return null;
    try {
      const speaker = chatData.speaker || ChatMessage.getSpeaker();
      const content = roll.render(); // default rendering
      const messageData = mergeObject({
        user: game.user?.id,
        speaker,
        content,
        flags: { swse: { roll: true } }
      }, chatData, { inplace: false });
      return ChatMessage.create(messageData);
    } catch (err) {
      console.error('SWSE | rollToChat failed', err);
      return null;
    }
  }
}
