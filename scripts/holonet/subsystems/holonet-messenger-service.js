/**
 * Holonet Messenger Service
 *
 * Threaded datapad messaging over the existing Holonet engine.
 * This service intentionally owns Messenger UX state, invite handshakes,
 * thread membership, GM oversight, and credit-transfer messages while leaving
 * actual actor mechanics to canonical engines.
 */

import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { TransactionEngine } from '/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js';
import { StoreAcquisitionService } from '/systems/foundryvtt-swse/scripts/engine/store/acquisition-service.js';
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

function creditTransfersEnabled() {
  return Boolean(getSwseSetting('holonetCreditTransfersEnabled', true));
}

function itemTradesEnabled() {
  return Boolean(getSwseSetting('holonetItemTradesEnabled', true));
}

function itemTradeApprovalRequired() {
  return Boolean(getSwseSetting('holonetRequireItemTradeApproval', false));
}

function assetTradesEnabled() {
  return Boolean(getSwseSetting('holonetAssetTradesEnabled', true));
}

function assetTradeApprovalRequired() {
  return Boolean(getSwseSetting('holonetRequireAssetTradeApproval', true));
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

function normalizeQuantity(value, fallback = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.floor(numeric));
}

function getItemQuantity(item) {
  return Math.max(1, normalizeQuantity(
    item?.system?.quantity
      ?? item?.system?.equippedQty
      ?? item?.system?.uses?.value
      ?? item?.quantity
      ?? 1,
    1
  ));
}

function setItemQuantityOnData(data, quantity) {
  const next = Math.max(1, normalizeQuantity(quantity, 1));
  data.system ??= {};
  if (data.system.quantity !== undefined || data.system.equippedQty === undefined) {
    data.system.quantity = next;
  } else {
    data.system.equippedQty = next;
  }
  return data;
}

function itemQuantityUpdatePath(item) {
  if (item?.system?.quantity !== undefined || item?.system?.equippedQty === undefined) return 'system.quantity';
  return 'system.equippedQty';
}

function itemCategory(item) {
  const type = String(item?.type || '').toLowerCase();
  const sys = item?.system ?? {};
  const weaponKind = String(sys.weaponType ?? sys.weaponGroup ?? sys.meleeOrRanged ?? '').toLowerCase();
  if (type === 'weapon') return weaponKind.includes('melee') ? 'Weapons — Melee' : 'Weapons — Ranged';
  if (type === 'armor') return 'Armor';
  if (String(sys.modificationType ?? sys.slot ?? '').trim()) return 'Modifications';
  if (['modification', 'upgrade'].includes(type)) return 'Modifications';
  return 'Gear';
}


function actorAssetCategory(actor) {
  const type = String(actor?.type || '').toLowerCase();
  const systemType = String(actor?.system?.vehicleType ?? actor?.system?.shipType ?? actor?.system?.type ?? '').toLowerCase();
  if (type === 'droid' || systemType.includes('droid')) return 'Droids';
  if (type === 'starship' || systemType.includes('starship') || systemType.includes('ship')) return 'Starships';
  if (type === 'vehicle' || systemType.includes('vehicle')) return 'Vehicles';
  return 'Assets';
}

function assetActorByLink(link = {}) {
  const id = String(link.id || '').trim();
  const uuid = String(link.uuid || '').trim();
  return (id ? game.actors?.get?.(id) : null)
    ?? (uuid.startsWith('Actor.') ? game.actors?.get?.(uuid.slice('Actor.'.length)) : null)
    ?? null;
}

function ownedActorLinks(actor) {
  const owned = Array.isArray(actor?.system?.ownedActors) ? actor.system.ownedActors : [];
  const relationships = Array.isArray(actor?.system?.relationships) ? actor.system.relationships : [];
  const byId = new Map();
  for (const link of owned) {
    const id = String(link?.id || link?.uuid || '').replace(/^Actor\./, '');
    if (!id) continue;
    byId.set(id, { ...link, id, uuid: link.uuid || `Actor.${id}` });
  }
  for (const rel of relationships) {
    const id = String(rel?.id || rel?.uuid || '').replace(/^Actor\./, '');
    if (!id || byId.has(id)) continue;
    const type = String(rel?.type || '').toLowerCase();
    if (!type.includes('asset') && !['droid', 'vehicle', 'starship'].includes(type)) continue;
    byId.set(id, { ...rel, id, uuid: rel.uuid || `Actor.${id}` });
  }
  return Array.from(byId.values());
}

function removeAssetLinks(actor, assetIds = []) {
  const ids = new Set(safeArray(assetIds).map(id => String(id || '').replace(/^Actor\./, '')).filter(Boolean));
  if (!actor || !ids.size) return {};
  const owned = Array.isArray(actor.system?.ownedActors) ? foundry.utils.deepClone(actor.system.ownedActors) : [];
  const relationships = Array.isArray(actor.system?.relationships) ? foundry.utils.deepClone(actor.system.relationships) : [];
  return {
    'system.ownedActors': owned.filter(link => !ids.has(String(link?.id || link?.uuid || '').replace(/^Actor\./, ''))),
    'system.relationships': relationships.filter(link => !ids.has(String(link?.id || link?.uuid || '').replace(/^Actor\./, '')))
  };
}

function compactMemo(value = '', length = 15) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length <= length ? text : `${text.slice(0, length)}…`;
}

function splitAmount(total, count, mode = 'split-total') {
  const amount = parsePositiveCredits(total);
  const recipients = Math.max(1, Math.floor(Number(count) || 1));
  if (!amount) return [];
  if (mode === 'send-each' || mode === 'request-each') return Array.from({ length: recipients }, () => amount);
  const base = Math.floor(amount / recipients);
  let remainder = amount % recipients;
  return Array.from({ length: recipients }, () => base + (remainder-- > 0 ? 1 : 0));
}

