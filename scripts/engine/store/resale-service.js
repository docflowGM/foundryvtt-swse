/**
 * resale-service.js
 * -----------------
 * Foundry-bound orchestration for resale. Valuation and eligibility rules are in resale-authority.js (pure); money and asset
 * movement are TransactionEngine's. This module (a) gathers live evidence (owned Item data, the Store catalog listing of the Item's
 * canonical source, the actor's ledger), (b) is the trusted verification that TransactionEngine calls at the commit boundary, and
 * (c) queues requests for GM review. It holds no prices of its own.
 */
import { loadStoreCatalog } from '/systems/foundryvtt-swse/scripts/engine/store/store-catalog.js';
import { HouseRuleService } from '/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js';
import { SettingsHelper } from '/systems/foundryvtt-swse/scripts/utils/settings-helper.js';
import { TransactionEngine } from '/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js';
import { VEHICLE_DESIGN_PROJECTS_FLAG } from '/systems/foundryvtt-swse/scripts/domain/vehicles/vehicle-installation-ledger.js';
import {
  RESALE_AUTHORITY, normalizeResalePercent, normalizeResaleBasis, ownedQuantity, quoteItemResale, quoteMatches, validateAppraisal,
  assessAssetForResale, UNIQUE_ITEM_TYPES, DEFAULT_RESALE_PERCENT
} from '/systems/foundryvtt-swse/scripts/engine/store/resale-authority.js';
import { verifyAcquisition } from '/systems/foundryvtt-swse/scripts/engine/store/acquisition-record.js';

/** Human-readable explanation of a canonical quote (shown to the seller and the GM). */
export function quoteEvidenceLines(q) {
  const lines = [`${q.quantity} x ${q.itemName}: policy ${q.percent}% (basis policy: ${q.basisPolicy})`];
  for (const seg of q.segments) lines.push(`${seg.units} unit(s) valued on ${seg.basisKind === 'acquisition' ? 'the VERIFIED price paid' : 'the published cost'} (${seg.unitBase} cr) -> ${seg.unitPayout} cr each`);
  lines.push(`Purchase verified in the ledger (transaction ${q.acquisitionTransactionId}, lot ${q.acquisitionLotId})`);
  return lines;
}

const GM_CONTEXTS = new Set(['store-sale-approval', 'store-haggle-sale']);
const asData = doc => (typeof doc?.toObject === 'function' ? doc.toObject() : doc);
const ownerLevel = () => globalThis.CONST?.DOCUMENT_OWNERSHIP_LEVELS?.OWNER ?? 3;
const fail = (error, reasons = [], extra = {}) => ({ ok: false, error, reasons, ...extra });

let _listingBySource = { catalog: null, map: null };

export class ResaleService {
  static policyPercent() {
    return normalizeResalePercent(HouseRuleService.getNumber('automaticSalePercentage', DEFAULT_RESALE_PERCENT));
  }

  static policyBasis() {
    return normalizeResaleBasis(HouseRuleService.getString('resaleBasis', 'acquisition'));
  }

  /** The actor's own ledger (the evidence), as a plain map. */
  static ledgerOf(actor) {
    try { return actor.getFlag?.('foundryvtt-swse', 'transactions') || actor.flags?.['foundryvtt-swse']?.transactions || {}; }
    catch (_err) { return actor?.flags?.['foundryvtt-swse']?.transactions || {}; }
  }

  /** Acquisition evidence for an owned Item: its reference verified against THIS actor's ledger, minus units already sold against that purchase. */
  static acquisitionFor(actor, itemData) {
    const acquisition = itemData?.flags?.['foundryvtt-swse']?.acquisition ?? null;
    const ledger = this.ledgerOf(actor);
    const lotId = acquisition?.lotId ?? null;
    // Disposal is accounted per LEDGER LOT (the purchase allocation), never per embedded Item id: a duplicated or re-created Item cannot
    // open a fresh entitlement, and a lot is paid out at most once across everything that ever claimed it.
    let disposed = 0;
    if (lotId) {
      for (const record of Object.values(ledger)) {
        // every committed sale of an Item that claimed this lot (automatic OR GM-appraised) consumes it
        const d = record?.audit?.lotDisposal;
        if (record?.type === 'Sell' && record.status === 'Success' && d?.lotId === lotId) disposed += Number(d.quantity) || 0;
      }
    }
    // More than one owned Item claiming the same lot is ambiguous (duplicate / copied reference / split stack): nobody is entitled.
    const claimantCount = lotId
      ? (actor?.items?.contents ?? Array.from(actor?.items ?? [])).filter(i => asData(i)?.flags?.['foundryvtt-swse']?.acquisition?.lotId === lotId).length
      : 0;
    return verifyAcquisition({ acquisition, sourceUuid: itemData?._stats?.compendiumSource ?? null, ledger, unitsAlreadyDisposed: disposed, claimantCount });
  }

