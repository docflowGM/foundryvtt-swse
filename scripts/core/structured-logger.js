/**
 * Structured Logger with Domain Tags
 *
 * Provides consistent logging across all SWSE systems with:
 * - Domain-based prefixes (CHARGEN, SHEET, DATA, etc)
 * - Consistent payload structure
 * - Severity levels
 * - Correlation support
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const DOMAINS = {
  CHARGEN: 'CHARGEN',
  SHEET: 'SHEET',
  DATA: 'DATA',
  CSS: 'CSS',
  COMPENDIUM: 'COMPENDIUM',
  MIGRATION: 'MIGRATION',
  ENGINE: 'ENGINE',
  PROGRESSION: 'PROGRESSION',
  TALENTS: 'TALENTS',
  COMBAT: 'COMBAT',
  SUGGESTIONS: 'SUGGESTIONS',
  CORE: 'CORE',
  APP: 'APP',
  HOOK: 'HOOK'
};

const SEVERITY = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

export class StructuredLogger {
  /**
   * Log with domain and context
   */
  static log(domain, severity, message, context = {}) {
    if (!DOMAINS[domain]) {
      console.warn(`StructuredLogger: Unknown domain "${domain}"`);
      return;
    }

    const payload = {
      domain,
      severity,
      message,
      timestamp: new Date().toISOString(),
      ...context
    };

    const prefix = `[${domain}] (${severity})`;
    const logMethod = this._getLogMethod(severity);

    try {
      swseLogger[logMethod](prefix, message, context);
    } catch (e) {
      console.error('StructuredLogger error:', e);
    }
  }

  /**
   * Convenience methods for each domain
   */
  static chargen(severity, message, context = {}) {
    this.log(DOMAINS.CHARGEN, severity, message, { phase: 'chargen', ...context });
  }

  static sheet(severity, message, context = {}) {
    this.log(DOMAINS.SHEET, severity, message, { phase: 'sheet', ...context });
  }

  static data(severity, message, context = {}) {
    this.log(DOMAINS.DATA, severity, message, { phase: 'data', ...context });
  }

  static css(severity, message, context = {}) {
    this.log(DOMAINS.CSS, severity, message, { phase: 'css', ...context });
  }

  static compendium(severity, message, context = {}) {
    this.log(DOMAINS.COMPENDIUM, severity, message, { phase: 'compendium', ...context });
  }

  static migration(severity, message, context = {}) {
    this.log(DOMAINS.MIGRATION, severity, message, { phase: 'migration', ...context });
  }

  static engine(severity, message, context = {}) {
    this.log(DOMAINS.ENGINE, severity, message, { phase: 'engine', ...context });
  }

  static progression(severity, message, context = {}) {
    this.log(DOMAINS.PROGRESSION, severity, message, { phase: 'progression', ...context });
  }

  static talents(severity, message, context = {}) {
    this.log(DOMAINS.TALENTS, severity, message, { phase: 'talents', ...context });
  }

  static combat(severity, message, context = {}) {
    this.log(DOMAINS.COMBAT, severity, message, { phase: 'combat', ...context });
  }

  static suggestions(severity, message, context = {}) {
    this.log(DOMAINS.SUGGESTIONS, severity, message, { phase: 'suggestions', ...context });
  }

  static core(severity, message, context = {}) {
    this.log(DOMAINS.CORE, severity, message, { phase: 'core', ...context });
  }

  static app(severity, message, context = {}) {
    this.log(DOMAINS.APP, severity, message, { phase: 'app', ...context });
  }

  static hook(severity, message, context = {}) {
    this.log(DOMAINS.HOOK, severity, message, { phase: 'hook', ...context });
  }

  /**
   * Map severity to console method
   */
  static _getLogMethod(severity) {
    switch (severity) {
      case SEVERITY.DEBUG:
        return 'debug';
      case SEVERITY.INFO:
        return 'info';
      case SEVERITY.WARN:
        return 'warn';
      case SEVERITY.ERROR:
        return 'error';
      default:
        return 'log';
    }
  }

  /**
   * Assertion logger (logs with stack trace)
   */
  static assert(domain, condition, errorMessage, context = {}) {
    if (condition) return true;

    const error = new Error(errorMessage);
    this.log(domain, SEVERITY.ERROR, errorMessage, {
      ...context,
      stack: error.stack
    });

    return false;
  }

  /**
   * Performance checkpoint logger
   */
  static checkpoint(domain, phase, duration = null, context = {}) {
    const message = duration
      ? `${phase} completed in ${duration}ms`
      : `${phase} checkpoint`;

    this.log(domain, SEVERITY.DEBUG, message, {
      phase,
      duration,
      ...context
    });
  }
}

// Export severity constants for type safety
export { DOMAINS, SEVERITY };
