// systems/swse/scripts/swse-actor.js
import { SWSE_RACES } from "./races.js";

//
// Constants
//
const CONDITION_PENALTIES = {
  normal: 0,
  "-1": -1,
  "-2": -2,
  "-5": -5,
  "-10": -10,
  helpless: -100
};

const SIZE_SPEED_MOD = {
  tiny: 2,
  small: 1,
  medium: 0,
  large: -1,
  huge: -2,
  gargantuan: -4
};

const SIZE_DAMAGE_MOD = {
  tiny: -5,
  small: 0,
  medium: 0,
  large: 5,
  huge: 10,
  gargantuan: 20,
  colossal: 50
};

//
// SWSEActor: Data Model & Preparation
//
export class SWSEActor extends Actor {
  prepareData() {
    super.prepareData();
    this._applyRacialAbilities();
    this._applyConditionPenalty();
    this._applyArmorData();
    this._applyDefenses();
    this._applySpeed();
    this._calculateBaB();
    this._replaceDefenseClassBonus();
    this._syncFreeForcePowers();
    this._applyDamageThreshold(); // ✅ new
  }

  _applyRacialAbilities() {
    const raceKey = this.system.race || "custom";
    const bonuses = SWSE_RACES[raceKey]?.bonuses || {};
    for (const [abbr, ab] of Object.entries(this.system.abilities)) {
      ab.base = Math.max(0, ab.base);
      ab.racial = bonuses[abbr] || 0;
      ab.total = ab.base + ab.racial + (ab.temp || 0);
      ab.mod = Math.floor((ab.total - 10) / 2);
    }
  }

  _applyConditionPenalty() {
    this.conditionPenalty = CONDITION_PENALTIES[this.system.conditionTrack] || 0;
  }

  _applyArmorData() {
    const armor = this.items.find(i => i.type === "armor" && i.system?.equipped);
    const def = this.system.defenses.reflex;
    if (armor) {
      def.armor = armor.system.defenseBonus;
      def.maxDex = armor.system.maxDex;
      def.maxSpeed = armor.system.maxSpeed;
    } else {
      def.armor = 0;
      def.maxDex = null;
      def.maxSpeed = null;
    }
  }

  _applyDefenses() {
    const { level, defenses } = this.system;
    const pen = this.conditionPenalty;

    const hasArmored = this.items.some(i => i.type === "talent" && i.name === "Armored Defense");
    const hasImproved = this.items.some(i => i.type === "talent" && i.name === "Improved Armored Defense");

    for (const [key, def] of Object.entries(defenses)) {
      let abilMod = this.system.abilities[def.ability]?.mod || 0;
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
            const halfArmor = Math.floor(def.armor / 2);
            baseValue = Math.max(level + halfArmor, def.armor);
            break;
          default:
            baseValue = def.armor;
        }
      } else {
        baseValue = level;
      }

      def.total = baseValue
        + abilMod
        + (def.class || 0)
        + (def.armorMastery || 0)
        + (def.modifier || 0)
        + (key !== "helpless" ? pen : 0);
    }
  }

  _applySpeed() {
    const { size, speed, defenses } = this.system;
    const sizeMod = SIZE_SPEED_MOD[size] || 0;
    let total = (speed.base || 0) + sizeMod;
    const cap = defenses.reflex.maxSpeed;
    if (Number.isInteger(cap) && total > cap) total = cap;
    speed.total = total;
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
    const defs = this.system.defenses;
    for (const cls of this.items.filter(i => i.type === "class")) {
      const lvl = cls.system.level || 0;
      const rec = cls.system.levels?.[lvl]?.defenses || {};
      for (const [key, d] of Object.entries(rec)) {
        if (defs[key] && (d.class || 0) > defs[key].class) {
          defs[key].class = d.class;
        }
      }
    }
  }

  _syncFreeForcePowers() {
    const hasFT = this.items.some(i => i.type === "feat" && i.name === "Force Training");
    if (!hasFT) return;
    const wisMod = this.system.abilities.wis.mod;
    const maxFP = 1 + wisMod;
    const curFP = this.system.freeForcePowers.current || 0;
    this.system.freeForcePowers.max = maxFP;
    this.system.freeForcePowers.current = Math.max(curFP, maxFP);
  }

  // ✅ Damage Threshold Calculation
  _applyDamageThreshold() {
    const fort = this.system.defenses.fortitude?.total || 10;
    const size = this.system.size || "medium";
    const sizeMod = SIZE_DAMAGE_MOD[size] || 0;
    const hasFeat = this.items.some(i => i.type === "feat" && i.name === "Improved Damage Threshold");
    const featBonus = hasFeat ? 5 : 0;
    this.system.damageThreshold = fort + sizeMod + featBonus;
  }
}

//
// SWSEActorSheet: migrated to V2
//
export class SWSEActorSheet extends foundry.applications.api.DocumentSheetV2 {
  static defineOptions() {
    return foundry.utils.mergeObject(super.defineOptions(), {
      id: "swse-actor-sheet",
      classes: ["swse", "sheet", "actor", "character"],
      template: "systems/swse/templates/actor/character-sheet.hbs",
      width: 800,
      height: "auto",
      resizable: true
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.system = this.document.system;
    context.items = this.document.items.map(i => i.toObject());
    context.labels = {
      sheetTitle: game.i18n.localize("SWSE.SheetLabel.character")
    };
    context.damageThreshold = this.document.system.damageThreshold;
    return context;
  }

  addEventListeners(html) {
    super.addEventListeners(html);

    // Example roll binding
    html.find(".roll-weapon").on("click", async ev => {
      const idx = Number(ev.currentTarget.closest(".weapon-entry").dataset.index);
      const weapon = this.document.system.weapons[idx];
      if (!weapon) return;
      const abs = this.document.system.abilities;
      const atkMod = (this.document.system.bab || 0) + (abs[weapon.attackAttr]?.mod || 0);
      const roll = await new Roll(`1d20 + ${atkMod}`).evaluate({ async: true });
      roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor: this.document }) });
    });
  }
}

//
// Register Sheets
//
Hooks.once("init", () => {
  console.log("SWSE | Registering Actor Sheets");

  // Unregister core
  Actors.unregisterSheet("core", ActorSheet);

  // Register V2 sheet
  Actors.registerSheet("swse", SWSEActorSheet, {
    types: ["character"],
    makeDefault: true
  });
});
