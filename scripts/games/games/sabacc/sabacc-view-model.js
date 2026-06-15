import { SabaccEngine } from './sabacc-engine.js';
import { SABACC_HAND_HIERARCHY_HELP, evaluateSabaccHand } from './sabacc-rules.js';
import { SabaccAi, buildSabaccAiProfile } from './sabacc-ai.js';

function formatTime(value) {
  if (!value) return '';
  try { return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (_err) { return ''; }
}

function playableSeats(session = {}) {
  return (Array.isArray(session.seats) ? session.seats : []).filter(seat => !seat.spectator && !['declined', 'cancelled'].includes(seat.status));
}

function cardVm(card = {}, reveal = true) {
  return reveal ? {
    id: card.id,
    label: card.label || 'Card',
    shortLabel: card.shortLabel || String(card.value ?? '?'),
    valueLabel: Number(card.value || 0) > 0 ? `+${card.value}` : String(card.value || 0),
    suitLabel: card.suitLabel || 'Special',
    image: card.image || '',
    hasImage: Boolean(card.image),
    isSpecial: card.type === 'special' || card.type === 'sylop',
    isSylop: card.type === 'sylop',
    sign: card.sign || (Number(card.value || 0) > 0 ? 'positive' : (Number(card.value || 0) < 0 ? 'negative' : 'neutral')),
    revealCue: reveal ? 'card-face' : 'card-back',
    get cssClass() { return sabaccCardCssClass(this); }
  } : { id: card.id, label: 'Hidden Card', shortLabel: '??', valueLabel: 'Hidden', suitLabel: 'Hidden', image: '', hasImage: false, isSpecial: false, isSylop: false, sign: 'hidden', revealCue: 'card-back', cssClass: 'sign-hidden card-back' };
}

function marketSlotVm(slot = {}) {
  const card = cardVm(slot.card || {}, true);
  return {
    id: slot.id || '',
    label: slot.label || 'Market',
    cost: Number(slot.cost || 0),
    card,
    hasCard: Boolean(slot.card),
    replaceAfterTake: Boolean(slot.replaceAfterTake)
  };
}

function titleCase(value = '') {
  const text = String(value || '').replace(/([a-z])([A-Z])/g, '$1 $2');
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}


function avatarGlyphForName(name = '') {
  const clean = String(name || '').trim();
  return clean ? clean[0].toUpperCase() : 'S';
}

const SABACC_SEAT_POSITIONS = Object.freeze({
  1: [{ l: 50, t: 24 }],
  2: [{ l: 30, t: 25 }, { l: 70, t: 25 }],
  3: [{ l: 20, t: 38 }, { l: 50, t: 22 }, { l: 80, t: 38 }],
  4: [{ l: 16, t: 45 }, { l: 34, t: 24 }, { l: 66, t: 24 }, { l: 84, t: 45 }],
  5: [{ l: 13, t: 50 }, { l: 29, t: 27 }, { l: 50, t: 20 }, { l: 71, t: 27 }, { l: 87, t: 50 }],
  6: [{ l: 12, t: 54 }, { l: 24, t: 32 }, { l: 41, t: 21 }, { l: 59, t: 21 }, { l: 76, t: 32 }, { l: 88, t: 54 }]
});

function sabaccSeatStyleFor(index, total) {
  const count = Math.max(1, Math.min(6, Number(total || 1)));
  const positions = SABACC_SEAT_POSITIONS[count] || SABACC_SEAT_POSITIONS[3];
  const pos = positions[index] || positions[positions.length - 1];
  return `left:${pos.l}%;top:${pos.t}%`;
}

function sabaccCardCssClass(card = {}) {
  const parts = [];
  const sign = String(card.sign || '').toLowerCase();
  if (sign) parts.push(`sign-${sign}`);
  if (card.isSpecial) parts.push('special');
  if (card.isSylop) parts.push('sylop');
  if (card.revealCue) parts.push(card.revealCue);
  return parts.join(' ');
}

function seatVm(session, state, seat, viewerSeatId) {
  const player = state.players?.[seat.seatId] || {};
  const isViewer = seat.seatId === viewerSeatId;
  const isAi = seat.type === 'ai' || seat.type === 'npc' || seat.aiProfile;
  const aiProfile = buildSabaccAiProfile(seat.aiProfile || seat.aiDifficulty || 'medium');
  const reveal = isViewer || state.phase === 'hand-complete' || state.phase === 'complete';
  const isShowdownReveal = Boolean(!isViewer && reveal && state.showdown?.revealStartedAt);
  const evaluation = player.evaluation || evaluateSabaccHand(player.hand || []);
  const handCount = (player.hand || []).length;
  const hiddenTotalLabel = evaluation.bombedOut ? 'Bombed Out' : `${handCount} hidden card${handCount === 1 ? '' : 's'}`;
  const aiProfileLabel = isAi ? `${SabaccAi.labelForDifficulty(aiProfile.difficulty)} · ${titleCase(aiProfile.fairness)} · ${titleCase(aiProfile.personality)}` : '';
  const aiDecision = player.lastAiDecision || null;
  const aiLastDecision = isAi && aiDecision
    ? (reveal && aiDecision.reason ? aiDecision.reason : `${SabaccAi.labelForDifficulty(aiProfile.difficulty)} model sampled ${Number(aiDecision.samples || 0)} outcomes.`)
    : '';
  const isCurrent = state.activeSeatId === seat.seatId;
  const folded = Boolean(player.folded);
  const bombedOut = Boolean(evaluation.bombedOut);
  const specialWinner = reveal && Boolean(evaluation.specialWinner);
  const avatar = seat.avatar || seat.img || seat.image || seat.actorImg || '';
  const cssClass = [
    isViewer ? 'is-viewer' : '',
    isCurrent ? 'is-current' : '',
    folded ? 'folded' : '',
    bombedOut ? 'bomb' : '',
    specialWinner ? 'special' : '',
    isShowdownReveal ? 'is-revealed' : ''
  ].filter(Boolean).join(' ');
  return {
    seatId: seat.seatId,
    displayName: seat.displayName || 'Seat',
    isViewer,
    isCurrent,
    isAi,
    avatar,
    hasAvatar: Boolean(avatar),
    avatarGlyph: avatarGlyphForName(seat.displayName || 'Seat'),
    cssClass,
    aiDifficultyLabel: isAi ? SabaccAi.labelForDifficulty(aiProfile.difficulty) : '',
    aiProfileLabel,
    aiLastDecision,
    profession: seat.profession || '',
    tableFact: seat.tableFact || '',
    statusLabel: folded ? 'Folded' : (bombedOut ? 'Bombed Out' : (player.called ? 'Called' : 'In Hand')),
    statusClass: folded ? 'fold' : (bombedOut ? 'fold' : (player.called ? 'called' : 'in')),
    totalLabel: reveal ? evaluation.label : hiddenTotalLabel,
    totalClass: bombedOut ? 'bomb' : (specialWinner ? 'special' : ''),
    bombedOut,
    specialWinner,
    cards: (player.hand || []).map(card => cardVm(card, reveal)),
    hasCards: Boolean(handCount),
    handCount,
    isShowdownReveal,
    revealLabel: isShowdownReveal ? 'Revealed at showdown' : '',
    lastAction: player.lastAction || 'Waiting.',
    wins: Number(player.wins || 0),
    tableCredits: Number(player.tableCredits || 0),
    roundContribution: Number(player.roundContribution || 0)
  };
}

export class SabaccViewModel {
  static build({ session, actor, participantId } = {}) {
    const state = SabaccEngine.getState(session);
    const currentSeat = SabaccEngine.findSeatForActor(session, actor, participantId);
    const viewerSeatId = currentSeat?.seatId || null;
    const viewerPlayer = viewerSeatId ? state.players?.[viewerSeatId] : null;
    const canAct = Boolean(currentSeat && ['betting', 'drawing'].includes(state.phase) && state.activeSeatId === currentSeat.seatId && viewerPlayer && !viewerPlayer.called && !viewerPlayer.folded && !viewerPlayer.bombedOut);
    const rawEvents = Array.isArray(state.eventLog) ? state.eventLog : [];
    const publicEvents = rawEvents.filter(event => !event.gmOnly || game?.user?.isGM);
    const gmAudit = game?.user?.isGM ? rawEvents.filter(event => event.gmOnly || event.type === 'ai-fairness-audit').map(event => ({ ...event, timeLabel: formatTime(event.at) })) : [];
    const showdown = state.showdown ? {
      ...state.showdown,
      timeLabel: formatTime(state.showdown.at),
      winnerLabel: state.showdown.winnerSeatId ? (playableSeats(session).find(seat => seat.seatId === state.showdown.winnerSeatId)?.displayName || 'Unknown Seat') : '',
      tiedLabels: (state.showdown.tiedSeatIds || []).map(id => playableSeats(session).find(seat => seat.seatId === id)?.displayName || id).join(', ')
    } : null;
    const seats = playableSeats(session).map(seat => seatVm(session, state, seat, viewerSeatId));
    const tableSeats = seats.filter(seat => !seat.isViewer).map((seat, index, arr) => ({
      ...seat,
      seatNumber: index + 1,
      seatStyle: sabaccSeatStyleFor(index, arr.length)
    }));
    const viewerSeatVm = seats.find(seat => seat.isViewer) || null;
    return {
      id: session.id,
      title: session.title,
      phase: state.phase,
      phaseClass: `phase-${String(state.phase || 'ready').replace(/[^a-z0-9_-]/gi, '-').toLowerCase()}`,
      rulesVariant: state.rulesVariant || 'corellian-spike-holopad-wagered',
      rulesVariantLabel: state.rulesVariantLabel || 'Corellian Spike — Holopad Wagered Variant',
      marketRuleLabel: state.marketRuleLabel || 'Holopad Casino Market — House Rule',
      jackpotRuleLabel: state.jackpotRuleLabel || "Sabacc pot pays only on Idiot's Array or Pure Sabacc.",
      phasePlan: state.phasePlan || 'Three action rounds per hand: card action → betting → spike dice.',
      statusLabel: state.statusLabel || state.phase,
      message: state.message || '',
      round: Number(state.round || 0),
      target: state.target ?? 0,
      cardRound: Number(state.cardRound || 0),
      handLimit: Number(state.handLimit || 0),
      handLimitReached: Boolean(state.handLimitReached),
      handLimitLabel: Number(state.handLimit || 0) > 0 ? `Hand limit: ${Number(state.handLimit || 0)}` : 'Open-ended table',
      handProgressLabel: Number(state.handLimit || 0) > 0 ? `Hand ${Number(state.round || 0)} / ${Number(state.handLimit || 0)}` : `Hand ${Number(state.round || 0)}`,
      marketEnabled: Boolean(state.marketEnabled),
      market: (state.marketEnabled && Array.isArray(state.market) ? state.market : []).map(marketSlotVm),
      hasMarket: Boolean(state.marketEnabled && (Array.isArray(state.market) ? state.market : []).length),
      shiftRoll: state.shiftRoll || null,
      shiftRollLabel: state.shiftRoll?.label || '',
      shiftDice: state.shiftRoll ? { dice: [{ value: state.shiftRoll.first }, { value: state.shiftRoll.second }], label: state.shiftRoll.label, matched: Boolean(state.shiftRoll.matched) } : null,
      hasShiftDice: Boolean(state.shiftRoll),
      lastSpikeDicePhase: state.lastSpikeDicePhase || null,
      shiftMatched: Boolean(state.shiftRoll?.matched),
      showdown,
      hasShowdown: Boolean(showdown),
      handHierarchyHelp: SABACC_HAND_HIERARCHY_HELP,
      hasHandHierarchyHelp: SABACC_HAND_HIERARCHY_HELP.length > 0,
      gmAudit,
      hasGmAudit: gmAudit.length > 0,
      activeSeatLabel: state.activeSeatId ? (playableSeats(session).find(seat => seat.seatId === state.activeSeatId)?.displayName || 'Unknown Seat') : '',
      currentSeatId: viewerSeatId,
      showReady: state.phase === 'ready',
      showDrawing: state.phase === 'drawing',
      showBetting: state.phase === 'betting',
      showSpikeDice: state.phase === 'spike-dice',
      showHandComplete: state.phase === 'hand-complete',
      showComplete: state.phase === 'complete',
      canStartHand: Boolean(currentSeat && ['ready', 'hand-complete'].includes(state.phase) && !state.handLimitReached),
      canCancel: Boolean(currentSeat && !['complete', 'cancelled'].includes(state.phase)),
      canCashOut: Boolean(currentSeat && ['ready', 'hand-complete'].includes(state.phase)),
      betting: {
        currentBet: Number(state.betting?.currentBet || 0),
        minBet: Number(state.betting?.minBet || state.ante || 1),
        minRaise: Number(state.betting?.minRaise || state.ante || 1),
        toCall: viewerSeatId ? Math.max(0, Number(state.betting?.currentBet || 0) - Number(state.betting?.contributions?.[viewerSeatId] ?? viewerPlayer?.roundContribution ?? 0)) : 0,
        canCheck: Boolean(canAct && state.phase === 'betting' && Math.max(0, Number(state.betting?.currentBet || 0) - Number(state.betting?.contributions?.[viewerSeatId] ?? viewerPlayer?.roundContribution ?? 0)) <= 0),
        canBet: Boolean(canAct && state.phase === 'betting' && Number(state.betting?.currentBet || 0) <= 0 && Number(viewerPlayer?.tableCredits || 0) >= Number(state.betting?.minBet || state.ante || 1)),
        canCall: Boolean(canAct && state.phase === 'betting' && Math.max(0, Number(state.betting?.currentBet || 0) - Number(state.betting?.contributions?.[viewerSeatId] ?? viewerPlayer?.roundContribution ?? 0)) > 0 && Number(viewerPlayer?.tableCredits || 0) >= Math.max(0, Number(state.betting?.currentBet || 0) - Number(state.betting?.contributions?.[viewerSeatId] ?? viewerPlayer?.roundContribution ?? 0))),
        canRaise: Boolean(canAct && state.phase === 'betting' && Number(state.betting?.currentBet || 0) > 0 && Number(viewerPlayer?.tableCredits || 0) >= Math.max(0, Number(state.betting?.currentBet || 0) - Number(state.betting?.contributions?.[viewerSeatId] ?? viewerPlayer?.roundContribution ?? 0)) + Number(state.betting?.minRaise || state.ante || 1)),
        maxBet: Math.max(0, Number(viewerPlayer?.tableCredits || 0)),
        suggestedBet: Math.max(Number(state.betting?.minBet || state.ante || 1), Math.min(Number(viewerPlayer?.tableCredits || 0), Number(state.betting?.minBet || state.ante || 1) * 2)),
        suggestedRaise: Math.max(Number(state.betting?.minRaise || state.ante || 1), Math.min(Number(viewerPlayer?.tableCredits || 0), Number(state.betting?.minRaise || state.ante || 1) * 2))
      },
      viewerTableCredits: Number(viewerPlayer?.tableCredits || 0),
      handPot: Number(state.handPot || 0),
      sabaccPot: Number(state.sabaccPot || 0),
      ante: Number(state.ante || 0),
      sabaccAnte: Number(state.sabaccAnte || 0),
      winnerLabel: state.winnerSeatId ? (playableSeats(session).find(seat => seat.seatId === state.winnerSeatId)?.displayName || 'Unknown Seat') : '',
      seats,
      tableSeats,
      hasTableSeats: tableSeats.length > 0,
      viewerSeat: {
        ...(viewerSeatVm || {}),
        canAct,
        canBettingAct: Boolean(canAct && state.phase === 'betting'),
        canCardAct: Boolean(canAct && state.phase === 'drawing'),
        canCall: Boolean(canAct && state.phase === 'drawing' && !evaluateSabaccHand(viewerPlayer?.hand || []).bombedOut && (viewerPlayer?.hand || []).length >= 2),
        canStand: Boolean(canAct && state.phase === 'drawing' && !evaluateSabaccHand(viewerPlayer?.hand || []).bombedOut && (viewerPlayer?.hand || []).length >= 2),
        canDiscard: false,
        hand: (viewerPlayer?.hand || []).map(card => ({
          ...cardVm(card, true),
          sessionId: session.id,
          seatId: viewerSeatId,
          canShift: Boolean(canAct && state.phase === 'drawing'),
          canDiscard: false,
          market: (state.marketEnabled && Array.isArray(state.market) ? state.market : []).map(marketSlotVm)
        })),
        tableCredits: Number(viewerPlayer?.tableCredits || 0),
        totalLabel: viewerSeatVm?.totalLabel || '',
        statusLabel: viewerSeatVm?.statusLabel || ''
      },
      hasPrivateHand: Boolean((viewerPlayer?.hand || []).length),
      handHistory: (state.handHistory || []).map(hand => ({ ...hand, timeLabel: formatTime(hand.at) })),
      hasHandHistory: Boolean((state.handHistory || []).length),
      eventLog: publicEvents.map(event => ({ ...event, timeLabel: formatTime(event.at) })),
      hasEventLog: Boolean(publicEvents.length)
    };
  }
}
