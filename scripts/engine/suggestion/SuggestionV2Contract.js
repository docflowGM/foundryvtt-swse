/**
 * SWSE Suggestion Engine v2 – Production Contract
 *
 * ARCHITECTURAL LINCHPIN
 *
 * This contract defines the data structure flowing from SuggestionEngineCoordinator
 * through to MentorSuggestionDialog and mentor voice rendering.
 *
 * PRINCIPLES:
 * 1. Mentor depends on data snapshots, never raw engine internals
 * 2. All signals are pre-computed and weighted
 * 3. Dominance is pre-classified; mentor consumes, never recomputes
 * 4. Metadata is strictly bounded; no free-form objects
 * 5. Everything is serializable; no circular references
 *
 * GUARANTEE: No additional computation in mentor layer
 * PERFORMANCE: Signals fetched + sorted + consumed in <100ms
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────────────────
// REASON TYPE VOCABULARY
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Finite, stable vocabulary of reasoning signals.
 *
 * This enum must remain backwards-compatible.
 * New reason types can be added at the end.
 * Never remove or rename existing entries.
 */
export enum ReasonType {
  // ─────────────────────────────────────────────────────────────────────────
  // IMMEDIATE HORIZON (0.60 weight in final score)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Candidate scales with actor's primary ability score.
   * Example: High DEX actor, DEX-based feat suggested
   */
  ATTRIBUTE_SYNERGY = "ATTRIBUTE_SYNERGY",

  /**
   * Actor meets prerequisites that were previously blocking.
   * Example: Actor just reached CHA 16, now qualifies for feat requiring CHA 16
   */
  FEAT_PREREQUISITE_MET = "FEAT_PREREQUISITE_MET",

  /**
   * Actor is continuing a talent tree they've already invested in.
   * Example: Actor has Talent Tree A: Depth 2, suggesting Depth 3
   */
  TALENT_TREE_CONTINUATION = "TALENT_TREE_CONTINUATION",

  /**
   * Candidate reinforces actor's established role (Guardian, Striker, Support, etc).
   * Example: Guardian actor, defensive feat suggested
   */
  ROLE_ALIGNMENT = "ROLE_ALIGNMENT",

  /**
   * Candidate synergizes with equipment actor is using.
   * Example: Actor has lightsaber, suggesting lightsaber-specific feat
   */
  EQUIPMENT_SYNERGY = "EQUIPMENT_SYNERGY",

  /**
   * Candidate aligns with actor's combat style patterns.
   * Example: Actor favors ranged + mobility, suggesting ranged-mobility feat
   */
  COMBAT_STYLE_MATCH = "COMBAT_STYLE_MATCH",

  /**
   * Candidate uses skills actor has already invested in.
   * Example: Actor has Acrobatics 5, suggesting Acrobatics-synergy feat
   */
  SKILL_INVESTMENT_ALIGNMENT = "SKILL_INVESTMENT_ALIGNMENT",

  /**
   * Candidate reduces action economy cost or enables action compression.
   * Example: Allows bonus action → standard action consolidation
   */
  ACTION_ECONOMY_GAIN = "ACTION_ECONOMY_GAIN",

  /**
   * Candidate addresses a defensive weakness.
   * Example: Actor has low Fort save, suggesting Fort-improvement feat
   */
  DEFENSIVE_GAP_COVERAGE = "DEFENSIVE_GAP_COVERAGE",

  /**
   * WARNING: Candidate overlaps with existing capabilities.
   * Example: Actor has Expertise in Stealth, suggesting Expertise duplicate
   */
  REDUNDANCY_WARNING = "REDUNDANCY_WARNING",

  // ─────────────────────────────────────────────────────────────────────────
  // SHORT-TERM HORIZON (0.25 weight in final score)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Actor is N levels away from unlocking a prestige class.
   * Example: 2 levels from Jedi Knight
   */
  PRESTIGE_PROXIMITY = "PRESTIGE_PROXIMITY",

  /**
   * Candidate is the next step in a feat chain.
   * Example: Actor has Power Attack, suggesting Improved Trip (next in chain)
   */
  FEAT_CHAIN_SETUP = "FEAT_CHAIN_SETUP",

  /**
   * Candidate benefits from upcoming BAB breakpoint.
   * Example: Actor at BAB 6, next level hits BAB 7 (multiattack threshold)
   */
  LEVEL_BREAKPOINT = "LEVEL_BREAKPOINT",

