/**
 * GameCreditEscrowService
 *
 * Credit-only wager lifecycle for Holopad Games. This service owns game escrow
 * metadata, but it never mutates actor credits directly: every debit, payout,
 * and refund goes through TransactionEngine so the actor transaction ledger
 * remains the single source of truth.
 */

import { TransactionEngine } from '/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js';
import { LedgerService } from '/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js';
import { normalizeCredits } from '/systems/foundryvtt-swse/scripts/utils/credit-normalization.js';
import { GameSessionStore } from '../game-session-store.js';
import { GameEconomyPolicyService } from './game-economy-policy-service.js';

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? null));
}

function randomId(prefix = 'gw') {
  return `${prefix}_${globalThis.foundry?.utils?.randomID?.(8) || Math.random().toString(36).slice(2, 10)}`;
}

function now() {
  return Date.now();
}

function safeAmount(value) {
  const amount = normalizeCredits(Number(value || 0));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function actorForSeat(seat = {}) {
  return seat.actorId ? game.actors?.get?.(seat.actorId) ?? null : null;
}

function isAutomatedSeat(seat = {}) {
  return seat.type === 'ai' || seat.aiProfile || seat.type === 'npc';
}

function playableSeats(session = {}) {
  return (Array.isArray(session.seats) ? session.seats : [])
    .filter(seat => seat && seat.status !== 'declined' && seat.status !== 'cancelled');
}

function humanCreditSeats(session = {}) {
  return playableSeats(session).filter(seat => !isAutomatedSeat(seat) && actorForSeat(seat));
}

function gameTitle(session = {}) {
  const id = String(session.gameId || '').trim();
  const labels = { pazaak: 'Pazaak', sabacc: 'Sabacc', hintaro: 'Hintaro', dejarik: 'Dejarik' };
  return labels[id] || 'Game';
}

function seatLabel(seat = {}) {
  return seat.displayName || seat.actorId || seat.seatId || 'Unknown Seat';
}

function baseAudit(session = {}, seat = {}, extra = {}) {
  return {
    source: 'games',
    gameId: session.gameId,
    sessionId: session.id,
    sessionTitle: session.title,
    seatId: seat?.seatId ?? null,
    seatLabel: seat ? seatLabel(seat) : null,
    rulesMode: session.rulesMode,
    wagerMode: session.wagerProfile?.mode ?? 'none',
    ...extra
  };
}

function getCreditProfile(session = {}) {
  const profile = clone(session.wagerProfile || {});
  const mode = String(profile.mode || '').toLowerCase();
  const enabled = session.rulesMode === 'wagered' && ['credits', 'credit', 'buy-in', 'pending'].includes(mode);
  const buyIn = safeAmount(profile.buyIn ?? profile.creditBuyIn ?? profile.ante ?? 0);
  const houseStake = safeAmount(profile.houseStake ?? 0);
  return {
    ...profile,
    mode: enabled ? 'credits' : (profile.mode || 'none'),
    enabled: Boolean(enabled && buyIn > 0),
    buyIn,
    houseStake,
    payoutMode: profile.payoutMode || 'winner-takes-pot'
  };
}

function ensureEscrow(session = {}) {
  const escrow = clone(session.escrow || {});
  escrow.credits ??= {};
  escrow.credits.entries ??= [];
  escrow.credits.transactions ??= [];
  escrow.credits.refunds ??= [];
  return escrow;
}

async function refundDebitEntries(session, entries = [], reason = 'Game escrow rollback') {
  const refunds = [];
  for (const entry of entries) {
    const actor = entry.actorId ? game.actors?.get?.(entry.actorId) : null;
    const amount = safeAmount(entry.amount);
    if (amount <= 0) continue;
    if (!actor) {
      refunds.push({
        success: false,
        actorId: entry.actorId ?? null,
        actorName: entry.actorName ?? null,
        seatId: entry.seatId,
        seatLabel: entry.seatLabel,
        amount,
        debitTransactionId: entry.transactionId ?? null,
        error: `${entry.seatLabel || entry.seatId || 'A seat'} has no actor-backed wallet for refund.`
      });
      continue;
    }
    const refund = await TransactionEngine.executeCreditAdjustment({
      actor,
      amount,
      reason,
      transactionContext: 'game-credit-refund',
      audit: {
        ...baseAudit(session, { seatId: entry.seatId, displayName: entry.seatLabel }, {
          escrowId: session.escrow?.credits?.escrowId ?? null,
          refundOfTransactionId: entry.transactionId,
          refundReason: reason,
          wagerType: 'buy-in'
        })
      }
    }, { source: 'GameCreditEscrowService.refundDebitEntries' });
    refunds.push({ ...refund, actorId: actor.id, actorName: actor.name, seatId: entry.seatId, amount, debitTransactionId: entry.transactionId ?? null });
  }
  return refunds;
}

/* ------------------------------------------------------------------------------------------------------------------------------------------ *
 * TI4-C0/G22 — per-entry refund evidence.
 *
 * Every escrow debit entry has its own refund state, derived from `escrow.credits.refundLedger` (written by refundSession, keyed by the entry's
 * debit transaction id) or, for sessions refunded before the ledger existed, from the `escrow.credits.refunds` history (matched by seat). States:
 *   pending       no refund was ever attempted
 *   failed        every previous attempt DEFINITIVELY failed (success:false without rollbackFailed/indeterminate): retryable
 *   refunded      a refund with a transaction id succeeded: never refunded again
 *   indeterminate an attempt returned rollbackFailed/indeterminate/threw/was interrupted before its result was recorded: credits may have moved
 *   review        evidence is missing, malformed or ambiguous: fail closed
 * Only `pending` and `failed` entries are ever refunded. Same-client only (L1): there is no durable receipt and no compare-and-swap.
 * ------------------------------------------------------------------------------------------------------------------------------------------ */
const refundsInFlight = new Set();

/** The escrow debit's transaction id, or null when it is missing / null / empty / blank (an entry without one has no identifiable debit). */
function debitIdOf(entry = {}) {
  const id = entry?.transactionId;
  if (id === undefined || id === null) return null;
  const text = String(id).trim();
  return text === '' ? null : text;
}

function refundEntryKey(entry = {}) {
  return debitIdOf(entry) ?? `seat:${entry.seatId}`;
}

/** Strict identity: both sides must be present (non-empty) and equal. A missing value never matches. */
function sameId(a, b) {
  return a !== undefined && a !== null && a !== '' && b !== undefined && b !== null && b !== '' && String(a) === String(b);
}

/** Strict amount: the recorded amount must be present, positive and equal. A missing amount never matches. */
function sameAmount(recorded, expected) {
  return recorded !== undefined && recorded !== null && recorded !== '' && expected > 0 && safeAmount(recorded) === expected;
}

function classifyRefundRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record) || typeof record.success !== 'boolean') return 'review';
  if (record.success === true) return record.transactionId ? 'refunded' : 'review';
  if (record.rollbackFailed === true || record.indeterminate === true) return 'indeterminate';
  return 'failed';
}

