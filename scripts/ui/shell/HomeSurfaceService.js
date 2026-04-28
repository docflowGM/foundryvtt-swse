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

    return {
      id: 'home',
      title: 'Holopad Home',
      actorName: actor?.name ?? '',
      actorImg: actorPortrait(actor),
      alerts: holonetSummary.alerts,
      badges: holonetSummary.badges,
      quickGlance: holonetSummary.quickGlance,
      currentState: holonetSummary.currentState,
      commFeed: holonetSummary.commFeed,
      lastSession: holonetSummary.lastSession,
      apps: [
        {
          id: 'sheet',
          label: 'Character',
          icon: '◇',
          routeId: 'sheet',
          visible: true,
          enabled: true,
          badge: null,
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
          description: progressionSummary.description
        },
        {
          id: 'messenger',
          label: 'Messenger',
          icon: '✉',
          routeId: 'messenger',
          visible: true,
          enabled: true,
          badge: holonetSummary.badges.messages,
          description: 'Private threads and updates'
        },
        {
          id: 'mentor',
          label: 'Chat with Mentor',
          icon: '✶',
          routeId: 'mentor',
          visible: supportedTypesForMentor(actor),
          enabled: true,
          badge: holonetSummary.badges.mentor,
          description: 'Seek guidance and planning advice'
        },
        {
          id: 'upgrade',
          label: 'Workbench',
          icon: '✦',
          routeId: 'upgrade',
          visible: upgradeSummary.visible,
          enabled: upgradeSummary.enabled,
          badge: upgradeSummary.badge,
          description: 'Upgrade gear and equipment'
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: '⚙',
          routeId: 'settings',
          visible: true,
          enabled: true,
          badge: null,
          description: 'Theme and interface options'
        }
      ]
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
}
