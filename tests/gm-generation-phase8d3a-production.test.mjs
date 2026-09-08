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
    if (d.diagnostics.includes(DIAGNOSTIC_CODE.ECONOMY_ENVIRONMENT_MISMATCH)) sawTrade = true;
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

  // regenerateEnvironment/regenerateCivilization preserve every POI's IDENTITY (draftId/template/name/nameDraft)
  // but REFRESH its parent-derived context (biomes/tags/generatorContext/diagnostics) against the changed planet --
  // finding #5's fix: staleness must become a visible signal, not silently preserved AND not silently hidden.
  const envReroll = regenerateEnvironment(base, { rng: makeSeededRng(20) });
  assert.equal(envReroll.poiDrafts.length, base.poiDrafts.length, 'regenerateEnvironment must preserve the POI count');
  for (let i = 0; i < base.poiDrafts.length; i++) {
    assert.equal(envReroll.poiDrafts[i].draftId, base.poiDrafts[i].draftId, `regenerateEnvironment must preserve POI identity (draftId) at index ${i}`);
    assert.equal(envReroll.poiDrafts[i].template, base.poiDrafts[i].template, `regenerateEnvironment must preserve POI identity (template) at index ${i}`);
    assert.equal(envReroll.poiDrafts[i].name, base.poiDrafts[i].name, `regenerateEnvironment must preserve POI identity (name) at index ${i}`);
    assert.ok(Array.isArray(envReroll.poiDrafts[i].diagnostics), `regenerateEnvironment must leave every POI with a well-formed diagnostics array at index ${i}`);
  }

  const civReroll = regenerateCivilization(base, { rng: makeSeededRng(30) });
  assert.equal(civReroll.poiDrafts.length, base.poiDrafts.length, 'regenerateCivilization must preserve the POI count');
  for (let i = 0; i < base.poiDrafts.length; i++) {
    assert.equal(civReroll.poiDrafts[i].draftId, base.poiDrafts[i].draftId, `regenerateCivilization must preserve POI identity (draftId) at index ${i}`);
    assert.equal(civReroll.poiDrafts[i].template, base.poiDrafts[i].template, `regenerateCivilization must preserve POI identity (template) at index ${i}`);
    assert.equal(civReroll.poiDrafts[i].name, base.poiDrafts[i].name, `regenerateCivilization must preserve POI identity (name) at index ${i}`);
  }

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

// ------------------------------------------------------------
// Correction pass: gaps caught on re-check against the phase spec's
// own checklists (§32 bundle operations, §33 preset schema, §45
// targeted-reroll list) after the initial delivery -- presets had no
// way to influence stability/technology level, independent-style
// system names could never occur during normal generation, four
// planet reroll fields were missing entirely, and the bundle had no
// "reroll all POIs" operation.
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const {
    createProceduralPlanetDraft,
    rerollPlanetName,
    rerollPlanetSystem,
    rerollPlanetGravity,
    rerollPlanetAtmosphere
  } = await import(abs('scripts/generation/planets/planet-draft.js'));
  const { generateProceduralPlanetBundle, regenerateAllPois } = await import(abs('scripts/generation/planets/planet-bundle.js'));
  const { isPlanetStability } = await import(abs('scripts/generation/planets/planet-stability.js'));
  const { isPlanetTechnologyLevel } = await import(abs('scripts/generation/planets/planet-profile.js'));

  // Presets must now measurably bias stability and technology level (previously neither pick function accepted preferTags at all).
  const N = 1000;
  let highTech = 0, baselineTech = 0;
  for (let i = 0; i < N; i++) {
    const d = createProceduralPlanetDraft({ rng: makeSeededRng(i), presetId: 'research-outpost-world' });
    if (d.technologyLevel === 'advanced' || d.technologyLevel === 'cutting-edge') highTech++;
    const b = createProceduralPlanetDraft({ rng: makeSeededRng(i) });
    if (b.technologyLevel === 'advanced' || b.technologyLevel === 'cutting-edge') baselineTech++;
  }
  assert.ok(highTech > baselineTech, `research-outpost-world preset must raise the advanced/cutting-edge technology rate (got ${highTech}/${N} vs baseline ${baselineTech}/${N})`);

  const lawlessLike = new Set(['lawless', 'corrupt', 'fractured', 'contested']);
  let lawlessCount = 0, baselineLawless = 0;
  for (let i = 0; i < N; i++) {
    const d = createProceduralPlanetDraft({ rng: makeSeededRng(i + 500000), presetId: 'pirate-haven-world' });
    if (lawlessLike.has(d.stability?.value)) lawlessCount++;
    const b = createProceduralPlanetDraft({ rng: makeSeededRng(i + 500000) });
    if (lawlessLike.has(b.stability?.value)) baselineLawless++;
  }
  assert.ok(lawlessCount > baselineLawless, `pirate-haven-world preset must raise the lawless-like stability rate (got ${lawlessCount}/${N} vs baseline ${baselineLawless}/${N})`);
  for (let seed = 0; seed < 100; seed++) {
    const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed) });
    if (d.stability) assert.equal(isPlanetStability(d.stability.value), true, `seed ${seed}: stability must still be a real PLANET_STABILITY value`);
    if (d.technologyLevel) assert.equal(isPlanetTechnologyLevel(d.technologyLevel), true, `seed ${seed}: technologyLevel must still be a real PLANET_TECHNOLOGY_LEVEL value`);
  }

  // Independent-style system names must be reachable during NORMAL generation (previously dead: no caller ever passed independent:true) but stay relatively uncommon.
  let independentCount = 0;
  const M = 3000;
  for (let seed = 0; seed < M; seed++) {
    const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 9000000) });
    if (d.systemDraft.independent) independentCount++;
  }
  const independentRate = independentCount / M;
  assert.ok(independentRate > 0.03 && independentRate < 0.25, `independent-style system names must be reachable but relatively uncommon (got rate ${independentRate})`);

  // rerollPlanetName: preserves unrelated fields, re-derives a DERIVED system name from the new planet name, and leaves an INDEPENDENT system name untouched.
  const derivedBase = (() => {
    for (let seed = 0; seed < 200; seed++) {
      const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed) });
      if (!d.systemDraft.independent) return d;
    }
    throw new Error('could not find a derived-system-name draft in 200 seeds');
  })();
  const renamed = rerollPlanetName(derivedBase, { rng: makeSeededRng(1) });
  assert.notEqual(renamed.name, derivedBase.name, 'rerollPlanetName must actually change the name');
  assert.equal(renamed.worldClass, derivedBase.worldClass, 'rerollPlanetName must preserve worldClass');
  assert.equal(renamed.government, derivedBase.government, 'rerollPlanetName must preserve government');
  assert.equal(renamed.system, `${renamed.name} system`, 'rerollPlanetName must re-derive a DERIVED system name from the new planet name');

  const independentBase = (() => {
    for (let seed = 0; seed < 200; seed++) {
      const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 9000000) });
      if (d.systemDraft.independent) return d;
    }
    throw new Error('could not find an independent-system-name draft in 200 seeds');
  })();
  const renamedIndependent = rerollPlanetName(independentBase, { rng: makeSeededRng(1) });
  assert.equal(renamedIndependent.system, independentBase.system, 'rerollPlanetName must leave an INDEPENDENT system name untouched');

  // rerollPlanetSystem: independent forces a style; omitted re-rolls the chance.
  const forcedIndependent = rerollPlanetSystem(derivedBase, { rng: makeSeededRng(5), independent: true });
  assert.equal(forcedIndependent.systemDraft.independent, true, 'rerollPlanetSystem({ independent: true }) must force an independent-style name');
  assert.equal(forcedIndependent.name, derivedBase.name, 'rerollPlanetSystem must never touch the planet name');
  const forcedDerived = rerollPlanetSystem(derivedBase, { rng: makeSeededRng(5), independent: false });
  assert.equal(forcedDerived.system, `${derivedBase.name} system`, 'rerollPlanetSystem({ independent: false }) must force a derived-style name');

  // rerollPlanetGravity / rerollPlanetAtmosphere: preserve unrelated fields.
  const gravityBase = createProceduralPlanetDraft({ rng: makeSeededRng(21) });
  const afterGravity = rerollPlanetGravity(gravityBase, { rng: makeSeededRng(22) });
  assert.equal(afterGravity.worldClass, gravityBase.worldClass, 'rerollPlanetGravity must preserve worldClass');
  assert.equal(afterGravity.name, gravityBase.name, 'rerollPlanetGravity must preserve name');
  const afterAtmosphere = rerollPlanetAtmosphere(gravityBase, { rng: makeSeededRng(23) });
  assert.equal(afterAtmosphere.gravity, gravityBase.gravity, 'rerollPlanetAtmosphere must preserve gravity');
  assert.equal(afterAtmosphere.worldClass, gravityBase.worldClass, 'rerollPlanetAtmosphere must preserve worldClass');

  // regenerateAllPois: keeps the SAME planetDraft, replaces every POI, defaults to the same count, respects an explicit override.
  const bundleBase = generateProceduralPlanetBundle({ rng: makeSeededRng(7), poiCount: 5 });
  const allRerolled = regenerateAllPois(bundleBase, { rng: makeSeededRng(99) });
  assert.equal(allRerolled.planetDraft, bundleBase.planetDraft, 'regenerateAllPois must keep the exact same planetDraft object reference');
  assert.equal(allRerolled.poiDrafts.length, bundleBase.poiDrafts.length, 'regenerateAllPois must default to the same POI count');
  for (let i = 0; i < bundleBase.poiDrafts.length; i++) {
    assert.notEqual(allRerolled.poiDrafts[i], bundleBase.poiDrafts[i], `regenerateAllPois must replace every POI object, index ${i} was left unchanged`);
    assert.equal(allRerolled.poiDrafts[i].parentDraftId, bundleBase.planetDraft.draftId, `regenerated POI at index ${i} must keep parentDraftId linkage`);
  }
  const explicitPoiCount = regenerateAllPois(bundleBase, { rng: makeSeededRng(3), poiCount: 2 });
  assert.equal(explicitPoiCount.poiDrafts.length, 2, 'regenerateAllPois must honor an explicit poiCount override');

  console.log('PHASE 8D-3A correction pass (preset bias reaches stability/technology, independent system names reachable-but-uncommon, missing name/system/gravity/atmosphere rerolls, regenerateAllPois bundle operation) passed.');
}

