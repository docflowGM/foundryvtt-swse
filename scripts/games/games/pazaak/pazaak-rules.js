import { getPazaakSideCard, PAZAAK_TABLE_LIMIT, PAZAAK_TARGET } from './pazaak-deck.js';

function clone(value) {
  if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
  return JSON.parse(JSON.stringify(value ?? null));
}

function randomId(prefix = 'pzplay') {
  return `${prefix}_${globalThis.foundry?.utils?.randomID?.(8) || Math.random().toString(36).slice(2, 10)}`;
}

export function scorePazaakPlayer(player = {}) {
  return (Array.isArray(player.tableCards) ? player.tableCards : [])
    .reduce((sum, card) => sum + (Number(card.value) || 0), 0);
}

export function isPazaakBust(player = {}) {
  return scorePazaakPlayer(player) > PAZAAK_TARGET;
}

export function isPazaakTwenty(player = {}) {
  return scorePazaakPlayer(player) === PAZAAK_TARGET;
}

export function hasFilledPazaakTable(player = {}) {
  const cards = Array.isArray(player.tableCards) ? player.tableCards : [];
  return cards.length >= PAZAAK_TABLE_LIMIT && scorePazaakPlayer(player) <= PAZAAK_TARGET;
}

export function playableSideCardStatus(player = {}, sideCard = {}, choice = {}) {
  if (!sideCard?.instanceId) return { playable: false, reason: 'Missing side card.' };
  const tableCards = Array.isArray(player.tableCards) ? player.tableCards : [];
  if (player.stood || player.bust || player.filledTable) return { playable: false, reason: 'You have already stood, filled the table, or busted.' };
  if (tableCards.length >= PAZAAK_TABLE_LIMIT) return { playable: false, reason: 'Your Pazaak table is already full.' };
  if (player.sideCardPlayedThisTurn) return { playable: false, reason: 'Only one side card can be played each turn.' };
  if (sideCard.type === 'tiebreaker' && player.tiebreakerUsed) return { playable: false, reason: 'Only one tiebreaker can be used in a set.' };
  if (sideCard.type === 'double' && !tableCards.length) return { playable: false, reason: 'Double requires a card in play.' };
  if ((sideCard.type === 'plusMinus' || sideCard.type === 'tiebreaker') && !['plus', 'minus'].includes(choice.sign)) {
    return { playable: false, reason: 'Choose + or - before playing this card.' };
  }
  if (sideCard.type === 'flip') {
    const values = new Set((Array.isArray(sideCard.values) ? sideCard.values : []).map(value => Math.abs(Number(value) || 0)));
    const hasTarget = tableCards.some(card => Number(card.value || 0) > 0 && values.has(Math.abs(Number(card.value || 0))));
    if (!hasTarget) return { playable: false, reason: 'Flip requires a matching positive table card.' };
  }
  if (sideCard.type === 'plusMinusRange') {
    const value = Number(choice.value || 0);
    if (!['plus', 'minus'].includes(choice.sign) || ![1, 2].includes(value)) {
      return { playable: false, reason: 'Choose +1, -1, +2, or -2 before playing this card.' };
    }
  }
  return { playable: true, reason: '' };
}

function buildSidePlayCard(sideCard = {}, choice = {}) {
  const catalog = getPazaakSideCard(sideCard.catalogId || sideCard.id) || sideCard;
  const played = {
    ...clone(catalog),
    instanceId: randomId('played'),
    source: 'side',
    catalogId: sideCard.catalogId || sideCard.id,
    playedFromInstanceId: sideCard.instanceId,
    value: 0,
    baseValue: 0,
    effect: null,
    tiebreaker: false
  };

  if (catalog.type === 'plus') {
    played.value = Number(catalog.value || 0);
    played.baseValue = played.value;
  } else if (catalog.type === 'minus') {
    played.value = -Number(catalog.value || 0);
    played.baseValue = played.value;
  } else if (catalog.type === 'plusMinus') {
    const magnitude = Number(catalog.value || 0);
    played.value = choice.sign === 'minus' ? -magnitude : magnitude;
    played.baseValue = played.value;
    played.label = `${played.value >= 0 ? '+' : ''}${played.value}`;
    played.shortLabel = played.label;
  } else if (catalog.type === 'plusMinusRange') {
    const magnitude = [1, 2].includes(Number(choice.value || 0)) ? Number(choice.value) : 1;
    played.value = choice.sign === 'minus' ? -magnitude : magnitude;
    played.baseValue = played.value;
    played.label = `${played.value >= 0 ? '+' : ''}${played.value}`;
    played.shortLabel = played.label;
  } else if (catalog.type === 'tiebreaker') {
    const magnitude = Number(catalog.value || 1);
    played.value = choice.sign === 'minus' ? -magnitude : magnitude;
    played.baseValue = played.value;
    played.label = `TB ${played.value >= 0 ? '+' : ''}${played.value}`;
    played.shortLabel = 'TB';
    played.tiebreaker = true;
  } else if (catalog.type === 'flip') {
    played.effect = { type: 'flip', values: Array.isArray(catalog.values) ? catalog.values.map(Number) : [] };
    played.value = 0;
  } else if (catalog.type === 'double') {
    played.effect = { type: 'double' };
    played.value = 0;
  }

  return played;
}

