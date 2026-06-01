/**
 * Holonet Messenger Service
 */

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

function previewText(value = '', length = 80) {
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

function formatTimestamp(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  try {
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  } catch (_err) {
    return String(value);
  }
}

function isGmObserver(participant) {
  return participant?.recipientType === RECIPIENT_TYPE.GM || participant?.metadata?.role === 'gm-observer';
}

function isPersona(participant) {
  return participant?.recipientType === RECIPIENT_TYPE.PERSONA || String(participant?.id ?? '').startsWith('persona:');
}

function uniqueRecipients(recipients = []) {
  const map = new Map();
  for (const recipient of recipients) {
    if (!recipient?.id) continue;
    map.set(recipient.id, recipient);
  }
  return Array.from(map.values());
}

function gmObserverRecipients() {
  const gms = (game.users?.contents ?? game.users ?? [])
    .filter(user => user?.isGM)
    .map(user => {
      const gm = HolonetRecipient.gm(user.id);
      gm.metadata = {
        ...(gm.metadata ?? {}),
        role: 'gm-observer',
        hiddenFromPlayers: true
      };
      return gm;
    });

  if (gms.length) return gms;
  const fallback = HolonetRecipient.gm();
  fallback.metadata = { ...(fallback.metadata ?? {}), role: 'gm-observer', hiddenFromPlayers: true };
  return [fallback];
}

function recipientAvatar(recipient) {
  if (!recipient) return null;
  if (recipient.actorId) return actorPortrait(game.actors?.get(recipient.actorId));
  if (recipient.userId) {
    const user = game.users?.get(recipient.userId);
    return user?.character?.img || user?.avatar || null;
  }
  return null;
}

function participantLabel(participant) {
  return participant?.actorName || participant?.metadata?.label || participant?.id || 'Unknown';
}

function participantKind(participant) {
  if (participant?.recipientType === RECIPIENT_TYPE.GM || String(participant?.id ?? '').startsWith('gm:')) return 'GM';
  if (participant?.recipientType === RECIPIENT_TYPE.PERSONA || String(participant?.id ?? '').startsWith('persona:')) {
    const persona = participant?.personaType || String(participant?.id ?? '').split(':')[1] || 'Persona';
    if (persona === PERSONA_TYPE.NPC) return 'NPC';
    if (persona === PERSONA_TYPE.MENTOR) return 'Mentor';
    if (persona === PERSONA_TYPE.VENDOR) return 'Vendor';
    return 'Contact';
  }
  return 'Player';
}

export class HolonetMessengerService {
  static getCurrentParticipantId() {
    return currentRecipientId();
  }

  static getSenderForActor(actor) {
    return HolonetSender.fromActor(actor?.id ?? null, actor?.name ?? game.user?.name ?? 'Unknown', actorPortrait(actor));
  }

  static #recipientOptionFromUser(user, currentId) {
    const recipientId = user.isGM ? `gm:${user.id}` : `player:${user.id}`;
    if (recipientId === currentId) return null;
    const characterName = user.character?.name || user.name;
    return {
      id: recipientId,
      label: user.isGM ? `GM // ${user.name}` : characterName,
      subtitle: user.isGM ? 'Gamemaster channel' : (user.active ? 'Player channel' : 'Player channel // offline'),
      typeLabel: user.isGM ? 'GM' : 'Player',
      category: user.isGM ? 'gm' : 'player',
      avatar: user.character?.img || user.avatar || null,
      isPersona: false,
      isOnline: Boolean(user.active),
      isLocked: false
    };
  }

  static #recipientOptionFromPersona(actor, { contactOnly = false } = {}) {
    return {
      id: `persona:${PERSONA_TYPE.NPC}:${actor.id}`,
      label: actor.name,
      subtitle: contactOnly ? 'Established contact // GM operated' : 'NPC contact // GM operated',
      typeLabel: 'NPC',
      category: 'npc',
      avatar: actorPortrait(actor),
      isPersona: true,
      isOnline: true,
      isLocked: false
    };
  }

  static #groupRecipientOptions(options = []) {
    const groups = [
      { key: 'player', label: 'Crew / Player Actors', options: [] },
      { key: 'gm', label: 'Gamemaster', options: [] },
      { key: 'npc', label: 'NPC Contacts', options: [] }
    ];
    const byKey = new Map(groups.map(group => [group.key, group]));
    for (const option of options) {
      const group = byKey.get(option.category) ?? byKey.get('player');
      group.options.push(option);
    }
    return groups.filter(group => group.options.length);
  }

  static async #establishedNpcContactIds(participantId) {
    if (!participantId) return new Set();
    const threads = await HolonetStorage.getThreadsForParticipant(participantId);
    const contactIds = new Set();
    for (const thread of threads) {
      for (const participant of thread.participants ?? []) {
        if (participant?.recipientType === RECIPIENT_TYPE.PERSONA && participant?.personaType === PERSONA_TYPE.NPC && participant.actorId) {
          contactIds.add(participant.actorId);
        }
      }
    }
    return contactIds;
  }

  static async buildRecipientOptions(actor, options = {}) {
    const currentId = currentRecipientId();
    const contactsOnly = !game.user?.isGM;
    const npcContactIds = await this.#establishedNpcContactIds(currentId);
    const recipientOptions = [];

    for (const user of game.users ?? []) {
      const option = this.#recipientOptionFromUser(user, currentId);
      if (option) recipientOptions.push(option);
    }

    const npcActors = (game.actors?.contents ?? [])
      .filter(a => ['npc', 'beast'].includes(a.type))
      .sort((a, b) => a.name.localeCompare(b.name));

    const visibleNpcs = game.user?.isGM
      ? npcActors.slice(0, 80)
      : npcActors.filter(npc => npcContactIds.has(npc.id));

    for (const npc of visibleNpcs) {
      recipientOptions.push(this.#recipientOptionFromPersona(npc, { contactOnly: contactsOnly }));
    }

    return recipientOptions.sort((a, b) => {
      const order = { player: 0, gm: 1, npc: 2 };
      const diff = (order[a.category] ?? 9) - (order[b.category] ?? 9);
      if (diff) return diff;
      return String(a.label).localeCompare(String(b.label));
    });
  }

  static async getThreadsForCurrentParticipant(actor) {
    const participantId = currentRecipientId();
    if (!participantId) return [];

    const threads = game.user?.isGM
      ? await HolonetStorage.getAllThreads()
      : await HolonetStorage.getThreadsForParticipant(participantId);

    const enriched = [];
    for (const thread of threads) {
      if (thread.isArchived) continue;
      const hydrated = await HolonetThreadService.getThreadWithMessages(thread.id);
      if (!hydrated) continue;
      const messages = (hydrated.messages ?? []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const unreadCount = messages.filter(m => {
        if (m.type !== RECORD_TYPE.MESSAGE) return false;
        if (!m.isUnreadBy(participantId)) return false;
        if (m.sender?.actorId && m.sender.actorId === actor?.id) return false;
        return true;
      }).length;
      const lastMessage = messages[messages.length - 1] ?? null;
      const displayParticipants = this._displayParticipants(hydrated, participantId);
      const hasNpcContact = (hydrated.participants ?? []).some(p => isPersona(p) && participantKind(p) === 'NPC');
      const isPlayerPrivate = (hydrated.participants ?? []).filter(p => !isGmObserver(p)).every(p => !isPersona(p));
      enriched.push({
        ...hydrated,
        messages,
        unreadCount,
        lastMessage,
        displayParticipants,
        hasNpcContact,
        isPlayerPrivate,
        isGmVisible: true,
        title: this._threadTitle(hydrated, participantId, actor),
        preview: previewText(lastMessage?.body ?? 'No transmissions yet.', 86),
        updatedLabel: formatTimestamp(hydrated.updatedAt || lastMessage?.createdAt || hydrated.createdAt),
        contactAvatar: displayParticipants[0]?.avatar || null,
        contactKind: displayParticipants[0]?.kind || (hasNpcContact ? 'NPC' : 'Thread')
      });
    }

    return enriched.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  static _displayParticipants(thread, participantId) {
    return (thread.participants ?? [])
      .filter(p => p.id !== participantId)
      .filter(p => !(p.metadata?.hiddenFromPlayers && !game.user?.isGM))
      .filter(p => !isGmObserver(p) || game.user?.isGM)
      .map(p => ({
        id: p.id,
        label: participantLabel(p),
        kind: participantKind(p),
        avatar: recipientAvatar(p),
        isGmObserver: isGmObserver(p),
        isPersona: isPersona(p)
      }));
  }

  static _threadTitle(thread, participantId, actor) {
    const participants = this._displayParticipants(thread, participantId).filter(p => !p.isGmObserver);
    if (!participants.length) return thread.title || 'Messenger';
    return participants.map(p => p.label).join(', ');
  }

  static async buildViewModel(actor, options = {}) {
    const participantId = currentRecipientId();
    const [threads, noticeCenter, recipientOptions] = await Promise.all([
      this.getThreadsForCurrentParticipant(actor),
      HolonetNoticeCenterService.buildCenterVm({ actor, previewLimit: 2 }),
      this.buildRecipientOptions(actor, options)
    ]);

    const isComposingNew = Boolean(options.compose) || (!threads.length && !options.threadId);
    const selectedThreadId = isComposingNew ? null : (options.threadId || threads[0]?.id || null);
    const selectedThread = threads.find(t => t.id === selectedThreadId) || null;

    const messages = (selectedThread?.messages ?? []).map(message => {
      const senderActor = message.sender?.actorId ? game.actors?.get(message.sender.actorId) : null;
      return {
        id: message.id,
        body: message.body,
        bodyHtml: renderMarkup(message.body ?? ''),
        createdAt: formatTimestamp(message.createdAt),
        senderLabel: message.sender?.actorName || message.sender?.systemLabel || 'Unknown',
        senderAvatar: message.sender?.avatar || actorPortrait(senderActor),
        senderKind: senderActor?.type === 'npc' || senderActor?.type === 'beast' ? 'NPC' : 'Sender',
        isOwn: message.sender?.actorId === actor?.id,
        isUnread: participantId ? message.isUnreadBy(participantId) : false
      };
    });

    return {
      id: 'messenger',
      title: 'Messenger',
      actorName: actor?.name ?? '',
      actorId: actor?.id ?? null,
      participantId,
      isGm: Boolean(game.user?.isGM),
      isComposingNew,
      unreadCount: threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0),
      threads,
      selectedThreadId,
      selectedThread,
      selectedContactSummary: selectedThread?.displayParticipants?.map(p => `${p.label}${p.kind ? ` (${p.kind})` : ''}`).join(' · ') ?? '',
      messages,
      recipientOptions,
      recipientGroups: this.#groupRecipientOptions(recipientOptions),
      hasNpcContacts: recipientOptions.some(o => o.category === 'npc'),
      notificationCenter: noticeCenter,
      composerHelp: [
        '@ mention character, NPC, ship, faction, or location',
        '# add a topic tag',
        '! mark urgent alerts',
        '+800cr style credits/rewards'
      ],
      privacyNote: game.user?.isGM
        ? 'GM oversight active: all private transmissions are visible here.'
        : 'Private to thread recipients. GMs can audit Holonet traffic.'
    };
  }

  static async sendMessage({ actor, body, threadId = null, recipientIds = [] }) {
    if (!body?.trim()) return false;
    const payload = {
      actorId: actor?.id ?? null,
      body: body.trim(),
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

  static _senderRecipientFromRequest({ actor, senderUserId = null, senderRecipientId = null }) {
    if (senderRecipientId?.startsWith('player:')) {
      return HolonetRecipient.player(senderUserId, actor?.id, actor?.name);
    }
    if (senderRecipientId?.startsWith('gm:')) {
      const gm = HolonetRecipient.gm(senderUserId || game.user?.id);
      gm.metadata = { ...(gm.metadata ?? {}), role: 'gm-observer', hiddenFromPlayers: true };
      return gm;
    }
    if (game.user?.isGM) {
      const gm = HolonetRecipient.gm(game.user.id);
      gm.metadata = { ...(gm.metadata ?? {}), role: 'gm-observer', hiddenFromPlayers: true };
      return gm;
    }
    return HolonetRecipient.player(game.user?.id, actor?.id, actor?.name);
  }

  static _senderPersonaForActor(actor) {
    if (!actor || !['npc', 'beast'].includes(actor.type)) return null;
    const persona = HolonetRecipient.persona(actor.id, actor.name, PERSONA_TYPE.NPC);
    persona.metadata = { ...(persona.metadata ?? {}), role: 'sender-persona', label: actor.name };
    return persona;
  }

  static _isNpcPersonaRecipient(recipient) {
    return recipient?.recipientType === RECIPIENT_TYPE.PERSONA && recipient?.personaType === PERSONA_TYPE.NPC;
  }

  static async _gmSendMessage({ actorId, body, threadId = null, recipientIds = [], senderUserId = null, senderRecipientId = null }) {
    if (!body?.trim()) return null;
    const actor = actorId ? game.actors?.get(actorId) : null;
    const sender = this.getSenderForActor(actor);
    const senderRecipient = this._senderRecipientFromRequest({ actor, senderUserId, senderRecipientId });
    const senderPersona = this._senderPersonaForActor(actor);

    let thread = null;
    if (threadId) {
      thread = await HolonetStorage.getThread(threadId);
    }
    if (!thread) {
      let allowedRecipientIds = [...recipientIds];
      if (senderRecipient?.recipientType === RECIPIENT_TYPE.PLAYER) {
        const establishedNpcIds = await this.#establishedNpcContactIds(senderRecipient.id);
        allowedRecipientIds = allowedRecipientIds.filter(id => {
          if (!String(id).startsWith(`persona:${PERSONA_TYPE.NPC}:`)) return true;
          const actorId = String(id).split(':')[2];
          return establishedNpcIds.has(actorId);
        });
      }
      const recipients = allowedRecipientIds.map(id => HolonetRecipient.fromStableId(id)).filter(Boolean);
      if (!recipients.length) {
        console.warn('[HolonetMessengerService] No eligible recipients for new thread');
        return null;
      }
      const needsGmObserver = true;
      const gmObservers = needsGmObserver ? gmObserverRecipients() : [];
      const participants = uniqueRecipients([
        senderRecipient,
        senderPersona,
        ...recipients,
        ...gmObservers
      ]);
      const visibleRecipients = participants.filter(p => !isGmObserver(p) && p.id !== senderRecipient?.id);
      const title = visibleRecipients.map(r => r.actorName || r.metadata?.label || r.id).join(', ') || 'Conversation';
      const hasPersona = participants.some(p => this._isNpcPersonaRecipient(p));
      thread = await HolonetThreadService.getOrCreateThread(title, participants, {
        sourceFamily: SOURCE_FAMILY.MESSENGER,
        gmVisible: true,
        hasPersona,
        privateThread: true
      });
    } else {
      const participants = uniqueRecipients([...(thread.participants ?? []), ...gmObserverRecipients()]);
      if (participants.length !== (thread.participants ?? []).length) {
        thread.participants = participants;
        thread.metadata = { ...(thread.metadata ?? {}), gmVisible: true };
        await HolonetStorage.saveThread(thread);
      }
    }

    const participantIds = uniqueRecipients(thread.participants ?? []).map(p => p.id);
    const message = MessengerSource.createMessage({
      sender,
      audience: HolonetAudience.threadParticipants(participantIds),
      body,
      threadId: thread.id,
      metadata: { categoryId: HolonetPreferences.CATEGORIES.MESSAGES }
    });
    message.intent = INTENT_TYPE.PLAYER_MESSAGE;
    message.metadata = {
      ...(message.metadata ?? {}),
      categoryId: HolonetPreferences.CATEGORIES.MESSAGES,
      gmVisible: true
    };
    message.projections = [
      { surfaceType: SURFACE_TYPE.MESSENGER_THREAD, recordId: message.id, isPinned: false, metadata: {} },
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
    return { threadId: result.threadId, messageId: result.messageId };
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
