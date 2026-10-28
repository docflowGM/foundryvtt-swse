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
const model = { failAt: null, dropItem: false, onApply: null, applyCalls: 0, failNth: null, failWriteN: null, writeCounts: {} };
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
  if (model.failNth && model.applyCalls === model.failNth) throw new Error('write number ' + model.applyCalls + ' failed');
  if (plan.set?.['system.credits'] !== undefined) {   // per-actor credit-write counter, for the two-actor (transfer) cases
    model.writeCounts[a.id] = (model.writeCounts[a.id] ?? 0) + 1;
    if (model.failWriteN?.[a.id]?.includes(model.writeCounts[a.id])) throw new Error('credit write ' + model.writeCounts[a.id] + ' for ' + a.id + ' failed');
  }
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
  const snap0 = snaps.find((x) => x.timestamp === ts); const lab = snapMode.restoreLabel;
  const mode = (lab && snap0 && lab.re.test(snap0.label) && (!lab.actor || lab.actor === a.id)) ? lab.mode : (snapMode.restoreBy?.[a.id] ?? snapMode.restore);
  if (mode === 'throw') throw new Error('restore blew up');
  if (mode === 'false') return false;
  const s = snaps.find((x) => x.timestamp === ts); a.system.credits = s.data.credits; for (const [id, up] of s.data.upgrades) a.items.get(id).system.installedUpgrades = up; return true;
};
const reset = (credits = 1000) => { actor = mkActor(credits); Object.assign(model, { failAt: null, dropItem: false, onApply: null, applyCalls: 0, failNth: null, failWriteN: null, writeCounts: {} }); Object.assign(snapMode, { create: 'ok', retrievable: true, restore: 'ok', onCreate: null, restores: 0, restoreBy: null, restoreLabel: null }); snaps.length = 0; logged.length = 0; notes.error.length = notes.warn.length = notes.info.length = 0; TransactionEngine._mutationLocks.clear(); };
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
  SnapshotManager.restoreSnapshot = async (a, ts) => { snapMode.restores += 1; const snap0 = snaps.find((x) => x.timestamp === ts); const lab = snapMode.restoreLabel; const mode = (lab && snap0 && lab.re.test(snap0.label) && (!lab.actor || lab.actor === a.id)) ? lab.mode : (snapMode.restoreBy?.[a.id] ?? snapMode.restore); if (mode === 'throw') throw new Error('restore blew up'); if (mode === 'false') return false; const sn = snaps.find((x) => x.timestamp === ts); a.system = JSON.parse(JSON.stringify(sn.data.system)); return true; };
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

// ================================================================================================ independent-review corrections (TI2-R1 / R2 / R3 + post-commit hooks)
const hooksReal = globalThis.Hooks;
const throwOn = (names) => { globalThis.Hooks = { ...hooksReal, callAll: (name, ...rest) => { if (names.includes(name)) throw new Error(`listener for ${name} threw`); return hooksReal.callAll?.(name, ...rest); } }; };
const restoreHooks = () => { globalThis.Hooks = hooksReal; };
const ledgerOf = (a) => Object.values(a.flags?.['foundryvtt-swse']?.transactions ?? {});
const worldFor = (...as) => { const m = new Map(as.map((x) => [x.id, x])); globalThis.game.actors = { get: (id) => m.get(id) ?? null }; };

