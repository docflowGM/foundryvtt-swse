/**
 * Droid Source Adapter
 *
 * Export seam for droid damage/repair/status events into Holonet
 * Does NOT modify droid system logic.
 */

import { SOURCE_FAMILY, INTENT_TYPE } from '../contracts/enums.js';
import { HolonetNotification } from '../contracts/holonet-notification.js';
import { HolonetSender } from '../contracts/holonet-sender.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';

export class DroidSource {
  static sourceFamily = SOURCE_FAMILY.DROID;

  /**
   * Create a droid damage notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createDroidDamageNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.droidId,
      intent: INTENT_TYPE.DROID_DAMAGED,
      sender: HolonetSender.system('Droid Alert'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.droidName || 'Your Droid'} Has Been Damaged`,
      body: data.body ?? `${data.droidName || 'Your droid'} sustained damage. HP: ${data.previousHp} → ${data.newHp}`,
      level: 'warning',
      metadata: {
        droidId: data.droidId,
        droidName: data.droidName,
        actorId: data.actorId,
        previousHp: data.previousHp,
        newHp: data.newHp,
        damageAmount: (data.previousHp ?? 0) - (data.newHp ?? 0)
      }
    });

    return notification;
  }

  /**
   * Create a droid repair notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createDroidRepairNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.droidId,
      intent: INTENT_TYPE.DROID_REPAIRED,
      sender: HolonetSender.system('Droid Alert'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.droidName || 'Your Droid'} Has Been Repaired`,
      body: data.body ?? `${data.droidName || 'Your droid'} was repaired. HP: ${data.previousHp} → ${data.newHp}`,
      level: 'success',
      metadata: {
        droidId: data.droidId,
        droidName: data.droidName,
        actorId: data.actorId,
        previousHp: data.previousHp,
        newHp: data.newHp,
        healAmount: (data.newHp ?? 0) - (data.previousHp ?? 0)
      }
    });

    return notification;
  }

  /**
   * Create a droid disabled notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createDroidDisabledNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.droidId,
      intent: INTENT_TYPE.DROID_DISABLED,
      sender: HolonetSender.system('Droid Alert'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.droidName || 'Your Droid'} Has Been Disabled`,
      body: data.body ?? `${data.droidName || 'Your droid'} has been disabled.`,
      level: 'critical',
      metadata: {
        droidId: data.droidId,
        droidName: data.droidName,
        actorId: data.actorId,
        reason: 'disabled'
      }
    });

    return notification;
  }

  /**
   * Create a droid status change notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createDroidStatusNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.droidId,
      intent: INTENT_TYPE.DROID_STATUS_CHANGED,
      sender: HolonetSender.system('Droid Alert'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.droidName || 'Your Droid'} Status Updated`,
      body: data.body ?? `${data.droidName || 'Your droid'} status changed.`,
      level: 'info',
      metadata: {
        droidId: data.droidId,
        droidName: data.droidName,
        actorId: data.actorId,
        previousStatus: data.previousStatus,
        newStatus: data.newStatus
      }
    });

    return notification;
  }

  /**
   * Initialize droid source
   */
  static async initialize() {
    console.log('[Holonet] Droid source initialized');
  }
}
