/**
 * SWSE Prestige Class Readiness Evaluator
 * Checks if a character meets prerequisites for prestige classes
 */

import { swseLogger } from '../../../../utils/logger.js';

/**
 * Evaluate prestige class readiness for all prestige classes
 * @param {Actor} actor - The actor to check
 * @param {Object} prestigeData - Prestige class data with prerequisites
 * @returns {Object} - Map of prestige class names to readiness status
 */
export function evaluatePrestigeReadiness(actor, prestigeData) {
  const results = {};

  if (!prestigeData) {
    swseLogger.warn('Prestige readiness: No prestige data provided');
    return results;
  }

  for (const cls in prestigeData) {
    const prereq = prestigeData[cls].description;

    try {
      // Use the prerequisite validator if available
      const check = checkClassPrerequisites(
        { system: { prerequisites: prereq } },
        actor,
        {}
      );

      results[cls] = {
        ready: check.valid,
        missing: check.reasons || []
      };
    } catch (err) {
      swseLogger.warn(`Failed to check prerequisites for ${cls}:`, err);
      results[cls] = {
        ready: false,
        missing: ['Error checking prerequisites']
      };
    }
  }

  return results;
}

/**
 * Check if actor meets class prerequisites
 * @param {Object} classData - Class data with prerequisites
 * @param {Actor} actor - Actor to check
 * @param {Object} options - Additional options
 * @returns {Object} - Validation result with valid flag and reasons
 */
function checkClassPrerequisites(classData, actor, options = {}) {
  const prereqs = classData?.system?.prerequisites;
  const reasons = [];

  if (!prereqs) {
    return { valid: true, reasons: [] };
  }

  // FIX: Use actual actor data structures, not progression.classLevels
  const classItems = actor.items.filter(i => i.type === 'class');

  // Check BAB prerequisite
  if (prereqs.bab !== undefined) {
    const currentBAB = calculateActorBAB(actor);
    if (currentBAB < prereqs.bab) {
      reasons.push(`BAB +${prereqs.bab} required (current: +${currentBAB})`);
    }
  }

  // Check trained skills prerequisite
  if (prereqs.trainedSkills && Array.isArray(prereqs.trainedSkills)) {
    const trainedSkills = actor.items
      .filter(i => i.type === 'skill' && i.system.trained)
      .map(s => s.name);
    const missingSkills = prereqs.trainedSkills.filter(s => !trainedSkills.includes(s));
    if (missingSkills.length > 0) {
      reasons.push(`Missing trained skills: ${missingSkills.join(', ')}`);
    }
  }

  // Check required feats prerequisite
  if (prereqs.feats && Array.isArray(prereqs.feats)) {
    const allFeats = actor.items
      .filter(i => i.type === 'feat')
      .map(f => f.name);
    const missingFeats = prereqs.feats.filter(f =>
      !allFeats.some(pf => pf.toLowerCase() === f.toLowerCase())
    );
    if (missingFeats.length > 0) {
      reasons.push(`Missing feats: ${missingFeats.join(', ')}`);
    }
  }

  // Check force sensitivity prerequisite
  if (prereqs.forceSensitive === true) {
    const hasForceSensitivity = actor.items.some(i =>
      i.type === 'feat' && i.name.toLowerCase().includes('force sensitivity')
    );

    const isForceSensitiveClass = classItems.some(cl => {
      return cl.name === 'Jedi' || cl.name === 'Sith' || cl.system.forceSensitive === true;
    });

    if (!hasForceSensitivity && !isForceSensitiveClass) {
      reasons.push('Force Sensitivity required');
    }
  }

  // Check level prerequisite - FIX: Use actor.system.level, not classLevels.length
  if (prereqs.level !== undefined) {
    const currentLevel = actor.system.level || 0;
    if (currentLevel < prereqs.level) {
      reasons.push(`Character level ${prereqs.level} required (current: ${currentLevel})`);
    }
  }

  return {
    valid: reasons.length === 0,
    reasons: reasons
  };
}

/**
 * Calculate actor's total BAB
 * @param {Actor} actor - The actor
 * @returns {number} - Total BAB
 */
function calculateActorBAB(actor) {
  // FIX: Use actual class items instead of non-existent classLevels array
  const classItems = actor.items.filter(i => i.type === 'class');
  let totalBAB = 0;

  for (const classItem of classItems) {
    const classLevel = classItem.system.level || 1;
    const className = classItem.name;

    // Get BAB from class level progression if available
    const levelProgression = classItem.system.levelProgression || [];
    const levelData = levelProgression.find(lp => lp.level === classLevel);

    if (levelData && typeof levelData.bab === 'number') {
      totalBAB += levelData.bab;
    } else {
      // Fallback: Calculate from BAB progression
      const babProgression = classItem.system.babProgression || 'medium';
      const fullBABClasses = ['Jedi', 'Soldier'];

      if (fullBABClasses.includes(className)) {
        // Full BAB progression: +1 per level
        totalBAB += classLevel;
      } else {
        // 3/4 BAB progression
        totalBAB += Math.floor(classLevel * 0.75);
      }
    }
  }

  return totalBAB;
}

/**
 * Get summary of prestige classes the actor is ready for
 * @param {Object} readiness - Readiness results from evaluatePrestigeReadiness
 * @returns {string[]} - Array of prestige class names actor is ready for
 */
export function getReadyPrestigeClasses(readiness) {
  return Object.keys(readiness).filter(cls => readiness[cls].ready);
}

/**
 * Get summary of prestige classes the actor is NOT ready for
 * @param {Object} readiness - Readiness results from evaluatePrestigeReadiness
 * @returns {Object} - Map of prestige class names to missing prerequisites
 */
export function getUnreadyPrestigeClasses(readiness) {
  const unready = {};
  for (const cls in readiness) {
    if (!readiness[cls].ready) {
      unready[cls] = readiness[cls].missing;
    }
  }
  return unready;
}
