/**
 * Event listener registration for SWSEV2CharacterSheet
 *
 * Orchestrates all listener setup by delegating to the main sheet's
 * existing listener methods. Acts as the entry point for listener initialization.
 */

/**
 * Register all event listeners for the character sheet
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {HTMLElement} html - The rendered sheet element
 * @param {AbortSignal} signal - Abort signal for cleanup
 */
export function registerListeners(sheet, html, { signal } = {}) {
  if (!sheet || !html) return;

  // Delegate to sheet's listener activation methods
  // These methods are kept on the sheet instance for now
  // and handle all inline and specialized listeners
  sheet._activateListenersInternal(html, { signal });
}