// ------------------------------------------------------------
// Correction pass round 2: gaps caught by independent review --
// species prevalence weighting used display names while identity used
// IDs (silently inert), region had no generation-bias wiring, world
// class and gravity/atmosphere/hydrosphere could land on physically
// incoherent combinations, presets couldn't reach the bundle
// generator or survive regeneration, and rerollPlanetDemographics
// (species-only, narrower than rerollPlanetPopulation) didn't exist.
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const {
    createProceduralPlanetDraft,
    rerollPlanetDemographics
  } = await import(abs('scripts/generation/planets/planet-draft.js'));
  const { getSpeciesPrevalenceWeight } = await import(abs('scripts/generation/planets/planet-population.js'));
  const { regionPreferTagsFor, regionDensityBiasFor, REGION_GENERATION_BIAS } = await import(abs('scripts/generation/data/planet-region-bias.js'));
  const { PLANET_REGION } = await import(abs('scripts/generation/planets/planet-profile.js'));
  const { definitionalConstraintsFor, WORLD_CLASS_DEFINITIONAL_CONSTRAINTS } = await import(abs('scripts/generation/planets/planet-quality-tables.js'));
  const { generateProceduralPlanetBundle, regeneratePlanetAndPois } = await import(abs('scripts/generation/planets/planet-bundle.js'));

  const HUMAN_ID = 'species-human';
  const OTHER_IDS = ['species-twi-lek', 'species-rodian', 'species-duros', 'species-bothan', 'species-zabrak', 'species-wookiee', 'species-trandoshan'];
  const SPECIES_POOL = [HUMAN_ID, ...OTHER_IDS];

  // Fix #1: prevalence weighting must key off the canonical species ID, not a display name -- a bare-string
  // pool entry (the normal shape callers pass) must resolve to its real prevalence weight, not the neutral default.
  assert.equal(getSpeciesPrevalenceWeight(HUMAN_ID), getSpeciesPrevalenceWeight({ id: HUMAN_ID, name: 'Human' }), 'prevalence weight must match whether the pool entry is a bare ID string or an {id,name} object');
  assert.ok(getSpeciesPrevalenceWeight(HUMAN_ID) > getSpeciesPrevalenceWeight('species-chiss'), 'a high-prevalence species ID must actually outweigh a low-prevalence one');
  {
    let humanDominant = 0;
    const N = 2000;
    for (let seed = 0; seed < N; seed++) {
      const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 42000000), availableSpeciesIds: SPECIES_POOL });
      if (d.dominantSpeciesId === HUMAN_ID) humanDominant++;
    }
    assert.ok(humanDominant / N > 1 / SPECIES_POOL.length, `species-human must dominate more often than a flat 1/${SPECIES_POOL.length} share now that prevalence weighting actually reaches identity (got ${humanDominant}/${N})`);
  }

  // Fix #2: region must have real generation-bias wiring -- every PLANET_REGION value must resolve to a real bias entry, and Core Worlds must measurably raise urban/trade outcomes vs Wild Space.
  for (const region of Object.values(PLANET_REGION)) {
    assert.ok(REGION_GENERATION_BIAS[region], `PLANET_REGION value "${region}" must have a REGION_GENERATION_BIAS entry`);
    assert.ok(Array.isArray(regionPreferTagsFor(region)), `regionPreferTagsFor("${region}") must return an array`);
  }
  assert.equal(regionDensityBiasFor('Core Worlds'), 'dense', 'Core Worlds must carry a dense density bias');
  assert.equal(regionDensityBiasFor('Wild Space'), 'sparse', 'Wild Space must carry a sparse density bias');
  {
    const isUrban = (d) => d.worldClass.tags?.includes('urban') || d.worldClass.biomes?.includes('urban') || d.worldClass.tags?.includes('trade');
    let coreUrban = 0, coreTotal = 0, wildUrban = 0, wildTotal = 0;
    const N = 6000;
    for (let seed = 0; seed < N; seed++) {
      const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 43000000) });
      if (d.region === 'Core Worlds') { coreTotal++; if (isUrban(d)) coreUrban++; }
      else if (d.region === 'Wild Space') { wildTotal++; if (isUrban(d)) wildUrban++; }
    }
    assert.ok(coreTotal > 50 && wildTotal > 50, `test needs enough Core Worlds/Wild Space samples within ${N} seeds (got ${coreTotal}/${wildTotal})`);
    const coreRate = coreUrban / coreTotal, wildRate = wildUrban / wildTotal;
    assert.ok(coreRate > wildRate, `Core Worlds must produce urban/trade-tagged world classes more often than Wild Space (got ${coreUrban}/${coreTotal} vs ${wildUrban}/${wildTotal})`);
  }

  // Fix #3: world-class/environment coherence must be DEFINITIONAL (impossible, not just unlikely) for the constrained classes -- gravity/atmosphere/hydrosphere must never land outside the allowed pool.
  assert.ok(Object.keys(WORLD_CLASS_DEFINITIONAL_CONSTRAINTS).length > 0, 'at least one world class must carry definitional environment constraints');
  for (let seed = 0; seed < 3000; seed++) {
    const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 44000000) });
    const constraints = definitionalConstraintsFor(d.worldClass.value);
    if (constraints.gravity) assert.ok(constraints.gravity.includes(d.gravity.value), `seed ${seed}: world class "${d.worldClass.value}" got an impossible gravity "${d.gravity.value}"`);
    if (constraints.atmosphere) assert.ok(constraints.atmosphere.includes(d.atmosphere.value), `seed ${seed}: world class "${d.worldClass.value}" got an impossible atmosphere "${d.atmosphere.value}"`);
    if (constraints.hydrosphere) assert.ok(constraints.hydrosphere.includes(d.hydrosphere), `seed ${seed}: world class "${d.worldClass.value}" got an impossible hydrosphere "${d.hydrosphere}"`);
  }

  // Fix #4: presets must reach the bundle generator and survive regeneration by default (full stickiness), while still being explicitly overridable/clearable.
  const presetBundle = generateProceduralPlanetBundle({ rng: makeSeededRng(45000001), poiCount: 3, presetId: 'mining-world' });
  assert.equal(presetBundle.planetDraft.presetId, 'mining-world', 'generateProceduralPlanetBundle must forward presetId into the planet draft');
  const regenerated = regeneratePlanetAndPois(presetBundle, { rng: makeSeededRng(45000002) });
  assert.equal(regenerated.planetDraft.presetId, 'mining-world', 'regeneratePlanetAndPois must preserve the preset by default (full stickiness)');
  const regeneratedCleared = regeneratePlanetAndPois(presetBundle, { rng: makeSeededRng(45000003), presetId: '' });
  assert.equal(regeneratedCleared.planetDraft.presetId, '', 'regeneratePlanetAndPois must allow explicitly clearing the preset');
  {
    // preset precedence must be additive (preset tags ∪ region tags), never suppressive -- a mining preset must still be able to land in the Core Worlds.
    let coreMiningFound = false;
    for (let seed = 0; seed < 3000 && !coreMiningFound; seed++) {
      const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 46000000), presetId: 'mining-world' });
      if (d.region === 'Core Worlds') coreMiningFound = true;
    }
    assert.ok(coreMiningFound, 'a mining-world preset must still be able to produce a Core Worlds mining world (preset/region tags must merge, not override each other)');
  }

  // Fix #6: rerollPlanetDemographics must reroll ONLY species-distribution fields, be a true no-op on UNINHABITED, and never touch population scale/government/technology/economy/environment/identity.
  const UNRELATED_KEYS = ['populationScale', 'populationEstimate', 'populationEstimateNumeric', 'settlementPattern', 'government', 'technologyLevel', 'economy', 'trade', 'worldClass', 'region', 'gravity', 'atmosphere', 'hydrosphere', 'name', 'system', 'draftId'];
  let sawInhabited = false, sawUninhabited = false;
  for (let seed = 0; seed < 400 && !(sawInhabited && sawUninhabited); seed++) {
    const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 47000000), availableSpeciesIds: SPECIES_POOL });
    const reroll = rerollPlanetDemographics(d, { rng: makeSeededRng(seed + 47500000), availableSpeciesIds: SPECIES_POOL });
    if (d.populationScale === 'uninhabited') {
      sawUninhabited = true;
      assert.deepEqual(reroll, d, `seed ${seed}: rerollPlanetDemographics must be a true no-op on an UNINHABITED draft`);
    } else {
      sawInhabited = true;
      for (const key of UNRELATED_KEYS) {
        assert.deepEqual(reroll[key], d[key], `seed ${seed}: rerollPlanetDemographics must preserve unrelated field "${key}"`);
      }
    }
  }
  assert.ok(sawInhabited && sawUninhabited, 'the demographics-reroll test must exercise both an inhabited and an uninhabited draft within 400 seeds');
  {
    let changed = 0;
    const N = 300;
    for (let seed = 0; seed < N; seed++) {
      const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 48000000), availableSpeciesIds: SPECIES_POOL });
      if (d.populationScale === 'uninhabited') continue;
      const reroll = rerollPlanetDemographics(d, { rng: makeSeededRng(seed + 48500000), availableSpeciesIds: SPECIES_POOL });
      if (reroll.dominantSpeciesId !== d.dominantSpeciesId || JSON.stringify(reroll.populationProfile) !== JSON.stringify(d.populationProfile)) changed++;
    }
    assert.ok(changed > 0, 'rerollPlanetDemographics must actually change species-distribution fields at least some of the time');
  }

  console.log('PHASE 8D-3A correction pass round 2 (species prevalence by canonical ID, region generation-bias wiring, world-class/environment definitional coherence, preset propagation + stickiness, rerollPlanetDemographics) passed.');
}

