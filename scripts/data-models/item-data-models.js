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
      }),

      // Upgrade system
      upgradeSlots: new fields.NumberField({required: true, initial: 1, min: 0, integer: true, label: "Upgrade Slots"}),
      installedUpgrades: new fields.ArrayField(new fields.SchemaField({
        id: new fields.StringField({required: true}),
        name: new fields.StringField({required: true}),
        cost: new fields.NumberField({required: true, initial: 0, min: 0}),
        slotsUsed: new fields.NumberField({required: true, initial: 1, min: 0, integer: true}),
        description: new fields.HTMLField()
      }))
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
      description: new fields.HTMLField({label: "Description"}),

      // Upgrade system
      // Note: Powered armor gets 2 slots, regular armor gets 1
      upgradeSlots: new fields.NumberField({required: true, initial: 1, min: 0, integer: true, label: "Upgrade Slots"}),
      installedUpgrades: new fields.ArrayField(new fields.SchemaField({
        id: new fields.StringField({required: true}),
        name: new fields.StringField({required: true}),
        cost: new fields.NumberField({required: true, initial: 0, min: 0}),
        slotsUsed: new fields.NumberField({required: true, initial: 1, min: 0, integer: true}),
        description: new fields.HTMLField()
      }))
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
      level: new fields.NumberField({
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
        initial: "slow",
        choices: ["slow", "fast"]
      }),
      refSave: new fields.StringField({
        required: true,
        initial: "slow",
        choices: ["slow", "fast"]
      }),
      willSave: new fields.StringField({
        required: true,
        initial: "slow",
        choices: ["slow", "fast"]
      }),
      classSkills: new fields.ArrayField(new fields.StringField()),
      defenseBonus: new fields.NumberField({required: true, initial: 0, integer: true}),
      reputation: new fields.NumberField({required: true, initial: 0, integer: true}),

      // Computed defenses object (populated in prepareDerivedData)
      // This stores the per-level defense bonuses as numbers
      defenses: new fields.SchemaField({
        fortitude: new fields.NumberField({required: true, initial: 0}),
        reflex: new fields.NumberField({required: true, initial: 0}),
        will: new fields.NumberField({required: true, initial: 0})
      })
    };
  }

  prepareDerivedData() {
    // Convert save progression strings to FLAT defense bonuses
    // SWSE Rules:
    // - Defense bonuses are FLAT per class and do not scale with class level
    // - "fast" save = +1 bonus (heroic classes) or +2 (prestige classes)
    // - "slow" save = +0 bonus
    // - When multiclassing, use the HIGHEST bonus from any class, not additive

    if (!this.defenses) {
      this.defenses = { fortitude: 0, reflex: 0, will: 0 };
    }

    // For now, use +1 for "fast" saves (typical for heroic classes)
    // Prestige classes may override this with higher values
    this.defenses.fortitude = this.fortSave === "fast" ? 1 : 0;
    this.defenses.reflex = this.refSave === "fast" ? 1 : 0;
    this.defenses.will = this.willSave === "fast" ? 1 : 0;
  }

  /**
   * Migrate legacy data during document initialization
   * Converts numeric BAB progression values to string choices
   * Handles classLevel -> level field rename
   */
  static migrateData(source) {
    // Migrate classLevel to level (backwards compatibility)
    if (source.classLevel !== undefined && source.level === undefined) {
      source.level = source.classLevel;
      delete source.classLevel;
    }

    // Convert numeric babProgression to string
    if (source.babProgression !== undefined) {
      const bab = source.babProgression;
      if (typeof bab === 'number' || (typeof bab === 'string' && !isNaN(Number(bab)))) {
        const numValue = Number(bab);
        if (numValue <= 0.5) {
          source.babProgression = "slow";
        } else if (numValue < 1) {
          source.babProgression = "medium";
        } else {
          source.babProgression = "fast";
        }
      }
    }

    return super.migrateData(source);
  }
}

// Species Data Model
export class SpeciesDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      // Ability score modifiers
      abilityModifiers: new fields.SchemaField({
        str: new fields.NumberField({initial: 0, integer: true}),
        dex: new fields.NumberField({initial: 0, integer: true}),
        con: new fields.NumberField({initial: 0, integer: true}),
        int: new fields.NumberField({initial: 0, integer: true}),
        wis: new fields.NumberField({initial: 0, integer: true}),
        cha: new fields.NumberField({initial: 0, integer: true})
      }),

      // Legacy fields (kept for backward compatibility)
      abilities: new fields.StringField({initial: "None"}), // String format: "+2 Dex, -2 Con"
      skillBonuses: new fields.ArrayField(new fields.StringField()), // ["+2 Perception", "+2 Stealth"]
      special: new fields.ArrayField(new fields.StringField()), // Special abilities array
      source: new fields.StringField({initial: "Core"}), // Source book

      // Physical traits
      size: new fields.StringField({
        required: true,
        initial: "Medium",
        choices: ["Fine", "Diminutive", "Tiny", "Small", "Medium", "Large", "Huge", "Gargantuan", "Colossal"]
      }),
      speed: new fields.NumberField({required: true, initial: 6, min: 0, integer: true}),

      // Vision and sensory traits
      visionTraits: new fields.ArrayField(new fields.StringField()), // ["Low-Light Vision", "Darkvision", "Scent"]

      // Natural weapons
      naturalWeapons: new fields.ArrayField(new fields.SchemaField({
        name: new fields.StringField(),
        damage: new fields.StringField(),
        type: new fields.StringField() // "slashing", "piercing", "bludgeoning"
      })),

      // Movement traits
      movementTraits: new fields.ArrayField(new fields.StringField()), // ["Aquatic", "Amphibious", "Coil Movement"]

      // Environmental adaptations
      environmentalTraits: new fields.ArrayField(new fields.StringField()), // ["Cold Resistance", "Heat Resistance"]

      // Combat traits
      combatTraits: new fields.SchemaField({
        naturalArmor: new fields.NumberField({initial: 0, integer: true}),
        weaponProficiencies: new fields.ArrayField(new fields.StringField()),
        otherTraits: new fields.ArrayField(new fields.StringField()) // ["Ferocity", "Rage"]
      }),

      // Tech and Force traits
      techTraits: new fields.ArrayField(new fields.StringField()), // ["Primitive", "Biotech Affinity"]
      forceTraits: new fields.ArrayField(new fields.StringField()), // ["Force Immunity", "Force Intuition"]

      // Social and mental traits
      socialTraits: new fields.ArrayField(new fields.StringField()), // ["Pheromones", "Psychometric Insight"]

      // Bonus feats and skills
      bonusFeats: new fields.NumberField({initial: 0, integer: true}),
      bonusTrainedSkills: new fields.NumberField({initial: 0, integer: true}),

      // Languages
      languages: new fields.ArrayField(new fields.StringField()),

      // General traits (HTML description)
      traits: new fields.HTMLField({label: "Species Traits"}),
      description: new fields.HTMLField({label: "Description"}),

      // Tags for filtering
      tags: new fields.ArrayField(new fields.StringField())
    };
  }
}
