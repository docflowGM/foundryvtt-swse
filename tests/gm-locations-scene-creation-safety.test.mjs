import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Locations Phase 2 — Scene-creating operation safety.
//
// LocationSceneBridgeService.createSceneFromLocation() always calls
// Scene.create() unconditionally — it never checked whether the location
// already had a primary Scene. Phase 2's first pass guarded only the
// create-scene action (_createSceneInFlight) and only checked for an
// existing primary Scene there. Review found that was incomplete:
// stage-encounter-seeds (LocationSceneBridgeService.stageEncounterSeeds()
// with createIfMissing: true) *also* calls Scene.create() — via
// createEncounterScene() -> createSceneFromLocation() — whenever the
// location has no resolvable linked Scene, and it shared no guard with
// create-scene at all. So a double-click on Stage Encounter Seeds, or a
// Create Scene click racing a Stage Encounter Seeds click, could each
// independently observe "no Scene yet" and both create one — the exact
// same class of duplicate-Scene bug, through a second door Phase 2 itself
// opened by rendering Stage Encounter Seeds for the first time.
//
// Fixed by widening the guard to _sceneOperationInFlight, shared by both
// actions (LocationSceneBridgeService itself is unchanged — this is
// controller-level serialization only, per the "do not alter Scene
// generation semantics" rule). All cases below run against a mocked
// global `Scene.create` (not part of the shared Foundry-shim, added
// locally here since Scene creation is outside that shim's narrow scope)
// with genuine async latency — a synchronously-resolving mock would (as
// with the Stage 1 importer race) make the overlapping calls never
// actually overlap, hiding the exact bug this test exists to catch.

registerFoundryPathLoader();

