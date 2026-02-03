/**
 * SWSE Icon Constants
 *
 * Centralized FA v13+ icon vocabulary.
 * All UI icons come from this single source of truth.
 *
 * When FontAwesome upgrades: update here once, everywhere works.
 * Prevents 142-icon-refactor disasters.
 */

/**
 * Frozen icon map — cannot be mutated.
 * Each value is a class string: "fa-solid fa-<name>"
 */
export const ICONS = Object.freeze({
  // Info & Status
  info: "fa-solid fa-circle-info",
  warning: "fa-solid fa-triangle-exclamation",
  error: "fa-solid fa-circle-xmark",
  success: "fa-solid fa-circle-check",
  question: "fa-solid fa-circle-question",

  // Navigation
  arrowRight: "fa-solid fa-arrow-right",
  arrowLeft: "fa-solid fa-arrow-left",
  chevronDown: "fa-solid fa-chevron-down",
  chevronRight: "fa-solid fa-chevron-right",

  // Actions
  close: "fa-solid fa-xmark",
  edit: "fa-solid fa-pen",
  delete: "fa-solid fa-trash",
  add: "fa-solid fa-circle-plus",
  remove: "fa-solid fa-circle-xmark",
  settings: "fa-solid fa-gears",
  refresh: "fa-solid fa-arrows-rotate",
  undo: "fa-solid fa-rotate-left",
  redo: "fa-solid fa-rotate-right",

  // UI Elements
  menu: "fa-solid fa-bars",
  search: "fa-solid fa-magnifying-glass",
  filter: "fa-solid fa-filter",
  sort: "fa-solid fa-arrow-down-arrow-up",

  // Character & Game
  character: "fa-solid fa-circle-user",
  heart: "fa-solid fa-heart",
  heartPulse: "fa-solid fa-heart-pulse",
  shield: "fa-solid fa-shield",
  sword: "fa-solid fa-sword",
  wand: "fa-solid fa-wand-magic-sparkles",
  book: "fa-solid fa-book-open",
  dice: "fa-solid fa-dice-d20",
  star: "fa-solid fa-star",

  // Items & Equipment
  box: "fa-solid fa-box",
  backpack: "fa-solid fa-backpack",
  medal: "fa-solid fa-medal",
  scroll: "fa-solid fa-scroll",
  scroll: "fa-solid fa-scroll",
  key: "fa-solid fa-key",
  lock: "fa-solid fa-lock",

  // Utility
  link: "fa-solid fa-arrow-up-right-from-square",
  download: "fa-solid fa-download",
  upload: "fa-solid fa-upload",
  copy: "fa-solid fa-copy",
  save: "fa-solid fa-floppy-disk",

  // Party & Social
  people: "fa-solid fa-people-group",
  user: "fa-solid fa-user",
  users: "fa-solid fa-users",
  handshake: "fa-solid fa-handshake",

  // Lists & Organization
  listCheck: "fa-solid fa-list-check",
  list: "fa-solid fa-list",
  table: "fa-solid fa-table",

  // Medical & Health
  medical: "fa-solid fa-kit-medical",

  // Deprecated aliases (for gradual migration only)
  // DO NOT USE IN NEW CODE — these are for legacy support only
  deprecatedTimesCircle: "fa-solid fa-circle-xmark",
  deprecatedCheckCircle: "fa-solid fa-circle-check",
  deprecatedInfoCircle: "fa-solid fa-circle-info",
  deprecatedPlusCircle: "fa-solid fa-circle-plus",
});

/**
 * Apply icon classes to a DOM element.
 *
 * Usage:
 *   const icon = document.createElement('i');
 *   applyIcon(icon, 'info');
 *
 * @param {HTMLElement} element - Target element
 * @param {string} iconKey - Key from ICONS map
 */
export function applyIcon(element, iconKey) {
  if (!element || !(element instanceof HTMLElement)) {
    console.warn(`[SWSE Icons] Invalid element passed to applyIcon:`, element);
    return;
  }

  const classes = ICONS[iconKey];
  if (!classes) {
    console.warn(`[SWSE Icons] Unknown icon key: "${iconKey}". Available keys:`, Object.keys(ICONS));
    return;
  }

  element.classList.add(...classes.split(" "));
}

/**
 * Create an icon element with a given key.
 *
 * Usage:
 *   const icon = createIcon('warning');
 *   container.appendChild(icon);
 *
 * @param {string} iconKey - Key from ICONS map
 * @returns {HTMLElement} An <i> element with icon classes
 */
export function createIcon(iconKey) {
  const icon = document.createElement('i');
  applyIcon(icon, iconKey);
  return icon;
}

/**
 * Get the raw class string for an icon (for templates).
 *
 * Usage (in Handlebars):
 *   <i class="{{getIconClass 'info'}}"></i>
 *
 * @param {string} iconKey - Key from ICONS map
 * @returns {string} Full class string or empty string if not found
 */
export function getIconClass(iconKey) {
  return ICONS[iconKey] || "";
}
