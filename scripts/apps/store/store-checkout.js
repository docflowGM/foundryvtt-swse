/**
 * Purchase and checkout functionality for SWSE Store
 * UI-only module: Coordinates with StoreEngine for all business logic
 *
 * ARCHITECTURE:
 * - Cart management (transient UI state)
 * - Inventory lookup (via engine-provided store.itemsById, with finalCost pre-calculated)
 * - Business logic (ALL delegated to StoreEngine)
 */

import { ProgressionEngine } from '../../engines/progression/engine/progression-engine.js';
import { StoreEngine } from '../../engines/store/store-engine.js';
import { SWSELogger } from '../../utils/logger.js';
import { normalizeCredits } from '../../utils/credit-normalization.js';
import { calculateFinalCost, calculateUsedCost } from '../../engines/store/pricing.js';
import CharacterGenerator from '../chargen/chargen-main.js';
import { VehicleModificationApp } from '../vehicle-modification-app.js';
import { DroidBuilderApp } from '../droid-builder-app.js';
import { getRandomDialogue } from './store-shared.js';
import { SWSEVehicleHandler } from '../../actors/vehicle/swse-vehicle-handler.js';
import { createActor } from '../../core/document-api-v13.js';
import { ActorEngine } from '../../actors/engine/actor-engine.js';

/**
 * Add item to shopping cart
 * @param {Object} store - Store instance (this)
 * @param {string} itemId - ID of item to add
 * @param {Function} updateDialogueCallback - Callback to update dialogue
 */
export async function addItemToCart(store, itemId, updateDialogueCallback) {
    if (!itemId) {
        ui.notifications.warn('Invalid item selection. The item may be missing an ID.');
        SWSELogger.error('SWSE Store | addItemToCart called with empty itemId');
        return;
    }

    // Try to get from world items first, then from our cached map
    let item = game.items.get(itemId);
    if (!item) {
        item = store.itemsById.get(itemId);
    }

    // If still not found, search by both id and _id properties
    // This handles cases where Documents are indexed by runtime id but template uses _id
    if (!item) {
        for (const [key, value] of store.itemsById.entries()) {
            if (value.id === itemId || value._id === itemId) {
                item = value;
                break;
            }
        }
    }

    if (!item) {
        // Check if this is a fallback ID (generated for items without proper IDs)
        if (itemId.startsWith('fallback-')) {
            ui.notifications.error('This item has an invalid ID and cannot be purchased. Please contact the GM.');
            SWSELogger.error(`SWSE Store | Item with fallback ID cannot be purchased: ${itemId}`);
        } else {
            ui.notifications.error(`Item not found: ${itemId}`);
            SWSELogger.error(`SWSE Store | Item ID not found in world or store cache: ${itemId}`, {
                itemId,
                itemsByIdKeys: Array.from(store.itemsById.keys()).slice(0, 10)
            });
        }
        return;
    }

    // Engine provides finalCost already calculated
    const finalCost = normalizeCredits(item.finalCost);

    // Add to cart
    store.cart.items.push({
        id: itemId,
        name: item.name,
        img: item.img,
        cost: finalCost,
        item: item
    });

    ui.notifications.info(`${item.name} added to cart.`);

    // Update Rendarr's dialogue
    const dialogue = getRandomDialogue('purchase');
    if (updateDialogueCallback) {
        updateDialogueCallback(dialogue);
    }
}

/**
 * Add droid to shopping cart
 * @param {Object} store - Store instance (this)
 * @param {string} actorId - ID of droid actor
 * @param {Function} updateDialogueCallback - Callback to update dialogue
 */
export async function addDroidToCart(store, actorId, updateDialogueCallback) {
    if (!actorId) {
        ui.notifications.warn('Invalid droid selection.');
        return;
    }

    // ENGINE: Lookup from store inventory (which has finalCost pre-calculated)
    let droidTemplate = store.itemsById.get(actorId);

    if (!droidTemplate) {
        ui.notifications.error('Droid not found in inventory.');
        SWSELogger.error('SWSE Store | Droid not found:', { actorId });
        return;
    }

    // Engine provides finalCost
    const finalCost = normalizeCredits(droidTemplate.finalCost);

    // Add to cart
    store.cart.droids.push({
        id: actorId,
        name: droidTemplate.name,
        cost: finalCost,
        actor: droidTemplate
    });

    ui.notifications.info(`${droidTemplate.name} added to cart.`);

    // Update Rendarr's dialogue
    const dialogue = getRandomDialogue('purchase');
    if (updateDialogueCallback) {
        updateDialogueCallback(dialogue);
    }
}

/**
 * Add vehicle to shopping cart
 * @param {Object} store - Store instance (this)
 * @param {string} actorId - ID of vehicle actor
 * @param {string} condition - "new" or "used"
 * @param {Function} updateDialogueCallback - Callback to update dialogue
 */
