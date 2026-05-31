/**
 * scripts/sheets/v2/droid-sheet/listeners.js
 *
 * Live-path Droid Sheet listener wiring.
 *
 * The live Droid sheet now composes explicit frame/tab partials inside the
 * shared shell. Listener wiring is intentionally limited to controls that are
 * still present on that live path. Legacy helpers may remain below for dormant
 * partials, but they are not wired unless their controls return to the live UI.
 */

import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { createSafeEmbeddedItem } from "/systems/foundryvtt-swse/scripts/engine/items/safe-item-factory.js";
import { StockDroidConversionDialog } from "/systems/foundryvtt-swse/scripts/apps/stock-droid-conversion-dialog.js";
import { StockDroidComparisonDialog } from "/systems/foundryvtt-swse/scripts/apps/stock-droid-comparison-dialog.js";
import { SWSERoll } from "/systems/foundryvtt-swse/scripts/combat/rolls/enhanced-rolls.js";
import { rollAttack } from "/systems/foundryvtt-swse/scripts/combat/rolls/attacks.js";
import { DropService } from "/systems/foundryvtt-swse/scripts/services/drop-service.js";
import { coerceSingleFieldValue } from "/systems/foundryvtt-swse/scripts/sheets/v2/character-sheet/form.js";
import { buildVirtualUnarmedWeapon } from "/systems/foundryvtt-swse/scripts/engine/combat/unarmed-attack-helper.js";
import { getDroidPartDefinition, getSelfDestructBurstSquares, getSelfDestructDamage, hydrateDroidPart } from "/systems/foundryvtt-swse/scripts/data/droid-part-schema.js";

const DIRECT_FIELD_ALLOWLIST = new Set([
  "name",
  "system.class",
  "system.level",
  "system.credits",
  "system.notes",
  "system.bio"
]);

const DIRECT_ABILITY_FIELD_PATTERN = /^system\.attributes\.(str|dex|int|wis|cha)\.(base|racial|temp)$/;

function isSafeDroidSheetFieldName(name) {
  if (!name || typeof name !== "string") return false;
  if (DIRECT_FIELD_ALLOWLIST.has(name)) return true;
  if (DIRECT_ABILITY_FIELD_PATTERN.test(name)) return true;

  // Engine-owned / derived / Garage-managed namespaces are intentionally not
  // writable through generic sheet persistence. Use their owning controls.
  if (name.startsWith("system.derived.")) return false;
  if (name.startsWith("system.droidSystems.")) return false;
  if (name.startsWith("system.defenses.")) return false;
  if (name.startsWith("system.hp.max")) return false;
  if (name.startsWith("items.")) return false;

  return false;
}

/**
 * Wire live Droid sheet listener blocks for the current frame/tab partials.
 * Dormant legacy partial helpers are intentionally not called from here.
 *
 * @param {object} sheet - SWSEV2DroidSheet instance
 * @param {HTMLElement} root - Sheet root element
 * @param {AbortSignal} signal - Lifecycle signal that auto-removes listeners
 */
