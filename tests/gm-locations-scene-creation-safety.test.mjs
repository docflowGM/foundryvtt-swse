import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Locations Phase 2 — Create Scene duplicate-creation safety.
//
// LocationSceneBridgeService.createSceneFromLocation() always calls
// Scene.create() unconditionally — it never checked whether the location
// already had a primary Scene, so repeated clicks on "Create Scene" (the
// button was rendered unconditionally, with no in-flight guard) created
// unlimited duplicate Foundry Scene documents; only the first ever became
// the location's linked "primary" scene, so every extra one was silent,
// orphaned waste. Phase 2 fixed this in the controller (narrowly, per the
// Locations recovery's "do not alter Scene generation semantics" rule —
// LocationSceneBridgeService itself is unchanged): the create-scene
// handler now re-checks for an existing primary Scene and holds a
// _createSceneInFlight guard against a same-tick double-click racing past
// that check. This test proves both, executed against a mocked global
// `Scene.create` (not part of the shared Foundry-shim, added locally here
// since Scene creation is outside that shim's narrow scope) so the call
// count is provably real, not inferred from source reading.

registerFoundryPathLoader();

function installShim({ locations = [] } = {}) {
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
      }
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

/** Scene.create() has genuine async latency in real Foundry — a
 *  synchronously-resolving mock would (as with the Stage 1 importer race)
 *  make the two overlapping calls never actually overlap. */
function installSceneMock() {
  let createCount = 0;
  let nextId = 1;
  globalThis.Scene = {
    create: (data) => new Promise((resolve) => {
      createCount += 1;
      const id = `scene${nextId++}`;
      setTimeout(() => resolve({ id, uuid: `Scene.${id}`, name: data.name }), 5);
    })
  };
  return { getCreateCount: () => createCount };
}

async function dispatch(controller, dataset) {
  let clickHandler;
  const fakePageElement = { addEventListener: (type, fn) => { if (type === 'click') clickHandler = fn; }, contains: () => true };
  controller._wireActions(fakePageElement, undefined);
  const button = { dataset, closest: () => button };
  return clickHandler({ target: button, preventDefault() {}, stopPropagation() {} });
}

// CASE: a rapid double-click on Create Scene must create exactly one Scene.
{
  installShim({ locations: [{ id: 'yavin-iv', name: 'Yavin IV', map: { imagePath: 'icons/moon.svg' } }] });
  const sceneMock = installSceneMock();
  const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');
  const { GMLocationsSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js');
  const host = { getSurfaceState: () => ({}), patchSurfaceState: () => {}, requestSurfaceRender: async () => {} };
  const controller = new GMLocationsSurfaceController(host);

  const first = dispatch(controller, { locationAction: 'create-scene', locationId: 'yavin-iv' });
  const second = dispatch(controller, { locationAction: 'create-scene', locationId: 'yavin-iv' });
  await Promise.all([first, second]);

  assert.equal(sceneMock.getCreateCount(), 1, 'a double-click on Create Scene must call Scene.create() exactly once');
  const location = LocationRegistryService.findLocation('yavin-iv');
  assert.equal(location.map.sceneUuid, 'Scene.scene1', 'the location must be linked to exactly the one Scene that was created');
}

// CASE: re-clicking Create Scene after a primary Scene already exists must
// not create a second one — the normal (non-race) "already has a Scene"
// path, distinct from the double-click race above.
{
  const { notifications } = installShim({ locations: [{ id: 'bespin', name: 'Bespin', map: { sceneUuid: 'Scene.existing', imagePath: 'icons/gas.svg' } }] });
  const sceneMock = installSceneMock();
  const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');
  const { GMLocationsSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js');
  const host = { getSurfaceState: () => ({}), patchSurfaceState: () => {}, requestSurfaceRender: async () => {} };
  const controller = new GMLocationsSurfaceController(host);

  await dispatch(controller, { locationAction: 'create-scene', locationId: 'bespin' });

  assert.equal(sceneMock.getCreateCount(), 0, 'Create Scene must not call Scene.create() at all when a primary Scene is already linked');
  assert.ok(notifications.some(([level, msg]) => level === 'info' && /already has a linked Scene/.test(msg)));
  const location = LocationRegistryService.findLocation('bespin');
  assert.equal(location.map.sceneUuid, 'Scene.existing', 'the existing primary Scene link must be untouched');
}

console.log('GM Locations Create Scene safety passed (double-click creates exactly one Scene; re-click after a primary exists creates none).');
