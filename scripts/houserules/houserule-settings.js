/**
 * SWSE Houserule Settings
 * Comprehensive houserule configuration system
 */

export class SWSEHouseruleSettings {
  static registerSettings() {
    console.log("SWSE | Registering houserule settings...");
    
    // ==========================================
    // MENU REGISTRATIONS
    // ==========================================
    
    game.settings.registerMenu("swse", "characterCreationMenu", {
      name: "SWSE.Settings.CharacterCreation.Name",
      label: "SWSE.Settings.CharacterCreation.Label",
      hint: "SWSE.Settings.CharacterCreation.Hint",
      icon: "fas fa-user-plus",
      type: CharacterCreationMenu,
      restricted: true
    });
    
    game.settings.registerMenu("swse", "advancementMenu", {
      name: "SWSE.Settings.Advancement.Name",
      label: "SWSE.Settings.Advancement.Label",
      hint: "SWSE.Settings.Advancement.Hint",
      icon: "fas fa-level-up-alt",
      type: AdvancementMenu,
      restricted: true
    });
    
    game.settings.registerMenu("swse", "combatMenu", {
      name: "SWSE.Settings.Combat.Name",
      label: "SWSE.Settings.Combat.Label",
      hint: "SWSE.Settings.Combat.Hint",
      icon: "fas fa-swords",
      type: CombatMenu,
      restricted: true
    });
    
    game.settings.registerMenu("swse", "forceMenu", {
      name: "SWSE.Settings.Force.Name",
      label: "SWSE.Settings.Force.Label",
      hint: "SWSE.Settings.Force.Hint",
      icon: "fas fa-hand-sparkles",
      type: ForceMenu,
      restricted: true
    });
    
    game.settings.registerMenu("swse", "presetsMenu", {
      name: "SWSE.Settings.Presets.Name",
      label: "SWSE.Settings.Presets.Label",
      hint: "SWSE.Settings.Presets.Hint",
      icon: "fas fa-cog",
      type: PresetsMenu,
      restricted: true
    });
    
    // ==========================================
    // TIER 1: CRITICAL HOUSERULES
    // ==========================================
    
    // Character Creation Settings (hidden - accessed via menu)
    game.settings.register("swse", "characterCreation", {
      scope: "world",
      config: false,
      type: Object,
      default: {
        abilityScoreMethod: "4d6drop",
        pointBuyPool: 28,
        pointBuyMin: 8,
        pointBuyMax: 18,
        arrayValues: [15, 14, 13, 12, 10, 8],
        allowReroll: true,
        rerollThreshold: 8,
        hpGeneration: "roll",
        maxHPLevels: 0,
        startingCredits: "class"
      }
    });
    
    // Second Wind Improvement
    game.settings.register("swse", "secondWindImproved", {
      name: "SWSE.Settings.SecondWindImproved.Name",
      hint: "SWSE.Settings.SecondWindImproved.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });
    
    // Talent Every Level
    game.settings.register("swse", "talentEveryLevel", {
      name: "SWSE.Settings.TalentEveryLevel.Name",
      hint: "SWSE.Settings.TalentEveryLevel.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });
    
    // Death System Settings
    game.settings.register("swse", "deathSystem", {
      scope: "world",
      config: false,
      type: Object,
      default: {
        system: "standard",
        strikesUntilDeath: 3,
        returnToHP: 0,
        strikeRemoval: "never",
        displayStrikes: true,
        deathAtNegativeCon: false,
        massiveDamageThreshold: "fortitude"
      }
    });
    
    // Cross-class Skill Training
    game.settings.register("swse", "crossClassSkillTraining", {
      name: "SWSE.Settings.CrossClassSkills.Name",
      hint: "SWSE.Settings.CrossClassSkills.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });
    
    // ==========================================
    // TIER 2: BALANCE AND QOL HOUSERULES
    // ==========================================
    
    // Skill Focus Restriction
    game.settings.register("swse", "skillFocusRestriction", {
      name: "SWSE.Settings.SkillFocusRestriction.Name",
      hint: "SWSE.Settings.SkillFocusRestriction.Hint",
      scope: "world",
      config: false,
      type: Object,
      default: {
        useTheForce: 8,
        scaling: false
      }
    });
    
    // Armored Defense for All
    game.settings.register("swse", "armoredDefenseForAll", {
      name: "SWSE.Settings.ArmoredDefenseForAll.Name",
      hint: "SWSE.Settings.ArmoredDefenseForAll.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });
    
    // Weapon Ranges
    game.settings.register("swse", "weaponRangeMultiplier", {
      name: "SWSE.Settings.WeaponRanges.Name",
      hint: "SWSE.Settings.WeaponRanges.Hint",
      scope: "world",
      config: true,
      type: Number,
      choices: {
        0.25: "Tactical (0.25x)",
        0.5: "Halved (0.5x - Recommended)",
        1.0: "Core Rules (1.0x)",
        2.0: "Extended (2.0x)"
      },
      default: 0.5
    });
    
    // Athletics Consolidation
    game.settings.register("swse", "athleticsConsolidation", {
      name: "SWSE.Settings.AthleticsConsolidation.Name",
      hint: "SWSE.Settings.AthleticsConsolidation.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });
    
    // Diagonal Movement
    game.settings.register("swse", "diagonalMovement", {
      name: "SWSE.Settings.DiagonalMovement.Name",
      hint: "SWSE.Settings.DiagonalMovement.Hint",
      scope: "world",
      config: true,
      type: String,
      choices: {
        "swse": "All diagonals = 2 squares (SWSE)",
        "alternating": "Alternating 1-2-1 (D&D 3.5)",
        "simplified": "All diagonals = 1 square"
      },
      default: "alternating"
    });
    
    // Force Point Recovery
    game.settings.register("swse", "forcePointRecovery", {
      name: "SWSE.Settings.ForcePointRecovery.Name",
      hint: "SWSE.Settings.ForcePointRecovery.Hint",
      scope: "world",
      config: true,
      type: String,
      choices: {
        "level": "Per Level (Standard)",
        "session": "Per Session",
        "daily": "Daily (Extended Rest)",
        "encounter": "Per Encounter (Heroic)"
      },
      default: "level"
    });
    
    // Condition Track Damage Cap
    game.settings.register("swse", "conditionTrackCap", {
      name: "SWSE.Settings.ConditionTrackCap.Name",
      hint: "SWSE.Settings.ConditionTrackCap.Hint",
      scope: "world",
      config: true,
      type: Number,
      choices: {
        0: "Unlimited",
        1: "1 Step Maximum",
        2: "2 Steps Maximum",
        3: "3 Steps Maximum",
        5: "5 Steps Maximum"
      },
      default: 0
    });
    
    // ==========================================
    // TIER 3: ADVANCED HOUSERULES
    // ==========================================
    
    // Knowledge Skill Mode
    game.settings.register("swse", "knowledgeSkillMode", {
      name: "SWSE.Settings.KnowledgeSkills.Name",
      hint: "SWSE.Settings.KnowledgeSkills.Hint",
      scope: "world",
      config: true,
      type: String,
      choices: {
        "standard": "Standard (Separate Skills)",
        "consolidated4": "Consolidated (4 Skills)",
        "simplified2": "Simplified (2 Skills)"
      },
      default: "standard"
    });
    
    // Dark Side Temptation
    game.settings.register("swse", "darkSideTemptation", {
      name: "SWSE.Settings.DarkSideTemptation.Name",
      hint: "SWSE.Settings.DarkSideTemptation.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });
    
    // Blaster Charge Tracking
    game.settings.register("swse", "trackBlasterCharges", {
      name: "SWSE.Settings.BlasterCharges.Name",
      hint: "SWSE.Settings.BlasterCharges.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });
    
    // Critical Hit Variant
    game.settings.register("swse", "criticalHitVariant", {
      name: "SWSE.Settings.CriticalHit.Name",
      hint: "SWSE.Settings.CriticalHit.Hint",
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
    
    // Retraining
    game.settings.register("swse", "retrainingEnabled", {
      name: "SWSE.Settings.Retraining.Name",
      hint: "SWSE.Settings.Retraining.Hint",
      scope: "world",
      config: true,
      type: Boolean,
      default: false
    });
    
    // ==========================================
    // SYSTEM TRACKING
    // ==========================================
    
    game.settings.register("swse", "houseruleVersion", {
      scope: "world",
      config: false,
      type: String,
      default: "1.0.0"
    });
    
    game.settings.register("swse", "houserulePreset", {
      scope: "world",
      config: false,
      type: String,
      default: "custom"
    });
    
    console.log("SWSE | Houserule settings registered");
  }
  
  /**
   * Get all houserule settings as an object
   */
  static getAllSettings() {
    return {
      // Character Creation
      characterCreation: game.settings.get("swse", "characterCreation"),
      secondWindImproved: game.settings.get("swse", "secondWindImproved"),
      talentEveryLevel: game.settings.get("swse", "talentEveryLevel"),
      deathSystem: game.settings.get("swse", "deathSystem"),
      crossClassSkillTraining: game.settings.get("swse", "crossClassSkillTraining"),
      
      // Balance & QoL
      skillFocusRestriction: game.settings.get("swse", "skillFocusRestriction"),
      armoredDefenseForAll: game.settings.get("swse", "armoredDefenseForAll"),
      weaponRangeMultiplier: game.settings.get("swse", "weaponRangeMultiplier"),
      athleticsConsolidation: game.settings.get("swse", "athleticsConsolidation"),
      diagonalMovement: game.settings.get("swse", "diagonalMovement"),
      forcePointRecovery: game.settings.get("swse", "forcePointRecovery"),
      conditionTrackCap: game.settings.get("swse", "conditionTrackCap"),
      
      // Advanced
      knowledgeSkillMode: game.settings.get("swse", "knowledgeSkillMode"),
      darkSideTemptation: game.settings.get("swse", "darkSideTemptation"),
      trackBlasterCharges: game.settings.get("swse", "trackBlasterCharges"),
      criticalHitVariant: game.settings.get("swse", "criticalHitVariant"),
      retrainingEnabled: game.settings.get("swse", "retrainingEnabled")
    };
  }
}
