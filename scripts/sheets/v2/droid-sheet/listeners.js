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
import { DroidCustomizationRouter } from "/systems/foundryvtt-swse/scripts/applications/droid/droid-customization-router.js";
import { DroidBuilderApp } from "/systems/foundryvtt-swse/scripts/apps/droid-builder-app.js";
import { StockDroidConversionDialog } from "/systems/foundryvtt-swse/scripts/apps/stock-droid-conversion-dialog.js";
import { StockDroidComparisonDialog } from "/systems/foundryvtt-swse/scripts/apps/stock-droid-comparison-dialog.js";
import { SWSELevelUp } from "/systems/foundryvtt-swse/scripts/apps/swse-levelup.js";
import { SWSERoll } from "/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js";
import { rollAttack } from "/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js";
import { DropService } from "/systems/foundryvtt-swse/scripts/services/drop-service.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { launchProgression } from "/systems/foundryvtt-swse/scripts/apps/progression-framework/progression-entry.js";
import { SWSEStore } from "/systems/foundryvtt-swse/scripts/apps/store/store-main.js";
import { coerceSingleFieldValue } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/form.js";
import { buildVirtualUnarmedWeapon } from "/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js";
import { getDroidPartDefinition, getSelfDestructBurstSquares, getSelfDestructDamage, hydrateDroidPart } from "/systems/foundryvtt-swse/scripts/data/droid-part-schema.js";

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
  wireNamedFieldPersistence(sheet, root, signal);
  wireConditionTrackControls(sheet, root, signal);
  wireInitiativeControls(sheet, root, signal);
  wireProgressionFrameworkButtons(sheet, root, signal);
  wireDroidCustomization(sheet, root, signal);
  wireItemOpenControls(sheet, root, signal);
  wireEquipmentSellAndDelete(sheet, root, signal);
  wireArmorEquipToggle(sheet, root, signal);
  wireFeatTalentButtons(sheet, root, signal);
  wireOwnedActorControls(sheet, root, signal);
  wireSkillRolling(sheet, root, signal);
  wireDefenseRolling(sheet, root, signal);
  wireWeaponRolling(sheet, root, signal);
  wireUnarmedAttack(sheet, root, signal);
  wireDroidPartUse(sheet, root, signal);
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


function wireNamedFieldPersistence(sheet, root, signal) {
  root.addEventListener('change', async (ev) => {
    const field = ev.target instanceof HTMLElement
      ? ev.target.closest('input[name], textarea[name], select[name]')
      : null;
    if (!(field instanceof HTMLElement)) return;
    if (!field.name || field.hasAttribute('data-action') || field.disabled || field.hasAttribute('readonly')) return;
    if (field.name.startsWith('items.')) return;

    const rawValue = field.matches('input[type="checkbox"]') ? field.checked : field.value;
    const update = {
      [field.name]: coerceSingleFieldValue(field.name, rawValue, field)
    };

    try {
      await ActorEngine.updateActor(sheet.actor, update, {
        source: 'droid-sheet-direct-field',
        meta: { guardKey: `droid-field:${field.name}` }
      });
    } catch (err) {
      console.error('Droid field update failed:', err);
      ui.notifications.error(`Failed to update field: ${err.message}`);
    }
  }, { signal });
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
    await launchProgression(sheet.actor);
  }, { signal });

  root.querySelector('[data-action="cmd-store"]')?.addEventListener("click", async (ev) => {
    ev.preventDefault();
    new SWSEStore(sheet.actor).render(true);
  }, { signal });

  root.querySelector('[data-action="open-mentor"]')?.addEventListener("click", async (ev) => {
    ev.preventDefault();
    ui.notifications.info("Mentor interactions coming soon!");
  }, { signal });
}

function wireDroidCustomization(sheet, root, signal) {
  for (const btn of root.querySelectorAll('[data-action="customize-droid"]')) {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      if (!sheet.actor) return;
      DroidCustomizationRouter.openDroidCustomization(sheet.actor, {
        focusCategory: ev.currentTarget?.dataset?.garageRegion ?? ev.currentTarget?.dataset?.region ?? null,
        focusSlot: ev.currentTarget?.dataset?.garageSlot ?? ev.currentTarget?.dataset?.slotId ?? null,
        focusMode: ev.currentTarget?.dataset?.garageMode ?? null
      });
    }, { signal });
  }
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
      await ActorEngine.updateActor(sheet.document, { "system.credits": currentCredits + price }, { source: 'droid-sheet-sell-item' });

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
      await ActorEngine.updateActor(sheet.document, { "system.ownedActors": owned }, { source: 'droid-sheet-owned-actors' });
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

