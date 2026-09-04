import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — PHASE 8D-3A: PROCEDURAL LOCATIONS
// PRODUCTIONIZATION.
//
// Builds on Phase 8D-1/8D-2's foundation (independently reviewed and
// closed) by turning the procedural planet/POI groundwork into a
// production-sized generator: production-scale catalog expansions
// (planet names, world classes, climate/hydrosphere/atmosphere/
// gravity, traits/hazards/history hooks, governments/stability/
// economy sectors, the Galactic Commodity Catalog, POI templates, POI
// naming component pools), demographic production rules (species
// prevalence, native/dominant colonization patterns, numeric
// population estimates), context-sensitive droid prevalence and Trade
// Resolver tuning, a planet+POI bundle generator with reroll/
// regenerate operations that never silently destroy sibling POIs, a
// 20-preset planet presets system, SUGGEST-tier hooks (Faction/Job
// archetype suggestions, opposition tags, current events, a GM-only
// secret), and an expanded diagnostics/summary-composition pass.
//
// This phase generates Location FACTS only -- exactly like 8D-1/8D-2,
// it NEVER creates a canonical Actor/Faction/Job/Scene/Journal/
// LocationRegistry record, and the GENERATE/SUGGEST/RESOLVE boundary
// is preserved throughout (suggestedFactionArchetypeTags/
// suggestedJobArchetypeTags/suggestedOppositionTags are narrative
// hints, never actual Factions/Jobs/Intel).

registerFoundryPathLoader();
installFoundryShimGlobals();

const abs = (rel) => `/systems/foundryvtt-swse/${rel}`;

