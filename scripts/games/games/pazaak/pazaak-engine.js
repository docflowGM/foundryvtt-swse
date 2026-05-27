import { GameSessionStore } from '../../game-session-store.js';
import { GameNotificationService } from '../../game-notification-service.js';
import { getGameSettingsSnapshot } from '../../game-settings.js';
import { GameCreditEscrowService } from '../../wagers/game-credit-escrow-service.js';
import { GameOpponentProfileService } from '../../game-opponent-profile-service.js';
import { HolonetSocketService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-socket-service.js';
import {
  buildDefaultPazaakSideDeckIds,
  buildOpeningHand,
  buildPazaakMainDeck,
  drawMainCard,
  PAZAAK_HAND_SIZE,
  PAZAAK_SETS_TO_WIN,
  PAZAAK_SIDE_DECK_SIZE,
  PAZAAK_TARGET,
  PAZAAK_TABLE_LIMIT,
  validateSideDeck
} from './pazaak-deck.js';
import {
  applyPazaakSideCard,
  comparePazaakSet,
  hasFilledPazaakTable,
  isPazaakTwenty,
  scorePazaakPlayer
} from './pazaak-rules.js';
import { PazaakAi, buildPazaakAiProfile } from './pazaak-ai.js';
import { randomPazaakDialogue } from './pazaak-ai-personalities.js';

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? null));
}

function randomId(prefix = 'pz') {
  return `${prefix}_${globalThis.foundry?.utils?.randomID?.(8) || Math.random().toString(36).slice(2, 10)}`;
}

function now() {
  return Date.now();
}

function currentUserId() {
  return game?.user?.id ?? null;
}

function actorDisplay(actor) {
  return actor?.name || game?.user?.name || 'Player';
}

function actorImg(actor) {
  return actor?.img || 'icons/svg/mystery-man.svg';
}

function participantIdForActor(actor) {
  if (game?.user?.isGM) return `gm:${game.user.id}`;
  return `player:${game?.user?.id ?? 'unknown'}`;
}

function isAutomatedSeat(seat = {}) {
  return seat.type === 'ai' || seat.type === 'npc' || seat.aiProfile;
}

function playableSeats(seats = []) {
  return (Array.isArray(seats) ? seats : []).filter(seat => !seat.spectator && seat.status !== 'declined' && seat.status !== 'cancelled');
}

function buildPlayerStateForSeat(seat = {}) {
  const automated = isAutomatedSeat(seat);
  const aiProfile = buildPazaakAiProfile(seat.aiProfile || seat.ai || 'medium');
  const sideDeckIds = automated ? buildDefaultPazaakSideDeckIds(aiProfile.personality || aiProfile.difficulty || 'balanced') : [];
  return {
    seatId: seat.seatId,
    sideDeckIds,
    sideDeckLocked: automated,
    hand: [],
    tableCards: [],
    stood: false,
    bust: false,
    filledTable: false,
    setsWon: 0,
    score: 0,
    sideCardPlayedThisTurn: false,
    tiebreakerUsed: false,
    lastAction: automated ? 'AI side deck loaded.' : 'Awaiting side deck.'
  };
}

function buildSetupState(session = {}) {
  const seats = playableSeats(session.seats);
  const players = {};
  for (const seat of seats) players[seat.seatId] = buildPlayerStateForSeat(seat);
  return {
    engine: 'pazaak',
    version: 1,
    phase: 'setup',
    statusLabel: 'SIDE DECK SETUP',
    target: PAZAAK_TARGET,
    setsToWin: PAZAAK_SETS_TO_WIN,
    sideDeckSize: PAZAAK_SIDE_DECK_SIZE,
    openingHandSize: PAZAAK_HAND_SIZE,
    tableLimit: PAZAAK_TABLE_LIMIT,
    setNumber: 0,
    firstSeatId: seats[0]?.seatId ?? null,
    activeSeatId: null,
    mainDeck: [],
    discard: [],
    players,
    setHistory: [],
    winnerSeatId: null,
    message: 'Build and lock a 10-card side deck before the match begins.'
  };
}

function ensurePazaakState(session = {}) {
  const existing = session.gameState?.engine === 'pazaak' ? clone(session.gameState) : buildSetupState(session);
  const seats = playableSeats(session.seats);
  existing.players ??= {};
  for (const seat of seats) {
    existing.players[seat.seatId] ??= buildPlayerStateForSeat(seat);
    existing.players[seat.seatId].seatId = seat.seatId;
    if (isAutomatedSeat(seat) && !existing.players[seat.seatId].sideDeckLocked) {
      existing.players[seat.seatId].sideDeckIds = buildDefaultPazaakSideDeckIds(buildPazaakAiProfile(seat.aiProfile || seat.ai || 'medium').personality || 'balanced');
      existing.players[seat.seatId].sideDeckLocked = true;
    }
  }
  return existing;
}

