import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Home task notifications address recipients by stable id ('player:<userId>').
// HolonetDeliveryRouter must resolve those through the SELECTED_PLAYERS
// audience instead of dropping them (which left Home task records undeliverable).

registerFoundryPathLoader();
installFoundryShimGlobals();

const users = [
  { id: 'u1', isGM: false, name: 'Player One', character: { id: 'a1', name: 'Hero' } },
  { id: 'g1', isGM: true, name: 'GM' }
];
globalThis.game = { ...(globalThis.game ?? {}), users: Object.assign(users, { get: id => users.find(u => u.id === id) }) };

const { HolonetDeliveryRouter } = await import('../scripts/holonet/subsystems/holonet-delivery-router.js');
const { HolonetAudience } = await import('../scripts/holonet/contracts/holonet-audience.js');

const viaStable = HolonetDeliveryRouter.resolveRecipients({ audience: HolonetAudience.selectedPlayers(['player:u1']), recipients: [] });
assert.deepEqual(viaStable.map(r => r.id), ['player:u1'], 'stable player id resolves');

const viaRaw = HolonetDeliveryRouter.resolveRecipients({ audience: HolonetAudience.selectedPlayers(['u1']), recipients: [] });
assert.deepEqual(viaRaw.map(r => r.id), ['player:u1'], 'raw user id still resolves');

const gmIgnored = HolonetDeliveryRouter.resolveRecipients({ audience: HolonetAudience.selectedPlayers(['gm:g1', 'player:missing']), recipients: [] });
assert.equal(gmIgnored.length, 0, 'GM and unknown ids are not player recipients');

console.log('holonet-home-task-recipient-contract: OK');

// Task eligibility (setup vs level-up vs nothing) as seen by the emitter.
globalThis.foundry ??= {};
foundry.applications ??= {};
foundry.utils ??= {};
let __rid = 0;
foundry.utils.randomID ??= () => `test-id-${++__rid}`;
foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {}, DialogV2: class {} };
const { HomeFeedTaskEmitter } = await import('../scripts/holonet/emitters/home-feed-task-emitter.js');
const actor = { id: 'a1', name: 'Hero' };
const base = { visible: true, enabled: true };
const keysOf = (summary) => HomeFeedTaskEmitter._buildTasks(actor, summary).map(t => t.title);

assert.deepEqual(keysOf({ ...base, routeId: 'chargen', badge: 'SETUP' }), ['Character setup available'], 'incomplete chargen -> setup reminder');
assert.deepEqual(keysOf({ ...base, routeId: 'progression', badge: '1' }), ['Training available'], 'XP level-up -> training available');
assert.deepEqual(keysOf({ ...base, routeId: 'progression', badge: null }), [], 'no pending progression -> no training reminder');
assert.deepEqual(keysOf({ ...base, enabled: false, routeId: 'progression', badge: 'MAX' }), [], 'max level -> no reminder');

console.log('holonet-home-task eligibility: OK');

// ── Publish policy (GM-side authorization of player-originated publishes) ──
const { HolonetPublishPolicy } = await import('../scripts/holonet/subsystems/holonet-publish-policy.js');
const { HolonetStorage } = await import('../scripts/holonet/subsystems/holonet-storage.js');
const { HolonetNotification } = await import('../scripts/holonet/contracts/holonet-notification.js');
const { HolonetRecipient } = await import('../scripts/holonet/contracts/holonet-recipient.js');
const { HolonetProjectionSurface } = await import('../scripts/holonet/contracts/holonet-projection-surface.js');
const { INTENT_TYPE, SURFACE_TYPE } = await import('../scripts/holonet/contracts/enums.js');

