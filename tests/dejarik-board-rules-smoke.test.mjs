import assert from 'node:assert/strict';
import { boardDistance, reachableSpaces, spaceId, buildDejarikBoard } from '../scripts/games/games/dejarik/dejarik-board.js';
import { canAttackPiece, canMovePiece, winnerSeatId } from '../scripts/games/games/dejarik/dejarik-rules.js';

// Dejarik half of tools/sabacc-dejarik-rules-smoke-test.mjs, kept runnable: the Sabacc half targets the retired 76-card deck and fails (see blockers report).
assert.equal(boardDistance(spaceId(1, 0), spaceId(1, 1)), 1);
assert.equal(boardDistance(spaceId(1, 0), spaceId(2, 0)), 1);
assert(reachableSpaces(spaceId(2, 2), 2, new Set()).includes(spaceId(4, 2)));

const state = { board: buildDejarikBoard(), pieces: {
  a: { id: 'a', ownerSeatId: 'one', spaceId: spaceId(1, 0), mov: 2, rng: 1, atk: 3, hp: 5, defeated: false },
  b: { id: 'b', ownerSeatId: 'two', spaceId: spaceId(1, 1), mov: 2, rng: 1, atk: 3, hp: 5, defeated: false }
}};
assert.equal(canAttackPiece(state.pieces.a, state.pieces.b).ok, true);
assert.equal(canMovePiece(state, state.pieces.a, spaceId(2, 0)).ok, true);
state.pieces.b.defeated = true;
assert.equal(winnerSeatId(state), 'one');

console.log('dejarik board rules smoke: ok');
