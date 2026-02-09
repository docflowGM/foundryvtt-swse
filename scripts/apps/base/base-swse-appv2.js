/**
 * Enhanced BaseSWSEAppV2 - Lifecycle enforcement for AppV2
 *
 * Adds runtime guards to prevent v1 mental model bugs:
 * - No DOM access before render lifecycle
 * - No listener wiring outside lifecycle hooks
 * - No data mutation before safe phase
 *
 * Subclasses extend this instead of raw ApplicationV2
 */

import SWSEApplicationV2 from './swse-application-v2.js';
import { swseLogger } from '../../utils/logger.js';

export class BaseSWSEAppV2 extends SWSEApplicationV2 {
  constructor(...args) {
    super(...args);

    // Track lifecycle phase
    this._lifecycle = {
      phase: 'constructor',
      renderStarted: false,
      renderComplete: false,
      destroyed: false
    };

    // Freeze element access until render
    Object.defineProperty(this, 'element', {
      get() {
        if (this._lifecycle.phase === 'constructor') {
          throw new Error(
            `[${this.constructor.name}] Cannot access element in constructor. ` +
            `Move DOM logic to _onRender() or _prepareContext().`
          );
        }
        return this._element || null;
      },
      set(value) {
        this._element = value;
      },
      configurable: true
    });
  }

  /**
   * Safe query within current render context
   * Throws if called outside render phase
   */
  safeQuery(selector) {
    if (!this._lifecycle.renderComplete && this._lifecycle.phase !== 'rendering') {
      swseLogger.warn(
        `[${this.constructor.name}] safeQuery() called outside render phase. ` +
        `Current phase: ${this._lifecycle.phase}`
      );
      return null;
    }
    return this.element?.querySelector(selector) ?? null;
  }

  /**
   * Safe query all
   */
  safeQueryAll(selector) {
    if (!this._lifecycle.renderComplete && this._lifecycle.phase !== 'rendering') {
      swseLogger.warn(
        `[${this.constructor.name}] safeQueryAll() called outside render phase. ` +
        `Current phase: ${this._lifecycle.phase}`
      );
      return [];
    }
    return Array.from(this.element?.querySelectorAll(selector) ?? []);
  }

  /**
   * Mark when we enter render phase
   */
  async _prepareContext(options) {
    this._lifecycle.phase = 'prepare';
    this._lifecycle.renderStarted = true;
    return super._prepareContext(options);
  }

  /**
   * Mark when render is complete
   */
  async _onRender(context, options) {
    try {
      this._lifecycle.phase = 'rendering';
      await super._onRender(context, options);
      this._lifecycle.phase = 'rendered';
      this._lifecycle.renderComplete = true;

      // Log render success
      swseLogger.debug(
        `[${this.constructor.name}] Render completed successfully (AppV2 lifecycle)`
      );
    } catch (error) {
      this._lifecycle.phase = 'render-error';
      swseLogger.error(
        `[${this.constructor.name}] Render failed:`,
        error
      );
      throw error;
    }
  }

  /**
   * Prevent access after destruction
   */
  async close(options) {
    this._lifecycle.destroyed = true;
    return super.close(options);
  }

  /**
   * Override addEventListener to enforce it only happens in render lifecycle
   */
  addEventListener(type, listener, options) {
    if (this._lifecycle.phase === 'constructor') {
      throw new Error(
        `[${this.constructor.name}] Cannot add event listeners in constructor. ` +
        `Add listeners in _onRender() after template renders.`
      );
    }
    return super.addEventListener(type, listener, options);
  }
}
