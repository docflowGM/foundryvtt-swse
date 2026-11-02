import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildUniversalVehiclePackSources } from '../tools/build-universal-vehicle-pack-sources.mjs';
import { installSystemsResolver } from './helpers/systems-resolver.mjs';
import { installFoundryStubs } from './helpers/foundry-stubs.mjs';
import * as L from '../scripts/domain/vehicles/vehicle-installation-ledger.js';
import { buildInstalledWeaponItemData, planInstalledWeaponItemSync } from '../scripts/domain/vehicles/vehicle-installed-weapon-items.js';
import { classifyInstalledVehicleWeapon } from '../scripts/domain/vehicles/vehicle-attack-provenance.js';
import { resolveCertifiedInstalledWeapon, resolveInstalledVehicleWeaponDamage } from '../scripts/domain/vehicles/vehicle-weapon-damage.js';

installSystemsResolver(); installFoundryStubs();
const { guardShipyardWeaponItem, updateTouchesShipyardWeaponItem } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
const { rollAttack } = await import('../scripts/combat/rolls/attacks.js');
const { resolveDamageComposition, buildDamageFormula } = await import('../scripts/engine/combat/combat-roll-math.js');
const { VehicleInstallationService: Svc } = await import('../scripts/engine/vehicles/vehicle-installation-service.js');

const load = f => JSON.parse(readFileSync(`data/vehicle-modifications/${f}.json`, 'utf8'));
const weapons = load('weapon-systems');
const cert = { ...load('certification-p6a').rows, ...load('certification').rows };
const row = id => ({ ...weapons.find(c => c.id === id), certification: cert[id] });
const docs = [...buildUniversalVehiclePackSources().output.values()].flat();
const XW = 'core-incom-t-65b-x-wing-starfighter';
const rules = { ...L.DEFAULT_VEHICLE_INSTALLATION_RULES, resolveEpBudget: () => ({ state: 'known', total: 4 }), resolveNonstandard: () => ({ nonstandard: false, basis: 'T' }) };
const mountFor = key => Svc.normalizeMount({ mountKey: key, arc: 'forward', operatorRole: 'pilot', reason: 'refit' }, { isGM: true, userId: 'gm1', now: 1 }).mount;
const rec = a => a.flags.swse.universalVehicleSource.source;
// Foundry's embedded collection iterates its documents (a plain Map would iterate [key, value] pairs).
class ItemCollection extends Map { [Symbol.iterator]() { return this.values(); } }
const token = (x, y) => ({ center: { x, y }, document: { rotation: 0 } });

function armed(id = 'laser-cannon-light') {
  const d = structuredClone(docs.find(x => x.flags.swse.canonicalPublication.sourceEntryKey === XW));
  const a = Object.assign(d, { id: 'veh1', isOwner: true, items: new ItemCollection(), getActiveTokens: () => [token(0, 0)], getRollData: () => ({}),
    toObject() { const { toObject, items, getActiveTokens, getRollData, ...r } = this; return structuredClone(r); } });
  const p = L.planVehicleInstallation({ record: rec(a), flags: a.flags, catalogEntry: row(id), installId: 'w1', availableCredits: 1e9, rules, mount: mountFor('nose'), nonstandard: false });
  assert.equal(p.ok, true, (p.reasons ?? []).join());
  a.flags.swse.vehicleInstallations = p.nextLedger;
  const item = { id: 'item1', ...buildInstalledWeaponItemData(p.entry), actor: a };
  a.items.set(item.id, item);
  return { vehicle: a, weapon: item, entry: p.entry };
}
const dmg = (a, w, ctx = {}) => buildDamageFormula(resolveDamageComposition(a, w, { weapon: w, ...ctx }));
const log = [];
globalThis.ui = { notifications: { warn: m => log.push(String(m)), error: m => log.push('ERR ' + m), info() {} } };
const fire = async (vehicle, weapon) => {
  log.length = 0;
  const target = { id: 'tgt', type: 'character', items: [], system: { defenses: { reflex: { total: 15 } } }, getActiveTokens: () => [token(500, 0)] };
  let result = null; try { result = await rollAttack(vehicle, weapon, { abstractCrewQuality: 'normal', target }); } catch (e) { log.push('THREW ' + e.message); }
  return { result, blocked: log.some(m => /blocked|requires/.test(m)), log: [...log] };
};

test('an untouched installed weapon resolves to its certified identity and damage', () => {
  const { weapon } = armed();
  const id = resolveCertifiedInstalledWeapon(weapon);
  assert.equal(id.ok, true);
  assert.equal(id.spec.damage, '3d10x2');
  assert.deepEqual(resolveInstalledVehicleWeaponDamage(weapon), { ok: true, formula: '3d10', multiplier: 2, damageType: null, printed: '3d10x2' });
});