// ------------------------------------------------------------
// Catalog quality
// ------------------------------------------------------------
{
  const { PROCEDURAL_PLANET_NAMES } = await import(abs('scripts/generation/data/procedural-planet-names.js'));
  const { PLANET_NAME_PREFIXES, PLANET_NAME_SUFFIXES } = await import(abs('scripts/generation/data/planet-name-syllables.js'));
  const { LOCATION_LIBRARY_SEEDS } = await import(abs('scripts/locations/location-library-seeds.js'));

  assert.ok(PROCEDURAL_PLANET_NAMES.length >= 450 && PROCEDURAL_PLANET_NAMES.length <= 550, `PROCEDURAL_PLANET_NAMES must land in the ~500 production target (450-550), got ${PROCEDURAL_PLANET_NAMES.length}`);
  const nameSet = new Set(PROCEDURAL_PLANET_NAMES.map((e) => e.value));
  assert.equal(nameSet.size, PROCEDURAL_PLANET_NAMES.length, 'PROCEDURAL_PLANET_NAMES must contain no duplicate values');
  const libraryPlanetNames = new Set(
    LOCATION_LIBRARY_SEEDS.filter((seed) => seed.type === 'planet' || seed.category === 'planetary').map((seed) => seed.name)
  );
  const collisions = [...nameSet].filter((n) => libraryPlanetNames.has(n));
  assert.deepEqual(collisions, [], 'PROCEDURAL_PLANET_NAMES must never collide with a real curated Location Library planet name');

  assert.ok(PLANET_NAME_PREFIXES.length >= 150, `PLANET_NAME_PREFIXES (also backs system/sector-root naming) must be 150+, got ${PLANET_NAME_PREFIXES.length}`);
  assert.ok(PLANET_NAME_SUFFIXES.length >= 100, `PLANET_NAME_SUFFIXES must be 100+, got ${PLANET_NAME_SUFFIXES.length}`);

  const { WORLD_CLASS, PLANET_GRAVITY, PLANET_ATMOSPHERE } = await import(abs('scripts/generation/planets/planet-quality-tables.js'));
  assert.ok(WORLD_CLASS.length >= 30 && WORLD_CLASS.length <= 50, `WORLD_CLASS must land in the 30-50 production target, got ${WORLD_CLASS.length}`);
  for (const entry of WORLD_CLASS) {
    assert.ok(entry.value && entry.locationType && Array.isArray(entry.biomes) && Array.isArray(entry.tags), `WORLD_CLASS entry "${entry.value}" must carry value/locationType/biomes/tags`);
    assert.ok(typeof entry.habitable === 'boolean', `WORLD_CLASS entry "${entry.value}" must carry a boolean habitable flag`);
  }
  assert.ok(PLANET_GRAVITY.length === 6, `PLANET_GRAVITY must have exactly 6 tuned categories, got ${PLANET_GRAVITY.length}`);
  assert.ok(PLANET_ATMOSPHERE.length >= 12, `PLANET_ATMOSPHERE must be 12+, got ${PLANET_ATMOSPHERE.length}`);

  const { PLANET_CLIMATE, PLANET_HYDROSPHERE } = await import(abs('scripts/generation/planets/planet-profile.js'));
  assert.ok(Object.keys(PLANET_CLIMATE).length >= 15 && Object.keys(PLANET_CLIMATE).length <= 25, `PLANET_CLIMATE must land in the 15-25 target, got ${Object.keys(PLANET_CLIMATE).length}`);
  assert.ok(Object.keys(PLANET_HYDROSPHERE).length >= 12, `PLANET_HYDROSPHERE must be 12+, got ${Object.keys(PLANET_HYDROSPHERE).length}`);

  const { PLANET_TRAITS } = await import(abs('scripts/generation/data/planet-traits.js'));
  const { PLANET_HAZARDS } = await import(abs('scripts/generation/data/planet-hazards.js'));
  const { PLANET_HISTORY_HOOKS } = await import(abs('scripts/generation/data/planet-history-hooks.js'));
  assert.ok(PLANET_TRAITS.length >= 100 && PLANET_TRAITS.length <= 150, `PLANET_TRAITS must land in the 100-150 target, got ${PLANET_TRAITS.length}`);
  assert.ok(PLANET_HAZARDS.length >= 75 && PLANET_HAZARDS.length <= 100, `PLANET_HAZARDS must land in the 75-100 target, got ${PLANET_HAZARDS.length}`);
  assert.ok(PLANET_HISTORY_HOOKS.length >= 100 && PLANET_HISTORY_HOOKS.length <= 150, `PLANET_HISTORY_HOOKS must land in the 100-150 target, got ${PLANET_HISTORY_HOOKS.length}`);
  for (const [name, pool] of [['PLANET_TRAITS', PLANET_TRAITS], ['PLANET_HAZARDS', PLANET_HAZARDS], ['PLANET_HISTORY_HOOKS', PLANET_HISTORY_HOOKS]]) {
    const seen = new Set();
    for (const entry of pool) {
      assert.ok(!seen.has(entry.value), `${name} must contain no duplicate values (dup: "${entry.value}")`);
      seen.add(entry.value);
    }
  }

  const { PLANET_GOVERNMENTS } = await import(abs('scripts/generation/data/planet-governments.js'));
  const { PLANET_STABILITY } = await import(abs('scripts/generation/planets/planet-stability.js'));
  const { PLANET_ECONOMIES } = await import(abs('scripts/generation/data/planet-economies.js'));
  const { GALACTIC_COMMODITIES } = await import(abs('scripts/generation/data/galactic-commodities.js'));
  assert.ok(PLANET_GOVERNMENTS.length >= 40 && PLANET_GOVERNMENTS.length <= 60, `PLANET_GOVERNMENTS must land in the 40-60 target, got ${PLANET_GOVERNMENTS.length}`);
  assert.ok(Object.keys(PLANET_STABILITY).length >= 20 && Object.keys(PLANET_STABILITY).length <= 30, `PLANET_STABILITY must land in the 20-30 target, got ${Object.keys(PLANET_STABILITY).length}`);
  assert.ok(PLANET_ECONOMIES.length >= 50 && PLANET_ECONOMIES.length <= 75, `PLANET_ECONOMIES must land in the 50-75 target, got ${PLANET_ECONOMIES.length}`);
  assert.ok(GALACTIC_COMMODITIES.length >= 150 && GALACTIC_COMMODITIES.length <= 250, `GALACTIC_COMMODITIES must land in the 150-250 target, got ${GALACTIC_COMMODITIES.length}`);

  // Every PLANET_ECONOMIES sector slug must have at least one matching commodity (producedBy or demandedBy) -- no sector is dead metadata.
  const economySectorSlugs = new Set(PLANET_ECONOMIES.map((e) => e.sector).filter((s) => s && s !== 'none'));
  const commodityTagCoverage = new Set(GALACTIC_COMMODITIES.flatMap((c) => [...(c.producedBy || []), ...(c.demandedBy || [])]));
  const uncoveredSectors = [...economySectorSlugs].filter((slug) => !commodityTagCoverage.has(slug));
  assert.deepEqual(uncoveredSectors, [], `every PLANET_ECONOMIES sector slug must have at least one matching GALACTIC_COMMODITIES producedBy/demandedBy entry (uncovered: ${uncoveredSectors.join(', ')})`);
  // The new PHASE 8D-3A sector slugs specifically must be covered.
  for (const newSector of ['entertainment', 'luxury', 'research', 'education', 'salvage', 'security']) {
    assert.ok(commodityTagCoverage.has(newSector), `new economy sector "${newSector}" must have matching commodity coverage`);
  }

  const { POI_TEMPLATES } = await import(abs('scripts/generation/data/poi-templates.js'));
  const { isLocationLibraryBiome } = await import(abs('scripts/locations/location-library-seeds.js'));
  assert.ok(POI_TEMPLATES.length >= 150 && POI_TEMPLATES.length <= 250, `POI_TEMPLATES must land in the 150-250 production target, got ${POI_TEMPLATES.length}`);
  const poiValueSet = new Set();
  const validLocationTypes = new Set(['city', 'region', 'poi', 'base', 'temple', 'facility', 'battlefield', 'force-vergence']);
  for (const entry of POI_TEMPLATES) {
    assert.ok(!poiValueSet.has(entry.value), `POI_TEMPLATES must contain no duplicate values (dup: "${entry.value}")`);
    poiValueSet.add(entry.value);
    assert.ok(validLocationTypes.has(entry.type), `POI_TEMPLATES entry "${entry.value}" must use a real canonical Location type, got "${entry.type}"`);
    for (const biome of entry.biomeAffinities) assert.equal(isLocationLibraryBiome(biome), true, `POI_TEMPLATES entry "${entry.value}"'s biomeAffinities "${biome}" must be a real Library value`);
  }

  const { SETTLEMENT_NAME_ROOTS } = await import(abs('scripts/generation/data/settlement-name-components.js'));
  assert.ok(SETTLEMENT_NAME_ROOTS.length >= 300, `SETTLEMENT_NAME_ROOTS must be 300+, got ${SETTLEMENT_NAME_ROOTS.length}`);
  assert.equal(new Set(SETTLEMENT_NAME_ROOTS.map((e) => e.value)).size, SETTLEMENT_NAME_ROOTS.length, 'SETTLEMENT_NAME_ROOTS must contain no duplicate values');

  const { GEOGRAPHIC_NAME_DESCRIPTORS, GEOGRAPHIC_FEATURE_NOUNS, FACILITY_DESIGNATIONS, DISTRICT_DESCRIPTORS } = await import(abs('scripts/generation/data/poi-place-name-components.js'));
  assert.ok(GEOGRAPHIC_NAME_DESCRIPTORS.length + GEOGRAPHIC_FEATURE_NOUNS.length >= 150, `combined geographic naming components must be 150+, got ${GEOGRAPHIC_NAME_DESCRIPTORS.length + GEOGRAPHIC_FEATURE_NOUNS.length}`);
  assert.ok(FACILITY_DESIGNATIONS.length >= 150, `FACILITY_DESIGNATIONS must be 150+, got ${FACILITY_DESIGNATIONS.length}`);
  assert.ok(DISTRICT_DESCRIPTORS.length >= 100, `DISTRICT_DESCRIPTORS must be 100+, got ${DISTRICT_DESCRIPTORS.length}`);
  for (const [name, pool] of [['GEOGRAPHIC_FEATURE_NOUNS', GEOGRAPHIC_FEATURE_NOUNS], ['FACILITY_DESIGNATIONS', FACILITY_DESIGNATIONS], ['DISTRICT_DESCRIPTORS', DISTRICT_DESCRIPTORS]]) {
    assert.equal(new Set(pool.map((e) => e.value)).size, pool.length, `${name} must contain no duplicate values`);
  }

  const { PLANET_PRESETS, getPlanetPreset, isPlanetPresetId } = await import(abs('scripts/generation/data/planet-presets.js'));
  assert.equal(PLANET_PRESETS.length, 20, `PLANET_PRESETS must have exactly the ~20 named presets, got ${PLANET_PRESETS.length}`);
  assert.equal(new Set(PLANET_PRESETS.map((p) => p.id)).size, PLANET_PRESETS.length, 'PLANET_PRESETS ids must all be unique');
  assert.equal(isPlanetPresetId('mining-world'), true, 'a real preset id must validate');
  assert.equal(getPlanetPreset('not-a-real-preset'), null, 'an unknown preset id must resolve to null, never throw');

  console.log('PHASE 8D-3A catalog quality (planet names/prefixes/suffixes, world class/climate/hydrosphere/atmosphere/gravity, traits/hazards/history hooks, government/stability/economy + commodity coverage, POI templates, POI naming pools, planet presets) passed.');
}

