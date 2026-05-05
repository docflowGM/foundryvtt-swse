// scripts/apps/customization/adapters/droid-adapter.js
/**
 * Droid Customization Adapter (Phase 3)
 * Handles modifications for owned droid companions.
 * System slots, accessories, processors, upgrades specific to droids.
 */

import CustomizationAdapterBase from "/systems/foundryvtt-swse/scripts/apps/customization/adapters/customization-adapter-base.js";
import { DROID_MODIFICATION_EXAMPLES } from "/systems/foundryvtt-swse/scripts/data/droid-modifications.js";

export default class DroidCustomizationAdapter extends CustomizationAdapterBase {
  static label = 'Droid Customization';
  static icon = 'fas fa-robot';
  static itemTypes = ['droid'];

  async getModCards(item) {
    // Wire to existing DROID_MODIFICATION_EXAMPLES data
    const cards = [];

    try {
      for (const [modId, modification] of Object.entries(DROID_MODIFICATION_EXAMPLES)) {
        // Transform droid modification data to mod card format
        cards.push({
          id: modification.id || modId,
          name: modification.name || '',
          description: modification.description || '',
          category: this._categorizeDroidMod(modification) || 'Upgrade',
          cost: modification.costInCredits || 0,
          slots: modification.hardpointsRequired || 1,
          availability: modification.availability || 'Unknown',
          prerequisites: modification.prerequisites || {},
          modifiers: modification.modifiers || [],
          tags: [
            this._categorizeDroidMod(modification)?.toLowerCase().replace(/\s+/g, '-') || 'upgrade'
          ]
        });
      }
    } catch (err) {
      // Safe fallback: return empty array if data load fails
      console.error('Error loading droid modifications:', err);
      return [];
    }

    return cards;
  }

  /**
   * Categorize a droid modification by its properties
   * @private
   */
  _categorizeDroidMod(mod) {
    const name = (mod.name || '').toLowerCase();
    if (name.includes('sensor')) return 'Sensor';
    if (name.includes('targeting')) return 'Targeting';
    if (name.includes('processor')) return 'Processor';
    if (name.includes('armor') || name.includes('plating')) return 'Armor';
    if (name.includes('speed') || name.includes('governor')) return 'Movement';
    if (name.includes('weapon') || name.includes('hardpoint')) return 'Weapon';
    if (name.includes('stealth')) return 'Stealth';
    if (name.includes('thermal')) return 'Thermal';
    if (name.includes('frame') || name.includes('reinforced')) return 'Structure';
    if (name.includes('power') || name.includes('core')) return 'Power';
    if (name.includes('communication')) return 'Communication';
    if (name.includes('tool')) return 'Tool';
    return 'Upgrade';
  }

  async getSlotUsage(item, selections = null) {
    // Droids have chassis slots
    const slotCapacity = this.getItemSystemProperty(item, 'chassis.slots', 0);

    return {
      capacity: slotCapacity,
      used: 0,
      remaining: slotCapacity,
      breakdown: [
        { name: 'Processor Slot', slots: 0 },
        { name: 'Accessory Slots', slots: 0 }
      ]
    };
  }

  async getCostPreview(item, selections = null) {
    return 0;
  }

  async validateSelections(item, selections) {
    return { valid: true, errors: [] };
  }

  async buildMutationPayload(item, selections) {
    // TODO: Build droid upgrade payload
    return {};
  }

  getAvailableFilters() {
    return [
      { id: 'protocol', label: 'Protocol Droids', icon: 'fas fa-comments' },
      { id: 'utility', label: 'Utility Droids', icon: 'fas fa-wrench' },
      { id: 'combat', label: 'Combat Droids', icon: 'fas fa-shield-alt' }
    ];
  }

  passesFilter(item, filters) {
    if (filters.size === 0) return true;
    // TODO: Implement droid-specific filtering
    return true;
  }
}
