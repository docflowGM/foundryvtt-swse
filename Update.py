#!/usr/bin/env python3
"""
swse_sheet_updater.py

Backs up and replaces character-sheet.hbs and swse-actor.js in your local foundryvtt-swse repo.
Paths are targeted at your environment. Adjust paths if needed before running.

Usage:
    python swse_sheet_updater.py
"""

import os
import shutil
from datetime import datetime

# === CONFIG - adjust only if your paths differ ===
HBS_PATH = r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse\templates\actor\character-sheet.hbs"
JS_PATH  = r"C:\Users\Owner\Documents\GitHub\foundryvtt-swse\scripts\swse-actor.js"

# === Helper functions ===
def backup_file(path):
    if not os.path.isfile(path):
        print(f"[backup] No file at {path} to back up.")
        return None
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    dirname = os.path.dirname(path)
    base = os.path.basename(path)
    backup_name = f"{base}.backup.{ts}"
    backup_path = os.path.join(dirname, backup_name)
    shutil.copy2(path, backup_path)
    print(f"[backup] Created backup: {backup_path}")
    return backup_path

def write_file(path, content):
    dirname = os.path.dirname(path)
    if not os.path.isdir(dirname):
        os.makedirs(dirname, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"[write] Wrote file: {path}")

# === New character-sheet.hbs content ===
NEW_HBS = r"""{{!-- Updated SWSE Character Sheet (automatically generated) --}}
<div class="character-sheet">
  <header class="sheet-header">
    <h1>{{labels.sheetTitle}} — {{name}}</h1>
    <div class="sheet-controls">
      <button type="button" class="save-sheet">Save (flags)</button>
      <button type="button" class="load-sheet">Load (flags)</button>
    </div>
  </header>

  <section class="basic-info">
    <label>Name</label>
    <input name="name" value="{{name}}" />

    <label>Level</label>
    <input type="number" name="system.level" value="{{system.level}}" />

    <label>Class(es)</label>
    <div class="class-list">
      {{#each system.classes}}
        <div class="class-row">{{this.name}} (lvl {{this.level}})</div>
      {{/each}}
    </div>

    <label>Species</label>
    <select name="system.race" class="species-select">
      {{#each races}}
        <option value="{{@key}}" {{#if (eq @key ../system.race)}}selected{{/if}}>{{this.name}}</option>
      {{/each}}
    </select>

    <label>Destiny</label>
    <input type="number" name="system.destinyPoints.value" value="{{system.destinyPoints.value}}" class="small-input" />
  </section>

  <section class="main-stats">
    <div class="abilities">
      {{!-- abilities displayed from system --}}
      {{#each system.abilities}}
        <div class="ability">
          <label>{{@key}}</label>
          <input type="number" name="system.abilities.{{@key}}.base" value="{{this.base}}" />
          <span class="ability-mod">({{this.mod}})</span>
        </div>
      {{/each}}
    </div>

    <div class="combat">
      <div class="half-level">
        <label>½ Level</label>
        <div class="half-value">{{mathFloor (div system.level 2)}}</div>
      </div>

      <div class="hp-row">
        <label>HP</label>
        <input type="number" name="system.hp.value" value="{{system.hp.value}}" class="hp-small" />
        <span>/</span>
        <input type="number" name="system.hp.max" value="{{system.hp.max}}" class="hp-small" />
        <label>Temp</label>
        <input type="number" name="system.hp.temp" value="{{system.hp.temp}}" class="hp-small" />
      </div>

      <div class="force-row">
        <label>Force Points</label>
        <input type="number" name="system.forcePoints.value" value="{{system.forcePoints.value}}" class="fp-small" />
        <span>/</span>
        <input type="number" name="system.forcePoints.max" value="{{system.forcePoints.max}}" class="fp-small" />
        <select name="system.forcePoints.die" class="fp-die">
          <option value="1d6" {{#if (eq system.forcePoints.die "1d6")}}selected{{/if}}>1d6</option>
          <option value="1d8" {{#if (eq system.forcePoints.die "1d8")}}selected{{/if}}>1d8</option>
          <option value="1d10" {{#if (eq system.forcePoints.die "1d10")}}selected{{/if}}>1d10</option>
        </select>
      </div>

      <div class="dt-row">
        <label>Damage Threshold</label>
        <div class="dt-value">{{damageThreshold}}</div>
        <label>Misc</label>
        <input type="number" name="system.damageThresholdMisc" value="{{system.damageThresholdMisc}}" />
      </div>
    </div>
  </section>

  <section class="condition-secondwind">
    <div class="condition-track">
      <label>Condition</label>
      <select name="system.conditionTrack">
        <option value="normal" {{#if (eq system.conditionTrack "normal")}}selected{{/if}}>Normal</option>
        <option value="-1" {{#if (eq system.conditionTrack "-1")}}selected{{/if}}>-1</option>
        <option value="-2" {{#if (eq system.conditionTrack "-2")}}selected{{/if}}>-2</option>
        <option value="-5" {{#if (eq system.conditionTrack "-5")}}selected{{/if}}>-5</option>
        <option value="-10" {{#if (eq system.conditionTrack "-10")}}selected{{/if}}>-10</option>
        <option value="helpless" {{#if (eq system.conditionTrack "helpless")}}selected{{/if}}>Helpless</option>
      </select>
    </div>

    <div class="second-wind">
      <label>Second Wind</label>
      <div class="second-stats">
        <div>Auto heal: <strong>{{system.secondWind.healing}}</strong></div>
        <label>Misc</label>
        <input type="number" name="system.secondWind.misc" value="{{system.secondWind.misc}}" />
        <label>Uses</label>
        <input type="number" name="system.secondWind.uses" value="{{system.secondWind.uses}}" />
        <label>Max</label>
        <input type="number" name="system.secondWind.max" value="{{system.secondWind.max}}" />
        <button type="button" class="apply-second-wind">Take Second Wind</button>
      </div>
    </div>
  </section>

  <section class="tabs">
    <div class="tab-list">
      <button class="tab active" data-tab="armor">Armor & Equipment</button>
      <button class="tab" data-tab="feats">Feats & Talents</button>
      <button class="tab" data-tab="powers">Force Powers</button>
      <button class="tab" data-tab="weapons">Weapons</button>
    </div>

    <div class="tab-content armor active" id="armor-tab">
      {{!-- Armor list --}} 
      <div class="list-armor">
        {{#each items}}
          {{#if (eq this.type "armor")}}
            <div class="armor-entry">{{this.name}}</div>
          {{/if}}
        {{/each}}
      </div>
    </div>

    <div class="tab-content feats" id="feats-tab">
      {{!-- Feats & Talents --}}
      <div class="feats-list">
        {{#each system.feats}}
          <div class="feat-entry">{{this.name}}</div>
        {{/each}}
      </div>
    </div>

    <div class="tab-content powers" id="powers-tab">
      {{!-- Force powers rendered by items --}}
      {{#each items}}
        {{#if (eq this.type "forcepower")}}
          <div class="forcepower-entry" data-item-id="{{this._id}}">
            <div>{{this.name}} ({{this.system.uses.current}}/{{this.system.uses.max}})</div>
            <button class="roll-forcepower">Use</button>
          </div>
        {{/if}}
      {{/each}}
    </div>

    <div class="tab-content weapons" id="weapons-tab">
      {{#each system.weapons}}
        <div class="weapon-entry" data-index="{{@index}}">
          <div>{{this.name}} — Damage: {{this.damage}}</div>
          <button class="roll-weapon">Attack</button>
        </div>
      {{/each}}
    </div>
  </section>

  <footer class="sheet-footer">
    <small>SWSE — Sheet generated by updater</small>
  </footer>
</div>

{{!-- Client-side script hooks (sheet behavior) --}}
<script>
  // Note: these jQuery selectors assume Foundry's rendered HTML context where `html` is available.
  // The ActorSheet.activateListeners will bind these to foundry events.
</script>

<style>
/* Compact styling shortcuts (keeps your theme but compacts HP/FP) */
.character-sheet .hp-small { width: 64px; display:inline-block; }
.character-sheet .fp-small { width: 48px; display:inline-block; }
.character-sheet .fp-die { width: 72px; display:inline-block; }
.character-sheet .small-input { width: 48px; }
.character-sheet .second-wind { margin-top: 8px; padding: 8px; border: 1px solid #555; border-radius: 6px; background: rgba(255,255,255,0.04); }
</style>
"""

