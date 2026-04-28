/**
 * Holonet Sender Contract
 *
 * Represents the source/sender of a message
 */

export class HolonetSender {
  constructor(data = {}) {
    this.id = data.id ?? foundry.utils.randomID();
    this.type = data.type ?? 'actor'; // 'actor', 'system', 'automation'
    this.actorId = data.actorId ?? null;
    this.actorName = data.actorName ?? null;
    this.systemLabel = data.systemLabel ?? null; // 'System', 'Automation', etc.
    this.avatar = data.avatar ?? null;
    this.metadata = data.metadata ?? {};
  }

  /**
   * Create a sender for an actor
   */
  static fromActor(actorId, actorName, avatar = null) {
    return new HolonetSender({
      type: 'actor',
      actorId,
      actorName,
      avatar
    });
  }

  /**
   * Create a system sender
   */
  static system(label = 'System') {
    return new HolonetSender({
      type: 'system',
      systemLabel: label
    });
  }

  toJSON() {
    return {
      id: this.id,
      type: this.type,
      actorId: this.actorId,
      actorName: this.actorName,
      systemLabel: this.systemLabel,
      avatar: this.avatar,
      metadata: this.metadata
    };
  }
}
