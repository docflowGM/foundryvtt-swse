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
  addDroidToCart,
  addVehicleToCart,
  removeFromCartById,
  clearCart,
  checkout
} from '/systems/foundryvtt-swse/scripts/apps/store/store-checkout.js';

import { StoreSurfaceService } from '/systems/foundryvtt-swse/scripts/ui/shell/StoreSurfaceService.js';
import { initRendarrStoreSplash } from '/systems/foundryvtt-swse/scripts/apps/store/store-splash.js';

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

    if (this._attachSplash(root, signal)) return;

    this._hydrateControls(root);

    root.querySelectorAll('[data-shell-action="return-to-home"]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        await this._host.setSurface('home');
        this._host.render(false);
      }, { signal });
    });

    root.querySelectorAll('[data-ss-tab]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        const view = el.dataset.ssTab;
        if (!view) return;
        const patch = { currentView: view };
        if (view !== 'browse') patch.selectedProductId = null;
        this._setOptions(patch);
      }, { signal });
    });

    root.querySelectorAll('[data-action="category-nav"]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        const category = el.dataset.category ?? '';
        this._setOptions({ currentCategory: category, currentView: 'browse', selectedProductId: null });
      }, { signal });
    });

    root.querySelectorAll('[data-action="clear-filters"]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        this._setOptions({
          currentCategory: '',
          currentView: 'browse',
          selectedProductId: null,
          search: '',
          availability: 'all',
          sort: 'default'
        });
      }, { signal });
    });

    const searchInput = root.querySelector('#ss-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this._setOptions({ search: searchInput.value ?? '' }, false);
        this._clientFilter(root);
      }, { signal });
    }

    const availFilter = root.querySelector('#ss-avail');
    if (availFilter) {
      availFilter.addEventListener('change', () => {
        this._setOptions({ availability: availFilter.value ?? 'all' }, false);
        this._clientFilter(root);
      }, { signal });
    }

    const sortSel = root.querySelector('#ss-sort');
    if (sortSel) {
      sortSel.addEventListener('change', () => {
        this._setOptions({ sort: sortSel.value ?? 'default' }, false);
        this._clientSort(root);
      }, { signal });
    }

    root.querySelectorAll('.store-card[data-item-id]').forEach(card => {
      card.addEventListener('click', ev => {
        if (ev.target instanceof Element && ev.target.closest('button')) return;
        const id = card.dataset.itemId;
        if (!id) return;
        this._toggleDetail(id);
      }, { signal });
    });

    root.querySelectorAll('[data-action="expand-product"]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const id = ev.currentTarget.dataset.itemId;
        if (!id) return;
        this._toggleDetail(id);
      }, { signal });
    });

    root.querySelectorAll('[data-action="detail-back"]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        this._setOptions({ selectedProductId: null, currentView: 'browse' });
      }, { signal });
    });

    root.querySelectorAll('[data-action="add-to-cart"]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const button = ev.currentTarget;
        const id = button.dataset.itemId;
        const itemType = button.dataset.itemType || 'item';
        const condition = button.dataset.condition || '';
        if (!id) return;
        await this._addToCart({ id, itemType, condition });
      }, { signal });
    });

    root.querySelectorAll('[data-action="detail-add-to-cart"]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        const button = ev.currentTarget;
        const id = button.dataset.itemId || this._host._shellSurfaceOptions?.selectedProductId;
        const itemType = button.dataset.itemType || 'item';
        const condition = button.dataset.condition || '';
        if (!id) return;
        await this._addToCart({ id, itemType, condition, rerenderPatch: { currentView: 'cart' } });
      }, { signal });
    });

    root.querySelectorAll('[data-action="remove-from-cart"]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        const id = ev.currentTarget.dataset.itemId;
        const typeRaw = (ev.currentTarget.dataset.itemType || 'item').toLowerCase();
        const type = typeRaw === 'droid' ? 'droids' : typeRaw === 'vehicle' ? 'vehicles' : 'items';
        const condition = (ev.currentTarget.dataset.condition || '').toLowerCase();
        if (!id) return;
        const store = await StoreSurfaceService.getOrCreateInstance(this._actor);
        if (!store) return;
        if (type === 'vehicles' && condition) {
          const idx = store.cart.vehicles.findIndex(vehicle => vehicle.id === id && (vehicle.condition || 'new').toLowerCase() === condition);
          if (idx !== -1) {
            store.cart.vehicles.splice(idx, 1);
          }
        } else {
          removeFromCartById(store.cart, type, id);
        }
        await store._persistCart();
        this._host.render(false);
      }, { signal });
    });

    root.querySelectorAll('[data-action="clear-cart"]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        const store = await StoreSurfaceService.getOrCreateInstance(this._actor);
        if (!store) return;
        clearCart(store.cart);
        await store._persistCart();
        this._setOptions({ currentView: 'browse', selectedProductId: null });
      }, { signal });
    });

    root.querySelectorAll('[data-action="proceed-checkout"]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        this._setOptions({ currentView: 'checkout', selectedProductId: null });
      }, { signal });
    });

    root.querySelectorAll('[data-action="return-to-cart"]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        this._setOptions({ currentView: 'cart' });
      }, { signal });
    });

    root.querySelectorAll('[data-action="confirm-checkout"]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        const store = await StoreSurfaceService.getOrCreateInstance(this._actor);
        if (!store) return;
        store.cart = store._loadCartFromActor();
        const result = await checkout(store, null);
        const view = result?.success ? 'history' : 'cart';
        this._setOptions({ currentView: view, selectedProductId: null });
      }, { signal });
    });

    this._clientSort(root);
    this._focusHotDeal(root);
  }

  _attachSplash(root, signal) {
    const splash = root.querySelector?.('.swse-store-splash--rendarrs');
    if (!splash) return false;
    initRendarrStoreSplash(root, {
      signal,
      onContinue: () => this._enterStore(),
      onHotDealOpen: (payload) => this._openHotDeal(payload)
    });
    return true;
  }

  _enterStore(patch = {}) {
    this._setOptions({ splashComplete: true, currentView: 'browse', ...patch });
  }

  _openHotDeal({ id, name, category } = {}) {
    if (!id && !name) {
      this._enterStore();
      return;
    }
    this._enterStore({
      selectedProductId: id || null,
      currentCategory: category || '',
      search: name || '',
      hotDealFocusId: id || null
    });
  }

  _focusHotDeal(root) {
    const focusId = this._host._shellSurfaceOptions?.hotDealFocusId;
    if (!focusId) return;
    const selector = `.store-card[data-item-id="${CSS.escape(focusId)}"]`;
    const card = root.querySelector(selector);
    if (!card) return;
    card.classList.add('is-hot-deal-focus');
    card.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    window.setTimeout(() => card.classList.remove('is-hot-deal-focus'), 1800);
    this._host._shellSurfaceOptions = { ...this._host._shellSurfaceOptions, hotDealFocusId: null };
  }

  destroy() {
    this._abort?.abort();
    this._abort = null;
  }

  _hydrateControls(root) {
    const state = this._host._shellSurfaceOptions ?? {};
    const search = root.querySelector('#ss-search');
    if (search) search.value = state.search ?? '';
    const availability = root.querySelector('#ss-avail');
    if (availability) availability.value = state.availability ?? 'all';
    const sort = root.querySelector('#ss-sort');
    if (sort) sort.value = state.sort ?? 'default';
  }

  async _addToCart({ id, itemType = 'item', condition = '', rerenderPatch = null }) {
    const store = await StoreSurfaceService.getOrCreateInstance(this._actor);
    if (!store) return;

    if (itemType === 'vehicle') {
      await addVehicleToCart(store, id, condition || 'new', null);
    } else if (itemType === 'droid') {
      await addDroidToCart(store, id, null);
    } else {
      await addItemToCart(store, id, null);
    }

    await store._persistCart();

    if (rerenderPatch) {
      this._setOptions(rerenderPatch);
      return;
    }
    this._host.render(false);
  }

  _toggleDetail(id) {
    const currentId = this._host._shellSurfaceOptions?.selectedProductId;
    const shouldClear = currentId === id;
    this._setOptions({
      currentView: 'browse',
      selectedProductId: shouldClear ? null : id
    });
  }

  _setOptions(patch, rerender = true) {
    this._host._shellSurfaceOptions = { ...this._host._shellSurfaceOptions, ...patch };
    if (rerender) this._host.render(false);
  }

  _clientFilter(root) {
    const searchVal = (root.querySelector('#ss-search')?.value ?? '').toLowerCase();
    const availVal = (root.querySelector('#ss-avail')?.value ?? 'all').toLowerCase();
    const categoryVal = (this._host._shellSurfaceOptions?.currentCategory ?? '').toLowerCase();

    let visible = 0;
    root.querySelectorAll('.store-card[data-item-id]').forEach(card => {
      const name = (card.dataset.name ?? '').toLowerCase();
      const cat = (card.dataset.category ?? '').toLowerCase();
      const subtype = (card.dataset.subcategory ?? '').toLowerCase();
      const avail = (card.dataset.availability ?? '').toLowerCase();

      const matchSearch = !searchVal || name.includes(searchVal) || cat.includes(searchVal) || subtype.includes(searchVal);
      const matchAvail = availVal === 'all' || avail.startsWith(availVal);
      const matchCategory = !categoryVal || cat === categoryVal;

      const show = matchSearch && matchAvail && matchCategory;
      card.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });

    const counter = root.querySelector('[data-results-count]');
    if (counter) counter.textContent = visible;

    const emptyEl = root.querySelector('.store-browse-empty');
    if (emptyEl) emptyEl.style.display = visible === 0 ? '' : 'none';
  }

  _clientSort(root) {
    const sortVal = root.querySelector('#ss-sort')?.value ?? 'default';
    const grid = root.querySelector('.store-card-grid');
    if (!grid) {
      this._clientFilter(root);
      return;
    }

    const cards = Array.from(grid.querySelectorAll('.store-card[data-item-id]'));
    cards.sort((a, b) => {
      if (sortVal === 'price-asc') return parseFloat(a.dataset.price ?? 0) - parseFloat(b.dataset.price ?? 0);
      if (sortVal === 'price-desc') return parseFloat(b.dataset.price ?? 0) - parseFloat(a.dataset.price ?? 0);
      if (sortVal === 'name-asc') return (a.dataset.name ?? '').localeCompare(b.dataset.name ?? '');
      return parseFloat(b.dataset.score ?? 0) - parseFloat(a.dataset.score ?? 0);
    });
    cards.forEach(card => grid.appendChild(card));
    this._clientFilter(root);
  }
}
