/**
 * PASSIVE RULE Definitions & Metadata
 *
 * Defines the schema and parameter requirements for each RULE type.
 * Used by validators to enforce strict contracts.
 *
 * Each rule can:
 * - Have no params (params: null)
 * - Have required params with type specs (params: { fieldName: "type" })
 *
 * CRITICAL: This structure is frozen. No runtime mutation.
 */

import { RULES } from "./rule-enum.js";

export const RULE_DEFINITIONS = Object.freeze({
  /**
   * IMMUNE_FEAR
   * No parameters.
   * Queried as: context.hasRule(RULES.IMMUNE_FEAR)
   */
  [RULES.IMMUNE_FEAR]: {
    params: null,
    description: "Actor is immune to fear effects"
  },

  /**
   * IMMUNE_POISON
   * No parameters.
   * Queried as: context.hasRule(RULES.IMMUNE_POISON)
   */
  [RULES.IMMUNE_POISON]: {
    params: null,
    description: "Actor is immune to poison effects"
  },

  /**
   * IMMUNE_MIND_AFFECTING
   * No parameters.
   * Queried as: context.hasRule(RULES.IMMUNE_MIND_AFFECTING)
   */
  [RULES.IMMUNE_MIND_AFFECTING]: {
    params: null,
    description: "Actor is immune to mind-affecting effects"
  },

  /**
   * IGNORE_COVER
   * No parameters.
   * Queried as: context.hasRule(RULES.IGNORE_COVER)
   * Used by: getCoverBonus() during defense calculation
   */
  [RULES.IGNORE_COVER]: {
    params: null,
    description: "Attacker ignores cover defense bonuses"
  },

  /**
   * CANNOT_BE_FLANKED
   * No parameters.
   * Queried as: context.hasRule(RULES.CANNOT_BE_FLANKED)
   * Used by: getFlankingBonus() during attack resolution
   */
  [RULES.CANNOT_BE_FLANKED]: {
    params: null,
    description: "Defender cannot be flanked (no flanking bonus applies)"
  },

  /**
   * TREAT_SKILL_AS_TRAINED
   * REQUIRED params: { skillId: string }
   * Queried as: context.hasRule(RULES.TREAT_SKILL_AS_TRAINED, { skillId })
   * Used by: Skill resolution to check trained requirements
   *
   * Example:
   * { type: "RULE", rule: "TREAT_SKILL_AS_TRAINED", params: { skillId: "useTheForce" } }
   */
  [RULES.TREAT_SKILL_AS_TRAINED]: {
    params: {
      skillId: "string" // Required field, must be string
    },
    description: "Actor treats a specific skill as trained",
    required: ["skillId"]
  }
});

/**
 * Validate rule definition exists.
 * @param {string} ruleType
 * @returns {boolean}
 */
export function hasRuleDefinition(ruleType) {
  return RULE_DEFINITIONS[ruleType] !== undefined;
}

/**
 * Get definition for a rule type.
 * @param {string} ruleType
 * @returns {Object|null}
 */
export function getRuleDefinition(ruleType) {
  return RULE_DEFINITIONS[ruleType] || null;
}

/**
 * Get all rule definitions as object.
 */
export function getAllRuleDefinitions() {
  return RULE_DEFINITIONS;
}

export default RULE_DEFINITIONS;
