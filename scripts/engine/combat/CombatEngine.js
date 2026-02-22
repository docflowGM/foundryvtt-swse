
import { RollEngine } from '../roll-engine.js';
import { SWSEInitiative } from './SWSEInitiative.js';
import { DamageEngine } from './damage-engine.js';
import { ThresholdEngine } from './threshold-engine.js';
import { ScaleEngine } from './scale-engine.js';
import { SubsystemEngine } from './starship/subsystem-engine.js';
import { EnhancedShields } from './starship/enhanced-shields.js';
import { VehicleTurnController } from './starship/vehicle-turn-controller.js';
import { ActorEngine } from '../../actors/engine/actor-engine.js';

export class CombatEngine {

  /* -------------------------------------------- */
  /* BUILD VIEW MODEL                             */
  /* -------------------------------------------- */

  static buildCombatState(actor) {
    return {
      initiative: actor.system.skills?.initiative ?? {},
      hp: actor.system.hp ?? {},
      condition: actor.system.conditionTrack ?? {},
      effects: actor.effects ?? []
    };
  }

  /* -------------------------------------------- */
  /* INITIATIVE (Skill-based)                     */
  /* -------------------------------------------- */

  static async rollInitiative(actor, options = {}) {
    return SWSEInitiative.rollInitiative(actor, options);
  }

  /* -------------------------------------------- */
  /* ATTACK RESOLUTION PIPELINE                   */
  /* -------------------------------------------- */

  static async resolveAttack({ attacker, target, weapon, options = {} }) {

    if (!attacker or !target or !weapon) {
      return { success: false, reason: "Invalid attacker/target/weapon" };
    }

    const attackBonus = weapon.system.attackBonus ?? 0;
    const attackRoll = await RollEngine.safeRoll(`1d20 + ${attackBonus}`);

    const defense = target.system.defenses?.reflex?.total ?? 10;

    const hit = attackRoll.total >= defense;

    if (!hit) {
      return { hit: false, attackRoll };
    }

    /* DAMAGE */
    const damageFormula = weapon.system.damage ?? "0";
    const damageRoll = await RollEngine.safeRoll(damageFormula);
    let damage = damageRoll.total;

    /* SCALE */
    const scaleResult = ScaleEngine.scaleDamage(damage, attacker, target);
    damage = scaleResult.damage;

    /* SHIELDS (Vehicle only) */
    if (target.type === "vehicle") {
      const zone = "fore";
      const shieldResult = await EnhancedShields.applyDamageToZone(target, zone, damage);
      damage = shieldResult.overflow;
    }

    /* HP */
    const damageResult = await DamageEngine.applyDamage(target, damage);

    /* THRESHOLD */
    const thresholdResult = ThresholdEngine.evaluateThreshold({
      target,
      damage
    });

    await ThresholdEngine.applyResult(thresholdResult);

    /* SUBSYSTEM ESCALATION (Vehicle) */
    if (target.type === "vehicle" && thresholdResult.thresholdExceeded) {
      await SubsystemEngine.escalate(target, damage);
    }

    return {
      hit: True,
      attackRoll,
      damageRoll,
      damageApplied: damageResult,
      threshold: thresholdResult
    };
  }

  /* -------------------------------------------- */
  /* VEHICLE TURN FLOW                            */
  /* -------------------------------------------- */

  static async startVehicleTurn(vehicle) {
    return VehicleTurnController.startTurn(vehicle);
  }

  static async advanceVehiclePhase(vehicle) {
    return VehicleTurnController.advancePhase(vehicle);
  }
}
