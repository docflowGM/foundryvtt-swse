/**
 * store-droid-construction.js
 * ---------------------------
 * Commerce lifecycle for a Store-originated custom Droid. The Store never interprets droid construction rules: the
 * price, installed components and legitimate free grants come from the shared construction-quote authority
 * (domain/droids/droid-build-quote.js), which the progression Droid Builder also uses for its running totals.
 *
 *   Store button -> launch token (this module, in-memory, one-shot)
 *     -> existing Droid Builder (single-step 'droidBuilder')
 *     -> finalizer: verifies the token, normalizes the committed build to IDENTITIES, re-quotes   (submitStoreDroidConstruction)
 *     -> pending request (identity snapshot + quote; no actor is created, nothing is charged)
 *     -> GM approval: re-quotes from the stored identities, refuses on any change, GM sees the quoted amount
 *     -> StoreEngine.purchase: exact price check, debit + droid creation + owner link in ONE commerce transaction
 *
 * A client-held cost, total, `isGranted`/`isDefault` flag or `droidCredits` value is never read as authority.
 */
import { quoteDroidBuild } from '/systems/foundryvtt-swse/scripts/domain/droids/droid-build-quote.js';
import { normalizeCredits } from '/systems/foundryvtt-swse/scripts/utils/credit-normalization.js';
import { SettingsHelper } from '/systems/foundryvtt-swse/scripts/utils/settings-helper.js';

export const STORE_DROID_APPROVAL_KIND = 'store-droid-construction';
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000;

/* ---------------- launch context (non-spoofable: process memory, never persisted) ---------------- */

const _tokens = new Map();   // token -> { ownerActorId, userId, createdAt }

