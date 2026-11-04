/**
 * GM-configured stock launchers: a group blocked ONLY by missing ammunition facts becomes executable when a GM supplies exactly those facts
 * on the world Actor. It reuses the stock launcher family and ledger (VehicleAmmunitionService), never edits the publication record, never
 * invents a quantity, and is reported apart from canonical coverage.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { actors, world, ActorEngine, VehicleAmmunitionService, targetAt } from './helpers/vehicle-weapon-world.mjs';

const { assessStockWeaponGroups } = await import('../scripts/domain/vehicles/vehicle-stock-weapon-groups.js');
const { planStockAmmoConfig, validateStockAmmoConfig, describeNeeds, isGmConfigurable, AMMO_LIFTABLE, CONFIG_REASONS, STOCK_AMMO_CONFIG_FLAG } = await import('../scripts/domain/vehicles/vehicle-stock-ammo-config.js');
const { VehicleStockAmmoConfigService } = await import('../scripts/engine/vehicles/vehicle-stock-ammo-config-service.js');
const { VehicleInstallationService } = await import('../scripts/engine/vehicles/vehicle-installation-service.js');
const { guardVehicleInstallationLedger } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
const { rollAttack } = await import('../scripts/combat/rolls/attacks.js');
const { RollEngine } = await import('../scripts/engine/roll-engine.js');

const GM = { isGM: true, id: 'gm1' };
class Items extends Map { [Symbol.iterator]() { return this.values(); } get contents() { return [...this.values()]; } filter(f) { return this.contents.filter(f); } find(f) { return this.contents.find(f); } map(f) { return this.contents.map(f); } some(f) { return this.contents.some(f); } }
const setPath = (obj, key, value) => { const parts = key.split('.'); let o = obj; for (const q of parts.slice(0, -1)) o = (o[q.replace(/^==/, '')] ??= {}); o[parts.at(-1).replace(/^==/, '')] = value; };

// a configurable proton-torpedo group: blocked ONLY by the ammunition facts
const found = (() => {
  for (const d of actors) {
    const g = assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups.find(x => x.gmConfigurable && x.label === 'proton torpedoes' && x.area);
    if (g) return { key: d.flags.swse.canonicalPublication.sourceEntryKey, doc: d, groupKey: g.groupKey };
  }
  return null;
})();

function stockVehicle() {
  const veh = Object.assign(structuredClone(found.doc), { id: 'cfgveh', isOwner: true, items: new Items(), getActiveTokens: () => [{ center: { x: 0, y: 0 }, document: { rotation: 0 } }], getRollData: () => ({}),
    toObject() { const { toObject, items, getActiveTokens, getRollData, ...r } = this; return structuredClone(r); } });
  let n = 0;
  ActorEngine.createEmbeddedDocuments = async (_a, _n, data) => { for (const x of data) { const id = 'ci' + (++n); veh.items.set(id, { id, ...structuredClone(x), actor: veh, parent: veh }); } };
  ActorEngine.deleteEmbeddedDocuments = async (_a, _n, ids) => { for (const id of ids) veh.items.delete(id); };
  ActorEngine.updateActor = async (actor, data) => { for (const [k, v] of Object.entries(data)) setPath(actor, k, v); };
  ActorEngine.updateOwnedItems = async (actor, updates) => { for (const u of updates) { const it = actor.items.get(u._id); for (const [k, v] of Object.entries(u)) if (k !== '_id') setPath(it, k, v); } };
  return veh;
}
const group = veh => assessStockWeaponGroups(veh.flags.swse.universalVehicleSource.source, { gmAmmo: veh.flags?.swse?.[STOCK_AMMO_CONFIG_FLAG] ?? {} }).groups.find(g => g.groupKey === found.groupKey);

test('SOURCE: only the four ammunition refusals are liftable; canonical coverage is unchanged by configuration and the configurable set is reported apart', () => {
  assert.ok(found, 'a configurable proton-torpedo group exists');
  assert.deepEqual([...AMMO_LIFTABLE].sort(), ['STOCK_AMMUNITION_LIMITED_UNTRACKED', 'STOCK_AMMUNITION_PAYLOAD_NOT_PRINTED', 'STOCK_LAUNCHER_ALLOCATION_NOT_CERTIFIED', 'STOCK_LAUNCHER_IDENTITY_NOT_ESTABLISHED']);
  assert.equal(isGmConfigurable(['STOCK_AMMUNITION_LIMITED_UNTRACKED', 'STOCK_FIRING_ARC_NOT_REVIEWED']), false, 'another blocker is never lifted');
  assert.equal(isGmConfigurable(['STOCK_AMMUNITION_LIMITED_UNTRACKED'], { battery: {} }), false);
  let canonical = 0, configurable = 0;
  for (const d of actors) for (const g of assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups) { if (g.executable) canonical++; if (g.gmConfigurable) configurable++; assert.notEqual(g.gmConfigured, true); }
  assert.equal(canonical, 528, 'the canonical stock count never includes configurations');
  assert.ok(configurable >= 90, `${configurable} groups are GM-configurable`);
});

test('PLAN: printed facts are never overridden; missing ones must be supplied; nothing is defaulted; a reason is required', () => {
  const g = assessStockWeaponGroups(found.doc.flags.swse.universalVehicleSource.source).groups.find(x => x.groupKey === found.groupKey);
  const need = describeNeeds(g);
  assert.equal(need.launcher.catalog, 'proton-torpedo-launcher');
  const base = { group: g, sourceEntryKey: found.key, reason: 'GM table ruling', by: 'gm1' };
  assert.equal(planStockAmmoConfig({ ...base, reason: '  ', input: { payload: 6, launchers: 1 } }).reason, CONFIG_REASONS.REASON_REQUIRED);
  assert.equal(planStockAmmoConfig({ ...base, input: {} }).reason, need.payload.printed ? CONFIG_REASONS.LAUNCHERS_REQUIRED : CONFIG_REASONS.PAYLOAD_REQUIRED);
  assert.equal(planStockAmmoConfig({ ...base, input: { payload: 6, launchers: 1, magazineCapacity: 9 } }).reason, CONFIG_REASONS.CAPACITY_CONTRADICTS_CATALOG, 'the catalog capacity is not overridable');
  assert.equal(planStockAmmoConfig({ ...base, input: { payload: 6, launchers: 1, loaded: 99 } }).reason, CONFIG_REASONS.LOADED_INVALID);
  assert.equal(planStockAmmoConfig({ ...base, group: { ...g, gmConfigurable: false }, input: { payload: 6, launchers: 1 } }).reason, CONFIG_REASONS.NOT_CONFIGURABLE);
  const ok = planStockAmmoConfig({ ...base, input: { payload: 6, launchers: 2 } });
  assert.equal(ok.ok, true, JSON.stringify(ok));
  assert.deepEqual([ok.config.capacity, ok.config.launchers, ok.config.payload, ok.config.loaded, ok.config.guided, ok.config.state], [3, 2, need.payload.printed ?? 6, Math.min(need.payload.printed ?? 6, 6), true, 'GM_CONFIGURED_EXECUTABLE']);
  // a GM-selected (non-catalog) launcher needs its own capacity and ammunition and is never assumed guided
  const custom = planStockAmmoConfig({ ...base, group: { ...g, label: 'strange launcher', evidence: {} }, input: { payload: 4, launchers: 1, magazineCapacity: 2, ammunition: 'strange round' } });
  assert.equal(custom.ok, true);
  assert.deepEqual([custom.config.guided, custom.config.launcherId.startsWith('gm:'), custom.config.capacity], [false, true, 2]);
  assert.equal(planStockAmmoConfig({ ...base, group: { ...g, label: 'strange launcher', evidence: {} }, input: { payload: 4, launchers: 1 } }).reason, CONFIG_REASONS.CAPACITY_REQUIRED);
});

test('SERVICE: GM-only; arms the launcher through the ordinary sync; the ledger is the stock ledger; the publication record is untouched', async () => {
  world(); globalThis.game.user.id = 'gm1';
  const veh = stockVehicle();
  const record = structuredClone(veh.flags.swse.universalVehicleSource.source);
  await VehicleInstallationService.syncWeaponItems(veh);
  assert.equal(veh.items.contents.filter(i => i.flags?.swse?.vehicleStockWeapon?.groupKey === found.groupKey).length, 0, 'not executable from the source alone');
  assert.equal(VehicleStockAmmoConfigService.rows(veh).find(r => r.groupKey === found.groupKey).state, 'UNRESOLVED');
  assert.deepEqual((await VehicleStockAmmoConfigService.configure({ vehicle: veh, groupKey: found.groupKey, input: { payload: 6, launchers: 2 }, reason: 'x', user: { isGM: false } })).reasons, [CONFIG_REASONS.GM_ONLY]);
  assert.equal((await VehicleStockAmmoConfigService.configure({ vehicle: veh, groupKey: found.groupKey, input: { launchers: 2 }, reason: 'table ruling', user: GM })).success, !!describeNeeds(group(veh)).payload.printed);
  if (!veh.flags.swse[STOCK_AMMO_CONFIG_FLAG]) {
    const r = await VehicleStockAmmoConfigService.configure({ vehicle: veh, groupKey: found.groupKey, input: { payload: 6, launchers: 2 }, reason: 'table ruling', user: GM });
    assert.equal(r.success, true, JSON.stringify(r));
  }
  const cfg = veh.flags.swse[STOCK_AMMO_CONFIG_FLAG][found.groupKey];
  assert.equal(cfg.state, 'GM_CONFIGURED_EXECUTABLE');
  assert.equal(VehicleStockAmmoConfigService.rows(veh).find(r => r.groupKey === found.groupKey).state, 'GM_CONFIGURED_EXECUTABLE');
  const item = veh.items.contents.find(i => i.flags?.swse?.vehicleStockWeapon?.groupKey === found.groupKey);
  assert.ok(item, 'the launcher Item is armed');
  const led = item.flags.swse.vehicleAmmo;
  assert.deepEqual([led.launchers, led.capacity, led.allocation, led.loaded + led.reserve + led.expended], [cfg.launchers, 3, 'gm-configured', cfg.payload], 'conservation: payload = loaded + reserve + expended');
  assert.deepEqual(veh.flags.swse.universalVehicleSource.source, record, 'the publication record is untouched');
  assert.equal((await VehicleStockAmmoConfigService.configure({ vehicle: veh, groupKey: found.groupKey, input: { payload: 6, launchers: 2 }, reason: 'again', user: GM })).reasons[0], CONFIG_REASONS.EXISTS);
  // the SAME stock ledger service spends, refunds and reloads
  veh.__item = item;
  const before = item.flags.swse.vehicleAmmo.loaded;
  const spend = await VehicleAmmunitionService.spendLaunch(veh, item, { attackId: 'a1' });
  assert.equal(spend.spent, true);
  assert.equal(item.flags.swse.vehicleAmmo.loaded, before - 1);
  assert.equal((await VehicleAmmunitionService.spendLaunch(veh, item, { attackId: 'a1' })).replay, true, 'idempotent per attack');
  await VehicleAmmunitionService.refundLaunch(spend);
  assert.equal(item.flags.swse.vehicleAmmo.loaded, before);
  // an empty magazine refuses; a GM reload moves reserve (creating nothing)
  const total = led.payload;
  for (let i = 0; i < before; i++) await VehicleAmmunitionService.spendLaunch(veh, item, { attackId: 'e' + i });
  assert.equal((await VehicleAmmunitionService.canLaunch(veh, item)).ok, false);
  const reload = await VehicleAmmunitionService.gmReload(veh, item, { user: GM });
  const l2 = item.flags.swse.vehicleAmmo;
  assert.equal(l2.loaded + l2.reserve + l2.expended, total, 'reloading creates nothing');
  assert.ok(reload.ok === true || l2.reserve === 0);
});

test('ATTACK: a GM-configured launcher fires through the one attack pipeline and spends exactly one unit; an unconfigured one cannot fire', async () => {
  world(); globalThis.game.user.id = 'gm1';
  const veh = stockVehicle();
  await VehicleInstallationService.syncWeaponItems(veh);
  const needs = describeNeeds(group(veh));
  await VehicleStockAmmoConfigService.configure({ vehicle: veh, groupKey: found.groupKey, input: { payload: needs.payload.printed ?? 6, launchers: needs.launchers.printed ?? 1 }, reason: 'table ruling', user: GM });
  const item = veh.items.contents.find(i => i.flags?.swse?.vehicleStockWeapon?.groupKey === found.groupKey);
  assert.ok(item);
  const r0 = RollEngine.safeRoll;
  RollEngine.safeRoll = async formula => { const b = Number(/1d20\s*\+\s*(-?\d+)/.exec(String(formula))?.[1] ?? 0); return { total: 15 + b, formula, dice: [{ results: [{ result: 15 }] }], toJSON() { return { total: 15 + b, formula }; } }; };
  const tgt = { ...targetAt(1), type: 'vehicle', system: { size: 'medium', defenses: { reflex: { total: 10 } } } };
  const loadedBefore = item.flags.swse.vehicleAmmo.loaded;
  let res;
  try { res = await rollAttack(veh, item, { abstractCrewQuality: 'normal', target: tgt }); } finally { RollEngine.safeRoll = r0; }
  assert.ok(res, 'the attack resolved');
  assert.equal(item.flags.swse.vehicleAmmo.loaded, loadedBefore - 1, 'exactly one unit spent');
  // clearing the configuration removes the launcher again
  assert.equal((await VehicleStockAmmoConfigService.clear({ vehicle: veh, groupKey: found.groupKey, user: GM })).success, true);
  assert.equal(veh.items.contents.some(i => i.flags?.swse?.vehicleStockWeapon?.groupKey === found.groupKey), false);
  assert.equal(group(veh).executable, false);
});

test('INTEGRITY: the configuration flag is guarded; a forged or source-contradicting configuration is not trusted', async () => {
  world();
  assert.equal(guardVehicleInstallationLedger({ id: 'zz' }, { [`flags.swse.==${STOCK_AMMO_CONFIG_FLAG}`]: { forged: true } }), false);
  const veh = stockVehicle();
  const g = group(veh);
  const needs = describeNeeds(g);
  const good = planStockAmmoConfig({ group: g, sourceEntryKey: found.key, reason: 'r', input: { payload: needs.payload.printed ?? 6, launchers: needs.launchers.printed ?? 1 } }).config;
  assert.equal(validateStockAmmoConfig(good, g, found.key).ok, true);
  for (const bad of [{ ...good, groupKey: 'other' }, { ...good, capacity: good.capacity + 1 }, { ...good, loaded: good.payload + 1 }, { ...good, state: 'CANONICAL_SOURCE_CERTIFIED' }, { ...good, sourceEntryKey: 'elsewhere' }, { ...good, schema: 'x' }])
    assert.equal(validateStockAmmoConfig(bad, g, found.key).ok, false);
  veh.flags.swse[STOCK_AMMO_CONFIG_FLAG] = { [found.groupKey]: { ...good, capacity: 99 } };
  assert.equal(group(veh).executable, false, 'a tampered configuration leaves the group non-executable');
});

test('SHEET: only a GM sees the launcher configuration rows; the action asks for the missing facts and calls the service; a non-GM sees none', async () => {
  world(); globalThis.game.user.id = 'gm1';
  const { buildWeaponOpsView, runWeaponAction } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-weapon-ops.js');
  const veh = stockVehicle();
  const rows = buildWeaponOpsView(veh, { isGM: true }).ammoRows;
  const row = rows.find(r => r.groupKey === found.groupKey);
  assert.ok(row && row.isConfigured === false && /Unresolved/.test(row.stateLabel));
  assert.equal(buildWeaponOpsView(veh, { isGM: false }).hasAmmoRows, false);
  const said = [];
  const needs = describeNeeds(group(veh));
  const deps = { service: { ammoConfig: VehicleStockAmmoConfigService }, notify: { info: m => said.push(m), warn: m => said.push('W ' + m) },
    askAmmoConfig: async r => ({ reason: 'sheet test', values: { payload: needs.payload.printed ?? 6, launchers: needs.launchers.printed ?? 1 } }) };
  const r = await runWeaponAction({ action: 'ammo-config', itemId: found.groupKey, vehicle: veh }, deps);
  assert.equal(r.success, true, said.join('|'));
  assert.equal(buildWeaponOpsView(veh, { isGM: true }).ammoRows.find(x => x.groupKey === found.groupKey).isConfigured, true);
  assert.equal((await runWeaponAction({ action: 'ammo-config', itemId: found.groupKey, vehicle: veh }, { ...deps, askAmmoConfig: async () => null })).success, false);
  assert.equal((await runWeaponAction({ action: 'ammo-config-clear', itemId: found.groupKey, vehicle: veh }, deps)).success, true);
});
