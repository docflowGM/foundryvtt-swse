/**
 * GameHolonetBridge
 *
 * Thin adapter between Holopad Games and Holonet/Messenger. Games owns the
 * session envelope; Messenger owns requests, acceptance, decline, and receipts.
 */

import { HolonetMessengerService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js';

function safeString(value) {
  return String(value || '').trim();
}

export class GameHolonetBridge {
  static async createInvite({ actor, gameId, recipientId, rulesMode = 'republic-senate', title = '', memo = '' } = {}) {
    return HolonetMessengerService.createGameInvite({
      actor,
      gameId: safeString(gameId),
      recipientId: safeString(recipientId),
      rulesMode: safeString(rulesMode) || 'republic-senate',
      title: safeString(title),
      memo: safeString(memo)
    });
  }

  static async acceptInvite({ actor, threadId, recordId } = {}) {
    return HolonetMessengerService.threadAction({
      actor,
      threadId: safeString(threadId),
      recordId: safeString(recordId),
      action: 'accept-game-invite'
    });
  }

  static async declineInvite({ actor, threadId, recordId } = {}) {
    return HolonetMessengerService.threadAction({
      actor,
      threadId: safeString(threadId),
      recordId: safeString(recordId),
      action: 'decline-game-invite'
    });
  }
}
