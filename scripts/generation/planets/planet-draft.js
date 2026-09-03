/**
 * PHASE 8D-2 foundation — procedural planet draft (`GENERATE_NEW_PLANET`
 * / `GENERATE_NEW_PLANET_AND_POI` support).
 *
 * Composes every small planet sub-generator (world class/size/gravity/
 * atmosphere, name, system, population, government, stability, economy,
 * hazards, history hooks, traits) into ONE draft record. This module is
 * deliberately just composition — it owns no table data and no pick
 * logic of its own (avoids the "procedural god object" the spec warned
 * against; every actual roll lives in its own small file under
 * `planets/`).
 *
 * The returned draft's base fields (`draftId`/`mode`/`locationId`/
 * `parentLocationId`/`parentDraftId`/`name`/`category`/`type`/`biomes`/
 * `tags`/`summary`/`provenance`) intentionally mirror
 * `location-draft.js`'s `createLocationDependencyDraft()` shape — a
 * procedural planet draft already IS a location-dependency draft (a
 * superset carrying richer generated facts), so a Faction/Job generator
 * that only needs "this Job happens on this Location" can consume it
 * exactly as it would a Library-seed-based draft, while a caller who
 * wants the full planet detail (population profile, government,
 * economy, ...) reads the extra fields directly. This mirrors the
 * `draft-id.js` investigation conclusion: no second generic wrapper
 * shape is needed here either.
 *
 * Still a DRAFT — no canonical Location record is created here. Commit
 * remains `LocationRegistryService`'s job, exactly as
 * `location-draft.js`'s own header documents.
 */

import { LOCATION_DRAFT_MODE } from '../location-draft.js';
import { createDraftId } from '../lib/draft-id.js';
import { createProvenance } from '../provenance.js';
import { mergeTags } from '../lib/tag-utils.js';
import { composeLocationSummary } from '../lib/description-composer.js';
import { pickPlanetWorldClass, pickPlanetSize, pickPlanetGravity, pickPlanetAtmosphere } from './planet-quality-tables.js';
import { getRandomPlanetName } from '../names/planet-name-generator.js';
import { getRandomSystemName } from '../names/system-name-generator.js';
import { generateProceduralPlanetPopulationProfile } from './planet-population.js';
import { pickPlanetGovernment } from './planet-government.js';
import { pickPlanetStability } from './planet-stability.js';
import { pickPlanetEconomies } from './planet-economy.js';
import { pickPlanetHazards } from './planet-hazards.js';
import { pickPlanetHistoryHooks } from './planet-history-hooks.js';
import { pickPlanetTraits } from './planet-traits.js';

function composeTagsAndSummary({ worldClass, government, stability, economies, hazards, traits }) {
  const tags = mergeTags(
    worldClass.tags,
    economies.flatMap((e) => e.tags || []),
    hazards.flatMap((h) => h.tags || []),
    traits.flatMap((t) => t.tags || []),
    government.tags || []
  );
  const summary = composeLocationSummary({
    worldClass: worldClass.value,
    biomes: worldClass.tags,
    economy: economies.map((e) => e.value),
    stability: stability.value
  });
  return { tags, summary };
}

/**
 * Generate a full procedural planet draft.
 *
 * @param {object} [options]
 * @param {() => number} [options.rng]
 * @param {string[]} [options.availableSpeciesIds] - candidate species
 *   pool for `planet-population.js` (caller-supplied, e.g. from
 *   `SpeciesRegistry.getAll()`); an empty/omitted pool yields an empty
 *   (never fallback-substituted) population profile.
 * @param {boolean} [options.includeChild] - when true, `mode` is
 *   `GENERATE_NEW_PLANET_AND_POI` instead of `GENERATE_NEW_PLANET`
 *   (the actual POI draft itself is `planets/../poi`'s job, Phase
 *   8D-2's next groundwork task -- this flag only records intent).
 */
