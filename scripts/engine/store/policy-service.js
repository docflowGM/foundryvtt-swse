/**
 * scripts/engine/store/policy-service.js
 *
 * GM store policy layer.
 *
 * The store index remains sourced from compendiums/world documents. GM controls
 * live in settings and are applied as a runtime overlay so hiding, stocking, or
 * repricing an item never mutates the source document.
 */

import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

export const STORE_AVAILABILITY_DEFAULTS = Object.freeze({
  standard: true,
  licensed: true,
  rare: false,
  restricted: false,
  military: false,
  illegal: false,
  common: true,
  uncommon: true
});

export const STORE_TYPE_DEFAULTS = Object.freeze({
  weapons: true,
  armor: true,
  gear: true,
  droids: true,
  vehicles: true
});

export const STORE_CATEGORY_MARKUP_DEFAULTS = Object.freeze({
  weapons: 0,
  armor: 0,
  gear: 0,
  droids: 10,
  vehicles: 15,
  restricted: 10,
  military: 20,
  illegal: 25
});

function asObject(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

function asNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const numeric = normalizeCredits(value);
  return Number.isFinite(numeric) ? Math.max(0, numeric) : null;
}

function asMarkupNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(-100, Math.min(500, numeric)) : fallback;
}

function applyPercent(value, percent = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value;
  const markup = asMarkupNumber(percent, 0);
  if (!markup) return numeric;
  return Math.max(0, Math.round(numeric * (1 + markup / 100)));
}

function itemId(item = {}) {
  return item.id ?? item._id ?? item.doc?.id ?? item.doc?._id ?? null;
}

export function getStoreTypeKey(item = {}) {
  const type = String(item.type || '').toLowerCase();
  if (type === 'weapon') return 'weapons';
  if (type === 'armor') return 'armor';
  if (type === 'droid') return 'droids';
  if (type === 'vehicle') return 'vehicles';
  return 'gear';
}

export function getStoreAvailabilityKey(item = {}) {
  const direct = String(item.rarityClass || item.availability || item.system?.availability || '').toLowerCase();
  if (direct.includes('illegal')) return 'illegal';
  if (direct.includes('military')) return 'military';
  if (direct.includes('restricted')) return 'restricted';
  if (direct.includes('licensed')) return 'licensed';
  if (direct.includes('rare')) return 'rare';
  if (direct.includes('uncommon')) return 'uncommon';
  if (direct.includes('common')) return 'common';
  return 'standard';
}

export function getStorePolicySettings() {
  return {
    visibleRarities: {
      ...STORE_AVAILABILITY_DEFAULTS,
      ...SettingsHelper.getObject('visibleRarities', STORE_AVAILABILITY_DEFAULTS)
    },
    visibleTypes: {
      ...STORE_TYPE_DEFAULTS,
      ...SettingsHelper.getObject('visibleItemTypes', STORE_TYPE_DEFAULTS)
    },
    blacklistedItems: SettingsHelper.getArray('blacklistedItems', []),
    inventoryPolicies: SettingsHelper.getObject('storeInventoryPolicies', {}),
    categoryMarkups: {
      ...STORE_CATEGORY_MARKUP_DEFAULTS,
      ...SettingsHelper.getObject('storeCategoryMarkups', STORE_CATEGORY_MARKUP_DEFAULTS)
    }
  };
}

export function getStoreCategoryMarkupForItem(item = {}, settings = getStorePolicySettings()) {
  const typeKey = getStoreTypeKey(item);
  const availabilityKey = getStoreAvailabilityKey(item);
  const markups = asObject(settings.categoryMarkups, STORE_CATEGORY_MARKUP_DEFAULTS);
  const typeMarkup = asMarkupNumber(markups[typeKey], STORE_CATEGORY_MARKUP_DEFAULTS[typeKey] ?? 0);
  const availabilityMarkup = asMarkupNumber(markups[availabilityKey], STORE_CATEGORY_MARKUP_DEFAULTS[availabilityKey] ?? 0);
  return {
    typeKey,
    availabilityKey,
    typeMarkup,
    availabilityMarkup,
    totalMarkup: typeMarkup + availabilityMarkup
  };
}

export function getRawStorePolicyForItem(item = {}, settings = getStorePolicySettings()) {
  const id = itemId(item);
  const policy = id ? asObject(settings.inventoryPolicies?.[id], {}) : {};
  const blacklisted = id ? settings.blacklistedItems?.includes?.(id) === true : false;

  return {
    visible: policy.visible !== undefined ? policy.visible === true : !blacklisted,
    available: policy.available !== undefined ? policy.available === true : true,
    trackQuantity: policy.trackQuantity === true,
    quantity: asNumberOrNull(policy.quantity),
    requiresApproval: policy.requiresApproval === true,
    overridePrice: asNumberOrNull(policy.overridePrice),
    notes: String(policy.notes ?? ''),
    updatedAt: policy.updatedAt ?? null,
    updatedBy: policy.updatedBy ?? null
  };
}

