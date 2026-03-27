/**
 * ProgressionSubtypeAdapter
 *
 * Base contract for subtype-specific behavior providers.
 *
 * The progression spine is generic. Subtype-specific rules (followers, nonheroics, droids)
 * plug in through adapters that implement this interface.
 *
 * Architecture Rule: Adapters contribute behavior; they do not replace the spine.
 *
 * Phases:
 * - Phase 1: Structural seam only — basic dispatch and no-op defaults
 * - Phase 2/3: Nonheroic/Follower logic wired through adapters (reusing existing helpers)
 */

import { swseLogger } from '../../../utils/logger.js';

export class ProgressionSubtypeAdapter {
  /**
   * Constructor.
   * @param {string} subtypeId - e.g., 'actor', 'droid', 'follower', 'nonheroic'
   * @param {string} label - Human-readable label
   */
  constructor(subtypeId, label) {
    this.subtypeId = subtypeId;
    this.label = label;
  }

  /**
   * Resolve whether this adapter handles a given subtype string.
   * Called during adapter lookup.
   * @param {string} subtype
   * @returns {boolean}
   */
  handles(subtype) {
    return subtype === this.subtypeId;
  }

  /**
   * Seed the progression session with subtype-specific defaults.
   * Called during session initialization.
   *
   * @param {ProgressionSession} session - The session to seed
   * @param {Actor} actor - The actor context
   * @param {string} mode - 'chargen' | 'levelup' | 'template'
   * @returns {Promise<void>}
   */
  async seedSession(session, actor, mode) {
    // Default: no subtype-specific seeding.
    // Subclasses override for follower/nonheroic setup.
  }

  /**
   * Contribute or suppress active/owed steps.
   * Called during active-step computation.
   *
   * @param {Array<string>} candidateStepIds - Steps active before adapter contribution
   * @param {ProgressionSession} session - Current session state
   * @param {Actor} actor - Actor context
   * @returns {Promise<Array<string>>} Modified step list
   */
  async contributeActiveSteps(candidateStepIds, session, actor) {
    // Default: no modification. Steps remain as offered by spine.
    return candidateStepIds;
  }

  /**
   * Contribute entitlement facts (feats available, talent slots, etc.).
   * Called during prerequisite/entitlement evaluation.
   *
   * @param {Object} entitlements - Current entitlements {feats, talents, languages, skills, ...}
   * @param {ProgressionSession} session
   * @param {Actor} actor
   * @returns {Promise<Object>} Modified entitlements object
   */
  async contributeEntitlements(entitlements, session, actor) {
    // Default: no modification.
    return entitlements;
  }

  /**
   * Contribute restrictions or exclusions.
   * Called during prerequisite evaluation.
   *
   * @param {Object} restrictions - Current restrictions {forbiddenFeats, forbiddenTalents, ...}
   * @param {ProgressionSession} session
   * @param {Actor} actor
   * @returns {Promise<Object>} Modified restrictions object
   */
  async contributeRestrictions(restrictions, session, actor) {
    // Default: no modifications.
    return restrictions;
  }

  /**
   * Contribute data to projection/projected character.
   * Called during projection finalization (before summary/apply).
   *
   * @param {Object} projectedData - Current projected character data
   * @param {ProgressionSession} session
   * @param {Actor} actor
   * @returns {Promise<Object>} Modified projection data
   */
  async contributeProjection(projectedData, session, actor) {
    // Default: no modification.
    return projectedData;
  }

  /**
   * Contribute to mutation plan compilation.
   * Called during finalizer before ActorEngine application.
   *
   * @param {Object} mutationPlan - Current mutation plan {set, add, create, delete, metadata}
   * @param {ProgressionSession} session
   * @param {Actor} actor
   * @returns {Promise<Object>} Modified mutation plan
   */
  async contributeMutationPlan(mutationPlan, session, actor) {
    // Default: no modification.
    return mutationPlan;
  }

  /**
   * Validate subtype-specific readiness.
   * Called before finalization (used for subtype-specific blocking conditions).
   *
   * @param {ProgressionSession} session
   * @param {Actor} actor
   * @throws {Error} if not ready
   * @returns {Promise<void>}
   */
  async validateReadiness(session, actor) {
    // Default: no validation. Subclasses override if needed.
  }

  /**
   * Debug info for this adapter.
   * @returns {Object}
   */
  debug() {
    return {
      subtypeId: this.subtypeId,
      label: this.label,
      adapterClass: this.constructor.name,
    };
  }
}
