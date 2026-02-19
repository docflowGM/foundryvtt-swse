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
  _activeTransaction: null,  // ← TRANSACTION TRACKING

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
   * ======================================================================
   * TRANSACTION LIFECYCLE (PHASE 3 AUDITING)
   * ======================================================================
   * Enforces structural invariants per operation
   * Example: applyProgression must have exactly 3 mutations and 1 recalc
   */

  /**
   * Start a new mutation transaction
   * @param {Object} context - {operation, source, suppressRecalc, blockNestedMutations}
   * @throws {Error} If transaction already active and blockNestedMutations=true
   */
  startTransaction(context) {
    if (this._activeTransaction && context.blockNestedMutations) {
      const current = this._activeTransaction.operation;
      throw new Error(
        `Cannot start ${context.operation} — ${current} already in progress.\n` +
        `Nested mutations blocked during ${current}.`
      );
    }

    this._activeTransaction = {
      operation: context.operation,
      source: context.source,
      startTime: performance.now(),
      mutationCount: 0,
      derivedRecalcCount: 0,
      mutations: [],  // Track each mutation
      context
    };

    swseLogger.debug(`[Sentinel] Transaction START: ${context.operation}`);
  },

  /**
   * Record a mutation event within active transaction
   * @param {string} type - 'update', 'createEmbedded', 'deleteEmbedded', 'updateEmbedded'
   */
  recordMutation(type) {
    if (!this._activeTransaction) return;
    this._activeTransaction.mutationCount++;
    this._activeTransaction.mutations.push({
      type,
      timestamp: performance.now()
    });
  },

  /**
   * Record a derived recalculation within active transaction
   */
  recordDerivedRecalc() {
    if (!this._activeTransaction) return;
    this._activeTransaction.derivedRecalcCount++;
  },

  /**
   * End transaction, validate invariants, produce report
   * @throws {Error} If invariants violated in STRICT mode
   */
  endTransaction() {
    if (!this._activeTransaction) return;

    const tx = this._activeTransaction;
    const durationMs = performance.now() - tx.startTime;

    // Validate transaction against policy
    this._validateTransaction(tx);

    // Produce structured report
    this._reportTransaction(tx, durationMs);

    // Clear transaction
    this._activeTransaction = null;
  },

  /**
   * Validate transaction invariants against operation policy
   * @private
   */
  _validateTransaction(tx) {
    const policy = this._getOperationPolicy(tx.operation);
    if (!policy) return;  // No policy = no enforcement

    const violations = [];

    // Check mutation ceiling
    if (policy.maxMutations !== undefined && tx.mutationCount > policy.maxMutations) {
      violations.push(
        `Too many mutations: ${tx.mutationCount} > ${policy.maxMutations}`
      );
    }

    // Check exact derived recalc count
    if (policy.exactDerivedRecalcs !== undefined &&
        tx.derivedRecalcCount !== policy.exactDerivedRecalcs) {
      violations.push(
        `Derived recalcs mismatch: ${tx.derivedRecalcCount} ≠ ${policy.exactDerivedRecalcs}`
      );
    }

    if (violations.length === 0) return;  // PASS

    // Handle violations
    const message = `[Sentinel] Transaction INVARIANT VIOLATION in ${tx.operation}:\n${violations.join('\n')}`;

    const sentinelMode = game.settings?.get?.('swse', 'sentinelMode') || 'DEV';
    if (sentinelMode === 'STRICT') {
      throw new Error(message);
    } else if (sentinelMode === 'DEV') {
      console.warn(message, { transaction: tx, violations });
    }
  },

  /**
   * Get operation-specific policy
   * Defines invariants for each ActorEngine operation
   * @private
   */
  _getOperationPolicy(operation) {
    return {
      'applyProgression': {
        maxMutations: 3,           // Root update + delete items + create items
        exactDerivedRecalcs: 1     // Single recalc after all mutations
      },
      'applyDamage': {
        maxMutations: 1,
        exactDerivedRecalcs: 1
      },
      'updateActor': {
        maxMutations: 1,
        exactDerivedRecalcs: 1
      },
      'updateEmbeddedDocuments': {
        maxMutations: 1,
        exactDerivedRecalcs: 1
      }
    }[operation];
  },

  /**
   * Produce structured transaction report
   * @private
   */
  _reportTransaction(tx, durationMs) {
    const policy = this._getOperationPolicy(tx.operation);
    const passed = !policy || (
      tx.mutationCount <= (policy.maxMutations ?? Infinity) &&
      tx.derivedRecalcCount === (policy.exactDerivedRecalcs ?? tx.derivedRecalcCount)
    );

    const sentinelMode = game.settings?.get?.('swse', 'sentinelMode') || 'DEV';
    if (sentinelMode !== 'DEV') return;

    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(
      `[Sentinel] Transaction END: ${status}`,
      {
        operation: tx.operation,
        mutations: tx.mutationCount,
        derivedRecalcs: tx.derivedRecalcCount,
        durationMs: durationMs.toFixed(2),
        policy: policy ? {
          maxMutations: policy.maxMutations,
          exactDerivedRecalcs: policy.exactDerivedRecalcs
        } : 'no policy'
      }
    );

    swseLogger.debug(`[Sentinel] Transaction report`, {
      operation: tx.operation,
      mutations: tx.mutationCount,
      derivedRecalcs: tx.derivedRecalcCount,
      durationMs,
      passed
    });
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
