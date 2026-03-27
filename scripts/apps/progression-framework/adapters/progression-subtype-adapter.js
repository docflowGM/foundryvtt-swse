/**
 * ProgressionSubtypeAdapter
 *
 * Base contract for subtype-specific behavior providers.
 *
 * The progression spine is generic. Subtype-specific rules (followers, nonheroics, droids)
 * plug in through adapters that implement this interface.
 *
 * Participant Classification (Phase 1 CORRECTED):
 * - INDEPENDENT: actor, droid, nonheroic (full progression participants)
 * - DEPENDENT: follower (derived from owner, not independently progressed)
 *
 * Architecture Rule: Adapters contribute behavior; they do not replace the spine.
 *
 * Phases:
 * - Phase 1: Structural seam with participant classification
 * - Phase 2: Nonheroic logic wired through independent adapter
 * - Phase 3: Follower logic wired through dependent adapter (nonheroic-derived)
 */

import { swseLogger } from '../../../utils/logger.js';

/**
 * Participant kind enum
 */
export const ParticipantKind = Object.freeze({
  /** Full progression participant with independent lifecycle and choices */
  INDEPENDENT: 'independent',

  /** Derived participant: depends on owner actor, template-driven, entitlement-gated */
  DEPENDENT: 'dependent',
});

export class ProgressionSubtypeAdapter {
  /**
   * Constructor.
   * @param {string} subtypeId - e.g., 'actor', 'droid', 'follower', 'nonheroic'
   * @param {string} label - Human-readable label
   * @param {string} kind - ParticipantKind.INDEPENDENT | ParticipantKind.DEPENDENT
   * @param {Object} options - Optional metadata
   * @param {string} options.baseSubtype - If dependent, the base subtype (e.g., 'nonheroic' for follower)
   */
  constructor(subtypeId, label, kind = ParticipantKind.INDEPENDENT, options = {}) {
    this.subtypeId = subtypeId;
    this.label = label;
    this.kind = kind;
    this.isIndependent = kind === ParticipantKind.INDEPENDENT;
    this.isDependent = kind === ParticipantKind.DEPENDENT;
    this.baseSubtype = options.baseSubtype || null; // For dependent participants
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
   * For dependent participants (e.g., follower):
   * - Context may include owner/dependency metadata (via session.dependencyContext)
   * - Seeding must account for derived/entitlement-driven nature
   *
   * @param {ProgressionSession} session - The session to seed
   * @param {Actor} actor - The actor context
   * @param {string} mode - 'chargen' | 'levelup' | 'template'
   * @returns {Promise<void>}
   */
  async seedSession(session, actor, mode) {
    // Default: no subtype-specific seeding.
    // Subclasses override for dependent/nonheroic setup.
  }

  /**
   * Contribute or suppress active/owed steps.
   * Called during active-step computation.
   *
   * For dependent participants (e.g., follower):
   * - May suppress normal freeform feat/talent/skill progression
   * - May expose only entitlement-driven steps
   * - May suppress class/species/attribute selection
   *
   * @param {Array<string>} candidateStepIds - Steps active before adapter contribution
   * @param {ProgressionSession} session - Current session state
   * @param {Actor} actor - Actor context
   * @returns {Promise<Array<string>>} Modified step list
   */
  async contributeActiveSteps(candidateStepIds, session, actor) {
    // Default: no modification. Steps remain as offered by spine.
    // Dependent adapters override to suppress inappropriate steps.
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
      kind: this.kind,
      isIndependent: this.isIndependent,
      isDependent: this.isDependent,
      baseSubtype: this.baseSubtype,
      adapterClass: this.constructor.name,
    };
  }
}
