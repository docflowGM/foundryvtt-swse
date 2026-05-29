/**
 * Holonet Messenger Service
 *
 * Threaded datapad messaging over the existing Holonet engine.
 * This service intentionally owns Messenger UX state, invite handshakes,
 * thread membership, GM oversight, and credit-transfer messages while leaving
 * actual actor mechanics to canonical engines.
 */

import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
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
import { applyXP } from '/systems/foundryvtt-swse/scripts/engine/progression/xp-engine.js';
import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { GameSessionStore } from '/systems/foundryvtt-swse/scripts/games/game-session-store.js';
import { GameSessionMaterializer } from '/systems/foundryvtt-swse/scripts/games/game-session-materializer.js';
import { GameNotificationService } from '/systems/foundryvtt-swse/scripts/games/game-notification-service.js';
import { MessengerNotificationBridge } from './messenger-notification-bridge.js';

const THREAD_TYPE = Object.freeze({
  PRIVATE: 'private',
  PARTY: 'party',
  SIDE: 'side',
  NPC: 'npc',
  JOB: 'job'
});

const DEFAULT_MESSAGE_LIMIT = 75;
const MESSAGE_BATCH_SIZE = 75;
const MAX_MESSAGE_LIMIT = 500;

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

function getPartyFundLedger() {
  const ledger = getSwseSetting('holonetPartyFundLedger', []);
  return Array.isArray(ledger) ? foundry.utils.deepClone(ledger) : [];
}

