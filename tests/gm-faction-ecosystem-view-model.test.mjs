import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 3: the selected Faction's ecosystem
// view-model grouping (identity/currentSituation/relationships/world),
// executed for real against realistic linked data across every real
// authority Factions resolves through (FactionRegistryService itself,
// LocationRegistryService, HolonetStorage-backed Job Board threads, and
// Holonet Intel records) — mirroring
// tests/gm-locations-ecosystem-view-model.test.mjs for the Locations side
// of the same ecosystem contract.
//
// This is a PURE ADDITIVE DESIGN CONTRACT, not a bug-fix regression test:
// there was no prior "bug" here, since identity/currentSituation/
// relationships/world did not exist on the Faction VM before Phase 3. Proof
// standard used: pre-Phase-3 source lacks this contract entirely (no such
// fields on the VM at all — asserted structurally below would throw
// "Cannot read properties of undefined"), Phase-3 source satisfies it.
//
// Also proves every pre-existing flat field (locationRows, contacts,
// jobStats, recentJobs, intelCount, contactCount, scoreLabel, isFocused,
// searchText, ...) survives untouched — the ecosystem groups were added
// additively, never replacing the legacy shape existing template/
// controller/approval code depends on.

registerFoundryPathLoader();

function makeActorsCollection(actorList) {
  const byId = new Map(actorList.map(a => [a.id, a]));
  return { contents: actorList, get: (id) => byId.get(id), [Symbol.iterator]: () => actorList[Symbol.iterator]() };
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

installShim({
  factions: [
    {
      id: 'hutt-cartel', name: 'Hutt Cartel', type: 'Syndicate', status: 'active', score: 2,
      contacts: [{ id: 'vigo-korda', name: 'Vigo Korda', role: 'Fixer' }]
    },
    { id: 'rebel-cell', name: 'Rebel Cell', type: 'Resistance', status: 'active' }
  ],
  locations: [
    { id: 'mos-eisley', name: 'Mos Eisley', controllingFactionId: 'hutt-cartel' },
    { id: 'nal-hutta', name: 'Nal Hutta', factionPresence: [{ factionId: 'hutt-cartel', influence: 'strong' }], activeForParty: true }
  ],
  threads: [
    {
      id: 'job-thread-1', title: 'Escort the Shipment',
      metadata: { threadType: 'job', job: { title: 'Escort the Shipment', status: 'posted', issuer: { type: 'faction', factionId: 'hutt-cartel', factionName: 'Hutt Cartel', name: 'Hutt Cartel' } } }
    }
  ],
  records: [
    { id: 'intel-record-1', type: 'message', metadata: { intel: { id: 'intel-1', title: 'Hutt Tribute Route', status: 'released', linkedFactionId: 'hutt-cartel' } } }
  ]
});

const { GMFactionRelationshipSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMFactionRelationshipSurfaceService.js');

const vm = await GMFactionRelationshipSurfaceService.buildViewModel({ getSurfaceState: () => ({}) });
const hutts = vm.factionManager.registry.find(row => row.id === 'hutt-cartel');
const rebels = vm.factionManager.registry.find(row => row.id === 'rebel-cell');
assert.ok(hutts, 'expected the Hutt Cartel faction row');
assert.ok(rebels, 'expected the Rebel Cell faction row');

// --- identity ------------------------------------------------------------
assert.equal(hutts.identity.id, 'hutt-cartel');
assert.equal(hutts.identity.name, 'Hutt Cartel');
assert.equal(hutts.identity.status, 'active');

// --- currentSituation ------------------------------------------------------
assert.equal(hutts.currentSituation.controlledLocationCount, 1, 'Mos Eisley is controllingFactionId-owned by the Hutt Cartel');
assert.equal(hutts.currentSituation.presenceLocationCount, 2, 'both Mos Eisley (controls) and Nal Hutta (presence) must count');
assert.equal(hutts.currentSituation.contactCount, 1);
assert.equal(hutts.currentSituation.linkedJobCount, 1);
assert.equal(hutts.currentSituation.activeJobCount, 1, 'a job in status "posted" counts toward jobStats.activeTotal (open)');
assert.equal(hutts.currentSituation.intelCount, 1);
assert.equal(hutts.currentSituation.currentPartyLocationPresence, true, 'Nal Hutta is activeForParty and has Hutt Cartel presence');
assert.equal(rebels.currentSituation.currentPartyLocationPresence, false, 'a faction with no presence at the party\'s current location must not falsely claim party context');

// --- relationships ---------------------------------------------------------
assert.equal(hutts.relationships.locations.length, 2);
const controlsRow = hutts.relationships.locations.find(row => row.id === 'mos-eisley');
const presenceRow = hutts.relationships.locations.find(row => row.id === 'nal-hutta');
assert.equal(controlsRow.roleLabel, 'Controls');
assert.equal(presenceRow.roleLabel, 'Strong', 'a real factionPresence.influence value must resolve to its own label, not a generic "Present"');

assert.equal(hutts.relationships.contacts.length, 1);
assert.equal(hutts.relationships.contacts[0].id, 'vigo-korda', 'the real stable contactId must be exposed, not a display name');

assert.equal(hutts.relationships.jobs.length, 1);
assert.equal(hutts.relationships.jobs[0].id, 'job-thread-1', 'the real canonical Job Board thread id must be exposed for navigation, resolved from HolonetStorage — never a bridge/draft service');
assert.equal(hutts.relationships.jobs[0].title, 'Escort the Shipment');
assert.equal(hutts.relationships.jobs[0].roleLabel, 'Client', 'the Hutt Cartel is this job\'s primary issuer, not merely a rival-consequence target');

assert.equal(hutts.relationships.intel.length, 1);
assert.equal(hutts.relationships.intel[0].id, 'intel-1', 'the real canonical intelId must be exposed, resolved from HolonetIntelService — never LocationIntelBridgeService');
assert.equal(hutts.relationships.intel[0].title, 'Hutt Tribute Route');

assert.deepEqual(hutts.relationships.factions, [], 'no canonical Faction-vs-Faction relationship storage exists anywhere in this codebase — this category must stay empty/deferred, never fabricated');

// A faction with no linked data must resolve honest empty relationship
// groups, not crash or fabricate rows.
assert.equal(rebels.relationships.locations.length, 0);
assert.equal(rebels.relationships.contacts.length, 0);
assert.equal(rebels.relationships.jobs.length, 0);
assert.equal(rebels.relationships.intel.length, 0);

// --- world -----------------------------------------------------------------
assert.equal(typeof hutts.world.notes, 'string');
assert.equal(typeof hutts.world.gmNotes, 'string');
assert.ok(hutts.world.jobDefaults && typeof hutts.world.jobDefaults === 'object');

// --- legacy flat VM parity ---------------------------------------------
// The ecosystem groups above were added ADDITIVELY — every pre-existing
// flat field the current template/controller/approval workflows already
// depend on must survive untouched.
assert.ok(Array.isArray(hutts.locationRows));
assert.equal(hutts.locationRows.length, 2);
assert.ok(Array.isArray(hutts.contacts));
assert.equal(hutts.contacts.length, 1);
assert.ok(hutts.jobStats && typeof hutts.jobStats === 'object');
assert.ok(Array.isArray(hutts.recentJobs));
assert.equal(hutts.intelCount, 1);
assert.equal(hutts.contactCount, 1);
assert.equal(typeof hutts.scoreLabel, 'string');
assert.equal(typeof hutts.isFocused, 'boolean');
assert.equal(typeof hutts.searchText, 'string');

console.log('GM Faction ecosystem view model contract passed (identity/currentSituation/relationships/world all resolve real linked data from their own authorities, Faction-vs-Faction relationships correctly deferred with no fabricated data, legacy flat VM fields untouched).');
