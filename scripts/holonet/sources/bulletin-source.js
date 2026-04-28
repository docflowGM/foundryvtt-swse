/**
 * Bulletin Source Adapter
 */

import { SOURCE_FAMILY, INTENT_TYPE } from '../contracts/enums.js';
import { HolonetEvent } from '../contracts/holonet-event.js';
import { HolonetMessage } from '../contracts/holonet-message.js';
import { HolonetSender } from '../contracts/holonet-sender.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';

export class BulletinSource {
  static sourceFamily = SOURCE_FAMILY.BULLETIN;

  static #resolveSender(data) {
    if (data.authorActorId) {
      return HolonetSender.fromActor(data.authorActorId, data.authorActorName ?? data.authorName ?? null, data.authorAvatar ?? null);
    }
    return HolonetSender.system(data.authorName || 'GM Bulletin');
  }

  static createBulletinEvent(data) {
    return new HolonetEvent({
      id: data.id,
      sourceFamily: this.sourceFamily,
      sourceId: data.eventId ?? data.id,
      intent: INTENT_TYPE.BULLETIN_EVENT,
      sender: this.#resolveSender(data),
      audience: data.audience ?? HolonetAudience.allPlayers(),
      title: data.title ?? 'Event',
      body: data.body ?? '',
      priority: data.priority ?? 'normal',
      state: data.state,
      metadata: {
        category: data.category ?? 'news',
        published: data.published ?? false,
        ...data.metadata
      }
    });
  }

  static createBulletinMessage(data) {
    return new HolonetMessage({
      id: data.id,
      sourceFamily: this.sourceFamily,
      sourceId: data.messageId ?? data.id,
      intent: INTENT_TYPE.BULLETIN_MESSAGE,
      sender: this.#resolveSender(data),
      audience: data.audience ?? HolonetAudience.allPlayers(),
      title: data.title ?? 'Message',
      body: data.body ?? '',
      state: data.state,
      metadata: {
        category: data.category ?? 'message',
        published: data.published ?? false,
        ...data.metadata
      }
    });
  }

  static async initialize() {
    console.log('[Holonet] Bulletin source initialized');
  }
}
