/**
 * Vehicle Category Registry
 *
 * Canonical vehicle category definitions and utilities.
 * Used for:
 * - PreCreate auto-fill hooks
 * - Dynamic dropdown selectors
 * - Category-based filtering
 * - Category-based sheet tab visibility
 */

/**
 * Canonical vehicle categories
 * Categories are derived from SWSE lore and physical characteristics
 */
export const VEHICLE_CATEGORIES = {
  // Planetary vehicles
  mount: {
    domain: 'planetary',
    label: 'Mount',
    description: 'Creature or beast used for transportation'
  },
  speeder: {
    domain: 'planetary',
    label: 'Speeder',
    description: 'Hovering ground-effect vehicle'
  },
  tracked: {
    domain: 'planetary',
    label: 'Tracked',
    description: 'Tank or tracked vehicle'
  },
  walker: {
    domain: 'planetary',
    label: 'Walker',
    description: 'Bipedal or multi-legged walker'
  },
  wheeled: {
    domain: 'planetary',
    label: 'Wheeled',
    description: 'Ground vehicle with wheels'
  },
  emplacement: {
    domain: 'planetary',
    label: 'Emplacement',
    description: 'Stationary defense platform or turret'
  },
  airspeeder: {
    domain: 'planetary',
    label: 'Air Speeder',
    description: 'Atmospheric aircraft'
  },

  // Starship vehicles
  starfighter: {
    domain: 'starship',
    label: 'Starfighter',
    description: 'Small combat spacecraft'
  },
  transport: {
    domain: 'starship',
    label: 'Transport',
    description: 'Cargo, passenger, or shuttle spacecraft'
  },
  capitalShip: {
    domain: 'starship',
    label: 'Capital Ship',
    description: 'Large cruiser, destroyer, or flagship'
  },
  spaceStation: {
    domain: 'starship',
    label: 'Space Station',
    description: 'Orbital station or space platform'
  }
};

/**
 * Get all categories for a specific domain
 * @param {string} domain - 'planetary' or 'starship'
 * @returns {Object} Categories in that domain
 */
export function getCategoriesByDomain(domain) {
  return Object.entries(VEHICLE_CATEGORIES)
    .filter(([_, cat]) => cat.domain === domain)
    .reduce((acc, [key, cat]) => {
      acc[key] = cat;
      return acc;
    }, {});
}

/**
 * Get category metadata
 * @param {string} category - Category key
 * @returns {Object|null} Category metadata or null if not found
 */
export function getCategoryMetadata(category) {
  return VEHICLE_CATEGORIES[category] || null;
}

/**
 * Get domain for a category
 * @param {string} category - Category key
 * @returns {string|null} 'planetary', 'starship', or null
 */
export function getCategoryDomain(category) {
  const meta = VEHICLE_CATEGORIES[category];
  return meta ? meta.domain : null;
}

/**
 * Validate that a category is canonical
 * @param {string} category - Category to validate
 * @returns {boolean} True if canonical
 */
export function isCanonicalCategory(category) {
  return category in VEHICLE_CATEGORIES;
}

/**
 * Get dropdown options for form selects
 * @param {string} [domain] - Optional filter by domain ('planetary' or 'starship')
 * @returns {Array} Array of {value, label} objects
 */
export function getCategoryDropdownOptions(domain = null) {
  const categories = domain
    ? getCategoriesByDomain(domain)
    : VEHICLE_CATEGORIES;

  return Object.entries(categories)
    .map(([key, cat]) => ({
      value: key,
      label: cat.label,
      description: cat.description
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Parse vehicle category from text (for migration/import)
 * Attempts to find canonical category from fuzzy input
 * @param {string} text - Text to parse
 * @returns {string|null} Canonical category or null
 */
export function parseVehicleCategory(text) {
  if (!text) return null;

  const normalized = text.toLowerCase().trim();

  // Exact match
  if (normalized in VEHICLE_CATEGORIES) {
    return normalized;
  }

  // Fuzzy match against labels
  for (const [key, cat] of Object.entries(VEHICLE_CATEGORIES)) {
    if (cat.label.toLowerCase() === normalized) {
      return key;
    }
  }

  return null;
}
