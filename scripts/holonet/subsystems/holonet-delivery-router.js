/**
 * Holonet Delivery Router
 *
 * Determines delivery targets for a record based on audience and recipient models.
 */

import { AUDIENCE_TYPE, RECIPIENT_TYPE, PERSONA_TYPE } from '../contracts/enums.js'; // PERSONA_TYPE kept for recipientIdForPersona
import { HolonetRecipient } from '../contracts/holonet-recipient.js';


export class HolonetDeliveryRouter {
  static resolveRecipients(record) {
    if (Array.isArray(record.recipients) && record.recipients.length > 0 && !record.audience) {
      return record.recipients;
    }
    if (!record.audience) return [];

    const recipients = [];

    switch (record.audience.type) {
      case AUDIENCE_TYPE.ALL_PLAYERS:
        recipients.push(...this.getAllPlayers());
        break;
      case AUDIENCE_TYPE.ONE_PLAYER:
      case AUDIENCE_TYPE.SELECTED_PLAYERS:
        if (record.audience.playerIds?.length) {
          recipients.push(...this.getPlayersByIds(record.audience.playerIds));
        }
        break;
      case AUDIENCE_TYPE.PARTY:
        recipients.push(...this.getPartyMembers());
        break;
      case AUDIENCE_TYPE.GM_ONLY:
        recipients.push(...this.getGMRecipients());
        break;
      case AUDIENCE_TYPE.GM_AND_PARTY:
        recipients.push(...this.getPartyMembers());
        recipients.push(...this.getGMRecipients());
        break;
      case AUDIENCE_TYPE.THREAD_PARTICIPANTS:
        if (record.audience.threadParticipantIds?.length) {
          recipients.push(...record.audience.threadParticipantIds.map(id => HolonetRecipient.fromStableId(id)).filter(Boolean));
        }
        break;
    }

    const unique = new Map();
    for (const recipient of recipients) {
      if (recipient?.id) unique.set(recipient.id, recipient);
    }
    return Array.from(unique.values());
  }

  static getAllPlayers() {
    return game.users?.filter(u => !u.isGM && u.active)
      .map(u => HolonetRecipient.player(u.id, u.character?.id, u.character?.name))
      .filter(r => r.userId) ?? [];
  }

  static getPlayersByIds(userIds) {
    return (userIds ?? [])
      .map(userId => game.users?.get(userId))
      .filter(u => u && !u.isGM)
      .map(u => HolonetRecipient.player(u.id, u.character?.id, u.character?.name))
      .filter(r => r.userId);
  }

  static getPartyMembers() {
    return this.getAllPlayers();
  }

  static getGMRecipients() {
    return game.users?.filter(u => u.isGM && u.active).map(u => HolonetRecipient.gm(u.id)) ?? [HolonetRecipient.gm()];
  }

  static getCurrentRecipientId() {
    if (!game.user) return null;
    return game.user.isGM ? `gm:${game.user.id}` : `player:${game.user.id}`;
  }

  static recipientIdForUser(user = game.user) {
    if (!user) return null;
    return user.isGM ? `gm:${user.id}` : `player:${user.id}`;
  }

  static recipientIdForPersona(actorId, personaType = PERSONA_TYPE.NPC) {
    return `persona:${personaType}:${actorId}`;
  }

  static isCurrentUserRecipient(recipient) {
    const currentId = this.getCurrentRecipientId();
    return Boolean(currentId && recipient?.id === currentId);
  }
}
