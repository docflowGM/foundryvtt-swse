/**
 * PHASE 8D-1 addendum — Location demographic profiles + hierarchy
 * resolution.
 *
 * "Location demographics describe who lives here." Kept a strictly
 * separate concern from `population-profile.js` ("Faction demographics
 * describe who belongs to this organization") and from
 * `recruitment-profile.js` ("locality bias describes how strongly one
 * should influence the other").
 *
 * Population data lives in `data/location-population-profiles.js`,
 * keyed by the exact `LOCATION_LIBRARY_SEEDS[].id` from
 * `location-library-seeds.js` (confirmed: all 50 keys match a real
 * top-level seed id). This module does NOT touch the canonical Location
 * schema at all — `LocationRegistryService.normalizeLocation()` has no
 * `populationProfile` field, and this pass does not add one. Instead,
 * resolution keys off the `librarySeedId` a real, committed Location
 * record already carries when it was imported from the Library
 * (`seedToLocationRecord()`/`childToLocationRecord()` in
 * `location-library-seeds.js` both stamp it) — no new Location
 * hierarchy authority, no duplicated cycle validation: the walk below
 * is a plain read of `parentLocationId`, the same field
 * `LocationRegistryService.upsertLocation()` already validates at write
 * time, with only a defensive `seen`-set guard against a pathological
 * chain (real data can't produce a cycle; this never REJECTS anything,
 * it only stops walking).
 *
 * Precedence when resolving demographics for one Location: (1) that
 * Location's own `librarySeedId` profile if it has one, else (2) walk
 * up `parentLocationId` checking each ancestor's `librarySeedId`, else
 * (3) `GENERIC_GALACTIC_FALLBACK_POPULATION_PROFILE`. This is a
 * read-only, best-effort demographic BIAS for generation — never a
 * literal census assertion (see the data file's own header comment for
 * the fold-to-human policy that was already applied before this module
 * ever sees the numbers).
 */

import { LOCATION_POPULATION_PROFILES_BY_SEED_ID } from './data/location-population-profiles.js';
import { weightedPick } from './lib/weighted-random.js';

export const POPULATION_DIVERSITY = Object.freeze({
  HOMOGENEOUS: 'homogeneous',
  STRONGLY_DOMINANT: 'strongly-dominant',
  DOMINANT: 'dominant',
  MIXED: 'mixed',
  COSMOPOLITAN: 'cosmopolitan'
});

function cleanStringArray(value) {
  return Array.isArray(value) ? value.map((entry) => String(entry ?? '').trim()).filter(Boolean) : [];
}

function cleanSpeciesWeights(value) {
  return (Array.isArray(value) ? value : [])
    .map((entry) => ({ speciesId: String(entry?.speciesId ?? '').trim(), weight: Math.max(0, Number(entry?.weight) || 0) }))
    .filter((entry) => entry.speciesId && entry.weight > 0);
}

/**
 * Categorical diversity label derived from the single highest species
 * weight — descriptive only, never itself fed back into generation
 * (`speciesWeights` is what `selectSpeciesForLocation()` actually
 * rolls against). Bands per the design phase's own guidance:
 * homogeneous ~95%+, strongly-dominant ~80-90%, dominant ~60-75%,
 * mixed ~35-55%, cosmopolitan below that (no strong majority).
 */
function deriveDiversity(speciesWeights) {
  if (!speciesWeights.length) return POPULATION_DIVERSITY.COSMOPOLITAN;
  const top = Math.max(...speciesWeights.map((entry) => entry.weight));
  if (top >= 90) return POPULATION_DIVERSITY.HOMOGENEOUS;
  if (top >= 80) return POPULATION_DIVERSITY.STRONGLY_DOMINANT;
  if (top >= 60) return POPULATION_DIVERSITY.DOMINANT;
  if (top >= 35) return POPULATION_DIVERSITY.MIXED;
  return POPULATION_DIVERSITY.COSMOPOLITAN;
}

/** Species at or above half the top weight (min 25) — always at least the single highest. */
function deriveDominantSpeciesIds(speciesWeights) {
  if (!speciesWeights.length) return [];
  const max = Math.max(...speciesWeights.map((entry) => entry.weight));
  const threshold = Math.max(25, max * 0.5);
  const dominant = speciesWeights.filter((entry) => entry.weight >= threshold).map((entry) => entry.speciesId);
  if (dominant.length) return dominant;
  return [speciesWeights.reduce((a, b) => (a.weight >= b.weight ? a : b)).speciesId];
}

/**
 * Normalize a raw Location population profile. `nativeSpeciesIds` is
 * distinct from `dominantSpeciesIds` (a species may be indigenous but
 * no longer the numeric majority) — this data pass does not populate
 * it (no source data for it was curated), so it stays an empty array
 * unless a caller explicitly supplies one (e.g. future GM/lore
 * curation).
 */