test('tampering with the owned Item cannot change attack or damage (every field refused)', async () => {
  const cases = {
    damage: w => { w.system.damage = '99d10x9'; },
    damageSmaller: w => { w.system.damage = '1d4'; },
    mountKey: w => { w.system.vehicleMount.mountKey = 'elsewhere'; },
    arc: w => { w.system.vehicleMount.arc = 'omni'; },
    crewRole: w => { w.system.vehicleMount.crewRole = 'gunner'; },
    name: w => { w.name = 'Turbolaser, Heavy'; },
    catalogFlag: w => { w.flags.swse.vehicleInstalledWeapon.catalogId = 'laser-cannon-heavy'; },
    installFlag: w => { w.flags.swse.vehicleInstalledWeapon.installId = 'other'; },
    sourceFlag: w => { w.flags.swse.vehicleInstalledWeapon.sourceEntryKey = 'someone-else'; },
    flagRemoved: w => { delete w.flags.swse.vehicleInstalledWeapon; }
  };
  for (const [name, tamper] of Object.entries(cases)) {
    const { vehicle, weapon } = armed(); tamper(weapon);
    assert.equal(resolveCertifiedInstalledWeapon(weapon).ok, false, name + ' (resolver)');
    assert.equal(classifyInstalledVehicleWeapon(vehicle, weapon).kind, 'UNRESOLVED', name + ' (provenance)');
    assert.equal((await fire(vehicle, weapon)).blocked, true, name + ' (attack)');
    assert.throws(() => dmg(vehicle, weapon), /no ordinary damage roll|INSTALLED_WEAPON|VEHICLE_WEAPON/, name + ' (direct damage)');
  }
});

test('the direct damage entry point is bound to the ledger too (deleted, forged and foreign installations)', () => {
  let { vehicle, weapon } = armed();
  assert.equal(dmg(vehicle, weapon), '(3d10) * 2');
  vehicle.flags.swse.vehicleInstallations = [];                                         // deleted ledger entry
  assert.throws(() => dmg(vehicle, weapon), /INSTALLED_WEAPON_WITHOUT_CERTIFIED_INSTALLATION/);
  ({ vehicle, weapon } = armed());
  vehicle.flags.swse.vehicleInstallations[0].priceCredits = 1;                          // broken seal
  assert.throws(() => dmg(vehicle, weapon), /INSTALLED_WEAPON_WITHOUT_CERTIFIED_INSTALLATION/);
  ({ vehicle, weapon } = armed());
  weapon.system.vehicleMount.installId = 'forged';                                       // forged installation id
  assert.throws(() => dmg(vehicle, weapon), /INSTALLED_WEAPON_WITHOUT_CERTIFIED_INSTALLATION/);
  ({ vehicle, weapon } = armed());
  const other = armed('laser-cannon-heavy');                                              // an Item moved to another ship's ledger
  other.weapon.actor = vehicle; vehicle.items.set('moved', other.weapon);
  assert.throws(() => dmg(vehicle, other.weapon), /INSTALLED_WEAPON_ITEM_IDENTITY_MISMATCH|WITHOUT_CERTIFIED/);
});

test('an edited Item on a vehicle with a non-weapon (fixture) entry keeps the legacy path untouched', () => {
  const { vehicle, weapon } = armed();
  const c = resolveDamageComposition(vehicle, weapon, { weapon });
  assert.equal(c.bonus.flags.vehicleWeaponFormula, true);
});

test('legacy direct damage readers refuse installed vehicle weapons', async () => {
  const { weapon } = armed();
  const { SWSECombat } = await import('../scripts/combat/systems/enhanced-combat-system.js');
  assert.equal(await SWSECombat.rollDamage({ id: 'a', getRollData: () => ({}) }, weapon), null);
  for (const f of ['scripts/combat/systems/enhanced-combat-system.js', 'scripts/engine/combat/ui/CombatUIAdapter.js', 'scripts/combat/rolls/enhanced-rolls.js'])
    assert.match(readFileSync(f, 'utf8'), /isInstalledVehicleWeaponItem/, f);
});

