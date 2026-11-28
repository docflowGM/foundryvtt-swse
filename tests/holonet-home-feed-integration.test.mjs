import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Home Comm Feed end-to-end (offline): real HolonetEngine + HolonetStorage (in-memory settings),
// real HomeFeedTaskEmitter, real HomeSurfaceService. Covers delivery to the correct player,
// dedupe on repeated visits, archive-with-history on completion, new level-up = new task,
// and the GM-offline Home view model.

registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry ??= {}; foundry.applications ??= {}; foundry.utils ??= {};
let rid = 0;
foundry.utils.randomID = () => `id-${++rid}`;
foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}, DialogV2: class {} };

const store = new Map();
const sockets = [];
const users = [
  { id: 'g1', isGM: true, active: true, name: 'GM' },
  { id: 'u1', isGM: false, active: true, name: 'One', character: { id: 'a1', name: 'Hero' } },
  { id: 'u2', isGM: false, active: true, name: 'Two', character: { id: 'a2', name: 'Other' } }
];
const mkActor = (id, name, userId) => ({
  id, name, type: 'character', ownership: { [userId]: 3 },
  system: { level: 0, xp: { total: 0 } }, items: []
});
const actors = { a1: mkActor('a1', 'Hero', 'u1'), a2: mkActor('a2', 'Other', 'u2') };
const finishChargen = (actor, classLevel = 1) => {
  actor.items = [{ id: 'c1', type: 'class', name: 'Soldier', system: { level: classLevel } }];
  actor.system.level = classLevel;
};
Object.assign(globalThis.game, {
  users: Object.assign(users, { get: id => users.find(u => u.id === id) }),
  actors: { get: id => actors[id] },
  socket: { on() {}, emit: (_n, payload) => sockets.push(payload) },
  settings: {
    get: (ns, key) => store.get(`${ns}.${key}`) ?? [],
    set: async (ns, key, value) => { store.set(`${ns}.${key}`, value); return value; },
    settings: { has: () => true }, register() {}
  },
  user: users[0]
});
globalThis.Hooks ??= {};
Hooks.callAll ??= () => {}; Hooks.on ??= () => 0; Hooks.off ??= () => {};

const { HolonetEngine } = await import('../scripts/holonet/holonet-engine.js');
const { HolonetStorage } = await import('../scripts/holonet/subsystems/holonet-storage.js');
const { HomeFeedTaskEmitter } = await import('../scripts/holonet/emitters/home-feed-task-emitter.js');
const { HomeSurfaceService } = await import('../scripts/ui/shell/HomeSurfaceService.js');
const { SURFACE_TYPE } = await import('../scripts/holonet/contracts/enums.js');
const { determineLevelFromXP } = await import('../scripts/engine/progression/xp-engine.js');

HomeSurfaceService._getUpgradeSummary = async () => ({ visible: false, enabled: false, badge: null });
HomeSurfaceService._getAlliesSummary = async () => ({ openSlots: 0 });
HomeSurfaceService._getProgressionAudit = () => null;

const xpFor = (level) => { let xp = 0; while (determineLevelFromXP(xp) < level) xp += 100; return xp; };
const sync = async (actorId, requesterId) => {
  HomeFeedTaskEmitter._recentFingerprints.clear(); // prove dedupe comes from storage, not the in-memory cache
  game.user = users[0];
  await HomeSurfaceService.syncHomeTasksForActorId(actorId, requesterId);
};
const feed = async (recipientId) => HolonetEngine.getFeedForRecipient(recipientId, SURFACE_TYPE.HOME_FEED, 20);
const all = async () => (await HolonetStorage.getAllRecords()).filter(r => r.metadata?.generatedBy === 'HomeFeedTaskEmitter');
const keys = (records) => records.map(r => r.metadata.homeTaskKey).sort();

// 1. Unfinished chargen: delivered to the owner only.
await sync('a1', 'u1');
assert.deepEqual(keys(await feed('player:u1')), ['home-task:a1:progression:setup'], 'owner receives the setup task');
assert.deepEqual(await feed('player:u2'), [], 'another player receives nothing');
assert.deepEqual(await feed('gm:g1'), [], 'GM feed is not polluted by a player sync');
const setupRecord = (await feed('player:u1'))[0];
assert.equal(setupRecord.title, 'Character setup available');
assert.equal(setupRecord.metadata.routeId, 'chargen', 'persisted row routes to chargen');

