/**
 * Holonet Thread Service
 *
 * Manages message threads and thread membership
 */

import { HolonetThread } from '../contracts/holonet-thread.js';
import { HolonetStorage } from './holonet-storage.js';

export class HolonetThreadService {
  /**
   * Create a new thread
   */
  static async createThread(title, participants = []) {
    const thread = new HolonetThread({
      title,
      participants
    });

    await HolonetStorage.saveThread(thread);
    return thread;
  }

  /**
   * Get or create a thread with specific participants
   */
  static async getOrCreateThread(title, participants) {
    const threads = await HolonetStorage.getAllThreads();

    // Try to find existing thread with same participants
    const existing = threads.find(t => {
      if (t.participants?.length !== participants.length) return false;
      const pIds = new Set(t.participants.map(p => p.id));
      return participants.every(p => pIds.has(p.id));
    });

    if (existing) {
      return existing;
    }

    return this.createThread(title, participants);
  }

  /**
   * Add message to thread
   */
  static async addMessageToThread(threadId, messageId) {
    const thread = await HolonetStorage.getThread(threadId);
    if (!thread) return false;

    thread.addMessage(messageId);
    await HolonetStorage.saveThread(thread);
    return true;
  }

  /**
   * Get thread with messages
   */
  static async getThreadWithMessages(threadId) {
    const thread = await HolonetStorage.getThread(threadId);
    if (!thread) return null;

    const messages = [];
    for (const messageId of thread.messageIds) {
      const msg = await HolonetStorage.getRecord(messageId);
      if (msg) messages.push(msg);
    }

    return {
      ...thread,
      messages
    };
  }

  /**
   * Archive a thread
   */
  static async archiveThread(threadId) {
    const thread = await HolonetStorage.getThread(threadId);
    if (!thread) return false;

    thread.archive();
    await HolonetStorage.saveThread(thread);
    return true;
  }
}
