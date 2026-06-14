/** GM Faction Relationship Manager surface view-model. */

import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { HolonetStorage } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js';
import { FactionJobBridgeService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/FactionJobBridgeService.js';

function asArray(value) { return Array.isArray(value) ? value : []; }
function scoreClass(score) { return score > 0 ? 'is-positive' : score < 0 ? 'is-negative' : 'is-neutral'; }
function scoreLabel(score) { return score > 0 ? `+${score}` : score === 0 ? '+0' : String(score); }
function splitPlanetSystem(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return { planet: '', system: '' };
  const [planet, system] = raw.split('/').map(part => String(part || '').trim());
  return { planet: planet || raw, system: system || '' };
}
function searchText(...parts) { return parts.map(part => String(part || '').toLowerCase()).join(' '); }

function safeJob(job = {}, thread = {}) {
  const issuer = FactionJobBridgeService.normalizeJobIssuer(job);
  return {
    threadId: thread.id || job.threadId || job.id || '',
    title: job.title || thread.title || 'Job Board Posting',
    status: job.status || 'posted',
    issuer,
    client: job.client || {},
    factionConsequences: job.factionConsequences || {},
    createdAt: thread.createdAt || job.createdAt || '',
    updatedAt: thread.updatedAt || job.updatedAt || thread.createdAt || '',
    rawJob: job
  };
}

function defaultRewardLabel(record = {}) {
  const credits = Number(record.defaultCredits ?? record.jobDefaults?.credits ?? 0) || 0;
  const xp = Number(record.defaultXp ?? record.jobDefaults?.xp ?? 0) || 0;
  const bits = [];
  if (credits) bits.push(`${credits.toLocaleString()} cr`);
  if (xp) bits.push(`${xp.toLocaleString()} XP`);
  if (record.defaultRewardStyle || record.jobDefaults?.rewardStyle) bits.push(record.defaultRewardStyle || record.jobDefaults.rewardStyle);
  return bits.join(' · ');
}

function contactVm(contact = {}, faction = {}, jobs = []) {
  const jobStats = FactionJobBridgeService.summarizeJobsByIssuer(jobs, {
    factionId: faction.id,
    factionName: faction.name,
    contactId: contact.id,
    contactName: contact.name
  });
  return {
    ...contact,
    tagsLabel: Array.isArray(contact.tags) ? contact.tags.join(', ') : String(contact.tags || ''),
    hasActorLink: Boolean(contact.actorId || contact.actorUuid),
    actorLinkLabel: contact.actorName || contact.actorUuid || contact.actorId || '',
    defaultRewardLabel: defaultRewardLabel(contact),
    jobStats,
    recentJobs: jobStats.recentJobs
  };
}

function actorOption(actor) {
  return {
    id: actor.id,
    name: actor.name || 'Unnamed Actor',
    type: actor.type || 'actor',
    img: actor.img || actor.prototypeToken?.texture?.src || 'icons/svg/mystery-man.svg'
  };
}

export class GMFactionRelationshipSurfaceService {
  static async buildViewModel(host) {
    const surfaceState = host?.getSurfaceState?.('factions') || {};
    const focusedFactionId = String(surfaceState.focusedFactionId || '').trim();
    const focusedFactionName = String(surfaceState.focusedFactionName || '').trim().toLowerCase();
    const focusedContactId = String(surfaceState.focusedContactId || '').trim();
    const registrySummary = FactionRegistryService.summarizeForWorkspace();
    const jobs = await this._loadJobRows();
    const relationships = FactionRegistryService.getAllActorRelationshipRows().map((row) => ({
      ...row,
      scoreClass: scoreClass(row.score),
      scoreLabel: scoreLabel(row.score),
      registryMissing: !FactionRegistryService.findFaction(row.factionId || row.factionName),
      canEdit: !row.isSuggestion
    }));
    const suggestions = FactionRegistryService.getPendingSuggestions().map((row) => ({
      actorId: row.actorId,
      actorName: row.actorName,
      id: row.record.id,
      name: row.record.name,
      type: row.record.type,
      relationshipType: row.record.relationshipType,
      notes: row.record.notes,
      status: row.record.status
    }));
    const actors = Array.from(game.actors ?? [])
      .filter(actor => ['character', 'npc', 'droid'].includes(actor.type) || actor.hasPlayerOwner || actor.isOwner)
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
      .map(actorOption);
    const activeRelationships = relationships.filter(row => !row.isSuggestion);

    return {
      pageTitle: 'Faction Manager',
      pageDescription: 'GM-owned campaign faction registry, party-wide actor relationships, score adjustments, and player suggestions.',
      factionManager: {
        registry: registrySummary.factions.map((record) => {
          const location = splitPlanetSystem(record.planetSystem);
          const jobStats = FactionJobBridgeService.summarizeJobsByIssuer(jobs, {
            factionId: record.id,
            factionName: record.name
          });
          const contacts = asArray(record.contacts).map(contact => ({
            ...contactVm(contact, record, jobs),
            isFocused: Boolean(focusedContactId && contact.id === focusedContactId)
          }));
          const isFocused = Boolean((focusedFactionId && record.id === focusedFactionId) || (focusedFactionName && String(record.name || '').trim().toLowerCase() === focusedFactionName));
          return {
            ...record,
            planet: location.planet,
            system: location.system,
            scoreClass: scoreClass(record.score),
            scoreLabel: scoreLabel(record.score),
            contactCount: contacts.length,
            contacts,
            jobStats,
            recentJobs: jobStats.recentJobs,
            defaultRewardLabel: defaultRewardLabel(record),
            isFocused,
            searchText: searchText(record.name, record.type, record.planetSystem, record.leader, record.status, record.sourceLabel)
          };
        }),
        relationships: activeRelationships.map(row => ({
          ...row,
          searchText: searchText(row.actorName, row.factionName, row.type, row.planetSystem, row.relationshipType, row.status, row.sourceLabel),
          missingRegistryLabel: row.registryMissing ? 'Registry missing / stale link' : ''
        })),
        suggestions,
        actors,
        relationshipTypes: FactionRegistryService.getRelationshipTypeOptions(),
        sourceTypes: FactionRegistryService.getSourceTypeOptions(),
        counts: {
          registry: registrySummary.count,
          relationships: activeRelationships.length,
          suggestions: suggestions.length,
          actorsWithRelationships: new Set(activeRelationships.map(row => row.actorId)).size,
          jobs: jobs.length,
          contacts: registrySummary.factions.reduce((sum, faction) => sum + asArray(faction.contacts).length, 0)
        },
        hasRegistry: registrySummary.factions.length > 0,
        hasRelationships: activeRelationships.length > 0,
        hasSuggestions: suggestions.length > 0,
        hasActors: actors.length > 0
      }
    };
  }

  static async _loadJobRows() {
    try {
      const threads = await HolonetStorage.getAllThreads();
      return asArray(threads)
        .filter(thread => thread?.metadata?.threadType === 'job')
        .map(thread => safeJob(thread?.metadata?.job || {}, thread));
    } catch (_err) {
      return [];
    }
  }
}
