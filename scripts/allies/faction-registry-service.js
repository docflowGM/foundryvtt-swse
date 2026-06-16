/**
 * FactionRegistryService
 *
 * GM-owned faction/organization registry plus actor relationship helpers used by
 * the GM Workspace/Factions surfaces, Job Board consequences, and player Allies
 * app. Registry state is world-scoped; actor relationships remain per-actor.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const MODULE_ID = 'foundryvtt-swse';
const REGISTRY_SETTING = 'gmFactionRegistry';
const ACTOR_RELATIONSHIPS_FLAG = 'alliesFactionRelationships';
const LEGACY_FACTIONS_FLAG = 'factions';
const MAX_HISTORY = 75;

const RELATIONSHIP_TYPES = Object.freeze([
  { value: 'known', label: 'Known Faction' },
  { value: 'member', label: 'Membership' },
  { value: 'enemy', label: 'Enemy / Rival' },
  { value: 'patron', label: 'Patron / Client' },
  { value: 'founder', label: 'Founder / Leader / Owner' },
  { value: 'ally', label: 'Ally' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'other', label: 'Other' }
]);

const SOURCE_TYPES = Object.freeze([
  { value: 'gm', label: 'GM Manual' },
  { value: 'job', label: 'Job Board' },
  { value: 'organization', label: 'Owned Organization' },
  { value: 'player-suggested', label: 'Player Suggested' }
]);

const APPROVAL_STATUSES = new Set(['suggested', 'pending', 'pending_approval']);

const CONTACT_DISPOSITIONS = Object.freeze([
  { value: 'unknown', label: 'Unknown' },
  { value: 'ally', label: 'Ally' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'suspicious', label: 'Suspicious' },
  { value: 'rival', label: 'Rival' },
  { value: 'hostile', label: 'Hostile' }
]);

const CONTACT_REVEAL_STATES = Object.freeze([
  { value: 'hidden', label: 'GM Only' },
  { value: 'hinted', label: 'Hinted' },
  { value: 'known', label: 'Known to Players' },
  { value: 'compromised', label: 'Compromised' }
]);

const CONTACT_DISPOSITION_VALUES = new Set(CONTACT_DISPOSITIONS.map(entry => entry.value));
const CONTACT_REVEAL_VALUES = new Set(CONTACT_REVEAL_STATES.map(entry => entry.value));

function nowIso() {
  try { return new Date().toISOString(); } catch (_err) { return ''; }
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value, fallback = '') {
  return String(value ?? fallback ?? '').trim();
}

function clampScale(value) {
  const n = Math.floor(Number(value) || 1);
  return Math.max(1, Math.min(20, n));
}

function normalizeScore(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function randomId() {
  return foundry?.utils?.randomID?.() || globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
}

function slugify(value) {
  const base = cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || randomId();
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(entry => cleanText(entry)).filter(Boolean);
  return cleanText(value).split(',').map(entry => cleanText(entry)).filter(Boolean);
}

function normalizeIdList(value) {
  if (Array.isArray(value)) return value.map(entry => cleanText(entry)).filter(Boolean);
  return cleanText(value).split(',').map(entry => cleanText(entry)).filter(Boolean);
}

function normalizeBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value;
  if (value === undefined || value === null || value === '') return Boolean(fallback);
  const normalized = String(value).trim().toLowerCase();
  if (['true', '1', 'yes', 'on', 'known'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off', 'hidden'].includes(normalized)) return false;
  return Boolean(fallback);
}

function normalizeChoice(value, allowedValues, fallback) {
  const normalized = cleanText(value || fallback).toLowerCase();
  return allowedValues.has(normalized) ? normalized : fallback;
}

function normalizeJobDefaults(record = {}, fallback = {}) {
  const source = record.jobDefaults && typeof record.jobDefaults === 'object'
    ? { ...record.jobDefaults, ...record }
    : record;
  const successDelta = normalizeScore(source.defaultSuccessDelta ?? source.successDelta ?? fallback.defaultSuccessDelta ?? fallback.successDelta ?? 1);
  const failureDelta = normalizeScore(source.defaultFailureDelta ?? source.failureDelta ?? fallback.defaultFailureDelta ?? fallback.failureDelta ?? -1);
  return {
    tone: cleanText(source.defaultJobTone || source.tone || fallback.defaultJobTone || fallback.tone || ''),
    rewardStyle: cleanText(source.defaultRewardStyle || source.rewardStyle || fallback.defaultRewardStyle || fallback.rewardStyle || ''),
    objective: cleanText(source.defaultObjective || source.objective || fallback.defaultObjective || fallback.objective || ''),
    briefing: cleanText(source.defaultBriefing || source.briefing || fallback.defaultBriefing || fallback.briefing || ''),
    instructions: cleanText(source.defaultInstructions || source.instructions || fallback.defaultInstructions || fallback.instructions || ''),
    credits: Math.max(0, normalizeScore(source.defaultCredits ?? source.credits ?? fallback.defaultCredits ?? fallback.credits ?? 0)),
    xp: Math.max(0, normalizeScore(source.defaultXp ?? source.xp ?? fallback.defaultXp ?? fallback.xp ?? 0)),
    successDelta,
    failureDelta,
    visibility: cleanText(source.defaultVisibility || source.visibility || fallback.defaultVisibility || fallback.visibility || 'posted'),
    legality: cleanText(source.defaultLegality || source.legality || fallback.defaultLegality || fallback.legality || ''),
    payStyle: cleanText(source.defaultPayStyle || source.payStyle || fallback.defaultPayStyle || fallback.payStyle || ''),
    rivalFactionName: cleanText(source.defaultRivalFactionName || source.rivalFactionName || source.rivalFaction || fallback.defaultRivalFactionName || fallback.rivalFactionName || fallback.rivalFaction || ''),
    rivalSuccessDelta: normalizeScore(source.defaultRivalSuccessDelta ?? source.rivalSuccessDelta ?? fallback.defaultRivalSuccessDelta ?? fallback.rivalSuccessDelta ?? -1),
    rivalFailureDelta: normalizeScore(source.defaultRivalFailureDelta ?? source.rivalFailureDelta ?? fallback.defaultRivalFailureDelta ?? fallback.rivalFailureDelta ?? 1),
    consequenceNotes: cleanText(source.defaultConsequenceNotes || source.consequenceNotes || fallback.defaultConsequenceNotes || fallback.consequenceNotes || '')
  };
}

function normalizeContact(record = {}) {
  const name = cleanText(record.name || record.contactName || 'Unnamed Contact');
  const role = cleanText(record.role || record.contactRole || record.title || 'Faction Contact');
  const revealState = normalizeChoice(record.revealState || (record.knownToPlayers ? 'known' : 'hidden'), CONTACT_REVEAL_VALUES, 'hidden');
  const knownToPlayers = normalizeBoolean(record.knownToPlayers, revealState === 'known' || revealState === 'compromised');
  return {
    id: cleanText(record.id || record.contactId) || slugify(`${name}-${role}`),
    name,
    role,
    title: cleanText(record.title || ''),
    description: cleanText(record.description || record.notes || ''),
    image: cleanText(record.image || record.img || record.imageUrl || ''),
    actorId: cleanText(record.actorId || record.promotedActorId || ''),
    actorUuid: cleanText(record.actorUuid || record.promotedActorUuid || ''),
    actorName: cleanText(record.actorName || record.promotedActorName || ''),
    promotedAt: cleanText(record.promotedAt || ''),
    tags: normalizeTags(record.tags),

    // Phase 2 dossier fields. These remain lightweight registry metadata and do
    // not duplicate actor stats; promoted NPC actors stay linked by UUID/id.
    disposition: normalizeChoice(record.disposition || record.relationshipDisposition, CONTACT_DISPOSITION_VALUES, 'unknown'),
    revealState,
    knownToPlayers,
    publicNotes: cleanText(record.publicNotes || record.playerNotes || ''),
    gmNotes: cleanText(record.gmNotes || record.privateNotes || ''),
    lastKnownLocation: cleanText(record.lastKnownLocation || record.location || record.locationName || ''),
    agenda: cleanText(record.agenda || record.motivation || ''),
    secret: cleanText(record.secret || record.secretNotes || ''),
    factionRank: cleanText(record.factionRank || record.rank || ''),
    messengerPersonaId: cleanText(record.messengerPersonaId || record.personaId || ''),
    linkedIntelIds: normalizeIdList(record.linkedIntelIds || record.intelIds),

    defaultJobTone: cleanText(record.defaultJobTone || record.jobDefaults?.tone || ''),
    defaultRewardStyle: cleanText(record.defaultRewardStyle || record.jobDefaults?.rewardStyle || ''),
    defaultObjective: cleanText(record.defaultObjective || record.jobDefaults?.objective || ''),
    defaultBriefing: cleanText(record.defaultBriefing || record.jobDefaults?.briefing || ''),
    defaultInstructions: cleanText(record.defaultInstructions || record.jobDefaults?.instructions || ''),
    defaultCredits: Math.max(0, normalizeScore(record.defaultCredits ?? record.jobDefaults?.credits ?? 0)),
    defaultXp: Math.max(0, normalizeScore(record.defaultXp ?? record.jobDefaults?.xp ?? 0)),
    defaultSuccessDelta: normalizeScore(record.defaultSuccessDelta ?? record.jobDefaults?.successDelta ?? 1),
    defaultFailureDelta: normalizeScore(record.defaultFailureDelta ?? record.jobDefaults?.failureDelta ?? -1),
    defaultVisibility: cleanText(record.defaultVisibility || record.jobDefaults?.visibility || 'posted'),
    defaultLegality: cleanText(record.defaultLegality || record.jobDefaults?.legality || ''),
    defaultPayStyle: cleanText(record.defaultPayStyle || record.jobDefaults?.payStyle || ''),
    defaultRivalFactionName: cleanText(record.defaultRivalFactionName || record.jobDefaults?.rivalFactionName || record.rivalFactionName || ''),
    defaultRivalSuccessDelta: normalizeScore(record.defaultRivalSuccessDelta ?? record.jobDefaults?.rivalSuccessDelta ?? -1),
    defaultRivalFailureDelta: normalizeScore(record.defaultRivalFailureDelta ?? record.jobDefaults?.rivalFailureDelta ?? 1),
    defaultConsequenceNotes: cleanText(record.defaultConsequenceNotes || record.jobDefaults?.consequenceNotes || ''),
    jobDefaults: normalizeJobDefaults(record),
    active: record.active === false ? false : true,
    createdAt: cleanText(record.createdAt || nowIso()),
    updatedAt: cleanText(record.updatedAt || record.createdAt || nowIso())
  };
}

function labelFor(list, value) {
  return list.find(entry => entry.value === value)?.label ?? value;
}

function scoreLabel(value) {
  const score = normalizeScore(value);
  return score > 0 ? `+${score}` : score === 0 ? '+0' : String(score);
}

function getSetting(fallback = []) {
  try {
    const value = game.settings?.get?.(MODULE_ID, REGISTRY_SETTING);
    return Array.isArray(value) ? value : fallback;
  } catch (_err) {
    return fallback;
  }
}

async function setSetting(value = []) {
  return game.settings?.set?.(MODULE_ID, REGISTRY_SETTING, Array.isArray(value) ? value : []);
}

function actorLabel(actor) {
  return actor?.name || 'Unknown Actor';
}

function actorUuid(actor) {
  if (!actor) return '';
  try { return actor.uuid || `Actor.${actor.id}`; } catch (_err) { return actor.id ? `Actor.${actor.id}` : ''; }
}

async function resolveActorReference({ uuid = '', actorId = '' } = {}) {
  const byUuid = cleanText(uuid);
  if (byUuid && typeof fromUuid === 'function') {
    try {
      const resolved = await fromUuid(byUuid);
      if (resolved?.documentName === 'Actor' || resolved?.constructor?.documentName === 'Actor') return resolved;
      if (resolved?.actor) return resolved.actor;
    } catch (_err) {}
  }
  const id = cleanText(actorId);
  return id ? game.actors?.get?.(id) || null : null;
}

function parsePlanetSystem(value = '') {
  const raw = cleanText(value);
  if (!raw) return { planet: '', system: '' };
  const [planet, system] = raw.split('/').map(part => cleanText(part));
  return { planet: planet || raw, system: system || '' };
}

function planetSystemFrom(data = {}) {
  const planet = cleanText(data.planet || data.locationPlanet || data.world || '');
  const system = cleanText(data.system || data.starSystem || data.locationSystem || '');
  if (planet && system) return `${planet} / ${system}`;
  return cleanText(data.planetSystem || data.location || planet || system || '');
}

export function registerFactionRegistrySettings() {
  if (game.settings.settings.has(`${MODULE_ID}.${REGISTRY_SETTING}`)) return;
  game.settings.register(MODULE_ID, REGISTRY_SETTING, {
    name: 'GM Faction Registry',
    hint: 'Campaign factions and organizations tracked by the GM Workspace, GM Factions manager, Job Board, and Allies application.',
    scope: 'world',
    config: false,
    type: Object,
    default: []
  });
}

export class FactionRegistryService {
  static RELATIONSHIP_TYPES = RELATIONSHIP_TYPES;
  static SOURCE_TYPES = SOURCE_TYPES;
  static CONTACT_DISPOSITIONS = CONTACT_DISPOSITIONS;
  static CONTACT_REVEAL_STATES = CONTACT_REVEAL_STATES;
  static REGISTRY_SETTING = REGISTRY_SETTING;
  static ACTOR_RELATIONSHIPS_FLAG = ACTOR_RELATIONSHIPS_FLAG;
  static LEGACY_FACTIONS_FLAG = LEGACY_FACTIONS_FLAG;

  static getRelationshipTypeOptions() {
    return RELATIONSHIP_TYPES.map(entry => ({ ...entry }));
  }

  static getSourceTypeOptions() {
    return SOURCE_TYPES.map(entry => ({ ...entry }));
  }

  static getContactDispositionOptions() {
    return CONTACT_DISPOSITIONS.map(entry => ({ ...entry }));
  }

  static getContactRevealStateOptions() {
    return CONTACT_REVEAL_STATES.map(entry => ({ ...entry }));
  }

  static getRegistry() {
    return safeArray(getSetting()).map(record => this._normalizeFactionRecord(record));
  }

  static async saveRegistry(records = []) {
    const normalized = safeArray(records).map(record => this._normalizeFactionRecord(record));
    await setSetting(normalized);
    Hooks.callAll('swseFactionRegistryUpdated', { records: normalized });
    return normalized;
  }

  static findFaction(query = '') {
    const needle = cleanText(query).toLowerCase();
    if (!needle) return null;
    return this.getRegistry().find(record => (
      record.id === query
      || record.id.toLowerCase() === needle
      || record.name.toLowerCase() === needle
      || slugify(record.name) === needle
    )) ?? null;
  }

  static async upsertFaction(data = {}) {
    const name = cleanText(data.name || data.factionName || data.factionLabel);
    if (!name) throw new Error('Faction name is required.');
    const records = this.getRegistry();
    const requestedId = cleanText(data.id || data.factionId);
    const byId = requestedId ? records.find(record => record.id === requestedId) : null;
    const byName = records.find(record => record.name.toLowerCase() === name.toLowerCase());
    const existing = byId ?? byName ?? null;
    const id = existing?.id || requestedId || slugify(name);
    const score = normalizeScore(data.score ?? data.startingScore ?? existing?.score ?? 0);
    const source = this._normalizeSource(data.source || existing?.source || 'gm');
    const historyType = existing ? 'faction-updated' : 'faction-created';
    const historyNote = cleanText(data.historyNote || data.notes || '');
    const record = this._normalizeFactionRecord({
      ...existing,
      ...data,
      id,
      name,
      planetSystem: planetSystemFrom(data) || existing?.planetSystem || '',
      score,
      startingScore: normalizeScore(data.startingScore ?? existing?.startingScore ?? score),
      source,
      status: cleanText(data.status || existing?.status || 'active'),
      updatedAt: nowIso(),
      createdAt: existing?.createdAt || nowIso(),
      history: [
        ...safeArray(existing?.history),
        {
          id: randomId(),
          at: nowIso(),
          type: historyType,
          source,
          note: historyNote
        }
      ].slice(-MAX_HISTORY)
    });
    const next = existing ? records.map(entry => entry.id === existing.id ? record : entry) : [...records, record];
    await this.saveRegistry(next);
    return record;
  }

  static async deleteFaction(factionId) {
    const id = cleanText(factionId);
    if (!id) return false;
    const next = this.getRegistry().filter(record => record.id !== id);
    await this.saveRegistry(next);
    return true;
  }

  static getFactionContacts(factionId = '') {
    const faction = this.findFaction(factionId);
    return faction ? safeArray(faction.contacts).map(contact => normalizeContact(contact)) : [];
  }

  static getAllFactionContacts() {
    return this.getRegistry().flatMap(faction => safeArray(faction.contacts).map(contact => ({
      ...normalizeContact(contact),
      factionId: faction.id,
      factionName: faction.name,
      factionType: faction.type,
      factionImage: faction.image || faction.sigil || '',
      factionScore: faction.score
    })));
  }

  static findFactionContact(factionId = '', contactId = '') {
    const faction = this.findFaction(factionId);
    const needle = cleanText(contactId).toLowerCase();
    if (!faction || !needle) return null;
    const contact = safeArray(faction.contacts).map(entry => normalizeContact(entry)).find(entry => (
      entry.id === contactId
      || entry.id.toLowerCase() === needle
      || entry.name.toLowerCase() === needle
    ));
    return contact ? { faction, contact } : null;
  }

  static async upsertFactionContact(factionId = '', data = {}) {
    const faction = this.findFaction(factionId || data.factionId || data.factionName);
    if (!faction) throw new Error('Faction is required to save a notable NPC/contact.');
    const existingContacts = safeArray(faction.contacts).map(contact => normalizeContact(contact));
    const requestedId = cleanText(data.id || data.contactId);
    const name = cleanText(data.name || data.contactName);
    if (!name) throw new Error('Contact name is required.');
    const existing = existingContacts.find(contact => contact.id === requestedId || contact.name.toLowerCase() === name.toLowerCase()) || null;
    const contact = normalizeContact({
      ...existing,
      ...data,
      id: existing?.id || requestedId || slugify(`${faction.name}-${name}`),
      name,
      updatedAt: nowIso(),
      createdAt: existing?.createdAt || nowIso()
    });
    const contacts = existing
      ? existingContacts.map(entry => entry.id === existing.id ? contact : entry)
      : [...existingContacts, contact];
    const records = this.getRegistry();
    const next = records.map(record => record.id === faction.id ? this._normalizeFactionRecord({ ...record, contacts, updatedAt: nowIso() }) : record);
    await this.saveRegistry(next);
    return { faction: this.findFaction(faction.id), contact };
  }

  static async deleteFactionContact(factionId = '', contactId = '') {
    const faction = this.findFaction(factionId);
    const id = cleanText(contactId);
    if (!faction || !id) return false;
    const contacts = safeArray(faction.contacts).map(contact => normalizeContact(contact)).filter(contact => contact.id !== id);
    const records = this.getRegistry();
    const next = records.map(record => record.id === faction.id ? this._normalizeFactionRecord({ ...record, contacts, updatedAt: nowIso() }) : record);
    await this.saveRegistry(next);
    return true;
  }

  static async promoteFactionContactToActor(factionId = '', contactId = '') {
    const found = this.findFactionContact(factionId, contactId);
    if (!found) throw new Error('Faction contact could not be found.');
    const { faction, contact } = found;

    const existingActor = await resolveActorReference({ uuid: contact.actorUuid, actorId: contact.actorId });
    if (existingActor) {
      await this.upsertFactionContact(faction.id, {
        ...contact,
        actorId: existingActor.id,
        actorUuid: actorUuid(existingActor),
        actorName: existingActor.name,
        promotedAt: contact.promotedAt || nowIso()
      });
      return { faction: this.findFaction(faction.id), contact: this.findFactionContact(faction.id, contact.id)?.contact, actor: existingActor, created: false };
    }

    if (!game.user?.isGM) throw new Error('Only a GM can promote a faction contact to an actor.');
    const actorData = {
      name: contact.name,
      type: 'npc',
      img: contact.image || faction.image || 'icons/svg/mystery-man.svg',
      flags: {
        [MODULE_ID]: {
          factionContact: {
            factionId: faction.id,
            factionName: faction.name,
            contactId: contact.id,
            contactName: contact.name,
            contactRole: contact.role,
            contactTitle: contact.title,
            contactDisposition: contact.disposition,
            contactRevealState: contact.revealState,
            contactKnownToPlayers: contact.knownToPlayers,
            contactFactionRank: contact.factionRank,
            contactLastKnownLocation: contact.lastKnownLocation,
            source: 'faction-registry',
            promotedAt: nowIso()
          }
        }
      }
    };
    const actor = await Actor.create(actorData, { renderSheet: false });
    await this.upsertFactionContact(faction.id, {
      ...contact,
      actorId: actor.id,
      actorUuid: actorUuid(actor),
      actorName: actor.name,
      promotedAt: nowIso()
    });
    return { faction: this.findFaction(faction.id), contact: this.findFactionContact(faction.id, contact.id)?.contact, actor, created: true };
  }

  static getActorRelationships(actor) {
    if (!actor) return [];
    const records = safeArray(actor.getFlag?.(MODULE_ID, ACTOR_RELATIONSHIPS_FLAG));
    return records.map(record => this._normalizeActorRelationship(record));
  }

  static getLegacyFactionRecords(actor) {
    if (!actor) return [];
    return safeArray(actor.getFlag?.(MODULE_ID, LEGACY_FACTIONS_FLAG));
  }

  static async saveActorRelationships(actor, relationships = []) {
    if (!actor?.setFlag) throw new Error('Actor relationship update requires a valid actor.');
    const normalized = safeArray(relationships).map(record => this._normalizeActorRelationship(record));
    await actor.setFlag(MODULE_ID, ACTOR_RELATIONSHIPS_FLAG, normalized);
    Hooks.callAll('swseActorFactionRelationshipsUpdated', { actor, relationships: normalized });
    return normalized;
  }

  static async addActorRelationship({ actor, faction = null, factionId = '', factionName = '', relationshipType = 'known', score = 0, benefits = '', notes = '', gmNotes = '', source = 'gm', status = 'active', history = [] } = {}) {
    if (!actor) throw new Error('Actor is required to add a faction relationship.');
    const factionRecord = faction
      || (factionId ? this.findFaction(factionId) : null)
      || (factionName ? this.findFaction(factionName) : null)
      || await this.upsertFaction({ id: factionId, name: factionName, source });
    const relationships = this.getActorRelationships(actor);
    const existing = relationships.find(entry => entry.factionId === factionRecord.id || entry.factionName.toLowerCase() === factionRecord.name.toLowerCase());
    const nextScore = normalizeScore(score ?? existing?.score ?? factionRecord.score ?? 0);
    const record = this._normalizeActorRelationship({
      ...existing,
      id: existing?.id || randomId(),
      factionId: factionRecord.id,
      factionName: factionRecord.name,
      type: cleanText(factionRecord.type || existing?.type || 'Faction'),
      planetSystem: cleanText(factionRecord.planetSystem || existing?.planetSystem || ''),
      scale: clampScale(factionRecord.scale ?? existing?.scale ?? 1),
      leader: cleanText(factionRecord.leader || existing?.leader || ''),
      relationshipType: this._normalizeRelationshipType(relationshipType || existing?.relationshipType || 'known'),
      score: nextScore,
      benefits: cleanText(benefits || existing?.benefits || factionRecord.benefits || ''),
      notes: cleanText(notes || existing?.notes || ''),
      gmNotes: cleanText(gmNotes || existing?.gmNotes || factionRecord.gmNotes || ''),
      source: this._normalizeSource(source || existing?.source || factionRecord.source || 'gm'),
      status: cleanText(status || existing?.status || 'active'),
      updatedAt: nowIso(),
      createdAt: existing?.createdAt || nowIso(),
      history: safeArray(history).length ? safeArray(history).slice(-MAX_HISTORY) : safeArray(existing?.history).slice(-MAX_HISTORY)
    });
    const next = existing ? relationships.map(entry => entry.id === existing.id ? record : entry) : [...relationships, record];
    await this.saveActorRelationships(actor, next);
    return record;
  }

  static async updateActorRelationship(actor, relationshipId, data = {}) {
    if (!actor || !relationshipId) return null;
    const relationships = this.getActorRelationships(actor);
    const existing = relationships.find(entry => entry.id === relationshipId || entry.factionId === relationshipId);
    if (!existing) return this.addActorRelationship({ actor, ...data, factionId: data.factionId || relationshipId });
    const faction = this.findFaction(data.factionId || existing.factionId || data.factionName || existing.factionName)
      || await this.upsertFaction({ id: data.factionId || existing.factionId, name: data.factionName || existing.factionName, source: data.source || existing.source || 'gm' });
    const updated = this._normalizeActorRelationship({
      ...existing,
      ...data,
      id: existing.id,
      factionId: faction.id,
      factionName: faction.name,
      type: data.type ?? faction.type ?? existing.type,
      planetSystem: planetSystemFrom(data) || faction.planetSystem || existing.planetSystem,
      scale: data.scale ?? faction.scale ?? existing.scale,
      leader: data.leader ?? faction.leader ?? existing.leader,
      updatedAt: nowIso(),
      history: safeArray(existing.history).slice(-MAX_HISTORY)
    });
    const next = relationships.map(entry => entry.id === existing.id ? updated : entry);
    await this.saveActorRelationships(actor, next);
    return updated;
  }

  static async removeActorRelationship(actor, relationshipId) {
    if (!actor || !relationshipId) return false;
    const relationships = this.getActorRelationships(actor);
    const next = relationships.filter(entry => entry.id !== relationshipId && entry.factionId !== relationshipId);
    await this.saveActorRelationships(actor, next);
    return true;
  }

  static async applyScoreDelta({ actorId = '', actor = null, factionName = '', factionId = '', delta = 0, source = 'job', jobId = '', reason = '', relationshipType = 'known', metadata = {} } = {}) {
    const targetActor = actor || (actorId ? game.actors?.get?.(actorId) : null);
    if (!targetActor) return null;
    const value = normalizeScore(delta);
    const factionLabel = cleanText(factionName || factionId);
    if (!factionLabel || !value) return null;
    const existingFaction = this.findFaction(factionId || factionName);
    const faction = existingFaction || await this.upsertFaction({ id: factionId || '', name: factionLabel, source, historyNote: reason });
    const relationships = this.getActorRelationships(targetActor);
    const existing = relationships.find(entry => entry.factionId === faction.id || entry.factionName.toLowerCase() === faction.name.toLowerCase());
    const before = normalizeScore(existing?.score ?? faction.startingScore ?? faction.score ?? 0);
    const after = before + value;
    const historyEntry = {
      id: randomId(),
      at: nowIso(),
      type: 'score-delta',
      source,
      jobId,
      delta: value,
      before,
      after,
      reason: cleanText(reason)
    };
    const relationship = await this.addActorRelationship({
      actor: targetActor,
      faction,
      relationshipType: existing?.relationshipType || relationshipType || 'known',
      score: after,
      source,
      status: 'active',
      benefits: existing?.benefits || faction.benefits || '',
      notes: existing?.notes || '',
      gmNotes: existing?.gmNotes || faction.gmNotes || '',
      history: [...safeArray(existing?.history), historyEntry].slice(-MAX_HISTORY)
    });
    const payload = {
      actorId: targetActor.id,
      actorName: targetActor.name,
      factionId: faction.id,
      factionName: faction.name,
      delta: value,
      before,
      after,
      source,
      jobId,
      reason: cleanText(reason),
      relationship,
      metadata: { ...metadata, autoCreatedFaction: !existingFaction }
    };
    Hooks.callAll('swseFactionScoreChanged', payload);
    Hooks.callAll('swse:factionScoreChanged', payload);
    return payload;
  }

  static async applyJobConsequences({ thread, status = '', requesterId = null } = {}) {
    const job = thread?.metadata?.job ?? null;
    if (!job) return [];
    const consequences = job.factionConsequences || job.relationshipConsequences || {};
    const factionName = cleanText(consequences.factionName || job.client?.factionName || job.client?.name || '');
    if (!factionName) return [];
    const normalizedStatus = cleanText(status || job.status);
    const delta = normalizedStatus === 'failed'
      ? normalizeScore(consequences.failureDelta)
      : normalizedStatus === 'complete'
        ? normalizeScore(consequences.successDelta)
        : 0;
    if (!delta) return [];
    const reason = cleanText(consequences.notes || `Job ${normalizedStatus}: ${job.title || thread?.title || 'Holonet Job'}`);
    return this.applyJobFactionDelta({
      thread,
      factionName,
      delta,
      source: 'job',
      reason,
      requesterId,
      status: normalizedStatus,
      metadata: { status: normalizedStatus }
    });
  }

  static async applyJobFactionDelta({ thread, factionName = '', delta = 0, source = 'job', reason = '', requesterId = null, status = '', metadata = {} } = {}) {
    const factionLabel = cleanText(factionName);
    const value = normalizeScore(delta);
    if (!thread || !factionLabel || !value) return [];
    const actorRows = safeArray(thread.participants)
      .filter(recipient => !String(recipient?.id || '').startsWith('gm:'))
      .filter(recipient => recipient?.actorId)
      .map(recipient => game.actors?.get?.(recipient.actorId))
      .filter(Boolean);
    const uniqueActors = Array.from(new Map(actorRows.map(actor => [actor.id, actor])).values());
    const results = [];
    for (const actor of uniqueActors) {
      const result = await this.applyScoreDelta({
        actor,
        factionName: factionLabel,
        delta: value,
        source,
        jobId: thread.id,
        reason,
        relationshipType: 'known',
        metadata: { threadId: thread.id, requesterId, status, ...metadata }
      });
      if (result) results.push(result);
    }
    return results;
  }

  static async suggestFaction(actor, data = {}) {
    if (!actor) return null;
    const records = this.getLegacyFactionRecords(actor);
    const existing = records.find(entry => entry.id === data.id) || null;
    const record = {
      ...existing,
      id: existing?.id || data.id || `suggested-${randomId()}`,
      factionId: cleanText(data.factionId || existing?.factionId || ''),
      name: cleanText(data.name || data.factionName || existing?.name || 'Suggested Faction'),
      type: cleanText(data.type || existing?.type || 'Faction'),
      planet: cleanText(data.planet || existing?.planet || ''),
      system: cleanText(data.system || existing?.system || ''),
      scale: cleanText(data.scale || existing?.scale || ''),
      leader: cleanText(data.leader || existing?.leader || ''),
      relationshipType: this._normalizeRelationshipType(data.relationshipType || existing?.relationshipType || 'known'),
      benefits: cleanText(existing?.benefits || ''),
      notes: cleanText(data.notes || existing?.notes || data.benefits || ''),
      gmNotes: cleanText(existing?.gmNotes || ''),
      source: 'player-suggested',
      status: 'pending_approval',
      score: normalizeScore(existing?.score ?? 0),
      updatedAt: nowIso(),
      createdAt: existing?.createdAt || nowIso(),
      history: safeArray(existing?.history).slice(-MAX_HISTORY)
    };
    const next = existing ? records.map(entry => entry.id === existing.id ? record : entry) : [...records, record];
    await actor.setFlag(MODULE_ID, LEGACY_FACTIONS_FLAG, next);
    Hooks.callAll('swseActorFactionRelationshipsUpdated', { actor, relationships: this.getActorRelationships(actor), suggestion: record });
    return record;
  }

  static getPendingSuggestions() {
    const rows = [];
    for (const actor of game.actors ?? []) {
      const records = this.getLegacyFactionRecords(actor)
        .filter(record => APPROVAL_STATUSES.has(cleanText(record.status).toLowerCase()));
      for (const record of records) {
        rows.push({ actor, actorId: actor.id, actorName: actorLabel(actor), record: this._normalizeSuggestion(record) });
      }
    }
    return rows.sort((a, b) => a.actorName.localeCompare(b.actorName) || a.record.name.localeCompare(b.record.name));
  }

  static async approveSuggestedFaction({ actorId = '', factionRecordId = '', data = {} } = {}) {
    const actor = actorId ? game.actors?.get?.(actorId) : null;
    if (!actor) return null;
    const records = this.getLegacyFactionRecords(actor);
    const suggestion = records.find(entry => entry.id === factionRecordId || entry.factionId === factionRecordId);
    if (!suggestion) return null;
    const merged = { ...suggestion, ...data };
    const faction = await this.upsertFaction({
      id: merged.factionId || '',
      name: merged.name || merged.factionName,
      type: merged.type,
      planetSystem: planetSystemFrom(merged),
      scale: merged.scale,
      leader: merged.leader,
      benefits: merged.benefits,
      notes: merged.notes,
      gmNotes: merged.gmNotes,
      source: 'player-suggested',
      status: 'active',
      historyNote: `Approved player faction suggestion for ${actorLabel(actor)}.`
    });
    const relationship = await this.addActorRelationship({
      actor,
      faction,
      relationshipType: merged.relationshipType || 'known',
      score: merged.score ?? 0,
      benefits: merged.benefits || faction.benefits,
      notes: merged.notes,
      gmNotes: merged.gmNotes,
      source: 'player-suggested',
      status: 'active',
      history: [
        ...safeArray(merged.history),
        { id: randomId(), at: nowIso(), type: 'suggestion-approved', source: 'gm', reason: cleanText(merged.approvalNote || '') }
      ].slice(-MAX_HISTORY)
    });
    await actor.setFlag(MODULE_ID, LEGACY_FACTIONS_FLAG, records.filter(entry => entry.id !== suggestion.id));
    Hooks.callAll('swseActorFactionRelationshipsUpdated', { actor, relationships: this.getActorRelationships(actor), approvedSuggestion: suggestion });
    return relationship;
  }

  static async rejectSuggestedFaction({ actorId = '', factionRecordId = '', reason = '' } = {}) {
    const actor = actorId ? game.actors?.get?.(actorId) : null;
    if (!actor) return null;
    const records = this.getLegacyFactionRecords(actor);
    const suggestion = records.find(entry => entry.id === factionRecordId || entry.factionId === factionRecordId);
    if (!suggestion) return null;
    const rejected = {
      ...suggestion,
      status: 'rejected',
      gmNotes: cleanText(reason || suggestion.gmNotes || ''),
      updatedAt: nowIso(),
      history: [
        ...safeArray(suggestion.history),
        { id: randomId(), at: nowIso(), type: 'suggestion-rejected', source: 'gm', reason: cleanText(reason) }
      ].slice(-MAX_HISTORY)
    };
    await actor.setFlag(MODULE_ID, LEGACY_FACTIONS_FLAG, records.map(entry => entry.id === suggestion.id ? rejected : entry));
    Hooks.callAll('swseActorFactionRelationshipsUpdated', { actor, relationships: this.getActorRelationships(actor), rejectedSuggestion: rejected });
    return rejected;
  }

  static getAllActorRelationshipRows() {
    const registryById = new Map(this.getRegistry().map(record => [record.id, record]));
    const rows = [];
    for (const actor of game.actors ?? []) {
      for (const relationship of this.getActorRelationships(actor)) {
        const faction = registryById.get(relationship.factionId) || null;
        rows.push(this._relationshipRow(actor, relationship, faction, false));
      }
      for (const legacy of this.getLegacyFactionRecords(actor)) {
        const normalized = this._normalizeSuggestion(legacy);
        if (!APPROVAL_STATUSES.has(normalized.status) && normalized.status !== 'rejected') continue;
        rows.push(this._relationshipRow(actor, normalized, registryById.get(normalized.factionId) || null, true));
      }
    }
    return rows.sort((a, b) => a.actorName.localeCompare(b.actorName) || a.factionName.localeCompare(b.factionName));
  }

  static summarizeForWorkspace() {
    const factions = this.getRegistry();
    return {
      count: factions.length,
      factions: factions.map(record => ({
        ...record,
        sourceLabel: labelFor(SOURCE_TYPES, record.source),
        scaleLabel: `Scale ${record.scale}`,
        scoreLabel: scoreLabel(record.score)
      })).sort((a, b) => a.name.localeCompare(b.name)),
      relationshipCount: this.getAllActorRelationshipRows().filter(row => !row.isSuggestion).length,
      pendingSuggestionCount: this.getPendingSuggestions().length
    };
  }

  static _relationshipRow(actor, relationship, faction = null, isSuggestion = false) {
    const score = normalizeScore(relationship.score ?? faction?.score ?? 0);
    const planetSystem = relationship.planetSystem || faction?.planetSystem || planetSystemFrom(relationship);
    const location = parsePlanetSystem(planetSystem);
    return {
      id: relationship.id,
      actorId: actor.id,
      actorName: actorLabel(actor),
      actorImg: actor.img || actor.prototypeToken?.texture?.src || 'icons/svg/mystery-man.svg',
      factionId: relationship.factionId || faction?.id || slugify(relationship.factionName || relationship.name),
      factionName: relationship.factionName || relationship.name || faction?.name || 'Unnamed Faction',
      type: relationship.type || faction?.type || 'Faction',
      planet: location.planet,
      system: location.system,
      planetSystem,
      scale: relationship.scale ?? faction?.scale ?? 1,
      leader: relationship.leader || faction?.leader || '',
      relationshipType: this._normalizeRelationshipType(relationship.relationshipType || 'known'),
      relationshipTypeLabel: labelFor(RELATIONSHIP_TYPES, this._normalizeRelationshipType(relationship.relationshipType || 'known')),
      score,
      scoreLabel: scoreLabel(score),
      benefits: relationship.benefits || faction?.benefits || '',
      notes: relationship.notes || '',
      gmNotes: relationship.gmNotes || faction?.gmNotes || '',
      source: this._normalizeSource(relationship.source || faction?.source || 'gm'),
      sourceLabel: labelFor(SOURCE_TYPES, this._normalizeSource(relationship.source || faction?.source || 'gm')),
      status: cleanText(relationship.status || 'active'),
      statusLabel: APPROVAL_STATUSES.has(cleanText(relationship.status).toLowerCase()) ? 'Pending Approval' : cleanText(relationship.status || 'active'),
      isSuggestion,
      isPending: APPROVAL_STATUSES.has(cleanText(relationship.status).toLowerCase()),
      isRejected: cleanText(relationship.status).toLowerCase() === 'rejected',
      history: safeArray(relationship.history).slice(-MAX_HISTORY)
    };
  }

  static _normalizeFactionRecord(record = {}) {
    const name = cleanText(record.name || record.factionName || 'Unnamed Faction');
    const source = this._normalizeSource(record.source || 'gm');
    const score = normalizeScore(record.score ?? record.startingScore ?? 0);
    return {
      id: cleanText(record.id || record.factionId) || slugify(name),
      name,
      type: cleanText(record.type || record.kind || 'Faction'),
      planetSystem: planetSystemFrom(record),
      scale: clampScale(record.scale ?? 1),
      leader: cleanText(record.leader || ''),
      startingScore: normalizeScore(record.startingScore ?? score),
      score,
      benefits: cleanText(record.benefits || ''),
      notes: cleanText(record.notes || ''),
      gmNotes: cleanText(record.gmNotes || ''),
      image: cleanText(record.image || record.img || record.imageUrl || record.sigil || ''),
      jobDefaults: normalizeJobDefaults(record, {
        defaultJobTone: record.defaultJobTone,
        defaultRewardStyle: record.defaultRewardStyle,
        defaultObjective: record.defaultObjective,
        defaultBriefing: record.defaultBriefing,
        defaultInstructions: record.defaultInstructions,
        defaultCredits: record.defaultCredits,
        defaultXp: record.defaultXp,
        defaultSuccessDelta: record.defaultSuccessDelta,
        defaultFailureDelta: record.defaultFailureDelta,
        defaultVisibility: record.defaultVisibility,
        defaultLegality: record.defaultLegality,
        defaultPayStyle: record.defaultPayStyle,
        defaultRivalFactionName: record.defaultRivalFactionName,
        defaultRivalSuccessDelta: record.defaultRivalSuccessDelta,
        defaultRivalFailureDelta: record.defaultRivalFailureDelta,
        defaultConsequenceNotes: record.defaultConsequenceNotes
      }),
      contacts: safeArray(record.contacts).map(contact => normalizeContact(contact)),
      source,
      status: cleanText(record.status || 'active'),
      createdAt: cleanText(record.createdAt || nowIso()),
      updatedAt: cleanText(record.updatedAt || record.createdAt || nowIso()),
      history: safeArray(record.history).slice(-MAX_HISTORY)
    };
  }

  static _normalizeActorRelationship(record = {}) {
    const factionName = cleanText(record.factionName || record.name || 'Unnamed Faction');
    return {
      id: cleanText(record.id) || randomId(),
      factionId: cleanText(record.factionId || slugify(factionName)),
      factionName,
      type: cleanText(record.type || record.kind || 'Faction'),
      planetSystem: planetSystemFrom(record),
      scale: clampScale(record.scale ?? 1),
      leader: cleanText(record.leader || ''),
      relationshipType: this._normalizeRelationshipType(record.relationshipType || record.relationship || 'known'),
      score: normalizeScore(record.score),
      benefits: cleanText(record.benefits || ''),
      notes: cleanText(record.notes || ''),
      gmNotes: cleanText(record.gmNotes || ''),
      source: this._normalizeSource(record.source || 'gm'),
      status: cleanText(record.status || 'active'),
      createdAt: cleanText(record.createdAt || nowIso()),
      updatedAt: cleanText(record.updatedAt || record.createdAt || nowIso()),
      history: safeArray(record.history).slice(-MAX_HISTORY)
    };
  }

  static _normalizeSuggestion(record = {}) {
    const factionName = cleanText(record.factionName || record.name || 'Suggested Faction');
    return {
      id: cleanText(record.id) || randomId(),
      factionId: cleanText(record.factionId || ''),
      factionName,
      name: factionName,
      type: cleanText(record.type || 'Faction'),
      planetSystem: planetSystemFrom(record),
      planet: cleanText(record.planet || parsePlanetSystem(record.planetSystem).planet),
      system: cleanText(record.system || parsePlanetSystem(record.planetSystem).system),
      scale: cleanText(record.scale || ''),
      leader: cleanText(record.leader || ''),
      relationshipType: this._normalizeRelationshipType(record.relationshipType || 'known'),
      score: normalizeScore(record.score),
      benefits: cleanText(record.benefits || ''),
      notes: cleanText(record.notes || record.benefits || ''),
      gmNotes: cleanText(record.gmNotes || ''),
      source: 'player-suggested',
      status: cleanText(record.status || 'pending_approval'),
      createdAt: cleanText(record.createdAt || nowIso()),
      updatedAt: cleanText(record.updatedAt || record.createdAt || nowIso()),
      history: safeArray(record.history).slice(-MAX_HISTORY)
    };
  }

  static _normalizeRelationshipType(value) {
    const raw = cleanText(value || 'known');
    return RELATIONSHIP_TYPES.some(entry => entry.value === raw) ? raw : 'known';
  }

  static _normalizeSource(value) {
    const raw = cleanText(value || 'gm');
    return SOURCE_TYPES.some(entry => entry.value === raw) ? raw : 'gm';
  }
}

try {
  globalThis.SWSEFactionRegistryService = FactionRegistryService;
} catch (err) {
  SWSELogger.warn?.('[FactionRegistryService] Unable to expose global service handle.', err);
}
