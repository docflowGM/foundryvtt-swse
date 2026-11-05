/**
 * Ion bombs at runtime (Starships of the Galaxy, Ion Bombs; owner ruling V-P6C-16 -- the rules and the narrow target interpretation are in
 * domain/vehicle-ion-bomb.js). GM client. One drop:
 *   gates   (before any cost)  the rack is the deploying ship's own, the GM-set vehicle environment is 'atmosphere', the ship has a token on THIS scene,
 *           the impact square is the square directly beneath the ship (the default, or a GM-confirmed square inside the ship's footprint);
 *   costs   the operator's standard action (ActionEconomyConsumption, paid by the named gunner or the vehicle as the other station actions), then ONE
 *           bomb from the rack's ledger (VehicleAmmunitionService: atomic, refunded on failure);
 *   attack  ONE shared roll -- the shared vehicle attack-bonus authority + the printed -5 -- compared with the Reflex Defense of every token within the
 *           10-square radius (the deploying ship excepted): full ion damage on a hit, half on a miss (the Core area-attack rule), through the shared
 *           damage packet (Evasion, ion lifecycle, thresholds) and ActorEngine.applyDamage. No range band and no persistent field are invented.
 */
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ActionEconomyConsumption } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { AttackOutcomeResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/attack-outcome-resolver.js";
import { buildDamagePacket, finalizeDamagePacketForTarget, buildDamageApplyOptions } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-packet-builder.js";
import { resolveVehicleAttackBonus, resolveAbstractCrewAttackBonus } from "/systems/foundryvtt-swse/scripts/engine/combat/vehicle-attack-math.js";
import { resolveVehicleWeaponAuthority } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-weapon-damage.js";
import { readVehicleEnvironment, VEHICLE_ENVIRONMENT } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-operating-context.js";
import { squareOfToken, tokenOccupies } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-space-mine.js";
import { ION_BOMB_ATTACK_PENALTY, ION_BOMB_DAMAGE, BOMB_REASONS, tokenInBlast } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-ion-bomb.js";
import { sceneGridSize, tokenOnScene } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-scene-state.js";
import { VehicleAmmunitionService } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-ammunition-service.js";
import { resolveOperatorPayer } from "/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-fire-mode-service.js";

const refuse = (reason, extra = {}) => ({ ok: false, reason, ...extra });
const reflexOf = a => Number(a?.system?.derived?.defenses?.reflex?.total ?? a?.system?.defenses?.reflex?.total);

/** The attack bonus the shared vehicle attack authority gives this weapon's operator (named gunner, or the generic crew). */
async function attackBonusOf(vehicle, weapon, crew) {
  const r = crew?.source === 'actor' && crew.actor
    ? await resolveVehicleAttackBonus(crew.actor, vehicle, weapon, {})
    : await resolveAbstractCrewAttackBonus(vehicle, weapon, vehicle.system?.crewQuality, {});
  return r?.error ? null : Number(r.total);
}

export async function drop({ vehicle, weapon, scene = globalThis.canvas?.scene ?? null, impact = null, user = globalThis.game?.user ?? null } = {}) {
  const a = resolveVehicleWeaponAuthority(weapon);
  if (!a?.ok || a.ionBomb !== true) return refuse(BOMB_REASONS.NOT_AN_ION_BOMB_RACK);
  if (user?.isGM !== true) return refuse(BOMB_REASONS.GM_ONLY);
  if (vehicle?.type !== 'vehicle' || !Array.from(vehicle.items ?? []).some(i => i?.id === weapon?.id)) return refuse(BOMB_REASONS.NOT_OWN_RACK);
  if (readVehicleEnvironment(vehicle) !== VEHICLE_ENVIRONMENT.ATMOSPHERE) return refuse(BOMB_REASONS.ATMOSPHERE_REQUIRED);
  if (!scene?.id) return refuse(BOMB_REASONS.NO_SCENE);
  const shipToken = tokenOnScene(vehicle, scene), g = sceneGridSize(scene);
  const beneath = squareOfToken(shipToken, g);
  if (!beneath) return refuse(BOMB_REASONS.NO_POSITION);
  // the square directly beneath the ship: its own square, or a GM-confirmed square inside its footprint -- never a distant or arbitrary one
  const square = impact ?? beneath;
  if (!Number.isInteger(square?.col) || !Number.isInteger(square?.row) || !tokenOccupies(shipToken, g, square)) return refuse(BOMB_REASONS.IMPACT_NOT_BENEATH_SHIP);
  const can = await VehicleAmmunitionService.canLaunch(vehicle, weapon);
  if (!can.ok) return refuse(can.reason);
  const who = await resolveOperatorPayer(vehicle, a);
  if (who.reason) return refuse(who.reason);
  const bonus = await attackBonusOf(vehicle, weapon, who.crew);
  if (!Number.isFinite(bonus)) return refuse(BOMB_REASONS.ATTACK_BONUS_UNRESOLVED);
  const spend = await ActionEconomyConsumption.spend(who.payer, 'standard', { actionName: 'Drop ion bomb', source: weapon.name });
  if (spend?.allowed === false) return refuse(BOMB_REASONS.ACTION_UNAVAILABLE);
  const id = globalThis.foundry?.utils?.randomID?.() ?? `bomb-${Date.now()}`;
  let ammo = null;
  try {
    ammo = await VehicleAmmunitionService.spendLaunch(vehicle, weapon, { attackId: id });
    if (!ammo.ok) { await spend?.rollback?.(); return refuse(ammo.reason); }
    const atk = await RollEngine.safeRoll(`1d20 + ${bonus + ION_BOMB_ATTACK_PENALTY}`);
    const d20 = atk?.dice?.[0]?.results?.[0]?.result ?? null;
    if (!Number.isFinite(Number(atk?.total)) || d20 === null) throw Object.assign(new Error(BOMB_REASONS.ROLL_UNAVAILABLE), { bombRoll: true });
    const results = [];
    for (const tok of Array.from(scene.tokens ?? [])) {
      const target = tok?.actor;
      if (!target || target.id === vehicle.id || !tokenInBlast(tok, g, square)) continue;
      const out = AttackOutcomeResolver.resolve({ naturalD20: d20, total: atk.total, targetDefense: reflexOf(target), criticalThreshold: 21, critMultiplier: 1 });
      const dmg = await RollEngine.safeRoll(ION_BOMB_DAMAGE);
      const workflowContext = { damage: { hit: out.hit === true, natural1: d20 === 1 }, ruleData: { areaAttack: true, halfDamageOnMiss: true, evasionApplies: true } };      // the same area-attack flags the character area path sets, so Evasion / Improved Evasion apply
      const packet = finalizeDamagePacketForTarget(buildDamagePacket({ attacker: null, target, weapon: null, amount: Math.floor(Number(dmg?.total ?? 0)), options: { damageType: 'ion', hit: out.hit === true }, workflowContext }), target);
      const options = buildDamageApplyOptions(packet);
      const applied = packet.amount > 0 ? await ActorEngine.applyDamage(target, { amount: packet.amount, type: options.damageType, source: 'Ion bomb', sourceActor: vehicle, options }) : null;
      results.push({ targetId: target.id, hit: out.hit === true, amount: packet.amount, damageToHP: applied?.resolution?.damageToHP ?? 0 });
    }
    return { ok: true, square, attackTotal: atk.total, results, paidBy: who.payer?.id ?? null };
  } catch (err) {
    // the bomb falls only after the roll succeeds; a failure before any damage was applied returns the bomb and the action
    if (err?.bombRoll && ammo?.ok) { await VehicleAmmunitionService.refundLaunch(ammo); await spend?.rollback?.(); return refuse(BOMB_REASONS.ROLL_UNAVAILABLE); }
    throw err;
  }
}
