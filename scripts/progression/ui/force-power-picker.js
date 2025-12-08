/**
 * force-power-picker.js
 * Pretty, simple Force Power picker UI using FormApplication + HBS template.
 */

export class ForcePowerPicker extends FormApplication {
  static select(powers, count) {
    return new Promise(resolve => {
      const app = new ForcePowerPicker(powers, { count, resolve });
      app.render(true);
    });
  }

  constructor(powers, opts = {}) {
    super({}, { ...ForcePowerPicker.defaultOptions, title: 'Select Force Powers' });
    this.powers = powers || [];
    this.limit = opts.count || 1;
    this.resolve = opts.resolve;
    this.selectedSet = new Set();
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["swse", "force-power-picker"],
      template: "scripts/progression/ui/templates/force-power-picker.hbs",
      width: 720,
      height: 620
    });
  }

  getData() {
    return {
      powers: this.powers.map(p => ({
        id: p.id || p._id || p.name,
        name: p.name || p.id || "Power",
        img: p.img || (p.document && p.document.img) || "icons/svg/mystery-man.svg",
        description: (p.system && p.system.description) || (p.document && p.document.system && p.document.system.description) || "",
        selected: this.selectedSet.has(p.id || p._id || p.name)
      })),
      limit: this.limit,
      current: this.selectedSet.size
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find(".power-card").on("click", ev => {
      const id = ev.currentTarget.dataset.id;
      if (this.selectedSet.has(id)) this.selectedSet.delete(id);
      else if (this.selectedSet.size < this.limit) this.selectedSet.add(id);
      this.render();
    });

    html.find(".confirm").on("click", async ev => {
      const selected = [];
      const selIds = new Set(this.selectedSet);
      for (const p of this.powers) {
        const pid = p.id || p._id || p.name;
        if (selIds.has(pid)) selected.push(p);
      }
      this.resolve(selected);
      this.close();
    });

    html.find(".cancel").on("click", ev => {
      this.resolve([]);
      this.close();
    });
  }
}
