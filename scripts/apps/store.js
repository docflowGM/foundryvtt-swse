/**
 * SWSE Store Application
 * Provides a holographic marketplace interface for buying and selling items
 */

import { SWSECharacterGenerator } from './chargen.js';

export class SWSEStore extends FormApplication {
    constructor(actor, options = {}) {
        super(actor, options);
        this.actor = actor;

        // Shopping cart state
        this.cart = {
            items: [],      // Regular items
            droids: [],     // Droid actors to purchase
            vehicles: []    // Vehicle actors to purchase
        };
    }

    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "swse-store",
            template: "systems/swse/templates/apps/store/store.hbs",
            width: 900,
            height: 700,
            title: "Galactic Trade Exchange",
            resizable: true,
            closeOnSubmit: false,
            classes: ["swse", "swse-store"]
        });
    }

    /**
     * Get data for template rendering
     * @returns {Object} Template data
     */
    getData() {
        const actor = this.object;
        const isGM = game.user.isGM;

        // Get all items from world items
        const allItems = game.items.filter(i => {
            const cost = i.system?.cost ?? i.system?.price ?? 0;
            return cost > 0;
        });

        // Get all actors that could be droids or vehicles
        const allActors = game.actors.filter(a => {
            return (a.type === "droid" || a.type === "vehicle" || a.system?.isDroid)
                && (a.system?.cost ?? 0) > 0;
        });

        // Categorize items
        const categories = {
            weapons: allItems.filter(i => i.type === "weapon"),
            armor: allItems.filter(i => i.type === "armor"),
            equipment: allItems.filter(i =>
                i.type === "equipment" || i.type === "item"
            ),
            vehicles: allActors.filter(a => a.type === "vehicle" || a.system?.isVehicle),
            droids: allActors.filter(a => a.type === "droid" || a.system?.isDroid)
        };

        return {
            actor,
            categories,
            isGM,
            markup: game.settings.get("swse", "storeMarkup") || 0,
            discount: game.settings.get("swse", "storeDiscount") || 0,
            credits: actor.system?.credits || 0
        };
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Tab navigation
        html.find(".shop-tab").click(this._onShopTabClick.bind(this));

        // Item purchasing
        html.find(".buy-item").click(this._onAddItemToCart.bind(this));

        // Droid/Vehicle purchasing
        html.find(".buy-droid").click(this._onBuyDroid.bind(this));
        html.find(".buy-vehicle").click(this._onBuyVehicle.bind(this));
        html.find(".create-custom-droid").click(this._onCreateCustomDroid.bind(this));

        // Cart management
        html.find("#checkout-cart").click(this._onCheckout.bind(this));
        html.find("#clear-cart").click(this._onClearCart.bind(this));

        // GM settings
        html.find(".save-gm").click(this._onSaveGM.bind(this));
    }

    /**
     * Handle shop tab clicks
     * @param {Event} event - Click event
     * @private
     */
    _onShopTabClick(event) {
        event.preventDefault();
        const tabName = event.currentTarget.dataset.tab;
        const doc = this.element[0];

        // Switch active tab
        doc.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        event.currentTarget.classList.add('active');

        // Switch active panel
        doc.querySelectorAll('.shop-panel').forEach(p => p.classList.remove('active'));
        const panel = doc.querySelector(`[data-panel="${tabName}"]`);
        if (panel) panel.classList.add('active');

        // Update cart display if switching to cart tab
        if (tabName === 'cart') {
            this._updateCartDisplay(doc);
        }
    }

    /**
     * Calculate final cost with markup/discount
     * @param {number} baseCost - Base cost of item
     * @returns {number} Final cost
     * @private
     */
    _calculateFinalCost(baseCost) {
        const markup = Number(game.settings.get("swse", "storeMarkup")) || 0;
        const discount = Number(game.settings.get("swse", "storeDiscount")) || 0;
        return Math.round(baseCost * (1 + markup / 100) * (1 - discount / 100));
    }

    /**
     * Add item to shopping cart
     * @param {Event} event - Click event
     * @private
     */
    async _onAddItemToCart(event) {
        event.preventDefault();

        const itemId = event.currentTarget.dataset.itemId;
        if (!itemId) {
            ui.notifications.warn("Invalid item selection.");
            return;
        }

        const item = game.items.get(itemId);
        if (!item) {
            ui.notifications.error("Item not found.");
            return;
        }

        const baseCost = Number(item.system.cost) || 0;
        const finalCost = this._calculateFinalCost(baseCost);

        // Add to cart
        this.cart.items.push({
            id: itemId,
            name: item.name,
            img: item.img,
            cost: finalCost,
            item: item
        });

        ui.notifications.info(`${item.name} added to cart.`);
        this._updateCartCount();
    }

    /**
     * Buy a droid (creates actor and assigns ownership)
     * @param {Event} event - Click event
     * @private
     */
    async _onBuyDroid(event) {
        event.preventDefault();

        const actorId = event.currentTarget.dataset.actorId;
        if (!actorId) {
            ui.notifications.warn("Invalid droid selection.");
            return;
        }

        const droidTemplate = game.actors.get(actorId);
        if (!droidTemplate) {
            ui.notifications.error("Droid not found.");
            return;
        }

        const baseCost = Number(droidTemplate.system.cost) || 0;
        const finalCost = this._calculateFinalCost(baseCost);
        const credits = Number(this.actor.system.credits) || 0;

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
            await this.actor.update({ "system.credits": credits - finalCost });

            // Create droid actor with player ownership
            const droidData = droidTemplate.toObject();
            droidData.name = `${droidTemplate.name} (${this.actor.name}'s)`;
            droidData.ownership = {
                default: 0,
                [game.user.id]: 3  // Owner permission
            };

            const newDroid = await Actor.create(droidData);

            ui.notifications.info(`${droidTemplate.name} purchased! Check your actors list.`);
            this.render();
        } catch (err) {
            console.error("SWSE Store | Droid purchase failed:", err);
            ui.notifications.error("Failed to complete droid purchase.");
        }
    }

    /**
     * Buy a vehicle (new or used, creates actor)
     * @param {Event} event - Click event
     * @private
     */
    async _onBuyVehicle(event) {
        event.preventDefault();

        const actorId = event.currentTarget.dataset.actorId;
        const condition = event.currentTarget.dataset.condition; // "new" or "used"

        if (!actorId) {
            ui.notifications.warn("Invalid vehicle selection.");
            return;
        }

        const vehicleTemplate = game.actors.get(actorId);
        if (!vehicleTemplate) {
            ui.notifications.error("Vehicle not found.");
            return;
        }

        const baseCost = Number(vehicleTemplate.system.cost) || 0;
        const conditionMultiplier = condition === "used" ? 0.5 : 1.0;
        const finalCost = this._calculateFinalCost(baseCost * conditionMultiplier);
        const credits = Number(this.actor.system.credits) || 0;

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
            await this.actor.update({ "system.credits": credits - finalCost });

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
            this.render();
        } catch (err) {
            console.error("SWSE Store | Vehicle purchase failed:", err);
            ui.notifications.error("Failed to complete vehicle purchase.");
        }
    }

    /**
     * Launch custom droid builder
     * @param {Event} event - Click event
     * @private
     */
    async _onCreateCustomDroid(event) {
        event.preventDefault();

        const credits = Number(this.actor.system.credits) || 0;

        if (credits < 1000) {
            ui.notifications.warn("You need at least 1,000 credits to build a custom droid.");
            return;
        }

        // Confirm
        const confirmed = await Dialog.confirm({
            title: "Build Custom Droid",
            content: `<p>Enter the droid construction system?</p>
                     <p>You will design a non-heroic droid at level ${this.actor.system.level || 1}.</p>
                     <p><strong>Minimum cost:</strong> 1,000 credits</p>`,
            defaultYes: true
        });

        if (!confirmed) return;

        try {
            // Close this store window
            this.close();

            // Launch character generator in droid-building mode
            const chargen = new SWSECharacterGenerator(null, {
                droidBuilderMode: true,
                ownerActor: this.actor,
                droidLevel: this.actor.system.level || 1,
                availableCredits: credits
            });

            chargen.render(true);
        } catch (err) {
            console.error("SWSE Store | Failed to launch droid builder:", err);
            ui.notifications.error("Failed to open droid builder.");
        }
    }

    /**
     * Update cart item count badge
     * @private
     */
    _updateCartCount() {
        const doc = this.element[0];
        const cartCountEl = doc.querySelector('#cart-count');
        if (!cartCountEl) return;

        const totalCount = this.cart.items.length + this.cart.droids.length + this.cart.vehicles.length;
        cartCountEl.textContent = totalCount;
    }

    /**
     * Update cart display
     * @param {HTMLElement} doc - Document element
     * @private
     */
    _updateCartDisplay(doc) {
        const cartItemsList = doc.querySelector('#cart-items-list');
        const cartSubtotal = doc.querySelector('#cart-subtotal');
        const cartTotal = doc.querySelector('#cart-total');

        if (!cartItemsList) return;

        cartItemsList.innerHTML = '';
        let total = 0;

        // Render items
        for (const item of this.cart.items) {
            total += item.cost;
            cartItemsList.innerHTML += `
                <div class="cart-item">
                    <div class="item-icon">
                        <img src="${item.img}" alt="${item.name}" width="32" height="32"/>
                    </div>
                    <div class="item-details">
                        <div class="item-name">${item.name}</div>
                    </div>
                    <div class="item-price">
                        <span class="price-amount">${item.cost.toLocaleString()} cr</span>
                    </div>
                    <button type="button" class="remove-from-cart" data-type="item" data-index="${this.cart.items.indexOf(item)}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }

        // Render droids
        for (const droid of this.cart.droids) {
            total += droid.cost;
            cartItemsList.innerHTML += `
                <div class="cart-item">
                    <div class="item-icon">
                        <img src="${droid.img}" alt="${droid.name}" width="32" height="32"/>
                    </div>
                    <div class="item-details">
                        <div class="item-name">${droid.name}</div>
                        <div class="item-specs">Droid</div>
                    </div>
                    <div class="item-price">
                        <span class="price-amount">${droid.cost.toLocaleString()} cr</span>
                    </div>
                    <button type="button" class="remove-from-cart" data-type="droid" data-index="${this.cart.droids.indexOf(droid)}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }

        // Render vehicles
        for (const vehicle of this.cart.vehicles) {
            total += vehicle.cost;
            cartItemsList.innerHTML += `
                <div class="cart-item">
                    <div class="item-icon">
                        <img src="${vehicle.img}" alt="${vehicle.name}" width="32" height="32"/>
                    </div>
                    <div class="item-details">
                        <div class="item-name">${vehicle.name}</div>
                        <div class="item-specs">${vehicle.condition === "used" ? "Used " : ""}Vehicle</div>
                    </div>
                    <div class="item-price">
                        <span class="price-amount">${vehicle.cost.toLocaleString()} cr</span>
                    </div>
                    <button type="button" class="remove-from-cart" data-type="vehicle" data-index="${this.cart.vehicles.indexOf(vehicle)}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }

        // Empty cart message
        if (this.cart.items.length === 0 && this.cart.droids.length === 0 && this.cart.vehicles.length === 0) {
            cartItemsList.innerHTML = `
                <div class="cart-empty-message">
                    <i class="fas fa-box-open"></i>
                    <p>Your cart is empty. Browse the shop to add items!</p>
                </div>
            `;
        }

        // Update totals
        if (cartSubtotal) cartSubtotal.textContent = total.toLocaleString();
        if (cartTotal) cartTotal.textContent = total.toLocaleString();

        // Re-bind remove buttons
        doc.querySelectorAll('.remove-from-cart').forEach(btn => {
            btn.addEventListener('click', this._onRemoveFromCart.bind(this));
        });
    }

    /**
     * Remove item from cart
     * @param {Event} event - Click event
     * @private
     */
    _onRemoveFromCart(event) {
        event.preventDefault();

        const type = event.currentTarget.dataset.type;
        const index = parseInt(event.currentTarget.dataset.index);

        if (type === "item") {
            this.cart.items.splice(index, 1);
        } else if (type === "droid") {
            this.cart.droids.splice(index, 1);
        } else if (type === "vehicle") {
            this.cart.vehicles.splice(index, 1);
        }

        const doc = this.element[0];
        this._updateCartDisplay(doc);
        this._updateCartCount();
    }

    /**
     * Clear entire cart
     * @param {Event} event - Click event
     * @private
     */
    _onClearCart(event) {
        event.preventDefault();

        this.cart.items = [];
        this.cart.droids = [];
        this.cart.vehicles = [];

        const doc = this.element[0];
        this._updateCartDisplay(doc);
        this._updateCartCount();

        ui.notifications.info("Cart cleared.");
    }

    /**
     * Checkout and purchase all items in cart
     * @param {Event} event - Click event
     * @private
     */
    async _onCheckout(event) {
        event.preventDefault();

        const actor = this.object;
        const credits = Number(actor.system.credits) || 0;

        // Calculate total
        let total = 0;
        for (const item of this.cart.items) total += item.cost;
        for (const droid of this.cart.droids) total += droid.cost;
        for (const vehicle of this.cart.vehicles) total += vehicle.cost;

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
                     <p>This will add ${this.cart.items.length} item(s), ${this.cart.droids.length} droid(s), and ${this.cart.vehicles.length} vehicle(s).</p>`,
            defaultYes: true
        });

        if (!confirmed) return;

        try {
            // Deduct credits
            await actor.update({ "system.credits": credits - total });

            // Add regular items to actor
            const itemsToCreate = this.cart.items.map(cartItem => cartItem.item.toObject());
            if (itemsToCreate.length > 0) {
                await actor.createEmbeddedDocuments("Item", itemsToCreate);
            }

            // Create droid actors
            for (const droid of this.cart.droids) {
                const droidData = droid.actor.toObject();
                droidData.name = `${droid.name} (${actor.name}'s)`;
                droidData.ownership = {
                    default: 0,
                    [game.user.id]: 3
                };
                await Actor.create(droidData);
            }

            // Create vehicle actors
            for (const vehicle of this.cart.vehicles) {
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
            this.cart.items = [];
            this.cart.droids = [];
            this.cart.vehicles = [];

            this.render();
        } catch (err) {
            console.error("SWSE Store | Checkout failed:", err);
            ui.notifications.error("Failed to complete purchase.");
        }
    }

    /**
     * Save GM settings
     * @param {Event} event - Click event
     * @private
     */
    async _onSaveGM(event) {
        event.preventDefault();

        if (!game.user.isGM) {
            ui.notifications.error("Only GMs can modify store settings.");
            return;
        }

        try {
            const markup = parseInt(this.element.find("input[name='markup']").val()) || 0;
            const discount = parseInt(this.element.find("input[name='discount']").val()) || 0;

            // Validate ranges
            if (markup < -100 || markup > 1000) {
                ui.notifications.warn("Markup must be between -100% and 1000%.");
                return;
            }

            if (discount < 0 || discount > 100) {
                ui.notifications.warn("Discount must be between 0% and 100%.");
                return;
            }

            await game.settings.set("swse", "storeMarkup", markup);
            await game.settings.set("swse", "storeDiscount", discount);

            ui.notifications.info("Store settings updated.");
            this.render();
        } catch (err) {
            console.error("SWSE Store | Failed to save settings:", err);
            ui.notifications.error("Failed to save store settings.");
        }
    }
}
