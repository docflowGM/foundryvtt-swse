// ============================================
// FILE: scripts/swse-actor.js
// ============================================
import { SWSE_RACES } from "./races.js";

const CONDITION_PENALTIES = {
  normal: 0, "-1": -1, "-2": -2, "-5": -5, "-10": -10, helpless: -100
};

const SIZE_SPEED_MOD = {
  tiny: 2, small: 1, medium: 0, large: -1, huge: -2, gargantuan: -4
};

const SIZE_DAMAGE_MOD = {
  tiny: -5, small: 0, medium: 0, large: 5, huge: 10, gargantuan: 20, colossal: 50
};

export class SWSEActor extends Actor {
  prepareData() {
    super.prepareData();
    this._ensureSystemStructure();
    this._applyRacialAbilities();
    this._applyConditionPenalty();
    this._applyArmorData();
    this._applyDefenses();
    this._applySpeed();
    this._calculateBaB();
    this._replaceDefenseClassBonus();
    this._syncFreeForcePowers();
    this._applyDamageThreshold();
    this._calculateInitiative();
  }

  _ensureSystemStructure() {
    // Ensure all required system properties exist with defaults
    const sys = this.system;
    
    if (!sys.abilities) sys.abilities = {};
    ["str", "dex", "con", "int", "wis", "cha"].forEach(ab => {
      if (!sys.abilities[ab]) {
        sys.abilities[ab] = { base: 10, racial: 0, temp: 0, total: 10, mod: 0 };
      }
    });

    if (!sys.defenses) sys.defenses = {};
    ["reflex", "fortitude", "will"].forEach(def => {
      if (!sys.defenses[def]) {
        const abilityMap = { reflex: "dex", fortitude: "con", will: "wis" };
        sys.defenses[def] = {
          ability: abilityMap[def],
          class: 0,
          armor: 0,
          modifier: 0,
          total: 10
        };
      }
    });

    if (!sys.hp) sys.hp = { value: 1, max: 1 };
    if (!sys.speed) sys.speed = { base: 6, total: 6 };
    if (!sys.forcePoints) sys.forcePoints = { value: 1, max: 1 };
    if (!sys.destinyPoints) sys.destinyPoints = { value: 0, max: 0 };
    if (!sys.freeForcePowers) sys.freeForcePowers = { current: 0, max: 0 };
    if (!sys.secondWind) sys.secondWind = { uses: 1, healing: 0 };
    if (!sys.skills) sys.skills = {};
    if (!sys.weapons) sys.weapons = [];
    if (!sys.feats) sys.feats = [];
    if (!sys.talents) sys.talents = [];
    if (!sys.customSkills) sys.customSkills = [];
    if (!sys.level) sys.level = 1;
    if (!sys.bab) sys.bab = 0;
    if (!sys.size) sys.size = "medium";
    if (!sys.conditionTrack) sys.conditionTrack = "normal";
    if (!sys.race) sys.race = "custom";
  }

  _applyRacialAbilities() {
    const raceKey = this.system.race || "custom";
    const bonuses = SWSE_RACES[raceKey]?.bonuses || {};
    for (const [abbr, ab] of Object.entries(this.system.abilities || {})) {
      ab.base = Math.max(0, ab.base || 10);
      ab.racial = bonuses[abbr] || 0;
      ab.temp = ab.temp || 0;
      ab.total = ab.base + ab.racial + ab.temp;
      ab.mod = Math.floor((ab.total - 10) / 2);
    }
  }

  _applyConditionPenalty() {
    this.conditionPenalty = CONDITION_PENALTIES[this.system.conditionTrack] || 0;
  }

  _applyArmorData() {
    const armor = this.items.find(i => i.type === "armor" && i.system?.equipped);
    const def = this.system.defenses?.reflex;
    if (!def) return;
    
    if (armor) {
      def.armor = armor.system.defenseBonus || 0;
      def.maxDex = armor.system.maxDex;
      def.maxSpeed = armor.system.maxSpeed;
    } else {
      def.armor = 0;
      def.maxDex = null;
      def.maxSpeed = null;
    }
  }

