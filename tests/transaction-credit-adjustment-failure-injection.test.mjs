import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// 3N-TE failure-injection coverage (credit adjustment: failure after the debit, verified vs unverified restore, snapshot precondition): the REAL TransactionEngine against the
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



const adjust = (amount = -300) => TransactionEngine.executeCreditAdjustment({ actor: buyer, amount, reason: 'gm correction', transactionContext: 'store-credit-adjustment' },
  { source: 'te-gap.test', validate: false, rederive: false });
const realApplyFn = SeamAE.applyMutationPlan;
let failApplyAfterWrite = false;
SeamAE.applyMutationPlan = async function (actor, plan, options = {}) {
  if (failApplyAfterWrite) { setPath(actor, 'system.credits', plan.set['system.credits']); throw new Error('write failed after the debit landed'); }
  return realApplyFn.call(this, actor, plan, options);
};

// 1. FAILURE AFTER DEBIT, restore verified: the engine puts the balance back and reports a definitive failure (not indeterminate).
{
  reset(); failApplyAfterWrite = true;
  const r = await adjust(-300);
  assert.equal(r.success, false);
  assert.equal(buyer.system.credits, 1000, 'the debit that landed before the failure was restored');
  assert.notEqual(r.indeterminate, true);
  assert.notEqual(r.rollbackFailed, true);
  assert.match(String(r.error), /write failed after the debit landed/);
  assert.equal(TransactionEngine._mutationLocks.size, 0);
  ok('credit adjustment: a failure after the debit with a verified restore leaves the balance unchanged and is a definitive failure');
}

// 2. FAILURE AFTER DEBIT, restore reports failure: indeterminate with partialMutationPossible, never an ordinary retryable failure.
{
  reset(); failApplyAfterWrite = true;
  const realRestore = SnapshotManager.restoreSnapshot;
  SnapshotManager.restoreSnapshot = async () => false;
  const r = await adjust(-300);
  SnapshotManager.restoreSnapshot = realRestore;
  assert.equal(r.success, false);
  assert.equal(r.indeterminate, true);
  assert.equal(r.rollbackFailed, true);
  assert.equal(r.partialMutationPossible, true);
  assert.equal(buyer.system.credits, 700, 'the debit stays visible in the state; the engine does not pretend it was undone');
  assert.equal(TransactionEngine._mutationLocks.size, 0);
  ok('credit adjustment: a failed restore after the debit is indeterminate with rollbackFailed/partialMutationPossible');
}

// 3. SNAPSHOT PRECONDITION: no snapshot -> refused BEFORE any write.
{
  reset(); failApplyAfterWrite = false;
  const realCreate = SnapshotManager.createSnapshot;
  SnapshotManager.createSnapshot = async () => { throw new Error('snapshot store unavailable'); };
  const before = stage.applyCalls.length;
  const r = await adjust(-300);
  SnapshotManager.createSnapshot = realCreate;
  assert.equal(r.success, false);
  assert.match(String(r.error), /refused/i);
  assert.equal(stage.applyCalls.length, before, 'no mutation plan was applied');
  assert.equal(buyer.system.credits, 1000);
  ok('credit adjustment: when the rollback snapshot cannot be created the adjustment is refused before any credit changes');
}

// 4. Insufficient funds for a correction is refused without a write; a credit still works and is a normal success.
{
  reset(); failApplyAfterWrite = false;
  const r = await adjust(-5000);
  assert.equal(r.success, false);
  assert.match(String(r.error), /Insufficient credits/);
  assert.equal(buyer.system.credits, 1000);
  const ok2 = await adjust(250);
  assert.equal(ok2.success, true);
  assert.equal(buyer.system.credits, 1250);
  ok('credit adjustment: overdraw is refused without a write; a credit succeeds exactly once');
}
console.log('transaction-credit-adjustment-failure-injection: ok');
