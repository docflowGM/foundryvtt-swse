// scripts/chat/swse-chat.js

import { createChatMessage } from "/systems/foundryvtt-swse/scripts/core/document-api-v13.js";
import { SWSERollEngine } from "/systems/foundryvtt-swse/scripts/engine/rolls/swse-roll-engine.js";
import { showHolopadRollCompanion } from "/systems/foundryvtt-swse/scripts/ui/shell/roll-companion.js";



function chatI18n(key, data = {}, fallback = '') {
  const i18n = globalThis.game?.i18n;
  try {
    const localized = data && Object.keys(data).length > 0
      ? i18n?.format?.(key, data)
      : i18n?.localize?.(key);
    return localized && localized !== key ? localized : (fallback || key);
  } catch (_err) {
    return fallback || key;
  }
}

function sanitizeRollContextForChat(context = {}) {
  const safe = { ...(context ?? {}) };
  delete safe.sourceElement;
  delete safe.companionSource;
  delete safe.sheet;
  delete safe.application;
  delete safe.app;
  delete safe.event;
  delete safe.domEvent;
  return safe;
}

function resolveRollCompanionSource(context = {}) {
  return context?.companionSource
    ?? context?.sourceElement
    ?? context?.event?.currentTarget
    ?? context?.domEvent?.currentTarget
    ?? context?.sheet
    ?? context?.application
    ?? context?.app
    ?? null;
}

function shouldShowRollCompanion(context = {}) {
  return context?.showRollCompanion !== false
    && context?.showDatapadRollCompanion !== false
    && context?.showHolopadRollCompanion !== false;
}

function showDatapadRollCompanionForChat({ source = null, roll = null, actor = null, message = null, holoData = null, context = {} } = {}) {
  if (!shouldShowRollCompanion(context)) return;
  try {
    showHolopadRollCompanion(source, {
      ...(holoData ?? {}),
      roll,
      actor,
      total: roll?.total ?? holoData?.total,
      chatMessageId: message?.id ?? holoData?.chatMessageId ?? null,
      messageId: message?.id ?? null,
      context: holoData?.context ?? context
    }, {
      actor,
      sourceElement: context?.sourceElement ?? context?.companionSource ?? null,
      companionSource: source,
      sheet: context?.sheet ?? null,
      application: context?.application ?? context?.app ?? null,
      kind: holoData?.category ?? context?.type ?? context?.kind,
      title: holoData?.actionTitle ?? holoData?.title,
      itemName: context?.itemName ?? context?.weapon?.name ?? context?.item?.name ?? context?.sourceItem?.name,
      abilityKey: holoData?.abilityKey ?? context?.abilityKey ?? context?.ability,
      skillKey: context?.skillKey ?? context?.skill,
      forceDescriptor: holoData?.forceDescriptor ?? context?.forceDescriptor ?? context?.descriptor,
      railColor: holoData?.railColor ?? holoData?.weaponVisual?.colorHex ?? context?.railColor,
      weapon: context?.weapon ?? context?.item ?? context?.sourceItem,
      weaponVisual: holoData?.weaponVisual ?? context?.weaponVisual,
      dc: context?.dc ?? context?.targetDefense,
      damageType: holoData?.damageType ?? context?.damageType
    });
  } catch (err) {
    console.warn('SWSE | Roll companion display failed', err);
  }
}

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
  if (p === 'urgent') return chatI18n('SWSE.Chat.Holonet.Urgent', {}, 'Urgent');
  if (p === 'alert') return chatI18n('SWSE.Chat.Holonet.Alert', {}, 'Alert');
  if (p === 'secure') return chatI18n('SWSE.Chat.Holonet.Secure', {}, 'Secure');
  return chatI18n('SWSE.Chat.Holonet.Incoming', {}, 'Incoming');
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
    || chatI18n('SWSE.Chat.Holonet.HolonetRelay', {}, 'Holonet Relay');
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
    case 'approval': return chatI18n('SWSE.Chat.Holonet.Approved', {}, 'Approved');
    case 'denial': return chatI18n('SWSE.Chat.Holonet.Denied', {}, 'Denied');
    case 'credit-transfer': return chatI18n('SWSE.Chat.Holonet.Transfer', {}, 'Transfer');
    case 'credit-grant': return chatI18n('SWSE.Chat.Holonet.Grant', {}, 'Grant');
    case 'refund': return chatI18n('SWSE.Chat.Holonet.Refund', {}, 'Refund');
    case 'party-fund': return chatI18n('SWSE.Chat.Holonet.PartyFund', {}, 'Party Fund');
    default: return chatI18n('SWSE.Chat.Holonet.Purchase', {}, 'Purchase');
  }
}

