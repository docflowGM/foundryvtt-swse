/**
 * HomeSurfaceService — View-model builder for the Holopad Home surface.
 *
 * Builds the launcher grid plus the first real Holonet-driven player dashboard:
 * - current status / situation
 * - recent comm feed
 * - featured last-session briefing
 * - quick-glance metrics
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import { determineLevelFromXP } from '/systems/foundryvtt-swse/scripts/engine/progression/xp-engine.js';
import { getTotalLevel } from '/systems/foundryvtt-swse/scripts/actors/derived/level-split.js';
import { HolonetEngine } from '/systems/foundryvtt-swse/scripts/holonet/holonet-engine.js';
import { HolonetFeedService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-feed-service.js';
import { HolonetStateService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-state-service.js';
import { HolonetMarkupService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-markup-service.js';
import { HolonetNoticeCenterService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-notice-center-service.js';
import { SOURCE_FAMILY, SURFACE_TYPE } from '/systems/foundryvtt-swse/scripts/holonet/contracts/enums.js';

function supportedTypesForMentor(actor) {
  return ['character', 'droid', 'npc'].includes(actor?.type);
}

function currentRecipientId() {
  if (!game.user) return null;
  return game.user.isGM ? `gm:${game.user.id}` : `player:${game.user.id}`;
}

function asNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatTimestamp(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function actorPortrait(actor) {
  return actor?.img || actor?.prototypeToken?.texture?.src || 'icons/svg/mystery-man.svg';
}

function previewText(value = '', length = 160) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= length) return text;
  return `${text.slice(0, Math.max(0, length - 1)).trimEnd()}…`;
}

function sourceIcon(record) {
  switch (record?.sourceFamily) {
    case SOURCE_FAMILY.MENTOR: return '✶';
    case SOURCE_FAMILY.MESSENGER: return '✉';
    case SOURCE_FAMILY.STORE: return '¤';
    case SOURCE_FAMILY.APPROVALS: return '✓';
    case SOURCE_FAMILY.PROGRESSION: return '▲';
    case SOURCE_FAMILY.BULLETIN:
    case SOURCE_FAMILY.GM_AUTHORED:
      return '◎';
    default:
      return '◇';
  }
}

function sourceLabel(record) {
  return record?.sender?.actorName || record?.sender?.systemLabel || record?.sender?.label || 'Holonet';
}

function categoryLabel(record) {
  const category = record?.metadata?.category || record?.sourceFamily || 'update';
  return String(category).replace(/[_-]+/g, ' ').toUpperCase();
}

export class HomeSurfaceService {
  static async buildViewModel(actor) {
    const [progressionSummary, upgradeSummary, holonetSummary] = await Promise.all([
      this._getProgressionSummary(actor),
      this._getUpgradeSummary(actor),
      this._getHolonetSummary(actor)
    ]);

    const apps = this._buildAppTiles(actor, progressionSummary, upgradeSummary, holonetSummary);
    const actorData = this._buildActorData(actor);
    const lockScreenState = this._buildLockScreenState(actor);

    return {
      id: 'home',
      title: 'Holopad Home',
      actorName: actor?.name ?? '',
      actorImg: actorPortrait(actor),
      actorClass: actorData.classDisplay,
      actorSpecies: actorData.species,
      actorAffiliation: actorData.affiliation,
      classDisplay: actorData.classDisplay,
      species: actorData.species,
      affiliation: actorData.affiliation,
      deviceSerial: 'SN 7741-Δ-2206 · OS 4.7.2',
      deviceManu: 'CZERKA · DATAPAD MK-VII',
      alerts: holonetSummary.alerts,
      badges: holonetSummary.badges,
      quickGlance: this._enhanceQuickGlance(holonetSummary.quickGlance, actor),
      currentState: holonetSummary.currentState,
      commFeed: holonetSummary.commFeed,
      lastSession: holonetSummary.lastSession,
      lastSeenAgo: this._formatLastSeen(),
      stardate: this._formatStardate(),
      hpCurrent: actorData.hpCurrent,
      hpMax: actorData.hpMax,
      hpPercent: actorData.hpPercent,
      fpCurrent: actorData.fpCurrent,
      fpMax: actorData.fpMax,
      fpPercent: actorData.fpPercent,
      dt: actorData.dt,
      dtPercent: actorData.dtPercent,
      xpCurrent: actorData.xpCurrent,
      xpMax: actorData.xpMax,
      xpPercent: actorData.xpPercent,
      lockScreenEnabled: lockScreenState.enabled,
      lockHp: lockScreenState.hp,
      lockFp: lockScreenState.fp,
      lockCredits: lockScreenState.credits,
      apps
    };
  }

  static _getProgressionSummary(actor) {
    try {
      if (!actor) return this._progressionHidden();
      const supportedTypes = ['character', 'droid', 'npc'];
      if (!supportedTypes.includes(actor.type)) return this._progressionHidden();

      const isIncomplete = this._isChargenIncomplete(actor);
      const currentLevel = Math.max(1, Number(getTotalLevel(actor) || actor.system?.level || 1));
      const xpTotal = Number(actor.system?.xp?.total) || 0;
      const xpDerivedLevel = determineLevelFromXP(xpTotal);
      const levelsAvailable = Math.max(0, xpDerivedLevel - currentLevel);
      const isEpicBlocked = currentLevel >= 20;

      if (isIncomplete) {
        return {
          visible: true,
          enabled: true,
          routeId: 'chargen',
          badge: 'SETUP',
          description: 'Complete character creation'
        };
      }

      if (isEpicBlocked) {
        return {
          visible: true,
          enabled: false,
          routeId: 'progression',
          badge: 'MAX',
          description: 'Maximum level reached'
        };
      }

      return {
        visible: true,
        enabled: true,
        routeId: 'progression',
        badge: levelsAvailable > 0 ? String(levelsAvailable) : null,
        description: levelsAvailable > 0
          ? `Training available (${levelsAvailable})`
          : 'Level up or advance training'
      };
    } catch (err) {
      SWSELogger.warn('[HomeSurfaceService] Progression summary failed:', err);
      return this._progressionHidden();
    }
  }

  static async _getUpgradeSummary(actor) {
    try {
      if (!actor) return { visible: false, enabled: false, badge: null };
      const { UpgradeService } = await import('/systems/foundryvtt-swse/scripts/engine/upgrades/UpgradeService.js');
      const allRecords = UpgradeService.collectOwnedUpgradeRecords(actor);
      const applicable = UpgradeService.filterApplicableRecords(allRecords);
      if (applicable.length === 0) return { visible: false, enabled: false, badge: null };
      return {
        visible: true,
        enabled: true,
        badge: applicable.length > 0 ? String(applicable.length) : null
      };
    } catch (err) {
      SWSELogger.warn('[HomeSurfaceService] Upgrade summary failed:', err);
      return { visible: false, enabled: false, badge: null };
    }
  }

  static async _getHolonetSummary(actor) {
    try {
      const recipientId = currentRecipientId();
      const actorId = actor?.id ?? null;
      const [summary, feedRecords, featuredRecords, playerState, partyState, noticeCenter] = await Promise.all([
        recipientId ? HolonetEngine.getUnreadCountsForRecipient(recipientId, { bySourceFamily: true }) : Promise.resolve({ total: 0, messages: 0, transactions: 0, mentor: 0, approvals: 0 }),
        recipientId ? HolonetEngine.getFeedForRecipient(recipientId, SURFACE_TYPE.HOME_FEED, 6) : Promise.resolve([]),
        recipientId ? HolonetFeedService.getFeaturedItemsForRecipient(recipientId, SURFACE_TYPE.BULLETIN_FEATURED, 4) : Promise.resolve([]),
        actorId ? HolonetStateService.getPlayerState(actorId) : Promise.resolve(null),
        HolonetStateService.getPartyState(),
        HolonetNoticeCenterService.buildCenterVm({ actor, previewLimit: 3 })
      ]);

      const currentState = this._buildCurrentState(playerState, partyState);
      const commFeed = (feedRecords ?? []).map(record => this._mapFeedRecord(record, recipientId));
      const lastSessionRecord = this._pickFeaturedRecord(featuredRecords ?? []);
      const lastSession = lastSessionRecord ? this._mapFeedRecord(lastSessionRecord, recipientId, { featured: true }) : null;

      const currentLevel = Math.max(1, Number(getTotalLevel(actor) || actor?.system?.level || 1));
      const hpValue = asNumber(actor?.system?.hp?.value, asNumber(actor?.system?.hitPoints?.value, 0));
      const hpMax = asNumber(actor?.system?.hp?.max, asNumber(actor?.system?.hitPoints?.max, 0));
      const fpValue = asNumber(actor?.system?.forcePoints?.value, asNumber(actor?.system?.resources?.forcePoints?.value, 0));
      const credits = asNumber(actor?.system?.credits, 0);

      const alerts = {
        total: summary.total ?? 0,
        chips: this._buildAlertChips(summary)
      };

      return {
        alerts,
        badges: {
          messages: summary.messages > 0 ? String(summary.messages) : null,
          mentor: summary.mentor > 0 ? String(summary.mentor) : null
        },
        quickGlance: [
          {
            label: 'Level',
            value: String(currentLevel),
            tone: 'neutral'
          },
          {
            label: hpMax > 0 ? 'HP' : 'Credits',
            value: hpMax > 0 ? `${hpValue}/${hpMax}` : `${credits}`,
            tone: 'neutral'
          },
          {
            label: 'FP',
            value: String(fpValue),
            tone: fpValue > 0 ? 'accent' : 'neutral'
          },
          {
            label: 'Alerts',
            value: String(summary.total ?? 0),
            tone: (summary.total ?? 0) > 0 ? 'alert' : 'neutral'
          }
        ],
        currentState,
        commFeed,
        lastSession,
        notificationCenter: noticeCenter
      };
    } catch (err) {
      SWSELogger.warn('[HomeSurfaceService] Holonet summary failed:', err);
      return {
        alerts: { total: 0, chips: [] },
        badges: { messages: null, mentor: null },
        quickGlance: [],
        currentState: this._buildCurrentState(null, null),
        commFeed: [],
        lastSession: null,
        notificationCenter: { totalUnread: 0, chips: [], preview: [], notices: [], hasNotices: false }
      };
    }
  }

  static _buildAlertChips(summary = {}) {
    const chips = [];
    if (summary.messages > 0) chips.push({ key: 'messages', label: 'MSG', count: summary.messages });
    if (summary.transactions > 0) chips.push({ key: 'transactions', label: 'STORE', count: summary.transactions });
    if (summary.mentor > 0) chips.push({ key: 'mentor', label: 'MENTOR', count: summary.mentor });
    if (summary.approvals > 0 && game.user?.isGM) chips.push({ key: 'approvals', label: 'APPROVAL', count: summary.approvals });
    return chips;
  }

  static _buildCurrentState(playerState, partyState) {
    const location = playerState?.location || partyState?.location || 'Current location not set';
    const objective = playerState?.objective || partyState?.objective || 'No active objective';
    const situation = playerState?.situation || partyState?.situation || 'Awaiting new instructions.';
    const updatedAt = playerState?.updatedAt || partyState?.updatedAt || null;
    const updatedBy = playerState?.updatedBy || partyState?.updatedBy || null;
    return {
      location,
      objective,
      situation,
      updatedAt: formatTimestamp(updatedAt),
      updatedBy
    };
  }

  static _pickFeaturedRecord(records = []) {
    return [...records]
      .sort((a, b) => {
        const aPinned = a.projections?.some(p => p.surfaceType === SURFACE_TYPE.BULLETIN_FEATURED && p.isPinned) ? 1 : 0;
        const bPinned = b.projections?.some(p => p.surfaceType === SURFACE_TYPE.BULLETIN_FEATURED && p.isPinned) ? 1 : 0;
        if (aPinned !== bPinned) return bPinned - aPinned;
        return new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0);
      })[0] ?? null;
  }

  static _mapFeedRecord(record, recipientId, { featured = false } = {}) {
    const body = record?.body || '';
    return {
      id: record.id,
      threadId: record.threadId || null,
      title: record.title || categoryLabel(record),
      sender: sourceLabel(record),
      category: categoryLabel(record),
      icon: sourceIcon(record),
      preview: featured ? HolonetMarkupService.render(body) : HolonetMarkupService.preview(previewText(body, 150)),
      timestamp: formatTimestamp(record.publishedAt || record.createdAt),
      isUnread: recipientId ? Boolean(record.isUnreadBy?.(recipientId)) : false
    };
  }

  static _progressionHidden() {
    return { visible: false, enabled: false, routeId: 'progression', badge: null, description: '' };
  }

  static _isChargenIncomplete(actor) {
    const system = actor.system;
    if ((system?.level || 0) === 0) return true;
    if (!actor.name || actor.name.trim() === '' || actor.name === 'New Character') return true;
    if (!actor.items?.some(item => item.type === 'class')) return true;
    return false;
  }

  /**
   * Build app tiles with radial positioning, badge types, and state flags
   */
  static _buildAppTiles(actor, progressionSummary, upgradeSummary, holonetSummary) {
    // Radial layout: 7 tiles positioned at 360°/7 ≈ 51.43° intervals
    const tilePositions = [
      { left: 50.00, top: 8.00 },   // 0° - top
      { left: 82.84, top: 23.81 },  // 51.43° - upper right
      { left: 90.95, top: 59.35 },  // 102.86° - right
      { left: 68.22, top: 87.84 },  // 154.29° - lower right
      { left: 31.78, top: 87.84 },  // 205.71° - lower left
      { left: 9.05, top: 59.35 },   // 257.14° - left
      { left: 17.16, top: 23.81 }   // 308.57° - upper left
    ];

    const baseTiles = [
      {
        id: 'sheet',
        label: 'Character\nSheet',
        icon: '◇',
        routeId: 'sheet',
        visible: true,
        enabled: true,
        badge: null,
        badgeType: null,
        featured: true,
        locked: false,
        status: 'READY',
        statusTone: '',
        description: 'Character record'
      },
      {
        id: 'progression',
        label: 'Training',
        icon: '▲',
        routeId: progressionSummary.routeId,
        visible: progressionSummary.visible,
        enabled: progressionSummary.enabled,
        badge: progressionSummary.badge,
        badgeType: progressionSummary.badge === '+1' ? 'crit' : progressionSummary.badge ? 'info' : null,
        featured: false,
        locked: !progressionSummary.enabled && progressionSummary.visible,
        status: progressionSummary.badge ? 'LVL UP' : 'READY',
        statusTone: progressionSummary.badge ? 'warn' : '',
        description: progressionSummary.description
      },
      {
        id: 'workbench',
        label: 'Workbench',
        icon: '✦',
        routeId: 'upgrade',
        visible: upgradeSummary.visible,
        enabled: upgradeSummary.enabled,
        badge: upgradeSummary.badge,
        badgeType: upgradeSummary.badge ? 'info' : null,
        featured: false,
        locked: !upgradeSummary.enabled && upgradeSummary.visible,
        status: upgradeSummary.badge ? `${upgradeSummary.badge} ITEMS` : 'NONE',
        statusTone: upgradeSummary.badge ? 'warn' : '',
        description: 'Upgrade gear and equipment'
      },
      {
        id: 'store',
        label: 'Store',
        icon: '¤',
        routeId: 'store',
        visible: true,
        enabled: true,
        badge: null,
        badgeType: null,
        featured: false,
        locked: false,
        status: 'OPEN',
        statusTone: '',
        description: 'Browse and purchase equipment'
      },
      {
        id: 'ship',
        label: 'Ship',
        icon: '◈',
        routeId: 'ship',
        visible: true,
        enabled: false,
        badge: null,
        badgeType: null,
        featured: false,
        locked: true,
        status: 'LOCKED',
        statusTone: 'crit',
        description: 'Ship systems and status'
      },
      {
        id: 'companion',
        label: 'Droid\nCompanion',
        icon: '⬡',
        routeId: 'companion',
        visible: true,
        enabled: true,
        badge: null,
        badgeType: null,
        featured: false,
        locked: false,
        status: 'ACTIVE',
        statusTone: '',
        description: 'Companion status and upgrades'
      },
      {
        id: 'messages',
        label: 'Messages',
        icon: '✉',
        routeId: 'messenger',
        visible: true,
        enabled: true,
        badge: holonetSummary.badges.messages ? holonetSummary.badges.messages : null,
        badgeType: holonetSummary.badges.messages ? 'info' : null,
        featured: false,
        locked: false,
        status: 'READY',
        statusTone: holonetSummary.badges.messages ? 'warn' : '',
        description: 'Messages and communications'
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: '⚙',
        routeId: 'settings',
        visible: true,
        enabled: true,
        badge: null,
        badgeType: null,
        featured: false,
        locked: false,
        status: 'READY',
        statusTone: '',
        description: 'Datapad settings and preferences'
      },
      {
        id: 'faction',
        label: 'Faction',
        icon: '✺',
        routeId: 'faction',
        visible: false,
        enabled: true,
        badge: holonetSummary.badges.mentor ? '!' : null,
        badgeType: holonetSummary.badges.mentor ? 'jedi' : null,
        featured: false,
        locked: false,
        status: 'ACTIVE',
        statusTone: holonetSummary.badges.mentor ? 'warn' : '',
        description: 'Faction standings and ranks'
      }
    ];

    const visibleTiles = baseTiles.filter(tile => tile.visible !== false);
    return visibleTiles.map((tile, index) => ({
      ...tile,
      positionLeft: tilePositions[index]?.left ?? 50,
      positionTop: tilePositions[index]?.top ?? 50
    }));
  }

  /**
   * Build actor identity and derived data
   */
  static _buildActorData(actor) {
    if (!actor) {
      return {
        classDisplay: 'No Class',
        species: 'No Species',
        affiliation: 'Independent',
        hpCurrent: 0,
        hpMax: 0,
        hpPercent: 0,
        fpCurrent: 0,
        fpMax: 0,
        fpPercent: 0,
        dt: 0,
        dtPercent: 0,
        xpCurrent: 0,
        xpMax: 0,
        xpPercent: 0
      };
    }

    const classItem = actor.items?.find(item => item.type === 'class');
    const classDisplay = classItem?.name || 'No Class';
    const species = actor.system?.species || 'No Species';
    const affiliation = actor.system?.affiliation || 'Independent';

    const hpCurrent = asNumber(actor.system?.hp?.value, asNumber(actor.system?.hitPoints?.value, 0));
    const hpMax = asNumber(actor.system?.hp?.max, asNumber(actor.system?.hitPoints?.max, 42));
    const hpPercent = hpMax > 0 ? Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100)) : 0;

    const fpCurrent = asNumber(actor.system?.forcePoints?.value, asNumber(actor.system?.resources?.forcePoints?.value, 0));
    const fpMax = asNumber(actor.system?.forcePoints?.max, asNumber(actor.system?.resources?.forcePoints?.max, 5));
    const fpPercent = fpMax > 0 ? Math.max(0, Math.min(100, (fpCurrent / fpMax) * 100)) : 0;

    const dt = asNumber(actor.system?.defenseStats?.physicalDefense, asNumber(actor.system?.dt, 0));
    const dtMax = 30; // Reasonable max for DT
    const dtPercent = Math.max(0, Math.min(100, (dt / dtMax) * 100));

    const xpCurrent = asNumber(actor.system?.xp?.value, asNumber(actor.system?.xp?.current, 0));
    const xpMax = asNumber(actor.system?.xp?.total, asNumber(actor.system?.xp?.experience, 10000));
    const xpPercent = xpMax > 0 ? Math.max(0, Math.min(100, (xpCurrent / xpMax) * 100)) : 0;

    return {
      classDisplay,
      species,
      affiliation,
      hpCurrent,
      hpMax,
      hpPercent,
      fpCurrent,
      fpMax,
      fpPercent,
      dt,
      dtPercent,
      xpCurrent,
      xpMax,
      xpPercent
    };
  }

  /**
   * Enhance quick-glance items with tone classes for coloring
   */
  static _enhanceQuickGlance(quickGlance, actor) {
    if (!Array.isArray(quickGlance)) return [];
    return quickGlance.map(item => ({
      ...item,
      tone: this._getToneCss(item.tone)
    }));
  }

  /**
   * Map tone names to CSS classes
   */
  static _getToneCss(tone) {
    const toneMap = {
      'accent': 'cyan',
      'alert': 'neg',
      'neutral': 'ink',
      'positive': 'pos',
      'negative': 'neg',
      'cyan': 'cyan',
      'pink': 'pink',
      'pos': 'pos',
      'neg': 'neg'
    };
    return toneMap[tone] || 'ink';
  }

  /**
   * Build lock screen state
   */
  static _buildLockScreenState(actor) {
    if (!actor) {
      return {
        enabled: false,
        hp: '0 / 0',
        fp: '0',
        credits: '0'
      };
    }

    const hpValue = asNumber(actor.system?.hp?.value, asNumber(actor.system?.hitPoints?.value, 0));
    const hpMax = asNumber(actor.system?.hp?.max, asNumber(actor.system?.hitPoints?.max, 42));
    const fpValue = asNumber(actor.system?.forcePoints?.value, asNumber(actor.system?.resources?.forcePoints?.value, 5));
    const credits = asNumber(actor.system?.credits, 0);

    return {
      enabled: false, // Lock screen default-off per user requirement
      hp: `${hpValue} / ${hpMax}`,
      fp: String(fpValue),
      credits: `${credits.toLocaleString()}`
    };
  }

  /**
   * Format time since last login/access
   */
  static _formatLastSeen() {
    const now = new Date();
    const pastHour = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    const diffMs = now - pastHour;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours > 0) {
      return `${diffHours}${diffMins > 0 ? ':' + String(diffMins).padStart(2, '0') : ''} ago`;
    }
    return `${diffMins} min ago`;
  }

  /**
   * Format game stardate (fictional timestamp)
   */
  static _formatStardate() {
    const baseDate = new Date(2025, 0, 1); // Anchor point
    const now = new Date();
    const dayOfYear = Math.floor((now - baseDate) / (1000 * 60 * 60 * 24));
    return `35:${(dayOfYear + 200).toString().padStart(3, '0')}.4`;
  }
}
