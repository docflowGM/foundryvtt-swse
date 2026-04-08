/**
 * Utility helpers for SWSEV2CharacterSheet
 *
 * Contains reusable utility functions for skill use classification,
 * time formatting, animations, modals, and other sheet helpers.
 *
 * These are stateless functions that support listener and context preparation logic.
 */

/**
 * Build read-only inventory view model from actor items
 * @param {Actor} actor - The actor to build inventory for
 * @returns {Object} Organized inventory by category
 */
export function buildInventoryModel(actor) {
  const items = Array.from(actor.items);

  // Map of item type -> display category
  const typeToCategory = {
    weapon: "Weapons",
    armor: "Armor",
    shield: "Armor",
    equipment: "Equipment",
    consumable: "Consumables",
    misc: "Miscellaneous",
    ammo: "Ammunition"
  };

  // Build inventory groups
  const inventory = new Map();

  // Initialize standard groups
  ["Weapons", "Armor", "Equipment", "Consumables"].forEach(group => {
    inventory.set(group, []);
  });

  // Sort items into groups with full data
  items.forEach(item => {
    const category = typeToCategory[item.type] || "Miscellaneous";

    // Ensure category exists in map
    if (!inventory.has(category)) {
      inventory.set(category, []);
    }

    const itemData = {
      id: item.id,
      name: item.name,
      type: item.type,
      img: item.img,
      quantity: item.system?.quantity ?? 1,
      weight: item.system?.weight ?? 0,
      rarity: item.system?.rarity ?? 'common'
    };

    inventory.get(category).push(itemData);
  });

  // Convert Map to array of groups for template
  return Array.from(inventory, ([label, items]) => ({
    label,
    count: items.length,
    items
  }));
}

/**
 * Get CSS class for action time (swift, move, standard, full-round, reaction, free)
 * @param {string} time - Action time value
 * @returns {string} CSS class name
 */
export function getTimeClass(time) {
  if (!time) return 'time--unknown';
  const normalized = String(time).toLowerCase().trim();
  const mapping = {
    'swift': 'time--swift',
    'move': 'time--move',
    'standard': 'time--standard',
    'full-round': 'time--full-round',
    'full round': 'time--full-round',
    'reaction': 'time--reaction',
    'free': 'time--free',
    'varies': 'time--varies'
  };
  return mapping[normalized] || 'time--unknown';
}

/**
 * Get human-readable label for action time
 * @param {string} time - Action time value
 * @returns {string} Display label
 */
export function getTimeLabel(time) {
  if (!time) return '?';
  const normalized = String(time).toLowerCase().trim();
  const mapping = {
    'swift': 'Swift',
    'move': 'Move',
    'standard': 'Standard',
    'full-round': 'Full-Round',
    'full round': 'Full-Round',
    'reaction': 'Reaction',
    'free': 'Free',
    'varies': 'Varies'
  };
  return mapping[normalized] || time;
}

/**
 * Classify action type from use data
 * @param {Object} use - Action use object
 * @returns {string} Action type (attack, defense, utility, etc.)
 */
export function classifyActionType(use) {
  if (!use) return 'utility';

  // Check action type field
  if (use.action?.type) {
    return use.action.type.toLowerCase().replace(/\s+/g, '-');
  }

  // Check label/name for clues
  const label = String(use.label || use.name || '').toLowerCase();
  if (label.includes('attack') || label.includes('strike')) return 'attack';
  if (label.includes('defense') || label.includes('defend')) return 'defense';
  if (label.includes('move')) return 'movement';
  if (label.includes('skill')) return 'skill';

  return 'utility';
}

/**
 * Get human-readable action type label
 * @param {Object} use - Action use object
 * @returns {string} Display label
 */
export function getActionTypeLabel(use) {
  const type = classifyActionType(use);
  const mapping = {
    'attack': 'Attack',
    'defense': 'Defense',
    'movement': 'Movement',
    'skill': 'Skill',
    'utility': 'Utility',
    'reaction': 'Reaction'
  };
  return mapping[type] || type;
}

/**
 * Categorize skill use for grouping in the skills panel
 * @param {Object} use - Skill use object
 * @param {string} skillKey - Key of the skill
 * @returns {string} Category for grouping
 */
export function categorizeSkillUse(use, skillKey) {
  if (!use) return 'uncategorized';

  // Check explicit category first
  if (use.category) {
    return use.category;
  }

  // Infer from time economy
  const time = String(use.time || '').toLowerCase();
  if (time.includes('swift')) return 'swift-action';
  if (time.includes('move')) return 'move-action';
  if (time.includes('standard')) return 'standard-action';
  if (time.includes('full')) return 'full-round-action';
  if (time.includes('reaction')) return 'reaction';
  if (time.includes('free')) return 'free-action';

  // Infer from label
  const label = String(use.label || use.name || '').toLowerCase();
  if (label.includes('trained')) return 'trained-use';
  if (label.includes('special')) return 'special';

  return 'other';
}

/**
 * Normalize action economy type string
 * @param {string} value - Raw economy type value
 * @returns {string} Normalized value
 */
