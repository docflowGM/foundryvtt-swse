/**
 * MENTOR ATOM TAXONOMY – Authoritative Semantic Vocabulary
 *
 * ARCHITECTURAL FOUNDATION
 *
 * This enum defines the semantic language through which mentors interpret
 * mechanical reasoning signals.
 *
 * CRITICAL DISTINCTION:
 * - ReasonType: Engine's mechanical vocabulary (ATTRIBUTE_SYNERGY, PRESTIGE_PROXIMITY)
 * - MentorAtom: Mentor's semantic interpretation (ReadinessMet, ThresholdApproaching)
 *
 * This separation ensures:
 * 1. Engine changes don't cascade to mentor voice
 * 2. Mentor interpretation is stable and composable
 * 3. Atoms can be mapped deterministically to tone/intensity
 * 4. MentorJudgmentEngine receives consistent semantic input
 *
 * STABILITY GUARANTEE:
 * Once locked, this enum must maintain backwards compatibility.
 * New atoms can be added; existing atoms must never be removed or renamed.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/**
 * Semantic atoms representing mentor interpretation of mechanical signals.
 *
 * These atoms are the input to MentorJudgmentEngine.
 * MentorJudgmentEngine converts them to mentor-voiced explanations.
 *
 * Atoms are combinable (a signal can produce 1–3 atoms).
 * Order and composition drive tone, not individual atoms.
 */
export enum MentorAtom {
  // ───────────────────────────────────────────────────────────────────────
  // POSITIVE REINFORCEMENT ATOMS
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Signal indicates alignment with established pattern.
   * Mentor interpretation: "This continues what you're already doing well."
   *
   * Triggered by:
   * - FEAT_CHAIN_CONTINUATION
   * - TALENT_TREE_CONTINUATION
   * - SKILL_INVESTMENT_ALIGNMENT
   * - ROLE_ALIGNMENT
   *
   * Tone impact: Affirmational, encouraging
   * Intensity: Scales with conviction
   */
  PatternAlignment = "PatternAlignment",

  /**
   * Signal indicates natural next step.
   * Mentor interpretation: "This flows naturally from where you are."
   *
   * Triggered by:
   * - FEAT_CHAIN_SETUP (immediate next in chain)
   * - TALENT_MILESTONE (approaching capstone)
   * - LEVEL_BREAKPOINT (BAB threshold)
   *
   * Tone impact: Organic, inevitable
   * Intensity: Strong (clear direction)
   */
  NaturalExtension = "NaturalExtension",

  /**
   * Signal indicates core strength reinforcement.
   * Mentor interpretation: "This builds on what makes you effective."
   *
   * Triggered by:
   * - ATTRIBUTE_SYNERGY
   * - COMBAT_STYLE_MATCH
   * - EQUIPMENT_SYNERGY
   * - ROLE_BIAS_REINFORCEMENT
   *
   * Tone impact: Confident, pragmatic
   * Intensity: High (core competence)
   */
  StrengthReinforced = "StrengthReinforced",

  /**
   * Signal indicates identity confirmation.
   * Mentor interpretation: "This solidifies who you are becoming."
   *
   * Triggered by:
   * - IDENTITY_ALIGNMENT
   * - ARCHETYPE_REINFORCEMENT
   * - ATTRIBUTE_BIAS_REINFORCEMENT
   *
   * Tone impact: Affirmational, validating
   * Intensity: Medium-High (identity-level decision)
   */
  IdentityConfirmed = "IdentityConfirmed",

  /**
   * Signal indicates readiness achievement.
   * Mentor interpretation: "You have earned the right to choose this."
   *
   * Triggered by:
   * - FEAT_PREREQUISITE_MET
   * - DEFENSIVE_GAP_COVERAGE (addresses weakness)
   *
   * Tone impact: Approving, enabling
   * Intensity: Moderate (prerequisite satisfied)
   */
  ReadinessMet = "ReadinessMet",

  // ───────────────────────────────────────────────────────────────────────
  // STRATEGIC POSITIONING ATOMS
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Signal indicates approaching significant threshold.
   * Mentor interpretation: "You are nearly at a turning point."
   *
   * Triggered by:
   * - PRESTIGE_PROXIMITY (levels to unlock)
   * - TALENT_MILESTONE (approaching capstone)
   * - LEVEL_BREAKPOINT (BAB breakpoint)
   *
   * Tone impact: Forward-looking, anticipatory
   * Intensity: High (strategic milestone)
   */
  ThresholdApproaching = "ThresholdApproaching",

