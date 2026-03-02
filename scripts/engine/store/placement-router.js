/**
 * PlacementRouter — Pure Placement Logic
 *
 * PHASE 6: Deterministic asset placement routing
 *
 * Responsibilities:
 * - Route created assets based on purchaser type
 * - Return MutationPlan fragments (ADD bucket)
 * - Never mutate
 * - Never assign ownership
 * - Never inspect credits or cart
 *
 * Routing rules:
 * - Character/Droid/NPC → possessions (embedded reference)
 * - Vehicle → hangar (embedded collection)
 * - (Phase 6+): Faction → faction inventory
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export class PlacementRouter {
  /**
   * Route created asset to placement location
   * @param {Object} context
   * @param {Actor} context.purchaser - Actor making purchase
   * @param {string} context.createdTempId - Temporary ID of created actor
   * @param {string} context.assetType - Asset type (vehicle, droid, item)
   * @returns {Object} MutationPlan fragment with ADD bucket
   */
  static route({ purchaser, createdTempId, assetType }) {
    if (!purchaser) {
      throw new Error('PlacementRouter: purchaser required');
    }

    if (!createdTempId || typeof createdTempId !== 'string') {
      throw new Error('PlacementRouter: createdTempId required');
    }

    swseLogger.debug('PlacementRouter: Routing asset', {
      purchaser: purchaser.id,
      purchaserType: purchaser.type,
      assetType,
      tempId: createdTempId
    });

    // Route based on purchaser type
    if (purchaser.type === 'vehicle') {
      return this._routeToHangar(purchaser, createdTempId, assetType);
    }

    // Default: route to possessions (character, droid, NPC)
    return this._routeToPossessions(purchaser, createdTempId, assetType);
  }

  /**
   * Route asset to possessions (embedded in purchaser)
   * @private
   */
  static _routeToPossessions(purchaser, tempId, assetType) {
    swseLogger.debug('PlacementRouter: Route to possessions', {
      purchaser: purchaser.id,
      assetType,
      tempId
    });

    return {
      add: {
        possessions: [tempId]
      }
    };
  }

  /**
   * Route asset to hangar (vehicle purchasing vehicle)
   * @private
   */
  static _routeToHangar(purchaser, tempId, assetType) {
    swseLogger.debug('PlacementRouter: Route to hangar', {
      purchaser: purchaser.id,
      assetType,
      tempId
    });

    return {
      add: {
        hangar: [tempId]
      }
    };
  }
}