  /**
   * Automatic (no-GM) resale needs a single accountable seller: the Foundry document update is not compare-and-swap, so an actor with
   * more than one non-GM owner could race itself across clients. Such actors resell through GM approval only.
   */
  static automaticResaleAllowed(actor) {
    if (HouseRuleService.isEnabled('autoAcceptItemSales') !== true) return { allowed: false, reason: 'AUTO_SALES_DISABLED' };
    const owners = Object.entries(actor?.ownership ?? {}).filter(([userId, level]) => userId !== 'default' && Number(level) >= ownerLevel()
      && globalThis.game?.users?.get?.(userId)?.isGM !== true);
    if (owners.length > 1) return { allowed: false, reason: 'MULTIPLE_PLAYER_OWNERS' };
    return { allowed: true, reason: null };
  }

  /** The Store-catalog listing of an owned Item's canonical source, by exact source UUID (no name matching). */
  static async sourceFor(itemData) {
    const uuid = itemData?._stats?.compendiumSource ?? null;
    if (!uuid) return null;
    const catalog = await loadStoreCatalog();
    if (_listingBySource.catalog !== catalog) {
      _listingBySource = { catalog, map: new Map(catalog.items.map(l => [l.sourceUuid, l])) };
    }
    const l = _listingBySource.map.get(uuid);
    return l ? { sourceUuid: l.sourceUuid, name: l.name, type: l.type, cost: l.cost, costStatus: l.costStatus } : null;
  }

  /** Live quote for an owned Item (display and request creation). */
  static async quoteOwnedItem({ actor, itemId, quantity = 1 }) {
    const item = actor?.items?.get?.(itemId);
    if (!item) return { ok: false, reasons: ['ITEM_NOT_FOUND'], needsAppraisal: false };
    const data = asData(item);
    return quoteItemResale({ item: data, quantity, source: await this.sourceFor(data), percent: this.policyPercent(), basis: this.policyBasis(), acquisition: this.acquisitionFor(actor, data) });
  }

  static ledgerHasRequest(actor, requestId) {
    if (!requestId) return false;
    return TransactionEngine.getActorTransactions(actor, { includeZeroCost: true })
      .some(tx => (tx.status === 'Success' || tx.status === undefined) && tx.audit?.requestId === requestId);
  }

  /**
   * THE trusted verification for an item sale. Called by TransactionEngine.executeSaleTransaction at the commit boundary; nothing
   * the caller computed (price, percent, quote) is used except as a "what the buyer saw" comparison.
   */
  static async verifyForCommit({ actor, itemId, quantity, authority, shownQuote = null, appraisal = null, requestId = null, transactionContext }) {
    const user = globalThis.game?.user;
    const isGM = user?.isGM === true;
    if (GM_CONTEXTS.has(transactionContext) && !isGM) return fail('Only a GM can decide a sale request.', ['GM_REQUIRED']);
    if (requestId && this.ledgerHasRequest(actor, requestId)) return fail('This sale request was already completed; nothing was paid again.', ['REQUEST_ALREADY_COMMITTED']);

    const item = actor.items?.get?.(itemId);
    if (!item) return fail('Sold item is no longer owned by this actor', ['ITEM_NOT_FOUND']);
    const data = asData(item);
    const owned = ownedQuantity(data);
    const qty = Number(quantity);
    const fresh = quoteItemResale({ item: data, quantity: qty, source: await this.sourceFor(data), percent: this.policyPercent(), basis: this.policyBasis(), acquisition: this.acquisitionFor(actor, data) });
    if (!fresh.ok && !fresh.needsAppraisal) return fail(`Sale refused: ${fresh.reasons.join(', ')}`, fresh.reasons);

    const { InventoryEngine } = await import('/systems/foundryvtt-swse/scripts/engine/inventory/InventoryEngine.js');
    const blocker = InventoryEngine.removalBlocker(actor, itemId);
    if (blocker) return fail(blocker.message, [blocker.reason]);

    const removeEntirely = UNIQUE_ITEM_TYPES.includes(data.type) || qty === owned;
    // Whatever the authority, selling an Item that claims a purchase lot uses that lot up (a GM appraisal must not leave a copy able to claim it again).
    const claimedLot = data.flags?.['foundryvtt-swse']?.acquisition?.lotId ?? null;
    const base = { quantity: qty, removeEntirely, remainingQuantity: owned - qty, lotDisposal: claimedLot ? { lotId: claimedLot, quantity: qty } : null };

    if (authority === RESALE_AUTHORITY.CANONICAL_AUTOMATIC) {
      if (transactionContext === 'store-haggle-sale') return fail('A counteroffer is a GM appraisal, not a canonical resale.', ['AUTHORITY_CONTEXT_MISMATCH']);
      if (transactionContext === 'store-sale') {
        const auto = this.automaticResaleAllowed(actor);
        if (!auto.allowed) return fail('Automatic resale is not available for this actor; request GM approval.', [auto.reason]);
      }
      if (!fresh.ok) return fail(`No automatic value for this item (${fresh.reasons.join(', ')}); request a GM appraisal.`, fresh.reasons);
      if (shownQuote && !quoteMatches(shownQuote, fresh.quote)) {
        return fail('The offer changed since it was shown. Review the new offer and confirm again.', ['QUOTE_CHANGED'], { quoteChanged: true, freshQuote: fresh.quote });
      }
      return { ok: true, authority, payout: fresh.quote.payout, quote: fresh.quote, appraisal: null, ...base };
    }

    if (authority === RESALE_AUTHORITY.GM_APPRAISAL) {
      if (!isGM) return fail('Only a GM can appraise a sale.', ['GM_REQUIRED']);
      if (!GM_CONTEXTS.has(transactionContext)) return fail('A GM appraisal must be executed as a GM decision.', ['AUTHORITY_CONTEXT_MISMATCH']);
      const v = validateAppraisal({ amount: appraisal?.amount, reason: appraisal?.reason, executingUserIsGM: isGM, gmUserId: user?.id });
      if (!v.ok) return fail(`Appraisal refused: ${v.reasons.join(', ')}`, v.reasons);
      return {
        ok: true, authority, payout: v.amount, quote: null,
        appraisal: { amount: v.amount, reason: v.reason, gmUserId: user.id, gmName: user.name ?? null, canonicalReferencePayout: fresh.ok ? fresh.quote.payout : null, automaticValuationReasons: fresh.ok ? [] : fresh.reasons },
        ...base
      };
    }
    return fail('A sale needs an authority (canonical automatic or GM appraisal).', ['AUTHORITY_REQUIRED']);
  }

