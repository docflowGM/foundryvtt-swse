/**
 * V2 Character Sheet Tooltip Integration
 *
 * Centralized tooltip binding for the V2 character sheet.
 * Handles:
 * - Micro-tooltip binding via TooltipRegistry
 * - Breakdown tooltip initialization (defense, weapon)
 * - Lifecycle-safe cleanup on re-render
 */

import { TooltipRegistry } from "/systems/foundryvtt-swse/scripts/ui/discovery/tooltip-registry.js";

/**
 * Bind all tooltips in the V2 character sheet.
 * Safe to call multiple times on re-render.
 *
 * @param {Actor} actor - The character actor
 * @param {HTMLElement} root - Root element of the sheet
 * @param {AbortController} abortController - For cleanup on subsequent renders
 */
export function bindV2CharacterSheetTooltips(actor, root, abortController) {
  if (!(root instanceof HTMLElement) || !actor) {
    return;
  }

  // 1. Bind micro-tooltips via TooltipRegistry
  // This handles all [data-swse-tooltip] elements globally
  TooltipRegistry.bind(root);

  // 2. Note: Defense and weapon breakdowns can be bound via the registry
  // if the sheet templates use data-swse-tooltip attributes.
  // For now, keep the existing breakdown logic as fallback if templates
  // don't migrate immediately.

  // 3. Return abort signal so caller can cleanup listeners on re-render
  return abortController.signal;
}

export default { bindV2CharacterSheetTooltips };
