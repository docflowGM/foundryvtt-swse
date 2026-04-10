/**
 * MODIFICATION MODAL SHELL
 *
 * Unified base class for all item customization modals
 * (lightsaber, blaster, armor, melee, gear)
 *
 * Provides:
 * - Common layout structure and styling
 * - Responsive mobile handling
 * - Lifecycle hooks for subclass customization
 * - Touch target enforcement (44px minimum)
 * - Sticky footer positioning
 * - CSS variable binding helpers
 *
 * CRITICAL: Subclasses handle all engine logic and intent building
 * Shell is PURE PRESENTATION and LIFECYCLE MANAGEMENT
 */

import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";

export class ModificationModalShell extends BaseSWSEAppV2 {
  constructor(actor, item, options = {}) {
    super(options);
    this.actor = actor;
    this.item = item;

    // Selection state (subclasses override as needed)
    this.selectedCategory = null;
    this.selectedModification = null;
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["swse", "modification-modal-shell", "swse-theme-holo"],
    window: {
      resizable: true
    },
    position: { width: 900, height: 700 },
    form: {
      handler: ModificationModalShell.#onSubmitForm,
      submitOnChange: false,
      closeOnSubmit: true
    }
  });

  static PARTS = {
    form: {
      template: "systems/foundryvtt-swse/templates/apps/base/modification-modal-shell.hbs"
    }
  };

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Prepare header content from subclass hook
    const headerContent = this.getHeaderContent();

    // Prepare main content from subclass hook (now returns { list, detail })
    const mainContent = this.getMainContent();

    // Prepare footer content (now returns { totalCost, wallet, canConfirm })
    const footerContent = this.getFooterContent();

    return {
      ...context,
      actor: this.actor,
      item: this.item,
      itemName: this.item.name,
      itemImg: this.item.img,
      headerContent,
      mainContent,
      footerContent,
      selectedCategory: this.selectedCategory,
      selectedModification: this.selectedModification
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;
    if (!root) return;

    // Apply subclass event listeners via hook
    this.attachEventListeners(root);
  }

  /**
   * LIFECYCLE HOOKS - Override in subclasses
   */

  /**
   * Return object defining header content
   * @returns {{title: string, subtitle?: string}}
   */
  getHeaderContent() {
    return {
      title: this.item.name || "Modification",
      subtitle: "Customize item properties"
    };
  }

  /**
   * Return object defining main content area (2-panel layout)
   * LEFT PANEL: List of selectable modifications/categories
   * RIGHT PANEL: Details of selected modification
   *
   * @returns {{list: string, detail: string}}
   */
  getMainContent() {
    return {
      list: `<div class="modal-list-placeholder">Override getMainContent().list in subclass</div>`,
      detail: `<div class="modal-detail-placeholder">Override getMainContent().detail in subclass</div>`
    };
  }

  /**
   * Return footer content (standardized contract)
   * Shell will render: Cancel | [Total Cost] | [Wallet] | Confirm
   *
   * @returns {{totalCost: number, wallet: number, canConfirm: boolean}}
   */
  getFooterContent() {
    return {
      totalCost: 0,
      wallet: this.actor?.system?.credits || 0,
      canConfirm: true
    };
  }

  /**
   * Attach event listeners to DOM
   * Override in subclass to add custom event listeners
   * @param {HTMLElement} root
   */
  attachEventListeners(root) {
    // Subclass implements this
  }

  /**
   * HELPER METHODS - Available to subclasses
   */

  /**
   * Update selection state and re-render detail panel
   * Called by subclass when user selects a modification from the list
   * @param {string} categoryId
   * @param {string} modificationId
   */
  async selectModification(categoryId, modificationId) {
    this.selectedCategory = categoryId;
    this.selectedModification = modificationId;

    // Re-render to update detail panel
    await this.render({ force: true });
  }

  /**
   * Apply affordability styling to footer
   * @param {boolean} canAfford
   */
  setAffordability(canAfford) {
    const footer = this.element?.querySelector(".modal-footer");
    if (footer) {
      if (canAfford) {
        footer.classList.remove("cannot-afford");
        footer.classList.add("can-afford");
      } else {
        footer.classList.add("cannot-afford");
        footer.classList.remove("can-afford");
      }
    }
  }

  /**
   * Disable/enable confirm button
   * @param {boolean} disabled
   */
  setConfirmDisabled(disabled) {
    const btn = this.element?.querySelector('[data-action="confirm"]');
    if (btn) {
      btn.disabled = disabled;
    }
  }

  /**
   * Show notification and close modal
   * @param {string} type - 'info', 'warn', 'error'
   * @param {string} message
   * @param {number} delayMs - Delay before closing (0 = immediate)
   */
  notifyAndClose(type, message, delayMs = 500) {
    const notifyFn = ui.notifications[type];
    if (notifyFn) {
      notifyFn(message);
    }
    if (delayMs > 0) {
      setTimeout(() => this.close(), delayMs);
    } else {
      this.close();
    }
  }

  static async #onSubmitForm(event, form, formData) {
    event.preventDefault();
    // Form submission handled by subclass apply button click
  }
}
