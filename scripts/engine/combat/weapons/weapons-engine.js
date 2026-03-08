/**
 * WeaponsEngine — Combat Rules Authority
 *
 * Pure, deterministic rules engine for weapon attacks and damage.
 * Parallel to SkillEnforcementEngine, but for combat mechanics.
 *
 * CRITICAL PRINCIPLE:
 * - No mutations
 * - No side effects
 * - No DOM access
 * - No chat posting
 * - No item updates
 * - Returns data structures only
 *
 * Responsibilities:
 * 1. Attack legality (proficiency, exotic, range)
 * 2. Attack modifiers (ability, size, conditions, feats, talents)
 * 3. Critical properties (threat range, multiplier)
 * 4. Damage model construction
 * 5. Reach/range validation
 * 6. Sentinel diagnostics
 */

import { ResolutionContext } from "/systems/foundryvtt-swse/scripts/engine/resolution/resolution-context.js";
import { RULES } from "/systems/foundryvtt-swse/scripts/engine/execution/rules/rule-enum.js";
import { CombatRulesRegistry, RuleCategories } from "/systems/foundryvtt-swse/scripts/engine/rules/rules-registry.js";

export class WeaponsEngine {
  /**
   * Comprehensive attack evaluation (primary entry point).
   * Returns all data needed for attack roll and decision-making.
   *
   * @param {Object} options
   * @param {Actor} options.actor - The attacker
   * @param {Item} options.weapon - The weapon
   * @param {Actor} [options.target] - The target
   * @param {string} [options.mode] - "melee" | "ranged" | "thrown" (default: infer from weapon)
   * @param {Object} [options.context] - Combat context (distance, concealment, etc.)
   * @param {boolean} [options.telemetry] - Enable diagnostics
   * @returns {Object} Complete attack evaluation result
   */
  static evaluateAttack({ actor, weapon, target = null, mode = null, context = {}, telemetry = false }) {
    const result = {
      allowed: false,
      reason: null,
      attack: {
        bonuses: [],
        penalties: [],
        totalModifierPreview: 0
      },
      reach: {
        inReach: true,
        distance: context.distance ?? null,
        maxReach: null
      },
      critical: {
        threatRange: 20,
        multiplier: 2,
        autoThreat: false
      },
      diagnostics: {
        rulesTriggered: [],
        blockedBy: null
      }
    };

    if (!actor || !weapon) {
      result.reason = 'Missing actor or weapon';
      return result;
    }

    // Check legality
    const legalityCheck = this._checkLegality(actor, weapon, target, context);
    if (!legalityCheck.allowed) {
      result.reason = legalityCheck.reason;
      result.diagnostics.blockedBy = legalityCheck.reason;
      return result;
    }

    result.allowed = true;

    // Execute registered attack rules through registry
    const attackPayload = { actor, weapon, target, context };
    result = CombatRulesRegistry.executeRules(RuleCategories.ATTACK, attackPayload, result);

    // Execute registered critical rules through registry
    const critPayload = { actor, weapon, target, context };
    result = CombatRulesRegistry.executeRules(RuleCategories.CRITICAL, critPayload, result);

    // Reach/range validation is now handled by reachRule in the ATTACK category
    // (executes early via registry with priority 5)

    // Diagnostics
    if (telemetry) {
      result.diagnostics = this._getDiagnostics(actor, weapon, target);
    }

    return result;
  }

  /**
   * Build damage structure (after hit confirmed).
   * Describes all damage components without rolling.
   *
   * @param {Object} options
   * @param {Actor} options.actor - The attacker
   * @param {Item} options.weapon - The weapon
   * @param {Actor} [options.target] - The target
   * @param {Object} [options.context] - Combat context
   * @param {boolean} [options.critical] - Is this a critical hit?
   * @param {boolean} [options.telemetry] - Enable diagnostics
   * @returns {Object} Damage model
   */
  static buildDamage({ actor, weapon, target = null, context = {}, critical = false, telemetry = false }) {
    const result = {
      dice: [],
      flatBonus: 0,
      damageType: 'kinetic',
      armorPiercing: 0,
      multipliers: {
        critMultiplier: 1,  // 1x base, then multiplied on crit confirmation
        conditional: 1
      },
      diagnostics: {
        rulesTriggered: []
      }
    };

    if (!actor || !weapon) {
      return result;
    }

    // Execute registered damage rules through registry
    const damagePayload = { actor, weapon, target, critical, context };
    result = CombatRulesRegistry.executeRules(RuleCategories.DAMAGE, damagePayload, result);

    return result;
  }

  /**
   * Lightweight legality check (for UI button state).
   * @param {Actor} actor
   * @param {Item} weapon
   * @param {Actor} [target]
   * @param {Object} [context]
   * @returns {boolean}
   */
  static canAttack(actor, weapon, target = null, context = {}) {
    if (!actor || !weapon) {
      return false;
    }
    const check = this._checkLegality(actor, weapon, target, context);
    return check.allowed;
  }

  /**
   * Get attack modifiers (bonuses/penalties only, no legality check).
   * Used for tooltip previews.
   *
   * @param {Actor} actor
   * @param {Item} weapon
   * @param {Actor} [target]
   * @param {Object} [context]
   * @returns {Object} { bonuses, penalties, total }
   */
  static getAttackModifiers(actor, weapon, target = null, context = {}) {
    if (!actor || !weapon) {
      return { bonuses: [], penalties: [], total: 0 };
    }
    return this._getAttackModifiers(actor, weapon, target, context);
  }

  /**
   * Debug trace for attack evaluation.
   * @param {Object} options - Same as evaluateAttack
   * @returns {Object} Full trace with intermediate steps
   */
  static traceAttack({ actor, weapon, target = null, mode = null, context = {} }) {
    // This would return detailed step-by-step evaluation
    // For now, just return evaluateAttack with telemetry
    return this.evaluateAttack({ actor, weapon, target, mode, context, telemetry: true });
  }

  /**
   * Debug trace for damage.
   * @param {Object} options - Same as buildDamage
   * @returns {Object} Full trace with intermediate steps
   */
  static traceDamage({ actor, weapon, target = null, context = {}, critical = false }) {
    return this.buildDamage({ actor, weapon, target, context, critical, telemetry: true });
  }

  /* ========================================================================== */
  /* PRIVATE HELPERS                                                            */
  /* ========================================================================== */

  static _checkLegality(actor, weapon, target, context) {
    // Basic legality check - weapon must exist and not be disabled
    if (!weapon || weapon.system?.disabled === true) {
      return {
        allowed: false,
        reason: 'Weapon unavailable'
      };
    }

    return {
      allowed: true,
      reason: null
    };
  }

  // Reach/range validation is now handled by reachRule via registry.executeRules()
  // Diagnostics come from rules themselves via registry.executeRules()
  // Rules add to result.diagnostics.rulesTriggered as they execute
}

export default WeaponsEngine;
