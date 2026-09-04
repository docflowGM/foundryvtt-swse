/**
 * PHASE 8D-2 foundation — procedural planet population distribution.
 *
 * HARD RULE (explicit spec requirement): a brand-new, procedurally
 * GENERATED planet must NEVER default to
 * `location-population-profile.js`'s `GENERIC_GALACTIC_FALLBACK_POPULATION_PROFILE`
 * (Human 70% + six contextually generic supported Species at 5% each).
 * That fallback exists for a real, KNOWN Location Library world that
 * genuinely has no curated census data — it is not a general-purpose
 * "planet has no population" default. A fictional world instead rolls a
 * population CHARACTER (reusing `location-population-profile.js`'s own
 * `POPULATION_DIVERSITY` vocabulary — `homogeneous`/`strongly-dominant`/
 * `dominant`/`mixed`/`cosmopolitan` — rather than inventing a second
 * one) and then builds a REAL weighted distribution from whatever
 * candidate species pool the caller supplies, exactly like
 * `population-profile.js`'s existing "species ids are always
 * caller-supplied, e.g. from `SpeciesRegistry.getAll()`" discipline —
 * this module never imports `SpeciesRegistry` itself. Because the
 * dominant species is picked UNIFORMLY from that pool (never
 * Human-weighted), a non-Human species can dominate just as easily as
 * Human can.
 */

import { createLocationPopulationProfile, POPULATION_DIVERSITY } from '../location-population-profile.js';
import { pickRandom, weightedPick, randomIntInclusive } from '../lib/weighted-random.js';

const POPULATION_CHARACTERS = Object.freeze(Object.values(POPULATION_DIVERSITY));

export function isPopulationCharacter(value) {
  return POPULATION_CHARACTERS.includes(value);
}

/**
 * CORRECTED (Phase 8D-2 independent review, round 1): population
 * generation previously ran unconditionally regardless of the world
 * class's `habitable` flag, so a volcanic/barren/gas-giant world could
 * receive an ordinary 100%-weighted organic population identical to a
 * temperate world. `POPULATION_SCALE` fixes that by rolling density
 * FIRST -- including a genuine `UNINHABITED` state, which short-
 * circuits demographics generation entirely (see
 * `generateProceduralPlanetPopulationProfile()` below) rather than
 * "just" making it less likely.
 */
export const POPULATION_SCALE = Object.freeze({
  UNINHABITED: 'uninhabited',
  OUTPOST: 'outpost',
  SMALL_SETTLEMENT: 'small-settlement',
  SETTLED: 'settled',
  POPULOUS: 'populous',
  HYPER_URBANIZED: 'hyper-urbanized'
});

const POPULATION_SCALES = Object.freeze(Object.values(POPULATION_SCALE));

export function isPopulationScale(value) {
  return POPULATION_SCALES.includes(value);
}

/** Weight table used when `worldClass.habitable` is true (or omitted) -- uninhabited stays possible (an empty, forgotten world) but rare. */
const HABITABLE_SCALE_ENTRIES = Object.freeze([
  { value: POPULATION_SCALE.UNINHABITED, weight: 1 },
  { value: POPULATION_SCALE.OUTPOST, weight: 3 },
  { value: POPULATION_SCALE.SMALL_SETTLEMENT, weight: 4 },
  { value: POPULATION_SCALE.SETTLED, weight: 5 },
  { value: POPULATION_SCALE.POPULOUS, weight: 3 },
  { value: POPULATION_SCALE.HYPER_URBANIZED, weight: 1 }
]);

/**
 * Weight table used when `worldClass.habitable` is false -- strongly
 * biased toward `UNINHABITED`/`OUTPOST` (a research station or mining
 * outpost on a barren/volcanic/gas-giant world is thematically
 * reasonable; an ordinary settled population is not), never zeroed
 * out entirely (a hardy fringe colony staying possible, just rare).
 */
const UNINHABITABLE_SCALE_ENTRIES = Object.freeze([
  { value: POPULATION_SCALE.UNINHABITED, weight: 10 },
  { value: POPULATION_SCALE.OUTPOST, weight: 5 },
  { value: POPULATION_SCALE.SMALL_SETTLEMENT, weight: 1 },
  { value: POPULATION_SCALE.SETTLED, weight: 0.3 },
  { value: POPULATION_SCALE.POPULOUS, weight: 0.05 },
  { value: POPULATION_SCALE.HYPER_URBANIZED, weight: 0 }
]);