export async function addVehicleToCart(store, templateId, condition, updateDialogueCallback) {
    if (!templateId) {
        ui.notifications.warn('Invalid vehicle selection.');
        return;
    }

    // ENGINE: Vehicles have both finalCost (new) and finalCostUsed (used) pre-calculated
    const vehicleTemplate = store.itemsById?.get(templateId);

    if (!vehicleTemplate || vehicleTemplate.type !== 'vehicle') {
        ui.notifications.error('Vehicle template not found.');
        return;
    }

    // Engine provides both prices
    const finalCost = condition === 'used'
      ? normalizeCredits(vehicleTemplate.finalCostUsed)
      : normalizeCredits(vehicleTemplate.finalCost);

    store.cart.vehicles.push({
        id: templateId,
        name: vehicleTemplate.name,
        cost: finalCost,
        condition: condition,
        template: vehicleTemplate
    });

    ui.notifications.info(`${condition === 'used' ? 'Used' : 'New'} ${vehicleTemplate.name} added to cart.`);

    const dialogue = getRandomDialogue('purchase');
    if (updateDialogueCallback) {
        updateDialogueCallback(dialogue);
    }
}

/**
 * @deprecated Services are not store inventory items.
 * Services are contextual expenses managed separately by GMs.
 * Do not use this function — it is dead code.
 *
 * Services are filtered out by normalizer.js and do not appear in store inventory.
 * For service expenses, use a dedicated Services module or manual GM handling.
 *
 * Purchase a service (immediate credit deduction)
 * DELEGATED TO ENGINE: Business logic moved to StoreEngine.purchase()
 *
 * @param {Object} actor - Actor purchasing the service
 * @param {string} serviceName - Name of the service
 * @param {number} serviceCost - Cost of the service
 * @param {Function} updateDialogueCallback - Callback to update dialogue
 * @param {Function} rerenderCallback - Callback to re-render the app
 */
export async function buyService(actor, serviceName, serviceCost, updateDialogueCallback, rerenderCallback) {
    if (!serviceName) {
        ui.notifications.warn('Invalid service selection.');
        return;
    }

    // DELEGATED TO ENGINE: Check eligibility
    const eligible = StoreEngine.canPurchase({
        actor,
        items: [],
        totalCost: serviceCost
    });

    if (!eligible.canPurchase) {
        ui.notifications.error(eligible.reason || 'Cannot purchase service.');
        return;
    }

    // DELEGATED TO ENGINE: Execute purchase
    const result = await StoreEngine.purchase({
        actor,
        items: [],
        totalCost: serviceCost,
        itemGrantCallback: null
    });

    if (!result.success) {
        ui.notifications.error(`Purchase failed: ${result.error}`);
        return;
    }

    ui.notifications.info(`${serviceName} purchased for ${serviceCost} credits.`);

    // Update Rendarr's dialogue
    const dialogue = getRandomDialogue('purchase');
    if (updateDialogueCallback) {
        updateDialogueCallback(dialogue);
    }

    // Re-render to update credit display
    if (rerenderCallback) {
        rerenderCallback();
    }
}

/**
 * Buy a droid (creates actor and assigns ownership)
 * DELEGATED TO ENGINE: Credit deduction via StoreEngine.purchase()
 *
 * @param {Object} store - Store instance
 * @param {string} actorId - ID of droid template
 */
export async function buyDroid(store, actorId) {
    if (!actorId) {
        ui.notifications.warn('Invalid droid selection.');
        return;
    }

    // ENGINE: Lookup from store inventory (which has finalCost pre-calculated)
    const droidTemplate = store.itemsById?.get(actorId);

    if (!droidTemplate || droidTemplate.type !== 'droid') {
        ui.notifications.error('Droid not found in inventory.');
        SWSELogger.error('SWSE Store | Droid not found:', { actorId });
        return;
    }

    // Engine provides finalCost
    const finalCost = Number(droidTemplate.finalCost) || 0;

    // DELEGATED TO ENGINE: Check eligibility
    const eligible = StoreEngine.canPurchase({
        actor: store.actor,
        items: [{ id: actorId, name: droidTemplate.name }],
        totalCost: finalCost
    });

    if (!eligible.canPurchase) {
        ui.notifications.warn(eligible.reason || 'Cannot purchase droid.');
        return;
    }

    // Confirm purchase
    const confirmed = await SWSEDialogV2.confirm({
        title: 'Confirm Droid Purchase',
        content: `<p>Purchase <strong>${droidTemplate.name}</strong> for <strong>${finalCost.toLocaleString()}</strong> credits?</p>
                 <p>A new droid actor will be created and assigned to you.</p>`,
        defaultYes: true
    });

    if (!confirmed) {return;}

    try {
        // DELEGATED TO ENGINE: Execute purchase (credit deduction)
        const result = await StoreEngine.purchase({
            actor: store.actor,
            items: [droidTemplate],
            totalCost: finalCost,
            itemGrantCallback: async (actor, items) => {
                // Create droid actor with player ownership (UI responsibility)
                const droidData = droidTemplate.toObject();
                droidData.name = `${droidTemplate.name} (${store.actor.name}'s)`;
                droidData.ownership = {
                    default: 0,
                    [game.user.id]: 3  // Owner permission
                };
                await createActor(droidData);
            }
        });

        if (!result.success) {
            ui.notifications.error(`Purchase failed: ${result.error}`);
            return;
        }

        ui.notifications.info(`${droidTemplate.name} purchased! Check your actors list.`);
        store.render();
    } catch (err) {
        SWSELogger.error('SWSE Store | Droid purchase failed:', err);
        ui.notifications.error('Failed to complete droid purchase.');
    }
}

/**
 * Buy a vehicle (new or used, creates actor)
 * @param {Object} store - Store instance
 * @param {string} actorId - ID of vehicle template
 * @param {string} condition - "new" or "used"
 */
