/**
 * House Rules Configuration Datapad
 * A holo-cyber themed interface for managing SWSE house rules
 * Organized by category with elegant toggle controls
 */

import { SettingsHelper } from '../utils/settings-helper.js';
import { SWSELogger } from '../utils/logger.js';

export class HouseRulesApp extends FormApplication {
  constructor(options = {}) {
    super(options);
    this.NS = 'foundryvtt-swse';
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: 'swse-house-rules-app',
      title: 'House Rules Configuration',
      template: 'systems/foundryvtt-swse/templates/apps/house-rules/house-rules.hbs',
      width: 800,
      height: 600,
      resizable: true,
      minimizable: true,
      classes: ['swse-house-rules-datapad']
    });
  }

  /**
   * Organize rules into categories
   */
  async _prepareContext() {
    const rules = {
      characterCreation: this._getRulesForCategory('characterCreation'),
      combat: this._getRulesForCategory('combat'),
      force: this._getRulesForCategory('force'),
      recovery: this._getRulesForCategory('recovery'),
      skills: this._getRulesForCategory('skills'),
      vehicles: this._getRulesForCategory('vehicles')
    };

    const activeRuleCount = Object.values(rules)
      .flat()
      .filter(r => r.enabled)
      .length;

    return {
      rules,
      activeRuleCount
    };
  }

  async getData(options = {}) {
    const data = await super.getData(options);
    return mergeObject(data, await this._prepareContext());
  }

  /**
   * Get all rules for a specific category
   */
  _getRulesForCategory(category) {
    const categoryRules = HOUSE_RULES_CATEGORIES[category] || [];
    return categoryRules.map(key => ({
      key,
      name: this._getRuleName(key),
      description: this._getRuleDescription(key),
      enabled: SettingsHelper.getBoolean(key, false),
      type: this._getRuleType(key)
    }));
  }

  /**
   * Get display name for a rule
   */
  _getRuleName(key) {
    const names = {
      // Character Creation
      abilityScoreMethod: 'Ability Score Method',
      pointBuyPool: 'Point Buy Pool',
      allowAbilityReroll: 'Allow Ability Reroll',
      allowPlayersNonheroic: 'Allow Non-Heroic Players',
      maxStartingCredits: 'Maximum Starting Credits',
      enableBackgrounds: 'Enable Backgrounds',
      backgroundSelectionCount: 'Background Selection Count',
      droidPointBuyPool: 'Droid Point Buy Pool',
      livingPointBuyPool: 'Living Point Buy Pool',
      droidConstructionCredits: 'Droid Construction Credits',
      allowDroidDestiny: 'Allow Droids Destiny Points',

      // Combat
      conditionTrackCap: 'Condition Track Damage Cap',
      criticalHitVariant: 'Critical Hit Variant',
      diagonalMovement: 'Diagonal Movement Cost',
      weaponRangeReduction: 'Weapon Range Reduction',
      weaponRangeMultiplier: 'Weapon Range Multiplier',
      armoredDefenseForAll: 'Armored Defense for All',
      trackBlasterCharges: 'Track Blaster Charges',
      secondWindImproved: 'Improved Second Wind',
      secondWindRecovery: 'Second Wind Recovery Timing',
      secondWindWebEnhancement: 'Web Enhancement: Second Wind',
      feintSkill: 'Feint Skill',
      deathSystem: 'Death System',
      deathSaveDC: 'Death Save DC',

      // Force
      forceTrainingAttribute: 'Force Training Ability',
      blockDeflectTalents: 'Block & Deflect Behavior',
      blockMechanicalAlternative: 'Block Mechanic Alternative',
      forceSensitiveJediOnly: 'Force Sensitive Jedi Restriction',
      darkSideMaxMultiplier: 'Dark Side Max Score Multiplier',
      darkSidePowerIncreaseScore: 'Auto-Increase Dark Side Score',
      darkInspirationEnabled: 'Enable Dark Inspiration',
      forcePointRecovery: 'Force Point Recovery',
      darkSideTemptation: 'Dark Side Temptation Mode',

      // Skills & Talents
      skillFocusVariant: 'Skill Focus Variant',
      skillFocusActivationLevel: 'Delayed Skill Focus Activation',
      talentTreeRestriction: 'Talent Tree Access Rules',
      talentEveryLevel: 'Talent Every Level',
      talentEveryLevelExtraL1: 'Extra Talent at Level 1',
      talentDoubleLevels: 'Talent Double Level Option',
      crossClassSkillTraining: 'Cross-Class Skill Training',
      retrainingEnabled: 'Retraining System',
      skillTrainingEnabled: 'Skill Training Advancement',
      trainingPointsPerLevel: 'Training Points Per Level',
      multiclassBonusChoice: 'Multiclass Bonus Selection',
      abilityIncreaseMethod: 'Ability Increase Method',

      // Grapple & Flanking
      grappleEnabled: 'Enable Grapple',
      grappleVariant: 'Grapple Variant',
      grappleDCBonus: 'Grapple DC Bonus',
      flankingEnabled: 'Enable Flanking',
      flankingBonus: 'Flanking Bonus Type',
      flankingRequiresConsciousness: 'Flanking Requires Consciousness',
      flankingLargeCreatures: 'Flanking Large Creatures',
      flankingDiagonalCounts: 'Diagonal Adjacency Counts',

      // Recovery & Conditions
      recoveryEnabled: 'Enable Recovery & Healing',
      recoveryHPType: 'Recovery HP Amount',
      customRecoveryHP: 'Custom Recovery HP',
      recoveryVitality: 'Recover Vitality Points',
      conditionTrackEnabled: 'Enable Enhanced Condition Track',
      conditionTrackVariant: 'Condition Track Variant',
      conditionTrackAutoApply: 'Auto-Apply Condition Effects',
      enableEnhancedMassiveDamage: 'Enable Enhanced Massive Damage',
      persistentDTPenalty: 'Persistent Damage Threshold Penalty',
      doubleThresholdPenalty: 'Double Threshold Penalty',
      eliminateInstantDeath: 'Eliminate Instant Death',

      // Healing
      healingSkillEnabled: 'Enable Healing Skill Integration',
      firstAidEnabled: 'Allow First Aid',
      longTermCareEnabled: 'Allow Long-Term Care',
      performSurgeryEnabled: 'Allow Surgery',
      revivifyEnabled: 'Allow Revivify',
      criticalCareEnabled: 'Allow Critical Care',

      // Vehicles & Space Combat
      spaceInitiativeSystem: 'Space Combat Initiative',
      weaponsOperatorsRollInit: 'Weapons Operators Roll Initiative',
      enableScaleEngine: 'Enable Scale Engine',
      enableSWES: 'Enable Subsystem Engine',
      enableEnhancedShields: 'Enable Enhanced Shields',
      enableEnhancedEngineer: 'Enable Enhanced Engineer',
      enableEnhancedPilot: 'Enable Enhanced Pilot',
      enableEnhancedCommander: 'Enable Enhanced Commander',
      enableVehicleTurnController: 'Enable Vehicle Turn Controller',
      enableGlancingHit: 'Enable Glancing Hit Rule',
      enableLastGrasp: 'Enable Last Grasp',
      enableEmergencyPatch: 'Enable Emergency Patch',

      // Other
      enableExperienceSystem: 'Enable Experience System',
      statusEffectsEnabled: 'Enable Status Effects',
      bannedSpecies: 'Banned Species/Races'
    };

    return names[key] || key;
  }

  /**
   * Get description for a rule
   */
  _getRuleDescription(key) {
    const descriptions = {
      abilityScoreMethod: 'How ability scores are generated for new characters',
      pointBuyPool: 'Total ability score points available',
      allowAbilityReroll: 'Allow players to reroll low stat sets',
      allowPlayersNonheroic: 'Players can use the NPC generator',
      maxStartingCredits: 'Receive maximum starting credits',
      enableBackgrounds: 'Allow selecting backgrounds during creation',
      allowDroidDestiny: 'Droid characters can have Destiny Points',
      conditionTrackCap: 'Maximum CT steps moved by one hit',
      criticalHitVariant: 'How critical hits deal damage',
      diagonalMovement: 'Grid diagonal movement cost',
      secondWindImproved: 'Second Wind also moves up Condition Track',
      secondWindRecovery: 'When Second Wind recovers',
      forceTrainingAttribute: 'Force Training ability (WIS or CHA)',
      blockDeflectTalents: 'Block and Deflect as separate or combined',
      blockMechanicalAlternative: 'Non-Jedi melee weapons can block attacks',
      darkSideMaxMultiplier: 'Maximum Dark Side score multiplier',
      darkSidePowerIncreaseScore: 'Using Dark Side power increases DSS',
      darkInspirationEnabled: 'Dark Inspiration system available',
      forcePointRecovery: 'When Force Points refresh',
      darkSideTemptation: 'How Dark Side temptation is handled',
      skillFocusVariant: 'How Skill Focus calculates bonus',
      talentEveryLevel: 'Gain talent each level (not just odd)',
      recoveryEnabled: 'Specialized recovery mechanics during rest',
      recoveryHPType: 'How much HP is recovered per rest',
      conditionTrackEnabled: 'Advanced condition track mechanics',
      healingSkillEnabled: 'Treat Injury provides direct HP recovery',
      flankingEnabled: 'Flanking bonuses/penalties in combat',
      grappleEnabled: 'Specialized grapple mechanics',
      spaceInitiativeSystem: 'Per-person or ship-based initiative',
      statusEffectsEnabled: 'Condition/status effect tracking',
      enableScaleEngine: 'Character/starship scale conversions'
    };

    return descriptions[key] || '';
  }

  /**
   * Get the type of rule (boolean, string, number, etc.)
   */
  _getRuleType(key) {
    // Check SettingsHelper.DEFAULTS to determine type
    const defaults = SettingsHelper.DEFAULTS;
    const value = defaults[key];

    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';

    return 'unknown';
  }

  /**
   * Activators and event listeners
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Toggle switches
    html.on('change', 'input[type="checkbox"]', async (event) => {
      const key = event.target.dataset.ruleKey;
      const checked = event.target.checked;

      try {
        await game.settings.set(this.NS, key, checked);
        SWSELogger.info(`[HouseRulesApp] Updated ${key} = ${checked}`);
      } catch (err) {
        SWSELogger.error(`[HouseRulesApp] Failed to update ${key}:`, err);
        event.target.checked = !checked; // Revert on error
      }
    });

    // Animate category hover
    html.on('mouseenter', '.rule-category', function () {
      $(this).addClass('hovered');
    });

    html.on('mouseleave', '.rule-category', function () {
      $(this).removeClass('hovered');
    });
  }
}

/**
 * Rule categories for organization
 */
