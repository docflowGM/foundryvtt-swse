/**
 * MENTOR INHERITANCE CHAIN
 *
 * Implements a CSS-like cascade for mentor resolution:
 * Class Mentor → Archetype Mentor → Faction Mentor → Default Mentor
 *
 * This allows prestige classes, archetypes, and factions to each have their own mentor,
 * with intelligent fallback to more general mentors when specific ones don't apply.
 *
 * Example resolution:
 *   Jedi Knight (class) + Guardian (archetype) + Republic (faction)
 *   → Try Guardian-specific mentor
 *   → Fall back to Jedi class mentor
 *   → Fall back to Force faction mentor
 *   → Fall back to default (Ol' Salty)
 */

import { MENTORS, getMentorForClass } from './mentor-dialogues.js';
import { SWSELogger } from '../../utils/logger.js';

/**
 * Mentor inheritance taxonomy
 * Defines mentor associations for archetypes, factions, and paths
 */
const MENTOR_TAXONOMY = {

  /**
   * ARCHETYPE MENTORS
   * Mentors specific to character archetypes within classes
   * Examples: Jedi Guardian, Jedi Consular, etc.
   */
  archetypes: {
    // Jedi paths
    'guardian': 'Jedi',              // Conservative protector
    'consular': 'Jedi',              // Diplomatic scholar
    'sentinel': 'Jedi',              // Watchful guardian

    // Sith paths
    'sith-warrior': 'Sith',          // Aggressive warrior
    'sith-sorcerer': 'Sith',         // Manipulation and power

    // Soldier archetypes
    'commando': 'Soldier',           // Tactical fighter
    'duelist': 'Soldier',            // Single-weapon master
    'rifleman': 'Soldier',           // Ranged specialist

    // Scoundrel paths
    'scoundrel-smuggler': 'Scoundrel',
    'scoundrel-pirate': 'Scoundrel',
    'scoundrel-con-artist': 'Scoundrel'
  },

  /**
   * FACTION MENTORS
   * Mentors representing organizations or philosophies
   */
  factions: {
    'republic': 'Jedi',              // Republic aligned
    'sith-empire': 'Sith',           // Empire aligned
    'force-sensitive': 'Jedi',       // Generic Force mentor
    'non-force': 'Scoundrel',        // Non-Force mentor
    'military': 'Soldier',           // Military mentor
    'underworld': 'Scoundrel'        // Criminal mentor
  },

  /**
   * PRESTIGE CLASS MENTORS
   * Mentors for prestige/advanced classes
   * Priority: prestige > base class > faction
   */
  prestigeClasses: {
    'elite-trooper': 'Soldier',
    'gunslinger': 'Scoundrel',
    'assassin': 'Scoundrel',
    'bounty-hunter': 'Soldier',
    'sith-apprentice': 'Sith',
    'sith-lord': 'Sith',
    'imperial-knight': 'Jedi',
    'force-master': 'Jedi',
    'jedi-master': 'Jedi'
  },

  /**
   * SPECIAL PATHS
   * Dark Side, Light Side, Force-specific paths
   */
  paths: {
    'dark-side': 'Sith',
    'light-side': 'Jedi',
    'force-adept': 'Jedi',
    'droid-specialist': 'Scout'
  }
};

