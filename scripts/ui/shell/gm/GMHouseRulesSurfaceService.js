/** GM house rules surface view-model and rule display catalog. */

import { SettingsHelper } from '/systems/foundryvtt-swse/scripts/utils/settings-helper.js';
import { HOUSERULE_MANIFEST } from '/systems/foundryvtt-swse/scripts/houserules/houserules-manifest.js';



const HOUSERULE_MANIFEST_BY_KEY = new Map((Array.isArray(HOUSERULE_MANIFEST) ? HOUSERULE_MANIFEST : [])
  .filter((entry) => entry?.key)
  .map((entry) => [String(entry.key), entry]));

const HOUSE_RULE_CATEGORY_META = {
  characterCreation: {
    label: 'Character Creation',
    icon: 'fa-solid fa-user-gear',
    tone: 'info',
    description: 'Chargen gates, point-buy pools, backgrounds, droid construction, and Holonet player transfer policy.'
  },
  combat: {
    label: 'Combat',
    icon: 'fa-solid fa-crosshairs',
    tone: 'warn',
    description: 'Attack flow, critical hits, condition penalties, range handling, second wind, death, and combat adjudication.'
  },
  force: {
    label: 'Force',
    icon: 'fa-solid fa-jedi',
    tone: 'info',
    description: 'Force Training attribute, Force-sensitive boundaries, dark side rules, Force Point recovery, and temptation handling.'
  },
  recovery: {
    label: 'Recovery & Conditions',
    icon: 'fa-solid fa-heart-pulse',
    tone: 'crit',
    description: 'Recovery mechanics, healing skill integration, massive damage, surgery, revivify, and condition track behavior.'
  },
  skills: {
    label: 'Skills & Talents',
    icon: 'fa-solid fa-book-open-reader',
    tone: 'ok',
    description: 'Skill Focus variants, training progression, multiclass bonuses, talent cadence, grappling, and flanking options.'
  },
  vehicles: {
    label: 'Vehicles & Space',
    icon: 'fa-solid fa-rocket',
    tone: 'info',
    description: 'Space initiative, subsystem engine toggles, scale engine, vehicle controller rules, status effects, and banned species.'
  }
};

const HOUSE_RULES_CATEGORIES = {
  characterCreation: [
    'abilityScoreMethod', 'pointBuyPool', 'allowAbilityReroll', 'allowPlayersNonheroic',
    'maxStartingCredits', 'holonetCreditTransfersEnabled', 'holonetRequireCreditTransferApproval', 'holonetItemTradesEnabled', 'holonetRequireItemTradeApproval', 'holonetAssetTradesEnabled', 'holonetRequireAssetTradeApproval', 'holonetPartyFundEnabled', 'holonetPartyFundDefaultCutPercent', 'enableBackgrounds', 'backgroundSelectionCount',
    'droidPointBuyPool', 'livingPointBuyPool', 'droidConstructionCredits', 'allowDroidDestiny'
  ],
  combat: [
    'conditionTrackCap', 'criticalHitVariant', 'diagonalMovement', 'weaponRangeReduction',
    'weaponRangeMultiplier', 'armoredDefenseForAll', 'trackBlasterCharges', 'secondWindImproved',
    'secondWindRecovery', 'secondWindWebEnhancement', 'feintSkill', 'deathSystem', 'deathSaveDC'
  ],
  force: [
    'forceTrainingAttribute', 'blockDeflectTalents', 'blockMechanicalAlternative',
    'forceSensitiveJediOnly', 'darkSideMaxMultiplier', 'darkSidePowerIncreaseScore',
    'darkInspirationEnabled', 'forcePointRecovery', 'darkSideTemptation'
  ],
  recovery: [
    'recoveryEnabled', 'recoveryHPType', 'customRecoveryHP', 'recoveryVitality',
    'conditionTrackEnabled', 'conditionTrackVariant', 'conditionTrackAutoApply',
    'enableEnhancedMassiveDamage', 'persistentDTPenalty', 'doubleThresholdPenalty',
    'eliminateInstantDeath', 'healingSkillEnabled', 'firstAidEnabled', 'longTermCareEnabled',
    'performSurgeryEnabled', 'revivifyEnabled', 'criticalCareEnabled'
  ],
  skills: [
    'skillFocusVariant', 'skillFocusActivationLevel', 'talentTreeRestriction', 'talentEveryLevel',
    'talentEveryLevelExtraL1', 'talentDoubleLevels', 'crossClassSkillTraining', 'retrainingEnabled',
    'skillTrainingEnabled', 'trainingPointsPerLevel', 'multiclassBonusChoice', 'abilityIncreaseMethod',
    'grappleEnabled', 'grappleVariant', 'grappleDCBonus', 'flankingEnabled', 'flankingBonus',
    'flankingRequiresConsciousness', 'flankingLargeCreatures', 'flankingDiagonalCounts'
  ],
  vehicles: [
    'spaceInitiativeSystem', 'weaponsOperatorsRollInit', 'enableScaleEngine', 'enableSWES',
    'enableEnhancedShields', 'enableEnhancedEngineer', 'enableEnhancedPilot',
    'enableEnhancedCommander', 'enableVehicleTurnController', 'enableGlancingHit',
    'enableLastGrasp', 'enableEmergencyPatch', 'enableExperienceSystem', 'statusEffectsEnabled',
    'bannedSpecies'
  ]
};

