/**
 * AdoptOrAddDialog — ApplicationV2 Migration
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

import BaseSWSEAppV2 from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";

export class AdoptOrAddDialog extends BaseSWSEAppV2 {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "swse-adopt-or-add",
      title: "Actor Drop",
      template: "systems/foundryvtt-swse/templates/apps/adopt-or-add-dialog.hbs",
      position: {
        width: 400,
        height: "auto"
      },
      window: {
        icon: "fas fa-object-group",
        minimizable: false,
        resizable: false,
        frame: true
      }
    });
  }

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
   * Wire event listeners (ApplicationV2 contract)
   */
  wireEvents() {
    const root = this.element;

    // Add button
    const addBtn = root.querySelector('[data-action="add"]');
    if (addBtn) {
      addBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        this._callback("add");
        this.close();
      });
    }

    // Adopt button
    const adoptBtn = root.querySelector('[data-action="adopt"]');
    if (adoptBtn) {
      adoptBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        this._callback("adopt");
        this.close();
      });
    }

    // Close on cancel
    const cancelBtn = root.querySelector('[data-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener("click", (ev) => {
        ev.preventDefault();
        this.close();
      });
    }
  }
}
