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
import { GMSurfaceRegistry } from "/systems/foundryvtt-swse/scripts/ui/shell/gm/GMSurfaceRegistry.js";
import { GMSurfaceControllerRegistry } from "/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMSurfaceControllerRegistry.js";
import { HolonetEngine } from "/systems/foundryvtt-swse/scripts/holonet/holonet-engine.js";
import { HolonetStorage } from "/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js";
import { HolonetMessengerService } from "/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-messenger-service.js";
import { BulletinSource } from "/systems/foundryvtt-swse/scripts/holonet/sources/bulletin-source.js";
import { HolonewsGenerator } from "/systems/foundryvtt-swse/scripts/holonet/data/holonews-seed-events.js";
import { HolonewsAutoPublisher } from "/systems/foundryvtt-swse/scripts/holonet/subsystems/holonews-auto-publisher.js";
import { BulletinContactRegistry } from "/systems/foundryvtt-swse/scripts/holonet/subsystems/bulletin-contact-registry.js";
import { HolonewsAtomPolicy } from "/systems/foundryvtt-swse/scripts/holonet/subsystems/holonews-atom-policy.js";
import { HolonetAudience } from "/systems/foundryvtt-swse/scripts/holonet/contracts/holonet-audience.js";
import { HolonetMarkupService } from "/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-markup-service.js";
import { SOURCE_FAMILY, DELIVERY_STATE, AUDIENCE_TYPE, SURFACE_TYPE } from "/systems/foundryvtt-swse/scripts/holonet/contracts/enums.js";
import { GMHealingTrigger } from "/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-healing-trigger.js";
import { TransactionEngine } from "/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js";
import { StoreEngine } from "/systems/foundryvtt-swse/scripts/engine/store/store-engine.js";
import { GameSessionStore } from "/systems/foundryvtt-swse/scripts/games/game-session-store.js";
import { GameCreditEscrowService } from "/systems/foundryvtt-swse/scripts/games/wagers/game-credit-escrow-service.js";
import { restoreInventoryPolicyQuantities } from "/systems/foundryvtt-swse/scripts/engine/store/policy-service.js";

const GM_TABLET_BASE_WIDTH = 1440;
const GM_TABLET_BASE_HEIGHT = 900;
const GM_TABLET_MIN_WIDTH = Math.round(GM_TABLET_BASE_WIDTH * 0.55);
const GM_TABLET_MIN_HEIGHT = Math.round(GM_TABLET_BASE_HEIGHT * 0.55);

