import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Locations Stage 3 — import selection survives a filter rerun.
//
// Before this fix, the Import Location modal's "checked" state lived only
// in the checkbox DOM. Since every library search/biome/category filter
// change rebuilds `surface.locationManager.library.cards` from a fresh
// view-model (no `checked` property at all) and the template's
// `{{#each}}` loop replaces every <input> it renders, adjusting a filter
// while seeds were checked silently discarded the GM's selection with no
// warning. Fixed: the checked ids are persisted into surface state
// (`librarySelectedSeedIds`) on every checkbox change, the view-model now
// marks each library card's `checked` from that state regardless of which
// filter produced the current card list, and the selection is cleared
// only at the two points that actually consume or discard it: a
// successful import and closing the modal.

registerFoundryPathLoader();

function installShim({ locations = [] } = {}) {
  const store = new Map([['gmLocationRegistry', locations]]);
  const notifications = [];
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

// --- 1: the view-model marks `checked` from surface state, independent of
// which library filter is currently narrowing the visible card list
// (executed) ---------------------------------------------------------------

{
  installShim();
  const { GMLocationsSurfaceService } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/GMLocationsSurfaceService.js');

  // No filter: both selected seeds are visible and checked.
  const vmUnfiltered = await GMLocationsSurfaceService.buildViewModel({
    getSurfaceState: () => ({ librarySelectedSeedIds: ['naboo', 'tatooine'] })
  });
  const unfilteredById = new Map(vmUnfiltered.locationManager.library.cards.map(card => [card.id, card]));
  assert.equal(unfilteredById.get('naboo')?.checked, true, 'a seed id present in librarySelectedSeedIds must render checked with no filter applied');
  assert.equal(unfilteredById.get('tatooine')?.checked, true);

  // Apply a search filter that narrows the visible list, WITHOUT touching
  // librarySelectedSeedIds — this is exactly what happens when the GM
  // types into the library search box after already checking some cards.
  const vmFiltered = await GMLocationsSurfaceService.buildViewModel({
    getSurfaceState: () => ({ librarySelectedSeedIds: ['naboo', 'tatooine'], librarySearch: 'tatooine' })
  });
  const filteredCards = vmFiltered.locationManager.library.cards;
  assert.ok(filteredCards.length > 0, 'the search filter must still surface a matching card');
  const tatooineCard = filteredCards.find(card => card.id === 'tatooine');
  assert.ok(tatooineCard, 'tatooine must match its own name search');
  assert.equal(tatooineCard.checked, true, 'a previously-checked seed must still read checked after a filter narrows the visible list — this is the bug: state, not DOM, must be the source of truth');

  // An unselected seed never reads checked just because it is visible.
  const vmNoneSelected = await GMLocationsSurfaceService.buildViewModel({ getSurfaceState: () => ({}) });
  assert.ok(vmNoneSelected.locationManager.library.cards.every(card => card.checked !== true), 'with no librarySelectedSeedIds in state, no library card may read checked');
}

// --- 2: a successful import and closing the modal both clear the
// persisted selection (executed, via the real controller) ------------------

{
  const { notifications } = installShim({ locations: [] });
  const { GMLocationsSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js');
  const patches = [];
  const fakeHost = {
    getSurfaceState: () => ({}),
    patchSurfaceState: (surfaceId, patch) => patches.push(patch),
    requestSurfaceRender: async () => {}
  };
  const controller = new GMLocationsSurfaceController(fakeHost);
  controller._pageElement = { querySelectorAll: () => [] };

  await controller._importLibrarySeedIds(['naboo'], 'test-clear-on-import', {});
  const importPatch = patches.find(patch => Object.prototype.hasOwnProperty.call(patch, 'selectedLocationId'));
  assert.ok(importPatch, 'a successful import must patch selectedLocationId');
  assert.deepEqual(importPatch.librarySelectedSeedIds, [], 'a successful import must clear librarySelectedSeedIds so a stale selection does not leak into the next import session');
}

// --- 3: source-level wiring proof that checkbox changes persist into
// surface state and close-modal clears it (the DOM `change` event itself
// cannot be simulated without jsdom, which this repo does not depend on) --

const root = new URL('../', import.meta.url);
const controllerSource = await readFile(new URL('scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js', root), 'utf8');
const template = await readFile(new URL('templates/apps/gm-datapad/surfaces/locations.hbs', root), 'utf8');

assert.match(
  controllerSource,
  /form\.addEventListener\('change',[\s\S]{0,300}librarySelectedSeedIds:\s*seedIdsFromForm\(new FormData\(form\)\)/,
  'the import form must persist its current checked seed ids into surface state on change'
);
assert.match(
  controllerSource,
  /action === 'close-modal'\)\s*\{[\s\S]{0,200}librarySelectedSeedIds:\s*\[\]/,
  'closing the modal must clear librarySelectedSeedIds'
);
assert.match(template, /name="seedIds"[^>]*\{\{#if checked\}\}checked\{\{\/if\}\}/, 'the seedIds checkbox must render its checked state from the view-model');

console.log('GM Locations import selection persistence contract passed (checked seeds survive a filter rerun via surface state, and are cleared only on successful import or modal close).');
