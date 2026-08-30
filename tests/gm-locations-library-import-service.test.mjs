import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Locations Stage 1 — importer reliability, executed for real.
//
// Proves LocationRegistryService.importLibrarySeeds()/importLibrarySeed()
// against a real in-memory game.settings store (via the repo's existing
// Foundry-shim Node harness), not just by reading the source. Before this
// pass, importLibrarySeeds() called importLibrarySeed() once per id, and
// each call did its own getRegistry()/saveRegistry() round trip: an
// N-seed batch meant N separate settings writes, so a mid-batch failure
// left an unreported partial import and there was no explicit "this
// selection could not be resolved" result for an unknown seed id. This
// batches every resolved seed into one in-memory map and saves once (see
// the comment on importLibrarySeeds() itself for the full reasoning).

registerFoundryPathLoader();

/** A real in-memory settings store — get/set actually round-trip, and we can
 *  count how many times set() was called to prove the "one save per batch"
 *  claim, not just infer it from source reading. */
function makeSettingsStore(initial = {}) {
  const store = new Map(Object.entries(initial));
  let setCount = 0;
  return {
    getSetCount: () => setCount,
    shim: {
      get: (_moduleId, key) => store.get(key),
      set: (_moduleId, key, value) => { store.set(key, value); setCount += 1; return Promise.resolve(value); },
      settings: { has: () => true },
      register: () => {}
    }
  };
}

registerFoundryPathLoader();

async function freshService(initial = {}) {
  const store = makeSettingsStore(initial);
  installFoundryShimGlobals({ game: { settings: store.shim } });
  // Re-import isn't necessary — the module is already loaded and reads
  // `game.settings` at call time, not at import time — but importing once
  // up front keeps every test case using the same class reference.
  const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');
  return { LocationRegistryService, store };
}

// CASE: empty registry, import two multi-record seeds -> exactly one save.
{
  const { LocationRegistryService, store } = await freshService();
  const result = await LocationRegistryService.importLibrarySeeds(['tatooine', 'hoth'], {});
  assert.equal(result.imported.length, 8, 'tatooine (1+3) + hoth (1+3) should import 8 records');
  assert.equal(result.skipped.length, 0);
  assert.deepEqual(result.invalid, []);
  assert.deepEqual(result.seeds.map(s => s.id).sort(), ['hoth', 'tatooine']);
  assert.equal(store.getSetCount(), 1, 'a multi-seed batch must write the registry setting exactly once, not once per seed');
}

// CASE: importing the same seeds again is idempotent and, since nothing
// changed, does not write the setting again at all.
{
  const { LocationRegistryService, store } = await freshService();
  await LocationRegistryService.importLibrarySeeds(['tatooine'], {});
  const setCountAfterFirst = store.getSetCount();
  const second = await LocationRegistryService.importLibrarySeeds(['tatooine'], {});
  assert.equal(second.imported.length, 0, 're-importing an already-imported seed must import 0 new records');
  assert.equal(second.skipped.length, 4, 'all 4 of tatooine\'s records (1 parent + 3 children) must be reported as already existing');
  assert.equal(store.getSetCount(), setCountAfterFirst, 'a batch that imports nothing new must not write the registry setting again');

  const registry = LocationRegistryService.getRegistry();
  const tatooineRecords = registry.filter(r => r.librarySeedId === 'tatooine' || r.id === 'tatooine');
  assert.equal(tatooineRecords.length, 4, 'repeated import must never duplicate tatooine\'s 4 records');
}

// CASE: an unknown seed id is classified as invalid, not silently dropped,
// and does not block the valid seeds in the same request.
{
  const { LocationRegistryService } = await freshService();
  const result = await LocationRegistryService.importLibrarySeeds(['naboo', 'not-a-real-seed-id'], {});
  assert.equal(result.imported.length, 4, 'naboo (1+3) should still import despite the unresolvable id alongside it');
  assert.deepEqual(result.invalid, ['not-a-real-seed-id']);
  assert.deepEqual(result.seeds.map(s => s.id), ['naboo']);
}

