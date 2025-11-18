/**
 * Item Data Models
 * Defines schemas for all SWSE item types
 */

// Weapon Data Model
export class WeaponDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      damage: new fields.StringField({required: true, initial: "1d8", label: "Damage"}),
      damageType: new fields.StringField({
        required: true,
        initial: "energy",
        choices: ["energy", "kinetic", "ion"],
        label: "Damage Type"
      }),
      attackBonus: new fields.NumberField({required: true, initial: 0, integer: true}),
      attackAttribute: new fields.StringField({
        required: true,
        initial: "str",
        choices: ["str", "dex"],
        label: "Attack Attribute"
      }),
      range: new fields.StringField({initial: "melee", label: "Range"}),
      weight: new fields.NumberField({required: true, initial: 1, min: 0}),
      cost: new fields.NumberField({required: true, initial: 0, min: 0}),
      equipped: new fields.BooleanField({required: true, initial: false}),
      description: new fields.HTMLField({label: "Description"}),
      
      // Special properties
      properties: new fields.ArrayField(new fields.StringField()),
      
      // Ammunition
      ammunition: new fields.SchemaField({
        type: new fields.StringField({initial: "none"}),
        current: new fields.NumberField({initial: 0, min: 0, integer: true}),
        max: new fields.NumberField({initial: 0, min: 0, integer: true})
      })
    };
  }
}

// Armor Data Model
export class ArmorDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      armorType: new fields.StringField({
        required: true,
        initial: "light",
        choices: ["light", "medium", "heavy"],
        label: "Armor Type"
      }),
      defenseBonus: new fields.NumberField({required: true, initial: 0, min: 0, integer: true}),
      maxDexBonus: new fields.NumberField({initial: null}),
      armorCheckPenalty: new fields.NumberField({required: true, initial: 0, integer: true}),
      fortBonus: new fields.NumberField({required: true, initial: 0, integer: true}),
      speedPenalty: new fields.NumberField({required: true, initial: 0, integer: true}),
      weight: new fields.NumberField({required: true, initial: 1, min: 0}),
      cost: new fields.NumberField({required: true, initial: 0, min: 0}),
      equipped: new fields.BooleanField({required: true, initial: false}),
      description: new fields.HTMLField({label: "Description"})
    };
  }
}

// Feat Data Model
export class FeatDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      featType: new fields.StringField({
        initial: "general",
        choices: ["general", "force", "species"],
        label: "Feat Type"
      }),
      prerequisite: new fields.HTMLField({label: "Prerequisites"}),
      benefit: new fields.HTMLField({label: "Benefit"}),
      special: new fields.HTMLField({label: "Special"}),
      normalText: new fields.HTMLField({label: "Normal"}),
      
      // Tracking
      uses: new fields.SchemaField({
        current: new fields.NumberField({initial: 0, min: 0, integer: true}),
        max: new fields.NumberField({initial: 0, min: 0, integer: true}),
        perDay: new fields.BooleanField({initial: false})
      })
    };
  }
}

// Talent Data Model
export class TalentDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      tree: new fields.StringField({required: true, label: "Talent Tree"}),
      prerequisite: new fields.HTMLField({label: "Prerequisites"}),
      benefit: new fields.HTMLField({label: "Benefit"}),
      special: new fields.HTMLField({label: "Special"}),
      
      // Tracking for activated talents
      uses: new fields.SchemaField({
        current: new fields.NumberField({initial: 0, min: 0, integer: true}),
        max: new fields.NumberField({initial: 0, min: 0, integer: true}),
        perEncounter: new fields.BooleanField({initial: false}),
        perDay: new fields.BooleanField({initial: false})
      })
    };
  }
}

