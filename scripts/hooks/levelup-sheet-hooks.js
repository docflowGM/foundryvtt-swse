/**
 * Actor Sheet Integration for Level-Up UI
 * Adds a "Level Up" button to the actor sheet header
 */

import { SWSELevelUpEnhanced } from "../apps/levelup/levelup-enhanced.js";
import { SWSELogger } from "../utils/logger.js";

/**
 * Register the level-up sheet hooks
 */
export function registerLevelUpSheetHooks() {
  Hooks.on("renderActorSheet", (sheet, html, data) => {
    // Only add button to character sheets
    if (data.actor.type !== "character") return;

    // V2 API: html may be HTMLElement or jQuery - normalize to HTMLElement
    const root = html instanceof HTMLElement ? html : html[0];
    if (!root) return;

    // Create the level-up button using native DOM
    const btn = document.createElement('button');
    btn.className = 'swse-levelup-btn';
    btn.title = 'Start level-up process';
    btn.innerHTML = '<i class="fas fa-level-up-alt"></i> Level Up';

    // Add click handler
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      try {
        new SWSELevelUpEnhanced(sheet.actor).render(true);
        SWSELogger.log(`Opened level-up UI for ${sheet.actor.name}`);
      } catch (err) {
        SWSELogger.error("Failed to open level-up UI:", err);
        ui.notifications.error("Failed to open level-up UI");
      }
    });

    // Insert button into header (after title, before other buttons)
    const titleEl = root.querySelector(".window-title");
    if (titleEl) {
      titleEl.insertAdjacentElement('afterend', btn);
    } else {
      // Fallback: add to header if structure is different
      const header = root.querySelector(".sheet-header");
      if (header) header.prepend(btn);
    }

    SWSELogger.debug(`Added level-up button to ${sheet.actor.name} sheet`);
  });

  SWSELogger.log("Level-up sheet hooks registered");
}

export default registerLevelUpSheetHooks;
