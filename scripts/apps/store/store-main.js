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

import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { StoreEngine } from "/systems/foundryvtt-swse/scripts/engine/store/store-engine.js";
import { ArmorSuggestions } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/armor-suggestions.js";
import { WeaponSuggestions } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/weapon-suggestions.js";
import { GearSuggestions } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/gear-suggestions.js";
import { MentorProseGenerator } from "/systems/foundryvtt-swse/scripts/engine/suggestion/equipment/mentor-prose-generator.js";
import { ReviewThreadAssembler } from "/systems/foundryvtt-swse/scripts/apps/store/review-thread-assembler.js";
import { StoreLoadingOverlay } from "/systems/foundryvtt-swse/scripts/apps/store/store-loading-overlay.js";
import { StoreCardInteractions } from "/systems/foundryvtt-swse/scripts/apps/store/store-card-interactions.js";
import { resolveStoreGlyph } from "/systems/foundryvtt-swse/scripts/apps/store/store-glyph-map.js";
import {
  safeString,
  safeImg,
  safeSystem,
  tryRender,
  getRarityClass,
  getRarityLabel,
  getCostValue
} from "/systems/foundryvtt-swse/scripts/apps/store/store-shared.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { openItemCustomization } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js";
import { getRendarrLine } from "/systems/foundryvtt-swse/scripts/apps/store/dialogue/rendarr-dialogue.js";
import { resolveStoreDescription, getStoreCurrencySymbol } from "/systems/foundryvtt-swse/scripts/apps/store/store-description-resolver.js";
import {
  addItemToCart,
  addDroidToCart,
  addVehicleToCart,
  removeFromCartById,
  clearCart,
  calculateCartTotal,
  checkout,
  createCustomDroid,
  buildDroidWithBuilder,
  buildDroidFromTemplate,
  createCustomStarship
} from "/systems/foundryvtt-swse/scripts/apps/store/store-checkout.js";

const CART_FLAG_SCOPE = 'foundryvtt-swse';
const CART_FLAG_KEY = 'storeCart';

