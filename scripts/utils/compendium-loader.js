// scripts/utils/compendium-loader.js
import { swseLogger } from './logger.js';

/**
 * Enhanced Compendium Loader
 * Provides efficient, cached loading of compendium data
 */

class CompendiumLoader {
  constructor() {
    this._cache = new Map();
    this._indexCache = new Map();
    this._loadPromises = new Map();
    this._stats = {
      hits: 0,
      misses: 0,
      loads: 0
    };
  }

  /**
   * Load a compendium with caching
   * @param {string} packName - Compendium pack name (e.g., 'swse.classes')
   * @param {Object} options - Loading options
   * @returns {Promise<Array>} Compendium documents
   */
  async load(packName, options = {}) {
    const {
      forceReload = false,
      indexOnly = false
    } = options;

    // Check cache
    const cacheKey = `${packName}:${indexOnly ? 'index' : 'full'}`;

    if (!forceReload) {
      const cached = indexOnly
        ? this._indexCache.get(packName)
        : this._cache.get(packName);

      if (cached) {
        this._stats.hits++;
        return cached;
      }
    }

    this._stats.misses++;

    // Check if already loading
    if (this._loadPromises.has(cacheKey)) {
      return this._loadPromises.get(cacheKey);
    }

    // Load compendium
    const loadPromise = this._loadCompendium(packName, indexOnly);
    this._loadPromises.set(cacheKey, loadPromise);

    try {
      const result = await loadPromise;

      // Cache result
      if (indexOnly) {
        this._indexCache.set(packName, result);
      } else {
        this._cache.set(packName, result);
      }

      this._stats.loads++;
      return result;
    } finally {
      this._loadPromises.delete(cacheKey);
    }
  }

  /**
   * Internal compendium loading
   * @private
   */
  async _loadCompendium(packName, indexOnly) {
    const pack = game.packs.get(packName);

    if (!pack) {
      throw new Error(`Compendium "${packName}" not found`);
    }

    if (indexOnly) {
      // Load index only (faster, less memory)
      await pack.getIndex();
      return Array.from(pack.index.values());
    } else {
      // Load full documents
      return await pack.getDocuments();
    }
  }

  /**
   * Find a document in a compendium
   * @param {string} packName - Compendium pack name
   * @param {Function|Object} predicate - Search predicate or object with properties to match
   * @param {Object} options - Options
   * @returns {Promise<Document|null>} Found document or null
   */
  async find(packName, predicate, options = {}) {
    const {
      loadFull = false
    } = options;

    // Try index first
    const index = await this.load(packName, { indexOnly: true });

    const matcher = typeof predicate === 'function'
      ? predicate
      : (doc) => {
          return Object.entries(predicate).every(([key, value]) => {
            return doc[key] === value || doc.name === value;
          });
        };

    const indexMatch = index.find(matcher);

    if (!indexMatch) {
      return null;
    }

    // If we need the full document, load it
    if (loadFull) {
      const pack = game.packs.get(packName);
      return await pack.getDocument(indexMatch._id);
    }

    return indexMatch;
  }

  /**
   * Filter documents in a compendium
   * @param {string} packName - Compendium pack name
   * @param {Function|Object} predicate - Filter predicate or object with properties to match
   * @param {Object} options - Options
   * @returns {Promise<Array>} Filtered documents
   */
  async filter(packName, predicate, options = {}) {
    const {
      loadFull = false,
      limit = null
    } = options;

    // Try index first
    const index = await this.load(packName, { indexOnly: true });

    const matcher = typeof predicate === 'function'
      ? predicate
      : (doc) => {
          return Object.entries(predicate).every(([key, value]) => {
            return doc[key] === value || doc.name?.toLowerCase().includes(value.toLowerCase());
          });
        };

    let results = index.filter(matcher);

    if (limit) {
      results = results.slice(0, limit);
    }

    // If we need full documents, load them
    if (loadFull && results.length > 0) {
      const pack = game.packs.get(packName);
      results = await Promise.all(
        results.map(r => pack.getDocument(r._id))
      );
    }

    return results;
  }

  /**
   * Preload multiple compendiums
   * @param {Array<string>} packNames - Array of pack names
   * @param {Object} options - Options
   * @returns {Promise<void>}
   */
  async preload(packNames, options = {}) {
    const {
      indexOnly = false,
      parallel = true
    } = options;

    swseLogger.log(`Preloading ${packNames.length} compendiums...`);

    const loadFn = (name) => this.load(name, { indexOnly });

    if (parallel) {
      await Promise.all(packNames.map(loadFn));
    } else {
      for (const name of packNames) {
        await loadFn(name);
      }
    }

    swseLogger.log(`Preloaded ${packNames.length} compendiums`);
  }

  /**
   * Clear cache for a specific pack or all packs
   * @param {string|null} packName - Pack name or null for all
   */
  clearCache(packName = null) {
    if (packName) {
      this._cache.delete(packName);
      this._indexCache.delete(packName);
      swseLogger.log(`Cleared cache for ${packName}`);
    } else {
      this._cache.clear();
      this._indexCache.clear();
      swseLogger.log('Cleared all compendium cache');
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const hitRate = this._stats.hits + this._stats.misses > 0
      ? (this._stats.hits / (this._stats.hits + this._stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this._stats,
      hitRate: `${hitRate}%`,
      cachedPacks: this._cache.size,
      cachedIndexes: this._indexCache.size,
      totalMemory: this._estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage (rough)
   * @private
   */
  _estimateMemoryUsage() {
    let size = 0;

    for (const data of this._cache.values()) {
      size += JSON.stringify(data).length;
    }

    for (const data of this._indexCache.values()) {
      size += JSON.stringify(data).length;
    }

    // Convert to KB
    const kb = (size / 1024).toFixed(2);

    return `${kb} KB`;
  }

  /**
   * Print statistics
   */
  printStats() {
    const stats = this.getStats();
    console.log('%c📦 COMPENDIUM LOADER STATISTICS', 'color: cyan; font-weight: bold; font-size: 14px');
    console.table(stats);
  }
}

// Global instance
export const compendiumLoader = new CompendiumLoader();

/**
 * Console commands
 */
export const compendiumCommands = {
  /**
   * Load a compendium
   */
  load: (packName, indexOnly = false) => {
    return compendiumLoader.load(packName, { indexOnly });
  },

  /**
   * Find a document
   */
  find: (packName, predicate, loadFull = false) => {
    return compendiumLoader.find(packName, predicate, { loadFull });
  },

  /**
   * Filter documents
   */
  filter: (packName, predicate, loadFull = false, limit = null) => {
    return compendiumLoader.filter(packName, predicate, { loadFull, limit });
  },

  /**
   * Clear cache
   */
  clear: (packName = null) => {
    compendiumLoader.clearCache(packName);
  },

  /**
   * Show statistics
   */
  stats: () => {
    compendiumLoader.printStats();
  }
};
