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

    // Create the level-up button
    const btn = $(`
      <button class="swse-levelup-btn" title="Start level-up process">
        <i class="fas fa-level-up-alt"></i>
        Level Up
      </button>
    `);

    // Add click handler
    btn.on("click", async (ev) => {
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
    const titleEl = html.find(".window-title");
    if (titleEl.length) {
      titleEl.after(btn);
    } else {
      // Fallback: add to header if structure is different
      html.find(".sheet-header").prepend(btn);
    }

    SWSELogger.debug(`Added level-up button to ${sheet.actor.name} sheet`);
  });

  SWSELogger.log("Level-up sheet hooks registered");
}

export default registerLevelUpSheetHooks;
