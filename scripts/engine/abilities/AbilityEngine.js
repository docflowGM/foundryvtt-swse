/**
 * AbilityEngine
 *
 * Sovereign authority on ability acquisition legality.
 *
 * Responsibilities:
 * - Evaluate whether an actor can acquire a specific item (feat, talent, class, etc.)
 * - Delegate to PrerequisiteChecker for prerequisite evaluation
 * - Return standardized legality assessment
 * - Handle card panel models for actor sheets (legacy)
 *
 * ARCHITECTURAL POSITION:
 * This is the ONLY entry point for "is this legal to acquire?" questions.
 * Selection UI calls this directly.
 * SuggestionEngine does NOT call PrerequisiteChecker directly; it only reads results from this.
 */

import { PrerequisiteChecker } from '../../data/prerequisite-checker.js';
import { SWSELogger } from '../../utils/logger.js';

export class AbilityEngine {
  /**
   * Evaluate whether an actor can acquire a candidate item.
   *
   * This is the SOVEREIGN AUTHORITY on legality.
   * PrerequisiteChecker is delegated to internally.
   * No other system calls PrerequisiteChecker directly.
   *
   * @param {Object} actor - Actor document
   * @param {Object|string} candidate - Item being evaluated (feat, talent, class, power, etc.)
   * @param {Object} pending - Pending selections {selectedFeats, selectedTalents, etc.}
   * @returns {Object} Standardized legality assessment
   *   {
   *     legal: boolean,                    // Can acquire now
   *     permanentlyBlocked: boolean,       // Can never acquire (incompatible)
   *     missingPrereqs: string[],          // Unmet prerequisites
   *     blockingReasons: string[]          // Human-readable blocking reasons
   *   }
   */
  static evaluateAcquisition(actor, candidate, pending = {}) {
    if (!actor || !candidate) {
      return {
        legal: false,
        permanentlyBlocked: true,
        missingPrereqs: ['Invalid actor or candidate'],
        blockingReasons: ['Cannot evaluate invalid inputs']
      };
    }

    try {
      // Detect candidate type
      const type = candidate.type || typeof candidate === 'string' ? 'unknown' : candidate.type;

      let result = { met: false, missing: [], details: {} };

      // Route to appropriate PrerequisiteChecker method
      if (type === 'feat' || (typeof candidate === 'string' && this._isLikelyFeat(candidate))) {
        result = PrerequisiteChecker.checkFeatPrerequisites(actor, candidate, pending);
      } else if (type === 'talent') {
        result = PrerequisiteChecker.checkTalentPrerequisites(actor, candidate, pending);
      } else if (type === 'class') {
        result = PrerequisiteChecker.checkClassLevelPrerequisites(actor, candidate, pending);
      } else if (type === 'power' || type === 'forcepower') {
        // Force powers use feat prerequisite logic (they have prerequisite.prerequisite fields)
        result = PrerequisiteChecker.checkFeatPrerequisites(actor, candidate, pending);
      } else {
        // Fallback: try feat, then talent
        result = PrerequisiteChecker.checkFeatPrerequisites(actor, candidate, pending);
        if (!result.met) {
          result = PrerequisiteChecker.checkTalentPrerequisites(actor, candidate, pending);
        }
      }

      // Convert PrerequisiteChecker result to standardized format
      return {
        legal: result.met === true,
        permanentlyBlocked: false, // PrerequisiteChecker doesn't distinguish permanent blocks; assume all are temporary
        missingPrereqs: result.missing || [],
        blockingReasons: result.missing || [] // For now, missing preqs = blocking reasons
      };
    } catch (err) {
      SWSELogger.error('[AbilityEngine.evaluateAcquisition]', err);
      return {
        legal: false,
        permanentlyBlocked: true,
        missingPrereqs: ['Evaluation error'],
        blockingReasons: [err.message || 'Unknown error evaluating prerequisites']
      };
    }
  }

  /**
   * Quick check: can this candidate be acquired?
   * Returns boolean (true if legal).
   *
   * @param {Object} actor - Actor document
   * @param {Object|string} candidate - Item being evaluated
   * @param {Object} pending - Pending selections
   * @returns {boolean}
   */
  static canAcquire(actor, candidate, pending = {}) {
    const assessment = this.evaluateAcquisition(actor, candidate, pending);
    return assessment.legal === true;
  }