export async function buyVehicle(store, actorId, condition) {
    if (!actorId) {
        ui.notifications.warn('Invalid vehicle selection.');
        return;
    }

    // Check if SWSE system is initialized
    if (!globalThis.SWSE?.ActorEngine) {
        SWSELogger.error('SWSE ActorEngine not initialized');
        ui.notifications.error('Character system not ready. Please refresh and try again.');
        return;
    }

    // Try to get from world actors first
    let vehicleTemplate = game.actors.get(actorId);

    // If not found in world, search compendiums
    if (!vehicleTemplate) {
        const pack = game.packs.get('foundryvtt-swse.vehicles');  // Fixed typo: was 'foundryvtt-foundryvtt-swse'
        if (pack) {
            vehicleTemplate = await pack.getDocument(actorId);
        }
    }

    if (!vehicleTemplate) {
        ui.notifications.error('Vehicle not found.');
        return;
    }

    // ENGINE: Vehicles have both finalCost (new) and finalCostUsed (used) pre-calculated
    const finalCost = condition === 'used'
      ? Number(vehicleTemplate.finalCostUsed) || 0
      : Number(vehicleTemplate.finalCost) || 0;

    // DELEGATED TO ENGINE: Check eligibility
    const eligible = StoreEngine.canPurchase({
        actor: store.actor,
        items: [{ id: vehicleTemplate.id, name: vehicleTemplate.name }],
        totalCost: finalCost
    });

    if (!eligible.canPurchase) {
        ui.notifications.warn(eligible.reason || 'Cannot purchase vehicle.');
        return;
    }

    // Confirm purchase
    const confirmed = await SWSEDialogV2.confirm({
        title: 'Confirm Vehicle Purchase',
        content: `<p>Purchase <strong>${condition === 'used' ? 'Used' : 'New'} ${vehicleTemplate.name}</strong> for <strong>${finalCost.toLocaleString()}</strong> credits?</p>
                 <p>A new vehicle actor will be created and assigned to you.</p>`,
        defaultYes: true
    });

    if (!confirmed) {return;}

    try {
        // DELEGATED TO ENGINE: Execute purchase (credit deduction)
        const result = await StoreEngine.purchase({
            actor: store.actor,
            items: [vehicleTemplate],
            totalCost: finalCost,
            itemGrantCallback: async (actor, items) => {
                // Create vehicle actor with player ownership (UI responsibility)
                const vehicleData = vehicleTemplate.toObject();
                vehicleData.name = `${condition === 'used' ? '(Used) ' : ''}${vehicleTemplate.name}`;
                vehicleData.ownership = {
                    default: 0,
                    [game.user.id]: 3  // Owner permission
                };

                // Mark as used if applicable
                if (condition === 'used' && vehicleData.system) {
                    vehicleData.system.condition = 'used';
                }

                const newVehicle = await createActor(vehicleData);
            }
        });

        if (!result.success) {
            ui.notifications.error(`Purchase failed: ${result.error}`);
            return;
        }

        ui.notifications.info(`${vehicleTemplate.name} purchased! Check your actors list.`);
        store.render();
    } catch (err) {
        SWSELogger.error('SWSE Store | Vehicle purchase failed:', err);
        ui.notifications.error('Failed to complete vehicle purchase.');
    }
}

/**
 * Launch custom droid builder
 * @param {Object} actor - Actor building the droid
 * @param {Function} closeCallback - Callback to close the store
 */
export async function createCustomDroid(actor, closeCallback) {
    const baseCredits = game.settings.get('foundryvtt-swse', 'droidConstructionCredits') || 1000;
    const credits = Number(actor.system.credits) || 0;

    if (credits < baseCredits) {
        ui.notifications.warn(`You need at least ${baseCredits.toLocaleString()} credits to build a custom droid.`);
        return;
    }

    // Confirm
    const confirmed = await SWSEDialogV2.confirm({
        title: 'Build Custom Droid',
        content: `<p>Enter the droid construction system?</p>
                 <p>You will design a non-heroic droid at level ${actor.system.level || 1}.</p>
                 <p><strong>This build will be submitted for GM approval.</strong></p>
                 <p><strong>Minimum cost:</strong> ${baseCredits.toLocaleString()} credits</p>`,
        defaultYes: true
    });

    if (!confirmed) {return;}

    try {
        // Close this store window
        if (closeCallback) {
            closeCallback();
        }

        // Launch character generator in droid-building mode with draft mode enabled
        // When chargen completes in draftMode, it will call the draftSubmissionCallback
        const chargen = new CharacterGenerator(null, {
            droidBuilderMode: true,
            draftMode: true,  // Enable draft submission workflow
            ownerActor: actor,
            droidLevel: actor.system.level || 1,
            availableCredits: credits,
            droidConstructionCredits: baseCredits,
            draftSubmissionCallback: async (chargenSnapshot, cost) => {
                // When chargen completes in draft mode, submit to approval queue
                const success = await submitDraftDroidForApproval(chargenSnapshot, actor, cost);
                if (success) {
                    // Chargen will close itself in draft mode
                    SWSELogger.log('SWSE Store | Droid draft submitted successfully');
                }
            }
        });

        chargen.render(true);
    } catch (err) {
        SWSELogger.error('SWSE Store | Failed to launch droid builder:', err);
        ui.notifications.error('Failed to open droid builder.');
    }
}

