/**
 * Messenger Maintenance Service
 *
 * GM-only diagnostics and cleanup helpers for the Messenger/Holonet seam.
 * These helpers are intentionally opt-in and dry-run by default. Messenger
 * records remain the campaign log; maintenance only compacts obviously stale
 * thread references or prunes old, read, non-actionable messages when the GM
 * explicitly asks it to do so.
 */

import { HolonetStorage } from './holonet-storage.js';
import { MessengerNotificationBridge } from './messenger-notification-bridge.js';
import { DELIVERY_STATE, RECORD_TYPE, SOURCE_FAMILY } from '../contracts/enums.js';

const DEFAULT_KEEP_PER_THREAD = 500;
const DEFAULT_OLDER_THAN_DAYS = 180;
const MAX_KEEP_PER_THREAD = 5000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function nowIso() {
  return new Date().toISOString();
}

function timestamp(value) {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) ? time : 0;
}

function clampKeepPerThread(value) {
  const raw = Number(value ?? DEFAULT_KEEP_PER_THREAD);
  if (!Number.isFinite(raw)) return DEFAULT_KEEP_PER_THREAD;
  return Math.max(25, Math.min(MAX_KEEP_PER_THREAD, Math.floor(raw)));
}

function threadIdForRecord(record = {}) {
  return record?.metadata?.threadId || MessengerNotificationBridge.threadIdForRecord?.(record) || null;
}

function isMessengerRecord(record = {}) {
  return record?.sourceFamily === SOURCE_FAMILY.MESSENGER
    || record?.metadata?.sourceFamily === SOURCE_FAMILY.MESSENGER
    || Boolean(threadIdForRecord(record));
}

function deliveryEntries(record = {}) {
  const delivery = record?.deliveryStateByRecipient || record?.delivery || record?.deliveryStates || {};
  if (delivery instanceof Map) return Array.from(delivery.entries());
  if (delivery && typeof delivery === 'object') return Object.entries(delivery);
  return [];
}

function hasUnreadDelivery(record = {}) {
  if (typeof record?.isUnreadBy === 'function') {
    return safeArray(record.recipients).some(recipient => recipient?.id && record.isUnreadBy(recipient.id));
  }
  return deliveryEntries(record).some(([, state]) => {
    const normalized = typeof state === 'object' ? state?.state : state;
    return ![DELIVERY_STATE.READ, 'read'].includes(String(normalized || '').toLowerCase());
  });
}

function isPinnedRecord(record = {}) {
  return Boolean(record?.metadata?.pinned || record?.metadata?.pinnedBy || record?.metadata?.pinState);
}

function isActionableMessengerRecord(record = {}) {
  const metadata = record?.metadata || {};
  if (metadata.gameInvite && !['accepted', 'declined', 'cancelled', 'expired'].includes(String(metadata.gameInvite.status || '').toLowerCase())) return true;
  if (metadata.creditTransfer && ['pending', 'offered', 'requested', 'countered'].includes(String(metadata.creditTransfer.status || '').toLowerCase())) return true;
  if (metadata.itemTransfer && ['pending', 'offered', 'requested', 'countered'].includes(String(metadata.itemTransfer.status || '').toLowerCase())) return true;
  if (metadata.assetTransfer && ['pending', 'offered', 'requested', 'countered'].includes(String(metadata.assetTransfer.status || '').toLowerCase())) return true;
  if (metadata.jobCard && !['paid', 'archived', 'failed'].includes(String(metadata.jobCard.status || metadata.job?.status || '').toLowerCase())) return true;
  return false;
}

function isSafeToPrune(record = {}) {
  if (!record?.id) return false;
  if (record.type !== RECORD_TYPE.MESSAGE && record.type !== 'message') return false;
  if (!isMessengerRecord(record)) return false;
  if (hasUnreadDelivery(record)) return false;
  if (isPinnedRecord(record)) return false;
  if (isActionableMessengerRecord(record)) return false;
  return true;
}

function serializeThread(thread) {
  return thread?.toJSON?.() ?? thread;
}

