// systems/swse/scripts/swse-actor.js
import { SWSE_RACES } from "./races.js";

const CONDITION_PENALTIES = {
  normal: 0, "-1": -1, "-2": -2, "-5": -5, "-10": -10,
  helpless: -100
};

Hooks.once("init", () => {
  CONFIG.Actor.documentClass = SWSEActor;
  Actors.registerSheet("swse", SWSEActorSheet, {
    types: ["character"],
    makeDefault: true
  });
});

class SWSEActor extends Actor {
  prepareData() {
    super.prepareData();
    this._applyRacialAbilities();
    this._applyConditionPenalty();
    this._prepareDefenses();
  }

  _applyRacialAbilities() {
    const raceKey     = this.system.race || "custom";
    const bonuses     = SWSE_RACES[raceKey]?.bonuses || {};
    for (let [abbr, ab] of Object.entries(this.system.abilities)) {
      ab.base   = Math.max(0, ab.base);
      ab.racial = bonuses[abbr] || 0;
      ab.total  = ab.base + ab.racial + (ab.temp || 0);
      ab.mod    = Math.floor((ab.total - 10) / 2);
    }
  }

  _applyConditionPenalty() {
    this.conditionPenalty =
      CONDITION_PENALTIES[this.system.conditionTrack] || 0;
  }

  _prepareDefenses() {
    const { level, defenses } = this.system;
    for (let def of Object.values(defenses)) {
      const abilMod = def.ability
        ? this.system.abilities[def.ability].mod || 0
        : 0;
      def.level = level;
      def.total = level
        + (def.class          || 0)
        + abilMod
        + (def.armor          || 0)
        + (def.armoredDefense || 0)
        + (def.armorMastery   || 0)
        + (def.modifier       || 0)
        + (this.system.conditionTrack === "helpless" ? 0 : this.conditionPenalty);
    }
  }

  getHalfLevel() {
    return Math.floor(this.system.level / 2);
  }

  getSkillMod(skill) {
    if (this.system.conditionTrack === "helpless") return "N/A";
    let mod = skill.value
      + (this.system.abilities[skill.ability].mod || 0)
      + this.getHalfLevel();
    if (skill.trained) mod += 5;
    if (skill.focus)   mod += 5;
    return mod + this.conditionPenalty;
  }
}

class SWSEActorSheet extends ActorSheet {
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "actor"],
      template: "systems/swse/templates/actor/character-sheet.hbs",
      width: 800, height: "auto"
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
    for (let sel of [".add-feat", ".add-talent", ".add-gear", ".add-weapon"]) {
      html.find(sel).click(async () => {
        const key = sel.replace(".add-", "");
        const list = duplicate(this.actor.system[key] || []);
        list.push({ name: "", description: "" });
        await this.actor.update({ [`system.${key}`]: list });
      });
    }
  }

  _bindSecondWind(html) {
    html.find(".apply-second-wind").click(async () => {
      let { uses = 0, healing = 0 } = this.actor.system.secondWind;
      if (uses > 0 && healing > 0) {
        const newHP = Math.min(
          this.actor.system.hp.value + healing,
          this.actor.system.hp.max
        );
        await this.actor.update({
          "system.hp.value": newHP,
          "system.secondWind.uses": uses - 1
        });
      }
    });
  }
}

// Helpers
Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("getSkillMod", (skill, abilities, level, cond) => {
  if (cond === "helpless") return "N/A";
  let mod = skill.value
    + (abilities[skill.ability]?.mod || 0)
    + Math.floor(level / 2);
  if (skill.trained) mod += 5;
  if (skill.focus)   mod += 5;
  return mod + (CONDITION_PENALTIES[cond] || 0);
});
for (const [abbr, ab] of Object.entries(this.system.abilities)) {
  ab.base    = Math.max(0, ab.base);
  ab.racial  = (SWSE_RACES[this.system.race]?.bonuses[abbr] || 0);
  ab.total   = ab.base + ab.racial + (ab.temp || 0);
  ab.mod     = Math.floor((ab.total - 10) / 2);
}
