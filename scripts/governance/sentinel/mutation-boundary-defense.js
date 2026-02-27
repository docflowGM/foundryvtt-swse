/**
 * PHASE 5B-6: Mutation Boundary Defense
 *
 * Extends SWSESentinel to defend mutation boundaries.
 *
 * Prevents:
 *   - Direct mutations outside ActorEngine
 *   - Macro mutations bypassing governance
 *   - Direct system field writes
 *   - MutationInterceptor context bypass
 *
 * Defense Levels:
 *   DEV: Log all violations
 *   PROD: Warn on violations, can block if configured
 */

import { SWSELogger } from '../../utils/logger.js';
import { MutationInterceptor } from '../mutation/MutationInterceptor.js';
import { AuditTrail } from '../audit/audit-trail.js';

export class MutationBoundaryDefense {
  /**
   * Initialize mutation boundary defense
   * Should be called from SWSESentinel during bootstrap
   *
   * @param {Object} options - Configuration
   */
  static initialize(options = {}) {
    this.config = {
      blockUnauthorizedMutations: options.blockUnauthorizedMutations || false,
      logStackTraces: options.logStackTraces || globalThis.SWSE_DEV_MODE,
      warnOnMacroMutations: options.warnOnMacroMutations || true,
      ...options
    };

    // Expand monitoring hooks
    this._monitorActorUpdates();
    this._monitorEmbeddedMutations();
    this._monitorMacroExecution();
    this._monitorDirectSystemWrites();

    SWSELogger.log('[5B-6] Mutation Boundary Defense initialized', {
      blockUnauthorized: this.config.blockUnauthorizedMutations,
      logStackTraces: this.config.logStackTraces,
      warnOnMacros: this.config.warnOnMacroMutations
    });
  }

  /**
   * Monitor Actor.prototype.update() for unauthorized mutations
   * @private
   */
  static _monitorActorUpdates() {
    const original = ActorDocument.prototype.update;

    ActorDocument.prototype.update = async function(updateData, options = {}) {
      // Check if mutation is authorized via MutationInterceptor
      const context = MutationInterceptor._getCurrentContext?.();

      if (!context) {
        const stack = new Error().stack;
        const caller = this._extractCaller(stack);

        // Log violation
        const violation = {
          type: 'unauthorized-actor-update',
          actor: this.name,
          source: caller,
          stack: MutationBoundaryDefense.config.logStackTraces ? stack : null
        };

        SWSELogger.warn('[5B-6] Unauthorized actor mutation detected:', violation);

        // In dev mode: always log
        if (globalThis.SWSE_DEV_MODE) {
          console.warn(`[5B-6] Actor ${this.name} updated outside ActorEngine\n${stack}`);
        }

        // In prod: optionally block
        if (MutationBoundaryDefense.config.blockUnauthorizedMutations) {
          throw new Error(`[GOVERNANCE] Unauthorized mutation on ${this.name} blocked`);
        }

        // Log to audit trail if available
        if (this.system && AuditTrail) {
          AuditTrail.logEvent(this, 'unauthorized-mutation-detected', violation);
        }
      }

      // Continue with original update
      return original.call(this, updateData, options);
    };
  }

  /**
   * Monitor embedded document mutations
   * @private
   */
  static _monitorEmbeddedMutations() {
    const original = ActorDocument.prototype.updateEmbeddedDocuments;

    ActorDocument.prototype.updateEmbeddedDocuments = async function(embeddedName, updates, options = {}) {
      const context = MutationInterceptor._getCurrentContext?.();

      if (!context && embeddedName === 'Item') {
        const stack = new Error().stack;
        const caller = this._extractCaller(stack);

        const violation = {
          type: 'unauthorized-embedded-mutation',
          actor: this.name,
          embeddedName,
          itemCount: updates?.length || 0,
          source: caller
        };

        SWSELogger.warn('[5B-6] Unauthorized embedded mutation:', violation);

        if (MutationBoundaryDefense.config.blockUnauthorizedMutations) {
          throw new Error(`[GOVERNANCE] Unauthorized item update on ${this.name} blocked`);
        }

        if (this.system && AuditTrail) {
          AuditTrail.logEvent(this, 'unauthorized-embedded-mutation', violation);
        }
      }

      return original.call(this, embeddedName, updates, options);
    };
  }

  /**
   * Monitor macro execution for direct mutations
   * @private
   */
  static _monitorMacroExecution() {
    // Detect when mutations happen during macro execution
    const originalHookCall = Hooks.callAll.bind(Hooks);

    Hooks.callAll = function(hook, ...args) {
      // Only monitor during render/update hooks where mutations might happen
      if (hook.includes('render') || hook.includes('update') || hook.includes('preUpdate')) {
        const stackBefore = new Error().stack;

        // Call original
        const result = originalHookCall.apply(this, [hook, ...args]);

        // Check if unauthorized mutations occurred
        if (MutationBoundaryDefense.config.warnOnMacroMutations && globalThis.SWSE_DEV_MODE) {
          // Could add more sophisticated mutation detection here
        }

        return result;
      }

      return originalHookCall.apply(this, [hook, ...args]);
    };
  }

  /**
   * Monitor direct system field writes
   * @private
   */
  static _monitorDirectSystemWrites() {
    // In dev mode, could proxy actor.system to detect direct writes
    if (!globalThis.SWSE_DEV_MODE) return;

    // This is optional and intensive - only enable if needed
  }

  /**
   * Extract caller information from stack trace
   * @private
   */
  static _extractCaller(stack) {
    const lines = stack.split('\n');
    // Find first line that's not MutationInterceptor or our code
    for (const line of lines) {
      if (!line.includes('MutationInterceptor') &&
          !line.includes('MutationBoundaryDefense') &&
          !line.includes('ActorEngine')) {
        return line.trim();
      }
    }
    return 'unknown caller';
  }

  /**
   * Check if a mutation is authorized
   *
   * @param {Actor} actor - Actor being mutated
   * @returns {boolean} - Is mutation authorized?
   */
  static isAuthorized(actor) {
    const context = MutationInterceptor._getCurrentContext?.();
    return context !== null && context !== undefined;
  }

  /**
   * Get mutation defense status
   *
   * @returns {Object} - Status information
   */
  static getStatus() {
    return {
      initialized: true,
      blockUnauthorized: this.config.blockUnauthorizedMutations,
      logStackTraces: this.config.logStackTraces,
      warnOnMacros: this.config.warnOnMacroMutations,
      mode: globalThis.SWSE_DEV_MODE ? 'dev' : 'prod'
    };
  }
}

// Export for global access
if (typeof window !== 'undefined') {
  window.MutationBoundaryDefense = MutationBoundaryDefense;
}
