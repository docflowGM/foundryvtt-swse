/**
 * EMOTIONAL ROUTING MATRIX
 *
 * Deterministic, tier-aligned mapping of advisory type → judgment category.
 * No inference. No dynamic selection. Fixed policy.
 *
 * Maps: advisoryType -> tier -> judgment category name
 * Each category must exist in mentor.judgments and have all five tiers.
 *
 * Usage:
 *   const category = routingMatrix[advisoryType][tier];
 *   const overlay = mentorData.judgments[category][tier][0];
 */

export const emotionalRoutingMatrix = {
  conflict: {
    very_low: "recognition",
    low: "inner_conflict",
    medium: "concern",
    high: "warning",
    very_high: "consequential_awareness"
  },

  drift: {
    very_low: "reflection",
    low: "concern",
    medium: "reorientation",
    high: "warning",
    very_high: "threshold"
  },

  prestige_planning: {
    very_low: "perspective",
    low: "insight",
    medium: "gravity",
    high: "consequential_awareness",
    very_high: "threshold"
  },

  strength_reinforcement: {
    very_low: "affirmation",
    low: "affirmation",
    medium: "maturation",
    high: "recognition",
    very_high: "transformation_acknowledgment"
  },

  hybrid_identity: {
    very_low: "reflection",
    low: "reflection",
    medium: "perspective",
    high: "gravity",
    very_high: "threshold"
  },

  specialization_warning: {
    very_low: "concern",
    low: "risk_acknowledgment",
    medium: "warning",
    high: "consequential_awareness",
    very_high: "threshold"
  },

  momentum: {
    very_low: "recognition",
    low: "affirmation",
    medium: "recognition",
    high: "maturation",
    very_high: "transformation_acknowledgment"
  },

  long_term_trajectory: {
    very_low: "perspective",
    low: "gravity",
    medium: "consequential_awareness",
    high: "threshold",
    very_high: "revelation"
  }
};