function allDecksLocked(session, state) {
  return playableSeats(session.seats).every(seat => state.players?.[seat.seatId]?.sideDeckLocked);
}

function getPlayerOrder(session = {}) {
  return playableSeats(session.seats).map(seat => seat.seatId).filter(Boolean);
}

function findSeat(session, seatId) {
  return playableSeats(session.seats).find(seat => seat.seatId === seatId) ?? null;
}

function updateScores(state) {
  for (const player of Object.values(state.players ?? {})) player.score = scorePazaakPlayer(player);
  return state;
}

function resetPlayersForSet(session, state) {
  for (const seat of playableSeats(session.seats)) {
    const player = state.players[seat.seatId];
    player.hand = buildOpeningHand(player.sideDeckIds);
    player.tableCards = [];
    player.stood = false;
    player.bust = false;
    player.filledTable = false;
    player.score = 0;
    player.sideCardPlayedThisTurn = false;
    player.tiebreakerUsed = false;
    player.lastAction = `Drew ${PAZAAK_HAND_SIZE} random side-deck cards.`;
  }
}

function beginTurn(session, state, seatId) {
  const player = state.players?.[seatId];
  if (!player || player.stood || player.bust) return state;
  const drawn = drawMainCard(state.mainDeck);
  state.mainDeck = drawn.mainDeck;
  state.discard = Array.isArray(state.discard) ? state.discard : [];
  player.tableCards = Array.isArray(player.tableCards) ? player.tableCards : [];
  player.tableCards.push(drawn.card);
  player.sideCardPlayedThisTurn = false;
  player.score = scorePazaakPlayer(player);
  player.lastAction = `Drew ${drawn.card?.label || drawn.card?.value || 'a card'}.`;
  if (isPazaakTwenty(player)) {
    player.stood = true;
    player.lastAction = 'Reached 20 and stood automatically.';
  }
  if (hasFilledPazaakTable(player)) {
    player.stood = true;
    player.filledTable = true;
    player.lastAction = 'Filled the table without busting.';
  }
  updateScores(state);
  maybeResolveSet(session, state);
  return state;
}

function startNextSet(session, state, firstSeatId = null) {
  state.phase = 'playing';
  state.statusLabel = 'PLAYING';
  state.setNumber = Number(state.setNumber || 0) + 1;
  state.mainDeck = buildPazaakMainDeck();
  state.discard = [];
  resetPlayersForSet(session, state);
  const order = getPlayerOrder(session);
  const chosenFirst = firstSeatId && order.includes(firstSeatId) ? firstSeatId : (state.firstSeatId && order.includes(state.firstSeatId) ? state.firstSeatId : order[0]);
  state.firstSeatId = chosenFirst;
  state.activeSeatId = chosenFirst;
  state.message = `Set ${state.setNumber}: ${seatLabel(session, chosenFirst)} draws first.`;
  beginTurn(session, state, chosenFirst);
  const firstPlayer = state.players?.[chosenFirst];
  if (state.phase === 'playing' && firstPlayer && (firstPlayer.stood || firstPlayer.filledTable || firstPlayer.bust)) advanceTurn(session, state, chosenFirst);
  processAutomatedTurns(session, state);
  return state;
}

function seatLabel(session, seatId) {
  return findSeat(session, seatId)?.displayName || 'Unknown Seat';
}

function nextSeatId(session, state, afterSeatId) {
  const order = getPlayerOrder(session);
  if (!order.length) return null;
  const start = Math.max(0, order.indexOf(afterSeatId));
  for (let offset = 1; offset <= order.length; offset += 1) {
    const candidate = order[(start + offset) % order.length];
    const player = state.players?.[candidate];
    if (player && !player.stood && !player.bust) return candidate;
  }
  return null;
}

function allPlayersDone(session, state) {
  return getPlayerOrder(session).every(seatId => {
    const player = state.players?.[seatId];
    return !player || player.stood || player.bust || player.filledTable;
  });
}