export function buildEffectiveStorePolicy(item = {}, settings = getStorePolicySettings()) {
  const id = itemId(item);
  const raw = getRawStorePolicyForItem(item, settings);
  const typeKey = getStoreTypeKey(item);
  const availabilityKey = getStoreAvailabilityKey(item);

  const visibleByType = settings.visibleTypes?.[typeKey] !== false;
  const visibleByAvailability = settings.visibleRarities?.[availabilityKey] !== false;
  const visible = raw.visible === true && visibleByType && visibleByAvailability;

  const quantity = raw.trackQuantity ? raw.quantity : null;
  const outOfStock = raw.trackQuantity === true && Number.isFinite(quantity) && quantity <= 0;

  let blockedReason = null;
  if (!raw.available) blockedReason = 'Unavailable by GM policy';
  if (!blockedReason && outOfStock) blockedReason = 'Out of stock';
  if (!blockedReason && raw.requiresApproval) blockedReason = 'Requires GM approval';

  const markup = getStoreCategoryMarkupForItem(item, settings);

  return {
    id,
    visible,
    visibleByType,
    visibleByAvailability,
    typeKey,
    availabilityKey,
    available: raw.available === true,
    trackQuantity: raw.trackQuantity === true,
    quantity,
    outOfStock,
    requiresApproval: raw.requiresApproval === true,
    overridePrice: raw.overridePrice,
    priceOverrideApplied: raw.overridePrice !== null,
    categoryMarkup: markup.totalMarkup,
    categoryMarkupBreakdown: markup,
    notes: raw.notes,
    canPurchase: visible && raw.available === true && !outOfStock && raw.requiresApproval !== true,
    blockedReason
  };
}

export function applyStorePolicyToItem(item = {}, settings = getStorePolicySettings()) {
  const policy = buildEffectiveStorePolicy(item, settings);

  item.storePolicy = policy;
  item.isStoreVisible = policy.visible;
  item.isStoreAvailable = policy.available && !policy.outOfStock;
  item.requiresStoreApproval = policy.requiresApproval;
  item.storeBlockedReason = policy.blockedReason;
  item.stockQuantity = policy.quantity;

  if (policy.priceOverrideApplied) {
    item.priceOverrideApplied = true;
    item.priceOverride = policy.overridePrice;

    // Scalar listings and conditional listings both need a direct sale price in
    // the player store. Keep all final-cost fields aligned so legacy views,
    // card views, cart validation, and vehicle paths read the same override.
    item.finalCost = policy.overridePrice;
    if (item.finalCostNew !== null && item.finalCostNew !== undefined) item.finalCostNew = policy.overridePrice;
    if (item.finalCostUsed !== null && item.finalCostUsed !== undefined) item.finalCostUsed = policy.overridePrice;
  } else if (policy.categoryMarkup && item.storeCategoryMarkupApplied !== true) {
    item.storeCategoryMarkupApplied = true;
    item.storeCategoryMarkupPercent = policy.categoryMarkup;
    item.storeCategoryMarkupBreakdown = policy.categoryMarkupBreakdown;

    if (item.finalCost !== null && item.finalCost !== undefined) item.finalCost = applyPercent(item.finalCost, policy.categoryMarkup);
    if (item.finalCostNew !== null && item.finalCostNew !== undefined) item.finalCostNew = applyPercent(item.finalCostNew, policy.categoryMarkup);
    if (item.finalCostUsed !== null && item.finalCostUsed !== undefined) item.finalCostUsed = applyPercent(item.finalCostUsed, policy.categoryMarkup);
  }

  return item;
}

function rebuildIndexMaps(index) {
  index.byId = new Map();
  index.byType = new Map();
  index.byCategory = new Map();

  for (const item of index.allItems || []) {
    index.byId.set(item.id, item);

    if (!index.byType.has(item.type)) index.byType.set(item.type, []);
    index.byType.get(item.type).push(item);

    const cat = item.category || 'Other';
    const sub = item.subcategory || 'Misc';
    if (!index.byCategory.has(cat)) index.byCategory.set(cat, new Map());
    const subMap = index.byCategory.get(cat);
    if (!subMap.has(sub)) subMap.set(sub, []);
    subMap.get(sub).push(item);
  }
}

export function applyStorePoliciesToIndex(index, options = {}) {
  if (!index?.allItems) return index;

  const { includeHidden = false } = options;
  const settings = getStorePolicySettings();
  const before = index.allItems.length;

  index.allItems = index.allItems
    .map((item) => applyStorePolicyToItem(item, settings))
    .filter((item) => includeHidden || item.storePolicy?.visible === true);

  rebuildIndexMaps(index);

  index.metadata = {
    ...(index.metadata || {}),
    policiesApplied: true,
    policyCounts: {
      before,
      after: index.allItems.length,
      hidden: Math.max(0, before - index.allItems.length),
      unavailable: index.allItems.filter((item) => item.storePolicy?.canPurchase === false).length,
      priceOverrides: index.allItems.filter((item) => item.storePolicy?.priceOverrideApplied === true).length
    }
  };

  SWSELogger.debug?.('StorePolicyService: policies applied', index.metadata.policyCounts);
  return index;
}

