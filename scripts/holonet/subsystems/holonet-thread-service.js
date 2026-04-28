/**
 * Holonet Thread Service
 */

import { HolonetThread } from '../contracts/holonet-thread.js';
import { HolonetStorage } from './holonet-storage.js';

function participantKeySet(participants = []) {
  return new Set(participants.map(p => p.id));
}

export class HolonetThreadService {
  static async createThread(title, participants = [], metadata = {}) {
    const thread = new HolonetThread({ title, participants, metadata });
    await HolonetStorage.saveThread(thread);
    return thread;
  }

  static async getOrCreateThread(title, participants, metadata = {}) {
    const threads = await HolonetStorage.getAllThreads();
    const target = participantKeySet(participants);
    const existing = threads.find(t => {
      if ((t.participants?.length ?? 0) !== participants.length) return false;
      const current = participantKeySet(t.participants);
      return participants.every(p => current.has(p.id)) && Array.from(current).every(id => target.has(id));
    });
    if (existing) return existing;
    return this.createThread(title, participants, metadata);
  }

  static async addMessageToThread(threadId, messageId) {
    const thread = await HolonetStorage.getThread(threadId);
    if (!thread) return false;
    thread.addMessage(messageId);
    await HolonetStorage.saveThread(thread);
    return true;
  }

  static async getThreadWithMessages(threadId) {
    const thread = await HolonetStorage.getThread(threadId);
    if (!thread) return null;
    const messages = [];
    for (const messageId of thread.messageIds) {
      const msg = await HolonetStorage.getRecord(messageId);
      if (msg) messages.push(msg);
    }
    return { ...thread, messages };
  }

  static async archiveThread(threadId) {
    const thread = await HolonetStorage.getThread(threadId);
    if (!thread) return false;
    thread.archive();
    await HolonetStorage.saveThread(thread);
    return true;
  }
}
