/**
 * Healing Source Adapter
 *
 * Export seam for natural healing/rest events into Holonet
 * Does NOT modify healing system logic.
 */

import { SOURCE_FAMILY, INTENT_TYPE } from '../contracts/enums.js';
import { HolonetNotification } from '../contracts/holonet-notification.js';
import { HolonetSender } from '../contracts/holonet-sender.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';

export class HealingSource {
  static sourceFamily = SOURCE_FAMILY.HEALING;

  /**
   * Create a natural rest recovery notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createNaturalRestNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.actorId,
      intent: INTENT_TYPE.HEALING_NATURAL_REST,
      sender: HolonetSender.system('Rest & Recovery'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.actorName || 'You'} Recovered Through Natural Healing`,
      body: data.body ?? `${data.actorName || 'You'} recovered ${data.amountRecovered || 0} HP through natural healing and rest.`,
      level: 'success',
      metadata: {
        actorId: data.actorId,
        actorName: data.actorName,
        previousHp: data.previousHp,
        newHp: data.newHp,
        amountRecovered: data.amountRecovered,
        reason: 'natural-rest'
      }
    });

    return notification;
  }

  /**
   * Create a rest/reset recovery notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createRestResetNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.actorId,
      intent: INTENT_TYPE.HEALING_REST_RESET,
      sender: HolonetSender.system('Rest & Recovery'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.actorName || 'You'} Recovered Through Rest`,
      body: data.body ?? `${data.actorName || 'You'} recovered ${data.amountRecovered || 0} HP during rest.`,
      level: 'success',
      metadata: {
        actorId: data.actorId,
        actorName: data.actorName,
        previousHp: data.previousHp,
        newHp: data.newHp,
        amountRecovered: data.amountRecovered,
        reason: 'rest-reset'
      }
    });

    return notification;
  }

  /**
   * Initialize healing source
   */
  static async initialize() {
    console.log('[Holonet] Healing source initialized');
  }
}
