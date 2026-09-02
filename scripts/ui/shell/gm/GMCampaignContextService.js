/**
 * GMCampaignContextService
 *
 * Ecosystem Redesign Phase 6 — the thin, READ-ONLY cross-authority
 * relationship-resolution layer the Phase 6 spec calls for. It answers
 * "what is related to this?"; it never answers "change the relationship."
 *
 * It owns no canonical campaign data and performs no mutation of any
 * kind — every method here only READS from the same real authorities
 * Locations/Factions/Job Board/Intel/Workspace/Home already read from
 * (LocationRegistryService, FactionRegistryService, HolonetStorage,
 * HolonetIntelService, GameSessionStore, SkillChallengeStore,
 * GMPartyRosterService, GMHealingTrigger, Foundry's game.actors/
 * game.scenes/game.combat). See tests/gm-campaign-context-read-only-
 * contract.test.mjs for the executed proof.
 *
 * Per the Phase 6 addendum, not every relationship is the same KIND of
 * relationship, and this service's return shapes preserve that
 * distinction rather than flattening everything into one bag:
 *
 *   relationships — one canonical campaign object references another by
 *                    stable id (Location<->Faction, Job<->Intel, ...).
 *                    Safe to resolve; these are the Phase 1-5 hubs.
 *   operations    — two systems operate on the SAME subject, not a
 *                    relationship between two different objects
 *                    (Actor<->Healing, Actor<->Trade, Actor<->Combat/Scene).
 *   workflows     — reserved for provenance-only handoffs (Intel->Bulletin
 *                    etc.) — Phase 6 does not populate this yet; no
 *                    provenance ids exist on Bulletin records to resolve
 *                    (see the audit doc's missing-link table). Present in
 *                    every subject context as an empty object so callers
 *                    have a stable shape to check against, never omitted.
 *   limitations   — honest strings naming a gap in the current data model,
 *                    never a guess standing in for one.
 *
 * Every relationship/operation row uses the common contract:
 *   { kind, id, label, status, resolved, resolutionKind }
 * A missing/broken reference reports resolved:false, resolutionKind:
 * 'missing' — it is never silently dropped and never fabricated.
 *
 * Phase 6 CORRECTION PASS (post-independent-review): wherever a real,
 * already-proven Phase 1-5 resolver function exists (Job Board's
 * resolveIssuerFaction/resolveIssuerContact/resolveJobLocations/
 * resolveJobIntel/resolveConsequenceFactions/factionConsequenceEntries,
 * Intel's resolveIntelLocation/resolveIntelSourceFact/resolveIntelJob/
 * resolveIntelScene/resolveIntelActor, Locations' own
 * getLocationsForFaction(), Faction's own filterJobsByIssuer()), this
 * service calls it directly instead of maintaining a second, narrower
 * copy of the same matching rules — guaranteeing behavioral parity by
 * construction rather than by promise. Those five Job Board functions and
 * five Intel functions were exported (an additive `export` keyword only,
 * zero logic change) specifically for this reuse.
 *
 * Canonical-id resolution in THIS file's own direct authority calls (not
 * inside a reused resolver, which keeps its own established compatibility
 * rules) always uses an exact-id-only lookup (exactFaction/exactLocation/
 * exactContact below) rather than FactionRegistryService.findFaction()/
 * LocationRegistryService.findLocation(), which also match on display
 * name — a canonical path must never label a name match `canonical-id`.
 *
 * Explicitly NOT built here, per the Phase 6 spec: another router (use
 * GMDatapad.navigateToSurface()/GMCampaignTargetService), another event
 * bus, a persistent cache, or a parallel relationship database. Every
 * lookup below is computed fresh, once per call, from the real
 * authorities — nothing is cached across calls.
 */

