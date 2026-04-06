/**
 * SKILLS MECHANICS RESOLVER
 *
 * Centralized single source of truth for skill mechanics:
 * - Armor Check Penalty applicability
 * - Trained-Only requirement
 * - Other Uses (special applications)
 *
 * Purpose: Prevent scattered per-template logic and ensure consistency
 * across all skill references in the progression framework.
 *
 * This resolver is the ONLY place where these mechanics are defined.
 */

// ============================================================================
// ARMOR CHECK PENALTY MAPPING
// ============================================================================

/**
 * Skills that are affected by armor check penalty.
 * Canonical source: SWSE core rules.
 * Return true if the skill is penalized by armor worn.
 */
const ARMOR_CHECK_PENALTY_SKILLS = new Set([
  'acrobatics',
  'climb',
  'jump',
  'stealth',
  'swim',
]);

/**
 * Check if a skill is affected by armor check penalty
 * @param {string} skillKey - The skill key (e.g., 'acrobatics', 'climb')
 * @returns {boolean} True if this skill is penalized by armor
 */
export function isAffectedByArmorCheckPenalty(skillKey) {
  return ARMOR_CHECK_PENALTY_SKILLS.has(skillKey?.toLowerCase());
}

/**
 * Get label text for armor check penalty applicability
 * @param {string} skillKey - The skill key
 * @returns {string} "Applies" or "Does Not Apply"
 */
export function getArmorCheckPenaltyLabel(skillKey) {
  return isAffectedByArmorCheckPenalty(skillKey)
    ? 'Applies'
    : 'Does Not Apply';
}

// ============================================================================
// TRAINED-ONLY REQUIREMENT
// ============================================================================

/**
 * Check if a skill is trained-only
 * @param {Object} skillData - Skill data from registry (has 'trained' field)
 * @returns {boolean} True if this skill 
 */
export function isTrainedOnlySkill(skillData) {
  return skillData?.trained === true;
}

/**
 * Get consistent label text for training requirement
 * @param {Object} skillData - Skill data object
 * @returns {string} "Trained Only" or "Usable Untrained"
 */
export function getTrainingRequirementLabel(skillData) {
  return isTrainedOnlySkill(skillData)
    ? 'Trained Only'
    : 'Usable Untrained';
}

// ============================================================================
// OTHER USES RESOLUTION
// ============================================================================

/**
 * Normalize other uses for a skill
 * Reads from extraskilluses.json and filters/shapes per skill
 *
 * @param {string} skillKey - The skill key
 * @param {Array} extraskillUsesData - Raw data from extraskilluses.json
 * @returns {Array|null} Array of use descriptions, or null if none
 */
export function getNormalizedOtherUses(skillKey, extraskillUsesData) {
  if (!Array.isArray(extraskillUsesData) || extraskillUsesData.length === 0) {
    return null;
  }

  // For now, return as-is; could add skill-specific filtering if needed
  // This is the single place where other uses are normalized
  const uses = extraskillUsesData.map(use => ({
    application: use.application,
    dc: use.DC,
    time: use.time,
    effect: use.effect,
  }));

  return uses.length > 0 ? uses : null;
}

/**
 * Get summary text of other uses (for brief display)
 * @param {Array} otherUses - Normalized other uses array
 * @returns {string|null} Summary like "5 applications" or null
 */
export function getOtherUsesSummary(otherUses) {
  if (!Array.isArray(otherUses) || otherUses.length === 0) {
    return null;
  }

  const count = otherUses.length;
  return count === 1 ? '1 application' : `${count} applications`;
}

// ============================================================================
// EXPORTS
// ============================================================================

export const SkillsMechanicsResolver = {
  isAffectedByArmorCheckPenalty,
  getArmorCheckPenaltyLabel,
  isTrainedOnlySkill,
  getTrainingRequirementLabel,
  getNormalizedOtherUses,
  getOtherUsesSummary,
};
