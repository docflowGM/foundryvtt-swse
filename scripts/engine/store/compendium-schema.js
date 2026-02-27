/**
 * scripts/engine/store/compendium-schema.js
 *
 * Defines expected schema for store compendium items
 * Acts as SSOT validation and documentation
 */

/**
 * Expected schema for items in store compendiums
 * (weapons, armor, equipment, droids, vehicles)
 *
 * All items MUST have:
 *   - id (Foundry doc ID, canonical)
 *   - _id (legacy compat)
 *   - name (display name, no logic inference from name)
 *   - type (foundry type: 'weapon', 'armor', 'equipment', 'vehicle', etc.)
 *   - system.cost (numeric cost in credits)
 *   - system.availability (string: Standard, Licensed, Restricted, Military, Illegal, Rare)
 *   - img (image path)
 *
 * Must NOT have:
 *   - Embedded logic or conditionals
 *   - Compendium-location-based assumptions
 *   - Name-based cost inference
 *   - Purchase restrictions in metadata
 */

export const ITEM_SCHEMA = {
  // Core identity (required)
  id: { type: 'string', required: true, description: 'Canonical Foundry document ID' },
  _id: { type: 'string', required: true, description: 'Legacy ID compatibility' },
  name: { type: 'string', required: true, description: 'Display name (no logic inference)' },
  type: { type: 'string', required: true, description: 'Item type (weapon, armor, equipment, etc.)' },

  // System data (required)
  system: {
    cost: { type: 'number', required: true, description: 'Base cost in credits (0 = free)' },
    availability: {
      type: 'string',
      required: false,
      enum: ['Standard', 'Licensed', 'Restricted', 'Military', 'Illegal', 'Rare'],
      description: 'Legality/availability flag'
    },
    weight: { type: 'number', required: false, description: 'Item weight (unused by store)' }
  },

  // Display (required)
  img: { type: 'string', required: true, description: 'Image path' },

  // Forbidden
  FORBIDDEN: [
    'flags.swse.storePrice (use system.cost)',
    'flags.swse.purchaseRestriction (use engine policies)',
    'flags.swse.vendorSpecific (use engine policies)',
    'name-based logic (no "Rare X" → legality inference)'
  ]
};

/**
 * Expected schema for droid/vehicle compendiums (actors)
 */
export const ACTOR_SCHEMA = {
  id: { type: 'string', required: true },
  _id: { type: 'string', required: true },
  name: { type: 'string', required: true },
  type: { type: 'string', required: true, enum: ['character', 'npc', 'vehicle', 'droid'] },

  system: {
    cost: { type: 'number', required: true, description: 'Purchase cost in credits' }
  },

  img: { type: 'string', required: true },

  FORBIDDEN: [
    'flags for cost/legality/availability (use system fields)'
  ]
};

/**
 * Validation function: Check if item conforms to schema
 * @param {Object} item - Foundry item or plain object
 * @returns {Object} { valid, errors }
 */
export function validateItemSchema(item) {
  const errors = [];

  if (!item.id && !item._id) {
    errors.push('Missing both id and _id (cannot index)');
  }

  if (!item.name || item.name.trim() === '') {
    errors.push('Missing or empty name');
  }

  const cost = Number(item.system?.cost ?? null);
  if (typeof cost !== 'number' || !Number.isFinite(cost)) {
    errors.push(`Invalid cost: ${item.system?.cost} (must be number)`);
  }

  if (!item.img || item.img.trim() === '') {
    errors.push('Missing or empty img');
  }

  // Check for forbidden patterns
  if (item.name && /^(Rare|Military|Illegal|Restricted)/i.test(item.name)) {
    errors.push('⚠ Name-based legality inference detected (legacy pattern) — use system.availability instead');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Expected categorization (applied by engine, not in compendium)
 */
export const EXPECTED_CATEGORIES = {
  Weapons: ['Melee', 'Ranged Weapons', 'Grenades/Explosives'],
  Armor: ['Clothing', 'Light Armor', 'Medium Armor', 'Heavy Armor'],
  Equipment: ['Survival Gear', 'Technical Equipment', 'Security Equipment', 'Tools'],
  Droids: ['Astromech', 'Protocol Droid', 'Medical Droid', 'Combat Droid'],
  Vehicles: ['Speeders', 'Walkers', 'Starships', 'Stations']
};

export const SSOT_CONTRACT = `
SSOT (Single Source of Truth) Contract for Store Compendiums

The engine trusts compendiums to be pure, declarative data:
1. No embedded logic or conditionals
2. All data fields self-documenting (no name-based inference)
3. system.cost is canonical (no price calculation in metadata)
4. system.availability defines legality (not name patterns)
5. ID fields are canonical and indexed
6. No cross-references (no "see item X for details")

Engine Responsibilities:
1. Load all items from canonical STORE_PACKS
2. Normalize missing IDs (fallback generation with warning)
3. Apply categorization (engine-defined, not metadata)
4. Calculate final prices (with markup/discount/used policies)
5. Filter by legality (if policies defined)

UI Responsibilities:
1. Display engine-provided inventory verbatim
2. Never infer item properties from names
3. Use engine for availability/legality checks
4. Call engine for all purchases
`;
