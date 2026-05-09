/**
 * PASSIVE Phase 4 - RULE Subtype Type Definitions
 *
 * DEPRECATED: Use RULES from rule-enum.js instead.
 * This file exists for backwards compatibility during transition.
 * All new code should import RULES from rule-enum.js and use isValidRule() for validation.
 *
 * Whitelist of allowed rule types for PASSIVE/RULE abilities.
 * Rule types are declarative boolean capabilities that resolution logic queries.
 *
 * Each rule type:
 * - Is a resolution hint (not an action or mutation)
 * - Can have optional conditions
 * - Is stateless per prepare cycle
 * - Is queried by resolution systems, never directly injected
 *
 * PHASE 4 SCOPE: Minimal set to validate pattern
 * - IGNORE_COVER: Attacker ignores cover penalties
 * - CANNOT_BE_FLANKED: Defender cannot be flanked
 * - TREAT_SKILL_AS_TRAINED: Actor treats a skill as trained
 */

export const RULE_TYPES = {
  /**
   * IGNORE_COVER
   * Attacker ignores cover defense bonuses.
   * Queried by: CoverResolver
   * Example: Darkvision, True Sight
   */
  IGNORE_COVER: 'IGNORE_COVER',

  /**
   * CANNOT_BE_FLANKED
   * Defender cannot be flanked (no flanking bonus to attacks).
   * Queried by: FlankResolver
   * Example: Heightened Awareness, Defensive Stance
   */
  CANNOT_BE_FLANKED: 'CANNOT_BE_FLANKED',

  /**
   * TREAT_SKILL_AS_TRAINED
   * Actor treats a specific skill as trained (even if untrained).
   * Queried by: SkillResolver
   * Example: Natural Talent, Savant
   *
   * Note: Requires additional context (which skill).
   * Schema: { type: "TREAT_SKILL_AS_TRAINED", skill: "knowledge" }
   */
  TREAT_SKILL_AS_TRAINED: 'TREAT_SKILL_AS_TRAINED'
,

  // ======================================================================
  // "Max enum now" additions (unconditional, boolean capability tokens)
  // These are safe to enumerate even if not all are queried by resolution yet.
  // ======================================================================

  /**
   * DARKVISION
   * Actor can see in darkness (rules query owned by vision/senses layer).
   */
  DARKVISION: 'DARKVISION',

  /**
   * LOW_LIGHT_VISION
   * Actor can see better in dim light.
   */
  LOW_LIGHT_VISION: 'LOW_LIGHT_VISION',

  /**
   * SCENT
   * Actor has scent ability.
   */
  SCENT: 'SCENT',

  /**
   * EXTEND_CRITICAL_RANGE
   * Extends weapon critical threat range by N for specific proficiency.
   * Queried by: Attack roll resolvers
   * Params: { proficiency: string, by: number }
   */
  EXTEND_CRITICAL_RANGE: 'EXTEND_CRITICAL_RANGE',

  /**
   * CRITICAL_DAMAGE_BONUS
   * Adds bonus damage when scoring a critical hit.
   * Queried by: Damage resolution (on confirmed critical)
   * Params: { proficiency: string, bonus: string|number }
   */
  CRITICAL_DAMAGE_BONUS: 'CRITICAL_DAMAGE_BONUS',

  /**
   * MODIFY_CRITICAL_MULTIPLIER
   * Changes critical hit damage multiplier (default ×2).
   * Queried by: Damage resolution (multiplier calculation)
   * Params: { proficiency: string, multiplier: number }
   */
  MODIFY_CRITICAL_MULTIPLIER: 'MODIFY_CRITICAL_MULTIPLIER',

  /**
   * CRITICAL_CONFIRM_BONUS
   * Adds bonus to critical confirmation rolls.
   * Queried by: Critical confirmation resolver
   * Params: { proficiency: string, bonus: number }
   */
  CRITICAL_CONFIRM_BONUS: 'CRITICAL_CONFIRM_BONUS',

  /**
   * WEAPON_SPECIALIZATION
   * Adds flat damage bonus for weapon specialization.
   * Queried by: Damage resolution (base damage calculation)
   * Params: { proficiency: string, bonus: number }
   */
  WEAPON_SPECIALIZATION: 'WEAPON_SPECIALIZATION',

  /**
   * UNARMED_DOES_NOT_PROVOKE_AOO
   * Actor's unarmed attacks do not provoke attacks of opportunity.
   */
  UNARMED_DOES_NOT_PROVOKE_AOO: 'UNARMED_DOES_NOT_PROVOKE_AOO',

  /**
   * UNARMED_DAMAGE_STEP
   * Increases unarmed attack damage by N die steps.
   * Params: { steps: number }
   */
  UNARMED_DAMAGE_STEP: 'UNARMED_DAMAGE_STEP'
};

/**
 * Validate that a rule type is in the whitelist.
 * Throws if unknown type.
 *
 * @param {string} ruleType - The rule type to validate
 * @throws {Error} If rule type not supported
 */
export function validateRuleType(ruleType) {
  const validTypes = Object.values(RULE_TYPES);
  if (!validTypes.includes(ruleType)) {
    throw new Error(
      `Unknown rule type: ${ruleType}. Supported types: ${validTypes.join(', ')}`
    );
  }
}

/**
 * Get all valid rule types as an array.
 * Useful for error messages and documentation.
 *
 * @returns {Array<string>} Array of valid rule type strings
 */
export function getValidRuleTypes() {
  return Object.values(RULE_TYPES);
}

export default RULE_TYPES;
