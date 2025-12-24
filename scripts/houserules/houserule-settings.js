// scripts/houserules/register-houserule-settings.js
import { SWSELogger } from "../utils/logger.js";

/**
 * Register all houserule-related Foundry settings.
 * Modernized for V13–V15 safety, clarity, and schema correctness.
 * Adds validation, fixes incorrect types, groups settings, and ensures
 * presets + menus can reliably interact with them.
 */
export function registerHouseruleSettings() {
  const NS = "foundryvtt-swse";

  /* -------------------------------------------------------------------------- */
  /*                        INTERNAL HELPERS & TYPE FIXERS                       */
  /* -------------------------------------------------------------------------- */

  function register(key, data) {
    try {
      game.settings.register(NS, key, data);
    } catch (err) {
      SWSELogger.error(`Failed registering setting "${key}"`, err);
    }
  }

  // Number settings previously using "choices" improperly
  const numericChoices = (choices) =>
    Object.fromEntries(Object.entries(choices).map(([k, v]) => [String(k), v]));

  /* -------------------------------------------------------------------------- */
  /*                          CHARACTER CREATION SETTINGS                        */
  /* -------------------------------------------------------------------------- */

  register("abilityScoreMethod", {
    name: "Ability Score Generation Method",
    hint: "Determines how ability scores are generated for new characters.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      "4d6drop": "4d6 Drop Lowest",
      organic: "Organic (24d6)",
      pointbuy: "Point Buy",
      array: "Standard Array",
      "3d6": "3d6 Straight",
      "2d6plus6": "2d6+6"
    },
    default: "4d6drop"
  });

  register("pointBuyPool", {
    name: "Point Buy Pool",
    hint: "Total ability score points available under the point buy system.",
    scope: "world",
    config: true,
    type: Number,
    default: 32
  });

  register("allowAbilityReroll", {
    name: "Allow Ability Score Reroll",
    hint: "Allows players to reroll low stat sets during creation.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  register("allowPlayersNonheroic", {
    name: "Allow Non-Heroic Player Characters",
    hint: "If enabled, players can use the NPC generator.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("maxStartingCredits", {
    name: "Max Starting Credits",
    hint: "Players receive maximum starting credits instead of rolling.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("characterCreation", {
    name: "Character Creation Settings",
    hint: "Internal structured config object.",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  /* -------------------------------------------------------------------------- */
  /*                                 BACKGROUNDS                                */
  /* -------------------------------------------------------------------------- */

  register("enableBackgrounds", {
    name: "Enable Backgrounds System",
    hint: "Allow selecting backgrounds (Event/Occupation/Planet).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  register("backgroundSelectionCount", {
    name: "Number of Background Selections",
    hint: "How many backgrounds each character may choose.",
    scope: "world",
    config: true,
    type: Number,
    choices: numericChoices({
      1: "1 Background (Standard)",
      2: "2 Backgrounds",
      3: "3 Backgrounds"
    }),
    default: 1
  });

  /* -------------------------------------------------------------------------- */
  /*                                    DROIDS                                  */
  /* -------------------------------------------------------------------------- */

  register("droidPointBuyPool", {
    name: "Droid Point Buy Pool",
    hint: "Point buy total for droid characters.",
    scope: "world",
    config: true,
    type: Number,
    default: 20
  });

  register("livingPointBuyPool", {
    name: "Living Point Buy Pool",
    hint: "Point buy total for living characters.",
    scope: "world",
    config: true,
    type: Number,
    default: 25
  });

  register("droidConstructionCredits", {
    name: "Droid Construction Credits",
    hint: "Base credits for custom-built droids.",
    scope: "world",
    config: true,
    type: Number,
    default: 1000
  });

  register("allowDroidDestiny", {
    name: "Allow Droids to Have Destiny",
    hint: "If enabled, droid characters can have Destiny Points just like organics (normally disabled).",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  /* -------------------------------------------------------------------------- */
  /*                              HIT POINT SETTINGS                             */
  /* -------------------------------------------------------------------------- */

  register("hpGeneration", {
    name: "HP Generation Method",
    hint: "How HP is calculated when leveling up.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      roll: "Roll Hit Die",
      average: "Take Average",
      maximum: "Take Maximum",
      average_minimum: "Roll with Minimum Average"
    },
    default: "average"
  });

  register("maxHPLevels", {
    name: "Levels with Maximum HP",
    hint: "Number of early levels granted automatic max HP.",
    scope: "world",
    config: true,
    type: Number,
    default: 1
  });

  /* -------------------------------------------------------------------------- */
  /*                               DEATH & DYING                                 */
  /* -------------------------------------------------------------------------- */

  register("deathSystem", {
    name: "Death System",
    hint: "How death is determined in your campaign.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      standard: "Standard (-10 HP)",
      threeStrikes: "Three Strikes System",
      negativeCon: "Negative CON Score"
    },
    default: "standard"
  });

  register("deathSaveDC", {
    name: "Death Save DC",
    hint: "Used only in the Three Strikes system.",
    scope: "world",
    config: true,
    type: Number,
    default: 10
  });

  /* -------------------------------------------------------------------------- */
  /*                                 COMBAT RULES                                */
  /* -------------------------------------------------------------------------- */

  register("conditionTrackCap", {
    name: "Condition Track Damage Cap",
    hint: "Maximum CT steps moved by one hit (0 = unlimited).",
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });

  register("criticalHitVariant", {
    name: "Critical Hit Variant",
    hint: "How critical hits deal damage.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      standard: "Standard (Double Damage)",
      maxplus: "Maximum + Roll",
      exploding: "Exploding Dice",
      trackonly: "Condition Track Only"
    },
    default: "standard"
  });

  register("diagonalMovement", {
    name: "Diagonal Movement Cost",
    hint: "How diagonal movement is calculated on the grid.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      swse: "All 2 squares (SWSE Default)",
      alternating: "1-2-1 Alternating (3.5 Style)",
      simplified: "All 1 square (Simplified)"
    },
    default: "swse"
  });

  register("weaponRangeReduction", {
    name: "Weapon Range Reduction",
    hint: "Apply global range reduction modifiers.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      none: "No Reduction",
      quarter: "25% Range",
      half: "50% Range",
      threequarter: "75% Range"
    },
    default: "none"
  });

  register("weaponRangeMultiplier", {
    name: "Weapon Range Multiplier",
    hint: "Provides granular weapon range adjustment.",
    scope: "world",
    config: true,
    type: Number,
    default: 1.0
  });

  register("armoredDefenseForAll", {
    name: "Armored Defense for All",
    hint: "All characters can apply armor bonus to Reflex Defense.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("trackBlasterCharges", {
    name: "Track Blaster Charges",
    hint: "Enable tracking of blaster power cell usage and charges in combat.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  /* -------------------------------------------------------------------------- */
  /*                                SECOND WIND                                  */
  /* -------------------------------------------------------------------------- */

  register("secondWindImproved", {
    name: "Improved Second Wind",
    hint: "Second Wind also moves up the Condition Track.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("secondWindRecovery", {
    name: "Second Wind Recovery Timing",
    hint: "When Second Wind uses recover.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      encounter: "After Each Encounter",
      short: "After a Short Rest",
      extended: "After an Extended Rest"
    },
    default: "encounter"
  });

  /* -------------------------------------------------------------------------- */
  /*                            SKILLS & FEATS                                  */
  /* -------------------------------------------------------------------------- */

  register("feintSkill", {
    name: "Feint Skill",
    hint: "Determines which skill opposes Will Defense for feinting.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      deception: "Deception (Standard)",
      persuasion: "Persuasion"
    },
    default: "deception"
  });

  register("skillFocusVariant", {
    name: "Skill Focus Variant",
    hint: "Defines how Skill Focus calculates bonus.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      normal: "Normal (+5)",
      scaled: "Scaled (+½ Level, Max +5)",
      delayed: "Delayed (Activates at Set Level)"
    },
    default: "normal"
  });

  register("skillFocusActivationLevel", {
    name: "Delayed Skill Focus Activation Level",
    hint: "Only applies if Skill Focus Variant = Delayed.",
    scope: "world",
    config: true,
    type: Number,
    default: 7
  });

  register("knowledgeSkillMode", {
    name: "Knowledge Skills Consolidation",
    hint: "How knowledge skills are consolidated or presented.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      standard: "Standard (Separate Knowledge Skills)",
      consolidated: "Consolidated (Single Knowledge Skill)",
      simplified: "Simplified (Limited Knowledge Options)"
    },
    default: "standard"
  });

  register("athleticsConsolidation", {
    name: "Athletics & Acrobatics Consolidation",
    hint: "Whether to consolidate Athletics and Acrobatics into a single skill.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  /* -------------------------------------------------------------------------- */
  /*                               FORCE RULES                                   */
  /* -------------------------------------------------------------------------- */

  register("forceTrainingAttribute", {
    name: "Force Training Ability",
    hint: "Which ability modifies Force Power selection.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      wisdom: "Wisdom",
      charisma: "Charisma"
    },
    default: "wisdom"
  });

  register("blockDeflectTalents", {
    name: "Block + Deflect Behavior",
    hint: "Determines whether Block and Deflect are separate or combined talents.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      separate: "Separate (Standard)",
      combined: "Combined into One Talent"
    },
    default: "separate"
  });

  register("forceSensitiveJediOnly", {
    name: "Force Sensitive Jedi Restriction",
    hint: "Restricts Force Sensitive feat to Jedi classes only.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("darkSideMaxMultiplier", {
    name: "Dark Side Max Score Multiplier",
    hint: "Maximum Dark Side score = Wisdom × Multiplier.",
    scope: "world",
    config: true,
    type: Number,
    default: 1
  });

  register("darkSidePowerIncreaseScore", {
    name: "Auto-Increase Dark Side Score",
    hint: "Using a [Dark Side] power automatically increases DSS.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  register("forcePointRecovery", {
    name: "Force Point Recovery",
    hint: "When Force Points refresh.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      level: "On Level Up",
      extended: "After Extended Rest",
      session: "Each Session"
    },
    default: "level"
  });

  register("darkSideTemptation", {
    name: "Dark Side Temptation",
    hint: "How Dark Side temptation is handled in the game.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      strict: "Strict RAW - Core rules only",
      lenient: "Lenient - Broader interpretation",
      narrative: "Narrative Only - GM discretion"
    },
    default: "strict"
  });

  /* -------------------------------------------------------------------------- */
  /*                                COMBAT FEATS                                 */
  /* -------------------------------------------------------------------------- */

  register("weaponFinesseDefault", {
    name: "Default Weapon Finesse",
    hint: "All characters automatically gain Weapon Finesse.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("pointBlankShotDefault", {
    name: "Default Point Blank Shot",
    hint: "All characters automatically gain Point Blank Shot.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("powerAttackDefault", {
    name: "Default Power Attack",
    hint: "All characters automatically gain Power Attack.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("preciseShotDefault", {
    name: "Default Precise Shot",
    hint: "All characters automatically gain Precise Shot.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("dodgeDefault", {
    name: "Default Dodge",
    hint: "All characters automatically gain Dodge feat.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  /* -------------------------------------------------------------------------- */
  /*                                   TALENTS                                   */
  /* -------------------------------------------------------------------------- */

  register("groupDeflectBlock", {
    name: "Group Block/Deflect Display",
    hint: "Display these talents grouped in generators and trees.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("talentTreeRestriction", {
    name: "Talent Tree Access Rules",
    hint: "Determines which talent trees are selectable.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      current: "Current Class Only",
      all: "Any Class With Levels",
      unrestricted: "Unrestricted"
    },
    default: "current"
  });

  register("talentEveryLevel", {
    name: "Talent Every Level",
    hint: "Characters gain a talent each level rather than odd levels.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("crossClassSkillTraining", {
    name: "Cross-Class Skill Training",
    hint: "Allow training skills not listed as class skills.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  register("retrainingEnabled", {
    name: "Retraining System",
    hint: "Allow retraining feats, skills, and talents.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("skillFocusRestriction", {
    name: "Skill Focus Restriction",
    hint: "Structured restriction object for Skill Focus.",
    scope: "world",
    config: false,
    type: Object,
    default: { useTheForce: 0, scaling: "normal" }
  });

  /* -------------------------------------------------------------------------- */
  /*                               MULTICLASS RULES                               */
  /* -------------------------------------------------------------------------- */

  register("multiclassBonusChoice", {
    name: "Multi-class Bonus Selection",
    hint: "Determines bonus gained when taking a second base class.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      single_feat: "Single Starting Feat (or skill)",
      single_skill: "Single Trained Skill (or feat)",
      all_feats: "All Starting Feats"
    },
    default: "single_feat"
  });

  /* -------------------------------------------------------------------------- */
  /*                           ABILITY SCORE IMPROVEMENTS                        */
  /* -------------------------------------------------------------------------- */

  register("abilityIncreaseMethod", {
    name: "Ability Increase Method",
    hint: "How ability score increases are applied at 4/8/12/16/20.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      standard: "Standard (1 to 2 attributes)",
      flexible: "Flexible (2 to 1 or 1 to 2)"
    },
    default: "flexible"
  });

  /* -------------------------------------------------------------------------- */
  /*                                 SPACE COMBAT                                */
  /* -------------------------------------------------------------------------- */

  register("spaceInitiativeSystem", {
    name: "Space Combat Initiative",
    hint: "Determines whether initiative is per-person or per-ship.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      individual: "Individual (Standard)",
      shipBased: "Ship-Based (Crew + Role Priority)"
    },
    default: "individual"
  });

  register("initiativeRolePriority", {
    name: "Ship Role Priority Order",
    hint: "Defines order of crew action in ship-based initiative.",
    scope: "world",
    config: false,
    type: Array,
    default: ["pilot", "shields", "weapons", "engineering", "other"]
  });

  register("weaponsOperatorsRollInit", {
    name: "Weapons Operators Roll Initiative",
    hint: "Operators roll individually when multiple people man weapons.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  /* -------------------------------------------------------------------------- */
  /*                               PRESET MANAGEMENT                             */
  /* -------------------------------------------------------------------------- */

  register("houserulePreset", {
    name: "Active Houserule Preset",
    hint: "The currently active preset configuration.",
    scope: "world",
    config: false,
    type: String,
    default: "standard"
  });

  /* -------------------------------------------------------------------------- */
  /*                              GRAPPLE RULES                                 */
  /* -------------------------------------------------------------------------- */

  register("grappleEnabled", {
    name: "Enable Grapple",
    hint: "Enables specialized grapple mechanics in combat.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("grappleVariant", {
    name: "Grapple Variant",
    hint: "Choose grapple rule variant.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      standard: "Standard SWSE",
      simplified: "Simplified",
      opposed: "Opposed Check"
    },
    default: "standard"
  });

  register("grappleDCBonus", {
    name: "Grapple DC Bonus per BAB",
    hint: "DC increases by this amount per opponent BAB point.",
    scope: "world",
    config: true,
    type: Number,
    default: 1
  });

  /* -------------------------------------------------------------------------- */
  /*                        RECOVERY & HEALING RULES                            */
  /* -------------------------------------------------------------------------- */

  register("recoveryEnabled", {
    name: "Enable Recovery & Healing",
    hint: "Enables specialized recovery mechanics during rest.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("recoveryHPType", {
    name: "Recovery HP Amount",
    hint: "How much HP is recovered per rest period.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      standard: "Standard (Class Hit Die)",
      slow: "Slow (Half Hit Die)",
      fast: "Fast (Full Hit Die + CON)",
      custom: "Custom Amount"
    },
    default: "standard"
  });

  register("customRecoveryHP", {
    name: "Custom Recovery HP",
    hint: "Fixed HP recovered per rest (only if Custom Amount selected).",
    scope: "world",
    config: true,
    type: Number,
    default: 5
  });

  register("recoveryVitality", {
    name: "Recover Vitality Points",
    hint: "Also recover Vitality Points on rest.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("recoveryVitalityAmount", {
    name: "Vitality Recovery Amount",
    hint: "How many Vitality Points recovered per rest.",
    scope: "world",
    config: true,
    type: Number,
    default: 5
  });

  register("recoveryTiming", {
    name: "Recovery Timing",
    hint: "When recovery applies during rest periods.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      afterRest: "After Extended Rest Only",
      perDay: "Once Per Day",
      both: "After Rest + Additional Daily"
    },
    default: "afterRest"
  });

  register("recoveryRequiresFullRest", {
    name: "Recovery Requires Full Rest",
    hint: "Must be a full night rest (8 hours) instead of short rest.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  /* -------------------------------------------------------------------------- */
  /*                          CONDITION TRACK RULES                             */
  /* -------------------------------------------------------------------------- */

  register("conditionTrackEnabled", {
    name: "Enable Enhanced Condition Track",
    hint: "Enables advanced condition track mechanics.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("conditionTrackStartDamage", {
    name: "Condition Track Start Damage",
    hint: "Damage threshold before condition track penalties apply.",
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });

  register("conditionTrackProgression", {
    name: "Condition Track Step Damage",
    hint: "HP damage needed to advance one condition track step.",
    scope: "world",
    config: true,
    type: Number,
    default: 5
  });

  register("conditionTrackVariant", {
    name: "Condition Track Variant",
    hint: "Determines condition track rule set.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      swseStandard: "SWSE Standard (Default)",
      simplified: "Simplified 4-Step",
      criticalConditions: "Critical Conditions Enhanced"
    },
    default: "swseStandard"
  });

  register("conditionTrackAutoApply", {
    name: "Auto-Apply Condition Effects",
    hint: "Automatically apply status effects when track advances.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  /* -------------------------------------------------------------------------- */
  /*                              FLANKING RULES                                */
  /* -------------------------------------------------------------------------- */

  register("flankingEnabled", {
    name: "Enable Flanking",
    hint: "Enables flanking bonuses/penalties in combat.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("flankingBonus", {
    name: "Flanking Bonus Type",
    hint: "How much benefit flanking provides.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      plusTwo: "+2 Attack Bonus",
      plusThree: "+3 Attack Bonus",
      halfDamageReduction: "Half Damage Reduction",
      acBonus: "+1 AC Penalty"
    },
    default: "plusTwo"
  });

  register("flankingRequiresConsciousness", {
    name: "Flanking Requires Consciousness",
    hint: "Flanking ally must be conscious/aware.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  register("flankingLargeCreatures", {
    name: "Flanking Large Creatures",
    hint: "Can large creatures be flanked?",
    scope: "world",
    config: true,
    type: String,
    choices: {
      all: "All Creatures",
      sameSizeOnly: "Same Size Only",
      mediumOrSmaller: "Medium or Smaller"
    },
    default: "all"
  });

  register("flankingDiagonalCounts", {
    name: "Diagonal Adjacency Counts",
    hint: "Can diagonally adjacent allies provide flanking?",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  /* -------------------------------------------------------------------------- */
  /*                        TRAINING-BASED SKILL ADVANCEMENT                    */
  /* -------------------------------------------------------------------------- */

  register("skillTrainingEnabled", {
    name: "Enable Training-Based Skill Advancement",
    hint: "Allows skills to improve through training points.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("trainingPointsPerLevel", {
    name: "Training Points Per Level",
    hint: "How many training points characters gain each level.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      two: "2 Points",
      three: "3 Points",
      standard: "Standard (5 + INT mod)"
    },
    default: "three"
  });

  register("trainingPointsPerRest", {
    name: "Training Points Per Rest",
    hint: "Bonus training points awarded for downtime/extended rest.",
    scope: "world",
    config: true,
    type: Number,
    default: 0
  });

  register("skillTrainingCap", {
    name: "Training Cap Per Skill",
    hint: "Maximum training points that can be spent on one skill.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      none: "Unlimited",
      classSkillOnly: "Class Skills Only",
      maxLevel: "Max Equal to Character Level"
    },
    default: "none"
  });

  register("trainingCostScale", {
    name: "Training Cost Scale",
    hint: "How expensive training points are to spend.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      linear: "Linear (1 point = +1)",
      exponential: "Exponential (Costs increase)",
      byDC: "By Skill DC"
    },
    default: "linear"
  });

  register("trainingRequiresTrainer", {
    name: "Training Requires Trainer",
    hint: "Characters need an NPC trainer to use training points.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  /* -------------------------------------------------------------------------- */
  /*                             STATUS EFFECTS RULES                           */
  /* -------------------------------------------------------------------------- */

  register("statusEffectsEnabled", {
    name: "Enable Status Effects",
    hint: "Enables condition/status effect tracking system.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("statusEffectsList", {
    name: "Status Effects List",
    hint: "Which status effects are available in your campaign.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      combatConditions: "Combat Conditions",
      expanded: "Expanded Status Effects",
      custom: "Custom List"
    },
    default: "combatConditions"
  });

  register("autoApplyFromConditionTrack", {
    name: "Auto-Apply from Condition Track",
    hint: "Condition track automatically applies matching status effects.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("statusEffectDurationTracking", {
    name: "Status Effect Duration Tracking",
    hint: "How long status effects last before removal.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      rounds: "Rounds (Combat)",
      scenes: "Scenes",
      manual: "Manual Removal Only"
    },
    default: "manual"
  });

  register("autoRemoveOnRest", {
    name: "Auto-Remove Effects on Rest",
    hint: "Remove temporary status effects when characters rest.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  /* -------------------------------------------------------------------------- */
  /*                        HEALING SKILL INTEGRATION                           */
  /* -------------------------------------------------------------------------- */

  register("healingSkillEnabled", {
    name: "Enable Healing Skill Integration",
    hint: "Enables Treat Injury skill to provide direct HP recovery.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("firstAidEnabled", {
    name: "Allow First Aid (DC 15)",
    hint: "Enables First Aid as a Full-Round Action (requires Medpac).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  register("firstAidHealingType", {
    name: "First Aid Healing Formula",
    hint: "How much HP First Aid restores.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      levelOnly: "Character Level",
      levelPlusDC: "Character Level + (Check - DC)",
      fixed: "Fixed Amount"
    },
    default: "levelPlusDC"
  });

  register("firstAidFixedAmount", {
    name: "First Aid Fixed Healing",
    hint: "HP restored if Fixed Amount is selected.",
    scope: "world",
    config: true,
    type: Number,
    default: 10
  });

  register("longTermCareEnabled", {
    name: "Allow Long-Term Care",
    hint: "8-hour healing care (8 hours per day max).",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  register("longTermCareHealing", {
    name: "Long-Term Care Healing",
    hint: "How much HP Long-Term Care heals.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      characterLevel: "Character Level",
      conBonus: "CON Bonus per Level",
      fixed: "Fixed Amount"
    },
    default: "characterLevel"
  });

  register("longTermCareFixedAmount", {
    name: "Long-Term Care Fixed Healing",
    hint: "HP healed if Fixed Amount is selected.",
    scope: "world",
    config: true,
    type: Number,
    default: 5
  });

  register("longTermCareMultipleTargets", {
    name: "Long-Term Care Max Simultaneous Targets",
    hint: "How many creatures can receive Long-Term Care simultaneously.",
    scope: "world",
    config: true,
    type: Number,
    choices: numericChoices({
      1: "1 (Untrained Only)",
      6: "6 (Trained)"
    }),
    default: 1
  });

  register("performSurgeryEnabled", {
    name: "Allow Perform Surgery (DC 20)",
    hint: "Requires 1 hour, Surgery Kit, and trained Treat Injury.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  register("performSurgeryHealing", {
    name: "Surgery Healing Formula",
    hint: "How much damage surgery removes.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      conBonus: "CON Bonus × Level",
      fixed: "Fixed Amount",
      automatic: "Fully Heal"
    },
    default: "conBonus"
  });

  register("performSurgeryFixedAmount", {
    name: "Surgery Fixed Healing",
    hint: "HP healed by surgery if Fixed Amount is selected.",
    scope: "world",
    config: true,
    type: Number,
    default: 20
  });

  register("surgeryFailureDamage", {
    name: "Damage on Surgery Failure",
    hint: "Creature takes damage equal to Damage Threshold on failed check.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  register("revivifyEnabled", {
    name: "Allow Revivify (DC 25)",
    hint: "Trained Only - revive dying creature within 1 round.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  register("revivifyWindow", {
    name: "Revivify Time Window",
    hint: "How many rounds after death can Revivify be attempted.",
    scope: "world",
    config: true,
    type: Number,
    default: 1
  });

  register("criticalCareEnabled", {
    name: "Allow Critical Care (DC 20)",
    hint: "Multiple Medpacs in 24 hours (trained, penalties apply).",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  register("criticalCareHealing", {
    name: "Critical Care Healing Formula",
    hint: "How much Critical Care heals.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      levelPlusDC: "Level + (Check - DC)",
      fixed: "Fixed Amount"
    },
    default: "levelPlusDC"
  });

  register("criticalCareFixedAmount", {
    name: "Critical Care Fixed Healing",
    hint: "HP healed if Fixed Amount is selected.",
    scope: "world",
    config: true,
    type: Number,
    default: 15
  });

  SWSELogger.info("SWSE | Houserule settings registered successfully.");
}
