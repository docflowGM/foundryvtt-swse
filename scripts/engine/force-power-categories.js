/**
 * SWSE Force Power Category System
 *
 * Authoritative categorization of all 31 Force powers in SWSE.
 * Powers are tagged with their mechanical and philosophical intent,
 * enabling context-aware suggestion and mentor guidance.
 *
 * Categories:
 * - vitality: Healing, endurance, preservation
 * - defense: Protection, barriers, resistance
 * - control: Manipulation, positioning, denial
 * - awareness: Insight, foresight, detection
 * - precision: Focused strikes, accuracy, enhancement
 * - aggression: Offensive, domination, pain
 * - support: Team buffs, enablement, cooperation
 * - mobility: Speed, positioning, movement
 * - risk: Powers that endanger the user
 */

import { SWSELogger } from '../utils/logger.js';

// ──────────────────────────────────────────────────────────────
// CANONICAL FORCE POWER CATEGORIES
// ──────────────────────────────────────────────────────────────

export const FORCE_POWER_CATEGORIES = {
  // Vital / Preservation Powers
  vital_transfer: {
    name: "Vital Transfer",
    categories: ["vitality", "support", "risk"],
    philosophy: "Healing through sacrifice",
    moralSlant: "jedi_favored"
  },
  force_body: {
    name: "Force Body",
    categories: ["vitality", "defense"],
    philosophy: "Physical resilience and endurance",
    moralSlant: "neutral"
  },
  malacia: {
    name: "Malacia",
    categories: ["vitality", "control"],
    philosophy: "Exhaustion through Force manipulation",
    moralSlant: "neutral"
  },

  // Awareness / Insight Powers
  force_sense: {
    name: "Force Sense",
    categories: ["awareness"],
    philosophy: "Passive awareness of danger and presence",
    moralSlant: "jedi_favored"
  },
  farseeing: {
    name: "Farseeing",
    categories: ["awareness", "control"],
    philosophy: "Strategic foresight",
    moralSlant: "jedi_favored"
  },
  force_track: {
    name: "Force Track",
    categories: ["awareness", "control"],
    philosophy: "Persistent pursuit and location",
    moralSlant: "neutral"
  },

  // Defense / Protection
  negate_energy: {
    name: "Negate Energy",
    categories: ["defense", "control"],
    philosophy: "Reactive protection against energy attacks",
    moralSlant: "jedi_favored"
  },
  force_defense: {
    name: "Force Defense",
    categories: ["defense"],
    philosophy: "Internalized resistance and shielding",
    moralSlant: "jedi_favored"
  },

  // Precision / Martial Augmentation
  battle_strike: {
    name: "Battle Strike",
    categories: ["precision", "aggression"],
    philosophy: "One decisive Force-enhanced blow",
    moralSlant: "neutral"
  },
  force_strike: {
    name: "Force Strike",
    categories: ["precision", "aggression"],
    philosophy: "Raw telekinetic damage",
    moralSlant: "neutral"
  },
  force_weapon: {
    name: "Force Weapon",
    categories: ["precision", "support"],
    philosophy: "Weapon empowerment and enhancement",
    moralSlant: "jedi_favored"
  },

  // Control / Battlefield Manipulation
  move_object: {
    name: "Move Object",
    categories: ["control", "precision"],
    philosophy: "Environmental control and manipulation",
    moralSlant: "jedi_favored"
  },
  force_slam: {
    name: "Force Slam",
    categories: ["control", "aggression"],
    philosophy: "Area denial and forced repositioning",
    moralSlant: "sith_favored"
  },
  force_thrust: {
    name: "Force Thrust",
    categories: ["control"],
    philosophy: "Tactical repositioning of targets",
    moralSlant: "jedi_favored"
  },
  force_disarm: {
    name: "Force Disarm",
    categories: ["control"],
    philosophy: "Non-lethal dominance through disarmament",
    moralSlant: "jedi_favored"
  },
  battlemind: {
    name: "Battlemind",
    categories: ["support", "control"],
    philosophy: "Combat focus and clarity",
    moralSlant: "neutral"
  },
  battle_meditation: {
    name: "Battle Meditation",
    categories: ["support", "control"],
    philosophy: "Strategic Force leadership and team coordination",
    moralSlant: "jedi_favored"
  },
  inspire: {
    name: "Inspire",
    categories: ["support"],
    philosophy: "Emotional reinforcement and morale",
    moralSlant: "jedi_favored"
  },

  // Stealth / Deception
  force_cloak: {
    name: "Force Cloak",
    categories: ["control", "mobility"],
    philosophy: "Obfuscation and stealth",
    moralSlant: "jedi_favored"
  },
  mind_trick: {
    name: "Mind Trick",
    categories: ["control"],
    philosophy: "Nonviolent persuasion and obfuscation",
    moralSlant: "jedi_favored"
  },
  force_stun: {
    name: "Force Stun",
    categories: ["control"],
    philosophy: "Temporary disablement without harm",
    moralSlant: "jedi_favored"
  },
  rebuke: {
    name: "Rebuke",
    categories: ["control", "defense"],
    philosophy: "Psychological resistance and defiance",
    moralSlant: "jedi_favored"
  },

  // Dark Side / Aggression
  force_lightning: {
    name: "Force Lightning",
    categories: ["aggression", "precision", "control"],
    philosophy: "Domination through pain and fear",
    moralSlant: "sith_favored"
  },
  force_scream: {
    name: "Force Scream",
    categories: ["aggression", "control"],
    philosophy: "Terror weapon and area denial",
    moralSlant: "sith_favored"
  },
  drain_life: {
    name: "Drain Life",
    categories: ["aggression", "vitality", "risk"],
    philosophy: "Predatory survival through life theft",
    moralSlant: "sith_only"
  },
  drain_energy: {
    name: "Drain Energy",
    categories: ["control", "aggression"],
    philosophy: "Resource denial and depletion",
    moralSlant: "sith_favored"
  },
  sever_force: {
    name: "Sever Force",
    categories: ["control", "aggression"],
    philosophy: "Suppression of Force identity",
    moralSlant: "sith_favored"
  },
  force_storm: {
    name: "Force Storm",
    categories: ["aggression"],
    philosophy: "Catastrophic area destruction",
    moralSlant: "sith_only"
  },
  force_grip: {
    name: "Force Grip",
    categories: ["control", "aggression"],
    philosophy: "Dominion and immobilization",
    moralSlant: "sith_favored"
  }
};

