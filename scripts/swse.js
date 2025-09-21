import { SWSE_RACES } from "./races.js";
import "./helpers.js";

Hooks.once("init", function() {
  CONFIG.Actor.documentClass = SWSEActor;
  Actors.registerSheet("swse", SWSEActorSheet, {
    types: ["character"],
    makeDefault: true
  });
});

const CONDITION_PENALTIES = {
  normal: 0,
  "-1": -1,
  "-2": -2,
  "-5": -5,
  "-10": -10,
  helpless: -100 // disables rolls
};

class SWSEActor extends Actor {
  prepareData() {
    super.prepareData();

    //── Abilities & Racial Bonuses ──────────────────────────────────────────
    const raceKey = this.system.race || "custom";
    const raceBonuses = SWSE_RACES[raceKey]?.bonuses || {};
    for (const [abbr, abObj] of Object.entries(this.system.abilities)) {
      abObj.base = Math.max(0, abObj.base);
      abObj.racial = raceBonuses[abbr] || 0;
      abObj.total = abObj.base + abObj.racial + (abObj.temp || 0);
      abObj.mod = Math.floor((abObj.total - 10) / 2);
    }

    //── Condition Penalty ────────────────────────────────────────────────────
    const condKey = this.system.conditionTrack || "normal";
    const condPenalty = CONDITION_PENALTIES[condKey] || 0;

    //── Defenses ─────────────────────────────────────────────────────────────
    for (const [defKey, defObj] of Object.entries(this.system.defenses)) {
      defObj.level = this.system.level;
      defObj.abilityValue = this.system.abilities[defObj.ability]?.mod || 0;
      defObj.total =
        defObj.level +
        (defObj.class || 0) +
        defObj.abilityValue +
        (defObj.armor || 0) +
        (defObj.armoredDefense || 0) +
        (defObj.armorMastery || 0) +
        (defObj.modifier || 0) +
        (condKey !== "helpless" ? condPenalty : 0);
    }
  }

  getHalfLevel() {
    return Math.floor(this.system.level / 2);
  }

  getConditionPenalty() {
    const condKey = this.system.conditionTrack || "normal";
    return CONDITION_PENALTIES[condKey] || 0;
  }

  getSkillMod(skill) {
    if (this.system.conditionTrack === "helpless") return "N/A";

    const halfLevel = this.getHalfLevel();
    const abilityMod = this.system.abilities[skill.ability]?.mod || 0;
    let mod = skill.value + abilityMod + halfLevel;
    if (skill.trained) mod += 5;
    if (skill.trained && skill.focus) mod += 5;
    return mod + this.getConditionPenalty();
  }
}

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

    // Add a blank entry to feats, talents, gear, or weapons
    for (const selector of [".add-feat", ".add-talent", ".add-gear", ".add-weapon"]) {
      html.find(selector).click(() => {
        const key = selector.replace(".add-", "");
        const list  = duplicate(this.actor.system[key] || []);
        list.push({ name: "", description: "" });
        this.actor.update({ [`system.${key}`]: list });
      });
    }

    // Second Wind button
    html.find(".apply-second-wind").click(() => {
      const healing = Number(this.actor.system.secondWind.healing) || 0;
      const uses    = this.actor.system.secondWind.uses   || 0;
      if (healing > 0 && uses > 0) {
        const newHP = Math.min(
          this.actor.system.hp.value + healing,
          this.actor.system.hp.max
        );
        this.actor.update({
          "system.hp.value": newHP,
          "system.secondWind.uses": uses - 1
        });
      }
    });
  }
}

// Handlebars Helpers
Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper("getSkillMod", (skill, abilities, level) => {
  const halfLevel = Math.floor(level / 2);
  const abilityMod = abilities[skill.ability]?.mod || 0;
  let mod = skill.value + abilityMod + halfLevel;
  if (skill.trained) mod += 5;
  if (skill.trained && skill.focus) mod += 5;

  const condKey = abilities._sheet.system.conditionTrack;
  const condPenalty = CONDITION_PENALTIES[condKey] || 0;
  if (condKey === "helpless") return "N/A";
  return mod + condPenalty;
});
