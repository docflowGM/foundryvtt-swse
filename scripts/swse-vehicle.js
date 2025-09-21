// systems/swse/scripts/swse-vehicle.js

import { SWSEActorSheet } from "./swse-actor.js";

export class SWSEVehicleSheet extends SWSEActorSheet {
  /** Point to the Vehicle‐specific template */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "vehicle"],
      template: "systems/swse/templates/actor/vehicle-sheet.hbs"
    });
  }

  /** Expose crew IDs and weapon array to the template */
  getData() {
    const data = super.getData();
    data.crew    = this.actor.system.crew;
    data.weapons = this.actor.system.weapons;
    return data;
  }

  /** Activate drop zones and roll buttons for crew stations */
  activateListeners(html) {
    super.activateListeners(html);

    // Allow dragging Actors into crew and gunner slots
    html.find(".crew-drop")
      .on("dragover", ev => ev.preventDefault())
      .on("drop",    ev => this._onCrewDrop(ev));

    // Bind station rolls
    html.find(".roll-pilot").click(()   => this._rollPilot());
    html.find(".roll-shields").click(() => this._rollShields());
    html.find(".roll-gunner").click(ev  => this._rollGunner(ev));
    html.find(".roll-engineer").click(() => this._rollEngineer());
  }

  /** Handle dropping a Character or Droid into a slot */
  async _onCrewDrop(ev) {
    ev.preventDefault();
    const dragData = JSON.parse(ev.originalEvent.dataTransfer.getData("text/plain"));
    if (dragData.type !== "Actor") return;
    if (!["character", "droid"].includes(dragData.documentType)) return;
    const slot = ev.currentTarget.dataset.slot;
    const idx  = ev.currentTarget.dataset.index;
    const key  = slot === "weapons"
      ? `system.weapons.${idx}.gunner`
      : `system.crew.${slot}`;
    await this.actor.update({ [key]: dragData.id });
  }

  /** Resolve an Actor by ID or linked Token */
  _getActor(id) {
    return game.actors.get(id) || canvas.tokens.get(id)?.actor;
  }

  /** Pilot skill check using Pilot skill total */
  _rollPilot() {
    const pid = this.actor.system.crew.pilot;
    const pc  = this._getActor(pid);
    if (!pc) return ui.notifications.warn("No pilot assigned");
    const mod  = pc.getSkillMod(pc.system.skills.pilot);
    new Roll(`1d20 + ${mod}`).roll({ async: false })
      .toMessage({
        speaker: ChatMessage.getSpeaker({ actor: pc }),
        flavor: "<strong>Pilot Check</strong>"
      });
  }

  /** Shields regeneration using Use Computer skill */
  _rollShields() {
    const sid = this.actor.system.crew.shields;
    const sc  = this._getActor(sid);
    if (!sc) return ui.notifications.warn("No shields operator");
    const mod    = sc.getSkillMod(sc.system.skills.use_computer);
    const atkRoll= new Roll(`1d20 + ${mod}`).roll({ async: false });
    atkRoll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: sc }),
      flavor: "<strong>Shield Regeneration</strong>"
    });
    const total  = atkRoll.total;
    if (total < 15) return ui.notifications.info("No shield regeneration");
    const bonus  = total - 15;
    const regen  = new Roll(`1d6 + ${bonus}`).roll({ async: false }).total;
    ui.notifications.info(`${sc.name} regenerates ${regen} shield points`);
    const sh     = this.actor.system.shields;
    const value  = Math.min(sh.value + regen, sh.max);
    this.actor.update({ "system.shields.value": value });
  }

  /** Fire a weapon: attack & damage sourced from assigned gunner or pilot */
  _rollGunner(ev) {
    const idx = ev.currentTarget.closest(".weapon-slot").dataset.index;
    const wp  = this.actor.system.weapons[idx];

    // Determine who fires
    const actorId = wp.usePilot
      ? this.actor.system.crew.pilot
      : wp.gunner;
    const gc = this._getActor(actorId);
    if (!gc) return ui.notifications.warn("No gunner assigned");

    // Attack roll
    const half  = gc.getHalfLevel();
    const bab   = gc.system.bab || 0;
    const aMod  = gc.system.abilities[wp.attackAttr]?.mod || 0;
    const focus = wp.focus ? 1 : 0;
    const extra = wp.modifier || 0;
    const atkMod= half + bab + aMod + focus + extra;
    new Roll(`1d20 + ${atkMod}`).roll({ async: false })
      .toMessage({
        speaker: ChatMessage.getSpeaker({ actor: gc }),
        flavor: `<strong>${wp.name} Attack</strong>`
      });

    // Damage roll
    let dMod = 0;
    if (wp.damageAttr === "str")  dMod = gc.system.abilities.str.mod;
    if (wp.damageAttr === "dex")  dMod = gc.system.abilities.dex.mod;
    if (wp.damageAttr === "2str") dMod = gc.system.abilities.str.mod * 2;
    if (wp.damageAttr === "2dex") dMod = gc.system.abilities.dex.mod * 2;
    const spec  = wp.specialization ? 1 : 0;
    const base  = wp.damage || "0";
    const dmg   = `${base} + ${half + dMod + spec}`;
    new Roll(dmg).roll({ async: false })
      .toMessage({
        speaker: ChatMessage.getSpeaker({ actor: gc }),
        flavor: `<strong>${wp.name} Damage</strong>`
      });
  }

  /** Engineering check using Mechanics skill */
  _rollEngineer() {
    const eid = this.actor.system.crew.engineer;
    const ec  = this._getActor(eid);
    if (!ec) return ui.notifications.warn("No engineer assigned");
    const mod = ec.getSkillMod(ec.system.skills.mechanics);
    new Roll(`1d20 + ${mod}`).roll({ async: false })
      .toMessage({
        speaker: ChatMessage.getSpeaker({ actor: ec }),
        flavor: "<strong>Engineering Check</strong>"
      });
  }
}
