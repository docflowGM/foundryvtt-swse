/**
 * Flanking House Rule Mechanics
 * Handles flanking bonuses and positioning
 */

import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

const NS = 'foundryvtt-swse';

export class FlankingMechanics {
  static initialize() {
    // Hook into attack roll to apply flanking bonus
    Hooks.on('preRollAttack', (actor, target, roll) => this.applyFlankingBonus(actor, target, roll));
    SWSELogger.debug('Flanking mechanics initialized');
  }

  /**
   * Check if a character has allies flanking their opponent
   * @param {Token} attacker - The attacking token
   * @param {Token} target - The target token
   * @returns {boolean} - True if flanking conditions are met
   */
  static isFlanking(attacker, target) {
    if (!game.settings.get(NS, 'flankingEnabled')) {return false;}
    if (!attacker || !target || !attacker.scene || !target.scene) {return false;}

    // Get flanking allies
    const allies = this.getFlankerCount(target, attacker);
    return allies >= 1; // Need at least one flanker
  }

  /**
   * Count how many allies are flanking a target against an attacker
   * @param {Token} target - The target token
   * @param {Actor} attacker - The attacking actor
   * @returns {number} - Number of flanking allies
   */
  static getFlankerCount(target, attacker) {
    if (!target) {return 0;}

    const requiresConsciousness = game.settings.get(NS, 'flankingRequiresConsciousness');
    const allowDiagonal = game.settings.get(NS, 'flankingDiagonalCounts');
    const largeCreatureRule = game.settings.get(NS, 'flankingLargeCreatures');

    let flankers = 0;

    // Check if target can be flanked based on size
    if (largeCreatureRule !== 'all') {
      const targetSize = target.actor?.system?.traits?.size || 'medium';
      if (largeCreatureRule === 'mediumOrSmaller' && !['tiny', 'small', 'medium'].includes(targetSize)) {
        return 0;
      }
      if (largeCreatureRule === 'sameSizeOnly' && !this._isSameSize(target, attacker)) {
        return 0;
      }
    }

    // Find allies adjacent to target and on opposite side of attacker
    const combatants = target.scene?.tokens || [];
    for (const token of combatants) {
      if (!token.actor) {continue;}
      if (token.id === target.id) {continue;} // Skip the target
      if (token.id === attacker?.token?.id) {continue;} // Skip the attacker

      // Check if conscious/aware
      if (requiresConsciousness) {
        const hp = token.actor?.system?.health?.hp?.value || 0;
        if (hp <= 0) {continue;}
      }

      // Check if adjacent
      if (this._isAdjacent(target, token, allowDiagonal)) {
        // Check if on opposite side of target from attacker
        if (this._isOpposite(token, attacker?.token, target)) {
          flankers++;
        }
      }
    }

    return flankers;
  }

  /**
   * Check if two tokens are adjacent
   * @private
   */
  static _isAdjacent(token1, token2, allowDiagonal = false) {
    const dx = Math.abs(token1.x - token2.x);
    const dy = Math.abs(token1.y - token2.y);
    const gridSize = token1.scene?.grid?.size || 70;

    if (!allowDiagonal) {
      // Only orthogonal adjacency
      return (dx === gridSize && dy === 0) || (dx === 0 && dy === gridSize);
    } else {
      // Allow diagonal
      return (dx <= gridSize && dy <= gridSize) && !(dx === 0 && dy === 0);
    }
  }

  /**
   * Check if token is on opposite side of target from flanker
   * @private
   */
  static _isOpposite(flanker, attacker, target) {
    if (!flanker || !attacker || !target) {return false;}

    // Simple check: tokens are on opposite sides if they're on opposite sides of target
    const flankerOnLeft = flanker.x < target.x;
    const attackerOnLeft = attacker.x < target.x;

    return flankerOnLeft !== attackerOnLeft;
  }

  /**
   * Check if two actors are same size
   * @private
   */
  static _isSameSize(token1, actor2) {
    const size1 = token1.actor?.system?.traits?.size || 'medium';
    const size2 = actor2?.system?.traits?.size || 'medium';
    return size1 === size2;
  }

  /**
   * Apply flanking bonus to an attack
   * @private
   */
  static applyFlankingBonus(actor, target, roll) {
    if (!this.isFlanking(actor, target)) {return;}

    const bonus = game.settings.get(NS, 'flankingBonus');
    let modifier = 0;

    switch (bonus) {
      case 'plusTwo':
        modifier = 2;
        break;
      case 'plusThree':
        modifier = 3;
        break;
      case 'halfDamageReduction':
        // This is handled separately in damage calculation
        break;
      case 'acBonus':
        // AC penalty is applied differently
        break;
    }

    if (modifier > 0) {
      roll.addBonus(modifier);
    }
  }

  /**
   * Get flanking attack bonus for an attacker
   * @param {Actor} attacker - The attacking actor
   * @param {Actor} target - The target actor
   * @returns {number} - Bonus to apply to attack
   */
  static getFlankingBonus(attacker, target) {
    if (!this.isFlanking(attacker, target)) {return 0;}

    const bonus = game.settings.get(NS, 'flankingBonus');

    switch (bonus) {
      case 'plusTwo':
        return 2;
      case 'plusThree':
        return 3;
      default:
        return 0;
    }
  }
}
