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
  info: 'fa-solid fa-circle-info',
  warning: 'fa-solid fa-triangle-exclamation',
  exclamation: 'fa-solid fa-triangle-exclamation',
  error: 'fa-solid fa-circle-xmark',
  success: 'fa-solid fa-circle-check',
  question: 'fa-solid fa-circle-question',
  check: 'fa-solid fa-check',

  // Navigation
  arrowRight: 'fa-solid fa-arrow-right',
  arrowLeft: 'fa-solid fa-arrow-left',
  chevronDown: 'fa-solid fa-chevron-down',
  chevronRight: 'fa-solid fa-chevron-right',

  // Actions
  close: 'fa-solid fa-xmark',
  times: 'fa-solid fa-xmark',
  edit: 'fa-solid fa-pen',
  delete: 'fa-solid fa-trash',
  trash: 'fa-solid fa-trash',
  add: 'fa-solid fa-circle-plus',
  plus: 'fa-solid fa-plus',
  remove: 'fa-solid fa-circle-xmark',
  settings: 'fa-solid fa-gears',
  cog: 'fa-solid fa-gears',
  refresh: 'fa-solid fa-arrows-rotate',
  undo: 'fa-solid fa-rotate-left',
  redo: 'fa-solid fa-rotate-right',
  save: 'fa-solid fa-floppy-disk',

  // UI Elements
  menu: 'fa-solid fa-bars',
  search: 'fa-solid fa-magnifying-glass',
  filter: 'fa-solid fa-filter',
  sort: 'fa-solid fa-arrow-down-arrow-up',
  download: 'fa-solid fa-download',
  upload: 'fa-solid fa-upload',
  copy: 'fa-solid fa-copy',
  link: 'fa-solid fa-arrow-up-right-from-square',

  // Character & Game
  character: 'fa-solid fa-circle-user',
  heart: 'fa-solid fa-heart',
  heartPulse: 'fa-solid fa-heart-pulse',
  shield: 'fa-solid fa-shield',
  shieldAlt: 'fa-solid fa-shield',
  sword: 'fa-solid fa-sword',
  wand: 'fa-solid fa-wand-magic-sparkles',
  book: 'fa-solid fa-book-open',
  dice: 'fa-solid fa-dice-d20',
  diceD6: 'fa-solid fa-dice',
  diceD20: 'fa-solid fa-dice-d20',
  star: 'fa-solid fa-star',
  crown: 'fa-solid fa-crown',
  lightning: 'fa-solid fa-bolt',
  bolt: 'fa-solid fa-bolt',
  lightbulb: 'fa-solid fa-lightbulb',

  // Items & Equipment
  box: 'fa-solid fa-box',
  boxOpen: 'fa-solid fa-box-open',
  backpack: 'fa-solid fa-backpack',
  medal: 'fa-solid fa-medal',
  scroll: 'fa-solid fa-scroll',
  key: 'fa-solid fa-key',
  lock: 'fa-solid fa-lock',
  wallet: 'fa-solid fa-wallet',
  cart: 'fa-solid fa-shopping-cart',
  cartAdd: 'fa-solid fa-cart-plus',

  // Party & Social
  people: 'fa-solid fa-people-group',
  user: 'fa-solid fa-user',
  users: 'fa-solid fa-users',
  handshake: 'fa-solid fa-handshake',
  hand: 'fa-solid fa-hand-paper',
  handPaper: 'fa-solid fa-hand-paper',
  handSparkles: 'fa-solid fa-hand-sparkles',
  fist: 'fa-solid fa-fist-raised',

  // Lists & Organization
  listCheck: 'fa-solid fa-list-check',
  list: 'fa-solid fa-list',
  table: 'fa-solid fa-table',
  gripVertical: 'fa-solid fa-grip-vertical',

  // Technology & Science
  medical: 'fa-solid fa-kit-medical',
  microchip: 'fa-solid fa-microchip',
  chip: 'fa-solid fa-microchip',
  robot: 'fa-solid fa-robot',
  shuttle: 'fa-solid fa-space-shuttle',
  dna: 'fa-solid fa-dna',
  tools: 'fa-solid fa-tools',
  target: 'fa-solid fa-crosshairs',

  // Force & Mystical
  skull: 'fa-solid fa-skull',
  moon: 'fa-solid fa-moon',
  sun: 'fa-solid fa-sun',
  fire: 'fa-solid fa-fire',
  dove: 'fa-solid fa-dove',
  adjust: 'fa-solid fa-circle-half-stroke',
  handHoldingHeart: 'fa-solid fa-hand-holding-heart',

  // Additional Navigation & Utility
  arrowUp: 'fa-solid fa-arrow-up',
  arrowDown: 'fa-solid fa-arrow-down',
  arrowsHorizontal: 'fa-solid fa-arrows-left-right',
  expandArrows: 'fa-solid fa-expand',
  eye: 'fa-solid fa-eye',
  eyeSlash: 'fa-solid fa-eye-slash',
  clock: 'fa-solid fa-clock',
  calendar: 'fa-solid fa-calendar',
  caretRight: 'fa-solid fa-caret-right',
  ban: 'fa-solid fa-ban',
  running: 'fa-solid fa-person-running',
  hand: 'fa-solid fa-hand',
  handHolding: 'fa-solid fa-hand',

  // Files & Documents
  fileExport: 'fa-solid fa-file-export',
  fileImport: 'fa-solid fa-file-import',
  fileAlt: 'fa-solid fa-file',
  file: 'fa-solid fa-file',

  // Business & Finance
  briefcase: 'fa-solid fa-briefcase',
  coins: 'fa-solid fa-coins',
  creditCard: 'fa-solid fa-credit-card',
  balanceScale: 'fa-solid fa-balance-scale',
  chartBar: 'fa-solid fa-chart-bar',
  chartLine: 'fa-solid fa-chart-line',
  chartPie: 'fa-solid fa-chart-pie',
  calculator: 'fa-solid fa-calculator',

  // Objects & Items
  bomb: 'fa-solid fa-bomb',
  cube: 'fa-solid fa-cube',
  car: 'fa-solid fa-car',
  fighterJet: 'fa-solid fa-fighter-jet',
  bed: 'fa-solid fa-bed',
  campground: 'fa-solid fa-campground',
  anchor: 'fa-solid fa-anchor',
  award: 'fa-solid fa-award',
  brain: 'fa-solid fa-brain',
  atom: 'fa-solid fa-atom',
  bug: 'fa-solid fa-bug',
  bullseye: 'fa-solid fa-bullseye',
  burst: 'fa-solid fa-burst',
  circle: 'fa-solid fa-circle',
  code: 'fa-solid fa-code',
  comment: 'fa-solid fa-comment',
  comments: 'fa-solid fa-comments',
  compass: 'fa-solid fa-compass',
  conciergeBell: 'fa-solid fa-concierge-bell',
  ear: 'fa-solid fa-ear-listen',
  broadcastTower: 'fa-solid fa-broadcast-tower',
  rulerCombined: 'fa-solid fa-ruler',

  // Additional Items & Features
  paw: 'fa-solid fa-paw',
  graduationCap: 'fa-solid fa-graduation-cap',
  temperatureHigh: 'fa-solid fa-temperature-high',
  wind: 'fa-solid fa-wind',
  wrench: 'fa-solid fa-wrench',
  magic: 'fa-solid fa-magic',
  sparkles: 'fa-solid fa-sparkles',
  sitemap: 'fa-solid fa-sitemap',
  unlockAlt: 'fa-solid fa-lock-open',
  volumeUp: 'fa-solid fa-volume-up',
  shoePrints: 'fa-solid fa-shoe-prints',
  radar: 'fa-solid fa-radar',
  shieldHalved: 'fa-solid fa-shield-halved',
  language: 'fa-solid fa-language',
  gift: 'fa-solid fa-gift',
  shoppingBag: 'fa-solid fa-shopping-bag',
  hourglassEnd: 'fa-solid fa-hourglass-end',
  globe: 'fa-solid fa-globe',
  flask: 'fa-solid fa-flask',
  projectDiagram: 'fa-solid fa-project-diagram',
  spinner: 'fa-solid fa-spinner',

  // SWSE-Specific Icons
  jedi: 'fa-solid fa-jedi',
  gun: 'fa-solid fa-gun',
  hatWizard: 'fa-solid fa-hat-wizard',
  hourglass: 'fa-solid fa-hourglass',
  laptop: 'fa-solid fa-laptop',
  layerGroup: 'fa-solid fa-layer-group',
  levelUpAlt: 'fa-solid fa-level-up',
  mapMarkedAlt: 'fa-solid fa-map-marked',
  minus: 'fa-solid fa-minus',
  plug: 'fa-solid fa-plug',
  quoteLeft: 'fa-solid fa-quote-left',
  quoteRight: 'fa-solid fa-quote-right',
  random: 'fa-solid fa-shuffle',
  road: 'fa-solid fa-road',
  rocket: 'fa-solid fa-rocket',
  route: 'fa-solid fa-route',
  signal: 'fa-solid fa-signal',
  slidersH: 'fa-solid fa-sliders',
  store: 'fa-solid fa-store',
  swords: 'fa-solid fa-swords',
  tachometerAlt: 'fa-solid fa-gauge-high',
  tag: 'fa-solid fa-tag',
  tags: 'fa-solid fa-tags',
  th: 'fa-solid fa-th',
  theaterMasks: 'fa-solid fa-masks-theater',
  toolbox: 'fa-solid fa-toolbox',
  tree: 'fa-solid fa-tree',
  trophy: 'fa-solid fa-trophy',
  unlock: 'fa-solid fa-unlock',
  yinYang: 'fa-solid fa-yin-yang',
  forward: 'fa-solid fa-forward',

  // Deprecated aliases (for gradual migration only)
  // DO NOT USE IN NEW CODE — these are for legacy support only
  deprecatedTimesCircle: 'fa-solid fa-circle-xmark',
  deprecatedCheckCircle: 'fa-solid fa-circle-check',
  deprecatedInfoCircle: 'fa-solid fa-circle-info',
  deprecatedPlusCircle: 'fa-solid fa-circle-plus'
});

/**
 * Apply icon classes to a DOM element.
 *
 * Usage:
 *   const icon = document.createElement('i');
 *   applyIcon(icon, 'info');
 *
 * @param {HTMLElement} element - Target element
 * @param {string|*} iconKey - Key from ICONS map (defensive: converts non-strings to string)
 */
export function applyIcon(element, iconKey) {
  if (!element || !(element instanceof HTMLElement)) {
    console.warn(`[SWSE Icons] Invalid element passed to applyIcon:`, element);
    return;
  }

  // Defensive: ensure iconKey is a string
  const key = typeof iconKey === 'string' ? iconKey : String(iconKey);

  const classes = ICONS[key];
  if (!classes) {
    console.warn(`[SWSE Icons] Unknown icon key: "${key}". Available keys:`, Object.keys(ICONS));
    return;
  }

  element.classList.add(...classes.split(' '));
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
 * @param {string|*} iconKey - Key from ICONS map (defensive: converts non-strings to string)
 * @returns {string} Full class string or empty string if not found
 */
export function getIconClass(iconKey) {
  // Defensive: ensure iconKey is a string
  const key = typeof iconKey === 'string' ? iconKey : String(iconKey);
  return ICONS[key] || '';
}
