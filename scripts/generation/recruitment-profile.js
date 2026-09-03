/**
 * PHASE 8D-1 addendum — Faction recruitment locality bias.
 *
 * "Locality bias describes how strongly [Location demographics] should
 * influence [Faction population]." Bridges `location-population-profile.js`
 * ("who lives here") and `population-profile.js` ("who belongs to this
 * organization") without merging the two concerns into one module.
 *
 * HARD RULE (explicit Faction identity always wins): the Location has
 * ZERO authority whenever the Faction's own `speciesPolicy.mode` is
 * anything other than `open`. A `species-locked`/`restricted-coalition`/
 * already-`species-dominant` Faction is never second-guessed or
 * "corrected" toward its planet's demographics — an explicitly
 * generated "Human-exclusive noble house on Ryloth" stays exactly that.
 *
 * CORRECTION (independent review of head `180cedd`): the first version
 * of this module tried to express locality bias as a STATIC derived
 * `SpeciesPolicy` object — `createSpeciesPolicy({mode:'preferred',
 * dominantSpeciesId: <the single highest-weight species>,
 * dominantSpeciesWeight: localityBias})`. That collapsed a Location's
 * entire weighted distribution down to its one dominant species before
 * biasing, so e.g. Ryloth's real 76% Twi'lek / 24% Human split and a
 * hypothetical 51%/49% split would have produced IDENTICAL behavior at
 * the same localityBias — the actual demographic shape was discarded,
 * undercutting the whole point of curating a 50-world weighted dataset.
 * It also meant `localityBias` did not mean what its name said: at
 * bias 1.0 the result was "always the single dominant species" (not
 * "exactly the Location's real distribution"), and at low bias the
 * effective dominant-species probability was
 * `bias + (1-bias)/availableSpeciesCount`, not "bias% Location
 * influence."
 *
 * FIX: `selectFactionSpeciesWithLocality()` below performs the mixture
 * at SELECTION time instead of trying to precompute a lossy static
 * policy: roll `localityBias`; on success, weighted-pick from the
 * Location's FULL `speciesWeights` (every species, not just the
 * dominant one); on failure, fall back to ordinary open Faction
 * selection. This makes `localityBias` mean exactly what it says: 0 =
 * no Location influence, 1 = exactly the Location's real distribution,
 * values between blend proportionally. `deriveSpeciesPolicyFromLocationContext()`
 * is removed — nothing in this codebase called it in production (the
 * blend was documented as deferred to the Phase 8D-2 generator), so
 * there is no caller to migrate.
 */

import { SPECIES_POLICY_MODE, createSpeciesPolicy, selectSpeciesId } from './population-profile.js';
import { selectSpeciesForLocation } from './location-population-profile.js';

