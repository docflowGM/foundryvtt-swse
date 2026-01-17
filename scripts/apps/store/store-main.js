/**
 * store-main.js - robust store with vehicle & droid grouping
 *
 * Uses the helpers in store-shared.js and groups droids & vehicles.
 */
import { STORE_PACKS } from "./store-constants.js";
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

// Safe logger reference
const swseLogger = globalThis.swseLogger || console;

export class SWSEStore extends FormApplication {
  constructor(actor = null, options={}) {
    super({}, options);
    // Store the actor for purchases - use provided actor, selected token's actor, or user's character
    this.actor = actor || canvas?.tokens?.controlled?.[0]?.actor || game.user?.character || null;
    this.itemsById = new Map();
    this.items = [];
    this.groupedItems = { weapons: new Map(), armor: new Map(), equipment: new Map(), droids: new Map(), vehicles: new Map(), other: new Map() };
    this.cart = { items: [], droids: [], vehicles: [] };
    this.cartTotal = 0;
    this._loaded = false;
    this._loadedPacks = new Set();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-store",
      classes: ["swse", "store", "swse-app"],
      template: "systems/foundryvtt-swse/templates/apps/store/store.hbs",
      width: 980,
      height: "auto",
    });
  }

  get title(){ return game.i18n ? game.i18n.localize("SWSE.Dialogs.Store.Title") : "Galactic Trade Exchange"; }

  async _initialize(){
    if (this._loaded) return;
    this._loaded = true;
    this.render(false);
    await this._loadAllPacks();
    this._buildItemArraysAndGroups();
    this.render(true);
  }

  async _loadAllPacks(){
    const packs = new Set();
    if (STORE_PACKS?.WEAPONS) packs.add(STORE_PACKS.WEAPONS);
    if (STORE_PACKS?.ARMOR) packs.add(STORE_PACKS.ARMOR);
    if (STORE_PACKS?.EQUIPMENT) packs.add(STORE_PACKS.EQUIPMENT);
    if (STORE_PACKS?.DROIDS) packs.add(STORE_PACKS.DROIDS);
    if (STORE_PACKS?.VEHICLES) packs.add(STORE_PACKS.VEHICLES);
    const list = Array.from(packs);
    for (const p of list) {
      await this._loadPackSafe(p);
      this._buildItemArraysAndGroups();
      try { super.render(true); } catch(e) {}
    }
  }

  async _loadPackSafe(packName){
    if (!packName || this._loadedPacks.has(packName)) return;
    try {
      const pack = game.packs.get(packName);
      if (!pack) { swseLogger.warn("SWSE Store — pack not found:", packName); return; }
      const docs = await pack.getDocuments();
      for (const doc of docs){
        const item = (doc?.toObject) ? doc.toObject() : doc;
        if (!isValidItemForStore(item)) continue;
        const id = item._id ?? item.id ?? `${packName}-${safeString(item.name)}`;
        this.itemsById.set(id, item);
      }
      this._loadedPacks.add(packName);
    } catch (err) {
      swseLogger.error("SWSE Store — error loading pack", packName, err);
    }
  }

  _buildItemArraysAndGroups(){
    this.items = Array.from(this.itemsById.values());
    for (const k of Object.keys(this.groupedItems)) this.groupedItems[k] = new Map();
    for (const raw of this.items) {
      tryRender(()=> {
        const view = this._prepareItemForView(raw);
        const bucket = this._determineBucket(view);
        this._addToGroup(bucket, view);
      }, "buildGroups");
    }
    this._sortAllGroups();
  }

  _prepareItemForView(item){
    const sys = safeSystem(item) ?? {};
    const name = safeString(item.name ?? sys.name ?? "Unnamed Item");
    const img = safeImg(item);
    const costText = getCostDisplay(item);
    const costValue = getCostValue(item);
    const type = (item.type ?? sys.type ?? "").toString().toLowerCase();
    const canonicalCategory = this._canonicalCategory(sys, item, type);
    return { _id: item._id ?? item.id ?? `${name}-${Math.random().toString(36).slice(2,9)}`, name, img, costText, costValue, raw: item, system: sys, type, category: canonicalCategory, availability: safeString(sys.availability ?? sys.avail ?? "", "").toLowerCase() };
  }

  _determineBucket(viewObj){
    const t = viewObj.type;
    if (t === "vehicle" || (viewObj.system?.vehicleType) || (String(viewObj.category||"").toLowerCase().includes("vehicle"))) return "vehicles";
    if (t === "droid" || (viewObj.system?.class) || (String(viewObj.category||"").toLowerCase().includes("droid"))) return "droids";
    if (t === "weapon") return "weapons";
    if (t === "armor") return "armor";
    if (t === "equipment") return "equipment";
    return "other";
  }

  _canonicalCategory(sys, item, detectedType){
    const candidates = [sys.category, sys.subcategory, sys.vehicleCategory, sys.droidCategory, sys.type, sys.manufacturer, item.type, item.category, (item.flags?.swse?.category ?? null)];
    for (const c of candidates) {
      if (!c) continue;
      const s = String(c).trim();
      if (s.length === 0) continue;
      const normalized = this._normalizeCategoryString(s);
      if (normalized) return normalized;
    }
    const name = safeString(item.name ?? "", "");
    if (name) {
      const inferred = this._inferCategoryFromName(name);
      if (inferred) return inferred;
    }
    return detectedType || "misc";
  }

  _normalizeCategoryString(s){
    const cleaned = s.replace(/[_\-]+/g, " ").trim();
    const low = cleaned.toLowerCase();
    const synonyms = { "swoop":"Swoops/Speeders","speeder":"Swoops/Speeders","repulsor":"Repulsorlifts","starship":"Starships","frigate":"Starships","capital ship":"Capital Ships","protocol":"Droid - Protocol","astromech":"Droid - Astromech","utility":"Droid - Utility","combat":"Droid - Combat" };
    for (const key in synonyms) if (low.includes(key)) return synonyms[key];
    return cleaned.split(/\s+/).map(w=>w.charAt(0).toUpperCase()+w.slice(1)).join(" ");
  }

  _inferCategoryFromName(name){
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

  _addToGroup(bucket, view){
    const groupMap = this.groupedItems[bucket] || this.groupedItems.other;
    const cat = view.category || "Uncategorized";
    if (!groupMap.has(cat)) groupMap.set(cat, []);
    groupMap.get(cat).push(view);
  }

  _sortAllGroups(){
    for (const [bucketName, map] of Object.entries(this.groupedItems)) {
      // PERFORMANCE: In-place sorting of arrays, skip Map reconstruction
      // Keys are sorted during template rendering in getData()
      for (const arr of map.values()) {
        arr.sort((a,b)=> {
          const an = (a.costValue!==null && a.costValue!==undefined) ? a.costValue : Infinity;
          const bn = (b.costValue!==null && b.costValue!==undefined) ? b.costValue : Infinity;
          if (an !== bn) return an - bn;
          return a.name.localeCompare(b.name);
        });
      }
    }
  }

  getData(){
    // Transform groupedItems Map structure to nested categories object for template
    const categories = {};

    for (const [bucket, categoryMap] of Object.entries(this.groupedItems)) {
      categories[bucket] = {};

      for (const [categoryName, items] of categoryMap.entries()) {
        // Map category names to nested structure
        // e.g., "Simple Melee" -> categories.weapons.melee.simple
        const nested = this._parseCategory(bucket, categoryName);

        // Navigate/create nested structure
        let target = categories[bucket];
        for (let i = 0; i < nested.path.length - 1; i++) {
          target[nested.path[i]] = target[nested.path[i]] || {};
          target = target[nested.path[i]];
        }

        // Set final array of items
        target[nested.path[nested.path.length - 1]] = items;
      }
    }

    // Get actor credits and name
    const actorCredits = this.actor?.system?.credits ?? 0;
    const isGMUser = game.user?.isGM ?? false;

    return {
      title: this.title,
      loading: !this._loaded,
      itemCount: this.items.length,
      categories: categories,
      credits: actorCredits,
      isGM: isGMUser,
      rendarrWelcome: getRendarrLine("welcome"),
      rendarrImage: "modules/foundryvtt-swse/images/rendarr.webp"
    };
  }

  /**
   * Parse a category string into nested path
   * e.g., "Simple Melee" -> { path: ["melee", "simple"] }
   */
  _parseCategory(bucket, categoryName) {
    const normalized = String(categoryName || "").toLowerCase().trim();

    if (bucket === "weapons") {
      // Weapons: melee vs ranged, then type
      if (normalized.includes("melee") || normalized.includes("blade") || normalized.includes("sword") ||
          normalized.includes("axe") || normalized.includes("spear") || normalized.includes("staff") ||
          normalized.includes("lightsaber")) {
        if (normalized.includes("lightsaber")) return { path: ["melee", "lightsaber"] };
        if (normalized.includes("advanced")) return { path: ["melee", "advanced"] };
        if (normalized.includes("exotic")) return { path: ["melee", "exotic"] };
        return { path: ["melee", "simple"] };
      }

      if (normalized.includes("ranged") || normalized.includes("rifle") || normalized.includes("pistol") ||
          normalized.includes("blaster") || normalized.includes("grenade") || normalized.includes("launcher") ||
          normalized.includes("bow") || normalized.includes("gun")) {
        if (normalized.includes("pistol") || normalized.includes("blaster")) return { path: ["ranged", "pistol"] };
        if (normalized.includes("rifle")) return { path: ["ranged", "rifle"] };
        if (normalized.includes("heavy")) return { path: ["ranged", "heavy"] };
        if (normalized.includes("grenade")) return { path: ["ranged", "grenade"] };
        if (normalized.includes("exotic")) return { path: ["ranged", "exotic"] };
        return { path: ["ranged", "simple"] };
      }

      // Default ranged if we couldn't determine
      return { path: ["ranged", "simple"] };
    }

    // For non-weapons, return single-level category
    return { path: [normalized] };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".buy-item").on("click", (ev) => {
      const id = ev.currentTarget.dataset.id;
      if (!id) return;
      const item = this.itemsById.get(id);
      if (!item) return ui.notifications.error("Item not found");
      try { this._onBuyItem(item); } catch (err) { swseLogger.error("SWSE Store — buy handler error", err); ui.notifications.error("Purchase failed (see console)."); }
    });
  }

  async _onBuyItem(item){
    const view = this._prepareItemForView(item);
    const costValue = view.costValue || 0;

    // Check if an actor is available to purchase
    if (!this.actor) {
      ui.notifications.error("No character selected to purchase for");
      return;
    }

    const currentCredits = Number(this.actor.system?.credits) || 0;

    // Check if actor has enough credits
    if (currentCredits < costValue) {
      ui.notifications.error(
        `Insufficient credits! Need ${costValue}, have ${currentCredits}`
      );
      return;
    }

    const content = `<p>Purchase <strong>${escapeHTML(view.name)}</strong> for <strong>${escapeHTML(view.costText)}</strong>?</p>`;
    const confirmed = await new Promise((resolve) => {
      new Dialog({
        title: "Confirm Purchase",
        content,
        buttons: {
          yes: { label: "Buy", callback: () => resolve(true) },
          no: { label: "Cancel", callback: () => resolve(false) }
        },
        default: "yes",
      }).render(true);
    });

    if (!confirmed) return;

    try {
      // CRITICAL: Create item FIRST before deducting credits
      // This prevents players from losing credits if item creation fails
      const itemData = view.raw.toObject ? view.raw.toObject() : view.raw;

      try {
        await this.actor.createEmbeddedDocuments("Item", [itemData]);
      } catch (itemErr) {
        swseLogger.error("SWSE Store | Failed to create item:", itemErr);
        ui.notifications.error(`Failed to add ${view.name} to inventory. Purchase cancelled.`);
        return; // Don't deduct credits if item creation failed
      }

      // Item created successfully, NOW deduct credits
      const newCredits = currentCredits - costValue;
      try {
        if (globalThis.SWSE?.ActorEngine?.updateActor) {
          await globalThis.SWSE.ActorEngine.updateActor(this.actor, {
            "system.credits": newCredits
          });
        } else {
          await this.actor.update({ "system.credits": newCredits });
        }
      } catch (creditErr) {
        // This is less critical since item was already added
        swseLogger.warn("SWSE Store | Warning: Failed to deduct credits (item was added):", creditErr);
        ui.notifications.warn(`Item added but credit deduction failed! You may need to manually pay ${costValue} credits.`);
      }

      ui.notifications.info(`Purchased ${view.name} for ${view.costText}`);
      this.render(true);
    } catch (err) {
      swseLogger.error("SWSE Store | Purchase error:", err);
      ui.notifications.error("Purchase failed. Please check console.");
    }
  }

  async render(force=false, options={}) {
    if (!this._loaded) await this._initialize();
    return super.render(force, options);
  }
}

function escapeHTML(str){ if (str===undefined||str===null) return ""; return String(str).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
