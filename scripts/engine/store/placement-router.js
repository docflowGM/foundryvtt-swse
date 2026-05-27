/**
 * PlacementRouter — Pure Placement Logic
 *
 * Legacy helper for TransactionEngine.execute(). Modern checkout paths use
 * TransactionEngine.executeMutationTransaction(), which prepares store asset
 * linkage directly. This router remains for callers that still compile CREATE
 * specs through the legacy cart-item API.
 */

import { swseLogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { StoreAcquisitionService } from "/systems/foundryvtt-swse/scripts/engine/store/acquisition-service.js";

export class PlacementRouter {
  /**
   * Route created asset to the purchaser's owned actor links.
   * @param {Object} context
   * @param {Object} context.purchaser - Actor making purchase
   * @param {string} context.createdTempId - Temporary ID of created actor
   * @param {string} context.assetType - Asset type (vehicle, droid, item)
   * @param {Object} context.createdSpec - CREATE actor spec, when available
   * @param {string} context.transactionId - Transaction id for link metadata
   * @returns {Object} MutationPlan fragment with SET bucket
   */
  static route({ purchaser, createdTempId, assetType, createdSpec = null, transactionId = null } = {}) {
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

    const spec = createdSpec || {
      type: assetType,
      temporaryId: createdTempId,
      data: {
        type: assetType,
        name: 'Store Asset',
        img: 'icons/svg/mystery-man.svg'
      }
    };

    return StoreAcquisitionService.buildOwnerLinkPlan(purchaser, [spec], {
      ownerActor: purchaser,
      transactionId,
      transactionContext: 'store-purchase',
      audit: {},
      source: 'PlacementRouter.route'
    }) || { set: {} };
  }
}
