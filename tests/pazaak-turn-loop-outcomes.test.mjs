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

const { getPazaakSideCardCatalog } = await import('../scripts/games/games/pazaak/pazaak-deck.js');
const catalog = getPazaakSideCardCatalog();
const ids = catalog.slice(0, 10).map((c) => c.id);
const plus = (n) => catalog.find((c) => c.type === 'plus' && Number(c.value) === n) || catalog.find((c) => Number(c.value) === n && c.type !== 'minus');
assert(plus(1) && plus(2), 'catalog has +1 and +2 side cards');
const actor = { id: 'a1', name: 'Hero', img: '' };

// Every scenario gets its OWN game: a match can end (3 set wins) inside one scenario, which must never leak into the next.
async function fresh(tableValues, hand, { drawn = true } = {}) {
  let session = null;
  GameSessionStore.getSession = () => session;
  GameSessionStore.upsertSession = async (s) => { session = s; return s; };
  const made = await PazaakEngine.createSoloAiSession({ actor, title: 't' });
  session = session || made;
  const seat = session.seats.find((s) => s.type !== 'ai' && !s.aiProfile);
  const lock = await PazaakEngine.lockSideDeck({ sessionId: session.id, seatId: seat.seatId, cardIds: ids, actor });
  assert.equal(lock?.ok, true, lock?.error);
  const g = {
    seat, state: () => session.gameState, me: () => session.gameState.players[seat.seatId],
    act: (action, payload = {}) => PazaakEngine.submitAction({ sessionId: session.id, seatId: seat.seatId, action, payload }),
    sets: () => session.gameState.setHistory || [],
    myScore: (entry) => entry.scores.find((x) => x.seatId === seat.seatId)
  };
  assert.equal(g.state().phase, 'playing'); assert.equal(g.state().activeSeatId, seat.seatId, 'human acts first');
  g.me().tableCards = tableValues.map((value) => ({ value, source: 'main' }));
  g.me().hand = hand.map((c, i) => ({ ...c, instanceId: `t${i}` }));
  g.me().sideCardPlayedThisTurn = false; g.me().stood = false; g.me().bust = false; g.me().filledTable = false; g.me().turnDrawn = drawn;
  return g;
}

// PZ-T15: exactly 20 after a side card -> automatic stand, the set resolves (no ghost turn)
{
  const g = await fresh([10, 8], [plus(2)]);
  const before = g.sets().length;
  const r = await g.act('play-side-card', { cardInstanceId: 't0', choice: { sign: 'plus', value: 2 } });
  assert.equal(r.ok, true, r.error);
  assert(g.sets().length > before, 'the set resolved');
  assert.equal(g.myScore(g.sets().at(-1)).score, 20, 'reaching 20 locked the score at 20 automatically');
  assert.equal(g.myScore(g.sets().at(-1)).bust, false);
}
// PZ-T14: past 20 with a side card and no repair -> bust, the set resolves against the player
{
  const g = await fresh([10, 10], [plus(2)]);
  const before = g.sets().length;
  const r = await g.act('play-side-card', { cardInstanceId: 't0', choice: { sign: 'plus', value: 2 } });
  assert.equal(r.ok, true, r.error);
  assert(g.sets().length > before, 'the set resolved');
  assert.equal(g.myScore(g.sets().at(-1)).bust, true, 'over 20 with no repair busts');
  assert.notEqual(g.sets().at(-1).winnerSeatId, g.seat.seatId, 'a busted player cannot win the set');
}
// PZ-T07/T09/T10: a safe side card keeps the turn; a second one is refused and consumes nothing; Stand locks the score
{
  const g = await fresh([3], [plus(1), plus(2)]);
  let r = await g.act('play-side-card', { cardInstanceId: 't0', choice: { sign: 'plus', value: 1 } });
  assert.equal(r.ok, true, r.error); assert.equal(g.state().activeSeatId, g.seat.seatId); assert.equal(g.me().hand.length, 1);
  r = await g.act('play-side-card', { cardInstanceId: 't1', choice: { sign: 'plus', value: 2 } });
  assert.equal(r.ok, false); assert.equal(g.me().hand.length, 1);
  const before = g.sets().length;
  r = await g.act('stand');
  assert.equal(r.ok, true, r.error);
  // the solo AI answers within the same call, so the set may already have resolved: the locked score is 3 + 1 = 4 either way
  assert(g.me().stood || (g.sets().length > before && g.myScore(g.sets().at(-1)).score === 4), 'Stand locked the score at 4');
}
// full nine-card board that has not busted is resolved by the engine
{
  const g = await fresh([1, 1, 1, 1, 1, 1, 1, 1], []);
  const r = await g.act('end-turn');
  assert.equal(r.ok, true, r.error);
}
// the mandatory draw is required before any action
{
  const g = await fresh([3], [plus(1)], { drawn: false });
  const r = await g.act('play-side-card', { cardInstanceId: 't0', choice: { sign: 'plus', value: 1 } });
  assert.equal(r.ok, false); assert.match(r.error, /draw/i);
}
console.log('pazaak turn-loop outcomes: ok');
