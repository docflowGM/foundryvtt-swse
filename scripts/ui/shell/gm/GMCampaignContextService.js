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
import { jobForThread, jobStatus, statusLabel as jobStatusLabel } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/GMJobBoardSurfaceService.js';
import { GMTradeConsoleSurfaceService } from '/systems/foundryvtt-swse/scripts/ui/shell/gm/GMTradeConsoleSurfaceService.js';

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

// --- shared, per-call job index -------------------------------------------
// Loaded at most once per forLocation/forFaction/forJob/attentionItems()
// call, never persisted across calls (Phase 6O — no service-owned cache).
async function loadJobIndex() {
  const threads = await HolonetStorage.getAllThreads();
  return threads
    .filter(thread => thread?.metadata?.threadType === THREAD_TYPE_JOB)
    .map(thread => ({ thread, job: jobForThread(thread) }));
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

async function intelRowsWhere(predicate) {
  const records = await HolonetIntelService.getAllIntel({ includeArchived: true });
  return records
    .map(record => HolonetIntelService.getIntelMetadata(record))
    .filter(Boolean)
    .filter(predicate)
    .map(intel => row({ kind: 'intel', id: intel.id, label: intel.title, status: intel.status, resolved: true, resolutionKind: 'canonical-id' }));
}

function factionRow(faction) {
  if (!faction) return null;
  return row({ kind: 'faction', id: faction.id, label: faction.name, resolved: true, resolutionKind: 'canonical-id' });
}

function locationRow(location) {
  if (!location) return null;
  return row({ kind: 'location', id: location.id, label: location.name, resolved: true, resolutionKind: 'canonical-id' });
}

function currentPartyLocation() {
  // Reuses the exact signal Phase 4/5 already trust for "is the party
  // here" (location.activeForParty) — never partyState.location, which is
  // free display text with no stable id (see the audit doc's Party ->
  // Location dual-representation finding, Phase 5 §14 / Phase 6F).
  try {
    const locations = LocationRegistryService.getRegistry?.() ?? [];
    return locations.find(loc => loc?.activeForParty || loc?.revealState === 'active') ?? null;
  } catch (_err) {
    return null;
  }
}

export class GMCampaignContextService {
  /** Party-wide context. Not a subject lookup — its own small contract. */
  static async party() {
    const partyActors = GMPartyRosterService.getPartyActors({ ownedOnly: false });
    const users = safeCollection(game.users).filter(user => !user?.isGM);
    const onlinePlayers = users.filter(user => user?.active).length;
    const activeLocation = currentPartyLocation();
    const partyState = await HolonetStateService.getPartyState().catch(() => null);
    const limitations = [];
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
    const location = id ? LocationRegistryService.findLocation(id) : null;
    const subject = row({ kind: 'location', id, label: location?.name || '', resolved: Boolean(location), resolutionKind: location ? 'canonical-id' : 'missing' });
    if (!location) return { subject, party: {}, relationships: {}, operations: {}, workflows: {}, limitations: ['Location not found for the given id.'] };

    const faction = text(location.controllingFactionId) ? FactionRegistryService.findFaction(location.controllingFactionId) : null;
    const jobIndex = await loadJobIndex();
    const jobs = jobIndex
      .filter(({ job }) => text(job?.sourceLocation?.locationId) === id)
      .map(({ thread, job }) => jobRow(thread, job));
    const intel = await intelRowsWhere(intel => text(intel.linkedLocationId) === id);

    return {
      subject,
      party: { currentPartyPresence: Boolean(location.activeForParty || location.revealState === 'active') },
      relationships: {
        faction: factionRow(faction),
        jobs,
        intel
      },
      operations: {},
      workflows: {},
      limitations: []
    };
  }

  static async forFaction(factionId) {
    const id = text(factionId);
    const faction = id ? FactionRegistryService.findFaction(id) : null;
    const subject = row({ kind: 'faction', id, label: faction?.name || '', resolved: Boolean(faction), resolutionKind: faction ? 'canonical-id' : 'missing' });
    if (!faction) return { subject, party: {}, relationships: {}, operations: {}, workflows: {}, limitations: ['Faction not found for the given id.'] };

    const locations = (LocationRegistryService.getRegistry?.() ?? [])
      .filter(loc => text(loc.controllingFactionId) === id)
      .map(loc => locationRow(loc));
    const jobIndex = await loadJobIndex();
    const jobs = jobIndex
      .filter(({ job }) => text(job?.issuer?.factionId) === id)
      .map(({ thread, job }) => jobRow(thread, job));
    const intel = await intelRowsWhere(intel => text(intel.linkedFactionId) === id);

    return {
      subject,
      party: {},
      relationships: { locations, jobs, intel },
      operations: {},
      workflows: {},
      limitations: ['Faction<->Faction relationships remain absent — no canonical storage exists anywhere in this codebase (confirmed by the Phase 3 audit); not fabricated here either.']
    };
  }

  static async forJob(threadId) {
    const id = text(threadId);
    const thread = id ? await HolonetStorage.getThread(id).catch(() => null) : null;
    const job = thread ? jobForThread(thread) : null;
    const subject = row({ kind: 'job', id, label: text(job?.title || thread?.title), status: thread ? jobStatus(job) : '', resolved: Boolean(thread), resolutionKind: thread ? 'canonical-id' : 'missing' });
    if (!thread) return { subject, party: {}, relationships: {}, operations: {}, workflows: {}, limitations: ['Job thread not found for the given id.'] };

    const factionId = text(job?.issuer?.factionId);
    const faction = factionId ? FactionRegistryService.findFaction(factionId) : null;
    const contactId = text(job?.issuer?.contactId);
    const contact = faction && contactId ? FactionRegistryService.findFactionContact(faction.id, contactId)?.contact : null;
    const sourceLocationId = text(job?.sourceLocation?.locationId);
    const location = sourceLocationId ? LocationRegistryService.findLocation(sourceLocationId) : null;
    const intel = await intelRowsWhere(intel => text(intel.linkedJobThreadId) === id);

    return {
      subject,
      party: { currentPartyAtMissionLocation: Boolean(location?.activeForParty) },
      relationships: {
        faction: factionRow(faction),
        contact: contact ? row({ kind: 'contact', id: contact.id, label: contact.name, resolved: true, resolutionKind: 'canonical-id' }) : null,
        location: location ? locationRow(location) : (sourceLocationId ? row({ kind: 'location', id: sourceLocationId, resolutionKind: 'missing' }) : null),
        intel
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

    const locationId = text(intel.linkedLocationId);
    const location = locationId ? LocationRegistryService.findLocation(locationId) : null;
    const factionId = text(intel.linkedFactionId);
    const faction = factionId ? FactionRegistryService.findFaction(factionId) : null;
    const jobThreadId = text(intel.linkedJobThreadId);
    const jobThread = jobThreadId ? await HolonetStorage.getThread(jobThreadId).catch(() => null) : null;

    return {
      subject,
      party: { currentPartyAtLocation: Boolean(location?.activeForParty) },
      relationships: {
        location: location ? locationRow(location) : (locationId ? row({ kind: 'location', id: locationId, resolutionKind: 'missing' }) : null),
        faction: factionRow(faction),
        job: jobThread ? jobRow(jobThread, jobForThread(jobThread)) : (jobThreadId ? row({ kind: 'job', id: jobThreadId, resolutionKind: 'missing' }) : null)
      },
      operations: {},
      workflows: {},
      limitations: []
    };
  }

  /**
   * Resolve what can CURRENTLY be proven about an Actor (Phase 6K).
   * Faction/Job/Intel links are genuine CAMPAIGN RELATIONSHIPS (a Faction
   * Contact/Job issuer/Intel record canonically references this actor by
   * uuid). Trade/recovery/combat/scene are OPERATIONAL CONTEXT — the same
   * actor, viewed by a different system, never inferred from a name.
   */
  static async forActor(actorRef) {
    const uuid = text(actorRef?.uuid ?? actorRef);
    const idHint = text(actorRef?.id);
    const actor = idHint ? game.actors?.get?.(idHint) : (uuid.startsWith('Actor.') ? game.actors?.get?.(uuid.slice(6)) : null);
    const subject = row({ kind: 'actor', id: actor?.id || idHint || '', label: actor?.name || '', resolved: Boolean(actor), resolutionKind: actor ? 'canonical-id' : 'missing' });
    if (!actor) return { subject, party: {}, relationships: {}, operations: {}, workflows: {}, limitations: ['Actor not found for the given id/uuid.'] };

    const actorUuid = actor.uuid;
    const scene = game.scenes?.active ?? globalThis.canvas?.scene ?? null;
    const inScene = Boolean(scene && safeCollection(scene.tokens).some(token => (token.actor ?? game.actors?.get?.(token.actorId))?.id === actor.id));
    const inCombat = Boolean(safeCollection(game.combat?.combatants).some(combatant => combatant.actor?.id === actor.id));

    const factions = (FactionRegistryService.getRegistry?.() ?? [])
      .flatMap(faction => asArray(faction.contacts).map(contact => ({ faction, contact })))
      .filter(({ contact }) => text(contact.actorUuid) === actorUuid)
      .map(({ faction, contact }) => row({ kind: 'faction-contact', id: `${faction.id}:${contact.id}`, label: `${contact.name} (${faction.name})`, resolved: true, resolutionKind: 'canonical-id' }));

    const jobIndex = await loadJobIndex();
    const jobs = jobIndex
      .filter(({ job }) => text(job?.issuer?.contactActorUuid) === actorUuid)
      .map(({ thread, job }) => jobRow(thread, job));

    const intel = await intelRowsWhere(intel => text(intel.linkedActorUuid) === actorUuid);

    let recovery = { needsAttention: false };
    try {
      const summary = await GMHealingTrigger.getHealingSummary();
      const eligible = asArray(summary?.eligibleActors).some(entry => entry.id === actor.id);
      const ineligible = asArray(summary?.ineligibleActors).some(entry => entry.id === actor.id);
      recovery = { eligible, ineligible, needsAttention: eligible };
    } catch (_err) {
      // Healing subsystem unavailable — reported via limitations below, never thrown (Phase 6AQ).
    }

    let trades = [];
    const limitations = [];
    try {
      const tradeConsole = await GMTradeConsoleSurfaceService.buildTradeConsoleVm();
      trades = asArray(tradeConsole?.activeQueue).concat(asArray(tradeConsole?.approvalQueue), asArray(tradeConsole?.failedQueue))
        .filter(entry => entry.fromActorId === actor.id || entry.toActorId === actor.id)
        .map(entry => row({ kind: 'trade', id: entry.recordId, label: entry.title || entry.threadTitle || 'Trade', status: entry.status, resolved: true, resolutionKind: 'canonical-id' }));
    } catch (_err) {
      limitations.push('Trade Console context could not be loaded for this actor.');
    }

    return {
      subject: { ...subject, uuid: actorUuid },
      party: { isPartyMember: GMPartyRosterService.isPartyMember(actor), inCombat, inScene },
      relationships: { factions, jobs, intel },
      operations: { trades, recovery },
      workflows: {},
      limitations
    };
  }

  /**
   * Aggregate actionable items across the authorities the Phase 6 spec
   * names (6Q). Each authority is read exactly once (Phase 6AP); a
   * subsystem that fails to load is skipped, never crashes the whole
   * queue (Phase 6AQ). Target identity uses GMCampaignTargetService's
   * kinds so a caller can navigate with GMCampaignTargetService.resolve(target).
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
    } catch (_err) { /* Job Board unavailable — skip, never crash the queue. */ }

    try {
      const tradeConsole = await GMTradeConsoleSurfaceService.buildTradeConsoleVm();
      for (const entry of asArray(tradeConsole?.failedQueue)) {
        add({ id: `trade-failed:${entry.recordId}`, kind: 'trade-failed', severity: 'critical', source: 'Trade Console', title: entry.title || entry.threadTitle || 'Trade', detail: entry.failureReason || 'Failed trade settlement requires review.', target: { kind: 'trade', id: entry.recordId }, actionLabel: 'Review' });
      }
      for (const entry of asArray(tradeConsole?.approvalQueue)) {
        add({ id: `trade-approval:${entry.recordId}`, kind: 'trade-approval', severity: 'warning', source: 'Trade Console', title: entry.title || entry.threadTitle || 'Trade', detail: 'Trade approval pending.', target: { kind: 'trade', id: entry.recordId }, actionLabel: 'Review' });
      }
    } catch (_err) { /* Trade Console unavailable — skip. */ }

    try {
      for (const actor of safeCollection(game.actors)) {
        if (!actor.system?.droidSystems || actor.system.droidSystems.stateMode !== 'PENDING') continue;
        add({ id: `approval:droid:${actor.id}`, kind: 'approval', severity: 'warning', source: 'Approvals', title: actor.name, detail: 'Droid build awaiting GM approval.', target: { kind: 'approval', id: `droid:${actor.id}` }, actionLabel: 'Review' });
      }
      const customPurchases = await safeSettingArray('pendingCustomPurchases');
      customPurchases.forEach((purchase, index) => {
        add({ id: `approval:custom:${index}`, kind: 'approval', severity: 'warning', source: 'Approvals', title: purchase?.draftData?.name || 'Custom asset', detail: 'Custom purchase awaiting GM approval.', target: { kind: 'approval', id: `custom:${index}` }, actionLabel: 'Review' });
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
    } catch (_err) { /* Approvals sources unavailable — skip. */ }

    try {
      const summary = await GMHealingTrigger.getHealingSummary();
      for (const entry of asArray(summary?.eligibleActors)) {
        const actor = game.actors?.get?.(entry.id);
        add({ id: `recovery:${entry.id}`, kind: 'recovery', severity: 'warning', source: 'Combat & Recovery', title: entry.name, detail: 'Eligible for natural healing/recovery.', target: { kind: 'actor', id: entry.id, uuid: actor?.uuid || '' }, actionLabel: 'Open Actor' });
      }
    } catch (_err) { /* Healing summary unavailable — skip. */ }

    try {
      const { SkillChallengeStore } = await import('/systems/foundryvtt-swse/scripts/engine/skill-challenges/SkillChallengeStore.js');
      const challenges = await SkillChallengeStore.getAll();
      for (const challenge of challenges.filter(c => c.status === 'active')) {
        add({ id: `skill-challenge:${challenge.id}`, kind: 'skill-challenge-active', severity: 'info', source: 'Skill Challenges', title: challenge.name, detail: `${challenge.successes}/${challenge.targetSuccesses} successes.`, target: { kind: 'skill-challenge', id: challenge.id }, actionLabel: 'Open' });
      }
    } catch (_err) { /* Skill Challenge store unavailable — skip. */ }

    try {
      const leadCount = LocationRegistryService.getAtlasLeadDiscoveries?.({ unresolvedOnly: true })?.length ?? 0;
      if (leadCount > 0) {
        add({ id: 'location-leads:unresolved', kind: 'location-lead', severity: 'info', source: 'Locations', title: `${leadCount} unresolved Atlas lead${leadCount === 1 ? '' : 's'}`, detail: 'Player discoveries awaiting GM resolution.', target: null, actionLabel: 'Open Locations' });
      }
    } catch (_err) { /* Locations lead queue unavailable — skip. */ }

    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return items.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
  }
}
