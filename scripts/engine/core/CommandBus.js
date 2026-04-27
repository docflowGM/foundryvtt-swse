/* ============================================================================
   COMMAND BUS
   Central dispatcher for all actor mutations
   Enforces: UI sends commands → Engine executes → Actor updates → UI reflects
   UI CANNOT mutate directly. EVER.
   ============================================================================ */

import { SWSELogger } from '../../utils/logger.js';

export class CommandBus {
  /**
   * Execute a command (UI sends request, engine executes)
   * ONLY valid way for UI to modify actor
   * @param {string} command - Command name
   * @param {Object} payload - Command payload
   * @returns {Promise<*>} - Result from engine
   */
  static async execute(command, payload = {}) {
    if (!command || typeof command !== 'string') {
      throw new Error('[CommandBus] Command name required');
    }

    SWSELogger.debug(`[CommandBus] Execute: ${command}`, payload);

    // Get engine from game
    if (!game.swse || !game.swse.engine) {
      throw new Error('[CommandBus] SWSE engine not initialized');
    }

    const engine = game.swse.engine;

    // Route to appropriate engine method
    try {
      const result = await this._route(command, payload, engine);
      SWSELogger.debug(`[CommandBus] Success: ${command}`, result);
      return result;
    } catch (err) {
      SWSELogger.error(`[CommandBus] Failed: ${command}`, err);
      throw err;
    }
  }

  /**
   * Route command to appropriate engine method
   * @private
   * @param {string} command - Command name
   * @param {Object} payload - Command payload
   * @param {Object} engine - The engine instance
   * @returns {Promise<*>}
   */
  static async _route(command, payload, engine) {
    // Actor mutations
    if (command === 'SET_HP') {
      return await engine.setHP?.(payload);
    }
    if (command === 'SET_ABILITY') {
      return await engine.setAbility?.(payload);
    }
    if (command === 'TRAIN_SKILL') {
      return await engine.trainSkill?.(payload);
    }

    // Progression/Selection
    if (command === 'SELECT_SPECIES') {
      return await engine.selectSpecies?.(payload);
    }
    if (command === 'SELECT_CLASS') {
      return await engine.selectClass?.(payload);
    }
    if (command === 'SELECT_FEAT') {
      return await engine.selectFeat?.(payload);
    }
    if (command === 'SELECT_TALENT') {
      return await engine.selectTalent?.(payload);
    }

    // Item/Equipment
    if (command === 'EQUIP_ITEM') {
      return await engine.equipItem?.(payload);
    }
    if (command === 'UNEQUIP_ITEM') {
      return await engine.unequipItem?.(payload);
    }
    if (command === 'APPLY_ITEM_MOD') {
      return await engine.applyItemMod?.(payload);
    }

    // Progression steps
    if (command === 'PROGRESS_TO_STEP') {
      return await engine.progressToStep?.(payload);
    }
    if (command === 'COMPLETE_STEP') {
      return await engine.completeStep?.(payload);
    }
    if (command === 'REWIND_PROGRESSION') {
      return await engine.rewindProgression?.(payload);
    }

    // Theme
    if (command === 'SET_THEME') {
      return await engine.setTheme?.(payload);
    }

    // Unknown command
    throw new Error(`[CommandBus] Unknown command: ${command}`);
  }

  /**
   * Get list of available commands (for debugging)
   * @returns {Array<string>}
   */
  static getAvailableCommands() {
    return [
      'SET_HP',
      'SET_ABILITY',
      'TRAIN_SKILL',
      'SELECT_SPECIES',
      'SELECT_CLASS',
      'SELECT_FEAT',
      'SELECT_TALENT',
      'EQUIP_ITEM',
      'UNEQUIP_ITEM',
      'APPLY_ITEM_MOD',
      'PROGRESS_TO_STEP',
      'COMPLETE_STEP',
      'REWIND_PROGRESSION',
      'SET_THEME'
    ];
  }

  /**
   * Validate that a command exists
   * @param {string} command - Command name to check
   * @returns {boolean}
   */
  static hasCommand(command) {
    return this.getAvailableCommands().includes(command);
  }
}
