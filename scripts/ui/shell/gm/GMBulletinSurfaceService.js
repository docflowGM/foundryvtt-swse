/** GM bulletin / Holonet command surface view-model. */

import { HolonetStorage } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js';
import { HolonetStateService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-state-service.js';
import { SOURCE_FAMILY, DELIVERY_STATE, AUDIENCE_TYPE, INTENT_TYPE } from '/systems/foundryvtt-swse/scripts/holonet/contracts/enums.js';

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

    return {
      pageTitle: 'Bulletin',
      pageDescription: 'One-way GM-to-player bulletins, notices, and current-state control',
      bulletinSection: host.currentBulletinSection,
      bulletinNav: [
        { id: 'events', label: 'Events', count: eventRecords.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED).length },
        { id: 'messages', label: 'Notices', count: messageRecords.filter((record) => record.state !== DELIVERY_STATE.ARCHIVED).length },
        { id: 'players', label: 'Players', count: bulletinPlayers.length },
        { id: 'party', label: 'Party', count: partyState?.situation || partyState?.objective || partyState?.location ? 1 : 0 }
      ],
      audienceOptions: host._getAudienceOptions(),
      audienceTypes: AUDIENCE_TYPE,
      bulletinPlayers,
      selectedPlayerId,
      selectedPlayerState,
      partyState,
      eventRecords: eventRecords.map((record) => host._buildBulletinRecordView(record)),
      messageRecords: messageRecords.map((record) => host._buildBulletinRecordView(record)),
      eventEditorRecord: host._getBulletinEditorRecord(eventRecords, 'events')
        ? host._buildBulletinRecordView(host._getBulletinEditorRecord(eventRecords, 'events'))
        : null,
      messageEditorRecord: host._getBulletinEditorRecord(messageRecords, 'messages')
        ? host._buildBulletinRecordView(host._getBulletinEditorRecord(messageRecords, 'messages'))
        : null,
      syntaxGuide: [
        '@ mention character, NPC, ship, faction, or location',
        '# add emphasis or a topic tag',
        '! mark urgent alerts',
        '+800cr style credits/rewards',
        'Examples: @Master Tholos wants @Kael at the #Jedi Temple. !urgent +800cr reward posted.'
      ]
    };
  }
}