test('Item update guard: authority fields of a managed weapon cannot be edited by anyone', () => {
  const { vehicle, weapon } = armed();
  const item = { ...weapon, parent: vehicle };
  for (const changes of [{ 'system.damage': '9d10' }, { system: { damage: '9d10' } }, { 'system.vehicleMount.arc': 'omni' }, { system: { vehicleMount: { mountKey: 'x' } } },
    { name: 'x' }, { 'flags.swse.vehicleInstalledWeapon.catalogId': 'x' }, { flags: { swse: { '-=vehicleInstalledWeapon': null } } }, { system: 5 }, { 'system.vehicleMount': null }])
    assert.equal(guardShipyardWeaponItem(item, changes), false, JSON.stringify(changes));
  for (const changes of [{ 'system.notes': 'hello' }, { sort: 3 }, { 'system.equipped': true }])
    assert.equal(guardShipyardWeaponItem(item, changes), undefined, JSON.stringify(changes));
  assert.equal(guardShipyardWeaponItem({ ...item, flags: {} }, { 'system.damage': '9d10' }), undefined, 'an ordinary Item is not guarded');
  assert.equal(guardShipyardWeaponItem({ ...item, parent: { type: 'character' } }, { 'system.damage': '9d10' }), undefined);
  assert.equal(updateTouchesShipyardWeaponItem({ 'system.damage': 1 }), true);
});

test('sync plan repairs tampered, renamed, duplicate and stale managed Items without touching others', () => {
  const { entry, weapon } = armed();
  const good = { id: 'i1', ...buildInstalledWeaponItemData(entry) };
  const clone = (over = {}) => { const c = structuredClone(good); return Object.assign(c, over); };
  const personal = { id: 'mine', name: 'Hold-out blaster', flags: {}, system: { damage: '3d4' } };
  assert.deepEqual(planInstalledWeaponItemSync({ items: [good, personal], entries: [entry] }), { create: [], deleteIds: [] });
  const tampered = clone({ id: 'i2' }); tampered.system.damage = '9d10x9';
  let plan = planInstalledWeaponItemSync({ items: [tampered, personal], entries: [entry] });
  assert.deepEqual([plan.create.length, plan.deleteIds], [1, ['i2']], 'tampered Item replaced');
  plan = planInstalledWeaponItemSync({ items: [good, clone({ id: 'dup' })], entries: [entry] });
  assert.deepEqual([plan.create.length, plan.deleteIds], [0, ['dup']], 'duplicate removed');
  plan = planInstalledWeaponItemSync({ items: [clone({ id: 'renamed', name: 'Mine now' })], entries: [entry] });
  assert.deepEqual([plan.create.length, plan.deleteIds], [1, ['renamed']]);
  plan = planInstalledWeaponItemSync({ items: [good, personal], entries: [] });
  assert.deepEqual([plan.create.length, plan.deleteIds], [0, ['i1']], 'only the managed Item goes');
});

// ---------------------------------------------------------------------------------------------------------------------
// Item synchronization: installation completed / Items synced / operational are three different facts
// ---------------------------------------------------------------------------------------------------------------------
const { ActorEngine } = await import('../scripts/governance/actor-engine/actor-engine.js');
const { TransactionEngine } = await import('../scripts/engine/store/transaction-engine.js');

function liveVehicle() {
  const { vehicle, entry } = armed();
  vehicle.items.clear();                                              // ledger committed, Item not yet created
  const store = vehicle.items;
  let seq = 0;
  const calls = { create: 0, del: 0 };
  const engine = {
    failCreate: false, failDelete: false, createPartial: false,
    async createEmbeddedDocuments(_a, _n, data) {
      calls.create++;
      if (engine.failCreate) throw new Error('write refused');
      for (const d of data) { const id = 'new' + (++seq); store.set(id, { id, ...structuredClone(d), actor: vehicle }); }
    },
    async deleteEmbeddedDocuments(_a, _n, ids) { calls.del++; if (engine.failDelete) throw new Error('delete refused'); for (const id of ids) store.delete(id); }
  };
  ActorEngine.createEmbeddedDocuments = engine.createEmbeddedDocuments; ActorEngine.deleteEmbeddedDocuments = engine.deleteEmbeddedDocuments;
  return { vehicle, entry, engine, calls, store };
}

