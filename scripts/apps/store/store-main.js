/**
 * store-main.js
 *
 * Hardened SWSE Store Application.
 * - Uses store-shared.js helpers to avoid crashes from malformed compendium entries.
 * - Safe rendering wrappers around item loops.
 * - Minimal, drop-in replacement for the existing store-main.js
 *
 * Save as scripts/apps/store/store-main.js (replace the old file)
 */

import { STORE_PACKS } from "./store-constants.js";
import {
  normalizeNumber,
  getCostValue,
  getCostDisplay,
  safeString,
  safeImg,
  safeSystem,
  tryRender,
  isValidItemForStore,
} from "./store-shared.js";

/**
 * SWSEStore - simplified, robust version
 * This is intentionally focused on safety and display; keep business logic (discounts, checkout) separate.
 */
export class SWSEStore extends FormApplication {
  constructor(options = {}) {
    super({}, options);
    // map of id -> raw item data
    this.itemsById = new Map();
    // array of loaded items
    this.items = [];
    // simple state
    this._loaded = false;
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "swse-store",
      classes: ["swse", "store"],
      template: "modules/swse/templates/store/store.html",
      width: 900,
      height: "auto",
    });
  }

  get title() {
    return game.i18n ? game.i18n.localize("SWSE.Store.Title") : "SWSE Store";
  }

  /**
   * Initialize: load the configured packs.
   */
  async _initialize() {
    if (this._loaded) return;
    this._loaded = true;
    this.render(false);
    await this._loadAllPacks();
    this.render(true);
  }

  /**
   * Load all configured packs (weapons, armor, equipment, vehicles, droids)
   * Uses STORE_PACKS constant from store-constants.js
   */
  async _loadAllPacks() {
    const packsToLoad = [];
    if (STORE_PACKS?.WEAPONS) packsToLoad.push(STORE_PACKS.WEAPONS);
    if (STORE_PACKS?.ARMOR) packsToLoad.push(STORE_PACKS.ARMOR);
    if (STORE_PACKS?.EQUIPMENT) packsToLoad.push(STORE_PACKS.EQUIPMENT);
    if (STORE_PACKS?.DROIDS) packsToLoad.push(STORE_PACKS.DROIDS);
    if (STORE_PACKS?.VEHICLES) packsToLoad.push(STORE_PACKS.VEHICLES);

    const unique = [...new Set(packsToLoad)];

    for (const packName of unique) {
      await this._loadPackSafe(packName);
    }

    // After loading, create an array and sort
    this.items = Array.from(this.itemsById.values()).filter(isValidItemForStore);
    // default alphabetic sort by name
    this.items.sort((a, b) => (safeString(a.name).localeCompare(safeString(b.name))));
  }

  /**
   * Safe pack loader: wraps compendium access in try/catch
   */
  async _loadPackSafe(packName) {
    if (!packName) return;
    try {
      const pack = game.packs.get(packName);
      if (!pack) {
        console.warn(`SWSE Store — pack not found: ${packName}`);
        return;
      }
      // Load all docs (safe)
      const docs = await pack.getDocuments();
      for (const doc of docs) {
        // Ensure doc is object-like (older compendiums are JSON lines and may already be plain objects)
        const item = doc?.toObject ? doc.toObject() : doc;
        if (!isValidItemForStore(item)) continue;
        // store by id (fallback to name-based unique key if id missing)
        const id = item._id ?? item.id ?? `pack-${packName}-${safeString(item.name)}`;
        this.itemsById.set(id, item);
      }
    } catch (err) {
      console.error("SWSE Store — error loading pack", packName, err);
    }
  }

  /**
   * Render the store template with safe data.
   * This method prepares a minimal context that the template expects.
   */
  getData() {
    // Prepare minimal, safe item data for the template
    const viewItems = this.items.map((item) =>
      tryRender(() => this._prepareItemForView(item), "getData")
    ).filter(x => x !== null);

    return {
      title: this.title,
      itemCount: viewItems.length,
      items: viewItems,
      loading: !this._loaded,
    };
  }

  /**
   * Turn a raw item into a safe, view-friendly object.
   */
  _prepareItemForView(item) {
    const sys = safeSystem(item) ?? {};
    const name = safeString(item.name ?? sys.name ?? "Unnamed Item");
    const img = safeImg(item);
    const costText = getCostDisplay(item);
    const costValue = getCostValue(item); // may be null

    // common fields used for rendering and filters
    return {
      _id: item._id ?? item.id ?? `${name}-${Math.random().toString(36).slice(2, 9)}`,
      name,
      img,
      costText,
      costValue,
      type: safeString(item.type ?? sys.type ?? "item"),
      system: sys,
      raw: item,
    };
  }

  /**
   * Example: a safe item renderer for a list element.
   * If you use templating (Handlebars), you can rely on the getData() output and do minimal work.
   */
  activateListeners(html) {
    super.activateListeners(html);
    // Example: clicking a .buy-button uses data-id
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

  /**
   * Example buy flow (placeholder). Your existing checkout logic can be reused; this just demonstrates safety.
   */
  async _onBuyItem(item) {
    // safe info
    const view = this._prepareItemForView(item);
    // Show a confirmation dialog that includes a safe cost display
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

    // Here you would integrate with your player credits system.
    // For now, just show a notification.
    ui.notifications.info(`Purchased ${view.name} for ${view.costText}`);
  }

  // Keep compatibility with existing code that calls render(true/false)
  async render(force = false, options = {}) {
    // Ensure initialization happened
    if (!this._loaded) {
      await this._initialize();
    }
    return super.render(force, options);
  }
}

/* ---------------------------
 * Small helpers used above
 * ---------------------------
 */

function escapeHTML(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
