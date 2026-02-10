/**
 * Error Handler
 * Provides graceful error handling and recovery mechanisms
 * Enhanced with detailed Foundry/Forge error logging
 */
import { SWSELogger, swseLogger } from '../utils/logger.js';

export class ErrorHandler {
  constructor() {
    this._errorLog = [];
    this._maxLogSize = 100;
    this._criticalErrors = new Set();
    this._devMode = false;
  }

  /**
   * Initialize error handler with global hooks
   */
  initialize() {
    // Get devMode setting safely
    try {
      this._devMode = game.settings?.get('foundryvtt-swse', 'devMode') ?? false;
    } catch (err) {
      this._devMode = false;
    }

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

    SWSELogger.log('SWSE | Error handler initialized with enhanced logging');
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
  }

  /**
   * Mark an error type as critical
   * @param {string} errorType
   */
  markAsCritical(errorType) {
    this._criticalErrors.add(errorType);
  }

  /**
   * Run comprehensive validation checks (dev mode only)
   * Checks for common issues that might not throw errors but indicate problems
   */
  validateSystem() {
    if (!this._devMode) {return;}

    const issues = [];

    // Check Foundry integrity
    if (!game?.system) {
      issues.push({ severity: 'error', message: 'game.system is undefined' });
    }
    if (!game?.data?.system) {
      issues.push({ severity: 'error', message: 'game.data.system is undefined' });
    }

    // Check cache manager if available
    if (window.SWSE?.cacheManager) {
      try {
        const cacheStats = window.SWSE.cacheManager.getStats?.();
        if (cacheStats?.hitRate !== undefined && cacheStats.hitRate < 0.3) {
          issues.push({ severity: 'warn', message: `Cache hit rate low: ${(cacheStats.hitRate * 100).toFixed(1)}%` });
        }
      } catch (e) {
        issues.push({ severity: 'warn', message: 'Cache manager check failed: ' + e.message });
      }
    }

    // Check for memory issues
    if (performance?.memory) {
      const used = performance.memory.usedJSHeapSize;
      const limit = performance.memory.jsHeapSizeLimit;
      const percent = (used / limit) * 100;
      if (percent > 85) {
        issues.push({ severity: 'warn', message: `Memory usage critical: ${percent.toFixed(1)}%` });
      }
    }

    // Log results
    if (issues.length > 0) {
      console.group('%c⚠️  SYSTEM VALIDATION ISSUES (Dev Mode)', 'color: #ff9800; font-weight: bold; font-size: 14px');
      issues.forEach(issue => {
        const style = issue.severity === 'error' ? 'color: red; font-weight: bold' : 'color: orange';
        swseLogger.log(`%c[${issue.severity.toUpperCase()}]`, style);
        swseLogger.log('SWSE |', issue.message);
      });
      console.groupEnd();
    }
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
    this._devMode = game.settings?.get('foundryvtt-swse', 'devMode') ?? this._devMode;

    // Console logging with enhanced details
    const { error, context, foundryContext, systemContext, stack } = errorInfo;

    // Always log errors, but format based on devMode
    console.group('%c🚨 SWSE ERROR DETECTED', 'color: red; font-weight: bold; font-size: 14px');

    swseLogger.error('%cError Message:', 'color: orange; font-weight: bold');
    swseLogger.error('SWSE |', error?.message || 'Unknown error');

    swseLogger.error('%cError Type:', 'color: orange; font-weight: bold');
    swseLogger.error('SWSE |', error?.constructor?.name || 'Error');

    if (context.source) {
      swseLogger.error('%cSource:', 'color: orange; font-weight: bold');
      swseLogger.error('SWSE |', context.source);
    }

    if (context.location) {
      swseLogger.error('%cLocation:', 'color: orange; font-weight: bold');
      swseLogger.error('SWSE |', context.location);
    }

    if (context.filename) {
      swseLogger.error('%cFile:', 'color: orange; font-weight: bold');
      swseLogger.error('SWSE |', `${context.filename}:${context.lineno}:${context.colno}`);
    }

    // Stack trace (always show)
    if (stack) {
      swseLogger.error('%cStack Trace:', 'color: orange; font-weight: bold');
      swseLogger.error('SWSE |', stack);
    }

    // Detailed context (only in devMode)
    if (this._devMode) {
      console.group('%c📊 DETAILED CONTEXT', 'color: cyan; font-weight: bold');

      swseLogger.log('%cFoundry Context:', 'color: cyan; font-weight: bold');
      console.table(foundryContext);

      swseLogger.log('%cActive Modules:', 'color: cyan; font-weight: bold');
      console.table(systemContext.activeModules);

      swseLogger.log('%cPerformance:', 'color: cyan; font-weight: bold');
      swseLogger.log('SWSE |', systemContext.performance);

      if (systemContext.cacheStats) {
        swseLogger.log('%cCache Stats:', 'color: cyan; font-weight: bold');
        swseLogger.log('SWSE |', systemContext.cacheStats);
      }

      swseLogger.log('%cOpen Sheets:', 'color: cyan; font-weight: bold');
      console.table(foundryContext.openSheets);

      if (context.data) {
        swseLogger.log('%cAdditional Data:', 'color: cyan; font-weight: bold');
        swseLogger.log('SWSE |', context.data);
      }

      console.groupEnd();
    }

    swseLogger.log('%c💡 TIP:', 'color: yellow; font-weight: bold');
    swseLogger.log('SWSE | Enable Developer Mode in settings for more detailed error information');
    swseLogger.log('SWSE | Access error log: window.SWSE.errorHandler.getRecentErrors()');

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
    SWSELogger.error('SWSE | Critical error detected:', errorInfo);
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
    SWSELogger.error('SWSE | Error (handler not ready):', errorObj, context);
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
      SWSELogger.warn('Error handler not initialized');
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
      SWSELogger.warn('Error handler not initialized');
      return {};
    }
    const stats = window.SWSE.errorHandler.getStats();
    SWSELogger.log('%c📊 ERROR STATISTICS', 'color: cyan; font-weight: bold; font-size: 14px');
    console.table(stats);
    return stats;
  },

  /**
   * Clear error log
   */
  clear: () => {
    if (!window.SWSE?.errorHandler) {
      SWSELogger.warn('Error handler not initialized');
      return;
    }
    window.SWSE.errorHandler.clearLog();
    SWSELogger.log('✅ Error log cleared');
  },

  /**
   * Get full error log
   */
  all: () => {
    if (!window.SWSE?.errorHandler) {
      SWSELogger.warn('Error handler not initialized');
      return [];
    }
    return window.SWSE.errorHandler.getErrorLog();
  },

  /**
   * Export error log as JSON
   */
  export: () => {
    if (!window.SWSE?.errorHandler) {
      SWSELogger.warn('Error handler not initialized');
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
    SWSELogger.log('✅ Error log exported');
  }
};
