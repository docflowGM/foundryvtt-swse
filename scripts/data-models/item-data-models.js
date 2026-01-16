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
        choices: ["energy", "kinetic", "sonic", "ion", "fire", "cold", "acid", "force", "stun"],
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
      weight: new fields.NumberField({required: false, initial: 1, min: 0, nullable: true}),
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

      // Equipment size (for size-based calculations)
      size: new fields.StringField({
        initial: "medium",
        choices: ["tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"],
        label: "Equipment Size"
      }),

      // Upgrade system
      upgradeSlots: new fields.NumberField({required: true, initial: 1, min: 0, integer: true, label: "Upgrade Slots"}),
      installedUpgrades: new fields.ArrayField(new fields.SchemaField({
        id: new fields.StringField({required: true}),
        name: new fields.StringField({required: true}),
        cost: new fields.NumberField({required: true, initial: 0, min: 0}),
        slotsUsed: new fields.NumberField({required: true, initial: 1, min: 0, integer: true}),
        description: new fields.HTMLField(),
        restriction: new fields.StringField({initial: "common"})
      })),

      // Tracking which features have been stripped to gain upgrade slots
      strippedFeatures: new fields.SchemaField({
        damage: new fields.BooleanField({initial: false}),
        range: new fields.BooleanField({initial: false}),
        design: new fields.BooleanField({initial: false}),
        stun: new fields.BooleanField({initial: false}),
        autofire: new fields.BooleanField({initial: false})
      }),

      // Flag indicating this weapon's base damage was reduced through stripping
      baseDamageStripped: new fields.StringField({initial: "", label: "Original Damage Before Stripping"}),
      baseRangeStripped: new fields.StringField({initial: "", label: "Original Range Before Stripping"}),

      // Whether equipment has been enlarged to gain a slot
      sizeIncreaseApplied: new fields.BooleanField({initial: false, label: "Size Increased for Upgrade Slot"}),

      // Restriction level (Licensed, Restricted, Military, Illegal, Common)
      restriction: new fields.StringField({
        initial: "common",
        choices: ["common", "licensed", "restricted", "military", "illegal"],
        label: "Restriction Level"
      })
    };
  }

  /**
   * Migrate legacy data during document initialization
   * Cleans invalid weight values before validation
   */
  static migrateData(source) {
    // Clean weight before validation - must be a finite number >= 0
    if (source.weight !== undefined) {
      const weight = Number(source.weight);
      if (!Number.isFinite(weight) || weight < 0) {
        source.weight = 1; // Default to 1 kg
      } else {
        source.weight = weight; // Ensure it's a number, not a string
      }
    }
    return super.migrateData(source);
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
      equipmentBonus: new fields.NumberField({required: true, initial: 0, min: 0, max: 5, integer: true, label: "Equipment Bonus"}),
      maxDexBonus: new fields.NumberField({initial: null}),
      armorCheckPenalty: new fields.NumberField({required: true, initial: 0, integer: true}),
      fortBonus: new fields.NumberField({required: true, initial: 0, integer: true}),
      speedPenalty: new fields.NumberField({required: true, initial: 0, integer: true}),
      weight: new fields.NumberField({required: false, initial: 1, min: 0, nullable: true}),
      cost: new fields.NumberField({required: true, initial: 0, min: 0}),
      equipped: new fields.BooleanField({required: true, initial: false}),
      description: new fields.HTMLField({label: "Description"}),

      // Armor size (for creatures it's designed to fit)
      size: new fields.StringField({
        initial: "medium",
        choices: ["tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"],
        label: "Armor Size"
      }),

      // Powered Armor flag (automatically detected from name if contains "power")
      isPoweredArmor: new fields.BooleanField({initial: false, label: "Powered Armor (2 upgrade slots)"}),

      // Upgrade system
      // Note: Powered armor gets 2 slots, regular armor gets 1
      upgradeSlots: new fields.NumberField({required: true, initial: 1, min: 0, integer: true, label: "Upgrade Slots"}),
      installedUpgrades: new fields.ArrayField(new fields.SchemaField({
        id: new fields.StringField({required: true}),
        name: new fields.StringField({required: true}),
        cost: new fields.NumberField({required: true, initial: 0, min: 0}),
        slotsUsed: new fields.NumberField({required: true, initial: 1, min: 0, integer: true}),
        description: new fields.HTMLField(),
        restriction: new fields.StringField({initial: "common"})
      })),

      // Tracking which features have been stripped to gain upgrade slots
      strippedFeatures: new fields.SchemaField({
        defensiveMaterial: new fields.BooleanField({initial: false}),
        jointProtection: new fields.BooleanField({initial: false})
      }),

      // Store original values before stripping for reference
      originalDefenseBonus: new fields.NumberField({initial: 0, label: "Original Defense Bonus"}),
      originalEquipmentBonus: new fields.NumberField({initial: 0, label: "Original Equipment Bonus"}),
      originalWeight: new fields.NumberField({initial: 0, label: "Original Weight"}),

      // Whether equipment has been enlarged to gain a slot
      sizeIncreaseApplied: new fields.BooleanField({initial: false, label: "Weight Class Increased for Upgrade Slot"}),

      // Restriction level (Licensed, Restricted, Military, Illegal, Common)
      restriction: new fields.StringField({
        initial: "common",
        choices: ["common", "licensed", "restricted", "military", "illegal"],
        label: "Restriction Level"
      })
    };
  }

  /**
   * Migrate legacy data during document initialization
   * Cleans invalid weight values before validation
   */
  static migrateData(source) {
    // Clean weight before validation - must be a finite number >= 0
    if (source.weight !== undefined) {
      const weight = Number(source.weight);
      if (!Number.isFinite(weight) || weight < 0) {
        source.weight = 1; // Default to 1 kg
      } else {
        source.weight = weight; // Ensure it's a number, not a string
      }
    }
    return super.migrateData(source);
  }
}