// 2. Repeated visits never duplicate.
await sync('a1', 'u1'); await sync('a1', 'u1'); await sync('a1', 'u1');
assert.equal((await all()).filter(r => r.state === 'published').length, 1, 'repeated Home visits create one record');

// 3. Multiple players are independent.
await sync('a2', 'u2');
assert.deepEqual(keys(await feed('player:u2')), ['home-task:a2:progression:setup']);
assert.deepEqual(keys(await feed('player:u1')), ['home-task:a1:progression:setup'], 'player 2 sync does not touch player 1');
// A request for someone else's actor does nothing.
const before = (await all()).length;
await sync('a2', 'u1');
assert.equal((await all()).length, before, 'a request for an actor the requester does not own does nothing');

// 4. Transient projection de-duplicates against the persisted row.
const setupSummary = HomeSurfaceService._getProgressionSummary(actors.a1);
assert.equal(setupSummary.routeId, 'chargen');
const rows = (await feed('player:u1')).map(r => HomeSurfaceService._mapFeedRecord(r, ['player:u1']));
assert.equal(rows[0].homeTaskKey, 'home-task:a1:progression:setup');
assert.equal(rows[0].routeId, 'chargen');
assert.deepEqual(HomeSurfaceService._buildActiveTasks(actors.a1, setupSummary, rows), [], 'no duplicate transient row when the persisted one is shown');
assert.equal(HomeSurfaceService._buildActiveTasks(actors.a1, setupSummary, []).length, 1, 'transient row shows when the persisted one is absent');

// 5. Chargen completed: setup task archived (history kept), feed clears.
finishChargen(actors.a1);
await sync('a1', 'u1');
assert.deepEqual(await feed('player:u1'), [], 'completed setup is no longer in the active feed');
const archived = (await all()).filter(r => r.metadata.homeTaskKey === 'home-task:a1:progression:setup');
assert.equal(archived.length, 1, 'the resolved record still exists (history preserved)');
assert.equal(archived[0].state, 'archived');
assert.ok(archived[0].archivedAt, 'archive timestamp recorded');
assert.equal(archived[0].body, setupRecord.body, 'archived record content is unchanged');
assert.deepEqual(HomeSurfaceService._buildActiveTasks(actors.a1, HomeSurfaceService._getProgressionSummary(actors.a1), []), [], 'no transient row once nothing is pending');

// 6. Legitimate level-up opens a new task; more XP at the same level does not.
actors.a1.system.xp.total = xpFor(2);
await sync('a1', 'u1');
assert.deepEqual(keys(await feed('player:u1')), ['home-task:a1:progression:levelup:L1'], 'level-up opportunity published once');
assert.equal((await feed('player:u1'))[0].title, 'Training available');
actors.a1.system.xp.total = xpFor(3);
await sync('a1', 'u1');
assert.equal((await feed('player:u1')).length, 1, 'more XP at the same level keeps the same task');

// 7. Level taken: that task resolves; next opportunity at the new level is a NEW task.
finishChargen(actors.a1, 2);
await sync('a1', 'u1');
assert.deepEqual(keys(await feed('player:u1')), ['home-task:a1:progression:levelup:L2'], 'old level-up archived; new level-up is a distinct task');
assert.equal((await all()).filter(r => r.metadata.homeTaskKey.includes('levelup:L1'))[0].state, 'archived', 'history kept');

// 8. Legacy-format record is not dropped while still required, and resolves once replaced.
const legacy = (await feed('player:u1'))[0];
const legacyCopy = { ...legacy.toJSON(), id: 'legacy-1', metadata: { ...legacy.metadata, homeTaskKey: 'home-task:a1:progression:1' } };
const { hydrateHolonetRecord } = await import('../scripts/holonet/contracts/record-factory.js');
await HolonetStorage.saveRecord(hydrateHolonetRecord(legacyCopy));
await sync('a1', 'u1');
const legacyAfter = (await all()).find(r => r.id === 'legacy-1');
assert.equal(legacyAfter.state, 'archived', 'legacy duplicate archived because the current-format replacement is published');
assert.equal((await feed('player:u1')).length, 1, 'player sees exactly one active training task');

