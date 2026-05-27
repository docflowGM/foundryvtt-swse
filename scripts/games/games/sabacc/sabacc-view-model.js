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
    isSpecial: card.type === 'special'
  } : { id: card.id, label: 'Hidden Card', shortLabel: '??', valueLabel: 'Hidden', suitLabel: 'Hidden', isSpecial: false };
}

function seatVm(session, state, seat, viewerSeatId) {
  const player = state.players?.[seat.seatId] || {};
  const isViewer = seat.seatId === viewerSeatId;
  const isAi = seat.type === 'ai' || seat.type === 'npc' || seat.aiProfile;
  const aiProfile = buildSabaccAiProfile(seat.aiProfile || seat.aiDifficulty || 'medium');
  const reveal = isViewer || state.phase === 'hand-complete' || state.phase === 'complete' || isAi;
  const evaluation = player.evaluation || evaluateSabaccHand(player.hand || []);
  return {
    seatId: seat.seatId,
    displayName: seat.displayName || 'Seat',
    isViewer,
    isCurrent: state.activeSeatId === seat.seatId,
    isAi,
    aiDifficultyLabel: isAi ? SabaccAi.labelForDifficulty(aiProfile.difficulty) : '',
    profession: seat.profession || '',
    tableFact: seat.tableFact || '',
    statusLabel: player.folded ? 'Folded' : (player.called ? 'Called' : (player.bombedOut ? 'Bombed Out' : 'In Hand')),
    totalLabel: evaluation.label,
    bombedOut: Boolean(evaluation.bombedOut),
    specialWinner: Boolean(evaluation.specialWinner),
    cards: (player.hand || []).map(card => cardVm(card, reveal)),
    hasCards: Boolean((player.hand || []).length),
    handCount: (player.hand || []).length,
    lastAction: player.lastAction || 'Waiting.',
    wins: Number(player.wins || 0)
  };
}

export class SabaccViewModel {
  static build({ session, actor, participantId } = {}) {
    const state = SabaccEngine.getState(session);
    const currentSeat = SabaccEngine.findSeatForActor(session, actor, participantId);
    const viewerSeatId = currentSeat?.seatId || null;
    const viewerPlayer = viewerSeatId ? state.players?.[viewerSeatId] : null;
    const canAct = Boolean(currentSeat && state.phase === 'drawing' && state.activeSeatId === currentSeat.seatId && viewerPlayer && !viewerPlayer.called && !viewerPlayer.folded && !viewerPlayer.bombedOut);
    return {
      id: session.id,
      title: session.title,
      phase: state.phase,
      statusLabel: state.statusLabel || state.phase,
      message: state.message || '',
      round: Number(state.round || 0),
      target: state.target || 23,
      activeSeatLabel: state.activeSeatId ? (playableSeats(session).find(seat => seat.seatId === state.activeSeatId)?.displayName || 'Unknown Seat') : '',
      currentSeatId: viewerSeatId,
      showReady: state.phase === 'ready',
      showDrawing: state.phase === 'drawing',
      showHandComplete: state.phase === 'hand-complete',
      showComplete: state.phase === 'complete',
      canStartHand: Boolean(currentSeat && ['ready', 'hand-complete'].includes(state.phase)),
      canCancel: Boolean(currentSeat && !['complete', 'cancelled'].includes(state.phase)),
      handPot: Number(state.handPot || 0),
      sabaccPot: Number(state.sabaccPot || 0),
      ante: Number(state.ante || 0),
      sabaccAnte: Number(state.sabaccAnte || 0),
      winnerLabel: state.winnerSeatId ? (playableSeats(session).find(seat => seat.seatId === state.winnerSeatId)?.displayName || 'Unknown Seat') : '',
      seats: playableSeats(session).map(seat => seatVm(session, state, seat, viewerSeatId)),
      viewerSeat: {
        canAct,
        hand: (viewerPlayer?.hand || []).map(card => ({ ...cardVm(card, true), sessionId: session.id, seatId: viewerSeatId }))
      },
      handHistory: (state.handHistory || []).map(hand => ({ ...hand, timeLabel: formatTime(hand.at) })),
      hasHandHistory: Boolean((state.handHistory || []).length),
      eventLog: (state.eventLog || []).map(event => ({ ...event, timeLabel: formatTime(event.at) })),
      hasEventLog: Boolean((state.eventLog || []).length)
    };
  }
}
