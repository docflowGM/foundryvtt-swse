import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';
globalThis.window = globalThis.window || { location: { hostname: 'localhost' } };
registerFoundryPathLoader(); installFoundryShimGlobals();
globalThis.game.user = { id: 'u1', isGM: false };
const { partitionSessionShelf } = await import('../scripts/games/game-session-shelf.js');
const { GameSessionStore } = await import('../scripts/games/game-session-store.js');

// store: summary (active-only) cannot show finished matches; the terminal-inclusive listing can
const mk = (id, status, at) => ({ id, gameId: 'pazaak', status, updatedAt: at, seats: [{ seatId: 's', userId: 'u1', recipientId: 'player:u1', status: 'joined' }], log: [] });
const all = [mk('a', 'active', 5), mk('done', 'complete', 4), mk('x', 'cancelled', 3), mk('r', 'refunded', 2), mk('i', 'pending-invite', 6)];
GameSessionStore.getAllSessions = () => all;
const actor = { id: 'actor1' };
assert(!GameSessionStore.summarizeForActor(actor).sessions.some((s) => s.status === 'complete'), 'premise: summary excludes finished sessions');
const withTerminal = GameSessionStore.listForActor(actor, { includeTerminal: true });
assert(withTerminal.some((s) => s.id === 'done'));

// partition: filter first, then cap; only completed matches are results; overflow reported
const m = (id, flag) => ({ id, [flag]: true });
const mapped = [...Array.from({ length: 6 }, (_, i) => m('a' + i, 'isActive')), m('i1', 'isInvite'), ...Array.from({ length: 5 }, (_, i) => m('c' + i, 'isComplete')), { id: 'cancelled' }];
const shelf = partitionSessionShelf(mapped);
assert.equal(shelf.activeSessions.length, 4); assert.equal(shelf.inviteSessions.length, 1, 'invite behind 6 active sessions is NOT hidden by a pre-filter slice');
assert.equal(shelf.recentSessions.length, 4); assert(shelf.recentSessions.every((s) => s.isComplete));
assert.deepEqual(shelf.overflow, { active: 2, invites: 0, recent: 1 });
assert.deepEqual(partitionSessionShelf(undefined).recentSessions, []);

// the service uses the terminal-inclusive listing and the partition (not summary.sessions.slice)
const svc = readFileSync('scripts/ui/shell/GamesSurfaceService.js', 'utf8');
assert.match(svc, /listForActor\(actor, \{ includeTerminal: true \}\)/);
assert.doesNotMatch(svc, /summary\.sessions\.slice\(0, 12\)/);
console.log('games recent results shelf: ok');
