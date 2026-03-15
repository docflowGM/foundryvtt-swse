/**
 * REASON TYPE → REASON ATOMS MAPPING
 *
 * Deterministic translation layer between SuggestionV2 ReasonType signals
 * and existing REASON_ATOMS semantic vocabulary.
 *
 * PRINCIPLE: Pure mapping. No logic. No computation. Just translation.
 *
 * This allows MentorReasonSelector to bridge new signal architecture
 * to existing atom infrastructure without duplication or semantic drift.
 *
 * ═════════════════════════════════════════════════════════════════════════
 */

import { ReasonType } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionV2Contract.js";
import { REASON_ATOMS } from "/systems/foundryvtt-swse/scripts/engine/mentor/mentor-reason-atoms.js";

/**
 * Maps ReasonType (mechanical vocabulary) → REASON_ATOMS (semantic vocabulary)
 *
 * Each ReasonType maps to 1–2 atoms.
 * Atoms are listed in priority order (first atom is primary interpretation).
 *
 * This is the sole source of truth for signal → atom translation.
 */
export const REASON_TYPE_TO_REASON_ATOMS = {
  // ─────────────────────────────────────────────────────────────────────────
  // IMMEDIATE HORIZON
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * ATTRIBUTE_SYNERGY
   * Engine: "Scales with actor's primary ability"
   * Semantics: Readiness + Synergy (core competence enables choice)
   */
  [ReasonType.ATTRIBUTE_SYNERGY]: [
    REASON_ATOMS.ReadinessMet,
    REASON_ATOMS.SynergyPresent
  ],

  /**
   * FEAT_PREREQUISITE_MET
   * Engine: "Actor qualifies for previously blocked feat"
   * Semantics: Readiness (earned right to choose)
   */
  [ReasonType.FEAT_PREREQUISITE_MET]: [
    REASON_ATOMS.ReadinessMet
  ],

  /**
   * TALENT_TREE_CONTINUATION
   * Engine: "Continuing talent tree already invested in"
   * Semantics: Pattern + Synergy (established direction continues)
   */
  [ReasonType.TALENT_TREE_CONTINUATION]: [
    REASON_ATOMS.PatternAlignment,
    REASON_ATOMS.SynergyPresent
  ],

  /**
   * ROLE_ALIGNMENT
   * Engine: "Reinforces actor's established role"
   * Semantics: Pattern (consistency with established identity)
   */
  [ReasonType.ROLE_ALIGNMENT]: [
    REASON_ATOMS.PatternAlignment
  ],

  /**
   * EQUIPMENT_SYNERGY
   * Engine: "Synergizes with equipment actor uses"
   * Semantics: Synergy (mechanical fit with existing loadout)
   */
  [ReasonType.EQUIPMENT_SYNERGY]: [
    REASON_ATOMS.SynergyPresent
  ],

  /**
   * COMBAT_STYLE_MATCH
   * Engine: "Aligns with combat style patterns"
   * Semantics: Pattern (consistency in fighting approach)
   */
  [ReasonType.COMBAT_STYLE_MATCH]: [
    REASON_ATOMS.PatternAlignment,
    REASON_ATOMS.SynergyPresent
  ],

  /**
   * SKILL_INVESTMENT_ALIGNMENT
   * Engine: "Uses skills actor has invested in"
   * Semantics: Synergy + Pattern (builds on existing skill direction)
   */
  [ReasonType.SKILL_INVESTMENT_ALIGNMENT]: [
    REASON_ATOMS.SynergyPresent,
    REASON_ATOMS.PatternAlignment
  ],

  /**
   * ACTION_ECONOMY_GAIN
   * Engine: "Reduces action economy cost or enables compression"
   * Semantics: Synergy (mechanical advantage from combination)
   */
  [ReasonType.ACTION_ECONOMY_GAIN]: [
    REASON_ATOMS.SynergyPresent
  ],

  /**
   * DEFENSIVE_GAP_COVERAGE
   * Engine: "Addresses a defensive weakness"
   * Semantics: Risk Mitigation (reduces vulnerability)
   */
  [ReasonType.DEFENSIVE_GAP_COVERAGE]: [
    REASON_ATOMS.RiskMitigated
  ],

  /**
   * REDUNDANCY_WARNING
   * Engine: "Overlaps with existing capabilities"
   * Semantics: Synergy Missing (duplicate capability, no new benefit)
   */
  [ReasonType.REDUNDANCY_WARNING]: [
    REASON_ATOMS.SynergyMissing
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // SHORT-TERM HORIZON
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * PRESTIGE_PROXIMITY
   * Engine: "N levels away from prestige unlock"
   * Semantics: Threshold + Commitment (approaching significant commitment point)
   */
  [ReasonType.PRESTIGE_PROXIMITY]: [
    REASON_ATOMS.ThresholdApproaching,
    REASON_ATOMS.CommitmentDeclared
  ],

  /**
   * FEAT_CHAIN_SETUP
   * Engine: "Next step in feat chain"
   * Semantics: Dependency Chain + Recent Choice (natural progression)
   */
  [ReasonType.FEAT_CHAIN_SETUP]: [
    REASON_ATOMS.DependencyChain,
    REASON_ATOMS.RecentChoiceImpact
  ],

  /**
   * LEVEL_BREAKPOINT
   * Engine: "Candidate benefits from upcoming BAB/ability breakpoint"
   * Semantics: Threshold Approaching (setup for coming milestone)
   */
  [ReasonType.LEVEL_BREAKPOINT]: [
    REASON_ATOMS.ThresholdApproaching
  ],

  /**
   * PRESTIGE_CAP_WARNING
   * Engine: "Actor at prestige level cap; this won't scale"
   * Semantics: Threshold Crossed (diminishing returns at cap)
   */
  [ReasonType.PRESTIGE_CAP_WARNING]: [
    REASON_ATOMS.ThresholdCrossed
  ],

  /**
   * TALENT_MILESTONE
   * Engine: "N talents away from talent tree milestone/capstone"
   * Semantics: Threshold Approaching (milestone in sight)
   */
  [ReasonType.TALENT_MILESTONE]: [
    REASON_ATOMS.ThresholdApproaching
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // IDENTITY HORIZON
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * IDENTITY_ALIGNMENT
   * Engine: "Aligns with declared archetype"
   * Semantics: Pattern Alignment (consistency with self-perception)
   */
  [ReasonType.IDENTITY_ALIGNMENT]: [
    REASON_ATOMS.PatternAlignment
  ],

  /**
   * ARCHETYPE_REINFORCEMENT
   * Engine: "Reinforces primary archetype"
   * Semantics: Pattern Alignment (deepens established identity)
   */
  [ReasonType.ARCHETYPE_REINFORCEMENT]: [
    REASON_ATOMS.PatternAlignment,
    REASON_ATOMS.CommitmentDeclared
  ],

  /**
   * ROLE_BIAS_REINFORCEMENT
   * Engine: "Reinforces role bias pattern"
   * Semantics: Pattern Alignment (consistent with bias)
   */
  [ReasonType.ROLE_BIAS_REINFORCEMENT]: [
    REASON_ATOMS.PatternAlignment
  ],

  /**
   * ATTRIBUTE_BIAS_REINFORCEMENT
   * Engine: "Reinforces attribute bias"
   * Semantics: Synergy + Readiness (leverages existing strength)
   */
  [ReasonType.ATTRIBUTE_BIAS_REINFORCEMENT]: [
    REASON_ATOMS.SynergyPresent,
    REASON_ATOMS.ReadinessMet
  ],

  // ─────────────────────────────────────────────────────────────────────────
  // PARTY / CONTEXTUAL
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * PARTY_ROLE_GAP
   * Engine: "Fills missing role in party"
   * Semantics: Synergy (enables party effectiveness)
   */
  [ReasonType.PARTY_ROLE_GAP]: [
    REASON_ATOMS.SynergyPresent
  ],

  /**
   * STRATEGIC_DIVERSIFICATION
   * Engine: "Enables tactical diversity without abandoning core"
   * Semantics: Goal Advancement (moves toward fuller capability)
   */
  [ReasonType.STRATEGIC_DIVERSIFICATION]: [
    REASON_ATOMS.GoalAdvancement
  ]
};

/**
 * Validate that all ReasonType values have mappings.
 * Run at system init to catch incomplete mappings.
 *
 * @throws Error if any ReasonType is unmapped
 */
export function validateReasonTypeMapping() {
  const reasonTypes = Object.values(ReasonType);
  const mappedTypes = Object.keys(REASON_TYPE_TO_REASON_ATOMS);

  const unmapped = reasonTypes.filter(rt => !mappedTypes.includes(rt));

  if (unmapped.length > 0) {
    throw new Error(
      `ReasonType mapping incomplete. Unmapped: ${unmapped.join(", ")}`
    );
  }

  console.log(`✓ All ${reasonTypes.length} ReasonTypes mapped to REASON_ATOMS`);
}

/**
 * Get REASON_ATOMS for a specific ReasonType.
 *
 * @param reasonType - The mechanical signal type
 * @returns Array of REASON_ATOMS (or empty array if unmapped)
 */
export function mapReasonTypeToAtoms(reasonType) {
  return REASON_TYPE_TO_REASON_ATOMS[reasonType] || [];
}

/**
 * Get human-readable description of a mapping (for debugging).
 *
 * @param reasonType - The ReasonType to describe
 * @returns Description string
 */
export function describeReasonTypeMapping(reasonType) {
  const atoms = mapReasonTypeToAtoms(reasonType);
  if (atoms.length === 0) {
    return `${reasonType} → [UNMAPPED]`;
  }
  return `${reasonType} → [${atoms.join(", ")}]`;
}

/**
 * Get all mappings as a debug report.
 *
 * @returns Object mapping ReasonType → REASON_ATOMS[]
 */
export function getAllReasonTypeMappings() {
  return { ...REASON_TYPE_TO_REASON_ATOMS };
}