async function setPartyFundLedger(ledger = []) {
  await game.settings.set('foundryvtt-swse', 'holonetPartyFundLedger', Array.isArray(ledger) ? ledger.slice(-100) : []);
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

function normalizedMessageLimit(value, fallback = DEFAULT_MESSAGE_LIMIT) {
  const raw = Number(value ?? fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(MESSAGE_BATCH_SIZE, Math.min(MAX_MESSAGE_LIMIT, Math.floor(raw)));
}

function messageWindowFor(messages = [], { limit = DEFAULT_MESSAGE_LIMIT, highlightRecordId = '' } = {}) {
  const all = safeArray(messages);
  const total = all.length;
  const safeLimit = normalizedMessageLimit(limit);
  if (total <= safeLimit) {
    return { messages: all, start: 0, end: total, total, limit: safeLimit, hiddenOlderCount: 0, hasOlderMessages: false };
  }

  const highlightId = String(highlightRecordId || '').trim();
  const highlightIndex = highlightId ? all.findIndex(message => String(message?.id || '') === highlightId) : -1;
  let start = Math.max(0, total - safeLimit);
  if (highlightIndex >= 0 && highlightIndex < start) {
    const halfWindow = Math.floor(safeLimit / 2);
    start = Math.max(0, Math.min(highlightIndex - halfWindow, total - safeLimit));
  }
  const end = Math.min(total, start + safeLimit);
  return {
    messages: all.slice(start, end),
    start,
    end,
    total,
    limit: safeLimit,
    hiddenOlderCount: start,
    hasOlderMessages: start > 0
  };
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


function normalizeJobObjectiveEntries(job = {}) {
  const entries = safeArray(job.objectives).map((objective, index) => ({
    ...objective,
    id: String(objective?.id || objective?.objectiveId || `objective-${index + 1}`),
    type: String(objective?.type || objective?.tier || (index === 0 ? 'primary' : 'secondary')),
    status: String(objective?.status || 'open')
  }));
  if (entries.length) return entries;
  return [{
    id: 'legacy-primary',
    type: 'primary',
    title: job.title || 'Complete the posted job',
    required: true,
    rewardCredits: parsePositiveCredits(job.rewardCredits),
    rewardItems: String(job.rewardItems || '').trim(),
    status: ['complete', 'paid'].includes(String(job.status || 'posted')) ? 'approved' : 'open',
    statusHistory: []
  }];
}

function jobObjectiveLabel(objective = {}) {
  return String(objective.title || objective.objective || objective.name || objective.id || 'Objective');
}

function jobObjectiveStatusLabel(status = 'open') {
  const map = {
    open: 'Open',
    claimed: 'Claimed Complete',
    submitted: 'Submitted',
    pendingReview: 'Pending Review',
    approved: 'Approved',
    rejected: 'Rejected',
    failed: 'Failed'
  };
  return map[status] || String(status || 'Open');
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

function nowMs() {
  return Date.now();
}

function gameTitle(gameId = '') {
  const id = String(gameId || '').trim();
  const labels = {
    pazaak: 'Pazaak',
    sabacc: 'Sabacc',
    dejarik: 'Dejarik',
    hintaro: 'Hintaro'
  };
  return labels[id] || (id ? id.replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase()) : 'Holopad Game');
}

function recipientUserId(recipient = {}) {
  if (recipient?.userId) return recipient.userId;
  const id = String(recipient?.id || '');
  if (id.startsWith('player:') || id.startsWith('gm:')) return id.split(':')[1] || null;
  return null;
}

function actorByRecipient(recipient = {}) {
  if (recipient?.actorId) return game.actors?.get?.(recipient.actorId) ?? null;
  const userId = recipientUserId(recipient);
  return userId ? game.users?.get?.(userId)?.character ?? null : null;
}

function gameSeatForRecipient(recipient = {}, status = 'invited', { seatId = '', actor = null } = {}) {
  const linkedActor = actor || actorByRecipient(recipient);
  return {
    seatId: seatId || `seat_${foundry.utils.randomID(6)}`,
    type: recipient?.recipientType === RECIPIENT_TYPE.GM || String(recipient?.id || '').startsWith('gm:') ? 'gm' : 'player',
    userId: recipientUserId(recipient),
    actorId: linkedActor?.id ?? recipient?.actorId ?? null,
    recipientId: recipient?.id ?? null,
    displayName: linkedActor?.name || recipientDisplayName(recipient),
    avatar: linkedActor?.img || recipientAvatar(recipient),
    status
  };
}

function shouldCreateMessengerActionNotice(eventType = '') {
  const normalized = String(eventType || '').trim();
  return normalized.includes('transfer')
    || normalized.includes('credit-request')
    || normalized.includes('job-status')
    || normalized.includes('job-objective')
    || normalized.includes('job-posted')
    || normalized.includes('job-payout');
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
  static _tradeLogContext(transfer = {}, extra = {}) {
    const counter = transfer?.counterOffer ?? null;
    return {
      transferId: transfer?.id ?? null,
      kind: transfer?.kind ?? null,
      status: transfer?.status ?? null,
      fromActorId: transfer?.fromActorId ?? null,
      fromLabel: transfer?.fromLabel ?? null,
      toActorId: transfer?.toActorId ?? null,
      toLabel: transfer?.toLabel ?? null,
      itemCount: safeArray(transfer?.items).length,
      assetCount: safeArray(transfer?.assets).length,
      requestedCredits: parsePositiveCredits(transfer?.trade?.requestedCredits),
      hasCounterOffer: Boolean(counter),
      counterCredits: parsePositiveCredits(counter?.credits),
      counterItemCount: safeArray(counter?.items).length,
      counterAssetCount: safeArray(counter?.assets).length,
      threadId: extra?.threadId ?? null,
      requesterId: extra?.requesterId ?? null,
      action: extra?.action ?? null,
      phase: extra?.phase ?? null,
      ...extra
    };
  }

  static _tradeLifecycleLog(level = 'debug', message = '', transfer = {}, extra = {}) {
    const context = this._tradeLogContext(transfer, extra);
    const logger = SWSELogger?.[level] ?? SWSELogger?.debug ?? console.debug;
    try {
      logger.call(SWSELogger, `[HolonetTradeLifecycle] ${message}`, context);
    } catch (_err) {
      try { console.debug('[HolonetTradeLifecycle]', message, context); } catch (__err) {}
    }
  }

  static _tradeLifecycleError(message = '', transfer = {}, err = null, extra = {}) {
    const context = this._tradeLogContext(transfer, {
      ...extra,
      error: err?.message ?? String(err ?? ''),
      stack: err?.stack ?? null
    });
    try {
      SWSELogger.error(`[HolonetTradeLifecycle] ${message}`, context);
    } catch (_loggerErr) {
      try { console.error('[HolonetTradeLifecycle]', message, context); } catch (__err) {}
    }
  }

  static _appendTradeAtomicEvent(transfer = {}, event = {}) {
    if (!transfer || typeof transfer !== 'object') return null;
    const entry = {
      id: foundry.utils.randomID(),
      at: nowIso(),
      phase: String(event.phase || 'atomic.event'),
      status: String(event.status || 'info'),
      message: String(event.message || ''),
      error: event.error ? String(event.error) : '',
      rollbackOk: event.rollbackOk ?? null,
      preflight: event.preflight ?? null,
      actorIds: safeArray(event.actorIds),
      snapshotCount: Number(event.snapshotCount || 0) || 0,
      ...event
    };
    transfer.atomicEvents = [...safeArray(transfer.atomicEvents), entry].slice(-75);
    transfer.lastAtomicEvent = entry;
    if (event.rollbackOk !== undefined) transfer.rollbackOk = event.rollbackOk;
    if (event.preflight !== undefined) transfer.preflight = event.preflight;
    if (event.error) transfer.failureReason = String(event.error);
    return entry;
  }

  static _jobRewardLog(level = 'debug', message = '', extra = {}) {
    const logger = SWSELogger?.[level] ?? SWSELogger?.debug ?? console.debug;
    try {
      logger.call(SWSELogger, `[HolonetJobReward] ${message}`, extra);
    } catch (_err) {
      try { console.debug('[HolonetJobReward]', message, extra); } catch (__err) {}
    }
  }

  static async _executeAtomicJobRewardSettlement({ thread, actors = [], preflight = null, operation = null, failureEventType = 'job-reward-atomic-failed', failurePrefix = 'Job reward settlement failed', context = {} } = {}) {
    if (typeof operation !== 'function') return { success: false, error: 'No job reward settlement operation was provided.' };
    const actorList = safeArray(actors).filter(actor => actor?.id);
    const uniqueActors = Array.from(new Map(actorList.map(actor => [actor.id, actor])).values());
    const partyFundSnapshot = { balance: getPartyFundBalance(), ledger: getPartyFundLedger() };
    const snapshots = uniqueActors.map(actor => this._tradeSnapshotRoot(actor));
    this._jobRewardLog('debug', 'Atomic job reward settlement starting.', {
      threadId: thread?.id ?? null,
      actorIds: uniqueActors.map(actor => actor.id),
      failureEventType,
      ...context
    });

    try {
      const validation = typeof preflight === 'function' ? await preflight() : { ok: true };
      if (validation?.ok === false) throw new Error(validation?.error || 'Job reward preflight failed.');
      const result = await operation();
      if (result === false || result?.success === false) throw new Error(result?.error || 'Job reward operation returned failure.');
      this._jobRewardLog('info', 'Atomic job reward settlement completed.', { threadId: thread?.id ?? null, result, ...context });
      return { success: true, result, snapshots: snapshots.length };
    } catch (err) {
      let rollbackOk = false;
      let rollbackError = null;
      try {
        await this._restoreTradeSnapshots(snapshots, { source: 'HolonetMessengerService.atomicJobRewardRollback' });
        await setPartyFundBalance(partyFundSnapshot.balance);
        await setPartyFundLedger(partyFundSnapshot.ledger);
        rollbackOk = true;
      } catch (restoreErr) {
        rollbackError = restoreErr;
      }
      const baseError = err?.message || 'Unknown job reward settlement failure.';
      const message = rollbackOk
        ? `${failurePrefix}: ${baseError}. All reward state was restored.`
        : `${failurePrefix}: ${baseError}. Rollback failed: ${rollbackError?.message || 'unknown rollback failure'}.`;
      this._jobRewardLog('error', message, {
        threadId: thread?.id ?? null,
        rollbackOk,
        rollbackError: rollbackError?.message ?? null,
        ...context
      });
      if (thread) {
        await this._publishSystemMessage(thread, message, {
          eventType: failureEventType,
          rollbackOk,
          rollbackError: rollbackError?.message ?? null,
          originalError: baseError,
          ...context
        });
      }
      return { success: false, error: message, rollbackOk, rollbackError: rollbackError?.message ?? null };
    }
  }

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

  static async getThreadsForCurrentParticipant(actor, { includeArchived = false } = {}) {
    const participantId = currentRecipientId();
    if (!participantId) return [];

    const allThreads = await HolonetStorage.getAllThreads();
    this._cachedThreadsForNpcContact = allThreads;
    const visible = allThreads.filter(thread => {
      const meta = getThreadMeta(thread);
      if (!includeArchived && meta.archivedBy?.[participantId]) return false;
      if (game.user?.isGM) return true;
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
    const gameInvite = message.metadata?.gameInvite ?? null;
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
      hasGameInvite: Boolean(gameInvite),
      gameInvite: gameInvite ? this._gameInviteVm(message, gameInvite, actor, participantId) : null,
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
    const counterCredits = parsePositiveCredits(transfer?.counterOffer?.credits);
    const counterItems = safeArray(transfer?.counterOffer?.items);
    const counterItemOptions = isRecipient ? this._buildInventoryComposerVm(actor).items : [];
    return {
      ...transfer,
      messageId: message.id,
      status,
      statusLabel: transferStatusLabel(status),
      itemCount: safeArray(transfer.items).reduce((sum, item) => sum + (Number(item?.quantity) || 1), 0) || safeArray(transfer.attachments).length,
      requestedCredits: requiredCredits,
      requestedCreditsLabel: requiredCredits > 0 ? formatCredits(requiredCredits) : '',
      hasTradeTerms: Boolean(requiredCredits > 0 || transfer?.trade?.requestedItemsNote),
      hasCounterOffer: Boolean(transfer?.counterOffer),
      counterOffer: transfer?.counterOffer ? {
        ...transfer.counterOffer,
        credits: counterCredits,
        creditsLabel: counterCredits > 0 ? formatCredits(counterCredits) : '',
        items: counterItems,
        hasItems: counterItems.length > 0
      } : null,
      counterItemOptions,
      canCounterOffer: status === 'pendingRecipient' && (isRecipient || isGm),
      canAcceptCounter: status === 'counterOffered' && (isSender || isGm),
      canDeclineCounter: status === 'counterOffered' && (isSender || isRecipient || isGm),
      canAccept: status === 'pendingRecipient' && (isRecipient || isGm),
      canApprove: status === 'pendingGm' && isGm,
      canDecline: ['pendingRecipient', 'pendingGm'].includes(status) && (isRecipient || isGm),
      canCancel: ['pendingRecipient', 'pendingGm', 'counterOffered'].includes(status) && (isSender || isGm),
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



  static _gameInviteVm(message, invite = {}, actor, participantId) {
    const status = String(invite.status || 'pending');
    const isGm = Boolean(game.user?.isGM);
    const isRecipient = invite.recipientId === participantId || (invite.recipientActorId && actor?.id === invite.recipientActorId);
    const isSender = invite.fromRecipientId === participantId || (invite.hostActorId && actor?.id === invite.hostActorId);
    const buyIn = Number(invite.creditBuyIn || invite.buyIn || 0) || 0;
    return {
      ...invite,
      messageId: message.id,
      status,
      statusLabel: status === 'accepted' ? 'Accepted' : status === 'declined' ? 'Declined' : status === 'cancelled' ? 'Cancelled' : 'Pending Response',
      gameTitle: invite.gameTitle || gameTitle(invite.gameId),
      hostLabel: invite.fromLabel || invite.hostLabel || 'Host',
      invitedLabel: invite.recipientLabel || invite.invitedLabel || 'Invited Player',
      rulesLabel: String(invite.rulesMode || 'republic-senate').replace(/[-_]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase()),
      buyInLabel: buyIn > 0 ? formatCredits(buyIn) : '',
      memoPreview: compactMemo(invite.memo),
      canAccept: status === 'pending' && (isRecipient || isGm),
      canDecline: status === 'pending' && (isRecipient || isGm),
      canCancel: status === 'pending' && (isSender || isGm),
      isResolved: ['accepted', 'declined', 'cancelled'].includes(status)
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
        objectives: normalizeJobObjectiveEntries(meta.job).map(objective => ({
          ...objective,
          label: jobObjectiveLabel(objective),
          statusLabel: jobObjectiveStatusLabel(objective.status),
          rewardCreditsLabel: objective.rewardCredits ? formatCredits(objective.rewardCredits) : '',
          isRequired: Boolean(objective.required || String(objective.type || '').toLowerCase() === 'primary')
        })),
        hasObjectives: normalizeJobObjectiveEntries(meta.job).length > 0,
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
    const includeArchived = options.includeArchived === true || options.includeArchived === 'true';
    const threadSearch = String(options.search || options.threadSearch || '').trim();
    const [rawThreads, noticeCenter] = await Promise.all([
      this.getThreadsForCurrentParticipant(actor, { includeArchived }),
      HolonetNoticeCenterService.buildCenterVm({ actor, previewLimit: 2 })
    ]);
    const searchNeedle = threadSearch.toLowerCase();
    const threads = searchNeedle
      ? rawThreads.filter(thread => [thread.title, thread.subtitle, thread.preview, thread.ownerLabel, thread.threadType].some(value => String(value || '').toLowerCase().includes(searchNeedle)))
      : rawThreads;
    const recipientOptions = this.buildRecipientOptions(actor, { threads: this._cachedThreadsForNpcContact ?? [] });
    const composeMode = options.compose === true || options.compose === 'true' || options.mode === 'compose';
    const selectedThreadId = composeMode ? null : (options.threadId || threads[0]?.id || null);
    const selectedThread = threads.find(t => t.id === selectedThreadId) || null;

    const highlightRecordId = String(options.highlightRecordId || options.sourceRecordId || '').trim();
    const messageLimit = normalizedMessageLimit(options.messageLimit || options.limit || DEFAULT_MESSAGE_LIMIT);
    const fullSelectedMessages = safeArray(selectedThread?.messages);
    const messageWindow = messageWindowFor(fullSelectedMessages, { limit: messageLimit, highlightRecordId });
    let previous = messageWindow.start > 0 ? fullSelectedMessages[messageWindow.start - 1] : null;
    const messages = messageWindow.messages.map(message => {
      const vm = this._messageViewModel(message, actor, participantId, previous);
      vm.isHighlighted = Boolean(highlightRecordId && String(message.id || '') === highlightRecordId);
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
      threadSearch,
      includeArchived,
      hasThreadSearch: Boolean(threadSearch),
      selectedThreadId,
      selectedThread: selectedThreadVm,
      messages,
      pinnedMessages,
      messageLimit: messageWindow.limit,
      messageBatchSize: MESSAGE_BATCH_SIZE,
      totalMessagesCount: messageWindow.total,
      hiddenOlderCount: messageWindow.hiddenOlderCount,
      hasOlderMessages: messageWindow.hasOlderMessages,
      highlightRecordId,
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



  static async createGameInvite({ actor, gameId = '', recipientId = '', rulesMode = 'republic-senate', title = '', memo = '', creditBuyIn = 0 } = {}) {
    const payload = {
      actorId: actor?.id ?? null,
      gameId: String(gameId || '').trim(),
      recipientId: String(recipientId || '').trim(),
      rulesMode: String(rulesMode || 'republic-senate').trim() || 'republic-senate',
      title: String(title || '').trim(),
      memo: String(memo || '').trim(),
      creditBuyIn: Number(creditBuyIn || 0) || 0,
      requesterId: game.user?.id ?? null,
      senderUserId: game.user?.id ?? null,
      senderRecipientId: currentRecipientId()
    };
    if (!payload.gameId || !payload.recipientId) return false;
    if (!game.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('create-game-invite', payload);
      return { pending: true, requestId, threadId: null };
    }
    return this._gmCreateGameInvite(payload);
  }

  static async _gmCreateGameInvite({ actorId = null, gameId = '', recipientId = '', rulesMode = 'republic-senate', title = '', memo = '', creditBuyIn = 0, senderUserId = null, senderRecipientId = null, requesterId = null, requestId = null } = {}) {
    const cleanGameId = String(gameId || '').trim();
    const recipient = this._recipientFromStableId(String(recipientId || '').trim());
    if (!cleanGameId || !recipient) return false;
    const actor = actorId ? game.actors?.get(actorId) : null;
    const senderRecipient = this._recipientForActorContext(actor, { senderUserId: senderUserId || requesterId || game.user?.id, senderRecipientId });
    if (!senderRecipient?.id || senderRecipient.id === recipient.id) return false;
    const label = gameTitle(cleanGameId);
    const cleanTitle = String(title || '').trim() || `${label} Invite`;
    const cleanRulesMode = String(rulesMode || 'republic-senate').trim() || 'republic-senate';
    const buyIn = Math.max(0, Math.floor(Number(creditBuyIn || 0) || 0));
    const participants = uniqueRecipients([senderRecipient, recipient, ...this._gmObserverRecipients()]);
    const thread = await HolonetThreadService.createThread(cleanTitle, participants, {
      sourceFamily: SOURCE_FAMILY.MESSENGER,
      threadType: THREAD_TYPE.SIDE,
      ownerId: senderRecipient.id,
      ownerLabel: recipientDisplayName(senderRecipient),
      pendingInvites: [],
      declinedBy: [],
      mutedBy: {},
      archivedBy: {},
      createdByUserId: senderUserId || requesterId || game.user?.id || null,
      gmObserverIds: this._gmObserverRecipients().map(r => r.id),
      gameInvite: {
        gameId: cleanGameId,
        gameTitle: label,
        rulesMode: cleanRulesMode,
        status: 'pending',
        recipientId: recipient.id,
        fromRecipientId: senderRecipient.id,
        memo: String(memo || '').trim(),
        creditBuyIn: buyIn,
        createdAt: nowIso(),
        createdByUserId: senderUserId || requesterId || game.user?.id || null
      }
    });

    const sessionId = `game_${foundry.utils.randomID(12)}`;
    const session = await GameSessionStore.upsertSession({
      id: sessionId,
      gameId: cleanGameId,
      title: cleanTitle,
      status: 'pending-invite',
      authorityMode: 'host',
      hostUserId: recipientUserId(senderRecipient) || senderUserId || requesterId || game.user?.id || null,
      hostActorId: actor?.id ?? senderRecipient.actorId ?? null,
      holonetThreadId: thread.id,
      seats: [
        gameSeatForRecipient(senderRecipient, 'host', { seatId: 'seat_host', actor }),
        gameSeatForRecipient(recipient, 'invited', { seatId: 'seat_guest' })
      ],
      rulesMode: cleanRulesMode,
      wagerProfile: buyIn > 0 ? { mode: 'credit-buy-in', buyIn, currency: 'credits' } : { mode: 'none' },
      metadata: {
        inviteMemo: String(memo || '').trim(),
        invitedRecipientId: recipient.id,
        invitedByRecipientId: senderRecipient.id,
        invitedAt: nowMs(),
        source: 'holonet-messenger'
      },
      log: [{ id: foundry.utils.randomID(), at: nowMs(), type: 'game-invite-created', by: senderRecipient.id, data: { recipientId: recipient.id, gameId: cleanGameId } }]
    });

    const invite = {
      id: foundry.utils.randomID(),
      sessionId: session.id,
      gameId: cleanGameId,
      gameTitle: label,
      rulesMode: cleanRulesMode,
      title: cleanTitle,
      memo: String(memo || '').trim(),
      creditBuyIn: buyIn,
      status: 'pending',
      recipientId: recipient.id,
      recipientActorId: recipient.actorId ?? null,
      recipientLabel: recipientDisplayName(recipient),
      fromRecipientId: senderRecipient.id,
      fromLabel: recipientDisplayName(senderRecipient),
      hostActorId: actor?.id ?? senderRecipient.actorId ?? null,
      createdAt: nowIso(),
      createdByUserId: senderUserId || requesterId || game.user?.id || null
    };

    const message = MessengerSource.createMessage({
      sender: HolonetSender.system('Holopad Games'),
      audience: HolonetAudience.threadParticipants(this._messageRecipientsForThread(thread).map(r => r.id)),
      body: `${invite.fromLabel} invited ${invite.recipientLabel} to play ${label}${buyIn ? ` for ${formatCredits(buyIn)}` : ''}.${invite.memo ? ` ${invite.memo}` : ''}`,
      threadId: thread.id,
      metadata: {
        categoryId: HolonetPreferences.CATEGORIES.MESSAGES,
        systemEvent: true,
        eventType: 'game-invite-created',
        gameInvite: invite
      }
    });
    message.intent = INTENT_TYPE.GAME_INVITE_RECEIVED;
    message.recipients = this._messageRecipientsForThread(thread);
    message.projections = [
      { surfaceType: SURFACE_TYPE.MESSENGER_THREAD, recordId: message.id, isPinned: false, metadata: { threadId: thread.id } },
      { surfaceType: SURFACE_TYPE.HOME_FEED, recordId: message.id, isPinned: false, metadata: { threadId: thread.id } },
      { surfaceType: SURFACE_TYPE.GAMES_NOTICE, recordId: message.id, isPinned: false, metadata: { threadId: thread.id, sessionId: session.id } }
    ];
    const result = await HolonetThreadService.publishMessageToThread({ thread, message, senderRecipient: null, publishOptions: { skipSocket: true }, markSenderRead: false });
    if (!result?.ok) return false;

    const savedThread = await HolonetStorage.getThread(thread.id) || thread;
    savedThread.metadata ??= {};
    savedThread.metadata.gameInvite = { ...(savedThread.metadata.gameInvite || {}), ...invite, messageId: message.id };
    await HolonetStorage.saveThread(savedThread);
    await GameSessionStore.upsertSession({ ...session, holonetMessageId: message.id, metadata: { ...(session.metadata || {}), inviteMessageId: message.id } });

    await MessengerNotificationBridge.publishActionNotice({
      thread: savedThread,
      sourceRecord: message,
      title: `${label} invite`,
      body: `${invite.fromLabel} invited you to play ${label}.`,
      eventType: 'game-invite-created',
      intent: INTENT_TYPE.GAME_INVITE_RECEIVED,
      recipients: [recipient]
    });
    GameNotificationService.emitInviteUpdated({ ...session, holonetMessageId: message.id }, { action: 'created', threadId: thread.id, messageId: message.id, requestId, requesterId });
    this._emitMessengerSync(this._threadSyncPayload(thread.id, { messageId: message.id, requestId, requesterId, type: 'game-invite-created', sessionId: session.id }));
    return { threadId: thread.id, messageId: message.id, sessionId: session.id, requestId };
  }

  static async _gmResolveGameInvite({ thread, recordId, action, actorId = null, requesterId = null, senderRecipientId = null, requestId = null } = {}) {
    if (!thread || !recordId) return false;
    const message = await HolonetStorage.getRecord(recordId);
    const invite = message?.metadata?.gameInvite;
    if (!message || !invite) return false;
    const actor = actorId ? game.actors?.get(actorId) : null;
    const actorRecipient = this._recipientForActorContext(actor, { senderUserId: requesterId ?? game.user?.id, senderRecipientId });
    const currentId = senderRecipientId || actorRecipient?.id;
    const requesterIsGm = requesterId ? Boolean(game.users?.get(requesterId)?.isGM) : Boolean(game.user?.isGM);
    const isGm = Boolean(requesterIsGm || currentId?.startsWith('gm:'));
    const isRecipient = invite.recipientId === currentId || (invite.recipientActorId && actor?.id === invite.recipientActorId);
    const isSender = invite.fromRecipientId === currentId;
    if (!isGm && !isRecipient && !(action === 'cancel-game-invite' && isSender)) return false;
    if (invite.status !== 'pending') return true;

    const accepted = action === 'accept-game-invite';
    const declined = action === 'decline-game-invite' || action === 'cancel-game-invite';
    if (!accepted && !declined) return false;
    const nextStatus = accepted ? 'accepted' : (action === 'cancel-game-invite' ? 'cancelled' : 'declined');
    message.metadata.gameInvite = {
      ...invite,
      status: nextStatus,
      resolvedAt: nowIso(),
      resolvedBy: requesterId || game.user?.id || null,
      resolvedRecipientId: currentId
    };
    await HolonetStorage.saveRecord(message);

    let updatedSession = GameSessionStore.getSession(invite.sessionId);
    if (updatedSession) {
      updatedSession = await GameSessionStore.setSeatStatus(invite.sessionId, invite.recipientId, accepted ? 'accepted' : nextStatus, {
        resolvedAt: nowMs(),
        resolvedByUserId: requesterId || game.user?.id || null
      }) || updatedSession;
      if (accepted) {
        updatedSession = await GameSessionStore.upsertSession({
          ...updatedSession,
          status: 'active',
          holonetThreadId: thread.id,
          holonetMessageId: message.id,
          metadata: { ...(updatedSession.metadata || {}), acceptedAt: nowMs(), acceptedByRecipientId: currentId }
        });
        updatedSession = await GameSessionMaterializer.materializeAcceptedInvite(updatedSession, { by: currentId, threadId: thread.id });
      } else {
        updatedSession = await GameSessionStore.upsertSession({
          ...updatedSession,
          status: 'cancelled',
          holonetThreadId: thread.id,
          holonetMessageId: message.id,
          metadata: { ...(updatedSession.metadata || {}), declinedAt: nowMs(), declinedByRecipientId: currentId, inviteStatus: nextStatus }
        });
      }
    }

    const label = gameTitle(invite.gameId);
    await this._publishSystemMessage(thread, `${recipientDisplayName(actorRecipient)} ${accepted ? 'accepted' : 'declined'} the ${label} invite.`, {
      eventType: accepted ? 'game-invite-accepted' : 'game-invite-declined',
      gameInvite: { ...message.metadata.gameInvite },
      sessionId: invite.sessionId
    });
    await MessengerNotificationBridge.publishActionNotice({
      thread,
      sourceRecord: message,
      title: `${label} invite ${accepted ? 'accepted' : 'declined'}`,
      body: `${recipientDisplayName(actorRecipient)} ${accepted ? 'accepted' : 'declined'} the ${label} invite.`,
      eventType: accepted ? 'game-invite-accepted' : 'game-invite-declined',
      intent: accepted ? INTENT_TYPE.GAME_INVITE_ACCEPTED : INTENT_TYPE.GAME_INVITE_DECLINED,
      recipients: this._messageRecipientsForThread(thread)
    });
    if (updatedSession) GameNotificationService.emitInviteUpdated(updatedSession, { action: nextStatus, threadId: thread.id, messageId: message.id, requestId, requesterId });
    this._emitMessengerSync(this._threadSyncPayload(thread.id, { messageId: message.id, requestId, requesterId, type: accepted ? 'game-invite-accepted' : 'game-invite-declined', sessionId: invite.sessionId }));
    return { threadId: thread.id, messageId: message.id, sessionId: invite.sessionId, status: nextStatus, requestId };
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

  static async createJobPosting({ actor, title = '', body = '', recipientIds = [], contactRecipientId = '', rewardCredits = 0, rewardItems = '', rewardItemUuids = [], attachments = [], client = null, objectives = [], briefing = null, factionConsequences = null, status = 'posted' }) {
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
      client,
      objectives,
      briefing,
      factionConsequences,
      status,
      senderUserId: game.user?.id ?? null,
      senderRecipientId: currentRecipientId()
    };
    return this._gmCreateJobPosting(payload);
  }

  static async _gmCreateJobPosting({ actorId, title = 'Job Board Posting', body = '', recipientIds = [], contactRecipientId = '', rewardCredits = 0, rewardItems = '', rewardItemUuids = [], attachments = [], client = null, objectives = [], briefing = null, factionConsequences = null, status = 'posted', senderUserId = null, senderRecipientId = null, requestId = null, requesterId = null } = {}) {
    const actor = actorId ? game.actors?.get(actorId) : null;
    const senderRecipient = this._recipientForActorContext(actor, { senderUserId, senderRecipientId });
    const rawRecipientIds = this._normalizeRecipientIds(recipientIds);
    const requested = rawRecipientIds
      .map(id => this._recipientFromStableId(id))
      .filter(Boolean);
    const contactRecipient = contactRecipientId ? this._recipientFromStableId(contactRecipientId) : null;
    const initialStatus = ['draft', 'posted'].includes(String(status || 'posted')) ? String(status || 'posted') : 'posted';
    const participants = uniqueRecipients(initialStatus === 'draft' ? [senderRecipient] : [senderRecipient, ...requested]);
    const normalizedObjectives = this._normalizeJobContractObjectives(objectives, { title, rewardCredits, rewardItems });
    const normalizedClient = this._normalizeJobClient(client, contactRecipient);
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
        contactLabel: normalizedClient?.name || (contactRecipient ? recipientDisplayName(contactRecipient) : 'Job Board'),
        client: normalizedClient,
        briefing: briefing && typeof briefing === 'object' ? { ...briefing } : { body: String(body || '').trim() },
        objectives: normalizedObjectives,
        factionConsequences: factionConsequences && typeof factionConsequences === 'object' ? { ...factionConsequences } : null,
        intendedRecipientIds: rawRecipientIds,
        rewardCredits: parsePositiveCredits(rewardCredits),
        rewardItems: String(rewardItems || '').trim(),
        rewardItemUuids: safeArray(rewardItemUuids).map(String).filter(Boolean),
        status: initialStatus,
        statusHistory: [{ status: initialStatus, at: nowIso(), by: senderUserId || game.user?.id || null }]
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

    await this._publishSystemMessage(thread, `${initialStatus === 'draft' ? 'Job draft created' : 'Job posted'}: ${title || 'New Holonet Job'}.`, { eventType: initialStatus === 'draft' ? 'job-draft-created' : 'job-posted' });
    if (initialStatus !== 'draft') {
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
    }
    return { threadId: thread.id, requestId };
  }


  static _normalizeJobClient(client = null, contactRecipient = null) {
    if (!client || typeof client !== 'object') {
      return contactRecipient ? {
        type: 'npc',
        name: recipientDisplayName(contactRecipient),
        actorId: contactRecipient.actorId ?? null,
        imageUrl: contactRecipient.metadata?.avatar ?? null
      } : null;
    }
    const type = String(client.type || 'customNpc').trim() || 'customNpc';
    const name = String(client.name || client.label || '').trim() || (contactRecipient ? recipientDisplayName(contactRecipient) : 'Job Board Client');
    return {
      type,
      name,
      factionName: String(client.factionName || '').trim(),
      actorId: String(client.actorId || '').trim() || contactRecipient?.actorId || null,
      imageUrl: String(client.imageUrl || client.avatar || '').trim(),
      saveForReuse: Boolean(client.saveForReuse),
      notes: String(client.notes || '').trim()
    };
  }

  static _normalizeJobContractObjectives(objectives = [], fallback = {}) {
    const entries = safeArray(objectives)
      .map((objective, index) => {
        const title = String(objective?.title || objective?.objective || objective?.name || '').trim();
        if (!title) return null;
        const type = String(objective?.type || objective?.tier || (index === 0 ? 'primary' : 'secondary')).trim() || 'objective';
        const lower = type.toLowerCase();
        return {
          id: String(objective?.id || `objective-${index + 1}`),
          type,
          title,
          description: String(objective?.description || objective?.memo || '').trim(),
          memo: String(objective?.memo || '').trim(),
          required: lower === 'primary' ? true : Boolean(objective?.required),
          rewardCredits: parsePositiveCredits(objective?.rewardCredits ?? objective?.credits ?? 0),
          rewardXp: Math.max(0, Math.floor(Number(objective?.rewardXp ?? objective?.xp ?? 0) || 0)),
          rewardItems: String(objective?.rewardItems || objective?.items || '').trim(),
          status: String(objective?.status || 'open'),
          statusHistory: []
        };
      })
      .filter(Boolean);

    if (entries.length) return entries;
    return [{
      id: 'objective-1',
      type: 'primary',
      title: String(fallback.title || 'Complete the posted job'),
      description: String(fallback.body || '').trim(),
      memo: '',
      required: true,
      rewardCredits: parsePositiveCredits(fallback.rewardCredits),
      rewardXp: 0,
      rewardItems: String(fallback.rewardItems || '').trim(),
      status: 'open',
      statusHistory: []
    }];
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
      if (shouldCreateMessengerActionNotice(metadata?.eventType)) {
        await MessengerNotificationBridge.publishActionNotice({
          thread,
          sourceRecord: message,
          title: 'Messenger Update',
          body,
          eventType: metadata.eventType,
          recipients: this._messageRecipientsForThread(thread)
        });
      }
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
      review: 'Review',
      complete: 'Ready to Pay',
      paid: 'Paid',
      archived: 'Archived',
      draft: 'Draft',
      failed: 'Failed'
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
    await MessengerNotificationBridge.publishActionNotice({ thread, sourceRecord: message, title: 'Credit Transfer Offered', body: transferBody, eventType: 'credit-transfer-offered', recipients: [recipient] });
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
    await MessengerNotificationBridge.publishActionNotice({ thread, sourceRecord: message, title: 'Credit Request', body, eventType: 'credit-request-created', recipients: entries.map(entry => this._recipientFromStableId(entry.recipientId)).filter(Boolean) });
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
    await MessengerNotificationBridge.publishActionNotice({ thread, sourceRecord: message, title: 'Item Transfer Offered', body: message.body, eventType: 'item-transfer-offered', recipients: [this._recipientFromStableId(transfer.toRecipientId)].filter(Boolean) });
    this._emitMessengerSync(this._threadSyncPayload(thread.id, { messageId: message.id, requestId, requesterId }));
    return { threadId: thread.id, messageId: message.id };
  }


  static async threadAction({ actor, threadId, action, recipientIds = [], amount = null, recipientId = null, recordId = null, partyFundCutPercent = null, status = null, statusNote = '', objectiveId = null, objectiveStatus = null, objectiveNote = '', itemUuids = [], items = [], memo = '', splitMode = '', distributionMode = '', payoutMode = '', tradeIntent = '', requestedCredits = 0, requestedItemsNote = '', assetIds = [], counterCredits = 0, counterItemIds = [], counterAssetIds = [], counterMemo = '' }) {
    const payload = { actorId: actor?.id ?? null, threadId, action, recipientIds, amount, recipientId, recordId, partyFundCutPercent, status, statusNote: String(statusNote || '').trim(), objectiveId: objectiveId ? String(objectiveId) : null, objectiveStatus: objectiveStatus ? String(objectiveStatus) : null, objectiveNote: String(objectiveNote || '').trim(), itemUuids: safeArray(itemUuids).map(String).filter(Boolean), items: safeArray(items), memo: String(memo || '').trim(), splitMode, distributionMode, payoutMode: String(payoutMode || distributionMode || '').trim(), tradeIntent: String(tradeIntent || '').trim(), requestedCredits: Number(requestedCredits || 0) || 0, requestedItemsNote: String(requestedItemsNote || '').trim(), assetIds: safeArray(assetIds).map(String).filter(Boolean), counterCredits: Number(counterCredits || 0) || 0, counterItemIds: safeArray(counterItemIds).map(String).filter(Boolean), counterAssetIds: safeArray(counterAssetIds).map(String).filter(Boolean), counterMemo: String(counterMemo || '').trim(), requesterId: game.user?.id ?? null, senderRecipientId: currentRecipientId() };
    if (!game.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('thread-action', payload);
      return { pending: true, requestId, threadId };
    }
    return this._gmThreadAction(payload);
  }

  static async _gmThreadAction({ actorId, threadId, action, recipientIds = [], amount = null, recipientId = null, recordId = null, partyFundCutPercent = null, status = null, statusNote = '', objectiveId = null, objectiveStatus = null, objectiveNote = '', itemUuids = [], items = [], memo = '', splitMode = '', distributionMode = '', payoutMode = '', tradeIntent = '', requestedCredits = 0, requestedItemsNote = '', assetIds = [], counterCredits = 0, counterItemIds = [], counterAssetIds = [], counterMemo = '', requesterId = null, senderRecipientId = null, requestId = null } = {}) {
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
      case 'accept-game-invite':
      case 'decline-game-invite':
      case 'cancel-game-invite': {
        await this._gmResolveGameInvite({ thread, recordId, action, actorId, requesterId, senderRecipientId, requestId });
        break;
      }
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
      case 'unarchive-thread': {
        meta.archivedBy ??= {};
        delete meta.archivedBy[currentId];
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
        if (!['draft', 'posted', 'accepted', 'inProgress', 'review', 'complete', 'paid', 'archived', 'failed'].includes(nextStatus)) return false;
        const previousStatus = String(meta.job.status || 'posted');
        meta.job.status = nextStatus;
        const cleanStatusNote = String(statusNote || '').trim();
        meta.job.statusHistory = [...safeArray(meta.job.statusHistory), { status: nextStatus, at: nowIso(), by: requesterId || game.user?.id || null, note: cleanStatusNote }];
        if (nextStatus === 'posted' && previousStatus === 'draft') {
          const additions = safeArray(meta.job.intendedRecipientIds)
            .map(id => this._recipientFromStableId(id))
            .filter(Boolean)
            .filter(r => !hasRecipient(thread.participants, r.id));
          if (additions.length) thread.participants = uniqueRecipients([...(thread.participants ?? []), ...additions]);
        }
        await HolonetStorage.saveThread(thread);
        await this._publishSystemMessage(thread, `Job status changed to ${this._jobStatusLabel(nextStatus)}.${cleanStatusNote ? ` GM note: ${cleanStatusNote}` : ''}`, { eventType: 'job-status-changed', status: nextStatus, note: cleanStatusNote });
        if (['complete', 'failed'].includes(nextStatus)) {
          await this._applyJobFactionConsequences({ thread, status: nextStatus, requesterId });
        }
        if (nextStatus === 'posted' && previousStatus === 'draft') {
          const brief = meta.job?.briefing?.body || meta.job?.title || 'A new job has been posted to the Holonet board.';
          await this._gmSendMessage({
            actorId: meta.job?.client?.actorId ?? actorId,
            body: brief,
            imageUrl: meta.job?.client?.imageUrl || '',
            attachments: [],
            threadId: thread.id,
            senderUserId: requesterId || game.user?.id || null,
            senderRecipientId: meta.job?.contactRecipientId || senderRecipientId,
            requestId,
            requesterId
          });
        }
        break;
      }
      case 'set-job-objective-status': {
        if (!isGm) return false;
        meta.job ??= {};
        const allowedObjectiveStatuses = ['open', 'claimed', 'submitted', 'pendingReview', 'approved', 'rejected', 'failed'];
        const nextObjectiveStatus = String(objectiveStatus || '').trim();
        if (!objectiveId || !allowedObjectiveStatuses.includes(nextObjectiveStatus)) return false;
        const objectives = normalizeJobObjectiveEntries(meta.job);
        const objective = objectives.find(entry => entry.id === String(objectiveId));
        if (!objective) return false;
        objective.status = nextObjectiveStatus;
        objective.statusHistory = [
          ...safeArray(objective.statusHistory),
          { status: nextObjectiveStatus, at: nowIso(), by: requesterId || game.user?.id || null, note: String(objectiveNote || '').trim() }
        ];
        meta.job.objectives = objectives;
        meta.job.statusHistory = [
          ...safeArray(meta.job.statusHistory),
          { status: `objective:${nextObjectiveStatus}`, objectiveId: objective.id, at: nowIso(), by: requesterId || game.user?.id || null, note: String(objectiveNote || '').trim() }
        ];
        if (nextObjectiveStatus === 'approved' && String(meta.job.status || '') === 'review') {
          const required = objectives.filter(entry => entry.required === true || String(entry.type || '').toLowerCase() === 'primary');
          const allRequiredApproved = required.length > 0 && required.every(entry => String(entry.status || '') === 'approved');
          const stillNeedsReview = objectives.some(entry => ['claimed', 'submitted', 'pendingReview'].includes(String(entry.status || '')));
          if (allRequiredApproved && !stillNeedsReview) meta.job.status = 'complete';
        }
        await HolonetStorage.saveThread(thread);
        const cleanObjectiveNote = String(objectiveNote || '').trim();
        await this._publishSystemMessage(thread, `Job objective ${jobObjectiveStatusLabel(nextObjectiveStatus)}: ${jobObjectiveLabel(objective)}.${cleanObjectiveNote ? ` GM note: ${cleanObjectiveNote}` : ''}`, { eventType: 'job-objective-status-changed', objectiveId: objective.id, status: nextObjectiveStatus, note: cleanObjectiveNote });
        if (String(meta.job.status || '') === 'complete') {
          await this._applyJobFactionConsequences({ thread, status: 'complete', requesterId });
        }
        break;
      }
      case 'job-payout-distribution': {
        if (!isGm) return false;
        await this._gmDistributeJobCredits({ thread, amount, payoutMode, recipientId, recipientIds, partyFundCutPercent, requesterId, senderRecipientId });
        break;
      }
      case 'job-xp-payout': {
        if (!isGm) return false;
        await this._gmDistributeJobXp({ thread, amount, payoutMode, recipientId, recipientIds, requesterId, senderRecipientId });
        break;
      }
      case 'award-job-items': {
        if (!isGm) return false;
        const uuids = safeArray(itemUuids).length ? safeArray(itemUuids) : safeArray(meta.job?.rewardItemUuids);
        await this._gmAwardJobItems({ thread, recipientId, recipientIds, itemUuids: uuids, distributionMode, requesterId, senderRecipientId });
        break;
      }
      case 'gm-fail-trade':
      case 'gm-reopen-trade':
      case 'gm-mark-trade-reconciled':
      case 'gm-archive-trade':
      case 'gm-unarchive-trade': {
        await this._gmOverrideTradeConsoleState({ thread, recordId, action, memo, requesterId, senderRecipientId, requestId });
        break;
      }
      case 'accept-item-transfer':
      case 'approve-item-transfer':
      case 'decline-item-transfer':
      case 'cancel-item-transfer':
      case 'offer-item-counter':
      case 'accept-item-counter':
      case 'decline-item-counter': {
        await this._gmResolveItemTransfer({ thread, recordId, action, actorId, counterCredits, counterItemIds, counterMemo, requesterId, senderRecipientId, requestId });
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


  static async _applyJobFactionConsequences({ thread, status = '', requesterId = null } = {}) {
    const job = thread?.metadata?.job ?? null;
    if (!job) return [];
    const normalizedStatus = String(status || job.status || '').trim();
    if (!['complete', 'failed'].includes(normalizedStatus)) return [];
    const consequences = job.factionConsequences || job.relationshipConsequences || null;
    const factionName = String(consequences?.factionName || job.client?.factionName || '').trim();
    if (!factionName) return [];

    job.factionConsequences ??= consequences && typeof consequences === 'object' ? { ...consequences } : {};
    job.factionConsequences.applied ??= {};
    job.factionConsequences.reversed ??= {};

    const delta = this._jobFactionDeltaForStatus(job.factionConsequences, normalizedStatus);
    const currentAppliedStatus = this._currentAppliedJobFactionStatus(job.factionConsequences);
    if (currentAppliedStatus === normalizedStatus) return [];

    const existingFaction = FactionRegistryService.findFaction(factionName);
    const correctionResults = currentAppliedStatus
      ? await this._reverseJobFactionConsequences({ thread, fromStatus: currentAppliedStatus, toStatus: normalizedStatus, requesterId })
      : [];

    if (!delta) {
      job.factionConsequences.currentAppliedStatus = '';
      await HolonetStorage.saveThread(thread);
      if (correctionResults.length) await this._emitJobFactionSync({ thread, factionName, status: normalizedStatus, delta: 0, results: correctionResults, requesterId, autoCreated: false, correction: true });
      return correctionResults;
    }

    const results = await FactionRegistryService.applyJobConsequences({ thread, status: normalizedStatus, requesterId });
    const combinedResults = [...correctionResults, ...results];
    if (!combinedResults.length) return [];
    job.factionConsequences.applied[normalizedStatus] = {
      at: nowIso(),
      delta,
      correctionOf: currentAppliedStatus || ''
    };
    job.factionConsequences.currentAppliedStatus = normalizedStatus;
    await HolonetStorage.saveThread(thread);

    const autoCreated = !existingFaction && results.some(result => result.factionId);
    await this._emitJobFactionSync({ thread, factionName, status: normalizedStatus, delta, results: combinedResults, requesterId, autoCreated, correction: correctionResults.length > 0 });
    const summary = combinedResults.map(result => `${result.actorName}: ${result.before >= 0 ? '+' : ''}${result.before} → ${result.after >= 0 ? '+' : ''}${result.after}`).join('; ');
    if (autoCreated) ui.notifications?.warn?.(`Job faction "${factionName}" was not in the GM registry; it was created automatically.`);
    await this._publishSystemMessage(thread, `${autoCreated ? 'Created GM registry faction and updated' : correctionResults.length ? 'Corrected faction relationship and updated' : 'Faction relationship updated for'} ${factionName}: ${summary}.`, {
      eventType: 'job-faction-score-changed',
      factionName,
      factionIds: Array.from(new Set(combinedResults.map(result => result.factionId).filter(Boolean))),
      status: normalizedStatus,
      delta,
      affectedActorIds: Array.from(new Set(combinedResults.map(result => result.actorId).filter(Boolean))),
      autoCreated,
      correctedPriorStatus: currentAppliedStatus || '',
      requesterId
    });
    return combinedResults;
  }

  static _jobFactionDeltaForStatus(consequences = {}, status = '') {
    const normalizedStatus = String(status || '').trim();
    if (normalizedStatus === 'complete') return Number(consequences?.successDelta || 0) || 0;
    if (normalizedStatus === 'failed') return Number(consequences?.failureDelta || 0) || 0;
    return 0;
  }

  static _currentAppliedJobFactionStatus(consequences = {}) {
    const current = String(consequences?.currentAppliedStatus || '').trim();
    if (['complete', 'failed'].includes(current)) return current;
    const applied = consequences?.applied || {};
    const hasComplete = Boolean(applied.complete);
    const hasFailed = Boolean(applied.failed);
    if (hasComplete && !hasFailed) return 'complete';
    if (hasFailed && !hasComplete) return 'failed';
    return '';
  }

  static async _reverseJobFactionConsequences({ thread, fromStatus = '', toStatus = '', requesterId = null } = {}) {
    const job = thread?.metadata?.job ?? null;
    if (!job) return [];
    const consequences = job.factionConsequences || job.relationshipConsequences || {};
    const normalizedFrom = String(fromStatus || '').trim();
    if (!['complete', 'failed'].includes(normalizedFrom)) return [];
    const priorDelta = this._jobFactionDeltaForStatus(consequences, normalizedFrom);
    const factionName = String(consequences?.factionName || job.client?.factionName || '').trim();
    if (!factionName || !priorDelta) return [];
    const reason = `Correction: job status changed from ${this._jobStatusLabel(normalizedFrom)} to ${this._jobStatusLabel(toStatus)} for ${job.title || thread?.title || 'Holonet Job'}.`;
    const results = await FactionRegistryService.applyJobFactionDelta({
      thread,
      factionName,
      delta: -priorDelta,
      source: 'job',
      reason,
      requesterId,
      status: toStatus,
      metadata: { correction: true, reversedStatus: normalizedFrom }
    });
    if (results.length) {
      job.factionConsequences.reversed ??= {};
      job.factionConsequences.reversed[normalizedFrom] = { at: nowIso(), delta: -priorDelta, toStatus };
    }
    return results;
  }

  static async _emitJobFactionSync({ thread, factionName = '', status = '', delta = 0, results = [], requesterId = null, autoCreated = false, correction = false } = {}) {
    const factionIds = Array.from(new Set(results.map(result => result.factionId).filter(Boolean)));
    const actorIds = Array.from(new Set(results.map(result => result.actorId).filter(Boolean)));
    const syncPayload = {
      type: 'faction-score-changed',
      source: 'job-board',
      threadId: thread?.id,
      factionName,
      factionIds,
      actorIds,
      status,
      delta,
      requesterId,
      autoCreated,
      correction
    };
    Hooks.callAll('swseHolonetUpdated', syncPayload);
    HolonetSocketService.emitSync(syncPayload);
    return syncPayload;
  }

  static async _gmAtomicJobCreditPayout({ thread, amount, recipientId, targetActor = null, requesterId = null, senderRecipientId = null, partyFundCutPercent = null } = {}) {
    const value = parsePositiveCredits(amount);
    if (!value) return false;
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM || senderRecipientId?.startsWith('gm:'));
    if (!requesterIsGm) return false;

    if (recipientId === PARTY_FUND_RECIPIENT_ID) {
      const before = getPartyFundBalance();
      const atomic = await this._executeAtomicJobRewardSettlement({
        thread,
        actors: [],
        context: { rewardType: 'credits', payoutMode: 'party-fund', amount: value, requesterId },
        operation: async () => {
          await setPartyFundBalance(before + value);
          await appendPartyFundLedger({ type: 'job-payout-to-fund', amount: value, threadId: thread.id, requesterId });
          return { success: true, before, after: before + value };
        }
      });
      if (!atomic?.success) return false;
      await this._publishSystemMessage(thread, `Party Fund received ${formatCredits(value)} from Job Board. New balance: ${formatCredits(before + value)}.`, { eventType: 'party-fund-credit', amount: value });
      return true;
    }

    if (!targetActor) return false;
    let playerAmount = value;
    let fundAmount = 0;
    let pct = 0;
    if (isPartyFundEnabled()) {
      pct = partyFundCutPercent == null ? getPartyFundDefaultCutPercent() : Math.max(0, Math.min(100, Math.floor(Number(partyFundCutPercent) || 0)));
      fundAmount = Math.floor(value * pct / 100);
      playerAmount = value - fundAmount;
    }

    const fundBefore = getPartyFundBalance();
    const atomic = await this._executeAtomicJobRewardSettlement({
      thread,
      actors: [targetActor],
      context: { rewardType: 'credits', payoutMode: 'actor-with-party-cut', amount: value, playerAmount, fundAmount, targetActorId: targetActor.id, requesterId },
      operation: async () => {
        if (fundAmount > 0) {
          await setPartyFundBalance(fundBefore + fundAmount);
          await appendPartyFundLedger({ type: 'job-cut', amount: fundAmount, percent: pct, threadId: thread.id, targetActorId: targetActor.id, requesterId });
        }
        if (playerAmount > 0) {
          const credit = await TransactionEngine.executeCreditAdjustment({
            actor: targetActor,
            amount: playerAmount,
            reason: 'Holonet job payout',
            transactionContext: 'holonet-job-payout',
            audit: { source: 'holonet-job-payout', threadId: thread.id, requesterId }
          }, { source: 'HolonetMessengerService.atomicJobCreditPayout', validate: true, rederive: true });
          if (!credit?.success) throw new Error(credit?.error || 'Holonet job payout failed');
        }
        return { success: true, playerAmount, fundAmount };
      }
    });
    if (!atomic?.success) return false;

    const cutText = fundAmount > 0 ? ` ${formatCredits(fundAmount)} was routed to the Party Fund.` : '';
    await this._publishReceiptMessage(thread, { title: 'Job Payout Receipt', eventType: 'job-payout-receipt', amount: playerAmount, lines: [`To: ${targetActor.name}`, cutText.trim()].filter(Boolean) });
    await this._publishSystemMessage(thread, `Job Board paid ${formatCredits(playerAmount)} to ${targetActor.name}.${cutText}`, {
      eventType: 'job-payout',
      amount: playerAmount,
      partyFundCut: fundAmount,
      toActorId: targetActor.id,
      requesterId,
      senderRecipientId
    });
    return true;
  }


  static async _gmDistributeJobCredits({ thread, amount = 0, payoutMode = 'single', recipientId = '', recipientIds = [], partyFundCutPercent = 0, requesterId = null, senderRecipientId = null } = {}) {
    const value = parsePositiveCredits(amount);
    if (!value) return false;
    const mode = String(payoutMode || 'single');
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM || senderRecipientId?.startsWith('gm:'));
    if (!requesterIsGm) return false;

    const actorTargets = safeArray(thread?.participants)
      .filter(recipient => !String(recipient?.id || '').startsWith('gm:'))
      .filter(recipient => recipient?.actorId)
      .filter(recipient => !safeArray(recipientIds).length || safeArray(recipientIds).includes(recipient.id))
      .map(recipient => ({ recipient, actor: game.actors?.get(recipient.actorId) }))
      .filter(row => row.actor);

    if (mode === 'partyFund') {
      return this._gmAtomicJobCreditPayout({ thread, amount: value, recipientId: PARTY_FUND_RECIPIENT_ID, requesterId, senderRecipientId, partyFundCutPercent: 0 });
    }

    if (mode === 'single') {
      return this._gmTransferCredits({ thread, amount: value, recipientId, requesterId, senderRecipientId, asJobPayout: true, partyFundCutPercent });
    }

    if (!actorTargets.length) return false;
    const fundBefore = getPartyFundBalance();
    let fundAmount = 0;
    let perActorAmount = value;
    if (mode === 'splitEvenly') {
      perActorAmount = Math.floor(value / actorTargets.length);
    } else if (mode === 'splitWithPartyCut') {
      const pct = isPartyFundEnabled() ? Math.max(0, Math.min(100, Math.floor(Number(partyFundCutPercent) || 0))) : 0;
      fundAmount = Math.floor(value * pct / 100);
      perActorAmount = Math.floor((value - fundAmount) / actorTargets.length);
    } else if (mode === 'eachFull') {
      perActorAmount = value;
    } else {
      return false;
    }

    if (perActorAmount <= 0 && fundAmount <= 0) return false;
    const actors = actorTargets.map(row => row.actor);
    const atomic = await this._executeAtomicJobRewardSettlement({
      thread,
      actors,
      context: { rewardType: 'credits', payoutMode: mode, amount: value, perActorAmount, fundAmount, recipientCount: actors.length, requesterId },
      operation: async () => {
        if (fundAmount > 0) {
          await setPartyFundBalance(fundBefore + fundAmount);
          await appendPartyFundLedger({ type: 'job-cut', amount: fundAmount, percent: Math.max(0, Math.min(100, Math.floor(Number(partyFundCutPercent) || 0))), threadId: thread.id, requesterId, payoutMode: mode });
        }
        if (perActorAmount > 0) {
          for (const actor of actors) {
            const credit = await TransactionEngine.executeCreditAdjustment({
              actor,
              amount: perActorAmount,
              reason: 'Holonet job payout',
              transactionContext: 'holonet-job-payout',
              audit: { source: 'holonet-job-payout', threadId: thread.id, requesterId, payoutMode: mode }
            }, { source: 'HolonetMessengerService.distributeJobCredits', validate: true, rederive: true });
            if (!credit?.success) throw new Error(credit?.error || `Holonet job payout failed for ${actor.name}`);
          }
        }
        return { success: true, actors: actors.length, perActorAmount, fundAmount };
      }
    });
    if (!atomic?.success) return false;

    const targetNames = actors.map(actor => actor.name).join(', ');
    const fundText = fundAmount > 0 ? ` ${formatCredits(fundAmount)} was routed to the Party Fund.` : '';
    await this._publishReceiptMessage(thread, {
      title: 'Job Payout Receipt',
      eventType: 'job-payout-receipt',
      amount: perActorAmount,
      lines: [`Mode: ${mode}`, `Recipients: ${targetNames}`, perActorAmount > 0 ? `Each: ${formatCredits(perActorAmount)}` : '', fundText.trim()].filter(Boolean)
    });
    await this._publishSystemMessage(thread, `Job Board distributed ${formatCredits(value)} using ${mode}.${perActorAmount > 0 ? ` ${actors.length} recipient(s) received ${formatCredits(perActorAmount)} each.` : ''}${fundText}`, {
      eventType: 'job-payout-distribution',
      amount: value,
      payoutMode: mode,
      perActorAmount,
      partyFundCut: fundAmount,
      recipientActorIds: actors.map(actor => actor.id),
      requesterId,
      senderRecipientId
    });
    return true;
  }

  static _resolveJobActorTargets(thread, recipientIds = []) {
    const allowedIds = safeArray(recipientIds).map(String).filter(Boolean);
    const restrict = allowedIds.length > 0;
    const rows = safeArray(thread?.participants)
      .filter(recipient => !String(recipient?.id || '').startsWith('gm:'))
      .filter(recipient => recipient?.actorId)
      .filter(recipient => !restrict || allowedIds.includes(recipient.id))
      .map(recipient => ({ recipient, actor: game.actors?.get(recipient.actorId) }))
      .filter(row => row.actor);
    return Array.from(new Map(rows.map(row => [row.actor.id, row])).values());
  }

  static async _gmDistributeJobXp({ thread, amount = 0, payoutMode = 'single', recipientId = '', recipientIds = [], requesterId = null, senderRecipientId = null } = {}) {
    const value = Math.max(0, Math.floor(Number(amount) || 0));
    if (!value) return false;
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM || senderRecipientId?.startsWith('gm:'));
    if (!requesterIsGm) return false;

    const mode = String(payoutMode || 'single');
    let targetRows = [];
    let perActorAmount = value;
    if (mode === 'single') {
      const recipient = this._recipientFromStableId(recipientId);
      const actor = recipient?.actorId ? game.actors?.get(recipient.actorId) : null;
      if (!actor) return false;
      targetRows = [{ recipient, actor }];
    } else {
      targetRows = this._resolveJobActorTargets(thread, recipientIds);
      if (!targetRows.length) return false;
      if (mode === 'splitEvenly') perActorAmount = Math.floor(value / targetRows.length);
      else if (mode === 'eachFull') perActorAmount = value;
      else return false;
    }
    if (perActorAmount <= 0) return false;

    const actors = targetRows.map(row => row.actor);
    const atomic = await this._executeAtomicJobRewardSettlement({
      thread,
      actors,
      context: { rewardType: 'xp', payoutMode: mode, amount: value, perActorAmount, recipientCount: actors.length, requesterId },
      operation: async () => {
        for (const actor of actors) {
          const result = await applyXP(actor, perActorAmount);
          if (!result) throw new Error(`XP payout failed for ${actor.name}`);
        }
        return { success: true, actors: actors.length, perActorAmount };
      }
    });
    if (!atomic?.success) return false;

    const targetNames = actors.map(actor => actor.name).join(', ');
    await this._publishReceiptMessage(thread, {
      title: 'Job XP Receipt',
      eventType: 'job-xp-receipt',
      amount: perActorAmount,
      lines: [`Mode: ${mode}`, `Recipients: ${targetNames}`, `Each: ${perActorAmount.toLocaleString()} XP`]
    });
    await this._publishSystemMessage(thread, `Job Board awarded ${perActorAmount.toLocaleString()} XP to ${actors.length} recipient(s).`, {
      eventType: 'job-xp-payout',
      amount: value,
      payoutMode: mode,
      perActorAmount,
      recipientActorIds: actors.map(actor => actor.id),
      requesterId,
      senderRecipientId
    });
    return true;
  }

  static async _resolveJobItemGrantDocuments({ thread, itemUuids = [], requesterId = null, source = 'holonet-job-item-payout' } = {}) {
    const createData = [];
    const createdNames = [];
    const errors = [];
    for (const uuid of safeArray(itemUuids).map(String).filter(Boolean)) {
      try {
        const item = await fromUuid(uuid);
        if (!item) {
          errors.push(`Item could not be resolved: ${uuid}`);
          continue;
        }
        const data = item.toObject ? item.toObject() : foundry.utils.deepClone(item);
        delete data._id;
        data.flags ??= {};
        data.flags.swse ??= {};
        data.flags.swse.holonetGrant = { source, threadId: thread?.id ?? null, uuid, grantedAt: nowIso(), requesterId };
        createData.push(data);
        createdNames.push(item.name || data.name || 'Item');
      } catch (err) {
        errors.push(`Item grant resolution failed for ${uuid}: ${err?.message || err}`);
        console.warn('[Holonet] Failed resolving item grant', uuid, err);
      }
    }
    return { createData, createdNames, errors };
  }

  static async _gmAwardJobItems({ thread, recipientId, recipientIds = [], itemUuids = [], distributionMode = 'single-copy', requesterId = null, senderRecipientId = null } = {}) {
    const requestedUuids = safeArray(itemUuids).map(String).filter(Boolean);
    if (!requestedUuids.length) return false;
    const mode = String(distributionMode || 'single-copy');
    const resolved = await this._resolveJobItemGrantDocuments({ thread, itemUuids: requestedUuids, requesterId, source: 'holonet-job-item-payout' });
    if (!resolved.createData.length || resolved.errors.length) {
      await this._publishSystemMessage(thread, `Job item payout failed: ${resolved.errors.join('; ') || 'No item rewards could be resolved.'}`, { eventType: 'job-item-payout-failed', errors: resolved.errors });
      return false;
    }

    let targetRows = [];
    let plans = [];
    if (mode === 'single-copy') {
      const recipient = this._recipientFromStableId(recipientId);
      const actor = recipient?.actorId ? game.actors?.get(recipient.actorId) : null;
      if (!actor) return false;
      targetRows = [{ recipient, actor }];
      plans = [{ actor, items: resolved.createData.map(item => foundry.utils.deepClone(item)), names: resolved.createdNames.slice() }];
    } else {
      targetRows = this._resolveJobActorTargets(thread, recipientIds);
      if (!targetRows.length) return false;
      if (mode === 'all-selected') {
        plans = targetRows.map(({ actor }) => ({
          actor,
          items: resolved.createData.map(item => foundry.utils.deepClone(item)),
          names: resolved.createdNames.slice()
        }));
      } else if (mode === 'round-robin-unique') {
        if (resolved.createData.length < targetRows.length) {
          await this._publishSystemMessage(thread, `Job item payout failed: ${resolved.createData.length} unique item(s) cannot cover ${targetRows.length} recipient(s).`, { eventType: 'job-item-payout-failed', itemCount: resolved.createData.length, recipientCount: targetRows.length });
          return false;
        }
        plans = targetRows.map(({ actor }, index) => ({
          actor,
          items: [foundry.utils.deepClone(resolved.createData[index])],
          names: [resolved.createdNames[index]]
        }));
      } else {
        return false;
      }
    }

    const actors = plans.map(plan => plan.actor);
    const atomic = await this._executeAtomicJobRewardSettlement({
      thread,
      actors,
      context: { rewardType: 'items', distributionMode: mode, itemCount: resolved.createData.length, recipientCount: actors.length, requesterId },
      operation: async () => {
        for (const plan of plans) {
          if (!plan.items.length) continue;
          await ActorEngine.createEmbeddedDocuments(plan.actor, 'Item', plan.items, { source: 'holonet-job-item-payout' });
        }
        return { success: true, actors: actors.length, items: plans.reduce((sum, plan) => sum + plan.items.length, 0) };
      }
    });
    if (!atomic?.success) return false;

    const summaryLines = plans.map(plan => `${plan.actor.name}: ${plan.names.join(', ')}`);
    await this._publishReceiptMessage(thread, {
      title: 'Job Item Delivery Receipt',
      eventType: 'job-item-payout',
      lines: [`Mode: ${mode}`, ...summaryLines]
    });
    await this._publishSystemMessage(thread, `Job Board delivered item rewards to ${actors.length} recipient(s).`, {
      eventType: 'job-item-payout',
      distributionMode: mode,
      recipientActorIds: actors.map(actor => actor.id),
      itemNames: resolved.createdNames,
      requesterId,
      senderRecipientId
    });
    return true;
  }

  static async _gmTransferCredits({ actorId, thread, amount, recipientId, requesterId = null, senderRecipientId = null, asJobPayout = false, partyFundCutPercent = null } = {}) {
    const value = parsePositiveCredits(amount);
    if (!value) return false;
    const recipient = recipientId === PARTY_FUND_RECIPIENT_ID ? null : this._recipientFromStableId(recipientId);
    const targetActor = recipient?.actorId ? game.actors?.get(recipient.actorId) : null;
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM || senderRecipientId?.startsWith('gm:'));

    if (asJobPayout && requesterIsGm) {
      return this._gmAtomicJobCreditPayout({ thread, amount: value, recipientId, targetActor, requesterId, senderRecipientId, partyFundCutPercent });
    }

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

  static _getTradeTransferFromMessage(message = {}) {
    const meta = message?.metadata ?? {};
    if (meta.creditTransfer) return { type: 'credit', key: 'creditTransfer', transfer: meta.creditTransfer };
    if (meta.itemTransfer) return { type: 'item', key: 'itemTransfer', transfer: meta.itemTransfer };
    if (meta.assetTransfer) return { type: 'asset', key: 'assetTransfer', transfer: meta.assetTransfer };
    return null;
  }

  static async _gmOverrideTradeConsoleState({ thread, recordId, action, memo = '', requesterId = null, senderRecipientId = null, requestId = null } = {}) {
    if (!recordId || !game.user?.isGM && !(requesterId && game.users?.get(requesterId)?.isGM) && !senderRecipientId?.startsWith('gm:')) return false;
    const message = await HolonetStorage.getRecord(recordId);
    const trade = this._getTradeTransferFromMessage(message);
    if (!message || !trade?.transfer) return false;
    const { type, transfer } = trade;
    const currentStatus = String(transfer.status || 'pendingRecipient');
    const note = String(memo || '').trim();
    const now = nowIso();
    const userId = requesterId || game.user?.id || null;

    this._tradeLifecycleLog('warn', 'GM trade console override requested.', transfer, {
      phase: 'gm-console.override.requested',
      threadId: thread?.id ?? null,
      action,
      currentStatus,
      notePresent: Boolean(note),
      requestId
    });

    if (action === 'gm-archive-trade') {
      transfer.gmArchived = true;
      transfer.tradeConsoleArchived = true;
      transfer.tradeConsoleArchivedAt = now;
      transfer.tradeConsoleArchivedBy = userId;
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `GM archived ${type} trade diagnostic ${transfer.id || recordId} from the Trade Console.`, { eventType: 'trade-console-archived', transferId: transfer.id, recordId });
      return true;
    }

    if (action === 'gm-unarchive-trade') {
      transfer.gmArchived = false;
      transfer.tradeConsoleArchived = false;
      transfer.tradeConsoleRestoredAt = now;
      transfer.tradeConsoleRestoredBy = userId;
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `GM restored ${type} trade diagnostic ${transfer.id || recordId} to the Trade Console.`, { eventType: 'trade-console-unarchived', transferId: transfer.id, recordId });
      return true;
    }

    if (action === 'gm-fail-trade') {
      if (['complete', 'cancelled', 'declined'].includes(currentStatus)) return false;
      transfer.status = 'failed';
      transfer.failureReason = note || 'Marked failed by GM from the Trade Console.';
      transfer.resolvedAt = now;
      transfer.resolvedBy = senderRecipientId || currentRecipientId();
      transfer.tradeConsoleOverride = { action, at: now, by: userId, previousStatus: currentStatus, note: transfer.failureReason };
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `GM marked ${type} trade ${transfer.id || recordId} failed: ${transfer.failureReason}`, { eventType: 'trade-console-force-failed', transferId: transfer.id, recordId, previousStatus: currentStatus });
      return true;
    }

    if (action === 'gm-reopen-trade') {
      if (currentStatus !== 'failed') return false;
      const nextStatus = transfer.approvalRequired ? 'pendingGm' : 'pendingRecipient';
      transfer.status = nextStatus;
      transfer.reopenedAt = now;
      transfer.reopenedBy = userId;
      transfer.previousFailureReason = transfer.failureReason ?? null;
      transfer.failureReason = null;
      transfer.resolvedAt = null;
      transfer.resolvedBy = null;
      transfer.tradeConsoleOverride = { action, at: now, by: userId, previousStatus: currentStatus, nextStatus, note };
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `GM reopened ${type} trade ${transfer.id || recordId} as ${transferStatusLabel(nextStatus)}${note ? `: ${note}` : ''}.`, { eventType: 'trade-console-reopened', transferId: transfer.id, recordId, previousStatus: currentStatus, nextStatus });
      return true;
    }

    if (action === 'gm-mark-trade-reconciled') {
      if (currentStatus !== 'failed') return false;
      transfer.tradeConsoleReconciled = true;
      transfer.manualReconciliationStatus = 'reconciled';
      transfer.manualReconciledAt = now;
      transfer.manualReconciledBy = userId;
      transfer.manualReconciliationNote = note;
      transfer.rollbackOk = transfer.rollbackOk ?? true;
      transfer.tradeConsoleOverride = { action, at: now, by: userId, previousStatus: currentStatus, note };
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `GM marked ${type} trade ${transfer.id || recordId} manually reconciled${note ? `: ${note}` : ''}.`, { eventType: 'trade-console-reconciled', transferId: transfer.id, recordId, previousStatus: currentStatus, note });
      return true;
    }

    return false;
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
    await MessengerNotificationBridge.publishActionNotice({ thread, sourceRecord: message, title: 'Asset Transfer Offered', body: message.body, eventType: 'asset-transfer-offered', recipients: [this._recipientFromStableId(transfer.toRecipientId)].filter(Boolean) });
    this._emitMessengerSync(this._threadSyncPayload(thread.id, { messageId: message.id, requestId, requesterId }));
    return { threadId: thread.id, messageId: message.id };
  }

  static async _gmResolveItemTransfer({ thread, recordId, action, actorId = null, counterCredits = 0, counterItemIds = [], counterMemo = '', requesterId = null, senderRecipientId = null, requestId = null } = {}) {
    if (!recordId) return false;
    const message = await HolonetStorage.getRecord(recordId);
    const transfer = message?.metadata?.itemTransfer;
    if (!message || !transfer) return false;
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM || senderRecipientId?.startsWith('gm:'));
    const currentId = senderRecipientId || currentRecipientId();
    this._tradeLifecycleLog('debug', 'GM/item transfer resolver action received.', transfer, {
      phase: 'resolver.item.action',
      threadId: thread?.id ?? null,
      action,
      requesterId,
      senderRecipientId,
      currentId,
      requesterIsGm
    });
    if (['complete', 'declined', 'cancelled', 'failed'].includes(transfer.status)) {
      this._tradeLifecycleLog('warn', 'Item transfer resolver rejected action because transfer is already terminal.', transfer, {
        phase: 'resolver.item.terminal-reject',
        threadId: thread?.id ?? null,
        action,
        currentId
      });
      return false;
    }

    if (action === 'offer-item-counter') {
      if (!requesterIsGm && currentId !== transfer.toRecipientId) return false;
      if (transfer.status !== 'pendingRecipient') return false;
      const sourceActor = transfer.toActorId ? game.actors?.get(transfer.toActorId) : null;
      const items = this._buildCounterItemEntries(sourceActor, counterItemIds);
      const credits = parsePositiveCredits(counterCredits);
      const memo = String(counterMemo || '').trim();
      if (!credits && !items.length && !memo) return false;
      transfer.counterOffer = {
        credits,
        items,
        assets: [],
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
      await this._publishSystemMessage(thread, `${transfer.toLabel} counter-offered ${parts.join(' + ') || 'alternate terms'} for ${safeArray(transfer.items).map(item => item.name).join(', ') || 'an item transfer'}.`, { eventType: 'item-counter-offered', transferId: transfer.id });
      return true;
    }

    if (action === 'decline-item-counter') {
      if (transfer.status !== 'counterOffered') return false;
      if (!requesterIsGm && currentId !== transfer.fromRecipientId && currentId !== transfer.toRecipientId) return false;
      transfer.status = 'pendingRecipient';
      transfer.counterDeclinedAt = nowIso();
      transfer.counterDeclinedBy = currentId;
      await HolonetStorage.saveRecord(message);
      await this._publishSystemMessage(thread, `Counter offer for ${safeArray(transfer.items).map(item => item.name).join(', ') || 'item transfer'} was declined. Original item offer is still awaiting recipient action.`, { eventType: 'item-counter-declined', transferId: transfer.id });
      return true;
    }

    if (action === 'accept-item-counter') {
      if (transfer.status !== 'counterOffered') return false;
      if (!requesterIsGm && currentId !== transfer.fromRecipientId) return false;
      return this._completeItemCounterOffer({ thread, message, transfer, requesterId, resolvedBy: currentId });
    }

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
    if (!requesterIsGm && currentId !== transfer.toRecipientId) {
      this._tradeLifecycleLog('warn', 'Item transfer accept rejected by permission check.', transfer, {
        phase: 'resolver.item.accept.permission-reject',
        threadId: thread?.id ?? null,
        action,
        currentId,
        expectedRecipientId: transfer.toRecipientId,
        requesterIsGm
      });
      return false;
    }
    this._tradeLifecycleLog('info', 'Item transfer accept requested; settlement path beginning.', transfer, {
      phase: 'resolver.item.accept.start',
      threadId: thread?.id ?? null,
      currentId,
      requesterId
    });
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
    this._tradeLifecycleLog(ok ? 'info' : 'warn', ok ? 'Item transfer resolved complete.' : 'Item transfer resolved failed.', transfer, {
      phase: ok ? 'resolver.item.accept.complete' : 'resolver.item.accept.failed',
      threadId: thread?.id ?? null,
      currentId,
      failureReason: transfer.failureReason ?? null
    });
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
    this._tradeLifecycleLog('debug', 'Restoring actor snapshot for atomic rollback.', {}, {
      phase: 'rollback.actor.start',
      source,
      actorId: actor.id,
      actorName: actor.name,
      restoreItemCount: safeArray(data.items).length,
      restoreEffectCount: safeArray(data.effects).length
    });

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
      this._tradeLifecycleLog('debug', 'Rollback deleting current actor items before restore.', {}, {
        phase: 'rollback.actor.items.delete-current',
        source,
        actorId: actor.id,
        count: currentItemIds.length
      });
      await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', currentItemIds, { source, skipValidation: true, rederive: false, suppressAppRefresh: true });
    }
    const itemsToRestore = safeArray(data.items).map(item => foundry.utils.deepClone(item));
    if (itemsToRestore.length) {
      this._tradeLifecycleLog('debug', 'Rollback recreating actor items from snapshot.', {}, {
        phase: 'rollback.actor.items.restore',
        source,
        actorId: actor.id,
        count: itemsToRestore.length
      });
      await ActorEngine.createEmbeddedDocuments(actor, 'Item', itemsToRestore, { source, skipValidation: true, rederive: false, suppressAppRefresh: true });
    }

    const currentEffectIds = actor.effects?.map?.(effect => effect.id) ?? [];
    if (currentEffectIds.length) {
      this._tradeLifecycleLog('debug', 'Rollback deleting current active effects before restore.', {}, {
        phase: 'rollback.actor.effects.delete-current',
        source,
        actorId: actor.id,
        count: currentEffectIds.length
      });
      await ActorEngine.deleteEmbeddedDocuments(actor, 'ActiveEffect', currentEffectIds, { source, skipValidation: true, rederive: false, suppressAppRefresh: true });
    }
    const effectsToRestore = safeArray(data.effects).map(effect => foundry.utils.deepClone(effect));
    if (effectsToRestore.length) {
      this._tradeLifecycleLog('debug', 'Rollback recreating active effects from snapshot.', {}, {
        phase: 'rollback.actor.effects.restore',
        source,
        actorId: actor.id,
        count: effectsToRestore.length
      });
      await ActorEngine.createEmbeddedDocuments(actor, 'ActiveEffect', effectsToRestore, { source, skipValidation: true, rederive: false, suppressAppRefresh: true });
    }
    await ActorEngine.recalcAll?.(actor);
    this._tradeLifecycleLog('debug', 'Actor snapshot restore complete.', {}, {
      phase: 'rollback.actor.complete',
      source,
      actorId: actor.id,
      actorName: actor.name
    });
    return true;
  }

  static async _restoreTradeSnapshots(snapshots = [], options = {}) {
    const ordered = safeArray(snapshots).slice().reverse();
    this._tradeLifecycleLog('warn', 'Restoring atomic trade snapshots in reverse order.', {}, {
      phase: 'rollback.snapshots.start',
      count: ordered.length,
      actorIds: ordered.map(snapshot => snapshot.actorId),
      actorNames: ordered.map(snapshot => snapshot.actorName)
    });
    for (const snapshot of ordered) {
      await this._restoreTradeSnapshot(snapshot, options);
    }
    this._tradeLifecycleLog('warn', 'All atomic trade snapshots restored.', {}, {
      phase: 'rollback.snapshots.complete',
      count: ordered.length
    });
    return true;
  }

  static _preflightTradeSettlement(transfer = {}, { includeCounter = false, suppressRequestedCredits = false } = {}) {
    this._tradeLifecycleLog('debug', 'Trade settlement preflight evaluating transfer.', transfer, {
      phase: 'preflight.evaluate',
      includeCounter,
      suppressRequestedCredits
    });

    const fail = error => {
      this._tradeLifecycleLog('warn', 'Trade settlement preflight failed.', transfer, {
        phase: 'preflight.failed',
        includeCounter,
        suppressRequestedCredits,
        error
      });
      return { ok: false, error };
    };

    if (transfer.kind === 'ownedAssetTransfer') {
      const assetValidation = this._validateOwnedAssetTransfer(transfer);
      if (!assetValidation.ok) return fail(assetValidation.error);
    } else if (transfer.kind === 'ownedItemTransfer') {
      const itemValidation = this._validateOwnedItemTransfer(transfer);
      if (!itemValidation.ok) return fail(itemValidation.error);
    }

    if (!suppressRequestedCredits) {
      const requestedCredits = parsePositiveCredits(transfer?.trade?.requestedCredits);
      if (requestedCredits) {
        const payer = transfer.toActorId ? game.actors?.get(transfer.toActorId) : null;
        const payee = transfer.fromActorId ? game.actors?.get(transfer.fromActorId) : null;
        if (!payer || !payee) return fail('Trade credit actors could not be resolved.');
        if (creditsOf(payer) < requestedCredits) return fail(`${payer.name} does not have ${formatCredits(requestedCredits)} available for this trade.`);
        this._tradeLifecycleLog('debug', 'Requested credit preflight passed.', transfer, {
          phase: 'preflight.requested-credits.ok',
          payerActorId: payer.id,
          payeeActorId: payee.id,
          amount: requestedCredits,
          payerBalance: creditsOf(payer)
        });
      }
    }

    if (includeCounter && transfer?.counterOffer) {
      const counterCredits = parsePositiveCredits(transfer.counterOffer.credits);
      if (counterCredits) {
        const payer = transfer.toActorId ? game.actors?.get(transfer.toActorId) : null;
        const payee = transfer.fromActorId ? game.actors?.get(transfer.fromActorId) : null;
        if (!payer || !payee) return fail('Counter-offer credit actors could not be resolved.');
        if (creditsOf(payer) < counterCredits) return fail(`${payer.name} does not have ${formatCredits(counterCredits)} available for this counter-offer.`);
        this._tradeLifecycleLog('debug', 'Counter credit preflight passed.', transfer, {
          phase: 'preflight.counter-credits.ok',
          payerActorId: payer.id,
          payeeActorId: payee.id,
          amount: counterCredits,
          payerBalance: creditsOf(payer)
        });
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
        if (!itemValidation.ok) return fail(itemValidation.error);
        this._tradeLifecycleLog('debug', 'Counter item preflight passed.', transfer, {
          phase: 'preflight.counter-items.ok',
          count: safeArray(transfer.counterOffer.items).length
        });
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
        if (!assetValidation.ok) return fail(assetValidation.error);
        this._tradeLifecycleLog('debug', 'Counter asset preflight passed.', transfer, {
          phase: 'preflight.counter-assets.ok',
          count: safeArray(transfer.counterOffer.assets).length
        });
      }
    }

    this._tradeLifecycleLog('debug', 'Trade settlement preflight passed.', transfer, {
      phase: 'preflight.ok',
      includeCounter,
      suppressRequestedCredits
    });
    return { ok: true };
  }

  static async _executeAtomicTradeSettlement({ thread, transfer, actors = [], preflight = null, operation = null, failureEventType = 'trade-atomic-failed', failurePrefix = 'Trade settlement failed' } = {}) {
    this._tradeLifecycleLog('debug', 'Atomic settlement requested.', transfer, {
      phase: 'atomic.requested',
      threadId: thread?.id ?? null,
      actorInputCount: safeArray(actors).length,
      failureEventType,
      failurePrefix
    });
    this._appendTradeAtomicEvent(transfer, { phase: 'atomic.requested', status: 'started', message: 'Atomic settlement requested.', threadId: thread?.id ?? null });

    if (typeof operation !== 'function') {
      const error = 'No trade settlement operation was provided.';
      this._tradeLifecycleError(error, transfer, new Error(error), { phase: 'atomic.no-operation', threadId: thread?.id ?? null, failureEventType });
      this._appendTradeAtomicEvent(transfer, { phase: 'atomic.no-operation', status: 'failed', message: error, error, threadId: thread?.id ?? null });
      return { success: false, error };
    }

    let validation = { ok: true };
    try {
      this._tradeLifecycleLog('debug', 'Atomic preflight starting.', transfer, { phase: 'atomic.preflight.start', threadId: thread?.id ?? null });
      this._appendTradeAtomicEvent(transfer, { phase: 'atomic.preflight.start', status: 'started', message: 'Preflight validation started.', threadId: thread?.id ?? null });
      validation = typeof preflight === 'function' ? preflight() : { ok: true };
    } catch (err) {
      validation = { ok: false, error: err?.message || 'Trade preflight threw an exception.' };
      this._tradeLifecycleError('Atomic preflight threw an exception.', transfer, err, { phase: 'atomic.preflight.exception', threadId: thread?.id ?? null });
      this._appendTradeAtomicEvent(transfer, { phase: 'atomic.preflight.exception', status: 'failed', message: 'Preflight threw an exception.', error: validation.error, threadId: thread?.id ?? null, preflight: true, rollbackOk: true });
    }

    if (!validation?.ok) {
      const error = validation?.error || 'Trade preflight failed.';
      this._tradeLifecycleLog('warn', 'Atomic preflight failed. No mutation will be attempted.', transfer, {
        phase: 'atomic.preflight.failed',
        threadId: thread?.id ?? null,
        error
      });
      this._appendTradeAtomicEvent(transfer, { phase: 'atomic.preflight.failed', status: 'failed', message: 'Preflight failed before mutation.', error, threadId: thread?.id ?? null, rollbackOk: true, preflight: true });
      if (thread && transfer) {
        await this._publishSystemMessage(thread, `${failurePrefix}: ${error}. No trade state was changed.`, { eventType: failureEventType, transferId: transfer.id, rollbackOk: true, preflight: true });
      }
      return { success: false, error, rollbackOk: true, preflight: true };
    }

    this._tradeLifecycleLog('debug', 'Atomic preflight passed.', transfer, { phase: 'atomic.preflight.ok', threadId: thread?.id ?? null });
    this._appendTradeAtomicEvent(transfer, { phase: 'atomic.preflight.ok', status: 'passed', message: 'Preflight validation passed.', threadId: thread?.id ?? null });
    const actorList = safeArray(actors).filter(actor => actor?.id);
    const uniqueActors = Array.from(new Map(actorList.map(actor => [actor.id, actor])).values());
    this._tradeLifecycleLog('debug', 'Capturing atomic rollback snapshots.', transfer, {
      phase: 'atomic.snapshot.start',
      threadId: thread?.id ?? null,
      actorCount: uniqueActors.length,
      actorIds: uniqueActors.map(actor => actor.id),
      actorNames: uniqueActors.map(actor => actor.name)
    });
    const snapshots = uniqueActors.map(actor => this._tradeSnapshotRoot(actor));
    this._tradeLifecycleLog('debug', 'Atomic rollback snapshots captured.', transfer, {
      phase: 'atomic.snapshot.complete',
      threadId: thread?.id ?? null,
      snapshotCount: snapshots.length
    });
    this._appendTradeAtomicEvent(transfer, { phase: 'atomic.snapshot.complete', status: 'captured', message: 'Rollback snapshots captured.', threadId: thread?.id ?? null, snapshotCount: snapshots.length, actorIds: uniqueActors.map(actor => actor.id) });

    try {
      this._tradeLifecycleLog('info', 'Atomic settlement operation starting.', transfer, { phase: 'atomic.operation.start', threadId: thread?.id ?? null });
      this._appendTradeAtomicEvent(transfer, { phase: 'atomic.operation.start', status: 'started', message: 'Settlement mutation started.', threadId: thread?.id ?? null, snapshotCount: snapshots.length });
      const result = await operation();
      if (result === false || result?.success === false) {
        throw new Error(result?.error || 'Trade settlement operation returned failure.');
      }
      this._tradeLifecycleLog('info', 'Atomic settlement operation completed successfully.', transfer, {
        phase: 'atomic.operation.success',
        threadId: thread?.id ?? null,
        snapshotCount: snapshots.length,
        resultSummary: result === true ? 'true' : result
      });
      this._appendTradeAtomicEvent(transfer, { phase: 'atomic.operation.success', status: 'complete', message: 'Settlement mutation completed.', threadId: thread?.id ?? null, snapshotCount: snapshots.length });
      return { success: true, result, snapshots: snapshots.length };
    } catch (err) {
      this._tradeLifecycleError('Atomic settlement operation failed; rollback beginning.', transfer, err, {
        phase: 'atomic.operation.failed',
        threadId: thread?.id ?? null,
        snapshotCount: snapshots.length
      });
      this._appendTradeAtomicEvent(transfer, { phase: 'atomic.operation.failed', status: 'failed', message: 'Settlement mutation failed; rollback required.', error: err?.message || 'Unknown operation failure.', threadId: thread?.id ?? null, snapshotCount: snapshots.length });

      let rollbackOk = false;
      let rollbackError = null;
      try {
        this._tradeLifecycleLog('warn', 'Atomic rollback starting.', transfer, {
          phase: 'atomic.rollback.start',
          threadId: thread?.id ?? null,
          snapshotCount: snapshots.length
        });
        this._appendTradeAtomicEvent(transfer, { phase: 'atomic.rollback.start', status: 'started', message: 'Rollback started.', threadId: thread?.id ?? null, snapshotCount: snapshots.length });
        await this._restoreTradeSnapshots(snapshots, { source: 'HolonetMessengerService.atomicTradeRollback' });
        rollbackOk = true;
        this._tradeLifecycleLog('warn', 'Atomic rollback completed successfully.', transfer, {
          phase: 'atomic.rollback.success',
          threadId: thread?.id ?? null,
          snapshotCount: snapshots.length
        });
        this._appendTradeAtomicEvent(transfer, { phase: 'atomic.rollback.success', status: 'complete', message: 'Rollback completed successfully.', threadId: thread?.id ?? null, snapshotCount: snapshots.length, rollbackOk: true });
      } catch (restoreErr) {
        rollbackError = restoreErr;
        this._tradeLifecycleError('Atomic rollback failed. Manual GM reconciliation may be required.', transfer, restoreErr, {
          phase: 'atomic.rollback.failed',
          threadId: thread?.id ?? null,
          snapshotCount: snapshots.length,
          originalError: err?.message ?? null
        });
        this._appendTradeAtomicEvent(transfer, { phase: 'atomic.rollback.failed', status: 'failed', message: 'Rollback failed; manual GM reconciliation required.', error: restoreErr?.message || 'Unknown rollback failure.', threadId: thread?.id ?? null, snapshotCount: snapshots.length, rollbackOk: false });
      }

      const baseError = err?.message || 'Unknown trade settlement failure.';
      const message = rollbackOk
        ? `${failurePrefix}: ${baseError}. All trade state was restored.`
        : `${failurePrefix}: ${baseError}. Rollback failed: ${rollbackError?.message || 'unknown rollback failure'}.`;
      if (thread && transfer) {
        try {
          await this._publishSystemMessage(thread, message, { eventType: failureEventType, transferId: transfer.id, rollbackOk, rollbackError: rollbackError?.message ?? null, originalError: baseError });
        } catch (publishErr) {
          this._tradeLifecycleError('Failed to publish atomic failure system message.', transfer, publishErr, {
            phase: 'atomic.failure-message.failed',
            threadId: thread?.id ?? null,
            originalError: baseError,
            rollbackOk
          });
        }
      }
      return { success: false, error: message, rollbackOk, rollbackError: rollbackError?.message ?? null };
    }
  }

  static _validateOwnedItemTransfer(transfer = {}) {
    this._tradeLifecycleLog('debug', 'Validating owned item transfer.', transfer, { phase: 'validate.items.start' });
    const sourceActor = transfer.fromActorId ? game.actors?.get(transfer.fromActorId) : null;
    const targetActor = transfer.toActorId ? game.actors?.get(transfer.toActorId) : null;
    if (!sourceActor || !targetActor) {
      const error = 'Item transfer actors could not be resolved.';
      this._tradeLifecycleLog('warn', 'Owned item transfer validation failed.', transfer, { phase: 'validate.items.failed', error });
      return { ok: false, error };
    }
    for (const entry of safeArray(transfer.items)) {
      const sourceItem = sourceActor.items?.get?.(entry.itemId) ?? sourceActor.items?.find?.(item => item.id === entry.itemId || item._id === entry.itemId);
      if (!sourceItem) {
        const error = `${entry.name || 'Item'} is no longer on ${sourceActor.name}.`;
        this._tradeLifecycleLog('warn', 'Owned item transfer validation failed: missing item.', transfer, {
          phase: 'validate.items.missing-item',
          error,
          sourceActorId: sourceActor.id,
          itemId: entry.itemId,
          itemName: entry.name ?? null
        });
        return { ok: false, error };
      }
      const sourceQty = getItemQuantity(sourceItem);
      const requestedQty = Math.max(1, normalizeQuantity(entry.quantity, 1));
      if (sourceQty < requestedQty) {
        const error = `${sourceActor.name} no longer has enough ${sourceItem.name}.`;
        this._tradeLifecycleLog('warn', 'Owned item transfer validation failed: insufficient quantity.', transfer, {
          phase: 'validate.items.insufficient-quantity',
          error,
          sourceActorId: sourceActor.id,
          itemId: sourceItem.id,
          itemName: sourceItem.name,
          sourceQty,
          requestedQty
        });
        return { ok: false, error };
      }
    }
    this._tradeLifecycleLog('debug', 'Owned item transfer validation passed.', transfer, {
      phase: 'validate.items.ok',
      sourceActorId: sourceActor.id,
      targetActorId: targetActor.id,
      count: safeArray(transfer.items).length
    });
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
    this._tradeLifecycleLog('debug', 'Validating owned asset transfer.', transfer, { phase: 'validate.assets.start' });
    const sourceActor = transfer.fromActorId ? game.actors?.get(transfer.fromActorId) : null;
    const targetActor = transfer.toActorId ? game.actors?.get(transfer.toActorId) : null;
    if (!sourceActor || !targetActor) {
      const error = 'Asset transfer actors could not be resolved.';
      this._tradeLifecycleLog('warn', 'Owned asset transfer validation failed.', transfer, { phase: 'validate.assets.failed', error });
      return { ok: false, error };
    }
    const assets = safeArray(transfer.assets)
      .map(entry => game.actors?.get(String(entry?.id || entry?.uuid || '').replace(/^Actor\./, '')))
      .filter(Boolean);
    if (!assets.length) {
      const error = 'No valid ship/droid asset was selected.';
      this._tradeLifecycleLog('warn', 'Owned asset transfer validation failed: no valid assets.', transfer, { phase: 'validate.assets.none', error });
      return { ok: false, error };
    }
    const ownedIds = new Set(ownedActorLinks(sourceActor).map(link => String(link.id || '').replace(/^Actor\./, '')));
    const missing = assets.find(asset => !ownedIds.has(asset.id));
    if (missing) {
      const error = `${missing.name} is no longer linked to ${sourceActor.name}.`;
      this._tradeLifecycleLog('warn', 'Owned asset transfer validation failed: missing owner link.', transfer, {
        phase: 'validate.assets.missing-owner-link',
        error,
        sourceActorId: sourceActor.id,
        assetId: missing.id,
        assetName: missing.name,
        ownedIds: Array.from(ownedIds)
      });
      return { ok: false, error };
    }
    this._tradeLifecycleLog('debug', 'Owned asset transfer validation passed.', transfer, {
      phase: 'validate.assets.ok',
      sourceActorId: sourceActor.id,
      targetActorId: targetActor.id,
      assetIds: assets.map(asset => asset.id),
      assetNames: assets.map(asset => asset.name)
    });
    return { ok: true, sourceActor, targetActor, assets };
  }

  static async _moveOwnedAssets({ thread, transfer, assets, sourceActor, targetActor, transactionId = null, requesterId = null, source = 'holonet-asset-transfer' } = {}) {
    const ids = safeArray(assets).map(asset => asset.id).filter(Boolean);
    this._tradeLifecycleLog('debug', 'Owned asset movement requested.', transfer, {
      phase: 'assets.move.requested',
      threadId: thread?.id ?? null,
      sourceActorId: sourceActor?.id ?? null,
      targetActorId: targetActor?.id ?? null,
      assetIds: ids,
      transactionId,
      source
    });
    if (!ids.length || !sourceActor || !targetActor) {
      this._tradeLifecycleLog('warn', 'Owned asset movement skipped because movement inputs were incomplete.', transfer, {
        phase: 'assets.move.invalid-input',
        threadId: thread?.id ?? null,
        sourceActorId: sourceActor?.id ?? null,
        targetActorId: targetActor?.id ?? null,
        assetIds: ids,
        source
      });
      return false;
    }

    this._tradeLifecycleLog('debug', 'Unlinking assets from source actor.', transfer, {
      phase: 'assets.move.unlink-source.start',
      threadId: thread?.id ?? null,
      sourceActorId: sourceActor.id,
      assetIds: ids,
      source
    });
    await ActorEngine.applyMutationPlan(sourceActor, { set: removeAssetLinks(sourceActor, ids) }, { source: 'HolonetMessengerService.assetTransfer.unlinkSource', validate: true, rederive: true });
    this._tradeLifecycleLog('debug', 'Assets unlinked from source actor.', transfer, {
      phase: 'assets.move.unlink-source.complete',
      threadId: thread?.id ?? null,
      sourceActorId: sourceActor.id,
      assetIds: ids,
      source
    });

    const linkPlan = StoreAcquisitionService.buildOwnerLinkPlan(targetActor, assets, {
      ownerActor: targetActor,
      source,
      transactionId: transactionId ?? transfer?.id,
      transactionContext: 'holonet-asset-trade',
      audit: { transferId: transfer?.id ?? null, threadId: thread?.id ?? null, requesterId }
    });
    if (linkPlan) {
      this._tradeLifecycleLog('debug', 'Linking assets to target actor.', transfer, {
        phase: 'assets.move.link-target.start',
        threadId: thread?.id ?? null,
        targetActorId: targetActor.id,
        assetIds: ids,
        source
      });
      await ActorEngine.applyMutationPlan(targetActor, linkPlan, { source: 'HolonetMessengerService.assetTransfer.linkTarget', validate: true, rederive: true });
      this._tradeLifecycleLog('debug', 'Assets linked to target actor.', transfer, {
        phase: 'assets.move.link-target.complete',
        threadId: thread?.id ?? null,
        targetActorId: targetActor.id,
        assetIds: ids,
        source
      });
    }

    const ownership = StoreAcquisitionService.buildActorOwnership(targetActor, { includeCurrentGM: true });
    for (const asset of assets) {
      this._tradeLifecycleLog('debug', 'Updating moved asset ownership metadata.', transfer, {
        phase: 'assets.move.asset-document-update.start',
        threadId: thread?.id ?? null,
        assetId: asset.id,
        assetName: asset.name,
        sourceActorId: sourceActor.id,
        targetActorId: targetActor.id,
        source
      });
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
      this._tradeLifecycleLog('debug', 'Moved asset ownership metadata updated.', transfer, {
        phase: 'assets.move.asset-document-update.complete',
        threadId: thread?.id ?? null,
        assetId: asset.id,
        assetName: asset.name,
        source
      });
    }
    this._tradeLifecycleLog('info', 'Owned asset movement completed.', transfer, {
      phase: 'assets.move.complete',
      threadId: thread?.id ?? null,
      sourceActorId: sourceActor.id,
      targetActorId: targetActor.id,
      assetIds: ids,
      source
    });
    return true;
  }

  static async _executeCounterAssets({ thread, transfer, requesterId = null } = {}) {
    const entries = safeArray(transfer?.counterOffer?.assets);
    this._tradeLifecycleLog('debug', 'Counter asset settlement requested.', transfer, {
      phase: 'counter.assets.requested',
      threadId: thread?.id ?? null,
      requesterId,
      count: entries.length,
      assetNames: entries.map(entry => entry?.name).filter(Boolean)
    });
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
    if (!validation.ok) {
      this._tradeLifecycleLog('warn', 'Counter asset validation failed.', transfer, {
        phase: 'counter.assets.validation-failed',
        threadId: thread?.id ?? null,
        error: validation.error
      });
      return { success: false, error: validation.error };
    }
    const ok = await this._moveOwnedAssets({ thread, transfer: counterTransfer, assets: validation.assets, sourceActor: validation.sourceActor, targetActor: validation.targetActor, requesterId, source: 'holonet-asset-counter-offer' });
    if (!ok) {
      const error = 'Counter asset transfer failed.';
      this._tradeLifecycleLog('warn', error, transfer, { phase: 'counter.assets.failed', threadId: thread?.id ?? null });
      return { success: false, error };
    }
    this._tradeLifecycleLog('info', 'Counter asset settlement completed.', transfer, {
      phase: 'counter.assets.complete',
      threadId: thread?.id ?? null,
      count: validation.assets.length,
      assetIds: validation.assets.map(asset => asset.id),
      assetNames: validation.assets.map(asset => asset.name)
    });
    return { success: true, count: validation.assets.length, names: validation.assets.map(asset => asset.name) };
  }

  static async _executeCounterItems({ thread, transfer, requesterId = null } = {}) {
    const entries = safeArray(transfer?.counterOffer?.items);
    this._tradeLifecycleLog('debug', 'Counter item settlement requested.', transfer, {
      phase: 'counter.items.requested',
      threadId: thread?.id ?? null,
      requesterId,
      count: entries.length,
      itemNames: entries.map(entry => entry?.name).filter(Boolean)
    });
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
    if (!validation.ok) {
      this._tradeLifecycleLog('warn', 'Counter item validation failed.', transfer, {
        phase: 'counter.items.validation-failed',
        threadId: thread?.id ?? null,
        error: validation.error
      });
      return { success: false, error: validation.error };
    }
    const ok = await this._executeOwnedItemTransfer({ thread, transfer: counterTransfer, requesterId });
    if (!ok) {
      const error = 'Counter item transfer failed.';
      this._tradeLifecycleLog('warn', error, transfer, { phase: 'counter.items.failed', threadId: thread?.id ?? null });
      return { success: false, error };
    }
    this._tradeLifecycleLog('info', 'Counter item settlement completed.', transfer, {
      phase: 'counter.items.complete',
      threadId: thread?.id ?? null,
      count: entries.length,
      itemNames: entries.map(entry => entry?.name).filter(Boolean)
    });
    return { success: true, count: entries.length };
  }

  static async _settleCounterOffer({ thread, transfer, requesterId = null } = {}) {
    const counter = transfer?.counterOffer ?? null;
    this._tradeLifecycleLog('debug', 'Counter-offer settlement requested.', transfer, {
      phase: 'counter.settle.requested',
      threadId: thread?.id ?? null,
      requesterId,
      hasCounterOffer: Boolean(counter)
    });
    if (!counter) return { success: true };
    const sourceActor = transfer.toActorId ? game.actors?.get(transfer.toActorId) : null;
    const targetActor = transfer.fromActorId ? game.actors?.get(transfer.fromActorId) : null;
    if (!sourceActor || !targetActor) {
      const error = 'Counter-offer actors could not be resolved.';
      this._tradeLifecycleLog('warn', error, transfer, { phase: 'counter.settle.actors-missing', threadId: thread?.id ?? null });
      return { success: false, error };
    }

    const credits = parsePositiveCredits(counter.credits);
    const counterContext = transfer.kind === 'ownedItemTransfer' ? 'holonet-item-counter-offer' : 'holonet-asset-counter-offer';
    const counterReason = transfer.kind === 'ownedItemTransfer' ? 'Holonet item counter-offer' : 'Holonet asset counter-offer';
    if (credits) {
      this._tradeLifecycleLog('debug', 'Counter credit transfer starting.', transfer, {
        phase: 'counter.credits.start',
        threadId: thread?.id ?? null,
        fromActorId: sourceActor.id,
        toActorId: targetActor.id,
        amount: credits,
        requesterId
      });
      const credit = await TransactionEngine.executeCreditTransfer({
        fromActor: sourceActor,
        toActor: targetActor,
        amount: credits,
        reason: counter.memo ? `${counterReason}: ${counter.memo}` : counterReason,
        transactionContext: counterContext,
        audit: { source: counterContext, threadId: thread.id, transferId: transfer.id, requesterId }
      }, { source: 'HolonetMessengerService.assetCounterOfferCredits', validate: true, rederive: true });
      if (!credit?.success) {
        const error = credit?.error || 'Counter credit movement failed.';
        this._tradeLifecycleLog('warn', 'Counter credit transfer failed.', transfer, {
          phase: 'counter.credits.failed',
          threadId: thread?.id ?? null,
          amount: credits,
          error
        });
        return { success: false, error };
      }
      this._tradeLifecycleLog('info', 'Counter credit transfer completed.', transfer, {
        phase: 'counter.credits.complete',
        threadId: thread?.id ?? null,
        fromActorId: sourceActor.id,
        toActorId: targetActor.id,
        amount: credits,
        transactionId: credit.transferId ?? credit.transactionId ?? null
      });
    }

    const item = await this._executeCounterItems({ thread, transfer, requesterId });
    if (!item?.success) {
      this._tradeLifecycleLog('warn', 'Counter item settlement returned failure.', transfer, {
        phase: 'counter.settle.items-failed',
        threadId: thread?.id ?? null,
        error: item?.error ?? null
      });
      return item;
    }
    const asset = await this._executeCounterAssets({ thread, transfer, requesterId });
    if (!asset?.success) {
      this._tradeLifecycleLog('warn', 'Counter asset settlement returned failure.', transfer, {
        phase: 'counter.settle.assets-failed',
        threadId: thread?.id ?? null,
        error: asset?.error ?? null
      });
      return asset;
    }
    this._tradeLifecycleLog('info', 'Counter-offer settlement completed.', transfer, {
      phase: 'counter.settle.complete',
      threadId: thread?.id ?? null,
      credits,
      itemCount: item.count || 0,
      assetCount: asset.count || 0,
      assetNames: asset.names || []
    });
    return { success: true, credits, itemCount: item.count || 0, assetCount: asset.count || 0, assetNames: asset.names || [] };
  }

  static async _settleTradeCredits({ thread, transfer, requesterId = null, source = 'HolonetMessengerService.tradeCredits' } = {}) {
    const requestedCredits = parsePositiveCredits(transfer?.trade?.requestedCredits);
    this._tradeLifecycleLog('debug', 'Requested trade credit settlement evaluated.', transfer, {
      phase: 'credits.requested.evaluate',
      threadId: thread?.id ?? null,
      requesterId,
      amount: requestedCredits,
      source
    });
    if (!requestedCredits) return { success: true, amount: 0 };
    const sourceActor = transfer.fromActorId ? game.actors?.get(transfer.fromActorId) : null;
    const targetActor = transfer.toActorId ? game.actors?.get(transfer.toActorId) : null;
    if (!sourceActor || !targetActor) {
      const error = 'Trade credit actors could not be resolved.';
      this._tradeLifecycleLog('warn', error, transfer, {
        phase: 'credits.requested.actors-missing',
        threadId: thread?.id ?? null,
        sourceActorId: sourceActor?.id ?? null,
        targetActorId: targetActor?.id ?? null,
        source
      });
      return { success: false, error };
    }
    this._tradeLifecycleLog('debug', 'Requested trade credit transfer starting.', transfer, {
      phase: 'credits.requested.start',
      threadId: thread?.id ?? null,
      fromActorId: targetActor.id,
      toActorId: sourceActor.id,
      amount: requestedCredits,
      source,
      transactionContext: transfer.kind === 'ownedAssetTransfer' ? 'holonet-asset-trade' : 'holonet-item-trade'
    });
    const result = await TransactionEngine.executeCreditTransfer({
      fromActor: targetActor,
      toActor: sourceActor,
      amount: requestedCredits,
      reason: transfer.memo ? `Holonet trade: ${transfer.memo}` : 'Holonet trade',
      transactionContext: transfer.kind === 'ownedAssetTransfer' ? 'holonet-asset-trade' : 'holonet-item-trade',
      audit: { source: 'holonet-trade', threadId: thread.id, transferId: transfer.id, requesterId }
    }, { source, validate: true, rederive: true });
    if (!result?.success) {
      this._tradeLifecycleLog('warn', 'Requested trade credit transfer failed.', transfer, {
        phase: 'credits.requested.failed',
        threadId: thread?.id ?? null,
        amount: requestedCredits,
        error: result?.error ?? 'unknown credit transfer failure',
        source
      });
      return result;
    }
    this._tradeLifecycleLog('info', 'Requested trade credit transfer completed.', transfer, {
      phase: 'credits.requested.complete',
      threadId: thread?.id ?? null,
      fromActorId: targetActor.id,
      toActorId: sourceActor.id,
      amount: requestedCredits,
      source,
      transactionId: result.transferId ?? result.transactionId ?? null
    });
    return result;
  }

  static async _gmResolveAssetTransfer({ thread, recordId, action, actorId = null, counterCredits = 0, counterItemIds = [], counterAssetIds = [], counterMemo = '', requesterId = null, senderRecipientId = null, requestId = null } = {}) {
    if (!recordId) return false;
    const message = await HolonetStorage.getRecord(recordId);
    const transfer = message?.metadata?.assetTransfer;
    if (!message || !transfer) return false;
    const requester = requesterId ? game.users?.get(requesterId) : game.user;
    const requesterIsGm = Boolean(requester?.isGM || senderRecipientId?.startsWith('gm:'));
    const currentId = senderRecipientId || currentRecipientId();
    this._tradeLifecycleLog('debug', 'GM/asset transfer resolver action received.', transfer, {
      phase: 'resolver.asset.action',
      threadId: thread?.id ?? null,
      action,
      requesterId,
      senderRecipientId,
      currentId,
      requesterIsGm,
      counterItemIds: safeArray(counterItemIds),
      counterAssetIds: safeArray(counterAssetIds),
      counterCredits: parsePositiveCredits(counterCredits)
    });
    if (['complete', 'declined', 'cancelled', 'failed'].includes(transfer.status)) {
      this._tradeLifecycleLog('warn', 'Asset transfer resolver rejected action because transfer is already terminal.', transfer, {
        phase: 'resolver.asset.terminal-reject',
        threadId: thread?.id ?? null,
        action,
        currentId
      });
      return false;
    }

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
      this._tradeLifecycleLog('info', 'Asset counter-offer created.', transfer, {
        phase: 'resolver.asset.counter.created',
        threadId: thread?.id ?? null,
        currentId,
        credits,
        itemCount: items.length,
        assetCount: assets.length,
        memoPresent: Boolean(memo)
      });
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
    if (!requesterIsGm && currentId !== transfer.toRecipientId) {
      this._tradeLifecycleLog('warn', 'Asset transfer accept rejected by permission check.', transfer, {
        phase: 'resolver.asset.accept.permission-reject',
        threadId: thread?.id ?? null,
        action,
        currentId,
        expectedRecipientId: transfer.toRecipientId,
        requesterIsGm
      });
      return false;
    }
    this._tradeLifecycleLog('info', 'Asset transfer accept requested; settlement path beginning.', transfer, {
      phase: 'resolver.asset.accept.start',
      threadId: thread?.id ?? null,
      currentId,
      requesterId
    });
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
    this._tradeLifecycleLog(ok ? 'info' : 'warn', ok ? 'Asset transfer resolved complete.' : 'Asset transfer resolved failed.', transfer, {
      phase: ok ? 'resolver.asset.accept.complete' : 'resolver.asset.accept.failed',
      threadId: thread?.id ?? null,
      currentId,
      failureReason: transfer.failureReason ?? null
    });
    await HolonetStorage.saveRecord(message);
    return ok;
  }

  static async _completeItemCounterOffer({ thread, message, transfer, requesterId = null, resolvedBy = null } = {}) {
    this._tradeLifecycleLog('info', 'Item counter-offer completion requested.', transfer, {
      phase: 'resolver.item.counter-complete.start',
      threadId: thread?.id ?? null,
      requesterId,
      resolvedBy
    });
    const atomic = await this._executeAtomicTradeSettlement({
      thread,
      transfer,
      actors: this._collectTradeSettlementActors(transfer, { includeCounter: true }),
      preflight: () => this._preflightTradeSettlement(transfer, { includeCounter: true, suppressRequestedCredits: true }),
      operation: async () => {
        const counter = await this._settleCounterOffer({ thread, transfer, requesterId });
        if (!counter?.success) throw new Error(counter?.error || 'Counter settlement failed.');
        const ok = await this._executeOwnedItemTransfer({ thread, transfer: { ...transfer, trade: { ...(transfer.trade ?? {}), requestedCredits: 0 } }, requesterId });
        if (!ok) throw new Error('Original item transfer failed after counter settlement.');
        return { success: true, counter };
      },
      failureEventType: 'item-counter-atomic-failed',
      failurePrefix: 'Item counter-offer failed'
    });

    const ok = Boolean(atomic?.success);
    transfer.status = ok ? 'complete' : 'failed';
    transfer.resolvedAt = nowIso();
    transfer.resolvedBy = resolvedBy;
    transfer.counterSettledAt = ok ? nowIso() : null;
    if (!ok) transfer.failureReason = atomic?.error || 'Atomic item counter-offer settlement failed.';
    await HolonetStorage.saveRecord(message);
    return ok;
  }

  static async _completeAssetCounterOffer({ thread, message, transfer, requesterId = null, resolvedBy = null } = {}) {
    this._tradeLifecycleLog('info', 'Asset counter-offer completion requested.', transfer, {
      phase: 'resolver.asset.counter-complete.start',
      threadId: thread?.id ?? null,
      requesterId,
      resolvedBy
    });
    const atomic = await this._executeAtomicTradeSettlement({
      thread,
      transfer,
      actors: this._collectTradeSettlementActors(transfer, { includeCounter: true }),
      preflight: () => this._preflightTradeSettlement(transfer, { includeCounter: true, suppressRequestedCredits: true }),
      operation: async () => {
        this._tradeLifecycleLog('debug', 'Atomic asset counter operation settling counter package.', transfer, {
          phase: 'resolver.asset.counter-complete.counter-settle.start',
          threadId: thread?.id ?? null
        });
        const counter = await this._settleCounterOffer({ thread, transfer, requesterId });
        if (!counter?.success) throw new Error(counter?.error || 'Counter settlement failed.');
        this._tradeLifecycleLog('debug', 'Atomic asset counter operation moving original asset without requested credits.', transfer, {
          phase: 'resolver.asset.counter-complete.original-asset.start',
          threadId: thread?.id ?? null,
          counter
        });
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
    this._tradeLifecycleLog(ok ? 'info' : 'warn', ok ? 'Asset counter-offer resolved complete.' : 'Asset counter-offer resolved failed.', transfer, {
      phase: ok ? 'resolver.asset.counter-complete.complete' : 'resolver.asset.counter-complete.failed',
      threadId: thread?.id ?? null,
      requesterId,
      resolvedBy,
      failureReason: transfer.failureReason ?? null,
      rollbackOk: atomic?.rollbackOk ?? null
    });
    await HolonetStorage.saveRecord(message);
    return ok;
  }

  static async _executeAssetTransfer({ thread, transfer, requesterId = null } = {}) {
    this._tradeLifecycleLog('info', 'Asset transfer execution starting.', transfer, {
      phase: 'asset.execute.start',
      threadId: thread?.id ?? null,
      requesterId
    });
    const validation = this._validateOwnedAssetTransfer(transfer);
    if (!validation.ok) {
      this._tradeLifecycleLog('warn', 'Asset transfer execution validation failed.', transfer, {
        phase: 'asset.execute.validation-failed',
        threadId: thread?.id ?? null,
        error: validation.error
      });
      await this._publishSystemMessage(thread, `Asset transfer failed: ${validation.error}`, { eventType: 'asset-transfer-failed', transferId: transfer.id });
      return false;
    }
    const { sourceActor, targetActor, assets } = validation;

    const credit = await this._settleTradeCredits({ thread, transfer, requesterId, source: 'HolonetMessengerService.assetTradeCredits' });
    if (!credit?.success) {
      this._tradeLifecycleLog('warn', 'Asset transfer payment failed before asset movement.', transfer, {
        phase: 'asset.execute.payment-failed',
        threadId: thread?.id ?? null,
        error: credit?.error || 'Credit movement failed.'
      });
      await this._publishSystemMessage(thread, `Asset transfer payment failed: ${credit?.error || 'Credit movement failed.'}`, { eventType: 'asset-transfer-payment-failed', transferId: transfer.id });
      return false;
    }

    const ids = assets.map(asset => asset.id);
    this._tradeLifecycleLog('debug', 'Asset transfer moving owned assets.', transfer, {
      phase: 'asset.execute.move-assets.start',
      threadId: thread?.id ?? null,
      sourceActorId: sourceActor.id,
      targetActorId: targetActor.id,
      assetIds: ids,
      creditAmount: credit.amount ?? 0
    });
    const moved = await this._moveOwnedAssets({
      thread,
      transfer,
      assets,
      sourceActor,
      targetActor,
      transactionId: credit.transferId ?? credit.transactionId ?? transfer.id,
      requesterId,
      source: 'holonet-asset-transfer'
    });
    if (!moved) {
      this._tradeLifecycleLog('warn', 'Asset transfer movement returned failure.', transfer, {
        phase: 'asset.execute.move-assets.failed',
        threadId: thread?.id ?? null,
        sourceActorId: sourceActor.id,
        targetActorId: targetActor.id,
        assetIds: ids
      });
      return false;
    }

    const names = assets.map(asset => asset.name).join(', ');
    await this._publishReceiptMessage(thread, {
      title: 'Asset Transfer Receipt',
      eventType: 'asset-transfer-complete',
      lines: [`From: ${sourceActor.name}`, `To: ${targetActor.name}`, `Assets: ${names}`, credit.amount ? `Credits: ${formatCredits(credit.amount)}` : null].filter(Boolean)
    });
    await this._publishSystemMessage(thread, `${targetActor.name} received ${names} from ${sourceActor.name}.`, { eventType: 'asset-transfer-complete', toActorId: targetActor.id, assetIds: ids });
    this._tradeLifecycleLog('info', 'Asset transfer execution completed.', transfer, {
      phase: 'asset.execute.complete',
      threadId: thread?.id ?? null,
      sourceActorId: sourceActor.id,
      targetActorId: targetActor.id,
      assetIds: ids,
      assetNames: assets.map(asset => asset.name),
      creditAmount: credit.amount ?? 0
    });
    return true;
  }

  static async _executeOwnedItemTransfer({ thread, transfer, requesterId = null } = {}) {
    this._tradeLifecycleLog('info', 'Owned item transfer execution starting.', transfer, {
      phase: 'item.execute.start',
      threadId: thread?.id ?? null,
      requesterId
    });
    const validation = this._validateOwnedItemTransfer(transfer);
    if (!validation.ok) {
      this._tradeLifecycleLog('warn', 'Owned item transfer execution validation failed.', transfer, {
        phase: 'item.execute.validation-failed',
        threadId: thread?.id ?? null,
        error: validation.error
      });
      await this._publishSystemMessage(thread, `Item transfer failed: ${validation.error}`, { eventType: 'item-transfer-failed', transferId: transfer.id });
      return false;
    }
    const { sourceActor, targetActor } = validation;

    const credit = await this._settleTradeCredits({ thread, transfer, requesterId, source: 'HolonetMessengerService.itemTradeCredits' });
    if (!credit?.success) {
      this._tradeLifecycleLog('warn', 'Owned item transfer payment failed before item movement.', transfer, {
        phase: 'item.execute.payment-failed',
        threadId: thread?.id ?? null,
        error: credit?.error || 'Credit movement failed.'
      });
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
    if (!createData.length) {
      this._tradeLifecycleLog('warn', 'Owned item transfer had no item create payloads.', transfer, {
        phase: 'item.execute.no-create-data',
        threadId: thread?.id ?? null
      });
      return false;
    }

    this._tradeLifecycleLog('debug', 'Owned item movement plan built.', transfer, {
      phase: 'item.execute.plan-built',
      threadId: thread?.id ?? null,
      sourceActorId: sourceActor.id,
      targetActorId: targetActor.id,
      createCount: createData.length,
      updateCount: updates.length,
      deleteCount: deletes.length,
      itemNames: names
    });

    try {
      if (updates.length) {
        this._tradeLifecycleLog('debug', 'Decrementing source item quantities.', transfer, { phase: 'item.execute.decrement.start', threadId: thread?.id ?? null, count: updates.length });
        await ActorEngine.updateEmbeddedDocuments(sourceActor, 'Item', updates, { source: 'HolonetMessengerService.itemTransfer.decrement' });
        this._tradeLifecycleLog('debug', 'Source item quantities decremented.', transfer, { phase: 'item.execute.decrement.complete', threadId: thread?.id ?? null, count: updates.length });
      }
      if (deletes.length) {
        this._tradeLifecycleLog('debug', 'Deleting fully transferred source items.', transfer, { phase: 'item.execute.delete.start', threadId: thread?.id ?? null, count: deletes.length, itemIds: deletes });
        await ActorEngine.deleteEmbeddedDocuments(sourceActor, 'Item', deletes, { source: 'HolonetMessengerService.itemTransfer.remove' });
        this._tradeLifecycleLog('debug', 'Fully transferred source items deleted.', transfer, { phase: 'item.execute.delete.complete', threadId: thread?.id ?? null, count: deletes.length, itemIds: deletes });
      }
      this._tradeLifecycleLog('debug', 'Creating transferred items on target actor.', transfer, { phase: 'item.execute.create.start', threadId: thread?.id ?? null, count: createData.length, targetActorId: targetActor.id });
      await ActorEngine.createEmbeddedDocuments(targetActor, 'Item', createData, { source: 'HolonetMessengerService.itemTransfer.create' });
      this._tradeLifecycleLog('debug', 'Transferred items created on target actor.', transfer, { phase: 'item.execute.create.complete', threadId: thread?.id ?? null, count: createData.length, targetActorId: targetActor.id });
    } catch (err) {
      this._tradeLifecycleError('Owned item movement failed after payment stage.', transfer, err, {
        phase: 'item.execute.movement-exception',
        threadId: thread?.id ?? null,
        creditAmount: credit?.amount ?? 0,
        sourceActorId: sourceActor.id,
        targetActorId: targetActor.id
      });
      if (credit?.amount) {
        try {
          this._tradeLifecycleLog('warn', 'Attempting immediate credit compensation after item movement failure.', transfer, {
            phase: 'item.execute.compensation.start',
            threadId: thread?.id ?? null,
            amount: credit.amount,
            fromActorId: sourceActor.id,
            toActorId: targetActor.id
          });
          await TransactionEngine.executeCreditTransfer({
            fromActor: sourceActor,
            toActor: targetActor,
            amount: credit.amount,
            reason: 'Holonet item trade compensation after item movement failure',
            transactionContext: 'holonet-item-trade',
            audit: { source: 'holonet-item-trade-compensation', threadId: thread.id, transferId: transfer.id, requesterId, originalTransferId: credit.transferId ?? null }
          }, { source: 'HolonetMessengerService.itemTradeCompensation', validate: true, rederive: true });
          this._tradeLifecycleLog('warn', 'Immediate credit compensation completed; atomic rollback will still restore captured state.', transfer, {
            phase: 'item.execute.compensation.complete',
            threadId: thread?.id ?? null,
            amount: credit.amount
          });
        } catch (compensationErr) {
          this._tradeLifecycleError('Immediate credit compensation failed; atomic rollback will attempt full restore.', transfer, compensationErr, {
            phase: 'item.execute.compensation.failed',
            threadId: thread?.id ?? null,
            amount: credit.amount,
            originalError: err?.message ?? null
          });
        }
      }
      throw err;
    }

    await this._publishReceiptMessage(thread, {
      title: transfer?.trade?.requestedCredits ? 'Item Trade Receipt' : 'Item Transfer Receipt',
      eventType: 'item-transfer-complete',
      lines: [`From: ${sourceActor.name}`, `To: ${targetActor.name}`, `Items: ${names.join(', ')}`, credit.amount ? `Credits: ${formatCredits(credit.amount)}` : null].filter(Boolean)
    });
    await this._publishSystemMessage(thread, `${targetActor.name} received ${names.join(', ')} from ${sourceActor.name}.`, { eventType: 'item-transfer-complete', toActorId: targetActor.id, itemNames: names });
    this._tradeLifecycleLog('info', 'Owned item transfer execution completed.', transfer, {
      phase: 'item.execute.complete',
      threadId: thread?.id ?? null,
      sourceActorId: sourceActor.id,
      targetActorId: targetActor.id,
      itemNames: names,
      creditAmount: credit.amount ?? 0
    });
    return true;
  }

  static async _gmGrantItems({ thread, recipientId, itemUuids = [], requesterId = null, eventType = 'item-grant', source = 'holonet-item-grant' } = {}) {
    const recipient = this._recipientFromStableId(recipientId);
    const targetActor = recipient?.actorId ? game.actors?.get(recipient.actorId) : null;
    if (!targetActor) return false;
    const requestedUuids = safeArray(itemUuids).map(String).filter(Boolean);
    const createdNames = [];
    const createData = [];
    const resolutionErrors = [];
    for (const uuid of requestedUuids) {
      try {
        const item = await fromUuid(uuid);
        if (!item) {
          resolutionErrors.push(`Item could not be resolved: ${uuid}`);
          continue;
        }
        const data = item.toObject ? item.toObject() : foundry.utils.deepClone(item);
        delete data._id;
        data.flags ??= {};
        data.flags.swse ??= {};
        data.flags.swse.holonetGrant = { source, threadId: thread.id, uuid, grantedAt: nowIso(), requesterId };
        createData.push(data);
        createdNames.push(item.name || 'Item');
      } catch (err) {
        resolutionErrors.push(`Item grant resolution failed for ${uuid}: ${err?.message || err}`);
        console.warn('[Holonet] Failed resolving item grant', uuid, err);
      }
    }
    if (!createData.length) return false;
    if (eventType === 'job-item-payout' && resolutionErrors.length) {
      await this._publishSystemMessage(thread, `Job item payout failed: ${resolutionErrors.join('; ')}`, { eventType: 'job-item-payout-failed', toActorId: targetActor.id, errors: resolutionErrors });
      return false;
    }

    const applyGrant = async () => {
      await ActorEngine.createEmbeddedDocuments(targetActor, 'Item', createData, { source });
      return { success: true, count: createData.length };
    };
    if (eventType === 'job-item-payout') {
      const atomic = await this._executeAtomicJobRewardSettlement({
        thread,
        actors: [targetActor],
        context: { rewardType: 'items', itemCount: createData.length, targetActorId: targetActor.id, requesterId },
        operation: applyGrant
      });
      if (!atomic?.success) return false;
    } else {
      await applyGrant();
    }

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
    const payload = { type: 'thread-read', threadId, recipientId, recordIds: changed.map(record => record.id), source: SOURCE_FAMILY.MESSENGER };
    Hooks.callAll('swseHolonetUpdated', payload);
    HolonetSocketService.emitSync(payload);
    return true;
  }

  static async getUnreadMessageCount(recipientId = currentRecipientId()) {
    if (!recipientId) return 0;
    const records = await HolonetStorage.getRecordsForRecipient(recipientId, ['published']);
    return records.filter(r => r.type === RECORD_TYPE.MESSAGE && r.isUnreadBy(recipientId)).length;
  }
}
