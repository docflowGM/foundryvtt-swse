/**
 * force-technique-picker.js
 * Force Technique picker UI using FormApplication + HBS template.
 */

export class ForceTechniquePicker extends FormApplication {
  /**
   * Helper: open a picker and return the selected techniques.
   */
  static select(techniques, count, actor = null) {
    return new Promise(resolve => {
      const app = new ForceTechniquePicker(techniques, { count, resolve, actor });
      app.render(true);
    });
  }

  constructor(techniques, opts = {}) {
    super({}, {
      ...ForceTechniquePicker.defaultOptions,
      title: "Select Force Techniques"
    });

    this.techniques = techniques || [];
    this.limit = opts.count || 1;
    this.resolve = opts.resolve || (() => {});
    this.actor = opts.actor || null;
    this.selectedSet = new Set();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse-app", "force-technique-picker"],
      template: "systems/foundryvtt-swse/scripts/progression/ui/templates/force-technique-picker.hbs",
      width: 720,
      height: 620,
      resizable: true
    });
  }

  getData() {
    return {
      techniques: this.techniques.map(t => {
        const id = t.id || t._id || t.name;
        return {
          id,
          name: t.name || id,
          img: t.img || (t.document?.img) || "icons/svg/mystery-man.svg",
          description: t.system?.description || t.document?.system?.description || "",
          prerequisites: t.system?.prerequisites || t.document?.system?.prerequisites || [],
          selected: this.selectedSet.has(id)
        };
      }),
      limit: this.limit,
      current: this.selectedSet.size
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".technique-card").on("click", ev => {
      const id = ev.currentTarget.dataset.id;
      if (!id) return;

      if (this.selectedSet.has(id)) {
        this.selectedSet.delete(id);
      } else if (this.selectedSet.size < this.limit) {
        this.selectedSet.add(id);
      }

      this.render();
    });

    html.find(".ask-mentor-force-technique-suggestion").on("click", ev => {
      this._askMentor();
    });

    html.find(".confirm").on("click", ev => {
      const result = [];
      const sel = new Set(this.selectedSet);

      for (const t of this.techniques) {
        const id = t.id || t._id || t.name;
        if (sel.has(id)) result.push(t);
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
      const { ForceTechniqueSuggestionEngine } = await import('../../progression/engine/force-technique-suggestion-engine.js');

      if (!this.actor) return;

      const suggestion = await ForceTechniqueSuggestionEngine.suggestTechnique(this.actor, this.techniques, this.selectedSet);
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
