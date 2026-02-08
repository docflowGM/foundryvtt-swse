/**
import { SWSELogger } from '../utils/logger.js';
 * Cache Manager
 * Provides intelligent caching for frequently accessed data
 * Reduces compendium lookups and improves performance
 */

export class CacheManager {
  constructor() {
    this._caches = new Map();
    this._timers = new Map();
    this._stats = {
      hits: 0,
      misses: 0,
      evictions: 0
    };
  }

  /**
   * Create or get a cache with specific options
   * @param {string} name - Cache name
   * @param {Object} options - Cache options
   * @param {number} options.ttl - Time to live in milliseconds (default: 5 minutes)
   * @param {number} options.maxSize - Maximum cache size (default: 100)
   * @returns {Cache}
   */
  getCache(name, options = {}) {
    if (!this._caches.has(name)) {
      this._caches.set(name, new Cache(name, options, this._stats));
    }
    return this._caches.get(name);
  }

  /**
   * Clear a specific cache or all caches
   * @param {string} [name] - Cache name, or undefined to clear all
   */
  clear(name) {
    if (name) {
      const cache = this._caches.get(name);
      if (cache) {cache.clear();}
    } else {
      for (const cache of this._caches.values()) {
        cache.clear();
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const cacheStats = {};
    for (const [name, cache] of this._caches.entries()) {
      cacheStats[name] = {
        size: cache.size,
        maxSize: cache.maxSize,
        ttl: cache.ttl
      };
    }

    return {
      global: { ...this._stats },
      caches: cacheStats,
      hitRate: this._stats.hits / (this._stats.hits + this._stats.misses) || 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this._stats.hits = 0;
    this._stats.misses = 0;
    this._stats.evictions = 0;
  }
}

/**
 * Individual cache instance
 */
class Cache {
  constructor(name, options = {}, stats) {
    this.name = name;
    this.ttl = options.ttl || 300000; // 5 minutes default
    this.maxSize = options.maxSize || 100;
    this._data = new Map();
    this._timers = new Map();
    this._stats = stats;
    this._lruTimestamps = new Map(); // O(1) LRU tracking using timestamps
  }

  get size() {
    return this._data.size;
  }

  /**
   * Get value from cache
   * @param {string} key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    if (this._data.has(key)) {
      this._stats.hits++;
      this._touchLRU(key);
      return this._data.get(key);
    }
    this._stats.misses++;
    return undefined;
  }

  /**
   * Set value in cache
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    // Evict if at max size
    if (!this._data.has(key) && this._data.size >= this.maxSize) {
      this._evictLRU();
    }

    this._data.set(key, value);
    this._touchLRU(key);

    // Set TTL timer
    if (this._timers.has(key)) {
      clearTimeout(this._timers.get(key));
      this._timers.delete(key);
    }

    const timer = setTimeout(() => {
      try {
        // Clean up timer reference before delete to prevent leak
        if (this._timers.has(key)) {
          this._timers.delete(key);
        }

        // Remove data and LRU entry
        this._data.delete(key);
        this._lruTimestamps.delete(key);
      } catch (error) {
        SWSELogger.error(`SWSE | Cache TTL cleanup error for key "${key}":`, error);
      }
    }, this.ttl);

    this._timers.set(key, timer);
  }

  /**
   * Check if key exists
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this._data.has(key);
  }

  /**
   * Delete key from cache
   * @param {string} key
   */
  delete(key) {
    if (this._timers.has(key)) {
      clearTimeout(this._timers.get(key));
      this._timers.delete(key);
    }
    this._data.delete(key);
    this._lruTimestamps.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    for (const timer of this._timers.values()) {
      clearTimeout(timer);
    }
    this._timers.clear();
    this._data.clear();
    this._lruTimestamps.clear();
  }

  /**
   * Get or compute value
   * @param {string} key
   * @param {Function} computeFn - Async function to compute value if not cached
   * @returns {Promise<*>}
   */
  async getOrCompute(key, computeFn) {
    if (this.has(key)) {
      return this.get(key);
    }

    const value = await computeFn();
    this.set(key, value);
    return value;
  }

  /**
   * Touch LRU for key (update access timestamp) - O(1)
   * @private
   */
  _touchLRU(key) {
    this._lruTimestamps.set(key, Date.now());
  }

  /**
   * Evict least recently used entry - O(n) only during eviction
   * @private
   */
  _evictLRU() {
    if (this._lruTimestamps.size === 0) {return;}

    // Find the least recently used key (oldest timestamp)
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, timestamp] of this._lruTimestamps.entries()) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this._stats.evictions++;
    }
  }
}

// Global cache manager instance
export const cacheManager = new CacheManager();

// Convenience function to get cache
export function getCache(name, options) {
  return cacheManager.getCache(name, options);
}