  /**
   * WARNING: Actor is approaching prestige level cap; this feat won't scale.
   * Example: Actor has 4 prestige levels, cap is 5, suggesting non-scaling feat
   */
  PRESTIGE_CAP_WARNING = "PRESTIGE_CAP_WARNING",

  /**
   * Actor is N talents away from a significant talent tree milestone.
   * Example: 3 talents from talent tree capstone
   */
  TALENT_MILESTONE = "TALENT_MILESTONE",

  // ─────────────────────────────────────────────────────────────────────────
  // IDENTITY HORIZON (0.15 weight in final score)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Candidate aligns with actor's declared archetype.
   * Example: Jedi Guardian archetype, Guardian-specific feat suggested
   */
  IDENTITY_ALIGNMENT = "IDENTITY_ALIGNMENT",

  /**
   * Candidate reinforces actor's primary archetype.
   * Example: Guardian archetype heavily emphasizes defense; defensive feat reinforces
   */
  ARCHETYPE_REINFORCEMENT = "ARCHETYPE_REINFORCEMENT",

  /**
   * Candidate reinforces actor's role bias pattern.
   * Example: Actor has high "Frontline Engagement" bias, suggesting frontline feat
   */
  ROLE_BIAS_REINFORCEMENT = "ROLE_BIAS_REINFORCEMENT",

  /**
   * Candidate reinforces actor's attribute bias pattern.
   * Example: Actor has high STR bias, suggesting STR-scaling feat
   */
  ATTRIBUTE_BIAS_REINFORCEMENT = "ATTRIBUTE_BIAS_REINFORCEMENT",

  // ─────────────────────────────────────────────────────────────────────────
  // PARTY / CONTEXTUAL
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Candidate fills a gap in party composition.
   * Example: Party lacks healing; healer feat suggested
   */
  PARTY_ROLE_GAP = "PARTY_ROLE_GAP",

  /**
   * Candidate enables tactical diversity without abandoning core role.
   * Example: Primary striker, but can support; support feat suggested
   */
  STRATEGIC_DIVERSIFICATION = "STRATEGIC_DIVERSIFICATION"
}

// ───────────────────────────────────────────────────────────────────────────────
// REASON SIGNAL
// ───────────────────────────────────────────────────────────────────────────────

/**
 * A single weighted signal contributing to suggestion recommendation.
 *
 * This is the core unit of explanation.
 * Every suggestion contains 2–8 signals, each contributing a weighted percentage
 * to the final score.
 *
 * Signal weight is RELATIVE: sum of all signals in a suggestion ≈ 1.0
 * (normalized during construction, pre-rounded for mentor).
 */
export interface ReasonSignal {
  /**
   * Type classifier. Maps to enum value.
   * Deterministic; never varies for same input.
   */
  type: ReasonType;

  /**
   * Proportional contribution weight (0.0–1.0 range).
   *
   * Interpretation:
   * - weight > 0.20: Primary reason
   * - weight 0.10–0.20: Secondary reason
   * - weight < 0.10: Supporting detail
   *
   * Mentor sorts signals by weight descending.
   * Only top 2–4 are surfaced to player.
   */
  weight: number;

  /**
   * Which scoring horizon produced this signal.
   * Required for mentor dominance analysis.
   *
   * Used by VoiceRegistry to determine tone:
   * - immediate dominant → pragmatic tone
   * - shortTerm dominant → strategic tone
   * - identity dominant → affirmational tone
   */
  horizon: "immediate" | "shortTerm" | "identity";

  /**
   * Bounded, flat metadata for explanation generation.
   * Never contains nested objects or raw engine references.
   * Always serializable.
   */
  metadata: ReasonMetadata;
}

// ───────────────────────────────────────────────────────────────────────────────
// REASON METADATA
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Metadata for a specific signal.
 *
 * Strictly bounded. Use only the fields that apply to your signal type.
 * No free-form objects; no nested structures.
 *
 * All values must be primitives (string, number, boolean).
 */
export interface ReasonMetadata {
  // ─────────────────────────────────────────────────────────────────────────
  // ABILITY/ATTRIBUTE SIGNALS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Which ability score this signal is about.
   * Example: "dex" for ATTRIBUTE_SYNERGY involving dexterity
   */
  attribute?: "str" | "dex" | "con" | "int" | "wis" | "cha";

  /**
   * The actor's score in this ability.
   * Example: 16 for high dex
   */
  attributeScore?: number;

  // ─────────────────────────────────────────────────────────────────────────
  // PRESTIGE SIGNALS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Name of prestige class this signal is about.
   * Example: "Jedi Knight"
   */
  prestigeClass?: string;

