/**
 * force-secret-picker.js
 * Force Secret picker UI using FormApplication + HBS template.
 */
import SWSEFormApplication from "../../apps/base/swse-form-application.js";

export class ForceSecretPicker extends SWSEFormApplication {
  /**
   * Helper: open a picker and return the selected secrets.
   */
  static select(secrets, count, actor = null) {
    return new Promise(resolve => {
      const app = new ForceSecretPicker(secrets, { count, resolve, actor });
      app.render(true);
    });
  }

  constructor(secrets, opts = {}) {
    super({});

    this.secrets = secrets || [];
    this.limit = opts.count || 1;
    this.resolve = opts.resolve || (() => {});
    this.actor = opts.actor || null;
    this.selectedSet = new Set();
  }

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    SWSEFormApplication.DEFAULT_OPTIONS ?? {},
    {
      id: "force-secret-picker",
      classes: ["swse-app", "force-secret-picker"],
      template: "systems/foundryvtt-swse/scripts/progression/ui/templates/force-secret-picker.hbs",
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
async _prepareContext(options) {
    return {
      secrets: this.secrets.map(s => {
        const id = s.id || s._id || s.name;
        return {
          id,
          name: s.name || id,
          img: s.img || (s.document?.img) || "icons/svg/mystery-man.svg",
          description: s.system?.description || s.document?.system?.description || "",
          prerequisites: s.system?.prerequisites || s.document?.system?.prerequisites || [],
          selected: this.selectedSet.has(id)
        };
      }),
      limit: this.limit,
      current: this.selectedSet.size
    };
  }

  async _onRender(context, options) {
    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    root.querySelectorAll(".secret-card").forEach(card => {
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

    const mentorBtn = root.querySelector(".ask-mentor-force-secret-suggestion");
    if (mentorBtn) {
      mentorBtn.addEventListener("click", () => this._askMentor());
    }

    const confirmBtn = root.querySelector(".confirm");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", ev => {
        const result = [];
        const sel = new Set(this.selectedSet);

        for (const s of this.secrets) {
          const id = s.id || s._id || s.name;
          if (sel.has(id)) result.push(s);
        }

        this.resolve(result);
        this.close();
      });
    }

    const cancelBtn = root.querySelector(".cancel");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", ev => {
        this.resolve([]);
        this.close();
      });
    }
  }

  async _askMentor() {
    try {
      const { ForceSecretSuggestionEngine } = await import('../../progression/engine/force-secret-suggestion-engine.js');

      if (!this.actor) return;

      const suggestion = await ForceSecretSuggestionEngine.suggestSecret(this.actor, this.secrets, this.selectedSet);
      if (suggestion && suggestion.id) {
        this.selectedSet.clear();
        this.selectedSet.add(suggestion.id);
        this.render();
      }
    } catch (e) {
      console.warn('Mentor suggestion failed:', e);
    }
  }
}