// Force Power Data Model
export class ForcePowerDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      powerLevel: new fields.NumberField({
        required: true,
        initial: 1,
        min: 1,
        max: 6,
        integer: true,
        label: "Force Power Level"
      }),
      discipline: new fields.StringField({
        required: false,
        initial: "telekinetic",
        choices: ["telekinetic", "telepathic", "vital", "dark-side", "light-side"],
        label: "Force Discipline"
      }),
      useTheForce: new fields.NumberField({
        required: true,
        initial: 10,
        min: 0,
        integer: true,
        label: "Use the Force DC"
      }),
      time: new fields.StringField({initial: "Standard Action", label: "Activation Time"}),
      range: new fields.StringField({initial: "6 squares", label: "Range"}),
      target: new fields.StringField({initial: "One target", label: "Target"}),
      duration: new fields.StringField({initial: "Instantaneous", label: "Duration"}),
      effect: new fields.HTMLField({label: "Effect"}),
      special: new fields.HTMLField({label: "Special"}),

      // Descriptors (e.g., [Mind-Affecting], [Dark Side], [Telekinetic])
      // NOTE: Use 'tags' field for descriptors - this field is deprecated
      descriptor: new fields.ArrayField(
        new fields.StringField(),
        {label: "Descriptors (Deprecated - use tags)"}
      ),

      // DC Chart for powers with variable effects based on check result
      dcChart: new fields.ArrayField(
        new fields.SchemaField({
          dc: new fields.NumberField({required: true, integer: true, label: "DC"}),
          effect: new fields.StringField({required: true, label: "Effect Summary"}),
          description: new fields.StringField({label: "Detailed Description"})
        }),
        {label: "DC Chart"}
      ),

      // Maintainable powers can be sustained as a Swift action
      maintainable: new fields.BooleanField({initial: false, label: "Maintainable"}),

      // Optional Force Point enhancement
      forcePointEffect: new fields.HTMLField({label: "Force Point Enhancement", hint: "Additional effect if Force Point is spent"}),

      // Automatic Force Point cost (power always requires FP)
      forcePointCost: new fields.NumberField({initial: 0, min: 0, integer: true, label: "Force Point Cost"}),

      // Sourcebook reference
      sourcebook: new fields.StringField({initial: "", label: "Sourcebook"}),
      page: new fields.NumberField({required: false, integer: true, label: "Page Number"}),

      // Tags for categorization and filtering
      // Use for Force Power descriptors: 'dark-side', 'light-side', 'mind-affecting', 'telekinetic', 'telepathic', 'vital'
      tags: new fields.ArrayField(
        new fields.StringField(),
        {label: "Tags/Descriptors", hint: "e.g., dark-side, light-side, mind-affecting, telekinetic"}
      ),

      // Suite tracking
      inSuite: new fields.BooleanField({required: true, initial: false}),

      // Track if power is currently spent (used and awaiting restoration)
      spent: new fields.BooleanField({initial: false, label: "Power Spent"}),

      // Uses (for reloadable powers)
      uses: new fields.SchemaField({
        current: new fields.NumberField({initial: 0, min: 0, integer: true}),
        max: new fields.NumberField({initial: 0, min: 0, integer: true})
      })
    };
  }
}

// Class Data Model
export class ClassDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      classLevel: new fields.NumberField({
        required: true,
        initial: 1,
        min: 1,
        max: 20,
        integer: true
      }),
      hitDie: new fields.StringField({required: true, initial: "1d6"}),
      babProgression: new fields.StringField({
        required: true,
        initial: "medium",
        choices: ["slow", "medium", "fast"]
      }),
      fortSave: new fields.StringField({
        required: true,
        choices: ["slow", "fast"]
      }),
      refSave: new fields.StringField({
        required: true,
        choices: ["slow", "fast"]
      }),
      willSave: new fields.StringField({
        required: true,
        choices: ["slow", "fast"]
      }),
      classSkills: new fields.ArrayField(new fields.StringField()),
      defenseBonus: new fields.NumberField({required: true, initial: 0, integer: true}),
      reputation: new fields.NumberField({required: true, initial: 0, integer: true})
    };
  }
}

// Species Data Model
export class SpeciesDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      abilityModifiers: new fields.SchemaField({
        str: new fields.NumberField({initial: 0, integer: true}),
        dex: new fields.NumberField({initial: 0, integer: true}),
        con: new fields.NumberField({initial: 0, integer: true}),
        int: new fields.NumberField({initial: 0, integer: true}),
        wis: new fields.NumberField({initial: 0, integer: true}),
        cha: new fields.NumberField({initial: 0, integer: true})
      }),
      size: new fields.StringField({
        required: true,
        initial: "medium",
        choices: ["fine", "diminutive", "tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"]
      }),
      speed: new fields.NumberField({required: true, initial: 6, min: 0, integer: true}),
      bonusFeats: new fields.ArrayField(new fields.StringField()),
      traits: new fields.HTMLField({label: "Species Traits"}),
      languages: new fields.ArrayField(new fields.StringField())
    };
  }
}