  /**
   * Number of levels until prestige unlock.
   * Example: 2 (actor is 2 levels away from Jedi Knight)
   */
  levelsToUnlock?: number;

  // ─────────────────────────────────────────────────────────────────────────
  // FEAT/TALENT CHAIN SIGNALS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Name of the feat/talent chain.
   * Example: "Power Attack Chain"
   */
  chainName?: string;

  /**
   * Next item in the chain (what comes after this suggestion).
   * Example: "Improved Trip"
   */
  nextInChain?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // TALENT TREE SIGNALS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Name of talent tree.
   * Example: "Force Sensitivity"
   */
  talentTree?: string;

  /**
   * Current depth in this tree.
   * Example: 2 (actor has selected Depth 1 and 2)
   */
  currentDepth?: number;

  /**
   * Milestone depth approaching.
   * Example: 5 (capstone at Depth 5)
   */
  milestoneDepth?: number;

  // ─────────────────────────────────────────────────────────────────────────
  // ROLE SIGNALS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Role descriptor.
   * Example: "Frontline Defender"
   */
  role?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // EQUIPMENT SIGNALS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Equipment category or tag.
   * Example: "lightsaber" or "ranged_weapon"
   */
  equipmentTag?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // SKILL SIGNALS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Skill name.
   * Example: "Acrobatics"
   */
  skill?: string;

  /**
   * Skill rank (trained levels).
   * Example: 3
   */
  skillRank?: number;

  // ─────────────────────────────────────────────────────────────────────────
  // PARTY SIGNALS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * What role is missing in party.
   * Example: "Healer"
   */
  missingRole?: string;

  // ─────────────────────────────────────────────────────────────────────────
  // DEFENSE SIGNALS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Type of defense being addressed.
   * Example: "fort" for Fortitude save
   */
  defenseType?: "fort" | "ref" | "will";

  // ─────────────────────────────────────────────────────────────────────────
  // FALLBACK
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generic label if none of above apply.
   * Keep short and identifier-like.
   * Example: "expertise_match"
   */
  label?: string;
}

// ───────────────────────────────────────────────────────────────────────────────
// IDENTITY CONTEXT (SNAPSHOT ONLY)
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Distilled identity snapshot for mentor consumption.
 *
 * This is NOT the full IdentityEngine output.
 * It is a pre-processed summary containing only what mentor needs.
 *
 * CONSTRAINT: Mentor never calls IdentityEngine.
 * Mentor consumes this snapshot.
 */
export interface IdentityContext {
  /**
   * Primary archetype name.
   * Example: "Jedi" or "Guardian"
   * Required for voice routing.
   */
  primaryArchetype: string;

  /**
   * Secondary archetype (if multiclass/multiarch).
   * Example: "Soldier"
   */
  secondaryArchetype?: string;

  /**
   * Dominant role (derived from mechanicalBias).
   * Example: "Frontline Defender"
   */
  dominantRole?: string;

  /**
   * Dominant ability (derived from attributeBias).
   * Example: "str"
   */
  dominantAttribute?: "str" | "dex" | "con" | "int" | "wis" | "cha";

  /**
   * Top 3 mechanical biases (not all of them).
   * Sorted by value descending.
   * Example: [{ key: "frontline", value: 0.8 }, { key: "damage", value: 0.6 }, ...]
   *
   * Do NOT pass entire mechanicalBias map.
   * Mentor must not process unbounded data.
   */
  topMechanicalBiases: Array<{
    key: string;
    value: number;
  }>;

  /**
   * Top 3 role biases (not all of them).
   * Example: [{ key: "striker", value: 0.7 }, { key: "control", value: 0.5 }, ...]
   */
  topRoleBiases: Array<{
    key: string;
    value: number;
  }>;

  /**
   * Top 3 attribute biases (not all of them).
   * Example: [{ key: "str", value: 0.8 }, { key: "con", value: 0.6 }, ...]
   */
  topAttributeBiases: Array<{
    key: string;
    value: number;
  }>;
}

// ───────────────────────────────────────────────────────────────────────────────
// BUILD INTENT CONTEXT (SNAPSHOT ONLY)
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Build trajectory snapshot for short-term strategy awareness.
 *
 * This is NOT the full BuildIntent.
 * It represents upcoming milestones within the next 3 levels.
 *
 * CONSTRAINT: Mentor never calls BuildIntent engine.
 * Mentor consumes this snapshot.
 */