function getActorSize(actor) {
  return String(actor?.system?.size ?? actor?.system?.droidSystems?.size ?? actor?.system?.droidSize ?? 'medium').toLowerCase();
}

async function createSelfDestructTemplate(actor, part) {
  const token = actor?.getActiveTokens?.()?.[0] ?? actor?.token?.object ?? null;
  const scene = token?.scene ?? canvas?.scene;
  if (!scene || !token) return null;
  const radiusSquares = getSelfDestructBurstSquares(getActorSize(actor), { miniaturized: part?.weaponProfile?.miniaturized === true });
  if (!radiusSquares) return null;
  const gridSize = canvas?.grid?.size ?? scene.grid?.size ?? 100;
  const distance = canvas?.grid?.distance ?? scene.grid?.distance ?? 1;
  const radiusDistance = radiusSquares * distance;
  const x = token.center?.x ?? token.x ?? 0;
  const y = token.center?.y ?? token.y ?? 0;
  try {
    const created = await scene.createEmbeddedDocuments('MeasuredTemplate', [{
      t: 'circle',
      user: game.user?.id,
      x,
      y,
      direction: 0,
      distance: radiusDistance,
      borderColor: game.user?.color ?? '#ff6400',
      fillColor: game.user?.color ?? '#ff6400',
      flags: { swse: { droidSelfDestruct: true, actorUuid: actor.uuid, partId: part?.ruleId ?? part?.id } }
    }]);
    return created?.[0] ?? null;
  } catch (err) {
    console.warn('Failed to create self-destruct template', err);
    return null;
  }
}

function buildDroidPartVirtualWeapon(actor, part) {
  const profile = part?.weaponProfile ?? {};
  const damage = profile.damageBySize
    ? getSelfDestructDamage(getActorSize(actor), { miniaturized: profile.miniaturized === true })
    : (profile.damage ?? '1d6');
  return {
    id: `swse-droid-part-${part?.ruleId ?? part?.id ?? 'weapon'}`,
    name: profile.name ?? part?.name ?? 'Droid Part',
    type: 'weapon',
    img: part?.img ?? actor?.img ?? 'icons/svg/aura.svg',
    flags: { swse: { virtual: true, droidPart: true, droidPartId: part?.ruleId ?? part?.id, selfDestruct: profile.selfDestruct === true } },
    system: {
      damage: damage || '1d6',
      damageType: profile.damageType ?? 'normal',
      attackAttribute: profile.mode === 'ranged' || profile.mode === 'area' ? 'dex' : 'str',
      meleeOrRanged: profile.mode === 'ranged' || profile.mode === 'area' ? 'ranged' : 'melee',
      weaponType: profile.weaponType ?? 'simple',
      proficiency: profile.weaponType ?? 'simple',
      range: profile.range ?? '',
      attackBonus: profile.attackBonus ?? 0,
      equipped: true,
      integrated: true,
      description: part?.description ?? ''
    }
  };
}

async function postDroidPartChat(actor, part, { roll = null, destroyed = false } = {}) {
  const modifiers = (part.modifiers ?? []).filter(mod => mod.active !== false);
  const modifierHtml = modifiers.length
    ? `<ul>${modifiers.map(mod => `<li><strong>${mod.target}</strong>: ${mod.value !== undefined ? `${Number(mod.value) >= 0 ? '+' : ''}${mod.value}` : 'special'} ${mod.type ?? ''}</li>`).join('')}</ul>`
    : '<p class="muted">No automatic modifier is active for this use.</p>';
  const weaponHtml = part.weaponProfile
    ? `<p><strong>Weapon profile:</strong> ${part.weaponProfile.name ?? part.name}${part.weaponProfile.damage ? `, ${part.weaponProfile.damage} damage` : ''}${part.weaponProfile.range ? `, ${part.weaponProfile.range}` : ''}${part.weaponProfile.defense ? `, targets ${part.weaponProfile.defense}` : ''}</p>`
    : '';
  const list = (label, values) => Array.isArray(values) && values.length
    ? `<h4>${label}</h4><ul>${values.map(value => `<li>${String(value)}</li>`).join('')}</ul>`
    : '';
  const prerequisiteHtml = list('Prerequisites', [
    ...(part.prerequisiteIds ?? []),
    ...((part.prerequisiteAnyIds ?? []).length ? [`Any: ${(part.prerequisiteAnyIds ?? []).join(', ')}`] : [])
  ]);
  const featureHtml = list('Features', part.features);
  const restrictionHtml = list('Restrictions', part.restrictions);
  const content = `
    <div class="swse-chat-card swse-droid-part-chat">
      <h3><i class="fa-solid fa-robot"></i> ${actor.name} uses ${part.name}</h3>
      ${part.description ? `<p>${part.description}</p>` : ''}
      ${weaponHtml}
      ${featureHtml}
      ${restrictionHtml}
      ${prerequisiteHtml}
      <h4>Rules / Modifiers</h4>
      ${modifierHtml}
      ${destroyed ? '<p class="swse-danger"><strong>Result:</strong> Droid destroyed. This Droid cannot be repaired or salvaged.</p>' : ''}
    </div>`;
  await ChatMessage.create({ speaker: ChatMessage.getSpeaker({ actor }), content, rolls: roll ? [roll] : [] });
}

