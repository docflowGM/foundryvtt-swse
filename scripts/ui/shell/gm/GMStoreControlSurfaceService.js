/** GM store governance surface view-model. */

import { SettingsHelper } from '/systems/foundryvtt-swse/scripts/utils/settings-helper.js';
import { StoreEngine } from '/systems/foundryvtt-swse/scripts/engine/store/store-engine.js';

const AVAILABILITY_DEFAULTS = {
  standard: true,
  licensed: true,
  rare: false,
  restricted: false,
  military: false,
  illegal: false,
  common: true,
  uncommon: true
};

const TYPE_DEFAULTS = {
  weapons: true,
  armor: true,
  gear: true,
  droids: true,
  vehicles: true
};

const TYPE_LABELS = {
  weapon: 'Weapon',
  armor: 'Armor',
  equipment: 'Gear',
  droid: 'Droid',
  vehicle: 'Vehicle'
};

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatCredits(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return `${n.toLocaleString()} cr`;
}

function formatBaseCost(item) {
  if (item?.pricingMode === 'new-used' || item?.requiresCondition) {
    return `New ${formatCredits(item.costNew)} / Used ${formatCredits(item.costUsed)}`;
  }
  return formatCredits(item?.cost);
}

function formatFinalCost(item) {
  if (item?.pricingMode === 'new-used' || item?.requiresCondition) {
    return `New ${formatCredits(item.finalCostNew)} / Used ${formatCredits(item.finalCostUsed)}`;
  }
  return formatCredits(item?.finalCost);
}

function policyFor(item, policies, blacklistedItems) {
  const existing = policies?.[item.id] ?? {};
  const hiddenByLegacyBlacklist = Array.isArray(blacklistedItems) && blacklistedItems.includes(item.id);

  return {
    visible: existing.visible !== undefined ? existing.visible === true : !hiddenByLegacyBlacklist,
    available: existing.available !== undefined ? existing.available === true : true,
    trackQuantity: existing.trackQuantity === true,
    quantity: existing.quantity ?? '',
    requiresApproval: existing.requiresApproval === true,
    overridePrice: existing.overridePrice ?? '',
    notes: existing.notes ?? ''
  };
}

function toInventoryRow(item, policies, blacklistedItems) {
  const policy = policyFor(item, policies, blacklistedItems);
  const availabilityKey = item.rarityClass || item.availability || 'standard';
  const source = item.doc?.pack || item.doc?.collection?.metadata?.label || item.doc?.folder?.name || 'World / Runtime';

  return {
    id: item.id,
    name: item.name,
    type: item.type,
    typeLabel: TYPE_LABELS[item.type] || item.type || 'Item',
    category: item.category || 'Other',
    subcategory: item.subcategory || 'Misc',
    availabilityKey,
    availabilityLabel: item.rarityLabel || availabilityKey,
    baseCostDisplay: formatBaseCost(item),
    finalCostDisplay: formatFinalCost(item),
    overridePriceDisplay: policy.overridePrice === '' || policy.overridePrice === null || policy.overridePrice === undefined ? '' : String(policy.overridePrice),
    source,
    visible: policy.visible,
    available: policy.available,
    trackQuantity: policy.trackQuantity,
    quantity: policy.quantity === null || policy.quantity === undefined ? '' : policy.quantity,
    requiresApproval: policy.requiresApproval,
    notes: policy.notes,
    searchText: `${item.name} ${item.type} ${item.category} ${item.subcategory} ${availabilityKey}`.toLowerCase()
  };
}

function buildInventoryStats(rows) {
  return rows.reduce((stats, row) => {
    stats.total += 1;
    if (row.visible) stats.visible += 1;
    if (row.available) stats.available += 1;
    if (row.requiresApproval) stats.requiresApproval += 1;
    if (row.overridePriceDisplay !== '') stats.overrides += 1;
    return stats;
  }, { total: 0, visible: 0, available: 0, requiresApproval: 0, overrides: 0 });
}

