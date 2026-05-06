/**
 * Holonet Feed Service
 *
 * Manages feed projection surfaces (Home feed, etc.)
 * Skeleton-only in Phase 1 - no full UI hydration yet.
 */

import { SURFACE_TYPE, DELIVERY_STATE } from '../contracts/enums.js';
import { HolonetStorage } from './holonet-storage.js';
import { HolonetProjectionRouter } from './holonet-projection-router.js';

export class HolonetFeedService {
  /**
   * Get feed for a recipient
   */
  static async getFeedForRecipient(recipientId, surfaceType = SURFACE_TYPE.HOME_FEED, limit = 50) {
    // Phase 3: Use index-backed method for better performance
    const records = await HolonetStorage.getRecordsByRecipient(
      recipientId,
      [DELIVERY_STATE.PUBLISHED]
    );

    return records
      .filter(r => r.projections?.some(p => p.surfaceType === surfaceType))
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt))
      .slice(0, limit);
  }

  /**
   * Add record to feed
   */
  static async addToFeed(record, recipientId, surfaceType = SURFACE_TYPE.HOME_FEED) {
    HolonetProjectionRouter.addToSurface(record, surfaceType);
    await HolonetStorage.saveRecord(record);
  }

  /**
   * Remove record from feed
   */
  static async removeFromFeed(recordId, surfaceType = SURFACE_TYPE.HOME_FEED) {
    const record = await HolonetStorage.getRecord(recordId);
    if (!record) return false;

    HolonetProjectionRouter.removeFromSurface(record, surfaceType);
    await HolonetStorage.saveRecord(record);
    return true;
  }

  /**
   * Get featured items for a recipient.
   * Pinned items are sorted first, but non-pinned featured items are still eligible.
   */
  static async getFeaturedItemsForRecipient(recipientId, surfaceType = SURFACE_TYPE.BULLETIN_FEATURED, limit = 10) {
    // Phase 3: Use index-backed method for better performance
    const records = recipientId
      ? await HolonetStorage.getRecordsByRecipient(recipientId, [DELIVERY_STATE.PUBLISHED])
      : await HolonetStorage.getAllRecords();

    return records
      .filter(r => r.projections?.some(p => p.surfaceType === surfaceType))
      .sort((a, b) => {
        const aPinned = a.projections?.some(p => p.surfaceType === surfaceType && p.isPinned) ? 1 : 0;
        const bPinned = b.projections?.some(p => p.surfaceType === surfaceType && p.isPinned) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0);
      })
      .slice(0, limit);
  }

  /**
   * Get featured/pinned items globally.
   */
  static async getFeaturedItems(surfaceType = SURFACE_TYPE.BULLETIN_FEATURED) {
    return this.getFeaturedItemsForRecipient(null, surfaceType);
  }

  /**
   * Pin item to surface
   */
  static async pinItem(recordId, surfaceType) {
    const record = await HolonetStorage.getRecord(recordId);
    if (!record) return false;

    HolonetProjectionRouter.setPinned(record, surfaceType, true);
    await HolonetStorage.saveRecord(record);
    return true;
  }

  /**
   * Unpin item from surface
   */
  static async unpinItem(recordId, surfaceType) {
    const record = await HolonetStorage.getRecord(recordId);
    if (!record) return false;

    HolonetProjectionRouter.setPinned(record, surfaceType, false);
    await HolonetStorage.saveRecord(record);
    return true;
  }
}
