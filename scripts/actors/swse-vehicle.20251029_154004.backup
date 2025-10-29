import { SWSEActorSheet } from "./swse-actor.js";

export class SWSEVehicleSheet extends SWSEActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "actor", "vehicle"],
      template: "systems/swse/templates/actors/vehicle-sheet.hbs",
      width: 900,
      height: 800,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main" }]
    });
  }

  getData() {
    const context = super.getData();
    
    if (!context.system.weapons) context.system.weapons = [];
    if (!context.system.crewPositions) {
      context.system.crewPositions = {
        pilot: null, copilot: null, gunner: null,
        engineer: null, shields: null, commander: null
      };
    }
    if (!context.system.shields) context.system.shields = { value: 0, max: 0 };
    if (!context.system.hull) context.system.hull = { value: 0, max: 0 };
    if (!context.system.tags) context.system.tags = [];
    
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    if (!this.options.editable) return;
    
    html.find('.weapon-add').click(this._onAddWeapon.bind(this));
    html.find('.weapon-remove').click(this._onRemoveWeapon.bind(this));
    html.find('.crew-slot').on('drop', this._onCrewDrop.bind(this));
    html.find('.crew-slot').on('click', this._onCrewClick.bind(this));
  }

  async _onAddWeapon(event) {
    event.preventDefault();
    const weapons = this.actor.system.weapons || [];
    weapons.push({ name: "New Weapon", arc: "Forward", bonus: "+0", damage: "0d0", range: "Close" });
    await this.actor.update({ "system.weapons": weapons });
  }
  
  async _onRemoveWeapon(event) {
    event.preventDefault();
    const index = parseInt(event.currentTarget.dataset.index);
    const weapons = [...(this.actor.system.weapons || [])];
    if (index >= 0 && index < weapons.length) {
      weapons.splice(index, 1);
      await this.actor.update({ "system.weapons": weapons });
    }
  }
  
  async _onRollWeapon(event) { }
  async _onCrewDrop(event) {
    event.preventDefault();
    const slot = event.currentTarget.dataset.slot;
    try {
      const data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
      if (data.type === 'Actor') {
        const actor = await fromUassets/uid(data.uassets/uid);
        if (actor) {
          await this.actor.update({ [`system.crewPositions.${slot}`]: actor.name });
        }
      }
    } catch (error) { }
  }
  
  async _onCrewClick(event) {
    event.preventDefault();
    const slot = event.currentTarget.dataset.slot;
    const currentCrew = this.actor.system.crewPositions?.[slot];
    if (currentCrew) {
      const confirm = await Dialog.confirm({
        title: "Remove Crew Member",
        content: `<p>Remove <strong>${currentCrew}</strong> from ${slot} position?</p>`
      });
      if (confirm) {
        await this.actor.update({ [`system.crewPositions.${slot}`]: null });
      }
    }
  }

  async _onAddFeat(event) { }
  async _onRemoveFeat(event) { }
  async _onAddTalent(event) { }
  async _onRemoveTalent(event) { }
  async _onAddForcePower(event) { }
  async _onRemoveForcePower(event) { }
  async _onRollForcePower(event) { }
  async _onRefreshForcePowers(event) { }
  async _onReloadForcePower(event) { }
  async _onAddSkill(event) { }
  async _onRemoveSkill(event) { }
  async _onLevelUp(event) { }
  async _onSecondWind(event) { }
  async _onOpenStore(event) { }
}