function emptyCart() {
  return { items: [], droids: [], vehicles: [] };
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

export class SWSEStore extends BaseSWSEAppV2 {

  static DEFAULT_OPTIONS = {
    id: 'swse-store',
    tag: 'section',
    window: {
      title: 'Galactic Trade Exchange',
      width: 1200,
      height: 800,
      resizable: true
    },
    classes: ['swse', 'store', 'swse-app-store', 'card-grid-store']
  };

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/store/store-card-grid.hbs'
    }
  };

  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }



  static async open(actor = null, options = {}) {
    const app = new this(actor, options);
    app.render(true);
    return app;
  }

  constructor(actor = null, options = {}) {
    super(options);
    this.actor = actor ?? null;
    this.object = actor ?? null; // AppV2 contract: object is the document being edited

    this.itemsById = new Map();      // Engine provides this
    this.storeInventory = null;      // Engine inventory cache
    this.suggestions = new Map();    // Item ID → suggestion score
    this.reviewsData = null;         // Loaded reviews pack

    this.cart = emptyCart();
    this._loaded = false;

    // P2-1: Pagination for large inventories
    this.currentPage = 1;
    this.itemsPerPage = 50;
    this.totalVisibleItems = 0;

    this.cardInteractions = null;    // Card floating/expansion controller

    // Initialize loading overlay
    const useAurebesh = SettingsHelper.getSafe('useAurebesh', false);
    const skipOverlay = SettingsHelper.getSafe('storeSkipLoadingOverlay', false);
    const reduceMotion = game.user?.getFlag?.('core', 'reduce-motion') ?? false;

    this.loadingOverlay = new StoreLoadingOverlay({
      useAurebesh,
      reduceMotion,
      skipOverlay
    });

    this._onCheckoutComplete = typeof options.onCheckoutComplete === 'function' ? options.onCheckoutComplete : null;
    this._onStoreClosed = typeof options.onClose === 'function' ? options.onClose : null;
    this._closeAfterCheckout = options.closeAfterCheckout !== false;
    this._checkoutCompleted = false;
    this._closeHandled = false;

    this.currentView = 'browse';
    this.currentCategory = '';
    this.selectedProductId = null;
    this.entryOrigin = options.entryOrigin || options.origin || 'unknown';
    this.storeCurrencySymbol = getStoreCurrencySymbol();
  }



  async close(options = {}) {
    // Clean up global event listeners
    if (this._escapeKeyHandler) {
      document.removeEventListener('keydown', this._escapeKeyHandler);
      this._escapeKeyHandler = null;
    }
    const result = await super.close(options);
    if (!this._closeHandled) {
      this._closeHandled = true;
      try {
        await this._onStoreClosed?.({
          actor: this.actor,
          checkoutCompleted: this._checkoutCompleted,
          app: this
        });
      } catch (err) {
        console.warn('[SWSE Store] onClose callback failed:', err);
      }
    }
    return result;
  }

  async _handleCheckoutCompletion(payload = {}) {
    this._checkoutCompleted = true;
    try {
      await this._persistCart();
    } catch (err) {
      console.warn('[SWSE Store] Failed to persist cart during checkout completion:', err);
    }
    try {
      await this._onCheckoutComplete?.({ actor: this.actor, app: this, ...payload });
    } catch (err) {
      console.warn('[SWSE Store] onCheckoutComplete callback failed:', err);
    }
    if (this._closeAfterCheckout) {
      await this.close();
    }
  }

  async _prepareContext(_options) {
    if (!this._loaded) {await this._initialize();}

    const allItems = this._buildItemsWithSuggestions();
    const cartEntries = this._buildCartEntries();
    const purchaseHistoryEntries = this._buildPurchaseHistoryEntries();
    const cartTotal = calculateCartTotal(this.cart);
    const credits = Number(this.actor?.system?.credits ?? 0) || 0;
    const cartRemaining = Math.max(0, credits - cartTotal);
    const currentView = this.currentView || 'browse';
    const categorySummary = this._buildCategorySummary(allItems);
    const currentCategoryLabel = this._getCurrentCategoryLabel(categorySummary);
    const selectedProduct = await this._buildSelectedProductView();

    return {
      allItems,
      credits,
      cartCount: cartEntries.length,
      cartTotal,
      cartRemaining,
      cartEntries,
      currentView,
      currentCategory: this.currentCategory,
      currentCategoryLabel,
      categorySummary,
      selectedProduct,
      purchaseHistoryEntries,
      purchaseHistoryCount: purchaseHistoryEntries.length,
      pageContext: this._buildPageContext({ currentView, currentCategoryLabel, cartRemaining }),
      isGM: game.user?.isGM ?? false,
      rendarrWelcome: getRendarrLine('welcome'),
      rendarrImage: 'systems/foundryvtt-swse/assets/assets/mentors/rendarr.png',
      entryOrigin: this.entryOrigin,
      currencySymbol: this.storeCurrencySymbol
    };
  }

  _buildCartEntries() {
    const entries = [];
    const grouped = new Map();

    const pushEntry = (payload) => {
      const key = [payload.id, payload.type, payload.condition || 'standard'].join('::');
      const existing = grouped.get(key);
      if (existing) {
        existing.qty += 1;
        existing.lineCost += Number(payload.unitCost ?? payload.cost ?? 0) || 0;
        return;
      }
      grouped.set(key, {
        ...payload,
        qty: 1,
        unitCost: Number(payload.unitCost ?? payload.cost ?? 0) || 0,
        lineCost: Number(payload.unitCost ?? payload.cost ?? 0) || 0
      });
    };

    for (const item of this.cart?.items || []) {
      pushEntry({
        id: item.id,
        name: item.name,
        type: 'Item',
        itemType: 'item',
        img: item.img || '',
        unitCost: item.cost ?? 0,
        glyph: '◈'
      });
    }
    for (const droid of this.cart?.droids || []) {
      pushEntry({
        id: droid.id,
        name: droid.name,
        type: 'Droid',
        itemType: 'droid',
        img: droid.img || droid.actor?.img || '',
        unitCost: droid.cost ?? 0,
        glyph: '🤖'
      });
    }
    for (const vehicle of this.cart?.vehicles || []) {
      pushEntry({
        id: vehicle.id,
        name: vehicle.name,
        type: 'Vehicle',
        itemType: 'vehicle',
        img: vehicle.img || vehicle.template?.img || '',
        unitCost: vehicle.cost ?? 0,
        condition: vehicle.condition || 'new',
        glyph: '⛭'
      });
    }

    for (const entry of grouped.values()) {
      entries.push({
        ...entry,
        cost: entry.lineCost,
        costLabel: entry.qty > 1 ? `${entry.qty} × ${entry.unitCost}` : `${entry.unitCost}`,
        summary: entry.condition ? `${entry.type} · ${entry.condition}` : entry.type
      });
    }

    return entries;
  }

  _buildPurchaseHistoryEntries() {
    const history = this.actor?.getFlag?.('foundryvtt-swse', 'purchaseHistory') || [];
    return history.slice().reverse().map(entry => {
      const items = [
        ...(entry.items || []).map(i => ({ name: i.name || 'Unknown Item', qty: 1, cost: i.cost ?? 0 })),
        ...(entry.droids || []).map(i => ({ name: i.name || 'Unknown Droid', qty: 1, cost: i.cost ?? 0 })),
        ...(entry.vehicles || []).map(i => ({ name: i.name || 'Unknown Vehicle', qty: 1, cost: i.cost ?? 0 }))
      ];
      return {
        timestamp: new Date(entry.timestamp || Date.now()).toLocaleString(),
        total: entry.total ?? 0,
        items
      };
    });
  }

  _buildCategorySummary(allItems = []) {
    const labels = new Map();
    const counts = new Map();
    for (const item of allItems) {
      const key = safeString(item.category || item.type || 'other').toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
      if (!labels.has(key)) {
        labels.set(key, safeString(item.category || item.type || 'Other'));
      }
    }
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count, label: labels.get(key) || key }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  _getCurrentCategoryLabel(categorySummary = []) {
    if (!this.currentCategory) {return 'All Listings';}
    return categorySummary.find(category => category.key === this.currentCategory)?.label || this.currentCategory;
  }

  _buildPageContext({ currentView, currentCategoryLabel, cartRemaining }) {
    const labels = {
      browse: 'Browse',
      cart: 'Cart',
      checkout: 'Checkout',
      history: 'History',
      detail: 'Detail'
    };
    return {
      pageLabel: labels[currentView] || 'Browse',
      currentCategoryLabel,
      briefTitle: currentView === 'checkout' ? 'Settlement Window' : currentView === 'history' ? 'Archive Access' : 'Listings Routed',
      briefBody: currentView === 'checkout'
        ? 'Review the locked manifest before confirming the trade.'
        : currentView === 'history'
          ? 'Previous exchange logs are stored here for reference.'
          : 'Browse the exchange, inspect listings, and stage gear in your cart.',
      briefTags: [
        { label: 'Category', value: currentCategoryLabel },
        { label: 'Inventory', value: String(this.storeInventory?.allItems?.length || 0) },
        { label: 'Reserve', value: `${this.storeCurrencySymbol} ${cartRemaining}` }
      ],
      cartRemaining
    };
  }

  async _buildSelectedProductView() {
    if (!this.selectedProductId) {return null;}
    const item = this.itemsById.get(this.selectedProductId);
    if (!item) {return null;}
    const view = this._viewFromItem(item);
    const suggestion = this.suggestions.get(view.id);
    const sys = safeSystem(item) ?? {};
    const useAurebesh = SettingsHelper.getSafe('useAurebesh', false);
    const glyphData = resolveStoreGlyph(item.category || item.type || '', item.type, useAurebesh);
    const vehiclePricing = item.type === 'vehicle'
      ? {
          requiresCondition: true,
          newCost: Number(item.finalCostNew ?? item.finalCost ?? 0) || 0,
          usedCost: Number(item.finalCostUsed ?? item.finalCost ?? 0) || 0
        }
      : {
          requiresCondition: false,
          newCost: Number(view.finalCost ?? 0) || 0,
          usedCost: null
        };

    const descriptionRecord = await resolveStoreDescription(item);
    return {
      ...view,
      price: view.finalCost,
      category: item.category || item.type || '',
      subcategory: item.subcategory || sys.subcategory || sys.category || '',
      availability: item.system?.availability || 'Standard',
      typeLabel: this._getItemTypeLabel(item.type || ''),
      suggestion: suggestion?.combined
        ? {
            score: suggestion.combined.finalScore,
            tier: this._tierToLabel(suggestion.combined.tier)
          }
        : null,
      suggestionBullets: suggestion?.explanations || [],
      suggestionTierLabel: suggestion?.combined ? this._tierToDisplayLabel(suggestion.combined.tier) : '',
      techDetailsHtml: this._buildTechnicalDetails(item, sys, item.type || ''),
      description: descriptionRecord.description || safeSystem(item)?.description || '',
      descriptionBasic: descriptionRecord.basicText || '',
      descriptionAurebesh: descriptionRecord.aurebeshText || '',
      descriptionSource: descriptionRecord.source || 'none',
      mentorReview: this._generateMentorReview(suggestion),
      flavorReviewsHtml: this._generateFlavorReviews(item, item.type || ''),
      requiresCondition: vehiclePricing.requiresCondition,
      newCost: vehiclePricing.newCost,
      usedCost: vehiclePricing.usedCost,
      img: view.img || safeImg(item),
      glyph: glyphData.text,
      glyphLabel: glyphData.label,
      currencySymbol: this.storeCurrencySymbol
    };
  }

  _getLiveActorForTemplateDialog() {
    return this.actor
      || this.object
      || this._shell?.actor
      || this._shell?.object
      || this._shell?.progressionSession?.actor
      || null;
  }

  async _initialize() {
    if (this._loaded) {return;}
    this._loaded = true;

    // PHASE 1: Load cart from actor
    this.cart = this._loadCartFromActor();
    this.loadingOverlay?.advancePhase?.();

    // PHASE 2: Load inventory (DELEGATED TO ENGINE)
    await this._loadStoreInventory();
    this.loadingOverlay?.advancePhase?.();

    // PHASE 3: Load reviews pack
    await this._loadReviewsData();
    this.loadingOverlay?.advancePhase?.();

    // PHASE 4: Wire suggestion engine for all items
    if (this.actor) {
      await this._generateSuggestionsForAllItems();
    }
    this.loadingOverlay?.advancePhase?.();

    // PHASE 5: Mark render as complete (handled in _onRender)
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
          SWSELogger.debug('[SWSE Store] Overflow reviews not found (optional)', overflowErr.message);
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
          SWSELogger.debug('[SWSE Store] Usernames not found (optional)', usernamesErr.message);
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
          SWSELogger.debug('[SWSE Store] Vehicle reviews not found (optional)', vehicleErr.message);
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
          SWSELogger.debug('[SWSE Store] Droid reviews not found (optional)', droidErr.message);
        }

        // Try to load modification reviews pack
        try {
          const modResponse = await fetch('systems/foundryvtt-swse/data/reviews/modification-reviews.json');
          if (modResponse.ok) {
            const modData = await modResponse.json();
            if (modData.modificationReviews) {
              this.reviewsData.modificationReviews = modData.modificationReviews;
            }
          }
        } catch (modErr) {
          // Modification pack is optional, don't fail if missing
          SWSELogger.debug('[SWSE Store] Modification reviews not found (optional)', modErr.message);
        }

        // Try to load service reviews pack
        try {
          const serviceResponse = await fetch('systems/foundryvtt-swse/data/reviews/service-reviews.json');
          if (serviceResponse.ok) {
            const serviceData = await serviceResponse.json();
            if (serviceData.dining) {
              this.reviewsData.dining = serviceData.dining;
            }
            if (serviceData.lodging) {
              this.reviewsData.lodging = serviceData.lodging;
            }
            if (serviceData.medicalCare) {
              this.reviewsData.medicalCare = serviceData.medicalCare;
            }
            if (serviceData.transportation) {
              this.reviewsData.transportation = serviceData.transportation;
            }
            if (serviceData.upkeep) {
              this.reviewsData.upkeep = serviceData.upkeep;
            }
            if (serviceData.vehicleRental) {
              this.reviewsData.vehicleRental = serviceData.vehicleRental;
            }
          }
        } catch (serviceErr) {
          // Service pack is optional, don't fail if missing
          SWSELogger.debug('[SWSE Store] Service reviews not found (optional)', serviceErr.message);
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
    const useAurebesh = SettingsHelper.getSafe('useAurebesh', false);

    for (const item of this.storeInventory?.allItems || []) {
      // Engine normalizes IDs to .id (not ._id)
      const suggestion = this.suggestions.get(item.id);
      const view = this._viewFromItem(item);

      // Add category for filtering
      view.category = item.category || item.type || '';
      view.availability = (item.system?.availability || '').toString();
      view.price = view.finalCost;

      // RESOLVE GLYPH: Central authority (store-glyph-map.js)
      const glyphData = resolveStoreGlyph(view.category, item.type, useAurebesh);
      view.glyph = glyphData.text;
      view.glyphLabel = glyphData.label;

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
    // Convert tier string to CSS class: ""STRONG_FIT" → "strong-fit"
    return (tier || '').toLowerCase().replace(/_/g, '-');
  }

  _tierToDisplayLabel(tier) {
    // Convert tier to display with canonical labels
    const tierMap = {
      'Perfect': 'Perfect',
      'Excellent': 'Excellent',
      'Good': 'Good',
      'Viable': 'Viable',
      'Marginal': 'Marginal',
      'Poor': 'Poor',
      // Legacy support
      'STRONG_FIT': 'Excellent',
      'SITUATIONAL': 'Marginal',
      'OUTPERFORMED': 'Poor'
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
      // Engine normalizes IDs to .id (not ._id); prefer .id if available
      id: item.id ?? item._id,
      name: safeString(item.name),
      img: safeImg(item),

      // Display pricing: For template compatibility
      // Scalar items: use finalCost as cost
      // Conditional vehicles: use finalCostNew as cost, finalCostUsed as costUsed
      cost: item.finalCostNew ?? item.finalCost,
      costUsed: item.finalCostUsed ?? undefined,

      // Legacy field for some views
      finalCost: item.finalCost ?? getCostValue(item),

      rarityClass,
      rarityLabel: getRarityLabel(rarityClass),
      system: sys,
      type: item.type,
      subcategory: item.subcategory || sys.subcategory || sys.category || '',
      typeLabel: this._getItemTypeLabel(item.type)
    };
  }

  _getItemTypeLabel(type) {
    const typeMap = {
      weapon: 'Weapon',
      armor: 'Armor',
      equipment: 'Equipment',
      droid: 'Droid',
      vehicle: 'Vehicle'
    };
    return typeMap[type] || safeString(type || 'Item');
  }



  async _onRender(context, options) {
    // Phase 3: Enforce super._onRender call (AppV2 contract)
    await super._onRender(context, options);

    const root = this.element;
    if (!(root instanceof HTMLElement)) {return;}

    // Abort previous render's listeners
    this._renderAbort?.abort();
    this._renderAbort = new AbortController();
    const { signal } = this._renderAbort;

    // Initialize card floating/expansion controller
    if (this.cardInteractions) {
      this.cardInteractions.destroy();
    }
    this.cardInteractions = new StoreCardInteractions(root);

    // Search functionality
    const searchInput = root.querySelector('#store-search');
    const availabilityFilter = root.querySelector('#store-availability-filter');
    const sortSelect = root.querySelector('#store-sort');

    const updateGrid = () => this._filterAndSortGrid(root);

    if (searchInput) {
      searchInput.addEventListener('input', updateGrid, { signal });
    }
    if (availabilityFilter) {
      availabilityFilter.addEventListener('change', updateGrid, { signal });
    }
    if (sortSelect) {
      sortSelect.addEventListener('change', updateGrid, { signal });
    }

    root.querySelectorAll('[data-action="show-browse"]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentView = 'browse';
        this.render();
      }, { signal });
    });
    root.querySelectorAll('[data-action="view-cart"]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentView = 'cart';
        this.render();
      }, { signal });
    });
    root.querySelectorAll('[data-action="show-history"]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentView = 'history';
        this.render();
      }, { signal });
    });
    root.querySelectorAll('[data-action="category-nav"]').forEach(btn => {
      btn.addEventListener('click', ev => {
        this.currentCategory = ev.currentTarget?.dataset?.category || '';
        this.currentView = 'browse';
        this.render();
      }, { signal });
    });
    root.querySelectorAll('[data-action="clear-filters"]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentCategory = '';
        this.currentPage = 1;
        const searchInput = root.querySelector('#store-search');
        const availability = root.querySelector('#store-availability-filter');
        const sort = root.querySelector('#store-sort');
        if (searchInput) searchInput.value = '';
        if (availability) availability.value = '';
        if (sort) sort.value = 'suggested';
        this.render();
      }, { signal });
    });
    root.querySelectorAll('[data-action="remove-cart-row"]').forEach(btn => {
      btn.addEventListener('click', async ev => {
        const typeLabel = (ev.currentTarget?.dataset?.type || '').toLowerCase();
        const type = typeLabel === 'droid' ? 'droids' : typeLabel === 'vehicle' ? 'vehicles' : 'items';
        const id = ev.currentTarget?.dataset?.id;
        if (!id) {return;}
        removeFromCartById(this.cart, type, id);
        await this._persistCart();
        this.render();
      }, { signal });
    });
    // Detail qty controls
    const detailQtyInput = root.querySelector('.detail-qty-input');
    const detailQtyMinus = root.querySelector('.detail-qty-minus');
    const detailQtyPlus = root.querySelector('.detail-qty-plus');

    if (detailQtyMinus) {
      detailQtyMinus.addEventListener('click', () => {
        const val = Math.max(1, (parseInt(detailQtyInput?.value) || 1) - 1);
        if (detailQtyInput) detailQtyInput.value = val;
      }, { signal });
    }

    if (detailQtyPlus) {
      detailQtyPlus.addEventListener('click', () => {
        const val = Math.min(999, (parseInt(detailQtyInput?.value) || 1) + 1);
        if (detailQtyInput) detailQtyInput.value = val;
      }, { signal });
    }

    if (detailQtyInput) {
      detailQtyInput.addEventListener('change', () => {
        const val = Math.max(1, Math.min(999, parseInt(detailQtyInput.value) || 1));
        detailQtyInput.value = val;
      }, { signal });
    }

    root.querySelectorAll('[data-action="detail-add-to-cart"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!this.selectedProductId) {return;}
        const qty = parseInt(detailQtyInput?.value) || 1;
        for (let i = 0; i < qty; i++) {
          addItemToCart(this, this.selectedProductId, i === 0 ? (line => this._setRendarrLine(line)) : null, { quantity: 1 });
        }
        await this._persistCart();
        this.selectedProductId = null;
        this.currentView = 'cart';
        this.render();
      }, { signal });
    });

    root.querySelectorAll('[data-action="detail-customize-item"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const item = this.itemsById.get(this.selectedProductId);
        if (!item || !this.actor) return;
        openItemCustomization(this.actor, item, {
          mode: 'store-stage',
          applyMode: 'stage-to-cart',
          sourceItem: item,
          onStage: async ({ cartEntry }) => {
            this.cart.items.push(cartEntry);
            await this._persistCart?.();
            this.selectedProductId = null;
            this.currentView = 'cart';
            this.render();
          }
        });
      }, { signal });
    });

    root.querySelectorAll('[data-action="detail-save-for-later"]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const item = this.itemsById.get(this.selectedProductId);
        if (!item || !this.actor) return;
        const current = this.actor.getFlag('foundryvtt-swse', 'storeSavedForLater') || [];
        const exists = current.some(entry => entry?.id === item.id);
        if (!exists) {
          current.push({
            id: item.id,
            name: item.name,
            type: item.type,
            cost: Number(item.finalCost ?? item.finalCostNew ?? 0) || 0,
            savedAt: Date.now()
          });
          await this.actor.setFlag('foundryvtt-swse', 'storeSavedForLater', current);
        }
        ui.notifications.info(`${item.name} saved for later.`);
      }, { signal });
    });
    // Card expand buttons → Detail view
    root.querySelectorAll('[data-action="expand-product"]').forEach(btn => {
      btn.addEventListener('click', ev => {
        const itemId = ev.currentTarget?.dataset?.itemId;
        if (itemId) {
          this.selectedProductId = itemId;
          this.currentView = 'detail';
          this.render();
        }
      }, { signal });
    });

    // Add to cart buttons (cards)
    root.querySelectorAll('[data-action="add-to-cart"]').forEach(btn => {
      btn.addEventListener('click', async ev => {
        ev.stopPropagation();
        const id = ev.currentTarget?.dataset?.itemId;
        if (!id) {return;}
        addItemToCart(this, id, line => this._setRendarrLine(line));
        await this._persistCart();
        this.render();
      }, { signal });
    });


    // Custom builders
    const customDroidBtn = root.querySelector('.create-custom-droid');
    if (customDroidBtn) {
      customDroidBtn.addEventListener('click', async () => {
        if (!this.actor) {return;}
        await buildDroidWithBuilder(this.actor, () => this.render());
      }, { signal });
    }

    const templateDroidBtn = root.querySelector('.build-droid-from-template');
    if (templateDroidBtn) {
      templateDroidBtn.addEventListener('click', async () => {
        if (!this.actor) {return;}
        await buildDroidFromTemplate(this.actor, () => this.render());
      }, { signal });
    }

    const customStarshipBtn = root.querySelector('.create-custom-starship');
    if (customStarshipBtn) {
      customStarshipBtn.addEventListener('click', async () => {
        if (!this.actor) {return;}
        await createCustomStarship(this.actor, () => this.render());
      }, { signal });
    }

    const checkoutBtn = root.querySelector('#checkout-cart');
    if (checkoutBtn) {
      checkoutBtn.addEventListener('click', () => {
        this.currentView = 'checkout';
        this.render();
      }, { signal });
    }

    const confirmCheckoutBtn = root.querySelector('#confirm-checkout');
    if (confirmCheckoutBtn) {
      confirmCheckoutBtn.addEventListener('click', async () => {
        const result = await checkout(this, (el, v) => this._animateNumber(el, v));
        if (result?.success === true) {
          this.currentView = 'history';
          this.render();
        }
      }, { signal });
    }

    const clearBtn = root.querySelector('#clear-cart');
    if (clearBtn) {
      clearBtn.addEventListener('click', async () => {
        clearCart(this.cart);
        await this._persistCart();
        this.render();
      }, { signal });
    }

    // Initial render once DOM exists
    this._renderCartUI();
    if (root.querySelector('#products-grid')) {
      this._filterAndSortGrid(root);
    }

    // PHASE 5: Complete: All rendering done, fade out overlay
    this.loadingOverlay?.advancePhase?.();
    this.loadingOverlay?.complete?.();
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

    // P2-4: Safe search term handling (Unicode-safe, case-insensitive)
    const rawSearchTerm = root.querySelector('#store-search')?.value || '';
    const searchTerm = rawSearchTerm.toLowerCase().trim();
    const categoryFilter = this.currentCategory || '';
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
      // Normalize category and availability to lowercase for case-insensitive matching
      const category = (card.dataset.category || '').toLowerCase();
      const availability = (card.dataset.availability || '').toLowerCase();

      const matchesSearch = !searchTerm || name.includes(searchTerm) || desc.includes(searchTerm);
      const matchesCategory = !categoryFilter || category === categoryFilter.toLowerCase();
      const matchesAvailability = !availabilityFilter || availability === availabilityFilter.toLowerCase();

      if (matchesSearch && matchesCategory && matchesAvailability) {
        visibleCards.push({ card, item });
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

    // P2-1: Pagination - hide all cards first
    cards.forEach(card => card.style.display = 'none');

    // Calculate pagination
    const totalVisible = visibleCards.length;
    this.totalVisibleItems = totalVisible;
    const totalPages = Math.ceil(totalVisible / this.itemsPerPage);

    // Reset page if it's beyond range
    if (this.currentPage > totalPages) {
      this.currentPage = Math.max(1, totalPages);
    }

    // Show only cards for current page
    const startIdx = (this.currentPage - 1) * this.itemsPerPage;
    const endIdx = startIdx + this.itemsPerPage;
    const paginatedCards = visibleCards.slice(startIdx, endIdx);

    paginatedCards.forEach(({ card }) => {
      grid.appendChild(card);
      card.style.display = '';
    });

    // Show/hide empty state
    const emptyState = grid.parentElement?.querySelector('.empty-state');
    if (emptyState) {
      emptyState.style.display = totalVisible === 0 ? 'flex' : 'none';
    }

    root.querySelectorAll('[data-results-count]').forEach(el => {
      el.textContent = String(totalVisible);
    });
    root.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = String((this.cart.items.length + this.cart.droids.length + this.cart.vehicles.length) || 0);
    });
    root.querySelectorAll('[data-action="category-nav"]').forEach(btn => {
      const isActive = (btn.dataset.category || '') === (categoryFilter || '');
      btn.classList.toggle('is-active', isActive);
    });
    const allBtn = root.querySelector('[data-action="category-nav"][data-category=""]');
    if (allBtn) {
      allBtn.classList.toggle('is-active', !categoryFilter);
    }

    // Render pagination controls
    this._renderPaginationControls(root, this.currentPage, totalPages);
  }

  /**
   * P2-1: Render pagination controls
   */
  _renderPaginationControls(root, currentPage, totalPages) {
    let paginationContainer = root.querySelector('#pagination-controls');
    if (!paginationContainer) {
      const gridContainer = root.querySelector('#products-grid')?.parentElement;
      if (!gridContainer) return;
      paginationContainer = document.createElement('div');
      paginationContainer.id = 'pagination-controls';
      paginationContainer.style.cssText = 'display: flex; justify-content: center; align-items: center; gap: 10px; padding: 15px; flex-wrap: wrap;';
      gridContainer.appendChild(paginationContainer);
    }

    if (totalPages <= 1) {
      paginationContainer.innerHTML = '';
      return;
    }

    paginationContainer.innerHTML = `
      <button id="prev-page-btn" class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''}>← Previous</button>
      <span id="page-info" style="font-size: 0.9em; color: #888;">Page ${currentPage} of ${totalPages}</span>
      <button id="next-page-btn" class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''}>Next →</button>
    `;

    const prevBtn = paginationContainer.querySelector('#prev-page-btn');
    const nextBtn = paginationContainer.querySelector('#next-page-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 1) {
          this.currentPage--;
          this._filterAndSortGrid(root);
          root.querySelector('#products-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.currentPage < totalPages) {
          this.currentPage++;
          this._filterAndSortGrid(root);
          root.querySelector('#products-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }


  _buildTechnicalDetails(item, sys, itemType) {
    const details = [];
    const add = (label, value) => {
      if (value === undefined || value === null || value === '') return;
      details.push(`<div class="ss-tech-row"><span class="ss-tech-label">${label}</span><span class="ss-tech-value">${value}</span></div>`);
    };

    if (itemType === 'armor') {
      add('Type', sys.armorType || item.subcategory || 'Armor');
      const reflexBonus = sys.defenseBonus ?? sys.reflexBonus;
      const fortitudeBonus = sys.fortBonus ?? sys.fortitudeBonus;
      add('Reflex Bonus', reflexBonus !== undefined && reflexBonus !== null ? `+${reflexBonus}` : '');
      add('Fortitude Bonus', fortitudeBonus !== undefined && fortitudeBonus !== null ? `+${fortitudeBonus}` : '');
      add('Max Dex', sys.maxDexBonus ?? sys.maxDex);
      add('Armor Check', sys.armorCheckPenalty ?? sys.checkPenalty);
      add('Speed Penalty', sys.speedPenalty);
      add('Weight', sys.weight);
      add('Source', sys.sourcebook);
    }

    if (itemType === 'weapon') {
      add('Category', item.subcategory || sys.category || sys.weaponCategory);
      add('Damage', sys.damage);
      add('Damage Type', sys.damageType);
      add('Range', sys.range);
      add('Proficiency', sys.proficiency);
      add('Size', sys.size);
      add('Weight', sys.weight);
      add('Properties', Array.isArray(sys.properties) ? sys.properties.join(', ') : sys.properties);
      add('Source', sys.sourcebook);
    }

    if (itemType === 'equipment') {
      add('Class', item.subcategory || (Array.isArray(sys.tags) ? sys.tags.join(', ') : sys.category));
      add('Size', sys.size);
      add('Weight', sys.weight);
      add('Quantity', sys.quantity);
      add('Source', sys.sourcebook);
    }

    if (itemType === 'droid') {
      add('Degree', sys.degree);
      add('Size', sys.size);
      add('Hit Points', sys.HP);
      add('Damage Threshold', sys.damageThreshold);
      add('Reflex', sys.reflexDefense);
      add('Fortitude', sys.fortitudeDefense);
      add('Will', sys.willDefense);
      add('Speed', sys.speed || item.flags?.swse?.speedText || item.doc?.flags?.swse?.speedText);
      add('Perception', sys.perception);
      const melee = Array.isArray(sys.attacks?.melee) ? sys.attacks.melee.map(a => `${a.name} ${a.damage ? `(${a.damage})` : ''}`.trim()).join(', ') : '';
      const ranged = Array.isArray(sys.attacks?.ranged) ? sys.attacks.ranged.map(a => `${a.name} ${a.damage ? `(${a.damage})` : ''}`.trim()).join(', ') : '';
      add('Melee', melee);
      add('Ranged', ranged);
    }

    if (itemType === 'vehicle') {
      add('Class', sys.type || item.subcategory);
      add('Size', sys.size);
      add('Hull', sys.hull?.max ?? sys.hull?.value ?? sys.hull);
      add('Shields', sys.shields?.max ?? sys.shields?.value ?? sys.shields);
      add('Damage Reduction', sys.damageReduction);
      add('Damage Threshold', sys.damageThreshold);
      add('Reflex', sys.reflexDefense);
      add('Fortitude', sys.fortitudeDefense);
      add('Speed', sys.speed || sys.maxVelocity);
      add('Maneuver', sys.maneuver);
      add('Crew', sys.crew);
      add('Passengers', sys.passengers);
      add('Cargo', sys.cargo);
      add('Consumables', sys.consumables);
      add('Hyperdrive', sys.hyperdrive_class);
      if (Array.isArray(sys.weapons) && sys.weapons.length) {
        add('Weapons', sys.weapons.map(w => `${w.name}${w.damage ? ` (${w.damage})` : ''}`).join(', '));
      }
    }

    add('Availability', sys.availability);

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
      SWSELogger.debug('[SWSE Store] No reviews data loaded');
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
        icon = '<i class="fa-solid fa-user-secret" style="color: #64ff64; margin-right: 4px;"></i>';
      } else if (review.type === 'seller') {
        bgColor = 'rgba(255, 100, 100, 0.1)';
        borderColor = 'rgba(255, 100, 100, 0.3)';
        icon = '<i class="fa-solid fa-store" style="color: #ff6464; margin-right: 4px;"></i>';
      } else if (review.type === 'system-message') {
        bgColor = 'rgba(150, 150, 150, 0.1)';
        borderColor = 'rgba(150, 150, 150, 0.3)';
        icon = '<i class="fa-solid fa-info-circle" style="color: #969696; margin-right: 4px;"></i>';
      } else {
        // customer
        bgColor = 'rgba(0, 0, 0, 0.2)';
        borderColor = 'rgba(0, 217, 255, 0.3)';
        icon = '<i class="fa-solid fa-user" style="color: #00d9ff; margin-right: 4px;"></i>';
      }

      // Star rating display (if present)
      const starDisplay = review.stars !== null && review.stars !== undefined ? `<span style="color: #ffc800; font-size: 11px; margin-left: 4px;">★ ${review.stars}/5</span>` : '';
      const helpfulDisplay = Number.isFinite(review.helpfulCount) ? `<span style="color: rgba(255,255,255,0.5); font-size: 10px; margin-left: 8px;">${review.helpfulCount} found this helpful</span>` : '';

      // Build reviews + replies
      // Username & metadata in Consolas (readable)
      // Review text in Aurebesh (intentional nonsense marketplace noise)
      let reviewHTML = `
        <div class="flavor-review" style="margin-bottom: 12px; padding: 8px; background: ${bgColor}; border-left: 2px solid ${borderColor}; border-radius: 2px;">
          <div style="font-size: 11px; color: rgba(255, 255, 255, 0.7); font-weight: bold; margin-bottom: 4px; font-family: Consolas, monospace;">
            ${icon} ${displayAuthor} ${starDisplay}${helpfulDisplay}
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

  _getCurrencySymbol() {
    return this.storeCurrencySymbol || getStoreCurrencySymbol();
  }

  _renderCartUI() {
    const rootEl = this.element;
    if (!rootEl) {return;}

    const subtotal = calculateCartTotal(this.cart);
    const credits = Number(this.actor?.system?.credits ?? 0) || 0;
    const remaining = credits - subtotal;
    const count = (this.cart.items.length + this.cart.droids.length + this.cart.vehicles.length) || 0;

    rootEl.querySelectorAll('[data-cart-count]').forEach(el => {
      el.textContent = String(count);
    });
    rootEl.querySelectorAll('[data-cart-total]').forEach(el => {
      el.textContent = String(subtotal);
    });
    rootEl.querySelectorAll('[data-cart-remaining]').forEach(el => {
      el.textContent = String(Math.max(0, remaining));
    });
  }

  /**
   * Animate credit reconciliation after purchase
   */
  async animateCreditReconciliation(fromCredits, toCredits, duration = 600) {
    const rootEl = this.element;
    if (!rootEl) {return;}

    const remainingEl = rootEl.querySelector('#cart-remaining');
    if (!remainingEl) {return;}

    const reduceMotion = game.user?.getFlag?.('core', 'reduce-motion') ?? false;

    if (reduceMotion) {
      // Skip animation, jump to final value
      remainingEl.textContent = String(Math.max(0, toCredits));
      return;
    }

    // Animate from fromCredits to toCredits
    remainingEl.classList.add('credits-reconciling');

    // Use requestAnimationFrame for smooth animation
    const startTime = performance.now();
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out curve for natural deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(fromCredits - (fromCredits - toCredits) * easeProgress);

      remainingEl.textContent = String(Math.max(0, current));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        remainingEl.classList.remove('credits-reconciling');
        remainingEl.textContent = String(Math.max(0, toCredits));
      }
    };

    requestAnimationFrame(animate);

    // Wait for animation to complete
    return new Promise(resolve => {
      setTimeout(resolve, duration);
    });
  }

}