  /**
   * Signal indicates setup for long-term trajectory.
   * Mentor interpretation: "This moves you toward a larger goal."
   *
   * Triggered by:
   * - PRESTIGE_PROXIMITY (any distance > 0)
   * - FEAT_CHAIN_SETUP (chains to multi-level investment)
   * - STRATEGIC_DIVERSIFICATION (enables future flexibility)
   *
   * Tone impact: Visionary, strategic
   * Intensity: Moderate (long-term thinking)
   */
  LongGameSetup = "LongGameSetup",

  /**
   * Signal indicates tactical positioning opportunity.
   * Mentor interpretation: "This improves your position right now."
   *
   * Triggered by:
   * - ACTION_ECONOMY_GAIN
   * - COMBAT_STYLE_MATCH
   * - DEFENSIVE_GAP_COVERAGE
   *
   * Tone impact: Pragmatic, tactical
   * Intensity: Moderate (immediate benefit)
   */
  StrategicPositioning = "StrategicPositioning",

  /**
   * Signal indicates future-proofing against anticipated gaps.
   * Mentor interpretation: "This prepares you for what comes next."
   *
   * Triggered by:
   * - PRESTIGE_CAP_WARNING (addressed)
   * - PARTY_ROLE_GAP (filled proactively)
   * - PRESTIGE_PROXIMITY (setting up prestige)
   *
   * Tone impact: Cautious optimism, preparation
   * Intensity: Moderate (prevention-focused)
   */
  FutureProofing = "FutureProofing",

  /**
   * Signal indicates synergy opportunity across multiple domains.
   * Mentor interpretation: "Many of your strengths align here."
   *
   * Triggered by:
   * - Multiple high-weight signals in single suggestion
   * - Cross-horizon alignment (e.g., attribute + role + prestige)
   *
   * Tone impact: Affirming, comprehensive
   * Intensity: High (strong multi-axis support)
   */
  SynergyPresent = "SynergyPresent",

  // ───────────────────────────────────────────────────────────────────────
  // TACTICAL / MECHANICAL ATOMS
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Signal indicates immediate mechanical benefit.
   * Mentor interpretation: "This helps you right now."
   *
   * Triggered by:
   * - ACTION_ECONOMY_GAIN
   * - COMBAT_STYLE_MATCH (immediate playstyle)
   * - EQUIPMENT_SYNERGY
   *
   * Tone impact: Practical, straightforward
   * Intensity: Moderate (current-state benefit)
   */
  ImmediateUtility = "ImmediateUtility",

  /**
   * Signal indicates combat effectiveness improvement.
   * Mentor interpretation: "This makes you more effective in conflict."
   *
   * Triggered by:
   * - COMBAT_STYLE_MATCH
   * - ATTRIBUTE_SYNERGY (combat-relevant attribute)
   * - ACTION_ECONOMY_GAIN
   *
   * Tone impact: Confident, martial
   * Intensity: Moderate-High (combat focus)
   */
  CombatOptimization = "CombatOptimization",

  /**
   * Signal indicates efficiency or redundancy elimination.
   * Mentor interpretation: "This makes what you do more efficient."
   *
   * Triggered by:
   * - ACTION_ECONOMY_GAIN
   * - SKILL_INVESTMENT_ALIGNMENT (streamlines approach)
   *
   * Tone impact: Pragmatic, optimization-focused
   * Intensity: Moderate (incremental improvement)
   */
  EfficiencyGain = "EfficiencyGain",

  /**
   * Signal indicates gap coverage in capabilities.
   * Mentor interpretation: "This addresses something you lack."
   *
   * Triggered by:
   * - DEFENSIVE_GAP_COVERAGE
   * - PARTY_ROLE_GAP
   * - SKILL_INVESTMENT_ALIGNMENT (fills missing skill)
   *
   * Tone impact: Practical, necessity-driven
   * Intensity: Moderate-High (addresses weakness)
   */
  GapCoverage = "GapCoverage",

  // ───────────────────────────────────────────────────────────────────────
  // WARNING / RESTRAINT ATOMS
  // ───────────────────────────────────────────────────────────────────────

  /**
   * WARNING: Signal indicates capability overlap.
   * Mentor interpretation: "You already have something similar."
   *
   * Triggered by:
   * - REDUNDANCY_WARNING
   *
   * Tone impact: Cautious, questioning
   * Intensity: Moderate (not critical, but noted)
   */
  RedundancyDetected = "RedundancyDetected",

