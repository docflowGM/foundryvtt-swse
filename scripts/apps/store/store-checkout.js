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
        ui.notifications.warn("Invalid item selection.");
        return;
    }

    // Try to get from world items first, then from our cached map
    let item = game.items.get(itemId);
    if (!item) {
        item = store.itemsById.get(itemId);
    }

    if (!item) {
        ui.notifications.error("Item not found.");
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

    const currentCredits = Number(actor.system?.credits) || 0;

    // Check if actor has enough credits
    if (currentCredits < serviceCost) {
        ui.notifications.error(`Insufficient credits! You need ${serviceCost} credits but only have ${currentCredits}.`);
        return;
    }

    // Deduct credits immediately
    const newCredits = currentCredits - serviceCost;
    await actor.update({ "system.credits": newCredits });

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

    // Try to get from world actors first
    let droidTemplate = game.actors.get(actorId);

    // If not found in world, search compendiums
    if (!droidTemplate) {
        const pack = game.packs.get('swse.droids');
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
        await store.actor.update({ "system.credits": credits - finalCost });

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

    // Try to get from world actors first
    let vehicleTemplate = game.actors.get(actorId);

    // If not found in world, search compendiums
    if (!vehicleTemplate) {
        const pack = game.packs.get('swse.vehicles');
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
        await store.actor.update({ "system.credits": credits - finalCost });

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
    const credits = Number(actor.system.credits) || 0;

    if (credits < 1000) {
        ui.notifications.warn("You need at least 1,000 credits to build a custom droid.");
        return;
    }

    // Confirm
    const confirmed = await Dialog.confirm({
        title: "Build Custom Droid",
        content: `<p>Enter the droid construction system?</p>
                 <p>You will design a non-heroic droid at level ${actor.system.level || 1}.</p>
                 <p><strong>Minimum cost:</strong> 1,000 credits</p>`,
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
            availableCredits: credits
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
 * Remove item from cart
 * @param {Object} cart - Shopping cart object
 * @param {string} type - Type of item ("item", "droid", "vehicle")
 * @param {number} index - Index in cart array
 */
export function removeFromCart(cart, type, index) {
    if (type === "item") {
        cart.items.splice(index, 1);
    } else if (type === "droid") {
        cart.droids.splice(index, 1);
    } else if (type === "vehicle") {
        cart.vehicles.splice(index, 1);
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

    try {
        // Animate credits countdown in wallet display
        const walletCreditsEl = store.element[0].querySelector('.remaining-credits');
        if (walletCreditsEl && animateNumberCallback) {
            animateNumberCallback(walletCreditsEl, credits, credits - total, 600);
        }

        // Deduct credits
        await actor.update({ "system.credits": credits - total });

        // Add regular items to actor
        const itemsToCreate = store.cart.items.map(cartItem => cartItem.item.toObject());
        if (itemsToCreate.length > 0) {
            await actor.createEmbeddedDocuments("Item", itemsToCreate);
        }

        // Create droid actors
        for (const droid of store.cart.droids) {
            const droidData = droid.actor.toObject();
            droidData.name = `${droid.name} (${actor.name}'s)`;
            droidData.ownership = {
                default: 0,
                [game.user.id]: 3
            };
            await Actor.create(droidData);
        }

        // Create vehicle actors
        for (const vehicle of store.cart.vehicles) {
            const vehicleData = vehicle.actor.toObject();
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

        // Clear cart
        clearCart(store.cart);
        store.cartTotal = 0;

        // Wait for animation to complete before re-rendering
        setTimeout(() => store.render(), 700);
    } catch (err) {
        SWSELogger.error("SWSE Store | Checkout failed:", err);
        ui.notifications.error("Failed to complete purchase.");
    }
}
