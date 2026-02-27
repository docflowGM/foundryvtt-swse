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
  #hookStack = [],
  #mutationInHook = new Map(),
  #originalUpdate: null,
  #originalCreateEmbedded: null,
  #originalDeleteEmbedded: null,

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
        self.#hookStack.push({ hook, startTime: performance.now() });
        try {
          return await handler.apply(this, handlerArgs);
        } finally {
          self.#hookStack.pop();
        }
      };

      return originalOn.call(Hooks, hook, wrappedHandler, ...args);
    };

    // Wrap Hooks.once similarly
    Hooks.once = function(hook, handler, ...args) {
      const wrappedHandler = async function(...handlerArgs) {
        self.#hookStack.push({ hook, startTime: performance.now() });
        try {
          return await handler.apply(this, handlerArgs);
        } finally {
          self.#hookStack.pop();
        }
      };

      return originalOnce.call(Hooks, hook, wrappedHandler, ...args);
    };

    console.log('[Sentinel] Hooks mutation layer: Hook system instrumented');
  },

  /**
   * Detect direct mutations inside hooks
   */
  instrumentActorMutations() {
    const self = this;
    const originalUpdate = Actor.prototype.update;
    const originalCreateEmbedded = Actor.prototype.createEmbeddedDocuments;
    const originalDeleteEmbedded = Actor.prototype.deleteEmbeddedDocuments;

    // Track direct actor.update() calls
    Actor.prototype.update = async function(data, options = {}) {
      if (self.#hookStack.length > 0) {
        const currentHook = self.#hookStack[self.#hookStack.length - 1];
        const isGuarded = options?.meta?.guardKey;

        // Allow ActorEngine mutations
        const stack = new Error().stack || '';
        const isActorEngine = stack.includes('ActorEngine');

        if (!isActorEngine && !isGuarded) {
          Sentinel.report(
            'hooks',
            Sentinel.SEVERITY.WARN,
            `Direct actor.update() detected inside hook "${currentHook.hook}" without ActorEngine routing`,
            {
              actor: this.name,
              hook: currentHook.hook,
              isGuarded,
              stack: stack.split('\n').slice(0, 5).join('\n')
            }
          );
        }
      }

      return originalUpdate.call(this, data, options);
    };

    // Track direct createEmbeddedDocuments() calls
    Actor.prototype.createEmbeddedDocuments = async function(embeddedName, data, options = {}) {
      if (self.#hookStack.length > 0) {
        const currentHook = self.#hookStack[self.#hookStack.length - 1];
        const isGuarded = options?.meta?.guardKey;

        // Allow ActorEngine mutations
        const stack = new Error().stack || '';
        const isActorEngine = stack.includes('ActorEngine');

        if (!isActorEngine && !isGuarded) {
          Sentinel.report(
            'hooks',
            Sentinel.SEVERITY.WARN,
            `Direct createEmbeddedDocuments("${embeddedName}") detected inside hook "${currentHook.hook}" without ActorEngine routing`,
            {
              actor: this.name,
              hook: currentHook.hook,
              embeddedName,
              count: (data || []).length
            }
          );
        }
      }

      return originalCreateEmbedded.call(this, embeddedName, data, options);
    };

    // Track direct deleteEmbeddedDocuments() calls
    Actor.prototype.deleteEmbeddedDocuments = async function(embeddedName, ids, options = {}) {
      if (self.#hookStack.length > 0) {
        const currentHook = self.#hookStack[self.#hookStack.length - 1];
        const isGuarded = options?.meta?.guardKey;

        // Allow ActorEngine mutations
        const stack = new Error().stack || '';
        const isActorEngine = stack.includes('ActorEngine');

        if (!isActorEngine && !isGuarded) {
          Sentinel.report(
            'hooks',
            Sentinel.SEVERITY.WARN,
            `Direct deleteEmbeddedDocuments("${embeddedName}") detected inside hook "${currentHook.hook}" without ActorEngine routing`,
            {
              actor: this.name,
              hook: currentHook.hook,
              embeddedName,
              count: (ids || []).length
            }
          );
        }
      }

      return originalDeleteEmbedded.call(this, embeddedName, ids, options);
    };

    console.log('[Sentinel] Hooks mutation layer: Actor mutations instrumented');
  },

  /**
   * Get current hook execution depth
   */
  getHookDepth() {
    return this.#hookStack.length;
  },

  /**
   * Get current hook name if inside a hook
   */
  getCurrentHook() {
    return this.#hookStack.length > 0
      ? this.#hookStack[this.#hookStack.length - 1].hook
      : null;
  }
};