function applySideEffect(player, playedCard) {
  if (!playedCard?.effect) return;
  if (playedCard.effect.type === 'flip') {
    const values = new Set((playedCard.effect.values || []).map(value => Math.abs(Number(value) || 0)));
    player.tableCards = (player.tableCards || []).map(card => {
      const value = Number(card.value || 0);
      if (value > 0 && values.has(Math.abs(value))) {
        return {
          ...card,
          value: -value,
          label: `${card.label || value}↧`,
          flippedBy: playedCard.instanceId
        };
      }
      return card;
    });
  }

  if (playedCard.effect.type === 'double') {
    const table = player.tableCards || [];
    const lastIndex = table.length - 1;
    if (lastIndex >= 0) {
      const last = table[lastIndex];
      const value = Number(last.value || 0);
      table[lastIndex] = {
        ...last,
        value: value * 2,
        label: `${last.label || value}×2`,
        doubledBy: playedCard.instanceId
      };
      player.tableCards = table;
    }
  }
}

export function applyPazaakSideCard(player = {}, sideCardInstanceId = '', choice = {}) {
  const next = clone(player) || {};
  const hand = Array.isArray(next.hand) ? next.hand.slice() : [];
  const index = hand.findIndex(card => card.instanceId === sideCardInstanceId);
  if (index < 0) return { ok: false, player: next, error: 'Side card not found in hand.' };
  const sideCard = hand[index];
  const status = playableSideCardStatus(next, sideCard, choice);
  if (!status.playable) return { ok: false, player: next, error: status.reason };

  hand.splice(index, 1);
  next.hand = hand;
  next.tableCards = Array.isArray(next.tableCards) ? next.tableCards.slice() : [];
  const played = buildSidePlayCard(sideCard, choice);
  applySideEffect(next, played);
  next.tableCards.push(played);
  next.sideCardPlayedThisTurn = true;
  if (played.tiebreaker) next.tiebreakerUsed = true;
  next.score = scorePazaakPlayer(next);
  if (isPazaakTwenty(next)) next.stood = true;
  if (hasFilledPazaakTable(next)) next.filledTable = true;
  return { ok: true, player: next, playedCard: played };
}

export function comparePazaakSet(players = []) {
  const active = players.filter(Boolean);
  if (!active.length) return { winnerSeatId: null, tied: true, reason: 'No players.' };
  const filled = active.filter(player => hasFilledPazaakTable(player));
  if (filled.length === 1) return { winnerSeatId: filled[0].seatId, tied: false, reason: 'Filled the table.' };

  const safe = active.filter(player => !player.bust && scorePazaakPlayer(player) <= PAZAAK_TARGET);
  if (!safe.length) return { winnerSeatId: null, tied: true, reason: 'All players busted.' };
  if (safe.length === 1) return { winnerSeatId: safe[0].seatId, tied: false, reason: 'Opponent busted.' };

  const scored = safe.map(player => ({ player, score: scorePazaakPlayer(player) })).sort((a, b) => b.score - a.score);
  if (scored[0].score > scored[1].score) return { winnerSeatId: scored[0].player.seatId, tied: false, reason: `Closest to ${PAZAAK_TARGET}.` };

  const tiedScore = scored[0].score;
  const tied = scored.filter(entry => entry.score === tiedScore).map(entry => entry.player);
  const tiebreakers = tied.filter(player => player.tiebreakerUsed);
  if (tiebreakers.length === 1) return { winnerSeatId: tiebreakers[0].seatId, tied: false, reason: 'Tiebreaker card.' };
  if (tiebreakers.length > 1) {
    const ranked = tiebreakers
      .map(player => ({ player, playedAt: Number(player.tiebreakerPlayedAt || 0) }))
      .sort((a, b) => b.playedAt - a.playedAt);
    if (ranked[0].playedAt > ranked[1].playedAt) return { winnerSeatId: ranked[0].player.seatId, tied: false, reason: 'Last tiebreaker card.' };
  }
  return { winnerSeatId: null, tied: true, reason: 'Set tied.' };
}