// ──────────────────────────────────────────────────────────────
// CATEGORY → ARCHETYPE BIAS TABLE (SSOT)
// ──────────────────────────────────────────────────────────────

export const FORCE_CATEGORY_ARCHETYPE_BIAS = {
  // Defense category
  defense: {
    jedi_guardian: 1.8,
    emperors_shield: 1.9,
    jedi_healer: 1.3,
    sith_juggernaut: 1.2,
    jedi_battlemaster: 1.1,
    imperial_knight_errant: 1.0
  },

  // Control category
  control: {
    jedi_consular: 1.7,
    jedi_mentor: 1.6,
    jedi_shadow: 1.4,
    sith_mastermind: 1.8,
    imperial_knight_inquisitor: 1.5
  },

  // Awareness category
  awareness: {
    jedi_seer: 1.9,
    jedi_archivist: 1.7,
    jedi_shadow: 1.4,
    jedi_mentor: 1.5,
    imperial_knight_errant: 1.3
  },

  // Precision category
  precision: {
    jedi_weapon_master: 1.8,
    jedi_battlemaster: 1.5,
    sith_assassin: 1.6,
    sith_marauder: 1.4
  },

  // Aggression category
  aggression: {
    sith_marauder: 1.9,
    sith_juggernaut: 2.0,
    sith_assassin: 1.5,
    jedi_battlemaster: 1.2,
    jedi_weapon_master: 1.1,
    sith_acolyte: 1.4
  },

  // Vitality category
  vitality: {
    jedi_healer: 2.0,
    jedi_mentor: 1.4,
    sith_alchemist: 1.3,
    jedi_consular: 0.9
  },

  // Support category
  support: {
    jedi_healer: 1.8,
    jedi_mentor: 1.7,
    jedi_consular: 1.4,
    jedi_battlemaster: 1.2,
    sith_mastermind: 1.0
  },

  // Mobility category
  mobility: {
    jedi_sentinel: 1.6,
    jedi_ace_pilot: 1.5,
    sith_assassin: 1.4,
    imperial_knight_errant: 1.5
  },

  // Risk category (should be penalized for most, encouraged for risk-takers)
  risk: {
    sith_marauder: 1.1,
    sith_juggernaut: 1.0,
    jedi_guardian: 0.7,
    jedi_healer: 0.5,
    jedi_mentor: 0.3
  }
};

