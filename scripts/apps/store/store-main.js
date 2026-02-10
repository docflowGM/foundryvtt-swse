/**
 * scripts/apps/store/store-main.js — SWSE Store (ApplicationV2)
 *
 * Responsibilities:
 * - Load store-visible compendium entries (items + droids)
 * - Provide grouped categories to the Handlebars template
 * - Maintain a cart (in-memory + actor flag)
 * - Delegate purchase/checkout logic to store-checkout.js
 *
 * Non-goals:
 * - No pricing/business logic here
 * - No direct mutation of actor currency/items here (handled by checkout module)
 */

import { StoreEngine } from '../../engines/store/store-engine.js';
import { ArmorSuggestions } from '../../suggestion-engine/armor-suggestions.js';
import { WeaponSuggestions } from '../../suggestion-engine/weapon-suggestions.js';
import { GearSuggestions } from '../../suggestion-engine/gear-suggestions.js';
import { MentorProseGenerator } from '../../suggestion-engine/mentor-prose-generator.js';
import { ReviewThreadAssembler } from './review-thread-assembler.js';
import {
  safeString,
  safeImg,
  safeSystem,
  tryRender,
  getRarityClass,
  getRarityLabel,
  getCostValue
} from './store-shared.js';
import { getRendarrLine } from './dialogue/rendarr-dialogue.js';
import {
  addItemToCart,
  addDroidToCart,
  addVehicleToCart,
  removeFromCartById,
  clearCart,
  calculateCartTotal,
  checkout,
  createCustomDroid,
  createCustomStarship
} from './store-checkout.js';

const { ApplicationV2 } = foundry.applications.api;

const CART_FLAG_SCOPE = 'foundryvtt-swse';
const CART_FLAG_KEY = 'storeCart';

