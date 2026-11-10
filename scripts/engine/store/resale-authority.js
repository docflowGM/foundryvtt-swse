/**
 * resale-authority.js
 * -------------------
 * Pure (no Foundry globals) resale rules for the Store: valuation, eligibility, quote freshness and GM appraisal validation.
 * Resale is a CREDIT-CREATION boundary, so nothing a client can edit is a price:
 *
 *   embedded Item  value = the CANONICAL SOURCE record's published `system.cost` (found through the Item's own
 *                  `_stats.compendiumSource` in the Store catalog), never the embedded Item's `system.price`/`system.cost`
 *                  (a player-editable copy). Payout = floor(published cost x resale policy %) x quantity actually removed.
 *                  An Item with no verifiable canonical source, a customization, or no published price has NO automatic value:
 *                  it can only be sold through a GM appraisal.
 *   whole Droid / Vehicle  never valued automatically. Evidence (published/construction/acquisition figures, condition,
 *                  ownership) is gathered for a GM appraisal; the GM states the amount and the reason, and it is recorded as
 *                  such. The evidence is reference material, not a formula.
 *
 * Authority classes recorded in the ledger: RESALE_AUTHORITY.CANONICAL_AUTOMATIC | RESALE_AUTHORITY.GM_APPRAISAL.
 */
import { isStockImportedDroid } from '/systems/foundryvtt-swse/scripts/actors/droid/droid-mode-adapter.js';

export const RESALE_AUTHORITY = Object.freeze({ CANONICAL_AUTOMATIC: 'canonical-automatic', GM_APPRAISAL: 'gm-appraisal' });

/** Same partition as InventoryEngine (asserted by tests/store-v2-s9-resale-authority.test.mjs). */
export const STACKABLE_ITEM_TYPES = Object.freeze(['consumable', 'equipment', 'misc', 'ammo']);
export const UNIQUE_ITEM_TYPES = Object.freeze(['weapon', 'armor', 'shield', 'lightsaber']);

export const MAX_RESALE_CREDITS = 1_000_000_000;
export const DEFAULT_RESALE_PERCENT = 50;

const finiteInt = v => (typeof v === 'number' && Number.isInteger(v) ? v : null);

export function normalizeResalePercent(value, fallback = DEFAULT_RESALE_PERCENT) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.floor(n)));
}

/** Canonical stack size: `system.quantity` (default 1). `equippedQty`, ammo counters and charges are NOT quantities. */
export function ownedQuantity(itemData) {
  const raw = itemData?.system?.quantity;
  if (raw === undefined || raw === null) return 1;
  const q = finiteInt(raw);
  return q !== null && q >= 0 ? q : null;
}

/** Customization surfaces found on an owned Item. Any hit means the Item no longer equals its published base. */
export function customizationMarkers(itemData) {
  const found = [];
  const nonEmpty = v => (Array.isArray(v) ? v.length > 0 : v && typeof v === 'object' ? Object.keys(v).length > 0 : Boolean(v));
  if (nonEmpty(itemData?.system?.installedUpgrades)) found.push('system.installedUpgrades');
  const swse = itemData?.flags?.swse ?? {};
  for (const [key, value] of Object.entries(swse)) {
    if (/upgrade|gearMods|modification|customiz|lightsaberConfig|installed/i.test(key) && nonEmpty(value)) found.push(`flags.swse.${key}`);
  }
  return found;
}

