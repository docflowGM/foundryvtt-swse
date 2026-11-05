/** Per launcher group of a published vehicle: its readiness state (canonical / GM-configured / unresolved) and what a GM still has to supply. Pure read. */
import { getVerifiedPublishedRecord } from './vehicle-source-identity.js';
import { assessStockWeaponGroups } from './vehicle-stock-weapon-groups.js';
import { READINESS, describeNeeds, readStockAmmoConfigs } from './vehicle-stock-ammo-config.js';
import { readStockBatteryConfigs } from './vehicle-stock-battery-config.js';

export function stockAmmoReadinessRows(vehicle) {
  const record = getVerifiedPublishedRecord(vehicle);
  if (!record) return [];
  const configs = readStockAmmoConfigs(vehicle);
  return assessStockWeaponGroups(record, { gmAmmo: configs, gmBattery: readStockBatteryConfigs(vehicle) }).groups
    .filter(g => g.gmConfigurable || g.ammunition)
    .map(g => ({
      groupKey: g.groupKey, label: g.label,
      state: g.gmConfigured ? READINESS.GM_CONFIGURED : g.executable ? READINESS.CANONICAL : READINESS.UNRESOLVED,
      configurable: g.gmConfigurable === true && !g.gmConfigured, needs: g.gmConfigurable && !g.gmConfigured ? describeNeeds(g) : null,
      config: g.gmConfigured ? configs[g.groupKey] : null, blockers: g.executable ? [] : g.reasons
    }));
}

/** Printed batteries that run only as one independent weapon because the source prints no weapon count, and those a GM has certified for full-battery mode. */
export function stockBatteryReadinessRows(vehicle) {
  const record = getVerifiedPublishedRecord(vehicle);
  if (!record) return [];
  const configs = readStockBatteryConfigs(vehicle);
  return assessStockWeaponGroups(record, { gmAmmo: readStockAmmoConfigs(vehicle), gmBattery: configs }).groups
    .filter(g => (g.gmBatteryConfigurable && g.executable) || g.gmBatteryConfigured)
    .map(g => ({ groupKey: g.groupKey, label: g.label, gunners: g.battery.gunners, configured: g.gmBatteryConfigured === true, weaponCount: g.gmBatteryConfigured ? g.battery.weaponCount : null,
      state: g.gmBatteryConfigured ? 'GM_CONFIGURED_EXECUTABLE' : 'INDEPENDENT_WEAPON_ONLY', config: g.gmBatteryConfigured ? configs[g.groupKey] : null }));
}
