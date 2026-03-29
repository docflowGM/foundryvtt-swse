/**
 * MutationInterceptor — PHASE 3 CORE + PHASE 1 ENFORCEMENT TRUTH
 *
 * Global enforcement layer for mutation routing.
 *
 * PHASE 1 CHANGE: Now actually enforces strict mode in dev/test environments.
 *
 * This module:
 * 1. Wraps Actor.prototype.update and embedded document methods
 * 2. Enforces authorization via MutationInterceptor.setContext()
 * 3. Prevents nested mutations with transaction guard
 * 4. Logs all mutation attempts in DEV mode
 * 5. THROWS in STRICT mode on unauthorized mutation
 *
 * ENFORCEMENT LEVELS:
 * - STRICT (dev/test): Unauthorized mutations throw immediately
 * - NORMAL (production): Unauthorized mutations log violation but continue
 * - SILENT (freebuild): No checks, mutations proceed
 * - LOG_ONLY (diagnostic): Mutations allowed but all logged (phase 0 state)
 *
 * CRITICAL: In STRICT mode, any mutation outside ActorEngine.setContext() will throw.
 * This is intentional and required for Phase 1 truth enforcement.
 *
 * Contract (STRICT mode):
 * - Any call to actor.update() from outside ActorEngine → THROWS
 * - Any call to actor.updateEmbeddedDocuments() from outside ActorEngine → THROWS
 * - Only legal path: XYZ system → ActorEngine → setContext() → actor.update()
 *
 * Contract (NORMAL mode):
 * - Mutations log violations but execution continues
 * - Used in production for observability without breaking existing features
 *
 * This is the enforcement choke point for all mutations.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * PHASE 1 ENFORCEMENT LEVEL
 *
 * PHASE 4 FIX: Default is now NULL (set by initialize()).
 * Prevents hardcoded 'log_only' from disabling enforcement.
 *
 * Environment-aware enforcement configuration:
 * - 'strict': Throw on unauthorized mutations (dev/test)
 * - 'normal': Log but continue (default/production)
 * - 'silent': No enforcement (freebuild mode)
 * - 'log_only': Diagnostic mode (allows all, logs all)
 *
 * MUST be initialized via MutationInterceptor.initialize() before use.
 */
let ENFORCEMENT_LEVEL = null; // Set at init time based on environment

const DEV_MODE = true;     // Always log all mutations with stack traces

// Track which ActorEngine method is currently executing
let _currentMutationContext = null;

export class MutationInterceptor {
  /**
   * PHASE 1: Set enforcement level for this session.
   *
   * @param {string} level - 'strict', 'normal', 'silent', or 'log_only'
   *
   * STRICT: Throw on unauthorized mutations (dev/test enforcement)
   * NORMAL: Log violations but continue (production observability)
   * SILENT: No checks at all (freebuild mode)
   * LOG_ONLY: Current phase 0 state - log everything, allow everything
   */
  static setEnforcementLevel(level) {
    const valid = ['strict', 'normal', 'silent', 'log_only'];
    if (!valid.includes(level)) {
      throw new Error(`Invalid enforcement level: ${level}. Must be one of: ${valid.join(', ')}`);
    }
    ENFORCEMENT_LEVEL = level;
    console.log(`[MutationInterceptor] Enforcement level set to: ${level.toUpperCase()}`);
  }

  /**
   * Get current enforcement level.
   *
   * PHASE 4: Returns enforced level after initialize().
   * If called before initialize, returns fallback (normal mode).
   */
  static getEnforcementLevel() {
    if (ENFORCEMENT_LEVEL === null) {
      // Fallback if called before initialize
      // Should only happen in rare edge cases
      swseLogger.warn('[MutationInterceptor] getEnforcementLevel() called before initialize()');
      return 'normal'; // Safe fallback (allows mutations, logs them)
    }
    return ENFORCEMENT_LEVEL;
  }

