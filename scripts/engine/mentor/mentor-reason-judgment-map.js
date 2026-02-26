/**
 * Mentor Reason → Judgment Rules
 *
 * Maps fact patterns (reason keys) to mentor reactions (judgment + intensity).
 * This is the SEMANTIC BRAIN of the mentor system.
 *
 * CRITICAL RULES:
 * - Matching is set inclusion: ALL when reasons must be present
 * - Order-dependent: first match wins
 * - Intensity here is BASE intensity (refined later by context)
 * - Fallback rule (empty when) always matches last
 *
 * Design philosophy:
 * - High-signal first (prestige, danger, growth)
 * - Generic after (alignment, exploration, neutral)
 * - Safe fallback last
 *
 * This rule set is the single source of truth for mentor decision-making.
 * Do not add rules without logging evidence that they fire frequently.
 */

import { JUDGMENT_ATOMS } from '../../engine/systems/mentor/mentor-judgment-engine.js';
import { INTENSITY_ATOMS } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-intensity-atoms.js";
import { isValidReasonKey } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-reason-renderer.js";

/**
 * Canonical Mentor Reaction Rules
 *
 * Order matters. First match wins.
 * Matching is set inclusion: all reasons in 'when' must be present.
 * Fallback rule (empty 'when') matches last.
 */
export const MENTOR_REASON_JUDGMENT_RULES = [
  // ========================================================================
  // PRESTIGE & THRESHOLD MOMENTS (highest priority)
  // ========================================================================

  // Prestige fully unlocked — defining moment
  {
    when: ['prestige_prerequisites_met'],
    judgment: JUDGMENT_ATOMS.GRAVITY,
    intensity: INTENSITY_ATOMS.very_high,
    label: 'Prestige ready'
  },

  // Prestige almost unlocked — strong anticipation
  {
    when: ['prestige_prerequisites_nearly_met'],
    judgment: JUDGMENT_ATOMS.THRESHOLD,
    intensity: INTENSITY_ATOMS.high,
    label: 'Prestige nearly ready'
  },

  // Prestige direction consistent over time
  {
    when: ['prestige_path_consistency', 'prestige_specialization_threshold'],
    judgment: JUDGMENT_ATOMS.CONFIRMATION,
    intensity: INTENSITY_ATOMS.high,
    label: 'Prestige path locked'
  },

  // Prestige identity shift (intentional divergence)
  {
    when: ['prestige_identity_shift'],
    judgment: JUDGMENT_ATOMS.REVELATION,
    intensity: INTENSITY_ATOMS.high,
    label: 'Identity shift'
  },

  // ========================================================================
  // RISK, EXPOSURE & CONSEQUENCE (must fire before positive)
  // ========================================================================

  // Clear risk + exposure (compound danger)
  {
    when: ['risk_increased', 'exposure'],
    judgment: JUDGMENT_ATOMS.WARNING,
    intensity: INTENSITY_ATOMS.high,
    label: 'Risk + exposure'
  },

  // Risk present but without exposure
  {
    when: ['risk_increased'],
    judgment: JUDGMENT_ATOMS.RISK_ACKNOWLEDGMENT,
    intensity: INTENSITY_ATOMS.medium,
    label: 'Risk acknowledged'
  },

  // Vulnerability reduced / defensive choice
  {
    when: ['risk_mitigated'],
    judgment: JUDGMENT_ATOMS.ENCOURAGEMENT,
    intensity: INTENSITY_ATOMS.medium,
    label: 'Risk mitigated'
  },

  // Clear tradeoff introduced
  {
    when: ['opportunity_cost_incurred'],
    judgment: JUDGMENT_ATOMS.CONSEQUENTIAL_AWARENESS,
    intensity: INTENSITY_ATOMS.medium,
    label: 'Tradeoff visible'
  },

  // ========================================================================
  // DRIFT, CONFLICT & REORIENTATION (identity tension)
  // ========================================================================

  // Goal conflict detected (compound signal)
  {
    when: ['goal_deviation', 'pattern_conflict'],
    judgment: JUDGMENT_ATOMS.REASSESSMENT,
    intensity: INTENSITY_ATOMS.medium,
    label: 'Drift detected'
  },

  // Commitment ignored repeatedly
  {
    when: ['commitment_ignored'],
    judgment: JUDGMENT_ATOMS.REORIENTATION,
    intensity: INTENSITY_ATOMS.medium,
    label: 'Commitment shift'
  },

  // Pattern conflict without explicit goal (softer)
  {
    when: ['pattern_conflict'],
    judgment: JUDGMENT_ATOMS.REFLECTION,
    intensity: INTENSITY_ATOMS.low,
    label: 'Pattern mismatch'
  },

  // ========================================================================
  // STRONG ALIGNMENT & GROWTH (affirmation without overcommitment)
  // ========================================================================

  // Strong synergy + readiness (compound positive)
  {
    when: ['synergy_present', 'readiness_met'],
    judgment: JUDGMENT_ATOMS.AFFIRMATION,
    intensity: INTENSITY_ATOMS.medium,
    label: 'Strong fit'
  },

  // Core strength reinforced (specialization)
  {
    when: ['feat_reinforces_core_strength'],
    judgment: JUDGMENT_ATOMS.ENCOURAGEMENT,
    intensity: INTENSITY_ATOMS.medium,
    label: 'Core strength reinforced'
  },

  // Role identity reinforced
  {
    when: ['class_role_alignment', 'class_identity_reinforced'],
    judgment: JUDGMENT_ATOMS.AFFIRMATION,
    intensity: INTENSITY_ATOMS.medium,
    label: 'Role identity'
  },

  // Specialization clearly forming
  {
    when: ['specialization_forming'],
    judgment: JUDGMENT_ATOMS.EMERGENCE,
    intensity: INTENSITY_ATOMS.medium,
    label: 'Specialization forming'
  },

  // ========================================================================
  // READINESS & CAPABILITY SIGNALS
  // ========================================================================

  // Ready for significant next step
  {
    when: ['readiness_met', 'growth_stage_shift'],
    judgment: JUDGMENT_ATOMS.INSIGHT,
    intensity: INTENSITY_ATOMS.medium,
    label: 'Ready for growth'
  },

  // Not yet ready (patience needed)
  {
    when: ['readiness_lacking'],
    judgment: JUDGMENT_ATOMS.PATIENCE,
    intensity: INTENSITY_ATOMS.low,
    label: 'Not yet ready'
  },

  // ========================================================================
  // EXPLORATION & NEUTRAL MOMENTS
  // ========================================================================

  // Active exploration (no correction)
  {
    when: ['exploration_signal'],
    judgment: JUDGMENT_ATOMS.REFLECTION,
    intensity: INTENSITY_ATOMS.low,
    label: 'Exploring'
  },

  // Rare choice at this stage
  {
    when: ['rare_choice'],
    judgment: JUDGMENT_ATOMS.PERSPECTIVE,
    intensity: INTENSITY_ATOMS.low,
    label: 'Unusual choice'
  },

  // New option unlocked
  {
    when: ['new_option_revealed'],
    judgment: JUDGMENT_ATOMS.CONTEXTUALIZATION,
    intensity: INTENSITY_ATOMS.low,
    label: 'New option'
  },

  // ========================================================================
  // EXPERIENCE & MATURITY (late-stage tone)
  // ========================================================================

  // Maturation visible
  {
    when: ['growth_stage_shift', 'pattern_alignment'],
    judgment: JUDGMENT_ATOMS.MATURATION,
    intensity: INTENSITY_ATOMS.medium,
    label: 'Maturation'
  },

  // ========================================================================
  // FALLBACK (MANDATORY - empty 'when' always matches)
  // ========================================================================

  // Safe default reaction (catches everything else)
  {
    when: [],
    judgment: JUDGMENT_ATOMS.RECOGNITION,
    intensity: INTENSITY_ATOMS.low,
    label: 'Default observation'
  }
];

