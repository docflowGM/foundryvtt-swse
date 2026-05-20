/**
 * SWSE Item Sheet (ApplicationV2)
 *
 * Contract:
 * - UI edits item data only
 * - No rules math
 * - No actor mutation outside ActorEngine-owned APIs (actor.updateOwnedItem / actor.activateItem / etc.)
 */

import { RenderAssertions } from "/systems/foundryvtt-swse/scripts/core/render-assertions.js";
import { SWSEUpgradeApp } from "/systems/foundryvtt-swse/scripts/apps/upgrade-app.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { ShellOverlayManager } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellOverlayManager.js";
import { ShellRouter } from "/systems/foundryvtt-swse/scripts/ui/shell/ShellRouter.js";
import { BLADE_COLOR_MAP } from "/systems/foundryvtt-swse/scripts/data/blade-colors.js";
import { getSwseFlag } from "/systems/foundryvtt-swse/scripts/utils/flags/swse-flags.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { openItemCustomization } from "/systems/foundryvtt-swse/scripts/apps/customization/item-customization-router.js";
import { normalizeItemSystem, sanitizeItemSheetUpdate } from "/systems/foundryvtt-swse/scripts/items/item-defaults.js";
import { addItemEditorTrace, installItemEditorTrace, summarizeActorItems, summarizeItem } from "/systems/foundryvtt-swse/scripts/debug/item-editor-trace.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;
const { FormDataExtended } = foundry.applications;

export class SWSEItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(super.DEFAULT_OPTIONS ?? {}), {
    classes: ['swse', 'sheet', 'item', 'swse-app', 'swse-theme-holo'],
    position: { width: 520, height: 600 },
    window: { resizable: true },
    form: {
      handler: SWSEItemSheet.#onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: false
    }
  });


  /**
   * AppV2 contract: Foundry reads options from `defaultOptions`, not `DEFAULT_OPTIONS`.
   * This bridges legacy apps to the V2 accessor.
   * @returns {object}
   */
  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }

/** @inheritDoc */
  static PARTS = {
    form: {
      template: 'systems/foundryvtt-swse/templates/items/base/item-sheet.hbs',
      scrollable: ['.item-editor__body']
    }
  };

  /** @inheritDoc */
  static TABS = {
    primary: {
      tabs: [
        { id: 'data', group: 'primary' },
        { id: 'description', group: 'primary' }
      ],
      initial: 'data'
    }
  };

  /** @inheritDoc */
  async _prepareContext(options) {
    // Build a plain serializable context for AppV2 rendering.
    // Do NOT inherit ItemSheetV2's full context here: it can include
    // non-cloneable class/config references (for example documentClass/TYPES),
    // which fail RenderAssertions.assertContextSerializable().
    const itemData = this.item?.toObject?.() ?? {};

    installItemEditorTrace();
    addItemEditorTrace('item-sheet-prepare-context', {
      item: summarizeItem(this.item),
      actor: summarizeActorItems(this.item?.actor),
      options
    });

    // Preview-only state used when a type/branch selector changes before the
    // sheet has finished saving. This keeps dependent selects stable without
    // touching deprecated global FormDataExtended APIs.
    const previewItemType = this._previewItemType ?? null;
    const previewWeaponBranch = this._previewWeaponBranch ?? null;
    if (previewItemType) {
      itemData.type = previewItemType;
    }
    itemData.system = normalizeItemSystem(itemData.type ?? this.item?.type ?? 'equipment', this.item?.system ?? {}, itemData.system ?? {});
    if (previewWeaponBranch && itemData.type === 'weapon') {
      itemData.system.meleeOrRanged = previewWeaponBranch;
    }

    // Template expects this for the <form class="{{cssClass}} ..."> binding.
    const cssClasses = this.constructor.DEFAULT_OPTIONS?.classes ?? [];

    // Get actor credits if this item is embedded
    const actor = this.item?.actor;
    const actorCredits = actor?.system?.credits ?? null;

    const context = {
      item: itemData,
      system: foundry.utils.deepClone(itemData.system ?? {}),
      cssClass: Array.isArray(cssClasses) ? cssClasses.join(' ') : '',
      itemId: this.item?.id ?? null,
      itemType: itemData.type ?? this.item?.type ?? "",
      itemName: itemData.name ?? this.item?.name ?? "",
      itemImg: itemData.img ?? this.item?.img ?? "",
      editable: this.isEditable ?? true,
      owner: this.item?.isOwner ?? false,
      limited: this.item?.limited ?? false,
      actorCredits: actorCredits,
      activeTab: 'data', // Ensure tabs render with Data tab active by default
      bladeColorOptions: Object.entries(BLADE_COLOR_MAP).map(([name, hex]) => ({ name, hex })),
      labels: {
        sheetTitle: itemData.name ?? this.item?.name ?? "Item"
      }
    };

    RenderAssertions.assertContextSerializable(context, "SWSEItemSheet");
    return context;
  }


  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;
    if (!root) {return;}

    installItemEditorTrace();
    addItemEditorTrace('item-sheet-render', {
      item: summarizeItem(this.item),
      actor: summarizeActorItems(this.item?.actor),
      hasForm: !!root.querySelector('form'),
      itemType: this.item?.type ?? null
    });

    // Upgrade management
    // Phase 11: single-item upgrade from item sheet opens as shell OVERLAY on the actor's shell host.
    // Falls back to standalone SWSEUpgradeApp if the item is unowned or no shell host is open.
    root.querySelector('.open-upgrade-app')?.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        const actor = this.item.actor;
        if (actor) {
          const shell = ShellRouter.getShell(actor.id);
          if (shell) {
            // Shell host is open — open as overlay (Overlay classification)
            openItemCustomization(actor, this.item);
          } else {
            // No shell host open — open actor sheet first, then overlay
            await actor.sheet?.render(true);
            // Give sheet time to render and register
            await new Promise(resolve => setTimeout(resolve, 50));
            openItemCustomization(actor, this.item);
          }
        } else {
          // Unowned item — fall back to standalone upgrade app (legacy path)
          new SWSEUpgradeApp(this.item).render(true);
        }
      } catch (err) {
        SWSELogger.error('[SWSEItemSheet] Failed to open UpgradeApp', err);
        // Graceful fallback
        try { new SWSEUpgradeApp(this.item).render(true); } catch {}
      }
    });

    // Customization entries route into the shell-native upgrade overlay when possible
    const openShellCustomizer = async (event) => {
      event.preventDefault();
      try {
        const actor = this.item.actor;
        if (!actor) return;
        let shell = ShellRouter.getShell(actor.id);
        if (!shell) {
          await actor.sheet?.render(true);
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        openItemCustomization(actor, this.item);
      } catch (err) {
        SWSELogger.error('[SWSEItemSheet] Failed to open shell customizer', err);
      }
    };

    root.querySelector('.customize-lightsaber')?.addEventListener('click', openShellCustomizer);
    root.querySelector('.customize-blaster')?.addEventListener('click', openShellCustomizer);

    // Close button
    root.querySelector('.close-btn')?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    });

    // Shield activation helpers (data-only intent -> actor API)
    root.querySelector('.activate-shield')?.addEventListener('click', this.#onActivateShield.bind(this));
    root.querySelector('.deactivate-shield')?.addEventListener('click', this.#onDeactivateShield.bind(this));

    // Lightsaber emit light toggle
    root.querySelector('.emit-light-toggle')?.addEventListener('change', this.#onEmitLightToggle.bind(this));

    // Item type selector - re-render on type change to update category options
    const itemTypeSelect = root.querySelector('.item-type-select');
    if (itemTypeSelect) {
      itemTypeSelect.addEventListener('change', this.#onItemTypeChange.bind(this));
    }

    // Weapon category filtering based on melee/ranged choice
    const meleeOrRangedSelect = root.querySelector('.melee-or-ranged-select');
    if (meleeOrRangedSelect) {
      meleeOrRangedSelect.addEventListener('change', this.#onMeleeOrRangedChange.bind(this));
    }

    // Intercept native form submission — AppV2 does not set tag:'form' so the
    // browser would navigate away (hard-crashing Foundry) without this guard.
    const innerForm = root.querySelector('form.swse-item-editor-form');
    if (innerForm) {
      innerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        addItemEditorTrace('native-submit-captured', {
          itemId: this.item?.id,
          itemType: this.item?.type
        });
        const fd = new FormDataExtended(innerForm);
        await SWSEItemSheet.#onSubmitForm.call(this, event, innerForm, fd);
      });
    }

    // Earliest-possible confirm-click trace (fires before submit)
    const confirmBtn = root.querySelector('.item-editor__footer-confirm');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', (event) => {
        addItemEditorTrace('confirm-click', {
          itemId: this.item?.id,
          itemType: this.item?.type,
          itemName: this.item?.name
        });
      }, { capture: true });
    }
  }

  /**
   * Handle changes to item type to update category options
   * @private
   */
  async #onItemTypeChange(event) {
    this._previewItemType = event.currentTarget.value || null;
    if (this._previewItemType !== 'weapon') {
      this._previewWeaponBranch = null;
    }
    this.render({ force: true });
  }

  /**
   * Handle changes to melee/ranged choice to update category options
   * @private
   */
  async #onMeleeOrRangedChange(event) {
    const categorySelect = this.element?.querySelector?.('.weapon-category-select');
    if (!categorySelect) return;

    this._previewWeaponBranch = event.currentTarget.value || null;
    this.render({ force: true });
  }

  async #onActivateShield(event) {
    event.preventDefault();

    const actor = this.item?.actor;
    if (actor?.activateItem) {
      await actor.activateItem(this.item);
      return;
    }

    // Fallback for unowned items or legacy contexts.
    const currentCharges = Number(this.item.system.charges?.current ?? 0);
    const shieldRating = Number(this.item.system.shieldRating ?? 0);

    if (currentCharges <= 0) {
      ui.notifications.warn('No charges remaining to activate shield!');
      return;
    }
    if (shieldRating <= 0) {
      ui.notifications.warn('Shield has no rating to activate!');
      return;
    }

    const updates = {
      'system.charges.current': currentCharges - 1,
      'system.activated': true,
      'system.currentSR': shieldRating
    };

    // PHASE 2: Route embedded items through ActorEngine
    if (this.item?.isEmbedded && actor) {
      try {
        await ActorEngine.updateEmbeddedDocuments(actor, "Item", [{ _id: this.item.id, ...updates }]);
      } catch (err) {
        console.error('[Item Sheet] Shield activation failed:', err);
        ui.notifications.error(`Failed to activate ${this.item.name}: ${err.message}`);
        return;
      }
    } else {
      // @mutation-exception: Unowned item update
      // Unowned items (not on an actor) can update directly — UI-only operation
      await this.item.update(updates);  // @mutation-exception: UI-only unowned item
    }

    ui.notifications.info(
      `${this.item.name} activated! SR: ${shieldRating}, Charges remaining: ${currentCharges - 1}`
    );
  }


  async #onActivateLightsaber(event) {
    event.preventDefault();

    const actor = this.item?.actor;
    const bladeColor = getSwseFlag(this.item, 'bladeColor') || actor?.getFlag?.('swse', 'preferredLightsaberColor') || 'blue';

    if (actor?.activateItem) {
      await actor.activateItem(this.item);
    } else if (this.item?.isEmbedded && actor) {
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: this.item.id, 'system.activated': true }]);
    } else {
      // @mutation-exception world-item
      await this.item.update({ 'system.activated': true });
    }

    if (!getSwseFlag(this.item, 'emitLight')) {
      if (this.item?.isEmbedded && actor) {
        await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: this.item.id, 'flags.foundryvtt-swse.emitLight': true, 'flags.foundryvtt-swse.bladeColor': bladeColor }]);
      } else {
        // @mutation-exception world-item
        await this.item.update({ 'flags.foundryvtt-swse.emitLight': true, 'flags.foundryvtt-swse.bladeColor': bladeColor });
      }
    }

    const tokens = actor?.getActiveTokens?.() || [];
    if (tokens[0]?.document) {
      const hex = BLADE_COLOR_MAP[bladeColor] ?? '#00ffff';
      await tokens[0].document.update({
        light: { dim: 20, bright: 10, color: hex, alpha: 0.3, animation: { type: 'pulse', speed: 3, intensity: 2 } }
      });
    }

    ui.notifications.info(`${this.item.name} activated.`);
  }

  async #onDeactivateLightsaber(event) {
    event.preventDefault();

    const actor = this.item?.actor;
    if (actor?.deactivateItem) {
      await actor.deactivateItem(this.item);
    } else if (this.item?.isEmbedded && actor) {
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: this.item.id, 'system.activated': false }]);
    } else {
      // @mutation-exception world-item
      await this.item.update({ 'system.activated': false });
    }

    const tokens = actor?.getActiveTokens?.() || [];
    if (tokens[0]?.document) {
      await tokens[0].document.update({ light: { dim: 0, bright: 0 } });
    }

    ui.notifications.info(`${this.item.name} deactivated.`);
  }

  async #onDeactivateShield(event) {
    event.preventDefault();

    const actor = this.item?.actor;
    if (actor?.deactivateItem) {
      await actor.deactivateItem(this.item);
      return;
    }

    const updates = { 'system.activated': false };

    // PHASE 2: Route embedded items through ActorEngine
    if (this.item?.isEmbedded && actor) {
      try {
        await ActorEngine.updateEmbeddedDocuments(actor, "Item", [{ _id: this.item.id, ...updates }]);
      } catch (err) {
        console.error('[Item Sheet] Shield deactivation failed:', err);
        ui.notifications.error(`Failed to deactivate ${this.item.name}: ${err.message}`);
        return;
      }
    } else {
      // @mutation-exception: Unowned item update
      // Unowned items (not on an actor) can update directly — UI-only operation
      await this.item.update(updates);  // @mutation-exception: UI-only unowned item
    }
    ui.notifications.info(`${this.item.name} deactivated!`);
  }

  async #onEmitLightToggle(event) {
    event.preventDefault();

    const enabled = event.currentTarget.checked;
    const actor = this.item?.actor;

    // Update item flag
    // PHASE 2: Route embedded items through ActorEngine
    if (this.item?.isEmbedded && actor) {
      try {
        await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: this.item.id, 'flags.foundryvtt-swse.emitLight': enabled }]);
      } catch (err) {
        console.error('[Item Sheet] Light toggle failed:', err);
        ui.notifications.error(`Failed to toggle light: ${err.message}`);
        return;
      }
    } else {
      // @mutation-exception: Unowned item update
      // Unowned items (not on an actor) can update directly — UI-only operation
      await this.item.update({ 'flags.foundryvtt-swse.emitLight': enabled });  // @mutation-exception: UI-only unowned item
    }

    // Update token light if actor is on canvas
    const tokens = actor?.getActiveTokens?.() || [];
    if (tokens.length === 0) return;

    const token = tokens[0];
    if (!token?.document) return;

    if (enabled) {
      const bladeColor = this.item.flags.swse?.bladeColor;
      const hex = BLADE_COLOR_MAP[bladeColor] ?? "#00ffff";

      await token.document.update({
        light: {
          dim: 20,
          bright: 10,
          color: hex,
          alpha: 0.3,
          animation: {
            type: "pulse",
            speed: 3,
            intensity: 2
          }
        }
      });

      ui.notifications.info(`${this.item.name} blade light activated!`);
    } else {
      await token.document.update({
        light: {
          dim: 0,
          bright: 0
        }
      });

      ui.notifications.info(`${this.item.name} blade light deactivated!`);
    }
  }

  /**
   * V2 form handler.
   * Static method called by Foundry with proper 'this' binding to app instance.
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   */
  static async #onSubmitForm(event, form, formData) {
    event.preventDefault();

    const app = this;
    installItemEditorTrace();

    if (app._isSavingItem === true) {
      addItemEditorTrace('item-sheet-submit-ignored-busy', {
        item: summarizeItem(app.item),
        actor: summarizeActorItems(app.item?.actor)
      });
      return;
    }

    app._isSavingItem = true;
    const confirmButton = form?.querySelector?.('.item-editor__footer-confirm');
    if (confirmButton) {
      confirmButton.disabled = true;
      confirmButton.dataset.swseSaving = 'true';
    }

    addItemEditorTrace('submit-start', {
      itemId: app.item?.id,
      itemType: app.item?.type,
      itemName: app.item?.name
    });

    try {
      const rawObject = formData?.object ?? Object.fromEntries(new FormData(form).entries());

      addItemEditorTrace('formdata-collected', {
        itemId: app.item?.id,
        rawKeyCount: Object.keys(rawObject ?? {}).length,
        rawKeys: Object.keys(rawObject ?? {}).sort()
      });
      const hasDottedKeys = Object.keys(rawObject ?? {}).some(key => String(key).includes('.'));
      const data = hasDottedKeys ? foundry.utils.expandObject(rawObject) : foundry.utils.deepClone(rawObject ?? {});

      addItemEditorTrace('item-sheet-submit-raw', {
        item: summarizeItem(app.item),
        actor: summarizeActorItems(app.item?.actor),
        rawKeys: Object.keys(rawObject ?? {}).sort(),
        rawObject,
        expandedSystemKeys: Object.keys(data?.system ?? {}).sort()
      });

      // Normalize string lists into arrays.
      if (typeof data?.system?.properties === 'string') {
        data.system.properties = data.system.properties
          .split(',')
          .map((p) => p.trim())
          .filter(Boolean);
      }

      if (typeof data?.system?.tags === 'string') {
        data.system.tags = data.system.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
      }

      // If a shield is toggled off via form edits, ensure derived UI doesn't remain "active".
      if (data?.system?.charges && Number(data.system.charges?.current ?? 0) <= 0) {
        data.system.activated = false;
      }

      const actor = app.item?.actor;
      const requestedType = data?.type ?? app.item?.type;
      if (requestedType && requestedType !== app.item?.type) {
        ui.notifications?.warn?.('Changing an existing item type is not supported here. Create a new blank item of the desired type instead.');
        data.type = app.item?.type;
      }

      const safeUpdate = sanitizeItemSheetUpdate(app.item, data, form);
      const flatData = foundry.utils.flattenObject(safeUpdate);

      addItemEditorTrace('item-sheet-submit-sanitized', {
        item: summarizeItem(app.item),
        actor: summarizeActorItems(actor),
        requestedType,
        safeUpdate,
        flatKeys: Object.keys(flatData ?? {}).sort(),
        flatData
      });

      addItemEditorTrace('normalized-payload', {
        itemId: app.item?.id,
        itemType: app.item?.type,
        flatKeys: Object.keys(flatData ?? {}).sort(),
        typeInPayload: 'type' in flatData,
        idInPayload: '_id' in flatData
      });

      // PHASE 2: Route embedded items through ActorEngine
      if (app.item?.isEmbedded && actor) {
        try {
          addItemEditorTrace('update-start', {
            itemId: app.item?.id,
            path: 'embedded',
            actorId: actor?.id
          });
          await ActorEngine.updateEmbeddedDocuments(actor, "Item", [{ _id: app.item.id, ...flatData }], { source: 'swse-item-sheet-confirm' });
          addItemEditorTrace('update-success', {
            itemId: app.item?.id,
            path: 'embedded'
          });
          addItemEditorTrace('item-sheet-submit-success-embedded', {
            item: summarizeItem(app.item),
            actor: summarizeActorItems(actor),
            updatedItemId: app.item.id
          });
          app._previewItemType = null;
          app._previewWeaponBranch = null;
          ui.notifications?.info?.(`${app.item.name || safeUpdate.name} saved.`);
          await app.close?.();
          return;
        } catch (err) {
          addItemEditorTrace('update-failure', {
            itemId: app.item?.id,
            path: 'embedded',
            error: err
          });
          addItemEditorTrace('item-sheet-submit-error-embedded', {
            item: summarizeItem(app.item),
            actor: summarizeActorItems(actor),
            flatData,
            error: err
          });
          console.error('[Item Sheet] Form submission failed:', err);
          ui.notifications.error(`Failed to save item: ${err.message}`);
          return;
        }
      }

      // @mutation-exception: Unowned item update
      // Unowned items (not on an actor) can update directly — UI-only sheet operation
      try {
        addItemEditorTrace('update-start', {
          itemId: app.item?.id,
          path: 'unowned'
        });
        await app.item.update(flatData); // @mutation-exception: UI-only unowned item
        addItemEditorTrace('update-success', {
          itemId: app.item?.id,
          path: 'unowned'
        });
        addItemEditorTrace('item-sheet-submit-success-unowned', {
          item: summarizeItem(app.item),
          flatData
        });
      } catch (err) {
        addItemEditorTrace('update-failure', {
          itemId: app.item?.id,
          path: 'unowned',
          error: err
        });
        addItemEditorTrace('item-sheet-submit-error-unowned', {
          item: summarizeItem(app.item),
          flatData,
          error: err
        });
        throw err;
      }
      app._previewItemType = null;
      app._previewWeaponBranch = null;
      ui.notifications?.info?.(`${app.item?.name || safeUpdate.name} saved.`);
      await app.close?.();
    } finally {
      addItemEditorTrace('finally', {
        itemId: app.item?.id,
        itemType: app.item?.type,
        itemName: app.item?.name
      });
      app._isSavingItem = false;
      if (confirmButton) {
        confirmButton.disabled = false;
        delete confirmButton.dataset.swseSaving;
      }
    }
  }
}