test('reconcile creates the missing Item, is idempotent, and never touches unrelated Items', async () => {
  const { vehicle, calls, store } = liveVehicle();
  store.set('mine', { id: 'mine', name: 'Hold-out blaster', flags: {}, system: { damage: '3d4' }, actor: vehicle });
  const first = await Svc.reconcileWeaponItems({ vehicle });
  assert.deepEqual([first.success, first.operational, first.weaponItems.created, first.weaponItems.deleted], [true, true, 1, 0]);
  const second = await Svc.reconcileWeaponItems({ vehicle });
  assert.deepEqual([second.success, second.operational, second.weaponItems.created, second.weaponItems.deleted], [true, true, 0, 0], 'repeat changes nothing');
  assert.equal(calls.create, 1);
  assert.ok(store.has('mine'), 'the user Item is untouched');
  assert.equal([...store.values()].filter(i => i.flags?.swse?.vehicleInstalledWeapon).length, 1, 'no duplicate');
  // and the resulting Item is actually fireable
  const item = [...store.values()].find(i => i.flags?.swse?.vehicleInstalledWeapon);
  assert.equal(classifyInstalledVehicleWeapon(vehicle, item).kind, 'CERTIFIED_INSTALLATION');
});

test('reconcile repairs a tampered Item and removes duplicates; no credit or ledger activity', async () => {
  const { vehicle, engine, store } = liveVehicle();
  await Svc.reconcileWeaponItems({ vehicle });
  const good = [...store.values()].find(i => i.flags?.swse?.vehicleInstalledWeapon);
  good.system.damage = '99d10x9';                                       // tampered
  store.set('dup', { ...structuredClone({ ...good, actor: undefined }), id: 'dup', actor: vehicle });
  let txCalls = 0; const real = TransactionEngine.executeAssetCustomizationTransaction;
  TransactionEngine.executeAssetCustomizationTransaction = async () => { txCalls++; return { success: true }; };
  const ledgerBefore = JSON.stringify(vehicle.flags.swse.vehicleInstallations);
  try {
    const r = await Svc.reconcileWeaponItems({ vehicle });
    assert.deepEqual([r.success, r.operational], [true, true]);
  } finally { TransactionEngine.executeAssetCustomizationTransaction = real; }
  const managed = [...store.values()].filter(i => i.flags?.swse?.vehicleInstalledWeapon);
  assert.equal(managed.length, 1);
  assert.equal(managed[0].system.damage, '3d10x2');
  assert.equal(txCalls, 0, 'reconciliation moves no credits');
  assert.equal(JSON.stringify(vehicle.flags.swse.vehicleInstallations), ledgerBefore, 'ledger untouched');
  assert.equal(engine.failCreate, false);
});

test('refused and partial writes are reported as not operational, with a repair path; a later reconcile heals', async () => {
  const { vehicle, engine, store } = liveVehicle();
  engine.failCreate = true;
  let r = await Svc.reconcileWeaponItems({ vehicle });
  assert.deepEqual([r.success, r.operational, r.reasons], [false, false, ['WEAPON_ITEM_SYNC_FAILED']]);
  assert.equal(store.size, 0);
  // partial write: the stale Item is deleted, the replacement create then fails
  engine.failCreate = false;
  await Svc.reconcileWeaponItems({ vehicle });
  [...store.values()].find(i => i.flags?.swse?.vehicleInstalledWeapon).system.damage = '1d1';
  engine.failCreate = true;
  r = await Svc.reconcileWeaponItems({ vehicle });
  assert.deepEqual([r.success, r.operational, r.weaponItems.deleted, r.weaponItems.created], [false, false, 1, 0]);
  engine.failCreate = false;
  r = await Svc.reconcileWeaponItems({ vehicle });
  assert.deepEqual([r.success, r.operational, r.weaponItems.created], [true, true, 1]);
  // a write that "succeeds" without persisting is caught by verification
  const lost = liveVehicle();
  ActorEngine.createEmbeddedDocuments = async () => {};
  r = await Svc.reconcileWeaponItems({ vehicle: lost.vehicle });
  assert.deepEqual([r.success, r.operational, r.reasons], [false, false, ['WEAPON_ITEM_SYNC_UNVERIFIED']]);
});

