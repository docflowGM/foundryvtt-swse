/**
 * SkillEnforcementEngine — Trained-Only & Roll Restrictions
 *
 * Handles:
 * - Trained-only skill enforcement
 * - Roll permission checking
 * - Untrained penalty calculations
 *
 * Pure functions. No side effects.
 */

export class SkillEnforcementEngine {
  /**
   * Check if skill can be rolled
   * @param {Object} skill - Skill object with trained, trainedOnly flags
   * @param {boolean} isTrained - Whether character is trained in this skill
   * @returns {Object} Permission result {allowed, reason, penalty}
   */
  static canRollSkill(skill, isTrained) {
    if (!skill) {
      return { allowed: false, reason: 'Skill not found', penalty: 0 };
    }

    const trainedOnly = skill.trainedOnly === true;

    if (trainedOnly && !isTrained) {
      return {
        allowed: false,
        reason: 'This skill requires training',
        penalty: 0,
        trainedOnly: true
      };
    }

    return { allowed: true, reason: 'Roll allowed', penalty: 0 };
  }

  /**
   * Get skill permission tooltip text
   * @param {Object} skill - Skill object
   * @param {boolean} isTrained - Whether trained
   * @returns {string} Tooltip text
   */
  static getSkillTooltip(skill, isTrained) {
    if (!skill?.trainedOnly) {
      return 'Click to roll';
    }

    if (isTrained) {
      return 'Trained — Click to roll';
    }

    return 'Requires training — cannot roll untrained';
  }

  /**
   * Determine untrained penalty
   * In SWSE, most skills can be rolled untrained with no penalty,
   * but some skills (especially Knowledge skills) may have restrictions
   * @param {string} skillKey - Skill key
   * @param {Object} skill - Skill object
   * @returns {number} Penalty to apply (usually 0 unless trainedOnly)
   */
  static getUntrainedPenalty(skillKey, skill) {
    if (skill?.trainedOnly === true) {
      return -999; // Cannot roll
    }

    // By default, no untrained penalty in SWSE
    return 0;
  }

  /**
   * Get disabled state for skill rolling
   * @param {boolean} isTrained - Whether trained
   * @param {boolean} trainedOnly - Whether skill requires training
   * @returns {boolean} True if should be disabled
   */
  static isSkillDisabled(isTrained, trainedOnly) {
    return trainedOnly && !isTrained;
  }
}
