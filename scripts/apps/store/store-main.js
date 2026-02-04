/**
 * scripts/apps/store/store-main.js — SWSE Store (ApplicationV2)
 *
 * Responsibilities:
 * - Load store-visible compendium entries (items + droids)
 * - Provide grouped categories to the Handlebars template
 * - Maintain a cart (in-memory + actor flag)
 * - Delegate purchase/checkout logic to store-checkout.js
 *
 * Non-goals:
 * - No pricing/business logic here
 * - No direct mutation of actor currency/items here (handled by checkout module)
 */

import { STORE_PACKS } from "./store-constants.js";
import {
  getCostValue,
  safeString,
  safeImg,
  safeSystem,
  tryRender,
  isValidItemForStore,
  categorizeEquipment,
  sortWeapons,
  sortArmor,
  getRarityClass,
  getRarityLabel
} from "./store-shared.js";
import { getRendarrLine } from "./dialogue/rendarr-dialogue.js";
import {
  addItemToCart,
  addDroidToCart,
  addVehicleToCart,
  removeFromCartById,
  clearCart,
  calculateCartTotal,
  checkout,
  createCustomDroid,
  createCustomStarship
} from "./store-checkout.js";

const { ApplicationV2 } = foundry.applications.api;

const CART_FLAG_SCOPE = "foundryvtt-swse";
const CART_FLAG_KEY = "storeCart";