function buildTypeFilters(rows) {
  const seen = new Map();
  for (const row of rows) {
    if (!row.type) continue;
    seen.set(row.type, row.typeLabel || row.type);
  }
  return Array.from(seen.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

function buildAvailabilityFilters(rows) {
  const seen = new Map();
  for (const row of rows) {
    if (!row.availabilityKey) continue;
    seen.set(row.availabilityKey, row.availabilityLabel || row.availabilityKey);
  }
  return Array.from(seen.entries())
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

export class GMStoreControlSurfaceService {
  static async buildViewModel(host) {
    await host._loadStoreTransactionHistory();
    await host._loadStorePendingSales();
    await host._loadStorePendingApprovals();

    const storeOpen = SettingsHelper.getSafe('storeOpen', true);
    const legacyBuyModifier = SettingsHelper.getSafe('globalBuyModifier', 0);
    const storeMarkup = SettingsHelper.getSafe('storeMarkup', legacyBuyModifier);
    const storeDiscount = SettingsHelper.getSafe('storeDiscount', 0);
    const autoAcceptSelling = SettingsHelper.getSafe('autoAcceptItemSales', false);
    const autoSalePercent = SettingsHelper.getSafe('automaticSalePercentage', 50);
    const disallowAutoSellNoPrice = SettingsHelper.getSafe('disallowAutoSellNoPrice', true);

    const visibleRarities = {
      ...AVAILABILITY_DEFAULTS,
      ...SettingsHelper.getObject('visibleRarities', AVAILABILITY_DEFAULTS)
    };

    const visibleTypes = {
      ...TYPE_DEFAULTS,
      ...SettingsHelper.getObject('visibleItemTypes', TYPE_DEFAULTS)
    };

    const blacklistedItems = SettingsHelper.getArray('blacklistedItems', []);
    const inventoryPolicies = SettingsHelper.getObject('storeInventoryPolicies', {});

    let inventoryRows = [];
    let inventoryLoadError = null;
    try {
      const inventoryResult = await StoreEngine.getInventory({ useCache: true, ignorePolicies: true });
      if (inventoryResult?.success && inventoryResult.inventory?.allItems) {
        inventoryRows = inventoryResult.inventory.allItems.map((item) => toInventoryRow(item, inventoryPolicies, blacklistedItems));
      } else {
        inventoryLoadError = inventoryResult?.error || 'Inventory index did not return usable items.';
      }
    } catch (err) {
      inventoryLoadError = err?.message || String(err);
    }

    const inventoryStats = buildInventoryStats(inventoryRows);
    const typeFilters = buildTypeFilters(inventoryRows);
    const availabilityFilters = buildAvailabilityFilters(inventoryRows);

    return {
      pageTitle: 'Store Control',
      pageDescription: 'Commerce governance, inventory policy, approvals, and ledger review',
      transactions: host.transactions,
      pendingSales: host.pendingSales,
      pendingApprovals: host.storeApprovals,
      storeOpen,
      buyModifier: safeNumber(storeMarkup, 0),
      storeMarkup: safeNumber(storeMarkup, 0),
      storeDiscount: safeNumber(storeDiscount, 0),
      autoAcceptSelling,
      autoSalePercent,
      disallowAutoSellNoPrice,
      visibleRarities,
      visibleTypes,
      blacklistedItems,
      inventoryRows,
      inventoryStats,
      typeFilters,
      availabilityFilters,
      inventoryLoadError,
      actors: game.actors.filter((actor) => actor.isOwner).map((actor) => ({ id: actor.id, name: actor.name })),
      currentTab: host.currentTab || 'options',
      storeApprovalCounts: {
        pendingSales: host.pendingSales?.length ?? 0,
        customPurchases: host.storeApprovals?.length ?? 0,
        total: (host.pendingSales?.length ?? 0) + (host.storeApprovals?.length ?? 0)
      }
    };
  }
}
