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
 * 4. If auto-accept ON: Resolve immediately
 *    If auto-accept OFF: GM prompt (Accept/Deny/Override amount)
 * 5. On acceptance: Remove item, add credits, animate gain, show player feedback
 */

import { normalizeCredits, calculateRawSellPrice, calculatePercentageFloor } from '../utils/credit-normalization.js';
import { SWSELogger } from '../utils/logger.js';

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
  if (basePrice === 0) {
    ui.notifications.warn(`${item.name} has no sale value.`);
    return;
  }

  const rawOffer = calculateRawSellPrice(basePrice);

  // Show player confirmation UI
  await showSaleConfirmation(item, actor, basePrice, rawOffer);
}

/**
 * Display player confirmation panel
 */
async function showSaleConfirmation(item, actor, basePrice, rawOffer) {
  const confirmed = await Dialog.confirm({
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
 * Resolve the sale (auto-accept or GM prompt)
 */
async function resolveSale(item, actor, basePrice, rawOffer) {
  const autoAccept = game.settings.get('foundryvtt-swse', 'autoAcceptItemSales') ?? false;

  if (autoAccept) {
    // Auto-accept: Use slider percentage
    const percentage = normalizeCredits(game.settings.get('foundryvtt-swse', 'automaticSalePercentage') ?? 50);
    const salePrice = calculatePercentageFloor(basePrice, percentage);
    await acceptSale(item, actor, salePrice, true);
  } else {
    // Manual: Prompt GM
    await showGmAdjudicationPrompt(item, actor, basePrice, rawOffer);
  }
}

/**
 * Display GM adjudication prompt
 */
async function showGmAdjudicationPrompt(item, actor, basePrice, rawOffer) {
  return new Promise((resolve) => {
    const dialog = new Dialog({
      title: `[SALE] ${actor.name} offers ${item.name}`,
      content: `
        <div style="line-height: 1.6;">
          <p><strong>${actor.name}</strong> wants to sell</p>
          <p style="font-size: 1.1rem; font-weight: bold;">${item.name}</p>
          <p>
            <strong>Base Price:</strong> ${basePrice.toLocaleString()} cr<br>
            <strong>Suggested Offer (RAW 50%):</strong> ${rawOffer.toLocaleString()} cr
          </p>
          <hr>
          <p>Override amount (leave blank to use suggested):</p>
          <input type="number" id="override-amount" placeholder="${rawOffer}" style="width: 100%; padding: 0.5rem;"/>
        </div>
      `,
      buttons: {
        accept: {
          label: 'Accept',
          callback: async () => {
            const overrideEl = document.querySelector('#override-amount');
            const override = overrideEl?.value?.trim();
            const salePrice = override ? normalizeCredits(override) : rawOffer;
            await acceptSale(item, actor, salePrice, false);
            resolve();
          }
        },
        deny: {
          label: 'Deny',
          callback: async () => {
            denySale(item, actor);
            resolve();
          }
        }
      },
      default: 'accept'
    }, {
      width: 500
    });

    dialog.render(true);
  });
}

/**
 * Accept a sale: Remove item, add credits, animate, feedback
 */
async function acceptSale(item, actor, salePrice, isAutomatic) {
  try {
    const creditsBefore = normalizeCredits(actor.system?.credits ?? 0);
    const creditsAfter = normalizeCredits(creditsBefore + salePrice);

    // Remove item from actor
    await item.delete();

    // Add credits
    await actor.update({ 'system.credits': creditsAfter });

    // Log transaction
    logSaleTransaction(actor, item, salePrice, isAutomatic);

    // Show player-only feedback (only to owner)
    if (game.user?.id === actor.getUserLevel(game.user.id)) {
      showPlayerSaleAcceptance(item, salePrice);
      // Animate credit gain
      await animateCreditGain(actor, creditsBefore, creditsAfter);
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
function logSaleTransaction(actor, item, salePrice, isAutomatic) {
  const mode = isAutomatic ? 'AUTOMATIC' : 'MANUAL';
  SWSELogger.info(
    `[ITEM SOLD] ${actor.name} sold ${item.name} for ${salePrice.toLocaleString()} cr [${mode}]`
  );
}
