/**
 * Saber Lock Mechanics System
 * Implements Star Wars Saga Edition Saber Lock rules
 *
 * Core Rule (from Jedi Academy Training Manual):
 * When a character with the Block Talent rolls their Use the Force check to negate
 * an attack and the skill check result is exactly equal to the incoming attack roll,
 * a Saber Lock occurs.
 *
 * Resolution:
 * Both characters make an opposed Initiative check. The character with the higher
 * result may make an immediate Unarmed attack against the other character as a
 * Free Action, at which point the Saber Lock ends.
 */

import { SWSELogger } from '../utils/logger.js';
import { RollEngine } from '../engine/roll-engine.js';

export class SaberLockMechanics {

  /**
   * Check if a Saber Lock occurs
   * Called when a Block use the Force check result exactly equals the attack roll
   *
   * @param {Actor} blocker - The character with Block talent who rolled the Block check
   * @param {number} blockResult - The Use the Force check result for Block
   * @param {number} attackRoll - The incoming attack roll
   * @param {Actor} attacker - The character making the attack
   * @returns {Object} Result indicating if saber lock occurs
   */
  static checkSaberLock(blocker, blockResult, attackRoll, attacker) {
    if (!blocker || !attacker) {
      return {
        locked: false,
        message: 'Invalid combatants for Saber Lock check'
      };
    }

    // Saber Lock only occurs on exact match
    if (blockResult !== attackRoll) {
      return {
        locked: false,
        blockResult: blockResult,
        attackRoll: attackRoll,
        difference: blockResult - attackRoll
      };
    }

    // Check if combat is active
    if (!game.combat?.started) {
      return {
        locked: false,
        message: 'Cannot have Saber Lock outside of active combat'
      };
    }

    return {
      locked: true,
      blocker: blocker.name,
      blockerId: blocker.id,
      attacker: attacker.name,
      attackerId: attacker.id,
      blockResult: blockResult,
      attackRoll: attackRoll,
      message: `Saber Lock! ${blocker.name}'s Block exactly matched ${attacker.name}'s attack roll!`
    };
  }

  /**
   * Resolve a Saber Lock with opposed Initiative checks
   * Winner may make an immediate Unarmed attack as a Free Action
   *
   * @param {Actor} blocker - The character with Block who initiated the lock
   * @param {Actor} attacker - The character being locked
   * @returns {Object} Result with winner and unarmed attack options
   */
  static async resolveSaberLock(blocker, attacker) {
    if (!blocker || !attacker) {
      return {
        success: false,
        message: 'Invalid combatants for Saber Lock resolution'
      };
    }

    // Both roll Initiative
    const blockerInitiative = await this._rollInitiativeForSaberLock(blocker);
    const attackerInitiative = await this._rollInitiativeForSaberLock(attacker);

    // Determine winner
    const blockerWins = blockerInitiative >= attackerInitiative;
    const winner = blockerWins ? blocker : attacker;
    const loser = blockerWins ? attacker : blocker;

    SWSELogger.log(
      `SaberLockMechanics | Saber Lock: ${blocker.name} (${blockerInitiative}) vs ` +
      `${attacker.name} (${attackerInitiative}) - ${winner.name} wins!`
    );

    ui.notifications.info(
      `<strong>Saber Lock Resolved!</strong><br>` +
      `${blocker.name}'s Initiative: ${blockerInitiative}<br>` +
      `${attacker.name}'s Initiative: ${attackerInitiative}<br>` +
      `<strong>${winner.name} may make an Unarmed attack as a Free Action!</strong>`
    );

    return {
      success: true,
      winner: winner.name,
      winnerId: winner.id,
      loser: loser.name,
      loserId: loser.id,
      blockerInitiative: blockerInitiative,
      attackerInitiative: attackerInitiative,
      message: `${winner.name} wins the Saber Lock and may attack!`
    };
  }

  /**
   * Roll Initiative for Saber Lock resolution
   * Uses the combatant's Initiative skill total + 1d20
   */
  static async _rollInitiativeForSaberLock(actor) {
    try {
      const initiativeBonus = actor.system.skills?.initiative?.total || 0;
      const roll = await RollEngine.safeRoll(`1d20 + ${initiativeBonus}`);
      if (!roll) {
        SWSELogger.warn(`SaberLockMechanics | Initiative roll failed for ${actor.name}`);
        return 0;
      }
      const total = roll.total;

      // Post to chat
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        flavor: `<strong>Saber Lock - Initiative Check</strong><br>` +
                `Initiative Bonus: ${initiativeBonus >= 0 ? '+' : ''}${initiativeBonus}<br>` +
                `Total: ${total}`
      } , { create: true });

      return total;
    } catch (err) {
      SWSELogger.error(`SaberLockMechanics | Failed to roll Initiative for ${actor.name}:`, err);
      return 0;
    }
  }

  /**
   * Create dialog for winner to make Unarmed attack
   * Provides quick access to unarmed attack roll
   */
  static async createUnarmedAttackDialog(winner, loser) {
    return new SWSEDialogV2({
      title: `Saber Lock - Free Unarmed Attack`,
      content: `
        <div class="form-group">
          <p><strong>${winner.name}</strong> may make an immediate Unarmed attack against <strong>${loser.name}</strong> as a Free Action!</p>
          <p>Click the button below to roll the Unarmed attack.</p>
        </div>
      `,
      buttons: {
        attack: {
          label: 'Make Unarmed Attack',
          callback: async () => {
            await this._performFreeUnarmedAttack(winner, loser);
          }
        },
        cancel: {
          label: 'Skip Attack'
        }
      },
      default: 'attack'
    });
  }

  /**
   * Perform the free unarmed attack
   */
  static async _performFreeUnarmedAttack(attacker, target) {
    try {
      // Find or create an unarmed weapon item
      const unarmedWeapon = this._getUnarmedWeapon(attacker);

      if (!unarmedWeapon) {
        ui.notifications.warn(`${attacker.name} has no unarmed attack available`);
        return;
      }

      // Roll the attack
      const roll = await attacker.rollAttack?.(unarmedWeapon);

      if (roll) {
        SWSELogger.log(
          `SaberLockMechanics | ${attacker.name} makes free Unarmed attack from Saber Lock`
        );
      }
    } catch (err) {
      SWSELogger.error(
        `SaberLockMechanics | Failed to perform free Unarmed attack for ${attacker.name}:`,
        err
      );
    }
  }

  /**
   * Get the unarmed weapon for an actor
   * Searches for an unarmed attack item or creates a reference to one
   */
  static _getUnarmedWeapon(actor) {
    if (!actor.items) {return null;}

    // Look for an existing unarmed weapon
    const unarmed = actor.items.find(item =>
      item.type === 'weapon' &&
      (item.name.toLowerCase().includes('unarmed') ||
       item.name.toLowerCase().includes('punch') ||
       item.name.toLowerCase().includes('kick'))
    );

    return unarmed || null;
  }
}

export default SaberLockMechanics;
