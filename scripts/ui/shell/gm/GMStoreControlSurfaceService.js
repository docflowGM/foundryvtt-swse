/** GM store governance surface view-model. */

import { SettingsHelper } from '/systems/foundryvtt-swse/scripts/utils/settings-helper.js';
import { StoreEngine } from '/systems/foundryvtt-swse/scripts/engine/store/store-engine.js';
import {
  STORE_AVAILABILITY_DEFAULTS,
  STORE_TYPE_DEFAULTS,
  STORE_CATEGORY_MARKUP_DEFAULTS
} from '/systems/foundryvtt-swse/scripts/engine/store/policy-service.js';

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
  if (!Number.isFinite(n) || n <= 0) return '—';
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

function normalizeStatusKey(value) {
  return String(value || 'unknown').trim().toLowerCase().replace(/\s+/g, '-');
}

function normalizeTypeKey(value) {
  return String(value || 'transaction').trim().toLowerCase().replace(/\s+/g, '-');
}

function buildTransactionStats(rows = []) {
  const stats = {
    total: 0,
    success: 0,
    failed: 0,
    rollback: 0,
    pending: 0,
    creditsIn: 0,
    creditsOut: 0,
    net: 0,
    netDisplay: '0 cr',
    creditsInDisplay: '0 cr',
    creditsOutDisplay: '0 cr'
  };

  for (const row of rows) {
    stats.total += 1;
    const statusKey = normalizeStatusKey(row?.status);
    const amount = Number(row?.amount || 0) || 0;
    if (statusKey.includes('success')) stats.success += 1;
    else if (statusKey.includes('fail')) stats.failed += 1;
    else if (statusKey.includes('pending')) stats.pending += 1;
    if (statusKey.includes('roll')) stats.rollback += 1;
    if (amount > 0) stats.creditsIn += amount;
    if (amount < 0) stats.creditsOut += Math.abs(amount);
    stats.net += amount;
  }

  stats.netDisplay = `${stats.net >= 0 ? '+' : '-'}${Math.abs(stats.net).toLocaleString()} cr`;
  stats.creditsInDisplay = `+${stats.creditsIn.toLocaleString()} cr`;
  stats.creditsOutDisplay = `-${stats.creditsOut.toLocaleString()} cr`;
  return stats;
}

function decorateTransactions(rows = []) {
  return rows.map((row) => {
    const amount = Number(row?.amount || 0) || 0;
    const statusKey = normalizeStatusKey(row?.status);
    const typeKey = normalizeTypeKey(row?.type);
    return {
      ...row,
      amountDisplay: `${amount >= 0 ? '+' : '-'}${Math.abs(amount).toLocaleString()} cr`,
      amountTone: amount >= 0 ? 'positive' : 'negative',
      statusKey,
      typeKey,
      statusTone: statusKey.includes('fail') ? 'crit' : (statusKey.includes('pending') || statusKey.includes('roll') ? 'warn' : 'ok'),
      searchText: `${row?.actor || ''} ${row?.player || ''} ${row?.type || ''} ${row?.item || ''} ${row?.status || ''} ${row?.reason || ''} ${row?.source || ''}`.toLowerCase()
    };
  });
}