// ------------------------------------------------------------
// Correction pass round 2, fix 10: technology production refinement.
// `technologyLevel` expanded from 5 to 7 values (primitive/pre-industrial/
// industrial/frontier/galactic-standard/advanced/cutting-edge); two new
// fields added -- `technologyAccess` (how broadly galactic tech reaches
// this world) and `technologySpecialties` (specific notable capability
// areas, from a centralized catalog); `rollCivilization()` reordered so
// economy rolls before technology, letting the world's ACTUAL economy
// sectors softly weight the technology picks; `TECHNOLOGY_POPULATION_MISMATCH`
// rescaled to a normalized 0-1 rank comparison so it stays meaningful at
// the new enum size; two new targeted rerolls added.
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const {
    createProceduralPlanetDraft,
    rerollPlanetTechnologyLevel,
    rerollPlanetTechnologyAccess,
    rerollPlanetTechnologySpecialties
  } = await import(abs('scripts/generation/planets/planet-draft.js'));
  const {
    PLANET_TECHNOLOGY_LEVEL,
    PLANET_TECHNOLOGY_ACCESS,
    isPlanetTechnologyLevel,
    isPlanetTechnologyAccess,
    isPlanetTechnologySpecialty
  } = await import(abs('scripts/generation/planets/planet-profile.js'));

  const TECH_RANK = { primitive: 0, 'pre-industrial': 1, industrial: 2, frontier: 3, 'galactic-standard': 4, advanced: 5, 'cutting-edge': 6 };
  assert.equal(Object.keys(TECH_RANK).length, Object.values(PLANET_TECHNOLOGY_LEVEL).length, 'the test\'s own rank table must cover every PLANET_TECHNOLOGY_LEVEL value (catches drift if the catalog changes again)');
  for (const v of Object.values(PLANET_TECHNOLOGY_LEVEL)) assert.ok(v in TECH_RANK, `PLANET_TECHNOLOGY_LEVEL value "${v}" must have a rank`);

  // Every technologyLevel AND technologyAccess value must remain reachable -- the soft economy/region/world-class weighting must never make any value unreachable.
  const N = 6000;
  const levelSeen = new Set(), accessSeen = new Set();
  let sawAnySpecialty = false, sawZeroSpecialty = false;
  for (let seed = 0; seed < N; seed++) {
    const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 51000000) });
    if (d.technologyLevel) levelSeen.add(d.technologyLevel);
    if (d.technologyAccess) accessSeen.add(d.technologyAccess);
    if (d.technologySpecialties) {
      if (d.technologySpecialties.length > 0) sawAnySpecialty = true; else sawZeroSpecialty = true;
      for (const s of d.technologySpecialties) assert.ok(isPlanetTechnologySpecialty(s), `"${s}" must be a real cataloged technology specialty`);
    }
    if (d.populationScale === 'uninhabited') {
      assert.equal(d.technologyLevel, null, `seed ${seed}: an UNINHABITED draft must have technologyLevel: null`);
      assert.equal(d.technologyAccess, null, `seed ${seed}: an UNINHABITED draft must have technologyAccess: null`);
      assert.deepEqual(d.technologySpecialties, [], `seed ${seed}: an UNINHABITED draft must have empty technologySpecialties`);
    }
  }
  for (const v of Object.values(PLANET_TECHNOLOGY_LEVEL)) assert.ok(levelSeen.has(v), `technologyLevel value "${v}" must remain reachable within ${N} seeds`);
  for (const v of Object.values(PLANET_TECHNOLOGY_ACCESS)) assert.ok(accessSeen.has(v), `technologyAccess value "${v}" must remain reachable within ${N} seeds`);
  assert.ok(sawAnySpecialty, 'at least some drafts must roll one or more technology specialties');
  assert.ok(sawZeroSpecialty, 'at least some drafts must roll zero technology specialties (the common case)');

  // Economy sectors tagged technology/research/industrial must measurably raise the average technology rank vs. other economies (soft bias, reordering rollCivilization() so economy is rolled first).
  {
    let techEconRankSum = 0, techEconCount = 0, otherRankSum = 0, otherCount = 0;
    const M = 8000;
    for (let seed = 0; seed < M; seed++) {
      const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 52000000) });
      if (!d.technologyLevel) continue;
      const sectors = [d.economy.primarySector, ...(d.economy.secondarySectors || [])].filter(Boolean);
      const hasTechTag = sectors.some((s) => (s.tags || []).some((t) => ['technology', 'research', 'industrial'].includes(t)));
      if (hasTechTag) { techEconRankSum += TECH_RANK[d.technologyLevel]; techEconCount++; }
      else { otherRankSum += TECH_RANK[d.technologyLevel]; otherCount++; }
    }
    assert.ok(techEconCount > 100 && otherCount > 100, `test needs enough samples in both economy buckets within ${M} seeds (got ${techEconCount}/${otherCount})`);
    const techEconAvg = techEconRankSum / techEconCount, otherAvg = otherRankSum / otherCount;
    assert.ok(techEconAvg > otherAvg, `a technology/research/industrial-tagged economy must raise the average technology rank (got ${techEconAvg} vs ${otherAvg})`);
  }

  // TECHNOLOGY_POPULATION_MISMATCH must still be reachable but not dominant at the new 7-value scale.
  {
    let mismatchCount = 0, total = 0;
    const M = 8000;
    for (let seed = 0; seed < M; seed++) {
      const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 53000000) });
      if (!d.technologyLevel) continue;
      total++;
      if (d.diagnostics.includes('technology-population-mismatch')) mismatchCount++;
    }
    const rate = mismatchCount / total;
    assert.ok(rate > 0.01 && rate < 0.3, `TECHNOLOGY_POPULATION_MISMATCH must be reachable but not dominant after the rank rescale (got rate ${rate})`);
  }

  // Targeted rerolls: each touches ONLY its own field, is a no-op on UNINHABITED, and never touches the other two technology fields.
  const UNRELATED_KEYS = ['worldClass', 'region', 'gravity', 'atmosphere', 'hydrosphere', 'name', 'system', 'government', 'stability', 'economy', 'populationScale', 'draftId'];
  let checkedInhabited = 0, checkedUninhabited = 0;
  for (let seed = 0; seed < 600 && (checkedInhabited < 50 || checkedUninhabited < 1); seed++) {
    const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 54000000) });
    if (d.populationScale === 'uninhabited') {
      checkedUninhabited++;
      assert.equal(rerollPlanetTechnologyLevel(d, { rng: makeSeededRng(1) }), d, `seed ${seed}: rerollPlanetTechnologyLevel must be a no-op on UNINHABITED`);
      assert.equal(rerollPlanetTechnologyAccess(d, { rng: makeSeededRng(1) }), d, `seed ${seed}: rerollPlanetTechnologyAccess must be a no-op on UNINHABITED`);
      assert.equal(rerollPlanetTechnologySpecialties(d, { rng: makeSeededRng(1) }), d, `seed ${seed}: rerollPlanetTechnologySpecialties must be a no-op on UNINHABITED`);
      continue;
    }
    checkedInhabited++;

    const rLevel = rerollPlanetTechnologyLevel(d, { rng: makeSeededRng(seed + 1) });
    for (const k of UNRELATED_KEYS) assert.deepEqual(rLevel[k], d[k], `seed ${seed}: rerollPlanetTechnologyLevel must preserve "${k}"`);
    assert.deepEqual(rLevel.technologyAccess, d.technologyAccess, `seed ${seed}: rerollPlanetTechnologyLevel must not touch technologyAccess`);
    assert.deepEqual(rLevel.technologySpecialties, d.technologySpecialties, `seed ${seed}: rerollPlanetTechnologyLevel must not touch technologySpecialties`);
    assert.ok(isPlanetTechnologyLevel(rLevel.technologyLevel), `seed ${seed}: rerollPlanetTechnologyLevel must produce a real value`);

    const rAccess = rerollPlanetTechnologyAccess(d, { rng: makeSeededRng(seed + 2) });
    for (const k of UNRELATED_KEYS) assert.deepEqual(rAccess[k], d[k], `seed ${seed}: rerollPlanetTechnologyAccess must preserve "${k}"`);
    assert.deepEqual(rAccess.technologyLevel, d.technologyLevel, `seed ${seed}: rerollPlanetTechnologyAccess must not touch technologyLevel`);
    assert.deepEqual(rAccess.technologySpecialties, d.technologySpecialties, `seed ${seed}: rerollPlanetTechnologyAccess must not touch technologySpecialties`);
    assert.ok(isPlanetTechnologyAccess(rAccess.technologyAccess), `seed ${seed}: rerollPlanetTechnologyAccess must produce a real value`);

    const rSpecialties = rerollPlanetTechnologySpecialties(d, { rng: makeSeededRng(seed + 3) });
    for (const k of UNRELATED_KEYS) assert.deepEqual(rSpecialties[k], d[k], `seed ${seed}: rerollPlanetTechnologySpecialties must preserve "${k}"`);
    assert.deepEqual(rSpecialties.technologyLevel, d.technologyLevel, `seed ${seed}: rerollPlanetTechnologySpecialties must not touch technologyLevel`);
    assert.deepEqual(rSpecialties.technologyAccess, d.technologyAccess, `seed ${seed}: rerollPlanetTechnologySpecialties must not touch technologyAccess`);
    for (const s of rSpecialties.technologySpecialties) assert.ok(isPlanetTechnologySpecialty(s), `seed ${seed}: rerolled specialty "${s}" must be a real cataloged value`);

    // rerollPlanetTechnologySpecialties with an explicit count must honor it exactly.
    const rSpecialtiesExplicit = rerollPlanetTechnologySpecialties(d, { rng: makeSeededRng(seed + 4), count: 2 });
    assert.equal(rSpecialtiesExplicit.technologySpecialties.length, 2, `seed ${seed}: rerollPlanetTechnologySpecialties({ count: 2 }) must honor an explicit count exactly`);
  }
  assert.ok(checkedInhabited > 40, `the technology reroll test must exercise enough inhabited drafts (got ${checkedInhabited})`);
  assert.ok(checkedUninhabited > 0, 'the technology reroll test must exercise at least one UNINHABITED draft');

  console.log('PHASE 8D-3A correction pass round 2 fix 10 (technology level expansion, technologyAccess/technologySpecialties, economy-before-technology reordering, rescaled mismatch threshold, targeted rerolls) passed.');
}

