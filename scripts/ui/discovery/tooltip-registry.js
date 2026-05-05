/**
 * Tooltip Registry & Renderer
 *
 * Primary: Maps string IDs (data-swse-tooltip) to localization keys via the canonical glossary.
 * Secondary: Attaches hover/focus listeners to render positioned tooltips.
 * Tertiary: Manages breakdown providers for complex math tooltips (separated from definitions).
 *
 * ARCHITECTURE NOTES:
 * - The registry is the discovery/binding engine, not the content home.
 * - All tooltip content metadata lives in tooltip-glossary.js
 * - Definitions and breakdowns are structurally separate.
 * - Tiers are used for organization, not yet for behavior control.
 * - All hardpoints are intentional and curated (no auto-generation).
 */

import { TooltipGlossary } from '/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-glossary.js';

const ATTR = 'data-swse-tooltip';
const ATTR_KEY = 'data-swse-tooltip-key';
const TOOLTIP_CLASS = 'swse-discovery-tooltip';
const SYSTEM_ID = 'foundryvtt-swse';

let _activeTooltip = null;
let _breakdownProviders = {}; // Keyed by semantic concept (e.g. 'ReflexDefenseBreakdown', 'WeaponAttackBreakdown')
let _helpModeActive = false;
let _hoverTimer = null; // Timer for delayed tooltip appearance
let _hoveredElement = null; // Track which element is currently hovered

/**
 * Build the internal tooltip definitions registry from the canonical glossary.
 * Keys: semantic keys from the glossary (e.g., 'HitPoints', 'ReflexDefense')
 * Values: i18n key prefixes (e.g., 'SWSE.Discovery.Tooltip.HitPoints')
 *
 * This dynamic build ensures the registry always stays in sync with the glossary.
 */
function buildTooltipDefsFromGlossary() {
  const defs = {};
  for (const [key, entry] of Object.entries(TooltipGlossary)) {
    defs[key] = entry.i18nPrefix;
  }
  return defs;
}

const TOOLTIP_DEFS = buildTooltipDefsFromGlossary();

/**
 * Resolve a tooltip definition to localized title + body.
 * @param {string} id - tooltip key
 * @returns {{title: string, body: string} | null}
 */
function resolve(id) {
  const entry = TooltipGlossary[id] || null;
  const prefix = TOOLTIP_DEFS[id] || entry?.i18nPrefix;
  if (!prefix && !entry) {return null;}

  const titleKey = prefix ? `${prefix}.Title` : null;
  const bodyKey = prefix ? `${prefix}.Body` : null;
  const title = titleKey && game?.i18n?.has?.(titleKey)
    ? game.i18n.localize(titleKey)
    : (entry?.label || id);
  const body = bodyKey && game?.i18n?.has?.(bodyKey)
    ? game.i18n.localize(bodyKey)
    : (entry?.long || entry?.short || '');

  return { title, body };
}

/** Remove any active tooltip from the DOM. */
function hideTooltip() {
  if (_activeTooltip) {
    _activeTooltip.remove();
    _activeTooltip = null;
  }
}

/**
 * Create and position a tooltip element near the anchor.
 * @param {HTMLElement} anchor
 * @param {{title: string, body: string}} content
 */
function showTooltip(anchor, content) {
  hideTooltip();

  const el = document.createElement('div');
  el.classList.add(TOOLTIP_CLASS);
  el.setAttribute('role', 'tooltip');
  el.dataset.theme = document.documentElement?.dataset?.theme || '';
  el.dataset.motionStyle = document.documentElement?.dataset?.motionStyle || '';

  const titleEl = document.createElement('div');
  titleEl.classList.add(`${TOOLTIP_CLASS}__title`);
  titleEl.textContent = content.title;
  el.appendChild(titleEl);

  const bodyEl = document.createElement('div');
  bodyEl.classList.add(`${TOOLTIP_CLASS}__body`);
  bodyEl.textContent = content.body;
  el.appendChild(bodyEl);

  document.body.appendChild(el);
  _activeTooltip = el;

  // Position
  const rect = anchor.getBoundingClientRect();
  const tipRect = el.getBoundingClientRect();
  let top = rect.top - tipRect.height - 8;
  let left = rect.left + (rect.width / 2) - (tipRect.width / 2);

  // Flip below if no room above
  if (top < 4) {
    top = rect.bottom + 8;
    el.classList.add(`${TOOLTIP_CLASS}--below`);
  }
  // Clamp horizontally
  left = Math.max(4, Math.min(left, window.innerWidth - tipRect.width - 4));

  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
}

