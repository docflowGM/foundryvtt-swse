/**
 * Event listener registration for SWSEV2CharacterSheet
 *
 * Character sheet listener wiring is currently owned by the sheet instance's
 * legacy-but-authoritative _activateListenersInternal() method.
 *
 * Previous Phase 8 extraction also activated domain modules here, which caused
 * duplicate click/change handlers after _activateListenersInternal() ran.
 * The duplicates were responsible for multi-create item bugs, double skill
 * rolls, duplicate dialogs, and repeated action execution.
 */

/**
 * Register all event listeners for the character sheet
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {HTMLElement} html - The rendered sheet element
 * @param {AbortSignal} signal - Abort signal for cleanup
 */
export function registerListeners(sheet, html, { signal } = {}) {
  if (!sheet || !html) return;
  sheet._activateListenersInternal(html, { signal });
}
