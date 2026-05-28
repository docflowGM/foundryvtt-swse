/**
 * FactionRegistryService
 *
 * Lightweight GM-owned faction/organization ledger used by the GM Workspace
 * and future Allies application. This intentionally stores campaign faction
 * authority in one world setting and mirrors actor relationships in actor flags
 * without creating a second economy/reward system.
 */

import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';

const MODULE_ID = 'foundryvtt-swse';
const REGISTRY_SETTING = 'gmFactionRegistry';
const ACTOR_RELATIONSHIPS_FLAG = 'alliesFactionRelationships';
const MAX_HISTORY = 75;

const RELATIONSHIP_TYPES = Object.freeze([
  { value: 'known', label: 'Known Faction' },
  { value: 'member', label: 'Membership' },
  { value: 'enemy', label: 'Enemy / Rival' },
  { value: 'patron', label: 'Patron / Client' },
  { value: 'founder', label: 'Founder / Leader / Owner' },
  { value: 'ally', label: 'Ally' },
  { value: 'neutral', label: 'Neutral' }
]);

const SOURCE_TYPES = Object.freeze([
  { value: 'gm', label: 'GM Manual' },
  { value: 'job', label: 'Job Board' },
  { value: 'organization', label: 'Owned Organization' },
  { value: 'player-suggested', label: 'Player Suggested' }
]);

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

function slugify(value) {
  const base = cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || foundry.utils.randomID();
}

