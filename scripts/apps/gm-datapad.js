/**
 * GM Datapad (ApplicationV2)
 *
 * Consolidated GM operations hub using the same shell architecture as actor datapads.
 * Single window with internal routing to different pages:
 * - Home (app cards)
 * - Bulletin (party/player notices)
 * - House Rules (rule configuration)
 * - Store (governance dashboard)
 * - Approvals (droid/custom approvals)
 * - Workspace (GM-owned actors)
 *
 * Architecture: internal page routing, NOT multiple embedded ApplicationV2 windows
 * Styling: reuses .swse-datapad/.swse-screen patterns
 */

import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";
import { prompt as uiPrompt } from "/systems/foundryvtt-swse/scripts/utils/ui-utils.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";
import { HolonetEngine } from "/systems/foundryvtt-swse/scripts/holonet/holonet-engine.js";
import { HolonetStorage } from "/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js";
import { HolonetStateService } from "/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-state-service.js";
import { BulletinSource } from "/systems/foundryvtt-swse/scripts/holonet/sources/bulletin-source.js";
import { HolonetAudience } from "/systems/foundryvtt-swse/scripts/holonet/contracts/holonet-audience.js";
import { HolonetMarkupService } from "/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-markup-service.js";
import { SOURCE_FAMILY, DELIVERY_STATE, AUDIENCE_TYPE } from "/systems/foundryvtt-swse/scripts/holonet/contracts/enums.js";
import { HolonetComposerAssist } from "/systems/foundryvtt-swse/scripts/ui/holonet/HolonetComposerAssist.js";

export class GMDatapad extends BaseSWSEAppV2 {
  static DEFAULT_OPTIONS = {
    id: 'gm-datapad',
    tag: 'section',
    window: {
      title: 'GM Datapad',
      width: 1200,
      height: 800,
      resizable: true
    },
    classes: ['swse', 'gm-datapad', 'swse-datapad-container'],
    tabs: [
      {
        navSelector: '.gm-datapad-nav',
        contentSelector: '.gm-datapad-content',
        initial: 'home'
      }
    ]
  };

  static PARTS = {
    content: {
      template: 'systems/foundryvtt-swse/templates/apps/gm-datapad.hbs'
    }
  };

  static get defaultOptions() {
    const base = super.defaultOptions ?? super.DEFAULT_OPTIONS ?? {};
    const legacy = this.DEFAULT_OPTIONS ?? {};
    const clone = foundry.utils?.deepClone?.(base)
      ?? foundry.utils?.duplicate?.(base)
      ?? { ...base };
    return foundry.utils.mergeObject(clone, legacy);
  }

  constructor(options = {}) {
    super(options);
    this.currentPage = 'home';
    this.currentTab = 'transactions';
    this.currentBulletinSection = 'events';
    this.pageData = {};
    this.NS = 'foundryvtt-swse';
    this.bulletinEditor = { section: 'events', mode: 'create', recordId: null };
    this.selectedPlayerStateActorId = null;

    // Store page state
    this.transactions = [];
    this.pendingSales = [];
    this.storeApprovals = [];

    // Approvals page state
    this.pendingDroids = [];
  }

  async _prepareContext(options) {
    // GM-only access
    if (!game.user?.isGM) {
      throw new Error('GM Datapad is restricted to Game Masters.');
    }

    const context = await super._prepareContext(options);
    const pageContext = await this._loadPageContext(this.currentPage);
    const surfaceContext = ThemeResolutionService.buildSurfaceContext({ preferActor: false });
    const appCounts = await this._getHomeBadgeCounts();

    return foundry.utils.mergeObject(context, {
      currentPage: this.currentPage,
      apps: this._getAppCards(appCounts),
      ...surfaceContext,
      ...pageContext
    });
  }

  /**
   * Load context for the current page
   */
  async _loadPageContext(pageId) {
    switch (pageId) {
      case 'home':
        return this._loadHomeContext();
      case 'bulletin':
        return this._loadBulletinContext();
      case 'house-rules':
        return this._loadHouseRulesContext();
      case 'store':
        return this._loadStoreContext();
      case 'approvals':
        return this._loadApprovalsContext();
      case 'workspace':
        return this._loadWorkspaceContext();
      default:
        return {};
    }
  }


  async _getHomeBadgeCounts() {
    const bulletinRecords = await HolonetStorage.getAllRecords();
    const bulletinCount = bulletinRecords.filter((record) => record.sourceFamily === SOURCE_FAMILY.BULLETIN && record.state !== DELIVERY_STATE.ARCHIVED).length;

    await this._loadStorePendingSales();
    await this._loadStorePendingApprovals();
    await this._loadPendingDroids();

    return {
      bulletin: bulletinCount,
      approvals: (this.pendingDroids?.length ?? 0) + (this.storeApprovals?.length ?? 0),
      store: (this.pendingSales?.length ?? 0) + (this.storeApprovals?.length ?? 0),
      workspace: game.actors.filter((actor) => actor.isOwner).length
    };
  }

