/**
 * RollCore.js — Unified Roll Execution Layer (Phase 1)
 *
 * SINGLE SOURCE OF TRUTH for roll creation, modifier gathering, and formula construction.
 *
 * Responsibilities:
 *  - Gather all modifiers via ModifierEngine
 *  - Build base roll (d20, d6, etc.)
 *  - Handle Force Point logic
 *  - Construct unified formula
 *  - Execute roll via Foundry Roll class
 *  - Return structured result (NOT Chat/Mutation)
 *
 * Non-Responsibilities (handled elsewhere):
 *  - Actor mutation (via ActorEngine only)
 *  - Chat rendering (via domain engines)
 *  - Combat tracker updates (via CombatEngine)
 *  - Threshold/condition logic (via respective engines)
 *
 * INVARIANT: All rolls must route through this layer.
 */

import { ModifierEngine } from '../effects/modifiers/ModifierEngine.js';
import { ForcePointsService } from '../force/force-points-service.js';
import { swseLogger } from '../../utils/logger.js';

export class RollCore {

  /**
   * Main execution method - single entry point for all rolls
   *
   * @param {Object} options
   * @param {Actor} options.actor - The rolling actor
   * @param {string} options.domain - Modifier target domain (e.g., "skill.acrobatics", "attack", "defense.reflex")
   * @param {Object} options.context - Additional roll context for hooks/validation
   * @param {Object} options.rollOptions - Roll-specific options
   * @param {string} options.rollOptions.baseDice - Base dice (default "1d20")
   * @param {boolean} options.rollOptions.useForce - Spend Force Point
   * @param {number} options.rollOptions.forcePointCount - Override force points spent (default 1)
   * @param {boolean} options.rollOptions.isCriticalConfirmation - Is this a crit confirmation roll
   * @param {boolean} options.rollOptions.isTakeX - Is this a "Take X" roll (different logic)
   * @param {number} options.rollOptions.takeXValue - Value for Take X (default 10)
   * @param {Object} options.rollData - Actor roll data for formula evaluation
   *
   * @returns {Promise<Object>} Structured result:
   * {
   *   success: boolean,
   *   baseRoll: number (d20 result),
   *   modifierTotal: number,
   *   forcePointBonus: number (0 if not used),
   *   finalTotal: number (baseRoll + modifiers + force),
   *   breakdown: { ... },  // For UI display
   *   domain: string,
   *   isTakeX: boolean,
   *   roll: Roll (Foundry Roll object, can be null if Take X),
   *   formula: string,
   *   error: string (if failed)
   * }
   */
  static async execute(options = {}) {
    const {
      actor,
      domain,
      context = {},
      rollOptions = {},
      rollData = {}
    } = options;

    // Validation
    if (!actor) {
      return {
        success: false,
        error: 'RollCore.execute() requires actor',
        domain,
        breakdown: {}
      };
    }

    if (!domain) {
      return {
        success: false,
        error: 'RollCore.execute() requires domain (e.g., "skill.acrobatics")',
        domain: 'unknown',
        breakdown: {}
      };
    }

    try {
      // === STEP 1: Gather Modifiers via ModifierEngine ===
      const allModifiers = await ModifierEngine.getAllModifiers(actor);
      const modifierTotal = await ModifierEngine.aggregateTarget(actor, domain);

      // === STEP 2: Determine Base Roll ===
      const baseDice = rollOptions.baseDice || '1d20';
      const isTakeX = rollOptions.isTakeX || false;
      const takeXValue = rollOptions.takeXValue || 10;

      // === STEP 3: Handle Take X ===
      if (isTakeX) {
        return this._handleTakeX({
          actor,
          domain,
          baseDice,
          takeXValue,
          modifierTotal,
          allModifiers,
          context
        });
      }

      // === STEP 4: Handle Force Point Logic ===
      let forcePointBonus = 0;
      let forceRoll = null;
      if (rollOptions.useForce) {
        const forceResult = await this.applyForcePointLogic(actor, rollOptions.forcePointCount || 1);
        if (forceResult.success) {
          forcePointBonus = forceResult.bonus;
          forceRoll = forceResult.roll;
        } else if (rollOptions.useForce) {
          // Warn but don't fail the roll
          swseLogger.warn(`[RollCore] Force Point use failed: ${forceResult.reason}`);
        }
      }

      // === STEP 5: Construct Formula ===
      const formula = this._constructFormula(baseDice, modifierTotal, forcePointBonus);

      // === STEP 6: Execute Roll ===
      let roll;
      try {
        roll = await this._executeRoll(formula, rollData);
      } catch (err) {
        swseLogger.error(`[RollCore] Roll execution failed for domain "${domain}":`, err);
        return {
          success: false,
          error: `Roll execution failed: ${err.message}`,
          domain,
          breakdown: {}
        };
      }

      // === STEP 7: Construct Result ===
      const baseRollResult = this._extractBaseRoll(roll, baseDice);

      const breakdown = {
        baseRoll: baseRollResult,
        modifiers: modifierTotal,
        modifierBreakdown: await this._buildModifierBreakdown(allModifiers, domain),
        forcePointBonus,
        total: roll.total
      };

      return {
        success: true,
        baseRoll: baseRollResult,
        modifierTotal,
        forcePointBonus,
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
      return {
        success: false,
        error: `Unexpected error: ${err.message}`,
        domain,
        breakdown: {},
        context
      };
    }
  }

  /**
   * Handle "Take X" rolls (e.g., Take 10, Take 20)
   * Returns automatic result without rolling dice
   *
   * @private
   */
  static async _handleTakeX(options) {
    const { actor, domain, takeXValue, modifierTotal, allModifiers, context } = options;

    const result = takeXValue + modifierTotal;

    const breakdown = {
      baseRoll: takeXValue,
      modifiers: modifierTotal,
      modifierBreakdown: await this._buildModifierBreakdown(allModifiers, domain),
      forcePointBonus: 0,
      total: result
    };

    return {
      success: true,
      baseRoll: takeXValue,
      modifierTotal,
      forcePointBonus: 0,
      finalTotal: result,
      breakdown,
      domain,
      isTakeX: true,
      roll: null, // No Roll object for Take X
      formula: `${takeXValue} + ${modifierTotal}`,
      context
    };
  }

  /**
   * Apply Force Point logic - Roll scaled Force dice with heroic level support
   *
   * Uses ForcePointsService for canonical scaling rules:
   * - Level 1-7: 1d6
   * - Level 8-14: 2d6 (take highest)
   * - Level 15+: 3d6 (take highest)
   * - Die size: d6 default, d8 if upgraded
   *
   * NOTE: This is the CORE force point roll logic.
   * Domain-specific Force Point handling (deduction, etc.) happens in domain engines.
   * RollCore does NOT mutate; returns bonus for caller to apply.
   *
   * @param {Actor} actor
   * @param {number} pointsToSpend - Force Points to spend (typically 1)
   * @returns {Object} { success: boolean, bonus: number, spent: number, diceUsed: string, roll: Roll }
   */
  static async applyForcePointLogic(actor, pointsToSpend = 1) {
    if (!actor) {
      return { success: false, bonus: 0, spent: 0, reason: 'No actor' };
    }

    // Check Force Points available via ForcePointsService
    if (!ForcePointsService.canSpend(actor, pointsToSpend)) {
      const remaining = ForcePointsService.getRemaining(actor);
      return {
        success: false,
        bonus: 0,
        spent: 0,
        reason: `Insufficient Force Points (have ${remaining}, need ${pointsToSpend})`
      };
    }

    // Get heroic scaling from ForcePointsService
    const { diceCount, dieSize } = ForcePointsService.getScalingDice(actor);
    const forceDice = `${diceCount}${dieSize}`;

    try {
      const fpRoll = new Roll(forceDice);
      await fpRoll.evaluate({ async: true });

      // For multiple dice, take the highest; for single die, use total
      let bonus = 0;
      if (diceCount > 1) {
        // Multiple dice: extract highest result
        const results = fpRoll.dice[0].results.map(r => r.result);
        bonus = Math.max(...results);
      } else {
        // Single die: use total
        bonus = fpRoll.total;
      }

      return {
        success: true,
        bonus,
        spent: pointsToSpend,
        diceUsed: forceDice,
        roll: fpRoll
      };
    } catch (err) {
      swseLogger.error(`[RollCore] Force Point roll failed for die "${forceDie}":`, err);
      return {
        success: false,
        bonus: 0,
        spent: 0,
        reason: `Force die roll failed: ${err.message}`
      };
    }
  }

  /**
   * Construct the final roll formula
   *
   * @private
   */
  static _constructFormula(baseDice, modifierTotal, forcePointBonus) {
    let formula = baseDice;

    if (modifierTotal !== 0) {
      formula += ` + ${modifierTotal}`;
    }

    if (forcePointBonus > 0) {
      formula += ` + ${forcePointBonus}`;
    }

    return formula;
  }

  /**
   * Execute roll via Foundry Roll class
   *
   * @private
   */
  static async _executeRoll(formula, rollData = {}) {
    try {
      // Use Foundry's native Roll class
      const roll = new Roll(formula, rollData);
      await roll.evaluate({ async: true });
      return roll;
    } catch (err) {
      throw new Error(`Failed to execute formula "${formula}": ${err.message}`);
    }
  }

  /**
   * Extract base d20 result from roll
   *
   * @private
   */
  static _extractBaseRoll(roll, baseDice) {
    try {
      // For "1d20", find first d20 die result
      if (baseDice.includes('d20')) {
        const d20Dice = roll.dice.find(d => d.faces === 20);
        if (d20Dice && d20Dice.results.length > 0) {
          return d20Dice.results[0].result;
        }
      }
      // For other dice, return first die result
      if (roll.dice.length > 0 && roll.dice[0].results.length > 0) {
        return roll.dice[0].results[0].result;
      }
      return 0;
    } catch (err) {
      swseLogger.warn('[RollCore] Could not extract base roll:', err);
      return 0;
    }
  }

  /**
   * Build human-readable modifier breakdown for UI
   *
   * @private
   */
  static async _buildModifierBreakdown(allModifiers, domain) {
    const breakdown = {};

    // Group modifiers by source for display
    const bySource = {};
    allModifiers.forEach(mod => {
      if (!bySource[mod.source]) {
        bySource[mod.source] = [];
      }
      bySource[mod.source].push(mod);
    });

    // Aggregate by source
    for (const [source, mods] of Object.entries(bySource)) {
      const total = mods.reduce((sum, m) => sum + m.value, 0);
      if (total !== 0) {
        breakdown[source] = total;
      }
    }

    return breakdown;
  }

  /**
   * Critical Hit Confirmation Handler (Phase 5 Stub)
   *
   * STRUCTURE for future implementation:
   *  - Threat detection: natural d20 result
   *  - Confirmation roll: separate 1d20 + same modifiers
   *  - Crit threat range: expandable per weapon/feat
   *  - Damage multiplier: applies post-roll
   *
   * Currently a stub - full implementation in Phase 5.
   *
   * @param {Object} options
   * @param {boolean} options.threatDetected - Natural 20 or threat range hit
   * @param {number} options.baseD20 - Base d20 result before modifiers
   * @param {Actor} options.actor - Acting character
   * @param {string} options.weaponId - Weapon item ID (for threat range lookup)
   *
   * @returns {Object} {
   *   threat: boolean (in threat range),
   *   confirmedCrit: boolean (confirmation succeeded),
   *   confirmationRoll: Roll (if rolled),
   *   damageMultiplier: number (default 1x, crit is typically 2x)
   * }
   */
  static async handleCriticalThreat(options = {}) {
    const {
      threatDetected = false,
      baseD20 = 0,
      actor = null,
      weaponId = null
    } = options;

    if (!threatDetected || baseD20 === 0) {
      return {
        threat: false,
        confirmedCrit: false,
        confirmationRoll: null,
        damageMultiplier: 1
      };
    }

    // PHASE 5: To be implemented
    // - Roll confirmation (1d20 + same modifiers)
    // - Compare vs target defense
    // - Set damageMultiplier to 2 if confirmed

    swseLogger.debug('[RollCore] Critical threat detected but confirmation not yet implemented');

    return {
      threat: true,
      confirmedCrit: false,
      confirmationRoll: null,
      damageMultiplier: 1
    };
  }
}

export default RollCore;
