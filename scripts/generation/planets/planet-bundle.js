/**
 * PHASE 8D-3A production — planet+POI bundle generator and bundle-level
 * reroll/regenerate operations (`GENERATE_NEW_PLANET_AND_POI` support).
 *
 * Composes `planet-draft.js` (the planet) and `poi-generator.js` (each
 * child POI) into one `{ planetDraft, poiDrafts }` bundle, with proper
 * `parentDraftId` linkage (every `poiDrafts[n].parentDraftId` is the
 * bundle's `planetDraft.draftId`) -- still GENERATE-tier facts only, no
 * canonical Location/POI record is created here, exactly like every
 * other Phase 8D-2/8D-3A draft generator. This module owns no table
 * data or pick logic of its own -- it only composes the existing
 * single-planet and single-POI generators, matching `planet-draft.js`'s
 * own "deliberately just composition" discipline.
 *
 * Every bundle-level operation returns a NEW bundle object (the
 * established immutable-draft convention throughout this codebase) and
 * NEVER silently drops sibling POIs: a reroll scoped to one field (the
 * planet's environment, its civilization block, or a single POI) always
 * carries the bundle's OTHER POIs through untouched. Only the two
 * explicitly whole-bundle operations -- `generateProceduralPlanetBundle()`
 * itself and `regeneratePlanetAndPois()` -- replace the POI set, because
 * regenerating the whole world (a new world class, a new population
 * scale, ...) genuinely invalidates what POIs made sense on it; a
 * scoped reroll never does.
 */

import {
  createProceduralPlanetDraft,
  rerollPlanetWorldClass,
  rerollPlanetClimate,
  rerollPlanetHydrosphere,
  rerollPlanetGovernment,
  rerollPlanetStability,
  rerollPlanetTechnologyLevel,
  rerollPlanetEconomy,
  rerollPlanetHazards,
  rerollPlanetHistoryHooks,
  rerollPlanetTraits
} from './planet-draft.js';
import { createProceduralPoiDraft, rerollPoiTemplate, rerollPoiName, poiCountForPopulationScale } from './poi-generator.js';

/**
 * Generate a full planet+POI bundle: `{ planetDraft, poiDrafts }`.
 * `poiDrafts[n].parentDraftId` is always `planetDraft.draftId`; every
 * POI is generated WITH `parentPlanetDraft: planetDraft` so it inherits
 * the planet's context weighting/hard-compatibility-filter exactly like
 * a POI generated one-at-a-time against a known parent.
 *
 * @param {object} [options]
 * @param {() => number} [options.rng]
 * @param {string[]} [options.availableSpeciesIds]
 * @param {number} [options.poiCount] - explicit POI count; defaults to
 *   `poiCountForPopulationScale(planetDraft.populationScale, { rng })`.
 */
export function generateProceduralPlanetBundle({ rng, availableSpeciesIds = [], poiCount } = {}) {
  const planetDraft = createProceduralPlanetDraft({ rng, availableSpeciesIds, includeChild: true });
  const resolvedPoiCount = Number.isFinite(poiCount) ? Math.max(0, poiCount) : poiCountForPopulationScale(planetDraft.populationScale, { rng });
  const poiDrafts = [];
  for (let i = 0; i < resolvedPoiCount; i++) {
    poiDrafts.push(createProceduralPoiDraft({ rng, parentDraftId: planetDraft.draftId, parentPlanetDraft: planetDraft }));
  }
  return { planetDraft, poiDrafts };
}

/**
 * Regenerate the ENTIRE bundle from scratch -- a new planet draft AND a
 * new POI set. The one bundle-level operation besides initial creation
 * that's allowed to replace every POI, since a wholly new world
 * genuinely invalidates the old POI set's context.
 */
export function regeneratePlanetAndPois(bundle, { rng, availableSpeciesIds = [], poiCount } = {}) {
  return generateProceduralPlanetBundle({ rng, availableSpeciesIds, poiCount });
}

/**
 * Reroll ONLY the planet's narrative "facts" -- hazards, history hooks,
 * and traits -- leaving world class/population/civilization/POIs
 * untouched. The bundle-level equivalent of clicking reroll on each of
 * those three planet fields at once. POIs are carried through
 * unchanged -- none of these three fields feed a POI's compatibility
 * filter or preference weighting, so their context isn't invalidated.
 */
export function rerollPlanetFactsOnly(bundle, { rng, hazardCount, historyHookCount, traitCount } = {}) {
  let planetDraft = bundle.planetDraft;
  planetDraft = rerollPlanetHazards(planetDraft, { rng, count: hazardCount });
  planetDraft = rerollPlanetHistoryHooks(planetDraft, { rng, count: historyHookCount });
  planetDraft = rerollPlanetTraits(planetDraft, { rng, count: traitCount });
  return { ...bundle, planetDraft };
}

