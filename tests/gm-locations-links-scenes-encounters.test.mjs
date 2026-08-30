import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Locations Phase 2 — encounter seeds, scene links, and dossier
// relationship removal, executed for real.
//
// LocationRegistryService.removeEncounterSeed()/unlinkLocationLink() and
// GMLocationsSurfaceController's remove-seed/remove-link handlers already
// existed before Phase 2; locations.hbs rendered no controls for them. This
// proves the full remove -> registry mutation -> VM-no-longer-lists-it
// chain, plus the scene/actor resolution added in Phase 2 (safe
// representation of a broken/missing linked document instead of a crash).

registerFoundryPathLoader();

function installShim({ locations = [], scenes = [], actors = [] } = {}) {
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
      scenes: new Map(scenes.map(s => [s.id, s])),
      actors: new Map(actors.map(a => [a.id, a]))
    },
    ui: {
      notifications: {
        info: (msg) => notifications.push(['info', msg]),
        warn: (msg) => notifications.push(['warn', msg]),
        error: (msg) => notifications.push(['error', msg])
      }
    }
  });
  return { notifications };
}

async function dispatch(controller, dataset) {
  let clickHandler;
  const fakePageElement = { addEventListener: (type, fn) => { if (type === 'click') clickHandler = fn; }, contains: () => true };
  controller._wireActions(fakePageElement, undefined);
  const button = { dataset, closest: () => button };
  await clickHandler({ target: button, preventDefault() {}, stopPropagation() {} });
}

// --- Encounter seeds: remove-seed -----------------------------------------

{
  installShim({
    locations: [{
      id: 'hoth', name: 'Hoth',
      encounterSeeds: [{ id: 'seed-a', name: 'Wampa' }, { id: 'seed-b', name: 'Snowtrooper Patrol' }]
    }]
  });
  const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');
  const { GMLocationsSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMLocationsSurfaceService.js');
  const { GMLocationsSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js');

  let before = await GMLocationsSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedLocationId: 'hoth' }) });
  assert.equal(before.locationManager.selected.encounterSeeds.length, 2);

  const host = { getSurfaceState: () => ({}), patchSurfaceState: () => {}, requestSurfaceRender: async () => {} };
  const controller = new GMLocationsSurfaceController(host);
  await dispatch(controller, { locationAction: 'remove-seed', locationId: 'hoth', seedId: 'seed-a' });

  const location = LocationRegistryService.findLocation('hoth');
  assert.deepEqual(location.encounterSeeds.map(s => s.id), ['seed-b'], 'only the removed seed must be gone; the other must remain');

  const after = await GMLocationsSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedLocationId: 'hoth' }) });
  assert.deepEqual(after.locationManager.selected.encounterSeeds.map(s => s.id), ['seed-b'], 'the VM the template renders must no longer list the removed seed');
}

// --- Links: remove-link for two distinct kinds, unrelated links survive ---

