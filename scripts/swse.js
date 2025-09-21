
import { SWSE_RACES } from "./races.js";
import "./helpers.js";

Hooks.once("init", function() {
  CONFIG.Actor.documentClass = SWSEActor;
  Actors.registerSheet("swse", SWSEActorSheet, { types: ["character"], makeDefault: true });
});

class SWSEActor extends Actor {
  prepareData() {
    super.prepareData();
    const raceKey = this.system.race || "custom";
    const raceBonuses = SWSE_RACES[raceKey]?.bonuses || {};
    for (const [key, ab] of Object.entries(this.system.abilities)) {
      ab.base = Math.max(0, ab.base);
      ab.racial = raceBonuses[key] || 0;
      ab.total = ab.base + ab.racial + (ab.temp || 0);
      ab.mod = Math.floor((ab.total - 10) / 2);
    }
    for (const [def, obj] of Object.entries(this.system.defenses)) {
      obj.level = this.system.level;
      obj.abilityValue = this.system.abilities[obj.ability]?.mod ?? 0;
      obj.total = obj.level + (obj.class || 0) + obj.abilityValue + (obj.armor || 0) + (obj.armoredDefense || 0) + (obj.armorMastery || 0) + (obj.modifier || 0);
    }
  }
  getHalfLevel() { return Math.floor(this.system.level / 2); }
  getSkillMod(skill) {
    const abilities = this.system.abilities;
    const halfLevel = this.getHalfLevel();
    const abilityMod = abilities[skill.ability] ? abilities[skill.ability].mod : 0;
    let mod = skill.value + abilityMod + halfLevel;
    if (skill.trained) mod += 5;
    if (skill.trained && skill.focus) mod += 5;
    return mod;
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

    // Add Feat
    html.find(".add-feat").click(ev => {
      const feats = duplicate(this.actor.system.feats || []);
      feats.push({ name: "", description: "" });
      this.actor.update({"system.feats": feats});
    });
    // Add Talent
    html.find(".add-talent").click(ev => {
      const talents = duplicate(this.actor.system.talents || []);
      talents.push({ name: "", description: "" });
      this.actor.update({"system.talents": talents});
    });
    // Add Gear
    html.find(".add-gear").click(ev => {
      const gear = duplicate(this.actor.system.gear || []);
      gear.push({ name: "", description: "" });
      this.actor.update({"system.gear": gear});
    });
    // Add Weapon
    html.find(".add-weapon").click(ev => {
      const weapons = duplicate(this.actor.system.weapons || []);
      weapons.push({ name: "", description: "" });
      this.actor.update({"system.weapons": weapons});
    });

    // Existing skill/roll listeners as before...
  }
}
Handlebars.registerHelper('eq', (a, b) => a === b);
Handlebars.registerHelper('getSkillMod', (skill, abilities, level) => {
  const halfLevel = Math.floor(level / 2);
  const abilityMod = abilities[skill.ability]?.mod ?? 0;
  let mod = skill.value + abilityMod + halfLevel;
  if (skill.trained) mod += 5;
  if (skill.trained && skill.focus) mod += 5;
  return mod;
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
    // Race logic as before...

    // Condition penalty
    const condKey = this.system.conditionTrack || "normal";
    const condPenalty = CONDITION_PENALTIES[condKey] || 0;

    // Abilities logic as before...

    // Skills mod: apply condition penalty unless helpless (then block all rolls)
    // (Implementation in getSkillMod)
    // Defenses: apply condition penalty
    for (const [def, obj] of Object.entries(this.system.defenses)) {
      obj.level = this.system.level;
      obj.abilityValue = this.system.abilities[obj.ability]?.mod ?? 0;
      obj.total = obj.level + (obj.class || 0) + obj.abilityValue +
        (obj.armor || 0) + (obj.armoredDefense || 0) + (obj.armorMastery || 0) +
        (obj.modifier || 0) + (condKey !== "helpless" ? condPenalty : 0);
    }
  }
  getConditionPenalty() {
    const condKey = this.system.conditionTrack || "normal";
    return CONDITION_PENALTIES[condKey] || 0;
  }
  getSkillMod(skill) {
    const abilities = this.system.abilities;
    const halfLevel = Math.floor(this.system.level / 2);
    const abilityMod = abilities[skill.ability] ? abilities[skill.ability].mod : 0;
    let mod = skill.value + abilityMod + halfLevel;
    if (skill.trained) mod += 5;
    if (skill.trained && skill.focus) mod += 5;
    const cond = this.getConditionPenalty();
    if (this.system.conditionTrack === "helpless") return "N/A";
    return mod + cond;
  }
}

class SWSEActorSheet extends ActorSheet {
  // ... as before ...
  activateListeners(html) {
    super.activateListeners(html);

    // Second wind button
    html.find(".apply-second-wind").click(ev => {
      const healing = parseInt(this.actor.system.secondWind.healing || 0, 10);
      if (healing > 0 && this.actor.system.secondWind.uses > 0) {
        let newHP = Math.min(
          this.actor.system.hp.value + healing,
          this.actor.system.hp.max
        );
        let newUses = this.actor.system.secondWind.uses - 1;
        this.actor.update({
          "system.hp.value": newHP,
          "system.secondWind.uses": newUses
        });
      }
    });

    // ... existing listeners ...
  }
}
