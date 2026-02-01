/**
 * MENTOR REASON ATOMS - Why Mentors React
 *
 * Reason Atoms explain WHY a mentor reacted to a choice or situation.
 * Reasons are factual, inspectable, and traceable to character state.
 *
 * Mentors may include 0-3 reasons per reaction.
 * Reasons are NEVER enumerated in dialogue.
 * Reasons are exposed ONLY via UI inspection ("Why?" panels, tooltips, etc).
 *
 * This axis enables players to understand mentor decisions without dialogue
 * becoming mechanical or didactic.
 */

/**
 * Canonical Reason Atoms
 * Organized by semantic category, but all are equivalent at runtime.
 */
export const REASON_ATOMS = {
  // ========================================================================
  // PATTERN ALIGNMENT - How choice matches detected build direction
  // ========================================================================

  /**
   * PatternAlignment
   * The choice aligns with the mentor's understanding of the character's
   * primary archetype or build direction.
   * Example: Choosing a feat that synergizes with detected Jedi path.
   */
  PatternAlignment: "PatternAlignment",

  /**
   * PatternConflict
   * The choice conflicts with or deviates from the character's primary
   * build direction or established archetype.
   * Example: Taking a feat that contradicts detected Scout specialization.
   */
  PatternConflict: "PatternConflict",

  // ========================================================================
  // COMMITMENT & MEMORY - Recent choices and stated direction
  // ========================================================================

  /**
   * RecentChoiceImpact
   * The choice has a direct mechanical impact based on recent character decisions.
   * Example: Synergizes with talent taken two levels ago.
   */
  RecentChoiceImpact: "RecentChoiceImpact",

  /**
   * CommitmentDeclared
   * The choice is consistent with a soft commitment the mentor detected
   * (e.g., archetype or prestige class direction).
   * Example: Continuing down Jedi prestige class path.
   */
  CommitmentDeclared: "CommitmentDeclared",

  /**
   * CommitmentIgnored
   * The choice ignores or contradicts a detected soft commitment.
   * Example: Abandoning a prestige class trajectory mid-stream.
   */
  CommitmentIgnored: "CommitmentIgnored",

  // ========================================================================
  // SYNERGY & MECHANICS - How options interact
  // ========================================================================

  /**
   * SynergyPresent
   * The choice synergizes strongly with existing abilities, feats, or talents.
   * Example: Choosing a talent that amplifies existing feat benefits.
   */
  SynergyPresent: "SynergyPresent",

  /**
   * SynergyMissing
   * The choice lacks synergy with existing abilities or leaves a gap.
   * Example: Choosing a feat without supporting skills or abilities.
   */
  SynergyMissing: "SynergyMissing",

  /**
   * DependencyChain
   * The choice unlocks or enables future options (prerequisite awareness).
   * Example: Force Training enabling Jedi prestige class.
   * Note: Never enumerate prerequisites in dialogue. Reason may appear in UI only.
   */
  DependencyChain: "DependencyChain",

  /**
   * OpportunityCostIncurred
   * The choice forecloses or reduces other viable build paths.
   * Example: Heavy commitment to Force Powers reduces tech specialization.
   */
  OpportunityCostIncurred: "OpportunityCostIncurred",

  // ========================================================================
  // RISK & RESOURCE - Vulnerability and sustainability
  // ========================================================================

  /**
   * RiskIncreased
   * The choice increases exposure to certain damage types or combat scenarios.
   * Example: Low DEX choices in a party without tank.
   */
  RiskIncreased: "RiskIncreased",

  /**
   * RiskMitigated
   * The choice reduces vulnerability or addresses a detected weakness.
   * Example: Improving a defense that was previously weak.
   */
  RiskMitigated: "RiskMitigated",

  /**
   * ThresholdApproaching
   * The character is approaching a mechanical threshold or capacity limit.
   * Example: DSP approaching saturation, or skill points limited.
   */
  ThresholdApproaching: "ThresholdApproaching",

  /**
   * ThresholdCrossed
   * The choice crosses or violates a mechanical threshold or constraint.
   * Example: Taking a feat that exceeds prestige class feat limits.
   */
  ThresholdCrossed: "ThresholdCrossed",

  // ========================================================================
  // GROWTH & READINESS - Progression and competence
  // ========================================================================

  /**
   * ReadinessMet
   * The character's level, stats, or prior choices prepare them for this step.
   * Example: Sufficient Wisdom for Force powers at this level.
   */
  ReadinessMet: "ReadinessMet",

  /**
   * ReadinessLacking
   * The character lacks necessary prerequisites or foundational abilities.
   * Example: Low ability scores for a demanding prestige class.
   */
  ReadinessLacking: "ReadinessLacking",

  /**
   * GrowthStageShift
   * The character is entering a new phase of gameplay (e.g., level 6, prestige).
   * Example: Level 6 unlock of prestige class options.
   */
  GrowthStageShift: "GrowthStageShift",

  // ========================================================================
  // PLAYER INTENT & EXPLORATION - Goals and variance
  // ========================================================================

  /**
   * GoalAdvancement
   * The choice progresses toward an inferred or stated character goal.
   * Example: Moving closer to detected prestige class aspiration.
   */
  GoalAdvancement: "GoalAdvancement",

  /**
   * GoalDeviation
   * The choice moves away from an inferred goal or stated commitment.
   * Example: Abandoning prestige class trajectory.
   */
  GoalDeviation: "GoalDeviation",

  /**
   * ExplorationSignal
   * The choice suggests the player is exploring new build directions.
   * Example: Taking feats from an unexpected theme.
   */
  ExplorationSignal: "ExplorationSignal",

  /**
   * IndecisionSignal
   * The choice pattern suggests uncertainty or vacillation.
   * Example: Repeated backing-and-filling between contradictory paths.
   */
  IndecisionSignal: "IndecisionSignal",

  /**
   * NewOptionRevealed
   * A prestige class or major option just became available.
   * Example: Just hit level 6 and new prestige classes unlocked.
   */
  NewOptionRevealed: "NewOptionRevealed",

  /**
   * RareChoice
   * The choice is unusual or uncommon for this character or archetype.
   * Example: Jedi taking heavy Tech skill investment.
   */
  RareChoice: "RareChoice"
};

