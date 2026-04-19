/**
 * scripts/sheets/v2/droid-sheet/listeners.js
 *
 * Live-path Droid Sheet listener wiring.
 *
 * Phase 2 transplant from `scripts/sheets/v2/droid-sheet.js#_onRender`.
 * Each helper takes (sheet, root, signal) and is called from the sheet's
 * `_onRender` in the same order it was wired previously, so initialization
 * order and behavior are preserved.
 *
 * The helpers intentionally do not introduce a second action system; they
 * still attach raw DOM listeners exactly as before. This pass is about
 * structural extraction, not behavioral change.
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { DroidBuilderApp } from "/systems/foundryvtt-swse/scripts/apps/droid-builder-app.js";
import { StockDroidConversionDialog } from "/systems/foundryvtt-swse/scripts/apps/stock-droid-conversion-dialog.js";
import { StockDroidComparisonDialog } from "/systems/foundryvtt-swse/scripts/apps/stock-droid-comparison-dialog.js";
import { SWSELevelUp } from "/systems/foundryvtt-swse/scripts/apps/swse-levelup.js";
import { SWSERoll } from "/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js";
import { rollAttack } from "/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js";
import { DropService } from "/systems/foundryvtt-swse/scripts/services/drop-service.js";

/**
 * Wire every droid-sheet listener block. Order matches the original
 * `_onRender` body so visual + behavioral parity is preserved.
 *
 * @param {object} sheet - SWSEV2DroidSheet instance
 * @param {HTMLElement} root - Sheet root element
 * @param {AbortSignal} signal - Lifecycle signal that auto-removes listeners
 */
export function wireDroidSheetListeners(sheet, root, signal) {
  wireTabHandling(sheet, root, signal);
  wireConditionTrackControls(sheet, root, signal);
  wireInitiativeControls(sheet, root, signal);
  wireProgressionFrameworkButtons(sheet, root, signal);
  wireItemOpenControls(sheet, root, signal);
  wireEquipmentSellAndDelete(sheet, root, signal);
  wireArmorEquipToggle(sheet, root, signal);
  wireFeatTalentButtons(sheet, root, signal);
  wireOwnedActorControls(sheet, root, signal);
  wireSkillRolling(sheet, root, signal);
  wireDefenseRolling(sheet, root, signal);
  wireWeaponRolling(sheet, root, signal);
  wireActionUse(sheet, root, signal);
  wireDroidSystemsEditor(sheet, root, signal);
  wireConvertStockDroid(sheet, root, signal);
  wireStockDroidProvenance(sheet, root, signal);
  wireProgressionButtons(sheet, root, signal);
  wireAbilityCardHandlers(sheet, root, signal);
  wireDragAndDrop(sheet, root, signal);
}

function wireTabHandling(sheet, root, signal) {
  for (const tabBtn of root.querySelectorAll(".sheet-tabs .item")) {
    tabBtn.addEventListener("click", (ev) => {
      const tabName = ev.currentTarget.dataset.tab;
      if (!tabName) return;

      root.querySelectorAll(".sheet-tabs .item").forEach((b) => b.classList.remove("active"));
      ev.currentTarget.classList.add("active");

      root.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      root.querySelector(`.tab[data-tab="${tabName}"]`)?.classList.add("active");
    }, { signal });
  }
}

function wireConditionTrackControls(sheet, root, signal) {
  for (const el of root.querySelectorAll(".swse-v2-condition-step")) {
    el.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const step = Number(ev.currentTarget?.dataset?.step);
      if (!Number.isFinite(step)) return;
      if (typeof sheet.actor?.setConditionTrackStep === "function") {
        await sheet.actor.setConditionTrackStep(step);
      } else if (sheet.actor) {
        await ActorEngine.updateActor(sheet.actor, { "system.conditionTrack.current": step });
      }
    }, { signal });
  }

  const improveBtn = root.querySelector(".swse-v2-condition-improve");
  if (improveBtn) {
    improveBtn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      if (typeof sheet.actor?.improveConditionTrack === "function") {
        await sheet.actor.improveConditionTrack();
      }
    }, { signal });
  }

  const worsenBtn = root.querySelector(".swse-v2-condition-worsen");
  if (worsenBtn) {
    worsenBtn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      if (typeof sheet.actor?.worsenConditionTrack === "function") {
        await sheet.actor.worsenConditionTrack();
      }
    }, { signal });
  }

  const persistentCheckbox = root.querySelector(".swse-v2-condition-persistent");
  if (persistentCheckbox) {
    persistentCheckbox.addEventListener("change", async (ev) => {
      const flag = ev.currentTarget?.checked === true;
      if (typeof sheet.actor?.setConditionTrackPersistent === "function") {
        await sheet.actor.setConditionTrackPersistent(flag);
      }
    }, { signal });
  }
}

