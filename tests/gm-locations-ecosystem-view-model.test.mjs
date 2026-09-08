import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 1S: the selected Location's
// campaign-hub view model, executed for real against realistic linked
// data across every real authority Locations resolves through
// (LocationRegistryService itself, FactionRegistryService, world Actors,
// HolonetStorage-backed Job Board threads, and Holonet Intel records).
//
// This proves resolved labels/ids, not just that the keys exist: a
// controlling Faction's real name, a linked Job's real title/status
// (never a copy stored on the Location — resolved fresh from the Job
// Board's own thread/status derivation, GMJobBoardSurfaceService's
// jobForThread/jobStatus/statusLabel, exported for exactly this reuse),
// a linked Intel record's real title/status (via
// HolonetIntelService.getIntelById/toIntelSummary), and a per-location
// unresolved Atlas Lead discovery — a materially different concept from
// linked Intel, scoped by LocationRegistryService.getAtlasLeadDiscoveries's
// own locationId filter, not derived from it.

registerFoundryPathLoader();

function makeActorsCollection(actorList) {
  const byId = new Map(actorList.map(a => [a.id, a]));
  return { contents: actorList, get: (id) => byId.get(id), [Symbol.iterator]: () => actorList[Symbol.iterator]() };
}

function fakeActor(id, name, initialLeadDiscoveries = []) {
  let state = { leadDiscoveries: initialLeadDiscoveries };
  return {
    id,
    name,
    getFlag: () => state,
    setFlag: async (_scope, _key, value) => { state = value; return value; }
  };
}

function installShim({ locations = [], factions = [], threads = [], records = [], actors = [] } = {}) {
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
      scenes: new Map()
    }
  });
  globalThis.foundry.utils.randomID = () => `test-${Math.random().toString(36).slice(2, 10)}`;
}

const { GMLocationsSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMLocationsSurfaceService.js');

const jawaActor = { id: 'jawaactor1', name: 'Jawa Trader', img: '' };
const actorWithLead = fakeActor('scout-actor', 'Party Scout', [{
  id: 'lead-1', actorId: 'scout-actor', locationId: 'mos-eisley', factId: 'fact-1',
  skill: 'perception', dc: 15, status: 'open', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z'
}]);

installShim({
  locations: [
    {
      id: 'mos-eisley', name: 'Mos Eisley', publicSummary: 'A wretched hive.',
      controllingFactionId: 'hutt-cartel',
      factionPresence: [{ factionId: 'hutt-cartel', influence: 'controls' }],
      contactIds: ['vigo-korda'],
      npcActorUuids: ['Actor.jawaactor1'],
      linkedJobIds: ['job-thread-1'],
      linkedIntelIds: ['intel-1'],
      encounterSeeds: [{ id: 'seed-1', name: 'Tusken Raider Party', category: 'random', quantity: '3' }],
      map: { sceneUuid: '', imagePath: 'icons/mos-eisley.svg' },
      atlasFacts: [{ id: 'fact-1', title: 'Smuggler Tunnels', category: 'general', revealState: 'hidden' }]
    },
    { id: 'docking-bay-94', name: 'Docking Bay 94', parentLocationId: 'mos-eisley' }
  ],
  factions: [
    { id: 'hutt-cartel', name: 'Hutt Cartel', contacts: [{ id: 'vigo-korda', name: 'Vigo Korda', role: 'Fixer' }] }
  ],
  threads: [
    { id: 'job-thread-1', title: 'Escort the Shipment', metadata: { threadType: 'job', job: { title: 'Escort the Shipment', status: 'accepted', issuer: { name: 'Vigo Korda' } } } }
  ],
  records: [
    { id: 'intel-record-1', type: 'message', metadata: { intel: { id: 'intel-1', title: 'Hutt Tribute Route', status: 'released' } } }
  ],
  actors: [jawaActor, actorWithLead]
});

const vm = await GMLocationsSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedLocationId: 'mos-eisley' }) });
const selected = vm.locationManager.selected;
assert.ok(selected, 'expected a selected Location VM');

// --- currentSituation --------------------------------------------------
assert.equal(selected.currentSituation.controllingFaction?.name, 'Hutt Cartel', 'controllingFaction must resolve the real faction name, not just an id');
assert.equal(selected.currentSituation.activeJobCount, 1, 'a job in status "accepted" (not paid/archived/failed) must count as active');
assert.equal(selected.currentSituation.unresolvedLeadCount, 1);
assert.equal(selected.currentSituation.encounterSeedCount, 1);
assert.equal(selected.currentSituation.hasScene, false, 'no map.sceneUuid was set for this fixture');

// --- relationships -------------------------------------------------------
assert.equal(selected.relationships.factions.length, 1);
assert.equal(selected.relationships.factions[0].name, 'Hutt Cartel');
assert.equal(selected.relationships.factions[0].isController, true, 'the controllingFactionId must be marked as the controller, not just present');