/**
 * All Reason Atoms as an array for iteration.
 * Useful for validation and UI enumeration.
 */
export const REASON_ATOM_LIST = Object.values(REASON_ATOMS);

/**
 * Reason Atom categories for grouping and UI presentation.
 */
export const REASON_CATEGORIES = {
  pattern: [
    REASON_ATOMS.PatternAlignment,
    REASON_ATOMS.PatternConflict
  ],

  commitment: [
    REASON_ATOMS.RecentChoiceImpact,
    REASON_ATOMS.CommitmentDeclared,
    REASON_ATOMS.CommitmentIgnored
  ],

  synergy: [
    REASON_ATOMS.SynergyPresent,
    REASON_ATOMS.SynergyMissing,
    REASON_ATOMS.DependencyChain,
    REASON_ATOMS.OpportunityCostIncurred
  ],

  risk: [
    REASON_ATOMS.RiskIncreased,
    REASON_ATOMS.RiskMitigated,
    REASON_ATOMS.ThresholdApproaching,
    REASON_ATOMS.ThresholdCrossed
  ],

  growth: [
    REASON_ATOMS.ReadinessMet,
    REASON_ATOMS.ReadinessLacking,
    REASON_ATOMS.GrowthStageShift
  ],

  intent: [
    REASON_ATOMS.GoalAdvancement,
    REASON_ATOMS.GoalDeviation,
    REASON_ATOMS.ExplorationSignal,
    REASON_ATOMS.IndecisionSignal,
    REASON_ATOMS.NewOptionRevealed,
    REASON_ATOMS.RareChoice
  ]
};

/**
 * Validate that a reason atom is recognized.
 * @param {string} reason - The reason atom to validate
 * @returns {boolean} True if reason is a valid Reason Atom
 */
export function isValidReasonAtom(reason) {
  return REASON_ATOM_LIST.includes(reason);
}

/**
 * Get the category for a reason atom.
 * @param {string} reason - The reason atom
 * @returns {string|null} The category name, or null if not found
 */
export function getReasonCategory(reason) {
  for (const [category, reasons] of Object.entries(REASON_CATEGORIES)) {
    if (reasons.includes(reason)) {
      return category;
    }
  }
  return null;
}

/**
 * Filter a list of reasons by category.
 * @param {string[]} reasons - Array of reason atoms
 * @param {string} category - The category to filter by
 * @returns {string[]} Reasons in the specified category
 */
export function filterReasonsByCategory(reasons, category) {
  const categoryReasons = REASON_CATEGORIES[category] || [];
  return reasons.filter(r => categoryReasons.includes(r));
}
