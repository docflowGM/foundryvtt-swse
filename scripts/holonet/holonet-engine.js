/**
 * Holonet Engine
 */

import { HolonetStorage } from './subsystems/holonet-storage.js';
import { HolonetDeliveryRouter } from './subsystems/holonet-delivery-router.js';
import { HolonetProjectionRouter } from './subsystems/holonet-projection-router.js';
import { HolonetNotificationService } from './subsystems/holonet-notification-service.js';
import { MessengerNotificationBridge } from './subsystems/messenger-notification-bridge.js';
import { MessengerMaintenanceService } from './subsystems/messenger-maintenance-service.js';
import { HolonetFeedService } from './subsystems/holonet-feed-service.js';
import { HolonetSocketService } from './subsystems/holonet-socket-service.js';
import { DELIVERY_STATE } from './contracts/enums.js';
import { assertHolonetBoundary } from './contracts/holonet-boundaries.js';

export class HolonetEngine {
  static #initialized = false;

  static async initialize() {
    if (this.#initialized) return;
    this.#initialized = true;
    HolonetSocketService.initialize();
    console.log('[Holonet] Engine initialized');
    return true;
  }

  static async publish(record, { skipSocket = false, suppressLocalHook = false } = {}) {
    if (!record) return false;
    if (!game.user?.isGM && !skipSocket) {
      HolonetSocketService.emitRequest('publish-record', { record: record.toJSON?.() ?? record });
      return true;
    }
    return this._publishAsGm(record, { suppressLocalHook });
  }

  /** @private — GM-side publish pipeline broken into explicit phases */
  static async _publishAsGm(record, { suppressLocalHook = false } = {}) {
    try {
      this.prepareRecordForPublish(record);
      await this._persistRecord(record);
      if (!suppressLocalHook) this.emitPreparedRecordPublished(record);
      return true;
    } catch (err) {
      console.error('[Holonet] Failed to publish record:', err);
      return false;
    }
  }

  /**
   * Prepare a record for publication without persisting it.
   * Thread publishing uses this to commit message + thread in one storage envelope.
   */
  static prepareRecordForPublish(record) {
    assertHolonetBoundary(record);
    this._applyPublishLifecycle(record);
    this._applyRecipients(record);
    this._applyProjections(record);
    return record;
  }

  /** Emit local notifications/hooks after a prepared record is persisted. */
  static emitPreparedRecordPublished(record) {
    this._notifyLocalRecipient(record);
    this._emitPublished(record);
  }

  /** @private — Mark record published and set timestamps */
  static _applyPublishLifecycle(record) {
    record.publish();
  }

  /** @private — Resolve recipients and set per-recipient delivery states */
  static _applyRecipients(record) {
    const recipients = HolonetDeliveryRouter.resolveRecipients(record);
    record.recipients = recipients;
    for (const recipient of recipients) {
      record.setDeliveryState(recipient.id, DELIVERY_STATE.DELIVERED);
    }
  }

  /** @private — Resolve projection surfaces if not already set */
  static _applyProjections(record) {
    if (!record.projections?.length) {
      record.projections = HolonetProjectionRouter.resolveSurfaces(record);
    }
  }

  /** @private — Persist to storage */
  static async _persistRecord(record) {
    await HolonetStorage.saveRecord(record);
  }

  /** @private — Show local toast for notification-type records when this client is a recipient */
  static _notifyLocalRecipient(record) {
    const currentRecipientId = HolonetDeliveryRouter.getCurrentRecipientId();
    const isLocalRecipient = record.recipients?.some(r => r.id === currentRecipientId);
    if (!isLocalRecipient) return;
    if (record.type === 'notification') {
      void MessengerNotificationBridge.shouldSuppressForRecipient(record, currentRecipientId).then((suppressed) => {
        if (!suppressed) HolonetNotificationService.notify(record);
      });
      return;
    }
    void MessengerNotificationBridge.notifyLocalMessengerRecord(record, currentRecipientId);
  }

  /** @private — Fire local hook so UI can react without waiting for socket sync */
  static _emitPublished(record) {
    Hooks.callAll('swseHolonet:recordPublished', { recordId: record.id, recipients: record.recipients });
    Hooks.callAll('swseHolonetUpdated', { type: 'record-published', recordId: record.id });
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

  /**
   * Mark multiple records read in a single storage write.
   * Non-GM clients relay to the GM via socket.
   *
   * @param {string[]} recordIds
   * @param {string}   recipientId
   * @param {Object}   [options]
   * @returns {Promise<boolean>}
   */
  static async markManyRead(recordIds, recipientId, { skipSocket = false } = {}) {
    if (!Array.isArray(recordIds) || !recordIds.length || !recipientId) return false;
    if (!game.user?.isGM && !skipSocket) {
      HolonetSocketService.emitRequest('mark-many-read', { recordIds, recipientId });
      return true;
    }
    try {
      const changed = [];
      for (const recordId of recordIds) {
        const record = await HolonetStorage.getRecord(recordId);
        if (!record) continue;
        if (record.isUnreadBy?.(recipientId)) {
          record.markRead(recipientId);
          changed.push(record);
        }
      }
      if (changed.length) {
        await HolonetStorage.saveRecords(changed);
        HolonetSocketService.emitSync({ type: 'records-read', recordIds: changed.map(r => r.id), recipientId });
      }
      return true;
    } catch (err) {
      console.error('[Holonet] markManyRead failed:', err);
      return false;
    }
  }

  static async getFeedForRecipient(recipientId, surfaceType, limit) {
    return HolonetFeedService.getFeedForRecipient(recipientId, surfaceType, limit);
  }

  static get storage() { return HolonetStorage; }
  static get delivery() { return HolonetDeliveryRouter; }
  static get projection() { return HolonetProjectionRouter; }
  static get notifications() { return HolonetNotificationService; }
  static get feed() { return HolonetFeedService; }
  static get messengerMaintenance() { return MessengerMaintenanceService; }

  static async auditMessengerStorage(options = {}) {
    return MessengerMaintenanceService.audit(options);
  }

  static async runMessengerMaintenanceDryRun(options = {}) {
    return MessengerMaintenanceService.runDryRunProfile(options);
  }

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
    // Phase 3: Use index-backed method
    return HolonetStorage.getRecordsByIntent(intent);
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
