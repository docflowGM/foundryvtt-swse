/**
 * Force Point spend RECEIPT (TI-1). The single implementation of "what did this spend take, and give exactly that back". It owns no Force Point
 * rule and writes only through the one authority (ActorEngine.gainForcePoints / updateActor). Shared by the attack transaction
 * (scripts/combat/rolls/force-point-transaction.js) and ForcePointSpendCoordinator so the two cannot drift apart again.
 *
 *   snapshotBonusEntries(actor)               the bonus pool, normalized the way ActorEngine.spendForcePoints reads it
 *   receiptFromSpend(before, actor, spendRes) what THIS spend took: the normal point(s) and, per bonus entry id, the bonus point(s)
 *   giveBack(ActorEngine, actor, receipt)     returns exactly that, relative to the CURRENT pools (never an absolute snapshot); idempotent per part
 *                                             (a part that succeeded is not repeated by a retry). Resolves { ok, error? } — ok only when every part
 *                                             was actually written; it never throws.
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

/** Mutates `receipt` as parts complete, so a retry after a part-way failure repeats only what is left. */
export async function giveBack(ActorEngine, actor, receipt) {
  try {
    if (receipt.spentNormal > 0) {
      await ActorEngine.gainForcePoints(actor, receipt.spentNormal);
      receipt.spentNormal = 0;
    }
    if (receipt.gaveBonus.length) {
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
      receipt.gaveBonus = [];
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}