function wireInitiativeControls(sheet, root, signal) {
  root.querySelector(".roll-initiative")?.addEventListener("click", async (ev) => {
    ev.preventDefault();
    await sheet.actor.swseRollInitiative();
  }, { signal });

  root.querySelector(".take10-initiative")?.addEventListener("click", async (ev) => {
    ev.preventDefault();
    await sheet.actor.swseTake10Initiative();
  }, { signal });
}

function wireProgressionFrameworkButtons(sheet, root, signal) {
  root.querySelector('[data-action="cmd-chargen"]')?.addEventListener("click", async (ev) => {
    ev.preventDefault();
    const { launchProgression } = await import("/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/chargen-shell.js");
    await launchProgression(sheet.actor);
  }, { signal });

  root.querySelector('[data-action="cmd-store"]')?.addEventListener("click", async (ev) => {
    ev.preventDefault();
    const { launchProgression } = await import("/systems/foundryvtt-swse/scripts/apps/progression-framework/shell/chargen-shell.js");
    await launchProgression(sheet.actor, "store");
  }, { signal });

  root.querySelector('[data-action="open-mentor"]')?.addEventListener("click", async (ev) => {
    ev.preventDefault();
    ui.notifications.info("Mentor interactions coming soon!");
  }, { signal });
}

function wireItemOpenControls(sheet, root, signal) {
  for (const el of root.querySelectorAll(".swse-v2-open-item")) {
    el.addEventListener("click", (ev) => {
      ev.preventDefault();
      const itemId = ev.currentTarget?.dataset?.itemId ?? ev.currentTarget?.dataset?.weaponId;
      const item = sheet.actor?.items?.get(itemId);
      item?.sheet?.render(true);
    }, { signal });
  }
}

function wireEquipmentSellAndDelete(sheet, root, signal) {
  for (const btn of root.querySelectorAll('[data-action="sell-item"]')) {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const itemId = ev.currentTarget?.dataset?.itemId ?? ev.currentTarget?.dataset?.weaponId;
      if (!itemId) return;
      const item = sheet.document.items.get(itemId);
      if (!item) return;

      const price = item.system.price ?? 0;
      const currentCredits = sheet.document.system.credits ?? 0;
      await sheet.document.update({ "system.credits": currentCredits + price });

      await ActorEngine.deleteEmbeddedDocuments(sheet.document, "Item", [itemId]);
      ui.notifications.info(`Sold ${item.name} for ${price} credits`);
    }, { signal });
  }

  for (const btn of root.querySelectorAll('[data-action="delete-item"]')) {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const itemId = ev.currentTarget?.dataset?.itemId ?? ev.currentTarget?.dataset?.weaponId;
      if (!itemId) return;
      await ActorEngine.deleteEmbeddedDocuments(sheet.document, "Item", [itemId]);
    }, { signal });
  }
}

function wireArmorEquipToggle(sheet, root, signal) {
  for (const checkbox of root.querySelectorAll('[data-action="toggle-equip-armor"]')) {
    checkbox.addEventListener("change", async (ev) => {
      const itemId = ev.currentTarget?.dataset?.itemId ?? ev.currentTarget?.dataset?.weaponId;
      if (!itemId) return;
      const item = sheet.document.items.get(itemId);
      if (!item) return;
      await ActorEngine.updateEmbeddedDocuments(sheet.document, "Item", [
        { _id: itemId, "system.equipped": ev.currentTarget.checked }
      ]);
    }, { signal });
  }
}

function wireFeatTalentButtons(sheet, root, signal) {
  for (const btn of root.querySelectorAll('[data-action="add-feat"]')) {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      game.swse.progression?.openFeatSelector?.(sheet.document);
    }, { signal });
  }

  for (const btn of root.querySelectorAll('[data-action="add-talent"]')) {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      game.swse.progression?.openTalentSelector?.(sheet.document);
    }, { signal });
  }
}

function wireOwnedActorControls(sheet, root, signal) {
  for (const btn of root.querySelectorAll('[data-action="remove-owned"]')) {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const actorId = ev.currentTarget?.dataset?.actorId;
      if (!actorId) return;
      const owned = sheet.document.system.ownedActors?.filter((o) => o.id !== actorId) || [];
      await sheet.document.update({ "system.ownedActors": owned });
    }, { signal });
  }

  for (const btn of root.querySelectorAll('[data-action="open-owned"]')) {
    btn.addEventListener("click", (ev) => {
      ev.preventDefault();
      const actorId = ev.currentTarget?.dataset?.actorId;
      if (!actorId) return;
      const actor = game.actors.get(actorId);
      actor?.sheet?.render(true);
    }, { signal });
  }
}