function deriveRefundStates(credits = {}) {
  const entries = (Array.isArray(credits.entries) ? credits.entries : []).filter(entry => entry && safeAmount(entry.amount) > 0);
  const history = Array.isArray(credits.refunds) ? credits.refunds : [];
  const ledger = credits.refundLedger && typeof credits.refundLedger === 'object' ? credits.refundLedger : {};
  const keyCounts = new Map();
  for (const entry of entries) {
    keyCounts.set(refundEntryKey(entry), (keyCounts.get(refundEntryKey(entry)) || 0) + 1);
  }

  // Legacy refund-history attribution. A seat is NOT an identity, and every identity field must be PRESENT and agree (nothing is manufactured):
  //   - a record naming a debit id belongs only to the entry with that id, and only if its seat, actor and amount agree with that entry;
  //     a disagreeing record is conflicting evidence for that entry AND for the seat(s) the record itself claims; a named id matching no entry is
  //     conflicting evidence for the seat it claims;
  //   - a record without a debit id is attributable only when its seat has exactly one escrow entry and actor and amount agree;
  //   - a record with neither a debit id nor a seat cannot be attributed to anything: every entry fails closed.
  // A conflict sends the affected entries to review: it is never ignored as "no refund attempted", and it applies to failures as well as successes.
  const legacy = new Map(entries.map(entry => [entry, { attributed: [], conflict: null }]));
  const flag = (entry, reason) => { const slot = legacy.get(entry); slot.conflict ??= reason; };
  let globalConflict = null;
  const hasSeat = (record) => record.seatId !== undefined && record.seatId !== null && String(record.seatId).trim() !== '';
  for (const record of history) {
    if (!record || typeof record !== 'object') continue;
    const named = record.debitTransactionId !== undefined && record.debitTransactionId !== null && String(record.debitTransactionId).trim() !== '' ? String(record.debitTransactionId).trim() : null;
    const claimedSeat = entries.filter(entry => sameId(record.seatId, entry.seatId));
    const agrees = (entry) => sameId(record.seatId, entry.seatId) && sameId(record.actorId, entry.actorId) && sameAmount(record.amount, safeAmount(entry.amount));
    if (named) {
      const owners = entries.filter(entry => debitIdOf(entry) === named);
      if (!owners.length) {
        if (!claimedSeat.length && !hasSeat(record)) globalConflict ??= 'refund-evidence-unattributable';   // unknown debit AND no usable seat: attributable to nothing
        for (const entry of claimedSeat) flag(entry, 'refund-evidence-for-unknown-debit');
        continue;
      }
      for (const owner of owners) {
        if (agrees(owner)) legacy.get(owner).attributed.push(record);
        else {
          flag(owner, 'refund-evidence-identity-conflict');
          for (const entry of claimedSeat) if (entry !== owner) flag(entry, 'refund-evidence-names-another-debit');
        }
      }
      continue;
    }
    if (!claimedSeat.length) {
      if (record.seatId === undefined || record.seatId === null || record.seatId === '') globalConflict ??= 'refund-evidence-unattributable';
      continue;                                    // a record for a seat with no escrow entry here is not this session's debit evidence
    }
    if (claimedSeat.length !== 1) { for (const entry of claimedSeat) flag(entry, 'refund-evidence-not-attributable-to-one-debit'); continue; }
    if (agrees(claimedSeat[0])) legacy.get(claimedSeat[0]).attributed.push(record);
    else flag(claimedSeat[0], 'refund-evidence-identity-conflict');
  }

  return entries.map(entry => {
    const key = refundEntryKey(entry);
    const amount = safeAmount(entry.amount);
    const base = { key, entry, seatId: entry.seatId, actorId: entry.actorId ?? null, amount, debitTransactionId: entry.transactionId ?? null };
    if (keyCounts.get(key) > 1) return { ...base, status: 'review', reason: 'ambiguous-entry-identity' };
    // An entry with no identifiable debit transaction can neither be refunded automatically nor have a refund ledger / history trusted for it:
    // the synthetic `seat:` key is a lookup convenience, not an identity.
    if (!debitIdOf(entry)) return { ...base, status: 'review', reason: 'escrow-entry-without-debit-transaction-id' };

    const led = ledger[key];
    if (led) {
      // A ledger record is evidence only for the debit it names: debit id, seat, actor and amount must ALL be present and agree with the entry.
      if (!sameId(led.seatId, entry.seatId)
        || !sameId(led.actorId, entry.actorId)
        || !sameId(led.debitTransactionId, debitIdOf(entry))
        || !sameAmount(led.amount, amount)) return { ...base, status: 'review', reason: 'ledger-identity-mismatch', ledger: led };
      if (led.status === 'refunded') return led.refundTransactionId ? { ...base, status: 'refunded', refundTransactionId: led.refundTransactionId, ledger: led } : { ...base, status: 'review', reason: 'refunded-without-transaction-id', ledger: led };
      if (led.status === 'failed') return { ...base, status: 'failed', ledger: led };
      if (led.status === 'indeterminate') return { ...base, status: 'indeterminate', reason: 'unresolved-refund-outcome', ledger: led };
      if (led.status === 'attempting') return { ...base, status: 'indeterminate', reason: 'interrupted-attempt', ledger: led };
      return { ...base, status: 'review', reason: 'unknown-ledger-status', ledger: led };
    }

    // Legacy history (no ledger): evidence attributed record by record in `legacy` below (computed once for all entries).
    const { attributed, conflict: entryConflict } = legacy.get(entry);
    const conflict = entryConflict ?? globalConflict;
    if (conflict) return { ...base, status: 'review', reason: conflict };
    const classes = attributed.map(classifyRefundRecord);
    const successes = attributed.filter((_record, index) => classes[index] === 'refunded');
    if (successes.length) return { ...base, status: 'refunded', refundTransactionId: successes[0].transactionId, duplicateRefunds: successes.length > 1 ? successes.length : 0 };
    if (classes.includes('indeterminate')) return { ...base, status: 'indeterminate', reason: 'unresolved-refund-outcome' };
    if (classes.includes('review')) return { ...base, status: 'review', reason: 'missing-or-malformed-refund-evidence' };
    if (attributed.length) return { ...base, status: 'failed' };
    return { ...base, status: 'pending' };
  });
}

