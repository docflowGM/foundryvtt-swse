/**
 * Holonet Notice Center Service
 *
 * Shared view-model builder for datapad alert bubbles and the shell notification drawer.
 */

import { HolonetStorage } from './holonet-storage.js';
import { HolonetDeliveryRouter } from './holonet-delivery-router.js';
import { HolonetMarkupService } from './holonet-markup-service.js';
import { DELIVERY_STATE, SOURCE_FAMILY } from '../contracts/enums.js';
import { MessengerNotificationBridge } from './messenger-notification-bridge.js';
import { HolonetEngine } from '../holonet-engine.js';

function formatTimestamp(value) {
  if (!value) return null;
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function previewText(value = '', length = 120) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= length) return text;
  return `${text.slice(0, Math.max(0, length - 1)).trimEnd()}…`;
}

function sourceIcon(record) {
  switch (record?.sourceFamily) {
    case SOURCE_FAMILY.MENTOR: return '✶';
    case SOURCE_FAMILY.MESSENGER: return '✉';
    case SOURCE_FAMILY.STORE: return '¤';
    case SOURCE_FAMILY.APPROVALS: return '✓';
    case SOURCE_FAMILY.PROGRESSION: return '▲';
    case SOURCE_FAMILY.BULLETIN:
    case SOURCE_FAMILY.GM_AUTHORED:
      return '◎';
    default:
      return '◇';
  }
}

function sourceLabel(record) {
  return record?.sender?.actorName || record?.sender?.systemLabel || record?.sender?.label || 'Holonet';
}

function categoryLabel(record) {
  const category = record?.metadata?.category || record?.sourceFamily || 'update';
  return String(category).replace(/[_-]+/g, ' ').toUpperCase();
}

export class HolonetNoticeCenterService {
  static currentRecipientId() {
    return HolonetDeliveryRouter.getCurrentRecipientId();
  }

  static async getUnreadRecords(recipientId = this.currentRecipientId(), limit = 24) {
    if (!recipientId) return [];
    // Phase 3: Use index-backed getUnreadRecordsForRecipient for better performance
    const records = await HolonetStorage.getUnreadRecordsForRecipient(recipientId, {
      deliveryStates: [DELIVERY_STATE.PUBLISHED]
    });
    const visibleRecords = await MessengerNotificationBridge.filterMutedRecords(records, recipientId);
    return visibleRecords
      .sort((a, b) => new Date(b.publishedAt || b.createdAt || 0) - new Date(a.publishedAt || a.createdAt || 0))
      .slice(0, limit);
  }

  static mapNotice(record, recipientId) {
    const body = record?.body || record?.title || '';
    const threadId = MessengerNotificationBridge.threadIdForRecord(record);
    const sourceRecordId = MessengerNotificationBridge.sourceRecordIdForNotice(record);
    return {
      id: record.id,
      title: record.title || categoryLabel(record),
      sender: sourceLabel(record),
      category: categoryLabel(record),
      icon: sourceIcon(record),
      timestamp: formatTimestamp(record.publishedAt || record.createdAt),
      previewText: previewText(body, 120),
      previewHtml: HolonetMarkupService.preview(body, 120),
      isUnread: recipientId ? Boolean(record.isUnreadBy?.(recipientId)) : false,
      sourceFamily: record.sourceFamily || 'system',
      threadId,
      sourceRecordId,
      actionSurface: record?.metadata?.actionSurface || (threadId ? 'messenger' : null),
      actionLabel: record?.metadata?.actionLabel || (threadId ? 'Open Thread' : null)
    };
  }


  static _summarizeUnreadRecords(records = []) {
    const unread = Array.isArray(records) ? records : [];
    const summary = {
      total: unread.length,
      messages: unread.filter(r => r.type === 'message').length,
      notifications: unread.filter(r => r.type === 'notification').length,
      events: unread.filter(r => r.type === 'event').length,
      requests: unread.filter(r => r.type === 'request').length,
      transactions: unread.filter(r => String(r.intent).startsWith('system.transaction_')).length,
      approvals: unread.filter(r => String(r.intent).includes('approval')).length,
      mentor: unread.filter(r => r.sourceFamily === SOURCE_FAMILY.MENTOR).length,
      bySourceFamily: unread.reduce((acc, record) => {
        const key = record.sourceFamily || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {})
    };
    return summary;
  }

  static async buildCenterVm({ actor = null, limit = 18, previewLimit = 3 } = {}) {
    const recipientId = this.currentRecipientId();
    const unreadRecords = await this.getUnreadRecords(recipientId, limit);
    const unreadSummary = this._summarizeUnreadRecords(unreadRecords);

    const notices = unreadRecords.map(record => this.mapNotice(record, recipientId));
    const preview = notices.slice(0, previewLimit);

    const chips = [];
    if ((unreadSummary?.messages ?? 0) > 0) chips.push({ key: 'messages', label: 'MSG', count: unreadSummary.messages });
    if ((unreadSummary?.transactions ?? 0) > 0) chips.push({ key: 'transactions', label: 'STORE', count: unreadSummary.transactions });
    if ((unreadSummary?.mentor ?? 0) > 0) chips.push({ key: 'mentor', label: 'MENTOR', count: unreadSummary.mentor });
    if ((unreadSummary?.approvals ?? 0) > 0 && game.user?.isGM) chips.push({ key: 'approvals', label: 'APPROVAL', count: unreadSummary.approvals });

    return {
      title: 'Holonet Alerts',
      recipientId,
      totalUnread: unreadSummary?.total ?? 0,
      chips,
      notices,
      preview,
      actorName: actor?.name ?? null,
      hasNotices: notices.length > 0
    };
  }

  static async markAllRead(recipientId = this.currentRecipientId()) {
    if (!recipientId) return false;
    const unreadRecords = await this.getUnreadRecords(recipientId, 500);
    if (!unreadRecords.length) return true;
    // Delegate to batch path — single storage write and single sync event
    return HolonetEngine.markManyRead(unreadRecords.map(r => r.id), recipientId);
  }

  /**
   * Batch-mark all unread records read for a recipient.
   * More explicit alias that makes the batch nature clear at call sites.
   *
   * @param {string} [recipientId]
   * @returns {Promise<boolean>}
   */
  static async markAllReadBatch(recipientId = this.currentRecipientId()) {
    return this.markAllRead(recipientId);
  }
}