// ------------------------------------------------------------------------------------------------ 2.5 TI2-R1: the Item is verified INSIDE the transaction; a failed verification is compensated or unresolved
{
  const offer = { key: 'targeting-scope', name: 'Targeting Scope', allowed: true, cost: 500, slotCost: 1, restriction: 'common', description: '' };
  Object.defineProperty(UpgradeService, 'workflow', { configurable: true, get: () => ({ getFullCustomizationState: () => ({ availableUpgrades: [offer], customState: {} }) }) });
  const install = () => UpgradeService.applyUpgrade({ actor, itemId: 'rifle1', upgradeId: 'targeting-scope' });
  // the plan "succeeds" but the Item change never persists: the charge is compensated field-by-field, the audit record says so, NO whole-actor restore
  reset(); worldFor(actor); model.dropItem = true;
  await assert.rejects(silent(install), /could not be verified|not installed/i);
  assert.equal(actor.system.credits, 1000, 'the verified-uninstalled charge was refunded'); assert.equal(actor.items[0].system.installedUpgrades.length, 0); assert.equal(snapMode.restores, 0, 'no whole-actor restore');
  assert.equal(model.applyCalls, 2, 'one transaction plan + one targeted compensation write'); assert.equal(ledgerOf(actor).length, 1); assert.equal(ledgerOf(actor)[0].status, 'Compensated', 'the audit record is not left saying "Success"');
  // engine level: the same outcome as a structured result
  reset(); worldFor(actor); model.dropItem = true;
  let r = await silent(() => TransactionEngine.executeMutationTransaction({ actor, mutationPlan: plan(), cost: 100, transactionContext: 'owned-customization', verify: async (a) => ({ ok: a.items.get('rifle1').system.installedUpgrades.length > 0, reason: 'upgrade missing' }) }, { source: 'ti2', rederive: false }));
  assert.equal(r.success, false); assert.equal(r.verificationFailed, true); assert.equal(r.compensated, true); assert.notEqual(r.indeterminate, true); assert.equal(actor.system.credits, 1000);
  // the verification callback itself throwing is a failed verification, not a success
  reset(); worldFor(actor); r = await silent(() => TransactionEngine.executeMutationTransaction({ actor, mutationPlan: plan(), cost: 100, transactionContext: 'owned-customization', verify: async () => { throw new Error('reader blew up'); } }, { source: 'ti2', rederive: false }));
  assert.equal(r.success, false); assert.equal(r.verificationFailed, true); assert.equal(actor.system.credits, 1000);
  // the compensation write itself fails: unresolved (never "compensated"), evidence preserved, no retry, no whole-actor restore
  reset(); worldFor(actor); model.dropItem = true; model.failNth = 2;
  await assert.rejects(silent(install), /unresolved|could not be verified/i);
  assert.equal(actor.system.credits, 500, 'still charged: the caller is told'); assert.equal(model.applyCalls, 2, 'the compensation is attempted once and not retried'); assert.equal(snapMode.restores, 0);
  reset(); worldFor(actor); model.dropItem = true; model.failNth = 2; r = await silent(() => TransactionEngine.executeMutationTransaction({ actor, mutationPlan: plan(), cost: 100, transactionContext: 'owned-customization', verify: async () => ({ ok: false, reason: 'missing' }) }, { source: 'ti2', rederive: false }));
  assert.equal(r.success, false); assert.equal(r.indeterminate, true); assert.equal(r.verificationFailed, true); assert.ok(r.evidence); assert.notEqual(r.compensated, true);
  // somebody else changed the balance after the charge: the refund is NOT written over their change
  reset(); worldFor(actor); model.dropItem = true; const realApply = ActorEngine.applyMutationPlan;
  ActorEngine.applyMutationPlan = async (a, p) => { await realApply(a, p); if (model.applyCalls === 1) a.system.credits += 50; };
  r = await silent(() => TransactionEngine.executeMutationTransaction({ actor, mutationPlan: plan(), cost: 100, transactionContext: 'owned-customization', verify: async () => ({ ok: false, reason: 'missing' }) }, { source: 'ti2', rederive: false })); ActorEngine.applyMutationPlan = realApply;
  assert.equal(r.success, false); assert.equal(r.indeterminate, true); assert.equal(model.applyCalls, 1, 'no compensation write over a changed balance');
  // a verification that passes is a normal success
  reset(); worldFor(actor); r = await TransactionEngine.executeMutationTransaction({ actor, mutationPlan: plan(), cost: 100, transactionContext: 'owned-customization', verify: async (a) => ({ ok: a.items.get('rifle1').system.installedUpgrades.length > 0 }) }, { source: 'ti2', rederive: false });
  assert.equal(r.success, true); assert.equal(actor.system.credits, 900);
  ok('TI2-R1: the Item write is verified inside the transaction; a failed (or throwing) verification refunds the charge with one targeted write and marks the audit record Compensated, or is reported unresolved with evidence when the refund cannot be written or the balance changed — never a bare error after a committed charge, never a whole-actor restore');
}

