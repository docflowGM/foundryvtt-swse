/** GM bulletin / Holonet command surface view-model. */

import { HolonetStorage } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js';
import { HolonetStateService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-state-service.js';
import { SOURCE_FAMILY, DELIVERY_STATE, AUDIENCE_TYPE, INTENT_TYPE } from '/systems/foundryvtt-swse/scripts/holonet/contracts/enums.js';
import { HolonetMarkupService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-markup-service.js';
import { HolonewsGenerator } from '/systems/foundryvtt-swse/scripts/holonet/data/holonews-seed-events.js';

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

    const allEventViews = eventRecords.map((record) => host._buildBulletinRecordView(record));
    const eventViews = allEventViews.filter((record) => !record.isHolonews);
    const holonewsViews = allEventViews.filter((record) => record.isHolonews);
    const messageViews = messageRecords.map((record) => host._buildBulletinRecordView(record));
    const usedHolonewsSeedIds = [...new Set(holonewsViews.map((record) => record.holonewsSeedId).filter(Boolean))];
    const holonewsWireFilters = {
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

    return {
      pageTitle: 'Bulletin',
      pageDescription: 'GM broadcast console for one-way player home feed, notices, recaps, and current-state control',
      bulletinSection: host.currentBulletinSection,
      bulletinNav: [
        { id: 'events', label: 'Events', count: eventViews.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED).length, hint: 'Campaign broadcasts' },
        { id: 'holonews', label: 'HoloNews', count: holonewsViews.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED).length, hint: `${HolonewsGenerator.count()} ambient wire stories` },
        { id: 'messages', label: 'Notices', count: messageRecords.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED).length, hint: 'Targeted one-way pings' },
        { id: 'players', label: 'Players', count: bulletinPlayers.length, hint: 'Personal home status' },
        { id: 'party', label: 'Party', count: partyState?.situation || partyState?.objective || partyState?.location ? 1 : 0, hint: 'Shared home status' }
      ],
      bulletinStats: this._buildStats([...eventViews, ...holonewsViews, ...messageViews]),
      audienceOptions: host._getAudienceOptions(),
      audienceTypes: AUDIENCE_TYPE,
      bulletinPlayers,
      selectedPlayerId,
      selectedPlayerState,
      partyState,
      eventRecords: eventViews,
      holonewsRecords: holonewsViews,
      holonewsSeeds,
      holonewsSeedCount: HolonewsGenerator.count(),
      holonewsWireFilteredCount: HolonewsGenerator.count(holonewsWireFilters),
      holonewsUsedSeedCount: usedHolonewsSeedIds.length,
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
      messageRecords: messageViews,
      eventEditorRecord,
      holonewsEditorRecord,
      messageEditorRecord,
      homePreview: this._buildHomePreview({ previewRecord, eventViews, holonewsViews, messageViews, selectedPlayerState, partyState }),
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

  static _buildHomePreview({ previewRecord, eventViews, holonewsViews, messageViews, selectedPlayerState, partyState }) {
    const pinned = [...holonewsViews, ...eventViews, ...messageViews].find((record) => record.isPinned && record.state !== DELIVERY_STATE.ARCHIVED) ?? previewRecord;
    const state = {
      location: selectedPlayerState?.location || partyState?.location || 'Current location not set',
      objective: selectedPlayerState?.objective || partyState?.objective || 'No active objective',
      situation: selectedPlayerState?.situation || partyState?.situation || 'Awaiting new instructions.'
    };

    return {
      feed: previewRecord ? {
        title: previewRecord.title,
        sender: previewRecord.senderName,
        category: previewRecord.category,
        priority: previewRecord.priority,
        audience: previewRecord.audienceLabel,
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
}
