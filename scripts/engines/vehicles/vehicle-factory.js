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

import { swseLogger } from '../../utils/logger.js';

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

    // Extract template data
    const templateObj = template.toObject ? template.toObject() : template;
    const templateSystem = templateObj.system || {};

    return {
      type: 'vehicle',
      name: `${condition === 'used' ? '(Used) ' : ''}${template.name}`,
      img: template.img || 'icons/svg/anchor.svg',
      system: {
        // Vehicle-specific system fields
        category: templateSystem.category || templateSystem.vehicleType || 'starfighter',
        domain: templateSystem.domain || 'starship',

        // Stats from template
        hull: {
          value: templateSystem.hull?.value || templateSystem.hull?.max || 50,
          max: templateSystem.hull?.max || 50
        },
        shields: {
          value: templateSystem.shields?.value || templateSystem.shields?.max || 0,
          max: templateSystem.shields?.max || 0
        },
        speed: templateSystem.speed || 12,

        // Derived fields: blank (DerivedCalculator will populate after creation)
        reflexDefense: 10,
        fortitudeDefense: 10,
        baseAttackBonus: 0,

        // Store metadata for reference
        buildMetadata: {
          isNew: condition === 'new',
          condition: condition,
          templateId: template.id || template._id
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