  /**
   * WARNING: Signal indicates diminishing returns or overextension.
   * Mentor interpretation: "This spreads you too thin."
   *
   * Triggered by:
   * - PRESTIGE_CAP_WARNING
   * - PARTY_ROLE_GAP (overspecializing when diversity needed)
   *
   * Tone impact: Cautionary, restraining
   * Intensity: Moderate (consider alternatives)
   */
  OverextensionRisk = "OverextensionRisk",

  /**
   * WARNING: Signal indicates identity misalignment.
   * Mentor interpretation: "This doesn't fit who you are."
   *
   * Triggered by:
   * - IDENTITY_ALIGNMENT mismatch (if weight < 0.1)
   * - ROLE_BIAS_REINFORCEMENT mismatch
   *
   * Tone impact: Questioning, redirecting
   * Intensity: Moderate (consider fit)
   */
  MisalignmentDetected = "MisalignmentDetected",

  // ───────────────────────────────────────────────────────────────────────
  // INTENSITY MODIFIERS
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Meta-atom indicating high signal weight / confidence.
   * Not a reason on its own; modifies mentor certainty.
   *
   * Triggered by:
   * - Signal weight > 0.20
   * - Multiple signals > 0.15
   * - High confidence score (> 0.75)
   *
   * Tone impact: Increases certainty, removes hedging
   * Intensity: Strong conviction
   */
  StrongSignal = "StrongSignal",

  /**
   * Meta-atom indicating moderate signal weight / confidence.
   * Not a reason on its own; indicates balanced reasoning.
   *
   * Triggered by:
   * - Signal weight 0.10–0.20
   * - Moderate confidence score (0.50–0.75)
   *
   * Tone impact: Balanced, thoughtful
   * Intensity: Measured consideration
   */
  ModerateSignal = "ModerateSignal",

  /**
   * Meta-atom indicating low signal weight / weak confidence.
   * Not a reason on its own; indicates exploratory reasoning.
   *
   * Triggered by:
   * - Signal weight < 0.10
   * - Low confidence score (< 0.50)
   *
   * Tone impact: Increases hedging, suggests consideration
   * Intensity: Exploratory, optional
   */
  WeakSignal = "WeakSignal",

  // ───────────────────────────────────────────────────────────────────────
  // DEPENDENCY / PROGRESSION ATOMS
  // ───────────────────────────────────────────────────────────────────────

  /**
   * Signal indicates commitment to a path with downstream consequences.
   * Mentor interpretation: "Choose this, and you're committed to a direction."
   *
   * Triggered by:
   * - PRESTIGE_PROXIMITY + IDENTITY_ALIGNMENT
   * - FEAT_CHAIN_SETUP (multi-level investment)
   *
   * Tone impact: Solemn, validating
   * Intensity: High (commitment-level)
   */
  CommitmentDeclared = "CommitmentDeclared",

  /**
   * Signal indicates advancement toward stated goals.
   * Mentor interpretation: "This moves you closer to your goal."
   *
   * Triggered by:
   * - PRESTIGE_PROXIMITY (levels to unlock)
   * - FEAT_CHAIN_SETUP (chain progress)
   * - TALENT_MILESTONE (milestone progress)
   *
   * Tone impact: Encouraging, progress-focused
   * Intensity: High (goal-aligned)
   */
  GoalAdvancement = "GoalAdvancement",

  /**
   * Signal indicates deviation from apparent trajectory.
   * Mentor interpretation: "This is unexpected given your path."
   *
   * Triggered by:
   * - MISALIGNMENT signals when identity conflicts
   * - Suggestion doesn't fit active themes
   *
   * Tone impact: Questioning, exploratory
   * Intensity: Moderate (seeking clarification)
   */
  GoalDeviation = "GoalDeviation",

  /**
   * Signal indicates reliance on prerequisite or chain.
   * Mentor interpretation: "This requires prior investment."
   *
   * Triggered by:
   * - FEAT_PREREQUISITE_MET (confirms prior met)
   * - FEAT_CHAIN_SETUP (depends on previous in chain)
   *
   * Tone impact: Factual, confirming
   * Intensity: Moderate (technical clarity)
   */
  DependencyChain = "DependencyChain",

  /**
   * Signal indicates recent decision impact.
   * Mentor interpretation: "Your recent choice unlocked this."
   *
   * Triggered by:
   * - FEAT_CHAIN_SETUP (recent feat enabled this)
   * - TALENT_TREE_CONTINUATION (recent level enabled this)
   *
   * Tone impact: Affirming, causal
   * Intensity: Moderate (natural consequence)
   */
  RecentChoiceImpact = "RecentChoiceImpact",
}