export interface BuildIntentContext {
  /**
   * Intended prestige class (if declared).
   * Example: "Jedi Knight"
   */
  intendedPrestige?: string;

  /**
   * Number of levels until prestige unlock.
   * Example: 2
   */
  levelsUntilPrestige?: number;

  /**
   * Active build themes (declared by player or inferred).
   * Example: ["Force User", "Defender", "Leader"]
   */
  activeThemes?: string[];

  /**
   * Upcoming milestones within next 3 levels.
   * Sorted by level ascending.
   *
   * Used for short-term strategic commentary.
   * Example: [
   *   { type: "bab", level: 7, description: "BAB +5 (second attack)" },
   *   { type: "prestige", level: 8, description: "Jedi Knight available" },
   *   { type: "talent", level: 10, description: "Force Technique unlocked" }
   * ]
   */
  upcomingMilestones?: Array<{
    type: "feat" | "talent" | "bab" | "prestige" | "other";
    level: number;
    description: string;
  }>;
}

// ───────────────────────────────────────────────────────────────────────────────
// SUGGESTION SCORING
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Pre-computed scoring data for a suggestion.
 *
 * All three-horizon scores are included.
 * Dominance is pre-classified.
 *
 * No mentor recomputation allowed.
 */
export interface SuggestionScoring {
  /**
   * Immediate horizon score (0–1 range).
   * Reflects current state synergy.
   * Weight: 0.60 in final score.
   */
  immediate: number;

  /**
   * Short-term horizon score (0–1 range).
   * Reflects proximity to unlocks + breakpoints.
   * Weight: 0.25 in final score.
   */
  shortTerm: number;

  /**
   * Identity horizon score (0–1 range).
   * Reflects archetype/role/attribute alignment.
   * Weight: 0.15 in final score.
   */
  identity: number;

  /**
   * Final weighted score (0–1 range).
   * Calculated as:
   * final = (immediate × 0.6) + (shortTerm × 0.25) + (identity × 0.15)
   */
  final: number;

  /**
   * Confidence level (0–1 range).
   * Derived from:
   * - Score separation (gap between top and second-best)
   * - Signal coherence (agreement across signals)
   * - Dominance clarity (how clearly one horizon dominates)
   *
   * Used for mentor tone certainty.
   * Range interpretation:
   * - 0.8+: Very High confidence
   * - 0.6–0.8: Good confidence
   * - 0.4–0.6: Moderate confidence
   * - <0.4: Low confidence / exploratory
   */
  confidence: number;

  /**
   * Pre-classified dominant horizon.
   * Determined by which of (immediate, shortTerm, identity) is largest.
   *
   * This MUST be pre-computed by SuggestionEngineCoordinator.
   * Mentor consumes it; never recalculates.
   *
   * Used by VoiceRegistry to select tone:
   * - "immediate" → pragmatic, focused on current state
   * - "shortTerm" → strategic, forward-looking
   * - "identity" → affirmational, role-reinforcing
   */
  dominantHorizon: "immediate" | "shortTerm" | "identity";
}

// ───────────────────────────────────────────────────────────────────────────────
// SUGGESTION V2 (AUTHORITATIVE CONTRACT)
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Complete suggestion object flowing from SuggestionEngineCoordinator
 * through MentorReasonSelector → MentorSuggestionDialog → Voice Rendering.
 *
 * This is the linchpin contract.
 * It ensures mentor receives structured signals, not post-hoc text.
 *
 * GUARANTEE: Zero recomputation in mentor layer.
 * GUARANTEE: All data is serializable.
 * GUARANTEE: No circular engine dependencies.
 */
export interface SuggestionV2 {
  // ─────────────────────────────────────────────────────────────────────────
  // IDENTIFICATION & PRESENTATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Unique suggestion ID.
   * Used for logging, caching, deduplication.
   * Example: "feat_power_attack_level5"
   */
  id: string;

  /**
   * Item name (feat, talent, prestige class, etc).
   * Example: "Power Attack"
   */
  name: string;

  /**
   * Suggestion tier (0–6 range).
   * Reflects ranking priority independent of scoring.
   * Example: 3 (CATEGORY_SYNERGY)
   *
   * Used for visual presentation (icon, badge, color).
   */
  tier: number;

  /**
   * Icon class for UI presentation.
   * Example: "fa-solid fa-crossed-swords"
   */
  icon: string;

  // ─────────────────────────────────────────────────────────────────────────
  // SCORING (THE SEAM)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Pre-computed scoring breakdown.
   * Contains all three horizons + dominance + confidence.
   * This is what flows to mentor voice routing.
   */
  scoring: SuggestionScoring;

