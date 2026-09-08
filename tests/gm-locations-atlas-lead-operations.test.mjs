import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Locations Phase 2 — Atlas Lead Queue, executed for real.
//
// locationManager.leadQueue was already computed by GMLocationsSurfaceService
// before Phase 2 (GMLocationsSurfaceService.js#leadDiscoveryRows), and
// GMLocationsSurfaceController already had live lead-* handlers
// (lead-select-location, lead-create-job, lead-create-intel,
// lead-reveal-links, lead-resolve) — but locations.hbs rendered no markup
// that ever triggered them, so the whole subsystem was unreachable from the
// UI (see docs/audits/... Phase 0 §14/§17). Phase 2 renders the queue; this
// test proves the underlying data pipeline for real (source: an actor's
// `atlasLocationState` flag, the only place lead discoveries actually live)
// rather than only checking the new template markup exists.

registerFoundryPathLoader();

/** Actor lead discoveries live in a Foundry actor-document flag
 *  (LocationRegistryService.ATLAS_ACTOR_FLAG) — a fake actor just needs
 *  getFlag/setFlag over an in-memory state object. */
function fakeActor(id, name, initialLeadDiscoveries = []) {
  let state = { leadDiscoveries: initialLeadDiscoveries };
  return {
    id,
    name,
    getFlag: () => state,
    setFlag: async (_scope, _key, value) => { state = value; return value; }
  };
}

/** getAtlasLeadDiscoveries() reads game.actors?.contents (falling back to
 *  Array.from(game.actors)) — a bare Map, this repo's shim default, iterates
 *  as [key, value] pairs, not documents, so a real collection shape with
 *  both `.contents` and `.get()` is needed here (unlike the emptyMap-is-safe
 *  default used by tests that never touch actor iteration). */
function makeActorsCollection(actorList) {
  const byId = new Map(actorList.map(a => [a.id, a]));
  return { contents: actorList, get: (id) => byId.get(id), [Symbol.iterator]: () => actorList[Symbol.iterator]() };
}

function installShim({ locations = [], actors = [] } = {}) {
  const notifications = [];
  const locationStore = new Map([['gmLocationRegistry', locations]]);
  installFoundryShimGlobals({
    game: {
      user: { isGM: true },
      settings: {
        get: (_m, key) => locationStore.get(key),
        set: (_m, key, value) => { locationStore.set(key, value); return Promise.resolve(value); },
        settings: { has: () => true },
        register: () => {}
      },
      actors: makeActorsCollection(actors)
    },
    ui: {
      notifications: {
        info: (msg) => notifications.push(['info', msg]),
        warn: (msg) => notifications.push(['warn', msg]),
        error: (msg) => notifications.push(['error', msg])
      }
    }
  });
  // The default shim's foundry.utils doesn't include randomID (nothing
  // else in this test suite needed it) — HolonetIntelService's record
  // constructor does. Add it in place rather than via the override merge
  // (which would replace foundry.utils wholesale and drop deepClone/etc.).
  globalThis.foundry.utils.randomID = () => `test-${Math.random().toString(36).slice(2, 10)}`;
  return { notifications };
}

const LOCATION = {
  id: 'tatooine', name: 'Tatooine', publicSummary: 'Desert world.',
  atlasFacts: [{ id: 'fact1', title: 'Underworld Shipping Lanes', teaser: 'Cargo moves quietly.', category: 'general', skill: 'gatherInformation', dc: 15, onReveal: { output: 'job-draft' } }]
};

function leadFixture(overrides = {}) {
  return {
    id: 'lead1', actorId: 'actor1', locationId: 'tatooine', factId: 'fact1',
    skill: 'gatherInformation', checkLabel: 'Streetwise', dc: 15, total: 19,
    output: 'job-draft', status: 'open', createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

// CASE: an empty lead queue (no actor discoveries at all) renders as empty,
// not as an error, and the surface stat count agrees.
{
  installShim({ locations: [LOCATION], actors: [fakeActor('actor1', 'Dex Rimrunner', [])] });
  const { GMLocationsSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMLocationsSurfaceService.js');
  const vm = await GMLocationsSurfaceService.buildViewModel({ getSurfaceState: () => ({}) });
  assert.deepEqual(vm.locationManager.leadQueue, []);
  assert.equal(vm.locationManager.hasLeadQueue, false);
}

// CASE: one open lead discovery reaches the VM with the identifiers the
// template's lead-* controls need (actorId, id/discoveryId, locationId),
// plus the resolved display fields (location name/chain, fact title).
{
  installShim({ locations: [LOCATION], actors: [fakeActor('actor1', 'Dex Rimrunner', [leadFixture()])] });
  const { GMLocationsSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMLocationsSurfaceService.js');
  const vm = await GMLocationsSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedLocationId: 'tatooine' }) });
  assert.equal(vm.locationManager.leadQueue.length, 1);
  const lead = vm.locationManager.leadQueue[0];
  assert.equal(lead.id, 'lead1', 'discoveryId (rendered as data-discovery-id) must be present');
  assert.equal(lead.actorId, 'actor1', 'actorId (rendered as data-actor-id) must be present');
  assert.equal(lead.locationId, 'tatooine', 'locationId (rendered as data-location-id for lead-select-location) must be present');
  assert.equal(lead.locationName, 'Tatooine');
  assert.equal(lead.factTitle, 'Underworld Shipping Lanes');
  assert.equal(lead.actorName, 'Dex Rimrunner');
  assert.equal(lead.isSelectedLocation, true, 'a lead whose locationId matches the currently selected location must be flagged for the row highlight');
  assert.equal(vm.locationManager.hasLeadQueue, true);
}

