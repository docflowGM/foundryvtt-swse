//──────────────────────────────────────────────────────────────────────────────
// Imports & Constants
//──────────────────────────────────────────────────────────────────────────────
import { SWSE_RACES } from "./races.js";

const CONDITION_PENALTIES = {
  normal:   0,
  "-1":    -1,
  "-2":    -2,
  "-5":    -5,
  "-10": -10,
  helpless: -100
};

//──────────────────────────────────────────────────────────────────────────────
// Initialization
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
  this._applyArmorData();
  this._applyDefenses();
  this._applySpeed();
}


  _applyRacialAbilities() {
    const raceKey = this.system.race || "custom";
    const bonuses = SWSE_RACES[raceKey]?.bonuses || {};
    for (let [abbr, ab] of Object.entries(this.system.abilities)) {
      ab.base    = Math.max(0, ab.base);
      ab.racial  = bonuses[abbr] || 0;
      ab.total   = ab.base + ab.racial + (ab.temp || 0);
      ab.mod     = Math.floor((ab.total - 10) / 2);
    }
  }

  _applyConditionPenalty() {
    this.conditionPenalty =
      CONDITION_PENALTIES[this.system.conditionTrack] || 0;
  }

  _prepareDefenses() {
    const { level, defenses } = this.system;
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
        + (this.system.conditionTrack === "helpless"
           ? 0
           : this.conditionPenalty);
    }
  }
_applyArmorData() {
  // Assumes exactly one equipped armor item
  const armor = this.items.find(i => i.type === "armor" && i.system.equipped);
  const def   = this.system.defenses.reflex;
  if (armor) {
    def.armor    = armor.system.defenseBonus;
    def.maxDex   = armor.system.maxDex;
    def.maxSpeed = armor.system.maxSpeed;
  } else {
    def.armor    = 0;
    def.maxDex   = null;
    def.maxSpeed = null;
  }
}

_applyDefenses() {
  const { level, defenses } = this.system;
  const penalty = this.conditionPenalty;
  // Auto-detect Talents
  const hasArmored  = this.items.some(i =>
    i.type==="talent" && i.name==="Armored Defense"
  );
  const hasImproved = this.items.some(i =>
    i.type==="talent" && i.name==="Improved Armored Defense"
  );

  for (const [key, def] of Object.entries(defenses)) {
    // Base ability mod
    let abilMod = this.system.abilities[def.ability]?.mod || 0;

    // Cap Dex if armor applies
    if (key === "reflex" && def.armor > 0 && Number.isInteger(def.maxDex)) {
      abilMod = Math.min(abilMod, def.maxDex);
    }

    // Auto-set option if talent owned and no manual select
    if (key === "reflex" && def.armor > 0) {
      if (!["armored","improved"].includes(def.option)) {
        def.option = hasImproved ? "improved" : (hasArmored ? "armored" : "none");
      }
    }

    // Compute baseValue before adding ability & class
    let baseValue;
    if (key === "reflex" && def.armor > 0) {
      switch (def.option) {
        case "armored":
          baseValue = Math.max(level, def.armor);
          break;
        case "improved":
          const halfArmor = Math.floor(def.armor/2);
          baseValue = Math.max(level + halfArmor, def.armor);
          break;
        default:
          baseValue = def.armor;  // armor replaces level
      }
    } else {
      baseValue = level;       // fortitude & will always use level
    }

    def.total = baseValue
      + abilMod
      + (def.class        || 0)
      + (def.armorMastery || 0)
      + (def.modifier     || 0)
      + (key !== "helpless" ? penalty : 0);
  }
}

