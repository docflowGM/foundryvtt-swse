/**
 * store-app.js
 * -------------
 * Main Foundry application for SWSE Store 2.0.
 *
 * Responsibilities:
 *  - Load/own controller
 *  - Own cart state
 *  - Render the main store template
 *  - Provide public API for cart actions
 */

import { StoreController } from "../ui/controller.js";
import { updateCartBadge, animateNumber } from "../ui/components.js";
import { renderCart } from "../ui/renderer.js";
import { StoreCart } from "./cart.js";
import { StoreCheckout } from "./checkout.js";

export class SWSEStoreApp extends Application {

  constructor(actor = null, options = {}) {
    super(options);

    /* -------------------------------------------------- */
    /* ACTOR + CREDITS TRACKING                            */
    /* -------------------------------------------------- */

    this.actor = actor;  // if null, GM shopping

    /* -------------------------------------------------- */
    /* CONTROLLER                                          */
    /* -------------------------------------------------- */

    this.controller = new StoreController(this);

    /* -------------------------------------------------- */
    /* CART                                                */
    /* -------------------------------------------------- */

    this.cart = new StoreCart();
  }

  /* -------------------------------------------------- */
  /* DEFAULT OPTIONS                                     */
  /* -------------------------------------------------- */

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "swse-store",
      classes: ["swse", "swse-store"],
      template: "systems/foundryvtt-swse/templates/apps/store/store.hbs",
      width: 1100,
      height: 800,
      scrollY: [".shop-body"],
      resizable: true,
      minimizable: true,
      title: "SWSE Galactic Marketplace"
    });
  }

  /* -------------------------------------------------- */
  /* GET DATA (initial template render)                  */
  /* -------------------------------------------------- */

  async getData(options = {}) {
    await this.controller.init();

    const credits = this.actor?.system?.credits ?? 0;

    return {
      title: this.options.title || "SWSE Galactic Marketplace",
      credits: credits,
      actorName: this.actor?.name || "GM Console",
      isGM: game.user.isGM,
      showCheckout: !!this.actor
    };
  }

  /* -------------------------------------------------- */
  /* RENDER HOOK                                         */
  /* -------------------------------------------------- */

  activateListeners(html) {
    super.activateListeners(html);

    // Initialize controller UI
    this.controller.onRender(html);

    // Cart button bindings
    this._bindProductActions(html);
    this._bindCartActions(html);
    this._bindGMActions(html);
  }

  /* -------------------------------------------------- */
  /* PRODUCT ACTION BUTTONS                              */
  /* -------------------------------------------------- */

  _bindProductActions(html) {
    // Standard "Add to Cart" button
    html.on("click", ".buy-item", ev => {
      const id = ev.currentTarget.dataset.itemId;
      if (!id) return;

      this.addToCart(id);
    });

    // Droid purchase
    html.on("click", ".buy-droid", ev => {
      const id = ev.currentTarget.dataset.actorId;
      if (!id) return;

      this.addToCart(id, { type: "droid" });
    });

    // Vehicle purchase (with condition selection)
    html.on("click", ".buy-vehicle", ev => {
      const id = ev.currentTarget.dataset.actorId;
      const condition = ev.currentTarget.dataset.condition || "new";
      if (!id) return;

      this.addToCart(id, { type: "vehicle", condition });
    });
  }

  /* -------------------------------------------------- */
  /* CART MANAGEMENT BUTTONS                             */
  /* -------------------------------------------------- */

  _bindCartActions(html) {
    // Checkout button
    html.find("#checkout-cart").on("click", () => {
      this.checkout();
    });

    // Clear cart button
    html.find("#clear-cart").on("click", () => {
      if (confirm("Clear all items from cart?")) {
        this.cart.clear();
        this._refreshCartPanel(html);
      }
    });

    // Remove item from cart
    html.on("click", ".cart-remove-btn", ev => {
      const id = ev.currentTarget.dataset.itemId;
      const condition = ev.currentTarget.dataset.condition || "new";
      if (!id) return;

      this.cart.remove(id, condition);
      this._refreshCartPanel(html);
    });

    // Increment quantity
    html.on("click", ".cart-qty-inc", ev => {
      const id = ev.currentTarget.dataset.itemId;
      const condition = ev.currentTarget.dataset.condition || "new";
      if (!id) return;

      this.cart.increment(id, condition);
      this._refreshCartPanel(html);
    });

    // Decrement quantity
    html.on("click", ".cart-qty-dec", ev => {
      const id = ev.currentTarget.dataset.itemId;
      const condition = ev.currentTarget.dataset.condition || "new";
      if (!id) return;

      this.cart.decrement(id, condition);
      this._refreshCartPanel(html);
    });
  }

  /* -------------------------------------------------- */
  /* GM ACTIONS                                          */
  /* -------------------------------------------------- */

  _bindGMActions(html) {
    if (!game.user.isGM) return;

    // GM settings button (Phase 4)
    html.find("#gm-settings-btn").on("click", () => {
      this.openGMSettings();
    });

    // Refresh index button
    html.find("#refresh-store-btn").on("click", () => {
      this.refreshStore();
    });
  }

  /* -------------------------------------------------- */
  /* PUBLIC CART API                                     */
  /* -------------------------------------------------- */

  /**
   * Add item to cart. Works for items, droids, or vehicles.
   */
  addToCart(id, opts = {}) {
    const item = this.controller.index.byId.get(id);
    if (!item) {
      ui.notifications.error("Item not found in store index.");
      return;
    }

    // If no actor, this is GM console - just add for browsing
    if (!this.actor) {
      const entry = this.cart.add(item, opts);
      this._updateCartBadge();
      ui.notifications.info(`${item.name} added to cart.`);
      return entry;
    }

    // Check if player has enough credits
    const cost = opts.type === "vehicle" && opts.condition === "used"
      ? item.finalCostUsed
      : item.finalCost;

    if (cost === null || cost === undefined) {
      ui.notifications.error("Item has no valid price.");
      return;
    }

    const credits = this.actor.system?.credits ?? 0;
    if (credits < cost) {
      ui.notifications.warn(`Insufficient credits. Need ${cost}, have ${credits}.`);
      return;
    }

    // Add to cart
    const entry = this.cart.add(item, opts);
    this._updateCartBadge();
    this._refreshCartPanel(this.element);

    ui.notifications.info(`${item.name} added to cart.`);
  }

  /**
   * Remove item from cart.
   */
  removeFromCart(id, condition = "new") {
    this.cart.remove(id, condition);
    this._updateCartBadge();
    this._refreshCartPanel(this.element);
  }

  /**
   * Clear entire cart.
   */
  clearCart() {
    this.cart.clear();
    this._updateCartBadge();
    this._refreshCartPanel(this.element);
  }

  /* -------------------------------------------------- */
  /* CHECKOUT                                            */
  /* -------------------------------------------------- */

  async checkout() {
    if (!this.actor) {
      ui.notifications.error("No actor associated with this store.");
      return;
    }

    // Use the dedicated checkout engine
    const checkout = new StoreCheckout(this.actor, this.cart);
    const success = await checkout.processPurchase(this.id);

    if (success) {
      // Refresh cart UI after successful purchase
      this._refreshCartPanel(this.element);
      this._updateCartBadge();
    }
  }

  /* -------------------------------------------------- */
  /* GM SETTINGS (Phase 4)                               */
  /* -------------------------------------------------- */

  openGMSettings() {
    ui.notifications.info("GM Settings dialog will be implemented in Phase 4.");
  }

  /* -------------------------------------------------- */
  /* REFRESH STORE INDEX                                 */
  /* -------------------------------------------------- */

  async refreshStore() {
    ui.notifications.info("Refreshing store inventory...");
    await this.controller.init();
    ui.notifications.info("Store refreshed.");
  }

  /* -------------------------------------------------- */
  /* UI HELPERS                                          */
  /* -------------------------------------------------- */

  _updateCartBadge() {
    updateCartBadge(this, this.cart.entries.length);
  }

  _refreshCartPanel(html) {
    if (!html || !html.length) {
      html = this.element;
    }

    const container = html.find("#cart-items-list");
    if (!container.length) return;

    renderCart(container, this.cart.entries);

    // Update totals
    const subtotal = this.cart.subtotal;
    const credits = this.actor?.system?.credits ?? 0;
    const remaining = credits - subtotal;

    html.find("#cart-subtotal").text(subtotal);
    html.find("#cart-total").text(subtotal);
    html.find("#cart-remaining").text(remaining);

    // Disable checkout if insufficient credits
    const checkoutBtn = html.find("#checkout-cart");
    if (remaining < 0) {
      checkoutBtn.prop("disabled", true).addClass("disabled");
    } else {
      checkoutBtn.prop("disabled", false).removeClass("disabled");
    }
  }

  /* -------------------------------------------------- */
  /* CLOSE HANDLER                                       */
  /* -------------------------------------------------- */

  async close(options = {}) {
    // Save cart to localStorage for persistence (optional)
    try {
      localStorage.setItem(
        "swse-cart-state",
        JSON.stringify(this.cart.entries)
      );
    } catch (err) {
      console.warn("Failed to save cart state:", err);
    }

    return super.close(options);
  }
}
