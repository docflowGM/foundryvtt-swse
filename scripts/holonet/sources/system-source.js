/**
 * System Source Adapter
 *
 * System-generated notifications and events
 */

import { SOURCE_FAMILY, INTENT_TYPE } from '../contracts/enums.js';
import { HolonetNotification } from '../contracts/holonet-notification.js';
import { HolonetEvent } from '../contracts/holonet-event.js';
import { HolonetSender } from '../contracts/holonet-sender.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';

export class SystemSource {
  static sourceFamily = SOURCE_FAMILY.SYSTEM;

  /**
   * Create a generic system notification
   */
  static createNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.sourceId,
      intent: data.intent ?? INTENT_TYPE.SYSTEM_NEW_MESSAGE,
      sender: HolonetSender.system(data.senderLabel ?? 'System'),
      audience: data.audience ?? HolonetAudience.allPlayers(),
      title: data.title ?? 'System Notification',
      body: data.body ?? '',
      level: data.level ?? 'info',
      icon: data.icon,
      metadata: data.metadata ?? {}
    });

    return notification;
  }

  /**
   * Create a system event
   */
  static createEvent(data) {
    const event = new HolonetEvent({
      sourceFamily: this.sourceFamily,
      sourceId: data.sourceId,
      intent: data.intent ?? INTENT_TYPE.SYSTEM_NEW_EVENT,
      sender: HolonetSender.system(data.senderLabel ?? 'System'),
      audience: data.audience ?? HolonetAudience.allPlayers(),
      title: data.title ?? 'System Event',
      body: data.body ?? '',
      priority: data.priority ?? 'normal',
      metadata: data.metadata ?? {}
    });

    return event;
  }

  /**
   * Create objective update
   */
  static createObjectiveUpdate(data) {
    return this.createEvent({
      ...data,
      intent: INTENT_TYPE.SYSTEM_OBJECTIVE_UPDATED,
      senderLabel: 'Objectives'
    });
  }

  /**
   * Create location update
   */
  static createLocationUpdate(data) {
    return this.createEvent({
      ...data,
      intent: INTENT_TYPE.SYSTEM_LOCATION_UPDATED,
      senderLabel: 'Location'
    });
  }

  /**
   * Initialize system source
   */
  static async initialize() {
    console.log('[Holonet] System source initialized');
  }
}
