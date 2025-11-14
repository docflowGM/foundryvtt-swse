/**
 * Error Handler
 * Provides graceful error handling and recovery mechanisms
 * Enhanced with detailed Foundry/Forge error logging
 */

export class ErrorHandler {
  constructor() {
    this._errorLog = [];
    this._maxLogSize = 100;
    this._recoveryHandlers = new Map();
    this._criticalErrors = new Set();
    this._devMode = false;
  }

  /**
   * Initialize error handler with global hooks
   */
  initialize() {
    // Get devMode setting
    this._devMode = game.settings?.get('swse', 'devMode') ?? false;

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
        source: 'window-error'
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason, {
        promise: event.promise,
        source: 'unhandled-promise'
      });
    });

    console.log('SWSE | Error handler initialized with enhanced logging');
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
      stack: error?.stack,
      foundryContext: this._captureFoundryContext(),
      systemContext: this._captureSystemContext()
    };

    // Log the error with enhanced details
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
   * Capture current Foundry context
   * @private
   */
  _captureFoundryContext() {
    try {
      return {
        foundryVersion: game?.version || 'unknown',
        systemVersion: game?.system?.version || 'unknown',
        worldId: game?.world?.id || 'unknown',
        userId: game?.user?.id || 'unknown',
        userName: game?.user?.name || 'unknown',
        isGM: game?.user?.isGM ?? false,
        activeScene: game?.scenes?.active?.name || 'none',
        combat: game?.combat?.id ? {
          id: game.combat.id,
          round: game.combat.round,
          turn: game.combat.turn,
          combatant: game.combat.combatant?.name
        } : null,
        openSheets: Object.values(ui.windows || {}).map(app => ({
          type: app.constructor.name,
          id: app.id,
          document: app.document?.name || app.actor?.name || app.item?.name
        }))
      };
    } catch (e) {
      return { error: 'Failed to capture Foundry context' };
    }
  }

  /**
   * Capture system-specific context
   * @private
   */
  _captureSystemContext() {
    try {
      return {
        activeModules: game?.modules?.filter(m => m.active).map(m => ({
          id: m.id,
          title: m.title,
          version: m.version
        })) || [],
        cacheStats: window.SWSE?.cacheManager?.getStats() || null,
        errorStats: this.getStats(),
        performance: {
          memory: performance?.memory ? {
            used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
            total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
            limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
          } : 'unavailable',
          timing: performance?.now ? Math.round(performance.now()) : 'unavailable'
        }
      };
    } catch (e) {
      return { error: 'Failed to capture system context' };
    }
  }

  /**
   * Log error to internal log with enhanced formatting
   * @private
   */
  _logError(errorInfo) {
    this._errorLog.push(errorInfo);

    // Trim log if too large
    if (this._errorLog.length > this._maxLogSize) {
      this._errorLog.shift();
    }

    // Update devMode from settings
    this._devMode = game.settings?.get('swse', 'devMode') ?? this._devMode;

    // Console logging with enhanced details
    const { error, context, foundryContext, systemContext, stack } = errorInfo;

    // Always log errors, but format based on devMode
    console.group('%c🚨 SWSE ERROR DETECTED', 'color: red; font-weight: bold; font-size: 14px');

    console.error('%cError Message:', 'color: orange; font-weight: bold');
    console.error(error?.message || 'Unknown error');

    console.error('%cError Type:', 'color: orange; font-weight: bold');
    console.error(error?.constructor?.name || 'Error');

    if (context.source) {
      console.error('%cSource:', 'color: orange; font-weight: bold');
      console.error(context.source);
    }

    if (context.location) {
      console.error('%cLocation:', 'color: orange; font-weight: bold');
      console.error(context.location);
    }

    if (context.filename) {
      console.error('%cFile:', 'color: orange; font-weight: bold');
      console.error(`${context.filename}:${context.lineno}:${context.colno}`);
    }

    // Stack trace (always show)
    if (stack) {
      console.error('%cStack Trace:', 'color: orange; font-weight: bold');
      console.error(stack);
    }

    // Detailed context (only in devMode)
    if (this._devMode) {
      console.group('%c📊 DETAILED CONTEXT', 'color: cyan; font-weight: bold');

      console.log('%cFoundry Context:', 'color: cyan; font-weight: bold');
      console.table(foundryContext);

      console.log('%cActive Modules:', 'color: cyan; font-weight: bold');
      console.table(systemContext.activeModules);

      console.log('%cPerformance:', 'color: cyan; font-weight: bold');
      console.log(systemContext.performance);

      if (systemContext.cacheStats) {
        console.log('%cCache Stats:', 'color: cyan; font-weight: bold');
        console.log(systemContext.cacheStats);
      }

      console.log('%cOpen Sheets:', 'color: cyan; font-weight: bold');
      console.table(foundryContext.openSheets);

      if (context.data) {
        console.log('%cAdditional Data:', 'color: cyan; font-weight: bold');
        console.log(context.data);
      }

      console.groupEnd();
    }

    console.log('%c💡 TIP:', 'color: yellow; font-weight: bold');
    console.log('Enable Developer Mode in settings for more detailed error information');
    console.log('Access error log: window.SWSE.errorHandler.getRecentErrors()');

    console.groupEnd();
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

/**
 * Manually log an error with custom context
 * Use this to log errors from try-catch blocks
 * @param {Error|string} error - Error object or message
 * @param {Object} context - Additional context
 */
export function logError(error, context = {}) {
  const errorObj = typeof error === 'string' ? new Error(error) : error;

  if (window.SWSE?.errorHandler) {
    window.SWSE.errorHandler.handleError(errorObj, {
      ...context,
      source: context.source || 'manual-log',
      manual: true
    });
  } else {
    console.error('SWSE | Error (handler not ready):', errorObj, context);
  }
}

/**
 * Console commands for error management
 * Access via: SWSE.errors.*
 */
export const errorCommands = {
  /**
   * Get recent errors
   * @param {number} count - Number of recent errors
   */
  recent: (count = 10) => {
    if (!window.SWSE?.errorHandler) {
      console.warn('Error handler not initialized');
      return [];
    }
    const errors = window.SWSE.errorHandler.getRecentErrors(count);
    console.table(errors.map(e => ({
      timestamp: new Date(e.timestamp).toLocaleTimeString(),
      message: e.error?.message,
      type: e.error?.constructor?.name,
      source: e.context.source,
      location: e.context.location
    })));
    return errors;
  },

  /**
   * Get error statistics
   */
  stats: () => {
    if (!window.SWSE?.errorHandler) {
      console.warn('Error handler not initialized');
      return {};
    }
    const stats = window.SWSE.errorHandler.getStats();
    console.log('%c📊 ERROR STATISTICS', 'color: cyan; font-weight: bold; font-size: 14px');
    console.table(stats);
    return stats;
  },

  /**
   * Clear error log
   */
  clear: () => {
    if (!window.SWSE?.errorHandler) {
      console.warn('Error handler not initialized');
      return;
    }
    window.SWSE.errorHandler.clearLog();
    console.log('✅ Error log cleared');
  },

  /**
   * Get full error log
   */
  all: () => {
    if (!window.SWSE?.errorHandler) {
      console.warn('Error handler not initialized');
      return [];
    }
    return window.SWSE.errorHandler.getErrorLog();
  },

  /**
   * Export error log as JSON
   */
  export: () => {
    if (!window.SWSE?.errorHandler) {
      console.warn('Error handler not initialized');
      return;
    }
    const errors = window.SWSE.errorHandler.getErrorLog();
    const json = JSON.stringify(errors, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `swse-errors-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log('✅ Error log exported');
  }
};