export class GMDatapad extends BaseSWSEAppV2 {
  static DEFAULT_OPTIONS = {
    id: 'gm-datapad',
    tag: 'section',
    window: {
      title: 'GM Datapad',
      width: 1200,
      height: 800,
      frame: false,
      resizable: false,
      draggable: false
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
    this.selectedJobThreadId = null;
    this.pageData = {};
    this.NS = 'foundryvtt-swse';
    this.bulletinEditor = { section: 'events', mode: 'create', recordId: null };
    this.selectedPlayerStateActorId = null;
    this.selectedBulletinPreviewUserId = null;
    this.holonewsSeedOffset = 0;
    this.holonewsHideUsedSeeds = true;
    this.holonewsWireFilters = { query: '', category: '', sector: '', priority: '' };
    this.holonewsArchiveFilters = { query: '', state: '', type: '', priority: '', sector: '', category: '' };

    // Store page state
    this.transactions = [];
    this.pendingSales = [];
    this.storeApprovals = [];

    // Approvals page state
    this.pendingDroids = [];
    this.selectedApprovalKey = null;
    this.approvalEditMode = false;
    this.approvalDenyMode = false;

    // Surface controllers are routed through GMSurfaceControllerRegistry.

    // Frameless shared holopad shell window state.
    this._gmTabletExpanded = false;
    this._gmTabletPreExpandRect = null;
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
    const apps = this._getAppCards(appCounts);
    const gmShell = this._buildGmShellContext(apps, appCounts);

    return foundry.utils.mergeObject(context, {
      currentPage: this.currentPage,
      shellSurface: this._getGmShellSurfaceId(this.currentPage),
      shellIsSheet: false,
      shellSurfaceVm: pageContext,
      apps,
      gmShell,
      appClusters: this._buildAppClusters(apps, appCounts),
      homeSummary: appCounts,
      user: game.user,
      ...surfaceContext,
      ...pageContext
    });
  }

  _getGmShellSurfaceId(pageId) {
    const id = String(pageId || 'home');
    const known = new Set(['home', 'jobs', 'trade', 'bulletin', 'house-rules', 'store', 'approvals', 'settings', 'healing', 'workspace']);
    return `gm-${known.has(id) ? id : 'error'}`;
  }

  _buildGmShellContext(apps = [], counts = {}) {
    const active = apps.find((app) => app.id === this.currentPage)
      ?? apps.find((app) => app.id === 'home')
      ?? { id: 'home', code: 'OPS', label: 'GM Operations', statusTone: '', badgeCount: 0 };
    const urgent = Number(counts.approvals ?? 0) + Number(counts.tradeFailed ?? 0) + Number(counts.jobs ?? 0);
    const readinessTone = urgent > 0 ? 'crit' : (Number(counts.store ?? 0) + Number(counts.bulletin ?? 0) > 0 ? 'warn' : 'stable');
    const readinessLabel = urgent > 0 ? 'Action Required' : readinessTone === 'warn' ? 'Monitoring' : 'Ready';
    return {
      activeId: active.id,
      activeCode: active.code || 'OPS',
      activeLabel: active.label || 'GM Operations',
      readinessTone,
      readinessLabel,
      summaryLine: `${Number(counts.approvals ?? 0)} approvals · ${Number(counts.trade ?? 0)} trade · ${Number(counts.jobs ?? 0)} jobs`,
      serialLabel: `GM-CMD-${String(this.currentPage || 'home').toUpperCase()}`,
      dockApps: apps.filter((app) => app.id !== 'home')
    };
  }

  _buildAppClusters(apps = [], counts = {}) {
    const byId = new Map(apps.map((app) => [app.id, app]));
    const pick = (ids) => ids.map((id) => byId.get(id)).filter(Boolean);
    return [
      { label: 'Operations', tone: (counts.jobs || counts.trade) ? 'crit' : 'stable', countLabel: `${Number(counts.jobs ?? 0) + Number(counts.trade ?? 0)} active`, apps: pick(['jobs', 'trade', 'healing', 'workspace']) },
      { label: 'Economy', tone: (counts.store || counts.approvals) ? 'warn' : 'stable', countLabel: `${Number(counts.store ?? 0) + Number(counts.approvals ?? 0)} queued`, apps: pick(['store', 'approvals']) },
      { label: 'Holonet', tone: counts.bulletin ? 'info' : 'stable', countLabel: `${Number(counts.bulletin ?? 0)} signals`, apps: pick(['bulletin']) },
      { label: 'Configuration', tone: 'stable', countLabel: 'ready', apps: pick(['house-rules', 'settings']) }
    ];
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
    const jobCounts = await this._getJobBadgeCounts();
    const tradeCounts = await this._getTradeBadgeCounts();

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
    const gameApprovals = this._getPendingGameSettlementCount();

    return {
      bulletin: bulletinCount,
      approvals: pendingDroids + storeApprovals + gameApprovals,
      pendingDroids,
      storeApprovals,
      gameApprovals,
      pendingSales,
      store: pendingSales + storeApprovals,
      jobs: jobCounts.actionable,
      jobReview: jobCounts.review,
      jobPayout: jobCounts.payout,
      jobActive: jobCounts.active,
      trade: tradeCounts.actionable,
      tradeApprovals: tradeCounts.approvals,
      tradeFailed: tradeCounts.failed,
      tradeActive: tradeCounts.active,
      healing: healingEligible,
      workspace: game.actors.filter((actor) => actor.isOwner).length
    };
  }


  _getPendingGameSettlementCount() {
    try {
      return GameSessionStore.getAllSessions()
        .filter((session) => session?.escrow?.credits?.status === 'pending-gm-settlement')
        .length;
    } catch (err) {
      SWSELogger.warn('[GMDatapad] Unable to load pending game settlement count:', err);
      return 0;
    }
  }


  async _getTradeBadgeCounts() {
    try {
      const { GMTradeConsoleSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMTradeConsoleSurfaceService.js');
      const tradeConsole = await GMTradeConsoleSurfaceService.buildTradeConsoleVm(this);
      const stats = tradeConsole?.stats ?? {};
      const approvals = Number(stats.approvals ?? tradeConsole?.approvalQueue?.length ?? 0) || 0;
      const failed = Number(stats.failed ?? tradeConsole?.failedQueue?.length ?? 0) || 0;
      const active = Number(stats.active ?? tradeConsole?.activeQueue?.length ?? 0) || 0;
      return { approvals, failed, active, actionable: approvals + failed };
    } catch (err) {
      SWSELogger.warn('[GMDatapad] Unable to load trade console badge counts:', err);
      return { approvals: 0, failed: 0, active: 0, actionable: 0 };
    }
  }

  async _getJobBadgeCounts() {
    try {
      const threads = await HolonetStorage.getAllThreads();
      const jobs = threads.filter((thread) => thread?.metadata?.threadType === 'job');
      let review = 0;
      let payout = 0;
      let active = 0;
      for (const thread of jobs) {
        const job = thread.metadata?.job ?? {};
        const status = String(job.status || 'posted');
        if (status === 'complete') payout += 1;
        if (['accepted', 'inProgress', 'review'].includes(status)) active += 1;
        const objectives = Array.isArray(job.objectives) ? job.objectives : [];
        review += objectives.filter((objective) => ['claimed', 'submitted', 'pendingReview'].includes(String(objective?.status || ''))).length;
        if (status === 'review') review += 1;
      }
      return { total: jobs.length, review, payout, active, actionable: review + payout };
    } catch (err) {
      SWSELogger.warn('[GMDatapad] Unable to load job board badge counts:', err);
      return { total: 0, review: 0, payout: 0, active: 0, actionable: 0 };
    }
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
    const isHolonews = record.metadata?.holonews === true || record.metadata?.category === 'holonews';
    const isBreakingNews = record.metadata?.breakingNews === true;
    const isUrgent = isBreakingNews || record.metadata?.urgent === true || record.priority === 'critical' || Boolean(notificationProjection);
    const isPinned = Boolean(featuredProjection?.isPinned || record.metadata?.pinAsLastSession);
    const homeSlot = record.metadata?.homeSlot || (isPinned ? 'last-session' : 'feed');
    const deliverySummary = this._buildBulletinDeliverySummary(record);

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
      isHolonews,
      isBreakingNews,
      newsSource: record.metadata?.newsSource || record.sender?.systemLabel || record.sender?.actorName || '',
      dateline: record.metadata?.dateline || '',
      sector: record.metadata?.sector || '',
      newsCategory: record.metadata?.newsCategory || '',
      newsDeck: record.metadata?.newsDeck || '',
      holonewsSeedId: record.metadata?.holonewsSeedId || '',
      isAmbientHolonews: record.metadata?.ambientHolonews === true,
      isAutomatedHolonews: record.metadata?.automatedHolonews === true,
      holonewsTypeLabel: record.metadata?.automatedHolonews === true ? 'Auto Wire' : (record.metadata?.ambientHolonews === true ? 'Ambient Wire' : 'GM Authored'),
      archivedAt: record.archivedAt ? new Date(record.archivedAt).toLocaleString() : null,
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
      contactId: record.metadata?.contactId || '',
      imageUrl: record.metadata?.imageUrl || record.sender?.avatar || '',
      deliverySummary,
      recipientCount: deliverySummary.recipientCount,
      readCount: deliverySummary.readCount,
      unreadCount: deliverySummary.unreadCount,
      readRecipientIds: deliverySummary.readRecipientIds,
      unreadRecipientIds: deliverySummary.unreadRecipientIds,
      acknowledgedRecipientIds: deliverySummary.acknowledgedRecipientIds,
      dismissedRecipientIds: deliverySummary.dismissedRecipientIds,
      readStateLabel: `${deliverySummary.readCount}/${deliverySummary.recipientCount} read`,
      recordTone: isBreakingNews ? 'breaking' : (isUrgent ? 'urgent' : (isPinned ? 'pinned' : (record.state || 'draft')))
    };
  }

  _buildBulletinDeliverySummary(record) {
    const recipients = Array.isArray(record?.recipients) ? record.recipients : [];
    const deliveryStates = record?.deliveryStates instanceof Map
      ? record.deliveryStates
      : new Map(Object.entries(record?.deliveryStates ?? {}));
    const readRecipientIds = [];
    const unreadRecipientIds = [];
    const acknowledgements = record?.metadata?.acknowledgements && typeof record.metadata.acknowledgements === 'object' ? record.metadata.acknowledgements : {};
    const dismissals = record?.metadata?.dismissals && typeof record.metadata.dismissals === 'object' ? record.metadata.dismissals : {};
    for (const recipient of recipients) {
      const recipientId = recipient?.id;
      if (!recipientId) continue;
      const state = deliveryStates.get(recipientId) ?? {};
      if (state.readAt) readRecipientIds.push(recipientId);
      else unreadRecipientIds.push(recipientId);
    }
    return {
      recipientCount: recipients.length,
      deliveredCount: recipients.filter((recipient) => deliveryStates.has(recipient?.id)).length,
      readCount: readRecipientIds.length,
      unreadCount: unreadRecipientIds.length,
      readRecipientIds,
      unreadRecipientIds,
      acknowledgedRecipientIds: Object.keys(acknowledgements),
      dismissedRecipientIds: Object.keys(dismissals)
    };
  }

  _getBulletinEditorRecord(records, section) {
    if (!this.bulletinEditor?.recordId || this.bulletinEditor.section !== section) return null;
    return records.find((record) => record.id === this.bulletinEditor.recordId) ?? null;
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




  _wireSharedHolopadFrameEvents(root) {
    root.querySelector('[data-action="tablet-close"]')?.addEventListener('click', (ev) => {
      ev.preventDefault();
      this.close();
    });

    root.querySelector('[data-action="tablet-expand"]')?.addEventListener('click', (ev) => {
      ev.preventDefault();
      this._toggleSharedHolopadExpand();
    });

    this._wireSharedHolopadDrag(root);
    this._wireSharedHolopadResize(root);
  }

  _toggleSharedHolopadExpand() {
    if (this._gmTabletExpanded) {
      const saved = this._gmTabletPreExpandRect;
      if (saved) this.setPosition(saved);
      this._gmTabletPreExpandRect = null;
      this._gmTabletExpanded = false;
      return;
    }

    this._gmTabletPreExpandRect = {
      left: Number(this.position?.left) || 0,
      top: Number(this.position?.top) || 0,
      width: Number(this.position?.width) || GM_TABLET_BASE_WIDTH,
      height: Number(this.position?.height) || GM_TABLET_BASE_HEIGHT
    };

    const inset = 24;
    const width = Math.min(GM_TABLET_BASE_WIDTH, Math.max(GM_TABLET_MIN_WIDTH, window.innerWidth - inset));
    const height = Math.min(GM_TABLET_BASE_HEIGHT, Math.max(GM_TABLET_MIN_HEIGHT, window.innerHeight - inset));
    this.setPosition({
      width,
      height,
      left: Math.max(0, Math.round((window.innerWidth - width) / 2)),
      top: Math.max(0, Math.round((window.innerHeight - height) / 2))
    });
    this._gmTabletExpanded = true;
  }

  _wireSharedHolopadDrag(root) {
    const handles = root.querySelectorAll('[data-action="tablet-drag"]');
    handles.forEach((handle) => {
      handle.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0 || ev.target?.closest?.('button, input, select, textarea, a, [contenteditable="true"]')) return;
        ev.preventDefault();
        const startX = ev.clientX;
        const startY = ev.clientY;
        const startLeft = Number(this.position?.left) || root.getBoundingClientRect().left || 0;
        const startTop = Number(this.position?.top) || root.getBoundingClientRect().top || 0;
        const onMove = (moveEv) => {
          moveEv.preventDefault();
          this.setPosition({
            left: startLeft + (moveEv.clientX - startX),
            top: startTop + (moveEv.clientY - startY)
          });
        };
        const onEnd = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onEnd);
          window.removeEventListener('pointercancel', onEnd);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onEnd, { once: true });
        window.addEventListener('pointercancel', onEnd, { once: true });
      });
    });
  }

  _wireSharedHolopadResize(root) {
    const handles = root.querySelectorAll('[data-action="tablet-resize"]');
    const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
    handles.forEach((handle) => {
      handle.addEventListener('pointerdown', (ev) => {
        if (ev.button !== 0) return;
        ev.preventDefault();
        ev.stopPropagation();
        const dir = String(handle.dataset.resizeDir || 'se').toLowerCase();
        const resizeWest = dir.includes('w');
        const resizeEast = dir.includes('e') || (!resizeWest && !dir.includes('n') && !dir.includes('s'));
        const resizeNorth = dir.includes('n');
        const resizeSouth = dir.includes('s') || (!resizeNorth && !dir.includes('e') && !dir.includes('w'));
        const startX = ev.clientX;
        const startY = ev.clientY;
        const rect = root.getBoundingClientRect();
        const startWidth = Number(this.position?.width) || rect.width || GM_TABLET_BASE_WIDTH;
        const startHeight = Number(this.position?.height) || rect.height || GM_TABLET_BASE_HEIGHT;
        const startLeft = Number(this.position?.left) || rect.left || 0;
        const startTop = Number(this.position?.top) || rect.top || 0;
        const startRight = startLeft + startWidth;
        const startBottom = startTop + startHeight;

        const onMove = (moveEv) => {
          moveEv.preventDefault();
          const dx = moveEv.clientX - startX;
          const dy = moveEv.clientY - startY;
          let left = startLeft;
          let top = startTop;
          let width = startWidth;
          let height = startHeight;
          if (resizeEast) width = clamp(startWidth + dx, GM_TABLET_MIN_WIDTH, Math.max(GM_TABLET_MIN_WIDTH, window.innerWidth - startLeft - 8));
          if (resizeSouth) height = clamp(startHeight + dy, GM_TABLET_MIN_HEIGHT, Math.max(GM_TABLET_MIN_HEIGHT, window.innerHeight - startTop - 8));
          if (resizeWest) {
            left = clamp(startLeft + dx, 8, startRight - GM_TABLET_MIN_WIDTH);
            width = clamp(startRight - left, GM_TABLET_MIN_WIDTH, startRight - 8);
          }
          if (resizeNorth) {
            top = clamp(startTop + dy, 8, startBottom - GM_TABLET_MIN_HEIGHT);
            height = clamp(startBottom - top, GM_TABLET_MIN_HEIGHT, startBottom - 8);
          }
          this._gmTabletExpanded = false;
          this.setPosition({ left, top, width, height });
        };
        const onEnd = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', onEnd);
          window.removeEventListener('pointercancel', onEnd);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onEnd, { once: true });
        window.addEventListener('pointercancel', onEnd, { once: true });
      });
    });
  }

  /**
   * Get app card definitions for home page
   */
  _getAppCards(counts = {}) {
    return [
      { id: 'bulletin', code: 'COM', label: 'Bulletin', icon: 'fa-solid fa-newspaper', description: 'Party and player notices', badgeCount: counts.bulletin ?? 0, status: 'Broadcast', statusTone: (counts.bulletin ?? 0) ? 'warn' : '', badgeType: 'info', featured: true },
      { id: 'jobs', code: 'JOB', label: 'Job Board', icon: 'fa-solid fa-clipboard-list', description: 'Contracts, review queue, and payouts', badgeCount: counts.jobs ?? 0, status: 'Contracts', statusTone: (counts.jobs ?? 0) ? 'crit' : '', badgeType: 'crit', featured: true },
      { id: 'house-rules', code: 'RUL', label: 'House Rules', icon: 'fa-solid fa-book', description: 'Game rule modifications', badgeCount: counts.houseRules ?? 0, status: 'Ruleset', statusTone: '', badgeType: 'info' },
      { id: 'store', code: 'STR', label: 'Store', icon: 'fa-solid fa-store', description: 'Store governance', badgeCount: counts.store ?? 0, status: 'Control', statusTone: (counts.store ?? 0) ? 'warn' : '', badgeType: 'warn', featured: true },
      { id: 'trade', code: 'TRD', label: 'Trade Console', icon: 'fa-solid fa-right-left', description: 'Transfers, counter-offers, and failed settlements', badgeCount: counts.trade ?? 0, status: 'Ledger', statusTone: (counts.trade ?? 0) ? 'crit' : '', badgeType: 'crit', featured: true },
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

    this._wireSharedHolopadFrameEvents(root);

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

    // Let extracted surface controllers own page-local DOM wiring when available.
    const handledBySurfaceController = await GMSurfaceControllerRegistry.bind({
      surfaceId: this.currentPage,
      host: this,
      root
    });
    if (handledBySurfaceController) return;

  }

  async _handleEconomyRepairAction({ action = '', kind = '', sessionId = '', threadId = '', recordId = '', selectRecordId = '', note = '' } = {}) {
    if (!action) return false;
    if (action === 'select-trade') {
      this.selectedTradeRecordId = selectRecordId || recordId || null;
      await this.render(false);
      return true;
    }
    if (kind === 'trade' && threadId && recordId) {
      const ok = await HolonetMessengerService.threadAction({ actor: null, threadId, recordId, action, memo: note });
      if (!ok) ui?.notifications?.warn?.('Trade reconciliation action did not complete.');
      this.selectedTradeRecordId = recordId;
      await this.render(false);
      return ok;
    }
    if (kind === 'game' && sessionId) {
      const session = GameSessionStore.getSession(sessionId);
      if (!session) {
        ui?.notifications?.error?.('Game session not found.');
        return false;
      }
      const cleanNote = String(note || '').trim();
      if (action === 'game-mark-reconciled') {
        await GameSessionStore.updateSession(sessionId, current => ({
          metadata: {
            ...(current.metadata || {}),
            gmReconciliation: {
              status: 'reconciled',
              at: Date.now(),
              by: game.user?.id ?? null,
              note: cleanNote || 'GM marked game settlement reconciled.'
            }
          },
          escrow: {
            ...(current.escrow || {}),
            credits: {
              ...(current.escrow?.credits || {}),
              manualReconciliationStatus: 'reconciled',
              manualReconciledAt: Date.now(),
              manualReconciledBy: game.user?.id ?? null,
              manualReconciliationNote: cleanNote
            }
          },
          log: [
            ...((current.log || [])),
            { id: foundry.utils?.randomID?.() || `log_${Date.now()}`, at: Date.now(), type: 'gm-game-settlement-reconciled', by: game.user?.id ?? null, note: cleanNote }
          ]
        }));
        ui?.notifications?.info?.('Game settlement marked reconciled.');
        await this.render(false);
        return true;
      }
      if (action === 'game-reopen-settlement') {
        await GameSessionStore.updateSession(sessionId, current => ({
          status: 'pending-gm-settlement',
          metadata: {
            ...(current.metadata || {}),
            gmReconciliation: {
              status: 'reopened',
              at: Date.now(),
              by: game.user?.id ?? null,
              note: cleanNote || 'GM reopened settlement for approval.'
            }
          },
          escrow: {
            ...(current.escrow || {}),
            credits: {
              ...(current.escrow?.credits || {}),
              status: 'pending-gm-settlement',
              pendingSettlementAt: Date.now(),
              manualReconciliationStatus: 'reopened',
              settlementMessage: cleanNote || 'Settlement reopened by GM for approval.'
            }
          },
          log: [
            ...((current.log || [])),
            { id: foundry.utils?.randomID?.() || `log_${Date.now()}`, at: Date.now(), type: 'gm-game-settlement-reopened', by: game.user?.id ?? null, note: cleanNote }
          ]
        }));
        ui?.notifications?.info?.('Game settlement reopened in the approval queue.');
        await this.render(false);
        return true;
      }
      if (action === 'game-refund-escrow') {
        const result = await GameCreditEscrowService.refundSession(session, cleanNote || 'GM refunded game escrow from reconciliation cockpit.');
        if (!result?.ok) {
          ui?.notifications?.error?.(`Game escrow refund failed: ${result?.error || 'Unknown error'}`);
          return false;
        }
        ui?.notifications?.info?.('Game escrow refunded through TransactionEngine.');
        await this.render(false);
        return true;
      }
    }
    return false;
  }

  _populateBulletinContactForm(form, contact = {}, { clone = false } = {}) {
    const assignments = {
      id: clone ? '' : contact.id,
      name: clone ? `${contact.name || contact.label || 'Contact'} Copy` : contact.name,
      label: clone ? `${contact.label || contact.name || 'Contact'} Copy` : contact.label,
      kind: contact.kind || 'source',
      imageUrl: contact.imageUrl || '',
      dateline: contact.dateline || '',
      sector: contact.sector || '',
      defaultCategory: contact.defaultCategory || 'general',
      notes: contact.notes || ''
    };
    for (const [name, value] of Object.entries(assignments)) {
      const field = form.querySelector(`[name="${name}"]`);
      if (!field) continue;
      field.value = value ?? '';
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
    form.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
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
    const breakingNews = formData.get('breakingNews') === 'on';
    const urgent = breakingNews || formData.get('urgent') === 'on' || priority === 'critical';

    setText('[data-preview-feed-category]', category);
    setText('[data-preview-feed-priority]', breakingNews ? 'BREAKING' : priority);
    setText('[data-preview-feed-title]', title);
    setText('[data-preview-feed-sender]', `${authorName} · ${audience}`);
    setHtml('[data-preview-feed-body]', String(formData.get('body') || '').trim() || 'Bulletin body preview will appear here.');

    const urgentNode = preview.querySelector('[data-preview-feed-urgent]');
    if (urgentNode) {
      urgentNode.textContent = breakingNews ? 'BREAKING NEWS' : 'Alert';
      urgentNode.classList.toggle('is-hidden', !urgent);
      urgentNode.classList.toggle('breaking', breakingNews);
    }

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

  async _setBulletinPreviewDeliveryState(recordId, recipientId, action) {
    if (!game.user?.isGM || !recordId || !recipientId) return;
    const record = await HolonetStorage.getRecord(recordId);
    if (!record) return;
    const now = new Date().toISOString();
    record.metadata ??= {};
    record.metadata.acknowledgements ??= {};
    record.metadata.dismissals ??= {};
    switch (action) {
      case 'read':
        record.markRead(recipientId, now);
        break;
      case 'unread':
        record.markUnread(recipientId);
        delete record.metadata.acknowledgements[recipientId];
        delete record.metadata.dismissals[recipientId];
        break;
      case 'acknowledge':
        record.markRead(recipientId, now);
        record.metadata.acknowledgements[recipientId] = { at: now, by: game.user?.id ?? null };
        break;
      case 'dismiss':
        record.markRead(recipientId, now);
        record.metadata.dismissals[recipientId] = { at: now, by: game.user?.id ?? null };
        break;
      default:
        return;
    }
    record.updatedAt = now;
    await HolonetStorage.saveRecord(record);
    await this.render(false);
  }

  async _saveBulletinContact(formData) {
    if (!game.user?.isGM) return;
    const name = String(formData.get('name') || '').trim();
    if (!name) {
      ui?.notifications?.warn?.('Contact/source name is required.');
      return;
    }
    await BulletinContactRegistry.saveContact({
      id: String(formData.get('id') || '').trim() || undefined,
      kind: String(formData.get('kind') || 'source').trim(),
      name,
      label: String(formData.get('label') || name).trim(),
      imageUrl: String(formData.get('imageUrl') || '').trim(),
      dateline: String(formData.get('dateline') || '').trim(),
      sector: String(formData.get('sector') || '').trim(),
      defaultCategory: String(formData.get('defaultCategory') || 'general').trim(),
      notes: String(formData.get('notes') || '').trim()
    });
    ui?.notifications?.info?.('Bulletin source/contact saved.');
    await this.render(false);
  }

  async _deleteBulletinContact(contactId) {
    if (!game.user?.isGM || !contactId) return;
    const ok = await BulletinContactRegistry.deleteContact(contactId);
    if (!ok) ui?.notifications?.warn?.('That contact could not be deleted. Built-in contacts are protected.');
    else ui?.notifications?.info?.('Bulletin source/contact deleted.');
    await this.render(false);
  }

  async _saveHolonewsAtomPolicy(formData) {
    if (!game.user?.isGM) return;
    const splitLines = (value) => String(value || '')
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter(Boolean);
    await HolonewsAtomPolicy.savePolicy({
      disabledCategories: formData.getAll('disabledCategories').filter(Boolean),
      disabledSectors: formData.getAll('disabledSectors').filter(Boolean),
      disabledPriorities: formData.getAll('disabledPriorities').filter(Boolean),
      blockedAtomIds: splitLines(formData.get('blockedAtomIds')),
      blockedKeywords: splitLines(formData.get('blockedKeywords'))
    });
    this.holonewsSeedOffset = 0;
    ui?.notifications?.info?.('HoloNews atom controls saved.');
    await this.render(false);
  }

  async _resetHolonewsAtomPolicy() {
    if (!game.user?.isGM) return;
    await HolonewsAtomPolicy.resetPolicy();
    this.holonewsSeedOffset = 0;
    ui?.notifications?.info?.('HoloNews atom controls reset.');
    await this.render(false);
  }

  async _saveBulletinRecord(formData, section) {
    const recordId = formData.get('recordId') || null;
    const shouldPublish = formData.get('submitMode') === 'publish';
    const audience = this._normalizeAudienceFromForm(formData);
    let record = recordId ? await HolonetStorage.getRecord(recordId) : null;
    const isHolonews = section === 'holonews';
    const category = isHolonews ? 'holonews' : (formData.get('category') || (section === 'events' ? 'news' : 'message'));
    const breakingNews = isHolonews && formData.get('breakingNews') === 'on';
    const priority = breakingNews ? 'critical' : (formData.get('priority') || 'normal');
    const urgent = breakingNews || formData.get('urgent') === 'on' || priority === 'critical';
    const pinAsLastSession = formData.get('pinAsLastSession') === 'on';
    const homeSlot = pinAsLastSession ? 'last-session' : (formData.get('homeSlot') || 'feed');
    const imageUrl = String(formData.get('imageUrl') || '').trim();
    const contactId = String(formData.get('contactId') || '').trim();

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
        contactId,
        bulletinHomeRole: homeSlot,
        bulletinConsoleVersion: isHolonews ? 3 : 2,
        holonews: isHolonews,
        breakingNews,
        newsSource: isHolonews ? (formData.get('authorName') || 'Galaxy News Net') : undefined,
        dateline: isHolonews ? (formData.get('dateline') || '') : undefined,
        sector: isHolonews ? (formData.get('sector') || '') : undefined,
        newsCategory: isHolonews ? (formData.get('newsCategory') || 'general') : undefined,
        newsDeck: isHolonews ? (formData.get('deck') || '') : undefined
      }
    };

    if (!record) {
      record = section === 'messages'
        ? BulletinSource.createBulletinMessage(baseData)
        : BulletinSource.createBulletinEvent(baseData);
    } else {
      record.title = baseData.title;
      record.body = baseData.body;
      record.audience = baseData.audience;
      record.priority = baseData.priority;
      record.metadata = { ...record.metadata, ...baseData.metadata };
      record.sender = section === 'messages'
        ? BulletinSource.createBulletinMessage(baseData).sender
        : BulletinSource.createBulletinEvent(baseData).sender;
      record.updatedAt = new Date().toISOString();
    }

    this._applyBulletinProjectionOptions(record, { urgent, pinAsLastSession, homeSlot, imageUrl, breakingNews });

    if (shouldPublish) {
      await HolonetEngine.publish(record);
    } else {
      await HolonetStorage.saveRecord(record);
    }

    if (pinAsLastSession) {
      await this._unpinOtherBulletins(record.id);
    }

    if (contactId) {
      await BulletinContactRegistry.markUsed(contactId);
    }

    this.bulletinEditor = { section, mode: 'create', recordId: null };
    await this.render(false);
  }


  _applyHolonewsWireFilters(formData) {
    this.holonewsSeedOffset = 0;
    this.holonewsHideUsedSeeds = formData.get('hideUsedSeeds') === 'on';
    this.holonewsWireFilters = {
      query: String(formData.get('query') || '').trim(),
      category: String(formData.get('category') || '').trim(),
      sector: String(formData.get('sector') || '').trim(),
      priority: String(formData.get('priority') || '').trim()
    };
  }

  _applyHolonewsArchiveFilters(formData) {
    this.holonewsArchiveFilters = {
      query: String(formData.get('query') || '').trim(),
      state: String(formData.get('state') || '').trim(),
      type: String(formData.get('type') || '').trim(),
      priority: String(formData.get('priority') || '').trim(),
      sector: String(formData.get('sector') || '').trim(),
      category: String(formData.get('category') || '').trim()
    };
  }

  async _createHolonewsFromSeed(seedId, { publish = false } = {}) {
    const seed = HolonewsGenerator.getById(seedId);
    if (!seed) {
      ui?.notifications?.warn?.('HoloNews seed story was not found.');
      return;
    }

    const existingRecords = await HolonetStorage.getAllRecords();
    const alreadyUsed = existingRecords.some((record) => record.sourceFamily === SOURCE_FAMILY.BULLETIN && record.metadata?.holonewsSeedId === seedId);
    if (alreadyUsed) {
      ui?.notifications?.warn?.('This ambient HoloNews wire story has already been used. Creating another copy anyway.');
    }

    const data = HolonewsGenerator.toBulletinData(seed, { breakingNews: false });
    const audience = HolonetAudience.allPlayers();
    const record = BulletinSource.createBulletinEvent({
      title: data.title,
      body: data.body,
      category: 'holonews',
      priority: data.priority || 'normal',
      audience,
      authorName: data.authorName || seed.source || 'Galaxy News Net',
      state: publish ? DELIVERY_STATE.PUBLISHED : DELIVERY_STATE.DRAFT,
      metadata: {
        ...data.metadata,
        category: 'holonews',
        priority: data.priority || 'normal',
        urgent: false,
        pinAsLastSession: false,
        homeSlot: 'feed',
        imageUrl: '',
        bulletinHomeRole: 'feed',
        bulletinConsoleVersion: 3
      }
    });

    this._applyBulletinProjectionOptions(record, {
      urgent: false,
      breakingNews: false,
      pinAsLastSession: false,
      homeSlot: 'feed',
      imageUrl: ''
    });

    if (publish) {
      await HolonetEngine.publish(record);
      ui?.notifications?.info?.('Ambient HoloNews story published.');
      this.bulletinEditor = { section: 'holonews', mode: 'create', recordId: null };
    } else {
      await HolonetStorage.saveRecord(record);
      this.bulletinEditor = { section: 'holonews', mode: 'edit', recordId: record.id };
      ui?.notifications?.info?.('Ambient HoloNews story loaded as a draft.');
    }

    this.currentBulletinSection = 'holonews';
    await this.render(false);
  }


  async _duplicateHolonewsRecord(recordId) {
    const source = await HolonetStorage.getRecord(recordId);
    if (!source) {
      ui?.notifications?.warn?.('HoloNews record was not found.');
      return;
    }
    if (!(source.metadata?.holonews === true || source.metadata?.category === 'holonews')) {
      ui?.notifications?.warn?.('Only HoloNews records can be duplicated from the HoloNews Desk.');
      return;
    }

    const metadata = foundry.utils?.deepClone?.(source.metadata)
      ?? foundry.utils?.duplicate?.(source.metadata)
      ?? { ...(source.metadata ?? {}) };
    metadata.duplicatedFromRecordId = source.id;
    metadata.duplicatedAt = new Date().toISOString();
    metadata.urgent = false;
    metadata.breakingNews = false;
    metadata.pinAsLastSession = false;
    metadata.homeSlot = 'feed';
    metadata.automatedHolonews = false;
    metadata.holonewsAutoPublishReason = undefined;
    metadata.holonewsAutoPublishedAt = undefined;
    metadata.bulletinConsoleVersion = 5;

    const record = BulletinSource.createBulletinEvent({
      title: `Copy of ${source.title || 'HoloNews Story'}`,
      body: source.body || '',
      category: 'holonews',
      priority: source.metadata?.previousPriority || (source.priority === 'critical' ? 'normal' : (source.priority || 'normal')),
      audience: source.audience || HolonetAudience.allPlayers(),
      authorName: source.metadata?.newsSource || source.sender?.systemLabel || source.sender?.actorName || 'Galaxy News Net',
      authorAvatar: source.metadata?.imageUrl || source.sender?.avatar || null,
      state: DELIVERY_STATE.DRAFT,
      metadata
    });

    this._applyBulletinProjectionOptions(record, {
      urgent: false,
      breakingNews: false,
      pinAsLastSession: false,
      homeSlot: 'feed',
      imageUrl: metadata.imageUrl || ''
    });
    await HolonetStorage.saveRecord(record);
    this.currentBulletinSection = 'holonews';
    this.bulletinEditor = { section: 'holonews', mode: 'edit', recordId: record.id };
    ui?.notifications?.info?.('HoloNews story duplicated as a draft.');
    await this.render(false);
  }

  async _setHolonewsBreaking(recordId, enabled) {
    const record = await HolonetStorage.getRecord(recordId);
    if (!record) {
      ui?.notifications?.warn?.('HoloNews record was not found.');
      return;
    }
    if (!(record.metadata?.holonews === true || record.metadata?.category === 'holonews')) {
      ui?.notifications?.warn?.('Only HoloNews records can be marked as Breaking News.');
      return;
    }

    const metadata = { ...(record.metadata ?? {}) };
    if (enabled) {
      metadata.previousPriority = record.priority === 'critical' ? (metadata.previousPriority || 'normal') : (record.priority || metadata.priority || 'normal');
      record.priority = 'critical';
      metadata.priority = 'critical';
      metadata.urgent = true;
      metadata.breakingNews = true;
    } else {
      const restoredPriority = metadata.previousPriority || 'normal';
      record.priority = restoredPriority;
      metadata.priority = restoredPriority;
      metadata.urgent = false;
      metadata.breakingNews = false;
      delete metadata.previousPriority;
    }
    metadata.bulletinConsoleVersion = 4;
    record.metadata = metadata;
    record.updatedAt = new Date().toISOString();

    this._applyBulletinProjectionOptions(record, {
      urgent: enabled,
      breakingNews: enabled,
      pinAsLastSession: record.metadata?.pinAsLastSession === true,
      homeSlot: record.metadata?.homeSlot || 'feed',
      imageUrl: record.metadata?.imageUrl || ''
    });

    await HolonetStorage.saveRecord(record);
    ui?.notifications?.info?.(enabled ? 'HoloNews story marked Breaking News.' : 'Breaking News alert removed.');
    await this.render(false);
  }

  async _restoreHolonewsAsDraft(recordId) {
    const record = await HolonetStorage.getRecord(recordId);
    if (!record) {
      ui?.notifications?.warn?.('HoloNews record was not found.');
      return;
    }
    if (!(record.metadata?.holonews === true || record.metadata?.category === 'holonews')) {
      ui?.notifications?.warn?.('Only HoloNews records can be restored from the HoloNews Desk.');
      return;
    }

    record.state = DELIVERY_STATE.DRAFT;
    record.archivedAt = null;
    record.updatedAt = new Date().toISOString();
    record.metadata = {
      ...(record.metadata ?? {}),
      restoredFromArchiveAt: new Date().toISOString(),
      bulletinConsoleVersion: 4
    };
    await HolonetStorage.saveRecord(record);
    this.currentBulletinSection = 'holonews';
    this.bulletinEditor = { section: 'holonews', mode: 'edit', recordId: record.id };
    ui?.notifications?.info?.('Archived HoloNews story restored as a draft.');
    await this.render(false);
  }

  async _saveHolonewsAutomationPolicy(formData) {
    if (!game.user?.isGM) return;
    const patch = {
      enabled: formData.get('enabled') === 'on',
      cadenceMinutes: Number(formData.get('cadenceMinutes') || 240),
      maxPerRun: Number(formData.get('maxPerRun') || 1),
      hideUsedSeeds: formData.get('hideUsedSeeds') === 'on',
      allowRepeatsWhenExhausted: formData.get('allowRepeatsWhenExhausted') === 'on',
      query: String(formData.get('query') || '').trim(),
      category: String(formData.get('category') || '').trim(),
      sector: String(formData.get('sector') || '').trim(),
      priority: String(formData.get('priority') || '').trim(),
      sourceName: String(formData.get('sourceName') || 'Galaxy News Net').trim() || 'Galaxy News Net'
    };

    const resetSchedule = formData.get('resetSchedule') === 'on';
    const policy = await HolonewsAutoPublisher.savePolicy(patch, { resetSchedule });
    ui?.notifications?.info?.(policy.enabled
      ? `Ambient HoloNews automation saved. Next publish: ${policy.nextDueAt || 'not scheduled'}.`
      : 'Ambient HoloNews automation saved in manual-only mode.');
    await this.render(false);
  }

  async _publishHolonewsAmbientNow(count = 1) {
    if (!game.user?.isGM) return;
    const result = await HolonewsAutoPublisher.publishNow({ count });
    if (result?.published) {
      ui?.notifications?.info?.(`Published ${result.published} ambient HoloNews ${result.published === 1 ? 'story' : 'stories'}.`);
    } else if (result?.reason === 'no-eligible-seeds') {
      ui?.notifications?.warn?.('No eligible ambient HoloNews stories match the automation policy.');
    } else if (result?.reason === 'not-primary-gm') {
      ui?.notifications?.warn?.('Only the primary active GM client can publish automated ambient HoloNews.');
    } else if (result?.failed) {
      ui?.notifications?.error?.(`Ambient HoloNews publish failed: ${result.error || 'unknown error'}`);
    } else {
      ui?.notifications?.warn?.('No ambient HoloNews stories were published.');
    }
    await this.render(false);
  }

  async _resetHolonewsAutomationSchedule() {
    if (!game.user?.isGM) return;
    const policy = await HolonewsAutoPublisher.savePolicy({}, { resetSchedule: true });
    ui?.notifications?.info?.(policy.enabled
      ? `Ambient HoloNews schedule reset. Next publish: ${policy.nextDueAt || 'not scheduled'}.`
      : 'Ambient HoloNews schedule cleared because automation is manual-only.');
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

  _applyBulletinProjectionOptions(record, { urgent = false, pinAsLastSession = false, homeSlot = 'feed', imageUrl = undefined, breakingNews = false } = {}) {
    if (!record) return record;
    record.metadata = {
      ...(record.metadata ?? {}),
      urgent: Boolean(urgent || breakingNews),
      breakingNews: Boolean(breakingNews),
      pinAsLastSession: Boolean(pinAsLastSession),
      homeSlot: pinAsLastSession ? 'last-session' : homeSlot,
      imageUrl: imageUrl === undefined ? (record.metadata?.imageUrl || '') : String(imageUrl || '').trim(),
      bulletinConsoleVersion: Math.max(Number(record.metadata?.bulletinConsoleVersion || 0), 4)
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
        imageUrl: record.metadata?.imageUrl || '',
        breakingNews: Boolean(breakingNews || record.metadata?.breakingNews)
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
    if ((urgent || breakingNews) && !hasBubble) {
      record.projections.push({
        surfaceType: SURFACE_TYPE.NOTIFICATION_BUBBLE,
        recordId: record.id,
        isPinned: false,
        metadata: { source: 'gm-bulletin-console', urgent: true, breakingNews: Boolean(breakingNews), imageUrl: record.metadata?.imageUrl || '' }
      });
    } else if (!urgent && hasBubble) {
      record.projections = record.projections.filter((entry) => entry.surfaceType !== SURFACE_TYPE.NOTIFICATION_BUBBLE);
    }

    return record;
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
    if (kind === 'game' && rawId) return { kind, sessionId: rawId };
    return { kind: null, index: -1, actorId: null, sessionId: null };
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

    // Game settlement edits are applied during approval so the GM can use the
    // same review form for both recommended and custom payout decisions.
    if (parsed.kind === 'game') return;

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

  async _approveApprovalRequest(key, options = {}) {
    const parsed = this._parseApprovalKey(key);
    if (parsed.kind === 'droid') return this._approveDroid(parsed.actorId);
    if (parsed.kind === 'custom') return this._approvePendingCustom(parsed.index);
    if (parsed.kind === 'game') return this._approveGameSettlement(parsed.sessionId, options);
    ui?.notifications?.error?.('Invalid approval request.');
  }

  async _finalizeApprovalWithEdits(key, formData) {
    try {
      const parsed = this._parseApprovalKey(key);
      if (parsed.kind === 'game') {
        const data = formData ? new FormData(formData) : new FormData();
        const approvedPayout = this._approvalNumberValue(data.get('approvedPayout'));
        const reason = String(data.get('metadata.gmSettlementReason') ?? '').trim();
        await this._approveApprovalRequest(key, { payoutAmount: approvedPayout, reason, decision: 'custom' });
        return;
      }
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
    if (parsed.kind === 'game') return this._denyGameSettlement(parsed.sessionId, reason);
    ui?.notifications?.error?.('Invalid approval request.');
  }

  async _approveGameSettlement(sessionId, { payoutAmount = null, reason = '', decision = 'recommended' } = {}) {
    const session = GameSessionStore.getSession(sessionId);
    if (!session) {
      ui?.notifications?.error?.('Game settlement session not found.');
      return;
    }
    const credits = session.escrow?.credits ?? {};
    const recommended = credits.payoutMode === 'table-credit-balances'
      ? Number(credits.payoutRequested ?? Object.values(credits.payoutBalances ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0))
      : Number(credits.policy?.recommendedPayout ?? credits.payoutApproved ?? credits.payoutRequested ?? credits.pot ?? 0);
    const approved = payoutAmount === null || payoutAmount === undefined ? recommended : Number(payoutAmount);
    const result = await GameCreditEscrowService.approvePendingSettlement(session, {
      payoutAmount: Number.isFinite(approved) ? Math.max(0, Math.floor(approved)) : 0,
      decision,
      reason,
      by: game.user?.id ?? null
    });
    if (!result?.ok) {
      ui?.notifications?.error?.(result?.error || 'Game settlement approval failed.');
      return;
    }
    this.selectedApprovalKey = null;
    this.approvalEditMode = false;
    this.approvalDenyMode = false;
    ui?.notifications?.info?.('Game settlement approved.');
    await this.render(false);
  }

  async _denyGameSettlement(sessionId, reason = '') {
    const session = GameSessionStore.getSession(sessionId);
    if (!session) {
      ui?.notifications?.error?.('Game settlement session not found.');
      return;
    }
    const result = await GameCreditEscrowService.approvePendingSettlement(session, {
      payoutAmount: 0,
      decision: 'denied',
      reason: String(reason || '').trim() || 'GM denied the game payout settlement.',
      by: game.user?.id ?? null
    });
    if (!result?.ok) {
      ui?.notifications?.error?.(result?.error || 'Game settlement denial failed.');
      return;
    }
    this.selectedApprovalKey = null;
    this.approvalEditMode = false;
    this.approvalDenyMode = false;
    ui?.notifications?.info?.('Game settlement denied.');
    await this.render(false);
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


  _cloneApprovalPayload(value) {
    if (value === undefined || value === null) return value;
    if (globalThis.foundry?.utils?.deepClone) return foundry.utils.deepClone(value);
    try { return structuredClone(value); } catch (_err) { return JSON.parse(JSON.stringify(value)); }
  }

  _stripApprovalDocumentIdentity(data = {}) {
    const clone = this._cloneApprovalPayload(data) || {};
    delete clone._id;
    delete clone.id;
    return clone;
  }

  async _buildStoreItemApprovalMutationPlans(approval = {}) {
    const items = Array.isArray(approval.approvalItems) ? approval.approvalItems : [];
    const plans = [];
    const itemData = [];

    for (const item of items) {
      const type = String(item?.type || '').toLowerCase();
      const sourceBucket = String(item?.sourceBucket || '').toLowerCase();
      const data = this._stripApprovalDocumentIdentity(item?.itemData || { name: item?.name || 'Store item', type: item?.type || 'equipment', img: item?.img, system: {} });

      if (type === 'droid' || sourceBucket === 'droids') {
        const { DroidFactory } = await import('/systems/foundryvtt-swse/scripts/engine/droids/droid-factory.js');
        plans.push(DroidFactory.buildMutationPlan({ droidActor: data, name: item?.name || data.name }));
        continue;
      }

      if (type === 'vehicle' || sourceBucket === 'vehicles') {
        const { VehicleFactory } = await import('/systems/foundryvtt-swse/scripts/engine/vehicles/vehicle-factory.js');
        plans.push(VehicleFactory.buildMutationPlan({ template: data, condition: item?.condition || 'new' }));
        continue;
      }

      itemData.push(data);
    }

    if (itemData.length) {
      plans.push({ add: { items: itemData } });
    }

    return plans;
  }

  async _approveStoreItemPurchase(index, approval, ownerActor) {
    const cost = normalizeCredits(approval.costCredits ?? 0);
    const approvalItems = Array.isArray(approval.approvalItems) ? approval.approvalItems : [];
    if (!approvalItems.length) {
      ui?.notifications?.error?.('No store item payload is recorded for this approval.');
      return false;
    }

    const purchaseItems = approvalItems.map(item => ({
      id: item.id || item.policyId || null,
      policyId: item.policyId || item.id || null,
      name: item.name || 'Store item',
      type: item.type || 'item',
      finalCost: normalizeCredits(item.finalCost ?? item.cost ?? 0),
      cost: normalizeCredits(item.cost ?? item.finalCost ?? 0),
      condition: item.condition || null
    }));
    const pricedTotal = purchaseItems.reduce((sum, item) => sum + normalizeCredits(item.finalCost ?? item.cost ?? 0), 0);
    if (purchaseItems.length && pricedTotal !== cost) {
      const delta = cost - pricedTotal;
      purchaseItems[0].finalCost = Math.max(0, normalizeCredits(purchaseItems[0].finalCost + delta));
      purchaseItems[0].cost = purchaseItems[0].finalCost;
    }

    const result = await StoreEngine.purchase({
      actor: ownerActor,
      items: purchaseItems,
      totalCost: cost,
      transactionContext: 'store-purchase',
      itemGrantCallback: async () => this._buildStoreItemApprovalMutationPlans(approval)
    });

    if (!result.success) {
      ui?.notifications?.error?.(`Failed to approve store purchase: ${result.error}`);
      return false;
    }

    const approvals = SettingsHelper.getArray('pendingCustomPurchases', []);
    approvals.splice(index, 1);
    await SettingsHelper.set('pendingCustomPurchases', approvals);

    Hooks.call('swseCustomPurchaseApproved', {
      approval,
      actor: ownerActor,
      draftActor: null,
      transactionId: result.transactionId,
      decidedBy: game.user?.name ?? 'GM',
      edited: !!approval.metadata?.gmNotes
    });

    this.selectedApprovalKey = null;
    this.approvalEditMode = false;
    this.approvalDenyMode = false;
    ui?.notifications?.info?.(`Approved: ${approval.draftData?.name ?? 'Store purchase'}`);
    await this.render(false);
    return true;
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

    if (approval.type === 'store-item' || approval.approvalKind === 'store-policy-item') {
      return this._approveStoreItemPurchase(index, approval, ownerActor);
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

export default GMDatapad;