function emptyCart() {
  return { items: [], droids: [], vehicles: [] };
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

export class SWSEStore extends ApplicationV2 {

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

  constructor(actor = null, options = {}) {
    super(options);
    this.actor = actor ?? null;

    this.itemsById = new Map();
    this.droidsById = new Map();

    this.cart = emptyCart();
    this._loaded = false;
  }

  // NOTE: V2 API - Do NOT override _renderHTML or _replaceHTML
  // Initialization is handled in _prepareContext which is the correct V2 pattern

  async _prepareContext(_options) {
    if (!this._loaded) await this._initialize();

    return {
      categories: this._buildCategoriesForTemplate(),
      credits: Number(this.actor?.system?.credits ?? 0) || 0,
      isGM: game.user?.isGM ?? false,
      rendarrWelcome: getRendarrLine("welcome"),
      rendarrImage: "systems/foundryvtt-swse/assets/mentors/rendarr.webp"
    };
  }

  async _initialize() {
    if (this._loaded) return;
    this._loaded = true;

    this.cart = this._loadCartFromActor();

    await this._loadItemPacks();
    await this._loadDroidPack();
  }

  _loadCartFromActor() {
    if (!this.actor) return emptyCart();
    const stored = this.actor.getFlag(CART_FLAG_SCOPE, CART_FLAG_KEY);
    if (!stored) return emptyCart();
    return {
      items: asArray(stored.items),
      droids: asArray(stored.droids),
      vehicles: asArray(stored.vehicles)
    };
  }

  async _persistCart() {
    if (!this.actor) return;
    await this.actor.setFlag(CART_FLAG_SCOPE, CART_FLAG_KEY, this.cart);
  }

  async _loadItemPacks() {
    const vehicleBuckets = (STORE_PACKS.VEHICLE_PACKS ?? []).filter(Boolean);
    const packIds = [
      STORE_PACKS.WEAPONS,
      STORE_PACKS.ARMOR,
      STORE_PACKS.EQUIPMENT,
      // Prefer bucketed vehicle packs; fall back to canonical pack if buckets are unavailable.
      ...(vehicleBuckets.length ? vehicleBuckets : [STORE_PACKS.VEHICLES_CANONICAL])
    ].filter(Boolean);

    for (const collection of packIds) {
      const pack = game.packs.get(collection);
      if (!pack || pack.documentName !== "Item") continue;

      try {
        const docs = await pack.getDocuments();
        for (const doc of docs) {
          const item = doc.toObject();
          if (!isValidItemForStore(item)) continue;
          this.itemsById.set(item._id, item);
        }
      } catch (err) {
        console.warn(`[SWSE Store] Failed to load pack ${collection}`, err);
      }
    }
  }

  async _loadDroidPack() {
    const pack = game.packs.get(STORE_PACKS.DROIDS);
    if (!pack || pack.documentName !== "Actor") return;

    try {
      const docs = await pack.getDocuments();
      for (const doc of docs) {
        const actor = doc.toObject();
        if (actor.type !== "droid") continue;
        this.droidsById.set(actor._id, actor);
      }
    } catch (err) {
      console.warn(`[SWSE Store] Failed to load droid pack ${STORE_PACKS.DROIDS}`, err);
    }
  }

  _viewFromItem(item) {
    const sys = safeSystem(item) ?? {};
    const rarityClass = getRarityClass(sys.availability);
    return {
      id: item._id,
      name: safeString(item.name),
      img: safeImg(item),
      finalCost: getCostValue(item),
      rarityClass,
      rarityLabel: getRarityLabel(rarityClass),
      system: sys,
      type: item.type
    };
  }

  _viewFromDroid(actor) {
    const sys = safeSystem(actor) ?? {};
    return {
      id: actor._id,
      name: safeString(actor.name),
      img: safeImg(actor),
      finalCost: Number(sys.cost ?? 0) || 0,
      rarityClass: null,
      rarityLabel: "",
      system: sys,
      type: "droid"
    };
  }

  _buildCategoriesForTemplate() {
    const categories = {
      weapons: {
        melee: { simple: [], advanced: [], lightsaber: [], exotic: [] },
        ranged: { pistols: [], rifles: [], heavy_weapons: [], exotic: [] }
      },
      armor: [],
      grenades: [],
      medical: [],
      tech: [],
      tools: [],
      survival: [],
      security: [],
      equipment: [],
      services: [],
      droids: [],
      vehicles: []
    };

    for (const item of this.itemsById.values()) {
      tryRender(() => {
        const view = this._viewFromItem(item);
        const sys = view.system ?? {};

        if (view.type === "weapon") {
          const wc = (sys.weaponCategory || "").toString().toLowerCase();
          const cat = (sys.category || sys.subcategory || "").toString().toLowerCase();

          if (cat === "grenade") {
            categories.grenades.push(view);
            return;
          }

          if (wc === "melee") {
            const key = ["simple", "advanced", "lightsaber", "exotic"].includes(cat) ? cat : "exotic";
            categories.weapons.melee[key].push(view);
            return;
          }

          // ranged
          const rangedKey = cat === "pistol" ? "pistols" :
                            cat === "rifle" ? "rifles" :
                            cat === "heavy" ? "heavy_weapons" :
                            "exotic";
          categories.weapons.ranged[rangedKey].push(view);
          return;
        }

        if (view.type === "armor") {
          categories.armor.push(view);
          return;
        }

        if (view.type === "vehicle") {
          categories.vehicles.push(view);
          return;
        }

        if (view.type === "equipment") {
          const bucket = this._categorizeEquipmentExtended(view);
          categories[bucket].push(view);
          return;
        }

        if (view.type === "service") {
          categories.services.push(view);
        }
      });
    }

    for (const droid of this.droidsById.values()) {
      categories.droids.push(this._viewFromDroid(droid));
    }

    // Sort for consistent UX
    categories.weapons.melee.simple = sortWeapons(categories.weapons.melee.simple);
    categories.weapons.melee.advanced = sortWeapons(categories.weapons.melee.advanced);
    categories.weapons.melee.lightsaber = sortWeapons(categories.weapons.melee.lightsaber);
    categories.weapons.melee.exotic = sortWeapons(categories.weapons.melee.exotic);

    categories.weapons.ranged.pistols = sortWeapons(categories.weapons.ranged.pistols);
    categories.weapons.ranged.rifles = sortWeapons(categories.weapons.ranged.rifles);
    categories.weapons.ranged.heavy_weapons = sortWeapons(categories.weapons.ranged.heavy_weapons);
    categories.weapons.ranged.exotic = sortWeapons(categories.weapons.ranged.exotic);

    categories.armor = sortArmor(categories.armor);
    categories.grenades = sortWeapons(categories.grenades);
    categories.droids = categories.droids.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    categories.vehicles = categories.vehicles.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

    for (const key of ["medical","tech","tools","survival","security","equipment","services"]) {
      categories[key] = categories[key].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }

    return categories;
  }

  _categorizeEquipmentExtended(view) {
    const sys = view.system ?? {};
    const name = (view.name || "").toLowerCase();
    const desc = (sys.description || "").toString().toLowerCase();
    const text = `${name} ${desc}`;

    if (text.includes("ration") || text.includes("survival") || text.includes("tent") || text.includes("climbing") || text.includes("breather")) return "survival";
    if (text.includes("security") || text.includes("lock") || text.includes("binders") || text.includes("restraint") || text.includes("alarm")) return "security";

    return categorizeEquipment({ name: view.name, system: sys });
  }

  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    // Add to cart buttons
    root.querySelectorAll(".buy-item").forEach(btn => {
      btn.addEventListener("click", ev => {
        const id = ev.currentTarget?.dataset?.itemId;
        if (!id) return;
        addItemToCart(this, id, line => this._setRendarrLine(line));
        this._persistCart();
        this._renderCartUI();
      });
    });

    root.querySelectorAll(".buy-droid").forEach(btn => {
      btn.addEventListener("click", ev => {
        const id = ev.currentTarget?.dataset?.actorId || ev.currentTarget?.dataset?.droidId;
        if (!id) return;
        addDroidToCart(this, id, line => this._setRendarrLine(line));
        this._persistCart();
        this._renderCartUI();
      });
    });

    root.querySelectorAll(".buy-vehicle").forEach(btn => {
      btn.addEventListener("click", ev => {
        const id = ev.currentTarget?.dataset?.actorId || ev.currentTarget?.dataset?.vehicleId;
        const condition = ev.currentTarget?.dataset?.condition || "new";
        if (!id) return;
        addVehicleToCart(this, id, condition, line => this._setRendarrLine(line));
        this._persistCart();
        this._renderCartUI();
      });
    });

    // Custom builders
    const customDroidBtn = root.querySelector(".create-custom-droid");
    if (customDroidBtn) {
      customDroidBtn.addEventListener("click", async () => {
        if (!this.actor) return;
        await createCustomDroid(this.actor, () => this.render());
      });
    }

    const customStarshipBtn = root.querySelector(".create-custom-starship");
    if (customStarshipBtn) {
      customStarshipBtn.addEventListener("click", async () => {
        if (!this.actor) return;
        await createCustomStarship(this.actor, () => this.render());
      });
    }

    const checkoutBtn = root.querySelector("#checkout-cart");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", async () => {
        await checkout(this, (el, v) => this._animateNumber(el, v));
        this.cart = emptyCart();
        await this._persistCart();
        this._renderCartUI();
      });
    }

    const clearBtn = root.querySelector("#clear-cart");
    if (clearBtn) {
      clearBtn.addEventListener("click", async () => {
        clearCart(this.cart);
        await this._persistCart();
        this._renderCartUI();
      });
    }

    // Initial render once DOM exists
    this._renderCartUI();
  }

  _setRendarrLine(line) {
    const el = this.element?.querySelector?.(".holo-message");
    if (!el) return;
    el.textContent = `"${line}"`;
  }

  _animateNumber(el, value) {
    if (!el) return;
    el.textContent = value;
  }

  _renderCartUI() {
    const rootEl = this.element;
    if (!rootEl) return;

    const listEl = rootEl.querySelector("#cart-items-list");
    const subtotalEl = rootEl.querySelector("#cart-subtotal");
    const remainingEl = rootEl.querySelector("#cart-remaining");
    const countEl = rootEl.querySelector("#cart-count");
    if (!listEl || !subtotalEl || !remainingEl || !countEl) return;

    const subtotal = calculateCartTotal(this.cart);
    const credits = Number(this.actor?.system?.credits ?? 0) || 0;
    const remaining = credits - subtotal;

    countEl.textContent = String((this.cart.items.length + this.cart.droids.length + this.cart.vehicles.length) || 0);
    subtotalEl.textContent = String(subtotal);
    remainingEl.textContent = String(Math.max(0, remaining));

    listEl.innerHTML = "";

    const addRow = (entry, type) => {
      const row = document.createElement("div");
      row.classList.add("cart-item-row");
      row.innerHTML = `
        <img class="cart-item-img" src="${entry.img || ""}" alt="${entry.name || ""}"/>
        <div class="cart-item-meta">
          <div class="cart-item-name">${entry.name || ""}</div>
          <div class="cart-item-cost">₢ ${entry.cost ?? 0}</div>
        </div>
        <button type="button" class="cart-item-remove holo-btn secondary" data-type="${type}" data-id="${entry.id}">
          <i class="fas fa-times"></i>
        </button>
      `;
      listEl.appendChild(row);
    };

    for (const it of this.cart.items) addRow(it, "items");
    for (const it of this.cart.droids) addRow(it, "droids");
    for (const it of this.cart.vehicles) addRow(it, "vehicles");

    listEl.querySelectorAll(".cart-item-remove").forEach(btn => {
      btn.addEventListener("click", async (ev) => {
        const type = ev.currentTarget.dataset.type;
        const id = ev.currentTarget.dataset.id;
        removeFromCartById(this.cart, type, id);
        await this._persistCart();
        this._renderCartUI();
      });
    });
  }
}
