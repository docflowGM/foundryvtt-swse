// scripts/chat/swse-chat.js

import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { SWSERollEngine } from "/systems/foundryvtt-swse/scripts/engine/rolls/swse-roll-engine.js";

function stripHtml(value = '') {
  const text = String(value ?? '');
  if (!text) return '';
  const div = document.createElement('div');
  div.innerHTML = text;
  return (div.textContent || div.innerText || '').trim();
}

function truncateText(value = '', max = 160) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`;
}

function formatTime(value = null) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function normalizePriority(value = '') {
  const v = String(value || '').toLowerCase();
  if (['urgent', 'critical', 'danger', 'error'].includes(v)) return 'urgent';
  if (['alert', 'warning', 'warn'].includes(v)) return 'alert';
  if (['secure', 'private', 'encrypted'].includes(v)) return 'secure';
  return 'normal';
}

function labelForPriority(value = '') {
  const p = normalizePriority(value);
  if (p === 'urgent') return 'Urgent';
  if (p === 'alert') return 'Alert';
  if (p === 'secure') return 'Secure';
  return 'Incoming';
}

function sourceForRecord(record = {}) {
  const source = String(record?.sourceFamily || record?.metadata?.source || record?.sender?.type || '').toLowerCase();
  if (source.includes('npc') || record?.sender?.type === 'actor') return 'npc';
  if (source.includes('gm') || source.includes('system')) return 'gm';
  return 'holonet';
}

function senderNameForRecord(record = {}) {
  return record?.metadata?.senderName
    || record?.metadata?.from
    || record?.sender?.actorName
    || record?.sender?.systemLabel
    || record?.sender?.label
    || record?.sourceFamily
    || 'Holonet Relay';
}

function actorIdForRecord(record = {}) {
  const recipientActor = record?.recipients?.find?.(r => r?.actorId)?.actorId;
  return record?.metadata?.actorId || recipientActor || record?.sender?.actorId || null;
}

function whisperUsersForRecipients(recipients = []) {
  const ids = new Set();
  for (const recipient of recipients ?? []) {
    if (recipient?.userId) ids.add(recipient.userId);
    const stableId = String(recipient?.id || '');
    if (stableId.startsWith('player:')) ids.add(stableId.slice('player:'.length));
    if (stableId.startsWith('gm:')) {
      const gmId = stableId.slice('gm:'.length);
      if (gmId) ids.add(gmId);
      else game.users?.filter?.(u => u.isGM).forEach(u => ids.add(u.id));
    }
    if (stableId === 'gm') game.users?.filter?.(u => u.isGM).forEach(u => ids.add(u.id));
  }
  return [...ids].filter(Boolean);
}

function normalizeReceiptSourceType(value = '') {
  const v = String(value || '').toLowerCase();
  if (['approval', 'approved', 'custom-approval', 'gm-approval'].includes(v)) return 'approval';
  if (['denial', 'denied', 'custom-denial', 'gm-denial'].includes(v)) return 'denial';
  if (['credit-transfer', 'transfer', 'sent', 'received'].includes(v)) return 'credit-transfer';
  if (['credit-grant', 'grant', 'reward', 'payout'].includes(v)) return 'credit-grant';
  if (['refund', 'resale', 'sell', 'sale'].includes(v)) return 'refund';
  if (['party-fund', 'party', 'fund'].includes(v)) return 'party-fund';
  return 'purchase';
}

function normalizeDeltaDirection(value = '', delta = 0) {
  const v = String(value || '').toLowerCase();
  if (['positive', 'gain', 'received', 'credit'].includes(v)) return 'positive';
  if (['negative', 'spent', 'debit', 'cost'].includes(v)) return 'negative';
  if (['neutral', 'none', 'zero'].includes(v)) return 'neutral';
  const n = Number(delta);
  if (Number.isFinite(n)) {
    if (n > 0) return 'positive';
    if (n < 0) return 'negative';
  }
  return 'neutral';
}

function formatCredits(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return Math.trunc(n).toLocaleString();
}

function formatSignedCredits(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return '±0';
  const sign = n > 0 ? '+' : '−';
  return `${sign}${Math.abs(Math.trunc(n)).toLocaleString()}`;
}

function receiptKindLabel(sourceType = '') {
  switch (normalizeReceiptSourceType(sourceType)) {
    case 'approval': return 'Approved';
    case 'denial': return 'Denied';
    case 'credit-transfer': return 'Transfer';
    case 'credit-grant': return 'Grant';
    case 'refund': return 'Refund';
    case 'party-fund': return 'Party Fund';
    default: return 'Purchase';
  }
}

function receiptMastLabel(sourceType = '') {
  switch (normalizeReceiptSourceType(sourceType)) {
    case 'approval': return 'Approved · GM';
    case 'denial': return 'Denied · GM';
    case 'credit-transfer': return 'Transfer · Credits';
    case 'credit-grant': return 'Grant · Credits';
    case 'refund': return 'Receipt · Refund';
    case 'party-fund': return 'Party · Fund';
    default: return 'Receipt · Purchase';
  }
}

function receiptIconClass(sourceType = '') {
  switch (normalizeReceiptSourceType(sourceType)) {
    case 'approval': return 'fas fa-check-circle';
    case 'denial': return 'fas fa-ban';
    case 'credit-transfer': return 'fas fa-right-left';
    case 'credit-grant': return 'fas fa-circle-plus';
    case 'refund': return 'fas fa-rotate-left';
    case 'party-fund': return 'fas fa-coins';
    default: return 'fas fa-credit-card';
  }
}

function actorOwnerUserIds(actor, { includeGM = false } = {}) {
  const ids = new Set();
  if (actor?.ownership) {
    for (const [userId, level] of Object.entries(actor.ownership)) {
      if (userId !== 'default' && Number(level) >= 3) ids.add(userId);
    }
  }
  game.users?.forEach?.(user => {
    if (user?.character?.id === actor?.id) ids.add(user.id);
    if (includeGM && user?.isGM) ids.add(user.id);
  });
  return [...ids].filter(Boolean);
}

/**
 * SWSEChat
 *
 * Centralizes chat output so message creation is v13+ explicit and consistent.
 *
 * Rules:
 * - All rolls render through postRoll() with holo template.
 * - Non-roll messages should use postHTML() or the named card helpers below.
 * - Single roll pipeline: postRoll() → holo-roll.hbs → ChatMessage.create()
 */
export class SWSEChat {
  static speaker({ actor = null, token = null, alias = null } = {}) {
    return ChatMessage.getSpeaker({ actor, token, alias });
  }

  static async postRoll({
    roll,
    actor = null,
    token = null,
    speaker = null,
    flavor = '',
    flags = {},
    rollMode = null,
    whisper = null,
    blind = false,
    context = {}
  } = {}) {
    if (!roll) {throw new Error('SWSEChat.postRoll requires a Roll.');}

    // Build structured roll data for holo rendering
    const holoData = SWSERollEngine.buildHoloRollData({
      roll,
      actor,
      flavor,
      context
    });

    // Render holo roll template
    const content = await foundry.applications.handlebars.renderTemplate(
      'systems/foundryvtt-swse/templates/chat/holo-roll.hbs',
      holoData
    );

    const msgSpeaker = speaker ?? this.speaker({ actor, token });

    const eventId = holoData?.eventContext?.eventId || context?.eventId || context?.attackEventId || flags?.swse?.eventId || null;

    const messageData = {
      user: game.user.id,
      speaker: msgSpeaker,
      content,
      flags: {
        ...flags,
        swse: { ...(flags?.swse || {}), holo: true, ...(eventId ? { eventId } : {}) }
      },
      blind,
      rolls: [roll.toJSON()]
    };

    if (Array.isArray(whisper)) {messageData.whisper = whisper;}
    if (rollMode) {messageData.rollMode = rollMode;}

    return createChatMessage(messageData);
  }

  static async postHTML({
    content,
    actor = null,
    token = null,
    speaker = null,
    style = CONST.CHAT_MESSAGE_STYLES.OTHER,
    flags = {},
    whisper = null,
    blind = false,
    sound = null
  } = {}) {
    const msgSpeaker = speaker ?? this.speaker({ actor, token });

    const messageData = {
      user: game.user.id,
      speaker: msgSpeaker,
      content,
      style,
      flags,
      blind
    };

    if (sound) {messageData.sound = sound;}
    if (Array.isArray(whisper)) {messageData.whisper = whisper;}

    return createChatMessage(messageData);
  }

  static async postDialogue({
    body = '',
    actor = null,
    token = null,
    speaker = null,
    typeLabel = 'Dialogue',
    whisper = null,
    blind = false,
    flags = {},
    style = CONST.CHAT_MESSAGE_STYLES.IC
  } = {}) {
    const msgSpeaker = speaker ?? this.speaker({ actor, token });
    const speakerName = msgSpeaker?.alias || actor?.name || game.user?.name || 'Unknown Speaker';
    const content = await foundry.applications.handlebars.renderTemplate(
      'systems/foundryvtt-swse/templates/chat/dialogue-card.hbs',
      {
        body,
        speakerName,
        typeLabel,
        timeLabel: formatTime()
      }
    );

    return this.postHTML({
      content,
      actor,
      token,
      speaker: msgSpeaker,
      style,
      whisper,
      blind,
      flags: { ...flags, swse: { ...(flags?.swse || {}), dialogueCard: true } }
    });
  }

  static buildHolonetCardData(record = {}, options = {}) {
    const metadata = record?.metadata ?? {};
    const priority = normalizePriority(options.priority || metadata.priority || metadata.level || record.priority);
    const senderName = options.senderName || senderNameForRecord(record);
    const subject = options.subject || record.title || metadata.subject || 'Incoming Transmission';
    const body = options.preview || record.body || metadata.body || '';
    const threadId = options.threadId || record.threadId || record.threadContext?.threadId || metadata.threadId || '';
    const source = options.source || sourceForRecord(record);
    const attachmentCount = Number(options.attachmentCount ?? record.attachments?.length ?? metadata.attachments?.length ?? metadata.attachmentCount ?? 0) || 0;

    return {
      recordId: options.recordId || record.id || '',
      threadId,
      actorId: options.actorId || actorIdForRecord(record),
      priority,
      priorityLabel: options.priorityLabel || labelForPriority(priority),
      source,
      mastLabel: options.mastLabel || (priority === 'urgent' ? 'Incoming · Priority' : priority === 'secure' ? 'Encrypted · Secure' : 'Incoming · Transmission'),
      channelLabel: options.channelLabel || metadata.channel || metadata.category || metadata.threadType || (threadId ? 'Direct Thread' : 'Holonet'),
      relayLabel: options.relayLabel || metadata.relay || metadata.channelId || '',
      senderName,
      subject,
      preview: truncateText(stripHtml(body), 180),
      attachmentCount,
      unread: options.unread ?? true,
      actionLabel: options.actionLabel || 'Open<br/>Holochat',
      timeLabel: options.timeLabel || formatTime(record.publishedAt || record.createdAt || null)
    };
  }

  static async postHolonetCard({ record = null, actor = null, token = null, speaker = null, whisper = null, flags = {}, options = {} } = {}) {
    if (!record) {throw new Error('SWSEChat.postHolonetCard requires a Holonet record.');}
    const data = this.buildHolonetCardData(record, options);
    const content = await foundry.applications.handlebars.renderTemplate(
      'systems/foundryvtt-swse/templates/chat/holonet-card.hbs',
      data
    );
    const resolvedWhisper = Array.isArray(whisper) ? whisper : whisperUsersForRecipients(record.recipients ?? []);

    return this.postHTML({
      content,
      actor,
      token,
      speaker,
      whisper: resolvedWhisper,
      flags: {
        ...flags,
        swse: {
          ...(flags?.swse || {}),
          holonetCard: true,
          holonetRecordId: data.recordId,
          holonetThreadId: data.threadId
        }
      }
    });
  }

  static buildStoreReceiptCardData(receipt = {}) {
    const sourceType = normalizeReceiptSourceType(receipt.sourceType || receipt.type || receipt.kind);
    const delta = Number(receipt.delta ?? receipt.amount ?? 0) || 0;
    const direction = normalizeDeltaDirection(receipt.deltaDirection, delta);
    const previous = Number(receipt.previousBalance ?? receipt.previous ?? 0) || 0;
    const newBalance = Number(receipt.newBalance ?? receipt.balance ?? receipt.after ?? previous + delta) || 0;
    const actor = receipt.actor || null;
    const transactionId = receipt.transactionId || receipt.id || `tx_${Date.now()}`;
    const items = Array.isArray(receipt.items) ? receipt.items : [];

    return {
      transactionId,
      sourceType,
      deltaDirection: direction,
      kindLabel: receipt.kindLabel || receiptKindLabel(sourceType),
      mastLabel: receipt.mastLabel || receiptMastLabel(sourceType),
      iconClass: receipt.iconClass || receiptIconClass(sourceType),
      vendorLabel: receipt.vendorLabel || receipt.sourceLabel || 'Galactic Treasury',
      title: receipt.title || 'Credit transaction',
      items,
      itemSummary: receipt.itemSummary || items.map(item => item?.quantity && item.quantity > 1 ? `${item.quantity}× ${item.name}` : item?.name).filter(Boolean).join(' · '),
      reason: receipt.reason || receipt.note || '',
      previousLabel: receipt.previousLabel || 'Previous',
      newLabel: receipt.newLabel || (direction === 'neutral' ? 'Balance' : 'New Balance'),
      deltaLabel: receipt.deltaLabel || (direction === 'positive' ? 'received' : direction === 'negative' ? 'spent' : 'no change'),
      previousBalance: previous,
      newBalance,
      previousBalanceText: formatCredits(previous),
      newBalanceText: formatCredits(newBalance),
      delta,
      deltaText: formatSignedCredits(delta),
      actorId: receipt.actorId || actor?.id || '',
      actorName: receipt.actorName || actor?.name || '',
      fromName: receipt.fromName || '',
      toName: receipt.toName || '',
      decidedBy: receipt.decidedBy || '',
      timeLabel: receipt.timeLabel || formatTime(receipt.timestamp || null),
      actions: Array.isArray(receipt.actions) ? receipt.actions : []
    };
  }

  static actorOwnerWhisper(actor, options = {}) {
    return actorOwnerUserIds(actor, options);
  }

  static async postStoreReceipt({ receipt = null, actor = null, token = null, speaker = null, whisper = null, flags = {} } = {}) {
    if (!receipt) {throw new Error('SWSEChat.postStoreReceipt requires receipt data.');}
    const data = this.buildStoreReceiptCardData({ ...receipt, actor: receipt.actor || actor });
    const content = await foundry.applications.handlebars.renderTemplate(
      'systems/foundryvtt-swse/templates/chat/store-receipt.hbs',
      data
    );
    const resolvedWhisper = Array.isArray(whisper) ? whisper : actorOwnerUserIds(actor || receipt.actor, { includeGM: false });

    return this.postHTML({
      content,
      actor: actor || receipt.actor || null,
      token,
      speaker,
      whisper: resolvedWhisper,
      flags: {
        ...flags,
        swse: {
          ...(flags?.swse || {}),
          storeReceipt: true,
          storeTransactionId: data.transactionId,
          storeSourceType: data.sourceType
        }
      }
    });
  }

  static async postCombatBanner({ combat = null, round = null, turnName = '', actor = null, whisper = null } = {}) {
    const resolvedRound = Number.isFinite(Number(round)) ? Number(round) : Number(combat?.round ?? 0);
    const resolvedTurnName = turnName || combat?.combatant?.actor?.name || combat?.combatant?.name || actor?.name || 'Unknown Combatant';
    const content = await foundry.applications.handlebars.renderTemplate(
      'systems/foundryvtt-swse/templates/chat/combat-banner.hbs',
      { round: resolvedRound, turnName: resolvedTurnName }
    );

    return this.postHTML({
      content,
      actor,
      whisper,
      flags: { swse: { combatBanner: true, round: resolvedRound, turnName: resolvedTurnName } }
    });
  }

}
