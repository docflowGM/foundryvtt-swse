import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 2: proves the real
// GMLocationsSurfaceController open-faction/open-contact/open-job/open-intel
// branches (2L/2V) drive the shell's navigateToSurface() contract end to
// end, with the real stable-identity fields from each relationship row —
// never a name/text lookup, DOM search, or double navigation call — and
// that Contact-kind "actor" rows resolve to the linked world Actor's own
// sheet (the real, already-established destination for that case; see
// GMFactionRelationshipSurfaceController's open-contact-actor action)
// rather than a GM Datapad surface.
//
// Driven through the controller's real `_wireActions` delegated click
// listener — not by calling a private handler method directly — so this
// also proves the click actually reaches the right branch.

registerFoundryPathLoader();

class FakeControl {
  constructor(dataset = {}) { this.dataset = dataset; }
  closest(selector) { return selector === '[data-location-action]' ? this : null; }
}

function fakePageElement() {
  const listeners = { click: [] };
  return {
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler); },
    contains() { return true; },
    async click(dataset) {
      const control = new FakeControl(dataset);
      const event = { target: control, preventDefault() {}, stopPropagation() {} };
      for (const handler of listeners.click) await handler(event);
    }
  };
}

function installShim({ actors = [] } = {}) {
  const notifications = [];
  installFoundryShimGlobals({
    game: {
      user: { isGM: true },
      settings: { get: () => null, set: () => Promise.resolve(), settings: { has: () => true }, register: () => {} },
      actors: { get: (id) => actors.find(a => a.id === id) ?? null }
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

const { GMLocationsSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js');

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

// --- open-faction: navigates to Factions with the real faction id --------
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMLocationsSurfaceController(host);
  const page = fakePageElement();
  const abort = new AbortController();
  controller._wireActions(page, abort.signal);

  await page.click({ locationAction: 'open-faction', factionId: 'hutt-cartel' });

  assert.equal(host.navigateCalls.length, 1, 'open-faction must call the shell navigation contract exactly once');
  assert.equal(host.navigateCalls[0].surfaceId, 'factions');
  assert.deepEqual(host.navigateCalls[0].options, { statePatch: { focusedFactionId: 'hutt-cartel' } });
}

// --- open-contact (Faction-registry contact): navigates to Factions with
// both the owning faction id AND the contact id (2F) ----------------------
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMLocationsSurfaceController(host);
  const page = fakePageElement();
  const abort = new AbortController();
  controller._wireActions(page, abort.signal);

  await page.click({
    locationAction: 'open-contact',
    contactKind: 'contact',
    contactId: 'vigo-korda',
    factionId: 'hutt-cartel',
    missing: 'false'
  });

  assert.equal(host.navigateCalls.length, 1, 'open-contact (contact) must call the shell navigation contract exactly once');
  assert.equal(host.navigateCalls[0].surfaceId, 'factions');
  assert.deepEqual(host.navigateCalls[0].options, { statePatch: { focusedFactionId: 'hutt-cartel', focusedContactId: 'vigo-korda' } });
}

// --- open-contact (world Actor): opens the actor's OWN sheet directly —
// the real, already-established destination for a linked Actor (2F) — and
// must NOT call the shell surface navigation contract at all -------------
{
  const rendered = [];
  const actor = { id: 'jawaactor1', name: 'Jawa Trader', sheet: { render: (force) => rendered.push(force) } };
  installShim({ actors: [actor] });
  const host = makeFakeHost();
  const controller = new GMLocationsSurfaceController(host);
  const page = fakePageElement();
  const abort = new AbortController();
  controller._wireActions(page, abort.signal);

  await page.click({ locationAction: 'open-contact', contactKind: 'actor', actorUuid: 'Actor.jawaactor1', missing: 'false' });

  assert.equal(rendered.length, 1, 'a world Actor contact must open its own sheet exactly once');
  assert.equal(rendered[0], true);
  assert.equal(host.navigateCalls.length, 0, 'opening a linked Actor sheet must not also navigate the GM Datapad shell surface');
}

// --- open-job: navigates to Jobs via hostPatch (selectedJobThreadId is a
// bare host property, not surface state — see GMJobBoardSurfaceService) --
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMLocationsSurfaceController(host);
  const page = fakePageElement();
  const abort = new AbortController();
  controller._wireActions(page, abort.signal);

  await page.click({ locationAction: 'open-job', jobId: 'job-thread-1' });

  assert.equal(host.navigateCalls.length, 1, 'open-job must call the shell navigation contract exactly once');
  assert.equal(host.navigateCalls[0].surfaceId, 'jobs');
  assert.deepEqual(host.navigateCalls[0].options, { hostPatch: { selectedJobThreadId: 'job-thread-1' } });
}

// --- open-intel: navigates to Intel with the real intel id ---------------
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMLocationsSurfaceController(host);
  const page = fakePageElement();
  const abort = new AbortController();
  controller._wireActions(page, abort.signal);

  await page.click({ locationAction: 'open-intel', intelId: 'intel-1' });

  assert.equal(host.navigateCalls.length, 1, 'open-intel must call the shell navigation contract exactly once');
  assert.equal(host.navigateCalls[0].surfaceId, 'intel');
  assert.deepEqual(host.navigateCalls[0].options, { statePatch: { selectedRecordId: 'intel-1' } });
}

// --- missing/broken targets never navigate (2P: fail safe, no false
// success) — defense in depth behind the template already never rendering
// a nav control for a missing/broken relationship row ---------------------
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMLocationsSurfaceController(host);
  const page = fakePageElement();
  const abort = new AbortController();
  controller._wireActions(page, abort.signal);

  await page.click({ locationAction: 'open-job', jobId: 'ghost-job', missing: 'true' });
  await page.click({ locationAction: 'open-intel', intelId: 'ghost-intel', missing: 'true' });
  await page.click({ locationAction: 'open-contact', contactKind: 'actor', actorUuid: 'Actor.does-not-exist', missing: 'true' });

  assert.equal(host.navigateCalls.length, 0, 'a control marked missing must never trigger navigation, even if one somehow reached the DOM');
}

