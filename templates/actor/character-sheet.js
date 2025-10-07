/**
 * SWSE Character Sheet
 * Custom FoundryVTT sheet for Star Wars Saga Edition characters.
 */
export class SWSECharacterSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "character", "holo-theme"], // your CSS hooks
      template: "systems/swse/templates/actors/character-sheet.hbs",
      width: 900,
      height: 650,
      resizable: true,
      tabs: [
        { navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }
      ]
    });
  }

  /** @override */
  getData(options) {
    const context = super.getData(options);
    context.system = this.actor.system;
    context.labels = this.actor.labels ?? {};
    return context;
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Example: Weapon Add/Remove
    html.find(".add-weapon").click(this._onAddWeapon.bind(this));
    html.find(".remove-weapon").click(this._onRemoveWeapon.bind(this));

    // Force power buttons, feats, talents, etc. can be wired similarly
  }

  // ──────────────────────────────────────────── Example custom logic ──
  async _onAddWeapon(event) {
    event.preventDefault();
    const weapons = duplicate(this.actor.system.weapons || []);
    weapons.push({ name: "New Weapon", damage: "1d8", attackAttr: "str" });
    await this.actor.update({ "system.weapons": weapons });
  }

  async _onRemoveWeapon(event) {
    event.preventDefault();
    const idx = $(event.currentTarget).closest(".weapon-entry").data("index");
    const weapons = duplicate(this.actor.system.weapons || []);
    weapons.splice(idx, 1);
    await this.actor.update({ "system.weapons": weapons });
  }
}
