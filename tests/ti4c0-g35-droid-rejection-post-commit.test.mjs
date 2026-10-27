/**
 * TI4-C0 / G35 — GMApprovalOperationsService.rejectDroid() must treat the successful `REJECTED` state update as the commit point: everything after it
 * (build history, the `swseApprovalResolved` hook, the UI refresh) is post-commit bookkeeping that can never turn a committed rejection into a reported
 * failure, and the hook must carry the right owner / droid / decision data.
 *
 * Defect: after `system.droidSystems.stateMode` was set to REJECTED and the build history written, the hook payload referenced `ownerActor`, which was
 * never declared in rejectDroid → ReferenceError → the surrounding catch announced "Failed to reject droid" and returned false although the droid was
 * already REJECTED (and a retry then finds a droid that is no longer pending).
 *
 * Real production code under test: GMApprovalOperationsService.rejectDroid (directly and through denyRequest('droid:<id>')), resolveDroidOwnerActor,
 * _afterCommit / _reportCommitted. Narrowly injected: game.actors, ActorEngine.updateActor (a model applying dotted-path updates to a plain droid, able to
 * fail per key), Hooks.call (recorded, able to throw) and _resetApprovalState (recorded, able to throw). Level: L1 (one client, offline).
 *
 * The runner RECORDS each case's failure so a fail-before run shows exactly which behaviours are missing.
 */
import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

globalThis.window = globalThis.window || {};
window.addEventListener ??= () => {}; window.removeEventListener ??= () => {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B, DialogV2: class {} } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
const notes = { error: [], warn: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(String(m)), info: (m) => notes.info.push(String(m)), error: (m) => notes.error.push(String(m)) } };

