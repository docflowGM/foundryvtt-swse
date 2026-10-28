import assert from 'node:assert/strict';
import fs from 'node:fs';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// Modification V2 -- provisional GM-adjudicated installer (Scum and Villainy weapon/armor upgrades, Option A). Real TransactionEngine and
// LedgerService (credits, lock, recovery, verify, compensation); ActorEngine.applyMutationPlan / updateOwnedItems and snapshots are in-memory
// models (as in ti2-commerce-integrity). RED-tier focus: no unconfirmed/unknown price is ever charged, a failed check charges nothing,
// a duplicate attempt is never charged twice, a failed write is compensated, and refusals write nothing.
globalThis.window = globalThis.window || {};
registerFoundryPathLoader();
installFoundryShimGlobals();
globalThis.foundry ??= {};
globalThis.foundry.utils ??= {};
globalThis.foundry.utils.randomID ??= () => Math.random().toString(36).slice(2, 10);
globalThis.foundry.utils.deepClone ??= (v) => JSON.parse(JSON.stringify(v));
globalThis.foundry.applications ??= {};
globalThis.foundry.applications.api ??= { ApplicationV2: class {}, HandlebarsApplicationMixin: (Base) => class extends Base {}, DialogV2: class {} };
const notes = { error: [], warn: [], info: [] };
globalThis.ui = { notifications: { warn: (m) => notes.warn.push(m), info: (m) => notes.info.push(m), error: (m) => notes.error.push(m) } };
globalThis.Hooks = globalThis.Hooks ?? { callAll: () => {}, on: () => {} };

const rt = await import('/systems/foundryvtt-swse/scripts/items/weapon-runtime/index.js');
const { registry } = await import('./helpers/weapon-runtime-fixture.mjs');
rt.setSharedWeaponAuthorityRegistry(registry);
const { ActorEngine } = await import('/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js');
const { SnapshotManager } = await import('/systems/foundryvtt-swse/scripts/engine/progression/utils/snapshot-manager.js');
globalThis.foundry.applications.sheets ??= { ActorSheetV2: class {}, ItemSheetV2: class {}, JournalSheet: class {} };
globalThis.foundry.applications.ux ??= { DragDrop: { implementation: class {} }, TextEditor: { implementation: {} } };
globalThis.CONFIG ??= { SWSE: {}, Actor: {}, Item: {}, statusEffects: [] };
globalThis.localStorage ??= { getItem() { return null; }, setItem() {}, removeItem() {} };
const P = await import('/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-install-service.js');
const D = await import('/systems/foundryvtt-swse/scripts/apps/customization/modification-v2-prompts.js');
const { AmmoSystem } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/ammo-system.js');
const { SWSEDialogV2 } = await import('/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js');
const { ItemCustomizationWorkbench } = await import('/systems/foundryvtt-swse/scripts/apps/customization/item-customization-workbench.js');

