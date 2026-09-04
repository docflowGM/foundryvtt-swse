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
 * this module never imports `SpeciesRegistry` itself.
 *
 * PHASE 8D-3A production tuning (supersedes one round-1 design note):
 * round 1 picked the dominant species UNIFORMLY from the pool "so a
 * non-Human species can dominate just as easily as Human can." The
 * production spec explicitly asks for a DIFFERENT, more plausible
 * distribution: Human common (not universally dominant, not merely
 * equal-weighted), other galactically-widespread Species (Twi'lek,
 * Rodian, Duros, Bothan, Zabrak, Mon Calamari, Sullustan, Quarren, ...)
 * meaningfully likely, and genuinely exotic/rare Species uncommon as
 * DOMINANT populations without being impossible. `SPECIES_GENERATOR_PREVALENCE`
 * below is that weighting -- see its own doc comment for why it's
 * generator-only flavor, never a manual second Species list or a lore
 * claim.
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

/**
 * PHASE 8D-3A: the NUMERIC range each `POPULATION_SCALE` band spans,
 * for `rollPopulationEstimateNumeric()` below -- approximate order-of-
 * magnitude bounds only, never exact/authoritative, and deliberately
 * generous enough to overlap neighboring bands' plausible edges (real
 * settlements don't snap to clean powers of ten).
 */
const POPULATION_ESTIMATE_RANGE = Object.freeze({
  [POPULATION_SCALE.UNINHABITED]: null,
  [POPULATION_SCALE.OUTPOST]: { min: 5, max: 99 },
  [POPULATION_SCALE.SMALL_SETTLEMENT]: { min: 100, max: 9999 },
  [POPULATION_SCALE.SETTLED]: { min: 10000, max: 49999999 },
  [POPULATION_SCALE.POPULOUS]: { min: 50000000, max: 7999999999 },
  [POPULATION_SCALE.HYPER_URBANIZED]: { min: 8000000000, max: 60000000000 }
});

/**
 * `WORLD_CLASS`'s optional `populationBias` (`'dense'`/`'sparse'`/`''`)
 * softly skews `pickPopulationScale()` toward the denser or sparser end
 * of whichever weight table (`HABITABLE_SCALE_ENTRIES`/
 * `UNINHABITABLE_SCALE_ENTRIES`) `habitable` already selected -- it
 * NEVER zeroes out a value or introduces a hard requirement (an
 * `urban-ecumenopolis` world can still occasionally roll `outpost`,
 * just less often), matching the phase's own "context-sensitive
 * weighting, not deterministic stereotypes" instruction. `SCALE_DENSITY_INDEX`
 * orders the six scales from sparsest (0) to densest (5); the boost
 * scales with how far a given entry already sits from the midpoint in
 * the biased direction, so `HYPER_URBANIZED` gets boosted more than
 * `POPULOUS` under a `'dense'` bias, and `UNINHABITED` more than
 * `OUTPOST` under `'sparse'`.
 */
const SCALE_DENSITY_INDEX = Object.freeze({
  [POPULATION_SCALE.UNINHABITED]: 0,
  [POPULATION_SCALE.OUTPOST]: 1,
  [POPULATION_SCALE.SMALL_SETTLEMENT]: 2,
  [POPULATION_SCALE.SETTLED]: 3,
  [POPULATION_SCALE.POPULOUS]: 4,
  [POPULATION_SCALE.HYPER_URBANIZED]: 5
});

function applyDensityBias(entries, densityBias) {
  if (densityBias !== 'dense' && densityBias !== 'sparse') return entries;
  const direction = densityBias === 'dense' ? 1 : -1;
  return entries.map((entry) => {
    const distanceFromMid = SCALE_DENSITY_INDEX[entry.value] - 2.5;
    const multiplier = 1 + Math.max(0, direction * distanceFromMid) * 0.35;
    return { value: entry.value, weight: entry.weight * multiplier };
  });
}

/**
 * Pick a random population-scale entry, biased by `habitable` (see the
 * two weight tables above) and optionally further softly skewed by
 * `densityBias` (`'dense'`/`'sparse'`, typically a rolled
 * `WORLD_CLASS.populationBias` -- see `applyDensityBias()`).
 */
export function pickPopulationScale({ rng, habitable = true, densityBias = '' } = {}) {
  const baseEntries = habitable === false ? UNINHABITABLE_SCALE_ENTRIES : HABITABLE_SCALE_ENTRIES;
  const entries = applyDensityBias(baseEntries, densityBias);
  return weightedPick(entries, { rng })?.value ?? POPULATION_SCALE.SETTLED;
}

