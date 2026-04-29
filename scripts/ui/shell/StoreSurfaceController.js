/**
 * StoreSurfaceController — DOM/event controller for the shell-native store surface.
 *
 * Owns all store-surface interactivity within the datapad shell.
 * - Tab switching, search, filters, sort: scoped to surface root
 * - Cart mutations delegate to real checkout functions + actor-flag persistence
 * - Re-render triggered via host.render(false) after state changes
 * - AbortController-based cleanup on each re-render
 */

import {
  addItemToCart,
  removeFromCartById,
  clearCart,
  checkout
} from '/systems/foundryvtt-swse/scripts/apps/store/store-checkout.js';

import { StoreSurfaceService } from '/systems/foundryvtt-swse/scripts/ui/shell/StoreSurfaceService.js';

export class StoreSurfaceController {
  /**
   * @param {object} host - Character sheet (has _shellSurfaceOptions, render, setSurface)
   * @param {Actor} actor
   */
  constructor(host, actor) {
    this._host = host;
    this._actor = actor;
    this._abort = null;
  }

  /** Wire all store surface events. Called after each render. */
  attach(root) {
    this._abort?.abort();
    this._abort = new AbortController();
    const { signal } = this._abort;

    // Return home
    root.querySelectorAll('[data-shell-action="return-to-home"]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        await this._host.setSurface('home');
        this._host.render(false);
      }, { signal });
    });

    // Tab switching (re-render)
    root.querySelectorAll('[data-ss-tab]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        const view = el.dataset.ssTab;
        this._setOptions({ currentView: view });
      }, { signal });
    });

    // Category nav (re-render)
    root.querySelectorAll('[data-action="category-nav"]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        const cat = el.dataset.category ?? '';
        this._setOptions({ currentCategory: cat, currentView: 'browse' });
      }, { signal });
    });

    // Clear filters
    root.querySelectorAll('[data-action="clear-filters"]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        this._setOptions({ currentCategory: '', currentView: 'browse' });
      }, { signal });
    });

    // Search: client-side filter (no re-render)
    const searchInput = root.querySelector('#ss-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => this._clientFilter(root), { signal });
    }

    // Availability filter: client-side
    const availFilter = root.querySelector('#ss-avail');
    if (availFilter) {
      availFilter.addEventListener('change', () => this._clientFilter(root), { signal });
    }

    // Sort: client-side sort + filter
    const sortSel = root.querySelector('#ss-sort');
    if (sortSel) {
      sortSel.addEventListener('change', () => this._clientSort(root), { signal });
    }

    // Expand product → detail view (re-render)
    root.querySelectorAll('[data-action="expand-product"]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.stopPropagation();
        const id = ev.currentTarget.dataset.itemId;
        if (!id) return;
        this._setOptions({ selectedProductId: id, currentView: 'detail' });
      }, { signal });
    });

    // Back from detail → browse
    root.querySelectorAll('[data-action="detail-back"]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        this._setOptions({ selectedProductId: null, currentView: 'browse' });
      }, { signal });
    });

    // Add to cart from card (re-render)
    root.querySelectorAll('[data-action="add-to-cart"]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.stopPropagation();
        const id = ev.currentTarget.dataset.itemId;
        if (!id) return;
        const store = await StoreSurfaceService.getOrCreateInstance(this._actor);
        if (!store) return;
        addItemToCart(store, id, null);
        await store._persistCart();
        this._host.render(false);
      }, { signal });
    });

    // Add to cart from detail view (re-render)
    root.querySelectorAll('[data-action="detail-add-to-cart"]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        const id = this._host._shellSurfaceOptions?.selectedProductId;
        if (!id) return;
        const store = await StoreSurfaceService.getOrCreateInstance(this._actor);
        if (!store) return;
        addItemToCart(store, id, null);
        await store._persistCart();
        this._setOptions({ selectedProductId: null, currentView: 'cart' });
      }, { signal });
    });

    // Remove from cart (re-render)
    root.querySelectorAll('[data-action="remove-from-cart"]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        const id = ev.currentTarget.dataset.itemId;
        const typeRaw = (ev.currentTarget.dataset.itemType || 'item').toLowerCase();
        const type = typeRaw === 'droid' ? 'droids' : typeRaw === 'vehicle' ? 'vehicles' : 'items';
        if (!id) return;
        const store = await StoreSurfaceService.getOrCreateInstance(this._actor);
        if (!store) return;
        removeFromCartById(store.cart, type, id);
        await store._persistCart();
        this._host.render(false);
      }, { signal });
    });

    // Clear cart (re-render)
    root.querySelectorAll('[data-action="clear-cart"]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        const store = await StoreSurfaceService.getOrCreateInstance(this._actor);
        if (!store) return;
        clearCart(store.cart);
        await store._persistCart();
        this._setOptions({ currentView: 'browse' });
      }, { signal });
    });

    // Proceed to checkout (re-render)
    root.querySelectorAll('[data-action="proceed-checkout"]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        this._setOptions({ currentView: 'checkout' });
      }, { signal });
    });

    // Return to cart from checkout
    root.querySelectorAll('[data-action="return-to-cart"]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        this._setOptions({ currentView: 'cart' });
      }, { signal });
    });

    // Confirm checkout
    root.querySelectorAll('[data-action="confirm-checkout"]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        const store = await StoreSurfaceService.getOrCreateInstance(this._actor);
        if (!store) return;
        // Re-sync cart from actor flags before checkout
        store.cart = store._loadCartFromActor();
        const result = await checkout(store, null);
        const view = result?.success ? 'history' : 'cart';
        this._setOptions({ currentView: view });
      }, { signal });
    });

    // Run initial client filter to apply any pre-existing search state
    this._clientFilter(root);
  }

  destroy() {
    this._abort?.abort();
    this._abort = null;
  }

  // --- private ---

  _setOptions(patch) {
    this._host._shellSurfaceOptions = { ...this._host._shellSurfaceOptions, ...patch };
    this._host.render(false);
  }

  _clientFilter(root) {
    const searchVal = (root.querySelector('#ss-search')?.value ?? '').toLowerCase();
    const availVal = (root.querySelector('#ss-avail')?.value ?? 'all').toLowerCase();

    let visible = 0;
    root.querySelectorAll('.store-card[data-item-id]').forEach(card => {
      const name = (card.dataset.name ?? '').toLowerCase();
      const cat = (card.dataset.category ?? '').toLowerCase();
      const avail = (card.dataset.availability ?? '').toLowerCase();

      const matchSearch = !searchVal || name.includes(searchVal) || cat.includes(searchVal);
      const matchAvail = availVal === 'all' || avail.startsWith(availVal);

      const show = matchSearch && matchAvail;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    const counter = root.querySelector('[data-results-count]');
    if (counter) counter.textContent = visible;

    const emptyEl = root.querySelector('.store-browse-empty');
    if (emptyEl) emptyEl.style.display = visible === 0 ? '' : 'none';
  }

  _clientSort(root) {
    const sortVal = root.querySelector('#ss-sort')?.value ?? 'default';
    const grid = root.querySelector('.store-card-grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.store-card[data-item-id]'));
    cards.sort((a, b) => {
      if (sortVal === 'price-asc') return parseFloat(a.dataset.price ?? 0) - parseFloat(b.dataset.price ?? 0);
      if (sortVal === 'price-desc') return parseFloat(b.dataset.price ?? 0) - parseFloat(a.dataset.price ?? 0);
      if (sortVal === 'name-asc') return (a.dataset.name ?? '').localeCompare(b.dataset.name ?? '');
      // default: suggestion score desc
      return parseFloat(b.dataset.score ?? 0) - parseFloat(a.dataset.score ?? 0);
    });
    cards.forEach(c => grid.appendChild(c));
    this._clientFilter(root);
  }
}
