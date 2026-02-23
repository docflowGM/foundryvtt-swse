import { SWSELogger } from '../utils/logger.js';

import { getEffectiveHalfLevel } from '../actors/derived/level-split.js';

export class SWSEActorDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    if (!foundry?.data?.fields) {
      throw new Error('Foundry data fields not available - system initialization error');
    }
    const fields = foundry.data.fields;

    // Base schema with common actor fields
    return {
      // Abilities
      abilities: new fields.SchemaField({
        str: new fields.SchemaField({
          base: new fields.NumberField({ required: true, initial: 10, integer: true }),
          racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.NumberField({ required: true, initial: 0, integer: true }),
          total: new fields.NumberField({ required: true, initial: 10, integer: true }),
          mod: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),
        dex: new fields.SchemaField({
          base: new fields.NumberField({ required: true, initial: 10, integer: true }),
          racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.NumberField({ required: true, initial: 0, integer: true }),
          total: new fields.NumberField({ required: true, initial: 10, integer: true }),
          mod: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),
        con: new fields.SchemaField({
          base: new fields.NumberField({ required: true, initial: 10, integer: true }),
          racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.NumberField({ required: true, initial: 0, integer: true }),
          total: new fields.NumberField({ required: true, initial: 10, integer: true }),
          mod: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),
        int: new fields.SchemaField({
          base: new fields.NumberField({ required: true, initial: 10, integer: true }),
          racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.NumberField({ required: true, initial: 0, integer: true }),
          total: new fields.NumberField({ required: true, initial: 10, integer: true }),
          mod: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),
        wis: new fields.SchemaField({
          base: new fields.NumberField({ required: true, initial: 10, integer: true }),
          racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.NumberField({ required: true, initial: 0, integer: true }),
          total: new fields.NumberField({ required: true, initial: 10, integer: true }),
          mod: new fields.NumberField({ required: true, initial: 0, integer: true })
        }),
        cha: new fields.SchemaField({
          base: new fields.NumberField({ required: true, initial: 10, integer: true }),
          racial: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.NumberField({ required: true, initial: 0, integer: true }),
          total: new fields.NumberField({ required: true, initial: 10, integer: true }),
          mod: new fields.NumberField({ required: true, initial: 0, integer: true })
        })
      }),

      // Condition Track
      conditionTrack: new fields.SchemaField({
        current: new fields.NumberField({ required: true, initial: 0, min: 0, max: 5, integer: true }),
        persistent: new fields.BooleanField({ required: true, initial: false }),
        persistentSteps: new fields.NumberField({ required: true, initial: 0, min: 0, integer: true }),
        penalty: new fields.NumberField({ required: true, initial: 0, integer: true })
      }),

      // Defenses
      defenses: new fields.SchemaField({
        reflex: new fields.SchemaField({
          total: new fields.NumberField({ required: true, initial: 12, integer: true }),
          armor: new fields.NumberField({ required: true, initial: 0, integer: true }),
          classBonus: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.SchemaField({
            auto: new fields.SchemaField({}),
            user: new fields.SchemaField({})
          }),
          ability: new fields.StringField({ required: true, initial: 'dex' }),
          source: new fields.StringField({ required: false, initial: 'level' }),
          level: new fields.NumberField({ required: false, initial: 0, integer: true })
        }),
        fort: new fields.SchemaField({
          total: new fields.NumberField({ required: true, initial: 10, integer: true }),
          classBonus: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.SchemaField({
            auto: new fields.SchemaField({}),
            user: new fields.SchemaField({})
          }),
          ability: new fields.StringField({ required: true, initial: 'con' }),
          level: new fields.NumberField({ required: false, initial: 0, integer: true })
        }),
        will: new fields.SchemaField({
          total: new fields.NumberField({ required: true, initial: 11, integer: true }),
          classBonus: new fields.NumberField({ required: true, initial: 0, integer: true }),
          misc: new fields.SchemaField({
            auto: new fields.SchemaField({}),
            user: new fields.SchemaField({})
          }),
          ability: new fields.StringField({ required: true, initial: 'wis' }),
          level: new fields.NumberField({ required: false, initial: 0, integer: true })
        }),
        flatFooted: new fields.SchemaField({
          total: new fields.NumberField({ required: true, initial: 10, integer: true })
        })
      }),

      // Level
      level: new fields.NumberField({
        required: true,
        initial: 1,
        min: 1,
        max: 20,
        integer: true
      }),

      // Skills (base empty, will be extended in child classes)
      skills: new fields.SchemaField({}),

      // Size
      size: new fields.StringField({ required: false, initial: 'medium' }),

      // Speed
      speed: new fields.NumberField({ required: true, initial: 6, min: 0 }),

      // JSON-backed + progression-owned fields (kept permissive)
      languages: new fields.ArrayField(new fields.StringField({ required: true, initial: '' }), { required: true, initial: [] }),
      languageIds: new fields.ArrayField(new fields.StringField({ required: true, initial: '' }), { required: true, initial: [] }),
      languageUuids: new fields.ArrayField(new fields.StringField({ required: true, initial: '' }), { required: true, initial: [] }),
      backgroundId: new fields.StringField({ required: false, initial: '' }),
      backgroundUuid: new fields.StringField({ required: false, initial: '' }),
      progression: new fields.ObjectField({ required: true, initial: {} })
    };
  }

  /* -------------------------------------------------------------------------- */
  /* DERIVED DATA (CORE RULE ENGINE)                                            */
  /* -------------------------------------------------------------------------- */

  prepareDerivedData() {
    this._calculateAbilities();
    this._applyConditionPenalties();

    if (this.parent?.type === 'droid') {
      this._calculateDroidDerivedData();
    }

    this._calculateDefenses();
    this._calculateSkills();
    // BAB is progression-owned, never computed here (see PROGRESSION_COMPILER.md)
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
    system.attributes.con.mod = system.attributes.str.mod;

    // --- Locomotion speed
    if (system.activeLocomotion && system.locomotion?.length) {
      const loco = system.locomotion.find(l => l.id === system.activeLocomotion);
      if (loco?.speedBySize) {
        system.speed = loco.speedBySize[system.size] ?? system.speed;
      }
    }

    // ===== PHASE 0: LEGACY ARMOR CALCULATION =====
    // TO BE REMOVED AFTER PHASE 1 (ModifierEngine registration complete)
    // This section applies armor bonuses directly to defenses and skills.
    // It will be deprecated once armor modifiers are registered.
    // @deprecated Use ModifierEngine._getItemModifiers() instead

    // --- Built-in Droid Armor vs Worn Armor
    let armorBonus = 0;
    let maxDex = null;
    let acp = 0;

    const builtIn = system.droidArmor?.installed ? system.droidArmor : null;
    const worn = this.parent.items.find(
      i => i.type === 'armor' && i.system?.equipped
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

    // PHASE 1: Will consume ModifierEngine domain "defense.reflex"
    system.defenses.reflex.armor = armorBonus;

    // Clamp Dex (PHASE 1: will become ModifierEngine domain "defense.dexLimit")
    if (maxDex !== null) {
      system.attributes.dex.mod = Math.min(system.attributes.dex.mod, maxDex);
    }

    // Apply ACP to skills + attacks (PHASE 1: will become ModifierEngine domains "skill.*")
    const acpSkills = [
      'acrobatics', 'climb', 'endurance', 'initiative',
      'jump', 'stealth', 'swim'
    ];

    for (const skill of acpSkills) {
      if (system.skills[skill]) {
        system.skills[skill].armor = acp;
      }
    }
    // ===== END PHASE 0 LEGACY ARMOR BLOCK =====
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

    this.defenses.fort.total =
      10 + lvl + this.abilities.str.mod +
      this.defenses.fort.classBonus +
      this.defenses.fort.misc + cond;

    this.defenses.will.total =
      10 + lvl + this.abilities.wis.mod +
      this.defenses.will.classBonus +
      this.defenses.will.misc + cond;
  }

  /* -------------------------------------------------------------------------- */
  /* SKILLS                                                                     */
  /* -------------------------------------------------------------------------- */

  _calculateSkills() {
    const half = this.parent ? getEffectiveHalfLevel(this.parent) : Math.floor((Number(this.level) || 0) / 2);
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
    this.damageThreshold = this.defenses.fort.total;
  }

  _calculateInitiative() {
    this.initiative = this.skills.initiative.total;
  }
}