{
  installShim({
    locations: [{
      id: 'coruscant', name: 'Coruscant',
      factionIds: ['faction-a', 'faction-b'],
      controllingFactionId: 'faction-a',
      linkedSceneUuids: ['Scene.scene1'],
      map: { sceneUuid: 'Scene.scene1' },
      contactIds: ['contact-1']
    }],
    scenes: [{ id: 'scene1', name: 'Senate District', active: false }]
  });
  const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');
  const { GMLocationsSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js');
  const host = { getSurfaceState: () => ({}), patchSurfaceState: () => {}, requestSurfaceRender: async () => {} };
  const controller = new GMLocationsSurfaceController(host);

  // Remove one faction link — the other faction, the controlling faction
  // (a different id), the scene link, and the contact must all survive.
  await dispatch(controller, { locationAction: 'remove-link', locationId: 'coruscant', linkKind: 'faction', linkValue: 'faction-b' });
  let location = LocationRegistryService.findLocation('coruscant');
  assert.deepEqual(location.factionIds, ['faction-a'], 'only faction-b must be unlinked');
  assert.equal(location.controllingFactionId, 'faction-a', 'the controlling faction must be untouched by unlinking a non-controlling faction');
  assert.deepEqual(location.linkedSceneUuids, ['Scene.scene1'], 'the scene link must be untouched by a faction unlink');
  assert.deepEqual(location.contactIds, ['contact-1'], 'the contact link must be untouched by a faction unlink');

  // Now remove the scene link — factions/contacts must remain, and the
  // primary map.sceneUuid must clear since it pointed at the removed scene.
  await dispatch(controller, { locationAction: 'remove-link', locationId: 'coruscant', linkKind: 'scene', linkValue: 'Scene.scene1' });
  location = LocationRegistryService.findLocation('coruscant');
  assert.deepEqual(location.linkedSceneUuids, []);
  assert.equal(location.map?.sceneUuid, '', 'the primary scene reference must clear once its target is unlinked');
  assert.deepEqual(location.factionIds, ['faction-a'], 'faction links must survive a scene unlink');
  assert.deepEqual(location.contactIds, ['contact-1'], 'contact links must survive a scene unlink');
}

// --- Broken reference representation: missing scene/actor render safely ---

{
  installShim({
    locations: [{
      id: 'dagobah', name: 'Dagobah',
      map: { sceneUuid: 'Scene.gone' },
      npcActorUuids: ['Actor.gone']
    }]
  });
  const { GMLocationsSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMLocationsSurfaceService.js');
  const vm = await GMLocationsSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedLocationId: 'dagobah' }) });

  const sceneRow = vm.locationManager.selected.sceneRows[0];
  assert.equal(sceneRow.resolved, false);
  assert.match(sceneRow.label, /Missing Scene/);
  assert.equal(sceneRow.uuid, 'Scene.gone', 'the stored UUID must still be available even when the document cannot be resolved');

  const actorRow = vm.locationManager.selected.actorRows[0];
  assert.equal(actorRow.resolved, false);
  assert.match(actorRow.label, /Missing Actor/);
  assert.equal(actorRow.uuid, 'Actor.gone');

  // Render must be side-effect-free: nothing about building this VM may
  // have mutated the stored location (e.g. auto-pruning the broken link).
  const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');
  const stillThere = LocationRegistryService.findLocation('dagobah');
  assert.equal(stillThere.map.sceneUuid, 'Scene.gone');
  assert.deepEqual(stillThere.npcActorUuids, ['Actor.gone']);

  // The broken link can still be removed like any other.
  const { GMLocationsSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js');
  const host = { getSurfaceState: () => ({}), patchSurfaceState: () => {}, requestSurfaceRender: async () => {} };
  const controller = new GMLocationsSurfaceController(host);
  await dispatch(controller, { locationAction: 'remove-link', locationId: 'dagobah', linkKind: 'actor', linkValue: 'Actor.gone' });
  const cleaned = LocationRegistryService.findLocation('dagobah');
  assert.deepEqual(cleaned.npcActorUuids, [], 'a broken actor link must be removable the same way as a healthy one');
}

// --- Resolved scene renders its real name and active state ---------------

{
  installShim({
    locations: [{ id: 'endor', name: 'Endor', map: { sceneUuid: 'Scene.forest' } }],
    scenes: [{ id: 'forest', name: 'Forest Moon Clearing', active: true }]
  });
  const { GMLocationsSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMLocationsSurfaceService.js');
  const vm = await GMLocationsSurfaceService.buildViewModel({ getSurfaceState: () => ({ selectedLocationId: 'endor' }) });
  const sceneRow = vm.locationManager.selected.sceneRows[0];
  assert.equal(sceneRow.resolved, true);
  assert.equal(sceneRow.name, 'Forest Moon Clearing');
  assert.equal(sceneRow.label, 'Forest Moon Clearing');
  assert.equal(sceneRow.isActive, true);
  assert.equal(sceneRow.isPrimary, true);
  assert.equal(vm.locationManager.selected.hasPrimaryScene, true);
}

console.log('GM Locations links/scenes/encounters operations passed (seed removal, faction/scene unlink with unrelated links surviving, broken-reference safety, resolved scene display).');
