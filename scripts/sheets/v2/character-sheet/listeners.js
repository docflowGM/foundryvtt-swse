/**
 * Event listener registration for SWSEV2CharacterSheet
 *
 * Orchestrates all listener setup by delegating to the main sheet's
 * existing listener methods. Acts as the entry point for listener initialization.
 */

import { activateSkillsUI } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/skills-ui.js";
import { activateForceUI } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/force-ui.js";
import { activateAbilitiesUI } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/abilities-ui.js";
import { activateModalUI } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/modal-ui.js";
import { activateMiscUI } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/misc-ui.js";
import { activateMobileActions } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/mobile-ui.js";
import { onDrop } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/drop-ui.js";

/**
 * Register all event listeners for the character sheet
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {HTMLElement} html - The rendered sheet element
 * @param {AbortSignal} signal - Abort signal for cleanup
 */
export function registerListeners(sheet, html, { signal } = {}) {
  if (!sheet || !html) return;

  // Activate domain-specific UI modules
  activateSkillsUI(sheet, html, { signal });
  activateForceUI(sheet, html, { signal });
  activateAbilitiesUI(sheet, html, { signal });
  activateModalUI(sheet, html, { signal });
  activateMiscUI(sheet, html, { signal });
  activateMobileActions(sheet, html, { signal });

  // Bind drop event handler
  html.addEventListener("drop", (event) => {
    onDrop(sheet, event);
  }, { signal });

  // Delegate to sheet's listener activation methods
  // These methods are kept on the sheet instance for now
  // and handle all inline and specialized listeners
  sheet._activateListenersInternal(html, { signal });
}