const newToken = () => {
  const id = globalThis.foundry?.utils?.randomID?.(24);
  return id || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

/** Called by the Store button. The returned token is the only thing that lets the finalizer accept a Store droid build. */
export function beginStoreDroidConstruction(ownerActor, userId, now = Date.now()) {
  if (!ownerActor?.id || !userId) throw new Error('STORE_DROID_CONSTRUCTION_REQUIRES_OWNER_AND_USER');
  const token = newToken();
  _tokens.set(token, { ownerActorId: ownerActor.id, userId, createdAt: now });
  return token;
}

/** One-shot: a token verifies once, for the user and actor it was issued to, within its lifetime. */
export function consumeStoreDroidConstructionToken(token, userId, now = Date.now()) {
  const entry = typeof token === 'string' ? _tokens.get(token) : null;
  if (!entry) return null;
  _tokens.delete(token);
  if (entry.userId !== userId || now - entry.createdAt > TOKEN_TTL_MS) return null;
  return { ownerActorId: entry.ownerActorId };
}

export function _resetStoreDroidConstructionTokens() { _tokens.clear(); }

/* ---------------- request construction (pure) ---------------- */

const describeLines = quote => quote.lines
  .map(l => `${l.name ?? l.id}${l.grant ? ` (granted: ${l.grant})` : ''} — ${l.credits} cr`).join('\n');

/**
 * @returns {{ok:boolean, record?:object, quote?:object, reasons:string[]}}
 */
export function buildDroidConstructionRequest({ selection, name, ownerActor, userId, now = Date.now(), requestId = `pending_droid_build_${now}_${Math.random().toString(36).slice(2, 9)}` }) {
  if (!ownerActor?.id) return { ok: false, reasons: ['OWNER_REQUIRED'] };
  // A Store droid has no species constraint; a selection that carries one is not a Store build.
  if (selection?.speciesDroidBuilder) return { ok: false, reasons: ['SPECIES_CONTEXT_NOT_ALLOWED_FOR_STORE_CONSTRUCTION'] };
  const quote = quoteDroidBuild(selection, { speciesDroidBuilder: null });
  if (quote.status !== 'OK') return { ok: false, quote, reasons: [`QUOTE_${quote.status}`, ...quote.reasons] };
  // A build made only of baseline grants costs nothing: there is nothing to acquire through commerce.
  if (!(quote.totalCredits > 0)) return { ok: false, quote, reasons: ['QUOTE_HAS_NO_PURCHASABLE_COMPONENTS'] };
  const droidName = String(name ?? '').trim() || 'Custom Droid';
  const total = normalizeCredits(quote.totalCredits);
  const record = {
    id: requestId,
    type: 'store-item',
    approvalKind: STORE_DROID_APPROVAL_KIND,
    ownerPlayerId: userId ?? null,
    ownerActorId: ownerActor.id,
    ownerActorName: ownerActor.name ?? '',
    costCredits: total,
    requestedAt: now,
    buildSnapshot: quote.snapshot,
    quote: { schema: quote.provenance.schema, snapshotHash: quote.provenance.snapshotHash, totalCredits: total, grants: quote.grants },
    approvalItems: [{ id: requestId, policyId: null, name: droidName, type: 'droid', sourceBucket: 'droids', cost: total, finalCost: total, condition: null }],
    draftData: { name: droidName, type: 'store-item', cost: total, details: describeLines(quote), description: `Custom droid built by ${ownerActor.name ?? 'a player'}, quoted ${total} cr` }
  };
  return { ok: true, record, quote, reasons: [] };
}

/**
 * GM-approval boundary: re-quote from the stored IDENTITIES and refuse on any difference from what was shown.
 * @returns {{ok:boolean, quote?:object, total?:number, reasons:string[]}}
 */
export function verifyDroidConstructionApproval(approval) {
  const reasons = [];
  if (approval?.approvalKind !== STORE_DROID_APPROVAL_KIND) return { ok: false, reasons: ['NOT_A_DROID_CONSTRUCTION_REQUEST'] };
  const quote = quoteDroidBuild(approval.buildSnapshot, { speciesDroidBuilder: null });
  if (quote.status !== 'OK') return { ok: false, quote, reasons: [`QUOTE_${quote.status}`, ...quote.reasons] };
  const total = normalizeCredits(quote.totalCredits);
  if (!(total > 0)) reasons.push('QUOTE_HAS_NO_PURCHASABLE_COMPONENTS');
  if (total !== normalizeCredits(approval.costCredits)) reasons.push(`QUOTE_CHANGED: recorded ${approval.costCredits}, current ${total}`);
  if (approval.quote?.snapshotHash !== quote.provenance.snapshotHash) reasons.push('SNAPSHOT_CHANGED_SINCE_QUOTE');
  const line = Array.isArray(approval.approvalItems) ? approval.approvalItems[0] : null;
  if (!line || approval.approvalItems.length !== 1 || normalizeCredits(line.finalCost) !== total) reasons.push('APPROVAL_LINE_DOES_NOT_MATCH_QUOTE');
  return { ok: reasons.length === 0, quote, total, reasons };
}

/** Delivered Droid actor data, rebuilt from the re-quoted lines (never from the player's record). */
export function buildCustomDroidActorData({ quote, name, approvalId, owner }) {
  const out = { locomotion: null, processor: null, appendages: [], accessories: [], locomotionEnhancements: [], appendageEnhancements: [] };
  for (const l of quote.lines) {
    const entry = { id: l.id, name: l.name, cost: l.credits, weight: l.weight, quoteStatus: 'OK', quoteBlockingReason: null, isGranted: !!l.grant };
    if (l.group === 'locomotion') out.locomotion = { ...entry, speed: l.speed ?? null, isDefault: l.grant === 'default-locomotion' };
    else if (l.group === 'processor') out.processor = entry;
    else if (l.group === 'appendage') out.appendages.push(entry);
    else if (l.group === 'accessory') out.accessories.push({ ...entry, category: l.subcategory, data: l.definition });
    else if (l.group === 'locomotionEnhancement') out.locomotionEnhancements.push(entry);
    else if (l.group === 'appendageEnhancement') out.appendageEnhancements.push(entry);
  }
  const totalCost = normalizeCredits(quote.totalCredits);
  return {
    name: String(name || 'Custom Droid'),
    type: 'droid',
    img: 'icons/svg/mystery-man.svg',
    system: {
      isDroid: true,
      droidDegree: quote.snapshot.degree,
      droidSize: quote.snapshot.size,
      droidSystems: {
        ...out, degree: quote.snapshot.degree, size: quote.snapshot.size, stateMode: 'FINALIZED',
        totalCost, totalWeight: quote.totalWeight, credits: { spent: totalCost }
      },
      storeAcquisition: { source: STORE_DROID_APPROVAL_KIND, approvalId, quoteHash: quote.provenance.snapshotHash, costCredits: totalCost, ownerActorId: owner?.id ?? null, ownerActorName: owner?.name ?? null }
    },
    flags: { swse: { storeDroidConstruction: { approvalId, quoteHash: quote.provenance.snapshotHash, totalCredits: totalCost, grants: quote.grants } } }
  };
}

/** Has this approval already been delivered and charged? (duplicate-execution guard, read from the commerce ledger) */
export function constructionAlreadyDelivered(ledgerRecords, approvalId) {
  return (ledgerRecords ?? []).some(tx => (tx.status === 'Success' || tx.status === undefined) && (tx.itemIds ?? []).includes(approvalId));
}

/**
 * Finalizer entry point for a Store droid build. Verifies the launch token, re-quotes from identities and queues the request.
 * No actor is created and nothing is charged here.
 * @returns {Promise<{success:boolean, error?:string, record?:object, total?:number, message?:string}>}
 */
export async function submitStoreDroidConstruction({ token, selection, name = null } = {}) {
  const userId = globalThis.game?.user?.id ?? null;
  const ctx = consumeStoreDroidConstructionToken(token, userId);
  if (!ctx) return { success: false, error: 'STORE_DROID_CONSTRUCTION_CONTEXT_INVALID: this build was not started from the Store, or its launch authorization was already used or expired.' };
  const ownerActor = globalThis.game?.actors?.get?.(ctx.ownerActorId) ?? null;
  if (!ownerActor || ownerActor.isOwner !== true) return { success: false, error: 'STORE_DROID_CONSTRUCTION_OWNER_UNAVAILABLE: the buying character is not available to you.' };
  const built = buildDroidConstructionRequest({ selection, name, ownerActor, userId });
  if (!built.ok) return { success: false, error: `STORE_DROID_CONSTRUCTION_REFUSED: ${built.reasons.join('; ')}` };
  const pending = SettingsHelper.getArray('pendingCustomPurchases', []);
  pending.push(built.record);
  await SettingsHelper.set('pendingCustomPurchases', pending);
  globalThis.Hooks?.callAll?.('swseStoreApprovalRequested', { approval: built.record, actor: ownerActor });
  return { success: true, record: built.record, total: built.record.costCredits,
    message: `Droid design quoted at ${built.record.costCredits.toLocaleString()} credits and submitted for GM approval. Nothing is charged until the GM approves.` };
}
