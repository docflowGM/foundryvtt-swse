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
 * CORRECTED (round 2): `UNINHABITED` previously only gated demographics
 * and trade -- `technologyLevel`/`government`/`stability`/the economy's
 * `primarySector`/`secondarySectors` still rolled unconditionally,
 * producing contradictory drafts (a world with "no permanent
 * population" carrying a "parliamentary government" in "civil unrest").
 * `rollCivilization()` now gates ALL FOUR on the same `populationScale`
 * check demographics/trade already used: an `UNINHABITED` world gets
 * `technologyLevel: null`, `government: null`, `stability: null`, and
 * an empty economy -- never fabricated civilization facts. History
 * hooks can still describe a former civilization; an `OUTPOST`-scale
 * world (a research station, a mining camp) still rolls a real, if
 * modest, government/economy of its own, exactly as before. Rerolling
 * population can cross the `UNINHABITED` boundary in either direction,
 * so `rerollPlanetPopulation()` now recomputes the WHOLE civilization
 * block from the new scale rather than only `settlementPattern`+trade,
 * and each single-field civilization reroll
 * (`rerollPlanetGovernment`/`-Stability`/`-TechnologyLevel`/`-Economy`/
 * `-Trade`) is a no-op on an `UNINHABITED` draft -- there is nothing to
 * reroll. `droidPrevalence` (`planet-profile.js`'s
 * `PLANET_DROID_PREVALENCE`) replaces the old Faction-composition-model
 * `droidComposition`: it is now explicitly INDEPENDENT of organic
 * population (how automated a world is, not what share of a group is
 * organic vs. droid), rolled unconditionally including for `UNINHABITED`
 * worlds, and untouched by a population reroll.
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
 *
 * PHASE 8D-3A additions: `presetId` (`data/planet-presets.js`, see
 * `createProceduralPlanetDraft({ presetId })`'s own doc) and the
 * SUGGEST-tier hook bundle `planet-hooks.js` composes
 * (`suggestedFactionArchetypeTags`/`suggestedJobArchetypeTags`/
 * `suggestedOppositionTags`/`currentEvents`/`secret`) -- narrative
 * hints only, never an actual Faction/Job/Intel/canonical fact. Hooks
 * are set once at creation and only change via the explicit
 * `rerollPlanetHooks()`, never as a side effect of an unrelated
 * reroll -- the same "a scoped reroll never silently changes something
 * else" discipline `planet-bundle.js` established for POIs.
 */

import { LOCATION_DRAFT_MODE } from '../location-draft.js';
import { createDraftId } from '../lib/draft-id.js';
import { createProvenance } from '../provenance.js';
import { mergeTags } from '../lib/tag-utils.js';
import { composeLocationSummary } from '../lib/description-composer.js';
import { pickPlanetWorldClass, pickPlanetSize, pickPlanetGravity, pickPlanetAtmosphere } from './planet-quality-tables.js';
import { getRandomPlanetName } from '../names/planet-name-generator.js';
import { getRandomSystemName } from '../names/system-name-generator.js';
import { generateProceduralPlanetPopulationProfile, POPULATION_SCALE } from './planet-population.js';
import { pickPlanetGovernment } from './planet-government.js';
import { pickPlanetStability } from './planet-stability.js';
import { generatePlanetEconomySectors } from './planet-economy.js';
import { generatePlanetTrade } from './planet-trade.js';
import { pickPlanetHazards } from './planet-hazards.js';
import { pickPlanetHistoryHooks } from './planet-history-hooks.js';
import { pickPlanetTraits } from './planet-traits.js';
import { pickPlanetRegion, pickSectorName, pickPlanetClimate, pickPlanetHydrosphere, pickPlanetTechnologyLevel, pickPlanetDroidPrevalence, pickSettlementPattern } from './planet-profile.js';
import { getPlanetPreset } from '../data/planet-presets.js';
import { generatePlanetHooks } from './planet-hooks.js';
import { DIAGNOSTIC_CODE } from '../lib/generator-diagnostics.js';

const EMPTY_ECONOMY = Object.freeze({ primarySector: null, secondarySectors: Object.freeze([]), exports: Object.freeze([]), imports: Object.freeze([]), shortages: Object.freeze([]), illicitTrade: Object.freeze([]) });

const POPULATION_SCALE_RANK = Object.freeze({
  [POPULATION_SCALE.OUTPOST]: 0,
  [POPULATION_SCALE.SMALL_SETTLEMENT]: 1,
  [POPULATION_SCALE.SETTLED]: 2,
  [POPULATION_SCALE.POPULOUS]: 3,
  [POPULATION_SCALE.HYPER_URBANIZED]: 4
});

const TECHNOLOGY_LEVEL_RANK = Object.freeze({ primitive: 0, frontier: 1, standard: 2, advanced: 3, 'cutting-edge': 4 });

/** Government `tags` implying a large administrative apparatus -- an unusual fit for a tiny population (see `computePlanetDiagnostics()`). */
const LARGE_SCALE_GOVERNMENT_TAGS = new Set(['noble-house', 'government-bureaucracy']);
const SMALL_POPULATION_SCALES = new Set([POPULATION_SCALE.OUTPOST, POPULATION_SCALE.SMALL_SETTLEMENT]);

/**
 * PHASE 8D-3A: flag (never fix/discard -- the same "warn about an
 * unusual combination" discipline every `DIAGNOSTIC_CODE` follows)
 * civilization/economy combinations worth a GM's attention:
 *
 *  - `TRADE_CONTEXT_MISMATCH`: the rolled economy sector(s) share NO
 *    tag at all with the world's own biome/character context --
 *    structurally possible because `generatePlanetEconomySectors()`
 *    only SOFTLY prefers matching tags, never hard-filters on them
 *    (unlike POI's `pickCompatiblePoiTemplate()`).
 *  - `GOVERNMENT_POPULATION_MISMATCH`: a tiny population (OUTPOST/
 *    SMALL_SETTLEMENT) paired with a government implying a large
 *    administrative apparatus (a Noble House, a full bureaucracy).
 *  - `TECHNOLOGY_POPULATION_MISMATCH`: technology level and
 *    population scale are more than two rank-steps apart (e.g. a
 *    lone OUTPOST running Cutting-Edge tech, or a HYPER_URBANIZED
 *    ecumenopolis stuck at Primitive tech).
 *
 * All three are `UNINHABITED`-safe (an uninhabited world has no
 * government/economy/technology to compare -- see `rollCivilization()`
 * -- so this returns `[]` immediately for one).
 */
function computePlanetDiagnostics({ worldClass, government, economy, technologyLevel, populationScale }) {
  if (populationScale === POPULATION_SCALE.UNINHABITED) return [];
  const diagnostics = [];

  const economySectors = [economy.primarySector, ...(economy.secondarySectors || [])].filter(Boolean);
  if (economySectors.length) {
    const sectorTags = mergeTags(...economySectors.map((s) => s.tags || []));
    const worldTags = worldClassPreferenceTags(worldClass);
    if (!sectorTags.some((t) => worldTags.includes(t))) diagnostics.push(DIAGNOSTIC_CODE.TRADE_CONTEXT_MISMATCH);
  }

  if (government && SMALL_POPULATION_SCALES.has(populationScale) && (government.tags || []).some((t) => LARGE_SCALE_GOVERNMENT_TAGS.has(t))) {
    diagnostics.push(DIAGNOSTIC_CODE.GOVERNMENT_POPULATION_MISMATCH);
  }

  if (technologyLevel) {
    const techRank = TECHNOLOGY_LEVEL_RANK[technologyLevel] ?? 2;
    const scaleRank = POPULATION_SCALE_RANK[populationScale] ?? 2;
    if (Math.abs(techRank - scaleRank) >= 3) diagnostics.push(DIAGNOSTIC_CODE.TECHNOLOGY_POPULATION_MISMATCH);
  }

  return diagnostics;
}

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

/** The rolled economy's sector `tags`, merged -- the context `pickPlanetDroidPrevalence()` softly skews on (see `planet-profile.js`). Empty for an `UNINHABITED` world (no economy). */
function economySectorTags(economy) {
  return mergeTags(economy.primarySector?.tags || [], ...(economy.secondarySectors || []).map((s) => s.tags || []));
}

/**
 * PHASE 8D-3A: `composeLocationSummary()` now also synthesizes
 * `government`/`population` into the summary prose (previously only
 * worldClass/biomes/economy/stability) -- `populationEstimate`
 * (optional, defaults to '' so a call site that omits it composes
 * exactly as it always did) is `planet-population.js`'s own prose
 * band ("hundreds to low thousands"), never a raw number.
 */
function composeTagsAndSummary({ worldClass, government, stability, economy, hazards, traits, populationEstimate = '' }) {
  // The draft's own `tags` field stays PROCEDURAL-ONLY (never a biome
  // claim) -- `biomes` (set separately in the draft, see
  // createProceduralPlanetDraft() below) is the sole biome authority.
  // `government`/`stability`/`economy.primarySector` are `null` for an
  // `UNINHABITED` world (see `rollCivilization()`) -- every read below
  // is null-safe so an uninhabited world's tags/summary never claim a
  // government or economy it doesn't have.
  const economySectors = [economy.primarySector, ...(economy.secondarySectors || [])].filter(Boolean);
  const tags = mergeTags(
    worldClass.tags,
    economySectors.flatMap((e) => e.tags || []),
    hazards.flatMap((h) => h.tags || []),
    traits.flatMap((t) => t.tags || []),
    government?.tags || []
  );
  const summary = composeLocationSummary({
    worldClass: worldClass.value,
    biomes: worldClass.biomes,
    economy: economySectors.map((e) => e.value),
    government: government?.value ?? '',
    population: populationEstimate,
    stability: stability?.value ?? ''
  });
  return { tags, summary };
}

/**
 * Roll `primarySector`/`secondarySectors`/`exports`/`imports`/
 * `shortages`/`illicitTrade` for a world -- empty across the board for
 * `UNINHABITED` (mirroring `generatePlanetTrade()`'s own gate, so this
 * stays correct even when called directly, e.g. from
 * `rerollPlanetEconomy()`). `secondaryCount`, when supplied, is passed
 * INTO sector generation itself so the Trade Resolver always resolves
 * against the FINAL sector set -- never a superset later sliced down
 * after trade was already generated against it (a prior version of
 * `rerollPlanetEconomy()` had exactly that bug).
 */
function rollEconomy({ rng, preferTags, worldClass, populationScale, settlementPattern, stability, government, secondaryCount }) {
  if (populationScale === POPULATION_SCALE.UNINHABITED) return { ...EMPTY_ECONOMY };
  const { primarySector, secondarySectors } = generatePlanetEconomySectors({
    rng,
    preferTags,
    secondaryCount: Number.isFinite(secondaryCount) ? secondaryCount : Math.floor((rng ?? Math.random)() * 3)
  });
  const trade = generatePlanetTrade({
    rng,
    primarySector,
    secondarySectors,
    worldClass,
    populationScale,
    settlementPattern,
    stabilityValue: stability?.value ?? '',
    governmentTags: government?.tags || [],
    exportCount: 1 + Math.floor((rng ?? Math.random)() * 2),
    importCount: 1 + Math.floor((rng ?? Math.random)() * 2)
  });
  return { primarySector, secondarySectors, ...trade };
}

/**
 * Roll the full "civilization" block (`technologyLevel`/`government`/
 * `stability`/`economy`) for a world. `UNINHABITED` gates all four --
 * see the module-header correction note. `OUTPOST` and every denser
 * scale still roll a real (if modest) government/economy of their own.
 *
 * PHASE 8D-3A: `government` now also reads `preferTags` (previously
 * only `economy` did) -- a pre-existing wiring gap, closed here because
 * it is exactly what makes a planet preset's (`data/planet-presets.js`)
 * intent (e.g. "Corporate Colony," "Military Garrison," "Sacred World")
 * actually reach the government pick, not just world class/economy.
 */
function rollCivilization({ rng, preferTags, worldClass, populationScale, settlementPattern, secondaryCount }) {
  const isUninhabited = populationScale === POPULATION_SCALE.UNINHABITED;
  const technologyLevel = isUninhabited ? null : pickPlanetTechnologyLevel({ rng });
  const government = isUninhabited ? null : pickPlanetGovernment({ rng, preferTags });
  const stability = isUninhabited ? null : pickPlanetStability({ rng });
  const economy = rollEconomy({ rng, preferTags, worldClass, populationScale, settlementPattern, stability, government, secondaryCount });
  return { technologyLevel, government, stability, economy };
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
 * @param {string} [options.presetId] - PHASE 8D-3A: a `data/planet-presets.js`
 *   id (e.g. `'mining-world'`). A preset never fabricates a fact
 *   directly -- it only feeds its `preferTags` into the SAME soft-
 *   preference picks every other field already uses (world class,
 *   climate, hydrosphere, government, economy, hazards, traits, history
 *   hooks) and its `densityBias` (when set) overrides `worldClass.populationBias`
 *   for the population-scale roll. An unrecognized/empty id is simply
 *   no preset (never an error) -- the draft generates exactly as it
 *   always did. The resolved id (or `''`) is recorded on the draft's
 *   own `presetId` field and in `provenance.presetId`.
 */
export function createProceduralPlanetDraft({ rng, availableSpeciesIds = [], includeChild = false, presetId = '' } = {}) {
  const preset = presetId ? getPlanetPreset(presetId) : null;
  const presetPreferTags = preset?.preferTags || [];
  const worldClass = pickPlanetWorldClass({ rng, preferTags: presetPreferTags });
  const preferTags = mergeTags(presetPreferTags, worldClassPreferenceTags(worldClass));
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
    dominantSpeciesId,
    dominantSpeciesIds,
    nativeSpeciesIds,
    colonizationPattern,
    populationScale,
    populationEstimate,
    populationEstimateNumeric
  } = generateProceduralPlanetPopulationProfile({ availableSpeciesIds, rng, habitable: worldClass.habitable, densityBias: preset?.densityBias || worldClass.populationBias || '' });
  const settlementPattern = pickSettlementPattern({ rng, populationScale });
  const { technologyLevel, government, stability, economy } = rollCivilization({ rng, preferTags, worldClass, populationScale, settlementPattern });
  const droidPrevalence = pickPlanetDroidPrevalence({ rng, technologyLevel: technologyLevel || '', economyTags: economySectorTags(economy) });
  const hazards = pickPlanetHazards({ rng, preferTags, count: Math.floor((rng ?? Math.random)() * 3) });
  const historyHooks = pickPlanetHistoryHooks({ rng, preferTags, count: 1 });
  const traits = pickPlanetTraits({ rng, preferTags, count: 1 + Math.floor((rng ?? Math.random)() * 3) });
  const { tags, summary } = composeTagsAndSummary({ worldClass, government, stability, economy, hazards, traits, populationEstimate });
  const hooks = generatePlanetHooks({ rng, tags });
  const diagnostics = computePlanetDiagnostics({ worldClass, government, economy, technologyLevel, populationScale });

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
    dominantSpeciesId,
    dominantSpeciesIds,
    nativeSpeciesIds,
    colonizationPattern,
    populationScale,
    populationEstimate,
    populationEstimateNumeric,
    droidPrevalence,
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
    presetId: preset?.id || '',
    ...hooks,
    diagnostics,
    provenance: createProvenance({ presetId: preset?.id || LOCATION_DRAFT_MODE.GENERATE_NEW_PLANET, templateId: '' })
  };
}

/**
 * Reroll ONLY the SUGGEST-tier hooks (`suggestedFactionArchetypeTags`/
 * `suggestedJobArchetypeTags`/`suggestedOppositionTags`/`currentEvents`/
 * `secret`), keeping every other field untouched. Recomputed against
 * the draft's OWN current `tags`, so a hooks reroll after e.g. a
 * government or economy reroll picks up the world's latest context.
 */
export function rerollPlanetHooks(draft, { rng } = {}) {
  return { ...draft, ...generatePlanetHooks({ rng, tags: draft.tags }) };
}

/**
 * Reroll ONLY the world class, recomputing biomes/tags/summary and
 * type; preserves every other field (including name -- a planet's
 * name doesn't imply its class). PHASE 8D-3A: when the draft carries a
 * `presetId`, the reroll stays biased by that preset's `preferTags` --
 * a preset applied at creation stays "sticky" across a world-class
 * reroll rather than only ever applying once.
 */
export function rerollPlanetWorldClass(draft, { rng } = {}) {
  const preset = draft.presetId ? getPlanetPreset(draft.presetId) : null;
  const worldClass = pickPlanetWorldClass({ rng, preferTags: preset?.preferTags || [] });
  const { tags, summary } = composeTagsAndSummary({ worldClass, government: draft.government, stability: draft.stability, economy: draft.economy, hazards: draft.hazards, traits: draft.traits, populationEstimate: draft.populationEstimate });
  const diagnostics = computePlanetDiagnostics({ worldClass, government: draft.government, economy: draft.economy, technologyLevel: draft.technologyLevel, populationScale: draft.populationScale });
  return { ...draft, worldClass, biomes: worldClass.biomes, tags, summary, type: worldClass.locationType, diagnostics };
}

/**
 * Reroll ONLY the government, recomputing tags (which read
 * `government.tags` -- CORRECTED: a prior version of this function
 * left `tags` stale after a government reroll) and the summary. A
 * no-op on an `UNINHABITED` draft -- there is no government to reroll.
 * PHASE 8D-3A: honors the draft's `presetId` (if any), same stickiness
 * rationale as `rerollPlanetWorldClass()`.
 */
export function rerollPlanetGovernment(draft, { rng } = {}) {
  if (draft.populationScale === POPULATION_SCALE.UNINHABITED) return draft;
  const preset = draft.presetId ? getPlanetPreset(draft.presetId) : null;
  const government = pickPlanetGovernment({ rng, preferTags: preset?.preferTags || [] });
  const { tags, summary } = composeTagsAndSummary({ worldClass: draft.worldClass, government, stability: draft.stability, economy: draft.economy, hazards: draft.hazards, traits: draft.traits, populationEstimate: draft.populationEstimate });
  const diagnostics = computePlanetDiagnostics({ worldClass: draft.worldClass, government, economy: draft.economy, technologyLevel: draft.technologyLevel, populationScale: draft.populationScale });
  return { ...draft, government, tags, summary, diagnostics };
}

/** Reroll ONLY the stability, recomposing the summary (which reads it). Also rerolls `economy.illicitTrade`, which reads stability, to avoid leaving it stale. A no-op on an `UNINHABITED` draft -- there is no stability to reroll. */
export function rerollPlanetStability(draft, { rng } = {}) {
  if (draft.populationScale === POPULATION_SCALE.UNINHABITED) return draft;
  const stability = pickPlanetStability({ rng });
  const { summary } = composeTagsAndSummary({ worldClass: draft.worldClass, government: draft.government, stability, economy: draft.economy, hazards: draft.hazards, traits: draft.traits, populationEstimate: draft.populationEstimate });
  const trade = generatePlanetTrade({
    rng,
    primarySector: draft.economy.primarySector,
    secondarySectors: draft.economy.secondarySectors,
    worldClass: draft.worldClass,
    populationScale: draft.populationScale,
    settlementPattern: draft.settlementPattern,
    stabilityValue: stability.value,
    governmentTags: draft.government?.tags || [],
    exportCount: draft.economy.exports.length || 1,
    importCount: draft.economy.imports.length || 1
  });
  return { ...draft, stability, summary, economy: { ...draft.economy, ...trade } };
}

/**
 * Reroll ONLY the economy (primary + secondary sectors + trade),
 * recomputing tags/summary. A no-op on an `UNINHABITED` draft -- there
 * is no economy to reroll. CORRECTED: `secondaryCount` now flows INTO
 * sector generation (via `rollEconomy()`) before trade is resolved,
 * rather than slicing `secondarySectors` down AFTER the Trade Resolver
 * already ran against the full (unsliced) set -- the prior version
 * could leave an export/import referencing a secondary sector that was
 * then removed from the draft.
 */
export function rerollPlanetEconomy(draft, { rng, secondaryCount } = {}) {
  if (draft.populationScale === POPULATION_SCALE.UNINHABITED) return draft;
  const economy = rollEconomy({
    rng,
    preferTags: worldClassPreferenceTags(draft.worldClass),
    worldClass: draft.worldClass,
    populationScale: draft.populationScale,
    settlementPattern: draft.settlementPattern,
    stability: draft.stability,
    secondaryCount
  });
  const { tags, summary } = composeTagsAndSummary({ worldClass: draft.worldClass, government: draft.government, stability: draft.stability, economy, hazards: draft.hazards, traits: draft.traits, populationEstimate: draft.populationEstimate });
  const diagnostics = computePlanetDiagnostics({ worldClass: draft.worldClass, government: draft.government, economy, technologyLevel: draft.technologyLevel, populationScale: draft.populationScale });
  return { ...draft, economy, tags, summary, diagnostics };
}

/** Reroll ONLY the trade (exports/imports/shortages/illicitTrade), keeping the same economy sectors. A no-op on an `UNINHABITED` draft -- there is no trade to reroll. */
export function rerollPlanetTrade(draft, { rng, exportCount, importCount } = {}) {
  if (draft.populationScale === POPULATION_SCALE.UNINHABITED) return draft;
  const trade = generatePlanetTrade({
    rng,
    primarySector: draft.economy.primarySector,
    secondarySectors: draft.economy.secondarySectors,
    worldClass: draft.worldClass,
    populationScale: draft.populationScale,
    settlementPattern: draft.settlementPattern,
    stabilityValue: draft.stability.value,
    governmentTags: draft.government?.tags || [],
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
 * this correction pass fixed.
 *
 * CORRECTED (round 2): a population reroll can cross the `UNINHABITED`
 * boundary in either direction (a settled world rerolled into
 * uninhabited, or vice versa), so the WHOLE civilization block
 * (`technologyLevel`/`government`/`stability`/`economy`, via the same
 * `rollCivilization()` the initial draft uses) was recomputed from the
 * NEW `populationScale` unconditionally -- necessary when crossing the
 * boundary (otherwise a reroll into `UNINHABITED` could leave the
 * previous roll's government/stability/technology level in place), but
 * WRONG for an inhabited -> inhabited reroll, where it threw away a
 * perfectly good, unrelated government/stability/technology/economy
 * for no reason -- the review's own example: a "Reroll Population"
 * click on a Corporate protectorate, Advanced-tech shipbuilding world
 * could silently turn it into a Clan council in Frontier tech running
 * Agriculture, purely because the species distribution changed. That
 * violates the core reroll contract (rerolling one field preserves
 * unrelated fields).
 *
 * CORRECTED (round 3): three branches, matching whether `UNINHABITED`
 * is crossed:
 *  - inhabited -> inhabited: `government`/`stability`/`technologyLevel`/
 *    `economy.primarySector`/`economy.secondarySectors` are PRESERVED
 *    unchanged; only `economy`'s TRADE is recomputed (exports/imports/
 *    shortages/illicitTrade genuinely do depend on the new
 *    `populationScale`/`settlementPattern` -- a hyper-urbanized world
 *    demands differently than a small settlement even with the same
 *    economy sectors).
 *  - inhabited -> uninhabited, or uninhabited -> inhabited: the WHOLE
 *    civilization block is (re)computed via `rollCivilization()`,
 *    exactly as round 2 already did -- this is the one case where
 *    cascading is correct, not a bug.
 *
 * `droidPrevalence` is explicitly NOT touched by any branch -- it is
 * independent of organic population by design (see `planet-profile.js`'s
 * `PLANET_DROID_PREVALENCE`), so a population reroll has no reason to
 * change it.
 */
export function rerollPlanetPopulation(draft, { rng, availableSpeciesIds = [], habitable } = {}) {
  const {
    profile: populationProfile,
    character: populationCharacter,
    dominantSpeciesId,
    dominantSpeciesIds,
    nativeSpeciesIds,
    colonizationPattern,
    populationScale,
    populationEstimate,
    populationEstimateNumeric
  } = generateProceduralPlanetPopulationProfile({
    availableSpeciesIds,
    rng,
    habitable: habitable ?? draft.worldClass?.habitable,
    densityBias: (draft.presetId ? getPlanetPreset(draft.presetId)?.densityBias : '') || draft.worldClass?.populationBias || ''
  });
  const settlementPattern = pickSettlementPattern({ rng, populationScale });

  const wasUninhabited = draft.populationScale === POPULATION_SCALE.UNINHABITED;
  const isUninhabited = populationScale === POPULATION_SCALE.UNINHABITED;

  let technologyLevel, government, stability, economy;
  if (wasUninhabited || isUninhabited) {
    // Crossing the UNINHABITED boundary in either direction: the whole
    // civilization block must be (re)computed from scratch.
    ({ technologyLevel, government, stability, economy } = rollCivilization({
      rng,
      preferTags: worldClassPreferenceTags(draft.worldClass),
      worldClass: draft.worldClass,
      populationScale,
      settlementPattern
    }));
  } else {
    // Staying inhabited: preserve government/stability/technologyLevel/
    // sectors untouched. Only trade is recomputed -- it genuinely
    // depends on the new populationScale/settlementPattern.
    technologyLevel = draft.technologyLevel;
    government = draft.government;
    stability = draft.stability;
    const trade = generatePlanetTrade({
      rng,
      primarySector: draft.economy.primarySector,
      secondarySectors: draft.economy.secondarySectors,
      worldClass: draft.worldClass,
      populationScale,
      settlementPattern,
      stabilityValue: stability?.value ?? '',
      governmentTags: government?.tags || [],
      exportCount: draft.economy.exports.length || 1,
      importCount: draft.economy.imports.length || 1
    });
    economy = { primarySector: draft.economy.primarySector, secondarySectors: draft.economy.secondarySectors, ...trade };
  }

  const { tags, summary } = composeTagsAndSummary({ worldClass: draft.worldClass, government, stability, economy, hazards: draft.hazards, traits: draft.traits, populationEstimate });
  const diagnostics = computePlanetDiagnostics({ worldClass: draft.worldClass, government, economy, technologyLevel, populationScale });
  return {
    ...draft,
    populationProfile,
    populationCharacter,
    dominantSpeciesId,
    dominantSpeciesIds,
    nativeSpeciesIds,
    colonizationPattern,
    populationScale,
    populationEstimate,
    populationEstimateNumeric,
    settlementPattern,
    technologyLevel,
    government,
    stability,
    economy,
    tags,
    summary,
    diagnostics
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

/** Reroll ONLY the technology level. A no-op on an `UNINHABITED` draft -- there is no technology level to reroll. */
export function rerollPlanetTechnologyLevel(draft, { rng } = {}) {
  if (draft.populationScale === POPULATION_SCALE.UNINHABITED) return draft;
  const technologyLevel = pickPlanetTechnologyLevel({ rng });
  const diagnostics = computePlanetDiagnostics({ worldClass: draft.worldClass, government: draft.government, economy: draft.economy, technologyLevel, populationScale: draft.populationScale });
  return { ...draft, technologyLevel, diagnostics };
}

/** Reroll ONLY the droid prevalence. Always meaningful, including on an `UNINHABITED` draft -- droid prevalence is independent of organic population (see `planet-profile.js`'s `PLANET_DROID_PREVALENCE`). Re-applies the same technology-level/economy-tag context skew the initial roll used. */
export function rerollPlanetDroidPrevalence(draft, { rng } = {}) {
  return { ...draft, droidPrevalence: pickPlanetDroidPrevalence({ rng, technologyLevel: draft.technologyLevel || '', economyTags: economySectorTags(draft.economy) }) };
}
