/**
 * Validation logic for SWSE Level Up system
 * Handles prerequisite checking for classes, talents, and feats
 */

import { AbilityEngine } from '../../engine/abilities/AbilityEngine.js';
import { SWSELogger } from '../../utils/logger.js';
import { isBaseClass } from './levelup-shared.js';
import { evaluateClassEligibility } from '../../engines/progression/prerequisites/class-prerequisites-cache.js';
import { PrerequisiteChecker } from '../../data/prerequisite-checker.js';

/**
 * Get prestige class prerequisites from canonical source (PrerequisiteChecker).
 * Do NOT fetch JSON directly. Always use PrerequisiteChecker as SSOT.
 * @returns {Object} - Prerequisites object
 */
function loadPrestigeClassPrerequisites() {
  SWSELogger.log('SWSE LevelUp | Getting prestige class prerequisites from PrerequisiteChecker (canonical source)');
  return PrerequisiteChecker.getPrestigePrerequisites();
}

/**
 * Get prerequisites for a prestige class
 * @param {string} className - Name of the prestige class
 * @returns {string|null} - Prerequisite string or null
 */
export function getPrestigeClassPrerequisites(className) {
  const prerequisites = loadPrestigeClassPrerequisites();
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

  // Load prerequisites for prestige classes from canonical source (PrerequisiteChecker)
  const prestigePrerequisites = getPrestigeClassPrerequisites(classDoc.name);

  // If we have prerequisites from JSON, use those
  if (prestigePrerequisites) {
    const classDocWithPrereqs = { system: { prerequisites: prestigePrerequisites } };
    const assessment = AbilityEngine.evaluateAcquisition(actor, classDocWithPrereqs, pendingData);
    return assessment.legal;
  }

  // Fall back to checking classDoc prerequisites
  const assessment = AbilityEngine.evaluateAcquisition(actor, classDoc, pendingData);
  return assessment.legal;
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
  const assessment = AbilityEngine.evaluateAcquisition(actor, talent, pendingData);
  // Return in legacy format for backward compatibility with callers
  return {
    valid: assessment.legal,
    reasons: assessment.missingPrereqs
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
  return AbilityEngine.filterQualifiedFeats(feats, actor, pendingData);
}
