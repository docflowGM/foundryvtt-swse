/**
 * store-approval-quote.js
 * -----------------------
 * Pure verification of a GM-approval request against the CURRENT merchant offer.
 *
 * A player-written approval record is a request, not a quote. When the GM approves, every non-customized
 * line is re-resolved from the live catalog by exact listing id and the recorded price must equal the
 * current offer for the recorded condition. Nothing is rewritten to make a total balance; a mismatch
 * refuses the approval and nothing is charged.
 */
const positive = v => typeof v === 'number' && Number.isFinite(v) && v > 0;

/** The merchant's current offer for a listing in a condition (vehicles are per-condition; no cross-condition fallback). */
export function currentOfferFor(listing, condition = null) {
  if (!listing) return null;
  if (listing.type === 'vehicle') {
    if (condition === 'used') return positive(listing.finalCostUsed) ? listing.finalCostUsed : null;
    if (condition === 'new') return positive(listing.finalCostNew) ? listing.finalCostNew : null;
    return null;   // a vehicle approval must name its condition
  }
  return positive(listing.finalCost) ? listing.finalCost : null;
}

/**
 * @param {{costCredits:number, approvalItems:Array}} approval
 * @param {Map<string,object>} inventoryById current merchant index (id -> listing)
 * @returns {{ok:boolean, reasons:string[], lines:Array}}
 */
export function verifyApprovalQuote(approval, inventoryById) {
  const reasons = [];
  const lines = [];
  const items = Array.isArray(approval?.approvalItems) ? approval.approvalItems : [];
  if (!items.length) return { ok: false, reasons: ['NO_APPROVAL_ITEMS'], lines };
  let total = 0;
  for (const item of items) {
    const recorded = Number(item?.finalCost);
    if (!positive(recorded)) { reasons.push(`QUOTE_MISSING: ${item?.name ?? item?.id}`); continue; }
    total += recorded;
    if (item.stagedCustomization) { reasons.push(`CUSTOMIZATION_QUOTE_UNVERIFIABLE: ${item.name ?? item.id}`); continue; }   // no certified lane can quote it: fail closed
    const listing = inventoryById?.get?.(item.id) ?? null;
    if (!listing) { reasons.push(`LISTING_NO_LONGER_AVAILABLE: ${item.name ?? item.id}`); continue; }
    if (listing.type === 'vehicle' && item.condition !== 'new' && item.condition !== 'used') { reasons.push(`VEHICLE_CONDITION_REQUIRED: ${item.name ?? item.id}`); continue; }
    const current = currentOfferFor(listing, item.condition ?? null);
    if (current === null) { reasons.push(`NO_CURRENT_OFFER${item.condition ? `(${item.condition})` : ''}: ${item.name ?? item.id}`); continue; }
    if (current !== recorded) { reasons.push(`QUOTE_CHANGED: ${item.name ?? item.id} ${recorded} -> ${current}`); continue; }
    lines.push({ id: item.id, listing, condition: item.condition ?? null, cost: current });
  }
  if (!reasons.length && total !== Number(approval?.costCredits)) reasons.push(`TOTAL_MISMATCH: ${approval?.costCredits} vs ${total}`);
  return { ok: reasons.length === 0, reasons, lines };
}
