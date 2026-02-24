/**
 * AdoptOrAddDialog
 *
 * PHASE 3: Modal dialog for GM to choose Add or Adopt behavior.
 *
 * AppV2 compliant DocumentSheetV2-style application.
 *
 * Responsibility:
 * - Present choice to GM when dropping same-type actor
 * - Handle Add → add as normal drop
 * - Handle Adopt → adopt stat block
 * - No mutations (callback-driven)
 *
 * Architecture:
 * - Async modal (promise-based)
 * - Clean shutdown
 * - Accessible buttons
 * - Clear UX
 */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class AdoptOrAddDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "swse-adopt-or-add",
    tag: "dialog",
    window: {
      title: "Actor Drop",
      icon: "fas fa-object-group",
      minimizable: false,
      resizable: false
    },
    position: {
      width: 400,
      height: "auto"
    }
  };

  static PARTS = {
    content: {
      template: "systems/foundryvtt-swse/templates/apps/adopt-or-add-dialog.hbs"
    }
  };

  constructor(actor, callback) {
    super();
    this.actor = actor;
    this._callback = callback;
  }

  /**
   * Prepare context for template
   */
  async _prepareContext() {
    return {
      actor: this.actor,
      actorName: this.actor?.name ?? "Unknown",
      actorType: this.actor?.type ?? "unknown"
    };
  }

  /**
   * Register event listeners
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Add button
    html.find('[data-action="add"]').on("click", (ev) => {
      ev.preventDefault();
      this._callback("add");
      this.close();
    });

    // Adopt button
    html.find('[data-action="adopt"]').on("click", (ev) => {
      ev.preventDefault();
      this._callback("adopt");
      this.close();
    });

    // Close on cancel
    html.find('[data-action="cancel"]').on("click", (ev) => {
      ev.preventDefault();
      this.close();
    });
  }
}
