/**
 * Holonet Notification Service
 */

import { HolonetPreferences } from '../holonet-preferences.js';

export class HolonetNotificationService {
  static notify(record) {
    if (!record) return;
    const categoryId = record.metadata?.categoryId;
    if (categoryId && !HolonetPreferences.shouldDisplay(categoryId)) return;

    const level = record.level ?? 'info';
    const message = record.body ?? record.title ?? 'Notification';

    switch (level) {
      case 'success':
        ui.notifications?.success?.(message);
        break;
      case 'warning':
        ui.notifications?.warn?.(message);
        break;
      case 'error':
        ui.notifications?.error?.(message);
        break;
      default:
        ui.notifications?.info?.(message);
        break;
    }
  }

  static async badge(recipientId, record) {
    console.log(`[Holonet Badge] ${recipientId}:`, record.title);
  }

  static async bubble(record) {
    this.notify(record);
  }

  static async queue(record) {
    this.notify(record);
  }
}
