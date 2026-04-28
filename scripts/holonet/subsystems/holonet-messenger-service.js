/**
 * Holonet Messenger Service
 */

import { HolonetStorage } from './holonet-storage.js';
import { HolonetThreadService } from './holonet-thread-service.js';
import { HolonetEngine } from '../holonet-engine.js';
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

export class HolonetMessengerService {
  static getCurrentParticipantId() {
    return currentRecipientId();
  }

  static getSenderForActor(actor) {
    return HolonetSender.fromActor(actor?.id ?? null, actor?.name ?? game.user?.name ?? 'Unknown', actorPortrait(actor));
  }

  static buildRecipientOptions(actor) {
    const currentId = currentRecipientId();
    const options = [];

    for (const user of game.users ?? []) {
      if (!user.active) continue;
      const recipientId = user.isGM ? `gm:${user.id}` : `player:${user.id}`;
      if (recipientId === currentId) continue;
      options.push({
        id: recipientId,
        label: user.isGM ? `GM // ${user.name}` : (user.character?.name || user.name),
        typeLabel: user.isGM ? 'GM' : 'Player',
        avatar: user.character?.img || user.avatar || null,
        isPersona: false
      });
    }

    const npcActors = (game.actors?.contents ?? [])
      .filter(a => ['npc', 'beast'].includes(a.type))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 30);

    for (const npc of npcActors) {
      options.push({
        id: `persona:${PERSONA_TYPE.NPC}:${npc.id}`,
        label: npc.name,
        typeLabel: 'NPC',
        avatar: npc.img || null,
        isPersona: true
      });
    }

    return options;
  }

  static async getThreadsForCurrentParticipant(actor) {
    const participantId = currentRecipientId();
    if (!participantId) return [];

    const threads = await HolonetStorage.getThreadsForParticipant(participantId);
    const enriched = [];
    for (const thread of threads) {
      const hydrated = await HolonetThreadService.getThreadWithMessages(thread.id);
      if (!hydrated) continue;
      const messages = (hydrated.messages ?? []).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const unreadCount = messages.filter(m => m.type === RECORD_TYPE.MESSAGE && m.isUnreadBy(participantId) && m.sender?.actorId !== actor?.id).length;
      const lastMessage = messages[messages.length - 1] ?? null;
      enriched.push({
        ...hydrated,
        unreadCount,
        lastMessage,
        title: this._threadTitle(hydrated, participantId, actor),
        preview: previewText(lastMessage?.body ?? '', 68)
      });
    }

    return enriched.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }

  static _threadTitle(thread, participantId, actor) {
    const others = (thread.participants ?? []).filter(p => p.id !== participantId);
    if (!others.length) return thread.title || 'Messenger';
    return others.map(p => p.actorName || p.metadata?.label || p.id).join(', ');
  }

  static async buildViewModel(actor, options = {}) {
    const participantId = currentRecipientId();
    const [threads, noticeCenter] = await Promise.all([
      this.getThreadsForCurrentParticipant(actor),
      HolonetNoticeCenterService.buildCenterVm({ actor, previewLimit: 2 })
    ]);
    const selectedThreadId = options.threadId || threads[0]?.id || null;
    const selectedThread = threads.find(t => t.id === selectedThreadId) || null;

    const messages = (selectedThread?.messages ?? []).map(message => ({
      id: message.id,
      body: message.body,
      bodyHtml: renderMarkup(message.body ?? ''),
      createdAt: message.createdAt,
      senderLabel: message.sender?.actorName || message.sender?.systemLabel || 'Unknown',
      senderAvatar: message.sender?.avatar || null,
      isOwn: message.sender?.actorId === actor?.id,
      isUnread: message.isUnreadBy(participantId)
    }));

    return {
      id: 'messenger',
      title: 'Messenger',
      actorName: actor?.name ?? '',
      actorId: actor?.id ?? null,
      participantId,
      unreadCount: threads.reduce((sum, t) => sum + (t.unreadCount || 0), 0),
      threads,
      selectedThreadId,
      selectedThread,
      messages,
      recipientOptions: this.buildRecipientOptions(actor),
      notificationCenter: noticeCenter,
      composerHelp: [
        '@ mention character, NPC, ship, faction, or location',
        '# add emphasis or a topic tag',
        '! mark urgent alerts',
        '+800cr style credits/rewards'
      ]
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

  static async _gmSendMessage({ actorId, body, threadId = null, recipientIds = [], senderUserId = null, senderRecipientId = null }) {
    if (!body?.trim()) return null;
    const actor = actorId ? game.actors?.get(actorId) : null;
    const sender = this.getSenderForActor(actor);
    let senderRecipient = null;
    if (senderRecipientId?.startsWith('player:')) {
      senderRecipient = HolonetRecipient.player(senderUserId, actor?.id, actor?.name);
    } else if (senderRecipientId?.startsWith('gm:')) {
      senderRecipient = HolonetRecipient.gm(senderUserId || game.user?.id);
    } else {
      senderRecipient = game.user?.isGM ? HolonetRecipient.gm(game.user.id) : HolonetRecipient.player(game.user?.id, actor?.id, actor?.name);
    }

    let thread = null;
    if (threadId) {
      thread = await HolonetStorage.getThread(threadId);
    }
    if (!thread) {
      const recipients = recipientIds.map(id => this._recipientFromId(id)).filter(Boolean);
      const participants = [senderRecipient, ...recipients];
      const title = recipients.map(r => r.actorName || r.metadata?.label || r.id).join(', ') || 'Conversation';
      thread = await HolonetThreadService.getOrCreateThread(title, participants, { sourceFamily: SOURCE_FAMILY.MESSENGER });
    }

    const message = MessengerSource.createMessage({
      sender,
      audience: HolonetAudience.threadParticipants(thread.participants.map(p => p.id)),
      body,
      threadId: thread.id,
      metadata: { categoryId: HolonetPreferences.CATEGORIES.MESSAGES }
    });
    message.intent = INTENT_TYPE.PLAYER_MESSAGE;
    message.metadata = {
      ...(message.metadata ?? {}),
      categoryId: HolonetPreferences.CATEGORIES.MESSAGES
    };
    message.projections = [{ surfaceType: SURFACE_TYPE.MESSENGER_THREAD, recordId: message.id, isPinned: false, metadata: {} }];

    await HolonetEngine.publish(message, { skipSocket: true });
    if (senderRecipient?.id) {
      await HolonetEngine.markRead(message.id, senderRecipient.id, { skipSocket: true });
    }
    await HolonetThreadService.addMessageToThread(thread.id, message.id);
    return { threadId: thread.id, messageId: message.id };
  }

  static _recipientFromId(id) {
    if (!id) return null;
    if (id.startsWith('player:')) {
      const userId = id.split(':')[1];
      const user = game.users?.get(userId);
      return HolonetRecipient.player(userId, user?.character?.id, user?.character?.name || user?.name);
    }
    if (id.startsWith('gm:')) {
      const userId = id.split(':')[1];
      return HolonetRecipient.gm(userId);
    }
    if (id.startsWith('persona:')) {
      const [, personaType = PERSONA_TYPE.NPC, actorId = null] = id.split(':');
      const actor = actorId ? game.actors?.get(actorId) : null;
      return HolonetRecipient.persona(actorId, actor?.name || 'Persona', personaType);
    }
    return null;
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
