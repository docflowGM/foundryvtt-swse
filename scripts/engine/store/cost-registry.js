/**
 * Store Cost Registry
 *
 * Typed translation of a canonical record's published price into a Store cost record, and of a
 * cost record + GM policy (markup/discount) into final merchant prices.
 *
 * Authorities:
 *   items / droids : `system.cost` (a finite number of credits). Nothing else is read -- no costNumeric,
 *                    no price strings. A missing or zero price is `missing`, never free.
 *   vehicles       : the published source economics (`priceNew` / `priceUsed`) through the vehicle domain
 *                    (`buildCanonicalVehicleCostRecord`). A used price is only ever a PUBLISHED used price.
 * Cost states: priced (single) | conditional (new/used) | unavailable | missing.
 */
import { buildCanonicalVehicleCostRecord } from '/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-store-eligibility.js';

const finitePositive = v => typeof v === 'number' && Number.isFinite(v) && v > 0;

const MISSING = Object.freeze({
  costStatus: 'missing', pricingMode: 'none', baseCost: null, baseCostNew: null, baseCostUsed: null,
  requiresCondition: false, defaultCondition: null, unavailabilityReason: 'noPublishedPrice', rawCostSource: null
});

/**
 * @param {{type?:string, system?:object, economics?:object}} source  `economics` is the vehicle source economics
 */
export function buildStoreCostRecord(source = {}) {
  if (source.type === 'vehicle') return buildCanonicalVehicleCostRecord(source.economics);
  const cost = source.system?.cost;
  if (finitePositive(cost)) {
    return {
      costStatus: 'priced', pricingMode: 'single', baseCost: cost, baseCostNew: null, baseCostUsed: null,
      requiresCondition: false, defaultCondition: null, unavailabilityReason: null, rawCostSource: 'system.cost'
    };
  }
  return { ...MISSING };
}

function applyPolicy(base, markup, discount) {
  if (!finitePositive(base)) return null;
  const modifier = (1 + (Number(markup) || 0) / 100) * (1 - (Number(discount) || 0) / 100);
  const result = Math.round(base * modifier);
  return result > 0 ? result : null;
}

/** Final merchant prices for a cost record. A condition that has no published price stays null. */
export function resolveStoreCost(record, options = {}) {
  const { condition = null, markup = 0, discount = 0 } = options;
  const none = { cost: null, costNew: null, costUsed: null, usedCondition: null };
  if (!record || (record.costStatus !== 'priced' && record.costStatus !== 'conditional')) return none;
  if (record.pricingMode === 'single') {
    return { ...none, cost: applyPolicy(record.baseCost, markup, discount) };
  }
  if (record.pricingMode === 'new-used') {
    const costNew = applyPolicy(record.baseCostNew, markup, discount);
    const costUsed = applyPolicy(record.baseCostUsed, markup, discount);
    return {
      cost: condition === 'new' ? costNew : condition === 'used' ? costUsed : null,
      costNew, costUsed, usedCondition: condition === 'new' || condition === 'used' ? condition : null
    };
  }
  return none;
}

export function isStorePurchasable(record, options = {}) {
  const { condition = null } = options;
  if (record?.costStatus === 'priced') return finitePositive(record.baseCost);
  if (record?.costStatus === 'conditional' && record.pricingMode === 'new-used') {
    if (condition === 'new') return finitePositive(record.baseCostNew);
    if (condition === 'used') return finitePositive(record.baseCostUsed);
  }
  return false;
}