// Equipment Data Model
export class EquipmentDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      weight: new fields.NumberField({required: false, initial: 1, min: 0, nullable: true}),
      cost: new fields.NumberField({required: true, initial: 0, min: 0}),
      equipped: new fields.BooleanField({required: true, initial: false}),
      description: new fields.HTMLField({label: "Description"}),

      // Equipment size (for size-based calculations)
      size: new fields.StringField({
        initial: "medium",
        choices: ["tiny", "small", "medium", "large", "huge", "gargantuan", "colossal"],
        label: "Equipment Size"
      }),

      // Upgrade system
      upgradeSlots: new fields.NumberField({required: true, initial: 1, min: 0, integer: true, label: "Upgrade Slots"}),
      installedUpgrades: new fields.ArrayField(new fields.SchemaField({
        id: new fields.StringField({required: true}),
        name: new fields.StringField({required: true}),
        cost: new fields.NumberField({required: true, initial: 0, min: 0}),
        slotsUsed: new fields.NumberField({required: true, initial: 1, min: 0, integer: true}),
        description: new fields.HTMLField(),
        restriction: new fields.StringField({initial: "common"})
      })),

      // Whether equipment has been enlarged to gain a slot
      sizeIncreaseApplied: new fields.BooleanField({initial: false, label: "Size Increased for Upgrade Slot"}),

      // Restriction level (Licensed, Restricted, Military, Illegal, Common)
      restriction: new fields.StringField({
        initial: "common",
        choices: ["common", "licensed", "restricted", "military", "illegal"],
        label: "Restriction Level"
      })
    };
  }

  /**
   * Migrate legacy data during document initialization
   * Cleans invalid weight values before validation
   */
  static migrateData(source) {
    // Clean weight before validation - must be a finite number >= 0
    if (source.weight !== undefined) {
      const weight = Number(source.weight);
      if (!Number.isFinite(weight) || weight < 0) {
        source.weight = 1; // Default to 1 kg
      } else {
        source.weight = weight; // Ensure it's a number, not a string
      }
    }
    return super.migrateData(source);
  }
}

// Upgrade Data Model
export class UpgradeDataModel extends foundry.abstract.DataModel {
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      description: new fields.HTMLField({label: "Description"}),

      // Upgrade classification
      upgradeType: new fields.StringField({
        initial: "universal",
        choices: ["universal", "weapon", "armor", "equipment"],
        label: "Upgrade Type"
      }),

