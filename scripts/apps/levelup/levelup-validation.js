/**
 * Validation logic for SWSE Level Up system
 * Handles prerequisite checking for classes, talents, and feats
 */

import { PrerequisiteChecker } from "/systems/foundryvtt-swse/scripts/data/prerequisite-checker.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { isBaseClass } from "/systems/foundryvtt-swse/scripts/apps/levelup/levelup-shared.js";
import { evaluateClassEligibility } from "/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/class-prerequisites-cache.js";

// Cache for prestige class prerequisites loaded from JSON
let _prestigePrereqCache = null;

/**
 * Load prestige class prerequisites from JSON configuration
 * @returns {Promise<Object>} - Prerequisites object
 */
async function loadPrestigeClassPrerequisites() {
  if (_prestigePrereqCache) {
    return _prestigePrereqCache;
  }

  try {
    const response = await fetch('systems/foundryvtt-swse/data/prestige-class-prerequisites.json');
    if (!response.ok) {
      throw new Error(`Failed to load prerequisites: ${response.status} ${response.statusText}`);
    }
    _prestigePrereqCache = await response.json();
    SWSELogger.log('SWSE LevelUp | Loaded prestige class prerequisites from JSON');
    return _prestigePrereqCache;
  } catch (err) {
    SWSELogger.error('SWSE LevelUp | Failed to load prestige class prerequisites:', err);
    ui.notifications.warn('Failed to load prestige class prerequisites. Some classes may not validate correctly.');
    _prestigePrereqCache = {};
    return _prestigePrereqCache;
  }
}

/**
 * Get prerequisites for a prestige class
 * @param {string} className - Name of the prestige class
 * @returns {Promise<string|null>} - Prerequisite string or null
 */
export async function getPrestigeClassPrerequisites(className) {
  const prerequisites = await loadPrestigeClassPrerequisites();
  const classPrereqs = prerequisites[className];

  if (!classPrereqs) {
    return null;
  }

  // Return the description field which contains the formatted prerequisite string
  return classPrereqs.description || null;
}

/**
 * Check if character meets prerequisites for a class
 * @param {Object} classDoc - The class document
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections (feats, skills, etc.)
 * @returns {Promise<boolean>}
 */
export async function meetsClassPrerequisites(classDoc, actor, pendingData) {
  // Base classes have no prerequisites
  if (isBaseClass(classDoc)) {return true;}

  // Load prerequisites for prestige classes from JSON configuration
  const prestigePrerequisites = await getPrestigeClassPrerequisites(classDoc.name);

  // If we have prerequisites from JSON, use those
  if (prestigePrerequisites) {
    const classDocWithPrereqs = { system: { prerequisites: prestigePrerequisites } };
    const result = PrerequisiteChecker.checkClassLevelPrerequisites(actor, classDocWithPrereqs, pendingData);
    return result.met;
  }

  // Fall back to checking classDoc prerequisites
  const result = PrerequisiteChecker.checkClassLevelPrerequisites(actor, classDoc, pendingData);
  return result.met;
}

/**
 * Get detailed class eligibility information.
 *
 * NORMALIZATION ARCHITECTURE:
 * This function returns eligibility + missing prerequisites.
 * The suggestion engine uses this to provide specific guidance.
 *
 * Example output:
 * {
 *   eligible: false,
 *   className: "Bounty Hunter",
 *   isPrestige: true,
 *   reasons: {
 *     missing: [
 *       "Minimum level 7 (you are level 5)",
 *       "Trained in: Survival",
 *       "At least 2 from Awareness talent tree"
 *     ],
 *     met: []
 *   }
 * }
 *
 * Used by suggestion engine to build specific mentor advice like:
 * "You're close — reach level 7 and train the Survival skill."
 *
 * @param {string} className - Class name to evaluate
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections
 * @returns {Object} - Eligibility result with detailed reasons
 */
export function getClassEligibilityDetails(className, actor, pendingData = {}) {
  return evaluateClassEligibility({
    className,
    actor,
    pendingData
  });
}

/**
 * Check if character meets prerequisites for a talent
 * @param {Object} talent - The talent document
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections (feats, talents, etc.)
 * @returns {{valid: boolean, reasons: string[]}}
 */
export function checkTalentPrerequisites(talent, actor, pendingData) {
  const result = PrerequisiteChecker.checkTalentPrerequisites(actor, talent, pendingData);
  // Return in legacy format for backward compatibility with callers
  return {
    valid: result.met,
    reasons: result.missing
  };
}

/**
 * Filter feats based on prerequisites
 * @param {Array} feats - Array of feat documents
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections
 * @returns {Array} Filtered feats with isQualified flag
 */
export function filterQualifiedFeats(feats, actor, pendingData) {
  return PrerequisiteChecker.filterQualifiedFeats(feats, actor, pendingData);
}
