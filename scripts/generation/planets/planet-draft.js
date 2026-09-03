/**
 * PHASE 8D-2 foundation — procedural planet draft (`GENERATE_NEW_PLANET`
 * / `GENERATE_NEW_PLANET_AND_POI` support).
 *
 * Composes every small planet sub-generator (world class/size/gravity/
 * atmosphere, name, system, region/sector, climate/hydrosphere,
 * population [scale/demographics/droid composition], government,
 * stability, economy [sectors + trade, via the shared Galactic
 * Commodity Catalog], technology level, settlement pattern, hazards,
 * history hooks, traits) into ONE draft record. This module is
 * deliberately just composition — it owns no table data and no pick
 * logic of its own (avoids the "procedural god object" the spec warned
 * against; every actual roll lives in its own small file under
 * `planets/`).
 *
 * CORRECTED (Phase 8D-2 independent review, round 1 + the economy
 * follow-up): the original version of this composite omitted region/
 * sector/climate/hydrosphere/population-scale/droid-prevalence/
 * technology/settlement-pattern/imports-exports entirely, and
 * unconditionally generated organic demographics even for a
 * `habitable: false` world class. Population generation is now GATED
 * by `planet-population.js`'s own `POPULATION_SCALE` roll (habitable-
 * aware, including a genuine `UNINHABITED` state that leaves
 * demographics AND trade empty), and `settlementPattern` is derived
 * FROM that same scale so the two facts can never contradict each
 * other. `economy` is a nested object (`primarySector`/
 * `secondarySectors`/`exports`/`imports`/`shortages`/`illicitTrade`)
 * resolved by `planet-trade.js`'s Trade Resolver against the shared
 * `data/galactic-commodities.js` catalog — the SAME catalog a future
 * Cargo/smuggling Job generator reads, never a planet-specific
 * commodity list.
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
import { generatePlanetEconomySectors } from './planet-economy.js';
import { generatePlanetTrade } from './planet-trade.js';
import { pickPlanetHazards } from './planet-hazards.js';
import { pickPlanetHistoryHooks } from './planet-history-hooks.js';
import { pickPlanetTraits } from './planet-traits.js';
import { pickPlanetRegion, pickSectorName, pickPlanetClimate, pickPlanetHydrosphere, pickPlanetTechnologyLevel, pickSettlementPattern } from './planet-profile.js';

/**
 * `preferTags` fed to sibling pools (economy/hazard/trait/name) merges
 * BOTH `worldClass.biomes` (the real Library vocabulary) and
 * `worldClass.tags` (procedural-only descriptors) -- correction from
 * the biome-SSOT review: those pools' own tag pools mix genuine biome
 * words ("desert", "mountain") with procedural adjectives
 * ("mysterious", "trade"), so preference matching needs both to work
 * as well as it did before the split.
 */
function worldClassPreferenceTags(worldClass) {
  return mergeTags(worldClass.biomes, worldClass.tags);
}

function composeTagsAndSummary({ worldClass, government, stability, economy, hazards, traits }) {
  // The draft's own `tags` field stays PROCEDURAL-ONLY (never a biome
  // claim) -- `biomes` (set separately in the draft, see
  // createProceduralPlanetDraft() below) is the sole biome authority.
  const economySectors = [economy.primarySector, ...economy.secondarySectors];
  const tags = mergeTags(
    worldClass.tags,
    economySectors.flatMap((e) => e.tags || []),
    hazards.flatMap((h) => h.tags || []),
    traits.flatMap((t) => t.tags || []),
    government.tags || []
  );
  const summary = composeLocationSummary({
    worldClass: worldClass.value,
    biomes: worldClass.biomes,
    economy: economySectors.map((e) => e.value),
    stability: stability.value
  });
  return { tags, summary };
}

