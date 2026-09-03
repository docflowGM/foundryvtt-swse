/**
 * PHASE 8D-1 addendum — Faction recruitment locality bias.
 *
 * "Locality bias describes how strongly [Location demographics] should
 * influence [Faction population]." Bridges `location-population-profile.js`
 * ("who lives here") and `population-profile.js` ("who belongs to this
 * organization") without merging the two concerns into one module.
 *
 * HARD RULE (explicit Faction identity always wins): this module only
 * ever DERIVES a species preference from Location context when the
 * Faction's own `speciesPolicy.mode` is `open` (no explicit
 * constraint). A `species-locked`/`restricted-coalition`/already-
 * `species-dominant` Faction is never second-guessed or "corrected"
 * toward its planet's demographics — an explicitly generated
 * "Human-exclusive noble house on Ryloth" stays exactly that.
 */

import { SPECIES_POLICY_MODE, createSpeciesPolicy } from './population-profile.js';

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
 * All three location fields are real, canonical Location ids ONLY
 * (empty string when unresolved/not yet chosen) — never a fake id.
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
 * Derive an effective species policy for a Faction from Location
 * demographic context. Only ever acts when `speciesPolicy.mode` is
 * `open` (the Faction has no explicit species constraint of its own);
 * any other mode is returned completely unchanged — explicit Faction
 * identity always wins. When it does act, it produces a `preferred`
 * (species-dominant) policy favoring the Location's single dominant
 * species, weighted by `localityBias` — a HIGH bias makes the local
 * majority heavily favored; a LOW bias leaves selection close to open.
 * Never a hard `required`/`allowed-list` constraint — Location context
 * only ever biases, it never locks.
 */
export function deriveSpeciesPolicyFromLocationContext(speciesPolicy, locationPopulationProfile, localityBias) {
  if (!speciesPolicy || speciesPolicy.mode !== SPECIES_POLICY_MODE.OPEN) return speciesPolicy;
  const weights = locationPopulationProfile?.speciesWeights;
  if (!Array.isArray(weights) || !weights.length) return speciesPolicy;
  const dominant = weights.reduce((a, b) => (a.weight >= b.weight ? a : b));
  const bias = clamp01(localityBias, 0.5);
  if (bias <= 0) return speciesPolicy;
  return createSpeciesPolicy({
    mode: SPECIES_POLICY_MODE.PREFERRED,
    dominantSpeciesId: dominant.speciesId,
    dominantSpeciesWeight: bias,
    preferredSpeciesIds: [dominant.speciesId]
  });
}
