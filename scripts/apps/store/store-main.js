/**
 * store-main.js — SWSE Store (ApplicationV2)
 */

import {
  getCostDisplay,
  getCostValue,
  safeString,
  safeImg,
  safeSystem,
  tryRender,
  isValidItemForStore
} from "./store-shared.js";
import { getRendarrLine } from "./dialogue/rendarr-dialogue.js";
import { checkout } from "./store-checkout.js";

const { ApplicationV2 } = foundry.applications.api;
const CART_FLAG = "storeCart";

export class SWSEStore extends ApplicationV2 {

  constructor(actor = null, options = {}) {
    super(options);

    this.actor =
      actor ||
      canvas?.tokens?.controlled?.[0]?.actor ||
      game.user?.character ||
      null;

    this.itemsById = new Map();
    this.groupedItems = {
      weapons: new Map(),
      armor: new Map(),
      equipment: new Map(),
      droids: new Map(),
      vehicles: new Map(),
      other: new Map()
    };

    this._loaded = false;
    this._loadedPacks = new Set();

    this.cart = foundry.utils.deepClone(
      game.user.getFlag("swse", CART_FLAG) ??
      { items: {}, droids: {}, vehicles: {} }
    );
  }

  /* -------------------------------------------- */

  static DEFAULT_OPTIONS = {
    id: "swse-store",
    tag: "section",
    window: {
      title: "Galactic Trade Exchange",
      width: 980,
      height: 700,
      resizable: true
    },
    classes: ["swse", "store", "swse-app-store"],
    template: "systems/foundryvtt-swse/templates/apps/store/store.hbs"
  };

  /* -------------------------------------------- */

  async _renderHTML(context, options) {
    if (!this._loaded) {
      await this._initialize();
    }
    return super._renderHTML(context, options);
  }

  async _initialize() {
    if (this._loaded) return;
    this._loaded = true;

    await this._loadAllPacks();
    this._buildGroups();
  }

  /* -------------------------------------------- */

  async _loadAllPacks() {
    for (const pack of game.packs) {
      if (pack.documentName !== "Item") continue;
      if (this._loadedPacks.has(pack.collection)) continue;

      try {
        const docs = await pack.getDocuments();
        for (const doc of docs) {
          const item = doc.toObject();
          if (!isValidItemForStore(item)) continue;
          this.itemsById.set(item._id, item);
        }
        this._loadedPacks.add(pack.collection);
      } catch (err) {
        console.warn(`[SWSE Store] Failed to load pack ${pack.collection}`, err);
      }
    }
  }

  /* -------------------------------------------- */

  _prepareItemForView(item) {
    const sys = safeSystem(item) ?? {};

    return {
      _id: item._id,
      name: safeString(item.name),
      img: safeImg(item),
      costText: getCostDisplay(item),
      costValue: getCostValue(item),
      raw: item,
      system: sys,
      type: item.type,
      category: sys.category ?? "General"
    };
  }

  _buildGroups() {
    for (const map of Object.values(this.groupedItems)) {
      map.clear();
    }

    for (const item of this.itemsById.values()) {
      tryRender(() => {
        const view = this._prepareItemForView(item);
        const bucket = this._determineBucket(view);
        this._addToGroup(bucket, view);
      });
    }
  }

  _determineBucket(view) {
    switch (view.type) {
      case "weapon": return "weapons";
      case "armor": return "armor";
      case "equipment": return "equipment";
      case "droid": return "droids";
      case "vehicle": return "vehicles";
      default: return "other";
    }
  }

  _addToGroup(bucket, view) {
    const map = this.groupedItems[bucket];
    const cat = view.category;
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat).push(view);
  }

  /* -------------------------------------------- */

  get context() {
    const cartCount =
      Object.values(this.cart.items).reduce((a, b) => a + b.qty, 0) +
      Object.keys(this.cart.droids).length +
      Object.keys(this.cart.vehicles).length;

    return {
      categories: this.groupedItems,
      credits: this.actor?.system?.credits ?? 0,
      cart: this.cart,
      cartCount,
      rendarrWelcome: getRendarrLine("welcome"),
      rendarrImage: "modules/foundryvtt-swse/images/rendarr.webp"
    };
  }

  /* -------------------------------------------- */

  activateListeners(html) {
    super.activateListeners(html);

    html.on("click", '[data-action="add-to-cart"]', ev => {
      const id = ev.currentTarget.dataset.itemId;
      const item = this.itemsById.get(id);
      if (!item) return;

      const entry = this.cart.items[id];
      if (entry) {
        entry.qty += 1;
      } else {
        const view = this._prepareItemForView(item);
        this.cart.items[id] = {
          id,
          name: view.name,
          cost: view.costValue,
          qty: 1
        };
      }

      this._persistCart();
      this.render({ parts: ["body"] });
    });

    html.on("click", ".remove-from-cart-btn", ev => {
      const { itemId, type } = ev.currentTarget.dataset;
      if (type === "item") delete this.cart.items[itemId];
      if (type === "droid") delete this.cart.droids[itemId];
      if (type === "vehicle") delete this.cart.vehicles[itemId];
      this._persistCart();
      this.render({ parts: ["body"] });
    });

    html.find("#checkout-cart").on("click", async () => {
      await checkout(this);
      this.cart = { items: {}, droids: {}, vehicles: {} };
      this._persistCart();
      this.render(true);
    });

    html.find("#clear-cart").on("click", () => {
      this.cart = { items: {}, droids: {}, vehicles: {} };
      this._persistCart();
      this.render(true);
    });
  }

  async _persistCart() {
    await game.user.setFlag("swse", CART_FLAG, this.cart);
  }
}
