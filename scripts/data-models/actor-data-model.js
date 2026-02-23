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

  }

  /* -------------------------------------------------------------------------- */
  /* DEFENSES                                                                   */
  /* -------------------------------------------------------------------------- */

  _calculateDefenses() {
    const lvl = this.level;
    const cond = this.conditionTrack.penalty;

    // PHASE 2 COMPLETION: Base-only calculation
    // Armor modifiers are applied by ModifierEngine, NOT here
    // This is the CRITICAL FIX: Remove direct armor calculation
    // Reflex.armor property removed from calculation (handled by ModifierEngine)

    this.defenses.reflex.total =
      10 + this.abilities.dex.mod +
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