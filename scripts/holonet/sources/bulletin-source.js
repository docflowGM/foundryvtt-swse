/**
 * Bulletin Source Adapter
 *
 * Source family for GM-authored bulletin events and messages
 * Skeleton-only in Phase 1.
 */

import { SOURCE_FAMILY, INTENT_TYPE } from '../contracts/enums.js';
import { HolonetEvent } from '../contracts/holonet-event.js';
import { HolonetMessage } from '../contracts/holonet-message.js';
import { HolonetSender } from '../contracts/holonet-sender.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';

export class BulletinSource {
  static sourceFamily = SOURCE_FAMILY.BULLETIN;

  /**
   * Create a bulletin event
   */
  static createBulletinEvent(data) {
    const event = new HolonetEvent({
      sourceFamily: this.sourceFamily,
      sourceId: data.eventId,
      intent: INTENT_TYPE.BULLETIN_EVENT,
      sender: HolonetSender.fromActor(data.authorActorId, data.authorActorName),
      audience: data.audience ?? HolonetAudience.allPlayers(),
      title: data.title ?? 'Event',
      body: data.body ?? '',
      priority: data.priority ?? 'normal',
      metadata: data.metadata ?? {
        category: data.category,
        published: false // Skeleton: not yet published
      }
    });

    return event;
  }

  /**
   * Create a bulletin message
   */
  static createBulletinMessage(data) {
    const message = new HolonetMessage({
      sourceFamily: this.sourceFamily,
      sourceId: data.messageId,
      intent: INTENT_TYPE.BULLETIN_MESSAGE,
      sender: HolonetSender.fromActor(data.authorActorId, data.authorActorName),
      audience: data.audience ?? HolonetAudience.allPlayers(),
      title: data.title ?? 'Bulletin',
      body: data.body ?? '',
      metadata: data.metadata ?? {
        published: false
      }
    });

    return message;
  }

  /**
   * Initialize bulletin source
   */
  static async initialize() {
    console.log('[Holonet] Bulletin source initialized (skeleton)');
    // Future: no full Bulletin editor yet in Phase 1
  }
}
