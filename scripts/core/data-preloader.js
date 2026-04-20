import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Data Preloader
 * Preloads and caches frequently accessed compendium data
 * Reduces load times and improves responsiveness
 */

import { getCache } from "/systems/foundryvtt-swse/scripts/core/cache-manager.js";
import { timed } from "/systems/foundryvtt-swse/scripts/utils/performance-utils.js";
import { ClassesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/classes-registry.js";
import { FeatRegistry } from "/systems/foundryvtt-swse/scripts/registries/feat-registry.js";
import { TalentRegistry } from "/systems/foundryvtt-swse/scripts/registries/talent-registry.js";
import { ForceRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/force-registry.js";
import { SpeciesRegistry } from "/systems/foundryvtt-swse/scripts/engine/registries/species-registry.js";
import SkillRegistry from "/systems/foundryvtt-swse/scripts/engine/progression/skills/skill-registry.js";

export class DataPreloader {
  constructor() {
    this._loaded = false;
    this._loading = false;
    this._backgroundLoading = false;
    this._backgroundPromise = null;

    // Create caches with appropriate TTLs
    this._classesCache = getCache('classes', { ttl: 600000, maxSize: 50 }); // 10 min
    this._featsCache = getCache('feats', { ttl: 600000, maxSize: 200 });
    this._talentsCache = getCache('talents', { ttl: 600000, maxSize: 200 });
    this._forcePowersCache = getCache('forcePowers', { ttl: 600000, maxSize: 100 });
    this._speciesCache = getCache('species', { ttl: 600000, maxSize: 50 });
    this._skillsCache = getCache('skills', { ttl: 600000, maxSize: 30 });
  }

  /**
   * Preload all commonly used data
   * @param {Object} options - Preload options
   * @returns {Promise<void>}
   */
  async preload(options = {}) {
    if (this._loaded || this._loading) {return;}

    const {
      priority = ['classes', 'skills', 'feats'],
      background = ['talents', 'forcePowers', 'species'],
      verbose = true
    } = options;

    this._loading = true;

    try {
      // Preload priority items immediately
      if (verbose) {
        SWSELogger.log('SWSE | Preloading priority data...');
      }

      await timed('Priority data preload', async () => {
        await Promise.all(priority.map(type => this._preloadType(type)));
      });

      // Preload background items asynchronously
      if (background.length > 0) {
        this._preloadBackground(background, verbose);
      }

      this._loaded = true;
      this._loading = false;

      if (verbose) {
        SWSELogger.log('SWSE | Data preloading complete');
      }
    } catch (error) {
      SWSELogger.error('SWSE | Data preloading failed:', error);
      this._loading = false;
    }
  }

  /**
   * Preload background data without blocking
   * @private
   */
  _preloadBackground(types, verbose) {
    // Prevent concurrent background loading
    if (this._backgroundLoading) {
      return this._backgroundPromise;
    }

    this._backgroundLoading = true;
    this._backgroundPromise = new Promise((resolve) => {
      setTimeout(async () => {
        try {
          if (verbose) {
            SWSELogger.log('SWSE | Background preloading...');
          }

          for (const type of types) {
            try {
              await this._preloadType(type);
            } catch (error) {
              SWSELogger.warn(`SWSE | Failed to preload ${type}:`, error.message);
            }

            // Yield between types
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          if (verbose) {
            SWSELogger.log('SWSE | Background preloading complete');
          }
        } catch (error) {
          SWSELogger.error('SWSE | Background preloading error:', error);
        } finally {
          this._backgroundLoading = false;
          resolve();
        }
      }, 500);
    });

    return this._backgroundPromise;
  }

  /**
   * Preload specific data type
   * @private
   */
  async _preloadType(type) {
    switch (type) {
      case 'classes':
        return this._preloadClasses();
      case 'feats':
        return this._preloadFeats();
      case 'talents':
        return this._preloadTalents();
      case 'forcePowers':
        return this._preloadForcePowers();
      case 'species':
        return this._preloadSpecies();
      case 'skills':
        return this._preloadSkills();
      default:
        SWSELogger.warn(`Unknown preload type: ${type}`);
    }
  }

  /**
   * Preload classes
   * @private
   */
  async _preloadClasses() {
    if (!ClassesRegistry.isInitialized()) {return;}

    const index = ClassesRegistry.getAll();
    this._classesCache.set('_index', index);

    // Preload actual documents for small packs
    if (index.length <= 20) {
      try {
        const documents = await ClassesRegistry.getAllDocuments();
        for (const doc of documents) {
          this._classesCache.set(doc.id, doc);
          this._classesCache.set(doc.name.toLowerCase(), doc);
        }
      } catch (error) {
        SWSELogger.warn('Failed to preload class documents from ClassesRegistry, using index only:', error.message);
      }
    }
  }

  /**
   * Preload feats
   * @private
   */
  
async _preloadFeats() {
  await FeatRegistry.initialize?.();
  const entries = FeatRegistry.getAll?.() || [];
  this._featsCache.set('_index', entries);
  const byName = new Map();
  for (const entry of entries) {
    byName.set(String(entry.name || '').toLowerCase(), entry);
  }
  this._featsCache.set('_byName', byName);
}

  /**
   * Preload talents
   * @private
   */
  
async _preloadTalents() {
  await TalentRegistry.initialize?.();
  const entries = TalentRegistry.getAll?.() || [];
  this._talentsCache.set('_index', entries);
  const byTree = new Map();
  for (const entry of entries) {
    const tree = entry.talentTree || entry.category || 'Unknown';
    if (!byTree.has(tree)) byTree.set(tree, []);
    byTree.get(tree).push(entry);
  }
  this._talentsCache.set('_byTree', byTree);
}

  /**
   * Preload force powers
   * @private
   */
  
async _preloadForcePowers() {
  await ForceRegistry.initialize?.();
  const entries = (ForceRegistry.getAll?.() || []).filter((entry) => entry.type === 'power');
  this._forcePowersCache.set('_index', entries);
  const byName = new Map();
  for (const entry of entries) {
    byName.set(String(entry.name || '').toLowerCase(), entry);
  }
  this._forcePowersCache.set('_byName', byName);
}

  /**
   * Preload species
   * @private
   */
  
async _preloadSpecies() {
  await SpeciesRegistry.initialize?.();
  const entries = SpeciesRegistry.getAll?.() || [];
  this._speciesCache.set('_index', entries);
  const byName = new Map();
  for (const entry of entries) {
    byName.set(String(entry.name || '').toLowerCase(), entry);
    this._speciesCache.set(entry.id, entry);
  }
  this._speciesCache.set('_byName', byName);
}

  /**
   * Preload skills
   * @private
   */
  
async _preloadSkills() {
  await SkillRegistry.build();
  const entries = SkillRegistry.list?.() || [];
  this._skillsCache.set('_index', entries);
  const byName = new Map();
  for (const entry of entries) {
    byName.set(String(entry.name || '').toLowerCase(), entry);
    this._skillsCache.set(entry.id, entry);
  }
  this._skillsCache.set('_byName', byName);
}

  /**
   * Get cached class by ID or name
   */
  async getClass(idOrName) {
    const model = ClassesRegistry.resolveModel(idOrName);
    if (!model?.sourceId) {return null;}

    const cached = this._classesCache.get(model.sourceId) || this._classesCache.get(String(idOrName).toLowerCase());
    if (cached) {return cached;}

    const doc = await ClassesRegistry.getDocumentBySourceId(model.sourceId);
    if (doc) {
      this._classesCache.set(model.sourceId, doc);
      this._classesCache.set(doc.name.toLowerCase(), doc);
    }
    return doc;
  }

  /**
   * Get cached feat by ID or name
   */
  
async getFeat(idOrName) {
  const entry = FeatRegistry.resolveEntry?.(idOrName) || null;
  if (!entry) return null;
  const cached = this._featsCache.get(entry.id) || this._featsCache.get(String(entry.name || '').toLowerCase());
  if (cached) return cached;
  const doc = await FeatRegistry.getDocumentById?.(entry.id);
  if (doc) {
    this._featsCache.set(entry.id, doc);
    this._featsCache.set(doc.name.toLowerCase(), doc);
  }
  return doc;
}

  /**
   * Get cached talent by ID or name
   */
  
async getTalent(idOrName) {
  const entry = TalentRegistry.resolveEntry?.(idOrName) || null;
  if (!entry) return null;
  const cached = this._talentsCache.get(entry.id) || this._talentsCache.get(String(entry.name || '').toLowerCase());
  if (cached) return cached;
  const doc = await TalentRegistry.getDocumentById?.(entry.id);
  if (doc) {
    this._talentsCache.set(entry.id, doc);
    this._talentsCache.set(doc.name.toLowerCase(), doc);
  }
  return doc;
}

  /**
   * Get cached force power by ID or name
   */
  
async getForcePower(idOrName) {
  const entry = ForceRegistry.resolveEntry?.(idOrName, 'power') || null;
  if (!entry) return null;
  const cached = this._forcePowersCache.get(entry.id) || this._forcePowersCache.get(String(entry.name || '').toLowerCase());
  if (cached) return cached;
  const doc = await ForceRegistry.getDocumentById?.(entry.id);
  if (doc) {
    this._forcePowersCache.set(entry.id, doc);
    this._forcePowersCache.set(doc.name.toLowerCase(), doc);
  }
  return doc;
}

  /**
   * Get cached species by ID or name
   */
  
async getSpecies(idOrName) {
  const entry = SpeciesRegistry.resolveEntry?.(idOrName) || null;
  if (!entry) return null;
  const cached = this._speciesCache.get(entry.id) || this._speciesCache.get(String(entry.name || '').toLowerCase());
  if (cached) return cached;
  const doc = await SpeciesRegistry.getDocumentById?.(entry.id);
  if (doc) {
    this._speciesCache.set(entry.id, doc);
    this._speciesCache.set(doc.name.toLowerCase(), doc);
  }
  return doc;
}

  /**
   * Get all talents by tree
   */
  
async getTalentsByTree(treeName) {
  const byTree = this._talentsCache.get('_byTree');
  if (byTree) {
    return byTree.get(treeName) || [];
  }
  await TalentRegistry.initialize?.();
  return (TalentRegistry.getAll?.() || []).filter((entry) => (entry.talentTree || entry.category) === treeName);
}


  /**
   * Clear all caches
   */
  clearCaches() {
    this._classesCache.clear();
    this._featsCache.clear();
    this._talentsCache.clear();
    this._forcePowersCache.clear();
    this._speciesCache.clear();
    this._skillsCache.clear();
    this._loaded = false;
  }

  /**
   * Check if preloading is complete
   */
  isLoaded() {
    return this._loaded;
  }

  /**
   * Wait for all preloading (including background) to complete
   * @returns {Promise<void>}
   */
  async waitForAll() {
    if (this._backgroundPromise) {
      await this._backgroundPromise;
    }
  }

  /**
   * Check if background loading is in progress
   */
  isBackgroundLoading() {
    return this._backgroundLoading;
  }
}

// Global data preloader instance
export const dataPreloader = new DataPreloader();
