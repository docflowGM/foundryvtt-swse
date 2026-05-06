/**
 * Holonet Recipient Contract
 *
 * Represents a target for message delivery.
 * Uses stable IDs so read/unread state and thread membership can be queried safely.
 */

import { RECIPIENT_TYPE, PERSONA_TYPE } from './enums.js';

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

  /**
   * Build a HolonetRecipient from a stable ID string.
   * Supports: 'player:<userId>', 'gm:<userId>', 'gm', 'persona:<personaType>:<actorId>'
   *
   * @param {string} stableId
   * @returns {HolonetRecipient|null}
   */
  static fromStableId(stableId) {
    if (!stableId) return null;
    if (stableId.startsWith('player:')) {
      const userId = stableId.split(':')[1];
      const user = game.users?.get(userId);
      return HolonetRecipient.player(userId, user?.character?.id, user?.character?.name ?? user?.name ?? 'Player');
    }
    if (stableId.startsWith('gm:')) {
      const userId = stableId.split(':')[1] || null;
      return HolonetRecipient.gm(userId);
    }
    if (stableId === 'gm') {
      return HolonetRecipient.gm();
    }
    if (stableId.startsWith('persona:')) {
      const [, personaType = PERSONA_TYPE.NPC, actorId = null] = stableId.split(':');
      const actor = actorId ? game.actors?.get(actorId) : null;
      return HolonetRecipient.persona(actorId, actor?.name ?? 'Persona', personaType);
    }
    // Unknown format: return a shell recipient that carries the ID
    return new HolonetRecipient({ id: stableId });
  }

  /**
   * Return the current user's stable recipient ID string.
   * @returns {string|null}
   */
  static currentUserId() {
    if (!game.user) return null;
    return game.user.isGM ? `gm:${game.user.id}` : `player:${game.user.id}`;
  }

  /**
   * Return a stable recipient ID string for any Foundry User.
   * @param {User} [user]
   * @returns {string|null}
   */
  static idForUser(user = game.user) {
    if (!user) return null;
    return user.isGM ? `gm:${user.id}` : `player:${user.id}`;
  }

  /**
   * Return a stable recipient ID string for a persona actor.
   * @param {string} actorId
   * @param {string} [personaType]
   * @returns {string}
   */
  static idForPersona(actorId, personaType = PERSONA_TYPE.NPC) {
    return `persona:${personaType}:${actorId}`;
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
