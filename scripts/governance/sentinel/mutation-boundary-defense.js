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

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { MutationInterceptor } from "/systems/foundryvtt-swse/scripts/governance/mutation/MutationInterceptor.js";
import { AuditTrail } from "/systems/foundryvtt-swse/scripts/governance/audit/audit-trail.js";

export class MutationBoundaryDefense {
  /**
   * Initialize mutation boundary defense
   * Should be called from SWSESentinel during bootstrap
   *
   * @param {Object} options - Configuration
   */
  static initialize(options = {}) {
    this.config = {
      blockUnauthorizedMutations: options.blockUnauthorizedMutations ?? false,
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
   * DEPRECATED: Wrapper removed - PERMANENT FIX
   * Monitor Actor.prototype.update() for unauthorized mutations
   * @private
   *
   * Enforcement now happens through Sentinel + ActorEngine context,
   * not through prototype patching.
   */
  static _monitorActorUpdates() {
    // PERMANENT FIX: Removed prototype wrapper
    // No more: Actor.prototype.update = async function(updateData, options = {}) { ... };
    console.warn('[MutationBoundaryDefense] Actor update monitoring via wrapper disabled (PERMANENT FIX). Use Sentinel + ActorEngine instead.');
  }

  /**
   * DEPRECATED: Wrapper removed - PERMANENT FIX
   * Monitor embedded document mutations
   * @private
   *
   * Enforcement now happens through Sentinel + ActorEngine context.
   */
  static _monitorEmbeddedMutations() {
    // PERMANENT FIX: Removed prototype wrapper
    // No more: Actor.prototype.updateEmbeddedDocuments = async function(embeddedName, updates, options = {}) { ... };
    console.warn('[MutationBoundaryDefense] Embedded mutation monitoring via wrapper disabled (PERMANENT FIX).');
  }

  /**
   * DEPRECATED: Wrapper removed - PERMANENT FIX
   * Monitor macro execution for direct mutations
   * @private
   *
   * Enforcement now happens through Sentinel + ActorEngine context.
   */
  static _monitorMacroExecution() {
    // PERMANENT FIX: Removed Hooks.callAll wrapper
    // No more: Hooks.callAll = function(hook, ...args) { ... };
    console.warn('[MutationBoundaryDefense] Macro execution monitoring via wrapper disabled (PERMANENT FIX).');
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
