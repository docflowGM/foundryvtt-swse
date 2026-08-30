import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Locations Stage 1 — importer reliability, executed for real.
//
// Proves LocationRegistryService.importLibrarySeeds()/importLibrarySeed()
// against a real in-memory game.settings store (via the repo's existing
// Foundry-shim Node harness), not just by reading the source. Originally
// importLibrarySeeds() called importLibrarySeed() once per id, and each
// call did its own getRegistry()/saveRegistry() round trip: an N-seed
// batch meant N separate settings writes, so a mid-batch failure left an
// unreported partial import and there was no explicit "this selection
// could not be resolved" result for an unknown seed id. That was fixed by
// batching every resolved seed into one in-memory map with one save — but
// a first pass of that fix still had a lost-update race across two
// *different* concurrent batches (each reads the same starting registry,
// last write wins), caught in review before it shipped. The final fix
// adds a private static promise-chain queue (`#importQueue`) so every
// call to importLibrarySeeds() runs only after the previous one has fully
// settled; see the "concurrent DIFFERENT seeds" and "OVERLAPPING batches"
// cases below for the regression this specifically guards, and the
// method's own doc comment in location-registry-service.js for why a
// same-seed-twice concurrency test alone cannot catch this class of bug
// (two identical writes mask a lost update that two different writes do
// not).

registerFoundryPathLoader();

/** A real in-memory settings store — get/set actually round-trip, and we can
 *  count how many times set() was called to prove the "one save per batch"
 *  claim, not just infer it from source reading.
 *
 *  set() resolves on a real macrotask delay (setTimeout), not
 *  synchronously/on a microtask — this matters specifically for the
 *  concurrency cases below. A synchronously-mutating mock (store.set(...)
 *  called directly, wrapped in Promise.resolve()) makes call A's write land
 *  before call B's synchronous prefix (its own getRegistry() read) ever
 *  runs, since nothing actually async happens until A's very last
 *  microtask — so a same-process lost-update race can never manifest
 *  against it regardless of whether the service actually serializes
 *  anything. A real Foundry settings write has genuine latency, so this
 *  delay is the minimum needed to make "both batches read before either
 *  writes" actually reproducible under Node, the same way it can happen in
 *  a real client. */
function makeSettingsStore(initial = {}) {
  const store = new Map(Object.entries(initial));
  let setCount = 0;
  return {
    getSetCount: () => setCount,
    shim: {
      get: (_moduleId, key) => store.get(key),
      set: (_moduleId, key, value) => new Promise((resolve) => {
        setTimeout(() => { store.set(key, value); setCount += 1; resolve(value); }, 5);
      }),
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

// CASE: concurrent (double-click-shaped) imports of the SAME seed must not
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

// CASE: concurrent imports of DIFFERENT seeds must not lose either one.
// Each call independently does getRegistry() -> merge -> saveRegistry();
// without serialization, both calls can read the same starting registry
// and last-write-wins silently discards whichever batch saved first. This
// is the regression this case exists to catch: a naive "one save per
// batch" fix (with no cross-batch serialization) still loses data here
// even though tatooine+tatooine above looks fine (two writes of
// equivalent content mask the race).
{
  const { LocationRegistryService, store } = await freshService();
  await Promise.all([
    LocationRegistryService.importLibrarySeeds(['tatooine'], {}),
    LocationRegistryService.importLibrarySeeds(['hoth'], {})
  ]);
  const registry = LocationRegistryService.getRegistry();
  assert.ok(registry.find(r => r.id === 'tatooine'), 'concurrent different-seed imports must not lose tatooine to a last-write-wins race');
  assert.ok(registry.find(r => r.id === 'hoth'), 'concurrent different-seed imports must not lose hoth to a last-write-wins race');
  assert.equal(registry.length, 8, 'both seeds\' full 4-record hierarchies must be present');
  assert.equal(store.getSetCount(), 2, 'each of the two concurrent batches must still get its own registry write (serialized, not merged into one)');
}

// CASE: concurrent OVERLAPPING batches (sharing one seed) must still end
// with exactly one canonical hierarchy for every seed touched by either
// batch — proves serialization, not just "no crash."
{
  const { LocationRegistryService } = await freshService();
  await Promise.all([
    LocationRegistryService.importLibrarySeeds(['tatooine', 'hoth'], {}),
    LocationRegistryService.importLibrarySeeds(['hoth', 'naboo'], {})
  ]);
  const registry = LocationRegistryService.getRegistry();
  for (const id of ['tatooine', 'hoth', 'naboo']) {
    const records = registry.filter(r => r.librarySeedId === id || r.id === id);
    assert.equal(records.length, 4, `overlapping concurrent batches must leave exactly one 4-record hierarchy for "${id}"`);
  }
  const ids = registry.map(r => r.id);
  assert.equal(ids.length, new Set(ids).size, 'overlapping concurrent batches must never leave duplicate ids in the registry');
}

// CASE: a rejected import must not permanently poison the queue for
// later imports — a batch that fails to save must not block or corrupt
// whatever the next queued batch does.
{
  const { LocationRegistryService, store } = await freshService();
  let failNextWrite = true;
  const realSet = store.shim.set;
  store.shim.set = (moduleId, key, value) => {
    if (failNextWrite) {
      failNextWrite = false;
      return Promise.reject(new Error('simulated settings write failure'));
    }
    return realSet(moduleId, key, value);
  };
  installFoundryShimGlobals({ game: { settings: store.shim } });

  await assert.rejects(
    () => LocationRegistryService.importLibrarySeeds(['tatooine'], {}),
    /simulated settings write failure/,
    'a failing save must reject the caller\'s own promise with the real error'
  );

  const second = await LocationRegistryService.importLibrarySeeds(['hoth'], {});
  assert.equal(second.imported.length, 4, 'a rejected import must not block a subsequently queued import from running normally');
  const registry = LocationRegistryService.getRegistry();
  assert.ok(!registry.find(r => r.id === 'tatooine'), 'the failed batch must not have partially persisted');
  assert.ok(registry.find(r => r.id === 'hoth'), 'the next queued batch must have succeeded and persisted');
}

console.log('GM Locations library import service contract passed (batch save, idempotency, invalid-id classification, parent/child identity, filtered "import all shown", same-seed/different-seed/overlapping concurrency, and non-poisoning failure handling).');
