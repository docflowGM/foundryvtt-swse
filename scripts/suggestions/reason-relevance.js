/**
 * Reason Relevance Weighting
 *
 * Per-focus attention weights for reason domains in explanatory reasons array.
 * Higher weight = higher priority when ranking or displaying secondary reasons.
 * NOT stored. NOT a new axis. Pure contextual attention.
 *
 * Critical: Relevance is applied ONLY to the explanatory reasons[] array,
 * NEVER to base tier assignment or suggestion scoring/ordering.
 *
 * Context object may include:
 * - focus: string (e.g., "feats", "talents", "skills")
 * - pendingSelections: {selectedFeats, selectedTalents, selectedSkills, etc.}
 *   Reasons matching pending selections get a boost to relevance
 *
 * Returns: 0.0 → 1.0 (higher = more relevant to this progression focus)
 * Default: 1.0 (equal weight if not matched)
 */

export const REASON_RELEVANCE = {
  // "What skills should I train?"
  // Rank explanations by: class requirements > ability synergies > previous training > flavor
  skills(reason, context) {
    switch (reason.domain) {
      case 'class':
        return 1.0;      // Class requirements are primary explanation
      case 'attributes':
        return 0.9;      // Ability synergies matter
      case 'trained_skills':
        return 0.8;      // Previous training is relevant context
      case 'synergy':
        return 0.7;      // Synergy is secondary flavor
      default:
        return 0.2;      // Other domains are de-emphasized
    }
  },

  // "What feats should I select?"
  // Rank explanations by: BAB gating > ability requirements > skill synergies
  feats(reason, context) {
    switch (reason.domain) {
      case 'bab':
        return 1.0;      // BAB is primary gating reason
      case 'attributes':
        return 0.9;      // Ability requirements matter
      case 'trained_skills':
        return 0.6;      // Skill synergies are secondary
      default:
        return 0.3;      // Other domains are de-emphasized
    }
  },

  // "Which class should I take?"
  // Rank explanations by: class locks > ability alignment > role fit
  classes(reason, context) {
    switch (reason.domain) {
      case 'previous_class':
        return 1.0;      // Class locks are critical explanation
      case 'attributes':
        return 0.8;      // Ability alignment matters
      case 'role_alignment':
        return 0.7;      // Role fit is secondary
      default:
        return 0.3;      // Other domains are de-emphasized
    }
  },

  // "Which talents fit my build?"
  // Rank explanations by: class gates > level gates > prerequisites
  talents(reason, context) {
    switch (reason.domain) {
      case 'class':
        return 1.0;      // Class requirements are primary
      case 'level':
        return 0.9;      // Level gating is critical
      case 'prerequisites':
        return 0.8;      // Talent prereqs matter
      default:
        return 0.3;      // Other domains are de-emphasized
    }
  },

  // "Should I increase this ability?"
  // Rank explanations by: class alignment > role requirements
  attributes(reason, context) {
    switch (reason.domain) {
      case 'class':
        return 1.0;      // Class alignment is primary
      case 'role_alignment':
        return 0.9;      // Role requirements matter
      default:
        return 0.3;      // Other domains are de-emphasized
    }
  }
};

/**
 * Get relevance weight for a reason in a specific focus context
 *
 * @param {string} focus - The progression focus ("skills", "feats", "classes", etc.)
 * @param {Object} reason - The reason object with domain, code, text, etc.
 * @param {Object} context - Optional context with focus and pendingSelections
 * @returns {number} Relevance weight (0.0 → 1.0)
 */
export function getReasonRelevance(focus, reason, context = {}) {
  const fn = REASON_RELEVANCE[focus];

  // Unknown focus = all equal weight
  if (!fn) {return 1.0;}

  try {
    let weight = fn(reason, context);

    // Boost relevance if reason matches pending selections
    const pendingBoost = getPendingSelectionBoost(reason, context.pendingSelections);
    weight = Math.min(1.0, weight + pendingBoost);

    // Clamp to valid range
    return Math.max(0, Math.min(1, weight ?? 1.0));
  } catch (err) {
    // Fail open on any error
    return 1.0;
  }
}

/**
 * Check if a reason relates to pending selections and boost relevance
 * This helps emphasize reasons that explain recent player choices
 * @private
 * @param {Object} reason - The reason object
 * @param {Object} pendingSelections - Pending selections (may be null/undefined)
 * @returns {number} Boost amount (0.0 → 0.1)
 */
function getPendingSelectionBoost(reason, pendingSelections) {
  if (!pendingSelections || typeof pendingSelections !== 'object') {
    return 0;
  }

  const reasonCode = reason?.code || '';
  const reasonDomain = reason?.domain || '';

  // Detect if this reason is about feats/talents that player just selected
  const selectedFeats = pendingSelections.selectedFeats || [];
  const selectedTalents = pendingSelections.selectedTalents || [];
  const selectedSkills = pendingSelections.selectedSkills || [];

  // Boost if reason mentions prerequisites (suggests player met requirements)
  if (reasonCode === 'PREREQ_MET' && (selectedFeats.length > 0 || selectedTalents.length > 0)) {
    return 0.1;
  }

  // Boost if reason is about synergy with recent choices
  if (reasonDomain === 'synergy' && (selectedFeats.length > 0 || selectedTalents.length > 0)) {
    return 0.08;
  }

  // Boost if reason is about ability/skill training and they just selected skills
  if (reasonDomain === 'trained_skills' && selectedSkills.length > 0) {
    return 0.08;
  }

  // Boost pattern matching when player is actively building direction
  if (reasonCode === 'MATCHES_ARCHETYPE' && selectedFeats.length > 2) {
    return 0.06;
  }

  return 0;
}
