/**
 * GM Datapad (ApplicationV2)
 *
 * Consolidated GM operations hub using the same shell architecture as actor datapads.
 * Single window shell host with GM-specific surface services:
 * - Home (app cards)
 * - Bulletin (party/player notices)
 * - House Rules (rule configuration)
 * - Store (governance dashboard)
 * - Approvals (droid/custom approvals)
 * - Healing (party recovery management)
 * - Settings (shared holopad preferences)
 * - Workspace (GM-owned actors)
 *
 * Architecture: shell-style surface routing, NOT multiple embedded ApplicationV2 windows
 * Styling: reuses .swse-datapad/.swse-screen patterns
 */

import { BaseSWSEAppV2 } from "/systems/foundryvtt-swse/scripts/apps/base/base-swse-appv2.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";
import { SettingsHelper } from "/systems/foundryvtt-swse/scripts/utils/settings-helper.js";
import { HouseRuleService } from "/systems/foundryvtt-swse/scripts/engine/system/HouseRuleService.js";
import { ActorEngine } from "/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js";
import { SWSEDialogV2 } from "/systems/foundryvtt-swse/scripts/apps/dialogs/swse-dialog-v2.js";
import { normalizeCredits } from "/systems/foundryvtt-swse/scripts/utils/credit-normalization.js";
import { prompt as uiPrompt } from "/systems/foundryvtt-swse/scripts/utils/ui-utils.js";
import { ThemeResolutionService } from "/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js";
import { SettingsSurfaceController } from "/systems/foundryvtt-swse/scripts/ui/shell/SettingsSurfaceController.js";
import { GMSurfaceRegistry } from "/systems/foundryvtt-swse/scripts/ui/shell/gm/GMSurfaceRegistry.js";
import { HolonetEngine } from "/systems/foundryvtt-swse/scripts/holonet/holonet-engine.js";
import { HolonetStorage } from "/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js";
import { HolonetStateService } from "/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-state-service.js";
import { BulletinSource } from "/systems/foundryvtt-swse/scripts/holonet/sources/bulletin-source.js";
import { HolonetAudience } from "/systems/foundryvtt-swse/scripts/holonet/contracts/holonet-audience.js";
import { HolonetMarkupService } from "/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-markup-service.js";
import { SOURCE_FAMILY, DELIVERY_STATE, AUDIENCE_TYPE } from "/systems/foundryvtt-swse/scripts/holonet/contracts/enums.js";
import { HolonetComposerAssist } from "/systems/foundryvtt-swse/scripts/ui/holonet/HolonetComposerAssist.js";
import { GMHealingTrigger } from "/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-healing-trigger.js";

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
    this.currentTab = 'options';
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
    this.selectedApprovalKey = null;
    this.approvalEditMode = false;
    this.approvalDenyMode = false;

    // Shared surface controllers
    this._settingsSurfaceController = null;
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
      homeSummary: appCounts,
      user: game.user,
      ...surfaceContext,
      ...pageContext
    });
  }

  /**
   * Load the active GM shell surface context.
   *
   * Phase 3 moves page view-model ownership out of this ApplicationV2 host and
   * into dedicated GM surface services. Existing action handlers remain here
   * for now so the migration stays surgical and low-risk.
   */
  async _loadPageContext(pageId) {
    return GMSurfaceRegistry.buildSurfaceVm({
      surfaceId: pageId || 'home',
      host: this
    });
  }


  async _getHomeBadgeCounts() {
    const bulletinRecords = await HolonetStorage.getAllRecords();
    const bulletinCount = bulletinRecords.filter((record) => record.sourceFamily === SOURCE_FAMILY.BULLETIN && record.state !== DELIVERY_STATE.ARCHIVED).length;

    await this._loadStorePendingSales();
    await this._loadStorePendingApprovals();
    await this._loadPendingDroids();

    let healingEligible = 0;
    try {
      const healingSummary = await GMHealingTrigger.getHealingSummary();
      healingEligible = healingSummary?.eligible ?? 0;
    } catch (err) {
      SWSELogger.warn('[GMDatapad] Unable to load healing summary for home badge counts:', err);
    }

    const pendingDroids = this.pendingDroids?.length ?? 0;
    const storeApprovals = this.storeApprovals?.length ?? 0;
    const pendingSales = this.pendingSales?.length ?? 0;

    return {
      bulletin: bulletinCount,
      approvals: pendingDroids + storeApprovals,
      pendingDroids,
      storeApprovals,
      pendingSales,
      store: pendingSales + storeApprovals,
      healing: healingEligible,
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
      holonetRequireCreditTransferApproval: 'GM Approves Holonet Credit Transfers',
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
      holonetRequireCreditTransferApproval: 'Require GM approval before accepted player-to-player Holonet credit transfers complete',
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
   * Load transaction history from all actors
   */
  async _loadStoreTransactionHistory() {
    this.transactions = [];

    for (const actor of game.actors) {
      const history = actor.getFlag('foundryvtt-swse', 'purchaseHistory') || [];
      for (const purchase of history) {
        const items = Array.isArray(purchase.items) ? purchase.items : [];
        for (const item of items) {
          const amount = normalizeCredits(item.cost ?? item.finalCost ?? item.price ?? 0);
          this.transactions.push({
            timestamp: purchase.timestamp,
            actor: actor.name,
            actorId: actor.id,
            player: purchase.userName || purchase.playerName || purchase.userId || '—',
            type: purchase.type || 'Buy',
            item: item.name || 'Unknown Item',
            quantity: normalizeCredits(item.quantity ?? 1),
            price: amount,
            amount: purchase.type === 'Sell' ? amount : -amount,
            status: purchase.status || 'Success',
            reason: purchase.reason || purchase.failureReason || '',
            source: purchase.source || 'Store',
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
   * Get app card definitions for home page
   */
  _getAppCards(counts = {}) {
    return [
      { id: 'bulletin', code: 'COM', label: 'Bulletin', icon: 'fa-solid fa-newspaper', description: 'Party and player notices', badgeCount: counts.bulletin ?? 0, status: 'Broadcast', statusTone: (counts.bulletin ?? 0) ? 'warn' : '', badgeType: 'info', featured: true },
      { id: 'house-rules', code: 'RUL', label: 'House Rules', icon: 'fa-solid fa-book', description: 'Game rule modifications', badgeCount: counts.houseRules ?? 0, status: 'Ruleset', statusTone: '', badgeType: 'info' },
      { id: 'store', code: 'STR', label: 'Store', icon: 'fa-solid fa-store', description: 'Store governance', badgeCount: counts.store ?? 0, status: 'Control', statusTone: (counts.store ?? 0) ? 'warn' : '', badgeType: 'warn', featured: true },
      { id: 'approvals', code: 'APR', label: 'Approvals', icon: 'fa-solid fa-check-circle', description: 'Pending approvals', badgeCount: counts.approvals ?? 0, status: 'Review', statusTone: (counts.approvals ?? 0) ? 'crit' : '', badgeType: 'crit', featured: true },
      { id: 'healing', code: 'MED', label: 'Healing', icon: 'fa-solid fa-heart-pulse', description: 'Party recovery management', badgeCount: counts.healing ?? 0, status: 'Recovery', statusTone: '', badgeType: 'info' },
      { id: 'settings', code: 'CFG', label: 'Settings', icon: 'fa-solid fa-sliders', description: 'Holopad theme and interface tuning', badgeCount: 0, status: 'Theme', statusTone: '', badgeType: 'info' },
      { id: 'workspace', code: 'WRK', label: 'Workspace', icon: 'fa-solid fa-users', description: 'GM actor access', badgeCount: counts.workspace ?? 0, status: 'Actors', statusTone: '', badgeType: 'info' }
    ];
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    const root = this.element;
    if (!(root instanceof HTMLElement)) return;

    // Mirror actor holopad home affordances: all shell/home controls route to GM home.
    root.querySelectorAll('[data-action="tablet-home"], [data-shell-action="open-home"], [data-shell-action="return-to-home"]').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        this._navigateTo('home');
      });
    });

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

    if (this.currentPage !== 'settings') {
      this._settingsSurfaceController?.destroy?.();
    }

    // Wire page-specific events based on current page
    if (this.currentPage === 'bulletin') {
      await this._wireBulletinEvents(root);
    } else if (this.currentPage === 'store') {
      await this._wireStoreEvents(root);
    } else if (this.currentPage === 'house-rules') {
      await this._wireHouseRulesEvents(root);
    } else if (this.currentPage === 'approvals') {
      await this._wireApprovalsEvents(root);
    } else if (this.currentPage === 'healing') {
      await this._wireHealingEvents(root);
    } else if (this.currentPage === 'settings') {
      this._wireSettingsEvents(root);
    }
  }

  /** Wire shared settings surface events in GM context. */
  _wireSettingsEvents(root) {
    this._settingsSurfaceController ??= new SettingsSurfaceController(this, {
      actor: null,
      preferActor: false,
      persistActorTheme: false,
      logger: SWSELogger
    });
    this._settingsSurfaceController.attach(root);
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

    this._activateStoreTab(pageElement, this.currentTab || 'options');

    // Store control tab buttons: the GM store lives inside the datapad host, so
    // we manage this small tab switch locally instead of opening another app.
    for (const btn of pageElement.querySelectorAll('[data-store-tab]')) {
      btn.addEventListener('click', (ev) => {
        const tabId = ev.currentTarget.dataset.storeTab;
        if (!tabId) return;
        this.currentTab = tabId;
        this._activateStoreTab(pageElement, tabId);
      });
    }

    // Store availability toggle
    const storeOpenToggle = pageElement.querySelector('[name="storeOpen"]');
    if (storeOpenToggle) {
      storeOpenToggle.addEventListener('change', async (ev) => {
        await HouseRuleService.set('storeOpen', ev.currentTarget.checked);
        this.render(false);
      });
    }

    // Pricing controls. storeMarkup/storeDiscount are what the pricing engine reads.
    // globalBuyModifier is also updated as a compatibility mirror for older store UI code.
    const storeMarkupSlider = pageElement.querySelector('[name="storeMarkup"]');
    if (storeMarkupSlider) {
      storeMarkupSlider.addEventListener('input', async (ev) => {
        const value = normalizeCredits(ev.currentTarget.value);
        const valueLabel = pageElement.querySelector('[data-store-markup-value]');
        if (valueLabel) valueLabel.textContent = `${value}%`;
        await HouseRuleService.set('storeMarkup', value);
        await HouseRuleService.set('globalBuyModifier', value);
      });
    }

    const storeDiscountSlider = pageElement.querySelector('[name="storeDiscount"]');
    if (storeDiscountSlider) {
      storeDiscountSlider.addEventListener('input', async (ev) => {
        const value = normalizeCredits(ev.currentTarget.value);
        const valueLabel = pageElement.querySelector('[data-store-discount-value]');
        if (valueLabel) valueLabel.textContent = `${value}%`;
        await HouseRuleService.set('storeDiscount', value);
      });
    }

    // Normalized availability controls used by the v2 store index.
    for (const rarity of ['standard', 'licensed', 'rare', 'restricted', 'military', 'illegal', 'common', 'uncommon']) {
      const checkbox = pageElement.querySelector(`[name="availability-${rarity}"]`);
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
        const value = normalizeCredits(ev.currentTarget.value);
        const valueLabel = pageElement.querySelector('[data-auto-sale-value]');
        if (valueLabel) valueLabel.textContent = `${value}%`;
        await HouseRuleService.set('automaticSalePercentage', value);
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

    // Inventory filters are Phase A client-side helpers. The saved policy model is
    // separate from source item data so the GM can soft-ban/override without
    // mutating compendium documents.
    for (const input of pageElement.querySelectorAll('[data-store-inventory-filter]')) {
      input.addEventListener('input', () => this._filterStoreInventoryRows(pageElement));
      input.addEventListener('change', () => this._filterStoreInventoryRows(pageElement));
    }

    for (const input of pageElement.querySelectorAll('[data-store-policy-field]')) {
      input.addEventListener('change', async (ev) => {
        await this._updateStoreInventoryPolicy(ev.currentTarget);
        this._filterStoreInventoryRows(pageElement);
      });
    }
  }

  _activateStoreTab(pageElement, tabId) {
    for (const btn of pageElement.querySelectorAll('[data-store-tab]')) {
      const active = btn.dataset.storeTab === tabId;
      btn.classList.toggle('active', active);
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    }

    for (const panel of pageElement.querySelectorAll('[data-store-tab-panel]')) {
      const active = panel.dataset.storeTabPanel === tabId;
      panel.classList.toggle('active', active);
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    }
  }

  _filterStoreInventoryRows(pageElement) {
    const query = (pageElement.querySelector('[data-store-inventory-filter="search"]')?.value || '').trim().toLowerCase();
    const type = pageElement.querySelector('[data-store-inventory-filter="type"]')?.value || '';
    const availability = pageElement.querySelector('[data-store-inventory-filter="availability"]')?.value || '';
    const visibility = pageElement.querySelector('[data-store-inventory-filter="visibility"]')?.value || '';

    for (const row of pageElement.querySelectorAll('[data-store-inventory-row]')) {
      const visibleCheckbox = row.querySelector('[data-store-policy-field="visible"]');
      const availableCheckbox = row.querySelector('[data-store-policy-field="available"]');
      const isVisible = visibleCheckbox ? visibleCheckbox.checked : row.dataset.visible === 'true';
      const isAvailable = availableCheckbox ? availableCheckbox.checked : row.dataset.available === 'true';

      const matchesQuery = !query || (row.dataset.search || '').includes(query);
      const matchesType = !type || row.dataset.type === type;
      const matchesAvailability = !availability || row.dataset.availability === availability;
      const matchesVisibility = !visibility
        || (visibility === 'visible' && isVisible)
        || (visibility === 'hidden' && !isVisible)
        || (visibility === 'available' && isAvailable)
        || (visibility === 'unavailable' && !isAvailable)
        || (visibility === 'overridden' && row.querySelector('[data-store-policy-field="overridePrice"]')?.value !== '');

      row.hidden = !(matchesQuery && matchesType && matchesAvailability && matchesVisibility);
    }
  }

  async _updateStoreInventoryPolicy(input) {
    const itemId = input.dataset.itemId;
    const field = input.dataset.storePolicyField;
    if (!itemId || !field) return;

    const policies = SettingsHelper.getObject('storeInventoryPolicies', {});
    const policy = { ...(policies[itemId] || {}) };

    if (['visible', 'available', 'trackQuantity', 'requiresApproval'].includes(field)) {
      policy[field] = input.checked === true;
    } else if (field === 'quantity' || field === 'overridePrice') {
      const raw = String(input.value ?? '').trim();
      policy[field] = raw === '' ? null : Math.max(0, normalizeCredits(raw));
    } else if (field === 'notes') {
      policy[field] = String(input.value ?? '').trim();
    } else {
      return;
    }

    policy.updatedAt = Date.now();
    policy.updatedBy = game.user?.id || null;
    policies[itemId] = policy;

    await SettingsHelper.set('storeInventoryPolicies', policies);
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

    const reviewForm = pageElement.querySelector('[data-approval-review-form]');
    if (reviewForm) {
      reviewForm.addEventListener('submit', (ev) => ev.preventDefault());
      this._wireApprovalEditPreview(reviewForm);
    }

    for (const btn of pageElement.querySelectorAll('[data-action="select-approval"]')) {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        this.selectedApprovalKey = ev.currentTarget?.dataset?.approvalKey ?? null;
        this.approvalEditMode = false;
        this.approvalDenyMode = false;
        await this.render(false);
      });
    }

    for (const btn of pageElement.querySelectorAll('[data-action="approval-enter-edit"]')) {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        this.selectedApprovalKey = ev.currentTarget?.dataset?.approvalKey ?? this.selectedApprovalKey;
        this.approvalEditMode = true;
        this.approvalDenyMode = false;
        await this.render(false);
      });
    }

    for (const btn of pageElement.querySelectorAll('[data-action="approval-cancel-edit"]')) {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        this.selectedApprovalKey = ev.currentTarget?.dataset?.approvalKey ?? this.selectedApprovalKey;
        this.approvalEditMode = false;
        this.approvalDenyMode = false;
        await this.render(false);
      });
    }

    for (const btn of pageElement.querySelectorAll('[data-action="approval-deny"]')) {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        this.selectedApprovalKey = ev.currentTarget?.dataset?.approvalKey ?? this.selectedApprovalKey;
        this.approvalDenyMode = true;
        await this.render(false);
      });
    }

    for (const btn of pageElement.querySelectorAll('[data-action="approval-cancel-deny"]')) {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        this.selectedApprovalKey = ev.currentTarget?.dataset?.approvalKey ?? this.selectedApprovalKey;
        this.approvalDenyMode = false;
        await this.render(false);
      });
    }

    for (const btn of pageElement.querySelectorAll('[data-action="approval-approve"]')) {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const key = ev.currentTarget?.dataset?.approvalKey ?? this.selectedApprovalKey;
        await this._approveApprovalRequest(key);
      });
    }

    for (const btn of pageElement.querySelectorAll('[data-action="approval-finalize-edits"]')) {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const key = ev.currentTarget?.dataset?.approvalKey ?? this.selectedApprovalKey;
        const form = ev.currentTarget.closest('[data-approval-review-form]');
        await this._finalizeApprovalWithEdits(key, form);
      });
    }

    for (const btn of pageElement.querySelectorAll('[data-action="approval-confirm-deny"]')) {
      btn.addEventListener('click', async (ev) => {
        ev.preventDefault();
        const key = ev.currentTarget?.dataset?.approvalKey ?? this.selectedApprovalKey;
        const form = ev.currentTarget.closest('[data-approval-review-form]');
        const reason = String(new FormData(form).get('denialReason') ?? '').trim();
        await this._denyApprovalRequest(key, reason);
      });
    }
  }

  /** Render live changed-field rows in the approval decision rail while GM edits inline. */
  _wireApprovalEditPreview(form) {
    const fields = Array.from(form.querySelectorAll('[data-approval-edit-field]'));
    const changeList = form.querySelector('[data-approval-change-list]');
    if (!fields.length || !changeList) return;

    const escapeHtml = (value) => String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    const renderChanges = () => {
      const changes = fields
        .map((field) => {
          const label = field.dataset.label || field.name;
          const original = String(field.dataset.original ?? '').trim();
          const current = String(field.value ?? '').trim();
          return { label, original, current, changed: original !== current };
        })
        .filter((change) => change.changed);

      if (!changes.length) {
        changeList.innerHTML = '<p class="gm-approval-empty-note" data-approval-change-empty>No edits yet. Change fields in the summary packet to build the adjustment list.</p>';
        return;
      }

      changeList.innerHTML = changes.map((change) => `
        <div class="gm-approval-change-row">
          <span>${escapeHtml(change.label)}</span>
          <strong>${escapeHtml(change.original || '—')} → ${escapeHtml(change.current || '—')}</strong>
        </div>
      `).join('');
    };

    for (const field of fields) {
      field.addEventListener('input', renderChanges);
      field.addEventListener('change', renderChanges);
    }
    renderChanges();
  }

  /**
   * Wire healing page events
   */
  async _wireHealingEvents(root) {
    const pageElement = root.querySelector('.gm-datapad-healing');
    if (!pageElement) return;

    // Trigger natural healing button
    const triggerButton = pageElement.querySelector('[data-action="trigger-healing"]');
    if (triggerButton) {
      triggerButton.addEventListener('click', async (ev) => {
        ev.preventDefault();
        await this._triggerNaturalHealing();
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

      this.selectedApprovalKey = null;
      this.approvalEditMode = false;
      this.approvalDenyMode = false;
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
  async _rejectDroid(actorId, reason = '') {
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
        rejectedAt: new Date().toLocaleString(),
        reason
      });
      await ActorEngine.updateActor(actor, { 'system.droidSystems.buildHistory': buildHistory });

      Hooks.call('swseApprovalResolved', {
        approval: { id: `droid-${actor.id}`, type: 'droid', draftData: { name: actor.name } },
        actor,
        decision: 'denied',
        decidedBy: game.user?.name ?? 'GM',
        reason
      });

      this.selectedApprovalKey = null;
      this.approvalEditMode = false;
      this.approvalDenyMode = false;
      ui?.notifications?.info?.(`Droid "${actor.name}" rejected${reason ? ` — ${reason}` : ''}`);
      this.render(false);
    } catch (err) {
      SWSELogger.error('[GMDatapad] Error rejecting droid:', err);
      ui?.notifications?.error?.(`Failed to reject droid: ${err.message}`);
    }
  }

  /** Parse a unified approval request key from the GM approvals queue. */
  _parseApprovalKey(key) {
    const [kind, rawId] = String(key || '').split(':');
    if (kind === 'droid' && rawId) return { kind, actorId: rawId };
    if (kind === 'custom') return { kind, index: Number(rawId) };
    return { kind: null, index: -1, actorId: null };
  }

  _approvalNumberValue(value) {
    const normalized = String(value ?? '').trim();
    if (!normalized) return null;
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : null;
  }

  _approvalInputValue(name, value) {
    if (/credits|cost|hp|max|value|rating|damageReduction|total|misc|base/i.test(name)) {
      const numeric = this._approvalNumberValue(value);
      return numeric ?? value;
    }
    return value;
  }

  _collectInlineApprovalEdits(formOrData) {
    const edits = {
      actorUpdates: {},
      approvalUpdates: {},
      metadataUpdates: {},
      hasChanges: false
    };

    const fields = formOrData?.querySelectorAll
      ? Array.from(formOrData.querySelectorAll('[data-approval-edit-field]'))
      : [];

    const entries = fields.length
      ? fields
        .map(field => ({
          name: field.name,
          value: field.value,
          original: field.dataset.original ?? ''
        }))
        .filter(entry => String(entry.value ?? '').trim() !== String(entry.original ?? '').trim())
      : Array.from(formOrData?.entries?.() ?? []).map(([name, value]) => ({ name, value, original: null }));

    for (const entry of entries) {
      const name = String(entry.name || '').trim();
      const rawValue = entry.value;
      if (!name || name === 'denialReason') continue;
      const value = this._approvalInputValue(name, rawValue);
      edits.hasChanges = true;

      if (name === 'name') {
        edits.actorUpdates.name = String(rawValue ?? '').trim() || 'Unnamed Asset';
        edits.approvalUpdates['draftData.name'] = edits.actorUpdates.name;
        continue;
      }

      if (name === 'costCredits') {
        const cost = this._approvalNumberValue(rawValue) ?? 0;
        edits.approvalUpdates.costCredits = cost;
        continue;
      }

      if (name.startsWith('system.')) {
        edits.actorUpdates[name] = value;
        if (name === 'system.shields.rating') edits.actorUpdates['system.shieldRating'] = value;
        continue;
      }

      if (name.startsWith('metadata.')) {
        edits.metadataUpdates[name] = String(rawValue ?? '').trim();
      }
    }

    return edits;
  }

  _setNestedValue(target, path, value) {
    if (!target || !path) return;
    if (globalThis.foundry?.utils?.setProperty) {
      foundry.utils.setProperty(target, path, value);
      return;
    }
    const keys = String(path).split('.').filter(Boolean);
    const finalKey = keys.pop();
    let cursor = target;
    for (const key of keys) {
      cursor[key] ??= {};
      cursor = cursor[key];
    }
    if (finalKey) cursor[finalKey] = value;
  }

  async _applyInlineApprovalEdits(key, formData) {
    const parsed = this._parseApprovalKey(key);
    const edits = this._collectInlineApprovalEdits(formData);
    if (!edits.hasChanges) return;

    if (parsed.kind === 'droid') {
      const actor = game.actors.get(parsed.actorId);
      if (!actor) throw new Error('Droid actor not found.');

      const actorUpdates = { ...edits.actorUpdates };
      if (!('system.droidSystems.credits.spent' in actorUpdates) && 'costCredits' in edits.approvalUpdates) {
        actorUpdates['system.droidSystems.credits.spent'] = edits.approvalUpdates.costCredits;
        actorUpdates['system.droidSystems.totalCost'] = edits.approvalUpdates.costCredits;
      }
      await ActorEngine.updateActor(actor, actorUpdates);

      const gmNotes = edits.metadataUpdates['metadata.gmNotes'];
      const systemsSummary = edits.metadataUpdates['metadata.systemsSummary'];
      if (gmNotes || systemsSummary) {
        await actor.setFlag('foundryvtt-swse', 'gmApprovalNotes', {
          notes: gmNotes || '',
          systemsSummary: systemsSummary || '',
          updatedAt: Date.now(),
          updatedBy: game.user?.id ?? null
        });
      }
      return;
    }

    if (parsed.kind === 'custom') {
      const approvals = SettingsHelper.getArray('pendingCustomPurchases', []);
      const approval = approvals[parsed.index];
      if (!approval) throw new Error('Pending approval not found.');

      for (const [path, value] of Object.entries(edits.approvalUpdates)) {
        this._setNestedValue(approval, path, value);
      }
      for (const [path, value] of Object.entries(edits.metadataUpdates)) {
        this._setNestedValue(approval, path, value);
      }

      const draftActor = game.actors.get(approval.draftActorId);
      const actorUpdates = { ...edits.actorUpdates };
      if (draftActor?.system?.droidSystems && 'costCredits' in edits.approvalUpdates) {
        actorUpdates['system.droidSystems.credits.spent'] = edits.approvalUpdates.costCredits;
        actorUpdates['system.droidSystems.totalCost'] = edits.approvalUpdates.costCredits;
      }
      if (draftActor && Object.keys(actorUpdates).length) {
        await ActorEngine.updateActor(draftActor, actorUpdates);
      }

      approvals[parsed.index] = approval;
      await SettingsHelper.set('pendingCustomPurchases', approvals);
    }
  }

  async _approveApprovalRequest(key) {
    const parsed = this._parseApprovalKey(key);
    if (parsed.kind === 'droid') return this._approveDroid(parsed.actorId);
    if (parsed.kind === 'custom') return this._approvePendingCustom(parsed.index);
    ui?.notifications?.error?.('Invalid approval request.');
  }

  async _finalizeApprovalWithEdits(key, formData) {
    try {
      await this._applyInlineApprovalEdits(key, formData);
      await this._approveApprovalRequest(key);
    } catch (err) {
      SWSELogger.error('[GMDatapad] Error finalizing approval edits:', err);
      ui?.notifications?.error?.(`Failed to finalize approval: ${err.message}`);
    }
  }

  async _denyApprovalRequest(key, reason = '') {
    const parsed = this._parseApprovalKey(key);
    if (parsed.kind === 'droid') return this._rejectDroid(parsed.actorId, reason);
    if (parsed.kind === 'custom') return this._denyPendingCustom(parsed.index, reason);
    ui?.notifications?.error?.('Invalid approval request.');
  }

  /**
   * Preview a pending custom purchase.
   * Legacy helper retained for older buttons; the Phase 5 approval UI uses inline summary packets instead.
   */
  async _previewPendingCustom(index) {
    if (index < 0 || index >= this.storeApprovals.length) {
      ui?.notifications?.error?.('Invalid approval index');
      return;
    }

    const approval = this.storeApprovals[index];
    const actor = game.actors.get(approval.draftActorId) ?? game.actors.get(approval.ownerActorId);
    if (actor) actor.sheet.render(true);
  }

  /** Legacy edit helper now routes to inline edit mode. */
  async _editPendingCustom(index) {
    this.selectedApprovalKey = `custom:${index}`;
    this.approvalEditMode = true;
    this.approvalDenyMode = false;
    await this.render(false);
  }

  /**
   * Approve a pending custom purchase.
   */
  async _approvePendingCustom(index) {
    const approvals = SettingsHelper.getArray('pendingCustomPurchases', []);
    if (index < 0 || index >= approvals.length) {
      ui?.notifications?.error?.('Invalid approval index');
      return;
    }

    const approval = approvals[index];
    const ownerActor = game.actors.get(approval.ownerActorId);

    if (!ownerActor) {
      ui?.notifications?.error?.('Owner actor not found');
      return;
    }

    const currentCredits = normalizeCredits(ownerActor.system?.credits ?? 0);
    const cost = normalizeCredits(approval.costCredits ?? 0);
    const newCredits = Math.max(0, normalizeCredits(currentCredits - cost));

    try {
      await ActorEngine.updateActor(ownerActor, { 'system.credits': newCredits });

      const draftActor = game.actors.get(approval.draftActorId);
      if (draftActor) {
        const ownerUser = game.users.find(user => user.character?.id === ownerActor.id);
        const ownership = { default: 0 };
        if (ownerUser) ownership[ownerUser.id] = 3;
        if (game.user?.id) ownership[game.user.id] = 3;

        await ActorEngine.updateActor(draftActor, {
          ownership,
          'flags.-=foundryvtt-swse.pendingApproval': null,
          'flags.-=foundryvtt-swse.draftOnly': null,
          'flags.-=foundryvtt-swse.ownerPlayerId': null
        });
      }

      const history = ownerActor.getFlag('foundryvtt-swse', 'purchaseHistory') || [];
      const purchase = {
        timestamp: Date.now(),
        items: [],
        droids: approval.type === 'droid' ? [{ id: approval.draftActorId, name: approval.draftData?.name, cost }] : [],
        vehicles: approval.type === 'vehicle' || approval.type === 'starship' ? [{ id: approval.draftActorId, name: approval.draftData?.name, cost }] : [],
        total: cost,
        source: `GM Datapad - Custom ${approval.type === 'droid' ? 'Droid' : 'Ship/Vehicle'} Approval`,
        gmNotes: approval.metadata?.gmNotes ?? ''
      };
      history.push(purchase);
      await ownerActor.setFlag('foundryvtt-swse', 'purchaseHistory', history);

      approvals.splice(index, 1);
      await SettingsHelper.set('pendingCustomPurchases', approvals);

      Hooks.call('swseCustomPurchaseApproved', {
        approval,
        actor: ownerActor,
        draftActor,
        decidedBy: game.user?.name ?? 'GM',
        edited: !!approval.metadata?.gmNotes
      });

      this.selectedApprovalKey = null;
      this.approvalEditMode = false;
      this.approvalDenyMode = false;
      ui?.notifications?.info?.(`Approved: ${approval.draftData?.name ?? 'Custom asset'}`);
      await this.render(false);
    } catch (err) {
      SWSELogger.error('[GMDatapad] Error approving custom purchase:', err);
      ui?.notifications?.error?.(`Failed to approve: ${err.message}`);
    }
  }

  /**
   * Deny a pending custom purchase.
   */
  async _denyPendingCustom(index, reason = '') {
    const approvals = SettingsHelper.getArray('pendingCustomPurchases', []);
    if (index < 0 || index >= approvals.length) {
      ui?.notifications?.error?.('Invalid approval index');
      return;
    }

    try {
      const denial = approvals[index];
      const ownerActor = game.actors.get(denial.ownerActorId);
      const draftActor = game.actors.get(denial.draftActorId);

      if (draftActor) await draftActor.delete();

      approvals.splice(index, 1);
      await SettingsHelper.set('pendingCustomPurchases', approvals);

      Hooks.call('swseCustomPurchaseDenied', {
        approval: denial,
        actor: ownerActor,
        decidedBy: game.user?.name ?? 'GM',
        reason
      });

      this.selectedApprovalKey = null;
      this.approvalEditMode = false;
      this.approvalDenyMode = false;
      ui?.notifications?.info?.(`Denied: ${denial.draftData?.name ?? 'Custom asset'}${reason ? ` — ${reason}` : ''}`);
      await this.render(false);
    } catch (err) {
      SWSELogger.error('[GMDatapad] Error denying custom purchase:', err);
      ui?.notifications?.error?.(`Failed to deny: ${err.message}`);
    }
  }

  /**
   * Trigger natural healing for eligible party members
   */
  async _triggerNaturalHealing() {
    try {
      const result = await GMHealingTrigger.triggerNaturalHealing({ isFullRest: true, skipHolonetNotification: false });
      if (result.success) {
        ui?.notifications?.info?.(`Natural healing triggered: ${result.totalHealed} actors healed, ${result.totalSkipped} skipped`);
        SWSELogger.info('[GMDatapad] Natural healing triggered:', result);
        await this.render(false);
      } else {
        ui?.notifications?.error?.(`Failed to trigger healing: ${result.error}`);
      }
    } catch (err) {
      SWSELogger.error('[GMDatapad] Error triggering natural healing:', err);
      ui?.notifications?.error?.(`Error: ${err.message}`);
    }
  }

  /**
   * Navigate to a different page within the datapad
   */
  async _navigateTo(pageId) {
    const targetPage = GMSurfaceRegistry.hasSurface(pageId) ? pageId : 'home';

    if (targetPage !== pageId) {
      SWSELogger.warn(`[GM Datapad] Unknown surface "${pageId}"; routing to home.`);
    } else {
      SWSELogger.log(`[GM Datapad] Navigating to: ${targetPage}`);
    }

    this.currentPage = targetPage;

    // GM store is an operations surface, not the player-facing store splash flow.
    if (targetPage === 'store') {
      this.currentTab = this.currentTab || 'options';
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
    'maxStartingCredits', 'holonetRequireCreditTransferApproval', 'holonetPartyFundEnabled', 'holonetPartyFundDefaultCutPercent', 'enableBackgrounds', 'backgroundSelectionCount',
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
