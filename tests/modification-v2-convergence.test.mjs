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
const readText = async (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const readJson = async (p) => JSON.parse(await readText(p));
const data = await P.loadModificationData({ fetchText: readText });

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
  // R2: pins live in reviewed code. A changed file fails even when its own internal hash was recomputed to match
  const { MODIFICATION_DATA_PINS } = await import('/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-data-pins.js');
  const crypto = await import('node:crypto');
  for (const [p, pin] of Object.entries(MODIFICATION_DATA_PINS)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(`../${p}`, import.meta.url))).digest('hex'), pin, `${p} matches its pin (regenerated data needs a reviewed pin update)`);
  const selfConsistent = await P.loadModificationData({ fetchText: async (p) => {
    const t = await readText(p); if (!p.includes('runtime-definitions')) return t;
    const j = JSON.parse(t); j.records[0].price.registry.amount = 1; j.header.recordsSha256 = crypto.createHash('sha256').update(`${JSON.stringify(j.records, null, 1)}\n`).digest('hex');
    return `${JSON.stringify(j, null, 1)}\n`;
  } });
  assert.equal(selfConsistent.ok, false); assert.match(selfConsistent.problems[0], /PIN_MISMATCH/, 'a self-consistent but altered runtime file is refused');
  const specAltered = await P.loadModificationData({ fetchText: async (p) => (p.includes('specification') ? (await readText(p)).replace("row '1' upgrade points", "row '0' upgrade points") : readText(p)) });
  assert.equal(specAltered.ok, false); assert.match(specAltered.problems[0], /PIN_MISMATCH: data\/modifications\/specification-records/, 'an altered specification (Table 2-2 row) is refused');
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
  assert.equal(r.status, 'INSTALL_FAILED_CHECK'); assert.equal(actor.system.credits, 1000, 'Q-021: no automatic charge for a failed attempt');
  assert.equal(instancesOf(W()).length, 0, 'Q-024: no instance'); assert.equal(attemptsOf(W())[0].result, 'failed');
  assert.deepEqual([attemptsOf(W())[0].cost.state, attemptsOf(W())[0].cost.amount, attemptsOf(W())[0].cost.charged], ['GM_ADJUDICATION_PENDING', null, false], 'Q-021: the attempt cost is pending GM adjudication, never recorded as zero');
  assert.ok(!('costCharged' in attemptsOf(W())[0]));
  assert.match(D.describeOutcome('Blaster Pistol', r).text, /awaits GM adjudication/);
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
  const realFetch = globalThis.fetch; globalThis.fetch = async (url) => ({ ok: true, text: async () => readText(String(url).replace('systems/foundryvtt-swse/', '')) });
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
  // effects come from the verified catalog, never from Item flags: a forged "certified" instance or a definition without certified effects does nothing
  const store = await import('/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-data-store.js');
  store.setVerifiedModificationData(data);
  const E = await import('/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-effects.js');
  const rifle = (instances = []) => ({ id: 'r', type: 'weapon', name: 'Rifle', system: { ammunition: { current: 10, max: 10 } }, flags: { 'foundryvtt-swse': { customization: { installedUpgrades: instances } } } });
  const iec = (extra = {}) => ({ instanceId: 'i1', typedDefinitionId: 'kotor-accessory-improved-energy-cell::weapon', domain: 'weapon', state: 'installed', basis: 'DEVELOPMENT_GM_POLICY', provisional: true, ...extra });
  assert.equal(E.effectiveShotCapacity(rifle([iec()]), 10, { developmentMode: true }), 20, 'development install + setting on: the certified x2 applies');
  assert.equal(E.effectiveShotCapacity(rifle([iec()]), 10, { developmentMode: false }), 10, 'setting off: no effect');
  assert.equal(E.effectiveShotCapacity(rifle([iec({ state: 'deactivated' })]), 10, { developmentMode: true }), 10, 'deactivated: no effect');
  assert.equal(E.effectiveShotCapacity(rifle([iec({ basis: 'CANONICAL', provisional: false, effects: { certified: true } })]), 10, { developmentMode: false }), 10, 'a forged canonical/certified flag does nothing: the definition is not runtime-selectable');
  assert.equal(E.effectiveShotCapacity(rifle([iec({ typedDefinitionId: 'sv-ion-charger::weapon' })]), 10, { developmentMode: true }), 10, 'a definition whose effects are not certified contributes nothing');
  assert.equal(E.effectiveShotCapacity(rifle([iec()]), 10, { developmentMode: true, data: null }), 10, 'no verified catalog: fail closed');
  ok('8: effects resolve from the verified catalog (certified definitions only); flags cannot claim certification; setting off / deactivated / no catalog = no effect');
}
{
  // Improved Energy Cell lifecycle on a blaster rifle (GM development workflow): strip for a slot -> install (2 slots, 4000 cr) -> capacity x2 for
  // reload / fire / validation -> setting off restores -> removal restores; the base value is never written
  const store = await import('/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-data-store.js');
  store.setVerifiedModificationData(data);
  reset(5000);
  const rifle = { id: 'r1', name: 'Blaster Rifle', type: 'weapon', system: { ammunition: { current: 10, max: 10 } }, flags: { swse: { canonicalWeapon: { identityKey: 'weapon-blaster-rifle' } } } };
  rifle.actor = actor; actor.items.push(rifle);
  const R = () => actor.items.get('r1');
  let devOn = false;
  globalThis.game.settings = { get: (ns, key) => (key === 'modificationV2DevelopmentMode' ? devOn : undefined) };
  const wl = await P.productionWeaponLookup();
  const iecOf = () => P.listDomainModifications({ data, item: R(), weaponLookup: wl }).find((m) => m.typedDefinitionId === 'kotor-accessory-improved-energy-cell::weapon');
  assert.ok(iecOf().hard.some((h) => h.code === 'DEVELOPMENT_MODE_OFF'), 'off by default: listed as blocked with the reason');
  devOn = true;
  assert.ok(iecOf().hard.some((h) => h.code === 'SLOT_OVERFLOW'), 'a plain rifle has 1 slot; Improved Energy Cell needs 2');
  // a recorded strip never grants capacity (Phase 1a D16, host feature evidence unestablished), so it does not help:
  R().flags['foundryvtt-swse'] = { customization: { structural: { sizeIncreaseApplied: false, strippedAreas: ['design'] } } };
  R().flags.swse.customizationStructural = { sizeIncreaseApplied: false, strippedAreas: ['design'] };
  assert.ok(iecOf().hard.some((h) => h.code === 'SLOT_STATE_UNRESOLVED'), 'D16: a strip leaves capacity unresolved');
  // the workbench "Increase Size / Bulk" structural change is a verified +1 slot (recorded canonically and mirrored, as the workbench Apply writes it)
  R().flags['foundryvtt-swse'] = { customization: { structural: { sizeIncreaseApplied: true, strippedAreas: [] } } };
  R().flags.swse.customizationStructural = { sizeIncreaseApplied: true, strippedAreas: [] };
  const review = iecOf();
  assert.equal(review.availability, 'development', JSON.stringify(review.hard)); assert.equal(review.dc, 30); assert.equal(review.time, '1 day (8 hours)'); assert.equal(review.price, 4000);
  assert.match(review.source, /D-013 pending/); assert.equal(review.slotImpact.free, 2);
  const inst = await silent(() => P.installProvisionalUpgrade(actor, R(), { typedDefinitionId: 'kotor-accessory-improved-energy-cell::weapon', attemptId: 'iec-1', priceConfirmed: 4000, hostRuling: { compatible: true, note: 'rifle uses a power pack (GM ruling)' }, check: { mode: 'gm-entered', total: 31 } }, deps({ weaponLookup: wl, developmentMode: true })));
  assert.equal(inst.status, 'INSTALLED', JSON.stringify(inst.reason ?? inst.hard)); assert.equal(actor.system.credits, 1000);
  assert.equal(inst.instance.basis, 'DEVELOPMENT_GM_POLICY'); assert.match(inst.instance.developmentPolicy, /D-013 pending/);
  assert.equal(AmmoSystem.maxAmmo(R()), 20, 'installed: tracked capacity doubles');
  assert.equal(R().system.ammunition.max, 10, 'the base value is not rewritten');
  const realUpd = ActorEngine.updateOwnedItems; const realTrack = AmmoSystem.isTrackingEnabled;
  ActorEngine.updateOwnedItems = async (a, ups) => { for (const u of ups) { const it = a.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(it, k, v); } return ups.map((u) => a.items.get(u._id)); };
  try {
    assert.equal((await silent(() => AmmoSystem.reloadWeapon(actor, R()))).success, true); assert.equal(R().system.ammunition.current, 20, 'reload fills to 20');
    assert.deepEqual(AmmoSystem.validateAmmoConfig(R()).issues ?? [], [], '20/20 is valid against the effective capacity');
    assert.equal((await silent(() => AmmoSystem.consumeAmmunition(actor, R(), 15))).success, true); assert.equal(R().system.ammunition.current, 5, 'firing draws from the larger pool');
    devOn = false; assert.equal(AmmoSystem.maxAmmo(R()), 10, 'development setting off: original capacity'); devOn = true;
    const rem = await silent(() => P.removeProvisionalUpgrade(actor, R(), { instanceId: inst.instance.instanceId, attemptId: 'iec-rm', check: { mode: 'gm-entered', total: 25 } }, deps()));
    assert.equal(rem.status, 'REMOVED'); assert.equal(rem.dc, 25); assert.equal(rem.time, '1 day (8 hours)');
    assert.equal(AmmoSystem.maxAmmo(R()), 10, 'removed: original capacity restored'); assert.equal(R().system.ammunition.max, 10);
    assert.equal(actor.system.credits, 1000, 'removal moves no credits');
  } finally { ActorEngine.updateOwnedItems = realUpd; AmmoSystem.isTrackingEnabled = realTrack; globalThis.game.settings = { get: () => undefined }; }
  ok('9: Improved Energy Cell lifecycle (GM development policy): size increase (+1 verified slot; a strip never counts, D16) -> install 4000 cr (DC 30) -> capacity 10->20 for reload, validation and firing -> setting off / removal restore 10 with no write to the base value');
}
{
  // Mesh Underlay lifecycle on worn light armor (GM development workflow): size increase -> install (2 slots, 2500 cr, DC 30) -> +5 equipment
  // bonus to the damage threshold against stun only, worn armor only -> setting off / deactivation / removal restore it; nothing is written to the
  // actor. With a Nerve Reinforcement Implant also active, only the implant applies (stacking ruling pending, D-017).
  const store = await import('/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-data-store.js');
  store.setVerifiedModificationData(data);
  const { ThresholdEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/threshold-engine.js');
  const { ImplantEffectRules } = await import('/systems/foundryvtt-swse/scripts/engine/implants/ImplantEffectRules.js');
  reset(5000);
  actor.system.derived = { damageThreshold: 15 };
  A().system.equipped = true;
  let devOn = true;
  globalThis.game.settings = { get: (ns, key) => (key === 'modificationV2DevelopmentMode' ? devOn : undefined) };
  const dt = async (damageType) => (await ThresholdEngine.getDamageThreshold(actor, { damageType })).total;
  const MESH = 'kotor-accessory-mesh-underlay::armor';
  const armorReq = { stockClass: 'light', powered: false };
  const meshOf = () => P.listDomainModifications({ data, item: A(), armor: P.armorAttestation({ ...armorReq, gmId: 'gm1' }) }).find((m) => m.typedDefinitionId === MESH);
  assert.ok(meshOf().hard.some((h) => h.code === 'SLOT_OVERFLOW'), 'light armor has 1 slot; Mesh Underlay needs 2');
  A().flags['foundryvtt-swse'] = { customization: { structural: { sizeIncreaseApplied: true, strippedAreas: [] } } };
  A().flags.swse = { customizationStructural: { sizeIncreaseApplied: true, strippedAreas: [] } };
  const review = meshOf();
  assert.equal(review.availability, 'development', JSON.stringify(review.hard)); assert.equal(review.price, 2500); assert.equal(review.dc, 30);
  const reinforcement = P.listDomainModifications({ data, item: A(), armor: P.armorAttestation({ ...armorReq, gmId: 'gm1' }) }).find((m) => m.typedDefinitionId === 'kotor-accessory-armor-reinforcement::armor');
  assert.equal(reinforcement?.availability, 'development', 'Armor Reinforcement: development workflow (its piercing match is covered by d016-physical-damage-type-flow)');
  assert.equal(reinforcement.price, 3000);
  assert.equal(await dt('stun'), 15);
  const inst = await silent(() => P.installProvisionalUpgrade(actor, A(), { typedDefinitionId: MESH, attemptId: 'mesh-1', priceConfirmed: 2500, armor: armorReq, hostRuling: { compatible: true, note: 'underlay fits the vest (GM ruling)' }, check: { mode: 'gm-entered', total: 30 } }, deps({ developmentMode: true })));
  assert.equal(inst.status, 'INSTALLED', JSON.stringify(inst.reason ?? inst.hard)); assert.equal(actor.system.credits, 2500);
  assert.equal(await dt('stun'), 20, 'installed and worn: +5 against stun');
  assert.equal(await dt('energy'), 15, 'no bonus against other damage');
  assert.equal(actor.system.derived.damageThreshold, 15, 'the stored threshold is not written');
  A().system.equipped = false; assert.equal(await dt('stun'), 15, 'armor not worn: no bonus'); A().system.equipped = true;
  devOn = false; assert.equal(await dt('stun'), 15, 'development setting off: no bonus'); devOn = true;
  // the REAL damage resolver adjudicates against the same effective threshold it reports (18 stun vs base 15)
  const { DamageResolutionEngine } = await import('/systems/foundryvtt-swse/scripts/engine/combat/damage-resolution-engine.js');
  Object.assign(actor.system, { hp: { value: 40, max: 40 }, conditionTrack: { current: 0 }, size: 'medium' });
  const hit = (damage, damageType = 'stun') => silent(() => DamageResolutionEngine.resolveDamage({ actor, damage, damageType, source: null, options: {} }));
  let r = await hit(18);
  assert.deepEqual([r.thresholdTotal, r.thresholdExceeded, r.conditionDelta], [20, false, 0], 'Mesh Underlay worn: 18 stun does not exceed DT 20, no CT shift');
  r = await hit(18, 'energy'); assert.deepEqual([r.thresholdTotal, r.thresholdExceeded], [15, true], 'non-stun damage: base threshold');
  A().system.equipped = false; r = await hit(18); A().system.equipped = true;
  assert.deepEqual([r.thresholdTotal, r.thresholdExceeded], [15, true], 'armor removed: 18 stun exceeds DT 15');
  // D-017 (KotOR pp.75-76, source-verified): the implant's +5 and Mesh Underlay's +5 are both equipment bonuses and do not stack
  const realImplant = ImplantEffectRules.getStunDamageThresholdBonus;
  ImplantEffectRules.getStunDamageThresholdBonus = () => 5;
  try {
    const both = await ThresholdEngine.getDamageThreshold(actor, { damageType: 'stun' });
    assert.equal(both.total, 20, 'implant + Mesh Underlay: +5, not +10');
    assert.ok(both.breakdown.some((b) => /Mesh Underlay.*do not stack/.test(b.label) && b.value === 0), 'the breakdown names the bonus that does not stack');
    r = await hit(19); assert.deepEqual([r.thresholdTotal, r.thresholdExceeded], [20, false], 'resolver: implant + Mesh Underlay = DT 20');
    r = await hit(20); assert.equal(r.thresholdExceeded, true, '20 stun reaches DT 20 (no +10)');
    A().system.equipped = false; r = await hit(18); A().system.equipped = true;
    assert.deepEqual([r.thresholdTotal, r.thresholdExceeded], [20, false], 'implant alone still applies in the resolver (was display-only before)');
  } finally { ImplantEffectRules.getStunDamageThresholdBonus = realImplant; }
  const failed = await silent(() => P.removeProvisionalUpgrade(actor, A(), { instanceId: inst.instance.instanceId, attemptId: 'mesh-rm-1', check: { mode: 'gm-entered', total: 10 } }, deps()));
  assert.equal(failed.status, 'DEACTIVATED', JSON.stringify(failed)); assert.equal(await dt('stun'), 15, 'deactivated: no bonus (the slot stays used, Q-023)');
  r = await hit(18); assert.deepEqual([r.thresholdTotal, r.thresholdExceeded], [15, true], 'resolver: deactivated Mesh Underlay, 18 stun exceeds DT 15');
  assert.equal(actor.system.credits, 2500, 'removal attempts move no credits');
  ok('10: Mesh Underlay lifecycle (GM development policy): size increase -> install 2500 cr (DC 30) -> stun DT +5 on worn armor only -> unworn / setting off / deactivation restore it with no write; the real damage resolver adjudicates 18 stun against the effective DT (20 worn, 15 removed/deactivated); implant + Mesh Underlay do not stack (D-017); Armor Reinforcement is a development candidate (3000 cr; D-016 type flow tested separately)');
  globalThis.game.settings = { get: () => undefined };
}
{
  // Gear (equipment domain), GM development slice (D-005 pending): the Scum and Villainy universal upgrades with their published price, slots
  // and Table 2-2 row, an explicit GM host ruling per install, no automated effects; the legacy gear list (GEAR_MODS) stays
  const store = await import('/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-data-store.js');
  const E = await import('/systems/foundryvtt-swse/scripts/engine/customization/modification-v2-runtime/modification-effects.js');
  store.setVerifiedModificationData(data);
  reset(2000);
  const comlink = { id: 'g1', name: 'Comlink', type: 'equipment', system: {}, flags: {} };
  comlink.actor = actor; actor.items.push(comlink);
  const G = () => actor.items.get('g1');
  let devOn = false;
  globalThis.game.settings = { get: (ns, key) => (key === 'modificationV2DevelopmentMode' ? devOn : undefined) };
  const SC = 'sv-secret-compartment::equipment';
  const of = (id) => P.listDomainModifications({ data, item: G() }).find((m) => m.typedDefinitionId === id);
  assert.ok(of(SC).hard.some((h) => h.code === 'DEVELOPMENT_MODE_OFF'), 'off by default');
  devOn = true;
  const review = of(SC);
  assert.equal(review.availability, 'development', JSON.stringify(review.hard));
  assert.equal(review.price, 600); assert.equal(review.row, '1'); assert.equal(review.dc, 20); assert.equal(review.time, '1 hour');
  assert.ok(review.hostNeedsGmRuling, 'host is a GM ruling (D-005)');
  assert.ok(review.accepted.some((a) => a.code === 'OPEN_REGISTER_ENTRY' && a.detail === 'D-005:hostPrerequisites'));
  assert.equal(review.slotImpact.cost, 1, 'table-verified slot cost');
  const req = (extra = {}) => ({ typedDefinitionId: SC, attemptId: 'g-1', priceConfirmed: 600, check: { mode: 'gm-entered', total: 21 }, ...extra });
  assert.equal((await silent(() => P.installProvisionalUpgrade(actor, G(), req(), deps({ developmentMode: true })))).reason, 'host-ruling-required');
  const inst = await silent(() => P.installProvisionalUpgrade(actor, G(), req({ hostRuling: { compatible: true, note: 'a comlink can hide a compartment (GM ruling)' } }), deps({ developmentMode: true })));
  assert.equal(inst.status, 'INSTALLED', JSON.stringify(inst.reason ?? inst.hard)); assert.equal(actor.system.credits, 1400);
  assert.equal(inst.instance.basis, 'DEVELOPMENT_GM_POLICY'); assert.equal(inst.instance.effects.automation, 'none'); assert.equal(inst.instance.hostRuling.classification, 'GM_ADJUDICATED_NOT_PUBLISHED_RULE');
  assert.deepEqual(E.activeEffectOperations(G(), null, { developmentMode: true }), [], 'no automated effect');
  assert.ok(of('sv-recognition-system::equipment').hard.some((h) => h.code === 'SLOT_OVERFLOW'), 'the installed upgrade uses the one slot');
  assert.equal(of('sv-storage-capacity::equipment').availability, 'development', 'a published 0-slot upgrade still fits');
  const rem = await silent(() => P.removeProvisionalUpgrade(actor, G(), { instanceId: inst.instance.instanceId, attemptId: 'g-rm', check: { mode: 'gm-entered', total: 15 } }, deps()));
  assert.equal(rem.status, 'REMOVED', JSON.stringify(rem)); assert.equal(rem.dc, 15);
  assert.equal(of('sv-recognition-system::equipment').availability, 'development', 'slot free again');
  assert.equal(ItemCustomizationWorkbench.prototype._usesModificationV2.call({}, G()), false, 'gear keeps its legacy upgrade list');
  globalThis.game.settings = { get: () => undefined };
  ok('11: gear development slice (D-005 pending): universal upgrade with published price/slots/Table 2-2 row, explicit GM host ruling required, charge, slot counted, no automated effect, removal; legacy gear list kept');
}
console.log(`modification-v2-convergence: ${n} checks ok`);