/** A short human-readable population-count band for a given scale. Never a precise number -- this is flavor, not a census. */
export function describePopulationEstimate(scale) {
  return POPULATION_ESTIMATE_LABEL[scale] ?? POPULATION_ESTIMATE_LABEL[POPULATION_SCALE.SETTLED];
}

/**
 * PHASE 8D-3A: roll a single APPROXIMATE numeric population estimate
 * that stays inside the selected scale's band (see
 * `POPULATION_ESTIMATE_RANGE`), deterministic when `rng` is injected.
 * Returns `0` for `UNINHABITED` (never `null` -- a caller doing
 * arithmetic on this shouldn't have to null-check a scale-driven zero).
 * This is explicitly a GENERATE-tier procedural flavor number, never
 * presented as a canon census -- `formatPopulationEstimateNumeric()`
 * below renders it back into approximate prose ("4.8 billion") for
 * exactly that reason.
 */
export function rollPopulationEstimateNumeric(scale, { rng } = {}) {
  const range = POPULATION_ESTIMATE_RANGE[scale];
  if (!range) return 0;
  return randomIntInclusive(range.min, range.max, { rng });
}

/** Render a numeric population estimate as approximate short prose (e.g. `4.8 billion`, `320`, `12 thousand`). Never claims exactness. */
export function formatPopulationEstimateNumeric(n) {
  if (!Number.isFinite(n) || n <= 0) return 'no permanent population';
  const tiers = [
    { at: 1e9, label: 'billion' },
    { at: 1e6, label: 'million' },
    { at: 1e3, label: 'thousand' }
  ];
  for (const tier of tiers) {
    if (n >= tier.at) return `approximately ${(n / tier.at).toFixed(1).replace(/\.0$/, '')} ${tier.label}`;
  }
  return `approximately ${n}`;
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

/**
 * PHASE 8D-3A production tuning — a GENERATOR-ONLY prevalence weighting
 * manifest, explicitly NOT a lore/canon authority and NOT a second
 * Species registry: it holds nothing but a relative pick-weight per
 * SPECIES NAME (lowercased), used ONLY to bias which species from the
 * caller-supplied pool is more likely to be rolled as DOMINANT on a
 * brand-new procedural world. Every actual Species fact (ability
 * scores, size, traits, ...) still comes exclusively from
 * `SpeciesRegistry` -- this manifest never invents a species, and any
 * species absent from it (a homebrew/rare/exotic entry, or simply one
 * this manifest doesn't happen to list) still participates fully in
 * generation at the `DEFAULT_PREVALENCE_WEIGHT` baseline, never
 * excluded. Matched against `speciesNameFor()`'s resolved lowercase
 * name when the caller's pool entries carry one (an object shape
 * `{ id, name }`, e.g. straight from `SpeciesRegistry.getAll()`); a
 * caller that only supplies bare id strings (this module's original,
 * still-fully-supported contract) gets neutral/uniform weighting
 * exactly as before, since there is no name to match against.
 */
const SPECIES_GENERATOR_PREVALENCE = Object.freeze({
  human: 8,
  "twi'lek": 4,
  twilek: 4,
  rodian: 4,
  duros: 4,
  bothan: 4,
  zabrak: 4,
  'mon calamari': 3,
  moncalamari: 3,
  sullustan: 3,
  quarren: 3,
  wookiee: 3,
  trandoshan: 3,
  gran: 3,
  ithorian: 3,
  nautolan: 3,
  chiss: 2,
  mirialan: 2,
  togruta: 2,
  'kel dor': 2,
  keldor: 2,
  weequay: 2,
  devaronian: 2,
  gungan: 2,
  aqualish: 2,
  ortolan: 2,
  chagrian: 2,
  cerean: 2
});

const DEFAULT_PREVALENCE_WEIGHT = 1;

function speciesKeyFor(entry) {
  if (entry && typeof entry === 'object') return String(entry.id ?? '');
  return String(entry ?? '');
}

function speciesNameFor(entry) {
  if (entry && typeof entry === 'object' && entry.name) return String(entry.name).toLowerCase();
  return '';
}

/**
 * Look up a caller-supplied species pool entry's generator-only
 * prevalence weight (see `SPECIES_GENERATOR_PREVALENCE` above). Exposed
 * for callers/tests that want to inspect the weighting directly without
 * re-deriving it.
 */
export function getSpeciesPrevalenceWeight(entry) {
  const name = speciesNameFor(entry);
  if (!name) return DEFAULT_PREVALENCE_WEIGHT;
  return SPECIES_GENERATOR_PREVALENCE[name] ?? DEFAULT_PREVALENCE_WEIGHT;
}

/**
 * PHASE 8D-3A — native vs. dominant Species colonization patterns (see
 * module doc / the phase spec's "Native Species vs dominant Species"
 * section). `nativeSpeciesIds`/`dominantSpeciesIds` are separate
 * concepts on the returned profile: the pattern rolled here determines
 * whether they coincide (the common case) or diverge (a colonized
 * world where the current majority isn't the native population).
 */
export const COLONIZATION_PATTERN = Object.freeze({
  NATIVE_MAJORITY: 'native-majority',
  NATIVE_MINORITY: 'native-minority',
  SETTLER_MAJORITY: 'settler-majority',
  COSMOPOLITAN_COLONY: 'cosmopolitan-colony',
  MULTI_NATIVE: 'multi-native'
});

const COLONIZATION_PATTERN_VALUES = Object.freeze(Object.values(COLONIZATION_PATTERN));

export function isColonizationPattern(value) {
  return COLONIZATION_PATTERN_VALUES.includes(value);
}

const COLONIZATION_PATTERN_ENTRIES = Object.freeze([
  { value: COLONIZATION_PATTERN.NATIVE_MAJORITY, weight: 5 },
  { value: COLONIZATION_PATTERN.SETTLER_MAJORITY, weight: 3 },
  { value: COLONIZATION_PATTERN.NATIVE_MINORITY, weight: 2 },
  { value: COLONIZATION_PATTERN.COSMOPOLITAN_COLONY, weight: 2 },
  { value: COLONIZATION_PATTERN.MULTI_NATIVE, weight: 1 }
]);

/** Pick a random colonization pattern (see `COLONIZATION_PATTERN` doc). */
export function pickColonizationPattern({ rng } = {}) {
  return weightedPick(COLONIZATION_PATTERN_ENTRIES, { rng })?.value ?? COLONIZATION_PATTERN.NATIVE_MAJORITY;
}

/**
 * Derive `nativeSpeciesIds` from the rolled `colonizationPattern`,
 * `dominantSpeciesId`, and the minority species actually present in
 * `speciesWeights` -- never invents a species outside the pool/rolled
 * distribution, and never fabricates false certainty (an empty array is
 * a legitimate, common answer: "no distinct native population remains
 * identifiable").
 */
function deriveNativeSpeciesIds({ pattern, dominantSpeciesId, minoritySpeciesIds, rng }) {
  switch (pattern) {
    case COLONIZATION_PATTERN.NATIVE_MAJORITY:
      return [dominantSpeciesId];
    case COLONIZATION_PATTERN.NATIVE_MINORITY: {
      if (!minoritySpeciesIds.length) return [dominantSpeciesId];
      return [pickRandom(minoritySpeciesIds, { rng })];
    }
    case COLONIZATION_PATTERN.MULTI_NATIVE: {
      const candidates = [dominantSpeciesId, ...minoritySpeciesIds];
      if (candidates.length <= 2) return candidates;
      const first = pickRandom(candidates, { rng });
      const rest = candidates.filter((id) => id !== first);
      return [first, pickRandom(rest, { rng })];
    }
    case COLONIZATION_PATTERN.SETTLER_MAJORITY:
    case COLONIZATION_PATTERN.COSMOPOLITAN_COLONY:
    default:
      return [];
  }
}

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
 * fictional world. Returns `{ profile, character, dominantSpeciesId,
 * dominantSpeciesIds, nativeSpeciesIds, colonizationPattern,
 * populationScale, populationEstimate, populationEstimateNumeric }`
 * where `profile` is a normal `createLocationPopulationProfile()`
 * record (same shape `location-population-profile.js` produces
 * everywhere else) with `fallbackUsed: false` and
 * `sourceKind: 'procedural-generated'` — this is a real generated
 * distribution, not a fallback.
 *
 * @param {object} [options]
 * @param {(string|{id:string,name?:string})[]} options.availableSpeciesIds
 *   - REQUIRED candidate pool (caller-supplied, e.g. from
 *   `SpeciesRegistry.getAll()`). Plain id strings remain fully
 *   supported (get neutral prevalence weighting); an entry shaped
 *   `{ id, name }` additionally lets `SPECIES_GENERATOR_PREVALENCE`
 *   bias the dominant-species pick by name (see that manifest's own
 *   doc). An empty pool returns an empty-but-valid profile rather than
 *   silently substituting the generic galactic fallback.
 * @param {string} [options.characterOverride] - force a specific
 *   `POPULATION_DIVERSITY` value instead of rolling one.
 * @param {string} [options.dominantSpeciesIdOverride] - force which
 *   species dominates instead of rolling one.
 * @param {boolean} [options.habitable] - the rolled `WORLD_CLASS`
 *   entry's own `habitable` flag (default true). Biases the
 *   `populationScale` roll heavily toward `UNINHABITED`/`OUTPOST` when
 *   false -- see `UNINHABITABLE_SCALE_ENTRIES` above.
 * @param {string} [options.densityBias] - `'dense'`/`'sparse'`/`''`,
 *   typically the rolled `WORLD_CLASS.populationBias` -- see
 *   `applyDensityBias()`.
 * @param {string} [options.populationScaleOverride] - force a specific
 *   `POPULATION_SCALE` value instead of rolling one.
 * @param {string} [options.colonizationPatternOverride] - force a
 *   specific `COLONIZATION_PATTERN` instead of rolling one.
 * @param {() => number} [options.rng]
 */
export function generateProceduralPlanetPopulationProfile({
  availableSpeciesIds = [],
  characterOverride = '',
  dominantSpeciesIdOverride = '',
  habitable = true,
  densityBias = '',
  populationScaleOverride = '',
  colonizationPatternOverride = '',
  rng
} = {}) {
  const populationScale = isPopulationScale(populationScaleOverride) ? populationScaleOverride : pickPopulationScale({ rng, habitable, densityBias });
  const populationEstimate = describePopulationEstimate(populationScale);
  const populationEstimateNumeric = rollPopulationEstimateNumeric(populationScale, { rng });

  if (populationScale === POPULATION_SCALE.UNINHABITED) {
    return {
      profile: createLocationPopulationProfile({
        sourceKind: 'procedural-generated',
        fallbackUsed: false,
        notes: ['This world was rolled as uninhabited -- demographics intentionally left empty, not a missing-data placeholder.']
      }),
      character: null,
      dominantSpeciesId: null,
      dominantSpeciesIds: [],
      nativeSpeciesIds: [],
      colonizationPattern: null,
      populationScale,
      populationEstimate,
      populationEstimateNumeric
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
      dominantSpeciesIds: [],
      nativeSpeciesIds: [],
      colonizationPattern: null,
      populationScale,
      populationEstimate,
      populationEstimateNumeric
    };
  }
  const character = isPopulationCharacter(characterOverride) ? characterOverride : pickPopulationCharacter({ rng });
  const range = CHARACTER_DOMINANT_WEIGHT_RANGE[character];
  const keyedPool = pool.map((entry) => ({ entry, key: speciesKeyFor(entry) }));
  const overrideMatch = dominantSpeciesIdOverride ? keyedPool.find((p) => p.key === dominantSpeciesIdOverride) : null;
  const dominantPick = overrideMatch
    ? overrideMatch.entry
    : (weightedPick(keyedPool, { rng, weightOf: (p) => getSpeciesPrevalenceWeight(p.entry) })?.entry ?? pickRandom(pool, { rng }));
  const dominantSpeciesId = speciesKeyFor(dominantPick);
  const dominantWeight = randomIntInclusive(range.min, range.max, { rng });
  const remainderPool = pool.map((entry) => speciesKeyFor(entry)).filter((id) => id !== dominantSpeciesId);
  const remainderWeight = 100 - dominantWeight;
  const speciesWeights = [{ speciesId: dominantSpeciesId, weight: dominantWeight }];
  let minoritySpeciesIds = [];
  if (remainderPool.length && remainderWeight > 0) {
    // Each minority species needs at least weight 1, so the count can
    // never exceed remainderWeight itself -- otherwise no integer split
    // summing exactly to remainderWeight exists.
    const minorityCount = Math.min(remainderPool.length, remainderWeight, randomIntInclusive(1, Math.min(5, remainderPool.length), { rng }));
    minoritySpeciesIds = pickUniqueN(remainderPool, minorityCount, rng);
    const shares = splitIntoRandomShares(minoritySpeciesIds.length, remainderWeight, rng);
    minoritySpeciesIds.forEach((speciesId, index) => speciesWeights.push({ speciesId, weight: shares[index] }));
  } else {
    speciesWeights[0] = { speciesId: dominantSpeciesId, weight: 100 };
  }

  const colonizationPattern = isColonizationPattern(colonizationPatternOverride) ? colonizationPatternOverride : pickColonizationPattern({ rng });
  const nativeSpeciesIds = deriveNativeSpeciesIds({ pattern: colonizationPattern, dominantSpeciesId, minoritySpeciesIds, rng });

  const profile = createLocationPopulationProfile({
    speciesWeights,
    sourceKind: 'procedural-generated',
    fallbackUsed: false,
    fallbackTemplate: '',
    notes: [`Procedurally generated ${character} population distribution for a new fictional world -- not the generic galactic fallback and not a lore census.`]
  });
  return {
    profile,
    character,
    dominantSpeciesId,
    dominantSpeciesIds: [dominantSpeciesId],
    nativeSpeciesIds,
    colonizationPattern,
    populationScale,
    populationEstimate,
    populationEstimateNumeric
  };
}
