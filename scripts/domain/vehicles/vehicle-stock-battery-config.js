/**
 * GM-certified participating-weapon count for a PRINTED weapon battery (Core p. 170: a battery is up to six identical weapons; each 3 points the
 * attack beats Reflex adds another weapon that hits, up to the weapons participating). The canonical records print the gunner count of a battery
 * but, for all but two groups, not the number of weapons -- and the count is never inferred from the gunners (owner direction V-P6C-02).
 * Without it a battery fires only as one independent weapon. A GM may certify the count on the world Actor; the group then also runs in FULL-BATTERY
 * mode through the same battery model. Reported apart from canonical coverage; the publication record is untouched. Pure.
 */
import { establishPublishedBattery, BATTERY_REASONS } from './vehicle-weapon-battery.js';

export const STOCK_BATTERY_CONFIG_FLAG = 'stockBatteryConfig';
export const STOCK_BATTERY_CONFIG_SCHEMA = 'swse.vehicle.stockBatteryConfig.v1';
export const BATTERY_CONFIG_REASONS = Object.freeze({
  NOT_CONFIGURABLE: 'STOCK_BATTERY_GROUP_NOT_GM_CONFIGURABLE', REASON_REQUIRED: 'STOCK_BATTERY_CONFIG_REASON_REQUIRED', COUNT_INVALID: 'STOCK_BATTERY_WEAPON_COUNT_INVALID',
  EXISTS: 'STOCK_BATTERY_CONFIG_EXISTS', INVALID: 'STOCK_BATTERY_CONFIG_INVALID', GM_ONLY: 'STOCK_BATTERY_CONFIG_GM_ONLY'
});
const fail = reason => ({ ok: false, reason });

/** A parsed printed battery whose source does not print the number of weapons (so full-battery mode is not available from the source). */
export const isBatteryConfigurable = parsed => !!parsed?.battery && parsed.battery.independentWeapon === true && parsed.battery.weaponCount === null && !parsed.battery.weaponCountGm;

export function planStockBatteryConfig({ group, sourceEntryKey, weaponCount, reason, by = null, now = Date.now() } = {}) {
  if (!isBatteryConfigurable(group)) return fail(BATTERY_CONFIG_REASONS.NOT_CONFIGURABLE);
  const why = typeof reason === 'string' ? reason.trim() : '';
  if (!why) return fail(BATTERY_CONFIG_REASONS.REASON_REQUIRED);
  const n = Number(weaponCount);
  // the battery model decides what counts are legal for this many gunners (never derived from the gunners)
  if (!Number.isInteger(n) || !establishPublishedBattery({ gunners: group.battery.gunners, weaponCount: n }).ok) return fail(BATTERY_CONFIG_REASONS.COUNT_INVALID);
  return { ok: true, config: { schema: STOCK_BATTERY_CONFIG_SCHEMA, state: 'GM_CONFIGURED_EXECUTABLE', groupKey: group.groupKey, sourceEntryKey: sourceEntryKey ?? null, weaponCount: n, gunners: group.battery.gunners, configuredBy: by, reason: why, at: now } };
}

export function validateStockBatteryConfig(config, group, sourceEntryKey) {
  if (!config || config.schema !== STOCK_BATTERY_CONFIG_SCHEMA || config.state !== 'GM_CONFIGURED_EXECUTABLE') return fail(BATTERY_CONFIG_REASONS.INVALID);
  if (config.groupKey !== group?.groupKey || (sourceEntryKey && config.sourceEntryKey !== sourceEntryKey)) return fail(BATTERY_CONFIG_REASONS.INVALID);
  if (!group?.battery || group.battery.gunners !== config.gunners) return fail(BATTERY_CONFIG_REASONS.INVALID);
  if (!Number.isInteger(config.weaponCount) || !establishPublishedBattery({ gunners: config.gunners, weaponCount: config.weaponCount }).ok) return fail(BATTERY_CONFIG_REASONS.COUNT_INVALID);
  return { ok: true };
}
export const readStockBatteryConfigs = vehicle => vehicle?.flags?.swse?.[STOCK_BATTERY_CONFIG_FLAG] ?? vehicle?.getFlag?.('swse', STOCK_BATTERY_CONFIG_FLAG) ?? {};
