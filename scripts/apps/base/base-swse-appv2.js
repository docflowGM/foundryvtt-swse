/**
 * BaseSWSEAppV2 - V13-Compliant AppV2 Contract Enforcement
 *
 * CORE RULE: No app may extend ApplicationV2 directly.
 *
 * This class enforces:
 * - AppV2 lifecycle contracts
 * - Render completion tracking
 * - DOM access safety (through safeQuery/safeQueryAll)
 * - Event wiring discipline (wireEvents called post-render)
 *
 * No invalid app-level event semantics. Use onRoot/onContent from parent.
 */

import SWSEApplicationV2 from "/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { RuntimeContract } from "/systems/foundryvtt-swse/scripts/contracts/runtime-contract.js";
import { StructuredLogger, SEVERITY } from "/systems/foundryvtt-swse/scripts/core/structured-logger.js";

/**
 * Phase enum for render lifecycle
 */
const RENDER_PHASE = {
  CREATED: 'created',
  PREPARING: 'preparing',
  RENDERING: 'rendering',
  RENDERED: 'rendered',
  DESTROYED: 'destroyed',
  ERROR: 'error'
};

export class BaseSWSEAppV2 extends SWSEApplicationV2 {
  constructor(...args) {
    super(...args);

    // Verify contract compliance
    RuntimeContract.assertOnlyAppV2(this.constructor);

    // Track lifecycle phase (contract tracking)
    this._lifecycle = {
      phase: RENDER_PHASE.CREATED,
      id: this.id || `app-${Math.random().toString(36).substr(2, 9)}`
    };

    StructuredLogger.app(SEVERITY.DEBUG, `${this.constructor.name} instantiated (AppV2)`, {
      appId: this._lifecycle.id
    });
  }

  /**
   * Safe query within current render context.
   * Returns null if called outside render phase.
   */
  safeQuery(selector) {
    if (this._lifecycle.phase !== RENDER_PHASE.RENDERING && this._lifecycle.phase !== RENDER_PHASE.RENDERED) {
      swseLogger.warn(
        `[${this.constructor.name}] safeQuery() called outside render phase. ` +
        `Current phase: ${this._lifecycle.phase}`
      );
      return null;
    }
    return this.element?.querySelector(selector) ?? null;
  }

  /**
   * Safe query all within current render context.
   * Returns empty array if called outside render phase.
   */
  safeQueryAll(selector) {
    if (this._lifecycle.phase !== RENDER_PHASE.RENDERING && this._lifecycle.phase !== RENDER_PHASE.RENDERED) {
      swseLogger.warn(
        `[${this.constructor.name}] safeQueryAll() called outside render phase. ` +
        `Current phase: ${this._lifecycle.phase}`
      );
      return [];
    }
    return Array.from(this.element?.querySelectorAll(selector) ?? []);
  }

  /**
   * Mark when we enter prepare phase (before render).
   */
  async _prepareContext(options) {
    this._lifecycle.phase = RENDER_PHASE.PREPARING;

    // Register with render tracking
    RuntimeContract.registerRender(
      this._lifecycle.id,
      this.constructor.name
    );

    return super._prepareContext(options);
  }

  /**
   * V13 AppV2 render lifecycle.
   * After super._onRender completes, element exists and template is rendered.
   * Contract: wireEvents() MUST be called only after render completes.
   * Errors rethrow to prevent zombie apps.
   */
  async _onRender(context, options) {
    try {
      this._lifecycle.phase = RENDER_PHASE.RENDERING;
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

      // Contract: Subclass must wire event listeners (after render)
      this.wireEvents();

      // Mark complete
      this._lifecycle.phase = RENDER_PHASE.RENDERED;

      // Track in runtime contract
      RuntimeContract.markRendered(this._lifecycle.id);

      StructuredLogger.app(SEVERITY.INFO, 'Render completed (AppV2 contract)', {
        app: this.constructor.name,
        appId: this._lifecycle.id
      });
    } catch (error) {
      this._lifecycle.phase = RENDER_PHASE.ERROR;
      RuntimeContract.cleanupRender(this._lifecycle.id);

      StructuredLogger.app(SEVERITY.ERROR, 'Render failed', {
        app: this.constructor.name,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * CONTRACT METHOD: Subclasses MUST override this.
   * Called after template renders. Wire all event listeners here using onRoot/onContent.
   * DO NOT call directly - framework calls this after _onRender completes.
   *
   * Example:
   *   wireEvents() {
   *     this.onRoot('click', '[data-action="attack"]', (ev, el) => this.attackHandler(ev));
   *   }
   */
  wireEvents() {
    // Default implementation: do nothing (subclasses override)
  }

  /**
   * Prevent access after destruction
   */
  async close(options) {
    this._lifecycle.phase = RENDER_PHASE.DESTROYED;
    RuntimeContract.cleanupRender(this._lifecycle.id);
    return super.close(options);
  }

  /**
   * CONTRACT: Render assertion (for external verification).
   * Verifies render completed within timeout.
   */
  assertRendered(timeout = 2000) {
    RuntimeContract.assertRendered(this._lifecycle.id, timeout);
  }
}
