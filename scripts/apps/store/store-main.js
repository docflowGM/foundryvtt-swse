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
import { LedgerService } from "/systems/foundryvtt-swse/scripts/engine/store/ledger-service.js";
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
  getCostValue,
  buildStoreNavigationModel,
  normalizeArmorSubcategory,
  normalizeDroidSubcategory,
  normalizeVehicleSubcategory,
  getDroidFamily,
  getVehicleFamily,
  getVehicleChallengeBand,
  getVehicleChallengeBandLabel,
  getVehicleChallengeLevel,
  getVehicleSizeKey,
  getVehicleSizeLabel,
  getVehicleCrewGroup,
  getVehicleCrewGroupLabel,
  getVehiclePassengerGroup,
  getVehiclePassengerGroupLabel,
  getVehicleRoleDefinitionsForSubcategory,
  getVehicleRoleKey,
  getVehicleRoleLabel,
  getVehicleCargoGroup,
  getVehicleCargoGroupLabel,
  getVehicleHyperdriveKey,
  getVehicleWeaponsKey,
  getVehicleShieldsKey,
  getVehicleBooleanFeatureLabel,
  getWeaponFamily
} from "/systems/foundryvtt-swse/scripts/apps/store/store-shared.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { isStoreItemPurchasable, summarizeStorePolicy } from "/systems/foundryvtt-swse/scripts/engine/store/policy-service.js";
import { openItemCustomization } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js";
import { getRendarrLine } from "/systems/foundryvtt-swse/scripts/apps/store/dialogue/rendarr-dialogue.js";
import { getRendarrPortraitPath } from "/systems/foundryvtt-swse/scripts/mentor/mentor-portrait-registry.js";
import { resolveStoreDescription, getStoreCurrencySymbol } from "/systems/foundryvtt-swse/scripts/apps/store/store-description-resolver.js";
import { resolveArmorData } from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";
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


function storeI18n(key, data = {}) {
  try {
    return game.i18n?.format?.(key, data) ?? game.i18n?.localize?.(key) ?? key;
  } catch (_err) {
    return key;
  }
}

const CART_FLAG_SCOPE = 'foundryvtt-swse';
const CART_FLAG_KEY = 'storeCart';

