/**
 * Callout Manager
 *
 * Shows one-time, dismissible hint callouts anchored to UI elements.
 * Each callout appears once per user, persisted via DiscoveryUserState.
 */

import { DiscoveryUserState } from './user-state.js';

const CALLOUT_CLASS = 'swse-discovery-callout';
const SYSTEM_ID = 'foundryvtt-swse';

/**
 * Callout definitions.
 * selector: CSS selector to anchor the callout to
 * role: 'player' | 'gm' | 'both'
 * i18n keys derived from id: SWSE.Discovery.Callout.<id>.Title / .Body
 */
const CALLOUT_DEFS = [
  {
    id: 'actionPaletteFirstOpen',
    selector: '.swse-action-palette, .action-palette-toggle',
    role: 'both'
  },
  {
    id: 'tacticalOverlayFirstOpen',
    selector: '.tactical-overlay-toggle, [data-control="tactical-overlay"]',
    role: 'gm'
  },
  {
    id: 'mentorTranslationFirst',
    selector: '.mentor-dialogue, .mentor-translation',
    role: 'both'
  },
  {
    id: 'gmSuggestionPanelFirst',
    selector: '.gm-suggestion-panel, .suggestion-panel',
    role: 'gm'
  },
  {
    id: 'chargenNarrativeFirst',
    selector: '.chargen-narrative-mode, .chargen-mode-select',
    role: 'both'
  }
];

let _activeCallout = null;

function _i18n(calloutId, suffix) {
  return game.i18n.localize(`SWSE.Discovery.Callout.${calloutId}.${suffix}`);
}

function _isRoleMatch(role) {
  if (role === 'both') {return true;}
  if (role === 'gm') {return game.user.isGM;}
  return !game.user.isGM;
}

function _dismissActive() {
  if (_activeCallout) {
    _activeCallout.el.remove();
    DiscoveryUserState.dismissCallout(_activeCallout.id);
    _activeCallout = null;
  }
}

/**
 * Create and show a callout anchored to an element.
 * @param {HTMLElement} anchor
 * @param {object} def - callout definition
 */
function _showCallout(anchor, def) {
  // Dismiss any existing callout first
  _dismissActive();

  const el = document.createElement('div');
  el.classList.add(CALLOUT_CLASS);
  el.setAttribute('role', 'status');
  el.setAttribute('aria-live', 'polite');

  const title = _i18n(def.id, 'Title');
  const body = _i18n(def.id, 'Body');

  el.innerHTML = `
    <div class="${CALLOUT_CLASS}__title">${title}</div>
    <div class="${CALLOUT_CLASS}__body">${body}</div>
    <button class="${CALLOUT_CLASS}__dismiss" type="button">${game.i18n.localize('SWSE.Discovery.Callout.Dismiss')}</button>
  `;

  const btn = el.querySelector(`.${CALLOUT_CLASS}__dismiss`);
  btn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    _dismissActive();
  });

  document.body.appendChild(el);
  _activeCallout = { el, id: def.id };

  // Position near anchor
  const rect = anchor.getBoundingClientRect();
  const tipRect = el.getBoundingClientRect();
  let top = rect.bottom + 10;
  let left = rect.left + (rect.width / 2) - (tipRect.width / 2);

  // Flip above if no room below
  if (top + tipRect.height > window.innerHeight - 4) {
    top = rect.top - tipRect.height - 10;
  }
  left = Math.max(4, Math.min(left, window.innerWidth - tipRect.width - 4));

  el.style.top = `${top}px`;
  el.style.left = `${left}px`;
}

export const CalloutManager = {

  /**
   * Attempt to show relevant callouts within a rendered root element.
   * Only shows the first matching un-dismissed callout.
   * @param {HTMLElement} root - rendered container
   */
  evaluate(root) {
    if (!(root instanceof HTMLElement)) {return;}

    // Check setting
    try {
      if (game.settings.get(SYSTEM_ID, 'disableCallouts')) {return;}
    } catch { /* setting not registered yet, continue */ }

    for (const def of CALLOUT_DEFS) {
      if (!_isRoleMatch(def.role)) {continue;}
      if (DiscoveryUserState.isCalloutDismissed(def.id)) {continue;}

      const anchor = root.querySelector(def.selector) || document.querySelector(def.selector);
      if (anchor) {
        _showCallout(anchor, def);
        return; // only one callout at a time
      }
    }
  },

  /**
   * Manually trigger a specific callout by ID.
   * Useful for integration hooks (e.g. first time opening Action Palette).
   * @param {string} calloutId
   */
  trigger(calloutId) {
    try {
      if (game.settings.get(SYSTEM_ID, 'disableCallouts')) {return;}
    } catch { /* continue */ }

    if (DiscoveryUserState.isCalloutDismissed(calloutId)) {return;}

    const def = CALLOUT_DEFS.find(d => d.id === calloutId);
    if (!def) {return;}
    if (!_isRoleMatch(def.role)) {return;}

    const anchor = document.querySelector(def.selector);
    if (anchor) {
      _showCallout(anchor, def);
    }
  },

  /** Dismiss any visible callout. */
  dismiss: _dismissActive,

  /** All callout IDs (for debug/enumeration). */
  get ids() { return CALLOUT_DEFS.map(d => d.id); },

  /**
   * Register a new callout definition at runtime.
   * @param {object} def - { id, selector, role }
   */
  register(def) {
    if (!def?.id || !def?.selector) {return;}
    if (CALLOUT_DEFS.some(d => d.id === def.id)) {return;}
    CALLOUT_DEFS.push({ role: 'both', ...def });
  }
};