// ------------------------------------------------------------
// Correction pass round 2, fix 7: `composeTagsAndSummary()` received
// `stability` but never merged `stability.tags` into the draft's own
// `tags` field -- so a `lawless`/`unstable`/`contested`/`civil-war`/etc.
// world's OWN stability could never actually reach
// `planet-hooks.js`'s `deriveSuggestedOppositionTags()`, despite that
// function explicitly filtering for exactly those values. Also fixed
// `rerollPlanetStability()`, which recomposed the summary but not tags.
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const { createProceduralPlanetDraft, rerollPlanetStability } = await import(abs('scripts/generation/planets/planet-draft.js'));
  const { deriveSuggestedOppositionTags } = await import(abs('scripts/generation/planets/planet-hooks.js'));

  const OPPOSITION_RELEVANT_STABILITY_TAGS = ['lawless', 'unstable', 'contested', 'fractured', 'civil-war', 'civil unrest', 'popular-unrest', 'rebellious', 'occupied', 'under-blockade', 'corrupt', 'succession-crisis'];

  // A draft's own `tags` must carry its stability's opposition-relevant tags, and suggestedOppositionTags (derived from those same tags) must therefore surface them too.
  let sawRelevantStability = false;
  for (let seed = 0; seed < 3000; seed++) {
    const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 60000000) });
    if (!d.stability) continue;
    const relevant = (d.stability.tags || []).filter((t) => OPPOSITION_RELEVANT_STABILITY_TAGS.includes(t));
    if (!relevant.length) continue;
    sawRelevantStability = true;
    for (const t of relevant) {
      assert.ok(d.tags.includes(t), `seed ${seed}: draft.tags must include stability tag "${t}" (stability: "${d.stability.value}")`);
    }
    const opposition = deriveSuggestedOppositionTags(d.tags);
    for (const t of relevant) {
      assert.ok(opposition.includes(t), `seed ${seed}: suggestedOppositionTags must surface stability tag "${t}" (stability: "${d.stability.value}")`);
    }
  }
  assert.ok(sawRelevantStability, 'the test must find at least one draft with an opposition-relevant stability within 3000 seeds');

  // rerollPlanetStability must recompute `tags` (previously only `summary`) so the new stability's tags aren't left stale.
  let checkedReroll = 0;
  for (let seed = 0; seed < 500 && checkedReroll < 30; seed++) {
    const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 61000000) });
    if (d.populationScale === 'uninhabited') continue;
    const reroll = rerollPlanetStability(d, { rng: makeSeededRng(seed + 1) });
    checkedReroll++;
    for (const t of reroll.stability.tags || []) {
      assert.ok(reroll.tags.includes(t), `seed ${seed}: rerollPlanetStability must refresh draft.tags to include the new stability's tag "${t}"`);
    }
  }
  assert.ok(checkedReroll > 20, `the rerollPlanetStability tags-refresh test must exercise enough inhabited drafts (got ${checkedReroll})`);

  console.log('PHASE 8D-3A correction pass round 2 fix 7 (stability tags wired into suggestedOppositionTags context) passed.');
}

