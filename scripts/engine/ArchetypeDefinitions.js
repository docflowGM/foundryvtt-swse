/**
 * ArchetypeDefinitions
 *
 * Hardcoded archetype definitions for build identity detection.
 * Defines stable concepts; detection weights are configurable per world.
 *
 * Phase 1B: Configuration only. Phase 1C: Load world-specific overrides.
 */

import { SWSELogger } from '../utils/logger.js';

/**
 * Hardcoded archetype definitions
 * These are stable and won't change across updates
 */
export const ARCHETYPE_CATALOG = {
  // Melee-focused archetypes
  "Frontline Damage Dealer": {
    key: "frontline_damage",
    description: "High damage output, melee-focused, high HP",
    signals: {
      meleeTalents: 0.4,
      strengthInvestment: 0.3,
      hpOrArmor: 0.3
    }
  },

  "Battlefield Controller": {
    key: "controller",
    description: "Crowd control, positioning, Force or tactical abilities",
    signals: {
      controlTalents: 0.5,
      wisdomInvestment: 0.3,
      rangedCombat: 0.2
    }
  },

  // Social-focused archetypes
  "Face / Social Manipulator": {
    key: "face",
    description: "Leadership, persuasion, deception, charisma-based",
    signals: {
      socialSkills: 0.6,
      charismaInvestment: 0.4
    }
  },

  "Skill Monkey": {
    key: "skill_monkey",
    description: "High skill variety, utility, jack-of-all-trades",
    signals: {
      skillFeatCount: 0.5,
      intelligenceInvestment: 0.3,
      dexterityInvestment: 0.2
    }
  },

  // Force-focused archetypes
  "Force DPS": {
    key: "force_dps",
    description: "Lightsaber combat with heavy Force damage",
    signals: {
      forceSensitivity: 0.4,
      lightsaberFocus: 0.4,
      damageOrientation: 0.2
    }
  },

  "Force Control / Support": {
    key: "force_control",
    description: "Force-based control and support abilities",
    signals: {
      forceTraining: 0.4,
      controlTalents: 0.35,
      supportAbilities: 0.25
    }
  },

  // Tech-focused archetypes
  "Tech Specialist": {
    key: "tech_specialist",
    description: "Mechanics, computers, tech skills focus",
    signals: {
      techSkills: 0.6,
      intelligenceInvestment: 0.4
    }
  },

  // Ranged/Stealth archetypes
  "Sniper / Ranged": {
    key: "sniper",
    description: "Ranged damage, precision, positioning",
    signals: {
      rangedFeats: 0.4,
      dexterityInvestment: 0.3,
      skillFocus: 0.3
    }
  },

  "Assassin / Stealth": {
    key: "assassin",
    description: "Stealth, burst damage, infiltration",
    signals: {
      stealthFeats: 0.4,
      dexterityInvestment: 0.3,
      stealthSkills: 0.3
    }
  }
};

/**
 * Default detection weights (can be overridden per world)
 */
export const DEFAULT_ARCHETYPE_WEIGHTS = {
  // How much each signal contributes to detection
  // These are multipliers applied per-world config
  signalWeight: 1.0,          // Base multiplier for all signals
  attributeWeight: 1.0,       // How much attribute investment matters
  featWeight: 1.0,            // How much feat choice matters
  talentWeight: 1.0,          // How much talent tree matters
  skillWeight: 1.0            // How much skill investment matters
};

/**
 * Get archetype configuration (with world overrides)
 * @param {World} world - Foundry world object (optional)
 * @returns {Object} Merged archetype definitions
 */
export function getArchetypeConfig(world = null) {
  // TODO: Phase 1C - Load world settings if available
  // For now, return hardcoded defaults
  SWSELogger.log('[ArchetypeDefinitions] Loading default archetype config');
  return { ...ARCHETYPE_CATALOG };
}

/**
 * Get archetype by key
 * @param {string} key - e.g., "frontline_damage", "face", "tech_specialist"
 * @param {World} world - Foundry world object (optional)
 * @returns {Object|null} Archetype definition or null
 */
export function getArchetypeByKey(key, world = null) {
  const config = getArchetypeConfig(world);
  for (const archetype of Object.values(config)) {
    if (archetype.key === key) {
      return archetype;
    }
  }
  return null;
}

/**
 * List all archetype keys
 * @param {World} world - Foundry world object (optional)
 * @returns {Array<string>} Array of archetype keys
 */
export function listArchetypeKeys(world = null) {
  const config = getArchetypeConfig(world);
  return Object.values(config).map(a => a.key);
}