/**
 * Find the first rule matching a set of reason keys.
 *
 * Matching rule: ALL reasons in rule.when must be present in the fact set.
 * Order matters: first match wins.
 *
 * @param {string[]} reasons - Array of reason keys from selectReasonAtoms()
 * @returns {Object} Matched rule object with {judgment, intensity, label}
 */
export function findMatchingRule(reasons) {
  if (!Array.isArray(reasons)) {
    reasons = [];
  }

  const reasonSet = new Set(reasons);

  // Find first rule where ALL when-conditions are present
  for (const rule of MENTOR_REASON_JUDGMENT_RULES) {
    const ruleMatches = rule.when.every(reason => reasonSet.has(reason));
    if (ruleMatches) {
      return {
        judgment: rule.judgment,
        intensity: rule.intensity,
        label: rule.label,
        rule: rule
      };
    }
  }

  // Fallback should never be reached (last rule has empty when)
  console.error('[findMatchingRule] No rule matched and fallback failed');
  return {
    judgment: JUDGMENT_ATOMS.RECOGNITION,
    intensity: INTENSITY_ATOMS.low,
    label: 'ERROR: No rule matched'
  };
}

/**
 * Validate all rules in the table.
 * Called at startup to catch configuration errors.
 *
 * Checks:
 * - All judgment atoms are valid
 * - All intensity atoms are valid
 * - All reason keys are valid (or empty fallback)
 *
 * @returns {Object} {isValid, errors: []}
 */
export function validateMentorRules() {
  const errors = [];

  for (let i = 0; i < MENTOR_REASON_JUDGMENT_RULES.length; i++) {
    const rule = MENTOR_REASON_JUDGMENT_RULES[i];

    // Check judgment
    if (!Object.values(JUDGMENT_ATOMS).includes(rule.judgment)) {
      errors.push(`Rule ${i} (${rule.label}): Invalid judgment "${rule.judgment}"`);
    }

    // Check intensity
    if (!Object.values(INTENSITY_ATOMS).includes(rule.intensity)) {
      errors.push(`Rule ${i} (${rule.label}): Invalid intensity "${rule.intensity}"`);
    }

    // Check reason keys (except for fallback empty rule)
    if (rule.when && rule.when.length > 0) {
      for (const reason of rule.when) {
        if (!isValidReasonKey(reason)) {
          errors.push(`Rule ${i} (${rule.label}): Invalid reason key "${reason}"`);
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    ruleCount: MENTOR_REASON_JUDGMENT_RULES.length
  };
}

/**
 * Get rule statistics (useful for debugging and logging).
 *
 * @returns {Object} Statistics about the rule set
 */
export function getMentorRuleStats() {
  const stats = {
    totalRules: MENTOR_REASON_JUDGMENT_RULES.length,
    byJudgment: {},
    byIntensity: {},
    byLabelPrefix: {}
  };

  for (const rule of MENTOR_REASON_JUDGMENT_RULES) {
    // By judgment
    const j = rule.judgment;
    stats.byJudgment[j] = (stats.byJudgment[j] || 0) + 1;

    // By intensity
    const i = rule.intensity;
    stats.byIntensity[i] = (stats.byIntensity[i] || 0) + 1;

    // By label prefix (first word)
    const prefix = rule.label.split(' ')[0];
    stats.byLabelPrefix[prefix] = (stats.byLabelPrefix[prefix] || 0) + 1;
  }

  return stats;
}
