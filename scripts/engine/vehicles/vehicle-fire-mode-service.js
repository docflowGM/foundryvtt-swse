/**
 * Switching a vehicle weapon between single fire and autofire (Core, Autofire: a swift action). The switch is validated against the SAME
 * weapon authority the attack uses (an autofire-capable certified weapon), spends the swift action through ActionEconomyConsumption, and
 * persists the mode on the vehicle through ActorEngine; a failed write rolls the action back. The attack reads the persisted mode.
 * PROJECT_INTERPRETATION (deferred P6B-D-060): the switch back to single fire costs the same swift action.
 */
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ActionEconomyConsumption } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js";
import { resolveVehicleWeaponAuthority } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-weapon-damage.js";
import { FIRE_MODE_FLAG, FIRE_MODE_REASONS, MODE_REASONS, readPersistedFireMode } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-fire-mode.js";

const refuse = reason => ({ ok: false, reason });
export class VehicleFireModeService {
  static async setMode({ vehicle, weapon, mode, user = globalThis.game?.user ?? null } = {}) {
    if (!vehicle || !weapon || !['single', 'autofire'].includes(mode)) return refuse('FIRE_MODE_CONTEXT_INVALID');
    if (!(user && (user.isGM === true || vehicle.isOwner === true))) return refuse(MODE_REASONS.NOT_AUTHORIZED);
    const a = resolveVehicleWeaponAuthority(weapon);
    if (!a?.ok || a.autofireCapable !== true) return refuse(FIRE_MODE_REASONS.NOT_CAPABLE);
    if (readPersistedFireMode(vehicle, weapon.id) === mode) return { ok: true, mode, unchanged: true };
    const spend = await ActionEconomyConsumption.spend(vehicle, 'swift', { actionName: mode === 'autofire' ? 'Set to autofire' : 'Set to single fire', source: weapon.name });
    if (spend?.allowed === false) return refuse(MODE_REASONS.ACTION_UNAVAILABLE);
    try {
      await ActorEngine.updateActor(vehicle, { [`flags.swse.${FIRE_MODE_FLAG}.${weapon.id}`]: mode === 'autofire' ? 'autofire' : null });
    } catch (err) { await spend?.rollback?.(); throw err; }
    return { ok: true, mode };
  }
}
