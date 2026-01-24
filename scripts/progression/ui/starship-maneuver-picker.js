/**
 * starship-maneuver-picker.js
 * Starship Maneuver picker UI using FormApplication + HBS template.
 */

export class StarshipManeuverPicker extends FormApplication {
  /**
   * Helper: open a picker and return the selected maneuvers.
   */
  static select(maneuvers, count, actor = null) {
    return new Promise(resolve => {
      const app = new StarshipManeuverPicker(maneuvers, { count, resolve, actor });
      app.render(true);
    });
  }

  constructor(maneuvers, opts = {}) {
    super({}, {
      ...StarshipManeuverPicker.defaultOptions,
      title: "Select Starship Maneuvers"
    });

    this.maneuvers = maneuvers || [];
    this.limit = opts.count || 1;
    this.resolve = opts.resolve || (() => {});
    this.actor = opts.actor || null;
    this.selectedSet = new Set();
  }

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse-app", "starship-maneuver-picker"],
      template: "systems/foundryvtt-swse/scripts/progression/ui/templates/starship-maneuver-picker.hbs",
      width: 720,
      height: 620,
      resizable: true
    });
  }

  getData() {
    return {
      maneuvers: this.maneuvers.map(m => {
        const id = m.id || m._id || m.name;
        return {
          id,
          name: m.name || id,
          img: m.img || (m.document?.img) || "icons/svg/mystery-man.svg",
          description: m.system?.description || m.document?.system?.description || "",
          prerequisites: m.system?.prerequisites || m.document?.system?.prerequisites || [],
          selected: this.selectedSet.has(id)
        };
      }),
      limit: this.limit,
      current: this.selectedSet.size
    };
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".maneuver-card").on("click", ev => {
      const id = ev.currentTarget.dataset.id;
      if (!id) return;

      if (this.selectedSet.has(id)) {
        this.selectedSet.delete(id);
      } else if (this.selectedSet.size < this.limit) {
        this.selectedSet.add(id);
      }

      this.render();
    });

    html.find(".ask-mentor-starship-maneuver-suggestion").on("click", ev => {
      this._askMentor();
    });

    html.find(".confirm").on("click", ev => {
      const result = [];
      const sel = new Set(this.selectedSet);

      for (const m of this.maneuvers) {
        const id = m.id || m._id || m.name;
        if (sel.has(id)) result.push(m);
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
      const { StarshipManeuverSuggestionEngine } = await import('../../progression/engine/starship-maneuver-suggestion-engine.js');

      if (!this.actor) return;

      const suggestion = await StarshipManeuverSuggestionEngine.suggestManeuver(this.actor, this.maneuvers, this.selectedSet);
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
