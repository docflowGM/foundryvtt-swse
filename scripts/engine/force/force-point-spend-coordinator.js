/**
 * ForcePointSpendCoordinator — authoritative "spend a Force Point for a bonus
 * die" transaction.
 *
 * Phase 1 rolling-system alignment fix:
 * RollCore.applyForcePointLogic() previously validated and rolled the Force
 * Point bonus die but never mutated the actor's Force Points, so selecting
 * "Use Force Point" granted the bonus without paying for it. ActorEngine
 * remains the sole actor-mutation authority; this coordinator only sequences
 * validate -> spend -> roll -> rollback-on-failure around that authority so
 * the mutation happens exactly once, in exactly one place.
 *
 * Does NOT:
 * - Mutate the actor directly (ActorEngine.spendForcePoints/gainForcePoints do).
 * - Decide rules eligibility (ForcePointsService does).
 * - Render chat (renderers do).
 */

import { ForcePointsService } from "/systems/foundryvtt-swse/scripts/engine/force/force-points-service.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ROLL_CONTRIBUTION_KIND, ROLL_TRANSFORM_OPERATION, makeRollContribution } from "/systems/foundryvtt-swse/scripts/engine/roll/expression/roll-contribution-types.js";
import { applyRollTransforms } from "/systems/foundryvtt-swse/scripts/engine/roll/expression/roll-transform-resolver.js";