/** Unresolved payout activity means the buy-in may already have been (partly) paid out: refunding it in full could create credits. */
function payoutRefundBlockers(credits = {}) {
  const blockers = [];
  const payout = credits.payout;
  if (payout && typeof payout === 'object') {
    if (payout.success === true) blockers.push('a payout was paid and is not recorded as rolled back');
    else if (payout.rollbackFailed === true || payout.indeterminate === true) blockers.push('a payout outcome is unresolved');
  }
  const payouts = Array.isArray(credits.payouts) ? credits.payouts : [];
  const rollbacks = Array.isArray(credits.payoutRollbacks) ? credits.payoutRollbacks : [];
  // A payout counts as reversed only by a SUCCESSFUL rollback that can be matched to THAT payout, each rollback used once:
  //   - a rollback that names the payout it reverses (`rollbackOfTransactionId`) matches only that payout, and only when seat, actor and amount (-approvedPayout) also agree;
  //   - an older rollback without it matches only when seat, actor and amount all agree (a missing actor or amount never matches).
  // A reversal of another payout on the same seat is not proof; anything unmatched blocks the refund.
  const available = rollbacks.filter(rollback => rollback && rollback.success === true);
  const paid = payouts.filter(entry => entry?.success === true);
  const unmatched = [];
  const take = (predicate) => { const index = available.findIndex(predicate); if (index < 0) return false; available.splice(index, 1); return true; };
  // Every identity must be present and agree: payout id (explicit) or none (legacy), seat, actor, and the reversal amount (-approvedPayout).
  const reverses = (rollback, entry) => {
    const expected = safeAmount(entry.approvedPayout ?? entry.amount);
    return rollback.seatId !== undefined && rollback.seatId === entry.seatId && sameId(rollback.actorId, entry.actorId) && expected > 0 && Number(rollback.amount) === -expected;
  };
  const pending = paid.filter(entry => !take(rollback => rollback.rollbackOfTransactionId && entry.transactionId && String(rollback.rollbackOfTransactionId) === String(entry.transactionId) && reverses(rollback, entry)));
  for (const entry of pending) {
    if (!take(rollback => !rollback.rollbackOfTransactionId && reverses(rollback, entry))) unmatched.push(entry);
  }
  for (const entry of unmatched) blockers.push(`the payout to ${entry.seatId} is not recorded as rolled back`);
  for (const entry of payouts) {
    if (entry?.success !== true && (entry?.rollbackFailed === true || entry?.indeterminate === true)) blockers.push(`the payout to ${entry?.seatId ?? 'a seat'} is unresolved`);
  }
  if (rollbacks.some(rollback => rollback && rollback.success !== true)) blockers.push('a payout rollback failed');
  return blockers;
}

async function persistRefundProgress(sessionId, key, ledgerEntry, historyRecord = null) {
  const current = GameSessionStore.getSession(sessionId);
  if (!current) throw new Error('The game session is no longer in the session store.');
  const escrow = ensureEscrow(current);
  escrow.credits.refundLedger = { ...(escrow.credits.refundLedger || {}), [key]: ledgerEntry };
  if (historyRecord) escrow.credits.refunds = [...escrow.credits.refunds, historyRecord];
  return GameSessionStore.upsertSession({ ...current, escrow });
}

function failedCreditResults(results = []) {
  return (Array.isArray(results) ? results : []).filter(result => result && result.success !== true);
}

function summarizeFailures(results = [], fallback = 'One or more credit transactions failed.') {
  const failures = failedCreditResults(results);
  if (!failures.length) return '';
  return failures.map(result => result.error || `${result.actorName || result.seatLabel || result.seatId || 'Unknown seat'} failed`).join(' ')
    || fallback;
}

function normalizeBalanceMap(balances = {}) {
  return Object.fromEntries(Object.entries(balances || {})
    .map(([seatId, amount]) => [seatId, safeAmount(amount)])
    .filter(([_seatId, amount]) => amount > 0));
}

function sumBalanceMap(balances = {}) {
  return Object.values(balances || {}).reduce((sum, amount) => sum + safeAmount(amount), 0);
}

function allocateApprovedBalances(balances = {}, approvedTotal = 0) {
  const normalized = normalizeBalanceMap(balances);
  const requestedTotal = sumBalanceMap(normalized);
  const approved = Math.min(requestedTotal, safeAmount(approvedTotal));
  if (requestedTotal <= 0 || approved <= 0) return {};
  if (approved >= requestedTotal) return normalized;

  const raw = Object.entries(normalized).map(([seatId, amount]) => {
    const exact = (amount / requestedTotal) * approved;
    const floor = Math.floor(exact);
    return { seatId, floor, fraction: exact - floor };
  });
  let remainder = approved - raw.reduce((sum, entry) => sum + entry.floor, 0);
  raw.sort((a, b) => b.fraction - a.fraction);
  for (const entry of raw) {
    if (remainder <= 0) break;
    entry.floor += 1;
    remainder -= 1;
  }
  return Object.fromEntries(raw.filter(entry => entry.floor > 0).map(entry => [entry.seatId, entry.floor]));
}

async function rollbackAppliedCreditPayouts(session = {}, payouts = [], reason = 'Rollback failed game payout', source = 'GameCreditEscrowService.rollbackAppliedCreditPayouts') {
  const rollbacks = [];
  for (const payout of [...(Array.isArray(payouts) ? payouts : [])].reverse()) {
    if (!payout?.success || !payout.actorId) continue;
    const amount = safeAmount(payout.approvedPayout ?? payout.amount);
    if (amount <= 0) continue;
    const actor = game.actors?.get?.(payout.actorId);
    if (!actor) {
      rollbacks.push({ success: false, actorId: payout.actorId, seatId: payout.seatId, amount: -amount, error: 'Actor missing during game payout rollback.' });
      continue;
    }
    const rollback = await TransactionEngine.executeCreditAdjustment({
      actor,
      amount: -amount,
      reason,
      transactionContext: 'game-credit-refund',
      audit: {
        ...baseAudit(session, { seatId: payout.seatId, displayName: payout.seatLabel || payout.actorName }, {
          rollbackOfTransactionId: payout.transactionId,
          rollbackReason: reason,
          originalPayoutAmount: amount,
          payoutType: payout.payoutType || 'table-credit-balances'
        })
      }
    }, { source });
    rollbacks.push({ ...rollback, actorId: actor.id, actorName: actor.name, seatId: payout.seatId, amount: -amount, rollbackOfTransactionId: payout.transactionId ?? null });
  }
  return rollbacks;
}

