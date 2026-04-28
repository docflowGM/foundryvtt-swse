/**
 * Holonet Notification Contract
 *
 * Transient notification/badge/alert (store transaction, approval result, etc.)
 */

import { HolonetRecord } from './holonet-record.js';
import { RECORD_TYPE } from './enums.js';

export class HolonetNotification extends HolonetRecord {
  constructor(data = {}) {
    data.type = RECORD_TYPE.NOTIFICATION;
    super(data);

    // Notification-specific
    this.level = data.level ?? 'info'; // 'info', 'success', 'warning', 'error'
    this.icon = data.icon ?? null;
    this.ttl = data.ttl ?? 5000; // Time to live in ms
    this.actionLabel = data.actionLabel ?? null; // e.g. "Approve", "View", "Dismiss"
    this.actionUrl = data.actionUrl ?? null; // URL for the action
    this.dismissible = data.dismissible ?? true;
  }
}
