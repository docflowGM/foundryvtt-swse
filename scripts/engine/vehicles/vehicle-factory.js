/**
 * VehicleFactory — Pure Vehicle Creation
 *
 * PHASE 5: Vehicle creation as factory pattern
 *
 * Responsibilities:
 * - Build MutationPlan for vehicle creation from template
 * - Convert build spec or template → V2-compliant actor data
 * - Never mutate actor
 * - Never assign ownership
 * - Never determine placement
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class VehicleFactory {
  /**
   * Build MutationPlan for vehicle from template (store purchase)
   * @param {Object} buildSpec
   * @param {Object} buildSpec.template - Vehicle template item
   * @param {string} buildSpec.condition - "new" or "used"
   * @returns {Object} MutationPlan with CREATE bucket
   */
  static buildMutationPlan(buildSpec) {
    if (!buildSpec || !buildSpec.template) {
      throw new Error('VehicleFactory: buildSpec with template required');
    }

    const tempId = this._generateTemporaryId('vehicle');
    const vehicleData = this._buildVehicleActorData(buildSpec);

    swseLogger.debug('VehicleFactory: Built MutationPlan', {
      tempId,
      name: vehicleData.name,
      condition: buildSpec.condition
    });

    return {
      create: {
        actors: [{
          type: 'vehicle',
          temporaryId: tempId,
          data: vehicleData
        }]
      }
    };
  }

  /**
   * Build canonical V2 vehicle actor data from template
   * @private
   */
  static _buildVehicleActorData(buildSpec) {
    const template = buildSpec.template;
    const condition = buildSpec.condition || 'new';

    const source = template?.doc || template?.template || template;
    const templateObj = source?.toObject ? source.toObject(false) : foundry.utils.deepClone(source || {});
    const templateSystem = templateObj.system || template?.system || {};

    // Preserve full stock ship/vehicle fidelity from the compendium/world actor:
    // embedded weapons, effects, token defaults, flags, and vehicle-specific
    // system fields. The minimal fallback fields stay only as safe defaults.
    const vehicleData = {
      ...templateObj,
      type: 'vehicle',
      name: `${condition === 'used' ? '(Used) ' : ''}${templateObj.name || template?.name || 'Unnamed Vehicle'}`,
      img: templateObj.img || template?.img || 'icons/svg/anchor.svg',
      system: {
        ...templateSystem,
        category: templateSystem.category || templateSystem.vehicleType || 'starfighter',
        domain: templateSystem.domain || 'starship',
        hull: {
          value: templateSystem.hull?.value ?? templateSystem.hull?.max ?? 50,
          max: templateSystem.hull?.max ?? templateSystem.hull?.value ?? 50
        },
        shields: {
          value: templateSystem.shields?.value ?? templateSystem.shields?.max ?? 0,
          max: templateSystem.shields?.max ?? templateSystem.shields?.value ?? 0
        },
        speed: templateSystem.speed || 12,
        reflexDefense: templateSystem.reflexDefense ?? 10,
        fortitudeDefense: templateSystem.fortitudeDefense ?? 10,
        baseAttackBonus: templateSystem.baseAttackBonus ?? 0,
        buildMetadata: {
          ...(templateSystem.buildMetadata || {}),
          isNew: condition === 'new',
          condition,
          templateId: template?.id || template?._id || templateObj._id || templateObj.id
        }
      }
    };

    delete vehicleData._id;
    delete vehicleData.id;
    return vehicleData;
  }

  /**
   * Generate temporary ID for later resolution
   * @private
   */
  static _generateTemporaryId(prefix) {
    return `temp_${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
