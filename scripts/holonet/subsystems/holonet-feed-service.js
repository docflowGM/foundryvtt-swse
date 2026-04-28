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
    const records = await HolonetStorage.getRecordsForRecipient(
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
   * Get featured/pinned items
   */
  static async getFeaturedItems(surfaceType = SURFACE_TYPE.BULLETIN_FEATURED) {
    const records = await HolonetStorage.getAllRecords();
    return records
      .filter(r => r.projections?.some(p => p.surfaceType === surfaceType && p.isPinned))
      .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
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
