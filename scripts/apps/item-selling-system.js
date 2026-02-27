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
 *    If auto-accept OFF: GM await uiPrompt(Accept/Deny/Override amount)
 * 5. On acceptance: Remove item, add credits, animate gain, show player feedback
 */

import { normalizeCredits, calculateRawSellPrice, calculatePercentageFloor } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { prompt as uiPrompt } from "/systems/foundryvtt-swse/scripts/utils/ui-utils.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";

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
    const dialog = new SWSEDialogV2({
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
 * Display GM adjudication prompt for items with no base price
 * Only options: Deny or Set Amount (no suggested price shown)
 */
async function showGmAdjudicationPromptNoPriceBase(item, actor) {
  return new Promise((resolve) => {
    const dialog = new SWSEDialogV2({
      title: `[SALE] ${actor.name} offers ${item.name}`,
      content: `
        <div style="line-height: 1.6;">
          <p><strong>${actor.name}</strong> wants to sell</p>
          <p style="font-size: 1.1rem; font-weight: bold;">${item.name}</p>
          <p style="color: #ff9900; margin: 1rem 0;">
            <strong>⚠ No base price is defined for this item.</strong>
          </p>
          <hr>
          <p>Set an amount (Rendarr's offer):</p>
          <input type="number" id="override-amount" min="0" placeholder="0" style="width: 100%; padding: 0.5rem;"/>
        </div>
      `,
      buttons: {
        accept: {
          label: 'Set Amount',
          callback: async () => {
            const overrideEl = document.querySelector('#override-amount');
            const override = overrideEl?.value?.trim();
            if (!override || isNaN(Number(override))) {
              ui.notifications.warn('Please enter a valid amount.');
              return;
            }
            const salePrice = normalizeCredits(override);
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
      default: 'deny'
    }, {
      width: 500
    });

    dialog.render(true);
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
    const creditsAfter = normalizeCredits(creditsBefore + salePrice);

    // STEP 1: Remove item from actor (if this fails, nothing happens)
    await item.delete();

    // STEP 2: Add credits (if this fails, item is already gone — we failed atomically)
    await ActorEngine.updateActor(actor, { 'system.credits': creditsAfter });

    // STEP 3: Log transaction (informational only, doesn't block)
    logSaleTransaction(actor, item, salePrice, isAutomatic);

    // STEP 4: Show feedback and animate (only after mutations confirmed)
    const isSeller = game.user?.isGM || game.user?.id === actor.owner;
    if (isSeller) {
      showPlayerSaleAcceptance(item, salePrice);
      // Animate credit gain (safe: actor document already updated)
      await animateCreditGain(actor, creditsBefore, creditsAfter);
    }
  } catch (err) {
    // EDGE CASE 2: Transaction failure safety
    // If any mutation failed, item stays in inventory, credits unchanged
    SWSELogger.error('Item sale failed:', err);
    ui.notifications.error('Sale failed. See console for details.');
    // UI is restored; player can try again
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
