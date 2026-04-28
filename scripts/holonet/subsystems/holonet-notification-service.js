/**
 * Holonet Notification Service
 *
 * Handles notification delivery to UI (notifications, badges, etc.)
 * Skeleton-only in Phase 1.
 */

export class HolonetNotificationService {
  /**
   * Send a UI notification
   */
  static notify(record) {
    if (!record) return;

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
      case 'info':
      default:
        ui.notifications?.info?.(message);
        break;
    }
  }

  /**
   * Send a badge notification (skeleton)
   * Future: integrate with player home/datapad
   */
  static async badge(recipientId, record) {
    // Skeleton: just log for now
    console.log(`[Holonet Badge] ${recipientId}:`, record.title);
  }

  /**
   * Send a bubble notification (skeleton)
   * Future: integrate with notification center
   */
  static async bubble(record) {
    // Skeleton: use ui.notifications for now
    this.notify(record);
  }

  /**
   * Queue notification for batching
   */
  static async queue(record) {
    // Skeleton: process immediately
    this.notify(record);
  }
}