function transferStatusLabel(status = '') {
  return status === 'complete' ? 'Complete'
    : status === 'declined' ? 'Declined'
    : status === 'cancelled' ? 'Cancelled'
    : status === 'failed' ? 'Failed'
    : status === 'pendingGm' ? 'Awaiting GM Approval'
    : status === 'counterOffered' ? 'Counter Offer Pending'
    : status === 'counterPendingGm' ? 'Counter Awaiting GM Approval'
    : 'Awaiting Recipient';
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

  static _emitMessengerSync(data = {}) {
    HolonetSocketService.emitSync({
      source: SOURCE_FAMILY.MESSENGER,
      ...data
    });
  }

  static _threadSyncPayload(threadId, extra = {}) {
    return {
      type: 'thread-updated',
      threadId,
      source: SOURCE_FAMILY.MESSENGER,
      ...extra
    };
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
    const assetTransfer = message.metadata?.assetTransfer ?? null;
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
      hasAssetTransfer: Boolean(assetTransfer),
      assetTransfer: assetTransfer ? this._assetTransferVm(message, assetTransfer, actor, participantId) : null,
      hasReceipt: Boolean(receipt),
      receipt,
      hasJobCard: Boolean(job),
      job
    };
  }

  static _creditTransferVm(message, transfer, actor, participantId) {
    const status = transfer.status || 'pendingRecipient';
    const amount = Number(transfer.amount || transfer.totalAmount || 0);
    const isGm = Boolean(game.user?.isGM);
    const isRequest = transfer.kind === 'creditRequest';
    if (isRequest) {
      const entries = safeArray(transfer.entries);
      const ownEntry = entries.find(entry => entry.recipientId === participantId || (entry.actorId && actor?.id === entry.actorId)) ?? null;
      const paid = entries.filter(entry => entry.status === 'complete').reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);
      const declined = entries.some(entry => entry.status === 'declined');
      const complete = entries.length > 0 && entries.every(entry => ['complete', 'declined', 'cancelled'].includes(entry.status));
      return {
        ...transfer,
        messageId: message.id,
        isRequest: true,
        amountLabel: formatCredits(amount),
        memoPreview: compactMemo(transfer.memo),
        status: complete ? 'complete' : status,
        statusLabel: complete ? (declined ? 'Partially Resolved' : 'Complete') : transferStatusLabel(status),
        ownShareAmount: Number(ownEntry?.amount || 0),
        ownShareLabel: ownEntry ? formatCredits(ownEntry.amount) : '',
        paidLabel: formatCredits(paid),
        remainingLabel: formatCredits(Math.max(0, amount - paid)),
        canPay: Boolean(ownEntry && ownEntry.status === 'pendingRecipient' && !isGm),
        canDeclineRequest: Boolean(ownEntry && ownEntry.status === 'pendingRecipient' && !isGm),
        canCancel: Boolean((transfer.requesterRecipientId === participantId || isGm) && !complete),
        isResolved: complete
      };
    }

    const isRecipient = transfer.toRecipientId === participantId || (transfer.toActorId && actor?.id === transfer.toActorId);
    const isSender = transfer.fromRecipientId === participantId || (transfer.fromActorId && actor?.id === transfer.fromActorId);
    const isPendingRecipient = status === 'pendingRecipient';
    const isPendingGm = status === 'pendingGm';
    return {
      ...transfer,
      messageId: message.id,
      amountLabel: formatCredits(amount),
      memoPreview: compactMemo(transfer.memo),
      status,
      statusLabel: transferStatusLabel(status),
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
    const requiredCredits = Number(transfer?.trade?.requestedCredits || 0) || 0;
    return {
      ...transfer,
      messageId: message.id,
      status,
      statusLabel: transferStatusLabel(status),
      itemCount: safeArray(transfer.items).reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0) || safeArray(transfer.attachments).length,
      requestedCredits: requiredCredits,
      requestedCreditsLabel: requiredCredits > 0 ? formatCredits(requiredCredits) : '',
      hasTradeTerms: Boolean(requiredCredits > 0 || transfer?.trade?.requestedItemsNote),
      canAccept: status === 'pendingRecipient' && (isRecipient || isGm),
      canApprove: status === 'pendingGm' && isGm,
      canDecline: ['pendingRecipient', 'pendingGm'].includes(status) && (isRecipient || isGm),
      canCancel: ['pendingRecipient', 'pendingGm'].includes(status) && (isSender || isGm),
      isResolved: ['complete', 'declined', 'cancelled', 'failed'].includes(status)
    };
  }

  static _assetTransferVm(message, transfer, actor, participantId) {
    const status = transfer.status || 'pendingGm';
    const isRecipient = transfer.toRecipientId === participantId || (transfer.toActorId && actor?.id === transfer.toActorId);
    const isSender = transfer.fromRecipientId === participantId || (transfer.fromActorId && actor?.id === transfer.fromActorId);
    const isGm = Boolean(game.user?.isGM);
    const requiredCredits = Number(transfer?.trade?.requestedCredits || 0) || 0;
    const counterCredits = parsePositiveCredits(transfer?.counterOffer?.credits);
    const counterItems = safeArray(transfer?.counterOffer?.items);
    const counterAssets = safeArray(transfer?.counterOffer?.assets);
    const counterItemOptions = isRecipient ? this._buildInventoryComposerVm(actor).items : [];
    const counterAssetOptions = isRecipient
      ? ownedActorLinks(actor).map(link => {
          const asset = assetActorByLink(link);
          return asset ? {
            id: asset.id,
            uuid: asset.uuid || `Actor.${asset.id}`,
            name: asset.name || 'Owned Asset',
            typeLabel: actorAssetCategory(asset),
            img: asset.img || 'icons/svg/mystery-man.svg'
          } : null;
        }).filter(Boolean)
      : [];
    return {
      ...transfer,
      messageId: message.id,
      status,
      statusLabel: transferStatusLabel(status),
      requestedCredits: requiredCredits,
      requestedCreditsLabel: requiredCredits > 0 ? formatCredits(requiredCredits) : '',
      hasCounterOffer: Boolean(transfer?.counterOffer),
      counterOffer: transfer?.counterOffer ? {
        ...transfer.counterOffer,
        credits: counterCredits,
        creditsLabel: counterCredits > 0 ? formatCredits(counterCredits) : '',
        items: counterItems,
        hasItems: counterItems.length > 0,
        assets: counterAssets,
        hasAssets: counterAssets.length > 0
      } : null,
      counterItemOptions,
      counterAssetOptions,
      canCounterOffer: status === 'pendingRecipient' && (isRecipient || isGm),
      canAcceptCounter: status === 'counterOffered' && (isSender || isGm),
      canApproveCounter: status === 'counterPendingGm' && isGm,
      canDeclineCounter: status === 'counterOffered' && (isSender || isRecipient || isGm),
      canAccept: status === 'pendingRecipient' && (isRecipient || isGm),
      canApprove: status === 'pendingGm' && isGm,
      canDecline: ['pendingRecipient', 'pendingGm'].includes(status) && (isRecipient || isGm),
      canCancel: ['pendingRecipient', 'pendingGm', 'counterOffered', 'counterPendingGm'].includes(status) && (isSender || isGm),
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
      canSendCredits: creditTransfersEnabled(),
      canTradeItems: itemTradesEnabled(),
      canTradeAssets: assetTradesEnabled(),
      tradeRecipientsCount: transferTargets.filter(t => !t.id?.startsWith('party-fund')).length,
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

  static _buildInventoryComposerVm(actor) {
    const rows = (actor?.items?.contents ?? [])
      .filter(item => item?.type && !['feat', 'talent', 'forcePower', 'language', 'skill', 'class', 'species'].includes(item.type))
      .map(item => {
        const quantity = getItemQuantity(item);
        const category = itemCategory(item);
        return {
          id: item.id,
          uuid: item.uuid,
          name: item.name || 'Item',
          type: item.type || 'item',
          typeLabel: category,
          category,
          img: item.img || 'icons/svg/item-bag.svg',
          quantity,
          canSplit: quantity > 1,
          value: Number(item.system?.cost ?? item.system?.price ?? item.system?.value ?? 0) || 0
        };
      })
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    const categories = Array.from(new Set(rows.map(row => row.category))).map(name => ({ name, items: rows.filter(row => row.category === name) }));
    return { items: rows, categories };
  }

  static _buildAssetComposerVm(actor) {
    const rows = ownedActorLinks(actor)
      .map(link => {
        const asset = assetActorByLink(link);
        if (!asset) return null;
        const category = actorAssetCategory(asset);
        return {
          id: asset.id,
          uuid: asset.uuid || `Actor.${asset.id}`,
          name: asset.name || link.name || 'Owned Asset',
          type: asset.type || link.type || 'actor',
          typeLabel: category,
          category,
          img: asset.img || link.img || 'icons/svg/mystery-man.svg',
          hp: asset.system?.attributes?.hp?.value ?? asset.system?.hp?.value ?? asset.system?.hp ?? null,
          ref: asset.system?.defenses?.reflex?.value ?? asset.system?.defenses?.reflex ?? null,
          fort: asset.system?.defenses?.fortitude?.value ?? asset.system?.defenses?.fortitude ?? null,
          will: asset.system?.defenses?.will?.value ?? asset.system?.defenses?.will ?? null,
          summary: [asset.type, asset.system?.vehicleType, asset.system?.droidDegree].filter(Boolean).join(' · ')
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    const categories = Array.from(new Set(rows.map(row => row.category))).map(name => ({ name, assets: rows.filter(row => row.category === name) }));
    return { assets: rows, categories };
  }

  static _buildCompositionVm(actor, selectedThread, participantId, options = {}) {
    const type = String(options.compositionType || options.composer || '').trim();
    if (!type || !selectedThread) return null;
    const selectedThreadVm = this._buildSelectedThreadVm(selectedThread, actor, participantId, this.buildRecipientOptions(actor, { threads: this._cachedThreadsForNpcContact ?? [] }));
    const targets = safeArray(selectedThreadVm?.transferTargets).filter(t => t.actorId && !t.isPersona && t.id !== PARTY_FUND_RECIPIENT_ID);
    const mode = String(options.compositionMode || options.transferMode || (type === 'credits' ? 'send' : 'send')).trim();
    return {
      type,
      mode,
      title: type === 'credits'
        ? (mode === 'request' ? 'Coruscant Credit Union // Request Credits' : 'Coruscant Credit Union // Send Credits')
        : 'Holonet Cargo Transfer',
      threadId: selectedThread.id,
      actorName: actor?.name ?? 'Actor',
      actorCredits: creditsOf(actor),
      targets,
      hasMultipleTargets: targets.length > 1,
      inventory: type === 'items' ? this._buildInventoryComposerVm(actor) : null,
      assets: type === 'assets' ? this._buildAssetComposerVm(actor) : null,
      policy: {
        creditsEnabled: creditTransfersEnabled(),
        itemTradesEnabled: itemTradesEnabled(),
        itemTradeApprovalRequired: itemTradeApprovalRequired(),
        assetTradesEnabled: assetTradesEnabled(),
        assetTradeApprovalRequired: assetTradeApprovalRequired()
      }
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
    const composition = this._buildCompositionVm(actor, selectedThread, participantId, options);
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
      transferPolicy: {
        creditsEnabled: creditTransfersEnabled(),
        itemTradesEnabled: itemTradesEnabled(),
        itemTradeApprovalRequired: itemTradeApprovalRequired(),
        assetTradesEnabled: assetTradesEnabled(),
        assetTradeApprovalRequired: assetTradeApprovalRequired()
      },
      composition,
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

  static async _gmCreateJobPosting({ actorId, title = 'Job Board Posting', body = '', recipientIds = [], contactRecipientId = '', rewardCredits = 0, rewardItems = '', rewardItemUuids = [], attachments = [], senderUserId = null, senderRecipientId = null, requestId = null, requesterId = null } = {}) {
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
      senderRecipientId: contactRecipient?.id ?? senderRecipientId,
      requestId,
      requesterId
    });
    return { threadId: thread.id, requestId };
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
      const requestId = HolonetSocketService.emitRequest('send-message', payload);
      return { pending: true, requestId, threadId: payload.threadId ?? null };
    }
    return this._gmSendMessage(payload);
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
      const requestId = HolonetSocketService.emitRequest('create-thread', payload);
      return { pending: true, requestId, threadId: null };
    }
    return this._gmCreateThread(payload);
  }

  static _normalizeRecipientIds(ids = []) {
    return Array.from(new Set(safeArray(ids).map(String).filter(Boolean)));
  }

  static async _gmCreateThread({ actorId, body = '', title = '', threadType = THREAD_TYPE.PRIVATE, recipientIds = [], imageUrl = '', attachments = [], senderUserId = null, senderRecipientId = null, requestId = null, requesterId = null } = {}) {
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

    let emittedThreadUpdate = false;
    let requestSyncEmitted = false;
    for (const invitee of pendingInvites) {
      await this._publishSystemMessage(thread, `${senderLabel} invited ${recipientDisplayName(invitee)} to the holochat.`, { eventType: 'member-invited' });
      emittedThreadUpdate = true;
    }

    if (pendingInvites.length) {
      await this._publishSystemMessage(thread, `${senderLabel} wants to have a holochat.`, { eventType: 'holochat-request' });
      emittedThreadUpdate = true;
    }

    if (body?.trim() || imageUrl?.trim()) {
      await this._gmSendMessage({ actorId, body, imageUrl, attachments, threadId: thread.id, senderUserId, senderRecipientId, requestId, requesterId });
      emittedThreadUpdate = true;
      requestSyncEmitted = Boolean(requestId);
    }

    if (!emittedThreadUpdate || (requestId && !requestSyncEmitted)) {
      Hooks.callAll('swseHolonetUpdated', { type: 'thread-created', threadId: thread.id });
      this._emitMessengerSync(this._threadSyncPayload(thread.id, { requestId, requesterId }));
    }
    return { threadId: thread.id, requestId };
  }

  static _defaultThreadTitle(recipients = [], threadType = THREAD_TYPE.PRIVATE) {
    if (threadType === THREAD_TYPE.PARTY) return 'Party Channel';
    if (threadType === THREAD_TYPE.SIDE) return 'Side Thread';
    const labels = recipients.map(recipientDisplayName).filter(Boolean);
    return labels.length ? labels.join(', ') : 'Private Holochat';
  }

  static async _gmSendMessage({ actorId, body, threadId = null, recipientIds = [], imageUrl = '', attachments = [], senderUserId = null, senderRecipientId = null, requestId = null, requesterId = null }) {
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
      const created = await this._gmCreateThread({ actorId, body: '', recipientIds: recipients.map(r => r.id), senderUserId, senderRecipientId, requestId, requesterId });
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
    this._emitMessengerSync(this._threadSyncPayload(result.threadId, { messageId: result.messageId, requestId, requesterId }));
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
    if (result?.ok) {
      this._emitMessengerSync(this._threadSyncPayload(result.threadId ?? thread.id, { messageId: result.messageId }));
    } else {
      console.warn('[Holonet] Failed to publish Messenger system message:', result?.reason ?? 'unknown');
    }
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

  static async offerItemTransfer({ actor, threadId, recipientId, itemUuids = [], items = [], recipientIds = [], distributionMode = 'single', memo = '', tradeIntent = 'gift', requestedCredits = 0, requestedItemsNote = '' }) {
    const payload = {
      actorId: actor?.id ?? null,
      threadId,
      recipientId,
      recipientIds: safeArray(recipientIds).map(String).filter(Boolean),
      itemUuids: safeArray(itemUuids).map(String).filter(Boolean),
      items: safeArray(items),
      distributionMode,
      memo: String(memo || '').trim(),
      tradeIntent: String(tradeIntent || 'gift').trim(),
      requestedCredits: Number(requestedCredits || 0) || 0,
      requestedItemsNote: String(requestedItemsNote || '').trim(),
      requesterId: game.user?.id ?? null,
      senderRecipientId: currentRecipientId()
    };
    if (!game.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('offer-item-transfer', payload);
      return { pending: true, requestId, threadId };
    }
    return this._gmOfferItemTransfer(payload);
  }

  static async offerAssetTransfer({ actor, threadId, recipientId, recipientIds = [], assetIds = [], memo = '', requestedCredits = 0 }) {
    const payload = {
      actorId: actor?.id ?? null,
      threadId,
      recipientId,
      recipientIds: safeArray(recipientIds).map(String).filter(Boolean),
      assetIds: safeArray(assetIds).map(String).filter(Boolean),
      memo: String(memo || '').trim(),
      requestedCredits: Number(requestedCredits || 0) || 0,
      requesterId: game.user?.id ?? null,
      senderRecipientId: currentRecipientId()
    };
    if (!game.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('offer-asset-transfer', payload);
      return { pending: true, requestId, threadId };
    }
    return this._gmOfferAssetTransfer(payload);
  }

  static async offerCreditTransfer({ actor, threadId, recipientId, amount, memo = '' }) {
    return this.composeCreditOperation({ actor, threadId, mode: 'send', recipientIds: [recipientId], amount, splitMode: 'send-each', memo });
  }

  static async composeCreditOperation({ actor, threadId, mode = 'send', recipientIds = [], amount = 0, splitMode = 'split-total', memo = '' } = {}) {
    const payload = {
      actorId: actor?.id ?? null,
      threadId,
      mode,
      recipientIds: safeArray(recipientIds).map(String).filter(Boolean),
      amount,
      splitMode,
      memo: String(memo || '').trim(),
      requesterId: game.user?.id ?? null,
      senderRecipientId: currentRecipientId()
    };
    if (!game.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('compose-credit-operation', payload);
      return { pending: true, requestId, threadId };
    }
    return this._gmComposeCreditOperation(payload);
  }

  static async _gmComposeCreditOperation({ actorId, threadId, mode = 'send', recipientIds = [], amount = 0, splitMode = 'split-total', memo = '', requesterId = null, senderRecipientId = null, requestId = null } = {}) {
    if (!creditTransfersEnabled()) return false;
    const ids = this._normalizeRecipientIds(recipientIds).filter(Boolean);
    if (!ids.length) return false;
    const value = parsePositiveCredits(amount);
    if (!value) return false;
    if (String(mode) === 'request') {
      return this._gmRequestCreditTransfer({ actorId, threadId, recipientIds: ids, amount: value, splitMode, memo, requesterId, senderRecipientId, requestId });
    }
    const shares = splitAmount(value, ids.length, splitMode);
    const actor = actorId ? game.actors?.get(actorId) : null;
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const senderActor = requester?.isGM ? null : (requester?.character ?? actor);
    const total = shares.reduce((sum, share) => sum + share, 0);
    if (senderActor && creditsOf(senderActor) < total) {
      const thread = await HolonetStorage.getThread(threadId);
      if (thread) await this._publishSystemMessage(thread, `${senderActor.name} tried to send ${formatCredits(total)}, but has insufficient credits.`, { eventType: 'credit-transfer-failed' });
      return false;
    }
    const results = [];
    for (let i = 0; i < ids.length; i += 1) {
      const share = shares[i] || 0;
      if (share <= 0) continue;
      results.push(await this._gmOfferCreditTransfer({ actorId, threadId, recipientId: ids[i], amount: share, memo, requesterId, senderRecipientId, requestId }));
    }
    return { threadId, requestId, results };
  }

  static async _gmOfferCreditTransfer({ actorId, threadId, recipientId, amount, memo = '', requesterId = null, senderRecipientId = null, requestId = null } = {}) {
    if (!creditTransfersEnabled()) return false;
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
      memo: String(memo || '').trim(),
      memoPreview: compactMemo(memo),
      sourceLabel: 'Coruscant Credit Union',
      createdAt: nowIso(),
      createdByUserId: requesterId ?? game.user?.id ?? null
    };

    const transferBody = `${transfer.fromLabel} sent ${formatCredits(value)} to ${targetActor.name}${transfer.memo ? ` — ${transfer.memo}` : ''}.`;
    const message = MessengerSource.createMessage({
      sender: HolonetSender.system('Coruscant Credit Union'),
      audience: HolonetAudience.threadParticipants(this._messageRecipientsForThread(thread).map(r => r.id)),
      body: transferBody,
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
    this._emitMessengerSync(this._threadSyncPayload(thread.id, { messageId: message.id, requestId, requesterId }));
    return { threadId: thread.id, messageId: message.id };
  }


  static async _gmRequestCreditTransfer({ actorId, threadId, recipientIds = [], amount = 0, splitMode = 'split-total', memo = '', requesterId = null, senderRecipientId = null, requestId = null } = {}) {
    if (!creditTransfersEnabled()) return false;
    const value = parsePositiveCredits(amount);
    if (!value) return false;
    const thread = await HolonetStorage.getThread(threadId);
    if (!thread) return false;
    this._ensureGmObservers(thread);
    const actor = actorId ? game.actors?.get(actorId) : null;
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterActor = requester?.character ?? actor;
    if (!requesterActor) return false;
    const requesterRecipient = this._recipientForActorContext(requesterActor, { senderUserId: requesterId ?? game.user?.id, senderRecipientId });
    if (!hasRecipient(thread.participants, requesterRecipient?.id) && !requester?.isGM) return false;
    const ids = this._normalizeRecipientIds(recipientIds).filter(Boolean);
    const shares = splitAmount(value, ids.length, splitMode === 'request-each' ? 'request-each' : 'split-total');
    const entries = [];
    for (let i = 0; i < ids.length; i += 1) {
      const recipient = this._recipientFromStableId(ids[i]);
      const targetActor = recipient?.actorId ? game.actors?.get(recipient.actorId) : null;
      if (!recipient || !targetActor) continue;
      if (!hasRecipient(thread.participants, recipient.id)) continue;
      const share = shares[i] || 0;
      if (share <= 0) continue;
      entries.push({
        id: foundry.utils.randomID(),
        recipientId: recipient.id,
        actorId: targetActor.id,
        label: targetActor.name,
        amount: share,
        status: 'pendingRecipient'
      });
    }
    if (!entries.length) return false;
    const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const transfer = {
      id: foundry.utils.randomID(),
      kind: 'creditRequest',
      status: 'pendingRecipient',
      amount: total,
      totalAmount: total,
      memo: String(memo || '').trim(),
      memoPreview: compactMemo(memo),
      requesterActorId: requesterActor.id,
      requesterLabel: requesterActor.name,
      requesterRecipientId: requesterRecipient?.id ?? null,
      entries,
      sourceLabel: 'Coruscant Credit Union',
      createdAt: nowIso(),
      createdByUserId: requesterId ?? game.user?.id ?? null
    };
    const body = `${requesterActor.name} requests ${formatCredits(total)}${transfer.memo ? ` — ${transfer.memo}` : ''}.`;
    const message = MessengerSource.createMessage({
      sender: HolonetSender.system('Coruscant Credit Union'),
      audience: HolonetAudience.threadParticipants(this._messageRecipientsForThread(thread).map(r => r.id)),
      body,
      threadId: thread.id,
      metadata: {
        categoryId: HolonetPreferences.CATEGORIES.MESSAGES,
        systemEvent: true,
        eventType: 'credit-request-created',
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
    this._emitMessengerSync(this._threadSyncPayload(thread.id, { messageId: message.id, requestId, requesterId }));
    return { threadId: thread.id, messageId: message.id };
  }

  static async _gmResolveCreditRequest({ thread, recordId, action, actorId = null, requesterId = null, senderRecipientId = null } = {}) {
    if (!recordId) return false;
    const message = await HolonetStorage.getRecord(recordId);
    const transfer = message?.metadata?.creditTransfer;
    if (!message || transfer?.kind !== 'creditRequest') return false;
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM || senderRecipientId?.startsWith('gm:'));
    const currentId = senderRecipientId || currentRecipientId();
    const actor = actorId ? game.actors?.get(actorId) : requester?.character;
    const entry = safeArray(transfer.entries).find(e => e.recipientId === currentId || (actor?.id && e.actorId === actor.id));
    if (!entry && !requesterIsGm) return false;
    if (action === 'decline-credit-request') {
      if (!entry) return false;
      entry.status = 'declined';
      entry.resolvedAt = nowIso();
      entry.resolvedBy = currentId;
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `${entry.label} declined ${formatCredits(entry.amount)} requested by ${transfer.requesterLabel}.`, { eventType: 'credit-request-declined', transferId: transfer.id });
      return true;
    }
    if (action === 'cancel-credit-request') {
      if (!requesterIsGm && currentId !== transfer.requesterRecipientId) return false;
      transfer.status = 'cancelled';
      for (const item of safeArray(transfer.entries)) {
        if (item.status === 'pendingRecipient') item.status = 'cancelled';
      }
      transfer.resolvedAt = nowIso();
      transfer.resolvedBy = currentId;
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `${transfer.requesterLabel} cancelled a credit request.`, { eventType: 'credit-request-cancelled', transferId: transfer.id });
      return true;
    }
    if (action !== 'pay-credit-request') return false;
    if (!entry || entry.status !== 'pendingRecipient') return false;
    const payerActor = entry.actorId ? game.actors?.get(entry.actorId) : actor;
    const requesterActor = transfer.requesterActorId ? game.actors?.get(transfer.requesterActorId) : null;
    if (!payerActor || !requesterActor) return false;
    const value = parsePositiveCredits(entry.amount);
    if (!value) return false;
    const moved = await TransactionEngine.executeCreditTransfer({
      fromActor: payerActor,
      toActor: requesterActor,
      amount: value,
      reason: transfer.memo ? `Holonet credit request: ${transfer.memo}` : 'Holonet credit request',
      transactionContext: 'holonet-credit-request',
      audit: { source: 'holonet-credit-request', threadId: thread.id, requesterId, transferId: transfer.id, entryId: entry.id }
    }, { source: 'HolonetMessengerService.creditRequest', validate: true, rederive: true });
    if (!moved.success) {
      entry.status = 'failed';
      entry.failureReason = moved.error || 'Credit request payment failed';
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `Credit request payment failed: ${entry.failureReason}`, { eventType: 'credit-request-failed', transferId: transfer.id });
      return false;
    }
    entry.status = 'complete';
    entry.resolvedAt = nowIso();
    entry.resolvedBy = currentId;
    if (safeArray(transfer.entries).every(e => ['complete', 'declined', 'cancelled'].includes(e.status))) {
      transfer.status = 'complete';
      transfer.resolvedAt = nowIso();
    }
    await HolonetStorage.saveRecord(message);
    await this._publishSystemMessage(thread, `${payerActor.name} paid ${formatCredits(value)} to ${requesterActor.name}.`, { eventType: 'credit-request-paid', transferId: transfer.id, amount: value });
    await this._publishReceiptMessage(thread, { title: 'Coruscant Credit Union Receipt', eventType: 'credit-request-receipt', amount: value, lines: [`From: ${payerActor.name}`, `To: ${requesterActor.name}`, transfer.memo ? `Memo: ${transfer.memo}` : null].filter(Boolean) });
    return true;
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

  static _ownedItemPayload(actor, itemId, quantity = 1) {
    const item = actor?.items?.get?.(itemId) ?? actor?.items?.find?.(i => i.id === itemId || i._id === itemId);
    if (!item) return null;
    const maxQuantity = getItemQuantity(item);
    const requested = Math.max(1, Math.min(maxQuantity, normalizeQuantity(quantity, 1)));
    const data = item.toObject ? item.toObject() : foundry.utils.deepClone(item);
    return {
      itemId: item.id,
      name: item.name || 'Item',
      type: item.type || 'item',
      img: item.img || '',
      quantity: requested,
      maxQuantity,
      data
    };
  }

  static _buildItemDistributions(items = [], recipients = [], distributionMode = 'single') {
    const targets = safeArray(recipients).filter(r => r?.id && r?.actorId);
    const selected = safeArray(items).filter(item => item?.itemId && Number(item?.quantity) > 0);
    if (!targets.length || !selected.length) return [];
    if (distributionMode !== 'split') {
      if (targets.length !== 1) throw new Error('Choose exactly one recipient, or enable split delivery.');
      return [{ recipient: targets[0], items: selected }];
    }
    const distributions = targets.map(recipient => ({ recipient, items: [] }));
    for (const item of selected) {
      const total = Math.max(1, normalizeQuantity(item.quantity, 1));
      if (total < targets.length) throw new Error(`${item.name} has quantity ${total}; choose one recipient or select a larger quantity before splitting.`);
      const base = Math.floor(total / targets.length);
      let remainder = total % targets.length;
      distributions.forEach(dist => {
        const qty = base + (remainder-- > 0 ? 1 : 0);
        if (qty > 0) dist.items.push({ ...item, quantity: qty });
      });
    }
    return distributions;
  }

  static async _gmOfferItemTransfer({ actorId, threadId, recipientId, recipientIds = [], itemUuids = [], items = [], distributionMode = 'single', memo = '', tradeIntent = 'gift', requestedCredits = 0, requestedItemsNote = '', requesterId = null, senderRecipientId = null, requestId = null } = {}) {
    if (!itemTradesEnabled()) return false;
    const thread = await HolonetStorage.getThread(threadId);
    if (!thread) return false;
    const actor = actorId ? game.actors?.get(actorId) : null;
    const senderRecipient = this._recipientForActorContext(actor, { senderUserId: requesterId ?? game.user?.id, senderRecipientId });
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM || senderRecipient?.id?.startsWith('gm:'));
    if (!requesterIsGm && !hasRecipient(thread.participants, senderRecipient?.id)) return false;
    const recipientIdList = safeArray(recipientIds).length ? safeArray(recipientIds) : [recipientId];
    const recipients = this._normalizeRecipientIds(recipientIdList)
      .map(id => this._recipientFromStableId(id))
      .filter(Boolean)
      .filter(r => r.actorId && hasRecipient(thread.participants, r.id));
    if (!recipients.length) return false;

    const ownedItems = safeArray(items)
      .map(entry => this._ownedItemPayload(actor, entry.itemId ?? entry.id, entry.quantity))
      .filter(Boolean);

    if (!ownedItems.length && safeArray(itemUuids).length) {
      // GM locker / compendium grants remain supported for job payouts and GM-only drops.
      if (!requesterIsGm) return false;
      const attachments = await this._resolveItemSummaries(itemUuids);
      if (!attachments.length) return false;
      const target = recipients[0];
      const targetActor = game.actors?.get(target.actorId);
      if (!targetActor) return false;
      const transfer = {
        id: foundry.utils.randomID(),
        kind: 'gmGrant',
        status: 'pendingRecipient',
        itemUuids: attachments.map(a => a.uuid),
        attachments,
        memo: String(memo || '').trim(),
        fromActorId: null,
        fromLabel: 'GM Locker',
        fromRecipientId: senderRecipient?.id ?? null,
        toActorId: targetActor.id,
        toLabel: targetActor.name,
        toRecipientId: target.id,
        createdAt: nowIso(),
        createdByUserId: requesterId ?? game.user?.id ?? null
      };
      return this._publishItemTransferOffer({ thread, transfer, attachments, requestId, requesterId });
    }

    const distributions = this._buildItemDistributions(ownedItems, recipients, distributionMode);
    const results = [];
    for (const dist of distributions) {
      const targetActor = game.actors?.get(dist.recipient.actorId);
      if (!targetActor) continue;
      const attachments = dist.items.map(item => ({ uuid: `${actor?.uuid}.Item.${item.itemId}`, name: item.name, type: item.type, img: item.img, documentName: 'Item', quantity: item.quantity }));
      const transfer = {
        id: foundry.utils.randomID(),
        kind: 'ownedItemTransfer',
        status: itemTradeApprovalRequired() && !requesterIsGm ? 'pendingGm' : 'pendingRecipient',
        approvalRequired: itemTradeApprovalRequired() && !requesterIsGm,
        items: dist.items,
        attachments,
        memo: String(memo || '').trim(),
        fromActorId: actor?.id ?? null,
        fromLabel: actor?.name ?? 'Sender',
        fromRecipientId: senderRecipient?.id ?? null,
        toActorId: targetActor.id,
        toLabel: targetActor.name,
        toRecipientId: dist.recipient.id,
        createdAt: nowIso(),
        createdByUserId: requesterId ?? game.user?.id ?? null,
        trade: {
          intent: String(tradeIntent || 'gift').trim() || 'gift',
          requestedCredits: parsePositiveCredits(requestedCredits),
          requestedItemsNote: String(requestedItemsNote || '').trim()
        }
      };
      results.push(await this._publishItemTransferOffer({ thread, transfer, attachments, requestId, requesterId }));
    }
    return { threadId: thread.id, requestId, results };
  }

  static async _publishItemTransferOffer({ thread, transfer, attachments = [], requestId = null, requesterId = null } = {}) {
    const itemText = safeArray(transfer.items).length
      ? safeArray(transfer.items).map(item => `${item.name} x${item.quantity}`).join(', ')
      : `${safeArray(attachments).length} item(s)`;
    const message = MessengerSource.createMessage({
      sender: HolonetSender.system('Holonet Cargo'),
      audience: HolonetAudience.threadParticipants(this._messageRecipientsForThread(thread).map(r => r.id)),
      body: `${transfer.fromLabel} offers ${itemText} to ${transfer.toLabel}${transfer.memo ? ` — ${transfer.memo}` : ''}.`,
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
    this._emitMessengerSync(this._threadSyncPayload(thread.id, { messageId: message.id, requestId, requesterId }));
    return { threadId: thread.id, messageId: message.id };
  }


  static async threadAction({ actor, threadId, action, recipientIds = [], amount = null, recipientId = null, recordId = null, partyFundCutPercent = null, status = null, itemUuids = [], items = [], memo = '', splitMode = '', distributionMode = '', tradeIntent = '', requestedCredits = 0, requestedItemsNote = '', assetIds = [], counterCredits = 0, counterItemIds = [], counterAssetIds = [], counterMemo = '' }) {
    const payload = { actorId: actor?.id ?? null, threadId, action, recipientIds, amount, recipientId, recordId, partyFundCutPercent, status, itemUuids: safeArray(itemUuids).map(String).filter(Boolean), items: safeArray(items), memo: String(memo || '').trim(), splitMode, distributionMode, tradeIntent: String(tradeIntent || '').trim(), requestedCredits: Number(requestedCredits || 0) || 0, requestedItemsNote: String(requestedItemsNote || '').trim(), assetIds: safeArray(assetIds).map(String).filter(Boolean), counterCredits: Number(counterCredits || 0) || 0, counterItemIds: safeArray(counterItemIds).map(String).filter(Boolean), counterAssetIds: safeArray(counterAssetIds).map(String).filter(Boolean), counterMemo: String(counterMemo || '').trim(), requesterId: game.user?.id ?? null, senderRecipientId: currentRecipientId() };
    if (!game.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('thread-action', payload);
      return { pending: true, requestId, threadId };
    }
    return this._gmThreadAction(payload);
  }

  static async _gmThreadAction({ actorId, threadId, action, recipientIds = [], amount = null, recipientId = null, recordId = null, partyFundCutPercent = null, status = null, itemUuids = [], items = [], memo = '', splitMode = '', distributionMode = '', tradeIntent = '', requestedCredits = 0, requestedItemsNote = '', assetIds = [], counterCredits = 0, counterItemIds = [], counterAssetIds = [], counterMemo = '', requesterId = null, senderRecipientId = null, requestId = null } = {}) {
    const thread = await HolonetStorage.getThread(threadId);
    if (!thread) return false;
    this._ensureGmObservers(thread);
    const meta = getThreadMeta(thread);
    const actor = actorId ? game.actors?.get(actorId) : null;
    const actorRecipient = this._recipientForActorContext(actor, { senderUserId: requesterId ?? game.user?.id, senderRecipientId });
    const currentId = senderRecipientId || actorRecipient?.id;
    const isGm = Boolean((requesterId && game.users?.get(requesterId)?.isGM) || currentId?.startsWith('gm:')); 
    const canManage = isGm || meta.ownerId === currentId;
    let needsThreadOnlySync = false;

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
        needsThreadOnlySync = true;
        break;
      }
      case 'unmute-thread': {
        meta.mutedBy ??= {};
        delete meta.mutedBy[currentId];
        await HolonetStorage.saveThread(thread);
        needsThreadOnlySync = true;
        break;
      }
      case 'archive-thread': {
        meta.archivedBy ??= {};
        meta.archivedBy[currentId] = nowIso();
        await HolonetStorage.saveThread(thread);
        needsThreadOnlySync = true;
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
      case 'approve-item-transfer':
      case 'decline-item-transfer':
      case 'cancel-item-transfer': {
        await this._gmResolveItemTransfer({ thread, recordId, action, actorId, requesterId, senderRecipientId, requestId });
        break;
      }
      case 'accept-asset-transfer':
      case 'approve-asset-transfer':
      case 'decline-asset-transfer':
      case 'cancel-asset-transfer':
      case 'offer-asset-counter':
      case 'accept-asset-counter':
      case 'approve-asset-counter':
      case 'decline-asset-counter': {
        await this._gmResolveAssetTransfer({ thread, recordId, action, actorId, counterCredits, counterItemIds, counterAssetIds, counterMemo, requesterId, senderRecipientId, requestId });
        break;
      }
      case 'offer-item-transfer': {
        await this._gmOfferItemTransfer({ actorId, threadId, recipientId, recipientIds, itemUuids, items, distributionMode, memo, tradeIntent, requestedCredits, requestedItemsNote, requesterId, senderRecipientId, requestId });
        break;
      }
      case 'offer-asset-transfer': {
        await this._gmOfferAssetTransfer({ actorId, threadId, recipientId, recipientIds, assetIds, memo, requestedCredits, requesterId, senderRecipientId, requestId });
        break;
      }
      case 'pay-credit-request':
      case 'decline-credit-request':
      case 'cancel-credit-request': {
        await this._gmResolveCreditRequest({ thread, recordId, action, actorId, requesterId, senderRecipientId, requestId });
        break;
      }
      case 'accept-transfer':
      case 'decline-transfer':
      case 'approve-transfer':
      case 'cancel-transfer': {
        await this._gmResolveCreditTransfer({ thread, recordId, action, actorId, requesterId, senderRecipientId, requestId });
        break;
      }
      case 'offer-credit-transfer': {
        await this._gmOfferCreditTransfer({ actorId, threadId, recipientId, amount, memo, requesterId, senderRecipientId, requestId });
        break;
      }
      case 'compose-credit-operation': {
        await this._gmComposeCreditOperation({ actorId, threadId, mode: status || 'send', recipientIds, amount, splitMode, memo, requesterId, senderRecipientId, requestId });
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

    if (needsThreadOnlySync) {
      Hooks.callAll('swseHolonetUpdated', { type: 'thread-updated', threadId: thread.id });
      this._emitMessengerSync(this._threadSyncPayload(thread.id, { requestId, requesterId }));
    }
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
        const credit = await TransactionEngine.executeCreditAdjustment({
          actor: targetActor,
          amount: playerAmount,
          reason: asJobPayout ? 'Holonet job payout' : 'Holonet GM credit grant',
          transactionContext: asJobPayout ? 'holonet-job-payout' : 'holonet-gm-grant',
          audit: { source: asJobPayout ? 'holonet-job-payout' : 'holonet-gm-grant', threadId: thread.id, requesterId }
        }, { source: 'HolonetMessengerService.gmTransferCredits', validate: true, rederive: true });
        if (!credit.success) throw new Error(credit.error || 'Holonet credit grant failed');
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

  static async _gmResolveCreditTransfer({ thread, recordId, action, actorId = null, requesterId = null, senderRecipientId = null, requestId = null } = {}) {
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
        const grant = await TransactionEngine.executeCreditAdjustment({
          actor: targetActor,
          amount: value,
          reason: 'Holonet GM credit grant',
          transactionContext: 'holonet-gm-grant',
          audit: { source: 'holonet-transfer', threadId: thread.id, requesterId, transferId: transfer.id }
        }, { source: 'HolonetMessengerService.creditTransferGrant', validate: true, rederive: true });
        if (!grant.success) throw new Error(grant.error || 'Credit grant failed');
      } else {
        const fromActor = transfer.fromActorId ? game.actors?.get(transfer.fromActorId) : null;
        if (!fromActor) throw new Error('Sender actor not found');
        const moved = await TransactionEngine.executeCreditTransfer({
          fromActor,
          toActor: targetActor,
          amount: value,
          reason: 'Holonet credit transfer',
          transactionContext: 'holonet-credit-transfer',
          audit: { source: 'holonet-transfer', threadId: thread.id, requesterId, transferId: transfer.id }
        }, { source: 'HolonetMessengerService.creditTransfer', validate: true, rederive: true });
        if (!moved.success) throw new Error(moved.error || 'Credit transfer failed');
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
      const debit = await TransactionEngine.executeCreditAdjustment({
        actor,
        amount: -value,
        reason: 'Holonet party fund contribution',
        transactionContext: 'holonet-party-fund-contribution',
        audit: { source: 'party-fund-contribution', threadId: thread.id, requesterId }
      }, { source: 'HolonetMessengerService.partyFundContribution', validate: true, rederive: true });
      if (!debit.success) return false;
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
    const payout = await TransactionEngine.executeCreditAdjustment({
      actor: targetActor,
      amount: value,
      reason: 'Holonet party fund payout',
      transactionContext: 'holonet-party-fund-payout',
      audit: { source: 'party-fund-payout', threadId: thread.id, requesterId }
    }, { source: 'HolonetMessengerService.partyFundPayout', validate: true, rederive: true });
    if (!payout.success) return false;
    await appendPartyFundLedger({ type: 'payout', amount: -value, toActorId: targetActor.id, threadId: thread.id, requesterId });
    await this._publishSystemMessage(thread, `Party Fund paid ${formatCredits(value)} to ${targetActor.name}. New balance: ${formatCredits(before - value)}.`, { eventType: 'party-fund-payout', amount: value, toActorId: targetActor.id });
    return true;
  }



  static async _gmOfferAssetTransfer({ actorId, threadId, recipientId, recipientIds = [], assetIds = [], memo = '', requestedCredits = 0, requesterId = null, senderRecipientId = null, requestId = null } = {}) {
    if (!assetTradesEnabled()) return false;
    const thread = await HolonetStorage.getThread(threadId);
    if (!thread) return false;
    const actor = actorId ? game.actors?.get(actorId) : null;
    const senderRecipient = this._recipientForActorContext(actor, { senderUserId: requesterId ?? game.user?.id, senderRecipientId });
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM || senderRecipient?.id?.startsWith('gm:'));
    if (!requesterIsGm && !hasRecipient(thread.participants, senderRecipient?.id)) return false;

    const ids = safeArray(assetIds).map(id => String(id || '').replace(/^Actor\./, '')).filter(Boolean);
    if (!ids.length) return false;
    const recipientIdList = safeArray(recipientIds).length ? safeArray(recipientIds) : [recipientId];
    const recipients = this._normalizeRecipientIds(recipientIdList)
      .map(id => this._recipientFromStableId(id))
      .filter(Boolean)
      .filter(r => r.actorId && hasRecipient(thread.participants, r.id));
    if (recipients.length !== 1) throw new Error('Choose exactly one recipient for ship/droid asset transfers.');
    const target = recipients[0];
    const targetActor = game.actors?.get(target.actorId);
    if (!actor || !targetActor) return false;

    const ownedIds = new Set(ownedActorLinks(actor).map(link => String(link.id || '').replace(/^Actor\./, '')));
    const assets = ids.map(id => game.actors?.get(id)).filter(Boolean).filter(asset => ownedIds.has(asset.id));
    if (!assets.length) throw new Error('Selected ship/droid asset is not owned by the sending actor.');

    const transfer = {
      id: foundry.utils.randomID(),
      kind: 'ownedAssetTransfer',
      status: assetTradeApprovalRequired() && !requesterIsGm ? 'pendingGm' : 'pendingRecipient',
      approvalRequired: assetTradeApprovalRequired() && !requesterIsGm,
      assets: assets.map(asset => ({
        id: asset.id,
        uuid: asset.uuid || `Actor.${asset.id}`,
        name: asset.name || 'Owned Asset',
        type: asset.type || 'actor',
        typeLabel: actorAssetCategory(asset),
        img: asset.img || 'icons/svg/mystery-man.svg',
        summary: [asset.type, asset.system?.vehicleType, asset.system?.droidDegree].filter(Boolean).join(' · ')
      })),
      memo: String(memo || '').trim(),
      fromActorId: actor.id,
      fromLabel: actor.name,
      fromRecipientId: senderRecipient?.id ?? null,
      toActorId: targetActor.id,
      toLabel: targetActor.name,
      toRecipientId: target.id,
      trade: {
        intent: 'assetTrade',
        requestedCredits: parsePositiveCredits(requestedCredits)
      },
      createdAt: nowIso(),
      createdByUserId: requesterId ?? game.user?.id ?? null
    };
    return this._publishAssetTransferOffer({ thread, transfer, requestId, requesterId });
  }

  static async _publishAssetTransferOffer({ thread, transfer, requestId = null, requesterId = null } = {}) {
    const names = safeArray(transfer.assets).map(asset => asset.name).join(', ') || 'asset';
    const price = Number(transfer.trade?.requestedCredits || 0) > 0 ? ` for ${formatCredits(transfer.trade.requestedCredits)}` : '';
    const message = MessengerSource.createMessage({
      sender: HolonetSender.system('Holonet Asset Registry'),
      audience: HolonetAudience.threadParticipants(this._messageRecipientsForThread(thread).map(r => r.id)),
      body: `${transfer.fromLabel} offers ${names} to ${transfer.toLabel}${price}${transfer.memo ? ` — ${transfer.memo}` : ''}.`,
      threadId: thread.id,
      metadata: {
        categoryId: HolonetPreferences.CATEGORIES.MESSAGES,
        systemEvent: true,
        eventType: 'asset-transfer-offered',
        assetTransfer: transfer
      }
    });
    message.intent = INTENT_TYPE.SYSTEM_NEW_MESSAGE;
    message.recipients = this._messageRecipientsForThread(thread);
    message.projections = [
      { surfaceType: SURFACE_TYPE.MESSENGER_THREAD, recordId: message.id, isPinned: false, metadata: { threadId: thread.id } },
      { surfaceType: SURFACE_TYPE.HOME_FEED, recordId: message.id, isPinned: false, metadata: { threadId: thread.id } }
    ];
    await HolonetThreadService.publishMessageToThread({ thread, message, senderRecipient: null, publishOptions: { skipSocket: true }, markSenderRead: false });
    this._emitMessengerSync(this._threadSyncPayload(thread.id, { messageId: message.id, requestId, requesterId }));
    return { threadId: thread.id, messageId: message.id };
  }

  static async _gmResolveItemTransfer({ thread, recordId, action, actorId = null, requesterId = null, senderRecipientId = null, requestId = null } = {}) {
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
      await this._publishSystemMessage(thread, `${transfer.toLabel} declined ${safeArray(transfer.attachments).length || safeArray(transfer.items).length} item(s) from ${transfer.fromLabel}.`, { eventType: 'item-transfer-declined', transferId: transfer.id });
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

    if (action === 'approve-item-transfer') {
      if (!requesterIsGm) return false;
      if (transfer.status !== 'pendingGm') return false;
      transfer.status = 'pendingRecipient';
      transfer.approvedAt = nowIso();
      transfer.approvedBy = requesterId || game.user?.id || null;
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `GM approved an item transfer from ${transfer.fromLabel} to ${transfer.toLabel}.`, { eventType: 'item-transfer-approved', transferId: transfer.id });
      return true;
    }

    if (action !== 'accept-item-transfer') return false;
    if (!requesterIsGm && currentId !== transfer.toRecipientId) return false;
    let ok = false;
    if (transfer.kind === 'ownedItemTransfer') {
      const atomic = await this._executeAtomicTradeSettlement({
        thread,
        transfer,
        actors: this._collectTradeSettlementActors(transfer),
        preflight: () => this._preflightTradeSettlement(transfer),
        operation: () => this._executeOwnedItemTransfer({ thread, transfer, requesterId }),
        failureEventType: 'item-trade-atomic-failed',
        failurePrefix: 'Item trade failed'
      });
      ok = Boolean(atomic?.success && atomic.result !== false);
      if (!ok) transfer.failureReason = atomic?.error || 'Atomic item trade settlement failed.';
    } else {
      ok = await this._gmGrantItems({ thread, recipientId: transfer.toRecipientId, itemUuids: transfer.itemUuids, requesterId, eventType: 'item-transfer-complete', source: 'holonet-item-transfer' });
    }
    transfer.status = ok ? 'complete' : 'failed';
    transfer.resolvedAt = nowIso();
    transfer.resolvedBy = currentId;
    await HolonetStorage.saveRecord(message);
    return ok;
  }


  static _tradeSnapshotRoot(actor) {
    const data = actor?.toObject ? actor.toObject(false) : {};
    return {
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? data?.name ?? 'Unknown Actor',
      data: {
        name: data?.name ?? actor?.name ?? 'Unknown Actor',
        img: data?.img ?? actor?.img ?? null,
        system: foundry.utils.deepClone(data?.system ?? actor?.system ?? {}),
        flags: foundry.utils.deepClone(data?.flags ?? actor?.flags ?? {}),
        ownership: foundry.utils.deepClone(data?.ownership ?? actor?.ownership ?? {}),
        prototypeToken: foundry.utils.deepClone(data?.prototypeToken ?? actor?.prototypeToken ?? {}),
        items: foundry.utils.deepClone(data?.items ?? actor?.items?.map?.(item => item.toObject ? item.toObject() : item) ?? []),
        effects: foundry.utils.deepClone(data?.effects ?? actor?.effects?.map?.(effect => effect.toObject ? effect.toObject() : effect) ?? [])
      }
    };
  }

  static _collectTradeSettlementActors(transfer = {}, { includeCounter = true } = {}) {
    const actors = new Map();
    const addActor = actor => {
      if (actor?.id) actors.set(actor.id, actor);
    };
    addActor(transfer.fromActorId ? game.actors?.get(transfer.fromActorId) : null);
    addActor(transfer.toActorId ? game.actors?.get(transfer.toActorId) : null);
    for (const entry of safeArray(transfer.assets)) {
      addActor(game.actors?.get(String(entry?.id || entry?.uuid || '').replace(/^Actor\./, '')));
    }
    if (includeCounter) {
      for (const entry of safeArray(transfer?.counterOffer?.assets)) {
        addActor(game.actors?.get(String(entry?.id || entry?.uuid || '').replace(/^Actor\./, '')));
      }
    }
    return Array.from(actors.values());
  }

  static async _restoreTradeSnapshot(snapshot, { source = 'HolonetMessengerService.atomicTradeRollback' } = {}) {
    const actor = snapshot?.actorId ? game.actors?.get(snapshot.actorId) : null;
    if (!actor) throw new Error(`Rollback actor ${snapshot?.actorName || snapshot?.actorId || 'unknown'} could not be resolved.`);
    const data = snapshot.data ?? {};
    await ActorEngine.updateActor(actor, {
      name: data.name,
      img: data.img,
      system: foundry.utils.deepClone(data.system ?? {}),
      flags: foundry.utils.deepClone(data.flags ?? {}),
      ownership: foundry.utils.deepClone(data.ownership ?? {}),
      prototypeToken: foundry.utils.deepClone(data.prototypeToken ?? {})
    }, { source, skipValidation: true, rederive: true, suppressAppRefresh: true });

    const currentItemIds = actor.items?.map?.(item => item.id) ?? [];
    if (currentItemIds.length) {
      await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', currentItemIds, { source, skipValidation: true, rederive: false, suppressAppRefresh: true });
    }
    const itemsToRestore = safeArray(data.items).map(item => foundry.utils.deepClone(item));
    if (itemsToRestore.length) {
      await ActorEngine.createEmbeddedDocuments(actor, 'Item', itemsToRestore, { source, skipValidation: true, rederive: false, suppressAppRefresh: true });
    }

    const currentEffectIds = actor.effects?.map?.(effect => effect.id) ?? [];
    if (currentEffectIds.length) {
      await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', currentEffectIds, { source, skipValidation: true, rederive: false, suppressAppRefresh: true });
    }
    const effectsToRestore = safeArray(data.effects).map(effect => foundry.utils.deepClone(effect));
    if (effectsToRestore.length) {
      await ActorEngine.createEmbeddedDocuments(actor, 'ActiveEffect', effectsToRestore, { source, skipValidation: true, rederive: false, suppressAppRefresh: true });
    }
    await ActorEngine.recalcAll?.(actor);
    return true;
  }

  static async _restoreTradeSnapshots(snapshots = [], options = {}) {
    const ordered = safeArray(snapshots).slice().reverse();
    for (const snapshot of ordered) {
      await this._restoreTradeSnapshot(snapshot, options);
    }
    return true;
  }

  static _preflightTradeSettlement(transfer = {}, { includeCounter = false, suppressRequestedCredits = false } = {}) {
    if (transfer.kind === 'ownedAssetTransfer') {
      const assetValidation = this._validateOwnedAssetTransfer(transfer);
      if (!assetValidation.ok) return { ok: false, error: assetValidation.error };
    } else if (transfer.kind === 'ownedItemTransfer') {
      const itemValidation = this._validateOwnedItemTransfer(transfer);
      if (!itemValidation.ok) return { ok: false, error: itemValidation.error };
    }

    if (!suppressRequestedCredits) {
      const requestedCredits = parsePositiveCredits(transfer?.trade?.requestedCredits);
      if (requestedCredits) {
        const payer = transfer.toActorId ? game.actors?.get(transfer.toActorId) : null;
        const payee = transfer.fromActorId ? game.actors?.get(transfer.fromActorId) : null;
        if (!payer || !payee) return { ok: false, error: 'Trade credit actors could not be resolved.' };
        if (creditsOf(payer) < requestedCredits) return { ok: false, error: `${payer.name} does not have ${formatCredits(requestedCredits)} available for this trade.` };
      }
    }

    if (includeCounter && transfer?.counterOffer) {
      const counterCredits = parsePositiveCredits(transfer.counterOffer.credits);
      if (counterCredits) {
        const payer = transfer.toActorId ? game.actors?.get(transfer.toActorId) : null;
        const payee = transfer.fromActorId ? game.actors?.get(transfer.fromActorId) : null;
        if (!payer || !payee) return { ok: false, error: 'Counter-offer credit actors could not be resolved.' };
        if (creditsOf(payer) < counterCredits) return { ok: false, error: `${payer.name} does not have ${formatCredits(counterCredits)} available for this counter-offer.` };
      }

      if (safeArray(transfer.counterOffer.items).length) {
        const counterItemTransfer = {
          id: `${transfer.id}-counter-preflight`,
          kind: 'ownedItemTransfer',
          fromActorId: transfer.toActorId,
          fromLabel: transfer.toLabel,
          toActorId: transfer.fromActorId,
          toLabel: transfer.fromLabel,
          items: transfer.counterOffer.items
        };
        const itemValidation = this._validateOwnedItemTransfer(counterItemTransfer);
        if (!itemValidation.ok) return { ok: false, error: itemValidation.error };
      }

      if (safeArray(transfer.counterOffer.assets).length) {
        const counterAssetTransfer = {
          id: `${transfer.id}-counter-assets-preflight`,
          kind: 'ownedAssetTransfer',
          fromActorId: transfer.toActorId,
          fromLabel: transfer.toLabel,
          toActorId: transfer.fromActorId,
          toLabel: transfer.fromLabel,
          assets: transfer.counterOffer.assets
        };
        const assetValidation = this._validateOwnedAssetTransfer(counterAssetTransfer);
        if (!assetValidation.ok) return { ok: false, error: assetValidation.error };
      }
    }

    return { ok: true };
  }

  static async _executeAtomicTradeSettlement({ thread, transfer, actors = [], preflight = null, operation = null, failureEventType = 'trade-atomic-failed', failurePrefix = 'Trade settlement failed' } = {}) {
    if (typeof operation !== 'function') return { success: false, error: 'No trade settlement operation was provided.' };

    const validation = typeof preflight === 'function' ? preflight() : { ok: true };
    if (!validation?.ok) {
      const error = validation?.error || 'Trade preflight failed.';
      if (thread && transfer) {
        await this._publishSystemMessage(thread, `${failurePrefix}: ${error}. No trade state was changed.`, { eventType: failureEventType, transferId: transfer.id, rollbackOk: true, preflight: true });
      }
      return { success: false, error, rollbackOk: true, preflight: true };
    }

    const actorList = safeArray(actors).filter(actor => actor?.id);
    const uniqueActors = Array.from(new Map(actorList.map(actor => [actor.id, actor])).values());
    const snapshots = uniqueActors.map(actor => this._tradeSnapshotRoot(actor));

    try {
      const result = await operation();
      if (result === false || result?.success === false) {
        throw new Error(result?.error || 'Trade settlement operation returned failure.');
      }
      return { success: true, result, snapshots: snapshots.length };
    } catch (err) {
      let rollbackOk = false;
      let rollbackError = null;
      try {
        await this._restoreTradeSnapshots(snapshots, { source: 'HolonetMessengerService.atomicTradeRollback' });
        rollbackOk = true;
      } catch (restoreErr) {
        rollbackError = restoreErr;
      }

      const baseError = err?.message || 'Unknown trade settlement failure.';
      const message = rollbackOk
        ? `${failurePrefix}: ${baseError}. All trade state was restored.`
        : `${failurePrefix}: ${baseError}. Rollback failed: ${rollbackError?.message || 'unknown rollback failure'}.`;
      if (thread && transfer) {
        await this._publishSystemMessage(thread, message, { eventType: failureEventType, transferId: transfer.id, rollbackOk, rollbackError: rollbackError?.message ?? null });
      }
      return { success: false, error: message, rollbackOk, rollbackError: rollbackError?.message ?? null };
    }
  }

  static _validateOwnedItemTransfer(transfer = {}) {
    const sourceActor = transfer.fromActorId ? game.actors?.get(transfer.fromActorId) : null;
    const targetActor = transfer.toActorId ? game.actors?.get(transfer.toActorId) : null;
    if (!sourceActor || !targetActor) return { ok: false, error: 'Item transfer actors could not be resolved.' };
    for (const entry of safeArray(transfer.items)) {
      const sourceItem = sourceActor.items?.get?.(entry.itemId) ?? sourceActor.items?.find?.(item => item.id === entry.itemId || item._id === entry.itemId);
      if (!sourceItem) return { ok: false, error: `${entry.name || 'Item'} is no longer on ${sourceActor.name}.` };
      const sourceQty = getItemQuantity(sourceItem);
      const requestedQty = Math.max(1, normalizeQuantity(entry.quantity, 1));
      if (sourceQty < requestedQty) return { ok: false, error: `${sourceActor.name} no longer has enough ${sourceItem.name}.` };
    }
    return { ok: true, sourceActor, targetActor };
  }

  static _buildCounterItemEntries(actor, itemIds = []) {
    if (!actor) return [];
    const ids = new Set(safeArray(itemIds).map(id => String(id || '').trim()).filter(Boolean));
    if (!ids.size) return [];
    return (actor.items?.contents ?? [])
      .filter(item => ids.has(item.id) || ids.has(item.uuid))
      .map(item => ({
        itemId: item.id,
        uuid: item.uuid,
        name: item.name || 'Item',
        type: item.type || 'item',
        img: item.img || 'icons/svg/item-bag.svg',
        quantity: 1
      }));
  }

  static _buildCounterAssetEntries(actor, assetIds = []) {
    if (!actor) return [];
    const ids = new Set(safeArray(assetIds).map(id => String(id || '').replace(/^Actor\./, '').trim()).filter(Boolean));
    if (!ids.size) return [];
    return ownedActorLinks(actor)
      .map(link => assetActorByLink(link))
      .filter(Boolean)
      .filter(asset => ids.has(asset.id) || ids.has(String(asset.uuid || '').replace(/^Actor\./, '')))
      .map(asset => ({
        id: asset.id,
        uuid: asset.uuid || `Actor.${asset.id}`,
        name: asset.name || 'Owned Asset',
        type: asset.type || 'actor',
        typeLabel: actorAssetCategory(asset),
        img: asset.img || 'icons/svg/mystery-man.svg',
        summary: [asset.type, asset.system?.vehicleType, asset.system?.droidDegree].filter(Boolean).join(' · ')
      }));
  }

  static _validateOwnedAssetTransfer(transfer = {}) {
    const sourceActor = transfer.fromActorId ? game.actors?.get(transfer.fromActorId) : null;
    const targetActor = transfer.toActorId ? game.actors?.get(transfer.toActorId) : null;
    if (!sourceActor || !targetActor) return { ok: false, error: 'Asset transfer actors could not be resolved.' };
    const assets = safeArray(transfer.assets)
      .map(entry => game.actors?.get(String(entry?.id || entry?.uuid || '').replace(/^Actor\./, '')))
      .filter(Boolean);
    if (!assets.length) return { ok: false, error: 'No valid ship/droid asset was selected.' };
    const ownedIds = new Set(ownedActorLinks(sourceActor).map(link => String(link.id || '').replace(/^Actor\./, '')));
    const missing = assets.find(asset => !ownedIds.has(asset.id));
    if (missing) return { ok: false, error: `${missing.name} is no longer linked to ${sourceActor.name}.` };
    return { ok: true, sourceActor, targetActor, assets };
  }

  static async _moveOwnedAssets({ thread, transfer, assets, sourceActor, targetActor, transactionId = null, requesterId = null, source = 'holonet-asset-transfer' } = {}) {
    const ids = safeArray(assets).map(asset => asset.id).filter(Boolean);
    if (!ids.length || !sourceActor || !targetActor) return false;
    await ActorEngine.applyMutationPlan(sourceActor, { set: removeAssetLinks(sourceActor, ids) }, { source: 'HolonetMessengerService.assetTransfer.unlinkSource', validate: true, rederive: true });
    const linkPlan = StoreAcquisitionService.buildOwnerLinkPlan(targetActor, assets, {
      ownerActor: targetActor,
      source,
      transactionId: transactionId ?? transfer?.id,
      transactionContext: 'holonet-asset-trade',
      audit: { transferId: transfer?.id ?? null, threadId: thread?.id ?? null, requesterId }
    });
    if (linkPlan) await ActorEngine.applyMutationPlan(targetActor, linkPlan, { source: 'HolonetMessengerService.assetTransfer.linkTarget', validate: true, rederive: true });

    const ownership = StoreAcquisitionService.buildActorOwnership(targetActor, { includeCurrentGM: true });
    for (const asset of assets) {
      await asset.update({
        ownership,
        'system.ownedByActorId': targetActor.id,
        'system.ownedByActorName': targetActor.name,
        [`flags.foundryvtt-swse.holonetAssetTransfer`]: {
          source,
          threadId: thread?.id ?? null,
          transferId: transfer?.id ?? null,
          fromActorId: sourceActor.id,
          toActorId: targetActor.id,
          transferredAt: nowIso(),
          requesterId
        }
      });
    }
    return true;
  }

  static async _executeCounterAssets({ thread, transfer, requesterId = null } = {}) {
    const entries = safeArray(transfer?.counterOffer?.assets);
    if (!entries.length) return { success: true, count: 0, names: [] };
    const counterTransfer = {
      id: `${transfer.id}-counter-assets`,
      kind: 'ownedAssetTransfer',
      fromActorId: transfer.toActorId,
      fromLabel: transfer.toLabel,
      toActorId: transfer.fromActorId,
      toLabel: transfer.fromLabel,
      assets: entries
    };
    const validation = this._validateOwnedAssetTransfer(counterTransfer);
    if (!validation.ok) return { success: false, error: validation.error };
    const ok = await this._moveOwnedAssets({ thread, transfer: counterTransfer, assets: validation.assets, sourceActor: validation.sourceActor, targetActor: validation.targetActor, requesterId, source: 'holonet-asset-counter-offer' });
    return ok ? { success: true, count: validation.assets.length, names: validation.assets.map(asset => asset.name) } : { success: false, error: 'Counter asset transfer failed.' };
  }

  static async _executeCounterItems({ thread, transfer, requesterId = null } = {}) {
    const entries = safeArray(transfer?.counterOffer?.items);
    if (!entries.length) return { success: true, count: 0 };
    const counterTransfer = {
      id: `${transfer.id}-counter`,
      kind: 'ownedItemTransfer',
      fromActorId: transfer.toActorId,
      fromLabel: transfer.toLabel,
      toActorId: transfer.fromActorId,
      toLabel: transfer.fromLabel,
      items: entries
    };
    const validation = this._validateOwnedItemTransfer(counterTransfer);
    if (!validation.ok) return { success: false, error: validation.error };
    const ok = await this._executeOwnedItemTransfer({ thread, transfer: counterTransfer, requesterId });
    return ok ? { success: true, count: entries.length } : { success: false, error: 'Counter item transfer failed.' };
  }

  static async _settleCounterOffer({ thread, transfer, requesterId = null } = {}) {
    const counter = transfer?.counterOffer ?? null;
    if (!counter) return { success: true };
    const sourceActor = transfer.toActorId ? game.actors?.get(transfer.toActorId) : null;
    const targetActor = transfer.fromActorId ? game.actors?.get(transfer.fromActorId) : null;
    if (!sourceActor || !targetActor) return { success: false, error: 'Counter-offer actors could not be resolved.' };

    const credits = parsePositiveCredits(counter.credits);
    if (credits) {
      const credit = await TransactionEngine.executeCreditTransfer({
        fromActor: sourceActor,
        toActor: targetActor,
        amount: credits,
        reason: counter.memo ? `Holonet asset counter-offer: ${counter.memo}` : 'Holonet asset counter-offer',
        transactionContext: 'holonet-asset-counter-offer',
        audit: { source: 'holonet-asset-counter-offer', threadId: thread.id, transferId: transfer.id, requesterId }
      }, { source: 'HolonetMessengerService.assetCounterOfferCredits', validate: true, rederive: true });
      if (!credit?.success) return { success: false, error: credit?.error || 'Counter credit movement failed.' };
    }

    const item = await this._executeCounterItems({ thread, transfer, requesterId });
    if (!item?.success) return item;
    const asset = await this._executeCounterAssets({ thread, transfer, requesterId });
    if (!asset?.success) return asset;
    return { success: true, credits, itemCount: item.count || 0, assetCount: asset.count || 0, assetNames: asset.names || [] };
  }

  static async _settleTradeCredits({ thread, transfer, requesterId = null, source = 'HolonetMessengerService.tradeCredits' } = {}) {
    const requestedCredits = parsePositiveCredits(transfer?.trade?.requestedCredits);
    if (!requestedCredits) return { success: true, amount: 0 };
    const sourceActor = transfer.fromActorId ? game.actors?.get(transfer.fromActorId) : null;
    const targetActor = transfer.toActorId ? game.actors?.get(transfer.toActorId) : null;
    if (!sourceActor || !targetActor) return { success: false, error: 'Trade credit actors could not be resolved.' };
    return TransactionEngine.executeCreditTransfer({
      fromActor: targetActor,
      toActor: sourceActor,
      amount: requestedCredits,
      reason: transfer.memo ? `Holonet trade: ${transfer.memo}` : 'Holonet trade',
      transactionContext: transfer.kind === 'ownedAssetTransfer' ? 'holonet-asset-trade' : 'holonet-item-trade',
      audit: { source: 'holonet-trade', threadId: thread.id, transferId: transfer.id, requesterId }
    }, { source, validate: true, rederive: true });
  }

  static async _gmResolveAssetTransfer({ thread, recordId, action, actorId = null, counterCredits = 0, counterItemIds = [], counterAssetIds = [], counterMemo = '', requesterId = null, senderRecipientId = null, requestId = null } = {}) {
    if (!recordId) return false;
    const message = await HolonetStorage.getRecord(recordId);
    const transfer = message?.metadata?.assetTransfer;
    if (!message || !transfer) return false;
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM || senderRecipientId?.startsWith('gm:'));
    const currentId = senderRecipientId || currentRecipientId();
    if (['complete', 'declined', 'cancelled', 'failed'].includes(transfer.status)) return false;

    if (action === 'offer-asset-counter') {
      if (!requesterIsGm && currentId !== transfer.toRecipientId) return false;
      if (transfer.status !== 'pendingRecipient') return false;
      const sourceActor = transfer.toActorId ? game.actors?.get(transfer.toActorId) : null;
      const items = this._buildCounterItemEntries(sourceActor, counterItemIds);
      const assets = this._buildCounterAssetEntries(sourceActor, counterAssetIds);
      const credits = parsePositiveCredits(counterCredits);
      const memo = String(counterMemo || '').trim();
      if (!credits && !items.length && !assets.length && !memo) return false;
      transfer.counterOffer = {
        credits,
        items,
        assets,
        memo,
        offeredByRecipientId: currentId,
        offeredByActorId: transfer.toActorId ?? null,
        offeredAt: nowIso()
      };
      transfer.status = 'counterOffered';
      await HolonetStorage.saveRecord(message);
      const parts = [];
      if (credits) parts.push(formatCredits(credits));
      if (items.length) parts.push(items.map(item => item.name).join(', '));
      if (assets.length) parts.push(assets.map(asset => asset.name).join(', '));
      await this._publishSystemMessage(thread, `${transfer.toLabel} counter-offered ${parts.join(' + ') || 'alternate terms'} for ${safeArray(transfer.assets).map(asset => asset.name).join(', ') || 'an asset'}.`, { eventType: 'asset-counter-offered', transferId: transfer.id });
      return true;
    }

    if (action === 'decline-asset-counter') {
      if (transfer.status !== 'counterOffered') return false;
      if (!requesterIsGm && currentId !== transfer.fromRecipientId && currentId !== transfer.toRecipientId) return false;
      transfer.status = 'pendingRecipient';
      transfer.counterDeclinedAt = nowIso();
      transfer.counterDeclinedBy = currentId;
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `Counter offer for ${safeArray(transfer.assets).map(asset => asset.name).join(', ') || 'asset transfer'} was declined. Original asset offer is still awaiting recipient action.`, { eventType: 'asset-counter-declined', transferId: transfer.id });
      return true;
    }

    if (action === 'accept-asset-counter') {
      if (transfer.status !== 'counterOffered') return false;
      if (!requesterIsGm && currentId !== transfer.fromRecipientId) return false;
      const hasCounterAssets = safeArray(transfer?.counterOffer?.assets).length > 0;
      if (hasCounterAssets && assetTradeApprovalRequired() && !requesterIsGm) {
        transfer.status = 'counterPendingGm';
        transfer.counterAcceptedAt = nowIso();
        transfer.counterAcceptedBy = currentId;
        await HolonetStorage.saveRecord(message);
        await this._publishSystemMessage(thread, `Counter offer accepted by ${transfer.fromLabel}; awaiting GM approval for reciprocal asset movement.`, { eventType: 'asset-counter-awaiting-gm', transferId: transfer.id });
        return true;
      }
      const ok = await this._completeAssetCounterOffer({ thread, message, transfer, requesterId, resolvedBy: currentId });
      return ok;
    }

    if (action === 'approve-asset-counter') {
      if (!requesterIsGm) return false;
      if (transfer.status !== 'counterPendingGm') return false;
      transfer.counterApprovedAt = nowIso();
      transfer.counterApprovedBy = requesterId || game.user?.id || null;
      const ok = await this._completeAssetCounterOffer({ thread, message, transfer, requesterId, resolvedBy: currentId });
      return ok;
    }

    if (action === 'decline-asset-transfer') {
      if (!requesterIsGm && currentId !== transfer.toRecipientId) return false;
      transfer.status = 'declined';
      transfer.resolvedAt = nowIso();
      transfer.resolvedBy = currentId;
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `${transfer.toLabel} declined an asset transfer from ${transfer.fromLabel}.`, { eventType: 'asset-transfer-declined', transferId: transfer.id });
      return true;
    }

    if (action === 'cancel-asset-transfer') {
      if (!requesterIsGm && currentId !== transfer.fromRecipientId) return false;
      transfer.status = 'cancelled';
      transfer.resolvedAt = nowIso();
      transfer.resolvedBy = currentId;
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `${transfer.fromLabel} cancelled an asset transfer.`, { eventType: 'asset-transfer-cancelled', transferId: transfer.id });
      return true;
    }

    if (action === 'approve-asset-transfer') {
      if (!requesterIsGm) return false;
      if (transfer.status !== 'pendingGm') return false;
      transfer.status = 'pendingRecipient';
      transfer.approvedAt = nowIso();
      transfer.approvedBy = requesterId || game.user?.id || null;
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `GM approved an asset transfer from ${transfer.fromLabel} to ${transfer.toLabel}.`, { eventType: 'asset-transfer-approved', transferId: transfer.id });
      return true;
    }

    if (action !== 'accept-asset-transfer') return false;
    if (!requesterIsGm && currentId !== transfer.toRecipientId) return false;
    const atomic = await this._executeAtomicTradeSettlement({
      thread,
      transfer,
      actors: this._collectTradeSettlementActors(transfer),
      preflight: () => this._preflightTradeSettlement(transfer),
      operation: () => this._executeAssetTransfer({ thread, transfer, requesterId }),
      failureEventType: 'asset-trade-atomic-failed',
      failurePrefix: 'Asset trade failed'
    });
    const ok = Boolean(atomic?.success && atomic.result !== false);
    transfer.status = ok ? 'complete' : 'failed';
    transfer.resolvedAt = nowIso();
    transfer.resolvedBy = currentId;
    if (!ok) transfer.failureReason = atomic?.error || 'Atomic asset trade settlement failed.';
    await HolonetStorage.saveRecord(message);
    return ok;
  }

  static async _completeAssetCounterOffer({ thread, message, transfer, requesterId = null, resolvedBy = null } = {}) {
    const atomic = await this._executeAtomicTradeSettlement({
      thread,
      transfer,
      actors: this._collectTradeSettlementActors(transfer, { includeCounter: true }),
      preflight: () => this._preflightTradeSettlement(transfer, { includeCounter: true, suppressRequestedCredits: true }),
      operation: async () => {
        const counter = await this._settleCounterOffer({ thread, transfer, requesterId });
        if (!counter?.success) throw new Error(counter?.error || 'Counter settlement failed.');
        const ok = await this._executeAssetTransfer({ thread, transfer: { ...transfer, trade: { ...(transfer.trade ?? {}), requestedCredits: 0 } }, requesterId });
        if (!ok) throw new Error('Original asset transfer failed after counter settlement.');
        return { success: true, counter };
      },
      failureEventType: 'asset-counter-atomic-failed',
      failurePrefix: 'Asset counter-offer failed'
    });

    const ok = Boolean(atomic?.success);
    transfer.status = ok ? 'complete' : 'failed';
    transfer.resolvedAt = nowIso();
    transfer.resolvedBy = resolvedBy;
    transfer.counterSettledAt = ok ? nowIso() : null;
    if (!ok) transfer.failureReason = atomic?.error || 'Atomic asset counter-offer settlement failed.';
    await HolonetStorage.saveRecord(message);
    return ok;
  }

  static async _executeAssetTransfer({ thread, transfer, requesterId = null } = {}) {
    const validation = this._validateOwnedAssetTransfer(transfer);
    if (!validation.ok) {
      await this._publishSystemMessage(thread, `Asset transfer failed: ${validation.error}`, { eventType: 'asset-transfer-failed', transferId: transfer.id });
      return false;
    }
    const { sourceActor, targetActor, assets } = validation;

    const credit = await this._settleTradeCredits({ thread, transfer, requesterId, source: 'HolonetMessengerService.assetTradeCredits' });
    if (!credit?.success) {
      await this._publishSystemMessage(thread, `Asset transfer payment failed: ${credit?.error || 'Credit movement failed.'}`, { eventType: 'asset-transfer-payment-failed', transferId: transfer.id });
      return false;
    }

    const ids = assets.map(asset => asset.id);
    await ActorEngine.applyMutationPlan(sourceActor, { set: removeAssetLinks(sourceActor, ids) }, { source: 'HolonetMessengerService.assetTransfer.unlinkSource', validate: true, rederive: true });
    const linkPlan = StoreAcquisitionService.buildOwnerLinkPlan(targetActor, assets, {
      ownerActor: targetActor,
      source: 'holonet-asset-transfer',
      transactionId: credit.transferId ?? credit.transactionId ?? transfer.id,
      transactionContext: 'holonet-asset-trade',
      audit: { transferId: transfer.id, threadId: thread.id, requesterId }
    });
    if (linkPlan) await ActorEngine.applyMutationPlan(targetActor, linkPlan, { source: 'HolonetMessengerService.assetTransfer.linkTarget', validate: true, rederive: true });

    const ownership = StoreAcquisitionService.buildActorOwnership(targetActor, { includeCurrentGM: true });
    for (const asset of assets) {
      await asset.update({
        ownership,
        'system.ownedByActorId': targetActor.id,
        'system.ownedByActorName': targetActor.name,
        [`flags.foundryvtt-swse.holonetAssetTransfer`]: {
          source: 'holonet-asset-transfer',
          threadId: thread.id,
          transferId: transfer.id,
          fromActorId: sourceActor.id,
          toActorId: targetActor.id,
          transferredAt: nowIso(),
          requesterId
        }
      });
    }

    const names = assets.map(asset => asset.name).join(', ');
    await this._publishReceiptMessage(thread, {
      title: 'Asset Transfer Receipt',
      eventType: 'asset-transfer-complete',
      lines: [`From: ${sourceActor.name}`, `To: ${targetActor.name}`, `Assets: ${names}`, credit.amount ? `Credits: ${formatCredits(credit.amount)}` : null].filter(Boolean)
    });
    await this._publishSystemMessage(thread, `${targetActor.name} received ${names} from ${sourceActor.name}.`, { eventType: 'asset-transfer-complete', toActorId: targetActor.id, assetIds: ids });
    return true;
  }

  static async _executeOwnedItemTransfer({ thread, transfer, requesterId = null } = {}) {
    const validation = this._validateOwnedItemTransfer(transfer);
    if (!validation.ok) {
      await this._publishSystemMessage(thread, `Item transfer failed: ${validation.error}`, { eventType: 'item-transfer-failed', transferId: transfer.id });
      return false;
    }
    const { sourceActor, targetActor } = validation;

    const credit = await this._settleTradeCredits({ thread, transfer, requesterId, source: 'HolonetMessengerService.itemTradeCredits' });
    if (!credit?.success) {
      await this._publishSystemMessage(thread, `Item trade payment failed: ${credit?.error || 'Credit movement failed.'}`, { eventType: 'item-transfer-payment-failed', transferId: transfer.id });
      return false;
    }

    const createData = [];
    const updates = [];
    const deletes = [];
    const names = [];
    for (const entry of safeArray(transfer.items)) {
      const sourceItem = sourceActor.items?.get?.(entry.itemId) ?? sourceActor.items?.find?.(item => item.id === entry.itemId || item._id === entry.itemId);
      if (!sourceItem) throw new Error(`${entry.name || 'Item'} is no longer on ${sourceActor.name}.`);
      const sourceQty = getItemQuantity(sourceItem);
      const requestedQty = Math.max(1, normalizeQuantity(entry.quantity, 1));
      if (sourceQty < requestedQty) throw new Error(`${sourceActor.name} no longer has enough ${sourceItem.name}.`);
      const data = foundry.utils.deepClone(entry.data || (sourceItem.toObject ? sourceItem.toObject() : sourceItem));
      delete data._id;
      data.flags ??= {};
      data.flags.swse ??= {};
      data.flags.swse.holonetTransfer = { source: 'holonet-owned-item-transfer', threadId: thread.id, transferId: transfer.id, fromActorId: sourceActor.id, grantedAt: nowIso(), requesterId };
      setItemQuantityOnData(data, requestedQty);
      createData.push(data);
      names.push(`${sourceItem.name} x${requestedQty}`);
      if (sourceQty === requestedQty) {
        deletes.push(sourceItem.id);
      } else {
        updates.push({ _id: sourceItem.id, [itemQuantityUpdatePath(sourceItem)]: sourceQty - requestedQty });
      }
    }
    if (!createData.length) return false;

    try {
      if (updates.length) await ActorEngine.updateEmbeddedDocuments(sourceActor, 'Item', updates, { source: 'HolonetMessengerService.itemTransfer.decrement' });
      if (deletes.length) await ActorEngine.deleteEmbeddedDocuments(sourceActor, 'Item', deletes, { source: 'HolonetMessengerService.itemTransfer.remove' });
      await ActorEngine.createEmbeddedDocuments(targetActor, 'Item', createData, { source: 'HolonetMessengerService.itemTransfer.create' });
    } catch (err) {
      if (credit?.amount) {
        await TransactionEngine.executeCreditTransfer({
          fromActor: sourceActor,
          toActor: targetActor,
          amount: credit.amount,
          reason: 'Holonet item trade compensation after item movement failure',
          transactionContext: 'holonet-item-trade',
          audit: { source: 'holonet-item-trade-compensation', threadId: thread.id, transferId: transfer.id, requesterId, originalTransferId: credit.transferId ?? null }
        }, { source: 'HolonetMessengerService.itemTradeCompensation', validate: true, rederive: true });
      }
      throw err;
    }

    await this._publishReceiptMessage(thread, {
      title: transfer?.trade?.requestedCredits ? 'Item Trade Receipt' : 'Item Transfer Receipt',
      eventType: 'item-transfer-complete',
      lines: [`From: ${sourceActor.name}`, `To: ${targetActor.name}`, `Items: ${names.join(', ')}`, credit.amount ? `Credits: ${formatCredits(credit.amount)}` : null].filter(Boolean)
    });
    await this._publishSystemMessage(thread, `${targetActor.name} received ${names.join(', ')} from ${sourceActor.name}.`, { eventType: 'item-transfer-complete', toActorId: targetActor.id, itemNames: names });
    return true;
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
    const changed = [];
    for (const messageId of thread.messageIds ?? []) {
      const message = await HolonetStorage.getRecord(messageId);
      if (!message) continue;
      if (message.isUnreadBy(recipientId)) {
        message.markRead(recipientId);
        changed.push(message);
      }
    }
    if (changed.length) await HolonetStorage.saveRecords(changed);
    return true;
  }

  static async getUnreadMessageCount(recipientId = currentRecipientId()) {
    if (!recipientId) return 0;
    const records = await HolonetStorage.getRecordsForRecipient(recipientId, ['published']);
    return records.filter(r => r.type === RECORD_TYPE.MESSAGE && r.isUnreadBy(recipientId)).length;
  }
}
