/**
 * StoreSurfaceController — DOM/event controller for the shell-native store surface.
 *
 * Owns all store-surface interactivity within the datapad shell.
 * - Tab switching, search, filters, sort: scoped to surface root
 * - Cart mutations delegate to real checkout functions + actor-flag persistence
 * - Re-render triggered via host.requestSurfaceRender after state changes
 * - AbortController-based cleanup on each re-render
 */

import {
  addItemToCart,
  addDroidToCart,
  addVehicleToCart,
  removeFromCartById,
  clearCart,
  checkout,
  buildDroidWithBuilder,
  createCustomStarship
} from '/systems/foundryvtt-swse/scripts/apps/store/store-checkout.js';

import { StoreSurfaceService } from '/systems/foundryvtt-swse/scripts/ui/shell/StoreSurfaceService.js';
import { initRendarrStoreSplash } from '/systems/foundryvtt-swse/scripts/apps/store/store-splash.js';

function normalizeStoreFilterValue(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeAvailabilityText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function cartEntryCount(cart = {}) {
  return (cart.items?.length ?? 0) + (cart.droids?.length ?? 0) + (cart.vehicles?.length ?? 0);
}

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
    this._actor = this._host?.actor ?? this._actor;
    this._abort?.abort();
    this._abort = new AbortController();
    const { signal } = this._abort;

    if (this._attachSplash(root, signal)) return;

    this._hydrateControls(root);
    this._attachScrollBridge(root, signal);

    root.querySelectorAll('[data-shell-action="return-to-home"]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        await this._host.setSurface('home');
        await this._requestRender('store-return-home');
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
        // Phase 2: Clear subcategory/family when switching categories
        this._setOptions({
          currentCategory: category,
          storeRenderLimit: 36,
          currentSubcategory: null,
          currentFamily: null,
          currentView: 'browse',
          selectedProductId: null
        });
      }, { signal });
    });

    // Phase 2: Subcategory navigation
    root.querySelectorAll('[data-action="subcategory-nav"]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        const subcategory = el.dataset.subcategory || null;
        this._setOptions({
          currentSubcategory: subcategory,
          storeRenderLimit: 36,
          currentFamily: el.dataset.family || null,
          currentView: 'browse',
          selectedProductId: null
        });
      }, { signal });
    });

    // Phase 2: Weapon family navigation (melee/ranged grouping)
    root.querySelectorAll('[data-action="family-nav"]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        const family = el.dataset.family ?? null;
        // Keep current category and subcategory, change family filter
        this._setOptions({
          currentFamily: family,
          storeRenderLimit: 36,
          currentView: 'browse',
          selectedProductId: null
        });
      }, { signal });
    });

    root.querySelectorAll('[data-action="clear-filters"]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        this._setOptions({
          currentCategory: 'weapons',
          currentSubcategory: null,  // Phase 2: Clear secondary nav
          currentFamily: null,        // Phase 2: Clear family filter
          currentView: 'browse',
          selectedProductId: null,
          storeRenderLimit: 36,
          search: '',
          availability: 'all',
          sort: 'default'
        });
      }, { signal });
    });

    root.querySelectorAll('[data-action="store-build-from-scratch"]').forEach(el => {
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const kind = ev.currentTarget?.dataset?.builderKind || ev.currentTarget?.dataset?.mode || '';
        await this._openScratchBuilder(kind);
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

    root.querySelectorAll('.store-card[data-item-id], .swse-store-surface__card[data-item-id]').forEach(card => {
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
        await this._requestRender('store-cart-remove');
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
      el.addEventListener('click', async ev => {
        ev.preventDefault();
        ev.stopPropagation();
        const store = await StoreSurfaceService.getOrCreateInstance(this._actor);
        if (!store) return;
        store.cart = store._loadCartFromActor();
        if (cartEntryCount(store.cart) <= 0) {
          ui.notifications?.warn?.('Your cart is empty. Add at least one listing before checkout.');
          this._setOptions({ currentView: 'cart', selectedProductId: null });
          return;
        }
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
        ev.stopPropagation();
        const button = ev.currentTarget;
        if (button?.dataset?.busy === 'true') return;
        const store = await StoreSurfaceService.getOrCreateInstance(this._actor);
        if (!store) return;
        store.cart = store._loadCartFromActor();
        if (cartEntryCount(store.cart) <= 0) {
          ui.notifications?.warn?.('Nothing to settle — your cart is empty.');
          this._setOptions({ currentView: 'cart', selectedProductId: null });
          return;
        }

        try {
          button.dataset.busy = 'true';
          button.disabled = true;
          button.classList.add('is-processing');
          const originalLabel = button.textContent;
          button.textContent = 'VERIFYING TRADE…';

          const result = await checkout(store, null);
          if (!result?.success) {
            ui.notifications?.warn?.(result?.error || 'Checkout did not complete. Review the cart and try again.');
          }
          const view = result?.success ? 'history' : 'cart';
          this._setOptions({ currentView: view, selectedProductId: null });

          button.textContent = originalLabel;
        } catch (err) {
          console.error('[SWSE Store] Checkout action failed:', err);
          ui.notifications?.error?.('Checkout failed before the Transaction Engine could complete the trade.');
          this._setOptions({ currentView: 'cart', selectedProductId: null });
        } finally {
          if (button) {
            button.dataset.busy = 'false';
            button.disabled = false;
            button.classList.remove('is-processing');
          }
        }
      }, { signal });
    });

    root.querySelectorAll('[data-action="store-load-more"]').forEach(el => {
      el.addEventListener('click', ev => {
        ev.preventDefault();
        const next = Number(ev.currentTarget?.dataset?.nextLimit ?? 0) || 72;
        this._setOptions({ storeRenderLimit: next });
      }, { signal });
    });

    this._clientSort(root);
    this._focusHotDeal(root);
  }

  _attachSplash(root, signal) {
    const splash = root?.querySelector?.('.swse-store-splash--rendarrs')
      ?? (root?.matches?.('.swse-store-splash--rendarrs') ? root : null);
    if (!splash) return false;

    // Belt-and-suspenders inline routing: the splash initializer also wires the
    // CTA, but the shell surface owns navigation state. Capture the enter/home
    // actions at the surface controller level so the splash cannot become inert
    // if AppV2 action dispatch or template rehydration misses a direct listener.
    const enterSelector = '[data-action="store-splash-continue"], [data-store-splash-enter]';
    const homeSelector = '[data-shell-action="return-to-home"], [data-shell-action="open-home"]';
    const hotDealSelector = '[data-action="store-hot-deal-open"]';

    root.addEventListener('click', (ev) => {
      const target = ev.target instanceof Element ? ev.target : null;
      if (!target) return;

      const homeTarget = target.closest(homeSelector) || target.closest('[data-action="tablet-home"]');
      if (homeTarget) {
        ev.preventDefault();
        ev.stopImmediatePropagation?.();
        this._returnHome();
        return;
      }

      const enterTarget = target.closest(enterSelector);
      if (enterTarget) {
        ev.preventDefault();
        ev.stopImmediatePropagation?.();
        this._enterStore();
        return;
      }

      const hotDealTarget = target.closest(hotDealSelector);
      if (hotDealTarget) {
        ev.preventDefault();
        ev.stopImmediatePropagation?.();
        this._openHotDeal({
          id: hotDealTarget.dataset.itemId,
          name: hotDealTarget.dataset.itemName,
          category: hotDealTarget.dataset.storeCategory || hotDealTarget.dataset.category,
          normalizedCategory: hotDealTarget.dataset.category
        });
      }
    }, { signal, capture: true });

    root.addEventListener('keydown', (ev) => {
      const active = document.activeElement;
      const isSplashFocus = active instanceof Element && splash.contains(active);
      if (!isSplashFocus || (ev.key !== 'Enter' && ev.key !== ' ')) return;
      ev.preventDefault();
      ev.stopImmediatePropagation?.();
      this._enterStore();
    }, { signal, capture: true });

    initRendarrStoreSplash(root, {
      signal,
      onContinue: () => this._enterStore(),
      onHotDealOpen: (payload) => this._openHotDeal(payload)
    });
    return true;
  }

  async _returnHome() {
    await this._host.setSurface?.('home');
    await this._requestRender('store-return-home');
  }

  _enterStore(patch = {}) {
    this._setOptions({
      enteredStore: true,
      splashComplete: true,
      currentView: 'browse',
      currentCategory: 'weapons',
      currentSubcategory: null,
      currentFamily: null,
      selectedProductId: null,
      search: '',
      availability: 'all',
      sort: 'default',
      storeRenderLimit: 36,
      ...patch
    });
  }

  _openHotDeal({ id, name, category, normalizedCategory } = {}) {
    if (!id && !name) {
      this._enterStore();
      return;
    }
    this._enterStore({
      selectedProductId: id || null,
      // Prefer the real store category for filtering. The normalized category is
      // retained only as a fallback because values like "ranged-weapons" are
      // splash buckets, not always actual store category keys.
      currentCategory: category || normalizedCategory || 'weapons',
      search: name || '',
      hotDealFocusId: id || null
    });
  }


  async _openScratchBuilder(kind = '') {
    const normalized = String(kind || '').toLowerCase().trim();
    if (!this._actor) {
      ui.notifications?.warn?.('Open a character actor before launching a custom build.');
      return;
    }

    if (normalized === 'droid' || normalized === 'droids' || normalized === 'garage') {
      await buildDroidWithBuilder(this._actor, null);
      return;
    }

    if (normalized === 'vehicle' || normalized === 'vehicles' || normalized === 'ship' || normalized === 'shipyard' || normalized === 'starship') {
      await createCustomStarship(this._actor, null);
      return;
    }

    ui.notifications?.warn?.('Unknown custom build type. Select the Droid or Vehicle store tab first.');
  }

  _focusHotDeal(root) {
    const focusId = this._host._shellSurfaceOptions?.hotDealFocusId;
    if (!focusId) return;
    const safeId = CSS.escape(focusId);
    const selector = `.store-card[data-item-id="${safeId}"], .swse-store-surface__card[data-item-id="${safeId}"]`;
    const card = root.querySelector(selector);
    if (!card) return;
    card.classList.add('is-hot-deal-focus');
    card.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    window.setTimeout(() => card.classList.remove('is-hot-deal-focus'), 1800);
    if (typeof this._host?.patchSurfaceOptions === 'function') {
      this._host.patchSurfaceOptions({ hotDealFocusId: null }, { render: false });
    }
  }

  destroy() {
    this._abort?.abort();
    this._abort = null;
  }

  _attachScrollBridge(root, signal) {
    root.addEventListener('wheel', event => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const selectors = [
        '.swse-store-surface__grid',
        '.swse-store-surface__browse',
        '.swse-store-surface__screen',
        '.swse-store-surface__pane',
        '.swse-store-surface__rail',
        '.swse-store-surface__card-expand-desc',
        '.swse-store-surface__card-expand-tech',
        '.swse-store-surface__card-expand-reviews',
        '.swse-store-surface__detail-section--scroll',
        '.swse-store-surface__detail-card'
      ];
      const scroller = selectors
        .map(sel => target.closest(sel))
        .find(el => el && el.scrollHeight > el.clientHeight + 2)
        || root.querySelector('.swse-store-surface__screen');
      if (!scroller || scroller.scrollHeight <= scroller.clientHeight + 2) return;
      const before = scroller.scrollTop;
      scroller.scrollTop += event.deltaY;
      if (scroller.scrollTop !== before) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, { signal, passive: false });
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

    store.cart = store._loadCartFromActor();
    const beforeCount = cartEntryCount(store.cart);

    try {
      if (itemType === 'vehicle') {
        await addVehicleToCart(store, id, condition || 'new', null);
      } else if (itemType === 'droid') {
        await addDroidToCart(store, id, null);
      } else {
        await addItemToCart(store, id, null);
      }
    } catch (err) {
      console.error('[SWSE Store] Failed to stage listing:', err);
      ui.notifications?.error?.('Could not stage that listing.');
      return;
    }

    const afterCount = cartEntryCount(store.cart);
    if (afterCount <= beforeCount) return;

    await store._persistCart();

    if (rerenderPatch) {
      this._setOptions(rerenderPatch);
      return;
    }
    await this._requestRender('store-cart-add');
  }

  _toggleDetail(id) {
    const currentId = this._host._shellSurfaceOptions?.selectedProductId;
    const shouldClear = currentId === id;
    this._setOptions({
      currentView: 'browse',
      selectedProductId: shouldClear ? null : id
    });
  }

  _requestRender(reason = 'store-surface-render') {
    return this._host?.requestSurfaceRender?.({ reason, surfaceId: 'store' }) ?? this._host?.render?.(false);
  }

  _setOptions(patch, rerender = true) {
    if (typeof this._host?.patchSurfaceOptions === 'function') {
      this._host.patchSurfaceOptions(patch, { render: false });
    }
    if (rerender) {
      void this._requestRender('store-options-change');
    }
  }

  _clientFilter(root) {
    const searchVal = (root.querySelector('#ss-search')?.value ?? '').toLowerCase();
    const availVal = (root.querySelector('#ss-avail')?.value ?? 'all').toLowerCase();
    const categoryVal = (this._host._shellSurfaceOptions?.currentCategory ?? '').toLowerCase();
    const subcategoryVal = normalizeStoreFilterValue(this._host._shellSurfaceOptions?.currentSubcategory ?? '');

    let visible = 0;
    root.querySelectorAll('.store-card[data-item-id], .swse-store-surface__card[data-item-id]').forEach(card => {
      const name = (card.dataset.name ?? '').toLowerCase();
      const cat = (card.dataset.categoryKey || card.dataset.category || '').toLowerCase();
      const subtype = (card.dataset.subcategory ?? '').toLowerCase();
      const subtypeKey = normalizeStoreFilterValue(card.dataset.subcategory || '');
      const avail = normalizeAvailabilityText(card.dataset.availability ?? '');
      const requestedAvail = normalizeAvailabilityText(availVal);

      const matchSearch = !searchVal || name.includes(searchVal) || cat.includes(searchVal) || subtype.includes(searchVal);
      const matchAvail = !requestedAvail || requestedAvail === 'all' || avail.split(/\s+/).includes(requestedAvail) || avail.includes(requestedAvail);
      const matchCategory = !categoryVal || cat === categoryVal;
      const matchSubcategory = !subcategoryVal || subtypeKey === subcategoryVal;

      const show = matchSearch && matchAvail && matchCategory && matchSubcategory;
      card.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });

    const counter = root.querySelector('[data-results-count]');
    if (counter) counter.textContent = visible;

    const emptyEl = root.querySelector('.store-browse-empty, .swse-store-surface__empty');
    if (emptyEl) emptyEl.style.display = visible === 0 ? '' : 'none';
  }

  _clientSort(root) {
    const sortVal = root.querySelector('#ss-sort')?.value ?? 'default';
    const grid = root.querySelector('.store-card-grid, .swse-store-surface__grid');
    if (!grid) {
      this._clientFilter(root);
      return;
    }

    const cards = Array.from(grid.querySelectorAll('.store-card[data-item-id], .swse-store-surface__card[data-item-id]'));
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
