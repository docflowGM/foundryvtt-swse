import { buildGameAiProfile, labelForGameAiDifficulty } from '../../ai/game-ai-profile-service.js';
import { GameCreditEscrowService } from '../../wagers/game-credit-escrow-service.js';
import { evaluateHintaroRoll } from './hintaro-rules.js';

function safeArray(value) { return Array.isArray(value) ? value : []; }
function safeAmount(value) { const n = Math.floor(Number(value)); return Number.isFinite(n) && n >= 0 ? n : 0; }
function labelForSeat(session, seatId) { return safeArray(session.seats).find(seat => seat.seatId === seatId)?.displayName || 'Unknown Seat'; }
function isAutomatedSeat(seat = {}) { return seat?.type === 'ai' || seat?.type === 'npc' || Boolean(seat?.aiProfile); }
function formatTime(value) { try { return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''; } catch (_err) { return ''; } }
function participantIdForActor(actor) { return game?.user?.isGM ? `gm:${game.user.id}` : `player:${game?.user?.id ?? 'unknown'}`; }
function avatarGlyphForName(name = '') {
  const clean = String(name || '').trim();
  return clean ? clean[0].toUpperCase() : 'H';
}

const SEAT_POSITIONS = Object.freeze({
  1: [{ l: 50, t: 20 }],
  2: [{ l: 29, t: 24 }, { l: 71, t: 24 }],
  3: [{ l: 20, t: 32 }, { l: 50, t: 19 }, { l: 80, t: 32 }],
  4: [{ l: 15, t: 43 }, { l: 34, t: 23 }, { l: 66, t: 23 }, { l: 85, t: 43 }],
  5: [{ l: 13, t: 48 }, { l: 28, t: 25 }, { l: 50, t: 18 }, { l: 72, t: 25 }, { l: 87, t: 48 }]
});

function seatStyleFor(index, total) {
  const positions = SEAT_POSITIONS[Math.max(1, Math.min(5, total))] || SEAT_POSITIONS[3];
  const pos = positions[index] || positions[positions.length - 1];
  return `left:${pos.l}%;top:${pos.t}%`;
}

function symbolBase(symbol, index, sessionId = '', seatId = '') {
  const isTukar = symbol === 'tukar';
  return {
    index,
    displayIndex: index + 1,
    label: isTukar ? 'Tukar' : 'Kulro',
    shortLabel: isTukar ? 'T' : 'K',
    glyph: isTukar ? '\u25B2' : '\u2B22',
    tone: isTukar ? 'tukar' : 'kulro',
    colorLabel: isTukar ? 'Gold' : 'Cyan',
    sessionId,
    seatId,
    cancelled: false,
    cssClass: isTukar ? 'tone-tukar' : 'tone-kulro'
  };
}

function symbolsVm(symbols = [], evaluation = {}, sessionId = '', seatId = '') {
  const cancelled = {
    tukar: safeAmount(evaluation.cancelled?.tukar),
    kulro: safeAmount(evaluation.cancelled?.kulro)
  };
  const seen = { tukar: 0, kulro: 0 };
  return safeArray(symbols).map((symbol, index) => {
    const vm = symbolBase(symbol, index, sessionId, seatId);
    seen[symbol] = safeAmount(seen[symbol]) + 1;
    vm.cancelled = seen[symbol] <= safeAmount(cancelled[symbol]);
    vm.cssClass = `${vm.cssClass}${vm.cancelled ? ' is-cancelled' : ''}`;
    return vm;
  });
}

function dieVm(symbols = [], dieIndex = 0, evaluation = {}, sessionId = '', seatId = '', offset = 0) {
  const dieSymbols = safeArray(symbols);
  const allSymbols = safeArray(evaluation.__allSymbols || []);
  const symbolVms = symbolsVm(allSymbols.length ? allSymbols : dieSymbols, evaluation, sessionId, seatId).slice(offset, offset + dieSymbols.length);
  const tukar = dieSymbols.filter(symbol => symbol === 'tukar').length;
  const kulro = dieSymbols.filter(symbol => symbol === 'kulro').length;
  const cancelled = symbolVms.every(symbol => symbol.cancelled) && symbolVms.length > 0;
  const tone = cancelled ? 'cancelled' : (tukar >= kulro ? 'tukar' : 'kulro');
  return {
    index: dieIndex,
    displayIndex: dieIndex + 1,
    symbols: symbolVms,
    tone,
    cancelled,
    sessionId,
    seatId,
    cssClass: `tone-${tone}${cancelled ? ' is-cancelled' : ''}`
  };
}

