import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// TI-2 (commerce / upgrade transaction integrity), promoted from the TI-0 reproductions TX-01 and TX-08. Real TransactionEngine, LedgerService,
// UpgradeService and SnapshotManager wrapper; the shim's ActorEngine is replaced by a small MODEL of applyMutationPlan that applies a plan in the
// engine's real bucket order (SET -> UPDATE) with injectable failures; snapshots are an in-memory model. Level: L1 (one client, offline).
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry = globalThis.foundry ?? {};
globalThis.foundry.utils = globalThis.foundry.utils ?? {};
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
const notes = { error: [], warn: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };

const { TransactionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js');
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
const { swseLogger } = await import('/systems/foundryvtt-swse/scripts/utils/logger.js');
const { UpgradeService } = await import('/systems/foundryvtt-swse/scripts/engine/upgrades/UpgradeService.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const setPath = (o, p, v) => { const parts = p.split('.'); let t = o; for (let i = 0; i < parts.length - 1; i++) t = (t[parts[i]] ??= {}); t[parts.at(-1)] = JSON.parse(JSON.stringify(v)); };
const silent = async (fn) => { const e = console.error; const w = console.warn; console.error = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.error = e; console.warn = w; } };

// ---- logger capture: nothing may claim "rollback successful" unless the restore really happened
const logged = [];
for (const lvl of ['info', 'warn', 'error']) { const real = swseLogger[lvl]; swseLogger[lvl] = (...a) => { logged.push(`${lvl}: ${a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ')}`); return real?.apply(swseLogger, a); }; }
const claimedRollback = () => logged.some((m) => /rollback successful|restore successful/i.test(m));

// ---- models
const model = { failAt: null, dropItem: false, onApply: null, applyCalls: 0 };
const snaps = []; const snapMode = { create: 'ok', retrievable: true, restore: 'ok', onCreate: null, restores: 0 };
const mkItem = () => ({ id: 'rifle1', name: 'Blaster Rifle', type: 'weapon', isEmbedded: true, system: { installedUpgrades: [] } });
const mkActor = (credits = 1000) => {
  const item = mkItem();
  const a = { id: 'buyer', name: 'Buyer', type: 'character', isOwner: true, system: { credits }, flags: {}, items: [item], getFlag(s, k) { return this.flags?.[s]?.[k]; }, toObject() { return JSON.parse(JSON.stringify({ system: this.system, items: this.items })); } };
  a.items.get = (id) => a.items.find((i) => i.id === id) ?? null;
  return a;
};
let actor = mkActor();
globalThis.game = { ...(globalThis.game ?? {}), actors: { get: (id) => (id === actor.id ? actor : null) }, user: { isGM: true, id: 'u1', name: 'GM' }, settings: { get: () => undefined } };
ActorEngine.applyMutationPlan = async (a, plan) => {
  model.applyCalls += 1;
  if (model.onApply) await model.onApply(a, plan);
  for (const [k, v] of Object.entries(plan.set ?? {})) setPath(a, k, v);                                   // SET first (credits)
  if (model.failAt === 'after-set') throw new Error('failure between the credit SET and the item UPDATE');
  for (const u of plan.update?.items ?? []) { if (model.dropItem) continue; const it = a.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(it, k, v); }   // UPDATE second (items)
  if (model.failAt === 'after-update') throw new Error('failure after the item UPDATE');
};
SnapshotManager.createSnapshot = async (a, label) => {
  if (snapMode.onCreate) await snapMode.onCreate(a);
  if (snapMode.create === 'throw') throw new Error('snapshot store unavailable');
  const snap = { schemaVersion: 2, scope: 'full-actor', timestamp: snaps.length + 1, label, data: JSON.parse(JSON.stringify({ credits: a.system.credits, upgrades: a.items.map((i) => [i.id, i.system.installedUpgrades]) })) };
  if (snapMode.retrievable) snaps.push(snap);
  return snap;
};
SnapshotManager.getSnapshot = (a, ts) => snaps.find((s) => s.timestamp === ts) ?? null;
SnapshotManager.restoreSnapshot = async (a, ts) => {
  snapMode.restores += 1;
  if (snapMode.restore === 'throw') throw new Error('restore blew up');
  if (snapMode.restore === 'false') return false;
  const s = snaps.find((x) => x.timestamp === ts); a.system.credits = s.data.credits; for (const [id, up] of s.data.upgrades) a.items.get(id).system.installedUpgrades = up; return true;
};
const reset = (credits = 1000) => { actor = mkActor(credits); Object.assign(model, { failAt: null, dropItem: false, onApply: null, applyCalls: 0 }); Object.assign(snapMode, { create: 'ok', retrievable: true, restore: 'ok', onCreate: null, restores: 0 }); snaps.length = 0; logged.length = 0; notes.error.length = notes.warn.length = notes.info.length = 0; TransactionEngine._mutationLocks.clear(); };
const plan = (up = [{ upgradeKey: 'x' }]) => ({ update: { items: [{ _id: 'rifle1', 'system.installedUpgrades': up }] } });
const run = (cost = 100) => TransactionEngine.executeMutationTransaction({ actor, mutationPlan: plan(), cost, transactionContext: 'owned-customization', audit: { itemName: 'x' } }, { source: 'ti2', validate: true, rederive: false });

// ------------------------------------------------------------------------------------------------ 2.1a TX-08a: recovery must be ESTABLISHED (D1)
{
  reset(); snapMode.create = 'throw';
  let r = await silent(run);
  assert.equal(r.success, false); assert.equal(r.refused, 'recovery-unavailable'); assert.match(r.error, /refused.*recovery/i); assert.equal(model.applyCalls, 0, 'nothing was written'); assert.equal(actor.system.credits, 1000); assert.deepEqual(actor.items[0].system.installedUpgrades, []);
  // a snapshot that "was created" but is not retrievable afterwards is not recovery
  reset(); snapMode.retrievable = false; r = await silent(run);
  assert.equal(r.success, false); assert.equal(r.refused, 'recovery-unavailable'); assert.equal(model.applyCalls, 0); assert.equal(actor.system.credits, 1000);
  // a legacy / non-full-actor snapshot cannot be restored exactly: also refused
  reset(); const realCreate = SnapshotManager.createSnapshot; SnapshotManager.createSnapshot = async (a, l) => { const s = await realCreate(a, l); s.schemaVersion = 1; return s; };
  r = await silent(run); SnapshotManager.createSnapshot = realCreate; assert.equal(r.refused, 'recovery-unavailable'); assert.equal(model.applyCalls, 0);
  // a zero-cost customization mutates too, so it is refused the same way
  reset(); snapMode.create = 'throw'; r = await silent(() => run(0)); assert.equal(r.refused, 'recovery-unavailable'); assert.equal(model.applyCalls, 0);
  // and with recovery established the same purchase proceeds exactly as before
  reset(); r = await run(); assert.equal(r.success, true); assert.equal(actor.system.credits, 900); assert.equal(actor.items[0].system.installedUpgrades.length, 1);
  ok('TI-2.1a (TX-08a): a purchase/customization is refused, with nothing changed, unless a retrievable full-actor recovery snapshot was established');
}
// ------------------------------------------------------------------------------------------------ 2.1b TX-08b: the restore outcome is observed, never assumed
{
  reset(); model.failAt = 'after-set';   // charged, then the Item write fails
  let r = await silent(run);
  assert.equal(r.success, false); assert.equal(r.rolledBack, true); assert.equal(r.rollbackFailed, undefined); assert.equal(actor.system.credits, 1000, 'restored'); assert.ok(claimedRollback(), 'a restore that happened may be logged as such');
  reset(); model.failAt = 'after-set'; snapMode.restore = 'false';   // the documented NON-THROWING failure
  r = await silent(run);
  assert.equal(r.success, false); assert.equal(r.rollbackFailed, true, 'a restore that returned false is a rollback FAILURE'); assert.match(r.error, /rollback failed/i); assert.equal(actor.system.credits, 900, 'the actor really is still charged'); assert.equal(claimedRollback(), false, 'and nothing logs "rollback successful"');
  reset(); model.failAt = 'after-set'; snapMode.restore = 'throw'; r = await silent(run); assert.equal(r.rollbackFailed, true); assert.match(r.error, /rollback failed/i);
  // the same honesty in the credit-adjustment twin
  reset(); model.failAt = 'after-set'; snapMode.restore = 'false';
  r = await silent(() => TransactionEngine.executeCreditAdjustment({ actor, amount: -50, reason: 'ti2', transactionContext: 'gm-credit-adjustment' }, { source: 'ti2', rederive: false }));
  assert.equal(r.success, false); assert.equal(r.rollbackFailed, true); assert.match(r.error, /rollback failed/i); assert.equal(claimedRollback(), false);
  ok('TI-2.1b (TX-08b): restoreSnapshot() returning false (or throwing) yields rollbackFailed and an error that says so; "rollback successful" is logged only for a real restore (purchase and credit adjustment)');
}
// ------------------------------------------------------------------------------------------------ 2.1c TX-08c: credits are computed from the freshest balance and the charge is observed
{
  reset(); snapMode.onCreate = async (a) => { a.system.credits += 500; };   // a concurrent +500 lands while the (slow) snapshot is being taken
  let r = await run(100);
  assert.equal(r.success, true); assert.equal(r.creditsBefore, 1500, 'the balance is read AFTER the snapshot'); assert.equal(actor.system.credits, 1400, 'the concurrent grant survives (the old order produced 900)');
  // a charge that is not what was planned is not reported as success, and is not "fixed" by a whole-actor restore
  reset(); model.onApply = async (a) => { setTimeout(() => {}, 0); }; const realApply = ActorEngine.applyMutationPlan;
  ActorEngine.applyMutationPlan = async (a, p) => { await realApply(a, p); a.system.credits = 777; };   // someone else's write replaced the balance
  r = await silent(run); ActorEngine.applyMutationPlan = realApply;
  assert.equal(r.success, false); assert.equal(r.indeterminate, true, 'unverifiable -> indeterminate'); assert.equal(r.evidence.observedCredits, 777); assert.equal(snapMode.restores, 0, 'no whole-actor restore that could revert the other writer');
  // insufficient funds after the fresh read
  reset(); snapMode.onCreate = async (a) => { a.system.credits = 50; }; r = await silent(() => run(100)); assert.equal(r.success, false); assert.match(r.error, /insufficient/i); assert.equal(model.applyCalls, 0);
  ok('TI-2.1c (TX-08c): the balance is re-read after the snapshot (a concurrent grant survives), the charge is verified after the write (otherwise indeterminate, no blind restore), funds are re-validated');
}
// ------------------------------------------------------------------------------------------------ 2.2 TX-01: UpgradeService installs and charges through the commerce authority
{
  const offer = { key: 'targeting-scope', name: 'Targeting Scope', allowed: true, cost: 500, slotCost: 1, restriction: 'common', description: '' };
  Object.defineProperty(UpgradeService, 'workflow', { configurable: true, get: () => ({ getFullCustomizationState: () => ({ availableUpgrades: [offer], customState: {} }) }) });
  const install = () => UpgradeService.applyUpgrade({ actor, itemId: 'rifle1', upgradeId: 'targeting-scope' });
  const items = () => actor.items[0].system.installedUpgrades;
  // success: one commerce transaction, charged once, installed once, audited
  reset(); let res = await install(); assert.equal(res.success, true); assert.equal(items().length, 1); assert.equal(items()[0].upgradeKey, 'targeting-scope'); assert.equal(actor.system.credits, 500); assert.equal(model.applyCalls, 1, 'ONE plan carries the charge and the Item change');
  assert.ok(Object.keys(actor.flags?.['foundryvtt-swse']?.transactions ?? {}).length === 1, 'and is recorded in the commerce audit ledger');
  // the credit SET lands before the Item UPDATE: a failure between them must not leave the actor charged-but-uninstalled
  reset(); model.failAt = 'after-set';
  await assert.rejects(silent(install), /failure between the credit SET/); assert.equal(items().length, 0); assert.equal(actor.system.credits, 1000, 'recovered: not charged, not installed');
  // failure after the Item write: the upgrade is not left installed unpaid
  reset(); model.failAt = 'after-update'; await assert.rejects(silent(install)); assert.equal(items().length, 0); assert.equal(actor.system.credits, 1000);
  // recovery itself failing is surfaced to the caller (never a silent success)
  reset(); model.failAt = 'after-set'; snapMode.restore = 'false'; await assert.rejects(silent(install), /rollback failed/i); assert.equal(actor.system.credits, 500, 'still charged: the caller was told');
  // no recovery -> refused before anything is written
  reset(); snapMode.create = 'throw'; await assert.rejects(silent(install), /refused/i); assert.equal(model.applyCalls, 0); assert.equal(items().length, 0); assert.equal(actor.system.credits, 1000);
  // insufficient funds: nothing written (unchanged behavior)
  reset(300); await assert.rejects(silent(install), /insufficient/i); assert.equal(model.applyCalls, 0); assert.equal(items().length, 0);
  // the plan "succeeded" but the Item was never written (a silent no-op): charged-but-not-installed is reported, not returned as success
  reset(); model.dropItem = true; await assert.rejects(silent(install), /could not be verified|not installed/i);
  // a double click: the second attempt is refused by the commerce lock, not installed twice
  reset(); let release; const gate = new Promise((r) => { release = r; }); model.onApply = async () => { await gate; };
  const first = install(); await new Promise((r) => setTimeout(r, 20)); const second = silent(install); await assert.rejects(second, /already in progress/i); release(); await first; assert.equal(items().length, 1); assert.equal(actor.system.credits, 500);
  ok('TI-2.2 (TX-01): an upgrade install and its charge go through ONE commerce transaction (audited); every failure leaves it neither installed-unpaid nor charged-uninstalled, a failed recovery is surfaced, and a double click cannot install twice');
}

// ------------------------------------------------------------------------------------------------ 2.3 TX-10 (store checkout): stock is returned only for a VERIFIED non-purchase
{
  const { StoreEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/store-engine.js');
  const policies = { blaster: { trackQuantity: true, quantity: 5 } };
  globalThis.game.settings = { settings: { has: () => true }, get: (_s, k) => (k === 'storeInventoryPolicies' ? JSON.parse(JSON.stringify(policies)) : (k === 'storeOpen' ? true : undefined)), set: async (_s, k, v) => { if (k === 'storeInventoryPolicies') { for (const key of Object.keys(policies)) delete policies[key]; Object.assign(policies, JSON.parse(JSON.stringify(v))); } return v; } };
  const realExec = TransactionEngine.executeMutationTransaction; StoreEngine._validatePricesAtPurchaseTime = async () => ({ valid: true });   // the price index is not under test
  const buy = async (outcome) => {
    reset(); policies.blaster.quantity = 5; TransactionEngine.executeMutationTransaction = async () => outcome;
    try { return await silent(() => StoreEngine.purchase({ actor, items: [{ id: 'blaster', name: 'Blaster', quantity: 1, cost: 100 }], totalCost: 100 })); } finally { TransactionEngine.executeMutationTransaction = realExec; }
  };
  let r = await buy({ success: true, transactionId: 't1' }); assert.equal(r.success, true); assert.equal(policies.blaster.quantity, 4, 'a purchase consumes stock');
  r = await buy({ success: false, transactionId: 't2', refused: 'recovery-unavailable', error: 'refused' }); assert.equal(policies.blaster.quantity, 5, 'a refused purchase (nothing changed) returns the stock');
  r = await buy({ success: false, transactionId: 't3', rolledBack: true, error: 'failed' }); assert.equal(policies.blaster.quantity, 5, 'a verified rollback returns the stock');
  r = await buy({ success: false, transactionId: 't4', error: 'Transaction already in progress' }); assert.equal(policies.blaster.quantity, 5, 'a plain failure (e.g. the commerce lock) returns the stock, as before');
  r = await buy({ success: false, transactionId: 't5', indeterminate: true, error: 'could not be verified' }); assert.equal(r.success, false); assert.equal(policies.blaster.quantity, 4, 'an UNVERIFIED purchase may have happened: the stock is NOT given back'); assert.equal(r.indeterminate, true);
  r = await buy({ success: false, transactionId: 't6', rollbackFailed: true, error: 'rollback failed' }); assert.equal(policies.blaster.quantity, 4, 'a failed rollback means the purchase may still exist: the stock is NOT given back'); assert.equal(r.rollbackFailed, true);
  ok('TI-2.3 (TX-10): store stock is returned only for a refused / rolled-back / plain-failed purchase; for an indeterminate or rollback-failed outcome it is held (the purchase may exist) and the outcome is passed through');
}

// ------------------------------------------------------------------------------------------------ 2.4 asset customization (droid / vehicle / follower droid) — one commerce authority
{
  globalThis.localStorage ??= { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  globalThis.foundry.applications = globalThis.foundry.applications ?? {};
  globalThis.foundry.applications.api = globalThis.foundry.applications.api ?? { ApplicationV2: class {}, HandlebarsApplicationV2: class {}, HandlebarsApplicationMixin: (B) => class extends B {} };
  const { registerFollowerDroidGarageHotfix } = await import('/systems/foundryvtt-swse/scripts/patches/follower-droid-garage-hotfix.js');
  registerFollowerDroidGarageHotfix();   // production registers this at init (runtime-bugfix-hotfixes-init.js); it REPLACES executeAssetCustomizationTransaction for follower droids
  const mkWallet = (credits = 1000) => { const a = { id: 'owner', name: 'Owner', type: 'character', isOwner: true, system: { credits }, flags: {}, items: [], getFlag(sc, k) { return this.flags?.[sc]?.[k]; }, toObject() { return JSON.parse(JSON.stringify({ system: this.system, items: this.items })); } }; a.items.get = () => null; return a; };
  const mkDroid = (id, follower) => { const a = { id, name: 'Droid', type: follower ? 'npc' : 'droid', isOwner: true, system: { credits: 0, marker: null, ...(follower ? { isFollower: true, isDroid: true, npcProfile: { owner: { actorId: 'owner' } } } : {}) }, flags: {}, items: [], getFlag(sc, k) { return this.flags?.[sc]?.[k]; }, toObject() { return JSON.parse(JSON.stringify({ system: this.system, items: this.items })); } }; a.items.get = () => null; return a; };
  let wallet; let droid; let failAsset = false;
  const world = new Map();
  globalThis.game.actors = { get: (id) => world.get(id) ?? null };
  const realApplyForAsset = ActorEngine.applyMutationPlan;
  ActorEngine.applyMutationPlan = async (a, plan, o) => { if (failAsset && a.id === 'fdroid' || failAsset && a.id === 'vdroid') { throw new Error('asset write failed'); } return realApplyForAsset(a, plan, o); };
  // the snapshot model restores credits for any actor (items are not involved here)
  SnapshotManager.createSnapshot = async (a, label) => { if (snapMode.onCreate) await snapMode.onCreate(a); if (snapMode.create === 'throw') throw new Error('snapshot store unavailable'); const snap = { schemaVersion: 2, scope: 'full-actor', timestamp: snaps.length + 1, actorId: a.id, label, data: JSON.parse(JSON.stringify({ system: a.system })) }; if (snapMode.retrievable) snaps.push(snap); return snap; };
  SnapshotManager.restoreSnapshot = async (a, ts) => { snapMode.restores += 1; if (snapMode.restore === 'throw') throw new Error('restore blew up'); if (snapMode.restore === 'false') return false; const sn = snaps.find((x) => x.timestamp === ts); a.system = JSON.parse(JSON.stringify(sn.data.system)); return true; };
  const setup = (follower, credits = 1000) => { reset(); failAsset = false; world.clear(); wallet = mkWallet(credits); droid = mkDroid(follower ? 'fdroid' : 'vdroid', follower); world.set('owner', wallet); world.set(droid.id, droid); };
  const customize = () => silent(() => TransactionEngine.executeAssetCustomizationTransaction({ actor: wallet, assetActor: droid, assetMutationPlan: { set: { 'system.marker': 'done' } }, cost: 200, transactionContext: 'owned-customization', audit: {} }, { source: 'ti2', validate: true, rederive: false }));
  for (const follower of [false, true]) {
    const who = follower ? 'follower droid (runtime-patched path)' : 'droid/vehicle asset';
    // success: charged once, asset changed once
    setup(follower); let r = await customize(); assert.equal(r.success, true, who); assert.equal(wallet.system.credits, 800); assert.equal(droid.system.marker, 'done');
    // recovery cannot be established -> refused, nothing changed (D1)
    setup(follower); snapMode.create = 'throw'; r = await customize(); assert.equal(r.success, false, who); assert.equal(r.refused, 'recovery-unavailable', `${who}: refused`); assert.equal(wallet.system.credits, 1000); assert.equal(droid.system.marker, null);
    // the asset write fails after the wallet was charged: both are restored and the restore is reported
    setup(follower); failAsset = true; r = await customize(); assert.equal(r.success, false); assert.equal(r.rolledBack === true || r.rolledBack === undefined, true); assert.equal(wallet.system.credits, 1000, `${who}: wallet restored`); assert.equal(droid.system.marker, null);
    // ... and when the restore does not happen the failure says so (never a plain error with the actor left charged)
    setup(follower); failAsset = true; snapMode.restore = 'false'; r = await customize(); assert.equal(r.success, false); assert.equal(r.rollbackFailed, true, `${who}: rollbackFailed`); assert.match(r.error, /rollback failed/i); assert.equal(wallet.system.credits, 800);
    // the balance is read after the snapshot: a concurrent grant survives
    setup(follower); snapMode.onCreate = async (a) => { if (a.id === 'owner') a.system.credits += 500; }; r = await customize(); assert.equal(r.success, true, who); assert.equal(wallet.system.credits, 1300, `${who}: 1500 - 200`);
  }
  ok('TI-2.4 (TX-08 + parallel follower path): asset customization is refused without recovery, reports a failed restore, reads the balance after the snapshot and verifies the charge — identically for droid/vehicle assets and for follower droids (whose runtime patch no longer carries its own commerce implementation)');
  ActorEngine.applyMutationPlan = realApplyForAsset;
}

console.log(`\nTI-2 commerce integrity: ${n} checks passed.`);
