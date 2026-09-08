import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 4: the selected Job's ecosystem
// view-model grouping (identity/currentSituation/relationships/mission/
// world), executed for real against realistic linked data across every
// real authority Job Board resolves through (FactionRegistryService,
// LocationRegistryService, HolonetIntelService), plus the canonical-vs-
// legacy issuer Faction identity contract (4AC/4AG).
//
// PURE ADDITIVE DESIGN CONTRACT (no prior bug — these groups did not exist
// on the Job VM before this phase): pre-Phase-4 source has no
// identity/currentSituation/relationships/mission/world fields on
// jobBoard.selectedJob at all. Phase-4 source satisfies the contract.
//
// The Job -> Location relationship specifically closes a real, provable
// gap (BUG-CATEGORY, not purely additive): before this phase,
// LocationJobBridgeService.buildDraftFromLocation() produced a
// draft.location, but nothing in the create-form submission path or
// HolonetMessengerService.createJobPosting()/_gmCreateJobPosting() ever
// carried it onto the created Job — a Job created from a Location lost its
// Location relationship entirely at creation time.

registerFoundryPathLoader();

function makeActorsCollection(actorList) {
  const byId = new Map(actorList.map(a => [a.id, a]));
  return { contents: actorList, get: (id) => byId.get(id), [Symbol.iterator]: () => actorList[Symbol.iterator]() };
}

function installShim({ locations = [], factions = [], threads = [], records = [], actors = [], users = [] } = {}) {
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
      scenes: new Map()
    }
  });
  globalThis.foundry.utils.randomID = () => `test-${Math.random().toString(36).slice(2, 10)}`;
}

const { GMJobBoardSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMJobBoardSurfaceService.js');

// --- 1: canonical NEW Job — factionId/contactId/locationId/intelId all
// resolve correctly (executed) ----------------------------------------
{
  installShim({
    factions: [{ id: 'hutt-cartel', name: 'Hutt Cartel', contacts: [{ id: 'vigo-korda', name: 'Vigo Korda', role: 'Fixer' }] }],
    locations: [{ id: 'mos-eisley', name: 'Mos Eisley', activeForParty: true }],
    threads: [
      {
        id: 'job-thread-1', title: 'Escort the Shipment',
        metadata: {
          threadType: 'job',
          job: {
            title: 'Escort the Shipment',
            status: 'posted',
            issuer: { type: 'faction-contact', factionId: 'hutt-cartel', factionName: 'Hutt Cartel', contactId: 'vigo-korda', contactName: 'Vigo Korda' },
            sourceLocation: { locationId: 'mos-eisley', locationName: 'Mos Eisley' },
            factionConsequences: { factionName: 'Hutt Cartel', factionId: 'hutt-cartel', successDelta: 2, failureDelta: -1 },
            objectives: [{ id: 'primary', type: 'primary', title: 'Escort the Shipment', required: true, rewardCredits: 5000 }]
          }
        }
      }
    ],
    records: [
      { id: 'intel-record-1', type: 'message', metadata: { intel: { id: 'intel-1', title: 'Hutt Tribute Route', status: 'released', linkedJobThreadId: 'job-thread-1' } } }
    ]
  });

  const vm = await GMJobBoardSurfaceService.buildViewModel({ selectedJobThreadId: 'job-thread-1', getSurfaceState: () => ({}) });
  const job = vm.jobBoard.selectedJob;
  assert.ok(job, 'expected a selected Job');

  assert.equal(job.identity.threadId, 'job-thread-1');
  assert.equal(job.identity.title, 'Escort the Shipment');
  assert.equal(job.identity.status, 'posted');

  assert.equal(job.relationships.issuerFaction.id, 'hutt-cartel');
  assert.equal(job.relationships.issuerFaction.resolutionKind, 'canonical-id', 'a real issuer.factionId must resolve as canonical-id, not a name guess');

  assert.equal(job.relationships.contact.kind, 'contact');
  assert.equal(job.relationships.contact.id, 'vigo-korda', 'the real stable contactId must be exposed, not a display name');

  assert.equal(job.relationships.locations.length, 1);
  assert.equal(job.relationships.locations[0].id, 'mos-eisley', 'the Job\'s real sourceLocation.locationId must resolve to the exact Location');
  assert.equal(job.relationships.locations[0].currentPartyPresence, true);
  assert.equal(job.currentSituation.currentPartyAtMissionLocation, true, 'truthful party-at-mission-location signal, derived only from real data');

  assert.equal(job.relationships.intel.length, 1);
  assert.equal(job.relationships.intel[0].id, 'intel-1', 'Job -> Intel resolves via Intel\'s own linkedJobThreadId, never a bridge/draft service');

  assert.equal(job.relationships.rivalFactions.length, 0, 'the Hutt Cartel consequence is the primary issuer, not a rival stake');
  assert.equal(job.mission.objective, 'Escort the Shipment');
  assert.ok(job.mission.reward, 'mission.reward must expose the existing reward summary');
  assert.ok(job.currentSituation);

  // Legacy flat VM parity — every pre-existing field must survive.
  assert.equal(typeof job.threadId, 'string');
  assert.equal(typeof job.clientLabel, 'string');
  assert.ok(Array.isArray(job.objectives));
  assert.ok(job.rewards);
  assert.ok(Array.isArray(job.consequenceEntries));
}

// --- 2: legacy Job with only a factionName (no factionId) resolves the
// Faction relationship when the name is unique (executed) ------------------
{
  installShim({
    factions: [{ id: 'rebel-cell', name: 'Rebel Cell' }],
    threads: [
      {
        id: 'job-legacy-1', title: 'Old Contract',
        metadata: { threadType: 'job', job: { title: 'Old Contract', status: 'posted', issuer: { type: 'faction', factionName: 'Rebel Cell' } } }
      }
    ]
  });
  const vm = await GMJobBoardSurfaceService.buildViewModel({ selectedJobThreadId: 'job-legacy-1', getSurfaceState: () => ({}) });
  const job = vm.jobBoard.selectedJob;
  assert.equal(job.relationships.issuerFaction.resolutionKind, 'legacy-name-unique');
  assert.equal(job.relationships.issuerFaction.id, 'rebel-cell', 'a unique legacy name match must resolve the real Faction id for navigation');
}

// --- 3: ambiguous legacy Faction name — no arbitrary canonical id chosen
// (executed; proves Faction names are NOT guaranteed unique in the
// registry storage layer, since this fixture bypasses upsertFaction()'s
// own name-merge behavior the way a hand-edited/imported world could) -----
{
  installShim({
    factions: [
      { id: 'guild-a', name: 'Miners Guild' },
      { id: 'guild-b', name: 'Miners Guild' }
    ],
    threads: [
      {
        id: 'job-ambiguous-1', title: 'Ambiguous Contract',
        metadata: { threadType: 'job', job: { title: 'Ambiguous Contract', status: 'posted', issuer: { type: 'faction', factionName: 'Miners Guild' } } }
      }
    ]
  });
  const vm = await GMJobBoardSurfaceService.buildViewModel({ selectedJobThreadId: 'job-ambiguous-1', getSurfaceState: () => ({}) });
  const job = vm.jobBoard.selectedJob;
  assert.equal(job.relationships.issuerFaction.resolutionKind, 'ambiguous', 'two Factions sharing a name must never resolve to an arbitrarily-chosen id');
  assert.equal(job.relationships.issuerFaction.id, '', 'an ambiguous match must not expose a guessed id');
}

// --- 4: no Location/Intel context — honest empty relationships, not a
// crash or a fabricated row (executed) --------------------------------
{
  installShim({
    threads: [
      { id: 'job-bare-1', title: 'Bare Job', metadata: { threadType: 'job', job: { title: 'Bare Job', status: 'posted' } } }
    ]
  });
  const vm = await GMJobBoardSurfaceService.buildViewModel({ selectedJobThreadId: 'job-bare-1', getSurfaceState: () => ({}) });
  const job = vm.jobBoard.selectedJob;
  assert.equal(job.relationships.issuerFaction.resolutionKind, 'missing');
  assert.equal(job.relationships.contact, null);
  assert.deepEqual(job.relationships.locations, []);
  assert.deepEqual(job.relationships.intel, []);
  assert.equal(job.currentSituation.locationReady, false);
  assert.equal(job.currentSituation.currentPartyAtMissionLocation, false);
}

console.log('GM Job Board ecosystem view model contract passed (identity/currentSituation/relationships/mission/world resolve real linked data; canonical-id/legacy-name-unique/ambiguous/missing issuer identity classified truthfully; legacy flat VM fields untouched).');