function diceVm(player = {}, evaluation = {}, sessionId = '', seatId = '') {
  const dice = safeArray(player.dice).length ? safeArray(player.dice) : [safeArray(player.symbols).slice(0, 2), safeArray(player.symbols).slice(2, 4)];
  const evalWithAll = { ...evaluation, __allSymbols: safeArray(player.symbols) };
  let offset = 0;
  return dice.map((die, index) => {
    const vm = dieVm(die, index, evalWithAll, sessionId, seatId, offset);
    offset += safeArray(die).length;
    return vm;
  });
}

function hintaroDieVm(face = null) {
  if (!face) return { label: 'Not rolled', shortLabel: '-', symbols: [], tone: 'neutral', glyph: '?' };
  const symbols = safeArray(face.symbols).map(symbol => symbol === 'hin' ? 'Hin' : 'Taro');
  const hasHin = symbols.includes('Hin');
  const hasTaro = symbols.includes('Taro');
  const tone = hasHin && hasTaro ? 'mixed' : (hasHin ? 'hin' : (hasTaro ? 'taro' : 'neutral'));
  return {
    label: face.label || symbols.join('/') || 'Blank',
    shortLabel: symbols.length ? symbols.map(s => s[0]).join('/') : '-',
    symbols,
    tone,
    glyph: hasHin && hasTaro ? 'H/T' : (hasHin ? 'HIN' : (hasTaro ? 'TARO' : '-')),
    cancelsLabel: hasHin && hasTaro ? 'Cancels one Tukar and one Kulro' : (hasHin ? 'Cancels Tukar' : (hasTaro ? 'Cancels Kulro' : 'No cancellation'))
  };
}

function dealerCalloutForPhase(state = {}, session = {}) {
  const phase = String(state.phase || 'ready');
  const hintaron = labelForSeat(session, state.hintaronSeatId);
  if (phase === 'ready') return `${hintaron} gathers the chance cubes.`;
  if (phase === 'betting') return `${hintaron} calls wagers around the table.`;
  if (phase === 'reroll') return `${hintaron} offers one cube reroll to each player.`;
  if (phase === 'round-complete') return 'The hintaro die settles the round.';
  if (phase === 'complete') return 'The table is closed and winnings are counted.';
  return 'The table waits for the next call.';
}

function phaseLabel(phase = 'ready') {
  const labels = {
    ready: 'Ready',
    betting: 'Betting Round',
    reroll: 'Reroll Window',
    'round-complete': 'Round Complete',
    complete: 'Complete'
  };
  return labels[phase] || String(phase || 'Ready').toUpperCase();
}

function buildBettingVm(state, viewerSeatId, viewerCredits = 0) {
  const betting = state.betting || {};
  const currentBet = safeAmount(betting.currentBet);
  const paid = safeAmount(betting.contributions?.[viewerSeatId]);
  const toCall = Math.max(0, currentBet - paid);
  const minBet = safeAmount(betting.minBet) || safeAmount(state.ante) || 1;
  const minRaise = safeAmount(betting.minRaise) || minBet;
  const maxBet = Math.max(minBet, viewerCredits || minBet);
  return {
    currentBet,
    minBet,
    minRaise,
    maxBet,
    suggestedBet: Math.min(maxBet, Math.max(minBet, currentBet || minBet)),
    suggestedRaise: Math.min(maxBet, Math.max(minRaise, toCall + minRaise)),
    toCall,
    canCheck: toCall <= 0,
    canBet: currentBet <= 0,
    canCall: toCall > 0,
    canRaise: currentBet > 0
  };
}

