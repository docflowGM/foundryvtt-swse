/**
 * SENTINEL — Mutation Authority Enforcement Layer
 * PHASE 3: Enforces ActorEngine as sole mutation authority
 *
 * Rules:
 * - ActorEngine.updateActor() is the ONLY legal way to mutate actors
 * - ActorEngine.updateEmbeddedDocuments() is the ONLY legal way to modify embedded documents
 * - Direct actor.update() calls outside ActorEngine → VIOLATION
 * - Direct updateEmbeddedDocuments() calls outside ActorEngine → VIOLATION
 * - Item updates on owned items must route through ActorEngine
 *
 * Detects:
 * - Direct actor.update() calls from non-ActorEngine sources
 * - Direct embedded document mutations bypassing ActorEngine
 * - Nested mutations (multiple mutations in flight)
 * - Mutation authority violations with stack traces
 *
 * Modes:
 * - STRICT: Throws on violations
 * - DEV: Logs violations with full context
 */

import { swseLogger } from '../../utils/logger.js';

/**
 * Mutation Integrity Layer follows Sentinel pattern
 * Export as object with init() method for SentinelEngine
 */
export const MutationIntegrityLayer = {
  _violationLog: [],
  _mutationStack: [],
  _actorMutationMap: new Map(),

  /**
   * Initialize layer for Sentinel registration
   */
  init() {
    this.registerHooks();
  },

  /**
   * Register Sentinel hooks for mutation authority enforcement
   */
  registerHooks() {
    // Initialize logging
    this._violationLog = [];
    this._mutationStack = [];
    this._actorMutationMap = new Map();

    // Hook: Monitor mutation events through ActorEngine
    Hooks.on('swse.mutationAuthorized', this._onMutationAuthorized.bind(this));
    Hooks.on('swse.mutationViolation', this._onMutationViolation.bind(this));

    console.log('[Sentinel] MutationIntegrityLayer initialized');
  },

  /**
   * Log an authorized mutation (from ActorEngine)
   * @param {Object} event
   */
  _onMutationAuthorized(event) {
    const { actor, type, source, timestamp } = event;
    if (!actor) return;

    if (!this._actorMutationMap.has(actor.id)) {
      this._actorMutationMap.set(actor.id, []);
    }

    this._actorMutationMap.get(actor.id).push({
      timestamp,
      type,
      source,
      stack: new Error().stack
    });

    swseLogger.debug(`[Sentinel] Mutation authorized: ${source} on ${actor.name}`, {
      type,
      timestamp
    });
  },

  /**
   * Log a mutation violation (direct call outside ActorEngine)
   * @param {Object} event
   */
  _onMutationViolation(event) {
    const { actor, type, caller, stack, timestamp } = event;

    const violation = {
      timestamp,
      actor: actor?.name || 'unknown',
      type,
      caller,
      stack
    };

    this._violationLog.push(violation);

    const sentinelMode = game.settings?.get?.('swse', 'sentinelMode');
    const isStrict = sentinelMode === 'STRICT';
    const isDev = sentinelMode === 'DEV' || !sentinelMode;

    const message = `MUTATION VIOLATION: ${caller} attempted ${type} on ${actor?.name}.\n` +
      `Must route through ActorEngine, not direct actor methods.`;

    if (isStrict) {
      swseLogger.error(`[Sentinel STRICT] ${message}`, { violation });
      throw new Error(message);
    } else if (isDev) {
      console.error(`[MUTATION-VIOLATION] ${message}`, { violation });
      console.error(`Stack trace:\n${stack}`);
    }
  },

  /**
   * Emit authorization event
   * Called by ActorEngine when mutation is authorized
   */
  emitMutationAuthorized(actor, type, source) {
    Hooks.call('swse.mutationAuthorized', {
      actor,
      type,
      source,
      timestamp: Date.now()
    });
  },

  /**
   * Emit violation event
   * Called by MutationInterceptor when violation detected
   */
  emitMutationViolation(actor, type, caller, stack) {
    Hooks.call('swse.mutationViolation', {
      actor,
      type,
      caller,
      stack,
      timestamp: Date.now()
    });
  },

  /**
   * Get violation summary for admin diagnostics
   */
  getViolationSummary() {
    if (this._violationLog.length === 0) {
      return {
        status: 'OK',
        violations: 0,
        message: 'No mutation violations detected'
      };
    }

    // Group by caller
    const bySystem = {};
    for (const violation of this._violationLog) {
      if (!bySystem[violation.caller]) {
        bySystem[violation.caller] = [];
      }
      bySystem[violation.caller].push(violation);
    }

    return {
      status: 'VIOLATIONS DETECTED',
      violations: this._violationLog.length,
      byCaller: Object.keys(bySystem).map(caller => ({
        system: caller,
        count: bySystem[caller].length,
        lastViolation: bySystem[caller][bySystem[caller].length - 1]
      }))
    };
  },

  /**
   * Clear violation log (for testing or admin reset)
   */
  clearViolationLog() {
    this._violationLog = [];
    swseLogger.log('[Sentinel] Mutation violation log cleared');
  },

  /**
   * Get mutation statistics for an actor
   */
  getActorMutationStats(actorId) {
    const mutations = this._actorMutationMap.get(actorId) || [];
    if (mutations.length === 0) {
      return { actor: actorId, mutations: 0, message: 'No mutations recorded' };
    }

    // Count by type
    const byType = {};
    for (const mut of mutations) {
      byType[mut.type] = (byType[mut.type] || 0) + 1;
    }

    return {
      actor: actorId,
      totalMutations: mutations.length,
      byType,
      lastMutation: mutations[mutations.length - 1]
    };
  },

  /**
   * Strict mode verification: Ensure all mutations route through ActorEngine
   * Called periodically or on demand
   */
  verify() {
    const violations = this._violationLog.length;
    const status = violations === 0 ? 'PASS' : 'FAIL';

    const report = {
      status,
      totalViolations: violations,
      phase: 'PHASE 3',
      requirement: 'All mutations must route through ActorEngine.updateActor()',
      timestamp: Date.now()
    };

    swseLogger.log(
      `[Sentinel] Phase 3 Mutation Authority Verification: ${status}`,
      report
    );

    return report;
  }
};
