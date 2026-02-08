/**
 * force-power-picker.js
 * Simple, clean Force Power picker UI using FormApplication + HBS template.
 */
import SWSEFormApplication from "../../apps/base/swse-form-application.js";

export class ForcePowerPicker extends SWSEFormApplication {
  /**
   * Helper: open a picker and return the selected powers.
   */
  static select(powers, count) {
    return new Promise(resolve => {
      const app = new ForcePowerPicker(powers, { count, resolve });
      app.render(true);
    });
  }

  constructor(powers, opts = {}) {
    super({});

    this.powers = powers || [];
    this.limit = opts.count || 1;
    this.resolve = opts.resolve || (() => {});
    this.selectedSet = new Set();
  }

  /**
   * Default window configuration for the Force Power Picker.
   */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplication.DEFAULT_OPTIONS ?? {},
    {
      id: "force-power-picker",
      classes: ["swse-app", "force-power-picker"],
      template: "systems/foundryvtt-swse/scripts/progression/ui/templates/force-power-picker.hbs",
      position: { width: 720, height: 620 },
      resizable: true
    }
  );

  

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

/**
   * Prepare context for template rendering.
   */
  async _prepareContext(options) {
    return {
      powers: this.powers.map(p => {
        const id = p.id || p._id || p.name;
        return {
          id,
          name: p.name || id,
          img: p.img || (p.document?.img) || "icons/svg/mystery-man.svg",
          description:
            p.system?.description ||
            p.document?.system?.description ||
            "",
          selected: this.selectedSet.has(id)
        };
      }),
      limit: this.limit,
      current: this.selectedSet.size
    };
  }

  /**
   * UI handlers for power selection.
   */
  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    // Toggle selection
    root.querySelectorAll(".power-card").forEach(card => {
      card.addEventListener("click", ev => {
        const id = ev.currentTarget.dataset.id;
        if (!id) return;

        if (this.selectedSet.has(id)) {
          this.selectedSet.delete(id);
        } else if (this.selectedSet.size < this.limit) {
          this.selectedSet.add(id);
        }

        this.render();
      });
    });

    // Confirm selection
    const confirmBtn = root.querySelector(".confirm");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", ev => {
        const result = [];
        const sel = new Set(this.selectedSet);

        for (const p of this.powers) {
          const id = p.id || p._id || p.name;
          if (sel.has(id)) result.push(p);
        }

        this.resolve(result);
        this.close();
      });
    }

    // Cancel selection
    const cancelBtn = root.querySelector(".cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", ev => {
        this.resolve([]);
        this.close();
      });
    }
  }
}
