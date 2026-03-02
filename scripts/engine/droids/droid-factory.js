/**
 * DroidFactory — Pure Droid Creation
 *
 * PHASE 7: Droid creation factory (mirrors VehicleFactory)
 *
 * Responsibilities:
 * - Build MutationPlan for droid creation
 * - Never mutate actor
 * - Never assign ownership
 * - Never determine placement
 * - Convert droid actor → V2-compliant MutationPlan
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class DroidFactory {
  /**
   * Build MutationPlan for droid creation
   * @param {Object} buildSpec - Droid build specification
   * @param {Object} buildSpec.droidActor - Droid actor or data
   * @param {string} buildSpec.name - Optional name override
   * @returns {Object} MutationPlan with CREATE bucket
   */
  static buildMutationPlan(buildSpec) {
    if (!buildSpec || !buildSpec.droidActor) {
      throw new Error('DroidFactory: buildSpec with droidActor required');
    }

    const tempId = this._generateTemporaryId('droid');
    const droidData = this._buildDroidActorData(buildSpec);

    swseLogger.debug('DroidFactory: Built MutationPlan', {
      tempId,
      name: droidData.name
    });

    return {
      create: {
        actors: [{
          type: 'droid',
          temporaryId: tempId,
          data: droidData
        }]
      }
    };
  }

  /**
   * Build canonical V2 droid actor data
   * @private
   */
  static _buildDroidActorData(buildSpec) {
    const actor = buildSpec.droidActor;
    const actorObj = actor.toObject ? actor.toObject() : actor;
    const actorSystem = actorObj.system || {};

    return {
      type: 'droid',
      name: buildSpec.name || actorObj.name || 'Unnamed Droid',
      img: actorObj.img || 'icons/svg/amulet.svg',
      system: {
        // Copy essential droid fields
        ...actorSystem,

        // Ensure required fields exist
        level: actorSystem.level || 1,
        credits: 0, // Droids start with 0 credits

        // Derived fields: blank (DerivedCalculator will populate)
        reflexDefense: 10,
        fortitudeDefense: 10,
        baseAttackBonus: 0
      }
    };
  }

  /**
   * Generate temporary ID for later resolution
   * @private
   */
  static _generateTemporaryId(prefix) {
    return `temp_${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
