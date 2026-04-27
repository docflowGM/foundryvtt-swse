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
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { BlasterCustomizationApp } from "/systems/foundryvtt-swse/scripts/apps/blaster/blaster-customization-app.js";
import { openLightsaberInterface } from "/systems/foundryvtt-swse/scripts/applications/lightsaber/lightsaber-router.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class SWSEItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(foundry.utils.deepClone(super.DEFAULT_OPTIONS ?? {}), {
    classes: ['swse', 'sheet', 'item', 'swse-app', 'swse-theme-holo'],
    position: { width: 520, height: 600 },
    window: { resizable: true },
    form: {
      handler: SWSEItemSheet.#onSubmitForm,
      submitOnChange: true,
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

    // Preview-only state used when a type/branch selector changes before the
    // sheet has finished saving. This keeps dependent selects stable without
    // touching deprecated global FormDataExtended APIs.
    const previewItemType = this._previewItemType ?? null;
    const previewWeaponBranch = this._previewWeaponBranch ?? null;
    if (previewItemType) {
      itemData.type = previewItemType;
    }
    itemData.system ??= {};
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
            await ShellOverlayManager.openSingleItemUpgrade(actor, this.item);
          } else {
            // No shell host open — open actor sheet first, then overlay
            await actor.sheet?.render(true);
            // Give sheet time to render and register
            await new Promise(resolve => setTimeout(resolve, 50));
            await ShellOverlayManager.openSingleItemUpgrade(actor, this.item);
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
        await ShellOverlayManager.openSingleItemUpgrade(actor, this.item);
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
    const bladeColor = this.item?.flags?.swse?.bladeColor || actor?.getFlag?.('swse', 'preferredLightsaberColor') || 'blue';

    if (actor?.activateItem) {
      await actor.activateItem(this.item);
    } else if (this.item?.isEmbedded && actor) {
      await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: this.item.id, 'system.activated': true }]);
    } else {
      await this.item.update({ 'system.activated': true });
    }

    if (!this.item.flags?.swse?.emitLight) {
      if (this.item?.isEmbedded && actor) {
        await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: this.item.id, 'flags.swse.emitLight': true, 'flags.swse.bladeColor': bladeColor }]);
      } else {
        await this.item.update({ 'flags.swse.emitLight': true, 'flags.swse.bladeColor': bladeColor });
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
        await ActorEngine.updateEmbeddedDocuments(actor, 'Item', [{ _id: this.item.id, 'flags.swse.emitLight': enabled }]);
      } catch (err) {
        console.error('[Item Sheet] Light toggle failed:', err);
        ui.notifications.error(`Failed to toggle light: ${err.message}`);
        return;
      }
    } else {
      // @mutation-exception: Unowned item update
      // Unowned items (not on an actor) can update directly — UI-only operation
      await this.item.update({ 'flags.swse.emitLight': enabled });  // @mutation-exception: UI-only unowned item
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
    const data = foundry.utils.expandObject(formData.object);

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

    const actor = this.item?.actor;
    const flatData = foundry.utils.flattenObject(data);

    // PHASE 2: Route embedded items through ActorEngine
    if (this.item?.isEmbedded && actor) {
      try {
        await ActorEngine.updateEmbeddedDocuments(actor, "Item", [{ _id: this.item.id, ...flatData }]);
        app._previewItemType = null;
        app._previewWeaponBranch = null;
        return;
      } catch (err) {
        console.error('[Item Sheet] Form submission failed:', err);
        ui.notifications.error(`Failed to save item: ${err.message}`);
        return;
      }
    }

    // @mutation-exception: Unowned item update
    // Unowned items (not on an actor) can update directly — UI-only sheet operation
    await app.item.update(flatData); // @mutation-exception: UI-only unowned item
    app._previewItemType = null;
    app._previewWeaponBranch = null;
  }
}
