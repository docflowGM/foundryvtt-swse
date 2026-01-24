/**
 * force-secret-picker.js
 * Force Secret picker UI using FormApplication + HBS template.
 */

export class ForceSecretPicker extends FormApplication {
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
    super({}, {
      ...ForceSecretPicker.defaultOptions,
      title: "Select Force Secrets"
    });

    this.secrets = secrets || [];
    this.limit = opts.count || 1;
    this.resolve = opts.resolve || (() => {});
    this.actor = opts.actor || null;
    this.selectedSet = new Set();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse-app", "force-secret-picker"],
      template: "systems/foundryvtt-swse/scripts/progression/ui/templates/force-secret-picker.hbs",
      width: 720,
      height: 620,
      resizable: true
    });
  }

  getData() {
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

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".secret-card").on("click", ev => {
      const id = ev.currentTarget.dataset.id;
      if (!id) return;

      if (this.selectedSet.has(id)) {
        this.selectedSet.delete(id);
      } else if (this.selectedSet.size < this.limit) {
        this.selectedSet.add(id);
      }

      this.render();
    });

    html.find(".ask-mentor-force-secret-suggestion").on("click", ev => {
      this._askMentor();
    });

    html.find(".confirm").on("click", ev => {
      const result = [];
      const sel = new Set(this.selectedSet);

      for (const s of this.secrets) {
        const id = s.id || s._id || s.name;
        if (sel.has(id)) result.push(s);
      }

      this.resolve(result);
      this.close();
    });

    html.find(".cancel").on("click", ev => {
      this.resolve([]);
      this.close();
    });
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