function chooseNextFirstSeat(session, state, winnerSeatId, tied) {
  const order = getPlayerOrder(session);
  if (!order.length) return null;
  if (winnerSeatId && order.includes(winnerSeatId)) return winnerSeatId;
  if (tied && state.firstSeatId && order.length > 1) {
    const index = order.indexOf(state.firstSeatId);
    return order[(index + 1) % order.length];
  }
  return state.firstSeatId || order[0];
}

function maybeResolveSet(session, state) {
  updateScores(state);
  const players = getPlayerOrder(session).map(seatId => state.players[seatId]).filter(Boolean);
  const immediateFill = players.find(player => player.filledTable && !player.bust);
  if (!immediateFill && !allPlayersDone(session, state)) return false;

  const result = immediateFill
    ? { winnerSeatId: immediateFill.seatId, tied: false, reason: 'Filled the table.' }
    : comparePazaakSet(players);

  state.setHistory = Array.isArray(state.setHistory) ? state.setHistory : [];
  state.setHistory.push({
    id: randomId('set'),
    setNumber: state.setNumber,
    winnerSeatId: result.winnerSeatId,
    winnerLabel: result.winnerSeatId ? seatLabel(session, result.winnerSeatId) : null,
    tied: Boolean(result.tied),
    reason: result.reason,
    scores: players.map(player => ({ seatId: player.seatId, score: scorePazaakPlayer(player), bust: Boolean(player.bust) })),
    at: now()
  });

  if (result.winnerSeatId && state.players[result.winnerSeatId]) {
    state.players[result.winnerSeatId].setsWon = Number(state.players[result.winnerSeatId].setsWon || 0) + 1;
    const winnerSeat = findSeat(session, result.winnerSeatId);
    if (isAutomatedSeat(winnerSeat)) {
      const profile = buildPazaakAiProfile(winnerSeat?.aiProfile || winnerSeat?.ai || 'medium');
      state.players[result.winnerSeatId].lastAction = randomPazaakDialogue(profile.personality, 'winRound', state.players[result.winnerSeatId].lastAction || 'Won the set.');
    }
  }
  for (const player of players) {
    if (player.seatId === result.winnerSeatId) continue;
    const loserSeat = findSeat(session, player.seatId);
    if (isAutomatedSeat(loserSeat)) {
      const profile = buildPazaakAiProfile(loserSeat?.aiProfile || loserSeat?.ai || 'medium');
      state.players[player.seatId].lastAction = randomPazaakDialogue(profile.personality, 'loseRound', state.players[player.seatId].lastAction || 'Lost the set.');
    }
  }

  const matchWinner = Object.values(state.players).find(player => Number(player.setsWon || 0) >= PAZAAK_SETS_TO_WIN);
  if (matchWinner) {
    state.phase = 'complete';
    state.statusLabel = 'MATCH COMPLETE';
    state.activeSeatId = null;
    state.winnerSeatId = matchWinner.seatId;
    const winnerSeat = findSeat(session, matchWinner.seatId);
    if (isAutomatedSeat(winnerSeat)) {
      const profile = buildPazaakAiProfile(winnerSeat?.aiProfile || winnerSeat?.ai || 'medium');
      state.players[matchWinner.seatId].lastAction = randomPazaakDialogue(profile.personality, 'winMatch', state.players[matchWinner.seatId].lastAction || 'Won the match.');
    }
    state.message = `${seatLabel(session, matchWinner.seatId)} wins the match.`;
    return true;
  }

  const nextFirst = chooseNextFirstSeat(session, state, result.winnerSeatId, result.tied);
  state.message = result.winnerSeatId
    ? `${seatLabel(session, result.winnerSeatId)} wins set ${state.setNumber} (${result.reason}) and starts the next set.`
    : `Set ${state.setNumber} tied. ${seatLabel(session, nextFirst)} starts the next set.`;
  startNextSet(session, state, nextFirst);
  return true;
}

function advanceTurn(session, state, fromSeatId) {
  if (state.phase !== 'playing') return state;
  if (maybeResolveSet(session, state)) return state;
  const nextId = nextSeatId(session, state, fromSeatId);
  if (!nextId) {
    maybeResolveSet(session, state);
    return state;
  }
  state.activeSeatId = nextId;
  beginTurn(session, state, nextId);
  const nextPlayer = state.players?.[nextId];
  if (state.phase === 'playing' && nextPlayer && (nextPlayer.stood || nextPlayer.filledTable || nextPlayer.bust)) return advanceTurn(session, state, nextId);
  return state;
}

