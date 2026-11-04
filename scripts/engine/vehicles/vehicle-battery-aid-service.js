/**
 * Battery Aid Another: the runtime around scripts/domain/vehicles/vehicle-battery-aid.js (Core Rulebook p. 170).
 *
 * One action, in this order, and nothing is written until the roll has succeeded:
 *   1. validate both weapons through the SAME vehicle weapon authority the attack uses (a published FULL battery on each side) and
 *      refuse everything that is not the ordinary single-aid case (no named-gunner roster, no second pending aid, no incomplete pair);
 *   2. spend the STANDARD action through the canonical action-economy authority (ActionEconomyConsumption);
 *   3. roll the assisting battery's attack total against Reflex Defense 10 (the SAME attack outcome resolver);
 *   4. on success write ONE pending aid record on the aided weapon's vehicle through ActorEngine;
 *      on a failed write the action is rolled back.
 * The aid is applied by the attack ledger to the aided weapon's NEXT attack roll and consumed once, after that attack's card is posted
 * (consume() is idempotent). The assisting battery produces no margin hits. Pure orchestration: no rule lives here.
 */
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { ActionEconomyConsumption } from "/systems/foundryvtt-swse/scripts/engine/combat/action/action-economy-consumption.js";
import { AttackOutcomeResolver } from "/systems/foundryvtt-swse/scripts/engine/combat/attack-outcome-resolver.js";
import { RollEngine } from "/systems/foundryvtt-swse/scripts/engine/roll-engine.js";
import { SWSEChat } from "/systems/foundryvtt-swse/scripts/chat/swse-chat.js";
import { resolveVehicleWeaponAuthority } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-weapon-damage.js";
import { resolveVehicleCrewActor } from "/systems/foundryvtt-swse/scripts/engine/crew/vehicle-crew-actor-authority.js";
import { resolveAbstractCrewAttackBonus } from "/systems/foundryvtt-swse/scripts/engine/combat/vehicle-attack-math.js";
import { planBatteryAid, resolveBatteryAid, buildAidRecord, readPendingAid, AID_REASONS, BATTERY_AID_FLAG } from "/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-battery-aid.js";

const mayOperate = (user, vehicle) => !!user && (user.isGM === true || vehicle?.isOwner === true);
const refuse = (reason, extra = {}) => ({ ok: false, reason, ...extra });

export class VehicleBatteryAidService {
  /**
   * @param {{assistingVehicle:Actor, assistingItem:Item, aidedVehicle?:Actor, aidedItem:Item, user?:object}} p
   * @returns {Promise<{ok:true, hit:boolean, bonus:number, record?:object, attackTotal:number}|{ok:false, reason:string}>}
   */
  static async perform({ assistingVehicle, assistingItem, aidedVehicle = assistingVehicle, aidedItem, user = globalThis.game?.user ?? null } = {}) {
    if (!assistingVehicle || !assistingItem || !aidedVehicle || !aidedItem) return refuse('AID_CONTEXT_MISSING');
    if (!mayOperate(user, assistingVehicle)) return refuse(AID_REASONS.NOT_AUTHORIZED);
    const a = resolveVehicleWeaponAuthority(assistingItem), b = resolveVehicleWeaponAuthority(aidedItem);
    if (!a?.ok) return refuse(a?.reason ?? AID_REASONS.ASSISTING_NOT_A_FULL_BATTERY);
    if (!b?.ok) return refuse(b?.reason ?? AID_REASONS.AIDED_NOT_A_FULL_BATTERY);
    const plan = planBatteryAid({
      assisting: { itemId: assistingItem.id, battery: a.battery ?? null }, aided: { itemId: aidedItem.id, battery: b.battery ?? null },
      pending: readPendingAid(aidedVehicle, aidedItem.id)
    });
    if (!plan.ok) return refuse(plan.reason);
    // the assisting battery is run by its generic (published) crew; named gunners need a roster that does not exist (same as an attack)
    const crew = await resolveVehicleCrewActor(assistingVehicle, a.operator);
    if (crew.source !== 'unassigned') return refuse(AID_REASONS.ASSIGNED_CREW);

    const spend = await ActionEconomyConsumption.spend(assistingVehicle, 'standard', { actionName: 'Aid Another (battery)', source: assistingItem.name });
    if (spend?.allowed === false) return refuse(AID_REASONS.ACTION_UNAVAILABLE);
    try {
      // the assisting battery's own attack total (its printed total already contains its crew's assistance), against Reflex Defense 10
      const ab = await resolveAbstractCrewAttackBonus(assistingVehicle, assistingItem, null, { aid: true });
      if (ab.error) { await spend?.rollback?.(); return refuse(`AID_ATTACK_UNRESOLVED:${ab.error}`); }
      const formula = `1d20 + ${ab.total}`;
      const roll = await RollEngine.safeRoll(formula, {}, { actor: assistingVehicle, domain: 'combat.attack', context: { weaponId: assistingItem.id, aid: true } });
      const d20 = roll?.dice?.[0]?.results?.[0]?.result ?? null;
      const outcome = AttackOutcomeResolver.resolve({ naturalD20: d20, total: roll.total, targetDefense: plan.defense, criticalThreshold: 21, critMultiplier: 2 });
      const result = resolveBatteryAid({ attackTotal: roll.total, assistingWeapons: plan.assistingWeapons, hit: outcome.hit === true });
      if (!result.ok) { await spend?.rollback?.(); return refuse(result.reason); }

      let record = null;
      if (result.succeeded && result.bonus > 0) {
        const aidId = globalThis.foundry?.utils?.randomID?.() ?? `aid-${Date.now()}`;
        record = buildAidRecord({ aidId, assisting: { itemId: assistingItem.id, vehicleId: assistingVehicle.id }, aided: { itemId: aidedItem.id, vehicleId: aidedVehicle.id },
          bonus: result.bonus, attackTotal: roll.total, combatId: globalThis.game?.combat?.id ?? null });
        await ActorEngine.updateActor(aidedVehicle, { [`flags.swse.${BATTERY_AID_FLAG}.${aidedItem.id}`]: record });
      }
      await SWSEChat.postRoll({ roll, actor: assistingVehicle,
        flavor: `${assistingItem.name} — Aid Another for ${aidedItem.name}: ${result.succeeded ? `success, +${result.bonus} on its next attack` : 'failed'} (vs Reflex ${plan.defense})`,
        flags: { swse: { batteryAid: true, aided: aidedItem.id, bonus: result.succeeded ? result.bonus : 0 } }, context: { type: 'aid', suppressDamage: true } });
      return { ok: true, hit: result.succeeded, bonus: result.succeeded ? result.bonus : 0, record, attackTotal: roll.total };
    } catch (err) {
      await spend?.rollback?.();
      throw err;
    }
  }

  /**
   * Consume the pending aid once, after the attack it benefited has been posted. Idempotent: a consumed or replaced aid is left alone.
   * @returns {Promise<{consumed:boolean, reason?:string}>}
   */
  static async consume(vehicle, itemId, aidId, { now = Date.now() } = {}) {
    const rec = vehicle?.flags?.swse?.[BATTERY_AID_FLAG]?.[itemId];
    if (!rec || rec.aidId !== aidId) return { consumed: false, reason: 'AID_NOT_PENDING' };
    if (rec.consumedAt) return { consumed: false, reason: 'AID_ALREADY_CONSUMED' };
    await ActorEngine.updateActor(vehicle, { [`flags.swse.${BATTERY_AID_FLAG}.${itemId}.consumedAt`]: now });
    return { consumed: true };
  }
}