function emptyCart() {
  return { items: [], droids: [], vehicles: [] };
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

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

function getStoreAvailabilityText(itemOrView = {}) {
  const sys = itemOrView.system ?? itemOrView.data ?? {};
  return String(
    sys.availability
    ?? itemOrView.availability
    ?? itemOrView.rarityLabel
    ?? itemOrView.rarityClass
    ?? ''
  ).trim();
}

function storeItemCategoryKey(itemOrView = {}) {
  const raw = String(itemOrView.category ?? itemOrView.type ?? '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.includes('weapon')) return 'weapons';
  if (raw.includes('armor')) return 'armor';
  if (raw.includes('droid')) return 'droids';
  if (raw.includes('vehicle') || raw.includes('ship') || raw.includes('speeder') || raw.includes('walker')) return 'vehicles';
  if (raw.includes('gear') || raw.includes('equipment') || raw.includes('medical') || raw.includes('security') || raw.includes('survival') || raw.includes('tech') || raw.includes('tool')) return 'gear';
  return raw.replace(/\s+/g, '-');
}

function getStoreNavigationSubcategory(itemOrView = {}) {
  const categoryKey = storeItemCategoryKey(itemOrView);
  if (categoryKey === 'armor') return normalizeArmorSubcategory(itemOrView);
  if (categoryKey === 'droids') return normalizeDroidSubcategory(itemOrView);
  if (categoryKey === 'vehicles') return normalizeVehicleSubcategory(itemOrView);
  return String(itemOrView.subcategory ?? itemOrView.system?.subcategory ?? itemOrView.system?.category ?? '').trim();
}

function getStoreNavigationFamily(itemOrView = {}) {
  const categoryKey = storeItemCategoryKey(itemOrView);
  if (categoryKey === 'weapons') return getWeaponFamily(getStoreNavigationSubcategory(itemOrView));
  if (categoryKey === 'droids') return getDroidFamily(itemOrView);
  if (categoryKey === 'vehicles') return getVehicleFamily(getStoreNavigationSubcategory(itemOrView));
  return '';
}

function vehicleSizeMatches(itemOrView = {}, filterValue = '') {
  const filter = normalizeStoreFilterValue(filterValue);
  if (!filter || filter === 'all') return true;
  return getVehicleSizeKey(itemOrView) === filter;
}

function vehicleChallengeMatches(itemOrView = {}, filterValue = '') {
  const filter = normalizeStoreFilterValue(filterValue);
  if (!filter || filter === 'all') return true;
  return getVehicleChallengeBand(itemOrView) === filter;
}



function vehicleCrewMatches(itemOrView = {}, filterValue = '') {
  const filter = normalizeStoreFilterValue(filterValue);
  if (!filter || filter === 'all') return true;
  return getVehicleCrewGroup(itemOrView) === filter;
}

function vehiclePassengerMatches(itemOrView = {}, filterValue = '') {
  const filter = normalizeStoreFilterValue(filterValue);
  if (!filter || filter === 'all') return true;
  return getVehiclePassengerGroup(itemOrView) === filter;
}

function vehicleCargoMatches(itemOrView = {}, filterValue = '') {
  const filter = normalizeStoreFilterValue(filterValue);
  if (!filter || filter === 'all') return true;
  return getVehicleCargoGroup(itemOrView) === filter;
}

function vehicleFeatureMatches(itemOrView = {}, filterValue = '', getter = null) {
  const filter = normalizeStoreFilterValue(filterValue);
  if (!filter || filter === 'all' || typeof getter !== 'function') return true;
  return getter(itemOrView) === filter;
}
function availabilityMatches(itemOrView = {}, filterValue = '') {
  const filter = normalizeAvailabilityText(filterValue);
  if (!filter || filter === 'all') return true;
  const availability = normalizeAvailabilityText(getStoreAvailabilityText(itemOrView));
  if (!availability) return false;
  return availability.split(/\s+/).includes(filter) || availability.includes(filter);
}


function positiveCreditOrNull(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function resolveVehicleStoreCosts(item = {}) {
  const newCost = positiveCreditOrNull(item.finalCostNew)
    ?? positiveCreditOrNull(item.finalCost)
    ?? positiveCreditOrNull(item.costNew)
    ?? positiveCreditOrNull(item.cost);
  const usedCost = positiveCreditOrNull(item.finalCostUsed)
    ?? positiveCreditOrNull(item.costUsed);
  return { newCost, usedCost };
}

function vehiclePriceStatusLabel(item = {}) {
  const status = item.system?.vehiclePriceStatus || item.vehiclePriceStatus || item.costStatus || '';
  if (status === 'review') return 'Price needs source review';
  if (status === 'unavailable') return 'Not publicly available';
  if (status === 'missing') return 'Price unknown';
  return '';
}

function hasStorePrice(value) {
  return positiveCreditOrNull(value) !== null;
}

export class SWSEStore extends BaseSWSEAppV2 {

  static DEFAULT_OPTIONS = {
    id: 'swse-store',
    tag: 'section',
    window: {
      title: 'SWSE.Store.Title',
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
    if (this.options?.window) {
      this.options.window.title = storeI18n('SWSE.Store.Title');
    }
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
    this.currentCategory = 'weapons';
    this.currentSubcategory = null;  // Phase 2: Secondary nav support
    this.currentFamily = null;        // Phase 2: weapon/vehicle/droid family grouping
    this.currentVehicleSize = null;
    this.currentVehicleCl = null;
    this.currentVehicleRole = null;
    this.currentVehicleCrew = null;
    this.currentVehiclePassenger = null;
    this.currentVehicleCargo = null;
    this.currentVehicleHyperdrive = null;
    this.currentVehicleWeapons = null;
    this.currentVehicleShields = null;
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
    const credits = LedgerService.getCurrentCredits(this.actor);
    const cartRemaining = Math.max(0, credits - cartTotal);
    const currentView = this.currentView || 'browse';
    const categorySummary = this._buildCategorySummary(allItems);
    const currentCategoryLabel = this._getCurrentCategoryLabel(categorySummary);
    const selectedProduct = await this._buildSelectedProductView();

    // Phase 2: Build hierarchical navigation model
    const navigationModel = buildStoreNavigationModel(this.storeInventory, {
      activeCategory: this.currentCategory,
      activeSubcategory: this.currentSubcategory,
      activeFamily: this.currentFamily
    });

    // Phase 2: Pre-group weapon subcategories by family for template simplicity
    if (navigationModel.topCategories) {
      for (const category of navigationModel.topCategories) {
        if (category.key === 'weapons' && category.children) {
          const byFamily = new Map();
          for (const child of category.children) {
            const family = child.family || 'other';
            if (!byFamily.has(family)) byFamily.set(family, []);
            byFamily.get(family).push(child);
          }
          category.familyGroups = Object.fromEntries(byFamily);
        }
      }
    }

    return {
      allItems,
      credits,
      cartCount: cartEntries.length,
      cartTotal,
      cartRemaining,
      cartEntries,
      currentView,
      currentCategory: this.currentCategory,
      currentSubcategory: this.currentSubcategory,
      currentFamily: this.currentFamily,
      currentVehicleSize: this.currentVehicleSize,
      currentVehicleCl: this.currentVehicleCl,
      currentVehicleRole: this.currentVehicleRole,
      currentVehicleCrew: this.currentVehicleCrew,
      currentVehiclePassenger: this.currentVehiclePassenger,
      currentVehicleCargo: this.currentVehicleCargo,
      currentVehicleHyperdrive: this.currentVehicleHyperdrive,
      currentVehicleWeapons: this.currentVehicleWeapons,
      currentVehicleShields: this.currentVehicleShields,
      vehicleSizeOptions: this._buildVehicleSizeOptions(),
      vehicleClOptions: this._buildVehicleClOptions(),
      vehicleRoleOptions: this._buildVehicleRoleOptions(),
      vehicleCrewOptions: this._buildVehicleCrewOptions(),
      vehiclePassengerOptions: this._buildVehiclePassengerOptions(),
      vehicleCargoOptions: this._buildVehicleCargoOptions(),
      vehicleHyperdriveOptions: this._buildVehicleBooleanOptions('hyperdrive'),
      vehicleWeaponsOptions: this._buildVehicleBooleanOptions('weapons'),
      vehicleShieldsOptions: this._buildVehicleBooleanOptions('shields'),
      currentCategoryLabel,
      categorySummary,
      selectedProduct,
      purchaseHistoryEntries,
      purchaseHistoryCount: purchaseHistoryEntries.length,
      pageContext: this._buildPageContext({ currentView, currentCategoryLabel, cartRemaining }),
      navigationModel,  // Phase 2: Include navigation model
      isGM: game.user?.isGM ?? false,
      rendarrWelcome: getRendarrLine('welcome'),
      rendarrImage: getRendarrPortraitPath(),
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
        type: storeI18n('SWSE.Store.Technical.Item'),
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
        type: storeI18n('SWSE.Store.Navigation.Droids'),
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
        type: storeI18n('SWSE.Store.Navigation.Vehicles'),
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
        ...(entry.items || []).map(i => ({ name: i.name || storeI18n('SWSE.Store.Unknown.Item'), qty: 1, cost: i.cost ?? 0 })),
        ...(entry.droids || []).map(i => ({ name: i.name || storeI18n('SWSE.Store.Unknown.Droid'), qty: 1, cost: i.cost ?? 0 })),
        ...(entry.vehicles || []).map(i => ({ name: i.name || storeI18n('SWSE.Store.Unknown.Vehicle'), qty: 1, cost: i.cost ?? 0 }))
      ];
      return {
        timestamp: new Date(entry.timestamp || Date.now()).toLocaleString(),
        total: entry.total ?? 0,
        items
      };
    });
  }

  _buildCategorySummary(allItems = []) {
    const canonicalLabels = {
      weapons: storeI18n('SWSE.Store.Navigation.Weapons'),
      armor: storeI18n('SWSE.Store.Navigation.Armor'),
      gear: storeI18n('SWSE.Store.Navigation.Equipment'),
      equipment: storeI18n('SWSE.Store.Navigation.Equipment'),
      vehicles: storeI18n('SWSE.Store.Navigation.Vehicles'),
      droids: storeI18n('SWSE.Store.Navigation.Droids')
    };
    const canonicalOrder = ['weapons', 'armor', 'gear', 'equipment', 'vehicles', 'droids'];
    const labels = new Map();
    const counts = new Map();
    for (const item of allItems) {
      const key = safeString(item.category || item.type || 'other').toLowerCase();
      counts.set(key, (counts.get(key) || 0) + 1);
      if (!labels.has(key)) {
        labels.set(key, canonicalLabels[key] || safeString(item.category || item.type || 'Other'));
      }
    }
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count, label: labels.get(key) || key }))
      .sort((a, b) => {
        const ai = canonicalOrder.indexOf(a.key);
        const bi = canonicalOrder.indexOf(b.key);
        if (ai !== -1 || bi !== -1) {
          if (ai === -1) return 1;
          if (bi === -1) return -1;
          return ai - bi;
        }
        return a.label.localeCompare(b.label);
      });
  }

  _getCurrentCategoryLabel(categorySummary = []) {
    if (!this.currentCategory) {return storeI18n('SWSE.Store.Navigation.Weapons');}
    return categorySummary.find(category => category.key === this.currentCategory)?.label || this.currentCategory;
  }

  _buildPageContext({ currentView, currentCategoryLabel, cartRemaining }) {
    const labels = {
      browse: storeI18n('SWSE.Store.Tabs.Browse'),
      cart: storeI18n('SWSE.Store.Tabs.Cart'),
      checkout: storeI18n('SWSE.Store.Tabs.Checkout'),
      history: storeI18n('SWSE.Store.Tabs.History'),
      detail: storeI18n('SWSE.Store.Tabs.Detail')
    };
    return {
      pageLabel: labels[currentView] || storeI18n('SWSE.Store.Tabs.Browse'),
      currentCategoryLabel,
      briefTitle: currentView === 'checkout' ? storeI18n('SWSE.Store.PageContext.SettlementWindow') : currentView === 'history' ? storeI18n('SWSE.Store.PageContext.ArchiveAccess') : storeI18n('SWSE.Store.PageContext.ListingsRouted'),
      briefBody: currentView === 'checkout'
        ? storeI18n('SWSE.Store.PageContext.CheckoutBody')
        : currentView === 'history'
          ? storeI18n('SWSE.Store.PageContext.HistoryBody')
          : storeI18n('SWSE.Store.PageContext.BrowseBody'),
      briefTags: [
        { label: storeI18n('SWSE.Store.PageContext.Category'), value: currentCategoryLabel },
        { label: storeI18n('SWSE.Store.PageContext.Inventory'), value: String(this.storeInventory?.allItems?.length || 0) },
        { label: storeI18n('SWSE.Store.PageContext.Reserve'), value: `${this.storeCurrencySymbol} ${cartRemaining}` }
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
    const vehicleCosts = item.type === 'vehicle' ? resolveVehicleStoreCosts(item) : { newCost: null, usedCost: null };
    const vehiclePricing = item.type === 'vehicle'
      ? {
          requiresCondition: true,
          newCost: vehicleCosts.newCost,
          usedCost: vehicleCosts.usedCost
        }
      : {
          requiresCondition: false,
          newCost: positiveCreditOrNull(view.finalCost),
          usedCost: null
        };

    const descriptionRecord = await resolveStoreDescription(item);
    return {
      ...view,
      price: view.finalCost,
      priceLabel: view.priceLabel,
      canPurchase: view.storePolicy?.canPurchase !== false,
      blockedReason: view.storePolicy?.blockedReason || '',
      storePolicy: view.storePolicy,
      category: item.category || item.type || '',
      subcategory: view.subcategory || item.subcategory || sys.subcategory || sys.category || '',
      subcategoryKey: view.subcategoryKey,
      navigationFamily: view.navigationFamily,
      vehicleSizeKey: view.vehicleSizeKey,
      vehicleSizeLabel: view.vehicleSizeLabel,
      vehicleChallengeLevel: view.vehicleChallengeLevel,
      vehicleChallengeBand: view.vehicleChallengeBand,
      vehicleChallengeLabel: view.vehicleChallengeLabel,
      vehiclePriceStatus: item.system?.vehiclePriceStatus || item.costStatus || '',
      vehiclePriceLabel: item.system?.vehiclePriceLabel || '',
      vehiclePriceReviewNeeded: item.system?.vehiclePriceReviewNeeded === true,
      vehiclePriceStatusLabel: vehiclePriceStatusLabel(item),
      availability: getStoreAvailabilityText(item) || (item.type === 'vehicle' ? 'Unknown' : 'Standard'),
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

    // PHASE 4: Wire suggestion engine for all items.
    // Shell-native store uses render windowing and can defer expensive scoring
    // so opening the store never blocks the character sheet.
    if (this.actor && !this._shellSkipInitialSuggestions) {
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
          const armorSugg = ArmorSuggestions.generateSuggestions(this.actor, armor, { topCount: 80, silent: true, suppressLogs: true });
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
          const weaponSugg = WeaponSuggestions.generateSuggestions(this.actor, weapons, { topCount: 80, silent: true, suppressLogs: true });
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
          const gearSugg = GearSuggestions.generateSuggestions(this.actor, gear, { topCount: 80, silent: true, suppressLogs: true });
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

      // Add category/subcategory for filtering.  The visible navigation uses
      // normalized category keys (weapons/armor/etc.) while compendium data often
      // stores labels (Weapons/Armor). Keep both forms aligned here.
      view.category = item.category || item.type || '';
      view.categoryKey = storeItemCategoryKey(item);
      view.subcategory = getStoreNavigationSubcategory(item);
      view.subcategoryKey = normalizeStoreFilterValue(view.subcategory);
      view.weaponFamily = view.categoryKey === 'weapons' ? getWeaponFamily(view.subcategory) : '';
      view.navigationFamily = getStoreNavigationFamily(item);
      view.vehicleSizeKey = view.categoryKey === 'vehicles' ? getVehicleSizeKey(item) : '';
      view.vehicleSizeLabel = view.categoryKey === 'vehicles' ? getVehicleSizeLabel(item) : '';
      view.vehicleChallengeLevel = view.categoryKey === 'vehicles' ? getVehicleChallengeLevel(item) : null;
      view.vehicleChallengeBand = view.categoryKey === 'vehicles' ? getVehicleChallengeBand(item) : '';
      view.vehicleChallengeLabel = view.vehicleChallengeBand ? getVehicleChallengeBandLabel(view.vehicleChallengeBand) : '';
      view.vehicleRoleKey = view.categoryKey === 'vehicles' ? getVehicleRoleKey(item) : '';
      view.vehicleRoleLabel = view.vehicleRoleKey ? getVehicleRoleLabel(item) : '';
      view.vehicleUniqueNamed = view.categoryKey === 'vehicles' ? item.system?.vehicleUniqueNamed === true : false;
      view.vehicleCrewGroup = view.categoryKey === 'vehicles' ? getVehicleCrewGroup(item) : '';
      view.vehicleCrewLabel = view.vehicleCrewGroup ? getVehicleCrewGroupLabel(view.vehicleCrewGroup) : '';
      view.vehiclePassengerGroup = view.categoryKey === 'vehicles' ? getVehiclePassengerGroup(item) : '';
      view.vehiclePassengerLabel = view.vehiclePassengerGroup ? getVehiclePassengerGroupLabel(view.vehiclePassengerGroup) : '';
      view.vehicleCargoGroup = view.categoryKey === 'vehicles' ? getVehicleCargoGroup(item) : '';
      view.vehicleCargoLabel = view.vehicleCargoGroup ? getVehicleCargoGroupLabel(view.vehicleCargoGroup) : '';
      view.vehicleHyperdriveKey = view.categoryKey === 'vehicles' ? getVehicleHyperdriveKey(item) : '';
      view.vehicleWeaponsKey = view.categoryKey === 'vehicles' ? getVehicleWeaponsKey(item) : '';
      view.vehicleShieldsKey = view.categoryKey === 'vehicles' ? getVehicleShieldsKey(item) : '';
      view.availability = getStoreAvailabilityText(item) || 'Standard';
      view.availabilityKey = normalizeAvailabilityText(view.availability);
      view.price = view.finalCost;
      view.canPurchase = view.storePolicy?.canPurchase !== false;
      view.blockedReason = view.storePolicy?.blockedReason || '';

      // Phase 2: Apply category/subcategory/family filtering.
      if (this.currentCategory) {
        const itemCategory = storeItemCategoryKey(item);
        const filterCategory = String(this.currentCategory).toLowerCase();
        if (itemCategory !== filterCategory) {
          continue;
        }
      }

      if (this.currentSubcategory) {
        const itemSubcategory = normalizeStoreFilterValue(getStoreNavigationSubcategory(item));
        const filterSubcategory = normalizeStoreFilterValue(this.currentSubcategory);
        if (itemSubcategory !== filterSubcategory) {
          continue;
        }
      }

      if (this.currentFamily && ['weapons', 'droids', 'vehicles'].includes(this.currentCategory)) {
        const itemFamily = getStoreNavigationFamily(item);
        if (itemFamily !== this.currentFamily) {
          continue;
        }
      }

      if (this.currentCategory === 'vehicles') {
        if (!vehicleSizeMatches(item, this.currentVehicleSize)) {
          continue;
        }
        if (!vehicleChallengeMatches(item, this.currentVehicleCl)) {
          continue;
        }
        if (this.currentVehicleRole && getVehicleRoleKey(item) !== normalizeStoreFilterValue(this.currentVehicleRole)) {
          continue;
        }
        if (!vehicleCrewMatches(item, this.currentVehicleCrew)) {
          continue;
        }
        if (!vehiclePassengerMatches(item, this.currentVehiclePassenger)) {
          continue;
        }
        if (!vehicleCargoMatches(item, this.currentVehicleCargo)) {
          continue;
        }
        if (!vehicleFeatureMatches(item, this.currentVehicleHyperdrive, getVehicleHyperdriveKey)) {
          continue;
        }
        if (!vehicleFeatureMatches(item, this.currentVehicleWeapons, getVehicleWeaponsKey)) {
          continue;
        }
        if (!vehicleFeatureMatches(item, this.currentVehicleShields, getVehicleShieldsKey)) {
          continue;
        }
      }

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


  _buildVehicleSizeOptions() {
    const seen = new Map();
    for (const item of this.storeInventory?.allItems || []) {
      if (storeItemCategoryKey(item) !== 'vehicles') continue;
      const key = getVehicleSizeKey(item);
      const label = getVehicleSizeLabel(item);
      if (key && label && !seen.has(key)) seen.set(key, label);
    }
    return [...seen.entries()]
      .map(([key, label]) => ({ key, label, active: this.currentVehicleSize === key }))
      .sort((a, b) => {
        const order = ['medium', 'large', 'huge', 'gargantuan', 'colossal', 'colossal-frigate', 'colossal-cruiser', 'colossal-station'];
        const ai = order.indexOf(a.key);
        const bi = order.indexOf(b.key);
        if (ai === -1 && bi === -1) return a.label.localeCompare(b.label);
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
  }

  _buildVehicleClOptions() {
    const counts = new Map();
    for (const item of this.storeInventory?.allItems || []) {
      if (storeItemCategoryKey(item) !== 'vehicles') continue;
      const band = getVehicleChallengeBand(item);
      if (!band) continue;
      counts.set(band, (counts.get(band) || 0) + 1);
    }
    const order = ['0-3', '4-7', '8-11', '12-15', '16-plus'];
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count, label: getVehicleChallengeBandLabel(key), active: this.currentVehicleCl === key }))
      .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  }


  _buildVehicleRoleOptions() {
    const bucketKey = normalizeStoreFilterValue(this.currentSubcategory || '');
    if (!bucketKey) return [];
    const definitions = getVehicleRoleDefinitionsForSubcategory(bucketKey);
    if (!definitions.length) return [];
    const counts = new Map(definitions.map(def => [def.key, 0]));
    for (const item of this.storeInventory?.allItems || []) {
      if (storeItemCategoryKey(item) !== 'vehicles') continue;
      if (normalizeStoreFilterValue(getStoreNavigationSubcategory(item)) !== bucketKey) continue;
      const key = getVehicleRoleKey(item);
      if (!key || !counts.has(key)) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return definitions
      .map(def => ({ ...def, count: counts.get(def.key) || 0, active: this.currentVehicleRole === def.key }))
      .filter(def => def.count > 0);
  }

  _buildVehicleCrewOptions() {
    const counts = new Map();
    for (const item of this.storeInventory?.allItems || []) {
      if (storeItemCategoryKey(item) !== 'vehicles') continue;
      const key = getVehicleCrewGroup(item);
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const order = ['automated', 'solo', 'small', 'team', 'large', 'capital', 'massive', 'unknown'];
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count, label: getVehicleCrewGroupLabel(key), active: this.currentVehicleCrew === key }))
      .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  }

  _buildVehicleCargoOptions() {
    const counts = new Map();
    for (const item of this.storeInventory?.allItems || []) {
      if (storeItemCategoryKey(item) !== 'vehicles') continue;
      const key = getVehicleCargoGroup(item);
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const order = ['none', 'personal', 'light', 'medium', 'heavy', 'bulk', 'massive', 'unknown'];
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count, label: getVehicleCargoGroupLabel(key), active: this.currentVehicleCargo === key }))
      .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  }

  _buildVehicleBooleanOptions(feature) {
    const counts = new Map();
    const getter = feature === 'hyperdrive'
      ? getVehicleHyperdriveKey
      : feature === 'weapons'
        ? getVehicleWeaponsKey
        : getVehicleShieldsKey;
    for (const item of this.storeInventory?.allItems || []) {
      if (storeItemCategoryKey(item) !== 'vehicles') continue;
      const key = getter(item);
      if (!key) continue;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    const current = feature === 'hyperdrive'
      ? this.currentVehicleHyperdrive
      : feature === 'weapons'
        ? this.currentVehicleWeapons
        : this.currentVehicleShields;
    const order = ['yes', 'no'];
    return [...counts.entries()]
      .map(([key, count]) => ({ key, count, label: getVehicleBooleanFeatureLabel(feature, key), active: current === key }))
      .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  }

  _tierToLabel(tier) {
    // Convert tier string to CSS class: ""STRONG_FIT" → "strong-fit"
    return (tier || '').toLowerCase().replace(/_/g, '-');
  }

  _tierToDisplayLabel(tier) {
    // Convert tier to display with canonical labels
    const tierMap = {
      'Perfect': storeI18n('SWSE.Store.Tier.Perfect'),
      'Excellent': storeI18n('SWSE.Store.Tier.Excellent'),
      'Good': storeI18n('SWSE.Store.Tier.Good'),
      'Viable': storeI18n('SWSE.Store.Tier.Viable'),
      'Marginal': storeI18n('SWSE.Store.Tier.Marginal'),
      'Poor': storeI18n('SWSE.Store.Tier.Poor'),
      // Legacy support
      'STRONG_FIT': storeI18n('SWSE.Store.Tier.Excellent'),
      'SITUATIONAL': storeI18n('SWSE.Store.Tier.Marginal'),
      'OUTPERFORMED': storeI18n('SWSE.Store.Tier.Poor')
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
    const armor = item?.type === 'armor' ? resolveArmorData(item) : null;
    const displaySystem = armor ? {
      ...sys,
      armorType: armor.armorType,
      reflexBonus: armor.reflexBonus,
      defenseBonus: armor.reflexBonus,
      fortitudeBonus: armor.fortitudeBonus,
      fortBonus: armor.fortitudeBonus,
      maxDexBonus: armor.maxDexBonus,
      maxDex: armor.maxDexBonus,
      armorCheckPenalty: armor.armorCheckPenalty,
      speedPenalty: armor.speedPenalty,
      shieldRating: armor.shieldRating,
      currentSR: armor.currentSR
    } : sys;
    const rarityClass = item.rarityClass || getRarityClass(sys.availability);
    const storePolicy = summarizeStorePolicy(item);
    const vehicleCosts = item.type === 'vehicle' ? resolveVehicleStoreCosts(item) : { newCost: null, usedCost: null };
    const finalCost = item.type === 'vehicle'
      ? vehicleCosts.newCost
      : (positiveCreditOrNull(item.finalCost) ?? positiveCreditOrNull(getCostValue(item)));
    const displayCost = item.type === 'vehicle' ? vehicleCosts.newCost : finalCost;

    return {
      // Engine normalizes IDs to .id (not ._id); prefer .id if available
      id: item.id ?? item._id,
      name: safeString(item.name),
      img: safeImg(item),

      // Display pricing: For template compatibility
      // Scalar items: use finalCost as cost
      // Conditional vehicles: use finalCostNew as cost, finalCostUsed as costUsed
      cost: displayCost,
      costUsed: item.type === 'vehicle' ? (vehicleCosts.usedCost ?? undefined) : undefined,

      // Legacy field for some views
      finalCost: finalCost,
      priceLabel: hasStorePrice(displayCost) ? Number(displayCost).toLocaleString() : (item.type === 'vehicle' ? (sys.vehiclePriceLabel || vehiclePriceStatusLabel(item) || '—') : '—'),
      priceOverrideApplied: item.priceOverrideApplied === true,

      rarityClass,
      rarityLabel: item.rarityLabel || getRarityLabel(rarityClass),
      system: displaySystem,
      type: item.type,
      categoryKey: storeItemCategoryKey(item),
      subcategory: getStoreNavigationSubcategory(item),
      subcategoryKey: normalizeStoreFilterValue(getStoreNavigationSubcategory(item)),
      weaponFamily: storeItemCategoryKey(item) === 'weapons' ? getWeaponFamily(getStoreNavigationSubcategory(item)) : '',
      navigationFamily: getStoreNavigationFamily(item),
      vehicleSizeKey: storeItemCategoryKey(item) === 'vehicles' ? getVehicleSizeKey(item) : '',
      vehicleSizeLabel: storeItemCategoryKey(item) === 'vehicles' ? getVehicleSizeLabel(item) : '',
      vehicleChallengeLevel: storeItemCategoryKey(item) === 'vehicles' ? getVehicleChallengeLevel(item) : null,
      vehicleChallengeBand: storeItemCategoryKey(item) === 'vehicles' ? getVehicleChallengeBand(item) : '',
      vehicleChallengeLabel: storeItemCategoryKey(item) === 'vehicles' ? getVehicleChallengeBandLabel(getVehicleChallengeBand(item)) : '',
      vehiclePriceStatus: storeItemCategoryKey(item) === 'vehicles' ? (sys.vehiclePriceStatus || item.costStatus || '') : '',
      vehiclePriceLabel: storeItemCategoryKey(item) === 'vehicles' ? (sys.vehiclePriceLabel || '') : '',
      vehiclePriceReviewNeeded: storeItemCategoryKey(item) === 'vehicles' ? sys.vehiclePriceReviewNeeded === true : false,
      vehiclePriceStatusLabel: storeItemCategoryKey(item) === 'vehicles' ? vehiclePriceStatusLabel(item) : '',
      vehicleRoleKey: storeItemCategoryKey(item) === 'vehicles' ? getVehicleRoleKey(item) : '',
      vehicleRoleLabel: storeItemCategoryKey(item) === 'vehicles' ? getVehicleRoleLabel(item) : '',
      vehicleUniqueNamed: storeItemCategoryKey(item) === 'vehicles' ? item.system?.vehicleUniqueNamed === true : false,
      vehicleCrewGroup: storeItemCategoryKey(item) === 'vehicles' ? getVehicleCrewGroup(item) : '',
      vehicleCrewLabel: storeItemCategoryKey(item) === 'vehicles' ? getVehicleCrewGroupLabel(getVehicleCrewGroup(item)) : '',
      vehiclePassengerGroup: storeItemCategoryKey(item) === 'vehicles' ? getVehiclePassengerGroup(item) : '',
      vehiclePassengerLabel: storeItemCategoryKey(item) === 'vehicles' ? getVehiclePassengerGroupLabel(getVehiclePassengerGroup(item)) : '',
      vehicleCargoGroup: storeItemCategoryKey(item) === 'vehicles' ? getVehicleCargoGroup(item) : '',
      vehicleCargoLabel: storeItemCategoryKey(item) === 'vehicles' ? getVehicleCargoGroupLabel(getVehicleCargoGroup(item)) : '',
      vehicleHyperdriveKey: storeItemCategoryKey(item) === 'vehicles' ? getVehicleHyperdriveKey(item) : '',
      vehicleWeaponsKey: storeItemCategoryKey(item) === 'vehicles' ? getVehicleWeaponsKey(item) : '',
      vehicleShieldsKey: storeItemCategoryKey(item) === 'vehicles' ? getVehicleShieldsKey(item) : '',
      availability: getStoreAvailabilityText(item) || 'Standard',
      availabilityKey: normalizeAvailabilityText(getStoreAvailabilityText(item) || 'Standard'),
      typeLabel: this._getItemTypeLabel(item.type),
      storePolicy
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
    const vehicleSizeFilter = root.querySelector('#store-vehicle-size-filter');
    const vehicleClFilter = root.querySelector('#store-vehicle-cl-filter');
    const vehicleRoleFilter = root.querySelector('#store-vehicle-role-filter');
    const vehicleCrewFilter = root.querySelector('#store-vehicle-crew-filter');
    const vehiclePassengerFilter = root.querySelector('#store-vehicle-passenger-filter');
    const vehicleCargoFilter = root.querySelector('#store-vehicle-cargo-filter');
    const vehicleHyperdriveFilter = root.querySelector('#store-vehicle-hyperdrive-filter');
    const vehicleWeaponsFilter = root.querySelector('#store-vehicle-weapons-filter');
    const vehicleShieldsFilter = root.querySelector('#store-vehicle-shields-filter');

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
    if (vehicleSizeFilter) {
      vehicleSizeFilter.addEventListener('change', () => {
        this.currentVehicleSize = vehicleSizeFilter.value || null;
        this.currentPage = 1;
        updateGrid();
      }, { signal });
    }
    if (vehicleClFilter) {
      vehicleClFilter.addEventListener('change', () => {
        this.currentVehicleCl = vehicleClFilter.value || null;
        this.currentPage = 1;
        updateGrid();
      }, { signal });
    }
    if (vehicleRoleFilter) {
      vehicleRoleFilter.addEventListener('change', () => {
        this.currentVehicleRole = vehicleRoleFilter.value || null;
        this.currentPage = 1;
        updateGrid();
      }, { signal });
    }
    if (vehicleCrewFilter) {
      vehicleCrewFilter.addEventListener('change', () => {
        this.currentVehicleCrew = vehicleCrewFilter.value || null;
        this.currentPage = 1;
        updateGrid();
      }, { signal });
    }
    if (vehiclePassengerFilter) {
      vehiclePassengerFilter.addEventListener('change', () => {
        this.currentVehiclePassenger = vehiclePassengerFilter.value || null;
        this.currentPage = 1;
        updateGrid();
      }, { signal });
    }
    if (vehicleCargoFilter) {
      vehicleCargoFilter.addEventListener('change', () => {
        this.currentVehicleCargo = vehicleCargoFilter.value || null;
        this.currentPage = 1;
        updateGrid();
      }, { signal });
    }
    if (vehicleHyperdriveFilter) {
      vehicleHyperdriveFilter.addEventListener('change', () => {
        this.currentVehicleHyperdrive = vehicleHyperdriveFilter.value || null;
        this.currentPage = 1;
        updateGrid();
      }, { signal });
    }
    if (vehicleWeaponsFilter) {
      vehicleWeaponsFilter.addEventListener('change', () => {
        this.currentVehicleWeapons = vehicleWeaponsFilter.value || null;
        this.currentPage = 1;
        updateGrid();
      }, { signal });
    }
    if (vehicleShieldsFilter) {
      vehicleShieldsFilter.addEventListener('change', () => {
        this.currentVehicleShields = vehicleShieldsFilter.value || null;
        this.currentPage = 1;
        updateGrid();
      }, { signal });
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
        this.currentSubcategory = null;
        this.currentFamily = null;
        this.currentVehicleSize = null;
        this.currentVehicleCl = null;
        this.currentVehicleRole = null;
        this.currentVehicleCrew = null;
        this.currentVehiclePassenger = null;
        this.currentVehicleCargo = null;
        this.currentVehicleHyperdrive = null;
        this.currentVehicleWeapons = null;
        this.currentVehicleShields = null;
        this.currentPage = 1;
        this.currentView = 'browse';
        this.render();
      }, { signal });
    });

    root.querySelectorAll('[data-action="family-nav"]').forEach(btn => {
      btn.addEventListener('click', ev => {
        this.currentFamily = ev.currentTarget?.dataset?.family || null;
        this.currentSubcategory = null;
        this.currentVehicleRole = null;
        this.currentPage = 1;
        this.currentView = 'browse';
        this.render();
      }, { signal });
    });

    root.querySelectorAll('[data-action="subcategory-nav"]').forEach(btn => {
      btn.addEventListener('click', ev => {
        this.currentSubcategory = ev.currentTarget?.dataset?.subcategory || null;
        this.currentFamily = ev.currentTarget?.dataset?.family || null;
        this.currentVehicleRole = null;
        this.currentPage = 1;
        this.currentView = 'browse';
        this.render();
      }, { signal });
    });
    root.querySelectorAll('[data-action="clear-filters"]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentCategory = 'weapons';
        this.currentSubcategory = null;
        this.currentFamily = null;
        this.currentVehicleSize = null;
        this.currentVehicleCl = null;
        this.currentVehicleRole = null;
        this.currentVehicleCrew = null;
        this.currentVehiclePassenger = null;
        this.currentVehicleCargo = null;
        this.currentVehicleHyperdrive = null;
        this.currentVehicleWeapons = null;
        this.currentVehicleShields = null;
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
        const item = this.itemsById.get(this.selectedProductId);
        const policyCheck = isStoreItemPurchasable(item);
        if (!policyCheck.ok) {
          ui.notifications.warn(policyCheck.reason || storeI18n('SWSE.Store.Notifications.ListingCannotPurchase'));
          return;
        }
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
            cost: item.type === 'vehicle' ? (resolveVehicleStoreCosts(item).newCost ?? Number.MAX_SAFE_INTEGER) : (Number(item.finalCost ?? Number.MAX_SAFE_INTEGER) || Number.MAX_SAFE_INTEGER),
            savedAt: Date.now()
          });
          await this.actor.setFlag('foundryvtt-swse', 'storeSavedForLater', current);
        }
        ui.notifications.info(storeI18n('SWSE.Store.Notifications.SavedForLater', { name: item.name }));
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
        const item = this.itemsById.get(id);
        const policyCheck = isStoreItemPurchasable(item);
        if (!policyCheck.ok) {
          ui.notifications.warn(policyCheck.reason || storeI18n('SWSE.Store.Notifications.ListingCannotPurchase'));
          return;
        }
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
    const vehicleSizeFilter = root.querySelector('#store-vehicle-size-filter')?.value || this.currentVehicleSize || '';
    const vehicleClFilter = root.querySelector('#store-vehicle-cl-filter')?.value || this.currentVehicleCl || '';
    const vehicleRoleFilter = root.querySelector('#store-vehicle-role-filter')?.value || this.currentVehicleRole || '';
    const vehicleCrewFilter = root.querySelector('#store-vehicle-crew-filter')?.value || this.currentVehicleCrew || '';
    const vehiclePassengerFilter = root.querySelector('#store-vehicle-passenger-filter')?.value || this.currentVehiclePassenger || '';
    const vehicleCargoFilter = root.querySelector('#store-vehicle-cargo-filter')?.value || this.currentVehicleCargo || '';
    const vehicleHyperdriveFilter = root.querySelector('#store-vehicle-hyperdrive-filter')?.value || this.currentVehicleHyperdrive || '';
    const vehicleWeaponsFilter = root.querySelector('#store-vehicle-weapons-filter')?.value || this.currentVehicleWeapons || '';
    const vehicleShieldsFilter = root.querySelector('#store-vehicle-shields-filter')?.value || this.currentVehicleShields || '';

    const cards = grid.querySelectorAll('.product-card');
    let visibleCards = [];

    // Filter cards
    cards.forEach(card => {
      const itemId = card.dataset.itemId;
      const item = this.itemsById.get(itemId);
      if (!item) return;

      const name = (item.name || '').toLowerCase();
      const desc = (item.system?.description || '').toString().toLowerCase();
      const cardCategory = (card.dataset.categoryKey || card.dataset.category || '').toLowerCase();
      const cardSubcategory = normalizeStoreFilterValue(card.dataset.subcategory || '');
      const cardFamily = card.dataset.family || '';
      const cardSize = normalizeStoreFilterValue(card.dataset.vehicleSize || '');
      const cardCl = normalizeStoreFilterValue(card.dataset.vehicleCl || '');
      const cardRole = normalizeStoreFilterValue(card.dataset.vehicleRole || '');
      const cardCrew = normalizeStoreFilterValue(card.dataset.vehicleCrew || '');
      const cardPassenger = normalizeStoreFilterValue(card.dataset.vehiclePassenger || '');
      const cardCargo = normalizeStoreFilterValue(card.dataset.vehicleCargo || '');
      const cardHyperdrive = normalizeStoreFilterValue(card.dataset.vehicleHyperdrive || '');
      const cardWeapons = normalizeStoreFilterValue(card.dataset.vehicleWeapons || '');
      const cardShields = normalizeStoreFilterValue(card.dataset.vehicleShields || '');

      const matchesSearch = !searchTerm || name.includes(searchTerm) || desc.includes(searchTerm);
      const matchesCategory = !categoryFilter || cardCategory === String(categoryFilter).toLowerCase();
      const matchesSubcategory = !this.currentSubcategory || cardSubcategory === normalizeStoreFilterValue(this.currentSubcategory);
      const matchesFamily = !(['weapons', 'droids', 'vehicles'].includes(this.currentCategory) && this.currentFamily) || cardFamily === this.currentFamily;
      const matchesAvailability = availabilityMatches(item, availabilityFilter);
      const matchesVehicleSize = !(this.currentCategory === 'vehicles' && vehicleSizeFilter) || cardSize === normalizeStoreFilterValue(vehicleSizeFilter);
      const matchesVehicleCl = !(this.currentCategory === 'vehicles' && vehicleClFilter) || cardCl === normalizeStoreFilterValue(vehicleClFilter);
      const matchesVehicleRole = !(this.currentCategory === 'vehicles' && vehicleRoleFilter) || cardRole === normalizeStoreFilterValue(vehicleRoleFilter);
      const matchesVehicleCrew = !(this.currentCategory === 'vehicles' && vehicleCrewFilter) || cardCrew === normalizeStoreFilterValue(vehicleCrewFilter);
      const matchesVehiclePassenger = !(this.currentCategory === 'vehicles' && vehiclePassengerFilter) || cardPassenger === normalizeStoreFilterValue(vehiclePassengerFilter);
      const matchesVehicleCargo = !(this.currentCategory === 'vehicles' && vehicleCargoFilter) || cardCargo === normalizeStoreFilterValue(vehicleCargoFilter);
      const matchesVehicleHyperdrive = !(this.currentCategory === 'vehicles' && vehicleHyperdriveFilter) || cardHyperdrive === normalizeStoreFilterValue(vehicleHyperdriveFilter);
      const matchesVehicleWeapons = !(this.currentCategory === 'vehicles' && vehicleWeaponsFilter) || cardWeapons === normalizeStoreFilterValue(vehicleWeaponsFilter);
      const matchesVehicleShields = !(this.currentCategory === 'vehicles' && vehicleShieldsFilter) || cardShields === normalizeStoreFilterValue(vehicleShieldsFilter);

      if (matchesSearch && matchesCategory && matchesSubcategory && matchesFamily && matchesAvailability && matchesVehicleSize && matchesVehicleCl && matchesVehicleRole && matchesVehicleCrew && matchesVehiclePassenger && matchesVehicleCargo && matchesVehicleHyperdrive && matchesVehicleWeapons && matchesVehicleShields) {
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
    root.querySelectorAll('[data-action="subcategory-nav"]').forEach(btn => {
      const sub = btn.dataset.subcategory || '';
      const isActive = normalizeStoreFilterValue(sub) === normalizeStoreFilterValue(this.currentSubcategory || '');
      btn.classList.toggle('is-active', isActive);
      btn.classList.toggle('active', isActive);
    });

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
      <button id="prev-page-btn" class="pagination-btn" ${currentPage <= 1 ? 'disabled' : ''}>← ${storeI18n('SWSE.Store.Pagination.Previous')}</button>
      <span id="page-info" style="font-size: 0.9em; color: #888;">${storeI18n('SWSE.Store.Pagination.PageOf', { current: currentPage, total: totalPages })}</span>
      <button id="next-page-btn" class="pagination-btn" ${currentPage >= totalPages ? 'disabled' : ''}>${storeI18n('SWSE.Store.Pagination.Next')} →</button>
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
    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const add = (label, value) => {
      if (value === undefined || value === null || value === '') return;
      details.push(`<div class="ss-tech-row"><span class="ss-tech-label">${escapeHtml(label)}:</span><span class="ss-tech-value">${escapeHtml(value)}</span></div>`);
    };

    if (itemType === 'armor') {
      const armor = resolveArmorData(item);
      add(storeI18n('SWSE.Store.Technical.Type'), armor.armorTypeLabel || item.subcategory || storeI18n('SWSE.Store.Technical.Armor'));
      add(storeI18n('SWSE.Store.Technical.ReflexBonus'), armor.reflexBonus !== undefined && armor.reflexBonus !== null ? `+${armor.reflexBonus}` : '');
      add(storeI18n('SWSE.Store.Technical.FortitudeBonus'), armor.fortitudeBonus !== undefined && armor.fortitudeBonus !== null ? `+${armor.fortitudeBonus}` : '');
      if (armor.isEnergyShield) {
        add(storeI18n('SWSE.Store.Technical.ShieldRating'), armor.shieldRating ? `SR ${armor.shieldRating}` : storeI18n('SWSE.Store.Technical.Dash'));
        add(storeI18n('SWSE.Store.Technical.CurrentSR'), armor.currentSR ?? 0);
        add(storeI18n('SWSE.Store.Technical.Charges'), `${armor.chargesCurrent}/${armor.chargesMax}`);
      }
      add(storeI18n('SWSE.Store.Technical.MaxDex'), armor.maxDexLabel ?? storeI18n('SWSE.Store.Technical.Uncapped'));
      add(storeI18n('SWSE.Store.Technical.ArmorCheck'), armor.armorCheckPenalty);
      add(storeI18n('SWSE.Store.Technical.SpeedPenalty'), armor.speedPenalty);
      add(storeI18n('SWSE.Store.Technical.Weight'), sys.weight);
      add(storeI18n('SWSE.Store.Technical.Source'), sys.sourcebook);
    }

    if (itemType === 'weapon') {
      add(storeI18n('SWSE.Store.Technical.Category'), item.subcategory || sys.category || sys.weaponCategory);
      add(storeI18n('SWSE.Store.Technical.Damage'), sys.damage);
      add(storeI18n('SWSE.Store.Technical.DamageType'), sys.damageType);
      add(storeI18n('SWSE.Store.Technical.Range'), sys.range);
      add(storeI18n('SWSE.Store.Technical.Proficiency'), sys.proficiency);
      add(storeI18n('SWSE.Store.Technical.Size'), sys.size);
      add(storeI18n('SWSE.Store.Technical.Weight'), sys.weight);
      add(storeI18n('SWSE.Store.Technical.Properties'), Array.isArray(sys.properties) ? sys.properties.join(', ') : sys.properties);
      add(storeI18n('SWSE.Store.Technical.Source'), sys.sourcebook);
    }

    if (itemType === 'equipment') {
      add(storeI18n('SWSE.Store.Technical.Class'), item.subcategory || (Array.isArray(sys.tags) ? sys.tags.join(', ') : sys.category));
      add(storeI18n('SWSE.Store.Technical.Size'), sys.size);
      add(storeI18n('SWSE.Store.Technical.Weight'), sys.weight);
      add(storeI18n('SWSE.Store.Technical.Quantity'), sys.quantity);
      add(storeI18n('SWSE.Store.Technical.Source'), sys.sourcebook);
    }

    if (itemType === 'droid') {
      add(storeI18n('SWSE.Store.Technical.Class'), item.subcategory || normalizeDroidSubcategory(item));
      add(storeI18n('SWSE.Store.Technical.Degree'), sys.degree);
      add(storeI18n('SWSE.Store.Technical.Size'), sys.size);
      add(storeI18n('SWSE.Store.Technical.HitPoints'), sys.HP);
      add(storeI18n('SWSE.Store.Technical.DamageThreshold'), sys.damageThreshold);
      add(storeI18n('SWSE.Store.Technical.Reflex'), sys.reflexDefense);
      add(storeI18n('SWSE.Store.Technical.Fortitude'), sys.fortitudeDefense);
      add(storeI18n('SWSE.Store.Technical.Will'), sys.willDefense);
      add(storeI18n('SWSE.Store.Technical.Speed'), sys.speed || item.flags?.swse?.speedText || item.doc?.flags?.swse?.speedText);
      add(storeI18n('SWSE.Store.Technical.Perception'), sys.perception);
      const melee = Array.isArray(sys.attacks?.melee) ? sys.attacks.melee.map(a => `${a.name} ${a.damage ? `(${a.damage})` : ''}`.trim()).join(', ') : '';
      const ranged = Array.isArray(sys.attacks?.ranged) ? sys.attacks.ranged.map(a => `${a.name} ${a.damage ? `(${a.damage})` : ''}`.trim()).join(', ') : '';
      add(storeI18n('SWSE.Store.Technical.Melee'), melee);
      add(storeI18n('SWSE.Store.Technical.Ranged'), ranged);
    }

    if (itemType === 'vehicle') {
      add(storeI18n('SWSE.Store.Technical.Class'), item.subcategory || normalizeVehicleSubcategory(item));
      add(storeI18n('SWSE.Store.Technical.Type'), sys.type || sys.category);
      add('Challenge Level', getVehicleChallengeLevel(item) !== null ? `CL ${getVehicleChallengeLevel(item)}` : '');
      add('Crew Class', getVehicleCrewGroupLabel(getVehicleCrewGroup(item)));
      add('Cargo Class', getVehicleCargoGroupLabel(getVehicleCargoGroup(item)));
      add('Hyperdrive', getVehicleBooleanFeatureLabel('hyperdrive', getVehicleHyperdriveKey(item)));
      add('Armament', getVehicleBooleanFeatureLabel('weapons', getVehicleWeaponsKey(item)));
      add('Shielding', getVehicleBooleanFeatureLabel('shields', getVehicleShieldsKey(item)));
      add(storeI18n('SWSE.Store.Technical.Size'), sys.size);
      add(storeI18n('SWSE.Store.Technical.Hull'), sys.hull?.max ?? sys.hull?.value ?? sys.hull);
      add(storeI18n('SWSE.Store.Technical.Shields'), sys.shields?.max ?? sys.shields?.value ?? sys.shields);
      add(storeI18n('SWSE.Store.Technical.DamageReduction'), sys.damageReduction);
      add(storeI18n('SWSE.Store.Technical.DamageThreshold'), sys.damageThreshold);
      add(storeI18n('SWSE.Store.Technical.Reflex'), sys.reflexDefense);
      add(storeI18n('SWSE.Store.Technical.Fortitude'), sys.fortitudeDefense);
      add('Speed', sys.speed || sys.maxVelocity);
      add(storeI18n('SWSE.Store.Technical.Maneuver'), sys.maneuver);
      add(storeI18n('SWSE.Store.Technical.Crew'), sys.crew);
      add(storeI18n('SWSE.Store.Technical.Passengers'), sys.passengers);
      add(storeI18n('SWSE.Store.Technical.Cargo'), sys.cargo);
      add(storeI18n('SWSE.Store.Technical.Consumables'), sys.consumables);
      add(storeI18n('SWSE.Store.Technical.Hyperdrive'), sys.hyperdrive_class);
      if (Array.isArray(sys.weapons) && sys.weapons.length) {
        add(storeI18n('SWSE.Store.Technical.Weapons'), sys.weapons.map(w => `${w.name}${w.damage ? ` (${w.damage})` : ''}`).join(', '));
      }
    }

    add(storeI18n('SWSE.Store.Technical.Availability'), sys.availability);
      add('Price Status', sys.vehiclePriceStatus === 'review' ? 'Needs source review' : sys.vehiclePriceStatus);
      add('Availability Status', sys.vehicleAvailabilityStatus === 'missing-source-data' ? 'Missing source data' : sys.vehicleAvailabilityStatus);

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
      SWSELogger.debug('[SWSE Store] Review thread assembly unavailable', thread);
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
    const credits = LedgerService.getCurrentCredits(this.actor);
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
