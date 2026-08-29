import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Locations Phase 0 — surface/shellSurfaceVm context-contract regression.
//
// GMLocationsSurfaceService.buildViewModel() returns a flat VM shaped
// `{ pageTitle, pageDescription, locationManager }`, and
// templates/apps/gm-datapad/surfaces/locations.hbs is written entirely
// against `surface.pageTitle` / `surface.locationManager.*`. The shared
// shell partial (templates/shell/shell-surface.hbs) is what has to bind
// that VM to the name `surface` when it includes the Locations partial —
// every other GM surface template reads its VM off the flattened root
// context instead, so this binding is easy to drop by copy-paste, and
// nothing else catches it: the GM Datapad action-integrity scanner
// (tests/gm-datapad-action-integrity-contract.test.mjs) proves every
// data-location-action reaches a real controller handler, which stays
// true even when the template's data context is wrong — the controller
// state changes happen (e.g. modal.type = 'create'), the surface rebuilds
// modal.isCreate = true, but the template evaluates
// `surface.locationManager.modal.isCreate` against an undefined `surface`
// and the wizard never appears. This test fails specifically on that class
// of break: template and partial-invocation agreeing on the wrong root, or
// service and template disagreeing on shape.
//
// Part 1 is a static source-text check of the partial invocation itself.
// Part 2 executes the real GMLocationsSurfaceService.buildViewModel()
// under the repo's Foundry-shim Node harness (see
// tests/helpers/foundry-shim/*) and proves the modal/editor prefill
// contract used by the Faction/Contact -> Create Location handoff
// (GMFactionRelationshipSurfaceController's 'create-location-faction' /
// 'create-location-contact' actions, which stash `modal.defaults` for the
// Locations surface to consume).

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

// --- Part 1: partial-invocation contract (static) -------------------------

const shellSurfaceHbs = await read('templates/shell/shell-surface.hbs');
const locationsHbs = await read('templates/apps/gm-datapad/surfaces/locations.hbs');

const gmLocationsBranchMatch = shellSurfaceHbs.match(/\{\{#if \(eq shellSurface "gm-locations"\)\}\}[\s\S]*?\{\{\/if\}\}/);
assert.ok(gmLocationsBranchMatch, 'shell-surface.hbs must render a "gm-locations" branch');
assert.match(
  gmLocationsBranchMatch[0],
  /surface\s*=\s*shellSurfaceVm/,
  'the gm-locations branch must invoke locations.hbs with `surface=shellSurfaceVm` — ' +
  'locations.hbs is written entirely against `surface.*`, so omitting this binding leaves ' +
  'every surface.* expression undefined and the Locations app renders with no data, no ' +
  'counts, and no working create/import modals despite every control having a real handler.'
);

// Confirms the assertion above is testing the convention that is actually
// true today — if locations.hbs is ever migrated off `surface.*` (e.g. to
// match the flattened-root convention every other gm-* surface template
// uses), this count collapses to ~0 and this test must be updated to match
// the new convention rather than silently passing on stale reasoning.
const surfaceRefCount = (locationsHbs.match(/\bsurface\.\w/g) || []).length;
assert.ok(
  surfaceRefCount > 50,
  `expected locations.hbs to reference "surface.*" extensively (found ${surfaceRefCount}) — ` +
  'if this convention changed, the partial-invocation assertion above needs updating too'
);

// --- Part 2: buildViewModel modal/editor prefill contract (executed) ------

registerFoundryPathLoader();

function installLocationsShim({ locations = [], factions = [] } = {}) {
  installFoundryShimGlobals({
    game: {
      settings: {
        get: (_moduleId, key) => (key === 'gmLocationRegistry' ? locations : key === 'gmFactionRegistry' ? factions : undefined),
        settings: { has: () => true },
        register: () => {}
      }
    }
  });
}

const { GMLocationsSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMLocationsSurfaceService.js');

function hostWithState(state) {
  return { getSurfaceState: () => state };
}

// A plain "New Location" click (no defaults) must open the create wizard
// against a genuinely blank editor.
{
  installLocationsShim();
  const vm = await GMLocationsSurfaceService.buildViewModel(hostWithState({ selectedLocationId: '', modal: { type: 'create' } }));
  assert.equal(vm.locationManager.modal.isCreate, true, 'modal.isCreate must be true once state.modal.type === "create"');
  assert.equal(vm.locationManager.editor.name, '', 'a plain New Location click must not carry over stale prefill data');
  assert.equal(vm.locationManager.editor.raw.controllingFactionId, '', 'a plain New Location click must not carry over a stale controlling faction');
}

// The Faction/Contact "Create Location" handoff stashes modal.defaults;
// GMLocationsSurfaceService must apply them to the blank create editor.
{
  installLocationsShim();
  const defaults = {
    name: 'Faction Operations Site',
    controllingFactionId: 'faction-1',
    factionIds: ['faction-1', 'faction-2'],
    contactIds: ['contact-1'],
    publicSummary: 'An operating location associated with this faction.'
  };
  const vm = await GMLocationsSurfaceService.buildViewModel(hostWithState({ selectedLocationId: '', modal: { type: 'create', defaults } }));
  assert.equal(vm.locationManager.modal.isCreate, true);
  assert.equal(vm.locationManager.editor.name, defaults.name, 'create editor must prefill name from modal.defaults');
  assert.equal(vm.locationManager.editor.raw.controllingFactionId, defaults.controllingFactionId, 'create editor must prefill controllingFactionId from modal.defaults');
  assert.equal(vm.locationManager.editor.factionIdsText, defaults.factionIds.join(', '), 'create editor must prefill factionIdsText from modal.defaults.factionIds');
  assert.equal(vm.locationManager.editor.contactIdsText, defaults.contactIds.join(', '), 'create editor must prefill contactIdsText from modal.defaults.contactIds');
  assert.equal(vm.locationManager.editor.raw.publicSummary, defaults.publicSummary, 'create editor must prefill publicSummary from modal.defaults');
}

// Editing an existing location must never be clobbered by a stale
// modal.defaults payload — defaults apply to NEW-location creation only.
{
  installLocationsShim({ locations: [{ id: 'loc-1', name: 'Existing Outpost', publicSummary: 'Original summary' }] });
  const vm = await GMLocationsSurfaceService.buildViewModel(hostWithState({
    selectedLocationId: 'loc-1',
    modal: { type: 'create', defaults: { name: 'Should Not Apply', publicSummary: 'Should not apply either' } }
  }));
  assert.equal(vm.locationManager.editor.name, 'Existing Outpost', 'editing an existing location must keep its real name, not a transient create-defaults payload');
  assert.equal(vm.locationManager.editor.raw.publicSummary, 'Original summary', 'editing an existing location must keep its real summary, not a transient create-defaults payload');
}

console.log('GM Locations surface context-contract passed (partial invocation + create-defaults prefill).');
