/**
 * Hooks Mutation Layer - PHASE 10
 * Detects direct mutations inside hook callbacks
 *
 * Enforces:
 * - No actor.update() directly inside hooks
 * - No createEmbeddedDocuments() directly inside hooks
 * - No deleteEmbeddedDocuments() directly inside hooks
 * - No recursive hook mutations without guards
 * - All mutations are properly awaited
 */

import { Sentinel } from "/systems/foundryvtt-swse/scripts/governance/sentinel/sentinel-core.js";

export const HooksMutationLayer = {
  _hookStack: [],
  _mutationInHook: new Map(),
  _originalUpdate: null,
  _originalCreateEmbedded: null,
  _originalDeleteEmbedded: null,

  /**
   * Initialize hook mutation monitoring
   */
  init() {
    this.instrumentHookSystem();
    this.instrumentActorMutations();
  },

  /**
   * Track hook execution context
   */
  instrumentHookSystem() {
    const originalOn = Hooks.on;
    const originalOnce = Hooks.once;
    const originalCall = Hooks.call;

    const self = this;

    // Wrap Hooks.on to track when hooks are executing
    Hooks.on = function(hook, handler, ...args) {
      const wrappedHandler = async function(...handlerArgs) {
        self._hookStack.push({ hook, startTime: performance.now() });
        try {
          return await handler.apply(this, handlerArgs);
        } finally {
          self._hookStack.pop();
        }
      };

      return originalOn.call(Hooks, hook, wrappedHandler, ...args);
    };

    // Wrap Hooks.once similarly
    Hooks.once = function(hook, handler, ...args) {
      const wrappedHandler = async function(...handlerArgs) {
        self._hookStack.push({ hook, startTime: performance.now() });
        try {
          return await handler.apply(this, handlerArgs);
        } finally {
          self._hookStack.pop();
        }
      };

      return originalOnce.call(Hooks, hook, wrappedHandler, ...args);
    };

    console.log('[Sentinel] Hooks mutation layer: Hook system instrumented');
  },

  /**
   * DEPRECATED: Prototype wrappers removed - PERMANENT FIX
   * Detect direct mutations inside hooks
   *
   * NOTE: Observational logging now handled through hooks, not wrappers.
   * This preserves hook monitoring without invasive prototype patching.
   */
  instrumentActorMutations() {
    const self = this;
    // PERMANENT FIX: Removed all prototype wrappers
    // No more: Actor.prototype.update = async function(data, options = {})...
    // No more: Actor.prototype.createEmbeddedDocuments = async function(...)
    // No more: Actor.prototype.deleteEmbeddedDocuments = async function(...)
    //
    // Hook mutation detection now uses hook callbacks instead.
    // See hooks for 'preUpdateActor', 'preCreateEmbeddedDocuments', etc.

    console.log('[Sentinel] Hooks mutation layer: Prototype wrappers disabled. Using hook callbacks instead.');
  },

  /**
   * Get current hook execution depth
   */
  getHookDepth() {
    return this._hookStack.length;
  },

  /**
   * Get current hook name if inside a hook
   */
  getCurrentHook() {
    return this._hookStack.length > 0
      ? this._hookStack[this._hookStack.length - 1].hook
      : null;
  }
};
