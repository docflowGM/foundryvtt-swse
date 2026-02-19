/**
 * Feint Mechanics System
 * Implements Star Wars Saga Edition Feint rules
 *
 * Core Rule:
 * Make a Deception check as a Standard Action to set the DC of your opponent's
 * Initiative check. If you beat their roll, they are treated as Flat-Footed
 * against the first attack you make against them in the next round.
 *
 * Special Cases:
 * - Non-humanoid/low INT: -5 penalty on Deception check
 * - Trained in Deception: Can Feint multiple targets as Full-Round Action
 * - Each additional target beyond first: -5 penalty on Deception check
 * - Vehicle pilots: Add vehicle size modifier to Deception check
 */

import { SWSELogger } from '../utils/logger.js';
import { RollEngine } from '../engine/roll-engine.js';

export class FeintMechanics {

  /**
   * Initiate a Feint action
   * @param {Actor} actor - The actor performing the feint
   * @param {Array<Actor>} targets - Target actors to feint against
   * @returns {Object} Result with success status and target feint results
   */
  static async initiateFeint(actor, targets = []) {
    if (!actor || !targets || targets.length === 0) {
      return {
        success: false,
        message: 'No valid targets for Feint'
      };
    }

    // Check if combat is active
    if (!game.combat?.started) {
      return {
        success: false,
        message: 'Feint can only be used during active combat'
      };
    }

    // Check training for multiple targets
    const isTrainedInDeception = actor.system.skills?.deception?.trained === true;
    const maxTargets = isTrainedInDeception ? targets.length : 1;

    if (targets.length > maxTargets && !isTrainedInDeception) {
      return {
        success: false,
        message: 'You must be trained in Deception to feint multiple targets'
      };
    }

    // Validate targets
    const validTargets = targets.filter(t => t && t.system);
    if (validTargets.length !== targets.length) {
      return {
        success: false,
        message: 'One or more targets are invalid'
      };
    }

    // Calculate Deception check DC
    const deceptionBonus = this._getDeceptionBonus(actor, validTargets);
    const deceptionDC = await this._rollDeceptionCheck(actor, deceptionBonus, validTargets.length);

    if (!deceptionDC) {
      return {
        success: false,
        message: 'Failed to roll Deception check'
      };
    }

    // Have each target roll Initiative to oppose
    const feintResults = [];
    for (const target of validTargets) {
      const initiativeRoll = await this._rollInitiativeOpposition(target);
      const success = initiativeRoll >= deceptionDC;

      feintResults.push({
        targetName: target.name,
        targetId: target.id,
        initiativeRoll: initiativeRoll,
        deceptionDC: deceptionDC,
        success: success
      });

      if (success) {
        // Apply flat-footed condition to target for next round
        await this._applyFlatFooted(target, actor);
      }
    }

    return {
      success: true,
      actor: actor.name,
      deceptionDC: deceptionDC,
      deceptionBonus: deceptionBonus,
      targets: feintResults,
      message: `Feint vs ${validTargets.map(t => t.name).join(', ')}`
    };
  }

  /**
   * Calculate the Deception bonus for Feint
   * Includes:
   * - Base Deception modifier
   * - Vehicle size modifier (if piloting)
   * - Penalty for multiple targets (-5 each beyond first)
   * - Penalty for non-humanoid/low-INT targets (-5)
   */
  static _getDeceptionBonus(actor, targets) {
    let bonus = actor.system.skills?.deception?.total || 0;

    // Add vehicle size modifier if piloting a vehicle
    if (actor.type === 'vehicle') {
      const sizeModifier = this._getVehicleSizeModifier(actor);
      bonus += sizeModifier;

      // -5 penalty if not trained in Pilot
      if (!actor.system.skills?.pilot?.trained) {
        bonus -= 5;
      }
    }

    // Check for non-humanoid or low-intelligence targets
    for (const target of targets) {
      const isHumanoid = this._isHumanoid(target);
      const intScore = target.system.attributes?.int?.score || 10;

      if (!isHumanoid || intScore < 3) {
        bonus -= 5;
        SWSELogger.log(
          `FeintMechanics | ${target.name} is non-humanoid or has low INT - applying -5 penalty`
        );
      }
    }

    // -5 penalty for each additional target beyond first
    if (targets.length > 1) {
      bonus -= (targets.length - 1) * 5;
    }

    return bonus;
  }