function wireUnarmedAttack(sheet, root, signal) {
  for (const btn of root.querySelectorAll('[data-action="roll-unarmed-attack"]')) {
    btn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      if (!sheet.actor) return;
      const weapon = buildVirtualUnarmedWeapon(sheet.actor);
      await SWSERoll.rollAttack(sheet.actor, weapon, { showDialog: true });
    }, { signal });
  }
}

function wireDroidPartUse(sheet, root, signal) {
  for (const btn of root.querySelectorAll('[data-action="use-droid-part"]')) {
    btn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      if (!sheet.actor) return;
      const partId = ev.currentTarget?.dataset?.partId;
      const partName = ev.currentTarget?.dataset?.partName;
      const item = partId ? sheet.actor.items?.get?.(partId) : null;
      const lookupId = item?.system?.droidPartId ?? item?.flags?.swse?.droidPartId ?? partName ?? partId;
      const hydrated = hydrateDroidPart({
        id: lookupId,
        name: item?.name ?? partName,
        description: item?.system?.description,
        weaponProfile: item?.system?.weaponProfile,
        img: item?.img
      });
      const definition = getDroidPartDefinition(hydrated.ruleId ?? hydrated.name) ?? hydrated;
      const part = { ...definition, ...hydrated, weaponProfile: hydrated.weaponProfile ?? definition.weaponProfile };

      if (part.weaponProfile?.selfDestruct === true) {
        const confirmed = await Dialog.confirm({
          title: 'Confirm Droid Self-Destruct',
          content: `<p><strong>${sheet.actor.name}</strong> will be marked destroyed. This cannot be repaired or salvaged.</p><p>Continue?</p>`,
          yes: () => true,
          no: () => false,
          defaultYes: false
        });
        if (!confirmed) return;
        const damage = getSelfDestructDamage(getActorSize(sheet.actor), { miniaturized: part.weaponProfile.miniaturized === true });
        const burst = getSelfDestructBurstSquares(getActorSize(sheet.actor), { miniaturized: part.weaponProfile.miniaturized === true });
        const template = await createSelfDestructTemplate(sheet.actor, part);
        const roll = await new Roll(damage).evaluate({ async: true });
        await roll.toMessage({
          speaker: ChatMessage.getSpeaker({ actor: sheet.actor }),
          flavor: `${sheet.actor.name} — ${part.name} Damage${burst ? ` (${burst}-square burst)` : ''}`
        });
        if (template) ui.notifications.info(`${part.name}: placed ${burst}-square burst template.`);
        await ActorEngine.updateActor(sheet.actor, {
          'system.hp.value': 0,
          'system.conditionTrack.current': 5,
          'system.droidState.status': 'destroyed',
          'system.droidState.destroyed': true,
          'system.droidState.disabled': false,
          'system.droidState.destroyedBy': part.name
        }, { source: 'droid-self-destruct' });
        await postDroidPartChat(sheet.actor, part, { destroyed: true });
        return;
      }

      if (part.weaponProfile?.damage || part.weaponProfile?.damageBySize) {
        await postDroidPartChat(sheet.actor, part);
        await SWSERoll.rollAttack(sheet.actor, buildDroidPartVirtualWeapon(sheet.actor, part), { showDialog: true });
        return;
      }

      await postDroidPartChat(sheet.actor, part);
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
  const editButtons = root.querySelectorAll('.edit-droid-systems');
  if (!editButtons.length) return;

  for (const editDroidBtn of editButtons) {
    editDroidBtn.addEventListener('click', async (ev) => {
      ev.preventDefault();
      const hasConfig = !!sheet.actor?.system?.droidSystems?.degree;
      const mode = hasConfig ? 'EDIT' : 'NEW';
      try {
        await DroidBuilderApp.open(sheet.actor, {
          mode,
          sourceActor: hasConfig ? sheet.actor : null,
          requireApproval: HouseRuleService.isEnabled('store.requireGMApproval')
        });
      } catch (err) {
        console.error('Failed to open droid builder:', err);
        ui.notifications.error('Failed to open droid builder.');
      }
    }, { signal });
  }
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