// ------------------------------------------------------------------------------------------------ 2.6 TI2-R2: a committed purchase is never undone by a post-commit failure
{
  const { StoreEngine } = await import('/systems/foundryvtt-swse/scripts/engine/store/store-engine.js');
  const policies = { blaster: { trackQuantity: true, quantity: 5 } };
  globalThis.game.settings = { settings: { has: () => true }, get: (_s, k) => (k === 'storeInventoryPolicies' ? JSON.parse(JSON.stringify(policies)) : (k === 'storeOpen' ? true : undefined)), set: async (_s, k, v) => { if (k === 'storeInventoryPolicies') { for (const key of Object.keys(policies)) delete policies[key]; Object.assign(policies, JSON.parse(JSON.stringify(v))); } return v; } };
  StoreEngine._validatePricesAtPurchaseTime = async () => ({ valid: true });
  const realExec = TransactionEngine.executeMutationTransaction;
  const buy = async (items) => { reset(); worldFor(actor); policies.blaster.quantity = 5; let calls = 0; TransactionEngine.executeMutationTransaction = async () => { calls += 1; return { success: true, transactionId: 'tx-committed', creditsBefore: 1000, creditsAfter: 900 }; };
    try { const r = await silent(() => StoreEngine.purchase({ actor, items, totalCost: 100 })); return { r, calls }; } finally { TransactionEngine.executeMutationTransaction = realExec; restoreHooks(); } };
  // a throwing completion hook
  throwOn(['swseStoreTransactionComplete']);
  let { r, calls } = await buy([{ id: 'blaster', name: 'Blaster', quantity: 1, cost: 100 }]);
  assert.equal(r.success, true, 'the purchase committed: it is not reported as failed'); assert.equal(r.transactionId, 'tx-committed', 'and keeps its transaction id'); assert.match(r.presentationError ?? '', /swseStoreTransactionComplete/, 'the hook failure is reported separately');
  assert.equal(policies.blaster.quantity, 4, 'reserved stock is NOT released for a committed purchase'); assert.equal(calls, 1, 'and the purchase is not retried or duplicated');
  // another post-commit step failing (building the hook payload touches the cart items again)
  let armed = false; const item = { id: 'blaster', quantity: 1, cost: 100, get name() { if (armed) throw new Error('item name getter threw after commit'); return 'Blaster'; } };
  reset(); worldFor(actor); policies.blaster.quantity = 5; TransactionEngine.executeMutationTransaction = async () => { armed = true; return { success: true, transactionId: 'tx-committed-2' }; };
  r = await silent(() => StoreEngine.purchase({ actor, items: [item], totalCost: 100 })); TransactionEngine.executeMutationTransaction = realExec;
  assert.equal(r.success, true); assert.equal(r.transactionId, 'tx-committed-2'); assert.ok(r.presentationError); assert.equal(policies.blaster.quantity, 4);
  // the failure paths are unchanged
  reset(); worldFor(actor); policies.blaster.quantity = 5; TransactionEngine.executeMutationTransaction = async () => ({ success: false, transactionId: 'x', error: 'plain failure' });
  r = await silent(() => StoreEngine.purchase({ actor, items: [{ id: 'blaster', name: 'Blaster', quantity: 1, cost: 100 }], totalCost: 100 })); TransactionEngine.executeMutationTransaction = realExec; assert.equal(r.success, false); assert.equal(policies.blaster.quantity, 5);
  ok('TI2-R2: a hook (or other post-commit step) that throws after TransactionEngine committed does not release stock, does not report the purchase as failed, keeps the transaction id and is reported as presentationError; real failures still release stock');
}

