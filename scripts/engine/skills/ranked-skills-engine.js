/**
 * RANKED SKILLS ENGINE
 *
 * Core logic for ranked-skills mode under 3.5-style progression.
 *
 * Handles:
 * - Skill point grants (level 1 x4, later levels normal)
 * - Rank cost calculation (class-skill vs cross-class)
 * - Rank cap enforcement
 * - Trained derivation from ranks
 *
 * All calculations are deterministic and reuse existing infrastructure.
 */

import { ClassesDB } from "/systems/foundryvtt-swse/scripts/data/classes-db.js";
import { SkillRules } from "/systems/foundryvtt-swse/scripts/engine/skills/SkillRules.js";
import { isSkillClassEligibleForLevel, resolvePrestigeSkillSourceClass } from "/systems/foundryvtt-swse/scripts/engine/skills/skill-resolution-layer.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

/**
 * Calculate skill point grant for a given level/class combination in ranked mode.
 *
 * @param {number} level - Character level (1-based)
 * @param {number} intMod - Intelligence modifier
 * @param {string} classId - Class being taken at this level
 * @returns {number} - Skill points granted
 */
export function calculateSkillPointGrant(level, intMod, classId) {
  if (!classId || level < 1) {
    return 0;
  }

  const classDef = ClassesDB.get(classId);
  if (!classDef) {
    return 0;
  }

  // Determine effective class (for prestige classes, use inherited core class)
  let effectiveClassId = classId;
  if (!classDef.baseClass) {
    // This is a prestige class; get the effective core class
    // For point grant, we use the same inheritance logic as class skills
    const coreClassName = resolvePrestigeSkillSourceClass(null, classId);
    if (coreClassName) {
      const coreClass = ClassesDB.byName(coreClassName);
      if (coreClass) {
        effectiveClassId = coreClass.id;
      }
    }
  }

  // Get effective class definition
  const effectiveClassDef = ClassesDB.get(effectiveClassId);
  if (!effectiveClassDef) {
    return 0;
  }

  // Get base skill points for this class
  const baseSkillPoints = effectiveClassDef.trainedSkills || 0;

  // Level 1 uses x4 multiplier; later levels use normal grant
  if (level === 1) {
    return (baseSkillPoints + intMod) * 4;
  } else {
    return baseSkillPoints + intMod;
  }
}

/**
 * Calculate the cost (in skill points) to buy one rank of a skill.
 *
 * @param {Actor} actor - The actor
 * @param {string} skillKey - Canonicalized skill key
 * @param {string} classId - Class being taken at this level
 * @returns {number} - Cost in skill points (1 for class, 2 for cross-class)
 */
export function getSkillRankCost(actor, skillKey, classId) {
  if (!actor || !skillKey || !classId) {
    return 0;
  }

  const eligibility = isSkillClassEligibleForLevel(actor, skillKey, classId);
  if (eligibility.isClassSkill) {
    return 1; // Class skill costs 1 point per rank
  } else {
    return 2; // Cross-class costs 2 points per rank
  }
}

/**
 * Get the maximum ranks allowed for a skill at a given level.
 *
 * @param {Actor} actor - The actor
 * @param {string} skillKey - Canonicalized skill key
 * @param {string} classId - Class being taken at this level
 * @param {number} heroicLevel - Current heroic level (for cap calculation)
 * @returns {number} - Maximum rank allowed
 */
export function getSkillRankCap(actor, skillKey, classId, heroicLevel) {
  if (!actor || !skillKey || !classId || heroicLevel < 1) {
    return 0;
  }

  const eligibility = isSkillClassEligibleForLevel(actor, skillKey, classId);

  if (eligibility.isClassSkill) {
    // Class skill cap: 3 + heroic level
    return 3 + heroicLevel;
  } else {
    // Cross-class cap: floor((3 + heroic level) / 2)
    return Math.floor((3 + heroicLevel) / 2);
  }
}

/**
 * Check if a skill can be trained (ranked) with the given points.
 *
 * @param {Actor} actor - The actor
 * @param {string} skillKey - Canonicalized skill key
 * @param {string} classId - Class being taken at this level
 * @param {number} pointsAvailable - Available skill points at this level
 * @param {number} heroicLevel - Current heroic level
 * @returns {Object} - {
 *   canTrain: boolean,
 *   currentRanks: number,
 *   maxRanks: number,
 *   cost: number,
 *   reason: string (if cannot train)
 * }
 */
export function canTrainSkill(actor, skillKey, classId, pointsAvailable, heroicLevel) {
  if (!actor || !skillKey || !classId) {
    return {
      canTrain: false,
      currentRanks: 0,
      maxRanks: 0,
      cost: 0,
      reason: 'Missing required parameters'
    };
  }

  const currentRanks = (actor.system.skills?.[skillKey]?.ranks) || 0;
  const maxRanks = getSkillRankCap(actor, skillKey, classId, heroicLevel);
  const cost = getSkillRankCost(actor, skillKey, classId);

  if (currentRanks >= maxRanks) {
    return {
      canTrain: false,
      currentRanks,
      maxRanks,
      cost,
      reason: `At rank cap (${currentRanks}/${maxRanks})`
    };
  }

  if (cost > pointsAvailable) {
    return {
      canTrain: false,
      currentRanks,
      maxRanks,
      cost,
      reason: `Insufficient points (need ${cost}, have ${pointsAvailable})`
    };
  }

  return {
    canTrain: true,
    currentRanks,
    maxRanks,
    cost,
    reason: null
  };
}

/**
 * Add a rank to a skill, deducting the cost from available points.
 * Returns the new rank count and remaining points.
 *
 * @param {Actor} actor - The actor
 * @param {string} skillKey - Canonicalized skill key
 * @param {string} classId - Class being taken at this level
 * @param {number} pointsAvailable - Available points (decremented by cost)
 * @param {number} heroicLevel - Current heroic level (for cap checking)
 * @returns {Object|null} - { newRanks: number, pointsRemaining: number } or null if cannot train
 */
export function addRank(actor, skillKey, classId, pointsAvailable, heroicLevel) {
  const check = canTrainSkill(actor, skillKey, classId, pointsAvailable, heroicLevel);
  if (!check.canTrain) {
    return null;
  }

  const newRanks = check.currentRanks + 1;
  const pointsRemaining = pointsAvailable - check.cost;

  return {
    newRanks,
    pointsRemaining
  };
}

/**
 * Derive trained status from ranks in ranked mode.
 * A skill is trained if it has at least 1 rank.
 *
 * @param {number} ranks - Current rank count
 * @returns {boolean} - True if ranks >= 1
 */
export function deriveTrainedFromRanks(ranks) {
  return (ranks || 0) >= 1;
}

/**
 * Check if ranked mode is enabled.
 *
 * @returns {boolean} - True if skillProgressionMode = ranked_35_style
 */
export function isRankedModeEnabled() {
  const progressionMode = SkillRules.getSkillProgressionMode();
  return progressionMode === 'ranked_35_style';
}