  /**
   * Initialize global mutation interception.
   * Called once at system startup (in main module).
   *
   * PHASE 1: Automatically enables STRICT mode in dev/test environment.
   */
  static initialize() {
    if (typeof Actor === 'undefined') {
      console.warn('[MutationInterceptor] Actor class not available, skipping initialization');
      return;
    }

    // PHASE 1: Detect environment and set enforcement level
    // Dev/Test: STRICT (throw on violations) if localhost OR setting enabled
    // Production: NORMAL (log but continue)
    const isDevEnvironment = (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    );

    const strictEnforcementEnabled = game?.settings?.get('foundryvtt-swse', 'dev-strict-enforcement') === true;
    const defaultLevel = (isDevEnvironment || strictEnforcementEnabled) ? 'strict' : 'normal';
    MutationInterceptor.setEnforcementLevel(defaultLevel);

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

    console.log(`[MutationInterceptor] Mutation enforcement initialized (${defaultLevel.toUpperCase()} mode). All mutations are now governed.`);
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
  }

  /**
   * Clear the current mutation context (when ActorEngine finishes).
   */
  static clearContext() {
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
   * Public API: Check if mutation context is currently active (from ActorEngine).
   * Used by enforcement layers to verify authorization.
   * @returns {boolean} True if ActorEngine mutation is in progress
   */
  static hasContext() {
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
   *
   * PHASE 1 ENFORCEMENT:
   * - STRICT mode: throws on unauthorized mutations
   * - NORMAL mode: logs violations but allows continuation
   * - SILENT mode: no checks
   * - LOG_ONLY: logs all mutations, allows all
   *
   * @private
   */
  static _wrapActorUpdate() {
    const original = Actor.prototype.update;

    Actor.prototype.update = async function(data, options = {}) {
      const isAuthorized = MutationInterceptor._isAuthorized();
      const context = _currentMutationContext;
      const caller = MutationInterceptor._getCaller();
      const enforcementLevel = MutationInterceptor.getEnforcementLevel();

      if (DEV_MODE) {
        swseLogger.debug(`[MUTATION] Actor.update() on ${this.name}`, {
          authorized: isAuthorized,
          caller,
          data,
          context: context?.operation,
          suppressRecalc: context?.suppressRecalc,
          enforcement: enforcementLevel
        });
      }

      if (!isAuthorized && enforcementLevel !== 'silent' && enforcementLevel !== 'log_only') {
        const msg = `MUTATION VIOLATION: ${caller} called actor.update() directly.\n` +
          `Must route through ActorEngine.updateActor(actor, data).\n` +
          `Caller: ${caller}\n` +
          `Enforcement: ${enforcementLevel.toUpperCase()}`;

        if (enforcementLevel === 'strict') {
          // PHASE 1: Actually throw in strict mode
          throw new Error(msg);
        } else if (enforcementLevel === 'normal' && DEV_MODE) {
          // NORMAL mode: Log but continue
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
   *
   * PHASE 1 ENFORCEMENT: Same as updateActor - throws in STRICT mode.
   *
   * @private
   */
  static _wrapUpdateEmbeddedDocuments() {
    const original = Actor.prototype.updateEmbeddedDocuments;

    Actor.prototype.updateEmbeddedDocuments = async function(embeddedName, updates, options = {}) {
      const isAuthorized = MutationInterceptor._isAuthorized();
      const context = _currentMutationContext;
      const caller = MutationInterceptor._getCaller();
      const enforcementLevel = MutationInterceptor.getEnforcementLevel();

      if (DEV_MODE) {
        swseLogger.debug(`[MUTATION] updateEmbeddedDocuments(${embeddedName}) on ${this.name}`, {
          authorized: isAuthorized,
          caller,
          updateCount: updates.length,
          suppressRecalc: context?.suppressRecalc,
          enforcement: enforcementLevel
        });
      }

      if (!isAuthorized && enforcementLevel !== 'silent' && enforcementLevel !== 'log_only') {
        const msg = `MUTATION VIOLATION: ${caller} called updateEmbeddedDocuments() directly on ${this.name}.\n` +
          `Must route through ActorEngine.updateEmbeddedDocuments(actor, type, updates).\n` +
          `Caller: ${caller}\n` +
          `Enforcement: ${enforcementLevel.toUpperCase()}`;

        if (enforcementLevel === 'strict') {
          throw new Error(msg);
        } else if (enforcementLevel === 'normal' && DEV_MODE) {
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
   *
   * PHASE 1 ENFORCEMENT: Throws in STRICT mode for unauthorized creates.
   *
   * @private
   */
  static _wrapCreateEmbeddedDocuments() {
    const original = Actor.prototype.createEmbeddedDocuments;

    Actor.prototype.createEmbeddedDocuments = async function(embeddedName, data, options = {}) {
      const isAuthorized = MutationInterceptor._isAuthorized();
      const context = _currentMutationContext;
      const caller = MutationInterceptor._getCaller();
      const enforcementLevel = MutationInterceptor.getEnforcementLevel();

      if (DEV_MODE) {
        swseLogger.debug(`[MUTATION] createEmbeddedDocuments(${embeddedName}) on ${this.name}`, {
          authorized: isAuthorized,
          caller,
          createCount: data.length,
          suppressRecalc: context?.suppressRecalc,
          enforcement: enforcementLevel
        });
      }

      if (!isAuthorized && enforcementLevel !== 'silent' && enforcementLevel !== 'log_only') {
        const msg = `MUTATION VIOLATION: ${caller} called createEmbeddedDocuments() on ${this.name}.\n` +
          `Must route through ActorEngine.createEmbeddedDocuments(actor, type, data).\n` +
          `Enforcement: ${enforcementLevel.toUpperCase()}`;

        if (enforcementLevel === 'strict') {
          throw new Error(msg);
        } else if (enforcementLevel === 'normal' && DEV_MODE) {
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
   *
   * PHASE 1 ENFORCEMENT: Throws in STRICT mode for unauthorized deletes.
   *
   * @private
   */
  static _wrapDeleteEmbeddedDocuments() {
    const original = Actor.prototype.deleteEmbeddedDocuments;

    Actor.prototype.deleteEmbeddedDocuments = async function(embeddedName, ids, options = {}) {
      const isAuthorized = MutationInterceptor._isAuthorized();
      const context = _currentMutationContext;
      const caller = MutationInterceptor._getCaller();
      const enforcementLevel = MutationInterceptor.getEnforcementLevel();

      if (DEV_MODE) {
        swseLogger.debug(`[MUTATION] deleteEmbeddedDocuments(${embeddedName}) on ${this.name}`, {
          authorized: isAuthorized,
          caller,
          deleteCount: ids.length,
          suppressRecalc: context?.suppressRecalc,
          enforcement: enforcementLevel
        });
      }

      if (!isAuthorized && enforcementLevel !== 'silent' && enforcementLevel !== 'log_only') {
        const msg = `MUTATION VIOLATION: ${caller} called deleteEmbeddedDocuments() on ${this.name}.\n` +
          `Must route through ActorEngine.deleteEmbeddedDocuments(actor, type, ids).\n` +
          `Enforcement: ${enforcementLevel.toUpperCase()}`;

        if (enforcementLevel === 'strict') {
          throw new Error(msg);
        } else if (enforcementLevel === 'normal' && DEV_MODE) {
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
   *
   * PHASE 1 ENFORCEMENT: Throws in STRICT mode for unauthorized item updates.
   * Note: Only checks if item has a parent actor. Unowned items can mutate freely.
   *
   * @private
   */
  static _wrapItemUpdate() {
    if (typeof Item === 'undefined') return;

    const original = Item.prototype.update;

    Item.prototype.update = async function(data, options = {}) {
      const isAuthorized = MutationInterceptor._isAuthorized();
      const caller = MutationInterceptor._getCaller();
      const parentActor = this.actor;
      const enforcementLevel = MutationInterceptor.getEnforcementLevel();

      if (DEV_MODE && parentActor) {
        swseLogger.debug(`[MUTATION] Item.update() on ${this.name} (parent: ${parentActor.name})`, {
          authorized: isAuthorized,
          caller,
          data,
          enforcement: enforcementLevel
        });
      }

      if (!isAuthorized && parentActor && enforcementLevel !== 'silent' && enforcementLevel !== 'log_only') {
        const msg = `MUTATION VIOLATION: ${caller} called item.update() directly on owned item ${this.name}.\n` +
          `Item mutations must route through ActorEngine.updateEmbeddedDocuments(actor, 'Item', updates).\n` +
          `Item: ${this.name}, Parent Actor: ${parentActor.name}\n` +
          `Enforcement: ${enforcementLevel.toUpperCase()}`;

        if (enforcementLevel === 'strict') {
          throw new Error(msg);
        } else if (enforcementLevel === 'normal' && DEV_MODE) {
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
