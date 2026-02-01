/**
 * Mentor Reason Renderer
 *
 * Maps reason atom IDs → canonical explanation text strings
 * These strings are the AUTHORITATIVE explanations for why a mentor reacted.
 *
 * Reasons are FACTUAL and INSPECTABLE ONLY via UI (never in dialogue).
 * Reasons are never spoken. They are available to players through:
 * - "Why?" expandable panels
 * - Tooltips
 * - Inspection views
 *
 * DO NOT alter, paraphrase, or stylistically modify any reason text.
 * All reason strings are final and authoritative.
 */

/**
 * Canonical Reason Text Mappings
 * Maps reason keys → human-readable explanation strings
 *
 * These strings explain mechanically and factually WHY a mentor reacted.
 * They are inspectable by players but never appear in spoken dialogue.
 */
export const REASON_TEXT_MAP = {
  // ========================================================================
  // ATTRIBUTE-BASED REASONS (15 total)
  // ========================================================================
  high_strength: "because your physical power supports this kind of approach",
  high_dexterity: "because your agility naturally aligns with this option",
  high_constitution: "because your resilience supports sustained effort here",
  high_intelligence: "because your analytical ability suits this direction",
  high_wisdom: "because your awareness supports sound judgment here",
  high_charisma: "because your presence carries influence in this area",

  balanced_physical_attributes: "because your physical capabilities are evenly developed",
  balanced_mental_attributes: "because your mental faculties are well balanced",

  strength_exceeds_average: "because your strength stands above the norm",
  dexterity_exceeds_average: "because your dexterity stands above the norm",
  constitution_exceeds_average: "because your endurance stands above the norm",
  intelligence_exceeds_average: "because your intellect stands above the norm",
  wisdom_exceeds_average: "because your insight stands above the norm",
  charisma_exceeds_average: "because your force of personality stands above the norm",

  attribute_matches_feature_focus: "because your strongest traits align with the focus of this option",

  // ========================================================================
  // SKILL-BASED REASONS (15 total)
  // ========================================================================
  trained_relevant_skill: "because you already have training in a related discipline",
  multiple_related_skills: "because several of your skills point in this direction",
  high_skill_ranks: "because you have invested deeply in relevant expertise",
  skill_matches_attribute_strength: "because your skills align with your natural strengths",
  skill_complements_existing_role: "because this skill use fits your established role",
  underutilized_strong_skill: "because a strong capability you possess is not yet fully used",
  skill_specialization_forming: "because your skill choices show a clear specialization forming",
  skill_breadth_supports_choice: "because your range of skills supports this option",
  skill_chain_continuity: "because this continues a pattern in your skill development",
  skill_prerequisite_met: "because existing requirements for this option are already satisfied",

  defensive_skill_investment: "because your skill investment emphasizes protection and survival",
  mobility_skill_investment: "because your skill investment emphasizes movement and positioning",
  social_skill_investment: "because your skill investment emphasizes interaction and influence",
  technical_skill_investment: "because your skill investment emphasizes technical capability",
  force_skill_investment: "because your skill investment emphasizes force-related aptitude",

  // ========================================================================
  // FEAT-BASED REASONS (15 total)
  // ========================================================================
  has_similar_feat: "because you already possess a closely related capability",
  has_complementary_feat: "because an existing capability supports this option",
  feat_chain_continuation: "because this follows a clear progression in your capabilities",
  feat_prerequisite_met: "because all current requirements for this option are met",
  feat_synergy_present: "because your existing capabilities reinforce this choice",
  repeated_feat_theme: "because your previous selections share a consistent theme",
  feat_supports_existing_style: "because this aligns with how you already operate",
  feat_supports_existing_role: "because this supports the role you have established",
  feat_unlocked_by_recent_choice: "because a recent decision made this option available",
  feat_reinforces_core_strength: "because this reinforces what you already do well",

  defensive_feat_investment: "because your capabilities emphasize defense and durability",
  offensive_feat_investment: "because your capabilities emphasize direct impact",
  tactical_feat_investment: "because your capabilities emphasize positioning and timing",
  force_feat_investment: "because your capabilities emphasize force-based expression",
  utility_feat_investment: "because your capabilities emphasize flexibility and support",

  // ========================================================================
  // TALENT-BASED REASONS (15 total)
  // ========================================================================
  talent_tree_continuation: "because this continues a path you are already on",
  talent_synergy_present: "because your existing talents work well with this option",
  talent_prerequisite_met: "because the conditions for this option are already satisfied",
  talent_supports_existing_role: "because this reinforces your current role",
  repeated_talent_theme: "because your talents show a consistent focus",
  talent_specialization_forming: "because your talent choices indicate a specialization",

  defensive_talent_path: "because your talents emphasize protection and resilience",
  offensive_talent_path: "because your talents emphasize direct confrontation",
  control_talent_path: "because your talents emphasize influence and control",
  support_talent_path: "because your talents emphasize assistance and reinforcement",

  talent_unlocked_by_level: "because recent advancement made this available",
  talent_unlocked_by_feat: "because an existing capability enabled this option",
  talent_unlocked_by_class: "because your current role grants access to this option",
  talent_reinforces_identity: "because this strengthens the identity you have established",
  talent_complements_previous_choice: "because this pairs naturally with a recent decision",

  // ========================================================================
  // CLASS-BASED REASONS (15 total)
  // ========================================================================
  class_feature_synergy: "because your existing features align with this option",
  class_role_alignment: "because this matches the role your class emphasizes",
  class_identity_reinforced: "because this strengthens your class identity",
  class_prerequisite_met: "because all class-related conditions are already met",
  class_level_threshold_reached: "because you have reached a key progression point",

  single_class_focus: "because your progression remains concentrated in one path",
  multiclass_synergy_present: "because your combined paths support this option",
  multiclass_tension_present: "because this highlights a contrast in your current paths",

  class_feature_unlocked: "because a newly available feature supports this choice",
  class_scaling_benefit: "because this option benefits from your continued progression",

  defensive_class_features: "because your class features emphasize protection",
  offensive_class_features: "because your class features emphasize direct action",
  force_class_features: "because your class features emphasize force use",
  leadership_class_features: "because your class features emphasize coordination and command",
  technical_class_features: "because your class features emphasize technical mastery",

  // ========================================================================
  // PRESTIGE-BASED REASONS (13 total)
  // ========================================================================
  prestige_prerequisites_nearly_met: "because you are close to meeting advanced entry conditions",
  prestige_prerequisites_met: "because all advanced entry conditions are satisfied",
  prestige_identity_alignment: "because this aligns with the identity you are forming",
  prestige_synergy_with_current_build: "because this option fits your current development pattern",
  prestige_path_consistency: "because this continues your established direction",
  prestige_path_divergence: "because this represents a meaningful shift from your current path",
  prestige_unlocked_by_recent_choice: "because a recent decision opened this path",
  prestige_scaling_synergy: "because this option benefits from ongoing progression",
  prestige_specialization_threshold: "because you have reached a point suited for specialization",
  prestige_entry_window: "because this is an appropriate moment for entry",
  multiple_prestige_eligibility: "because more than one advanced path is currently available",
  prestige_tradeoff_present: "because this option introduces a clear exchange of strengths",
  prestige_identity_shift: "because this would change how your role is defined",

  // ========================================================================
  // LEVEL & PROGRESSION-BASED REASONS (12 total)
  // ========================================================================
  current_level_supports_choice: "because your current advancement supports this option",
  level_based_unlock: "because progression has made this available",
  early_level_flexibility: "because your current stage allows broader exploration",
  mid_level_specialization: "because your progression favors more focused development",
  late_level_refinement: "because refinement is emphasized at this stage",
  power_curve_alignment: "because this aligns with your current growth curve",
  progression_milestone_reached: "because you have reached a notable progression point",
  choice_scales_with_level: "because this option remains relevant as you advance",
  choice_scales_with_class_level: "because this option benefits from continued role advancement",
  progression_gap_detected: "because an area of development is currently underrepresented",
  progression_synergy_present: "because your progression elements reinforce each other",
  progression_focus_consistency: "because this maintains a consistent development focus"
};

