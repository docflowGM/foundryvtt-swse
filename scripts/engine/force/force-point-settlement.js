/**
 * Settle a Force Point receipt (finalize after the paid effect applied, or exact rollback when it did not).
 * One retry, then a re-read of the actor's OWN ledger: a write may have applied before the error surfaced, so the ledger, not the
 * thrown error, decides. Returns true only when the receipt is verifiably in the wanted state; false means UNRESOLVED (the receipt
 * stays `committed` and appears in ActorEngine.listUnsettledForcePointReceipts for a recorded GM decision).
 */
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export async function settleForcePointReceipt(actor, receipt, mode) {
  const wantState = mode === 'finalize' ? 'finalized' : 'rolled-back';
  const stateNow = () => (actor.getFlag?.('swse', 'forcePointLedger') ?? actor.flags?.swse?.forcePointLedger ?? {}).receipts
    ?.find?.((r) => r.receiptId === receipt.receiptId)?.state;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const out = mode === 'finalize'
        ? await ActorEngine.finalizeForcePointSpend(actor, receipt)
        : await ActorEngine.rollbackForcePointSpend(actor, receipt);
      if (out?.finalized === true || out?.rolledBack === true) return true;
    } catch (error) {
      SWSELogger.warn?.(`[ForcePointSettlement] ${mode} attempt ${attempt + 1} threw: ${error?.message ?? error}`);
    }
    if (stateNow() === wantState) return true;
  }
  return false;
}
