/**
 * Base Actor Data Model
 * Defines schema for all SWSE actors with validation and derived data preparation
 */

export class SWSEActorDataModel extends foundry.abstract.DataModel {
  
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      // Ability Scores
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
      
      // Hit Points
      hp: new fields.SchemaField({
        value: new fields.NumberField({
          required: true,
          initial: 1,
          min: 0,
          integer: true,
          label: "Current HP"
        }),
        max: new fields.NumberField({
          required: true,
          initial: 1,
          min: 1,
          integer: true,
          label: "Maximum HP"
        }),
        temp: new fields.NumberField({
          required: true,
          initial: 0,
          min: 0,
          integer: true,
          label: "Temporary HP"
        })
      }),
      
      // Damage Threshold
      damageThreshold: new fields.SchemaField({
        base: new fields.NumberField({required: true, initial: 0, integer: true}),
        armor: new fields.NumberField({required: true, initial: 0, integer: true}),
        misc: new fields.NumberField({required: true, initial: 0, integer: true}),
        total: new fields.NumberField({required: true, initial: 0, integer: true})
      }),
      
      // Level and Experience
      level: new fields.NumberField({
        required: true,
        initial: 1,
        min: 1,
        max: 20,
        integer: true,
        label: "Character Level"
      }),
      
      experience: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "Experience Points"
      }),
      
      // Base Attack Bonus
      bab: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        label: "Base Attack Bonus"
      }),
      
      // Condition Track
      conditionTrack: new fields.StringField({
        required: true,
        initial: "normal",
        choices: ["normal", "-1", "-2", "-5", "-10", "helpless"],
        label: "Condition Track"
      }),
      
      // Force Points
      forcePoints: new fields.SchemaField({
        value: new fields.NumberField({required: true, initial: 5, min: 0, integer: true}),
        max: new fields.NumberField({required: true, initial: 5, min: 0, integer: true})
      }),
      
      // Second Wind
      secondWind: new fields.SchemaField({
        uses: new fields.NumberField({required: true, initial: 1, min: 0, integer: true}),
        healing: new fields.NumberField({required: true, initial: 0, min: 0, integer: true})
      }),
      
      // Skills
      skills: new fields.SchemaField({
        acrobatics: new fields.SchemaField(this._skillSchema()),
        climb: new fields.SchemaField(this._skillSchema()),
        deception: new fields.SchemaField(this._skillSchema()),
        endurance: new fields.SchemaField(this._skillSchema()),
        gatherInformation: new fields.SchemaField(this._skillSchema()),
        initiative: new fields.SchemaField(this._skillSchema()),
        jump: new fields.SchemaField(this._skillSchema()),
        knowledge: new fields.SchemaField(this._skillSchema()),
        mechanics: new fields.SchemaField(this._skillSchema()),
        perception: new fields.SchemaField(this._skillSchema()),
        persuasion: new fields.SchemaField(this._skillSchema()),
        pilot: new fields.SchemaField(this._skillSchema()),
        ride: new fields.SchemaField(this._skillSchema()),
        stealth: new fields.SchemaField(this._skillSchema()),
        survival: new fields.SchemaField(this._skillSchema()),
        swim: new fields.SchemaField(this._skillSchema()),
        treatInjury: new fields.SchemaField(this._skillSchema()),
        useComputer: new fields.SchemaField(this._skillSchema()),
        useTheForce: new fields.SchemaField(this._skillSchema())
      }),
      
      // Size
      size: new fields.StringField({
        required: true,
        initial: "medium",
        choices: ["fine", "diminutive", "tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"],
        label: "Size Category"
      }),
      
      // Speed
      speed: new fields.SchemaField({
        base: new fields.NumberField({required: true, initial: 6, min: 0, integer: true}),
        armor: new fields.NumberField({required: true, initial: 0, integer: true}),
        misc: new fields.NumberField({required: true, initial: 0, integer: true}),
        total: new fields.NumberField({required: true, initial: 6, min: 0, integer: true})
      }),
      
      // Biography
      biography: new fields.HTMLField({label: "Biography"}),
      
      // Notes
      notes: new fields.HTMLField({label: "GM Notes"})
    };
  }
  
  static _abilitySchema() {
    const fields = foundry.data.fields;
    return {
      base: new fields.NumberField({
        required: true,
        initial: 10,
        min: 0,
        max: 30,
        integer: true,
        label: "Base Score"
      }),
      racial: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        label: "Racial Bonus"
      }),
      enhancement: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 6,
        integer: true,
        label: "Enhancement Bonus"
      }),
      temp: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        label: "Temporary Modifier"
      }),
      total: new fields.NumberField({
        required: true,
        initial: 10,
        integer: true,
        label: "Total Score"
      }),
      mod: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        label: "Ability Modifier"
      })
    };
  }
  
  static _defenseSchema() {
    const fields = foundry.data.fields;
    return {
      ability: new fields.StringField({
        required: true,
        initial: "dex",
        choices: ["str", "dex", "con", "int", "wis", "cha"],
        label: "Key Ability"
      }),
      levelArmor: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        label: "Level or Armor Bonus"
      }),
      classBonus: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        label: "Class Bonus"
      }),
      armor: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        label: "Armor Bonus"
      }),
      natural: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        label: "Natural Armor"
      }),
      misc: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        label: "Misc Modifier"
      }),
      total: new fields.NumberField({
        required: true,
        initial: 10,
        integer: true,
        label: "Total Defense"
      })
    };
  }
  
  static _skillSchema() {
    const fields = foundry.data.fields;
    return {
      trained: new fields.BooleanField({
        required: true,
        initial: false,
        label: "Trained"
      }),
      focusRanks: new fields.NumberField({
        required: true,
        initial: 0,
        min: 0,
        integer: true,
        label: "Skill Focus Ranks"
      }),
      misc: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        label: "Misc Modifier"
      }),
      total: new fields.NumberField({
        required: true,
        initial: 0,
        integer: true,
        label: "Total Modifier"
      })
    };
  }
  
  /**
   * Prepare derived data - called after base data is loaded
   */
  prepareDerivedData() {
    // Calculate ability modifiers
    this._prepareAbilities();
    
    // Calculate defenses
    this._prepareDefenses();
    
    // Calculate skills
    this._prepareSkills();
    
    // Calculate resources
    this._prepareResources();
    
    // Calculate speed
    this._prepareSpeed();
    
    // Calculate damage threshold
    this._prepareDamageThreshold();
  }
  
  _prepareAbilities() {
    for (const [key, ability] of Object.entries(this.abilities)) {
      ability.total = ability.base + ability.racial + ability.enhancement + ability.temp;
      ability.mod = Math.floor((ability.total - 10) / 2);
    }
  }
  
  _prepareDefenses() {
    // Import calculation module
    // This will be filled in by the calculation modules
  }
  
  _prepareSkills() {
    // Import calculation module
    // This will be filled in by the calculation modules
  }
  
  _prepareResources() {
    // Calculate Second Wind healing
    const level = this.parent.system.level || 1;
    const conMod = this.abilities.con.mod;
    this.secondWind.healing = Math.floor(level / 4) + conMod;
  }
  
  _prepareSpeed() {
    this.speed.total = Math.max(0, this.speed.base + this.speed.armor + this.speed.misc);
  }
  
  _prepareDamageThreshold() {
    const fortDef = this.defenses.fortitude.total;
    this.damageThreshold.total = fortDef + this.damageThreshold.armor + this.damageThreshold.misc;
  }
}
