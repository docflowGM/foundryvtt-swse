/**
 * Holonet Delivery State Contract
 *
 * Tracks delivery metadata for a specific recipient
 */

import { DELIVERY_STATE } from './enums.js';

export class HolonetDeliveryState {
  constructor(data = {}) {
    this.recipientId = data.recipientId ?? null;
    this.state = data.state ?? DELIVERY_STATE.DRAFT;
    this.deliveredAt = data.deliveredAt ?? null;
    this.readAt = data.readAt ?? null;
    this.dismissedAt = data.dismissedAt ?? null;
    this.failureReason = data.failureReason ?? null;
    this.metadata = data.metadata ?? {};
  }

  toJSON() {
    return {
      recipientId: this.recipientId,
      state: this.state,
      deliveredAt: this.deliveredAt,
      readAt: this.readAt,
      dismissedAt: this.dismissedAt,
      failureReason: this.failureReason,
      metadata: this.metadata
    };
  }
}