async function approveTableCreditBalanceSettlement(session = {}, escrow = {}, { payoutAmount = 0, decision = 'custom', reason = '', by = null } = {}) {
  const requestedBalances = normalizeBalanceMap(escrow.credits?.payoutBalances || {});
  const requested = sumBalanceMap(requestedBalances);
  const approvedTotal = Math.min(requested, safeAmount(payoutAmount));
  const approvedBalances = decision === 'denied' || approvedTotal <= 0 ? {} : allocateApprovedBalances(requestedBalances, approvedTotal);
  const gmReason = String(reason || '').trim() || `GM ${decision} settlement for ${session.title || 'game'}`;
  const missingActorSeat = playableSeats(session).find(seat => !isAutomatedSeat(seat) && requestedBalances[seat.seatId] > 0 && !actorForSeat(seat));
  if (missingActorSeat && approvedTotal > 0) {
    return { ok: false, error: `${seatLabel(missingActorSeat)} has no actor-backed wallet for payout.`, session };
  }

  const payouts = [];
  let payoutRollbacks = [];
  let status = 'settled';
  let message = approvedTotal > 0
    ? `GM approved ${approvedTotal.toLocaleString()} credits across table-credit balances.`
    : 'GM voided the campaign payout; no credits were awarded.';

  for (const seat of playableSeats(session)) {
    const actor = actorForSeat(seat);
    const approvedPayout = safeAmount(approvedBalances[seat.seatId]);
    if (!actor || approvedPayout <= 0) continue;
    const requestedPayout = safeAmount(requestedBalances[seat.seatId]);
    const payout = await TransactionEngine.executeCreditAdjustment({
      actor,
      amount: approvedPayout,
      reason: gmReason,
      transactionContext: 'game-credit-payout',
      audit: baseAudit(session, seat, {
        escrowId: escrow.credits.escrowId,
        payoutType: 'table-credit-balances',
        requestedPayout,
        approvedPayout,
        economySource: 'gm-approved',
        economyPolicy: 'gm-approved',
        policyCode: 'gmSettlementApproved',
        gmDecision: decision,
        gmReason
      })
    }, { source: 'GameCreditEscrowService.approveTableCreditBalanceSettlement' });
    payouts.push({ ...payout, actorId: actor.id, actorName: actor.name, seatId: seat.seatId, requestedPayout, approvedPayout });
    if (!payout.success) {
      payoutRollbacks = await rollbackAppliedCreditPayouts(session, payouts, `Rollback failed GM-approved settlement for ${session.title || 'game'}`, 'GameCreditEscrowService.approveTableCreditBalanceSettlement.rollback');
      status = 'payout-failed';
      message = payout.error || 'GM-approved table-credit payout failed.';
      break;
    }
  }

  const updated = await GameSessionStore.upsertSession({
    ...session,
    status: session.gameState?.phase === 'complete' ? 'complete' : session.status,
    escrow: {
      ...escrow,
      credits: {
        ...escrow.credits,
        status,
        settledAt: status === 'settled' ? now() : null,
        gmSettledAt: now(),
        gmSettledBy: by ?? game.user?.id ?? null,
        gmDecision: decision,
        gmReason,
        payoutMode: 'table-credit-balances',
        payoutBalances: requestedBalances,
        approvedBalances,
        payouts,
        payoutRollbacks,
        payoutRequested: requested,
        payoutApproved: status === 'settled' ? payouts.reduce((sum, payout) => sum + safeAmount(payout.approvedPayout), 0) : 0,
        settlementMessage: message,
        policy: {
          ...(escrow.credits.policy || {}),
          allowed: true,
          requiresGmApproval: false,
          approvedPayout: approvedTotal,
          payoutPolicy: 'gm-approved',
          gmDecision: decision
        }
      }
    },
    log: [...(session.log ?? []), { id: randomId('log'), at: now(), type: status === 'settled' ? 'credit-table-balances-gm-settled' : 'credit-table-balances-payout-failed', by: by ?? game.user?.id ?? null, requestedBalances, approvedBalances, approvedPayout: approvedTotal, decision, error: status === 'payout-failed' ? message : null }]
  });
  return { ok: status === 'settled', session: updated, payouts, error: status === 'payout-failed' ? message : null };
}

