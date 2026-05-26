/**
 * Item Selling System
 *
 * Inventory-driven selling: Players offer items to merchant (Rendarr).
 * GM adjudicates or automation resolves.
 *
 * Architecture:
 * - Separate from Store (no integration)
 * - Player-initiated (inventory context action)
 * - GM approval required (or auto-accept via houserules)
 * - Player-only feedback
 * - Integer credit enforcement
 *
 * Flow:
 * 1. Player clicks "Offer to Merchant" on item
 * 2. Confirmation panel shows base price, RAW offer (50% floored)
 * 3. Player confirms intent
 * 4. If auto-accept ON: Resolve immediately through TransactionEngine
 *    If auto-accept OFF: Queue Store Control approval for GM review
 * 5. On acceptance: TransactionEngine removes item, adds credits, audits, and emits receipts
 */

import { normalizeCredits, calculateRawSellPrice, calculatePercentageFloor } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";

/**
 * Initiate item selling process
 * Called from inventory context action
 * @param {Item} item - Item to sell
 * @param {Actor} actor - Owner of item
 */
export async function initiateItemSale(item, actor) {
  if (!item || !actor) {
    ui.notifications.error('Invalid item or actor.');
    return;
  }

  // Only owned items can be sold
  if (!item.isOwned || item.parent?.id !== actor.id) {
    ui.notifications.warn('You can only sell items you own.');
    return;
  }

  const basePrice = normalizeCredits(item.system?.price ?? 0);

  // EDGE CASE 1: Item with no base price
  // Block automatic selling and percentage math
  if (basePrice === 0) {
    const hasNoPrice = !item.system?.price || isNaN(Number(item.system?.price));
    if (hasNoPrice) {
      // No base price defined — force manual GM override
      showNoPriceDialog(item, actor);
      return;
    }
    // Price is zero but defined — block sale
    ui.notifications.warn(`${item.name} has no sale value.`);
    return;
  }

  const rawOffer = calculateRawSellPrice(basePrice);

  // Show player confirmation UI
  await showSaleConfirmation(item, actor, basePrice, rawOffer);
}

/**
 * Display dialog for items with no base price
 * Requires manual GM override — no auto-accept, no percentage math
 */
async function showNoPriceDialog(item, actor) {
  const confirmed = await SWSEDialogV2.confirm({
    title: 'Offer Item for Sale',
    content: `
      <div style="text-align: center;">
        <h3>${item.name}</h3>
        <p style="margin: 1rem 0; color: #ff9900;">
          <strong>⚠ No base price is defined for this item.</strong>
        </p>
        <p style="font-size: 0.9rem; color: #888;">
          Rendarr will set a price for this item.
        </p>
      </div>
    `,
    defaultYes: true
  });

  if (!confirmed) {
    return;
  }

  // Bypass auto-accept and percentage logic
  // Go directly to GM adjudication with no suggested price
  await resolveSaleNoPriceBase(item, actor);
}

/**
 * Display player confirmation panel
 */
async function showSaleConfirmation(item, actor, basePrice, rawOffer) {
  const confirmed = await SWSEDialogV2.confirm({
    title: 'Offer Item for Sale',
    content: `
      <div style="text-align: center;">
        <h3>${item.name}</h3>
        <p style="margin: 1rem 0;">
          <strong>Base Price:</strong> ${basePrice.toLocaleString()} credits<br>
          <strong>Merchant Offer:</strong> ${rawOffer.toLocaleString()} credits (50% of base)
        </p>
        <p style="font-size: 0.9rem; color: #888;">
          Rendarr will evaluate this offer.
        </p>
      </div>
    `,
    defaultYes: true
  });

  if (!confirmed) {
    return;
  }

  // Player confirmed intent; proceed to resolution
  await resolveSale(item, actor, basePrice, rawOffer);
}

/**
 * Resolve sale for items with no base price
 * Requires manual GM override — no auto-accept, no percentage math
 */
async function resolveSaleNoPriceBase(item, actor) {
  // Bypass automation, go directly to GM adjudication
  await showGmAdjudicationPromptNoPriceBase(item, actor);
}

/**
 * Resolve the sale (auto-accept or GM prompt)
 */
async function resolveSale(item, actor, basePrice, rawOffer) {
  const autoAccept = HouseRuleService.isEnabled('autoAcceptItemSales');

  if (autoAccept) {
    // Auto-accept: Use slider percentage
    const percentage = normalizeCredits(HouseRuleService.getNumber('automaticSalePercentage', 50));
    const salePrice = calculatePercentageFloor(basePrice, percentage);
    await acceptSale(item, actor, salePrice, true);
  } else {
    // Manual: Prompt GM
    await showGmAdjudicationPrompt(item, actor, basePrice, rawOffer);
  }
}

