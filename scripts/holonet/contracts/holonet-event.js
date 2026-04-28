/**
 * Holonet Event Contract
 *
 * Represents a system/campaign event published to party/players
 * (level-up available, bulletin event, story unlock, etc.)
 */

import { HolonetRecord } from './holonet-record.js';
import { RECORD_TYPE } from './enums.js';

export class HolonetEvent extends HolonetRecord {
  constructor(data = {}) {
    data.type = RECORD_TYPE.EVENT;
    super(data);

    // Event-specific
    this.eventType = data.eventType ?? null; // e.g., 'level_up', 'story_unlock', 'objective_update'
    this.priority = data.priority ?? 'normal'; // 'low', 'normal', 'high', 'critical'
    this.expiresAt = data.expiresAt ?? null; // Optional expiration
    this.actionUrl = data.actionUrl ?? null; // Link to take action on event
  }
}