async function refundSessionAuthoritative(sessionId, reason) {
  const first = GameSessionStore.getSession(sessionId);
  const escrow0 = ensureEscrow(first);
  if (escrow0.credits.status === 'refunded') return { ok: true, skipped: true, session: first };
  if (!['escrowed', 'payout-failed', 'refund-failed'].includes(escrow0.credits.status)) return { ok: false, error: 'Credit escrow is not refundable in its current state.', session: first };
  const blockers = payoutRefundBlockers(escrow0.credits);
  if (blockers.length) {
    return { ok: false, indeterminate: true, session: first, error: `Refund refused: ${blockers.join('; ')}. A GM must reconcile the payout before the buy-in is refunded.` };
  }

  const attempts = [];
  const skippedRefunded = [];
  const problems = [];
  let stopped = null;

  const initialStates = deriveRefundStates(escrow0.credits);
  for (const initial of initialStates) {
    if (stopped) break;
    // Re-read the latest authoritative evidence before EVERY entry.
    const cur = GameSessionStore.getSession(sessionId);
    if (!cur) { stopped = { error: 'The game session disappeared from the session store during the refund; processing stopped.' }; break; }
    const state = deriveRefundStates(ensureEscrow(cur).credits).find(candidate => candidate.key === initial.key);
    if (!state) continue;
    if (state.status === 'refunded') { skippedRefunded.push({ seatId: state.seatId, refundTransactionId: state.refundTransactionId }); continue; }
    if (state.status !== 'pending' && state.status !== 'failed') continue;   // indeterminate / review: never refunded automatically

    const entry = state.entry;
    const label = entry.seatLabel || entry.seatId || 'A seat';
    const actor = entry.actorId ? game.actors?.get?.(entry.actorId) : null;
    const prevAttempts = Array.isArray(state.ledger?.attempts) ? state.ledger.attempts : [];
    const attemptId = randomId('refund');
    const ledgerBase = { key: state.key, seatId: entry.seatId, seatLabel: entry.seatLabel ?? null, actorId: entry.actorId ?? null, actorName: entry.actorName ?? null,
      amount: state.amount, debitTransactionId: entry.transactionId ?? null };

    if (!actor) {
      const record = { success: false, actorId: entry.actorId ?? null, actorName: entry.actorName ?? null, seatId: entry.seatId, seatLabel: entry.seatLabel, amount: state.amount,
        debitTransactionId: entry.transactionId ?? null, attemptId, attemptedAt: now(), error: `${label} has no actor-backed wallet for refund.` };
      attempts.push(record);
      try {
        await persistRefundProgress(sessionId, state.key, { ...ledgerBase, status: 'failed', attemptId, attempts: [...prevAttempts, { attemptId, at: record.attemptedAt, outcome: 'failed', success: false, error: record.error }], lastError: record.error }, record);
      } catch (persistErr) {
        problems.push(record.error);
        stopped = { error: `Could not record the failed refund for ${label}: ${persistErr?.message ?? persistErr}. No credits were moved for this seat.` };
      }
      problems.push(record.error);
      continue;
    }

    // Write-ahead intent: if this cannot be saved, NO credit is moved for this entry and processing stops.
    try {
      await persistRefundProgress(sessionId, state.key, { ...ledgerBase, status: 'attempting', attemptId, attemptedAt: now(), attempts: prevAttempts });
    } catch (intentErr) {
      stopped = { error: `Could not record the refund intent for ${label}; no credits were moved for this seat and processing stopped: ${intentErr?.message ?? intentErr}` };
      break;
    }

    let result;
    let thrown = null;
    try {
      result = await TransactionEngine.executeCreditAdjustment({
        actor,
        amount: state.amount,
        reason,
        transactionContext: 'game-credit-refund',
        audit: {
          ...baseAudit(first, { seatId: entry.seatId, displayName: entry.seatLabel }, {
            escrowId: escrow0.credits.escrowId ?? null,
            refundOfTransactionId: entry.transactionId,
            refundReason: reason,
            refundAttemptId: attemptId,
            wagerType: 'buy-in'
          })
        }
      }, { source: 'GameCreditEscrowService.refundDebitEntries' });
    } catch (err) {
      thrown = err;
      result = { success: false, indeterminate: true, error: `The refund call threw: ${err?.message ?? err}` };
    }
    let outcome = classifyRefundRecord(result);
    if (outcome === 'review') outcome = 'indeterminate';                         // a malformed live result: the outcome is unknown
    const record = { ...(result && typeof result === 'object' ? result : {}), success: result?.success === true, actorId: actor.id, actorName: actor.name, seatId: entry.seatId, amount: state.amount,
      debitTransactionId: entry.transactionId ?? null, attemptId, attemptedAt: now(), ...(outcome === 'indeterminate' && result?.indeterminate !== true && result?.rollbackFailed !== true ? { indeterminate: true } : {}) };
    attempts.push(record);
    const ledgerEntry = { ...ledgerBase, status: outcome, attemptId,
      ...(outcome === 'refunded' ? { refundTransactionId: record.transactionId } : {}),
      attempts: [...prevAttempts, { attemptId, at: record.attemptedAt, outcome, success: record.success, transactionId: record.transactionId ?? null, error: record.error ?? null, rollbackFailed: record.rollbackFailed === true, indeterminate: record.indeterminate === true }],
      lastError: record.error ?? null };
    try {
      await persistRefundProgress(sessionId, state.key, ledgerEntry, record);
    } catch (persistErr) {
      // Credits may have moved and the result could not be saved: the intent marker stays (so a later call sees an unresolved attempt). Do NOT continue.
      stopped = {
        indeterminate: true,
        error: `The refund for ${label} ${outcome === 'refunded' ? `succeeded (transaction ${record.transactionId})` : `finished as ${outcome}${record.transactionId ? ` (transaction ${record.transactionId})` : ''}`}, but its result could not be saved (${persistErr?.message ?? persistErr}). It will not be repeated automatically; a GM must review it.`
      };
      break;
    }
    if (outcome !== 'refunded') problems.push(`${label}: ${record.error || `refund ${outcome}`}`);
    if (thrown) problems.push(`${label}: ${thrown.message}`);
  }

  const latest = GameSessionStore.getSession(sessionId) ?? first;
  if (stopped) {
    return { ok: false, indeterminate: stopped.indeterminate === true || undefined, session: latest, refunds: attempts, error: stopped.error, ...(skippedRefunded.length ? { skippedRefunded } : {}) };
  }

  // Final status reflects the ACTUAL per-entry evidence.
  const finalEscrow = ensureEscrow(latest);
  const finalStates = deriveRefundStates(finalEscrow.credits);
  const unresolved = finalStates.filter(state => state.status !== 'refunded');
  const unresolvedHard = unresolved.filter(state => state.status === 'indeterminate' || state.status === 'review');
  const allRefunded = unresolved.length === 0;
  const messages = [...problems];
  for (const state of unresolvedHard) messages.push(`${state.entry.seatLabel || state.seatId}: refund ${state.status === 'review' ? 'evidence needs review' : 'outcome is unresolved'} (${state.reason})`);
  const refundError = allRefunded ? '' : (messages.length ? [...new Set(messages)].join(' ') : 'One or more game escrow refunds are not complete.');
  const status = allRefunded ? 'refunded' : 'refund-failed';
  const updated = await GameSessionStore.upsertSession({
    ...latest,
    status,
    escrow: {
      ...finalEscrow,
      credits: {
        ...finalEscrow.credits,
        status,
        refundedAt: allRefunded ? now() : null,
        refundFailedAt: allRefunded ? finalEscrow.credits.refundFailedAt ?? null : now(),
        refundReason: reason,
        refundError: refundError || null,
        refundUnresolved: unresolved.map(state => ({ seatId: state.seatId, key: state.key, status: state.status, reason: state.reason ?? null }))
      }
    },
    log: [...(latest.log ?? []), { id: randomId('log'), at: now(), type: allRefunded ? 'credit-escrow-refunded' : 'credit-escrow-refund-failed', by: game.user?.id ?? null, reason, error: refundError || null }]
  });
  return {
    ok: allRefunded,
    session: updated,
    refunds: attempts,
    error: refundError || null,
    ...(unresolvedHard.length ? { indeterminate: true, unresolvedEntries: unresolvedHard.map(state => ({ seatId: state.seatId, status: state.status, reason: state.reason ?? null })) } : {}),
    ...(skippedRefunded.length ? { skippedRefunded } : {})
  };
}

export class GameCreditEscrowService {
  static buildCreditWagerProfile({ buyIn = 0, houseStake = 0 } = {}) {
    const normalizedBuyIn = safeAmount(buyIn);
    const normalizedHouseStake = safeAmount(houseStake);
    if (normalizedBuyIn <= 0) return { mode: 'none' };
    return {
      mode: 'credits',
      creditBuyIn: normalizedBuyIn,
      buyIn: normalizedBuyIn,
      houseStake: normalizedHouseStake,
      payoutMode: 'winner-takes-pot',
      summary: normalizedHouseStake > 0
        ? `${normalizedBuyIn} credit buy-in; house stake ${normalizedHouseStake} credits.`
        : `${normalizedBuyIn} credit buy-in; winner takes the pot.`
    };
  }

  static getCreditProfile(session = {}) {
    return getCreditProfile(session);
  }

  static isCreditWager(session = {}) {
    return getCreditProfile(session).enabled;
  }

  static describe(session = {}) {
    const profile = getCreditProfile(session);
    const escrow = session.escrow?.credits || {};
    if (!profile.enabled) return { enabled: false, label: 'No betting', pot: 0, buyIn: 0, status: 'none' };
    const pot = safeAmount(escrow.pot ?? (profile.buyIn * humanCreditSeats(session).length + profile.houseStake));
    return {
      enabled: true,
      label: `${profile.buyIn} credit buy-in`,
      status: escrow.status || 'pending',
      pot,
      buyIn: profile.buyIn,
      houseStake: profile.houseStake,
      payoutMode: profile.payoutMode,
      payoutRequested: safeAmount(escrow.payoutRequested),
      payoutApproved: safeAmount(escrow.payoutApproved),
      settlementMessage: escrow.settlementMessage || '',
      policy: escrow.policy || null,
      requiresGmSettlement: escrow.status === 'pending-gm-settlement' || Boolean(escrow.policy?.requiresGmApproval),
      entries: Array.isArray(escrow.entries) ? escrow.entries : []
    };
  }