# === New swse-actor.js content ===
NEW_JS = r"""// swse-actor.js (upgraded by swse_sheet_updater.py)
// Adds defaults, second-wind auto-calculation, flag persistence, and simple data loader.

import { SWSE_RACES } from "./races.js";

const CONDITION_PENALTIES = { normal: 0, "-1": -1, "-2": -2, "-5": -5, "-10": -10, helpless: -100 };
const SIZE_SPEED_MOD = { tiny: 2, small: 1, medium: 0, large: -1, huge: -2, gargantuan: -4 };
const SIZE_DAMAGE_MOD = { tiny: -5, small: 0, medium: 0, large: 5, huge: 10, gargantuan: 20, colossal: 50 };

Hooks.once("init", async function() {
  // Load static JSON config into game.swse for availability in sheets
  if (!game.swse) game.swse = {};
  try {
    const basePath = "systems/swse/data";
    const [skills, attrs, classes] = await Promise.all([
      fetch(`${basePath}/skills.json`).then(r => r.ok ? r.json() : []),
      fetch(`${basePath}/attributes.json`).then(r => r.ok ? r.json() : []),
      fetch(`${basePath}/classes.json`).then(r => r.ok ? r.json() : [])
    ]);
    game.swse.skills = skills || [];
    game.swse.attributes = attrs || [];
    game.swse.classes = classes || [];
    console.log("SWSE: loaded data.json sources");
  } catch (err) {
    console.warn("SWSE: failed to load data JSON:", err);
  }

  // Attempt to load species compendium if present
  try {
    const pack = game.packs.get("swse.species");
    if (pack) {
      const docs = await pack.getDocuments();
      game.swse.species = {};
      for (const d of docs) game.swse.species[d.name] = d.system || {};
      console.log("SWSE: species compendium loaded");
    }
  } catch (err) {
    console.warn("SWSE: species compendium not available or failed:", err);
  }
});

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
    this._calculateSecondWind(); // ensure second wind healing is present
  }

  _ensureSystemStructure() {
    const sys = this.system;
    if (!sys.abilities) sys.abilities = {};
    ["str","dex","con","int","wis","cha"].forEach(ab => {
      if (!sys.abilities[ab]) sys.abilities[ab] = { base: 10, racial: 0, temp: 0, total: 10, mod: 0 };
      // normalize types
      sys.abilities[ab].base = Number(sys.abilities[ab].base || 10);
      sys.abilities[ab].racial = Number(sys.abilities[ab].racial || 0);
      sys.abilities[ab].temp = Number(sys.abilities[ab].temp || 0);
    });

    if (!sys.defenses) sys.defenses = {};
    ["reflex","fortitude","will"].forEach(def => {
      if (!sys.defenses[def]) {
        const abilityMap = { reflex: "dex", fortitude: "con", will: "wis" };
        sys.defenses[def] = { ability: abilityMap[def], class: 0, armor: 0, modifier: 0, total: 10 };
      }
    });

    if (!sys.hp) sys.hp = { value: 1, max: 1, temp: 0 };
    if (!sys.speed || typeof sys.speed === "number") sys.speed = { base: sys.speed || 6, total: sys.speed || 6 };
    if (!sys.forcePoints) sys.forcePoints = { value: 1, max: 1, die: "1d6" };
    if (!sys.destinyPoints) sys.destinyPoints = { value: 0, max: 0 };
    if (!sys.freeForcePowers) sys.freeForcePowers = { current: 0, max: 0 };
    if (!sys.secondWind) sys.secondWind = { uses: 1, max: 1, misc: 0, healing: 0 };
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
      ab.base = Math.max(0, Number(ab.base || 10));
      ab.racial = Number(bonuses[abbr] || 0);
      ab.temp = Number(ab.temp || 0);
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
      def.armor = Number(armor.system.defenseBonus || 0);
      def.maxDex = Number(armor.system.maxDex);
      def.maxSpeed = Number(armor.system.maxSpeed);
    } else {
      def.armor = 0;
      def.maxDex = null;
      def.maxSpeed = null;
    }
  }

  _applyDefenses() {
    const level = Number(this.system.level || 1);
    const pen = this.conditionPenalty;
    const hasArmored = this.items.some(i => i.type === "talent" && i.name === "Armored Defense");
    const hasImproved = this.items.some(i => i.type === "talent" && i.name === "Improved Armored Defense");

    for (const [key, def] of Object.entries(this.system.defenses || {})) {
      let abilMod = this.system.abilities?.[def.ability]?.mod || 0;
      if (key === "reflex" && def.armor > 0 && Number.isInteger(def.maxDex)) abilMod = Math.min(abilMod, def.maxDex);
      if (key === "reflex" && def.armor > 0 && !["armored","improved"].includes(def.option)) {
        def.option = hasImproved ? "improved" : (hasArmored ? "armored" : "none");
      }

      let baseValue;
      if (key === "reflex" && def.armor > 0) {
        switch (def.option) {
          case "armored": baseValue = Math.max(level, def.armor); break;
          case "improved": baseValue = Math.max(level + Math.floor(def.armor/2), def.armor); break;
          default: baseValue = def.armor;
        }
      } else baseValue = level;

      def.total = 10 + baseValue + abilMod + (def.class || 0) + (def.armorMastery || 0) + (def.modifier || 0) + (key !== "helpless" ? pen : 0);
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
      const lvl = Number(cls.system.level || 0);
      const rec = (cls.system.levels || {})[lvl] || {};
      total += Number(rec.bab || 0);
    }
    this.system.bab = total;
  }

  _replaceDefenseClassBonus() {
    const defs = this.system.defenses || {};
    for (const cls of this.items.filter(i => i.type === "class")) {
      const lvl = Number(cls.system.level || 0);
      const rec = (cls.system.levels || {})[lvl]?.defenses || {};
      for (const [key, d] of Object.entries(rec)) {
        if (defs[key] && (d.class || 0) > (defs[key].class || 0)) defs[key].class = d.class;
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
    const hasFeat = this.items.some(i => i.type === "feat" && i.name === "Improved Damage Threshold");
    const featBonus = hasFeat ? 5 : 0;
    this.system.damageThreshold = fort + sizeMod + featBonus + (this.system.damageThresholdMisc || 0);
  }

  _calculateInitiative() {
    const dexMod = this.system.abilities?.dex?.mod || 0;
    const misc = this.system.initiative?.misc || 0;
    if (!this.system.initiative) this.system.initiative = {};
    this.system.initiative.total = dexMod + misc;
  }

  _calculateSecondWind() {
    const con = (this.system.abilities?.con?.total) || (this.system.abilities?.con?.base) || 10;
    const maxHP = Number(this.system.hp?.max || 1);
    const misc = Number(this.system.secondWind?.misc || 0);
    const heal = Math.max(Math.floor(maxHP / 4), Math.floor(con)) + misc;
    this.system.secondWind = this.system.secondWind || {};
    this.system.secondWind.healing = heal;
    return heal;
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

    html.find(".add-weapon").click(this._onAddWeapon.bind(this));
    html.find(".remove-weapon").click(this._onRemoveWeapon.bind(this));
    html.find(".roll-weapon").click(this._onRollWeapon.bind(this));

    html.find(".add-feat").click(this._onAddFeat.bind(this));
    html.find(".remove-feat").click(this._onRemoveFeat.bind(this));
    html.find(".add-talent").click(this._onAddTalent.bind(this));
    html.find(".remove-talent").click(this._onRemoveTalent.bind(this));

    html.find(".add-forcepower").click(this._onAddForcePower.bind(this));
    html.find(".remove-forcepower").click(this._onRemoveForcePower.bind(this));
    html.find(".roll-forcepower").click(this._onRollForcePower.bind(this));
    html.find(".refresh-forcepowers").click(this._onRefreshForcePowers.bind(this));
    html.find(".reload-forcepower").click(this._onReloadForcePower.bind(this));

    html.find(".add-skill").click(this._onAddSkill.bind(this));
    html.find(".remove-skill").click(this._onRemoveSkill.bind(this));

    html.find(".level-up").click(this._onLevelUp.bind(this));

    html.find(".apply-second-wind").click(this._onSecondWind.bind(this));

    html.find(".open-store-btn").click(this._onOpenStore.bind(this));

    // Save/Load sheet data to flags
    html.find(".save-sheet").click(async ev => {
      ev.preventDefault();
      await this.actor.setFlag("swse", "sheetData", this.actor.system);
      ui.notifications.info("SWSE sheet data saved to flags.");
    });
    html.find(".load-sheet").click(async ev => {
      ev.preventDefault();
      const data = this.actor.getFlag("swse", "sheetData");
      if (!data) {
        ui.notifications.warn("No saved sheet data found in flags.");
        return;
      }
      await this.actor.update({ "system": data });
      ui.notifications.info("SWSE sheet data loaded from flags.");
    });
  }

  // --- existing handlers (kept but slightly updated to use flags where appropriate) ---
  async _onRollWeapon(event) {
    event.preventDefault();
    const idx = Number(event.currentTarget.closest(".weapon-entry")?.dataset.index);
    const weapon = this.actor.system.weapons?.[idx];
    if (!weapon) return;

    const abs = this.actor.system.abilities || {};
    const halfLevel = this.actor.getHalfLevel();
    const bab = this.actor.system.bab || 0;
    const atkMod = halfLevel + bab + (abs[weapon.attackAttr]?.mod || 0) + (weapon.focus ? 1 : 0) + (weapon.modifier || 0);

    const atkRoll = await new Roll(`1d20 + ${atkMod}`).evaluate({async: true});
    await atkRoll.toMessage({ speaker: ChatMessage.getSpeaker({actor: this.actor}), flavor: `${weapon.name} Attack` });

    let dmgMod = halfLevel + (weapon.modifier || 0);
    if (weapon.damageAttr === "str") dmgMod += abs.str?.mod || 0;
    if (weapon.damageAttr === "dex") dmgMod += abs.dex?.mod || 0;
    if (weapon.damageAttr === "2str") dmgMod += (abs.str?.mod || 0) * 2;
    if (weapon.damageAttr === "2dex") dmgMod += (abs.dex?.mod || 0) * 2;
    if (weapon.specialization) dmgMod += 1;

    const dmgRoll = await new Roll(`${weapon.damage} + ${dmgMod}`).evaluate({async: true});
    await dmgRoll.toMessage({ speaker: ChatMessage.getSpeaker({actor: this.actor}), flavor: `${weapon.name} Damage` });
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
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({actor: this.actor}), flavor: `Use the Force: ${power.name}` });

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

    const healing = this.actor._calculateSecondWind();
    const newHP = Math.min((this.actor.system.hp.value || 0) + healing, this.actor.system.hp.max || 1);

    await this.actor.update({
      "system.hp.value": newHP,
      "system.secondWind.uses": this.actor.system.secondWind.uses - 1
    });

    // Persist the sheet data snapshot into flags (so it's easy to restore)
    await this.actor.setFlag("swse", "sheetData", this.actor.system);

    ui.notifications.info(`Second Wind! Healed ${healing} HP.`);
  }
}
"""

# === Run backup + write ===
def main():
    print("SWSE sheet updater - starting")
    # backups
    backup_file(HBS_PATH)
    backup_file(JS_PATH)
    # write new files
    write_file(HBS_PATH, NEW_HBS)
    write_file(JS_PATH, NEW_JS)
    print("Done. Please restart Foundry/VTT to have JS changes take effect.")
    print("If you want me to instead generate only snippets or modify paths, re-run with edits.")

if __name__ == "__main__":
    main()