/**
 * Launch custom starship builder
 * @param {Object} actor - Actor building the starship
 * @param {Function} closeCallback - Callback to close the store
 */
export async function createCustomStarship(actor, closeCallback) {
    const credits = Number(actor.system.credits) || 0;

    if (credits < 5000) {
        ui.notifications.warn('You need at least 5,000 credits to build a custom starship.');
        return;
    }

    // Confirm
    const confirmed = await SWSEDialogV2.confirm({
        title: 'Build Custom Starship',
        content: `<p>Enter the starship modification system with Marl Skindar?</p>
                 <p>You will select a stock ship and customize it with modifications.</p>
                 <p><strong>This build will be submitted for GM approval.</strong></p>
                 <p><strong>Minimum cost:</strong> 5,000 credits (Light Fighter)</p>
                 <p><em>Warning: Marl will judge your choices harshly.</em></p>`,
        defaultYes: true
    });

    if (!confirmed) {return;}

    try {
        // Close this store window
        if (closeCallback) {
            closeCallback();
        }

        // Launch vehicle modification app
        await VehicleModificationApp.open(actor);
    } catch (err) {
        SWSELogger.error('SWSE Store | Failed to launch starship builder:', err);
        ui.notifications.error('Failed to open starship builder.');
    }
}

/**
 * Remove item from cart by ID
 * @param {Object} cart - Shopping cart object
 * @param {string} type - Type of item ("item", "droid", "vehicle")
 * @param {string} itemId - ID of the item to remove
 */
export function removeFromCartById(cart, type, itemId) {
    const t = String(type || '').toLowerCase();
    const norm = t.endsWith('s') ? t.slice(0, -1) : t;

    if (norm === 'item') {
        const index = cart.items.findIndex(item => item.id === itemId);
        if (index !== -1) {cart.items.splice(index, 1);}
        return;
    }

    if (norm === 'droid') {
        const index = cart.droids.findIndex(droid => droid.id === itemId);
        if (index !== -1) {cart.droids.splice(index, 1);}
        return;
    }

    if (norm === 'vehicle') {
        const index = cart.vehicles.findIndex(vehicle => vehicle.id === itemId);
        if (index !== -1) {cart.vehicles.splice(index, 1);}
    }
}

/**
 * Clear entire cart
 * @param {Object} cart - Shopping cart object
 */
export function clearCart(cart) {
    cart.items = [];
    cart.droids = [];
    cart.vehicles = [];
}

/**
 * Calculate total cost of items in cart
 * @param {Object} cart - Shopping cart object
 * @returns {number} Total cost
 */
export function calculateCartTotal(cart) {
    let total = 0;
    for (const item of cart.items) {total += item.cost;}
    for (const droid of cart.droids) {total += droid.cost;}
    for (const vehicle of cart.vehicles) {total += vehicle.cost;}
    return normalizeCredits(total);
}

/**
 * HARDENING 4: Revalidate cart before checkout
 * Do NOT trust stored cart item costs.
 * Re-resolve each item from store index and recalculate prices.
 *
 * @param {Object} store - Store instance
 * @returns {Object} { totalRevalidated, removed, recalculated }
 */
function revalidateCart(store) {
  const report = { totalRevalidated: 0, removed: [], recalculated: [] };

  // Revalidate regular items
  for (let i = store.cart.items.length - 1; i >= 0; i--) {
    const cartItem = store.cart.items[i];
    const storeItem = store.itemsById.get(cartItem.id);
    if (!storeItem) {
      report.removed.push({ type: 'item', name: cartItem.name });
      store.cart.items.splice(i, 1);
    } else {
      const recalculated = normalizeCredits(storeItem.finalCost);
      if (recalculated !== cartItem.cost) {
        report.recalculated.push({
          type: 'item',
          name: cartItem.name,
          old: cartItem.cost,
          new: recalculated
        });
        cartItem.cost = recalculated;
      }
      report.totalRevalidated += recalculated;
    }
  }

  // Revalidate droids
  for (let i = store.cart.droids.length - 1; i >= 0; i--) {
    const cartDroid = store.cart.droids[i];
    const storeItem = store.itemsById.get(cartDroid.id);
    if (!storeItem) {
      report.removed.push({ type: 'droid', name: cartDroid.name });
      store.cart.droids.splice(i, 1);
    } else {
      const recalculated = normalizeCredits(storeItem.finalCost);
      if (recalculated !== cartDroid.cost) {
        report.recalculated.push({
          type: 'droid',
          name: cartDroid.name,
          old: cartDroid.cost,
          new: recalculated
        });
        cartDroid.cost = recalculated;
      }
      report.totalRevalidated += recalculated;
    }
  }

  // Revalidate vehicles
  for (let i = store.cart.vehicles.length - 1; i >= 0; i--) {
    const cartVehicle = store.cart.vehicles[i];
    const storeItem = store.itemsById.get(cartVehicle.id);
    if (!storeItem) {
      report.removed.push({ type: 'vehicle', name: cartVehicle.name });
      store.cart.vehicles.splice(i, 1);
    } else {
      const isUsed = cartVehicle.condition === 'used';
      const recalculated = normalizeCredits(isUsed ? storeItem.finalCostUsed : storeItem.finalCost);
      if (recalculated !== cartVehicle.cost) {
        report.recalculated.push({
          type: 'vehicle',
          name: cartVehicle.name,
          old: cartVehicle.cost,
          new: recalculated
        });
        cartVehicle.cost = recalculated;
      }
      report.totalRevalidated += recalculated;
    }
  }

  if (report.recalculated.length > 0 || report.removed.length > 0) {
    SWSELogger.info('SWSE Store | Cart revalidated', {
      recalculated: report.recalculated.length,
      removed: report.removed.length
    });
  }

  return report;
}

