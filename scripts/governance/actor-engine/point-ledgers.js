/**
 * Force Point / Destiny Point ledger operations (3N-AE.4, extracted verbatim from ActorEngine).
 *
 * The ledgers stay single: Force Points use flags.swse.forcePointLedger, Destiny Points the separate flags.swse.destinyPointLedger. These
 * functions receive the ActorEngine as `engine` and persist ONLY through engine.updateActor (the unchanged gateway); ActorEngine keeps every
 * public method name as a thin delegate. Per-actor queues and trigger outboxes moved with them (one definition each). No rules changes.
 */
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/core/logger.js";
import { readBonusPool, bonusPoolUpdate } from "/systems/foundryvtt-swse/scripts/engine/force/bonus-force-point-pool.js";
import { captureSpendEvidence, hasForcePointTriggerConsumers, forcePointTriggerConsumers, hasSpendTriggerConsumers, spendTriggerConsumers } from "/systems/foundryvtt-swse/scripts/engine/force/force-point-trigger-registry.js";

// ForcePointsService is injected by ActorEngine (configurePointLedgers) so this module does not join the ActorEngine static import cycle.
let ForcePointsService = null;
export function configurePointLedgers(deps = {}) {
  if (deps.ForcePointsService) ForcePointsService = deps.ForcePointsService;
}

const _forcePointQueues = new WeakMap();

export async function withForcePointQueue(actor, operation) {
  const prior = _forcePointQueues.get(actor) ?? Promise.resolve();
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const tail = prior.then(() => pending);
  _forcePointQueues.set(actor, tail);
  await prior;
  try { return await operation(); }
  finally {
    release();
    if (_forcePointQueues.get(actor) === tail) _forcePointQueues.delete(actor);
  }
}

const _forcePointTriggersInFlight = new Set();

const _destinyPointQueues = new WeakMap();

const _destinyTriggersInFlight = new Set();

async function withDestinyPointQueue(actor, operation) {
  const prior = _destinyPointQueues.get(actor) ?? Promise.resolve();
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const tail = prior.then(() => pending);
  _destinyPointQueues.set(actor, tail);
  await prior;
  try { return await operation(); }
  finally {
    release();
    if (_destinyPointQueues.get(actor) === tail) _destinyPointQueues.delete(actor);
  }
}

const destinyLedgerOf = (actor) => actor.getFlag?.('swse', 'destinyPointLedger') ?? actor.flags?.swse?.destinyPointLedger ?? {};

