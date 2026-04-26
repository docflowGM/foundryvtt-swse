// scripts/apps/customization/adapters/weapon-adapter.js
/**
 * Weapon Customization Adapter
 * Handles modifications for blasters, melee weapons, etc. (but not lightsabers)
 */

import CustomizationAdapterBase from "/systems/foundryvtt-swse/scripts/apps/customization/adapters/customization-adapter-base.js";

export default class WeaponCustomizationAdapter extends CustomizationAdapterBase {
  static label = 'Weapon Customization';
  static icon = 'fas fa-blaster';
  static itemTypes = ['weapon'];

  // ========== Mod Options ==========

  /**
   * Get available weapon modifications.
   * TODO: Wire to actual weapon mod registry from repo.
   */
  async getModCards(item) {
    // For now, placeholder mods. In production, fetch from registry.
    // This is where you'd call something like:
    // const mods = await this.getModRegistry();
    // return mods.filter(m => m.isCompatibleWith(item));

    const mods = [
      {
        id: 'scope-tactical',
        name: 'Tactical Scope',
        description: '+2 to attack rolls at ranges beyond short',
        cost: 500,
        slots: 1,
        category: 'optics',
        tags: ['scope', 'targeting']
      },
      {
        id: 'grip-ergonomic',
        name: 'Ergonomic Grip',
        description: '+1 to attack rolls',
        cost: 300,
        slots: 0,
        category: 'handling',
        tags: ['grip', 'bonus']
      },
      {
        id: 'barrel-extended',
        name: 'Extended Barrel',
        description: '+1d6 damage at long range',
        cost: 400,
        slots: 1,
        category: 'barrel',
        tags: ['barrel', 'range']
      },
      {
        id: 'chamber-reinforced',
        name: 'Reinforced Chamber',
        description: 'Weapon gains 2 additional hit points',
        cost: 600,
        slots: 0,
        category: 'chamber',
        tags: ['durability']
      }
    ];

    return mods;
  }

  // ========== Slot Management ==========

  /**
   * Weapons may have hardpoint slots for attachments.
   */
  async getSlotUsage(item, selections = null) {
    // Get the weapon's slot capacity from system data
    const slotCapacity = this.getItemSystemProperty(item, 'hardpoints', 0);

    // Count selected mods that use slots
    let slotUsed = 0;
    if (selections) {
      const mods = await this.getModCards(item);
      selections.forEach((_, modId) => {
        const mod = mods.find(m => m.id === modId);
        if (mod) slotUsed += mod.slots;
      });
    }

    return {
      capacity: slotCapacity,
      used: slotUsed,
      remaining: Math.max(0, slotCapacity - slotUsed),
      breakdown: [
        { name: 'Optics', slots: 0 },  // Would sum actual mods
        { name: 'Barrel', slots: 0 }
      ]
    };
  }

  // ========== Cost Calculation ==========

  /**
   * Calculate the total cost of weapon mods.
   */
  async getCostPreview(item, selections = null) {
    if (!selections) {
      selections = this.state.selectionsByItemId.get(item._id) || new Map();
    }

    let totalCost = 0;
    const mods = await this.getModCards(item);

    selections.forEach((_, modId) => {
      const mod = mods.find(m => m.id === modId);
      if (mod) totalCost += mod.cost;
    });

    return totalCost;
  }

  // ========== Validation ==========

  /**
   * Validate that the selected modifications are legal.
   */
  async validateSelections(item, selections) {
    const errors = [];

    // Check slot capacity
    const slotUsage = await this.getSlotUsage(item, selections);
    if (slotUsage.used > slotUsage.capacity) {
      errors.push(
        `Slot limit exceeded: ${slotUsage.used}/${slotUsage.capacity}`
      );
    }

    // Check cost affordability
    const cost = await this.getCostPreview(item, selections);
    const actorCredits = this.actor.system?.credits || 0;
    if (cost > actorCredits) {
      errors.push(
        `Insufficient credits: need ${cost}, have ${actorCredits}`
      );
    }

    // Check for conflicting mods (e.g., two optics on one slot)
    // TODO: Wire to conflict checker if needed

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // ========== Apply Mutation ==========

  /**
   * Build the update payload to apply weapon customizations to the item document.
   */
  async buildMutationPayload(item, selections) {
    const mods = await this.getModCards(item);
    const selectedMods = [];

    selections.forEach((_, modId) => {
      const mod = mods.find(m => m.id === modId);
      if (mod) selectedMods.push(mod);
    });

    // Build the mutation payload
    // This structure depends on how the repo stores weapon mods.
    // For now, store in a custom flag.
    // TODO: Adapt to actual repo mutation pattern.

    const mutation = {
      system: {
        // Apply any system-level changes (e.g., damage bonus)
      },
      flags: {
        'foundryvtt-swse': {
          customizations: {
            weaponMods: selectedMods.map(m => ({
              id: m.id,
              name: m.name,
              cost: m.cost,
              appliedAt: new Date().toISOString()
            }))
          }
        }
      }
    };

    // Deduct credits from actor
    const cost = await this.getCostPreview(item, selections);
    if (cost > 0) {
      const currentCredits = this.actor.system?.credits || 0;
      mutation.system.credits = currentCredits - cost; // Will be applied to actor, not item
    }

    return mutation;
  }

  // ========== Filtering ==========

  /**
   * Available filter options for weapons.
   */
  getAvailableFilters() {
    return [
      { id: 'blaster', label: 'Blasters', icon: 'fas fa-gun' },
      { id: 'melee', label: 'Melee', icon: 'fas fa-sword' },
      { id: 'heavy', label: 'Heavy Weapons', icon: 'fas fa-bazooka' },
      { id: 'customizable', label: 'Customizable Only', icon: 'fas fa-wrench' }
    ];
  }

  /**
   * Check if an item matches the active filters.
   */
  passesFilter(item, filters) {
    // If no filters active, all pass
    if (filters.size === 0) return true;

    let passesAny = false;

    // Check weapon type filters
    const weaponType = this.getItemSystemProperty(item, 'weaponType', '');

    if (filters.has('blaster') && weaponType === 'blaster') passesAny = true;
    if (filters.has('melee') && ['melee', 'vibroblade'].includes(weaponType)) passesAny = true;
    if (filters.has('heavy') && ['heavy', 'missile'].includes(weaponType)) passesAny = true;

    // Customizable check
    if (filters.has('customizable')) {
      const hasSlots = this.getItemSystemProperty(item, 'hardpoints', 0) > 0;
      if (hasSlots) passesAny = true;
    }

    return passesAny;
  }
}
