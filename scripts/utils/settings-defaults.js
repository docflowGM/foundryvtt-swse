/**
 * Canonical system setting defaults.
 * Shared by HouseRuleService and SettingsHelper to avoid split-brain defaults.
 */
export const SETTINGS_DEFAULTS = {
    // Character Creation
    abilityScoreMethod: '4d6drop',
    pointBuyPool: 32,
    allowAbilityReroll: true,
    allowPlayersNonheroic: false,
    maxStartingCredits: false,
    characterCreation: {},

    // Backgrounds
    enableBackgrounds: true,
    backgroundSelectionCount: 1,

    // Droids
    droidPointBuyPool: 20,
    livingPointBuyPool: 25,
    droidConstructionCredits: 1000,
    allowDroidDestiny: false,

    // Hit Points
    hpGeneration: 'average',
    maxHPLevels: 1,

    // Death & Dying
    deathSystem: 'standard',
    deathSaveDC: 10,

    // Combat Rules
    conditionTrackCap: 0,
    criticalHitVariant: 'standard',
    diagonalMovement: 'swse',
    weaponRangeReduction: 'none',
    weaponRangeMultiplier: 1.0,
    armoredDefenseForAll: false,
    trackBlasterCharges: false,

    // Second Wind
    secondWindImproved: false,
    secondWindRecovery: 'encounter',
    secondWindWebEnhancement: false,

    // Skills & Feats
    feintSkill: 'deception',
    skillFocusVariant: 'normal',
    skillFocusActivationLevel: 7,
    knowledgeSkillMode: 'standard',
    athleticsConsolidation: false,

    // Force Rules
    forceTrainingAttribute: 'wisdom',
    blockDeflectTalents: 'separate',
    blockMechanicalAlternative: false,
    forceSensitiveJediOnly: false,
    darkSideMaxMultiplier: 1,
    darkSidePowerIncreaseScore: true,
    darkInspirationEnabled: false,
    forcePointRecovery: 'level',
    darkSideTemptation: 'strict',

    // Combat Feats
    weaponFinesseDefault: false,
    pointBlankShotDefault: false,
    powerAttackDefault: false,
    preciseShotDefault: false,
    dodgeDefault: false,

    // Talents
    groupDeflectBlock: false,
    talentTreeRestriction: 'current',
    talentEveryLevel: false,
    talentEveryLevelExtraL1: true,
    talentDoubleLevels: false,
    crossClassSkillTraining: true,
    retrainingEnabled: false,

    // Multiclass
    multiclassBonusChoice: 'single_feat',

    // Ability Scores
    abilityIncreaseMethod: 'flexible',

    // Space Combat
    spaceInitiativeSystem: 'individual',
    initiativeRolePriority: ['pilot', 'shields', 'weapons', 'engineering', 'other'],
    weaponsOperatorsRollInit: true,

    // Experience
    enableExperienceSystem: true,

    // Preset
    houserulePreset: 'standard',

    // Grapple
    grappleEnabled: false,
    grappleVariant: 'standard',
    grappleDCBonus: 1,

    // Recovery & Healing
    recoveryEnabled: false,
    recoveryHPType: 'standard',
    customRecoveryHP: 5,
    recoveryVitality: false,
    recoveryVitalityAmount: 5,
    recoveryTiming: 'afterRest',
    recoveryRequiresFullRest: true,

    // Condition Track
    conditionTrackEnabled: false,
    conditionTrackStartDamage: 0,
    conditionTrackProgression: 5,
    conditionTrackVariant: 'swseStandard',
    conditionTrackAutoApply: false,

    // Flanking
    flankingEnabled: false,
    flankingBonus: 'plusTwo',
    flankingRequiresConsciousness: true,
    flankingLargeCreatures: 'all',
    flankingDiagonalCounts: false,

    // Skill Training
    skillTrainingEnabled: false,
    trainingPointsPerLevel: 'three',
    trainingPointsPerRest: 0,
    skillTrainingCap: 'none',
    trainingCostScale: 'linear',
    trainingRequiresTrainer: false,

    // Status Effects
    statusEffectsEnabled: false,
    statusEffectsList: 'combatConditions',
    autoApplyFromConditionTrack: false,
    statusEffectDurationTracking: 'manual',
    autoRemoveOnRest: false,

    // Healing Skills
    healingSkillEnabled: false,
    firstAidEnabled: true,
    firstAidHealingType: 'levelPlusDC',
    firstAidFixedAmount: 10,
    longTermCareEnabled: true,
    longTermCareHealing: 'characterLevel',
    longTermCareFixedAmount: 5,
    longTermCareMultipleTargets: 1,
    performSurgeryEnabled: true,
    performSurgeryHealing: 'conBonus',
    performSurgeryFixedAmount: 20,
    surgeryFailureDamage: true,
    revivifyEnabled: true,
    revivifyWindow: 1,
    criticalCareEnabled: false,
    criticalCareHealing: 'levelPlusDC',
    criticalCareFixedAmount: 15,

    // Character Restrictions
    bannedSpecies: '',

    // Enhanced Massive Damage
    enableEnhancedMassiveDamage: false,
    persistentDTPenalty: false,
    persistentDTPenaltyCap: 3,
    doubleThresholdPenalty: false,
    stunThresholdRule: false,
    eliminateInstantDeath: false,
    modifyDamageThresholdFormula: false,
    damageThresholdFormulaType: 'fullLevel',

    // House Rules Variants
    enableGlancingHit: false,
    enableLastGrasp: false,
    enableEmergencyPatch: false,
    limitMoveObjectDamage: false,
    enableSubsystemRepairCost: false,

    // Starship Engine Modules
    enableScaleEngine: false,
    enableSWES: false,
    enableEnhancedShields: false,
    enableEnhancedEngineer: false,
    enableEnhancedPilot: false,
    enableEnhancedCommander: false,
    enableVehicleTurnController: false
  };
