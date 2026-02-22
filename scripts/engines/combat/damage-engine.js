/**
 * DamageEngine — Phase C Combat Resolution
 * Apply damage, check DT, adjust CT, handle massive damage
 *
 * PHASE 3: Routed through ActorEngine for deterministic mutation control
 */

import { ActorEngine } from '../../actors/engine/actor-engine.js';

export class DamageEngine {
  static async applyDamage(actor, damage, options = {}) {
    const {
      damageType = 'normal',
      bypassDT = false,
      targetTempHP = true,
      forceMassiveDamageCheck = false
    } = options;

    if (!actor || damage < 0) return { success: false, reason: 'Invalid actor or negative damage' };

    const hp = actor.system.hp || {};
    const derived = actor.system.derived || {};
    const dt = derived.damageThreshold || 0;
    let finalDamage = damage;

    // Temp HP first
    if (targetTempHP && (hp.temp || 0) > 0) {
      const tempAbsorbed = Math.min(hp.temp, finalDamage);
      finalDamage -= tempAbsorbed;
      hp.temp = (hp.temp || 0) - tempAbsorbed;
    }

    // DT check (unless bypassed)
    if (!bypassDT && dt > 0 && finalDamage <= dt) {
      return {
        success: true,
        absorbed: damage,
        finalHP: hp.value,
        reason: `Damage (${damage}) absorbed by DT (${dt})`
      };
    }

    // Reduce final damage by DT
    if (!bypassDT && dt > 0) {
      finalDamage -= dt;
    }

    // ========================================
    // PHASE 3: Route through ActorEngine
    // ========================================
    const oldHP = hp.value || 0;
    const newHP = Math.max(0, oldHP - finalDamage);

    // Check if condition shift needed (before mutation)
    const isMassiveDamage = forceMassiveDamageCheck || finalDamage >= (derived.hp?.max || 1) / 2;
    const conditionShiftNeeded = (newHP <= 0) || isMassiveDamage;

    // Apply damage & condition logic through ActorEngine (single mutation)
    try {
      const result = await ActorEngine.applyDamage(actor, {
        amount: finalDamage,
        type: damageType,
        source: 'combat-damage',
        conditionShift: conditionShiftNeeded
      });

      return {
        success: true,
        damageApplied: finalDamage,
        oldHP,
        newHP: result.newHP,
        isMassiveDamage,
        conditionShifted: result.conditionShifted,
        reason: 'Damage applied'
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
    return actor.system.derived?.damageThreshold || 0;
  }

  static getHPStatus(actor) {
    const hp = actor.system.hp || {};
    const max = hp.max || 1;
    const current = hp.value || 0;

    return {
      current,
      max,
      temp: hp.temp || 0,
      percent: Math.round((current / max) * 100),
      isDead: current <= 0,
      isCritical: current <= max * 0.25
    };
  }
}
