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
import { pickPlanetWorldClass, pickPlanetSize, pickPlanetGravity, pickPlanetAtmosphere, definitionalConstraintsFor } from './planet-quality-tables.js';
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
import { pickPlanetRegion, pickSectorName, pickPlanetClimate, pickPlanetHydrosphere, pickPlanetTechnologyLevel, pickPlanetTechnologyAccess, pickPlanetTechnologySpecialties, pickPlanetDroidPrevalence, pickSettlementPattern, PLANET_TECHNOLOGY_ACCESS } from './planet-profile.js';
import { getPlanetPreset } from '../data/planet-presets.js';
import { regionPreferTagsFor, regionDensityBiasFor } from '../data/planet-region-bias.js';
import { generatePlanetHooks, deriveSuggestedOppositionTags } from './planet-hooks.js';
import { DIAGNOSTIC_CODE } from '../lib/generator-diagnostics.js';

const EMPTY_ECONOMY = Object.freeze({ primarySector: null, secondarySectors: Object.freeze([]), exports: Object.freeze([]), imports: Object.freeze([]), shortages: Object.freeze([]), illicitTrade: Object.freeze([]) });

/**
 * PHASE 8D-3A correction pass: `system-name-generator.js`'s own module
 * doc already documents `independent: true` as an intentional,
 * deliberate-opt-in alternative to the planet-derived default -- but no
 * caller in this file ever actually set it, so an independent
 * designation-style system name (e.g. "Kal Reach") could never occur
 * during NORMAL planet generation at all, only if a caller invoked
 * `getRandomSystemName()` directly. The phase spec's own instruction
 * ("designation-style system names should remain relatively uncommon")
 * implies they DO occur sometimes, just rarely -- this constant is that
 * rare chance.
 */
const INDEPENDENT_SYSTEM_NAME_CHANCE = 0.12;

function rollSystemDraft({ rng, planetName, preferTags, independent }) {
  const useIndependent = independent ?? (rng ?? Math.random)() < INDEPENDENT_SYSTEM_NAME_CHANCE;
  return getRandomSystemName({ planetName, independent: useIndependent, rng, preferTags });
}

const POPULATION_SCALE_RANK = Object.freeze({
  [POPULATION_SCALE.OUTPOST]: 0,
  [POPULATION_SCALE.SMALL_SETTLEMENT]: 1,
  [POPULATION_SCALE.SETTLED]: 2,
  [POPULATION_SCALE.POPULOUS]: 3,
  [POPULATION_SCALE.HYPER_URBANIZED]: 4
});

// PHASE 8D-3A R2 fix 10: rescaled for the 7-value PLANET_TECHNOLOGY_LEVEL
// (was `{ primitive: 0, frontier: 1, standard: 2, advanced: 3, 'cutting-edge': 4 }`).
// `TECHNOLOGY_LEVEL_MAX_RANK`/`POPULATION_SCALE_MAX_RANK` let
// `computePlanetDiagnostics()` compare the two ranks on a common 0-1
// scale rather than a raw integer difference, so the mismatch threshold
// stays meaningful if either enum's size changes again later.
const TECHNOLOGY_LEVEL_RANK = Object.freeze({
  primitive: 0,
  'pre-industrial': 1,
  industrial: 2,
  frontier: 3,
  'galactic-standard': 4,
  advanced: 5,
  'cutting-edge': 6
});
const TECHNOLOGY_LEVEL_MAX_RANK = 6;
const POPULATION_SCALE_MAX_RANK = 4;
/**
 * Normalized-rank-difference threshold for `TECHNOLOGY_POPULATION_MISMATCH`
 * (see `computePlanetDiagnostics()`). Chosen to match the pre-expansion
 * behavior's selectivity: the old 5-value scale flagged a mismatch at a
 * raw rank gap of >=3 out of a possible 4 (i.e. >=75% of the full range)
 * -- 0.7 preserves that same "only the more extreme combinations" bar
 * while staying robust to either rank scale's size changing again.
 */
const TECHNOLOGY_POPULATION_MISMATCH_THRESHOLD = 0.7;

/** Government `tags` implying a large administrative apparatus -- an unusual fit for a tiny population (see `computePlanetDiagnostics()`). */
const LARGE_SCALE_GOVERNMENT_TAGS = new Set(['noble-house', 'government-bureaucracy']);
const SMALL_POPULATION_SCALES = new Set([POPULATION_SCALE.OUTPOST, POPULATION_SCALE.SMALL_SETTLEMENT]);

