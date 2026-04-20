/**
 * Event listener registration for SWSEV2CharacterSheet
 *
 * Orchestrates all listener setup by delegating to domain UI modules.
 * Acts as the entry point for listener initialization and coordinates
 * activation of specialized listener groups (inventory, combat, skills, etc).
 *
 * PHASE 8 REFACTORING:
 * This module has been refactored to replace inline listener registration
 * with coordinated calls to domain UI modules. Each domain module now
 * encapsulates and manages its own listener lifecycle.
 *
 * Domain UI modules:
 * - inventoryUI: Item equip, edit, delete, quantity management
 * - combatUI: Combat actions, attack rolls, action economy
 * - skillsUI: Skill filtering, sorting, execution
 * - forceUI: Force power management and animations
 * - abilitiesUI: Ability score editing and previews
 * - miscUI: Miscellaneous sheet interactions (help mode, etc)
 * - modalUI: Item selection modals
 * - mobileUI: Mobile device optimizations
 * - dropUI: Drag-drop item handling
 */

import { activateInventoryUI } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/inventory-ui.js";
import { activateCombatUI } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/combat-ui.js";
import { activateSkillsUI } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/skills-ui.js";
import { activateForceUI } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/force-ui.js";
import { activateAbilitiesUI } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/abilities-ui.js";
import { activateMiscUI } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/misc-ui.js";
import { activateModalUI } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/modal-ui.js";
import { activateMobileActions } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/mobile-ui.js";
import { activateDropHandling } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/drop-ui.js";

/**
 * Register all event listeners for the character sheet
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {HTMLElement} html - The rendered sheet element
 * @param {AbortSignal} signal - Abort signal for cleanup
 */
export function registerListeners(sheet, html, { signal } = {}) {
  if (!sheet || !html) return;

  // Coordinate activation of all domain UI modules
  activateInventoryUI(sheet, html, { signal });
  activateCombatUI(sheet, html, { signal });
  activateSkillsUI(sheet, html, { signal });
  activateForceUI(sheet, html, { signal });
  activateAbilitiesUI(sheet, html, { signal });
  activateMiscUI(sheet, html, { signal });
  activateModalUI(sheet, html, { signal });
  activateMobileActions(sheet, html, { signal });
  activateDropHandling(sheet, html, { signal });

  // Call internal activation for any remaining listeners not yet extracted to modules
  // TODO: Remove this call once all listeners have been extracted to domain UI modules
  sheet._activateListenersInternal(html, { signal });
}