function clamp01(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

function cleanString(value) {
  return String(value ?? '').trim();
}

/**
 * A Faction's origin/operating-location context plus how strongly its
 * local operating environment should bias its membership demographics.
 * The three location fields are a pure draft factory's string inputs —
 * this module never fabricates a Location id and never looks one up,
 * but it also does not itself verify that a supplied id resolves to a
 * real canonical Location (that check belongs to whichever future
 * generator/commit layer actually holds `LocationRegistryService`,
 * per the "generator is never campaign-data authority" rule — adding a
 * registry lookup to this pure factory merely to self-validate would
 * cross that line for no benefit, since an unresolvable id here simply
 * produces no Location bias downstream rather than corrupting anything).
 */
export function createRecruitmentProfile({
  originLocationId = '',
  headquartersLocationId = '',
  currentLocationId = '',
  localityBias = 0.5
} = {}) {
  return {
    originLocationId: cleanString(originLocationId),
    headquartersLocationId: cleanString(headquartersLocationId),
    currentLocationId: cleanString(currentLocationId),
    localityBias: clamp01(localityBias, 0.5)
  };
}

/**
 * Default locality bias per generator archetype (centralized, tunable —
 * matches `organization-metadata.js`'s `FACTION_ARCHETYPE_FAMILY` key
 * set). An indigenous resistance movement or local government is
 * heavily shaped by where it operates; an offworld occupying military
 * force or bounty-hunter network is not. `droid_collective` is included
 * for schema completeness even though its population is normally
 * droid-only regardless (organic demographics are moot for it) — a
 * caller never needs a special case to look this table up.
 */
export const ARCHETYPE_DEFAULT_LOCALITY_BIAS = Object.freeze({
  government: 0.90,
  law_enforcement: 0.90,
  clan: 0.95,
  humanitarian: 0.75,
  noble_house: 0.60,
  street_gang: 0.85,
  corporation: 0.50,
  guild: 0.55,
  research: 0.40,
  smuggler_network: 0.30,
  criminal_syndicate: 0.35,
  pirates: 0.25,
  bounty_hunters: 0.20,
  mercenary: 0.20,
  military: 0.15,
  intelligence: 0.15,
  resistance: 0.80,
  force_order: 0.40,
  secret_society: 0.35,
  droid_collective: 0
});

/** Default locality bias for an archetype id, or 0.5 (neutral) if the archetype isn't in the table. */
export function defaultLocalityBiasForArchetype(archetype) {
  const value = ARCHETYPE_DEFAULT_LOCALITY_BIAS[archetype];
  return value === undefined ? 0.5 : value;
}

/**
 * Select a species id for one generated internal LIVING Faction member,
 * blending the Faction's own explicit `speciesPolicy` with Location
 * demographic context via `localityBias` — a genuine two-step mixture,
 * not a lossy single-species approximation:
 *
 *  1. `speciesPolicy.mode !== 'open'` → the Location has ZERO
 *     authority; delegates straight to `selectSpeciesId()` on the
 *     Faction's own policy exactly as supplied. Explicit Faction
 *     identity always wins.
 *  2. `speciesPolicy.mode === 'open'` → the Location's `speciesWeights`
 *     are first filtered down to species that are BOTH in
 *     `availableSpeciesIds` and NOT in the policy's own
 *     `excludedSpeciesIds` (an `open` policy can still carry an
 *     explicit exclusion — e.g. a generated ideology trait — and that
 *     must be respected exactly as strictly as a `required`/
 *     `allowed-list` constraint would be; see the correction note
 *     below). Then roll `localityBias`:
 *     - roll succeeds (and at least one Location species survived the
 *       filter) → weighted-pick from that FILTERED distribution
 *       (`selectSpeciesForLocation()` — every eligible species in its
 *       real relative proportion, not only the single dominant one;
 *       no renormalization needed, weighted selection only needs
 *       relative weights);
 *     - roll fails (or no Location species survived the filter) →
 *       ordinary open Faction selection (`selectSpeciesId()` uniform
 *       over `availableSpeciesIds`, respecting `excludedSpeciesIds`)
 *       — never an illegal species and never `null` from this branch
 *       alone.
 *
 * `localityBias` therefore means exactly what its name says: 0 = no
 * Location influence at all (pure open selection); 1 = always drawn
 * from the Location's real weighted distribution AMONG ELIGIBLE
 * species; values between blend proportionally.
 *
 * CORRECTION (independent review of head `cff63f4`): the version that
 * introduced this function passed `locationPopulationProfile` straight
 * to `selectSpeciesForLocation()` unfiltered, so an `open` policy's own
 * `excludedSpeciesIds` and the caller's `availableSpeciesIds` boundary
 * were both bypassed on the Location-influenced branch — a Faction
 * that explicitly excluded a species (or was scoped to a restricted
 * canonical species pool) could still have that exact species selected
 * whenever the Location roll succeeded. Fixed by filtering
 * `speciesWeights` against both constraints before the weighted pick.
 */
export function selectFactionSpeciesWithLocality({
  speciesPolicy,
  availableSpeciesIds = [],
  locationPopulationProfile = null,
  localityBias = 0.5,
  rng
} = {}) {
  const policy = speciesPolicy && typeof speciesPolicy === 'object' ? speciesPolicy : createSpeciesPolicy();
  if (policy.mode !== SPECIES_POLICY_MODE.OPEN) {
    return selectSpeciesId(policy, availableSpeciesIds, { rng });
  }
  const bias = clamp01(localityBias, 0.5);
  const available = new Set(availableSpeciesIds);
  const excluded = new Set(policy.excludedSpeciesIds);
  const eligibleLocalWeights = (locationPopulationProfile?.speciesWeights ?? [])
    .filter((entry) => available.has(entry.speciesId) && !excluded.has(entry.speciesId));
  const roll = (rng ?? Math.random)();
  if (eligibleLocalWeights.length && roll < bias) {
    return selectSpeciesForLocation({ speciesWeights: eligibleLocalWeights }, { rng });
  }
  return selectSpeciesId(policy, availableSpeciesIds, { rng });
}
