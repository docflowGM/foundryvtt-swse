import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 6 CORRECTION PASS (Correction 13):
// proves GMCampaignContextService's relationship resolution is REAL parity
// with the production Phase 1-5 surfaces, not a narrower second
// interpretation of the same campaign graph.
//
// Where a production surface service is safely importable/invocable under
// this repo's Node harness (GMLocationsSurfaceService,
// GMFactionRelationshipSurfaceService), this test invokes the REAL
// buildViewModel() against the SAME fixtures and compares stable
// relationship-id sets directly. For Job/Intel, GMCampaignContextService
// now calls the exact same exported Phase 4/5 resolver functions
// (resolveIssuerFaction/resolveIssuerContact/resolveJobLocations/
// resolveJobIntel/resolveConsequenceFactions, resolveIntelLocation/
// resolveIntelSourceFact/resolveIntelJob/resolveIntelScene/
// resolveIntelActor) that GMJobBoardSurfaceService/GMIntelSurfaceService
// themselves call — parity is proven by construction there (same function,
// not a second copy), verified by covering every classification branch
// those functions expose (canonical/legacy/ambiguous/missing).
//
// PURE ADDITIVE DESIGN CONTRACT — this service and every method on it did
// not exist before Phase 6; this file replaces the prior, weaker
// hand-fixture-only parity test.

registerFoundryPathLoader();

function makeActorsCollection(actorList) {
  const byId = new Map(actorList.map(a => [a.id, a]));
  return { contents: actorList, get: (id) => byId.get(id), [Symbol.iterator]: () => actorList[Symbol.iterator]() };
}

function installShim({ locations = [], factions = [], threads = [], records = [], actors = [], scenes = [], users = [] } = {}) {
  const stores = new Map([
    ['gmLocationRegistry', locations],
    ['gmFactionRegistry', factions],
    ['holonet_threads', threads],
    ['holonet_records', records]
  ]);
  installFoundryShimGlobals({
    game: {
      user: { isGM: true },
      settings: {
        get: (_module, key) => stores.get(key),
        set: (_module, key, value) => { stores.set(key, value); return Promise.resolve(value); },
        settings: { has: () => true },
        register: () => {}
      },
      actors: makeActorsCollection(actors),
      users: makeActorsCollection(users),
      scenes: new Map(scenes.map(scene => [scene.id, scene])),
      combat: null
    }
  });
  globalThis.foundry.utils.randomID = () => `test-${Math.random().toString(36).slice(2, 10)}`;
}

function jobThreadFixture({ id, title, status = 'posted', issuer = {}, sourceLocation = null, factionConsequences = {}, objectives = [] }) {
  return {
    id, title,
    metadata: { threadType: 'job', job: { title, status, issuer, sourceLocation, factionConsequences, objectives } }
  };
}

