/**
 * GM configuration of a stock launcher whose source leaves the ammunition incomplete. GM-only. The configuration is written to the WORLD
 * Actor under a guarded flag (flags.swse.stockAmmoConfig; any write this service did not authorize is refused by the same guard as the
 * installation ledger), then the existing weapon-Item sync arms the launcher, whose ledger is the ordinary stock ledger
 * (VehicleAmmunitionService owns spending, refunds and reloads -- nothing here duplicates them). The publication record is never touched.
 */
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { authorizeFlagWrite, clearLedgerWrite } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-installation-ledger.js";
import { getVerifiedPublishedRecord } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-source-identity.js";
import { assessStockWeaponGroups } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-stock-weapon-groups.js";
import { STOCK_AMMO_CONFIG_FLAG, CONFIG_REASONS, READINESS, planStockAmmoConfig, readStockAmmoConfigs } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-stock-ammo-config.js";
import { stockAmmoReadinessRows } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-stock-ammo-readiness.js";
import { VehicleInstallationService } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-installation-service.js";

const refuse = (reason, extra = {}) => ({ success: false, reasons: [reason], ...extra });
const isGM = user => user?.isGM === true;

async function writeConfigs(vehicle, next) {
  authorizeFlagWrite(vehicle.id, STOCK_AMMO_CONFIG_FLAG, next);
  try { await ActorEngine.updateActor(vehicle, { [`flags.swse.==${STOCK_AMMO_CONFIG_FLAG}`]: next }); }
  finally { clearLedgerWrite(vehicle.id); }
}

export class VehicleStockAmmoConfigService {
  /** Readiness rows (shared read with the sheet). */
  static rows(vehicle) { return stockAmmoReadinessRows(vehicle); }

  static async configure({ vehicle, groupKey, input = {}, reason, user = globalThis.game?.user ?? null } = {}) {
    if (!isGM(user)) return refuse(CONFIG_REASONS.GM_ONLY);
    const record = getVerifiedPublishedRecord(vehicle);
    if (!record) return refuse('STOCK_AMMO_VEHICLE_UNVERIFIED');
    const configs = readStockAmmoConfigs(vehicle);
    if (configs[groupKey]) return refuse(CONFIG_REASONS.EXISTS);
    const group = assessStockWeaponGroups(record, { gmAmmo: {} }).groups.find(g => g.groupKey === groupKey);
    if (!group) return refuse(CONFIG_REASONS.NOT_CONFIGURABLE);
    const plan = planStockAmmoConfig({ group, sourceEntryKey: record.identity?.sourceEntryKey, input, reason, by: user?.id ?? null });
    if (!plan.ok) return refuse(plan.reason);
    await writeConfigs(vehicle, { ...configs, [groupKey]: plan.config });
    const sync = await VehicleInstallationService.syncWeaponItems(vehicle);
    return { success: true, state: READINESS.GM_CONFIGURED, config: plan.config, synced: sync.synced === true, ...(sync.synced ? {} : { warning: 'WEAPON_ITEM_SYNC_INCOMPLETE: use Resync weapons' }) };
  }

  /** Remove a configuration. The launcher stops being executable and its Item (with its ledger) is removed by the ordinary sync. */
  static async clear({ vehicle, groupKey, user = globalThis.game?.user ?? null } = {}) {
    if (!isGM(user)) return refuse(CONFIG_REASONS.GM_ONLY);
    const configs = readStockAmmoConfigs(vehicle);
    if (!configs[groupKey]) return refuse(CONFIG_REASONS.INVALID);
    const { [groupKey]: _gone, ...rest } = configs;
    await writeConfigs(vehicle, rest);
    const sync = await VehicleInstallationService.syncWeaponItems(vehicle);
    return { success: true, synced: sync.synced === true };
  }
}
