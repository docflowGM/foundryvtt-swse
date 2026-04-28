/**
 * Holonet Notification Contract
 */

import { HolonetRecord } from './holonet-record.js';
import { RECORD_TYPE } from './enums.js';

export class HolonetNotification extends HolonetRecord {
  constructor(data = {}) {
    data.type = RECORD_TYPE.NOTIFICATION;
    super(data);
    this.level = data.level ?? 'info';
    this.icon = data.icon ?? null;
    this.ttl = data.ttl ?? 5000;
    this.actionLabel = data.actionLabel ?? null;
    this.actionUrl = data.actionUrl ?? null;
    this.dismissible = data.dismissible ?? true;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      level: this.level,
      icon: this.icon,
      ttl: this.ttl,
      actionLabel: this.actionLabel,
      actionUrl: this.actionUrl,
      dismissible: this.dismissible
    };
  }
}