const { GMCampaignContextService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMCampaignContextService.js');
const { GMLocationsSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMLocationsSurfaceService.js');
const { GMFactionRelationshipSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMFactionRelationshipSurfaceService.js');
const { GMJobBoardSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMJobBoardSurfaceService.js');
const { GMIntelSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMIntelSurfaceService.js');
const { HolonetIntelService } = await import('/systems/foundryvtt-swse/scripts/holonet/subsystems/holonet-intel-service.js');
const intelIdOf = (record) => HolonetIntelService.getIntelMetadata(record).id;

// ============================================================
// LOCATION PARITY — real GMLocationsSurfaceService.buildViewModel()
// compared against GMCampaignContextService.forLocation() on one fixture
// exercising every relationship field (Correction 4/13).
// ============================================================
{
  const CONTROLLER_FACTION = { id: 'hutt-cartel', name: 'Hutt Cartel', contacts: [{ id: 'vigo-korda', name: 'Vigo Korda' }] };
  const PRESENCE_FACTION = { id: 'black-sun', name: 'Black Sun', contacts: [] };
  const CONTACT_ACTOR = { id: 'actor-vexa', name: 'Vexa Nul' };
  const NPC_ACTOR = { id: 'actor-npc', name: 'Local Fixer', uuid: 'Actor.actor-npc' };
  const SCENE = { id: 'scenetatooine1', name: 'Tatooine Streets', active: false };

  const LOCATION = {
    id: 'tatooine', name: 'Tatooine', activeForParty: true,
    controllingFactionId: 'hutt-cartel',
    factionIds: ['hutt-cartel'],
    factionPresence: [{ factionId: 'black-sun', influence: 'moderate' }],
    contactIds: ['vigo-korda'],
    npcActorUuids: ['Actor.actor-npc'],
    linkedJobIds: ['job-forward-only'],
    linkedIntelIds: [],
    map: { sceneUuid: 'Scene.scenetatooine1' }
  };

  // JOB A: only location.linkedJobIds (forward). JOB B: only
  // sourceLocation.locationId (reverse, Phase 4). JOB C: both — the union
  // must return ONE row, not two.
  const JOB_A = jobThreadFixture({ id: 'job-forward-only', title: 'Forward-Linked Contract' });
  const JOB_B = jobThreadFixture({ id: 'job-reverse-only', title: 'Reverse-Linked Contract', sourceLocation: { locationId: 'tatooine' } });
  const JOB_C = jobThreadFixture({ id: 'job-both', title: 'Both-Linked Contract', sourceLocation: { locationId: 'tatooine' } });
  LOCATION.linkedJobIds.push('job-both');

  installShim({
    locations: [LOCATION],
    factions: [CONTROLLER_FACTION, PRESENCE_FACTION],
    threads: [JOB_A, JOB_B, JOB_C],
    actors: [CONTACT_ACTOR, NPC_ACTOR],
    scenes: [SCENE]
  });

  // Create Intel A (forward-only via location.linkedIntelIds), B
  // (reverse-only via linkedLocationId), C (both) against the real
  // HolonetIntelService authority. createIntelDraft() returns the
  // Holonet RECORD, not the intel object — intel.id (what location.
  // linkedIntelIds/relationship rows actually key on) must be read via
  // getIntelMetadata().
  const intelARecord = await HolonetIntelService.createIntelDraft({ title: 'Forward Intel' });
  const intelBRecord = await HolonetIntelService.createIntelDraft({ title: 'Reverse Intel', linkedLocationId: 'tatooine' });
  const intelCRecord = await HolonetIntelService.createIntelDraft({ title: 'Both Intel', linkedLocationId: 'tatooine' });
  const intelAId = intelIdOf(intelARecord);
  const intelBId = intelIdOf(intelBRecord);
  const intelCId = intelIdOf(intelCRecord);
  LOCATION.linkedIntelIds.push(intelAId, intelCId);

  const productionVm = await GMLocationsSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedLocationId: 'tatooine' }) });
  const context = await GMCampaignContextService.forLocation('tatooine');

  // Factions: real parity — same union fields, same ids expected.
  const productionFactionIds = new Set(productionVm.locationManager.selected.factionRows.map(f => f.id));
  const contextFactionIds = new Set(context.relationships.factions.map(f => f.id));
  assert.deepEqual(contextFactionIds, productionFactionIds, 'forLocation() must resolve the same Faction id set as the production Locations VM (controllingFactionId + factionIds[] + factionPresence[])');
  assert.ok(context.relationships.factions.find(f => f.id === 'hutt-cartel').role === 'controlling');
  assert.ok(context.relationships.factions.find(f => f.id === 'black-sun').role === 'presence');

  // Contacts: real parity.
  const productionContactIds = new Set(productionVm.locationManager.selected.contactRows.map(c => c.id));
  const contextContactIds = new Set(context.relationships.contacts.map(c => c.id));
  assert.deepEqual(contextContactIds, productionContactIds, 'forLocation() must resolve the same Contact id set as the production Locations VM');

  // Actors: real parity.
  assert.equal(context.relationships.actors.length, 1);
  assert.equal(context.relationships.actors[0].id, 'actor-npc');
  assert.equal(context.relationships.actors[0].resolved, true);

  // Jobs: GMLocationsSurfaceService's own VM is FORWARD-ONLY
  // (location.linkedJobIds.map(resolveJobRow) — confirmed by reading
  // selectedVm()); it does not see job-reverse-only at all. forLocation()
  // correctly returns the UNION (forward ∪ reverse), a genuine
  // Phase-6 improvement over the production Locations VM, not a
  // divergent/competing interpretation — so this is asserted directly
  // rather than compared for exact equality against the production set.
  const productionJobIds = new Set(productionVm.locationManager.selected.jobRows.map(j => j.id));
  assert.deepEqual(productionJobIds, new Set(['job-forward-only', 'job-both']), 'sanity: production Locations VM is confirmed forward-linkedJobIds-only');
  const contextJobIds = context.relationships.jobs.map(j => j.id);
  assert.equal(new Set(contextJobIds).size, contextJobIds.length, 'job-both must appear exactly once — union, not duplicated');
  assert.deepEqual(new Set(contextJobIds), new Set(['job-forward-only', 'job-reverse-only', 'job-both']), 'forLocation() must union forward linkedJobIds with reverse sourceLocation.locationId matches');

  // Intel: same forward-only-vs-union relationship as Jobs above.
  const productionIntelIds = new Set(productionVm.locationManager.selected.intelRows.map(i => i.id));
  assert.deepEqual(productionIntelIds, new Set([intelAId, intelCId]), 'sanity: production Locations VM is confirmed forward-linkedIntelIds-only');
  const contextIntelIds = context.relationships.intel.map(i => i.id);
  assert.equal(new Set(contextIntelIds).size, contextIntelIds.length, 'both-linked Intel must appear exactly once — union, not duplicated');
  assert.deepEqual(new Set(contextIntelIds), new Set([intelAId, intelBId, intelCId]), 'forLocation() must union forward linkedIntelIds with reverse linkedLocationId matches');

  // Scenes.
  assert.equal(context.relationships.scenes.length, 1);
  assert.equal(context.relationships.scenes[0].id, 'scenetatooine1');
  assert.equal(context.relationships.scenes[0].resolved, true);

  // A stored linkedJobId/linkedIntelId that no longer resolves must be a
  // real missing row, never silently dropped (Correction 4).
  installShim({
    locations: [{ ...LOCATION, linkedJobIds: ['ghost-job'], linkedIntelIds: ['ghost-intel'] }],
    factions: [CONTROLLER_FACTION, PRESENCE_FACTION],
    threads: [],
    actors: []
  });
  const brokenContext = await GMCampaignContextService.forLocation('tatooine');
  assert.equal(brokenContext.relationships.jobs.length, 1);
  assert.equal(brokenContext.relationships.jobs[0].resolutionKind, 'missing');
  assert.equal(brokenContext.relationships.intel.length, 1);
  assert.equal(brokenContext.relationships.intel[0].resolutionKind, 'missing');
}

console.log('Location context parity passed (Factions/Contacts real parity vs. production Locations VM; Jobs/Intel proven as a superset union over the production VM\'s forward-only set; broken linked ids report missing, never dropped).');

// ============================================================
// FACTION PARITY — real GMFactionRelationshipSurfaceService.buildViewModel()
// compared against GMCampaignContextService.forFaction().
// ============================================================
{
  const FACTION = {
    id: 'black-sun', name: 'Black Sun',
    contacts: [
      { id: 'vexa-nul', name: 'Vexa Nul' },
      { id: 'promoted-contact', name: 'Promoted Contact', actorUuid: 'Actor.promoted-actor' }
    ]
  };
  const CONTROLLED_LOCATION = { id: 'nar-shaddaa', name: 'Nar Shaddaa', controllingFactionId: 'black-sun', factionIds: [], factionPresence: [] };
  const PRESENCE_LOCATION = { id: 'coruscant-underworld', name: 'Coruscant Underworld', controllingFactionId: '', factionIds: [], factionPresence: [{ factionId: 'black-sun', influence: 'weak' }] };
  const ISSUER_JOB = jobThreadFixture({ id: 'job-issuer', title: 'Black Sun Contract', issuer: { factionId: 'black-sun', factionName: 'Black Sun' } });
  const RIVAL_JOB = jobThreadFixture({
    id: 'job-rival', title: 'Rival Stakes Contract',
    issuer: { factionId: 'hutt-cartel', factionName: 'Hutt Cartel' },
    factionConsequences: { additionalConsequences: [{ factionName: 'Black Sun', type: 'rival', successDelta: -1 }] }
  });
  const PROMOTED_ACTOR = { id: 'promoted-actor', name: 'Promoted Contact', uuid: 'Actor.promoted-actor' };

  installShim({
    locations: [CONTROLLED_LOCATION, PRESENCE_LOCATION],
    factions: [FACTION, { id: 'hutt-cartel', name: 'Hutt Cartel', contacts: [] }],
    threads: [ISSUER_JOB, RIVAL_JOB],
    actors: [PROMOTED_ACTOR]
  });
  const intelLinked = await HolonetIntelService.createIntelDraft({ title: 'Black Sun Intel', linkedFactionId: 'black-sun' });
  const intelLinkedId = intelIdOf(intelLinked);

  const productionVm = await GMFactionRelationshipSurfaceService.buildViewModel({ getSurfaceState: () => ({ focusedFactionId: 'black-sun' }) });
  const productionEntry = productionVm.factionManager.registry.find(entry => entry.id === 'black-sun');
  const context = await GMCampaignContextService.forFaction('black-sun');

  const productionLocationIds = new Set(productionEntry.relationships.locations.map(l => l.id));
  const contextLocationIds = new Set(context.relationships.locations.map(l => l.id));
  assert.deepEqual(contextLocationIds, productionLocationIds, 'forFaction() must resolve the same Location id set as the production Faction VM (controlling + presence)');
  assert.deepEqual(contextLocationIds, new Set(['nar-shaddaa', 'coruscant-underworld']));
  assert.equal(context.relationships.locations.find(l => l.id === 'nar-shaddaa').role, 'controlling');
  assert.equal(context.relationships.locations.find(l => l.id === 'coruscant-underworld').role, 'presence');

  const productionJobIds = new Set(productionEntry.relationships.jobs.map(j => j.id));
  const contextJobIds = new Set(context.relationships.jobs.map(j => j.id));
  assert.deepEqual(contextJobIds, productionJobIds, 'forFaction() must resolve the same Job id set as the production Faction VM, including rival/additional-consequence Jobs, via the same filterJobsByIssuer() call');
  assert.deepEqual(contextJobIds, new Set(['job-issuer', 'job-rival']), 'both the issuer Job and the rival-consequence Job must be included');

  const productionIntelIds = new Set(productionEntry.relationships.intel.map(i => i.id));
  const contextIntelIds = new Set(context.relationships.intel.map(i => i.id));
  assert.deepEqual(contextIntelIds, productionIntelIds);
  assert.deepEqual(contextIntelIds, new Set([intelLinkedId]));

  // Contacts + promoted-Actor: a separate row, never a merged/opaque id.
  assert.equal(context.relationships.contacts.length, 2);
  assert.ok(context.relationships.contacts.some(c => c.id === 'vexa-nul'));
  assert.ok(context.relationships.contacts.some(c => c.id === 'promoted-contact'));
  assert.equal(context.relationships.contactActors.length, 1);
  assert.equal(context.relationships.contactActors[0].id, 'promoted-actor');
  assert.equal(context.relationships.contactActors[0].resolved, true);

  // Faction<->Faction stays honestly absent, never fabricated.
  assert.ok(context.limitations.some(l => l.includes('Faction<->Faction')));
}

console.log('Faction context parity passed (Locations/Jobs/Intel real parity vs. production Faction VM, including rival-consequence Jobs; Contacts vs. promoted-Actor kept as separate rows).');

// ============================================================
// JOB — canonical/legacy/ambiguous/missing issuer, non-Job-thread
// rejection, real parity vs. production Job Board VM.
// ============================================================
{
  const FACTION = { id: 'black-sun', name: 'Black Sun', contacts: [{ id: 'vexa-nul', name: 'Vexa Nul' }] };
  const CANONICAL_JOB = jobThreadFixture({ id: 'job-canonical', title: 'Canonical Issuer', issuer: { factionId: 'black-sun', contactId: 'vexa-nul' }, sourceLocation: { locationId: 'tatooine' } });
  const LEGACY_JOB = jobThreadFixture({ id: 'job-legacy', title: 'Legacy Issuer', issuer: { factionName: 'Black Sun' } });
  const AMBIGUOUS_JOB = jobThreadFixture({ id: 'job-ambiguous', title: 'Ambiguous Issuer', issuer: { factionName: 'Duplicate Name' } });
  const NON_JOB_THREAD = { id: 'thread-not-a-job', title: 'Private Message', metadata: { threadType: 'message' } };
  const LOCATION = { id: 'tatooine', name: 'Tatooine', activeForParty: true };

  installShim({
    locations: [LOCATION],
    factions: [
      FACTION,
      { id: 'dup-a', name: 'Duplicate Name', contacts: [] },
      { id: 'dup-b', name: 'Duplicate Name', contacts: [] }
    ],
    threads: [CANONICAL_JOB, LEGACY_JOB, AMBIGUOUS_JOB, NON_JOB_THREAD]
  });
  const intelForJob = await HolonetIntelService.createIntelDraft({ title: 'Canonical Job Intel', linkedJobThreadId: 'job-canonical' });
  const intelForJobId = intelIdOf(intelForJob);

  // Non-Job thread must NEVER masquerade as a resolved Job (Correction 6).
  const nonJobContext = await GMCampaignContextService.forJob('thread-not-a-job');
  assert.equal(nonJobContext.subject.resolved, false);
  assert.equal(nonJobContext.subject.resolutionKind, 'missing');
  assert.notEqual(nonJobContext.subject.status, 'posted');

  // Canonical — real parity vs. production Job Board VM.
  const productionVm = await GMJobBoardSurfaceService.buildViewModel({ getSurfaceState: () => ({}), selectedJobThreadId: 'job-canonical' });
  const productionJob = productionVm.jobBoard.selectedJob;
  const canonicalContext = await GMCampaignContextService.forJob('job-canonical');
  assert.equal(canonicalContext.relationships.faction.id, productionJob.relationships.issuerFaction.id);
  assert.equal(canonicalContext.relationships.faction.resolutionKind, productionJob.relationships.issuerFaction.resolutionKind);
  assert.equal(canonicalContext.relationships.faction.resolutionKind, 'canonical-id');
  assert.equal(canonicalContext.relationships.contact.id, 'vexa-nul');
  assert.equal(canonicalContext.relationships.location.id, 'tatooine');
  assert.equal(canonicalContext.party.currentPartyAtMissionLocation, true);
  assert.equal(canonicalContext.relationships.intel.length, 1);
  assert.equal(canonicalContext.relationships.intel[0].id, intelForJobId);

  // Legacy unique name.
  const legacyContext = await GMCampaignContextService.forJob('job-legacy');
  assert.equal(legacyContext.relationships.faction.resolutionKind, 'legacy-name-unique');
  assert.equal(legacyContext.relationships.faction.id, 'black-sun');

  // Ambiguous — never an arbitrary guess.
  const ambiguousContext = await GMCampaignContextService.forJob('job-ambiguous');
  assert.equal(ambiguousContext.relationships.faction.resolutionKind, 'ambiguous');
  assert.equal(ambiguousContext.relationships.faction.id, '');
}

console.log('Job context parity passed (non-Job thread rejected, canonical issuer matches production Job Board VM exactly, legacy-unique and ambiguous classification both honest).');

// ============================================================
// INTEL — full Phase 5 relationship set (Location, Faction, Contact,
// Actor, Job, Scene, source Fact), real parity vs. production Intel VM.
// ============================================================
{
  const LOCATION = {
    id: 'tatooine', name: 'Tatooine', activeForParty: true,
    atlasFacts: [{ id: 'exchange-route', title: 'Hidden Exchange Route', teaser: 'Black Sun ships avoid checkpoints.' }]
  };
  const FACTION = { id: 'black-sun', name: 'Black Sun', contacts: [{ id: 'vexa-nul', name: 'Vexa Nul' }] };
  const JOB_THREAD = jobThreadFixture({ id: 'job-789', title: 'Recover the Broken Cipher' });
  const SCENE = { id: 'scene1', name: 'Cantina', active: false };
  const ACTOR = { id: 'actorvexa1', name: 'Vexa Nul', uuid: 'Actor.actorvexa1' };

  installShim({ locations: [LOCATION], factions: [FACTION], threads: [JOB_THREAD], scenes: [SCENE], actors: [ACTOR] });
  const record = await HolonetIntelService.createIntelDraft({
    title: 'Exchange Route Coordinates',
    linkedLocationId: 'tatooine',
    sourceFactId: 'exchange-route',
    linkedFactionId: 'black-sun',
    linkedContactId: 'vexa-nul',
    linkedActorUuid: 'Actor.actorvexa1',
    linkedJobThreadId: 'job-789',
    linkedSceneUuid: 'Scene.scene1'
  });

  const productionVm = await GMIntelSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedRecordId: record.id }) });
  const productionCard = productionVm.intelManager.selectedCard;
  const context = await GMCampaignContextService.forIntel(record.id);

  assert.equal(context.relationships.location.id, productionCard.relationships.location.id);
  assert.equal(context.relationships.location.id, 'tatooine');
  assert.equal(context.relationships.sourceFact.id, productionCard.relationships.sourceFact.id);
  assert.equal(context.relationships.sourceFact.id, 'exchange-route');
  assert.equal(context.relationships.faction.id, productionCard.relationships.faction.id);
  assert.equal(context.relationships.contact.id, productionCard.relationships.contact.id);
  assert.equal(context.relationships.job.id, productionCard.relationships.job.id);
  assert.equal(context.relationships.job.id, 'job-789');
  assert.equal(context.relationships.scene.id, productionCard.relationships.scene.id);
  assert.equal(context.relationships.actor.id, productionCard.relationships.actor.id);
  assert.equal(context.party.currentPartyAtLocation, true);
}

