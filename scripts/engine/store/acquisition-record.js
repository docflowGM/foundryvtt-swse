/**
 * acquisition-record.js
 * ---------------------
 * Per-asset ACQUISITION COST provenance (pure; no Foundry globals).
 *
 * Every Store purchase records, for each delivered asset, three separate things:
 *   published base price   what the source says it costs (reference)
 *   actual acquisition price what the buyer paid at the committed transaction (policy markups/discounts included)
 *   [current resale value  is NOT stored: it is derived by the resale authority, from policy, at quote time]
 *
 * The AUTHORITATIVE evidence is the purchaser's transaction ledger record (audit.items[] line: listingId, unitCost, publishedUnitCost,
 * quantity, condition, sourceUuid). The delivered Item / Actor carries only a REFERENCE (flags.foundryvtt-swse.acquisition:
 * transactionId + the same figures). A reference is never trusted by itself: `verifyAcquisition` re-reads the ledger line and requires
 * the figures to match, so editing the flag cannot raise a payout. Assets with no verifiable record (loot, GM grants, pre-ledger
 * assets) are "acquisition cost unknown", never "zero".
 */
export const ACQUISITION_FLAG_PATH = 'flags.foundryvtt-swse.acquisition';
export const PURCHASE_CONTEXTS = Object.freeze(['store-purchase', 'store-customization-checkout', 'store-custom-approval']);

const finitePositive = v => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** The published (reference) unit price of a Store listing for the purchased condition, or null. */
export function publishedUnitCostOf(listing, condition = null) {
  if (!listing) return null;
  const v = listing.type === 'vehicle' ? (condition === 'used' ? listing.costUsed : listing.costNew) : listing.cost;
  return finitePositive(v) ? v : null;
}

/** Transient marker a plan builder puts on delivered asset data; TransactionEngine turns it into the stored reference. */
export function buildAcquisitionMarker({ listing, listingId = null, unitPaid, quantity = 1, condition = null, kind = 'store-listing', quoteHash = null }) {
  return {
    kind,
    listingId: listingId ?? listing?.id ?? null,
    sourceUuid: listing?.sourceUuid ?? null,
    sourceEntryKey: listing?.sourceEntryKey ?? null,
    unitPaid: Number(unitPaid),
    publishedUnitCost: listing ? publishedUnitCostOf(listing, condition) : null,
    quantity,
    condition,
    ...(quoteHash ? { quoteHash } : {})
  };
}

/** Replace `__acquisition` markers in a (merged) mutation plan with the stored reference. Mutates and returns the plan. */
export function stampAcquisitions(plan, { transactionId, context, at }) {
  const stamp = data => {
    if (!data || typeof data !== 'object' || !data.__acquisition) return;
    const marker = data.__acquisition;
    delete data.__acquisition;
    data.flags ??= {};
    data.flags['foundryvtt-swse'] ??= {};
    data.flags['foundryvtt-swse'].acquisition = { ...marker, transactionId, context, acquiredAt: at };
  };
  for (const item of plan?.add?.items ?? []) stamp(item);
  for (const spec of plan?.create?.actors ?? []) stamp(spec?.data);
  return plan;
}

/** The ledger fields a purchase line must carry so a later resale can prove what was paid. */
export function ledgerLineFields(entry = {}) {
  return {
    listingId: entry.id ?? null,
    sourceUuid: entry.sourceUuid ?? null,
    sourceEntryKey: entry.sourceEntryKey ?? null,
    unitCost: Number.isFinite(Number(entry.finalCost ?? entry.cost)) ? Number(entry.finalCost ?? entry.cost) / Math.max(1, Number(entry.quantity) || 1) : null,
    publishedUnitCost: finitePositive(entry.publishedUnitCost) ? entry.publishedUnitCost : null
  };
}

/**
 * Verify an asset's acquisition reference against the purchaser's own ledger.
 * @param {{acquisition:object|null, sourceUuid?:string|null, ledger:Record<string,object>, unitsAlreadyDisposed?:number}} args
 *   ledger  the actor's `flags.foundryvtt-swse.transactions` map
 *   unitsAlreadyDisposed  units of this acquisition line already sold (from sale records), so one purchase is never paid for twice
 * @returns {{verified:boolean, reasons:string[], unitPaid?:number, publishedUnitCost?:number|null, unitsAvailable?:number, transactionId?:string, condition?:string|null, kind?:string}}
 */
export function verifyAcquisition({ acquisition, sourceUuid = null, ledger, unitsAlreadyDisposed = 0 }) {
  const reasons = [];
  if (!acquisition || typeof acquisition !== 'object') return { verified: false, reasons: ['ACQUISITION_COST_UNKNOWN'] };
  const record = ledger && Object.prototype.hasOwnProperty.call(ledger, acquisition.transactionId) ? ledger[acquisition.transactionId] : null;
  if (!record || typeof record !== 'object') return { verified: false, reasons: ['ACQUISITION_TRANSACTION_NOT_IN_LEDGER'] };
  if (record.status !== 'Success') reasons.push('ACQUISITION_TRANSACTION_NOT_SUCCESSFUL');
  if (!PURCHASE_CONTEXTS.includes(record.context)) reasons.push('ACQUISITION_TRANSACTION_NOT_A_PURCHASE');
  const line = (record.audit?.items ?? []).find(l => l?.listingId && l.listingId === acquisition.listingId);
  if (!line) reasons.push('ACQUISITION_LINE_NOT_IN_LEDGER');
  else {
    if (!finitePositive(line.unitCost)) reasons.push('LEDGER_UNIT_COST_INVALID');
    if (line.unitCost !== acquisition.unitPaid) reasons.push('ACQUISITION_REFERENCE_DOES_NOT_MATCH_LEDGER');
    if (sourceUuid && line.sourceUuid !== sourceUuid) reasons.push('ACQUISITION_SOURCE_MISMATCH');
    if ((line.condition ?? null) !== (acquisition.condition ?? null)) reasons.push('ACQUISITION_CONDITION_MISMATCH');
  }
  if (reasons.length) return { verified: false, reasons };
  const purchased = Math.max(1, Number(line.quantity) || 1);
  const unitsAvailable = Math.max(0, purchased - Math.max(0, Number(unitsAlreadyDisposed) || 0));
  return { verified: true, reasons: [], unitPaid: line.unitCost, publishedUnitCost: finitePositive(line.publishedUnitCost) ? line.publishedUnitCost : null,
    unitsAvailable, transactionId: acquisition.transactionId, condition: line.condition ?? null, kind: acquisition.kind ?? 'store-listing' };
}
