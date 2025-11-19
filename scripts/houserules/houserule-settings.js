import { SWSELogger } from '../utils/logger.js';
/**
 * House Rules Settings Registration
 * Registers all configurable house rule settings for the SWSE system
 */

export function registerHouseruleSettings() {
  
  // ============================================
  // Character Creation
  // ============================================
  
  game.settings.register("swse", "abilityScoreMethod", {
    name: "Ability Score Generation Method",
    hint: "How players generate ability scores during character creation",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "4d6drop": "4d6 Drop Lowest",
      "organic": "Organic (24d6)",
      "pointbuy": "Point Buy",
      "array": "Standard Array",
      "3d6": "3d6 Straight",
      "2d6plus6": "2d6+6"
    },
    default: "4d6drop"
  });

  game.settings.register("swse", "pointBuyPool", {
    name: "Point Buy Pool",
    hint: "Total points available for point buy system",
    scope: "world",
    config: true,
    type: Number,
    default: 32,
    range: {
      min: 10,
      max: 50,
      step: 1
    }
  });

  game.settings.register("swse", "allowAbilityReroll", {
    name: "Allow Ability Score Rerolls",
    hint: "Allow players to reroll if their total modifiers are too low",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register("swse", "maxStartingCredits", {
    name: "Maximum Starting Credits",
    hint: "Characters take maximum starting credits instead of rolling (e.g., Noble gets 4800 instead of 3d4×400)",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // ============================================
  // Droids
  // ============================================

  game.settings.register("swse", "droidPointBuyPool", {
    name: "Droid Point Buy Pool",
    hint: "Total points available for droid characters using point buy (only shown if Point Buy is selected)",
    scope: "world",
    config: true,
    type: Number,
    default: 20,
    range: {
      min: 10,
      max: 50,
      step: 1
    }
  });

  game.settings.register("swse", "livingPointBuyPool", {
    name: "Living Point Buy Pool",
    hint: "Total points available for living characters using point buy (only shown if Point Buy is selected)",
    scope: "world",
    config: true,
    type: Number,
    default: 25,
    range: {
      min: 10,
      max: 50,
      step: 1
    }
  });

  game.settings.register("swse", "droidConstructionCredits", {
    name: "Droid Construction Credits",
    hint: "Base credits available for custom droid construction (before class credits)",
    scope: "world",
    config: true,
    type: Number,
    default: 1000,
    range: {
      min: 0,
      max: 5000,
      step: 100
    }
  });

  game.settings.register("swse", "standardDroidModelLimit", {
    name: "Standard Droid Model Credit Limit",
    hint: "Maximum total cost for standard droid models (including modifications)",
    scope: "world",
    config: true,
    type: Number,
    default: 5000,
    range: {
      min: 1000,
      max: 10000,
      step: 500
    }
  });

  // ============================================
  // Hit Points
  // ============================================
  
  game.settings.register("swse", "hpGeneration", {
    name: "HP Generation Method",
    hint: "How HP is calculated when leveling up",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "roll": "Roll Hit Die",
      "average": "Take Average",
      "maximum": "Take Maximum",
      "average_minimum": "Roll with Average Minimum"
    },
    default: "average"
  });

  game.settings.register("swse", "maxHPLevels", {
    name: "Levels with Maximum HP",
    hint: "Number of levels that automatically get max HP (usually 1st level)",
    scope: "world",
    config: true,
    type: Number,
    default: 1,
    range: {
      min: 0,
      max: 20,
      step: 1
    }
  });

  // ============================================
  // Death & Dying
  // ============================================
  
  game.settings.register("swse", "deathSystem", {
    name: "Death System",
    hint: "How character death is determined",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "standard": "Standard (-10 HP)",
      "threeStrikes": "Three Strikes",
      "negativeCon": "Negative CON Score"
    },
    default: "standard"
  });

  game.settings.register("swse", "deathSaveDC", {
    name: "Death Save DC",
    hint: "DC for death saves (if using three strikes system)",
    scope: "world",
    config: true,
    type: Number,
    default: 10,
    range: {
      min: 5,
      max: 20,
      step: 1
    }
  });

  // ============================================
  // Combat
  // ============================================
  
  game.settings.register("swse", "conditionTrackCap", {
    name: "Condition Track Damage Cap",
    hint: "Maximum condition track moves from a single hit (0 = unlimited)",
    scope: "world",
    config: true,
    type: Number,
    default: 0,
    range: {
      min: 0,
      max: 5,
      step: 1
    }
  });

  game.settings.register("swse", "criticalHitVariant", {
    name: "Critical Hit Variant",
    hint: "How critical hits are calculated",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "standard": "Standard (Double Damage)",
      "maxplus": "Maximum + Roll",
      "exploding": "Exploding Dice",
      "trackonly": "Condition Track Only"
    },
    default: "standard"
  });

  game.settings.register("swse", "diagonalMovement", {
    name: "Diagonal Movement Cost",
    hint: "How diagonal movement is calculated",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "swse": "All = 2 squares (SWSE Default)",
      "alternating": "1-2-1 Alternating (D&D 3.5)",
      "simplified": "All = 1 square"
    },
    default: "swse"
  });

  game.settings.register("swse", "weaponRangeMultiplier", {
    name: "Weapon Range Multiplier",
    hint: "Multiplier applied to all weapon ranges",
    scope: "world",
    config: true,
    type: Number,
    default: 1.0,
    range: {
      min: 0.25,
      max: 2.0,
      step: 0.25
    }
  });

  // ============================================
  // Second Wind
  // ============================================
  
  game.settings.register("swse", "secondWindImproved", {
    name: "Improved Second Wind",
    hint: "Second Wind also improves condition track by one step",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("swse", "secondWindRecovery", {
    name: "Second Wind Recovery",
    hint: "When Second Wind uses are recovered",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "encounter": "After Each Encounter",
      "short": "After Short Rest",
      "extended": "After Extended Rest"
    },
    default: "encounter"
  });


  // ============================================
  // Skills & Feats
  // ============================================
  
  game.settings.register("swse", "feintSkill", {
    name: "Feint Skill",
    hint: "Which skill is used for feinting against Will Defense",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "deception": "Deception (Standard)",
      "persuasion": "Persuasion"
    },
    default: "deception"
  });

  game.settings.register("swse", "skillFocusVariant", {
    name: "Skill Focus Variant",
    hint: "How the Skill Focus feat works",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "normal": "Normal (+5 flat)",
      "scaled": "Scaled (+1/2 level, max +5 at 10)",
      "delayed": "Delayed (+5 at specified level)"
    },
    default: "normal"
  });

  game.settings.register("swse", "skillFocusActivationLevel", {
    name: "Skill Focus Activation Level",
    hint: "Level at which delayed Skill Focus activates",
    scope: "world",
    config: true,
    type: Number,
    default: 7,
    range: {
      min: 1,
      max: 20,
      step: 1
    }
  });

  // ============================================
  // Force Powers
  // ============================================
  
  game.settings.register("swse", "forceTrainingAttribute", {
    name: "Force Training Attribute",
    hint: "Which ability score governs Force Training",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "wisdom": "Wisdom (Standard)",
      "charisma": "Charisma"
    },
    default: "wisdom"
  });

  game.settings.register("swse", "blockDeflectTalents", {
    name: "Block/Deflect Talents",
    hint: "Whether Block and Deflect are separate or combined",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "separate": "Separate Talents (Standard)",
      "combined": "Combined as One Talent"
    },
    default: "separate"
  });

  game.settings.register("swse", "forceSensitiveJediOnly", {
    name: "Force Sensitive Restriction",
    hint: "Restrict Force Sensitive feat to Jedi classes only",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // ============================================
  // Combat Feats
  // ============================================

  game.settings.register("swse", "weaponFinesseDefault", {
    name: "Default Weapon Finesse",
    hint: "All characters automatically have Weapon Finesse",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  // ============================================
  // Talents
  // ============================================

  game.settings.register("swse", "groupDeflectBlock", {
    name: "Group Deflect and Block Talents",
    hint: "Display Deflect and Block as a grouped talent in character generator and talent trees",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register("swse", "talentTreeRestriction", {
    name: "Talent Tree Access",
    hint: "Which talent trees can players choose from when leveling up",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "current": "Current Class Only",
      "all": "Any Class With Levels"
    },
    default: "current"
  });

  // ============================================
  // Multi-classing
  // ============================================

  game.settings.register("swse", "multiclassBonusChoice", {
    name: "Multi-class Bonus Choice",
    hint: "What bonus players get when taking a second base class (players can always choose feat OR skill)",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "single_feat": "Single Starting Feat (or Skill)",
      "single_skill": "Single Trained Skill (or Feat)",
      "all_feats": "All Starting Feats"
    },
    default: "single_feat"
  });

  // ============================================
  // Ability Score Increases
  // ============================================

  game.settings.register("swse", "abilityIncreaseMethod", {
    name: "Ability Score Increase Method",
    hint: "How players can allocate ability increases at levels 4, 8, 12, 16, 20",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "standard": "1 Point to 2 Attributes (Standard)",
      "flexible": "1 to 2 Attributes OR 2 to 1 Attribute"
    },
    default: "flexible"
  });

  // ============================================
  // Space Combat
  // ============================================
  
  game.settings.register("swse", "spaceInitiativeSystem", {
    name: "Space Combat Initiative System",
    hint: "How initiative works in space combat",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "individual": "Individual (Standard)",
      "shipBased": "Ship-Based with Role Priority"
    },
    default: "individual"
  });

  game.settings.register("swse", "initiativeRolePriority", {
    name: "Initiative Role Priority",
    hint: "Order of crew actions in ship-based initiative",
    scope: "world",
    config: false,
    type: Array,
    default: ["pilot", "shields", "weapons", "engineering", "other"]
  });

  game.settings.register("swse", "weaponsOperatorsRollInit", {
    name: "Weapons Operators Roll Initiative",
    hint: "Multiple weapons operators roll to determine order among themselves",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  SWSELogger.log("SWSE | House rule settings registered");
}
