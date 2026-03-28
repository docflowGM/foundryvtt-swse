// scripts/core/npc-template-data-loader.js
/**
 * NPC Template Data Loader
 * Loads Beast templates from compendium and Nonheroic/Heroic templates from JSON files
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class NPCTemplateDataLoader {
  /**
   * Load Beast templates from the beasts compendium pack
   * @returns {Promise<Array>} Array of beast template objects
   */
  static async loadBeastTemplates() {
    try {
      const pack = game.packs.get('foundryvtt-swse.beasts');
      if (!pack) {
        SWSELogger.warn('[NPCTemplateDataLoader] Beasts pack not found');
        return [];
      }

      // Get index of all documents without loading full data
      const index = await pack.getIndex();
      const templates = [];

      for (const entry of index) {
        templates.push({
          category: 'beast',
          id: entry._id,
          name: entry.name,
          packName: 'foundryvtt-swse.beasts',
          portrait: entry.img || 'systems/foundryvtt-swse/assets/token-default.png',
          metadata: {
            type: entry.type || 'npc',
            source: 'compendium'
          }
        });
      }

      SWSELogger.log(`[NPCTemplateDataLoader] Loaded ${templates.length} beast templates`);
      return templates;
    } catch (err) {
      SWSELogger.error('[NPCTemplateDataLoader] Error loading beast templates:', err);
      return [];
    }
  }

  /**
   * Load Nonheroic NPC templates from JSON data
   * @returns {Promise<Array>} Array of nonheroic template objects
   */
  static async loadNonheroicTemplates() {
    try {
      const response = await fetch('systems/foundryvtt-swse/data/nonheroic.json');
      if (!response.ok) {
        SWSELogger.warn(`[NPCTemplateDataLoader] Failed to load nonheroic.json (${response.status})`);
        return [];
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        SWSELogger.warn('[NPCTemplateDataLoader] Nonheroic data is not an array');
        return [];
      }

      const templates = data.map((entry, index) => ({
        category: 'nonheroic',
        id: `nonheroic-${index}`,
        name: entry.Name || entry.name || `Nonheroic NPC ${index}`,
        sourceData: entry,
        packName: null,
        portrait: entry.portrait || 'systems/foundryvtt-swse/assets/token-default.png',
        metadata: {
          type: 'npc',
          source: 'json',
          classLevels: entry['Class Levels'] || {},
          species: entry.Species || 'Unknown'
        }
      }));

      SWSELogger.log(`[NPCTemplateDataLoader] Loaded ${templates.length} nonheroic templates`);
      return templates;
    } catch (err) {
      SWSELogger.error('[NPCTemplateDataLoader] Error loading nonheroic templates:', err);
      return [];
    }
  }

  /**
   * Load Heroic NPC templates from JSON data
   * @returns {Promise<Array>} Array of heroic template objects
   */
  static async loadHeroicTemplates() {
    try {
      const response = await fetch('systems/foundryvtt-swse/data/heroic.json');
      if (!response.ok) {
        SWSELogger.warn(`[NPCTemplateDataLoader] Failed to load heroic.json (${response.status})`);
        return [];
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        SWSELogger.warn('[NPCTemplateDataLoader] Heroic data is not an array');
        return [];
      }

      const templates = data.map((entry, index) => ({
        category: 'heroic',
        id: `heroic-${index}`,
        name: entry.Name || entry.name || `Heroic NPC ${index}`,
        sourceData: entry,
        packName: null,
        portrait: entry.portrait || 'systems/foundryvtt-swse/assets/token-default.png',
        metadata: {
          type: 'npc',
          source: 'json',
          classLevels: entry['Class Levels'] || {},
          species: entry.Species || 'Unknown'
        }
      }));

      SWSELogger.log(`[NPCTemplateDataLoader] Loaded ${templates.length} heroic templates`);
      return templates;
    } catch (err) {
      SWSELogger.error('[NPCTemplateDataLoader] Error loading heroic templates:', err);
      return [];
    }
  }

  /**
   * Load templates for a specific category
   * @param {string} category - 'beast', 'nonheroic', or 'heroic'
   * @returns {Promise<Array>} Array of template objects
   */
  static async loadTemplatesByCategory(category) {
    switch (category.toLowerCase()) {
      case 'beast':
        return this.loadBeastTemplates();
      case 'nonheroic':
        return this.loadNonheroicTemplates();
      case 'heroic':
        return this.loadHeroicTemplates();
      default:
        SWSELogger.warn(`[NPCTemplateDataLoader] Unknown category: ${category}`);
        return [];
    }
  }

  /**
   * Load a specific template by category and ID
   * @param {string} category - Template category
   * @param {string} templateId - Template ID
   * @returns {Promise<Object|null>} Template object or null if not found
   */
  static async loadTemplateById(category, templateId) {
    const templates = await this.loadTemplatesByCategory(category);
    return templates.find(t => t.id === templateId) || null;
  }

  /**
   * Get actor document from a Beast template (direct load from pack)
   * @param {string} actorId - Actor ID in the beasts pack
   * @returns {Promise<Object|null>} Actor document or null
   */
  static async getBeastActorDocument(actorId) {
    try {
      const pack = game.packs.get('foundryvtt-swse.beasts');
      if (!pack) return null;

      const doc = await pack.getDocument(actorId);
      return doc ? doc.toObject() : null;
    } catch (err) {
      SWSELogger.error(`[NPCTemplateDataLoader] Error getting beast actor ${actorId}:`, err);
      return null;
    }
  }
}

export default NPCTemplateDataLoader;
