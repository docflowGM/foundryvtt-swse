/**
 * SWSE Item Sheet (ApplicationV2)
 *
 * Contract:
 * - UI edits item data only
 * - No rules math
 * - No actor mutation outside ActorEngine-owned APIs (actor.updateOwnedItem / actor.activateItem / etc.)
 */

import { SWSEUpgradeApp } from '../apps/upgrade-app.js';
import { SWSELogger } from '../utils/logger.js';

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
      template: 'systems/foundryvtt-swse/templates/items/base/item-sheet.hbs'
    }
  };

  /** @inheritDoc */
  static TABS = {
    primary: {
      tabs: [
        { id: 'data', group: 'primary' },
        { id: 'desc', group: 'primary' }
      ],
      initial: 'data'
    }
  };

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.item = this.item;
    context.system = this.item.system;

    // Template expects this for the <form class="{{cssClass}} ..."> binding.
    context.cssClass = this.classList?.value || this.constructor.DEFAULT_OPTIONS.classes.join(' ');

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

    // Shield activation helpers (data-only intent -> actor API)
    root.querySelector('.activate-shield')?.addEventListener('click', this.#onActivateShield.bind(this));
    root.querySelector('.deactivate-shield')?.addEventListener('click', this.#onDeactivateShield.bind(this));
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

    if (actor?.updateOwnedItem && this.item?.isEmbedded) {await actor.updateOwnedItem(this.item, updates);} else {await this.item.update(updates);}

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

    if (actor?.updateOwnedItem && this.item?.isEmbedded) {await actor.updateOwnedItem(this.item, updates);} else {await this.item.update(updates);}
    ui.notifications.info(`${this.item.name} deactivated!`);
  }

  /**
   * V2 form handler.
   * @this {SWSEItemSheet}
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
    if (actor?.updateOwnedItem && this.item?.isEmbedded) {
      await actor.updateOwnedItem(this.item, foundry.utils.flattenObject(data));
      return;
    }

    await this.item.update(foundry.utils.flattenObject(data));
  }
}
