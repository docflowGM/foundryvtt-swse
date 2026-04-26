// scripts/apps/customization/adapters/customization-adapter-base.js
/**
 * Base class for category-specific customization adapters.
 * Each adapter implements rules for how a category can be customized.
 */

export default class CustomizationAdapterBase {
  /**
   * Human-readable label for this category.
   * @type {string}
   */
  static label = 'Customization';

  /**
   * Icon class for this category.
   * @type {string}
   */
  static icon = 'fas fa-cube';

  /**
   * Item types this adapter handles.
   * @type {string[]}
   */
  static itemTypes = [];

  constructor(actor, sharedState) {
    this.actor = actor;
    this.state = sharedState;
  }

  get label() {
    return this.constructor.label;
  }

  get icon() {
    return this.constructor.icon;
  }

  // ========== Override in subclasses ==========

  /**
   * Get the list of available modifications for an item.
   * Return array of mod card objects: { id, name, description, cost, slots, category, tags }
   */
  async getModCards(item) {
    return [];
  }

  /**
   * Get slot usage information for an item.
   * Return: { capacity, used, remaining, breakdown: [{name, slots}, ...] }
   */
  async getSlotUsage(item, selections = null) {
    return {
      capacity: 0,
      used: 0,
      remaining: 0,
      breakdown: []
    };
  }

  /**
   * Get cost preview for customizations.
   * Return the total cost (credits) of pending selections.
   */
  async getCostPreview(item, selections = null) {
    return 0;
  }

  /**
   * Validate selections for this item.
   * Return: { valid: boolean, errors: string[] }
   */
  async validateSelections(item, selections) {
    return { valid: true, errors: [] };
  }

  /**
   * Build the mutation payload to apply to the item document.
   * The caller will apply this via item.update(payload).
   * Return: { system: {...}, flags: {...}, ... } (or null if no-op)
   */
  async buildMutationPayload(item, selections) {
    return {};
  }

  /**
   * Check if an item passes the current filter set.
   * @param {Item} item
   * @param {Set<string>} filters - Filter tags
   * @return {boolean}
   */
  passesFilter(item, filters) {
    // Default: no filtering, all items pass
    return true;
  }

  /**
   * Get available filter options for this category.
   * Return: [{ id, label, icon }, ...]
   */
  getAvailableFilters() {
    return [];
  }

  // ========== Utility methods for adapters ==========

  /**
   * Find all mod documents for this item category.
   * Typically from a compendium or system registry.
   */
  async getModRegistry() {
    // Override in subclass to return category-specific mods
    return [];
  }

  /**
   * Calculate the "after" balance (credits left after applying cost).
   */
  getAfterBalance(item, costPreview) {
    const actorCredits = this.actor.system?.credits || 0;
    return Math.max(0, actorCredits - costPreview);
  }

  /**
   * Deep merge helper for building mutation payloads.
   */
  mergeMutation(base = {}, override = {}) {
    return foundry.utils.mergeObject(base, override, { inplace: false });
  }

  /**
   * Safe access to nested item system properties.
   */
  getItemSystemProperty(item, path, defaultValue = null) {
    return foundry.utils.getProperty(item.system, path) ?? defaultValue;
  }

  /**
   * Safe set nested item system properties.
   */
  setItemSystemProperty(item, path, value) {
    const obj = { system: {} };
    foundry.utils.setProperty(obj.system, path, value);
    return obj;
  }
}
