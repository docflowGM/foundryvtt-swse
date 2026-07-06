import { ModifierEngine } from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierEngine.js";
import ModifierUtils from "/systems/foundryvtt-swse/scripts/engine/effects/modifiers/ModifierUtils.js";
import { ForcePointsService } from "/systems/foundryvtt-swse/scripts/engine/force/force-points-service.js";
import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const DIE_STEPS = Object.freeze(['d4', 'd6', 'd8', 'd10', 'd12']);

function upgradeDieSize(dieSize = 'd6', steps = 0) {
  const normalized = String(dieSize || 'd6').trim().toLowerCase();
  const index = DIE_STEPS.indexOf(normalized);
  if (index < 0) return normalized;
  const offset = Math.max(0, Number(steps) || 0);
  return DIE_STEPS[Math.min(DIE_STEPS.length - 1, index + offset)];
}

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
      const baseModifiers = skipStaticModifiers ? [] : await ModifierEngine.getAllModifiers(actor);
      const contextualModifiers = ModifierEngine.getEffectIntentModifiersForContext(actor, {
        context,
        includeBroad: false
      }).filter(modifier => ModifierEngine.isModifierAllowedInContext(actor, modifier, context, { staticSheet: false }));
      const allModifiers = [...baseModifiers, ...contextualModifiers];
      const modifierTotal = skipStaticModifiers
        ? ModifierUtils.calculateModifierTotal(contextualModifiers, domain)
        : await ModifierEngine.aggregateTarget(actor, domain, { context });

      const baseDice = rollOptions.baseDice || '1d20';
      const isTakeX = rollOptions.isTakeX || false;
      const takeXValue = rollOptions.takeXValue || 10;

      if (isTakeX) {
        return this._handleTakeX({ actor, domain, baseDice, baseBonus, takeXValue, modifierTotal, allModifiers, context });
      }

      let forcePointBonus = 0;
      let forceRoll = null;
      let forcePointDetails = null;
      if (rollOptions.useForce) {
        const forceResult = await this.applyForcePointLogic(actor, rollOptions.forcePointCount || 1, {
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
        return { success: false, error: `Roll execution failed: ${err.message}`, domain, breakdown: {} };
      }

      const baseRollResult = this._extractBaseRoll(roll, baseDice);
      const breakdown = {
        baseRoll: baseRollResult,
        baseBonus,
        modifiers: modifierTotal,
        modifierBreakdown: await this._buildModifierBreakdown(allModifiers, domain),
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
    const { domain, takeXValue, baseBonus, modifierTotal, allModifiers, context } = options;
    const result = takeXValue + baseBonus + modifierTotal;
    const breakdown = {
      baseRoll: takeXValue,
      baseBonus,
      modifiers: modifierTotal,
      modifierBreakdown: await this._buildModifierBreakdown(allModifiers, domain),
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

  static async applyForcePointLogic(actor, pointsToSpend = 1, options = {}) {
    if (!actor) return { success: false, bonus: 0, spent: 0, reason: 'No actor' };

    if (!ForcePointsService.canSpend(actor, pointsToSpend)) {
      const remaining = ForcePointsService.getRemaining(actor);
      return { success: false, bonus: 0, spent: 0, reason: `Insufficient Force Points (have ${remaining}, need ${pointsToSpend})` };
    }

    const { diceCount, dieSize } = await ForcePointsService.getScalingDice(actor);
    const dieUpgradeSteps = Math.max(0, Number(options?.dieUpgradeSteps ?? 0) || 0);
    const finalDieSize = upgradeDieSize(dieSize, dieUpgradeSteps);
    const forceDice = `${diceCount}${finalDieSize}`;

    try {
      const fpRoll = new Roll(forceDice);
      await fpRoll.evaluate();
      const bonus = diceCount > 1
        ? Math.max(...(fpRoll.dice?.[0]?.results ?? []).map(r => r.result))
        : fpRoll.total;
      return {
        success: true,
        bonus,
        spent: pointsToSpend,
        diceUsed: forceDice,
        baseDieSize: dieSize,
        dieSize: finalDieSize,
        dieUpgradeSteps,
        dieUpgradeSource: options?.dieUpgradeSource ?? null,
        roll: fpRoll
      };
    } catch (err) {
      swseLogger.error(`[RollCore] Force Point roll failed for die "${forceDice}":`, err);
      return { success: false, bonus: 0, spent: 0, reason: `Force die roll failed: ${err.message}` };
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

  static async _buildModifierBreakdown(allModifiers, domain) {
    const breakdown = {};
    const bySource = {};
    allModifiers.forEach(mod => {
      if (!bySource[mod.source]) bySource[mod.source] = [];
      bySource[mod.source].push(mod);
    });
    for (const [source, mods] of Object.entries(bySource)) {
      const total = mods.reduce((sum, m) => sum + m.value, 0);
      if (total !== 0) breakdown[source] = total;
    }
    return breakdown;
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