/**
 * PHASE 8D-3A: flag (never fix/discard -- the same "warn about an
 * unusual combination" discipline every `DIAGNOSTIC_CODE` follows)
 * civilization/economy combinations worth a GM's attention:
 *
 *  - `ECONOMY_ENVIRONMENT_MISMATCH`: the rolled economy sector(s) share
 *    NO tag at all with the world's own biome/character context --
 *    structurally possible because `generatePlanetEconomySectors()`
 *    only SOFTLY prefers matching tags, never hard-filters on them
 *    (unlike POI's `pickCompatiblePoiTemplate()`). R2 fix 8: this reuses
 *    `generator-diagnostics.js`'s existing `ECONOMY_ENVIRONMENT_MISMATCH`
 *    code (which already existed for exactly this concept but had no
 *    computer anywhere yet) rather than the separate, redundant
 *    `TRADE_CONTEXT_MISMATCH` this phase had originally introduced.
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
function computePlanetDiagnostics({ worldClass, government, economy, technologyLevel, populationScale, gravity, atmosphere, hydrosphere }) {
  const diagnostics = [];

  // PHASE 8D-3A correction pass (finding #3): environment coherence
  // applies REGARDLESS of population/civilization state (an
  // UNINHABITED barren rock still has a gravity/atmosphere) -- this is
  // the one check in this function not gated by the UNINHABITED
  // short-circuit below. Reuses the EXISTING (previously never
  // actually computed anywhere) `ENVIRONMENT_MISMATCH` code rather
  // than inventing a new one -- see `rerollPlanetWorldClass()`'s own
  // doc for why this can legitimately fire on a real draft: a
  // single-field world-class reroll deliberately preserves the OLD
  // gravity/atmosphere/hydrosphere rather than silently changing them,
  // so a reroll into e.g. "High-Gravity Terrestrial" while gravity
  // stays "Very Low" is flagged, not silently forced or hidden.
  const constraints = definitionalConstraintsFor(worldClass.value);
  const envMismatch = Boolean(
    (constraints.gravity && gravity && !constraints.gravity.includes(gravity.value)) ||
    (constraints.atmosphere && atmosphere && !constraints.atmosphere.includes(atmosphere.value)) ||
    (constraints.hydrosphere && hydrosphere && !constraints.hydrosphere.includes(hydrosphere))
  );
  if (envMismatch) diagnostics.push(DIAGNOSTIC_CODE.ENVIRONMENT_MISMATCH);

  if (populationScale === POPULATION_SCALE.UNINHABITED) return diagnostics;

  const economySectors = [economy.primarySector, ...(economy.secondarySectors || [])].filter(Boolean);
  if (economySectors.length) {
    const sectorTags = mergeTags(...economySectors.map((s) => s.tags || []));
    const worldTags = worldClassPreferenceTags(worldClass);
    if (!sectorTags.some((t) => worldTags.includes(t))) diagnostics.push(DIAGNOSTIC_CODE.ECONOMY_ENVIRONMENT_MISMATCH);
  }

  if (government && SMALL_POPULATION_SCALES.has(populationScale) && (government.tags || []).some((t) => LARGE_SCALE_GOVERNMENT_TAGS.has(t))) {
    diagnostics.push(DIAGNOSTIC_CODE.GOVERNMENT_POPULATION_MISMATCH);
  }

  if (technologyLevel) {
    const techRank = TECHNOLOGY_LEVEL_RANK[technologyLevel] ?? Math.round(TECHNOLOGY_LEVEL_MAX_RANK / 2);
    const scaleRank = POPULATION_SCALE_RANK[populationScale] ?? Math.round(POPULATION_SCALE_MAX_RANK / 2);
    const normalizedRankDiff = Math.abs(techRank / TECHNOLOGY_LEVEL_MAX_RANK - scaleRank / POPULATION_SCALE_MAX_RANK);
    if (normalizedRankDiff >= TECHNOLOGY_POPULATION_MISMATCH_THRESHOLD) diagnostics.push(DIAGNOSTIC_CODE.TECHNOLOGY_POPULATION_MISMATCH);
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

/**
 * PHASE 8D-3A correction pass: shared helper replacing three separate
 * inline `draft.presetId ? getPlanetPreset(draft.presetId) : null`
 * copies -- resolve a draft's own applied preset (or `null` for an
 * unrecognized/empty `presetId`), and its `preferTags` alone (or `[]`).
 * Used by every reroll that keeps a preset "sticky" across itself.
 */
function presetFor(draft) {
  return draft.presetId ? getPlanetPreset(draft.presetId) : null;
}

function presetPreferTagsFor(draft) {
  return presetFor(draft)?.preferTags || [];
}

function presetDensityBiasFor(draft) {
  return presetFor(draft)?.densityBias || '';
}

/**
 * PHASE 8D-3A correction pass (independent review round 2, findings #2
 * and #4B): the single seam every context-sensitive pick/reroll now
 * goes through, replacing what used to be several DIFFERENT,
 * inconsistent preferTags derivations scattered across this file (some
 * rerolls honored only the preset, some only world class, some
 * neither). Merges, in this order:
 *
 *  1. the applied preset's `preferTags` (§33) -- never suppressed by
 *     anything below; a Mining World preset can still produce a Core
 *     mining world, because region tags only ADD alternative matches,
 *     they never remove the preset's own.
 *  2. the rolled region's `preferTags` (`data/planet-region-bias.js`,
 *     finding #2) -- previously `pickPlanetRegion()`'s result was pure
 *     decoration, read by nothing.
 *  3. the rolled world class's own biome/tag context
 *     (`worldClassPreferenceTags()`).
 *
 * `worldClassPreferTagsFor()` is the narrower variant used ONLY to bias
 * the world-class pick itself (which obviously can't include its own
 * not-yet-rolled tags) -- preset + region alone.
 */
function worldClassPreferTagsFor({ presetPreferTags, region }) {
  return mergeTags(presetPreferTags, regionPreferTagsFor(region));
}

function generationPreferenceTags({ presetPreferTags, region, worldClass }) {
  return mergeTags(presetPreferTags, regionPreferTagsFor(region), worldClassPreferenceTags(worldClass));
}

/** Same as `generationPreferenceTags()`, resolved from an existing draft object -- the seam every applicable targeted reroll uses to stay preset/region-sticky. */
function generationPreferenceTagsForDraft(draft) {
  return generationPreferenceTags({ presetPreferTags: presetPreferTagsFor(draft), region: draft.region, worldClass: draft.worldClass });
}

