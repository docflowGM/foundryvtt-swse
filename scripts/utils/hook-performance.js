// scripts/utils/hook-performance.js
import { swseLogger } from './logger.js';
import { debounce, throttle } from './performance-utils.js';

/**
 * Hook Performance Utilities
 * Provides monitoring and optimization for Foundry hooks
 */

/**
 * Hook performance monitor
 */
class HookPerformanceMonitor {
  constructor() {
    this._hookTimes = new Map();
    this._hookCounts = new Map();
    this._slowHooks = new Set();
    this._enabled = false;
  }

  /**
   * Enable performance monitoring
   */
  enable() {
    this._enabled = true;
    swseLogger.log('Hook performance monitoring enabled');
  }

  /**
   * Disable performance monitoring
   */
  disable() {
    this._enabled = false;
  }

  /**
   * Record hook execution time
   * @param {string} hookName - Name of the hook
   * @param {number} duration - Execution time in ms
   */
  record(hookName, duration) {
    if (!this._enabled) {
      return;
    }

    // Track execution times
    if (!this._hookTimes.has(hookName)) {
      this._hookTimes.set(hookName, []);
    }
    this._hookTimes.get(hookName).push(duration);

    // Track call counts
    this._hookCounts.set(hookName, (this._hookCounts.get(hookName) || 0) + 1);

    // Flag slow hooks (>16ms = below 60fps)
    if (duration > 16) {
      this._slowHooks.add(hookName);
      if (duration > 100) {
        swseLogger.warn(`Slow hook detected: ${hookName} took ${duration.toFixed(2)}ms`);
      }
    }
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance stats
   */
  getStats() {
    const stats = {};

    for (const [hookName, times] of this._hookTimes.entries()) {
      const total = times.reduce((a, b) => a + b, 0);
      const avg = total / times.length;
      const max = Math.max(...times);
      const min = Math.min(...times);

      stats[hookName] = {
        calls: this._hookCounts.get(hookName) || 0,
        avgTime: avg.toFixed(2),
        maxTime: max.toFixed(2),
        minTime: min.toFixed(2),
        totalTime: total.toFixed(2),
        slow: this._slowHooks.has(hookName)
      };
    }

    return stats;
  }

  /**
   * Print statistics to console
   */
  printStats() {
    const stats = this.getStats();
    const sorted = Object.entries(stats).sort((a, b) =>
      parseFloat(b[1].avgTime) - parseFloat(a[1].avgTime)
    );

    console.log('%c📊 HOOK PERFORMANCE STATISTICS', 'color: cyan; font-weight: bold; font-size: 14px');
    console.table(sorted.reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {}));

    const slowHooks = sorted.filter(([_, stats]) => stats.slow);
    if (slowHooks.length > 0) {
      console.log('%c⚠️  SLOW HOOKS (>16ms)', 'color: orange; font-weight: bold');
      console.table(slowHooks.reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {}));
    }
  }

  /**
   * Reset statistics
   */
  reset() {
    this._hookTimes.clear();
    this._hookCounts.clear();
    this._slowHooks.clear();
  }
}

// Global instance
export const hookMonitor = new HookPerformanceMonitor();

/**
 * Wraps a hook handler with performance monitoring
 * @param {string} hookName - Name of the hook
 * @param {Function} handler - Hook handler function
 * @returns {Function} Wrapped handler
 */
export function monitoredHook(hookName, handler) {
  return async function(...args) {
    const start = performance.now();
    try {
      return await handler.apply(this, args);
    } finally {
      const duration = performance.now() - start;
      hookMonitor.record(hookName, duration);
    }
  };
}

/**
 * Wraps a hook handler with debouncing
 * @param {string} hookName - Name of the hook
 * @param {Function} handler - Hook handler function
 * @param {number} delay - Debounce delay in ms
 * @returns {Function} Debounced handler
 */
export function debouncedHook(hookName, handler, delay = 250) {
  const debounced = debounce(handler, delay);
  return monitoredHook(hookName, debounced);
}

/**
 * Wraps a hook handler with throttling
 * @param {string} hookName - Name of the hook
 * @param {Function} handler - Hook handler function
 * @param {number} limit - Throttle limit in ms
 * @returns {Function} Throttled handler
 */
export function throttledHook(hookName, handler, limit = 100) {
  const throttled = throttle(handler, limit);
  return monitoredHook(hookName, throttled);
}

/**
 * Safe hook registration that won't break if hook fails
 * @param {string} hookName - Name of the hook
 * @param {Function} handler - Hook handler function
 * @param {Object} options - Options
 */
export function safeHook(hookName, handler, options = {}) {
  const {
    monitor = false,
    debounce: debounceDelay = null,
    throttle: throttleLimit = null,
    once = false
  } = options;

  let wrappedHandler = async function(...args) {
    try {
      return await handler.apply(this, args);
    } catch (err) {
      swseLogger.error(`Hook "${hookName}" failed:`, err);
      if (window.SWSE?.errorHandler) {
        window.SWSE.errorHandler.handleError(err, {
          source: 'hook',
          hookName,
          args
        });
      }
    }
  };

  // Apply optimizations
  if (debounceDelay !== null) {
    wrappedHandler = debouncedHook(hookName, wrappedHandler, debounceDelay);
  } else if (throttleLimit !== null) {
    wrappedHandler = throttledHook(hookName, wrappedHandler, throttleLimit);
  } else if (monitor) {
    wrappedHandler = monitoredHook(hookName, wrappedHandler);
  }

  // Register hook
  if (once) {
    Hooks.once(hookName, wrappedHandler);
  } else {
    Hooks.on(hookName, wrappedHandler);
  }
}

/**
 * Console commands for hook performance
 */
export const hookPerformanceCommands = {
  /**
   * Enable monitoring
   */
  enable: () => {
    hookMonitor.enable();
    swseLogger.log('✅ Hook performance monitoring enabled');
  },

  /**
   * Disable monitoring
   */
  disable: () => {
    hookMonitor.disable();
    swseLogger.log('✅ Hook performance monitoring disabled');
  },

  /**
   * Show statistics
   */
  stats: () => {
    hookMonitor.printStats();
  },

  /**
   * Reset statistics
   */
  reset: () => {
    hookMonitor.reset();
    swseLogger.log('✅ Hook performance statistics reset');
  },

  /**
   * Get slow hooks
   */
  slow: () => {
    const stats = hookMonitor.getStats();
    const slow = Object.entries(stats)
      .filter(([_, s]) => s.slow)
      .sort((a, b) => parseFloat(b[1].avgTime) - parseFloat(a[1].avgTime));

    if (slow.length === 0) {
      swseLogger.log('✅ No slow hooks detected');
      return [];
    }

    console.log('%c⚠️  SLOW HOOKS', 'color: orange; font-weight: bold; font-size: 14px');
    console.table(slow.reduce((obj, [key, value]) => {
      obj[key] = value;
      return obj;
    }, {}));

    return slow;
  }
};