// CASE: lead-select-location's real effect — patches selectedLocationId to
// the lead's location and refreshes, exactly what the row's "jump to
// location" button needs.
{
  const { notifications } = installShim({ locations: [LOCATION], actors: [fakeActor('actor1', 'Dex Rimrunner', [leadFixture()])] });
  const { GMLocationsSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js');
  const patches = [];
  let refreshCount = 0;
  const host = {
    getSurfaceState: () => ({}),
    patchSurfaceState: (surfaceId, patch) => patches.push({ surfaceId, patch }),
    requestSurfaceRender: async () => { refreshCount++; }
  };
  const controller = new GMLocationsSurfaceController(host);
  let clickHandler;
  const fakePageElement = { addEventListener: (type, fn) => { if (type === 'click') clickHandler = fn; }, contains: () => true };
  controller._wireActions(fakePageElement, undefined);
  const button = { dataset: { locationAction: 'lead-select-location', locationId: 'tatooine' }, closest: () => button };
  await clickHandler({ target: button, preventDefault() {}, stopPropagation() {} });
  assert.deepEqual(patches, [{ surfaceId: 'locations', patch: { selectedLocationId: 'tatooine' } }]);
  assert.equal(refreshCount, 1);
  assert.equal(notifications.length, 0, 'selecting a lead\'s location is not itself notification-worthy');
}

// CASE: lead-resolve marks the discovery resolved for real — a follow-up
// leadQueue build (unresolvedOnly: true, same as the surface uses) no
// longer includes it.
{
  installShim({ locations: [LOCATION], actors: [fakeActor('actor1', 'Dex Rimrunner', [leadFixture()])] });
  const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');
  const { GMLocationsSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js');
  const host = { getSurfaceState: () => ({}), patchSurfaceState: () => {}, requestSurfaceRender: async () => {} };
  const controller = new GMLocationsSurfaceController(host);
  let clickHandler;
  const fakePageElement = { addEventListener: (type, fn) => { if (type === 'click') clickHandler = fn; }, contains: () => true };
  controller._wireActions(fakePageElement, undefined);
  const button = { dataset: { locationAction: 'lead-resolve', actorId: 'actor1', discoveryId: 'lead1' }, closest: () => button };
  await clickHandler({ target: button, preventDefault() {}, stopPropagation() {} });

  const remaining = LocationRegistryService.getAtlasLeadDiscoveries({ unresolvedOnly: true });
  assert.equal(remaining.length, 0, 'a resolved lead must no longer appear in the unresolved queue the surface builds');
  const all = LocationRegistryService.getAtlasLeadDiscoveries({ unresolvedOnly: false });
  assert.equal(all[0]?.status, 'resolved');
}

// CASE: lead-create-intel builds a real Intel draft, auto-resolves the
// lead, and navigates to Intel with it selected — proves the full
// lead -> LocationIntelBridgeService -> resolved-lead -> navigation chain,
// not just that the handler exists.
{
  installShim({ locations: [LOCATION], actors: [fakeActor('actor1', 'Dex Rimrunner', [leadFixture({ id: 'lead2' })])] });
  const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');
  const { GMLocationsSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js');
  const patches = [];
  let navigatedTo = '';
  const host = {
    getSurfaceState: () => ({}),
    patchSurfaceState: (surfaceId, patch) => patches.push({ surfaceId, patch }),
    requestSurfaceRender: async () => {},
    _navigateTo: async (surfaceId) => { navigatedTo = surfaceId; }
  };
  const controller = new GMLocationsSurfaceController(host);
  const record = await controller._createIntelFromLead('actor1', 'lead2');
  assert.equal(navigatedTo, 'intel', 'creating Intel from a lead must navigate the GM to the Intel surface');
  assert.ok(patches.some(p => p.surfaceId === 'intel' && p.patch.selectedRecordId), 'the newly created Intel record must be selected on arrival');
  const lead = LocationRegistryService.getAtlasLeadDiscoveries({ unresolvedOnly: false }).find(entry => entry.id === 'lead2');
  assert.equal(lead.status, 'resolved', 'lead-create-intel must auto-resolve the source lead');
}

console.log('GM Locations Atlas Lead Queue operations passed (empty/populated queue, lead-select-location, lead-resolve, lead-create-intel — all executed for real).');
