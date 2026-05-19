/**
 * Holonet Messenger Service
 *
 * Threaded datapad messaging over the existing Holonet engine.
 * This service intentionally owns Messenger UX state, invite handshakes,
 * thread membership, GM oversight, and credit-transfer messages while leaving
 * actual actor mechanics to canonical engines.
 */

import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { StoreTransactionEngine } from '/systems/foundryvtt-swse/scripts/engine/store/store-transaction-engine.js';
import { HolonetStorage } from './holonet-storage.js';
import { HolonetThreadService } from './holonet-thread-service.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';
import { HolonetSender } from '../contracts/holonet-sender.js';
import { HolonetRecipient } from '../contracts/holonet-recipient.js';
import { HolonetDeliveryRouter } from './holonet-delivery-router.js';
import { MessengerSource } from '../sources/messenger-source.js';
import { PERSONA_TYPE, RECIPIENT_TYPE, SOURCE_FAMILY, SURFACE_TYPE, INTENT_TYPE, RECORD_TYPE } from '../contracts/enums.js';
import { HolonetSocketService } from './holonet-socket-service.js';
import { HolonetPreferences } from '../holonet-preferences.js';
import { HolonetNoticeCenterService } from './holonet-notice-center-service.js';

const THREAD_TYPE = Object.freeze({
  PRIVATE: 'private',
  PARTY: 'party',
  SIDE: 'side',
  NPC: 'npc',
  JOB: 'job'
});


const PARTY_FUND_RECIPIENT_ID = 'party-fund';

function getSwseSetting(key, fallback = null) {
  try {
    return game.settings?.get?.('foundryvtt-swse', key) ?? fallback;
  } catch (_err) {
    return fallback;
  }
}

function isPartyFundEnabled() {
  return Boolean(getSwseSetting('holonetPartyFundEnabled', false));
}

function creditTransferApprovalRequired() {
  return Boolean(getSwseSetting('holonetRequireCreditTransferApproval', false));
}

function getPartyFundBalance() {
  return Number(getSwseSetting('holonetPartyFundBalance', 0)) || 0;
}

function getPartyFundDefaultCutPercent() {
  const raw = Number(getSwseSetting('holonetPartyFundDefaultCutPercent', 0));
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(100, Math.floor(raw)));
}


function getCustomPersonas() {
  const raw = getSwseSetting('holonetCustomPersonas', []);
  return Array.isArray(raw) ? raw : [];
}

async function saveCustomPersonas(personas = []) {
  await game.settings.set('foundryvtt-swse', 'holonetCustomPersonas', Array.isArray(personas) ? personas : []);
}

function getCustomPersonaById(personaId) {
  return getCustomPersonas().find(p => p?.id === personaId) ?? null;
}

function customPersonaRecipient(persona) {
  if (!persona?.id) return null;
  return new HolonetRecipient({
    recipientType: RECIPIENT_TYPE.PERSONA,
    actorId: persona.id,
    actorName: persona.label || 'Holonet Contact',
    personaType: 'custom',
    metadata: {
      label: persona.label || 'Holonet Contact',
      avatar: persona.avatar || null,
      notes: persona.notes || '',
      customPersona: true
    },
    id: `persona:custom:${persona.id}`
  });
}

function getActorPresence(actor) {
  const presence = actor?.getFlag?.('foundryvtt-swse', 'holonetPresence') ?? {};
  const status = String(presence.status || '').trim();
  const preset = String(presence.preset || '').trim();
  return {
    status: status || (preset ? preset : 'Available'),
    preset: preset || 'available',
    visibility: presence.visibility || 'party',
    updatedAt: presence.updatedAt || null
  };
}

function presenceForRecipient(recipient) {
  const actor = recipient?.actorId ? game.actors?.get(recipient.actorId) : null;
  if (!actor) return null;
  return getActorPresence(actor);
}

function normalizeAttachmentList(attachments = []) {
  const seen = new Set();
  return safeArray(attachments)
    .map(att => ({
      uuid: String(att?.uuid || '').trim(),
      name: String(att?.name || '').trim(),
      type: String(att?.type || '').trim(),
      img: String(att?.img || '').trim(),
      documentName: String(att?.documentName || '').trim()
    }))
    .filter(att => att.uuid)
    .filter(att => {
      if (seen.has(att.uuid)) return false;
      seen.add(att.uuid);
      return true;
    })
    .slice(0, 8);
}

function extractMentions(body = '') {
  return Array.from(new Set(String(body || '').match(/@[A-Za-z0-9_.:-]+/g) ?? []));
}

async function setPartyFundBalance(value) {
  const next = Math.max(0, Math.floor(Number(value) || 0));
  await game.settings.set('foundryvtt-swse', 'holonetPartyFundBalance', next);
  return next;
}

async function appendPartyFundLedger(entry = {}) {
  const ledger = Array.isArray(getSwseSetting('holonetPartyFundLedger', [])) ? getSwseSetting('holonetPartyFundLedger', []) : [];
  ledger.push({ id: foundry.utils.randomID(), createdAt: nowIso(), ...entry });
  await game.settings.set('foundryvtt-swse', 'holonetPartyFundLedger', ledger.slice(-100));
}

