/**
 * Base Holonet Record
 *
 * Canonical shape for all communication records in Holonet.
 */

import { RECORD_TYPE, DELIVERY_STATE, INTENT_TYPE } from './enums.js';

export class HolonetRecord {
  constructor(data = {}) {
    this.id = data.id ?? foundry.utils.randomID();
    this.type = data.type ?? RECORD_TYPE.MESSAGE;
    this.intent = data.intent ?? INTENT_TYPE.SYSTEM_NEW_MESSAGE;
    this.sender = data.sender ?? null;
    this.audience = data.audience ?? null;
    this.recipients = data.recipients ?? [];
    this.title = data.title ?? null;
    this.body = data.body ?? null;
    this.metadata = data.metadata ?? {};
    this.state = data.state ?? DELIVERY_STATE.DRAFT;
    this.publishedAt = data.publishedAt ?? null;
    this.archivedAt = data.archivedAt ?? null;
    this.sourceFamily = data.sourceFamily ?? null;
    this.sourceId = data.sourceId ?? null;
    this.createdAt = data.createdAt ?? new Date().toISOString();
    this.updatedAt = data.updatedAt ?? new Date().toISOString();
    this.deliveryStates = data.deliveryStates instanceof Map ? data.deliveryStates : new Map(Object.entries(data.deliveryStates ?? {}));
    this.projections = data.projections ?? [];
    this.threadId = data.threadId ?? null;
    this.parentRecordId = data.parentRecordId ?? null;
    this.threadContext = data.threadContext ?? null;
  }

  publish() {
    this.state = DELIVERY_STATE.PUBLISHED;
    this.publishedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    return this;
  }

  archive() {
    this.state = DELIVERY_STATE.ARCHIVED;
    this.archivedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    return this;
  }

  setDeliveryState(recipientId, state, timestamp = null) {
    const current = this.deliveryStates.get(recipientId) ?? {};
    this.deliveryStates.set(recipientId, {
      ...current,
      state,
      deliveredAt: current.deliveredAt ?? timestamp ?? new Date().toISOString()
    });
    this.updatedAt = new Date().toISOString();
  }

  markRead(recipientId, timestamp = null) {
    const current = this.deliveryStates.get(recipientId) ?? {};
    this.deliveryStates.set(recipientId, {
      ...current,
      state: current.state ?? DELIVERY_STATE.DELIVERED,
      readAt: timestamp ?? new Date().toISOString()
    });
    this.updatedAt = new Date().toISOString();
  }

  markUnread(recipientId) {
    const current = this.deliveryStates.get(recipientId) ?? {};
    this.deliveryStates.set(recipientId, {
      ...current,
      readAt: null
    });
    this.updatedAt = new Date().toISOString();
  }

  isReadBy(recipientId) {
    const current = this.deliveryStates.get(recipientId);
    return Boolean(current?.readAt);
  }

  isUnreadBy(recipientId) {
    const recipient = this.recipients?.find(r => r.id === recipientId);
    if (!recipient) return false;
    return !this.isReadBy(recipientId);
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      intent: this.intent,
      sender: this.sender,
      audience: this.audience,
      recipients: this.recipients,
      title: this.title,
      body: this.body,
      metadata: this.metadata,
      state: this.state,
      publishedAt: this.publishedAt,
      archivedAt: this.archivedAt,
      sourceFamily: this.sourceFamily,
      sourceId: this.sourceId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deliveryStates: Object.fromEntries(this.deliveryStates),
      projections: this.projections,
      threadId: this.threadId,
      parentRecordId: this.parentRecordId,
      threadContext: this.threadContext
    };
  }

  static fromJSON(json) {
    const data = { ...json };
    data.deliveryStates = new Map(Object.entries(json.deliveryStates ?? {}));
    return new HolonetRecord(data);
  }
}