function processAutomatedTurns(session, state) {
  let guard = 0;
  while (state.phase === 'playing' && state.activeSeatId && guard < 30) {
    guard += 1;
    const seat = findSeat(session, state.activeSeatId);
    if (!isAutomatedSeat(seat)) break;
    const player = state.players[state.activeSeatId];
    if (!player || player.stood || player.bust) {
      advanceTurn(session, state, state.activeSeatId);
      continue;
    }
    const profile = buildPazaakAiProfile(seat?.aiProfile || seat?.ai || 'medium');
    const choice = PazaakAi.chooseTurn(player, profile, { nextMainCard: Array.isArray(state.mainDeck) ? state.mainDeck[0] : null, state, session });
    if (choice.type === 'play-side-card') {
      const result = applyPazaakSideCard(player, choice.cardInstanceId, choice.choice || {});
      if (result.ok) {
        state.players[player.seatId] = result.player;
        const playedType = Number(result.playedCard?.value || 0) < 0 ? 'playsNegativeCard' : (Number(result.playedCard?.value || 0) > 0 ? 'playsPositiveCard' : 'playsCard');
        state.players[player.seatId].lastAction = randomPazaakDialogue(profile.personality, playedType, `Played ${result.playedCard?.label || 'a side card'}.`);
        continue;
      }
    }
    if (choice.type === 'stand') {
      player.stood = true;
      player.lastAction = choice.forceIntuition?.line || randomPazaakDialogue(profile.personality, 'stand', 'Stood.');
      player.score = scorePazaakPlayer(player);
      advanceTurn(session, state, player.seatId);
      continue;
    }
    player.score = scorePazaakPlayer(player);
    if (player.score > PAZAAK_TARGET) {
      player.bust = true;
      player.lastAction = randomPazaakDialogue(profile.personality, 'busts', 'Busted.');
    } else if (player.score === PAZAAK_TARGET) {
      player.stood = true;
      player.lastAction = randomPazaakDialogue(profile.personality, 'hits20', 'Reached 20 and stood.');
    } else {
      player.lastAction = choice.forceIntuition?.line || randomPazaakDialogue(profile.personality, 'drawsCard', 'Ended turn.');
    }
    advanceTurn(session, state, player.seatId);
  }
  return state;
}

function sessionLogEntry(type, by, extra = {}) {
  return { id: randomId('log'), at: now(), type, by, ...extra };
}

export class PazaakEngine {
  static isPazaakSession(session = {}) {
    return session?.gameId === 'pazaak';
  }

  static getState(session = {}) {
    return ensurePazaakState(session);
  }

  static findSeatForActor(session = {}, actor = null, participantId = null) {
    const userId = currentUserId();
    const preferredParticipantId = participantId || participantIdForActor(actor);
    return playableSeats(session.seats).find(seat => {
      if (preferredParticipantId && seat.recipientId === preferredParticipantId) return true;
      if (actor?.id && seat.actorId === actor.id) return true;
      if (userId && seat.userId === userId) return true;
      return false;
    }) ?? null;
  }

