import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Locations Stage 1 — built-in sample-planet catalog integrity.
//
// scripts/locations/location-library-seeds.js is the sole source of truth
// for the sample planets the Locations "Import Location" wizard shows a GM
// (see docs/audits/gm-locations-phase-0-functional-recovery.md Stage 1
// section — this is a static, in-memory catalog, not a Foundry compendium:
// nothing in the import path reads game.packs). Every seed's id (and every
// child's id) is used directly as the imported registry record's stable
// identity (see buildLocationLibraryRecords()/seedToLocationRecord() /
// childToLocationRecord()), so a broken catalog — a duplicate id, an id
// shared between two unrelated seeds, a category/type/scale value the
// registry doesn't recognize — corrupts import identity or silently
// coerces data via LocationRegistryService.normalizeLocation()'s
// choice()-with-fallback behavior. This test proves the catalog itself is
// sound, independent of the import machinery (covered separately by
// tests/gm-locations-library-import-service.test.mjs).

registerFoundryPathLoader();
installFoundryShimGlobals();

const { LocationRegistryService } = await import('/systems/foundryvtt-swse/scripts/locations/location-registry-service.js');
const {
  LOCATION_LIBRARY_SEEDS,
  LOCATION_LIBRARY_BIOMES,
  getLocationLibrarySeed,
  buildLocationLibraryRecords
} = await import('/systems/foundryvtt-swse/scripts/locations/location-library-seeds.js');

assert.ok(LOCATION_LIBRARY_SEEDS.length >= 40, `expected a substantial built-in catalog, found ${LOCATION_LIBRARY_SEEDS.length} seeds`);

const categoryValues = new Set(LocationRegistryService.CATEGORIES.map(c => c.value));
const typeValues = new Set(LocationRegistryService.TYPES.map(c => c.value));
const scaleValues = new Set(LocationRegistryService.SCALES.map(c => c.value));
const biomeValues = new Set(LOCATION_LIBRARY_BIOMES.map(b => b.value));

const allIds = [];
const badCategory = [];
const badType = [];
const badScale = [];
const unknownBiomes = new Set();
const missingSummary = [];
let totalChildren = 0;

for (const seed of LOCATION_LIBRARY_SEEDS) {
  assert.ok(seed.id, 'every seed must have a non-empty id');
  assert.ok(seed.name, `seed "${seed.id}" must have a non-empty name`);
  assert.ok(seed.summary, `seed "${seed.id}" must have a non-empty summary (shown in the import wizard preview card)`);
  allIds.push(seed.id);
  if (seed.category && !categoryValues.has(seed.category)) badCategory.push([seed.id, seed.category]);
  if (seed.type && !typeValues.has(seed.type)) badType.push([seed.id, seed.type]);
  if (seed.scale && !scaleValues.has(seed.scale)) badScale.push([seed.id, seed.scale]);
  for (const biome of seed.biomes || []) if (!biomeValues.has(biome)) unknownBiomes.add(biome);
  if (!seed.summary) missingSummary.push(seed.id);

  for (const child of seed.children || []) {
    totalChildren += 1;
    assert.ok(child.id, `seed "${seed.id}" has a child with no id`);
    assert.ok(child.name, `child "${child.id}" under seed "${seed.id}" must have a non-empty name`);
    allIds.push(child.id);
    if (child.category && !categoryValues.has(child.category)) badCategory.push([child.id, child.category]);
    if (child.type && !typeValues.has(child.type)) badType.push([child.id, child.type]);
    if (child.scale && !scaleValues.has(child.scale)) badScale.push([child.id, child.scale]);
    for (const biome of child.biomes || []) if (!biomeValues.has(biome)) unknownBiomes.add(biome);
  }
}

// Identity: no id collision anywhere in the catalog — a collision between
// two seeds, or a seed and an unrelated child, would make
// buildLocationLibraryRecords() silently merge two different sample
// planets into one registry record on import.
const seenIds = new Set();
const duplicateIds = [];
for (const id of allIds) {
  if (seenIds.has(id)) duplicateIds.push(id);
  seenIds.add(id);
}
assert.deepEqual(duplicateIds, [], `catalog has duplicate ids (breaks import identity): ${duplicateIds.join(', ')}`);

assert.deepEqual(badCategory, [], `catalog entries with a category not in LocationRegistryService.CATEGORIES: ${JSON.stringify(badCategory)}`);
assert.deepEqual(badType, [], `catalog entries with a type not in LocationRegistryService.TYPES: ${JSON.stringify(badType)}`);
assert.deepEqual(badScale, [], `catalog entries with a scale not in LocationRegistryService.SCALES: ${JSON.stringify(badScale)}`);
assert.deepEqual([...unknownBiomes].sort(), [], `catalog entries reference biome tag(s) not declared in LOCATION_LIBRARY_BIOMES (they still import, but can never be selected via the biome filter pills, and display their raw slug instead of a real label): ${[...unknownBiomes].sort().join(', ')}`);
assert.deepEqual(missingSummary, [], `seed(s) missing a summary: ${missingSummary.join(', ')}`);

// Generated-record shape: buildLocationLibraryRecords() must produce
// exactly one parent record per seed plus one record per declared child,
// every child correctly parented, and no accidental cross-seed leakage.
for (const seed of LOCATION_LIBRARY_SEEDS.slice(0, 5).concat(LOCATION_LIBRARY_SEEDS.slice(-5))) {
  const records = buildLocationLibraryRecords(seed.id, {});
  assert.equal(records.length, 1 + (seed.children?.length || 0), `buildLocationLibraryRecords("${seed.id}") should produce one parent + ${seed.children?.length || 0} child record(s)`);
  const [parent, ...children] = records;
  assert.equal(parent.id, seed.id, `parent record id must equal the seed id for "${seed.id}"`);
  assert.equal(parent.parentLocationId, '', `a top-level seed's generated parent record must have no parentLocationId ("${seed.id}")`);
  for (const child of children) {
    assert.equal(child.parentLocationId, seed.id, `child "${child.id}" must be parented to seed "${seed.id}"`);
    assert.equal(child.librarySeedId, seed.id, `child "${child.id}" must carry provenance back to seed "${seed.id}"`);
  }
}

// getLocationLibrarySeed() must resolve every catalog id (case-insensitive) —
// this is the same lookup importLibrarySeeds() uses per requested id.
for (const seed of LOCATION_LIBRARY_SEEDS) {
  assert.ok(getLocationLibrarySeed(seed.id), `getLocationLibrarySeed("${seed.id}") must resolve`);
  assert.ok(getLocationLibrarySeed(seed.id.toUpperCase()), `getLocationLibrarySeed() must be case-insensitive for "${seed.id}"`);
}
assert.equal(getLocationLibrarySeed('definitely-not-a-real-seed-id'), null, 'an unknown seed id must resolve to null, not throw');

console.log(`GM Locations library catalog contract passed (${LOCATION_LIBRARY_SEEDS.length} seeds, ${totalChildren} children, ${allIds.length} unique ids, ${biomeValues.size} declared biomes).`);
