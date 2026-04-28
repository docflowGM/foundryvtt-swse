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
   * Initialize store source
   */
  static async initialize() {
    console.log('[Holonet] Store source initialized (skeleton)');
    // Future: hook into store transaction completion
  }
}
