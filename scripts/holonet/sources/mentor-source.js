/**
 * Mentor Source Adapter
 *
 * Export seam for mentor events into Holonet
 * Does NOT modify mentor system logic.
 */

import { SOURCE_FAMILY, INTENT_TYPE } from '../contracts/enums.js';
import { HolonetEvent } from '../contracts/holonet-event.js';
import { HolonetSender } from '../contracts/holonet-sender.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';

export class MentorSource {
  static sourceFamily = SOURCE_FAMILY.MENTOR;

  /**
   * Create a mentor event record
   *
   * @param {Object} data
   * @returns {HolonetEvent}
   */
  static createMentorEvent(data) {
    const event = new HolonetEvent({
      sourceFamily: this.sourceFamily,
      sourceId: data.sourceId,
      intent: data.intent ?? INTENT_TYPE.MENTOR_LEVEL_AVAILABLE,
      sender: HolonetSender.fromActor(data.mentorActorId, data.mentorActorName),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: data.title ?? 'Mentor Event',
      body: data.body ?? '',
      metadata: data.metadata ?? {}
    });

    return event;
  }

  /**
   * Initialize mentor source (hookup/registration)
   */
  static async initialize() {
    console.log('[Holonet] Mentor source initialized (skeleton)');
    // Future: hook into actual mentor system
  }
}
