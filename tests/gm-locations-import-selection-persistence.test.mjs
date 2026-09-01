import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Locations Stage 3 (final state-integrity correction) — import
// selection survives a filter rerun, executed through the real
// state-transition path, not a manually-constructed final state.
//
// First Stage 3 pass: the Import Location modal's "checked" state lived
// only in the checkbox DOM, discarded whenever a library filter rerendered
// the card list. Fixed by persisting checked ids into surface state
// (`librarySelectedSeedIds`) — but that first fix's checkbox `change`
// handler reconstructed the ENTIRE selected set from
// `seedIdsFromForm(new FormData(form))`, which only contains checkboxes
// CURRENTLY PRESENT IN THE FILTERED DOM. So selecting Naboo, filtering to
// "Tatooine" (Naboo's card and checkbox disappear), then checking
// Tatooine still silently dropped Naboo from the selection — the exact
// bug the fix claimed to close, just moved one step later. Also, "Import
// Selected" read `seedIdsFromForm(formData)` directly from the visible
// filtered form at submit time, so a selected-but-currently-hidden seed
// could never actually be imported.
//
// Corrected: a checkbox change now adds/removes ONLY that one seed id
// from the authoritative `librarySelectedSeedIds` set already in surface
// state — it never reconstructs the whole set from the DOM. "Import
// Selected" now imports the union of surface-state selection and
// whatever the visible form has checked (defensive only; state is
// already authoritative by the time submit fires).
//
// This file drives the REAL `_wireForms`/`_importLibrarySeedIds`
// controller methods through a minimal hand-rolled fake form/FormData (no
// jsdom dependency in this repo — `new FormData(realFormElement)` is a
// browser-only constructor form Node's own FormData does not support),
// simulating the actual click → change event → filter rerender → click
// sequence a GM would perform, not a pre-built final state.

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

  const vmUnfiltered = await GMLocationsSurfaceService.buildViewModel({
    getSurfaceState: () => ({ librarySelectedSeedIds: ['naboo', 'tatooine'] })
  });
  const unfilteredById = new Map(vmUnfiltered.locationManager.library.cards.map(card => [card.id, card]));
  assert.equal(unfilteredById.get('naboo')?.checked, true, 'a seed id present in librarySelectedSeedIds must render checked with no filter applied');
  assert.equal(unfilteredById.get('tatooine')?.checked, true);

  const vmFiltered = await GMLocationsSurfaceService.buildViewModel({
    getSurfaceState: () => ({ librarySelectedSeedIds: ['naboo', 'tatooine'], librarySearch: 'tatooine' })
  });
  const tatooineCard = vmFiltered.locationManager.library.cards.find(card => card.id === 'tatooine');
  assert.ok(tatooineCard, 'tatooine must match its own name search');
  assert.equal(tatooineCard.checked, true, 'a previously-checked seed must still read checked after a filter narrows the visible list');

  const vmNoneSelected = await GMLocationsSurfaceService.buildViewModel({ getSurfaceState: () => ({}) });
  assert.ok(vmNoneSelected.locationManager.library.cards.every(card => card.checked !== true), 'with no librarySelectedSeedIds in state, no library card may read checked');
}

// --- 2: real state-transition proof through the actual controller wiring
// (executed) ------------------------------------------------------------

// A fake FormData compatible with what the controller actually calls on
// it (get/getAll/has) — Node's built-in FormData cannot be constructed
// from a plain object at all (`new FormData(x)` throws outside a real
// browser DOM), so the controller's own `new FormData(form)` calls are
// satisfied here by installing this fake constructor as the global.
class FakeFormData {
  constructor(form) { this._form = form; }
  get(name) {
    if (name === 'seedIds') { const hit = this._form.inputs.find(i => i.checked); return hit ? hit.value : null; }
    return Object.prototype.hasOwnProperty.call(this._form.fields, name) ? this._form.fields[name] : null;
  }
  getAll(name) {
    if (name !== 'seedIds') return [];
    return this._form.inputs.filter(i => i.checked).map(i => i.value);
  }
  has(name) { return Boolean(this._form.fields[name]); }
}

