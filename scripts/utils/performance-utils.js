/**
 * Performance Utilities
 * Debouncing, throttling, and other optimization helpers
 */

/**
 * Debounce function calls - waits for calls to stop before executing
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute on leading edge instead of trailing
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 250, immediate = false) {
  let timeout;

  return function executedFunction(...args) {
    const context = this;

    const later = () => {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };

    const callNow = immediate && !timeout;

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);

    if (callNow) func.apply(context, args);
  };
}

/**
 * Throttle function calls - executes at most once per interval
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 250) {
  let inThrottle;
  let lastResult;

  return function(...args) {
    const context = this;

    if (!inThrottle) {
      lastResult = func.apply(context, args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }

    return lastResult;
  };
}

/**
 * Request animation frame throttle - executes at most once per frame
 * @param {Function} func - Function to throttle
 * @returns {Function} Throttled function
 */
export function rafThrottle(func) {
  let rafId = null;

  return function(...args) {
    const context = this;

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        func.apply(context, args);
        rafId = null;
      });
    }
  };
}

/**
 * Memoize function results
 * @param {Function} func - Function to memoize
 * @param {Function} resolver - Custom key resolver
 * @returns {Function} Memoized function
 */
export function memoize(func, resolver) {
  const cache = new Map();

  return function(...args) {
    const key = resolver ? resolver(...args) : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = func.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Batch multiple updates into a single call
 * @param {Function} func - Function to batch
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Batched function
 */
export function batch(func, wait = 50) {
  let timeout;
  let queue = [];

  return function(...args) {
    queue.push(args);

    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.call(this, queue);
      queue = [];
    }, wait);
  };
}

/**
 * Lazy load a resource only when needed
 * @param {Function} loader - Async function to load resource
 * @returns {Function} Lazy loader function
 */
export function lazy(loader) {
  let resource = null;
  let loading = null;

  return async function() {
    if (resource) return resource;
    if (loading) return loading;

    loading = loader();
    resource = await loading;
    loading = null;

    return resource;
  };
}

/**
 * Execute function with performance timing
 * @param {string} label - Label for timing
 * @param {Function} func - Function to time
 * @returns {*} Function result
 */
export async function timed(label, func) {
  const start = performance.now();

  try {
    const result = await func();
    const duration = performance.now() - start;

    console.log(`SWSE Performance | ${label}: ${duration.toFixed(2)}ms`);

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`SWSE Performance | ${label} failed after ${duration.toFixed(2)}ms:`, error);
    throw error;
  }
}

/**
 * Chunk array processing to avoid blocking
 * @param {Array} array - Array to process
 * @param {Function} processor - Processing function
 * @param {number} chunkSize - Items per chunk
 * @returns {Promise<Array>} Processed results
 */
export async function chunkProcess(array, processor, chunkSize = 100) {
  const results = [];

  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);

    // Process chunk
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);

    // Yield to browser between chunks
    if (i + chunkSize < array.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  return results;
}

/**
 * Pool for reusable objects
 */
export class ObjectPool {
  constructor(factory, reset, initialSize = 10) {
    this._factory = factory;
    this._reset = reset;
    this._pool = [];

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this._pool.push(this._factory());
    }
  }

  acquire() {
    if (this._pool.length > 0) {
      return this._pool.pop();
    }
    return this._factory();
  }

  release(obj) {
    if (this._reset) {
      this._reset(obj);
    }
    this._pool.push(obj);
  }

  clear() {
    this._pool = [];
  }
}

/**
 * Execute callbacks only once
 * @param {Function} func - Function to execute once
 * @returns {Function} Once-wrapped function
 */
export function once(func) {
  let called = false;
  let result;

  return function(...args) {
    if (!called) {
      called = true;
      result = func.apply(this, args);
    }
    return result;
  };
}

/**
 * Retry failed operations with exponential backoff
 * @param {Function} func - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<*>}
 */
export async function retry(func, options = {}) {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = 2,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await func();
    } catch (error) {
      lastError = error;

      if (attempt < maxAttempts) {
        const waitTime = delay * Math.pow(backoff, attempt - 1);

        if (onRetry) {
          onRetry(error, attempt, waitTime);
        }

        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
}

/**
 * Create a performance monitor
 */
export class PerformanceMonitor {
  constructor() {
    this._metrics = new Map();
  }

  start(label) {
    this._metrics.set(label, performance.now());
  }

  end(label) {
    const start = this._metrics.get(label);
    if (!start) {
      console.warn(`No start time for metric: ${label}`);
      return 0;
    }

    const duration = performance.now() - start;
    this._metrics.delete(label);

    return duration;
  }

  measure(label, func) {
    this.start(label);
    const result = func();
    const duration = this.end(label);

    console.log(`SWSE | ${label}: ${duration.toFixed(2)}ms`);

    return result;
  }

  async measureAsync(label, func) {
    this.start(label);
    const result = await func();
    const duration = this.end(label);

    console.log(`SWSE | ${label}: ${duration.toFixed(2)}ms`);

    return result;
  }
}

// Global performance monitor
export const perfMonitor = new PerformanceMonitor();