async function deleteRecords(recordIds = []) {
  let removed = 0;
  for (const recordId of recordIds) {
    // HolonetStorage.deleteRecord already validates GM authority.
    if (await HolonetStorage.deleteRecord(recordId)) removed += 1;
  }
  return removed;
}

function getThreadParticipants(thread = {}) {
  return safeArray(thread.participants).map(participant => participant?.id).filter(Boolean);
}

function isThreadArchivedForEveryParticipant(thread = {}) {
  const participants = getThreadParticipants(thread);
  if (!participants.length) return false;
  const archivedBy = thread?.metadata?.archivedBy || {};
  return participants.every(participantId => archivedBy[participantId]);
}

export class MessengerMaintenanceService {
  static defaults = Object.freeze({
    keepPerThread: DEFAULT_KEEP_PER_THREAD,
    olderThanDays: DEFAULT_OLDER_THAN_DAYS,
    maxKeepPerThread: MAX_KEEP_PER_THREAD
  });

  static async audit({ includeRecords = false } = {}) {
    const [threads, records] = await Promise.all([
      HolonetStorage.getAllThreads(),
      HolonetStorage.getAllRecords()
    ]);
    const recordById = new Map(records.map(record => [record.id, record]).filter(([id]) => id));
    const threadById = new Map(threads.map(thread => [thread.id, thread]).filter(([id]) => id));
    const messengerRecords = records.filter(isMessengerRecord);
    const messengerMessages = messengerRecords.filter(record => record.type === RECORD_TYPE.MESSAGE || record.type === 'message');
    const actionNotices = records.filter(record => MessengerNotificationBridge.isMessengerRecord?.(record) && record?.metadata?.messengerNotice);

    const missingMessageRecords = [];
    const duplicateThreadMessageIds = [];
    const oversizedThreads = [];
    const emptyThreads = [];
    let mutedThreadCount = 0;
    let archivedThreadCount = 0;

    for (const thread of threads) {
      const messageIds = safeArray(thread.messageIds).map(String).filter(Boolean);
      if (!messageIds.length) emptyThreads.push(thread.id);
      if (thread?.metadata?.mutedBy && Object.keys(thread.metadata.mutedBy).length) mutedThreadCount += 1;
      if (isThreadArchivedForEveryParticipant(thread)) archivedThreadCount += 1;
      if (messageIds.length > DEFAULT_KEEP_PER_THREAD) oversizedThreads.push({ threadId: thread.id, messageCount: messageIds.length });

      const seen = new Set();
      for (const messageId of messageIds) {
        if (seen.has(messageId)) duplicateThreadMessageIds.push({ threadId: thread.id, messageId });
        seen.add(messageId);
        if (!recordById.has(messageId)) missingMessageRecords.push({ threadId: thread.id, messageId });
      }
    }

    const orphanMessengerRecords = messengerMessages
      .filter(record => {
        const threadId = threadIdForRecord(record);
        if (!threadId || !threadById.has(threadId)) return true;
        return !safeArray(threadById.get(threadId)?.messageIds).includes(record.id);
      })
      .map(record => ({ recordId: record.id, threadId: threadIdForRecord(record) }));

    const noticeRoutingProblems = actionNotices
      .filter(record => !record?.metadata?.actionOptions?.threadId && !threadIdForRecord(record))
      .map(record => record.id);

    const unreadByRecipient = {};
    for (const record of messengerMessages) {
      for (const recipient of safeArray(record.recipients)) {
        if (recipient?.id && record.isUnreadBy?.(recipient.id)) unreadByRecipient[recipient.id] = (unreadByRecipient[recipient.id] || 0) + 1;
      }
    }

    const summary = {
      checkedAt: nowIso(),
      threadCount: threads.length,
      recordCount: records.length,
      messengerRecordCount: messengerRecords.length,
      messengerMessageCount: messengerMessages.length,
      actionNoticeCount: actionNotices.length,
      mutedThreadCount,
      archivedThreadCount,
      oversizedThreads,
      emptyThreads,
      missingMessageRecords,
      duplicateThreadMessageIds,
      orphanMessengerRecords,
      noticeRoutingProblems,
      unreadByRecipient,
      ok: !missingMessageRecords.length && !duplicateThreadMessageIds.length && !orphanMessengerRecords.length && !noticeRoutingProblems.length
    };

    if (includeRecords) {
      summary.records = messengerRecords.map(record => ({
        id: record.id,
        type: record.type,
        sourceFamily: record.sourceFamily,
        threadId: threadIdForRecord(record),
        createdAt: record.createdAt,
        title: record.title || record.body || ''
      }));
    }
    return summary;
  }