  /** Trusted verification for a whole-asset sale (GM appraisal only). */
  static async verifyAssetForCommit({ ownerActor, assetActorId, appraisal, requestId = null }) {
    const user = globalThis.game?.user;
    if (user?.isGM !== true) return fail('Only a GM can approve the sale of a droid or vehicle.', ['GM_REQUIRED']);
    const v = validateAppraisal({ amount: appraisal?.amount, reason: appraisal?.reason, executingUserIsGM: true, gmUserId: user.id });
    if (!v.ok) return fail(`Appraisal refused: ${v.reasons.join(', ')}`, v.reasons);
    if (requestId && this.ledgerHasRequest(ownerActor, requestId)) return fail('This sale request was already completed; nothing was paid again.', ['REQUEST_ALREADY_COMMITTED']);
    const asset = globalThis.game?.actors?.get?.(assetActorId);
    if (!asset) return fail('The asset no longer exists.', ['ASSET_NOT_FOUND']);
    const ownerData = asData(ownerActor), assetData = asData(asset);
    const assessed = assessAssetForResale({ asset: assetData, owner: ownerData, designProject: this.designProjectFor(ownerActor, assetData), acquisition: this.acquisitionFor(ownerActor, assetData), percent: this.policyPercent(), basis: this.policyBasis() });
    if (!assessed.ok) return fail(`Asset cannot be sold: ${assessed.blockers.join(', ')}`, assessed.blockers);

    const gmOwnerships = {};
    for (const u of globalThis.game?.users ?? []) if (u?.isGM) gmOwnerships[u.id] = ownerLevel();
    // The disposition itself is built by TransactionEngine, which owns the transaction id (it must reference the real sale transaction).
    const dispositionInputs = { asset: assetData, owner: ownerData, authority: RESALE_AUTHORITY.GM_APPRAISAL, amount: v.amount, soldBy: user.id, gmOwnerships };
    const undoUpdate = {
      ownership: assetData.ownership ?? { default: 0 },
      'system.ownedByActorId': assetData.system?.ownedByActorId ?? null,
      'system.ownedByActorName': assetData.system?.ownedByActorName ?? null,
      'flags.foundryvtt-swse.-=resale': null
    };
    return { ok: true, asset, amount: v.amount, dispositionInputs, undoUpdate, previous: { ownership: assetData.ownership ?? { default: 0 }, ownedByActorId: assetData.system?.ownedByActorId ?? null }, evidence: { lines: assessed.lines, reference: assessed.reference, kind: assessed.kind },
      appraisal: { amount: v.amount, reason: v.reason, gmUserId: user.id, gmName: user.name ?? null } };
  }