_applySpeed() {
  // Size speed modifiers (squares)
  const SIZE_MOD = {
    tiny:         2,
    small:        1,
    medium:      0,
    large:      -1,
    huge:       -2,
    gargantuan: -4
  };
  const { size, speed, defenses } = this.system;
  const sizeMod = SIZE_MOD[size] || 0;
  let total    = (speed.base || 0) + sizeMod;

  // Cap by armor’s maxSpeed
  const cap = defenses.reflex.maxSpeed;
  if (Number.isInteger(cap) && total > cap) total = cap;

  this.system.speed.total = total;
}

  getHalfLevel() {
    return Math.floor(this.system.level / 2);
  }

  getConditionPenalty() {
    return this.conditionPenalty;
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

  /** Compute an attack modifier for a weapon */
  getAttackMod(weapon) {
    // example: weapon.attackBonus + ability mod + half level
    const baseBonus   = weapon.attackBonus || 0;
    const abilMod     = this.system.abilities[weapon.ability]?.mod || 0;
    const halfLevel   = this.getHalfLevel();
    return baseBonus + abilMod + halfLevel + this.getConditionPenalty();
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
    this._bindWeaponRoll(html);
  }

  _bindListButtons(html) {
    for (const sel of [".add-feat", ".add-talent", ".add-gear", ".add-weapon"]) {
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
      const { uses = 0, healing = 0 } = this.actor.system.secondWind;
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

  _bindWeaponRoll(html) {
    html.find(".roll-weapon").click(ev => {
      ev.preventDefault();
      const idx    = Number(ev.currentTarget.closest(".list-entry").dataset.index);
      const weapon = this.actor.system.weapons[idx];
      const defaultMod = this.actor.getAttackMod(weapon);
      this._showAttackDialog(weapon, defaultMod);
    });
  }

  /** Show a roll dialog for a weapon attack */
  _showAttackDialog(weapon, defaultMod) {
    const content = `
      <form>
        <div class="form-group">
          <label>Weapon</label>
          <input type="text" name="name" value="${weapon.name}" disabled />
        </div>
        <div class="form-group">
          <label>Base Attack</label>
          <input type="number" name="base" value="${defaultMod}" disabled />
        </div>
        <div class="form-group">
          <label>Extra Modifier</label>
          <input type="number" name="modifier" value="0" />
        </div>
        <div class="form-group">
          <label>Action</label>
          <select name="action">
            <option value="">None</option>
            <option value="charge">Charge</option>
            <option value="block">Block</option>
            <option value="deflect">Deflect</option>
          </select>
        </div>
      </form>
    `;

    new Dialog({
      title: `Attack Roll: ${weapon.name}`,
      content,
      buttons: {
        roll: {
          icon: "<i class='fas fa-dice'></i>",
          label: "Roll",
          callback: dlg => {
            const extra  = Number(dlg.find("[name=modifier]").val()) || 0;
            const action = dlg.find("[name=action]").val();
            let totalMod = defaultMod + extra;
            // e.g. if (action === "charge") totalMod += 2;
            const formula = `1d20 + ${totalMod}`;
            new Roll(formula).roll({ async: false })
              .toMessage({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flavor: `${weapon.name}${action ? ` (${action})` : ""}`
              });
          }
        },
        cancel: {
          icon: "<i class='fas fa-times'></i>",
          label: "Cancel"
        }
      },
      default: "roll"
    }).render(true);
  }
}
activateListeners(html) {
  super.activateListeners(html);
  // … your existing binds …

  // Add/custom force powers
  html.find(".add-forcepower").click(async () => {
    // Create an embedded Force Power item with default uses
    await this.actor.createEmbeddedDocuments("Item", [{
      name: "New Force Power",
      type: "forcepower",
      img: "icons/svg/mystery-man.svg",
      system: {
        description: "",
        uses: { current: 1, max: 1 },
        results: []
      }
    }]);
  });

  // Refresh all uses back to max
  html.find(".refresh-forcepowers").click(async () => {
    const updates = this.actor.items
      .filter(i => i.type === "forcepower")
      .map(i => ({
        _id: i.id,
        "system.uses.current": i.system.uses.max
      }));
    await this.actor.updateEmbeddedDocuments("Item", updates);
  });

  // Use a single force power (decrement + roll)
  html.find(".roll-forcepower").click(async ev => {
    const li     = ev.currentTarget.closest(".forcepower-entry");
    const itemId = li.dataset.itemId;
    const power  = this.actor.items.get(itemId);

    // Prevent if no uses left
    if (power.system.uses.current < 1) return ui.notifications.warn("No uses remaining.");

    // Decrement uses
    await this.actor.updateEmbeddedDocuments("Item", [{
      _id: itemId,
      "system.uses.current": power.system.uses.current - 1
    }]);

    // Roll Use-the-Force check via your existing logic
    const skill = this.actor.system.skills.use_the_force;
    const base  = this.actor.getSkillMod(skill);
    // You can pop your Dialog here, but for brevity we do raw roll:
    const roll  = new Roll(`1d20 + ${base}`).roll({ async: false });
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<strong>${power.name}</strong>`
    });

    // Lookup outcome from power.system.results (array of {dc,message})
    const result = (power.system.results || [])
      .sort((a,b) => b.dc - a.dc)
      .find(o => roll.total >= o.dc)?.message
      || "<em>No special effect.</em>";
    ChatMessage.create({ content: `<p>${result}</p>` });
  });

  // Reload a single force power by spending 1 FP
  html.find(".reload-forcepower").click(async ev => {
    const li     = ev.currentTarget.closest(".forcepower-entry");
    const itemId = li.dataset.itemId;
    const power  = this.actor.items.get(itemId);
    const fp     = this.actor.system.forcePoints.value || 0;
    if (fp < 1) return ui.notifications.warn("Not enough Force Points.");

    // Restore one use and deduct 1 FP
    await this.actor.update({
      "system.forcePoints.value": fp - 1
    });
    await this.actor.updateEmbeddedDocuments("Item", [{
      _id: itemId,
      "system.uses.current": Math.min(
        power.system.uses.current + 1,
        power.system.uses.max
      )
    }]);
  });
}
//──────────────────────────────────────────────────────────────────────────────
// Helpers
//──────────────────────────────────────────────────────────────────────────────
Handlebars.registerHelper("eq", (a, b) => a === b);
Handlebars.registerHelper(
  "getSkillMod",
  (skill, abilities, level, cond) => {
    if (cond === "helpless") return "N/A";
    let mod = skill.value
      + (abilities[skill.ability]?.mod || 0)
      + Math.floor(level / 2);
    if (skill.trained) mod += 5;
    if (skill.focus)   mod += 5;
    return mod + (CONDITION_PENALTIES[cond] || 0);
  }
);