  /**
   * Get vehicle size modifier for Initiative
   * Colossal/Gargantuan: -10/-5, Huge: -2, Large: -1, else: 0
   */
  static _getVehicleSizeModifier(vehicle) {
    if (vehicle.type !== 'vehicle') {return 0;}

    const size = vehicle.system.size || 'Medium';

    switch (size.toLowerCase()) {
      case 'colossal': return -10;
      case 'gargantuan': return -5;
      case 'huge': return -2;
      case 'large': return -1;
      default: return 0;
    }
  }

  /**
   * Check if a target is humanoid
   */
  static _isHumanoid(actor) {
    if (!actor.system) {return true;} // Assume humanoid if unknown

    // Check species/type
    const species = actor.system.race || actor.system.species || '';
    const type = actor.type;

    // Non-humanoid types
    const nonHumanoidTypes = ['droid', 'vehicle', 'creature'];
    if (nonHumanoidTypes.includes(type.toLowerCase())) {
      return false;
    }

    return true;
  }

  /**
   * Roll the Deception check and post to chat
   */
  static async _rollDeceptionCheck(actor, deceptionBonus, targetCount) {
    try {
      const roll = await RollEngine.safeRoll(`1d20 + ${deceptionBonus}`);
      if (!roll) {
        SWSELogger.warn(`FeintMechanics | Deception check roll failed`);
        return null;
      }
      const total = roll.total;

      // Post to chat
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: actor }),
        flavor: `<strong>Feint</strong> - Deception Check<br>` +
                `Bonus: ${deceptionBonus >= 0 ? '+' : ''}${deceptionBonus}<br>` +
                `Total DC: ${total}` +
                (targetCount > 1 ? `<br>Targets: ${targetCount}` : '')
      } , { create: true });

      return total;
    } catch (err) {
      SWSELogger.error(`FeintMechanics | Failed to roll Deception check:`, err);
      return null;
    }
  }

  /**
   * Have target roll Initiative to oppose Feint
   */
  static async _rollInitiativeOpposition(target) {
    try {
      // Get target's Initiative total
      const initiativeBonus = target.system.skills?.initiative?.total || 0;

      // Roll 1d20 + Initiative bonus
      const roll = await RollEngine.safeRoll(`1d20 + ${initiativeBonus}`);
      if (!roll) {
        SWSELogger.warn(`FeintMechanics | Initiative roll failed for ${target.name}`);
        return 0;
      }
      const total = roll.total;

      // Post to chat
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: target }),
        flavor: `<strong>Oppose Feint</strong> - Initiative Check<br>` +
                `Initiative Bonus: ${initiativeBonus >= 0 ? '+' : ''}${initiativeBonus}<br>` +
                `Total: ${total}`
      } , { create: true });

      return total;
    } catch (err) {
      SWSELogger.error(`FeintMechanics | Failed to roll Initiative opposition for ${target.name}:`, err);
      return 0;
    }
  }

  /**
   * Apply flat-footed condition to target
   * Lasts until target's next turn (rest of current round + start of next)
   */
  static async _applyFlatFooted(target, source) {
    try {
      // Create an Active Effect that applies flat-footed condition
      const currentRound = game.combat?.round || 0;
      const currentTurn = game.combat?.turn || 0;

      const effect = {
        name: `Flat-Footed (Feint from ${source.name})`,
        icon: 'icons/svg/daze.svg',
        changes: [
          {
            key: 'system.condition.flatFooted',
            mode: 5, // OVERRIDE
            value: true,
            priority: 100
          }
        ],
        duration: {
          rounds: 2, // Lasts until after target's next turn
          startRound: currentRound,
          startTurn: currentTurn
        },
        flags: {
          swse: {
            source: 'feint',
            feintSource: source.id,
            appliedRound: currentRound
          }
        }
      };

      const created = await target.createEmbeddedDocuments('ActiveEffect', [effect]);

      SWSELogger.log(
        `FeintMechanics | ${target.name} is flat-footed due to feint from ${source.name}`
      );

      ui.notifications.info(
        `${target.name} is flat-footed against ${source.name}'s next attack!`
      );

      return created[0] || null;
    } catch (err) {
      SWSELogger.error(`FeintMechanics | Failed to apply flat-footed to ${target.name}:`, err);
      return null;
    }
  }
}

export default FeintMechanics;
