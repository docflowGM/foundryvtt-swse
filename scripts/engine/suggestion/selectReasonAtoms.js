/**
 * SELECT REASON ATOMS
 *
 * Maps SuggestionEngine reason codes to Mentor Reason Atoms.
 *
 * This is the INTEGRATION BRIDGE between the suggestion engine
 * (which produces tier-based codes like PRESTIGE_PREREQ)
 * and the mentor judgment system
 * (which consumes semantic reason atoms for decision-making).
 *
 * RESPONSIBILITY:
 * - Convert suggestion-layer reason codes → mentor-layer reason atoms
 * - Ensure atoms are always valid (from REASON_ATOMS)
 * - Provide one source of truth for code-to-atom mappings
 * - Never produce duplicates or invalid atoms
 *
 * DESIGN PHILOSOPHY:
 * - Each mapping reflects the semantic meaning of the reason code
 * - Atoms are selected to capture WHY the tier was assigned
 * - Multiple atoms allowed (e.g., prestige reasons include 3 atoms)
 * - Fallback reason produces minimal atoms (core understanding only)
 */

import { REASON_ATOMS, isValidReasonAtom } from '/systems/foundryvtt-swse/scripts/engine/mentor/mentor-reason-atoms.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

/**
 * Maps SuggestionEngine reason codes to arrays of mentor reason atoms.
 * @private
 */
const REASON_CODE_TO_ATOMS = {
  // Prerequisite for prestige class trajectory
  PRESTIGE_PREREQ: [
    REASON_ATOMS.DependencyChain,      // Unlocks future prestige path
    REASON_ATOMS.CommitmentDeclared,   // Consistent with prestige direction
    REASON_ATOMS.GoalAdvancement       // Moving toward prestige goal
  ],

  // Required for wishlist item
  WISHLIST_PATH: [
    REASON_ATOMS.GoalAdvancement,      // Getting closer to stated goal
    REASON_ATOMS.CommitmentDeclared,   // Supporting declared direction
    REASON_ATOMS.DependencyChain       // Prerequisite for wishlist item
  ],

  // Strong martial arts foundation
  MARTIAL_ARTS: [
    REASON_ATOMS.SynergyPresent,       // Synergizes with martial theme
    REASON_ATOMS.PatternAlignment,     // Fits martial archetype
    REASON_ATOMS.ReadinessMet         // Has martial prerequisites
  ],

  // Synergy with current build
  META_SYNERGY: [
    REASON_ATOMS.SynergyPresent,       // Synergizes with existing abilities
    REASON_ATOMS.PatternAlignment      // Consistent with current build direction
  ],

  // Matches species heritage
  SPECIES_EARLY: [
    REASON_ATOMS.PatternAlignment,     // Fits species theme
    REASON_ATOMS.ReadinessMet,         // Appropriate for level
    REASON_ATOMS.GoalAdvancement       // If pursuing species-based build
  ],

  // Builds on existing feat/talent choices
  CHAIN_CONTINUATION: [
    REASON_ATOMS.RecentChoiceImpact,   // Builds on recent decisions
    REASON_ATOMS.SynergyPresent,       // Synergizes with prior choices
    REASON_ATOMS.CommitmentDeclared    // Continuing established path
  ],

  // Recommended by archetype
  ARCHETYPE_RECOMMENDATION: [
    REASON_ATOMS.PatternAlignment,     // Fits archetype theme
    REASON_ATOMS.CommitmentDeclared    // Consistent with archetype direction
  ],

  // Aligns with prestige path
  PRESTIGE_SIGNAL: [
    REASON_ATOMS.CommitmentDeclared,   // Consistent with prestige path
    REASON_ATOMS.GoalAdvancement,      // Moving toward prestige goal
    REASON_ATOMS.PatternAlignment      // Fits prestige identity
  ],

  // Aligns with mentor guidance
  MENTOR_BIAS_MATCH: [
    REASON_ATOMS.PatternAlignment,     // Mentor recognizes pattern
    REASON_ATOMS.CommitmentDeclared    // Mentor sees consistent commitment
  ],

  // Uses trained skill
  SKILL_PREREQ_MATCH: [
    REASON_ATOMS.SynergyPresent,       // Synergizes with trained skills
    REASON_ATOMS.ReadinessMet,         // Has required skills
    REASON_ATOMS.PatternAlignment      // Matches skill investment
  ],

  // Matches highest ability score
  ABILITY_PREREQ_MATCH: [
    REASON_ATOMS.SynergyPresent,       // Synergizes with high ability
    REASON_ATOMS.ReadinessMet,         // Ability requirement satisfied
    REASON_ATOMS.PatternAlignment      // Matches ability investment
  ],

  // Strong thematic fit with class
  CLASS_SYNERGY: [
    REASON_ATOMS.PatternAlignment,     // Thematic fit with class
    REASON_ATOMS.SynergyPresent,       // Synergizes with class features
    REASON_ATOMS.CommitmentDeclared    // Consistent with class identity
  ],

  // Legal option with no specific tier
  FALLBACK: [
    REASON_ATOMS.ReadinessMet,         // No barriers to selection
    REASON_ATOMS.PatternAlignment      // Basic thematic compatibility
  ]
};

