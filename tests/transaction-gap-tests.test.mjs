import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// 3N-TE gap tests (transfer legs failing after the debit, targeted compensation under an unrelated concurrent change, identity after recovery): the REAL TransactionEngine against the
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
const buy = (plan = dropletPlan()) => TransactionEngine.executeMutationTransaction({ actor: buyer, mutationPlan: plan, cost: 400, transactionContext: 'store-purchase', audit: { items: [{ name: 'R5 Unit' }] } },
  { source: 'te-gap.test', validate: false, rederive: false });
const createdActors = () => [...world.values()].filter((a) => a.id !== 'buyer');

// ---- two-actor world for transfers -------------------------------------------------------------------------------------------------------------------
const mk = (id, credits) => ({ ...mkPurchaser(credits), id, name: id });
let S, R;
const resetTwo = (cs = 1000, cr = 500) => { world.clear(); snaps.length = 0; S = mk('sender', cs); R = mk('recipient', cr); world.set('sender', S); world.set('recipient', R); Object.assign(stage, { failAdd: false, keepIds: [], applyCalls: [], deleteCalls: [] }); failOn = null; restoreFailFor = null; calls = {}; };
let failOn = null;          // { id, nth }: the nth credit write on that actor lands and then throws
let restoreFailFor = null;  // actor id whose whole-actor restore reports failure
let calls = {};
const wrapped = SeamAE.applyMutationPlan;
SeamAE.applyMutationPlan = async function (actor, plan, options = {}) {
  if (plan?.set?.['system.credits'] !== undefined && failOn && failOn.id === actor.id) {
    calls[actor.id] = (calls[actor.id] ?? 0) + 1;
    if (calls[actor.id] === failOn.nth) { setPath(actor, 'system.credits', plan.set['system.credits']); throw new Error(`write failed after the ${actor.id} write landed`); }
  }
  return wrapped.call(this, actor, plan, options);
};
const realRestoreSnapshot = SnapshotManager.restoreSnapshot;
SnapshotManager.restoreSnapshot = async (a, ts) => (restoreFailFor === a.id ? false : realRestoreSnapshot(a, ts));
const transfer = (amount = 200) => TransactionEngine.executeCreditTransfer({ fromActor: S, toActor: R, amount, reason: 'gap test', transactionContext: 'holonet-credit-transfer' }, { source: 'te-gap.test', validate: false, rederive: false });

// GAP 1a. The recipient leg fails AFTER its write landed; that leg restores verified; the sender's debit is refunded: both balances are back, outcome is compensated.
{
  resetTwo(); failOn = { id: 'recipient', nth: 1 };
  const r = await transfer(200);
  assert.equal(r.success, false); assert.equal(r.compensated, true);
  assert.equal(S.system.credits, 1000, 'sender refunded'); assert.equal(R.system.credits, 500, 'recipient write undone');
  assert.equal(TransactionEngine._mutationLocks.size, 0);
  ok('transfer: credit leg fails after landing, verified leg restore + sender refund -> both balances unchanged, compensated');
}
// GAP 1b. The recipient leg fails and its OWN restore fails: the recipient may hold the credits, so the sender is NOT refunded automatically (no minted credits).
{
  resetTwo(); failOn = { id: 'recipient', nth: 1 }; restoreFailFor = 'recipient';
  const r = await transfer(200);
  assert.equal(r.success, false); assert.equal(r.indeterminate, true);
  assert.equal(S.system.credits, 800, 'sender stays debited; never auto-refunded when the recipient state is unknown');
  assert.equal(R.system.credits, 700, 'the recipient write stays visible; the engine does not pretend it was undone');
  assert.ok(r.evidence?.debit && r.evidence?.credit, 'evidence names both legs');
  assert.equal(TransactionEngine._mutationLocks.size, 0);
  ok('transfer: unresolved recipient leg -> indeterminate, sender not refunded, evidence for both legs');
}
// GAP 1c. The recipient leg fails (restored) and the sender REFUND write fails (restored): last resort restores both actors from their pre-transfer snapshots.
{
  resetTwo(); failOn = { id: 'recipient', nth: 1 }; const refundFail = { id: 'sender', nth: 2 };
  const base = SeamAE.applyMutationPlan;
  SeamAE.applyMutationPlan = async function (actor, plan, options = {}) {
    if (plan?.set?.['system.credits'] !== undefined && actor.id === refundFail.id) {
      calls.senderWrites = (calls.senderWrites ?? 0) + 1;
      if (calls.senderWrites === refundFail.nth) { setPath(actor, 'system.credits', plan.set['system.credits']); throw new Error('refund write failed after landing'); }
    }
    return base.call(this, actor, plan, options);
  };
  const r = await transfer(200);
  SeamAE.applyMutationPlan = base;
  assert.equal(r.success, false); assert.equal(r.compensated, true); assert.equal(r.recovery, 'snapshot-restore');
  assert.equal(S.system.credits, 1000); assert.equal(R.system.credits, 500);
  ok('transfer: credit leg and refund both fail -> both actors restored from pre-transfer snapshots');
}