function saleRequestId() {
  return `sale_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function enqueueSaleRequest(item, actor, options = {}) {
  const request = {
    id: saleRequestId(),
    kind: 'sale',
    type: options.requestType || 'sale',
    status: 'Pending',
    actorId: actor.id,
    actor: actor.name,
    itemId: item.id,
    item: item.name,
    itemType: item.type,
    quantity: normalizeCredits(item.system?.quantity ?? item.system?.equippedQty ?? 1) || 1,
    basePrice: options.basePrice ?? null,
    suggestedPrice: options.suggestedPrice ?? null,
    requestedPrice: options.requestedPrice ?? options.suggestedPrice ?? null,
    value: options.requestedPrice ?? options.suggestedPrice ?? null,
    noBasePrice: options.noBasePrice === true,
    timestamp: Date.now(),
    requestedAt: Date.now(),
    playerId: game.user?.id ?? null,
    playerName: game.user?.name ?? 'Player',
    source: 'ItemSellingSystem',
    itemData: item.toObject?.() || { id: item.id, name: item.name, type: item.type }
  };

  const pendingSales = SettingsHelper.getArray('pendingSales', []);
  const duplicate = pendingSales.some(entry => entry?.status === 'Pending' && entry.actorId === actor.id && entry.itemId === item.id);
  if (duplicate) {
    ui.notifications.warn(`${item.name} is already awaiting GM sale review.`);
    return;
  }

  pendingSales.push(request);
  await SettingsHelper.set('pendingSales', pendingSales);

  SWSELogger.info('[SWSE Selling] Sale request queued for GM Store Control', {
    requestId: request.id,
    actor: actor.id,
    item: item.name,
    suggestedPrice: request.suggestedPrice
  });

  ui.notifications.info(`${item.name} has been sent to the GM Store Control approvals queue.`);
  Hooks.callAll?.('swseStoreSaleRequested', { request, actor, item });
}

/**
 * Display GM adjudication prompt
 */
async function showGmAdjudicationPrompt(item, actor, basePrice, rawOffer) {
  await enqueueSaleRequest(item, actor, {
    basePrice,
    suggestedPrice: rawOffer,
    requestedPrice: rawOffer,
    noBasePrice: false,
    requestType: 'sale'
  });
}

/**
 * Display GM adjudication prompt for items with no base price
 * Only options: Deny or Set Amount (no suggested price shown)
 */
async function showGmAdjudicationPromptNoPriceBase(item, actor) {
  await enqueueSaleRequest(item, actor, {
    basePrice: null,
    suggestedPrice: null,
    requestedPrice: null,
    noBasePrice: true,
    requestType: 'sale'
  });
}

/**
 * Accept a sale: Remove item, add credits, animate, feedback
 *
 * TRANSACTION SAFETY GUARANTEES:
 * - If ANY error occurs during mutation, no animation plays
 * - Item deletion and credit addition are both atomic (all-or-nothing)
 * - Animations and feedback ONLY trigger after both mutations succeed
 * - No partial state: item either sold (both deleted + credited) or untouched
 * - Player never sees speculative/animated values
 */
async function acceptSale(item, actor, salePrice, isAutomatic) {
  try {
    const creditsBefore = normalizeCredits(actor.system?.credits ?? 0);
    const result = await TransactionEngine.executeSaleTransaction({
      actor,
      itemId: item.id,
      salePrice,
      reason: isAutomatic ? 'Automatic store sale accepted' : 'GM approved store sale',
      transactionContext: isAutomatic ? 'store-sale' : 'store-sale-approval',
      audit: {
        itemName: item.name,
        itemNames: [item.name],
        itemCount: 1,
        basePrice: normalizeCredits(item.system?.price ?? 0),
        approvalMode: isAutomatic ? 'automatic' : 'manual',
        source: 'ItemSellingSystem.acceptSale'
      }
    }, {
      validate: true,
      rederive: true,
      source: 'ItemSellingSystem.acceptSale'
    });

    if (!result.success) {
      ui.notifications.error(`Sale failed: ${result.error}`);
      return;
    }

    logSaleTransaction(actor, item, salePrice, isAutomatic, result.transactionId);

    const isSeller = game.user?.isGM || game.user?.id === actor.owner;
    if (isSeller) {
      showPlayerSaleAcceptance(item, salePrice);
      await animateCreditGain(actor, creditsBefore, result.creditsAfter ?? normalizeCredits(creditsBefore + salePrice));
    }
  } catch (err) {
    SWSELogger.error('Item sale failed:', err);
    ui.notifications.error('Sale failed. See console for details.');
  }
}

/**
 * Deny a sale
 */
function denySale(item, actor) {
  // Optional: Could show flavor denial message to player
  // For now, silent denial is acceptable
  console.log(`[SWSE Selling] Sale of ${item.name} denied by GM.`);
}

/**
 * Show player-only acceptance feedback
 */
function showPlayerSaleAcceptance(item, salePrice) {
  ui.notifications.info(`Rendarr accepts your sale of ${item.name} for ${salePrice.toLocaleString()} credits.`);
}

/**
 * Animate credit gain (reverse of checkout animation)
 */
async function animateCreditGain(actor, creditsBefore, creditsAfter) {
  const creditDisplay = document.querySelector('[data-item-id] .credits-display, .credit-wallet .remaining-credits, [class*="credit"]');
  if (!creditDisplay) {
    return;
  }

  const reduceMotion = game.user?.getFlag?.('core', 'reduce-motion') ?? false;

  if (reduceMotion) {
    // Skip animation, instant update
    creditDisplay.textContent = creditsAfter.toLocaleString();
    return;
  }

  // Animate upward from before to after
  creditDisplay.classList.add('credits-gaining');

  const startTime = performance.now();
  const duration = 600;

  const animate = (currentTime) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease-out curve
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(creditsBefore + (creditsAfter - creditsBefore) * easeProgress);

    creditDisplay.textContent = current.toLocaleString();

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      creditDisplay.classList.remove('credits-gaining');
      creditDisplay.textContent = creditsAfter.toLocaleString();
    }
  };

  requestAnimationFrame(animate);

  return new Promise(resolve => {
    setTimeout(resolve, duration);
  });
}

/**
 * Log sale to GM console
 */
function logSaleTransaction(actor, item, salePrice, isAutomatic, transactionId = null) {
  const mode = isAutomatic ? 'AUTOMATIC' : 'MANUAL';
  SWSELogger.info(
    `[ITEM SOLD] ${actor.name} sold ${item.name} for ${salePrice.toLocaleString()} cr [${mode}]`,
    { transactionId }
  );
}
