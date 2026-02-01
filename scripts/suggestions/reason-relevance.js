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
 * Each function receives:
 * - reason: The reason object with domain, code, text, etc.
 * - context: Focus context (optional, for future expansion)
 *
 * Returns: 0.0 → 1.0 (higher = more relevant to this progression focus)
 * Default: 1.0 (equal weight if not matched)
 */

export const REASON_RELEVANCE = {
  // "What skills should I train?"
  // Rank explanations by: class requirements > ability synergies > previous training > flavor
  skills(reason, context) {
    switch (reason.domain) {
      case "class":
        return 1.0;      // Class requirements are primary explanation
      case "attributes":
        return 0.9;      // Ability synergies matter
      case "trained_skills":
        return 0.8;      // Previous training is relevant context
      case "synergy":
        return 0.7;      // Synergy is secondary flavor
      default:
        return 0.2;      // Other domains are de-emphasized
    }
  },

  // "What feats should I select?"
  // Rank explanations by: BAB gating > ability requirements > skill synergies
  feats(reason, context) {
    switch (reason.domain) {
      case "bab":
        return 1.0;      // BAB is primary gating reason
      case "attributes":
        return 0.9;      // Ability requirements matter
      case "trained_skills":
        return 0.6;      // Skill synergies are secondary
      default:
        return 0.3;      // Other domains are de-emphasized
    }
  },

  // "Which class should I take?"
  // Rank explanations by: class locks > ability alignment > role fit
  classes(reason, context) {
    switch (reason.domain) {
      case "previous_class":
        return 1.0;      // Class locks are critical explanation
      case "attributes":
        return 0.8;      // Ability alignment matters
      case "role_alignment":
        return 0.7;      // Role fit is secondary
      default:
        return 0.3;      // Other domains are de-emphasized
    }
  },

  // "Which talents fit my build?"
  // Rank explanations by: class gates > level gates > prerequisites
  talents(reason, context) {
    switch (reason.domain) {
      case "class":
        return 1.0;      // Class requirements are primary
      case "level":
        return 0.9;      // Level gating is critical
      case "prerequisites":
        return 0.8;      // Talent prereqs matter
      default:
        return 0.3;      // Other domains are de-emphasized
    }
  },

  // "Should I increase this ability?"
  // Rank explanations by: class alignment > role requirements
  attributes(reason, context) {
    switch (reason.domain) {
      case "class":
        return 1.0;      // Class alignment is primary
      case "role_alignment":
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
 * @param {Object} context - Optional context (for future expansion)
 * @returns {number} Relevance weight (0.0 → 1.0)
 */
export function getReasonRelevance(focus, reason, context = {}) {
  const fn = REASON_RELEVANCE[focus];

  // Unknown focus = all equal weight
  if (!fn) return 1.0;

  try {
    const weight = fn(reason, context);
    // Clamp to valid range
    return Math.max(0, Math.min(1, weight ?? 1.0));
  } catch (err) {
    // Fail open on any error
    return 1.0;
  }
}
