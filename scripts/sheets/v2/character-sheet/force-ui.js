/**
 * Force suite panel UI activation for SWSEV2CharacterSheet
 *
 * Handles force power sorting, filtering, activation, and animations
 */

import { ForceExecutor } from "/systems/foundryvtt-swse/scripts/engine/force/force-executor.js";
import { LightsaberConstructionApp } from "/systems/foundryvtt-swse/scripts/applications/lightsaber/lightsaber-construction-app.js";
import { openLightsaberInterface } from "/systems/foundryvtt-swse/scripts/applications/lightsaber/lightsaber-router.js";
import { BlasterCustomizationApp } from "/systems/foundryvtt-swse/scripts/apps/blaster/blaster-customization-app.js";
import { ArmorModificationApp } from "/systems/foundryvtt-swse/scripts/apps/armor/armor-modification-app.js";
import { MeleeWeaponModificationApp } from "/systems/foundryvtt-swse/scripts/apps/weapons/melee-modification-app.js";
import { GearModificationApp } from "/systems/foundryvtt-swse/scripts/apps/gear/gear-modification-app.js";

/**
 * Handle force card discard animation
 * @param {string} itemId - The item ID of the force power
 */
function handleForceDiscardAnimation(itemId) {
  const card = document.querySelector(
    `.force-card[data-item-id="${itemId}"]`
  );
  if (!card) return;
  card.classList.add("discarding");
  setTimeout(() => card.classList.remove("discarding"), 500);
}

/**
 * Handle force card recovery animation
 * @param {string[]} itemIds - Array of item IDs to animate
 * @param {boolean} full - Whether to trigger full panel recovery burst
 */
function handleForceRecoveryAnimation(itemIds = [], full = false) {
  const panel = document.querySelector(".force-panel");
  if (!panel) return;

  if (full) {
    panel.classList.add("force-recovery-burst");
    setTimeout(() => panel.classList.remove("force-recovery-burst"), 800);
  }

  itemIds.forEach(id => {
    const card = document.querySelector(
      `.force-card[data-item-id="${id}"]`
    );
    if (!card) return;

    card.classList.add("recovering");

    setTimeout(() => {
      card.classList.remove("recovering");
      card.classList.add("recovered");
      setTimeout(() => card.classList.remove("recovered"), 400);
    }, 500);
  });
}

/**
 * Activate force panel UI listeners
 * @param {SWSEV2CharacterSheet} sheet - The character sheet instance
 * @param {HTMLElement} html - The rendered sheet element
 * @param {AbortSignal} signal - Abort signal for cleanup
 */
export function activateForceUI(sheet, html, { signal } = {}) {
  // Force sort dropdown
  html.querySelectorAll('[data-action="force-sort"]').forEach(select => {
    select.addEventListener("change", (event) => {
      const sortBy = event.target.value;
      const cardGrid = html.querySelector(".force-card-grid");
      if (!cardGrid) return;

      const cards = Array.from(cardGrid.querySelectorAll(".force-card:not(.discarded)"));
      cards.sort((a, b) => {
        const aName = a.querySelector(".force-name")?.textContent || "";
        const aTagString = a.dataset.tags || "";
        const bName = b.querySelector(".force-name")?.textContent || "";
        const bTagString = b.dataset.tags || "";

        switch (sortBy) {
          case "tag":
            return aTagString.localeCompare(bTagString);
          case "name":
          default:
            return aName.localeCompare(bName);
        }
      });

      cards.forEach(card => cardGrid.appendChild(card));
    }, { signal });
  });

  // Force tag filter buttons
  html.querySelectorAll('[data-action="force-tag-filter"]').forEach(button => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const tag = button.dataset.tag;
      if (!tag) return;

      // Toggle button active state
      button.classList.toggle("active");

      // Filter cards
      const activeFilters = Array.from(html.querySelectorAll('[data-action="force-tag-filter"].active'))
        .map(b => b.dataset.tag);

      const cards = html.querySelectorAll(".force-card:not(.discarded)");
      cards.forEach(card => {
        if (activeFilters.length === 0) {
          card.style.display = "";
        } else {
          const cardTags = (card.dataset.tags || "").split(" ");
          const matches = activeFilters.some(f => cardTags.includes(f));
          card.style.display = matches ? "" : "none";
        }
      });
    }, { signal });
  });

  // Activate force button
  html.querySelectorAll('[data-action="activate-force"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const itemId = button.dataset.itemId;
      if (!itemId) return;

      const power = sheet.actor.items.get(itemId);
      if (!power || power.type !== "force-power") return;

      // Determine if this is a recovery or activation
      const isRecovery = power.system?.discarded ?? false;

      try {
        const result = await ForceExecutor.activateForce(sheet.actor, itemId, isRecovery);
        if (result.success) {
          ui?.notifications?.info?.(`${power.name} ${isRecovery ? "recovered" : "used"}`);
        }
      } catch (err) {
        // console.error("Force activation failed:", err);
        ui?.notifications?.error?.(`Force activation failed: ${err.message}`);
      }
    }, { signal });
  });

  // Item action bar: Customize item
  html.querySelectorAll('[data-action="customize-item"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const itemId = button.dataset.itemId;
      if (!itemId) return;

      const item = sheet.actor.items.get(itemId);
      if (!item) return;

      // Route to correct customization modal based on item type / subtype
      try {
        if (item.type === "lightsaber" || (item.type === "weapon" && (item.system?.subtype === "lightsaber" || item.system?.weaponCategory === "lightsaber"))) {
          openLightsaberInterface(sheet.actor, item);
        } else {
          switch (item.type) {
            case "blaster":
              new BlasterCustomizationApp(sheet.actor, item).render(true);
              break;
            case "armor":
              new ArmorModificationApp(sheet.actor, item).render(true);
              break;
            case "weapon":
              new MeleeWeaponModificationApp(sheet.actor, item).render(true);
              break;
            case "gear":
            case "equipment":
              new GearModificationApp(sheet.actor, item).render(true);
              break;
            default:
              ui?.notifications?.warn?.(`No customization available for ${item.type}`);
          }
        }
      } catch (err) {
        // console.error("Customization modal failed:", err);
        ui?.notifications?.error?.("Failed to open customization modal");
      }
    }, { signal });
  });


  html.querySelectorAll('[data-action="construct-lightsaber"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      openLightsaberInterface(sheet.actor, null, { mode: 'construct' });
    }, { signal });
  });

  // Item action bar: Open overflow menu
  html.querySelectorAll('[data-action="open-item-menu"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const itemId = button.dataset.itemId;
      if (!itemId) return;

      const item = sheet.actor.items.get(itemId);
      if (!item) return;

      new Dialog({
        title: item.name,
        content: `<p>Select action for ${item.name}:</p>`,
        buttons: {
          edit: {
            label: "Edit",
            callback: () => item.sheet.render(true)
          },
          delete: {
            label: "Delete",
            callback: () => item.delete()
          },
          close: {
            label: "Close"
          }
        }
      }).render(true);
    }, { signal });
  });

  // NOTE: Quick attack/damage rolls via [data-action="roll-attack"] and [data-action="roll-damage"]
  // are now REMOVED (dead code). Use the working class-based handlers instead:
  // - .attack-btn (uses showRollModifiersDialog + SWSERoll.rollAttack)
  // - .damage-btn (uses showRollModifiersDialog + SWSERoll.rollDamage)
  // Both handlers create chat messages correctly via createChatMessage() or SWSEChat.postRoll()
}

// Export helper functions for external use
export { handleForceDiscardAnimation, handleForceRecoveryAnimation };