class FakeImportForm {
  constructor(fields = {}) {
    this.fields = fields;
    this.inputs = []; // seedIds checkboxes currently "rendered" under the active filter
    this._listeners = { submit: [], change: [] };
  }
  addEventListener(type, handler) { (this._listeners[type] ||= []).push(handler); }
  /** Simulate the library filter rerendering this list: only these seed
   *  ids have a live checkbox in the DOM afterward, each restored to
   *  `checked` per the given selection set (mirroring what the real
   *  template does from the view-model's `checked` field). */
  rerenderVisibleSeeds(seedIds, selectedSet) {
    this.inputs = seedIds.map(id => ({ name: 'seedIds', value: id, checked: selectedSet.has(id) }));
  }
  /** Simulate a GM clicking one checkbox: toggle it (creating its <input>
   *  if the filter doesn't already render one for it) and fire `change`. */
  clickSeed(seedId, checked) {
    let input = this.inputs.find(i => i.value === seedId);
    if (!input) { input = { name: 'seedIds', value: seedId, checked }; this.inputs.push(input); }
    else input.checked = checked;
    for (const handler of this._listeners.change) handler({ target: input });
  }
  submit() {
    const event = { preventDefault() {} };
    return Promise.all(this._listeners.submit.map(handler => handler(event)));
  }
}

function fakePageElementWithImportForm(form) {
  return {
    querySelectorAll(selector) {
      if (selector === 'form[data-location-import-form]') return [form];
      return [];
    }
  };
}

{
  const realFormData = globalThis.FormData;
  globalThis.FormData = FakeFormData;
  try {
    const { notifications } = installShim({ locations: [] });
    const { GMLocationsSurfaceController } = await import('/systems/foundryvtt-swse/scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js');
    const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');

    let state = {};
    const patches = [];
    const fakeHost = {
      getSurfaceState: () => state,
      patchSurfaceState: (surfaceId, patch) => { state = { ...state, ...patch }; patches.push(patch); return state; },
      requestSurfaceRender: async () => {}
    };
    const controller = new GMLocationsSurfaceController(fakeHost);

    const form = new FakeImportForm({ includeChildren: 'on', includeAtlasFacts: 'on' });
    controller._pageElement = fakePageElementWithImportForm(form);
    const abortController = new AbortController();
    controller._wireForms(fakePageElementWithImportForm(form), abortController.signal);

    // Unfiltered: only Naboo's checkbox exists right now.
    form.rerenderVisibleSeeds(['naboo', 'tatooine', 'hoth'], new Set());
    assert.deepEqual(state.librarySelectedSeedIds || [], [], 'selection starts empty');

    // Select Naboo.
    form.clickSeed('naboo', true);
    assert.deepEqual([...state.librarySelectedSeedIds].sort(), ['naboo'], 'selecting Naboo must record it in surface state');

    // Filter narrows the visible list so Naboo's checkbox no longer
    // exists in the DOM at all (this is what a library search/biome/
    // category filter rerender actually does).
    form.rerenderVisibleSeeds(['tatooine'], new Set(state.librarySelectedSeedIds));
    assert.deepEqual([...state.librarySelectedSeedIds].sort(), ['naboo'], 'a filter rerender that hides Naboo\'s checkbox must not by itself change the persisted selection');

    // Select Tatooine while Naboo is hidden — THIS is the exact
    // transition the original bug lost Naboo on.
    form.clickSeed('tatooine', true);
    assert.deepEqual([...state.librarySelectedSeedIds].sort(), ['naboo', 'tatooine'], 'selecting Tatooine while Naboo is filtered out of the DOM must ADD to the selection, not replace it — Naboo must survive');

    // Change the filter again (now showing neither Naboo nor Tatooine) —
    // selection must still be untouched.
    form.rerenderVisibleSeeds(['hoth'], new Set(state.librarySelectedSeedIds));
    assert.deepEqual([...state.librarySelectedSeedIds].sort(), ['naboo', 'tatooine'], 'a further filter change must still not disturb the persisted selection');

    // Filter back to where Tatooine is visible again and uncheck it.
    form.rerenderVisibleSeeds(['tatooine'], new Set(state.librarySelectedSeedIds));
    form.clickSeed('tatooine', false);
    assert.deepEqual([...state.librarySelectedSeedIds].sort(), ['naboo'], 'unchecking Tatooine must remove only Tatooine from the selection');

    // Re-select it.
    form.clickSeed('tatooine', true);
    assert.deepEqual([...state.librarySelectedSeedIds].sort(), ['naboo', 'tatooine']);

    // Filter to hide Naboo again, then submit "Import Selected" — Naboo
    // must still import even though its checkbox isn't in the DOM at
    // submit time.
    form.rerenderVisibleSeeds(['tatooine'], new Set(state.librarySelectedSeedIds));
    await form.submit();

    assert.ok(LocationRegistryService.findLocation('naboo'), 'Naboo must be imported even though it was hidden by the filter at submit time — the authoritative selection, not the visible form, decides what imports');
    assert.ok(LocationRegistryService.findLocation('tatooine'), 'Tatooine (visible and checked) must also be imported');
    assert.ok(notifications.some(([level, msg]) => level === 'info' && /Imported .* location record\(s\) from 2 quick location\(s\)/.test(msg)), 'the success notification must reflect both quick locations, not just the one visible in the filtered form');

    assert.deepEqual(state.librarySelectedSeedIds, [], 'a successful import must clear the persisted selection');
  } finally {
    globalThis.FormData = realFormData;
  }
}

