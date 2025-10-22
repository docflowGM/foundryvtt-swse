// ============================================
// FILE: scripts/swse-vehicle.js
// ============================================
import { SWSEActorSheet } from "./swse-actor.js";

export class SWSEVehicleSheet extends SWSEActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "holo-theme", "sheet", "vehicle"],
      template: "systems/swse/templates/actors/vehicle-sheet.hbs"
    });
  }

  getData() {
    const data = super.getData();
    data.crew = this.actor.system.crew || {};
    data.weapons = this.actor.system.weapons || [];
    data.labels.sheetTitle = game.i18n.localize("SWSE.SheetLabel.vehicle") || "Vehicle";
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    html.find(".crew-drop")
      .on("dragover", ev => ev.preventDefault())
      .on("drop", ev => this._onCrewDrop(ev));
    
    html.find(".roll-pilot").click(() => this._rollPilot());
    html.find(".roll-shields").click(() => this._rollShields());
    html.find(".roll-gunner").click(ev => this._rollGunner(ev));
    html.find(".roll-engineer").click(() => this._rollEngineer());
  }

  async _onCrewDrop(ev) {
    ev.preventDefault();
    const data = JSON.parse(ev.originalEvent.dataTransfer.getData("text/plain"));
    if (data.type !== "Actor") return;
    
    const slot = ev.currentTarget.dataset.slot;
    const idx = ev.currentTarget.dataset.index;
    const key = slot === "weapons" 
      ? `system.weapons.${idx}.gunner`
      : `system.crew.${slot}`;
    
    await this.actor.update({[key]: data.id || data.uuid});
  }

  _rollPilot() {
    const pilot = game.actors.get(this.actor.system.crew?.pilot);
    if (!pilot) return ui.notifications.warn("No pilot assigned");
    
    const mod = pilot.getSkillMod(pilot.system.skills?.pilot || { ability: "dex", trained: false });
    new Roll(`1d20 + ${mod}`).evaluate({async: true}).then(roll => {
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({actor: pilot}),
        flavor: "Pilot Check"
      });
    });
  }

  _rollShields() {
    const shieldsOp = game.actors.get(this.actor.system.crew?.shields);
    if (!shieldsOp) return ui.notifications.warn("No shields operator");
    
    const mod = shieldsOp.getSkillMod(shieldsOp.system.skills?.use_computer || { ability: "int", trained: false });
    new Roll(`1d20 + ${mod}`).evaluate({async: true}).then(roll => {
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({actor: shieldsOp}),
        flavor: "Shield Regeneration"
      });
      
      const total = roll.total;
      if (total >= 15) {
        const bonus = total - 15;
        new Roll(`1d6 + ${bonus}`).evaluate({async: true}).then(regen => {
          ui.notifications.info(`Regenerated ${regen.total} shield points!`);
          const newShields = Math.min(
            this.actor.system.shields.value + regen.total,
            this.actor.system.shields.max
          );
          this.actor.update({"system.shields.value": newShields});
        });
      }
    });
  }

  _rollGunner(ev) {
    const idx = ev.currentTarget.closest(".weapon-slot")?.dataset.index;
    const weapon = this.actor.system.weapons?.[idx];
    if (!weapon) return;
    
    const gunnerId = weapon.usePilot 
      ? this.actor.system.crew?.pilot 
      : weapon.gunner;
    const gunner = game.actors.get(gunnerId);
    if (!gunner) return ui.notifications.warn("No gunner assigned");
    
    const halfLevel = gunner.getHalfLevel();
    const bab = gunner.system.bab || 0;
    const atkMod = halfLevel + bab + (gunner.system.abilities?.[weapon.attackAttr]?.mod || 0) + 
                   (weapon.focus ? 1 : 0) + (weapon.modifier || 0);
    
    new Roll(`1d20 + ${atkMod}`).evaluate({async: true}).then(roll => {
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({actor: gunner}),
        flavor: `${weapon.name} Attack`
      });
    });
    
    // Damage
    let dmgMod = halfLevel;
    if (weapon.damageAttr === "str") dmgMod += gunner.system.abilities.str?.mod || 0;
    if (weapon.damageAttr === "dex") dmgMod += gunner.system.abilities.dex?.mod || 0;
    if (weapon.specialization) dmgMod += 1;
    
    new Roll(`${weapon.damage} + ${dmgMod}`).evaluate({async: true}).then(roll => {
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({actor: gunner}),
        flavor: `${weapon.name} Damage`
      });
    });
  }

  _rollEngineer() {
    const engineer = game.actors.get(this.actor.system.crew?.engineer);
    if (!engineer) return ui.notifications.warn("No engineer assigned");
    
    const mod = engineer.getSkillMod(engineer.system.skills?.mechanics || { ability: "int", trained: false });
    new Roll(`1d20 + ${mod}`).evaluate({async: true}).then(roll => {
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({actor: engineer}),
        flavor: "Engineering Check"
      });
    });
  }
}
