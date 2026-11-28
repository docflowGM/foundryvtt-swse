import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// SSOT Priority 2: the character-sheet credit adjustment is a TransactionEngine adjustment (context `sheet-credit-adjustment`): the REAL TransactionEngine against the
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



import fs from 'node:fs';
const adjust = (amount) => TransactionEngine.executeCreditAdjustment({ actor: buyer, amount, reason: 'Character sheet credit adjustment', transactionContext: 'sheet-credit-adjustment' }, { source: 'sheet.test', validate: false, rederive: false });
reset(1000);
let r = await adjust(250);
assert.equal(r.success, true, JSON.stringify(r)); assert.equal(buyer.system.credits, 1250);
r = await adjust(-1250);
assert.equal(r.success, true); assert.equal(buyer.system.credits, 0);
r = await adjust(-1);
assert.equal(r.success, false); assert.match(String(r.error), /Insufficient credits/, 'an overdraw is refused by the engine (the sheet clamps the amount first)');
assert.equal(buyer.system.credits, 0);
// failure after the write is rolled back like any other adjustment
reset(1000);
const realApplyFn = SeamAE.applyMutationPlan;
SeamAE.applyMutationPlan = async function (actor, plan, options = {}) { setPath(actor, 'system.credits', plan.set['system.credits']); throw new Error('write failed after the adjustment landed'); };
r = await adjust(-300); SeamAE.applyMutationPlan = realApplyFn;
assert.equal(r.success, false); assert.equal(buyer.system.credits, 1000, 'the adjustment that landed before the failure was restored');
// the sheet routes through it and no longer writes the wallet itself
const sheet = fs.readFileSync('scripts/sheets/v2/character-like-sheet.js', 'utf8');
assert.match(sheet, /transactionContext: 'sheet-credit-adjustment'/);
assert.doesNotMatch(sheet, /'system\.credits': next/);
process.stdout.write('sheet-credit-adjustment-transaction: ok\n');
