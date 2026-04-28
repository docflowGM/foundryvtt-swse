/**
 * Holonet Thread Contract
 *
 * Represents a conversation thread of related messages
 */

export class HolonetThread {
  constructor(data = {}) {
    this.id = data.id ?? foundry.utils.randomID();
    this.title = data.title ?? null;
    this.participants = data.participants ?? []; // Array of recipient objects
    this.messageIds = data.messageIds ?? []; // Ordered list of message IDs in thread
    this.createdAt = data.createdAt ?? new Date().toISOString();
    this.updatedAt = data.updatedAt ?? new Date().toISOString();
    this.isArchived = data.isArchived ?? false;
    this.metadata = data.metadata ?? {};
  }

  /**
   * Add message to thread
   */
  addMessage(messageId) {
    if (!this.messageIds.includes(messageId)) {
      this.messageIds.push(messageId);
      this.updatedAt = new Date().toISOString();
    }
  }

  /**
   * Archive thread
   */
  archive() {
    this.isArchived = true;
    this.updatedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      participants: this.participants,
      messageIds: this.messageIds,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isArchived: this.isArchived,
      metadata: this.metadata
    };
  }
}
