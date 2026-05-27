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
    const source = actor?.doc || actor?.actor || actor;
    const actorObj = source?.toObject ? source.toObject(false) : foundry.utils.deepClone(source || {});
    const actorSystem = actorObj.system || actor?.system || {};

    // Preserve full stock droid fidelity from the compendium/world actor: items,
    // effects, prototype token, flags, and all system fields. Earlier store paths
    // rebuilt only a tiny system shell from the normalized listing, which made a
    // purchased stock droid open as a low-fidelity actor.
    const droidData = {
      ...actorObj,
      type: 'droid',
      name: buildSpec.name || actorObj.name || actor?.name || 'Unnamed Droid',
      img: actorObj.img || actor?.img || 'icons/svg/amulet.svg',
      system: {
        ...actorSystem,
        level: actorSystem.level || 1,
        credits: 0,
        reflexDefense: actorSystem.reflexDefense ?? 10,
        fortitudeDefense: actorSystem.fortitudeDefense ?? 10,
        baseAttackBonus: actorSystem.baseAttackBonus ?? 0
      }
    };

    delete droidData._id;
    delete droidData.id;
    return droidData;
  }

  /**
   * Generate temporary ID for later resolution
   * @private
   */
  static _generateTemporaryId(prefix) {
    return `temp_${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
