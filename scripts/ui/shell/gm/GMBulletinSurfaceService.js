/** GM bulletin / Holonet command surface view-model. */

import { HolonetStorage } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js';
import { HolonetStateService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-state-service.js';
import { SOURCE_FAMILY, DELIVERY_STATE, AUDIENCE_TYPE, INTENT_TYPE } from '/systems/foundryvtt-swse/scripts/holonet/contracts/enums.js';
import { HolonetMarkupService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-markup-service.js';

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

    const eventViews = eventRecords.map((record) => host._buildBulletinRecordView(record));
    const messageViews = messageRecords.map((record) => host._buildBulletinRecordView(record));
    const eventEditorRecord = host._getBulletinEditorRecord(eventRecords, 'events')
      ? host._buildBulletinRecordView(host._getBulletinEditorRecord(eventRecords, 'events'))
      : null;
    const messageEditorRecord = host._getBulletinEditorRecord(messageRecords, 'messages')
      ? host._buildBulletinRecordView(host._getBulletinEditorRecord(messageRecords, 'messages'))
      : null;
    const previewRecord = this._selectPreviewRecord({
      section: host.currentBulletinSection,
      eventEditorRecord,
      messageEditorRecord,
      eventViews,
      messageViews
    });

    return {
      pageTitle: 'Bulletin',
      pageDescription: 'GM broadcast console for one-way player home feed, notices, recaps, and current-state control',
      bulletinSection: host.currentBulletinSection,
      bulletinNav: [
        { id: 'events', label: 'Events', count: eventRecords.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED).length, hint: 'Campaign broadcasts' },
        { id: 'messages', label: 'Notices', count: messageRecords.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED).length, hint: 'Targeted one-way pings' },
        { id: 'players', label: 'Players', count: bulletinPlayers.length, hint: 'Personal home status' },
        { id: 'party', label: 'Party', count: partyState?.situation || partyState?.objective || partyState?.location ? 1 : 0, hint: 'Shared home status' }
      ],
      bulletinStats: this._buildStats([...eventViews, ...messageViews]),
      audienceOptions: host._getAudienceOptions(),
      audienceTypes: AUDIENCE_TYPE,
      bulletinPlayers,
      selectedPlayerId,
      selectedPlayerState,
      partyState,
      eventRecords: eventViews,
      messageRecords: messageViews,
      eventEditorRecord,
      messageEditorRecord,
      homePreview: this._buildHomePreview({ previewRecord, eventViews, messageViews, selectedPlayerState, partyState }),
      syntaxGuide: [
        '@ mention character, NPC, ship, faction, or location',
        '# add emphasis or a topic tag',
        '! mark urgent alerts',
        '+800cr style credits/rewards',
        'Urgent bulletins create alert bubbles; pinned bulletins become the Last Session card.'
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

  static _selectPreviewRecord({ section, eventEditorRecord, messageEditorRecord, eventViews, messageViews }) {
    if (section === 'messages' && messageEditorRecord) return messageEditorRecord;
    if (section === 'events' && eventEditorRecord) return eventEditorRecord;
    const combined = [...eventViews, ...messageViews];
    return combined.find((record) => record.isPinned && record.state !== DELIVERY_STATE.ARCHIVED)
      ?? combined.find((record) => record.state === DELIVERY_STATE.PUBLISHED)
      ?? combined.find((record) => record.state === DELIVERY_STATE.DRAFT)
      ?? null;
  }

  static _buildHomePreview({ previewRecord, eventViews, messageViews, selectedPlayerState, partyState }) {
    const pinned = [...eventViews, ...messageViews].find((record) => record.isPinned && record.state !== DELIVERY_STATE.ARCHIVED) ?? previewRecord;
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
        renderedPreview: previewRecord.renderedBodyPreview || HolonetMarkupService.preview(previewRecord.body || '', 160)
      } : null,
      lastSession: pinned ? {
        title: pinned.title,
        sender: pinned.senderName,
        renderedPreview: pinned.renderedBody || HolonetMarkupService.render(pinned.body || '')
      } : null,
      state
    };
  }
}
