// scripts/apps/customization/customization-workbench-app.js
/**
 * Customization Workbench - A unified v2 app for equipment, weapons, armor, droids, and lightsabers.
 *
 * One app shell with one shared state model and category-specific adapters.
 * Item documents remain canonical; workbench stages changes in local state.
 * Apply commits back through proper document mutation paths.
 */

import SWSEApplicationV2 from "/systems/foundryvtt-swse/scripts/apps/base/swse-application-v2.js";
import WeaponCustomizationAdapter from "/systems/foundryvtt-swse/scripts/apps/customization/adapters/weapon-adapter.js";
import ArmorCustomizationAdapter from "/systems/foundryvtt-swse/scripts/apps/customization/adapters/armor-adapter.js";
import GearCustomizationAdapter from "/systems/foundryvtt-swse/scripts/apps/customization/adapters/gear-adapter.js";
import DroidCustomizationAdapter from "/systems/foundryvtt-swse/scripts/apps/customization/adapters/droid-adapter.js";
import LightsaberCustomizationAdapter from "/systems/foundryvtt-swse/scripts/apps/customization/adapters/lightsaber-adapter.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class CustomizationWorkbenchApp extends SWSEApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: 'swse-customization-workbench',
    classes: ['swse', 'swse-customization-workbench'],
    tag: 'form',
    window: {
      title: 'Customization Workbench',
      icon: 'fas fa-tools',
      resizable: true,
      draggable: true,
      frame: true,
      minimizable: true,
      position: {
        width: 1200,
        height: 700
      }
    },
    actions: {
      selectItem: CustomizationWorkbenchApp.prototype._selectItem,
      selectMod: CustomizationWorkbenchApp.prototype._selectMod,
      removeMod: CustomizationWorkbenchApp.prototype._removeMod,
      toggleFilter: CustomizationWorkbenchApp.prototype._toggleFilter,
      applyCustomizations: CustomizationWorkbenchApp.prototype._applyCustomizations,
      resetCustomizations: CustomizationWorkbenchApp.prototype._resetCustomizations,
      search: CustomizationWorkbenchApp.prototype._handleSearch,
    }
  };

  /**
   * Factory method to create and render the workbench for a specific item.
   * @param {string} actorId - The actor UUID or ID
   * @param {string} itemId - The item UUID or ID
   * @param {Object} options - Additional render options
   */
  static async createForItem(actorId, itemId, options = {}) {
    const app = new this({ actorId, itemId, ...options });
    await app.render(true);
    return app;
  }

  /**
   * Factory method to create workbench filtered to a category.
   * @param {string} actorId - The actor UUID or ID
   * @param {string} category - The item category to filter (weapon, armor, gear, droid, lightsaber)
   * @param {Object} options - Additional render options
   */
  static async createForCategory(actorId, category, options = {}) {
    const app = new this({ actorId, activeCategory: category, ...options });
    await app.render(true);
    return app;
  }

  constructor(options = {}) {
    super(options);

    this.actorId = options.actorId;
    this.selectedItemId = options.itemId || null;
    this.activeCategory = options.activeCategory || 'weapon';

    // Adapter registry - category → adapter class
    this.adapters = new Map([
      ['weapon', WeaponCustomizationAdapter],
      ['armor', ArmorCustomizationAdapter],
      ['gear', GearCustomizationAdapter],
      ['droid', DroidCustomizationAdapter],
      ['lightsaber', LightsaberCustomizationAdapter]
    ]);

    // Current category adapter instance
    this.currentAdapter = null;

    // Shared state model
    this.state = {
      actorId: this.actorId,
      selectedItemId: this.selectedItemId,
      activeCategory: this.activeCategory,
      selectionsByItemId: new Map(), // Map<itemId, selections>
      filters: new Set(),
      search: '',
      pendingCost: 0,
      pendingSlotUsage: new Map(), // Map<itemId, slotUsage>
      validationErrors: new Set()
    };

    // Live data cache
    this.actor = null;
    this.selectedItem = null;
    this.inventoryItems = [];
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, this.DEFAULT_OPTIONS);
  }

  get title() {
    if (this.selectedItem) {
      return `Customization Workbench — ${this.selectedItem.name}`;
    }
    return 'Customization Workbench';
  }

  // ========== Lifecycle & Rendering ==========

  async _prepareContext(options) {
    // Resolve actor and item by ID
    this.actor = await this._resolveActor(this.actorId);
    if (!this.actor) {
      ui.notifications.error('Customization Workbench: Actor not found');
      this.close();
      return {};
    }

    this.selectedItem = await this._resolveItem(this.selectedItemId);
    this.inventoryItems = this._getInventoryForCategory(this.activeCategory);

    // Instantiate the current adapter
    const AdapterClass = this.adapters.get(this.activeCategory);
    if (!AdapterClass) {
      ui.notifications.error(`Unknown customization category: ${this.activeCategory}`);
      this.close();
      return {};
    }
    this.currentAdapter = new AdapterClass(this.actor, this.state);

    // Prepare context for the template
    return {
      actor: this.actor,
      selectedItem: this.selectedItem,
      activeCategory: this.activeCategory,
      categories: Array.from(this.adapters.keys()),
      inventoryItems: this.inventoryItems,

      // Adapter context
      adapterLabel: this.currentAdapter.label,
      adapterIcon: this.currentAdapter.icon,
      modCards: this.selectedItem ? await this.currentAdapter.getModCards(this.selectedItem) : [],
      slotUsage: this.selectedItem ? await this.currentAdapter.getSlotUsage(this.selectedItem) : null,
      costPreview: this.selectedItem ? await this.currentAdapter.getCostPreview(this.selectedItem) : 0,

      // State
      search: this.state.search,
      filters: Array.from(this.state.filters),
      selectionsByItemId: Object.fromEntries(this.state.selectionsByItemId),
      pendingCost: this.state.pendingCost,
      validationErrors: Array.from(this.state.validationErrors),

      isValid: this.state.validationErrors.size === 0
    };
  }

  // ========== Actions ==========

  async _selectItem(event, button) {
    const itemId = button.closest('[data-item-id]')?.dataset.itemId;
    if (!itemId) return;

    this.selectedItemId = itemId;
    this.selectedItem = await this._resolveItem(itemId);
    this.state.selectedItemId = itemId;

    // Reset selections for this item if not already cached
    if (!this.state.selectionsByItemId.has(itemId)) {
      this.state.selectionsByItemId.set(itemId, new Map());
    }

    this.render();
  }

  async _selectMod(event, button) {
    const modId = button.closest('[data-mod-id]')?.dataset.modId;
    if (!this.selectedItem || !modId || !this.currentAdapter) return;

    const selections = this.state.selectionsByItemId.get(this.selectedItem._id) || new Map();
    selections.set(modId, true);
    this.state.selectionsByItemId.set(this.selectedItem._id, selections);

    // Validate and update cost preview
    await this._updateValidation();
    this.render();
  }

  async _removeMod(event, button) {
    const modId = button.closest('[data-mod-id]')?.dataset.modId;
    if (!this.selectedItem || !modId) return;

    const selections = this.state.selectionsByItemId.get(this.selectedItem._id);
    if (selections) {
      selections.delete(modId);
    }

    await this._updateValidation();
    this.render();
  }

  async _toggleFilter(event, button) {
    const filter = button.dataset.filter;
    if (!filter) return;

    if (this.state.filters.has(filter)) {
      this.state.filters.delete(filter);
    } else {
      this.state.filters.add(filter);
    }

    this.inventoryItems = this._getInventoryForCategory(this.activeCategory);
    this.render();
  }

  async _handleSearch(event, input) {
    this.state.search = input.value;
    this.inventoryItems = this._getInventoryForCategory(this.activeCategory);
    this.render();
  }

  async _applyCustomizations(event, button) {
    if (!this.selectedItem || !this.currentAdapter) {
      ui.notifications.warn('No item selected');
      return;
    }

    try {
      // Get selections for this item
      const selections = this.state.selectionsByItemId.get(this.selectedItem._id) || new Map();

      // Validate selections through adapter
      const validationResult = await this.currentAdapter.validateSelections(
        this.selectedItem,
        selections
      );

      if (!validationResult.valid) {
        ui.notifications.error(
          `Customization invalid: ${validationResult.errors.join(', ')}`
        );
        return;
      }

      // Build the mutation payload
      const mutation = await this.currentAdapter.buildMutationPayload(
        this.selectedItem,
        selections
      );

      // Apply through the item document's normal update path
      await this.selectedItem.update(mutation);

      ui.notifications.info(`${this.selectedItem.name} customizations applied`);
      this.close();
    } catch (error) {
      ui.notifications.error(`Failed to apply customizations: ${error.message}`);
      this._log('_applyCustomizations error', error);
    }
  }

  async _resetCustomizations(event, button) {
    if (!this.selectedItem) return;

    this.state.selectionsByItemId.delete(this.selectedItem._id);
    this.state.validationErrors.clear();
    this.state.pendingCost = 0;

    this.render();
  }

  // ========== Helpers ==========

  /**
   * Resolve an actor by UUID or ID.
   */
  async _resolveActor(actorId) {
    if (!actorId) return null;

    // Try UUID first
    try {
      const actor = await fromUuid(actorId);
      if (actor && actor.isOwner) return actor;
    } catch (e) {
      // Fall through to ID lookup
    }

    // Try ID lookup
    return game.actors.get(actorId) || null;
  }

  /**
   * Resolve an item by UUID or ID.
   */
  async _resolveItem(itemId) {
    if (!itemId || !this.actor) return null;

    // Try to find in actor's items
    const item = this.actor.items.get(itemId);
    if (item) return item;

    // Try UUID resolution
    try {
      const resolved = await fromUuid(itemId);
      if (resolved && resolved.parent === this.actor) return resolved;
    } catch (e) {
      // Fall through
    }

    return null;
  }

  /**
   * Get inventory items for a category, filtered by search/filters.
   */
  _getInventoryForCategory(category) {
    if (!this.actor) return [];

    const items = this.actor.items.filter(item => {
      // Check category
      if ((item.type === 'weapon' && category !== 'weapon') ||
          (item.type === 'equipment' && category !== 'gear') ||
          ((item.type === 'armor' || item.type === 'bodysuit') && category !== 'armor') ||
          (item.type === 'droid' && category !== 'droid') ||
          (item.type === 'weapon' && item.system?.weaponType === 'lightsaber' && category !== 'lightsaber')) {
        return false;
      }

      // Apply search filter
      if (this.state.search) {
        const search = this.state.search.toLowerCase();
        if (!item.name.toLowerCase().includes(search)) {
          return false;
        }
      }

      // Apply category-specific filters
      if (this.state.filters.size > 0 && this.currentAdapter) {
        return this.currentAdapter.passesFilter(item, this.state.filters);
      }

      return true;
    });

    return items;
  }

  /**
   * Update validation state based on current selections.
   */
  async _updateValidation() {
    if (!this.selectedItem || !this.currentAdapter) return;

    const selections = this.state.selectionsByItemId.get(this.selectedItem._id) || new Map();
    const result = await this.currentAdapter.validateSelections(this.selectedItem, selections);

    this.state.validationErrors.clear();
    if (!result.valid) {
      result.errors.forEach(err => this.state.validationErrors.add(err));
    }

    // Update cost preview
    this.state.pendingCost = await this.currentAdapter.getCostPreview(
      this.selectedItem,
      selections
    );
  }

  _log(message, data = null) {
    if (game.settings?.get?.('foundryvtt-swse', 'debugMode')) {
      console.log(`[CustomizationWorkbench] ${message}`, data ?? '');
    }
  }
}