const policyUsers = [
  { id: 'u1', isGM: false, name: 'One', character: { id: 'a1', name: 'Hero' } },
  { id: 'u2', isGM: false, name: 'Two', character: { id: 'a2', name: 'Other' } },
  { id: 'u3', isGM: false, name: 'Three', character: null },
  { id: 'g1', isGM: true, name: 'GM' }
];
const actors = {
  a1: { id: 'a1', ownership: { u1: 3, u3: 2 }, testUserPermission: (u, lvl) => (u.id === 'u1' && lvl === 'OWNER') },
  a2: { id: 'a2', ownership: { u2: 3 }, testUserPermission: (u, lvl) => (u.id === 'u2' && lvl === 'OWNER') }
};
globalThis.game = {
  ...(globalThis.game ?? {}),
  users: Object.assign(policyUsers, { get: id => policyUsers.find(u => u.id === id) }),
  actors: { get: id => actors[id] }
};
const existingIds = new Set(['existing-record']);
HolonetStorage.getRecordById = async (id) => (existingIds.has(id) ? { id } : null);

const mk = (over = {}) => new HolonetNotification({
  intent: INTENT_TYPE.SYSTEM_HOME_TASK,
  audience: HolonetAudience.selectedPlayers(['player:u1']),
  recipients: [],
  title: 't', body: 'b',
  metadata: { actorId: 'a1' },
  projections: [new HolonetProjectionSurface({ surfaceType: SURFACE_TYPE.HOME_FEED, recordId: 'x' })],
  ...over
});
const verdict = async (record, who) => (await HolonetPublishPolicy.authorizePlayerPublish(record, who));

assert.equal((await verdict(mk(), 'u1')).ok, true, 'a player may notify themself');
assert.equal((await verdict(mk({ audience: HolonetAudience.selectedPlayers(['player:u2']) }), 'u1')).ok, true, 'a player-triggered notice to another player (e.g. an actor owner) is NOT blocked');
assert.equal((await verdict(mk({ audience: HolonetAudience.selectedPlayers(['player:u1', 'player:u2']) }), 'u1')).ok, true, 'multi-recipient notices are allowed');
assert.equal((await verdict(mk({ audience: HolonetAudience.gmOnly() }), 'u1')).ok, true, 'a player notice addressed to the GM is allowed');
assert.equal((await verdict(mk({ audience: HolonetAudience.allPlayers() }), 'u1')).ok, true, 'broadcast notices are allowed');
assert.equal((await verdict(mk({ metadata: { actorId: 'a2' } }), 'u1')).ok, true, 'notices about another actor are allowed');
assert.equal((await verdict(mk(), 'nobody')).reason, 'unknown_requester', 'malformed request (unknown requester) rejected');
assert.equal((await verdict(mk(), undefined)).reason, 'unknown_requester', 'missing requester rejected');
assert.equal((await verdict(mk({ id: 'existing-record' }), 'u1')).reason, 'record_id_exists', 'a request never overwrites an existing record');
assert.equal((await verdict(mk({ audience: null, recipients: [] }), 'u1')).reason, 'no_recipients', 'a record with no recipients is not saved undeliverable');
assert.equal((await verdict(mk({ audience: HolonetAudience.selectedPlayers(['player:ghost']) }), 'u1')).reason, 'no_recipients', 'unresolvable recipients are not saved undeliverable');

// ── Task lifecycle ──
const user = globalThis.game.user = { id: 'g1', isGM: true };
const lifeActor = { id: 'a1', name: 'Hero', type: 'character' };
const setupSummary = { visible: true, enabled: true, routeId: 'chargen', badge: 'SETUP', currentLevel: 1 };
const lvl1 = { visible: true, enabled: true, routeId: 'progression', badge: '1', currentLevel: 1 };
const lvl1More = { ...lvl1, badge: '2' };
const lvl2 = { visible: true, enabled: true, routeId: 'progression', badge: '1', currentLevel: 2 };
const none = { visible: true, enabled: true, routeId: 'progression', badge: null, currentLevel: 2 };
const keyOf = (summary) => HomeFeedTaskEmitter._buildTasks(lifeActor, summary).map(t => t.key);

assert.deepEqual(keyOf(lvl1), keyOf(lvl1More), 'more XP at the same level is the same task (deterministic dedupe)');
assert.notDeepEqual(keyOf(lvl1), keyOf(lvl2), 'a new level-up opportunity at a later level is a new task');
assert.notDeepEqual(keyOf(setupSummary), keyOf(lvl1), 'setup and training are distinct tasks');