// ------------------------------------------------------------
// Correction pass round 2, fix 9: `planet-hook-archetypes.js`'s own
// header doc claims `FACTION_ARCHETYPE_TAGS`/`JOB_ARCHETYPE_TAGS` are
// "exactly" their canonical authorities' key sets
// (`organization-metadata.js`'s `FACTION_ARCHETYPE_FAMILY`,
// `jobs/job-archetype-metadata.js`'s `JOB_ARCHETYPE_METADATA`) -- but
// nothing previously verified that claim, so the two could silently
// drift apart. The module now self-checks this at load time (throwing
// immediately on drift, the same discipline `data/planet-region-bias.js`
// established); this test asserts the same invariant explicitly so a
// regression is visible in test output too, not only as an import-time
// crash.
// ------------------------------------------------------------
{
  const { FACTION_ARCHETYPE_TAGS, JOB_ARCHETYPE_TAGS } = await import(abs('scripts/generation/data/planet-hook-archetypes.js'));
  const { FACTION_ARCHETYPE_FAMILY, ORGANIZATION_FAMILY } = await import(abs('scripts/generation/organization-metadata.js'));
  const { JOB_ARCHETYPE_METADATA } = await import(abs('scripts/generation/jobs/job-archetype-metadata.js'));

  const factionValues = new Set(FACTION_ARCHETYPE_TAGS.map((e) => e.value));
  const factionAuthorityKeys = new Set(Object.keys(FACTION_ARCHETYPE_FAMILY));
  assert.deepEqual(factionValues, factionAuthorityKeys, 'FACTION_ARCHETYPE_TAGS values must exactly match FACTION_ARCHETYPE_FAMILY keys (no drift in either direction)');
  for (const entry of FACTION_ARCHETYPE_TAGS) {
    assert.ok(entry.tags.includes(FACTION_ARCHETYPE_FAMILY[entry.value]), `FACTION_ARCHETYPE_TAGS entry "${entry.value}" must carry its canonical ORGANIZATION_FAMILY tag "${FACTION_ARCHETYPE_FAMILY[entry.value]}"`);
    assert.ok(Object.values(ORGANIZATION_FAMILY).includes(FACTION_ARCHETYPE_FAMILY[entry.value]), `"${entry.value}"'s mapped family must be a real ORGANIZATION_FAMILY value`);
  }

  const jobValues = new Set(JOB_ARCHETYPE_TAGS.map((e) => e.value));
  const jobAuthorityKeys = new Set(Object.keys(JOB_ARCHETYPE_METADATA));
  assert.deepEqual(jobValues, jobAuthorityKeys, 'JOB_ARCHETYPE_TAGS values must exactly match JOB_ARCHETYPE_METADATA keys (no drift in either direction)');

  console.log('PHASE 8D-3A correction pass round 2 fix 9 (archetype manifests self-validated against their canonical authorities) passed.');
}

