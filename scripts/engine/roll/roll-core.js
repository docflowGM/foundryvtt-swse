import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";
import ModifierUtils from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierUtils.js";
import { buildSourceBreakdown, buildModifierLedger } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/modifier-breakdown-builder.js";
import { ForcePointSpendCoordinator } from "/systems/foundryvtt-swse/scripts/engine/force/force-point-spend-coordinator.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class RollCore {
  static async execute(options = {}) {
    const {
      actor,
      domain,
      context = {},
      rollOptions = {},
      rollData = {},
      baseBonus = 0
    } = options;

    if (!actor) {
      return { success: false, error: 'RollCore.execute() requires actor', domain, breakdown: {} };
    }

    if (!domain) {
      return { success: false, error: 'RollCore.execute() requires domain (e.g., "skill.acrobatics")', domain: 'unknown', breakdown: {} };
    }

    try {
      const skipStaticModifiers = rollOptions.skipStaticModifiers === true || context?.skipStaticModifiers === true;

      // Single resolution pass: modifierTotal, modifierBreakdown, and
      // modifierLedger are always derived from the exact same applied
      // modifier set, so the displayed breakdown can never disagree with
      // the total that actually fed the roll formula (Phase 1 fix).
      let modifierTotal;
      let modifierBreakdown;
      let modifierLedger;
      let suppressedModifiers;
      if (skipStaticModifiers) {
        const contextualModifiers = ModifierEngine.getEffectIntentModifiersForContext(actor, {
          context,
          includeBroad: false
        }).filter(modifier => ModifierEngine.isModifierAllowedInContext(actor, modifier, context, { staticSheet: false }));
        modifierTotal = ModifierUtils.calculateModifierTotal(contextualModifiers, domain);
        const domainFiltered = ModifierUtils.filterModifiers(contextualModifiers, domain, true);
        const applied = ModifierUtils.resolveStacking(domainFiltered);
        modifierBreakdown = buildSourceBreakdown(applied);
        modifierLedger = buildModifierLedger(applied, [], domain);
        suppressedModifiers = [];
      } else {
        const resolution = await ModifierEngine.resolveTarget(actor, domain, { context });
        modifierTotal = resolution.total;
        modifierBreakdown = resolution.breakdown;
        modifierLedger = resolution.ledger;
        suppressedModifiers = resolution.suppressed;
      }

      const baseDice = rollOptions.baseDice || '1d20';
      const isTakeX = rollOptions.isTakeX || false;
      const takeXValue = rollOptions.takeXValue || 10;

      if (isTakeX) {
        return this._handleTakeX({ actor, domain, baseDice, baseBonus, takeXValue, modifierTotal, modifierBreakdown, modifierLedger, suppressedModifiers, context });
      }

      let forcePointBonus = 0;
      let forceRoll = null;
      let forcePointDetails = null;
      if (rollOptions.useForce) {
        const forceResult = await this.applyForcePointLogic(actor, rollOptions.forcePointCount || 1, {
          reason: rollOptions.forcePointReason ?? domain,
          domain,
          context,
          dieUpgradeSteps: rollOptions.forcePointDieUpgradeSteps ?? context?.forcePointDieUpgrade?.steps ?? 0,
          dieUpgradeSource: rollOptions.forcePointDieUpgradeSource ?? context?.forcePointDieUpgrade?.source ?? null
        });
        if (forceResult.success) {
          forcePointBonus = forceResult.bonus;
          forceRoll = forceResult.roll;
          forcePointDetails = forceResult;
        } else {
          swseLogger.warn(`[RollCore] Force Point use failed: ${forceResult.reason}`);
        }
      }

      const formula = this._constructFormula(baseDice, baseBonus, modifierTotal, forcePointBonus);

      let roll;
      try {
        roll = await this._executeRoll(formula, rollData);
      } catch (err) {
        swseLogger.error(`[RollCore] Roll execution failed for domain "${domain}":`, err);
        // The Force Point (if any) was already spent to pay for forcePointBonus
        // above; since this roll never happened, refund it rather than leaving
        // the actor short a point for a bonus they never received.
        if (forcePointDetails?.success && forcePointDetails.spent > 0) {
          await this._refundForcePoints(actor, forcePointDetails.spent, 'main-roll-execution-failed');
        }
        return { success: false, error: `Roll execution failed: ${err.message}`, domain, breakdown: {} };
      }

      const baseRollResult = this._extractBaseRoll(roll, baseDice);
      const breakdown = {
        baseRoll: baseRollResult,
        baseBonus,
        modifiers: modifierTotal,
        modifierBreakdown,
        modifierLedger,
        suppressedModifiers,
        forcePointBonus,
        forcePointDetails,
        total: roll.total
      };

      return {
        success: true,
        baseRoll: baseRollResult,
        baseBonus,
        modifierTotal,
        forcePointBonus,
        forceRoll,
        forcePointDetails,
        finalTotal: roll.total,
        breakdown,
        domain,
        isTakeX: false,
        roll,
        formula,
        context
      };
    } catch (err) {
      swseLogger.error(`[RollCore.execute] Unexpected error for domain "${domain}":`, err);
      return { success: false, error: `Unexpected error: ${err.message}`, domain, breakdown: {}, context };
    }
  }

  static async _handleTakeX(options) {
    const { domain, takeXValue, baseBonus, modifierTotal, modifierBreakdown, modifierLedger, suppressedModifiers, context } = options;
    const result = takeXValue + baseBonus + modifierTotal;
    const breakdown = {
      baseRoll: takeXValue,
      baseBonus,
      modifiers: modifierTotal,
      modifierBreakdown,
      modifierLedger,
      suppressedModifiers,
      forcePointBonus: 0,
      total: result
    };
    return {
      success: true,
      baseRoll: takeXValue,
      baseBonus,
      modifierTotal,
      forcePointBonus: 0,
      finalTotal: result,
      breakdown,
      domain,
      isTakeX: true,
      roll: null,
      formula: `${takeXValue} + ${baseBonus} + ${modifierTotal}`,
      context
    };
  }

  static async executeFormula({ formula, rollData = {}, actor = null, domain = 'formula', context = {} } = {}) {
    if (!formula || typeof formula !== 'string') {
      return { success: false, error: 'RollCore.executeFormula() requires a formula string', domain, context };
    }
    try {
      const roll = await this._executeRoll(formula, rollData);
      const baseRoll = this._extractBaseRoll(roll, formula);
      return {
        success: true,
        actor,
        domain,
        context,
        formula,
        roll,
        baseRoll,
        finalTotal: roll.total,
        breakdown: { baseRoll, baseBonus: 0, modifiers: 0, modifierBreakdown: {}, forcePointBonus: 0, total: roll.total }
      };
    } catch (err) {
      swseLogger.error(`[RollCore.executeFormula] Failed for domain "${domain}":`, err);
      return { success: false, error: err.message, domain, context, formula };
    }
  }

  /**
   * Roll and PAY FOR a Force Point bonus die as a single authoritative
   * transaction (ForcePointSpendCoordinator). ActorEngine is the only code
   * that ever mutates system.forcePoints.value; this method just asks the
   * coordinator to validate, spend, and roll, then adapts the receipt to the
   * shape RollCore.execute() consumes.
   *
   * `spent` only ever reflects Force Points actually deducted from the
   * actor — never the requested amount — so callers cannot mistake a
   * request for a payment.
   */
  static async applyForcePointLogic(actor, pointsToSpend = 1, options = {}) {
    const receipt = await ForcePointSpendCoordinator.rollAndSpend(actor, {
      amount: pointsToSpend,
      reason: options?.reason ?? 'roll',
      domain: options?.domain ?? null,
      context: options?.context ?? {},
      dieUpgradeSteps: options?.dieUpgradeSteps ?? 0,
      dieUpgradeSource: options?.dieUpgradeSource ?? null
    });

    if (!receipt.success) {
      return {
        success: false,
        bonus: 0,
        spent: receipt.spent,
        requested: receipt.requested,
        before: receipt.before,
        after: receipt.after,
        reason: receipt.reason
      };
    }

    return {
      success: true,
      bonus: receipt.bonus,
      spent: receipt.spent,
      requested: receipt.requested,
      before: receipt.before,
      after: receipt.after,
      diceUsed: receipt.diceUsed,
      baseDieSize: receipt.baseDieSize,
      dieSize: receipt.dieSize,
      dieUpgradeSteps: receipt.dieUpgradeSteps,
      dieUpgradeSource: receipt.dieUpgradeSource,
      roll: receipt.roll
    };
  }

  /** Refund Force Points already spent when a roll they paid for never completed. */
  static async _refundForcePoints(actor, amount, refundReason) {
    try {
      const { ActorEngine } = await import("/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js");
      await ActorEngine.gainForcePoints(actor, amount);
    } catch (err) {
      swseLogger.error(`[RollCore] Failed to refund ${amount} Force Point(s) after ${refundReason}; actor may be short a point.`, err);
    }
  }

  static _constructFormula(baseDice, baseBonus, modifierTotal, forcePointBonus) {
    let formula = baseDice;
    if (baseBonus !== 0) formula += ` + ${baseBonus}`;
    if (modifierTotal !== 0) formula += ` + ${modifierTotal}`;
    if (forcePointBonus > 0) formula += ` + ${forcePointBonus}`;
    return formula;
  }

  static async _executeRoll(formula, rollData = {}) {
    try {
      const roll = new Roll(formula, rollData);
      await roll.evaluate();
      return roll;
    } catch (err) {
      throw new Error(`Failed to execute formula "${formula}": ${err.message}`);
    }
  }

  static _extractBaseRoll(roll, baseDice) {
    try {
      if (baseDice.includes('d20')) {
        const d20Dice = roll.dice.find(d => d.faces === 20);
        if (d20Dice && d20Dice.results.length > 0) return d20Dice.results[0].result;
      }
      if (roll.dice.length > 0 && roll.dice[0].results.length > 0) return roll.dice[0].results[0].result;
      return 0;
    } catch (err) {
      swseLogger.warn('[RollCore] Could not extract base roll:', err);
      return 0;
    }
  }

  static async handleCriticalThreat(options = {}) {
    const {
      threatDetected = false,
      baseD20 = 0,
      actor = null,
      weaponId = null,
      weapon = null,
      critMultiplier = null
    } = options;

    if (!threatDetected || baseD20 === 0) {
      return { threat: false, confirmedCrit: false, confirmationRoll: null, damageMultiplier: 1 };
    }

    const resolvedWeapon = weapon || actor?.items?.get?.(weaponId) || null;
    const rawMultiplier = critMultiplier
      ?? resolvedWeapon?.system?.critMultiplier
      ?? resolvedWeapon?.system?.criticalMultiplier
      ?? resolvedWeapon?.critMultiplier
      ?? resolvedWeapon?.criticalMultiplier
      ?? 2;
    const numericMultiplier = Number(String(rawMultiplier).replace(/^x/i, '')) || 2;
    const damageMultiplier = Math.max(1, numericMultiplier);

    swseLogger.debug('[RollCore] Critical threat accepted under SWSE rules', {
      actor: actor?.name ?? null,
      weaponId,
      baseD20,
      damageMultiplier
    });

    return { threat: true, confirmedCrit: true, confirmationRoll: null, damageMultiplier };
  }
}

export default RollCore;
