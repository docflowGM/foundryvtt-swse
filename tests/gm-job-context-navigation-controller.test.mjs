import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 4: proves the real
// GMJobBoardSurfaceController open-location/open-intel branches (4J/4L/4Y/
// 4AE) drive the shell's navigateToSurface() contract end to end, using
// the real stable-identity fields a selected Job's relationships rows
// carry — never a name/text lookup.
//
// Job -> Faction / Job -> Contact navigation is deliberately NOT re-tested
// here: those already existed before this phase (data-job-open-faction/
// data-job-open-issuer-actor in _wireIssuerButtons) and are unchanged.

registerFoundryPathLoader();

class FakeButton {
  constructor(dataset = {}) { this.dataset = dataset; }
}

function fakePageElement(buttonsByAttr) {
  const listeners = new Map();
  return {
    querySelectorAll(selector) {
      const match = selector.match(/^\[data-([a-z-]+)\]$/);
      const attr = match ? match[1] : null;
      return (buttonsByAttr[attr] || []).map((dataset) => {
        const button = new FakeButton(dataset);
        button.addEventListener = (type, handler) => {
          const key = `${attr}:${JSON.stringify(dataset)}`;
          listeners.set(key, handler);
        };
        return button;
      });
    },
    async click(attr, dataset) {
      const key = `${attr}:${JSON.stringify(dataset)}`;
      const handler = listeners.get(key);
      const event = { currentTarget: new FakeButton(dataset), preventDefault() {} };
      if (handler) await handler(event);
    }
  };
}

function installShim() {
  installFoundryShimGlobals({
    game: {
      user: { isGM: true },
      settings: { get: () => null, set: () => Promise.resolve(), settings: { has: () => true }, register: () => {} },
      actors: []
    },
    ui: { notifications: { info: () => {}, warn: () => {}, error: () => {} } }
  });
}

const { GMJobBoardSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMJobBoardSurfaceController.js');

function makeFakeHost() {
  const navigateCalls = [];
  return {
    navigateCalls,
    getSurfaceState: () => ({}),
    patchSurfaceState: () => ({}),
    requestSurfaceRender: async () => {},
    async navigateToSurface(surfaceId, options) { navigateCalls.push({ surfaceId, options }); }
  };
}

// --- open-location: navigates to Locations with the real locationId ------
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMJobBoardSurfaceController(host);
  const page = fakePageElement({ 'job-open-location': [{ locationId: 'mos-eisley' }] });
  const abort = new AbortController();
  controller._wireRelationshipButtons(page, abort.signal);

  await page.click('job-open-location', { locationId: 'mos-eisley' });

  assert.equal(host.navigateCalls.length, 1, 'open-location must call the shell navigation contract exactly once');
  assert.equal(host.navigateCalls[0].surfaceId, 'locations');
  assert.deepEqual(host.navigateCalls[0].options, { statePatch: { selectedLocationId: 'mos-eisley' } });
}

// --- open-intel: navigates to Intel with the real intelId -----------------
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMJobBoardSurfaceController(host);
  const page = fakePageElement({ 'job-open-intel': [{ intelId: 'intel-1' }] });
  const abort = new AbortController();
  controller._wireRelationshipButtons(page, abort.signal);

  await page.click('job-open-intel', { intelId: 'intel-1' });

  assert.equal(host.navigateCalls.length, 1, 'open-intel must call the shell navigation contract exactly once');
  assert.equal(host.navigateCalls[0].surfaceId, 'intel');
  assert.deepEqual(host.navigateCalls[0].options, { statePatch: { selectedRecordId: 'intel-1' } });
}

// --- empty ids fail safe: no navigation call ------------------------------
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMJobBoardSurfaceController(host);
  const page = fakePageElement({
    'job-open-location': [{ locationId: '' }],
    'job-open-intel': [{ intelId: '' }]
  });
  const abort = new AbortController();
  controller._wireRelationshipButtons(page, abort.signal);

  await page.click('job-open-location', { locationId: '' });
  await page.click('job-open-intel', { intelId: '' });

  assert.equal(host.navigateCalls.length, 0, 'a control with no real id must never trigger navigation');
}

console.log('GM Job Board controller open-location/open-intel navigation branches passed (correct surface, correct real-id patch, exactly once, empty ids fail safe).');