export function wireDroidSheetListeners(sheet, root, signal) {
  wireTabHandling(sheet, root, signal);
  wireNamedFieldPersistence(sheet, root, signal);
  wireConditionTrackControls(sheet, root, signal);
  wireProgressionFrameworkButtons(sheet, root, signal);
  wireDroidCustomization(sheet, root, signal);
  wireItemOpenControls(sheet, root, signal);
  wireEquipmentSellAndDelete(sheet, root, signal);
  wireFeatTalentButtons(sheet, root, signal);
  wireSkillRolling(sheet, root, signal);
  wireDefenseRolling(sheet, root, signal);
  wireWeaponRolling(sheet, root, signal);
  wireUnarmedAttack(sheet, root, signal);
  wireDroidPartUse(sheet, root, signal);
  wireActionUse(sheet, root, signal);
  wireDroidSystemsEditor(sheet, root, signal);
  wireConvertStockDroid(sheet, root, signal);
  wireProgressionButtons(sheet, root, signal);
  wireAbilityCardHandlers(sheet, root, signal);
  wireConceptAbilityPanelControls(sheet, root, signal);
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



const DROID_QUIET_FIELD_PATHS = new Set([
  'name',
  'img',
  'system.class',
  'system.credits',
  'system.notes',
  'system.bio'
]);

function isQuietDroidFieldPath(path) {
  if (!path || typeof path !== 'string') return false;
  if (DROID_QUIET_FIELD_PATHS.has(path)) return true;
  return path.startsWith('system.notes.') || path.startsWith('system.bio.');
}

function wireNamedFieldPersistence(sheet, root, signal) {
  root.addEventListener('change', async (ev) => {
    const field = ev.target instanceof HTMLElement
      ? ev.target.closest('input[name], textarea[name], select[name]')
      : null;
    if (!(field instanceof HTMLElement)) return;
    if (!field.name || field.hasAttribute('data-action') || field.disabled || field.hasAttribute('readonly')) return;
    if (!isSafeDroidSheetFieldName(field.name)) return;

    const rawValue = field.matches('input[type="checkbox"]') ? field.checked : field.value;
    const update = {
      [field.name]: coerceSingleFieldValue(field.name, rawValue, field)
    };

    try {
      const quiet = isQuietDroidFieldPath(field.name);
      await ActorEngine.updateActor(sheet.actor, update, {
        source: quiet ? 'droid-sheet-direct-field-quiet' : 'droid-sheet-direct-field',
        render: quiet ? false : undefined,
        suppressAppRefresh: quiet,
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
  root.querySelectorAll('[data-action="cmd-chargen"], [data-action="cmd-levelup"]').forEach((button) => {
    button.addEventListener("click", async (ev) => {
      ev.preventDefault();
      const surfaceId = button.dataset.action === "cmd-chargen" ? "chargen" : "progression";
      if (typeof sheet.setSurface === "function") {
        await sheet.setSurface(surfaceId, {
          source: "droid-sheet",
          skipIntro: surfaceId !== "chargen"
        });
        await sheet.requestSurfaceRender?.({ reason: `droid-${surfaceId}-launch`, surfaceId });
      }
    }, { signal });
  });

  root.querySelectorAll('[data-action="cmd-store"]').forEach((button) => {
    button.addEventListener("click", async (ev) => {
      ev.preventDefault();
      if (typeof sheet.setSurface === "function") {
        await sheet.setSurface("store", { source: "droid-sheet" });
        await sheet.requestSurfaceRender?.({ reason: "droid-store-launch", surfaceId: "store" });
      }
    }, { signal });
  });

  root.querySelector('[data-action="open-mentor"]')?.addEventListener("click", async (ev) => {
    ev.preventDefault();
    if (typeof sheet.setSurface === "function") {
      await sheet.setSurface("mentor", { source: "droid-sheet" });
      await sheet.requestSurfaceRender?.({ reason: "droid-mentor-launch", surfaceId: "mentor" });
    } else {
      ui.notifications.info("Mentor interactions coming soon!");
    }
  }, { signal });
}

function buildDroidCustomizationSurfaceOptions(target = null, source = "droid-sheet") {
  return {
    source,
    bayMode: "garage",
    mode: "garage",
    contextMode: "modifyExisting",
    focusCategory: target?.dataset?.garageRegion ?? target?.dataset?.region ?? null,
    focusSlot: target?.dataset?.garageSlot ?? target?.dataset?.slotId ?? null,
    focusMode: target?.dataset?.garageMode ?? null
  };
}

async function openDroidCustomizationSurface(sheet, target = null, source = "droid-sheet") {
  if (!sheet?.actor || typeof sheet.setSurface !== "function") return false;
  await sheet.setSurface("customization", buildDroidCustomizationSurfaceOptions(target, source));
  await sheet.requestSurfaceRender?.({ reason: "droid-customization-launch", surfaceId: "customization" });
  return true;
}

function wireDroidCustomization(sheet, root, signal) {
  for (const btn of root.querySelectorAll('[data-action="customize-droid"]')) {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      await openDroidCustomizationSurface(sheet, ev.currentTarget, "droid-customize-action");
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
      if (game.swse.progression?.openFeatSelector) {
        game.swse.progression.openFeatSelector(sheet.document);
      } else {
        const doc = await createSafeEmbeddedItem(sheet.document, 'feat', { source: 'droid-sheet-add-feat' });
        doc?.sheet?.render?.(true);
      }
    }, { signal });
  }

  for (const btn of root.querySelectorAll('[data-action="add-talent"]')) {
    btn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      if (game.swse.progression?.openTalentSelector) {
        game.swse.progression.openTalentSelector(sheet.document);
      } else {
        const doc = await createSafeEmbeddedItem(sheet.document, 'talent', { source: 'droid-sheet-add-talent' });
        doc?.sheet?.render?.(true);
      }
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
      try {
        const opened = await openDroidCustomizationSurface(sheet, ev.currentTarget, "droid-systems-editor");
        if (!opened) ui.notifications.warn('Droid Garage is unavailable for this sheet.');
      } catch (err) {
        console.error('Failed to open droid garage surface:', err);
        ui.notifications.error('Failed to open droid garage surface.');
      }
    }, { signal });
  }
}

function wireConvertStockDroid(sheet, root, signal) {
  const convertBtn = root.querySelector(".convert-to-custom-droid");
  if (!convertBtn) return;

  // Visibility is template/context owned. This listener only handles the button
  // if the stock-droid conversion action is actually rendered.
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
    if (!sheet.actor || typeof sheet.setSurface !== "function") return;
    await sheet.setSurface("progression", {
      source: "droid-sheet.level-up",
      skipIntro: true
    });
    await sheet.requestSurfaceRender?.({ reason: "droid-level-up-launch", surfaceId: "progression" });
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


function wireConceptAbilityPanelControls(sheet, root, signal) {
  root.addEventListener("click", async (ev) => {
    const toggle = ev.target?.closest?.('[data-action="toggle-abilities"]');
    if (toggle) {
      ev.preventDefault();
      const panel = toggle.closest(".abilities-panel");
      if (!panel) return;
      const isExpanded = panel.classList.toggle("abilities-expanded");
      for (const row of panel.querySelectorAll(".ability-row")) {
        const collapsed = row.querySelector(".ability-collapsed");
        const expanded = row.querySelector(".ability-expanded");
        if (collapsed instanceof HTMLElement) collapsed.style.display = isExpanded ? "none" : "flex";
        if (expanded instanceof HTMLElement) expanded.style.display = isExpanded ? (expanded.dataset?.expandedDisplay || "grid") : "none";
      }
      toggle.setAttribute("aria-expanded", String(isExpanded));
      toggle.textContent = isExpanded ? "Collapse" : (toggle.dataset?.collapsedLabel || "Edit Stats");
      return;
    }

    const rollButton = ev.target?.closest?.('[data-action="roll-ability"]');
    if (!rollButton) return;
    ev.preventDefault();
    const abilityKey = rollButton.dataset?.ability;
    if (!abilityKey) return;

    try {
      await SWSERoll.rollAbility(sheet.actor, abilityKey, {
        sourceElement: rollButton,
        companionSource: rollButton,
        sheet,
        showRollCompanion: true
      });
    } catch (err) {
      console.error("Droid ability roll failed:", err);
      ui?.notifications?.error?.(`Ability roll failed: ${err.message}`);
    }
  }, { signal });

  root.addEventListener("input", (ev) => {
    const input = ev.target?.closest?.(".ability-expanded input");
    if (!input) return;
    const row = input.closest(".ability-row");
    if (!row) return;
    previewConceptAbilityRow(row);
  }, { signal });
}

function previewConceptAbilityRow(row) {
  const read = (field, fallback = 0) => {
    const input = row.querySelector(`input[data-field="${field}"]`);
    const value = Number(input?.value);
    return Number.isFinite(value) ? value : fallback;
  };
  const base = read("base", 10);
  const racial = read("racial", 0);
  const temp = read("temp", 0);
  const total = base + racial + temp;
  const mod = Math.floor((total - 10) / 2);
  const sign = mod > 0 ? `+${mod}` : String(mod);
  row.querySelectorAll(".math-result, .swse-concept-ability-card__score").forEach((el) => { el.textContent = String(total); });
  row.querySelectorAll(".math-mod, .swse-concept-ability-card__mod").forEach((el) => {
    el.textContent = sign;
    el.classList.toggle("mod--positive", mod > 0);
    el.classList.toggle("mod--negative", mod < 0);
    el.classList.toggle("mod--zero", mod === 0);
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
