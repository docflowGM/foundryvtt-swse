/**
 * Switching a vehicle weapon between single fire and autofire (Core, Autofire: a swift action). The switch is validated against the SAME
 * weapon authority the attack uses (an autofire-capable certified weapon), spends the swift action through ActionEconomyConsumption, and
 * persists the mode on the vehicle through ActorEngine; a failed write rolls the action back. The attack reads the persisted mode.
 * The switch TO autofire is a swift action (Core). Switching back is priced only where the source prices it: Starships of the Galaxy p. 45 requires
 * a swift action to switch between normal and autofire for double / quad / fire-linked cannons (both directions); no other configuration is extended.
 */
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ActionEconomyConsumption } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js";
import { CombatOptionResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/combat-option-resolver.js";
import { resolveVehicleCrewActor } from "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-crew-actor-authority.js";
import { resolveVehicleWeaponAuthority } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-weapon-damage.js";
import { FIRE_MODE_FLAG, FIRE_MODE_REASONS, MODE_REASONS, readPersistedFireMode } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-fire-mode.js";

/**
 * Burst Fire for a named operator, asked of the SAME CombatOptionResolver the character attack uses (feat ownership, autofire-capability
 * gate, -5 attack, +2 weapon dice). @returns {{available:boolean, attackModifier:number, damageExtraWeaponDice:number}}
 */
export function burstFireOptionOf(operatorActor, weapon) {
  if (!operatorActor || !weapon) return { available: false, attackModifier: 0, damageExtraWeaponDice: 0 };
  const ctx = { autofire: true, attackMode: 'autofire', combatOptions: { burstFire: true }, attackOptions: { burstFire: true } };
  const available = CombatOptionResolver.getAvailableAttackOptions(operatorActor, weapon, ctx).some(o => o.id === 'burstFire');
  if (!available) return { available: false, attackModifier: 0, damageExtraWeaponDice: 0 };
  const m = CombatOptionResolver.collectAttackModifiers(operatorActor, weapon, ctx);
  return { available: true, attackModifier: Number(m.attackBonus) || 0, damageExtraWeaponDice: Number(m.damageExtraWeaponDice) || 0 };
}

/**
 * WHOSE action a weapon-station action costs: the crew member who operates the weapon's station (the crew assignment authority the attack
 * uses). A named operator pays from their own action economy; an unassigned station (the generic crew) and a printed automated operator pay as
 * the vehicle. @returns {Promise<{payer:object, crew:object}|{reason:string}>}
 */
export async function resolveOperatorPayer(vehicle, authority) {
  const crew = authority?.automatedOperator === true ? { source: 'unassigned', actor: null } : await resolveVehicleCrewActor(vehicle, authority?.operator);
  if (crew.source === 'invalid') return { reason: MODE_REASONS.CREW_INVALID };
  return { payer: crew.source === 'actor' ? crew.actor : vehicle, crew };
}

const refuse = reason => ({ ok: false, reason });
export class VehicleFireModeService {
  static async setMode({ vehicle, weapon, mode, user = globalThis.game?.user ?? null } = {}) {
    if (!vehicle || !weapon || !['single', 'autofire'].includes(mode)) return refuse('FIRE_MODE_CONTEXT_INVALID');
    const a = resolveVehicleWeaponAuthority(weapon);
    if (!a?.ok || a.autofireCapable !== true) return refuse(FIRE_MODE_REASONS.NOT_CAPABLE);
    // WHOSE action: the crew member who operates the weapon's station (the same crew assignment authority the attack uses). A named
    // operator pays from their own action economy; an unassigned station is the generic crew, which acts as the vehicle; a printed
    // automated operator has no seat and also acts as the vehicle. An assignment that no longer resolves refuses.
    const who = await resolveOperatorPayer(vehicle, a);
    if (who.reason) return refuse(who.reason);
    const payer = who.payer;
    if (!(user && (user.isGM === true || vehicle.isOwner === true || payer?.isOwner === true))) return refuse(MODE_REASONS.NOT_AUTHORIZED);
    if (readPersistedFireMode(vehicle, weapon.id) === mode) return { ok: true, mode, unchanged: true };
    // Priced: the switch TO autofire always (Core); the switch back only where the source prices it (SotG p. 45: double / quad / fire-linked cannons).
    const priced = mode === 'autofire' || a.autofireSwitchBothWays === true;
    const spend = priced ? await ActionEconomyConsumption.spend(payer, 'swift', { actionName: mode === 'autofire' ? 'Set to autofire' : 'Set to single fire', source: weapon.name }) : null;
    if (spend?.allowed === false) return refuse(MODE_REASONS.ACTION_UNAVAILABLE);
    try {
      await ActorEngine.updateActor(vehicle, { [`flags.swse.${FIRE_MODE_FLAG}.${weapon.id}`]: mode === 'autofire' ? 'autofire' : null });
    } catch (err) { await spend?.rollback?.(); throw err; }
    return { ok: true, mode, paidBy: payer?.id ?? null };
  }
}
