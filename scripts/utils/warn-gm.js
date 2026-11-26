/**
 * GM Warning Utility
 * Notifies the GM via console and chat message of potential data issues
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";

export function warnGM(message) {
  // Log to console
  SWSELogger.warn(message);

  // Send GM chat whisper
  SWSEChat.postHTML({ content: `<p style="color:orange;"><strong>SWSE Warning:</strong> ${message}</p>`, whisper: ChatMessage.getWhisperRecipients('GM') });
}
