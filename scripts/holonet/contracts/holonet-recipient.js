/**
 * Holonet Recipient Contract
 *
 * Represents a target for message delivery.
 * Uses stable IDs so read/unread state and thread membership can be queried safely.
 */

import { RECIPIENT_TYPE } from './enums.js';

function buildStableRecipientId(data = {}) {
  const type = data.recipientType ?? RECIPIENT_TYPE.PLAYER;
  if (type === RECIPIENT_TYPE.GM) {
    return data.userId ? `gm:${data.userId}` : 'gm';
  }
  if (type === RECIPIENT_TYPE.PERSONA) {
    return `persona:${data.personaType ?? 'persona'}:${data.actorId ?? 'unknown'}`;
  }
  return `player:${data.userId ?? data.actorId ?? 'unknown'}`;
}

export class HolonetRecipient {
  constructor(data = {}) {
    this.recipientType = data.recipientType ?? RECIPIENT_TYPE.PLAYER;
    this.actorId = data.actorId ?? null;
    this.actorName = data.actorName ?? null;
    this.userId = data.userId ?? null;
    this.personaType = data.personaType ?? null;
    this.metadata = data.metadata ?? {};
    this.id = data.id ?? buildStableRecipientId({
      recipientType: this.recipientType,
      actorId: this.actorId,
      userId: this.userId,
      personaType: this.personaType
    });
  }

  static player(userId, actorId, actorName) {
    return new HolonetRecipient({
      recipientType: RECIPIENT_TYPE.PLAYER,
      userId,
      actorId,
      actorName
    });
  }

  static gm(userId = null) {
    return new HolonetRecipient({
      recipientType: RECIPIENT_TYPE.GM,
      userId,
      actorName: 'Gamemaster'
    });
  }

  static persona(actorId, actorName, personaType) {
    return new HolonetRecipient({
      recipientType: RECIPIENT_TYPE.PERSONA,
      actorId,
      actorName,
      personaType
    });
  }

  toJSON() {
    return {
      id: this.id,
      recipientType: this.recipientType,
      actorId: this.actorId,
      actorName: this.actorName,
      userId: this.userId,
      personaType: this.personaType,
      metadata: this.metadata
    };
  }
}