  static validateSessionCanEscrow(session = {}) {
    const profile = getCreditProfile(session);
    if (!profile.enabled) return { ok: true, skipped: true, reason: 'No credit wager.' };
    const seats = humanCreditSeats(session);
    if (!seats.length) return { ok: false, error: 'Credit wagers require at least one actor-backed player seat.' };
    for (const seat of seats) {
      const actor = actorForSeat(seat);
      const funds = LedgerService.validateFunds(actor, profile.buyIn);
      if (!funds.ok) {
        return {
          ok: false,
          error: `${seatLabel(seat)} has insufficient credits for the ${profile.buyIn} credit buy-in.`,
          seatId: seat.seatId,
          actorId: actor?.id ?? null,
          current: funds.current,
          required: funds.required
        };
      }
    }
    return { ok: true, seats, profile };
  }

  static async prepareEscrow(session = {}, options = {}) {
    const profile = getCreditProfile(session);
    if (!profile.enabled) return { ok: true, skipped: true, session };

    const policy = GameEconomyPolicyService.validateCreditEscrow(session);
    if (!policy.allowed) {
      const escrow = ensureEscrow(session);
      const blocked = await GameSessionStore.upsertSession({
        ...session,
        status: 'pending-escrow',
        escrow: {
          ...escrow,
          credits: {
            ...escrow.credits,
            status: 'policy-blocked',
            error: policy.message,
            policy,
            failedAt: now()
          }
        },
        log: [...(session.log ?? []), { id: randomId('log'), at: now(), type: 'credit-escrow-policy-blocked', by: options.by ?? game.user?.id ?? null, policy }]
      });
      return { ok: false, error: policy.message, policy, session: blocked };
    }

    const escrow = ensureEscrow(session);
    if (['escrowed', 'settled'].includes(escrow.credits.status)) return { ok: true, skipped: true, session };
    if (escrow.credits.status === 'refunded') return { ok: false, error: 'This game wager has already been refunded.', session };

    const validation = this.validateSessionCanEscrow(session);
    if (!validation.ok) {
      const failed = await GameSessionStore.upsertSession({
        ...session,
        status: 'pending-escrow',
        escrow: {
          ...escrow,
          credits: {
            ...escrow.credits,
            status: 'failed',
            error: validation.error,
            failedAt: now()
          }
        },
        log: [...(session.log ?? []), { id: randomId('log'), at: now(), type: 'credit-escrow-failed', by: options.by ?? game.user?.id ?? null, error: validation.error }]
      });
      return { ok: false, error: validation.error, session: failed };
    }

    const escrowId = escrow.credits.escrowId || randomId('escrow');
    const entries = [];
    const transactions = [];

    for (const seat of validation.seats) {
      const actor = actorForSeat(seat);
      const result = await TransactionEngine.executeCreditAdjustment({
        actor,
        amount: -profile.buyIn,
        reason: `${session.title || gameTitle(session)} buy-in`,
        transactionContext: 'game-credit-escrow',
        audit: baseAudit(session, seat, {
          escrowId,
          wagerType: 'buy-in',
          payoutMode: profile.payoutMode
        })
      }, { source: 'GameCreditEscrowService.prepareEscrow' });

      transactions.push({ ...result, actorId: actor?.id ?? null, actorName: actor?.name ?? null, seatId: seat.seatId, amount: -profile.buyIn });
      if (!result.success) {
        const refunds = await refundDebitEntries({ ...session, escrow: { ...escrow, credits: { ...escrow.credits, escrowId } } }, entries, `Refund failed ${session.title || 'game'} escrow`);
        const refundError = summarizeFailures(refunds, 'Credit escrow failed and one or more rollback refunds failed.');
        const failedStatus = refundError ? 'refund-failed' : 'failed';
        const failedMessage = refundError || result.error || 'Credit escrow failed.';
        const failed = await GameSessionStore.upsertSession({
          ...session,
          status: 'pending-escrow',
          escrow: {
            ...escrow,
            credits: {
              ...escrow.credits,
              escrowId,
              status: failedStatus,
              error: failedMessage,
              entries,
              transactions,
              refunds,
              failedAt: now(),
              refundFailedAt: refundError ? now() : null
            }
          },
          log: [...(session.log ?? []), { id: randomId('log'), at: now(), type: refundError ? 'credit-escrow-refund-failed' : 'credit-escrow-failed', by: options.by ?? game.user?.id ?? null, error: failedMessage }]
        });
        return { ok: false, error: failedMessage, session: failed };
      }

      entries.push({
        seatId: seat.seatId,
        seatLabel: seatLabel(seat),
        actorId: actor.id,
        actorName: actor.name,
        amount: profile.buyIn,
        transactionId: result.transactionId,
        creditsBefore: result.creditsBefore,
        creditsAfter: result.creditsAfter
      });
    }

    const pot = safeAmount(entries.reduce((sum, entry) => sum + safeAmount(entry.amount), 0) + profile.houseStake);
    const updated = await GameSessionStore.upsertSession({
      ...session,
      status: session.status === 'pending-escrow' ? 'active' : session.status,
      escrow: {
        ...escrow,
        credits: {
          ...escrow.credits,
          escrowId,
          status: 'escrowed',
          buyIn: profile.buyIn,
          pot,
          houseStake: profile.houseStake,
          payoutMode: profile.payoutMode,
          entries,
          transactions,
          escrowedAt: now(),
          escrowedBy: options.by ?? game.user?.id ?? null
        }
      },
      log: [...(session.log ?? []), { id: randomId('log'), at: now(), type: 'credit-escrowed', by: options.by ?? game.user?.id ?? null, pot, buyIn: profile.buyIn }]
    });
    return { ok: true, session: updated, pot, entries };
  }

