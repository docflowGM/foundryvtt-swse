/**
 * Help Mode Manager
 *
 * Manages tier-aware help behavior with persistence.
 *
 * Help Levels (graduated discovery):
 * - OFF:       No help affordances; icon-only tooltips still available
 * - CORE:      Tier1 concepts discoverable (core player knowledge)
 * - STANDARD:  Tier1 + Tier2 concepts (situational stats)
 * - ADVANCED:  All tiers (expert-level mechanics)
 *
 * Persistence:
 * Stores help level in actor.flags['foundryvtt-swse'].helpLevel
 * Default: 'CORE' (reasonable middle ground)
 */

const HELP_LEVELS = ['OFF', 'CORE', 'STANDARD', 'ADVANCED'];
const DEFAULT_HELP_LEVEL = 'CORE';
const FLAG_KEY = 'helpLevel';

export class HelpModeManager {

  /**
   * Initialize help mode for an actor/sheet.
   * Loads persisted preference from actor flags.
   * @param {Actor} actor
   * @returns {string} - Current help level
   */
  static initializeForActor(actor) {
    if (!actor) return DEFAULT_HELP_LEVEL;

    const persisted = actor.flags?.['foundryvtt-swse']?.[FLAG_KEY];
    if (persisted && HELP_LEVELS.includes(persisted)) {
      return persisted;
    }

    return DEFAULT_HELP_LEVEL;
  }

  /**
   * Get the next help level in the cycle.
   * OFF → CORE → STANDARD → ADVANCED → OFF
   * @param {string} currentLevel
   * @returns {string}
   */
  static getNextLevel(currentLevel) {
    const currentIndex = HELP_LEVELS.indexOf(currentLevel);
    if (currentIndex === -1) return DEFAULT_HELP_LEVEL;

    const nextIndex = (currentIndex + 1) % HELP_LEVELS.length;
    return HELP_LEVELS[nextIndex];
  }

  /**
   * Persist help level to actor flags.
   * @param {Actor} actor
   * @param {string} helpLevel
   * @returns {Promise}
   */
  static async setHelpLevel(actor, helpLevel) {
    if (!actor || !HELP_LEVELS.includes(helpLevel)) {
      return Promise.resolve();
    }

    // Validate actor is a proper world actor with a parent collection
    if (!actor.id || actor.collection === null) {
      console.warn('HelpModeManager.setHelpLevel: actor is synthetic or unowned, skipping persistence', {
        actorName: actor?.name,
        actorId: actor?.id,
        hasCollection: actor?.collection !== null
      });
      return Promise.resolve();
    }

    return actor.setFlag('foundryvtt-swse', FLAG_KEY, helpLevel);
  }

  /**
   * Check if a glossary concept's tier should be visible at current help level.
   *
   * @param {string} tier - 'tier1', 'tier2', 'tier3'
   * @param {string} helpLevel - Current help level
   * @returns {boolean}
   */
  static isTierVisible(tier, helpLevel) {
    if (helpLevel === 'OFF') {
      return false; // Nothing visible except icons
    }

    if (helpLevel === 'CORE') {
      return tier === 'tier1';
    }

    if (helpLevel === 'STANDARD') {
      return tier === 'tier1' || tier === 'tier2';
    }

    if (helpLevel === 'ADVANCED') {
      return true; // All tiers visible
    }

    return false;
  }

  /**
   * Get CSS classes for help mode styling.
   *
   * @param {string} helpLevel
   * @returns {Object}
   */
  static getStyleClasses(helpLevel) {
    return {
      // Root class for CSS targeting
      helpModeActive: helpLevel !== 'OFF',
      // Specific level classes if needed
      helpLevel: `help-level--${helpLevel.toLowerCase()}`
    };
  }

  /**
   * Get user-friendly label for help level.
   *
   * @param {string} helpLevel
   * @returns {string}
   */
  static getHelpLevelLabel(helpLevel) {
    const labels = {
      OFF: 'Help: OFF',
      CORE: 'Help: CORE',
      STANDARD: 'Help: STANDARD',
      ADVANCED: 'Help: ADVANCED'
    };

    return labels[helpLevel] || 'Help: ?';
  }

  /**
   * Get detailed description of a help level (for tooltips).
   *
   * @param {string} helpLevel
   * @returns {string}
   */
  static getHelpLevelDescription(helpLevel) {
    const descriptions = {
      OFF: 'Help mode off. Only icon tooltips available.',
      CORE: 'Core help. Tier1 (abilities, skills, core stats) discoverable.',
      STANDARD: 'Standard help. Tier1 + Tier2 (situational stats) discoverable.',
      ADVANCED: 'Advanced help. All tiers (expert mechanics) discoverable.'
    };

    return descriptions[helpLevel] || 'Unknown help level.';
  }

  /**
   * All available help levels (for iteration).
   * @returns {Array<string>}
   */
  static getLevels() {
    return [...HELP_LEVELS];
  }

  /**
   * Whether any help is active (not OFF).
   * @param {string} helpLevel
   * @returns {boolean}
   */
  static isActive(helpLevel) {
    return helpLevel !== 'OFF';
  }
}

export default HelpModeManager;