function wireSkillRolling(sheet, root, signal) {
  for (const el of root.querySelectorAll('[data-action="roll-skill"]')) {
    el.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const skillKey = ev.currentTarget?.dataset?.skill;
      if (skillKey && sheet.actor) {
        await SWSERoll.rollSkill(sheet.actor, skillKey);
      }
    }, { signal });
  }
}

function wireDefenseRolling(sheet, root, signal) {
  for (const el of root.querySelectorAll('[data-action="roll-defense"]')) {
    el.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const defenseType = ev.currentTarget?.dataset?.defense;
      if (defenseType && sheet.actor) {
        if (typeof game.swse?.rolls?.defenses?.rollDefense === "function") {
          await game.swse.rolls.defenses.rollDefense(sheet.document, defenseType);
        }
      }
    }, { signal });
  }
}

function wireWeaponRolling(sheet, root, signal) {
  for (const el of root.querySelectorAll('[data-action="roll-weapon"], [data-action="roll-weapon-attack"]')) {
    el.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const itemId = ev.currentTarget?.dataset?.itemId ?? ev.currentTarget?.dataset?.weaponId;
      if (!itemId || !sheet.actor) return;
      const item = sheet.actor.items?.get(itemId);
      if (!item) return;
      if (typeof item.roll === "function") {
        await item.roll();
      } else {
        await SWSERoll.rollAttack(sheet.actor, item, { showDialog: true });
      }
    }, { signal });
  }
}

function wireActionUse(sheet, root, signal) {
  for (const el of root.querySelectorAll(".swse-v2-use-action")) {
    el.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const actionId = ev.currentTarget?.dataset?.actionId;
      if (typeof sheet.actor?.useAction === "function") {
        await sheet.actor.useAction(actionId);
      }
    }, { signal });
  }
}

function wireDroidSystemsEditor(sheet, root, signal) {
  const editDroidBtn = root.querySelector(".edit-droid-systems");
  if (!editDroidBtn) return;
  editDroidBtn.addEventListener("click", async (ev) => {
    ev.preventDefault();
    const hasConfig = !!sheet.actor?.system?.droidSystems?.degree;
    const mode = hasConfig ? "EDIT" : "NEW";
    try {
      await DroidBuilderApp.open(sheet.actor, {
        mode,
        sourceActor: hasConfig ? sheet.actor : null,
        requireApproval: game.settings.get("foundryvtt-swse", "store.requireGMApproval") ?? false
      });
    } catch (err) {
      console.error("Failed to open droid builder:", err);
      ui.notifications.error("Failed to open droid builder.");
    }
  }, { signal });
}

function wireConvertStockDroid(sheet, root, signal) {
  const convertBtn = root.querySelector(".convert-to-custom-droid");
  if (!convertBtn) return;

  // Only show for stock droid imports (not custom droids)
  const isStockDroid = !!sheet.actor?.flags?.swse?.stockDroidImport;
  if (!isStockDroid) {
    convertBtn.style.display = "none";
    return;
  }

  convertBtn.addEventListener("click", async (ev) => {
    ev.preventDefault();
    try {
      // Import the converter and stock droid normalizer
      const { StockDroidConverter } = await import("/systems/foundryvtt-swse/scripts/domain/droids/stock-droid-converter.js");
      const { StockDroidNormalizer } = await import("/systems/foundryvtt-swse/scripts/domain/droids/stock-droid-normalizer.js");

      // Extract the normalized stock droid from saved flags
      const stockFlags = sheet.actor.flags.swse.stockDroidImport;
      const publishedTotals = stockFlags.publishedTotals || {};

      // Reconstruct a minimal normalized object from saved data
      const normalized = {
        source: {
          compendiumId: stockFlags.sourceId,
          name: stockFlags.sourceName
        },
        identity: {
          degree: sheet.actor.system.droidDegree || '',
          size: sheet.actor.system.size || 'Medium'
        },
        publishedTotals
      };

      // Generate converter seed
      const converterOutput = StockDroidConverter.convertStockDroidToBuilderSeed(normalized);

      // Open conversion dialog
      await StockDroidConversionDialog.openConversionFlow(converterOutput, sheet.actor);
    } catch (err) {
      console.error("Failed to open conversion dialog:", err);
      ui.notifications.error("Failed to open conversion dialog.");
    }
  }, { signal });
}