/** Density bias precedence for population-scale weighting: explicit preset > rolled region > the world class's own `populationBias` hint > neutral. */
function densityBiasFor({ presetDensityBias, region, worldClass }) {
  return presetDensityBias || regionDensityBiasFor(region) || worldClass?.populationBias || '';
}

/** The rolled economy's sector `tags`, merged -- the context `pickPlanetDroidPrevalence()` softly skews on (see `planet-profile.js`). Empty for an `UNINHABITED` world (no economy). */
function economySectorTags(economy) {
  return mergeTags(economy.primarySector?.tags || [], ...(economy.secondarySectors || []).map((s) => s.tags || []));
}

/**
 * PHASE 8D-3A R2 fix 10: how many `technologySpecialties` a world gets --
 * softly weighted toward more at higher `technologyLevel`/wider
 * `technologyAccess`, toward zero (the common case) otherwise, but never
 * deterministic: every count from 0-3 stays reachable at any level/access
 * combination (a `primitive` world can still turn out to have one
 * genuinely notable specialty; a `cutting-edge` one can still have none).
 */
function rollTechnologySpecialtyCount({ technologyLevel, technologyAccess, rng }) {
  const levelRank = TECHNOLOGY_LEVEL_RANK[technologyLevel] ?? Math.round(TECHNOLOGY_LEVEL_MAX_RANK / 2);
  let base = levelRank >= 5 ? 2 : levelRank >= 3 ? 1 : 0;
  if (technologyAccess === PLANET_TECHNOLOGY_ACCESS.UBIQUITOUS) base += 1;
  if (technologyAccess === PLANET_TECHNOLOGY_ACCESS.ISOLATED) base = Math.max(0, base - 1);
  const roll = (rng ?? Math.random)();
  if (roll < 0.15) return Math.max(0, base - 1);
  if (roll > 0.85) return Math.min(3, base + 1);
  return base;
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
  //
  // PHASE 8D-3A R2 fix 7: `stability.tags` (`planet-stability.js`'s own
  // `lawless`/`unstable`/`contested`/`fractured`/`civil-war`/etc. tags)
  // is now merged in too -- previously `stability` was received here
  // but only ever read for its `.value` in the summary prose below,
  // never its `.tags`, so a `lawless` or `civil-war` world's own
  // `suggestedOppositionTags` (`planet-hooks.js`'s
  // `deriveSuggestedOppositionTags()`, which explicitly filters for
  // exactly these values) could never actually surface them -- the
  // draft's `tags` field genuinely never carried them.
  const economySectors = [economy.primarySector, ...(economy.secondarySectors || [])].filter(Boolean);
  const tags = mergeTags(
    worldClass.tags,
    economySectors.flatMap((e) => e.tags || []),
    hazards.flatMap((h) => h.tags || []),
    traits.flatMap((t) => t.tags || []),
    government?.tags || [],
    stability?.tags || []
  );
  const summary = composeLocationSummary({
    worldClass: worldClass.value,
    biomes: worldClass.biomes,
    economy: economySectors.map((e) => e.value),
    government: government?.value ?? '',
    population: populationEstimate,
    stability: stability?.value ?? ''
  });
  // PHASE 8D-3A R2 round 3 fix 3: `suggestedOppositionTags` is a pure,
  // deterministic projection of `tags` (`planet-hooks.js`'s
  // `deriveSuggestedOppositionTags()`) -- it must be recomputed
  // wherever `tags` is, or it silently goes stale after any tags-
  // affecting reroll (world class/government/stability/economy/
  // hazards/traits). Every caller of `composeTagsAndSummary()` now
  // returns THIS value alongside `tags` on the draft, so the two can
  // never drift apart. This is the single seam every tags-affecting
  // reroll already goes through, so it needed no new architecture --
  // just capturing a value this function already had everything it
  // needed to compute. The other SUGGEST-tier hooks (`currentEvents`/
  // `secret`/`suggestedFactionArchetypeTags`/`suggestedJobArchetypeTags`)
  // are deliberately NOT recomputed here -- those stay stable until an
  // explicit `rerollPlanetHooks()`, exactly as before.
  return { tags, summary, suggestedOppositionTags: deriveSuggestedOppositionTags(tags) };
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
 * Roll the full "civilization" block (`technologyLevel`/`technologyAccess`/
 * `technologySpecialties`/`government`/`stability`/`economy`) for a world.
 * `UNINHABITED` gates all of it -- see the module-header correction note.
 * `OUTPOST` and every denser scale still roll a real (if modest)
 * government/economy of their own.
 *
 * PHASE 8D-3A: `government` now also reads `preferTags` (previously
 * only `economy` did) -- a pre-existing wiring gap, closed here because
 * it is exactly what makes a planet preset's (`data/planet-presets.js`)
 * intent (e.g. "Corporate Colony," "Military Garrison," "Sacred World")
 * actually reach the government pick, not just world class/economy.
 *
 * PHASE 8D-3A R2 fix 10 (technology production refinement): `economy` now
 * rolls BEFORE `technologyLevel`/`technologyAccess`/`technologySpecialties`
 * (previously technology rolled first) specifically so the technology
 * picks can be softly weighted by the world's ACTUAL rolled economy-sector
 * tags, not just the ambient region/world-class `preferTags` every other
 * field already saw -- a `mining`/`technology`/`shipbuilding`-sector world
 * is now somewhat more likely to roll higher technology, independent of
 * whether its region/world class alone would have suggested that. This
 * reorder is safe: `rollEconomy()`/`generatePlanetEconomySectors()` never
 * read `technologyLevel` themselves, so nothing downstream loses context by
 * moving technology after economy. Every technology field stays a SOFT
 * skew only (§ "do not hard-lock except for clearly incoherent combos" --
 * there are none here) -- every level/access value and every specialty
 * stays reachable regardless of context, just more or less likely.
 */
function rollCivilization({ rng, preferTags, worldClass, populationScale, settlementPattern, secondaryCount }) {
  const isUninhabited = populationScale === POPULATION_SCALE.UNINHABITED;
  const government = isUninhabited ? null : pickPlanetGovernment({ rng, preferTags });
  const stability = isUninhabited ? null : pickPlanetStability({ rng, preferTags });
  const economy = rollEconomy({ rng, preferTags, worldClass, populationScale, settlementPattern, stability, government, secondaryCount });
  const technologyPreferTags = mergeTags(preferTags, economySectorTags(economy));
  const technologyLevel = isUninhabited ? null : pickPlanetTechnologyLevel({ rng, preferTags: technologyPreferTags });
  const technologyAccess = isUninhabited ? null : pickPlanetTechnologyAccess({ rng, preferTags: technologyPreferTags });
  const technologySpecialties = isUninhabited
    ? []
    : pickPlanetTechnologySpecialties({ rng, preferTags: technologyPreferTags, count: rollTechnologySpecialtyCount({ technologyLevel, technologyAccess, rng }) });
  return { technologyLevel, technologyAccess, technologySpecialties, government, stability, economy };
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
  // Region is rolled BEFORE world class specifically so it can bias
  // that pick too (finding #2) -- nothing downstream of world class
  // depended on region being rolled after it.
  const region = pickPlanetRegion({ rng });
  const worldClass = pickPlanetWorldClass({ rng, preferTags: worldClassPreferTagsFor({ presetPreferTags, region }) });
  const preferTags = generationPreferenceTags({ presetPreferTags, region, worldClass });
  // PHASE 8D-3A correction pass (finding #3): a handful of world
  // classes carry a DEFINITIONAL (hard-filtered) gravity/atmosphere/
  // hydrosphere restriction -- see `WORLD_CLASS_DEFINITIONAL_CONSTRAINTS`'s
  // own doc. `envConstraints` is `{}` for the vast majority of world
  // classes, which stay fully soft-weighted exactly as before.
  const envConstraints = definitionalConstraintsFor(worldClass.value);
  const size = pickPlanetSize({ rng });
  const gravity = pickPlanetGravity({ rng, allowedValues: envConstraints.gravity });
  const atmosphere = pickPlanetAtmosphere({ rng, allowedValues: envConstraints.atmosphere });
  const nameDraft = getRandomPlanetName({ rng, preferTags });
  const systemDraft = rollSystemDraft({ rng, planetName: nameDraft.name, preferTags });
  const sector = pickSectorName({ rng });
  const climate = pickPlanetClimate({ rng, preferTags });
  const hydrosphere = pickPlanetHydrosphere({ rng, preferTags, allowedValues: envConstraints.hydrosphere });
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
  } = generateProceduralPlanetPopulationProfile({ availableSpeciesIds, rng, habitable: worldClass.habitable, densityBias: densityBiasFor({ presetDensityBias: preset?.densityBias || '', region, worldClass }) });
  const settlementPattern = pickSettlementPattern({ rng, populationScale });
  const { technologyLevel, technologyAccess, technologySpecialties, government, stability, economy } = rollCivilization({ rng, preferTags, worldClass, populationScale, settlementPattern });
  const droidPrevalence = pickPlanetDroidPrevalence({ rng, technologyLevel: technologyLevel || '', technologyAccess: technologyAccess || '', economyTags: economySectorTags(economy) });
  const hazards = pickPlanetHazards({ rng, preferTags, count: Math.floor((rng ?? Math.random)() * 3) });
  const historyHooks = pickPlanetHistoryHooks({ rng, preferTags, count: 1 });
  const traits = pickPlanetTraits({ rng, preferTags, count: 1 + Math.floor((rng ?? Math.random)() * 3) });
  const { tags, summary } = composeTagsAndSummary({ worldClass, government, stability, economy, hazards, traits, populationEstimate });
  const hooks = generatePlanetHooks({ rng, tags });
  const diagnostics = computePlanetDiagnostics({ worldClass, government, economy, technologyLevel, populationScale, gravity, atmosphere, hydrosphere });

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
    technologyAccess,
    technologySpecialties,
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
 * reroll rather than only ever applying once. Also honors the draft's
 * rolled `region` (correction pass round 2, finding #2) -- region was
 * previously pure decoration, read by nothing.
 *
 * Deliberately does NOT touch gravity/atmosphere/hydrosphere (finding
 * #3) -- "reroll ONLY the world class" means only the world class. If
 * the newly-rolled class carries a DEFINITIONAL environment constraint
 * (`WORLD_CLASS_DEFINITIONAL_CONSTRAINTS`) the PRESERVED
 * gravity/atmosphere/hydrosphere no longer satisfies (e.g. rerolling
 * into "High-Gravity Terrestrial" while gravity stays "Very Low"),
 * that's flagged via `DIAGNOSTIC_CODE.ENVIRONMENT_MISMATCH`, never
 * silently forced to match or silently left inconsistent with no
 * signal -- a GM can then choose to also reroll gravity, or use
 * `regenerateEnvironment()` for a coherent whole-environment reroll.
 */
export function rerollPlanetWorldClass(draft, { rng } = {}) {
  const worldClass = pickPlanetWorldClass({ rng, preferTags: worldClassPreferTagsFor({ presetPreferTags: presetPreferTagsFor(draft), region: draft.region }) });
  const { tags, summary, suggestedOppositionTags } = composeTagsAndSummary({ worldClass, government: draft.government, stability: draft.stability, economy: draft.economy, hazards: draft.hazards, traits: draft.traits, populationEstimate: draft.populationEstimate });
  const diagnostics = computePlanetDiagnostics({ worldClass, government: draft.government, economy: draft.economy, technologyLevel: draft.technologyLevel, populationScale: draft.populationScale, gravity: draft.gravity, atmosphere: draft.atmosphere, hydrosphere: draft.hydrosphere });
  return { ...draft, worldClass, biomes: worldClass.biomes, tags, summary, suggestedOppositionTags, type: worldClass.locationType, diagnostics };
}

/**
 * Reroll ONLY the government, recomputing tags (which read
 * `government.tags` -- CORRECTED: a prior version of this function
 * left `tags` stale after a government reroll) and the summary. A
 * no-op on an `UNINHABITED` draft -- there is no government to reroll.
 * PHASE 8D-3A: honors the draft's `presetId`/`region`/world-class
 * context (`generationPreferenceTagsForDraft()`), same stickiness
 * rationale as `rerollPlanetWorldClass()`.
 */
export function rerollPlanetGovernment(draft, { rng } = {}) {
  if (draft.populationScale === POPULATION_SCALE.UNINHABITED) return draft;
  const government = pickPlanetGovernment({ rng, preferTags: generationPreferenceTagsForDraft(draft) });
  const { tags, summary, suggestedOppositionTags } = composeTagsAndSummary({ worldClass: draft.worldClass, government, stability: draft.stability, economy: draft.economy, hazards: draft.hazards, traits: draft.traits, populationEstimate: draft.populationEstimate });
  const diagnostics = computePlanetDiagnostics({ worldClass: draft.worldClass, government, economy: draft.economy, technologyLevel: draft.technologyLevel, populationScale: draft.populationScale, gravity: draft.gravity, atmosphere: draft.atmosphere, hydrosphere: draft.hydrosphere });
  return { ...draft, government, tags, summary, suggestedOppositionTags, diagnostics };
}

/**
 * Reroll ONLY the stability, recomposing `tags`/`summary` (both read it --
 * R2 fix 7: `tags` previously wasn't recomputed here at all, so a
 * stability reroll into e.g. `lawless`/`civil-war` left the draft's own
 * `tags` field, and therefore `suggestedOppositionTags`, silently stale
 * until an unrelated full reroll happened to recompute them). Also
 * rerolls `economy.illicitTrade`, which reads stability, to avoid
 * leaving it stale. A no-op on an `UNINHABITED` draft -- there is no
 * stability to reroll. PHASE 8D-3A: honors the draft's
 * `presetId`/`region`/world-class context, same stickiness rationale as
 * `rerollPlanetWorldClass()`.
 */
export function rerollPlanetStability(draft, { rng } = {}) {
  if (draft.populationScale === POPULATION_SCALE.UNINHABITED) return draft;
  const stability = pickPlanetStability({ rng, preferTags: generationPreferenceTagsForDraft(draft) });
  const { tags, summary, suggestedOppositionTags } = composeTagsAndSummary({ worldClass: draft.worldClass, government: draft.government, stability, economy: draft.economy, hazards: draft.hazards, traits: draft.traits, populationEstimate: draft.populationEstimate });
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
  return { ...draft, stability, tags, summary, suggestedOppositionTags, economy: { ...draft.economy, ...trade } };
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
    preferTags: generationPreferenceTagsForDraft(draft),
    worldClass: draft.worldClass,
    populationScale: draft.populationScale,
    settlementPattern: draft.settlementPattern,
    stability: draft.stability,
    secondaryCount
  });
  const { tags, summary, suggestedOppositionTags } = composeTagsAndSummary({ worldClass: draft.worldClass, government: draft.government, stability: draft.stability, economy, hazards: draft.hazards, traits: draft.traits, populationEstimate: draft.populationEstimate });
  const diagnostics = computePlanetDiagnostics({ worldClass: draft.worldClass, government: draft.government, economy, technologyLevel: draft.technologyLevel, populationScale: draft.populationScale, gravity: draft.gravity, atmosphere: draft.atmosphere, hydrosphere: draft.hydrosphere });
  return { ...draft, economy, tags, summary, suggestedOppositionTags, diagnostics };
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

/** Reroll ONLY the hazards, recomputing tags. PHASE 8D-3A: honors the draft's `presetId`/`region`/world-class context. */
export function rerollPlanetHazards(draft, { rng, count } = {}) {
  const hazards = pickPlanetHazards({ rng, preferTags: generationPreferenceTagsForDraft(draft), count: count ?? draft.hazards.length });
  const { tags, suggestedOppositionTags } = composeTagsAndSummary({ worldClass: draft.worldClass, government: draft.government, stability: draft.stability, economy: draft.economy, hazards, traits: draft.traits });
  return { ...draft, hazards, tags, suggestedOppositionTags };
}

/** Reroll ONLY the history hooks. Never touches tags/summary (history hooks aren't read by either). PHASE 8D-3A: honors the draft's `presetId`/`region`/world-class context (previously rerolled with NO preference at all, unlike the initial roll). */
export function rerollPlanetHistoryHooks(draft, { rng, count } = {}) {
  return { ...draft, historyHooks: pickPlanetHistoryHooks({ rng, preferTags: generationPreferenceTagsForDraft(draft), count: count ?? draft.historyHooks.length ?? 1 }) };
}

/** Reroll ONLY the traits, recomputing tags. PHASE 8D-3A: honors the draft's `presetId`/`region`/world-class context. */
export function rerollPlanetTraits(draft, { rng, count } = {}) {
  const traits = pickPlanetTraits({ rng, preferTags: generationPreferenceTagsForDraft(draft), count: count ?? draft.traits.length });
  const { tags, suggestedOppositionTags } = composeTagsAndSummary({ worldClass: draft.worldClass, government: draft.government, stability: draft.stability, economy: draft.economy, hazards: draft.hazards, traits });
  return { ...draft, traits, tags, suggestedOppositionTags };
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
    densityBias: densityBiasFor({ presetDensityBias: presetDensityBiasFor(draft), region: draft.region, worldClass: draft.worldClass })
  });
  const settlementPattern = pickSettlementPattern({ rng, populationScale });

  const wasUninhabited = draft.populationScale === POPULATION_SCALE.UNINHABITED;
  const isUninhabited = populationScale === POPULATION_SCALE.UNINHABITED;

  let technologyLevel, technologyAccess, technologySpecialties, government, stability, economy;
  if (wasUninhabited || isUninhabited) {
    // Crossing the UNINHABITED boundary in either direction: the whole
    // civilization block must be (re)computed from scratch.
    //
    // R2 round 3 fix 1: `preferTags` here must be the draft's FULL
    // preset/region/world-class context (`generationPreferenceTagsForDraft()`),
    // not just `worldClassPreferenceTags()` -- the latter silently
    // dropped the draft's preset and region on exactly this boundary-
    // crossing path, e.g. an UNINHABITED -> inhabited reroll on a
    // Mining World preset in the Outer Rim would rebuild government/
    // economy/technology with neither the preset nor the region
    // actually influencing the result.
    ({ technologyLevel, technologyAccess, technologySpecialties, government, stability, economy } = rollCivilization({
      rng,
      preferTags: generationPreferenceTagsForDraft(draft),
      worldClass: draft.worldClass,
      populationScale,
      settlementPattern
    }));
  } else {
    // Staying inhabited: preserve government/stability/technologyLevel/
    // technologyAccess/technologySpecialties/sectors untouched. Only
    // trade is recomputed -- it genuinely depends on the new
    // populationScale/settlementPattern.
    technologyLevel = draft.technologyLevel;
    technologyAccess = draft.technologyAccess;
    technologySpecialties = draft.technologySpecialties;
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

  const { tags, summary, suggestedOppositionTags } = composeTagsAndSummary({ worldClass: draft.worldClass, government, stability, economy, hazards: draft.hazards, traits: draft.traits, populationEstimate });
  const diagnostics = computePlanetDiagnostics({ worldClass: draft.worldClass, government, economy, technologyLevel, populationScale, gravity: draft.gravity, atmosphere: draft.atmosphere, hydrosphere: draft.hydrosphere });
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
    technologyAccess,
    technologySpecialties,
    government,
    stability,
    economy,
    tags,
    summary,
    suggestedOppositionTags,
    diagnostics
  };
}

