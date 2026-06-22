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


function parseCreditNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  if (typeof value !== 'string') return null;
  if (isReviewText(value)) return null;
  const cleaned = value
    .replace(/[,\s]/g, '')
    .replace(/credits?|cr|credit/gi, '')
    .trim();
  if (!cleaned || /^[-—]+$/.test(cleaned)) return null;
  const number = Number(cleaned);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function isUnavailableText(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.toLowerCase().trim();
  return normalized.includes('not publicly available')
    || normalized.includes('not available')
    || normalized.includes('unavailable')
    || normalized === 'n/a'
    || normalized === 'na';
}


function isReviewText(value) {
  if (typeof value !== 'string') return false;
  const normalized = value.toLowerCase().trim();
  return normalized.includes('source review')
    || normalized.includes('needs review')
    || normalized.includes('review required')
    || normalized.includes('verify source');
}

/**
 * Build store cost record from raw document
 * @param {Object} rawDoc - Raw item document from pack
 * @returns {Object} Cost record with status, pricing fields, metadata
 */
export function buildStoreCostRecord(rawDoc) {
  const rawPricing = rawDoc?.__storeRawPricing || rawDoc?.__storeSource?.rawPricing || null;
  const cost = rawPricing?.cost ?? rawDoc?.system?.cost;
  const costNumeric = rawPricing?.costNumeric ?? rawDoc?.system?.costNumeric;

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

  // Detect structured new/used pricing. Structured vehicle pricing is
  // authoritative; never fall back to costNumeric because old vehicle packs
  // used costNumeric as a packed helper that can concatenate new+used values.
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
    const values = [cost.new, cost.used];
    const review = values.some(isReviewText);
    const unavailable = values.length && values.every(value => isUnavailableText(value));
    return {
      costStatus: unavailable ? 'unavailable' : review ? 'missing' : 'missing',
      pricingMode: 'none',
      baseCost: null,
      baseCostNew: null,
      baseCostUsed: null,
      requiresCondition: false,
      defaultCondition: null,
      unavailabilityReason: unavailable ? 'notPubliclyAvailable' : review ? 'sourceReviewRequired' : null,
      rawCostSource: review ? 'system.cost.new-used.review' : 'system.cost.new-used.empty'
    };
  }

  // Detect scalar numeric pricing. Prefer the explicit numeric helper, but
  // tolerate source packs that keep cost as a string like "1,500 cr".
  const parsedCostNumeric = parseCreditNumber(costNumeric);
  if (parsedCostNumeric !== null) {
    return {
      costStatus: 'priced',
      pricingMode: 'single',
      baseCost: parsedCostNumeric,
      baseCostNew: null,
      baseCostUsed: null,
      requiresCondition: false,
      defaultCondition: null,
      unavailabilityReason: null,
      rawCostSource: 'system.costNumeric'
    };
  }

  const parsedCost = parseCreditNumber(cost);
  if (parsedCost !== null) {
    return {
      costStatus: 'priced',
      pricingMode: 'single',
      baseCost: parsedCost,
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
  if (isUnavailableText(cost)) return true;

  if (typeof cost !== 'object' || cost === null) {
    return false;
  }

  const newVal = cost.new;
  const usedVal = cost.used;

  return isUnavailableText(newVal) && isUnavailableText(usedVal);
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
  return {
    validNew: parseCreditNumber(cost.new),
    validUsed: parseCreditNumber(cost.used)
  };
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