const rec = (key, over = {}) => ({ id: `r-${key}`, state: 'published', recipients: [{ id: 'player:u1' }], metadata: { generatedBy: 'HomeFeedTaskEmitter', actorId: 'a1', homeTaskKey: key, ...over } });
const store = [rec(keyOf(setupSummary)[0]), rec(keyOf(lvl1)[0]), rec('home-task:a1:progression:1'), rec('home-task:a1:workbench:3'), rec(keyOf(lvl1)[0], { actorId: 'other' })];
let archived = [];
HolonetStorage.getRecordsByRecipient = async () => store;
HolonetStorage.archiveRecords = async (ids) => { archived = ids; return true; };

const run = (summary) => HomeFeedTaskEmitter.resolveProgressionTasks({ actor: lifeActor, recipientIds: ['player:u1'], progressionSummary: summary, progressionAudit: {} });

// Chargen completed and level 1 -> 2 pending: setup + old-level tasks resolve; a legacy-keyed
// training record is KEPT (no current-format replacement published yet); workbench/other-actor untouched.
await run(lvl2);
assert.deepEqual(archived.sort(), [`r-${keyOf(setupSummary)[0]}`, `r-${keyOf(lvl1)[0]}`].sort(), 'resolved tasks archived; legacy training task kept while still required; unrelated tasks untouched');

// Once the current-format replacement is published for the same recipients, the legacy duplicate is archived.
store.push(rec(keyOf(lvl2)[0]));
await run(lvl2);
assert.equal(archived.includes('r-home-task:a1:progression:1'), true, 'legacy duplicate archived once its replacement exists');
assert.equal(archived.includes(`r-${keyOf(lvl2)[0]}`), false, 'current pending task is never archived');
store.pop();

// Still pending -> the pending task is kept; only stale ones resolve.
const stillPending = await run(setupSummary);
assert.equal(stillPending.includes(`r-${keyOf(setupSummary)[0]}`), false, 'pending setup task is not archived');

// Nothing pending -> everything progression for this actor resolves, legacy included.
const resolvedAll = await run(none);
assert.equal(resolvedAll.includes(`r-${keyOf(setupSummary)[0]}`), true, 'no pending work resolves the setup task');
assert.equal(resolvedAll.includes('r-home-task:a1:progression:1'), true, 'no pending work resolves legacy training tasks too');
assert.equal(resolvedAll.includes('r-home-task:a1:workbench:3'), false, 'non-progression tasks are never touched');
// Another actor's tasks are never touched, including a record whose key and metadata.actorId disagree.
store.push(rec('home-task:a2:progression:setup', { actorId: 'a2' }), rec('home-task:a1:progression:setup', { actorId: 'a2' }));
store[store.length - 1].id = 'r-mismatched';
const scoped = await run(none);
assert.equal(scoped.includes('r-home-task:a2:progression:setup'), false, 'another actor’s progression task is untouched');
assert.equal(scoped.includes('r-mismatched'), false, 'a record whose metadata actor differs is untouched');
store.length -= 2;

// Non-GM cannot archive.
game.user = { id: 'u1', isGM: false };
assert.deepEqual(await run(none), [], 'non-GM resolve is a no-op');

console.log('holonet-home-task policy + lifecycle: OK');

// ── Home task projection (derived, non-persisted) + GM-side sync scope ──
const { HomeSurfaceService } = await import('../scripts/ui/shell/HomeSurfaceService.js');
const projActor = { id: 'a1', name: 'Hero', type: 'character' };

