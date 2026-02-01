/**
 * Legacy PrerequisiteValidator - delegates to canonical PrerequisiteChecker
 * Used for backward compatibility testing
 */

import { PrerequisiteChecker } from '../data/prerequisite-checker.js';

export class PrerequisiteValidator {
  static checkClassPrerequisites(classDoc, actor, pendingData = {}) {
    const result = PrerequisiteChecker.checkClassLevelPrerequisites(actor, classDoc, pendingData);
    return {
      valid: result.met,
      reasons: result.missing
    };
  }

  static filterQualifiedFeats(feats, actor, pendingData = {}) {
    return PrerequisiteChecker.filterQualifiedFeats(feats, actor, pendingData);
  }

  static getAllGrantedFeats(actor, classDoc) {
    // Legacy method - returns granted feats for a class
    return PrerequisiteChecker.getGrantedFeats?.(actor, classDoc) || [];
  }
}
