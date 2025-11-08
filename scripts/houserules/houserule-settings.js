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

  console.log("SWSE | House rule settings registered");
}
