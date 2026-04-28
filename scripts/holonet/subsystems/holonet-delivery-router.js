/**
 * Holonet Delivery Router
 *
 * Determines delivery targets for a record based on audience and recipient models.
 */

import { AUDIENCE_TYPE, RECIPIENT_TYPE } from '../contracts/enums.js';
import { HolonetRecipient } from '../contracts/holonet-recipient.js';

export class HolonetDeliveryRouter {
  /**
   * Determine delivery recipients for a record
   *
   * @param {HolonetRecord} record
   * @returns {HolonetRecipient[]}
   */
  static resolveRecipients(record) {
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
        recipients.push(this.getGMRecipient());
        break;

      case AUDIENCE_TYPE.GM_AND_PARTY:
        recipients.push(...this.getPartyMembers());
        recipients.push(this.getGMRecipient());
        break;

      case AUDIENCE_TYPE.THREAD_PARTICIPANTS:
        if (record.audience.threadParticipantIds?.length) {
          recipients.push(...record.audience.threadParticipantIds.map(id =>
            new HolonetRecipient({ id })
          ));
        }
        break;
    }

    return recipients;
  }

  /**
   * Get all player recipients
   */
  static getAllPlayers() {
    return game.users?.filter(u => !u.isGM && u.active)
      .map(u => HolonetRecipient.player(u.id, u.character?.id, u.character?.name))
      .filter(r => r.userId) ?? [];
  }

  /**
   * Get players by IDs
   */
  static getPlayersByIds(userIds) {
    return userIds
      .map(userId => game.users?.get(userId))
      .filter(u => u && !u.isGM)
      .map(u => HolonetRecipient.player(u.id, u.character?.id, u.character?.name))
      .filter(r => r.userId) ?? [];
  }

  /**
   * Get party members (all active players)
   */
  static getPartyMembers() {
    return this.getAllPlayers();
  }

  /**
   * Get GM recipient
   */
  static getGMRecipient() {
    return HolonetRecipient.gm();
  }

  /**
   * Get persona recipient
   */
  static getPersonaRecipient(actorId, personaType) {
    const actor = game.actors?.get(actorId);
    return HolonetRecipient.persona(actorId, actor?.name, personaType);
  }
}
