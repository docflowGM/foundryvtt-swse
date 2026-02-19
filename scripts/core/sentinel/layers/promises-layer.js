/**
 * Promises Layer - Catches unhandled promise rejections and errors
 *
 * Monitors:
 * - Unhandled promise rejections
 * - Global runtime errors
 * - Stack trace analysis for origin
 */

import { Sentinel } from '../sentinel-core.js';

export const PromisesLayer = {
  /**
   * Initialize promise monitoring
   */
  init() {
    this.attachUnhandledRejectionHandler();
    this.attachGlobalErrorHandler();
  },

  /**
   * Catch unhandled promise rejections
   */
  attachUnhandledRejectionHandler() {
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const isSWSE = this.isFromSWSECode(reason);

      Sentinel.report(
        'promises',
        isSWSE ? Sentinel.SEVERITY.ERROR : Sentinel.SEVERITY.WARN,
        'Unhandled promise rejection',
        {
          message: reason?.message || String(reason),
          stack: reason?.stack?.substring(0, 300),
          isSWSECode: isSWSE
        }
      );
    });
  },

  /**
   * Catch global runtime errors
   */
  attachGlobalErrorHandler() {
    const originalOnError = window.onerror;

    window.onerror = (msg, url, line, col, error) => {
      const isSWSE = url && url.includes('systems/foundryvtt-swse');

      Sentinel.report(
        'promises',
        isSWSE ? Sentinel.SEVERITY.ERROR : Sentinel.SEVERITY.WARN,
        'Global error caught',
        {
          message: msg,
          file: url,
          line,
          col,
          isSWSECode: isSWSE,
          stack: error?.stack?.substring(0, 300)
        }
      );

      // Call original handler if it existed
      if (originalOnError) {
        return originalOnError(msg, url, line, col, error);
      }
    };
  },

  /**
   * Determine if error originated from SWSE code
   * @private
   */
  isFromSWSECode(error) {
    if (!error) return false;
    if (!error.stack) return false;

    return error.stack.includes('systems/foundryvtt-swse');
  }
};