function labelFor(list, value) {
  return list.find(entry => entry.value === value)?.label ?? value;
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

export function registerFactionRegistrySettings() {
  if (game.settings.settings.has(`${MODULE_ID}.${REGISTRY_SETTING}`)) return;
  game.settings.register(MODULE_ID, REGISTRY_SETTING, {
    name: 'GM Faction Registry',
    hint: 'Campaign factions and organizations tracked by the GM Workspace and future Allies application.',
    scope: 'world',
    config: false,
    type: Object,
    default: []
  });
}

export class FactionRegistryService {
  static RELATIONSHIP_TYPES = RELATIONSHIP_TYPES;
  static SOURCE_TYPES = SOURCE_TYPES;
  static REGISTRY_SETTING = REGISTRY_SETTING;
  static ACTOR_RELATIONSHIPS_FLAG = ACTOR_RELATIONSHIPS_FLAG;

  static getRelationshipTypeOptions() {
    return RELATIONSHIP_TYPES.map(entry => ({ ...entry }));
  }

  static getSourceTypeOptions() {
    return SOURCE_TYPES.map(entry => ({ ...entry }));
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
    return this.getRegistry().find(record => record.id === query || record.name.toLowerCase() === needle || slugify(record.name) === needle) ?? null;
  }

  static async upsertFaction(data = {}) {
    const name = cleanText(data.name || data.factionName);
    if (!name) throw new Error('Faction name is required.');
    const records = this.getRegistry();
    const requestedId = cleanText(data.id);
    const byId = requestedId ? records.find(record => record.id === requestedId) : null;
    const byName = records.find(record => record.name.toLowerCase() === name.toLowerCase());
    const existing = byId ?? byName ?? null;
    const id = existing?.id || requestedId || slugify(name);
    const score = normalizeScore(data.score ?? data.startingScore ?? existing?.score ?? 0);
    const source = this._normalizeSource(data.source || existing?.source || 'gm');
    const record = this._normalizeFactionRecord({
      ...existing,
      ...data,
      id,
      name,
      score,
      startingScore: normalizeScore(data.startingScore ?? existing?.startingScore ?? score),
      source,
      status: cleanText(data.status || existing?.status || 'active'),
      updatedAt: nowIso(),
      createdAt: existing?.createdAt || nowIso(),
      history: [
        ...safeArray(existing?.history),
        {
          id: foundry.utils.randomID(),
          at: nowIso(),
          type: existing ? 'faction-updated' : 'faction-created',
          source,
          note: cleanText(data.historyNote || data.notes || '')
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

  static getActorRelationships(actor) {
    if (!actor) return [];
    const records = safeArray(actor.getFlag?.(MODULE_ID, ACTOR_RELATIONSHIPS_FLAG));
    return records.map(record => this._normalizeActorRelationship(record));
  }

  static async saveActorRelationships(actor, relationships = []) {
    if (!actor?.setFlag) throw new Error('Actor relationship update requires a valid actor.');
    const normalized = safeArray(relationships).map(record => this._normalizeActorRelationship(record));
    await actor.setFlag(MODULE_ID, ACTOR_RELATIONSHIPS_FLAG, normalized);
    Hooks.callAll('swseActorFactionRelationshipsUpdated', { actor, relationships: normalized });
    return normalized;
  }

  static async addActorRelationship({ actor, faction = null, factionId = '', factionName = '', relationshipType = 'known', score = 0, benefits = '', notes = '', gmNotes = '', source = 'gm', status = 'active' } = {}) {
    if (!actor) throw new Error('Actor is required to add a faction relationship.');
    const factionRecord = faction || (factionId ? this.findFaction(factionId) : null) || (factionName ? this.findFaction(factionName) : null) || await this.upsertFaction({ name: factionName, source });
    const factionRecordId = factionRecord.id;
    const relationships = this.getActorRelationships(actor);
    const existing = relationships.find(entry => entry.factionId === factionRecordId || entry.factionName.toLowerCase() === factionRecord.name.toLowerCase());
    const nextScore = normalizeScore(score ?? existing?.score ?? factionRecord.score ?? 0);
    const record = this._normalizeActorRelationship({
      ...existing,
      id: existing?.id || foundry.utils.randomID(),
      factionId: factionRecordId,
      factionName: factionRecord.name,
      type: factionRecord.type,
      planetSystem: factionRecord.planetSystem,
      scale: factionRecord.scale,
      leader: factionRecord.leader,
      relationshipType: this._normalizeRelationshipType(relationshipType || existing?.relationshipType || 'known'),
      score: nextScore,
      benefits: cleanText(benefits || existing?.benefits || factionRecord.benefits || ''),
      notes: cleanText(notes || existing?.notes || ''),
      gmNotes: cleanText(gmNotes || existing?.gmNotes || factionRecord.gmNotes || ''),
      source: this._normalizeSource(source || existing?.source || factionRecord.source || 'gm'),
      status: cleanText(status || existing?.status || 'active'),
      updatedAt: nowIso(),
      createdAt: existing?.createdAt || nowIso(),
      history: safeArray(existing?.history).slice(-MAX_HISTORY)
    });
    const next = existing ? relationships.map(entry => entry.id === existing.id ? record : entry) : [...relationships, record];
    await this.saveActorRelationships(actor, next);
    return record;
  }

  static async applyScoreDelta({ actorId = '', actor = null, factionName = '', factionId = '', delta = 0, source = 'job', jobId = '', reason = '', relationshipType = 'known', metadata = {} } = {}) {
    const targetActor = actor || (actorId ? game.actors?.get?.(actorId) : null);
    if (!targetActor) return null;
    const value = normalizeScore(delta);
    const factionLabel = cleanText(factionName || factionId);
    if (!factionLabel || !value) return null;
    const faction = await this.upsertFaction({ id: factionId || '', name: factionLabel, source, historyNote: reason });
    const relationships = this.getActorRelationships(targetActor);
    const existing = relationships.find(entry => entry.factionId === faction.id || entry.factionName.toLowerCase() === faction.name.toLowerCase());
    const before = normalizeScore(existing?.score ?? faction.startingScore ?? faction.score ?? 0);
    const after = before + value;
    const relationship = await this.addActorRelationship({
      actor: targetActor,
      faction,
      relationshipType: existing?.relationshipType || relationshipType || 'known',
      score: after,
      source,
      status: 'active',
      gmNotes: existing?.gmNotes || faction.gmNotes || ''
    });
    relationship.history = [
      ...safeArray(relationship.history),
      {
        id: foundry.utils.randomID(),
        at: nowIso(),
        type: 'score-delta',
        source,
        jobId,
        delta: value,
        before,
        after,
        reason: cleanText(reason)
      }
    ].slice(-MAX_HISTORY);
    const finalRelationships = this.getActorRelationships(targetActor).map(entry => entry.id === relationship.id ? relationship : entry);
    await this.saveActorRelationships(targetActor, finalRelationships);
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
      metadata
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
        factionName,
        delta,
        source: 'job',
        jobId: thread.id,
        reason,
        relationshipType: 'known',
        metadata: { threadId: thread.id, requesterId, status: normalizedStatus }
      });
      if (result) results.push(result);
    }
    return results;
  }

  static summarizeForWorkspace() {
    const factions = this.getRegistry();
    return {
      count: factions.length,
      factions: factions.map(record => ({
        ...record,
        sourceLabel: labelFor(SOURCE_TYPES, record.source),
        scaleLabel: `Scale ${record.scale}`,
        scoreLabel: `${record.score >= 0 ? '+' : ''}${record.score}`
      })).sort((a, b) => a.name.localeCompare(b.name))
    };
  }

  static _normalizeFactionRecord(record = {}) {
    const name = cleanText(record.name || record.factionName || 'Unnamed Faction');
    const source = this._normalizeSource(record.source || 'gm');
    const score = normalizeScore(record.score ?? record.startingScore ?? 0);
    return {
      id: cleanText(record.id) || slugify(name),
      name,
      type: cleanText(record.type || 'Faction'),
      planetSystem: cleanText(record.planetSystem || record.location || ''),
      scale: clampScale(record.scale ?? 1),
      leader: cleanText(record.leader || ''),
      startingScore: normalizeScore(record.startingScore ?? score),
      score,
      benefits: cleanText(record.benefits || ''),
      notes: cleanText(record.notes || ''),
      gmNotes: cleanText(record.gmNotes || ''),
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
      id: cleanText(record.id) || foundry.utils.randomID(),
      factionId: cleanText(record.factionId || slugify(factionName)),
      factionName,
      type: cleanText(record.type || 'Faction'),
      planetSystem: cleanText(record.planetSystem || ''),
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
