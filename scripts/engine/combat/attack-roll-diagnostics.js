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
        actor: snapshot.actor?.name ?? null,
        actorId: snapshot.actor?.id ?? null,
        vehicleActor: snapshot.vehicleActor?.name ?? null,
        vehicleActorId: snapshot.vehicleActor?.id ?? null,
        operator: snapshot.operator?.name ?? null,
        operatorId: snapshot.operator?.id ?? null,
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
  }
};

export default AttackRollDiagnostics;
