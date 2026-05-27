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

const PAZAAK_CARD_FRONT_IMAGE = '/systems/foundryvtt-swse/assets/cards/pazaak/card-front-template.png';
const PAZAAK_CARD_BACK_IMAGE = '/systems/foundryvtt-swse/assets/cards/pazaak/card-back-template.png';

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

function cardVisual(card = {}, label = '') {
  const tone = cardTone(card);
  return {
    image: PAZAAK_CARD_FRONT_IMAGE,
    backImage: PAZAAK_CARD_BACK_IMAGE,
    hasTemplateImage: true,
    visualLabel: label || card.shortLabel || card.label || scoreLabel(card.value),
    visualTone: tone === 'main' ? 'neutral' : tone
  };
}

function mapTableCard(card = {}) {
  const value = Number(card.value || 0);
  const label = card.label || card.shortLabel || scoreLabel(value);
  return {
    id: card.instanceId || card.catalogId || card.id,
    label,
    value,
    valueLabel: scoreLabel(value),
    source: card.source || 'main',
    tone: cardTone(card),
    isSide: card.source === 'side',
    isMain: card.source === 'main',
    ...cardVisual(card, label)
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


function previewForSideCard(card = {}, player = {}) {
  const current = scorePazaakPlayer(player);
  const type = String(card.type || '');
  const baseValue = Number(card.value || 0) || 0;
  if (type === 'plus') return `Preview: ${scoreLabel(current)} → ${scoreLabel(current + Math.abs(baseValue))}`;
  if (type === 'minus') return `Preview: ${scoreLabel(current)} → ${scoreLabel(current - Math.abs(baseValue))}`;
  if (type === 'plusMinus' || type === 'tiebreaker') return `Choose +${Math.abs(baseValue || 1)} or −${Math.abs(baseValue || 1)} before play.`;
  if (type === 'plusMinusRange') return 'Choose +1, +2, −1, or −2 before play.';
  if (type === 'flip') return 'Flips a matching positive table card into a negative value.';
  if (type === 'double') return 'Doubles one matching table card value if legal.';
  return card.description || 'Side-card effect preview unavailable.';
}

function mapHandCard(card = {}, player = {}, canAct = false) {
  const status = playableSideCardStatus(player, card, card.requiresChoice ? { sign: 'plus', value: 1 } : {});
  const forms = choiceForms(card);
  const label = card.shortLabel || card.label || card.id;
  return {
    ...card,
    id: card.instanceId,
    catalogId: card.catalogId || card.id,
    label: card.label || card.shortLabel || card.id,
    visualLabel: label,
    tone: cardTone(card),
    canPlay: Boolean(canAct && (forms.requiresChoice || status.playable)),
    disabledReason: status.reason,
    previewLabel: previewForSideCard(card, player),
    ...cardVisual(card, label),
    ...forms
  };
}

function formatDelay(ms) {
  const seconds = Math.max(0, Math.round((Number(ms || 0) || 0) / 1000));
  return seconds ? `${seconds}s` : '';
}

function mapSeat(session = {}, state = {}, seat = {}, currentSeatId = null) {
  const aiProfile = buildPazaakAiProfile(seat.aiProfile || seat.ai || 'medium');
  const player = state.players?.[seat.seatId] ?? {};
  const score = scorePazaakPlayer(player);
  const isCurrent = state.activeSeatId === seat.seatId;
  const isThinking = Boolean(state.aiThinking?.active && state.aiThinking?.seatId === seat.seatId);
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
    isThinking,
    thinkingMessage: isThinking ? (state.aiThinking?.message || player.lastAction || '') : '',
    thinkingIntensity: isThinking ? (state.aiThinking?.intensity || 'normal') : '',
    thinkingDelayLabel: isThinking ? formatDelay(state.aiThinking?.delayMs) : '',
    tableCards: (Array.isArray(player.tableCards) ? player.tableCards : []).map(mapTableCard),
    hasTableCards: (player.tableCards ?? []).length > 0,
    hand: isViewer ? hand.map(card => ({ ...mapHandCard(card, player, isCurrent), sessionId: session.id, seatId: seat.seatId })) : [],
    handCount: hand.length,
    showHand: isViewer,
    canAct: Boolean(isViewer && isCurrent && state.phase === 'playing' && !player.stood && !player.bust),
    canStand: Boolean(isViewer && isCurrent && state.phase === 'playing' && !player.stood && !player.bust),
    canEndTurn: Boolean(isViewer && isCurrent && state.phase === 'playing' && !player.stood && !player.bust),
    statusLabel: isThinking ? 'THINKING' : (player.bust ? 'BUST' : (player.stood ? 'STAND' : (isCurrent ? 'TURN' : 'WAIT')))
  };
}

function currentSeatCanLock(session, state, currentSeat) {
  if (!currentSeat) return false;
  if (currentSeat.type === 'ai' || currentSeat.type === 'npc' || currentSeat.aiProfile) return false;
  const player = state.players?.[currentSeat.seatId];
  return state.phase === 'setup' && !player?.sideDeckLocked;
}


function mapEventLogEntry(entry = {}) {
  return {
    id: entry.id,
    type: entry.type || 'event',
    seatLabel: entry.seatLabel || '',
    message: entry.message || '',
    tone: entry.tone || '',
    timeLabel: entry.at ? new Date(entry.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
  };
}

function canCancelSession(session = {}, currentSeat = null) {
  if (!session || ['complete', 'cancelled', 'refunded'].includes(String(session.status || ''))) return false;
  if (game?.user?.isGM) return true;
  return Boolean(currentSeat && session.hostUserId && currentSeat.userId === session.hostUserId);
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
      toneClass: `tone-${card.tone || 'neutral'}`,
      ...cardVisual(card, card.shortLabel || card.label)
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
    const eventLog = (Array.isArray(state.eventLog) ? state.eventLog : []).filter(entry => !entry.gmOnly || game?.user?.isGM).slice(-12).reverse().map(mapEventLogEntry);
    const tableChatter = eventLog.filter(entry => ['force', 'success', 'danger'].includes(entry.tone) || /AI|stood|bust|20|played|draw/i.test(entry.message)).slice(0, 3);
    const aiThinking = state.aiThinking?.active ? {
      ...state.aiThinking,
      delayLabel: formatDelay(state.aiThinking.delayMs),
      intensityLabel: state.aiThinking.intensity === 'hard' ? 'thinking hard' : (state.aiThinking.intensity === 'easy' ? 'thinking easy' : 'thinking')
    } : null;

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
      aiThinking,
      hasAiThinking: Boolean(aiThinking),
      canCancel: canCancelSession(session, currentSeat),
      canForfeit: Boolean(currentSeatId && ['setup', 'playing'].includes(state.phase) && !['complete', 'cancelled', 'refunded'].includes(String(session.status || ''))),
      eventLog,
      tableChatter,
      hasTableChatter: tableChatter.length > 0,
      hasEventLog: eventLog.length > 0,
      target: PAZAAK_TARGET,
      setsToWin: PAZAAK_SETS_TO_WIN,
      sideDeckSize: PAZAAK_SIDE_DECK_SIZE,
      openingHandSize: PAZAAK_HAND_SIZE,
      tableLimit: PAZAAK_TABLE_LIMIT,
      setNumber: Number(state.setNumber || 0),
      activeSeatId: state.activeSeatId || null,
      activeSeatLabel: state.activeSeatId ? (seats.find(seat => seat.seatId === state.activeSeatId)?.displayName || 'Unknown') : '—',
      debug: game?.user?.isGM ? (state.debug || null) : null,
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
      matchRecap: (state.setHistory || []).slice(-5).reverse().map(entry => ({ ...entry, outcomeLabel: entry.winnerLabel ? `${entry.winnerLabel} claimed the set` : 'Set tied and carried no point' })),
      hasMatchRecap: (state.setHistory || []).length > 0,
      hasSetHistory: (state.setHistory || []).length > 0,
      winnerSeat,
      winnerLabel: winnerSeat?.displayName || null
    };
  }
}
