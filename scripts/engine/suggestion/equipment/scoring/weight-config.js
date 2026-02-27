/**
 * Weight Configuration for SWSE Suggestion Engine
 *
 * Core Principle:
 * No single component may exceed ~30-35% of total possible score.
 * Weights are ADDITIVE, not multiplicative.
 * Scores SATURATE rather than scale infinitely.
 *
 * This prevents:
 * - "Best-in-slot" railroading
 * - Domination by any single signal
 * - Pathological rankings in edge cases
 */

export const WEIGHT_CAPS = {
  // Individual component caps (must be explicit)
  BASE_RELEVANCE: { min: 10, max: 20 },
  ROLE_ALIGNMENT: { min: -10, max: 25 },
  AXIS_A_DAMAGE: { min: 0, max: 16 },
  AXIS_B_ACCURACY: { min: -15, max: 20 },
  TRADEOFF_ADJUSTMENT: { min: -10, max: 10 },
  PRICE_BIAS: { min: -6, max: 4 },

  // Total score should range 0-100 for easy mental math
  TOTAL_SCORE: { min: 0, max: 100 }
};

/**
 * Base Relevance Component
 * Anchor weight - prevents junk from ranking high
 *
 * This is NOT exciting. It's a safety net.
 * Purpose: Ensure item is usable at all before considering optimization
 */
export const BASE_RELEVANCE = {
  // Item type matches context
  type_match: 10,

  // Proficiency exists or is common
  proficiency_exists: 5,

  // Item is actually usable
  usable: 5,

  // Total base: +20 (no higher)
  // If an item fails base relevance, it never rises high
  _total: 20
};

/**
 * Role Alignment Component
 * PRIMARY human signal - how the character fights
 *
 * Range: -10 to +25
 * This should often outweigh raw damage.
 * Role alignment is the "fit" signal.
 */
export const ROLE_ALIGNMENT = {
  // Perfect role match
  perfect_match: 25,

  // Strong partial overlap
  strong_partial: 15,

  // Moderate partial overlap
  moderate_partial: 8,

  // Neutral (no penalty)
  neutral: 0,

  // Mild mismatch
  mild_mismatch: -5,

  // Strong mismatch
  strong_mismatch: -10,

  // Auto-applied when role is unknown (fallback)
  unknown: 0
};

/**
 * Axis A Component - Damage If Hit
 * Impact potential, bounded to prevent heavy-weapon dominance
 *
 * Range: 0 to +16
 * Step 1: Normalize raw damage into bands
 * Step 2: Apply context dampeners
 */
export const AXIS_A_DAMAGE_BANDS = {
  // Band → Score contribution
  low: { threshold: 7, score: 4 },
  medium_low: { threshold: 11, score: 7 },
  medium: { threshold: 15, score: 10 },
  medium_high: { threshold: 19, score: 13 },
  high: { threshold: Infinity, score: 16 }
};

/**
 * Axis A Dampeners
 * Apply these AFTER band assignment, but never reduce below 0
 */
export const AXIS_A_DAMPENERS = {
  // Area weapons for single-target builds
  area_vs_single_target: -4,

  // Stun-only weapons for lethal builds
  stun_only_vs_lethal: -3,

  // Exotic damage without synergy (Ion, etc.)
  exotic_no_synergy: -2,

  // Notes: Dampeners reduce but never zero-out Axis A
  _minimum_floor: 0
};

/**
 * Axis B Component - Hit Likelihood Bias
 * MOST subtle, MOST important component
 * Composed of sub-components, capped at -15 to +20
 *
 * This represents "how often does this feel like it will hit?"
 * WITHOUT probability math.
 */

export const AXIS_B_ATTRIBUTE_ALIGNMENT = {
  // Compare weapon attack stat (STR or DEX) to character's modifiers
  // Relative difference matters, not absolute

  // Primary stat ≥ +4 differential
  strong_advantage: 10,

  // Primary stat +2 to +3
  moderate_advantage: 6,

  // Primary stat +0 to +1
  slight_advantage: 2,

  // Primary stat -1 to -2
  slight_disadvantage: -4,

  // Primary stat ≤ -3
  strong_disadvantage: -8
};

