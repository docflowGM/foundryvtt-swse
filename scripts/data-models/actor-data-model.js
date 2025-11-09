export class SWSEActorDataModel extends foundry.abstract.TypeDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;

    return {
      // Abilities
      abilities: new fields.SchemaField({
        str: new fields.SchemaField(this._abilitySchema()),
        dex: new fields.SchemaField(this._abilitySchema()),
        con: new fields.SchemaField(this._abilitySchema()),
        int: new fields.SchemaField(this._abilitySchema()),
        wis: new fields.SchemaField(this._abilitySchema()),
        cha: new fields.SchemaField(this._abilitySchema())
      }),

      // Defenses
      defenses: new fields.SchemaField({
        reflex: new fields.SchemaField(this._defenseSchema()),
        fortitude: new fields.SchemaField(this._defenseSchema()),
        will: new fields.SchemaField(this._defenseSchema())
      }),

      // HP
      hp: new fields.SchemaField({
        value: new fields.NumberField({required: true, initial: 1, min: 0, integer: true}),
        max: new fields.NumberField({required: true, initial: 1, min: 1, integer: true}),
        temp: new fields.NumberField({required: true, initial: 0, min: 0, integer: true})
      }),

      // Condition Track
      conditionTrack: new fields.SchemaField({
        current: new fields.NumberField({required: true, initial: 0, min: 0, max: 5, integer: true}),
        persistent: new fields.BooleanField({required: true, initial: false}),
        penalty: new fields.NumberField({required: true, initial: 0, integer: true})
      }),

      // Level & Experience
      level: new fields.NumberField({required: true, initial: 1, min: 1, max: 20, integer: true}),
      experience: new fields.NumberField({required: true, initial: 0, min: 0, integer: true}),

      // Combat
      bab: new fields.NumberField({required: true, initial: 0, integer: true}),
      baseAttack: new fields.NumberField({required: true, initial: 0, integer: true}),
      initiative: new fields.NumberField({required: true, initial: 0, integer: true}),
      speed: new fields.NumberField({required: true, initial: 6, min: 0, integer: true}),
      damageThreshold: new fields.NumberField({required: true, initial: 10, integer: true}),

      // Skills
      skills: new fields.SchemaField(this._generateSkillsSchema()),

      // Resources
      credits: new fields.NumberField({required: true, initial: 0, min: 0, integer: true})
    };
  }

  static _abilitySchema() {
    const fields = foundry.data.fields;
    return {
      base: new fields.NumberField({required: true, initial: 10, min: 1, max: 30, integer: true}),
      racial: new fields.NumberField({required: true, initial: 0, integer: true}),
      misc: new fields.NumberField({required: true, initial: 0, integer: true}),
      total: new fields.NumberField({required: true, initial: 10, integer: true}),
      mod: new fields.NumberField({required: true, initial: 0, integer: true})
    };
  }

  static _defenseSchema() {
    const fields = foundry.data.fields;
    return {
      base: new fields.NumberField({required: true, initial: 10, integer: true}),
      armor: new fields.NumberField({required: true, initial: 0, integer: true}),
      ability: new fields.NumberField({required: true, initial: 0, integer: true}),
      classBonus: new fields.NumberField({required: true, initial: 0, integer: true}),
      misc: new fields.NumberField({required: true, initial: 0, integer: true}),
      total: new fields.NumberField({required: true, initial: 10, integer: true})
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
        focused: new fields.BooleanField({required: true, initial: false}),
        armor: new fields.NumberField({required: true, initial: 0, integer: true}),
        misc: new fields.NumberField({required: true, initial: 0, integer: true}),
        total: new fields.NumberField({required: true, initial: 0, integer: true})
      });
    }
    return schema;
  }

  prepareDerivedData() {
    this._calculateAbilities();
    this._applyConditionPenalties();
    this._calculateDefenses();
    this._calculateSkills();
    this._calculateBaseAttack();
    this._calculateDamageThreshold();
    this._calculateInitiative();
  }

  _calculateAbilities() {
    for (const [key, ability] of Object.entries(this.abilities)) {
      ability.total = ability.base + ability.racial + ability.misc;
      ability.mod = Math.floor((ability.total - 10) / 2);
    }
  }

  _applyConditionPenalties() {
    const penalties = [0, -1, -2, -5, -10, 0]; // 0=Normal, 5=Helpless
    this.conditionTrack.penalty = penalties[this.conditionTrack.current] || 0;
  }

  _calculateDefenses() {
    const level = this.level || 1;

    // Reflex
    const reflexArmor = this.defenses.reflex.armor > 0 ? this.defenses.reflex.armor : level;
    this.defenses.reflex.total = 10 + reflexArmor + this.abilities.dex.mod + 
                                  this.defenses.reflex.classBonus + this.defenses.reflex.misc;

    // Fortitude
    const fortAbility = Math.max(this.abilities.con.mod, this.abilities.str.mod);
    this.defenses.fortitude.total = 10 + level + fortAbility + 
                                     this.defenses.fortitude.classBonus + this.defenses.fortitude.misc;

    // Will
    this.defenses.will.total = 10 + level + this.abilities.wis.mod + 
                                this.defenses.will.classBonus + this.defenses.will.misc;
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
                    (skill.focused ? 5 : 0) + 
                    skill.armor + skill.misc + 
                    this.conditionTrack.penalty;
      
      // Add mod property (same as total) for template compatibility
      skill.mod = skill.total;
    }
  }

  _calculateDamageThreshold() {
    this.damageThreshold = this.defenses.fortitude.total;
  }

  _calculateInitiative() {
    this.initiative = (this.skills.initiative?.total || 0);
  }

  _calculateBaseAttack() {
    // Calculate base attack bonus based on level
    // This is a simple calculation - should be overridden by class-specific logic
    const level = this.level || 1;
    
    // Default to medium progression (3/4 level)
    this.bab = Math.floor(level * 0.75);
    
    // Also set baseAttack for template compatibility
    this.baseAttack = this.bab;
  }
}
