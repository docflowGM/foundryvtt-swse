/**
 * Actor Sheet Integration for Level-Up UI
 * Adds a "Level Up" button to actor sheet headers.
 *
 * Characters -> SWSELevelUpEnhanced
 * NPCs        -> SWSENpcLevelUpEntry (heroic vs nonheroic)
 */

import { SWSELevelUpEnhanced } from "../apps/levelup/levelup-enhanced.js";
import { SWSENpcLevelUpEntry } from "../apps/levelup/npc-levelup-entry.js";
import { SWSELogger } from "../utils/logger.js";
import { isEpicOverrideEnabled } from "../settings/epic-override.js";

/**
 * Register the level-up sheet hooks.
 */
export function registerLevelUpSheetHooks() {
  Hooks.on("renderActorSheet", (sheet, html, data) => {
    const _isEpicBlocked = (actor) => {
      const level = Number(actor?.system?.level) || 0;
      return level >= 20 && !isEpicOverrideEnabled();
    };
    const actorType = data?.actor?.type;
    if (actorType !== "character" && actorType !== "npc") return;

    const root = html instanceof HTMLElement ? html : html?.[0];
    if (!root) return;

    const titleEl = root.querySelector(".window-title");
    const existing = root.querySelector(".swse-levelup-btn");
    if (existing) return;

    const btn = document.createElement("button");
    btn.className = "swse-levelup-btn";
    const epicBlocked = actorType === "character" ? _isEpicBlocked(sheet.actor) : false;
    btn.disabled = epicBlocked;
    btn.title = epicBlocked
      ? "Epic Override required to proceed beyond level 20 (System Settings → Epic Override)"
      : "Start level-up process";
    btn.innerHTML = epicBlocked
      ? '<i class="fas fa-level-up-alt"></i> Level Up <span class="swse-epic-required">(Epic Override required)</span>'
      : '<i class="fas fa-level-up-alt"></i> Level Up';

    btn.addEventListener("click", async (ev) => {
      if (btn.disabled) return;
      ev.preventDefault();
      try {
        if (actorType === "character") {
          new SWSELevelUpEnhanced(sheet.actor).render(true);
        } else {
          if (!game.user?.isGM) return ui.notifications.warn("GM only.");
          new SWSENpcLevelUpEntry(sheet.actor).render(true);
        }
        SWSELogger.log(`Opened level-up UI for ${sheet.actor.name}`);
      } catch (err) {
        SWSELogger.error("Failed to open level-up UI:", err);
        ui.notifications.error("Failed to open level-up UI");
      }
    });

    if (titleEl) {
      titleEl.insertAdjacentElement("afterend", btn);
    } else {
      const header = root.querySelector(".sheet-header");
      if (header) header.prepend(btn);
    }

    SWSELogger.debug(`Added level-up button to ${sheet.actor.name} sheet`);
  });

  SWSELogger.log("Level-up sheet hooks registered");
}

export default registerLevelUpSheetHooks;