  static async settleSession(session = {}, { winnerSeatId = null, reason = '' } = {}) {
    const profile = getCreditProfile(session);
    if (!profile.enabled) return { ok: true, skipped: true, session };
    const escrow = ensureEscrow(session);
    if (escrow.credits.status === 'settled') return { ok: true, skipped: true, session };
    if (escrow.credits.status !== 'escrowed') return { ok: false, error: 'Credit escrow is not ready to settle.', session };

    const winnerSeat = playableSeats(session).find(seat => seat.seatId === winnerSeatId) ?? null;
    const winnerActor = actorForSeat(winnerSeat);
    const pot = safeAmount(escrow.credits.pot);
    const policy = GameEconomyPolicyService.evaluateCreditSettlement(session, { winnerSeatId, requestedPayout: pot });
    const approvedPayout = safeAmount(policy.approvedPayout);
    let payout = null;
    let status = 'settled';
    let message = policy.message || reason || 'Game complete.';

    if (policy.requiresGmApproval) {
      status = 'pending-gm-settlement';
      message = policy.message;
    } else if (!policy.allowed && approvedPayout <= 0) {
      status = 'settlement-blocked';
      message = policy.message || 'Credit settlement blocked by GM game economy policy.';
    } else if (winnerActor && approvedPayout > 0) {
      payout = await TransactionEngine.executeCreditAdjustment({
        actor: winnerActor,
        amount: approvedPayout,
        reason: reason || `${session.title || 'Game'} payout`,
        transactionContext: policy.payoutPolicy === 'refund-buy-in-only' ? 'game-credit-refund' : 'game-credit-payout',
        audit: baseAudit(session, winnerSeat, {
          escrowId: escrow.credits.escrowId,
          payoutType: profile.payoutMode,
          winnerSeatId,
          pot,
          approvedPayout,
          economySource: policy.source,
          economyPolicy: policy.payoutPolicy,
          policyCode: policy.code
        })
      }, { source: 'GameCreditEscrowService.settleSession' });
      if (!payout.success) {
        status = 'payout-failed';
        message = payout.error || 'Credit payout failed.';
      }
    } else {
      message = winnerSeat ? `${seatLabel(winnerSeat)} won; no actor-backed payout was required.` : 'No winner payout was required.';
    }

    const updated = await GameSessionStore.upsertSession({
      ...session,
      status: status === 'pending-gm-settlement' ? 'pending-gm-settlement' : session.status,
      escrow: {
        ...escrow,
        credits: {
          ...escrow.credits,
          status,
          settledAt: status === 'settled' ? now() : null,
          pendingSettlementAt: status === 'pending-gm-settlement' ? now() : escrow.credits.pendingSettlementAt ?? null,
          winnerSeatId,
          winnerActorId: winnerActor?.id ?? null,
          payout,
          payoutRequested: pot,
          payoutApproved: approvedPayout,
          policy,
          settlementMessage: message
        }
      },
      log: [...(session.log ?? []), { id: randomId('log'), at: now(), type: status === 'settled' ? 'credit-payout-settled' : `credit-${status}`, by: game.user?.id ?? null, winnerSeatId, pot, approvedPayout, policyCode: policy.code, error: payout?.error ?? null }]
    });
    return { ok: status === 'settled', session: updated, payout, policy, error: payout?.error ?? null };
  }


  static async settleTableCreditBalances(session = {}, { balances = {}, reason = '' } = {}) {
    const profile = getCreditProfile(session);
    if (!profile.enabled) return { ok: true, skipped: true, session };
    const escrow = ensureEscrow(session);
    if (escrow.credits.status === 'settled') return { ok: true, skipped: true, session };
    if (escrow.credits.status !== 'escrowed') return { ok: false, error: 'Credit escrow is not ready to settle.', session };

    const normalizedBalances = Object.fromEntries(Object.entries(balances || {})
      .map(([seatId, amount]) => [seatId, safeAmount(amount)])
      .filter(([_seatId, amount]) => amount > 0));
    const missingActorSeats = playableSeats(session).filter(seat => !isAutomatedSeat(seat) && normalizedBalances[seat.seatId] > 0 && !actorForSeat(seat));
    if (missingActorSeats.length) {
      const message = missingActorSeats.map(seat => `${seatLabel(seat)} has no actor-backed wallet for table-credit cashout.`).join(' ');
      const updated = await GameSessionStore.upsertSession({
        ...session,
        escrow: {
          ...escrow,
          credits: {
            ...escrow.credits,
            status: 'payout-failed',
            payoutMode: 'table-credit-balances',
            payoutBalances: normalizedBalances,
            payoutRequested: sumBalanceMap(normalizedBalances),
            payoutApproved: 0,
            settlementMessage: message
          }
        },
        log: [...(session.log ?? []), { id: randomId('log'), at: now(), type: 'credit-table-balances-payout-failed', by: game.user?.id ?? null, payoutBalances: normalizedBalances, error: message }]
      });
      return { ok: false, session: updated, error: message };
    }
    const payoutSeats = playableSeats(session).filter(seat => normalizedBalances[seat.seatId] > 0 && actorForSeat(seat));
    const policies = [];
    let requiresGmSettlement = false;
    let blocked = false;

    for (const seat of payoutSeats) {
      const requestedPayout = safeAmount(normalizedBalances[seat.seatId]);
      const policy = GameEconomyPolicyService.evaluateCreditSettlement(session, { winnerSeatId: seat.seatId, requestedPayout });
      policies.push({ seatId: seat.seatId, requestedPayout, policy });
      if (policy.requiresGmApproval) requiresGmSettlement = true;
      if (!policy.allowed && safeAmount(policy.approvedPayout) <= 0 && !policy.requiresGmApproval) blocked = true;
    }

    if (requiresGmSettlement || blocked) {
      const message = requiresGmSettlement
        ? 'Exact table-credit cashout requires GM settlement approval.'
        : 'Exact table-credit cashout was blocked by GM economy policy.';
      const status = requiresGmSettlement ? 'pending-gm-settlement' : 'settlement-blocked';
      const updated = await GameSessionStore.upsertSession({
        ...session,
        status: requiresGmSettlement ? 'pending-gm-settlement' : session.status,
        escrow: {
          ...escrow,
          credits: {
            ...escrow.credits,
            status,
            payoutMode: 'table-credit-balances',
            payoutBalances: normalizedBalances,
            payoutPolicies: policies,
            pendingSettlementAt: requiresGmSettlement ? now() : escrow.credits.pendingSettlementAt ?? null,
            settlementMessage: message
          }
        },
        log: [...(session.log ?? []), { id: randomId('log'), at: now(), type: `credit-${status}`, by: game.user?.id ?? null, payoutBalances: normalizedBalances }]
      });
      return { ok: false, session: updated, error: message, policies };
    }

    const payouts = [];
    let payoutRollbacks = [];
    let status = 'settled';
    let message = reason || 'Table credits cashed out.';

    for (const seat of payoutSeats) {
      const actor = actorForSeat(seat);
      const requestedPayout = safeAmount(normalizedBalances[seat.seatId]);
      const policyRecord = policies.find(entry => entry.seatId === seat.seatId);
      const approvedPayout = safeAmount(policyRecord?.policy?.approvedPayout ?? requestedPayout);
      if (!actor || approvedPayout <= 0) continue;
      const payout = await TransactionEngine.executeCreditAdjustment({
        actor,
        amount: approvedPayout,
        reason: reason || `${session.title || 'Game'} table-credit cashout`,
        transactionContext: policyRecord?.policy?.payoutPolicy === 'refund-buy-in-only' ? 'game-credit-refund' : 'game-credit-payout',
        audit: baseAudit(session, seat, {
          escrowId: escrow.credits.escrowId,
          payoutType: 'table-credit-balances',
          winnerSeatId: seat.seatId,
          requestedPayout,
          approvedPayout,
          economySource: policyRecord?.policy?.source,
          economyPolicy: policyRecord?.policy?.payoutPolicy,
          policyCode: policyRecord?.policy?.code
        })
      }, { source: 'GameCreditEscrowService.settleTableCreditBalances' });
      payouts.push({ ...payout, actorId: actor.id, actorName: actor.name, seatId: seat.seatId, requestedPayout, approvedPayout });
      if (!payout.success) {
        payoutRollbacks = await rollbackAppliedCreditPayouts(session, payouts, `Rollback failed table-credit cashout for ${session.title || 'game'}`, 'GameCreditEscrowService.settleTableCreditBalances.rollback');
        status = 'payout-failed';
        message = payout.error || 'One or more table-credit cashout payouts failed.';
        break;
      }
    }

    const updated = await GameSessionStore.upsertSession({
      ...session,
      status: status === 'settled' && session.gameState?.phase === 'complete' ? 'complete' : session.status,
      escrow: {
        ...escrow,
        credits: {
          ...escrow.credits,
          status,
          settledAt: status === 'settled' ? now() : null,
          payoutMode: 'table-credit-balances',
          payoutBalances: normalizedBalances,
          payouts,
          payoutRollbacks,
          payoutPolicies: policies,
          payoutRequested: Object.values(normalizedBalances).reduce((sum, amount) => sum + safeAmount(amount), 0),
          payoutApproved: status === 'settled' ? payouts.reduce((sum, payout) => sum + safeAmount(payout.approvedPayout), 0) : 0,
          settlementMessage: message
        }
      },
      log: [...(session.log ?? []), { id: randomId('log'), at: now(), type: status === 'settled' ? 'credit-table-balances-settled' : 'credit-table-balances-payout-failed', by: game.user?.id ?? null, payoutBalances: normalizedBalances, error: status === 'payout-failed' ? message : null }]
    });
    return { ok: status === 'settled', session: updated, payouts, policies, error: status === 'payout-failed' ? message : null };
  }


