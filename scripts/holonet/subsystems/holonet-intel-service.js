/**
 * Holonet Intel Service
 *
 * Phase 3 dossier/intel foundation.
 *
 * Intel is intentionally modeled as metadata on existing Holonet records rather
 * than as a parallel world setting or bespoke GM note database. This service is
 * the thin adapter that creates, normalizes, queries, and lifecycle-updates
 * those records. Delivery modes such as Messenger, Bulletin, Secret Notes, and
 * player dossier commits are wired in later phases.
 */

import { HolonetStorage } from './holonet-storage.js';
import { HolonetMessage } from '../contracts/holonet-message.js';
import { HolonetAudience } from '../contracts/holonet-audience.js';
import { HolonetSender } from '../contracts/holonet-sender.js';
import { HolonetDeliveryRouter } from './holonet-delivery-router.js';
import { HolonetSocketService } from './holonet-socket-service.js';
import { BulletinSource } from '../sources/bulletin-source.js';
import { HolonetDecryptionService } from './holonet-decryption-service.js';
import { DELIVERY_STATE, INTENT_TYPE, SOURCE_FAMILY, SURFACE_TYPE } from '../contracts/enums.js';
import { TransactionEngine } from '/systems/foundryvtt-swse/scripts/engine/store/transaction-engine.js';
import { ActorEngine } from '/systems/foundryvtt-swse/scripts/governance/actor-engine/actor-engine.js';

export const INTEL_METADATA_KEY = 'intel';

export const INTEL_KIND = Object.freeze({
  RUMOR: 'rumor',
  CLUE: 'clue',
  NPC_DOSSIER: 'npc-dossier',
  FACTION_DOSSIER: 'faction-dossier',
  MISSION_BRIEFING: 'mission-briefing',
  INTERCEPTED_MESSAGE: 'intercepted-message',
  BOUNTY_LEAD: 'bounty-lead',
  ENCRYPTED_FILE: 'encrypted-file',
  ARTIFACT_LORE: 'artifact-lore',
  LOCATION_INTEL: 'location-intel'
});

export const INTEL_CLASSIFICATION = Object.freeze({
  PUBLIC: 'public',
  RESTRICTED: 'restricted',
  CONFIDENTIAL: 'confidential',
  CLASSIFIED: 'classified',
  BLACK_FILE: 'black-file'
});

export const INTEL_STATUS = Object.freeze({
  DRAFT: 'draft',
  READY: 'ready',
  RELEASED: 'released',
  ARCHIVED: 'archived',
  DESTROYED: 'destroyed'
});

export const INTEL_PERSISTENCE = Object.freeze({
  GM_ONLY: 'gm-only',
  DOSSIER: 'dossier',
  MESSAGE: 'message',
  SECRET_NOTE: 'secret-note',
  BULLETIN: 'bulletin',
  TEMPORARY: 'temporary',
  SELF_DESTRUCT: 'self-destruct',
  ENCRYPTED: 'encrypted',
  REDACTED: 'redacted'
});

export const INTEL_REVEAL_STATE = Object.freeze({
  SEALED: 'sealed',
  REDACTED: 'redacted',
  PARTIAL: 'partial',
  DECODED: 'decoded',
  FULLY_REVEALED: 'fully-revealed',
  DESTROYED: 'destroyed'
});

export const INTEL_LOCKBOX_STATUS = Object.freeze({
  NONE: 'none',
  SEALED: 'sealed',
  CLAIMABLE: 'claimable',
  CLAIMED: 'claimed',
  FAILED: 'failed'
});

const DEFAULT_KIND = INTEL_KIND.CLUE;
const DEFAULT_CLASSIFICATION = INTEL_CLASSIFICATION.RESTRICTED;
const DEFAULT_STATUS = INTEL_STATUS.DRAFT;
const DEFAULT_PERSISTENCE = INTEL_PERSISTENCE.GM_ONLY;
const DEFAULT_REVEAL_STATE = INTEL_REVEAL_STATE.SEALED;
const INTEL_SOURCE_ID_PREFIX = 'intel:';

function nowIso() {
  return new Date().toISOString();
}

function randomId() {
  return globalThis.foundry?.utils?.randomID?.() ?? Math.random().toString(36).slice(2, 18);
}

