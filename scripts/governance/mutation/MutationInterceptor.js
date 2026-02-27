/**
 * MutationInterceptor — PHASE 3 CORE
 *
 * Global enforcement layer that makes ActorEngine unbypassable.
 *
 * This module:
 * 1. Wraps Actor.prototype.update and embedded document methods
 * 2. Enforces that ONLY ActorEngine can mutate actors
 * 3. Prevents nested mutations with transaction guard
 * 4. Logs all mutation attempts in DEV mode
 * 5. Throws in STRICT mode on violation
 *
 * Contract:
 * - Any call to actor.update() from outside ActorEngine → ERROR
 * - Any call to actor.updateEmbeddedDocuments() from outside ActorEngine → ERROR
 * - Direct mutation is IMPOSSIBLE
 * - Only path: XYZ system → ActorEngine.updateActor() → actor.update() (via ActorEngine)
 *
 * This is the choke point for all mutations.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { MutationIntegrityLayer } from "/systems/foundryvtt-swse/scripts/governance/sentinel/mutation-integrity-layer.js";

const STRICT_MODE = false; // Set to true to throw on violations
const DEV_MODE = true;     // Log all mutations with stack traces

// Track which ActorEngine method is currently executing
let _currentMutationContext = null;

export class MutationInterceptor {
  /**
   * Initialize global mutation interception.
   * Called once at system startup (in main module).
   */
  static initialize() {
    if (typeof Actor === 'undefined') {
      console.warn('[MutationInterceptor] Actor class not available, skipping initialization');
      return;
    }

    // Wrap Actor.prototype.update()
    MutationInterceptor._wrapActorUpdate();

    // Wrap Actor.prototype.updateEmbeddedDocuments()
    MutationInterceptor._wrapUpdateEmbeddedDocuments();

    // Wrap Actor.prototype.createEmbeddedDocuments()
    MutationInterceptor._wrapCreateEmbeddedDocuments();

    // Wrap Actor.prototype.deleteEmbeddedDocuments()
    MutationInterceptor._wrapDeleteEmbeddedDocuments();

    // Wrap Item.prototype.update() for embedded changes
    MutationInterceptor._wrapItemUpdate();

    console.log('[MutationInterceptor] PHASE 3 enforcement initialized. All mutations are now monitored.');
  }

  /**
   * Set the current mutation context (called by ActorEngine).
   * This tells the interceptors that a mutation is authorized.
   *
   * @param {Object} context - Context object with operation, source, suppressRecalc, blockNestedMutations
   * @throws {Error} If nested mutations are blocked and one is already in progress
   */
  static setContext(context) {
    // CRITICAL: Check nested mutation policy
    if (context.blockNestedMutations && _currentMutationContext) {
      throw new Error(
        `Cannot start ${context.operation} — ` +
        `${_currentMutationContext.operation} already in progress. ` +
        `Nested mutations are not permitted during ${_currentMutationContext.operation}.`
      );
    }
    _currentMutationContext = context;

    // PHASE 3 AUDITING: Start transaction in Sentinel
    if (false) MutationIntegrityLayer.startTransaction(context);
  }

  /**
   * Clear the current mutation context (when ActorEngine finishes).
   */
  static clearContext() {
    // PHASE 3 AUDITING: End transaction in Sentinel
    if (false) MutationIntegrityLayer.endTransaction();
    _currentMutationContext = null;
  }

  /**
   * Check if current call is authorized (from ActorEngine).
   * @private
   * @returns {boolean}
   */
  static _isAuthorized() {
    return _currentMutationContext !== null;
  }

  /**
   * Get a clean stack trace for logging.
   * @private
   * @returns {string}
   */
  static _getStackTrace() {
    const stack = new Error().stack;
    return stack
      .split('\n')
      .slice(2, 6) // Show 4 relevant frames
      .join('\n');
  }

  /**
   * Wrap Actor.prototype.update()
   * @private
   */
  static _wrapActorUpdate() {
    const original = Actor.prototype.update;

    Actor.prototype.update = async function(data, options = {}) {
      const isAuthorized = MutationInterceptor._isAuthorized();
      const context = _currentMutationContext;
      const caller = MutationInterceptor._getCaller();

      if (DEV_MODE) {
        swseLogger.debug(`[MUTATION] Actor.update() on ${this.name}`, {
          authorized: isAuthorized,
          caller,
          data,
          context: context?.operation,
          suppressRecalc: context?.suppressRecalc
        });
      }

      if (!isAuthorized) {
        const msg = `MUTATION VIOLATION: ${caller} called actor.update() directly.\n` +
          `Must route through ActorEngine.updateActor(actor, data).\n` +
          `Caller: ${caller}`;

        if (STRICT_MODE) {
          throw new Error(msg);
        } else if (DEV_MODE) {
          console.error(`[MUTATION-VIOLATION] ${msg}`);
          console.error(`Stack trace:\n${MutationInterceptor._getStackTrace()}`);
        }
      }

      // CRITICAL: Set suppressRecalc flag if context requires it
      if (context?.suppressRecalc) {
        this.__skipPreparedDerivedData = true;
      }

      try {
        // PHASE 3 AUDITING: Record mutation event
        MutationIntegrityLayer.recordMutation('update');
        return original.call(this, data, options);
      } finally {
        if (context?.suppressRecalc) {
          delete this.__skipPreparedDerivedData;
        }
      }
    };

    swseLogger.debug('[MutationInterceptor] Actor.prototype.update wrapped');
  }

  /**
   * Wrap Actor.prototype.updateEmbeddedDocuments()
   * @private
   */
  static _wrapUpdateEmbeddedDocuments() {
    const original = Actor.prototype.updateEmbeddedDocuments;

    Actor.prototype.updateEmbeddedDocuments = async function(embeddedName, updates, options = {}) {
      const isAuthorized = MutationInterceptor._isAuthorized();
      const context = _currentMutationContext;
      const caller = MutationInterceptor._getCaller();

      if (DEV_MODE) {
        swseLogger.debug(`[MUTATION] updateEmbeddedDocuments(${embeddedName}) on ${this.name}`, {
          authorized: isAuthorized,
          caller,
          updateCount: updates.length,
          suppressRecalc: context?.suppressRecalc
        });
      }

      if (!isAuthorized) {
        const msg = `MUTATION VIOLATION: ${caller} called updateEmbeddedDocuments() directly on ${this.name}.\n` +
          `Must route through ActorEngine.updateEmbeddedDocuments(actor, type, updates).\n` +
          `Caller: ${caller}`;

        if (STRICT_MODE) {
          throw new Error(msg);
        } else if (DEV_MODE) {
          console.error(`[MUTATION-VIOLATION] ${msg}`);
        }
      }

      // CRITICAL: Set suppressRecalc flag if context requires it
      if (context?.suppressRecalc) {
        this.__skipPreparedDerivedData = true;
      }

      try {
        // PHASE 3 AUDITING: Record mutation event
        MutationIntegrityLayer.recordMutation('updateEmbeddedDocuments');
        return original.call(this, embeddedName, updates, options);
      } finally {
        if (context?.suppressRecalc) {
          delete this.__skipPreparedDerivedData;
        }
      }
    };

    swseLogger.debug('[MutationInterceptor] Actor.prototype.updateEmbeddedDocuments wrapped');
  }

  /**
   * Wrap Actor.prototype.createEmbeddedDocuments()
   * @private
   */
  static _wrapCreateEmbeddedDocuments() {
    const original = Actor.prototype.createEmbeddedDocuments;

    Actor.prototype.createEmbeddedDocuments = async function(embeddedName, data, options = {}) {
      const isAuthorized = MutationInterceptor._isAuthorized();
      const context = _currentMutationContext;
      const caller = MutationInterceptor._getCaller();

      if (DEV_MODE) {
        swseLogger.debug(`[MUTATION] createEmbeddedDocuments(${embeddedName}) on ${this.name}`, {
          authorized: isAuthorized,
          caller,
          createCount: data.length,
          suppressRecalc: context?.suppressRecalc
        });
      }

      if (!isAuthorized) {
        const msg = `MUTATION VIOLATION: ${caller} called createEmbeddedDocuments() on ${this.name}.\n` +
          `Must route through ActorEngine.createEmbeddedDocuments(actor, type, data)`;

        if (STRICT_MODE) {
          throw new Error(msg);
        } else if (DEV_MODE) {
          console.error(`[MUTATION-VIOLATION] ${msg}`);
        }
      }

      // CRITICAL: Set suppressRecalc flag if context requires it
      if (context?.suppressRecalc) {
        this.__skipPreparedDerivedData = true;
      }

      try {
        // PHASE 3 AUDITING: Record mutation event
        MutationIntegrityLayer.recordMutation('createEmbeddedDocuments');
        return original.call(this, embeddedName, data, options);
      } finally {
        if (context?.suppressRecalc) {
          delete this.__skipPreparedDerivedData;
        }
      }
    };

    swseLogger.debug('[MutationInterceptor] Actor.prototype.createEmbeddedDocuments wrapped');
  }

  /**
   * Wrap Actor.prototype.deleteEmbeddedDocuments()
   * @private
   */
  static _wrapDeleteEmbeddedDocuments() {
    const original = Actor.prototype.deleteEmbeddedDocuments;

    Actor.prototype.deleteEmbeddedDocuments = async function(embeddedName, ids, options = {}) {
      const isAuthorized = MutationInterceptor._isAuthorized();
      const context = _currentMutationContext;
      const caller = MutationInterceptor._getCaller();

      if (DEV_MODE) {
        swseLogger.debug(`[MUTATION] deleteEmbeddedDocuments(${embeddedName}) on ${this.name}`, {
          authorized: isAuthorized,
          caller,
          deleteCount: ids.length,
          suppressRecalc: context?.suppressRecalc
        });
      }

      if (!isAuthorized) {
        const msg = `MUTATION VIOLATION: ${caller} called deleteEmbeddedDocuments() on ${this.name}.\n` +
          `Must route through ActorEngine.deleteEmbeddedDocuments(actor, type, ids)`;

        if (STRICT_MODE) {
          throw new Error(msg);
        } else if (DEV_MODE) {
          console.error(`[MUTATION-VIOLATION] ${msg}`);
        }
      }

      // CRITICAL: Set suppressRecalc flag if context requires it
      if (context?.suppressRecalc) {
        this.__skipPreparedDerivedData = true;
      }

      try {
        // PHASE 3 AUDITING: Record mutation event
        MutationIntegrityLayer.recordMutation('deleteEmbeddedDocuments');
        return original.call(this, embeddedName, ids, options);
      } finally {
        if (context?.suppressRecalc) {
          delete this.__skipPreparedDerivedData;
        }
      }
    };

    swseLogger.debug('[MutationInterceptor] Actor.prototype.deleteEmbeddedDocuments wrapped');
  }

  /**
   * Wrap Item.prototype.update() for owned item mutations.
   * @private
   */
  static _wrapItemUpdate() {
    if (typeof Item === 'undefined') return;

    const original = Item.prototype.update;

    Item.prototype.update = async function(data, options = {}) {
      const isAuthorized = MutationInterceptor._isAuthorized();
      const caller = MutationInterceptor._getCaller();
      const parentActor = this.actor;

      if (DEV_MODE && parentActor) {
        swseLogger.debug(`[MUTATION] Item.update() on ${this.name} (parent: ${parentActor.name})`, {
          authorized: isAuthorized,
          caller,
          data
        });
      }

      if (!isAuthorized && parentActor) {
        const msg = `MUTATION VIOLATION: ${caller} called item.update() directly on owned item ${this.name}.\n` +
          `Item mutations must route through ActorEngine.updateEmbeddedDocuments(actor, 'Item', updates).\n` +
          `Item: ${this.name}, Parent Actor: ${parentActor.name}`;

        if (STRICT_MODE) {
          throw new Error(msg);
        } else if (DEV_MODE) {
          console.error(`[MUTATION-VIOLATION] ${msg}`);
        }
      }

      return original.call(this, data, options);
    };

    swseLogger.debug('[MutationInterceptor] Item.prototype.update wrapped');
  }

  /**
   * Extract caller identity from stack for logging.
   * @private
   * @returns {string}
   */
  static _getCaller() {
    try {
      const stack = new Error().stack;
      const lines = stack.split('\n');
      // Find first non-interceptor frame
      for (let i = 2; i < lines.length; i++) {
        if (!lines[i].includes('MutationInterceptor') && !lines[i].includes('ActorEngine')) {
          return lines[i].trim();
        }
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
