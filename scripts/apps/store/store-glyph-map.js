/**
 * store-glyph-map.js
 *
 * SSOT (Single Source of Truth) for Store card glyphs.
 *
 * Maps item categories → Aurebesh glyphs (or ASCII fallbacks).
 *
 * RULE: All Store card glyphs resolve through this map ONLY.
 * No name inference, no template logic, no runtime guessing.
 *
 * Glyphs are PRESENTATION ONLY — never referenced by game logic.
 */

/**
 * Canonical glyph mapping for Store item categories.
 *
 * Structure: categoryKey → aurebesh glyph (with ASCII fallback)
 */
export const STORE_GLYPHS = {
  // Weapons
  melee_weapon: {
    aurebesh: 'T',      // Blade-like vertical glyph
    ascii: '⚔',         // Crossed swords fallback
    label: 'Melee'
  },
  ranged_weapon: {
    aurebesh: 'A',      // Angular / projectile-like
    ascii: '→',         // Arrow fallback
    label: 'Ranged'
  },

  // Armor
  armor: {
    aurebesh: 'Eo',     // Shield / enclosure digraph
    ascii: '◼',         // Square shield fallback
    label: 'Armor'
  },

  // Vehicles (large, horizontal mass)
  vehicle: {
    aurebesh: 'Sh',     // Horizontal digraph
    ascii: '⊞',         // Wide box fallback
    label: 'Vehicles'
  },

  // Droids (sensors / awareness)
  droid: {
    aurebesh: 'Oo',     // Eyes / circular digraph
    ascii: '⊙',         // Circle with dot fallback
    label: 'Droids'
  },

  // Generic Gear / Equipment (utility)
  gear: {
    aurebesh: 'O',      // Generic circular glyph
    ascii: '◉',         // Generic circle fallback
    label: 'Equipment'
  },

  // Fallback (should rarely be used)
  unknown: {
    aurebesh: '?',
    ascii: '?',
    label: 'Unknown'
  }
};

/**
 * Resolve glyph for a Store item.
 *
 * @param {string} category - Item category (from engine: 'Weapons', 'Armor', etc.)
 * @param {string} itemType - Item type (from normalizer: 'weapon', 'droid', etc.)
 * @param {boolean} useAurebesh - Whether to render Aurebesh (default true)
 * @returns {Object} { aurebesh, ascii, label }
 */
export function resolveStoreGlyph(category, itemType, useAurebesh = true) {
  // Map item type + category to glyph key
  let glyphKey = 'gear'; // Default

  if (itemType === 'weapon') {
    const subcat = (category || '').toLowerCase();
    if (subcat.includes('melee')) {
      glyphKey = 'melee_weapon';
    } else {
      glyphKey = 'ranged_weapon';
    }
  } else if (itemType === 'armor') {
    glyphKey = 'armor';
  } else if (itemType === 'vehicle') {
    glyphKey = 'vehicle';
  } else if (itemType === 'droid') {
    glyphKey = 'droid';
  }

  const glyph = STORE_GLYPHS[glyphKey] || STORE_GLYPHS.unknown;

  return {
    aurebesh: glyph.aurebesh,
    ascii: glyph.ascii,
    label: glyph.label,
    text: useAurebesh ? glyph.aurebesh : glyph.ascii
  };
}

/**
 * All supported glyph keys (for validation).
 */
export const GLYPH_KEYS = Object.keys(STORE_GLYPHS);
