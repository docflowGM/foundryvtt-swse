// ============================================
// Shared utilities and constants for CharGen
// ============================================

import { SWSELogger } from '../../utils/logger.js';
import { getTalentTrees } from './chargen-property-accessor.js';
import { normalizeTalentData } from '../../progression/utils/item-normalizer.js';
import { normalizeClassData } from '../../progression/utils/class-normalizer.js';

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
    SWSELogger.log(`[CACHE-LOAD] ======== COMPENDIUM LOAD START ========`);
    SWSELogger.log(`[CACHE-LOAD] Checking available packs in game.packs...`);
    SWSELogger.log(`[CACHE-LOAD] Total packs available: ${game.packs.size}`);
    SWSELogger.log(`[CACHE-LOAD] SWSE packs:`, Array.from(game.packs.keys()).filter(k => k.includes('swse') || k.includes('SWSE')));

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
        SWSELogger.log(`[CACHE-LOAD] Loading pack: ${key} = ${packName}`);
        const pack = game.packs.get(packName);

        if (!pack) {
          SWSELogger.error(`[CACHE-LOAD] CRITICAL: Pack not found: ${packName}`);
          SWSELogger.error(`[CACHE-LOAD] Is critical: ${criticalPacks.includes(key)}`);
          packs[key] = [];
          errors.push(key);
          if (criticalPacks.includes(key)) {
            missingCritical.push(packName);
          }
          continue;
        }

        SWSELogger.log(`[CACHE-LOAD] Pack found successfully: ${packName}`);

        // For droids pack (contains actors that may have validation issues), use index-based loading
        if (key === 'droids') {
          SWSELogger.log(`[CACHE-LOAD] Loading droids pack (index-based)...`);
          const index = await pack.getIndex();
          packs[key] = index;
          SWSELogger.log(`[CACHE-LOAD] Loaded ${index.length} droids (index-based) from ${packName}`);
          continue;
        }

        // For all other packs (items), load full documents
        SWSELogger.log(`[CACHE-LOAD] Loading documents from ${packName}...`);
        let docs;
        try {
          docs = await pack.getDocuments();
          SWSELogger.log(`[CACHE-LOAD] Document loading succeeded: ${docs.length} documents found`);
        } catch (docErr) {
          SWSELogger.error(`[CACHE-LOAD] Document loading error for ${packName}:`, docErr);
          SWSELogger.error(`[CACHE-LOAD] Error message: ${docErr.message}`);
          SWSELogger.error(`[CACHE-LOAD] Retrying with index-based loading...`);
          // Retry with index as fallback
          const index = await pack.getIndex();
          packs[key] = index;
          SWSELogger.log(`[CACHE-LOAD] Loaded ${index.length} items (index, fallback) from ${packName}`);
          continue;
        }

        // Convert documents to plain objects for safer data handling
        // CRITICAL: Use toObject() on system data to get plain JS object from DataModel proxy
        SWSELogger.log(`[CACHE-LOAD] Converting ${docs.length} documents to plain objects...`);
        packs[key] = docs.map((d, idx) => {
          try {
            // Convert system DataModel proxy to plain object
            // This ensures properties like hitDie are properly accessible
            const systemData = d.system?.toObject?.() ?? (d.system ? { ...d.system } : {});

            // Create plain object from document, preserving all properties
            const obj = {
              _id: d._id,
              name: d.name,
              type: d.type,
              system: systemData,
              flags: d.flags || {},
              img: d.img,
              data: d.data
            };
            if (idx < 3) { // Log first 3 items for debugging
              SWSELogger.log(`[CACHE-LOAD] Item ${idx + 1}: ${d.name}`, {
                hasSystem: !!systemData,
                systemKeys: Object.keys(systemData),
                hitDie: systemData.hitDie || systemData.hit_die,
                trainedSkills: systemData.trainedSkills,
                classSkills: systemData.classSkills,
                class_skills: systemData.class_skills,
                classSkillsLength: (systemData.classSkills || systemData.class_skills)?.length ?? 'N/A'
              });
            }
            return obj;
          } catch (e) {
            SWSELogger.warn(`[CACHE-LOAD] Error serializing ${d?.name}:`, e);
            // Last resort: create minimal object with spread to copy properties
            const fallbackSystem = d.system?.toObject?.() ?? (d.system ? { ...d.system } : {});
            return {
              _id: d._id,
              name: d.name,
              type: d.type,
              system: fallbackSystem
            };
          }
        });
        SWSELogger.log(`[CACHE-LOAD] Successfully converted ${packs[key].length} items from ${packName}`);

        // Normalize talents to ensure tree property is properly set
        if (key === 'talents') {
          SWSELogger.log(`[CACHE-LOAD] Normalizing ${packs[key].length} talents...`);
          packs[key] = packs[key].map(talent => {
            try {
              return normalizeTalentData(talent);
            } catch (e) {
              SWSELogger.warn(`[CACHE-LOAD] Error normalizing talent "${talent.name}":`, e);
              return talent; // Return unnormalized if normalization fails
            }
          });
          SWSELogger.log(`[CACHE-LOAD] Normalized all talents. Now checking tree property...`);
          // Log first few talents to verify tree property is set
          for (let i = 0; i < Math.min(3, packs[key].length); i++) {
            const t = packs[key][i];
            SWSELogger.log(`[CACHE-LOAD] Talent ${i + 1}: "${t.name}" -> tree="${t.system?.tree || t.system?.talent_tree || 'MISSING'}"`);
          }
        }

        // Normalize classes to ensure classSkills and other properties are properly set
        if (key === 'classes') {
          SWSELogger.log(`[CACHE-LOAD] Normalizing ${packs[key].length} classes...`);
          packs[key] = packs[key].map(classDoc => {
            try {
              return normalizeClassData(classDoc);
            } catch (e) {
              SWSELogger.warn(`[CACHE-LOAD] Error normalizing class "${classDoc.name}":`, e);
              return classDoc; // Return unnormalized if normalization fails
            }
          });
          SWSELogger.log(`[CACHE-LOAD] Normalized all classes. Now checking classSkills property...`);
          // Log first few classes to verify classSkills are properly set
          for (let i = 0; i < Math.min(3, packs[key].length); i++) {
            const c = packs[key][i];
            SWSELogger.log(`[CACHE-LOAD] Class ${i + 1}: "${c.name}" -> classSkills="${c.system?.classSkills?.length || 0} skills"`);
          }
        }
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
      SWSELogger.warn(`[CACHE-LOAD] Failed to load: ${errors.join(', ')}`);
    }

    // Summary of loaded packs
    SWSELogger.log(`[CACHE-LOAD] ======== LOAD SUMMARY ========`);
    for (const [key, packData] of Object.entries(packs)) {
      const count = Array.isArray(packData) ? packData.length : 0;
      SWSELogger.log(`[CACHE-LOAD] ${key}: ${count} items`);
      if (key === 'classes' && count > 0) {
        const classNames = packData.slice(0, 5).map(c => c.name).join(', ');
        SWSELogger.log(`[CACHE-LOAD]   Classes (first 5): ${classNames}${count > 5 ? '...' : ''}`);
      }
    }

    // Block chargen if critical packs are missing
    if (missingCritical.length > 0) {
      const errorMsg = `Character generation cannot continue. Missing critical compendium packs: ${missingCritical.join(', ')}`;
      SWSELogger.error(`[CACHE-LOAD] FATAL: ${errorMsg}`);
      ui.notifications.error(errorMsg);
      throw new Error(errorMsg);
    }

    SWSELogger.log(`[CACHE-LOAD] ======== COMPENDIUM LOAD COMPLETE ========`);
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