  /**
   * Get unmet requirements for a candidate.
   *
   * @param {Object} actor - Actor document
   * @param {Object|string} candidate - Item being evaluated
   * @param {Object} pending - Pending selections
   * @returns {string[]} Array of unmet requirement descriptions
   */
  static getUnmetRequirements(actor, candidate, pending = {}) {
    const assessment = this.evaluateAcquisition(actor, candidate, pending);
    return assessment.missingPrereqs;
  }

  /**
   * Filter feats to only those an actor qualifies for.
   * Adds isQualified and prerequisiteReasons fields to each feat.
   *
   * @param {Array} feats - Array of feat items
   * @param {Actor} actor - The actor
   * @param {Object} pending - Pending selections
   * @returns {Array} Feats with isQualified and prerequisiteReasons added
   */
  static filterQualifiedFeats(feats, actor, pending = {}) {
    return feats.map(feat => {
      const assessment = this.evaluateAcquisition(actor, feat, pending);
      return {
        ...feat,
        isQualified: assessment.legal,
        prerequisiteReasons: assessment.missingPrereqs
      };
    });
  }

  /**
   * Filter talents to only those an actor qualifies for.
   * Adds isQualified and prerequisiteReasons fields to each talent.
   *
   * @param {Array} talents - Array of talent items
   * @param {Actor} actor - The actor
   * @param {Object} pending - Pending selections
   * @returns {Array} Talents with isQualified and prerequisiteReasons added
   */
  static filterQualifiedTalents(talents, actor, pending = {}) {
    return talents.map(talent => {
      const assessment = this.evaluateAcquisition(actor, talent, pending);
      return {
        ...talent,
        isQualified: assessment.legal,
        prerequisiteReasons: assessment.missingPrereqs
      };
    });
  }

  /**
   * Check if an actor can access a talent tree.
   *
   * @param {Actor} actor - The actor
   * @param {string} treeId - The talent tree ID
   * @param {Object} pending - Pending selections
   * @returns {Promise<boolean>} True if the actor can access the tree
   */
  static async canAccessTalentTree(actor, treeId, pending = {}) {
    return PrerequisiteChecker.canAccessTalentTree(actor, treeId);
  }

  /**
   * Evaluate whether an actor can acquire a prestige class.
   *
   * @param {Object} actor - Actor document
   * @param {string} className - Prestige class name
   * @param {Object} pending - Pending selections
   * @returns {Object} Standardized legality assessment
   */
  static evaluatePrestigeClassAcquisition(actor, className, pending = {}) {
    if (!actor || !className) {
      return {
        legal: false,
        permanentlyBlocked: true,
        missingPrereqs: ['Invalid actor or class name'],
        blockingReasons: ['Cannot evaluate invalid inputs']
      };
    }

    try {
      const result = PrerequisiteChecker.checkPrestigeClassPrerequisites(actor, className, pending);
      return {
        legal: result.met === true,
        permanentlyBlocked: false,
        missingPrereqs: result.missing || [],
        blockingReasons: result.missing || []
      };
    } catch (err) {
      SWSELogger.error('[AbilityEngine.evaluatePrestigeClassAcquisition]', err);
      return {
        legal: false,
        permanentlyBlocked: true,
        missingPrereqs: ['Evaluation error'],
        blockingReasons: [err.message || 'Unknown error evaluating prerequisites']
      };
    }
  }

  /**
   * Get card panel model for actor abilities (legacy)
   * @param {Actor} actor - The actor to get abilities for
   * @returns {Object} Model with all, feats, talents, racialAbilities
   */
  static getCardPanelModelForActor(actor) {
    return {
      all: [],
      feats: [],
      talents: [],
      racialAbilities: []
    };
  }

  /**
   * Helper: Guess if a string-based candidate is likely a feat.
   * @private
   */
  static _isLikelyFeat(candidateString) {
    // If it looks like a feat name, treat as feat
    // This is a fallback heuristic; explicit type is preferred
    return typeof candidateString === 'string';
  }
}
