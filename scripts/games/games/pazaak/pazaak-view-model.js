import { PazaakEngine } from './pazaak-engine.js';
import {
  getPazaakSideCardCatalog,
  PAZAAK_HAND_SIZE,
  PAZAAK_SETS_TO_WIN,
  PAZAAK_SIDE_DECK_SIZE,
  PAZAAK_TABLE_LIMIT,
  PAZAAK_TARGET
} from './pazaak-deck.js';
import { playableSideCardStatus, scorePazaakPlayer } from './pazaak-rules.js';
import { GameCreditEscrowService } from '../../wagers/game-credit-escrow-service.js';
import { PazaakAi, buildPazaakAiProfile } from './pazaak-ai.js';

function cardTone(card = {}) {
  if (card.tone) return card.tone;
  if (Number(card.value || 0) > 0) return 'plus';
  if (Number(card.value || 0) < 0) return 'minus';
  return 'neutral';
}

function scoreLabel(value) {
  const number = Number(value || 0);
  return number > 0 ? `+${number}` : String(number);
}

function mapTableCard(card = {}) {
  const value = Number(card.value || 0);
  return {
    id: card.instanceId || card.catalogId || card.id,
    label: card.label || card.shortLabel || scoreLabel(value),
    value,
    valueLabel: scoreLabel(value),
    source: card.source || 'main',
    tone: cardTone(card),
    isSide: card.source === 'side',
    isMain: card.source === 'main'
  };
}

function choiceForms(card = {}) {
  if (card.type === 'plusMinus' || card.type === 'tiebreaker') {
    return { requiresChoice: true, signOnly: true, signAndValue: false };
  }
  if (card.type === 'plusMinusRange') {
    return { requiresChoice: true, signOnly: false, signAndValue: true };
  }
  return { requiresChoice: false, signOnly: false, signAndValue: false };
}

function mapHandCard(card = {}, player = {}, canAct = false) {
  const status = playableSideCardStatus(player, card, card.requiresChoice ? { sign: 'plus', value: 1 } : {});
  const forms = choiceForms(card);
  return {
    ...card,
    id: card.instanceId,
    catalogId: card.catalogId || card.id,
    label: card.label || card.shortLabel || card.id,
    tone: cardTone(card),
    canPlay: Boolean(canAct && (forms.requiresChoice || status.playable)),
    disabledReason: status.reason,
    ...forms
  };
}

function mapSeat(session = {}, state = {}, seat = {}, currentSeatId = null) {
  const aiProfile = buildPazaakAiProfile(seat.aiProfile || seat.ai || 'medium');
  const player = state.players?.[seat.seatId] ?? {};
  const score = scorePazaakPlayer(player);
  const isCurrent = state.activeSeatId === seat.seatId;
  const isViewer = currentSeatId === seat.seatId;
  const hand = Array.isArray(player.hand) ? player.hand : [];
  return {
    seatId: seat.seatId,
    displayName: seat.displayName || 'Unknown Seat',
    type: seat.type || 'player',
    isAi: seat.type === 'ai' || seat.aiProfile,
    aiDifficultyLabel: PazaakAi.labelForDifficulty(aiProfile.difficulty),
    aiFairnessLabel: PazaakAi.labelForFairness(aiProfile.fairness),
    aiPersonalityLabel: PazaakAi.labelForPersonality(aiProfile.personality),
    aiPersonalityQuality: PazaakAi.qualityForPersonality(aiProfile.personality),
    aiForceSensitive: Boolean(aiProfile.forceSensitive),
    profession: seat.profession || aiProfile.profession || '',
    tableFact: seat.tableFact || aiProfile.tableFact || '',
    isNpc: seat.type === 'npc',
    isViewer,
    isCurrent,
    sideDeckLocked: Boolean(player.sideDeckLocked),
    sideDeckCount: Array.isArray(player.sideDeckIds) ? player.sideDeckIds.length : 0,
    score,
    scoreLabel: scoreLabel(score),
    setsWon: Number(player.setsWon || 0),
    stood: Boolean(player.stood),
    bust: Boolean(player.bust),
    filledTable: Boolean(player.filledTable),
    tiebreakerUsed: Boolean(player.tiebreakerUsed),
    lastAction: player.lastAction || '',
    tableCards: (Array.isArray(player.tableCards) ? player.tableCards : []).map(mapTableCard),
    hasTableCards: (player.tableCards ?? []).length > 0,
    hand: isViewer ? hand.map(card => ({ ...mapHandCard(card, player, isCurrent), sessionId: session.id, seatId: seat.seatId })) : [],
    handCount: hand.length,
    showHand: isViewer,
    canAct: Boolean(isViewer && isCurrent && state.phase === 'playing' && !player.stood && !player.bust),
    canStand: Boolean(isViewer && isCurrent && state.phase === 'playing' && !player.stood && !player.bust),
    canEndTurn: Boolean(isViewer && isCurrent && state.phase === 'playing' && !player.stood && !player.bust),
    statusLabel: player.bust ? 'BUST' : (player.stood ? 'STAND' : (isCurrent ? 'TURN' : 'WAIT'))
  };
}

