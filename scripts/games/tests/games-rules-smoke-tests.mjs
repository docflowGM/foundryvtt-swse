/**
 * Lightweight rules smoke tests for Holopad Games.
 *
 * Run from the system root with:
 *   node scripts/games/tests/games-rules-smoke-tests.mjs
 *
 * These tests avoid Foundry documents and exercise pure rule/deck utilities only.
 */

import assert from 'node:assert/strict';

import { buildPazaakMainDeck, PAZAAK_TARGET, validateSideDeck } from '../games/pazaak/pazaak-deck.js';
import { comparePazaakSet, playableSideCardStatus, scorePazaakPlayer, hasFilledPazaakTable } from '../games/pazaak/pazaak-rules.js';
import { buildSabaccDeck, buildSabaccSylopCard, buildSabaccNumberCard, SABACC_SUITS } from '../games/sabacc/sabacc-deck.js';
import { compareSabaccHands, evaluateSabaccHand, isIdiotsArray } from '../games/sabacc/sabacc-rules.js';
import { SabaccAi } from '../games/sabacc/sabacc-ai.js';
import { buildDejarikBoard } from '../games/dejarik/dejarik-board.js';
import { canAttackPiece, canMovePiece } from '../games/dejarik/dejarik-rules.js';
import { evaluateHintaroRoll, rollHintaroRegularDice, HINTARO_SYMBOLS } from '../games/hintaro/hintaro-rules.js';

function testPazaak() {
  const deck = buildPazaakMainDeck();
  assert.equal(deck.length, 40, 'Pazaak main deck should contain four each of 1-10');
  const player = { tableCards: [{ value: 10 }, { value: 5 }, { value: 5 }], hand: [] };
  assert.equal(scorePazaakPlayer(player), PAZAAK_TARGET, 'Pazaak score should total table cards');
  assert.equal(hasFilledPazaakTable({ tableCards: Array.from({ length: 9 }, () => ({ value: 1 })) }), true, 'Pazaak filled table should be detected');

  const legalDeck = ['plus-1', 'plus-2', 'plus-3', 'plus-4', 'plus-5', 'plus-6', 'minus-1', 'minus-2', 'minus-3', 'minus-4'];
  assert.equal(validateSideDeck(legalDeck).valid, true, 'Pazaak side deck should accept exactly 10 unique legal cards');
  assert.equal(validateSideDeck([...legalDeck.slice(0, 9), 'plus-1']).valid, false, 'Pazaak side deck should reject duplicate cards');

  const choiceCard = { instanceId: 'side_1', type: 'plusMinus', value: 4 };
  assert.equal(playableSideCardStatus({ tableCards: [{ value: 10 }] }, choiceCard, {}).playable, false, 'Pazaak +/- cards require a sign choice');

  const tiedWithBreaker = comparePazaakSet([
    { seatId: 'a', tableCards: [{ value: 10 }, { value: 8 }], tiebreakerUsed: true },
    { seatId: 'b', tableCards: [{ value: 9 }, { value: 9 }] }
  ]);
  assert.equal(tiedWithBreaker.winnerSeatId, 'a', 'Pazaak tiebreaker should win tied safe scores');
}

