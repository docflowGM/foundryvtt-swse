/**
 * Holonet Engine
 */

import { HolonetStorage } from './subsystems/holonet-storage.js';
import { HolonetDeliveryRouter } from './subsystems/holonet-delivery-router.js';
import { HolonetProjectionRouter } from './subsystems/holonet-projection-router.js';
import { HolonetNotificationService } from './subsystems/holonet-notification-service.js';
import { MessengerNotificationBridge } from './subsystems/messenger-notification-bridge.js';
import { MessengerMaintenanceService } from './subsystems/messenger-maintenance-service.js';
import { HolonetIntelService } from './subsystems/holonet-intel-service.js';
import { HolonetDecryptionService } from './subsystems/holonet-decryption-service.js';
import { HolonetFeedService } from './subsystems/holonet-feed-service.js';
import { HolonetSocketService } from './subsystems/holonet-socket-service.js';
import { HolonetBus } from './subsystems/holonet-bus.js';
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

  /**
   * PHASE 8A: `skipSocket` now has one consistent meaning end-to-end — not
   * only "a non-GM caller relays through the GM instead of writing
   * directly" but also, for the GM-authoritative path itself, "this
   * publication occurrence should not independently broadcast a remote
   * record-published sync" (a caller that already knows another
   * mechanism owns the remote refresh for this workflow — e.g. Messenger
   * threads, or a caller relaying a manually-correlated sync itself —
   * passes skipSocket:true). This is additive to the flag's existing
   * name/intent, not a redefinition: previously `skipSocket` on a GM
   * caller was silently ignored past the relay-gate check, which is
   * exactly why direct GM publication never broadcast at all (the
   * original Phase 8A bug).
   */
  static async publish(record, { skipSocket = false, suppressLocalHook = false, requestId = null, requesterId = null } = {}) {
    if (!record) return false;
    if (!game.user?.isGM && !skipSocket) {
      HolonetSocketService.emitRequest('publish-record', { record: record.toJSON?.() ?? record });
      return true;
    }
    return this._publishAsGm(record, { suppressLocalHook, skipSocket, requestId, requesterId });
  }

  /**
   * @private — GM-side publish pipeline broken into explicit phases.
   * PHASE 8A: a publication must never be announced (local hook or
   * remote sync) until durable storage genuinely confirms the write —
   * previously the boolean HolonetStorage.saveRecord() failure result
   * was awaited but discarded, so a rejected save could still be
   * reported as a successful publish.
   */
  static async _publishAsGm(record, { suppressLocalHook = false, skipSocket = false, requestId = null, requesterId = null } = {}) {
    try {
      this.prepareRecordForPublish(record);
      const saved = await this._persistRecord(record);
      if (!saved) {
        console.error('[Holonet] Failed to publish record: storage write did not succeed.', record?.id);
        return false;
      }
      this.emitPreparedRecordPublished(record, { suppressLocalHook, skipSocket, requestId, requesterId });
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

  /**
   * Emit local notifications/hooks (and, unless skipSocket, a remote
   * record-published sync) after a prepared record is durably persisted.
   *
   * PHASE 8A: `skipSocket` DEFAULTS TO TRUE HERE — the opposite of
   * publish()'s own default — because this method is also called
   * directly by HolonetThreadService.publishMessageToThread() with no
   * options at all, for the specialized message/thread envelope (see
   * that file and section J of the Phase 8A spec: Messenger's remote
   * refresh path is intentionally NOT generalized through this generic
   * record-published sync in this pass, to avoid a duplicate/render-
   * storm risk on top of its own thread-updated hooks). _publishAsGm()
   * always passes skipSocket explicitly, so the generic GM-direct-
   * publish path is unaffected by this default.
   *
   * Returns the publicationEventId identifying this publication
   * OCCURRENCE (never the record id — the same record may legitimately
   * be republished later as a distinct occurrence).
   *
   * PHASE 8A CORRECTION PASS (C2): builds ONE canonical publication-
   * occurrence envelope after persistence succeeds — `type`,
   * `publicationEventId`, `recordId`, `recipientIds`, `requestId`,
   * `requesterId` — and both local and remote dispatch derive from that
   * SAME object. `syncExtra` (caller-supplied additive provenance, e.g.
   * Intel's `source`/`intelId`) is spread FIRST so the reserved fields
   * always win — a caller can never overwrite what actually happened.
   * The local hook keeps ONE additive, local-only compatibility field
   * (`recipients`, full recipient objects, never sent over the wire) —
   * local and remote payloads are NOT byte-identical, but both are
   * built from the one canonical envelope, not two independently
   * constructed objects.
   */
  static emitPreparedRecordPublished(record, { suppressLocalHook = false, skipSocket = true, requestId = null, requesterId = null, syncExtra = {} } = {}) {
    const publicationEventId = foundry.utils.randomID();
    const recipientIds = record.recipients?.map(r => r.id) ?? [];
    const canonicalEnvelope = {
      ...syncExtra,
      // Reserved, authority-owned fields — always applied AFTER
      // syncExtra so caller-supplied data can never redefine them.
      type: 'record-published',
      publicationEventId,
      recordId: record.id,
      recipientIds,
      requestId,
      requesterId
    };
    if (!suppressLocalHook) {
      this._notifyLocalRecipient(record);
      this._emitPublished(record, canonicalEnvelope);
    }
    if (!skipSocket) {
      HolonetBus.sync(canonicalEnvelope);
    }
    return publicationEventId;
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

  /**
   * @private — Persist to storage. PHASE 8A: returns the real boolean
   * result — HolonetStorage.saveRecord() returns false on a rejected
   * write, and callers must not announce a publication that storage
   * never actually confirmed.
   */
  static async _persistRecord(record) {
    return HolonetStorage.saveRecord(record);
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

  /**
   * @private — Fire local hooks so UI can react without waiting for
   * socket sync. PHASE 8A: routed through HolonetBus.emitLocal() (the
   * project's documented local/socket facade) instead of two separate
   * raw Hooks.callAll() calls with two different payload shapes.
   *
   * PHASE 8A CORRECTION PASS (C2): `canonicalEnvelope` is the SAME
   * object emitPreparedRecordPublished() also broadcasts remotely (when
   * not skipSocket) — this is no longer an independently constructed
   * local payload. `recipients` (full recipient objects) is added ON
   * TOP as a documented LOCAL-ONLY compatibility field for
   * `swseHolonet:recordPublished`'s existing listeners; it is never
   * sent over the wire. Local and remote payloads are therefore NOT
   * byte-identical, but both derive from one canonical envelope rather
   * than two separately-built ones. Every existing consumer
   * (scripts/chat/holonet-chat-card.js reads only `recordId`) keeps
   * working unchanged.
   */
  static _emitPublished(record, canonicalEnvelope) {
    HolonetBus.emitLocal('recordPublished', { ...canonicalEnvelope, recipients: record.recipients });
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
  static get intel() { return HolonetIntelService; }
  static get decryption() { return HolonetDecryptionService; }

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
