/**
 * Force Point spend RECEIPT (TI-1). The single implementation of "what did this spend take, and give exactly that back". It owns no Force Point
 * rule and writes only through the one authority (ActorEngine.gainForcePoints / updateActor). Shared by the attack transaction
 * (scripts/combat/rolls/force-point-transaction.js) and ForcePointSpendCoordinator so the two cannot drift apart again.
 *
 *   snapshotBonusEntries(actor)               the bonus pool, normalized the way ActorEngine.spendForcePoints reads it
 *   receiptFromSpend(before, actor, spendRes) what THIS spend took: the normal point(s) and, per bonus entry id, the bonus point(s)
 *   giveBack(ActorEngine, actor, receipt)     returns exactly that, relative to the CURRENT pools (never an absolute snapshot); single-flight per receipt
 *                                             and idempotent per part. Resolves { ok, indeterminate?, error?, evidence? } — ok only when every part was
 *                                             actually written; an uncertain write is 'indeterminate' and never retried automatically; never throws.
 */

/** Bonus Force Points normalized the way ActorEngine.spendForcePoints reads them, so the entries a spend consumed can be given back by id. */
export const bonusEntries = (pool) => {
  if (!pool || typeof pool !== 'object') {return [];}
  if (Array.isArray(pool.entries) && pool.entries.length) {return pool.entries.map((e, i) => ({ ...e, id: String(e?.id ?? `bonus-${i}`), value: Math.max(0, Number(e?.value ?? 0) || 0) }));}
  const v = Math.max(0, Number(pool.value ?? 0) || 0);
  return v > 0 ? [{ id: 'legacy-bonus-force-points', source: 'Bonus Force Point', value: v, max: v }] : [];
};

export const snapshotBonusEntries = (actor) => bonusEntries(actor.getFlag?.('swse', 'bonusForcePoints'));

/** @returns {{ spentNormal: number, gaveBonus: Array<{entry: object, amount: number}> }} */
export function receiptFromSpend(beforeBonus, actor, spendResult) {
  const afterBonus = snapshotBonusEntries(actor);
  const gaveBonus = beforeBonus
    .map((e) => ({ entry: e, amount: e.value - (afterBonus.find((x) => x.id === e.id)?.value ?? 0) }))
    .filter((x) => x.amount > 0);
  const bonusTaken = gaveBonus.reduce((n, x) => n + x.amount, 0);
  const spentNormal = Math.max(0, Number.isFinite(spendResult?.normalSpent) ? spendResult.normalSpent : (Number(spendResult?.spent) || 0) - bonusTaken);
  return { spentNormal, gaveBonus };
}

/** What a client can observe of the actor's Force Point pools right now (normal value + every bonus entry), as a comparable signature plus the raw evidence. */
export function observePools(actor) {
  const bonus = snapshotBonusEntries(actor).map((e) => [e.id, e.value]);
  return { normal: Number(actor.system?.forcePoints?.value ?? 0), bonus, signature: JSON.stringify([Number(actor.system?.forcePoints?.value ?? 0), bonus]) };
}
export const poolsChanged = (before, after) => before.signature !== after.signature;

/**
 * Refund lifecycle, per receipt (single client; Foundry has no compare-and-swap). Kept off the receipt object so it is never serialized:
 *   idle -> refunding -> refunded | failed (clean: nothing observable changed, retryable, completed parts are kept) | indeterminate (terminal)
 * Concurrent giveBack() callers on one receipt share ONE run and ONE result. A write that threw after the observable pools changed is
 * 'indeterminate': it might have fully, partly or not applied, so it is NEVER retried or compensated automatically — the evidence is returned for
 * reconciliation. A write that threw with the pools unchanged is a clean failure and may be retried (only the parts still outstanding).
 */
const lifecycle = new WeakMap();

/** Mutates `receipt` as parts complete, so a retry after a clean part-way failure repeats only what is left. Resolves { ok, indeterminate?, error?, evidence? }; never throws. */
export function giveBack(ActorEngine, actor, receipt) {
  const state = lifecycle.get(receipt) ?? { status: 'idle', run: null, result: null };
  lifecycle.set(receipt, state);
  if (state.run) {return state.run;}                                     // a refund is in flight: share it
  if (state.status === 'indeterminate' || state.status === 'refunded') {return Promise.resolve(state.result);}   // settled: report it, change nothing
  state.status = 'refunding';
  state.run = writeParts(ActorEngine, actor, receipt).then((result) => {
    state.status = result.ok ? 'refunded' : (result.indeterminate ? 'indeterminate' : 'failed');
    state.result = result; state.run = null;
    return result;
  });
  return state.run;
}

async function writeParts(ActorEngine, actor, receipt) {
  const guarded = async (write) => {
    const before = observePools(actor);
    try { await write(); return { ok: true }; } catch (error) {
      const after = observePools(actor);
      if (poolsChanged(before, after)) {return { ok: false, indeterminate: true, error, evidence: { before, after, note: 'the refund write threw after the observable Force Point pools changed; whether it fully applied is unknown' } };}
      return { ok: false, error };
    }
  };
  if (receipt.spentNormal > 0) {
    const r = await guarded(() => ActorEngine.gainForcePoints(actor, receipt.spentNormal));
    if (!r.ok) {return r;}
    receipt.spentNormal = 0;
  }
  if (receipt.gaveBonus.length) {
    const r = await guarded(async () => {
      const poolNow = actor.getFlag?.('swse', 'bonusForcePoints') ?? {};
      const entries = bonusEntries(poolNow);
      for (const { entry, amount } of receipt.gaveBonus) {
        const here = entries.find((e) => e.id === entry.id);
        if (here) {here.value += amount;}
        else {entries.push({ ...entry, value: amount });}
      }
      const value = entries.reduce((n, e) => n + e.value, 0);
      const max = entries.reduce((n, e) => n + Math.max(0, Number(e.max ?? e.value) || 0), 0);
      await ActorEngine.updateActor(actor, { 'flags.swse.bonusForcePoints': { ...poolNow, value, max: Math.max(value, max), sources: [...new Set(entries.map((e) => e.source).filter(Boolean))], entries } });
    });
    if (!r.ok) {return r;}
    receipt.gaveBonus = [];
  }
  return { ok: true };
}
