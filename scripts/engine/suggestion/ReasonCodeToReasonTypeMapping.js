/**
 * REASON CODE → REASON TYPE MAPPING
 *
 * Bridges SuggestionEngine's 13 old reason codes (rule-driven tier semantics)
 * to SuggestionV2Contract's ReasonType enum (three-horizon signal vocabulary).
 *
 * This is a translation layer, not duplication.
 * Used when emitting signals[] during retrofit to SuggestionV2.
 *
 * Each old code maps to:
 * - Primary ReasonType
 * - Horizon classification (immediate, shortTerm, identity)
 * - Weight multiplier (used when no SuggestionScorer breakdown available)
 */

import { ReasonType } from "/systems/foundryvtt-swse/scripts/engine/suggestion/SuggestionV2Contract.js";

/**
 * Maps old reason codes to new ReasonType + metadata.
 *
 * Structure:
 * {
 *   reasonCode: {
 *     type: ReasonType,              // Primary signal type
 *     horizon: 'immediate'|'shortTerm'|'identity',
 *     weight: number,                // Default weight if no scorer breakdown
 *     label: string                  // Human-readable label
 *   }
 * }
 */
export const REASON_CODE_TO_REASON_TYPE = {
  // ───────────────────────────────────────────────────────────────────────────
  // TIER 6: PRESTIGE PATHWAYS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * PRESTIGE_PREREQ
   * Feat/talent is required for declared prestige class.
   * High semantic weight: unlocks class pathway.
   */
  PRESTIGE_PREREQ: {
    type: ReasonType.PRESTIGE_PROXIMITY,
    horizon: 'shortTerm',  // Usually within 1-3 levels
    weight: 0.85,          // Very strong signal
    label: 'Prestige Prerequisite'
  },

  /**
   * WISHLIST_PATH
   * Feat/talent is on critical path to wishlisted item.
   * High semantic weight: supporting stated player goal.
   */
  WISHLIST_PATH: {
    type: ReasonType.GOAL_ADVANCEMENT,  // Or custom GOAL_PURSUIT
    horizon: 'identity',   // Reflects player's stated intent
    weight: 0.80,
    label: 'Wishlist Path'
  },

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 5: META & THEMATIC SYNERGY
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * META_SYNERGY
   * Community or mechanical synergy (e.g., feat chain that's well-known).
   * Immediate synergy: works right now with existing build.
   */
  META_SYNERGY: {
    type: ReasonType.MECHANICAL_SYNERGY,  // Or COMMUNITY_SYNERGY if available
    horizon: 'immediate',
    weight: 0.75,
    label: 'Meta Synergy'
  },

  /**
   * MARTIAL_ARTS
   * Specialized signal: strong martial arts feat for martial archetype.
   * Can be immediate or identity depending on actor.
   */
  MARTIAL_ARTS: {
    type: ReasonType.COMBAT_STYLE_MATCH,
    horizon: 'identity',  // Fits archetype trajectory
    weight: 0.70,
    label: 'Martial Arts Foundation'
  },

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 4: FEAT/TALENT CHAINS
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * CHAIN_CONTINUATION
   * Continues an existing feat/talent chain actor is already in.
   * Immediate synergy: builds on what they already chose.
   */
  CHAIN_CONTINUATION: {
    type: ReasonType.FEAT_CHAIN_SETUP,  // Or TALENT_TREE_CONTINUATION
    horizon: 'immediate',
    weight: 0.70,
    label: 'Chain Continuation'
  },

  /**
   * SPECIES_EARLY
   * Species-themed feat available earlier than usual.
   * Can apply at multiple horizons.
   */
  SPECIES_EARLY: {
    type: ReasonType.IDENTITY_ALIGNMENT,
    horizon: 'identity',  // Fits species heritage
    weight: 0.60,
    label: 'Species-Aligned Option'
  },

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 3: ARCHETYPE & MENTOR ALIGNMENT
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * ARCHETYPE_RECOMMENDATION
   * Feat/talent recommended by character's primary archetype.
   * Identity-dominant: reinforces established role.
   */
  ARCHETYPE_RECOMMENDATION: {
    type: ReasonType.ARCHETYPE_AFFINITY,
    horizon: 'identity',
    weight: 0.65,
    label: 'Archetype Recommendation'
  },

  /**
   * PRESTIGE_SIGNAL
   * Feat/talent aligns with declared prestige path.
   * Can support at multiple horizons, but primarily identity.
   */
  PRESTIGE_SIGNAL: {
    type: ReasonType.PRESTIGE_PROXIMITY,
    horizon: 'shortTerm',
    weight: 0.65,
    label: 'Prestige Alignment'
  },

  /**
   * MENTOR_BIAS_MATCH
   * Mentor has expressed preference for this choice.
   * Identity-dominant: reflects established relationship.
   */
  MENTOR_BIAS_MATCH: {
    type: ReasonType.IDENTITY_ALIGNMENT,
    horizon: 'identity',
    weight: 0.60,
    label: 'Mentor Recommendation'
  },

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 2: PREREQUISITE & ABILITY MATCHES
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * SKILL_PREREQ_MATCH
   * Uses skills actor already has training in.
   * Immediate synergy: skill is already invested.
   */
  SKILL_PREREQ_MATCH: {
    type: ReasonType.SKILL_INVESTMENT_ALIGNMENT,
    horizon: 'immediate',
    weight: 0.55,
    label: 'Skill Match'
  },

  /**
   * ABILITY_PREREQ_MATCH
   * Uses actor's highest ability score.
   * Immediate synergy: leverages existing strength.
   */
  ABILITY_PREREQ_MATCH: {
    type: ReasonType.ATTRIBUTE_SYNERGY,
    horizon: 'immediate',
    weight: 0.55,
    label: 'Ability Match'
  },

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 1: CLASS SYNERGY
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * CLASS_SYNERGY
   * Feat/talent has thematic or mechanical fit with character class.
   * Identity-dominant: fits class identity.
   */
  CLASS_SYNERGY: {
    type: ReasonType.ROLE_ALIGNMENT,
    horizon: 'identity',
    weight: 0.50,
    label: 'Class Synergy'
  },

  // ───────────────────────────────────────────────────────────────────────────
  // TIER 0: FALLBACK (No special signal)
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * FALLBACK
   * Legal option with no identified synergy.
   * Still worth considering, but no strong signal.
   * Maps to "no primary ReasonType" or generic LEGAL_OPTION.
   */
  FALLBACK: {
    type: null,  // No primary signal; use only confidence + tier
    horizon: null,
    weight: 0.20,
    label: 'Legal Option'
  }
};

/**
 * Map a reason code to its ReasonType.
 *
 * @param {string} reasonCode - Code from SuggestionEngine (e.g., 'PRESTIGE_PREREQ')
 * @returns {Object|null} { type, horizon, weight, label } or null if not found
 */
export function mapReasonCodeToReasonType(reasonCode) {
  if (!reasonCode || typeof reasonCode !== 'string') {
    return null;
  }

  const mapping = REASON_CODE_TO_REASON_TYPE[reasonCode];
  if (!mapping) {
    console.warn(`[ReasonCodeToReasonTypeMapping] Unknown reason code: ${reasonCode}`);
    return null;
  }

  return mapping;
}

/**
 * Validate that all reason codes in REASON_CODE_TO_REASON_TYPE are properly mapped.
 * Called at system initialization.
 *
 * @throws Error if any mapping is invalid
 */
export function validateMappings() {
  const errors = [];

  for (const [code, mapping] of Object.entries(REASON_CODE_TO_REASON_TYPE)) {
    // Fallback can have null type, others cannot
    if (code !== 'FALLBACK' && !mapping.type) {
      errors.push(`${code}: Missing type`);
    }

    // Validate horizon if present
    if (mapping.horizon && !['immediate', 'shortTerm', 'identity'].includes(mapping.horizon)) {
      errors.push(`${code}: Invalid horizon: ${mapping.horizon}`);
    }

    // Validate weight
    if (typeof mapping.weight !== 'number' || mapping.weight < 0 || mapping.weight > 1.0) {
      errors.push(`${code}: Invalid weight: ${mapping.weight}`);
    }

    // Validate label
    if (!mapping.label || typeof mapping.label !== 'string') {
      errors.push(`${code}: Missing or invalid label`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`ReasonCodeToReasonTypeMapping validation failed:\n${errors.join('\n')}`);
  }

  return true;
}

/**
 * Get all reason codes.
 * @returns {string[]} Array of reason code strings
 */
export function getAllReasonCodes() {
  return Object.keys(REASON_CODE_TO_REASON_TYPE);
}