function currentSeatCanLock(session, state, currentSeat) {
  if (!currentSeat) return false;
  if (currentSeat.type === 'ai' || currentSeat.type === 'npc' || currentSeat.aiProfile) return false;
  const player = state.players?.[currentSeat.seatId];
  return state.phase === 'setup' && !player?.sideDeckLocked;
}

export class PazaakViewModel {
  static build({ session, actor, participantId = null, selectedDeckIds = [] } = {}) {
    if (!session || session.gameId !== 'pazaak') return null;
    const state = PazaakEngine.getState(session);
    const currentSeat = PazaakEngine.findSeatForActor(session, actor, participantId);
    const currentSeatId = currentSeat?.seatId ?? null;
    const selected = new Set((Array.isArray(selectedDeckIds) ? selectedDeckIds : []).map(String));
    const currentPlayer = currentSeatId ? state.players?.[currentSeatId] : null;
    const lockedDeck = currentPlayer?.sideDeckLocked ? new Set(currentPlayer.sideDeckIds || []) : new Set();
    const effectiveSelected = selected.size ? selected : lockedDeck;
    const catalog = getPazaakSideCardCatalog().map(card => ({
      ...card,
      selected: effectiveSelected.has(card.id),
      locked: Boolean(currentPlayer?.sideDeckLocked),
      toneClass: `tone-${card.tone || 'neutral'}`
    }));
    const selectedCount = effectiveSelected.size;
    const canLockDeck = currentSeatCanLock(session, state, currentSeat);
    const waitingSeats = (session.seats || [])
      .map(seat => ({ seat, player: state.players?.[seat.seatId] }))
      .filter(entry => entry.seat.status !== 'declined' && entry.seat.status !== 'cancelled' && !entry.player?.sideDeckLocked)
      .map(entry => entry.seat.displayName || entry.seat.seatId);
    const seats = (session.seats || [])
      .filter(seat => seat.status !== 'declined' && seat.status !== 'cancelled')
      .map(seat => mapSeat(session, state, seat, currentSeatId));
    const viewerSeat = seats.find(seat => seat.isViewer) ?? null;
    const winnerSeat = state.winnerSeatId ? seats.find(seat => seat.seatId === state.winnerSeatId) : null;
    const wager = GameCreditEscrowService.describe(session);

    return {
      id: session.id,
      title: session.title,
      rulesLabel: wager.enabled ? 'Wagered Credits' : 'Republic Senate Rules',
      wager,
      phase: state.phase,
      statusLabel: state.statusLabel || state.phase,
      showSetup: state.phase === 'setup',
      showPlaying: state.phase === 'playing',
      showComplete: state.phase === 'complete',
      message: state.message || '',
      target: PAZAAK_TARGET,
      setsToWin: PAZAAK_SETS_TO_WIN,
      sideDeckSize: PAZAAK_SIDE_DECK_SIZE,
      openingHandSize: PAZAAK_HAND_SIZE,
      tableLimit: PAZAAK_TABLE_LIMIT,
      setNumber: Number(state.setNumber || 0),
      activeSeatId: state.activeSeatId || null,
      activeSeatLabel: state.activeSeatId ? (seats.find(seat => seat.seatId === state.activeSeatId)?.displayName || 'Unknown') : '—',
      currentSeatId,
      hasCurrentSeat: Boolean(currentSeatId),
      viewerSeat,
      seats,
      catalog,
      selectedCount,
      selectedDeckCsv: Array.from(effectiveSelected).join(','),
      canLockDeck,
      lockDeckReady: Boolean(canLockDeck && selectedCount === PAZAAK_SIDE_DECK_SIZE),
      waitingSeats,
      hasWaitingSeats: waitingSeats.length > 0,
      setHistory: (state.setHistory || []).slice(-5).reverse(),
      hasSetHistory: (state.setHistory || []).length > 0,
      winnerSeat,
      winnerLabel: winnerSeat?.displayName || null
    };
  }
}
