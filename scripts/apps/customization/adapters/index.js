/**
 * CUSTOMIZATION ADAPTERS INDEX
 *
 * Category-specific adapters for the unified customization workbench.
 * Each adapter implements a standard interface and delegates to existing engines.
 *
 * Phase 1+2A+2B+2C: Blaster, Melee, Armor, Gear (all opt-in)
 * Phase 3: Lightsaber, Droid (deferred)
 */

import BlasterAdapter from '/systems/foundryvtt-swse/scripts/apps/customization/adapters/blaster-adapter.js';
import MeleeAdapter from '/systems/foundryvtt-swse/scripts/apps/customization/adapters/melee-adapter.js';
import ArmorAdapter from '/systems/foundryvtt-swse/scripts/apps/customization/adapters/armor-adapter.js';
import GearAdapter from '/systems/foundryvtt-swse/scripts/apps/customization/adapters/gear-adapter.js';

/**
 * Get the appropriate adapter for an item type.
 *
 * @param {String} itemType - The item type to look up
 * @returns {Function|null} The adapter class, or null if not yet implemented
 */
export function getAdapterForItemType(itemType) {
  // Phase 1: Blaster
  if (itemType === 'blaster') {
    return BlasterAdapter;
  }

  // Phase 2A: Melee weapons
  if (itemType === 'weapon') {
    return MeleeAdapter;
  }

  // Phase 2B: Armor
  if (itemType === 'armor' || itemType === 'bodysuit') {
    return ArmorAdapter;
  }

  // Phase 2C: Gear
  if (itemType === 'equipment' || itemType === 'gear') {
    return GearAdapter;
  }

  // Phase 3: Lightsaber, droid (deferred)
  return null;
}

export { BlasterAdapter, MeleeAdapter, ArmorAdapter, GearAdapter };
export default {
  getAdapterForItemType,
  BlasterAdapter,
  MeleeAdapter,
  ArmorAdapter,
  GearAdapter
};