// GAP 2. TARGETED compensation under concurrent change (read-compare-restore). The refund writes ONLY the credit field and the audit flags (an unrelated
// concurrent edit to any other field cannot be reverted by it); if the balance itself moved after the charge, no refund is attempted.
{
  resetTwo(); const { compensateUnverified } = await import('/systems/foundryvtt-swse/scripts/engine/store/transaction-recovery.js');
  S.system.credits = 600; S.system.unrelated = 'edited by someone else meanwhile';
  const plans = []; const base = SeamAE.applyMutationPlan;
  SeamAE.applyMutationPlan = async function (actor, plan, options = {}) { plans.push(clone(plan)); return base.call(this, actor, plan, options); };
  const res = await compensateUnverified(TransactionEngine, S, { transactionId: 'tx-1', source: 'gap', normalizedCost: 400, creditsBefore: 1000, creditsAfter: 600, reason: 'test' });
  assert.equal(res.compensated, true); assert.equal(S.system.credits, 1000);
  assert.equal(S.system.unrelated, 'edited by someone else meanwhile', 'unrelated concurrent change preserved');
  assert.deepEqual(Object.keys(plans[0].set).sort(), ['flags.foundryvtt-swse.transactions.tx-1.compensatedReason', 'flags.foundryvtt-swse.transactions.tx-1.status', 'system.credits'], 'only the credit field and the audit flags are written');

  S.system.credits = 450; plans.length = 0;     // balance moved by another writer after the charge
  const res2 = await compensateUnverified(TransactionEngine, S, { transactionId: 'tx-2', source: 'gap', normalizedCost: 400, creditsBefore: 1000, creditsAfter: 600, reason: 'test' });
  SeamAE.applyMutationPlan = base;
  assert.equal(res2.indeterminate, true); assert.equal(plans.length, 0, 'no write attempted'); assert.equal(S.system.credits, 450);
  assert.equal(TransactionEngine._creditReconciliations.size, 0, 'the reconciliation guard is released');
  ok('targeted compensation: unrelated edits survive; a moved balance is reported, never overwritten');
}

// GAP 3. IDENTITY after recovery: a purchase that fails after a world actor was created is rolled back to the SAME buyer document (id, name, type, ownership)
// with no created actor left behind, no lock held, and a retry is a NEW transaction (distinct id), not a replay.
{
  resetTwo(); world.clear(); snaps.length = 0; buyer = mkPurchaser(1000); world.set('buyer', buyer); stage.failAdd = true;
  const idBefore = [buyer.id, buyer.name, buyer.type, buyer.isOwner];
  const first = await buy();
  assert.equal(first.success, false);
  assert.deepEqual([buyer.id, buyer.name, buyer.type, buyer.isOwner], idBefore, 'the same actor document identity after recovery');
  assert.equal(buyer.system.credits, 1000); assert.equal(createdActors().length, 0, 'no orphan created actor');
  assert.equal(TransactionEngine._mutationLocks.size, 0);
  stage.failAdd = false;
  const second = await buy();
  assert.equal(second.success, true); assert.notEqual(second.transactionId, first.transactionId, 'a retry is a new transaction');
  assert.equal(buyer.system.credits, 600);
  ok('recovery identity: same actor document, no orphans, no held lock, retry is a distinct transaction');
}
console.log('transaction-gap-tests: ok');