/**
 * Checkout and purchase all items in cart
 * @param {Object} store - Store instance
 * @param {Function} animateNumberCallback - Callback to animate numbers
 */
export async function checkout(store, animateNumberCallback) {
    const actor = store.actor;

    const credits = Number(actor.system.credits) || 0;

    // HARDENING 4: Revalidate cart before checkout (re-price all items)
    const revalidationReport = revalidateCart(store);
    if (revalidationReport.removed.length > 0) {
        ui.notifications.warn(`${revalidationReport.removed.length} item(s) no longer available and were removed.`);
    }

    // Calculate total using revalidated costs
    const total = calculateCartTotal(store.cart);

    if (total === 0) {
        ui.notifications.warn('Your cart is empty.');
        return;
    }

    // DELEGATED TO ENGINE: Check eligibility
    const eligible = StoreEngine.canPurchase({
        actor,
        items: [...store.cart.items, ...store.cart.droids, ...store.cart.vehicles],
        totalCost: total
    });

    if (!eligible.canPurchase) {
        ui.notifications.warn(eligible.reason || 'Cannot complete purchase.');
        return;
    }

    // PART 3: Enter checkout mode (ledger view)
    store.enterCheckoutMode();
    store._showCartSidebar(store.element);

    // PART 5: Wait for confirmation (user clicks Confirm Trade or Cancel)
    return new Promise((resolve) => {
        const rootEl = store.element;
        if (!rootEl) {
            resolve();
            return;
        }

        const confirmBtn = rootEl.querySelector('.checkout-btn');
        const cancelBtn = rootEl.querySelector('#cancel-checkout');

        const handleConfirm = async () => {
            // Disable buttons during transaction
            if (confirmBtn) confirmBtn.disabled = true;
            if (cancelBtn) cancelBtn.disabled = true;

            cleanupListeners();

            try {
                // PART 5: Execute engine transaction
                const result = await StoreEngine.purchase({
                    actor,
                    items: store.cart,
                    totalCost: total,
                    itemGrantCallback: async (purchasingActor, cartItems) => {
                        // Add regular items to actor
                        const itemsToCreate = store.cart.items.map(cartItem => {
                            const item = cartItem.item;
                            return item.toObject ? item.toObject() : item;
                        });
                        if (itemsToCreate.length > 0) {
                            // PHASE 8: Use ActorEngine
                            await ActorEngine.createEmbeddedDocuments(purchasingActor, 'Item', itemsToCreate);
                        }

                        // Create droid actors
                        for (const droid of store.cart.droids) {
                            const droidData = droid.actor.toObject ? droid.actor.toObject() : droid.actor;
                            droidData.name = `${droid.name} (${purchasingActor.name}'s)`;
                            droidData.ownership = {
                                default: 0,
                                [game.user.id]: 3
                            };
                            await createActor(droidData);
                        }

                        // Create vehicle actors from Item templates
                        for (const vehicle of store.cart.vehicles) {
                            const template = vehicle.template || store.itemsById?.get(vehicle.id);
                            if (!template) {
                                throw new Error(`Vehicle template not found for id=${vehicle.id}`);
                            }

                            const vehicleActor = await createActor({
                                name: `${vehicle.condition === 'used' ? '(Used) ' : ''}${vehicle.name}`,
                                type: 'vehicle',
                                img: template.img || 'icons/svg/anchor.svg',
                                ownership: {
                                    default: 0,
                                    [game.user.id]: 3
                                }
                            }, { renderSheet: false });

                            await SWSEVehicleHandler.applyVehicleTemplate(vehicleActor, template, {
                                condition: vehicle.condition
                            });
                        }
                    }
                });

                if (!result.success) {
                    ui.notifications.error(`Purchase failed: ${result.error}`);
                    store.exitCheckoutMode();
                    store._renderCartUI();
                    resolve();
                    return;
                }

                // PART 6: Animate credit reconciliation
                const newCredits = Number(actor.system?.credits ?? 0) || 0;
                await store.animateCreditReconciliation(credits, newCredits, 600);

                ui.notifications.info(`Purchase complete! Spent ${total.toLocaleString()} credits.`);

                // Log purchase to history
                await logPurchaseToHistory(actor, store.cart, total);

                // PART 7: Clear cart and exit checkout mode
                clearCart(store.cart);
                store.cartTotal = 0;
                store.exitCheckoutMode();
                store._renderCartUI();

                resolve();
            } catch (err) {
                SWSELogger.error('SWSE Store | Checkout failed:', err);
                ui.notifications.error('Purchase failed. See console for details.');
                store.exitCheckoutMode();
                store._renderCartUI();
                resolve();
            }
        };

        const handleCancel = () => {
            cleanupListeners();
            store.exitCheckoutMode();
            store._renderCartUI();
            resolve();
        };

        const cleanupListeners = () => {
            if (confirmBtn) confirmBtn.removeEventListener('click', handleConfirm);
            if (cancelBtn) cancelBtn.removeEventListener('click', handleCancel);
        };

        // Add event listeners
        if (confirmBtn) {
            confirmBtn.addEventListener('click', handleConfirm);
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', handleCancel);
            cancelBtn.style.display = '';  // Show cancel button
        }
    });
}

