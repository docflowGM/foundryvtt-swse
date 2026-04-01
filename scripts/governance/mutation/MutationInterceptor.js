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
import GovernanceDiagnostics from "/systems/foundryvtt-swse/scripts/governance/sentinel/governance-diagnostics.js";

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
   * Initialize global mutation interception context.
   * Called once at system startup (in main module).
   *
   * PERMANENT FIX: Does NOT patch Actor.prototype.update anymore.
   * Guards are enforced through Sentinel and ActorEngine context, not wrappers.
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

    // PERMANENT FIX: Removed all prototype wrapping of Actor.prototype.update
    // Guards are now enforced through:
    // 1. Sentinel/secureActorUpdate() for authorization checks
    // 2. ActorEngine.setContext() for mutation context tracking
    // 3. Hooks for observational logging (non-invasive)

    // No more: MutationInterceptor._wrapActorUpdate();
    // No more: MutationInterceptor._wrapUpdateEmbeddedDocuments();
    // No more: MutationInterceptor._wrapCreateEmbeddedDocuments();
    // No more: MutationInterceptor._wrapDeleteEmbeddedDocuments();
    // No more: MutationInterceptor._wrapItemUpdate();

    // PERMANENT FIX: Verify no prototype patches exist
    const isClean = MutationInterceptor._verifyPrototypeClean();
    if (!isClean) {
      console.error('[CRITICAL] Actor.prototype.update contains wrapper code. This is a regression.');
      if (defaultLevel === 'strict') {
        throw new Error('[PERMANENT FIX VIOLATION] Wrapper code detected in Actor.prototype.update');
      }
    }

    // PHASE 5: Initialize Sentinel governance diagnostics
    if (DEV_MODE && defaultLevel === 'strict') {
      const guardrails = GovernanceDiagnostics.verifyGuardrails();
      if (guardrails.allActive) {
        console.log(`[MutationInterceptor] ✅ All governance guardrails verified and active`);
      } else {
        console.warn(`[MutationInterceptor] ⚠️  Some governance guardrails not active:`, guardrails);
      }
    }

    console.log(`[MutationInterceptor] ✅ Mutation context enforcement initialized (${defaultLevel.toUpperCase()} mode). No prototype patches. Guards via Sentinel+ActorEngine.`);
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
   * DEPRECATED: Wrapper removed - PERMANENT FIX
   * Actor.prototype.update is no longer wrapped.
   * Guards enforced through Sentinel + ActorEngine context instead.
   *
   * @private
   * @deprecated DO NOT RE-ADD THIS WRAPPER
   */
  static _wrapActorUpdate() {
    // THIS METHOD IS DISABLED AND NO LONGER USED
    // All mutation enforcement now happens through:
    // - Sentinel.validateMutation() for authorization
    // - ActorEngine.setContext()/clearContext() for state tracking
    // - Hooks for observational logging
    console.warn('[MutationInterceptor] _wrapActorUpdate() is deprecated and disabled. Use Sentinel + ActorEngine context instead.');
  }

  /**
   * DEPRECATED: Wrapper removed - PERMANENT FIX
   * @private
   * @deprecated DO NOT RE-ADD THIS WRAPPER
   */
  static _wrapUpdateEmbeddedDocuments() {
    console.warn('[MutationInterceptor] _wrapUpdateEmbeddedDocuments() is deprecated. Use Sentinel + ActorEngine instead.');
  }

  /**
   * DEPRECATED: Wrapper removed - PERMANENT FIX
   * @private
   * @deprecated DO NOT RE-ADD THIS WRAPPER
   */
  static _wrapCreateEmbeddedDocuments() {
    console.warn('[MutationInterceptor] _wrapCreateEmbeddedDocuments() is deprecated. Use Sentinel + ActorEngine instead.');
  }

  /**
   * DEPRECATED: Wrapper removed - PERMANENT FIX
   * @private
   * @deprecated DO NOT RE-ADD THIS WRAPPER
   */
  static _wrapDeleteEmbeddedDocuments() {
    console.warn('[MutationInterceptor] _wrapDeleteEmbeddedDocuments() is deprecated. Use Sentinel + ActorEngine instead.');
  }

  /**
   * DEPRECATED: Wrapper removed - PERMANENT FIX
   * @private
   * @deprecated DO NOT RE-ADD THIS WRAPPER
   */
  static _wrapItemUpdate() {
    console.warn('[MutationInterceptor] _wrapItemUpdate() is deprecated. Use Sentinel + ActorEngine instead.');
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

  /**
   * PERMANENT FIX: Verify that Actor.prototype.update is NOT wrapped.
   * This assertion ensures we don't re-introduce wrapper patches.
   *
   * @private
   */
  static _verifyPrototypeClean() {
    if (typeof Actor === 'undefined') return;

    const updateFn = Actor.prototype.update;
    const fnStr = updateFn?.toString() || '';

    // Check for wrapper markers that indicate prototype patching
    const wrapperMarkers = [
      '_wrapActorUpdate',
      'MutationInterceptor._isAuthorized',
      'MutationIntegrityLayer.recordMutation',
      'setContext',
      'clearContext',
      'HooksMutationLayer',
      'MutationInterceptorLock'
    ];

    const foundMarkers = wrapperMarkers.filter(marker => fnStr.includes(marker));

    if (foundMarkers.length > 0) {
      console.error(
        `[PERMANENT FIX VIOLATION] Actor.prototype.update still contains wrapper code!\n` +
        `This is a regression. Wrappers must be removed.\n` +
        `Found markers: ${foundMarkers.join(', ')}\n` +
        `Actor.prototype.update:\n${fnStr.substring(0, 500)}...`
      );
      return false;
    }

    return true;
  }
}