  static async createSoloAiSession({ actor, actorId = null, title = '', sessionId = null, requesterId = null, rulesMode = 'republic-senate', creditBuyIn = 0 } = {}) {
    const resolvedActor = actor || (actorId ? game.actors?.get?.(actorId) : null);
    const resolvedSessionId = sessionId || `game_${globalThis.foundry?.utils?.randomID?.(12) || Math.random().toString(36).slice(2, 14)}`;
    if (!game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('create-solo-pazaak', { actorId: resolvedActor?.id ?? actorId ?? null, title, sessionId: resolvedSessionId, rulesMode, creditBuyIn });
      return { pending: true, requestId, sessionId: resolvedSessionId };
    }
    actor = resolvedActor;
    actorId = actor?.id ?? actorId ?? null;
    const requester = requesterId ? game.users?.get?.(requesterId) : game?.user;
    const userId = requesterId || currentUserId();
    const hostRecipientId = requester?.isGM ? `gm:${userId}` : `player:${userId}`;
    const settings = getGameSettingsSnapshot();
    const normalizedBuyIn = Number(creditBuyIn || 0) || 0;
    const safeRulesMode = rulesMode === 'wagered' && settings.allowWagers && settings.allowCreditWagers && normalizedBuyIn > 0 ? 'wagered' : 'republic-senate';
    const wagerProfile = safeRulesMode === 'wagered'
      ? GameCreditEscrowService.buildCreditWagerProfile({ buyIn: Math.min(normalizedBuyIn, Number(settings.maxCreditWager || 0) || normalizedBuyIn), houseStake: Math.min(normalizedBuyIn, Number(settings.maxCreditWager || 0) || normalizedBuyIn) })
      : { mode: 'none' };
    const hostSeat = {
      seatId: 'seat_host',
      type: requester?.isGM ? 'gm' : 'player',
      userId,
      actorId,
      recipientId: hostRecipientId,
      displayName: actorDisplay(actor),
      avatar: actorImg(actor),
      status: 'host'
    };
    const requestedFairness = settings.defaultAiFairness || 'fair';
    const safeFairness = requestedFairness === 'cheating' && (!settings.allowCheatingAi || settings.requireGmApprovalForCheatingAi)
      ? 'fair'
      : (requestedFairness === 'houseEdge' && !settings.allowHouseEdgeAi ? 'fair' : requestedFairness);
    const generatedOpponent = await GameOpponentProfileService.buildPazaakAiOpponentProfile({
      difficulty: settings.defaultAiDifficulty || 'medium',
      fairness: safeFairness,
      personality: settings.defaultAiPersonality || 'random'
    });
    const aiProfile = buildPazaakAiProfile(generatedOpponent);
    const aiSeat = {
      seatId: 'seat_ai',
      type: 'ai',
      userId: null,
      actorId: null,
      recipientId: null,
      displayName: aiProfile.name || 'Dealer Droid RX-44',
      avatar: aiProfile.kind === 'living' ? 'icons/svg/mystery-man.svg' : 'icons/commodities/tech/cog-bronze.webp',
      status: 'accepted',
      profession: aiProfile.profession || '',
      tableFact: aiProfile.tableFact || '',
      aiProfile,
      aiDifficulty: aiProfile.difficulty,
      aiFairness: aiProfile.fairness,
      aiPersonality: aiProfile.personality
    };
    const shell = {
      id: resolvedSessionId,
      gameId: 'pazaak',
      title: title || `${actorDisplay(actor)} vs Dealer Droid`,
      status: 'active',
      authorityMode: safeRulesMode === 'wagered' ? 'gm' : 'host',
      hostUserId: userId,
      hostActorId: actorId,
      holonetThreadId: null,
      holonetMessageId: null,
      seats: [hostSeat, aiSeat],
      rulesMode: safeRulesMode,
      wagerProfile,
      prizeProfile: { enabled: false },
      escrow: {},
      metadata: { createdBy: hostRecipientId, mode: 'solo-ai', creditWagerRequested: safeRulesMode === 'wagered', aiProfile },
      log: [sessionLogEntry('solo-ai-created', hostRecipientId)]
    };
    shell.gameState = ensurePazaakState(shell);
    let updated = null;
    if (GameCreditEscrowService.isCreditWager(shell)) {
      const escrowed = await GameCreditEscrowService.prepareEscrow(shell, { by: hostRecipientId });
      updated = escrowed.session || shell;
    } else {
      updated = await GameSessionStore.upsertSession(shell);
    }
    GameNotificationService.emitSessionUpdated(updated, { pazaakPhase: updated.gameState?.phase, action: 'create-solo-pazaak' });
    return updated;
  }

  static async lockSideDeck({ sessionId, seatId, cardIds = [], actor = null, actorId = null, participantId = null } = {}) {
    const resolvedActor = actor || (actorId ? game.actors?.get?.(actorId) : null);
    if (!game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('lock-pazaak-side-deck', { sessionId, seatId, cardIds, actorId: resolvedActor?.id ?? actorId ?? null, participantId });
      return { pending: true, requestId, sessionId };
    }
    actor = resolvedActor;
    const session = GameSessionStore.getSession(sessionId);
    if (!session || session.gameId !== 'pazaak') return { ok: false, error: 'Pazaak session not found.' };
    const seat = seatId ? findSeat(session, seatId) : this.findSeatForActor(session, actor, participantId);
    if (!seat) return { ok: false, error: 'No matching seat found for this actor.' };
    if (isAutomatedSeat(seat)) return { ok: false, error: 'Automated seats choose their own side deck.' };
    const validation = validateSideDeck(cardIds);
    if (!validation.valid) return { ok: false, error: validation.errors.join(' ') };

    if (GameCreditEscrowService.isCreditWager(session) && session.escrow?.credits?.status !== 'escrowed') {
      return { ok: false, error: session.escrow?.credits?.error || 'Credit buy-in escrow must complete before side decks can lock.' };
    }

    const state = ensurePazaakState(session);
    state.players[seat.seatId] ??= buildPlayerStateForSeat(seat);
    state.players[seat.seatId].sideDeckIds = validation.cardIds;
    state.players[seat.seatId].sideDeckLocked = true;
    state.players[seat.seatId].lastAction = 'Side deck locked.';
    state.message = `${seat.displayName} locked a legal ${PAZAAK_SIDE_DECK_SIZE}-card side deck.`;

    if (allDecksLocked(session, state)) startNextSet(session, state, state.firstSeatId);
    const updated = await GameSessionStore.upsertSession({
      ...session,
      status: 'active',
      gameState: state,
      log: [...(session.log ?? []), sessionLogEntry('pazaak-side-deck-locked', seat.recipientId || seat.seatId, { seatId: seat.seatId })]
    });
    GameNotificationService.emitSessionUpdated(updated, { pazaakPhase: updated.gameState?.phase, action: 'lock-pazaak-side-deck' });
    return { ok: true, session: updated };
  }

