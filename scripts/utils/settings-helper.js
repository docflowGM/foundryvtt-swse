/**
 * Centralized settings helper with safe defaults and type validation.
 * Prevents silent failures from undefined settings.
 */
export class SettingsHelper {
  static NS = 'foundryvtt-swse';

  /**
   * Get a setting value with safe default fallback.
   * @param {string} key - Setting key
   * @param {*} defaultValue - Fallback value if setting is undefined or null
   * @returns {*} Setting value or default
   */
  static getSafe(key, defaultValue = null) {
    try {
      const value = game.settings.get(SettingsHelper.NS, key);
      return value !== undefined && value !== null ? value : defaultValue;
    } catch (err) {
      console.warn(
        `[SWSE] Settings: Failed to read setting "${key}", using default:`,
        defaultValue
      );
      return defaultValue;
    }
  }

  /**
   * Get a boolean setting with safe default.
   * @param {string} key - Setting key
   * @param {boolean} defaultValue - Fallback boolean (default: false)
   * @returns {boolean}
   */
  static getBoolean(key, defaultValue = false) {
    const value = SettingsHelper.getSafe(key, defaultValue);
    return Boolean(value);
  }

  /**
   * Get a string setting with safe default.
   * @param {string} key - Setting key
   * @param {string} defaultValue - Fallback string (default: '')
   * @returns {string}
   */
  static getString(key, defaultValue = '') {
    const value = SettingsHelper.getSafe(key, defaultValue);
    return String(value || defaultValue);
  }

  /**
   * Get a number setting with safe default.
   * @param {string} key - Setting key
   * @param {number} defaultValue - Fallback number (default: 0)
   * @returns {number}
   */
  static getNumber(key, defaultValue = 0) {
    const value = SettingsHelper.getSafe(key, defaultValue);
    const num = Number(value);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Get an array setting with safe default.
   * @param {string} key - Setting key
   * @param {Array} defaultValue - Fallback array (default: [])
   * @returns {Array}
   */
  static getArray(key, defaultValue = []) {
    const value = SettingsHelper.getSafe(key, defaultValue);
    return Array.isArray(value) ? value : defaultValue;
  }

  /**
   * Get an object setting with safe default.
   * @param {string} key - Setting key
   * @param {object} defaultValue - Fallback object (default: {})
   * @returns {object}
   */
  static getObject(key, defaultValue = {}) {
    const value = SettingsHelper.getSafe(key, defaultValue);
    return typeof value === 'object' && value !== null ? value : defaultValue;
  }

  /**
   * Settings directory with default values and types.
   * Used for consistent fallbacks across the application.
   */
  static DEFAULTS = {
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

  /**
   * Get with automatic type detection and default from DEFAULTS.
   * @param {string} key - Setting key
   * @returns {*} Setting value or default
   */
  static get(key) {
    const defaultValue = SettingsHelper.DEFAULTS[key];
    if (defaultValue === undefined) {
      console.warn(
        `[SWSE] Settings: Unknown setting key "${key}", no default available`
      );
      return undefined;
    }

    const actualValue = SettingsHelper.getSafe(key, defaultValue);

    // Type-based fallback
    if (typeof defaultValue === 'boolean') {
      return SettingsHelper.getBoolean(key, defaultValue);
    }
    if (typeof defaultValue === 'string') {
      return SettingsHelper.getString(key, defaultValue);
    }
    if (typeof defaultValue === 'number') {
      return SettingsHelper.getNumber(key, defaultValue);
    }
    if (Array.isArray(defaultValue)) {
      return SettingsHelper.getArray(key, defaultValue);
    }
    if (typeof defaultValue === 'object') {
      return SettingsHelper.getObject(key, defaultValue);
    }

    return actualValue;
  }
}
