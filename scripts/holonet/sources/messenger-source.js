/**
 * Messenger Source Adapter
 *
 * Source family for player/GM/persona messaging
 * Skeleton-only in Phase 1 - no full Messenger UI yet.
 */

import { SOURCE_FAMILY, INTENT_TYPE } from '../contracts/enums.js';
import { HolonetMessage } from '../contracts/holonet-message.js';
import { HolonetSender } from '../contracts/holonet-sender.js';
import { HolonetThread } from '../contracts/holonet-thread.js';

export class MessengerSource {
  static sourceFamily = SOURCE_FAMILY.MESSENGER;

  /**
   * Create a messenger message
   */
  static createMessage(data) {
    const message = new HolonetMessage({
      sourceFamily: this.sourceFamily,
      sourceId: data.messageId,
      intent: INTENT_TYPE.SYSTEM_NEW_MESSAGE,
      sender: data.sender,
      audience: data.audience,
      title: null,
      body: data.body ?? '',
      threadId: data.threadId,
      parentRecordId: data.parentRecordId,
      mentions: data.mentions ?? [],
      tags: data.tags ?? [],
      metadata: data.metadata ?? {}
    });

    return message;
  }

  /**
   * Create a messenger thread
   */
  static createThread(data) {
    return new HolonetThread({
      title: data.title ?? 'Conversation',
      participants: data.participants ?? []
    });
  }

  /**
   * Initialize messenger source
   */
  static async initialize() {
    console.log('[Holonet] Messenger source initialized (skeleton)');
    // Future: no full Messenger app UI yet in Phase 1
  }
}
