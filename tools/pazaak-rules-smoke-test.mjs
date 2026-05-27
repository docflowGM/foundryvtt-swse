import assert from 'node:assert/strict';
import { PAZAAK_TABLE_LIMIT, PAZAAK_TARGET } from '../scripts/games/games/pazaak/pazaak-deck.js';
import {
  applyPazaakSideCard,
  comparePazaakSet,
  hasFilledPazaakTable,
  isPazaakTwenty,
  scorePazaakPlayer
} from '../scripts/games/games/pazaak/pazaak-rules.js';

function mainCard(value) {
  return { instanceId: `main-${value}-${Math.random()}`, source: 'main', type: 'main', value, label: String(value) };
}

function sideCard(id, instanceId = id) {
  return { catalogId: id, id, instanceId, source: 'side' };
}

function player(seatId, values, extra = {}) {
  return { seatId, tableCards: values.map(mainCard), hand: [], ...extra };
}

const twenty = player('a', [10, 10]);
assert.equal(scorePazaakPlayer(twenty), PAZAAK_TARGET);
assert.equal(isPazaakTwenty(twenty), true);

const fill = player('a', Array(PAZAAK_TABLE_LIMIT).fill(2));
assert.equal(hasFilledPazaakTable(fill), true);
assert.equal(comparePazaakSet([fill, player('b', [10, 9])]).winnerSeatId, 'a');

const tie = comparePazaakSet([player('a', [10, 9]), player('b', [9, 10])]);
assert.equal(tie.tied, true);

const tb = player('a', [10, 9], { hand: [sideCard('tiebreaker', 'tb1')] });
const tbResult = applyPazaakSideCard(tb, 'tb1', { sign: 'plus' });
assert.equal(tbResult.ok, true);
assert.equal(tbResult.player.tiebreakerUsed, true);
assert.equal(comparePazaakSet([tbResult.player, player('b', [10, 10])]).winnerSeatId, 'a');
assert.equal(comparePazaakSet([tbResult.player, player('b', [10, 9, 1])]).winnerSeatId, 'a');

const flip = player('a', [2, 4, 9], { hand: [sideCard('flip-2-4', 'flip1')] });
const flipResult = applyPazaakSideCard(flip, 'flip1');
assert.equal(flipResult.ok, true);
assert.equal(scorePazaakPlayer(flipResult.player), 3);

const double = player('a', [5, 7], { hand: [sideCard('double', 'double1')] });
const doubleResult = applyPazaakSideCard(double, 'double1');
assert.equal(doubleResult.ok, true);
assert.equal(scorePazaakPlayer(doubleResult.player), 19);

console.log('Pazaak rules smoke tests passed.');