console.log('Intel context parity passed (Location/source-Fact/Faction/Contact/Job/Scene/Actor all match the production Intel VM exactly, using the same Phase 5 resolver functions).');

// ============================================================
// ACTOR — object/raw-id/uuid all resolve the same Actor; real Faction
// relationship ledger vs. Faction Contact association kept separate.
// ============================================================
{
  const { FactionRegistryService } = await import('/systems/foundryvtt-swse/scripts/allies/faction-registry-service.js');
  const FACTION = { id: 'rebel-alliance', name: 'Rebel Alliance', contacts: [{ id: 'contact-1', name: 'Liaison', actorUuid: 'Actor.han-solo' }] };
  const relationshipLedger = [{ id: 'rel-1', factionId: 'rebel-alliance', factionName: 'Rebel Alliance', relationshipType: 'ally', score: 4 }];
  const HAN = {
    id: 'han-solo', name: 'Han Solo', uuid: 'Actor.han-solo',
    getFlag: (_scope, key) => (key === FactionRegistryService.ACTOR_RELATIONSHIPS_FLAG ? relationshipLedger : undefined)
  };
  const JOB_WITH_ACTOR_ISSUER = jobThreadFixture({ id: 'job-han', title: 'Smuggling Run', issuer: { contactActorUuid: 'Actor.han-solo' } });

  installShim({ factions: [FACTION], threads: [JOB_WITH_ACTOR_ISSUER], actors: [HAN] });
  const intelForHan = await HolonetIntelService.createIntelDraft({ title: 'Han Solo Intel', linkedActorUuid: 'Actor.han-solo' });
  const intelForHanId = intelIdOf(intelForHan);

  const byObject = await GMCampaignContextService.forActor(HAN);
  const byRawId = await GMCampaignContextService.forActor('han-solo');
  const byUuid = await GMCampaignContextService.forActor('Actor.han-solo');

  for (const [label, context] of [['object', byObject], ['raw id', byRawId], ['uuid', byUuid]]) {
    assert.equal(context.subject.resolved, true, `forActor() must resolve via ${label}`);
    assert.equal(context.subject.id, 'han-solo', `forActor() via ${label} must resolve the same real Actor`);
  }

  // Real Faction relationship ledger (score/standing) — a different
  // concept from a Faction Contact association (Correction 8).
  assert.equal(byObject.relationships.factions.length, 1);
  assert.equal(byObject.relationships.factions[0].id, 'rebel-alliance');
  assert.equal(byObject.relationships.factions[0].status, 'ally');

  assert.equal(byObject.relationships.factionContacts.length, 1);
  const contactAssoc = byObject.relationships.factionContacts[0];
  assert.equal(contactAssoc.factionId, 'rebel-alliance');
  assert.equal(contactAssoc.contactId, 'contact-1');
  assert.equal(contactAssoc.actorUuid, 'Actor.han-solo');
  assert.equal(typeof contactAssoc.id, 'undefined', 'a Faction Contact association row must never carry an opaque composite id field');

  assert.equal(byObject.relationships.jobs.length, 1);
  assert.equal(byObject.relationships.jobs[0].id, 'job-han');

  assert.equal(byObject.relationships.intel.length, 1);
  assert.equal(byObject.relationships.intel[0].id, intelForHanId);

  assert.ok(byObject.operations.trades !== undefined, 'Trade must be reported as operational context, not a relationship');
  assert.ok(byObject.operations.recovery !== undefined || byObject.limitations.length > 0, 'recovery must be a real result or an honest limitation, never a silent false negative');
}

console.log('Actor context parity passed (object/raw-id/uuid all resolve the same Actor; real Faction relationship ledger kept separate from Faction Contact association; Jobs/Intel/Trade all real).');