export const MentorInheritance = {

  /**
   * Get mentor with full inheritance chain resolution
   *
   * Resolution order (first match wins):
   * 1. Manual override (checked elsewhere)
   * 2. Prestige class mentor (if applicable)
   * 3. Archetype mentor (if defined)
   * 4. Faction mentor (if defined)
   * 5. Class mentor (base)
   * 6. Default mentor (Ol' Salty)
   *
   * @param {Actor} actor - The actor to resolve mentor for
   * @param {Object} options - Resolution options
   * @param {string} options.className - Base class name
   * @param {string} options.prestigeClass - Prestige class if applicable
   * @param {string} options.archetype - Character archetype
   * @param {string} options.faction - Character faction/alignment
   * @param {string} options.path - Special path (Force, Dark Side, etc.)
   * @returns {Object} The resolved mentor
   */
  resolve(actor, options = {}) {
    const {
      className,
      prestigeClass,
      archetype,
      faction,
      path
    } = options;

    SWSELogger.log(`[MENTOR-INHERITANCE] Resolving mentor for "${actor?.name}" with inheritance chain`);

    // Priority 1: Prestige class mentor
    if (prestigeClass) {
      const prestigeMentor = this._getPrestigeMentor(prestigeClass);
      if (prestigeMentor) {
        SWSELogger.log(`[MENTOR-INHERITANCE] Found prestige mentor for "${prestigeClass}": "${prestigeMentor.name}"`);
        return prestigeMentor;
      }
    }

    // Priority 2: Archetype mentor
    if (archetype) {
      const archetypeMentor = this._getArchetypeMentor(archetype);
      if (archetypeMentor) {
        SWSELogger.log(`[MENTOR-INHERITANCE] Found archetype mentor for "${archetype}": "${archetypeMentor.name}"`);
        return archetypeMentor;
      }
    }

    // Priority 3: Special path mentor (Dark Side, Light Side, etc.)
    if (path) {
      const pathMentor = this._getPathMentor(path);
      if (pathMentor) {
        SWSELogger.log(`[MENTOR-INHERITANCE] Found path mentor for "${path}": "${pathMentor.name}"`);
        return pathMentor;
      }
    }

    // Priority 4: Faction mentor
    if (faction) {
      const factionMentor = this._getFactionMentor(faction);
      if (factionMentor) {
        SWSELogger.log(`[MENTOR-INHERITANCE] Found faction mentor for "${faction}": "${factionMentor.name}"`);
        return factionMentor;
      }
    }

    // Priority 5: Base class mentor
    if (className) {
      const classMentor = getMentorForClass(className);
      if (classMentor) {
        SWSELogger.log(`[MENTOR-INHERITANCE] Using class mentor for "${className}": "${classMentor.name}"`);
        return classMentor;
      }
    }

    // Priority 6: Default mentor (Ol' Salty)
    SWSELogger.log(`[MENTOR-INHERITANCE] All inheritance levels exhausted, using default mentor`);
    return MENTORS.Scoundrel;
  },

  /**
   * Get prestige class mentor
   * @private
   */
  _getPrestigeMentor(prestigeClass) {
    const mentorKey = MENTOR_TAXONOMY.prestigeClasses[prestigeClass];
    if (mentorKey && MENTORS[mentorKey]) {
      return MENTORS[mentorKey];
    }
    return null;
  },

  /**
   * Get archetype-specific mentor
   * @private
   */
  _getArchetypeMentor(archetype) {
    const mentorKey = MENTOR_TAXONOMY.archetypes[archetype];
    if (mentorKey && MENTORS[mentorKey]) {
      return MENTORS[mentorKey];
    }
    return null;
  },

  /**
   * Get faction mentor
   * @private
   */
  _getFactionMentor(faction) {
    const mentorKey = MENTOR_TAXONOMY.factions[faction];
    if (mentorKey && MENTORS[mentorKey]) {
      return MENTORS[mentorKey];
    }
    return null;
  },

  /**
   * Get special path mentor (Dark Side, Light Side, Force, etc.)
   * @private
   */
  _getPathMentor(path) {
    const mentorKey = MENTOR_TAXONOMY.paths[path];
    if (mentorKey && MENTORS[mentorKey]) {
      return MENTORS[mentorKey];
    }
    return null;
  },

  /**
   * Get the full resolution chain for an actor
   * Useful for debugging and understanding which mentor is chosen
   *
   * @param {Actor} actor - The actor
   * @param {Object} options - Resolution options (same as resolve())
   * @returns {Array} Array of mentors tried, in order
   */
  getResolutionChain(actor, options = {}) {
    const chain = [];

    // Check prestige
    if (options.prestigeClass) {
      const mentor = this._getPrestigeMentor(options.prestigeClass);
      if (mentor) {
        chain.push({ level: 'prestige', value: options.prestigeClass, mentor });
      }
    }

    // Check archetype
    if (options.archetype) {
      const mentor = this._getArchetypeMentor(options.archetype);
      if (mentor) {
        chain.push({ level: 'archetype', value: options.archetype, mentor });
      }
    }

    // Check path
    if (options.path) {
      const mentor = this._getPathMentor(options.path);
      if (mentor) {
        chain.push({ level: 'path', value: options.path, mentor });
      }
    }

    // Check faction
    if (options.faction) {
      const mentor = this._getFactionMentor(options.faction);
      if (mentor) {
        chain.push({ level: 'faction', value: options.faction, mentor });
      }
    }

    // Check class (always included as base)
    if (options.className) {
      const mentor = getMentorForClass(options.className);
      chain.push({ level: 'class', value: options.className, mentor });
    }

    // Default fallback
    chain.push({ level: 'default', value: 'Scoundrel', mentor: MENTORS.Scoundrel });

    return chain;
  },

  /**
   * Add a custom mentor association
   * Allows mods or extensions to register new mentors
   *
   * @param {string} level - 'archetype', 'faction', 'prestige', or 'path'
   * @param {string} key - The key to associate (e.g., 'guardian', 'sith-warrior')
   * @param {string} mentorKey - The mentor to use (must exist in MENTORS)
   */
  addAssociation(level, key, mentorKey) {
    if (!MENTOR_TAXONOMY[level + 's']) {
      SWSELogger.warn(`[MENTOR-INHERITANCE] Invalid level: ${level}`);
      return;
    }

    if (!MENTORS[mentorKey]) {
      SWSELogger.warn(`[MENTOR-INHERITANCE] Mentor not found: ${mentorKey}`);
      return;
    }

    MENTOR_TAXONOMY[level + 's'][key] = mentorKey;
    SWSELogger.log(`[MENTOR-INHERITANCE] Added ${level} association: ${key} → ${mentorKey}`);
  },

  /**
   * Get the taxonomy (for inspection/debugging)
   */
  getTaxonomy() {
    return MENTOR_TAXONOMY;
  }
};

export default MentorInheritance;