const POPULATION_ESTIMATE_LABEL = Object.freeze({
  [POPULATION_SCALE.UNINHABITED]: 'no permanent population',
  [POPULATION_SCALE.OUTPOST]: 'fewer than 100',
  [POPULATION_SCALE.SMALL_SETTLEMENT]: 'hundreds to low thousands',
  [POPULATION_SCALE.SETTLED]: 'thousands to millions',
  [POPULATION_SCALE.POPULOUS]: 'millions to billions',
  [POPULATION_SCALE.HYPER_URBANIZED]: 'billions or more'
});

/** Pick a random population-scale entry, biased by `habitable` (see the two weight tables above). */
export function pickPopulationScale({ rng, habitable = true } = {}) {
  const entries = habitable === false ? UNINHABITABLE_SCALE_ENTRIES : HABITABLE_SCALE_ENTRIES;
  return weightedPick(entries, { rng })?.value ?? POPULATION_SCALE.SETTLED;
}

/** A short human-readable population-count band for a given scale. Never a precise number -- this is flavor, not a census. */
export function describePopulationEstimate(scale) {
  return POPULATION_ESTIMATE_LABEL[scale] ?? POPULATION_ESTIMATE_LABEL[POPULATION_SCALE.SETTLED];
}

/** Default relative likelihood of each character when the caller doesn't force one — extremes (fully homogeneous / fully cosmopolitan) are rarer than the middle bands. */
const DEFAULT_CHARACTER_ENTRIES = Object.freeze([
  { value: POPULATION_DIVERSITY.HOMOGENEOUS, weight: 2 },
  { value: POPULATION_DIVERSITY.STRONGLY_DOMINANT, weight: 3 },
  { value: POPULATION_DIVERSITY.DOMINANT, weight: 4 },
  { value: POPULATION_DIVERSITY.MIXED, weight: 4 },
  { value: POPULATION_DIVERSITY.COSMOPOLITAN, weight: 2 }
]);

/** The dominant species' weight range for each rolled character. */
export const CHARACTER_DOMINANT_WEIGHT_RANGE = Object.freeze({
  [POPULATION_DIVERSITY.HOMOGENEOUS]: { min: 90, max: 98 },
  [POPULATION_DIVERSITY.STRONGLY_DOMINANT]: { min: 80, max: 89 },
  [POPULATION_DIVERSITY.DOMINANT]: { min: 60, max: 79 },
  [POPULATION_DIVERSITY.MIXED]: { min: 35, max: 59 },
  [POPULATION_DIVERSITY.COSMOPOLITAN]: { min: 15, max: 34 }
});

function pickUniqueN(pool, n, rng) {
  const copy = pool.slice();
  const out = [];
  const roll = rng ?? Math.random;
  for (let i = 0; i < n && copy.length; i++) {
    const index = Math.min(Math.floor(roll() * copy.length), copy.length - 1);
    out.push(copy.splice(index, 1)[0]);
  }
  return out;
}

/** Split `total` into `count` positive integer shares that sum EXACTLY to `total`, each randomized but never below 1. */
function splitIntoRandomShares(count, total, rng) {
  if (count <= 0 || total <= 0) return [];
  if (count === 1) return [total];
  const roll = rng ?? Math.random;
  const raw = Array.from({ length: count }, () => 0.2 + roll());
  const sum = raw.reduce((a, b) => a + b, 0);
  const shares = raw.map((w) => Math.max(1, Math.round((w / sum) * total)));
  let diff = total - shares.reduce((a, b) => a + b, 0);
  let i = 0;
  while (diff !== 0 && i < 10000) {
    const index = i % shares.length;
    if (diff > 0) { shares[index] += 1; diff -= 1; } else if (shares[index] > 1) { shares[index] -= 1; diff += 1; }
    i += 1;
  }
  return shares;
}

/** Pick a random population character (see module doc). */
export function pickPopulationCharacter({ rng } = {}) {
  return weightedPick(DEFAULT_CHARACTER_ENTRIES, { rng })?.value ?? POPULATION_DIVERSITY.MIXED;
}