// ------------------------------------------------------------------------------------------------ 2.7 TI2-R3: a credit transfer reports compensated / rollbackFailed / indeterminate truthfully
{
  const mk2 = (id, credits) => { const a = { id, name: id.toUpperCase(), type: 'character', isOwner: true, system: { credits }, flags: {}, items: [], getFlag(sc, k) { return this.flags?.[sc]?.[k]; }, toObject() { return JSON.parse(JSON.stringify({ system: this.system, items: this.items })); } }; a.items.get = () => null; return a; };
  let A; let B;
  const setupT = () => { reset(); A = mk2('a', 1000); B = mk2('b', 100); worldFor(A, B); };
  const transfer = () => silent(() => TransactionEngine.executeCreditTransfer({ fromActor: A, toActor: B, amount: 100, reason: 'ti2', transactionContext: 'holonet-credit-transfer' }, { source: 'ti2', rederive: false }));
  const adjustCalls = []; const realAdj = TransactionEngine.executeCreditAdjustment;
  TransactionEngine.executeCreditAdjustment = async function (...a) { adjustCalls.push(a[0].transactionContext); return realAdj.apply(this, a); };
  // (0) happy path
  setupT(); adjustCalls.length = 0; let r = await transfer(); assert.equal(r.success, true); assert.equal(A.system.credits, 900); assert.equal(B.system.credits, 200);
  // (1) recipient credit leg fails, the debit is refunded: a COMPENSATED failure (not an unresolved one)
  setupT(); model.failWriteN = { b: [1] }; r = await transfer(); assert.equal(r.success, false); assert.equal(r.compensated, true, 'refund verified'); assert.notEqual(r.rollbackFailed, true); assert.notEqual(r.indeterminate, true); assert.equal(A.system.credits, 1000); assert.equal(B.system.credits, 100); assert.ok(r.debitTransactionId && r.failedCreditTransactionId && r.refundTransactionId);
  // (2) credit leg fails AND the refund fails: the existing last-resort snapshot restore succeeds -> compensated by restore
  setupT(); model.failWriteN = { b: [1], a: [2] }; r = await transfer(); assert.equal(r.success, false); assert.equal(r.compensated, true); assert.equal(r.recovery, 'snapshot-restore'); assert.equal(A.system.credits, 1000);
  // (3) credit leg fails, refund fails, and the TRANSFER-level snapshot restore returns false -> unresolved, with evidence
  setupT(); model.failWriteN = { b: [1], a: [2] }; snapMode.restoreLabel = { re: /before transfer/, mode: 'false' }; r = await transfer();
  assert.equal(r.success, false); assert.equal(r.rollbackFailed, true, 'the sender really is still debited'); assert.match(r.error, /could not be reconciled/i); assert.equal(A.system.credits, 900);
  assert.ok(r.debitTransactionId && r.failedCreditTransactionId && r.refundTransactionId, 'transaction ids for reconciliation'); assert.ok(r.evidence?.restores?.length === 2 && r.evidence.restores.every((x) => x.restored === false), 'restore evidence');
  // (4) the same with a throwing restore
  setupT(); model.failWriteN = { b: [1], a: [2] }; snapMode.restoreLabel = { re: /before transfer/, mode: 'throw' }; r = await transfer(); assert.equal(r.rollbackFailed, true); assert.equal(A.system.credits, 900); assert.ok(r.evidence?.restores?.some((x) => x.error));
  // (4b) the REFUND itself is unresolved (its own restore returned false): no further whole-actor restore is attempted over an actor whose state is unknown
  setupT(); model.failWriteN = { b: [1], a: [2] }; snapMode.restoreBy = { a: 'false' }; const before = snapMode.restores; r = await transfer();
  assert.equal(r.success, false); assert.equal(r.rollbackFailed, true); assert.equal(r.indeterminate, true, 'unresolved refund'); assert.deepEqual(r.evidence.restores, [], 'no transfer-level restore attempted'); assert.equal(A.system.credits, 900);
  // (5) no snapshots can be taken. TI4-C0 (credit-adjustment safety): the debit leg is now REFUSED up front (the rollback snapshot is a precondition), so no credits move and
  //     the failure is definitive; previously the debit proceeded unprotected, the refund failed, and the sender stayed charged (rollbackFailed).
  setupT(); model.failWriteN = { b: [1], a: [2] }; snapMode.create = 'throw'; r = await transfer(); assert.equal(r.success, false); assert.notEqual(r.rollbackFailed, true); assert.notEqual(r.indeterminate, true); assert.match(r.error, /snapshot/i); assert.equal(A.system.credits, 1000, 'nothing was debited'); assert.equal(B.system.credits, 100);
  // (6) the credit leg is ITSELF unresolved (its own restore failed: the recipient may hold the credits): the debit is NOT refunded automatically
  setupT(); adjustCalls.length = 0; model.failWriteN = { b: [1] }; snapMode.restoreBy = { b: 'false' }; r = await transfer();
  assert.equal(r.success, false); assert.equal(r.indeterminate, true, 'unknown whether the recipient was credited'); assert.equal(adjustCalls.filter((c) => c === 'holonet-credit-transfer-refund').length, 0, 'no automatic refund (it could duplicate the credits)'); assert.equal(A.system.credits, 900);
  assert.ok(r.debitTransactionId && r.failedCreditTransactionId);
  // (7) the debit leg fails with its own rollback failure: carried through
  setupT(); model.failWriteN = { a: [1] }; snapMode.restoreBy = { a: 'false' }; r = await transfer(); assert.equal(r.success, false); assert.equal(r.rollbackFailed, true); assert.equal(B.system.credits, 100);
  // (8) a completion hook that throws after a committed transfer does not turn it into an exception or a failure
  setupT(); throwOn(['swseCreditTransferComplete']); r = await transfer(); restoreHooks(); assert.equal(r.success, true); assert.match(r.presentationError ?? '', /swseCreditTransferComplete/); assert.equal(A.system.credits, 900); assert.equal(B.system.credits, 200);
  TransactionEngine.executeCreditAdjustment = realAdj;
  ok('TI2-R3: a failed transfer reports compensated (refund or verified snapshot restore), rollbackFailed (refund and restore both failed / false / threw, or no snapshot) or indeterminate (the credit leg itself is unresolved, so no automatic refund), always with transaction ids and evidence; a throwing completion hook never turns a committed transfer into a failure');
}

