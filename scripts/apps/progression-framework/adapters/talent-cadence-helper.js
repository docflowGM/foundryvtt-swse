/**
 * Talent Cadence Helper for Nonheroic Integration
 *
 * Wraps existing TalentCadenceEngine to check talent grant eligibility
 * for nonheroic participants during progression.
 *
 * Phase 2: Reuses authoritative TalentCadenceEngine logic.
 * Does not duplicate cadence rules; calls existing helpers.
 */

import { swseLogger } from '../../../utils/logger.js';

/**
 * Check if a nonheroic class at a given level would receive talent grants.
 *
 * Uses existing TalentCadenceEngine.grantsClassTalent() which returns 0 for nonheroic.
 *
 * @param {number} classLevel - Class level being progressed
 * @param {boolean} isNonheroic - Whether this is a nonheroic class
 * @returns {number} Number of talents granted at this level (0 for nonheroic always)
 */
export function getTalentGrantsForLevel(classLevel, isNonheroic) {
  // Phase 2: Delegate to existing TalentCadenceEngine
  // This is the authoritative source for talent cadence rules
  // It already handles house rule settings (talentEveryLevel, etc.)

  if (typeof window !== 'undefined' && window.game?.system?.api?.TalentCadenceEngine?.grantsClassTalent) {
    // Live Foundry context
    return window.game.system.api.TalentCadenceEngine.grantsClassTalent(classLevel, isNonheroic);
  }

  // Fallback: nonheroic never gets talents
  if (isNonheroic) {
    return 0;
  }

  // Fallback: heroic gets normal cadence (odd levels)
  return classLevel % 2 === 1 ? 1 : 0;
}

/**
 * Determine if talent progression steps should be suppressed for a nonheroic participant.
 *
 * @param {boolean} isNonheroic - Whether participant is nonheroic
 * @param {Object} session - Progression session (for future context)
 * @returns {boolean} true if talent steps should be suppressed
 */
export function shouldSuppressTalentSteps(isNonheroic, session) {
  // Phase 2: Nonheroics don't get any talent steps because
  // TalentCadenceEngine.grantsClassTalent() returns 0 for nonheroic
  return isNonheroic === true;
}

/**
 * Get talent cadence info for UI/debugging.
 *
 * @param {boolean} isNonheroic
 * @returns {Object}
 */
export function describeTalentCadence(isNonheroic) {
  return {
    isNonheroic,
    suppressed: isNonheroic,
    reason: isNonheroic ? 'Nonheroic characters do not grant talents' : 'Heroic characters follow talent cadence rules',
  };
}