/**
 * PHASE 8D-3A correction pass (independent review round 2, finding
 * #6): reroll ONLY the species demographic distribution (population
 * character, dominant/native species, colonization pattern) -- pinning
 * population SCALE exactly as it was via
 * `generateProceduralPlanetPopulationProfile()`'s own
 * `populationScaleOverride`, so `populationEstimate`/
 * `populationEstimateNumeric`/`settlementPattern`/`government`/
 * `technologyLevel`/`economy`/`trade` are left completely untouched --
 * distinct from `rerollPlanetPopulation()`, which rerolls the scale
 * ITSELF and can therefore legitimately cascade into the whole
 * civilization block when a reroll crosses the UNINHABITED boundary.
 * `rerollPlanetDemographics()` never crosses that boundary (an already
 * inhabited world stays inhabited at the SAME scale); a no-op on an
 * UNINHABITED draft, exactly like every civilization-block reroll --
 * there is no demographic distribution to reroll on a world with none.
 */
export function rerollPlanetDemographics(draft, { rng, availableSpeciesIds = [] } = {}) {
  if (draft.populationScale === POPULATION_SCALE.UNINHABITED) return draft;
  const {
    profile: populationProfile,
    character: populationCharacter,
    dominantSpeciesId,
    dominantSpeciesIds,
    nativeSpeciesIds,
    colonizationPattern
  } = generateProceduralPlanetPopulationProfile({
    availableSpeciesIds,
    rng,
    habitable: draft.worldClass?.habitable,
    populationScaleOverride: draft.populationScale
  });
  return { ...draft, populationProfile, populationCharacter, dominantSpeciesId, dominantSpeciesIds, nativeSpeciesIds, colonizationPattern };
}