function testSabacc() {
  const deck = buildSabaccDeck();
  assert.equal(deck.length, 62, 'Galaxy/Corellian Spike Sabacc deck should contain 62 cards');
  const pure = evaluateSabaccHand([buildSabaccSylopCard(0), buildSabaccSylopCard(1)]);
  assert.equal(pure.handType, 'pure-sabacc', 'Two Sylops should evaluate as Pure Sabacc');
  const suit = SABACC_SUITS[0];
  const paired = evaluateSabaccHand([buildSabaccNumberCard(suit, 5), buildSabaccNumberCard(suit, -5)]);
  assert.equal(paired.total, 0, 'Paired positive/negative cards should total zero');
  const result = compareSabaccHands([
    { seatId: 'a', cards: [buildSabaccNumberCard(suit, 1), buildSabaccNumberCard(suit, -1)] },
    { seatId: 'b', cards: [buildSabaccNumberCard(suit, 3), buildSabaccNumberCard(suit, 2)] }
  ]);
  assert.equal(result.winnerSeatId, 'a', 'Zero Sabacc hand should beat Nulrhek');

  const positiveTie = compareSabaccHands([
    { seatId: 'positive', cards: [buildSabaccNumberCard(suit, 3), buildSabaccNumberCard(suit, -2)] },
    { seatId: 'negative', cards: [buildSabaccNumberCard(suit, -3), buildSabaccNumberCard(suit, 2)] }
  ]);
  assert.equal(positiveTie.winnerSeatId, 'positive', 'Positive Nulrhek should beat equal-distance negative Nulrhek');

  const idiotsArray = [buildSabaccSylopCard(0), buildSabaccNumberCard(suit, 2), buildSabaccNumberCard(suit, 3)];
  assert.equal(isIdiotsArray(idiotsArray), true, "Idiot's Array should be recognized as a named special hand");
  assert.equal(evaluateSabaccHand(idiotsArray).handType, 'idiots-array', "Idiot's Array should not fall through as ordinary Nulrhek");
  const specialBeatsRegular = compareSabaccHands([
    { seatId: 'special', cards: idiotsArray },
    { seatId: 'regular', cards: [buildSabaccNumberCard(suit, 1), buildSabaccNumberCard(suit, -1)] }
  ]);
  assert.equal(specialBeatsRegular.winnerSeatId, 'special', "Idiot's Array should beat a regular zero-valued Sabacc hand");

  const aiPlayer = { seatId: 'ai', hand: [buildSabaccNumberCard(suit, 4), buildSabaccNumberCard(suit, -2), buildSabaccNumberCard(suit, 1)], evaluation: null };
  const aiAction = SabaccAi.chooseAction({ player: aiPlayer, state: { players: { ai: aiPlayer }, discard: [], deck: buildSabaccDeck(), market: [] }, aiProfile: { difficulty: 'grandmaster', fairness: 'fair', personality: 'methodical' } });
  assert.notEqual(aiAction.type, 'discard-card', 'Sabacc AI should not choose standalone discard in Galaxy/Corellian Spike rules');
}

function testDejarik() {
  const state = { board: buildDejarikBoard(), pieces: {} };
  const attacker = { id: 'a', ownerSeatId: 'one', spaceId: 'r1_q0', hp: 5, maxHp: 5, atk: 2, rng: 2, mov: 2 };
  const defender = { id: 'b', ownerSeatId: 'two', spaceId: 'r3_q0', hp: 5, maxHp: 5, atk: 2, rng: 1, mov: 1 };
  const blocker = { id: 'c', ownerSeatId: 'one', spaceId: 'r2_q0', hp: 5, maxHp: 5, atk: 1, rng: 1, mov: 1 };
  state.pieces = { a: attacker, b: defender, c: blocker };
  assert.equal(canMovePiece(state, attacker, 'r1_q1').ok, true, 'Dejarik piece should move along ring adjacency');
  assert.equal(canMovePiece(state, attacker, 'r2_q0').ok, false, 'Dejarik movement should reject occupied spaces');
  assert.equal(canAttackPiece(attacker, defender, state).ok, false, 'Dejarik ranged attack should respect blocked line of sight');
  delete state.pieces.c;
  assert.equal(canAttackPiece(attacker, defender, state).ok, true, 'Dejarik ranged attack should work when line of sight is clear');
}

function testHintaro() {
  const rolled = rollHintaroRegularDice(4);
  assert.equal(rolled.length, 4, 'Hintaro player should roll four visible symbols across two regular cubes');
  const tukarToKulro = evaluateHintaroRoll([HINTARO_SYMBOLS.TUKAR, HINTARO_SYMBOLS.TUKAR, HINTARO_SYMBOLS.KULRO, HINTARO_SYMBOLS.KULRO], null);
  assert.equal(tukarToKulro.rankLabel, 'Tukar to Kulro', 'Two Tukar/two Kulro should be top ranked');
  const hinCancelsTukar = evaluateHintaroRoll([HINTARO_SYMBOLS.TUKAR, HINTARO_SYMBOLS.TUKAR, HINTARO_SYMBOLS.KULRO, HINTARO_SYMBOLS.KULRO], { hin: 1, taro: 0 });
  assert.equal(hinCancelsTukar.cancelled.tukar, 1, 'Hintaro Hin should cancel one Tukar symbol');
  assert.equal(hinCancelsTukar.modified.tukar, 1, 'Hintaro cancellation should reduce the modified Tukar count');
}

for (const test of [testPazaak, testSabacc, testDejarik, testHintaro]) test();
console.log('Holopad Games rules smoke tests passed.');