// ------------------------------------------------------------
// Generation semantics
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const { POPULATION_SCALE, rollPopulationEstimateNumeric, formatPopulationEstimateNumeric, COLONIZATION_PATTERN, isColonizationPattern } = await import(abs('scripts/generation/planets/planet-population.js'));
  const { pickPlanetDroidPrevalence, PLANET_DROID_PREVALENCE } = await import(abs('scripts/generation/planets/planet-profile.js'));
  const { createProceduralPlanetDraft } = await import(abs('scripts/generation/planets/planet-draft.js'));
  const { DIAGNOSTIC_CODE } = await import(abs('scripts/generation/lib/generator-diagnostics.js'));

  // Numeric population estimate stays within its own scale's band, and UNINHABITED is always exactly 0.
  assert.equal(rollPopulationEstimateNumeric(POPULATION_SCALE.UNINHABITED, { rng: makeSeededRng(1) }), 0, 'UNINHABITED numeric population estimate must be exactly 0, never null');
  for (let seed = 0; seed < 200; seed++) {
    const n = rollPopulationEstimateNumeric(POPULATION_SCALE.OUTPOST, { rng: makeSeededRng(seed) });
    assert.ok(n >= 5 && n <= 99, `seed ${seed}: OUTPOST numeric estimate must stay within its band, got ${n}`);
  }
  assert.equal(formatPopulationEstimateNumeric(1234), 'approximately 1.2 thousand', 'formatPopulationEstimateNumeric must format with an order-of-magnitude label');
  assert.equal(formatPopulationEstimateNumeric(0), 'no permanent population', 'formatPopulationEstimateNumeric must special-case 0');

  // Droid prevalence: an advanced-tech, industrial-economy context should skew toward HIGH/VERY_HIGH/AUTOMATED more than a bare context.
  const HIGH_TIER = new Set([PLANET_DROID_PREVALENCE.HIGH, PLANET_DROID_PREVALENCE.VERY_HIGH, PLANET_DROID_PREVALENCE.AUTOMATED]);
  let highTech = 0, baseline = 0;
  const N = 1000;
  for (let i = 0; i < N; i++) {
    if (HIGH_TIER.has(pickPlanetDroidPrevalence({ rng: makeSeededRng(i), technologyLevel: 'cutting-edge', economyTags: ['manufacturing', 'technology'] }))) highTech++;
    if (HIGH_TIER.has(pickPlanetDroidPrevalence({ rng: makeSeededRng(i) }))) baseline++;
  }
  assert.ok(highTech > baseline * 1.3, `cutting-edge/manufacturing context must meaningfully raise high-tier droid prevalence (got ${highTech}/${N} vs baseline ${baseline}/${N})`);

  // Colonization pattern + native/dominant species split are real, valid values on a generated draft.
  for (let seed = 0; seed < 100; seed++) {
    const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed), availableSpeciesIds: ['species-human', 'species-twilek', 'species-rodian'] });
    if (d.populationScale === POPULATION_SCALE.UNINHABITED) continue;
    assert.equal(isColonizationPattern(d.colonizationPattern), true, `seed ${seed}: colonizationPattern must be a real COLONIZATION_PATTERN value`);
    assert.ok(Array.isArray(d.nativeSpeciesIds) && Array.isArray(d.dominantSpeciesIds), `seed ${seed}: native/dominant species ids must be arrays`);
  }

  // Trade Resolver: an unstable/lawless-flavored, single-sector world under population pressure can shortage WITHOUT a direct environmental scarcity match, and a crime-syndicate government raises illicit trade likelihood -- both are strict WIDENINGS over the prior 8D-2 behavior, verified statistically.
  const { generatePlanetTrade } = await import(abs('scripts/generation/planets/planet-trade.js'));
  let sawShortageUnderPressure = false;
  for (let seed = 0; seed < 2000; seed++) {
    const t = generatePlanetTrade({
      rng: makeSeededRng(seed),
      primarySector: { sector: 'technology', tags: ['urban'] },
      secondarySectors: [],
      worldClass: { biomes: ['urban'], tags: ['cosmopolitan'] },
      populationScale: POPULATION_SCALE.HYPER_URBANIZED,
      settlementPattern: 'ecumenopolis',
      stabilityValue: 'unstable'
    });
    if (t.shortages.length > 0) { sawShortageUnderPressure = true; break; }
  }
  assert.ok(sawShortageUnderPressure, 'a hyper-urbanized, unstable, single-sector world must be able to roll a shortage even with no direct environmental scarcity match');

  let illicitWithCrimeGov = 0, illicitBaseline = 0;
  for (let i = 0; i < 500; i++) {
    const withGov = generatePlanetTrade({ rng: makeSeededRng(i), primarySector: { sector: 'trade', tags: [] }, worldClass: { biomes: [], tags: [] }, populationScale: POPULATION_SCALE.SETTLED, settlementPattern: 'settled', stabilityValue: 'stable', governmentTags: ['crime-syndicate'] });
    if (withGov.illicitTrade.length) illicitWithCrimeGov++;
    const base = generatePlanetTrade({ rng: makeSeededRng(i), primarySector: { sector: 'trade', tags: [] }, worldClass: { biomes: [], tags: [] }, populationScale: POPULATION_SCALE.SETTLED, settlementPattern: 'settled', stabilityValue: 'stable', governmentTags: [] });
    if (base.illicitTrade.length) illicitBaseline++;
  }
  assert.ok(illicitWithCrimeGov > illicitBaseline, `a crime-syndicate-tagged government must raise illicit trade likelihood (got ${illicitWithCrimeGov}/500 vs baseline ${illicitBaseline}/500)`);

  // POI naming style dispatch: every generated POI's nameDraft.style matches its template's canonical type, and every name ends with its template's label regardless of style.
  const { createProceduralPoiDraft } = await import(abs('scripts/generation/planets/poi-generator.js'));
  const { poiNameStyleForType } = await import(abs('scripts/generation/names/poi-place-name-generator.js'));
  const stylesSeen = new Set();
  for (let seed = 0; seed < 1000; seed++) {
    const p = createProceduralPoiDraft({ rng: makeSeededRng(seed) });
    assert.equal(p.nameDraft.style, poiNameStyleForType(p.template.type), `seed ${seed}: POI nameDraft.style must match poiNameStyleForType(template.type)`);
    assert.ok(p.name.endsWith(p.template.label), `seed ${seed}: POI name must end with its template label regardless of naming style`);
    stylesSeen.add(p.nameDraft.style);
  }
  assert.equal(stylesSeen.size, 4, `all 4 POI naming styles must be reachable in practice, saw: ${[...stylesSeen].join(', ')}`);

  // Planet presets meaningfully bias generation (direct pick-level check, isolating the mechanism from whole-draft noise).
  const { generatePlanetSuggestedFactionArchetypeTags } = await import(abs('scripts/generation/planets/planet-hooks.js'));
  let withPreference = 0, withoutPreference = 0;
  const criminalArchetypes = new Set(['criminal_syndicate', 'pirates', 'smuggler_network', 'street_gang', 'secret_society']);
  for (let i = 0; i < 1000; i++) {
    if (generatePlanetSuggestedFactionArchetypeTags({ rng: makeSeededRng(i), preferTags: ['crime-syndicate', 'black-market'], count: 3 }).some((t) => criminalArchetypes.has(t))) withPreference++;
    if (generatePlanetSuggestedFactionArchetypeTags({ rng: makeSeededRng(i + 999999), preferTags: [], count: 3 }).some((t) => criminalArchetypes.has(t))) withoutPreference++;
  }
  assert.ok(withPreference > withoutPreference * 1.2, `crime-syndicate/black-market preferTags must meaningfully raise criminal-archetype suggestion rate (got ${withPreference}/1000 vs ${withoutPreference}/1000)`);

  // Diagnostics: all three new PHASE 8D-3A codes are reachable, and always empty for an UNINHABITED world.
  let sawTrade = false, sawGovPop = false, sawTechPop = false;
  for (let seed = 0; seed < 5000; seed++) {
    const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 2000000) });
    assert.ok(Array.isArray(d.diagnostics), `seed ${seed}: diagnostics must always be an array`);
    if (d.populationScale === POPULATION_SCALE.UNINHABITED) { assert.deepEqual(d.diagnostics, [], `seed ${seed}: an UNINHABITED world must have empty diagnostics`); continue; }
    if (d.diagnostics.includes(DIAGNOSTIC_CODE.TRADE_CONTEXT_MISMATCH)) sawTrade = true;
    if (d.diagnostics.includes(DIAGNOSTIC_CODE.GOVERNMENT_POPULATION_MISMATCH)) sawGovPop = true;
    if (d.diagnostics.includes(DIAGNOSTIC_CODE.TECHNOLOGY_POPULATION_MISMATCH)) sawTechPop = true;
  }
  assert.ok(sawTrade && sawGovPop && sawTechPop, `all three new diagnostic codes must be reachable (trade=${sawTrade}, govPop=${sawGovPop}, techPop=${sawTechPop})`);

  console.log('PHASE 8D-3A generation semantics (numeric population estimate, context-sensitive droid prevalence, colonization pattern, Trade Resolver shortage/illicit-trade widening, POI naming style dispatch, planet preset bias, diagnostics reachability) passed.');
}