export async function gainForcePoints(engine, actor, amount = 1) {
    try {
      if (!actor) {throw new Error('gainForcePoints() requires actor');}
      if (typeof amount !== 'number' || amount < 0) {
        throw new Error(`Invalid force point amount: ${amount}`);
      }

      // Delegate calculation to ForcePointsService; mutation stays here
      const { newValue: newFP, actualGain, maxFP } = ForcePointsService.calcGain(actor, amount);

      if (actualGain === 0) {
        SWSELogger.debug(`${actor.name} force points already at max`);
        return { gained: 0, current: newFP, max: maxFP };
      }

      await engine.updateActor(actor, {
        'system.forcePoints.value': newFP
      });

      SWSELogger.log(`Force points gained: ${actor.name} gained ${actualGain}FP (now: ${newFP}/${maxFP})`, {
        amount: actualGain
      });

      return { gained: actualGain, current: newFP, max: maxFP };

    } catch (err) {
      SWSELogger.error(`ActorEngine.gainForcePoints failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        amount
      });
      throw err;
    }
  }

export async function spendForcePoints(engine, actor, amount = 1, context = {}) {
    if (!actor?.id) throw new Error('spendForcePoints requires an identified actor');
    return withForcePointQueue(actor, async () => {
      const requestId = String(context?.requestId ||
        globalThis.foundry?.utils?.randomID?.() || globalThis.crypto?.randomUUID?.() || '');
      if (!requestId) throw new Error('Force Point transaction request identity unavailable');
      const decision = ForcePointsService.authorizeSpend(actor, {
        ...context, requestedCount: amount, requestId
      });
      if (!decision.valid) throw new Error(decision.message);

      const pool = readBonusPool(actor);
      const sourceEntries = Array.isArray(pool.entries) ? pool.entries.map(entry => ({ ...entry })) : [];
      const debit = decision.bonusEntriesSpent ?? [];
      for (const spentEntry of debit) {
        const found = sourceEntries.find(entry => entry.id === spentEntry.id);
        if (!found || Number(found.value) < spentEntry.amount) {
          throw new Error('Bonus Force Point source changed before commit');
        }
        found.value = Number(found.value) - spentEntry.amount;
      }
      const normal = Number(actor.system?.forcePoints?.value ?? 0);
      if (normal < decision.normalSpent) throw new Error('Normal Force Points changed before commit');
      const kept = sourceEntries.filter(entry => Number(entry.value ?? 0) > 0);
      const bonusAfter = kept.reduce((sum, entry) => sum + Number(entry.value), 0);
      const normalAfter = normal - decision.normalSpent;
      const currentLedger = actor.getFlag?.('swse', 'forcePointLedger') ?? actor.flags?.swse?.forcePointLedger ?? {};
      const entries = Array.isArray(currentLedger.receipts) ? currentLedger.receipts : [];
      if (entries.some(entry => entry.requestId === requestId)) throw new Error('Duplicate Force Point transaction');
      const receiptId = globalThis.foundry?.utils?.randomID?.() || globalThis.crypto?.randomUUID?.();
      if (!receiptId) throw new Error('Force Point receipt identity unavailable');
      const receipt = {
        receiptId, requestId, actorId: actor.id,
        roundKey: decision.roundKey, useKind: decision.useKind, reactionEventId: decision.reactionEventId ?? null, entitlement: decision.entitlement ?? null, abilitySourceRef: decision.abilitySourceRef ?? null, adjudicatedBy: decision.adjudicatedBy ?? null,
        countsTowardRoundLimit: decision.countsTowardRoundLimit,
        // Campaign clock at the spend (once-per-day contract limits read it; null when the world has no clock).
        worldTime: Number.isFinite(Number(globalThis.game?.time?.worldTime)) ? Number(globalThis.game.time.worldTime) : null,
        normalSpent: decision.normalSpent,
        bonusEntriesSpent: debit.map(({ id, source, amount, entry }) =>
          ({ id, source, amount, entry: { ...entry } })),
        spent: amount, state: 'committed',
        // Immutable spend-time evidence for delayed, feature-defined consequences. Captured from authoritative state HERE (the
        // commit), never from a caller flag and never re-derived at finalization/delivery time.
        spendEvidence: captureSpendEvidence(actor, 'force')
      };
      // Bounded retention: only settled receipts (finalized/rolled-back) older than
      // the newest 200 are dropped; committed receipts are never dropped, so the
      // round limit and replay guard for any live use are unaffected.
      let retained = [...entries, receipt];
      if (retained.length > 200) {
        let drop = retained.length - 200;
        retained = retained.filter(r => !(drop > 0 && r.state !== 'committed' && r.trigger?.state !== 'pending' && drop--));
      }
      const ledger = { receipts: retained };
      const update = {
        'system.forcePoints.value': normalAfter,
        'flags.swse.forcePointLedger': ledger
      };
      if (debit.length > 0) {
        Object.assign(update, bonusPoolUpdate(actor, {
          ...pool,
          entries: kept,
          value: bonusAfter,
          max: Math.max(bonusAfter, kept.reduce((sum, entry) => sum + Number(entry.max ?? entry.value ?? 0), 0)),
          sources: [...new Set(kept.map(entry => entry.source).filter(Boolean))]
        }));
      }
      // A rejected or thrown write is never interpreted as a successful
      // payment; an applied-then-threw write is indeterminate, not retried.
      await engine.updateActor(actor, update);
      return {
        ...receipt, remaining: normalAfter, bonusRemaining: bonusAfter,
        bonusSpent: debit.reduce((sum, entry) => sum + entry.amount, 0)
      };
    });
  }

export function listUnsettledForcePointReceipts(engine, actor, { inFlight = [] } = {}) {
    const ledger = actor?.getFlag?.('swse', 'forcePointLedger') ?? actor?.flags?.swse?.forcePointLedger ?? {};
    const skip = new Set(inFlight);
    return (Array.isArray(ledger.receipts) ? ledger.receipts : [])
      .filter(r => r?.state === 'committed' && !skip.has(r.receiptId))
      .map(r => ({
        receiptId: r.receiptId, actorId: r.actorId, requestId: r.requestId ?? null, spent: r.spent ?? null,
        abilitySourceRef: r.abilitySourceRef ?? null, reactionEventId: r.reactionEventId ?? null,
        roundKey: r.roundKey ?? null, adjudicatedBy: r.adjudicatedBy ?? null
      }));
  }

export async function reconcileForcePointReceipt(engine, actor, receiptId, { decision, reason } = {}) {
    if (globalThis.game?.user?.isGM !== true) throw new Error('Only a GM may reconcile an unsettled Force Point receipt');
    if (!actor?.id || !receiptId) throw new Error('Identified actor and receipt id required');
    if (!['finalize', 'rollback'].includes(decision)) throw new Error("decision must be 'finalize' or 'rollback'");
    if (typeof reason !== 'string' || !reason.trim()) throw new Error('A written reason is required to reconcile a receipt');
    const ledger = actor.getFlag?.('swse', 'forcePointLedger') ?? actor.flags?.swse?.forcePointLedger ?? {};
    const record = (Array.isArray(ledger.receipts) ? ledger.receipts : []).find(r => r.receiptId === receiptId && r.actorId === actor.id);
    if (!record) return { reconciled: false, reason: 'Receipt not found on this actor' };
    if (record.state !== 'committed') return { reconciled: false, reason: `Receipt is already ${record.state}`, state: record.state };
    const meta = { decision, reason: reason.trim(), userId: globalThis.game.user.id ?? null, worldTime: Number.isFinite(Number(globalThis.game?.time?.worldTime)) ? Number(globalThis.game.time.worldTime) : null };
    const outcome = decision === 'finalize'
      ? await engine.finalizeForcePointSpend(actor, record, meta)
      : await engine.rollbackForcePointSpend(actor, record, meta);
    return { reconciled: Boolean(outcome?.finalized || outcome?.rolledBack), decision, outcome };
  }

export async function rollbackForcePointSpend(engine, actor, spentReceipt, reconciliation = null) {
    if (!actor?.id || !spentReceipt?.receiptId) throw new Error('Identified actor and Force Point receipt required');
    return withForcePointQueue(actor, async () => {
      const currentLedger = actor.getFlag?.('swse', 'forcePointLedger') ?? actor.flags?.swse?.forcePointLedger ?? {};
      const records = Array.isArray(currentLedger.receipts) ? currentLedger.receipts : [];
      const index = records.findIndex(entry => entry.receiptId === spentReceipt.receiptId && entry.actorId === actor.id);
      if (index < 0 || records[index].state !== 'committed') return { rolledBack: false, reason: 'Receipt missing or already compensated' };
      const own = records[index];
      const normal = Number(actor.system?.forcePoints?.value ?? 0);
      const max = Number(actor.system?.forcePoints?.max ?? normal);
      // The normal pool can never exceed its maximum. If the actor was refilled
      // after the debit, only the headroom is restored (nothing is fabricated);
      // the receipt is still closed so the cancelled use frees its round slot.
      // Bonus entries are never converted into normal points, nor vice versa.
      const normalRestored = Math.max(0, Math.min(own.normalSpent, max - normal));
      const pool = readBonusPool(actor);
      const merged = Array.isArray(pool.entries) ? pool.entries.map(e => ({ ...e })) : [];
      for (const used of own.bonusEntriesSpent ?? []) {
        const existing = merged.find(e => e.id === used.id);
        if (existing) {
          const e = used.entry;
          if (existing.source !== e.source || existing.expires !== e.expires ||
              JSON.stringify(existing.restrictions ?? existing.restriction ?? '') !== JSON.stringify(e.restrictions ?? e.restriction ?? '')) {
            return { rolledBack: false, reason: 'Bonus Force Point entry identity has changed' };
          }
          if (Number(existing.value ?? 0) + used.amount > Number(existing.max ?? e.max ?? 0)) {
            return { rolledBack: false, reason: 'Bonus Force Point entry has no capacity for exact refund' };
          }
          existing.value = Number(existing.value) + used.amount;
        } else {
          merged.push({ ...used.entry, value: used.amount });
        }
      }
      const bonusValue = merged.reduce((sum, e) => sum + Number(e.value ?? 0), 0);
      const updatedRecords = records.map((r, i) => i === index ? { ...r, state: 'rolled-back', ...(reconciliation ? { reconciliation } : {}) } : r);
      const update = {
        'system.forcePoints.value': normal + normalRestored,
        'flags.swse.forcePointLedger': { ...currentLedger, receipts: updatedRecords }
      };
      if (own.bonusEntriesSpent?.length) {
        Object.assign(update, bonusPoolUpdate(actor, {
          ...pool,
          entries: merged,
          value: bonusValue,
          max: Math.max(bonusValue, merged.reduce((sum, e) => sum + Number(e.max ?? e.value ?? 0), 0)),
          sources: [...new Set(merged.map(e => e.source).filter(Boolean))]
        }));
      }
      await engine.updateActor(actor, update);
      return { rolledBack: true, receiptId: own.receiptId, normalRestored,
        bonusRestored: (own.bonusEntriesSpent ?? []).reduce((sum, e) => sum + e.amount, 0) };
    });
  }

export async function finalizeForcePointSpend(engine, actor, spentReceipt, reconciliation = null) {
    if (!actor?.id || !spentReceipt?.receiptId) throw new Error('Force Point finalization requires an actor and receipt');
    let firstFinalization = false;
    const outcome = await withForcePointQueue(actor, async () => {
      const currentLedger = actor.getFlag?.('swse', 'forcePointLedger') ?? actor.flags?.swse?.forcePointLedger ?? {};
      const records = Array.isArray(currentLedger.receipts) ? currentLedger.receipts : [];
      const index = records.findIndex(r => r.receiptId === spentReceipt.receiptId && r.actorId === actor.id);
      if (index < 0) return { finalized: false, reason: 'Receipt not found' };
      if (records[index].state === 'finalized') return { finalized: true, alreadyFinalized: true };
      if (records[index].state !== 'committed') return { finalized: false, reason: 'Receipt is not pending finalization' };
      // Durable outbox: the trigger is recorded in the SAME write that makes the receipt final, so a
      // listener failure or client disconnect after this point can always be reconciled from the ledger.
      // Only the first committed->finalized transition records it; an alreadyFinalized retry never does.
      const trigger = hasForcePointTriggerConsumers()
        ? { state: 'pending', recordedAt: Date.now() }
        : undefined;
      const updatedRecords = records.map((r, i) => i === index ? { ...r, state: 'finalized', ...(trigger ? { trigger } : {}), ...(reconciliation ? { reconciliation } : {}) } : r);
      await engine.updateActor(actor, { 'flags.swse.forcePointLedger': { ...currentLedger, receipts: updatedRecords } });
      firstFinalization = Boolean(trigger);
      return { finalized: true, receiptId: spentReceipt.receiptId };
    });
    // Delivered AFTER the queue lock is released so a consumer may call ActorEngine writers without
    // re-entering the Force Point queue. A delivery failure never reverses the applied paid effect.
    if (firstFinalization) {
      try { await engine.dispatchForcePointTriggers(actor, { receiptId: outcome.receiptId }); }
      catch (error) { SWSELogger.error('[ActorEngine] Force Point trigger delivery failed; receipt stays final, trigger stays pending for reconcile', error); }
    }
    return outcome;
  }

export async function dispatchForcePointTriggers(engine, actor, { receiptId = null } = {}) {
    if (!actor?.id) throw new Error('dispatchForcePointTriggers requires an identified actor');
    const consumers = forcePointTriggerConsumers();
    const report = { delivered: 0, pending: 0, invalid: 0 };
    if (!consumers.length) return report;
    const ledger = actor.getFlag?.('swse', 'forcePointLedger') ?? actor.flags?.swse?.forcePointLedger ?? {};
    const rows = (Array.isArray(ledger.receipts) ? ledger.receipts : []).filter(r =>
      r.actorId === actor.id && r.state === 'finalized' && r.trigger?.state === 'pending'
      && (receiptId === null || r.receiptId === receiptId));
    for (const r of rows) {
      const key = `${actor.id}:${r.receiptId}`;
      if (_forcePointTriggersInFlight.has(key)) continue;
      _forcePointTriggersInFlight.add(key);
      try {
        if (!Number.isSafeInteger(r.spent) || r.spent < 1) { await engine.ackForcePointTrigger(actor, r.receiptId, 'invalid'); report.invalid++; continue; }
        const event = {
          actor, actorId: String(actor.uuid || actor.id), resource: 'force', spent: r.spent, committed: true,
          receiptId: r.receiptId, source: 'ActorEngine.finalizeForcePointSpend'
        };
        let allOk = true;
        for (const consume of consumers) {
          try { await consume(event); }
          catch (error) { allOk = false; SWSELogger.error(`[ActorEngine] Force Point trigger consumer failed for receipt ${r.receiptId}; stays pending`, error); }
        }
        if (allOk) { await engine.ackForcePointTrigger(actor, r.receiptId, 'delivered'); report.delivered++; } else report.pending++;
      } finally { _forcePointTriggersInFlight.delete(key); }
    }
    return report;
  }

export async function ackForcePointTrigger(engine, actor, receiptId, outcome = 'delivered') {
    if (!actor?.id || !receiptId) throw new Error('ackForcePointTrigger requires an actor and receiptId');
    return withForcePointQueue(actor, async () => {
      const currentLedger = actor.getFlag?.('swse', 'forcePointLedger') ?? actor.flags?.swse?.forcePointLedger ?? {};
      const records = Array.isArray(currentLedger.receipts) ? currentLedger.receipts : [];
      const index = records.findIndex(r => r.receiptId === receiptId && r.actorId === actor.id);
      if (index < 0 || records[index].trigger?.state !== 'pending') return { acked: false };
      const updated = records.map((r, i) => i === index ? { ...r, trigger: { ...r.trigger, state: outcome, ackedAt: Date.now() } } : r);
      await engine.updateActor(actor, { 'flags.swse.forcePointLedger': { ...currentLedger, receipts: updated } });
      return { acked: true, outcome };
    });
  }

export async function spendDestinyPoints(engine, actor, amount = 1, context = {}) {
    try {
      if (!actor) {throw new Error('spendDestinyPoints() called with no actor');}
      if (typeof amount !== 'number' || amount < 0) {
        throw new Error(`Invalid destiny point amount: ${amount}`);
      }
      if (!actor.id) {throw new Error('spendDestinyPoints requires an identified actor');}

      return await withDestinyPointQueue(actor, async () => {
        // Delegate calculation to ForcePointsService; mutation stays here
        const { newValue: newDP, actualSpent } = ForcePointsService.calcDestinySpend(actor, amount);

        if (actualSpent === 0) {
          SWSELogger.debug(`${actor.name} has no destiny points to spend`);
          return { spent: 0, remaining: newDP };
        }

        const ledger = destinyLedgerOf(actor);
        const entries = Array.isArray(ledger.receipts) ? ledger.receipts : [];
        const requestId = String(context?.requestId ||
          globalThis.foundry?.utils?.randomID?.() || globalThis.crypto?.randomUUID?.() || '');
        const receiptId = globalThis.foundry?.utils?.randomID?.() || globalThis.crypto?.randomUUID?.();
        if (!requestId || !receiptId) throw new Error('Destiny Point transaction identity unavailable');
        if (entries.some(entry => entry.requestId === requestId)) throw new Error('Duplicate Destiny Point transaction');
        const receipt = {
          receiptId, requestId, actorId: actor.id, spent: actualSpent, state: 'committed',
          worldTime: Number.isFinite(Number(globalThis.game?.time?.worldTime)) ? Number(globalThis.game.time.worldTime) : null,
          // Immutable spend-time evidence (Decision C), persisted with the debit; never a caller flag.
          spendEvidence: captureSpendEvidence(actor, 'destiny')
        };
        // Bounded retention: only settled receipts with no pending trigger are ever dropped.
        let retained = [...entries, receipt];
        if (retained.length > 200) {
          let drop = retained.length - 200;
          retained = retained.filter(r => !(drop > 0 && r.state !== 'committed' && r.trigger?.state !== 'pending' && drop--));
        }
        // The debit and its receipt are ONE write: there is never a spend without a receipt or a receipt without a spend.
        await engine.updateActor(actor, {
          'system.destinyPoints.value': newDP,
          'flags.swse.destinyPointLedger': { receipts: retained }
        });

        SWSELogger.log(`Destiny points spent: ${actor.name} used ${actualSpent}DP (now: ${newDP})`, {
          amount: actualSpent
        });
        return { ...receipt, remaining: newDP };
      });
    } catch (err) {
      SWSELogger.error(`ActorEngine.spendDestinyPoints failed for ${actor?.name ?? 'unknown actor'}`, {
        error: err,
        amount
      });
      throw err;
    }
  }

export async function rollbackDestinyPointSpend(engine, actor, spentReceipt) {
    if (!actor?.id || !spentReceipt?.receiptId) throw new Error('Identified actor and Destiny Point receipt required');
    return withDestinyPointQueue(actor, async () => {
      const ledger = destinyLedgerOf(actor);
      const records = Array.isArray(ledger.receipts) ? ledger.receipts : [];
      const index = records.findIndex(r => r.receiptId === spentReceipt.receiptId && r.actorId === actor.id);
      if (index < 0 || records[index].state !== 'committed') return { rolledBack: false, reason: 'Receipt missing or already settled' };
      const own = records[index];
      const current = Number(actor.system?.destinyPoints?.value ?? 0);
      const updated = records.map((r, i) => i === index ? { ...r, state: 'rolled-back' } : r);
      await engine.updateActor(actor, {
        'system.destinyPoints.value': current + own.spent,
        'flags.swse.destinyPointLedger': { ...ledger, receipts: updated }
      });
      return { rolledBack: true, receiptId: own.receiptId, restored: own.spent };
    });
  }

export async function finalizeDestinyPointSpend(engine, actor, spentReceipt) {
    if (!actor?.id || !spentReceipt?.receiptId) throw new Error('Destiny Point finalization requires an actor and receipt');
    let firstFinalization = false;
    const outcome = await withDestinyPointQueue(actor, async () => {
      const ledger = destinyLedgerOf(actor);
      const records = Array.isArray(ledger.receipts) ? ledger.receipts : [];
      const index = records.findIndex(r => r.receiptId === spentReceipt.receiptId && r.actorId === actor.id);
      if (index < 0) return { finalized: false, reason: 'Receipt not found' };
      if (records[index].state === 'finalized') return { finalized: true, alreadyFinalized: true };
      if (records[index].state !== 'committed') return { finalized: false, reason: 'Receipt is not pending finalization' };
      const trigger = hasSpendTriggerConsumers('destiny') ? { state: 'pending', recordedAt: Date.now() } : undefined;
      const updated = records.map((r, i) => i === index ? { ...r, state: 'finalized', ...(trigger ? { trigger } : {}) } : r);
      await engine.updateActor(actor, { 'flags.swse.destinyPointLedger': { ...ledger, receipts: updated } });
      firstFinalization = Boolean(trigger);
      return { finalized: true, receiptId: spentReceipt.receiptId };
    });
    if (firstFinalization) {
      try { await engine.dispatchDestinyPointTriggers(actor, { receiptId: outcome.receiptId }); }
      catch (error) { SWSELogger.error('[ActorEngine] Destiny Point trigger delivery failed; receipt stays final, trigger stays pending for reconcile', error); }
    }
    return outcome;
  }

export async function dispatchDestinyPointTriggers(engine, actor, { receiptId = null } = {}) {
    if (!actor?.id) throw new Error('dispatchDestinyPointTriggers requires an identified actor');
    const consumers = spendTriggerConsumers('destiny');
    const report = { delivered: 0, pending: 0, invalid: 0 };
    if (!consumers.length) return report;
    const rows = (Array.isArray(destinyLedgerOf(actor).receipts) ? destinyLedgerOf(actor).receipts : []).filter(r =>
      r.actorId === actor.id && r.state === 'finalized' && r.trigger?.state === 'pending'
      && (receiptId === null || r.receiptId === receiptId));
    for (const r of rows) {
      const key = `${actor.id}:${r.receiptId}`;
      if (_destinyTriggersInFlight.has(key)) continue;
      _destinyTriggersInFlight.add(key);
      try {
        if (!Number.isSafeInteger(r.spent) || r.spent < 1) { await engine.ackDestinyPointTrigger(actor, r.receiptId, 'invalid'); report.invalid++; continue; }
        const event = {
          actor, actorId: String(actor.uuid || actor.id), resource: 'destiny', spent: r.spent, committed: true,
          receiptId: r.receiptId, source: 'ActorEngine.finalizeDestinyPointSpend'
        };
        let allOk = true;
        for (const consume of consumers) {
          try { await consume(event); }
          catch (error) { allOk = false; SWSELogger.error(`[ActorEngine] Destiny Point trigger consumer failed for receipt ${r.receiptId}; stays pending`, error); }
        }
        if (allOk) { await engine.ackDestinyPointTrigger(actor, r.receiptId, 'delivered'); report.delivered++; } else report.pending++;
      } finally { _destinyTriggersInFlight.delete(key); }
    }
    return report;
  }

export async function ackDestinyPointTrigger(engine, actor, receiptId, outcome = 'delivered') {
    if (!actor?.id || !receiptId) throw new Error('ackDestinyPointTrigger requires an actor and receiptId');
    return withDestinyPointQueue(actor, async () => {
      const ledger = destinyLedgerOf(actor);
      const records = Array.isArray(ledger.receipts) ? ledger.receipts : [];
      const index = records.findIndex(r => r.receiptId === receiptId && r.actorId === actor.id);
      if (index < 0 || records[index].trigger?.state !== 'pending') return { acked: false };
      const updated = records.map((r, i) => i === index ? { ...r, trigger: { ...r.trigger, state: outcome, ackedAt: Date.now() } } : r);
      await engine.updateActor(actor, { 'flags.swse.destinyPointLedger': { ...ledger, receipts: updated } });
      return { acked: true, outcome };
    });
  }
