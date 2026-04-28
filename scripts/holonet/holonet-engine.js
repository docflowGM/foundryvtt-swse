/**
 * Holonet Engine
 */

import { HolonetStorage } from './subsystems/holonet-storage.js';
import { HolonetDeliveryRouter } from './subsystems/holonet-delivery-router.js';
import { HolonetProjectionRouter } from './subsystems/holonet-projection-router.js';
import { HolonetNotificationService } from './subsystems/holonet-notification-service.js';
import { HolonetFeedService } from './subsystems/holonet-feed-service.js';
import { HolonetSocketService } from './subsystems/holonet-socket-service.js';
import { DELIVERY_STATE } from './contracts/enums.js';

export class HolonetEngine {
  static #initialized = false;

  static async initialize() {
    if (this.#initialized) return;
    this.#initialized = true;
    HolonetSocketService.initialize();
    console.log('[Holonet] Engine initialized');
    return true;
  }

  static async publish(record, { skipSocket = false } = {}) {
    if (!record) return false;
    if (!game.user?.isGM && !skipSocket) {
      HolonetSocketService.emitRequest('publish-record', { record: record.toJSON?.() ?? record });
      return true;
    }

    try {
      record.publish();
      const recipients = HolonetDeliveryRouter.resolveRecipients(record);
      record.recipients = recipients;
      for (const recipient of recipients) {
        record.setDeliveryState(recipient.id, DELIVERY_STATE.DELIVERED);
      }
      const surfaces = record.projections?.length ? record.projections : HolonetProjectionRouter.resolveSurfaces(record);
      record.projections = surfaces;
      await HolonetStorage.saveRecord(record);

      const currentRecipientId = HolonetDeliveryRouter.getCurrentRecipientId();
      const localRecipientIds = recipients.filter(r => r.id === currentRecipientId).map(r => r.id);
      if (localRecipientIds.length && record.type === 'notification') {
        HolonetNotificationService.notify(record);
      }
      return true;
    } catch (err) {
      console.error('[Holonet] Failed to publish record:', err);
      return false;
    }
  }

  static async publishRecord(recordClass, data, options = {}) {
    const record = new recordClass(data);
    return this.publish(record, options);
  }

  static async getRecord(recordId) {
    return HolonetStorage.getRecord(recordId);
  }

  static async getRecordsByState(state) {
    return HolonetStorage.getRecordsByState(state);
  }

  static async getRecordsForRecipient(recipientId, states = null) {
    return HolonetStorage.getRecordsForRecipient(recipientId, states);
  }

  static async archiveRecord(recordId) {
    const record = await HolonetStorage.getRecord(recordId);
    if (!record) return false;
    record.archive();
    return HolonetStorage.saveRecord(record);
  }

  static async markRead(recordId, recipientId, { skipSocket = false } = {}) {
    if (!game.user?.isGM && !skipSocket) {
      HolonetSocketService.emitRequest('mark-read', { recordId, recipientId });
      return true;
    }
    const record = await HolonetStorage.getRecord(recordId);
    if (!record) return false;
    record.markRead(recipientId);
    return HolonetStorage.saveRecord(record);
  }

  static async getFeedForRecipient(recipientId, surfaceType, limit) {
    return HolonetFeedService.getFeedForRecipient(recipientId, surfaceType, limit);
  }

  static get storage() { return HolonetStorage; }
  static get delivery() { return HolonetDeliveryRouter; }
  static get projection() { return HolonetProjectionRouter; }
  static get notifications() { return HolonetNotificationService; }
  static get feed() { return HolonetFeedService; }

  static async getRecordsForValidation(limit = 10) {
    const records = await HolonetStorage.getAllRecords();
    return records
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
      .map(r => ({
        id: r.id,
        type: r.type,
        intent: r.intent,
        title: r.title,
        state: r.state,
        sourceFamily: r.sourceFamily,
        createdAt: r.createdAt,
        recipientCount: r.recipients?.length ?? 0
      }));
  }

  static async getRecordsByIntent(intent) {
    const records = await HolonetStorage.getAllRecords();
    return records.filter(r => r.intent === intent);
  }

  static async getRecordCount() {
    const records = await HolonetStorage.getAllRecords();
    return records.length;
  }

  static async getUnreadCountsForRecipient(recipientId, { bySourceFamily = false } = {}) {
    const records = await HolonetStorage.getRecordsForRecipient(recipientId, [DELIVERY_STATE.PUBLISHED]);
    const unread = records.filter(r => r.isUnreadBy?.(recipientId));
    const summary = {
      total: unread.length,
      messages: unread.filter(r => r.type === 'message').length,
      notifications: unread.filter(r => r.type === 'notification').length,
      events: unread.filter(r => r.type === 'event').length,
      requests: unread.filter(r => r.type === 'request').length,
      transactions: unread.filter(r => String(r.intent).startsWith('system.transaction_')).length,
      approvals: unread.filter(r => String(r.intent).includes('approval')).length,
      mentor: unread.filter(r => r.sourceFamily === 'mentor').length
    };
    if (bySourceFamily) {
      summary.bySourceFamily = unread.reduce((acc, record) => {
        const key = record.sourceFamily || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
    }
    return summary;
  }
}
