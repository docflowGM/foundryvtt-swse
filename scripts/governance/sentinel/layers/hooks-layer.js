/**
 * Hooks Layer - Monitors hook firing frequency and patterns
 *
 * Detects:
 * - Excessive hook calls in single render cycle (> 500)
 * - Rapid repeated calls (e.g., actor update > 50/sec)
 * - Infinite hook loops
 * - Unexpected hook frequencies
 */

import { Sentinel } from './sentinel-core.js';

export const HooksLayer = {
  #hookCallCounts = new Map(),
  #lastRenderCycleTime = 0,
  #renderCycleWindow = 16, // ~60fps

  /**
   * Initialize hook monitoring
   */
  init() {
    this.wrapHookSystem();
  },

  /**
   * Wrap Hooks.call to track frequency
   * Non-invasive wrapper around existing hook system
   */
  wrapHookSystem() {
    const originalCall = Hooks.call;

    Hooks.call = (hook, ...args) => {
      this.trackHookCall(hook);
      return originalCall.apply(Hooks, [hook, ...args]);
    };

    Hooks.callAll = function(hook, ...args) {
      this.trackHookCall(hook);
      return originalCall.apply(Hooks, [hook, ...args]);
    }.bind(this);
  },

  /**
   * Track a hook call
   * @private
   */
  trackHookCall(hookName) {
    const now = performance.now();

    // Reset counts if outside render cycle window
    if (now - this.#lastRenderCycleTime > this.#renderCycleWindow) {
      this.#hookCallCounts.clear();
      this.#lastRenderCycleTime = now;
    }

    // Increment counter
    const count = (this.#hookCallCounts.get(hookName) || 0) + 1;
    this.#hookCallCounts.set(hookName, count);

    // Check for excessive frequency
    if (hookName === 'updateActor' && count > 50) {
      Sentinel.report('hooks', Sentinel.SEVERITY.ERROR, 'Excessive updateActor calls detected', {
        hook: hookName,
        callsInWindow: count,
        windowMs: this.#renderCycleWindow
      });
    }

    if (count > 500) {
      Sentinel.report('hooks', Sentinel.SEVERITY.ERROR, 'Excessive hook call frequency', {
        hook: hookName,
        callsInWindow: count,
        windowMs: this.#renderCycleWindow
      });
    }

    // Warn on suspicious patterns
    if (count > 100 && count % 50 === 0) {
      Sentinel.report('hooks', Sentinel.SEVERITY.WARN, 'High hook call frequency', {
        hook: hookName,
        callsInWindow: count
      });
    }
  }
};
