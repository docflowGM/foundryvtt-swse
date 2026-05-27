import { buildGameAiProfile, labelForGameAiDifficulty } from '../../ai/game-ai-profile-service.js';
import { GameCreditEscrowService } from '../../wagers/game-credit-escrow-service.js';
import { evaluateHintaroRoll } from './hintaro-rules.js';

function safeArray(value) { return Array.isArray(value) ? value : []; }
function safeAmount(value) { const n = Math.floor(Number(value)); return Number.isFinite(n) && n >= 0 ? n : 0; }
function labelForSeat(session, seatId) { return safeArray(session.seats).find(seat => seat.seatId === seatId)?.displayName || 'Unknown Seat'; }
function isAutomatedSeat(seat = {}) { return seat?.type === 'ai' || seat?.type === 'npc' || Boolean(seat?.aiProfile); }
function formatTime(value) { try { return value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''; } catch (_err) { return ''; } }
function participantIdForActor(actor) { return game?.user?.isGM ? `gm:${game.user.id}` : `player:${game?.user?.id ?? 'unknown'}`; }
function symbolVm(symbol, index, sessionId = '', seatId = '') {
  const isTukar = symbol === 'tukar';
  return {
    index,
    displayIndex: index + 1,
    label: isTukar ? 'Tukar' : 'Kulro',
    shortLabel: isTukar ? 'T' : 'K',
    tone: isTukar ? 'tukar' : 'kulro',
    colorLabel: isTukar ? 'Blue' : 'Red',
    sessionId,
    seatId
  };
}
function dieVm(symbols = [], dieIndex = 0, sessionId = '', seatId = '') {
  return {
    index: dieIndex,
    displayIndex: dieIndex + 1,
    symbols: safeArray(symbols).map((symbol, index) => symbolVm(symbol, index, sessionId, seatId)),
    tone: safeArray(symbols).filter(symbol => symbol === 'tukar').length >= safeArray(symbols).filter(symbol => symbol === 'kulro').length ? 'tukar' : 'kulro',
    sessionId,
    seatId
  };
}
function hintaroDieVm(face = null) {
  if (!face) return { label: 'Not rolled', shortLabel: '—', symbols: [], tone: 'neutral' };
  const symbols = safeArray(face.symbols).map(symbol => symbol === 'hin' ? 'Hin' : 'Taro');
  return { label: face.label || symbols.join('/') || 'Blank', shortLabel: symbols.length ? symbols.map(s => s[0]).join('/') : '—', symbols, tone: symbols.includes('Hin') && symbols.includes('Taro') ? 'mixed' : (symbols.includes('Hin') ? 'hin' : (symbols.includes('Taro') ? 'taro' : 'neutral')) };
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

function buildBettingVm(state, viewerSeatId) {
  const betting = state.betting || {};
  const currentBet = safeAmount(betting.currentBet);
  const paid = safeAmount(betting.contributions?.[viewerSeatId]);
  const toCall = Math.max(0, currentBet - paid);
  return {
    currentBet,
    minBet: safeAmount(betting.minBet, 1) || 1,
    minRaise: safeAmount(betting.minRaise, 1) || 1,
    toCall,
    canCheck: toCall <= 0,
    canBet: currentBet <= 0,
    canCall: toCall > 0,
    canRaise: currentBet > 0
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
    const canAct = Boolean(viewerSeat && state.activeSeatId === viewerSeat.seatId && ['betting', 'reroll'].includes(phase));
    const betting = buildBettingVm(state, currentSeatId);
    const hintaroDie = hintaroDieVm(state.hintaroDie);

    const seatVms = seats.map(seat => {
      const player = state.players?.[seat.seatId] || {};
      const evaluation = player.evaluation || evaluateHintaroRoll(player.symbols || [], state.hintaroDie);
      const aiProfile = isAutomatedSeat(seat) ? buildGameAiProfile(seat.aiProfile || seat.aiDifficulty || 'medium', { personality: 'methodical' }) : null;
      const isViewer = seat.seatId === viewerSeat?.seatId;
      const showSymbols = true;
      return {
        id: seat.seatId,
        displayName: seat.displayName || 'Unknown Seat',
        avatar: seat.avatar || null,
        profession: seat.profession || '',
        tableFact: seat.tableFact || '',
        isAi: isAutomatedSeat(seat),
        aiProfileLabel: aiProfile ? `${labelForGameAiDifficulty(aiProfile.difficulty)} · ${aiProfile.personality} · ${aiProfile.fairness}` : '',
        isViewer,
        isCurrent: state.activeSeatId === seat.seatId,
        isHintaron: state.hintaronSeatId === seat.seatId,
        dropped: Boolean(player.dropped),
        statusLabel: player.dropped ? 'Dropped' : (state.hintaronSeatId === seat.seatId ? 'Hintaron' : 'Active'),
        tableCredits: safeAmount(player.tableCredits),
        wins: safeAmount(player.wins),
        lastAction: player.lastAction || 'Waiting.',
        symbols: showSymbols ? safeArray(player.symbols).map((symbol, index) => symbolVm(symbol, index, session.id, seat.seatId)) : [],
        dice: showSymbols ? (safeArray(player.dice).length ? safeArray(player.dice) : [safeArray(player.symbols).slice(0, 2), safeArray(player.symbols).slice(2, 4)]).map((die, index) => dieVm(die, index, session.id, seat.seatId)) : [],
        hasSymbols: safeArray(player.symbols).length > 0,
        rankLabel: evaluation.rankLabel || 'No Rank',
        modifiedLabel: `${evaluation.modified?.tukar ?? 0} Tukar / ${evaluation.modified?.kulro ?? 0} Kulro`,
        cancelledLabel: `${evaluation.cancelled?.tukar ?? 0} Tukar, ${evaluation.cancelled?.kulro ?? 0} Kulro cancelled`,
        canWin: Boolean(evaluation.canWin)
      };
    });

    const viewerPlayer = state.players?.[currentSeatId] || {};
    return {
      id: session.id,
      title: session.title || 'Hintaro Table',
      statusLabel: state.statusLabel || phase.toUpperCase(),
      phase,
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
      rankOrder: [
        { label: 'Tukar to Kulro', description: 'Two Tukar and two Kulro after cancellations.' },
        { label: 'Quad Kulro', description: 'Four Kulro after cancellations.' },
        { label: 'Tukar Tukar', description: 'At least one Tukar pair.' },
        { label: 'Kulro Kulro', description: 'At least one Kulro pair.' }
      ],
      activeSeatLabel: labelForSeat(session, state.activeSeatId),
      currentSeatId,
      canCancel: ['ready', 'betting', 'reroll', 'round-complete'].includes(phase),
      canCashOut: ['ready', 'round-complete'].includes(phase),
      canStartRound: ['ready', 'round-complete'].includes(phase),
      showBetting: phase === 'betting',
      showReroll: phase === 'reroll',
      showComplete: phase === 'complete',
      hintaroDie,
      betting,
      viewerTableCredits: safeAmount(viewerPlayer.tableCredits),
      viewerSeat: {
        id: currentSeatId,
        canBettingAct: canAct && phase === 'betting',
        canRerollAct: canAct && phase === 'reroll',
        symbols: safeArray(viewerPlayer.symbols).map((symbol, index) => symbolVm(symbol, index, session.id, currentSeatId)),
        dice: (safeArray(viewerPlayer.dice).length ? safeArray(viewerPlayer.dice) : [safeArray(viewerPlayer.symbols).slice(0, 2), safeArray(viewerPlayer.symbols).slice(2, 4)]).map((die, index) => dieVm(die, index, session.id, currentSeatId)),
        hasSymbols: safeArray(viewerPlayer.symbols).length > 0
      },
      seats: seatVms,
      wager: GameCreditEscrowService.describe(session),
      roundHistory: safeArray(state.roundHistory).map(entry => ({ ...entry, winnerLabel: safeArray(entry.winnerSeatIds).map(id => labelForSeat(session, id)).join(', ') || 'No winner', timeLabel: formatTime(entry.at) })),
      hasRoundHistory: safeArray(state.roundHistory).length > 0,
      eventLog: safeArray(state.eventLog).map(entry => ({ ...entry, timeLabel: formatTime(entry.at) })),
      hasEventLog: safeArray(state.eventLog).length > 0
    };
  }
}
