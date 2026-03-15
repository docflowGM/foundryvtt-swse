/**
 * DETERMINISTIC MAPPING: ReasonType → MentorAtom[]
 *
 * MECHANICAL → SEMANTIC BRIDGE
 *
 * This module translates the engine's mechanical reasoning signals
 * into the mentor's semantic interpretation atoms.
 *
 * CRITICAL PROPERTY: This mapping is PURE.
 * - No actor references
 * - No randomness
 * - No state mutation
 * - Deterministic: same ReasonType always produces same atoms
 *
 * This ensures:
 * 1. Mentor interpretation is stable and reproducible
 * 2. Changes to ReasonType don't break MentorJudgmentEngine
 * 3. Atoms can be tested independently of scoring engine
 * 4. Voice rendering depends on atoms, not on raw signals
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ReasonType } from "../suggestion/SuggestionV2Contract.js";
import { MentorAtom } from "./MentorAtomTaxonomy";

/**
 * Base mapping: ReasonType → primary atoms
 *
 * Each ReasonType maps to 1–3 semantic atoms.
 * Atoms are listed in priority order (first atom is primary interpretation).
 *
 * Intensity atom (StrongSignal/ModerateSignal/WeakSignal) is added
 * separately based on signal weight.
 */
const REASON_TYPE_ATOM_BASE_MAP: Record<ReasonType, MentorAtom[]> = {
  // ─────────────────────────────────────────────────────────────────────
  // IMMEDIATE HORIZON MAPPINGS
  // ─────────────────────────────────────────────────────────────────────

  /**
   * ATTRIBUTE_SYNERGY → StrengthReinforced + ReadinessMet
   *
   * Engine says: "Candidate scales with actor's primary ability"
   * Mentor says: "Your strength in this area enables this choice"
   *
   * Atoms:
   * 1. StrengthReinforced: Primary tone is confidence in core competence
   * 2. ReadinessMet: Secondary tone is eligibility confirmation
   */
  [ReasonType.ATTRIBUTE_SYNERGY]: [
    MentorAtom.StrengthReinforced,
    MentorAtom.ReadinessMet,
  ],

  /**
   * FEAT_PREREQUISITE_MET → ReadinessMet
   *
   * Engine says: "Actor now qualifies for feat they previously couldn't take"
   * Mentor says: "You've earned the right to take this"
   *
   * Atoms:
   * 1. ReadinessMet: Sole interpretation is achievement of prerequisite
   */
  [ReasonType.FEAT_PREREQUISITE_MET]: [MentorAtom.ReadinessMet],

  /**
   * TALENT_TREE_CONTINUATION → PatternAlignment + NaturalExtension
   *
   * Engine says: "Actor is continuing a talent tree they've invested in"
   * Mentor says: "This is the natural next step on your path"
   *
   * Atoms:
   * 1. PatternAlignment: Primary tone is pattern recognition
   * 2. NaturalExtension: Secondary tone is organic progression
   */
  [ReasonType.TALENT_TREE_CONTINUATION]: [
    MentorAtom.PatternAlignment,
    MentorAtom.NaturalExtension,
  ],

  /**
   * ROLE_ALIGNMENT → PatternAlignment + IdentityConfirmed
   *
   * Engine says: "Candidate reinforces actor's established role"
   * Mentor says: "This fits the role you've chosen"
   *
   * Atoms:
   * 1. PatternAlignment: Primary tone is consistency
   * 2. IdentityConfirmed: Secondary tone is role reinforcement
   */
  [ReasonType.ROLE_ALIGNMENT]: [
    MentorAtom.PatternAlignment,
    MentorAtom.IdentityConfirmed,
  ],

  /**
   * EQUIPMENT_SYNERGY → StrengthReinforced + ImmediateUtility
   *
   * Engine says: "Candidate synergizes with actor's equipment"
   * Mentor says: "This works well with what you're carrying"
   *
   * Atoms:
   * 1. StrengthReinforced: Primary tone is capability enhancement
   * 2. ImmediateUtility: Secondary tone is practical benefit
   */
  [ReasonType.EQUIPMENT_SYNERGY]: [
    MentorAtom.StrengthReinforced,
    MentorAtom.ImmediateUtility,
  ],

  /**
   * COMBAT_STYLE_MATCH → CombatOptimization + PatternAlignment
   *
   * Engine says: "Candidate aligns with actor's combat style patterns"
   * Mentor says: "This matches how you already fight"
   *
   * Atoms:
   * 1. CombatOptimization: Primary tone is tactical effectiveness
   * 2. PatternAlignment: Secondary tone is style consistency
   */
  [ReasonType.COMBAT_STYLE_MATCH]: [
    MentorAtom.CombatOptimization,
    MentorAtom.PatternAlignment,
  ],

  /**
   * SKILL_INVESTMENT_ALIGNMENT → PatternAlignment + EfficiencyGain
   *
   * Engine says: "Candidate uses skills actor has already invested in"
   * Mentor says: "This extends skills you've already developed"
   *
   * Atoms:
   * 1. PatternAlignment: Primary tone is investment continuity
   * 2. EfficiencyGain: Secondary tone is leverage from prior work
   */
  [ReasonType.SKILL_INVESTMENT_ALIGNMENT]: [
    MentorAtom.PatternAlignment,
    MentorAtom.EfficiencyGain,
  ],

  /**
   * ACTION_ECONOMY_GAIN → EfficiencyGain + CombatOptimization
   *
   * Engine says: "Candidate reduces action economy cost or enables compression"
   * Mentor says: "This makes your actions more efficient"
   *
   * Atoms:
   * 1. EfficiencyGain: Primary tone is mechanical advantage
   * 2. CombatOptimization: Secondary tone is tactical improvement
   */
  [ReasonType.ACTION_ECONOMY_GAIN]: [
    MentorAtom.EfficiencyGain,
    MentorAtom.CombatOptimization,
  ],

  /**
   * DEFENSIVE_GAP_COVERAGE → GapCoverage + StrategicPositioning
   *
   * Engine says: "Candidate addresses a defensive weakness"
   * Mentor says: "This addresses a vulnerability you have"
   *
   * Atoms:
   * 1. GapCoverage: Primary tone is weakness remediation
   * 2. StrategicPositioning: Secondary tone is tactical improvement
   */
  [ReasonType.DEFENSIVE_GAP_COVERAGE]: [
    MentorAtom.GapCoverage,
    MentorAtom.StrategicPositioning,
  ],

  /**
   * REDUNDANCY_WARNING → RedundancyDetected
   *
   * Engine says: "Candidate overlaps with existing capabilities"
   * Mentor says: "You already have something similar"
   *
   * Atoms:
   * 1. RedundancyDetected: Sole interpretation is duplicate capability
   *
   * Note: This is a WARNING atom. Affects tone negatively.
   */
  [ReasonType.REDUNDANCY_WARNING]: [MentorAtom.RedundancyDetected],

  // ─────────────────────────────────────────────────────────────────────
  // SHORT-TERM HORIZON MAPPINGS
  // ─────────────────────────────────────────────────────────────────────

  /**
   * PRESTIGE_PROXIMITY → ThresholdApproaching + GoalAdvancement
   *
   * Engine says: "Actor is N levels away from unlocking a prestige class"
   * Mentor says: "You are approaching a significant milestone"
   *
   * Atoms:
   * 1. ThresholdApproaching: Primary tone is anticipation
   * 2. GoalAdvancement: Secondary tone is progress toward goal
   */
  [ReasonType.PRESTIGE_PROXIMITY]: [
    MentorAtom.ThresholdApproaching,
    MentorAtom.GoalAdvancement,
  ],

  /**
   * FEAT_CHAIN_SETUP → NaturalExtension + CommitmentDeclared
   *
   * Engine says: "Candidate is the next step in a feat chain"
   * Mentor says: "This is the next link in a chain you're building"
   *
   * Atoms:
   * 1. NaturalExtension: Primary tone is inevitable progression
   * 2. CommitmentDeclared: Secondary tone is path commitment
   */
  [ReasonType.FEAT_CHAIN_SETUP]: [
    MentorAtom.NaturalExtension,
    MentorAtom.CommitmentDeclared,
  ],

  /**
   * LEVEL_BREAKPOINT → ThresholdApproaching + ImmediateUtility
   *
   * Engine says: "Candidate benefits from upcoming BAB breakpoint"
   * Mentor says: "This becomes better when you level up"
   *
   * Atoms:
   * 1. ThresholdApproaching: Primary tone is upcoming milestone
   * 2. ImmediateUtility: Secondary tone is mechanical readiness
   */
  [ReasonType.LEVEL_BREAKPOINT]: [
    MentorAtom.ThresholdApproaching,
    MentorAtom.ImmediateUtility,
  ],

  /**
   * PRESTIGE_CAP_WARNING → OverextensionRisk + FutureProofing
   *
   * Engine says: "Actor is approaching prestige level cap; this won't scale"
   * Mentor says: "Consider prestige level constraints"
   *
   * Atoms:
   * 1. OverextensionRisk: Primary tone is caution about scaling
   * 2. FutureProofing: Secondary tone is forward planning
   *
   * Note: This is a WARNING atom. Affects tone with caution.
   */
  [ReasonType.PRESTIGE_CAP_WARNING]: [
    MentorAtom.OverextensionRisk,
    MentorAtom.FutureProofing,
  ],

  /**
   * TALENT_MILESTONE → ThresholdApproaching + GoalAdvancement
   *
   * Engine says: "Actor is N talents away from a significant milestone"
   * Mentor says: "You're approaching a major talent tree milestone"
   *
   * Atoms:
   * 1. ThresholdApproaching: Primary tone is milestone approach
   * 2. GoalAdvancement: Secondary tone is progress
   */
  [ReasonType.TALENT_MILESTONE]: [
    MentorAtom.ThresholdApproaching,
    MentorAtom.GoalAdvancement,
  ],

  // ─────────────────────────────────────────────────────────────────────
  // IDENTITY HORIZON MAPPINGS
  // ─────────────────────────────────────────────────────────────────────

  /**
   * IDENTITY_ALIGNMENT → IdentityConfirmed + PatternAlignment
   *
   * Engine says: "Candidate aligns with actor's declared archetype"
   * Mentor says: "This aligns with who you are"
   *
   * Atoms:
   * 1. IdentityConfirmed: Primary tone is identity affirmation
   * 2. PatternAlignment: Secondary tone is consistency
   */
  [ReasonType.IDENTITY_ALIGNMENT]: [
    MentorAtom.IdentityConfirmed,
    MentorAtom.PatternAlignment,
  ],

  /**
   * ARCHETYPE_REINFORCEMENT → IdentityConfirmed + StrengthReinforced
   *
   * Engine says: "Candidate reinforces actor's primary archetype"
   * Mentor says: "This deepens your archetype identity"
   *
   * Atoms:
   * 1. IdentityConfirmed: Primary tone is archetype affirmation
   * 2. StrengthReinforced: Secondary tone is capability reinforcement
   */
  [ReasonType.ARCHETYPE_REINFORCEMENT]: [
    MentorAtom.IdentityConfirmed,
    MentorAtom.StrengthReinforced,
  ],

  /**
   * ROLE_BIAS_REINFORCEMENT → PatternAlignment + StrengthReinforced
   *
   * Engine says: "Candidate reinforces actor's role bias pattern"
   * Mentor says: "This reinforces your preferred role"
   *
   * Atoms:
   * 1. PatternAlignment: Primary tone is bias consistency
   * 2. StrengthReinforced: Secondary tone is capability reinforcement
   */
  [ReasonType.ROLE_BIAS_REINFORCEMENT]: [
    MentorAtom.PatternAlignment,
    MentorAtom.StrengthReinforced,
  ],

  /**
   * ATTRIBUTE_BIAS_REINFORCEMENT → StrengthReinforced
   *
   * Engine says: "Candidate reinforces actor's attribute bias pattern"
   * Mentor says: "This aligns with your natural strengths"
   *
   * Atoms:
   * 1. StrengthReinforced: Sole interpretation is strength affirmation
   */
  [ReasonType.ATTRIBUTE_BIAS_REINFORCEMENT]: [MentorAtom.StrengthReinforced],

  // ─────────────────────────────────────────────────────────────────────
  // PARTY / CONTEXTUAL MAPPINGS
  // ─────────────────────────────────────────────────────────────────────

  /**
   * PARTY_ROLE_GAP → GapCoverage + StrategicPositioning
   *
   * Engine says: "Candidate fills a gap in party composition"
   * Mentor says: "Your party needs what this provides"
   *
   * Atoms:
   * 1. GapCoverage: Primary tone is gap remediation
   * 2. StrategicPositioning: Secondary tone is party tactics
   */
  [ReasonType.PARTY_ROLE_GAP]: [
    MentorAtom.GapCoverage,
    MentorAtom.StrategicPositioning,
  ],

  /**
   * STRATEGIC_DIVERSIFICATION → FutureProofing + StrategicPositioning
   *
   * Engine says: "Candidate enables tactical diversity without abandoning core role"
   * Mentor says: "This gives you flexibility while maintaining your focus"
   *
   * Atoms:
   * 1. FutureProofing: Primary tone is preparedness
   * 2. StrategicPositioning: Secondary tone is tactical flexibility
   */
  [ReasonType.STRATEGIC_DIVERSIFICATION]: [
    MentorAtom.FutureProofing,
    MentorAtom.StrategicPositioning,
  ],
};