  _applyDefenses() {
    const level = this.system.level || 1;
    const pen = this.conditionPenalty;
    const hasArmored = this.items.some(i => i.type === "talent" && i.name === "Armored Defense");
    const hasImproved = this.items.some(i => i.type === "talent" && i.name === "Improved Armored Defense");

    for (const [key, def] of Object.entries(this.system.defenses || {})) {
      let abilMod = this.system.abilities?.[def.ability]?.mod || 0;
      
      if (key === "reflex" && def.armor > 0 && Number.isInteger(def.maxDex)) {
        abilMod = Math.min(abilMod, def.maxDex);
      }

      if (key === "reflex" && def.armor > 0 && !["armored", "improved"].includes(def.option)) {
        def.option = hasImproved ? "improved" : (hasArmored ? "armored" : "none");
      }

      let baseValue;
      if (key === "reflex" && def.armor > 0) {
        switch (def.option) {
          case "armored":
            baseValue = Math.max(level, def.armor);
            break;
          case "improved":
            baseValue = Math.max(level + Math.floor(def.armor / 2), def.armor);
            break;
          default:
            baseValue = def.armor;
        }
      } else {
        baseValue = level;
      }

      def.total = 10 + baseValue + abilMod + (def.class || 0) + 
                  (def.armorMastery || 0) + (def.modifier || 0) + 
                  (key !== "helpless" ? pen : 0);
    }
  }

  _applySpeed() {
    const size = this.system.size || "medium";
    const sizeMod = SIZE_SPEED_MOD[size] || 0;
    let total = (this.system.speed?.base || 6) + sizeMod;
    const cap = this.system.defenses?.reflex?.maxSpeed;
    if (Number.isInteger(cap) && total > cap) total = cap;
    if (this.system.speed) this.system.speed.total = total;
  }

  _calculateBaB() {
    let total = 0;
    for (const cls of this.items.filter(i => i.type === "class")) {
      const lvl = cls.system.level || 0;
      const rec = cls.system.levels?.[lvl] || {};
      total += rec.bab || 0;
    }
    this.system.bab = total;
  }

  _replaceDefenseClassBonus() {
    const defs = this.system.defenses || {};
    for (const cls of this.items.filter(i => i.type === "class")) {
      const lvl = cls.system.level || 0;
      const rec = cls.system.levels?.[lvl]?.defenses || {};
      for (const [key, d] of Object.entries(rec)) {
        if (defs[key] && (d.class || 0) > (defs[key].class || 0)) {
          defs[key].class = d.class;
        }
      }
    }
  }

  _syncFreeForcePowers() {
    const hasFT = this.items.some(i => i.type === "feat" && i.name === "Force Training");
    if (!hasFT) return;
    const wisMod = this.system.abilities?.wis?.mod || 0;
    const maxFP = Math.max(1, 1 + wisMod);
    if (!this.system.freeForcePowers) this.system.freeForcePowers = {};
    this.system.freeForcePowers.max = maxFP;
    if (!this.system.freeForcePowers.current || this.system.freeForcePowers.current < maxFP) {
      this.system.freeForcePowers.current = maxFP;
    }
  }

  _applyDamageThreshold() {
    const fort = this.system.defenses?.fortitude?.total || 10;
    const size = this.system.size || "medium";
    const sizeMod = SIZE_DAMAGE_MOD[size] || 0;
    const hasFeat = this.items.some(i => 
      i.type === "feat" && i.name === "Improved Damage Threshold"
    );
    const featBonus = hasFeat ? 5 : 0;
    this.system.damageThreshold = fort + sizeMod + featBonus;
  }

  _calculateInitiative() {
    const dexMod = this.system.abilities?.dex?.mod || 0;
    const misc = this.system.initiative?.misc || 0;
    if (!this.system.initiative) this.system.initiative = {};
    this.system.initiative.total = dexMod + misc;
  }

  // Helper methods
  getSkillMod(skill) {
    if (!skill) return 0;
    const abilMod = this.system.abilities?.[skill.ability]?.mod || 0;
    const trained = skill.trained ? 5 : 0;
    const focus = skill.focus ? 1 : 0;
    const halfLevel = Math.floor(this.system.level / 2);
    return abilMod + trained + focus + halfLevel + this.conditionPenalty;
  }

  getHalfLevel() {
    return Math.floor((this.system.level || 1) / 2);
  }
}