  static async compact({ dryRun = true } = {}) {
    if (!game.user?.isGM) return { dryRun, changed: false, reason: 'gm-required', threadsUpdated: 0, removedMissingRefs: 0, removedDuplicates: 0 };
    const [threads, records] = await Promise.all([
      HolonetStorage.getAllThreads(),
      HolonetStorage.getAllRecords()
    ]);
    const recordIds = new Set(records.map(record => record.id).filter(Boolean));
    const changedThreads = [];
    let removedMissingRefs = 0;
    let removedDuplicates = 0;

    for (const thread of threads) {
      const originalIds = safeArray(thread.messageIds).map(String).filter(Boolean);
      const seen = new Set();
      const nextIds = [];
      for (const messageId of originalIds) {
        if (seen.has(messageId)) {
          removedDuplicates += 1;
          continue;
        }
        seen.add(messageId);
        if (!recordIds.has(messageId)) {
          removedMissingRefs += 1;
          continue;
        }
        nextIds.push(messageId);
      }
      if (nextIds.length !== originalIds.length) {
        thread.messageIds = nextIds;
        thread.metadata ??= {};
        thread.metadata.maintenance = {
          ...(thread.metadata.maintenance || {}),
          lastCompactedAt: nowIso(),
          removedMissingRefs,
          removedDuplicates
        };
        changedThreads.push(thread);
      }
    }

    if (!dryRun && changedThreads.length) await HolonetStorage.saveThreads(changedThreads);
    return {
      dryRun,
      changed: Boolean(changedThreads.length),
      threadsUpdated: changedThreads.length,
      removedMissingRefs,
      removedDuplicates,
      threadIds: changedThreads.map(thread => thread.id)
    };
  }