function cleanString(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueStrings(value, limit = 32) {
  const seen = new Set();
  return safeArray(value)
    .map(entry => cleanString(entry))
    .filter(Boolean)
    .filter(entry => {
      const key = entry.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

function enumValue(value, allowed, fallback) {
  const clean = cleanString(value);
  return Object.values(allowed).includes(clean) ? clean : fallback;
}

function clonePlain(value, fallback = {}) {
  try {
    if (globalThis.foundry?.utils?.deepClone) return globalThis.foundry.utils.deepClone(value ?? fallback);
  } catch (_err) {
    // Fall through to JSON clone.
  }
  try {
    return JSON.parse(JSON.stringify(value ?? fallback));
  } catch (_err) {
    return fallback;
  }
}

function normalizeVisibility(value = {}) {
  const raw = value && typeof value === 'object' ? value : {};
  return {
    mode: enumValue(raw.mode, {
      GM_ONLY: 'gm-only',
      PARTY: 'party',
      SELECTED_PLAYERS: 'selected-players',
      PUBLIC: 'public'
    }, 'gm-only'),
    userIds: uniqueStrings(raw.userIds, 32),
    actorIds: uniqueStrings(raw.actorIds, 32)
  };
}

function normalizeSkillGate(value = {}) {
  const raw = value && typeof value === 'object' ? value : {};
  const dc = Math.max(0, Math.min(100, Math.floor(Number(raw.dc ?? 0) || 0)));
  const level = Math.max(1, Math.min(35, Math.floor(Number(raw.level ?? 12) || 12)));
  const preRevealRaw = raw.preRevealFrac ?? raw.preRevealPercent;
  const preRevealNumber = Number(preRevealRaw);
  const preRevealFrac = Number.isFinite(preRevealNumber)
    ? (preRevealNumber > 1 ? Math.max(0, Math.min(100, preRevealNumber)) / 100 : Math.max(0, Math.min(1, preRevealNumber)))
    : null;
  return {
    enabled: Boolean(raw.enabled),
    skill: cleanString(raw.skill),
    skills: uniqueStrings(raw.skills ?? (raw.skill ? [raw.skill] : []), 8),
    dc,
    level,
    decryptionMode: cleanString(raw.decryptionMode ?? raw.analysisMode ?? raw.lockType, 'glyphCipher'),
    cipherMode: cleanString(raw.cipherMode ?? raw.mode, ''),
    glyphs: raw.glyphs === undefined ? null : Boolean(raw.glyphs),
    transpose: raw.transpose === undefined ? null : Boolean(raw.transpose),
    preRevealFrac,
    failEnabled: raw.failEnabled === undefined ? true : Boolean(raw.failEnabled),
    failType: cleanString(raw.failType, 'attempts') === 'trace' ? 'trace' : 'attempts',
    failedRollLimit: cleanPositiveInt(raw.failedRollLimit ?? raw.attemptLimit ?? raw.failedAttempts ?? 6, 6, 30),
    traceMax: cleanPositiveInt(raw.traceMax ?? 10, 10, 30),
    successMode: cleanString(raw.successMode, 'reveal-full'),
    failureMode: cleanString(raw.failureMode, 'keep-redacted'),
    attempts: cleanString(raw.attempts, 'gm-managed'),
    resolvedAt: raw.resolvedAt ?? null,
    resolvedByUserId: raw.resolvedByUserId ?? null,
    result: raw.result ?? null
  };
}


function cleanPositiveInt(value, fallback = 0, max = 999999999) {
  const number = Math.floor(Number(value) || 0);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(0, Math.min(max, number));
}

function normalizeLockboxItem(value = {}) {
  const raw = value && typeof value === 'object' ? value : {};
  return {
    id: cleanString(raw.id, randomId()),
    uuid: cleanString(raw.uuid ?? raw.documentUuid ?? raw.itemUuid),
    name: cleanString(raw.name ?? raw.label),
    quantity: cleanPositiveInt(raw.quantity ?? raw.qty ?? 1, 1, 999),
    claimedItemId: cleanString(raw.claimedItemId),
    claimedItemName: cleanString(raw.claimedItemName)
  };
}

function normalizeLockbox(value = {}, existing = {}) {
  const raw = value && typeof value === 'object' ? value : {};
  const prior = existing && typeof existing === 'object' ? existing : {};
  const credits = cleanPositiveInt(raw.credits ?? prior.credits, 0, 999999999);
  const items = safeArray(raw.items ?? prior.items).map(normalizeLockboxItem).filter(item => item.uuid || item.name);
  const hasRewards = credits > 0 || items.length > 0;
  const enabled = raw.enabled !== undefined ? Boolean(raw.enabled) : Boolean(prior.enabled ?? hasRewards);
  const status = enumValue(raw.status ?? prior.status, INTEL_LOCKBOX_STATUS, enabled ? INTEL_LOCKBOX_STATUS.SEALED : INTEL_LOCKBOX_STATUS.NONE);
  return {
    id: cleanString(raw.id ?? prior.id, randomId()),
    enabled,
    status: enabled ? status : INTEL_LOCKBOX_STATUS.NONE,
    label: cleanString(raw.label ?? prior.label, enabled ? 'Encrypted Lockbox' : ''),
    notes: cleanString(raw.notes ?? prior.notes),
    credits,
    items,
    claimedAt: raw.claimedAt ?? prior.claimedAt ?? null,
    claimedByActorId: cleanString(raw.claimedByActorId ?? prior.claimedByActorId),
    claimedByActorName: cleanString(raw.claimedByActorName ?? prior.claimedByActorName),
    creditTransactionId: cleanString(raw.creditTransactionId ?? prior.creditTransactionId),
    claimedItemIds: uniqueStrings(raw.claimedItemIds ?? prior.claimedItemIds, 64),
    claimError: cleanString(raw.claimError ?? prior.claimError)
  };
}

function lockboxHasRewards(lockbox = {}) {
  return Boolean(lockbox?.enabled && (Number(lockbox.credits || 0) > 0 || safeArray(lockbox.items).length > 0));
}

function intelIsDecoded(intel = {}, record = null) {
  if ([INTEL_REVEAL_STATE.DECODED, INTEL_REVEAL_STATE.FULLY_REVEALED].includes(intel.revealState)) return true;
  return Boolean(record?.metadata?.decryptionPayload?.solved);
}

function requesterCanUseActor(actor, requesterId = '') {
  if (!actor) return false;
  const user = requesterId ? globalThis.game?.users?.get?.(requesterId) : globalThis.game?.user;
  if (!user) return false;
  if (user.isGM) return true;
  try {
    if (actor.testUserPermission?.(user, 'OWNER')) return true;
  } catch (_err) {}
  return user.character?.id === actor.id;
}

function normalizeLinks(data = {}, existing = {}) {
  return {
    linkedFactionId: cleanString(data.linkedFactionId ?? existing.linkedFactionId),
    linkedContactId: cleanString(data.linkedContactId ?? existing.linkedContactId),
    linkedActorUuid: cleanString(data.linkedActorUuid ?? existing.linkedActorUuid),
    linkedJobThreadId: cleanString(data.linkedJobThreadId ?? existing.linkedJobThreadId),
    linkedSceneUuid: cleanString(data.linkedSceneUuid ?? existing.linkedSceneUuid),
    linkedItemUuid: cleanString(data.linkedItemUuid ?? existing.linkedItemUuid),
    linkedUuids: uniqueStrings(data.linkedUuids ?? existing.linkedUuids, 24)
  };
}

function normalizeIntelMetadata(data = {}, existing = {}, { touchUpdatedAt = false } = {}) {
  const createdAt = existing.createdAt ?? data.createdAt ?? nowIso();
  const status = enumValue(data.status ?? existing.status, INTEL_STATUS, DEFAULT_STATUS);
  const revealState = enumValue(data.revealState ?? existing.revealState, INTEL_REVEAL_STATE, DEFAULT_REVEAL_STATE);
  const title = cleanString(data.title ?? existing.title, 'Untitled Intel');
  const publicBody = cleanString(data.publicBody ?? existing.publicBody ?? data.body ?? existing.body);
  const fullBody = cleanString(data.fullBody ?? existing.fullBody ?? publicBody);
  const redactedBody = cleanString(data.redactedBody ?? existing.redactedBody);
  const summary = cleanString(data.summary ?? existing.summary ?? publicBody).slice(0, 280);

  return {
    id: cleanString(data.id ?? existing.id, randomId()),
    kind: enumValue(data.kind ?? existing.kind, INTEL_KIND, DEFAULT_KIND),
    classification: enumValue(data.classification ?? existing.classification, INTEL_CLASSIFICATION, DEFAULT_CLASSIFICATION),
    status,
    persistence: enumValue(data.persistence ?? existing.persistence, INTEL_PERSISTENCE, DEFAULT_PERSISTENCE),
    revealState,

    ...normalizeLinks(data, existing),

    title,
    summary,
    gmNotes: cleanString(data.gmNotes ?? existing.gmNotes),
    publicBody,
    redactedBody,
    fullBody,

    tags: uniqueStrings(data.tags ?? existing.tags, 32),
    visibility: normalizeVisibility(data.visibility ?? existing.visibility),
    skillGate: normalizeSkillGate(data.skillGate ?? existing.skillGate),
    lockbox: normalizeLockbox(data.lockbox ?? existing.lockbox, existing.lockbox),
    delivery: clonePlain(data.delivery ?? existing.delivery, {}),
    dossierCommit: Boolean(data.dossierCommit ?? existing.dossierCommit ?? false),

    createdByUserId: cleanString(data.createdByUserId ?? existing.createdByUserId ?? globalThis.game?.user?.id),
    createdAt,
    updatedAt: touchUpdatedAt ? nowIso() : (data.updatedAt ?? existing.updatedAt ?? nowIso()),
    readyAt: data.readyAt ?? existing.readyAt ?? (status === INTEL_STATUS.READY ? nowIso() : null),
    releasedAt: data.releasedAt ?? existing.releasedAt ?? (status === INTEL_STATUS.RELEASED ? nowIso() : null),
    archivedAt: data.archivedAt ?? existing.archivedAt ?? (status === INTEL_STATUS.ARCHIVED ? nowIso() : null),
    destroyedAt: data.destroyedAt ?? existing.destroyedAt ?? (status === INTEL_STATUS.DESTROYED ? nowIso() : null)
  };
}

function applyIntelToRecord(record, intel) {
  if (!record) return record;
  record.title = intel.title;
  record.body = intel.publicBody || intel.fullBody || intel.summary || '';
  record.sourceFamily = record.sourceFamily || SOURCE_FAMILY.GM_AUTHORED;
  record.sourceId = record.sourceId || `${INTEL_SOURCE_ID_PREFIX}${intel.id}`;
  record.intent = record.intent || INTENT_TYPE.GM_MESSAGE;
  record.metadata = {
    ...(record.metadata ?? {}),
    [INTEL_METADATA_KEY]: intel,
    source: 'gm-intel',
    dossierBacked: true
  };
  record.updatedAt = nowIso();
  return record;
}

function lifecycleStateForIntelStatus(status) {
  if (status === INTEL_STATUS.RELEASED) return DELIVERY_STATE.PUBLISHED;
  if (status === INTEL_STATUS.ARCHIVED || status === INTEL_STATUS.DESTROYED) return DELIVERY_STATE.ARCHIVED;
  return DELIVERY_STATE.DRAFT;
}

function uniqueRecords(records = []) {
  const map = new Map();
  for (const record of records || []) {
    if (record?.id) map.set(record.id, record);
  }
  return [...map.values()];
}

function currentUserActorIds() {
  const ids = new Set();
  const character = globalThis.game?.user?.character;
  if (character?.id) ids.add(character.id);
  for (const actor of globalThis.game?.actors?.contents ?? []) {
    if (actor?.isOwner) ids.add(actor.id);
  }
  return [...ids];
}

function actorFlagState(actor = null) {
  const value = actor?.getFlag?.('foundryvtt-swse', 'intelLocker') ?? {};
  return value && typeof value === 'object' ? clonePlain(value, {}) : {};
}

function normalizeLockerEntry(value = {}) {
  const raw = value && typeof value === 'object' ? value : {};
  return {
    pinned: Boolean(raw.pinned),
    archived: Boolean(raw.archived),
    reviewed: Boolean(raw.reviewed),
    notes: cleanString(raw.notes),
    updatedAt: raw.updatedAt ?? null
  };
}

function recipientIdsFromVisibility(intel = {}, options = {}) {
  const explicit = uniqueStrings(options.recipientIds, 64);
  if (explicit.length) return explicit;
  const visibility = intel.visibility ?? {};
  if (visibility.mode === 'selected-players' && visibility.userIds?.length) {
    return visibility.userIds.map(id => `player:${id}`);
  }
  if (visibility.mode === 'gm-only' && options.partyFallback !== true) return [];
  return HolonetDeliveryRouter.getPartyMembers().map(r => r.id).filter(Boolean);
}

function audienceFromVisibility(intel = {}, options = {}) {
  const recipientIds = recipientIdsFromVisibility(intel, options);
  const playerIds = recipientIds
    .filter(id => id.startsWith('player:'))
    .map(id => id.split(':')[1])
    .filter(Boolean);
  if (playerIds.length) return HolonetAudience.selectedPlayers(playerIds);
  if (intel.visibility?.mode === 'gm-only') return HolonetAudience.gmOnly();
  return HolonetAudience.allPlayers();
}

function deliverySummary(intel = {}, extra = {}) {
  const list = safeArray(intel.delivery?.history);
  return {
    ...(intel.delivery ?? {}),
    lastMode: extra.mode ?? intel.delivery?.lastMode ?? null,
    lastDeliveredAt: nowIso(),
    history: [{ id: randomId(), at: nowIso(), ...extra }, ...list].slice(0, 25)
  };
}

function bodyForIntel(intel = {}, mode = 'public') {
  if (mode === 'full') return cleanString(intel.fullBody || intel.publicBody || intel.redactedBody || intel.summary);
  if (mode === 'redacted') return cleanString(intel.redactedBody || intel.publicBody || intel.summary);
  return cleanString(intel.publicBody || intel.redactedBody || intel.summary || intel.fullBody);
}

function shouldBuildDecryption(intel = {}, options = {}) {
  return Boolean(options.encrypted ?? intel.skillGate?.enabled ?? intel.lockbox?.enabled ?? [INTEL_PERSISTENCE.ENCRYPTED, INTEL_PERSISTENCE.SELF_DESTRUCT, INTEL_PERSISTENCE.SECRET_NOTE].includes(intel.persistence));
}

function buildDecryptionPayload(intel = {}, options = {}) {
  if (!shouldBuildDecryption(intel, options)) return null;
  const fullBody = bodyForIntel(intel, 'full');
  if (!fullBody) return null;
  const skill = cleanString(options.skill ?? intel.skillGate?.skill, 'useComputer');
  const dc = Number(options.dc ?? intel.skillGate?.dc ?? 0) || null;
  const skills = uniqueStrings(options.skills ?? intel.skillGate?.skills ?? [skill], 8);
  return HolonetDecryptionService.buildPayload({
    title: intel.title,
    publicBody: bodyForIntel(intel, 'redacted'),
    redactedBody: bodyForIntel(intel, 'redacted'),
    fullBody,
    level: Number(options.level ?? intel.skillGate?.level ?? 12) || 12,
    analysisMode: options.analysisMode ?? options.decryptionMode ?? intel.skillGate?.decryptionMode ?? 'glyphCipher',
    mode: options.mode ?? intel.skillGate?.cipherMode ?? '',
    glyphs: options.glyphs ?? intel.skillGate?.glyphs ?? null,
    transpose: options.transpose ?? intel.skillGate?.transpose ?? null,
    dc,
    preRevealFrac: options.preRevealFrac ?? intel.skillGate?.preRevealFrac ?? null,
    skills: skills.length ? skills : [skill].filter(Boolean),
    failEnabled: options.failEnabled ?? intel.skillGate?.failEnabled ?? true,
    failType: options.failType ?? intel.skillGate?.failType ?? 'attempts',
    attempts: options.attempts ?? intel.skillGate?.failedRollLimit ?? 6,
    traceMax: options.traceMax ?? intel.skillGate?.traceMax ?? 10,
    sourceIntelId: intel.id,
    linkedFactionId: intel.linkedFactionId,
    linkedContactId: intel.linkedContactId,
    lockbox: intel.lockbox?.enabled ? { enabled: true, id: intel.lockbox.id ?? intel.id, label: intel.lockbox.label, rewardCount: (Number(intel.lockbox.credits || 0) > 0 ? 1 : 0) + safeArray(intel.lockbox.items).length } : null
  });
}

function buildLockboxView(lockbox = {}, { decoded = false } = {}) {
  const box = normalizeLockbox(lockbox);
  const rewardCount = (Number(box.credits || 0) > 0 ? 1 : 0) + safeArray(box.items).length;
  return {
    ...box,
    hasRewards: lockboxHasRewards(box),
    rewardCount,
    sealed: box.enabled && !decoded && box.status !== INTEL_LOCKBOX_STATUS.CLAIMED,
    claimable: box.enabled && decoded && box.status !== INTEL_LOCKBOX_STATUS.CLAIMED && rewardCount > 0,
    claimed: box.status === INTEL_LOCKBOX_STATUS.CLAIMED,
    creditsLabel: Number(box.credits || 0).toLocaleString(),
    itemCount: safeArray(box.items).length,
    itemsLabel: safeArray(box.items).map(item => item.name || item.uuid).filter(Boolean).join(', ')
  };
}

function sortIntelRecords(records = []) {
  return [...records].sort((a, b) => {
    const aIntel = a?.metadata?.[INTEL_METADATA_KEY] ?? {};
    const bIntel = b?.metadata?.[INTEL_METADATA_KEY] ?? {};
    return Date.parse(bIntel.updatedAt ?? b.updatedAt ?? b.createdAt ?? 0) - Date.parse(aIntel.updatedAt ?? a.updatedAt ?? a.createdAt ?? 0);
  });
}

function matchesFilter(record, filters = {}) {
  const intel = record?.metadata?.[INTEL_METADATA_KEY];
  if (!intel) return false;
  if (filters.status && intel.status !== filters.status) return false;
  if (filters.statuses?.length && !filters.statuses.includes(intel.status)) return false;
  if (filters.kind && intel.kind !== filters.kind) return false;
  if (filters.kinds?.length && !filters.kinds.includes(intel.kind)) return false;
  if (filters.classification && intel.classification !== filters.classification) return false;
  if (filters.persistence && intel.persistence !== filters.persistence) return false;
  if (filters.linkedFactionId && intel.linkedFactionId !== filters.linkedFactionId) return false;
  if (filters.linkedContactId && intel.linkedContactId !== filters.linkedContactId) return false;
  if (filters.linkedActorUuid && intel.linkedActorUuid !== filters.linkedActorUuid) return false;
  if (filters.tag && !safeArray(intel.tags).includes(filters.tag)) return false;
  if (filters.includeArchived === false && [INTEL_STATUS.ARCHIVED, INTEL_STATUS.DESTROYED].includes(intel.status)) return false;
  const search = cleanString(filters.search).toLowerCase();
  if (search) {
    const haystack = [intel.title, intel.summary, intel.publicBody, intel.fullBody, intel.gmNotes, ...safeArray(intel.tags)].join(' ').toLowerCase();
    if (!haystack.includes(search)) return false;
  }
  return true;
}

export class HolonetIntelService {
  static get kindOptions() { return Object.values(INTEL_KIND); }
  static get classificationOptions() { return Object.values(INTEL_CLASSIFICATION); }
  static get statusOptions() { return Object.values(INTEL_STATUS); }
  static get persistenceOptions() { return Object.values(INTEL_PERSISTENCE); }
  static get revealStateOptions() { return Object.values(INTEL_REVEAL_STATE); }
  static get lockboxStatusOptions() { return Object.values(INTEL_LOCKBOX_STATUS); }

  static isIntelRecord(record) {
    return Boolean(record?.metadata?.[INTEL_METADATA_KEY]);
  }

  static getIntelMetadata(record) {
    if (!this.isIntelRecord(record)) return null;
    return normalizeIntelMetadata(record.metadata[INTEL_METADATA_KEY]);
  }

  static toIntelSummary(record) {
    const intel = this.getIntelMetadata(record);
    if (!intel) return null;
    return {
      recordId: record.id,
      id: intel.id,
      title: intel.title,
      kind: intel.kind,
      classification: intel.classification,
      status: intel.status,
      persistence: intel.persistence,
      revealState: intel.revealState,
      lockbox: buildLockboxView(intel.lockbox, { decoded: intelIsDecoded(intel, record) }),
      linkedFactionId: intel.linkedFactionId,
      linkedContactId: intel.linkedContactId,
      linkedActorUuid: intel.linkedActorUuid,
      tags: intel.tags,
      summary: intel.summary,
      visibility: intel.visibility,
      createdAt: intel.createdAt,
      updatedAt: intel.updatedAt,
      readyAt: intel.readyAt,
      releasedAt: intel.releasedAt,
      archivedAt: intel.archivedAt,
      recordState: record.state
    };
  }

  static async getAllIntel(filters = {}) {
    const records = await HolonetStorage.getAllRecords();
    return sortIntelRecords(records.filter(record => matchesFilter(record, filters)));
  }

  static async getIntelSummaries(filters = {}) {
    const records = await this.getAllIntel(filters);
    return records.map(record => this.toIntelSummary(record)).filter(Boolean);
  }

  static async countIntel(filters = {}) {
    const records = await this.getAllIntel(filters);
    return records.length;
  }

  static async getIntelById(intelOrRecordId) {
    const id = cleanString(intelOrRecordId);
    if (!id) return null;
    const direct = await HolonetStorage.getRecord(id);
    if (this.isIntelRecord(direct)) return direct;
    const records = await HolonetStorage.getAllRecords();
    return records.find(record => record?.metadata?.[INTEL_METADATA_KEY]?.id === id) ?? null;
  }

  static async getIntelForFaction(factionId, filters = {}) {
    return this.getAllIntel({ ...filters, linkedFactionId: cleanString(factionId) });
  }

  static async getIntelForContact(factionId, contactId, filters = {}) {
    return this.getAllIntel({ ...filters, linkedFactionId: cleanString(factionId), linkedContactId: cleanString(contactId) });
  }

  static createRecordFromIntel(intelData = {}) {
    const intel = normalizeIntelMetadata(intelData, {}, { touchUpdatedAt: true });
    const record = new HolonetMessage({
      id: intelData.recordId,
      sourceFamily: SOURCE_FAMILY.GM_AUTHORED,
      sourceId: `${INTEL_SOURCE_ID_PREFIX}${intel.id}`,
      intent: INTENT_TYPE.GM_MESSAGE,
      sender: HolonetSender.system('GM Intel'),
      audience: HolonetAudience.gmOnly(),
      recipients: [],
      title: intel.title,
      body: intel.publicBody || intel.fullBody || intel.summary || '',
      state: lifecycleStateForIntelStatus(intel.status),
      projections: [],
      metadata: {
        [INTEL_METADATA_KEY]: intel,
        source: 'gm-intel',
        dossierBacked: true
      }
    });
    return applyIntelToRecord(record, intel);
  }

  static async createIntelDraft(data = {}) {
    if (!globalThis.game?.user?.isGM) return null;
    const record = this.createRecordFromIntel({ ...data, status: data.status ?? INTEL_STATUS.DRAFT });
    const ok = await HolonetStorage.saveRecord(record);
    if (!ok) return null;
    this.#emitIntelHook('created', record);
    return record;
  }

  static async updateIntel(intelOrRecordId, patch = {}) {
    if (!globalThis.game?.user?.isGM) return null;
    const record = await this.getIntelById(intelOrRecordId);
    if (!record) return null;
    const existing = record.metadata?.[INTEL_METADATA_KEY] ?? {};
    const next = normalizeIntelMetadata({ ...existing, ...patch, id: existing.id }, existing, { touchUpdatedAt: true });
    record.state = lifecycleStateForIntelStatus(next.status);
    applyIntelToRecord(record, next);
    const ok = await HolonetStorage.saveRecord(record);
    if (!ok) return null;
    this.#emitIntelHook('updated', record);
    return record;
  }

  static async markReady(intelOrRecordId) {
    return this.updateIntel(intelOrRecordId, {
      status: INTEL_STATUS.READY,
      readyAt: nowIso()
    });
  }

  static async releaseIntel(intelOrRecordId, patch = {}) {
    const record = await this.updateIntel(intelOrRecordId, {
      ...patch,
      status: INTEL_STATUS.RELEASED,
      revealState: patch.revealState ?? INTEL_REVEAL_STATE.FULLY_REVEALED,
      releasedAt: nowIso()
    });
    if (record) this.#emitIntelHook('released', record);
    return record;
  }

  static async archiveIntel(intelOrRecordId, { reason = null } = {}) {
    if (!globalThis.game?.user?.isGM) return null;
    const record = await this.getIntelById(intelOrRecordId);
    if (!record) return null;
    const existing = record.metadata?.[INTEL_METADATA_KEY] ?? {};
    const next = normalizeIntelMetadata({
      ...existing,
      status: INTEL_STATUS.ARCHIVED,
      archivedAt: nowIso()
    }, existing, { touchUpdatedAt: true });
    record.archive();
    record.metadata = {
      ...(record.metadata ?? {}),
      [INTEL_METADATA_KEY]: next,
      archiveReason: reason ?? record.metadata?.archiveReason ?? null
    };
    const ok = await HolonetStorage.saveRecord(record);
    if (!ok) return null;
    this.#emitIntelHook('archived', record);
    return record;
  }

  static async destroyIntel(intelOrRecordId, { reason = null } = {}) {
    if (!globalThis.game?.user?.isGM) return null;
    const record = await this.getIntelById(intelOrRecordId);
    if (!record) return null;
    const existing = record.metadata?.[INTEL_METADATA_KEY] ?? {};
    const next = normalizeIntelMetadata({
      ...existing,
      status: INTEL_STATUS.DESTROYED,
      revealState: INTEL_REVEAL_STATE.DESTROYED,
      destroyedAt: nowIso()
    }, existing, { touchUpdatedAt: true });
    record.archive();
    record.metadata = {
      ...(record.metadata ?? {}),
      [INTEL_METADATA_KEY]: next,
      destroyReason: reason ?? record.metadata?.destroyReason ?? null
    };
    const ok = await HolonetStorage.saveRecord(record);
    if (!ok) return null;
    this.#emitIntelHook('destroyed', record);
    return record;
  }

  static async buildDraftFromFaction(faction = {}, overrides = {}) {
    const factionId = cleanString(faction.id ?? faction.key ?? overrides.linkedFactionId);
    const title = cleanString(overrides.title, `${cleanString(faction.name, 'Faction')} Dossier`);
    const body = cleanString(overrides.publicBody ?? overrides.body ?? faction.playerNotes ?? faction.description ?? faction.summary);
    return this.createIntelDraft({
      kind: INTEL_KIND.FACTION_DOSSIER,
      classification: INTEL_CLASSIFICATION.RESTRICTED,
      linkedFactionId: factionId,
      title,
      summary: cleanString(overrides.summary ?? body, `Known intelligence on ${cleanString(faction.name, 'this faction')}.`),
      publicBody: body,
      gmNotes: cleanString(overrides.gmNotes ?? faction.gmNotes),
      tags: uniqueStrings([...(faction.tags ?? []), ...(overrides.tags ?? []), 'faction']),
      ...overrides
    });
  }

  static async buildDraftFromContact(faction = {}, contact = {}, overrides = {}) {
    const factionId = cleanString(faction.id ?? faction.key ?? overrides.linkedFactionId ?? contact.factionId);
    const contactId = cleanString(contact.id ?? overrides.linkedContactId);
    const contactName = cleanString(contact.name, 'Named Contact');
    const factionName = cleanString(faction.name, 'Faction');
    const title = cleanString(overrides.title, `${contactName} — Contact Dossier`);
    const body = cleanString(overrides.publicBody ?? overrides.body ?? contact.publicNotes ?? contact.description);
    return this.createIntelDraft({
      kind: INTEL_KIND.NPC_DOSSIER,
      classification: INTEL_CLASSIFICATION.RESTRICTED,
      linkedFactionId: factionId,
      linkedContactId: contactId,
      linkedActorUuid: cleanString(contact.actorUuid ?? overrides.linkedActorUuid),
      title,
      summary: cleanString(overrides.summary ?? body, `${contactName}, associated with ${factionName}.`),
      publicBody: body,
      gmNotes: cleanString(overrides.gmNotes ?? contact.gmNotes),
      tags: uniqueStrings([...(contact.tags ?? []), ...(overrides.tags ?? []), 'npc', 'contact']),
      ...overrides
    });
  }

  static async duplicateIntel(intelOrRecordId, overrides = {}) {
    const record = await this.getIntelById(intelOrRecordId);
    if (!record) return null;
    const intel = this.getIntelMetadata(record);
    if (!intel) return null;
    return this.createIntelDraft({
      ...intel,
      id: randomId(),
      recordId: undefined,
      status: INTEL_STATUS.DRAFT,
      title: cleanString(overrides.title, `${intel.title} Copy`),
      createdAt: nowIso(),
      readyAt: null,
      releasedAt: null,
      archivedAt: null,
      destroyedAt: null,
      ...overrides
    });
  }

  static async deliverAsSecretNote(intelOrRecordId, options = {}) {
    if (!globalThis.game?.user?.isGM) return null;
    const record = await this.getIntelById(intelOrRecordId);
    const intel = this.getIntelMetadata(record);
    if (!record || !intel) return null;
    const recipientIds = recipientIdsFromVisibility(intel, options);
    if (!recipientIds.length) {
      globalThis.ui?.notifications?.warn?.('Secret Note delivery needs at least one player recipient.');
      return null;
    }
    const { HolonetMessengerService } = await import('./holonet-messenger-service.js');
    const decryptionPayload = buildDecryptionPayload(intel, options);
    const result = await HolonetMessengerService.issueSecretNote({
      actor: options.actor ?? null,
      threadId: options.threadId ?? null,
      recipientIds,
      title: options.title ?? intel.title,
      body: options.body ?? bodyForIntel(intel, decryptionPayload ? 'redacted' : 'public'),
      imageUrl: options.imageUrl ?? '',
      attachments: options.attachments ?? [],
      expiresAfterSeconds: options.expiresAfterSeconds ?? 0,
      source: 'intel',
      senderRecipientId: options.senderRecipientId ?? null,
      decryptionPayload,
      sourceIntelId: intel.id
    });
    if (!result) return null;
    const updated = await this.releaseIntel(record.id, {
      persistence: options.persistence ?? (decryptionPayload ? INTEL_PERSISTENCE.ENCRYPTED : INTEL_PERSISTENCE.SECRET_NOTE),
      revealState: decryptionPayload ? INTEL_REVEAL_STATE.SEALED : INTEL_REVEAL_STATE.REDACTED,
      delivery: deliverySummary(intel, {
        mode: 'secret-note',
        result,
        recipientIds,
        encrypted: Boolean(decryptionPayload)
      })
    });
    return { ok: true, mode: 'secret-note', result, record: updated };
  }

  static async deliverAsMessengerMessage(intelOrRecordId, options = {}) {
    if (!globalThis.game?.user?.isGM) return null;
    const record = await this.getIntelById(intelOrRecordId);
    const intel = this.getIntelMetadata(record);
    if (!record || !intel) return null;
    const recipientIds = recipientIdsFromVisibility(intel, options);
    if (!recipientIds.length && !options.threadId) {
      globalThis.ui?.notifications?.warn?.('Messenger delivery needs a thread or at least one player recipient.');
      return null;
    }
    const { HolonetMessengerService } = await import('./holonet-messenger-service.js');
    const result = await HolonetMessengerService.sendMessage({
      actor: options.actor ?? null,
      threadId: options.threadId ?? null,
      recipientIds,
      body: options.body ?? bodyForIntel(intel, 'public'),
      imageUrl: options.imageUrl ?? '',
      attachments: options.attachments ?? [],
      senderRecipientId: options.senderRecipientId ?? null
    });
    if (!result) return null;
    const updated = await this.releaseIntel(record.id, {
      persistence: INTEL_PERSISTENCE.MESSAGE,
      revealState: INTEL_REVEAL_STATE.FULLY_REVEALED,
      delivery: deliverySummary(intel, { mode: 'messenger', result, recipientIds })
    });
    return { ok: true, mode: 'messenger', result, record: updated };
  }

  static async deliverAsBulletin(intelOrRecordId, options = {}) {
    if (!globalThis.game?.user?.isGM) return null;
    const record = await this.getIntelById(intelOrRecordId);
    const intel = this.getIntelMetadata(record);
    if (!record || !intel) return null;
    const bulletin = BulletinSource.createBulletinMessage({
      title: options.title ?? intel.title,
      body: options.body ?? bodyForIntel(intel, 'public'),
      priority: options.priority ?? 'normal',
      audience: audienceFromVisibility(intel, options),
      category: 'intel',
      metadata: {
        sourceIntelId: intel.id,
        intelDelivery: true,
        [INTEL_METADATA_KEY]: intel
      }
    });
    bulletin.metadata = {
      ...(bulletin.metadata ?? {}),
      sourceIntelId: intel.id,
      intelDelivery: true,
      [INTEL_METADATA_KEY]: intel
    };
    bulletin.projections = [
      { surfaceType: SURFACE_TYPE.HOME_FEED, recordId: bulletin.id, isPinned: false, metadata: { sourceIntelId: intel.id, intelDelivery: true } },
      { surfaceType: SURFACE_TYPE.GM_DATAPAD_BULLETIN, recordId: bulletin.id, isPinned: false, metadata: { sourceIntelId: intel.id, intelDelivery: true } }
    ];
    bulletin.publish();
    bulletin.recipients = HolonetDeliveryRouter.resolveRecipients(bulletin);
    for (const recipient of bulletin.recipients) bulletin.setDeliveryState(recipient.id, DELIVERY_STATE.DELIVERED);
    const ok = await HolonetStorage.saveRecord(bulletin);
    if (!ok) return null;
    HolonetSocketService.emitSync({ type: 'record-published', recordId: bulletin.id, source: 'intel-bulletin', intelId: intel.id });
    const updated = await this.releaseIntel(record.id, {
      persistence: INTEL_PERSISTENCE.BULLETIN,
      revealState: INTEL_REVEAL_STATE.FULLY_REVEALED,
      delivery: deliverySummary(intel, { mode: 'bulletin', recordId: bulletin.id, recipientIds: bulletin.recipients?.map(r => r.id) ?? [] })
    });
    return { ok: true, mode: 'bulletin', result: { recordId: bulletin.id }, record: updated };
  }

  static async releaseToDossier(intelOrRecordId, options = {}) {
    if (!globalThis.game?.user?.isGM) return null;
    const record = await this.getIntelById(intelOrRecordId);
    const intel = this.getIntelMetadata(record);
    if (!record || !intel) return null;
    const needsDecryption = Boolean(intel.skillGate?.enabled || intel.lockbox?.enabled);
    const nextRevealState = options.revealState ?? (needsDecryption ? INTEL_REVEAL_STATE.SEALED : INTEL_REVEAL_STATE.FULLY_REVEALED);
    const decoded = [INTEL_REVEAL_STATE.DECODED, INTEL_REVEAL_STATE.FULLY_REVEALED].includes(nextRevealState);
    const nextLockbox = intel.lockbox?.enabled
      ? normalizeLockbox({ ...intel.lockbox, status: decoded ? INTEL_LOCKBOX_STATUS.CLAIMABLE : INTEL_LOCKBOX_STATUS.SEALED })
      : intel.lockbox;
    const updated = await this.releaseIntel(record.id, {
      persistence: INTEL_PERSISTENCE.DOSSIER,
      revealState: nextRevealState,
      dossierCommit: true,
      lockbox: nextLockbox,
      delivery: deliverySummary(intel, { mode: 'dossier', recipientIds: recipientIdsFromVisibility(intel, options) })
    });
    if (updated && needsDecryption) await this.ensureDecryptionPayload(updated.id, { ...options, encrypted: true });
    HolonetSocketService.emitSync({ type: 'intel-dossier-released', recordId: record.id, intelId: intel.id });
    return { ok: true, mode: 'dossier', record: updated };
  }

  static async getPlayerIntel(actor = null, filters = {}) {
    const actorIds = actor?.id ? [actor.id] : currentUserActorIds();
    const userId = globalThis.game?.user?.id ?? '';
    const records = await this.getAllIntel({ includeArchived: true });
    const visible = records.filter(record => {
      const intel = record?.metadata?.[INTEL_METADATA_KEY];
      if (!intel || intel.status !== INTEL_STATUS.RELEASED || intel.dossierCommit !== true) return false;
      if ([INTEL_STATUS.ARCHIVED, INTEL_STATUS.DESTROYED].includes(intel.status)) return false;
      const mode = intel.visibility?.mode ?? 'gm-only';
      if (mode === 'public' || mode === 'party') return true;
      if (mode === 'selected-players') {
        return safeArray(intel.visibility?.userIds).includes(userId) || safeArray(intel.visibility?.actorIds).some(id => actorIds.includes(id));
      }
      return globalThis.game?.user?.isGM === true;
    });
    const locker = actorFlagState(actor);
    const mapped = uniqueRecords(visible).map(record => {
      const intel = this.getIntelMetadata(record);
      const state = normalizeLockerEntry(locker[intel.id] ?? locker[record.id] ?? {});
      return {
        record,
        intel,
        state,
        decryption: this.getIntelDecryptionView(record, { actor, isGm: globalThis.game?.user?.isGM === true }),
        lockbox: this.getIntelLockboxView(record)
      };
    }).filter(entry => filters.includeArchived || !entry.state.archived);
    const search = cleanString(filters.search).toLowerCase();
    const filtered = search ? mapped.filter(entry => [entry.intel.title, entry.intel.summary, entry.intel.publicBody, entry.intel.fullBody, entry.intel.redactedBody, entry.intel.gmNotes, ...(entry.intel.tags ?? [])].join(' ').toLowerCase().includes(search)) : mapped;
    return filtered.sort((a, b) => Number(b.state.pinned) - Number(a.state.pinned) || Date.parse(b.intel.releasedAt || b.intel.updatedAt || 0) - Date.parse(a.intel.releasedAt || a.intel.updatedAt || 0));
  }

  static async updatePlayerIntelState(actor, intelOrRecordId, patch = {}) {
    if (!actor?.setFlag) return false;
    const record = await this.getIntelById(intelOrRecordId);
    const intel = this.getIntelMetadata(record);
    if (!record || !intel) return false;
    const current = actorFlagState(actor);
    current[intel.id] = normalizeLockerEntry({
      ...(current[intel.id] ?? {}),
      ...patch,
      updatedAt: nowIso()
    });
    await actor.setFlag('foundryvtt-swse', 'intelLocker', current);
    globalThis.Hooks?.callAll('swseHolonetUpdated', { type: 'intel-locker-updated', actorId: actor.id, intelId: intel.id });
    return true;
  }

  static async attemptIntelDecryption(intelOrRecordId, { actor = null, skillKey = 'useComputer', requesterId = null, targetCipherLetter = '' } = {}) {
    const record = await this.getIntelById(intelOrRecordId);
    const intel = this.getIntelMetadata(record);
    if (!record || !intel) return null;
    const payload = record.metadata?.decryptionPayload ?? buildDecryptionPayload(intel, { skill: skillKey });
    if (!payload) return null;
    const result = HolonetDecryptionService.attempt(payload, { actor, skillKey, requesterId: requesterId ?? globalThis.game?.user?.id, targetCipherLetter });
    record.metadata = {
      ...(record.metadata ?? {}),
      decryptionPayload: result.payload
    };
    const nextIntel = normalizeIntelMetadata({
      ...intel,
      revealState: result.payload?.solved ? INTEL_REVEAL_STATE.DECODED : intel.revealState,
      lockbox: result.payload?.solved && intel.lockbox?.enabled ? normalizeLockbox({ ...intel.lockbox, status: INTEL_LOCKBOX_STATUS.CLAIMABLE }) : intel.lockbox,
      skillGate: {
        ...(intel.skillGate ?? {}),
        result: result.payload?.solved ? 'success' : (result.payload?.failed ? 'failed' : 'pending'),
        resolvedAt: result.payload?.solved ? nowIso() : intel.skillGate?.resolvedAt,
        resolvedByUserId: result.payload?.solved ? (requesterId ?? globalThis.game?.user?.id) : intel.skillGate?.resolvedByUserId
      }
    }, intel, { touchUpdatedAt: true });
    applyIntelToRecord(record, nextIntel);
    record.metadata.decryptionPayload = result.payload;
    await HolonetStorage.saveRecord(record);
    this.#emitIntelHook('decryption-attempted', record);
    return result;
  }


  static getIntelDecryptionView(record = null, { actor = null, isGm = false } = {}) {
    if (!record) return null;
    const intel = this.getIntelMetadata(record);
    if (!intel) return null;
    const payload = record.metadata?.decryptionPayload ?? null;
    if (!payload?.enabled) return null;
    return HolonetDecryptionService.toViewModel(payload, { actor, isGm });
  }

  static getIntelLockboxView(record = null) {
    const intel = this.getIntelMetadata(record);
    if (!intel) return buildLockboxView({ enabled: false });
    return buildLockboxView(intel.lockbox, { decoded: intelIsDecoded(intel, record) });
  }

  static async ensureDecryptionPayload(intelOrRecordId, options = {}) {
    if (!globalThis.game?.user?.isGM) return null;
    const record = await this.getIntelById(intelOrRecordId);
    const intel = this.getIntelMetadata(record);
    if (!record || !intel) return null;
    if (record.metadata?.decryptionPayload?.enabled) return record.metadata.decryptionPayload;
    const payload = buildDecryptionPayload(intel, options);
    if (!payload?.enabled) return null;
    record.metadata = { ...(record.metadata ?? {}), decryptionPayload: payload };
    const ok = await HolonetStorage.saveRecord(record);
    if (!ok) return null;
    this.#emitIntelHook('decryption-created', record);
    return payload;
  }

  static async requestIntelDecryption(intelOrRecordId, { actor = null, skillKey = 'useComputer', targetCipherLetter = '' } = {}) {
    const payload = {
      actorId: actor?.id ?? null,
      intelId: cleanString(intelOrRecordId),
      skillKey: cleanString(skillKey, 'useComputer'),
      targetCipherLetter: cleanString(targetCipherLetter),
      requesterId: globalThis.game?.user?.id ?? null
    };
    if (!payload.intelId) return false;
    if (!globalThis.game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('attempt-intel-decryption', payload);
      return { pending: true, requestId, intelId: payload.intelId };
    }
    return this._gmAttemptIntelDecryption(payload);
  }

  static async _gmAttemptIntelDecryption({ actorId = null, intelId = '', skillKey = 'useComputer', requesterId = null, targetCipherLetter = '' } = {}) {
    if (!globalThis.game?.user?.isGM) return false;
    const actor = actorId ? globalThis.game?.actors?.get?.(actorId) : (requesterId ? globalThis.game?.users?.get?.(requesterId)?.character : null);
    if (!requesterCanUseActor(actor, requesterId)) return false;
    const result = await this.attemptIntelDecryption(intelId, { actor, skillKey, requesterId, targetCipherLetter });
    if (!result) return false;
    HolonetSocketService.emitSync({ type: 'intel-decryption-attempted', intelId, actorId: actor?.id ?? null, solved: Boolean(result.payload?.solved), failed: Boolean(result.payload?.failed), requesterId });
    return { ok: true, pending: false, solved: Boolean(result.payload?.solved), failed: Boolean(result.payload?.failed), total: result.total ?? null };
  }

  static async selectIntelCipher(intelOrRecordId, { cipherLetter = '' } = {}) {
    const record = await this.getIntelById(intelOrRecordId);
    const intel = this.getIntelMetadata(record);
    const payload = record?.metadata?.decryptionPayload ?? (intel ? buildDecryptionPayload(intel, {}) : null);
    if (!record || !intel || !payload?.enabled) return null;
    const result = HolonetDecryptionService.selectCipher(payload, { cipherLetter });
    if (!result?.payload) return result;
    record.metadata = { ...(record.metadata ?? {}), decryptionPayload: result.payload };
    await HolonetStorage.saveRecord(record);
    this.#emitIntelHook('decryption-selected', record);
    return result;
  }

  static async requestIntelCipherSelection(intelOrRecordId, { cipherLetter = '' } = {}) {
    const payload = {
      intelId: cleanString(intelOrRecordId),
      cipherLetter: cleanString(cipherLetter),
      requesterId: globalThis.game?.user?.id ?? null
    };
    if (!payload.intelId) return false;
    if (!globalThis.game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('select-intel-cipher', payload);
      return { pending: true, requestId, intelId: payload.intelId };
    }
    return this._gmSelectIntelCipher(payload);
  }

  static async _gmSelectIntelCipher({ intelId = '', cipherLetter = '', requesterId = null } = {}) {
    if (!globalThis.game?.user?.isGM) return false;
    const result = await this.selectIntelCipher(intelId, { cipherLetter, requesterId });
    if (!result) return false;
    HolonetSocketService.emitSync({ type: 'intel-decryption-selected', intelId, cipherLetter, requesterId });
    return { ok: Boolean(result.ok), selectedCipherLetter: result.selectedCipherLetter ?? '' };
  }

  static async guessIntelCipher(intelOrRecordId, { cipherLetter = '', plainLetter = '', requesterId = null } = {}) {
    const record = await this.getIntelById(intelOrRecordId);
    const intel = this.getIntelMetadata(record);
    const payload = record?.metadata?.decryptionPayload ?? (intel ? buildDecryptionPayload(intel, {}) : null);
    if (!record || !intel || !payload?.enabled) return null;
    const result = HolonetDecryptionService.guess(payload, { cipherLetter, plainLetter, requesterId: requesterId ?? globalThis.game?.user?.id });
    if (!result?.payload) return result;
    record.metadata = { ...(record.metadata ?? {}), decryptionPayload: result.payload };
    const nextIntel = normalizeIntelMetadata({
      ...intel,
      revealState: result.payload?.solved ? INTEL_REVEAL_STATE.DECODED : intel.revealState,
      lockbox: result.payload?.solved && intel.lockbox?.enabled ? normalizeLockbox({ ...intel.lockbox, status: INTEL_LOCKBOX_STATUS.CLAIMABLE }) : intel.lockbox,
      skillGate: {
        ...(intel.skillGate ?? {}),
        result: result.payload?.solved ? 'success' : (intel.skillGate?.result ?? 'pending'),
        resolvedAt: result.payload?.solved ? nowIso() : intel.skillGate?.resolvedAt,
        resolvedByUserId: result.payload?.solved ? (requesterId ?? globalThis.game?.user?.id) : intel.skillGate?.resolvedByUserId
      }
    }, intel, { touchUpdatedAt: true });
    applyIntelToRecord(record, nextIntel);
    record.metadata.decryptionPayload = result.payload;
    await HolonetStorage.saveRecord(record);
    this.#emitIntelHook('decryption-guessed', record);
    return result;
  }

  static async requestIntelCipherGuess(intelOrRecordId, { cipherLetter = '', plainLetter = '' } = {}) {
    const payload = {
      intelId: cleanString(intelOrRecordId),
      cipherLetter: cleanString(cipherLetter),
      plainLetter: cleanString(plainLetter),
      requesterId: globalThis.game?.user?.id ?? null
    };
    if (!payload.intelId) return false;
    if (!globalThis.game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('guess-intel-cipher', payload);
      return { pending: true, requestId, intelId: payload.intelId };
    }
    return this._gmGuessIntelCipher(payload);
  }

  static async _gmGuessIntelCipher({ intelId = '', cipherLetter = '', plainLetter = '', requesterId = null } = {}) {
    if (!globalThis.game?.user?.isGM) return false;
    const result = await this.guessIntelCipher(intelId, { cipherLetter, plainLetter, requesterId });
    if (!result) return false;
    HolonetSocketService.emitSync({ type: 'intel-decryption-guessed', intelId, cipherLetter, plainLetter, solved: Boolean(result.payload?.solved), requesterId });
    return { ok: Boolean(result.ok), solved: Boolean(result.payload?.solved), correct: Boolean(result.correct) };
  }

  static async forceDecryptIntel(intelOrRecordId, { reason = 'GM override decrypted this Intel lockbox.' } = {}) {
    if (!globalThis.game?.user?.isGM) return false;
    const record = await this.getIntelById(intelOrRecordId);
    const intel = this.getIntelMetadata(record);
    if (!record || !intel) return false;
    const payload = record.metadata?.decryptionPayload ?? buildDecryptionPayload(intel, { encrypted: true });
    if (!payload?.enabled) return false;
    const result = HolonetDecryptionService.forceSolve(payload, { reason });
    record.metadata = { ...(record.metadata ?? {}), decryptionPayload: result.payload };
    const nextIntel = normalizeIntelMetadata({
      ...intel,
      revealState: INTEL_REVEAL_STATE.DECODED,
      lockbox: intel.lockbox?.enabled ? normalizeLockbox({ ...intel.lockbox, status: INTEL_LOCKBOX_STATUS.CLAIMABLE }) : intel.lockbox,
      skillGate: {
        ...(intel.skillGate ?? {}),
        result: 'success',
        resolvedAt: nowIso(),
        resolvedByUserId: globalThis.game?.user?.id ?? null
      }
    }, intel, { touchUpdatedAt: true });
    applyIntelToRecord(record, nextIntel);
    record.metadata.decryptionPayload = result.payload;
    await HolonetStorage.saveRecord(record);
    HolonetSocketService.emitSync({ type: 'intel-force-decrypted', intelId: intel.id, recordId: record.id });
    this.#emitIntelHook('force-decrypted', record);
    return { ok: true, record };
  }

  static async claimIntelLockbox(intelOrRecordId, { actor = null } = {}) {
    const payload = {
      actorId: actor?.id ?? null,
      intelId: cleanString(intelOrRecordId),
      requesterId: globalThis.game?.user?.id ?? null
    };
    if (!payload.intelId) return false;
    if (!globalThis.game?.user?.isGM) {
      const requestId = HolonetSocketService.emitRequest('claim-intel-lockbox', payload);
      return { pending: true, requestId, intelId: payload.intelId };
    }
    return this._gmClaimIntelLockbox(payload);
  }

  static async _gmClaimIntelLockbox({ actorId = null, intelId = '', requesterId = null } = {}) {
    if (!globalThis.game?.user?.isGM) return false;
    const actor = actorId ? globalThis.game?.actors?.get?.(actorId) : (requesterId ? globalThis.game?.users?.get?.(requesterId)?.character : null);
    if (!requesterCanUseActor(actor, requesterId)) return false;
    const record = await this.getIntelById(intelId);
    const intel = this.getIntelMetadata(record);
    if (!record || !intel) return false;
    const lockbox = normalizeLockbox(intel.lockbox);
    if (!lockboxHasRewards(lockbox)) return { ok: false, reason: 'empty-lockbox' };
    if (lockbox.status === INTEL_LOCKBOX_STATUS.CLAIMED || lockbox.claimedAt) return { ok: false, reason: 'already-claimed' };
    if (!intelIsDecoded(intel, record)) return { ok: false, reason: 'locked' };

    const itemData = [];
    for (const entry of lockbox.items) {
      if (!entry.uuid) continue;
      let doc = null;
      try { doc = typeof fromUuid === 'function' ? await fromUuid(entry.uuid) : null; } catch (_err) { doc = null; }
      if (!doc || doc.documentName !== 'Item') {
        const failed = normalizeLockbox({ ...lockbox, status: INTEL_LOCKBOX_STATUS.FAILED, claimError: `Could not resolve item UUID: ${entry.uuid}` });
        await this.updateIntel(record.id, { lockbox: failed });
        return { ok: false, reason: 'missing-item', uuid: entry.uuid };
      }
      const data = doc.toObject?.() ?? clonePlain(doc, {});
      delete data._id;
      data.flags ??= {};
      data.flags['foundryvtt-swse'] ??= {};
      data.flags['foundryvtt-swse'].intelLockbox = { sourceIntelId: intel.id, sourceRecordId: record.id, originalUuid: entry.uuid, claimedAt: nowIso() };
      if (entry.quantity > 1) {
        data.system ??= {};
        data.system.quantity = entry.quantity;
      }
      itemData.push(data);
    }

    let createdItems = [];
    let creditResult = null;
    try {
      if (itemData.length) {
        createdItems = await ActorEngine.createEmbeddedDocuments(actor, 'Item', itemData, { source: 'holonet-intel-lockbox' });
      }
      if (Number(lockbox.credits || 0) > 0) {
        creditResult = await TransactionEngine.executeCreditAdjustment({
          actor,
          amount: Number(lockbox.credits || 0),
          reason: `Intel lockbox reward: ${intel.title}`,
          transactionContext: 'holonet-gm-grant',
          audit: {
            source: 'HolonetIntelService.claimIntelLockbox',
            intelId: intel.id,
            recordId: record.id,
            lockboxLabel: lockbox.label,
            itemNames: itemData.map(item => item.name).filter(Boolean)
          }
        }, { source: 'HolonetIntelService.claimIntelLockbox', validate: true, rederive: true });
        if (!creditResult?.success) throw new Error(creditResult?.error || 'Credit grant failed');
      }
    } catch (err) {
      if (createdItems.length) {
        try { await ActorEngine.deleteEmbeddedDocuments(actor, 'Item', createdItems.map(item => item.id).filter(Boolean), { source: 'holonet-intel-lockbox-rollback' }); } catch (rollbackErr) { console.error('[HolonetIntelService] Lockbox item rollback failed:', rollbackErr); }
      }
      const failed = normalizeLockbox({ ...lockbox, status: INTEL_LOCKBOX_STATUS.FAILED, claimError: err.message || String(err) });
      await this.updateIntel(record.id, { lockbox: failed });
      return { ok: false, reason: 'claim-failed', error: err.message || String(err) };
    }

    const claimed = normalizeLockbox({
      ...lockbox,
      status: INTEL_LOCKBOX_STATUS.CLAIMED,
      claimedAt: nowIso(),
      claimedByActorId: actor.id,
      claimedByActorName: actor.name,
      creditTransactionId: creditResult?.transactionId ?? '',
      claimedItemIds: createdItems.map(item => item.id).filter(Boolean),
      items: lockbox.items.map((entry, index) => ({
        ...entry,
        claimedItemId: createdItems[index]?.id ?? entry.claimedItemId ?? '',
        claimedItemName: createdItems[index]?.name ?? entry.name ?? ''
      }))
    });
    const updated = await this.updateIntel(record.id, { lockbox: claimed });
    HolonetSocketService.emitSync({ type: 'intel-lockbox-claimed', intelId: intel.id, recordId: record.id, actorId: actor.id, requesterId });
    return { ok: true, actorId: actor.id, record: updated, credits: lockbox.credits, itemCount: createdItems.length, transactionId: creditResult?.transactionId ?? null };
  }

  static #emitIntelHook(action, record) {
    const intel = record?.metadata?.[INTEL_METADATA_KEY] ?? null;
    globalThis.Hooks?.callAll('swseHolonet:intelUpdated', {
      action,
      recordId: record?.id ?? null,
      intelId: intel?.id ?? null,
      status: intel?.status ?? null,
      linkedFactionId: intel?.linkedFactionId ?? null,
      linkedContactId: intel?.linkedContactId ?? null
    });
    globalThis.Hooks?.callAll('swseHolonetUpdated', {
      type: `intel-${action}`,
      recordId: record?.id ?? null,
      intelId: intel?.id ?? null
    });
  }
}