/**
 * Log purchase to actor's purchase history
 * @param {Actor} actor - The actor making the purchase
 * @param {Object} cart - The shopping cart
 * @param {number} total - Total credits spent
 */
async function logPurchaseToHistory(actor, cart, total) {
    try {
        // Get existing purchase history
        const history = actor.getFlag('foundryvtt-swse', 'purchaseHistory') || [];

        // Create purchase record
        const purchase = {
            timestamp: Date.now(),
            items: cart.items.map(i => ({
                id: i.id || i.item?.id || i.item?._id,
                name: i.name || i.item?.name,
                cost: i.cost || i.item?.finalCost || 0
            })),
            droids: cart.droids.map(d => ({
                id: d.id || d.actor?.id || d.actor?._id,
                name: d.name || d.actor?.name,
                cost: d.cost || 0
            })),
            vehicles: cart.vehicles.map(v => ({
                id: v.id || v.template?._id || v.template?.id,
                name: v.name || v.template?.name,
                cost: v.cost || 0,
                condition: v.condition || 'new'
            })),
            total: total
        };

        // Add to history and save
        history.push(purchase);
        await actor.setFlag('foundryvtt-swse', 'purchaseHistory', history);

        SWSELogger.log('SWSE Store | Purchase logged to history:', purchase);
    } catch (err) {
        SWSELogger.error('SWSE Store | Failed to log purchase to history:', err);
        // Don't throw error - this is non-critical
    }
}

/**
 * Submit draft droid for GM approval
 * Creates an unpublished draft actor and adds to pending approvals queue
 * @param {Object} chargenSnapshot - Complete chargen state (characterData, choices, etc.)
 * @param {Actor} ownerActor - The character who requested the build
 * @param {number} costCredits - Total cost (normalized integer)
 * @returns {Promise<boolean>} Success/failure
 */
export async function submitDraftDroidForApproval(chargenSnapshot, ownerActor, costCredits) {
    if (!chargenSnapshot || !ownerActor) {
        ui.notifications.error('Invalid draft submission: missing data.');
        return false;
    }

    const normalizedCost = normalizeCredits(costCredits);

    try {
        // 1. Create draft droid actor (not published, not owned by player)
        const draftDroid = await createActor({
            name: chargenSnapshot.characterData?.name || 'Custom Droid',
            type: 'droid',
            ownership: {
                default: 0  // Players cannot see
            }
        });

        if (!draftDroid) {
            ui.notifications.error('Failed to create draft droid.');
            return false;
        }

        // 2. Mark as draft (pending approval)
        await draftDroid.setFlag('foundryvtt-swse', 'pendingApproval', true);
        await draftDroid.setFlag('foundryvtt-swse', 'draftOnly', true);
        await draftDroid.setFlag('foundryvtt-swse', 'ownerPlayerId', game.user.id);

        // 3. Build pending purchase record
        const pendingRecord = {
            id: `pending_droid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'droid',
            draftActorId: draftDroid.id,
            chargenSnapshot: chargenSnapshot,
            ownerPlayerId: game.user.id,
            ownerActorId: ownerActor.id,
            costCredits: normalizedCost,
            requestedAt: Date.now(),
            draftData: {
                name: chargenSnapshot.characterData?.name || 'Custom Droid',
                type: 'droid',
                droidDegree: chargenSnapshot.characterData?.droidDegree || 'Unknown',
                droidSize: chargenSnapshot.characterData?.droidSize || 'medium',
                cost: normalizedCost,
                description: `Custom ${chargenSnapshot.characterData?.droidDegree || 'Droid'} built by ${ownerActor.name}`
            }
        };

        // 4. Add to pending queue (world flag)
        const pendingPurchases = game.settings.get('foundryvtt-swse', 'pendingCustomPurchases') || [];
        pendingPurchases.push(pendingRecord);
        await game.settings.set('foundryvtt-swse', 'pendingCustomPurchases', pendingPurchases);

        // 5. Notify player
        ui.notifications.info(`Droid design submitted for GM approval. Awaiting review...`);
        SWSELogger.log('SWSE Store | Draft droid submitted for approval:', {
            droidName: pendingRecord.draftData.name,
            cost: normalizedCost,
            owner: ownerActor.name
        });

        return true;
    } catch (err) {
        SWSELogger.error('SWSE Store | Failed to submit draft droid:', err);
        ui.notifications.error('Failed to submit droid for approval.');
        return false;
    }
}

/**
 * Submit draft vehicle for GM approval
 * Creates an unpublished draft actor and adds to pending approvals queue
 * @param {Object} modificationData - Vehicle modification state
 * @param {Actor} vehicleTemplate - Base vehicle template
 * @param {Actor} ownerActor - The character who requested the build
 * @param {number} costCredits - Total cost (normalized integer)
 * @returns {Promise<boolean>} Success/failure
 */
export async function submitDraftVehicleForApproval(modificationData, vehicleTemplate, ownerActor, costCredits) {
    if (!modificationData || !vehicleTemplate || !ownerActor) {
        ui.notifications.error('Invalid vehicle draft submission: missing data.');
        return false;
    }

    const normalizedCost = normalizeCredits(costCredits);

    try {
        // 1. Create draft vehicle actor (not published, not owned by player)
        const draftVehicle = await createActor({
            name: vehicleTemplate.name || 'Custom Vehicle',
            type: 'vehicle',
            ownership: {
                default: 0  // Players cannot see
            }
        });

        if (!draftVehicle) {
            ui.notifications.error('Failed to create draft vehicle.');
            return false;
        }

        // 2. Mark as draft (pending approval)
        await draftVehicle.setFlag('foundryvtt-swse', 'pendingApproval', true);
        await draftVehicle.setFlag('foundryvtt-swse', 'draftOnly', true);
        await draftVehicle.setFlag('foundryvtt-swse', 'ownerPlayerId', game.user.id);

        // 3. Build pending purchase record
        const pendingRecord = {
            id: `pending_vehicle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: 'vehicle',
            draftActorId: draftVehicle.id,
            modificationData: modificationData,
            vehicleTemplateName: vehicleTemplate.name,
            ownerPlayerId: game.user.id,
            ownerActorId: ownerActor.id,
            costCredits: normalizedCost,
            requestedAt: Date.now(),
            draftData: {
                name: vehicleTemplate.name || 'Custom Vehicle',
                type: 'vehicle',
                baseTemplate: vehicleTemplate.name,
                cost: normalizedCost,
                description: `Modified ${vehicleTemplate.name} built by ${ownerActor.name}`
            }
        };

        // 4. Add to pending queue (world flag)
        const pendingPurchases = game.settings.get('foundryvtt-swse', 'pendingCustomPurchases') || [];
        pendingPurchases.push(pendingRecord);
        await game.settings.set('foundryvtt-swse', 'pendingCustomPurchases', pendingPurchases);

        // 5. Notify player
        ui.notifications.info(`Vehicle design submitted for GM approval. Awaiting review...`);
        SWSELogger.log('SWSE Store | Draft vehicle submitted for approval:', {
            vehicleName: pendingRecord.draftData.name,
            cost: normalizedCost,
            owner: ownerActor.name
        });

        return true;
    } catch (err) {
        SWSELogger.error('SWSE Store | Failed to submit draft vehicle:', err);
        ui.notifications.error('Failed to submit vehicle for approval.');
        return false;
    }
}

