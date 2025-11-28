/**
 * SWSE Store Application
 *
 * @class SWSEStore
 * @extends {FormApplication}
 * @description
 * Galactic Trade Exchange - A holographic marketplace interface for buying
 * and selling items, droids, and vehicles in Star Wars Saga Edition.
 *
 * Features:
 * - Browse equipment by category (Weapons, Armor, Gear, etc.)
 * - Filter by availability (Common, Military, Restricted, Illegal, Rare)
 * - Search functionality across all items
 * - Shopping cart with drag-and-drop
 * - Dynamic pricing with markup/discount based on Persuasion
 * - Credit management and transaction history
 * - Rendarr the merchant NPC with dialogue
 * - Separate tabs for Items, Droids, and Vehicles
 *
 * @example
 * // Open store for a character
 * const store = new SWSEStore(actor);
 * store.render(true);
 *
 * @example
 * // Open store with GM options
 * if (game.user.isGM) {
 *   const store = new SWSEStore(actor, { isGM: true });
 *   store.render(true);
 * }
 */

import { SWSELogger } from '../../utils/logger.js';
import { getRandomDialogue, getPersonalizedGreeting } from './store-shared.js';
import { getStoreMarkup, getStoreDiscount } from './store-pricing.js';
import { loadInventoryData } from './store-inventory.js';
import { applyAvailabilityFilter, applySearchFilter, switchToPanel, applySorting } from './store-filters.js';
import * as Checkout from './store-checkout.js';
import { scanForInvalidIds, fixInvalidIds, diagnoseIds } from './store-id-fixer.js';

export class SWSEStore extends FormApplication {
    /**
     * Create a new Store application
     *
     * @param {Actor} actor - The actor doing the shopping
     * @param {Object} [options={}] - Additional application options
     */
    constructor(actor, options = {}) {
        super(actor, options);
        this.actor = actor;

        // Shopping cart state
        this.cart = {
            items: [],      // Regular items
            droids: [],     // Droid actors to purchase
            vehicles: []    // Vehicle actors to purchase
        };

        // Track cart total for animations
        this.cartTotal = 0;

        // Store items by ID for quick lookup
        this.itemsById = new Map();
    }

    /**
     * Default application options
     *
     * @static
     * @returns {Object} Default options
     * @override
     */
    static get defaultOptions() {
        return foundry.utils.mergeObject(super.defaultOptions, {
            id: "swse-store",
            template: "systems/swse/templates/apps/store/store.hbs",
            width: 900,
            height: 700,
            title: "Galactic Trade Exchange",
            resizable: true,
            draggable: true,
            scrollY: [".store-content", ".tab-content", ".window-content"],
            closeOnSubmit: false,
            classes: ["swse", "swse-store"],
            left: null,  // Allow Foundry to center
            top: null    // Allow Foundry to center
        });
    }

    /**
     * Prepare data for template rendering
     *
     * @returns {Promise<Object>} Template data containing:
     * @returns {Actor} returns.actor - The shopping actor
     * @returns {Array<Object>} returns.categories - Item categories with inventory
     * @returns {boolean} returns.isGM - Whether current user is GM
     * @returns {number} returns.markup - Store price markup percentage
     * @returns {number} returns.discount - Store price discount percentage
     * @returns {number} returns.credits - Actor's current credits
     * @returns {string} returns.rendarrImage - Path to Rendarr's portrait
     * @returns {string} returns.rendarrWelcome - Welcome dialogue from Rendarr
     * @override
     */
    async getData() {
        const actor = this.object;
        const isGM = game.user.isGM;

        // Show loading notification for large inventories
        const loadingNotification = ui.notifications.info("Loading store inventory...", { permanent: true });

        try {
            // Load all inventory data
            const categories = await loadInventoryData(this.itemsById);

            // Close loading notification
            if (loadingNotification) {
                loadingNotification.close();
            }

            return {
                actor,
                categories,
                isGM,
                markup: getStoreMarkup(),
                discount: getStoreDiscount(),
                credits: actor.system?.credits || 0,
                rendarrImage: "systems/swse/assets/icons/rendarr.webp",
                rendarrWelcome: getPersonalizedGreeting(actor)
            };
        } catch (err) {
            // Close loading notification on error
            if (loadingNotification) {
                loadingNotification.close();
            }
            throw err;
        }
    }

    /**
     * Clean up resources when store is closed
     * @override
     */
    async close(options) {
        // Clear itemsById map to prevent memory leaks
        this.itemsById.clear();

        // Clear search debounce timer
        if (this._searchDebounceTimer) {
            clearTimeout(this._searchDebounceTimer);
            this._searchDebounceTimer = null;
        }

        return super.close(options);
    }

