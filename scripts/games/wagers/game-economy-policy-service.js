/**
 * GameEconomyPolicyService
 *
 * GM-configurable guardrails for Holopad Games economy settlement. Games decide
 * who won; this service decides whether automated campaign wealth may be paid.
 */

import { getGameSettingsSnapshot } from '../game-settings.js';
import { normalizeCredits } from '/systems/foundryvtt-swse/scripts/utils/credit-normalization.js';

function safeAmount(value) {
  const amount = normalizeCredits(Number(value || 0));
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function playableSeats(session = {}) {
  return (Array.isArray(session.seats) ? session.seats : [])
    .filter(seat => seat && seat.status !== 'declined' && seat.status !== 'cancelled');
}

function isAutomatedSeat(seat = {}) {
  return seat?.type === 'ai' || seat?.type === 'npc' || Boolean(seat?.aiProfile);
}

function actorForSeat(seat = {}) {
  return seat?.actorId ? game.actors?.get?.(seat.actorId) ?? null : null;
}

function seatLabel(seat = {}) {
  return seat?.displayName || seat?.actorId || seat?.seatId || 'Unknown Seat';
}

function winnerSeat(session = {}, winnerSeatId = null) {
  return playableSeats(session).find(seat => seat.seatId === winnerSeatId) ?? null;
}

function humanEscrowEntries(session = {}) {
  return Array.isArray(session.escrow?.credits?.entries) ? session.escrow.credits.entries : [];
}

function humanEscrowTotal(session = {}) {
  return humanEscrowEntries(session).reduce((sum, entry) => sum + safeAmount(entry.amount), 0);
}

function contributedByWinner(session = {}, winnerSeatId = null) {
  return humanEscrowEntries(session)
    .filter(entry => entry.seatId === winnerSeatId)
    .reduce((sum, entry) => sum + safeAmount(entry.amount), 0);
}

function hasAutomatedOpponent(session = {}) {
  return playableSeats(session).some(isAutomatedSeat);
}

function isClosedPlayerPool(session = {}) {
  const seats = playableSeats(session);
  if (!seats.length) return false;
  return !seats.some(isAutomatedSeat) && safeAmount(session.escrow?.credits?.houseStake ?? session.wagerProfile?.houseStake) <= 0;
}

function isPlayerInitiatedWager(session = {}) {
  const createdBy = String(session.metadata?.createdBy || '');
  if (createdBy.startsWith('player:')) return true;
  const hostUserId = session.hostUserId || null;
  const hostSeat = playableSeats(session).find(seat => seat.seatId === 'seat_host' || (hostUserId && seat.userId === hostUserId));
  return hostSeat?.type === 'player';
}

function policyMessage(code, fallback) {
  const messages = {
    republicSenate: 'Republic Senate Rules were active, so no economy settlement is needed.',
    pvpClosedLoop: 'Player-vs-player settlement is a closed player pool and can pay from escrow automatically.',
    aiPayoutDisabled: 'GM settings disable automated AI/house campaign payouts. The winner can be refunded only.',
    aiPayoutAutomatic: 'GM settings allow this AI/house payout automatically.',
    aiPayoutCapped: 'AI/house payout was capped by GM settings.',
    aiPayoutOverCap: 'This AI/house payout exceeds the GM automated payout cap.',
    gmApproval: 'This AI/house payout requires GM approval before credits are awarded.',
    gmAdjust: 'This AI/house payout requires GM adjustment before credits are awarded.',
    noWinnerActor: 'The winner does not have an actor-backed wallet for payout.'
  };
  return messages[code] || fallback || 'Game economy policy evaluated.';
}

export class GameEconomyPolicyService {
  static classifySession(session = {}) {
    if (session.rulesMode !== 'wagered') return 'none';
    if (isClosedPlayerPool(session)) return 'player-pool';
    if (hasAutomatedOpponent(session)) return 'ai-house';
    if (safeAmount(session.escrow?.credits?.houseStake ?? session.wagerProfile?.houseStake) > 0) return 'gm-house';
    return 'player-pool';
  }

  static validateCreditEscrow(session = {}) {
    const settings = getGameSettingsSnapshot();
    if (session.rulesMode !== 'wagered') return { allowed: true, skipped: true, code: 'republicSenate', message: policyMessage('republicSenate') };
    if (!settings.allowWagers || !settings.allowCreditWagers) {
      return { allowed: false, severity: 'blocked', code: 'creditWagersDisabled', message: 'GM settings currently disable credit wagers.' };
    }
    const buyIn = safeAmount(session.wagerProfile?.buyIn ?? session.wagerProfile?.creditBuyIn);
    const max = safeAmount(settings.maxCreditWager);
    const playerInitiated = isPlayerInitiatedWager(session) || !game.user?.isGM;
    if (playerInitiated && max <= 0) {
      return { allowed: false, severity: 'blocked', code: 'playerCreditWagersDisabled', message: 'GM settings currently set maximum player credit wagers to 0, so player-created credit wagers are disabled.', caps: { maxCreditWager: 0 } };
    }
    if (playerInitiated && max > 0 && buyIn > max) {
      return { allowed: false, severity: 'blocked', code: 'buyInAboveCap', message: `This buy-in exceeds the GM player wager cap of ${max} credits.`, caps: { maxCreditWager: max } };
    }
    return { allowed: true, code: 'escrowAllowed', message: 'Credit escrow is allowed by GM settings.' };
  }

  static evaluateCreditSettlement(session = {}, { winnerSeatId = null, requestedPayout = 0 } = {}) {
    const settings = getGameSettingsSnapshot();
    const source = this.classifySession(session);
    const winner = winnerSeat(session, winnerSeatId);
    const winnerActor = actorForSeat(winner);
    const requested = safeAmount(requestedPayout);
    const winnerContribution = contributedByWinner(session, winnerSeatId);
    const humanPool = humanEscrowTotal(session);
    const houseStake = safeAmount(session.escrow?.credits?.houseStake ?? session.wagerProfile?.houseStake);
    const maxMatch = safeAmount(settings.aiMaxAutomatedPayoutPerMatch);
    const maxNet = safeAmount(settings.aiMaxNetWinningsPerActorPerSession);
    const payoutAuthority = String(settings.aiPayoutAuthority || 'gmAdjust');
    const overCapBehavior = String(settings.aiOverCapBehavior || 'gmAdjust');

    if (session.rulesMode !== 'wagered') {
      return {
        allowed: true,
        source,
        payoutPolicy: 'none',
        originalPayout: 0,
        approvedPayout: 0,
        requiresGmApproval: false,
        code: 'republicSenate',
        message: policyMessage('republicSenate')
      };
    }

    if (!winnerActor && requested > 0) {
      return {
        allowed: false,
        source,
        payoutPolicy: 'none',
        originalPayout: requested,
        approvedPayout: 0,
        requiresGmApproval: false,
        code: 'noWinnerActor',
        message: policyMessage('noWinnerActor')
      };
    }

    if (source === 'player-pool') {
      return {
        allowed: true,
        source,
        payoutPolicy: 'automatic',
        originalPayout: requested,
        approvedPayout: requested,
        requiresGmApproval: false,
        code: 'pvpClosedLoop',
        message: policyMessage('pvpClosedLoop'),
        caps: { humanPool }
      };
    }

    if (!settings.allowAiCampaignPayouts || payoutAuthority === 'none') {
      const approved = Math.min(winnerContribution, requested);
      return {
        allowed: approved > 0,
        source,
        payoutPolicy: 'refund-buy-in-only',
        originalPayout: requested,
        approvedPayout: approved,
        recommendedPayout: approved,
        refundBuyIn: true,
        requiresGmApproval: false,
        code: 'aiPayoutDisabled',
        message: policyMessage('aiPayoutDisabled'),
        caps: { winnerContribution, houseStake }
      };
    }

    const effectiveCap = Math.max(0, Math.min(
      maxMatch > 0 ? maxMatch : requested,
      maxNet > 0 ? winnerContribution + maxNet : requested
    ));
    const overCap = effectiveCap > 0 && requested > effectiveCap;

    if (payoutAuthority === 'automatic' && !overCap) {
      return {
        allowed: true,
        source,
        payoutPolicy: 'automatic',
        originalPayout: requested,
        approvedPayout: requested,
        requiresGmApproval: false,
        code: 'aiPayoutAutomatic',
        message: policyMessage('aiPayoutAutomatic'),
        caps: { maxMatch, maxNet, houseStake }
      };
    }

    if (payoutAuthority === 'capped' || (overCap && overCapBehavior === 'cap')) {
      const approved = overCap ? effectiveCap : requested;
      return {
        allowed: approved > 0,
        source,
        payoutPolicy: overCap ? 'capped' : 'automatic',
        originalPayout: requested,
        approvedPayout: approved,
        recommendedPayout: approved,
        requiresGmApproval: false,
        code: overCap ? 'aiPayoutCapped' : 'aiPayoutAutomatic',
        message: overCap ? policyMessage('aiPayoutCapped') : policyMessage('aiPayoutAutomatic'),
        caps: { maxMatch, maxNet, effectiveCap, houseStake }
      };
    }

    if (overCap && overCapBehavior === 'refund') {
      const approved = Math.min(winnerContribution, requested);
      return {
        allowed: approved > 0,
        source,
        payoutPolicy: 'refund-buy-in-only',
        originalPayout: requested,
        approvedPayout: approved,
        recommendedPayout: approved,
        refundBuyIn: true,
        requiresGmApproval: false,
        code: 'aiPayoutOverCap',
        message: 'This AI/house payout exceeds the GM cap; only the winner buy-in is returned.',
        caps: { maxMatch, maxNet, effectiveCap, winnerContribution, houseStake }
      };
    }

    if (overCap && overCapBehavior === 'block') {
      return {
        allowed: false,
        source,
        payoutPolicy: 'blocked',
        originalPayout: requested,
        approvedPayout: 0,
        recommendedPayout: 0,
        requiresGmApproval: false,
        code: 'aiPayoutOverCap',
        message: 'This AI/house payout exceeds the GM cap and was blocked by GM settings.',
        caps: { maxMatch, maxNet, effectiveCap, houseStake }
      };
    }

    const approvalMode = payoutAuthority === 'gmApproval' || overCapBehavior === 'gmApproval' ? 'gm-approval' : 'gm-adjust';
    return {
      allowed: false,
      source,
      payoutPolicy: approvalMode,
      originalPayout: requested,
      approvedPayout: 0,
      recommendedPayout: effectiveCap || Math.min(winnerContribution, requested),
      minimumPayout: 0,
      refundBuyIn: true,
      requiresGmApproval: true,
      code: approvalMode === 'gm-approval' ? 'gmApproval' : 'gmAdjust',
      message: policyMessage(approvalMode === 'gm-approval' ? 'gmApproval' : 'gmAdjust'),
      caps: { maxMatch, maxNet, effectiveCap, winnerContribution, humanPool, houseStake }
    };
  }
}