  /** Sealed construction record of a custom ship, from the designer's own project ledger. */
  static designProjectFor(ownerActor, assetData) {
    const designId = assetData?.flags?.swse?.vehicleConstructionCompletion?.designId;
    if (!designId) return null;
    const raw = ownerActor?.flags?.swse?.[VEHICLE_DESIGN_PROJECTS_FLAG] ?? ownerActor?.getFlag?.('swse', VEHICLE_DESIGN_PROJECTS_FLAG);
    return (Array.isArray(raw) ? raw : []).find(p => p?.designId === designId) ?? null;
  }

  /* ---------------- player-facing operations ---------------- */

  /** Automatic sale: executed by the owning player; the engine re-derives and re-checks everything. */
  static async executeAutomaticSale({ actor, itemId, quantity, shownQuote }) {
    return TransactionEngine.executeSaleTransaction({
      actor, itemId, quantity, authority: RESALE_AUTHORITY.CANONICAL_AUTOMATIC, shownQuote,
      requestId: `autosale_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      reason: 'Automatic store sale accepted', transactionContext: 'store-sale',
      audit: { approvalMode: 'automatic', source: 'ResaleService.executeAutomaticSale' }
    }, { validate: true, rederive: true, source: 'ResaleService.executeAutomaticSale' });
  }

  static _newRequestId() { return `sale_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`; }

  /** Queue a request for GM review. The request is a REQUEST: its figures are shown to the GM, never trusted for payment. */
  static async enqueueRequest(request) {
    const pending = SettingsHelper.getArray('pendingSales', []);
    const duplicate = pending.some(e => e?.status === 'Pending' && e.actorId === request.actorId
      && (request.itemId ? e.itemId === request.itemId : e.assetId === request.assetId));
    if (duplicate) return { success: false, error: 'already-pending' };
    pending.push(request);
    await SettingsHelper.set('pendingSales', pending);
    globalThis.Hooks?.callAll?.('swseStoreSaleRequested', { request, actor: globalThis.game?.actors?.get?.(request.actorId) });
    return { success: true, request };
  }

  static async requestItemSale({ actor, itemId, quantity, quote }) {
    const item = actor.items.get(itemId);
    const user = globalThis.game?.user;
    const q = quote?.ok ? quote.quote : null;
    return this.enqueueRequest({
      id: this._newRequestId(), kind: 'sale', type: 'sale', status: 'Pending', source: 'ResaleService',
      actorId: actor.id, actor: actor.name, itemId, item: item.name, itemType: item.type, quantity,
      canonicalQuote: q, needsAppraisal: !q, appraisalReasons: q ? [] : (quote?.reasons ?? []),
      // display figures for the GM list; they are shown, never trusted for payment
      basePrice: q?.publishedUnitCost ?? null, suggestedPrice: q?.payout ?? null, requestedPrice: q?.payout ?? null, noBasePrice: !q,
      evidenceLines: q ? quoteEvidenceLines(q) : [
        `No automatic value: ${(quote?.reasons ?? []).join(', ')}`,
        ...(quote?.reference ? [`Published-cost reference: ${quote.reference.payoutAtPublished} cr for ${quantity} unit(s) (a reference for the GM; never paid automatically)`] : [])
      ],
      timestamp: Date.now(), requestedAt: Date.now(), playerId: user?.id ?? null, playerName: user?.name ?? 'Player'
    });
  }

  static async requestAssetSale({ ownerActor, assetActorId }) {
    const asset = globalThis.game?.actors?.get?.(assetActorId);
    if (!asset) return { success: false, error: 'asset-not-found' };
    const assessed = assessAssetForResale({ asset: asData(asset), owner: asData(ownerActor), designProject: this.designProjectFor(ownerActor, asData(asset)), acquisition: this.acquisitionFor(ownerActor, asData(asset)), percent: this.policyPercent(), basis: this.policyBasis() });
    if (!assessed.ok) return { success: false, error: `asset-not-sellable: ${assessed.blockers.join(', ')}`, blockers: assessed.blockers };
    const user = globalThis.game?.user;
    return this.enqueueRequest({
      id: this._newRequestId(), kind: 'sale', type: 'asset-sale', status: 'Pending', source: 'ResaleService',
      actorId: ownerActor.id, actor: ownerActor.name, assetId: asset.id, item: asset.name, itemType: asset.type, quantity: 1,
      needsAppraisal: true, appraisalReasons: ['WHOLE_ASSET_REQUIRES_GM_APPRAISAL'], evidence: { lines: assessed.lines, reference: assessed.reference, kind: assessed.kind },
      basePrice: assessed.reference.publishedAtPurchase ?? null, suggestedPrice: assessed.reference.policyOffer ?? null, requestedPrice: assessed.reference.policyOffer ?? null, noBasePrice: true,
      evidenceLines: ['Whole assets are always GM-appraised.', ...assessed.lines],
      timestamp: Date.now(), requestedAt: Date.now(), playerId: user?.id ?? null, playerName: user?.name ?? 'Player'
    });
  }
}