function rollEconomy({ rng, preferTags, worldClass, populationScale, settlementPattern, stability }) {
  const { primarySector, secondarySectors } = generatePlanetEconomySectors({ rng, preferTags, secondaryCount: Math.floor((rng ?? Math.random)() * 3) });
  const trade = generatePlanetTrade({
    rng,
    primarySector,
    secondarySectors,
    worldClass,
    populationScale,
    settlementPattern,
    stabilityValue: stability.value,
    exportCount: 1 + Math.floor((rng ?? Math.random)() * 2),
    importCount: 1 + Math.floor((rng ?? Math.random)() * 2)
  });
  return { primarySector, secondarySectors, ...trade };
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
  const preferTags = worldClassPreferenceTags(worldClass);
  const size = pickPlanetSize({ rng });
  const gravity = pickPlanetGravity({ rng });
  const atmosphere = pickPlanetAtmosphere({ rng });
  const nameDraft = getRandomPlanetName({ rng, preferTags });
  const systemDraft = getRandomSystemName({ planetName: nameDraft.name });
  const region = pickPlanetRegion({ rng });
  const sector = pickSectorName({ rng });
  const climate = pickPlanetClimate({ rng, preferTags });
  const hydrosphere = pickPlanetHydrosphere({ rng, preferTags });
  const {
    profile: populationProfile,
    character: populationCharacter,
    populationScale,
    populationEstimate,
    droidComposition
  } = generateProceduralPlanetPopulationProfile({ availableSpeciesIds, rng, habitable: worldClass.habitable });
  const settlementPattern = pickSettlementPattern({ rng, populationScale });
  const technologyLevel = pickPlanetTechnologyLevel({ rng });
  const government = pickPlanetGovernment({ rng });
  const stability = pickPlanetStability({ rng });
  const economy = rollEconomy({ rng, preferTags, worldClass, populationScale, settlementPattern, stability });
  const hazards = pickPlanetHazards({ rng, preferTags, count: Math.floor((rng ?? Math.random)() * 3) });
  const historyHooks = pickPlanetHistoryHooks({ rng, count: 1 });
  const traits = pickPlanetTraits({ rng, preferTags, count: 1 + Math.floor((rng ?? Math.random)() * 3) });
  const { tags, summary } = composeTagsAndSummary({ worldClass, government, stability, economy, hazards, traits });

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
    region,
    sector,
    category: 'planetary',
    type: worldClass.locationType,
    worldClass,
    size,
    gravity,
    atmosphere,
    climate,
    hydrosphere,
    populationProfile,
    populationCharacter,
    populationScale,
    populationEstimate,
    droidComposition,
    settlementPattern,
    technologyLevel,
    government,
    stability,
    economy,
    hazards,
    historyHooks,
    traits,
    biomes: worldClass.biomes,
    tags,
    summary,
    provenance: createProvenance({ presetId: LOCATION_DRAFT_MODE.GENERATE_NEW_PLANET, templateId: '' })
  };
}

/** Reroll ONLY the world class, recomputing biomes/tags/summary and type; preserves every other field (including name -- a planet's name doesn't imply its class). */
export function rerollPlanetWorldClass(draft, { rng } = {}) {
  const worldClass = pickPlanetWorldClass({ rng });
  const { tags, summary } = composeTagsAndSummary({ worldClass, government: draft.government, stability: draft.stability, economy: draft.economy, hazards: draft.hazards, traits: draft.traits });
  return { ...draft, worldClass, biomes: worldClass.biomes, tags, summary, type: worldClass.locationType };
}

/** Reroll ONLY the government, preserving everything else (including summary/tags, which don't read government). */
export function rerollPlanetGovernment(draft, { rng } = {}) {
  return { ...draft, government: pickPlanetGovernment({ rng }) };
}

/** Reroll ONLY the stability, recomposing the summary (which reads it). Also rerolls `economy.illicitTrade`, which reads stability, to avoid leaving it stale. */
export function rerollPlanetStability(draft, { rng } = {}) {
  const stability = pickPlanetStability({ rng });
  const { summary } = composeTagsAndSummary({ worldClass: draft.worldClass, government: draft.government, stability, economy: draft.economy, hazards: draft.hazards, traits: draft.traits });
  const trade = generatePlanetTrade({
    rng,
    primarySector: draft.economy.primarySector,
    secondarySectors: draft.economy.secondarySectors,
    worldClass: draft.worldClass,
    populationScale: draft.populationScale,
    settlementPattern: draft.settlementPattern,
    stabilityValue: stability.value,
    exportCount: draft.economy.exports.length || 1,
    importCount: draft.economy.imports.length || 1
  });
  return { ...draft, stability, summary, economy: { ...draft.economy, ...trade } };
}

/** Reroll ONLY the economy (primary + secondary sectors + trade), recomputing tags/summary. */
export function rerollPlanetEconomy(draft, { rng, secondaryCount } = {}) {
  const economy = rollEconomy({
    rng,
    preferTags: worldClassPreferenceTags(draft.worldClass),
    worldClass: draft.worldClass,
    populationScale: draft.populationScale,
    settlementPattern: draft.settlementPattern,
    stability: draft.stability
  });
  if (Number.isFinite(secondaryCount)) economy.secondarySectors = economy.secondarySectors.slice(0, secondaryCount);
  const { tags, summary } = composeTagsAndSummary({ worldClass: draft.worldClass, government: draft.government, stability: draft.stability, economy, hazards: draft.hazards, traits: draft.traits });
  return { ...draft, economy, tags, summary };
}

/** Reroll ONLY the trade (exports/imports/shortages/illicitTrade), keeping the same economy sectors. */
export function rerollPlanetTrade(draft, { rng, exportCount, importCount } = {}) {
  const trade = generatePlanetTrade({
    rng,
    primarySector: draft.economy.primarySector,
    secondarySectors: draft.economy.secondarySectors,
    worldClass: draft.worldClass,
    populationScale: draft.populationScale,
    settlementPattern: draft.settlementPattern,
    stabilityValue: draft.stability.value,
    exportCount: exportCount ?? draft.economy.exports.length ?? 1,
    importCount: importCount ?? draft.economy.imports.length ?? 1
  });
  return { ...draft, economy: { ...draft.economy, ...trade } };
}