/**
 * Phase 3b: Build custom droid using new DroidBuilderApp
 *
 * Launches the builder for a player to design a custom droid.
 * Handles credit deduction via hook listener.
 *
 * @param {Actor} actor - The player's actor who owns the droid
 * @param {Function} closeCallback - Callback to close the Store UI
 */
export async function buildDroidWithBuilder(actor, closeCallback) {
    if (!actor) {
        ui.notifications.error('No actor provided for droid building.');
        return;
    }

    const baseCredits = game.settings.get('foundryvtt-swse', 'droidConstructionCredits') || 1000;
    const playerCredits = Number(actor.system.credits) || 0;

    // Check if player has minimum credits
    if (playerCredits < baseCredits) {
        ui.notifications.warn(
            `You need at least ${baseCredits.toLocaleString()} credits to build a custom droid. You have ${playerCredits.toLocaleString()}.`
        );
        return;
    }

    // Confirm droid building
    const confirmed = await SWSEDialogV2.confirm({
        title: 'Build Custom Droid',
        content: `
            <p>Design a custom droid using the Droid Builder.</p>
            <p><strong>Available credits:</strong> ${playerCredits.toLocaleString()}</p>
            <p><strong>Minimum required:</strong> ${baseCredits.toLocaleString()}</p>
            <p><em>Your GM may require approval before your droid is finalized.</em></p>
        `,
        defaultYes: true
    });

    if (!confirmed) return;

    // Close store if callback provided
    if (closeCallback) {
        closeCallback();
    }

    try {
        // Determine if GM approval is required (world setting)
        const requireApproval = game.settings.get('foundryvtt-swse', 'store.requireGMApproval') ?? false;

        // Set up hook listener for droid finalization
        const hookId = Hooks.on('swse:droidFinalized', async (data) => {
            // Only handle our actor's droid
            if (data.actor.id !== actor.id) return;

            // Unregister this hook listener
            Hooks.off('swse:droidFinalized', hookId);

            try {
                // If approval is NOT required, deduct credits immediately
                if (!data.requireApproval) {
                    await deductDroidCredits(actor, data.cost);
                    ui.notifications.info(`Custom droid built! ${data.cost} credits deducted.`);
                    SWSELogger.log('SWSE Store | Custom droid finalized and credits deducted:', {
                        droidCost: data.cost,
                        actor: actor.name
                    });
                } else {
                    // If approval required, mark as pending (handled by GM)
                    ui.notifications.info('Custom droid submitted for GM approval. Please wait for approval before credits are deducted.');
                    SWSELogger.log('SWSE Store | Custom droid submitted for GM approval:', {
                        droidCost: data.cost,
                        actor: actor.name
                    });
                }
            } catch (err) {
                SWSELogger.error('SWSE Store | Error handling droid finalization:', err);
                ui.notifications.error('Error processing droid. Please contact your GM.');
            }
        });

        // Launch builder
        await DroidBuilderApp.open(actor, {
            mode: 'NEW',
            requireApproval: requireApproval
        });

        SWSELogger.log('SWSE Store | Launched DroidBuilderApp for actor:', { actor: actor.name });
    } catch (err) {
        SWSELogger.error('SWSE Store | Failed to launch DroidBuilderApp:', err);
        ui.notifications.error('Failed to open droid builder.');
    }
}