export function isStoreItemPurchasable(item = {}, options = {}) {
  if (!item) return { ok: false, reason: 'Item not found' };

  const { allowApprovalRequired = false } = options || {};
  const policy = item.storePolicy || buildEffectiveStorePolicy(item);
  if (!policy.visible) return { ok: false, reason: 'This listing is hidden by GM policy.' };
  if (!policy.available) return { ok: false, reason: 'This listing is currently unavailable.' };
  if (policy.outOfStock) return { ok: false, reason: 'This listing is out of stock.' };
  if (policy.requiresApproval && !allowApprovalRequired) return { ok: false, reason: 'This listing requires GM approval.' };

  return {
    ok: true,
    reason: null,
    requiresApproval: policy.requiresApproval === true,
    policy
  };
}

export function summarizeStorePolicy(item = {}) {
  const policy = item.storePolicy || buildEffectiveStorePolicy(item);
  return {
    ...policy,
    statusLabel: policy.canPurchase ? 'Available' : (policy.blockedReason || 'Unavailable'),
    quantityLabel: policy.trackQuantity
      ? `${Number(policy.quantity ?? 0).toLocaleString()} in stock`
      : 'Unlimited stock',
    priceOverrideLabel: policy.priceOverrideApplied
      ? `${Number(policy.overridePrice ?? 0).toLocaleString()} cr`
      : ''
  };
}

export async function restoreInventoryPolicyQuantities(items = []) {
  const counts = new Map();

  const add = (entry) => {
    const id = entry?.id || entry?.itemId || entry?.policyId;
    if (!id) return;
    const quantity = Math.max(1, normalizeCredits(entry?.quantity ?? entry?.count ?? 1));
    counts.set(id, (counts.get(id) || 0) + quantity);
  };

  if (Array.isArray(items)) {
    for (const entry of items) add(entry);
  } else if (items && typeof items === 'object') {
    for (const collection of [items.items, items.droids, items.vehicles]) {
      for (const entry of collection || []) add(entry);
    }
  }

  if (counts.size === 0) return { updated: 0 };

  const policies = SettingsHelper.getObject('storeInventoryPolicies', {});
  let updated = 0;

  for (const [id, count] of counts.entries()) {
    const policy = asObject(policies[id], {});
    if (policy.trackQuantity !== true) continue;

    const current = asNumberOrNull(policy.quantity);
    if (current === null) continue;

    policy.quantity = Math.max(0, current + count);
    policy.updatedAt = Date.now();
    policy.updatedBy = game.user?.id || null;
    policies[id] = policy;
    updated += 1;
  }

  if (updated > 0) {
    await SettingsHelper.set('storeInventoryPolicies', policies);
  }

  return { updated };
}

export async function consumeInventoryPolicyQuantities(cart = {}) {
  const counts = new Map();
  const add = (entry) => {
    const id = entry?.id || entry?.itemId || entry?._id || entry?.policyId;
    if (!id) return;
    const quantity = Math.max(1, normalizeCredits(entry?.quantity ?? entry?.count ?? 1));
    counts.set(id, (counts.get(id) || 0) + quantity);
  };

  if (Array.isArray(cart)) {
    for (const entry of cart) add(entry);
  } else {
    for (const item of cart.items || []) add(item);
    for (const droid of cart.droids || []) add(droid);
    for (const vehicle of cart.vehicles || []) add(vehicle);
  }

  if (counts.size === 0) return { ok: true, updated: 0, consumed: [] };

  const policies = SettingsHelper.getObject('storeInventoryPolicies', {});
  const consumed = [];

  // Validate the full stock plan before mutating settings. This keeps checkout
  // fail-closed: if any finite-stock item cannot be decremented, nothing is
  // consumed and the actor transaction is never attempted.
  for (const [id, count] of counts.entries()) {
    const policy = asObject(policies[id], {});
    if (policy.trackQuantity !== true) continue;

    const current = asNumberOrNull(policy.quantity);
    if (current === null) continue;
    if (current < count) {
      return {
        ok: false,
        updated: 0,
        consumed: [],
        error: `Insufficient stock for ${id} (have ${current}, need ${count}).`
      };
    }

    consumed.push({ id, quantity: count, before: current, after: current - count });
  }

  if (!consumed.length) return { ok: true, updated: 0, consumed: [] };

  for (const entry of consumed) {
    const policy = asObject(policies[entry.id], {});
    policy.quantity = entry.after;
    policy.updatedAt = Date.now();
    policy.updatedBy = game.user?.id || null;
    policies[entry.id] = policy;
  }

  await SettingsHelper.set('storeInventoryPolicies', policies);
  return { ok: true, updated: consumed.length, consumed };
}
