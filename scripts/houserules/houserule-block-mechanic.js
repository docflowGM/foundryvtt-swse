/**
 * Block Mechanic Alternative Houserule
 *
 * Allows non-Jedi characters (or Jedi without Block talent) to use melee weapons
 * to block incoming melee attacks as a Reaction, similar to Unarmed Parry.
 *
 * Rules:
 * - Player must have a melee weapon (not unarmed)
 * - Can make a successful attack roll with the melee weapon as a Reaction
 * - If attack roll >= incoming attack roll, the attack is negated
 * - Must be aware of the attack and not be Flat-Footed
 * - Cumulative -2 penalty to all attack rolls for each attack made since last turn
 * - If weapon is non-cortosis vs lightsaber, GM decides if weapon breaks
 */

import { SWSELogger } from '../utils/logger.js';

import { getEffectiveHalfLevel } from '../actors/derived/level-split.js';
export class BlockMechanicalAlternative {
  /**
   * Initialize Block Mechanic Alternative
   */
  static initialize() {
    try {
      if (!game.settings.get('foundryvtt-swse', 'blockMechanicalAlternative')) {
        return;
      }

      SWSELogger.info('BlockMechanicalAlternative | Initialized');
    } catch (err) {
      SWSELogger.error('BlockMechanicalAlternative initialization failed', err);
    }
  }

  /**
   * Check if an actor can use the block mechanic alternative
   * @param {Actor} actor - The defending actor
   * @returns {Object} - { canBlock: boolean, weapon: Item|null, reason: string }
   */
  static canActorBlock(actor) {
    if (!actor) {
      return { canBlock: false, weapon: null, reason: 'No actor provided' };
    }

    // Check if flat-footed (not aware of attack)
    const isFlatFooted = actor.system?.conditions?.includes('flatfooted') ||
                         actor.statuses?.has('flatfooted');

    if (isFlatFooted) {
      return { canBlock: false, weapon: null, reason: 'Actor is flat-footed' };
    }

    // Find a melee weapon (exclude unarmed strikes)
    const weapons = actor.items.filter(item => {
      if (item.type !== 'weapon') {return false;}
      const isUnarmed = item.system?.isUnarmed || item.name?.toLowerCase().includes('unarmed');
      return !isUnarmed;
    });

    if (weapons.length === 0) {
      return { canBlock: false, weapon: null, reason: 'No melee weapons available' };
    }

    // Return first suitable melee weapon (prefer melee range)
    const meleWeapon = weapons.find(w => {
      const range = w.system?.range || '';
      return range.toLowerCase().includes('melee') || range === '' || range <= 5;
    }) || weapons[0];

    return { canBlock: true, weapon: meleWeapon, reason: null };
  }

  /**
   * Calculate the -2 attack penalty based on attacks made this turn
   * @param {Actor} actor - The defending actor
   * @returns {number} - The cumulative penalty (negative value)
   */
  static getBlockPenalty(actor) {
    if (!actor) {return 0;}

    // Get the actor's block attempt counter (stored in flags)
    const blockAttempts = actor.getFlag('foundryvtt-swse', 'blockAttemptsThisTurn') || 0;
    return -(blockAttempts * 2);
  }

  /**
   * Increment the block attempt counter for an actor
   * @param {Actor} actor - The defending actor
   */
  static async incrementBlockAttempts(actor) {
    if (!actor) {return;}

    const current = actor.getFlag('foundryvtt-swse', 'blockAttemptsThisTurn') || 0;
    await actor.setFlag('foundryvtt-swse', 'blockAttemptsThisTurn', current + 1);
  }

  /**
   * Reset block attempts at the start of a new turn
   * @param {Actor} actor - The actor to reset
   */
  static async resetBlockAttempts(actor) {
    if (!actor) {return;}

    await actor.unsetFlag('foundryvtt-swse', 'blockAttemptsThisTurn');
  }

  /**
   * Execute a block action - roll attack and compare against incoming roll
   * @param {Actor} actor - The defending actor
   * @param {Item} weapon - The weapon to block with
   * @param {number} incomingAttackRoll - The incoming attack roll value
   * @returns {Promise<Object>} - { success: boolean, blockRoll: number, message: string }
   */
  static async executeBlock(actor, weapon, incomingAttackRoll) {
    try {
      // Calculate attack bonus
      const blockPenalty = this.getBlockPenalty(actor);
      const abilityMod = actor.system?.attributes[weapon.system?.attackAttribute || 'str']?.mod || 0;
      const bab = actor.system?.bab || 0;
      const halfLvl = getEffectiveHalfLevel(actor);
      const weaponBonus = weapon.system?.attackBonus || 0;

      const totalBonus = bab + halfLvl + abilityMod + weaponBonus + blockPenalty;

      // Roll the block attack
      const rollFormula = `1d20 + ${totalBonus}`;
      const roll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula).evaluate({ async: true });

      const blockRoll = roll.total;
      const success = blockRoll >= incomingAttackRoll;

      // Increment block attempts for penalty tracking
      await this.incrementBlockAttempts(actor);

      return {
        success,
        blockRoll,
        totalBonus,
        weapon: weapon.name,
        actor: actor.name
      };
    } catch (err) {
      SWSELogger.error('Block action execution failed', err);
      throw err;
    }
  }
}

/**
 * Hook handler for turn changes to reset block attempt counters
 */
export function setupBlockMechanicalHooks() {
  Hooks.on('combatTurn', (combat, updateData, options) => {
    try {
      const enabled = game.settings.get('foundryvtt-swse', 'blockMechanicalAlternative');
      if (!enabled) {return;}

      // Reset block attempts for all combatants at the start of their turn
      if (combat.current.actor) {
        BlockMechanicalAlternative.resetBlockAttempts(combat.current.actor);
      }
    } catch (err) {
      SWSELogger.error('Block mechanic turn reset failed', err);
    }
  });
}