// ------------------------------------------------------------
// Correction pass round 2, secondary observations:
//  - UNINHABITED's POI-count floor is now 0 (a genuinely empty,
//    featureless world is coherent -- it was previously forced to have
//    at least one POI).
//  - real END-TO-END preset tests: previously the only preset-bias
//    assertion below the whole-draft level called the isolated pick
//    function (`generatePlanetSuggestedFactionArchetypeTags`) directly
//    with hand-supplied `preferTags` -- never actually exercising
//    `createProceduralPlanetDraft({ presetId })`'s real preset-resolution
//    path end-to-end for that pick. This block drives the full pipeline:
//    a preset's `densityBias` measurably shifting `populationScale`, and
//    `presetId` actually landing on both the draft and its provenance.
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const { createProceduralPlanetDraft } = await import(abs('scripts/generation/planets/planet-draft.js'));
  const { poiCountForPopulationScale } = await import(abs('scripts/generation/planets/poi-generator.js'));
  const { POPULATION_SCALE } = await import(abs('scripts/generation/planets/planet-population.js'));
  const { getPlanetPreset } = await import(abs('scripts/generation/data/planet-presets.js'));

  // POI floor: UNINHABITED must be able to resolve to 0, and never below 0 or above its documented max.
  let sawZeroPoi = false;
  for (let seed = 0; seed < 3000; seed++) {
    const count = poiCountForPopulationScale(POPULATION_SCALE.UNINHABITED, { rng: makeSeededRng(seed) });
    assert.ok(count >= 0 && count <= 3, `seed ${seed}: UNINHABITED POI count must stay in [0,3], got ${count}`);
    if (count === 0) sawZeroPoi = true;
  }
  assert.ok(sawZeroPoi, 'UNINHABITED must be able to resolve to exactly 0 POIs within 3000 seeds');

  // End-to-end: presetId must actually land on the draft AND its provenance -- via the real createProceduralPlanetDraft() pipeline, not a hand-constructed object.
  const ecumenopolisPreset = getPlanetPreset('ecumenopolis');
  assert.equal(ecumenopolisPreset.densityBias, 'dense', 'test assumes the ecumenopolis preset carries densityBias: "dense" (if this fails, the preset catalog changed -- update the test)');
  const presetDraft = createProceduralPlanetDraft({ rng: makeSeededRng(70000000), presetId: 'ecumenopolis' });
  assert.equal(presetDraft.presetId, 'ecumenopolis', 'createProceduralPlanetDraft({ presetId }) must record the resolved preset id on the draft itself');
  assert.equal(presetDraft.provenance.presetId, 'ecumenopolis', 'createProceduralPlanetDraft({ presetId }) must record the resolved preset id in provenance too');

  // End-to-end: the ecumenopolis preset's densityBias must measurably shift populationScale toward denser outcomes across the FULL pipeline (region roll -> world class -> density resolution -> population scale), not just at the isolated pick-function level.
  const DENSE_SCALES = new Set([POPULATION_SCALE.POPULOUS, POPULATION_SCALE.HYPER_URBANIZED]);
  let denseWithPreset = 0, denseWithoutPreset = 0;
  const N = 2000;
  for (let seed = 0; seed < N; seed++) {
    const withPreset = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 71000000), presetId: 'ecumenopolis' });
    if (DENSE_SCALES.has(withPreset.populationScale)) denseWithPreset++;
    const withoutPreset = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 71000000) });
    if (DENSE_SCALES.has(withoutPreset.populationScale)) denseWithoutPreset++;
  }
  assert.ok(denseWithPreset > denseWithoutPreset, `the ecumenopolis preset's densityBias must raise the POPULOUS/HYPER_URBANIZED rate end-to-end (got ${denseWithPreset}/${N} vs baseline ${denseWithoutPreset}/${N})`);

  console.log('PHASE 8D-3A correction pass round 2 secondary observations (UNINHABITED POI floor of 0, real end-to-end preset density/provenance test) passed.');
}

