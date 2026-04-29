/**
 * StoreSurfaceService — View-model builder for the Holopad Store surface.
 *
 * Caches SWSEStore instances per actor so _initialize() (inventory loading)
 * only runs once per session. Subsequent renders just call _prepareContext()
 * after reloading cart state from actor flags.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

// Module-level cache: actorId → SWSEStore instance
const _instanceCache = new Map();

export class StoreSurfaceService {

  /**
   * Get or create an initialized SWSEStore for the given actor.
   * Returns null on failure. Used by the controller for cart mutations.
   */
  static async getOrCreateInstance(actor) {
    if (!actor) return null;
    if (_instanceCache.has(actor.id)) return _instanceCache.get(actor.id);

    try {
      const { SWSEStore } = await import(
        '/systems/foundryvtt-swse/scripts/apps/store/store-main.js'
      );
      const inst = new SWSEStore(actor, {
        closeAfterCheckout: false,
        onCheckoutComplete: null,
        onClose: null
      });
      await inst._initialize();
      _instanceCache.set(actor.id, inst);
      return inst;
    } catch (err) {
      SWSELogger.error('[StoreSurfaceService] Failed to create store instance:', err);
      return null;
    }
  }

  /**
   * Invalidate cached instance for an actor (e.g. after actor change).
   */
  static invalidate(actorId) {
    _instanceCache.delete(actorId);
  }

  /**
   * Build the store surface view model.
   *
   * @param {Actor} actor
   * @param {object} options - { currentCategory, currentView, selectedProductId }
   * @returns {Promise<object>}
   */
  static async buildViewModel(actor, options = {}) {
    try {
      if (!actor) {
        return { id: 'store', title: 'Galactic Trade Exchange', error: 'No actor selected' };
      }

      const storeInstance = await StoreSurfaceService.getOrCreateInstance(actor);
      if (!storeInstance) {
        return { id: 'store', title: 'Galactic Trade Exchange', error: 'Store unavailable' };
      }

      // Sync navigation state from shell options
      if (options.currentCategory !== undefined) storeInstance.currentCategory = options.currentCategory ?? '';
      if (options.currentView) storeInstance.currentView = options.currentView;
      if (options.selectedProductId !== undefined) storeInstance.selectedProductId = options.selectedProductId ?? null;

      // Reload cart from actor flags (reflects any controller mutations)
      storeInstance.cart = storeInstance._loadCartFromActor();

      // Build context using the cached, already-initialized instance
      const storeContext = await storeInstance._prepareContext();

      const currentView = storeContext.currentView ?? 'browse';
      const cartRemaining = storeContext.pageContext?.cartRemaining ?? 0;
      const safeContext = {
        allItems: storeContext.allItems ?? [],
        credits: storeContext.credits ?? 0,
        cartCount: storeContext.cartCount ?? 0,
        cartTotal: storeContext.cartTotal ?? 0,
        cartEntries: storeContext.cartEntries ?? [],
        currentView,
        isBrowseOrDetail: currentView === 'browse' || currentView === 'detail',
        currentCategory: storeContext.currentCategory ?? '',
        currentCategoryLabel: storeContext.currentCategoryLabel ?? 'All Listings',
        categorySummary: storeContext.categorySummary ?? [],
        pageContext: storeContext.pageContext ?? {},
        cartRemainingNeg: cartRemaining < 0,
        purchaseHistoryEntries: storeContext.purchaseHistoryEntries ?? [],
        purchaseHistoryCount: storeContext.purchaseHistoryCount ?? 0,
        rendarrImage: storeContext.rendarrImage ?? '',
        rendarrWelcome: storeContext.rendarrWelcome ?? '',
        selectedProduct: storeContext.selectedProduct ?? null,
        isGM: storeContext.isGM ?? false
      };

      return {
        id: 'store',
        title: 'Galactic Trade Exchange',
        actorName: actor.name,
        actorCredits: storeContext.credits ?? 0,
        storeContext: safeContext
      };
    } catch (err) {
      SWSELogger.error('[StoreSurfaceService] Failed to build store view model:', err);
      return { id: 'store', title: 'Galactic Trade Exchange', error: err.message };
    }
  }
}
