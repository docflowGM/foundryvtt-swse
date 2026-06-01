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
import { ThemeResolutionService } from '/systems/foundryvtt-swse/scripts/ui/theme/theme-resolution-service.js';

function supportedTypesForMentor(actor) {
  return ['character', 'droid', 'npc'].includes(actor?.type);
}

function currentRecipientId() {
  if (!game.user) return null;
  return game.user.isGM ? `gm:${game.user.id}` : `player:${game.user.id}`;
}

function uniqueStrings(values = []) {
  return [...new Set(values.map(value => String(value || '').trim()).filter(Boolean))];
}

function playerRecipientIdForUser(user) {
  if (!user || user.isGM) return null;
  return `player:${user.id}`;
}

function actorOwnerRecipientIds(actor) {
  const ids = [];
  if (!actor) return ids;

  for (const user of Array.from(game.users ?? [])) {
    if (!user || user.isGM) continue;
    if (user.character?.id === actor.id) ids.push(playerRecipientIdForUser(user));
  }

  const ownership = actor.ownership ?? actor._source?.ownership ?? {};
  for (const [userId, level] of Object.entries(ownership)) {
    if (!userId || userId === 'default') continue;
    const user = game.users?.get?.(userId);
    if (!user || user.isGM) continue;
    if (Number(level) >= 2) ids.push(playerRecipientIdForUser(user));
  }

  return uniqueStrings(ids);
}

function asNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}


function asArray(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (value instanceof Map) return Array.from(value.values());
  if (Array.isArray(value.contents)) return value.contents;
  if (typeof value !== 'string' && typeof value[Symbol.iterator] === 'function') {
    return Array.from(value);
  }
  if (typeof value === 'object') return Object.values(value);
  return [];
}

function hasEntries(value) {
  return asArray(value).filter(Boolean).length > 0;
}

function relationshipMatchesType(relationship, acceptedTypes = []) {
  const type = String(
    relationship?.type
    ?? relationship?.actorType
    ?? relationship?.documentType
    ?? relationship?.kind
    ?? ''
  ).toLowerCase();
  return acceptedTypes.includes(type);
}

