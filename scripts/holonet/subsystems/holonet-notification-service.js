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

  /**
   * Display a toast notification for a record.
   * Alias for notify() with a clearer intent-signalling name.
   *
   * @param {HolonetRecord} record
   */
  static toast(record) {
    this.notify(record);
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
