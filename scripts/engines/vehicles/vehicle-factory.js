/**
 * VehicleFactory — Pure Vehicle Creation
 *
 * PHASE 5: Vehicle creation as factory pattern
 *
 * Responsibilities:
 * - Build MutationPlan for vehicle creation
 * - Never mutate actor
 * - Never assign ownership
 * - Never determine placement
 * - Convert build spec → V2-compliant actor data
 */

import { swseLogger } from '../../utils/logger.js';
import { crypto } from '../../utils/helpers.js'; // Or use globalThis.crypto

export class VehicleFactory {
  /**
   * Build MutationPlan for vehicle creation
   * @param {Object} buildSpec - Vehicle build specification
   * @returns {Object} MutationPlan with CREATE bucket
   */
  static buildMutationPlan(buildSpec) {
    if (!buildSpec) {
      throw new Error('VehicleFactory: buildSpec required');
    }

    const tempId = this._generateTemporaryId('vehicle');

    const vehicleData = this._buildVehicleActorData(buildSpec);

    swseLogger.debug('VehicleFactory: Built MutationPlan', {
      tempId,
      name: vehicleData.name
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
   * Build canonical V2 vehicle actor data
   * @private
   */
  static _buildVehicleActorData(buildSpec) {
    return {
      type: 'vehicle',
      name: buildSpec.name || 'Unnamed Vehicle',
      img: buildSpec.img || 'icons/svg/anchor.svg',
      system: {
        // Vehicle-specific system fields
        category: buildSpec.category || 'starfighter',
        domain: buildSpec.domain || 'starship',

        // Stats
        hull: {
          value: buildSpec.hull?.value || 50,
          max: buildSpec.hull?.max || 50
        },
        shields: {
          value: buildSpec.shields?.value || 0,
          max: buildSpec.shields?.max || 0
        },
        speed: buildSpec.speed || 12,

        // Derived fields: blank (DerivedCalculator will populate after creation)
        reflexDefense: 10,
        fortitudeDefense: 10,
        baseAttackBonus: 0,

        // Store build metadata for reference
        buildMetadata: {
          isNew: buildSpec.condition !== 'used',
          condition: buildSpec.condition || 'new'
        }
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