/**
 * PHASE 8D-3A correction pass: `rerollPlanetName()`/`rerollPlanetSystem()`/
 * `rerollPlanetGravity()`/`rerollPlanetAtmosphere()` were missing entirely
 * -- the phase spec's own targeted-reroll checklist (§45) names all four
 * alongside every other planet field, a gap caught on re-check.
 */

/**
 * Reroll ONLY the planet's own name. When the draft's current system
 * name is DERIVED from the planet name (`systemDraft.independent ===
 * false`, the default), the system name is re-derived from the NEW
 * name too -- otherwise a rename would leave a stale, mismatched
 * system name behind (e.g. planet "Kordan" but system "Talora
 * system"). An INDEPENDENT system name (not derived from any one
 * planet) is left untouched, since by definition it never depended on
 * the old name in the first place.
 */
export function rerollPlanetName(draft, { rng } = {}) {
  const nameDraft = getRandomPlanetName({ rng, preferTags: generationPreferenceTagsForDraft(draft) });
  const systemDraft = draft.systemDraft?.independent
    ? draft.systemDraft
    : { ...draft.systemDraft, name: `${nameDraft.name} system`, planetName: nameDraft.name };
  return { ...draft, name: nameDraft.name, nameDraft, system: systemDraft.name, systemDraft };
}

