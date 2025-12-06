/**
 * store-main.js (robust version with droid & vehicle grouping)
 *
 * - Loads configured packs (weapons, armor, equipment, droids, vehicles)
 * - Normalizes and groups droids & vehicles by category keys already present in compendiums
 * - Exposes `groupedItems` for templates to render category headers and lists
 *
 * Requires exports from store-shared.js:
 *   getCostDisplay, getCostValue, safeString, safeImg, safeSystem, tryRender, isValidItemForStore
 */

import { STORE_PACKS } from "./store-constants.js";
import {
  getCostDisplay,
  getCostValue,
  safeString,
  safeImg,
  safeSystem,
  tryRender,
  isValidItemForStore,
} from "./store-shared.js";

export class SWSEStore extends FormApplication {
  constructor(options = {}) {
    super({}, options);
    this.itemsById = new Map();
    this.items = [];
    this.groupedItems = {
      weapons: new Map(),
      armor: new Map(),
      equipment: new Map(),
      droids: new Map(),
      vehicles: new Map(),
      other: new Map()
    };
    this._loadedPacks = new Set();
    this._loaded = false;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "swse-store",
      classes: ["swse", "store"],
      template: "modules/swse/templates/store/store.html",
      width: 1000,
      height: "auto",
    });
  }

  get title() {
    return game.i18n ? game.i18n.localize("SWSE.Store.Title") : "SWSE Store";
  }

  // Public init entry
  async _initialize() {
    if (this._loaded) return;
    this._loaded = true;
    this.render(false);
    await this._loadAllPacks();
    this._buildItemArraysAndGroups();
    this.render(true);
  }

  // Load all packs we care about
  async _loadAllPacks() {
    const packs = new Set();
    if (STORE_PACKS?.WEAPONS) packs.add(STORE_PACKS.WEAPONS);
    if (STORE_PACKS?.ARMOR) packs.add(STORE_PACKS.ARMOR);
    if (STORE_PACKS?.EQUIPMENT) packs.add(STORE_PACKS.EQUIPMENT);
    if (STORE_PACKS?.DROIDS) packs.add(STORE_PACKS.DROIDS);
    if (STORE_PACKS?.VEHICLES) packs.add(STORE_PACKS.VEHICLES);

    const packList = Array.from(packs);
    // load in parallel but catch each pack error individually
    await Promise.all(packList.map((p) => this._loadPackSafe(p)));
  }

  // Safe pack loader
  async _loadPackSafe(packName) {
    if (!packName || this._loadedPacks.has(packName)) return;
    try {
      const pack = game.packs.get(packName);
      if (!pack) {
        console.warn(`SWSE Store — pack not found: ${packName}`);
        return;
      }
      const docs = await pack.getDocuments();
      for (const doc of docs) {
        const item = (doc?.toObject) ? doc.toObject() : doc;
        if (!isValidItemForStore(item)) continue;
        const id = item._id ?? item.id ?? `${packName}-${safeString(item.name)}`;
        this.itemsById.set(id, item);
      }
      this._loadedPacks.add(packName);
    } catch (err) {
      console.error(`SWSE Store — error loading pack ${packName}`, err);
    }
  }

  // After loading, create arrays and grouped maps
  _buildItemArraysAndGroups() {
    this.items = Array.from(this.itemsById.values());
    // Build generic item view objects and place into grouped maps
    this._clearGroups();
    for (const raw of this.items) {
      tryRender(() => {
        const view = this._prepareItemForView(raw);
        // decide main bucket
        const bucket = this._determineBucket(view);
        this._addToGroup(bucket, view);
      }, "buildGroups");
    }
    // Sort groups
    this._sortAllGroups();
  }

  _clearGroups() {
    for (const k of Object.keys(this.groupedItems)) {
      this.groupedItems[k] = new Map();
    }
  }

  // Create a lightweight, safe object for templates
  _prepareItemForView(item) {
    const sys = safeSystem(item) ?? {};
    const name = safeString(item.name ?? sys.name ?? "Unnamed Item");
    const img = safeImg(item);
    const costText = getCostDisplay(item);
    const costValue = getCostValue(item); // null if non-numeric
    const type = (item.type ?? sys.type ?? "").toString().toLowerCase();

    // canonical category detection (checks several fields)
    const canonicalCategory = this._canonicalCategory(sys, item, type);

    return {
      _id: item._id ?? item.id ?? `${name}-${Math.random().toString(36).slice(2,9)}`,
      name,
      img,
      costText,
      costValue,
      raw: item,
      system: sys,
      type,
      category: canonicalCategory,
      // expose useful quick lookup fields for filters
      availability: safeString(sys.availability ?? sys.avail ?? "", "").toLowerCase(),
    };
  }

  // Decide which bucket the item should go into
  _determineBucket(viewObj) {
    // vehicles & droids should go in their own buckets
    if (viewObj.type === "actor" || viewObj.raw?.type === "actor") {
      // pack metadata may determine actor type (vehicles pack uses Actor types often)
      const implementationHints = (viewObj.system?.actorType || viewObj.system?.vehicleType || "").toString().toLowerCase();
      if (implementationHints.includes("vehicle")) return "vehicles";
      if (implementationHints.includes("droid")) return "droids";
    }

    // Some packs mark them with explicit 'vehicle' type or 'droid' tag
    const t = viewObj.type;
    if (t === "vehicle" || viewObj.raw?.type === "vehicle") return "vehicles";
    if (t === "droid" || viewObj.raw?.type === "droid") return "droids";

    // If category suggests vehicle/droid
    const cat = (viewObj.category || "").toLowerCase();
    if (cat.includes("droid")) return "droids";
    if (cat.includes("vehicle") || cat.includes("speeder") || cat.includes("starship") || cat.includes("ship")) return "vehicles";

    // otherwise put by type or general equipment
    if (t === "weapon") return "weapons";
    if (t === "armor") return "armor";
    if (t === "equipment") return "equipment";

    return "other";
  }

  // Robust canonicalization of category (looks through many fields, normalizes text)
  _canonicalCategory(sys, item, detectedType) {
    // Candidate fields in order of precedence:
    const candidates = [
      sys.category,
      sys.subcategory,
      sys.vehicleCategory,
      sys.droidCategory,
      sys.type,
      sys.manufacturer,
      item.type,
      item.category,
      (item.flags?.swse?.category ?? null)
    ];

    for (const c of candidates) {
      if (!c) continue;
      const s = String(c).trim();
      if (s.length === 0) continue;
      // normalize small cases
      const normalized = this._normalizeCategoryString(s);
      if (normalized) return normalized;
    }

    // fallback: try to infer from name (useful if compendium lacks category)
    const name = safeString(item.name ?? "", "");
    if (name) {
      const inferred = this._inferCategoryFromName(name);
      if (inferred) return inferred;
    }

    // final fallback by type
    return detectedType || "misc";
  }

  _normalizeCategoryString(s) {
    // unify hyphens/underscores/spaces, lowercase, convert synonyms to canonical form
    const cleaned = s.replace(/[_\-]+/g, " ").trim();
    const low = cleaned.toLowerCase();

    // synonyms map (extend as needed)
    const synonyms = {
      "swoop": "Swoops/Speeders",
      "speeder": "Swoops/Speeders",
      "repulsor": "Repulsorlifts",
      "starship": "Starships",
      "frigate": "Starships",
      "capital ship": "Capital Ships",
      "protocol": "Droid - Protocol",
      "astromech": "Droid - Astromech",
      "utility": "Droid - Utility",
      "combat": "Droid - Combat"
    };

    for (const key in synonyms) {
      if (low.includes(key)) return synonyms[key];
    }

    // Capitalize words for display
    return cleaned.split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }

  _inferCategoryFromName(name) {
    const low = name.toLowerCase();
    if (low.includes("speeder") || low.includes("swoop")) return "Swoops/Speeders";
    if (low.includes("starfighter") || low.includes("starship") || low.includes("frigate")) return "Starships";
    if (low.includes("droid") || low.includes("astromech")) {
      if (low.includes("protocol")) return "Droid - Protocol";
      if (low.includes("astromech")) return "Droid - Astromech";
      return "Droid - Utility";
    }
    return null;
  }

  // Add view item into group map under its category
  _addToGroup(bucket, view) {
    const groupMap = this.groupedItems[bucket] || this.groupedItems.other;
    const cat = view.category || "Uncategorized";
    if (!groupMap.has(cat)) groupMap.set(cat, []);
    groupMap.get(cat).push(view);
  }

  // Sort groups and their content
  _sortAllGroups() {
    for (const [bucketName, map] of Object.entries(this.groupedItems)) {
      // Sort items within each category: by cost (if numeric) then name
      for (const [cat, arr] of map.entries()) {
        arr.sort((a, b) => {
          // numeric first (nulls go to end)
          const an = (a.costValue !== null && a.costValue !== undefined) ? a.costValue : Infinity;
          const bn = (b.costValue !== null && b.costValue !== undefined) ? b.costValue : Infinity;
          if (an !== bn) return an - bn;
          return a.name.localeCompare(b.name);
        });
        map.set(cat, arr);
      }
      // Optionally reorder map keys (we'll create a new map with sorted keys)
      const sortedKeys = Array.from(map.keys()).sort((a,b) => a.localeCompare(b));
      const newMap = new Map();
      for (const k of sortedKeys) newMap.set(k, map.get(k));
      this.groupedItems[bucketName] = newMap;
    }
  }

  // Template data
  getData() {
    // For templates, we convert Maps -> arrays for easy iteration in Handlebars
    const groupsForTemplate = {};
    for (const [bucket, map] of Object.entries(this.groupedItems)) {
      groupsForTemplate[bucket] = Array.from(map.entries()).map(([category, items]) => ({
        category,
        items,
        count: items.length
      }));
    }

    return {
      title: this.title,
      loading: !this._loaded,
      itemCount: this.items.length,
      groups: groupsForTemplate
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".buy-button").on("click", (ev) => {
      const id = ev.currentTarget.dataset.id;
      if (!id) return;
      const item = this.itemsById.get(id);
      if (!item) return ui.notifications.error("Item not found");
      try {
        this._onBuyItem(item);
      } catch (err) {
        console.error("SWSE Store — buy handler error", err);
        ui.notifications.error("Purchase failed (see console).");
      }
    });
  }

  async _onBuyItem(item) {
    const view = this._prepareItemForView(item);
    const content = `<p>Purchase ${escapeHTML(view.name)} for <strong>${escapeHTML(view.costText)}</strong>?</p>`;
    const confirmed = await new Promise((resolve) => {
      new Dialog({
        title: "Confirm Purchase",
        content,
        buttons: {
          yes: { label: "Buy", callback: () => resolve(true) },
          no: { label: "Cancel", callback: () => resolve(false) },
        },
        default: "yes",
      }).render(true);
    });
    if (!confirmed) return;
    ui.notifications.info(`Purchased ${view.name} for ${view.costText}`);
  }

  // Ensure initialization before render
  async render(force=false, options={}) {
    if (!this._loaded) {
      await this._initialize();
    }
    return super.render(force, options);
  }
}

/* ---------------------------
 * Small helpers
 * --------------------------- */

function escapeHTML(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
