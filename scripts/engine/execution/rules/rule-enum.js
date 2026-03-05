/**
 * PASSIVE RULE Type Enum
 *
 * Authoritative, frozen list of all allowed rule types.
 * RULE types are boolean capability tokens - not numeric, not duration-based.
 *
 * CRITICAL: This enum is frozen. No runtime mutation.
 * To add new rules: modify this enum explicitly, update RULE_DEFINITIONS,
 * update validator, update rule-types.js for backward compatibility.
 */

export const RULES = Object.freeze({
  // --- Defense Immunities ---
  /**
   * IMMUNE_FEAR
   * Actor is immune to fear effects.
   * Params: none
   */
  IMMUNE_FEAR: "IMMUNE_FEAR",

  /**
   * IMMUNE_POISON
   * Actor is immune to poison effects.
   * Params: none
   */
  IMMUNE_POISON: "IMMUNE_POISON",

  /**
   * IMMUNE_MIND_AFFECTING
   * Actor is immune to mind-affecting effects.
   * Params: none
   */
  IMMUNE_MIND_AFFECTING: "IMMUNE_MIND_AFFECTING",

  // --- Combat Resolution Modifiers ---
  /**
   * IGNORE_COVER
   * Attacker ignores cover defense bonuses.
   * Params: none
   */
  IGNORE_COVER: "IGNORE_COVER",

  /**
   * CANNOT_BE_FLANKED
   * Defender cannot be flanked (no flanking bonus applies).
   * Params: none
   */
  CANNOT_BE_FLANKED: "CANNOT_BE_FLANKED",

  // --- Skill Resolution ---
  /**
   * TREAT_SKILL_AS_TRAINED
   * Actor treats a specific skill as trained.
   * Params: required { skillId: string }
   */
  TREAT_SKILL_AS_TRAINED: "TREAT_SKILL_AS_TRAINED",
});

/**
 * Get all valid rule identifiers as array.
 * Useful for validation and error messages.
 */
export function getValidRules() {
  return Object.values(RULES);
}

/**
 * Check if a rule type is valid.
 */
export function isValidRule(ruleType) {
  return Object.values(RULES).includes(ruleType);
}

export default RULES;