console.log('GM Locations controller open-faction/open-contact/open-job/open-intel navigation branches passed (correct surface, correct real-id patch, exactly once, missing targets fail safe).');

// --- Phase 2W: no DOM-text-search / prototype-shortcut patterns in the new
// navigation code. Scoped to the actual added regions (not the whole
// pre-existing controller/host files), since those legitimately contain
// unrelated uses of some of these tokens elsewhere. ------------------------
{
  const controllerSource = await readFile(new URL('../scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js', import.meta.url), 'utf8');
  const navBlockMatch = controllerSource.match(/\/\/ --- Ecosystem Redesign Phase 2:[\s\S]*?\n {8}if \(action === 'lead-select-location'\)/);
  assert.ok(navBlockMatch, 'expected to find the Phase 2 navigation action block in the controller');
  const resolveActorMatch = controllerSource.match(/async _resolveActorByUuid\([\s\S]*?\n {2}\}/);
  assert.ok(resolveActorMatch, 'expected to find _resolveActorByUuid');
  const newControllerCode = navBlockMatch[0] + '\n' + resolveActorMatch[0];

  const datapadSource = await readFile(new URL('../scripts/apps/gm-datapad.js', import.meta.url), 'utf8');
  const navigateToSurfaceMatch = datapadSource.match(/async navigateToSurface\([\s\S]*?\n {2}\}/);
  assert.ok(navigateToSurfaceMatch, 'expected to find navigateToSurface on GMDatapad');

  const newCode = newControllerCode + '\n' + navigateToSurfaceMatch[0];
  const banned = [
    /scrollIntoView/,
    /\.textContent\b/,
    /document\.querySelector/,
    /window\.location/,
    /\bDate\.now\(\)/,
    /includes\(record\.name\)/,
    /includes\(\s*(?:this|target)\.name\s*\)/
  ];
  for (const pattern of banned) {
    assert.doesNotMatch(newCode, pattern, `Phase 2 navigation code must not use the prototype-shortcut pattern ${pattern}`);
  }
}

console.log('Phase 2 navigation code prototype-shortcut scan passed (no DOM-text search, scrollIntoView, or name-based matching).');
