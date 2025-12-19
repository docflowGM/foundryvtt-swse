/**
 * SWSE Prestige Class Readiness Evaluator
 * Checks if a character meets prerequisites for prestige classes
 */

import { swseLogger } from '../../../utils/logger.js';

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
  const valid = true;
  const reasons = [];

  if (!prereqs) {
    return { valid: true, reasons: [] };
  }

  const progression = actor.system.progression || {};
  const classLevels = progression.classLevels || [];

  // Check BAB prerequisite
  if (prereqs.bab !== undefined) {
    const currentBAB = calculateActorBAB(classLevels);
    if (currentBAB < prereqs.bab) {
      reasons.push(`BAB +${prereqs.bab} required (current: +${currentBAB})`);
    }
  }

  // Check trained skills prerequisite
  if (prereqs.trainedSkills && Array.isArray(prereqs.trainedSkills)) {
    const trainedSkills = progression.trainedSkills || [];
    const missingSkills = prereqs.trainedSkills.filter(s => !trainedSkills.includes(s));
    if (missingSkills.length > 0) {
      reasons.push(`Missing trained skills: ${missingSkills.join(', ')}`);
    }
  }

  // Check required feats prerequisite
  if (prereqs.feats && Array.isArray(prereqs.feats)) {
    const allFeats = [...(progression.feats || []), ...(progression.startingFeats || [])];
    const missingFeats = prereqs.feats.filter(f =>
      !allFeats.some(pf => pf.toLowerCase() === f.toLowerCase())
    );
    if (missingFeats.length > 0) {
      reasons.push(`Missing feats: ${missingFeats.join(', ')}`);
    }
  }

  // Check force sensitivity prerequisite
  if (prereqs.forceSensitive === true) {
    const hasForceSensitivity = (progression.startingFeats || []).some(f =>
      f.toLowerCase().includes('force sensitivity')
    );

    const isForceSensitiveClass = classLevels.some(cl => {
      // This would need access to class data to determine if class is force-sensitive
      return cl.class === 'Jedi' || cl.class === 'Sith'; // Simplified check
    });

    if (!hasForceSensitivity && !isForceSensitiveClass) {
      reasons.push('Force Sensitivity required');
    }
  }

  // Check level prerequisite
  if (prereqs.level !== undefined) {
    const currentLevel = classLevels.length;
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
 * @param {Array} classLevels - Array of class level objects
 * @returns {number} - Total BAB
 */
function calculateActorBAB(classLevels) {
  // This is a simplified calculation
  // In reality, would need to sum BAB from all class levels
  // based on each class's BAB progression
  return classLevels.length; // Simplified: assume +1 BAB per level
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