const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');
const { GMLocationsSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js');

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

/** LocationSceneBridgeService resolves an existing linked Scene via the
 *  global fromUuid() (not game.scenes.get() — that's only used by
 *  GMLocationsSurfaceService's VM display resolution, a separate code
 *  path). Only needed when a location already has a scene UUID to look
 *  up; resolveScene('') short-circuits before ever calling fromUuid, so
 *  the no-scene-yet cases below don't need this at all. */
function installFromUuidMock(docsByUuid = {}) {
  globalThis.fromUuid = async (uuid) => docsByUuid[uuid] || null;
}

function makeController() {
  const host = { getSurfaceState: () => ({}), patchSurfaceState: () => {}, requestSurfaceRender: async () => {} };
  return new GMLocationsSurfaceController(host);
}

// CASE 1: a rapid double-click on Create Scene must create exactly one Scene.
{
  installShim({ locations: [{ id: 'yavin-iv', name: 'Yavin IV', map: { imagePath: 'icons/moon.svg' } }] });
  const sceneMock = installSceneMock();
  const controller = makeController();

  const first = dispatch(controller, { locationAction: 'create-scene', locationId: 'yavin-iv' });
  const second = dispatch(controller, { locationAction: 'create-scene', locationId: 'yavin-iv' });
  await Promise.all([first, second]);

  assert.equal(sceneMock.getCreateCount(), 1, 'a double-click on Create Scene must call Scene.create() exactly once');
  const location = LocationRegistryService.findLocation('yavin-iv');
  assert.equal(location.map.sceneUuid, 'Scene.scene1', 'the location must be linked to exactly the one Scene that was created');
}

// CASE 4: re-clicking Create Scene after a primary Scene already exists must
// not create a second one — the normal (non-race) "already has a Scene"
// path, distinct from the double-click race above.
{
  const { notifications } = installShim({ locations: [{ id: 'bespin', name: 'Bespin', map: { sceneUuid: 'Scene.existing', imagePath: 'icons/gas.svg' } }] });
  const sceneMock = installSceneMock();
  const controller = makeController();

  await dispatch(controller, { locationAction: 'create-scene', locationId: 'bespin' });

  assert.equal(sceneMock.getCreateCount(), 0, 'Create Scene must not call Scene.create() at all when a primary Scene is already linked');
  assert.ok(notifications.some(([level, msg]) => level === 'info' && /already has a linked Scene/.test(msg)));
  const location = LocationRegistryService.findLocation('bespin');
  assert.equal(location.map.sceneUuid, 'Scene.existing', 'the existing primary Scene link must be untouched');
}

// CASE 2: a rapid double-click on Stage Encounter Seeds, with no linked
// Scene yet, must create exactly one Scene — the bug this correction
// exists to fix. (No encounter seeds are needed on the location to
// reproduce this: stageEncounterSeeds() creates the missing Scene before
// it ever looks at the seed list.)
{
  installShim({ locations: [{ id: 'hoth', name: 'Hoth', map: { imagePath: 'icons/ice.svg' } }] });
  const sceneMock = installSceneMock();
  const controller = makeController();

  const first = dispatch(controller, { locationAction: 'stage-encounter-seeds', locationId: 'hoth' });
  const second = dispatch(controller, { locationAction: 'stage-encounter-seeds', locationId: 'hoth' });
  await Promise.all([first, second]);

  assert.equal(sceneMock.getCreateCount(), 1, 'a double-click on Stage Encounter Seeds with no linked Scene must call Scene.create() exactly once');
  const location = LocationRegistryService.findLocation('hoth');
  assert.equal(location.map.sceneUuid, 'Scene.scene1', 'the location must end up linked to exactly the one Scene that was created');
}

// CASE 3: Create Scene and Stage Encounter Seeds racing each other, both
// starting from no linked Scene, must still create exactly one Scene —
// proves the two actions share one guard, not two independent ones.
{
  installShim({ locations: [{ id: 'dagobah', name: 'Dagobah', map: { imagePath: 'icons/swamp.svg' } }] });
  const sceneMock = installSceneMock();
  const controller = makeController();

  const createClick = dispatch(controller, { locationAction: 'create-scene', locationId: 'dagobah' });
  const stageClick = dispatch(controller, { locationAction: 'stage-encounter-seeds', locationId: 'dagobah' });
  await Promise.all([createClick, stageClick]);

  assert.equal(sceneMock.getCreateCount(), 1, 'Create Scene racing Stage Encounter Seeds must still call Scene.create() exactly once');
  const location = LocationRegistryService.findLocation('dagobah');
  assert.equal(location.map.sceneUuid, 'Scene.scene1', 'exactly one Scene must end up linked');
}

// CASE 4b: Stage Encounter Seeds when a primary Scene already exists must
// reuse it — zero Scene.create() calls.
{
  installShim({ locations: [{ id: 'coruscant', name: 'Coruscant', map: { sceneUuid: 'Scene.existing' } }] });
  installFromUuidMock({ 'Scene.existing': { id: 'existing', name: 'Senate District' } });
  const sceneMock = installSceneMock();
  const controller = makeController();

  await dispatch(controller, { locationAction: 'stage-encounter-seeds', locationId: 'coruscant' });

  assert.equal(sceneMock.getCreateCount(), 0, 'Stage Encounter Seeds must reuse an existing linked Scene, never call Scene.create()');
  const location = LocationRegistryService.findLocation('coruscant');
  assert.equal(location.map.sceneUuid, 'Scene.existing', 'the existing primary Scene link must be untouched');
}

// CASE 5: if a Scene-creating operation throws, the guard must still
// reset (in a finally) so the next operation can succeed — a failure must
// not permanently lock the location out of Scene creation.
{
  const { notifications } = installShim({ locations: [{ id: 'mustafar', name: 'Mustafar', map: { imagePath: 'icons/lava.svg' } }] });
  let failNext = true;
  globalThis.Scene = {
    create: () => failNext ? (failNext = false, Promise.reject(new Error('simulated Scene.create failure'))) : Promise.resolve({ id: 'recovered', uuid: 'Scene.recovered', name: 'Mustafar' })
  };
  const controller = makeController();

  await dispatch(controller, { locationAction: 'create-scene', locationId: 'mustafar' });
  assert.ok(notifications.some(([level, msg]) => level === 'warn' && /simulated Scene\.create failure/.test(msg)), 'the failed attempt must surface its real error');
  assert.equal(LocationRegistryService.findLocation('mustafar').map.sceneUuid, '', 'a failed Scene creation must not link anything');

  notifications.length = 0;
  await dispatch(controller, { locationAction: 'create-scene', locationId: 'mustafar' });
  assert.equal(LocationRegistryService.findLocation('mustafar').map.sceneUuid, 'Scene.recovered', 'a later attempt after a failure must succeed normally — the guard must not be stuck "in flight" forever');
}

console.log('GM Locations Scene-operation safety passed (double-create, double-stage, create+stage race, existing-Scene reuse, and failure recovery — all exactly one Scene or zero, as required).');
