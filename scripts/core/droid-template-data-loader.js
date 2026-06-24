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

      // Get index of all documents without loading full data.
      // Some older droid packs contained generated npc-* actor husks next to the
      // richer published statblock record of the same name. Hide those husks so
      // the import wizard cannot select a 10/10/10 default template.
      const index = await pack.getIndex();
      const entries = Array.from(index || []);
      const richNames = new Set(entries
        .filter(entry => !String(entry?._id || entry?.id || '').startsWith('npc-'))
        .map(entry => String(entry?.name || '').trim().toLowerCase())
        .filter(Boolean));
      const templates = [];

      for (const entry of entries) {
        const entryId = entry._id || entry.id;
        const entryNameKey = String(entry.name || '').trim().toLowerCase();
        if (String(entryId || '').startsWith('npc-') && richNames.has(entryNameKey)) continue;
        templates.push({
          category: 'droid',
          id: entryId,
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
