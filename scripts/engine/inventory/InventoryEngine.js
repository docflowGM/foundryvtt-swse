/**
 * InventoryEngine — Equipment Weight & Filtering
 *
 * Handles:
 * - Total weight calculation (equipment + armor + weapons)
 * - Search filtering across inventory items
 * - Stack splitting support
 *
 * All calculations are pure functions.
 * No mutations, no side effects.
 */

export class InventoryEngine {
  /**
   * Calculate total weight from all inventory items
   * @param {Array} items - Array of item objects with system.weight and system.quantity
   * @returns {number} Total weight in lbs
   */
  static calculateTotalWeight(items) {
    if (!Array.isArray(items)) return 0;

    let total = 0;
    for (const item of items) {
      if (!item?.system) continue;
      const weight = Number(item.system.weight) || 0;
      const qty = Number(item.system.quantity) || 1;
      total += weight * qty;
    }
    return total;
  }

  /**
   * Filter items by search term
   * @param {Array} items - Array of item objects
   * @param {string} searchTerm - Search string (case-insensitive)
   * @returns {Array} Filtered items matching search term
   */
  static filterBySearch(items, searchTerm) {
    if (!Array.isArray(items)) return [];
    if (!searchTerm || searchTerm.trim() === '') return items;

    const term = searchTerm.toLowerCase().trim();
    return items.filter(item =>
      item?.name?.toLowerCase().includes(term)
    );
  }

  /**
   * Get equipment items (type: "equipment")
   * @param {Actor} actor - Actor document
   * @returns {Array} Equipment items
   */
  static getEquipment(actor) {
    if (!actor?.items) return [];
    return actor.items.filter(item => item.type === "equipment") || [];
  }

  /**
   * Get armor items (type: "armor")
   * @param {Actor} actor - Actor document
   * @returns {Array} Armor items
   */
  static getArmor(actor) {
    if (!actor?.items) return [];
    return actor.items.filter(item => item.type === "armor") || [];
  }

  /**
   * Get weapon items (type: "weapon")
   * @param {Actor} actor - Actor document
   * @returns {Array} Weapon items
   */
  static getWeapons(actor) {
    if (!actor?.items) return [];
    return actor.items.filter(item => item.type === "weapon") || [];
  }

  /**
   * Get all inventory items (equipment, armor, weapons combined)
   * @param {Actor} actor - Actor document
   * @returns {Array} All inventory items
   */
  static getAllInventory(actor) {
    const equipment = this.getEquipment(actor);
    const armor = this.getArmor(actor);
    const weapons = this.getWeapons(actor);
    return [...equipment, ...armor, ...weapons];
  }

  /**
   * Calculate encumbrance state based on weight and STR
   * @param {number} totalWeight - Total weight in lbs
   * @param {number} strScore - Character's STR ability score
   * @param {number} sizeMultiplier - Size multiplier (typically 1 for medium)
   * @returns {Object} Encumbrance state info
   */
  static calculateEncumbranceState(totalWeight, strScore, sizeMultiplier = 1) {
    const str = Math.max(1, Number(strScore) || 10);

    // Carry capacity thresholds
    const lightLoad = ((0.5 * str) ** 2) * sizeMultiplier;
    const mediumLoad = lightLoad * 2;
    const heavyLoad = mediumLoad * 1.5;

    // Determine state
    let state = "normal";
    let stateLabel = "Unencumbered";

    if (totalWeight > heavyLoad) {
      state = "overloaded";
      stateLabel = "Overloaded";
    } else if (totalWeight > mediumLoad) {
      state = "heavy";
      stateLabel = "Heavily Encumbered";
    } else if (totalWeight > lightLoad) {
      state = "encumbered";
      stateLabel = "Encumbered";
    }

    return {
      state,
      label: stateLabel,
      light: Math.round(lightLoad),
      medium: Math.round(mediumLoad),
      heavy: Math.round(heavyLoad)
    };
  }
}