function stableHash(value) {
  const text = JSON.stringify(value);
  let h = 5381;
  for (let i = 0; i < text.length; i += 1) h = ((h * 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(16).padStart(8, '0');
}

export const RESALE_BASIS = Object.freeze({ ACQUISITION: 'acquisition', PUBLISHED: 'published' });
export const DEFAULT_RESALE_BASIS = RESALE_BASIS.ACQUISITION;
export const normalizeResaleBasis = v => (v === RESALE_BASIS.PUBLISHED ? RESALE_BASIS.PUBLISHED : RESALE_BASIS.ACQUISITION);

/**
 * Resale basis per unit (a project POLICY, not a published SWSE rule):
 *   'acquisition' (default)  units whose purchase is VERIFIED in the ledger are valued at what was actually paid; any other unit
 *                            (loot, GM grant, pre-ledger asset, units added to a stack later) falls back to the canonical source's
 *                            published cost and is labelled as such. "Acquisition cost unknown" is never treated as zero or invented.
 *   'published'              every unit is valued at the canonical published cost.
 * Payout per segment = floor(unit basis x policy %) x units. The policy % can never push a verified-paid unit above what was paid
 * (percent is capped at 100), so buy-low / sell-high arbitrage through GM price policy is not possible on the acquisition basis.
 *
 * @param {{item:object, quantity:number, source:object|null, percent:number, basis?:string, acquisition?:{verified:boolean, unitPaid?:number, unitsAvailable?:number, reasons?:string[]}|null}} args
 *   item   the owned Item as data (toObject())
 *   source the Store-catalog listing of `item._stats.compendiumSource`: { sourceUuid, name, type, cost, costStatus } or null
 * @returns {{ok:boolean, reasons:string[], needsAppraisal:boolean, quote?:object}}
 */
export function quoteItemResale({ item, quantity, source, percent, basis = DEFAULT_RESALE_BASIS, acquisition = null }) {
  const reasons = [];
  if (!item || !item._id) return { ok: false, reasons: ['ITEM_NOT_FOUND'], needsAppraisal: false };
  const owned = ownedQuantity(item);
  const qty = finiteInt(quantity);
  if (owned === null || owned < 1) reasons.push('OWNED_QUANTITY_INVALID');
  if (qty === null || qty < 1) reasons.push('QUANTITY_INVALID');
  else if (owned !== null && qty > owned) reasons.push('QUANTITY_EXCEEDS_OWNED');
  if (UNIQUE_ITEM_TYPES.includes(item.type) && qty !== null && qty !== 1) reasons.push('UNIQUE_ITEM_SELLS_ALONE');
  if (!STACKABLE_ITEM_TYPES.includes(item.type) && !UNIQUE_ITEM_TYPES.includes(item.type)) reasons.push('ITEM_TYPE_NOT_SELLABLE');
  if (reasons.length) return { ok: false, reasons, needsAppraisal: false };

  // From here the Item exists and the quantity is sound; remaining refusals can be resolved by a GM appraisal.
  const appraisal = [];
  const pct = normalizeResalePercent(percent);
  const policyBasis = normalizeResaleBasis(basis);
  const compendiumSource = item._stats?.compendiumSource ?? null;
  const markers = customizationMarkers(item);
  if (markers.length) appraisal.push('CUSTOMIZED_ITEM');
  if (!compendiumSource) appraisal.push('NO_CANONICAL_SOURCE');

  const paidUnits = policyBasis === RESALE_BASIS.ACQUISITION && acquisition?.verified === true
    ? Math.min(qty, Math.max(0, Number(acquisition.unitsAvailable) || 0)) : 0;
  const publishedUnits = qty - paidUnits;
  let publishedBase = null;
  if (compendiumSource) {
    if (!source) { if (publishedUnits > 0) appraisal.push('SOURCE_NOT_IN_STORE_CATALOG'); }
    else if (source.sourceUuid !== compendiumSource || source.type !== item.type || source.name !== item.name) appraisal.push('SOURCE_MISMATCH');
    else if (typeof source.cost === 'number' && Number.isFinite(source.cost) && source.cost > 0) publishedBase = source.cost;
    else if (publishedUnits > 0) appraisal.push('SOURCE_PRICE_UNPUBLISHED');
  }

  const segments = [];
  if (paidUnits > 0) segments.push({ units: paidUnits, basisKind: 'acquisition', unitBase: acquisition.unitPaid, unitPayout: Math.floor(acquisition.unitPaid * (pct / 100)) });
  if (publishedUnits > 0 && publishedBase !== null) segments.push({ units: publishedUnits, basisKind: 'published', unitBase: publishedBase, unitPayout: Math.floor(publishedBase * (pct / 100)) });
  if (!appraisal.length && (segments.length === 0 || segments.some(seg => !(seg.unitPayout > 0)))) appraisal.push('POLICY_PAYOUT_ZERO');
  if (appraisal.length) return { ok: false, reasons: appraisal, needsAppraisal: true, markers, acquisitionReasons: acquisition?.reasons ?? [] };

  const payout = segments.reduce((sum, seg) => sum + seg.units * seg.unitPayout, 0);
  if (!(payout > 0 && payout <= MAX_RESALE_CREDITS)) return { ok: false, reasons: ['PAYOUT_OUT_OF_RANGE'], needsAppraisal: true };
  const quote = {
    authority: RESALE_AUTHORITY.CANONICAL_AUTOMATIC,
    itemId: item._id, itemName: item.name, itemType: item.type, sourceUuid: compendiumSource,
    quantity: qty, ownedQuantity: owned, percent: pct, basisPolicy: policyBasis,
    publishedUnitCost: publishedBase, segments, payout,
    acquisitionStatus: acquisition?.verified === true ? 'verified' : (acquisition?.reasons?.[0] ?? 'ACQUISITION_COST_UNKNOWN'),
    acquisitionTransactionId: acquisition?.verified === true ? acquisition.transactionId ?? null : null
  };
  quote.quoteHash = stableHash({ i: quote.itemId, s: quote.sourceUuid, g: segments, p: pct, q: qty, o: owned, n: item.name, t: quote.acquisitionTransactionId });
  return { ok: true, reasons: [], needsAppraisal: false, quote };
}

/** Compare a quote the buyer/GM saw with a fresh one: any difference forces renewed confirmation. */
export function quoteMatches(shown, fresh) {
  return Boolean(shown && fresh && shown.quoteHash === fresh.quoteHash && shown.payout === fresh.payout);
}

/** GM appraisal: the trusted decision must carry an executing GM, a positive bounded integer and a stated reason. */
export function validateAppraisal({ amount, reason, executingUserIsGM, gmUserId }) {
  const reasons = [];
  if (executingUserIsGM !== true || !gmUserId) reasons.push('GM_REQUIRED');
  const n = Number(amount);
  if (!Number.isInteger(n) || n <= 0) reasons.push('APPRAISAL_AMOUNT_INVALID');
  else if (n > MAX_RESALE_CREDITS) reasons.push('APPRAISAL_AMOUNT_OUT_OF_RANGE');
  if (typeof reason !== 'string' || !reason.trim()) reasons.push('APPRAISAL_REASON_REQUIRED');
  return { ok: reasons.length === 0, reasons, amount: n, reason: typeof reason === 'string' ? reason.trim() : '' };
}

/* ------------------------------------------------------------------ whole assets */

const hasOwnerLink = (owner, assetId) => (Array.isArray(owner?.system?.ownedActors) ? owner.system.ownedActors : []).some(e => e?.id === assetId);

/**
 * Eligibility + evidence for a whole Droid / Vehicle. Never a price. `designProject` is the designer's sealed construction record
 * for a custom ship (looked up by the caller), or null.
 */
export function assessAssetForResale({ asset, owner, designProject = null, acquisition = null, percent = DEFAULT_RESALE_PERCENT, basis = DEFAULT_RESALE_BASIS }) {
  const blockers = [];
  const lines = [];
  const reference = {};
  if (!asset?._id || !owner?._id) return { ok: false, blockers: ['ASSET_OR_OWNER_MISSING'], lines, reference, kind: null };
  const kind = asset.type === 'droid' ? 'droid' : asset.type === 'vehicle' ? 'vehicle' : null;
  if (!kind) return { ok: false, blockers: ['ASSET_TYPE_NOT_SELLABLE'], lines, reference, kind: null };
  if (asset.system?.ownedByActorId !== owner._id) blockers.push('ASSET_NOT_OWNED_BY_SELLER');
  if (!hasOwnerLink(owner, asset._id)) blockers.push('OWNER_LINK_MISSING');
  if (asset.flags?.['foundryvtt-swse']?.resale?.status) blockers.push('ASSET_ALREADY_DISPOSED');
  if (kind === 'droid' && asset.system?.droidSystems?.stateMode !== 'FINALIZED' && asset.system?.droidSystems?.stateMode !== 'STOCK') blockers.push('DROID_NOT_FINALIZED');
  if (kind === 'vehicle') {
    const crew = Object.entries(asset.system?.crewPositions ?? {}).filter(([, v]) => v);
    if (crew.length) blockers.push('VEHICLE_HAS_ASSIGNED_CREW');
  }

  // Acquisition evidence is the purchaser's LEDGER line (verified by the caller via verifyAcquisition), never a field on the asset.
  if (acquisition?.verified === true) {
    reference.acquisitionVerified = true;
    reference.acquisitionPaid = acquisition.unitPaid;
    reference.acquisitionTransactionId = acquisition.transactionId;
    reference.publishedAtPurchase = acquisition.publishedUnitCost ?? null;
    reference.condition = acquisition.condition ?? null;
    lines.push(`Verified purchase: paid ${acquisition.unitPaid} cr${acquisition.publishedUnitCost ? ` (published ${acquisition.publishedUnitCost} cr)` : ''}${acquisition.condition ? `, ${acquisition.condition}` : ''} in transaction ${acquisition.transactionId}`);
    if (normalizeResaleBasis(basis) === RESALE_BASIS.ACQUISITION) {
      reference.policyOffer = Math.floor(acquisition.unitPaid * (normalizeResalePercent(percent) / 100));
      lines.push(`Policy reference: ${normalizeResalePercent(percent)}% of verified paid cost = ${reference.policyOffer} cr (a reference for the GM, not an automatic offer)`);
    }
  } else {
    reference.acquisitionVerified = false;
    lines.push(`Acquisition cost unknown (${(acquisition?.reasons ?? ['ACQUISITION_COST_UNKNOWN'])[0]}); no purchase price is assumed`);
  }
  if (kind === 'droid') {
    const construction = asset.flags?.swse?.storeDroidConstruction;
    if (construction) { reference.constructionTotal = construction.totalCredits; lines.push(`Custom construction quote ${construction.totalCredits} cr (quote ${construction.quoteHash})`); }
    else if (isStockImportedDroid(asset)) lines.push('Published stock droid (stock statblock import)');
    else lines.push('No construction or stock provenance recorded');
  } else {
    const economics = asset.flags?.swse?.universalVehicleSource?.source?.economics;
    const condition = asset.system?.buildMetadata?.condition ?? null;
    if (economics) {
      reference.publishedNew = economics.priceNew?.status === 'priced' ? economics.priceNew.amountCredits : null;
      reference.publishedUsed = economics.priceUsed?.status === 'priced' ? economics.priceUsed.amountCredits : null;
      lines.push(`Published new ${reference.publishedNew ?? 'unpublished'}; published used ${reference.publishedUsed ?? 'unpublished'}; purchased condition ${condition ?? 'unrecorded'}`);
    }
    const completion = asset.flags?.swse?.vehicleConstructionCompletion;
    if (completion) {
      const total = designProject?.record?.totalCredits;
      if (Number.isFinite(total)) { reference.constructionTotal = total; lines.push(`Custom ship: sealed construction record ${total} cr (design ${completion.designId}); installed systems after delivery are NOT valued here`); }
      else lines.push(`Custom ship: construction record for design ${completion.designId} not found`);
    }
    if (!economics && !completion) lines.push('No published or construction provenance recorded');
  }
  return { ok: blockers.length === 0, blockers, lines, reference, kind };
}

/** Disposition contract for a sold asset: the Actor is kept (never deleted), stripped of player access, and its prior state recorded for recovery. */
export function buildAssetDispositionUpdate({ asset, owner, transactionId, authority, amount, soldAt, soldBy, gmOwnerships }) {
  return {
    ownership: { default: 0, ...gmOwnerships },
    'system.ownedByActorId': null,
    'system.ownedByActorName': null,
    'flags.foundryvtt-swse.resale': {
      status: 'sold', transactionId, authority, amount, soldAt, soldBy,
      previousOwnerActorId: owner._id, previousOwnerActorName: owner.name,
      previousOwnership: asset.ownership ?? {},
      previousOwnedByActorId: asset.system?.ownedByActorId ?? null,
      previousOwnedByActorName: asset.system?.ownedByActorName ?? null
    }
  };
}
