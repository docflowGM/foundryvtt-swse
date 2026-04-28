/**
 * Holonet Recipient Contract
 *
 * Represents a target for message delivery
 * Can be player, GM, or persona (NPC, vendor, mentor, etc.)
 */

import { RECIPIENT_TYPE } from './enums.js';

export class HolonetRecipient {
  constructor(data = {}) {
    this.id = data.id ?? foundry.utils.randomID();
    this.recipientType = data.recipientType ?? RECIPIENT_TYPE.PLAYER;
    this.actorId = data.actorId ?? null; // For player/persona recipient types
    this.actorName = data.actorName ?? null;
    this.userId = data.userId ?? null; // For player recipients
    this.personaType = data.personaType ?? null; // 'npc', 'mentor', 'vendor', etc.
    this.metadata = data.metadata ?? {};
  }

  /**
   * Create a player recipient
   */
  static player(userId, actorId, actorName) {
    return new HolonetRecipient({
      recipientType: RECIPIENT_TYPE.PLAYER,
      userId,
      actorId,
      actorName
    });
  }

  /**
   * Create a GM recipient
   */
  static gm() {
    return new HolonetRecipient({
      recipientType: RECIPIENT_TYPE.GM
    });
  }

  /**
   * Create a persona (NPC, mentor, etc.) recipient
   */
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
