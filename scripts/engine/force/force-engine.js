/**
 * ForceEngine — Phase E Force Powers
 * Natural 20 tracking, Force Points, Dark Side tracking, DC calculation
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

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
    const fp = actor.system.forcePoints || {};
    fp.current = Math.min(fp.max || 0, (fp.current || 0) + 1);

    await ActorEngine.updateActor(actor, {
      'system.force': force,
      'system.forcePoints': fp
    });

    return {
      natural20Count: force.natural20Count,
      fpRecovered: 1,
      fpCurrent: fp.current
    };
  }

  /**
   * Spend Force Point
   */
  static async spendForcePoint(actor) {
    const fp = actor.system.forcePoints || {};
    if ((fp.current || 0) <= 0) {
      return { success: false, reason: 'No Force Points available' };
    }

    fp.current = (fp.current || 0) - 1;
    await ActorEngine.updateActor(actor, { 'system.forcePoints': fp });

    return { success: true, fpRemaining: fp.current };
  }

  /**
   * Gain Dark Side Point
   */
  static async gainDarkSidePoint(actor, reason = '') {
    const ds = actor.system.darkSidePoints || {};
    ds.current = (ds.current || 0) + 1;

    const log = actor.system.dspLog || [];
    log.push({
      round: game.combat?.round || 0,
      reason: reason,
      timestamp: Date.now()
    });

    await ActorEngine.updateActor(actor, {
      'system.darkSidePoints': ds,
      'system.dspLog': log
    });

    return { dspCurrent: ds.current, reason };
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
    const fp = actor.system.forcePoints || {};
    const fpCost = power.fpCost || 0;

    if ((fp.current || 0) < fpCost) {
      return { canUse: false, reason: `Need ${fpCost} FP, have ${fp.current}` };
    }

    return { canUse: true };
  }
}
