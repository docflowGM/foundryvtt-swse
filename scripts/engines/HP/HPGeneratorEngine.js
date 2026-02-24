/**
 * Centralized HP generation engine.
 * Handles all HP calculation logic for both character creation and level-up.
 * Single source of truth for HP generation rules.
 */
import { SettingsHelper } from '../../utils/settings-helper.js';
import { SWSELogger } from '../../utils/logger.js';

export class HPGeneratorEngine {
  /**
   * Calculate HP gain for a level-up or character creation.
   * Consolidates logic from chargen-improved.js and levelup-shared.js.
   *
   * @param {Actor} actor - The actor gaining HP
   * @param {number} newLevel - The new level
   * @param {number} hitDie - The hit die size (e.g., 8 for d8)
   * @param {object} options - Additional options
   * @param {string} options.context - Where this is being called from ('chargen' or 'levelup')
   * @param {boolean} options.isNonheroic - Whether this is a non-heroic character
   * @returns {number} HP gain for this level
   */
  static calculateHPGain(actor, newLevel, hitDie, options = {}) {
    const { context = 'levelup', isNonheroic = false } = options;

    // Get settings with safe defaults
    const hpGeneration = SettingsHelper.getString('hpGeneration', 'average');
    const maxHPLevels = SettingsHelper.getNumber('maxHPLevels', 1);

    // Get Constitution modifier (droids get 0)
    const isDroid = actor.system.isDroid || false;
    const conMod = isDroid ? 0 : (actor.system.attributes.con?.mod || 0);

    let hpGain = 0;

    // Early levels get maximum HP
    if (newLevel <= maxHPLevels) {
      hpGain = hitDie + conMod;
      SWSELogger.log(
        `[HPGeneratorEngine] Level ${newLevel} (auto-max): ${hpGain} HP ` +
          `(d${hitDie} ${conMod >= 0 ? '+' : ''}${conMod})`
      );
    } else {
      // Apply generation method
      switch (hpGeneration) {
        case 'maximum':
          hpGain = hitDie + conMod;
          break;

        case 'average':
          hpGain = Math.floor(hitDie / 2) + 1 + conMod;
          break;

        case 'roll':
          hpGain = Math.floor(Math.random() * hitDie) + 1 + conMod;
          break;

        case 'average_minimum': {
          const rolled = Math.floor(Math.random() * hitDie) + 1;
          const average = Math.floor(hitDie / 2) + 1;
          hpGain = Math.max(rolled, average) + conMod;
          break;
        }

        default:
          SWSELogger.warn(
            `[HPGeneratorEngine] Unknown method "${hpGeneration}", using average`
          );
          hpGain = Math.floor(hitDie / 2) + 1 + conMod;
      }

      SWSELogger.log(
        `[HPGeneratorEngine] Level ${newLevel} (${hpGeneration}): ${hpGain} HP ` +
          `(d${hitDie} ${conMod >= 0 ? '+' : ''}${conMod})${
            isNonheroic ? ' [nonheroic]' : ''
          }`
      );
    }

    // Ensure minimum HP gain of 1
    const finalHPGain = Math.max(1, hpGain);

    return finalHPGain;
  }

  /**
   * Apply HP calculation to an actor at a specific level.
   *
   * @param {Actor} actor - The actor to update
   * @param {number} newLevel - The new level
   * @param {number} hitDie - The hit die size
   * @param {object} options - Additional options
   * @returns {number} Total HP after calculation (currentHP + gain)
   */
  static async applyHPGain(actor, newLevel, hitDie, options = {}) {
    const hpGain = HPGeneratorEngine.calculateHPGain(
      actor,
      newLevel,
      hitDie,
      options
    );

    const currentHP = actor.system.hp?.max || 0;
    const newHP = currentHP + hpGain;

    return { hpGain, newHP };
  }

  /**
   * Get current HP generation settings.
   * @returns {object} Settings object with method, maxLevels, etc.
   */
  static getSettings() {
    return {
      method: SettingsHelper.getString('hpGeneration', 'average'),
      maxHPLevels: SettingsHelper.getNumber('maxHPLevels', 1)
    };
  }

  /**
   * Validate HP generation settings.
   * @returns {Array<string>} Array of validation errors (empty if valid)
   */
  static validateSettings() {
    const errors = [];
    const method = SettingsHelper.getString('hpGeneration', 'average');
    const maxHPLevels = SettingsHelper.getNumber('maxHPLevels', 1);

    const validMethods = ['roll', 'average', 'maximum', 'average_minimum'];
    if (!validMethods.includes(method)) {
      errors.push(
        `Invalid hpGeneration method: "${method}". Must be one of: ${validMethods.join(
          ', '
        )}`
      );
    }

    if (!Number.isInteger(maxHPLevels) || maxHPLevels < 0) {
      errors.push(
        `maxHPLevels must be a non-negative integer, got: ${maxHPLevels}`
      );
    }

    return errors;
  }
}