  _getAudienceOptions() {
    return [
      { value: AUDIENCE_TYPE.ALL_PLAYERS, label: 'All Players' },
      { value: AUDIENCE_TYPE.PARTY, label: 'Party' },
      { value: AUDIENCE_TYPE.GM_ONLY, label: 'GM Only' },
      { value: AUDIENCE_TYPE.GM_AND_PARTY, label: 'GM + Party' },
      { value: AUDIENCE_TYPE.ONE_PLAYER, label: 'One Player' },
      { value: AUDIENCE_TYPE.SELECTED_PLAYERS, label: 'Selected Players' }
    ];
  }

  _getBulletinPlayers() {
    return game.users
      .filter((user) => !user.isGM)
      .map((user) => ({
        userId: user.id,
        userName: user.name,
        actorId: user.character?.id ?? null,
        actorName: user.character?.name ?? user.name
      }));
  }

  _getAudienceLabel(audience) {
    if (!audience) return 'No audience';
    switch (audience.type) {
      case AUDIENCE_TYPE.ALL_PLAYERS: return 'All Players';
      case AUDIENCE_TYPE.PARTY: return 'Party';
      case AUDIENCE_TYPE.GM_ONLY: return 'GM Only';
      case AUDIENCE_TYPE.GM_AND_PARTY: return 'GM + Party';
      case AUDIENCE_TYPE.ONE_PLAYER:
        return audience.playerIds?.length ? `Player: ${this._resolvePlayerName(audience.playerIds[0])}` : 'One Player';
      case AUDIENCE_TYPE.SELECTED_PLAYERS:
        return audience.playerIds?.length ? `Selected (${audience.playerIds.length})` : 'Selected Players';
      default: return audience.type;
    }
  }

  _resolvePlayerName(userId) {
    return game.users.get(userId)?.character?.name ?? game.users.get(userId)?.name ?? 'Unknown';
  }

  _normalizeAudienceFromForm(formData) {
    const audienceType = formData.get('audienceType') || AUDIENCE_TYPE.ALL_PLAYERS;
    const playerIds = formData.getAll('playerIds').filter(Boolean);
    switch (audienceType) {
      case AUDIENCE_TYPE.ONE_PLAYER:
        return HolonetAudience.singlePlayer(playerIds[0]);
      case AUDIENCE_TYPE.SELECTED_PLAYERS:
        return HolonetAudience.selectedPlayers(playerIds);
      case AUDIENCE_TYPE.GM_ONLY:
        return HolonetAudience.gmOnly();
      case AUDIENCE_TYPE.ALL_PLAYERS:
        return HolonetAudience.allPlayers();
      case AUDIENCE_TYPE.PARTY:
        return new HolonetAudience({ type: AUDIENCE_TYPE.PARTY });
      case AUDIENCE_TYPE.GM_AND_PARTY:
        return new HolonetAudience({ type: AUDIENCE_TYPE.GM_AND_PARTY });
      default:
        return HolonetAudience.allPlayers();
    }
  }

  _buildBulletinRecordView(record) {
    return {
      id: record.id,
      intent: record.intent,
      title: record.title || 'Untitled',
      body: record.body || '',
      bodyPreview: (record.body || '').slice(0, 160),
      renderedBodyPreview: HolonetMarkupService.preview(record.body || '', 160),
      renderedBody: HolonetMarkupService.render(record.body || ''),
      state: record.state,
      stateLabel: (record.state || 'draft').toUpperCase(),
      sourceFamily: record.sourceFamily,
      category: record.metadata?.category || 'general',
      priority: record.priority || record.metadata?.priority || 'normal',
      audienceLabel: this._getAudienceLabel(record.audience),
      audienceType: record.audience?.type || AUDIENCE_TYPE.ALL_PLAYERS,
      audiencePlayerIds: record.audience?.playerIds || [],
      senderName: record.sender?.actorName || record.sender?.systemLabel || 'GM Bulletin',
      createdAt: record.createdAt ? new Date(record.createdAt).toLocaleString() : '—',
      publishedAt: record.publishedAt ? new Date(record.publishedAt).toLocaleString() : null
    };
  }

  _getBulletinEditorRecord(records, section) {
    if (!this.bulletinEditor?.recordId || this.bulletinEditor.section !== section) return null;
    return records.find((record) => record.id === this.bulletinEditor.recordId) ?? null;
  }

  /**
   * Home page: app cards
   */
  async _loadHomeContext() {
    const badgeCounts = await this._getHomeBadgeCounts();
    return {
      pageTitle: 'GM Operations',
      pageDescription: 'Master control for store, rules, approvals, and party management',
      badgeCounts
    };
  }