function receiptMastLabel(sourceType = '') {
  switch (normalizeReceiptSourceType(sourceType)) {
    case 'approval': return chatI18n('SWSE.Chat.Receipt.ApprovedGM', {}, 'Approved · GM');
    case 'denial': return chatI18n('SWSE.Chat.Receipt.DeniedGM', {}, 'Denied · GM');
    case 'credit-transfer': return chatI18n('SWSE.Chat.Receipt.TransferCredits', {}, 'Transfer · Credits');
    case 'credit-grant': return chatI18n('SWSE.Chat.Receipt.GrantCredits', {}, 'Grant · Credits');
    case 'refund': return chatI18n('SWSE.Chat.Receipt.ReceiptRefund', {}, 'Receipt · Refund');
    case 'party-fund': return chatI18n('SWSE.Chat.Receipt.PartyFund', {}, 'Party · Fund');
    default: return chatI18n('SWSE.Chat.Receipt.ReceiptPurchase', {}, 'Receipt · Purchase');
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



function normalizeCombatStatusForChat(status = {}) {
  const cover = String(status?.cover || 'none');
  const defensiveMode = String(status?.defensiveMode || 'normal');
  const coverLabels = {
    none: chatI18n('SWSE.Chat.Combat.NoCover', {}, 'No Cover'),
    partial: chatI18n('SWSE.Chat.Combat.PartialCover', {}, 'Partial Cover'),
    cover: chatI18n('SWSE.Chat.Combat.CoverBonus', {}, 'Cover (+5 Reflex)'),
    improved: chatI18n('SWSE.Chat.Combat.EnhancedCover', {}, 'Enhanced Cover (+10 Reflex)'),
    total: chatI18n('SWSE.Chat.Combat.TotalCoverBlocked', {}, 'Total Cover / Blocked')
  };
  const defensiveLabels = {
    normal: chatI18n('SWSE.Chat.Combat.Normal', {}, 'Normal'),
    fightingDefensively: chatI18n('SWSE.Chat.Combat.FightingDefensively', {}, 'Fighting Defensively (+2 Reflex / -5 attacks)'),
    fullDefense: chatI18n('SWSE.Chat.Combat.FullDefense', {}, 'Full Defense (+5 Reflex / attacks locked)')
  };
  const chips = [];
  if (cover !== 'none') chips.push({ label: coverLabels[cover] || cover, tone: cover === 'total' ? 'danger' : 'info' });
  if (defensiveMode !== 'normal') chips.push({ label: defensiveLabels[defensiveMode] || defensiveMode, tone: defensiveMode === 'fullDefense' ? 'warning' : 'info' });
  if (status?.prone === true) chips.push({ label: chatI18n('SWSE.Chat.Combat.ProneStatus', {}, 'Prone (+5 vs ranged / -5 vs melee)'), tone: 'warning' });
  return {
    cover,
    defensiveMode,
    prone: status?.prone === true,
    coverLabel: coverLabels[cover] || coverLabels.none,
    defensiveModeLabel: defensiveLabels[defensiveMode] || defensiveLabels.normal,
    chips
  };
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

    const companionSource = resolveRollCompanionSource(context);
    const renderContext = sanitizeRollContextForChat(context);

    // Build structured roll data for holo rendering
    const holoData = SWSERollEngine.buildHoloRollData({
      roll,
      actor,
      flavor,
      context: renderContext
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

    const message = await createChatMessage(messageData);
    showDatapadRollCompanionForChat({
      source: companionSource,
      roll,
      actor,
      message,
      holoData,
      context
    });
    return message;
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


  static async postNarration({
    body = '',
    actor = null,
    token = null,
    speaker = null,
    whisper = null,
    blind = false,
    flags = {},
    style = CONST.CHAT_MESSAGE_STYLES.OTHER
  } = {}) {
    const msgSpeaker = speaker ?? this.speaker({ actor, token });
    const speakerName = msgSpeaker?.alias || actor?.name || '';
    const content = await foundry.applications.handlebars.renderTemplate(
      'systems/foundryvtt-swse/templates/chat/narration-card.hbs',
      { body, speakerName }
    );

    return this.postHTML({
      content,
      actor,
      token,
      speaker: msgSpeaker,
      style,
      whisper,
      blind,
      flags: { ...flags, swse: { ...(flags?.swse || {}), narrationCard: true } }
    });
  }

  static buildHolonetCardData(record = {}, options = {}) {
    const metadata = record?.metadata ?? {};
    const priority = normalizePriority(options.priority || metadata.priority || metadata.level || record.priority);
    const senderName = options.senderName || senderNameForRecord(record);
    const subject = options.subject || record.title || metadata.subject || chatI18n('SWSE.Chat.Holonet.IncomingTransmissionSubject', {}, 'Incoming Transmission');
    const body = options.preview || record.body || metadata.body || '';
    const threadId = options.threadId || record.threadId || record.threadContext?.threadId || metadata.threadId || '';
    const source = options.source || sourceForRecord(record);
    const attachmentCount = Number(options.attachmentCount ?? record.attachments?.length ?? metadata.attachments?.length ?? metadata.attachmentCount ?? 0) || 0;

    const sourceFamily = String(record.sourceFamily || metadata.sourceFamily || '').toLowerCase();
    const action = options.action || (threadId ? 'open-thread' : sourceFamily === 'bulletin' ? 'open-bulletin' : 'open-record');
    const transfer = metadata.creditTransfer || null;
    const memo = String(transfer?.memo || '').replace(/\s+/g, ' ').trim();
    const memoPreview = memo ? (memo.length > 15 ? `${memo.slice(0, 15)}…` : memo) : '';
    const creditAction = transfer ? {
      isRequest: transfer.kind === 'creditRequest',
      recordId: options.recordId || record.id || '',
      threadId,
      actorLabel: transfer.kind === 'creditRequest' ? (transfer.requesterLabel || senderName) : (transfer.fromLabel || senderName),
      verb: transfer.kind === 'creditRequest' ? chatI18n('SWSE.Chat.Holonet.Requests', {}, 'requests') : chatI18n('SWSE.Chat.Holonet.Sent', {}, 'sent'),
      amountLabel: `${Number(transfer.amount || transfer.totalAmount || 0).toLocaleString()} cr`,
      memoPreview,
      primaryAction: transfer.kind === 'creditRequest' ? 'pay-credit-request' : 'accept-transfer',
      primaryLabel: transfer.kind === 'creditRequest' ? chatI18n('SWSE.Chat.Holonet.Pay', {}, 'Pay') : chatI18n('SWSE.Chat.Holonet.Deposit', {}, 'Deposit'),
      declineAction: transfer.kind === 'creditRequest' ? 'decline-credit-request' : 'decline-transfer'
    } : null;
    const itemTransfer = metadata.itemTransfer || null;
    const assetTransfer = metadata.assetTransfer || null;
    const materialTransfer = itemTransfer || assetTransfer;
    const materialMemo = String(materialTransfer?.memo || '').replace(/\s+/g, ' ').trim();
    const materialMemoPreview = materialMemo ? (materialMemo.length > 15 ? `${materialMemo.slice(0, 15)}…` : materialMemo) : '';
    const materialAction = materialTransfer ? {
      isAsset: Boolean(assetTransfer),
      recordId: options.recordId || record.id || '',
      threadId,
      actorLabel: materialTransfer.fromLabel || senderName,
      verb: assetTransfer ? chatI18n('SWSE.Chat.Holonet.OffersAsset', {}, 'offers asset') : chatI18n('SWSE.Chat.Holonet.OffersItems', {}, 'offers items'),
      itemLabel: assetTransfer
        ? (assetTransfer.assets || []).map(a => a.name).filter(Boolean).join(', ')
        : (itemTransfer.items || itemTransfer.attachments || []).map(i => `${i.name || chatI18n('SWSE.Chat.Holonet.Item', {}, 'Item')}${i.quantity ? ` x${i.quantity}` : ''}`).filter(Boolean).join(', '),
      memoPreview: materialMemoPreview,
      primaryAction: assetTransfer ? 'accept-asset-transfer' : 'accept-item-transfer',
      primaryLabel: assetTransfer ? chatI18n('SWSE.Chat.Holonet.AcceptAsset', {}, 'Accept Asset') : chatI18n('SWSE.Chat.Holonet.AcceptItems', {}, 'Accept Items'),
      declineAction: assetTransfer ? 'decline-asset-transfer' : 'decline-item-transfer'
    } : null;

    return {
      recordId: options.recordId || record.id || '',
      threadId,
      actorId: options.actorId || actorIdForRecord(record),
      action,
      priority,
      priorityLabel: options.priorityLabel || labelForPriority(priority),
      source,
      mastLabel: options.mastLabel || (priority === 'urgent' ? chatI18n('SWSE.Chat.Holonet.IncomingPriority', {}, 'Incoming · Priority') : priority === 'secure' ? chatI18n('SWSE.Chat.Holonet.EncryptedSecure', {}, 'Encrypted · Secure') : chatI18n('SWSE.Chat.Holonet.IncomingTransmission', {}, 'Incoming · Transmission')),
      channelLabel: options.channelLabel || metadata.channel || metadata.category || metadata.threadType || (threadId ? chatI18n('SWSE.Chat.Holonet.DirectThread', {}, 'Direct Thread') : chatI18n('SWSE.Chat.Holonet.Holonet', {}, 'Holonet')),
      relayLabel: options.relayLabel || metadata.relay || metadata.channelId || '',
      senderName,
      subject,
      preview: truncateText(stripHtml(body), 180),
      attachmentCount,
      unread: options.unread ?? true,
      actionLabel: options.actionLabel || (action === 'open-thread' ? chatI18n('SWSE.Chat.Holonet.OpenHolochat', {}, 'Open<br/>Holochat') : action === 'open-bulletin' ? chatI18n('SWSE.Chat.Holonet.OpenBulletin', {}, 'Open<br/>Bulletin') : chatI18n('SWSE.Chat.Holonet.OpenNotice', {}, 'Open<br/>Notice')),
      creditAction,
      materialAction,
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
      vendorLabel: receipt.vendorLabel || receipt.sourceLabel || chatI18n('SWSE.Chat.Receipt.GalacticTreasury', {}, 'Galactic Treasury'),
      title: receipt.title || chatI18n('SWSE.Chat.Receipt.CreditTransaction', {}, 'Credit transaction'),
      items,
      itemSummary: receipt.itemSummary || items.map(item => item?.quantity && item.quantity > 1 ? `${item.quantity}× ${item.name}` : item?.name).filter(Boolean).join(' · '),
      reason: receipt.reason || receipt.note || '',
      previousLabel: receipt.previousLabel || chatI18n('SWSE.Chat.Receipt.Previous', {}, 'Previous'),
      newLabel: receipt.newLabel || (direction === 'neutral' ? chatI18n('SWSE.Chat.Receipt.Balance', {}, 'Balance') : chatI18n('SWSE.Chat.Receipt.NewBalance', {}, 'New Balance')),
      deltaLabel: receipt.deltaLabel || (direction === 'positive' ? chatI18n('SWSE.Chat.Receipt.Received', {}, 'received') : direction === 'negative' ? chatI18n('SWSE.Chat.Receipt.Spent', {}, 'spent') : chatI18n('SWSE.Chat.Receipt.NoChange', {}, 'no change')),
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



  static buildCombatStatusCardData({ actor = null, status = {}, title = '', kind = 'status', note = '', declaration = null } = {}) {
    const normalized = normalizeCombatStatusForChat(status);
    const actorName = actor?.name || declaration?.actorName || chatI18n('SWSE.Chat.Combat.UnknownActor', {}, 'Unknown Actor');
    const isSafeZone = kind === 'safe-zone';
    const defaultTitle = isSafeZone ? chatI18n('SWSE.Chat.Combat.SafeZoneDeclared', {}, 'Safe Zone Declared') : chatI18n('SWSE.Chat.Combat.CombatStatusDeclared', {}, 'Combat Status Declared');
    const safeZoneLines = isSafeZone ? [
      chatI18n('SWSE.Chat.Combat.SafeZoneNoGeometry', {}, 'No map geometry is automated by this card.'),
      chatI18n('SWSE.Chat.Combat.SafeZonePlacement', {}, 'GM confirms the 4×4 Safe Zone placement and affected allies.'),
      chatI18n('SWSE.Chat.Combat.SafeZoneBenefits', {}, 'Allies who start their turn in the Safe Zone gain +2 Fortitude and +2 Will Defense.'),
      chatI18n('SWSE.Chat.Combat.SafeZoneOverlap', {}, 'Safe Zones cannot overlap another Safe Zone.')
    ] : [];
    return {
      title: title || defaultTitle,
      kind,
      actorName,
      actorUuid: actor?.uuid || '',
      status: normalized,
      chips: normalized.chips,
      hasChips: normalized.chips.length > 0,
      note: note || (isSafeZone ? chatI18n('SWSE.Chat.Combat.SafeZoneNote', {}, 'This is a tactical declaration card. Resolve placement and affected tokens at the table.') : chatI18n('SWSE.Chat.Combat.StatusNote', {}, 'Current combat status declared for GM/player reference.')),
      safeZoneLines,
      isSafeZone,
      round: game?.combat?.round ?? null,
      turn: game?.combat?.turn ?? null
    };
  }

  static async postCombatStatusCard({ actor = null, status = {}, title = '', kind = 'status', note = '', declaration = null, whisper = null, flags = {} } = {}) {
    const data = this.buildCombatStatusCardData({ actor, status, title, kind, note, declaration });
    const content = await foundry.applications.handlebars.renderTemplate(
      'systems/foundryvtt-swse/templates/chat/combat-status-card.hbs',
      data
    );

    return this.postHTML({
      content,
      actor,
      whisper,
      flags: {
        ...flags,
        swse: {
          ...(flags?.swse || {}),
          combatStatusCard: true,
          combatStatusKind: kind,
          actorUuid: actor?.uuid || ''
        }
      }
    });
  }


  static async postCombatBanner({ combat = null, round = null, turnName = '', actor = null, whisper = null } = {}) {
    const resolvedRound = Number.isFinite(Number(round)) ? Number(round) : Number(combat?.round ?? 0);
    const resolvedTurnName = turnName || combat?.combatant?.actor?.name || combat?.combatant?.name || actor?.name || chatI18n('SWSE.Chat.Combat.UnknownCombatant', {}, 'Unknown Combatant');
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