function emptyCart() {
  return { items: [], droids: [], vehicles: [] };
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

export class SWSEStore extends ApplicationV2 {

  static DEFAULT_OPTIONS = {
    id: 'swse-store',
    tag: 'section',
    window: {
      title: 'Galactic Trade Exchange',
      width: 1200,
      height: 800,
      resizable: true
    },
    classes: ['swse', 'store', 'swse-app-store', 'card-grid-store'],
    template: 'systems/foundryvtt-swse/templates/apps/store/store-card-grid.hbs'
  };

  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }


  constructor(actor = null, options = {}) {
    super(options);
    this.actor = actor ?? null;

    this.itemsById = new Map();      // Engine provides this
    this.storeInventory = null;      // Engine inventory cache
    this.suggestions = new Map();    // Item ID → suggestion score
    this.reviewsData = null;         // Loaded reviews pack

    this.cart = emptyCart();
    this._loaded = false;
  }

  // NOTE: V2 API - Do NOT override _renderHTML or _replaceHTML
  // Initialization is handled in _prepareContext which is the correct V2 pattern

  async _prepareContext(_options) {
    if (!this._loaded) {await this._initialize();}

    return {
      allItems: this._buildItemsWithSuggestions(),
      credits: Number(this.actor?.system?.credits ?? 0) || 0,
      isGM: game.user?.isGM ?? false,
      rendarrWelcome: getRendarrLine('welcome'),
      rendarrImage: 'systems/foundryvtt-swse/assets/mentors/rendarr.webp'
    };
  }

  async _initialize() {
    if (this._loaded) {return;}
    this._loaded = true;

    this.cart = this._loadCartFromActor();

    // DELEGATED TO ENGINE: Load inventory
    await this._loadStoreInventory();

    // Load reviews pack
    await this._loadReviewsData();

    // Wire suggestion engine for all items
    if (this.actor) {
      await this._generateSuggestionsForAllItems();
    }
  }

  async _loadReviewsData() {
    try {
      // Load primary reviews
      const primaryResponse = await fetch('systems/foundryvtt-swse/data/reviews/reviews.json');
      if (primaryResponse.ok) {
        this.reviewsData = await primaryResponse.json();

        // Try to load overflow pack for additional variety
        try {
          const overflowResponse = await fetch('systems/foundryvtt-swse/data/reviews/reviews-overflow.json');
          if (overflowResponse.ok) {
            const overflowData = await overflowResponse.json();
            // Merge overflow pools into main data (append to arrays)
            if (overflowData.armorReviewsOverflow) {
              this.reviewsData.armorReviews.short.push(...overflowData.armorReviewsOverflow);
            }
            if (overflowData.weaponReviewsOverflow?.fireRate) {
              this.reviewsData.weaponReviews.general.push(...overflowData.weaponReviewsOverflow.fireRate);
              this.reviewsData.weaponReviews.chaotic.push(...overflowData.weaponReviewsOverflow.power);
              this.reviewsData.weaponReviews.chaotic.push(...overflowData.weaponReviewsOverflow.sound);
              this.reviewsData.weaponReviews.chaotic.push(...overflowData.weaponReviewsOverflow.ergonomics);
            }
            if (overflowData.gearReviewsOverflow) {
              this.reviewsData.gearReviews.general.push(...overflowData.gearReviewsOverflow);
            }
            if (overflowData.neekoOverflow) {
              this.reviewsData.neekoReviews.selfPromo.push(...overflowData.neekoOverflow);
            }
            if (overflowData.rendarrOverflow) {
              this.reviewsData.rendarrReviews.toxicPositive.push(...overflowData.rendarrOverflow);
            }
          }
        } catch (overflowErr) {
          // Overflow pack is optional, don't fail if missing
          console.debug('[SWSE Store] Overflow reviews not found (optional)', overflowErr.message);
        }

        // Try to load usernames pack
        try {
          const usernamesResponse = await fetch('systems/foundryvtt-swse/data/reviews/usernames.json');
          if (usernamesResponse.ok) {
            const usernamesData = await usernamesResponse.json();
            this.reviewsData.usernames = usernamesData.usernames || [];
          }
        } catch (usernamesErr) {
          // Usernames pack is optional, don't fail if missing
          console.debug('[SWSE Store] Usernames not found (optional)', usernamesErr.message);
        }

        // Try to load vehicle reviews pack
        try {
          const vehicleResponse = await fetch('systems/foundryvtt-swse/data/reviews/vehicle-reviews.json');
          if (vehicleResponse.ok) {
            const vehicleData = await vehicleResponse.json();
            if (vehicleData.vehicleReviews) {
              this.reviewsData.vehicleReviews = vehicleData.vehicleReviews;
            }
          }
        } catch (vehicleErr) {
          // Vehicle pack is optional, don't fail if missing
          console.debug('[SWSE Store] Vehicle reviews not found (optional)', vehicleErr.message);
        }

        // Try to load droid reviews pack
        try {
          const droidResponse = await fetch('systems/foundryvtt-swse/data/reviews/droid-reviews.json');
          if (droidResponse.ok) {
            const droidData = await droidResponse.json();
            if (droidData.firstDegreeDroids) {
              this.reviewsData.firstDegreeDroids = droidData.firstDegreeDroids;
            }
            if (droidData.secondDegreeDroids) {
              this.reviewsData.secondDegreeDroids = droidData.secondDegreeDroids;
            }
            if (droidData.thirdDegreeDroids) {
              this.reviewsData.thirdDegreeDroids = droidData.thirdDegreeDroids;
            }
            if (droidData.fourthDegreeDroids) {
              this.reviewsData.fourthDegreeDroids = droidData.fourthDegreeDroids;
            }
            if (droidData.fifthDegreeDroids) {
              this.reviewsData.fifthDegreeDroids = droidData.fifthDegreeDroids;
            }
          }
        } catch (droidErr) {
          // Droid pack is optional, don't fail if missing
          console.debug('[SWSE Store] Droid reviews not found (optional)', droidErr.message);
        }
      }
    } catch (err) {
      console.warn('[SWSE Store] Failed to load reviews data:', err);
    }
  }

  async _generateSuggestionsForAllItems() {
    if (!this.actor || !this.storeInventory) {return;}

    try {
      // Separate items by type
      const armor = this.storeInventory.allItems.filter(i => i.type === 'armor');
      const weapons = this.storeInventory.allItems.filter(i => i.type === 'weapon');
      const gear = this.storeInventory.allItems.filter(i => i.type === 'equipment');

      // Generate suggestions for each type
      if (armor.length > 0) {
        try {
          const armorSugg = ArmorSuggestions.generateSuggestions(this.actor, armor, { topCount: 999 });
          if (armorSugg.allScored) {
            for (const scored of armorSugg.allScored) {
              const itemId = scored.armorId || scored.itemId;
              if (itemId) {
                this.suggestions.set(itemId, scored);
              }
            }
          }
        } catch (err) {
          console.warn('[SWSE Store] Armor suggestion failed:', err);
        }
      }

      if (weapons.length > 0) {
        try {
          const weaponSugg = WeaponSuggestions.generateSuggestions(this.actor, weapons, { topCount: 999 });
          if (weaponSugg.allScored) {
            for (const scored of weaponSugg.allScored) {
              const itemId = scored.weaponId || scored.itemId;
              if (itemId) {
                this.suggestions.set(itemId, scored);
              }
            }
          }
        } catch (err) {
          console.warn('[SWSE Store] Weapon suggestion failed:', err);
        }
      }

      if (gear.length > 0) {
        try {
          const gearSugg = GearSuggestions.generateSuggestions(this.actor, gear, { topCount: 999 });
          if (gearSugg.allScored) {
            for (const scored of gearSugg.allScored) {
              const itemId = scored.equipmentId || scored.itemId;
              if (itemId) {
                this.suggestions.set(itemId, scored);
              }
            }
          }
        } catch (err) {
          console.warn('[SWSE Store] Gear suggestion failed:', err);
        }
      }
    } catch (err) {
      console.warn('[SWSE Store] Suggestion generation wrapper failed:', err);
    }
  }

  _buildItemsWithSuggestions() {
    const items = [];

    for (const item of this.storeInventory?.allItems || []) {
      const suggestion = this.suggestions.get(item._id);
      const view = this._viewFromItem(item);

      // Add category for filtering
      view.category = item.type || '';
      view.availability = (item.system?.availability || '').toString();
      view.price = view.finalCost;

      // Attach suggestion data
      if (suggestion?.combined) {
        view.suggestion = {
          score: suggestion.combined.finalScore,
          tier: this._tierToLabel(suggestion.combined.tier),
          tierLabel: this._tierToDisplayLabel(suggestion.combined.tier),
          bullets: (suggestion.explanations || []).slice(0, 4) // Max 4 bullets per card
        };
      }

      items.push(view);
    }

    // Sort by suggestion score (descending) by default
    items.sort((a, b) => {
      const scoreA = a.suggestion?.score ?? -1;
      const scoreB = b.suggestion?.score ?? -1;
      return scoreB - scoreA;
    });

    return items;
  }

  _tierToLabel(tier) {
    // Convert tier string to CSS class: "STRONG_FIT" → "strong-fit"
    return (tier || '').toLowerCase().replace(/_/g, '-');
  }

  _tierToDisplayLabel(tier) {
    // Convert tier to display: "STRONG_FIT" → "Strong Fit"
    const tierMap = {
      'STRONG_FIT': 'Strong Fit',
      'VIABLE': 'Viable',
      'SITUATIONAL': 'Situational',
      'OUTPERFORMED': 'Outperformed'
    };
    return tierMap[tier] || tier;
  }

  _loadCartFromActor() {
    if (!this.actor) {return emptyCart();}
    const stored = this.actor.getFlag(CART_FLAG_SCOPE, CART_FLAG_KEY);
    if (!stored) {return emptyCart();}
    return {
      items: asArray(stored.items),
      droids: asArray(stored.droids),
      vehicles: asArray(stored.vehicles)
    };
  }

  async _persistCart() {
    if (!this.actor) {return;}
    await this.actor.setFlag(CART_FLAG_SCOPE, CART_FLAG_KEY, this.cart);
  }

  async _loadStoreInventory() {
    // DELEGATED TO ENGINE: Get normalized, categorized, priced inventory
    const result = await StoreEngine.getInventory({ useCache: true });

    if (!result.success) {
      console.error('[SWSE Store] Failed to load inventory from engine:', result.error);
      return;
    }

    this.storeInventory = result.inventory;

    // Populate itemsById map for checkout (backward compat with addItemToCart, etc.)
    for (const item of this.storeInventory.allItems) {
      this.itemsById.set(item.id, item);
    }
  }

  _viewFromItem(item) {
    const sys = safeSystem(item) ?? {};
    const rarityClass = getRarityClass(sys.availability);
    return {
      id: item._id,
      name: safeString(item.name),
      img: safeImg(item),
      finalCost: getCostValue(item),
      rarityClass,
      rarityLabel: getRarityLabel(rarityClass),
      system: sys,
      type: item.type
    };
  }

  _viewFromDroid(actor) {
    const sys = safeSystem(actor) ?? {};
    return {
      id: actor._id,
      name: safeString(actor.name),
      img: safeImg(actor),
      finalCost: Number(sys.cost ?? 0) || 0,
      rarityClass: null,
      rarityLabel: '',
      system: sys,
      type: 'droid'
    };
  }

  _buildCategoriesForTemplate() {
    const categories = {
      weapons: {
        melee: { simple: [], advanced: [], lightsaber: [], exotic: [] },
        ranged: { pistols: [], rifles: [], heavy_weapons: [], exotic: [] }
      },
      armor: [],
      grenades: [],
      medical: [],
      tech: [],
      tools: [],
      survival: [],
      security: [],
      equipment: [],
      services: [],
      droids: [],
      vehicles: []
    };

    for (const item of this.itemsById.values()) {
      tryRender(() => {
        const view = this._viewFromItem(item);
        const sys = view.system ?? {};

        if (view.type === 'weapon') {
          const wc = (sys.weaponCategory || '').toString().toLowerCase();
          const cat = (sys.category || sys.subcategory || '').toString().toLowerCase();

          if (cat === 'grenade') {
            categories.grenades.push(view);
            return;
          }

          if (wc === 'melee') {
            const key = ['simple', 'advanced', 'lightsaber', 'exotic'].includes(cat) ? cat : 'exotic';
            categories.weapons.melee[key].push(view);
            return;
          }

          // ranged
          const rangedKey = cat === 'pistol' ? 'pistols' :
                            cat === 'rifle' ? 'rifles' :
                            cat === 'heavy' ? 'heavy_weapons' :
                            'exotic';
          categories.weapons.ranged[rangedKey].push(view);
          return;
        }

        if (view.type === 'armor') {
          categories.armor.push(view);
          return;
        }

        if (view.type === 'vehicle') {
          categories.vehicles.push(view);
          return;
        }

        if (view.type === 'equipment') {
          const bucket = this._categorizeEquipmentExtended(view);
          categories[bucket].push(view);
          return;
        }

        if (view.type === 'service') {
          categories.services.push(view);
        }
      });
    }

    for (const droid of this.droidsById.values()) {
      categories.droids.push(this._viewFromDroid(droid));
    }

    // Sort for consistent UX
    categories.weapons.melee.simple = sortWeapons(categories.weapons.melee.simple);
    categories.weapons.melee.advanced = sortWeapons(categories.weapons.melee.advanced);
    categories.weapons.melee.lightsaber = sortWeapons(categories.weapons.melee.lightsaber);
    categories.weapons.melee.exotic = sortWeapons(categories.weapons.melee.exotic);

    categories.weapons.ranged.pistols = sortWeapons(categories.weapons.ranged.pistols);
    categories.weapons.ranged.rifles = sortWeapons(categories.weapons.ranged.rifles);
    categories.weapons.ranged.heavy_weapons = sortWeapons(categories.weapons.ranged.heavy_weapons);
    categories.weapons.ranged.exotic = sortWeapons(categories.weapons.ranged.exotic);

    categories.armor = sortArmor(categories.armor);
    categories.grenades = sortWeapons(categories.grenades);
    categories.droids = categories.droids.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    categories.vehicles = categories.vehicles.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    for (const key of ['medical','tech','tools','survival','security','equipment','services']) {
      categories[key] = categories[key].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return categories;
  }

  _categorizeEquipmentExtended(view) {
    const sys = view.system ?? {};
    const name = (view.name || '').toLowerCase();
    const desc = (sys.description || '').toString().toLowerCase();
    const text = `${name} ${desc}`;

    if (text.includes('ration') || text.includes('survival') || text.includes('tent') || text.includes('climbing') || text.includes('breather')) {return 'survival';}
    if (text.includes('security') || text.includes('lock') || text.includes('binders') || text.includes('restraint') || text.includes('alarm')) {return 'security';}

    return categorizeEquipment({ name: view.name, system: sys });
  }

  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) {return;}

    // Search functionality
    const searchInput = root.querySelector('#store-search');
    const categoryFilter = root.querySelector('#store-category-filter');
    const availabilityFilter = root.querySelector('#store-availability-filter');
    const sortSelect = root.querySelector('#store-sort');

    const updateGrid = () => this._filterAndSortGrid(root);

    if (searchInput) {
      searchInput.addEventListener('input', updateGrid);
    }
    if (categoryFilter) {
      categoryFilter.addEventListener('change', updateGrid);
    }
    if (availabilityFilter) {
      availabilityFilter.addEventListener('change', updateGrid);
    }
    if (sortSelect) {
      sortSelect.addEventListener('change', updateGrid);
    }

    // Card expand buttons
    root.querySelectorAll('[data-action="expand-product"]').forEach(btn => {
      btn.addEventListener('click', ev => {
        const itemId = ev.currentTarget?.dataset?.itemId;
        if (itemId) {
          this._showProductModal(itemId, root);
        }
      });
    });

    // Add to cart buttons (cards)
    root.querySelectorAll('[data-action="add-to-cart"]').forEach(btn => {
      btn.addEventListener('click', ev => {
        ev.stopPropagation();
        const id = ev.currentTarget?.dataset?.itemId;
        if (!id) {return;}
        addItemToCart(this, id, line => this._setRendarrLine(line));
        this._persistCart();
        this._renderCartUI();
      });
    });

    // Cart button
    const viewCartBtn = root.querySelector('[data-action="view-cart"]');
    if (viewCartBtn) {
      viewCartBtn.addEventListener('click', () => this._showCartSidebar(root));
    }

    // Legacy buy item buttons (for backward compat)
    root.querySelectorAll('.buy-item').forEach(btn => {
      btn.addEventListener('click', ev => {
        const id = ev.currentTarget?.dataset?.itemId;
        if (!id) {return;}
        addItemToCart(this, id, line => this._setRendarrLine(line));
        this._persistCart();
        this._renderCartUI();
      });
    });

    root.querySelectorAll('.buy-droid').forEach(btn => {
      btn.addEventListener('click', ev => {
        const id = ev.currentTarget?.dataset?.actorId || ev.currentTarget?.dataset?.droidId;
        if (!id) {return;}
        addDroidToCart(this, id, line => this._setRendarrLine(line));
        this._persistCart();
        this._renderCartUI();
      });
    });

    root.querySelectorAll('.buy-vehicle').forEach(btn => {
      btn.addEventListener('click', ev => {
        const id = ev.currentTarget?.dataset?.actorId || ev.currentTarget?.dataset?.vehicleId;
        const condition = ev.currentTarget?.dataset?.condition || 'new';
        if (!id) {return;}
        addVehicleToCart(this, id, condition, line => this._setRendarrLine(line));
        this._persistCart();
        this._renderCartUI();
      });
    });

    // Custom builders
    const customDroidBtn = root.querySelector('.create-custom-droid');
    if (customDroidBtn) {
      customDroidBtn.addEventListener('click', async () => {
        if (!this.actor) {return;}
        await createCustomDroid(this.actor, () => this.render());
      });
    }

    const customStarshipBtn = root.querySelector('.create-custom-starship');
    if (customStarshipBtn) {
      customStarshipBtn.addEventListener('click', async () => {
        if (!this.actor) {return;}
        await createCustomStarship(this.actor, () => this.render());
      });
    }

    const checkoutBtn = root.querySelector('#checkout-cart');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', async () => {
        await checkout(this, (el, v) => this._animateNumber(el, v));
        this.cart = emptyCart();
        await this._persistCart();
        this._renderCartUI();
      });
    }

    const clearBtn = root.querySelector('#clear-cart');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        clearCart(this.cart);
        await this._persistCart();
        this._renderCartUI();
      });
    }

    // Initial render once DOM exists
    this._renderCartUI();
  }

  _setRendarrLine(line) {
    const el = this.element?.querySelector?.('.holo-message');
    if (!el) {return;}
    el.textContent = `"${line}"`;
  }

  _animateNumber(el, value) {
    if (!el) {return;}
    el.textContent = value;
  }

  _filterAndSortGrid(root) {
    const grid = root.querySelector('#products-grid');
    if (!grid) {return;}

    const searchTerm = root.querySelector('#store-search')?.value?.toLowerCase() || '';
    const categoryFilter = root.querySelector('#store-category-filter')?.value || '';
    const availabilityFilter = root.querySelector('#store-availability-filter')?.value || '';
    const sortValue = root.querySelector('#store-sort')?.value || 'suggested';

    const cards = grid.querySelectorAll('.product-card');
    let visibleCards = [];

    // Filter cards
    cards.forEach(card => {
      const itemId = card.dataset.itemId;
      const item = this.itemsById.get(itemId);
      if (!item) return;

      const name = (item.name || '').toLowerCase();
      const desc = (item.system?.description || '').toString().toLowerCase();
      const category = card.dataset.category || '';
      const availability = card.dataset.availability || '';

      const matchesSearch = !searchTerm || name.includes(searchTerm) || desc.includes(searchTerm);
      const matchesCategory = !categoryFilter || category === categoryFilter;
      const matchesAvailability = !availabilityFilter || availability === availabilityFilter;

      if (matchesSearch && matchesCategory && matchesAvailability) {
        card.style.display = '';
        visibleCards.push({ card, item });
      } else {
        card.style.display = 'none';
      }
    });

    // Sort visible cards
    if (sortValue === 'price-asc') {
      visibleCards.sort((a, b) => (a.item.finalCost ?? 0) - (b.item.finalCost ?? 0));
    } else if (sortValue === 'price-desc') {
      visibleCards.sort((a, b) => (b.item.finalCost ?? 0) - (a.item.finalCost ?? 0));
    } else if (sortValue === 'name-asc') {
      visibleCards.sort((a, b) => (a.item.name || '').localeCompare(b.item.name || ''));
    }
    // 'suggested' is default (already sorted by suggestion score)

    // Reorder in DOM
    visibleCards.forEach(({ card }) => {
      grid.appendChild(card);
    });

    // Show/hide empty state
    const emptyState = grid.parentElement?.querySelector('.empty-state');
    if (emptyState) {
      emptyState.style.display = visibleCards.length === 0 ? 'flex' : 'none';
    }
  }

  _showCartSidebar(root) {
    const sidebar = root.querySelector('#cart-sidebar');
    if (sidebar) {
      sidebar.style.display = 'flex';
      this._renderCartUI();
    }
  }

  _showProductModal(itemId, root) {
    const item = this.itemsById.get(itemId);
    if (!item) {return;}

    const modal = root.querySelector('#product-modal');
    if (!modal) {return;}

    const modalHTML = this._buildProductModalContent(item);
    modal.innerHTML = modalHTML;
    modal.style.display = 'flex';

    // Close button handler
    modal.querySelector('.close-modal-btn')?.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    // Quantity controls
    const qtyInput = modal.querySelector('.qty-input');
    const qtyMinus = modal.querySelector('.qty-minus');
    const qtyPlus = modal.querySelector('.qty-plus');

    if (qtyMinus) {
      qtyMinus.addEventListener('click', () => {
        const val = Math.max(1, (parseInt(qtyInput?.value) || 1) - 1);
        if (qtyInput) qtyInput.value = val;
      });
    }

    if (qtyPlus) {
      qtyPlus.addEventListener('click', () => {
        const val = Math.min(999, (parseInt(qtyInput?.value) || 1) + 1);
        if (qtyInput) qtyInput.value = val;
      });
    }

    if (qtyInput) {
      qtyInput.addEventListener('change', () => {
        const val = Math.max(1, Math.min(999, parseInt(qtyInput.value) || 1));
        qtyInput.value = val;
      });
    }

    // Add to cart from modal (with quantity)
    modal.querySelector('.modal-add-to-cart')?.addEventListener('click', () => {
      const qty = parseInt(qtyInput?.value) || 1;
      for (let i = 0; i < qty; i++) {
        addItemToCart(this, itemId, i === 0 ? (line => this._setRendarrLine(line)) : null);
      }
      this._persistCart();
      this._renderCartUI();
      modal.style.display = 'none';
    });
  }

  _buildProductModalContent(item) {
    const sys = safeSystem(item) ?? {};
    const suggestion = this.suggestions.get(item._id);
    const itemType = item.type || '';

    // Build technical details based on item type
    const techDetails = this._buildTechnicalDetails(item, sys, itemType);

    // Generate mentor review
    const mentorReview = this._generateMentorReview(suggestion);

    // Generate flavor reviews
    const flavorReviews = this._generateFlavorReviews(item, itemType);

    return `
      <div class="modal-content">
        <button type="button" class="close-modal-btn" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: var(--holo-cyan); cursor: pointer; font-size: 20px;">
          <i class="fas fa-times"></i>
        </button>

        <div class="modal-header">
          <h2 style="color: var(--holo-cyan); margin: 0 0 8px 0;">${safeString(item.name)}</h2>
          ${suggestion?.combined ? `
            <span class="suggestion-badge tier-${suggestion.combined.tier.toLowerCase().replace(/_/g, '-')}" style="display: inline-block; padding: 4px 8px; border-radius: 3px; font-size: 11px; font-weight: bold;">
              ${this._tierToDisplayLabel(suggestion.combined.tier)}
            </span>
          ` : ''}
        </div>

        <div class="modal-body" style="margin-top: 12px;">
          <div class="modal-image-section">
            <img src="${safeImg(item)}" alt="${safeString(item.name)}" style="width: 100%; max-height: 300px; object-fit: cover; border-radius: 4px; border: 1px solid rgba(0, 217, 255, 0.3);"/>
          </div>

          <div class="modal-price-section" style="margin: 16px 0; padding: 12px; background: rgba(255, 165, 0, 0.1); border: 1px solid rgba(255, 165, 0, 0.3); border-radius: 4px;">
            <strong style="color: var(--holo-amber); font-size: 18px;">₢${getCostValue(item)}</strong>
          </div>

          ${suggestion?.combined ? `
            <div class="modal-suggestion-section" style="margin: 16px 0; padding: 12px; background: rgba(0, 217, 255, 0.1); border: 1px solid rgba(0, 217, 255, 0.3); border-radius: 4px;">
              <strong style="color: var(--holo-cyan);">Why This Recommendation</strong>
              <ul style="margin: 8px 0 0 20px; font-size: 13px; line-height: 1.5;">
                ${(suggestion.explanations || []).map(b => `<li>${b}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          ${techDetails ? `
            <div class="modal-tech-section" style="margin: 16px 0; padding: 12px; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 4px;">
              <strong style="color: var(--holo-cyan);">Technical Specifications</strong>
              <div style="margin-top: 8px; font-size: 12px; line-height: 1.6;">
                ${techDetails}
              </div>
            </div>
          ` : ''}

          ${sys.description ? `
            <div class="modal-description-section" style="margin: 16px 0;">
              <strong style="color: var(--holo-cyan);">Description</strong>
              <p style="margin: 8px 0 0 0; font-size: 13px; line-height: 1.5;">${sys.description}</p>
            </div>
          ` : ''}

          ${mentorReview || flavorReviews ? `
            <div class="modal-reviews-section" style="margin: 16px 0; padding-top: 12px; border-top: 1px solid rgba(0, 217, 255, 0.2);">
              <strong style="color: var(--holo-cyan); display: block; margin-bottom: 12px;">Reviews</strong>

              ${mentorReview ? `
                <div class="mentor-review" style="margin-bottom: 12px; padding: 12px; background: linear-gradient(135deg, rgba(0, 217, 255, 0.15), rgba(255, 165, 0, 0.05)); border: 1px solid rgba(0, 217, 255, 0.3); border-radius: 4px;">
                  <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-family: Consolas, monospace;">
                    <i class="fas fa-user-circle" style="color: var(--holo-amber); font-size: 16px;"></i>
                    <strong style="color: var(--holo-amber);">Rendarr</strong>
                  </div>
                  <p style="margin: 0; font-size: 12px; line-height: 1.6; font-style: italic; font-family: Consolas, monospace; color: rgba(255, 255, 255, 0.9);">
                    "${mentorReview}"
                  </p>
                </div>
              ` : ''}

              ${flavorReviews ? `
                <div class="flavor-reviews" style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 12px;">
                  ${flavorReviews}
                </div>
              ` : ''}
            </div>
          ` : ''}
        </div>

        <div class="modal-footer" style="margin-top: 20px; padding-top: 16px; border-top: 1px solid rgba(0, 217, 255, 0.2);">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
            <label style="font-size: 13px; color: rgba(255, 255, 255, 0.8);">Qty:</label>
            <div style="display: flex; align-items: center; gap: 6px; background: rgba(0, 0, 0, 0.5); border: 1px solid rgba(0, 217, 255, 0.3); border-radius: 3px; padding: 4px;">
              <button type="button" class="qty-minus" style="background: none; border: none; color: var(--holo-cyan); cursor: pointer; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">−</button>
              <input type="number" class="qty-input" value="1" min="1" max="999" style="width: 50px; text-align: center; background: transparent; border: none; color: var(--holo-cyan); font-weight: bold;"/>
              <button type="button" class="qty-plus" style="background: none; border: none; color: var(--holo-cyan); cursor: pointer; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">+</button>
            </div>
          </div>

          <button type="button" class="modal-add-to-cart holo-btn" style="width: 100%; padding: 12px; background: rgba(0, 217, 255, 0.15); border: 1px solid var(--holo-cyan); color: var(--holo-cyan); font-weight: bold; cursor: pointer; border-radius: 4px;">
            <i class="fas fa-plus"></i> Add to Cart
          </button>
        </div>
      </div>
    `;
  }

  _buildTechnicalDetails(item, sys, itemType) {
    const details = [];

    // Armor specs
    if (itemType === 'armor') {
      if (sys.armorBonus) details.push(`<div>Armor Bonus: +${sys.armorBonus}</div>`);
      if (sys.category) details.push(`<div>Category: ${sys.category}</div>`);
      if (sys.maxDexBonus !== undefined) details.push(`<div>Max Dex Bonus: ${sys.maxDexBonus === -1 ? 'None' : '+' + sys.maxDexBonus}</div>`);
      if (sys.checkPenalty) details.push(`<div>Armor Check Penalty: ${sys.checkPenalty}</div>`);
      if (sys.speed) details.push(`<div>Speed: ${sys.speed}</div>`);
    }

    // Weapon specs
    if (itemType === 'weapon') {
      if (sys.damage) details.push(`<div>Damage: ${sys.damage}</div>`);
      if (sys.damageType) details.push(`<div>Type: ${sys.damageType}</div>`);
      if (sys.range) details.push(`<div>Range: ${sys.range}</div>`);
      if (sys.category) details.push(`<div>Category: ${sys.category}</div>`);
      if (sys.size) details.push(`<div>Size: ${sys.size}</div>`);
    }

    // Equipment/Gear specs
    if (itemType === 'equipment') {
      if (sys.weight) details.push(`<div>Weight: ${sys.weight}</div>`);
      if (sys.rarity) details.push(`<div>Rarity: ${sys.rarity}</div>`);
    }

    // Availability
    if (sys.availability) details.push(`<div>Availability: ${sys.availability}</div>`);

    return details.length > 0 ? details.join('') : '';
  }

  _generateMentorReview(suggestion) {
    if (!suggestion || !this.actor) {
      return null;
    }

    try {
      // Build character context for mentor prose generator
      const charContext = {
        primaryRole: this.actor.system?.role || 'fighter',
        level: this.actor.system?.level || 1,
        talents: this.actor.system?.talents || {}
      };

      const mentorProseGenerator = MentorProseGenerator;
      return mentorProseGenerator.generateMentorReview(suggestion, charContext);
    } catch (err) {
      console.warn('[SWSE Store] Mentor prose generation failed:', err);
      return null;
    }
  }

  _generateFlavorReviews(item, itemType) {
    if (!this.reviewsData) {
      console.debug('[SWSE Store] No reviews data loaded');
      return null;
    }

    // Delegate to ReviewThreadAssembler
    const thread = ReviewThreadAssembler.build({
      itemType: itemType,
      dialoguePacks: {
        main: this.reviewsData,
        overflow: this.reviewsData, // Already merged during _loadReviewsData
        usernames: this.reviewsData.usernames
      },
      hasMentorReview: false, // Mentor is separate
      mentorText: null
    });

    if (!thread.isValid || thread.reviews.length === 0) {
      console.warn('[SWSE Store] Review thread assembly failed', thread);
      return null;
    }

    // Render thread as HTML
    return thread.reviews.map((review) => {
      // Skip mentor (handled separately in modal)
      if (review.type === 'mentor') {
        return '';
      }

      // Normalize seller usernames for consistency
      let displayAuthor = review.author;
      if (review.type === 'seller' && review.author === 'Rendarr') {
        displayAuthor = 'Rendarr_Admin';
      } else if (review.type === 'competitor' && review.author === 'Neeko') {
        displayAuthor = 'TotallyNotNeeko';
      }

      // Color-code by reviewer type
      let bgColor, borderColor, icon;
      if (review.type === 'competitor') {
        bgColor = 'rgba(100, 255, 100, 0.1)';
        borderColor = 'rgba(100, 255, 100, 0.3)';
        icon = '<i class="fas fa-user-secret" style="color: #64ff64; margin-right: 4px;"></i>';
      } else if (review.type === 'seller') {
        bgColor = 'rgba(255, 100, 100, 0.1)';
        borderColor = 'rgba(255, 100, 100, 0.3)';
        icon = '<i class="fas fa-store" style="color: #ff6464; margin-right: 4px;"></i>';
      } else if (review.type === 'system-message') {
        bgColor = 'rgba(150, 150, 150, 0.1)';
        borderColor = 'rgba(150, 150, 150, 0.3)';
        icon = '<i class="fas fa-info-circle" style="color: #969696; margin-right: 4px;"></i>';
      } else {
        // customer
        bgColor = 'rgba(0, 0, 0, 0.2)';
        borderColor = 'rgba(0, 217, 255, 0.3)';
        icon = '<i class="fas fa-user" style="color: #00d9ff; margin-right: 4px;"></i>';
      }

      // Star rating display (if present)
      const starDisplay = review.stars ? `<span style="color: #ffc800; font-size: 11px; margin-left: 4px;">★ ${review.stars}/5</span>` : '';

      // Build reviews + replies
      // Username & metadata in Consolas (readable)
      // Review text in Aurebesh (intentional nonsense marketplace noise)
      let reviewHTML = `
        <div class="flavor-review" style="margin-bottom: 12px; padding: 8px; background: ${bgColor}; border-left: 2px solid ${borderColor}; border-radius: 2px;">
          <div style="font-size: 11px; color: rgba(255, 255, 255, 0.7); font-weight: bold; margin-bottom: 4px; font-family: Consolas, monospace;">
            ${icon} ${displayAuthor} ${starDisplay}
          </div>
          <p style="margin: 0; font-size: 12px; line-height: 1.5; color: rgba(255, 255, 255, 0.8); font-family: 'Aurebesh', serif; letter-spacing: 0.3px;">
            "${review.text}"
          </p>
      `;

      // Add replies (if any)
      if (review.replies && review.replies.length > 0) {
        reviewHTML += '<div style="margin-top: 8px; padding-left: 12px; border-left: 1px solid rgba(255, 255, 255, 0.1);">';
        for (const reply of review.replies) {
          const replyPrefix = reply.isResponse ? 'Response: ' : 'Reply: ';
          reviewHTML += `
            <div style="margin-bottom: 6px; font-size: 11px;">
              <strong style="color: rgba(255, 255, 255, 0.6); font-family: Consolas, monospace;">${replyPrefix}${reply.author}</strong>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: rgba(255, 255, 255, 0.6); font-family: 'Aurebesh', serif; letter-spacing: 0.3px;">
                "${reply.text}"
              </p>
            </div>
          `;
        }
        reviewHTML += '</div>';
      }

      reviewHTML += '</div>';
      return reviewHTML;
    }).join('');
  }

  _renderCartUI() {
    const rootEl = this.element;
    if (!rootEl) {return;}

    const listEl = rootEl.querySelector('#cart-items-list');
    const subtotalEl = rootEl.querySelector('#cart-subtotal');
    const remainingEl = rootEl.querySelector('#cart-remaining');
    const countEl = rootEl.querySelector('#cart-count');
    if (!listEl || !subtotalEl || !remainingEl || !countEl) {return;}

    const subtotal = calculateCartTotal(this.cart);
    const credits = Number(this.actor?.system?.credits ?? 0) || 0;
    const remaining = credits - subtotal;

    countEl.textContent = String((this.cart.items.length + this.cart.droids.length + this.cart.vehicles.length) || 0);
    subtotalEl.textContent = String(subtotal);
    remainingEl.textContent = String(Math.max(0, remaining));

    listEl.innerHTML = '';

    const addRow = (entry, type) => {
      const row = document.createElement('div');
      row.classList.add('cart-item-row');
      row.innerHTML = `
        <img class="cart-item-img" src="${entry.img || ''}" alt="${entry.name || ''}"/>
        <div class="cart-item-meta">
          <div class="cart-item-name">${entry.name || ''}</div>
          <div class="cart-item-cost">₢ ${entry.cost ?? 0}</div>
        </div>
        <button type="button" class="cart-item-remove holo-btn secondary" data-type="${type}" data-id="${entry.id}">
          <i class="fas fa-times"></i>
        </button>
      `;
      listEl.appendChild(row);
    };

    for (const it of this.cart.items) {addRow(it, 'items');}
    for (const it of this.cart.droids) {addRow(it, 'droids');}
    for (const it of this.cart.vehicles) {addRow(it, 'vehicles');}

    listEl.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', async (ev) => {
        const type = ev.currentTarget.dataset.type;
        const id = ev.currentTarget.dataset.id;
        removeFromCartById(this.cart, type, id);
        await this._persistCart();
        this._renderCartUI();
      });
    });
  }
}
