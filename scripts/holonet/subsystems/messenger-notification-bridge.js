/**
 * MessengerNotificationBridge
 *
 * Boundary between Messenger records and the broader Holonet alert system.
 * Messenger messages stay the source of truth for thread content; this bridge
 * adds targeted toasts/action notices and centralizes thread routing metadata.
 */

import { HolonetNotification } from '../contracts/holonet-notification.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';
import { HolonetSender } from '../contracts/holonet-sender.js';
import { DELIVERY_STATE, INTENT_TYPE, RECORD_TYPE, SOURCE_FAMILY, SURFACE_TYPE } from '../contracts/enums.js';
import { HolonetDeliveryRouter } from './holonet-delivery-router.js';
import { HolonetNotificationService } from './holonet-notification-service.js';
import { HolonetStorage } from './holonet-storage.js';

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function threadIdForRecord(record = {}) {
  return record?.metadata?.threadId
    || record?.threadId
    || safeArray(record?.projections).find(proj => proj?.metadata?.threadId)?.metadata?.threadId
    || null;
}

function sourceRecordIdForNotice(record = {}) {
  return record?.metadata?.sourceRecordId
    || record?.metadata?.sourceMessageId
    || record?.parentRecordId
    || null;
}

function senderLabel(record = {}) {
  return record?.sender?.actorName
    || record?.sender?.systemLabel
    || record?.sender?.label
    || 'Holonet';
}

function actionLabelForEvent(eventType = '') {
  const normalized = String(eventType || '').trim();
  if (normalized.includes('game-invite')) return 'Open Game Invite';
  if (normalized.includes('transfer')) return 'Open Transfer';
  if (normalized.includes('job')) return 'Open Job Thread';
  return 'Open Thread';
}

async function isMutedThreadForRecipient(threadId, recipientId) {
  if (!threadId || !recipientId) return false;
  try {
    const thread = await HolonetStorage.getThread(threadId);
    return Boolean(thread?.metadata?.mutedBy?.[recipientId]);
  } catch (_err) {
    return false;
  }
}

export class MessengerNotificationBridge {
  static threadIdForRecord(record = {}) {
    return threadIdForRecord(record);
  }

  static sourceRecordIdForNotice(record = {}) {
    return sourceRecordIdForNotice(record);
  }

  static isMessengerRecord(record = {}) {
    return record?.sourceFamily === SOURCE_FAMILY.MESSENGER
      || record?.metadata?.sourceFamily === SOURCE_FAMILY.MESSENGER
      || Boolean(threadIdForRecord(record) && (record?.type === RECORD_TYPE.MESSAGE || record?.metadata?.messengerNotice));
  }

  static async shouldSuppressForRecipient(record, recipientId = HolonetDeliveryRouter.getCurrentRecipientId()) {
    if (!recipientId || !this.isMessengerRecord(record)) return false;
    return isMutedThreadForRecipient(threadIdForRecord(record), recipientId);
  }

  static async notifyLocalMessengerRecord(record, recipientId = HolonetDeliveryRouter.getCurrentRecipientId()) {
    if (!record || !recipientId || !this.isMessengerRecord(record)) return false;
    if (record?.type !== RECORD_TYPE.MESSAGE) return false;
    if (!record?.isUnreadBy?.(recipientId)) return false;
    if (record?.metadata?.systemEvent && !record?.metadata?.gameInvite && !record?.metadata?.creditTransfer && !record?.metadata?.itemTransfer && !record?.metadata?.assetTransfer && !record?.metadata?.jobCard) return false;
    if (await this.shouldSuppressForRecipient(record, recipientId)) return false;
    const title = record?.metadata?.gameInvite ? 'Game invite received'
      : record?.metadata?.creditTransfer ? 'Credit transfer update'
      : record?.metadata?.itemTransfer ? 'Item transfer update'
      : record?.metadata?.assetTransfer ? 'Asset transfer update'
      : record?.metadata?.jobCard ? 'Job board update'
      : `New message from ${senderLabel(record)}`;
    HolonetNotificationService.toast({
      ...record,
      title,
      body: title,
      level: record?.metadata?.urgent ? 'warning' : 'info'
    });
    return true;
  }

  static createActionNotice({ thread, sourceRecord = null, title = '', body = '', eventType = '', level = 'info', intent = INTENT_TYPE.SYSTEM_NEW_MESSAGE, recipients = null, actionLabel = '' } = {}) {
    const threadId = thread?.id || threadIdForRecord(sourceRecord);
    const targetRecipients = safeArray(recipients).length ? safeArray(recipients) : safeArray(thread?.participants);
    const recipientIds = targetRecipients.map(r => r?.id).filter(Boolean);
    const notice = new HolonetNotification({
      sourceFamily: SOURCE_FAMILY.MESSENGER,
      sourceId: sourceRecord?.id ?? threadId ?? null,
      threadId,
      parentRecordId: sourceRecord?.id ?? null,
      intent,
      level,
      sender: HolonetSender.system('Holonet Alerts'),
      audience: HolonetAudience.threadParticipants(recipientIds),
      title: title || 'Messenger Alert',
      body: body || title || 'Messenger Alert',
      metadata: {
        categoryId: 'messages',
        sourceFamily: SOURCE_FAMILY.MESSENGER,
        messengerNotice: true,
        eventType: eventType || sourceRecord?.metadata?.eventType || '',
        threadId,
        sourceRecordId: sourceRecord?.id ?? null,
        sourceMessageId: sourceRecord?.id ?? null,
        actionSurface: 'messenger',
        actionLabel: actionLabel || actionLabelForEvent(eventType || sourceRecord?.metadata?.eventType || ''),
        actionOptions: {
          threadId,
          recordId: sourceRecord?.id ?? null,
          source: 'holonet-notice'
        }
      },
      projections: [
        { surfaceType: SURFACE_TYPE.NOTIFICATION_BUBBLE, recordId: null, isPinned: false, metadata: { threadId, sourceRecordId: sourceRecord?.id ?? null } },
        { surfaceType: SURFACE_TYPE.HOME_FEED, recordId: null, isPinned: false, metadata: { threadId, sourceRecordId: sourceRecord?.id ?? null } }
      ],
      actionLabel: actionLabel || actionLabelForEvent(eventType || sourceRecord?.metadata?.eventType || '')
    });
    notice.recipients = targetRecipients;
    notice.projections = notice.projections.map(proj => ({ ...proj, recordId: notice.id }));
    return notice;
  }

  static async publishActionNotice(options = {}) {
    const notice = this.createActionNotice(options);
    const { HolonetEngine } = await import('../holonet-engine.js');
    await HolonetEngine.publish(notice, { skipSocket: true });
    return notice;
  }

  static async filterMutedRecords(records = [], recipientId = HolonetDeliveryRouter.getCurrentRecipientId()) {
    const result = [];
    for (const record of safeArray(records)) {
      if (!(await this.shouldSuppressForRecipient(record, recipientId))) result.push(record);
    }
    return result;
  }

  static routeOptionsForRecord(record = {}) {
    const threadId = record?.metadata?.actionOptions?.threadId || threadIdForRecord(record);
    const recordId = record?.metadata?.actionOptions?.recordId || sourceRecordIdForNotice(record) || record?.id || null;
    return {
      surface: 'messenger',
      options: {
        threadId,
        highlightRecordId: recordId,
        source: 'holonet-notice'
      }
    };
  }
}