  static async submitAction({ sessionId, seatId, action, payload = {}, actorId = null } = {}) {
    if (!game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('pazaak-action', { sessionId, seatId, action, payload, actorId });
      return { pending: true, requestId, sessionId };
    }
    const session = GameSessionStore.getSession(sessionId);
    if (!session || session.gameId !== 'pazaak') return { ok: false, error: 'Pazaak session not found.' };
    const seat = findSeat(session, seatId);
    if (!seat) return { ok: false, error: 'Seat not found.' };
    const state = ensurePazaakState(session);
    if (state.phase !== 'playing') return { ok: false, error: 'The Pazaak match is not in play.' };
    if (state.activeSeatId !== seat.seatId) return { ok: false, error: 'It is not this seat\'s turn.' };
    const player = state.players[seat.seatId];
    if (!player) return { ok: false, error: 'Player state missing.' };

    if (action === 'play-side-card') {
      const result = applyPazaakSideCard(player, String(payload.cardInstanceId || ''), payload.choice || {});
      if (!result.ok) return { ok: false, error: result.error };
      state.players[seat.seatId] = result.player;
      state.players[seat.seatId].lastAction = `Played ${result.playedCard?.label || 'a side card'}.`;
      if (state.players[seat.seatId].stood || state.players[seat.seatId].filledTable || state.players[seat.seatId].bust) advanceTurn(session, state, seat.seatId);
      else maybeResolveSet(session, state);
    } else if (action === 'stand') {
      player.stood = true;
      player.score = scorePazaakPlayer(player);
      player.lastAction = choice.forceIntuition?.line || randomPazaakDialogue(profile.personality, 'stand', 'Stood.');
      advanceTurn(session, state, seat.seatId);
    } else if (action === 'end-turn') {
      player.score = scorePazaakPlayer(player);
      if (player.score > PAZAAK_TARGET) {
        player.bust = true;
        player.lastAction = randomPazaakDialogue(profile.personality, 'busts', 'Busted.');
      } else if (player.score === PAZAAK_TARGET) {
        player.stood = true;
        player.lastAction = randomPazaakDialogue(profile.personality, 'hits20', 'Reached 20 and stood.');
      } else if (hasFilledPazaakTable(player)) {
        player.filledTable = true;
        player.stood = true;
        player.lastAction = 'Filled the table.';
      } else {
        player.lastAction = choice.forceIntuition?.line || randomPazaakDialogue(profile.personality, 'drawsCard', 'Ended turn.');
      }
      advanceTurn(session, state, seat.seatId);
    } else {
      return { ok: false, error: 'Unknown Pazaak action.' };
    }

    processAutomatedTurns(session, state);
    const updatedStatus = state.phase === 'complete' ? 'complete' : 'active';
    let updated = await GameSessionStore.upsertSession({
      ...session,
      status: updatedStatus,
      gameState: state,
      log: [...(session.log ?? []), sessionLogEntry(`pazaak-${action}`, seat.recipientId || seat.seatId, { seatId: seat.seatId })]
    });
    if (updatedStatus === 'complete' && GameCreditEscrowService.isCreditWager(updated)) {
      const settled = await GameCreditEscrowService.settleSession(updated, {
        winnerSeatId: state.winnerSeatId,
        reason: `${seatLabel(updated, state.winnerSeatId)} wins ${updated.title || 'Pazaak'}`
      });
      updated = settled.session || updated;
    }
    GameNotificationService.emitSessionUpdated(updated, { pazaakPhase: updated.gameState?.phase, action: `pazaak-${action}` });
    return { ok: true, session: updated };
  }
}
