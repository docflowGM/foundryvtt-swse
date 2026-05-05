// scripts/apps/customization/adapters/lightsaber-adapter.js
/**
 * Lightsaber Customization Adapter (Phase 3)
 * Handles modifications for lightsabers as a first-class category.
 * Separate from generic weapon mods: crystals, emitters, focusing hardware, forms, etc.
 */

import CustomizationAdapterBase from "/systems/foundryvtt-swse/scripts/apps/customization/adapters/customization-adapter-base.js";
import { LIGHTSABER_CRYSTALS } from "/systems/foundryvtt-swse/scripts/data/lightsaber-crystals-map.js";

export default class LightsaberCustomizationAdapter extends CustomizationAdapterBase {
  static label = 'Lightsaber Customization';
  static icon = 'fas fa-wand-magic-sparkles';
  static itemTypes = ['weapon'];

  async getModCards(item) {
    // Wire to existing LIGHTSABER_CRYSTALS data
    const cards = [];

    try {
      for (const [crystalId, crystal] of Object.entries(LIGHTSABER_CRYSTALS)) {
        // Transform crystal data to mod card format
        cards.push({
          id: crystalId,
          name: crystal.name || '',
          description: crystal.effect || '',
          category: crystal.category || 'Crystal',
          cost: crystal.cost || 0,
          rarity: crystal.rarity || 'common',
          color: crystal.color || 'Varies',
          buildDcMod: crystal.buildDcMod || 0,
          modifiers: crystal.modifiers || [],
          tags: [crystal.category?.toLowerCase().replace(/\s+/g, '-') || 'crystal']
        });
      }
    } catch (err) {
      // Safe fallback: return empty array if data load fails
      console.error('Error loading lightsaber crystals:', err);
      return [];
    }

    return cards;
  }

  async getSlotUsage(item, selections = null) {
    // Lightsabers have unique slot structure
    // Typically: crystal slots, emitter slots, focusing chamber, pommel
    return {
      capacity: 4,
      used: 0,
      remaining: 4,
      breakdown: [
        { name: 'Crystal Slots', slots: 0 },
        { name: 'Emitter Slot', slots: 0 },
        { name: 'Focusing Hardware', slots: 0 }
      ]
    };
  }

  async getCostPreview(item, selections = null) {
    return 0;
  }

  async validateSelections(item, selections) {
    // Lightsabers have unique validation:
    // - Must have at least one crystal
    // - Emitter and focusing hardware rules
    // - Dual-phase compatibility checks
    return { valid: true, errors: [] };
  }

  async buildMutationPayload(item, selections) {
    // TODO: Build lightsaber customization payload
    return {};
  }

  getAvailableFilters() {
    return [
      { id: 'jedi', label: 'Jedi Design', icon: 'fas fa-wand-magic-sparkles' },
      { id: 'sith', label: 'Sith Design', icon: 'fas fa-fire' },
      { id: 'single', label: 'Single-Blade', icon: 'fas fa-sword' },
      { id: 'dual', label: 'Dual-Phase', icon: 'fas fa-code-branch' }
    ];
  }

  passesFilter(item, filters) {
    if (filters.size === 0) return true;
    // TODO: Implement lightsaber-specific filtering
    return true;
  }
}
