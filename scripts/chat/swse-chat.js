// scripts/chat/swse-chat.js

import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { SWSERollEngine } from "/systems/foundryvtt-swse/scripts/engine/rolls/swse-roll-engine.js";

/**
 * SWSEChat
 *
 * Centralizes chat output so message creation is v13+ explicit and consistent.
 *
 * Rules:
 * - All rolls render through postRoll() with holo template.
 * - Non-roll messages should use postHTML().
 * - Single roll pipeline: postRoll() → holo-roll.hbs → ChatMessage.create()
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
    blind = false,
    context = {}
  } = {}) {
    if (!roll) {throw new Error('SWSEChat.postRoll requires a Roll.');}

    // Build structured roll data for holo rendering
    const holoData = SWSERollEngine.buildHoloRollData({
      roll,
      actor,
      flavor,
      context
    });

    // Render holo roll template
    const content = await foundry.applications.handlebars.renderTemplate(
      'systems/foundryvtt-swse/templates/chat/holo-roll.hbs',
      holoData
    );

    const msgSpeaker = speaker ?? this.speaker({ actor, token });

    const messageData = {
      user: game.user.id,
      speaker: msgSpeaker,
      content,
      flags: {
        ...flags,
        swse: { ...(flags?.swse || {}), holo: true }
      },
      blind,
      rolls: [roll.toJSON()]
    };

    if (Array.isArray(whisper)) {messageData.whisper = whisper;}
    if (rollMode) {messageData.rollMode = rollMode;}

    return createChatMessage(messageData);
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

    return createChatMessage(messageData);
  }
}
