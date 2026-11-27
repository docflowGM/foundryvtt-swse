/**
 * TransactionEngine pure helpers (3N-TE.2, extracted verbatim from transaction-engine.js).
 *
 * No Foundry document writes and no engine state: transaction-type derivation, leg reconciliation summaries, the approval lock key and the
 * source-rollback refusal check. TransactionEngine remains the single economic-settlement coordinator and calls these directly.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";

export function deriveTransactionType(context = '', amount = 0) {
  const key = String(context || '').toLowerCase();
  if (key.includes('refund') || key.includes('grant')) return 'Refund';
  if (key.includes('rollback') || key.includes('correction') || key.includes('adjustment')) return 'Correction';
  if (key.includes('sell') || key.includes('sale')) return 'Sell';
  if (key.includes('custom-approval')) return 'Approval Purchase';
  if (key.includes('purchase') || Number(amount) < 0) return 'Buy';
  if (Number(amount) > 0) return 'Credit';
  return 'Transaction';
}

/** Reconciliation evidence for one leg of a multi-leg operation. */
export function legSummary(leg = {}) {
  return { transactionId: leg.transactionId ?? null, success: leg.success === true, error: leg.error ?? null, rollbackFailed: leg.rollbackFailed === true, indeterminate: leg.indeterminate === true };
}

/** The lock that serializes every DECISION about one (owner, draft asset) pair: the approval transaction and a denial take the same key. */
export function assetApprovalLockKey(ownerActorId, assetActorId, transactionContext = 'store-custom-approval') {
  return `${ownerActorId}:${assetActorId}:${transactionContext}:asset-approval`;
}

/**
 * TI4-C0/G20 — inspect the CURRENT, authoritative state of a rollback's source transaction on the live actor.
 * Returns null when the rollback may proceed, otherwise a refusal `{ code, error, ... }`. Never throws. Reads the actor's flags (the stored record),
 * never a caller-supplied transaction object or UI flag such as `canRollback`.
 *
 * - empty/absent `sourceTransactionId`: nothing to check (legitimate source-less correction).
 * - id that is not a plain string, or that contains '.', or is a prototype property: `SOURCE_TRANSACTION_ID_INVALID`
 *   (the id becomes part of a flag path; a '.' would nest it and a missing record would be silently materialised as a stub).
 * - no record / non-object record: `SOURCE_TRANSACTION_NOT_FOUND` / `SOURCE_TRANSACTION_MALFORMED` (fail closed: the engine would otherwise create a
 *   stub source record when marking it).
 * - record already `Rolled Back`: `SOURCE_TRANSACTION_ALREADY_ROLLED_BACK` (its first rollback's id is reported, never overwritten).
 * Same-client only; this is not compare-and-swap.
 */
export function sourceRollbackRefusal(actor, sourceTransactionId) {
  if (sourceTransactionId === undefined || sourceTransactionId === null || sourceTransactionId === '') return null;
  if (typeof sourceTransactionId !== 'string' || !sourceTransactionId.trim() || sourceTransactionId.includes('.') || sourceTransactionId !== sourceTransactionId.trim()
    || ['__proto__', 'constructor', 'prototype'].includes(sourceTransactionId)) {
    return { code: 'SOURCE_TRANSACTION_ID_INVALID', error: 'Rollback refused: the source transaction id is not valid.' };
  }
  let records;
  try {
    records = actor.getFlag?.('foundryvtt-swse', 'transactions') || actor.flags?.['foundryvtt-swse']?.transactions || {};
  } catch (_err) {
    records = actor.flags?.['foundryvtt-swse']?.transactions || {};
  }
  if (!records || typeof records !== 'object' || !Object.prototype.hasOwnProperty.call(records, sourceTransactionId)) {
    return { code: 'SOURCE_TRANSACTION_NOT_FOUND', error: `Rollback refused: source transaction ${sourceTransactionId} was not found on this actor.` };
  }
  const record = records[sourceTransactionId];
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return { code: 'SOURCE_TRANSACTION_MALFORMED', error: `Rollback refused: source transaction ${sourceTransactionId} has a malformed record.` };
  }
  if (String(record.status ?? '').trim().toLowerCase() === 'rolled back') {
    return {
      code: 'SOURCE_TRANSACTION_ALREADY_ROLLED_BACK',
      alreadyRolledBack: true,
      rolledBackByTransactionId: record.rolledBackByTransactionId ?? null,
      error: `Rollback refused: source transaction ${sourceTransactionId} was already rolled back${record.rolledBackByTransactionId ? ` by ${record.rolledBackByTransactionId}` : ''}.`
    };
  }
  return null;
}