/**
 * Reroll the planet's ENVIRONMENT cluster (world class, climate,
 * hydrosphere) together -- a bigger, coherent "this world's physical
 * character changed" operation, one level up from rerolling world
 * class alone. POIs are carried through UNCHANGED -- their `biomes`
 * (derived from the OLD world class at generation time,
 * `poi-generator.js`'s `deriveActualPoiBiomes()`) can go stale against
 * the new one; this is a known, accepted limitation of a SCOPED reroll
 * (see module doc: only a full regenerate replaces POIs), and
 * `DIAGNOSTIC_CODE.POI_CONTEXT_MISMATCH` (`poi-generator.js`) plus the
 * planet-level diagnostics this phase adds are the intended path for
 * surfacing that staleness to a GM, not silent POI deletion.
 */
export function regenerateEnvironment(bundle, { rng } = {}) {
  let planetDraft = bundle.planetDraft;
  planetDraft = rerollPlanetWorldClass(planetDraft, { rng });
  planetDraft = rerollPlanetClimate(planetDraft, { rng });
  planetDraft = rerollPlanetHydrosphere(planetDraft, { rng });
  return { ...bundle, planetDraft };
}

/**
 * Reroll the planet's CIVILIZATION cluster (government, stability,
 * technology level, economy) together -- composing the same
 * single-field reroll functions `planet-draft.js` already exports
 * (never reimplementing `rollCivilization()`'s private logic here). A
 * no-op on an UNINHABITED draft, exactly like each underlying reroll
 * already is individually. POIs are carried through unchanged, same
 * rationale as `regenerateEnvironment()`.
 */
export function regenerateCivilization(bundle, { rng } = {}) {
  let planetDraft = bundle.planetDraft;
  planetDraft = rerollPlanetGovernment(planetDraft, { rng });
  planetDraft = rerollPlanetStability(planetDraft, { rng });
  planetDraft = rerollPlanetTechnologyLevel(planetDraft, { rng });
  planetDraft = rerollPlanetEconomy(planetDraft, { rng });
  return { ...bundle, planetDraft };
}

/**
 * Add one new POI to the bundle, generated against the bundle's own
 * planet draft (proper `parentDraftId` linkage, full context
 * weighting/hard filter). Every existing POI is preserved untouched.
 */
export function addPoiToBundle(bundle, { rng, preferTags = [] } = {}) {
  const poi = createProceduralPoiDraft({ rng, parentDraftId: bundle.planetDraft.draftId, parentPlanetDraft: bundle.planetDraft, preferTags });
  return { ...bundle, poiDrafts: [...bundle.poiDrafts, poi] };
}

/** Remove one POI from the bundle by `draftId`. A no-op (returns the bundle unchanged) if no POI with that id exists. Every OTHER POI is preserved untouched. */
export function removePoiFromBundle(bundle, poiDraftId) {
  const poiDrafts = bundle.poiDrafts.filter((p) => p.draftId !== poiDraftId);
  if (poiDrafts.length === bundle.poiDrafts.length) return bundle;
  return { ...bundle, poiDrafts };
}

/**
 * Reroll ONE POI in the bundle by `draftId` -- either its template
 * (`field: 'template'`, the default) or just its name (`field:
 * 'name'`), matching `poi-generator.js`'s own `rerollPoiTemplate()`/
 * `rerollPoiName()` split. Always re-resolves against the bundle's
 * CURRENT `planetDraft` (so a POI rerolled after `regenerateEnvironment()`/
 * `regenerateCivilization()` picks up the planet's latest context, not
 * a stale snapshot), unless the caller explicitly overrides
 * `preferTags`/`planetTags`/`populationScale`. Every OTHER POI in the
 * bundle is preserved untouched -- this is the core "never silently
 * destroy sibling POIs" guarantee this module exists to provide.
 */
export function rerollPoiInBundle(bundle, poiDraftId, { rng, field = 'template', preferTags, planetTags, populationScale } = {}) {
  let found = false;
  const poiDrafts = bundle.poiDrafts.map((poi) => {
    if (poi.draftId !== poiDraftId) return poi;
    found = true;
    return field === 'name'
      ? rerollPoiName(poi, { rng, preferTags })
      : rerollPoiTemplate(poi, { rng, preferTags, planetTags, populationScale, parentPlanetDraft: bundle.planetDraft });
  });
  if (!found) return bundle;
  return { ...bundle, poiDrafts };
}
