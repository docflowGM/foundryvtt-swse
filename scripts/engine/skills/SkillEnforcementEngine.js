// ============================================
// FILE: scripts/engine/skills/SkillEnforcementEngine.js
// Skill enforcement: trained-only restrictions
// ============================================

/**
 * Enforcement layer for skill check permissions.
 * Validates whether an actor can roll a skill based on training requirements.
 */
export class SkillEnforcementEngine {
  /**
   * Check if a skill can be rolled by the actor
   * @param {Object} skillDef - Skill definition from CONFIG.SWSE.skills
   * @param {boolean} isTrained - Whether actor has training in the skill
   * @returns {Object} { allowed: boolean, reason: string }
   */
  static canRollSkill(skillDef, isTrained) {
    // If skill requires training and actor isn't trained
    if (skillDef.trainedOnly && !isTrained) {
      return {
        allowed: false,
        reason: `${skillDef.label || "This skill"} requires training to use`
      };
    }

    return {
      allowed: true,
      reason: ""
    };
  }
}
