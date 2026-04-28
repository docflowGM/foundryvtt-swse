/**
 * Holonet Engine
 *
 * Main orchestrator for the Holonet system.
 * Publishes records, routes delivery, manages state.
 */

import { HolonetStorage } from './subsystems/holonet-storage.js';
import { HolonetDeliveryRouter } from './subsystems/holonet-delivery-router.js';
import { HolonetProjectionRouter } from './subsystems/holonet-projection-router.js';
import { HolonetNotificationService } from './subsystems/holonet-notification-service.js';
import { HolonetFeedService } from './subsystems/holonet-feed-service.js';
import { DELIVERY_STATE } from './contracts/enums.js';

export class HolonetEngine {
  static #initialized = false;

  /**
   * Initialize Holonet
   */
  static async initialize() {
    if (this.#initialized) return;
    this.#initialized = true;

    console.log('[Holonet] Engine initialized');
    return true;
  }

  /**
   * Publish a record
   *
   * @param {HolonetRecord} record
   * @returns {Promise<boolean>}
   */
  static async publish(record) {
    if (!record) return false;

    try {
      // Publish
      record.publish();

      // Resolve recipients
      const recipients = HolonetDeliveryRouter.resolveRecipients(record);
      record.recipients = recipients;

      // Mark delivered
      for (const recipient of recipients) {
        record.setDeliveryState(recipient.id, DELIVERY_STATE.DELIVERED);
      }

      // Resolve projections
      const surfaces = HolonetProjectionRouter.resolveSurfaces(record);
      record.projections = surfaces;

      // Save
      await HolonetStorage.saveRecord(record);

      // Notify (if notification type)
      if (record.type === 'notification') {
        HolonetNotificationService.notify(record);
      }

      return true;
    } catch (err) {
      console.error('[Holonet] Failed to publish record:', err);
      return false;
    }
  }

  /**
   * Create and publish a record in one step
   */
  static async publishRecord(recordClass, data) {
    const record = new recordClass(data);
    return this.publish(record);
  }

  /**
   * Get a record
   */
  static async getRecord(recordId) {
    return HolonetStorage.getRecord(recordId);
  }

  /**
   * Get all records for a state
   */
  static async getRecordsByState(state) {
    return HolonetStorage.getRecordsByState(state);
  }

  /**
   * Get records for a recipient
   */
  static async getRecordsForRecipient(recipientId, states = null) {
    return HolonetStorage.getRecordsForRecipient(recipientId, states);
  }

  /**
   * Archive a record
   */
  static async archiveRecord(recordId) {
    const record = await HolonetStorage.getRecord(recordId);
    if (!record) return false;

    record.archive();
    return HolonetStorage.saveRecord(record);
  }

  /**
   * Mark record as read by recipient
   */
  static async markRead(recordId, recipientId) {
    const record = await HolonetStorage.getRecord(recordId);
    if (!record) return false;

    record.markRead(recipientId);
    return HolonetStorage.saveRecord(record);
  }

  /**
   * Get feed for a recipient
   */
  static async getFeedForRecipient(recipientId, surfaceType, limit) {
    return HolonetFeedService.getFeedForRecipient(recipientId, surfaceType, limit);
  }

  /**
   * Storage access
   */
  static get storage() {
    return HolonetStorage;
  }

  /**
   * Delivery router access
   */
  static get delivery() {
    return HolonetDeliveryRouter;
  }

  /**
   * Projection router access
   */
  static get projection() {
    return HolonetProjectionRouter;
  }

  /**
   * Notification service access
   */
  static get notifications() {
    return HolonetNotificationService;
  }

  /**
   * Feed service access
   */
  static get feed() {
    return HolonetFeedService;
  }

  /**
   * Retrieve records for diagnostic/validation purposes (read-only)
   * Usage: await SWSE.holonet.getRecordsForValidation()
   */
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

  /**
   * Count records by intent (diagnostic)
   */
  static async getRecordsByIntent(intent) {
    const records = await HolonetStorage.getAllRecords();
    return records.filter(r => r.intent === intent);
  }

  /**
   * Count all records (diagnostic)
   */
  static async getRecordCount() {
    const records = await HolonetStorage.getAllRecords();
    return records.length;
  }
}