/**
 * Get the canonical explanation text for a reason key.
 * @param {string} reasonKey - The reason identifier
 * @returns {string} The canonical explanation text, or null if not found
 */
export function getReasonText(reasonKey) {
  return REASON_TEXT_MAP[reasonKey] || null;
}

/**
 * Get explanations for a list of reason keys.
 * @param {string[]} reasonKeys - Array of reason identifiers
 * @returns {Object[]} Array of {key, text} objects for valid reasons
 */
export function getReasonTexts(reasonKeys) {
  if (!Array.isArray(reasonKeys)) {
    return [];
  }

  return reasonKeys
    .map(key => ({
      key,
      text: REASON_TEXT_MAP[key]
    }))
    .filter(item => item.text !== undefined);
}

/**
 * Validate that a reason key has canonical text.
 * Logs a warning if reason text is missing.
 *
 * @param {string} reasonKey - The reason identifier
 * @returns {boolean} True if reason is valid
 */
export function isValidReasonKey(reasonKey) {
  const isValid = reasonKey in REASON_TEXT_MAP;
  if (!isValid) {
    console.warn(`[MentorReasonRenderer] Invalid reason key: "${reasonKey}" — no canonical text found`);
  }
  return isValid;
}

/**
 * All valid reason keys as an array.
 * Useful for validation and iteration.
 */
export const VALID_REASON_KEYS = Object.keys(REASON_TEXT_MAP);
