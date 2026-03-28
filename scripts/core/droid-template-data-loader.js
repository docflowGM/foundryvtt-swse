// scripts/core/droid-template-data-loader.js
/**
 * Droid Template Data Loader
 * Loads droid actor templates from the droids compendium pack
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class DroidTemplateDataLoader {
  /**
   * Load Droid templates from the droids compendium pack
   * @returns {Promise<Array>} Array of droid template objects
   */
  static async loadDroidTemplates() {
    try {
      const pack = game.packs.get('foundryvtt-swse.droids');
      if (!pack) {
        SWSELogger.warn('[DroidTemplateDataLoader] Droids pack not found');
        return [];
      }

      // Get index of all documents without loading full data
      const index = await pack.getIndex();
      const templates = [];

      for (const entry of index) {
        templates.push({
          category: 'droid',
          id: entry._id,
          name: entry.name,
          packName: 'foundryvtt-swse.droids',
          portrait: entry.img || 'systems/foundryvtt-swse/assets/token-default.png',
          metadata: {
            type: entry.type || 'droid',
            source: 'compendium'
          }
        });
      }

      SWSELogger.log(`[DroidTemplateDataLoader] Loaded ${templates.length} droid templates`);
      return templates;
    } catch (err) {
      SWSELogger.error('[DroidTemplateDataLoader] Error loading droid templates:', err);
      return [];
    }
  }

  /**
   * Get a droid actor document from the pack
   * @param {string} droidId - Actor ID in the droids pack
   * @returns {Promise<Object|null>} Actor document or null
   */
  static async getDroidActorDocument(droidId) {
    try {
      const pack = game.packs.get('foundryvtt-swse.droids');
      if (!pack) return null;

      const doc = await pack.getDocument(droidId);
      return doc ? doc.toObject() : null;
    } catch (err) {
      SWSELogger.error(`[DroidTemplateDataLoader] Error getting droid actor ${droidId}:`, err);
      return null;
    }
  }
}

export default DroidTemplateDataLoader;
