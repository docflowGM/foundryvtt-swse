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

    // Get attack modifiers
    const mods = this._getAttackModifiers(actor, weapon, target, context);
    result.attack.bonuses = mods.bonuses;
    result.attack.penalties = mods.penalties;
    result.attack.totalModifierPreview = mods.total;

    // Get critical properties
    const crit = this._getCriticalProperties(actor, weapon);
    result.critical = crit;

    // Get reach/range
    const reach = this._validateReach(actor, weapon, target, context);
    result.reach = reach;

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

    // Get base damage dice
    const baseDamage = weapon.system?.damage ?? '1d6';
    result.dice.push({
      count: 1,
      size: parseInt(baseDamage.match(/\d+d(\d+)/)?.[1] || '6'),
      type: 'weapon-base'
    });

    // Get flat bonuses (strength, etc.)
    const strMod = actor.system.attributes?.str?.mod ?? 0;
    result.flatBonus += strMod;

    // Get damage type and armor piercing
    result.damageType = weapon.system?.damageType ?? 'kinetic';
    result.armorPiercing = weapon.system?.armorPiercing ?? 0;

    // If critical, apply critical damage modifications
    if (critical) {
      const crit = this._getCriticalProperties(actor, weapon);
      result.multipliers.critMultiplier = crit.multiplier;

      // Add CRITICAL_DAMAGE_BONUS rules
      const critBonuses = this._getCriticalDamageBonuses(actor, weapon);
      for (const bonus of critBonuses) {
        if (typeof bonus === 'number') {
          result.flatBonus += bonus;
        } else {
          // Dice format (e.g., "1d6")
          const match = String(bonus).match(/(\d+)d(\d+)/);
          if (match) {
            result.dice.push({
              count: parseInt(match[1]),
              size: parseInt(match[2]),
              type: 'critical-bonus'
            });
          }
        }
      }

      if (telemetry) {
        result.diagnostics.rulesTriggered.push(`CRITICAL_DAMAGE_BONUS:${critBonuses.length}`);
      }
    }

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
    const issues = [];

    // Weapon exists and enabled
    if (!weapon || weapon.system?.disabled === true) {
      return {
        allowed: false,
        reason: 'Weapon unavailable'
      };
    }

    // Check proficiency (warning, not blocking)
    const proficient = weapon.system?.proficient ?? true;
    if (!proficient) {
      issues.push({ source: 'Proficiency', value: -5 });
    }

    return {
      allowed: true,
      reason: null,
      issues
    };
  }

  static _getAttackModifiers(actor, weapon, target, context) {
    const bonuses = [];
    const penalties = [];

    // Base attack bonus
    bonuses.push({
      source: 'Base Attack Bonus',
      value: actor.system.bab ?? 0
    });

    // Ability modifier
    const attr = weapon.system?.attackAttribute ?? 'str';
    const abilityMod = actor.system.attributes?.[attr]?.mod ?? 0;
    if (abilityMod !== 0) {
      bonuses.push({
        source: `${attr.toUpperCase()} Modifier`,
        value: abilityMod
      });
    }

    // Proficiency penalty
    const proficient = weapon.system?.proficient ?? true;
    if (!proficient) {
      penalties.push({
        source: 'Non-Proficient',
        value: -5
      });
    }

    // Size modifier
    const sizeMod = actor.system.sizeMod ?? 0;
    if (sizeMod !== 0) {
      bonuses.push({
        source: 'Size Modifier',
        value: sizeMod
      });
    }

    // Condition penalty
    const ctPenalty = actor.system.conditionTrack?.penalty ?? 0;
    if (ctPenalty !== 0) {
      penalties.push({
        source: 'Condition Track',
        value: ctPenalty
      });
    }

    // Calculate total
    const total = bonuses.reduce((sum, b) => sum + b.value, 0) +
                  penalties.reduce((sum, p) => sum + p.value, 0);

    return { bonuses, penalties, total };
  }

  static _getCriticalProperties(actor, weapon) {
    if (!actor || !weapon) {
      return {
        threatRange: 20,
        multiplier: 2,
        autoThreat: false
      };
    }

    const ctx = new ResolutionContext(actor);
    const weaponProf = weapon.system?.proficiency;

    // EXTEND_CRITICAL_RANGE
    let threatRange = weapon.system?.critRange || 20;
    const critRangeRules = ctx.getRuleInstances(RULES.EXTEND_CRITICAL_RANGE);
    for (const rule of critRangeRules) {
      if (rule.proficiency === weaponProf) {
        threatRange -= (rule.by || 0);
      }
    }
    threatRange = Math.max(2, threatRange);

    // MODIFY_CRITICAL_MULTIPLIER
    let multiplier = weapon.system?.critMultiplier || 2;
    const multRules = ctx.getRuleInstances(RULES.MODIFY_CRITICAL_MULTIPLIER);
    for (const rule of multRules) {
      if (rule.proficiency === weaponProf && rule.multiplier) {
        multiplier = Math.max(multiplier, rule.multiplier);
      }
    }

    return {
      threatRange,
      multiplier,
      autoThreat: false  // TODO: Improved Critical logic
    };
  }

  static _getCriticalDamageBonuses(actor, weapon) {
    if (!actor || !weapon) {
      return [];
    }

    const ctx = new ResolutionContext(actor);
    const weaponProf = weapon.system?.proficiency;
    const bonuses = [];

    const critBonusRules = ctx.getRuleInstances(RULES.CRITICAL_DAMAGE_BONUS);
    for (const rule of critBonusRules) {
      if (rule.proficiency === weaponProf && rule.bonus) {
        bonuses.push(rule.bonus);
      }
    }

    return bonuses;
  }

  static _validateReach(actor, weapon, target, context) {
    // TODO: Implement full reach/range checking
    return {
      inReach: true,
      distance: context.distance ?? null,
      maxReach: null
    };
  }

  static _getDiagnostics(actor, weapon, target) {
    const diagnostics = {
      rulesTriggered: [],
      blockedBy: null
    };

    if (!actor || !weapon) {
      return diagnostics;
    }

    const ctx = new ResolutionContext(actor);

    // Report all triggered critical rules
    const critRangeRules = ctx.getRuleInstances(RULES.EXTEND_CRITICAL_RANGE);
    for (const rule of critRangeRules) {
      diagnostics.rulesTriggered.push(
        `EXTEND_CRITICAL_RANGE:${rule.proficiency}:${rule.by}`
      );
    }

    const multRules = ctx.getRuleInstances(RULES.MODIFY_CRITICAL_MULTIPLIER);
    for (const rule of multRules) {
      diagnostics.rulesTriggered.push(
        `MODIFY_CRITICAL_MULTIPLIER:${rule.proficiency}:${rule.multiplier}`
      );
    }

    const bonusRules = ctx.getRuleInstances(RULES.CRITICAL_DAMAGE_BONUS);
    for (const rule of bonusRules) {
      diagnostics.rulesTriggered.push(
        `CRITICAL_DAMAGE_BONUS:${rule.proficiency}:${rule.bonus}`
      );
    }

    return diagnostics;
  }
}

export default WeaponsEngine;