/**
 * Reroll ONLY the system name, from the draft's CURRENT planet name.
 * `independent` forces a style (`true` for a designation-style name
 * independent of the planet, `false` to re-derive from the planet
 * name); omitted, it re-rolls the same rare chance
 * (`INDEPENDENT_SYSTEM_NAME_CHANCE`) initial generation used, so a
 * bare reroll can occasionally flip styles, not just reshuffle within
 * whichever style happened to be rolled first.
 */
export function rerollPlanetSystem(draft, { rng, independent } = {}) {
  const systemDraft = rollSystemDraft({ rng, planetName: draft.name, preferTags: generationPreferenceTagsForDraft(draft), independent });
  return { ...draft, system: systemDraft.name, systemDraft };
}

/** Reroll ONLY the gravity, respecting the CURRENT world class's definitional constraint (PHASE 8D-3A correction pass, finding #3) -- there is never a reason for a targeted gravity reroll to deliberately introduce a contradiction the world class already forbids. Recomputes diagnostics, since this reroll can newly satisfy (or, on an unconstrained world class, never affect) `ENVIRONMENT_MISMATCH`. */
export function rerollPlanetGravity(draft, { rng } = {}) {
  const gravity = pickPlanetGravity({ rng, allowedValues: definitionalConstraintsFor(draft.worldClass.value).gravity });
  const diagnostics = computePlanetDiagnostics({ worldClass: draft.worldClass, government: draft.government, economy: draft.economy, technologyLevel: draft.technologyLevel, populationScale: draft.populationScale, gravity, atmosphere: draft.atmosphere, hydrosphere: draft.hydrosphere });
  return { ...draft, gravity, diagnostics };
}