    activateListeners(html) {
        super.activateListeners(html);

        // Category filter dropdown
        html.find("#shop-category-filter").change(this._onCategoryFilterChange.bind(this));

        // Availability filter dropdown
        html.find("#shop-availability-filter").change(this._onAvailabilityFilterChange.bind(this));

        // Sort dropdown
        html.find("#shop-sort-select").change(this._onSortChange.bind(this));

        // Search input
        html.find("#shop-search-input").on('input', this._onSearchInput.bind(this));

        // Cart and GM buttons
        html.find(".view-cart-btn").click(this._onShopTabClick.bind(this));
        html.find(".gm-settings-btn").click(this._onShopTabClick.bind(this));

        // Item purchasing
        html.find(".buy-item").click(this._onAddItemToCart.bind(this));

        // Service purchasing
        html.find(".buy-service").click(this._onBuyService.bind(this));

        // Droid/Vehicle purchasing
        html.find(".buy-droid").click(this._onBuyDroid.bind(this));
        html.find(".buy-vehicle").click(this._onBuyVehicle.bind(this));
        html.find(".create-custom-droid").click(this._onCreateCustomDroid.bind(this));
        html.find(".create-custom-starship").click(this._onCreateCustomStarship.bind(this));

        // Cart management
        html.find("#checkout-cart").click(this._onCheckout.bind(this));
        html.find("#clear-cart").click(this._onClearCart.bind(this));

        // GM settings
        html.find(".save-gm").click(this._onSaveGM.bind(this));
    }

    /**
     * Update Rendarr's dialogue in the UI
     * @param {HTMLElement} html - The app's HTML element
     * @param {string} message - The message to display
     * @private
     */
    _updateRendarrDialogue(html, message) {
        const messageEl = html.find('.holo-message');
        if (messageEl.length) {
            messageEl.text(`"${message}"`);
        }
    }