const RULE_NAMES = {
      abilityScoreMethod: 'Ability Score Method',
      pointBuyPool: 'Point Buy Pool',
      allowAbilityReroll: 'Allow Ability Reroll',
      allowPlayersNonheroic: 'Allow Non-Heroic Players',
      maxStartingCredits: 'Maximum Starting Credits',
      holonetRequireCreditTransferApproval: 'GM Approves Holonet Credit Transfers',
      holonetCreditTransfersEnabled: 'Allow Holonet Credit Transfers',
      holonetItemTradesEnabled: 'Allow Holonet Item Trades',
      holonetRequireItemTradeApproval: 'GM Approves Holonet Item Trades',
      holonetAssetTradesEnabled: 'Allow Ship/Droid Trades',
      holonetRequireAssetTradeApproval: 'GM Approves Ship/Droid Trades',
      holonetPartyFundEnabled: 'Enable Holonet Party Fund',
      holonetPartyFundDefaultCutPercent: 'Party Fund Job Cut Percent',
      enableBackgrounds: 'Enable Backgrounds',
      backgroundSelectionCount: 'Background Selection Count',
      droidPointBuyPool: 'Droid Point Buy Pool',
      livingPointBuyPool: 'Living Point Buy Pool',
      droidConstructionCredits: 'Droid Construction Credits',
      allowDroidDestiny: 'Allow Droids Destiny Points',
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
      forceTrainingAttribute: 'Force Training Ability',
      blockDeflectTalents: 'Block & Deflect Behavior',
      blockMechanicalAlternative: 'Block Mechanic Alternative',
      forceSensitiveJediOnly: 'Force Sensitive Jedi Restriction',
      darkSideMaxMultiplier: 'Dark Side Max Score Multiplier',
      darkSidePowerIncreaseScore: 'Auto-Increase Dark Side Score',
      darkInspirationEnabled: 'Enable Dark Inspiration',
      forcePointRecovery: 'Force Point Recovery',
      darkSideTemptation: 'Dark Side Temptation Mode',
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
      grappleEnabled: 'Enable Grapple',
      grappleVariant: 'Grapple Variant',
      grappleDCBonus: 'Grapple DC Bonus',
      flankingEnabled: 'Enable Flanking',
      flankingBonus: 'Flanking Bonus Type',
      flankingRequiresConsciousness: 'Flanking Requires Consciousness',
      flankingLargeCreatures: 'Flanking Large Creatures',
      flankingDiagonalCounts: 'Diagonal Adjacency Counts',
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
      healingSkillEnabled: 'Enable Healing Skill Integration',
      firstAidEnabled: 'Allow First Aid',
      longTermCareEnabled: 'Allow Long-Term Care',
      performSurgeryEnabled: 'Allow Surgery',
      revivifyEnabled: 'Allow Revivify',
      criticalCareEnabled: 'Allow Critical Care',
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
      enableExperienceSystem: 'Enable Experience System',
      statusEffectsEnabled: 'Enable Status Effects',
      bannedSpecies: 'Banned Species/Races'
    };

