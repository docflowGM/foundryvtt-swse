/**
 * Error Handler
 * Provides graceful error handling and recovery mechanisms
 */

export class ErrorHandler {
  constructor() {
    this._errorLog = [];
    this._maxLogSize = 100;
    this._recoveryHandlers = new Map();
    this._criticalErrors = new Set();
  }

  /**
   * Initialize error handler with global hooks
   */
  initialize() {
    // Hook into Foundry's error handling
    if (typeof Hooks !== 'undefined') {
      Hooks.on('error', (location, error, data) => {
        this.handleError(error, {
          location,
          data,
          source: 'foundry-hook'
        });
      });
    }

    // Global error handler
    window.addEventListener('error', (event) => {
      this.handleError(event.error, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        source: 'window'
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        promise: event.promise,
        source: 'unhandled-promise'
      });
    });

    console.log('SWSE | Error handler initialized');
  }

  /**
   * Handle an error with recovery attempts
   * @param {Error} error - The error object
   * @param {Object} context - Additional context
   */
  handleError(error, context = {}) {
    const errorInfo = {
      error,
      context,
      timestamp: Date.now(),
      stack: error?.stack
    };

    // Log the error
    this._logError(errorInfo);

    // Check if critical
    const isCritical = this._isCritical(error, context);

    if (isCritical) {
      this._handleCriticalError(errorInfo);
    } else {
      this._handleRecoverableError(errorInfo);
    }

    // Attempt recovery
    this._attemptRecovery(error, context);
  }

  /**
   * Register a recovery handler for specific error types
   * @param {string} errorType - Error type or pattern
   * @param {Function} handler - Recovery function
   */
  registerRecoveryHandler(errorType, handler) {
    this._recoveryHandlers.set(errorType, handler);
  }

  /**
   * Mark an error type as critical
   * @param {string} errorType
   */
  markAsCritical(errorType) {
    this._criticalErrors.add(errorType);
  }

  /**
   * Log error to internal log
   * @private
   */
  _logError(errorInfo) {
    this._errorLog.push(errorInfo);

    // Trim log if too large
    if (this._errorLog.length > this._maxLogSize) {
      this._errorLog.shift();
    }

    // Console logging with context
    const { error, context } = errorInfo;
    console.error('SWSE Error:', {
      message: error?.message,
      context,
      stack: error?.stack
    });
  }

  /**
   * Check if error is critical
   * @private
   */
  _isCritical(error, context) {
    // Check error type
    const errorType = error?.constructor?.name;
    if (this._criticalErrors.has(errorType)) {
      return true;
    }

    // Check context
    if (context.critical) {
      return true;
    }

    // Check error message patterns
    const criticalPatterns = [
      /cannot read.*undefined/i,
      /is not a function/i,
      /out of memory/i,
      /maximum call stack/i
    ];

    return criticalPatterns.some(pattern =>
      pattern.test(error?.message || '')
    );
  }

  /**
   * Handle critical error
   * @private
   */
  _handleCriticalError(errorInfo) {
    const { error, context } = errorInfo;

    ui.notifications.error(
      `Critical Error: ${error?.message || 'Unknown error'}`,
      { permanent: true }
    );

    // Could trigger failsafe mode here
    console.error('SWSE | Critical error detected:', errorInfo);
  }

  /**
   * Handle recoverable error
   * @private
   */
  _handleRecoverableError(errorInfo) {
    const { error } = errorInfo;

    ui.notifications.warn(
      `Error: ${error?.message || 'An error occurred'}. Attempting recovery...`
    );
  }

  /**
   * Attempt to recover from error
   * @private
   */
  async _attemptRecovery(error, context) {
    const errorType = error?.constructor?.name;

    // Check for registered handler
    if (this._recoveryHandlers.has(errorType)) {
      try {
        const handler = this._recoveryHandlers.get(errorType);
        await handler(error, context);
        ui.notifications.info('Error recovered successfully');
        return true;
      } catch (recoveryError) {
        console.error('SWSE | Recovery failed:', recoveryError);
      }
    }

    // Generic recovery attempts
    return this._genericRecovery(error, context);
  }

  /**
   * Generic recovery strategies
   * @private
   */
  async _genericRecovery(error, context) {
    // Strategy 1: Clear caches if cache-related
    if (context.source?.includes('cache')) {
      console.log('SWSE | Attempting cache clear recovery');
      if (window.SWSE?.cacheManager) {
        window.SWSE.cacheManager.clear();
      }
      return true;
    }

    // Strategy 2: Re-render if sheet-related
    if (context.location?.includes('sheet') || context.source?.includes('sheet')) {
      console.log('SWSE | Attempting sheet re-render recovery');
      // Could trigger sheet re-render here
      return true;
    }

    return false;
  }

  /**
   * Get error log
   */
  getErrorLog() {
    return [...this._errorLog];
  }

  /**
   * Get recent errors
   * @param {number} count - Number of recent errors
   */
  getRecentErrors(count = 10) {
    return this._errorLog.slice(-count);
  }

  /**
   * Clear error log
   */
  clearLog() {
    this._errorLog = [];
  }

  /**
   * Get error statistics
   */
  getStats() {
    const stats = {
      total: this._errorLog.length,
      bySeverity: { critical: 0, recoverable: 0 },
      bySource: {},
      recentCount: this._errorLog.filter(e =>
        Date.now() - e.timestamp < 60000
      ).length
    };

    for (const errorInfo of this._errorLog) {
      const isCritical = this._isCritical(errorInfo.error, errorInfo.context);
      stats.bySeverity[isCritical ? 'critical' : 'recoverable']++;

      const source = errorInfo.context.source || 'unknown';
      stats.bySource[source] = (stats.bySource[source] || 0) + 1;
    }

    return stats;
  }
}

/**
 * Safe execution wrapper
 * @param {Function} func - Function to execute safely
 * @param {*} fallback - Fallback value on error
 * @param {Object} context - Error context
 * @returns {*} Function result or fallback
 */
export async function safeExecute(func, fallback = null, context = {}) {
  try {
    return await func();
  } catch (error) {
    if (window.SWSE?.errorHandler) {
      window.SWSE.errorHandler.handleError(error, context);
    } else {
      console.error('SWSE | Safe execution failed:', error);
    }
    return fallback;
  }
}

/**
 * Safe property access with default value
 * @param {Object} obj - Object to access
 * @param {string} path - Dot-notation path
 * @param {*} defaultValue - Default value
 * @returns {*}
 */
export function safeGet(obj, path, defaultValue = undefined) {
  try {
    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
      if (result == null) {
        return defaultValue;
      }
      result = result[key];
    }

    return result !== undefined ? result : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Validate required data
 * @param {Object} data - Data to validate
 * @param {Array} required - Required fields
 * @throws {Error} If validation fails
 */
export function validateRequired(data, required) {
  const missing = [];

  for (const field of required) {
    if (!(field in data) || data[field] == null) {
      missing.push(field);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(', ')}`);
  }
}

// Global error handler instance
export const errorHandler = new ErrorHandler();
