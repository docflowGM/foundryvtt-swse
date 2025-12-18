/**
 * GM Warning Utility
 * Notifies the GM via console and chat message of potential data issues
 */

import { SWSELogger } from './logger.js';

export function warnGM(message) {
  // Log to console
  SWSELogger.warn(message);

  // Send GM chat whisper
  ChatMessage.create({
    content: `<p style="color:orange;"><strong>SWSE Warning:</strong> ${message}</p>`,
    whisper: ChatMessage.getWhisperRecipients("GM")
  });
}