/**
 * Generate a procedural Location population profile for a brand-new
 * fictional world. Returns `{ profile, character, dominantSpeciesId }`
 * where `profile` is a normal `createLocationPopulationProfile()`
 * record (same shape `location-population-profile.js` produces
 * everywhere else) with `fallbackUsed: false` and
 * `sourceKind: 'procedural-generated'` — this is a real generated
 * distribution, not a fallback.
 *
 * @param {object} [options]
 * @param {string[]} options.availableSpeciesIds - REQUIRED candidate
 *   pool (caller-supplied, e.g. from `SpeciesRegistry.getAll()`). An
 *   empty pool returns an empty-but-valid profile rather than silently
 *   substituting the generic galactic fallback.
 * @param {string} [options.characterOverride] - force a specific
 *   `POPULATION_DIVERSITY` value instead of rolling one.
 * @param {string} [options.dominantSpeciesIdOverride] - force which
 *   species dominates instead of picking uniformly from the pool.
 * @param {boolean} [options.habitable] - the rolled `WORLD_CLASS`
 *   entry's own `habitable` flag (default true). Biases the
 *   `populationScale` roll heavily toward `UNINHABITED`/`OUTPOST` when
 *   false -- see `UNINHABITABLE_SCALE_ENTRIES` above.
 * @param {string} [options.populationScaleOverride] - force a specific
 *   `POPULATION_SCALE` value instead of rolling one.
 * @param {() => number} [options.rng]
 */
export function generateProceduralPlanetPopulationProfile({
  availableSpeciesIds = [],
  characterOverride = '',
  dominantSpeciesIdOverride = '',
  habitable = true,
  populationScaleOverride = '',
  rng
} = {}) {
  const populationScale = isPopulationScale(populationScaleOverride) ? populationScaleOverride : pickPopulationScale({ rng, habitable });
  const populationEstimate = describePopulationEstimate(populationScale);

  if (populationScale === POPULATION_SCALE.UNINHABITED) {
    return {
      profile: createLocationPopulationProfile({
        sourceKind: 'procedural-generated',
        fallbackUsed: false,
        notes: ['This world was rolled as uninhabited -- demographics intentionally left empty, not a missing-data placeholder.']
      }),
      character: null,
      dominantSpeciesId: null,
      populationScale,
      populationEstimate
    };
  }

  const pool = (Array.isArray(availableSpeciesIds) ? availableSpeciesIds : []).filter(Boolean);
  if (!pool.length) {
    return {
      profile: createLocationPopulationProfile({
        sourceKind: 'procedural-generated',
        fallbackUsed: false,
        notes: ['No candidate species pool was supplied for this procedurally generated world; population profile left empty rather than defaulting to the generic galactic fallback.']
      }),
      character: POPULATION_DIVERSITY.COSMOPOLITAN,
      dominantSpeciesId: null,
      populationScale,
      populationEstimate
    };
  }
  const character = isPopulationCharacter(characterOverride) ? characterOverride : pickPopulationCharacter({ rng });
  const range = CHARACTER_DOMINANT_WEIGHT_RANGE[character];
  const dominantSpeciesId = pool.includes(dominantSpeciesIdOverride) ? dominantSpeciesIdOverride : pickRandom(pool, { rng });
  const dominantWeight = randomIntInclusive(range.min, range.max, { rng });
  const remainderPool = pool.filter((id) => id !== dominantSpeciesId);
  const remainderWeight = 100 - dominantWeight;
  const speciesWeights = [{ speciesId: dominantSpeciesId, weight: dominantWeight }];
  if (remainderPool.length && remainderWeight > 0) {
    // Each minority species needs at least weight 1, so the count can
    // never exceed remainderWeight itself -- otherwise no integer split
    // summing exactly to remainderWeight exists.
    const minorityCount = Math.min(remainderPool.length, remainderWeight, randomIntInclusive(1, Math.min(5, remainderPool.length), { rng }));
    const minoritySpecies = pickUniqueN(remainderPool, minorityCount, rng);
    const shares = splitIntoRandomShares(minoritySpecies.length, remainderWeight, rng);
    minoritySpecies.forEach((speciesId, index) => speciesWeights.push({ speciesId, weight: shares[index] }));
  } else {
    speciesWeights[0] = { speciesId: dominantSpeciesId, weight: 100 };
  }
  const profile = createLocationPopulationProfile({
    speciesWeights,
    sourceKind: 'procedural-generated',
    fallbackUsed: false,
    fallbackTemplate: '',
    notes: [`Procedurally generated ${character} population distribution for a new fictional world -- not the generic galactic fallback and not a lore census.`]
  });
  return { profile, character, dominantSpeciesId, populationScale, populationEstimate };
}