      // Mechanical stats
      cost: new fields.NumberField({required: true, initial: 0, min: 0, label: "Cost in Credits"}),
      upgradeSlots: new fields.NumberField({required: true, initial: 1, min: 0, integer: true, label: "Upgrade Slots Required"}),

      // Availability and restrictions
      availability: new fields.StringField({
        initial: "common",
        choices: ["common", "rare", "licensed", "restricted", "military", "illegal"],
        label: "Availability"
      }),

      restriction: new fields.StringField({
        initial: "common",
        choices: ["common", "licensed", "restricted", "military", "illegal"],
        label: "Restriction Level"
      }),

      // Requirements
      prerequisite: new fields.HTMLField({label: "Prerequisites"}),

      // Installation details
      installationTime: new fields.StringField({label: "Installation Time (automated calculation)"}),
      installationDC: new fields.NumberField({initial: 10, min: 0, integer: true, label: "Installation DC"}),

      // Whether this is a scratch-built upgrade (costs twice as much)
      scratchBuilt: new fields.BooleanField({initial: false, label: "Scratch-Built Upgrade"}),

      // Sourcebook reference
      source: new fields.StringField({initial: "Core", label: "Sourcebook"}),
      page: new fields.NumberField({required: false, integer: true, label: "Page Number"}),