  static async pruneThreadMessages({ keepPerThread = DEFAULT_KEEP_PER_THREAD, olderThanDays = null, dryRun = true, deleteRecords: shouldDeleteRecords = false } = {}) {
    if (!game.user?.isGM) return { dryRun, changed: false, reason: 'gm-required', candidates: [] };
    const keep = clampKeepPerThread(keepPerThread);
    const cutoff = olderThanDays ? Date.now() - (Math.max(1, Number(olderThanDays) || DEFAULT_OLDER_THAN_DAYS) * MS_PER_DAY) : null;
    const [threads, records] = await Promise.all([
      HolonetStorage.getAllThreads(),
      HolonetStorage.getAllRecords()
    ]);
    const recordById = new Map(records.map(record => [record.id, record]).filter(([id]) => id));
    const changedThreads = [];
    const candidates = [];

    for (const thread of threads) {
      const messageIds = safeArray(thread.messageIds).map(String).filter(Boolean);
      if (messageIds.length <= keep && !cutoff) continue;
      const sortedMessageIds = [...messageIds].sort((a, b) => timestamp(recordById.get(a)?.createdAt) - timestamp(recordById.get(b)?.createdAt));
      const excessIds = messageIds.length > keep ? new Set(sortedMessageIds.slice(0, Math.max(0, messageIds.length - keep))) : new Set();
      const removeIds = [];

      for (const messageId of sortedMessageIds) {
        const record = recordById.get(messageId);
        if (!record) continue;
        const oldEnough = cutoff ? timestamp(record.createdAt) < cutoff : false;
        const overLimit = excessIds.has(messageId);
        if (!oldEnough && !overLimit) continue;
        if (!isSafeToPrune(record)) continue;
        removeIds.push(messageId);
      }

      if (!removeIds.length) continue;
      candidates.push({ threadId: thread.id, removeIds, beforeCount: messageIds.length, afterCount: messageIds.length - removeIds.length });
      thread.messageIds = messageIds.filter(messageId => !removeIds.includes(messageId));
      thread.metadata ??= {};
      thread.metadata.maintenance = {
        ...(thread.metadata.maintenance || {}),
        lastPrunedAt: nowIso(),
        keepPerThread: keep,
        olderThanDays: olderThanDays ? Number(olderThanDays) : null,
        prunedRecordIds: [
          ...safeArray(thread.metadata.maintenance?.prunedRecordIds),
          ...removeIds
        ].slice(-1000)
      };
      changedThreads.push(thread);
    }

    if (!dryRun && changedThreads.length) {
      await HolonetStorage.saveThreads(changedThreads);
      if (shouldDeleteRecords) await deleteRecords(candidates.flatMap(entry => entry.removeIds));
      else await HolonetStorage.archiveRecords(candidates.flatMap(entry => entry.removeIds), { archivedBy: 'messenger-maintenance', reason: 'messenger-retention-prune' });
      Hooks.callAll('swseHolonetUpdated', { type: 'messenger-maintenance-pruned', candidates, dryRun: false });
    }

    return {
      dryRun,
      changed: Boolean(candidates.length),
      keepPerThread: keep,
      olderThanDays: olderThanDays ? Number(olderThanDays) : null,
      deleteRecords: Boolean(shouldDeleteRecords),
      threadCount: candidates.length,
      recordCount: candidates.reduce((sum, entry) => sum + entry.removeIds.length, 0),
      candidates
    };
  }

  static async archiveDormantThreads({ olderThanDays = DEFAULT_OLDER_THAN_DAYS, dryRun = true } = {}) {
    if (!game.user?.isGM) return { dryRun, changed: false, reason: 'gm-required', threadIds: [] };
    const cutoff = Date.now() - (Math.max(1, Number(olderThanDays) || DEFAULT_OLDER_THAN_DAYS) * MS_PER_DAY);
    const threads = await HolonetStorage.getAllThreads();
    const changedThreads = [];

    for (const thread of threads) {
      if (isThreadArchivedForEveryParticipant(thread)) continue;
      const lastActivity = timestamp(thread.updatedAt || thread.lastMessageAt || thread.createdAt);
      if (!lastActivity || lastActivity >= cutoff) continue;
      const participants = getThreadParticipants(thread);
      if (!participants.length) continue;
      thread.metadata ??= {};
      thread.metadata.archivedBy ??= {};
      for (const participantId of participants) thread.metadata.archivedBy[participantId] = nowIso();
      thread.metadata.maintenance = {
        ...(thread.metadata.maintenance || {}),
        lastDormantArchiveAt: nowIso(),
        olderThanDays: Number(olderThanDays) || DEFAULT_OLDER_THAN_DAYS
      };
      changedThreads.push(thread);
    }

    if (!dryRun && changedThreads.length) {
      await HolonetStorage.saveThreads(changedThreads);
      Hooks.callAll('swseHolonetUpdated', { type: 'messenger-maintenance-archived-dormant', threadIds: changedThreads.map(thread => thread.id), dryRun: false });
    }

    return {
      dryRun,
      changed: Boolean(changedThreads.length),
      olderThanDays: Number(olderThanDays) || DEFAULT_OLDER_THAN_DAYS,
      threadIds: changedThreads.map(thread => thread.id)
    };
  }

  static async runDryRunProfile(options = {}) {
    const [audit, compact, prune, archiveDormant] = await Promise.all([
      this.audit(),
      this.compact({ dryRun: true }),
      this.pruneThreadMessages({ ...options, dryRun: true }),
      this.archiveDormantThreads({ olderThanDays: options.olderThanDays || DEFAULT_OLDER_THAN_DAYS, dryRun: true })
    ]);
    return { audit, compact, prune, archiveDormant };
  }
}