// ------------------------------------------------------------
// Correction pass round 3: four dependency bugs (plus one data
// correction) caught by a further independent review of round 2's
// head -- a population reroll losing preset/region context on an
// UNINHABITED boundary crossing, the bundle's cohesive civilization
// regeneration operation drifting out of sync with the technology
// model's own dependency order, suggestedOppositionTags going stale
// after any tag-affecting reroll, and gas giants allowing a physically
// impossible vacuum atmosphere.
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const {
    createProceduralPlanetDraft,
    rerollPlanetPopulation,
    rerollPlanetStability,
    rerollPlanetGovernment,
    rerollPlanetEconomy,
    rerollPlanetHazards,
    rerollPlanetTraits,
    rerollPlanetWorldClass,
    regenerateCivilizationCluster
  } = await import(abs('scripts/generation/planets/planet-draft.js'));
  const { generateProceduralPlanetBundle, regenerateCivilization } = await import(abs('scripts/generation/planets/planet-bundle.js'));
  const { deriveSuggestedOppositionTags } = await import(abs('scripts/generation/planets/planet-hooks.js'));
  const { definitionalConstraintsFor } = await import(abs('scripts/generation/planets/planet-quality-tables.js'));

  // Fix 1: rerollPlanetPopulation() crossing the UNINHABITED boundary must keep the draft's preset+region context (not just world class).
  // A mining-world preset must raise the mining-sector rate on the newly-inhabited economy, same as it does at initial generation.
  {
    let miningAfterBoundary = 0, boundaryTrials = 0, miningBaseline = 0, baselineTrials = 0;
    const N = 3000;
    for (let seed = 0; seed < N; seed++) {
      const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 80000000), presetId: 'mining-world' });
      if (d.populationScale !== 'uninhabited') continue;
      const r = rerollPlanetPopulation(d, { rng: makeSeededRng(seed + 81000000), availableSpeciesIds: ['species-human', 'species-rodian', 'species-duros'] });
      if (r.populationScale === 'uninhabited') continue;
      boundaryTrials++;
      if (r.economy.primarySector?.sector === 'mining') miningAfterBoundary++;
      assert.equal(r.presetId, 'mining-world', `seed ${seed}: crossing the UNINHABITED boundary must preserve the draft's presetId`);

      const b = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 82000000) });
      if (b.populationScale === 'uninhabited') continue;
      baselineTrials++;
      if (b.economy.primarySector?.sector === 'mining') miningBaseline++;
    }
    assert.ok(boundaryTrials > 50 && baselineTrials > 50, `test needs enough samples in both buckets within ${N} seeds (got ${boundaryTrials}/${baselineTrials})`);
    const boundaryRate = miningAfterBoundary / boundaryTrials, baselineRate = miningBaseline / baselineTrials;
    assert.ok(boundaryRate > baselineRate, `a mining-world preset must raise the mining-sector rate even across an UNINHABITED->inhabited population-reroll boundary crossing (got ${boundaryRate} vs baseline ${baselineRate})`);
  }

  // Fix 2: regenerateCivilizationCluster()/planet-bundle.js's regenerateCivilization() must reroll the FULL technology cluster
  // (technologyAccess/technologySpecialties/droidPrevalence, not just technologyLevel), and technologyLevel must be weighted by the FRESHLY rerolled economy, not the stale pre-reroll one.
  {
    const TECH_RANK = { primitive: 0, 'pre-industrial': 1, industrial: 2, frontier: 3, 'galactic-standard': 4, advanced: 5, 'cutting-edge': 6 };
    let techEconRankSum = 0, techEconCount = 0, otherRankSum = 0, otherCount = 0;
    let sawAccessChange = false, sawSpecialtyChange = false, sawDroidChange = false;
    const N = 3000;
    for (let seed = 0; seed < N; seed++) {
      const bundle = generateProceduralPlanetBundle({ rng: makeSeededRng(seed + 83000000) });
      if (bundle.planetDraft.populationScale === 'uninhabited') continue;
      const before = bundle.planetDraft;
      const after = regenerateCivilization(bundle, { rng: makeSeededRng(seed + 84000000) }).planetDraft;
      if (!after.technologyLevel) continue;
      const sectors = [after.economy.primarySector, ...(after.economy.secondarySectors || [])].filter(Boolean);
      const hasTechTag = sectors.some((s) => (s.tags || []).some((t) => ['technology', 'research', 'industrial'].includes(t)));
      if (hasTechTag) { techEconRankSum += TECH_RANK[after.technologyLevel]; techEconCount++; }
      else { otherRankSum += TECH_RANK[after.technologyLevel]; otherCount++; }
      if (after.technologyAccess !== before.technologyAccess) sawAccessChange = true;
      if (JSON.stringify(after.technologySpecialties) !== JSON.stringify(before.technologySpecialties)) sawSpecialtyChange = true;
      if (after.droidPrevalence !== before.droidPrevalence) sawDroidChange = true;
    }
    assert.ok(techEconCount > 50 && otherCount > 50, `test needs enough samples in both economy buckets within ${N} seeds (got ${techEconCount}/${otherCount})`);
    assert.ok(techEconRankSum / techEconCount > otherRankSum / otherCount, `regenerateCivilization()'s technologyLevel must be weighted by the FRESHLY rerolled economy (got avg rank ${techEconRankSum / techEconCount} for tech-tagged economies vs ${otherRankSum / otherCount} for others)`);
    assert.ok(sawAccessChange, 'regenerateCivilization() must actually reroll technologyAccess at least sometimes');
    assert.ok(sawSpecialtyChange, 'regenerateCivilization() must actually reroll technologySpecialties at least sometimes');
    assert.ok(sawDroidChange, 'regenerateCivilization() must actually reroll droidPrevalence at least sometimes (the cohesive civilization operation, unlike a narrower single-field reroll, should re-derive it)');

    // UNINHABITED: every civilization field stays null/empty, but droidPrevalence still rerolls (it is independent of population/civilization state by design).
    let checkedUninhabited = 0;
    for (let seed = 0; seed < 3000 && checkedUninhabited < 20; seed++) {
      const bundle = generateProceduralPlanetBundle({ rng: makeSeededRng(seed + 85000000) });
      if (bundle.planetDraft.populationScale !== 'uninhabited') continue;
      checkedUninhabited++;
      const after = regenerateCivilization(bundle, { rng: makeSeededRng(seed + 1) }).planetDraft;
      assert.equal(after.technologyLevel, null, `seed ${seed}: UNINHABITED regenerateCivilization() must leave technologyLevel null`);
      assert.equal(after.technologyAccess, null, `seed ${seed}: UNINHABITED regenerateCivilization() must leave technologyAccess null`);
      assert.deepEqual(after.technologySpecialties, [], `seed ${seed}: UNINHABITED regenerateCivilization() must leave technologySpecialties empty`);
      assert.equal(after.government, null, `seed ${seed}: UNINHABITED regenerateCivilization() must leave government null`);
    }
    assert.ok(checkedUninhabited > 0, 'the UNINHABITED regenerateCivilization() test must exercise at least one uninhabited bundle');

    // regenerateCivilizationCluster() is the reusable seam planet-bundle.js composes -- confirm it's directly usable and produces the same shape.
    const directDraft = createProceduralPlanetDraft({ rng: makeSeededRng(86000000) });
    if (directDraft.populationScale !== 'uninhabited') {
      const regenerated = regenerateCivilizationCluster(directDraft, { rng: makeSeededRng(1) });
      assert.ok(regenerated.government && regenerated.stability && regenerated.economy && regenerated.technologyLevel, 'regenerateCivilizationCluster() must produce a full civilization block directly, independent of the bundle layer');
    }
  }

  // Fix 3: suggestedOppositionTags must stay synchronized with draft.tags after EVERY tag-affecting reroll -- checking the STORED field, not deriving it fresh in the test.
  {
    const checkSync = (draft, label, seed) => {
      const expected = deriveSuggestedOppositionTags(draft.tags);
      assert.deepEqual([...draft.suggestedOppositionTags].sort(), [...expected].sort(), `seed ${seed}: draft.suggestedOppositionTags must match deriveSuggestedOppositionTags(draft.tags) after a ${label} reroll (stored field must not go stale)`);
    };
    let checked = 0;
    for (let seed = 0; seed < 300; seed++) {
      const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 87000000) });
      checkSync(d, 'initial creation', seed);
      if (d.populationScale === 'uninhabited') continue;
      checked++;
      checkSync(rerollPlanetStability(d, { rng: makeSeededRng(seed + 1) }), 'stability', seed);
      checkSync(rerollPlanetGovernment(d, { rng: makeSeededRng(seed + 2) }), 'government', seed);
      checkSync(rerollPlanetEconomy(d, { rng: makeSeededRng(seed + 3) }), 'economy', seed);
      checkSync(rerollPlanetHazards(d, { rng: makeSeededRng(seed + 4) }), 'hazards', seed);
      checkSync(rerollPlanetTraits(d, { rng: makeSeededRng(seed + 5) }), 'traits', seed);
      checkSync(rerollPlanetWorldClass(d, { rng: makeSeededRng(seed + 6) }), 'world class', seed);
    }
    assert.ok(checked > 20, `the suggestedOppositionTags sync test must exercise enough inhabited drafts (got ${checked})`);

    // The OTHER SUGGEST-tier hooks must stay completely untouched by these same rerolls -- only suggestedOppositionTags is a deterministic tags projection; the rest stay stable until rerollPlanetHooks().
    const base = (() => {
      for (let seed = 0; seed < 200; seed++) {
        const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 88000000) });
        if (d.populationScale !== 'uninhabited') return d;
      }
      throw new Error('could not find an inhabited draft in 200 seeds');
    })();
    const afterStability = rerollPlanetStability(base, { rng: makeSeededRng(1) });
    assert.deepEqual(afterStability.currentEvents, base.currentEvents, 'rerollPlanetStability must not touch currentEvents');
    assert.equal(afterStability.secret, base.secret, 'rerollPlanetStability must not touch secret');
    assert.deepEqual(afterStability.suggestedFactionArchetypeTags, base.suggestedFactionArchetypeTags, 'rerollPlanetStability must not touch suggestedFactionArchetypeTags');
    assert.deepEqual(afterStability.suggestedJobArchetypeTags, base.suggestedJobArchetypeTags, 'rerollPlanetStability must not touch suggestedJobArchetypeTags');
  }

  // Fix 4: a gas-giant world class must never roll a 'none-vacuum' atmosphere -- a gas giant has an atmosphere by definition.
  {
    const gasGiantConstraints = definitionalConstraintsFor('gas-giant');
    assert.ok(Array.isArray(gasGiantConstraints.atmosphere), 'gas-giant must still carry a definitional atmosphere constraint');
    assert.ok(!gasGiantConstraints.atmosphere.includes('none-vacuum'), 'gas-giant\'s allowed atmosphere set must not include "none-vacuum" -- a gas giant has an atmosphere by definition');
    let sawGasGiant = false;
    for (let seed = 0; seed < 5000; seed++) {
      const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 89000000) });
      if (d.worldClass.value !== 'gas-giant') continue;
      sawGasGiant = true;
      assert.notEqual(d.atmosphere.value, 'none-vacuum', `seed ${seed}: a gas-giant world must never roll a "none-vacuum" atmosphere`);
    }
    assert.ok(sawGasGiant, 'the gas-giant atmosphere test must actually roll at least one gas-giant world within 5000 seeds');
  }

  console.log('PHASE 8D-3A correction pass round 3 (population-reroll boundary-crossing context, cohesive civilization regeneration dependency order, suggestedOppositionTags staleness, gas-giant atmosphere correction) passed.');
}