export function createProceduralPlanetDraft({ rng, availableSpeciesIds = [], includeChild = false } = {}) {
  const worldClass = pickPlanetWorldClass({ rng });
  const size = pickPlanetSize({ rng });
  const gravity = pickPlanetGravity({ rng });
  const atmosphere = pickPlanetAtmosphere({ rng });
  const nameDraft = getRandomPlanetName({ rng, preferTags: worldClass.tags });
  const systemDraft = getRandomSystemName({ planetName: nameDraft.name });
  const { profile: populationProfile, character: populationCharacter } = generateProceduralPlanetPopulationProfile({ availableSpeciesIds, rng });
  const government = pickPlanetGovernment({ rng });
  const stability = pickPlanetStability({ rng });
  const economies = pickPlanetEconomies({ rng, preferTags: worldClass.tags, count: 1 + Math.floor((rng ?? Math.random)() * 2) });
  const hazards = pickPlanetHazards({ rng, preferTags: worldClass.tags, count: Math.floor((rng ?? Math.random)() * 3) });
  const historyHooks = pickPlanetHistoryHooks({ rng, count: 1 });
  const traits = pickPlanetTraits({ rng, preferTags: worldClass.tags, count: 1 + Math.floor((rng ?? Math.random)() * 3) });
  const { tags, summary } = composeTagsAndSummary({ worldClass, government, stability, economies, hazards, traits });

  return {
    draftId: createDraftId('location'),
    mode: includeChild ? LOCATION_DRAFT_MODE.GENERATE_NEW_PLANET_AND_POI : LOCATION_DRAFT_MODE.GENERATE_NEW_PLANET,
    locationId: '',
    parentLocationId: '',
    parentDraftId: '',
    librarySeedId: '',
    name: nameDraft.name,
    nameDraft,
    system: systemDraft.name,
    systemDraft,
    category: 'planetary',
    type: 'planet',
    worldClass,
    size,
    gravity,
    atmosphere,
    populationProfile,
    populationCharacter,
    government,
    stability,
    economies,
    hazards,
    historyHooks,
    traits,
    biomes: worldClass.tags,
    tags,
    summary,
    provenance: createProvenance({ presetId: LOCATION_DRAFT_MODE.GENERATE_NEW_PLANET, templateId: '' })
  };
}

/** Reroll ONLY the world class, recomputing tags/summary; preserves every other field (including name -- a planet's name doesn't imply its class). */
export function rerollPlanetWorldClass(draft, { rng } = {}) {
  const worldClass = pickPlanetWorldClass({ rng });
  const { tags, summary } = composeTagsAndSummary({ worldClass, government: draft.government, stability: draft.stability, economies: draft.economies, hazards: draft.hazards, traits: draft.traits });
  return { ...draft, worldClass, biomes: worldClass.tags, tags, summary };
}

/** Reroll ONLY the government, preserving everything else (including summary/tags, which don't read government). */
export function rerollPlanetGovernment(draft, { rng } = {}) {
  return { ...draft, government: pickPlanetGovernment({ rng }) };
}

/** Reroll ONLY the stability, recomposing the summary (which reads it). */
export function rerollPlanetStability(draft, { rng } = {}) {
  const stability = pickPlanetStability({ rng });
  const { summary } = composeTagsAndSummary({ worldClass: draft.worldClass, government: draft.government, stability, economies: draft.economies, hazards: draft.hazards, traits: draft.traits });
  return { ...draft, stability, summary };
}

/** Reroll ONLY the economies, recomputing tags/summary. */
export function rerollPlanetEconomies(draft, { rng, count } = {}) {
  const economies = pickPlanetEconomies({ rng, preferTags: draft.worldClass.tags, count: count ?? draft.economies.length ?? 1 });
  const { tags, summary } = composeTagsAndSummary({ worldClass: draft.worldClass, government: draft.government, stability: draft.stability, economies, hazards: draft.hazards, traits: draft.traits });
  return { ...draft, economies, tags, summary };
}

/** Reroll ONLY the hazards, recomputing tags. */
export function rerollPlanetHazards(draft, { rng, count } = {}) {
  const hazards = pickPlanetHazards({ rng, preferTags: draft.worldClass.tags, count: count ?? draft.hazards.length });
  const { tags } = composeTagsAndSummary({ worldClass: draft.worldClass, government: draft.government, stability: draft.stability, economies: draft.economies, hazards, traits: draft.traits });
  return { ...draft, hazards, tags };
}

/** Reroll ONLY the history hooks. Never touches tags/summary (history hooks aren't read by either). */
export function rerollPlanetHistoryHooks(draft, { rng, count } = {}) {
  return { ...draft, historyHooks: pickPlanetHistoryHooks({ rng, count: count ?? draft.historyHooks.length ?? 1 }) };
}

/** Reroll ONLY the traits, recomputing tags. */
export function rerollPlanetTraits(draft, { rng, count } = {}) {
  const traits = pickPlanetTraits({ rng, preferTags: draft.worldClass.tags, count: count ?? draft.traits.length });
  const { tags } = composeTagsAndSummary({ worldClass: draft.worldClass, government: draft.government, stability: draft.stability, economies: draft.economies, hazards: draft.hazards, traits });
  return { ...draft, traits, tags };
}

/**
 * Reroll ONLY the population profile, preserving every narrative field.
 * `availableSpeciesIds` must be supplied by the caller (same
 * caller-supplies-the-pool discipline as `planet-population.js` itself
 * and `population-profile.js`'s existing convention) -- this never
 * guesses a pool from the draft's previous roll, which would only
 * shrink across successive rerolls.
 */
export function rerollPlanetPopulation(draft, { rng, availableSpeciesIds = [] } = {}) {
  const { profile: populationProfile, character: populationCharacter } = generateProceduralPlanetPopulationProfile({ availableSpeciesIds, rng });
  return { ...draft, populationProfile, populationCharacter };
}
