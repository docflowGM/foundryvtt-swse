/**
 * PASSIVE Phase 4E - ResolutionContext
 *
 * Abstraction layer for resolution logic to query rule state.
 * Reads from frozen RULE snapshots (actor._ruleSet, actor._ruleParams).
 * Provides single interface for all rule checks during combat/skill resolution.
 *
 * CRITICAL: ResolutionContext is stateless.
 * It reads from pre-built frozen snapshots during prepare cycle.
 * No scanning. No mutation. Deterministic and fast.
 */

import { RULES } from "/systems/foundryvtt-swse/scripts/engine/execution/rules/rule-enum.js";

export class ResolutionContext {
  /**
   * Create a new resolution context for an actor.
   *
   * @param {Object} actor - The actor making the attack or check
   */
  constructor(actor) {
    this.actor = actor;
  }

  /**
   * Check if actor has a specific rule.
   * Reads from frozen actor._ruleSet and actor._ruleParams.
   *
   * PHASE 4E: Direct query of frozen snapshots populated during prepareDerivedData.
   *
   * @param {string} ruleType - Rule type to check (from RULES enum)
   * @param {Object} [options] - Optional context for rule evaluation
   * @param {string} [options.skillId] - For TREAT_SKILL_AS_TRAINED: the skill ID to check
   * @returns {boolean} True if rule is active
   *
   * @example
   * if (context.hasRule(RULES.IGNORE_COVER)) { ... }
   * if (context.hasRule(RULES.TREAT_SKILL_AS_TRAINED, { skillId: 'useTheForce' })) { ... }
   */
  hasRule(ruleType, options = null) {
    if (!this.actor) return false;

    // Check simple rules in frozen _ruleSet
    const ruleSet = this.actor._ruleSet ?? new Set();
    if (ruleSet.has(ruleType)) {
      // For simple rules, no options needed
      if (!options) return true;
    }

    // Check param rules in frozen _ruleParams
    const ruleParams = this.actor._ruleParams ?? new Map();
    if (ruleParams.has(ruleType)) {
      // Rule type exists in params map
      // For TREAT_SKILL_AS_TRAINED, check if specific skill is in the list
      if (ruleType === RULES.TREAT_SKILL_AS_TRAINED) {
        if (!options?.skillId) {
          // No skill filter: just check if any instance exists
          return true;
        }
        // Check if specific skill is in the parameterized instances
        const instances = ruleParams.get(ruleType) || [];
        return instances.some(inst => inst.skillId === options.skillId);
      }

      // Other param rules: no additional context filtering
      return true;
    }

    return false;
  }

  /**
   * Get all rule instances (with params) for a specific rule type.
   * Returns an array of param objects.
   *
   * @param {string} ruleType - Rule type to query (from RULES enum)
   * @returns {Array<Object>} Array of param objects for this rule type
   *
   * @example
   * const critRules = context.getRuleInstances(RULES.EXTEND_CRITICAL_RANGE);
   * for (const rule of critRules) {
   *   if (rule.proficiency === 'rifles') {
   *     bonus += rule.by;
   *   }
   * }
   */
  getRuleInstances(ruleType) {
    if (!this.actor) return [];

    const ruleParams = this.actor._ruleParams ?? new Map();
    const instances = ruleParams.get(ruleType);

    return instances || [];
  }
}

export default ResolutionContext;