const HOUSE_RULES_CATEGORIES = {
  characterCreation: [
    'abilityScoreMethod',
    'pointBuyPool',
    'allowAbilityReroll',
    'allowPlayersNonheroic',
    'maxStartingCredits',
    'enableBackgrounds',
    'backgroundSelectionCount',
    'droidPointBuyPool',
    'livingPointBuyPool',
    'droidConstructionCredits',
    'allowDroidDestiny'
  ],

  combat: [
    'conditionTrackCap',
    'criticalHitVariant',
    'diagonalMovement',
    'weaponRangeReduction',
    'weaponRangeMultiplier',
    'armoredDefenseForAll',
    'trackBlasterCharges',
    'secondWindImproved',
    'secondWindRecovery',
    'secondWindWebEnhancement',
    'feintSkill',
    'deathSystem',
    'deathSaveDC',
    'grappleEnabled',
    'grappleVariant',
    'grappleDCBonus',
    'flankingEnabled',
    'flankingBonus',
    'flankingRequiresConsciousness',
    'flankingLargeCreatures',
    'flankingDiagonalCounts'
  ],

  force: [
    'forceTrainingAttribute',
    'blockDeflectTalents',
    'blockMechanicalAlternative',
    'forceSensitiveJediOnly',
    'darkSideMaxMultiplier',
    'darkSidePowerIncreaseScore',
    'darkInspirationEnabled',
    'forcePointRecovery',
    'darkSideTemptation'
  ],

  recovery: [
    'recoveryEnabled',
    'recoveryHPType',
    'customRecoveryHP',
    'recoveryVitality',
    'recoveryVitalityAmount',
    'recoveryTiming',
    'recoveryRequiresFullRest',
    'conditionTrackEnabled',
    'conditionTrackStartDamage',
    'conditionTrackProgression',
    'conditionTrackVariant',
    'conditionTrackAutoApply',
    'enableEnhancedMassiveDamage',
    'persistentDTPenalty',
    'persistentDTPenaltyCap',
    'doubleThresholdPenalty',
    'stunThresholdRule',
    'eliminateInstantDeath',
    'modifyDamageThresholdFormula',
    'damageThresholdFormulaType',
    'healingSkillEnabled',
    'firstAidEnabled',
    'longTermCareEnabled',
    'performSurgeryEnabled',
    'revivifyEnabled',
    'criticalCareEnabled'
  ],

  skills: [
    'skillFocusVariant',
    'skillFocusActivationLevel',
    'talentTreeRestriction',
    'talentEveryLevel',
    'talentEveryLevelExtraL1',
    'talentDoubleLevels',
    'crossClassSkillTraining',
    'retrainingEnabled',
    'skillTrainingEnabled',
    'trainingPointsPerLevel',
    'trainingPointsPerRest',
    'skillTrainingCap',
    'trainingCostScale',
    'trainingRequiresTrainer',
    'multiclassBonusChoice',
    'abilityIncreaseMethod',
    'statusEffectsEnabled',
    'statusEffectsList',
    'autoApplyFromConditionTrack',
    'statusEffectDurationTracking',
    'autoRemoveOnRest'
  ],

  vehicles: [
    'spaceInitiativeSystem',
    'initiativeRolePriority',
    'weaponsOperatorsRollInit',
    'enableScaleEngine',
    'enableSWES',
    'enableEnhancedShields',
    'enableEnhancedEngineer',
    'enableEnhancedPilot',
    'enableEnhancedCommander',
    'enableVehicleTurnController',
    'enableGlancingHit',
    'enableLastGrasp',
    'enableEmergencyPatch',
    'limitMoveObjectDamage'
  ]
};