export class ForcePointSpendCoordinator {
  /**
   * Validate, spend, and roll a Force Point bonus die as one transaction.
   *
   * @param {Actor} actor
   * @param {Object} options
   * @param {number} [options.amount=1] - Force Points requested.
   * @param {string} [options.reason='roll'] - Human-readable spend reason.
   * @param {string|null} [options.domain=null] - Roll domain (e.g. "skill.acrobatics").
   * @param {Object} [options.context={}] - Roll/spend context passed to rules checks.
   * @param {number} [options.dieUpgradeSteps=0] - Die-size upgrade steps (e.g. Strong in the Force).
   * @param {string|null} [options.dieUpgradeSource=null] - Label for the upgrade source.
   * @returns {Promise<Object>} Receipt: { success, requested, spent, before, after, reason, domain, bonus, roll, ... }
   */
  static async rollAndSpend(actor, options = {}) {
    const {
      amount = 1,
      reason = 'roll',
      domain = null,
      context = {},
      dieUpgradeSteps = 0,
      dieUpgradeSource = null
    } = options;

    const requested = Math.max(0, Number(amount) || 0) || 1;

    if (!actor) {
      return this._failure({ requested, before: 0, after: 0, reason: 'No actor', domain });
    }

    const before = ForcePointsService.getRemaining(actor);

    // Validate the expenditure BEFORE anything is spent or rolled.
    const validation = ForcePointsService.validateSpend(actor, { reason, amount: requested });
    if (!validation.valid) {
      return this._failure({ requested, before, after: before, reason: validation.message, domain });
    }

    const { diceCount, dieSize } = await ForcePointsService.getScalingDice(actor, context);
    const finalDieSize = ForcePointsService.upgradeDieSize(dieSize, dieUpgradeSteps);

    // Roll Expression / Transformation Authority migration: "roll N, keep
    // the highest" used to be a plain `${diceCount}${dieSize}` Roll
    // followed by a manual Math.max(...) over the raw per-die results.
    // Foundry's own Roll grammar already has a canonical modifier for
    // exactly this (keep-highest, "khN") -- applyRollTransforms() compiles
    // the semantic transform into that syntax so the SAME Roll Foundry
    // evaluates already reflects only the kept die (diceCount === 1 keeps
    // the historical plain-die formula unchanged, no transform applied).
    //
    // This construction/validation happens BEFORE the Force Point is
    // spent (independent-review correction): applyRollTransforms() has
    // its own fail-closed policy (an invalid transform silently falls
    // back to the unmodified base formula), which is correct for a
    // generic preview/composition API but would otherwise let a Force
    // Point be spent for a mechanic that quietly degraded to a plain
    // die. Verifying the transform actually applied BEFORE spending
    // turns this into a real transaction: validate the mechanic, THEN
    // pay, THEN execute -- never pay for a composition that failed.
    const transform = diceCount > 1
      ? [makeRollContribution({
          kind: ROLL_CONTRIBUTION_KIND.BASE_ROLL_TRANSFORM,
          operation: ROLL_TRANSFORM_OPERATION.KEEP_HIGHEST,
          diceCount,
          keep: 1,
          sourceId: 'force-point-bonus-die',
          sourceName: 'Force Point Bonus Die',
          sourceType: 'forcePoint'
        })]
      : [];
    const { formula: forceDice, ledger: transformLedger } = applyRollTransforms(`1${finalDieSize}`, transform);

    if (transform.length > 0 && !transformLedger.some(entry => entry.applied === true)) {
      const compileReason = transformLedger[0]?.reason ?? 'Force Point keep-highest transform failed to compile.';
      swseLogger.error(`[ForcePointSpendCoordinator] Force Point bonus die construction failed before any spend occurred: ${compileReason}`);
      return this._failure({
        requested,
        before,
        after: before,
        reason: `Force Point bonus die construction failed: ${compileReason}`,
        domain
      });
    }

    const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");

    // Spend through the sole mutation authority before rolling, so the bonus
    // can never be granted without payment and can never be double-spent by
    // a second caller reading a stale "still available" value. By this
    // point the exact formula the player is paying for is already
    // validated -- spending can only be followed by executing that same
    // formula, never a silently-degraded fallback.
    let spendReceipt;
    try {
      spendReceipt = await ActorEngine.spendForcePoints(actor, requested);
    } catch (err) {
      swseLogger.error('[ForcePointSpendCoordinator] ActorEngine.spendForcePoints threw', err);
      return this._failure({ requested, before, after: before, reason: `Force Point spend failed: ${err.message}`, domain });
    }

    const actuallySpent = Number(spendReceipt?.spent ?? 0) || 0;
    if (actuallySpent < requested) {
      // Partial spend (e.g. a race against another caller): refund whatever
      // was taken and fail closed rather than granting a partially-paid bonus.
      if (actuallySpent > 0) {
        await this._safeRefund(ActorEngine, actor, actuallySpent, 'partial-spend-rejected');
      }
      return this._failure({
        requested,
        before,
        after: before,
        reason: `Force Point spend incomplete (needed ${requested}, spent ${actuallySpent})`,
        domain
      });
    }

    let fpRoll;
    try {
      fpRoll = new Roll(forceDice);
      await fpRoll.evaluate();
    } catch (err) {
      swseLogger.error(`[ForcePointSpendCoordinator] Force Point roll failed for die "${forceDice}"; rolling back spend.`, err);
      await this._safeRefund(ActorEngine, actor, actuallySpent, 'roll-execution-failed');
      return this._failure({
        requested,
        before,
        after: before,
        reason: `Force die roll failed: ${err.message}`,
        domain,
        rolledBack: true
      });
    }

    // fpRoll.total already reflects only the kept die when a keep-highest
    // transform was applied (Foundry's own kh1 marks the dropped dice
    // inactive) -- no post-hoc Math.max() over raw results needed anymore.
    const bonus = fpRoll.total;

    const after = Number.isFinite(Number(spendReceipt?.remaining)) ? Number(spendReceipt.remaining) : Math.max(0, before - actuallySpent);

    return {
      success: true,
      requested,
      spent: actuallySpent,
      before,
      after,
      reason,
      domain,
      bonus,
      roll: fpRoll,
      rollTransformLedger: transformLedger,
      diceUsed: forceDice,
      baseDieSize: dieSize,
      dieSize: finalDieSize,
      dieUpgradeSteps,
      dieUpgradeSource,
      rolledBack: false
    };
  }

  static async _safeRefund(ActorEngine, actor, amount, refundReason) {
    try {
      await ActorEngine.gainForcePoints(actor, amount);
    } catch (err) {
      swseLogger.error(`[ForcePointSpendCoordinator] Rollback refund of ${amount} FP failed (${refundReason}); actor may be short Force Points.`, err);
    }
  }

  static _failure({ requested, before, after, reason, domain, rolledBack = false }) {
    return {
      success: false,
      requested,
      spent: 0,
      before,
      after,
      reason,
      domain,
      bonus: 0,
      roll: null,
      rolledBack
    };
  }
}

export default ForcePointSpendCoordinator;
