/**
 * Holonet Event Contract
 */

import { HolonetRecord } from './holonet-record.js';
import { RECORD_TYPE } from './enums.js';

export class HolonetEvent extends HolonetRecord {
  constructor(data = {}) {
    data.type = RECORD_TYPE.EVENT;
    super(data);
    this.eventType = data.eventType ?? null;
    this.priority = data.priority ?? 'normal';
    this.expiresAt = data.expiresAt ?? null;
    this.actionUrl = data.actionUrl ?? null;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      eventType: this.eventType,
      priority: this.priority,
      expiresAt: this.expiresAt,
      actionUrl: this.actionUrl
    };
  }
}
