/**
 * SENTINEL — Mutation Authority Enforcement Layer
 * PHASE 3: Enforces ActorEngine as sole mutation authority
 */

import { swseLogger } from '../../utils/logger.js';

export const MutationIntegrityLayer = {

  _violationLog: [],
  _mutationStack: [],
  _actorMutationMap: new Map(),
  _activeTransaction: null,

  init() {
    this.registerHooks();
  },

  registerHooks() {
    this._violationLog = [];
    this._mutationStack = [];
    this._actorMutationMap = new Map();

    Hooks.on('swse.mutationAuthorized', this._onMutationAuthorized.bind(this));
    Hooks.on('swse.mutationViolation', this._onMutationViolation.bind(this));

    console.log('[Sentinel] MutationIntegrityLayer initialized');
  },

  /* =======================================================================
     INTERNAL SETTINGS RESOLUTION
     ======================================================================= */

  _getSentinelMode() {
    try {
      const mode = game?.settings?.get?.('foundryvtt-swse', 'sentinelMode');
      return mode || 'DEV';
    } catch {
      return 'DEV';
    }
  },

  /* =======================================================================
     AUTHORIZATION EVENTS
     ======================================================================= */

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

    swseLogger.debug(
      `[Sentinel] Mutation authorized: ${source} on ${actor.name}`,
      { type, timestamp }
    );
  },

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

    const sentinelMode = this._getSentinelMode();
    const isStrict = sentinelMode === 'STRICT';
    const isDev = sentinelMode === 'DEV';

    const message =
      `MUTATION VIOLATION: ${caller} attempted ${type} on ${actor?.name}.\n` +
      `Must route through ActorEngine, not direct actor methods.`;

    if (isStrict) {
      swseLogger.error(`[Sentinel STRICT] ${message}`, { violation });
      throw new Error(message);
    }

    if (isDev) {
      console.error(`[MUTATION-VIOLATION] ${message}`, { violation });
      console.error(`Stack trace:\n${stack}`);
    }
  },

  emitMutationAuthorized(actor, type, source) {
    Hooks.call('swse.mutationAuthorized', {
      actor,
      type,
      source,
      timestamp: Date.now()
    });
  },

  emitMutationViolation(actor, type, caller, stack) {
    Hooks.call('swse.mutationViolation', {
      actor,
      type,
      caller,
      stack,
      timestamp: Date.now()
    });
  },

  /* =======================================================================
     TRANSACTION LIFECYCLE
     ======================================================================= */

  startTransaction(context) {
    if (this._activeTransaction && context.blockNestedMutations) {
      const current = this._activeTransaction.operation;
      throw new Error(
        `Cannot start ${context.operation} — ${current} already in progress.`
      );
    }

    this._activeTransaction = {
      operation: context.operation,
      source: context.source,
      startTime: performance.now(),
      mutationCount: 0,
      derivedRecalcCount: 0,
      mutations: [],
      context
    };

    swseLogger.debug(`[Sentinel] Transaction START: ${context.operation}`);
  },

  recordMutation(type) {
    if (!this._activeTransaction) return;
    this._activeTransaction.mutationCount++;
    this._activeTransaction.mutations.push({
      type,
      timestamp: performance.now()
    });
  },

  recordDerivedRecalc() {
    if (!this._activeTransaction) return;
    this._activeTransaction.derivedRecalcCount++;
  },

  endTransaction() {
    if (!this._activeTransaction) return;

    const tx = this._activeTransaction;
    const durationMs = performance.now() - tx.startTime;

    this._validateTransaction(tx);
    this._reportTransaction(tx, durationMs);

    this._activeTransaction = null;
  },

  _validateTransaction(tx) {
    const policy = this._getOperationPolicy(tx.operation);
    if (!policy) return;

    const violations = [];

    if (policy.maxMutations !== undefined &&
        tx.mutationCount > policy.maxMutations) {
      violations.push(
        `Too many mutations: ${tx.mutationCount} > ${policy.maxMutations}`
      );
    }

    if (policy.exactDerivedRecalcs !== undefined &&
        tx.derivedRecalcCount !== policy.exactDerivedRecalcs) {
      violations.push(
        `Derived recalcs mismatch: ${tx.derivedRecalcCount} ≠ ${policy.exactDerivedRecalcs}`
      );
    }

    if (!violations.length) return;

    const sentinelMode = this._getSentinelMode();
    const message =
      `[Sentinel] Transaction INVARIANT VIOLATION in ${tx.operation}:\n` +
      violations.join('\n');

    if (sentinelMode === 'STRICT') {
      throw new Error(message);
    }

    console.warn(message, { transaction: tx, violations });
  },

  _getOperationPolicy(operation) {
    return {
      applyProgression: { maxMutations: 3, exactDerivedRecalcs: 1 },
      applyDamage: { maxMutations: 1, exactDerivedRecalcs: 1 },
      updateActor: { maxMutations: 1, exactDerivedRecalcs: 1 },
      updateEmbeddedDocuments: { maxMutations: 1, exactDerivedRecalcs: 1 }
    }[operation];
  },

  _reportTransaction(tx, durationMs) {
    const policy = this._getOperationPolicy(tx.operation);
    const passed = !policy || (
      tx.mutationCount <= (policy.maxMutations ?? Infinity) &&
      tx.derivedRecalcCount === (policy.exactDerivedRecalcs ?? tx.derivedRecalcCount)
    );

    const sentinelMode = this._getSentinelMode();
    if (sentinelMode !== 'DEV') return;

    const status = passed ? 'PASS' : 'FAIL';

    console.log(
      `[Sentinel] Transaction END: ${status}`,
      {
        operation: tx.operation,
        mutations: tx.mutationCount,
        derivedRecalcs: tx.derivedRecalcCount,
        durationMs: durationMs.toFixed(2)
      }
    );
  },

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