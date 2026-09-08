import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Locations Stage 1 (final reliability correction) — executed
// GMLocationsSurfaceController._importLibrarySeedIds() behavior.
//
// Complements tests/gm-locations-library-import-service.test.mjs (which
// proves the LocationRegistryService side) by executing the real
// controller method under the Foundry-shim harness, with a fake host and
// a minimal fake page element (no jsdom in this repo — see other GM
// Datapad contract tests' notes on that), to prove three things review
// found missing from the first Stage 1 pass:
//
//   1. A selection that is ALL invalid must not look like a success: no
//      selectedLocationId patch (least of all the invalid input string
//      itself), no "Imported 0..." notification, no refresh/modal close —
//      the importer modal stays open with an explicit warning.
//   2. An all-already-imported selection (imported: 0, skipped > 0, but a
//      real seed was resolved) is a LEGITIMATE idempotent result, not an
//      error — it must still go through the normal success/refresh path.
//   3. The import-trigger controls are visibly disabled for the duration
//      of an in-flight import and restored afterward, and a second call
//      while one is in flight is rejected with an explicit notification
//      rather than starting a second overlapping import.

registerFoundryPathLoader();

function installControllerShim({ locations = [] } = {}) {
  const notifications = [];
  const store = new Map([['gmLocationRegistry', locations]]);
  installFoundryShimGlobals({
    game: {
      user: { isGM: true },
      settings: {
        get: (_m, key) => store.get(key),
        set: (_m, key, value) => { store.set(key, value); return Promise.resolve(value); },
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

function fakeButton() {
  return { disabled: false };
}

/** A minimal stand-in for the real page element — just enough
 *  querySelectorAll support for the two selectors _setImportControlsBusy
 *  actually queries. */
function fakePageElement(buttons) {
  return {
    querySelectorAll(selector) {
      const wants = selector.split(',').map(s => s.trim());
      const out = [];
      if (wants.includes('[data-location-action="import-library-visible-now"]')) out.push(buttons.importAll);
      if (wants.includes('form[data-location-import-form] button[type="submit"]')) out.push(buttons.submit);
      return out;
    }
  };
}

function makeController({ locations = [] } = {}) {
  return installControllerShim({ locations });
}

async function freshController(locations = []) {
  const { notifications } = makeController({ locations });
  const { GMLocationsSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js');
  const patches = [];
  let refreshCount = 0;
  const fakeHost = {
    getSurfaceState: () => ({}),
    patchSurfaceState: (surfaceId, patch, opts) => patches.push({ surfaceId, patch, opts }),
    requestSurfaceRender: async () => { refreshCount++; }
  };
  const controller = new GMLocationsSurfaceController(fakeHost);
  const buttons = { importAll: fakeButton(), submit: fakeButton() };
  controller._pageElement = fakePageElement(buttons);
  return { controller, notifications, patches, getRefreshCount: () => refreshCount, buttons };
}

// CASE 1: an entirely-invalid selection must not look successful.
{
  const { controller, notifications, patches, getRefreshCount } = await freshController();
  await controller._importLibrarySeedIds(['not-a-real-seed-id'], 'test-all-invalid', {});

  assert.equal(patches.length, 0, 'an all-invalid import must never call patchSurfaceState (must not select the invalid id as if it were a location)');
  assert.equal(getRefreshCount(), 0, 'an all-invalid import must not trigger a refresh — the importer modal must stay open exactly as it was');
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0][0], 'warn', 'an all-invalid import must warn, not report a false "Imported 0..." success');
  assert.match(notifications[0][1], /[Cc]ould not resolve/);
  assert.ok(!notifications.some(([, msg]) => /^Imported/.test(msg)), 'no "Imported ..." success notification may appear when nothing was resolved');
}

// CASE 2: mixed valid + invalid still imports the valid one and reports
// both — this is allowed and expected, not a failure.
{
  const { controller, notifications, patches, getRefreshCount } = await freshController();
  await controller._importLibrarySeedIds(['naboo', 'not-a-real-seed-id'], 'test-mixed', {});

  assert.equal(patches.length, 1, 'a mixed valid/invalid import must still select the imported location');
  assert.equal(patches[0].patch.selectedLocationId, 'naboo');
  assert.equal(getRefreshCount(), 1);
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0][0], 'info');
  assert.match(notifications[0][1], /Imported 4 location record\(s\) from 1 quick location\(s\)/);
  assert.match(notifications[0][1], /1 selection\(s\) could not be resolved/);
}

// CASE 3: an already-imported-only selection (imported: 0, skipped > 0,
// but a real seed resolved) is a legitimate idempotent result — it must
// NOT be treated the same as the all-invalid case in CASE 1.
{
  const { controller, notifications, patches, getRefreshCount } = await freshController();
  await controller._importLibrarySeedIds(['naboo'], 'test-first-import', {});
  notifications.length = 0;
  patches.length = 0;

  await controller._importLibrarySeedIds(['naboo'], 'test-reimport', {});
  assert.equal(patches.length, 1, 'a legitimate already-imported result must still go through the normal success path (select the location, no false "all invalid" warning)');
  assert.equal(getRefreshCount(), 2, 'the already-imported case must still refresh, unlike the all-invalid case');
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0][0], 'info', 'an already-imported (but resolvable) selection must not produce a warning');
  assert.match(notifications[0][1], /Imported 0 location record\(s\) from 1 quick location\(s\); 4 record\(s\) already existed/);
}

// CASE 4: import controls are visibly disabled for the duration of an
// in-flight import and restored once it finishes.
{
  const { controller, buttons } = await freshController();
  const pending = controller._importLibrarySeedIds(['tatooine'], 'test-busy', {});
  assert.equal(buttons.importAll.disabled, true, '"Import All Shown" must be disabled while an import is in flight');
  assert.equal(buttons.submit.disabled, true, 'the "Import Selected" submit button must be disabled while an import is in flight');
  await pending;
  assert.equal(buttons.importAll.disabled, false, '"Import All Shown" must be re-enabled once the import finishes');
  assert.equal(buttons.submit.disabled, false, 'the "Import Selected" submit button must be re-enabled once the import finishes');
}

// CASE 5: a second call while one is already in flight is rejected with
// an explicit notification rather than starting a second import.
{
  const { controller, notifications } = await freshController();
  const first = controller._importLibrarySeedIds(['tatooine'], 'test-first', {});
  await controller._importLibrarySeedIds(['hoth'], 'test-second', {});
  assert.ok(notifications.some(([level, msg]) => level === 'warn' && /already in progress/.test(msg)), 'a second import call while one is in flight must be rejected with an explicit "already in progress" warning');
  await first;
}

console.log('GM Locations importer controller behavior contract passed (all-invalid rejection, mixed valid/invalid, legitimate already-imported success, visible busy state, in-flight rejection).');