function buildSeatVm({ seat, player, evaluation, aiProfile, isViewer, sessionId, activeSeatId, hintaronSeatId, winnerSeatIds = [] }) {
  const hasAvatar = Boolean(seat.avatar);
  const dropped = Boolean(player.dropped);
  const isCurrent = activeSeatId === seat.seatId;
  const isHintaron = hintaronSeatId === seat.seatId;
  const isWinner = safeArray(winnerSeatIds).includes(seat.seatId);
  const rank = evaluation.rankLabel || 'No Rank';
  const statusClass = dropped ? 'fold' : (isWinner ? 'called' : 'in');
  const cssParts = [];
  if (isCurrent) cssParts.push('is-current');
  if (isViewer) cssParts.push('is-viewer');
  if (dropped) cssParts.push('folded');
  if (isWinner) cssParts.push('special');
  if (isHintaron) cssParts.push('hintaron');
  return {
    id: seat.seatId,
    displayName: seat.displayName || 'Unknown Seat',
    avatar: seat.avatar || null,
    hasAvatar,
    avatarGlyph: avatarGlyphForName(seat.displayName),
    profession: seat.profession || '',
    tableFact: seat.tableFact || '',
    seatNumber: safeAmount(seat.seatIndex) + 1,
    isAi: isAutomatedSeat(seat),
    aiProfileLabel: aiProfile ? `${labelForGameAiDifficulty(aiProfile.difficulty)} | ${aiProfile.personality} | ${aiProfile.fairness}` : '',
    isViewer,
    isCurrent,
    isHintaron,
    isWinner,
    dropped,
    cssClass: cssParts.join(' '),
    statusClass,
    statusLabel: dropped ? 'Dropped' : (isHintaron ? 'Hintaron' : (isCurrent ? 'Acting' : 'In Pit')),
    tableCredits: safeAmount(player.tableCredits),
    wins: safeAmount(player.wins),
    lastAction: player.lastAction || 'Waiting.',
    symbols: symbolsVm(player.symbols, evaluation, sessionId, seat.seatId),
    dice: diceVm(player, evaluation, sessionId, seat.seatId),
    hasSymbols: safeArray(player.symbols).length > 0,
    rankLabel: rank,
    totalClass: evaluation.canWin ? 'special' : 'bomb',
    modifiedLabel: `${evaluation.modified?.tukar ?? 0} Tukar / ${evaluation.modified?.kulro ?? 0} Kulro`,
    cancelledLabel: `${evaluation.cancelled?.tukar ?? 0} Tukar, ${evaluation.cancelled?.kulro ?? 0} Kulro cancelled`,
    canWin: Boolean(evaluation.canWin)
  };
}

