import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// WP3-B: GM-authoritative player request route. Disabled by default and fail-closed; executes only with a verified sender (injected here — the
// production list of verified mechanisms is empty until live Gate 1 evidence exists), an owning sender, the executor lease, a matching digest.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const R = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-player-request-route.js');
const L = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-executor-lease.js');
const T = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-request-transport.js');
const C = await import('/systems/foundryvtt-swse/scripts/engine/equipment/equipment-state-coordinator.js');
const { REC } = await import('./helpers/equipment-coordinator-harness.mjs');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const TEST_MECH = 'test-injected-authenticated';
const setPath = (obj, path, value) => { const parts = path.split('.'); let node = obj; for (let i = 0; i < parts.length - 1; i++) node = (node[parts[i]] ??= {}); const last = parts.at(-1); if (last.startsWith('-=')) delete node[last.slice(2)]; else node[last] = JSON.parse(JSON.stringify(value)); };
const weapon = (id) => ({ id, name: 'Blade', type: 'weapon', flags: { swse: { canonicalWeapon: { identityKey: 'lightsaber-chassis-archaic-lightsaber' } } }, system: { activated: false, subtype: 'lightsaber', weaponCategory: 'lightsaber', ...REC('STOWED', null, []) } });
const readyIntent = { type: 'ready', itemId: 's', appendageIds: ['natural-arm-1'], grip: 'one-handed' };

async function world({ owner = 'p1', now = 1000 } = {}) {
  const items = [weapon('s')]; items.get = (id) => items.find((i) => i.id === id);
  const actor = { id: 'a1', type: 'character', items, system: { size: 'Medium' }, flags: { swse: {} }, ownership: { [owner]: 3 } };
  const users = { gm: { id: 'gm', isGM: true }, p1: { id: 'p1', isGM: false }, p2: { id: 'p2', isGM: false } };
  const log = { itemWrites: 0, journalWrites: 0, spends: [] };
  const coordinatorDeps = {
    loadSpecies: async () => ({ status: 'resolved', profile: { name: 'Human' }, reason: null, evidence: { speciesName: 'Human', variantId: null } }),
    ledger: new Map(), resolveActionCost: async () => 'move', isLightsaber: async () => false,
    writeItems: async (a, ups) => { log.itemWrites++; for (const u of ups) { const it = a.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(it, k, v); } },
    writeJournal: async (a, stored) => { log.journalWrites++; a.flags.swse.equipmentTxn = JSON.parse(JSON.stringify(stored)); },
    spendAction: async (_a, type, meta) => { log.spends.push({ type, meta }); return { allowed: true, committed: true }; },
    spendMarkerPresent: async (_a, id) => log.spends.some((s) => s.meta.requestId === id),
  };
  const store = L.memoryLeaseStore();
  const me = { userId: 'gm', sessionId: 'tab-1' };
  const t = { now };
  await L.claimLease(store, me, { now: t.now, isGm: true });
  const deps = { routeEnabled: () => true, verifiedMechanisms: [TEST_MECH], isGm: () => true, executorIdentity: me, leaseStore: store, now: () => t.now, getActor: (id) => (id === actor.id ? actor : null), getUser: (id) => users[id] ?? null, coordinatorDeps };
  const plan = await C.planEquipmentIntent(actor, readyIntent, coordinatorDeps);
  const env = R.buildEquipmentRequestEnvelope({ actorId: actor.id, requestId: 'req-1', intent: readyIntent, planDigest: plan.planDigest });
  return { actor, deps, log, env, store, me, t, sender: { userId: 'p1', mechanism: TEST_MECH } };
}
const nothingWritten = (w) => { assert.equal(w.log.itemWrites, 0); assert.equal(w.log.journalWrites, 0); assert.equal(w.log.spends.length, 0); assert.equal(w.actor.items.get('s').system.weaponPosture, 'STOWED'); };

