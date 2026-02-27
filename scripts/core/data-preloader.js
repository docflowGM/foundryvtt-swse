import { SWSELogger } from '../utils/logger.js';

/**
 * Data Preloader
 * Preloads and caches frequently accessed compendium data
 * Reduces load times and improves responsiveness
 */

import { getCache } from './cache-manager.js';
import { timed } from '../utils/performance-utils.js';
import { SpeciesRegistry } from '../engine/registries/species-registry.js';
import { ForceRegistry } from '../engine/registries/force-registry.js';
import { ClassesRegistry } from '../engine/registries/classes-registry.js';
import { FeatRegistry } from '../registries/feat-registry.js';
import { TalentRegistry } from '../registries/talent-registry.js';

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
    if (!ClassesRegistry.isInitialized()) {
      SWSELogger.warn('ClassesRegistry not initialized, skipping preload');
      return;
    }

    const documents = ClassesRegistry.getAll();
    this._classesCache.set('_index', documents);

    // Preload all documents (registry already has them)
    if (documents && documents.length <= 20) {
      try {
        for (const doc of documents) {
          this._classesCache.set(doc.id, doc);
        }
      } catch (error) {
        // Fall back to index-only if document loading fails
        SWSELogger.warn('Failed to preload class documents, using index only:', error.message);
      }
    }
  }

  /**
   * Preload feats (now uses FeatRegistry)
   * @private
   */
  async _preloadFeats() {
    if (!FeatRegistry.isInitialized()) {
      return;
    }

    const entries = FeatRegistry.getAll();
    this._featsCache.set('_index', entries);

    // Cache the index for searching
    const byName = new Map();
    for (const entry of entries) {
      byName.set(entry.name.toLowerCase(), entry);
    }
    this._featsCache.set('_byName', byName);
  }

  /**
   * Preload talents (now uses TalentRegistry)
   * @private
   */
  async _preloadTalents() {
    if (!TalentRegistry.isInitialized()) {
      return;
    }

    const entries = TalentRegistry.getAll();
    this._talentsCache.set('_index', entries);

    // Group by talent tree for quick filtering
    const byTree = new Map();
    for (const entry of entries) {
      const tree = entry.talentTree || 'Unknown';
      if (!byTree.has(tree)) {
        byTree.set(tree, []);
      }
      byTree.get(tree).push(entry);
    }
    this._talentsCache.set('_byTree', byTree);
  }

  /**
   * Preload force powers (now uses ForceRegistry)
   * @private
   */
  async _preloadForcePowers() {
    if (!ForceRegistry.isInitialized()) {
      return;
    }

    const powers = ForceRegistry.getByType('power');
    this._forcePowersCache.set('_index', powers);

    // Cache for quick access by name
    const byName = new Map();
    for (const entry of powers) {
      byName.set(entry.name.toLowerCase(), entry);
    }
    this._forcePowersCache.set('_byName', byName);
  }

  /**
   * Preload species
   * @private
   */
  async _preloadSpecies() {
    if (!SpeciesRegistry.isInitialized()) {
      return;
    }

    const species = SpeciesRegistry.getAll();
    this._speciesCache.set('_index', species);

    // Cache species by ID
    try {
      for (const entry of species) {
        this._speciesCache.set(entry.id, entry);
        this._speciesCache.set(doc.name.toLowerCase(), doc);
      }
    } catch (error) {
      // Fall back to index-only if document loading fails
      SWSELogger.warn('Failed to preload species documents, using index only:', error.message);
      const byName = new Map();
      for (const entry of index) {
        byName.set(entry.name.toLowerCase(), entry);
      }
      this._speciesCache.set('_byName', byName);
    }
  }

  /**
   * Preload skills
   * @private
   */
  async _preloadSkills() {
    const pack = game.packs.get('foundryvtt-swse.skills');
    if (!pack) {return;}

    const index = await pack.getIndex();
    this._skillsCache.set('_index', index);

    // Cache by name for quick lookup
    const byName = new Map();
    for (const entry of index) {
      byName.set(entry.name.toLowerCase(), entry);
    }
    this._skillsCache.set('_byName', byName);
  }

  /**
   * Get cached class by ID or name
   */
  async getClass(idOrName) {
    return this._getCached(this._classesCache, 'foundryvtt-swse.classes', idOrName);
  }

  /**
   * Get cached feat by ID or name
   */
  async getFeat(idOrName) {
    return this._getCached(this._featsCache, 'foundryvtt-swse.feats', idOrName);
  }

  /**
   * Get cached talent by ID or name
   */
  async getTalent(idOrName) {
    return this._getCached(this._talentsCache, 'foundryvtt-swse.talents', idOrName);
  }

  /**
   * Get cached force power by ID or name
   */
  async getForcePower(idOrName) {
    return this._getCached(this._forcePowersCache, 'foundryvtt-swse.forcepowers', idOrName);
  }

  /**
   * Get cached species by ID or name
   */
  async getSpecies(idOrName) {
    return this._getCached(this._speciesCache, 'foundryvtt-swse.species', idOrName);
  }

  /**
   * Get all talents by tree
   */
  async getTalentsByTree(treeName) {
    const byTree = this._talentsCache.get('_byTree');
    if (byTree) {
      return byTree.get(treeName) || [];
    }

    // Fallback to registry lookup
    if (!TalentRegistry.isInitialized()) {
      return [];
    }

    const allTalents = TalentRegistry.getAll();
    return allTalents.filter(e => e.talentTree === treeName);
  }

  /**
   * Generic cached getter
   * @private
   */
  async _getCached(cache, packId, idOrName) {
    // Check direct cache
    if (cache.has(idOrName)) {
      return cache.get(idOrName);
    }

    // Check by lowercase name
    const lowerName = typeof idOrName === 'string' ? idOrName.toLowerCase() : null;
    if (lowerName) {
      const byName = cache.get('_byName');
      if (byName && byName.has(lowerName)) {
        const entry = byName.get(lowerName);
        const pack = game.packs.get(packId);
        const doc = await pack.getDocument(entry._id);
        cache.set(entry._id, doc);
        return doc;
      }

      if (cache.has(lowerName)) {
        return cache.get(lowerName);
      }
    }

    // Fallback to pack lookup
    const pack = game.packs.get(packId);
    if (!pack) {return null;}

    const doc = await pack.getDocument(idOrName);
    if (doc) {
      cache.set(idOrName, doc);
    }

    return doc;
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