const { GMApprovalOperationsService: Svc } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMApprovalOperationsService.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { SWSELogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
for (const level of ['log', 'info', 'warn', 'error', 'debug']) if (SWSELogger?.[level]) SWSELogger[level] = () => {};

const clone = (v) => JSON.parse(JSON.stringify(v));
const setPath = (o, p, v) => { const parts = p.split('.'); let t = o; for (let i = 0; i < parts.length - 1; i++) t = (t[parts[i]] ??= {}); t[parts.at(-1)] = clone(v); };
const saved = { update: ActorEngine.updateActor, reset: Svc._resetApprovalState, hookCall: globalThis.Hooks, game: globalThis.game };

const probe = { updates: [], hooks: [], resets: 0, failKeys: new Set(), failHook: false, failReset: false };
let droid; let owner;
function mkDroid(over = {}) {
  return { id: 'dr1', name: 'Droid One', type: 'droid', system: { droidSystems: { stateMode: 'PENDING', buildHistory: [{ action: 'submitted' }], ownerActorId: 'own1' } }, flags: {}, ...over };
}
function install({ withOwner = true, droidOver = {} } = {}) {
  Object.assign(probe, { updates: [], hooks: [], resets: 0, failHook: false, failReset: false }); probe.failKeys = new Set();
  notes.error.length = 0; notes.warn.length = 0; notes.info.length = 0;
  owner = { id: 'own1', name: 'Owner One', type: 'character', system: { credits: 1000 } };
  droid = mkDroid(droidOver);
  if (!withOwner) droid.system.droidSystems.ownerActorId = undefined;
  const actors = new Map([[droid.id, droid], ...(withOwner ? [[owner.id, owner]] : [])]);
  globalThis.game = { ...(saved.game ?? {}), user: { id: 'gm', name: 'GM Name', isGM: true }, users: [], actors: { get: (id) => actors.get(id) ?? null } };
  ActorEngine.updateActor = async (actor, data) => {
    probe.updates.push(clone(data));
    for (const k of Object.keys(data)) if (probe.failKeys.has(k)) throw new Error(`write of ${k} refused`);
    for (const [k, v] of Object.entries(data)) setPath(actor, k, v);
    return actor;
  };
  globalThis.Hooks = { call: (name, payload) => { probe.hooks.push({ name, payload }); if (probe.failHook) throw new Error('listener exploded'); return true; }, callAll() {}, on() {}, once() {} };
  Svc._resetApprovalState = async () => { probe.resets++; if (probe.failReset) throw new Error('render exploded'); };
}
function restoreAll() { ActorEngine.updateActor = saved.update; Svc._resetApprovalState = saved.reset; globalThis.Hooks = saved.hookCall; globalThis.game = saved.game; }
const host = { selectedApprovalKey: 'droid:dr1' };
const state = () => droid.system.droidSystems.stateMode;
const history = () => droid.system.droidSystems.buildHistory;
const resolved = () => probe.hooks.filter((h) => h.name === 'swseApprovalResolved');

const results = [];
async function check(name, fn) {
  try { await fn(); results.push({ name, ok: true }); console.log(`  PASS  ${name}`); }
  catch (e) { results.push({ name, ok: false, error: e.message.split('\n')[0] }); console.log(`  FAIL  ${name}\n        -> ${e.message.split('\n')[0]}`); }
  finally { restoreAll(); }
}

await check('1. a normal rejection moves the droid PENDING → REJECTED, records the history entry, succeeds and reports success (no failure notice)', async () => {
  install();
  const r = await Svc.rejectDroid(host, 'dr1', 'Over budget');
  assert.equal(r, true);
  assert.equal(state(), 'REJECTED');
  const entry = history().at(-1);
  assert.equal(entry.action, 'rejected'); assert.equal(entry.reason, 'Over budget'); assert.equal(history().length, 2, 'the earlier history is kept');
  assert.equal(notes.error.length, 0, 'no failure announced'); assert.equal(notes.warn.length, 0);
  assert.equal(notes.info.length, 1); assert.match(notes.info[0], /Droid One.*rejected.*Over budget/);
  assert.equal(probe.resets, 1, 'the approval UI state was refreshed');
});

await check('2. the swseApprovalResolved hook receives the correct droid, owner and decision', async () => {
  install();
  await Svc.rejectDroid(host, 'dr1', 'Over budget');
  assert.equal(resolved().length, 1);
  const p = resolved()[0].payload;
  assert.equal(p.decision, 'denied'); assert.equal(p.reason, 'Over budget'); assert.equal(p.decidedBy, 'GM Name');
  assert.equal(p.approval.id, 'droid-dr1'); assert.equal(p.approval.type, 'droid'); assert.equal(p.approval.draftActorId, 'dr1'); assert.equal(p.approval.draftData.name, 'Droid One');
  assert.equal(p.approval.ownerActorId, 'own1'); assert.equal(p.approval.ownerActorName, 'Owner One');
  assert.equal(p.ownerActor, owner); assert.equal(p.ownerActorId, 'own1'); assert.equal(p.actor, owner, 'the notified actor is the owner');
  assert.equal(p.targetActor, droid); assert.equal(p.targetActorId, 'dr1');
});

await check('3. a droid WITHOUT a resolvable owner can still be rejected (rejection does not require an owner)', async () => {
  install({ withOwner: false });
  const r = await Svc.rejectDroid(host, 'dr1', 'No owner');
  assert.equal(r, true); assert.equal(state(), 'REJECTED');
  assert.equal(notes.error.length, 0);
  const p = resolved()[0].payload;
  assert.equal(p.ownerActorId, null); assert.equal(p.ownerActor ?? null, null); assert.equal(p.approval.ownerActorId, null); assert.equal(p.approval.ownerActorName, null);
  assert.equal(p.actor, droid, 'with no owner the droid itself is the payload actor'); assert.equal(p.targetActor, droid); assert.equal(p.decision, 'denied');
});

await check('4. a hook failure AFTER the commit does not report the rejection as failed', async () => {
  install(); probe.failHook = true;
  const r = await Svc.rejectDroid(host, 'dr1', 'x');
  assert.equal(r, true, 'the rejection is committed: success is reported');
  assert.equal(state(), 'REJECTED');
  assert.equal(notes.error.length, 0, 'no "Failed to reject" announcement');
  assert.equal(notes.warn.length, 1); assert.match(notes.warn[0], /resolved hook/i); assert.match(notes.warn[0], /reject/i); assert.doesNotMatch(notes.warn[0], /do not approve/i);
  assert.equal(probe.resets, 1, 'the later refresh step still ran');
});

await check('5. a build-history write failure AFTER the commit does not misrepresent the outcome; the hook and refresh still run', async () => {
  install(); probe.failKeys.add('system.droidSystems.buildHistory');
  const r = await Svc.rejectDroid(host, 'dr1', 'x');
  assert.equal(r, true); assert.equal(state(), 'REJECTED');
  assert.equal(notes.error.length, 0);
  assert.equal(notes.warn.length, 1); assert.match(notes.warn[0], /build history/i);
  assert.equal(resolved().length, 1, 'the hook still fired'); assert.equal(probe.resets, 1);
});

await check('6. a UI-refresh failure AFTER the commit does not misrepresent the outcome', async () => {
  install(); probe.failReset = true;
  const r = await Svc.rejectDroid(host, 'dr1', 'x');
  assert.equal(r, true); assert.equal(state(), 'REJECTED');
  assert.equal(notes.error.length, 0); assert.equal(notes.warn.length, 1); assert.match(notes.warn[0], /refresh/i);
  assert.equal(resolved().length, 1);
});

await check('7. all three post-commit steps failing together is still a committed rejection with ONE warning listing them', async () => {
  install(); probe.failKeys.add('system.droidSystems.buildHistory'); probe.failHook = true; probe.failReset = true;
  const r = await Svc.rejectDroid(host, 'dr1', 'x');
  assert.equal(r, true); assert.equal(state(), 'REJECTED'); assert.equal(notes.error.length, 0);
  assert.equal(notes.warn.length, 1); for (const label of [/build history/i, /resolved hook/i, /refresh/i]) assert.match(notes.warn[0], label);
});

await check('8. a failed initial state update does NOT claim a rejection: failure reported, droid still PENDING, no history, no hook, no success notice', async () => {
  install(); probe.failKeys.add('system.droidSystems.stateMode');
  const r = await Svc.rejectDroid(host, 'dr1', 'x');
  assert.equal(r, false);
  assert.equal(state(), 'PENDING');
  assert.equal(history().length, 1, 'no history entry was written'); assert.equal(probe.updates.length, 1, 'only the (refused) state write was attempted');
  assert.equal(resolved().length, 0, 'no hook for a rejection that did not happen'); assert.equal(probe.resets, 0);
  assert.equal(notes.info.length, 0); assert.equal(notes.error.length, 1); assert.match(notes.error[0], /Failed to reject droid/i);
});

await check('9. a rejected droid cannot be rejected again through the pending-only route (no second write, hook or success notice)', async () => {
  install();
  assert.equal(await Svc.rejectDroid(host, 'dr1', 'first'), true);
  const updatesBefore = probe.updates.length; const hooksBefore = probe.hooks.length; notes.info.length = 0; notes.warn.length = 0; notes.error.length = 0;
  const again = await Svc.rejectDroid(host, 'dr1', 'second');
  assert.equal(again, false);
  assert.equal(probe.updates.length, updatesBefore); assert.equal(probe.hooks.length, hooksBefore);
  assert.equal(notes.info.length, 0); assert.equal(notes.warn.length, 1); assert.match(notes.warn[0], /not pending approval/i);
  assert.equal(history().filter((h) => h.action === 'rejected').length, 1, 'exactly one rejection is recorded');
});

await check('10. the public deny route (denyRequest "droid:<id>") behaves the same: committed rejection, correct hook', async () => {
  install();
  const r = await Svc.denyRequest(host, 'droid:dr1', 'Via route');
  assert.equal(r, true); assert.equal(state(), 'REJECTED'); assert.equal(notes.error.length, 0);
  assert.equal(resolved()[0].payload.ownerActorId, 'own1'); assert.equal(resolved()[0].payload.reason, 'Via route');
});

await check('11. unchanged guards: an unknown actor, and a droid that is not PENDING, are refused without any write', async () => {
  install();
  assert.equal(await Svc.rejectDroid(host, 'ghost', 'x'), false); assert.match(notes.error[0], /Actor not found/);
  droid.system.droidSystems.stateMode = 'FINALIZED'; notes.error.length = 0;
  assert.equal(await Svc.rejectDroid(host, 'dr1', 'x'), false); assert.match(notes.warn.at(-1), /not pending approval/i);
  assert.equal(probe.updates.length, 0); assert.equal(probe.hooks.length, 0);
});

await check('12. the shared commit helpers keep their existing (approval) wording and behaviour for every other caller', async () => {
  notes.warn.length = 0; notes.info.length = 0;
  Svc._reportCommitted([], 'Approved: thing');
  assert.deepEqual(notes.info, ['Approved: thing']);
  Svc._reportCommitted(['refresh: boom'], 'Approved: thing');
  assert.match(notes.warn[0], /Approved: thing — but some follow-up steps failed \(refresh: boom\)\. The approval itself is committed; do not approve it again\./);
  const failures = []; await Svc._afterCommit(failures, 'x', async () => { throw new Error('bad'); });
  assert.deepEqual(failures, ['x: bad']);
});

const failed = results.filter((r) => !r.ok);
console.log(`\nTI4-C0 G35 droid rejection post-commit integrity: ${results.length - failed.length}/${results.length} passed`);
if (failed.length) { console.log('FAILED:'); for (const f of failed) console.log(`  - ${f.name}: ${f.error}`); process.exit(1); }
