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
   * Natural 20 on a Use the Force check (Core Rulebook, "Regaining Force Powers"): you regain ALL spent Force
   * powers at the END OF YOUR TURN. It never awards a Force Point. This records the pending regain on the actor;
   * the combat turn hook (force-power-hooks.js) performs it through ForceExecutor.regainAllSpentForcePowers.
   * Out of combat there is no "end of turn": the pending regain stays recorded and is cleared by the next
   * regain-all (FP-RD-008, deferred ruling).
   */
  static async recordNatural20(actor, powerName, { sourceKey = null } = {}) {
    const force = actor.system.force || {};
    const natural20Count = (force.natural20Count || 0) + 1;
    const combat = globalThis.game?.combat;
    const pending = {
      combatId: combat?.started ? combat.id ?? null : null,
      round: combat?.started ? combat.round ?? null : null,
      // The regain happens at the end of THIS actor's turn: the current one if the check is rolled on its turn, otherwise its next.
      combatantId: combat?.started ? Array.from(combat.combatants ?? []).find(c => c.actor?.id === actor.id)?.id ?? null : null,
      source: powerName ?? sourceKey ?? null
    };
    await ActorEngine.updateActor(actor, {
      'system.force.natural20Count': natural20Count,
      'flags.swse.pendingSuiteRegain': pending
    });
    return { natural20Count, pendingSuiteRegain: pending, fpRecovered: 0 };
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