const RULE_DESCRIPTIONS = {
      abilityScoreMethod: 'How ability scores are generated for new characters',
      pointBuyPool: 'Total ability score points available',
      allowAbilityReroll: 'Allow players to reroll low stat sets',
      allowPlayersNonheroic: 'Players can use the NPC generator',
      maxStartingCredits: 'Receive maximum starting credits',
      holonetRequireCreditTransferApproval: 'Require GM approval before accepted player-to-player Holonet credit transfers complete',
      holonetCreditTransfersEnabled: 'Show Messenger send/request credit controls to players',
      holonetItemTradesEnabled: 'Show Messenger item trade controls to players',
      holonetRequireItemTradeApproval: 'Require GM approval before player item trades can be accepted',
      holonetAssetTradesEnabled: 'Show ship/droid trade entry points to players',
      holonetRequireAssetTradeApproval: 'Require GM approval for ship/droid asset trades; defaults on',
      holonetPartyFundEnabled: 'Enable a GM-managed party fund account in Holonet',
      holonetPartyFundDefaultCutPercent: 'Default percent of job payouts routed to the Party Fund',
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

export class GMHouseRulesSurfaceService {
  static async buildViewModel(_host) {
    const rules = this.buildRulesByCategory();
    const ruleCategories = this.buildCategoryViewModels(rules);
    const allRules = ruleCategories.flatMap((category) => category.rules);
    const activeRuleCount = allRules.filter((rule) => rule.enabled).length;
    const totalRuleCount = allRules.length;

    // Load species list for the bannedSpecies checkbox picker
    const bannedSpeciesOptions = await this._buildBannedSpeciesOptions();

    return {
      pageTitle: 'House Rules',
      pageDescription: 'Game rule modifications and campaign rule variants',
      rules,
      ruleCategories,
      activeRuleCount,
      inactiveRuleCount: Math.max(totalRuleCount - activeRuleCount, 0),
      totalRuleCount,
      categoryCount: ruleCategories.length,
      bannedSpeciesOptions
    };
  }

  /** Load all species from the compendium and mark which are currently banned. */
  static async _buildBannedSpeciesOptions() {
    try {
      const pack = game.packs.get('foundryvtt-swse.species');
      if (!pack) return [];

      const docs = await pack.getDocuments();
      const bannedRaw = SettingsHelper.getString('bannedSpecies', '');
      const bannedSet = new Set(
        bannedRaw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      );

      return docs
        .map(d => ({ name: d.name, id: d.id }))
        .filter(d => d.name)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(d => ({
          name: d.name,
          id: d.id,
          banned: bannedSet.has(d.name.toLowerCase())
        }));
    } catch (err) {
      return [];
    }
  }

  static buildCategoryViewModels(rules = this.buildRulesByCategory()) {
    return this.getCategoryIds().map((id) => {
      const categoryRules = rules[id] || [];
      const meta = HOUSE_RULE_CATEGORY_META[id] || {};
      const activeCount = categoryRules.filter((rule) => rule.enabled).length;
      return {
        id,
        label: meta.label || id,
        icon: meta.icon || 'fa-solid fa-sliders',
        tone: meta.tone || 'info',
        description: meta.description || '',
        rules: categoryRules,
        activeCount,
        inactiveCount: Math.max(categoryRules.length - activeCount, 0),
        totalCount: categoryRules.length,
        hasActive: activeCount > 0
      };
    });
  }

  static buildRulesByCategory() {
    return Object.fromEntries(this.getCategoryIds().map((category) => [
      category,
      this.getRulesForCategory(category)
    ]));
  }

  static getCategoryIds() {
    return Object.keys(HOUSE_RULES_CATEGORIES);
  }

  /** Get all rules for a specific category. */
  static getRulesForCategory(category) {
    const categoryRules = HOUSE_RULES_CATEGORIES[category] || [];
    return categoryRules.map((key) => this.buildRuleViewModel(key));
  }

  static buildRuleViewModel(key) {
    const manifest = this.getManifestEntry(key);
    const type = this.getRuleType(key, manifest);
    const defaultValue = manifest?.default ?? SettingsHelper.DEFAULTS?.[key];
    const value = this.getRuleValue(key, type, defaultValue);
    const choices = this.buildChoiceOptions(manifest?.choices, value);
    const hasChoices = choices.length > 0;
    const enabled = type === 'boolean' ? value === true : value !== undefined && value !== null && String(value) !== '';

    return {
      key,
      name: manifest?.name || this.getRuleName(key),
      description: manifest?.description || this.getRuleDescription(key),
      value,
      displayValue: this.formatRuleValue(value, type),
      defaultValue,
      enabled,
      type,
      choices,
      hasChoices,
      isBoolean: type === 'boolean',
      isNumber: type === 'number',
      isString: type === 'string',
      isArray: type === 'array',
      isObject: type === 'object',
      isEditableText: type === 'string' && !hasChoices,
      min: this.getNumberMin(key, manifest),
      max: this.getNumberMax(key, manifest),
      step: this.getNumberStep(key, manifest),
      status: manifest?.status || 'registered'
    };
  }

  static getManifestEntry(key) {
    return HOUSERULE_MANIFEST_BY_KEY.get(String(key));
  }

  static getRuleValue(key, type, defaultValue) {
    if (type === 'boolean') return SettingsHelper.getBoolean(key, Boolean(defaultValue));
    if (type === 'number') return SettingsHelper.getNumber(key, Number(defaultValue) || 0);
    if (type === 'array') return SettingsHelper.getArray(key, Array.isArray(defaultValue) ? defaultValue : []);
    if (type === 'object') return SettingsHelper.getObject(key, defaultValue && typeof defaultValue === 'object' ? defaultValue : {});
    return SettingsHelper.getString(key, defaultValue !== undefined && defaultValue !== null ? String(defaultValue) : '');
  }

  static buildChoiceOptions(choices, value) {
    if (!choices || typeof choices !== 'object' || Array.isArray(choices)) return [];
    return Object.entries(choices).map(([choiceValue, label]) => ({
      value: choiceValue,
      label: String(label),
      selected: String(choiceValue) === String(value)
    }));
  }

  static formatRuleValue(value, type) {
    if (type === 'boolean') return value ? 'Enabled' : 'Disabled';
    if (type === 'array') return Array.isArray(value) ? value.join(', ') : '';
    if (type === 'object') {
      try { return JSON.stringify(value); } catch (_err) { return '[object]'; }
    }
    return String(value ?? '');
  }

  static getNumberMin(_key, manifest) {
    return manifest?.range?.min ?? manifest?.min ?? '';
  }

  static getNumberMax(_key, manifest) {
    return manifest?.range?.max ?? manifest?.max ?? '';
  }

  static getNumberStep(_key, manifest) {
    return manifest?.range?.step ?? manifest?.step ?? 1;
  }

  static getRuleName(key) {
    return RULE_NAMES[key] || key;
  }

  static getRuleDescription(key) {
    return RULE_DESCRIPTIONS[key] || '';
  }

  static getRuleType(key, manifest = this.getManifestEntry(key)) {
    if (manifest?.type) return manifest.type;
    const value = SettingsHelper.DEFAULTS?.[key];

    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object' && value !== null) return 'object';

    return 'unknown';
  }

  static getActiveRuleCount() {
    return this.getCategoryIds()
      .flatMap((category) => this.getRulesForCategory(category))
      .filter((rule) => rule.enabled)
      .length;
  }
}