export const AXIS_B_ACCURACY_TRAITS = {
  // Trait: Accurate
  accurate: 4,

  // Trait: Inaccurate
  inaccurate: -4,

  // Autofire for single-target build
  autofire_single_target: -5,

  // Autofire for controller/area build
  autofire_controller: 5,

  // Standard, no trait
  standard: 0
};

export const AXIS_B_RANGE_COMPATIBILITY = {
  // Good range match for character's engagement distance
  good_match: 3,

  // Acceptable range match
  acceptable: 1,

  // Poor range match
  poor_match: -3,

  // Unknown/can't determine
  unknown: 0
};

/**
 * Axis B Total Cap
 * Even if all sub-components are favorable, never exceed +20
 * Even if all sub-components are unfavorable, never go below -15
 */
export const AXIS_B_CAP = {
  max: 20,
  min: -15,
  _reason: 'Ensures low accuracy does not erase high-damage weapons, and vice versa'
};

/**
 * Tradeoff Adjustment Component
 * Reality check layer - correct pathological rankings
 *
 * Range: -10 to +10
 * Purpose: Fix edge cases without dominating score
 *
 * Examples:
 *   - Heavy weapon + low STR + mobile build → -6
 *   - Light accurate weapon + mobile DEX build → +5
 *   - Armor conflicts → -8
 */
export const TRADEOFF_ADJUSTMENTS = {
  // Weapon significantly misaligned with playstyle
  heavy_vs_mobile: -6,
  light_vs_stationary: -3,

  // Weapon significantly aligned
  light_vs_mobile: 5,
  accurate_vs_lowstr: 3,

  // Armor-specific conflicts
  heavy_armor_vs_dex_weapon: -8,
  light_armor_vs_str_melee: -2,

  // Notes:
  // Tradeoffs correct, not dominate
  // Max adjustment ±10
  _max: 10,
  _reason: 'Prevent contradictory signals from destroying score'
};

/**
 * Price Bias Component
 * Reflect accessibility, NOT as a gate
 *
 * Range: -6 to +4
 * RULE: Never zero out an item due to price alone
 * Price is a nudge, not a verdict
 *
 * Price bias must never exceed:
 * - Role alignment
 * - Axis A
 * - Axis B
 */
export const PRICE_BIAS = {
  // Cheaper than average in category
  cheap: 4,
  somewhat_cheap: 2,

  // Average price
  average: 0,

  // Somewhat expensive
  somewhat_expensive: -2,

  // Very expensive (premium item)
  expensive: -4,
  very_expensive: -6,

  // CRITICAL RULE:
  _never_exceeds: 4,
  _never_dominates: ['role_alignment', 'axis_a', 'axis_b'],
  _reason: 'Price nudges, not verdicts'
};

/**
 * Sanity Checks
 *
 * If any of these are true, weights are wrong:
 * 1. High-accuracy weapon always outranks high-impact weapon
 * 2. Cheap weapon always outranks better but pricier option
 * 3. Autofire always floats to top
 * 4. Heavy armor always beats light armor at high level
 * 5. Suggestions look identical across different character builds
 *
 * If #5 is true: Something is wrong with role alignment
 * If #1 or #3 is true: Axis B is too strong
 * If #2 is true: Price bias is too strong
 * If #4 is true: Tradeoff adjustment is missing
 */
export const SANITY_CHECKS = {
  check_1: 'High-accuracy weapon should NOT always beat high-impact weapon',
  check_2: 'Cheap weapon should NOT always beat better pricier option',
  check_3: 'Autofire should NOT always float to top',
  check_4: 'Heavy armor should NOT always beat light armor universally',
  check_5: 'Suggestions MUST differ based on character build'
};

/**
 * Scoring Formula (Pseudocode)
 *
 * FinalScore = Clamp(
 *   BaseRelevance
 *   + RoleAlignment
 *   + AxisA_Damage + AxisA_Dampeners
 *   + Clamp(
 *       AxisB_Attribute + AxisB_Accuracy + AxisB_Range,
 *       AXIS_B_CAP.min,
 *       AXIS_B_CAP.max
 *     )
 *   + TradeoffAdjustment
 *   + PriceBias,
 *   0,
 *   100
 * )
 *
 * Components:
 * 1. Base Relevance (10-20): Anchor - prevents junk from ranking high
 * 2. Role Alignment (-10 to +25): PRIMARY signal - how character fights
 * 3. Axis A Damage (0-16 base, -4 to -2 dampeners): Impact potential
 * 4. Axis B Accuracy (-15 to +20 clamped): Hit likelihood bias
 * 5. Tradeoff Adjustment (-10 to +10): Reality check, correct pathologies
 * 6. Price Bias (-6 to +4): Accessibility nudge, never dominant
 *
 * Tier Assignment (from final score 0-100):
 * - Perfect: ≥90
 * - Excellent: ≥80
 * - Good: ≥70
 * - Viable: ≥55
 * - Marginal: ≥35
 * - Poor: <35
 */

