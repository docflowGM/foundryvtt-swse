/**
 * Mobile UI activation for SWSEV2CharacterSheet
 *
 * Handles mobile-specific interactions like action menu toggles
 */

import MobileMode from "/systems/foundryvtt-swse/scripts/ui/mobile-mode-manager.js";

/**
 * Activate mobile UI listeners
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {HTMLElement} html - The rendered sheet element
 * @param {AbortSignal} signal - Abort signal for cleanup
 */
export function activateMobileActions(sheet, html, { signal } = {}) {
  // Only activate on mobile mode (safely check if MobileMode exists and is enabled)
  if (!MobileMode || !MobileMode.enabled) return;

  // Add toggle listener to all .item-actions-toggle buttons
  html.addEventListener("click", (event) => {
    const toggleBtn = event.target.closest(".item-actions-toggle");
    if (!toggleBtn) return;

    event.preventDefault();
    event.stopPropagation();

    // Find the parent row/card
    const row = toggleBtn.closest("[data-item-id]") ||
                toggleBtn.closest(".item-row") ||
                toggleBtn.closest(".skill-row") ||
                toggleBtn.closest(".ability-row") ||
                toggleBtn.closest("[data-action-container]");

    if (!row) {
      console.warn("[Mobile] Could not find parent row for actions toggle", toggleBtn);
      return;
    }

    // Toggle the show-actions class
    row.classList.toggle("show-mobile-actions");
  }, { signal, capture: false });

  // Close actions menu when clicking outside (sheet-scoped)
  html.addEventListener("click", (event) => {
    // Only close if NOT clicking inside an actions menu or toggle button
    if (event.target.closest(".mobile-actions-menu")) return;
    if (event.target.closest(".item-actions-toggle")) return;

    // Close all open actions menus in this sheet
    html.querySelectorAll(".show-mobile-actions").forEach(row => {
      row.classList.remove("show-mobile-actions");
    });
  }, { signal, capture: false });

  // Global close handler (prevent stuck-open menus across page)
  // Use document listener as fallback for clicks outside html element
  const globalClose = (event) => {
    // Don't close if clicking on action menu or toggle
    if (event.target.closest(".mobile-actions-menu")) return;
    if (event.target.closest(".item-actions-toggle")) return;

    // Close any open mobile actions in the sheet
    html.querySelectorAll(".show-mobile-actions").forEach(row => {
      row.classList.remove("show-mobile-actions");
    });
  };

  // Add global listener with cleanup on signal abort
  document.addEventListener("click", globalClose, { capture: false });
  signal?.addEventListener("abort", () => {
    document.removeEventListener("click", globalClose, { capture: false });
  });
}
