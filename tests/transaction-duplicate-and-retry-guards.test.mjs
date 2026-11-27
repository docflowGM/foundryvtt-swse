import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// 3N-TE failure-injection coverage (duplicate request / retry after an indeterminate outcome / lock release): the REAL TransactionEngine against the
// REAL ActorEngine plan application, with the same offline seams as tests/store-purchase-created-actor-rollback.test.mjs (copied harness).
// Level: L1 (one client, offline). No Foundry runtime and no cross-client claim: the in-flight lock is per-client memory.

globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications = globalThis.foundry.applications ?? { api: { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => B } };
globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.ui = { notifications: { warn() {}, info() {}, error() {} } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };

const { TransactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js');
const SeamAE = (await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js')).ActorEngine;   // the object TransactionEngine imports
const RealAE = (await import(new URL('../scripts/governance/actor-engine/actor-engine.js', import.meta.url).href)).ActorEngine;
const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
const { swseLogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
for (const lvl of ['info', 'warn', 'error', 'debug', 'log']) if (swseLogger[lvl]) swseLogger[lvl] = () => {};
// give the object TransactionEngine uses the REAL plan application + rollback machinery
const REAL = ['applyMutationPlan', '_rollbackTransactionalPlan', 'restoreSnapshotVerified', '_validateRecoverySnapshot', '_rewriteTemporaryIds'];
for (const k of REAL) SeamAE[k] = RealAE[k];

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const clone = (v) => JSON.parse(JSON.stringify(v));
const setPath = (o, p, v) => { const parts = p.split('.'); let t = o; for (let i = 0; i < parts.length - 1; i++) t = (t[parts[i]] ??= {}); t[parts.at(-1)] = clone(v); };

// ------------------------------------------------------------------ world model
const world = new Map();               // game.actors registry
const stage = { failAdd: false, keepIds: [], applyCalls: [], deleteCalls: [] };
const snaps = [];
const mkPurchaser = (credits = 1000) => ({ id: 'buyer', name: 'Buyer', type: 'character', isOwner: true, system: { credits }, flags: {}, items: [], effects: [],
  getFlag(s, k) { return this.flags?.[s]?.[k]; }, toObject() { return clone({ name: this.name, system: this.system, items: [], effects: [] }); } });
let buyer = mkPurchaser();
const reset = (credits = 1000) => { world.clear(); buyer = mkPurchaser(credits); world.set(buyer.id, buyer); Object.assign(stage, { failAdd: false, keepIds: [], applyCalls: [], deleteCalls: [] }); snaps.length = 0; };
globalThis.game = { ...(globalThis.game ?? {}), actors: { get: (id) => world.get(id) }, user: { isGM: true, id: 'u1', name: 'GM' }, settings: { get: () => undefined } };
globalThis.Actor = { deleteDocuments: async (ids) => { stage.deleteCalls.push(ids); for (const id of ids) if (!stage.keepIds.includes(id)) world.delete(id); return ids.map((id) => ({ id })); } };

// TransactionEngine's own whole-actor recovery (credits only, in this model)
SnapshotManager.createSnapshot = async (a, label) => { const s = { schemaVersion: 2, scope: 'full-actor', timestamp: snaps.length + 1, label, data: { credits: a.system.credits } }; snaps.push(s); return s; };
SnapshotManager.getSnapshot = (a, ts) => snaps.find((s) => s.timestamp === ts) ?? null;
SnapshotManager.restoreSnapshot = async (a, ts) => { const s = snaps.find((x) => x.timestamp === ts); a.system.credits = s.data.credits; return true; };

// plan-stage seams on the object ActorEngine methods run against
SeamAE._validateMutationPlan = () => {};
SeamAE.recalcAll = async () => {};
SeamAE._applyCreateOps = async (specs, tempIdMap) => { for (const spec of specs) { const id = `world-${spec.temporaryId}`; tempIdMap[spec.temporaryId] = id; world.set(id, { id, name: spec.data?.name, type: spec.type }); } };
SeamAE._applyDeleteOps = async () => {};
SeamAE._applySetOps = async (a, set) => { for (const [k, v] of Object.entries(set ?? {})) setPath(a, k, v); };
SeamAE._applyUpdateOps = async () => {};
SeamAE._applyAddOps = async () => { if (stage.failAdd) throw new Error('embedded add failed after the world actor was created'); };
SeamAE.captureRecoverySnapshot = async (a) => ({ schemaVersion: 2, scope: 'full-actor', items: [], effects: [], data: { credits: a.system.credits } });
SeamAE.restoreFromSnapshot = async (a, snap) => { a.system.credits = snap.data.credits; return { success: true, exact: true, usable: true, requiresManualReview: false, verification: { rootMatched: true, itemsMatched: true, effectsMatched: true } }; };
const realApply = SeamAE.applyMutationPlan;
SeamAE.applyMutationPlan = async function (actor, plan, options = {}) { stage.applyCalls.push({ transactional: options.transactional === true, creates: plan?.create?.actors?.length ?? 0 }); return realApply.call(this, actor, plan, options); };

const dropletPlan = () => ({ create: { actors: [{ temporaryId: 'drd1', type: 'droid', data: { name: 'R5 Unit', type: 'droid', system: {} } }] } });
const buy = (plan = dropletPlan()) => TransactionEngine.executeMutationTransaction({ actor: buyer, mutationPlan: plan, cost: 400, transactionContext: 'store-purchase', audit: { items: [{ name: 'R5 Unit', cost: 400 }] } },
  { source: 'f-sto-001.test', validate: false, rederive: false });
const createdActors = () => [...world.values()].filter((a) => a.id !== 'buyer');


// 1. DUPLICATE REQUEST: a second identical purchase submitted while the first is in flight is refused and never debits twice.
{
  reset();
  const first = buy();
  const second = buy();
  const [a, b] = await Promise.all([first, second]);
  const results = [a, b];
  assert.equal(results.filter((r) => r.success === true).length, 1, 'exactly one of two concurrent identical purchases succeeds');
  const refused = results.find((r) => r.success !== true);
  assert.match(String(refused.error), /already in progress/i);
  assert.equal(buyer.system.credits, 600, 'the buyer is debited exactly once');
  assert.equal(createdActors().length, 1, 'exactly one droid exists');
  ok('a concurrent duplicate purchase is refused with no second debit and no second asset');
}

// 2. LOCK RELEASE: a failed purchase releases the in-flight lock, so a later explicit purchase can proceed (and is a NEW transaction).
{
  reset();
  stage.failAdd = true;
  const failed = await buy();
  assert.equal(failed.success, false);
  assert.equal(TransactionEngine._mutationLocks.size, 0, 'no in-flight lock survives a failed purchase');
  stage.failAdd = false;
  const again = await buy();
  assert.equal(again.success, true);
  assert.notEqual(again.transactionId, failed.transactionId, 'the second attempt is a distinct transaction');
  assert.equal(buyer.system.credits, 600);
  ok('after a clean failure the lock is released and a deliberate second attempt is a new transaction charged once');
}

// 3. NO AUTO-RETRY AFTER INDETERMINATE: the engine applies the plan exactly once; an unverifiable cleanup is reported, never retried silently.
{
  reset();
  stage.failAdd = true; stage.keepIds = ['world-drd1'];
  const calls0 = stage.applyCalls.length;
  const r = await buy();
  assert.equal(r.indeterminate, true);
  assert.equal(stage.applyCalls.length - calls0, 1, 'the engine made exactly one apply attempt (no automatic retry)');
  assert.equal(TransactionEngine._mutationLocks.size, 0, 'the lock is released even though the outcome is indeterminate');
  ok('an indeterminate outcome is reported once; the engine does not retry the purchase on its own');
}
console.log('transaction-duplicate-and-retry-guards: ok');