/** Reroll ONLY the atmosphere, respecting the CURRENT world class's definitional constraint -- see `rerollPlanetGravity()`'s own doc for the rationale this mirrors. */
export function rerollPlanetAtmosphere(draft, { rng } = {}) {
  const atmosphere = pickPlanetAtmosphere({ rng, allowedValues: definitionalConstraintsFor(draft.worldClass.value).atmosphere });
  const diagnostics = computePlanetDiagnostics({ worldClass: draft.worldClass, government: draft.government, economy: draft.economy, technologyLevel: draft.technologyLevel, populationScale: draft.populationScale, gravity: draft.gravity, atmosphere, hydrosphere: draft.hydrosphere });
  return { ...draft, atmosphere, diagnostics };
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
  return { ...draft, climate: pickPlanetClimate({ rng, preferTags: generationPreferenceTagsForDraft(draft) }) };
}

/** Reroll ONLY the hydrosphere, respecting the CURRENT world class's definitional constraint -- see `rerollPlanetGravity()`'s own doc for the rationale this mirrors. */
export function rerollPlanetHydrosphere(draft, { rng } = {}) {
  const hydrosphere = pickPlanetHydrosphere({ rng, preferTags: generationPreferenceTagsForDraft(draft), allowedValues: definitionalConstraintsFor(draft.worldClass.value).hydrosphere });
  const diagnostics = computePlanetDiagnostics({ worldClass: draft.worldClass, government: draft.government, economy: draft.economy, technologyLevel: draft.technologyLevel, populationScale: draft.populationScale, gravity: draft.gravity, atmosphere: draft.atmosphere, hydrosphere });
  return { ...draft, hydrosphere, diagnostics };
}

/**
 * Reroll ONLY the technology level. A no-op on an `UNINHABITED` draft --
 * there is no technology level to reroll. PHASE 8D-3A: honors the draft's
 * `presetId` (if any), same stickiness rationale as `rerollPlanetWorldClass()`.
 * R2 fix 10: preferTags now also include the draft's CURRENT economy-sector
 * tags -- the same region/world-class/economy soft-weighting context
 * `rollCivilization()` uses at creation -- so a targeted reroll stays
 * consistent with the world's actual rolled economy, not just its ambient
 * region/world-class context. Leaves `technologyAccess`/
 * `technologySpecialties` completely untouched (single-field reroll
 * discipline -- use `rerollPlanetTechnologyAccess()`/
 * `rerollPlanetTechnologySpecialties()` for those).
 */