// ------------------------------------------------------------------------------------------------ 2.8 post-commit presentation never undoes a committed engine transaction
{
  reset(); worldFor(actor); throwOn(['swseCreditAdjustmentComplete']);
  let r = await silent(() => TransactionEngine.executeCreditAdjustment({ actor, amount: -50, reason: 'ti2', transactionContext: 'gm-credit-adjustment' }, { source: 'ti2', rederive: false })); restoreHooks();
  assert.equal(r.success, true, 'a committed adjustment is not rolled back because a hook threw'); assert.equal(actor.system.credits, 950); assert.equal(snapMode.restores, 0); assert.match(r.presentationError ?? '', /swseCreditAdjustmentComplete/);
  const src = (await import('node:fs')).readFileSync(new URL('../scripts/engine/store/transaction-engine.js', import.meta.url), 'utf8');
  const raw = [...src.matchAll(/Hooks\.callAll\?\./g)].length;
  assert.equal(raw, 1, 'every completion hook in the engine goes through the single post-commit-safe emitter (the only raw Hooks.callAll is inside it); owner ruling Q4 removed the former asset-customization exception');
  ok('TI-2 post-commit: a throwing completion hook does not roll back a committed credit adjustment; every engine completion hook, asset customization included (owner ruling Q4), uses the safe emitter');
}

