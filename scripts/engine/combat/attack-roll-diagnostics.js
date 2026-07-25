/**
 * AttackRollDiagnostics — opt-in, development-only diagnostic recorder for
 * aligned attack rolls (Phase 2 rolling-system alignment).
 *
 * Disabled by default. Toggle from the console/macro with:
 *   globalThis.SWSE.AttackRollDiagnostics.enabled = true;
 * then inspect globalThis.SWSE.AttackRollDiagnostics.events after an attack.
 *
 * Guarantees:
 * - No console output and no memory use while disabled (record() no-ops).
 * - Never throws into the roll pipeline — a diagnostics failure is swallowed.
 * - Never mutates the actor, item, or roll it is given.
 * - Only logs identifying names/ids and already-resolved roll data, not
 *   free-text item/effect descriptions.
 */

const MAX_EVENTS = 200;

export const AttackRollDiagnostics = {
  enabled: false,
  events: [],

  /**
   * Record one aligned attack roll's full diagnostic snapshot.
   * Safe to call unconditionally from roll paths — it is a no-op unless
   * `enabled` is true.
   *
   * @param {Object} snapshot
   */
  record(snapshot = {}) {
    if (!this.enabled) return;
    try {
      const entry = {
        timestamp: Date.now(),
        domain: snapshot.domain ?? null,
        attackType: snapshot.attackType ?? null,
        // Phase 4: attack-domain-router.js's own decision, so a diagnostics
        // snapshot shows not just "vehicle vs character" but exactly which
        // math authority was selected and why.
        resolverSelected: snapshot.resolverSelected ?? null,
        domainReason: snapshot.domainReason ?? null,
        domainWarnings: Array.isArray(snapshot.domainWarnings) ? snapshot.domainWarnings : [],
        messageId: snapshot.messageId ?? null,
        messageRevision: snapshot.messageRevision ?? null,
        messageAuthoritative: snapshot.messageAuthoritative ?? null,
        messageSuperseded: snapshot.messageSuperseded ?? null,
        actor: snapshot.actor?.name ?? null,
        actorId: snapshot.actor?.id ?? null,
        vehicleActor: snapshot.vehicleActor?.name ?? null,
        vehicleActorId: snapshot.vehicleActor?.id ?? null,
        operator: snapshot.operator?.name ?? null,
        operatorId: snapshot.operator?.id ?? null,
        crewStation: snapshot.crewStation ?? null,
        item: snapshot.item?.name ?? null,
        itemId: snapshot.item?.id ?? null,
        target: snapshot.target?.name ?? null,
        targetId: snapshot.target?.id ?? null,
        naturalD20: snapshot.naturalD20 ?? null,
        finalTotal: snapshot.finalTotal ?? null,
        formula: snapshot.formula ?? null,
        appliedComponents: Array.isArray(snapshot.componentLedger)
          ? snapshot.componentLedger.filter(c => c?.applied).map(c => ({ id: c.id, label: c.label, value: c.value, category: c.category }))
          : [],
        suppressedComponents: Array.isArray(snapshot.componentLedger)
          ? snapshot.componentLedger.filter(c => c && c.applied === false).map(c => ({ id: c.id, label: c.label, value: c.value, reason: c.reason }))
          : [],
        forcePointReceipt: snapshot.forcePointReceipt
          ? {
              success: snapshot.forcePointReceipt.success,
              requested: snapshot.forcePointReceipt.requested,
              spent: snapshot.forcePointReceipt.spent,
              before: snapshot.forcePointReceipt.before,
              after: snapshot.forcePointReceipt.after
            }
          : null,
        transactions: snapshot.transactions ?? null,
        outcome: snapshot.outcome
          ? {
              hit: snapshot.outcome.hit,
              automaticHit: snapshot.outcome.automaticHit,
              automaticMiss: snapshot.outcome.automaticMiss,
              critical: snapshot.outcome.critical,
              criticalThreat: snapshot.outcome.criticalThreat,
              damageMultiplier: snapshot.outcome.damageMultiplier,
              reason: snapshot.outcome.reason
            }
          : null,
        targetOutcomes: Array.isArray(snapshot.targetOutcomes) ? snapshot.targetOutcomes : null,
        damageWorkflowMetadata: snapshot.damageWorkflowMetadata ?? null
      };

      this.events.push(entry);
      if (this.events.length > MAX_EVENTS) this.events.shift();

      console.debug('[SWSE][AttackRollDiagnostics]', entry);
    } catch (_err) {
      // Diagnostics must never break the roll pipeline they observe.
    }
  },

  clear() {
    this.events = [];
  },

  export() {
    return JSON.parse(JSON.stringify(this.events));
  },

  /**
   * GM-only opt-in helper (Phase 4 rolling-system alignment runtime
   * verification support). Prints a concise, human-readable report of the
   * most recent aligned attack roll to the console — actor/vehicle/operator,
   * resolver selected, formula, ledger, outcome, transactions, and chat
   * message revision/supersession state — without requiring the caller to
   * dig through `events` by hand. A no-op message (not a throw) if
   * diagnostics are disabled or no attack has been recorded yet, so it is
   * safe to run from a macro at any time.
   *
   * Usage from a GM macro or console:
   *   globalThis.SWSE.debug.attackRolls.enabled = true;
   *   // ...perform an attack...
   *   globalThis.SWSE.debug.attackRolls.report();
   *   // cleanup when done verifying:
   *   globalThis.SWSE.debug.attackRolls.enabled = false;
   *   globalThis.SWSE.debug.attackRolls.clear();
   *
   * @param {number} [index=-1] - index into `events` (default: most recent).
   * @returns {string} the report text (also printed to console).
   */
  report(index = -1) {
    if (!this.enabled) {
      const msg = '[SWSE][AttackRollDiagnostics] Diagnostics are disabled — set globalThis.SWSE.debug.attackRolls.enabled = true, perform an attack, then call .report() again.';
      console.log(msg);
      return msg;
    }
    const entry = this.events.at(index);
    if (!entry) {
      const msg = '[SWSE][AttackRollDiagnostics] No recorded attack rolls yet.';
      console.log(msg);
      return msg;
    }
    const lines = [
      '=== SWSE Attack Diagnostics Report (GM-only, not for player display) ===',
      `Domain: ${entry.attackType ?? 'unknown'}  Resolver: ${entry.resolverSelected ?? 'unknown'}  (${entry.domainReason ?? 'no reason recorded'})`,
      entry.domainWarnings?.length ? `Routing warnings: ${entry.domainWarnings.join(' | ')}` : null,
      `Actor: ${entry.actor ?? '—'} (${entry.actorId ?? '—'})`,
      entry.vehicleActor ? `Vehicle: ${entry.vehicleActor} (${entry.vehicleActorId})` : null,
      entry.operator ? `Operator: ${entry.operator} (${entry.operatorId})${entry.crewStation ? ` [${entry.crewStation}]` : ''}` : null,
      `Weapon: ${entry.item ?? '—'} (${entry.itemId ?? '—'})`,
      `Target: ${entry.target ?? '(none/manual)'}`,
      `Formula: ${entry.formula ?? '—'}   Raw d20: ${entry.naturalD20 ?? '—'}   Final total: ${entry.finalTotal ?? '—'}`,
      '--- Component ledger (applied) ---',
      ...(entry.appliedComponents ?? []).map(c => `  ${c.label} [${c.category}]: ${c.value >= 0 ? '+' : ''}${c.value}`),
      entry.suppressedComponents?.length ? '--- Suppressed ---' : null,
      ...(entry.suppressedComponents ?? []).map(c => `  ${c.label}: ${c.value} (${c.reason ?? 'suppressed'})`),
      `Outcome: hit=${entry.outcome?.hit ?? '—'} critical=${entry.outcome?.critical ?? '—'} automaticHit=${entry.outcome?.automaticHit ?? '—'} automaticMiss=${entry.outcome?.automaticMiss ?? '—'}`,
      entry.forcePointReceipt ? `Force Point receipt: spent=${entry.forcePointReceipt.spent} (${entry.forcePointReceipt.before} -> ${entry.forcePointReceipt.after})` : 'Force Point receipt: none',
      `Transactions: ${JSON.stringify(entry.transactions ?? {})}`,
      `Chat message: id=${entry.messageId ?? '—'} revision=${entry.messageRevision ?? '—'} authoritative=${entry.messageAuthoritative ?? '—'} superseded=${entry.messageSuperseded ?? '—'}`,
      '=== end report ==='
    ].filter(Boolean);
    const text = lines.join('\n');
    console.log(text);
    return text;
  }
};

export default AttackRollDiagnostics;
