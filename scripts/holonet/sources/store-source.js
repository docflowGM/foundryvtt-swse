/**
 * Store Source Adapter
 *
 * Export seam for store transaction events into Holonet
 * Does NOT modify store system logic.
 */

import { SOURCE_FAMILY, INTENT_TYPE } from '../contracts/enums.js';
import { HolonetNotification } from '../contracts/holonet-notification.js';
import { HolonetSender } from '../contracts/holonet-sender.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';

export class StoreSource {
  static sourceFamily = SOURCE_FAMILY.STORE;

  /**
   * Create a transaction notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createTransactionNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.transactionId,
      intent: data.intent ?? INTENT_TYPE.SYSTEM_TRANSACTION_APPROVED,
      sender: HolonetSender.system('Store'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: data.title ?? 'Transaction',
      body: data.body ?? '',
      level: data.level ?? 'info',
      metadata: data.metadata ?? {}
    });

    return notification;
  }

  /**
   * Create an order-ready notification
   */
  static createOrderReadyNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: data.orderId,
      intent: INTENT_TYPE.SYSTEM_ORDER_READY,
      sender: HolonetSender.system('Store'),
      audience: HolonetAudience.singlePlayer(data.playerUserId),
      title: 'Order Ready for Pickup',
      body: data.body ?? '',
      level: 'success',
      actionLabel: 'View Order',
      actionUrl: data.orderUrl,
      metadata: data.metadata ?? {}
    });

    return notification;
  }

  /**
   * Create a store opened notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createStoreOpenedNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: 'store-state',
      intent: INTENT_TYPE.STORE_OPENED,
      sender: HolonetSender.system('Store'),
      audience: HolonetAudience.allPlayers(),
      title: 'Store Opened',
      body: data.body ?? 'The store is now open for business.',
      level: 'info',
      metadata: data.metadata ?? {}
    });

    return notification;
  }

  /**
   * Create a store closed notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createStoreClosedNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: 'store-state',
      intent: INTENT_TYPE.STORE_CLOSED,
      sender: HolonetSender.system('Store'),
      audience: HolonetAudience.allPlayers(),
      title: 'Store Closed',
      body: data.body ?? 'The store is now closed.',
      level: 'info',
      metadata: data.metadata ?? {}
    });

    return notification;
  }

  /**
   * Create a store sale started notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createStoreSaleNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: 'store-pricing',
      intent: INTENT_TYPE.STORE_SALE_STARTED,
      sender: HolonetSender.system('Store'),
      audience: HolonetAudience.allPlayers(),
      title: 'Store Sale Happening Now!',
      body: data.body ?? 'A sale has begun. Store prices have been reduced.',
      level: 'success',
      metadata: {
        previousModifier: data.previousModifier,
        newModifier: data.newModifier,
        discountPercent: data.discountPercent,
        ...data.metadata
      }
    });

    return notification;
  }

  /**
   * Create a store tax/price increase notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createStoreTaxedNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: 'store-pricing',
      intent: INTENT_TYPE.STORE_TAXED,
      sender: HolonetSender.system('Store'),
      audience: HolonetAudience.allPlayers(),
      title: 'Store Prices Increased',
      body: data.body ?? 'New taxes have been applied. Store prices have been increased.',
      level: 'warning',
      metadata: {
        previousModifier: data.previousModifier,
        newModifier: data.newModifier,
        increasePercent: data.increasePercent,
        ...data.metadata
      }
    });

    return notification;
  }

  /**
   * Create a generic store price change notification
   *
   * @param {Object} data
   * @returns {HolonetNotification}
   */
  static createStorePriceChangeNotification(data) {
    const notification = new HolonetNotification({
      sourceFamily: this.sourceFamily,
      sourceId: 'store-pricing',
      intent: INTENT_TYPE.STORE_PRICES_CHANGED,
      sender: HolonetSender.system('Store'),
      audience: HolonetAudience.allPlayers(),
      title: 'Store Prices Changed',
      body: data.body ?? 'Store pricing has been updated.',
      level: 'info',
      metadata: {
        previousModifier: data.previousModifier,
        newModifier: data.newModifier,
        reason: data.reason,
        ...data.metadata
      }
    });

    return notification;
  }

  /**
   * Initialize store source
   */
  static async initialize() {
    console.log('[Holonet] Store source initialized');
  }
}
