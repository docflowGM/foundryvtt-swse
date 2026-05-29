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
    refunds.push({ ...refund, actorId: actor.id, actorName: actor.name, seatId: entry.seatId, amount });
  }
  return refunds;
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
    rollbacks.push({ ...rollback, actorId: actor.id, actorName: actor.name, seatId: payout.seatId, amount: -amount });
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

  static async refundSession(session = {}, reason = 'Game cancelled') {
    const profile = getCreditProfile(session);
    if (!profile.enabled) return { ok: true, skipped: true, session };
    const escrow = ensureEscrow(session);
    if (escrow.credits.status === 'refunded') return { ok: true, skipped: true, session };
    if (!['escrowed', 'payout-failed', 'refund-failed'].includes(escrow.credits.status)) return { ok: false, error: 'Credit escrow is not refundable in its current state.', session };
    const refunds = await refundDebitEntries(session, escrow.credits.entries || [], reason);
    const refundError = summarizeFailures(refunds, 'One or more game escrow refunds failed.');
    const status = refundError ? 'refund-failed' : 'refunded';
    const updated = await GameSessionStore.upsertSession({
      ...session,
      status,
      escrow: {
        ...escrow,
        credits: {
          ...escrow.credits,
          status,
          refunds,
          refundedAt: refundError ? null : now(),
          refundFailedAt: refundError ? now() : escrow.credits.refundFailedAt ?? null,
          refundReason: reason,
          refundError: refundError || null
        }
      },
      log: [...(session.log ?? []), { id: randomId('log'), at: now(), type: refundError ? 'credit-escrow-refund-failed' : 'credit-escrow-refunded', by: game.user?.id ?? null, reason, error: refundError || null }]
    });
    return { ok: !refundError, session: updated, refunds, error: refundError || null };
  }
}