      // Tags for filtering
      tags: new fields.ArrayField(new fields.StringField(), {label: "Tags"})
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
        choices: ["general", "force", "species", "team", "martial_arts", "combat", "tactical", "bonus", "prerequisite", "jedi", "lightsaber"],
        label: "Feat Type"
      }),
      prerequisite: new fields.HTMLField({label: "Prerequisites"}),
      benefit: new fields.HTMLField({label: "Benefit"}),
      special: new fields.HTMLField({label: "Special"}),
      normalText: new fields.HTMLField({label: "Normal"}),

      // Bonus feat specification - which classes can take this as a bonus feat
      // Stores class names (e.g., "Soldier", "Scout") that qualify for this bonus feat
      bonusFeatFor: new fields.ArrayField(
        new fields.StringField(),
        {label: "Bonus Feat For Classes", hint: "Specify class names that can take this feat as a bonus feat"}
      ),

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

      // DEPRECATED: Use 'tags' field instead
      // This field is maintained for backward compatibility only
      // Migration: Move all descriptor data to tags field
      // Examples: 'mind-affecting', 'dark-side', 'light-side', 'telekinetic', 'telepathic', 'vital'
      descriptor: new fields.ArrayField(
        new fields.StringField(),
        {label: "Descriptors (DEPRECATED - use tags field instead)", hint: "This field is deprecated. Use tags for all descriptor data."}
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

      // Nonheroic flag - true for nonheroic classes
      // Nonheroic characters follow special rules (no talents, different BAB, 1d4 HP, etc.)
      isNonheroic: new fields.BooleanField({required: true, initial: false}),

      // Base class flag - true for base/heroic classes (Jedi, Noble, Scout, Scoundrel, Soldier)
      baseClass: new fields.BooleanField({initial: false}),

      // Force sensitive flag - true if class grants Force powers
      forceSensitive: new fields.BooleanField({initial: false}),

      // Computed defenses object (populated in prepareDerivedData)
      // This stores the per-level defense bonuses as numbers
      defenses: new fields.SchemaField({
        fortitude: new fields.NumberField({required: true, initial: 0}),
        reflex: new fields.NumberField({required: true, initial: 0}),
        will: new fields.NumberField({required: true, initial: 0})
      }),

      // Talent trees available to this class
      talentTrees: new fields.ArrayField(new fields.StringField(), {label: "Talent Trees"}),

      // Level-by-level progression data
      levelProgression: new fields.ArrayField(
        new fields.SchemaField({
          level: new fields.NumberField({required: true, integer: true, min: 1, max: 20}),
          bab: new fields.NumberField({integer: true}),
          fort: new fields.NumberField({integer: true}),
          ref: new fields.NumberField({integer: true}),
          will: new fields.NumberField({integer: true}),
          defenseBonus: new fields.NumberField({integer: true}),
          reputation: new fields.NumberField({integer: true}),
          forcePoints: new fields.NumberField({integer: true, min: 0}),
          features: new fields.ArrayField(new fields.SchemaField({
            name: new fields.StringField({required: true}),
            type: new fields.StringField(), // 'feat', 'talent', 'class_feature', 'proficiency', 'feat_grant'
            description: new fields.StringField()
          }))
        }),
        {label: "Level Progression"}
      ),

      // Starting features granted at level 1
      startingFeatures: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({required: true}),
          type: new fields.StringField(), // 'proficiency', 'class_feature', 'feat_grant'
          description: new fields.StringField()
        }),
        {label: "Starting Features"}
      ),

      // Number of trained skills at level 1
      trainedSkills: new fields.NumberField({integer: true, min: 0, label: "Trained Skills"})
    };
  }

  prepareDerivedData() {
    // Normalize snake_case property names to camelCase for consistency
    // This handles compendium data that may use snake_case naming
    const propertyMappings = {
      'hit_die': 'hitDie',
      'bab_progression': 'babProgression',
      'class_skills': 'classSkills',
      'talent_trees': 'talentTrees',
      'trained_skills': 'trainedSkills',
      'level_progression': 'levelProgression',
      'starting_features': 'startingFeatures',
      'defense_progression': 'defenseProgression',
      'force_point_progression': 'forcePointProgression'
    };

    // Copy snake_case properties to camelCase if they exist and camelCase doesn't
    for (const [snakeCase, camelCase] of Object.entries(propertyMappings)) {
      if (this[snakeCase] !== undefined && this[camelCase] === undefined) {
        this[camelCase] = this[snakeCase];
      }
    }

    // SWSE Rules for class defense bonuses:
    // - Defense bonuses are FLAT per class and do not scale with class level
    // - Heroic classes typically have +1 for "fast" saves, +0 for "slow"
    // - Prestige classes can have higher bonuses (+2, +3, or even +4)
    // - When multiclassing, use the HIGHEST bonus from any class, not additive

    // NOTE: The defenses.fortitude/reflex/will values should be set directly in the class data
    // or by migration scripts. We do NOT calculate them from fortSave/refSave/willSave strings
    // because the mapping is not 1:1 (prestige classes can have +2, +3, +4 for "fast" saves).

    // Ensure defenses object exists with defaults if not already set
    if (!this.defenses || typeof this.defenses.fortitude === 'undefined') {
      // Only set defaults if defenses aren't already populated
      if (!this.defenses) {
        this.defenses = { fortitude: 0, reflex: 0, will: 0 };
      }
    }
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
      tags: new fields.ArrayField(new fields.StringField()),

      // Racial traits text array (populated by migration from species-traits.json)
      racialTraits: new fields.ArrayField(new fields.StringField()),

      // Structured species traits data for the Species Trait Engine
      // This enables automatic application of species bonuses
      speciesTraitsData: new fields.ArrayField(new fields.SchemaField({
        type: new fields.StringField({required: true}),
        id: new fields.StringField({required: true}),
        name: new fields.StringField(),
        target: new fields.StringField(),
        value: new fields.NumberField({integer: true}),
        condition: new fields.StringField(),
        scope: new fields.StringField(),
        skill: new fields.StringField(),
        frequency: new fields.StringField(),
        acceptWorse: new fields.BooleanField(),
        mode: new fields.StringField(),
        speed: new fields.NumberField({integer: true}),
        maneuverability: new fields.StringField(),
        sense: new fields.StringField(),
        range: new fields.NumberField({integer: true}),
        weaponName: new fields.StringField(),
        damage: new fields.StringField(),
        damageType: new fields.StringField(),
        effect: new fields.StringField(),
        bonus: new fields.NumberField({integer: true}),
        defense: new fields.StringField(),
        amount: new fields.StringField(),
        exceptions: new fields.ArrayField(new fields.StringField()),
        environment: new fields.StringField(),
        category: new fields.StringField(),
        count: new fields.NumberField({integer: true}),
        duration: new fields.StringField(),
        used: new fields.BooleanField(),
        displayText: new fields.StringField(),
        description: new fields.StringField(),
        automated: new fields.BooleanField({initial: true})
      }))
    };
  }
}