// ------------------------------------------------------------------------------------------------ 2.9 TI2-R4: the compensation decision and write are not exposed to another commerce operation
{
  const verifyFails = async () => ({ ok: false, reason: 'missing' });
  const runCharge = () => TransactionEngine.executeMutationTransaction({ actor, mutationPlan: plan(), cost: 100, transactionContext: 'owned-customization', verify: verifyFails }, { source: 'ti2', rederive: false });
  // (A) another TransactionEngine credit operation lands inside the compensation window (after the balance was read and compared, before the refund is applied)
  reset(); worldFor(actor); model.dropItem = true; let intruder = null; let inCompensation = false; const realApplyA = ActorEngine.applyMutationPlan;
  ActorEngine.applyMutationPlan = async (a, p, o) => {
    if (p.set?.['flags.foundryvtt-swse.transactions.' + ledgerOf(a)[0]?.id + '.status'] === 'Compensated' && !inCompensation) {   // this is the compensation write
      inCompensation = true;
      intruder = await TransactionEngine.executeCreditAdjustment({ actor: a, amount: 50, reason: 'ti2 concurrent grant', transactionContext: 'gm-credit-adjustment' }, { source: 'ti2', rederive: false });
    }
    return realApplyA(a, p, o);
  };
  let r = await silent(runCharge); ActorEngine.applyMutationPlan = realApplyA;
  assert.ok(intruder, 'the interleaving happened');
  const finalA = actor.system.credits; const granted = intruder.success ? 50 : 0;
  assert.equal(finalA, 1000 + granted, 'the final balance equals the original plus exactly the operations that REPORTED success: no lost update');
  assert.equal(intruder.success, false, 'the concurrent credit operation is refused while the actor\'s credits are being reconciled (L1: same client)'); assert.match(intruder.error, /reconcil/i);
  assert.equal(r.success, false); assert.equal(r.compensated, true); assert.equal(actor.system.credits, 1000);
  // the guard is released: the same operation now succeeds
  const after = await TransactionEngine.executeCreditAdjustment({ actor, amount: 50, reason: 'ti2 later grant', transactionContext: 'gm-credit-adjustment' }, { source: 'ti2', rederive: false }); assert.equal(after.success, true); assert.equal(actor.system.credits, 1050);
  // (B) another operation on this actor is ALREADY in flight when the compensation is about to run: nothing is written, the outcome is unresolved
  reset(); worldFor(actor); model.dropItem = true; let released = false;
  r = await silent(() => TransactionEngine.executeMutationTransaction({ actor, mutationPlan: plan(), cost: 100, transactionContext: 'owned-customization', verify: async () => { TransactionEngine._mutationLocks.add(`${actor.id}:gm-credit-adjustment:credit-adjustment`); return { ok: false, reason: 'missing' }; } }, { source: 'ti2', rederive: false }));
  TransactionEngine._mutationLocks.delete(`${actor.id}:gm-credit-adjustment:credit-adjustment`);
  assert.equal(r.success, false); assert.equal(r.indeterminate, true, 'cannot be safely compensated -> unresolved'); assert.equal(model.applyCalls, 1, 'no compensation write while another operation may be mid-write'); assert.equal(actor.system.credits, 900); assert.match(r.error, /in flight|in progress|another/i); assert.ok(r.evidence);
  // (C) the refund write "succeeds" but the final balance is not the expected one: verified against the actual final state, reported unresolved
  reset(); worldFor(actor); model.dropItem = true; const realApplyC = ActorEngine.applyMutationPlan;
  ActorEngine.applyMutationPlan = async (a, p, o) => { await realApplyC(a, p, o); if (model.applyCalls === 2) a.system.credits = 777; };
  r = await silent(runCharge); ActorEngine.applyMutationPlan = realApplyC; assert.equal(r.indeterminate, true); assert.equal(r.evidence.observedAfterRefund, 777); assert.notEqual(r.compensated, true);
  // (D) the guard is also released when the compensation throws
  reset(); worldFor(actor); model.dropItem = true; model.failNth = 2; r = await silent(runCharge); assert.equal(r.indeterminate, true); model.failNth = null;
  const again = await TransactionEngine.executeCreditAdjustment({ actor, amount: 10, reason: 'ti2', transactionContext: 'gm-credit-adjustment' }, { source: 'ti2', rederive: false }); assert.equal(again.success, true);
  ok('TI2-R4: the compensation decision and write run while the actor is marked as being reconciled (other TransactionEngine credit operations are refused, never interleaved and lost), are skipped as unresolved when another operation is already in flight, are verified against the final balance, and always release the guard');
}

// ------------------------------------------------------------------------------------------------ H7: a malformed cost is refused, never a free transaction
{
  const priorActors = globalThis.game?.actors; if (globalThis.game) globalThis.game.actors = undefined;   // earlier sections register other actors; resolve this one directly
  for (const bad of [null, '', '   ', 'abc', NaN, Infinity, {}, [], true, -1]) {
    reset(); const r = await silent(() => TransactionEngine.executeMutationTransaction({ actor, mutationPlan: plan(), cost: bad, transactionContext: 'owned-customization', audit: { itemName: 'x' } }, { source: 'ti2', validate: true, rederive: false }));
    assert.equal(r.success, false, `cost ${String(bad)} is refused`); assert.match(r.error, /Invalid transaction cost/); assert.equal(model.applyCalls, 0, 'nothing was written'); assert.equal(actor.system.credits, 1000);
  }
  reset(); let r = await run('250'); assert.equal(r.success, true); assert.equal(actor.system.credits, 750, 'a numeric string is the stated amount');
  reset(); r = await TransactionEngine.executeMutationTransaction({ actor, mutationPlan: plan(), transactionContext: 'owned-customization', audit: { itemName: 'x' } }, { source: 'ti2', validate: true, rederive: false });
  assert.equal(r.success, true); assert.equal(actor.system.credits, 1000, 'an omitted cost is the documented default of 0');
  if (globalThis.game) globalThis.game.actors = priorActors;
  ok('H7: null, empty, non-numeric, non-finite, object, boolean and negative costs are refused with nothing written; numeric strings charge their amount; only an omitted cost is 0');
}

console.log(`\nTI-2 commerce integrity: ${n} checks passed.`);
