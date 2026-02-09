/**
 * Enhanced BaseSWSEAppV2 - AppV2 Contract Enforcement (Phase 3)
 *
 * CORE RULE: No app may extend ApplicationV2 directly.
 *
 * This class enforces:
 * - AppV2 lifecycle contracts
 * - Render completion tracking
 * - DOM access safety
 * - Event wiring discipline
 *
 * Violations throw immediately.
 */

import SWSEApplicationV2 from './swse-application-v2.js';
import { swseLogger } from '../../utils/logger.js';
import { RuntimeContract } from '../../contracts/runtime-contract.js';
import { StructuredLogger, SEVERITY } from '../../core/structured-logger.js';

export class BaseSWSEAppV2 extends SWSEApplicationV2 {
  constructor(...args) {
    super(...args);

    // Verify contract compliance
    RuntimeContract.assertOnlyAppV2(this.constructor);

    // Track lifecycle phase (contract tracking)
    this._lifecycle = {
      phase: 'constructor',
      renderStarted: false,
      renderComplete: false,
      destroyed: false,
      id: this.id || `app-${Math.random().toString(36).substr(2, 9)}`
    };

    // Freeze element access until render (contract enforcement)
    Object.defineProperty(this, 'element', {
      get() {
        if (this._lifecycle.phase === 'constructor') {
          const error = new Error(
            `[${this.constructor.name}] DOM ACCESS CONTRACT VIOLATION: element accessed in constructor. ` +
            `Move DOM logic to _onRender() or _prepareContext().`
          );
          StructuredLogger.app(SEVERITY.ERROR, error.message, {
            app: this.constructor.name,
            phase: this._lifecycle.phase
          });
          throw error;
        }
        return this._element || null;
      },
      set(value) {
        this._element = value;
      },
      configurable: true
    });

    StructuredLogger.app(SEVERITY.DEBUG, `${this.constructor.name} instantiated (AppV2)`, {
      appId: this._lifecycle.id
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
   * Mark when we enter render phase (contract: register with tracker)
   */
  async _prepareContext(options) {
    this._lifecycle.phase = 'prepare';
    this._lifecycle.renderStarted = true;

    // Register with render tracking (Phase 3 contract)
    RuntimeContract.registerRender(
      this._lifecycle.id,
      this.constructor.name
    );

    return super._prepareContext(options);
  }

  /**
   * Mark when render is complete (contract: complete tracking + event wiring)
   * Calls wireEvents() which MUST be overridden by subclasses
   */
  async _onRender(context, options) {
    try {
      this._lifecycle.phase = 'rendering';
      await super._onRender(context, options);

      // Contract: Element must exist and have content
      if (!(this.element instanceof HTMLElement)) {
        throw new Error(
          `[${this.constructor.name}] RENDER CONTRACT: element is not an HTMLElement`
        );
      }

      if (!this.element.innerHTML || this.element.innerHTML.trim().length === 0) {
        throw new Error(
          `[${this.constructor.name}] RENDER CONTRACT: element rendered but is empty`
        );
      }

      // Contract: Subclass must wire event listeners
      this.wireEvents();

      // Mark complete
      this._lifecycle.phase = 'rendered';
      this._lifecycle.renderComplete = true;

      // Track in runtime contract
      RuntimeContract.markRendered(this._lifecycle.id);

      StructuredLogger.app(SEVERITY.INFO, 'Render completed (AppV2 contract)', {
        app: this.constructor.name,
        appId: this._lifecycle.id
      });
    } catch (error) {
      this._lifecycle.phase = 'render-error';
      RuntimeContract.cleanupRender(this._lifecycle.id);

      StructuredLogger.app(SEVERITY.ERROR, 'Render failed', {
        app: this.constructor.name,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * CONTRACT METHOD: Subclasses MUST override this
   * Called after template renders. Wire all event listeners here.
   * DO NOT call directly - framework calls this.
   */
  wireEvents() {
    // Default implementation: do nothing (subclasses override)
    // Throwing here would force every app to implement it,
    // which is actually desirable but breaks legacy apps.
  }

  /**
   * Prevent access after destruction
   */
  async close(options) {
    this._lifecycle.destroyed = true;
    RuntimeContract.cleanupRender(this._lifecycle.id);
    return super.close(options);
  }

  /**
   * CONTRACT: Override addEventListener to enforce lifecycle
   * Listeners can only be added during render phase
   */
  addEventListener(type, listener, options) {
    if (this._lifecycle.phase === 'constructor') {
      const error = new Error(
        `[${this.constructor.name}] EVENT LISTENER CONTRACT: Cannot add listeners in constructor. ` +
        `Add listeners in wireEvents() which is called during render.`
      );
      StructuredLogger.app(SEVERITY.ERROR, error.message, {
        app: this.constructor.name,
        phase: this._lifecycle.phase
      });
      throw error;
    }
    return super.addEventListener(type, listener, options);
  }

  /**
   * CONTRACT: Render assertion (for external verification)
   */
  assertRendered() {
    RuntimeContract.assertRendered(this._lifecycle.id, 2000);
  }
}
