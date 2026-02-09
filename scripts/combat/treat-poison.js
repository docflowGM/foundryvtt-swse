/**
 * Treat Poison Mechanic (SWSE Core Rulebook)
 *
 * As a Full-Round Action, trained characters can treat a poisoned victim.
 * Make a Treat Injury check; if result >= Poison's DC, detoxify the poison.
 */

import { SWSELogger } from '../utils/logger.js';

export class TreatPoison {
  /**
   * Attempt to treat poison on a victim
   * @param {Actor} healerActor - The healer/medic (must be trained in Treat Injury)
   * @param {Actor} victimActor - The poisoned character
   * @param {number} poisonDC - The DC of the poison to treat
   * @returns {Promise<Object>} - { success: boolean, roll: Roll, detoxified: boolean }
   */
  static async treatPoison(healerActor, victimActor, poisonDC = 15) {
    try {
      if (!healerActor || !victimActor) {
        throw new Error('Missing healer or victim actor');
      }

      // Check if healer is trained in Treat Injury
      const treatInjurySkill = healerActor.system?.skills?.treat_injury;
      if (!treatInjurySkill?.trained) {
        return {
          success: false,
          detoxified: false,
          message: `${healerActor.name} must be trained in Treat Injury to treat poison`,
          error: true
        };
      }

      // Check if healer has a medical kit (flag-based check)
      const hasMedKit = this._hasMedicalKit(healerActor);
      if (!hasMedKit) {
        return {
          success: false,
          detoxified: false,
          message: `${healerActor.name} needs a Medical Kit to treat poison`,
          error: true
        };
      }

      // Roll Treat Injury check
      const treatInjuryBonus = treatInjurySkill.total || 0;
      const rollFormula = `1d20 + ${treatInjuryBonus}`;
      const roll = await globalThis.SWSE.RollEngine.safeRoll(rollFormula).evaluate({ async: true });

      const treatRoll = roll.total;
      const success = treatRoll >= poisonDC;

      if (!success) {
        return {
          success: false,
          detoxified: false,
          roll: treatRoll,
          dc: poisonDC,
          healerName: healerActor.name,
          victimName: victimActor.name,
          message: `${healerActor.name} fails to detoxify the poison in ${victimActor.name}'s system (rolled ${treatRoll} vs DC ${poisonDC})`
        };
      }

      // Success: detoxify the poison
      await this._removePoisonCondition(victimActor);

      return {
        success: true,
        detoxified: true,
        roll: treatRoll,
        dc: poisonDC,
        healerName: healerActor.name,
        victimName: victimActor.name,
        message: `${healerActor.name} successfully detoxifies the poison in ${victimActor.name}'s system! All poison effects have been removed.`
      };
    } catch (err) {
      SWSELogger.error('Treat poison action failed', err);
      throw err;
    }
  }

  /**
   * Check if healer has a medical kit
   * @private
   */
  static _hasMedicalKit(actor) {
    if (!actor) {return false;}

    // Check for medical kit item
    const medKit = actor.items?.find(item => {
      const name = (item.name || '').toLowerCase();
      return name.includes('medical kit') || name.includes('medkit') || name.includes('med kit');
    });

    return !!medKit;
  }

  /**
   * Remove poison condition from victim
   * @private
   */
  static async _removePoisonCondition(victim) {
    if (!victim) {return;}

    try {
      // Remove poison flag
      await victim.unsetFlag('foundryvtt-swse', 'isPoisoned');
      await victim.unsetFlag('foundryvtt-swse', 'poisonDetails');

      // Remove any persistent conditions caused by poison
      const persistentConditions = victim.getFlag('foundryvtt-swse', 'persistentConditions') || {};
      const filteredConditions = Object.fromEntries(
        Object.entries(persistentConditions).filter(([_, condition]) => condition.source !== 'poison')
      );

      if (Object.keys(filteredConditions).length > 0) {
        await victim.setFlag('foundryvtt-swse', 'persistentConditions', filteredConditions);
      } else {
        await victim.unsetFlag('foundryvtt-swse', 'persistentConditions');
      }

      SWSELogger.info(`${victim.name} has been detoxified of poison`);
    } catch (err) {
      SWSELogger.error('Failed to remove poison condition', err);
    }
  }

  /**
   * Apply poison condition to victim
   * @param {Actor} victim - The poisoned character
   * @param {Object} poisonData - Poison details { name, dc, effect, duration }
   */
  static async applyPoison(victim, poisonData = {}) {
    if (!victim) {return;}

    try {
      const {
        name = 'Unknown Poison',
        dc = 15,
        effect = 'Ongoing damage',
        duration = '1 minute'
      } = poisonData;

      await victim.setFlag('foundryvtt-swse', 'isPoisoned', true);
      await victim.setFlag('foundryvtt-swse', 'poisonDetails', {
        name,
        dc,
        effect,
        duration,
        appliedAt: new Date().toISOString()
      });

      SWSELogger.info(`${victim.name} has been poisoned with ${name}`);
    } catch (err) {
      SWSELogger.error('Failed to apply poison condition', err);
    }
  }

  /**
   * Check if character is poisoned
   * @param {Actor} actor - The character to check
   * @returns {Object|boolean} - False if not poisoned, poison details if poisoned
   */
  static isPoisoned(actor) {
    if (!actor) {return false;}
    return actor.getFlag('foundryvtt-swse', 'isPoisoned')
      ? actor.getFlag('foundryvtt-swse', 'poisonDetails')
      : false;
  }
}
