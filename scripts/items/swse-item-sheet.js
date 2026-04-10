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
import { BLADE_COLOR_MAP } from "/systems/foundryvtt-swse/scripts/data/blade-colors.js";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export class SWSEItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  /** @inheritDoc */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
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
    root.querySelector('.open-upgrade-app')?.addEventListener('click', (event) => {
      event.preventDefault();
      try {
        new SWSEUpgradeApp(this.item).render(true);
      } catch (err) {
        SWSELogger.error('[SWSEItemSheet] Failed to open UpgradeApp', err);
      }
    });

    // Lightsaber customization entry
    root.querySelector('.customize-lightsaber')?.addEventListener('click', (event) => {
      event.preventDefault();
      try {
        new LightsaberConstructionApp(this.item.actor ?? this.item).render(true);
      } catch (err) {
        SWSELogger.error('[SWSEItemSheet] Failed to open LightsaberConstructionApp', err);
      }
    });

    // Blaster customization entry
    root.querySelector('.customize-blaster')?.addEventListener('click', (event) => {
      event.preventDefault();
      try {
        const actor = this.item.actor ?? this.item;
        new BlasterCustomizationApp(actor, this.item).render(true);
      } catch (err) {
        SWSELogger.error('[SWSEItemSheet] Failed to open BlasterCustomizationApp', err);
      }
    });

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
    const itemType = event.currentTarget.value;

    // Update the form data
    const formData = new FormDataExtended(this.form);
    formData.set('type', itemType);

    // Re-render to update category options based on new type
    this.render({ force: true });
  }

  /**
   * Handle changes to melee/ranged choice to update category options
   * @private
   */
  async #onMeleeOrRangedChange(event) {
    const meleeOrRanged = event.currentTarget.value;
    const categorySelect = this.element?.querySelector('.weapon-category-select');
    if (!categorySelect) return;

    // Update the form data
    const formData = new FormDataExtended(this.form);
    formData.set('system.meleeOrRanged', meleeOrRanged);

    // Re-render to update category options
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
        await actor.updateOwnedItem(this.item, updates);
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
        await actor.updateOwnedItem(this.item, updates);
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
        await actor.updateOwnedItem(this.item, { 'flags.swse.emitLight': enabled });
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
        await actor.updateOwnedItem(this.item, flatData);
        return;
      } catch (err) {
        console.error('[Item Sheet] Form submission failed:', err);
        ui.notifications.error(`Failed to save item: ${err.message}`);
        return;
      }
    }

    // @mutation-exception: Unowned item update
    // Unowned items (not on an actor) can update directly — UI-only sheet operation
    await this.item.update(flatData); // @mutation-exception: UI-only unowned item
  }
}
