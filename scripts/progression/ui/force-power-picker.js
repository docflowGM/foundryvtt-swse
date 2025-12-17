/**
 * force-power-picker.js
 * Simple, clean Force Power picker UI using FormApplication + HBS template.
 */

export class ForcePowerPicker extends FormApplication {
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
    super({}, {
      ...ForcePowerPicker.defaultOptions,
      title: "Select Force Powers"
    });

    this.powers = powers || [];
    this.limit = opts.count || 1;
    this.resolve = opts.resolve || (() => {});
    this.selectedSet = new Set();
  }

  /**
   * Default window configuration for the Force Power Picker.
   */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["swse-app", "force-power-picker"],
      template: "scripts/progression/ui/templates/force-power-picker.hbs",
      width: 720,
      height: 620,
      resizable: true
    });
  }

  /**
   * Data to pass to the template.
   */
  getData() {
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
  activateListeners(html) {
    super.activateListeners(html);

    // Toggle selection
    html.find(".power-card").on("click", ev => {
      const id = ev.currentTarget.dataset.id;
      if (!id) return;

      if (this.selectedSet.has(id)) {
        this.selectedSet.delete(id);
      } else if (this.selectedSet.size < this.limit) {
        this.selectedSet.add(id);
      }

      this.render();
    });

    // Confirm selection
    html.find(".confirm").on("click", ev => {
      const result = [];
      const sel = new Set(this.selectedSet);

      for (const p of this.powers) {
        const id = p.id || p._id || p.name;
        if (sel.has(id)) result.push(p);
      }

      this.resolve(result);
      this.close();
    });

    // Cancel selection
    html.find(".cancel").on("click", ev => {
      this.resolve([]);
      this.close();
    });
  }
}
