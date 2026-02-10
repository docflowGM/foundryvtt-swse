/**
 * MENTOR RESOLVER - Context-aware, lazy mentor binding
 *
 * Resolves the correct mentor for an actor based on:
 * 1. Manual override (highest priority)
 * 2. Context phase (chargen, levelup, prestige)
 * 3. Class/archetype
 * 4. Fallback mentors
 *
 * LAZY BINDING: Mentors are resolved at dialogue-open time, not at init time
 */

import { MENTORS, getLevel1Class, getMentorForClass, getActiveMentor } from './mentor-dialogues.js';
import { MentorInheritance } from './mentor-inheritance.js';
import { SWSELogger } from '../utils/logger.js';

/**
 * Phase-specific mentor defaults
 * When a mentor can't be resolved, use the appropriate phase default
 */
const PHASE_DEFAULTS = {
  chargen: 'Scoundrel',       // Ol' Salty - narrative guide for new characters
  levelup: 'Scoundrel',        // Class mentor preferred, Ol' Salty if no class yet
  prestige: 'Scoundrel',       // Prestige mentor preferred, Ol' Salty fallback
  dialogue: 'Scoundrel'        // Mentor chat, use last active mentor
};

export const MentorResolver = {

  /**
   * Resolve the correct mentor for an actor in a given context
   * This is the primary public method - call this instead of getActiveMentor()
   *
   * LAZY: Resolves at call time, not at initialization
   *
   * @param {Actor} actor - The actor to resolve mentor for
   * @param {Object} context - Context object with phase and optional overrides
   * @param {string} context.phase - "chargen", "levelup", "prestige", "dialogue"
   * @param {string} context.classId - Optional: specific class to use
   * @param {string} context.prestigeClass - Optional: prestige class being taken
   * @returns {Object} The resolved mentor object
   */
  resolveFor(actor, context = {}) {
    const phase = context.phase || 'dialogue';

    // Handle null actor - return phase default
    if (!actor) {
      SWSELogger.log(`[MENTOR-RESOLVER] resolveFor: No actor provided, using phase default (${phase})`);
      return MENTORS[PHASE_DEFAULTS[phase]] || MENTORS.Scoundrel;
    }

    SWSELogger.log(`[MENTOR-RESOLVER] resolveFor: Resolving mentor for "${actor.name}" (phase: ${phase})`);

    // Priority 1: Manual override (always respected)
    const override = actor.getFlag('swse', 'mentorOverride');
    if (override && MENTORS[override]) {
      SWSELogger.log(`[MENTOR-RESOLVER] resolveFor: Using mentor override: "${MENTORS[override].name}"`);
      return MENTORS[override];
    }

    // Priority 2: Phase-specific resolution
    switch (phase) {
      case 'chargen':
        return this._resolveChargenMentor(actor, context);
      case 'levelup':
        return this._resolveLevelupMentor(actor, context);
      case 'prestige':
        return this._resolvePrestigeMentor(actor, context);
      case 'dialogue':
        return this._resolveDialogueMentor(actor, context);
      default:
        return getActiveMentor(actor);
    }
  },

  /**
   * Chargen phase mentor resolution
   * - If class selected: use class mentor
   * - If no class: use recruiter/onboarding mentor (Ol' Salty)
   * @private
   */
  _resolveChargenMentor(actor, context) {
    const classes = actor.items.filter(i => i.type === 'class');

    if (classes.length > 0) {
      const mentor = getMentorForClass(classes[0].name);
      SWSELogger.log(`[MENTOR-RESOLVER] _resolveChargenMentor: Using class mentor for "${classes[0].name}"`);
      return mentor;
    }

    // No class yet - use generic chargen mentor (Ol' Salty as neutral guide)
    SWSELogger.log(`[MENTOR-RESOLVER] _resolveChargenMentor: No class selected, using chargen default (Ol' Salty)`);
    return MENTORS[PHASE_DEFAULTS.chargen];
  },

  /**
   * Level-up phase mentor resolution
   * - Use class mentor based on starting class
   * - If no starting class: use Ol' Salty
   * @private
   */
  _resolveLevelupMentor(actor, context) {
    // If a specific class is provided, use that
    if (context.classId) {
      const mentor = getMentorForClass(context.classId);
      SWSELogger.log(`[MENTOR-RESOLVER] _resolveLevelupMentor: Using provided class mentor for "${context.classId}"`);
      return mentor;
    }

    // Otherwise use starting class mentor (current behavior)
    const startClass = getLevel1Class(actor);
    const mentor = getMentorForClass(startClass);
    SWSELogger.log(`[MENTOR-RESOLVER] _resolveLevelupMentor: Using starting class mentor for "${startClass}"`);
    return mentor;
  },

  /**
   * Prestige phase mentor resolution
   * - Try to use prestige mentor if defined
   * - Fall back to class mentor
   * - Final fallback: Ol' Salty
   * @private
   */
  _resolvePrestigeMentor(actor, context) {
    // If a prestige class mentor is provided
    if (context.prestigeClass) {
      const mentor = getMentorForClass(context.prestigeClass);
      if (mentor) {
        SWSELogger.log(`[MENTOR-RESOLVER] _resolvePrestigeMentor: Using prestige mentor for "${context.prestigeClass}"`);
        return mentor;
      }
    }

    // Fall back to class mentor
    const startClass = getLevel1Class(actor);
    const mentor = getMentorForClass(startClass);
    SWSELogger.log(`[MENTOR-RESOLVER] _resolvePrestigeMentor: Falling back to class mentor for "${startClass}"`);
    return mentor;
  },

  /**
   * Dialogue phase mentor resolution
   * - Use the currently active mentor (respects overrides and class)
   * - This is the default for mentor chat, guidance, etc.
   * @private
   */
  _resolveDialogueMentor(actor, context) {
    const mentor = getActiveMentor(actor);
    SWSELogger.log(`[MENTOR-RESOLVER] _resolveDialogueMentor: Using active mentor "${mentor?.name}"`);
    return mentor;
  },

  /**
   * Get a mentor by key (for UI mentor selection, overrides, etc.)
   * @param {string} mentorKey - The mentor key (e.g., "Jedi", "Scout", "Scoundrel")
   * @returns {Object|null} The mentor object or null if not found
   */
  get(mentorKey) {
    if (!mentorKey) {return null;}
    return MENTORS[mentorKey] ?? null;
  },

  /**
   * Get all available mentors (for UI mentor selection menus)
   * @returns {Object} Object of { mentorKey: mentorObject }
   */
  getAll() {
    return MENTORS;
  },

  /**
   * Get mentor by class (used during chargen/levelup for lookup)
   * @param {string} className - The class name
   * @returns {Object} The mentor for that class
   */
  getForClass(className) {
    return getMentorForClass(className);
  },

  /**
   * Check if a mentor exists
   * @param {string} mentorKey - The mentor key
   * @returns {boolean} True if mentor exists
   */
  has(mentorKey) {
    return !!MENTORS[mentorKey];
  },

  /**
   * FIX 2: Resolve with full inheritance chain
   *
   * This is the advanced resolution method that uses the inheritance taxonomy
   * to support prestige classes, archetypes, factions, and paths.
   *
   * Use this when you have detailed character information and want intelligent
   * mentor fallback (e.g., for prestige class transitions, archetype-specific dialogue).
   *
   * @param {Actor} actor - The actor
   * @param {Object} inheritanceOptions - Options for inheritance chain
   * @param {string} inheritanceOptions.className - Base class name
   * @param {string} inheritanceOptions.prestigeClass - Prestige class if applicable
   * @param {string} inheritanceOptions.archetype - Character archetype (guardian, consular, etc.)
   * @param {string} inheritanceOptions.faction - Character faction (republic, empire, etc.)
   * @param {string} inheritanceOptions.path - Special path (dark-side, light-side, etc.)
   * @returns {Object} The resolved mentor using inheritance chain
   */
  resolveWithInheritance(actor, inheritanceOptions = {}) {
    SWSELogger.log(`[MENTOR-RESOLVER] resolveWithInheritance: Using full inheritance chain`);
    return MentorInheritance.resolve(actor, inheritanceOptions);
  },

  /**
   * Get the full resolution chain
   * Useful for debugging and understanding mentor selection
   *
   * @param {Actor} actor - The actor
   * @param {Object} inheritanceOptions - Same as resolveWithInheritance
   * @returns {Array} Array of { level, value, mentor } objects
   */
  getInheritanceChain(actor, inheritanceOptions = {}) {
    return MentorInheritance.getResolutionChain(actor, inheritanceOptions);
  },

  /**
   * Get the mentor inheritance taxonomy
   * For UI mentor selection menus, custom associations, etc.
   *
   * @returns {Object} The full taxonomy
   */
  getTaxonomy() {
    return MentorInheritance.getTaxonomy();
  },

  /**
   * Register a custom mentor association
   * Allows mods to add new archetype/faction/prestige mentors
   *
   * @param {string} level - 'archetype', 'faction', 'prestige', or 'path'
   * @param {string} key - The key to associate (e.g., 'guardian', 'sith-warrior')
   * @param {string} mentorKey - The mentor to use (must exist in MENTORS)
   */
  registerMentorAssociation(level, key, mentorKey) {
    MentorInheritance.addAssociation(level, key, mentorKey);
  }
};

export default MentorResolver;
