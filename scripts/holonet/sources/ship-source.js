/**
 * Ship Source Adapter
 *
 * Export seam for ship damage/repair events into Holonet
 * Does NOT modify ship system logic.
 */

import { SOURCE_FAMILY, INTENT_TYPE } from '../contracts/enums.js';
import { HolonetNotification } from '../contracts/holonet-notification.js';
import { HolonetSender } from '../contracts/holonet-sender.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';

export class ShipSource {
  static sourceFamily = SOURCE_FAMILY.SHIP;

  /**
   * Create a ship damage notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createShipDamageNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.shipId,
      intent: INTENT_TYPE.SHIP_DAMAGED,
      sender: HolonetSender.system('Ship Alert'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.shipName || 'Your Ship'} Has Been Damaged`,
      body: data.body ?? `${data.shipName || 'Your ship'} sustained damage. HP: ${data.previousHp} → ${data.newHp}`,
      level: 'warning',
      metadata: {
        shipId: data.shipId,
        shipName: data.shipName,
        actorId: data.actorId,
        previousHp: data.previousHp,
        newHp: data.newHp,
        damageAmount: (data.previousHp ?? 0) - (data.newHp ?? 0)
      }
    });

    return notification;
  }

  /**
   * Create a ship repair notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createShipRepairNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.shipId,
      intent: INTENT_TYPE.SHIP_REPAIRED,
      sender: HolonetSender.system('Ship Alert'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.shipName || 'Your Ship'} Has Been Repaired`,
      body: data.body ?? `${data.shipName || 'Your ship'} was repaired. HP: ${data.previousHp} → ${data.newHp}`,
      level: 'success',
      metadata: {
        shipId: data.shipId,
        shipName: data.shipName,
        actorId: data.actorId,
        previousHp: data.previousHp,
        newHp: data.newHp,
        healAmount: (data.newHp ?? 0) - (data.previousHp ?? 0)
      }
    });

    return notification;
  }

  /**
   * Create a ship engine damage notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createShipEngineDamageNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.shipId,
      intent: INTENT_TYPE.SHIP_ENGINE_DAMAGED,
      sender: HolonetSender.system('Ship Alert'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.shipName || 'Your Ship'} Engine Damaged`,
      body: data.body ?? `The engine of ${data.shipName || 'your ship'} has been damaged.`,
      level: 'critical',
      metadata: {
        shipId: data.shipId,
        shipName: data.shipName,
        actorId: data.actorId,
        reason: 'engine_damage'
      }
    });

    return notification;
  }

  /**
   * Create a shield damage notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createShieldDamageNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.shipId,
      intent: INTENT_TYPE.SHIP_SHIELDS_DAMAGED,
      sender: HolonetSender.system('Ship Alert'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.shipName || 'Your Ship'} Shields Damaged`,
      body: data.body ?? `${data.shipName || 'Your ship'} shields were damaged. Shields: ${data.previousShields} → ${data.newShields}`,
      level: 'warning',
      metadata: {
        shipId: data.shipId,
        shipName: data.shipName,
        actorId: data.actorId,
        previousShields: data.previousShields,
        newShields: data.newShields,
        damageAmount: (data.previousShields ?? 0) - (data.newShields ?? 0)
      }
    });

    return notification;
  }

  /**
   * Create a shield restoration notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createShieldRestorationNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.shipId,
      intent: INTENT_TYPE.SHIP_SHIELDS_RESTORED,
      sender: HolonetSender.system('Ship Alert'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.shipName || 'Your Ship'} Shields Restored`,
      body: data.body ?? `${data.shipName || 'Your ship'} shields were restored. Shields: ${data.previousShields} → ${data.newShields}`,
      level: 'success',
      metadata: {
        shipId: data.shipId,
        shipName: data.shipName,
        actorId: data.actorId,
        previousShields: data.previousShields,
        newShields: data.newShields,
        restoredAmount: (data.newShields ?? 0) - (data.previousShields ?? 0)
      }
    });

    return notification;
  }

  /**
   * Create a hyperdrive damage notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createHyperdriveDamageNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.shipId,
      intent: INTENT_TYPE.SHIP_HYPERDRIVE_DAMAGED,
      sender: HolonetSender.system('Ship Alert'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.shipName || 'Your Ship'} Hyperdrive Damaged`,
      body: data.body ?? `The hyperdrive of ${data.shipName || 'your ship'} has been damaged and is no longer functional.`,
      level: 'critical',
      metadata: {
        shipId: data.shipId,
        shipName: data.shipName,
        actorId: data.actorId,
        previousClass: data.previousClass,
        newClass: data.newClass,
        reason: 'hyperdrive_damage'
      }
    });

    return notification;
  }

  /**
   * Create a hyperdrive repair notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createHyperdriveRepairNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.shipId,
      intent: INTENT_TYPE.SHIP_HYPERDRIVE_REPAIRED,
      sender: HolonetSender.system('Ship Alert'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.shipName || 'Your Ship'} Hyperdrive Repaired`,
      body: data.body ?? `The hyperdrive of ${data.shipName || 'your ship'} has been repaired and is operational.`,
      level: 'success',
      metadata: {
        shipId: data.shipId,
        shipName: data.shipName,
        actorId: data.actorId,
        previousClass: data.previousClass,
        newClass: data.newClass,
        reason: 'hyperdrive_repair'
      }
    });

    return notification;
  }

  /**
   * Create a condition track change notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createConditionChangeNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.shipId,
      intent: data.worsened ? INTENT_TYPE.SHIP_CONDITION_WORSENED : INTENT_TYPE.SHIP_CONDITION_IMPROVED,
      sender: HolonetSender.system('Ship Alert'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.shipName || 'Your Ship'} Condition ${data.worsened ? 'Worsened' : 'Improved'}`,
      body: data.body ?? `${data.shipName || 'Your ship'} condition ${data.worsened ? 'worsened' : 'improved'}. Condition: ${data.previousCondition} → ${data.newCondition}`,
      level: data.worsened ? 'warning' : 'success',
      metadata: {
        shipId: data.shipId,
        shipName: data.shipName,
        actorId: data.actorId,
        previousCondition: data.previousCondition,
        newCondition: data.newCondition,
        worsened: data.worsened
      }
    });

    return notification;
  }

  /**
   * Create a generic subsystem damage notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createSystemDamageNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.shipId,
      intent: data.repaired ? INTENT_TYPE.SHIP_SYSTEM_REPAIRED : INTENT_TYPE.SHIP_SYSTEM_DAMAGED,
      sender: HolonetSender.system('Ship Alert'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.systemName || 'Ship System'} ${data.repaired ? 'Repaired' : 'Damaged'}`,
      body: data.body ?? `${data.systemName || 'A ship system'} has been ${data.repaired ? 'repaired' : 'damaged'}.`,
      level: data.repaired ? 'success' : 'warning',
      metadata: {
        shipId: data.shipId,
        shipName: data.shipName,
        actorId: data.actorId,
        systemName: data.systemName,
        systemType: data.systemType,
        repaired: data.repaired
      }
    });

    return notification;
  }

  /**
   * Create a ship status change notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createShipStatusNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.shipId,
      intent: INTENT_TYPE.SHIP_STATUS_CHANGED,
      sender: HolonetSender.system('Ship Alert'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: `${data.shipName || 'Your Ship'} Status Updated`,
      body: data.body ?? `${data.shipName || 'Your ship'} status changed.`,
      level: 'info',
      metadata: {
        shipId: data.shipId,
        shipName: data.shipName,
        actorId: data.actorId,
        previousStatus: data.previousStatus,
        newStatus: data.newStatus
      }
    });

    return notification;
  }

  /**
   * Initialize ship source
   */
  static async initialize() {
    console.log('[Holonet] Ship source initialized');
  }
}
