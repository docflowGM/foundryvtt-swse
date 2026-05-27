import { SabaccEngine } from './sabacc-engine.js';
import { evaluateSabaccHand } from './sabacc-rules.js';
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
    sign: card.sign || (Number(card.value || 0) > 0 ? 'positive' : (Number(card.value || 0) < 0 ? 'negative' : 'neutral'))
  } : { id: card.id, label: 'Hidden Card', shortLabel: '??', valueLabel: 'Hidden', suitLabel: 'Hidden', image: '', hasImage: false, isSpecial: false, isSylop: false, sign: 'hidden' };
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
  return {
    seatId: seat.seatId,
    displayName: seat.displayName || 'Seat',
    isViewer,
    isCurrent: state.activeSeatId === seat.seatId,
    isAi,
    aiDifficultyLabel: isAi ? SabaccAi.labelForDifficulty(aiProfile.difficulty) : '',
    aiProfileLabel,
    aiLastDecision,
    profession: seat.profession || '',
    tableFact: seat.tableFact || '',
    statusLabel: player.folded ? 'Folded' : (player.called ? 'Called' : (player.bombedOut ? 'Bombed Out' : 'In Hand')),
    totalLabel: reveal ? evaluation.label : hiddenTotalLabel,
    bombedOut: Boolean(evaluation.bombedOut),
    specialWinner: reveal && Boolean(evaluation.specialWinner),
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
    return {
      id: session.id,
      title: session.title,
      phase: state.phase,
      statusLabel: state.statusLabel || state.phase,
      message: state.message || '',
      round: Number(state.round || 0),
      target: state.target ?? 0,
      cardRound: Number(state.cardRound || 0),
      market: (Array.isArray(state.market) ? state.market : []).map(marketSlotVm),
      hasMarket: Boolean((Array.isArray(state.market) ? state.market : []).length),
      shiftRoll: state.shiftRoll || null,
      shiftRollLabel: state.shiftRoll?.label || '',
      shiftMatched: Boolean(state.shiftRoll?.matched),
      showdown,
      hasShowdown: Boolean(showdown),
      gmAudit,
      hasGmAudit: gmAudit.length > 0,
      activeSeatLabel: state.activeSeatId ? (playableSeats(session).find(seat => seat.seatId === state.activeSeatId)?.displayName || 'Unknown Seat') : '',
      currentSeatId: viewerSeatId,
      showReady: state.phase === 'ready',
      showDrawing: state.phase === 'drawing',
      showBetting: state.phase === 'betting',
      showHandComplete: state.phase === 'hand-complete',
      showComplete: state.phase === 'complete',
      canStartHand: Boolean(currentSeat && ['ready', 'hand-complete'].includes(state.phase)),
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
      seats: playableSeats(session).map(seat => seatVm(session, state, seat, viewerSeatId)),
      viewerSeat: {
        canAct,
        canBettingAct: Boolean(canAct && state.phase === 'betting'),
        canCardAct: Boolean(canAct && state.phase === 'drawing'),
        canCall: Boolean(canAct && state.phase === 'drawing' && !evaluateSabaccHand(viewerPlayer?.hand || []).bombedOut && (viewerPlayer?.hand || []).length >= 2),
        canDiscard: Boolean(canAct && state.phase === 'drawing' && (viewerPlayer?.hand || []).length > 2),
        hand: (viewerPlayer?.hand || []).map(card => ({
          ...cardVm(card, true),
          sessionId: session.id,
          seatId: viewerSeatId,
          canShift: Boolean(canAct && state.phase === 'drawing'),
          canDiscard: Boolean(canAct && state.phase === 'drawing' && (viewerPlayer?.hand || []).length > 2),
          market: (Array.isArray(state.market) ? state.market : []).map(marketSlotVm)
        }))
      },
      handHistory: (state.handHistory || []).map(hand => ({ ...hand, timeLabel: formatTime(hand.at) })),
      hasHandHistory: Boolean((state.handHistory || []).length),
      eventLog: publicEvents.map(event => ({ ...event, timeLabel: formatTime(event.at) })),
      hasEventLog: Boolean(publicEvents.length)
    };
  }
}
