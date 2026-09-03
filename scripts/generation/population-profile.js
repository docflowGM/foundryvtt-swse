/**
 * PHASE 8D-1 addendum — Faction population composition / membership
 * policy.
 *
 * A Faction's Organization family/archetype (`organization-metadata.js`)
 * answers WHAT the organization is; this module answers WHO tends to
 * belong to it. The two stay separate on purpose — this addendum
 * explicitly forbids collapsing them into new Faction "types" like
 * `all-droid-faction`/`wookiee-faction`. Population composition is a
 * TRAIT a Faction of any archetype can carry.
 *
 * HARD RULES:
 *  - `populationProfile` (demographics) and `membershipPolicy`
 *    (who is ALLOWED to join) are separate fields. A Faction can be 80%
 *    Wookiee with fully OPEN membership (it just operates on Kashyyyk),
 *    or 100% Wookiee with EXCLUSIVE membership (deliberate exclusion) —
 *    this module never infers one from the other.
 *  - Species-specific population NEVER implies prejudice/hostility.
 *    Nothing here writes to `faction-relationship-draft.js`'s ally/enemy
 *    concepts, and no selector below produces an "excluded" or "rival"
 *    anything on its own — `excludedSpeciesIds` only ever contains what
 *    a caller explicitly puts there.
 *  - Rank (`rank-metadata.js`) and population are independent: a droid
 *    can hold any command tier, including strategic leadership — this
 *    module makes no rank decisions and `rank-metadata.js` makes no
 *    population decisions.
 *  - Species references are canonical `SpeciesRegistry` ids ONLY. This
 *    module never duplicates species data — every function below that
 *    needs a pool of candidate species ids takes it as a plain array
 *    parameter, supplied by a caller that already read
 *    `SpeciesRegistry.getAll()`.
 */

import { pickRandom, weightedPick } from './lib/weighted-random.js';

// --- population mode -----------------------------------------------------
export const POPULATION_MODE = Object.freeze({
  MIXED: 'mixed',
  SPECIES_DOMINANT: 'species-dominant',
  SPECIES_LOCKED: 'species-locked',
  RESTRICTED_COALITION: 'restricted-coalition',
  DROID_HEAVY: 'droid-heavy',
  DROID_ONLY: 'droid-only',
  ORGANIC_ONLY: 'organic-only'
});

const POPULATION_MODES = Object.freeze(Object.values(POPULATION_MODE));

export function isPopulationMode(value) {
  return POPULATION_MODES.includes(value);
}

// --- membership policy: separate from demographics ------------------------
export const MEMBERSHIP_POLICY = Object.freeze({
  OPEN: 'open',
  PREFERRED: 'preferred',
  RESTRICTED: 'restricted',
  EXCLUSIVE: 'exclusive',
  DROID_ONLY: 'droid-only',
  ORGANIC_ONLY: 'organic-only'
});

const MEMBERSHIP_POLICIES = Object.freeze(Object.values(MEMBERSHIP_POLICY));

export function isMembershipPolicy(value) {
  return MEMBERSHIP_POLICIES.includes(value);
}

// --- living/droid composition ---------------------------------------------
export const LIVING_DROID_COMPOSITION_MODE = Object.freeze({
  MIXED: 'mixed',
  WEIGHTED: 'weighted',
  DROID_ONLY: 'droid-only',
  ORGANIC_ONLY: 'organic-only'
});

function clamp01(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(1, Math.max(0, n));
}

export function createLivingDroidComposition({ mode = LIVING_DROID_COMPOSITION_MODE.MIXED, livingWeight } = {}) {
  if (mode === LIVING_DROID_COMPOSITION_MODE.DROID_ONLY) return { mode, livingWeight: 0, droidWeight: 1 };
  if (mode === LIVING_DROID_COMPOSITION_MODE.ORGANIC_ONLY) return { mode, livingWeight: 1, droidWeight: 0 };
  const resolvedLivingWeight = clamp01(livingWeight, 0.75);
  return { mode: LIVING_DROID_COMPOSITION_MODE.WEIGHTED === mode ? mode : LIVING_DROID_COMPOSITION_MODE.MIXED, livingWeight: resolvedLivingWeight, droidWeight: 1 - resolvedLivingWeight };
}

