/**
 * resale-ui.js — presentation for selling. Collects a quantity and a confirmation and shows the EXACT verified offer.
 * It decides nothing financial: quotes come from ResaleService (resale-authority.js), money moves in TransactionEngine,
 * which re-derives the payout at commit. A changed offer is never applied silently: the seller is asked again.
 */
import { ResaleService, quoteEvidenceLines } from '/systems/foundryvtt-swse/scripts/engine/store/resale-service.js';
import { STACKABLE_ITEM_TYPES, ownedQuantity } from '/systems/foundryvtt-swse/scripts/engine/store/resale-authority.js';

const esc = text => foundry.utils.escapeHTML?.(String(text ?? '')) ?? String(text ?? '');
const confirm = (title, html) => foundry.applications.api.DialogV2.confirm({ window: { title }, content: html, rejectClose: false });

async function askQuantity(item, owned) {
  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Sell ${item.name}` },
    content: `<p>You own ${owned}. How many do you want to sell?</p><label>Quantity <input type="number" name="quantity" min="1" max="${owned}" step="1" value="1" autofocus></label>`,
    ok: { label: 'Continue', callback: (_ev, button) => Number(button.form.elements.quantity.value) },
    rejectClose: false
  });
  return Number.isInteger(result) && result >= 1 && result <= owned ? result : null;
}

/** Sell an owned embedded Item (any sheet's "Sell" action). */
export async function initiateResale(item, actor, { attempt = 0 } = {}) {
  if (!item || !actor) { ui.notifications.error('Invalid item or actor.'); return; }
  if (!item.isOwned || item.parent?.id !== actor.id) { ui.notifications.warn('You can only sell items you own.'); return; }
  const data = item.toObject();
  const owned = ownedQuantity(data) ?? 1;
  let quantity = 1;
  if (STACKABLE_ITEM_TYPES.includes(item.type) && owned > 1) {
    quantity = await askQuantity(item, owned);
    if (!quantity) return;
  }

  const quote = await ResaleService.quoteOwnedItem({ actor, itemId: item.id, quantity });
  if (!quote.ok && !quote.needsAppraisal) {
    ui.notifications.warn(`${item.name} cannot be sold (${quote.reasons.join(', ')}).`);
    return;
  }

  if (!quote.ok) {
    const unverified = quote.reasons.includes('UNVERIFIED_ACQUISITION') || quote.reasons.includes('QUANTITY_EXCEEDS_VERIFIED_PURCHASE');
    const why = unverified
      ? 'The system has no verified Store purchase on record for this item (or for that many units), so it cannot pay for it automatically. Loot, GM grants and older items are valued by the GM.'
      : `This item has no automatic resale value (${esc(quote.reasons.join(', '))}).`;
    const go = await confirm('No automatic value', `<h3>${esc(item.name)}</h3><p>${why}</p><p>You can ask the GM to appraise it. Nothing is sold until the GM sets an offer and approves.</p>`);
    if (!go) return;
    const queued = await ResaleService.requestItemSale({ actor, itemId: item.id, quantity, quote });
    ui.notifications[queued.success ? 'info' : 'warn'](queued.success ? `${item.name} was sent to the GM for appraisal.` : `${item.name} is already awaiting GM review.`);
    return;
  }

  const q = quote.quote;
  const auto = ResaleService.automaticResaleAllowed(actor);
  const lines = quoteEvidenceLines(q).map(l => `<li>${esc(l)}</li>`).join('');
  const go = await confirm('Offer item for sale', `<h3>${esc(item.name)}${quantity > 1 ? ` ×${quantity}` : ''}</h3><p><strong>Offer: ${q.payout.toLocaleString()} credits</strong></p><ul>${lines}</ul><p>${auto.allowed ? 'The merchant pays this immediately.' : 'This offer goes to the GM for approval.'}</p>`);
  if (!go) return;

  if (!auto.allowed) {
    const queued = await ResaleService.requestItemSale({ actor, itemId: item.id, quantity, quote });
    ui.notifications[queued.success ? 'info' : 'warn'](queued.success ? `${item.name} was sent to the GM for approval at ${q.payout.toLocaleString()} credits.` : `${item.name} is already awaiting GM review.`);
    return;
  }
  const result = await ResaleService.executeAutomaticSale({ actor, itemId: item.id, quantity, shownQuote: q });
  if (result.success) {
    ui.notifications.info(`Sold ${quantity > 1 ? `${quantity} × ` : ''}${item.name} for ${result.amount.toLocaleString()} credits.`);
  } else if (result.quoteChanged && attempt < 2) {
    ui.notifications.warn('The offer changed. Please review the new offer.');
    await initiateResale(item, actor, { attempt: attempt + 1 });
  } else {
    ui.notifications.error(`Sale failed: ${result.error}`);
  }
}

/** Ask the GM to appraise the sale of a whole Droid or Vehicle (Asset Bay). Never automatic. */
export async function initiateAssetResale(assetActor, ownerActor) {
  if (!assetActor || !ownerActor) { ui.notifications.error('Invalid asset or owner.'); return; }
  const go = await confirm('Request sale', `<h3>${esc(assetActor.name)}</h3><p>Droids and vehicles are sold through a GM appraisal. The GM sees the verified purchase record and any construction record, then sets the offer.</p><p>Nothing changes until the GM approves. If approved, ${esc(assetActor.name)} leaves your possession and you are paid the appraised amount.</p>`);
  if (!go) return;
  const queued = await ResaleService.requestAssetSale({ ownerActor, assetActorId: assetActor.id });
  if (queued.success) ui.notifications.info(`${assetActor.name} was sent to the GM for appraisal.`);
  else ui.notifications.warn(queued.error === 'already-pending' ? `${assetActor.name} is already awaiting GM review.` : `${assetActor.name} cannot be sold: ${queued.error}`);
}
