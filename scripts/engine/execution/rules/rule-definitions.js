/**
 * PASSIVE RULE Definitions & Metadata
 *
 * Defines the schema and parameter requirements for each RULE type.
 * Used by validators to enforce strict contracts.
 *
 * Each rule can:
 * - Have no params (params: null)
 * - Have required params with type specs (params: { fieldName: "type" })
 *
 * CRITICAL: This structure is frozen. No runtime mutation.
 */

import { RULES } from "./rule-enum.js";

export const RULE_DEFINITIONS = Object.freeze({
  // === STATUS & EFFECT IMMUNITIES ===
  [RULES.IMMUNE_FEAR]: {
    params: null,
    description: "Actor is immune to fear effects"
  },
  [RULES.IMMUNE_POISON]: {
    params: null,
    description: "Actor is immune to poison effects"
  },
  [RULES.IMMUNE_DISEASE]: {
    params: null,
    description: "Actor is immune to disease effects"
  },
  [RULES.IMMUNE_RADIATION]: {
    params: null,
    description: "Actor is immune to radiation damage"
  },
  [RULES.IMMUNE_MIND_AFFECTING]: {
    params: null,
    description: "Actor is immune to mind-affecting effects"
  },
  [RULES.IMMUNE_SLEEP]: {
    params: null,
    description: "Actor is immune to sleep effects"
  },
  [RULES.IMMUNE_PARALYSIS]: {
    params: null,
    description: "Actor is immune to paralysis"
  },
  [RULES.IMMUNE_STUN]: {
    params: null,
    description: "Actor is immune to stun effects"
  },
  [RULES.IMMUNE_DAZE]: {
    params: null,
    description: "Actor is immune to daze effects"
  },
  [RULES.IMMUNE_NAUSEA]: {
    params: null,
    description: "Actor is immune to nausea"
  },
  [RULES.IMMUNE_SICKENED]: {
    params: null,
    description: "Actor is immune to sickened condition"
  },
  [RULES.IMMUNE_FATIGUE]: {
    params: null,
    description: "Actor is immune to fatigue"
  },
  [RULES.IMMUNE_EXHAUSTION]: {
    params: null,
    description: "Actor is immune to exhaustion"
  },
  [RULES.IMMUNE_BLEED]: {
    params: null,
    description: "Actor is immune to bleed damage"
  },
  [RULES.IMMUNE_BLINDNESS]: {
    params: null,
    description: "Actor is immune to blindness"
  },
  [RULES.IMMUNE_DEAFNESS]: {
    params: null,
    description: "Actor is immune to deafness"
  },
  [RULES.IMMUNE_DEATH_EFFECTS]: {
    params: null,
    description: "Actor is immune to death effects"
  },
  [RULES.IMMUNE_CRITICAL_HITS]: {
    params: null,
    description: "Actor is immune to critical hits"
  },
  [RULES.IMMUNE_PRECISION_DAMAGE]: {
    params: null,
    description: "Actor is immune to precision damage (sneak attack, etc.)"
  },

  // === SENSES & DETECTION ===
  [RULES.DARKVISION]: {
    params: null,
    description: "Actor has darkvision (sees in darkness)"
  },
  [RULES.LOW_LIGHT_VISION]: {
    params: null,
    description: "Actor has low-light vision"
  },
  [RULES.BLINDSENSE]: {
    params: null,
    description: "Actor has blindsense"
  },
  [RULES.BLINDSIGHT]: {
    params: null,
    description: "Actor has blindsight (sees without eyes)"
  },
  [RULES.TREMORSENSE]: {
    params: null,
    description: "Actor has tremorsense (detects vibrations)"
  },
  [RULES.SCENT]: {
    params: null,
    description: "Actor has scent ability"
  },
  [RULES.SEE_INVISIBLE]: {
    params: null,
    description: "Actor can see invisible creatures"
  },
  [RULES.TRUE_SIGHT]: {
    params: null,
    description: "Actor has true sight"
  },

  // === COMBAT TARGETING & POSITION ===
  [RULES.IGNORE_COVER]: {
    params: null,
    description: "Attacker ignores cover defense bonuses"
  },
  [RULES.IGNORE_CONCEALMENT]: {
    params: null,
    description: "Attacker ignores concealment penalties"
  },
  [RULES.IGNORE_TOTAL_CONCEALMENT]: {
    params: null,
    description: "Attacker ignores total concealment"
  },
  [RULES.CANNOT_BE_FLANKED]: {
    params: null,
    description: "Defender cannot be flanked (no flanking bonus applies)"
  },
  [RULES.CANNOT_BE_SURPRISED]: {
    params: null,
    description: "Actor cannot be surprised"
  },
  [RULES.RETAINS_DEX_TO_REFLEX_WHEN_FLAT_FOOTED]: {
    params: null,
    description: "Actor retains Dexterity to Reflex Defense when flat-footed"
  },
  [RULES.IMMUNE_FLAT_FOOTED]: {
    params: null,
    description: "Actor cannot be flat-footed"
  },

  // === OPPORTUNITY & PROVOCATION ===
  [RULES.DOES_NOT_PROVOKE_AOO]: {
    params: null,
    description: "Actor's actions do not provoke attacks of opportunity"
  },
  [RULES.IMMUNE_AOO]: {
    params: null,
    description: "Actor cannot be subject to attacks of opportunity"
  },
  [RULES.UNARMED_DOES_NOT_PROVOKE_AOO]: {
    params: null,
    description: "Actor's unarmed attacks do not provoke attacks of opportunity"
  },
  [RULES.UNARMED_DAMAGE_STEP]: {
    params: {
      steps: "number"
    },
    description: "Actor increases unarmed attack damage by the given number of die steps",
    required: ["steps"]
  },

  // === SKILL PERMISSION (PARAM RULES) ===
  [RULES.TREAT_SKILL_AS_TRAINED]: {
    params: {
      skillId: "string"
    },
    description: "Actor treats a specific skill as trained",
    required: ["skillId"]
  },
  [RULES.ALLOW_UNTRAINED_USE]: {
    params: {
      skillId: "string"
    },
    description: "Actor can use a specific skill even if untrained",
    required: ["skillId"]
  },

  // === AREA EFFECT MITIGATION ===
  [RULES.EVASION]: {
    params: null,
    description: "Actor gains evasion (half damage on Reflex save)"
  },
  [RULES.IMPROVED_EVASION]: {
    params: null,
    description: "Actor gains improved evasion (half damage even on failed Reflex save)"
  },

  // === CRITICAL MECHANICS ===
  [RULES.EXTEND_CRITICAL_RANGE]: {
    params: {
      proficiency: "string",
      by: "number"
    },
    description: "Extends weapon critical threat range by N for specific proficiency",
    required: ["proficiency", "by"]
  },
  [RULES.CRITICAL_DAMAGE_BONUS]: {
    params: {
      proficiency: "string",
      bonus: "string|number"
    },
    description: "Adds bonus damage when scoring a critical hit (proficiency-gated)",
    required: ["proficiency", "bonus"]
  },
  [RULES.MODIFY_CRITICAL_MULTIPLIER]: {
    params: {
      proficiency: "string",
      multiplier: "number"
    },
    description: "Changes critical hit damage multiplier for specific proficiency (overrides base)",
    required: ["proficiency", "multiplier"]
  },
  [RULES.CRITICAL_CONFIRM_BONUS]: {
    params: {
      proficiency: "string",
      bonus: "number"
    },
    description: "Adds bonus to critical hit confirmation rolls for specific proficiency",
    required: ["proficiency", "bonus"]
  },

  // === WEAPON SPECIALIZATION & BONUSES ===
  [RULES.WEAPON_SPECIALIZATION]: {
    params: {
      proficiency: "string",
      bonus: "number"
    },
    description: "Adds flat damage bonus for weapon specialization (proficiency-gated)",
    required: ["proficiency", "bonus"]
  },
});

/**
 * Validate rule definition exists.
 * @param {string} ruleType
 * @returns {boolean}
 */
export function hasRuleDefinition(ruleType) {
  return RULE_DEFINITIONS[ruleType] !== undefined;
}

/**
 * Get definition for a rule type.
 * @param {string} ruleType
 * @returns {Object|null}
 */
export function getRuleDefinition(ruleType) {
  return RULE_DEFINITIONS[ruleType] || null;
}

/**
 * Get all rule definitions as object.
 */
export function getAllRuleDefinitions() {
  return RULE_DEFINITIONS;
}

export default RULE_DEFINITIONS;