  // ─────────────────────────────────────────────────────────────────────────
  // REASONING SIGNALS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Array of weighted signals contributing to this suggestion.
   * Typically 2–8 signals per suggestion.
   * Sorted by weight descending.
   *
   * Each signal is:
   * - Typed (ReasonType)
   * - Weighted (proportional contribution)
   * - Horizoned (which scoring layer produced it)
   * - Metadata-rich (enough to explain + generate atoms)
   *
   * Mentor consumes these directly.
   * MentorReasonSelector converts signals → atoms.
   * MentorJudgmentEngine converts atoms → voice.
   */
  signals: ReasonSignal[];

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT SNAPSHOTS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Actor identity snapshot.
   * Contains primary archetype, top biases, dominant role.
   * NOT full IdentityEngine output.
   *
   * Used by VoiceRegistry for archetype-aware voice selection.
   */
  identityContext: IdentityContext;

  /**
   * Build intent snapshot.
   * Contains intended prestige path, upcoming milestones within +3 levels.
   * NOT full BuildIntent output.
   *
   * Used for short-term strategic commentary.
   */
  buildContext: BuildIntentContext;
}

// ───────────────────────────────────────────────────────────────────────────────
// EXPORT TYPES FOR CONSUMERS
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Type aliases for common consumer patterns.
 */
export type ReasonSignalArray = ReasonSignal[];

export interface SuggestionCollection {
  suggestions: SuggestionV2[];
  generatedAt: number;
  actorId: string;
}

// ───────────────────────────────────────────────────────────────────────────────
// CONSUMER ASSERTION HELPERS
// ───────────────────────────────────────────────────────────────────────────────

/**
 * Validate that a suggestion object conforms to SuggestionV2 contract.
 * Use in mentor layer for defensive assertions.
 */
export function assertSuggestionV2(obj: unknown): asserts obj is SuggestionV2 {
  if (!obj || typeof obj !== "object") {
    throw new Error("Suggestion is not an object");
  }

  const s = obj as Record<string, unknown>;

  if (typeof s.id !== "string") throw new Error("Missing or invalid id");
  if (typeof s.name !== "string") throw new Error("Missing or invalid name");
  if (typeof s.tier !== "number") throw new Error("Missing or invalid tier");
  if (typeof s.icon !== "string") throw new Error("Missing or invalid icon");

  if (!s.scoring || typeof s.scoring !== "object")
    throw new Error("Missing or invalid scoring");
  const scoring = s.scoring as Record<string, unknown>;
  if (typeof scoring.immediate !== "number") throw new Error("Invalid immediate score");
  if (typeof scoring.shortTerm !== "number") throw new Error("Invalid shortTerm score");
  if (typeof scoring.identity !== "number") throw new Error("Invalid identity score");
  if (typeof scoring.final !== "number") throw new Error("Invalid final score");
  if (typeof scoring.confidence !== "number") throw new Error("Invalid confidence");
  if (
    typeof scoring.dominantHorizon !== "string" ||
    !["immediate", "shortTerm", "identity"].includes(scoring.dominantHorizon)
  )
    throw new Error("Invalid dominantHorizon");

  if (!Array.isArray(s.signals)) throw new Error("signals must be an array");

  if (!s.identityContext || typeof s.identityContext !== "object")
    throw new Error("Missing or invalid identityContext");

  if (!s.buildContext || typeof s.buildContext !== "object")
    throw new Error("Missing or invalid buildContext");
}

/**
 * Validate a single ReasonSignal.
 */
export function assertReasonSignal(obj: unknown): asserts obj is ReasonSignal {
  if (!obj || typeof obj !== "object")
    throw new Error("Signal is not an object");

  const sig = obj as Record<string, unknown>;

  if (typeof sig.type !== "string" || !Object.values(ReasonType).includes(sig.type as ReasonType))
    throw new Error(`Invalid or missing signal type: ${sig.type}`);

  if (typeof sig.weight !== "number" || sig.weight < 0 || sig.weight > 1)
    throw new Error(`Invalid weight: ${sig.weight}`);

  if (
    typeof sig.horizon !== "string" ||
    !["immediate", "shortTerm", "identity"].includes(sig.horizon)
  )
    throw new Error(`Invalid horizon: ${sig.horizon}`);

  if (!sig.metadata || typeof sig.metadata !== "object")
    throw new Error("Missing or invalid metadata");
}
