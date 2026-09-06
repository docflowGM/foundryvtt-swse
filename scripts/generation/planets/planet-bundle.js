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
 * NEVER silently DROPS OR REPLACES a sibling POI -- every POI's own
 * identity (`draftId`/`template`/`name`/`nameDraft`) survives every
 * operation except the three explicitly allowed to replace the whole
 * POI set: `generateProceduralPlanetBundle()` and
 * `regeneratePlanetAndPois()` (a wholly new world genuinely invalidates
 * what POIs made sense on it) and `regenerateAllPois()` (an explicit
 * "reroll all POIs" the GM asked for, keeping the same planet).
 * `rerollPlanetFactsOnly()`/`rerollPoiInBundle()` leave every POI they
 * weren't asked to touch COMPLETELY untouched (same object reference).
 * `regenerateEnvironment()`/`regenerateCivilization()` are a middle
 * case (finding #5): the planet actually changed in a way that affects
 * every POI's derived context, so each POI's `biomes`/`tags`/
 * `generatorContext`/compatibility diagnostic ARE refreshed against
 * the new parent state (`refreshPoiContext()`), while its identity
 * still never changes -- staleness becomes a visible
 * `POI_CONTEXT_MISMATCH` diagnostic, never silent drift and never
 * silent deletion.
 */

import {
  createProceduralPlanetDraft,
  rerollPlanetWorldClass,
  rerollPlanetGravity,
  rerollPlanetAtmosphere,
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
import { createProceduralPoiDraft, rerollPoiTemplate, rerollPoiName, poiCountForPopulationScale, refreshPoiContext } from './poi-generator.js';

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
 * @param {string} [options.presetId] - PHASE 8D-3A correction pass
 *   (finding #4A): forwarded verbatim to `createProceduralPlanetDraft()`
 *   -- previously this API had no way to express "Generate New Planet
 *   + POIs From Preset" at all.
 */
export function generateProceduralPlanetBundle({ rng, availableSpeciesIds = [], poiCount, presetId = '' } = {}) {
  const planetDraft = createProceduralPlanetDraft({ rng, availableSpeciesIds, includeChild: true, presetId });
  const resolvedPoiCount = Number.isFinite(poiCount) ? Math.max(0, poiCount) : poiCountForPopulationScale(planetDraft.populationScale, { rng });
  const poiDrafts = [];
  for (let i = 0; i < resolvedPoiCount; i++) {
    poiDrafts.push(createProceduralPoiDraft({ rng, parentDraftId: planetDraft.draftId, parentPlanetDraft: planetDraft }));
  }
  return { planetDraft, poiDrafts };
}

/**
 * Regenerate the ENTIRE bundle from scratch -- a new planet draft AND a
 * new POI set. PHASE 8D-3A correction pass (finding #4A): preserves
 * the EXISTING bundle's `presetId` unless the caller explicitly
 * overrides it -- a bundle generated "From Preset: Mining World" stays
 * a Mining World bundle across a full regenerate unless the GM
 * deliberately picks a different preset (or `presetId: ''` to clear
 * it).
 */
export function regeneratePlanetAndPois(bundle, { rng, availableSpeciesIds = [], poiCount, presetId } = {}) {
  return generateProceduralPlanetBundle({ rng, availableSpeciesIds, poiCount, presetId: presetId ?? bundle.planetDraft.presetId });
}

/**
 * PHASE 8D-3A correction pass: was missing entirely -- the phase spec's
 * own bundle-operations list (§32) names "reroll all POIs" as a
 * distinct whole-object operation alongside "reroll whole planet
 * bundle" (`regeneratePlanetAndPois()`), "reroll individual POI"
 * (`rerollPoiInBundle()`), and add/remove, a gap caught on re-check.
 *
 * Regenerate EVERY POI in the bundle against the SAME planet draft --
 * the planet itself is untouched (unlike `regeneratePlanetAndPois()`,
 * which replaces both). Defaults to the same POI count the bundle
 * already had; pass `poiCount` to change it. This and
 * `regeneratePlanetAndPois()` are the only two operations allowed to
 * replace every POI at once -- every other bundle operation
 * (`rerollPlanetFactsOnly()`/`regenerateEnvironment()`/
 * `regenerateCivilization()`/`rerollPoiInBundle()`) leaves POIs it
 * wasn't asked to touch alone.
 */
export function regenerateAllPois(bundle, { rng, poiCount } = {}) {
  const resolvedPoiCount = Number.isFinite(poiCount) ? Math.max(0, poiCount) : bundle.poiDrafts.length;
  const poiDrafts = [];
  for (let i = 0; i < resolvedPoiCount; i++) {
    poiDrafts.push(createProceduralPoiDraft({ rng, parentDraftId: bundle.planetDraft.draftId, parentPlanetDraft: bundle.planetDraft }));
  }
  return { ...bundle, poiDrafts };
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
 * Reroll the planet's ENVIRONMENT cluster (world class, gravity,
 * atmosphere, climate, hydrosphere, hazards) together -- a bigger,
 * coherent "this world's physical character changed" operation, one
 * level up from rerolling world class alone. PHASE 8D-3A correction
 * pass (finding #5 and the related secondary observation): gravity/
 * atmosphere/hazards are now part of this coherent operation too (the
 * expanded environment model made leaving them out of a "regenerate
 * the whole environment" op an increasingly narrow reading of
 * "environment"); single-field rerolls of any of these stay
 * independent exactly as before.
 *
 * Every child POI is preserved (never replaced/deleted -- that stays
 * `regenerateAllPois()`'s job) but its parent-derived context IS
 * refreshed via `refreshPoiContext()`: `biomes`/`tags`/
 * `generatorContext` are re-derived against the world's NEW
 * environment, and a POI whose template no longer fits gets
 * `DIAGNOSTIC_CODE.POI_CONTEXT_MISMATCH` attached rather than being
 * silently left with stale context and no signal at all (the previous
 * behavior this correction pass fixes) or silently deleted/rerolled
 * out from under the GM (which this module's whole design exists to
 * prevent). `draftId`/`template`/`name`/`nameDraft` on every POI are
 * completely untouched.
 */
export function regenerateEnvironment(bundle, { rng } = {}) {
  let planetDraft = bundle.planetDraft;
  planetDraft = rerollPlanetWorldClass(planetDraft, { rng });
  planetDraft = rerollPlanetGravity(planetDraft, { rng });
  planetDraft = rerollPlanetAtmosphere(planetDraft, { rng });
  planetDraft = rerollPlanetClimate(planetDraft, { rng });
  planetDraft = rerollPlanetHydrosphere(planetDraft, { rng });
  planetDraft = rerollPlanetHazards(planetDraft, { rng });
  const poiDrafts = bundle.poiDrafts.map((poi) => refreshPoiContext(poi, { parentPlanetDraft: planetDraft }));
  return { ...bundle, planetDraft, poiDrafts };
}

/**
 * Reroll the planet's CIVILIZATION cluster (government, stability,
 * technology level, economy) together -- composing the same
 * single-field reroll functions `planet-draft.js` already exports
 * (never reimplementing `rollCivilization()`'s private logic here). A
 * no-op on an UNINHABITED draft, exactly like each underlying reroll
 * already is individually. Every child POI is preserved but has its
 * context refreshed, same rationale and mechanism as
 * `regenerateEnvironment()` -- a POI's `generatorContext` also depends
 * on the planet's economy/government tags, not just its environment.
 */
export function regenerateCivilization(bundle, { rng } = {}) {
  let planetDraft = bundle.planetDraft;
  planetDraft = rerollPlanetGovernment(planetDraft, { rng });
  planetDraft = rerollPlanetStability(planetDraft, { rng });
  planetDraft = rerollPlanetTechnologyLevel(planetDraft, { rng });
  planetDraft = rerollPlanetEconomy(planetDraft, { rng });
  const poiDrafts = bundle.poiDrafts.map((poi) => refreshPoiContext(poi, { parentPlanetDraft: planetDraft }));
  return { ...bundle, planetDraft, poiDrafts };
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
