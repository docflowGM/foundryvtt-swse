/**
 * Holonet Messenger Service
 *
 * Threaded datapad messaging over the existing Holonet engine.
 * This service intentionally owns Messenger UX state, invite handshakes,
 * thread membership, GM oversight, and credit-transfer messages while leaving
 * actual actor mechanics to canonical engines.
 */

import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
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
  if (recipient.actorId) return game.actors?.get(recipient.actorId)?.img ?? null;
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

  static _recipientForActorContext(actor, { senderUserId = game.user?.id, senderRecipientId = currentRecipientId() } = {}) {
    if (senderRecipientId?.startsWith('persona:')) return HolonetRecipient.fromStableId(senderRecipientId);
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
    const gmObservers = safeArray(meta.gmObserverIds).map(id => HolonetRecipient.fromStableId(id)).filter(Boolean);
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
    return {
      id,
      label: recipientDisplayName(recipient),
      typeLabel: isGm ? 'GM' : (isPersona ? 'NPC Contact' : 'Player'),
      avatar: actorPortrait(actor) || userAvatar(user),
      isSelf: id === currentId,
      isGm,
      isPersona,
      isPlayer: !isGm && !isPersona,
      reason,
      actorId: recipient?.actorId ?? null,
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
      metadata: message.metadata ?? {}
    };
  }

  static _buildSelectedThreadVm(selectedThread, actor, participantId, recipientOptions) {
    if (!selectedThread) return null;
    const meta = getThreadMeta(selectedThread);
    const otherParticipants = safeArray(selectedThread.rawParticipants ?? selectedThread.participants)
      .filter(r => r.id !== participantId && !r.id?.startsWith('gm:'));
    const transferTargets = otherParticipants
      .map(r => this._decorateRecipient(r, { currentId: participantId }))
      .filter(r => r.actorId && !r.isPersona);
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
      ownerBadge: selectedThread.canManage ? 'Owner tools available' : `Owner: ${selectedThread.ownerLabel || 'Unknown'}`
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
      recipientOptions,
      composeMode: composeMode || !selectedThread,
      notificationCenter: noticeCenter,
      canCreateJobs: Boolean(game.user?.isGM),
      composerHelp: [
        '@ mention a character, NPC, ship, faction, or location',
        '# add a topic tag',
        '! mark an urgent alert',
        'Attach an image path to show a holostill'
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

  static async createJobPosting({ actor, title = '', body = '', recipientIds = [], contactRecipientId = '', rewardCredits = 0, rewardItems = '' }) {
    if (!game.user?.isGM) return false;
    const payload = {
      actorId: actor?.id ?? null,
      title: title?.trim() || 'Job Board Posting',
      body: body?.trim() || '',
      recipientIds,
      contactRecipientId,
      rewardCredits: parsePositiveCredits(rewardCredits),
      rewardItems: String(rewardItems || '').trim(),
      senderUserId: game.user?.id ?? null,
      senderRecipientId: currentRecipientId()
    };
    return this._gmCreateJobPosting(payload);
  }

  static async _gmCreateJobPosting({ actorId, title = 'Job Board Posting', body = '', recipientIds = [], contactRecipientId = '', rewardCredits = 0, rewardItems = '', senderUserId = null, senderRecipientId = null } = {}) {
    const actor = actorId ? game.actors?.get(actorId) : null;
    const senderRecipient = this._recipientForActorContext(actor, { senderUserId, senderRecipientId });
    const requested = this._normalizeRecipientIds(recipientIds)
      .map(id => HolonetRecipient.fromStableId(id))
      .filter(Boolean);
    const participants = uniqueRecipients([senderRecipient, ...requested]);
    const contactRecipient = contactRecipientId ? HolonetRecipient.fromStableId(contactRecipientId) : null;
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
        rewardItems: String(rewardItems || '').trim()
      }
    });

    const rewardLines = [];
    if (parsePositiveCredits(rewardCredits)) rewardLines.push(`Reward: +${parsePositiveCredits(rewardCredits).toLocaleString()}cr`);
    if (rewardItems?.trim()) rewardLines.push(`Items: ${rewardItems.trim()}`);
    const jobBody = [
      body?.trim() || 'A new job has been posted to the Holonet board.',
      rewardLines.length ? rewardLines.join(' // ') : ''
    ].filter(Boolean).join('

');

    await this._publishSystemMessage(thread, `Job posted: ${title || 'New Holonet Job'}.`, { eventType: 'job-posted' });
    await this._gmSendMessage({
      actorId: contactRecipient?.actorId ?? actorId,
      body: jobBody,
      imageUrl: '',
      threadId: thread.id,
      senderUserId,
      senderRecipientId: contactRecipient?.id ?? senderRecipientId
    });
    Hooks.callAll('swseHolonetUpdated', { type: 'thread-created', threadId: thread.id });
    HolonetSocketService.emitSync({ type: 'thread-updated', threadId: thread.id });
    return { threadId: thread.id };
  }

  static async sendMessage({ actor, body, threadId = null, recipientIds = [], imageUrl = '' }) {
    if (!body?.trim() && !imageUrl?.trim()) return false;
    const payload = {
      actorId: actor?.id ?? null,
      body: body?.trim() || '',
      imageUrl: imageUrl?.trim() || '',
      threadId,
      recipientIds,
      senderUserId: game.user?.id ?? null,
      senderRecipientId: currentRecipientId()
    };
    if (!game.user?.isGM) {
      HolonetSocketService.emitRequest('send-message', payload);
      return true;
    }
    await this._gmSendMessage(payload);
    return true;
  }

  static async createThread({ actor, body = '', title = '', threadType = THREAD_TYPE.PRIVATE, recipientIds = [], imageUrl = '' }) {
    const payload = {
      actorId: actor?.id ?? null,
      body: body?.trim() || '',
      title: title?.trim() || '',
      threadType,
      recipientIds,
      imageUrl: imageUrl?.trim() || '',
      senderUserId: game.user?.id ?? null,
      senderRecipientId: currentRecipientId()
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

  static async _gmCreateThread({ actorId, body = '', title = '', threadType = THREAD_TYPE.PRIVATE, recipientIds = [], imageUrl = '', senderUserId = null, senderRecipientId = null } = {}) {
    const actor = actorId ? game.actors?.get(actorId) : null;
    const senderRecipient = this._recipientForActorContext(actor, { senderUserId, senderRecipientId });
    const senderLabel = recipientDisplayName(senderRecipient);
    const requested = this._normalizeRecipientIds(recipientIds)
      .map(id => HolonetRecipient.fromStableId(id))
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
      await this._gmSendMessage({ actorId, body, imageUrl, threadId: thread.id, senderUserId, senderRecipientId });
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

  static async _gmSendMessage({ actorId, body, threadId = null, recipientIds = [], imageUrl = '', senderUserId = null, senderRecipientId = null }) {
    if (!body?.trim() && !imageUrl?.trim()) return null;
    const actor = actorId ? game.actors?.get(actorId) : null;
    const sender = this.getSenderForActor(actor, game.user?.name);
    let senderRecipient = this._recipientForActorContext(actor, { senderUserId, senderRecipientId });

    let thread = null;
    if (threadId) thread = await HolonetStorage.getThread(threadId);
    if (!thread) {
      const recipients = this._normalizeRecipientIds(recipientIds).map(id => HolonetRecipient.fromStableId(id)).filter(Boolean);
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
      body: body?.trim() || (imageUrl ? '[Holostill attached]' : ''),
      threadId: thread.id,
      metadata: {
        categoryId: HolonetPreferences.CATEGORIES.MESSAGES,
        senderRecipientId: senderRecipient?.id ?? null,
        imageUrl: imageUrl?.trim() || null
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

  static async threadAction({ actor, threadId, action, recipientIds = [], amount = null, recipientId = null }) {
    const payload = { actorId: actor?.id ?? null, threadId, action, recipientIds, amount, recipientId, requesterId: game.user?.id ?? null, senderRecipientId: currentRecipientId() };
    if (!game.user?.isGM) {
      HolonetSocketService.emitRequest('thread-action', payload);
      return true;
    }
    await this._gmThreadAction(payload);
    return true;
  }

  static async _gmThreadAction({ actorId, threadId, action, recipientIds = [], amount = null, recipientId = null, requesterId = null, senderRecipientId = null } = {}) {
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
          .map(id => HolonetRecipient.fromStableId(id))
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
          .map(id => HolonetRecipient.fromStableId(id))
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
        const removed = safeArray(thread.participants).find(r => r.id === targetId) || safeArray(meta.pendingInvites).find(r => r.id === targetId) || HolonetRecipient.fromStableId(targetId);
        thread.participants = safeArray(thread.participants).filter(r => r.id !== targetId);
        meta.pendingInvites = safeArray(meta.pendingInvites).filter(r => r.id !== targetId);
        await HolonetStorage.saveThread(thread);
        await this._publishSystemMessage(thread, `${recipientDisplayName(removed)} was removed from the chat.`, { eventType: 'member-removed' });
        break;
      }
      case 'transfer-credits':
      case 'job-payout': {
        if (!isGm && !hasRecipient(thread.participants, currentId)) return false;
        await this._gmTransferCredits({ actorId, thread, amount, recipientId, requesterId, senderRecipientId, asJobPayout: action === 'job-payout' });
        break;
      }
    }

    Hooks.callAll('swseHolonetUpdated', { type: 'thread-updated', threadId: thread.id });
    HolonetSocketService.emitSync({ type: 'thread-updated', threadId: thread.id });
    return true;
  }

  static async _gmTransferCredits({ actorId, thread, amount, recipientId, requesterId = null, senderRecipientId = null, asJobPayout = false } = {}) {
    const value = parsePositiveCredits(amount);
    if (!value) return false;
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM);
    const senderActor = requesterIsGm
      ? (actorId ? game.actors?.get(actorId) : null)
      : (requester?.character ?? (actorId ? game.actors?.get(actorId) : null));
    if (!requesterIsGm && !senderActor) return false;
    const recipient = HolonetRecipient.fromStableId(recipientId);
    const targetActor = recipient?.actorId ? game.actors?.get(recipient.actorId) : null;
    if (!targetActor) return false;

    if (!requesterIsGm) {
      const senderBalance = creditsOf(senderActor);
      if (senderBalance < value) {
        await this._publishSystemMessage(thread, `${senderActor.name} attempted to transfer ${formatCredits(value)}, but has insufficient credits.`, { eventType: 'credit-transfer-failed' });
        return false;
      }
      await ActorEngine.updateActor(senderActor, { 'system.credits': senderBalance - value });
    }

    await ActorEngine.updateActor(targetActor, { 'system.credits': creditsOf(targetActor) + value });
    const sourceLabel = requesterIsGm
      ? (asJobPayout ? 'Job Board' : 'GM Ledger')
      : senderActor.name;
    await this._publishSystemMessage(thread, `${sourceLabel} transferred ${formatCredits(value)} to ${targetActor.name}.`, {
      eventType: asJobPayout ? 'job-payout' : 'credit-transfer',
      amount: value,
      fromActorId: requesterIsGm ? null : senderActor.id,
      toActorId: targetActor.id,
      requesterId,
      senderRecipientId
    });
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
