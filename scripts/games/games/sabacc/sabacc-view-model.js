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

const SABACC_SEAT_POSITIONS = Object.freeze({
  1: [{ l: 50, t: 23 }],
  2: [{ l: 28, t: 25 }, { l: 72, t: 25 }],
  3: [{ l: 18, t: 33 }, { l: 50, t: 21 }, { l: 82, t: 33 }],
  4: [{ l: 15, t: 45 }, { l: 34, t: 24 }, { l: 66, t: 24 }, { l: 85, t: 45 }],
  5: [{ l: 13, t: 50 }, { l: 28, t: 25 }, { l: 50, t: 20 }, { l: 72, t: 25 }, { l: 87, t: 50 }],
  6: [{ l: 13, t: 53 }, { l: 24, t: 28 }, { l: 43, t: 20 }, { l: 57, t: 20 }, { l: 76, t: 28 }, { l: 87, t: 53 }]
});

function seatStyle(index, total) {
  const positions = SABACC_SEAT_POSITIONS[Math.max(1, Math.min(6, Number(total) || 1))] || SABACC_SEAT_POSITIONS[3];
  const pos = positions[index] || positions[positions.length - 1] || { l: 50, t: 28 };
  return `left:${pos.l}%;top:${pos.t}%;`;
}

function avatarGlyph(name = '') {
  const letters = String(name || 'S')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
  return letters || 'S';
}

function seatStatusClass(player = {}, evaluation = {}, { isCurrent = false, isViewer = false, reveal = false } = {}) {
  const cls = [];
  if (isCurrent) cls.push('is-current');
  if (isViewer) cls.push('is-viewer');
  if (player.folded) cls.push('folded');
  if (player.called) cls.push('called');
  if (player.bombedOut || evaluation.bombedOut) cls.push('bombed');
  if (reveal && evaluation.specialWinner) cls.push('special');
  return cls.join(' ');
}

function cardVm(card = {}, reveal = true) {
  if (!reveal) {
    return {
      id: card.id,
      label: 'Hidden Card',
      shortLabel: '??',
      valueLabel: 'Hidden',
      suitLabel: 'Hidden',
      image: '',
      hasImage: false,
      isSpecial: false,
      isSylop: false,
      sign: 'hidden',
      cssClass: 'sign-hidden is-hidden',
      revealCue: 'card-back'
    };
  }
  const sign = card.sign || (Number(card.value || 0) > 0 ? 'positive' : (Number(card.value || 0) < 0 ? 'negative' : 'neutral'));
  const isSpecial = card.type === 'special' || card.type === 'sylop';
  return {
    id: card.id,
    label: card.label || 'Card',
    shortLabel: card.shortLabel || String(card.value ?? '?'),
    valueLabel: Number(card.value || 0) > 0 ? `+${card.value}` : String(card.value || 0),
    suitLabel: card.suitLabel || 'Special',
    image: card.image || '',
    hasImage: Boolean(card.image),
    isSpecial,
    isSylop: card.type === 'sylop',
    sign,
    cssClass: `sign-${sign}${isSpecial ? ' tone-special' : ''}${card.type === 'sylop' ? ' sylop' : ''}`,
    revealCue: 'card-face'
  };
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
  const isCurrent = state.activeSeatId === seat.seatId;
  const statusLabel = player.folded ? 'Folded' : (player.called ? 'Stood' : (player.bombedOut ? 'Bombed Out' : 'In Hand'));
  const cards = (player.hand || []).map(card => cardVm(card, reveal));
  return {
    seatId: seat.seatId,
    displayName: seat.displayName || 'Seat',
    isViewer,
    isCurrent,
    isAi,
    aiDifficultyLabel: isAi ? SabaccAi.labelForDifficulty(aiProfile.difficulty) : '',
    aiProfileLabel,
    aiLastDecision,
    profession: seat.profession || '',
    tableFact: seat.tableFact || '',
    avatar: seat.avatar || '',
    hasAvatar: Boolean(seat.avatar),
    avatarGlyph: avatarGlyph(seat.displayName || 'Seat'),
    statusLabel,
    statusClass: player.folded ? 'fold' : (player.called ? 'called' : (player.bombedOut ? 'bomb' : 'in')),
    cssClass: seatStatusClass(player, evaluation, { isCurrent, isViewer, reveal }),
    totalLabel: reveal ? evaluation.label : hiddenTotalLabel,
    totalClass: evaluation.bombedOut ? 'bomb' : (reveal && evaluation.specialWinner ? 'special' : (evaluation.pureSabacc ? 'sabacc' : '')),
    bombedOut: Boolean(evaluation.bombedOut),
    specialWinner: reveal && Boolean(evaluation.specialWinner),
    cards,
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
    const seatList = playableSeats(session);
    const seatVms = seatList.map(seat => seatVm(session, state, seat, viewerSeatId));
    const viewerSeatSummary = seatVms.find(seat => seat.isViewer) || null;
    const tableSeatSource = viewerSeatSummary ? seatVms.filter(seat => !seat.isViewer) : seatVms;
    const tableSeats = tableSeatSource.map((seat, index) => ({
      ...seat,
      seatStyle: seatStyle(index, tableSeatSource.length),
      seatNumber: index + 1
    }));
    const shiftDice = state.shiftRoll ? {
      ...state.shiftRoll,
      dice: [state.shiftRoll.first, state.shiftRoll.second].filter(value => value !== undefined && value !== null).map(value => ({ value })),
      tone: state.shiftRoll.matched ? 'danger' : 'safe'
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
      handHierarchyHelp: SABACC_HAND_HIERARCHY_HELP,
      hasHandHierarchyHelp: SABACC_HAND_HIERARCHY_HELP.length > 0,
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
      seats: seatVms,
      tableSeats,
      hasTableSeats: tableSeats.length > 0,
      viewerSeatSummary,
      hasViewerSeatSummary: Boolean(viewerSeatSummary),
      shiftDice,
      hasShiftDice: Boolean(shiftDice),
      phaseClass: `phase-${String(state.phase || 'ready').replace(/[^a-z0-9-]/gi, '-').toLowerCase()}`,
      viewerSeat: {
        canAct,
        canBettingAct: Boolean(canAct && state.phase === 'betting'),
        canCardAct: Boolean(canAct && state.phase === 'drawing'),
        canCall: Boolean(canAct && state.phase === 'drawing' && !evaluateSabaccHand(viewerPlayer?.hand || []).bombedOut && (viewerPlayer?.hand || []).length >= 2),
        canDiscard: false,
        summary: viewerSeatSummary,
        hasSummary: Boolean(viewerSeatSummary),
        totalLabel: viewerSeatSummary?.totalLabel || '—',
        statusLabel: viewerSeatSummary?.statusLabel || 'Observer',
        tableCredits: Number(viewerPlayer?.tableCredits || 0),
        hand: (viewerPlayer?.hand || []).map(card => ({
          ...cardVm(card, true),
          sessionId: session.id,
          seatId: viewerSeatId,
          canShift: Boolean(canAct && state.phase === 'drawing'),
          canDiscard: false,
          market: (Array.isArray(state.market) ? state.market : []).map(marketSlotVm)
        }))
      },
      hasPrivateHand: Boolean((viewerPlayer?.hand || []).length),
      handHistory: (state.handHistory || []).map(hand => ({ ...hand, timeLabel: formatTime(hand.at) })),
      hasHandHistory: Boolean((state.handHistory || []).length),
      eventLog: publicEvents.map(event => ({ ...event, timeLabel: formatTime(event.at) })),
      hasEventLog: Boolean(publicEvents.length)
    };
  }
}
