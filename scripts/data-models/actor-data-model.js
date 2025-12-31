import { SWSELogger } from '../utils/logger.js';

export class SWSEActorDataModel extends foundry.abstract.TypeDataModel {

  /* -------------------------------------------------------------------------- */
  /* DERIVED DATA (CORE RULE ENGINE)                                            */
  /* -------------------------------------------------------------------------- */

  prepareDerivedData() {
    this._calculateAbilities();
    this._applyConditionPenalties();

    if (this.parent?.type === "droid") {
      this._calculateDroidDerivedData();
    }

    this._calculateDefenses();
    this._calculateSkills();
    this._calculateBaseAttack();
    this._calculateDamageThreshold();
    this._calculateInitiative();
  }

  /* -------------------------------------------------------------------------- */
  /* ABILITIES                                                                  */
  /* -------------------------------------------------------------------------- */

  _calculateAbilities() {
    for (const ability of Object.values(this.abilities)) {
      ability.total = ability.base + ability.racial + ability.misc;
      ability.mod = Math.floor((ability.total - 10) / 2);
    }
  }

  /* -------------------------------------------------------------------------- */
  /* CONDITION TRACK                                                            */
  /* -------------------------------------------------------------------------- */

  _applyConditionPenalties() {
    const penalties = [0, -1, -2, -5, -10, 0];
    this.conditionTrack.penalty = penalties[this.conditionTrack.current] || 0;
  }

  /* -------------------------------------------------------------------------- */
  /* DROID DERIVED DATA                                                         */
  /* -------------------------------------------------------------------------- */

  _calculateDroidDerivedData() {
    const system = this;

    // --- STR replaces CON (except HP)
    system.abilities.con.mod = system.abilities.str.mod;

    // --- Locomotion speed
    if (system.activeLocomotion && system.locomotion?.length) {
      const loco = system.locomotion.find(l => l.id === system.activeLocomotion);
      if (loco?.speedBySize) {
        system.speed = loco.speedBySize[system.size] ?? system.speed;
      }
    }

    // --- Built-in Droid Armor vs Worn Armor
    let armorBonus = 0;
    let maxDex = null;
    let acp = 0;

    const builtIn = system.droidArmor?.installed ? system.droidArmor : null;
    const worn = this.parent.items.find(
      i => i.type === "armor" && i.system?.equipped
    )?.system;

    const source =
      builtIn && worn
        ? (builtIn.armorBonus >= worn.armorBonus ? builtIn : worn)
        : builtIn || worn;

    if (source) {
      armorBonus = source.armorBonus ?? 0;
      maxDex = source.maxDex ?? null;
      acp = source.armorCheckPenalty ?? 0;
    }

    system.defenses.reflex.armor = armorBonus;

    // Clamp Dex
    if (maxDex !== null) {
      system.abilities.dex.mod = Math.min(system.abilities.dex.mod, maxDex);
    }

    // Apply ACP to skills + attacks
    const acpSkills = [
      "acrobatics", "climb", "endurance", "initiative",
      "jump", "stealth", "swim"
    ];

    for (const skill of acpSkills) {
      if (system.skills[skill]) {
        system.skills[skill].armor = acp;
      }
    }
  }

  /* -------------------------------------------------------------------------- */
  /* DEFENSES                                                                   */
  /* -------------------------------------------------------------------------- */

  _calculateDefenses() {
    const lvl = this.level;
    const cond = this.conditionTrack.penalty;

    this.defenses.reflex.total =
      10 + this.defenses.reflex.armor +
      this.abilities.dex.mod +
      this.defenses.reflex.classBonus +
      this.defenses.reflex.misc + cond;

    this.defenses.fortitude.total =
      10 + lvl + this.abilities.str.mod +
      this.defenses.fortitude.classBonus +
      this.defenses.fortitude.misc + cond;

    this.defenses.will.total =
      10 + lvl + this.abilities.wis.mod +
      this.defenses.will.classBonus +
      this.defenses.will.misc + cond;
  }

  /* -------------------------------------------------------------------------- */
  /* SKILLS                                                                     */
  /* -------------------------------------------------------------------------- */

  _calculateSkills() {
    const half = Math.floor(this.level / 2);
    const map = {
      endurance: 'str'
    };

    for (const [k, skill] of Object.entries(this.skills)) {
      const ability = map[k] ?? skill.selectedAbility ?? 'dex';
      skill.total =
        half + this.abilities[ability].mod +
        (skill.trained ? 5 : 0) +
        (skill.focused ? 5 : 0) +
        (skill.miscMod || 0) +
        this.conditionTrack.penalty;
    }
  }

  /* -------------------------------------------------------------------------- */
  /* DAMAGE THRESHOLD                                                           */
  /* -------------------------------------------------------------------------- */

  _calculateDamageThreshold() {
    this.damageThreshold = this.defenses.fortitude.total;
  }

  _calculateInitiative() {
    this.initiative = this.skills.initiative.total;
  }

  _calculateBaseAttack() {
    this.bab = Math.floor(this.level * 0.75);
    this.baseAttack = this.bab;
  }
}