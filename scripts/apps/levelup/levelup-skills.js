/**
 * Skill point allocation for SWSE Level Up system
 * Handles multiclass bonus skill selection and skill training
 */

import { SWSELogger } from '../../utils/logger.js';

/**
 * Select a multiclass bonus skill
 * @param {string} skillKey - The skill key (e.g., "perception", "useTheForce")
 * @param {string} skillName - The skill display name (optional, defaults to skillKey)
 * @returns {Object} Object with key and name properties
 */
export function selectMulticlassSkill(skillKey, skillName = null) {
  const skill = {
    key: skillKey,
    name: skillName || skillKey
  };
  SWSELogger.log(`SWSE LevelUp | Selected multiclass skill:`, skill);
  return skill;
}

/**
 * Apply trained skills to actor
 * @param {Actor} actor - The actor
 * @param {Array} selectedSkills - Array of skill objects {key, name} or skill key strings
 */
export async function applyTrainedSkills(actor, selectedSkills) {
  if (!selectedSkills || selectedSkills.length === 0) return;

  const updates = {};
  selectedSkills.forEach(skill => {
    // Support both object format {key, name} and string format (backward compatibility)
    const skillKey = typeof skill === 'string' ? skill : skill.key;
    updates[`system.skills.${skillKey}.trained`] = true;
  });

  await actor.update(updates);
  SWSELogger.log(`SWSE LevelUp | Applied trained skills:`, selectedSkills);
}

/**
 * Check if INT modifier increased and grant bonus skill if applicable
 * @param {Actor} actor - The actor
 * @param {number} oldIntMod - Previous INT modifier
 * @param {number} newIntMod - New INT modifier
 * @param {number} newLevel - New character level
 * @returns {boolean} True if bonus skill was granted
 */
export function checkIntModifierIncrease(actor, oldIntMod, newIntMod, newLevel) {
  if (newIntMod > oldIntMod) {
    SWSELogger.log(`SWSE LevelUp | INT modifier increased from ${oldIntMod} to ${newIntMod} - granting bonus skill`);
    ui.notifications.info("Intelligence increased! You may train an additional skill.");
    return true;
  }
  return false;
}