export function createLocationPopulationProfile({
  speciesWeights = [],
  nativeSpeciesIds = [],
  sourceKind = '',
  sourceSite = '',
  sourcePage = '',
  sourceEdition = '',
  sourceDemographics = [],
  fallbackUsed = false,
  fallbackTemplate = '',
  notes = [],
  ...extra
} = {}) {
  const cleanWeights = cleanSpeciesWeights(speciesWeights);
  return {
    speciesWeights: cleanWeights,
    dominantSpeciesIds: deriveDominantSpeciesIds(cleanWeights),
    nativeSpeciesIds: cleanStringArray(nativeSpeciesIds),
    diversity: deriveDiversity(cleanWeights),
    sourceKind: String(sourceKind || ''),
    sourceSite: String(sourceSite || ''),
    sourcePage: String(sourcePage || ''),
    sourceEdition: String(sourceEdition || ''),
    sourceDemographics: Array.isArray(sourceDemographics) ? sourceDemographics : [],
    fallbackUsed: Boolean(fallbackUsed),
    fallbackTemplate: String(fallbackTemplate || ''),
    notes: cleanStringArray(notes),
    // Preserve any of the per-entry special-case fields the source data
    // carries (historicalContext, eraSensitive, approximationUsed,
    // sourcePercentRange, sourcePercentTotal,
    // generatorNormalizationApplied, sourceCounts,
    // sourcePopulationStatus) verbatim for GM-facing transparency,
    // without hardcoding their names here.
    ...extra
  };
}

/**
 * The project procedural fallback (Human 70% + six contextually generic
 * supported Species at 5% each) used only when no Location in a chain
 * carries a population profile at all. NOT a lore census.
 */
export const GENERIC_GALACTIC_FALLBACK_POPULATION_PROFILE = createLocationPopulationProfile({
  speciesWeights: [
    { speciesId: 'species-human', weight: 70 },
    { speciesId: 'species-duros', weight: 5 },
    { speciesId: 'species-rodian', weight: 5 },
    { speciesId: 'species-twi-lek', weight: 5 },
    { speciesId: 'species-zabrak', weight: 5 },
    { speciesId: 'species-mirialan', weight: 5 },
    { speciesId: 'species-sullustan', weight: 5 }
  ],
  sourceKind: 'generic-galactic-fallback',
  fallbackUsed: true,
  fallbackTemplate: 'human-70-six-contextual-supported-species-at-5-each',
  notes: ['No Location Library seed or ancestor in the resolution chain carries a population profile; using the project generic galactic fallback, not a lore census.']
});

/** Direct lookup by Location Library seed id. Returns null if no profile is curated for that seed. */
export function getPopulationProfileForSeedId(seedId) {
  const raw = LOCATION_POPULATION_PROFILES_BY_SEED_ID[String(seedId || '').trim()];
  return raw ? createLocationPopulationProfile(raw) : null;
}

/**
 * Resolve a population profile for one Location record given an
 * already-fetched `registry` array (pure, testable without Foundry —
 * the Foundry-dependent read lives in `resolveLocationPopulationProfile()`
 * below). Walks `parentLocationId` from `locationRecord` upward,
 * returning the first ancestor (including itself) whose `librarySeedId`
 * has a curated profile; falls back to the generic galactic profile if
 * none does.
 */
export function getPopulationProfileForLocation(locationRecord, registry = []) {
  const byId = new Map((Array.isArray(registry) ? registry : []).map((record) => [record.id, record]));
  const seen = new Set();
  let current = locationRecord;
  while (current) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    if (current.librarySeedId) {
      const profile = getPopulationProfileForSeedId(current.librarySeedId);
      if (profile) return { profile, resolvedFromLocationId: current.id, resolvedFromLocationName: current.name || '' };
    }
    current = current.parentLocationId ? byId.get(current.parentLocationId) || null : null;
  }
  return { profile: GENERIC_GALACTIC_FALLBACK_POPULATION_PROFILE, resolvedFromLocationId: null, resolvedFromLocationName: '' };
}

/**
 * Read-only convenience wrapper: resolve a population profile straight
 * from a real, canonical Location id via `LocationRegistryService`.
 * This is the one Foundry-dependent function in this module (needs
 * `game.settings`); everything above is pure.
 */
export async function resolveLocationPopulationProfile(locationId) {
  const id = String(locationId || '').trim();
  if (!id) return { profile: GENERIC_GALACTIC_FALLBACK_POPULATION_PROFILE, resolvedFromLocationId: null, resolvedFromLocationName: '' };
  const { LocationRegistryService } = await import('../locations/location-registry-service.js');
  const registry = LocationRegistryService.getRegistry();
  const current = registry.find((record) => record.id === id) || null;
  if (!current) return { profile: GENERIC_GALACTIC_FALLBACK_POPULATION_PROFILE, resolvedFromLocationId: null, resolvedFromLocationName: '' };
  return getPopulationProfileForLocation(current, registry);
}

/** Weighted-pick a species id out of a Location population profile's speciesWeights. */
export function selectSpeciesForLocation(populationProfile, { rng } = {}) {
  const picked = weightedPick(populationProfile?.speciesWeights ?? [], { rng, weightOf: (entry) => entry.weight });
  return picked ? picked.speciesId : null;
}