  static async approvePendingSettlement(session = {}, { payoutAmount = 0, decision = 'custom', reason = '', by = null } = {}) {
    const profile = getCreditProfile(session);
    if (!profile.enabled) return { ok: false, error: 'This session does not have a credit wager.', session };
    const escrow = ensureEscrow(session);
    if (escrow.credits.status !== 'pending-gm-settlement') return { ok: false, error: 'This session is not waiting for GM settlement approval.', session };

    if (escrow.credits.payoutMode === 'table-credit-balances') {
      return approveTableCreditBalanceSettlement(session, escrow, { payoutAmount, decision, reason, by });
    }

    const winnerSeatId = escrow.credits.winnerSeatId;
    const winnerSeat = playableSeats(session).find(seat => seat.seatId === winnerSeatId) ?? null;
    const winnerActor = actorForSeat(winnerSeat);
    const requested = safeAmount(escrow.credits.payoutRequested ?? escrow.credits.pot);
    const approvedPayout = safeAmount(payoutAmount);
    const gmReason = String(reason || '').trim() || `GM ${decision} settlement for ${session.title || 'game'}`;
    let payout = null;
    let status = 'settled';
    let message = approvedPayout > 0
      ? `GM approved ${approvedPayout.toLocaleString()} credits for a requested ${requested.toLocaleString()} credit payout.`
      : 'GM voided the campaign payout; no credits were awarded.';

    if (approvedPayout > 0 && !winnerActor) {
      return { ok: false, error: 'Winner has no actor-backed wallet for payout.', session };
    }

    if (approvedPayout > 0) {
      payout = await TransactionEngine.executeCreditAdjustment({
        actor: winnerActor,
        amount: approvedPayout,
        reason: gmReason,
        transactionContext: 'game-credit-payout',
        audit: baseAudit(session, winnerSeat, {
          escrowId: escrow.credits.escrowId,
          payoutType: profile.payoutMode,
          winnerSeatId,
          requestedPayout: requested,
          approvedPayout,
          economySource: escrow.credits.policy?.source ?? 'gm-approved',
          economyPolicy: 'gm-approved',
          policyCode: 'gmSettlementApproved',
          gmDecision: decision,
          gmReason
        })
      }, { source: 'GameCreditEscrowService.approvePendingSettlement' });
      if (!payout.success) {
        status = 'payout-failed';
        message = payout.error || 'GM-approved credit payout failed.';
      }
    }

    const updated = await GameSessionStore.upsertSession({
      ...session,
      status: session.gameState?.phase === 'complete' ? 'complete' : session.status,
      escrow: {
        ...escrow,
        credits: {
          ...escrow.credits,
          status,
          settledAt: status === 'settled' ? now() : null,
          gmSettledAt: now(),
          gmSettledBy: by ?? game.user?.id ?? null,
          gmDecision: decision,
          gmReason,
          payout,
          payoutApproved: approvedPayout,
          settlementMessage: message,
          policy: {
            ...(escrow.credits.policy || {}),
            allowed: true,
            requiresGmApproval: false,
            approvedPayout,
            payoutPolicy: 'gm-approved',
            gmDecision: decision
          }
        }
      },
      log: [...(session.log ?? []), { id: randomId('log'), at: now(), type: status === 'settled' ? 'credit-payout-gm-settled' : 'credit-payout-failed', by: by ?? game.user?.id ?? null, winnerSeatId, requestedPayout: requested, approvedPayout, decision, error: payout?.error ?? null }]
    });
    return { ok: status === 'settled', session: updated, payout, error: payout?.error ?? null };
  }

  /**
   * Refund every escrowed buy-in exactly once (TI4-C0/G22).
   *
   * The CURRENT session is read from GameSessionStore by id (the caller's copy is never the authority for status or prior refunds). Each entry is
   * refunded only if its own refund state is `pending` or `failed` (see deriveRefundStates); an intent marker is persisted BEFORE the credit
   * adjustment and the outcome AFTER it, one entry at a time, so a failed/interrupted attempt is never silently repeated. If the outcome cannot be
   * persisted, processing STOPS and the entry stays `indeterminate` (the intent marker remains). Returns `{ ok, session, refunds, error }`
   * (+ `indeterminate`, `unresolvedEntries`, `skippedRefunded` when relevant); `refunds` lists THIS call's attempts, the cumulative history is
   * `session.escrow.credits.refunds`. L1 only: single client, no exactly-once or durable-receipt guarantee.
   */
  static async refundSession(session = {}, reason = 'Game cancelled') {
    const sessionId = String(session?.id || '');
    // The CURRENT stored session decides whether this is a credit wager at all; the caller's copy is consulted only when nothing is stored.
    const current0 = sessionId ? GameSessionStore.getSession(sessionId) : null;
    if (!current0) {
      if (!getCreditProfile(session).enabled) return { ok: true, skipped: true, session };   // a genuine non-credit game: nothing to refund
      return { ok: false, error: 'This game session is not in the session store; the refund was refused.', session };
    }
    if (!getCreditProfile(current0).enabled) return { ok: true, skipped: true, session: current0 };
    if (refundsInFlight.has(sessionId)) return { ok: false, error: 'A refund for this game session is already in progress.', session: current0 };
    refundsInFlight.add(sessionId);
    try {
      return await refundSessionAuthoritative(sessionId, reason);
    } finally {
      refundsInFlight.delete(sessionId);
    }
  }
}
