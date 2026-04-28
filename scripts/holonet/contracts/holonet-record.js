/**
 * Base Holonet Record
 *
 * Canonical shape for all communication records in Holonet.
 * All records inherit from this contract.
 */

import { RECORD_TYPE, DELIVERY_STATE, INTENT_TYPE } from './enums.js';

export class HolonetRecord {
  constructor(data = {}) {
    // Identity
    this.id = data.id ?? foundry.utils.randomID();
    this.type = data.type ?? RECORD_TYPE.MESSAGE;
    this.intent = data.intent ?? INTENT_TYPE.SYSTEM_NEW_MESSAGE;

    // Sender/Persona
    this.sender = data.sender ?? null;

    // Audience/Recipients
    this.audience = data.audience ?? null;
    this.recipients = data.recipients ?? [];

    // Content
    this.title = data.title ?? null;
    this.body = data.body ?? null;
    this.metadata = data.metadata ?? {};

    // Lifecycle
    this.state = data.state ?? DELIVERY_STATE.DRAFT;
    this.publishedAt = data.publishedAt ?? null;
    this.archivedAt = data.archivedAt ?? null;

    // Source tracking
    this.sourceFamily = data.sourceFamily ?? null;
    this.sourceId = data.sourceId ?? null; // ID in source system (e.g., store transaction ID)

    // Timing
    this.createdAt = data.createdAt ?? new Date().toISOString();
    this.updatedAt = data.updatedAt ?? new Date().toISOString();

    // Delivery metadata
    this.deliveryStates = data.deliveryStates ?? new Map(); // recipient.id → { state, deliveredAt, readAt }
    this.projections = data.projections ?? []; // { surface, metadata }

    // Thread association (if part of a thread)
    this.threadId = data.threadId ?? null;
    this.parentRecordId = data.parentRecordId ?? null;

    // Optional: thread context
    this.threadContext = data.threadContext ?? null;
  }

  /**
   * Publish this record
   */
  publish() {
    this.state = DELIVERY_STATE.PUBLISHED;
    this.publishedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Archive this record
   */
  archive() {
    this.state = DELIVERY_STATE.ARCHIVED;
    this.archivedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Set delivery state for a recipient
   */
  setDeliveryState(recipientId, state, timestamp = null) {
    if (!this.deliveryStates) {
      this.deliveryStates = new Map();
    }
    const current = this.deliveryStates.get(recipientId) ?? {};
    this.deliveryStates.set(recipientId, {
      ...current,
      state,
      deliveredAt: current.deliveredAt ?? timestamp ?? new Date().toISOString()
    });
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Mark record as read by a recipient
   */
  markRead(recipientId, timestamp = null) {
    if (!this.deliveryStates) {
      this.deliveryStates = new Map();
    }
    const current = this.deliveryStates.get(recipientId) ?? {};
    this.deliveryStates.set(recipientId, {
      ...current,
      readAt: timestamp ?? new Date().toISOString()
    });
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Serialize to JSON-friendly format
   */
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
      deliveryStates: this.deliveryStates ? Object.fromEntries(this.deliveryStates) : {},
      projections: this.projections,
      threadId: this.threadId,
      parentRecordId: this.parentRecordId,
      threadContext: this.threadContext
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(json) {
    const data = { ...json };
    if (json.deliveryStates) {
      data.deliveryStates = new Map(Object.entries(json.deliveryStates));
    }
    return new HolonetRecord(data);
  }
}