// ------------------------------------------------------------
// Correction pass round 4: the government -> Trade Resolver dependency.
// `generatePlanetTrade()` explicitly consumes `governmentTags` (a
// `crime-syndicate`-tagged government raises illicit-trade likelihood
// to at least 0.6, vs. a 0.15 baseline -- see `planet-trade.js`'s own
// `illicitChanceFor()`). Initial generation (`rollCivilization()`)
// already threads the current government through correctly, but two
// reroll paths did not: `rerollPlanetEconomy()` never passed
// `government` into `rollEconomy()` at all (governmentTags: [] always,
// even with a real government on the draft), and
// `rerollPlanetGovernment()` left the OLD, previous-government-sampled
// trade fields in place after rolling a new government.
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const { createProceduralPlanetDraft, rerollPlanetEconomy, rerollPlanetGovernment } = await import(abs('scripts/generation/planets/planet-draft.js'));
  const { generateProceduralPlanetBundle, regenerateCivilization } = await import(abs('scripts/generation/planets/planet-bundle.js'));

  const isCrimeSyndicate = (government) => Boolean(government?.tags?.includes('crime-syndicate'));

  // Fix 1: rerollPlanetEconomy() must honor the draft's CURRENT government as Trade Resolver context.
  {
    let illicitWithCrimeGov = 0, crimeGovTrials = 0, illicitOther = 0, otherTrials = 0;
    const N = 6000;
    for (let seed = 0; seed < N; seed++) {
      const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed) });
      if (d.populationScale === 'uninhabited' || !d.government) continue;
      const r = rerollPlanetEconomy(d, { rng: makeSeededRng(seed + 1000000) });
      assert.equal(r.government, d.government, `seed ${seed}: rerollPlanetEconomy() must not touch government (reference identity)`);
      assert.equal(r.populationScale, d.populationScale, `seed ${seed}: rerollPlanetEconomy() must not touch populationScale`);
      if (isCrimeSyndicate(d.government)) { crimeGovTrials++; if (r.economy.illicitTrade.length > 0) illicitWithCrimeGov++; }
      else { otherTrials++; if (r.economy.illicitTrade.length > 0) illicitOther++; }
    }
    assert.ok(crimeGovTrials > 30 && otherTrials > 30, `test needs enough samples in both government buckets within ${N} seeds (got ${crimeGovTrials}/${otherTrials})`);
    const crimeRate = illicitWithCrimeGov / crimeGovTrials, otherRate = illicitOther / otherTrials;
    assert.ok(crimeRate > otherRate, `rerollPlanetEconomy() must exercise the draft's current crime-syndicate government context, measurably raising the illicit-trade rate (got ${crimeRate} vs ${otherRate})`);
  }

  // Fix 2: rerollPlanetGovernment() must refresh trade against the NEW government while preserving economy sectors and every unrelated field.
  {
    let illicitAfterCrimeGov = 0, crimeGovRerolls = 0, illicitAfterOther = 0, otherRerolls = 0;
    const UNRELATED_KEYS = ['populationScale', 'populationEstimate', 'technologyLevel', 'technologyAccess', 'technologySpecialties', 'droidPrevalence', 'worldClass', 'name'];
    const N = 6000;
    for (let seed = 0; seed < N; seed++) {
      const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 2000000) });
      if (d.populationScale === 'uninhabited') continue;
      const r = rerollPlanetGovernment(d, { rng: makeSeededRng(seed + 3000000) });
      assert.equal(r.economy.primarySector, d.economy.primarySector, `seed ${seed}: rerollPlanetGovernment() must preserve primarySector`);
      assert.deepEqual(r.economy.secondarySectors, d.economy.secondarySectors, `seed ${seed}: rerollPlanetGovernment() must preserve secondarySectors`);
      for (const k of UNRELATED_KEYS) assert.deepEqual(r[k], d[k], `seed ${seed}: rerollPlanetGovernment() must preserve unrelated field "${k}"`);
      if (isCrimeSyndicate(r.government)) { crimeGovRerolls++; if (r.economy.illicitTrade.length > 0) illicitAfterCrimeGov++; }
      else { otherRerolls++; if (r.economy.illicitTrade.length > 0) illicitAfterOther++; }
    }
    assert.ok(crimeGovRerolls > 30 && otherRerolls > 30, `test needs enough samples in both post-reroll government buckets within ${N} seeds (got ${crimeGovRerolls}/${otherRerolls})`);
    const crimeRate = illicitAfterCrimeGov / crimeGovRerolls, otherRate = illicitAfterOther / otherRerolls;
    assert.ok(crimeRate > otherRate, `rerollPlanetGovernment() must refresh trade against the NEW government, measurably raising the illicit-trade rate when it lands on a crime-syndicate government (got ${crimeRate} vs ${otherRate})`);
  }

  // regenerateCivilizationCluster()'s existing composition (government -> stability -> economy -> ...) must now automatically produce trade generated against the NEW government -- no bundle-layer special-casing required.
  {
    let illicitWithCrimeGov = 0, crimeGovTrials = 0, illicitOther = 0, otherTrials = 0;
    const N = 6000;
    for (let seed = 0; seed < N; seed++) {
      const bundle = generateProceduralPlanetBundle({ rng: makeSeededRng(seed + 4000000) });
      if (bundle.planetDraft.populationScale === 'uninhabited') continue;
      const after = regenerateCivilization(bundle, { rng: makeSeededRng(seed + 5000000) }).planetDraft;
      if (!after.government) continue;
      if (isCrimeSyndicate(after.government)) { crimeGovTrials++; if (after.economy.illicitTrade.length > 0) illicitWithCrimeGov++; }
      else { otherTrials++; if (after.economy.illicitTrade.length > 0) illicitOther++; }
    }
    assert.ok(crimeGovTrials > 30 && otherTrials > 30, `test needs enough samples in both regenerateCivilization() government buckets within ${N} seeds (got ${crimeGovTrials}/${otherTrials})`);
    assert.ok(illicitWithCrimeGov / crimeGovTrials > illicitOther / otherTrials, 'regenerateCivilization()\'s composed civilization cluster must automatically produce trade consistent with its newly-rolled government');
  }

  console.log('PHASE 8D-3A correction pass round 4 (government -> Trade Resolver dependency: rerollPlanetEconomy government context, rerollPlanetGovernment trade refresh) passed.');
}

console.log('PHASE 8D-3A procedural locations productionization suite (catalog quality, generation semantics, bundle generation, reroll safety, determinism) passed.');
