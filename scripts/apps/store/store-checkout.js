import { ProgressionEngine } from "../../progression/engine/progression-engine.js";
/**
 * Purchase and checkout functionality for SWSE Store
 * Handles item purchases, cart management, and checkout
 */

import { SWSELogger } from '../../utils/logger.js';
import CharacterGenerator from '../chargen/chargen-main.js';
import { VehicleModificationApp } from '../vehicle-modification-app.js';
import { calculateFinalCost } from './store-pricing.js';
import { getRandomDialogue } from './store-shared.js';

/**
 * Add item to shopping cart
 * @param {Object} store - Store instance (this)
 * @param {string} itemId - ID of item to add
 * @param {Function} updateDialogueCallback - Callback to update dialogue
 */
export async function addItemToCart(store, itemId, updateDialogueCallback) {
    if (!itemId) {
        ui.notifications.warn("Invalid item selection. The item may be missing an ID.");
        SWSELogger.error("SWSE Store | addItemToCart called with empty itemId");
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
            ui.notifications.error("This item has an invalid ID and cannot be purchased. Please contact the GM.");
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

    const baseCost = Number(item.system?.cost) || 0;
    const finalCost = calculateFinalCost(baseCost);

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
        ui.notifications.warn("Invalid droid selection.");
        return;
    }

    // Try to get from world actors first
    let droidTemplate = game.actors.get(actorId);

    // If not found in world, search compendiums
    if (!droidTemplate) {
        const pack = game.packs.get('foundryvtt-swse.droids');
        if (pack) {
            droidTemplate = await pack.getDocument(actorId);
        }
    }

    if (!droidTemplate) {
        ui.notifications.error("Droid not found.");
        return;
    }

    const baseCost = Number(droidTemplate.system?.cost) || 0;
    const finalCost = calculateFinalCost(baseCost);

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
export async function addVehicleToCart(store, actorId, condition, updateDialogueCallback) {
    if (!actorId) {
        ui.notifications.warn("Invalid vehicle selection.");
        return;
    }

    // Try to get from world actors first
    let vehicleTemplate = game.actors.get(actorId);

    // If not found in world, search compendiums
    if (!vehicleTemplate) {
        const pack = game.packs.get('foundryvtt-swse.vehicles');
        if (pack) {
            vehicleTemplate = await pack.getDocument(actorId);
        }
    }

    if (!vehicleTemplate) {
        ui.notifications.error("Vehicle not found.");
        return;
    }

    const baseCost = Number(vehicleTemplate.system?.cost) || 0;
    const conditionMultiplier = condition === "used" ? 0.5 : 1.0;
    const finalCost = calculateFinalCost(baseCost * conditionMultiplier);

    // Add to cart
    store.cart.vehicles.push({
        id: actorId,
        name: vehicleTemplate.name,
        cost: finalCost,
        condition: condition,
        actor: vehicleTemplate
    });

    ui.notifications.info(`${condition === "used" ? "Used" : "New"} ${vehicleTemplate.name} added to cart.`);

    // Update Rendarr's dialogue
    const dialogue = getRandomDialogue('purchase');
    if (updateDialogueCallback) {
        updateDialogueCallback(dialogue);
    }
}

/**
 * Purchase a service (immediate credit deduction)
 * @param {Object} actor - Actor purchasing the service
 * @param {string} serviceName - Name of the service
 * @param {number} serviceCost - Cost of the service
 * @param {Function} updateDialogueCallback - Callback to update dialogue
 * @param {Function} rerenderCallback - Callback to re-render the app
 */
export async function buyService(actor, serviceName, serviceCost, updateDialogueCallback, rerenderCallback) {
    if (!serviceName) {
        ui.notifications.warn("Invalid service selection.");
        return;
    }

    // Check if SWSE system is initialized
    if (!globalThis.SWSE?.ActorEngine) {
        SWSELogger.error("SWSE ActorEngine not initialized");
        ui.notifications.error("Character system not ready. Please refresh and try again.");
        return;
    }

    const currentCredits = Number(actor.system?.credits) || 0;

    // Check if actor has enough credits
    if (currentCredits < serviceCost) {
        ui.notifications.error(`Insufficient credits! You need ${serviceCost} credits but only have ${currentCredits}.`);
        return;
    }

    // Deduct credits immediately
    const newCredits = currentCredits - serviceCost;
    await globalThis.SWSE.ActorEngine.updateActor(actor, { "system.credits": newCredits });
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
 * @param {Object} store - Store instance
 * @param {string} actorId - ID of droid template
 */
export async function buyDroid(store, actorId) {
    if (!actorId) {
        ui.notifications.warn("Invalid droid selection.");
        return;
    }

    // Check if SWSE system is initialized
    if (!globalThis.SWSE?.ActorEngine) {
        SWSELogger.error("SWSE ActorEngine not initialized");
        ui.notifications.error("Character system not ready. Please refresh and try again.");
        return;
    }

    // Try to get from world actors first
    let droidTemplate = game.actors.get(actorId);

    // If not found in world, search compendiums
    if (!droidTemplate) {
        const pack = game.packs.get('foundryvtt-swse.droids');  // Fixed typo: was 'foundryvtt-foundryvtt-swse'
        if (pack) {
            droidTemplate = await pack.getDocument(actorId);
        }
    }

    if (!droidTemplate) {
        ui.notifications.error("Droid not found.");
        return;
    }

    const baseCost = Number(droidTemplate.system.cost) || 0;
    const finalCost = calculateFinalCost(baseCost);
    const credits = Number(store.actor.system.credits) || 0;

    if (credits < finalCost) {
        ui.notifications.warn(
            `Not enough credits! Need ${finalCost.toLocaleString()}, have ${credits.toLocaleString()}.`
        );
        return;
    }

    // Confirm purchase
    const confirmed = await Dialog.confirm({
        title: "Confirm Droid Purchase",
        content: `<p>Purchase <strong>${droidTemplate.name}</strong> for <strong>${finalCost.toLocaleString()}</strong> credits?</p>
                 <p>A new droid actor will be created and assigned to you.</p>`,
        defaultYes: true
    });

    if (!confirmed) return;

    try {
        // Deduct credits
        await globalThis.SWSE.ActorEngine.updateActor(store.actor, { "system.credits": credits - finalCost });
        // Create droid actor with player ownership
        const droidData = droidTemplate.toObject();
        droidData.name = `${droidTemplate.name} (${store.actor.name}'s)`;
        droidData.ownership = {
            default: 0,
            [game.user.id]: 3  // Owner permission
        };

        const newDroid = await Actor.create(droidData);

        ui.notifications.info(`${droidTemplate.name} purchased! Check your actors list.`);
        store.render();
    } catch (err) {
        SWSELogger.error("SWSE Store | Droid purchase failed:", err);
        ui.notifications.error("Failed to complete droid purchase.");
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
        ui.notifications.warn("Invalid vehicle selection.");
        return;
    }

    // Check if SWSE system is initialized
    if (!globalThis.SWSE?.ActorEngine) {
        SWSELogger.error("SWSE ActorEngine not initialized");
        ui.notifications.error("Character system not ready. Please refresh and try again.");
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
        ui.notifications.error("Vehicle not found.");
        return;
    }

    const baseCost = Number(vehicleTemplate.system.cost) || 0;
    const conditionMultiplier = condition === "used" ? 0.5 : 1.0;
    const finalCost = calculateFinalCost(baseCost * conditionMultiplier);
    const credits = Number(store.actor.system.credits) || 0;

    if (credits < finalCost) {
        ui.notifications.warn(
            `Not enough credits! Need ${finalCost.toLocaleString()}, have ${credits.toLocaleString()}.`
        );
        return;
    }

    // Confirm purchase
    const confirmed = await Dialog.confirm({
        title: "Confirm Vehicle Purchase",
        content: `<p>Purchase <strong>${condition === "used" ? "Used" : "New"} ${vehicleTemplate.name}</strong> for <strong>${finalCost.toLocaleString()}</strong> credits?</p>
                 <p>A new vehicle actor will be created and assigned to you.</p>`,
        defaultYes: true
    });

    if (!confirmed) return;

    try {
        // Deduct credits
        await globalThis.SWSE.ActorEngine.updateActor(store.actor, { "system.credits": credits - finalCost });
        // Create vehicle actor with player ownership
        const vehicleData = vehicleTemplate.toObject();
        vehicleData.name = `${condition === "used" ? "(Used) " : ""}${vehicleTemplate.name}`;
        vehicleData.ownership = {
            default: 0,
            [game.user.id]: 3  // Owner permission
        };

        // Mark as used if applicable
        if (condition === "used" && vehicleData.system) {
            vehicleData.system.condition = "used";
        }

        const newVehicle = await Actor.create(vehicleData);

        ui.notifications.info(`${vehicleTemplate.name} purchased! Check your actors list.`);
        store.render();
    } catch (err) {
        SWSELogger.error("SWSE Store | Vehicle purchase failed:", err);
        ui.notifications.error("Failed to complete vehicle purchase.");
    }
}

/**
 * Launch custom droid builder
 * @param {Object} actor - Actor building the droid
 * @param {Function} closeCallback - Callback to close the store
 */
export async function createCustomDroid(actor, closeCallback) {
    const baseCredits = game.settings.get('foundryvtt-swse', "droidConstructionCredits") || 1000;
    const credits = Number(actor.system.credits) || 0;

    if (credits < baseCredits) {
        ui.notifications.warn(`You need at least ${baseCredits.toLocaleString()} credits to build a custom droid.`);
        return;
    }

    // Confirm
    const confirmed = await Dialog.confirm({
        title: "Build Custom Droid",
        content: `<p>Enter the droid construction system?</p>
                 <p>You will design a non-heroic droid at level ${actor.system.level || 1}.</p>
                 <p><strong>Minimum cost:</strong> ${baseCredits.toLocaleString()} credits</p>`,
        defaultYes: true
    });

    if (!confirmed) return;

    try {
        // Close this store window
        if (closeCallback) {
            closeCallback();
        }

        // Launch character generator in droid-building mode
        const chargen = new CharacterGenerator(null, {
            droidBuilderMode: true,
            ownerActor: actor,
            droidLevel: actor.system.level || 1,
            availableCredits: credits,
            droidConstructionCredits: baseCredits
        });

        chargen.render(true);
    } catch (err) {
        SWSELogger.error("SWSE Store | Failed to launch droid builder:", err);
        ui.notifications.error("Failed to open droid builder.");
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
        ui.notifications.warn("You need at least 5,000 credits to build a custom starship.");
        return;
    }

    // Confirm
    const confirmed = await Dialog.confirm({
        title: "Build Custom Starship",
        content: `<p>Enter the starship modification system with Marl Skindar?</p>
                 <p>You will select a stock ship and customize it with modifications.</p>
                 <p><strong>Minimum cost:</strong> 5,000 credits (Light Fighter)</p>
                 <p><em>Warning: Marl will judge your choices harshly.</em></p>`,
        defaultYes: true
    });

    if (!confirmed) return;

    try {
        // Close this store window
        if (closeCallback) {
            closeCallback();
        }

        // Launch vehicle modification app
        await VehicleModificationApp.open(actor);
    } catch (err) {
        SWSELogger.error("SWSE Store | Failed to launch starship builder:", err);
        ui.notifications.error("Failed to open starship builder.");
    }
}

/**
 * Remove item from cart by ID
 * @param {Object} cart - Shopping cart object
 * @param {string} type - Type of item ("item", "droid", "vehicle")
 * @param {string} itemId - ID of the item to remove
 */
export function removeFromCartById(cart, type, itemId) {
    if (type === "item") {
        const index = cart.items.findIndex(item => item.id === itemId);
        if (index !== -1) {
            cart.items.splice(index, 1);
        }
    } else if (type === "droid") {
        const index = cart.droids.findIndex(droid => droid.id === itemId);
        if (index !== -1) {
            cart.droids.splice(index, 1);
        }
    } else if (type === "vehicle") {
        const index = cart.vehicles.findIndex(vehicle => vehicle.id === itemId);
        if (index !== -1) {
            cart.vehicles.splice(index, 1);
        }
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
    for (const item of cart.items) total += item.cost;
    for (const droid of cart.droids) total += droid.cost;
    for (const vehicle of cart.vehicles) total += vehicle.cost;
    return total;
}

/**
 * Checkout and purchase all items in cart
 * @param {Object} store - Store instance
 * @param {Function} animateNumberCallback - Callback to animate numbers
 */
export async function checkout(store, animateNumberCallback) {
    const actor = store.actor;

    // Check if SWSE system is initialized
    if (!globalThis.SWSE?.ActorEngine) {
        SWSELogger.error("SWSE ActorEngine not initialized");
        ui.notifications.error("Character system not ready. Please refresh and try again.");
        return;
    }

    const credits = Number(actor.system.credits) || 0;

    // Calculate total
    const total = calculateCartTotal(store.cart);

    if (total === 0) {
        ui.notifications.warn("Your cart is empty.");
        return;
    }

    if (credits < total) {
        ui.notifications.warn(
            `Not enough credits! Need ${total.toLocaleString()}, have ${credits.toLocaleString()}.`
        );
        return;
    }

    // Confirm purchase
    const confirmed = await Dialog.confirm({
        title: "Complete Purchase",
        content: `<p>Complete purchase for <strong>${total.toLocaleString()}</strong> credits?</p>
                 <p>This will add ${store.cart.items.length} item(s), ${store.cart.droids.length} droid(s), and ${store.cart.vehicles.length} vehicle(s).</p>`,
        defaultYes: true
    });

    if (!confirmed) return;

    // Track if credits were deducted for rollback
    let creditsDeducted = false;

    try {
        // Animate credits countdown in wallet display
        const walletCreditsEl = store.element[0].querySelector('.remaining-credits');
        if (walletCreditsEl && animateNumberCallback) {
            animateNumberCallback(walletCreditsEl, credits, credits - total, 600);
        }

        // Deduct credits FIRST and track it
        await globalThis.SWSE.ActorEngine.updateActor(actor, { "system.credits": credits - total });
        creditsDeducted = true;

        // Add regular items to actor
        // Handle both Foundry Documents and plain objects
        const itemsToCreate = store.cart.items.map(cartItem => {
            const item = cartItem.item;
            // If it's a Foundry Document, convert to plain object
            // If it's already a plain object, use it as-is
            return item.toObject ? item.toObject() : item;
        });
        if (itemsToCreate.length > 0) {
            await actor.createEmbeddedDocuments("Item", itemsToCreate);
        }

        // Create droid actors
        for (const droid of store.cart.droids) {
            // Handle both Documents and plain objects
            const droidData = droid.actor.toObject ? droid.actor.toObject() : droid.actor;
            droidData.name = `${droid.name} (${actor.name}'s)`;
            droidData.ownership = {
                default: 0,
                [game.user.id]: 3
            };
            await Actor.create(droidData);
        }

        // Create vehicle actors
        for (const vehicle of store.cart.vehicles) {
            // Handle both Documents and plain objects
            const vehicleData = vehicle.actor.toObject ? vehicle.actor.toObject() : vehicle.actor;
            vehicleData.name = `${vehicle.condition === "used" ? "(Used) " : ""}${vehicle.name}`;
            vehicleData.ownership = {
                default: 0,
                [game.user.id]: 3
            };
            if (vehicle.condition === "used" && vehicleData.system) {
                vehicleData.system.condition = "used";
            }
            await Actor.create(vehicleData);
        }

        ui.notifications.info(`Purchase complete! Spent ${total.toLocaleString()} credits.`);

        // Log purchase to history
        await logPurchaseToHistory(actor, store.cart, total);

        // Clear cart
        clearCart(store.cart);
        store.cartTotal = 0;

        // Wait for animation to complete before re-rendering
        setTimeout(() => store.render(), 700);
    } catch (err) {
        SWSELogger.error("SWSE Store | Checkout failed:", err);

        // Rollback: Refund credits if they were deducted
        if (creditsDeducted) {
            try {
                await globalThis.SWSE.ActorEngine.updateActor(actor, { "system.credits": credits });
                ui.notifications.error("Purchase failed! Credits have been refunded.");
                SWSELogger.info("SWSE Store | Credits refunded after failed checkout");
            } catch (refundErr) {
                SWSELogger.error("SWSE Store | Failed to refund credits:", refundErr);
                ui.notifications.error("Purchase failed and credit refund failed! Please contact GM to restore credits.");
            }
        } else {
            ui.notifications.error("Purchase failed before credits were deducted.");
        }

        // Re-render to show correct credit amount
        store.render();
    }
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
        const history = actor.getFlag('swse', 'purchaseHistory') || [];

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
                id: v.id || v.actor?.id || v.actor?._id,
                name: v.name || v.actor?.name,
                cost: v.cost || 0,
                condition: v.condition || 'new'
            })),
            total: total
        };

        // Add to history and save
        history.push(purchase);
        await actor.setFlag('swse', 'purchaseHistory', history);

        SWSELogger.log("SWSE Store | Purchase logged to history:", purchase);
    } catch (err) {
        SWSELogger.error("SWSE Store | Failed to log purchase to history:", err);
        // Don't throw error - this is non-critical
    }
}