const projSetup = HomeSurfaceService._buildActiveTasks(projActor, setupSummary, []);
assert.deepEqual(projSetup.map(t => [t.kind, t.title, t.routeId]), [['setup', 'Character Creation Incomplete', 'chargen']], 'unfinished creation projects a setup task routed to chargen');
const projLevel = HomeSurfaceService._buildActiveTasks(projActor, lvl1, []);
assert.deepEqual(projLevel.map(t => [t.kind, t.title, t.routeId]), [['levelup', 'Training Available', 'progression']], 'pending level-up projects a training task routed to progression');
assert.deepEqual(HomeSurfaceService._buildActiveTasks(projActor, none, []), [], 'no pending work projects nothing');
assert.deepEqual(HomeSurfaceService._buildActiveTasks(projActor, { ...none, enabled: false, badge: 'MAX' }, []), [], 'max level projects nothing');
assert.deepEqual(projSetup.map(t => Object.keys(t).filter(k => /unread|read/i.test(k))).flat(), [], 'projected tasks carry no read/unread state');
// Same task already shown as a persisted feed row -> not shown twice.
assert.deepEqual(HomeSurfaceService._buildActiveTasks(projActor, setupSummary, [{ homeTaskKey: projSetup[0].key }]), [], 'suppressed when the persisted feed row for the same task key is present');
assert.equal(HomeSurfaceService._buildActiveTasks(projActor, setupSummary, [{ homeTaskKey: 'home-task:a1:workbench:3' }]).length, 1, 'an unrelated feed row does not suppress it');
// Projection needs no GM and no storage.
game.user = { id: 'u1', isGM: false };
assert.equal(HomeSurfaceService._buildActiveTasks(projActor, setupSummary, []).length, 1, 'projection works with no GM online');

// sync-home-tasks scope: only the claimed OWNER of this actor triggers anything; effects are state-derived.
game.user = { id: 'g1', isGM: true };
game.actors = { get: id => ({ a1: { ...projActor, id: 'a1', type: 'character', ownership: { u1: 3 } }, a2: { id: 'a2', name: 'Other', type: 'character', ownership: { u2: 3 } } })[id] };
HomeSurfaceService._getUpgradeSummary = async () => ({ visible: false, enabled: false, badge: null });
HomeSurfaceService._getAlliesSummary = async () => ({ openSlots: 0 });
const emitted = [];
const realEmit = HomeFeedTaskEmitter.emitHomeTasks;
const realResolve = HomeFeedTaskEmitter.resolveProgressionTasks;
HomeFeedTaskEmitter.emitHomeTasks = async (args) => { emitted.push(args); return []; };
HomeFeedTaskEmitter.resolveProgressionTasks = async () => [];
// Shell users 'u1' owns a1 (character), 'u2' owns a2, 'u3' observer of a1.
try {
  await HomeSurfaceService.syncHomeTasksForActorId('a1', 'u2');
  assert.equal(emitted.length, 0, 'a player claiming to be another actor’s non-owner triggers nothing for that actor');
  await HomeSurfaceService.syncHomeTasksForActorId('a1', 'g1');
  assert.equal(emitted.length, 0, 'a claimed GM requester triggers nothing');
  await HomeSurfaceService.syncHomeTasksForActorId('a1', undefined);
  assert.equal(emitted.length, 0, 'a missing requester triggers nothing');
  await HomeSurfaceService.syncHomeTasksForActorId('missing', 'u1');
  assert.equal(emitted.length, 0, 'unknown actor triggers nothing');
  await HomeSurfaceService.syncHomeTasksForActorId('a1', 'u1');
  assert.equal(emitted.length, 1, 'the actor owner’s request syncs that actor');
  assert.equal(emitted[0].actor.id, 'a1', 'sync is scoped to the requested actor');
  assert.deepEqual(emitted[0].recipientIds, ['player:u1'], 'recipients are derived by the GM from actor ownership, never from the request');
  game.user = { id: 'u1', isGM: false };
  await HomeSurfaceService.syncHomeTasksForActorId('a1', 'u1');
  assert.equal(emitted.length, 1, 'only a GM client executes the sync');
} finally {
  HomeFeedTaskEmitter.emitHomeTasks = realEmit;
  HomeFeedTaskEmitter.resolveProgressionTasks = realResolve;
}

console.log('holonet-home-task projection + sync scope: OK');
