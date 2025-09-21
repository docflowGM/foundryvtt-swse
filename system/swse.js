//──────────────────────────────────────────────────────────────────────────────
// Imports & Constants
//──────────────────────────────────────────────────────────────────────────────
// systems/swse/swse.js
import "./scripts/races.js";
import "./scripts/swse-actor.js";
import "./scripts/swse-droid.js";
import "./scripts/swse-vehicle.js";

const CONDITION_PENALTIES = {
  normal:   0,
  "-1":    -1,
  "-2":    -2,
  "-5":    -5,
  "-10": -10,
  helpless: -100
};

//──────────────────────────────────────────────────────────────────────────────
// Initialization Hook
//──────────────────────────────────────────────────────────────────────────────
Hooks.once("init", () => {
  CONFIG.Actor.documentClass = SWSEActor;
  Actors.registerSheet("swse", SWSEActorSheet, {
    types: ["character"],
    makeDefault: true
  });
});

//──────────────────────────────────────────────────────────────────────────────
// Actor Class
//──────────────────────────────────────────────────────────────────────────────
class SWSEActor extends Actor {
  prepareData() {
    super.prepareData();
    this._applyRacialAbilities();
    this._applyConditionPenalty();
    this._prepareDefenses();
  }

  _applyRacialAbilities() {
    const raceKey      = this.system.race || "custom";
    const raceBonuses  = SWSE_RACES[raceKey]?.bonuses || {};

    for (const [abbr, ability] of Object.entries(this.system.abilities)) {
      ability.base    = Math.max(0, ability.base);
      ability.racial  = raceBonuses[abbr] || 0;
      ability.total   = ability.base + ability.racial + (ability.temp || 0);
      ability.mod     = Math.floor((ability.total - 10) / 2);
    }
  }

  _applyConditionPenalty() {
    this.conditionPenalty = 
      CONDITION_PENALTIES[this.system.conditionTrack] || 0;
  }

  _prepareDefenses() {
    const { level, defenses } = this.system;
    const penalty = this.conditionPenalty;

    for (const def of Object.values(defenses)) {
      const abilMod = def.ability 
        ? this.system.abilities[def.ability]?.mod || 0 
        : 0;

      def.level = level;
      def.total = level
        + (def.class          || 0)
        + abilMod
        + (def.armor          || 0)
        + (def.armoredDefense || 0)
        + (def.armorMastery   || 0)
        + (def.modifier       || 0)
        + (this.system.conditionTrack === "helpless" ? 0 : penalty);
    }
  }

  getHalfLevel() {
    return Math.floor(this.system.level / 2);
  }

  getConditionPenalty() {
    return CONDITION_PENALTIES[this.system.conditionTrack] || 0;
  }

  getSkillMod(skill) {
    if (this.system.conditionTrack === "helpless") return "N/A";

    let mod = skill.value
      + (this.system.abilities[skill.ability]?.mod || 0)
      + this.getHalfLevel();

    if (skill.trained) mod += 5;
    if (skill.focus)   mod += 5;

    return mod + this.getConditionPenalty();
  }
}

//──────────────────────────────────────────────────────────────────────────────
// Sheet Class
//──────────────────────────────────────────────────────────────────────────────
class SWSEActorSheet extends ActorSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "actor"],
      template: "systems/swse/templates/actor/character-sheet.hbs",
      width: 800,
      height: "auto"
    });
  }

  getData() {
    const data = super.getData();
    data.races = SWSE_RACES;
    return data;
  }

  activateListeners(html) {
    super.activateListeners(html);
    this._bindListButtons(html);
    this._bindSecondWind(html);
  }

  _bindListButtons(html) {
    const selectors = [".add-feat", ".add-talent", ".add-gear", ".add-weapon"];
    for (const sel of selectors) {
      html.find(sel).click(async () => {
        const key  = sel.replace(".add-", "");
        const list = duplicate(this.actor.system[key] || []);
        list.push({ name: "", description: "" });
        await this.actor.update({ [`system.${key}`]: list });
      });
    }
  }

  _bindSecondWind(html) {
    html.find(".apply-second-wind").click(async () => {
      const { healing = 0, uses = 0 } = this.actor.system.secondWind;
      if (healing > 0 && uses > 0) {
        const newHP = Math.min(
          this.actor.system.hp.value + healing,
          this.actor.system.hp.max
        );
        await this.actor.update({
          "system.hp.value":         newHP,
          "system.secondWind.uses": uses - 1
        });
      }
    });
  }
}

//──────────────────────────────────────────────────────────────────────────────
// Handlebars Helpers
//──────────────────────────────────────────────────────────────────────────────
Handlebars.registerHelper("eq", (a, b) => a === b);

Handlebars.registerHelper(
  "getSkillMod",
  (skill, abilities, level, conditionTrack) => {
    if (conditionTrack === "helpless") return "N/A";
    let mod = skill.value
      + (abilities[skill.ability]?.mod || 0)
      + Math.floor(level / 2);
    if (skill.trained) mod += 5;
    if (skill.focus)   mod += 5;
    return mod + (CONDITION_PENALTIES[conditionTrack] || 0);
  }
);