import { LocationRegistryService } from '/systems/foundryvtt-swse/scripts/locations/location-registry-service.js';
import { FactionRegistryService } from '/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js';
import { HolonetStorage } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-storage.js';
import { HolonetIntelService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js';
import { HolonetStateService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-state-service.js';
import { GameSessionStore } from '/systems/foundryvtt-swse/scripts/games/game-session-store.js';
import { GMPartyRosterService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/utils/gm-party-roster-service.js';
import { GMHealingTrigger } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-healing-trigger.js';
import { GMCombatRecoveryService } from '/systems/foundryvtt-swse/scripts/holonet/subsystems/gm-combat-recovery-service.js';
import { SWSELogger } from '/systems/foundryvtt-swse/scripts/utils/logger.js';
import {
  jobForThread, jobStatus, statusLabel as jobStatusLabel,
  resolveIssuerFaction, resolveIssuerContact, resolveJobLocations, resolveJobIntel,
  resolveConsequenceFactions, factionConsequenceEntries
} from '/systems/foundryvtt-swse/scripts/ui/shell/gm/GMJobBoardSurfaceService.js';
import { GMTradeConsoleSurfaceService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/GMTradeConsoleSurfaceService.js';
import { FactionJobBridgeService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/FactionJobBridgeService.js';
import {
  parseWorldDocId, isCompendiumUuid,
  resolveIntelLocation, resolveIntelSourceFact, resolveIntelJob, resolveIntelScene, resolveIntelActor
} from '/systems/foundryvtt-swse/scripts/ui/shell/gm/GMIntelSurfaceService.js';

const THREAD_TYPE_JOB = 'job';

function text(value, fallback = '') {
  const out = String(value ?? fallback ?? '').trim();
  return out || fallback;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function row({ kind, id = '', label = '', status = '', resolved = false, resolutionKind = 'missing' }) {
  return { kind, id, label, status, resolved, resolutionKind };
}

function safeCollection(collection) {
  if (!collection) return [];
  if (Array.isArray(collection)) return collection;
  if (collection.contents) return Array.from(collection.contents);
  if (collection.values) return Array.from(collection.values());
  try { return Array.from(collection); } catch (_err) { return []; }
}

async function safeSettingArray(key) {
  try {
    const { SettingsHelper } = await import('/systems/foundryvtt-swse/scripts/utils/settings-helper.js');
    return SettingsHelper.getArray(key, []);
  } catch (_err) {
    return [];
  }
}

// --- exact-id-only lookups (Correction 12) --------------------------------
// FactionRegistryService.findFaction()/LocationRegistryService.findLocation()
// also match on display name/slug, which is correct for their own
// search/legacy-compatibility use but wrong for a "canonical id" claim.
// These never fall back to a name match, so resolutionKind:'canonical-id'
// is only ever reported for a genuine id hit.
function exactFaction(id) {
  const clean = text(id);
  if (!clean) return null;
  return (FactionRegistryService.getRegistry?.() ?? []).find(faction => faction.id === clean) ?? null;
}

function exactLocation(id) {
  const clean = text(id);
  if (!clean) return null;
  return (LocationRegistryService.getRegistry?.() ?? []).find(location => location.id === clean) ?? null;
}

function exactContact(factionId, contactId) {
  const faction = exactFaction(factionId);
  const clean = text(contactId);
  if (!faction || !clean) return null;
  return asArray(faction.contacts).find(contact => contact.id === clean) ?? null;
}

function resolveActorByAnyRef(actorRef) {
  if (actorRef && typeof actorRef === 'object') {
    const byId = actorRef.id ? game.actors?.get?.(text(actorRef.id)) : null;
    if (byId) return byId;
    const byUuid = actorRef.uuid ? safeCollection(game.actors).find(candidate => candidate.uuid === actorRef.uuid) : null;
    if (byUuid) return byUuid;
    return null;
  }
  const ref = text(actorRef);
  if (!ref) return null;
  const bareId = ref.startsWith('Actor.') ? ref.slice(6) : ref;
  const byId = game.actors?.get?.(bareId);
  if (byId) return byId;
  return safeCollection(game.actors).find(candidate => candidate.uuid === ref) ?? null;
}

// --- shared, per-call job/intel indexes ------------------------------------
// Loaded at most once per call, never persisted across calls (Phase 6O —
// no service-owned cache).
async function loadJobIndex() {
  const threads = await HolonetStorage.getAllThreads();
  return threads
    .filter(thread => thread?.metadata?.threadType === THREAD_TYPE_JOB)
    .map(thread => ({ thread, job: jobForThread(thread) }));
}

async function loadIntelIndex() {
  const records = await HolonetIntelService.getAllIntel({ includeArchived: true });
  return records
    .map(record => HolonetIntelService.getIntelMetadata(record))
    .filter(Boolean);
}

/**
 * CORRECTION 1: truthful, kind-aware wording for a real
 * GMCombatRecoveryService.buildActorCard() needsAttention:true card.
 * Droids/Vehicles never receive organic-rest wording ("eligible for
 * natural healing") — they get repair/condition wording instead, since
 * GMCombatRecoveryService itself never grants them rest eligibility.
 */
function recoveryAttentionDetail(card) {
  if (card.isDroid || card.isVehicle) {
    if (card.downed) return `${card.kindLabel} disabled — repair required.`;
    if (card.conditionPersistent) return `${card.kindLabel} has a persistent condition track impairment — repair required.`;
    if (card.ctImpaired) return `${card.kindLabel} condition track is impaired — repair/reset required.`;
    return `${card.kindLabel} requires repair/condition attention.`;
  }
  if (card.downed) return 'Down/disabled — requires immediate attention.';
  if (card.conditionPersistent) return 'Persistent condition track impairment.';
  if (card.ctImpaired) return 'Condition track impaired.';
  if (card.wounded) return 'Wounded and eligible for natural healing/recovery.';
  if (card.secondWindSpent) return 'Second Wind spent.';
  if (card.activePoisonCount > 0) return 'Active poison requires treatment.';
  if (card.activeOngoingEffectCount > 0) return 'Active ongoing effect requires attention.';
  return 'Requires recovery attention.';
}

function jobRow(thread, job) {
  const status = jobStatus(job);
  return row({
    kind: 'job',
    id: thread.id,
    label: text(job?.title || thread.title, 'Job Board Posting'),
    status,
    resolved: true,
    resolutionKind: 'canonical-id'
  });
}

function intelRow(intel) {
  return row({ kind: 'intel', id: intel.id, label: intel.title, status: intel.status, resolved: true, resolutionKind: 'canonical-id' });
}

function factionRow(faction) {
  if (!faction) return null;
  return row({ kind: 'faction', id: faction.id, label: faction.name, resolved: true, resolutionKind: 'canonical-id' });
}

function locationRow(location) {
  if (!location) return null;
  return row({ kind: 'location', id: location.id, label: location.name, resolved: true, resolutionKind: 'canonical-id' });
}

/**
 * Translate a raw {thread, job} pair into the flat-field shape Job Board's
 * own resolveIssuerFaction()/resolveIssuerContact()/resolveJobLocations()
 * expect (they were written against GMJobBoardSurfaceService's job CARD
 * shape, not the raw Holonet job metadata object). This mirrors the exact
 * same five field-extraction lines _buildJobCard() itself uses — trivial,
 * stable reads, never resolution/matching logic — so the actual
 * compatibility RULES stay a single, reused implementation; only this
 * mechanical field renaming is duplicated. Building the full job card
 * (rewards/objectives/participants) would be correct too but far more
 * expensive for a context lookup that only needs issuer identity.
 */
function jobResolverCard(thread, job) {
  return {
    threadId: thread.id,
    title: job?.title || thread.title,
    issuerFactionId: job?.issuer?.factionId || '',
    factionName: job?.issuer?.factionName || job?.client?.factionName || job?.faction?.name || '',
    issuerContactId: job?.issuer?.contactId || '',
    issuerContactActorId: job?.issuer?.contactActorId || job?.client?.actorId || '',
    issuerContactActorUuid: job?.issuer?.contactActorUuid || job?.client?.actorUuid || '',
    issuer: job?.issuer || null,
    rawJob: job
  };
}

/**
 * Strict current-party-Location resolution (Correction 2): ONLY
 * activeForParty === true counts, matching LocationRegistryService
 * .setPartyLocation() (which enforces exactly one such record) and
 * GMLocationsSurfaceService's own isCurrent (Boolean(location.activeForParty),
 * no revealState fallback). Legacy/corrupt data could still contain more
 * than one activeForParty:true record — that is reported as an honest
 * ambiguity, never resolved to an arbitrary pick.
 */
function currentPartyLocationResult() {
  const candidates = (LocationRegistryService.getRegistry?.() ?? []).filter(location => location.activeForParty === true);
  if (candidates.length === 1) return { location: candidates[0], ambiguous: false, candidates };
  if (candidates.length > 1) return { location: null, ambiguous: true, candidates };
  return { location: null, ambiguous: false, candidates: [] };
}

export class GMCampaignContextService {
  /** Party-wide context. Not a subject lookup — its own small contract. */
  static async party() {
    const partyActors = GMPartyRosterService.getPartyActors({ ownedOnly: false });
    const users = safeCollection(game.users).filter(user => !user?.isGM);
    const onlinePlayers = users.filter(user => user?.active).length;
    const { location: activeLocation, ambiguous, candidates } = currentPartyLocationResult();
    const partyState = await HolonetStateService.getPartyState().catch(() => null);
    const limitations = [];
    if (ambiguous) {
      limitations.push(`${candidates.length} Locations are all marked activeForParty:true — LocationRegistryService.setPartyLocation() should prevent this, so this is legacy/corrupt data. Reporting the current party Location as unresolved rather than guessing which one is authoritative.`);
    }
    if (partyState?.location && !activeLocation) {
      limitations.push('Party state has a free-text location that does not match any Location.activeForParty entry — see the dual-representation finding in the audit doc; this service reports Location.activeForParty as the identity-bearing source.');
    }
    return {
      partySize: partyActors.length,
      onlinePlayers,
      totalPlayers: users.length,
      currentLocation: locationRow(activeLocation),
      objective: text(partyState?.objective),
      situation: text(partyState?.situation),
      partyStateLocationText: text(partyState?.location),
      inCombat: Boolean(game.combat?.started),
      limitations
    };
  }

  static async forLocation(locationId) {
    const id = text(locationId);
    const location = id ? exactLocation(id) : null;
    const subject = row({ kind: 'location', id, label: location?.name || '', resolved: Boolean(location), resolutionKind: location ? 'canonical-id' : 'missing' });
    if (!location) return { subject, party: {}, relationships: {}, operations: {}, workflows: {}, limitations: ['Location not found for the given id.'] };

    // Factions: union of controllingFactionId + factionIds[] + factionPresence[]
    // (mirrors GMLocationsSurfaceService.factionRelationshipRows() exactly).
    const factionIds = Array.from(new Set([
      text(location.controllingFactionId),
      ...asArray(location.factionIds).map(text),
      ...asArray(location.factionPresence).map(entry => text(entry.factionId))
    ].filter(Boolean)));
    const factions = factionIds.map((fid) => {
      const faction = exactFaction(fid);
      const isController = fid === text(location.controllingFactionId);
      if (!faction) return row({ kind: 'faction', id: fid, resolutionKind: 'missing' });
      return { ...factionRow(faction), role: isController ? 'controlling' : 'presence' };
    });

    // Contacts (Faction-registry contacts linked via location.contactIds,
    // scanned across every Faction — mirrors contactRelationshipRows())
    // + raw Actor links (location.npcActorUuids).
    const allFactions = FactionRegistryService.getRegistry?.() ?? [];
    const contacts = asArray(location.contactIds).map((contactId) => {
      for (const faction of allFactions) {
        const contact = asArray(faction.contacts).find(entry => entry.id === contactId);
        if (contact) return row({ kind: 'contact', id: contact.id, label: `${contact.name} (${faction.name})`, resolved: true, resolutionKind: 'canonical-id' });
      }
      return row({ kind: 'contact', id: contactId, resolutionKind: 'missing' });
    });
    const actors = asArray(location.npcActorUuids).map((uuid) => {
      const actor = resolveActorByAnyRef(uuid);
      return actor
        ? row({ kind: 'actor', id: actor.id, label: actor.name, resolved: true, resolutionKind: 'canonical-id' })
        : row({ kind: 'actor', id: uuid, resolutionKind: 'missing' });
    });

    // Jobs: union of location.linkedJobIds (forward, GM-curated) and jobs
    // whose sourceLocation.locationId === id (reverse, Phase 4), deduplicated
    // by real thread id. A stored linkedJobId that no longer resolves is a
    // real missing row, never silently dropped.
    const jobIndex = await loadJobIndex();
    const jobById = new Map(jobIndex.map(entry => [entry.thread.id, entry]));
    const reverseJobIds = jobIndex.filter(({ job }) => text(job?.sourceLocation?.locationId) === id).map(({ thread }) => thread.id);
    const jobIds = Array.from(new Set([...asArray(location.linkedJobIds).map(text), ...reverseJobIds].filter(Boolean)));
    const jobs = jobIds.map((jid) => {
      const entry = jobById.get(jid);
      return entry ? jobRow(entry.thread, entry.job) : row({ kind: 'job', id: jid, resolutionKind: 'missing' });
    });

    // Intel: union of location.linkedIntelIds (forward) and Intel whose
    // linkedLocationId === id (reverse, Phase 5), deduplicated by real
    // Intel id. Same broken-reference honesty as Jobs above.
    const intelIndex = await loadIntelIndex();
    const intelById = new Map(intelIndex.map(intel => [intel.id, intel]));
    const reverseIntelIds = intelIndex.filter(intel => text(intel.linkedLocationId) === id).map(intel => intel.id);
    const intelIds = Array.from(new Set([...asArray(location.linkedIntelIds).map(text), ...reverseIntelIds].filter(Boolean)));
    const intel = intelIds.map((iid) => {
      const meta = intelById.get(iid);
      return meta ? intelRow(meta) : row({ kind: 'intel', id: iid, resolutionKind: 'missing' });
    });

    // Leads: unresolved Atlas Lead discoveries scoped to this Location.
    const leads = (LocationRegistryService.getAtlasLeadDiscoveries?.({ unresolvedOnly: true, locationId: id }) ?? [])
      .map(lead => row({ kind: 'lead', id: lead.id, label: lead.factTitle || lead.checkLabel || 'Atlas Lead', status: lead.status, resolved: true, resolutionKind: 'canonical-id' }));

    // Scenes: primary map scene + any additional linked scenes, the same
    // synchronous world-doc-id technique GMLocationsSurfaceService itself uses.
    const sceneUuids = Array.from(new Set([location.map?.sceneUuid, ...asArray(location.linkedSceneUuids)].filter(Boolean)));
    const scenes = sceneUuids.map((uuid) => {
      const sceneId = parseWorldDocId(uuid, 'Scene');
      if (!sceneId && isCompendiumUuid(uuid)) return row({ kind: 'scene', id: uuid, resolutionKind: 'ambiguous' });
      const scene = sceneId ? game.scenes?.get?.(sceneId) : null;
      return scene
        ? row({ kind: 'scene', id: scene.id, label: scene.name, resolved: true, resolutionKind: 'canonical-id' })
        : row({ kind: 'scene', id: uuid, resolutionKind: 'missing' });
    });

    return {
      subject,
      party: { currentPartyPresence: location.activeForParty === true },
      relationships: { factions, contacts, actors, jobs, intel, leads, scenes },
      operations: {},
      workflows: {},
      limitations: []
    };
  }

  static async forFaction(factionId) {
    const id = text(factionId);
    const faction = id ? exactFaction(id) : null;
    const subject = row({ kind: 'faction', id, label: faction?.name || '', resolved: Boolean(faction), resolutionKind: faction ? 'canonical-id' : 'missing' });
    if (!faction) return { subject, party: {}, relationships: {}, operations: {}, workflows: {}, limitations: ['Faction not found for the given id.'] };

    // Locations: reuse LocationRegistryService's own proven union semantics
    // (controllingFactionId / factionIds[] / factionPresence[]) instead of a
    // second, narrower copy.
    const locations = LocationRegistryService.getLocationsForFaction(id, { includeHidden: true }).map((location) => {
      const isController = text(location.controllingFactionId) === id;
      return { ...locationRow(location), role: isController ? 'controlling' : 'presence' };
    });

    // Contacts: this Faction's own registered contacts. Contacts promoted to
    // a real Actor are surfaced as a SEPARATE actor row (Correction 8) —
    // never merged into one opaque composite id.
    const contacts = asArray(faction.contacts).map(contact => row({
      kind: 'contact', id: contact.id, label: contact.name, resolved: true, resolutionKind: 'canonical-id'
    }));
    const contactActors = asArray(faction.contacts)
      .filter(contact => text(contact.actorUuid) || text(contact.actorId))
      .map((contact) => {
        const actor = resolveActorByAnyRef(contact.actorUuid || contact.actorId);
        return actor
          ? row({ kind: 'actor', id: actor.id, label: actor.name, resolved: true, resolutionKind: 'canonical-id' })
          : row({ kind: 'actor', id: contact.actorId || contact.actorUuid, resolutionKind: 'missing' });
      });

    // Jobs: reuse FactionJobBridgeService.filterJobsByIssuer()'s own proven
    // matching (canonical factionId, unique legacy name, primary AND
    // additional/rival consequence Factions) rather than a narrower copy
    // that only checked issuer.factionId.
    const jobIndex = await loadJobIndex();
    const wrappedJobs = jobIndex.map(({ thread, job }) => ({ ...job, __thread: thread }));
    // issuerFilterFromFaction() (not a hand-built {factionId} filter) is the
    // exact filter GMFactionRelationshipSurfaceService's own
    // factionJobRelationshipRows() passes to filterJobsByIssuer() — it
    // carries factionName alongside factionId, which is what actually
    // enables the unique-legacy-name match path inside jobMatchesIssuer().
    const issuerFilter = FactionJobBridgeService.issuerFilterFromFaction(faction);
    const matchedJobs = FactionJobBridgeService.filterJobsByIssuer(wrappedJobs, issuerFilter);
    const jobs = matchedJobs.map(wrapped => jobRow(wrapped.__thread, wrapped));

    const intel = (await loadIntelIndex()).filter(entry => text(entry.linkedFactionId) === id).map(intelRow);

    return {
      subject,
      party: {},
      relationships: { locations, contacts, contactActors, jobs, intel },
      operations: {},
      workflows: {},
      limitations: ['Faction<->Faction relationships remain absent — no canonical storage exists anywhere in this codebase (confirmed by the Phase 3 audit); not fabricated here either.']
    };
  }

  static async forJob(threadId) {
    const id = text(threadId);
    const thread = id ? await HolonetStorage.getThread(id).catch(() => null) : null;
    const isJobThread = Boolean(thread?.metadata?.threadType === THREAD_TYPE_JOB);
    const job = isJobThread ? jobForThread(thread) : null;
    const subject = row({ kind: 'job', id, label: text(job?.title || thread?.title), status: isJobThread ? jobStatus(job) : '', resolved: isJobThread, resolutionKind: isJobThread ? 'canonical-id' : 'missing' });
    if (!isJobThread) {
      // A real, non-Job Holonet thread (Messenger/party/private) must never
      // masquerade as a resolved Job context (Correction 6).
      const limitation = thread ? 'The resolved Holonet thread is not a Job Board posting (metadata.threadType is not "job").' : 'Job thread not found for the given id.';
      return { subject, party: {}, relationships: {}, operations: {}, workflows: {}, limitations: [limitation] };
    }

    // Reuse the exact Phase 4 issuer/location/intel/consequence resolvers —
    // canonical id first, unique legacy-name fallback, honest ambiguous/
    // missing states, Contact vs Actor identity, never re-derived here.
    const card = jobResolverCard(thread, job);
    const resolvedFaction = resolveIssuerFaction(card);
    const resolvedContact = resolveIssuerContact(card, resolvedFaction);
    const locations = resolveJobLocations(card);
    const primaryLocation = locations[0] || null;
    const intelRows = await resolveJobIntel(id);
    const consequences = resolveConsequenceFactions(factionConsequenceEntries(job));

    // party.currentPartyAtMissionLocation always uses the strict
    // activeForParty check (Correction 2), independent of
    // resolveJobLocations()'s own currentPartyPresence field (which is
    // reused verbatim from Phase 4 and not touched here).
    const realMissionLocation = primaryLocation ? exactLocation(primaryLocation.id) : null;

    return {
      subject,
      party: { currentPartyAtMissionLocation: realMissionLocation?.activeForParty === true },
      relationships: {
        faction: row({ kind: 'faction', id: resolvedFaction.id, label: resolvedFaction.name, resolved: resolvedFaction.resolved, resolutionKind: resolvedFaction.resolutionKind }),
        contact: resolvedContact
          ? row({ kind: resolvedContact.kind === 'actor' ? 'actor' : 'contact', id: resolvedContact.id, label: resolvedContact.name, resolved: resolvedContact.resolved, resolutionKind: resolvedContact.resolutionKind })
          : null,
        location: primaryLocation
          ? row({ kind: 'location', id: primaryLocation.id, label: primaryLocation.name, resolved: !primaryLocation.missing, resolutionKind: primaryLocation.resolutionKind })
          : null,
        intel: intelRows.map(entry => row({ kind: 'intel', id: entry.id, label: entry.title, status: entry.status, resolved: true, resolutionKind: 'canonical-id' })),
        consequenceFactions: consequences.map(entry => row({
          kind: entry.isRival ? 'rival-faction' : 'consequence-faction',
          id: entry.resolvedFactionId || entry.factionId || '',
          label: entry.factionName,
          resolved: Boolean(entry.resolvedFactionId),
          resolutionKind: entry.resolutionKind
        }))
      },
      operations: {},
      workflows: {},
      limitations: []
    };
  }

  static async forIntel(intelId) {
    const id = text(intelId);
    const record = id ? await HolonetIntelService.getIntelById(id).catch(() => null) : null;
    const intel = record ? HolonetIntelService.getIntelMetadata(record) : null;
    const subject = row({ kind: 'intel', id, label: intel?.title || '', status: intel?.status || '', resolved: Boolean(intel), resolutionKind: intel ? 'canonical-id' : 'missing' });
    if (!intel) return { subject, party: {}, relationships: {}, operations: {}, workflows: {}, limitations: ['Intel record not found for the given id.'] };

    // Reuse every one of Phase 5's own relationship resolvers — Location,
    // source Atlas Fact, Job, Scene, Actor — instead of the narrower Phase
    // 6 subset that only covered Location/Faction/Job (Correction 7).
    const locationResolved = resolveIntelLocation(intel);
    const realLocation = locationResolved?.id ? exactLocation(locationResolved.id) : null;
    const sourceFactResolved = resolveIntelSourceFact(intel, realLocation);
    const faction = intel.linkedFactionId ? exactFaction(intel.linkedFactionId) : null;
    const contact = (intel.linkedFactionId && intel.linkedContactId) ? exactContact(intel.linkedFactionId, intel.linkedContactId) : null;
    const jobResolved = await resolveIntelJob(intel.linkedJobThreadId);
    const sceneResolved = resolveIntelScene(intel.linkedSceneUuid);
    const actorResolved = resolveIntelActor(intel.linkedActorUuid);

    return {
      subject,
      party: { currentPartyAtLocation: realLocation?.activeForParty === true },
      relationships: {
        location: locationResolved ? row({ kind: 'location', id: locationResolved.id, label: locationResolved.name, resolved: locationResolved.resolved, resolutionKind: locationResolved.resolutionKind }) : null,
        sourceFact: sourceFactResolved ? row({ kind: 'atlas-fact', id: sourceFactResolved.id, label: sourceFactResolved.title, resolved: sourceFactResolved.resolved, resolutionKind: sourceFactResolved.resolutionKind }) : null,
        faction: faction ? factionRow(faction) : (intel.linkedFactionId ? row({ kind: 'faction', id: intel.linkedFactionId, resolutionKind: 'missing' }) : null),
        contact: contact ? row({ kind: 'contact', id: contact.id, label: contact.name, resolved: true, resolutionKind: 'canonical-id' }) : (intel.linkedContactId ? row({ kind: 'contact', id: intel.linkedContactId, resolutionKind: 'missing' }) : null),
        job: jobResolved ? row({ kind: 'job', id: jobResolved.id, label: jobResolved.title, status: jobResolved.status, resolved: jobResolved.resolved, resolutionKind: jobResolved.resolutionKind }) : null,
        scene: sceneResolved ? row({ kind: 'scene', id: sceneResolved.id || sceneResolved.uuid, label: sceneResolved.name, resolved: sceneResolved.resolved, resolutionKind: sceneResolved.resolutionKind }) : null,
        actor: actorResolved ? row({ kind: 'actor', id: actorResolved.id || actorResolved.uuid, label: actorResolved.name, resolved: actorResolved.resolved, resolutionKind: actorResolved.resolutionKind }) : null
      },
      operations: {},
      workflows: {},
      limitations: []
    };
  }

  /**
   * Resolve what can CURRENTLY be proven about an Actor (Phase 6K).
   * Accepts an Actor document, a plain Actor id, or an 'Actor.<id>' uuid —
   * all three resolve to the same real Actor (Correction 8).
   *
   * relationships.factions is the Actor's REAL Faction standing ledger
   * (FactionRegistryService.getActorRelationships) — a genuinely different
   * concept from relationships.factionContacts (a Faction Contact record
   * that happens to point at this Actor). Conflating the two was the
   * pre-correction bug; they are never merged here, and a Contact
   * association row carries explicit factionId/contactId/actorUuid fields
   * rather than one opaque composite id.
   */
  static async forActor(actorRef) {
    const actor = resolveActorByAnyRef(actorRef);
    const fallbackId = text(actorRef?.id ?? (typeof actorRef === 'string' ? actorRef : ''));
    const subject = row({ kind: 'actor', id: actor?.id || fallbackId, label: actor?.name || '', resolved: Boolean(actor), resolutionKind: actor ? 'canonical-id' : 'missing' });
    if (!actor) return { subject, party: {}, relationships: {}, operations: {}, workflows: {}, limitations: ['Actor not found for the given id/uuid.'] };

    const actorUuid = actor.uuid;
    const scene = game.scenes?.active ?? globalThis.canvas?.scene ?? null;
    const inScene = Boolean(scene && safeCollection(scene.tokens).some(token => (token.actor ?? game.actors?.get?.(token.actorId))?.id === actor.id));
    const inCombat = Boolean(safeCollection(game.combat?.combatants).some(combatant => combatant.actor?.id === actor.id));

    // The Actor's real Faction relationship ledger (score/standing), not a
    // Contact association — Correction 8. Phase 7 addendum D: the common
    // {kind,id,label,status,resolved,resolutionKind} contract stays valid,
    // but this row carries additive real fields
    // (relationshipType/score/relationshipStatus/source/benefits) straight
    // from FactionRegistryService's own relationship record rather than
    // forcing Workspace to re-read FactionRegistryService merely because
    // the generic row dropped them.
    const relationshipLedger = FactionRegistryService.getActorRelationships?.(actor) ?? [];
    const factions = relationshipLedger.map((relationship) => {
      const faction = relationship.factionId ? exactFaction(relationship.factionId) : null;
      return {
        ...row({
          kind: 'faction',
          id: relationship.factionId || '',
          label: faction?.name || relationship.factionName || '',
          status: relationship.relationshipType || '',
          resolved: Boolean(faction),
          resolutionKind: faction ? 'canonical-id' : (relationship.factionId ? 'missing' : 'unresolved')
        }),
        relationshipType: relationship.relationshipType || '',
        score: Number(relationship.score ?? 0) || 0,
        relationshipStatus: relationship.status || '',
        source: relationship.source || '',
        benefits: relationship.benefits || ''
      };
    });

    // Faction Contact associations — a separate concept, explicit fields.
    const factionContacts = (FactionRegistryService.getRegistry?.() ?? [])
      .flatMap(faction => asArray(faction.contacts).map(contact => ({ faction, contact })))
      .filter(({ contact }) => text(contact.actorUuid) === actorUuid || text(contact.actorId) === actor.id)
      .map(({ faction, contact }) => ({
        kind: 'faction-contact',
        factionId: faction.id,
        factionName: faction.name,
        contactId: contact.id,
        contactName: contact.name,
        actorUuid: contact.actorUuid || '',
        label: `${contact.name} (${faction.name})`,
        resolved: true,
        resolutionKind: 'canonical-id'
      }));

    // Locations (Phase 7 addendum C): two genuinely different meanings of
    // "this Actor relates to this Location," never merged into one
    // unexplained link. 'direct-actor' = location.npcActorUuids literally
    // contains this Actor. 'faction-contact' = this Actor backs a Faction
    // Contact whose id is separately listed in location.contactIds. Actor
    // Location is never inferred from Faction control, Job location, or
    // party location — those remain distinct concepts (addendum J).
    const contactIdsForActor = new Set(factionContacts.map(entry => entry.contactId).filter(Boolean));
    const directLocationIds = new Set();
    const contactLocationIds = new Set();
    const locations = [];
    // CORRECTION 6 (optional cleanup): the selected Actor is already known,
    // so compare Location refs against a small precomputed reference set
    // (id/uuid/'Actor.<id>') instead of resolving every npcActorUuids entry
    // through game.actors via resolveActorByAnyRef() per Location. No
    // semantic broadening — still an exact-string match, never a name match.
    const actorRefs = new Set([actor.id, actorUuid, `Actor.${actor.id}`].filter(Boolean));
    for (const location of (LocationRegistryService.getRegistry?.() ?? [])) {
      const isDirect = asArray(location.npcActorUuids).some(uuid => actorRefs.has(text(uuid)));
      if (isDirect && !directLocationIds.has(location.id)) {
        directLocationIds.add(location.id);
        locations.push({ ...locationRow(location), role: 'direct-actor' });
      }
      const isViaContact = asArray(location.contactIds).some(contactId => contactIdsForActor.has(contactId));
      if (isViaContact && !contactLocationIds.has(location.id)) {
        contactLocationIds.add(location.id);
        locations.push({ ...locationRow(location), role: 'faction-contact' });
      }
    }

    // Jobs: reuse FactionJobBridgeService.normalizeJobIssuer()'s own alias
    // reading (issuer.contactActorUuid/contactActorId, client.actorUuid)
    // instead of hand-picking a single field — Correction 8.
    const jobIndex = await loadJobIndex();
    const jobs = jobIndex
      .filter(({ thread, job }) => {
        const issuer = FactionJobBridgeService.normalizeJobIssuer(jobResolverCard(thread, job));
        return (issuer.contactActorUuid && issuer.contactActorUuid === actorUuid) || (issuer.contactActorId && issuer.contactActorId === actor.id);
      })
      .map(({ thread, job }) => jobRow(thread, job));

    const intel = (await loadIntelIndex()).filter(entry => text(entry.linkedActorUuid) === actorUuid).map(intelRow);

    const limitations = [];

    // Recovery (Phase 7 addendum F, CORRECTION 1): GMHealingTrigger's
    // "eligible" means "legally allowed to receive the natural-healing
    // trigger" (character type, not droid/vehicle, HP > 0) — it does NOT
    // mean "injured," and it must never be used as a proxy for
    // "needs attention." `injured` is computed independently, straight
    // from the Actor's own hp values. `needsAttention` reuses
    // GMCombatRecoveryService.buildActorCard(actor)'s own real recovery
    // legality (wounded/downed/CT impairment/persistent CT/spent Second
    // Wind/poisons/ongoing effects) rather than re-deriving that boolean
    // expression a second time — a full-HP, unimpaired PC is "eligible"
    // but must never report needsAttention:true.
    let recovery = null;
    try {
      const summary = await GMHealingTrigger.getHealingSummary();
      const eligible = asArray(summary?.eligibleActors).some(entry => entry.id === actor.id);
      const ineligible = asArray(summary?.ineligibleActors).some(entry => entry.id === actor.id);
      const hp = actor.system?.hp ?? actor.system?.attributes?.hp ?? {};
      const hpValue = Number(hp.value ?? hp.current ?? 0) || 0;
      const hpMax = Number(hp.max ?? hp.maximum ?? 0) || 0;
      const injured = hpMax > 0 && hpValue < hpMax;
      const recoveryCard = GMCombatRecoveryService.buildActorCard(actor);
      recovery = { eligible, ineligible, injured, needsAttention: recoveryCard.needsAttention };
    } catch (err) {
      SWSELogger.warn?.('[GMCampaignContextService] Healing summary unavailable for forActor():', err);
      limitations.push('Healing/recovery status could not be determined for this actor.');
    }

    // Trades (Phase 7 addendum E): preserve whether this Actor was the
    // sender or recipient, and who the real counterparty is, so Workspace
    // never has to re-run the Trade query merely to answer "who's on the
    // other side of this."
    let trades = [];
    try {
      const tradeConsole = await GMTradeConsoleSurfaceService.buildTradeConsoleVm();
      trades = asArray(tradeConsole?.activeQueue).concat(asArray(tradeConsole?.approvalQueue), asArray(tradeConsole?.failedQueue))
        .filter(entry => entry.fromActorId === actor.id || entry.toActorId === actor.id)
        .map((entry) => {
          const isSender = entry.fromActorId === actor.id;
          const counterpartyActorId = isSender ? entry.toActorId : entry.fromActorId;
          const counterpartyActor = counterpartyActorId ? game.actors?.get?.(counterpartyActorId) : null;
          return {
            ...row({ kind: 'trade', id: entry.recordId, label: entry.title || entry.threadTitle || 'Trade', status: entry.status, resolved: true, resolutionKind: 'canonical-id' }),
            role: isSender ? 'sender' : 'recipient',
            counterpartyActorId: counterpartyActorId || '',
            counterpartyActorName: counterpartyActor?.name || ''
          };
        });
    } catch (err) {
      SWSELogger.warn?.('[GMCampaignContextService] Trade Console unavailable for forActor():', err);
      limitations.push('Trade Console context could not be loaded for this actor.');
    }

    return {
      subject: { ...subject, uuid: actorUuid },
      party: { isPartyMember: GMPartyRosterService.isPartyMember(actor), inCombat, inScene },
      relationships: { factions, factionContacts, locations, jobs, intel },
      operations: { trades, recovery },
      workflows: {},
      limitations
    };
  }

  /**
   * Aggregate actionable items across the authorities the Phase 6 spec
   * names (6Q). Each authority is read exactly once (Phase 6AP); a
   * subsystem that fails to load is skipped and logged, never crashes the
   * whole queue (Phase 6AQ / Correction 11). Target identity uses
   * GMCampaignTargetService's kinds so a caller can navigate with
   * GMCampaignTargetService.resolve(target).
   */
  static async attentionItems() {
    const items = [];
    const add = (entry) => items.push(entry);

    try {
      const jobIndex = await loadJobIndex();
      for (const { thread, job } of jobIndex) {
        const status = jobStatus(job);
        const objectives = asArray(job?.objectives);
        const reviewCount = objectives.filter(o => ['claimed', 'submitted', 'pendingReview'].includes(String(o?.status || ''))).length;
        if (reviewCount > 0 || status === 'review') {
          add({ id: `job-review:${thread.id}`, kind: 'job-review', severity: 'critical', source: 'Job Board', title: text(job?.title || thread.title), detail: 'Objective claim requires GM review.', target: { kind: 'job', id: thread.id }, actionLabel: 'Review' });
        }
        if (status === 'complete') {
          add({ id: `job-payout:${thread.id}`, kind: 'job-payout', severity: 'warning', source: 'Job Board', title: text(job?.title || thread.title), detail: 'Completed contract ready for payout.', target: { kind: 'job', id: thread.id }, actionLabel: 'Pay Out' });
        }
      }
    } catch (err) {
      SWSELogger.warn?.('[GMCampaignContextService] Job Board attention items unavailable:', err);
    }

    try {
      const tradeConsole = await GMTradeConsoleSurfaceService.buildTradeConsoleVm();
      for (const entry of asArray(tradeConsole?.failedQueue)) {
        add({ id: `trade-failed:${entry.recordId}`, kind: 'trade-failed', severity: 'critical', source: 'Trade Console', title: entry.title || entry.threadTitle || 'Trade', detail: entry.failureReason || 'Failed trade settlement requires review.', target: { kind: 'trade', id: entry.recordId }, actionLabel: 'Review' });
      }
      for (const entry of asArray(tradeConsole?.approvalQueue)) {
        add({ id: `trade-approval:${entry.recordId}`, kind: 'trade-approval', severity: 'warning', source: 'Trade Console', title: entry.title || entry.threadTitle || 'Trade', detail: 'Trade approval pending.', target: { kind: 'trade', id: entry.recordId }, actionLabel: 'Review' });
      }
    } catch (err) {
      SWSELogger.warn?.('[GMCampaignContextService] Trade Console attention items unavailable:', err);
    }

    try {
      for (const actor of safeCollection(game.actors)) {
        if (!actor.system?.droidSystems || actor.system.droidSystems.stateMode !== 'PENDING') continue;
        add({ id: `approval:droid:${actor.id}`, kind: 'approval', severity: 'warning', source: 'Approvals', title: actor.name, detail: 'Droid build awaiting GM approval.', target: { kind: 'approval', id: `droid:${actor.id}` }, actionLabel: 'Review' });
      }
      // Stable approval identity (Correction 9): a Store-created pending
      // purchase already has its own persistent id (pending_droid_.../
      // pending_vehicle_.../pending_store_item_...) — prefer it so the
      // target survives another request being added/removed/reordered
      // before the GM clicks through. Legacy records without an id fall
      // back to the pre-existing index-based key; GMApprovalsSurfaceService
      // accepts both (see its own stableKey field).
      const customPurchases = await safeSettingArray('pendingCustomPurchases');
      customPurchases.forEach((purchase, index) => {
        const targetId = purchase?.id ? `custom-id:${purchase.id}` : `custom:${index}`;
        add({ id: `approval:${targetId}`, kind: 'approval', severity: 'warning', source: 'Approvals', title: purchase?.draftData?.name || 'Custom asset', detail: 'Custom purchase awaiting GM approval.', target: { kind: 'approval', id: targetId }, actionLabel: 'Review' });
      });
      const sessions = GameSessionStore.getAllSessions();
      for (const session of sessions.filter(s => s?.escrow?.credits?.status === 'pending-gm-settlement')) {
        add({ id: `approval:game:${session.id}`, kind: 'approval', severity: 'critical', source: 'Approvals', title: session.title || 'Holopad Game', detail: 'Game settlement needs GM approval.', target: { kind: 'approval', id: `game:${session.id}` }, actionLabel: 'Review' });
      }
      const suggestions = FactionRegistryService.getPendingSuggestions?.() ?? [];
      for (const suggestion of suggestions) {
        const suggestionKey = `faction:${suggestion.actorId}:${suggestion.record?.id}`;
        add({ id: `approval:${suggestionKey}`, kind: 'approval', severity: 'info', source: 'Approvals', title: suggestion.record?.name || suggestion.record?.factionName || 'Faction Suggestion', detail: 'Player-suggested Faction needs GM review.', target: { kind: 'approval', id: suggestionKey }, actionLabel: 'Review' });
      }
    } catch (err) {
      SWSELogger.warn?.('[GMCampaignContextService] Approvals attention items unavailable:', err);
    }

    try {
      // CORRECTION 1: GMHealingTrigger.eligibleActors ("legally allowed to
      // receive the natural-healing trigger") is NOT the same thing as
      // "needs GM attention" — a full-HP, unimpaired PC is eligible but
      // must never appear here. Reuse GMCombatRecoveryService's own real
      // recovery authority (buildViewModel()'s needsAttention card list,
      // the exact same wounded/downed/CT-impaired/persistent-CT/spent-
      // Second-Wind/poison/ongoing-effect legality Workspace's Recovery
      // card uses) instead of re-deriving that boolean expression here.
      const recoveryVm = await GMCombatRecoveryService.buildViewModel();
      for (const card of asArray(recoveryVm?.combatRecovery?.needsAttention)) {
        // Phase 7 addendum H: the recovery workflow is the one Home
        // attention item deliberately migrated from the generic
        // {kind:'actor'} (open-the-sheet) target to {kind:'workspace-actor'}
        // — it selects this Actor in Workspace's Recovery operations card
        // rather than opening the bare Foundry sheet. Every other Actor
        // link in Locations/Factions/Jobs/Intel keeps {kind:'actor'}
        // sheet-opening semantics; this migration is scoped to recovery only.
        add({
          id: `recovery:${card.id}`,
          kind: 'recovery',
          severity: card.actionTone === 'critical' ? 'critical' : (card.actionTone === 'warning' ? 'warning' : 'info'),
          source: 'Combat & Recovery',
          title: card.name,
          detail: recoveryAttentionDetail(card),
          target: { kind: 'workspace-actor', id: card.id, uuid: card.uuid || '' },
          actionLabel: 'Open in Workspace'
        });
      }
    } catch (err) {
      SWSELogger.warn?.('[GMCampaignContextService] Healing attention items unavailable:', err);
    }

    try {
      const { SkillChallengeStore } = await import('/systems/foundryvtt-swse/scripts/engine/skill-challenges/SkillChallengeStore.js');
      const challenges = await SkillChallengeStore.getAll();
      for (const challenge of challenges.filter(c => c.status === 'active')) {
        add({ id: `skill-challenge:${challenge.id}`, kind: 'skill-challenge-active', severity: 'info', source: 'Skill Challenges', title: challenge.name, detail: `${challenge.successes}/${challenge.targetSuccesses} successes.`, target: { kind: 'skill-challenge', id: challenge.id }, actionLabel: 'Open' });
      }
    } catch (err) {
      SWSELogger.warn?.('[GMCampaignContextService] Skill Challenge attention items unavailable:', err);
    }

    try {
      const leadCount = LocationRegistryService.getAtlasLeadDiscoveries?.({ unresolvedOnly: true })?.length ?? 0;
      if (leadCount > 0) {
        add({ id: 'location-leads:unresolved', kind: 'location-lead', severity: 'info', source: 'Locations', title: `${leadCount} unresolved Atlas lead${leadCount === 1 ? '' : 's'}`, detail: 'Player discoveries awaiting GM resolution.', target: null, actionLabel: 'Open Locations' });
      }
    } catch (err) {
      SWSELogger.warn?.('[GMCampaignContextService] Locations attention items unavailable:', err);
    }

    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return items.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
  }
}