export function normalizeTransactionRecord(actor, record) {
  const audit = record.audit || {};
  const amount = Number.isFinite(Number(record.amount))
    ? Number(record.amount)
    : (Number(record.cost) > 0 ? -normalizeCredits(record.cost) : 0);
  const cost = Number.isFinite(Number(record.cost))
    ? normalizeCredits(record.cost)
    : Math.abs(normalizeCredits(amount));
  const auditItems = Array.isArray(audit.items) ? audit.items.filter(item => item && typeof item === 'object') : [];
  const itemNames = Array.isArray(audit.itemNames)
    ? audit.itemNames.filter(Boolean)
    : auditItems.map(item => item?.name).filter(Boolean);
  const rollback = audit.rollback || {};

  return {
    id: record.id || record.transactionId || '',
    transactionId: record.id || record.transactionId || '',
    context: record.context || 'unknown',
    timestamp: record.createdAt || record.timestamp || 0,
    actorId: record.actorId || actor?.id || '',
    actorName: record.actorName || actor?.name || 'Unknown Actor',
    userId: record.userId || audit.userId || null,
    userName: record.userName || audit.userName || game?.users?.get?.(record.userId || audit.userId)?.name || '—',
    amount,
    cost,
    creditsBefore: record.creditsBefore ?? audit.creditsBefore ?? null,
    creditsAfter: record.creditsAfter ?? audit.creditsAfter ?? null,
    status: record.status || 'Success',
    reason: record.reason || audit.reason || record.error || '',
    source: record.source || audit.source || 'TransactionEngine',
    type: record.type || deriveTransactionType(record.context, amount),
    itemNames,
    itemName: record.itemName || audit.itemName || (itemNames.length ? itemNames.join(', ') : audit.label || 'Credit Transaction'),
    itemCount: Number(audit.itemCount ?? auditItems.reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0) ?? itemNames.length ?? 0) || 0,
    itemIds: auditItems.map(item => item?.id || item?.itemId).filter(Boolean),
    rollbackOf: record.rollbackOf || audit.rollbackOf || rollback.sourceTransactionId || null,
    rolledBackByTransactionId: record.rolledBackByTransactionId || audit.rolledBackByTransactionId || null,
    rollbackReason: record.rollbackReason || audit.rollbackReason || rollback.reason || '',
    audit
  };
}

/**
 * TI-2 (review TI2-R2): completion hooks are PRESENTATION. They run only after the transaction committed, a throwing listener must never be
 * mistaken for a failed transaction (the old inline calls sat inside the transaction's `try`, so a throwing listener triggered the rollback of a
 * committed change). Returns null, or a short description of the listener failure for the caller to report as `presentationError`.
 */
export function emitCommitted(name, build) {
  try {
    Hooks.callAll?.(name, build());
    return null;
  } catch (error) {
    swseLogger.error(`TransactionEngine: ${name} failed after the transaction committed; the transaction is NOT undone`, { error: error?.message });
    return `${name}: ${error?.message ?? error}`;
  }
}

/** H7: a cost is a finite number or a non-empty numeric string; anything else is NaN (refused by the caller). An omitted cost defaults to 0 upstream. */
export function parseTransactionCost(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') return Number(value);
  return NaN;
}