export class HintaroViewModel {
  static build({ session, actor, participantId = null } = {}) {
    if (!session || session.gameId !== 'hintaro') return null;
    const state = session.gameState || {};
    const currentParticipantId = participantId || participantIdForActor(actor);
    const seats = safeArray(session.seats).filter(seat => !['declined', 'cancelled'].includes(seat.status));
    const viewerSeat = seats.find(seat => seat.recipientId === currentParticipantId || seat.actorId === actor?.id || seat.userId === game?.user?.id) || null;
    const currentSeatId = viewerSeat?.seatId || seats[0]?.seatId || '';
    const phase = String(state.phase || 'ready');
    const viewerPlayer = state.players?.[currentSeatId] || {};
    const canAct = Boolean(viewerSeat && state.activeSeatId === viewerSeat.seatId && ['betting', 'reroll'].includes(phase));
    const betting = buildBettingVm(state, currentSeatId, safeAmount(viewerPlayer.tableCredits));
    const hintaroDie = hintaroDieVm(state.hintaroDie);
    const winnerSeatIds = safeArray(state.winnerSeatIds);

    const seatVms = seats.map(seat => {
      const player = state.players?.[seat.seatId] || {};
      const evaluation = player.evaluation || evaluateHintaroRoll(player.symbols || [], state.hintaroDie);
      const aiProfile = isAutomatedSeat(seat) ? buildGameAiProfile(seat.aiProfile || seat.aiDifficulty || 'medium', { personality: 'methodical' }) : null;
      return buildSeatVm({
        seat,
        player,
        evaluation,
        aiProfile,
        isViewer: seat.seatId === viewerSeat?.seatId,
        sessionId: session.id,
        activeSeatId: state.activeSeatId,
        hintaronSeatId: state.hintaronSeatId,
        winnerSeatIds
      });
    });

    const tableSeats = seatVms.filter(seat => !seat.isViewer).map((seat, index, arr) => ({
      ...seat,
      seatStyle: seatStyleFor(index, arr.length)
    }));
    const viewerSeatVm = seatVms.find(seat => seat.isViewer) || seatVms[0] || null;
    const viewerEvaluation = viewerPlayer.evaluation || evaluateHintaroRoll(viewerPlayer.symbols || [], state.hintaroDie);
    const rankOrder = [
      { label: 'Tukar to Kulro', description: 'Two Tukar and two Kulro after cancellations.', active: viewerEvaluation.rankLabel === 'Tukar to Kulro' },
      { label: 'Quad Kulro', description: 'Four Kulro after cancellations.', active: viewerEvaluation.rankLabel === 'Quad Kulro' },
      { label: 'Tukar Tukar', description: 'At least one Tukar pair.', active: viewerEvaluation.rankLabel === 'Tukar Tukar' },
      { label: 'Kulro Kulro', description: 'At least one Kulro pair.', active: viewerEvaluation.rankLabel === 'Kulro Kulro' },
      { label: 'No Rank', description: 'No scoring pattern remains after the Hintaro die cancels symbols.', active: viewerEvaluation.rankLabel === 'No Rank' }
    ];
    const latestRound = safeArray(state.roundHistory)[0] || null;
    const hasShowdown = ['round-complete', 'complete'].includes(phase) && (Boolean(latestRound) || winnerSeatIds.length > 0);
    const showdown = hasShowdown ? {
      winnerLabel: winnerSeatIds.map(id => labelForSeat(session, id)).join(', ') || latestRound?.winnerLabel || latestRound?.winnerSeatIds?.map?.(id => labelForSeat(session, id)).join(', ') || 'No winner',
      rankLabel: latestRound?.rankLabel || viewerEvaluation.rankLabel || 'Settled',
      potLabel: `${safeAmount(latestRound?.pot || state.pot)} cr`,
      timeLabel: formatTime(latestRound?.at)
    } : null;

    return {
      id: session.id,
      title: session.title || 'Hintaro Table',
      statusLabel: state.statusLabel || phaseLabel(phase),
      phase,
      phaseClass: `phase-${phase}`,
      round: safeAmount(state.round),
      ante: safeAmount(state.ante),
      pot: safeAmount(state.pot),
      carriedPot: safeAmount(state.carriedPot),
      message: state.message || 'Hintaro table ready.',
      hintaronLabel: labelForSeat(session, state.hintaronSeatId),
      hintaronMode: state.hintaronMode || 'rotating',
      hintaronModeLabel: (state.hintaronMode || 'rotating') === 'casino' ? 'Casino fixed hintaron' : 'Casual rotating hintaron',
      dealerCallout: dealerCalloutForPhase(state, session),
      soundCue: phase === 'reroll' ? 'hintaro-reroll' : (phase === 'round-complete' ? 'hintaro-settle' : 'hintaro-table'),
      rankOrder,
      activeSeatLabel: labelForSeat(session, state.activeSeatId),
      currentSeatId,
      canCancel: ['ready', 'betting', 'reroll', 'round-complete'].includes(phase),
      canCashOut: ['ready', 'round-complete'].includes(phase),
      canStartRound: ['ready', 'round-complete'].includes(phase),
      showBetting: phase === 'betting',
      showReroll: phase === 'reroll',
      showComplete: phase === 'complete',
      hasShowdown,
      showdown,
      hintaroDie,
      betting,
      viewerTableCredits: safeAmount(viewerPlayer.tableCredits),
      viewerSeat: {
        ...(viewerSeatVm || {}),
        id: currentSeatId,
        canBettingAct: canAct && phase === 'betting',
        canRerollAct: canAct && phase === 'reroll',
        symbols: symbolsVm(viewerPlayer.symbols, viewerEvaluation, session.id, currentSeatId),
        dice: diceVm(viewerPlayer, viewerEvaluation, session.id, currentSeatId),
        hasSymbols: safeArray(viewerPlayer.symbols).length > 0,
        rankLabel: viewerEvaluation.rankLabel || 'No Rank',
        modifiedLabel: `${viewerEvaluation.modified?.tukar ?? 0} Tukar / ${viewerEvaluation.modified?.kulro ?? 0} Kulro`,
        cancelledLabel: `${viewerEvaluation.cancelled?.tukar ?? 0} Tukar, ${viewerEvaluation.cancelled?.kulro ?? 0} Kulro cancelled`
      },
      seats: seatVms,
      tableSeats,
      hasTableSeats: tableSeats.length > 0,
      wager: GameCreditEscrowService.describe(session),
      roundHistory: safeArray(state.roundHistory).map(entry => ({ ...entry, winnerLabel: safeArray(entry.winnerSeatIds).map(id => labelForSeat(session, id)).join(', ') || 'No winner', timeLabel: formatTime(entry.at) })),
      hasRoundHistory: safeArray(state.roundHistory).length > 0,
      eventLog: safeArray(state.eventLog).map(entry => ({ ...entry, timeLabel: formatTime(entry.at) })),
      hasEventLog: safeArray(state.eventLog).length > 0
    };
  }
}
