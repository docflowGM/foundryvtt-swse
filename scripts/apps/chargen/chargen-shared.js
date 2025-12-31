// ============================================
// Shared utilities and constants for CharGen
// ============================================

import { SWSELogger } from '../../utils/logger.js';
import { getTalentTrees } from './chargen-property-accessor.js';

/**
 * Singleton cache for compendium data
 * Prevents reloading compendia for each new chargen instance
 */
export class ChargenDataCache {
  static _instance = null;
  static _data = null;
  static _loadPromise = null;

  /**
   * Get cached compendium data or load it
   * @returns {Promise<Object>} Cached compendium data
   */
  static async getData() {
    // Return cached data if available
    if (this._data) {
      SWSELogger.log('ChargenDataCache | Using cached data');
      return this._data;
    }

    // If already loading, wait for that promise
    if (this._loadPromise) {
      SWSELogger.log('ChargenDataCache | Waiting for existing load...');
      return this._loadPromise;
    }

    // Start loading
    SWSELogger.log('ChargenDataCache | Loading compendium data...');
    this._loadPromise = this._loadCompendia();

    try {
      this._data = await this._loadPromise;
      return this._data;
    } finally {
      this._loadPromise = null;
    }
  }

  /**
   * Load compendium data
   * @private
   */
  static async _loadCompendia() {
    const packNames = {
      species: "foundryvtt-swse.species",
      feats: "foundryvtt-swse.feats",
      talents: "foundryvtt-swse.talents",
      classes: "foundryvtt-swse.classes",
      droids: "foundryvtt-swse.droids",
      forcePowers: "foundryvtt-swse.forcepowers"
    };

    const packs = {};
    const errors = [];
    const criticalPacks = ['species', 'classes', 'feats']; // Required for basic chargen
    const missingCritical = [];

    for (const [key, packName] of Object.entries(packNames)) {
      try {
        const pack = game.packs.get(packName);
        if (!pack) {
          SWSELogger.error(`ChargenDataCache | Pack not found: ${packName}`);
          packs[key] = [];
          errors.push(key);
          if (criticalPacks.includes(key)) {
            missingCritical.push(packName);
          }
          continue;
        }
        const docs = await pack.getDocuments();
        packs[key] = docs.map(d => d.toObject());
        SWSELogger.log(`ChargenDataCache | Loaded ${docs.length} items from ${packName}`);
      } catch (err) {
        SWSELogger.error(`ChargenDataCache | Failed to load ${packName}:`, err);
        packs[key] = [];
        errors.push(key);
        if (criticalPacks.includes(key)) {
          missingCritical.push(packName);
        }
      }
    }

    if (errors.length > 0) {
      SWSELogger.warn(`ChargenDataCache | Failed to load: ${errors.join(', ')}`);
    }

    // Block chargen if critical packs are missing
    if (missingCritical.length > 0) {
      const errorMsg = `Character generation cannot continue. Missing critical compendium packs: ${missingCritical.join(', ')}`;
      ui.notifications.error(errorMsg);
      throw new Error(errorMsg);
    }

    return packs;
  }

  /**
   * Invalidate cache (force reload on next access)
   */
  static invalidate() {
    SWSELogger.log('ChargenDataCache | Cache invalidated');
    this._data = null;
    this._loadPromise = null;
  }

  /**
   * Check if cache is populated
   * @returns {boolean}
   */
  static isCached() {
    return this._data !== null;
  }
}

/**
 * Get default skills list
 * @returns {Array} Array of skill objects
 */
export function _getDefaultSkills() {
  return [
    { key: "acrobatics", name: "Acrobatics", ability: "dex", trained: false },
    { key: "climb", name: "Climb", ability: "str", trained: false },
    { key: "deception", name: "Deception", ability: "cha", trained: false },
    { key: "endurance", name: "Endurance", ability: "con", trained: false },
    { key: "gatherInfo", name: "Gather Information", ability: "cha", trained: false },
    { key: "initiative", name: "Initiative", ability: "dex", trained: false },
    { key: "jump", name: "Jump", ability: "str", trained: false },
    { key: "mechanics", name: "Mechanics", ability: "int", trained: false },
    { key: "perception", name: "Perception", ability: "wis", trained: false },
    { key: "persuasion", name: "Persuasion", ability: "cha", trained: false },
    { key: "pilot", name: "Pilot", ability: "dex", trained: false },
    { key: "stealth", name: "Stealth", ability: "dex", trained: false },
    { key: "survival", name: "Survival", ability: "wis", trained: false },
    { key: "swim", name: "Swim", ability: "str", trained: false },
    { key: "treatInjury", name: "Treat Injury", ability: "wis", trained: false },
    { key: "useComputer", name: "Use Computer", ability: "int", trained: false },
    { key: "useTheForce", name: "Use the Force", ability: "cha", trained: false }
  ];
}

/**
 * Get available skills from cache or default
 * @returns {Array} Array of skill objects
 */
export function _getAvailableSkills() {
  return this._skillsJson || this._getDefaultSkills();
}

/**
 * Get available talent trees based on character's selected classes
 * @returns {Array} Array of talent tree names
 */
export function _getAvailableTalentTrees() {
  // If no classes selected, return empty array
  if (!this.characterData.classes || this.characterData.classes.length === 0) {
    return [];
  }

  // If classes compendium isn't loaded, return empty array
  if (!this._packs.classes || this._packs.classes.length === 0) {
    return [];
  }

  // Collect talent trees from all selected classes
  const talentTreesSet = new Set();

  for (const charClass of this.characterData.classes) {
    const classData = this._packs.classes.find(c => c.name === charClass.name);

    if (classData) {
      // Use property accessor to get talent trees
      const trees = getTalentTrees(classData);
      for (const tree of trees) {
        talentTreesSet.add(tree);
      }
    }
  }

  // Convert Set to Array and return sorted
  return Array.from(talentTreesSet).sort();
}