/** Reroll ONLY the hazards, recomputing tags. */
export function rerollPlanetHazards(draft, { rng, count } = {}) {
  const hazards = pickPlanetHazards({ rng, preferTags: worldClassPreferenceTags(draft.worldClass), count: count ?? draft.hazards.length });
  const { tags } = composeTagsAndSummary({ worldClass: draft.worldClass, government: draft.government, stability: draft.stability, economy: draft.economy, hazards, traits: draft.traits });
  return { ...draft, hazards, tags };
}

/** Reroll ONLY the history hooks. Never touches tags/summary (history hooks aren't read by either). */
export function rerollPlanetHistoryHooks(draft, { rng, count } = {}) {
  return { ...draft, historyHooks: pickPlanetHistoryHooks({ rng, count: count ?? draft.historyHooks.length ?? 1 }) };
}

/** Reroll ONLY the traits, recomputing tags. */
export function rerollPlanetTraits(draft, { rng, count } = {}) {
  const traits = pickPlanetTraits({ rng, preferTags: worldClassPreferenceTags(draft.worldClass), count: count ?? draft.traits.length });
  const { tags } = composeTagsAndSummary({ worldClass: draft.worldClass, government: draft.government, stability: draft.stability, economy: draft.economy, hazards: draft.hazards, traits });
  return { ...draft, traits, tags };
}

/**
 * Reroll ONLY the population profile, preserving every narrative field.
 * `availableSpeciesIds` must be supplied by the caller (same
 * caller-supplies-the-pool discipline as `planet-population.js` itself
 * and `population-profile.js`'s existing convention) -- this never
 * guesses a pool from the draft's previous roll, which would only
 * shrink across successive rerolls. `settlementPattern` is ALSO
 * rerolled here (never left stale) since it is derived FROM
 * `populationScale` -- leaving the old pattern in place after a
 * population reroll could otherwise recreate exactly the kind of
 * contradiction (e.g. an uninhabited world with `rural-villages`)
 * this correction pass fixed. `economy.exports/imports/shortages/
 * illicitTrade` are ALSO rerolled -- `planet-trade.js`'s Trade Resolver
 * returns empty trade for an `UNINHABITED` world, so leaving the old
 * (possibly nonempty) trade in place after a reroll into `UNINHABITED`
 * would reintroduce the same kind of contradiction.
 */
export function rerollPlanetPopulation(draft, { rng, availableSpeciesIds = [], habitable } = {}) {
  const {
    profile: populationProfile,
    character: populationCharacter,
    populationScale,
    populationEstimate,
    droidComposition
  } = generateProceduralPlanetPopulationProfile({ availableSpeciesIds, rng, habitable: habitable ?? draft.worldClass?.habitable });
  const settlementPattern = pickSettlementPattern({ rng, populationScale });
  const trade = generatePlanetTrade({
    rng,
    primarySector: draft.economy.primarySector,
    secondarySectors: draft.economy.secondarySectors,
    worldClass: draft.worldClass,
    populationScale,
    settlementPattern,
    stabilityValue: draft.stability.value,
    exportCount: draft.economy.exports.length || 1,
    importCount: draft.economy.imports.length || 1
  });
  return {
    ...draft,
    populationProfile,
    populationCharacter,
    populationScale,
    populationEstimate,
    droidComposition,
    settlementPattern,
    economy: { ...draft.economy, ...trade }
  };
}

/** Reroll ONLY the region. */
export function rerollPlanetRegion(draft, { rng } = {}) {
  return { ...draft, region: pickPlanetRegion({ rng }) };
}

/** Reroll ONLY the sector name. */
export function rerollPlanetSector(draft, { rng } = {}) {
  return { ...draft, sector: pickSectorName({ rng }) };
}

/** Reroll ONLY the climate. */
export function rerollPlanetClimate(draft, { rng } = {}) {
  return { ...draft, climate: pickPlanetClimate({ rng, preferTags: worldClassPreferenceTags(draft.worldClass) }) };
}

/** Reroll ONLY the hydrosphere. */
export function rerollPlanetHydrosphere(draft, { rng } = {}) {
  return { ...draft, hydrosphere: pickPlanetHydrosphere({ rng, preferTags: worldClassPreferenceTags(draft.worldClass) }) };
}

/** Reroll ONLY the technology level. */
export function rerollPlanetTechnologyLevel(draft, { rng } = {}) {
  return { ...draft, technologyLevel: pickPlanetTechnologyLevel({ rng }) };
}
