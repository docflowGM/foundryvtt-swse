/**
 * Base Actor Data Model
 * This is the foundation that ALL actor types (character, NPC, vehicle) build upon.
 * Think of it as the common DNA that all actors share.
 */
export class SWSEActorDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // The six core abilities that define a character's raw potential
      abilities: new fields.SchemaField({
        str: new fields.SchemaField(this._abilitySchema()),
        dex: new fields.SchemaField(this._abilitySchema()),
        con: new fields.SchemaField(this._abilitySchema()),
        int: new fields.SchemaField(this._abilitySchema()),
        wis: new fields.SchemaField(this._abilitySchema()),
        cha: new fields.SchemaField(this._abilitySchema())
      }),

      // The three defenses that replace saving throws in SWSE
      defenses: new fields.SchemaField({
        reflex: new fields.SchemaField(this._defenseSchema()),
        fortitude: new fields.SchemaField(this._defenseSchema()),
        will: new fields.SchemaField(this._defenseSchema())
      }),

      // Health tracking
      hp: new fields.SchemaField({
        value: new fields.NumberField({required: true, initial: 1, min: 0}),
        max: new fields.NumberField({required: true, initial: 1, min: 1}),
        temp: new fields.NumberField({required: true, initial: 0, min: 0})
      }),

      // The unique condition track system
      conditionTrack: new fields.SchemaField({
        current: new fields.NumberField({
          required: true,
          initial: 0,
          min: 0,
          max: 5,
          label: "Current Step (0=Normal, 5=Helpless)"
        }),
        penalty: new fields.NumberField({
          required: true,
          initial: 0,
          label: "Current Penalty"
        }),
        persistent: new fields.BooleanField({
          required: true,
          initial: false,
          label: "Persistent Condition"
        })
      }),

      // Character progression
      level: new fields.NumberField({
        required: true,
        initial: 1,
        min: 1,
        max: 20
      }),

      experience: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0
      }),

      // Combat stats
      bab: new fields.NumberField({
        required: true,
        initial: 0,
        label: "Base Attack Bonus"
      }),

      damageThreshold: new fields.NumberField({
        required: true,
        initial: 10,
        label: "Damage Threshold"
      }),

      // Movement
      speed: new fields.SchemaField({
        base: new fields.NumberField({required: true, initial: 6}),
        armor: new fields.NumberField({required: true, initial: 0}),
        total: new fields.NumberField({required: true, initial: 6})
      }),

      // Size affects many calculations
      size: new fields.StringField({
        required: true,
        initial: "medium",
        choices: ["fine", "diminutive", "tiny", "small", "medium", 
                  "large", "huge", "gargantuan", "colossal"]
      }),

      // Skills - the complete list
      skills: new fields.SchemaField(this._generateSkillsSchema()),

      // Currency
      credits: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0
      })
    };
  }

  static _abilitySchema() {
    const fields = foundry.data.fields;
    return {
      base: new fields.NumberField({required: true, initial: 10, min: 1, max: 30}),
      racial: new fields.NumberField({required: true, initial: 0}),
      enhancement: new fields.NumberField({required: true, initial: 0, min: 0, max: 6}),
      temp: new fields.NumberField({required: true, initial: 0}),
      total: new fields.NumberField({required: true, initial: 10}),
      mod: new fields.NumberField({required: true, initial: 0})
    };
  }

  static _defenseSchema() {
    const fields = foundry.data.fields;
    return {
      base: new fields.NumberField({required: true, initial: 10}),
      armor: new fields.NumberField({required: true, initial: 0}),
      classBonus: new fields.NumberField({required: true, initial: 0}),
      natural: new fields.NumberField({required: true, initial: 0}),
      size: new fields.NumberField({required: true, initial: 0}),
      misc: new fields.NumberField({required: true, initial: 0}),
      total: new fields.NumberField({required: true, initial: 10})
    };
  }

  static _generateSkillsSchema() {
    const fields = foundry.data.fields;
    const skills = [
      'acrobatics', 'climb', 'deception', 'endurance', 'gatherInformation',
      'initiative', 'jump', 'knowledge', 'mechanics', 'perception',
      'persuasion', 'pilot', 'ride', 'stealth', 'survival',
      'swim', 'treatInjury', 'useComputer', 'useTheForce'
    ];

    const schema = {};
    for (const skill of skills) {
      schema[skill] = new fields.SchemaField({
        trained: new fields.BooleanField({required: true, initial: false}),
        focus: new fields.NumberField({required: true, initial: 0, min: 0}),
        misc: new fields.NumberField({required: true, initial: 0}),
        total: new fields.NumberField({required: true, initial: 0})
      });
    }
    return schema;
  }

  prepareDerivedData() {
    // Calculate all derived values in the correct order
    this._calculateAbilities();
    this._applyConditionPenalties();
    this._calculateDefenses();
    this._calculateSkills();
    this._calculateDamageThreshold();
    this._calculateSpeed();
  }

  _calculateAbilities() {
    for (const [key, ability] of Object.entries(this.abilities)) {
      ability.total = ability.base + ability.racial + ability.enhancement + ability.temp;
      ability.mod = Math.floor((ability.total - 10) / 2);
    }
  }

  _applyConditionPenalties() {
    const penalties = [0, -1, -2, -5, -10, 0]; // 0=Normal, 5=Helpless
    this.conditionTrack.penalty = penalties[this.conditionTrack.current];
  }

  _calculateDefenses() {
    const level = this.level || 1;

    // Reflex: 10 + armor/level + dex + size + misc
    const reflexArmor = this._getReflexArmorBonus();
    this.defenses.reflex.total = 10 + reflexArmor + 
      this.abilities.dex.mod + this.defenses.reflex.size + 
      this.defenses.reflex.misc + this.conditionTrack.penalty;

    // Fortitude: 10 + level + con/str + misc
    const fortAbility = Math.max(this.abilities.con.mod, this.abilities.str.mod);
    this.defenses.fortitude.total = 10 + level + fortAbility + 
      this.defenses.fortitude.misc + this.conditionTrack.penalty;

    // Will: 10 + level + wis + misc
    this.defenses.will.total = 10 + level + this.abilities.wis.mod + 
      this.defenses.will.misc + this.conditionTrack.penalty;
  }

  _getReflexArmorBonus() {
    // This is where the armor vs level logic happens
    const level = this.level || 1;
    const armorBonus = this.defenses.reflex.armor;

    // If wearing armor, use armor bonus, otherwise use level
    return armorBonus > 0 ? armorBonus : level;
  }

  _calculateSkills() {
    const halfLevel = Math.floor((this.level || 1) / 2);
    const abilityMap = {
      acrobatics: 'dex', climb: 'str', deception: 'cha',
      endurance: 'con', gatherInformation: 'cha', initiative: 'dex',
      jump: 'str', knowledge: 'int', mechanics: 'int',
      perception: 'wis', persuasion: 'cha', pilot: 'dex',
      ride: 'dex', stealth: 'dex', survival: 'wis',
      swim: 'str', treatInjury: 'wis', useComputer: 'int',
      useTheForce: 'cha'
    };

    for (const [skillKey, skill] of Object.entries(this.skills)) {
      const abilityKey = abilityMap[skillKey];
      const abilityMod = this.abilities[abilityKey]?.mod || 0;

      skill.total = halfLevel + abilityMod + 
        (skill.trained ? 5 : 0) + 
        (skill.focus * 5) + 
        skill.misc + 
        this.conditionTrack.penalty;
    }
  }

  _calculateDamageThreshold() {
    this.damageThreshold = this.defenses.fortitude.total;
  }

  _calculateSpeed() {
    this.speed.total = Math.max(0, this.speed.base - this.speed.armor);
  }
}
