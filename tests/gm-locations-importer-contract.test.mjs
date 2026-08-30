import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// GM Locations Stage 1 — importer wiring contract (static).
//
// The GM Datapad action-integrity scanner
// (tests/gm-datapad-action-integrity-contract.test.mjs) already proves
// every data-location-action reaches a controller branch. That scanner
// does not (and is not meant to) prove two things specific to the
// importer that this test covers instead:
//
//   1. Form SUBMISSION is a separate wiring path from data-location-action
//      dispatch — "Import Selected" is a bare `type="submit"` button with
//      no data-location-action attribute at all, handled by a
//      `form[data-location-import-form]` submit listener. A regression
//      that removes that listener (or renames the form's marker
//      attribute) would leave the button doing nothing, and the
//      action-value scanner would never see it because it isn't a
//      data-location-action control.
//   2. The Browse/Options/Import wizard pages live inside ONE <form>, not
//      three separately-rendered ones — this is what lets a GM's checkbox
//      selections on page 1 (Browse) survive clicking Next to page 2/3,
//      since GMLocationsSurfaceController's wizard-next/back only toggle
//      `.is-active` on existing DOM (see
//      tests/gm-datapad-wizard-contract.test.mjs for that navigation
//      contract) rather than re-rendering the form's contents.

const root = new URL('../', import.meta.url);
const read = (rel) => readFile(new URL(rel, root), 'utf8');

const template = await read('templates/apps/gm-datapad/surfaces/locations.hbs');
const controller = await read('scripts/ui/shell/gm/controllers/GMLocationsSurfaceController.js');
const service = await read('scripts/ui/shell/gm/GMLocationsSurfaceService.js');

// --- Import form: one form, one submit path, checkboxes survive paging ---

const importFormMatch = template.match(/<form[^>]*data-location-import-form[^>]*>([\s\S]*?)<\/form>/);
assert.ok(importFormMatch, 'locations.hbs must render exactly one <form data-location-import-form> element');
const importFormBody = importFormMatch[1];

const wizardPagesInForm = (importFormBody.match(/data-wizard-page="\d+"/g) || []);
assert.equal(wizardPagesInForm.length, 3, 'the import wizard\'s 3 pages (Browse/Options/Import) must all live inside the same <form> so checked checkboxes on page 1 are still present in FormData when the form is submitted from page 3');

assert.match(importFormBody, /name="seedIds"/, 'the import form must render seed-selection checkboxes named "seedIds"');
assert.match(controller, /formData\.getAll\(['"]seedIds['"]\)/, 'the controller must read exactly the "seedIds" field the template renders, via FormData.getAll (which naturally returns only the checked boxes\' values)');

assert.match(controller, /form\[data-location-import-form\]/, 'the controller must wire a submit handler keyed to data-location-import-form');
assert.match(controller, /form\[data-location-import-form\][\s\S]{0,200}addEventListener\(['"]submit['"]/, 'the data-location-import-form wiring must attach a "submit" listener (this is the "Import Selected" button\'s real handler — it has no data-location-action of its own)');

const submitButtonMatch = importFormBody.match(/<button[^>]*type="submit"[^>]*>([^<]*)<\/button>/g) || [];
assert.ok(submitButtonMatch.some(btn => /Import Selected/.test(btn)), 'the import form must render an "Import Selected" type="submit" button');
assert.ok(!submitButtonMatch.some(btn => /data-location-action/.test(btn)), 'the "Import Selected" submit button must not also carry a data-location-action (it is handled by form submit, not action dispatch — asserting this prevents a future double-handler regression)');

// --- Action-value coverage for the importer's own controls -------------

const importerActions = ['open-import-modal', 'clear-library-filters', 'wizard-next', 'wizard-back', 'import-library-visible-now', 'close-modal'];
for (const action of importerActions) {
  const literal = `data-location-action="${action}"`;
  assert.ok(template.includes(literal), `locations.hbs must render ${literal}`);
  assert.ok(controller.includes(`'${action}'`) || controller.includes(`"${action}"`), `GMLocationsSurfaceController must branch on action === '${action}'`);
}

// --- "Import All Shown" must read the same filtered set the cards render ---
//
// Both GMLocationsSurfaceController (for "Import All Shown") and
// GMLocationsSurfaceService (for the rendered library cards) must resolve
// "shown" through the identical LocationRegistryService.getLibrarySeeds()
// call, keyed off the same three persisted filter fields — not two
// independently-maintained filtering implementations that could drift.

assert.match(
  controller,
  /LocationRegistryService\.getLibrarySeeds\(\s*\{\s*search:\s*state\.librarySearch[^}]*biome:\s*state\.libraryBiome[^}]*category:\s*state\.libraryCategory/,
  'the "Import All Shown" handler must call LocationRegistryService.getLibrarySeeds({ search: state.librarySearch, biome: state.libraryBiome, category: state.libraryCategory, ... })'
);
assert.match(
  service,
  /LocationRegistryService\.getLibrarySeeds\(\s*\{\s*search:\s*filters\.librarySearch[^}]*biome:\s*filters\.libraryBiome[^}]*category:\s*filters\.libraryCategory/,
  'the library card list must be built from LocationRegistryService.getLibrarySeeds({ search: filters.librarySearch, biome: filters.libraryBiome, category: filters.libraryCategory, ... }) — the same filter shape "Import All Shown" reads'
);

// --- Double-submit / concurrent-import protection ------------------------

assert.match(controller, /_importInFlight/, 'the controller must guard _importLibrarySeedIds against re-entrant calls (double-click on Import Selected / Import All Shown) with an in-flight flag');

console.log('GM Locations importer wiring contract passed (form submission path, checkbox-survives-paging, action coverage, shared filter authority, double-submit guard).');
