/**
 * DamageEngine — Phase C Combat Resolution
 *
 * CRITICAL FIX: DT is a TRIGGER, not damage reduction.
 * Correct flow:
 * 1. Apply shields/temp/bonus HP
 * 2. Apply remaining damage to real HP (NO DT subtraction)
 * 3. Run ThresholdEngine.evaluateThreshold() to check if DT was exceeded
 * 4. Apply any CT shifts from threshold result
 *
 * This engine handles steps 1-2. ThresholdEngine handles steps 3-4.
 * NEVER subtract DT from damage amount.
 *
 * PHASE 3: Routed through ActorEngine for deterministic mutation control
 * PHASE 10G: Damage timing feat riders are applied as declarative packet
 * mutations before ActorEngine.applyDamage() enters DamageResolutionEngine.
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { DamageTimingRiderAdapter } from "/systems/foundryvtt-swse/scripts/engine/combat/damage-timing-rider-adapter.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";

export class DamageEngine {
  static async applyDamage(actor, damage, options = {}) {
    const {
      damageType = 'normal',
      forceMassiveDamageCheck = false,
      skipDamageTimingRiders = false
    } = options;

    if (!actor || damage < 0) return { success: false, reason: 'Invalid actor or negative damage' };

    const hp = actor.system.hp || {};
    const oldHP = hp.value || 0;
    const maxHP = actor.system.hp?.max || 1;

    // Massive-damage is a property of the incoming hit, computed from RAW damage.
    const isMassiveDamage = forceMassiveDamageCheck || damage >= maxHP / 2;

    // IMPORTANT: Do NOT pre-consume temp HP (or DT) here. The full mitigation
    // chain — SR → DR → Temp HP → HP — plus threshold/condition-track handling is
    // owned by DamageResolutionEngine (via ActorEngine.applyDamage), which also
    // persists temp-HP depletion. Subtracting temp HP here as well double-counted
    // it. Pass the RAW damage through and let the single authority resolve it.
    try {
      const source = options.source ?? 'combat-damage';
      const nonWeaponDamageTypes = new Set(['poison', 'collision', 'recurring', 'hazard', 'environmental']);
      const effectiveSkipDamageTimingRiders = skipDamageTimingRiders === true
        || options.recurringDamage === true
        || nonWeaponDamageTypes.has(String(damageType || '').trim().toLowerCase())
        || ['manual-damage-app', 'vehicle-collision', 'poison-damage', 'recurring-damage'].includes(String(source || '').trim().toLowerCase());

      const basePacket = {
        amount: damage,
        type: damageType,
        source,
        sourceActor: options.sourceActor ?? options.attacker ?? options.actor ?? null,
        targetActor: options.targetActor ?? actor,
        options
      };

      const riderPlan = effectiveSkipDamageTimingRiders ? {
        damagePacket: basePacket,
        appliedRiders: [],
        originalAmount: damage,
        finalAmount: damage,
        skipped: true
      } : DamageTimingRiderAdapter.applyToDamagePacket(basePacket, {
        ...options,
        attacker: options.attacker ?? options.sourceActor ?? options.actor ?? null,
        targetActor: options.targetActor ?? actor,
        hit: options.hit ?? options.isHit ?? true,
        isHit: options.isHit ?? options.hit ?? true,
        critical: options.critical ?? options.isCritical ?? false,
        isCritical: options.isCritical ?? options.critical ?? false,
        damageType
      });

      const result = await ActorEngine.applyDamage(actor, riderPlan.damagePacket);

      return {
        success: true,
        // HP actually lost after full mitigation (resolution.damageToHP).
        damageApplied: result.applied ?? damage,
        oldHP,
        newHP: result.newHP,
        isMassiveDamage,
        conditionShifted: result.conditionShifted,
        reason: 'Damage applied',
        damageTimingRiders: riderPlan.appliedRiders ?? [],
        damageBeforeRiders: riderPlan.originalAmount,
        damageAfterRiders: riderPlan.finalAmount,
        damageTimingRidersSkipped: riderPlan.skipped === true
      };
    } catch (err) {
      console.error('[DamageEngine] Error applying damage:', err);
      return {
        success: false,
        reason: `Failed to apply damage: ${err.message}`,
        error: err
      };
    }
  }

  // PHASE 3: Condition track mutations now handled by ActorEngine.applyDamage()
  // These methods are deprecated but kept as stubs for compatibility

  static getDamageThreshold(actor) {
    return SchemaAdapters.getDamageThreshold(actor);
  }

  static getHPStatus(actor) {
    const current = SchemaAdapters.getHP(actor);
    const max = SchemaAdapters.getMaxHP(actor);

    return {
      current,
      max,
      temp: actor.system?.hp?.temp || 0,
      percent: Math.round((current / max) * 100),
      isDead: current <= 0,
      isCritical: current <= max * 0.25
    };
  }
}