function wireStockDroidProvenance(sheet, root, signal) {
  // Compare button
  const compareBtn = root.querySelector('[data-action="compare-stock"]');
  if (compareBtn) {
    compareBtn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      try {
        const conversionReport = sheet.actor?.flags?.swse?.stockDroidConversionReport ||
                               sheet.actor?.flags?.swse?.stockDroidImport;

        if (!conversionReport) {
          ui.notifications.warn("No stock droid provenance found.");
          return;
        }

        await StockDroidComparisonDialog.openComparison(sheet.actor, conversionReport);
      } catch (err) {
        console.error("Failed to open comparison dialog:", err);
        ui.notifications.error("Failed to open comparison dialog.");
      }
    }, { signal });
  }

  // Review conversion details button
  const reviewBtn = root.querySelector('[data-action="view-conversion-details"]');
  if (reviewBtn) {
    reviewBtn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      try {
        const conversionReport = sheet.actor?.flags?.swse?.stockDroidConversionReport;

        if (!conversionReport) {
          ui.notifications.warn("No conversion report found.");
          return;
        }

        // Show conversion details in a simple dialog
        const content = `
          <h4>Conversion Details</h4>
          <p><strong>Source:</strong> ${conversionReport.sourceName}</p>
          <p><strong>Confidence:</strong> ${conversionReport.confidence}</p>
          <p><strong>Converted:</strong> ${new Date(conversionReport.conversionTimestamp).toLocaleString()}</p>

          <h5>Assumptions (${conversionReport.assumptions?.length || 0})</h5>
          ${conversionReport.assumptions?.length > 0
            ? `<ul>${conversionReport.assumptions.map(a => `<li>${a}</li>`).join('')}</ul>`
            : '<p><em>None</em></p>'}

          <h5>Warnings (${conversionReport.warnings?.length || 0})</h5>
          ${conversionReport.warnings?.length > 0
            ? `<ul>${conversionReport.warnings.map(w => `<li>${w}</li>`).join('')}</ul>`
            : '<p><em>None</em></p>'}
        `;

        const { SWSEDialogV2 } = await import("/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js");
        await SWSEDialogV2.wait({
          title: `${sheet.actor.name} - Conversion Report`,
          content,
          buttons: {
            ok: {
              label: 'Close',
              callback: () => { }
            }
          }
        });
      } catch (err) {
        console.error("Failed to show conversion details:", err);
        ui.notifications.error("Failed to show conversion details.");
      }
    }, { signal });
  }
}

function wireProgressionButtons(sheet, root, signal) {
  const levelUpBtn = root.querySelector('[data-action="level-up"]');
  if (!levelUpBtn) return;
  levelUpBtn.addEventListener("click", async (ev) => {
    ev.preventDefault();
    if (sheet.actor) {
      await SWSELevelUp.openEnhanced(sheet.actor);
    }
  }, { signal });
}

function wireAbilityCardHandlers(sheet, root, signal) {
  // Ability card chat button
  root.querySelectorAll(".ability-chat-btn").forEach((btn) => {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const abilityId = ev.currentTarget?.dataset?.abilityId;
      if (!abilityId) return;
      try {
        const { ActionChatEngine } = await import("/systems/foundryvtt-swse/scripts/chat/action-chat-engine.js");
        await ActionChatEngine.emote(sheet.document, `uses ability: ${abilityId}`);
      } catch (err) {
        console.error("Error posting ability chat:", err);
      }
    }, { signal });
  });

  // Ability card roll button
  root.querySelectorAll(".ability-roll-btn").forEach((btn) => {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const abilityId = ev.currentTarget?.dataset?.abilityId;
      if (!abilityId) return;
      try {
        const ability = sheet.document.items?.get(abilityId);
        if (ability) await rollAttack(sheet.document, ability);
      } catch (err) {
        console.error("Error rolling ability:", err);
      }
    }, { signal });
  });

  // Ability card use button
  root.querySelectorAll(".ability-use-btn").forEach((btn) => {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const abilityId = ev.currentTarget?.dataset?.abilityId;
      if (!abilityId) return;
      try {
        const ability = sheet.document.items?.get(abilityId);
        if (ability) {
          const { AbilityUsage } = await import("/systems/foundryvtt-swse/scripts/engine/abilities/ability-usage.js");
          await AbilityUsage.markUsed(sheet.document, abilityId);
          sheet.render();
        }
      } catch (err) {
        console.error("Error using ability:", err);
      }
    }, { signal });
  });
}

function wireDragAndDrop(sheet, root, signal) {
  DropService.bindDragFeedback(root);

  // Mirror the character sheet's lifecycle discipline: bind drag/dragover
  // with the render-scoped AbortSignal so listeners are revoked on abort
  // and cannot accumulate across re-renders if the root element is reused.
  root.addEventListener("dragover", (e) => {
    e.preventDefault();
  }, { signal });

  root.addEventListener("drop", (e) => {
    sheet._onDrop(e);
  }, { signal });
}
