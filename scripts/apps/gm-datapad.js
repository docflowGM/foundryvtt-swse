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
import { SOURCE_FAMILY, DELIVERY_STATE, AUDIENCE_TYPE, SURFACE_TYPE } from "/systems/foundryvtt-swse/scripts/holonet/contracts/enums.js";
import { HolonetComposerAssist } from "/systems/foundryvtt-swse/scripts/ui/holonet/HolonetComposerAssist.js";
import { GMHealingTrigger } from "/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-healing-trigger.js";
import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";
import { restoreInventoryPolicyQuantities } from "/systems/foundryvtt-swse/scripts/engine/store/policy-service.js";

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
    // Bulletin is a one-way GM → player information sphere. GM-only and
    // GM+party conversations belong in Messenger, not Bulletin.
    return [
      { value: AUDIENCE_TYPE.ALL_PLAYERS, label: 'All Players' },
      { value: AUDIENCE_TYPE.PARTY, label: 'Party' },
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
      case AUDIENCE_TYPE.GM_AND_PARTY:
        return HolonetAudience.allPlayers();
      case AUDIENCE_TYPE.ALL_PLAYERS:
        return HolonetAudience.allPlayers();
      case AUDIENCE_TYPE.PARTY:
        return new HolonetAudience({ type: AUDIENCE_TYPE.PARTY });
      default:
        return HolonetAudience.allPlayers();
    }
  }

  _buildBulletinRecordView(record) {
    const featuredProjection = record.projections?.find((projection) => projection.surfaceType === SURFACE_TYPE.BULLETIN_FEATURED) ?? null;
    const homeFeedProjection = record.projections?.find((projection) => projection.surfaceType === SURFACE_TYPE.HOME_FEED) ?? null;
    const notificationProjection = record.projections?.find((projection) => projection.surfaceType === SURFACE_TYPE.NOTIFICATION_BUBBLE) ?? null;
    const isUrgent = record.metadata?.urgent === true || record.priority === 'critical' || Boolean(notificationProjection);
    const isPinned = Boolean(featuredProjection?.isPinned || record.metadata?.pinAsLastSession);
    const homeSlot = record.metadata?.homeSlot || (isPinned ? 'last-session' : 'feed');

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
      publishedAt: record.publishedAt ? new Date(record.publishedAt).toLocaleString() : null,
      isUrgent,
      isPinned,
      isFeatured: Boolean(featuredProjection),
      isHomeFeed: Boolean(homeFeedProjection),
      homeSlot,
      homeSlotLabel: homeSlot === 'last-session' ? 'Last Session' : 'Comm Feed',
      imageUrl: record.metadata?.imageUrl || record.sender?.avatar || '',
      recordTone: isUrgent ? 'urgent' : (isPinned ? 'pinned' : (record.state || 'draft'))
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
   * Load transaction history from the TransactionEngine actor-ledger flags.
   *
   * purchaseHistory is a legacy/UI mirror. TransactionEngine is the SSOT for
   * credit movement, so the GM Store Transactions tab reads that first and only
   * appends clearly marked legacy rows when an actor has no TransactionEngine
   * entries yet.
   */
  async _loadStoreTransactionHistory() {
    const txRows = TransactionEngine.getAllTransactions({ includeZeroCost: false })
      .map((tx) => this._formatTransactionEngineRow(tx));

    const actorsWithEngineRows = new Set(txRows.map(row => row.actorId).filter(Boolean));
    const legacyRows = [];

    for (const actor of game.actors) {
      if (actorsWithEngineRows.has(actor.id)) continue;

      const history = actor.getFlag('foundryvtt-swse', 'purchaseHistory') || [];
      for (const purchase of history) {
        const items = [
          ...(Array.isArray(purchase.items) ? purchase.items : []),
          ...(Array.isArray(purchase.droids) ? purchase.droids : []),
          ...(Array.isArray(purchase.vehicles) ? purchase.vehicles : [])
        ];

        for (const item of items) {
          const amount = normalizeCredits(item.cost ?? item.finalCost ?? item.price ?? 0);
          legacyRows.push({
            transactionId: purchase.transactionId || `legacy-${actor.id}-${purchase.timestamp}-${legacyRows.length}`,
            timestamp: purchase.timestamp,
            actor: actor.name,
            actorId: actor.id,
            player: purchase.userName || purchase.playerName || purchase.userId || '—',
            type: purchase.type || 'Buy',
            item: item.name || 'Unknown Item',
            quantity: normalizeCredits(item.quantity ?? 1),
            price: amount,
            amount: purchase.type === 'Sell' ? amount : -amount,
            creditsBefore: null,
            creditsAfter: null,
            balanceDisplay: '—',
            status: purchase.status || 'Legacy',
            reason: purchase.reason || purchase.failureReason || 'Legacy purchaseHistory mirror; not TransactionEngine SSOT.',
            source: purchase.source || 'Legacy purchaseHistory',
            purchaseId: purchase.timestamp,
            canReverse: false
          });
        }
      }
    }

    this.transactions = [...txRows, ...legacyRows].sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0));
  }

  _formatTransactionEngineRow(tx) {
    const amount = normalizeCredits(tx.amount ?? 0);
    const context = String(tx.context || '');
    const status = tx.status || 'Success';
    const isRollback = context.includes('rollback') || context.includes('correction') || tx.rollbackOf;
    const alreadyRolledBack = status === 'Rolled Back' || !!tx.rolledBackByTransactionId;

    return {
      transactionId: tx.transactionId || tx.id,
      timestamp: tx.timestamp,
      actor: tx.actorName || 'Unknown Actor',
      actorId: tx.actorId,
      player: tx.userName || '—',
      type: tx.type || 'Transaction',
      item: tx.itemName || 'Credit Transaction',
      quantity: tx.itemCount || 1,
      price: Math.abs(amount),
      amount,
      creditsBefore: tx.creditsBefore,
      creditsAfter: tx.creditsAfter,
      balanceDisplay: Number.isFinite(Number(tx.creditsBefore)) && Number.isFinite(Number(tx.creditsAfter))
        ? `${normalizeCredits(tx.creditsBefore)} → ${normalizeCredits(tx.creditsAfter)}`
        : '—',
      status,
      reason: tx.reason || tx.rollbackReason || '',
      source: tx.source || context || 'TransactionEngine',
      context,
      audit: tx.audit || {},
      itemIds: tx.itemIds || [],
      rollbackOf: tx.rollbackOf || null,
      rolledBackByTransactionId: tx.rolledBackByTransactionId || null,
      purchaseId: tx.transactionId || tx.id,
      canReverse: amount !== 0 && !isRollback && !alreadyRolledBack,
      canRollback: amount !== 0 && !isRollback && !alreadyRolledBack
    };
  }

  /**
   * Load pending sales/haggles from the Store Control request queue.
   */
  async _loadStorePendingSales() {
    const pendingSales = SettingsHelper.getArray('pendingSales', []);
    this.pendingSales = pendingSales
      .filter(request => request && request.status !== 'Resolved' && request.status !== 'Denied')
      .map((request, index) => this._formatPendingSaleRequest(request, index));
  }

  _formatPendingSaleRequest(request, index = 0) {
    const actor = game.actors.get(request.actorId);
    const ownedItem = actor?.items?.get?.(request.itemId);
    const basePrice = request.basePrice ?? request.itemData?.system?.price ?? null;
    const suggestedPrice = request.suggestedPrice ?? request.value ?? null;
    const requestedPrice = request.requestedPrice ?? suggestedPrice;
    const defaultAmount = normalizeCredits(requestedPrice ?? suggestedPrice ?? 0);
    const submittedAt = request.requestedAt ?? request.timestamp ?? Date.now();

    return {
      ...request,
      index,
      id: request.id || `legacy-sale-${index}`,
      actor: actor?.name || request.actor || 'Unknown Actor',
      actorMissing: !actor,
      item: ownedItem?.name || request.item || request.itemData?.name || 'Unknown Item',
      itemMissing: !!actor && !ownedItem,
      basePrice,
      suggestedPrice,
      requestedPrice,
      defaultAmount,
      basePriceDisplay: Number.isFinite(Number(basePrice)) ? `${normalizeCredits(basePrice).toLocaleString()} cr` : 'No base price',
      suggestedPriceDisplay: Number.isFinite(Number(suggestedPrice)) ? `${normalizeCredits(suggestedPrice).toLocaleString()} cr` : 'GM sets offer',
      requestedPriceDisplay: Number.isFinite(Number(requestedPrice)) ? `${normalizeCredits(requestedPrice).toLocaleString()} cr` : 'GM sets offer',
      submittedAt,
      submittedDisplay: new Date(submittedAt).toLocaleString(),
      canApprove: !!actor && !!ownedItem && defaultAmount > 0,
      needsAmount: !(defaultAmount > 0),
      warning: !actor
        ? 'Actor no longer exists.'
        : !ownedItem
          ? 'Item is no longer owned by the actor.'
          : request.noBasePrice
            ? 'No base price was defined. GM must set a sale amount.'
            : ''
    };
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
      const owner = game.users.find(user => user?.character?.id === actor.id || Number(actor.ownership?.[user.id] ?? 0) >= 3);

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
        this._applyBulletinProjectionOptions(record, {
          urgent: record.metadata?.urgent === true,
          pinAsLastSession: record.metadata?.pinAsLastSession === true,
          homeSlot: record.metadata?.homeSlot || 'feed'
        });
        await HolonetEngine.publish(record);
        await this.render(false);
      });
    });

    pageElement.querySelectorAll('[data-action="bulletin-pin-last-session"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        const record = await HolonetStorage.getRecord(event.currentTarget.dataset.recordId);
        if (!record) return;
        this._applyBulletinProjectionOptions(record, {
          urgent: record.metadata?.urgent === true,
          pinAsLastSession: true,
          homeSlot: 'last-session'
        });
        await this._unpinOtherBulletins(record.id);
        await HolonetStorage.saveRecord(record);
        await this.render(false);
      });
    });

    pageElement.querySelectorAll('[data-action="bulletin-unpin-last-session"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        const record = await HolonetStorage.getRecord(event.currentTarget.dataset.recordId);
        if (!record) return;
        this._applyBulletinProjectionOptions(record, {
          urgent: record.metadata?.urgent === true,
          pinAsLastSession: false,
          homeSlot: 'feed'
        });
        await HolonetStorage.saveRecord(record);
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

    this._wireBulletinImagePickers(pageElement);
    this._wireBulletinLivePreview(pageElement);

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

  _wireBulletinImagePickers(pageElement) {
    pageElement.querySelectorAll('[data-action="bulletin-pick-image"]').forEach((button) => {
      button.addEventListener('click', async (event) => {
        event.preventDefault();
        const form = event.currentTarget.closest('form');
        const input = form?.querySelector('[data-bulletin-image-input]');
        if (!input) return;
        if (!globalThis.FilePicker) {
          ui?.notifications?.warn?.('Foundry FilePicker is not available in this context. Paste an image path instead.');
          return;
        }
        const picker = new FilePicker({
          type: 'image',
          current: input.value || '',
          callback: (path) => {
            input.value = path || '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
        picker.render(true);
      });
    });
  }

  _wireBulletinLivePreview(pageElement) {
    const activeForm = pageElement.querySelector('[data-bulletin-form="events"], [data-bulletin-form="messages"]');
    const preview = pageElement.querySelector('[data-bulletin-live-preview]');
    if (!activeForm || !preview) return;

    const update = () => this._refreshBulletinLivePreview(activeForm, preview);
    activeForm.querySelectorAll('input, textarea, select').forEach((field) => {
      field.addEventListener('input', update);
      field.addEventListener('change', update);
    });
    update();

    const playerForm = pageElement.querySelector('[data-player-state-form]');
    const partyForm = pageElement.querySelector('[data-party-state-form]');
    for (const form of [playerForm, partyForm].filter(Boolean)) {
      form.querySelectorAll('input, textarea').forEach((field) => {
        field.addEventListener('input', () => this._refreshBulletinStatePreview(form, preview));
        field.addEventListener('change', () => this._refreshBulletinStatePreview(form, preview));
      });
    }
  }

  _refreshBulletinLivePreview(form, preview) {
    const formData = new FormData(form);
    const setText = (selector, value) => {
      const node = preview.querySelector(selector);
      if (node) node.textContent = value || '';
    };
    const setHtml = (selector, value) => {
      const node = preview.querySelector(selector);
      if (node) node.innerHTML = HolonetMarkupService.preview(value || '', 180);
    };

    const title = String(formData.get('title') || '').trim() || 'Untitled bulletin';
    const category = String(formData.get('category') || '').trim() || 'general';
    const priority = String(formData.get('priority') || 'normal').trim() || 'normal';
    const authorName = String(formData.get('authorName') || '').trim() || 'GM Bulletin';
    const imageUrl = String(formData.get('imageUrl') || '').trim();
    const audience = this._getAudienceLabel(this._normalizeAudienceFromForm(formData));
    const urgent = formData.get('urgent') === 'on' || priority === 'critical';

    setText('[data-preview-feed-category]', category);
    setText('[data-preview-feed-priority]', priority);
    setText('[data-preview-feed-title]', title);
    setText('[data-preview-feed-sender]', `${authorName} · ${audience}`);
    setHtml('[data-preview-feed-body]', String(formData.get('body') || '').trim() || 'Bulletin body preview will appear here.');

    const urgentNode = preview.querySelector('[data-preview-feed-urgent]');
    if (urgentNode) urgentNode.classList.toggle('is-hidden', !urgent);

    const image = preview.querySelector('[data-preview-feed-image]');
    if (image) {
      image.classList.toggle('is-hidden', !imageUrl);
      if (imageUrl) {
        image.src = imageUrl;
        image.alt = title;
      } else {
        image.removeAttribute('src');
        image.alt = '';
      }
    }
  }

  _refreshBulletinStatePreview(form, preview) {
    const formData = new FormData(form);
    const setText = (selector, fallback) => {
      const node = preview.querySelector(selector);
      if (!node) return;
      const fieldName = selector.includes('location') ? 'location' : selector.includes('objective') ? 'objective' : 'situation';
      node.textContent = String(formData.get(fieldName) || '').trim() || fallback;
    };
    setText('[data-preview-state-location]', 'Current location not set');
    setText('[data-preview-state-objective]', 'No active objective');
    setText('[data-preview-state-situation]', 'Awaiting new instructions.');
  }

  async _saveBulletinRecord(formData, section) {
    const recordId = formData.get('recordId') || null;
    const shouldPublish = formData.get('submitMode') === 'publish';
    const audience = this._normalizeAudienceFromForm(formData);
    let record = recordId ? await HolonetStorage.getRecord(recordId) : null;
    const category = formData.get('category') || (section === 'events' ? 'news' : 'message');
    const priority = formData.get('priority') || 'normal';
    const urgent = formData.get('urgent') === 'on' || priority === 'critical';
    const pinAsLastSession = formData.get('pinAsLastSession') === 'on';
    const homeSlot = pinAsLastSession ? 'last-session' : (formData.get('homeSlot') || 'feed');
    const imageUrl = String(formData.get('imageUrl') || '').trim();

    const baseData = {
      id: recordId || undefined,
      title: formData.get('title') || '',
      body: formData.get('body') || '',
      category,
      priority,
      audience,
      authorName: formData.get('authorName') || game.user?.name || 'GM Bulletin',
      authorActorId: formData.get('authorActorId') || null,
      authorActorName: formData.get('authorActorName') || null,
      authorAvatar: imageUrl || null,
      state: shouldPublish ? DELIVERY_STATE.PUBLISHED : DELIVERY_STATE.DRAFT,
      metadata: {
        category,
        priority,
        urgent,
        pinAsLastSession,
        homeSlot,
        imageUrl,
        bulletinHomeRole: homeSlot,
        bulletinConsoleVersion: 2
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

    this._applyBulletinProjectionOptions(record, { urgent, pinAsLastSession, homeSlot, imageUrl });

    if (shouldPublish) {
      await HolonetEngine.publish(record);
    } else {
      await HolonetStorage.saveRecord(record);
    }

    if (pinAsLastSession) {
      await this._unpinOtherBulletins(record.id);
    }

    this.bulletinEditor = { section, mode: 'create', recordId: null };
    await this.render(false);
  }


  async _unpinOtherBulletins(recordId) {
    if (!recordId) return;
    const records = await HolonetStorage.getAllRecords();
    const changed = [];
    for (const record of records) {
      if (record.id === recordId || record.sourceFamily !== SOURCE_FAMILY.BULLETIN) continue;
      let mutated = false;
      if (record.metadata?.pinAsLastSession) {
        record.metadata = { ...(record.metadata ?? {}), pinAsLastSession: false };
        mutated = true;
      }
      for (const projection of record.projections ?? []) {
        if (projection.surfaceType === SURFACE_TYPE.BULLETIN_FEATURED && projection.isPinned) {
          projection.isPinned = false;
          mutated = true;
        }
      }
      if (mutated) changed.push(record);
    }
    if (changed.length) {
      await HolonetStorage.saveRecords(changed);
    }
  }

  _applyBulletinProjectionOptions(record, { urgent = false, pinAsLastSession = false, homeSlot = 'feed', imageUrl = undefined } = {}) {
    if (!record) return record;
    record.metadata = {
      ...(record.metadata ?? {}),
      urgent: Boolean(urgent),
      pinAsLastSession: Boolean(pinAsLastSession),
      homeSlot: pinAsLastSession ? 'last-session' : homeSlot,
      imageUrl: imageUrl === undefined ? (record.metadata?.imageUrl || '') : String(imageUrl || '').trim(),
      bulletinConsoleVersion: 2
    };
    record.projections = Array.isArray(record.projections) ? record.projections : [];

    const ensureProjection = (surfaceType) => {
      let projection = record.projections.find((entry) => entry.surfaceType === surfaceType);
      if (!projection) {
        projection = { surfaceType, recordId: record.id, isPinned: false, metadata: {} };
        record.projections.push(projection);
      }
      projection.recordId = record.id;
      projection.metadata = {
        ...(projection.metadata ?? {}),
        source: 'gm-bulletin-console',
        imageUrl: record.metadata?.imageUrl || ''
      };
      return projection;
    };

    ensureProjection(SURFACE_TYPE.HOME_FEED);
    const featured = ensureProjection(SURFACE_TYPE.BULLETIN_FEATURED);
    featured.isPinned = Boolean(pinAsLastSession);
    featured.metadata = {
      ...(featured.metadata ?? {}),
      homeSlot: pinAsLastSession ? 'last-session' : homeSlot
    };

    const hasBubble = record.projections.some((entry) => entry.surfaceType === SURFACE_TYPE.NOTIFICATION_BUBBLE);
    if (urgent && !hasBubble) {
      record.projections.push({
        surfaceType: SURFACE_TYPE.NOTIFICATION_BUBBLE,
        recordId: record.id,
        isPinned: false,
        metadata: { source: 'gm-bulletin-console', urgent: true, imageUrl: record.metadata?.imageUrl || '' }
      });
    } else if (!urgent && hasBubble) {
      record.projections = record.projections.filter((entry) => entry.surfaceType !== SURFACE_TYPE.NOTIFICATION_BUBBLE);
    }

    return record;
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

    // Transaction rollback/correction buttons. Credit movement stays inside
    // TransactionEngine; item cleanup is reconciled in the same rollback mutation
    // when a safe owned-item match is available.
    for (const btn of pageElement.querySelectorAll('[data-action="rollback-transaction"], [data-action="reverse-transaction"]')) {
      btn.addEventListener('click', async (ev) => {
        const index = Number(ev.currentTarget.dataset.index);
        await this._rollbackTransaction(index);
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

    for (const btn of pageElement.querySelectorAll('[data-action="approve-sale-request"], [data-action="counteroffer-sale-request"], [data-action="deny-sale-request"]')) {
      btn.addEventListener('click', async (ev) => {
        const action = ev.currentTarget.dataset.action;
        const requestId = ev.currentTarget.dataset.requestId;
        const card = ev.currentTarget.closest('[data-sale-request-id]');
        const amountField = card?.querySelector('[data-sale-custom-amount]');
        const reasonField = card?.querySelector('[data-sale-reason]');
        const reason = String(reasonField?.value ?? '').trim();
        let amount = null;

        if (action === 'approve-sale-request') {
          const defaultAmount = ev.currentTarget.dataset.defaultAmount;
          amount = defaultAmount ? normalizeCredits(defaultAmount) : normalizeCredits(amountField?.value ?? 0);
        } else if (action === 'counteroffer-sale-request') {
          amount = normalizeCredits(amountField?.value ?? 0);
          if (!(amount > 0)) {
            ui?.notifications?.warn?.('Enter a custom sale amount before approving a counteroffer.');
            return;
          }
        }

        await this._resolvePendingSaleRequest(requestId, {
          decision: action === 'deny-sale-request' ? 'deny' : (action === 'counteroffer-sale-request' ? 'counteroffer' : 'approve'),
          amount,
          reason
        });
      });
    }
  }

  async _resolvePendingSaleRequest(requestId, options = {}) {
    const { decision = 'approve', amount = null, reason = '' } = options;
    const pendingSales = SettingsHelper.getArray('pendingSales', []);
    const index = pendingSales.findIndex(request => String(request?.id || '') === String(requestId || ''));

    if (index < 0) {
      ui?.notifications?.error?.('Pending sale request not found.');
      return;
    }

    const request = pendingSales[index];
    const actor = game.actors.get(request.actorId);

    if (decision === 'deny') {
      pendingSales.splice(index, 1);
      await SettingsHelper.set('pendingSales', pendingSales);
      Hooks.callAll?.('swseStoreSaleDenied', {
        request,
        actor,
        decidedBy: game.user?.name ?? 'GM',
        reason
      });
      ui?.notifications?.info?.(`Denied sale request: ${request.item || 'item'}${reason ? ` — ${reason}` : ''}`);
      await this.render(false);
      return;
    }

    if (!actor) {
      ui?.notifications?.error?.('Cannot approve sale: actor no longer exists.');
      return;
    }

    const salePrice = normalizeCredits(amount ?? request.requestedPrice ?? request.suggestedPrice ?? request.value ?? 0);
    if (!(salePrice > 0)) {
      ui?.notifications?.warn?.('Sale approval requires a credit amount greater than zero.');
      return;
    }

    const item = actor.items?.get?.(request.itemId);
    if (!item) {
      ui?.notifications?.error?.('Cannot approve sale: item is no longer owned by this actor.');
      return;
    }

    const result = await TransactionEngine.executeSaleTransaction({
      actor,
      itemId: request.itemId,
      salePrice,
      reason: reason || (decision === 'counteroffer' ? 'GM counteroffer approved' : 'GM approved store sale'),
      transactionContext: decision === 'counteroffer' ? 'store-haggle-sale' : 'store-sale-approval',
      audit: {
        requestId: request.id,
        requestType: request.type || 'sale',
        itemName: item.name || request.item,
        itemNames: [item.name || request.item].filter(Boolean),
        itemCount: 1,
        basePrice: request.basePrice ?? request.itemData?.system?.price ?? null,
        suggestedPrice: request.suggestedPrice ?? request.value ?? null,
        requestedPrice: request.requestedPrice ?? request.value ?? null,
        approvedPrice: salePrice,
        approvalMode: decision,
        approvedBy: game.user?.id ?? null,
        approvedByName: game.user?.name ?? 'GM',
        gmReason: reason,
        source: 'GM Store Control Approvals'
      }
    }, {
      validate: true,
      rederive: true,
      source: 'GMDatapad._resolvePendingSaleRequest'
    });

    if (!result.success) {
      ui?.notifications?.error?.(`Failed to approve sale: ${result.error}`);
      return;
    }

    pendingSales.splice(index, 1);
    await SettingsHelper.set('pendingSales', pendingSales);

    Hooks.callAll?.('swseStoreSaleApproved', {
      request,
      actor,
      itemData: request.itemData,
      salePrice,
      decision,
      reason,
      transactionId: result.transactionId,
      decidedBy: game.user?.name ?? 'GM'
    });

    ui?.notifications?.info?.(`Approved sale: ${request.item || item.name} for ${salePrice.toLocaleString()} credits.`);
    await this.render(false);
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
   * Build a safe item reconciliation preview for a TransactionEngine rollback.
   *
   * Existing historical records may only know item names. New records include
   * audit.items with ids/types/costs, but we still fall back to name matching so
   * the GM can recover from older purchases without losing credit SSOT safety.
   */
  _buildTransactionRollbackReconciliation(transaction, actor) {
    const auditItems = Array.isArray(transaction?.audit?.items)
      ? transaction.audit.items.filter(item => item && typeof item === 'object')
      : [];

    const fallbackItems = auditItems.length ? [] : String(transaction?.item || '')
      .split(',')
      .map(name => name.trim())
      .filter(Boolean)
      .map(name => ({ name, type: 'item', quantity: 1, id: null, fallback: true }));

    const requestedItems = (auditItems.length ? auditItems : fallbackItems)
      .map(item => ({
        id: item.id || item.itemId || null,
        name: item.name || 'Unknown Item',
        type: item.type || 'item',
        quantity: Math.max(1, normalizeCredits(item.quantity ?? 1) || 1),
        cost: normalizeCredits(item.cost ?? 0),
        condition: item.condition || null,
        fallback: item.fallback === true
      }));

    const actorItems = Array.from(actor?.items ?? []);
    const usedIds = new Set();
    const removableItemIds = [];
    const removedItems = [];
    const unmatchedItems = [];
    const inventoryPolicyItems = [];

    const matchesSourceId = (ownedItem, requested) => {
      const wanted = String(requested.id || '').trim();
      if (!wanted) return false;
      const sourceId = String(ownedItem?.flags?.core?.sourceId || ownedItem?.flags?.foundryvttSwse?.sourceId || '').trim();
      const ownId = String(ownedItem?.id || ownedItem?._id || '').trim();
      return ownId === wanted || sourceId === wanted || sourceId.endsWith(`.${wanted}`);
    };

    const findOwnedItem = (requested) => {
      const type = String(requested.type || '').toLowerCase();
      const canDeleteEmbeddedItem = type === 'item' || type === 'customized-item' || type === 'equipment' || type === 'weapon' || type === 'armor';
      if (!canDeleteEmbeddedItem) return null;

      let match = actorItems.find(item => !usedIds.has(item.id) && matchesSourceId(item, requested));
      if (match) return match;

      const wantedName = String(requested.name || '').trim().toLowerCase();
      if (!wantedName) return null;
      match = actorItems.find(item => !usedIds.has(item.id) && String(item.name || '').trim().toLowerCase() === wantedName);
      if (match) return match;

      return null;
    };

    for (const requested of requestedItems) {
      if (requested.id) {
        inventoryPolicyItems.push({
          id: requested.id,
          name: requested.name,
          type: requested.type,
          quantity: requested.quantity
        });
      }

      for (let i = 0; i < requested.quantity; i += 1) {
        const ownedItem = findOwnedItem(requested);
        if (!ownedItem) {
          unmatchedItems.push({
            ...requested,
            reason: String(requested.type || '').toLowerCase() === 'droid' || String(requested.type || '').toLowerCase() === 'vehicle'
              ? 'Actor/asset purchases require manual asset review before deletion.'
              : 'No matching owned item found on the actor.'
          });
          continue;
        }

        usedIds.add(ownedItem.id);
        removableItemIds.push(ownedItem.id);
        removedItems.push({
          id: ownedItem.id,
          name: ownedItem.name,
          type: ownedItem.type,
          requestedName: requested.name
        });
      }
    }

    return {
      requestedItems,
      removableItemIds,
      removedItems,
      unmatchedItems,
      inventoryPolicyItems
    };
  }

  /**
   * Roll back a store transaction through TransactionEngine.
   *
   * Credit movement is handled by TransactionEngine as the SSOT. Safe owned item
   * removal is folded into the same actor mutation plan. Inventory quantity
   * restoration happens only after the TransactionEngine rollback succeeds.
   */
  async _rollbackTransaction(index) {
    if (index < 0 || index >= this.transactions.length) {
      ui?.notifications?.error?.('Invalid transaction index');
      return;
    }

    const transaction = this.transactions[index];
    if (!transaction?.canRollback && !transaction?.canReverse) {
      ui?.notifications?.warn?.('This transaction cannot be rolled back from the TransactionEngine ledger.');
      return;
    }

    const actor = game.actors.get(transaction.actorId);
    if (!actor) {
      ui?.notifications?.error?.('Actor not found');
      return;
    }

    const reversalAmount = normalizeCredits(0 - Number(transaction.amount || 0));
    const reconciliation = this._buildTransactionRollbackReconciliation(transaction, actor);

    if (!Number.isFinite(reversalAmount) || (reversalAmount === 0 && reconciliation.removableItemIds.length === 0)) {
      ui?.notifications?.warn?.('This transaction has no credit or owned-item impact to roll back.');
      return;
    }

    const defaultReason = 'GM transaction rollback';
    const summary = [
      `Credit adjustment: ${reversalAmount >= 0 ? '+' : ''}${reversalAmount.toLocaleString()} cr`,
      `Owned items to remove: ${reconciliation.removableItemIds.length}`,
      reconciliation.unmatchedItems.length ? `Manual review: ${reconciliation.unmatchedItems.length} unmatched asset/item(s)` : null,
      '',
      `Reason for rolling back ${transaction.item || 'this transaction'}?`
    ].filter(line => line !== null).join('\n');

    let reason = defaultReason;
    try {
      const prompted = await uiPrompt('Rollback Store Transaction', summary, reason);
      if (prompted === null || prompted === undefined) return;
      reason = String(prompted || reason).trim() || reason;
    } catch (_err) {
      // uiPrompt is best-effort; continue with the default reason if unavailable.
    }

    try {
      const result = await TransactionEngine.executeRollbackCorrection({
        actor,
        amount: reversalAmount,
        reason,
        sourceTransactionId: transaction.transactionId,
        removeOwnedItemIds: reconciliation.removableItemIds,
        audit: {
          sourceTransactionId: transaction.transactionId,
          sourceContext: transaction.context,
          sourceItem: transaction.item,
          sourceAmount: transaction.amount,
          source: 'GM Store Control Rollback',
          removedItems: reconciliation.removedItems,
          unmatchedItems: reconciliation.unmatchedItems,
          inventoryPolicyItems: reconciliation.inventoryPolicyItems
        }
      }, {
        source: 'GMDatapad._rollbackTransaction',
        validate: true,
        rederive: true
      });

      if (!result.success) {
        ui?.notifications?.error?.(`Failed to roll back transaction: ${result.error}`);
        return;
      }

      const restoreResult = await restoreInventoryPolicyQuantities(reconciliation.inventoryPolicyItems);
      const messageParts = [
        `Rollback recorded for ${transaction.actor}.`,
        reconciliation.removedItems.length ? `${reconciliation.removedItems.length} owned item(s) removed.` : null,
        restoreResult.updated ? `${restoreResult.updated} stock policy record(s) restored.` : null,
        reconciliation.unmatchedItems.length ? `${reconciliation.unmatchedItems.length} item/asset(s) need manual review.` : null
      ].filter(Boolean);

      ui?.notifications?.info?.(messageParts.join(' '));
      await this.render(false);
    } catch (err) {
      SWSELogger.error('[GMDatapad] Error rolling back transaction:', err);
      ui?.notifications?.error?.(`Failed to roll back transaction: ${err.message}`);
    }
  }

  /** Backward-compatible alias for older buttons/hot reloads. */
  async _reverseTransaction(index) {
    return this._rollbackTransaction(index);
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

    const cost = normalizeCredits(droidData.credits?.spent || 0);

    const updates = {
      'system.droidSystems.stateMode': 'FINALIZED'
    };

    try {
      if (cost > 0) {
        const creditResult = await TransactionEngine.executeCreditAdjustment({
          actor,
          amount: -cost,
          reason: 'GM approved pending droid build',
          transactionContext: 'store-custom-approval',
          audit: {
            approvalType: 'droid',
            itemName: actor.name,
            itemNames: [actor.name],
            itemCount: 1,
            source: 'GM Datapad - Pending Droid Approval'
          }
        }, {
          source: 'GMDatapad._approveDroid',
          validate: true,
          rederive: true
        });
        if (!creditResult.success) {
          ui?.notifications?.error?.(`Failed to approve droid credits: ${creditResult.error}`);
          return;
        }
      }

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
    const draftActor = game.actors.get(approval.draftActorId);

    if (!ownerActor) {
      ui?.notifications?.error?.('Owner actor not found');
      return;
    }

    if (!draftActor) {
      ui?.notifications?.error?.('Draft asset actor not found');
      return;
    }

    const cost = normalizeCredits(approval.costCredits ?? 0);
    const assetName = approval.draftData?.name ?? draftActor.name ?? 'Custom asset';

    try {
      const approvalResult = await TransactionEngine.executeAssetApprovalTransaction({
        actor: ownerActor,
        assetActor: draftActor,
        cost,
        reason: `GM approved ${approval.type || draftActor.type || 'custom'} acquisition`,
        transactionContext: 'store-custom-approval',
        audit: {
          approvalId: approval.id ?? null,
          approvalType: approval.type ?? draftActor.type,
          draftActorId: approval.draftActorId,
          itemName: assetName,
          itemNames: [assetName],
          itemCount: 1,
          source: `GM Datapad - Custom ${approval.type === 'droid' ? 'Droid' : 'Ship/Vehicle'} Approval`,
          gmNotes: approval.metadata?.gmNotes ?? '',
          ownerPlayerId: approval.ownerPlayerId ?? null,
          edited: !!approval.metadata?.gmNotes
        }
      }, {
        source: 'GMDatapad._approvePendingCustom',
        validate: true,
        rederive: true
      });

      if (!approvalResult.success) {
        ui?.notifications?.error?.(`Failed to approve: ${approvalResult.error}`);
        return;
      }

      const history = ownerActor.getFlag('foundryvtt-swse', 'purchaseHistory') || [];
      const purchase = {
        timestamp: Date.now(),
        items: [],
        droids: draftActor.type === 'droid' ? [{ id: draftActor.id, name: assetName, cost }] : [],
        vehicles: draftActor.type === 'vehicle' ? [{ id: draftActor.id, name: assetName, cost }] : [],
        total: cost,
        transactionId: approvalResult.transactionId ?? null,
        source: `GM Datapad - Custom ${draftActor.type === 'droid' ? 'Droid' : 'Ship/Vehicle'} Approval`,
        gmNotes: approval.metadata?.gmNotes ?? '',
        compatibilityMirror: true
      };
      history.push(purchase);
      await ActorEngine.updateActor(ownerActor, {
        'flags.foundryvtt-swse.purchaseHistory': history
      }, {
        source: 'GMDatapad._approvePendingCustom.purchaseHistoryMirror',
        skipValidation: true
      });

      approvals.splice(index, 1);
      await SettingsHelper.set('pendingCustomPurchases', approvals);

      Hooks.call('swseCustomPurchaseApproved', {
        approval,
        actor: ownerActor,
        draftActor,
        transactionId: approvalResult.transactionId,
        decidedBy: game.user?.name ?? 'GM',
        edited: !!approval.metadata?.gmNotes
      });

      this.selectedApprovalKey = null;
      this.approvalEditMode = false;
      this.approvalDenyMode = false;
      ui?.notifications?.info?.(`Approved: ${assetName}`);
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

export default GMDatapad;
