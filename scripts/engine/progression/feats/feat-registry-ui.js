/**
 * Feat Registry - UI version
 * Loads and indexes feats with prerequisite validation
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { PrerequisiteChecker } from "/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js";

export const FeatRegistry = {
  _feats: [],

  /**
   * Build the registry from compendium
   */
  async build() {
    try {
      const pack = game.packs.get('foundryvtt-swse.feats');
      if (!pack) {
        SWSELogger.warn("Feats compendium 'foundryvtt-swse.feats' not found");
        this._feats = [];
        return;
      }

      this._feats = await pack.getDocuments();
      SWSELogger.log(`FeatRegistry built: ${this._feats.length} feats loaded`);
    } catch (err) {
      SWSELogger.error('Failed to build FeatRegistry:', err);
      this._feats = [];
    }
  },

  /**
   * Get all feats available for an actor
   */
  async listAvailable(actor, pending = {}) {
    return this._feats.map(f => {
      let valid = true;
      try {
        const result = PrerequisiteChecker.checkFeatPrerequisites(actor, f, pending);
        valid = result.met;
      } catch (err) {
        SWSELogger.warn(`Prerequisite check failed for ${f.name}:`, err);
        valid = false;
      }

      return {
        name: f.name,
        id: f.id,
        isQualified: valid,
        data: f
      };
    });
  },

  /**
   * Get a specific feat by name
   */
  get(name) {
    const lower = name.toLowerCase();
    return this._feats.find(f => f.name.toLowerCase() === lower);
  },

  /**
   * Get all feats
   */
  list() {
    return this._feats;
  },

  /**
   * Get only bonus-feat-eligible feats
   */
  getBonusFeats() {
    return this._feats.filter(f => {
      const type = f.system.type || '';
      return type.includes('bonus') || type === 'feat';
    });
  },

  /**
   * Check if a feat can be taken as a bonus feat for a class
   */
  canBeBonusFeatFor(featName, className) {
    const feat = this.get(featName);
    if (!feat) {return false;}
    // Most feats can be taken as bonus feats, so default to true
    return true;
  },

  /**
   * Clear the registry
   */
  clear() {
    this._feats = [];
  }
};

SWSELogger.log('FeatRegistry (UI) module loaded');