// 9. Non-progression Holonet records for the same player are never touched.
await HolonetEngine.publish(hydrateHolonetRecord({
  id: 'store-note', type: 'notification', intent: 'store.opened', title: 'Store open', body: 'x',
  audience: { type: 'selected_players', playerIds: ['player:u1'] }, recipients: [], metadata: {},
  projections: [{ surfaceType: SURFACE_TYPE.HOME_FEED, recordId: 'store-note' }]
}), { skipSocket: true, suppressLocalHook: true });
finishChargen(actors.a1, 2); actors.a1.system.xp.total = 0;
await sync('a1', 'u1');
const remaining = (await feed('player:u1')).map(r => r.id);
assert.deepEqual(remaining, ['store-note'], 'only the unrelated notification remains active; it was not archived');

// 10. GM offline: player's Home still shows the obligation, and asks the GM (actor id only) to persist.
users[0].active = false;
actors.a1.items = []; actors.a1.system.level = 0; // creation unfinished again for this view
game.user = users[1];
sockets.length = 0;
HomeSurfaceService._getHolonetSummary = async () => ({
  alerts: { total: 0, chips: [] }, badges: { messages: null, mentor: null }, quickGlance: [],
  currentState: {}, commFeed: [], lastSession: null, notificationCenter: { totalUnread: 0, chips: [], preview: [], notices: [], hasNotices: false }
});
let vm;
try { vm = await HomeSurfaceService.buildViewModel(actors.a1); } catch (err) { vm = { error: err }; }
assert.ok(!vm.error, `buildViewModel runs for a player: ${vm.error?.message}`);
assert.deepEqual(vm.activeTasks.map(t => [t.title, t.action, t.routeId]), [['Character Creation Incomplete', 'Continue Setup', 'chargen']], 'GM-offline Home shows the task from canonical state');
const requests = sockets.filter(p => p.kind === 'request');
assert.equal(requests.length, 1, 'one sync request is sent to the GM');
assert.equal(requests[0].action, 'sync-home-tasks');
assert.deepEqual(Object.keys(requests[0].data).sort(), ['actorId', 'requestId'], 'the request carries only the actor id');
await HomeSurfaceService.buildViewModel(actors.a1);
assert.equal(sockets.filter(p => p.kind === 'request').length, 1, 'repeat renders are throttled');
assert.equal(vm.commFeedUnreadCount, 0);

// 11. Template + navigation wiring.
const tpl = await readFile('templates/shell/partials/surface-home.hbs', 'utf8');
const taskRow = tpl.match(/<button class="swse-home-feed-row swse-home-task-row[^>]*>/)?.[0] ?? '';
assert.match(taskRow, /data-route-id="\{\{this\.routeId\}\}"/, 'task row carries the route id');
assert.doesNotMatch(taskRow, /data-holonet-record-id/, 'task row is not a Holonet record (no read state)');
assert.doesNotMatch(tpl.slice(tpl.indexOf('swse-home-tasks'), tpl.indexOf('swse-home-tasks') + 900), /isUnread|ACK/, 'task rows have no unread/ACK markup');
const host = await readFile('scripts/ui/shell/ShellHost.js', 'utf8');
assert.match(host, /\[data-route-id\]:not\(\[data-holonet-record-id\]\)/, 'ShellHost routes id-less route buttons through setSurface');
assert.match(host, /await this\.setSurface\(routeId, surfaceOptions\)/);
for (const routeId of ['chargen', 'progression']) {
  assert.match(await readFile('scripts/ui/shell/ShellRouter.js', 'utf8').catch(() => host), new RegExp(`['"]${routeId}['"]`), `${routeId} is a known shell surface`);
}

// 12. Socket handler wiring: the GM handler passes the request's actor id and requester to the service.
const socketSrc = await readFile('scripts/holonet/subsystems/holonet-socket-service.js', 'utf8');
assert.match(socketSrc, /case 'sync-home-tasks':[\s\S]*syncHomeTasksForActorId\(data\?\.actorId, data\?\.requesterId\)/, 'sync-home-tasks is handled GM-side with actor id + requester');

console.log('holonet-home-feed-integration: OK');
