/**
 * MENTOR TOPIC ATOMS - Canonical Topic Taxonomy
 *
 * Topic Atoms define the SUBJECT MATTER of mentor conversations.
 * Each mentor interaction maps to exactly ONE topic atom.
 *
 * Topics describe WHAT is being discussed, never HOW the mentor reacts
 * (that is Judgment Atoms) and never WHAT intensity (that is Intensity Atoms).
 *
 * Topics encode no advice, legality, or planning — only subject matter.
 */

/**
 * Canonical Topic Atoms
 * Organized by semantic category for clarity, but all are equivalent at runtime.
 */
export const TOPIC_ATOMS = {
  // ========================================================================
  // CHARACTER FOUNDATIONS - Core mechanical elements
  // ========================================================================
  attributes: "attributes",           // Ability scores, primary stats
  skills: "skills",                   // Skill selection and training
  feats: "feats",                     // Feat selection and synergies
  talents: "talents",                 // Talent selection and synergies
  force_powers: "force_powers",       // Force power acquisition and use

  // ========================================================================
  // IDENTITY & STRUCTURE - Who the character is becoming
  // ========================================================================
  class_identity: "class_identity",     // Class choice and class philosophy
  prestige_class_identity: "prestige_class_identity", // Prestige class direction
  multiclass_direction: "multiclass_direction",       // Multiclass strategy
  multi_prestige_complexity: "multi_prestige_complexity", // Multiple prestige classes
  species_identity: "species_identity",               // Species mechanics and culture
  level_and_experience: "level_and_experience",       // Leveling, XP, progression

  // ========================================================================
  // BUILD IDENTITY & STYLE - How the character fights and lives
  // ========================================================================
  combat_style: "combat_style",         // Combat role and approach
  role_identity: "role_identity",       // Party role and archetype
  archetype_direction: "archetype_direction", // Detected archetype trajectory
  prestige_aspirations: "prestige_aspirations", // Long-term prestige class goals

  // ========================================================================
  // PROGRESSION & GROWTH - Development and competence
  // ========================================================================
  level_progression: "level_progression", // Movement through levels
  build_synergy: "build_synergy",       // Synergistic choice alignment
  build_gaps: "build_gaps",             // Missing capabilities or redundancies
  specialization_vs_breadth: "specialization_vs_breadth", // Focus vs versatility

  // ========================================================================
  // RISK & CONSEQUENCE - Danger and cost
  // ========================================================================
  risk_exposure: "risk_exposure",       // Vulnerability to certain damage types
  resource_management: "resource_management", // DSP, Force Points, HP economy
  dark_side_influence: "dark_side_influence", // Dark Side Point accumulation
  opportunity_cost: "opportunity_cost", // Trade-offs and lost options

  // ========================================================================
  // PLAYER INTENT & PSYCHOLOGY - Goals and mindset
  // ========================================================================
  commitment_and_focus: "commitment_and_focus", // Dedication to a path
  exploration_and_experimentation: "exploration_and_experimentation", // Curiosity and variety
  indecision_and_drift: "indecision_and_drift",   // Uncertainty and vacillation
  confidence_and_readiness: "confidence_and_readiness", // Self-assurance

  // ========================================================================
  // NARRATIVE & THEME - Character story and voice
  // ========================================================================
  character_theme: "character_theme",   // Character concept and identity story
  mentor_philosophy: "mentor_philosophy", // Mentor's worldview and doctrine
  legacy_and_reputation: "legacy_and_reputation", // What the character is known for

  // ========================================================================
  // META / SYSTEM CONTEXT - Rare, system-level topics
  // ========================================================================
  options_overview: "options_overview",           // General system/option availability
  consequences_awareness: "consequences_awareness", // Understanding consequences
  reflection_on_past_choices: "reflection_on_past_choices" // Revisiting prior decisions
};

/**
 * All Topic Atoms as an array for iteration.
 * Useful for validation and UI enumeration.
 */
export const TOPIC_ATOM_LIST = Object.values(TOPIC_ATOMS);

/**
 * Topic Atom Sets by Category
 * For grouping-related operations or filtering by semantic context.
 */
export const TOPIC_CATEGORIES = {
  foundations: [
    TOPIC_ATOMS.attributes,
    TOPIC_ATOMS.skills,
    TOPIC_ATOMS.feats,
    TOPIC_ATOMS.talents,
    TOPIC_ATOMS.force_powers
  ],

  identity: [
    TOPIC_ATOMS.class_identity,
    TOPIC_ATOMS.prestige_class_identity,
    TOPIC_ATOMS.multiclass_direction,
    TOPIC_ATOMS.multi_prestige_complexity,
    TOPIC_ATOMS.species_identity,
    TOPIC_ATOMS.level_and_experience
  ],

  build_style: [
    TOPIC_ATOMS.combat_style,
    TOPIC_ATOMS.role_identity,
    TOPIC_ATOMS.archetype_direction,
    TOPIC_ATOMS.prestige_aspirations
  ],

  progression: [
    TOPIC_ATOMS.level_progression,
    TOPIC_ATOMS.build_synergy,
    TOPIC_ATOMS.build_gaps,
    TOPIC_ATOMS.specialization_vs_breadth
  ],

  risk: [
    TOPIC_ATOMS.risk_exposure,
    TOPIC_ATOMS.resource_management,
    TOPIC_ATOMS.dark_side_influence,
    TOPIC_ATOMS.opportunity_cost
  ],

  psychology: [
    TOPIC_ATOMS.commitment_and_focus,
    TOPIC_ATOMS.exploration_and_experimentation,
    TOPIC_ATOMS.indecision_and_drift,
    TOPIC_ATOMS.confidence_and_readiness
  ],

  narrative: [
    TOPIC_ATOMS.character_theme,
    TOPIC_ATOMS.mentor_philosophy,
    TOPIC_ATOMS.legacy_and_reputation
  ],

  system: [
    TOPIC_ATOMS.options_overview,
    TOPIC_ATOMS.consequences_awareness,
    TOPIC_ATOMS.reflection_on_past_choices
  ]
};

/**
 * Validate that a topic atom is recognized.
 * @param {string} topic - The topic to validate
 * @returns {boolean} True if topic is a valid Topic Atom
 */
export function isValidTopicAtom(topic) {
  return TOPIC_ATOM_LIST.includes(topic);
}

/**
 * Get the category for a topic atom.
 * @param {string} topic - The topic atom
 * @returns {string|null} The category name, or null if not found
 */
export function getTopicCategory(topic) {
  for (const [category, topics] of Object.entries(TOPIC_CATEGORIES)) {
    if (topics.includes(topic)) {
      return category;
    }
  }
  return null;
}