// ──────────────────────────────────────────────────────────────
// VALIDATOR: Ensure all powers are categorized
// ──────────────────────────────────────────────────────────────

/**
 * Validate Force power category coverage
 * @throws Error if validation fails
 */
export function validateForcePowerCategories() {
  const errors = [];

  for (const [powerId, powerData] of Object.entries(FORCE_POWER_CATEGORIES)) {
    // Check required fields
    if (!powerData.name) {
      errors.push(`${powerId}: missing name`);
    }
    if (!powerData.categories || !Array.isArray(powerData.categories) || powerData.categories.length === 0) {
      errors.push(`${powerId}: missing or empty categories array`);
    }
    if (!powerData.philosophy) {
      errors.push(`${powerId}: missing philosophy description`);
    }
    if (!powerData.moralSlant || !["jedi_favored", "sith_favored", "neutral", "jedi_only", "sith_only"].includes(powerData.moralSlant)) {
      errors.push(`${powerId}: invalid moralSlant value`);
    }

    // Validate categories are real
    if (powerData.categories) {
      const validCategories = ["vitality", "defense", "control", "awareness", "precision", "aggression", "support", "mobility", "risk"];
      for (const cat of powerData.categories) {
        if (!validCategories.includes(cat)) {
          errors.push(`${powerId}: unknown category "${cat}"`);
        }
      }
    }
  }

  if (errors.length > 0) {
    console.error("❌ Force Power Category Validation Failed:");
    errors.forEach(e => console.error(`  - ${e}`));
    throw new Error("Invalid Force power category data");
  }

  console.log(`✅ Force Power Category Validation Passed (${Object.keys(FORCE_POWER_CATEGORIES).length} powers)`);
}

// ──────────────────────────────────────────────────────────────
// AUTO-GENERATION: Create archetype weights from categories
// ──────────────────────────────────────────────────────────────

/**
 * Generate archetype weights for a Force power based on its categories
 * @param {Array} categories - Power's assigned categories
 * @returns {Object} Weights keyed by archetype ID
 */
export function generateForcePowerArchetypeWeights(categories = []) {
  const archetypes = [
    "jedi_guardian",
    "jedi_sentinel",
    "jedi_consular",
    "jedi_ace_pilot",
    "jedi_healer",
    "jedi_battlemaster",
    "jedi_shadow",
    "jedi_weapon_master",
    "jedi_mentor",
    "jedi_seer",
    "jedi_archivist",
    "sith_marauder",
    "sith_assassin",
    "sith_acolyte",
    "sith_alchemist",
    "sith_mastermind",
    "sith_juggernaut",
    "emperors_shield",
    "imperial_knight_errant",
    "imperial_knight_inquisitor"
  ];

  const weights = {};

  for (const archetype of archetypes) {
    let score = 1.0;

    for (const category of categories) {
      const categoryBias = FORCE_CATEGORY_ARCHETYPE_BIAS[category]?.[archetype] ?? 1.0;
      score *= categoryBias;
    }

    weights[archetype] = Number(score.toFixed(2));
  }

  return weights;
}

export default {
  FORCE_POWER_CATEGORIES,
  FORCE_CATEGORY_ARCHETYPE_BIAS,
  validateForcePowerCategories,
  generateForcePowerArchetypeWeights
};
