// scripts/engine/import/droid-template-importer-engine.js
/**
 * Droid Template Importer Engine
 * Handles the import logic for droid templates from the droids compendium pack
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { DroidTemplateDataLoader } from "/systems/foundryvtt-swse/scripts/core/droid-template-data-loader.js";

export class DroidTemplateImporterEngine {
  /**
   * Import a Droid template from the compendium
   * @param {string} droidId - Droid ID in the droids pack
   * @param {Object|null} customData - Optional custom data (name, portrait, notes, biography)
   * @returns {Promise<Object|null>} Created actor document or null on failure
   */
  static async importDroidTemplate(droidId, customData = null) {
    try {
      SWSELogger.log(`[DroidTemplateImporterEngine] Importing droid template: ${droidId}`);

      // Get the droid actor document from the droids pack
      const actorData = await DroidTemplateDataLoader.getDroidActorDocument(droidId);
      if (!actorData) {
        SWSELogger.error(`[DroidTemplateImporterEngine] Droid actor not found: ${droidId}`);
        return null;
      }

      // Clone the data to avoid modifying the compendium
      const newActorData = foundry.utils.deepClone(actorData);

      // Ensure type is droid
      newActorData.type = 'droid';

      // Apply custom data if provided
      if (customData) {
        newActorData.name = customData.name || newActorData.name;
        newActorData.img = customData.portrait || newActorData.img;
        if (newActorData.prototypeToken) {
          newActorData.prototypeToken.img = customData.portrait || newActorData.prototypeToken.img;
        }
      }

      // PHASE 2: Include biography in initial actor creation data
      // This avoids post-creation direct mutations
      if (customData && (customData.notes || customData.biography)) {
        const biographyText = [customData.notes, customData.biography]
          .filter(t => t && t.trim())
          .join('\n\n');
        if (biographyText) {
          newActorData.system.biography = biographyText;
        }
      }

      // Create the actor in the world (includes biography in initial data)
      const actor = await Actor.create(newActorData);

      SWSELogger.log(`[DroidTemplateImporterEngine] Droid imported successfully: ${actor.name} (${actor.id})`);

      return actor;
    } catch (err) {
      SWSELogger.error(`[DroidTemplateImporterEngine] Error importing droid template:`, err);
      return null;
    }
  }
}

export default DroidTemplateImporterEngine;
