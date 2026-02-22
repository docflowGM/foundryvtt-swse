
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
  /* INITIATIVE (Skill-based) — PHASE 1 Consolidated */
  /* -------------------------------------------- */

  /**
   * SINGLE ORCHESTRATION AUTHORITY for initiative rolls.
   *
   * All initiative rolls MUST route through this method.
   * This ensures:
   *   - Consistent Force Point handling
   *   - Unified tie resolution
   *   - Single chat message flow
   *   - Combat Tracker consistency
   *
   * @param {Actor} actor
   * @param {Object} options
   * @param {boolean} options.useForce - Spend Force Point on roll
   * @returns {Object} { roll, total, usedForce, forceBonus, baseMod }
   */
  static async rollInitiative(actor, options = {}) {
    return SWSEInitiative.rollInitiative(actor, options);
  }

  /* -------------------------------------------- */
  /* ATTACK RESOLUTION PIPELINE (Full Orchestration) */
  /* -------------------------------------------- */

  /**
   * Full attack resolution orchestration.
   *
   * @param {Object} params
   * @param {Actor} params.attacker - Attacking actor
   * @param {Actor} params.target - Target actor
   * @param {Item} params.weapon - Weapon item
   * @param {Object} params.attackRoll - Pre-rolled attack (from SWSERoll)
   * @param {Object} params.options - Additional options
   * @param {number} params.options.coverBonus - Defense bonus from cover
   * @param {number} params.options.concealmentMissChance - Miss chance from concealment
   * @param {number} params.options.flankingBonus - Attack bonus from flanking
   * @param {Function} params.options.onPreHitResolution - Hook for plugin modification
   * @returns {Object} Attack resolution result
   */
  static async resolveAttack({
    attacker,
    target,
    weapon,
    attackRoll,
    options = {}
  }) {

    if (!attacker || !target || !weapon || !attackRoll) {
      return { success: false, reason: "Invalid attacker/target/weapon/roll" };
    }

    /* HIT RESOLUTION CONTEXT */
    const context = {
      attacker,
      target,
      weapon,
      roll: attackRoll,
      totalAttack: attackRoll.total,
      defenseType: 'reflex',
      defenseValue: target.system.defenses?.reflex?.total ?? 10,
      modifiers: options.modifiers || {},
      hit: options.precomputedHit ?? null
    };

    /* APPLY COVER BONUS */
    if (options.coverBonus !== undefined) {
      context.modifiers.coverBonus = options.coverBonus;
      context.defenseValue += options.coverBonus;
    }

    /* PRE-HIT HOOK (Allow plugins to modify context) */
    if (options.onPreHitResolution) {
      await options.onPreHitResolution(context);
    }
    Hooks.callAll('swse.preHitResolution', context);

    /* RESOLVE HIT */
    if (context.hit === null) {
      const d20 = attackRoll.dice?.[0]?.results?.[0]?.result ?? 0;
      if (d20 === 1) {
        context.hit = false;
      } else if (d20 === 20) {
        context.hit = true;
      } else {
        context.hit = context.totalAttack >= context.defenseValue;
      }
    }

    /* CONCEALMENT MISS CHANCE */
    if (context.hit && options.concealmentMissChance && options.concealmentMissChance > 0) {
      const roll = Math.random() * 100;
      if (roll < options.concealmentMissChance) {
        context.hit = false;
      }
    }

    if (!context.hit) {
      return {
        hit: false,
        attackRoll,
        context
      };
    }

    /* DAMAGE */
    const damageFormula = weapon.system.damage ?? "1d6";
    const damageBonus = options.damageBonus ?? 0;
    const fullDamageFormula = damageBonus > 0 ? `${damageFormula} + ${damageBonus}` : damageFormula;
    const damageRoll = await RollEngine.safeRoll(fullDamageFormula);
    let damage = damageRoll.total;

    /* SCALE */
    const scaleResult = ScaleEngine.scaleDamage(damage, attacker, target);
    damage = scaleResult.damage;

    /* SHIELDS (Vehicle only) */
    if (target.type === "vehicle") {
      const zone = options.shieldZone || "fore";
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
      hit: true,
      attackRoll,
      damageRoll,
      damage,
      damageApplied: damageResult,
      threshold: thresholdResult,
      context
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