function buildApprovalQueueMetrics(pendingSales = [], pendingApprovals = []) {
  return {
    total: (pendingSales?.length || 0) + (pendingApprovals?.length || 0),
    sales: pendingSales?.length || 0,
    customAssets: pendingApprovals?.length || 0,
    warnings: (pendingSales || []).filter((request) => !!request.warning).length
  };
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
      ...STORE_AVAILABILITY_DEFAULTS,
      ...SettingsHelper.getObject('visibleRarities', STORE_AVAILABILITY_DEFAULTS)
    };

    const visibleTypes = {
      ...STORE_TYPE_DEFAULTS,
      ...SettingsHelper.getObject('visibleItemTypes', STORE_TYPE_DEFAULTS)
    };

    const storeCategoryMarkups = {
      ...STORE_CATEGORY_MARKUP_DEFAULTS,
      ...SettingsHelper.getObject('storeCategoryMarkups', STORE_CATEGORY_MARKUP_DEFAULTS)
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
    const transactions = decorateTransactions(host.transactions || []);
    const transactionStats = buildTransactionStats(transactions);
    const approvalQueueMetrics = buildApprovalQueueMetrics(host.pendingSales, host.storeApprovals);
    const storeCategoryOptions = this._buildStoreCategoryOptions(visibleTypes, visibleRarities, storeCategoryMarkups);
    const storeApprovalPolicy = this._buildApprovalPolicy({ pendingSales: host.pendingSales, pendingApprovals: host.storeApprovals });
    const storeAuditPolicy = this._buildAuditPolicy({ transactions, inventoryStats, inventoryRows });
    const typeFilters = buildTypeFilters(inventoryRows);
    const availabilityFilters = buildAvailabilityFilters(inventoryRows);

    return {
      pageTitle: 'Store Control',
      pageDescription: 'Commerce governance, inventory policy, approvals, and ledger review',
      transactions,
      transactionStats,
      approvalQueueMetrics,
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
      storeCategoryMarkups,
      blacklistedItems,
      inventoryRows,
      inventoryStats,
      storeCategoryOptions,
      storeApprovalPolicy,
      storeAuditPolicy,
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


  static _buildStoreCategoryOptions(visibleTypes = {}, visibleRarities = {}, markups = STORE_CATEGORY_MARKUP_DEFAULTS) {
    const typeEnabled = (key) => visibleTypes?.[key] !== false;
    const rarityEnabled = (key) => visibleRarities?.[key] !== false;
    const markupFor = (key) => safeNumber(markups?.[key], STORE_CATEGORY_MARKUP_DEFAULTS[key] ?? 0);
    return [
      {
        id: 'weapons',
        name: 'Weapons',
        icon: 'fa-solid fa-gun',
        settingName: 'type-weapons',
        enabled: typeEnabled('weapons'),
        markup: markupFor('weapons'),
        note: 'Ranged and melee weapon listings.'
      },
      {
        id: 'armor',
        name: 'Armor',
        icon: 'fa-solid fa-shield-halved',
        settingName: 'type-armor',
        enabled: typeEnabled('armor'),
        markup: markupFor('armor'),
        note: 'Personal armor and protective gear.'
      },
      {
        id: 'gear',
        name: 'Gear',
        icon: 'fa-solid fa-toolbox',
        settingName: 'type-gear',
        enabled: typeEnabled('gear'),
        markup: markupFor('gear'),
        note: 'Equipment, tools, kits, and general supplies.'
      },
      {
        id: 'droids',
        name: 'Droids',
        icon: 'fa-solid fa-robot',
        settingName: 'type-droids',
        enabled: typeEnabled('droids'),
        markup: markupFor('droids'),
        note: 'Droid purchase and customization entries.'
      },
      {
        id: 'vehicles',
        name: 'Vehicles',
        icon: 'fa-solid fa-car-side',
        settingName: 'type-vehicles',
        enabled: typeEnabled('vehicles'),
        markup: markupFor('vehicles'),
        note: 'Vehicles and vehicle-scale stock.'
      },
      {
        id: 'restricted',
        name: 'Restricted',
        icon: 'fa-solid fa-id-card-clip',
        settingName: 'availability-restricted',
        enabled: rarityEnabled('restricted'),
        markup: markupFor('restricted'),
        note: 'Restricted or license-gated stock visibility.'
      },
      {
        id: 'military',
        name: 'Military',
        icon: 'fa-solid fa-person-rifle',
        settingName: 'availability-military',
        enabled: rarityEnabled('military'),
        markup: markupFor('military'),
        note: 'Military-grade item availability gate.'
      },
      {
        id: 'illegal',
        name: 'Illegal',
        icon: 'fa-solid fa-user-secret',
        settingName: 'availability-illegal',
        enabled: rarityEnabled('illegal'),
        markup: markupFor('illegal'),
        note: 'Black-market and illegal catalog entries.'
      }
    ];
  }

  static _buildApprovalPolicy({ pendingSales = [], pendingApprovals = [] } = {}) {
    const requireApproval = SettingsHelper.getSafe('store.requireGMApproval', false);
    return {
      requireApproval,
      approvalThreshold: SettingsHelper.getSafe('storeApprovalThreshold', requireApproval ? 0 : 5000),
      pendingSales: Array.isArray(pendingSales) ? pendingSales.length : 0,
      pendingCustomPurchases: Array.isArray(pendingApprovals) ? pendingApprovals.length : 0
    };
  }

  static _buildAuditPolicy({ transactions = [], inventoryStats = {}, inventoryRows = [] } = {}) {
    const stockAlerts = Array.isArray(inventoryRows)
      ? inventoryRows.filter((row) => row.trackQuantity === true && Number(row.quantity || 0) <= 0).length
      : 0;
    return {
      historyRetentionWeeks: SettingsHelper.getSafe('storeHistoryRetentionWeeks', 52),
      rollbackWindowDays: SettingsHelper.getSafe('storeRollbackWindowDays', 30),
      transactionCount: Array.isArray(transactions) ? transactions.length : 0,
      overrides: Number(inventoryStats?.overrides || 0) || 0,
      stockAlerts
    };
  }

}
