/**
 * Lightweight rules smoke tests for Holopad Games.
 *
 * Run from the system root with:
 *   node scripts/games/tests/games-rules-smoke-tests.mjs
 *
 * These tests avoid Foundry documents and exercise pure rule/deck utilities only.
 */

import assert from 'node:assert/strict';

import { buildPazaakMainDeck, PAZAAK_TARGET } from '../games/pazaak/pazaak-deck.js';
import { scorePazaakPlayer, hasFilledPazaakTable } from '../games/pazaak/pazaak-rules.js';
import { buildSabaccDeck, buildSabaccSylopCard, buildSabaccNumberCard, SABACC_SUITS } from '../games/sabacc/sabacc-deck.js';
import { compareSabaccHands, evaluateSabaccHand } from '../games/sabacc/sabacc-rules.js';
import { SabaccAi } from '../games/sabacc/sabacc-ai.js';
import { buildDejarikBoard } from '../games/dejarik/dejarik-board.js';
import { attackRangeForPiece, canAttackPiece, canMovePiece } from '../games/dejarik/dejarik-rules.js';
import { evaluateHintaroRoll, rollHintaroPlayerDice, HINTARO_SYMBOLS } from '../games/hintaro/hintaro-rules.js';

function testPazaak() {
  const deck = buildPazaakMainDeck();
  assert.equal(deck.length, 40, 'Pazaak main deck should contain four each of 1-10');
  const player = { tableCards: [{ value: 10 }, { value: 5 }, { value: 5 }], hand: [] };
  assert.equal(scorePazaakPlayer(player), PAZAAK_TARGET, 'Pazaak score should total table cards');
  assert.equal(hasFilledPazaakTable({ tableCards: Array.from({ length: 9 }, () => ({ value: 1 })) }), true, 'Pazaak filled table should be detected');
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
  assert.equal(canAttackPiece(attacker, defender, state).ok, false, 'Dejarik ranged attack should respect blocked line of sight');
  delete state.pieces.c;
  assert.equal(canAttackPiece(attacker, defender, state).ok, true, 'Dejarik ranged attack should work when line of sight is clear');

  const strider = { id: 's', ownerSeatId: 'one', spaceId: 'r1_q0', hp: 5, maxHp: 5, atk: 2, rng: 1, mov: 3, ability: 'lunge' };
  const farTarget = { id: 't', ownerSeatId: 'two', spaceId: 'r3_q0', hp: 5, maxHp: 5, atk: 2, rng: 1, mov: 1 };
  state.pieces = { s: strider, t: farTarget };
  assert.equal(attackRangeForPiece(strider), 2, 'Kintan Strider lunge should extend attack range by one');
  assert.equal(canAttackPiece(strider, farTarget, state).ok, true, 'Lunge should allow a clear two-space attack');

  const skitter = { id: 'sk', ownerSeatId: 'one', spaceId: 'r1_q1', previousSpaceId: 'r1_q0', hp: 3, maxHp: 3, atk: 1, rng: 3, mov: 3, ability: 'skitter' };
  state.pieces = { sk: skitter };
  assert.equal(canMovePiece(state, skitter, 'r1_q0').ok, true, 'Scrimp skitter should allow immediate retreat');
}

function testHintaro() {
  const rolled = rollHintaroPlayerDice();
  assert.equal(rolled.dice.length, 2, 'Hintaro player should roll two regular cubes');
  assert.equal(rolled.symbols.length, 4, 'Two Hintaro cubes should expose four visible symbols');
  const tukarToKulro = evaluateHintaroRoll([HINTARO_SYMBOLS.TUKAR, HINTARO_SYMBOLS.TUKAR, HINTARO_SYMBOLS.KULRO, HINTARO_SYMBOLS.KULRO], null);
  assert.equal(tukarToKulro.rankLabel, 'Tukar to Kulro', 'Two Tukar/two Kulro should be top ranked');
  const cancelled = evaluateHintaroRoll([HINTARO_SYMBOLS.TUKAR, HINTARO_SYMBOLS.TUKAR, HINTARO_SYMBOLS.KULRO, HINTARO_SYMBOLS.KULRO], { hin: 1, taro: 1 });
  assert.equal(cancelled.modified.tukar, 1, 'Hin should cancel one Tukar');
  assert.equal(cancelled.modified.kulro, 1, 'Taro should cancel one Kulro');
  assert.equal(cancelled.canWin, false, 'A fully broken one-and-one result should not win');
}

for (const test of [testPazaak, testSabacc, testDejarik, testHintaro]) test();
console.log('Holopad Games rules smoke tests passed.');
