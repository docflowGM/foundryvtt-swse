import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 5: proves the real
// GMIntelSurfaceController open-location/open-faction/open-contact/open-job/
// open-scene/open-actor branches drive the shell's navigateToSurface()
// contract (or, for Scene/Actor, the real Foundry document directly) end
// to end, using the real stable-identity fields a selected Intel's
// relationships carry — never a name/text lookup.

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

function installShim({ scenes = new Map(), actors = new Map() } = {}) {
  installFoundryShimGlobals({
    game: {
      user: { isGM: true },
      settings: { get: () => null, set: () => Promise.resolve(), settings: { has: () => true }, register: () => {} },
      actors,
      scenes
    },
    ui: { notifications: { info: () => {}, warn: () => {}, error: () => {} } }
  });
}

const { GMIntelSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMIntelSurfaceController.js');

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

// --- open-location ----------------------------------------------------------
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMIntelSurfaceController(host);
  const page = fakePageElement({ 'intel-open-location': [{ locationId: 'tatooine' }] });
  controller._wireRelationshipButtons(page, undefined);
  await page.click('intel-open-location', { locationId: 'tatooine' });
  assert.equal(host.navigateCalls.length, 1);
  assert.equal(host.navigateCalls[0].surfaceId, 'locations');
  assert.deepEqual(host.navigateCalls[0].options, { statePatch: { selectedLocationId: 'tatooine' } });
}

// --- open-faction ------------------------------------------------------------
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMIntelSurfaceController(host);
  const page = fakePageElement({ 'intel-open-faction': [{ factionId: 'hutt-cartel' }] });
  controller._wireRelationshipButtons(page, undefined);
  await page.click('intel-open-faction', { factionId: 'hutt-cartel' });
  assert.equal(host.navigateCalls.length, 1);
  assert.equal(host.navigateCalls[0].surfaceId, 'factions');
  assert.deepEqual(host.navigateCalls[0].options, { statePatch: { focusedFactionId: 'hutt-cartel' } });
}

// --- open-contact --------------------------------------------------------------
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMIntelSurfaceController(host);
  const page = fakePageElement({ 'intel-open-contact': [{ factionId: 'hutt-cartel', contactId: 'vigo-korda' }] });
  controller._wireRelationshipButtons(page, undefined);
  await page.click('intel-open-contact', { factionId: 'hutt-cartel', contactId: 'vigo-korda' });
  assert.equal(host.navigateCalls.length, 1);
  assert.equal(host.navigateCalls[0].surfaceId, 'factions');
  assert.deepEqual(host.navigateCalls[0].options, { statePatch: { focusedFactionId: 'hutt-cartel', focusedContactId: 'vigo-korda' } });
}

// --- open-job (uses hostPatch, mirroring Job Board's own selection field) ----
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMIntelSurfaceController(host);
  const page = fakePageElement({ 'intel-open-job': [{ jobId: 'job-thread-1' }] });
  controller._wireRelationshipButtons(page, undefined);
  await page.click('intel-open-job', { jobId: 'job-thread-1' });
  assert.equal(host.navigateCalls.length, 1);
  assert.equal(host.navigateCalls[0].surfaceId, 'jobs');
  assert.deepEqual(host.navigateCalls[0].options, { hostPatch: { selectedJobThreadId: 'job-thread-1' } });
}

// --- open-scene (not a Datapad surface: opens the real Scene directly) -------
{
  const viewCalls = [];
  const scene = { id: 'scene1', name: 'Cantina', view: () => { viewCalls.push('scene1'); } };
  installShim({ scenes: new Map([['scene1', scene]]) });
  const host = makeFakeHost();
  const controller = new GMIntelSurfaceController(host);
  const page = fakePageElement({ 'intel-open-scene': [{ sceneUuid: 'Scene.scene1' }] });
  controller._wireRelationshipButtons(page, undefined);
  await page.click('intel-open-scene', { sceneUuid: 'Scene.scene1' });
  assert.equal(host.navigateCalls.length, 0, 'opening a Scene must never call the surface navigation contract');
  assert.deepEqual(viewCalls, ['scene1'], 'the real Scene document\'s own view() must be called');
}

// --- open-actor (not a Datapad surface: opens the real Actor sheet) ----------
{
  const renderCalls = [];
  const actor = { id: 'actor1', name: 'Dex Rimrunner', sheet: { render: (force) => renderCalls.push(force) } };
  installShim({ actors: new Map([['actor1', actor]]) });
  const host = makeFakeHost();
  const controller = new GMIntelSurfaceController(host);
  const page = fakePageElement({ 'intel-open-actor': [{ actorUuid: 'Actor.actor1' }] });
  controller._wireRelationshipButtons(page, undefined);
  await page.click('intel-open-actor', { actorUuid: 'Actor.actor1' });
  assert.equal(host.navigateCalls.length, 0, 'opening an Actor must never call the surface navigation contract');
  assert.deepEqual(renderCalls, [true]);
}

// --- empty ids fail safe: no navigation call, no document open --------------
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMIntelSurfaceController(host);
  const page = fakePageElement({
    'intel-open-location': [{ locationId: '' }],
    'intel-open-faction': [{ factionId: '' }],
    'intel-open-contact': [{ factionId: '', contactId: '' }],
    'intel-open-job': [{ jobId: '' }],
    'intel-open-scene': [{ sceneUuid: '' }],
    'intel-open-actor': [{ actorUuid: '' }]
  });
  controller._wireRelationshipButtons(page, undefined);
  await page.click('intel-open-location', { locationId: '' });
  await page.click('intel-open-faction', { factionId: '' });
  await page.click('intel-open-contact', { factionId: '', contactId: '' });
  await page.click('intel-open-job', { jobId: '' });
  await page.click('intel-open-scene', { sceneUuid: '' });
  await page.click('intel-open-actor', { actorUuid: '' });
  assert.equal(host.navigateCalls.length, 0, 'a control with no real id must never trigger navigation or a document open');
}

console.log('GM Intel controller open-location/open-faction/open-contact/open-job/open-scene/open-actor navigation branches passed (correct surface/contract, correct real-id patch, exactly once, empty ids fail safe).');
