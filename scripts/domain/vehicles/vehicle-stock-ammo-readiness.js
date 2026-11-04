/** Per launcher group of a published vehicle: its readiness state (canonical / GM-configured / unresolved) and what a GM still has to supply. Pure read. */
import { getVerifiedPublishedRecord } from './vehicle-source-identity.js';
import { assessStockWeaponGroups } from './vehicle-stock-weapon-groups.js';
import { READINESS, describeNeeds, readStockAmmoConfigs } from './vehicle-stock-ammo-config.js';

export function stockAmmoReadinessRows(vehicle) {
  const record = getVerifiedPublishedRecord(vehicle);
  if (!record) return [];
  const configs = readStockAmmoConfigs(vehicle);
  return assessStockWeaponGroups(record, { gmAmmo: configs }).groups
    .filter(g => g.gmConfigurable || g.ammunition)
    .map(g => ({
      groupKey: g.groupKey, label: g.label,
      state: g.gmConfigured ? READINESS.GM_CONFIGURED : g.executable ? READINESS.CANONICAL : READINESS.UNRESOLVED,
      configurable: g.gmConfigurable === true && !g.gmConfigured, needs: g.gmConfigurable && !g.gmConfigured ? describeNeeds(g) : null,
      config: g.gmConfigured ? configs[g.groupKey] : null, blockers: g.executable ? [] : g.reasons
    }));
}
