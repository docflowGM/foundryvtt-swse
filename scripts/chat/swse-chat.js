// scripts/chat/swse-chat.js

/**
 * SWSEChat
 *
 * Centralizes chat output so message creation is v13+ explicit and consistent.
 *
 * Rules:
 * - Rolls should be posted with Roll#toMessage and { create: true }.
 * - Non-roll messages should use ChatMessage.create with `style` (not `type`).
 */
export class SWSEChat {
  static speaker({ actor = null, token = null, alias = null } = {}) {
    return ChatMessage.getSpeaker({ actor, token, alias });
  }

  static async postRoll({
    roll,
    actor = null,
    token = null,
    speaker = null,
    flavor = '',
    flags = {},
    rollMode = null,
    whisper = null,
    blind = false
  } = {}) {
    if (!roll) {throw new Error('SWSEChat.postRoll requires a Roll.');}

    const msgSpeaker = speaker ?? this.speaker({ actor, token });

    const messageData = { speaker: msgSpeaker, flavor, flags, blind };
    if (Array.isArray(whisper)) {messageData.whisper = whisper;}

    const options = { create: true };
    if (rollMode) {options.rollMode = rollMode;}

    return roll.toMessage(messageData, options);
  }

  static async postHTML({
    content,
    actor = null,
    token = null,
    speaker = null,
    style = CONST.CHAT_MESSAGE_STYLES.OTHER,
    flags = {},
    whisper = null,
    blind = false,
    sound = null
  } = {}) {
    const msgSpeaker = speaker ?? this.speaker({ actor, token });

    const messageData = {
      user: game.user.id,
      speaker: msgSpeaker,
      content,
      style,
      flags,
      blind
    };

    if (sound) {messageData.sound = sound;}
    if (Array.isArray(whisper)) {messageData.whisper = whisper;}

    return ChatMessage.create(messageData);
  }
}
