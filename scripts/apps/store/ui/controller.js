/**
 * controller.js
 * --------------
 * UI state controller for SWSE Store 2.0.
 *
 * Responsibilities:
 *  - Load store index
 *  - Track UI state (tab, search, filters, sorting)
 *  - Bind DOM events
 *  - Trigger renderer updates
 *  - Manage Rendarr dialogue updates
 */

import { buildStoreIndex } from "../engine/index.js";
import { getRandomDialogue } from "../store-shared.js";
import { renderStoreUI, renderPurchaseHistory } from "./renderer.js";

export class StoreController {

  constructor(app) {
    this.app = app;              // reference to Foundry store-app.js
    this.index = null;           // storeIndex from engine/index.js

    /* ------------------------------------------ */
    /* UI STATE                                    */
    /* ------------------------------------------ */
    this.state = {
      activeTab: "weapons",
      search: "",
      availability: "all",
      sortMode: "name-asc",
    };

    /* Search debounce */
    this._searchTimeout = null;
  }

  /* ------------------------------------------ */
  /* INITIALIZE STORE DATA                       */
  /* ------------------------------------------ */

  async init() {
    this.index = await buildStoreIndex({ useCache: true });
  }

  /* ------------------------------------------ */
  /* RENDER HOOK                                 */
  /* Called by store-app.js after Handlebars     */
  /* ------------------------------------------ */

  onRender(html) {
    this._bindTabListeners(html);
    this._bindFilterListeners(html);
    this._bindSearchListener(html);
    this._bindSortListener(html);
    this._bindRendarrUI(html);
    this._bindHistoryRender(html);

    this.refreshView(html);
  }

  /* ------------------------------------------ */
  /* REFRESH VIEW                                */
  /* Re-processes visible items and re-renders   */
  /* ------------------------------------------ */

  refreshView(html) {
    if (!this.index) return;

    const { activeTab, search, availability, sortMode } = this.state;

    const filtered = this._filterItems(activeTab, search, availability);
    const sorted = this._sortItems(filtered, sortMode);

    renderStoreUI(html, {
      controller: this,
      index: this.index,
      activeTab,
      items: sorted,
    });
  }

  /* ------------------------------------------ */
  /* TABS / PANELS                               */
  /* ------------------------------------------ */

  _bindTabListeners(html) {
    html.find(".shop-navigation [data-tab]").on("click", ev => {
      const tab = ev.currentTarget.dataset.tab;
      if (!tab) return;

      this.state.activeTab = tab;
      this._updateRendarrDialogue(tab);
      this.refreshView(html);
    });
  }

  /* ------------------------------------------ */
  /* SEARCH                                      */
  /* ------------------------------------------ */

  _bindSearchListener(html) {
    const input = html.find("#shop-search-input");
    if (!input.length) return;

    input.on("input", ev => {
      const value = ev.target.value.toLowerCase();

      clearTimeout(this._searchTimeout);

      this._searchTimeout = setTimeout(() => {
        this.state.search = value;
        this.refreshView(html);
      }, 200);
    });
  }

  /* ------------------------------------------ */
  /* FILTERS                                     */
  /* ------------------------------------------ */

  _bindFilterListeners(html) {
    const availability = html.find("#shop-availability-filter");
    if (availability.length) {
      availability.on("change", ev => {
        this.state.availability = ev.target.value;
        this.refreshView(html);
      });
    }
  }

  /* ------------------------------------------ */
  /* SORTING                                     */
  /* ------------------------------------------ */

  _bindSortListener(html) {
    const sort = html.find("#shop-sort-select");
    if (sort.length) {
      sort.on("change", ev => {
        this.state.sortMode = ev.target.value;
        this.refreshView(html);
      });
    }
  }

  /* ------------------------------------------ */
  /* RENDARR UI                                  */
  /* ------------------------------------------ */

