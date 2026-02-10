/**
 * Unified Card Renderer
 *
 * Helper module for rendering suggestion cards with consistent styling.
 * Integrates with UNIFIED_TIERS system to provide tier metadata and styling.
 *
 * Usage:
 *   const cardData = UnifiedCardRenderer.formatSuggestionCard(item, tier);
 *   const html = await renderTemplate('suggestion-card', cardData);
 */

import { UNIFIED_TIERS, getTierBadge, getTierColor } from './suggestion-unified-tiers.js';

/**
 * Format item data for suggestion card rendering
 * @param {Object} item - Item data (feat, talent, class, power, etc.)
 * @param {number} tier - Suggestion tier (0-6)
 * @param {Object} options - Additional options
 * @returns {Object} Formatted data for card template
 */
export function formatSuggestionCard(item, tier, options = {}) {
  const {
    compact = false,
    selected = false,
    disabled = false,
    disabledReason = null,
    details = null,
    showImage = true
  } = options;

  const tierData = getTierMetadata(tier);
  const color = getTierColor(tier);

  return {
    // Item data
    id: item.id || item._id,
    name: item.name || 'Unknown Item',
    img: showImage ? (item.img || item.image || '') : '',
    type: item.type || 'item',
    description: item.description || item.system?.description || '',

    // Tier data
    tier,
    tierLabel: tierData.label,
    tierIcon: tierData.icon,
    tierColor: color,

    // Display options
    compact,
    selected,
    disabled: disabled || false,
    disabledReason,
    details: details || null
  };
}

/**
 * Get full metadata for a tier
 * @param {number} tier - Tier number (0-6)
 * @returns {Object} Tier metadata
 */
export function getTierMetadata(tier) {
  return {
    level: tier,
    label: UNIFIED_TIERS.LABELS[tier] || 'Unknown',
    icon: UNIFIED_TIERS.ICONS[tier] || '◦',
    color: UNIFIED_TIERS.COLORS[tier] || '#D3D3D3',
    description: UNIFIED_TIERS.DESCRIPTIONS[tier] || 'Available',
    priority: UNIFIED_TIERS.PRIORITY[tier] ?? 100,
    badge: getTierBadge(tier)
  };
}

/**
 * Format multiple items into suggestion cards
 * @param {Array} items - Array of items
 * @param {Array|Function} tiers - Tier for each item or function to calculate tier
 * @param {Object} options - Additional options
 * @returns {Array} Array of formatted card data
 */
export function formatSuggestionCards(items, tiers, options = {}) {
  return items.map((item, index) => {
    const tier = typeof tiers === 'function'
      ? tiers(item, index)
      : Array.isArray(tiers)
        ? tiers[index] ?? 0
        : tiers;

    return formatSuggestionCard(item, tier, options);
  });
}

/**
 * Sort cards by tier (highest priority first)
 * @param {Array} cards - Array of card data
 * @returns {Array} Sorted cards
 */
export function sortCardsByTier(cards) {
  return [...cards].sort((a, b) => {
    if (a.tier !== b.tier) {
      return b.tier - a.tier; // Higher tier first
    }
    // Secondary sort: alphabetical by name
    return a.name.localeCompare(b.name);
  });
}

/**
 * Group cards by tier
 * @param {Array} cards - Array of card data
 * @returns {Object} Cards grouped by tier level
 */
export function groupCardsByTier(cards) {
  const grouped = {};

  // Initialize all tier groups
  for (let tier = 6; tier >= 0; tier--) {
    grouped[tier] = [];
  }

  // Group cards
  cards.forEach(card => {
    const tier = card.tier ?? 0;
    if (grouped[tier]) {
      grouped[tier].push(card);
    }
  });

  return grouped;
}

/**
 * Get CSS class for tier styling
 * @param {number} tier - Tier number
 * @returns {string} CSS class name
 */
export function getTierCSSClass(tier) {
  return `suggestion-tier-${tier}`;
}

/**
 * Get tier from suggestion reason (maps old-style reasons to unified tiers)
 * Useful for migrating from old engines to unified system
 * @param {string} reason - Old-style suggestion reason
 * @returns {number} Unified tier
 */
export function mapReasonToTier(reason) {
  // Map common old-style reasons to unified tiers
  const reasonMap = {
    // Prestige-related
    'prestige': UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW,
    'prestige_now': UNIFIED_TIERS.PRESTIGE_QUALIFIED_NOW,
    'prestige_soon': UNIFIED_TIERS.PATH_CONTINUATION,
    'prestige_prerequisite': UNIFIED_TIERS.PRESTIGE_PREREQUISITE,

    // Path-related
    'continuation': UNIFIED_TIERS.PATH_CONTINUATION,
    'path': UNIFIED_TIERS.PATH_CONTINUATION,
    'chain': UNIFIED_TIERS.PATH_CONTINUATION,

    // Synergy
    'synergy': UNIFIED_TIERS.CATEGORY_SYNERGY,
    'category_synergy': UNIFIED_TIERS.CATEGORY_SYNERGY,
    'ability_synergy': UNIFIED_TIERS.ABILITY_SYNERGY,
    'mechanical_synergy': UNIFIED_TIERS.ABILITY_SYNERGY,

    // Thematic
    'thematic': UNIFIED_TIERS.THEMATIC_FIT,
    'thematic_fit': UNIFIED_TIERS.THEMATIC_FIT,
    'roleplay': UNIFIED_TIERS.THEMATIC_FIT,

    // Default
    'available': UNIFIED_TIERS.AVAILABLE,
    'fallback': UNIFIED_TIERS.AVAILABLE
  };

  return reasonMap[reason?.toLowerCase?.() ?? ''] ?? UNIFIED_TIERS.AVAILABLE;
}

/**
 * Create a tier badge HTML element
 * @param {number} tier - Tier number
 * @returns {string} HTML string for tier badge
 */
export function createTierBadgeHTML(tier) {
  const metadata = getTierMetadata(tier);
  const color = getTierColor(tier);
  const textColor = tier >= 4 ? 'white' : '#333';

  return `
    <div class="tier-badge tier-${tier}" style="background-color: ${color}; color: ${textColor};" title="${metadata.description}">
      <span class="tier-icon">${metadata.icon}</span>
      <span class="tier-label">${metadata.label}</span>
    </div>
  `;
}

/**
 * Validate tier value
 * @param {number} tier - Tier to validate
 * @returns {boolean} True if valid
 */
export function isValidTier(tier) {
  return Number.isInteger(tier) && tier >= 0 && tier <= 6;
}

/**
 * Normalize tier value (ensures it's in valid range)
 * @param {number} tier - Tier value
 * @returns {number} Normalized tier (0-6)
 */
export function normalizeTier(tier) {
  if (!Number.isInteger(tier)) {
    return UNIFIED_TIERS.AVAILABLE;
  }
  return Math.max(0, Math.min(6, tier));
}