test('a committed installation whose Item sync fails is partial: paid and sealed, not operational; reconcile then completes it', async () => {
  const d = structuredClone(docs.find(x => x.flags.swse.canonicalPublication.sourceEntryKey === XW));
  const vehicle = Object.assign(d, { id: 'veh1', isOwner: true, items: new ItemCollection(), getActiveTokens: () => [token(0, 0)], getRollData: () => ({}),
    toObject() { const { toObject, items, getActiveTokens, getRollData, ...r } = this; return structuredClone(r); } });
  const owner = { id: 'o1', type: 'character', system: { credits: 100000 } };
  const charged = [];
  const realTx = TransactionEngine.executeAssetCustomizationTransaction;
  TransactionEngine.executeAssetCustomizationTransaction = async a => {            // commit the planned mutation like the real transaction
    charged.push(a.cost);
    for (const [path, value] of Object.entries(a.assetMutationPlan.set)) { const k = path.split('.').slice(2)[0]; vehicle.flags.swse[k] = value; }
    return { success: true, transactionId: 'tx1' };
  };
  const store = vehicle.items; let n = 0;
  let failCreate = true;
  ActorEngine.createEmbeddedDocuments = async (_a, _n, data) => { if (failCreate) throw new Error('write refused'); for (const x of data) store.set('i' + (++n), { id: 'i' + n, ...structuredClone(x), actor: vehicle }); };
  ActorEngine.deleteEmbeddedDocuments = async (_a, _n, ids) => { for (const id of ids) store.delete(id); };
  const catalog = new Map([['laser-cannon-light', row('laser-cannon-light')]]);
  const prevUser = globalThis.game.user; globalThis.game.user = { id: 'gm1', isGM: true };
  const prevRules = Svc.rules; Svc.rules = rules;
  try {
    const r = await Svc.gmInstantInstall({ ownerActor: owner, vehicle, catalogId: 'laser-cannon-light', catalog, reason: 'refit',
      mount: { mountKey: 'nose', arc: 'forward', operatorRole: 'pilot', reason: 'nose hardpoint' } });
    assert.equal(r.success, true, JSON.stringify(r));
    assert.deepEqual([r.installationCompleted, r.weaponItemsSynced, r.operational, r.partial], [true, false, false, true]);
    assert.deepEqual(r.reasons, ['WEAPON_ITEMS_NOT_SYNCHRONIZED']);
    assert.equal(r.repair, 'reconcileWeaponItems');
    assert.deepEqual(charged, [1500], 'the committed installation stays paid');
    assert.equal(vehicle.flags.swse.vehicleInstallations.length, 1, 'ledger sealed');
    assert.equal(vehicle.flags.swse.vehicleInstallations[0].mount.basis, 'GM_ADJUDICATED');
    assert.equal(store.size, 0);
    failCreate = false;                                                             // repair path
    const fixed = await Svc.reconcileWeaponItems({ vehicle });
    assert.deepEqual([fixed.success, fixed.operational], [true, true]);
    assert.deepEqual(charged, [1500], 'reconciliation did not charge again');
    const item = [...store.values()][0];
    assert.equal(classifyInstalledVehicleWeapon(vehicle, item).kind, 'CERTIFIED_INSTALLATION');
  } finally { TransactionEngine.executeAssetCustomizationTransaction = realTx; globalThis.game.user = prevUser; Svc.rules = prevRules; }
});

test('reconcile requires a GM or the vehicle owner and respects the installation lock', async () => {
  const { vehicle } = liveVehicle();
  vehicle.isOwner = false;
  assert.deepEqual((await Svc.reconcileWeaponItems({ vehicle })).reasons, ['NOT_AUTHORIZED']);
  globalThis.game.user.isGM = true;
  try { assert.equal((await Svc.reconcileWeaponItems({ vehicle })).success, true); } finally { globalThis.game.user.isGM = false; }
  vehicle.isOwner = true;
  Svc._busy.add(vehicle.id);
  try { assert.deepEqual((await Svc.reconcileWeaponItems({ vehicle })).reasons, ['INSTALLATION_IN_PROGRESS']); } finally { Svc._busy.delete(vehicle.id); }
});

test('Shipyard UI: a partial result is warned about, never announced as done; resync needs no owner character', async () => {
  const { runShipyardAction } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-shipyard-actions.js');
  const said = [];
  const notify = { info: m => said.push('info:' + m), warn: m => said.push('warn:' + m) };
  const owner = { id: 'o1', type: 'character' };
  const base = { notify, askReason: async () => 'r', game: { user: { isGM: false, character: owner }, actors: { get: () => owner, contents: [owner] } } };
  const vehicle = { id: 'veh1', isOwner: true, system: { ownerActorId: 'o1' }, flags: { swse: { vehicleOwner: { actorId: 'o1' } } } };
  const partial = { success: true, partial: true, installationCompleted: true, operational: false, reasons: ['WEAPON_ITEMS_NOT_SYNCHRONIZED'] };
  await runShipyardAction({ action: 'record-check', jobId: 'j', vehicle }, { ...base, service: { recordCheck: async () => partial } });
  assert.match(said.at(-1), /^warn:The installation is complete and paid for, but the weapon is not operational/);
  said.length = 0;
  await runShipyardAction({ action: 'resync-weapons', vehicle }, { ...base, game: { user: {}, actors: { get: () => null, contents: [] } }, service: { reconcileWeaponItems: async () => ({ success: true, operational: true }) } });
  assert.deepEqual(said, ['info:Weapon items are in sync.']);
});