export function rerollPlanetTechnologyLevel(draft, { rng } = {}) {
  if (draft.populationScale === POPULATION_SCALE.UNINHABITED) return draft;
  const preferTags = mergeTags(generationPreferenceTagsForDraft(draft), economySectorTags(draft.economy));
  const technologyLevel = pickPlanetTechnologyLevel({ rng, preferTags });
  const diagnostics = computePlanetDiagnostics({ worldClass: draft.worldClass, government: draft.government, economy: draft.economy, technologyLevel, populationScale: draft.populationScale, gravity: draft.gravity, atmosphere: draft.atmosphere, hydrosphere: draft.hydrosphere });
  return { ...draft, technologyLevel, diagnostics };
}

/**
 * PHASE 8D-3A R2 fix 10: reroll ONLY `technologyAccess`, preserving
 * `technologyLevel`/`technologySpecialties`/everything else. A no-op on
 * an `UNINHABITED` draft, matching every other civilization-block field.
 */
export function rerollPlanetTechnologyAccess(draft, { rng } = {}) {
  if (draft.populationScale === POPULATION_SCALE.UNINHABITED) return draft;
  const preferTags = mergeTags(generationPreferenceTagsForDraft(draft), economySectorTags(draft.economy));
  return { ...draft, technologyAccess: pickPlanetTechnologyAccess({ rng, preferTags }) };
}

/**
 * PHASE 8D-3A R2 fix 10: reroll ONLY `technologySpecialties`, preserving
 * `technologyLevel`/`technologyAccess`/everything else. A no-op on an
 * `UNINHABITED` draft. `count`, when supplied, overrides the normal
 * level/access-weighted count roll (see `rollTechnologySpecialtyCount()`)
 * -- e.g. a GM explicitly wanting exactly one specialty rerolled rather
 * than also rerolling how many the world has.
 */
export function rerollPlanetTechnologySpecialties(draft, { rng, count } = {}) {
  if (draft.populationScale === POPULATION_SCALE.UNINHABITED) return draft;
  const preferTags = mergeTags(generationPreferenceTagsForDraft(draft), economySectorTags(draft.economy));
  const resolvedCount = Number.isFinite(count) ? count : rollTechnologySpecialtyCount({ technologyLevel: draft.technologyLevel, technologyAccess: draft.technologyAccess, rng });
  return { ...draft, technologySpecialties: pickPlanetTechnologySpecialties({ rng, preferTags, count: resolvedCount }) };
}

/** Reroll ONLY the droid prevalence. Always meaningful, including on an `UNINHABITED` draft -- droid prevalence is independent of organic population (see `planet-profile.js`'s `PLANET_DROID_PREVALENCE`). Re-applies the same technology-level/technology-access/economy-tag context skew the initial roll used. */
export function rerollPlanetDroidPrevalence(draft, { rng } = {}) {
  return { ...draft, droidPrevalence: pickPlanetDroidPrevalence({ rng, technologyLevel: draft.technologyLevel || '', technologyAccess: draft.technologyAccess || '', economyTags: economySectorTags(draft.economy) }) };
}

/**
 * PHASE 8D-3A R2 round 3 fix 2: reroll the FULL civilization cluster
 * together, in the SAME dependency order `rollCivilization()` uses at
 * creation -- government -> stability -> economy -> technologyLevel ->
 * technologyAccess -> technologySpecialties -> droidPrevalence. This is
 * the one reusable seam for "regenerate civilization as a cohesive
 * whole"; `planet-bundle.js`'s `regenerateCivilization()` composes
 * THIS rather than re-deriving the dependency order independently
 * (which had drifted out of sync with `rollCivilization()`'s ordering
 * once the technology-production refinement landed -- economy must be
 * rerolled BEFORE technology so technology reads the FRESH economy,
 * not the stale pre-reroll one, and technologyAccess/technologySpecialties
 * were missing from the cohesive operation entirely).
 *
 * Composes the existing exported single-field rerolls in sequence
 * (never reimplementing their logic) -- each step's own preferTags/
 * context reads are recomputed from the draft AS IT STANDS after the
 * PREVIOUS step, so this composition alone is what makes the ordering
 * correct: technologyLevel genuinely sees the freshly-rerolled economy
 * because `rerollPlanetTechnologyLevel()` reads `draft.economy` at the
 * time it runs, which by then IS the new economy.
 *
 * Deliberately DOES reroll `droidPrevalence`, unlike every narrower
 * single-field economy/technology reroll (which must preserve it,
 * since those are scoped to touch only their own field) -- this
 * broader cohesive operation is the one case where re-deriving droid
 * prevalence to match the newly-rolled tech/economy context is the
 * correct default, not an unrelated-field violation.
 *
 * A no-op for every OTHER civilization field on an `UNINHABITED` draft
 * (each underlying reroll already no-ops individually), but
 * `droidPrevalence` still rerolls even then -- it stays independent of
 * population/civilization state by design (see `planet-profile.js`'s
 * `PLANET_DROID_PREVALENCE`), exactly like the initial roll.
 */
export function regenerateCivilizationCluster(draft, { rng, secondaryCount } = {}) {
  let next = draft;
  next = rerollPlanetGovernment(next, { rng });
  next = rerollPlanetStability(next, { rng });
  next = rerollPlanetEconomy(next, { rng, secondaryCount });
  next = rerollPlanetTechnologyLevel(next, { rng });
  next = rerollPlanetTechnologyAccess(next, { rng });
  next = rerollPlanetTechnologySpecialties(next, { rng });
  next = rerollPlanetDroidPrevalence(next, { rng });
  return next;
}
