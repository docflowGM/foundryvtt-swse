/**
 * Skill point allocation for SWSE Level Up system
 * Handles multiclass bonus skill selection and skill training
 * Supports both standard mode (trained boolean) and ranked mode (rank spending)
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { calculateSkillPointGrant, isRankedModeEnabled, addRank } from "/systems/foundryvtt-swse/scripts/engine/skills/ranked-skills-engine.js";
import { ClassesDB } from "/systems/foundryvtt-swse/scripts/data/classes-db.js";

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
  SWSELogger.log(`[LEVELUP-SKILLS] selectMulticlassSkill: Selected skill: "${skillKey}" (${skillName || skillKey})`);
  return skill;
}

/**
 * Apply trained skills to actor
 * @param {Actor} actor - The actor
 * @param {Array} selectedSkills - Array of skill objects {key, name} or skill key strings
 */
export async function applyTrainedSkills(actor, selectedSkills) {
  SWSELogger.log(`[LEVELUP-SKILLS] applyTrainedSkills: START - Actor: ${actor.id} (${actor.name}), skills: ${selectedSkills ? selectedSkills.length : 0}`);

  if (!selectedSkills || selectedSkills.length === 0) {
    SWSELogger.log(`[LEVELUP-SKILLS] applyTrainedSkills: No skills to apply, returning early`);
    return;
  }

  const updates = {};
  const skillsApplied = [];
  selectedSkills.forEach(skill => {
    // Support both object format {key, name} and string format (backward compatibility)
    const skillKey = typeof skill === 'string' ? skill : skill.key;
    const skillName = typeof skill === 'string' ? skill : skill.name;
    updates[`system.skills.${skillKey}.trained`] = true;
    skillsApplied.push(`${skillKey} (${skillName})`);
    SWSELogger.log(`[LEVELUP-SKILLS] applyTrainedSkills: Adding skill "${skillKey}" to updates`);
  });

  try {
    await globalThis.SWSE.ActorEngine.updateActor(actor, updates);
    SWSELogger.log(`[LEVELUP-SKILLS] applyTrainedSkills: COMPLETE - Applied ${skillsApplied.length} skills:`, skillsApplied);
  } catch (err) {
    SWSELogger.error(`[LEVELUP-SKILLS] ERROR applying trained skills:`, err);
    throw err;
  }
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
  SWSELogger.log(`[LEVELUP-SKILLS] checkIntModifierIncrease: Actor: ${actor.id} (${actor.name}), old INT mod: ${oldIntMod}, new INT mod: ${newIntMod}, level: ${newLevel}`);

  if (newIntMod > oldIntMod) {
    const increase = newIntMod - oldIntMod;
    SWSELogger.log(`[LEVELUP-SKILLS] checkIntModifierIncrease: INT modifier increased by ${increase} - granting bonus skill(s)`);
    ui.notifications.info('Intelligence increased! You may train an additional skill.');
    return true;
  }

  SWSELogger.log(`[LEVELUP-SKILLS] checkIntModifierIncrease: No INT modifier increase detected`);
  return false;
}

/**
 * Calculate skill points granted for a level-up under ranked mode
 * @param {Actor} actor - The actor
 * @param {string} classId - Class being taken at this level
 * @param {number} intMod - Intelligence modifier
 * @returns {number} Skill points granted for this level
 */
export function calculateRankedModeSkillPoints(actor, classId, intMod) {
  if (!isRankedModeEnabled() || !actor || !classId) {
    return 0;
  }

  // Get current level (heroic level for point grant calculation)
  const currentLevel = actor.system?.level || 1;

  // calculateSkillPointGrant handles prestige class inheritance
  return calculateSkillPointGrant(currentLevel + 1, intMod, classId);
}

/**
 * Apply ranked skill ranks to actor
 * @param {Actor} actor - The actor
 * @param {Object} rankAllocations - Object mapping skillKey -> newRankCount
 * @returns {Promise<void>}
 */
export async function applyRankedSkills(actor, rankAllocations) {
  if (!rankAllocations || Object.keys(rankAllocations).length === 0) {
    SWSELogger.log(`[LEVELUP-SKILLS] applyRankedSkills: No ranks to apply`);
    return;
  }

  SWSELogger.log(`[LEVELUP-SKILLS] applyRankedSkills: START - Actor: ${actor.id}, allocations:`, rankAllocations);

  const updates = {};
  for (const [skillKey, newRanks] of Object.entries(rankAllocations)) {
    updates[`system.skills.${skillKey}.ranks`] = newRanks;
  }

  try {
    await globalThis.SWSE.ActorEngine.updateActor(actor, updates);
    SWSELogger.log(`[LEVELUP-SKILLS] applyRankedSkills: COMPLETE - Applied ${Object.keys(rankAllocations).length} skill ranks`);
  } catch (err) {
    SWSELogger.error(`[LEVELUP-SKILLS] ERROR applying ranked skills:`, err);
    throw err;
  }
}
