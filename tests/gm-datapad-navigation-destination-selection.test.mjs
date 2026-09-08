import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 2: proves the REAL selection field
// each cross-surface navigation destination already exposes actually
// selects/opens the intended record when GMLocationsSurfaceController wires
// it — not just that the field name exists, but that each destination's own
// real buildViewModel() honors it end to end (2U).
//
//   - Factions:  surface state `focusedFactionId`/`focusedContactId`
//                (GMFactionRelationshipSurfaceService marks isFocused).
//   - Job Board: bare host property `selectedJobThreadId`
//                (GMJobBoardSurfaceService reads/re-confirms it into
//                jobBoard.selectedJob).
//   - Intel:     surface state `selectedRecordId`
//                (GMIntelSurfaceService resolves it into selectedCard).
//
// These are the exact fields GMLocationsSurfaceController's open-faction/
// open-job/open-intel branches set via GMDatapad.navigateToSurface() before
// each destination's first render.

registerFoundryPathLoader();

function makeActorsCollection(actorList) {
  const byId = new Map(actorList.map(a => [a.id, a]));
  return { contents: actorList, get: (id) => byId.get(id), [Symbol.iterator]: () => actorList[Symbol.iterator]() };
}

function installShim({ factions = [], threads = [], records = [], actors = [], users = [] } = {}) {
  const stores = new Map([
    ['gmFactionRegistry', factions],
    ['gmLocationRegistry', []],
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

// --- Factions: focusedFactionId/focusedContactId really mark isFocused ----
{
  installShim({
    factions: [
      { id: 'hutt-cartel', name: 'Hutt Cartel', contacts: [{ id: 'vigo-korda', name: 'Vigo Korda', role: 'Fixer' }] },
      { id: 'rebel-cell', name: 'Rebel Cell', contacts: [] }
    ]
  });
  const { GMFactionRelationshipSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMFactionRelationshipSurfaceService.js');
  const host = { getSurfaceState: (id) => (id === 'factions' ? { focusedFactionId: 'hutt-cartel', focusedContactId: 'vigo-korda' } : {}) };
  const vm = await GMFactionRelationshipSurfaceService.buildViewModel(host);
  const hutts = vm.factionManager.registry.find(row => row.id === 'hutt-cartel');
  const rebels = vm.factionManager.registry.find(row => row.id === 'rebel-cell');
  assert.ok(hutts, 'expected the Hutt Cartel faction row to be present');
  assert.equal(hutts.isFocused, true, 'focusedFactionId must mark the matching faction row isFocused');
  assert.equal(rebels.isFocused, false, 'a non-matching faction row must not be marked focused');
  const contact = hutts.contacts.find(row => row.id === 'vigo-korda');
  assert.equal(contact.isFocused, true, 'focusedContactId must mark the matching contact row isFocused');
  console.log('Factions destination selection (focusedFactionId/focusedContactId) contract passed.');
}

// --- Job Board: host.selectedJobThreadId really selects jobBoard.selectedJob ---
{
  installShim({
    threads: [
      { id: 'job-thread-1', title: 'Escort the Shipment', metadata: { threadType: 'job', job: { title: 'Escort the Shipment', status: 'posted' } } },
      { id: 'job-thread-2', title: 'Recover the Cargo', metadata: { threadType: 'job', job: { title: 'Recover the Cargo', status: 'posted' } } }
    ]
  });
  const { GMJobBoardSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMJobBoardSurfaceService.js');
  const host = { selectedJobThreadId: 'job-thread-2', getSurfaceState: () => ({}) };
  const vm = await GMJobBoardSurfaceService.buildViewModel(host);
  assert.equal(vm.jobBoard.selectedJob?.threadId, 'job-thread-2', 'host.selectedJobThreadId must select the matching job as jobBoard.selectedJob');
  assert.equal(host.selectedJobThreadId, 'job-thread-2', 'buildViewModel must not silently overwrite a valid pre-set selection');
  console.log('Job Board destination selection (host.selectedJobThreadId) contract passed.');
}

// --- Intel: surface state selectedRecordId really resolves selectedCard ---
{
  installShim({
    records: [
      { id: 'intel-record-1', type: 'message', metadata: { intel: { id: 'intel-1', title: 'Hutt Tribute Route', status: 'released' } } },
      { id: 'intel-record-2', type: 'message', metadata: { intel: { id: 'intel-2', title: 'Rebel Cell Roster', status: 'ready' } } }
    ]
  });
  const { GMIntelSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMIntelSurfaceService.js');
  const host = { getSurfaceState: (id) => (id === 'intel' ? { selectedRecordId: 'intel-2' } : {}) };
  const vm = await GMIntelSurfaceService.buildViewModel(host);
  assert.equal(vm.intelManager.selectedRecordId, 'intel-2');
  assert.equal(vm.intelManager.selectedCard?.title, 'Rebel Cell Roster', 'selectedRecordId must resolve the matching Intel record as selectedCard');
  console.log('Intel destination selection (selectedRecordId) contract passed.');
}