  _bindRendarrUI(html) {
    const portrait = html.find(".rendarr-image");
    if (portrait.length) {
      portrait.on("click", () => {
        const dialogue = getRandomDialogue(this.state.activeTab);
        this._updateRendarrDialogue(dialogue);
      });
    }
  }

  _updateRendarrDialogue(context) {
    const msg = getRandomDialogue(context);
    const container = this.app.element.find(".holo-message");
    if (container.length) container.text(`"${msg}"`);
  }

  /* ------------------------------------------ */
  /* FILTER ENGINE (DATA, NOT DOM)               */
  /* ------------------------------------------ */

  _filterItems(tab, search, availability) {
    // get all items in this tab
    const all = this._itemsForTab(tab);

    return all.filter(item => {
      // search match
      if (search) {
        const hay = `${item.name} ${item.system?.description || ""}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }

      // availability match
      if (availability !== "all") {
        if (!item.availability.includes(availability.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }

  /* ------------------------------------------ */
  /* SORT ENGINE (DATA)                          */
  /* ------------------------------------------ */

  _sortItems(items, mode) {
    const sorted = [...items];

    sorted.sort((a, b) => {
      switch (mode) {
        case "name-asc":   return a.name.localeCompare(b.name);
        case "name-desc":  return b.name.localeCompare(a.name);
        case "price-asc":  return (a.finalCost ?? Infinity) - (b.finalCost ?? Infinity);
        case "price-desc": return (b.finalCost ?? Infinity) - (a.finalCost ?? Infinity);
        case "damage-desc":
          return (this._avgDamage(b) - this._avgDamage(a));
        case "availability":
          return a.availability.localeCompare(b.availability);
        default: return 0;
      }
    });

    return sorted;
  }

  _avgDamage(item) {
    const dmg = item.system?.damage;
    if (!dmg) return 0;

    const match = dmg.match(/(\d+)d(\d+)([+-]\d+)?/i);
    if (!match) return 0;

    const dice = Number(match[1]);
    const size = Number(match[2]);
    const bonus = match[3] ? Number(match[3]) : 0;

    return dice * (size + 1) / 2 + bonus;
  }

  /* ------------------------------------------ */
  /* ACCESSORS                                   */
  /* ------------------------------------------ */

  _itemsForTab(tab) {
    const { byCategory } = this.index;

    switch (tab) {
      case "weapons": return this._flattenCategory("Weapons");
      case "armor": return this._flattenCategory("Armor");
      case "medical": return this._flattenCategory("Medical");
      case "tech": return this._flattenCategory("Tech");
      case "tools": return this._flattenCategory("Tools");
      case "security": return this._flattenCategory("Security");
      case "survival": return this._flattenCategory("Survival");
      case "equipment": return this._flattenCategory("Equipment");
      case "grenades": return this._getGrenades();
      case "services": return this.index.byType.get("service") || [];
      case "droids": return this._flattenCategory("Droids");
      case "vehicles": return this._flattenCategory("Vehicles");
      case "cart": return []; // cart is dynamic
      case "history": return []; // handled by custom renderer
      default: return [];
    }
  }

  _flattenCategory(catName, specificSubcat = null) {
    const catMap = this.index.byCategory.get(catName);
    if (!catMap) return [];

    if (specificSubcat) {
      return catMap.get(specificSubcat) || [];
    }

    return [...catMap.values()].flat();
  }

  _getGrenades() {
    // Grenades can be in Weapons or Equipment depending on categorization
    const weaponsMap = this.index.byCategory.get("Weapons");
    const grenades = (weaponsMap?.get("Grenades") || []);
    return grenades;
  }

  /* ------------------------------------------ */
  /* PURCHASE HISTORY                            */
  /* ------------------------------------------ */

  _bindHistoryRender(html) {
    html.on("click", '[data-tab="history"]', () => {
      const container = html.find("#purchase-history-list");
      if (!container.length) return;
      renderPurchaseHistory(container, this.app.actor);
    });
  }
}