let n = 0;
const ok = (m) => console.log(`  [${++n}] ${m} OK`);
const setPath = (o, p, v) => { const parts = p.split('.'); let t = o; for (let i = 0; i < parts.length - 1; i++) t = (t[parts[i]] ??= {}); t[parts.at(-1)] = JSON.parse(JSON.stringify(v)); };
const silent = async (fn) => { const e = console.error; const w = console.warn; console.error = () => {}; console.warn = () => {}; try { return await fn(); } finally { console.error = e; console.warn = w; } };
const readJson = async (p) => JSON.parse(fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
const data = await P.loadModificationData({ fetchJson: readJson });

// ---- models: persistence and snapshots (TransactionEngine itself is real)
const model = { applyCalls: 0, dropItem: false, itemWrites: 0 };
const snaps = [];
SnapshotManager.createSnapshot = async (a, label) => { const s = { schemaVersion: 2, scope: 'full-actor', timestamp: snaps.length + 1, label, data: JSON.parse(JSON.stringify({ credits: a.system.credits, items: a.items.map((i) => [i.id, i.flags]) })) }; snaps.push(s); return s; };
SnapshotManager.getSnapshot = (a, ts) => snaps.find((s) => s.timestamp === ts) ?? null;
SnapshotManager.restoreSnapshot = async (a, ts) => { const s = snaps.find((x) => x.timestamp === ts); a.system.credits = s.data.credits; for (const [id, f] of s.data.items) a.items.get(id).flags = JSON.parse(JSON.stringify(f)); return true; };
ActorEngine.applyMutationPlan = async (a, plan) => {
  model.applyCalls += 1;
  for (const [k, v] of Object.entries(plan.set ?? {})) setPath(a, k, v);
  for (const u of plan.update?.items ?? []) { if (model.dropItem) continue; const it = a.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(it, k, v); }
  return true;
};
ActorEngine.updateOwnedItems = async (a, updates) => { model.itemWrites += 1; for (const u of updates) { const it = a.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(it, k, v); } return updates; };

const pistol = () => ({ id: 'w1', name: 'Blaster Pistol', type: 'weapon', system: {}, flags: { swse: { canonicalWeapon: { identityKey: 'weapon-blaster-pistol' } } } });
const vest = () => ({ id: 'a1', name: 'Blast Vest', type: 'armor', system: { armorType: 'light' }, flags: {} });
let actor;
const reset = (credits = 1000, trained = true) => {
  actor = { id: 'buyer', name: 'Tech', type: 'character', isOwner: true, system: { credits, skills: { mechanics: { trained } } }, flags: {}, items: [pistol(), vest()] };
  actor.items.get = (id) => actor.items.find((i) => i.id === id) ?? null;
  for (const i of actor.items) i.actor = actor;
  globalThis.game = { ...(globalThis.game ?? {}), actors: { get: (id) => (id === actor.id ? actor : null) }, user: { isGM: true, id: 'gm1', name: 'GM' }, settings: { get: () => undefined } };
  Object.assign(model, { applyCalls: 0, dropItem: false, itemWrites: 0 }); snaps.length = 0; notes.warn.length = notes.error.length = notes.info.length = 0;
};
const deps = (extra = {}) => ({ data, isGm: () => true, currentUserId: () => 'gm1', ...extra });
const W = () => actor.items.get('w1'); const A = () => actor.items.get('a1');
const instancesOf = (it) => it.flags?.['foundryvtt-swse']?.customization?.installedUpgrades ?? [];
const attemptsOf = (it) => it.flags?.['foundryvtt-swse']?.customization?.attemptLog ?? [];
const install = (item, extra = {}, d = deps()) => silent(() => P.installProvisionalUpgrade(actor, item, { typedDefinitionId: 'sv-rangefinder::weapon', attemptId: 'att-1', priceConfirmed: 200, hostRuling: { compatible: true, note: 'scope fits the pistol' }, check: { mode: 'gm-entered', total: 24 }, ...extra }, d));

{
  assert.equal(data.ok, true); assert.equal(data.rows.size, 76);
  reset();
  const cands = P.listProvisionalCandidates({ data, item: W(), weaponLookup: await P.productionWeaponLookup() });
  assert.deepEqual(cands.map((c) => c.typedDefinitionId), ['sv-targeting-scope-standard::weapon', 'sv-rangefinder::weapon', 'sv-ion-charger::weapon']);
  const rf = cands.find((c) => c.typedDefinitionId === 'sv-rangefinder::weapon');
  assert.equal(rf.ok, true); assert.equal(rf.dc, 20); assert.equal(rf.time, '1 hour'); assert.equal(rf.price, 200); assert.equal(rf.slotImpact.free, 1); assert.equal(rf.hostNeedsGmRuling, true);
  assert.ok(rf.accepted.some((a) => a.code === 'NOT_SELECTABLE') && rf.accepted.some((a) => a.code === 'OPEN_REGISTER_ENTRY' && a.detail === 'D-014:installProcedure'), 'the accepted certification blockers are listed, not hidden');
  const scope = cands.find((c) => c.typedDefinitionId === 'sv-targeting-scope-standard::weapon'); assert.equal(scope.dc, 10); assert.equal(scope.time, '10 minutes');
  const tampered = await P.loadModificationData({ fetchJson: async (p) => { const j = await readJson(p); if (j.records?.[0]?.price?.registry) j.records[0].price.registry.amount = 1; return j; } });
  assert.equal(tampered.ok, false); assert.match(tampered.problems[0], /RECORDS_HASH_MISMATCH/);
  ok('1: data is integrity-checked; Table 2-2 DC/time, certified price and certified slot capacity come from the data; accepted certification blockers are explicit');
}
{
  reset();
  const r = await install(W());
  assert.equal(r.status, 'INSTALLED', JSON.stringify(r.reason ?? r.hard));
  assert.equal(actor.system.credits, 800, 'the certified price is charged once');
  const [inst] = instancesOf(W());
  assert.equal(inst.typedDefinitionId, 'sv-rangefinder::weapon'); assert.equal(inst.provisional, true); assert.equal(inst.basis, 'PROVISIONAL_GM_ADJUDICATED');
  assert.equal(inst.hostRuling.classification, 'GM_ADJUDICATED_NOT_PUBLISHED_RULE'); assert.equal(inst.effects.automation, 'none');
  assert.equal(inst.install.dc, 20); assert.equal(inst.install.check.total, 24); assert.ok(inst.acceptedBlockers.length > 0);
  assert.ok(r.transactionId);
  const again = await install(W());
  assert.equal(again.status, 'DUPLICATE'); assert.equal(actor.system.credits, 800); assert.equal(instancesOf(W()).length, 1);
  const parallel = await Promise.all([install(W(), { attemptId: 'p1', typedDefinitionId: 'sv-targeting-scope-standard::weapon', priceConfirmed: 100 }), install(W(), { attemptId: 'p1', typedDefinitionId: 'sv-targeting-scope-standard::weapon', priceConfirmed: 100 })]);
  assert.deepEqual(parallel.map((x) => x.status).sort(), ['DUPLICATE', 'INSTALLED']); assert.equal(actor.system.credits, 700, 'two concurrent submissions of one attempt charge once');
  ok('2: a successful install charges the certified price once, records a provisional instance with its basis, and duplicates (sequential or concurrent) are never charged again');
}
{
  for (const [label, extra, d, reason] of [
    ['not a GM', {}, deps({ isGm: () => false }), 'not-a-gm'],
    ['no host ruling', { hostRuling: undefined }, deps(), 'host-ruling-required'],
    ['price not entered', { priceConfirmed: NaN }, deps(), 'price-not-confirmed'],
    ['price entered as 0', { priceConfirmed: 0 }, deps(), 'price-not-confirmed'],
    ['price as a string', { priceConfirmed: '200' }, deps(), 'price-not-confirmed'],
    ['no check', { check: null }, deps(), 'check-mode-invalid'],
    ['GM-entered total missing', { check: { mode: 'gm-entered', total: NaN } }, deps(), 'gm-entered-total-invalid'],
    ['not in the provisional set', { typedDefinitionId: 'sv-pulse-charger::weapon' }, deps(), 'hard-blockers'],
    ['wrong domain', { typedDefinitionId: 'sv-climbing-claws::armor' }, deps(), 'hard-blockers'],
  ]) {
    reset(); const r = await install(W(), extra, d);
    assert.equal(r.status, 'REFUSED', label); assert.equal(r.reason, reason, label);
    assert.equal(actor.system.credits, 1000, `${label}: nothing charged`); assert.equal(model.applyCalls + model.itemWrites, 0, `${label}: nothing written`);
  }
  reset(); assert.equal((await silent(() => P.installProvisionalUpgrade(actor, A(), { typedDefinitionId: 'sv-climbing-claws::armor', attemptId: 'x', priceConfirmed: 200, hostRuling: { compatible: true }, check: { mode: 'gm-entered', total: 30 } }, deps()))).reason, 'armor-classification-attestation-required');
  ok('3: non-GM, missing host ruling, unconfirmed/zero/string price, missing check, out-of-set and wrong-domain requests refuse with nothing charged or written');
}
{
  reset(); await install(W());
  const over = await install(W(), { attemptId: 'att-2', typedDefinitionId: 'sv-ion-charger::weapon', priceConfirmed: 3000 });
  assert.equal(over.status, 'REFUSED'); assert.ok(over.hard.some((h) => h.code === 'SLOT_OVERFLOW')); assert.equal(actor.system.credits, 800);
  reset(150); const poor = await install(W());
  assert.equal(poor.status, 'TRANSACTION_FAILED'); assert.match(poor.reason, /Insufficient credits/); assert.equal(instancesOf(W()).length, 0); assert.equal(actor.system.credits, 150);
  reset(); model.dropItem = true; const lost = await install(W());
  assert.equal(lost.status, 'TRANSACTION_FAILED'); assert.equal(actor.system.credits, 1000, 'an install whose write did not land is refunded by the engine'); assert.equal(instancesOf(W()).length, 0);
  ok('4: slot overflow is a hard refusal; insufficient credits and an unverified write fail with no instance and no net charge');
}
{
  reset(); const r = await install(W(), { check: { mode: 'gm-entered', total: 12 } });
  assert.equal(r.status, 'INSTALL_FAILED_CHECK'); assert.equal(actor.system.credits, 1000, 'Q-021: a failed attempt charges nothing automatically');
  assert.equal(instancesOf(W()).length, 0, 'Q-024: no instance'); assert.equal(attemptsOf(W())[0].result, 'failed');
  assert.equal((await install(W(), { check: { mode: 'gm-entered', total: 30 } })).status, 'DUPLICATE', 'a resolved attempt id is not reused');
  reset(1000, false); assert.equal((await install(W(), { check: { mode: 'roll' } })).reason, 'installer-not-trained-in-mechanics');
  reset(); const rolled = await install(W(), { check: { mode: 'roll' } }, deps({ rollMechanics: async (_a, dc) => dc + 3 }));
  assert.equal(rolled.status, 'INSTALLED'); assert.equal(rolled.check.mode, 'roll');
  ok('5: a failed check records the attempt with no charge and no instance; rolling requires a trained installer; a roll at or above the DC installs');
}
{
  reset(); await install(W()); const id = instancesOf(W())[0].instanceId;
  const remove = (extra, d = deps()) => silent(() => P.removeProvisionalUpgrade(actor, W(), { instanceId: id, attemptId: `rm-${Math.random()}`, check: { mode: 'gm-entered', total: 10 }, ...extra }, d));
  let r = await remove({});
  assert.equal(r.status, 'DEACTIVATED'); assert.equal(r.dc, 15); assert.equal(instancesOf(W())[0].state, 'deactivated', 'Q-023: keeps its slot');
  assert.ok((await install(W(), { attemptId: 'att-3', typedDefinitionId: 'sv-ion-charger::weapon', priceConfirmed: 3000 })).hard.some((h) => h.code === 'SLOT_OVERFLOW'), 'the deactivated upgrade still occupies the slot');
  r = await remove({ expedited: true, check: { mode: 'gm-entered', total: 5 } });
  assert.equal(r.status, 'DESTROYED'); assert.equal(r.time, '10 minutes'); assert.equal(instancesOf(W()).length, 0, 'the slot is free');
  assert.equal(actor.system.credits, 800, 'removal moves no credits');
  reset(); await install(W(), { attemptId: 's1', typedDefinitionId: 'sv-targeting-scope-standard::weapon', priceConfirmed: 100, check: { mode: 'gm-entered', total: 10 } });
  const sid = instancesOf(W())[0].instanceId;
  assert.equal((await silent(() => P.removeProvisionalUpgrade(actor, W(), { instanceId: sid, attemptId: 'r1', expedited: true, check: { mode: 'gm-entered', total: 20 } }, deps()))).reason, 'expedited-removal-unavailable-at-shortest-increment (Q-022)');
  r = await silent(() => P.removeProvisionalUpgrade(actor, W(), { instanceId: sid, attemptId: 'r2', check: { mode: 'gm-entered', total: 5 } }, deps()));
  assert.equal(r.status, 'REMOVED'); assert.equal(r.dc, 5); assert.equal(instancesOf(W()).length, 0);
  ok('6: removal uses DC - 5 and the same time; failure deactivates (slot kept); expedited steps one increment down and destroys on failure; no expedited removal at 10 minutes');
}
{
  // the workbench is the UI: its Modifications tab lists V2 definitions (never the retired legacy weapon/armor lists) and installs through the service
  reset();
  const fd = (v) => ({ get: (k) => (k in v ? v[k] : null) });
  assert.equal(D.readInstallForm(fd({ priceConfirmed: '', checkMode: '' })).check, null);
  assert.ok(Number.isNaN(D.readInstallForm(fd({ priceConfirmed: '' })).priceConfirmed), 'an empty price stays NaN (refused), never 0');
  // the workbench loads the data through the production loader (fetch of the system path), here served from the repository
  const realFetch = globalThis.fetch; globalThis.fetch = async (url) => ({ ok: true, json: async () => readJson(String(url).replace('systems/foundryvtt-swse/', '')) });
  const proto = ItemCustomizationWorkbench.prototype;
  const rendered = [];
  const wb = Object.create(proto, { actor: { value: actor }, _getCurrentItem: { value: () => W() }, _renderPreservingUi: { value: async () => { rendered.push(1); } } });
  assert.deepEqual(proto._getUpgradeCatalog.call(wb, W(), { selectedUpgrades: [] }), [], 'the legacy blaster/melee list is retired for weapons');
  const ctx = await silent(() => proto._getModificationV2Context.call(wb, W()));
  assert.equal(ctx.dataOk, true); assert.deepEqual(ctx.available.map((m) => m.typedDefinitionId), ['sv-ion-charger::weapon', 'sv-rangefinder::weapon', 'sv-targeting-scope-standard::weapon']);
  assert.ok(ctx.blocked.length > 20 && ctx.blocked.every((m) => m.reasons.length > 0), 'every other weapon definition is listed as blocked with its exact reasons');
  assert.ok(ctx.blocked.find((m) => m.typedDefinitionId === 'kotor-accessory-improved-energy-cell::weapon').reasons.some((r) => /D-013/.test(r)), 'Improved Energy Cell shows its D-013 blocker');
  assert.deepEqual(ctx.capacity, { total: 1, used: 0, free: 1 });
  const realPrompt = SWSEDialogV2.prompt; const prompts = [];
  SWSEDialogV2.prompt = async (o) => { prompts.push(o); return { priceConfirmed: 200, check: { mode: 'gm-entered', total: 21 }, hostRuling: { compatible: true, note: null }, armor: null, note: 'bench' }; };
  try { await silent(() => proto._installModificationV2.call(wb, 'sv-rangefinder::weapon')); } finally { SWSEDialogV2.prompt = realPrompt; }
  assert.equal(actor.system.credits, 800); assert.equal(instancesOf(W()).length, 1); assert.equal(rendered.length, 1);
  assert.match(prompts[0].content, /GM adjudication, not a published rule/); assert.ok(notes.info.some((m) => /installed .* 200 credits charged/.test(m)));
  // applying a template/structural/appearance draft keeps the V2 instance (it used to rebuild installedUpgrades from legacy keys only)
  const wb2 = Object.create(proto, { actor: { value: actor }, _getCustomizationState: { value: (it) => it.flags['foundryvtt-swse'].customization }, _getSelectedUpgradeInstances: { value: () => [] }, _isStoreStageMode: { value: () => false }, mode: { value: 'owned' } });
  const next = proto._getDraftCustomizationState.call(wb2, W(), { selectedUpgrades: [], selectedTemplates: [], structural: {} });
  assert.deepEqual(next.installedUpgrades.map((r) => r.typedDefinitionId), ['sv-rangefinder::weapon'], 'the V2 instance survives a workbench Apply');
  globalThis.fetch = realFetch;
  ok('7: the existing workbench lists V2 definitions (installable / blocked with reasons), installs through the service with the charge, and its Apply never drops V2 instances');
}
{
  // effects are derived from canonical installed instances, never baked: Improved Energy Cell's certified "shots per power pack x2"
  const blaster = { id: 'b', type: 'weapon', name: 'Blaster', system: { ammunition: { current: 10, max: 10 } }, flags: {} };
  assert.equal(AmmoSystem.maxAmmo(blaster), 10);
  const iec = { instanceId: 'i1', typedDefinitionId: 'kotor-accessory-improved-energy-cell::weapon', domain: 'weapon', state: 'installed', effects: { certified: true, operations: [{ target: 'weapon.reload.shotsPerPowerPack', operation: 'multiply', value: 2 }] } };
  const withInst = (inst) => ({ ...blaster, flags: { 'foundryvtt-swse': { customization: { installedUpgrades: [inst] } } } });
  assert.equal(AmmoSystem.maxAmmo(withInst(iec)), 20, 'a canonical installed instance doubles the tracked capacity');
  assert.equal(AmmoSystem.maxAmmo(withInst({ ...iec, provisional: true })), 10, 'a provisional install never automates an effect (Q-029)');
  assert.equal(AmmoSystem.maxAmmo(withInst({ ...iec, state: 'deactivated' })), 10, 'a deactivated upgrade contributes nothing');
  assert.equal(AmmoSystem.maxAmmo(withInst({ ...iec, effects: { certified: false, operations: iec.effects.operations } })), 10, 'uncertified operations are ignored');
  assert.equal(blaster.system.ammunition.max, 10, 'the Item value is never rewritten');
  const owned = withInst(iec); owned.actor = { id: 'x' };
  let wrote = null; const realUpd = ActorEngine.updateOwnedItems;
  ActorEngine.updateOwnedItems = async (a, ups) => { wrote = ups[0]['system.ammunition.current']; return ups; };
  try { await silent(() => AmmoSystem.reloadWeapon({ id: 'x' }, owned)); } finally { ActorEngine.updateOwnedItems = realUpd; }
  assert.equal(wrote, 20, 'reload fills to the effective capacity');
  ok('8: Improved Energy Cell effect consumer: capacity is derived (x2) only from canonical, installed, certified instances; removal or deactivation restores it with no write');
}
console.log(`modification-v2-convergence: ${n} checks ok`);
