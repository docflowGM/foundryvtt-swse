/**
 * Phase 4E P3: pure pricing/eligibility for published vehicles.
 *
 * The catalog (429 publication claims) is reference material; a vehicle is purchasable
 * only when its PUBLISHED price state allows it (or a GM offer carries recorded
 * authority). Unknown, ambiguous, not-for-sale and absent prices are never turned into
 * a number, and a used price is only ever a published used price: never a fraction of
 * the new price. Merchant policy (markup/override) is applied by the Store's policy
 * layer on top; this module owns what the source permits.
 * No Foundry globals: Node-testable.
 */
const finite = v => typeof v === 'number' && Number.isFinite(v);

function priceState(p) {
  if (!p || typeof p !== 'object') return { status: 'absent', amountCredits: null };
  if (p.status === 'priced' && finite(p.amountCredits) && p.amountCredits > 0)
    return { status: 'priced', amountCredits: p.amountCredits };
  return { status: String(p.status ?? 'absent'), amountCredits: null };
}

export function getPublishedVehiclePrices(economics) {
  return { new: priceState(economics?.priceNew), used: priceState(economics?.priceUsed) };
}

const REASONS = {
  'not-for-sale': 'NOT_FOR_SALE_PUBLISHED',
  ambiguous: 'PRICE_AMBIGUOUS_IN_SOURCE',
  absent: 'PRICE_NOT_STATED_IN_SOURCE'
};

/**
 * @param {object} record  published source record
 * @param {{condition?:'new'|'used', offerPrice?:number, gmOffer?:object}} opts
 *   gmOffer: { price, authorizedByGM:true, userId, reason } — the only way to sell a
 *   vehicle the source does not price; authority is carried into the result for audit.
 */
export function evaluateVehiclePurchase(record, { condition = 'new', offerPrice = null, gmOffer = null } = {}) {
  const key = record?.identity?.sourceEntryKey;
  if (!key) return { ok: false, reasons: ['VEHICLE_NOT_SOURCE_BACKED'] };
  if (condition !== 'new' && condition !== 'used') return { ok: false, sourceEntryKey: key, reasons: ['CONDITION_INVALID'] };
  const prices = getPublishedVehiclePrices(record.economics);
  const published = prices[condition];
  const result = { sourceEntryKey: key, condition, publishedStatus: published.status,
    publishedPrice: published.amountCredits, offerPrice: null, authority: 'published', reasons: [] };

  if (published.status === 'priced') {
    if (offerPrice !== null && !(finite(offerPrice) && offerPrice > 0)) {
      result.reasons.push('OFFER_PRICE_INVALID');
    } else result.offerPrice = offerPrice ?? published.amountCredits;
  } else if (gmOffer) {
    const ok = gmOffer.authorizedByGM === true && finite(gmOffer.price) && gmOffer.price > 0 &&
      typeof gmOffer.userId === 'string' && gmOffer.userId && typeof gmOffer.reason === 'string' && gmOffer.reason.trim();
    if (!ok) result.reasons.push('GM_OFFER_AUTHORITY_INCOMPLETE');
    else { result.offerPrice = gmOffer.price; result.authority = 'gm-override';
      result.gmOverride = { userId: gmOffer.userId, reason: gmOffer.reason.trim(), publishedStatus: published.status }; }
  } else {
    result.reasons.push(condition === 'used' && prices.new.status === 'priced'
      ? 'USED_PRICE_NOT_PUBLISHED'
      : (REASONS[published.status] ?? 'PRICE_NOT_STATED_IN_SOURCE'));
  }
  result.ok = result.reasons.length === 0;
  return result;
}

/**
 * Store cost record for a source-backed vehicle, in the cost-registry's own shape.
 * Replaces reading the legacy mirrored system.cost (which can't express used/unknown).
 */
export function buildCanonicalVehicleCostRecord(economics) {
  const p = getPublishedVehiclePrices(economics);
  if (p.new.status === 'priced') return {
    costStatus: 'conditional', pricingMode: 'new-used', baseCost: null,
    baseCostNew: p.new.amountCredits, baseCostUsed: p.used.amountCredits,
    requiresCondition: true, defaultCondition: null, unavailabilityReason: null,
    rawCostSource: 'universalVehicleSource.economics'
  };
  return {
    costStatus: p.new.status === 'not-for-sale' ? 'unavailable' : 'missing', pricingMode: 'none',
    baseCost: null, baseCostNew: null, baseCostUsed: null, requiresCondition: false, defaultCondition: null,
    unavailabilityReason: p.new.status === 'not-for-sale' ? 'notPubliclyAvailable' : 'sourceReviewRequired',
    rawCostSource: 'universalVehicleSource.economics'
  };
}

/**
 * Verify the amount about to be charged against the AUTHORITATIVE merchant offer (the
 * Store's policy-applied price for this item), not a mutable cart value.
 * @param {{merchantPrice:number|null, cartPrice?:number|null}} offer
 */
export function evaluateVehicleMerchantPurchase(record, { condition = 'new', merchantPrice = null, cartPrice = undefined, gmOffer = null } = {}) {
  if (!finite(merchantPrice) || merchantPrice <= 0) {
    const r = evaluateVehiclePurchase(record, { condition, gmOffer });
    return r.ok ? { ...r, ok: false, reasons: ['MERCHANT_OFFER_UNAVAILABLE'] } : r;
  }
  const verdict = evaluateVehiclePurchase(record, { condition, offerPrice: merchantPrice, gmOffer });
  if (verdict.ok && cartPrice !== undefined && cartPrice !== null && cartPrice !== merchantPrice) {
    verdict.ok = false;
    verdict.reasons.push('CART_PRICE_MISMATCH');
  }
  return verdict;
}

/** Browse listing for the source catalog. Eligibility here is "what the source allows". */
export function buildVehicleCatalogListing(sourceActors) {
  const seen = new Set(), issues = [], entries = [];
  const counts = { priced: 0, 'not-for-sale': 0, ambiguous: 0, absent: 0 };
  for (const a of sourceActors) {
    const record = a?.flags?.swse?.universalVehicleSource?.source;
    const key = record?.identity?.sourceEntryKey;
    if (!key) { issues.push('MISSING_SOURCE_IDENTITY'); continue; }
    if (seen.has(key)) { issues.push('DUPLICATE_SOURCE_IDENTITY:' + key); continue; }
    seen.add(key);
    const prices = getPublishedVehiclePrices(record.economics);
    counts[prices.new.status] = (counts[prices.new.status] ?? 0) + 1;
    const buyNew = evaluateVehiclePurchase(record, { condition: 'new' });
    const buyUsed = evaluateVehiclePurchase(record, { condition: 'used' });
    entries.push({
      sourceEntryKey: key, name: record.identity.name, book: record.publication?.book,
      page: record.publication?.page, category: record.classification?.primaryCategory,
      packName: a.system?.vehiclePackName ?? null, availability: record.economics?.availability ?? null,
      priceNew: prices.new, priceUsed: prices.used,
      purchasable: { new: buyNew.ok, used: buyUsed.ok },
      blockedReasons: { new: buyNew.reasons, used: buyUsed.reasons }
    });
  }
  return { entries, issues, counts, total: entries.length };
}