// --- species policy ---------------------------------------------------------
export const SPECIES_POLICY_MODE = Object.freeze({
  OPEN: 'open',
  REQUIRED: 'required', // species-locked
  PREFERRED: 'preferred', // species-dominant
  ALLOWED_LIST: 'allowed-list' // restricted coalition
});

function cleanStringArray(value) {
  return Array.isArray(value) ? value.map((entry) => String(entry ?? '').trim()).filter(Boolean) : [];
}

export function createSpeciesPolicy({
  mode = SPECIES_POLICY_MODE.OPEN,
  preferredSpeciesIds = [],
  allowedSpeciesIds = [],
  excludedSpeciesIds = [],
  dominantSpeciesId = null,
  dominantSpeciesWeight = null
} = {}) {
  return {
    mode: Object.values(SPECIES_POLICY_MODE).includes(mode) ? mode : SPECIES_POLICY_MODE.OPEN,
    preferredSpeciesIds: cleanStringArray(preferredSpeciesIds),
    allowedSpeciesIds: cleanStringArray(allowedSpeciesIds),
    // Never populated automatically by anything in this module -- see
    // this file's header comment. Only ever what a caller explicitly
    // supplies (e.g. a GM-authored exclusion, or an explicit generated
    // ideology trait from a future phase).
    excludedSpeciesIds: cleanStringArray(excludedSpeciesIds),
    dominantSpeciesId: dominantSpeciesId ? String(dominantSpeciesId).trim() : null,
    dominantSpeciesWeight: dominantSpeciesWeight === null || dominantSpeciesWeight === undefined ? null : clamp01(dominantSpeciesWeight, 0.8)
  };
}

// --- population profile -----------------------------------------------------
export function createPopulationProfile({ mode = POPULATION_MODE.MIXED, livingDroidComposition, speciesPolicy, tags = [] } = {}) {
  const resolvedMode = isPopulationMode(mode) ? mode : POPULATION_MODE.MIXED;
  return {
    mode: resolvedMode,
    livingDroidComposition: livingDroidComposition && typeof livingDroidComposition === 'object'
      ? createLivingDroidComposition(livingDroidComposition)
      : createLivingDroidComposition(defaultCompositionForMode(resolvedMode)),
    speciesPolicy: speciesPolicy && typeof speciesPolicy === 'object' ? createSpeciesPolicy(speciesPolicy) : createSpeciesPolicy(),
    tags: cleanStringArray(tags)
  };
}

function defaultCompositionForMode(mode) {
  switch (mode) {
    case POPULATION_MODE.DROID_ONLY: return { mode: LIVING_DROID_COMPOSITION_MODE.DROID_ONLY };
    case POPULATION_MODE.DROID_HEAVY: return { mode: LIVING_DROID_COMPOSITION_MODE.WEIGHTED, livingWeight: 0.2 };
    case POPULATION_MODE.ORGANIC_ONLY: return { mode: LIVING_DROID_COMPOSITION_MODE.ORGANIC_ONLY };
    default: return { mode: LIVING_DROID_COMPOSITION_MODE.MIXED, livingWeight: 0.75 };
  }
}

// --- pure, RNG-injectable selectors (no Actor/Faction mutation) -----------

/**
 * Select `'living'` or `'droid'` for one generated internal member,
 * respecting the profile's `livingDroidComposition`. A `droid-only`/
 * `organic-only` composition is a HARD constraint (weight 0 on the
 * excluded kind means it is never selected); `mixed`/`weighted` is a
 * soft roll.
 */
export function selectMemberKind(populationProfile, { rng } = {}) {
  const composition = populationProfile?.livingDroidComposition ?? createLivingDroidComposition();
  if (composition.droidWeight <= 0) return 'living';
  if (composition.livingWeight <= 0) return 'droid';
  const roll = (rng ?? Math.random)();
  return roll < composition.droidWeight ? 'droid' : 'living';
}

/**
 * Select a species id for one generated internal LIVING member from
 * `availableSpeciesIds` (caller-supplied — e.g. `SpeciesRegistry
 * .getAll().map(s => s.id)`), respecting the profile's `speciesPolicy`:
 *  - `required` (species-locked): only `allowedSpeciesIds` are eligible.
 *  - `allowed-list` (restricted coalition): same hard filter.
 *  - `preferred` (species-dominant): `dominantSpeciesId` wins the roll
 *    with probability `dominantSpeciesWeight`, otherwise any available
 *    (non-excluded) species is eligible — the dominant species is
 *    FAVORED, never mandatory.
 *  - `open`: any available (non-excluded) species is eligible.
 * Returns `null` if no eligible species remain (e.g. an empty pool).
 */
