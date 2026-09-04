import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 3: proves the real
// GMFactionRelationshipSurfaceController open-faction-job/open-faction-intel
// branches (3J/3L/3Q/3Z) drive the shell's navigateToSurface() contract end
// to end, with the real stable-identity fields each relationship row
// carries — never a name/text lookup — mirroring
// tests/gm-locations-context-navigation-controller.test.mjs for the
// Locations side of the same navigation contract.
//
// Faction -> Location navigation is deliberately NOT re-tested here: it
// reuses the pre-existing open-location action (present before Phase 3,
// already proven end-to-end as part of the Phase 2 audit), unchanged by
// this phase.

registerFoundryPathLoader();

class FakeButton {
  constructor(dataset = {}) { this.dataset = dataset; }
  closest(selector) { return selector === '[data-gm-faction-action]' ? this : null; }
}

function fakePageElement() {
  const listeners = { click: [] };
  return {
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
    contains() { return true; },
    querySelectorAll() { return []; },
    async click(dataset) {
      const button = new FakeButton(dataset);
      const event = { target: button, preventDefault() {}, stopPropagation() {} };
      for (const handler of listeners.click) await handler(event);
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

const { GMFactionRelationshipSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMFactionRelationshipSurfaceController.js');

function makeFakeHost() {
  const navigateCalls = [];
  return {
    navigateCalls,
    getSurfaceState: () => ({}),
    patchSurfaceState: () => ({}),
    requestSurfaceRender: async () => {},
    async navigateToSurface(surfaceId, options) { navigateCalls.push({ surfaceId, options }); },
    // Pre-Phase-2/Phase-3 primitive some existing branches in this same
    // controller (e.g. make-job-faction) still call directly — present so
    // this fake host satisfies the whole file, not just the new branches.
    async _navigateTo() {}
  };
}

// --- open-faction-job: navigates to Jobs via hostPatch, using the real
// Job Board thread id a relationships.jobs[] row carries ------------------
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMFactionRelationshipSurfaceController(host);
  const page = fakePageElement();
  const abort = new AbortController();
  controller._wireButtons(page, abort.signal);

  await page.click({ gmFactionAction: 'open-faction-job', jobId: 'job-thread-1' });

  assert.equal(host.navigateCalls.length, 1, 'open-faction-job must call the shell navigation contract exactly once');
  assert.equal(host.navigateCalls[0].surfaceId, 'jobs');
  assert.deepEqual(host.navigateCalls[0].options, { hostPatch: { selectedJobThreadId: 'job-thread-1' } });
}

// --- open-faction-intel: navigates to Intel via statePatch, using the
// real canonical intelId a relationships.intel[] row carries --------------
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMFactionRelationshipSurfaceController(host);
  const page = fakePageElement();
  const abort = new AbortController();
  controller._wireButtons(page, abort.signal);

  await page.click({ gmFactionAction: 'open-faction-intel', intelId: 'intel-1' });

  assert.equal(host.navigateCalls.length, 1, 'open-faction-intel must call the shell navigation contract exactly once');
  assert.equal(host.navigateCalls[0].surfaceId, 'intel');
  assert.deepEqual(host.navigateCalls[0].options, { statePatch: { selectedRecordId: 'intel-1' } });
}

// --- broken/empty ids fail safe: no navigation call, no throw escaping
// the click handler (2P's policy, reused for Phase 3) ----------------------
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMFactionRelationshipSurfaceController(host);
  const page = fakePageElement();
  const abort = new AbortController();
  controller._wireButtons(page, abort.signal);

  await page.click({ gmFactionAction: 'open-faction-job', jobId: '' });
  await page.click({ gmFactionAction: 'open-faction-intel', intelId: '' });

  assert.equal(host.navigateCalls.length, 0, 'a control with no real id must never trigger navigation');
}

console.log('GM Faction controller open-faction-job/open-faction-intel navigation branches passed (correct surface, correct real-id patch, exactly once, empty ids fail safe).');