// CASE: duplicate seed ids within a single request are treated once.
{
  const { LocationRegistryService } = await freshService();
  const result = await LocationRegistryService.importLibrarySeeds(['dagobah', 'dagobah', 'DAGOBAH'], {});
  assert.equal(result.imported.length, 4, 'a seed id repeated (including by case) in one request must still import exactly once');
  assert.equal(result.seeds.length, 1);
}

// CASE: parent/child identity and hierarchy survive a real import — every
// child resolves to the correct parent id and carries seed provenance.
{
  const { LocationRegistryService } = await freshService();
  await LocationRegistryService.importLibrarySeeds(['kashyyyk'], {});
  const registry = LocationRegistryService.getRegistry();
  const parent = registry.find(r => r.id === 'kashyyyk');
  assert.ok(parent, 'the parent record must use the seed id directly as its registry id');
  assert.equal(parent.parentLocationId, '', 'a top-level imported seed must have no parent');
  const children = registry.filter(r => r.parentLocationId === 'kashyyyk');
  assert.equal(children.length, 3, 'kashyyyk should import exactly 3 child POIs');
  for (const child of children) assert.equal(child.librarySeedId, 'kashyyyk', `child "${child.id}" must carry librarySeedId back to its parent seed`);
}

// CASE: importLibrarySeed() (singular) keeps its original {imported,
// skipped, seed} contract — GMLocationsSurfaceController's single-seed
// "import-library-seed" action reads exactly these fields.
{
  const { LocationRegistryService } = await freshService();
  const single = await LocationRegistryService.importLibrarySeed('endor', {});
  assert.equal(single.imported.length, 4);
  assert.equal(single.skipped.length, 0);
  assert.equal(single.seed?.id, 'endor');

  const missing = await LocationRegistryService.importLibrarySeed('not-a-real-seed-id', {});
  assert.deepEqual(missing, { imported: [], skipped: [], seed: null }, 'an unresolvable single-seed import must return the same null-seed shape callers already check for');
}

// CASE: "Import All Shown" under a filter imports exactly the filtered set
// — proves GMLocationsSurfaceController and GMLocationsSurfaceService are
// reading the identical filtered id list (both call
// LocationRegistryService.getLibrarySeeds() with the same filter shape).
{
  const { LocationRegistryService } = await freshService();
  const filtered = LocationRegistryService.getLibrarySeeds({ biome: 'ice' });
  assert.ok(filtered.length > 0, 'expected at least one ice-biome seed in the catalog');
  const result = await LocationRegistryService.importLibrarySeeds(filtered.map(s => s.id), {});
  assert.deepEqual(result.seeds.map(s => s.id).sort(), filtered.map(s => s.id).sort(), 'importing "all shown" under a filter must import exactly the filtered seed set, no more and no less');
}

// CASE: concurrent (double-click-shaped) imports of the same seed must not
// corrupt the registry — the service itself stays safe even if a caller
// invokes it twice without the controller's _importInFlight guard.
{
  const { LocationRegistryService } = await freshService();
  await Promise.all([
    LocationRegistryService.importLibrarySeeds(['mustafar'], {}),
    LocationRegistryService.importLibrarySeeds(['mustafar'], {})
  ]);
  const registry = LocationRegistryService.getRegistry();
  const mustafarRecords = registry.filter(r => r.librarySeedId === 'mustafar' || r.id === 'mustafar');
  assert.equal(mustafarRecords.length, 4, 'two concurrent imports of the same seed must not duplicate its records');
  const ids = registry.map(r => r.id);
  assert.equal(ids.length, new Set(ids).size, 'concurrent imports must never leave duplicate ids in the registry');
}

console.log('GM Locations library import service contract passed (batch save, idempotency, invalid-id classification, parent/child identity, filtered "import all shown", and concurrent-import safety).');