{
  // production defaults: the route is off and no identity mechanism is verified
  assert.deepEqual([...R.VERIFIED_IDENTITY_MECHANISMS], []);
  const w = await world();
  const off = await R.handleEquipmentRequest(w.env, w.sender, { ...w.deps, routeEnabled: undefined });
  assert.equal(off.status, R.ROUTE_OUTCOME.ROUTE_DISABLED);
  const prodMech = await R.handleEquipmentRequest(w.env, { userId: 'p1', mechanism: R.CHAT_AUTHOR_MECHANISM }, { ...w.deps, verifiedMechanisms: undefined });
  assert.equal(prodMech.status, R.ROUTE_OUTCOME.IDENTITY_UNVERIFIED, 'the chat-author mechanism is not accepted until Gate 1 is verified');
  assert.equal((await R.handleEquipmentRequest(w.env, null, w.deps)).status, R.ROUTE_OUTCOME.IDENTITY_UNVERIFIED);
  nothingWritten(w);
  ok('1: by default the route is disabled and no sender mechanism is verified; nothing is written');
}
{
  const w = await world();
  for (const field of ['userId', 'senderUserId', 'requesterUserId', 'user']) {
    const r = await R.handleEquipmentRequest({ ...w.env, [field]: 'p1' }, w.sender, w.deps);
    assert.equal(r.status, R.ROUTE_OUTCOME.INVALID_ENVELOPE, field);
  }
  nothingWritten(w);
  ok('2: an envelope carrying any identity field is refused (identity never comes from the payload)');
}
{
  const w = await world();
  assert.equal((await R.handleEquipmentRequest(w.env, { userId: 'p2', mechanism: TEST_MECH }, w.deps)).status, R.ROUTE_OUTCOME.SENDER_NOT_PERMITTED);
  assert.equal((await R.handleEquipmentRequest(w.env, { userId: 'ghost', mechanism: TEST_MECH }, w.deps)).status, R.ROUTE_OUTCOME.SENDER_UNKNOWN);
  assert.equal((await R.handleEquipmentRequest({ ...w.env, actorId: 'nope' }, w.sender, w.deps)).status, R.ROUTE_OUTCOME.ACTOR_NOT_FOUND);
  const tampered = { ...w.env, intent: { ...w.env.intent, appendageIds: ['natural-arm-2'] } };
  assert.equal((await R.handleEquipmentRequest(tampered, w.sender, w.deps)).status, R.ROUTE_OUTCOME.INTENT_DIGEST_MISMATCH);
  assert.equal((await R.handleEquipmentRequest(w.env, w.sender, { ...w.deps, isGm: () => false })).status, R.ROUTE_OUTCOME.NOT_EXECUTOR);
  nothingWritten(w);
  ok('3: a non-owner, unknown sender, missing actor, altered intent or non-GM executor is refused before anything is written');
}
{
  // happy path with an injected verified identity; the request id survives to the journal and the spend; a resend is a duplicate, not a re-run
  const w = await world();
  const r = await R.handleEquipmentRequest(w.env, w.sender, w.deps);
  assert.equal(r.status, R.ROUTE_OUTCOME.EXECUTED); assert.equal(r.outcome.status, 'COMMITTED');
  assert.equal(w.actor.items.get('s').system.weaponPosture, 'READIED');
  const entry = w.actor.flags.swse.equipmentTxn.entries[0];
  assert.equal(entry.requestId, 'req-1'); assert.deepEqual(entry.executor, { userId: 'gm', epoch: 1 });
  assert.equal(w.log.spends.length, 1); assert.equal(w.log.spends[0].meta.requestId, 'req-1');
  const again = await R.handleEquipmentRequest(w.env, w.sender, w.deps);
  assert.equal(again.outcome.status, 'DUPLICATE_REPLAYED'); assert.equal(w.log.spends.length, 1);
  const conflict = R.buildEquipmentRequestEnvelope({ actorId: 'a1', requestId: 'req-1', intent: { type: 'stow', itemId: 's' } });
  assert.equal((await R.handleEquipmentRequest(conflict, w.sender, w.deps)).outcome.status, 'REQUEST_ID_CONFLICT');
  ok('4: with a verified sender the GM executes once through the coordinator (executor + epoch journaled); a resend replays, a reused id is a conflict');
}
{
  // lease: not held -> refused; lost before the item write -> the executor stops, journal stays unresolved for reconciliation
  const w = await world();
  w.t.now = 1000 + L.DEFAULT_LEASE_TTL_MS + 1; // expired
  assert.equal((await R.handleEquipmentRequest(w.env, w.sender, w.deps)).status, R.ROUTE_OUTCOME.NOT_EXECUTOR);
  nothingWritten(w);
  const v = await world();
  const origWriteJournal = v.deps.coordinatorDeps.writeJournal;
  v.deps.coordinatorDeps.writeJournal = async (a, stored) => { await origWriteJournal(a, stored); await v.store.write({ schemaVersion: 1, userId: 'gm', sessionId: 'tab-2', epoch: 2, expiresAt: 99999999 }); };
  const r = await R.handleEquipmentRequest(v.env, v.sender, v.deps);
  assert.equal(r.outcome.status, 'EXECUTOR_FENCED');
  assert.equal(v.log.itemWrites, 0, 'a superseded executor writes no Item'); assert.equal(v.log.spends.length, 0);
  assert.equal(v.actor.flags.swse.equipmentTxn.entries[0].phase, 'PREPARED', 'the unresolved entry is left for GM reconciliation');
  ok('5: an expired lease refuses the request; a lease lost mid-execution stops the executor before the next mutation step');
}
{
  // lease semantics
  const store = L.memoryLeaseStore(); const a = { userId: 'gm', sessionId: 't1' }; const b = { userId: 'gm2', sessionId: 't9' };
  assert.equal((await L.claimLease(store, a, { now: 0, isGm: false })).reason, 'not-a-gm');
  assert.deepEqual(await L.claimLease(store, a, { now: 0, isGm: true }), { claimed: true, epoch: 1, reason: null });
  assert.equal((await L.claimLease(store, a, { now: 10, isGm: true })).epoch, 1, 'renewal keeps the epoch');
  assert.equal((await L.claimLease(store, b, { now: 20, isGm: true })).reason, 'held-by-another-executor');
  assert.deepEqual(await L.claimLease(store, b, { now: 1 + L.DEFAULT_LEASE_TTL_MS + 20, isGm: true }), { claimed: true, epoch: 2, reason: null });
  assert.equal(await L.leaseFence(store, a, 1, () => 25)(), false, 'the superseded holder fails its fence');
  const racy = { read: async () => ({ schemaVersion: 1, userId: 'other', sessionId: 'x', epoch: 7, expiresAt: 1e12 }), write: async () => {} };
  assert.equal((await L.claimLease({ read: async () => null, write: racy.write, ...{ read: (() => { let first = true; return async () => (first ? (first = false, null) : racy.read()); })() } }, a, { now: 0, isGm: true })).reason, 'lost-claim-race');
  ok('6: the lease is GM-only, renews without a new epoch, refuses while held, takes over when expired, and detects a lost claim race on read-back');
}
{
  // transport: sender is the server-stored author and must equal the hook user; the system never installs it
  assert.equal(T.senderFromCreatedMessage({ author: { id: 'p1' } }, 'p2'), null);
  assert.deepEqual(T.senderFromCreatedMessage({ author: { id: 'p1' } }, 'p1'), { userId: 'p1', mechanism: R.CHAT_AUTHOR_MECHANISM });
  assert.deepEqual(T.installEquipmentRequestTransport({ hooks: { on: () => 1 }, enabled: true }), { installed: false, reason: 'identity-mechanism-unverified' });
  assert.deepEqual(T.installEquipmentRequestTransport({ hooks: { on: () => 1 } }), { installed: false, reason: 'route-disabled' });
  const w = await world();
  const replies = [];
  const handler = T.createRequestMessageHandler({ ...w.deps, verifiedMechanisms: [R.CHAT_AUTHOR_MECHANISM], createMessage: async (d) => replies.push(d) });
  const msg = { id: 'm1', author: { id: 'p1' }, flags: { swse: { [T.REQUEST_FLAG]: w.env } } };
  const res = await handler(msg, {}, 'p1');
  assert.equal(res.outcome.status, 'COMMITTED');
  assert.equal(await handler(msg, {}, 'p1'), null, 'the same created message is handled once');
  assert.deepEqual(replies[0].whisper, ['p1']); assert.equal(replies[0].flags.swse[T.REPLY_FLAG].requestId, 'req-1');
  const forged = await handler({ id: 'm2', author: { id: 'p1' }, flags: { swse: { [T.REQUEST_FLAG]: { ...w.env, requestId: 'req-2' } } } }, {}, 'gm');
  assert.equal(forged.status, R.ROUTE_OUTCOME.IDENTITY_UNVERIFIED, 'author and hook user disagree: no sender');
  const timed = await T.sendEquipmentRequest(w.env, { createMessage: async () => {}, gmUserIds: () => ['gm'], onReply: () => () => {}, timeoutMs: 5 });
  assert.deepEqual([timed.status, timed.requestId], ['UNKNOWN_OUTCOME', 'req-1']);
  ok('7: the chat transport derives the sender from the stored author + hook user, handles each creation once, replies to the sender, times out as UNKNOWN_OUTCOME with the same id, and refuses to install');
}
{
  // static: nothing in the shipped system installs the transport or enables the route
  const files = execFileSync('git', ['ls-files', 'scripts', 'index.js'], { cwd: new URL('..', import.meta.url).pathname }).toString().split('\n').filter((f) => f.endsWith('.js'));
  const users = files.filter((f) => !f.startsWith('scripts/engine/equipment/') && /equipment-request-transport|equipment-player-request-route|installEquipmentRequestTransport/.test(readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')));
  assert.deepEqual(users, [], 'no runtime module imports the player route or transport');
  assert.match(readFileSync(new URL('../scripts/engine/equipment/equipment-player-request-route.js', import.meta.url), 'utf8'), /VERIFIED_IDENTITY_MECHANISMS = Object\.freeze\(\[\]\)/);
  ok('8: no shipped module installs the transport or imports the route; the verified-mechanism list is empty');
}
console.log(`equipment-wp3b-player-request-route: ${n} checks ok`);