// --- 3: source-level proof that the checkbox-change handler is additive/
// subtractive against surface state (not a DOM reconstruction), that
// Import Selected consumes the authoritative state, and that closing the
// modal clears it -----------------------------------------------------------

const root = new URL('../', import.meta.url);
const controllerSource = await readFile(new URL('scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js', root), 'utf8');
const template = await readFile(new URL('templates/apps/gm-datapad/surfaces/locations.hbs', root), 'utf8');

assert.match(
  controllerSource,
  /if \(input\.checked\) current\.add\(seedId\); else current\.delete\(seedId\);/,
  'the seedIds checkbox change handler must add/remove only the changed seed from the authoritative selection set, never reconstruct the whole set from the visible form'
);
assert.doesNotMatch(
  controllerSource,
  /librarySelectedSeedIds:\s*seedIdsFromForm\(new FormData\(form\)\)/,
  'the checkbox change handler must not reconstruct librarySelectedSeedIds from the currently-rendered (possibly filter-narrowed) FormData'
);
assert.match(
  controllerSource,
  /authoritativeIds = Array\.from\(new Set\(\[\s*\.\.\.\(Array\.isArray\(state\.librarySelectedSeedIds\)/,
  'Import Selected must import the union starting from the authoritative surface-state selection, not just the currently-visible form'
);
assert.match(
  controllerSource,
  /action === 'close-modal'\)\s*\{[\s\S]{0,200}librarySelectedSeedIds:\s*\[\]/,
  'closing the modal must clear librarySelectedSeedIds'
);
assert.match(template, /name="seedIds"[^>]*\{\{#if checked\}\}checked\{\{\/if\}\}/, 'the seedIds checkbox must render its checked state from the view-model');

// --- 4: a successful import (via the direct controller method, matching
// the established Stage 1 test pattern) still clears the persisted
// selection, and closing the modal clears it too (executed) ---------------

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

  const closePatches = [];
  const closeHost = {
    getSurfaceState: () => ({ selectedLocationId: '' }),
    patchSurfaceState: (surfaceId, patch) => closePatches.push(patch),
    requestSurfaceRender: async () => {}
  };
  const closeController = new GMLocationsSurfaceController(closeHost);
  const pageElement = { querySelectorAll: () => [], addEventListener: (type, handler) => { pageElement._click = handler; }, contains: () => true };
  const abortController = new AbortController();
  closeController._wireActions(pageElement, abortController.signal);
  const closeButton = { dataset: { locationAction: 'close-modal' } };
  await pageElement._click({
    target: { closest: (sel) => sel === '[data-location-action]' ? closeButton : null },
    preventDefault() {}, stopPropagation() {}
  });
  assert.ok(closePatches.some(patch => Array.isArray(patch.librarySelectedSeedIds) && patch.librarySelectedSeedIds.length === 0), 'closing the modal must clear librarySelectedSeedIds, executed through the real close-modal action handler');
}

console.log('GM Locations import selection persistence contract passed (real state-transition proof: select A, filter A away, select B, selection stays [A,B], Import Selected while A is hidden imports both, successful import and modal close both clear the selection).');
