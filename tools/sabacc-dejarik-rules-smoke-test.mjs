import assert from 'node:assert/strict';
import { buildSabaccDeck } from '../scripts/games/games/sabacc/sabacc-deck.js';
import { compareSabaccHands, evaluateSabaccHand } from '../scripts/games/games/sabacc/sabacc-rules.js';
import { boardDistance, reachableSpaces, spaceId } from '../scripts/games/games/dejarik/dejarik-board.js';
import { canAttackPiece, canMovePiece, winnerSeatId } from '../scripts/games/games/dejarik/dejarik-rules.js';

const deck = buildSabaccDeck();
assert.equal(deck.length, 76, 'Sabacc deck should contain 76 cards');

const idiotArray = evaluateSabaccHand([
  { catalogId: 'idiot', value: 0, type: 'special' },
  { catalogId: 'coins_2', value: 2, type: 'number', suit: 'coins' },
  { catalogId: 'coins_3', value: 3, type: 'number', suit: 'coins' }
]);
assert.equal(idiotArray.handType, 'idiots-array');
assert.equal(idiotArray.specialWinner, true);

const purePositive = evaluateSabaccHand([{ value: 15, type: 'number', suit: 'coins' }, { value: 8, type: 'number', suit: 'staves' }]);
const pureNegative = evaluateSabaccHand([{ value: -17, type: 'special' }, { value: -6, type: 'special' }]);
assert.equal(purePositive.handType, 'pure-sabacc-positive');
assert.equal(pureNegative.handType, 'pure-sabacc-negative');
assert.equal(compareSabaccHands([
  { seatId: 'pos', cards: [{ value: 21 }] },
  { seatId: 'neg', cards: [{ value: -21 }] }
]).winnerSeatId, 'pos', 'positive total should beat negative total on same absolute value');
assert.equal(evaluateSabaccHand([{ value: 24 }]).bombedOut, true);

assert.equal(boardDistance(spaceId(1, 0), spaceId(1, 1)), 1);
assert.equal(boardDistance(spaceId(1, 0), spaceId(2, 0)), 1);
assert(reachableSpaces(spaceId(2, 2), 2, new Set()).includes(spaceId(4, 2)));

const state = { pieces: {
  a: { id: 'a', ownerSeatId: 'one', spaceId: spaceId(1, 0), mov: 2, rng: 1, atk: 3, hp: 5, defeated: false },
  b: { id: 'b', ownerSeatId: 'two', spaceId: spaceId(1, 1), mov: 2, rng: 1, atk: 3, hp: 5, defeated: false }
}};
assert.equal(canAttackPiece(state.pieces.a, state.pieces.b).ok, true);
assert.equal(canMovePiece(state, state.pieces.a, spaceId(2, 0)).ok, true);
state.pieces.b.defeated = true;
assert.equal(winnerSeatId(state), 'one');

console.log('Sabacc/Dejarik rules smoke test passed.');