export function selectSpeciesId(speciesPolicy, availableSpeciesIds = [], { rng } = {}) {
  const policy = speciesPolicy && typeof speciesPolicy === 'object' ? speciesPolicy : createSpeciesPolicy();
  const pool = (Array.isArray(availableSpeciesIds) ? availableSpeciesIds : []).filter((id) => !policy.excludedSpeciesIds.includes(id));

  if (policy.mode === SPECIES_POLICY_MODE.REQUIRED || policy.mode === SPECIES_POLICY_MODE.ALLOWED_LIST) {
    const allowed = pool.filter((id) => policy.allowedSpeciesIds.includes(id));
    return pickRandom(allowed.length ? allowed : policy.allowedSpeciesIds, { rng });
  }

  if (policy.mode === SPECIES_POLICY_MODE.PREFERRED && policy.dominantSpeciesId) {
    const weight = policy.dominantSpeciesWeight ?? 0.8;
    if ((rng ?? Math.random)() < weight) return policy.dominantSpeciesId;
    return pickRandom(pool, { rng }) ?? policy.dominantSpeciesId;
  }

  return pickRandom(pool, { rng });
}

// --- archetype -> population-mode weighting (centralized, tunable) --------
// Deliberately sparse: an archetype not listed here has no special
// tendency and always resolves to plain `mixed` via the fallback in
// `pickPopulationModeForArchetype()`.
export const ARCHETYPE_POPULATION_MODE_WEIGHTS = Object.freeze({
  droid_collective: { [POPULATION_MODE.DROID_ONLY]: 6, [POPULATION_MODE.DROID_HEAVY]: 3, [POPULATION_MODE.MIXED]: 1 },
  clan: { [POPULATION_MODE.SPECIES_LOCKED]: 4, [POPULATION_MODE.SPECIES_DOMINANT]: 4, [POPULATION_MODE.MIXED]: 2 },
  humanitarian: { [POPULATION_MODE.SPECIES_DOMINANT]: 3, [POPULATION_MODE.MIXED]: 5 },
  noble_house: { [POPULATION_MODE.MIXED]: 5, [POPULATION_MODE.SPECIES_DOMINANT]: 3, [POPULATION_MODE.SPECIES_LOCKED]: 1 },
  corporation: { [POPULATION_MODE.MIXED]: 6, [POPULATION_MODE.DROID_HEAVY]: 2 },
  research: { [POPULATION_MODE.MIXED]: 6, [POPULATION_MODE.DROID_HEAVY]: 2 },
  military: { [POPULATION_MODE.MIXED]: 5, [POPULATION_MODE.SPECIES_DOMINANT]: 2, [POPULATION_MODE.DROID_HEAVY]: 2, [POPULATION_MODE.RESTRICTED_COALITION]: 1 },
  mercenary: { [POPULATION_MODE.MIXED]: 5, [POPULATION_MODE.RESTRICTED_COALITION]: 2, [POPULATION_MODE.DROID_HEAVY]: 1 },
  street_gang: { [POPULATION_MODE.MIXED]: 4, [POPULATION_MODE.SPECIES_DOMINANT]: 3 },
  intelligence: { [POPULATION_MODE.MIXED]: 6, [POPULATION_MODE.RESTRICTED_COALITION]: 1 }
});

/**
 * Weighted-pick a population mode for a generator archetype id. Falls
 * back to a pure `{mixed: 1}` weighting for any archetype not listed in
 * `ARCHETYPE_POPULATION_MODE_WEIGHTS` — never throws on an unknown
 * archetype.
 */
export function pickPopulationModeForArchetype(archetype, { rng } = {}) {
  const weights = ARCHETYPE_POPULATION_MODE_WEIGHTS[archetype] || { [POPULATION_MODE.MIXED]: 1 };
  const entries = Object.entries(weights).map(([mode, weight]) => ({ mode, weight }));
  const picked = weightedPick(entries, { rng, weightOf: (entry) => entry.weight });
  return picked ? picked.mode : POPULATION_MODE.MIXED;
}

/** Diagnostic codes a future Opposition Resolver may report (not implemented here). */
export const POPULATION_DIAGNOSTIC = Object.freeze({
  NO_SPECIES_COMPATIBLE_PROFILE: 'no-species-compatible-profile'
});
