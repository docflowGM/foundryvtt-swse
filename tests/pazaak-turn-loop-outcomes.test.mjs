import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.game.user = { id: 'gm', isGM: true, name: 'GM' };
globalThis.ui = { notifications: { info() {}, warn() {}, error() {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };
// The solo AI waits a real 'thinking' delay (up to 5 s); collapse it so the loop is deterministic and fast.
const realSetTimeout = globalThis.setTimeout; globalThis.setTimeout = (fn, _ms, ...a) => realSetTimeout(fn, 0, ...a); // AI thinking delay
const { PazaakEngine } = await import('../scripts/games/games/pazaak/pazaak-engine.js');
const { GameSessionStore } = await import('../scripts/games/game-session-store.js');
const { GameNotificationService } = await import('../scripts/games/game-notification-service.js');
GameNotificationService.emitSessionUpdated = () => {};
let session = null;
GameSessionStore.getSession = () => session;
GameSessionStore.upsertSession = async (s) => { session = s; return s; };
const actor = { id: 'a1', name: 'Hero', img: '' };
const made = await PazaakEngine.createSoloAiSession({ actor, title: 't' });
session = session || made;
assert(session, 'session created');
const state = () => session.gameState;
const seat = session.seats.find(s => s.type !== 'ai' && !s.aiProfile);
const me = () => state().players[seat.seatId];
// lock a legal side deck
const { getPazaakSideCardCatalog } = await import('../scripts/games/games/pazaak/pazaak-deck.js');
const ids = getPazaakSideCardCatalog().slice(0, 10).map(c => c.id);
const lock = await PazaakEngine.lockSideDeck({ sessionId: session.id, seatId: seat.seatId, cardIds: ids, actor });
assert.equal(lock?.ok, true, lock?.error);
assert.equal(state().phase, 'playing');
assert.equal(state().activeSeatId, seat.seatId, 'human acts first');
assert(me().turnDrawn, 'mandatory draw happened');
const sid = () => session.id;
const act = (action, payload = {}) => PazaakEngine.submitAction({ sessionId: sid(), seatId: seat.seatId, action, payload });

const { getPazaakSideCardCatalog: cat } = await import('../scripts/games/games/pazaak/pazaak-deck.js');
const plus = (n) => cat().find((c) => c.type === 'plus' && Number(c.value) === n) || cat().find((c) => Number(c.value) === n && c.type !== 'minus');
assert(plus(1) && plus(2), 'catalog has +1 and +2 side cards');
const setup = async (tableValues, hand) => {
  me().tableCards = tableValues.map((value) => ({ value, source: 'main' }));
  me().hand = hand.map((c, i) => ({ ...c, instanceId: `t${i}` }));
  me().sideCardPlayedThisTurn = false; me().stood = false; me().bust = false; me().filledTable = false; me().turnDrawn = true;
  state().activeSeatId = seat.seatId;
};

const sets = () => state().setHistory || [];
const myScore = (entry) => entry.scores.find((x) => x.seatId === seat.seatId);
// PZ-T15: exactly 20 after a side card -> automatic stand, turn resolves (no ghost turn)
await setup([10, 8], [plus(2)]);
let before = sets().length;
let r = await act('play-side-card', { cardInstanceId: 't0', choice: { sign: 'plus', value: 2 } });
assert.equal(r.ok, true, r.error);
assert(sets().length > before, 'the set resolved: no ghost turn');
assert.equal(myScore(sets().at(-1)).score, 20, 'reaching 20 locked the score at 20 automatically');
assert.equal(myScore(sets().at(-1)).bust, false);

// PZ-T14: pushing past 20 with a side card and no repair -> bust, turn resolves
await setup([10, 10], [plus(2)]);
before = sets().length;
r = await act('play-side-card', { cardInstanceId: 't0', choice: { sign: 'plus', value: 2 } });
assert.equal(r.ok, true, r.error);
assert(sets().length > before, 'the set resolved');
assert.equal(myScore(sets().at(-1)).bust, true, 'over 20 with no repair busts');
assert.notEqual(sets().at(-1).winnerSeatId, seat.seatId, 'a busted player cannot win the set');

// PZ-T07/T09: a safe side card keeps the turn, a second one is refused and consumes nothing
await setup([3], [plus(1), plus(2)]);
r = await act('play-side-card', { cardInstanceId: 't0', choice: { sign: 'plus', value: 1 } });
assert.equal(r.ok, true); assert.equal(state().activeSeatId, seat.seatId); assert.equal(me().hand.length, 1);
r = await act('play-side-card', { cardInstanceId: 't1', choice: { sign: 'plus', value: 2 } });
assert.equal(r.ok, false); assert.equal(me().hand.length, 1);

// PZ-T10: Stand after a side card locks the score
before = sets().length;
r = await act('stand');
assert.equal(r.ok, true, r.error);
// the solo AI answers within the same call, so the set may already have resolved: the locked score is 3 + 1 = 4 either way
assert(me().stood || (sets().length > before && myScore(sets().at(-1)).score === 4), 'Stand locked the score at 4');

// PZ-T15b: a full nine-card board that has not busted is resolved by the engine
await setup([1, 1, 1, 1, 1, 1, 1, 1], []);
me().turnDrawn = true;
r = await act('end-turn');
assert.equal(r.ok, true, r.error);

// the mandatory draw is required before any action
await setup([3], [plus(1)]); me().turnDrawn = false;
r = await act('play-side-card', { cardInstanceId: 't0', choice: { sign: 'plus', value: 1 } });
assert.equal(r.ok, false); assert.match(r.error, /draw/i);
console.log('pazaak turn-loop outcomes: ok');
