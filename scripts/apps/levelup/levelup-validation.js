/**
 * Validation logic for SWSE Level Up system
 * Handles prerequisite checking for classes, talents, and feats
 */

import { AbilityEngine } from "/systems/foundryvtt-swse/scripts/engine/abilities/AbilityEngine.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { isBaseClass } from "/systems/foundryvtt-swse/scripts/apps/levelup/levelup-shared.js";
import { evaluateClassEligibility } from "/systems/foundryvtt-swse/scripts/engine/progression/prerequisites/class-prerequisites-cache.js";

// NOTE: Prestige class prerequisites are now loaded from the canonical authority:
// scripts/data/prestige-prerequisites.js (injected at import time)
// This removes the stale JSON fallback and ensures single source of truth.

/**
 * Check if character meets prerequisites for a class
 * @param {Object} classDoc - The class document
 * @param {Actor} actor - The actor
 * @param {Object} pendingData - Pending selections (feats, skills, etc.)
 * @returns {boolean} True if prerequisites are met
 */
export function meetsClassPrerequisites(classDoc, actor, pendingData) {
  // Base classes have no prerequisites
  if (isBaseClass(classDoc)) {return true;}

  // Use canonical authority via AbilityEngine
  // AbilityEngine automatically detects prestige classes and routes to appropriate checker
  const classCandidate = { ...classDoc, type: 'class' };
  const assessment = AbilityEngine.evaluateAcquisition(actor, classCandidate, pendingData);
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