/**
 * Explainability Mapping
 * Every weight must map to a sentence.
 *
 * If a weight cannot be explained, it should not exist.
 */
export const EXPLAINABILITY_MAP = {
  BASE_RELEVANCE: {
    positive: 'This weapon is usable for your character',
    negative: 'Not compatible with your proficiencies'
  },

  ROLE_ALIGNMENT: {
    strong_match: 'Matches your combat role perfectly',
    partial_match: 'Supports your combat style',
    neutral: '(no strong role signal)',
    mismatch: 'Not ideal for your combat approach'
  },

  AXIS_A_DAMAGE: {
    low: 'Light damage, best for finishing or support',
    medium_low: 'Moderate damage output',
    medium: 'Solid damage',
    medium_high: 'High damage output',
    high: 'Exceptional damage potential'
  },

  AXIS_B_ATTRIBUTE: {
    strong_advantage: 'Strong match for your primary attribute',
    moderate_advantage: 'Matches your build reasonably well',
    slight_advantage: 'Works with your attributes',
    neutral: 'No strong attribute signal',
    slight_disadvantage: "Doesn't align well with your attributes",
    strong_disadvantage: 'Poorly suited to your attributes'
  },

  AXIS_B_ACCURACY: {
    accurate: 'Has improved accuracy trait',
    inaccurate: 'Less accurate than standard',
    autofire_good: 'Autofire suits your playstyle',
    autofire_bad: 'Autofire works against your tactics',
    standard: '(standard accuracy)'
  },

  AXIS_B_RANGE: {
    good_match: 'Matches your engagement distance',
    acceptable: 'Acceptable for your range preference',
    poor_match: 'Not suited to your likely range',
    unknown: '(no range signal)'
  },

  TRADEOFF_ADJUSTMENT: {
    synergy: 'Synergizes well with your build',
    conflict: 'Conflicts with your playstyle or armor',
    neutral: '(balanced tradeoff)'
  },

  PRICE_BIAS: {
    cheap: 'Good value - cheaper than alternatives',
    average: '(average price)',
    expensive: 'Premium cost - investment item'
  }
};

/**
 * Tuning Guidance
 *
 * Start conservative. Let scores cluster.
 * Avoid large deltas between similar weapons.
 * Favor multiple good options, not one clear winner.
 *
 * If you want to tune:
 * 1. Identify pathological case (e.g., "autofire dominates")
 * 2. Find the weight causing it
 * 3. Reduce the weight cap, don't change the structure
 * 4. Rerun examples
 * 5. Check sanity checks pass
 *
 * Example tuning:
 *   Problem: Autofire weapons always top suggestions
 *   Solution: Reduce AXIS_B_ACCURACY.autofire_controller from 5 to 3
 *   (not a rewrite, just a parameter adjustment)
 */

export const TUNING_CHECKLIST = {
  step_1: 'Identify which pathological case occurs',
  step_2: 'Find the component weight causing it',
  step_3: 'Reduce weight cap (not change formula)',
  step_4: 'Rerun 5 example characters',
  step_5: 'Verify sanity checks still pass',
  step_6: 'Log before/after scores for comparison'
};

export default {
  WEIGHT_CAPS,
  BASE_RELEVANCE,
  ROLE_ALIGNMENT,
  AXIS_A_DAMAGE_BANDS,
  AXIS_A_DAMPENERS,
  AXIS_B_ATTRIBUTE_ALIGNMENT,
  AXIS_B_ACCURACY_TRAITS,
  AXIS_B_RANGE_COMPATIBILITY,
  AXIS_B_CAP,
  TRADEOFF_ADJUSTMENTS,
  PRICE_BIAS,
  SANITY_CHECKS,
  EXPLAINABILITY_MAP,
  TUNING_CHECKLIST
};
