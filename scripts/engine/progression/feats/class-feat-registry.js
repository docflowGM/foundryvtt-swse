/**
 * Class Feat Registry - Phase 1.5
 *
 * Derives allowed bonus feats for each class from compendium metadata.
 * Single source of truth: feats.system.bonus_feat_for contains class IDs.
 * This registry builds caches to avoid scanning compendium repeatedly.
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class ClassFeatRegistry {
  // Cache: classId → [feat IDs]
  static _bonusFeatsCache = new Map();

  // Cache: all feats from compendium (loaded once)
  static _featsLoaded = false;
  static _allFeatsData = [];

  /**
   * Get all allowed bonus feats for a given class ID
   * @param {string} classId - Class ID (16-char Foundry ID)
   * @returns {Promise<Array<string>>} Array of feat IDs allowed for this class bonus
   */
  static async getClassBonusFeats(classId) {
    if (!classId) {
      return [];
    }

    // Check cache first
    if (this._bonusFeatsCache.has(classId)) {
      return this._bonusFeatsCache.get(classId);
    }

    // Load feats if not already loaded
    if (!this._featsLoaded) {
      await this._loadFeatsCache();
    }

    // Find feats where bonus_feat_for includes this classId
    const bonusFeats = this._allFeatsData
      .filter(feat => {
        const bonusFor = feat.system?.bonus_feat_for || [];
        return Array.isArray(bonusFor) && bonusFor.includes(classId);
      })
      .map(feat => feat._id);

    // Cache result
    this._bonusFeatsCache.set(classId, bonusFeats);

    SWSELogger.log(
      `[ClassFeatRegistry] Found ${bonusFeats.length} bonus feats for class ${classId}`
    );

    return bonusFeats;
  }

  /**
   * Check if a feat is allowed for a class bonus slot
   * @param {string} featId - Feat ID to check
   * @param {string} classId - Class ID
   * @returns {Promise<boolean>} True if feat is allowed
   */
  static async isFeatsAllowedForClass(featId, classId) {
    const allowed = await this.getClassBonusFeats(classId);
    return allowed.includes(featId);
  }

  /**
   * Load and cache all feats from compendium
   * @private
   */
  static async _loadFeatsCache() {
    try {
      const featPack = game.packs.get('foundryvtt-swse.feats');
      if (!featPack) {
        SWSELogger.warn('[ClassFeatRegistry] Feats compendium not found');
        this._featsLoaded = true;
        return;
      }

      const feats = await featPack.getDocuments();
      this._allFeatsData = feats.map(f => f.toObject());
      this._featsLoaded = true;

      SWSELogger.log(
        `[ClassFeatRegistry] Loaded ${this._allFeatsData.length} feats from compendium`
      );
    } catch (err) {
      SWSELogger.error('[ClassFeatRegistry] Failed to load feats cache:', err);
      this._featsLoaded = true;
    }
  }

  /**
   * Clear caches (useful for testing or after compendium updates)
   * @static
   */
  static clearCaches() {
    this._bonusFeatsCache.clear();
    this._featsLoaded = false;
    this._allFeatsData = [];
    SWSELogger.log('[ClassFeatRegistry] Caches cleared');
  }
}

export default ClassFeatRegistry;
