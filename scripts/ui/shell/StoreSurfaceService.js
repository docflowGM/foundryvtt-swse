/**
 * StoreSurfaceService — View-model builder for the Holopad Store surface.
 *
 * Wraps the SWSEStore app logic to render store browsing inline within the datapad shell.
 * - Reuses existing store inventory engine
 * - Maintains cart state in actor flags
 * - Handles item categories, suggestions, purchase history
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

export class StoreSurfaceService {

  /**
   * Build the store surface view model.
   * Instantiates a temporary Store object and extracts its view model.
   *
   * @param {Actor} actor
   * @param {object} options - { currentCategory, currentView, selectedProductId }
   * @returns {Promise<object>}
   */
  static async buildViewModel(actor, options = {}) {
    try {
      if (!actor) {
        return {
          id: 'store',
          title: 'Galactic Trade Exchange',
          error: 'No actor selected'
        };
      }

      // Instantiate Store temporarily to get its view model
      const { SWSEStore } = await import(
        '/systems/foundryvtt-swse/scripts/apps/store/store-main.js'
      );

      // Create a Store instance with preserved state from options
      const storeInstance = new SWSEStore(actor, {
        closeAfterCheckout: false,
        onCheckoutComplete: null,
        onClose: null
      });

      // Restore state if provided
      if (options.currentCategory) storeInstance.currentCategory = options.currentCategory;
      if (options.currentView) storeInstance.currentView = options.currentView;
      if (options.selectedProductId) storeInstance.selectedProductId = options.selectedProductId;

      // Initialize the store (loads inventory, etc.)
      await storeInstance._initialize();

      // Get the view model from the store's _prepareContext
      const storeContext = await storeInstance._prepareContext();

      // Extract all serializable fields needed by surface-store.hbs template
      const safeContext = {
        allItems: storeContext.allItems,
        credits: storeContext.credits,
        cartCount: storeContext.cartCount,
        cartTotal: storeContext.cartTotal,
        cartEntries: storeContext.cartEntries,
        currentView: storeContext.currentView,
        currentCategory: storeContext.currentCategory,
        currentCategoryLabel: storeContext.currentCategoryLabel,
        categorySummary: storeContext.categorySummary,
        pageContext: storeContext.pageContext,
        purchaseHistoryEntries: storeContext.purchaseHistoryEntries,
        rendarrImage: storeContext.rendarrImage,
        selectedProduct: storeContext.selectedProduct
      };

      return {
        id: 'store',
        title: 'Galactic Trade Exchange',
        actorName: actor.name,
        actorCredits: storeContext.credits,
        storeContext: safeContext
        // Note: instance is NOT included in the VM - it cannot be serialized
      };
    } catch (err) {
      SWSELogger.error('[StoreSurfaceService] Failed to build store view model:', err);
      return {
        id: 'store',
        title: 'Galactic Trade Exchange',
        error: err.message
      };
    }
  }
}
