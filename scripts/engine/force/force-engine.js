/**
 * ForceEngine — Phase E Force Powers
 * Natural 20 tracking, Force Points, Dark Side tracking, DC calculation
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";

export class ForceEngine {
  /**
   * Get DC for force power check
   */
  static calculateDC(baseDC, options = {}) {
    const { situationalModifier = 0, distancePenalty = 0 } = options;
    return baseDC + situationalModifier + distancePenalty;
  }

  /**
   * Track natural 20 on Force roll
   */
  static async recordNatural20(actor, powerName) {
    const force = actor.system.force || {};
    force.natural20Count = (force.natural20Count || 0) + 1;

    // Auto-recover 1 FP on natural 20 (SWSE rule)
    const fpCurrent = SchemaAdapters.getForcePoints(actor);
    const fpMax = SchemaAdapters.getMaxForcePoints(actor);
    const newFp = Math.min(fpMax, fpCurrent + 1);

    await ActorEngine.updateActor(actor, {
      'system.force': force,
      ...SchemaAdapters.setForcePointsUpdate(newFp)
    });

    return {
      natural20Count: force.natural20Count,
      fpRecovered: 1,
      fpCurrent: newFp
    };
  }

  /**
   * Spend Force Point
   */
  static async spendForcePoint(actor) {
    const fpCurrent = SchemaAdapters.getForcePoints(actor);
    if (fpCurrent <= 0) {
      return { success: false, reason: 'No Force Points available' };
    }

    const newFp = fpCurrent - 1;
    await ActorEngine.updateActor(actor, SchemaAdapters.setForcePointsUpdate(newFp));

    return { success: true, fpRemaining: newFp };
  }

  /**
   * Gain Dark Side Point
   * MUTATES canonical storage location: system.darkSide.value
   * Routes through ActorEngine for audit log + validation
   */
  static async gainDarkSidePoint(actor, reason = '') {
    // Read current value from canonical location
    const currentValue = actor.system.darkSide?.value || 0;
    const newValue = currentValue + 1;

    // Audit log
    const log = actor.system.dspLog || [];
    log.push({
      round: game.combat?.round || 0,
      reason: reason,
      timestamp: Date.now()
    });

    // Write to canonical location via ActorEngine
    await ActorEngine.updateActor(actor, {
      'system.darkSide.value': newValue,
      'system.dspLog': log
    });

    return { dspCurrent: newValue, reason };
  }

  /**
   * Apply Light/Dark descriptor bonus/penalty to modifier
   */
  static getDescriptorModifier(modifier, descriptor, actor) {
    if (!modifier || !actor.system.force) return modifier;

    const forceAlignment = actor.system.force.alignment || 'neutral';
    if (descriptor === 'light' && forceAlignment === 'light') return modifier + 2;
    if (descriptor === 'dark' && forceAlignment === 'dark') return modifier + 2;
    if (descriptor === 'universal') return modifier;

    return modifier;
  }

  /**
   * Check if power is available (FP cost, alignment, etc.)
   */
  static canUsePower(actor, power) {
    const fpCurrent = SchemaAdapters.getForcePoints(actor);
    const fpCost = power.fpCost || 0;

    if (fpCurrent < fpCost) {
      return { canUse: false, reason: `Need ${fpCost} FP, have ${fpCurrent}` };
    }

    return { canUse: true };
  }
}
