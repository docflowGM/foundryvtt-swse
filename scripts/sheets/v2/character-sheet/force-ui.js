/**
 * Force suite panel UI activation for SWSEV2CharacterSheet
 *
 * Handles force power sorting, filtering, activation, and animations
 */

import { ForceExecutor } from "/systems/foundryvtt-swse/scripts/engine/force/force-executor.js";
import { MetaResourceFeatResolver } from "/systems/foundryvtt-swse/scripts/engine/feats/meta-resource-feat-resolver.js";
import { openItemCustomization } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js";
import { ShellOverlayManager } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellOverlayManager.js";
import { showHolopadRollCompanion } from "/systems/foundryvtt-swse/scripts/ui/shell/roll-companion.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { createSafeEmbeddedItem } from "/systems/foundryvtt-swse/scripts/engine/items/safe-item-factory.js";
import { mutateAndRepaint } from "/systems/foundryvtt-swse/scripts/ui/shell/mutate-and-repaint.js";
import { promptForcePowerRollOptions, promptForceRegimenRollOptions } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/force-roll-dialog.js";
import { ForceRegimenExecutor } from "/systems/foundryvtt-swse/scripts/engine/force/force-regimen-executor.js";

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

  // Add a custom Force power as a real force-power Item, never as generic gear.
  html.querySelectorAll('[data-action="add-force-power"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        const doc = await createSafeEmbeddedItem(sheet.actor, 'force-power', { source: 'force-panel-add-force-power' });
        if (doc?.sheet) {
          doc.sheet._entityDialogMode = 'create';
          doc.sheet.render(true);
        }
        sheet.render?.(false);
      } catch (err) {
        ui?.notifications?.error?.(`Failed to create Force Power: ${err.message}`);
      }
    }, { signal });
  });

  // Add a custom starship maneuver as a real maneuver Item.
  html.querySelectorAll('[data-action="add-starship-maneuver"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        const doc = await createSafeEmbeddedItem(sheet.actor, 'maneuver', { source: 'starship-suite-add-maneuver' });
        if (doc?.sheet) {
          doc.sheet._entityDialogMode = 'create';
          doc.sheet.render(true);
        }
        sheet.render?.(false);
      } catch (err) {
        ui?.notifications?.error?.(`Failed to create Starship Maneuver: ${err.message}`);
      }
    }, { signal });
  });

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

  // Forceful Recovery: choose one expended Force power after Second Wind.
  html.querySelectorAll('[data-action="forceful-recovery-recover"]').forEach(button => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      const itemId = button.dataset.itemId;
      if (!itemId) return;

      try {
        const result = await MetaResourceFeatResolver.recoverForcefulRecoveryPower(sheet.actor, itemId);
        if (result?.success) {
          ui?.notifications?.info?.(`${result.powerName || 'Force power'} recovered through Forceful Recovery.`);
          handleForceRecoveryAnimation([itemId], false);
          sheet.render?.(false);
        } else {
          ui?.notifications?.warn?.(result?.reason || 'Forceful Recovery could not recover that power.');
        }
      } catch (err) {
        ui?.notifications?.error?.(`Forceful Recovery failed: ${err.message}`);
      }
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
        const rollOptions = isRecovery
          ? null
          : await promptForcePowerRollOptions({ actor: sheet.actor, power, sourceElement: button });
        if (!isRecovery && !rollOptions) return;

        const result = await mutateAndRepaint(sheet, () => (
          isRecovery
            ? ForceExecutor.activateForce(sheet.actor, itemId, true)
            : ForceExecutor.executeForcePower(sheet.actor, itemId, rollOptions)
        ), {
          reason: isRecovery ? 'force-power-recover' : 'force-power-use',
          surfaceId: sheet._shellSurface ?? 'sheet',
          preserveUi: true
        });
        if (result.success) {
          ui?.notifications?.info?.(`${power.name} ${isRecovery ? "recovered" : "used"}`);
          showHolopadRollCompanion(button, result, {
            kind: 'force',
            title: isRecovery ? 'Force Recovered' : 'Force Used',
            itemName: power.name,
            actorName: sheet.actor?.name,
            actor: sheet.actor,
            sourceItem: power,
            forceDescriptor: power.system?.descriptor ?? power.system?.descriptors ?? power.system?.tags,
          });
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

      try {
        openItemCustomization(sheet.actor, item);
      } catch (err) {
        ui?.notifications?.error?.("Failed to open customization modal");
      }
    }, { signal });
  });


  html.querySelectorAll('[data-action="construct-lightsaber"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      openItemCustomization(sheet.actor, null, { initialCategory: 'lightsaber', mode: 'construct' });
    }, { signal });
  });

  // ── Force Suite handlers ───────────────────────────────────────────────────

  // Force Suite: flip card front/back
  html.querySelectorAll('[data-action="force-suite-flip-card"]').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const card = button.closest('.fcard');
      card?.classList.toggle('flipped');
    }, { signal });
  });

  // Force Suite: Force Point boost toggle (visual only, no actor mutation)
  html.querySelectorAll('[data-action="force-suite-toggle-fp-boost"]').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (button.disabled) return;
      button.classList.toggle('on');
    }, { signal });
  });

  // Force Suite: recover all (rest or natural 20)
  html.querySelectorAll('[data-action="force-suite-recover-all"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        const result = await ForceExecutor.recoverForcePowers(sheet.actor);
        if (result?.success) {
          ui?.notifications?.info?.('All spent Force powers recovered.');
          sheet.render?.(false);
        } else {
          ui?.notifications?.warn?.(result?.error || 'No spent Force powers to recover.');
        }
      } catch (err) {
        ui?.notifications?.error?.(`Force recovery failed: ${err.message}`);
      }
    }, { signal });
  });

  // Force Suite: enter pick-recovery mode (Spend Force Point)
  html.querySelectorAll('[data-action="force-suite-pick-recovery"]').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const root = button.closest('[data-force-suite-tab]');
      const hasDiscard = !!root?.querySelector('[data-force-discard-pile] [data-action="force-suite-recover-one"]');
      if (!hasDiscard) {
        ui?.notifications?.info?.('Discard pile is empty.');
        return;
      }
      root?.classList.toggle('is-picking-recovery');
      button.classList.toggle('sel');
    }, { signal });
  });

  // Force Suite: recover one power from discard pile
  html.querySelectorAll('[data-action="force-suite-recover-one"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const itemId = button.dataset.itemId;
      if (!itemId) return;

      const root = button.closest('[data-force-suite-tab]');
      const spendingForcePoint = root?.classList.contains('is-picking-recovery');

      try {
        const result = await ForceExecutor.recoverForcePowers(sheet.actor, [itemId]);
        if (result?.success) {
          const spentMsg = spendingForcePoint ? ' (Force Point spent)' : '';
          ui?.notifications?.info?.(`Force power recovered${spentMsg}.`);
          root?.classList.remove('is-picking-recovery');
          sheet.render?.(false);
        } else {
          ui?.notifications?.warn?.(result?.error || 'Could not recover that Force power.');
        }
      } catch (err) {
        ui?.notifications?.error?.(`Force recovery failed: ${err.message}`);
      }
    }, { signal });
  });


  // Force Regimens: roll UTF, resolve the DC tier, then move the card to active/discard lane.
  html.querySelectorAll('[data-action="use-force-regimen"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const itemId = button.dataset.itemId;
      if (!itemId) return;
      const regimen = sheet.actor.items.get(itemId);
      if (!regimen || regimen.type !== 'force-regimen') return;
      try {
        const rollOptions = await promptForceRegimenRollOptions({ actor: sheet.actor, regimen, sourceElement: button });
        if (!rollOptions) return;
        const result = await mutateAndRepaint(sheet, () => ForceRegimenExecutor.executeRegimen(sheet.actor, itemId, rollOptions), {
          reason: 'force-regimen-use',
          surfaceId: sheet._shellSurface ?? 'sheet',
          preserveUi: true
        });
        if (result?.success) {
          ui?.notifications?.info?.(`${result.regimenName || 'Force Regimen'} is active until long rest.`);
          showHolopadRollCompanion(button, result, {
            kind: 'force-regimen',
            title: 'Force Regimen',
            itemName: regimen.name,
            actorName: sheet.actor?.name,
            actor: sheet.actor,
            sourceItem: regimen,
            forceDescriptor: regimen.system?.category === 'lightsaber-training' ? 'form' : 'light',
          });
          sheet.render?.(false);
        } else {
          ui?.notifications?.warn?.(result?.error || 'Force Regimen could not be used.');
        }
      } catch (err) {
        ui?.notifications?.error?.(`Force Regimen failed: ${err.message}`);
      }
    }, { signal });
  });

  // ── Starship Maneuver Suite handlers ───────────────────────────────────────

  html.querySelectorAll('[data-action="starship-suite-flip-card"]').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const card = button.closest('.fcard');
      card?.classList.toggle('flipped');
    }, { signal });
  });

  html.querySelectorAll('[data-action="activate-starship-maneuver"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const itemId = button.dataset.itemId;
      if (!itemId) return;
      const maneuver = sheet.actor.items.get(itemId);
      if (!maneuver || maneuver.type !== 'maneuver') return;
      if (maneuver.system?.spent === true) {
        ui?.notifications?.info?.(`${maneuver.name} is already spent.`);
        return;
      }
      try {
        await ActorEngine.updateEmbeddedDocuments(sheet.actor, 'Item', [{ _id: itemId, 'system.spent': true }], { source: 'starship-suite-use' });
        ui?.notifications?.info?.(`${maneuver.name} spent.`);
        showHolopadRollCompanion(button, { success: true, spent: true }, {
          kind: 'starship-maneuver',
          title: 'Maneuver Used',
          itemName: maneuver.name,
          actorName: sheet.actor?.name,
          actor: sheet.actor,
          sourceItem: maneuver,
        });
        sheet.render?.(false);
      } catch (err) {
        ui?.notifications?.error?.(`Starship maneuver use failed: ${err.message}`);
      }
    }, { signal });
  });

  html.querySelectorAll('[data-action="starship-suite-recover-all"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const spent = sheet.actor.items.filter((item) => item.type === 'maneuver' && item.system?.spent === true);
      if (!spent.length) {
        ui?.notifications?.info?.('No spent Starship Maneuvers to recover.');
        return;
      }
      try {
        await ActorEngine.updateEmbeddedDocuments(sheet.actor, 'Item', spent.map((item) => ({ _id: item.id, 'system.spent': false })), { source: 'starship-suite-recover-all' });
        ui?.notifications?.info?.('All spent Starship Maneuvers recovered.');
        sheet.render?.(false);
      } catch (err) {
        ui?.notifications?.error?.(`Starship maneuver recovery failed: ${err.message}`);
      }
    }, { signal });
  });

  html.querySelectorAll('[data-action="starship-suite-pick-recovery"]').forEach(button => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const root = button.closest('[data-starship-suite-tab]');
      const hasSpent = !!root?.querySelector('[data-starship-discard-pile] [data-action="starship-suite-recover-one"]');
      if (!hasSpent) {
        ui?.notifications?.info?.('Spent maneuver pile is empty.');
        return;
      }
      root?.classList.toggle('is-picking-recovery');
      button.classList.toggle('sel');
    }, { signal });
  });

  html.querySelectorAll('[data-action="starship-suite-recover-one"]').forEach(button => {
    button.addEventListener('click', async (event) => {
      event.preventDefault();
      const itemId = button.dataset.itemId;
      if (!itemId) return;
      const maneuver = sheet.actor.items.get(itemId);
      if (!maneuver || maneuver.type !== 'maneuver') return;
      const root = button.closest('[data-starship-suite-tab]');
      const spendingForcePoint = root?.classList.contains('is-picking-recovery');
      try {
        await ActorEngine.updateEmbeddedDocuments(sheet.actor, 'Item', [{ _id: itemId, 'system.spent': false }], { source: 'starship-suite-recover-one' });
        ui?.notifications?.info?.(`${maneuver.name} recovered${spendingForcePoint ? ' (Force Point spent)' : ''}.`);
        root?.classList.remove('is-picking-recovery');
        sheet.render?.(false);
      } catch (err) {
        ui?.notifications?.error?.(`Starship maneuver recovery failed: ${err.message}`);
      }
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
            callback: () => ActorEngine.deleteEmbeddedDocuments(sheet.actor, 'Item', [item.id])
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
