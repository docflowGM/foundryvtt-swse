/** GM Faction Relationship Manager surface view-model. */

import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { HolonetStorage } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js';
import { HolonetIntelService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js';
import { FactionJobBridgeService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/FactionJobBridgeService.js';
import { LocationRegistryService } from '/systems/foundryvtt-swse/scripts/locations/location-registry-service.js';

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
function optionLabel(options = [], value = '') { return options.find(entry => entry.value === value)?.label || value || ''; }
function selectOptions(options = [], selected = '') { return options.map(entry => ({ ...entry, selected: entry.value === selected })); }
function uniqueStrings(values = []) {
  const seen = new Set();
  const out = [];
  for (const value of Array.isArray(values) ? values : []) {
    const clean = String(value || '').trim();
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(clean);
  }
  return out;
}

function locationChain(location = {}, records = []) {
  const byId = new Map(asArray(records).map(entry => [entry.id, entry]));
  const rows = [];
  let current = location;
  const seen = new Set();
  while (current?.id && !seen.has(current.id)) {
    seen.add(current.id);
    rows.unshift(current.name);
    current = current.parentLocationId ? byId.get(current.parentLocationId) : null;
  }
  return rows.filter(Boolean).join(' → ');
}

function locationVm(location = {}, records = []) {
  const typeLabel = LocationRegistryService.optionLabel(LocationRegistryService.TYPES, location.type);
  const revealLabel = LocationRegistryService.optionLabel(LocationRegistryService.REVEAL_STATES, location.revealState);
  return {
    id: location.id,
    name: location.name,
    type: location.type,
    typeLabel,
    chain: locationChain(location, records) || location.name,
    revealState: location.revealState,
    revealLabel,
    knownToPlayers: Boolean(location.knownToPlayers || ['known', 'active', 'compromised'].includes(location.revealState)),
    activeForParty: Boolean(location.activeForParty || location.revealState === 'active'),
    hasScene: Boolean(location.map?.sceneUuid || asArray(location.linkedSceneUuids).length),
    intelCount: asArray(location.linkedIntelIds).length,
    jobCount: asArray(location.linkedJobIds).length,
    contactCount: asArray(location.contactIds).length,
    seedCount: asArray(location.encounterSeeds).length
  };
}

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

function contactVm(contact = {}, faction = {}, jobs = [], options = {}) {
  const jobStats = FactionJobBridgeService.summarizeJobsByIssuer(jobs, {
    factionId: faction.id,
    factionName: faction.name,
    contactId: contact.id,
    contactName: contact.name
  });
  const dispositionOptions = options.dispositions || [];
  const revealStateOptions = options.revealStates || [];
  const contactIntelRows = asArray(options.intelRows).filter(row => row.linkedFactionId === faction.id && row.linkedContactId === contact.id);
  const linkedIntelIds = uniqueStrings([
    ...(Array.isArray(contact.linkedIntelIds) ? contact.linkedIntelIds : []),
    ...contactIntelRows.map(row => row.intelId || row.recordId)
  ]);
  const hasSecretIntel = Boolean(contact.secret || contact.gmNotes || linkedIntelIds.length);
  const contactLocationRows = asArray(options.locationRows).filter(row => asArray(row.raw?.contactIds).includes(contact.id));
  return {
    ...contact,
    tagsLabel: Array.isArray(contact.tags) ? contact.tags.join(', ') : String(contact.tags || ''),
    linkedIntelIdsLabel: linkedIntelIds.join(', '),
    hasLinkedIntel: linkedIntelIds.length > 0,
    linkedIntelCount: linkedIntelIds.length,
    recentIntel: contactIntelRows.slice(0, 3),
    locationRows: contactLocationRows.map(row => row.view),
    locationCount: contactLocationRows.length,
    knownLocationCount: contactLocationRows.filter(row => row.view.knownToPlayers).length,
    activeLocationName: contactLocationRows.find(row => row.view.activeForParty)?.view?.name || '',
    hasActorLink: Boolean(contact.actorId || contact.actorUuid),
    actorLinkLabel: contact.actorName || contact.actorUuid || contact.actorId || '',
    defaultRewardLabel: defaultRewardLabel(contact),
    dispositionLabel: optionLabel(dispositionOptions, contact.disposition),
    dispositionOptions: selectOptions(dispositionOptions, contact.disposition),
    revealStateLabel: optionLabel(revealStateOptions, contact.revealState),
    revealStateOptions: selectOptions(revealStateOptions, contact.revealState),
    visibilityLabel: contact.knownToPlayers ? 'Player Visible' : 'GM Only',
    jobStats,
    recentJobs: jobStats.recentJobs,
    intelCount: linkedIntelIds.length,
    dossierSecretStateLabel: hasSecretIntel ? 'Has GM Intel' : 'No Secrets Logged',
    dossierTypeLabel: contact.actorId || contact.actorUuid ? 'Actor-linked NPC' : 'Lightweight NPC',
    searchText: searchText(
      contact.name,
      contact.role,
      contact.title,
      contact.description,
      contact.publicNotes,
      contact.gmNotes,
      contact.lastKnownLocation,
      contact.agenda,
      contact.secret,
      contact.factionRank,
      contact.disposition,
      contact.revealState,
      contact.tags
    )
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
    const contactOptions = {
      dispositions: FactionRegistryService.getContactDispositionOptions(),
      revealStates: FactionRegistryService.getContactRevealStateOptions()
    };
    const jobs = await this._loadJobRows();
    const intelRows = await this._loadIntelRows();
    const locations = LocationRegistryService.getRegistry();
    const locationRows = locations.map(location => ({ raw: location, view: locationVm(location, locations) }));
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
      pageTitle: 'Galactic Dossier',
      pageDescription: 'GM-owned influence ledger for factions, named contacts, party standings, and future Intel releases.',
      factionManager: {
        registry: registrySummary.factions.map((record) => {
          const location = splitPlanetSystem(record.planetSystem);
          const jobStats = FactionJobBridgeService.summarizeJobsByIssuer(jobs, {
            factionId: record.id,
            factionName: record.name
          });
          const factionLocationRows = locationRows.filter(row => (
            row.raw.controllingFactionId === record.id
            || asArray(row.raw.factionIds).includes(record.id)
            || asArray(row.raw.factionPresence).some(entry => entry.factionId === record.id)
          ));
          const contacts = asArray(record.contacts).map(contact => ({
            ...contactVm(contact, record, jobs, { ...contactOptions, intelRows, locationRows }),
            isFocused: Boolean(focusedContactId && contact.id === focusedContactId)
          }));
          const factionIntelCount = intelRows.filter(row => row.linkedFactionId === record.id).length;
          const isFocused = Boolean((focusedFactionId && record.id === focusedFactionId) || (focusedFactionName && String(record.name || '').trim().toLowerCase() === focusedFactionName));
          return {
            ...record,
            planet: location.planet,
            system: location.system,
            scoreClass: scoreClass(record.score),
            scoreLabel: scoreLabel(record.score),
            contactCount: contacts.length,
            contacts,
            intelCount: factionIntelCount,
            locationRows: factionLocationRows.map(row => row.view),
            locationCount: factionLocationRows.length,
            knownLocationCount: factionLocationRows.filter(row => row.view.knownToPlayers).length,
            activeLocationCount: factionLocationRows.filter(row => row.view.activeForParty).length,
            hiddenLocationCount: factionLocationRows.filter(row => !row.view.knownToPlayers).length,
            dossierStateLabel: 'Registry',
            jobStats,
            recentJobs: jobStats.recentJobs,
            defaultRewardLabel: defaultRewardLabel(record),
            knownContactCount: contacts.filter(contact => contact.knownToPlayers).length,
            hiddenContactCount: contacts.filter(contact => !contact.knownToPlayers).length,
            secretContactCount: contacts.filter(contact => contact.secret || contact.gmNotes || contact.hasLinkedIntel).length,
            isFocused,
            searchText: searchText(record.name, record.type, record.planetSystem, record.leader, record.status, record.sourceLabel, contacts.map(contact => contact.searchText).join(' '), factionLocationRows.map(row => row.view.chain).join(' '))
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
        contactDispositions: contactOptions.dispositions,
        contactRevealStates: contactOptions.revealStates,
        counts: {
          registry: registrySummary.count,
          relationships: activeRelationships.length,
          suggestions: suggestions.length,
          actorsWithRelationships: new Set(activeRelationships.map(row => row.actorId)).size,
          jobs: jobs.length,
          contacts: registrySummary.factions.reduce((sum, faction) => sum + asArray(faction.contacts).length, 0),
          intel: intelRows.length,
          factionIntel: intelRows.filter(row => row.linkedFactionId && !row.linkedContactId).length,
          contactIntel: intelRows.filter(row => row.linkedContactId).length
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

  static async _loadIntelRows() {
    try {
      const records = await HolonetIntelService.getAllIntel({ includeArchived: true });
      return asArray(records).map((record) => {
        const intel = HolonetIntelService.getIntelMetadata(record);
        if (!intel) return null;
        return {
          recordId: record.id,
          intelId: intel.id,
          title: intel.title,
          status: intel.status,
          kind: intel.kind,
          classification: intel.classification,
          linkedFactionId: intel.linkedFactionId,
          linkedContactId: intel.linkedContactId,
          updatedAt: intel.updatedAt || record.updatedAt || record.createdAt || ''
        };
      }).filter(Boolean);
    } catch (_err) {
      return [];
    }
  }
}