  /**
   * Bulletin page: party/player notices
   * Phase 2 will back this with journals/flags
   */
  async _loadBulletinContext() {
    const records = (await HolonetStorage.getAllRecords())
      .filter((record) => record.sourceFamily === SOURCE_FAMILY.BULLETIN)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    const eventRecords = records.filter((record) => record.type === 'event');
    const messageRecords = records.filter((record) => record.type === 'message');
    const bulletinPlayers = this._getBulletinPlayers();
    const selectedPlayerId = this.selectedPlayerStateActorId || bulletinPlayers[0]?.actorId || null;
    const selectedPlayerState = selectedPlayerId ? await HolonetStateService.getPlayerState(selectedPlayerId) : null;
    const partyState = await HolonetStateService.getPartyState();

    return {
      pageTitle: 'Bulletin',
      pageDescription: 'Broadcasts, direct messages, and current-state control',
      bulletinSection: this.currentBulletinSection,
      bulletinNav: [
        { id: 'events', label: 'Events', count: eventRecords.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED).length },
        { id: 'messages', label: 'Messages', count: messageRecords.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED).length },
        { id: 'players', label: 'Players', count: bulletinPlayers.length },
        { id: 'party', label: 'Party', count: partyState?.situation || partyState?.objective || partyState?.location ? 1 : 0 }
      ],
      audienceOptions: this._getAudienceOptions(),
      bulletinPlayers,
      selectedPlayerId,
      selectedPlayerState,
      partyState,
      eventRecords: eventRecords.map((record) => this._buildBulletinRecordView(record)),
      messageRecords: messageRecords.map((record) => this._buildBulletinRecordView(record)),
      eventEditorRecord: this._getBulletinEditorRecord(eventRecords, 'events') ? this._buildBulletinRecordView(this._getBulletinEditorRecord(eventRecords, 'events')) : null,
      messageEditorRecord: this._getBulletinEditorRecord(messageRecords, 'messages') ? this._buildBulletinRecordView(this._getBulletinEditorRecord(messageRecords, 'messages')) : null,
      syntaxGuide: [
        '@ mention character, NPC, ship, faction, or location',
        '# add emphasis or a topic tag',
        '! mark urgent alerts',
        '+800cr style credits/rewards',
        'Examples: @Master Tholos wants @Kael at the #Jedi Temple. !urgent +800cr reward posted.'
      ]
    };
  }

  /**
   * House Rules page: rule configuration
   * Migrated from HouseRulesApp - reuses HouseRuleService
   */
  async _loadHouseRulesContext() {
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
      pageTitle: 'House Rules',
      pageDescription: 'Game rule modifications',
      rules,
      activeRuleCount
    };
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
   * Get the type of rule
   */
  _getRuleType(key) {
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
   * Store page: governance dashboard
   * Migrated from GMStoreDashboard
   */
  async _loadStoreContext() {
    await this._loadStoreTransactionHistory();
    await this._loadStorePendingSales();
    await this._loadStorePendingApprovals();

    const storeOpen = SettingsHelper.getSafe('storeOpen', true);
    const buyModifier = SettingsHelper.getSafe('globalBuyModifier', 0);
    const autoAcceptSelling = SettingsHelper.getSafe('autoAcceptItemSales', false);
    const autoSalePercent = SettingsHelper.getSafe('automaticSalePercentage', 50);
    const disallowAutoSellNoPrice = SettingsHelper.getSafe('disallowAutoSellNoPrice', true);

    const visibleRarities = SettingsHelper.getObject('visibleRarities', {
      common: true,
      uncommon: true,
      rare: false,
      restricted: false,
      illegal: false
    });

    const visibleTypes = SettingsHelper.getObject('visibleItemTypes', {
      weapons: true,
      armor: true,
      gear: true,
      droids: true,
      vehicles: true
    });

    const blacklistedItems = SettingsHelper.getArray('blacklistedItems', []);

    return {
      pageTitle: 'Store',
      pageDescription: 'Store governance and approvals',
      transactions: this.transactions,
      pendingSales: this.pendingSales,
      pendingApprovals: this.storeApprovals,
      storeOpen,
      buyModifier,
      autoAcceptSelling,
      autoSalePercent,
      disallowAutoSellNoPrice,
      visibleRarities,
      visibleTypes,
      blacklistedItems,
      actors: game.actors.filter(a => a.isOwner).map(a => ({ id: a.id, name: a.name })),
      currentTab: this.currentTab
    };
  }

  /**
   * Load transaction history from all actors
   */
  async _loadStoreTransactionHistory() {
    this.transactions = [];

    for (const actor of game.actors) {
      const history = actor.getFlag('foundryvtt-swse', 'purchaseHistory') || [];
      for (const purchase of history) {
        for (const item of purchase.items) {
          this.transactions.push({
            timestamp: purchase.timestamp,
            actor: actor.name,
            type: 'Buy',
            item: item.name,
            amount: -normalizeCredits(item.cost),
            source: 'Store',
            actorId: actor.id,
            purchaseId: purchase.timestamp
          });
        }
      }
    }

    this.transactions.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Load pending sales
   */
  async _loadStorePendingSales() {
    this.pendingSales = SettingsHelper.getArray('pendingSales', []);
  }

  /**
   * Load pending store approvals (custom droids/vehicles)
   */
  async _loadStorePendingApprovals() {
    this.storeApprovals = SettingsHelper.getArray('pendingCustomPurchases', []);

    for (const approval of this.storeApprovals) {
      const ownerActor = game.actors.get(approval.ownerActorId);
      approval.ownerActorName = ownerActor?.name || 'Unknown Player';
      approval.timeSubmitted = new Date(approval.requestedAt).toLocaleString();
    }
  }

  /**
   * Approvals page: droid and store approvals
   * Migrated from GMDroidApprovalDashboard and GMStoreDashboard
   */
  async _loadApprovalsContext() {
    await this._loadPendingDroids();
    await this._loadStorePendingApprovals();

    return {
      pageTitle: 'Approvals',
      pageDescription: 'Pending droid and store approvals',
      pendingDroids: this.pendingDroids,
      storeApprovals: this.storeApprovals,
      hasPendingDroids: this.pendingDroids.length > 0,
      hasPendingApprovals: this.storeApprovals.length > 0
    };
  }

  /**
   * Load pending droids from all actors
   */
  async _loadPendingDroids() {
    this.pendingDroids = [];

    for (const actor of game.actors) {
      if (!actor.system?.droidSystems) continue;
      if (actor.system.droidSystems.stateMode !== 'PENDING') continue;

      const droidData = actor.system.droidSystems;
      const owner = game.users.get(actor.ownership[Object.keys(actor.ownership)[0]]);

      this.pendingDroids.push({
        actorId: actor.id,
        actorName: actor.name,
        ownerName: owner?.name || 'Unknown',
        degree: droidData.degree || 'Unknown',
        size: droidData.size || 'Medium',
        locomotion: droidData.locomotion?.name || 'None',
        processor: droidData.processor?.name || 'None',
        armor: droidData.armor?.name || 'None',
        appendages: droidData.appendages?.length || 0,
        sensors: droidData.sensors?.length || 0,
        weapons: droidData.weapons?.length || 0,
        accessories: droidData.accessories?.length || 0,
        cost: droidData.credits?.spent || 0,
        createdAt: droidData.buildHistory?.[0]?.timestamp || 'Unknown'
      });
    }
  }

  /**
   * Workspace page: GM-owned actor access
   * Future: quick-open sheets, pinned actors, active cast
   */
  async _loadWorkspaceContext() {
    const gmActors = game.actors.filter(a => a.isOwner);
    return {
      pageTitle: 'Workspace',
      pageDescription: 'GM-owned actor access',
      gmActors: gmActors.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        img: a.img
      }))
    };
  }

  /**
   * Get app card definitions for home page
   */
  _getAppCards(counts = {}) {
    return [
      { id: 'bulletin', label: 'Bulletin', icon: 'fa-solid fa-newspaper', description: 'Party and player notices', badgeCount: counts.bulletin ?? 0 },
      { id: 'house-rules', label: 'House Rules', icon: 'fa-solid fa-book', description: 'Game rule modifications', badgeCount: counts.houseRules ?? 0 },
      { id: 'store', label: 'Store', icon: 'fa-solid fa-store', description: 'Store governance', badgeCount: counts.store ?? 0 },
      { id: 'approvals', label: 'Approvals', icon: 'fa-solid fa-check-circle', description: 'Pending approvals', badgeCount: counts.approvals ?? 0 },
      { id: 'workspace', label: 'Workspace', icon: 'fa-solid fa-users', description: 'GM actor access', badgeCount: counts.workspace ?? 0 }
    ];
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    // Wire app card clicks
    root.querySelectorAll('[data-app-card]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const appId = ev.currentTarget.dataset.appCard;
        this._navigateTo(appId);
      });
    });

    // Wire nav buttons
    root.querySelectorAll('[data-nav-to]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const pageId = ev.currentTarget.dataset.navTo;
        this._navigateTo(pageId);
      });
    });

    // Wire workspace actor clicks
    root.querySelectorAll('[data-open-actor]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        const actorId = ev.currentTarget.dataset.openActor;
        const actor = game.actors.get(actorId);
        if (actor) {
          actor.sheet.render(true);
        }
      });
    });

    // Wire page-specific events based on current page
    if (this.currentPage === 'bulletin') {
      await this._wireBulletinEvents(root);
    } else if (this.currentPage === 'store') {
      await this._wireStoreEvents(root);
    } else if (this.currentPage === 'house-rules') {
      await this._wireHouseRulesEvents(root);
    } else if (this.currentPage === 'approvals') {
      await this._wireApprovalsEvents(root);
    }
  }

  /**
   * Wire bulletin page events
   */
  async _wireBulletinEvents(root) {
    const pageElement = root.querySelector('.gm-datapad-bulletin');
    if (!pageElement) return;

    await HolonetComposerAssist.attach(pageElement);

    pageElement.querySelectorAll('[data-bulletin-section]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        this.currentBulletinSection = event.currentTarget.dataset.bulletinSection;
        this.bulletinEditor = { section: this.currentBulletinSection, mode: 'create', recordId: null };
        await this.render(false);
      });
    });

    pageElement.querySelectorAll('[data-action="bulletin-edit"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        this.bulletinEditor = {
          section: event.currentTarget.dataset.section,
          mode: 'edit',
          recordId: event.currentTarget.dataset.recordId
        };
        await this.render(false);
      });
    });

    pageElement.querySelectorAll('[data-action="bulletin-archive"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        await HolonetEngine.archiveRecord(event.currentTarget.dataset.recordId);
        await this.render(false);
      });
    });

    pageElement.querySelectorAll('[data-action="bulletin-delete"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        await HolonetStorage.deleteRecord(event.currentTarget.dataset.recordId);
        if (this.bulletinEditor?.recordId === event.currentTarget.dataset.recordId) {
          this.bulletinEditor = { section: this.currentBulletinSection, mode: 'create', recordId: null };
        }
        await this.render(false);
      });
    });

    pageElement.querySelectorAll('[data-action="bulletin-publish"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        const record = await HolonetStorage.getRecord(event.currentTarget.dataset.recordId);
        if (!record) return;
        await HolonetEngine.publish(record);
        await this.render(false);
      });
    });

    pageElement.querySelectorAll('[data-submit-mode]').forEach((button) => {
      button.addEventListener('click', (event) => {
        const form = event.currentTarget.closest('form');
        const hidden = form?.querySelector('[name="submitMode"]');
        if (hidden) hidden.value = event.currentTarget.dataset.submitMode;
      });
    });

    const eventsForm = pageElement.querySelector('[data-bulletin-form="events"]');
    if (eventsForm) {
      eventsForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await this._saveBulletinRecord(new FormData(eventsForm), 'events');
      });
    }

    const messagesForm = pageElement.querySelector('[data-bulletin-form="messages"]');
    if (messagesForm) {
      messagesForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await this._saveBulletinRecord(new FormData(messagesForm), 'messages');
      });
    }

    const playerStateForm = pageElement.querySelector('[data-player-state-form]');
    if (playerStateForm) {
      playerStateForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(playerStateForm);
        const actorId = formData.get('actorId');
        if (!actorId) return;
        await HolonetStateService.savePlayerState(actorId, {
          location: formData.get('location'),
          objective: formData.get('objective'),
          situation: formData.get('situation')
        });
        this.selectedPlayerStateActorId = actorId;
        await this.render(false);
      });
    }

    pageElement.querySelectorAll('[data-select-player-state]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        this.selectedPlayerStateActorId = event.currentTarget.dataset.selectPlayerState;
        await this.render(false);
      });
    });

    const partyStateForm = pageElement.querySelector('[data-party-state-form]');
    if (partyStateForm) {
      partyStateForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(partyStateForm);
        await HolonetStateService.savePartyState({
          location: formData.get('location'),
          objective: formData.get('objective'),
          situation: formData.get('situation')
        });
        await this.render(false);
      });
    }
  }

  async _saveBulletinRecord(formData, section) {
    const recordId = formData.get('recordId') || null;
    const shouldPublish = formData.get('submitMode') === 'publish';
    const audience = this._normalizeAudienceFromForm(formData);
    let record = recordId ? await HolonetStorage.getRecord(recordId) : null;

    const baseData = {
      id: recordId || undefined,
      title: formData.get('title') || '',
      body: formData.get('body') || '',
      category: formData.get('category') || (section === 'events' ? 'news' : 'message'),
      priority: formData.get('priority') || 'normal',
      audience,
      authorName: formData.get('authorName') || game.user?.name || 'GM Bulletin',
      authorActorId: formData.get('authorActorId') || null,
      authorActorName: formData.get('authorActorName') || null,
      state: shouldPublish ? DELIVERY_STATE.PUBLISHED : DELIVERY_STATE.DRAFT,
      metadata: {
        category: formData.get('category') || (section === 'events' ? 'news' : 'message')
      }
    };

    if (!record) {
      record = section === 'events'
        ? BulletinSource.createBulletinEvent(baseData)
        : BulletinSource.createBulletinMessage(baseData);
    } else {
      record.title = baseData.title;
      record.body = baseData.body;
      record.audience = baseData.audience;
      record.priority = baseData.priority;
      record.metadata = { ...record.metadata, ...baseData.metadata };
      record.sender = section === 'events'
        ? BulletinSource.createBulletinEvent(baseData).sender
        : BulletinSource.createBulletinMessage(baseData).sender;
      record.updatedAt = new Date().toISOString();
    }

    if (shouldPublish) {
      await HolonetEngine.publish(record);
    } else {
      await HolonetStorage.saveRecord(record);
    }

    this.bulletinEditor = { section, mode: 'create', recordId: null };
    await this.render(false);
  }

  /**
   * Wire store page events
   */
  async _wireStoreEvents(root) {
    const pageElement = root.querySelector('.gm-datapad-store');
    if (!pageElement) return;

    // Store availability toggle
    const storeOpenToggle = pageElement.querySelector('[name="storeOpen"]');
    if (storeOpenToggle) {
      storeOpenToggle.addEventListener('change', async (ev) => {
        await HouseRuleService.set('storeOpen', ev.currentTarget.checked);
        this.render(false);
      });
    }

    // Buy price modifier slider
    const buyModifierSlider = pageElement.querySelector('[name="buyModifier"]');
    if (buyModifierSlider) {
      buyModifierSlider.addEventListener('input', async (ev) => {
        const value = normalizeCredits(ev.currentTarget.value);
        await HouseRuleService.set('globalBuyModifier', value);
      });
    }

    // Rarity visibility checkboxes
    for (const rarity of ['common', 'uncommon', 'rare', 'restricted', 'illegal']) {
      const checkbox = pageElement.querySelector(`[name="rarity-${rarity}"]`);
      if (checkbox) {
        checkbox.addEventListener('change', async (ev) => {
          const visibleRarities = SettingsHelper.getObject('visibleRarities', {});
          visibleRarities[rarity] = ev.currentTarget.checked;
          await SettingsHelper.set('visibleRarities', visibleRarities);
        });
      }
    }

    // Item type visibility checkboxes
    for (const type of ['weapons', 'armor', 'gear', 'droids', 'vehicles']) {
      const checkbox = pageElement.querySelector(`[name="type-${type}"]`);
      if (checkbox) {
        checkbox.addEventListener('change', async (ev) => {
          const visibleTypes = SettingsHelper.getObject('visibleItemTypes', {});
          visibleTypes[type] = ev.currentTarget.checked;
          await SettingsHelper.set('visibleItemTypes', visibleTypes);
        });
      }
    }

    // Auto-accept selling toggle
    const autoAcceptToggle = pageElement.querySelector('[name="autoAcceptSelling"]');
    if (autoAcceptToggle) {
      autoAcceptToggle.addEventListener('change', async (ev) => {
        await HouseRuleService.set('autoAcceptItemSales', ev.currentTarget.checked);
        this.render(false);
      });
    }

    // Auto-sale percentage slider
    const autoSaleSlider = pageElement.querySelector('[name="autoSalePercent"]');
    if (autoSaleSlider) {
      autoSaleSlider.addEventListener('input', async (ev) => {
        await HouseRuleService.set('automaticSalePercentage', Number(ev.currentTarget.value));
      });
    }

    // Disallow auto-sell no-price toggle
    const disallowToggle = pageElement.querySelector('[name="disallowAutoSellNoPrice"]');
    if (disallowToggle) {
      disallowToggle.addEventListener('change', async (ev) => {
        await HouseRuleService.set('disallowAutoSellNoPrice', ev.currentTarget.checked);
      });
    }

    // Transaction reversal buttons
    for (const btn of pageElement.querySelectorAll('[data-action="reverse-transaction"]')) {
      btn.addEventListener('click', async (ev) => {
        const index = Number(ev.currentTarget.dataset.index);
        await this._reverseTransaction(index);
      });
    }
  }

  /**
   * Wire house rules page events
   */
  async _wireHouseRulesEvents(root) {
    const pageElement = root.querySelector('.gm-datapad-house-rules');
    if (!pageElement) return;

    // Wire checkbox toggles for all rules
    pageElement.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.addEventListener('change', async (event) => {
        const key = event.target.dataset.ruleKey;
        const checked = event.target.checked;

        try {
          await HouseRuleService.set(key, checked);
          SWSELogger.info(`[GMDatapad House Rules] Updated ${key} = ${checked}`);
        } catch (err) {
          SWSELogger.error(`[GMDatapad House Rules] Failed to update ${key}:`, err);
          event.target.checked = !checked;
        }
      });
    });

    // Animate category hover
    pageElement.querySelectorAll('.rule-category').forEach(category => {
      category.addEventListener('mouseenter', (event) => {
        event.currentTarget.classList.add('hovered');
      });
      category.addEventListener('mouseleave', (event) => {
        event.currentTarget.classList.remove('hovered');
      });
    });
  }

  /**
   * Wire approvals page events
   */
  async _wireApprovalsEvents(root) {
    const pageElement = root.querySelector('.gm-datapad-approvals');
    if (!pageElement) return;

    // DROID APPROVAL EVENTS
    for (const btn of pageElement.querySelectorAll('.approve-droid-btn')) {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const actorId = ev.currentTarget?.dataset?.actorId;
        if (actorId) await this._approveDroid(actorId);
      });
    }

    for (const btn of pageElement.querySelectorAll('.reject-droid-btn')) {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const actorId = ev.currentTarget?.dataset?.actorId;
        if (actorId) await this._rejectDroid(actorId);
      });
    }

    for (const btn of pageElement.querySelectorAll('.view-droid-details-btn')) {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const actorId = ev.currentTarget?.dataset?.actorId;
        if (actorId) {
          const actor = game.actors.get(actorId);
          if (actor) actor.sheet.render(true);
        }
      });
    }

    // STORE APPROVAL EVENTS
    for (const btn of pageElement.querySelectorAll('[data-action="preview-approval"]')) {
      btn.addEventListener('click', async (ev) => {
        const approvalIndex = Number(ev.currentTarget.dataset.index);
        await this._previewPendingCustom(approvalIndex);
      });
    }

    for (const btn of pageElement.querySelectorAll('[data-action="edit-approval"]')) {
      btn.addEventListener('click', async (ev) => {
        const approvalIndex = Number(ev.currentTarget.dataset.index);
        await this._editPendingCustom(approvalIndex);
      });
    }

    for (const btn of pageElement.querySelectorAll('[data-action="approve-custom"]')) {
      btn.addEventListener('click', async (ev) => {
        const approvalIndex = Number(ev.currentTarget.dataset.index);
        await this._approvePendingCustom(approvalIndex);
      });
    }

    for (const btn of pageElement.querySelectorAll('[data-action="deny-custom"]')) {
      btn.addEventListener('click', async (ev) => {
        const approvalIndex = Number(ev.currentTarget.dataset.index);
        await this._denyPendingCustom(approvalIndex);
      });
    }
  }

  /**
   * Reverse a transaction and adjust credits
   */
  async _reverseTransaction(index) {
    if (index < 0 || index >= this.transactions.length) {
      ui?.notifications?.error?.('Invalid transaction index');
      return;
    }

    const transaction = this.transactions[index];
    const actor = game.actors.get(transaction.actorId);

    if (!actor) {
      ui?.notifications?.error?.('Actor not found');
      return;
    }

    const currentCredits = Number(actor.system.credits) || 0;
    const newCredits = currentCredits - transaction.amount;

    try {
      await ActorEngine.updateActor(actor, { 'system.credits': newCredits });
      ui?.notifications?.info?.(`Reversed transaction: ${transaction.actor} now has ${newCredits} credits`);
      this.render(false);
    } catch (err) {
      SWSELogger.error('[GMDatapad] Error reversing transaction:', err);
      ui?.notifications?.error?.(`Failed to reverse transaction: ${err.message}`);
    }
  }

  /**
   * Approve a pending droid
   */
  async _approveDroid(actorId) {
    const actor = game.actors.get(actorId);
    if (!actor) {
      ui?.notifications?.error?.('Actor not found');
      return;
    }

    const droidData = actor.system.droidSystems;
    if (droidData.stateMode !== 'PENDING') {
      ui?.notifications?.warn?.('This droid is not pending approval');
      return;
    }

    const currentCredits = Number(actor.system.credits) || 0;
    const cost = droidData.credits?.spent || 0;
    const newCredits = Math.max(0, currentCredits - cost);

    const updates = {
      'system.credits': newCredits,
      'system.droidSystems.stateMode': 'FINALIZED'
    };

    try {
      await ActorEngine.updateActor(actor, updates);
      const buildHistory = droidData.buildHistory || [];
      buildHistory.push({
        timestamp: Date.now(),
        action: 'approved',
        approvedAt: new Date().toLocaleString()
      });
      await ActorEngine.updateActor(actor, { 'system.droidSystems.buildHistory': buildHistory });

      Hooks.call('swseApprovalResolved', {
        approval: { id: `droid-${actor.id}`, type: 'droid', draftData: { name: actor.name } },
        actor,
        decision: 'approved',
        decidedBy: game.user?.name ?? 'GM'
      });

      ui?.notifications?.info?.(`Droid "${actor.name}" approved`);
      this.render(false);
    } catch (err) {
      SWSELogger.error('[GMDatapad] Error approving droid:', err);
      ui?.notifications?.error?.(`Failed to approve droid: ${err.message}`);
    }
  }

  /**
   * Reject a pending droid
   */
  async _rejectDroid(actorId) {
    const actor = game.actors.get(actorId);
    if (!actor) {
      ui?.notifications?.error?.('Actor not found');
      return;
    }

    const droidData = actor.system.droidSystems;
    if (droidData.stateMode !== 'PENDING') {
      ui?.notifications?.warn?.('This droid is not pending approval');
      return;
    }

    const updates = {
      'system.droidSystems.stateMode': 'REJECTED'
    };

    try {
      await ActorEngine.updateActor(actor, updates);
      const buildHistory = droidData.buildHistory || [];
      buildHistory.push({
        timestamp: Date.now(),
        action: 'rejected',
        rejectedAt: new Date().toLocaleString()
      });
      await ActorEngine.updateActor(actor, { 'system.droidSystems.buildHistory': buildHistory });

      Hooks.call('swseApprovalResolved', {
        approval: { id: `droid-${actor.id}`, type: 'droid', draftData: { name: actor.name } },
        actor,
        decision: 'denied',
        decidedBy: game.user?.name ?? 'GM'
      });

      ui?.notifications?.info?.(`Droid "${actor.name}" rejected`);
      this.render(false);
    } catch (err) {
      SWSELogger.error('[GMDatapad] Error rejecting droid:', err);
      ui?.notifications?.error?.(`Failed to reject droid: ${err.message}`);
    }
  }

  /**
   * Preview a pending custom purchase
   */
  async _previewPendingCustom(index) {
    if (index < 0 || index >= this.storeApprovals.length) {
      ui?.notifications?.error?.('Invalid approval index');
      return;
    }

    const approval = this.storeApprovals[index];
    const actor = game.actors.get(approval.ownerActorId);

    if (actor) {
      actor.sheet.render(true);
    }
  }

  /**
   * Edit a pending custom purchase (placeholder for Phase 3)
   */
  async _editPendingCustom(index) {
    ui?.notifications?.info?.('Edit functionality coming in Phase 3');
  }

  /**
   * Approve a pending custom purchase
   */
  async _approvePendingCustom(index) {
    if (index < 0 || index >= this.storeApprovals.length) {
      ui?.notifications?.error?.('Invalid approval index');
      return;
    }

    const approval = this.storeApprovals[index];
    const actor = game.actors.get(approval.ownerActorId);

    if (!actor) {
      ui?.notifications?.error?.('Actor not found');
      return;
    }

    const currentCredits = Number(actor.system.credits) || 0;
    const cost = approval.costCredits || 0;
    const newCredits = Math.max(0, currentCredits - cost);

    try {
      await ActorEngine.updateActor(actor, { 'system.credits': newCredits });

      const approvals = SettingsHelper.getArray('pendingCustomPurchases', []);
      approvals.splice(index, 1);
      await SettingsHelper.set('pendingCustomPurchases', approvals);

      ui?.notifications?.info?.(`Approved: ${approval.draftData.name}`);
      this.render(false);
    } catch (err) {
      SWSELogger.error('[GMDatapad] Error approving custom purchase:', err);
      ui?.notifications?.error?.(`Failed to approve: ${err.message}`);
    }
  }

  /**
   * Deny a pending custom purchase
   */
  async _denyPendingCustom(index) {
    if (index < 0 || index >= this.storeApprovals.length) {
      ui?.notifications?.error?.('Invalid approval index');
      return;
    }

    try {
      const approvals = SettingsHelper.getArray('pendingCustomPurchases', []);
      const denial = approvals[index];
      approvals.splice(index, 1);
      await SettingsHelper.set('pendingCustomPurchases', approvals);

      ui?.notifications?.info?.(`Denied: ${denial.draftData.name}`);
      this.render(false);
    } catch (err) {
      SWSELogger.error('[GMDatapad] Error denying custom purchase:', err);
      ui?.notifications?.error?.(`Failed to deny: ${err.message}`);
    }
  }

  /**
   * Navigate to a different page within the datapad
   */
  async _navigateTo(pageId) {
    SWSELogger.log(`[GM Datapad] Navigating to: ${pageId}`);
    this.currentPage = pageId;
    if (pageId === 'store') {
      this.currentTab = 'transactions';
    }
    await this.render(false);
  }
}

/**
 * House Rules Categories
 */
const HOUSE_RULES_CATEGORIES = {
  characterCreation: [
    'abilityScoreMethod', 'pointBuyPool', 'allowAbilityReroll', 'allowPlayersNonheroic',
    'maxStartingCredits', 'enableBackgrounds', 'backgroundSelectionCount',
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

export default GMDatapad;