    /**
     * Animate a number counting up or down
     * @param {HTMLElement} element - The element to update
     * @param {number} start - Starting value
     * @param {number} end - Ending value
     * @param {number} duration - Duration in milliseconds
     * @private
     */
    _animateNumber(element, start, end, duration = 500) {
        const startTime = Date.now();
        const difference = end - start;

        const updateNumber = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smooth animation
            const easeProgress = progress < 0.5
                ? 2 * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;

            const currentValue = Math.round(start + (difference * easeProgress));
            element.textContent = currentValue.toLocaleString();

            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            }
        };

        requestAnimationFrame(updateNumber);
    }

    /**
     * Handle category filter dropdown change
     * @param {Event} event - Change event
     * @private
     */
    _onCategoryFilterChange(event) {
        event.preventDefault();
        const tabName = event.currentTarget.value;
        const doc = this.element[0];

        switchToPanel(doc, tabName, this.itemsById, (dialogue) => {
            this._updateRendarrDialogue($(doc), dialogue);
        });
    }

    /**
     * Handle availability filter dropdown change
     * @param {Event} event - Change event
     * @private
     */
    _onAvailabilityFilterChange(event) {
        event.preventDefault();
        const availabilityFilter = event.currentTarget.value;
        const doc = this.element[0];

        // Apply filter to all visible items in the active panel
        applyAvailabilityFilter(doc, availabilityFilter, this.itemsById);
    }

    /**
     * Handle sort dropdown change
     * @param {Event} event - Change event
     * @private
     */
    _onSortChange(event) {
        event.preventDefault();
        const sortValue = event.currentTarget.value;
        const doc = this.element[0];

        // Apply sorting to all items in the active panel
        applySorting(doc, sortValue, this.itemsById);
    }

    /**
     * Handle search input
     * @param {Event} event - Input event
     * @private
     */
    _onSearchInput(event) {
        event.preventDefault();
        const searchTerm = event.currentTarget.value.toLowerCase().trim();
        const doc = this.element[0];

        // Clear existing debounce timer
        if (this._searchDebounceTimer) {
            clearTimeout(this._searchDebounceTimer);
        }

        // Debounce search by 300ms
        this._searchDebounceTimer = setTimeout(() => {
            applySearchFilter(doc, searchTerm);
        }, 300);
    }

    /**
     * Handle shop tab clicks (cart and GM buttons)
     * @param {Event} event - Click event
     * @private
     */
    _onShopTabClick(event) {
        event.preventDefault();
        const tabName = event.currentTarget.dataset.tab;
        const doc = this.element[0];

        switchToPanel(doc, tabName, this.itemsById, (dialogue) => {
            this._updateRendarrDialogue($(doc), dialogue);
        });

        // Update cart display if switching to cart tab
        if (tabName === 'cart') {
            this._updateCartDisplay(doc);
        }
    }

    /**
     * Add item to shopping cart
     * @param {Event} event - Click event
     * @private
     */
    async _onAddItemToCart(event) {
        event.preventDefault();

        const itemId = event.currentTarget.dataset.itemId;
        await Checkout.addItemToCart(this, itemId, (dialogue) => {
            this._updateRendarrDialogue(this.element, dialogue);
        });

        this._updateCartCount();
        this._updateCartDisplay(this.element[0]);
    }

    /**
     * Purchase a service (immediate credit deduction)
     * @param {Event} event - Click event
     * @private
     */
    async _onBuyService(event) {
        event.preventDefault();

        const button = event.currentTarget;
        const serviceName = button.dataset.name;
        const serviceCost = Number(button.dataset.cost) || 0;

        await Checkout.buyService(
            this.actor,
            serviceName,
            serviceCost,
            (dialogue) => this._updateRendarrDialogue(this.element, dialogue),
            () => this.render(false)
        );
    }

    /**
     * Buy a droid (creates actor and assigns ownership)
     * @param {Event} event - Click event
     * @private
     */
    async _onBuyDroid(event) {
        event.preventDefault();

        const actorId = event.currentTarget.dataset.actorId;
        await Checkout.buyDroid(this, actorId);
    }

    /**
     * Buy a vehicle (new or used, creates actor)
     * @param {Event} event - Click event
     * @private
     */
    async _onBuyVehicle(event) {
        event.preventDefault();

        const actorId = event.currentTarget.dataset.actorId;
        const condition = event.currentTarget.dataset.condition;

        await Checkout.buyVehicle(this, actorId, condition);
    }

    /**
     * Launch custom droid builder
     * @param {Event} event - Click event
     * @private
     */
    async _onCreateCustomDroid(event) {
        event.preventDefault();

        await Checkout.createCustomDroid(this.actor, () => this.close());
    }

    /**
     * Launch custom starship builder
     * @param {Event} event - Click event
     * @private
     */
    async _onCreateCustomStarship(event) {
        event.preventDefault();

        await Checkout.createCustomStarship(this.actor, () => this.close());
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

        // Animate cart count badge
        cartCountEl.classList.add('bounce');
        setTimeout(() => cartCountEl.classList.remove('bounce'), 400);
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
        const cartRemaining = doc.querySelector('#cart-remaining');
        const remainingPreview = doc.querySelector('#remaining-credits-preview');

        if (!cartItemsList) return;

        cartItemsList.innerHTML = '';
        const total = Checkout.calculateCartTotal(this.cart);

        // Render items
        for (const item of this.cart.items) {
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
                    <button type="button" class="remove-from-cart" data-type="item" data-item-id="${item.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }

        // Render droids
        for (const droid of this.cart.droids) {
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
                    <button type="button" class="remove-from-cart" data-type="droid" data-item-id="${droid.id}">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
        }

        // Render vehicles
        for (const vehicle of this.cart.vehicles) {
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
                    <button type="button" class="remove-from-cart" data-type="vehicle" data-item-id="${vehicle.id}">
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

        // Update totals with animation
        const previousTotal = this.cartTotal || 0;
        if (cartSubtotal) this._animateNumber(cartSubtotal, previousTotal, total, 400);
        if (cartTotal) this._animateNumber(cartTotal, previousTotal, total, 400);
        this.cartTotal = total;

        // Update remaining credits preview
        const currentCredits = Number(this.actor.system?.credits) || 0;
        const remainingCredits = currentCredits - total;
        if (cartRemaining) {
            cartRemaining.textContent = remainingCredits.toLocaleString();

            // Color code based on affordability
            if (remainingPreview) {
                if (remainingCredits < 0) {
                    remainingPreview.style.color = '#ff4444'; // Red for insufficient funds
                } else if (remainingCredits < currentCredits * 0.1) {
                    remainingPreview.style.color = '#ffaa00'; // Orange for low funds
                } else {
                    remainingPreview.style.color = '#44ff44'; // Green for good
                }
            }
        }

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
        const itemId = event.currentTarget.dataset.itemId;

        Checkout.removeFromCartById(this.cart, type, itemId);

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

        Checkout.clearCart(this.cart);

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

        await Checkout.checkout(this, this._animateNumber.bind(this));
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
            const markupInput = this.element.find("input[name='markup']").val();
            const discountInput = this.element.find("input[name='discount']").val();

            // Convert to numbers with strict validation
            const markup = Number(markupInput);
            const discount = Number(discountInput);

            // Validate that inputs are valid numbers
            if (isNaN(markup)) {
                ui.notifications.warn("Markup must be a valid number.");
                return;
            }

            if (isNaN(discount)) {
                ui.notifications.warn("Discount must be a valid number.");
                return;
            }

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
            SWSELogger.error("SWSE Store | Failed to save settings:", err);
            ui.notifications.error("Failed to save store settings.");
        }
    }

    /**
     * Static diagnostic utilities for debugging ID issues
     */

    /**
     * Scan all store items and actors for invalid IDs
     * Usage: await SWSEStore.diagnoseIds()
     * @static
     */
    static async diagnoseIds() {
        return await diagnoseIds();
    }

    /**
     * Scan for invalid IDs and return detailed report
     * Usage: const report = await SWSEStore.scanForInvalidIds()
     * @static
     */
    static async scanForInvalidIds() {
        return await scanForInvalidIds();
    }

    /**
     * Attempt to fix items/actors with missing IDs (GM only)
     * Usage: const report = await SWSEStore.scanForInvalidIds(); await SWSEStore.fixInvalidIds(report)
     * @static
     */
    static async fixInvalidIds(report) {
        return await fixInvalidIds(report);
    }
}
