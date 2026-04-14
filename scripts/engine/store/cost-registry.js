/**
 * Store Cost Registry & Resolver
 *
 * Single authority for translating raw pack pricing into store-consumable costs.
 *
 * Handles:
 * - Structured new/used vehicle pricing
 * - Scalar droid pricing (when available)
 * - "Not publicly available" unavailable state
 * - Missing pricing detection
 *
 * Policy:
 * - Prefer structured { new, used } over composite costNumeric
 * - Preserve distinction between scalar, conditional, unavailable, missing
 * - No synthetic pricing; only use what exists in raw data
 * - costNumeric is treated as packed helper, not scalar truth
 */

/**
 * Build store cost record from raw document
 * @param {Object} rawDoc - Raw item document from pack
 * @returns {Object} Cost record with status, pricing fields, metadata
 */
export function buildStoreCostRecord(rawDoc) {
  const cost = rawDoc?.system?.cost;
  const costNumeric = rawDoc?.system?.costNumeric;

  // Detect unavailable state: string values like "not publicly available"
  if (isUnavailableCost(cost)) {
    return {
      costStatus: 'unavailable',
      pricingMode: 'none',
      baseCost: null,
      baseCostNew: null,
      baseCostUsed: null,
      requiresCondition: false,
      defaultCondition: null,
      unavailabilityReason: 'notPubliclyAvailable',
      rawCostSource: 'unavailable_string'
    };
  }

  // Detect structured new/used pricing
  if (isStructuredCost(cost)) {
    const { validNew, validUsed } = extractStructuredCost(cost);
    if (validNew !== null || validUsed !== null) {
      return {
        costStatus: 'conditional',
        pricingMode: 'new-used',
        baseCost: null,
        baseCostNew: validNew,
        baseCostUsed: validUsed,
        requiresCondition: true,
        defaultCondition: null,
        unavailabilityReason: null,
        rawCostSource: 'system.cost.new-used'
      };
    }
  }

  // Detect scalar numeric pricing
  if (typeof costNumeric === 'number' && costNumeric > 0) {
    return {
      costStatus: 'priced',
      pricingMode: 'single',
      baseCost: costNumeric,
      baseCostNew: null,
      baseCostUsed: null,
      requiresCondition: false,
      defaultCondition: null,
      unavailabilityReason: null,
      rawCostSource: 'system.costNumeric'
    };
  }

  if (typeof cost === 'number' && cost > 0) {
    return {
      costStatus: 'priced',
      pricingMode: 'single',
      baseCost: cost,
      baseCostNew: null,
      baseCostUsed: null,
      requiresCondition: false,
      defaultCondition: null,
      unavailabilityReason: null,
      rawCostSource: 'system.cost'
    };
  }

  // No usable pricing
  return {
    costStatus: 'missing',
    pricingMode: 'none',
    baseCost: null,
    baseCostNew: null,
    baseCostUsed: null,
    requiresCondition: false,
    defaultCondition: null,
    unavailabilityReason: null,
    rawCostSource: null
  };
}

/**
 * Resolve final store cost given a record and optional condition
 * @param {Object} record - Cost record from buildStoreCostRecord()
 * @param {Object} options - { condition: 'new' | 'used' | null, markup: number }
 * @returns {Object} { cost, costNew, costUsed, usedCondition }
 */
export function resolveStoreCost(record, options = {}) {
  const { condition = null, markup = 0 } = options;

  // Unavailable or missing: no cost
  if (record.costStatus === 'unavailable' || record.costStatus === 'missing') {
    return {
      cost: null,
      costNew: null,
      costUsed: null,
      usedCondition: null
    };
  }

  // Scalar pricing
  if (record.pricingMode === 'single') {
    const base = record.baseCost ?? 0;
    const final = applyMarkup(base, markup);
    return {
      cost: final,
      costNew: null,
      costUsed: null,
      usedCondition: null
    };
  }

  // Conditional new/used pricing
  if (record.pricingMode === 'new-used') {
    const newBase = record.baseCostNew ?? 0;
    const usedBase = record.baseCostUsed ?? 0;
    const finalNew = applyMarkup(newBase, markup);
    const finalUsed = applyMarkup(usedBase, markup);

    // Determine which to return as primary cost
    let primaryCost = null;
    let usedCondition = null;

    if (condition === 'new') {
      primaryCost = finalNew;
      usedCondition = 'new';
    } else if (condition === 'used') {
      primaryCost = finalUsed;
      usedCondition = 'used';
    }
    // else: no condition specified, return both new/used costs

    return {
      cost: primaryCost,
      costNew: finalNew,
      costUsed: finalUsed,
      usedCondition
    };
  }

  // Unknown mode
  return {
    cost: null,
    costNew: null,
    costUsed: null,
    usedCondition: null
  };
}

/**
 * Check if a record is purchasable in the store
 * @param {Object} record - Cost record from buildStoreCostRecord()
 * @param {Object} options - { condition: 'new' | 'used' | null }
 * @returns {boolean}
 */
export function isStorePurchasable(record, options = {}) {
  const { condition = null } = options;

  if (record.costStatus !== 'priced' && record.costStatus !== 'conditional') {
    return false;
  }

  if (record.costStatus === 'priced') {
    return true;
  }

  // Conditional: must have valid cost for requested condition
  if (record.pricingMode === 'new-used') {
    if (condition === 'new' && record.baseCostNew !== null && record.baseCostNew > 0) {
      return true;
    }
    if (condition === 'used' && record.baseCostUsed !== null && record.baseCostUsed > 0) {
      return true;
    }
    return false;
  }

  return false;
}

/**
 * Private: Check if cost field contains unavailability string
 */
function isUnavailableCost(cost) {
  if (typeof cost !== 'object' || cost === null) {
    return false;
  }

  const newVal = cost.new;
  const usedVal = cost.used;

  if (typeof newVal === 'string' && newVal.includes('not publicly available')) {
    return true;
  }
  if (typeof usedVal === 'string' && usedVal.includes('not publicly available')) {
    return true;
  }

  return false;
}

/**
 * Private: Check if cost is a structured { new, used } object
 */
function isStructuredCost(cost) {
  if (typeof cost !== 'object' || cost === null) {
    return false;
  }

  return 'new' in cost || 'used' in cost;
}

/**
 * Private: Extract numeric new/used values, filtering out string placeholders
 */
function extractStructuredCost(cost) {
  let validNew = null;
  let validUsed = null;

  if (typeof cost.new === 'number') {
    validNew = cost.new > 0 ? cost.new : null;
  }

  if (typeof cost.used === 'number') {
    validUsed = cost.used > 0 ? cost.used : null;
  }

  return { validNew, validUsed };
}

/**
 * Private: Apply markup/modifier to a base cost
 */
function applyMarkup(baseCost, markupPercent) {
  if (baseCost === null || baseCost === 0) {
    return null;
  }

  const modifier = 1 + (markupPercent / 100);
  return Math.round(baseCost * modifier);
}
