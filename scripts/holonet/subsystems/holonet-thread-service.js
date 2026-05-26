/**
 * Holonet Thread Service
 */

import { HolonetThread } from '../contracts/holonet-thread.js';
import { HolonetStorage } from './holonet-storage.js';
import { HolonetEngine } from '../holonet-engine.js';

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

  /**
   * Atomically publish a message record to a thread.
   *
   * This method owns the full sequence so steps cannot drift:
   *   1. Resolve thread from object or ID
   *   2. Publish message through HolonetEngine (GM-side, skipSocket)
   *   3. Optionally mark sender as read
   *   4. Attach message ID to thread
   *   5. Save thread once
   *   6. Fire local hook so UI receives one coherent update
   *
   * @param {Object}  opts
   * @param {Object}  [opts.thread]           Pre-loaded HolonetThread (or provide threadId)
   * @param {string}  [opts.threadId]         Fallback: load thread from storage by ID
   * @param {Object}  opts.message            HolonetRecord (message) to publish
   * @param {Object}  [opts.senderRecipient]  HolonetRecipient for the sender (marks them read)
   * @param {Object}  [opts.publishOptions]   Options forwarded to HolonetEngine.publish
   * @param {boolean} [opts.markSenderRead]   Default true
   *
   * @returns {Promise<{ok: boolean, threadId: string|null, messageId: string|null, reason?: string}>}
   */
  static async publishMessageToThread({
    thread,
    threadId,
    message,
    senderRecipient,
    publishOptions = {},
    markSenderRead = true
  } = {}) {
    try {
      // 1. Resolve thread
      let resolvedThread = thread ?? null;
      if (!resolvedThread && threadId) {
        resolvedThread = await HolonetStorage.getThread(threadId);
      }
      if (!resolvedThread) {
        return { ok: false, reason: 'thread_not_found', threadId: threadId ?? null, messageId: null };
      }
      if (!message) {
        return { ok: false, reason: 'no_message', threadId: resolvedThread.id, messageId: null };
      }

      // 2. Prepare publication without persisting. The record and thread are
      // saved together below so sender/recipient projections advance as one
      // Holonet envelope instead of two drifting writes.
      HolonetEngine.prepareRecordForPublish(message, { skipSocket: true, ...publishOptions });

      // 3. Mark sender read before the envelope is saved to avoid ghost unread badges.
      if (markSenderRead && senderRecipient?.id) {
        message.markRead(senderRecipient.id);
      }

      // 4+5. Attach message to thread and save the message/thread envelope once.
      resolvedThread.addMessage(message.id);
      const saved = await HolonetStorage.saveRecordAndThread(message, resolvedThread);
      if (!saved) {
        return { ok: false, reason: 'envelope_save_failed', threadId: resolvedThread.id, messageId: message.id };
      }
      HolonetEngine.emitPreparedRecordPublished(message);

      // 6. Fire local hooks so UI gets one coherent update.
      Hooks.callAll('swseHolonet:threadUpdated', { threadId: resolvedThread.id, messageId: message.id });
      Hooks.callAll('swseHolonetUpdated', { type: 'thread-updated', threadId: resolvedThread.id });

      return { ok: true, threadId: resolvedThread.id, messageId: message.id };
    } catch (err) {
      console.error('[HolonetThreadService] publishMessageToThread failed:', err);
      return {
        ok: false,
        reason: 'exception',
        threadId: thread?.id ?? threadId ?? null,
        messageId: message?.id ?? null
      };
    }
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
