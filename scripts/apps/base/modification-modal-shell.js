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

    // Prepare preview content from subclass hook
    const previewContent = this.getPreviewContent();

    // Prepare main content from subclass hook
    const mainContent = this.getMainContent();

    // Prepare sidebar content if applicable
    const sidebarContent = this.getSidebarContent();

    // Prepare footer content (cost summary, etc.)
    const footerContent = this.getFooterContent();

    return {
      ...context,
      actor: this.actor,
      item: this.item,
      itemName: this.item.name,
      headerContent,
      previewContent,
      mainContent,
      sidebarContent,
      footerContent
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
   * @returns {{title: string, subtitle?: string, icon?: string}}
   */
  getHeaderContent() {
    return {
      title: this.item.name || "Modification",
      subtitle: "Customize item properties"
    };
  }

  /**
   * Return object defining preview visual
   * @returns {{content: string, cssVars?: Object}}
   */
  getPreviewContent() {
    return {
      content: `<div class="modal-preview-placeholder">{{itemName}}</div>`,
      cssVars: {}
    };
  }

  /**
   * Return object defining main content area
   * Most of modal UI goes here
   * @returns {{content: string, regions?: Array}}
   */
  getMainContent() {
    return {
      content: `<div class="modal-content-placeholder">Override getMainContent() in subclass</div>`,
      regions: []
    };
  }

  /**
   * Return sidebar content if applicable
   * @returns {{content?: string} | null}
   */
  getSidebarContent() {
    return null;
  }

  /**
   * Return footer content (cost summary, button, etc.)
   * @returns {{content: string}}
   */
  getFooterContent() {
    return {
      content: `<div class="modal-footer-placeholder">Override getFooterContent() in subclass</div>`
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
   * Update CSS variable on preview element
   * Allows live preview updates without full re-render
   * @param {string} varName - CSS variable name (with -- prefix)
   * @param {string} value - Value to set
   */
  updatePreview(varName, value) {
    const preview = this.element?.querySelector(".modal-preview");
    if (preview) {
      preview.style.setProperty(varName, value);
    }
  }

  /**
   * Set multiple CSS variables at once
   * @param {Object} vars - Object with variable names and values
   */
  updatePreviewVars(vars) {
    const preview = this.element?.querySelector(".modal-preview");
    if (preview) {
      for (const [varName, value] of Object.entries(vars)) {
        preview.style.setProperty(varName, value);
      }
    }
  }

  /**
   * Apply affordability styling to cost summary
   * @param {boolean} canAfford
   */
  setAffordability(canAfford) {
    const summary = this.element?.querySelector(".modal-footer-summary");
    if (summary) {
      if (canAfford) {
        summary.classList.remove("cannot-afford");
        summary.classList.add("can-afford");
      } else {
        summary.classList.add("cannot-afford");
        summary.classList.remove("can-afford");
      }
    }
  }

  /**
   * Disable/enable apply button
   * @param {boolean} disabled
   */
  setApplyButtonDisabled(disabled) {
    const btn = this.element?.querySelector(".modal-apply-button");
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
