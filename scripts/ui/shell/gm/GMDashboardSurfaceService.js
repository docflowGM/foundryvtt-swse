/** GM command dashboard/home surface view-model. */

import { SettingsHelper } from '/systems/foundryvtt-swse/scripts/utils/settings-helper.js';
import { HolonetStorage } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js';
import { HolonetStateService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-state-service.js';
import { GMHealingTrigger } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-healing-trigger.js';
import { GameSessionStore } from '/systems/foundryvtt-swse/scripts/games/game-session-store.js';
import { SOURCE_FAMILY, DELIVERY_STATE } from '/systems/foundryvtt-swse/scripts/holonet/contracts/enums.js';
import { GMHouseRulesSurfaceService } from './GMHouseRulesSurfaceService.js';

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatMaybeDate(value) {
  if (!value) return 'No timestamp';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export class GMDashboardSurfaceService {
  static async buildViewModel(host) {
    const badgeCounts = await host._getHomeBadgeCounts();
    if (badgeCounts.gameApprovals === undefined) {
      const gameApprovals = this._getPendingGameSettlementCount();
      badgeCounts.gameApprovals = gameApprovals;
      badgeCounts.approvals = (badgeCounts.approvals ?? 0) + gameApprovals;
    }
    const sceneStatus = this._buildSceneStatus();
    const combatStatus = this._buildCombatStatus();
    const storeStatus = await this._buildStoreStatus(host);
    const bulletinStatus = await this._buildBulletinStatus();
    const partyStatus = await this._buildPartyStatus();
    const healingStatus = await this._buildHealingStatus();
    const activeRuleCount = this._getActiveRuleCount(host);
    const recentTransactions = await this._getRecentTransactions(host);

    const commandStats = [
      {
        id: 'approvals',
        label: 'Pending Approvals',
        value: badgeCounts.approvals ?? 0,
        detail: `${storeStatus.pendingApprovals} store · ${badgeCounts.pendingDroids ?? 0} droid · ${badgeCounts.gameApprovals ?? 0} game`,
        tone: (badgeCounts.approvals ?? 0) > 0 ? 'crit' : 'stable',
        route: 'approvals'
      },
      {
        id: 'store',
        label: 'Store Queue',
        value: badgeCounts.store ?? 0,
        detail: storeStatus.open ? 'Store online' : 'Store closed',
        tone: storeStatus.open ? ((badgeCounts.store ?? 0) > 0 ? 'warn' : 'stable') : 'offline',
        route: 'store'
      },
      {
        id: 'bulletin',
        label: 'Holonet Signals',
        value: badgeCounts.bulletin ?? 0,
        detail: `${bulletinStatus.published} live · ${bulletinStatus.drafts} draft`,
        tone: (badgeCounts.bulletin ?? 0) > 0 ? 'info' : 'stable',
        route: 'bulletin'
      },
      {
        id: 'jobs',
        label: 'Contract Queue',
        value: badgeCounts.jobs ?? 0,
        detail: `${badgeCounts.jobReview ?? 0} review · ${badgeCounts.jobPayout ?? 0} payout`,
        tone: (badgeCounts.jobs ?? 0) > 0 ? 'crit' : 'stable',
        route: 'jobs'
      },
      {
        id: 'trade',
        label: 'Trade Watch',
        value: badgeCounts.trade ?? 0,
        detail: `${badgeCounts.tradeApprovals ?? 0} approval · ${badgeCounts.tradeFailed ?? 0} failed`,
        tone: (badgeCounts.tradeFailed ?? 0) > 0 ? 'crit' : (badgeCounts.tradeApprovals ?? 0) > 0 ? 'warn' : 'stable',
        route: 'trade'
      },
      {
        id: 'workspace',
        label: 'Owned Actors',
        value: badgeCounts.workspace ?? 0,
        detail: `${partyStatus.partyActors} player-linked`,
        tone: 'info',
        route: 'workspace'
      }
    ];

    const dashboardPanels = [
      {
        id: 'scene',
        label: 'Current Scene',
        value: sceneStatus.name,
        detail: sceneStatus.detail,
        tone: sceneStatus.active ? 'stable' : 'offline',
        route: 'workspace',
        icon: 'fa-solid fa-map-location-dot'
      },
      {
        id: 'combat',
        label: 'Active Combat',
        value: combatStatus.label,
        detail: combatStatus.detail,
        tone: combatStatus.active ? 'crit' : 'stable',
        route: 'healing',
        icon: 'fa-solid fa-crosshairs'
      },
      {
        id: 'party',
        label: 'Party State',
        value: partyStatus.location || 'No location logged',
        detail: partyStatus.objective || partyStatus.situation || 'No active party objective',
        tone: partyStatus.hasState ? 'info' : 'offline',
        route: 'bulletin',
        icon: 'fa-solid fa-people-group'
      },
      {
        id: 'healing',
        label: 'Recovery Watch',
        value: `${healingStatus.eligible} eligible`,
        detail: `${healingStatus.ineligible} ineligible · ${healingStatus.warningCount} warning`,
        tone: healingStatus.warningCount > 0 ? 'warn' : 'stable',
        route: 'healing',
        icon: 'fa-solid fa-heart-pulse'
      },
      {
        id: 'rules',
        label: 'Active House Rules',
        value: String(activeRuleCount),
        detail: 'Enabled rule overrides',
        tone: activeRuleCount > 0 ? 'info' : 'stable',
        route: 'house-rules',
        icon: 'fa-solid fa-scale-balanced'
      },
      {
        id: 'store',
        label: 'Store Status',
        value: storeStatus.open ? 'Online' : 'Closed',
        detail: `${storeStatus.buyModifier}% buy modifier · ${storeStatus.autoAcceptSelling ? 'auto-sell on' : 'manual sell review'}`,
        tone: storeStatus.open ? 'stable' : 'offline',
        route: 'store',
        icon: 'fa-solid fa-store'
      }
    ];

    return {
      pageTitle: 'GM Command Dashboard',
      pageDescription: 'Master control for store, rules, approvals, and party management',
      badgeCounts,
      dashboardTone: 'command',
      commandStats,
      dashboardPanels,
      sceneStatus,
      combatStatus,
      storeStatus,
      bulletinStatus,
      partyStatus,
      healingStatus,
      activeRuleCount,
      recentTransactions,
      dashboardAlerts: this._buildDashboardAlerts({
        badgeCounts,
        sceneStatus,
        combatStatus,
        storeStatus,
        partyStatus,
        healingStatus,
        bulletinStatus
      }),
      commandInbox: this._buildCommandInbox({
        badgeCounts,
        sceneStatus,
        combatStatus,
        storeStatus,
        partyStatus,
        healingStatus,
        bulletinStatus
      }),
      quickActions: [
        { route: 'bulletin', label: 'Broadcast Bulletin', icon: 'fa-solid fa-tower-broadcast', tone: 'info' },
        { route: 'jobs', label: 'Open Job Board', icon: 'fa-solid fa-clipboard-list', tone: (badgeCounts.jobs ?? 0) > 0 ? 'crit' : 'stable' },
        { route: 'trade', label: 'Open Trade Console', icon: 'fa-solid fa-right-left', tone: (badgeCounts.trade ?? 0) > 0 ? 'crit' : 'stable' },
        { route: 'store', label: 'Open Store Control', icon: 'fa-solid fa-store', tone: 'stable' },
        { route: 'approvals', label: 'Review Approvals', icon: 'fa-solid fa-clipboard-check', tone: (badgeCounts.approvals ?? 0) > 0 ? 'crit' : 'stable' },
        { route: 'healing', label: 'Run Recovery', icon: 'fa-solid fa-heart-pulse', tone: healingStatus.eligible > 0 ? 'warn' : 'stable' },
        { route: 'settings', label: 'Tune Holopad', icon: 'fa-solid fa-sliders', tone: 'info' }
      ]
    };
  }


  static _getPendingGameSettlementCount() {
    try {
      return GameSessionStore.getAllSessions()
        .filter((session) => session?.escrow?.credits?.status === 'pending-gm-settlement')
        .length;
    } catch (_err) {
      return 0;
    }
  }

  static _buildSceneStatus() {
    const scene = game.scenes?.active ?? globalThis.canvas?.scene ?? null;
    const tokenCount = scene?.tokens?.size ?? scene?.tokens?.contents?.length ?? scene?.tokens?.length ?? 0;

    return {
      active: Boolean(scene),
      name: scene?.name ?? 'No active scene',
      tokenCount,
      detail: scene ? `${tokenCount} token${tokenCount === 1 ? '' : 's'} in scene` : 'Activate a scene to populate tactical context'
    };
  }

  static _buildCombatStatus() {
    const combat = game.combat ?? null;
    const combatants = combat?.combatants?.size ?? combat?.combatants?.contents?.length ?? combat?.combatants?.length ?? 0;
    const current = combat?.combatant?.name ?? combat?.combatant?.actor?.name ?? null;
    const round = safeNumber(combat?.round, 0);
    const turn = safeNumber(combat?.turn, 0) + 1;

    return {
      active: Boolean(combat?.started || combat?.combatants?.size || combatants),
      label: combat ? `Round ${round || 1}` : 'No combat',
      current,
      round: round || 1,
      turn,
      combatants,
      detail: combat ? `${combatants} combatant${combatants === 1 ? '' : 's'} · turn ${turn}${current ? ` · ${current}` : ''}` : 'No active encounter tracker'
    };
  }

  static async _buildStoreStatus(host) {
    await host._loadStorePendingSales();
    await host._loadStorePendingApprovals();

    return {
      open: SettingsHelper.getSafe('storeOpen', true),
      buyModifier: safeNumber(SettingsHelper.getSafe('globalBuyModifier', 0)),
      autoAcceptSelling: Boolean(SettingsHelper.getSafe('autoAcceptItemSales', false)),
      autoSalePercent: safeNumber(SettingsHelper.getSafe('automaticSalePercentage', 50), 50),
      pendingSales: host.pendingSales?.length ?? 0,
      pendingApprovals: host.storeApprovals?.length ?? 0
    };
  }

  static async _buildBulletinStatus() {
    const records = await HolonetStorage.getAllRecords();
    const bulletinRecords = records.filter((record) => record.sourceFamily === SOURCE_FAMILY.BULLETIN);
    const activeRecords = bulletinRecords.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED);

    return {
      total: bulletinRecords.length,
      active: activeRecords.length,
      published: bulletinRecords.filter((record) => record.state === DELIVERY_STATE.PUBLISHED).length,
      drafts: bulletinRecords.filter((record) => record.state === DELIVERY_STATE.DRAFT).length,
      archived: bulletinRecords.filter((record) => record.state === DELIVERY_STATE.ARCHIVED).length
    };
  }

  static async _buildPartyStatus() {
    const partyState = await HolonetStateService.getPartyState();
    const players = game.users?.filter((user) => !user.isGM) ?? [];
    const partyActors = players.filter((user) => user.character).length;

    return {
      players: players.length,
      partyActors,
      location: partyState?.location ?? '',
      objective: partyState?.objective ?? '',
      situation: partyState?.situation ?? '',
      hasState: Boolean(partyState?.location || partyState?.objective || partyState?.situation)
    };
  }

  static async _buildHealingStatus() {
    try {
      const summary = await GMHealingTrigger.getHealingSummary();
      return {
        eligible: summary?.eligible ?? 0,
        ineligible: summary?.ineligible ?? 0,
        warningCount: summary?.ineligible ?? 0,
        eligibleActors: summary?.eligibleActors ?? [],
        ineligibleActors: summary?.ineligibleActors ?? []
      };
    } catch (_err) {
      return { eligible: 0, ineligible: 0, warningCount: 0, eligibleActors: [], ineligibleActors: [] };
    }
  }

  static _getActiveRuleCount(_host) {
    return GMHouseRulesSurfaceService.getActiveRuleCount();
  }

  static async _getRecentTransactions(host) {
    await host._loadStoreTransactionHistory();
    return (host.transactions ?? []).slice(0, 5).map((transaction) => ({
      ...transaction,
      timeLabel: formatMaybeDate(transaction.timestamp),
      amountLabel: `${transaction.amount > 0 ? '+' : ''}${transaction.amount} cr`,
      amountTone: transaction.amount > 0 ? 'positive' : 'negative'
    }));
  }

  static _buildCommandInbox({ badgeCounts, sceneStatus, combatStatus, storeStatus, partyStatus, healingStatus, bulletinStatus }) {
    const items = [];
    const add = (item) => items.push({
      id: item.id ?? `inbox-${items.length + 1}`,
      tone: item.tone ?? 'info',
      source: item.source ?? 'GM',
      label: item.label ?? 'Action item',
      detail: item.detail ?? '',
      route: item.route ?? 'home',
      actionLabel: item.actionLabel ?? 'Open'
    });

    if ((badgeCounts.tradeFailed ?? 0) > 0) {
      add({ tone: 'crit', source: 'Trade Console', label: `${badgeCounts.tradeFailed} failed trade settlement${badgeCounts.tradeFailed === 1 ? '' : 's'}`, detail: 'Review atomic diagnostics and rollback state.', route: 'trade', actionLabel: 'Review Trades' });
    }
    if ((badgeCounts.tradeApprovals ?? 0) > 0) {
      add({ tone: 'warn', source: 'Trade Console', label: `${badgeCounts.tradeApprovals} trade approval${badgeCounts.tradeApprovals === 1 ? '' : 's'} pending`, detail: 'Approve, decline, or investigate pending Holonet trades.', route: 'trade', actionLabel: 'Open Queue' });
    }
    if ((badgeCounts.jobReview ?? 0) > 0) {
      add({ tone: 'crit', source: 'Job Board', label: `${badgeCounts.jobReview} objective claim${badgeCounts.jobReview === 1 ? '' : 's'} need review`, detail: 'Approve, reject, fail, or reopen submitted objectives.', route: 'jobs', actionLabel: 'Review Jobs' });
    }
    if ((badgeCounts.jobPayout ?? 0) > 0) {
      add({ tone: 'warn', source: 'Job Board', label: `${badgeCounts.jobPayout} completed contract${badgeCounts.jobPayout === 1 ? '' : 's'} ready for payout`, detail: 'Distribute credits, party-fund cuts, and rewards.', route: 'jobs', actionLabel: 'Pay Rewards' });
    }
    if ((badgeCounts.gameApprovals ?? 0) > 0) {
      add({ tone: 'crit', source: 'Holopad Games', label: `${badgeCounts.gameApprovals} game settlement${badgeCounts.gameApprovals === 1 ? '' : 's'} need approval`, detail: 'Approve, adjust, or deny pending game payout and table-credit cash-out requests.', route: 'approvals', actionLabel: 'Review Games' });
    }
    if ((badgeCounts.approvals ?? 0) > 0) {
      add({ tone: 'warn', source: 'Approvals', label: `${badgeCounts.approvals} approval request${badgeCounts.approvals === 1 ? '' : 's'} pending`, detail: `${storeStatus.pendingApprovals} store · ${badgeCounts.pendingDroids ?? 0} droid · ${badgeCounts.gameApprovals ?? 0} game`, route: 'approvals', actionLabel: 'Review' });
    }
    if (combatStatus.active) {
      add({ tone: 'crit', source: 'Combat & Recovery', label: 'Encounter tracker is active', detail: combatStatus.detail, route: 'healing', actionLabel: 'Open Recovery' });
    }
    if (healingStatus.warningCount > 0) {
      add({ tone: 'warn', source: 'Combat & Recovery', label: `${healingStatus.warningCount} recovery warning${healingStatus.warningCount === 1 ? '' : 's'}`, detail: `${healingStatus.eligible} eligible · ${healingStatus.ineligible} ineligible`, route: 'healing', actionLabel: 'Review Roster' });
    }
    if ((bulletinStatus.drafts ?? 0) > 0) {
      add({ tone: 'info', source: 'Bulletin', label: `${bulletinStatus.drafts} bulletin draft${bulletinStatus.drafts === 1 ? '' : 's'}`, detail: 'Draft broadcasts can be published or archived.', route: 'bulletin', actionLabel: 'Open Bulletin' });
    }
    if (!sceneStatus.active) {
      add({ tone: 'offline', source: 'Workspace', label: 'No active scene', detail: 'Scene context is unavailable for tactical commands.', route: 'workspace', actionLabel: 'Open Workspace' });
    }

    return items.slice(0, 12);
  }

  static _buildDashboardAlerts({ badgeCounts, sceneStatus, combatStatus, storeStatus, partyStatus, healingStatus, bulletinStatus }) {
    const alerts = [];

    if ((badgeCounts.approvals ?? 0) > 0) {
      alerts.push({ tone: 'crit', label: 'Approvals waiting', detail: `${badgeCounts.approvals} approval${badgeCounts.approvals === 1 ? '' : 's'} require GM review.`, route: 'approvals' });
    }

    if ((badgeCounts.jobs ?? 0) > 0) {
      alerts.push({ tone: 'crit', label: 'Job board action', detail: `${badgeCounts.jobReview ?? 0} objective review · ${badgeCounts.jobPayout ?? 0} payout queue.`, route: 'jobs' });
    }

    if ((badgeCounts.trade ?? 0) > 0) {
      alerts.push({ tone: (badgeCounts.tradeFailed ?? 0) > 0 ? 'crit' : 'warn', label: 'Trade console action', detail: `${badgeCounts.tradeApprovals ?? 0} approval · ${badgeCounts.tradeFailed ?? 0} failed settlement.`, route: 'trade' });
    }

    if (!storeStatus.open) {
      alerts.push({ tone: 'offline', label: 'Store closed', detail: 'Players cannot complete normal store purchases.', route: 'store' });
    }

    if (combatStatus.active) {
      alerts.push({ tone: 'crit', label: 'Combat active', detail: combatStatus.detail, route: 'healing' });
    }

    if (!partyStatus.hasState) {
      alerts.push({ tone: 'warn', label: 'Party state missing', detail: 'No shared location, objective, or situation has been logged.', route: 'bulletin' });
    }

    if (!sceneStatus.active) {
      alerts.push({ tone: 'offline', label: 'No active scene', detail: 'Scene context is unavailable for the command dashboard.', route: 'workspace' });
    }

    if (healingStatus.warningCount > 0) {
      alerts.push({ tone: 'warn', label: 'Recovery watch', detail: `${healingStatus.warningCount} actor${healingStatus.warningCount === 1 ? '' : 's'} not eligible for natural healing.`, route: 'healing' });
    }

    if (bulletinStatus.drafts > 0) {
      alerts.push({ tone: 'info', label: 'Draft bulletins', detail: `${bulletinStatus.drafts} bulletin draft${bulletinStatus.drafts === 1 ? '' : 's'} waiting to publish.`, route: 'bulletin' });
    }

    return alerts.slice(0, 6);
  }
}
