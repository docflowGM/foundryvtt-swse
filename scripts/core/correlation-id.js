/**
 * Correlation ID Tracing System - Phase 5 Observability
 *
 * Provides trace context for async operations (chargen, levelup, import, combat).
 * Allows following requests through async call chains for debugging and diagnostics.
 *
 * Usage:
 *   const traceId = generateTraceId('chargen');
 *   await withTraceContext(traceId, async () => {
 *     // All logs inside this block will include traceId
 *     const result = await someAsyncOperation();
 *   });
 *
 *   // Or manually:
 *   setCurrentTraceId('trace-001');
 *   log.info('This will include trace ID in output');
 *   clearTraceId();
 */

import { log } from './foundry-env.js';

// WeakMap for storing trace context per async operation
let _currentTraceId = null;
let _traceCounter = 0;

/**
 * Generate a new trace ID for an operation
 * @param {string} operationType - Type of operation (chargen, levelup, import, combat)
 * @returns {string} - Unique trace ID
 */
export function generateTraceId(operationType = 'op') {
  _traceCounter++;
  const timestamp = Date.now().toString(36);
  const counter = _traceCounter.toString(36).padStart(4, '0');
  const traceId = `${operationType}-${timestamp}-${counter}`;
  return traceId;
}

/**
 * Get current trace ID (if any)
 * @returns {string|null}
 */
export function getCurrentTraceId() {
  return _currentTraceId;
}

/**
 * Set current trace ID for manual context propagation
 * @param {string} traceId
 */
export function setCurrentTraceId(traceId) {
  _currentTraceId = traceId;
  if (traceId) {
    log.debug(`[Trace Start] ${traceId}`);
  }
}

/**
 * Clear current trace ID
 */
export function clearTraceId() {
  if (_currentTraceId) {
    log.debug(`[Trace End] ${_currentTraceId}`);
  }
  _currentTraceId = null;
}

/**
 * Execute async operation with trace context
 * All logging inside callback will include the trace ID
 *
 * @param {string} traceId - Trace ID to use
 * @param {Function} callback - Async operation to execute
 * @returns {Promise} - Result of callback
 */
export async function withTraceContext(traceId, callback) {
  const previousTraceId = _currentTraceId;

  try {
    setCurrentTraceId(traceId);
    const result = await callback();
    return result;
  } catch (err) {
    log.error(`[Trace Error] ${traceId}:`, err.message);
    throw err;
  } finally {
    if (previousTraceId) {
      _currentTraceId = previousTraceId;
    } else {
      clearTraceId();
    }
  }
}

/**
 * Format a log message with current trace ID
 * Useful for custom logging that doesn't use the global logger
 *
 * @param {string} message
 * @returns {string} - Message with trace context prepended
 */
export function formatWithTrace(message) {
  if (!_currentTraceId) {
    return message;
  }
  return `[${_currentTraceId}] ${message}`;
}

/**
 * Trace metadata for diagnostics
 * Collects trace statistics across all operations
 */
export const TraceMetrics = {
  _metrics: {},

  /**
   * Record operation start
   * @param {string} traceId
   * @param {string} operationType
   */
  recordStart(traceId, operationType) {
    this._metrics[traceId] = {
      type: operationType,
      startTime: Date.now(),
      steps: []
    };
  },

  /**
   * Record a step within an operation
   * @param {string} traceId
   * @param {string} stepName
   * @param {Object} metadata
   */
  recordStep(traceId, stepName, metadata = {}) {
    if (!this._metrics[traceId]) {
      return; // Trace not found
    }
    this._metrics[traceId].steps.push({
      name: stepName,
      timestamp: Date.now(),
      ...metadata
    });
  },

  /**
   * Record operation complete
   * @param {string} traceId
   * @returns {Object} - Trace metadata
   */
  recordComplete(traceId) {
    const metric = this._metrics[traceId];
    if (!metric) return null;

    metric.endTime = Date.now();
    metric.duration = metric.endTime - metric.startTime;

    // Cleanup old metrics (keep last 100)
    const ids = Object.keys(this._metrics);
    if (ids.length > 100) {
      const toDelete = ids.slice(0, ids.length - 100);
      toDelete.forEach(id => delete this._metrics[id]);
    }

    return metric;
  },

  /**
   * Get all trace metrics (GM only)
   * @returns {Object}
   */
  getMetrics() {
    if (game?.user?.isGM !== true) {
      return { error: 'GMs only' };
    }
    return foundry.utils.deepClone(this._metrics);
  },

  /**
   * Clear all metrics
   */
  clear() {
    this._metrics = {};
  }
};

/**
 * Make trace metrics available to GM console
 */
export function registerTraceMetrics() {
  if (typeof window !== 'undefined') {
    window.SWSETracing = {
      getCurrentTraceId,
      setCurrentTraceId,
      clearTraceId,
      generateTraceId,
      metrics: TraceMetrics.getMetrics.bind(TraceMetrics),
      clearMetrics: TraceMetrics.clear.bind(TraceMetrics)
    };
  }
}
