import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Finding F-STO-001 (V2 realignment Phase 3C): a store purchase that CREATES a world actor (droid / vehicle) and then fails.
//
// Defect: TransactionEngine.executeMutationTransaction applied the merged plan WITHOUT `transactional: true`. ActorEngine creates the
// CREATE-bucket world actors first, and its created-actor cleanup runs only in transactional mode. On a later failure the engine restored only the
// purchaser's snapshot and returned `rolledBack: true`, leaving the purchased world actor behind without payment.
//
// This test runs the REAL TransactionEngine against the REAL ActorEngine.applyMutationPlan / _rollbackTransactionalPlan / restoreSnapshotVerified.
// Only the per-bucket stage functions, snapshot capture/restore and the world registry are seams (the same seams as tests/ti4c0-g06-rollback-
// verification.test.mjs). Level: L1 (one client, offline). No Foundry runtime claim.

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

// 1. REPRODUCTION: payment + a later failure must not leave the purchased world actor behind, and must not claim rolledBack unless verified.
{
  reset();
  stage.failAdd = true;
  const r = await buy();
  assert.equal(r.success, false, 'the purchase failed');
  assert.equal(createdActors().length, 0, 'no purchased droid remains in the world after the failed purchase');
  assert.equal(buyer.system.credits, 1000, 'the buyer was not charged');
  assert.equal(r.rolledBack, true, 'verified rollback of both the buyer and the created actor');
  ok('failed droid purchase leaves no orphan world actor and charges nothing; rolledBack is only claimed when verified');
}

// 2. If the created actor cannot be verified removed, the result must NOT claim rolledBack; it must say the purchase may exist.
{
  reset();
  stage.failAdd = true; stage.keepIds = ['world-drd1'];       // the delete call resolves but the actor is still in the registry
  const r = await buy();
  assert.equal(r.success, false);
  assert.equal(createdActors().length, 1, 'the orphan really is still present in this scenario');
  assert.notEqual(r.rolledBack, true, 'rolledBack must not be claimed while a created actor remains');
  assert.equal(r.indeterminate, true, 'the purchase may exist: report it as indeterminate so stock is held and the GM is told');
  assert.ok(Array.isArray(r.createdActorIds) ? r.createdActorIds.includes('world-drd1') : /world-drd1/.test(JSON.stringify(r)), 'the result names the actor that could not be removed');
  ok('an unverifiable created-actor cleanup is reported as indeterminate, never as rolledBack');
}

// 3. Successful purchase still works: actor created, credits charged, one transactional apply.
{
  reset();
  const r = await buy();
  assert.equal(r.success, true);
  assert.equal(createdActors().length, 1, 'the purchased droid exists');
  assert.equal(buyer.system.credits, 600, 'the buyer paid exactly the cost');
  ok('successful droid purchase creates the actor and charges exactly once');
}

// 4. Plans that create NO world actor keep the existing (non-transactional) path: no extra snapshot cost, unchanged failure reporting.
{
  reset();
  const itemOnly = { set: { 'flags.swse.note': 'x' } };
  stage.failAdd = false;
  const r = await buy(itemOnly);
  assert.equal(r.success, true);
  assert.equal(stage.applyCalls.at(-1).transactional, false, 'item-only purchases do not request the transactional mode');
  assert.equal(stage.applyCalls.at(-1).creates, 0);
  reset(); stage.failAdd = true;
  const r2 = await buy({ add: { items: [{ name: 'x' }] }, set: { 'flags.swse.note': 'x' } });
  assert.equal(r2.success, false);
  assert.equal(r2.rolledBack, true, 'item-only failure is still rolled back through the purchaser snapshot');
  ok('purchases that create no world actor are unchanged (non-transactional apply, same rollback result)');
}

// 5. A plan that creates world actors requests the transactional mode.
{
  reset();
  await buy();
  assert.equal(stage.applyCalls.at(-1).transactional, true, 'a plan with CREATE-bucket actors is applied transactionally');
  assert.equal(stage.applyCalls.at(-1).creates, 1);
  ok('plans that create world actors are applied in ActorEngine transactional mode');
}
console.log('store-purchase-created-actor-rollback: ok');