/**
 * Convert a SuggestionEngine reason code to mentor reason atoms.
 *
 * This function bridges the suggestion engine's tier-based reasoning
 * to the mentor system's semantic atom-based reasoning.
 *
 * CRITICAL CONTRACT:
 * - Always returns an array (empty if code unknown, but we log warning)
 * - All returned atoms are valid (checked against REASON_ATOMS)
 * - Never returns duplicates
 * - Idempotent: same input always produces same output
 *
 * @param {string} reasonCode - Reason code from SuggestionEngine (e.g., 'PRESTIGE_PREREQ')
 * @returns {string[]} Array of mentor reason atoms
 *
 * @example
 * selectReasonAtoms('PRESTIGE_PREREQ')
 * // Returns: ['DependencyChain', 'CommitmentDeclared', 'GoalAdvancement']
 *
 * @example
 * selectReasonAtoms('UNKNOWN_CODE')
 * // Returns: [] (logs warning)
 */
export function selectReasonAtoms(reasonCode) {
  // Validate input
  if (typeof reasonCode !== 'string' || !reasonCode.trim()) {
    SWSELogger.warn('[selectReasonAtoms] Invalid reason code:', reasonCode);
    return [];
  }

  // Look up atoms for this code
  const atoms = REASON_CODE_TO_ATOMS[reasonCode];

  if (!atoms) {
    SWSELogger.warn(`[selectReasonAtoms] Unknown reason code: ${reasonCode}. Returning empty atoms array.`);
    return [];
  }

  // Validate all atoms (defensive check)
  const validAtoms = atoms.filter(atom => {
    if (!isValidReasonAtom(atom)) {
      SWSELogger.error(`[selectReasonAtoms] Invalid atom in mapping for ${reasonCode}: ${atom}`);
      return false;
    }
    return true;
  });

  return validAtoms;
}

/**
 * Maps SuggestionEngine reason codes to mentor judgment fact keys.
 * These are the keys from reasons.json that mentor judgment rules match against.
 * @private
 */
const REASON_CODE_TO_JUDGMENT_KEYS = {
  PRESTIGE_PREREQ: ['prestige_prerequisites_met', 'dependency_chain'],
  WISHLIST_PATH: ['goal_advancement', 'dependency_chain'],
  MARTIAL_ARTS: ['feat_reinforces_core_strength', 'synergy_present'],
  META_SYNERGY: ['synergy_present', 'pattern_alignment'],
  SPECIES_EARLY: ['pattern_alignment', 'readiness_met'],
  CHAIN_CONTINUATION: ['feat_chain_continuation', 'synergy_present'],
  ARCHETYPE_RECOMMENDATION: ['feat_supports_existing_role', 'pattern_alignment'],
  PRESTIGE_SIGNAL: ['prestige_path_consistency', 'pattern_alignment'],
  MENTOR_BIAS_MATCH: ['pattern_alignment', 'role_coherence'],
  SKILL_PREREQ_MATCH: ['skill_prerequisite_met', 'synergy_present'],
  ABILITY_PREREQ_MATCH: ['attribute_matches_feature_focus', 'readiness_met'],
  CLASS_SYNERGY: ['class_synergy', 'pattern_alignment'],
  FALLBACK: ['readiness_met']
};

/**
 * Get mentor judgment fact keys for a reason code.
 * These keys are used by findMatchingRule() to evaluate mentor judgment.
 *
 * @param {string} reasonCode - Reason code from SuggestionEngine
 * @returns {string[]} Array of mentor judgment fact keys
 */
export function selectJudgmentKeys(reasonCode) {
  if (typeof reasonCode !== 'string' || !reasonCode.trim()) {
    SWSELogger.warn('[selectJudgmentKeys] Invalid reason code:', reasonCode);
    return [];
  }

  const keys = REASON_CODE_TO_JUDGMENT_KEYS[reasonCode];
  if (!keys) {
    SWSELogger.warn(`[selectJudgmentKeys] Unknown reason code: ${reasonCode}`);
    return [];
  }

  return keys;
}

/**
 * Get all mapped reason codes (for validation/testing).
 * @returns {string[]} Array of all reason codes that have atom mappings
 */
export function getMappedReasonCodes() {
  return Object.keys(REASON_CODE_TO_ATOMS);
}

/**
 * Validate that all atoms in mappings are valid.
 * Called at startup to catch configuration errors early.
 *
 * @returns {Object} Validation result: { valid: boolean, errors: string[] }
 */
export function validateAtomMappings() {
  const errors = [];

  for (const [code, atoms] of Object.entries(REASON_CODE_TO_ATOMS)) {
    // Check that atoms is an array
    if (!Array.isArray(atoms)) {
      errors.push(`Reason code '${code}' has non-array atoms: ${typeof atoms}`);
      continue;
    }

    // Check each atom is valid
    for (const atom of atoms) {
      if (!isValidReasonAtom(atom)) {
        errors.push(`Reason code '${code}' has invalid atom: '${atom}'`);
      }
    }

    // Check no duplicates
    const unique = new Set(atoms);
    if (unique.size !== atoms.length) {
      const dups = atoms.filter((v, i, a) => a.indexOf(v) !== i);
      errors.push(`Reason code '${code}' has duplicate atoms: ${dups.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
