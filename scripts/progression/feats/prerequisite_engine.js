/**
 * Legacy PrerequisiteRequirements - delegates to canonical PrerequisiteChecker
 * Used for backward compatibility testing
 */

import { PrerequisiteChecker } from '../../data/prerequisite-checker.js';

export class PrerequisiteRequirements {
  static checkFeatPrerequisites(actor, featDoc, pendingData = {}) {
    const result = PrerequisiteChecker.checkFeatPrerequisites(actor, featDoc, pendingData);
    return {
      valid: result.met,
      reasons: result.missing
    };
  }

  static checkTalentPrerequisites(actor, talentDoc, pendingData = {}) {
    const result = PrerequisiteChecker.checkTalentPrerequisites(actor, talentDoc, pendingData);
    return {
      valid: result.met,
      reasons: result.missing
    };
  }
}
