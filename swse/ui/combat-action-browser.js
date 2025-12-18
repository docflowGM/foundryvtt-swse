/**
 * Combat Action Browser — Modular, Compendium-Driven
 * AUTO-GENERATED
 */

export class SWSECombatActionBrowser extends Application {
  constructor(actor) {
    super();
    this.actor = actor;
    this.filterText = "";
    this.actions = [];
  }

  static get defaultOptions() {
    return {
      ...super.defaultOptions,
      id: "swse-combat-action-browser",
      title: "Combat Action Browser",
      template: "modules/swse/ui/templates/combat-action-browser.html",
      width: 600,
      height: "auto",
      resizable: true
    };
  }

  async loadActions() {
    const PACKS = ["swse.actions", "swse.vehicleActions"];

    let entries = [];

    for (const packId of PACKS) {
      const pack = game.packs.get(packId);
      if (!pack) continue;

      const index = await pack.getIndex({ fields: ["img", "type", "system"] });
      const docs = await pack.getDocuments();

      entries.push(...docs.map(d => ({
        id: d.id,
        name: d.name,
        type: d.type,
        img: d.img ?? "icons/svg/sword.svg",
        system: d.system ?? {},
        packId
      })));
    }

    Hooks.callAll("swse.modifyActionList", entries);
    this.actions = entries;
  }

  _filterAction(a) {
    if (!this.filterText) return true;
    const t = this.filterText.toLowerCase();
    return (
      a.name.toLowerCase().includes(t) ||
      (a.system?.tags ?? []).some(tag => tag.toLowerCase().includes(t))
    );
  }

  meetsRequirements(a) {
    const req = a.system?.requirements;
    if (!req) return true;

    const actor = this.actor;

    if (req.skills) {
      for (const s of req.skills) {
        if (!actor.system?.skills?.[s]?.trained) return false;
      }
    }

    if (req.feats) {
      for (const f of req.feats) {
        if (!actor.items.some(i => i.type === "feat" && i.name === f)) return false;
      }
    }

    if (req.talents) {
      for (const t of req.talents) {
        if (!actor.items.some(i => i.type === "talent" && i.name === t)) return false;
      }
    }

    return true;
  }

  async getData() {
    if (!this.actions.length) await this.loadActions();

    const grouped = {
      melee: [],
      ranged: [],
      skills: [],
      vehicle: [],
      other: []
    };

    for (const a of this.actions) {
      if (!this._filterAction(a)) continue;

      const cat = a.system?.category ?? "other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({
        ...a,
        available: this.meetsRequirements(a)
      });
    }

    return {
      actor: this.actor,
      grouped,
      filterText: this.filterText
    };
  }

  activateListeners(html) {
    html.find("[data-action='filter']").on("input", ev => {
      this.filterText = ev.target.value;
      this.render();
    });

    html.find(".action-entry").on("click", ev => {
      const id = ev.currentTarget.dataset.id;
      const pack = ev.currentTarget.dataset.pack;
      this._executeAction(id, pack);
    });

    html.find(".action-entry").on("dragstart", ev => {
      const id = ev.currentTarget.dataset.id;
      const pack = ev.currentTarget.dataset.pack;
      this._dragAction(ev, id, pack);
    });

    html.find(".section-header").on("click", ev => {
      const sec = ev.currentTarget.dataset.section;
      html.find(`[data-section="${sec}"].action-row`).toggle();
    });
  }

  _dragAction(ev, id, pack) {
    const payload = {
      type: "swse-action",
      pack,
      id
    };
    ev.originalEvent.dataTransfer.setData("text/plain", JSON.stringify(payload));
  }

  async _executeAction(id, packId) {
    const pack = game.packs.get(packId);
    if (!pack) return ui.notifications.warn("Missing compendium.");

    const doc = await pack.getDocument(id);
    if (!doc) return;

    const action = doc.system ?? {};

    if (CONFIG.SWSE.Action && CONFIG.SWSE.Action.execute) {
      return CONFIG.SWSE.Action.execute(this.actor, action);
    }

    ui.notifications.warn("Action subsystem not implemented.");
  }
}

Hooks.once("init", () => {
  CONFIG.SWSE = CONFIG.SWSE ?? {};
  CONFIG.SWSE.ActionBrowser = SWSECombatActionBrowser;

  game.swse = game.swse ?? {};
  game.swse.browser = SWSECombatActionBrowser;
});
