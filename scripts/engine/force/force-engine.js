/**
 * ForceEngine — Phase E Force Powers
 * Natural 20 tracking, Force Points, Dark Side tracking, DC calculation
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SchemaAdapters } from "/systems/foundryvtt-swse/scripts/utils/schema-adapters.js";
import { DSPEngine } from "/systems/foundryvtt-swse/scripts/engine/darkside/dsp-engine.js";

export class ForceEngine {
  /**
   * Get DC for force power check
   */
  static calculateDC(baseDC, options = {}) {
    const { situationalModifier = 0, distancePenalty = 0 } = options;
    return baseDC + situationalModifier + distancePenalty;
  }

  /**
   * Spend Force Point
   */
  static async spendForcePoint(actor, context = null) {
    // No competing untyped balance write: a Force Point leaves the actor only through the typed ForcePointsService /
    // ActorEngine transaction. A caller that cannot name the use (useKind and its required fields) is refused.
    if (!context?.useKind) {
      return { success: false, reason: 'Untyped Force Point spend refused: supply a typed spend context' };
    }
    try {
      const receipt = await ActorEngine.spendForcePoints(actor, 1, context);
      if (!receipt?.spent) return { success: false, reason: 'No Force Point was spent' };
      await ActorEngine.finalizeForcePointSpend(actor, receipt);
      return { success: true, receiptId: receipt.receiptId, fpRemaining: receipt.remaining };
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  /**
   * Gain Dark Side Point
   * MUTATES canonical storage location: system.darkSide.value
   * Routes through ActorEngine for audit log + validation
   */
  static async gainDarkSidePoint(actor, reason = '') {
    // Compute next value from canonical location
    const newValue = DSPEngine.getNextValue(actor, 1);

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