function partyFundRecipientVm() {
  return {
    id: PARTY_FUND_RECIPIENT_ID,
    label: 'Party Fund',
    typeLabel: 'GM-managed account',
    avatar: null,
    isSelf: false,
    isGm: false,
    isPersona: true,
    isPlayer: false,
    actorId: null,
    userId: null,
    recipientType: 'partyFund'
  };
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMarkup(value = '') {
  let html = escapeHtml(value);
  html = html.replace(/(^|\s)(@[A-Za-z0-9_.:-]+)/g, '$1<span class="swse-holo-token swse-holo-token--mention">$2</span>');
  html = html.replace(/(^|\s)(#[A-Za-z0-9_-]+)/g, '$1<span class="swse-holo-token swse-holo-token--tag">$2</span>');
  html = html.replace(/(^|\s)(![A-Za-z0-9_-]+)/g, '$1<span class="swse-holo-token swse-holo-token--alert">$2</span>');
  html = html.replace(/(^|\s)(\+[0-9][0-9,]*cr)/gi, '$1<span class="swse-holo-token swse-holo-token--credits">$2</span>');
  return html;
}

function previewText(value = '', length = 88) {
  const text = String(value).replace(/\s+/g, ' ').trim();
  if (text.length <= length) return text;
  return `${text.slice(0, Math.max(0, length - 1))}…`;
}

function currentRecipientId() {
  return HolonetDeliveryRouter.getCurrentRecipientId();
}

function actorPortrait(actor) {
  return actor?.img || actor?.prototypeToken?.texture?.src || null;
}

function userAvatar(user) {
  return user?.character?.img || user?.avatar || null;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueRecipients(recipients = []) {
  const unique = new Map();
  for (const recipient of recipients) {
    if (recipient?.id) unique.set(recipient.id, recipient);
  }
  return Array.from(unique.values());
}

function getThreadMeta(thread) {
  thread.metadata ??= {};
  thread.metadata.threadType ??= THREAD_TYPE.PRIVATE;
  thread.metadata.ownerId ??= thread.participants?.[0]?.id ?? null;
  thread.metadata.pendingInvites ??= [];
  thread.metadata.declinedBy ??= [];
  thread.metadata.mutedBy ??= {};
  thread.metadata.archivedBy ??= {};
  thread.metadata.gmObserverIds ??= [];
  return thread.metadata;
}

function hasRecipient(list = [], recipientId) {
  return safeArray(list).some(r => r?.id === recipientId || r === recipientId);
}

function recipientDisplayName(recipient) {
  if (!recipient) return 'Unknown';
  if (recipient.actorName) return recipient.actorName;
  if (recipient.metadata?.label) return recipient.metadata.label;
  if (recipient.recipientType === RECIPIENT_TYPE.GM) return 'Gamemaster';
  return recipient.id ?? 'Unknown';
}

function recipientAvatar(recipient) {
  if (!recipient) return null;
  if (recipient.metadata?.avatar) return recipient.metadata.avatar;
  if (recipient.actorId && !recipient.metadata?.customPersona) return game.actors?.get(recipient.actorId)?.img ?? null;
  if (recipient.userId) return userAvatar(game.users?.get(recipient.userId));
  return null;
}

function participantLabelList(recipients = [], currentId = null) {
  return recipients
    .filter(p => p?.id !== currentId)
    .map(recipientDisplayName)
    .filter(Boolean);
}

function isImagePath(value = '') {
  return /\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(String(value).trim());
}

function nowIso() {
  return new Date().toISOString();
}

function creditsOf(actor) {
  const raw = actor?.system?.credits?.value ?? actor?.system?.credits ?? 0;
  return Number(raw) || 0;
}

function formatCredits(amount) {
  return `${Number(amount || 0).toLocaleString()} credits`;
}

function parsePositiveCredits(amount) {
  const value = Math.floor(Number(amount));
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export class HolonetMessengerService {
  static THREAD_TYPE = THREAD_TYPE;

  static getCurrentParticipantId() {
    return currentRecipientId();
  }

  static getSenderForActor(actor, fallbackLabel = null) {
    return HolonetSender.fromActor(actor?.id ?? null, actor?.name ?? fallbackLabel ?? game.user?.name ?? 'Unknown', actorPortrait(actor));
  }


  static _recipientFromStableId(stableId) {
    if (!stableId) return null;
    if (String(stableId).startsWith('persona:custom:')) {
      const [, , personaId = ''] = String(stableId).split(':');
      const persona = getCustomPersonaById(personaId);
      return persona ? customPersonaRecipient(persona) : new HolonetRecipient({
        recipientType: RECIPIENT_TYPE.PERSONA,
        actorId: personaId || null,
        actorName: 'Holonet Contact',
        personaType: 'custom',
        metadata: { label: 'Holonet Contact', customPersona: true },
        id: stableId
      });
    }
    return HolonetRecipient.fromStableId(stableId);
  }

  static async createCustomPersona({ label = '', avatar = '', notes = '' } = {}) {
    if (!game.user?.isGM) return null;
    const cleanLabel = String(label || '').trim();
    if (!cleanLabel) return null;
    const personas = getCustomPersonas();
    const persona = {
      id: foundry.utils.randomID(),
      label: cleanLabel,
      avatar: String(avatar || '').trim(),
      notes: String(notes || '').trim(),
      createdAt: nowIso(),
      createdByUserId: game.user?.id ?? null
    };
    personas.push(persona);
    await saveCustomPersonas(personas);
    Hooks.callAll('swseHolonetUpdated', { type: 'persona-created', personaId: persona.id });
    HolonetSocketService.emitSync({ type: 'state-updated', source: 'holonet-custom-persona', personaId: persona.id });
    return persona;
  }

  static async setPresence({ actor, status = '', preset = 'available', visibility = 'party' } = {}) {
    if (!actor) return false;
    const canEdit = game.user?.isGM || actor.isOwner || actor.testUserPermission?.(game.user, 'OWNER');
    if (!canEdit) return false;
    const presence = {
      status: String(status || '').trim(),
      preset: String(preset || 'available').trim() || 'available',
      visibility: String(visibility || 'party').trim() || 'party',
      updatedAt: nowIso(),
      updatedByUserId: game.user?.id ?? null
    };
    await actor.setFlag('foundryvtt-swse', 'holonetPresence', presence);
    Hooks.callAll('swseHolonetUpdated', { type: 'presence-updated', actorId: actor.id });
    HolonetSocketService.emitSync({ type: 'state-updated', source: 'holonet-presence', actorId: actor.id });
    return true;
  }

  static _recipientForActorContext(actor, { senderUserId = game.user?.id, senderRecipientId = currentRecipientId() } = {}) {
    if (senderRecipientId?.startsWith('persona:')) return this._recipientFromStableId(senderRecipientId);
    if (senderRecipientId?.startsWith('gm:')) return HolonetRecipient.gm(senderUserId || game.user?.id);
    if (senderRecipientId?.startsWith('player:')) return HolonetRecipient.player(senderUserId || game.user?.id, actor?.id, actor?.name);
    return game.user?.isGM ? HolonetRecipient.gm(game.user.id) : HolonetRecipient.player(game.user?.id, actor?.id, actor?.name);
  }

  static _gmObserverRecipients() {
    return (game.users?.filter?.(u => u.isGM) ?? Array.from(game.users ?? []).filter(u => u.isGM))
      .map(u => HolonetRecipient.gm(u.id));
  }

  static _messageRecipientsForThread(thread) {
    const meta = getThreadMeta(thread);
    const gmObservers = safeArray(meta.gmObserverIds).map(id => this._recipientFromStableId(id)).filter(Boolean);
    return uniqueRecipients([...(thread.participants ?? []), ...gmObservers]);
  }

  static _ensureGmObservers(thread) {
    const meta = getThreadMeta(thread);
    const current = new Set(safeArray(meta.gmObserverIds));
    for (const gm of this._gmObserverRecipients()) current.add(gm.id);
    meta.gmObserverIds = Array.from(current);
    return thread;
  }

  static _decorateRecipient(recipient, { currentId = currentRecipientId(), reason = null } = {}) {
    const actor = recipient?.actorId ? game.actors?.get(recipient.actorId) : null;
    const user = recipient?.userId ? game.users?.get(recipient.userId) : null;
    const id = recipient?.id ?? '';
    const isGm = recipient?.recipientType === RECIPIENT_TYPE.GM || id.startsWith('gm:');
    const isPersona = recipient?.recipientType === RECIPIENT_TYPE.PERSONA || id.startsWith('persona:');
    const presence = presenceForRecipient(recipient);
    return {
      id,
      label: recipientDisplayName(recipient),
      typeLabel: isGm ? 'GM' : (isPersona ? (recipient?.metadata?.customPersona ? 'Message Persona' : 'NPC Contact') : 'Player'),
      avatar: recipientAvatar(recipient) || actorPortrait(actor) || userAvatar(user),
      isSelf: id === currentId,
      isGm,
      isPersona,
      isPlayer: !isGm && !isPersona,
      isCustomPersona: Boolean(recipient?.metadata?.customPersona || id.startsWith('persona:custom:')),
      presence,
      presenceStatus: presence?.status ?? '',
      reason,
      actorId: recipient?.metadata?.customPersona ? null : (recipient?.actorId ?? null),
      userId: recipient?.userId ?? null,
      recipientType: recipient?.recipientType ?? null
    };
  }

  static _hasEstablishedNpcContact(actor, npcRecipientId) {
    const participantId = currentRecipientId();
    if (!participantId || !npcRecipientId) return false;
    // GM can always initiate NPC persona threads.
    if (game.user?.isGM) return true;
    // Player can only initiate/restart an NPC contact after that NPC has appeared in a thread with them.
    return this._cachedThreadsForNpcContact?.some?.(thread => {
      const participants = safeArray(thread.participants);
      const meta = getThreadMeta(thread);
      return participants.some(p => p.id === participantId)
        && (participants.some(p => p.id === npcRecipientId) || safeArray(meta.pendingInvites).some(p => p.id === npcRecipientId));
    }) ?? false;
  }

  static buildRecipientOptions(actor, { threads = null } = {}) {
    const currentId = currentRecipientId();
    this._cachedThreadsForNpcContact = threads ?? this._cachedThreadsForNpcContact ?? [];
    const options = [];

    for (const user of Array.from(game.users ?? [])) {
      if (!user.active && !game.user?.isGM) continue;
      const recipientId = user.isGM ? `gm:${user.id}` : `player:${user.id}`;
      if (recipientId === currentId) continue;
      options.push({
        id: recipientId,
        label: user.isGM ? `GM // ${user.name}` : (user.character?.name || user.name),
        typeLabel: user.isGM ? 'GM' : 'Player',
        avatar: userAvatar(user),
        isPersona: false,
        isPlayer: !user.isGM,
        isGm: user.isGM,
        canQuickStart: !user.isGM
      });
    }

    const npcActors = (game.actors?.contents ?? [])
      .filter(a => ['npc', 'beast'].includes(a.type))
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const npc of npcActors) {
      const id = `persona:${PERSONA_TYPE.NPC}:${npc.id}`;
      const established = game.user?.isGM || this._hasEstablishedNpcContact(actor, id);
      if (!established) continue;
      options.push({
        id,
        label: npc.name,
        typeLabel: game.user?.isGM ? 'NPC / GM-operated' : 'NPC Contact',
        avatar: npc.img || null,
        isPersona: true,
        isPlayer: false,
        isGm: false,
        canQuickStart: true
      });
    }

    for (const persona of getCustomPersonas().sort((a, b) => String(a.label || '').localeCompare(String(b.label || '')))) {
      const recipient = customPersonaRecipient(persona);
      const established = game.user?.isGM || this._hasEstablishedNpcContact(actor, recipient?.id);
      if (!recipient || !established) continue;
      options.push({
        id: recipient.id,
        label: persona.label || 'Holonet Contact',
        typeLabel: game.user?.isGM ? 'Message Persona / GM-operated' : 'Message Persona',
        avatar: persona.avatar || null,
        isPersona: true,
        isCustomPersona: true,
        isPlayer: false,
        isGm: false,
        canQuickStart: true
      });
    }

    return options;
  }

  static async getThreadsForCurrentParticipant(actor) {
    const participantId = currentRecipientId();
    if (!participantId) return [];

    const allThreads = await HolonetStorage.getAllThreads();
    this._cachedThreadsForNpcContact = allThreads;
    const visible = game.user?.isGM
      ? allThreads
      : allThreads.filter(thread => {
        const meta = getThreadMeta(thread);
        if (meta.archivedBy?.[participantId]) return false;
        return hasRecipient(thread.participants, participantId) || hasRecipient(meta.pendingInvites, participantId);
      });

    const enriched = [];
    for (const thread of visible) {
      const hydrated = await HolonetThreadService.getThreadWithMessages(thread.id);
      if (!hydrated) continue;
      const meta = getThreadMeta(hydrated);
      const messages = (hydrated.messages ?? []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const recipients = this._messageRecipientsForThread(hydrated);
      const unreadCount = meta.mutedBy?.[participantId] ? 0 : messages.filter(m => {
        if (m.type !== RECORD_TYPE.MESSAGE) return false;
        if (m.sender?.actorId && m.sender.actorId === actor?.id) return false;
        return m.isUnreadBy(participantId);
      }).length;
      const lastMessage = messages[messages.length - 1] ?? null;
      const pendingInvite = hasRecipient(meta.pendingInvites, participantId);
      const isParticipant = hasRecipient(hydrated.participants, participantId);
      const decoratedParticipants = safeArray(hydrated.participants).map(r => this._decorateRecipient(r, { currentId: participantId }));
      const decoratedPending = safeArray(meta.pendingInvites).map(r => this._decorateRecipient(r, { currentId: participantId }));
      enriched.push({
        ...hydrated,
        participants: decoratedParticipants,
        pendingInvites: decoratedPending,
        rawParticipants: hydrated.participants,
        rawPendingInvites: meta.pendingInvites,
        recipients,
        unreadCount,
        lastMessage,
        isPendingInvite: pendingInvite,
        isParticipant,
        isMuted: Boolean(meta.mutedBy?.[participantId]),
        isArchivedForCurrent: Boolean(meta.archivedBy?.[participantId]),
        isParty: meta.threadType === THREAD_TYPE.PARTY,
        isSide: meta.threadType === THREAD_TYPE.SIDE,
        isNpcThread: meta.threadType === THREAD_TYPE.NPC,
        isJob: meta.threadType === THREAD_TYPE.JOB,
        isPrivate: meta.threadType === THREAD_TYPE.PRIVATE || meta.threadType === THREAD_TYPE.NPC,
        threadType: meta.threadType,
        ownerId: meta.ownerId,
        ownerLabel: meta.ownerLabel || recipientDisplayName(safeArray(hydrated.participants).find(p => p.id === meta.ownerId)),
        canManage: game.user?.isGM || meta.ownerId === participantId,
        canLeave: meta.threadType !== THREAD_TYPE.PARTY && isParticipant,
        canSend: isParticipant || game.user?.isGM,
        canEnter: game.user?.isGM && !isParticipant,
        title: this._threadTitle(hydrated, participantId, actor),
        subtitle: this._threadSubtitle(hydrated, participantId),
        preview: previewText(lastMessage?.body ?? (pendingInvite ? 'Holochat invitation pending.' : ''), 84)
      });
    }

    return enriched.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  static _threadTitle(thread, participantId, actor) {
    const meta = getThreadMeta(thread);
    if (thread.title && !['Conversation', 'Messenger'].includes(thread.title)) return thread.title;
    if (meta.threadType === THREAD_TYPE.PARTY) return 'Party Channel';
    if (meta.threadType === THREAD_TYPE.JOB) return thread.title || 'Job Board Posting';
    const others = safeArray(thread.participants).filter(p => p.id !== participantId && !p.id?.startsWith('gm:'));
    if (!others.length) return thread.title || 'Holochat';
    return participantLabelList(others, participantId).join(', ');
  }

  static _threadSubtitle(thread, participantId) {
    const meta = getThreadMeta(thread);
    const labels = participantLabelList(safeArray(thread.participants), participantId);
    if (safeArray(meta.pendingInvites).length) {
      return `${labels.length ? labels.join(', ') : 'Thread'} // ${meta.pendingInvites.length} invite pending`;
    }
    return labels.join(', ') || 'Private transmission';
  }

  static _messageViewModel(message, actor, participantId, previous = null) {
    const senderLabel = message.sender?.actorName || message.sender?.systemLabel || 'System';
    const isSystem = Boolean(message.metadata?.systemEvent || message.sender?.type === 'system');
    const isOwn = !isSystem && (message.sender?.actorId === actor?.id || message.metadata?.senderRecipientId === participantId);
    const imageUrl = message.metadata?.imageUrl && isImagePath(message.metadata.imageUrl) ? String(message.metadata.imageUrl).trim() : null;
    const sameSenderAsPrevious = previous && !isSystem && previous.sender?.actorName === message.sender?.actorName && previous.sender?.actorId === message.sender?.actorId;
    const transfer = message.metadata?.creditTransfer ?? null;
    const job = message.metadata?.jobCard ?? null;
    const receipt = message.metadata?.receipt ?? null;
    const itemTransfer = message.metadata?.itemTransfer ?? null;
    const attachments = normalizeAttachmentList(message.metadata?.attachments ?? []);
    return {
      id: message.id,
      body: message.body,
      bodyHtml: renderMarkup(message.body ?? ''),
      imageUrl,
      createdAt: message.createdAt,
      senderLabel,
      senderAvatar: message.sender?.avatar || null,
      isOwn,
      isOther: !isOwn && !isSystem,
      isSystem,
      isUnread: message.isUnreadBy(participantId),
      sameSenderAsPrevious,
      metadata: message.metadata ?? {},
      isPinned: Boolean(message.metadata?.pinned),
      canPin: Boolean(game.user?.isGM || message.sender?.actorId === actor?.id || message.metadata?.senderRecipientId === participantId),
      attachments,
      hasAttachments: attachments.length > 0,
      hasCreditTransfer: Boolean(transfer),
      transfer: transfer ? this._creditTransferVm(message, transfer, actor, participantId) : null,
      hasItemTransfer: Boolean(itemTransfer),
      itemTransfer: itemTransfer ? this._itemTransferVm(message, itemTransfer, actor, participantId) : null,
      hasReceipt: Boolean(receipt),
      receipt,
      hasJobCard: Boolean(job),
      job
    };
  }

  static _creditTransferVm(message, transfer, actor, participantId) {
    const status = transfer.status || 'pendingRecipient';
    const amount = Number(transfer.amount || 0);
    const isRecipient = transfer.toRecipientId === participantId || (transfer.toActorId && actor?.id === transfer.toActorId);
    const isSender = transfer.fromRecipientId === participantId || (transfer.fromActorId && actor?.id === transfer.fromActorId);
    const isGm = Boolean(game.user?.isGM);
    const isPendingRecipient = status === 'pendingRecipient';
    const isPendingGm = status === 'pendingGm';
    return {
      ...transfer,
      messageId: message.id,
      amountLabel: formatCredits(amount),
      status,
      statusLabel: status === 'complete' ? 'Complete'
        : status === 'declined' ? 'Declined'
        : status === 'cancelled' ? 'Cancelled'
        : status === 'failed' ? 'Failed'
        : isPendingGm ? 'Awaiting GM Approval'
        : 'Awaiting Recipient',
      canAccept: isPendingRecipient && (isRecipient || isGm),
      canDecline: isPendingRecipient && (isRecipient || isGm),
      canApprove: isPendingGm && isGm,
      canCancel: (isPendingRecipient || isPendingGm) && (isSender || isGm),
      isResolved: ['complete', 'declined', 'cancelled', 'failed'].includes(status)
    };
  }


  static _itemTransferVm(message, transfer, actor, participantId) {
    const status = transfer.status || 'pendingRecipient';
    const isRecipient = transfer.toRecipientId === participantId || (transfer.toActorId && actor?.id === transfer.toActorId);
    const isSender = transfer.fromRecipientId === participantId || (transfer.fromActorId && actor?.id === transfer.fromActorId);
    const isGm = Boolean(game.user?.isGM);
    return {
      ...transfer,
      messageId: message.id,
      status,
      statusLabel: status === 'complete' ? 'Complete'
        : status === 'declined' ? 'Declined'
        : status === 'cancelled' ? 'Cancelled'
        : status === 'failed' ? 'Failed'
        : 'Awaiting Recipient',
      canAccept: status === 'pendingRecipient' && (isRecipient || isGm),
      canDecline: status === 'pendingRecipient' && (isRecipient || isGm),
      canCancel: status === 'pendingRecipient' && (isSender || isGm),
      isResolved: ['complete', 'declined', 'cancelled', 'failed'].includes(status)
    };
  }

  static _buildSelectedThreadVm(selectedThread, actor, participantId, recipientOptions) {
    if (!selectedThread) return null;
    const meta = getThreadMeta(selectedThread);
    const otherParticipants = safeArray(selectedThread.rawParticipants ?? selectedThread.participants)
      .filter(r => r.id !== participantId && !r.id?.startsWith('gm:'));
    let transferTargets = otherParticipants
      .map(r => this._decorateRecipient(r, { currentId: participantId }))
      .filter(r => r.actorId && !r.isPersona);
    if (isPartyFundEnabled()) transferTargets = [...transferTargets, partyFundRecipientVm()];
    const canUseJobPayout = Boolean(game.user?.isGM && (meta.threadType === THREAD_TYPE.JOB || selectedThread.isJob));
    const existingIds = new Set([
      ...safeArray(selectedThread.rawParticipants ?? []).map(r => r.id),
      ...safeArray(meta.pendingInvites).map(r => r.id)
    ]);
    const addableRecipients = recipientOptions.filter(option => !existingIds.has(option.id));
    return {
      ...selectedThread,
      transferTargets,
      canUseJobPayout,
      addableRecipients,
      muteActionLabel: selectedThread.isMuted ? 'Unmute' : 'Mute',
      muteAction: selectedThread.isMuted ? 'unmute-thread' : 'mute-thread',
      ownerBadge: selectedThread.canManage ? 'Owner tools available' : `Owner: ${selectedThread.ownerLabel || 'Unknown'}`,
      canShowPartyFund: isPartyFundEnabled(),
      partyFundBalance: getPartyFundBalance(),
      partyFundDefaultCutPercent: getPartyFundDefaultCutPercent(),
      job: meta.job ? {
        ...meta.job,
        status: meta.job.status || 'posted',
        statusLabel: this._jobStatusLabel(meta.job.status || 'posted'),
        rewardItemUuids: safeArray(meta.job.rewardItemUuids),
        hasItemRewards: safeArray(meta.job.rewardItemUuids).length > 0,
        canManage: Boolean(game.user?.isGM)
      } : null
    };
  }

  static async buildViewModel(actor, options = {}) {
    const participantId = currentRecipientId();
    const [threads, noticeCenter] = await Promise.all([
      this.getThreadsForCurrentParticipant(actor),
      HolonetNoticeCenterService.buildCenterVm({ actor, previewLimit: 2 })
    ]);
    const recipientOptions = this.buildRecipientOptions(actor, { threads: this._cachedThreadsForNpcContact ?? [] });
    const composeMode = options.compose === true || options.compose === 'true' || options.mode === 'compose';
    const selectedThreadId = composeMode ? null : (options.threadId || threads[0]?.id || null);
    const selectedThread = threads.find(t => t.id === selectedThreadId) || null;

    let previous = null;
    const messages = (selectedThread?.messages ?? []).map(message => {
      const vm = this._messageViewModel(message, actor, participantId, previous);
      previous = message;
      return vm;
    });

    const selectedThreadVm = this._buildSelectedThreadVm(selectedThread, actor, participantId, recipientOptions);
    const pinnedMessages = messages.filter(m => m.isPinned);
    const presence = getActorPresence(actor);

    return {
      id: 'messenger',
      title: 'Messenger',
      actorName: actor?.name ?? '',
      actorId: actor?.id ?? null,
      actorCredits: creditsOf(actor),
      participantId,
      isGm: Boolean(game.user?.isGM),
      unreadCount: threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0),
      threads,
      selectedThreadId,
      selectedThread: selectedThreadVm,
      messages,
      pinnedMessages,
      recipientOptions,
      customPersonas: getCustomPersonas(),
      presence,
      composeMode: composeMode || !selectedThread,
      notificationCenter: noticeCenter,
      canCreateJobs: Boolean(game.user?.isGM),
      transferApprovalRequired: creditTransferApprovalRequired(),
      partyFund: {
        enabled: isPartyFundEnabled(),
        balance: getPartyFundBalance(),
        defaultCutPercent: getPartyFundDefaultCutPercent(),
        canManage: Boolean(game.user?.isGM)
      },
      composerHelp: [
        '@ mention a character, NPC, ship, faction, or location',
        '# add a topic tag',
        '! mark an urgent alert',
        'Drag an Item from a compendium or actor to attach it',
        'Pin important messages so Holonet can replace journal notes'
      ]
    };
  }


  static async quickStartThread({ actor, recipientId, body = '' }) {
    if (!recipientId) return false;
    return this.createThread({
      actor,
      body,
      title: '',
      threadType: THREAD_TYPE.PRIVATE,
      recipientIds: [recipientId],
      imageUrl: ''
    });
  }

  static async createJobPosting({ actor, title = '', body = '', recipientIds = [], contactRecipientId = '', rewardCredits = 0, rewardItems = '', rewardItemUuids = [], attachments = [] }) {
    if (!game.user?.isGM) return false;
    const payload = {
      actorId: actor?.id ?? null,
      title: title?.trim() || 'Job Board Posting',
      body: body?.trim() || '',
      recipientIds,
      contactRecipientId,
      rewardCredits: parsePositiveCredits(rewardCredits),
      rewardItems: String(rewardItems || '').trim(),
      rewardItemUuids: safeArray(rewardItemUuids).map(String).filter(Boolean),
      attachments: normalizeAttachmentList(attachments),
      senderUserId: game.user?.id ?? null,
      senderRecipientId: currentRecipientId()
    };
    return this._gmCreateJobPosting(payload);
  }

  static async _gmCreateJobPosting({ actorId, title = 'Job Board Posting', body = '', recipientIds = [], contactRecipientId = '', rewardCredits = 0, rewardItems = '', rewardItemUuids = [], attachments = [], senderUserId = null, senderRecipientId = null } = {}) {
    const actor = actorId ? game.actors?.get(actorId) : null;
    const senderRecipient = this._recipientForActorContext(actor, { senderUserId, senderRecipientId });
    const requested = this._normalizeRecipientIds(recipientIds)
      .map(id => this._recipientFromStableId(id))
      .filter(Boolean);
    const participants = uniqueRecipients([senderRecipient, ...requested]);
    const contactRecipient = contactRecipientId ? this._recipientFromStableId(contactRecipientId) : null;
    const thread = await HolonetThreadService.createThread(title || 'Job Board Posting', participants, {
      sourceFamily: SOURCE_FAMILY.MESSENGER,
      threadType: THREAD_TYPE.JOB,
      ownerId: senderRecipient?.id ?? null,
      ownerLabel: recipientDisplayName(senderRecipient),
      pendingInvites: [],
      declinedBy: [],
      mutedBy: {},
      archivedBy: {},
      createdByUserId: senderUserId || game.user?.id || null,
      gmObserverIds: this._gmObserverRecipients().map(r => r.id),
      job: {
        title: title || 'Job Board Posting',
        contactRecipientId: contactRecipient?.id ?? null,
        contactLabel: contactRecipient ? recipientDisplayName(contactRecipient) : 'Job Board',
        rewardCredits: parsePositiveCredits(rewardCredits),
        rewardItems: String(rewardItems || '').trim(),
        rewardItemUuids: safeArray(rewardItemUuids).map(String).filter(Boolean),
        status: 'posted',
        statusHistory: [{ status: 'posted', at: nowIso(), by: senderUserId || game.user?.id || null }]
      }
    });

    const rewardLines = [];
    if (parsePositiveCredits(rewardCredits)) rewardLines.push(`Reward: +${parsePositiveCredits(rewardCredits).toLocaleString()}cr`);
    if (rewardItems?.trim()) rewardLines.push(`Items: ${rewardItems.trim()}`);
    if (safeArray(rewardItemUuids).length) rewardLines.push(`Attached rewards: ${safeArray(rewardItemUuids).length} item card(s)`);
    const jobBody = [
      body?.trim() || 'A new job has been posted to the Holonet board.',
      rewardLines.length ? rewardLines.join(' // ') : ''
    ].filter(Boolean).join('\n\n');

    await this._publishSystemMessage(thread, `Job posted: ${title || 'New Holonet Job'}.`, { eventType: 'job-posted' });
    await this._gmSendMessage({
      actorId: contactRecipient?.actorId ?? actorId,
      body: jobBody,
      imageUrl: '',
      attachments: normalizeAttachmentList(attachments),
      threadId: thread.id,
      senderUserId,
      senderRecipientId: contactRecipient?.id ?? senderRecipientId
    });
    Hooks.callAll('swseHolonetUpdated', { type: 'thread-created', threadId: thread.id });
    HolonetSocketService.emitSync({ type: 'thread-updated', threadId: thread.id });
    return { threadId: thread.id };
  }

  static async sendMessage({ actor, body, threadId = null, recipientIds = [], imageUrl = '', attachments = [], senderRecipientId = null }) {
    if (!body?.trim() && !imageUrl?.trim() && !normalizeAttachmentList(attachments).length) return false;
    const payload = {
      actorId: actor?.id ?? null,
      body: body?.trim() || '',
      imageUrl: imageUrl?.trim() || '',
      attachments: normalizeAttachmentList(attachments),
      threadId,
      recipientIds,
      senderUserId: game.user?.id ?? null,
      senderRecipientId: game.user?.isGM && senderRecipientId ? senderRecipientId : currentRecipientId()
    };
    if (!game.user?.isGM) {
      HolonetSocketService.emitRequest('send-message', payload);
      return true;
    }
    await this._gmSendMessage(payload);
    return true;
  }

  static async createThread({ actor, body = '', title = '', threadType = THREAD_TYPE.PRIVATE, recipientIds = [], imageUrl = '', attachments = [], senderRecipientId = null }) {
    const payload = {
      actorId: actor?.id ?? null,
      body: body?.trim() || '',
      title: title?.trim() || '',
      threadType,
      recipientIds,
      imageUrl: imageUrl?.trim() || '',
      attachments: normalizeAttachmentList(attachments),
      senderUserId: game.user?.id ?? null,
      senderRecipientId: game.user?.isGM && senderRecipientId ? senderRecipientId : currentRecipientId()
    };
    if (!game.user?.isGM) {
      HolonetSocketService.emitRequest('create-thread', payload);
      return true;
    }
    await this._gmCreateThread(payload);
    return true;
  }

  static _normalizeRecipientIds(ids = []) {
    return Array.from(new Set(safeArray(ids).map(String).filter(Boolean)));
  }

  static async _gmCreateThread({ actorId, body = '', title = '', threadType = THREAD_TYPE.PRIVATE, recipientIds = [], imageUrl = '', attachments = [], senderUserId = null, senderRecipientId = null } = {}) {
    const actor = actorId ? game.actors?.get(actorId) : null;
    const senderRecipient = this._recipientForActorContext(actor, { senderUserId, senderRecipientId });
    const senderLabel = recipientDisplayName(senderRecipient);
    const requested = this._normalizeRecipientIds(recipientIds)
      .map(id => this._recipientFromStableId(id))
      .filter(Boolean)
      .filter(r => r.id !== senderRecipient?.id);

    let participants = [senderRecipient].filter(Boolean);
    let pendingInvites = requested;
    let finalType = threadType || THREAD_TYPE.PRIVATE;

    if (finalType === THREAD_TYPE.PARTY) {
      const partyRecipients = HolonetDeliveryRouter.getPartyMembers();
      participants = uniqueRecipients([senderRecipient, ...partyRecipients]);
      pendingInvites = [];
      title = title || 'Party Channel';
    }

    if (requested.some(r => r.id?.startsWith('persona:')) && finalType !== THREAD_TYPE.JOB) finalType = THREAD_TYPE.NPC;

    const thread = await HolonetThreadService.createThread(title || this._defaultThreadTitle(requested, finalType), participants, {
      sourceFamily: SOURCE_FAMILY.MESSENGER,
      threadType: finalType,
      ownerId: senderRecipient?.id ?? null,
      ownerLabel: senderLabel,
      pendingInvites,
      declinedBy: [],
      mutedBy: {},
      archivedBy: {},
      createdByUserId: senderUserId || game.user?.id || null,
      gmObserverIds: this._gmObserverRecipients().map(r => r.id)
    });

    for (const invitee of pendingInvites) {
      await this._publishSystemMessage(thread, `${senderLabel} invited ${recipientDisplayName(invitee)} to the holochat.`, { eventType: 'member-invited' });
    }

    if (pendingInvites.length) {
      await this._publishSystemMessage(thread, `${senderLabel} wants to have a holochat.`, { eventType: 'holochat-request' });
    }

    if (body?.trim() || imageUrl?.trim()) {
      await this._gmSendMessage({ actorId, body, imageUrl, attachments, threadId: thread.id, senderUserId, senderRecipientId });
    }

    Hooks.callAll('swseHolonetUpdated', { type: 'thread-created', threadId: thread.id });
    HolonetSocketService.emitSync({ type: 'thread-updated', threadId: thread.id });
    return { threadId: thread.id };
  }

  static _defaultThreadTitle(recipients = [], threadType = THREAD_TYPE.PRIVATE) {
    if (threadType === THREAD_TYPE.PARTY) return 'Party Channel';
    if (threadType === THREAD_TYPE.SIDE) return 'Side Thread';
    const labels = recipients.map(recipientDisplayName).filter(Boolean);
    return labels.length ? labels.join(', ') : 'Private Holochat';
  }

  static async _gmSendMessage({ actorId, body, threadId = null, recipientIds = [], imageUrl = '', attachments = [], senderUserId = null, senderRecipientId = null }) {
    if (!body?.trim() && !imageUrl?.trim() && !normalizeAttachmentList(attachments).length) return null;
    const actor = actorId ? game.actors?.get(actorId) : null;
    let senderRecipient = this._recipientForActorContext(actor, { senderUserId, senderRecipientId });
    const sender = senderRecipient?.id?.startsWith('persona:custom:')
      ? HolonetSender.fromActor(null, recipientDisplayName(senderRecipient), recipientAvatar(senderRecipient))
      : this.getSenderForActor(actor, game.user?.name);

    let thread = null;
    if (threadId) thread = await HolonetStorage.getThread(threadId);
    if (!thread) {
      const recipients = this._normalizeRecipientIds(recipientIds).map(id => this._recipientFromStableId(id)).filter(Boolean);
      const created = await this._gmCreateThread({ actorId, body: '', recipientIds: recipients.map(r => r.id), senderUserId, senderRecipientId });
      thread = await HolonetStorage.getThread(created.threadId);
    }
    if (!thread) return null;
    this._ensureGmObservers(thread);
    const meta = getThreadMeta(thread);
    const requesterIsGm = Boolean((senderUserId && game.users?.get(senderUserId)?.isGM) || (!senderUserId && game.user?.isGM));
    if (!hasRecipient(thread.participants, senderRecipient?.id) && !requesterIsGm) return null;
    if (requesterIsGm && senderRecipient?.id?.startsWith('gm:') && !hasRecipient(thread.participants, senderRecipient.id)) {
      // GM can send as an observer without formally joining unless they press Enter Chat.
      meta.gmObserverIds = Array.from(new Set([...safeArray(meta.gmObserverIds), senderRecipient.id]));
    }
    await HolonetStorage.saveThread(thread);

    const recipients = this._messageRecipientsForThread(thread);
    const message = MessengerSource.createMessage({
      sender,
      audience: HolonetAudience.threadParticipants(recipients.map(p => p.id)),
      body: body?.trim() || (imageUrl ? '[Holostill attached]' : (normalizeAttachmentList(attachments).length ? '[Attachment transmitted]' : '')),
      threadId: thread.id,
      metadata: {
        categoryId: HolonetPreferences.CATEGORIES.MESSAGES,
        senderRecipientId: senderRecipient?.id ?? null,
        imageUrl: imageUrl?.trim() || null,
        attachments: normalizeAttachmentList(attachments),
        mentions: extractMentions(body)
      }
    });
    message.intent = INTENT_TYPE.PLAYER_MESSAGE;
    message.recipients = recipients;
    message.metadata = {
      ...(message.metadata ?? {}),
      categoryId: HolonetPreferences.CATEGORIES.MESSAGES
    };
    message.projections = [
      { surfaceType: SURFACE_TYPE.MESSENGER_THREAD, recordId: message.id, isPinned: false, metadata: { threadId: thread.id } },
      { surfaceType: SURFACE_TYPE.HOME_FEED, recordId: message.id, isPinned: false, metadata: { threadId: thread.id } }
    ];

    const result = await HolonetThreadService.publishMessageToThread({
      thread,
      message,
      senderRecipient,
      publishOptions: { skipSocket: true },
      markSenderRead: Boolean(senderRecipient?.id)
    });

    if (!result.ok) {
      console.error('[Holonet] publishMessageToThread failed:', result.reason);
      return null;
    }
    HolonetSocketService.emitSync({ type: 'thread-updated', threadId: result.threadId, messageId: result.messageId });
    return { threadId: result.threadId, messageId: result.messageId };
  }

  static async _publishSystemMessage(thread, body, metadata = {}) {
    this._ensureGmObservers(thread);
    const recipients = this._messageRecipientsForThread(thread);
    const message = MessengerSource.createMessage({
      sender: HolonetSender.system('Holonet'),
      audience: HolonetAudience.threadParticipants(recipients.map(r => r.id)),
      body,
      threadId: thread.id,
      metadata: {
        categoryId: HolonetPreferences.CATEGORIES.MESSAGES,
        systemEvent: true,
        ...metadata
      }
    });
    message.intent = INTENT_TYPE.SYSTEM_NEW_MESSAGE;
    message.recipients = recipients;
    message.projections = [
      { surfaceType: SURFACE_TYPE.MESSENGER_THREAD, recordId: message.id, isPinned: false, metadata: { threadId: thread.id } },
      { surfaceType: SURFACE_TYPE.HOME_FEED, recordId: message.id, isPinned: false, metadata: { threadId: thread.id } }
    ];
    const result = await HolonetThreadService.publishMessageToThread({ thread, message, senderRecipient: null, publishOptions: { skipSocket: true }, markSenderRead: false });
    HolonetSocketService.emitSync({ type: 'thread-updated', threadId: thread.id, messageId: result.messageId });
    return result;
  }

  static async _publishReceiptMessage(thread, receipt = {}) {
    const title = receipt.title || 'Holonet Receipt';
    const lines = safeArray(receipt.lines).filter(Boolean);
    const amount = receipt.amount ?? null;
    const body = [title, ...lines].filter(Boolean).join(' // ');
    return this._publishSystemMessage(thread, body, {
      eventType: receipt.eventType || 'receipt',
      receipt: {
        id: foundry.utils.randomID(),
        title,
        amount,
        amountLabel: amount == null ? '' : formatCredits(amount),
        lines,
        status: receipt.status || 'complete',
        createdAt: nowIso()
      }
    });
  }

  static _jobStatusLabel(status = 'posted') {
    const map = {
      posted: 'Posted',
      accepted: 'Accepted',
      inProgress: 'In Progress',
      complete: 'Complete',
      paid: 'Paid',
      archived: 'Archived'
    };
    return map[status] || String(status || 'Posted');
  }

  static async offerItemTransfer({ actor, threadId, recipientId, itemUuids = [] }) {
    const payload = {
      actorId: actor?.id ?? null,
      threadId,
      recipientId,
      itemUuids: safeArray(itemUuids).map(String).filter(Boolean),
      requesterId: game.user?.id ?? null,
      senderRecipientId: currentRecipientId()
    };
    if (!game.user?.isGM) {
      HolonetSocketService.emitRequest('offer-item-transfer', payload);
      return true;
    }
    await this._gmOfferItemTransfer(payload);
    return true;
  }

  static async offerCreditTransfer({ actor, threadId, recipientId, amount }) {
    const payload = {
      actorId: actor?.id ?? null,
      threadId,
      recipientId,
      amount,
      requesterId: game.user?.id ?? null,
      senderRecipientId: currentRecipientId()
    };
    if (!game.user?.isGM) {
      HolonetSocketService.emitRequest('offer-credit-transfer', payload);
      return true;
    }
    await this._gmOfferCreditTransfer(payload);
    return true;
  }

  static async _gmOfferCreditTransfer({ actorId, threadId, recipientId, amount, requesterId = null, senderRecipientId = null } = {}) {
    const value = parsePositiveCredits(amount);
    if (!value) return false;
    const thread = await HolonetStorage.getThread(threadId);
    if (!thread) return false;
    this._ensureGmObservers(thread);
    const actor = actorId ? game.actors?.get(actorId) : null;
    const senderRecipient = this._recipientForActorContext(actor, { senderUserId: requesterId ?? game.user?.id, senderRecipientId });
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM || senderRecipient?.id?.startsWith('gm:'));
    if (!requesterIsGm && !hasRecipient(thread.participants, senderRecipient?.id)) return false;

    if (recipientId === PARTY_FUND_RECIPIENT_ID) {
      return this._gmContributeToPartyFund({ actorId, thread, amount: value, requesterId, senderRecipientId });
    }

    const recipient = this._recipientFromStableId(recipientId);
    const targetActor = recipient?.actorId ? game.actors?.get(recipient.actorId) : null;
    if (!recipient || !targetActor) return false;
    if (!requesterIsGm && !hasRecipient(thread.participants, recipient.id)) return false;

    const senderActor = requesterIsGm ? null : (requester?.character ?? actor);
    if (!requesterIsGm) {
      if (!senderActor) return false;
      if (creditsOf(senderActor) < value) {
        await this._publishSystemMessage(thread, `${senderActor.name} tried to offer ${formatCredits(value)}, but has insufficient credits.`, { eventType: 'credit-transfer-failed' });
        return false;
      }
    }

    const transfer = {
      id: foundry.utils.randomID(),
      kind: requesterIsGm ? 'gmGrant' : 'playerTransfer',
      status: requesterIsGm ? 'pendingRecipient' : 'pendingRecipient',
      amount: value,
      fromActorId: requesterIsGm ? null : senderActor.id,
      fromLabel: requesterIsGm ? 'GM Ledger' : senderActor.name,
      fromRecipientId: senderRecipient?.id ?? null,
      toActorId: targetActor.id,
      toLabel: targetActor.name,
      toRecipientId: recipient.id,
      approvalRequired: !requesterIsGm && creditTransferApprovalRequired(),
      createdAt: nowIso(),
      createdByUserId: requesterId ?? game.user?.id ?? null
    };

    const message = MessengerSource.createMessage({
      sender: HolonetSender.system('Holonet Ledger'),
      audience: HolonetAudience.threadParticipants(this._messageRecipientsForThread(thread).map(r => r.id)),
      body: requesterIsGm
        ? `${transfer.fromLabel} offers ${formatCredits(value)} to ${targetActor.name}.`
        : `${transfer.fromLabel} offers ${formatCredits(value)} to ${targetActor.name}.`,
      threadId: thread.id,
      metadata: {
        categoryId: HolonetPreferences.CATEGORIES.MESSAGES,
        systemEvent: true,
        eventType: 'credit-transfer-offered',
        creditTransfer: transfer
      }
    });
    message.intent = INTENT_TYPE.SYSTEM_NEW_MESSAGE;
    message.recipients = this._messageRecipientsForThread(thread);
    message.projections = [
      { surfaceType: SURFACE_TYPE.MESSENGER_THREAD, recordId: message.id, isPinned: false, metadata: { threadId: thread.id } },
      { surfaceType: SURFACE_TYPE.HOME_FEED, recordId: message.id, isPinned: false, metadata: { threadId: thread.id } }
    ];
    await HolonetThreadService.publishMessageToThread({ thread, message, senderRecipient: null, publishOptions: { skipSocket: true }, markSenderRead: false });
    HolonetSocketService.emitSync({ type: 'thread-updated', threadId: thread.id, messageId: message.id });
    return { threadId: thread.id, messageId: message.id };
  }

  static async _resolveItemSummaries(itemUuids = []) {
    const attachments = [];
    for (const uuid of safeArray(itemUuids).map(String).filter(Boolean)) {
      try {
        const doc = await fromUuid(uuid);
        if (!doc) continue;
        attachments.push({
          uuid,
          name: doc.name || 'Item',
          type: doc.type || doc.documentName || 'Item',
          documentName: doc.documentName || 'Item',
          img: doc.img || ''
        });
      } catch (err) {
        console.warn('[Holonet] Unable to resolve item attachment', uuid, err);
      }
    }
    return normalizeAttachmentList(attachments);
  }

  static async _gmOfferItemTransfer({ actorId, threadId, recipientId, itemUuids = [], requesterId = null, senderRecipientId = null } = {}) {
    const thread = await HolonetStorage.getThread(threadId);
    if (!thread) return false;
    const attachments = await this._resolveItemSummaries(itemUuids);
    if (!attachments.length) return false;
    const actor = actorId ? game.actors?.get(actorId) : null;
    const senderRecipient = this._recipientForActorContext(actor, { senderUserId: requesterId ?? game.user?.id, senderRecipientId });
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM || senderRecipient?.id?.startsWith('gm:'));
    const recipient = this._recipientFromStableId(recipientId);
    const targetActor = recipient?.actorId ? game.actors?.get(recipient.actorId) : null;
    if (!recipient || !targetActor) return false;
    if (!requesterIsGm) return false;
    const transfer = {
      id: foundry.utils.randomID(),
      kind: requesterIsGm ? 'gmGrant' : 'itemReference',
      status: 'pendingRecipient',
      itemUuids: attachments.map(a => a.uuid),
      attachments,
      fromActorId: requesterIsGm ? null : actor?.id ?? null,
      fromLabel: requesterIsGm ? 'GM Locker' : actor?.name ?? 'Sender',
      fromRecipientId: senderRecipient?.id ?? null,
      toActorId: targetActor.id,
      toLabel: targetActor.name,
      toRecipientId: recipient.id,
      createdAt: nowIso(),
      createdByUserId: requesterId ?? game.user?.id ?? null
    };
    const message = MessengerSource.createMessage({
      sender: HolonetSender.system('Holonet Cargo'),
      audience: HolonetAudience.threadParticipants(this._messageRecipientsForThread(thread).map(r => r.id)),
      body: `${transfer.fromLabel} offers ${attachments.length} item(s) to ${targetActor.name}.`,
      threadId: thread.id,
      metadata: {
        categoryId: HolonetPreferences.CATEGORIES.MESSAGES,
        systemEvent: true,
        eventType: 'item-transfer-offered',
        attachments,
        itemTransfer: transfer
      }
    });
    message.intent = INTENT_TYPE.SYSTEM_NEW_MESSAGE;
    message.recipients = this._messageRecipientsForThread(thread);
    message.projections = [
      { surfaceType: SURFACE_TYPE.MESSENGER_THREAD, recordId: message.id, isPinned: false, metadata: { threadId: thread.id } },
      { surfaceType: SURFACE_TYPE.HOME_FEED, recordId: message.id, isPinned: false, metadata: { threadId: thread.id } }
    ];
    await HolonetThreadService.publishMessageToThread({ thread, message, senderRecipient: null, publishOptions: { skipSocket: true }, markSenderRead: false });
    HolonetSocketService.emitSync({ type: 'thread-updated', threadId: thread.id, messageId: message.id });
    return { threadId: thread.id, messageId: message.id };
  }

  static async threadAction({ actor, threadId, action, recipientIds = [], amount = null, recipientId = null, recordId = null, partyFundCutPercent = null, status = null, itemUuids = [] }) {
    const payload = { actorId: actor?.id ?? null, threadId, action, recipientIds, amount, recipientId, recordId, partyFundCutPercent, status, itemUuids: safeArray(itemUuids).map(String).filter(Boolean), requesterId: game.user?.id ?? null, senderRecipientId: currentRecipientId() };
    if (!game.user?.isGM) {
      HolonetSocketService.emitRequest('thread-action', payload);
      return true;
    }
    await this._gmThreadAction(payload);
    return true;
  }

  static async _gmThreadAction({ actorId, threadId, action, recipientIds = [], amount = null, recipientId = null, recordId = null, partyFundCutPercent = null, status = null, itemUuids = [], requesterId = null, senderRecipientId = null } = {}) {
    const thread = await HolonetStorage.getThread(threadId);
    if (!thread) return false;
    this._ensureGmObservers(thread);
    const meta = getThreadMeta(thread);
    const actor = actorId ? game.actors?.get(actorId) : null;
    const actorRecipient = this._recipientForActorContext(actor, { senderUserId: requesterId ?? game.user?.id, senderRecipientId });
    const currentId = senderRecipientId || actorRecipient?.id;
    const isGm = Boolean((requesterId && game.users?.get(requesterId)?.isGM) || currentId?.startsWith('gm:')); 
    const canManage = isGm || meta.ownerId === currentId;

    switch (action) {
      case 'accept-invite': {
        const invite = safeArray(meta.pendingInvites).find(r => r.id === currentId);
        if (!invite) return false;
        thread.participants = uniqueRecipients([...(thread.participants ?? []), invite]);
        meta.pendingInvites = safeArray(meta.pendingInvites).filter(r => r.id !== currentId);
        await HolonetStorage.saveThread(thread);
        await this._publishSystemMessage(thread, `${recipientDisplayName(invite)} joined the chat.`, { eventType: 'member-joined' });
        break;
      }
      case 'decline-invite':
      case 'ignore-invite': {
        const invite = safeArray(meta.pendingInvites).find(r => r.id === currentId);
        meta.pendingInvites = safeArray(meta.pendingInvites).filter(r => r.id !== currentId);
        meta.declinedBy = Array.from(new Set([...safeArray(meta.declinedBy), currentId]));
        await HolonetStorage.saveThread(thread);
        if (invite) await this._publishSystemMessage(thread, `${recipientDisplayName(invite)} declined the holochat.`, { eventType: 'member-declined' });
        break;
      }
      case 'mute-thread': {
        meta.mutedBy ??= {};
        meta.mutedBy[currentId] = true;
        await HolonetStorage.saveThread(thread);
        break;
      }
      case 'unmute-thread': {
        meta.mutedBy ??= {};
        delete meta.mutedBy[currentId];
        await HolonetStorage.saveThread(thread);
        break;
      }
      case 'archive-thread': {
        meta.archivedBy ??= {};
        meta.archivedBy[currentId] = nowIso();
        await HolonetStorage.saveThread(thread);
        break;
      }
      case 'leave-thread': {
        if (meta.threadType === THREAD_TYPE.PARTY && !isGm) return false;
        const leaving = safeArray(thread.participants).find(r => r.id === currentId) || actorRecipient;
        thread.participants = safeArray(thread.participants).filter(r => r.id !== currentId);
        if (meta.ownerId === currentId) {
          const nextOwner = safeArray(thread.participants).find(r => !r.id?.startsWith('gm:')) ?? safeArray(thread.participants)[0] ?? null;
          meta.ownerId = nextOwner?.id ?? null;
          meta.ownerLabel = nextOwner ? recipientDisplayName(nextOwner) : null;
        }
        await HolonetStorage.saveThread(thread);
        await this._publishSystemMessage(thread, `${recipientDisplayName(leaving)} left the chat.`, { eventType: 'member-left' });
        break;
      }
      case 'enter-thread': {
        if (!isGm) return false;
        const gmRecipient = actorRecipient?.id?.startsWith('gm:') ? actorRecipient : HolonetRecipient.gm(requesterId || game.user?.id);
        if (!hasRecipient(thread.participants, gmRecipient.id)) {
          thread.participants = uniqueRecipients([...(thread.participants ?? []), gmRecipient]);
          await HolonetStorage.saveThread(thread);
          await this._publishSystemMessage(thread, `${recipientDisplayName(gmRecipient)} entered the chat.`, { eventType: 'gm-entered' });
        }
        break;
      }
      case 'invite-members': {
        if (!canManage) return false;
        const invitees = this._normalizeRecipientIds(recipientIds)
          .map(id => this._recipientFromStableId(id))
          .filter(Boolean)
          .filter(r => !hasRecipient(thread.participants, r.id) && !hasRecipient(meta.pendingInvites, r.id));
        meta.pendingInvites = uniqueRecipients([...safeArray(meta.pendingInvites), ...invitees]);
        await HolonetStorage.saveThread(thread);
        for (const invitee of invitees) {
          await this._publishSystemMessage(thread, `${recipientDisplayName(invitee)} was invited to the chat.`, { eventType: 'member-invited' });
        }
        break;
      }
      case 'insert-members': {
        if (!isGm) return false;
        const additions = this._normalizeRecipientIds(recipientIds)
          .map(id => this._recipientFromStableId(id))
          .filter(Boolean)
          .filter(r => !hasRecipient(thread.participants, r.id));
        thread.participants = uniqueRecipients([...(thread.participants ?? []), ...additions]);
        meta.pendingInvites = safeArray(meta.pendingInvites).filter(p => !additions.some(a => a.id === p.id));
        await HolonetStorage.saveThread(thread);
        for (const addition of additions) {
          await this._publishSystemMessage(thread, `${recipientDisplayName(addition)} was added to the chat.`, { eventType: 'member-added' });
        }
        break;
      }
      case 'remove-member': {
        if (!canManage) return false;
        const targetId = recipientId;
        if (!targetId || targetId === meta.ownerId && !isGm) return false;
        const removed = safeArray(thread.participants).find(r => r.id === targetId) || safeArray(meta.pendingInvites).find(r => r.id === targetId) || this._recipientFromStableId(targetId);
        thread.participants = safeArray(thread.participants).filter(r => r.id !== targetId);
        meta.pendingInvites = safeArray(meta.pendingInvites).filter(r => r.id !== targetId);
        await HolonetStorage.saveThread(thread);
        await this._publishSystemMessage(thread, `${recipientDisplayName(removed)} was removed from the chat.`, { eventType: 'member-removed' });
        break;
      }
      case 'pin-message':
      case 'unpin-message': {
        if (!recordId) return false;
        const message = await HolonetStorage.getRecord(recordId);
        if (!message) return false;
        message.metadata ??= {};
        message.metadata.pinned = action === 'pin-message';
        message.metadata.pinnedAt = message.metadata.pinned ? nowIso() : null;
        message.metadata.pinnedBy = message.metadata.pinned ? currentId : null;
        await HolonetStorage.saveRecord(message);
        await this._publishSystemMessage(thread, `${message.metadata.pinned ? 'Pinned' : 'Unpinned'} a transmission.`, { eventType: message.metadata.pinned ? 'message-pinned' : 'message-unpinned', recordId });
        break;
      }
      case 'set-job-status': {
        if (!isGm) return false;
        meta.job ??= {};
        const nextStatus = String(status || '').trim();
        if (!['posted', 'accepted', 'inProgress', 'complete', 'paid', 'archived'].includes(nextStatus)) return false;
        meta.job.status = nextStatus;
        meta.job.statusHistory = [...safeArray(meta.job.statusHistory), { status: nextStatus, at: nowIso(), by: requesterId || game.user?.id || null }];
        await HolonetStorage.saveThread(thread);
        await this._publishSystemMessage(thread, `Job status changed to ${this._jobStatusLabel(nextStatus)}.`, { eventType: 'job-status-changed', status: nextStatus });
        break;
      }
      case 'award-job-items': {
        if (!isGm) return false;
        const uuids = safeArray(itemUuids).length ? safeArray(itemUuids) : safeArray(meta.job?.rewardItemUuids);
        await this._gmGrantItems({ thread, recipientId, itemUuids: uuids, requesterId, eventType: 'job-item-payout', source: 'holonet-job-item-payout' });
        break;
      }
      case 'accept-item-transfer':
      case 'decline-item-transfer':
      case 'cancel-item-transfer': {
        await this._gmResolveItemTransfer({ thread, recordId, action, actorId, requesterId, senderRecipientId });
        break;
      }
      case 'offer-item-transfer': {
        await this._gmOfferItemTransfer({ actorId, threadId, recipientId, itemUuids, requesterId, senderRecipientId });
        break;
      }
      case 'accept-transfer':
      case 'decline-transfer':
      case 'approve-transfer':
      case 'cancel-transfer': {
        await this._gmResolveCreditTransfer({ thread, recordId, action, actorId, requesterId, senderRecipientId });
        break;
      }
      case 'offer-credit-transfer': {
        await this._gmOfferCreditTransfer({ actorId, threadId, recipientId, amount, requesterId, senderRecipientId });
        break;
      }
      case 'contribute-party-fund': {
        await this._gmContributeToPartyFund({ actorId, thread, amount, requesterId, senderRecipientId });
        break;
      }
      case 'charge-party-fund': {
        await this._gmChargePartyFund({ thread, amount, requesterId, senderRecipientId });
        break;
      }
      case 'pay-from-party-fund': {
        await this._gmPayFromPartyFund({ thread, amount, recipientId, requesterId, senderRecipientId });
        break;
      }
      case 'transfer-credits':
      case 'job-payout': {
        if (!isGm && !hasRecipient(thread.participants, currentId)) return false;
        await this._gmTransferCredits({ actorId, thread, amount, recipientId, requesterId, senderRecipientId, asJobPayout: action === 'job-payout', partyFundCutPercent });
        break;
      }
    }

    Hooks.callAll('swseHolonetUpdated', { type: 'thread-updated', threadId: thread.id });
    HolonetSocketService.emitSync({ type: 'thread-updated', threadId: thread.id });
    return true;
  }

  static async _gmTransferCredits({ actorId, thread, amount, recipientId, requesterId = null, senderRecipientId = null, asJobPayout = false, partyFundCutPercent = null } = {}) {
    const value = parsePositiveCredits(amount);
    if (!value) return false;
    const recipient = recipientId === PARTY_FUND_RECIPIENT_ID ? null : this._recipientFromStableId(recipientId);
    const targetActor = recipient?.actorId ? game.actors?.get(recipient.actorId) : null;
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM || senderRecipientId?.startsWith('gm:'));

    if (recipientId === PARTY_FUND_RECIPIENT_ID) {
      if (!requesterIsGm) return this._gmContributeToPartyFund({ actorId, thread, amount: value, requesterId, senderRecipientId });
      const before = getPartyFundBalance();
      await setPartyFundBalance(before + value);
      await appendPartyFundLedger({ type: asJobPayout ? 'job-payout-to-fund' : 'gm-deposit', amount: value, threadId: thread.id, requesterId });
      await this._publishSystemMessage(thread, `Party Fund received ${formatCredits(value)} from ${asJobPayout ? 'Job Board' : 'GM Ledger'}. New balance: ${formatCredits(before + value)}.`, { eventType: 'party-fund-credit', amount: value });
      return true;
    }

    if (!targetActor) return false;
    if (requesterIsGm) {
      let playerAmount = value;
      let fundAmount = 0;
      if (asJobPayout && isPartyFundEnabled()) {
        const pct = partyFundCutPercent == null ? getPartyFundDefaultCutPercent() : Math.max(0, Math.min(100, Math.floor(Number(partyFundCutPercent) || 0)));
        fundAmount = Math.floor(value * pct / 100);
        playerAmount = value - fundAmount;
        if (fundAmount > 0) {
          const before = getPartyFundBalance();
          await setPartyFundBalance(before + fundAmount);
          await appendPartyFundLedger({ type: 'job-cut', amount: fundAmount, percent: pct, threadId: thread.id, targetActorId: targetActor.id, requesterId });
        }
      }
      if (playerAmount > 0) {
        await StoreTransactionEngine.grantCredits({
          toActor: targetActor,
          amount: playerAmount,
          metadata: { source: asJobPayout ? 'holonet-job-payout' : 'holonet-gm-grant', threadId: thread.id, requesterId }
        });
      }
      const cutText = fundAmount > 0 ? ` ${formatCredits(fundAmount)} was routed to the Party Fund.` : '';
      await this._publishReceiptMessage(thread, { title: asJobPayout ? 'Job Payout Receipt' : 'GM Credit Receipt', eventType: asJobPayout ? 'job-payout-receipt' : 'gm-credit-receipt', amount: playerAmount, lines: [`To: ${targetActor.name}`, cutText.trim()].filter(Boolean) });
      await this._publishSystemMessage(thread, `${asJobPayout ? 'Job Board' : 'GM Ledger'} paid ${formatCredits(playerAmount)} to ${targetActor.name}.${cutText}`, {
        eventType: asJobPayout ? 'job-payout' : 'gm-credit-grant',
        amount: playerAmount,
        partyFundCut: fundAmount,
        toActorId: targetActor.id,
        requesterId,
        senderRecipientId
      });
      return true;
    }

    // Non-GM direct transfer requests should be offers, not immediate mutations.
    return this._gmOfferCreditTransfer({ actorId, threadId: thread.id, recipientId, amount: value, requesterId, senderRecipientId });
  }

  static async _gmResolveCreditTransfer({ thread, recordId, action, actorId = null, requesterId = null, senderRecipientId = null } = {}) {
    if (!recordId) return false;
    const message = await HolonetStorage.getRecord(recordId);
    const transfer = message?.metadata?.creditTransfer;
    if (!message || !transfer) return false;
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM || senderRecipientId?.startsWith('gm:'));
    const currentId = senderRecipientId || currentRecipientId();

    if (['complete', 'declined', 'cancelled', 'failed'].includes(transfer.status)) return false;

    if (action === 'decline-transfer') {
      if (!requesterIsGm && currentId !== transfer.toRecipientId) return false;
      transfer.status = 'declined';
      transfer.resolvedAt = nowIso();
      transfer.resolvedBy = currentId;
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `${transfer.toLabel} declined ${formatCredits(transfer.amount)} from ${transfer.fromLabel}.`, { eventType: 'credit-transfer-declined', transferId: transfer.id });
      return true;
    }

    if (action === 'cancel-transfer') {
      if (!requesterIsGm && currentId !== transfer.fromRecipientId) return false;
      transfer.status = 'cancelled';
      transfer.resolvedAt = nowIso();
      transfer.resolvedBy = currentId;
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `${transfer.fromLabel} cancelled a ${formatCredits(transfer.amount)} credit transfer.`, { eventType: 'credit-transfer-cancelled', transferId: transfer.id });
      return true;
    }

    if (action === 'accept-transfer') {
      if (!requesterIsGm && currentId !== transfer.toRecipientId) return false;
      if (transfer.approvalRequired && !requesterIsGm) {
        transfer.status = 'pendingGm';
        transfer.acceptedAt = nowIso();
        transfer.acceptedBy = currentId;
        await HolonetStorage.saveRecord(message);
        await this._publishSystemMessage(thread, `${transfer.toLabel} accepted ${formatCredits(transfer.amount)} from ${transfer.fromLabel}. Awaiting GM approval.`, { eventType: 'credit-transfer-pending-gm', transferId: transfer.id });
        return true;
      }
    } else if (action === 'approve-transfer') {
      if (!requesterIsGm) return false;
    } else {
      return false;
    }

    const result = await this._executeCreditTransfer({ thread, message, transfer, requesterId, senderRecipientId });
    await HolonetStorage.saveRecord(message);
    return result;
  }

  static async _executeCreditTransfer({ thread, message, transfer, requesterId = null, senderRecipientId = null } = {}) {
    const value = parsePositiveCredits(transfer.amount);
    if (!value) return false;
    const targetActor = transfer.toActorId ? game.actors?.get(transfer.toActorId) : null;
    if (!targetActor) return false;

    try {
      if (transfer.kind === 'gmGrant') {
        await StoreTransactionEngine.grantCredits({ toActor: targetActor, amount: value, metadata: { source: 'holonet-transfer', threadId: thread.id, requesterId } });
      } else {
        const fromActor = transfer.fromActorId ? game.actors?.get(transfer.fromActorId) : null;
        if (!fromActor) throw new Error('Sender actor not found');
        await StoreTransactionEngine.transferCredits({ fromActor, toActor: targetActor, amount: value, metadata: { source: 'holonet-transfer', threadId: thread.id, requesterId } });
      }
      transfer.status = 'complete';
      transfer.resolvedAt = nowIso();
      transfer.resolvedBy = senderRecipientId || currentRecipientId();
      await this._publishSystemMessage(thread, `${transfer.fromLabel} transferred ${formatCredits(value)} to ${targetActor.name}.`, { eventType: 'credit-transfer-complete', transferId: transfer.id, amount: value });
      await this._publishReceiptMessage(thread, { title: 'Credit Transfer Receipt', eventType: 'credit-transfer-receipt', amount: value, lines: [`From: ${transfer.fromLabel}`, `To: ${targetActor.name}`] });
      return true;
    } catch (err) {
      transfer.status = 'failed';
      transfer.failureReason = err.message;
      transfer.resolvedAt = nowIso();
      await this._publishSystemMessage(thread, `Credit transfer failed: ${err.message}`, { eventType: 'credit-transfer-failed', transferId: transfer.id });
      return false;
    }
  }

  static async _gmContributeToPartyFund({ actorId, thread, amount, requesterId = null, senderRecipientId = null } = {}) {
    if (!isPartyFundEnabled()) return false;
    const value = parsePositiveCredits(amount);
    if (!value) return false;
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM || senderRecipientId?.startsWith('gm:'));
    const actor = actorId ? game.actors?.get(actorId) : requester?.character;
    if (!requesterIsGm) {
      if (!actor) return false;
      if (creditsOf(actor) < value) {
        await this._publishSystemMessage(thread, `${actor.name} attempted to contribute ${formatCredits(value)} to the Party Fund, but has insufficient credits.`, { eventType: 'party-fund-failed' });
        return false;
      }
      await ActorEngine.updateActor(actor, { 'system.credits': creditsOf(actor) - value });
    }
    const before = getPartyFundBalance();
    const after = await setPartyFundBalance(before + value);
    await appendPartyFundLedger({ type: 'contribution', amount: value, fromActorId: actor?.id ?? null, threadId: thread.id, requesterId });
    await this._publishSystemMessage(thread, `${actor?.name ?? 'GM Ledger'} contributed ${formatCredits(value)} to the Party Fund. New balance: ${formatCredits(after)}.`, { eventType: 'party-fund-contribution', amount: value, fromActorId: actor?.id ?? null });
    return true;
  }

  static async _gmChargePartyFund({ thread, amount, requesterId = null } = {}) {
    if (!game.users?.get(requesterId)?.isGM && !game.user?.isGM) return false;
    if (!isPartyFundEnabled()) return false;
    const value = parsePositiveCredits(amount);
    if (!value) return false;
    const before = getPartyFundBalance();
    if (before < value) {
      await this._publishSystemMessage(thread, `Party Fund charge failed: balance ${formatCredits(before)} is below ${formatCredits(value)}.`, { eventType: 'party-fund-charge-failed' });
      return false;
    }
    const after = await setPartyFundBalance(before - value);
    await appendPartyFundLedger({ type: 'charge', amount: -value, threadId: thread.id, requesterId });
    await this._publishSystemMessage(thread, `GM charged ${formatCredits(value)} to the Party Fund. New balance: ${formatCredits(after)}.`, { eventType: 'party-fund-charge', amount: value });
    return true;
  }

  static async _gmPayFromPartyFund({ thread, amount, recipientId, requesterId = null } = {}) {
    if (!game.users?.get(requesterId)?.isGM && !game.user?.isGM) return false;
    if (!isPartyFundEnabled()) return false;
    const value = parsePositiveCredits(amount);
    if (!value) return false;
    const recipient = this._recipientFromStableId(recipientId);
    const targetActor = recipient?.actorId ? game.actors?.get(recipient.actorId) : null;
    if (!targetActor) return false;
    const before = getPartyFundBalance();
    if (before < value) {
      await this._publishSystemMessage(thread, `Party Fund payout failed: balance ${formatCredits(before)} is below ${formatCredits(value)}.`, { eventType: 'party-fund-payout-failed' });
      return false;
    }
    await setPartyFundBalance(before - value);
    await StoreTransactionEngine.grantCredits({ toActor: targetActor, amount: value, metadata: { source: 'party-fund-payout', threadId: thread.id, requesterId } });
    await appendPartyFundLedger({ type: 'payout', amount: -value, toActorId: targetActor.id, threadId: thread.id, requesterId });
    await this._publishSystemMessage(thread, `Party Fund paid ${formatCredits(value)} to ${targetActor.name}. New balance: ${formatCredits(before - value)}.`, { eventType: 'party-fund-payout', amount: value, toActorId: targetActor.id });
    return true;
  }


  static async _gmResolveItemTransfer({ thread, recordId, action, actorId = null, requesterId = null, senderRecipientId = null } = {}) {
    if (!recordId) return false;
    const message = await HolonetStorage.getRecord(recordId);
    const transfer = message?.metadata?.itemTransfer;
    if (!message || !transfer) return false;
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM || senderRecipientId?.startsWith('gm:'));
    const currentId = senderRecipientId || currentRecipientId();
    if (['complete', 'declined', 'cancelled', 'failed'].includes(transfer.status)) return false;

    if (action === 'decline-item-transfer') {
      if (!requesterIsGm && currentId !== transfer.toRecipientId) return false;
      transfer.status = 'declined';
      transfer.resolvedAt = nowIso();
      transfer.resolvedBy = currentId;
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `${transfer.toLabel} declined ${safeArray(transfer.attachments).length} item(s) from ${transfer.fromLabel}.`, { eventType: 'item-transfer-declined', transferId: transfer.id });
      return true;
    }

    if (action === 'cancel-item-transfer') {
      if (!requesterIsGm && currentId !== transfer.fromRecipientId) return false;
      transfer.status = 'cancelled';
      transfer.resolvedAt = nowIso();
      transfer.resolvedBy = currentId;
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `${transfer.fromLabel} cancelled an item transfer.`, { eventType: 'item-transfer-cancelled', transferId: transfer.id });
      return true;
    }

    if (action !== 'accept-item-transfer') return false;
    if (!requesterIsGm && currentId !== transfer.toRecipientId) return false;
    const ok = await this._gmGrantItems({ thread, recipientId: transfer.toRecipientId, itemUuids: transfer.itemUuids, requesterId, eventType: 'item-transfer-complete', source: 'holonet-item-transfer' });
    transfer.status = ok ? 'complete' : 'failed';
    transfer.resolvedAt = nowIso();
    transfer.resolvedBy = currentId;
    await HolonetStorage.saveRecord(message);
    return ok;
  }

  static async _gmGrantItems({ thread, recipientId, itemUuids = [], requesterId = null, eventType = 'item-grant', source = 'holonet-item-grant' } = {}) {
    const recipient = this._recipientFromStableId(recipientId);
    const targetActor = recipient?.actorId ? game.actors?.get(recipient.actorId) : null;
    if (!targetActor) return false;
    const createdNames = [];
    const createData = [];
    for (const uuid of safeArray(itemUuids).map(String).filter(Boolean)) {
      try {
        const item = await fromUuid(uuid);
        if (!item) continue;
        const data = item.toObject ? item.toObject() : foundry.utils.deepClone(item);
        delete data._id;
        data.flags ??= {};
        data.flags.swse ??= {};
        data.flags.swse.holonetGrant = { source, threadId: thread.id, uuid, grantedAt: nowIso(), requesterId };
        createData.push(data);
        createdNames.push(item.name || 'Item');
      } catch (err) {
        console.warn('[Holonet] Failed resolving item grant', uuid, err);
      }
    }
    if (!createData.length) return false;
    await ActorEngine.createEmbeddedDocuments(targetActor, 'Item', createData, { source });
    await this._publishReceiptMessage(thread, {
      title: 'Item Delivery Receipt',
      eventType,
      lines: [`${targetActor.name} received ${createdNames.join(', ')}`]
    });
    await this._publishSystemMessage(thread, `${targetActor.name} received ${createdNames.length} item(s): ${createdNames.join(', ')}.`, { eventType, toActorId: targetActor.id, itemNames: createdNames });
    return true;
  }

  static async markThreadRead(threadId, recipientId = currentRecipientId()) {
    if (!threadId || !recipientId) return false;
    if (!game.user?.isGM) {
      HolonetSocketService.emitRequest('mark-thread-read', { threadId, recipientId });
      return true;
    }
    await this._gmMarkThreadRead(threadId, recipientId);
    return true;
  }

  static async _gmMarkThreadRead(threadId, recipientId) {
    const thread = await HolonetStorage.getThread(threadId);
    if (!thread) return false;
    for (const messageId of thread.messageIds ?? []) {
      const message = await HolonetStorage.getRecord(messageId);
      if (!message) continue;
      if (message.isUnreadBy(recipientId)) {
        message.markRead(recipientId);
        await HolonetStorage.saveRecord(message);
      }
    }
    return true;
  }

  static async getUnreadMessageCount(recipientId = currentRecipientId()) {
    if (!recipientId) return 0;
    const records = await HolonetStorage.getRecordsForRecipient(recipientId, ['published']);
    return records.filter(r => r.type === RECORD_TYPE.MESSAGE && r.isUnreadBy(recipientId)).length;
  }
}