function ownedItemMatchesType(item, acceptedTypes = []) {
  const type = String(item?.type ?? '').toLowerCase();
  return acceptedTypes.includes(type);
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

function isVehicleActor(actor) {
  return actor?.type === 'vehicle';
}

function isDroidActor(actor) {
  return actor?.type === 'droid' || actor?.system?.isDroid === true;
}

function droidDegreeLabel(actor) {
  const system = actor?.system ?? {};
  const degree = system.droidDegree
    ?? system.droid?.degree
    ?? system.droidSystems?.degree
    ?? system.droidSystems?.droidDegree
    ?? system.droidSystems?.classification
    ?? null;
  if (!degree) return 'Droid Chassis';
  return String(degree).replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function droidSizeLabel(actor) {
  const system = actor?.system ?? {};
  const size = system.droidSize
    ?? system.droid?.size
    ?? system.droidSystems?.size
    ?? system.droidSystems?.droidSize
    ?? system.size
    ?? null;
  if (!size) return null;
  return String(size).replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}


function vehicleSystemLabel(actor) {
  const system = actor?.system ?? {};
  return String(
    system.model
    ?? system.vehicleModel
    ?? system.frame
    ?? system.size
    ?? system.class
    ?? 'Vehicle'
  );
}

function vehicleRoleLabel(actor) {
  const system = actor?.system ?? {};
  return String(
    system.vehicleType
    ?? system.type
    ?? system.role
    ?? system.category
    ?? 'Starship'
  );
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
    const [progressionSummary, upgradeSummary, holonetSummary, alliesSummary] = await Promise.all([
      this._getProgressionSummary(actor),
      this._getUpgradeSummary(actor),
      this._getHolonetSummary(actor),
      this._getAlliesSummary(actor)
    ]);

    const apps = this._buildAppTiles(actor, progressionSummary, upgradeSummary, holonetSummary, alliesSummary);
    const actorData = this._buildActorData(actor);
    const lockScreenState = this._buildLockScreenState(actor);

    const localFeed = this._buildLocalCommFeed(actor, progressionSummary, upgradeSummary, alliesSummary);
    const commFeed = this._mergeCommFeed(localFeed, holonetSummary.commFeed);
    const alerts = this._mergeLocalAlerts(holonetSummary.alerts, localFeed);

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
      alerts,
      badges: holonetSummary.badges,
      quickGlance: this._enhanceQuickGlance(holonetSummary.quickGlance, actor),
      currentState: holonetSummary.currentState,
      commFeed,
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
      sheetTheme: ThemeResolutionService.resolveThemeKey(null, { actor }),
      sheetMotionStyle: ThemeResolutionService.resolveMotionStyle(null, { actor }),
      actorType: actor?.type ?? '',
      isVehicleHome: isVehicleActor(actor),
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
      const { ItemCustomizationWorkbench } = await import('/systems/foundryvtt-swse/scripts/apps/customization/item-customization-workbench.js');
      const customizable = Array.from(actor.items ?? []).filter(item => ItemCustomizationWorkbench.supportsItem(item));
      if (customizable.length === 0) return { visible: false, enabled: false, badge: null };
      return {
        visible: true,
        enabled: true,
        badge: customizable.length > 0 ? String(customizable.length) : null
      };
    } catch (err) {
      SWSELogger.warn('[HomeSurfaceService] Workbench summary failed:', err);
      return { visible: false, enabled: false, badge: null };
    }
  }

  static async _getAlliesSummary(actor) {
    try {
      const { AlliesSurfaceService } = await import(
        '/systems/foundryvtt-swse/scripts/ui/shell/AlliesSurfaceService.js'
      );
      return await AlliesSurfaceService.buildSummary(actor);
    } catch (err) {
      SWSELogger.warn('[HomeSurfaceService] Allies summary failed:', err);
      return { total: 0, companions: 0, factions: 0, bases: 0, organizations: 0, pending: 0 };
    }
  }

  static async _getHolonetSummary(actor) {
    try {
      const recipientIds = this._homeRecipientIds(actor);
      const actorId = actor?.id ?? null;
      const [summary, feedRecords, featuredRecords, playerState, partyState, noticeCenter] = await Promise.all([
        recipientIds.length ? this._getUnreadSummaryForRecipients(recipientIds) : Promise.resolve({ total: 0, messages: 0, transactions: 0, mentor: 0, approvals: 0 }),
        recipientIds.length ? this._getFeedForRecipients(recipientIds, SURFACE_TYPE.HOME_FEED, 6) : Promise.resolve([]),
        recipientIds.length ? this._getFeaturedForRecipients(recipientIds, SURFACE_TYPE.BULLETIN_FEATURED, 4) : Promise.resolve([]),
        actorId ? HolonetStateService.getPlayerState(actorId) : Promise.resolve(null),
        HolonetStateService.getPartyState(),
        HolonetNoticeCenterService.buildCenterVm({ actor, previewLimit: 3 })
      ]);

      const currentState = this._buildCurrentState(playerState, partyState);
      const commFeed = (feedRecords ?? []).map(record => this._mapFeedRecord(record, recipientIds));
      const lastSessionRecord = this._pickFeaturedRecord(featuredRecords ?? []);
      const lastSession = lastSessionRecord ? this._mapFeedRecord(lastSessionRecord, recipientIds, { featured: true }) : null;

      const currentLevel = Math.max(1, Number(getTotalLevel(actor) || actor?.system?.level || 1));
      const hpValue = asNumber(actor?.system?.hp?.value, asNumber(actor?.system?.hitPoints?.value, asNumber(actor?.system?.hull?.value, 0)));
      const hpMax = asNumber(actor?.system?.hp?.max, asNumber(actor?.system?.hitPoints?.max, asNumber(actor?.system?.hull?.max, 0)));
      const fpValue = asNumber(actor?.system?.forcePoints?.value, asNumber(actor?.system?.resources?.forcePoints?.value, 0));
      const credits = asNumber(actor?.system?.credits, 0);
      const vehicleShieldValue = asNumber(actor?.system?.shields?.value, asNumber(actor?.system?.shield?.value, 0));
      const vehicleShieldMax = asNumber(actor?.system?.shields?.max, asNumber(actor?.system?.shield?.max, 0));
      const vehicleCrew = asNumber(actor?.system?.crew?.current, asNumber(actor?.system?.crew?.value, asNumber(actor?.system?.crew, 0)));
      const vehicleQuickGlance = isVehicleActor(actor);

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
        quickGlance: vehicleQuickGlance ? [
          {
            label: 'Hull',
            value: hpMax > 0 ? `${hpValue}/${hpMax}` : '—',
            tone: hpValue > 0 ? 'neutral' : 'alert'
          },
          {
            label: 'Shields',
            value: vehicleShieldMax > 0 ? `${vehicleShieldValue}/${vehicleShieldMax}` : String(vehicleShieldValue || 0),
            tone: vehicleShieldValue > 0 ? 'accent' : 'neutral'
          },
          {
            label: 'Crew',
            value: vehicleCrew > 0 ? String(vehicleCrew) : '—',
            tone: 'neutral'
          },
          {
            label: 'Alerts',
            value: String(summary.total ?? 0),
            tone: (summary.total ?? 0) > 0 ? 'alert' : 'neutral'
          }
        ] : [
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


  static _homeRecipientIds(actor) {
    const ids = [];
    if (game.user?.isGM) ids.push(...actorOwnerRecipientIds(actor));
    ids.push(currentRecipientId());
    return uniqueStrings(ids);
  }

  static async _getUnreadSummaryForRecipients(recipientIds = []) {
    const summaries = await Promise.all(uniqueStrings(recipientIds).map(id => (
      HolonetEngine.getUnreadCountsForRecipient(id, { bySourceFamily: true })
        .catch(() => ({ total: 0, messages: 0, notifications: 0, events: 0, requests: 0, transactions: 0, approvals: 0, mentor: 0, bySourceFamily: {} }))
    )));

    return summaries.reduce((acc, summary) => {
      for (const key of ['total', 'messages', 'notifications', 'events', 'requests', 'transactions', 'approvals', 'mentor']) {
        acc[key] = Number(acc[key] || 0) + Number(summary?.[key] || 0);
      }
      acc.bySourceFamily ??= {};
      for (const [family, count] of Object.entries(summary?.bySourceFamily ?? {})) {
        acc.bySourceFamily[family] = Number(acc.bySourceFamily[family] || 0) + Number(count || 0);
      }
      return acc;
    }, { total: 0, messages: 0, notifications: 0, events: 0, requests: 0, transactions: 0, approvals: 0, mentor: 0, bySourceFamily: {} });
  }

  static async _getFeedForRecipients(recipientIds = [], surfaceType = SURFACE_TYPE.HOME_FEED, limit = 6) {
    const records = [];
    for (const recipientId of uniqueStrings(recipientIds)) {
      const feed = await HolonetEngine.getFeedForRecipient(recipientId, surfaceType, limit).catch(() => []);
      records.push(...(feed || []));
    }
    return this._dedupeAndSortRecords(records).slice(0, limit);
  }

  static async _getFeaturedForRecipients(recipientIds = [], surfaceType = SURFACE_TYPE.BULLETIN_FEATURED, limit = 4) {
    const records = [];
    for (const recipientId of uniqueStrings(recipientIds)) {
      const feed = await HolonetFeedService.getFeaturedItemsForRecipient(recipientId, surfaceType, limit).catch(() => []);
      records.push(...(feed || []));
    }
    return this._dedupeAndSortRecords(records).slice(0, limit);
  }

  static _dedupeAndSortRecords(records = []) {
    const byId = new Map();
    for (const record of records || []) {
      if (!record?.id) continue;
      if (!byId.has(record.id)) byId.set(record.id, record);
    }
    return [...byId.values()].sort((a, b) => new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0));
  }


  static _buildLocalCommFeed(actor, progressionSummary = {}, upgradeSummary = {}, alliesSummary = {}) {
    const nowLabel = 'live';
    const entries = [];

    if (progressionSummary.visible && progressionSummary.enabled && (progressionSummary.badge || progressionSummary.routeId === 'chargen')) {
      const isSetup = progressionSummary.routeId === 'chargen';
      entries.push({
        id: 'local-progression',
        routeId: progressionSummary.routeId || 'progression',
        title: isSetup ? 'Character setup available' : 'Training available',
        sender: 'Datapad',
        category: 'TASK',
        icon: '▲',
        preview: progressionSummary.description || (isSetup ? 'Complete character creation.' : 'A level-up or training step is available.'),
        timestamp: nowLabel,
        priority: 'normal',
        isUnread: true
      });
    }

    if (upgradeSummary.visible && upgradeSummary.enabled && upgradeSummary.badge) {
      entries.push({
        id: 'local-workbench',
        routeId: 'workbench',
        title: 'Workbench upgrades available',
        sender: 'Workbench',
        category: 'TASK',
        icon: '✦',
        preview: `${upgradeSummary.badge} item${String(upgradeSummary.badge) === '1' ? '' : 's'} can be upgraded or modified.`,
        timestamp: nowLabel,
        priority: 'normal',
        isUnread: true
      });
    }

    const openAllies = Number(alliesSummary.openSlots ?? alliesSummary.pending ?? 0);
    if (openAllies > 0) {
      entries.push({
        id: 'local-allies',
        routeId: 'allies',
        title: 'Allies slot open',
        sender: 'Allies',
        category: 'TASK',
        icon: '✹',
        preview: `${openAllies} companion slot${openAllies === 1 ? '' : 's'} can be filled from the Allies app.`,
        timestamp: nowLabel,
        priority: 'normal',
        isUnread: true
      });
    }

    return entries;
  }

  static _mergeCommFeed(localFeed = [], holonetFeed = []) {
    const merged = [];
    const seen = new Set();
    for (const entry of [...localFeed, ...(holonetFeed || [])]) {
      if (!entry?.id || seen.has(entry.id)) continue;
      seen.add(entry.id);
      merged.push(entry);
    }
    return merged.slice(0, 6);
  }

  static _mergeLocalAlerts(alerts = {}, localFeed = []) {
    const localCount = (localFeed || []).filter(entry => entry?.isUnread).length;
    if (!localCount) return alerts;
    const chips = [...(alerts?.chips || [])];
    chips.push({ key: 'local-tasks', label: 'TASK', count: localCount });
    return {
      ...alerts,
      total: Number(alerts?.total || 0) + localCount,
      chips
    };
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

  static _mapFeedRecord(record, recipientIds, { featured = false } = {}) {
    const body = record?.body || '';
    return {
      id: record.id,
      recordId: record.id,
      threadId: record.threadId || null,
      title: record.title || categoryLabel(record),
      sender: sourceLabel(record),
      category: categoryLabel(record),
      icon: sourceIcon(record),
      preview: featured ? HolonetMarkupService.render(body) : HolonetMarkupService.preview(previewText(body, 150)),
      timestamp: formatTimestamp(record.publishedAt || record.createdAt),
      imageUrl: record.metadata?.imageUrl || record.sender?.avatar || '',
      priority: record.priority || record.metadata?.priority || 'normal',
      isBreakingNews: record.metadata?.breakingNews === true,
      isUrgent: record.metadata?.breakingNews === true || record.metadata?.urgent === true || record.priority === 'critical',
      isUnread: uniqueStrings(Array.isArray(recipientIds) ? recipientIds : [recipientIds]).some(id => Boolean(record.isUnreadBy?.(id)))
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

  static _withTilePositions(tiles) {
    const visibleTiles = tiles.filter(tile => tile.visible !== false);
    const tilePositions = this._buildRadialTilePositions(visibleTiles.length);

    return visibleTiles.map((tile, index) => ({
      ...tile,
      positionLeft: tilePositions[index]?.left ?? 50,
      positionTop: tilePositions[index]?.top ?? 50
    }));
  }

  static _buildVehicleAppTiles(actor, holonetSummary) {
    const hullValue = asNumber(actor?.system?.hull?.value, asNumber(actor?.system?.hp?.value, 0));
    const hullMax = asNumber(actor?.system?.hull?.max, asNumber(actor?.system?.hp?.max, 0));
    const shieldValue = asNumber(actor?.system?.shields?.value, asNumber(actor?.system?.shield?.value, 0));
    const cargoItems = asArray(actor?.items).filter(item => String(item?.type ?? '').toLowerCase() === 'equipment');
    const crewEntries = asArray(actor?.system?.crew?.members ?? actor?.system?.crewMembers ?? actor?.system?.ownedActors);

    return this._withTilePositions([
      {
        id: 'sheet',
        label: 'Vehicle\nSheet',
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
        description: 'Vehicle command record'
      },
      {
        id: 'shipyard',
        label: 'Shipyard',
        icon: '◈',
        routeId: 'customization',
        bayMode: 'shipyard',
        contextMode: 'modifyExisting',
        visible: true,
        enabled: true,
        badge: null,
        badgeType: null,
        featured: false,
        locked: false,
        status: 'ONLINE',
        statusTone: '',
        description: 'Modify hull, systems, and components'
      },
      {
        id: 'abilities',
        label: 'Abilities',
        icon: '◆',
        routeId: 'sheet',
        tab: 'abilities',
        visible: true,
        enabled: true,
        badge: null,
        badgeType: null,
        featured: false,
        locked: false,
        status: 'ONLINE',
        statusTone: '',
        description: 'Open the vehicle ability matrix'
      },
      {
        id: 'weapons',
        label: 'Weapons',
        icon: '✦',
        routeId: 'sheet',
        tab: 'weapons',
        visible: true,
        enabled: true,
        badge: null,
        badgeType: null,
        featured: false,
        locked: false,
        status: 'ARMED',
        statusTone: '',
        description: 'Open the vehicle weapons station'
      },
      {
        id: 'crew',
        label: 'Crew',
        icon: '✹',
        routeId: 'sheet',
        tab: 'crew',
        visible: true,
        enabled: true,
        badge: crewEntries.length > 0 ? String(crewEntries.length) : null,
        badgeType: crewEntries.length > 0 ? 'info' : null,
        featured: false,
        locked: false,
        status: crewEntries.length > 0 ? `${crewEntries.length} CREW` : 'OPEN',
        statusTone: '',
        description: 'Open the crew manifest'
      },
      {
        id: 'systems',
        label: 'Systems',
        icon: '⬡',
        routeId: 'sheet',
        tab: 'systems',
        visible: true,
        enabled: true,
        badge: shieldValue > 0 ? 'SHD' : null,
        badgeType: shieldValue > 0 ? 'info' : null,
        featured: false,
        locked: false,
        status: hullMax > 0 && hullValue <= 0 ? 'CRITICAL' : 'READY',
        statusTone: hullMax > 0 && hullValue <= 0 ? 'warn' : '',
        description: 'Open shields, power, and subsystems'
      },
      {
        id: 'cargo',
        label: 'Cargo',
        icon: '▣',
        routeId: 'sheet',
        tab: 'cargo',
        visible: true,
        enabled: true,
        badge: cargoItems.length > 0 ? String(cargoItems.length) : null,
        badgeType: cargoItems.length > 0 ? 'info' : null,
        featured: false,
        locked: false,
        status: cargoItems.length > 0 ? `${cargoItems.length} ITEMS` : 'EMPTY',
        statusTone: '',
        description: 'Open cargo manifest'
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
        description: 'Browse and purchase vehicle gear'
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
      }
    ]);
  }

  /**
   * Build app tiles with radial positioning, badge types, and state flags
   */
  static _buildAppTiles(actor, progressionSummary, upgradeSummary, holonetSummary, alliesSummary = {}) {
    if (isVehicleActor(actor)) return this._buildVehicleAppTiles(actor, holonetSummary);
    const assetSummary = this._getOwnedAssetSummary(actor);
    const gamesEnabled = (() => {
      try {
        return game.settings?.get?.('foundryvtt-swse', 'gamesEnabled') !== false;
      } catch {
        return true;
      }
    })();
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
        routeId: 'workbench',
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
        id: 'games',
        label: 'Games',
        icon: '⬟',
        routeId: 'games',
        visible: gamesEnabled,
        enabled: gamesEnabled,
        badge: null,
        badgeType: null,
        featured: false,
        locked: !gamesEnabled,
        status: gamesEnabled ? 'READY' : 'DISABLED',
        statusTone: gamesEnabled ? '' : 'warn',
        description: 'Pazaak, Sabacc, Dejarik, and Hintaro tables'
      },
      {
        id: 'ship',
        label: 'Shipyard',
        icon: '◈',
        routeId: 'asset-bay',
        bayMode: 'shipyard',
        contextMode: 'modifyExisting',
        visible: assetSummary.vehicleCount > 0,
        enabled: assetSummary.vehicleCount > 0,
        badge: assetSummary.vehicleCount > 1 ? String(assetSummary.vehicleCount) : null,
        badgeType: assetSummary.vehicleCount > 1 ? 'info' : null,
        featured: false,
        locked: false,
        status: assetSummary.vehicleCount > 1 ? `${assetSummary.vehicleCount} SHIPS` : 'READY',
        statusTone: '',
        description: 'Owned ship control point'
      },
      {
        id: 'garage',
        label: 'Garage',
        icon: '⬡',
        routeId: 'asset-bay',
        bayMode: 'garage',
        contextMode: 'modifyExisting',
        visible: assetSummary.droidCount > 0,
        enabled: assetSummary.droidCount > 0,
        badge: assetSummary.droidCount > 1 ? String(assetSummary.droidCount) : null,
        badgeType: assetSummary.droidCount > 1 ? 'info' : null,
        featured: false,
        locked: false,
        status: assetSummary.droidCount > 1 ? `${assetSummary.droidCount} UNITS` : 'READY',
        statusTone: '',
        description: 'Owned droid control point'
      },
      {
        id: 'allies',
        label: 'Allies',
        icon: '✹',
        routeId: 'allies',
        visible: true,
        enabled: true,
        badge: alliesSummary.pending > 0 ? String(alliesSummary.pending) : (alliesSummary.total > 0 ? String(alliesSummary.total) : null),
        badgeType: alliesSummary.pending > 0 ? 'crit' : (alliesSummary.total > 0 ? 'info' : null),
        featured: false,
        locked: false,
        status: alliesSummary.pending > 0 ? 'PENDING' : 'READY',
        statusTone: alliesSummary.pending > 0 ? 'warn' : '',
        description: 'Followers, minions, factions, bases, and organizations'
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

    return this._withTilePositions(baseTiles);
  }


  /**
   * Resolve whether the actor actually owns or has linked droid/vehicle assets.
   * These launchers should not be accessible by default on a fresh character;
   * they appear only when the actor has an attached asset from purchase hooks,
   * embedded inventory, or relationship links.
   */
  static _getOwnedAssetSummary(actor) {
    if (!actor) return { droidCount: 0, vehicleCount: 0 };

    const system = actor.system ?? {};
    const relationships = asArray(system.relationships);
    const items = asArray(actor.items);

    const ownedActorLinks = asArray(system.ownedActors);
    const droidRefs = [
      ...ownedActorLinks.filter(entry => relationshipMatchesType(entry, ['droid']) || game.actors?.get?.(String(entry?.id ?? entry?.actorId ?? '').replace(/^Actor\./, ''))?.type === 'droid'),
      ...asArray(system.droids),
      ...asArray(system.assets?.droids),
      ...asArray(system.inventory?.droids),
      ...relationships.filter(rel => relationshipMatchesType(rel, ['droid'])),
      ...items.filter(item => ownedItemMatchesType(item, ['droid']))
    ];

    const vehicleRefs = [
      ...ownedActorLinks.filter(entry => relationshipMatchesType(entry, ['vehicle', 'ship', 'starship']) || game.actors?.get?.(String(entry?.id ?? entry?.actorId ?? '').replace(/^Actor\./, ''))?.type === 'vehicle'),
      ...asArray(system.vehicles),
      ...asArray(system.ships),
      ...asArray(system.assets?.vehicles),
      ...asArray(system.assets?.ships),
      ...asArray(system.inventory?.vehicles),
      ...asArray(system.inventory?.ships),
      ...relationships.filter(rel => relationshipMatchesType(rel, ['vehicle', 'ship', 'starship'])),
      ...items.filter(item => ownedItemMatchesType(item, ['vehicle', 'ship', 'starship']))
    ];

    return {
      droidCount: droidRefs.filter(Boolean).length,
      vehicleCount: vehicleRefs.filter(Boolean).length,
      hasDroids: hasEntries(droidRefs),
      hasVehicles: hasEntries(vehicleRefs)
    };
  }

  /**
   * Build evenly spaced positions for only the visible home-orbit tiles.
   * Hidden ship/droid/faction tiles should not leave gaps around the disc.
   */
  static _buildRadialTilePositions(count) {
    if (count <= 0) return [];

    const radius = count <= 4 ? 39 : 42;
    const startDeg = -90;

    return Array.from({ length: count }, (_unused, index) => {
      const angle = (startDeg + (360 / count) * index) * (Math.PI / 180);
      return {
        left: Number((50 + Math.cos(angle) * radius).toFixed(2)),
        top: Number((50 + Math.sin(angle) * radius).toFixed(2))
      };
    });
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

    if (isVehicleActor(actor)) {
      const classDisplay = vehicleSystemLabel(actor);
      const species = vehicleRoleLabel(actor);
      const affiliation = actor.system?.manufacturer || actor.system?.owner || actor.system?.affiliation || 'Independent Vessel';
      const hpCurrent = asNumber(actor.system?.hull?.value, asNumber(actor.system?.hp?.value, asNumber(actor.system?.hitPoints?.value, 0)));
      const hpMax = asNumber(actor.system?.hull?.max, asNumber(actor.system?.hp?.max, asNumber(actor.system?.hitPoints?.max, 0)));
      const hpPercent = hpMax > 0 ? Math.max(0, Math.min(100, (hpCurrent / hpMax) * 100)) : 0;
      const fpCurrent = asNumber(actor.system?.shields?.value, asNumber(actor.system?.shield?.value, 0));
      const fpMax = asNumber(actor.system?.shields?.max, asNumber(actor.system?.shield?.max, 0));
      const fpPercent = fpMax > 0 ? Math.max(0, Math.min(100, (fpCurrent / fpMax) * 100)) : 0;
      const dt = asNumber(actor.system?.damageThreshold, asNumber(actor.system?.derived?.damageThreshold, asNumber(actor.system?.dt, 0)));
      const dtPercent = Math.max(0, Math.min(100, (dt / 100) * 100));
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
        xpCurrent: 0,
        xpMax: 0,
        xpPercent: 0
      };
    }

    const classItem = actor.items?.find(item => item.type === 'class');
    const isDroid = isDroidActor(actor);
    const classDisplay = classItem?.name || 'No Class';
    const droidSize = isDroid ? droidSizeLabel(actor) : null;
    const species = isDroid
      ? [droidDegreeLabel(actor), droidSize].filter(Boolean).join(' · ')
      : (actor.system?.species || 'No Species');
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

    const hpValue = asNumber(actor.system?.hp?.value, asNumber(actor.system?.hitPoints?.value, asNumber(actor.system?.hull?.value, 0)));
    const hpMax = asNumber(actor.system?.hp?.max, asNumber(actor.system?.hitPoints?.max, asNumber(actor.system?.hull?.max, 42)));
    const fpValue = isVehicleActor(actor)
      ? asNumber(actor.system?.shields?.value, asNumber(actor.system?.shield?.value, 0))
      : asNumber(actor.system?.forcePoints?.value, asNumber(actor.system?.resources?.forcePoints?.value, 5));
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
