// scripts/engine/import/droid-template-importer-engine.js
/**
 * Droid Template Importer Engine
 * Routes droid imports to appropriate backend based on source type.
 *
 * Phase 1: Routes stock droids (from packs/droids.db) through StockDroidImporterEngine
 * Future: Can route custom/editor-created templates through other paths if needed
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { StockDroidImporterEngine } from "/systems/foundryvtt-swse/scripts/engine/import/stock-droid-importer-engine.js";

export class DroidTemplateImporterEngine {
  /**
   * Import a Droid template from the compendium
   * Routes to appropriate importer based on source type.
   * Phase 1: All droids route through StockDroidImporterEngine (statblock mode)
   *
   * @param {string} droidId - Droid ID in the droids pack
   * @param {Object|null} customData - Optional custom data (name, portrait, notes, biography)
   * @returns {Promise<Object|null>} Created actor document or null on failure
   */
  static async importDroidTemplate(droidId, customData = null) {
    try {
      SWSELogger.log(`[DroidTemplateImporterEngine] Routing droid import: ${droidId}`);

      // Phase 1: All droids from packs/droids.db are stock statblock imports
      // Future: Add detection logic here to route custom templates differently if needed
      const actor = await StockDroidImporterEngine.importDroidTemplate(droidId, customData);

      if (actor) {
        SWSELogger.log(`[DroidTemplateImporterEngine] Droid import successful via StockDroidImporterEngine`);
      }

      return actor;
    } catch (err) {
      SWSELogger.error(`[DroidTemplateImporterEngine] Error importing droid template:`, err);
      return null;
    }
  }
}

export default DroidTemplateImporterEngine;
