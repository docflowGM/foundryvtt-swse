/**
 * Feign Haywire Mechanic (SWSE Force Unleashed Campaign Guide)
 *
 * Droids can simulate going haywire to deceive enemies.
 * As a Full-Round Action, make a Deception check against all targets' Will Defense
 * within line of sight. Success makes targets Flat-Footed against you.
 */

import { SWSELogger } from '../utils/logger.js';

export class FeignHaywire {
  /**
   * Attempt to feign haywire
   * @param {Actor} droidActor - The droid attempting to feign haywire (must be droid type)
   * @param {Array<Actor>} targetActors - Array of targets to deceive
   * @returns {Promise<Object>} - { success: boolean, targets: Array, roll: Roll }
   */
  static async attemptFeignHaywire(droidActor, targetActors = []) {
    try {
      if (!droidActor) {
        throw new Error('Missing droid actor');
      }

      // Check if actor is a droid
      if (droidActor.type !== 'droid') {
        return {
          success: false,
          targets: [],
          message: `${droidActor.name} is not a droid and cannot use Feign Haywire`,
          error: true
        };
      }

      // Get Deception skill
      const deceptionSkill = droidActor.system?.skills?.deception;
      if (!deceptionSkill) {
        return {
          success: false,
          targets: [],
          message: `${droidActor.name} does not have Deception skill data`,
          error: true
        };
      }

      // Roll Deception
      const deceptionBonus = deceptionSkill.total || 0;
      const rollFormula = `1d20 + ${deceptionBonus}`;
      const roll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula).evaluate({ async: true });

      const deceptionRoll = roll.total;

      // Check against each target's Will Defense
      const affectedTargets = [];
      const resistedTargets = [];

      if (targetActors && targetActors.length > 0) {
        for (const target of targetActors) {
          const willDefense = target.system?.defenses?.will?.total || 10;
          const isAffected = deceptionRoll >= willDefense;

          if (isAffected) {
            affectedTargets.push({
              id: target.id,
              name: target.name,
              willDefense,
              flatFooted: true
            });
          } else {
            resistedTargets.push({
              id: target.id,
              name: target.name,
              willDefense
            });
          }
        }
      }

      return {
        success: affectedTargets.length > 0,
        affectedTargets,
        resistedTargets,
        roll: deceptionRoll,
        droidName: droidActor.name,
        totalTargets: (affectedTargets.length + resistedTargets.length),
        message: affectedTargets.length > 0
          ? `${droidActor.name} successfully feigns haywire! ${affectedTargets.length} target(s) are Flat-Footed.`
          : `${droidActor.name} attempts to feign haywire but fails to deceive anyone.`
      };
    } catch (err) {
      SWSELogger.error('Feign haywire attempt failed', err);
      throw err;
    }
  }

  /**
   * Apply Flat-Footed condition from Feign Haywire
   * @param {Actor} targetActor - The deceived target
   * @param {Actor} droidActor - The droid that feigned haywire
   */
  static async applyHaywireDeception(targetActor, droidActor) {
    if (!targetActor || !droidActor) {return;}

    try {
      // Flag target as flat-footed against this specific droid
      const haywireDeceptions = targetActor.getFlag('foundryvtt-swse', 'haywireDeceptions') || {};
      haywireDeceptions[droidActor.id] = {
        droidName: droidActor.name,
        timestamp: new Date().toISOString(),
        active: true
      };
      await targetActor.setFlag('foundryvtt-swse', 'haywireDeceptions', haywireDeceptions);

      SWSELogger.info(`${targetActor.name} is Flat-Footed against ${droidActor.name}'s haywire deception`);
    } catch (err) {
      SWSELogger.error('Failed to apply haywire deception', err);
    }
  }

  /**
   * Check if target is flat-footed against a droid due to haywire
   * @param {Actor} targetActor - The target to check
   * @param {string} droidId - The droid's ID
   * @returns {boolean} - True if flat-footed against this droid
   */
  static isAffectedByHaywire(targetActor, droidId) {
    if (!targetActor || !droidId) {return false;}

    const haywireDeceptions = targetActor.getFlag('foundryvtt-swse', 'haywireDeceptions') || {};
    return haywireDeceptions[droidId]?.active === true;
  }

  /**
   * Remove haywire deception (happens when droid takes any action)
   * @param {Actor} droidActor - The droid that was feigning haywire
   */
  static async removeHaywireDeception(droidActor) {
    if (!droidActor) {return;}

    try {
      // Get all actors and remove the haywire flag for this droid
      const haywireFlag = droidActor.id;

      // In a real scenario, you'd iterate through combat participants
      // For now, log the removal
      await droidActor.unsetFlag('foundryvtt-swse', 'currentHaywireDeception');

      SWSELogger.info(`${droidActor.name}'s haywire deception has ended`);
    } catch (err) {
      SWSELogger.error('Failed to remove haywire deception', err);
    }
  }

  /**
   * Clear all haywire deceptions for a target
   * @param {Actor} targetActor - The target to clear deceptions from
   */
  static async clearHaywireDeceptions(targetActor) {
    if (!targetActor) {return;}

    try {
      await targetActor.unsetFlag('foundryvtt-swse', 'haywireDeceptions');
    } catch (err) {
      SWSELogger.error('Failed to clear haywire deceptions', err);
    }
  }

  /**
   * Get all droids currently running haywire in a combat
   * @param {Combat} combat - The combat to check
   * @returns {Array<Actor>} - Array of droids currently feigning haywire
   */
  static getActiveHaywireDroids(combat) {
    if (!combat || !combat.combatants) {return [];}

    const haywireDroids = [];
    for (const combatant of combat.combatants) {
      const actor = combatant.actor;
      if (actor?.type === 'droid' && actor.getFlag('foundryvtt-swse', 'currentHaywireDeception')) {
        haywireDroids.push(actor);
      }
    }

    return haywireDroids;
  }
}