/**
 * Get semantic atoms for a mechanical signal.
 *
 * @param reasonType - Mechanical signal type
 * @param weight - Signal weight (0–1 range)
 * @returns Array of MentorAtom values with intensity modifier
 */
export function mapReasonTypeToAtoms(
  reasonType: ReasonType,
  weight: number
): MentorAtom[] {
  const baseAtoms = REASON_TYPE_ATOM_BASE_MAP[reasonType] || [];

  // Determine intensity modifier based on weight
  const intensityAtom =
    weight > 0.2
      ? MentorAtom.StrongSignal
      : weight < 0.1
        ? MentorAtom.WeakSignal
        : MentorAtom.ModerateSignal;

  // Combine base atoms with intensity modifier
  return [...baseAtoms, intensityAtom];
}

/**
 * Validate that all ReasonType values have mappings.
 * Run once at system init to ensure no gaps.
 *
 * @throws Error if any ReasonType is unmapped
 */
export function validateReasonTypeMapping(): void {
  const reasonTypes = Object.values(ReasonType);
  const mappedTypes = Object.keys(REASON_TYPE_ATOM_BASE_MAP);

  const unmapped = reasonTypes.filter(rt => !mappedTypes.includes(rt));

  if (unmapped.length > 0) {
    throw new Error(
      `ReasonType mapping incomplete. Unmapped types: ${unmapped.join(", ")}`
    );
  }
}

/**
 * Get human-readable description of a mapping.
 * Useful for debugging and documentation.
 *
 * @param reasonType - Mechanical signal type
 * @returns Description string
 */
export function describeMappingForDebug(reasonType: ReasonType): string {
  const atoms = REASON_TYPE_ATOM_BASE_MAP[reasonType] || [];
  return `${reasonType} → [${atoms.join(", ")}]`;
}

/**
 * Get all mappings as a structured report.
 * Useful for auditing the entire translation layer.
 *
 * @returns Map of ReasonType → atoms
 */
export function getAllMappings(): Record<ReasonType, MentorAtom[]> {
  return { ...REASON_TYPE_ATOM_BASE_MAP };
}
