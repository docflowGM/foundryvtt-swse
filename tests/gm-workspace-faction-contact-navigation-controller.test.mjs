import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — Phase 7 FINAL CORRECTION 4B: executes
// the real GMWorkspaceSurfaceController._wireDossierTargets() click
// dispatch for an Organization Role row, proving the full chain —
// click -> GMCampaignTargetService.resolve() -> navigateToSurface() —
// delivers BOTH stable ids to the destination render, not just a unit
// assertion on GMCampaignTargetService.factionContact() in isolation and
// a static regex over the template/controller source (which the prior
// pass relied on and the independent review correctly called an
// overstated proof level).

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
      actors: { get: () => null, [Symbol.iterator]: () => [][Symbol.iterator]() }
    },
    ui: { notifications: { info: () => {}, warn: () => {}, error: () => {} } }
  });
}

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

const { GMWorkspaceSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMWorkspaceSurfaceController.js');

// --- Organization Role click -> navigateToSurface exactly once, with
// BOTH focusedFactionId and focusedContactId on the destination patch ---
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMWorkspaceSurfaceController(host);
  const page = fakePageElement({
    'dossier-target-kind': [{ dossierTargetKind: 'faction-contact', dossierTargetId: 'contact-vexa', dossierTargetFactionId: 'black-sun' }]
  });
  const abort = new AbortController();
  controller._wireDossierTargets(page, abort.signal);

  await page.click('dossier-target-kind', { dossierTargetKind: 'faction-contact', dossierTargetId: 'contact-vexa', dossierTargetFactionId: 'black-sun' });

  assert.equal(host.navigateCalls.length, 1, 'an Organization Role click must call navigateToSurface exactly once');
  assert.equal(host.navigateCalls[0].surfaceId, 'factions');
  assert.deepEqual(host.navigateCalls[0].options.statePatch, { focusedFactionId: 'black-sun', focusedContactId: 'contact-vexa' }, 'the destination render must receive BOTH the exact Faction id and the exact Contact id');
}

// --- a generic Faction Standing row (no factionId dataset attribute)
// must still navigate to a plain Faction target, unaffected -----------
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMWorkspaceSurfaceController(host);
  const page = fakePageElement({
    'dossier-target-kind': [{ dossierTargetKind: 'faction', dossierTargetId: 'black-sun' }]
  });
  const abort = new AbortController();
  controller._wireDossierTargets(page, abort.signal);

  await page.click('dossier-target-kind', { dossierTargetKind: 'faction', dossierTargetId: 'black-sun' });

  assert.equal(host.navigateCalls.length, 1);
  assert.deepEqual(host.navigateCalls[0].options.statePatch, { focusedFactionId: 'black-sun' }, 'a generic Faction Standing row must never gain a spurious focusedContactId');
}

// --- a faction-contact row missing its factionId must fail safe, no
// navigation call, never a degraded faction-only target -----------------
{
  installShim();
  const host = makeFakeHost();
  const controller = new GMWorkspaceSurfaceController(host);
  const page = fakePageElement({
    'dossier-target-kind': [{ dossierTargetKind: 'faction-contact', dossierTargetId: 'contact-vexa' }]
  });
  const abort = new AbortController();
  controller._wireDossierTargets(page, abort.signal);

  await page.click('dossier-target-kind', { dossierTargetKind: 'faction-contact', dossierTargetId: 'contact-vexa' });

  assert.equal(host.navigateCalls.length, 0, 'a faction-contact row missing its factionId must fail safe, never silently degrade to a faction-only target');
}

console.log('Workspace Organization Role navigation (executed controller dispatch) passed (exactly one navigateToSurface call carrying BOTH focusedFactionId and focusedContactId; a generic Faction row is unaffected; a missing factionId fails safe with no navigation).');