export function normalizeActionEconomyType(value) {
  if (!value) return 'standard';
  const normalized = String(value).toLowerCase().replace(/[\s+]/g, '-');
  const validTypes = ['swift', 'move', 'standard', 'full-round', 'reaction', 'free'];
  return validTypes.includes(normalized) ? normalized : 'standard';
}

/**
 * Derive combat action economy type from action data
 * @param {Object} actionData - Action object
 * @returns {string} Economy type
 */
export function deriveCombatActionEconomyType(actionData = {}) {
  if (!actionData) return 'standard';

  // Check explicit type
  if (actionData.type) {
    return normalizeActionEconomyType(actionData.type);
  }

  // Check action object
  if (actionData.action?.type) {
    return normalizeActionEconomyType(actionData.action.type);
  }

  // Infer from label
  const label = String(actionData.label || actionData.name || '').toLowerCase();
  if (label.includes('swift')) return 'swift';
  if (label.includes('move')) return 'move';
  if (label.includes('full')) return 'full-round';
  if (label.includes('reaction')) return 'reaction';
  if (label.includes('free')) return 'free';

  return 'standard';
}

/**
 * Apply visual pulse effect to a tab element
 * @param {HTMLElement} html - Sheet root element
 * @param {string} tabName - Tab name to pulse
 */
export function pulseTab(html, tabName) {
  if (!html || !tabName) return;

  try {
    const tabButton = html.querySelector(`[data-tab="${tabName}"]`);
    if (!tabButton) return;

    // Add pulse class
    tabButton.classList.add('pulse');

    // Remove after animation completes
    setTimeout(() => {
      tabButton.classList.remove('pulse');
    }, 600);
  } catch (err) {
    console.warn('[SWSE] Could not pulse tab:', err);
  }
}

/**
 * Show item selection modal
 * @param {HTMLElement} html - Sheet root
 * @param {string} itemType - Type of item to show modal for
 */
export function showItemSelectionModal(html, itemType) {
  if (!html) return;

  try {
    const modal = html.querySelector(`[data-modal="item-selection-${itemType}"]`);
    if (modal) {
      modal.classList.add('modal--visible');
    }
  } catch (err) {
    console.warn('[SWSE] Could not show modal:', err);
  }
}

/**
 * Hide item selection modal
 * @param {HTMLElement} html - Sheet root
 * @param {string} itemType - Type of item modal to hide
 */
export function hideItemSelectionModal(html, itemType) {
  if (!html) return;

  try {
    const modal = html.querySelector(`[data-modal="item-selection-${itemType}"]`);
    if (modal) {
      modal.classList.remove('modal--visible');
    }
  } catch (err) {
    console.warn('[SWSE] Could not hide modal:', err);
  }
}

/**
 * Handle force power discard animation
 * @param {Actor} actor - The character actor
 * @param {string} itemId - Force power item ID to discard
 */
export async function handleForceDiscardAnimation(actor, itemId) {
  if (!actor || !itemId) return;

  try {
    const item = actor.items.get(itemId);
    if (!item) return;

    // Trigger animation via AnimationEngine
    const { AnimationEngine } = await import("/systems/foundryvtt-swse/scripts/engine/animation-engine.js");
    if (AnimationEngine?.playDiscard) {
      await AnimationEngine.playDiscard(actor, item);
    }
  } catch (err) {
    console.warn('[SWSE] Discard animation failed:', err);
  }
}

/**
 * Handle force power recovery animation
 * @param {Actor} actor - The character actor
 * @param {string[]} itemIds - Force power item IDs to recover
 * @param {boolean} full - Whether this is a full recovery
 */
export async function handleForceRecoveryAnimation(actor, itemIds = [], full = false) {
  if (!actor || !itemIds.length) return;

  try {
    // Trigger animation via AnimationEngine
    const { AnimationEngine } = await import("/systems/foundryvtt-swse/scripts/engine/animation-engine.js");
    if (AnimationEngine?.playRecovery) {
      await AnimationEngine.playRecovery(actor, itemIds, full);
    }
  } catch (err) {
    console.warn('[SWSE] Recovery animation failed:', err);
  }
}

/**
 * Preview ability row (expand/collapse with calculations)
 * @param {HTMLElement} row - Ability row element
 */
export function previewAbilityRow(row) {
  if (!row) return;

  try {
    const collapsed = row.querySelector('.ability-collapsed');
    const expanded = row.querySelector('.ability-expanded');

    if (collapsed && expanded) {
      // Toggle visibility
      const isExpanded = collapsed.style.display === 'none';
      collapsed.style.display = isExpanded ? 'block' : 'none';
      expanded.style.display = isExpanded ? 'none' : 'block';
    }
  } catch (err) {
    console.warn('[SWSE] Could not preview ability row:', err);
  }
}

/**
 * Debounce utility: delays function execution until N ms have passed without new calls
 * Used to prevent keystroke spam in form submissions
 * @param {Function} fn - Function to debounce
 * @param {number} ms - Delay in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(fn, ms = 500) {
  let timer = null;
  return function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, ms);
  };
}