export const TooltipRegistry = {

  /** All registered tooltip IDs (for debugging / enumeration) */
  get ids() { return Object.keys(TOOLTIP_DEFS); },

  /**
   * Get the canonical glossary.
   * Useful for introspection, tier-based filtering, or category browsing.
   * @returns {Object} - The full TooltipGlossary
   */
  get glossary() { return TooltipGlossary; },

  /**
   * Get a glossary entry by semantic key.
   * Includes metadata: tier, category, related concepts, etc.
   * @param {string} key - E.g., 'HitPoints', 'ReflexDefense'
   * @returns {Object|null} - The full entry object, or null if not found
   */
  getEntry(key) {
    return TooltipGlossary[key] || null;
  },

  /**
   * Scan a root element for [data-swse-tooltip] and attach listeners.
   * Safe to call multiple times on re-render (idempotent via marker).
   * @param {HTMLElement} root
   */
  bind(root) {
    if (!(root instanceof HTMLElement)) {return;}
    const candidates = root.matches?.(`[${ATTR}], [${ATTR_KEY}]`)
      ? [root, ...root.querySelectorAll(`[${ATTR}], [${ATTR_KEY}]`)]
      : [...root.querySelectorAll(`[${ATTR}], [${ATTR_KEY}]`)];
    const els = [...new Set(candidates)];
    for (const el of els) {
      if (el._swseTooltipBound) {continue;}
      el._swseTooltipBound = true;

      // Ensure keyboard focusable
      if (!el.getAttribute('tabindex')) {
        el.setAttribute('tabindex', '0');
      }

      el.addEventListener('mouseenter', _onEnter);
      el.addEventListener('mouseleave', _onLeave);
      el.addEventListener('focus', _onEnter);
      el.addEventListener('blur', hideTooltip);
    }
  },

  /** Remove all tooltips (cleanup). */
  hide: hideTooltip,

  /**
   * Register a custom tooltip at runtime.
   * @param {string} id
   * @param {string} i18nPrefix - e.g. 'SWSE.Discovery.Tooltip.MyThing'
   */
  register(id, i18nPrefix) {
    TOOLTIP_DEFS[id] = i18nPrefix;
  },

  /**
   * Register a direct glossary-style tooltip without adding i18n immediately.
   * @param {string} id
   * @param {{label:string, short?:string, long?:string, category?:string, tier?:string}} entry
   */
  registerEntry(id, entry) {
    if (!id || !entry) {return;}
    TooltipGlossary[id] = { key: id, tier: 'tier2', category: 'runtime', ...entry };
    if (entry.i18nPrefix) { TOOLTIP_DEFS[id] = entry.i18nPrefix; }
  },

  /**
   * Register a breakdown provider for a semantic concept.
   * Allows complex tooltips (like defense/weapon breakdowns) to be keyed by stable semantics.
   * @param {string} key - semantic concept key (e.g. 'ReflexDefense', 'WeaponAttack')
   * @param {Function} provider - async function(actor, targetElement) => {content: {title, body}}
   */
  registerBreakdownProvider(key, provider) {
    _breakdownProviders[key] = provider;
  },

  /**
   * Get a breakdown provider by key.
   * @param {string} key
   * @returns {Function|null}
   */
  getBreakdownProvider(key) {
    return _breakdownProviders[key] || null;
  },

  /**
   * Toggle help mode (affects which tooltips are visible).
   * @param {boolean} active
   */
  setHelpMode(active) {
    _helpModeActive = !!active;
  },

  /**
   * Check if help mode is active.
   * @returns {boolean}
   */
  isHelpMode() {
    return _helpModeActive;
  }
};

function _onEnter(ev) {
  // Clear any existing hover timer
  if (_hoverTimer) {
    clearTimeout(_hoverTimer);
    _hoverTimer = null;
  }

  const el = ev.currentTarget;
  const id = el.getAttribute(ATTR) || el.getAttribute(ATTR_KEY);
  if (!id) {return;}

  // Get the hover delay from CSS variable or default
  const computedStyle = window.getComputedStyle(el);
  const delayStr = computedStyle.getPropertyValue('--tooltip-delay').trim();
  const delay = delayStr ? parseInt(delayStr) : 250;

  _hoveredElement = el;

  // Set timer to show tooltip after delay
  _hoverTimer = setTimeout(() => {
    // Check that we're still hovering over the same element
    if (_hoveredElement === el) {
      const content = resolve(id);
      if (content) {
        showTooltip(el, content);
      }
    }
  }, delay);
}

function _onLeave(ev) {
  // Clear the hover timer if user leaves before delay expires
  if (_hoverTimer) {
    clearTimeout(_hoverTimer);
    _hoverTimer = null;
  }
  _hoveredElement = null;
  hideTooltip();
}


let _tooltipGlobalListenersBound = false;
export function bindTooltipGlobalDismissals() {
  if (_tooltipGlobalListenersBound) {return;}
  _tooltipGlobalListenersBound = true;
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { hideTooltip(); }
  });
  document.addEventListener('pointerdown', ev => {
    if (_activeTooltip && !ev.target?.closest?.(`[${ATTR}], [${ATTR_KEY}], .${TOOLTIP_CLASS}`)) {
      hideTooltip();
    }
  }, { capture: true });
}
