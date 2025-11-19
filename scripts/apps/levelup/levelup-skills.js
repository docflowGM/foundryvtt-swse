/**
 * Skill point allocation for SWSE Level Up system
 * Handles multiclass bonus skill selection and skill training
 */

import { SWSELogger } from '../../utils/logger.js';

/**
 * Select a multiclass bonus skill
 * @param {string} skillName - The skill name
 * @returns {string} The selected skill name
 */
export function selectMulticlassSkill(skillName) {
  SWSELogger.log(`SWSE LevelUp | Selected multiclass skill: ${skillName}`);
  return skillName;
}

/**
 * Apply trained skills to actor
 * @param {Actor} actor - The actor
 * @param {Array} selectedSkills - Array of skill names to train
 */
export async function applyTrainedSkills(actor, selectedSkills) {
  if (!selectedSkills || selectedSkills.length === 0) return;

  const updates = {};
  selectedSkills.forEach(skill => {
    updates[`system.skills.${skill}.trained`] = true;
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
