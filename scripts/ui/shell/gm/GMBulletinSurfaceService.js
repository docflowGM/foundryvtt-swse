/** GM bulletin / Holonet command surface view-model. */

import { HolonetStorage } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js';
import { HolonetStateService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-state-service.js';
import { SOURCE_FAMILY, DELIVERY_STATE, AUDIENCE_TYPE, INTENT_TYPE } from '/systems/foundryvtt-swse/scripts/holonet/contracts/enums.js';
import { HolonetMarkupService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-markup-service.js';
import { HolonewsGenerator } from '/systems/foundryvtt-swse/scripts/holonet/data/holonews-seed-events.js';
import { HolonewsAutoPublisher } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonews-auto-publisher.js';
import { BulletinContactRegistry } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/bulletin-contact-registry.js';
import { HolonewsAtomPolicy } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonews-atom-policy.js';

export class GMBulletinSurfaceService {
  static async buildViewModel(host) {
    const records = (await HolonetStorage.getAllRecords())
      .filter((record) => record.sourceFamily === SOURCE_FAMILY.BULLETIN)
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    const eventRecords = records.filter((record) => record.intent === INTENT_TYPE.BULLETIN_EVENT || record.metadata?.bulletinKind === 'event');
    const messageRecords = records.filter((record) => record.intent === INTENT_TYPE.BULLETIN_MESSAGE || record.metadata?.bulletinKind === 'message');
    const bulletinPlayers = host._getBulletinPlayers();
    const selectedPlayerId = host.selectedPlayerStateActorId || bulletinPlayers[0]?.actorId || null;
    const selectedPlayerState = selectedPlayerId ? await HolonetStateService.getPlayerState(selectedPlayerId) : null;
    const partyState = await HolonetStateService.getPartyState();
    const selectedPreviewUserId = host.selectedBulletinPreviewUserId || bulletinPlayers[0]?.userId || null;
    const selectedPreviewPlayer = bulletinPlayers.find((player) => player.userId === selectedPreviewUserId) || bulletinPlayers[0] || null;
    const selectedPreviewState = selectedPreviewPlayer?.actorId ? await HolonetStateService.getPlayerState(selectedPreviewPlayer.actorId) : selectedPlayerState;
    const bulletinContacts = (await BulletinContactRegistry.getAll()).map((contact) => BulletinContactRegistry.toView(contact));
    const holonewsAtomPolicy = await HolonewsAtomPolicy.getPolicy();
    const atomFilters = HolonewsAtomPolicy.toGeneratorFilters(holonewsAtomPolicy);

    const allEventViews = eventRecords.map((record) => host._buildBulletinRecordView(record));
    const eventViews = allEventViews.filter((record) => !record.isHolonews);
    const holonewsViews = allEventViews.filter((record) => record.isHolonews);
    const messageViews = messageRecords.map((record) => host._buildBulletinRecordView(record));
    const holonewsArchiveFilters = {
      query: String(host.holonewsArchiveFilters?.query || '').trim(),
      state: host.holonewsArchiveFilters?.state || '',
      type: host.holonewsArchiveFilters?.type || '',
      priority: host.holonewsArchiveFilters?.priority || '',
      sector: host.holonewsArchiveFilters?.sector || '',
      category: host.holonewsArchiveFilters?.category || ''
    };
    const filteredHolonewsViews = this._filterHolonewsRecords(holonewsViews, holonewsArchiveFilters);
    const usedHolonewsSeedIds = [...new Set(holonewsViews.map((record) => record.holonewsSeedId).filter(Boolean))];
    const holonewsWireFilters = {
      ...atomFilters,
      query: String(host.holonewsWireFilters?.query || '').trim(),
      category: host.holonewsWireFilters?.category || '',
      sector: host.holonewsWireFilters?.sector || '',
      priority: host.holonewsWireFilters?.priority || '',
      excludeIds: host.holonewsHideUsedSeeds ? usedHolonewsSeedIds : []
    };
    const holonewsSeeds = HolonewsGenerator.window(host.holonewsSeedOffset ?? 0, 12, holonewsWireFilters)
      .map((seed) => ({
        ...seed,
        alreadyUsed: usedHolonewsSeedIds.includes(seed.id),
        bodyPreview: HolonetMarkupService.preview(seed.body || '', 180)
      }));
    const eventEditorRecord = host._getBulletinEditorRecord(eventRecords, 'events')
      ? host._buildBulletinRecordView(host._getBulletinEditorRecord(eventRecords, 'events'))
      : null;
    const holonewsEditorRecord = host._getBulletinEditorRecord(eventRecords, 'holonews')
      ? host._buildBulletinRecordView(host._getBulletinEditorRecord(eventRecords, 'holonews'))
      : null;
    const messageEditorRecord = host._getBulletinEditorRecord(messageRecords, 'messages')
      ? host._buildBulletinRecordView(host._getBulletinEditorRecord(messageRecords, 'messages'))
      : null;
    const previewRecord = this._selectPreviewRecord({
      section: host.currentBulletinSection,
      eventEditorRecord,
      holonewsEditorRecord,
      messageEditorRecord,
      eventViews,
      holonewsViews,
      messageViews
    });
    const holonewsAutomationPolicy = await HolonewsAutoPublisher.getPolicy();

    return {
      pageTitle: 'Bulletin',
      pageDescription: 'GM broadcast console for one-way player home feed, notices, recaps, and current-state control',
      bulletinSection: host.currentBulletinSection,
      bulletinNav: [
        { id: 'events', label: 'Events', count: eventViews.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED).length, hint: 'Campaign broadcasts' },
        { id: 'holonews', label: 'HoloNews', count: holonewsViews.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED).length, hint: `${HolonewsGenerator.count()} generated wire variants` },
        { id: 'messages', label: 'Notices', count: messageRecords.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED).length, hint: 'Targeted one-way pings' },
        { id: 'players', label: 'Players', count: bulletinPlayers.length, hint: 'Personal home status' },
        { id: 'party', label: 'Party', count: partyState?.situation || partyState?.objective || partyState?.location ? 1 : 0, hint: 'Shared home status' }
      ],
      bulletinStats: this._buildStats([...eventViews, ...holonewsViews, ...messageViews]),
      audienceOptions: host._getAudienceOptions(),
      audienceTypes: AUDIENCE_TYPE,
      bulletinPlayers,
      selectedPlayerId,
      selectedPreviewUserId,
      selectedPreviewPlayer,
      selectedPlayerState,
      bulletinContacts,
      holonewsAtomPolicy,
      holonewsAtomPolicySummary: HolonewsAtomPolicy.summary(holonewsAtomPolicy),
      partyState,
      eventRecords: eventViews,
      holonewsRecords: filteredHolonewsViews,
      holonewsAllRecords: holonewsViews,
      holonewsSeeds,
      holonewsSeedCount: HolonewsGenerator.count(),
      holonewsAtomStats: HolonewsGenerator.atomStats(),
      holonewsAtomSamples: HolonewsGenerator.atomSamples(8),
      holonewsWireFilteredCount: HolonewsGenerator.count(holonewsWireFilters),
      holonewsUsedSeedCount: usedHolonewsSeedIds.length,
      holonewsArchiveTotalCount: holonewsViews.length,
      holonewsArchiveFilteredCount: filteredHolonewsViews.length,
      holonewsArchiveStats: this._buildHolonewsArchiveStats(holonewsViews),
      holonewsAutomation: this._buildHolonewsAutomationView(holonewsAutomationPolicy),
      holonewsArchiveFilters,
      holonewsArchiveStateOptions: this._getHolonewsStateOptions(),
      holonewsArchiveTypeOptions: this._getHolonewsTypeOptions(),
      holonewsHideUsedSeeds: Boolean(host.holonewsHideUsedSeeds),
      holonewsWireFilters: {
        query: holonewsWireFilters.query,
        category: holonewsWireFilters.category,
        sector: holonewsWireFilters.sector,
        priority: holonewsWireFilters.priority
      },
      holonewsCategories: HolonewsGenerator.categories(),
      holonewsSectors: HolonewsGenerator.sectors(),
      holonewsPriorities: HolonewsGenerator.priorities(),
      holonewsAtomControlPreviewCount: HolonewsGenerator.count(atomFilters),
      messageRecords: messageViews,
      eventEditorRecord,
      holonewsEditorRecord,
      messageEditorRecord,
      homePreview: this._buildHomePreview({ previewRecord, eventViews, holonewsViews, messageViews, selectedPlayerState: selectedPreviewState, partyState, selectedPreviewPlayer }),
      syntaxGuide: [
        '@ mention character, NPC, ship, faction, or location',
        '# add emphasis or a topic tag',
        '! mark urgent alerts',
        '+800cr style credits/rewards',
        'HoloNews ambient wire stories are ordinary background texture by default.',
        'Breaking News is GM-authored only and creates a red home alert.'
      ]
    };
  }

  static _buildStats(records) {
    const active = records.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED);
    return {
      live: records.filter((record) => record.state === DELIVERY_STATE.PUBLISHED).length,
      drafts: records.filter((record) => record.state === DELIVERY_STATE.DRAFT).length,
      urgent: active.filter((record) => record.isUrgent).length,
      pinned: active.filter((record) => record.isPinned).length,
      archived: records.filter((record) => record.state === DELIVERY_STATE.ARCHIVED).length
    };
  }

  static _filterHolonewsRecords(records, filters = {}) {
    const query = String(filters.query || '').trim().toLowerCase();
    const state = String(filters.state || '').trim();
    const type = String(filters.type || '').trim();
    const priority = String(filters.priority || '').trim();
    const sector = String(filters.sector || '').trim();
    const category = String(filters.category || '').trim();

    return records.filter((record) => {
      if (state && record.state !== state) return false;
      if (priority && record.priority !== priority) return false;
      if (sector && record.sector !== sector) return false;
      if (category && record.newsCategory !== category) return false;
      if (type === 'breaking' && !record.isBreakingNews) return false;
      if (type === 'ambient' && !record.isAmbientHolonews) return false;
      if (type === 'gm-authored' && record.isAmbientHolonews) return false;
      if (query) {
        const haystack = [
          record.title,
          record.body,
          record.newsSource,
          record.dateline,
          record.sector,
          record.newsCategory,
          record.newsDeck,
          record.holonewsSeedId
        ].filter(Boolean).join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
  }

  static _buildHolonewsArchiveStats(records) {
    return [
      { label: 'All Stories', value: records.length, tone: 'neutral' },
      { label: 'Live', value: records.filter((record) => record.state === DELIVERY_STATE.PUBLISHED).length, tone: 'live' },
      { label: 'Drafts', value: records.filter((record) => record.state === DELIVERY_STATE.DRAFT).length, tone: 'draft' },
      { label: 'Archived', value: records.filter((record) => record.state === DELIVERY_STATE.ARCHIVED).length, tone: 'archived' },
      { label: 'Ambient', value: records.filter((record) => record.isAmbientHolonews).length, tone: 'ambient' },
      { label: 'Breaking', value: records.filter((record) => record.isBreakingNews).length, tone: 'breaking' }
    ];
  }

  static _buildHolonewsAutomationView(policy = {}) {
    const enabled = policy.enabled === true;
    const nextDue = policy.nextDueAt || null;
    const lastPublished = policy.lastPublishedAt || null;
    const lastCheck = policy.lastCheckAt || null;
    const history = Array.isArray(policy.history) ? [...policy.history].reverse().slice(0, 5) : [];

    return {
      enabled,
      statusLabel: enabled ? 'Enabled' : 'Manual Only',
      statusTone: enabled ? 'enabled' : 'disabled',
      cadenceMinutes: Number(policy.cadenceMinutes || 240),
      maxPerRun: Number(policy.maxPerRun || 1),
      hideUsedSeeds: policy.hideUsedSeeds !== false,
      allowRepeatsWhenExhausted: policy.allowRepeatsWhenExhausted === true,
      query: policy.query || '',
      category: policy.category || '',
      sector: policy.sector || '',
      priority: policy.priority || '',
      sourceName: policy.sourceName || 'Galaxy News Net',
      lastCheckAt: lastCheck || 'Never',
      lastPublishedAt: lastPublished || 'Never',
      nextDueAt: nextDue || 'Not scheduled',
      totalPublished: Number(policy.totalPublished || 0),
      history,
      historyCount: history.length,
      isPrimaryGm: HolonewsAutoPublisher.isPrimaryActiveGm()
    };
  }

  static _getHolonewsStateOptions() {
    return [
      { value: '', label: 'Any state' },
      { value: DELIVERY_STATE.PUBLISHED, label: 'Published' },
      { value: DELIVERY_STATE.DRAFT, label: 'Draft' },
      { value: DELIVERY_STATE.ARCHIVED, label: 'Archived' }
    ];
  }

  static _getHolonewsTypeOptions() {
    return [
      { value: '', label: 'Any type' },
      { value: 'ambient', label: 'Ambient wire' },
      { value: 'gm-authored', label: 'GM-authored' },
      { value: 'breaking', label: 'Breaking News' }
    ];
  }

  static _selectPreviewRecord({ section, eventEditorRecord, holonewsEditorRecord, messageEditorRecord, eventViews, holonewsViews, messageViews }) {
    if (section === 'messages' && messageEditorRecord) return messageEditorRecord;
    if (section === 'holonews' && holonewsEditorRecord) return holonewsEditorRecord;
    if (section === 'events' && eventEditorRecord) return eventEditorRecord;
    const combined = [...holonewsViews, ...eventViews, ...messageViews];
    return combined.find((record) => record.isPinned && record.state !== DELIVERY_STATE.ARCHIVED)
      ?? combined.find((record) => record.state === DELIVERY_STATE.PUBLISHED)
      ?? combined.find((record) => record.state === DELIVERY_STATE.DRAFT)
      ?? null;
  }

  static _buildHomePreview({ previewRecord, eventViews, holonewsViews, messageViews, selectedPlayerState, partyState, selectedPreviewPlayer = null }) {
    const combined = [...holonewsViews, ...eventViews, ...messageViews];
    const pinned = combined.find((record) => record.isPinned && record.state !== DELIVERY_STATE.ARCHIVED) ?? previewRecord;
    const recipientId = selectedPreviewPlayer?.userId ? `player:${selectedPreviewPlayer.userId}` : null;
    const playerFeed = combined
      .filter((record) => record.state === DELIVERY_STATE.PUBLISHED)
      .filter((record) => this._recordTargetsPreviewPlayer(record, selectedPreviewPlayer))
      .slice(0, 5)
      .map((record) => ({
        id: record.id,
        title: record.title,
        sender: record.senderName,
        category: record.category,
        isUrgent: record.isUrgent,
        isBreakingNews: record.isBreakingNews,
        isRead: recipientId ? record.readRecipientIds?.includes(recipientId) : false,
        imageUrl: record.imageUrl || ''
      }));
    const state = {
      location: selectedPlayerState?.location || partyState?.location || 'Current location not set',
      objective: selectedPlayerState?.objective || partyState?.objective || 'No active objective',
      situation: selectedPlayerState?.situation || partyState?.situation || 'Awaiting new instructions.'
    };

    return {
      selectedPlayerLabel: selectedPreviewPlayer?.actorName || selectedPreviewPlayer?.userName || 'All Players',
      selectedRecipientId: recipientId,
      unreadCount: playerFeed.filter((entry) => !entry.isRead).length,
      feedItems: playerFeed,
      feed: previewRecord ? {
        title: previewRecord.title,
        sender: previewRecord.senderName,
        category: previewRecord.category,
        priority: previewRecord.priority,
        audience: previewRecord.audienceLabel,
        audienceMatchesSelectedPlayer: this._recordTargetsPreviewPlayer(previewRecord, selectedPreviewPlayer),
        isUrgent: previewRecord.isUrgent,
        isBreakingNews: previewRecord.isBreakingNews,
        imageUrl: previewRecord.imageUrl || '',
        renderedPreview: previewRecord.renderedBodyPreview || HolonetMarkupService.preview(previewRecord.body || '', 160)
      } : null,
      lastSession: pinned ? {
        title: pinned.title,
        sender: pinned.senderName,
        imageUrl: pinned.imageUrl || '',
        renderedPreview: pinned.renderedBody || HolonetMarkupService.render(pinned.body || '')
      } : null,
      state
    };
  }

  static _recordTargetsPreviewPlayer(record, selectedPreviewPlayer = null) {
    if (!record || !selectedPreviewPlayer?.userId) return true;
    const audienceType = record.audienceType || record.audience?.type || AUDIENCE_TYPE.ALL_PLAYERS;
    const playerIds = record.audiencePlayerIds || record.audience?.playerIds || [];
    if (audienceType === AUDIENCE_TYPE.ALL_PLAYERS || audienceType === AUDIENCE_TYPE.PARTY) return true;
    if (audienceType === AUDIENCE_TYPE.ONE_PLAYER || audienceType === AUDIENCE_TYPE.SELECTED_PLAYERS) {
      return playerIds.includes(selectedPreviewPlayer.userId);
    }
    return false;
  }
}
