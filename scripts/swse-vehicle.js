// systems/swse/scripts/swse-vehicle.js

import { SWSEActorSheet } from "./swse-actor.js";

let SCRAPED_VEHICLES = [];

/**
 * Load the scraped vehicles.json into memory on game ready.
 * Expects vehicles.json to live at systems/swse/packs/vehicles.json
 */
Hooks.once("ready", async () => {
  try {
    const response = await fetch("systems/swse/packs/vehicles.json");
    SCRAPED_VEHICLES = await response.json();
  } catch (err) {
    console.error("SWSE | Failed to load scraped vehicles data", err);
  }
});

/**
 * Utility to parse strings like "+18" or "15" into an integer.
 */
function parseBonus(str) {
  const m = String(str).match(/([+-]?\d+)/);
  return m ? Number(m[1]) : 0;
}

/**
 * Map full‐word ability names to our three‐letter keys.
 */
const AB_MAP = {
  strength:     "str",
  dexterity:    "dex",
  intelligence: "int"
};

export class SWSEVehicleSheet extends SWSEActorSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "vehicle"],
      template: "systems/swse/templates/actor/vehicle-sheet.hbs"
    });
  }

  /** Expose crew, weapons, and scraped stats to the template */
  getData() {
    const data = super.getData();
    const sys = data.actor.system;

    data.labels = {
      sheetTitle: game.i18n.localize("SWSE.SheetLabel.vehicle")
    };

    // Find scraped entry by name
    const scraped = SCRAPED_VEHICLES.find(v => v.name === data.actor.name);
    data.scraped = scraped || null;

    // Merge scraped data into system
    if (scraped) {
      // 1) Speed
      const spMatch = String(scraped.speed).match(/(\d+)/);
      if (spMatch) {
        sys.speed.base  = Number(spMatch[1]);
        sys.speed.total = sys.speed.base;
      }

      // 2) Base Attack Bonus
      sys.bab = parseBonus(scraped.base_attack_bonus);

      // 3) Grapple
      sys.defenses = sys.defenses || {};
      sys.defenses.grapple = parseBonus(scraped.grapple);

      // 4) Ability Scores
      for (const [full, val] of Object.entries(scraped.ability_scores || {})) {
        const abKey = AB_MAP[full];
        if (abKey && sys.abilities?.[abKey]) {
          sys.abilities[abKey].base = parseInt(val) || sys.abilities[abKey].base;
        }
      }

      // 5) Skills
      for (const [key, val] of Object.entries(scraped.skills || {})) {
        if (sys.skills?.[key]) {
          sys.skills[key].value = parseBonus(val);
        }
      }

      // 6) Crew Size & Passengers
      sys.crew_size  = scraped.crew_size;
      sys.passengers = scraped.passengers;

      // 7) Weapons
      if (Array.isArray(scraped.ranged) && scraped.ranged.length) {
        sys.weapons = scraped.ranged.map(name => ({
          name,
          attackAttr: "dex",
          damage: "",
          damageAttr: "none",
          focus: false,
          specialization: false,
          modifier: 0,
          usePilot: true,
          gunner: ""
        }));
      }

      // 8) Source URL
      sys.source_url = scraped.source_url;
    }

    // Pass through to template
    data.crew    = sys.crew;
    data.weapons = sys.weapons;

    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);

    // Crew drop zones
    html.find(".crew-drop")
      .on("dragover", ev => ev.preventDefault())
      .on("drop",    ev => this._onCrewDrop(ev));

    // Roll buttons
    html.find(".roll-pilot").click(()   => this._rollPilot());
    html.find(".roll-shields").click(() => this._rollShields());
    html.find(".roll-gunner").click(ev  => this._rollGunner(ev));
    html.find(".roll-engineer").click(() => this._rollEngineer());
  }

  async _onCrewDrop(ev) {
    ev.preventDefault();
    const drag = JSON.parse(ev.originalEvent.dataTransfer.getData("text/plain"));
    if (drag.type !== "Actor") return;
    if (!["character", "droid"].includes(drag.documentType)) return;

    const slot = ev.currentTarget.dataset.slot;
    const idx  = ev.currentTarget.dataset.index;
    const key  = slot === "weapons"
      ? `system.weapons.${idx}.gunner`
      : `system.crew.${slot}`;

    await this.actor.update({ [key]: drag.id });
  }

  _getActor(id) {
    return game.actors.get(id) || canvas.tokens.get(id)?.actor;
  }

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

  _rollShields() {
    const sid = this.actor.system.crew.shields;
    const sc  = this._getActor(sid);
    if (!sc) return ui.notifications.warn("No shields operator");
    const mod    = sc.getSkillMod(sc.system.skills.use_computer);
    const atk    = new Roll(`1d20 + ${mod}`).roll({ async: false });
    atk.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: sc }),
      flavor: "<strong>Shield Regeneration</strong>"
    });
    const total  = atk.total;
    if (total < 15) return ui.notifications.info("No shield regeneration");
    const bonus  = total - 15;
    const regen  = new Roll(`1d6 + ${bonus}`).roll({ async: false }).total;
    ui.notifications.info(`${sc.name} regenerates ${regen} shield points`);

    const shields = this.actor.system.shields;
    const value   = Math.min(shields.value + regen, shields.max);
    this.actor.update({ "system.shields.value": value });
  }

  _rollGunner(ev) {
    const idx = ev.currentTarget.closest(".weapon-slot").dataset.index;
    const wp  = this.actor.system.weapons[idx];
    const shooterId = wp.usePilot
      ? this.actor.system.crew.pilot
      : wp.gunner;
    const gc = this._getActor(shooterId);
    if (!gc) return ui.notifications.warn("No gunner assigned");

    // Attack
    const half  = gc.getHalfLevel();
    const bab   = gc.system.bab || 0;
    const aMod  = gc.system.abilities[wp.attackAttr]?.mod || 0;
    const focus = wp.focus ? 1 : 0;
    const extra = wp.modifier || 0;
    const atkMod = half + bab + aMod + focus + extra;

    new Roll(`1d20 + ${atkMod}`).roll({ async: false })
      .toMessage({
        speaker: ChatMessage.getSpeaker({ actor: gc }),
        flavor: `<strong>${wp.name} Attack</strong>`
      });

    // Damage
    let dMod = 0;
    if (wp.damageAttr === "str")  dMod = gc.system.abilities.str.mod;
    if (wp.damageAttr === "dex")  dMod = gc.system.abilities.dex.mod;
    if (wp.damageAttr === "2str") dMod = gc.system.abilities.str.mod * 2;
    if (wp.damageAttr === "2dex") dMod = gc.system.abilities.dex.mod * 2;
    const spec  = wp.specialization ? 1 : 0;
    const base  = wp.damage || "0";
    const dmgRoll = new Roll(`${base} + ${half + dMod + spec}`).roll({ async: false });
    dmgRoll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: gc }),
      flavor: `<strong>${wp.name} Damage</strong>`
    });
  }

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
