/**
 * V2 Character Sheet Breakdown Card Integration
 *
 * Wires pinned breakdown cards to hardpoints on the V2 character sheet.
 * Handles click interactions, affordances, and lifecycle management.
 *
 * INTERACTION MODEL:
 * - Hover/focus: shows micro definition tooltip (help mode dependent)
 * - Click: opens pinned breakdown card (independent of help mode)
 * - Click-away, close button, or rerender: card closes
 * - Keyboard: Escape key closes card
 *
 * SUPPORTED HARDPOINTS:
 * - Defense breakdown cards (Reflex, Fortitude, Will, Flat-Footed)
 * - Weapon attack/damage breakdowns (future: Phase 8+)
 * - Derived stat breakdowns (Initiative, BAB, Grapple, DT—future)
 */

import { BreakdownCard } from "/systems/foundryvtt-swse/scripts/ui/discovery/breakdown-card.js";
import { TooltipRegistry } from "/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-registry.js";
import { DefenseTooltip } from "/systems/foundryvtt-swse/scripts/ui/defense-tooltip.js";

const BREAKDOWN_ATTR = 'data-breakdown';

/**
 * Bind breakdown card interactions to a V2 sheet.
 * Call during sheet render after HTML is mounted.
 *
 * @param {Actor} actor - The character actor
 * @param {HTMLElement} root - The sheet root element
 * @param {AbortController} abortController - For cleanup on rerender
 */
export function bindV2SheetBreakdowns(actor, root, abortController) {
  if (!(root instanceof HTMLElement)) return;
  if (!actor) return;

  // Find all breakdown-capable elements
  const elements = root.querySelectorAll(`[${BREAKDOWN_ATTR}]`);

  elements.forEach(el => {
    const breakdownKey = el.getAttribute(BREAKDOWN_ATTR);
    if (!breakdownKey) return;

    // Add click listener
    const clickHandler = (ev) => {
      ev.stopPropagation();
      _openBreakdownForKey(breakdownKey, actor, el);
    };

    el.addEventListener('click', clickHandler);
    el.style.cursor = 'pointer';

    // Add visual affordance (subtle indicator that it's clickable)
    _addBreakdownAffordance(el);

    // Cleanup on rerender (via AbortController)
    if (abortController) {
      abortController.signal.addEventListener('abort', () => {
        el.removeEventListener('click', clickHandler);
        // Card will close automatically with sheet cleanup
      });
    }
  });
}

/**
 * Open a breakdown card for a specific concept key.
 * @private
 */
function _openBreakdownForKey(breakdownKey, actor, sourceElement) {
  // Handle defense breakdowns
  if (breakdownKey.endsWith('Defense') || breakdownKey === 'FlatFooted') {
    const defenseKeyMap = {
      'ReflexDefense': 'reflex',
      'FortitudeDefense': 'fort',
      'WillDefense': 'will',
      'FlatFooted': 'flatfooted'
    };

    const defenseKey = defenseKeyMap[breakdownKey];
    if (defenseKey) {
      const structure = DefenseTooltip.getBreakdownStructure(actor, defenseKey);
      structure.metadata = {
        concept: breakdownKey,
        actor: actor,
        sourceElement: sourceElement
      };

      BreakdownCard.open(structure);
    }
  }

  // Future breakdowns can be added here:
  // else if (breakdownKey === 'Initiative') { ... }
  // else if (breakdownKey === 'BaseAttackBonus') { ... }
  // etc.
}

/**
 * Add visual affordance to breakdown-capable element.
 * Subtle indicator that element is clickable.
 * @private
 */
function _addBreakdownAffordance(el) {
  // Add a data attribute for CSS styling
  el.setAttribute('data-has-breakdown', '');

  // Optionally add a small icon/indicator
  // For now, just ensure the element looks interactive via CSS
}

/**
 * Helper: Close any open breakdown card.
 * Useful for cleanup during rerender or navigation.
 */
export function closeBreakdown() {
  BreakdownCard.close();
}

/**
 * Helper: Check if a breakdown card is currently open.
 * @returns {boolean}
 */
export function isBreakdownOpen() {
  return BreakdownCard.isOpen();
}

export default {
  bindV2SheetBreakdowns,
  closeBreakdown,
  isBreakdownOpen
};