// ───────────────────────────────────────────────────────────────────────
// ATOM CLASSIFICATION HELPERS
// ───────────────────────────────────────────────────────────────────────

/**
 * Classify atoms into semantic categories.
 * Used for tone routing and intensity calculation.
 */
export const MentorAtomClassification = {
  /**
   * Atoms that reinforce established patterns.
   * Associated with affirmational, encouraging tone.
   */
  REINFORCEMENT: new Set([
    MentorAtom.PatternAlignment,
    MentorAtom.NaturalExtension,
    MentorAtom.StrengthReinforced,
    MentorAtom.IdentityConfirmed,
    MentorAtom.ReadinessMet,
    MentorAtom.SynergyPresent,
  ]),

  /**
   * Atoms that indicate forward-looking strategy.
   * Associated with strategic, anticipatory tone.
   */
  STRATEGIC: new Set([
    MentorAtom.ThresholdApproaching,
    MentorAtom.LongGameSetup,
    MentorAtom.StrategicPositioning,
    MentorAtom.FutureProofing,
    MentorAtom.GoalAdvancement,
  ]),

  /**
   * Atoms that indicate immediate tactical benefit.
   * Associated with pragmatic, mechanical tone.
   */
  TACTICAL: new Set([
    MentorAtom.ImmediateUtility,
    MentorAtom.CombatOptimization,
    MentorAtom.EfficiencyGain,
    MentorAtom.GapCoverage,
  ]),

  /**
   * Atoms that indicate warnings or restraint.
   * Associated with cautious, questioning tone.
   */
  WARNING: new Set([
    MentorAtom.RedundancyDetected,
    MentorAtom.OverextensionRisk,
    MentorAtom.MisalignmentDetected,
  ]),

  /**
   * Atoms that modify intensity, not reason.
   * Used to adjust mentor certainty and conviction.
   */
  INTENSITY: new Set([
    MentorAtom.StrongSignal,
    MentorAtom.ModerateSignal,
    MentorAtom.WeakSignal,
  ]),

  /**
   * Atoms that indicate progression/commitment.
   * Associated with solemn, consequential tone.
   */
  PROGRESSION: new Set([
    MentorAtom.CommitmentDeclared,
    MentorAtom.GoalAdvancement,
    MentorAtom.GoalDeviation,
    MentorAtom.DependencyChain,
    MentorAtom.RecentChoiceImpact,
  ]),
};

/**
 * Determine primary tone category from atom set.
 * First dominant category wins.
 *
 * @param atoms - Array of MentorAtom values
 * @returns Primary tone category
 */
export function determinePrimaryToneCategory(
  atoms: MentorAtom[]
): keyof typeof MentorAtomClassification {
  const atomSet = new Set(atoms);

  // Check in priority order
  if ([...atomSet].some(a => MentorAtomClassification.PROGRESSION.has(a)))
    return "PROGRESSION";
  if ([...atomSet].some(a => MentorAtomClassification.WARNING.has(a)))
    return "WARNING";
  if ([...atomSet].some(a => MentorAtomClassification.STRATEGIC.has(a)))
    return "STRATEGIC";
  if ([...atomSet].some(a => MentorAtomClassification.REINFORCEMENT.has(a)))
    return "REINFORCEMENT";
  if ([...atomSet].some(a => MentorAtomClassification.TACTICAL.has(a)))
    return "TACTICAL";

  return "TACTICAL"; // Default fallback
}

/**
 * Extract intensity from atom set.
 * Returns "high", "moderate", or "low" based on intensity modifiers.
 *
 * @param atoms - Array of MentorAtom values
 * @returns Intensity level
 */
export function extractIntensityFromAtoms(
  atoms: MentorAtom[]
): "high" | "moderate" | "low" {
  const atomSet = new Set(atoms);

  if (atomSet.has(MentorAtom.StrongSignal)) return "high";
  if (atomSet.has(MentorAtom.WeakSignal)) return "low";
  return "moderate";
}

/**
 * Assert that a value is a valid MentorAtom.
 */
export function assertMentorAtom(value: unknown): asserts value is MentorAtom {
  if (!Object.values(MentorAtom).includes(value as MentorAtom)) {
    throw new Error(`Invalid MentorAtom: ${value}`);
  }
}

/**
 * Validate an array of atoms.
 */
export function assertMentorAtoms(
  values: unknown
): asserts values is MentorAtom[] {
  if (!Array.isArray(values)) {
    throw new Error("Atoms must be an array");
  }
  for (const v of values) {
    assertMentorAtom(v);
  }
}