// ------------------------------------------------------------
// Bundle generation, reroll safety, and determinism
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const {
    generateProceduralPlanetBundle,
    regeneratePlanetAndPois,
    rerollPlanetFactsOnly,
    regenerateEnvironment,
    regenerateCivilization,
    addPoiToBundle,
    removePoiFromBundle,
    rerollPoiInBundle
  } = await import(abs('scripts/generation/planets/planet-bundle.js'));
  const { poiCountForPopulationScale } = await import(abs('scripts/generation/planets/poi-generator.js'));
  const { POPULATION_SCALE } = await import(abs('scripts/generation/planets/planet-population.js'));
  const { LOCATION_DRAFT_MODE } = await import(abs('scripts/generation/location-draft.js'));

  // poiCountForPopulationScale: every scale resolves within its own tuned range, and a denser scale trends higher than a sparser one.
  for (let seed = 0; seed < 200; seed++) {
    const outpostCount = poiCountForPopulationScale(POPULATION_SCALE.OUTPOST, { rng: makeSeededRng(seed) });
    assert.ok(outpostCount >= 1 && outpostCount <= 3, `seed ${seed}: OUTPOST POI count must stay in [1,3], got ${outpostCount}`);
    const hyperCount = poiCountForPopulationScale(POPULATION_SCALE.HYPER_URBANIZED, { rng: makeSeededRng(seed) });
    assert.ok(hyperCount >= 7 && hyperCount <= 12, `seed ${seed}: HYPER_URBANIZED POI count must stay in [7,12], got ${hyperCount}`);
  }

  // Bundle shape + parentDraftId linkage over many seeds.
  for (let seed = 0; seed < 100; seed++) {
    const b = generateProceduralPlanetBundle({ rng: makeSeededRng(seed) });
    assert.equal(b.planetDraft.mode, LOCATION_DRAFT_MODE.GENERATE_NEW_PLANET_AND_POI, `seed ${seed}: bundle planet draft must use GENERATE_NEW_PLANET_AND_POI`);
    for (const poi of b.poiDrafts) assert.equal(poi.parentDraftId, b.planetDraft.draftId, `seed ${seed}: every POI's parentDraftId must equal the bundle planet's draftId`);
  }

  // Explicit poiCount override is honored exactly.
  const explicit = generateProceduralPlanetBundle({ rng: makeSeededRng(1), poiCount: 4 });
  assert.equal(explicit.poiDrafts.length, 4, 'an explicit poiCount must be honored exactly');

  // --- reroll safety: a scoped operation NEVER silently destroys sibling POIs (identity-preserving, not just count-preserving) ---
  const base = generateProceduralPlanetBundle({ rng: makeSeededRng(3), poiCount: 5 });

  const factsOnly = rerollPlanetFactsOnly(base, { rng: makeSeededRng(10) });
  assert.equal(factsOnly.poiDrafts, base.poiDrafts, 'rerollPlanetFactsOnly must preserve the exact same poiDrafts array reference');
  assert.equal(factsOnly.planetDraft.worldClass, base.planetDraft.worldClass, 'rerollPlanetFactsOnly must not touch worldClass');
  assert.notEqual(factsOnly.planetDraft.hazards, base.planetDraft.hazards, 'rerollPlanetFactsOnly must actually reroll hazards');

  const envReroll = regenerateEnvironment(base, { rng: makeSeededRng(20) });
  assert.equal(envReroll.poiDrafts, base.poiDrafts, 'regenerateEnvironment must preserve the exact same poiDrafts array reference');

  const civReroll = regenerateCivilization(base, { rng: makeSeededRng(30) });
  assert.equal(civReroll.poiDrafts, base.poiDrafts, 'regenerateCivilization must preserve the exact same poiDrafts array reference');

  const added = addPoiToBundle(base, { rng: makeSeededRng(40) });
  assert.equal(added.poiDrafts.length, base.poiDrafts.length + 1, 'addPoiToBundle must add exactly one POI');
  for (let i = 0; i < base.poiDrafts.length; i++) assert.equal(added.poiDrafts[i], base.poiDrafts[i], `addPoiToBundle must preserve existing sibling POI at index ${i}`);

  const targetId = added.poiDrafts[1].draftId;
  const rerolledOne = rerollPoiInBundle(added, targetId, { rng: makeSeededRng(50) });
  assert.notEqual(rerolledOne.poiDrafts[1], added.poiDrafts[1], 'rerollPoiInBundle must actually change the targeted POI');
  for (let i = 0; i < added.poiDrafts.length; i++) {
    if (i === 1) continue;
    assert.equal(rerolledOne.poiDrafts[i], added.poiDrafts[i], `rerollPoiInBundle must preserve sibling POI at index ${i}, never touch it`);
  }
  assert.equal(rerolledOne.poiDrafts[1].parentDraftId, base.planetDraft.draftId, 'a rerolled POI must keep its parentDraftId');

  const removed = removePoiFromBundle(rerolledOne, targetId);
  assert.equal(removed.poiDrafts.length, rerolledOne.poiDrafts.length - 1, 'removePoiFromBundle must remove exactly one POI');
  assert.ok(!removed.poiDrafts.some((p) => p.draftId === targetId), 'removePoiFromBundle must actually remove the targeted POI');
  const noopRemove = removePoiFromBundle(removed, 'draft:location:not-a-real-id');
  assert.equal(noopRemove, removed, 'removePoiFromBundle must no-op (same object reference) for an unknown draftId');
  const noopReroll = rerollPoiInBundle(removed, 'draft:location:not-a-real-id', { rng: makeSeededRng(1) });
  assert.equal(noopReroll, removed, 'rerollPoiInBundle must no-op (same object reference) for an unknown draftId');

  // regeneratePlanetAndPois is the one whole-bundle operation allowed to replace every POI.
  const regenerated = regeneratePlanetAndPois(base, { rng: makeSeededRng(60) });
  assert.notEqual(regenerated.planetDraft.draftId, base.planetDraft.draftId, 'regeneratePlanetAndPois must produce a wholly new planet draft');

  // --- whole-bundle seeded determinism: the same seed must produce the same generated facts (draftId/timestamps excluded -- those are intentionally non-deterministic identity/wall-clock fields, never facts) ---
  function comparableBundle(b) {
    return {
      planet: {
        name: b.planetDraft.name,
        worldClass: b.planetDraft.worldClass.value,
        climate: b.planetDraft.climate.value,
        hydrosphere: b.planetDraft.hydrosphere.value,
        populationScale: b.planetDraft.populationScale,
        populationEstimateNumeric: b.planetDraft.populationEstimateNumeric,
        technologyLevel: b.planetDraft.technologyLevel,
        government: b.planetDraft.government?.value ?? null,
        stability: b.planetDraft.stability?.value ?? null,
        economySector: b.planetDraft.economy.primarySector?.value ?? null,
        tags: b.planetDraft.tags,
        summary: b.planetDraft.summary,
        diagnostics: b.planetDraft.diagnostics,
        suggestedFactionArchetypeTags: b.planetDraft.suggestedFactionArchetypeTags,
        suggestedJobArchetypeTags: b.planetDraft.suggestedJobArchetypeTags,
        secret: b.planetDraft.secret
      },
      pois: b.poiDrafts.map((p) => ({ template: p.template.value, name: p.name, biomes: p.biomes, tags: p.tags }))
    };
  }
  const runA = generateProceduralPlanetBundle({ rng: makeSeededRng(4242), availableSpeciesIds: ['species-human', 'species-rodian'] });
  const runB = generateProceduralPlanetBundle({ rng: makeSeededRng(4242), availableSpeciesIds: ['species-human', 'species-rodian'] });
  assert.deepEqual(comparableBundle(runA), comparableBundle(runB), 'the same seed must produce IDENTICAL generated facts across two independent bundle generations');
  // Sanity: a DIFFERENT seed must not coincidentally match (guards against a comparableBundle() that's accidentally comparing nothing meaningful).
  const runC = generateProceduralPlanetBundle({ rng: makeSeededRng(99999), availableSpeciesIds: ['species-human', 'species-rodian'] });
  assert.notDeepEqual(comparableBundle(runA), comparableBundle(runC), 'a different seed should not coincidentally produce identical generated facts');

  console.log('PHASE 8D-3A bundle generation (POI-count-by-population-scale, parentDraftId linkage, explicit poiCount override, sibling-preserving scoped reroll/regenerate operations, whole-bundle seeded determinism) passed.');
}

console.log('PHASE 8D-3A procedural locations productionization suite (catalog quality, generation semantics, bundle generation, reroll safety, determinism) passed.');