export class SWSEActorSheet extends ActorSheet {
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ["swse", "sheet", "actor", "character"],
      template: "systems/swse/templates/actor/character-sheet.hbs",
      width: 900,
      height: 650,
      tabs: [{navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "main"}],
      resizable: true
    });
  }

  getData() {
    const context = super.getData();
    context.system = this.actor.system;
    context.items = this.actor.items.map(i => i.toObject());
    context.damageThreshold = this.actor.system.damageThreshold;
    context.races = SWSE_RACES;
    context.labels = {
      sheetTitle: game.i18n.localize("SWSE.SheetLabel.character") || "Character"
    };
    return context;
  }

  activateListeners(html) {
    super.activateListeners(html);
    
    // Weapon management
    html.find(".add-weapon").click(this._onAddWeapon.bind(this));
    html.find(".remove-weapon").click(this._onRemoveWeapon.bind(this));
    html.find(".roll-weapon").click(this._onRollWeapon.bind(this));
    
    // Feat/Talent management
    html.find(".add-feat").click(this._onAddFeat.bind(this));
    html.find(".remove-feat").click(this._onRemoveFeat.bind(this));
    html.find(".add-talent").click(this._onAddTalent.bind(this));
    html.find(".remove-talent").click(this._onRemoveTalent.bind(this));
    
    // Force powers
    html.find(".add-forcepower").click(this._onAddForcePower.bind(this));
    html.find(".remove-forcepower").click(this._onRemoveForcePower.bind(this));
    html.find(".roll-forcepower").click(this._onRollForcePower.bind(this));
    html.find(".refresh-forcepowers").click(this._onRefreshForcePowers.bind(this));
    html.find(".reload-forcepower").click(this._onReloadForcePower.bind(this));
    
    // Skills
    html.find(".add-skill").click(this._onAddSkill.bind(this));
    html.find(".remove-skill").click(this._onRemoveSkill.bind(this));
    
    // Level up
    html.find(".level-up").click(this._onLevelUp.bind(this));
    
    // Second Wind
    html.find(".apply-second-wind").click(this._onSecondWind.bind(this));
  }

  async _onAddWeapon(event) {
    event.preventDefault();
    const weapons = foundry.utils.duplicate(this.actor.system.weapons || []);
    weapons.push({
      name: "New Weapon",
      description: "",
      damage: "1d8",
      attackAttr: "str",
      damageAttr: "str",
      focus: false,
      specialization: false,
      modifier: 0
    });
    await this.actor.update({"system.weapons": weapons});
  }

  async _onRemoveWeapon(event) {
    event.preventDefault();
    const idx = Number(event.currentTarget.closest(".weapon-entry")?.dataset.index);
    const weapons = foundry.utils.duplicate(this.actor.system.weapons || []);
    weapons.splice(idx, 1);
    await this.actor.update({"system.weapons": weapons});
  }

  async _onRollWeapon(event) {
    event.preventDefault();
    const idx = Number(event.currentTarget.closest(".weapon-entry")?.dataset.index);
    const weapon = this.actor.system.weapons?.[idx];
    if (!weapon) return;
    
    const abs = this.actor.system.abilities || {};
    const halfLevel = this.actor.getHalfLevel();
    const bab = this.actor.system.bab || 0;
    const atkMod = halfLevel + bab + (abs[weapon.attackAttr]?.mod || 0) + 
                   (weapon.focus ? 1 : 0) + (weapon.modifier || 0);
    
    const atkRoll = await new Roll(`1d20 + ${atkMod}`).evaluate({async: true});
    await atkRoll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: `${weapon.name} Attack`
    });
    
    // Damage roll
    let dmgMod = halfLevel + (weapon.modifier || 0);
    if (weapon.damageAttr === "str") dmgMod += abs.str?.mod || 0;
    if (weapon.damageAttr === "dex") dmgMod += abs.dex?.mod || 0;
    if (weapon.damageAttr === "2str") dmgMod += (abs.str?.mod || 0) * 2;
    if (weapon.damageAttr === "2dex") dmgMod += (abs.dex?.mod || 0) * 2;
    if (weapon.specialization) dmgMod += 1;
    
    const dmgRoll = await new Roll(`${weapon.damage} + ${dmgMod}`).evaluate({async: true});
    await dmgRoll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: `${weapon.name} Damage`
    });
  }

  async _onAddFeat(event) {
    event.preventDefault();
    const feats = foundry.utils.duplicate(this.actor.system.feats || []);
    feats.push({ name: "New Feat", description: "" });
    await this.actor.update({"system.feats": feats});
  }

  async _onRemoveFeat(event) {
    event.preventDefault();
    const idx = Number(event.currentTarget.closest(".list-entry")?.dataset.index);
    const feats = foundry.utils.duplicate(this.actor.system.feats || []);
    feats.splice(idx, 1);
    await this.actor.update({"system.feats": feats});
  }

  async _onAddTalent(event) {
    event.preventDefault();
    const talents = foundry.utils.duplicate(this.actor.system.talents || []);
    talents.push({ name: "New Talent", description: "" });
    await this.actor.update({"system.talents": talents});
  }

  async _onRemoveTalent(event) {
    event.preventDefault();
    const idx = Number(event.currentTarget.closest(".list-entry")?.dataset.index);
    const talents = foundry.utils.duplicate(this.actor.system.talents || []);
    talents.splice(idx, 1);
    await this.actor.update({"system.talents": talents});
  }

  async _onAddForcePower(event) {
    event.preventDefault();
    await this.actor.createEmbeddedDocuments("Item", [{
      name: "New Force Power",
      type: "forcepower",
      system: { uses: { current: 1, max: 1 } }
    }]);
  }

  async _onRemoveForcePower(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".forcepower-entry")?.dataset.itemId;
    if (itemId) {
      const item = this.actor.items.get(itemId);
      if (item) await item.delete();
    }
  }

  async _onRollForcePower(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".forcepower-entry")?.dataset.itemId;
    const power = this.actor.items.get(itemId);
    if (!power) return;
    
    if (power.system.uses.current <= 0) {
      ui.notifications.warn("No uses remaining!");
      return;
    }
    
    const wisMod = this.actor.system.abilities.wis?.mod || 0;
    const roll = await new Roll(`1d20 + ${wisMod}`).evaluate({async: true});
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      flavor: `Use the Force: ${power.name}`
    });
    
    await power.update({"system.uses.current": power.system.uses.current - 1});
  }

  async _onRefreshForcePowers(event) {
    event.preventDefault();
    for (const item of this.actor.items.filter(i => i.type === "forcepower")) {
      await item.update({"system.uses.current": item.system.uses.max});
    }
    ui.notifications.info("All Force Powers refreshed!");
  }

  async _onReloadForcePower(event) {
    event.preventDefault();
    if (this.actor.system.forcePoints.value <= 0) {
      ui.notifications.warn("No Force Points remaining!");
      return;
    }
    
    const itemId = event.currentTarget.closest(".forcepower-entry")?.dataset.itemId;
    const power = this.actor.items.get(itemId);
    if (!power) return;
    
    await this.actor.update({"system.forcePoints.value": this.actor.system.forcePoints.value - 1});
    await power.update({"system.uses.current": power.system.uses.max});
    ui.notifications.info(`${power.name} reloaded with Force Point!`);
  }

  async _onAddSkill(event) {
    event.preventDefault();
    const skills = foundry.utils.duplicate(this.actor.system.customSkills || []);
    skills.push({ name: "New Skill", value: 0, ability: "str" });
    await this.actor.update({"system.customSkills": skills});
  }

  async _onRemoveSkill(event) {
    event.preventDefault();
    const idx = Number(event.currentTarget.closest(".list-entry")?.dataset.index);
    const skills = foundry.utils.duplicate(this.actor.system.customSkills || []);
    skills.splice(idx, 1);
    await this.actor.update({"system.customSkills": skills});
  }

  async _onLevelUp(event) {
    event.preventDefault();
    const { SWSELevelUp } = await import("./swse-levelup.js");
    await SWSELevelUp.open(this.actor);
  }

  async _onSecondWind(event) {
    event.preventDefault();
    if (this.actor.system.secondWind.uses <= 0) {
      ui.notifications.warn("No Second Wind uses remaining!");
      return;
    }
    
    const healing = this.actor.system.secondWind.healing || 0;
    const newHP = Math.min(this.actor.system.hp.value + healing, this.actor.system.hp.max);
    
    await this.actor.update({
      "system.hp.value": newHP,
      "system.secondWind.uses": this.actor.system.secondWind.uses - 1
    });
    
    ui.notifications.info(`Second Wind! Healed ${healing} HP.`);
  }
}
