/**
 * GM-certified participating-weapon count of a PRINTED battery: the source prints the gunner count, not the weapon count (and the count is never
 * inferred from the gunners); a GM may certify it on the world Actor, which adds FULL-BATTERY mode beside the independent-weapon mode through the
 * existing battery model. Reported apart from canonical coverage; guarded; the record is untouched.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { actors, world, ActorEngine } from './helpers/vehicle-weapon-world.mjs';

const { assessStockWeaponGroups } = await import('../scripts/domain/vehicles/vehicle-stock-weapon-groups.js');
const { planStockBatteryConfig, validateStockBatteryConfig, isBatteryConfigurable, BATTERY_CONFIG_REASONS, STOCK_BATTERY_CONFIG_FLAG } = await import('../scripts/domain/vehicles/vehicle-stock-battery-config.js');
const { VehicleStockAmmoConfigService: Svc } = await import('../scripts/engine/vehicles/vehicle-stock-ammo-config-service.js');
const { VehicleInstallationService } = await import('../scripts/engine/vehicles/vehicle-installation-service.js');
const { resolveVehicleWeaponAuthority, resolveVehicleWeaponDamage } = await import('../scripts/domain/vehicles/vehicle-weapon-damage.js');
const { guardVehicleInstallationLedger } = await import('../scripts/actors/vehicle/vehicle-precreate-hooks.js');
const { executableModesOf } = await import('../scripts/domain/vehicles/vehicle-stock-weapon-items.js');

const GM = { isGM: true, id: 'gm1' };
class Items extends Map { [Symbol.iterator]() { return this.values(); } get contents() { return [...this.values()]; } filter(f) { return this.contents.filter(f); } find(f) { return this.contents.find(f); } map(f) { return this.contents.map(f); } some(f) { return this.contents.some(f); } }
const setPath = (obj, key, value) => { const parts = key.split('.'); let o = obj; for (const q of parts.slice(0, -1)) o = (o[q.replace(/^==/, '')] ??= {}); o[parts.at(-1).replace(/^==/, '')] = value; };

const found = (() => {
  for (const d of actors) {
    const g = assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups.find(x => x.gmBatteryConfigurable && x.executable && x.battery.gunners <= 3);
    if (g) return { key: d.flags.swse.canonicalPublication.sourceEntryKey, doc: d, groupKey: g.groupKey, gunners: g.battery.gunners };
  }
  return null;
})();
function stockVehicle() {
  const veh = Object.assign(structuredClone(found.doc), { id: 'batveh', isOwner: true, items: new Items(), getActiveTokens: () => [], getRollData: () => ({}),
    toObject() { const { toObject, items, getActiveTokens, getRollData, ...r } = this; return structuredClone(r); } });
  let n = 0;
  ActorEngine.createEmbeddedDocuments = async (_a, _n, data) => { for (const x of data) { const id = 'bi' + (++n); veh.items.set(id, { id, ...structuredClone(x), actor: veh, parent: veh }); } };
  ActorEngine.deleteEmbeddedDocuments = async (_a, _n, ids) => { for (const id of ids) veh.items.delete(id); };
  ActorEngine.updateActor = async (actor, data) => { for (const [k, v] of Object.entries(data)) setPath(actor, k, v); };
  return veh;
}
const group = veh => assessStockWeaponGroups(veh.flags.swse.universalVehicleSource.source, { gmBattery: veh.flags?.swse?.[STOCK_BATTERY_CONFIG_FLAG] ?? {} }).groups.find(g => g.groupKey === found.groupKey);
const itemsOf = veh => veh.items.contents.filter(i => i.flags?.swse?.vehicleStockWeapon?.groupKey === found.groupKey);

test('SOURCE: the canonical count never includes certifications; the certifiable batteries are reported apart', () => {
  assert.ok(found);
  let canonical = 0, certifiable = 0, full = 0;
  for (const d of actors) for (const g of assessStockWeaponGroups(d.flags.swse.universalVehicleSource.source).groups) {
    if (g.executable) canonical++;
    if (g.gmBatteryConfigurable && g.executable) certifiable++;
    if (g.modes?.['full-battery']?.executable) full++;
    assert.notEqual(g.gmBatteryConfigured, true);
  }
  assert.equal(canonical, 542);
  assert.equal(full, 1, 'canonically only one group has a printed weapon count');
  assert.ok(certifiable >= 150, `${certifiable} printed batteries can be certified`);
});

test('PLAN: the count must be legal for the battery model, never derived from the gunners; a reason is required', () => {
  const g = assessStockWeaponGroups(found.doc.flags.swse.universalVehicleSource.source).groups.find(x => x.groupKey === found.groupKey);
  assert.equal(isBatteryConfigurable(g), true);
  const base = { group: g, sourceEntryKey: found.key, reason: 'table ruling', by: 'gm1' };
  assert.equal(planStockBatteryConfig({ ...base, reason: '', weaponCount: 4 }).reason, BATTERY_CONFIG_REASONS.REASON_REQUIRED);
  for (const bad of [0, 7, 2.5, 'x', null]) assert.equal(planStockBatteryConfig({ ...base, weaponCount: bad }).reason, BATTERY_CONFIG_REASONS.COUNT_INVALID, String(bad));
  const ok = planStockBatteryConfig({ ...base, weaponCount: 4 });
  assert.equal(ok.ok, true);
  assert.deepEqual([ok.config.weaponCount, ok.config.gunners], [4, found.gunners]);
  assert.equal(validateStockBatteryConfig(ok.config, g, found.key).ok, true);
  for (const bad of [{ ...ok.config, groupKey: 'x' }, { ...ok.config, gunners: ok.config.gunners + 1 }, { ...ok.config, weaponCount: 9 }, { ...ok.config, sourceEntryKey: 'y' }, { ...ok.config, schema: 'z' }])
    assert.equal(validateStockBatteryConfig(bad, g, found.key).ok, false);
});

test('SERVICE: GM-only; adds full-battery mode beside independent-weapon; participating weapons come from the certified count; clear removes only the full-battery Item', async () => {
  world(); globalThis.game.user.id = 'gm1';
  const veh = stockVehicle();
  const record = structuredClone(veh.flags.swse.universalVehicleSource.source);
  await VehicleInstallationService.syncWeaponItems(veh);
  assert.deepEqual(itemsOf(veh).map(i => i.flags.swse.vehicleStockWeapon.fireMode), ['independent-weapon']);
  assert.equal(Svc.batteryRows(veh).find(r => r.groupKey === found.groupKey).state, 'INDEPENDENT_WEAPON_ONLY');
  assert.deepEqual((await Svc.configureBattery({ vehicle: veh, groupKey: found.groupKey, weaponCount: 4, reason: 'x', user: { isGM: false } })).reasons, [BATTERY_CONFIG_REASONS.GM_ONLY]);
  assert.equal((await Svc.configureBattery({ vehicle: veh, groupKey: found.groupKey, weaponCount: 7, reason: 'x', user: GM })).reasons[0], BATTERY_CONFIG_REASONS.COUNT_INVALID);
  const r = await Svc.configureBattery({ vehicle: veh, groupKey: found.groupKey, weaponCount: 4, reason: 'table ruling', user: GM });
  assert.equal(r.success, true, JSON.stringify(r));
  assert.deepEqual(itemsOf(veh).map(i => i.flags.swse.vehicleStockWeapon.fireMode).sort(), ['full-battery', 'independent-weapon']);
  assert.deepEqual(executableModesOf(group(veh)).sort(), ['full-battery', 'independent-weapon']);
  assert.equal(Svc.batteryRows(veh).find(x => x.groupKey === found.groupKey).weaponCount, 4);
  assert.deepEqual(veh.flags.swse.universalVehicleSource.source, record, 'the publication record is untouched');
  assert.equal((await Svc.configureBattery({ vehicle: veh, groupKey: found.groupKey, weaponCount: 5, reason: 'again', user: GM })).reasons[0], BATTERY_CONFIG_REASONS.EXISTS);
  // the full-battery authority carries the battery; the independent one does not
  const fullItem = itemsOf(veh).find(i => i.flags.swse.vehicleStockWeapon.fireMode === 'full-battery');
  const indItem = itemsOf(veh).find(i => i.flags.swse.vehicleStockWeapon.fireMode === 'independent-weapon');
  const fa = resolveVehicleWeaponAuthority(fullItem), ia = resolveVehicleWeaponAuthority(indItem);
  assert.deepEqual([fa.ok, fa.battery.participatingWeapons, ia.ok, ia.battery], [true, 4, true, undefined]);
  // margin hits add weapon dice BEFORE the multiplier, bounded by the participating weapons
  const base = resolveVehicleWeaponDamage(fullItem, { batteryExtraHits: 0 }), two = resolveVehicleWeaponDamage(fullItem, { batteryExtraHits: 2 });
  const n = f => Number(/^(\d+)d/.exec(f)[1]);
  assert.equal(n(two.formula), n(base.formula) + 2);
  assert.equal(resolveVehicleWeaponDamage(fullItem, { batteryExtraHits: 9 }).ok, false, 'never more extra hits than participating weapons');
  assert.equal(resolveVehicleWeaponDamage(indItem, { batteryExtraHits: 1 }).ok, false, 'the independent weapon produces no margin hits');
  // clear
  assert.equal((await Svc.clearBattery({ vehicle: veh, groupKey: found.groupKey, user: GM })).success, true);
  assert.deepEqual(itemsOf(veh).map(i => i.flags.swse.vehicleStockWeapon.fireMode), ['independent-weapon']);
});

test('INTEGRITY: the flag is guarded; a tampered certification is not trusted; sheet rows are GM-only', async () => {
  world(); globalThis.game.user.id = 'gm1';
  assert.equal(guardVehicleInstallationLedger({ id: 'zz' }, { [`flags.swse.==${STOCK_BATTERY_CONFIG_FLAG}`]: { forged: true } }), false);
  const veh = stockVehicle();
  veh.flags.swse[STOCK_BATTERY_CONFIG_FLAG] = { [found.groupKey]: { schema: 'swse.vehicle.stockBatteryConfig.v1', state: 'GM_CONFIGURED_EXECUTABLE', groupKey: found.groupKey, sourceEntryKey: found.key, weaponCount: 99, gunners: found.gunners } };
  assert.equal(group(veh).modes['full-battery'].executable, false);
  const { buildWeaponOpsView, runWeaponAction } = await import('../scripts/sheets/v2/vehicle-sheet/vehicle-weapon-ops.js');
  delete veh.flags.swse[STOCK_BATTERY_CONFIG_FLAG];
  assert.equal(buildWeaponOpsView(veh, { isGM: true }).hasBatteryRows, true);
  assert.equal(buildWeaponOpsView(veh, { isGM: false }).hasBatteryRows, false);
  const said = [];
  const deps = { service: { ammoConfig: Svc }, notify: { info: m => said.push(m), warn: m => said.push('W ' + m) }, askBatteryCount: async () => ({ weaponCount: 3, reason: 'sheet' }) };
  assert.equal((await runWeaponAction({ action: 'battery-config', itemId: found.groupKey, vehicle: veh }, deps)).success, true, said.join('|'));
  assert.equal((await runWeaponAction({ action: 'battery-config-clear', itemId: found.groupKey, vehicle: veh }, deps)).success, true);
});