assert.equal(selected.relationships.contacts.length, 2, 'both the registered Faction contact and the raw Actor UUID link must appear');
const contactRow = selected.relationships.contacts.find(row => row.kind === 'contact');
assert.equal(contactRow.name, 'Vigo Korda');
assert.match(contactRow.roleLabel, /Fixer/);
const actorRow = selected.relationships.contacts.find(row => row.kind === 'actor');
assert.equal(actorRow.name, 'Jawa Trader', 'the raw Actor UUID must resolve to the real world Actor\'s name');

assert.equal(selected.relationships.jobs.length, 1);
assert.equal(selected.relationships.jobs[0].title, 'Escort the Shipment', 'the linked Job\'s real title must be resolved from the Job Board thread, never stored on the Location');
assert.equal(selected.relationships.jobs[0].status, 'accepted');
assert.equal(selected.relationships.jobs[0].clientLabel, 'Vigo Korda');

assert.equal(selected.relationships.intel.length, 1);
assert.equal(selected.relationships.intel[0].title, 'Hutt Tribute Route', 'the linked Intel record\'s real title must be resolved from Holonet Intel, never stored on the Location');
assert.equal(selected.relationships.intel[0].status, 'released');

assert.equal(selected.relationships.leads.length, 1, 'an unresolved Atlas Lead discovery scoped to this location must appear as a Lead, not merged into Intel');
assert.equal(selected.relationships.leads[0].actorName, 'Party Scout');
assert.notEqual(selected.relationships.leads[0].id, selected.relationships.intel[0].id, 'a Lead and Intel must never share identity even incidentally');

// --- preparation -----------------------------------------------------------
assert.equal(selected.preparation.encounterSeeds.length, 1);
assert.equal(selected.preparation.encounterSeeds[0].name, 'Tusken Raider Party');
assert.equal(selected.preparation.scenes.length, 0, 'no scene was linked for this fixture');
assert.equal(selected.preparation.canCreateScene, true, 'map.imagePath is set, so Create Scene must be available');

// --- world -------------------------------------------------------------
assert.equal(selected.world.children.length, 1);
assert.equal(selected.world.children[0].name, 'Docking Bay 94');
assert.equal(selected.world.atlasFacts.length, 1);
assert.equal(selected.world.atlasFacts[0].title, 'Smuggler Tunnels');

// --- legacy flat VM parity ---------------------------------------------
// selectedVm() grew the identity/currentSituation/relationships/
// preparation/world groups ADDITIVELY — every pre-existing flat property
// the create/edit wizard and prior-stage controller code already depend
// on must survive untouched, so this migration can never silently break
// something that isn't rendered by the new template yet.
assert.ok(selected.raw, 'the raw unmodified Location record must still be present');
assert.equal(selected.raw.id, 'mos-eisley');
assert.ok(Array.isArray(selected.children));
assert.equal(selected.children.length, 1);
assert.ok(Array.isArray(selected.factionRows));
assert.equal(selected.factionRows.length, 1);
assert.equal(selected.factionRows[0].name, 'Hutt Cartel');
assert.ok(Array.isArray(selected.contactRows));
assert.equal(selected.contactRows.length, 1);
assert.equal(selected.contactRows[0].name, 'Vigo Korda');
assert.ok(Array.isArray(selected.actorRows));
assert.equal(selected.actorRows.length, 1);
assert.equal(selected.actorRows[0].name, 'Jawa Trader');
assert.ok(Array.isArray(selected.sceneRows));
assert.ok(Array.isArray(selected.encounterSeeds));
assert.equal(selected.encounterSeeds.length, 1);
assert.ok(Array.isArray(selected.atlasFacts));
assert.equal(selected.atlasFacts.length, 1);
// The legacy jobRows/intelRows stay the old raw-id-only shape (never
// resolved) — a separate consumer that only ever read `{ id }` must not
// break just because relationships.jobs/intel now resolve real data.
assert.deepEqual(selected.jobRows, [{ id: 'job-thread-1' }]);
assert.deepEqual(selected.intelRows, [{ id: 'intel-1' }]);
assert.equal(typeof selected.mapImagePath, 'string');
assert.equal(selected.mapImagePath, 'icons/mos-eisley.svg');
assert.equal(typeof selected.factionIdsText, 'string');
assert.equal(typeof selected.linkedJobIdsText, 'string');

// --- a linked-but-deleted Job/Intel resolves honestly as missing, not a
// crash or a false success ---------------------------------------------
{
  installShim({
    locations: [{ id: 'dagobah', name: 'Dagobah', linkedJobIds: ['ghost-job'], linkedIntelIds: ['ghost-intel'] }]
  });
  const vm2 = await GMLocationsSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedLocationId: 'dagobah' }) });
  assert.equal(vm2.locationManager.selected.relationships.jobs[0].missing, true);
  assert.equal(vm2.locationManager.selected.relationships.jobs[0].title, 'Missing Job');
  assert.equal(vm2.locationManager.selected.relationships.intel[0].missing, true);
  assert.equal(vm2.locationManager.selected.relationships.intel[0].title, 'Missing Intel');
}

console.log('GM Locations ecosystem view model contract passed (currentSituation/relationships/preparation/world all resolve real linked data from their own authorities, with honest missing-reference handling).');