/**
 * Helper: Deduct credits for droid construction
 *
 * @param {Actor} actor - The actor to deduct credits from
 * @param {number} cost - The cost to deduct
 */
async function deductDroidCredits(actor, cost) {
    const currentCredits = Number(actor.system.credits) || 0;
    const newCredits = Math.max(0, currentCredits - cost);

    await ActorEngine.updateActor(actor, {
        'system.credits': newCredits
    });

    SWSELogger.log('SWSE Store | Credits deducted for droid:', {
        actor: actor.name,
        cost: cost,
        oldCredits: currentCredits,
        newCredits: newCredits
    });
}

/**
 * Phase 3d: Build droid from template
 *
 * Browse available droid templates from the droid-templates compendium
 * and launch builder in TEMPLATE mode to clone and customize.
 *
 * @param {Actor} actor - The player's actor who will own the droid
 * @param {Function} closeCallback - Callback to close the Store UI
 */
export async function buildDroidFromTemplate(actor, closeCallback) {
    if (!actor) {
        ui.notifications.error('No actor provided for droid building.');
        return;
    }

    try {
        // Try to get droid-templates compendium
        const templatePack = game.packs.get('foundryvtt-swse.droid-templates');

        if (!templatePack) {
            ui.notifications.warn(
                'No droid-templates compendium found. ' +
                'Please ask your GM to create a compendium named "droid-templates" with droid actors.'
            );
            return;
        }

        // Get all droid actors from the compendium
        const templates = await templatePack.getDocuments();
        const droidTemplates = templates.filter(d => d.type === 'droid');

        if (droidTemplates.length === 0) {
            ui.notifications.warn('No droid templates found in the droid-templates compendium.');
            return;
        }

        // Create template selection dialog
        let templateHTML = '<div class="template-browser"><select id="template-select" style="width: 100%; padding: 8px; margin-bottom: 12px;">';
        templateHTML += '<option value="">Select a template...</option>';
        droidTemplates.forEach(t => {
            const degree = t.system?.droidSystems?.degree || 'Unknown';
            const size = t.system?.droidSystems?.size || 'Medium';
            templateHTML += `<option value="${t.id}">${t.name} (${degree}, ${size})</option>`;
        });
        templateHTML += '</select></div>';

        // Show selection dialog
        let selectedTemplateId = null;
        await new Promise(resolve => {
            const dialog = new SWSEDialogV2({
                title: 'Select Droid Template',
                content: templateHTML,
                buttons: {
                    select: {
                        label: 'Select',
                        callback: (html) => {
                            selectedTemplateId = html.querySelector('#template-select').value;
                            resolve();
                        }
                    },
                    cancel: {
                        label: 'Cancel',
                        callback: () => {
                            resolve();
                        }
                    }
                },
                default: 'select'
            });
            dialog.render(true);
        });

        // User cancelled
        if (!selectedTemplateId) return;

        // Find the selected template
        const selectedTemplate = droidTemplates.find(t => t.id === selectedTemplateId);
        if (!selectedTemplate) {
            ui.notifications.error('Selected template not found.');
            return;
        }

        // Close store if callback provided
        if (closeCallback) {
            closeCallback();
        }

        // Confirm before launching builder
        const confirmed = await SWSEDialogV2.confirm({
            title: `Clone Droid Template: ${selectedTemplate.name}`,
            content: `
                <p>Create a new droid based on <strong>${selectedTemplate.name}</strong>?</p>
                <p><em>You can customize this template before finalizing.</em></p>
            `,
            defaultYes: true
        });

        if (!confirmed) return;

        // Launch builder in TEMPLATE mode
        const requireApproval = game.settings.get('foundryvtt-swse', 'store.requireGMApproval') ?? false;

        // Set up hook listener (same as buildDroidWithBuilder)
        const hookId = Hooks.on('swse:droidFinalized', async (data) => {
            if (data.actor.id !== actor.id) return;
            Hooks.off('swse:droidFinalized', hookId);

            try {
                if (!data.requireApproval) {
                    await deductDroidCredits(actor, data.cost);
                    ui.notifications.info(`Droid built! ${data.cost} credits deducted.`);
                } else {
                    ui.notifications.info('Droid submitted for GM approval. Awaiting review...');
                }
            } catch (err) {
                SWSELogger.error('SWSE Store | Error handling droid finalization:', err);
                ui.notifications.error('Error processing droid.');
            }
        });

        // Launch builder
        await DroidBuilderApp.open(actor, {
            mode: 'TEMPLATE',
            templateId: selectedTemplate.id,
            requireApproval: requireApproval
        });

        SWSELogger.log('SWSE Store | Launched DroidBuilderApp from template:', {
            actor: actor.name,
            template: selectedTemplate.name
        });

    } catch (err) {
        SWSELogger.error('SWSE Store | Failed to build from template:', err);
        ui.notifications.error('Failed to load droid templates.');
    }
}
