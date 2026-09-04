import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — PHASE 8D-2: PROCEDURAL CONTENT
// ECOSYSTEM GROUNDWORK (+ independent review round 1 correction pass).
//
// This is FOUNDATION ONLY, exactly like Phase 8D-1 before it: shared
// cross-cutting contracts (tags/diagnostics/description-composer/
// draft-id), a procedural naming ecosystem (planet/system/settlement/
// Faction names), procedural planet + POI groundwork, NPC narrative
// generation, Faction institutional/leadership/goals/problems/resource
// groundwork, Job/mission groundwork (archetype metadata, constraints,
// mission subjects, cargo, intel clues, complications, twists, urgency,
// legality/visibility, consequences, encounter-phase suggestions, the
// opposition REQUEST contract), and Location current-events. No finished
// planet generator UI, no full Job orchestration, no Opposition Catalog
// resolver, no canonical Actor/Faction/Location/Job creation anywhere.
//
// CORRECTION PASS, ROUND 1 (independent review of head `7d6fc66`) fixed
// seven foundation-contract issues, all covered below: (1) the planet
// biome field collapsed procedural tags into the Location Library's
// real biome vocabulary instead of keeping them separate; (2) population
// generation ran unconditionally regardless of a world class's
// `habitable` flag; (3) the planet-name generator was built entirely
// around a syllable combinator with no curated-name authority and no
// check against real known worlds; (4) the opposition-request contract
// was too lossy for the resolver the wider design anticipates; (5) the
// objective-template schema had no seam for constraints/opposition/
// location/subject hints; (6) an NPC's `suggestion` field went stale
// after a personality/motivation reroll; (7) POI templates could only
// soft-deprioritize an incompatible planet context, never actually
// exclude one. A follow-up user message additionally asked for planet
// imports/exports to read from one SHARED Galactic Commodity Catalog
// (`data/galactic-commodities.js`) rather than a planet-specific list,
// with a `primarySector`/`secondarySectors` economy structure and
// `{commodityId, importance}` trade entries -- also covered below.
//
// CORRECTION PASS, ROUND 2 (independent review of head `9a4a8b7`) fixed
// six more foundation-contract issues, all covered below: (1) the Cargo
// generator owned its OWN commodity vocabulary, duplicating the shared
// Galactic Commodity Catalog -- now split into COMMODITY cargo
// (resolves by `commodityId` against the shared catalog) and NARRATIVE
// cargo (a trimmed table of genuinely non-commodity mission objects);
// (2) POI templates had the SAME biome-SSOT violation the planet
// WORLD_CLASS fix (round 1) corrected, just not yet applied there, PLUS
// two declared-but-unused `economyTags`/`governmentTags` fields, PLUS
// almost every template defaulting to the generic `poi` type instead of
// the richer canonical Location types (`temple`/`base`/`facility`/
// `city`) -- all three fixed together; (3) an `UNINHABITED` world still
// rolled a government/stability/technology-level/economy despite having
// "no permanent population" -- now nulled/emptied exactly like
// demographics/trade already were, including across every reroll path
// (single-field civilization rerolls are a no-op on an UNINHABITED
// draft; a population reroll crossing the UNINHABITED boundary in
// either direction recomputes the WHOLE civilization block, not just
// settlementPattern+trade); (4) planet droid prevalence reused the
// Faction living/droid COMPOSITION model, so `DROID_ONLY` zeroed
// `livingWeight` while an ordinary organic species distribution still
// generated anyway -- replaced with `planet-profile.js`'s
// `PLANET_DROID_PREVALENCE`, a Location-specific concept explicitly
// INDEPENDENT of organic population; (5) `rerollPlanetEconomy()` sliced
// `secondarySectors` down to `secondaryCount` AFTER the Trade Resolver
// already ran against the full (unsliced) set -- `secondaryCount` now
// flows into sector generation BEFORE trade is resolved; (6), caught in
// passing while fixing (3), `rerollPlanetGovernment()` never recomputed
// `tags` despite `tags` reading `government.tags` -- now fixed too.
//
// CORRECTION PASS, ROUND 3 (independent review of head `abfdbbe`) fixed
// three more foundation-contract issues, all covered below: (1)
// `rerollPlanetPopulation()` (round 2) recomputed the WHOLE civilization
// block (government/stability/technologyLevel/economy) even for an
// inhabited -> inhabited reroll, where nothing about those facts should
// have changed -- rerolling one field must preserve unrelated fields;
// now only the boundary-crossing case cascades, an inhabited->inhabited
// reroll preserves government/stability/technologyLevel/economy sectors
// and only recomputes population+settlementPattern+trade; (2) POI
// templates' `biomes` field (round 2) fixed the VOCABULARY (every value
// real) but not the SEMANTICS -- it was "where this KIND of POI is
// plausible" (Ruins: desert OR jungle), not "what this SPECIFIC
// generated POI's biome actually is," yet the whole affinity list got
// written into the draft verbatim, so a single Ruins POI could claim
// desert AND jungle simultaneously even on an ice-world parent that's
// neither; renamed to `biomeAffinities`, with the draft's actual
// `biomes` now derived as the intersection with the parent's real
// biomes (or the affinity list itself with no parent context; or empty
// for an indoor installation). The SAME round also fixed
// `rerollPoiTemplate()`/`rerollPoiName()` silently losing all parent
// context (and therefore the hard compatibility filter) on a bare
// reroll -- a persisted `generatorContext` on the draft now supplies
// whatever the caller doesn't explicitly resupply; (3) Cargo's
// `preferTags` matched only `commodity.tags`, never `producedBy`/
// `demandedBy` (the same dead-affinity bug already fixed once for
// POIs), and the `legality` parameter compared directly against
// `commodity.legality` even though a Job's legality vocabulary
// (`legal`/`gray-area`/`illegal`/`black-market`) isn't the same as a
// commodity's (`legal`/`restricted`/`illegal`) -- `gray-area`/
// `black-market` had no matching commodity legality at all and
// silently fell back to the FULL unfiltered catalog; renamed to an
// explicit `jobLegality` that translates via
// `JOB_LEGALITY_TO_COMMODITY_LEGALITY`/
// `JOB_LEGALITY_TO_NARRATIVE_LEGALITY`, and is now actually forwarded
// to the narrative branch (previously dropped there entirely, so a
// legal-only Job could still roll an illegal-tagged narrative object).
//
// Every module here is a PURE, RNG-injectable function set with no
// Foundry dependency (this suite installs the shim anyway to match the
// established convention). ADDITIVE DESIGN CONTRACT — none of this code
// existed before this phase, so there is no fail-before/pass-after
// cycle; draft-safety is proven by the EXISTING recursive source scan in
// `gm-generation-phase8d1-foundation.test.mjs` (it already walks all of
// `scripts/generation/` recursively, so it already covers every file
// added or changed in this phase without needing a duplicate scan here).

registerFoundryPathLoader();
installFoundryShimGlobals({
  game: { user: { isGM: true, id: 'gm1' }, settings: { get: () => [], set: () => Promise.resolve(), settings: { has: () => true }, register: () => {} }, actors: { contents: [], get: () => null, [Symbol.iterator]: () => [][Symbol.iterator]() } },
  ui: { notifications: { info: () => {}, warn: () => {}, error: () => {} } },
  Hooks: { on: () => {}, off: () => {}, once: () => {}, call: () => true, callAll: () => true }
});

const abs = (rel) => `/systems/foundryvtt-swse/${rel}`;

// ------------------------------------------------------------
// cross-cutting contracts: tags, diagnostics, description composer, draft-id
// ------------------------------------------------------------
{
  const { normalizeTags, hasAllTags, hasAnyTag, mergeTags } = await import(abs('scripts/generation/lib/tag-utils.js'));
  assert.deepEqual(normalizeTags(['Urban', ' urban ', 'Rural']), ['urban', 'rural'], 'normalizeTags must lowercase/trim/dedupe');
  assert.equal(hasAllTags(['Urban', 'Rural'], ['urban']), true, 'hasAllTags must match case-insensitively');
  assert.equal(hasAnyTag(['Urban'], ['rural', 'urban']), true, 'hasAnyTag must match any candidate');
  assert.deepEqual(mergeTags(['a', 'b'], ['b', 'c']), ['a', 'b', 'c'], 'mergeTags must merge+dedupe across lists');

  const { DIAGNOSTIC_CODE, isDiagnosticCode, createDiagnostic } = await import(abs('scripts/generation/lib/generator-diagnostics.js'));
  assert.equal(isDiagnosticCode(DIAGNOSTIC_CODE.SPECIES_UNAVAILABLE), true, 'a real diagnostic code must validate');
  assert.equal(isDiagnosticCode('bogus'), false, 'an unknown code must fail validation');
  assert.equal(DIAGNOSTIC_CODE.ISSUER_RESOURCE_MISMATCH, 'issuer-resource-mismatch', 'must reuse reward-estimator.js\'s existing string value verbatim');
  assert.ok(DIAGNOSTIC_CODE.POI_CONTEXT_MISMATCH, 'POI_CONTEXT_MISMATCH must exist (used by poi-generator.js\'s hard-filter fallback)');
  const diag = createDiagnostic(DIAGNOSTIC_CODE.ENVIRONMENT_MISMATCH, 'note');
  assert.deepEqual(diag, { code: 'environment-mismatch', note: 'note' }, 'createDiagnostic must shape {code, note}');

  const { joinClauses, composeFromTemplate, composeLocationSummary, composeFactionSummary, composeNpcSummary } = await import(abs('scripts/generation/lib/description-composer.js'));
  assert.equal(joinClauses(['a', '', 'b', null]), 'a b', 'joinClauses must drop blanks');
  assert.equal(composeFromTemplate(['Hi {name}.', 'Missing {ghost} dropped.'], { name: 'Rex' }), 'Hi Rex.', 'composeFromTemplate must drop clauses with unresolved tokens');
  assert.equal(composeLocationSummary({}), '', 'composeLocationSummary with no facts must yield an empty string, never a broken fragment');
  assert.match(composeFactionSummary({ name: 'X', organizationFamily: 'crime syndicate' }), /^X is a crime syndicate/, 'composeFactionSummary must lead with the name');
  assert.match(composeNpcSummary({ name: 'Jax', role: 'smuggler' }), /Jax.*smuggler/, 'composeNpcSummary must include name and role');

  const { createDraftId, isDraftId, draftIdDomain } = await import(abs('scripts/generation/lib/draft-id.js'));
  const id1 = createDraftId('location');
  const id2 = createDraftId('location');
  assert.match(id1, /^draft:location:[0-9a-f]{12}$/, 'createDraftId must produce the draft:<domain>:<12-hex> shape');
  assert.notEqual(id1, id2, 'two calls must never collide');
  assert.equal(isDraftId(id1), true, 'isDraftId must recognize a real draft id');
  assert.equal(isDraftId('not-a-draft'), false, 'isDraftId must reject a non-draft string');
  assert.equal(draftIdDomain(id1), 'location', 'draftIdDomain must extract the domain segment');

  console.log('cross-cutting contracts (tag-utils, generator-diagnostics, description-composer, draft-id) passed.');
}

// ------------------------------------------------------------
// Location Library biome authority (single source of truth)
// ------------------------------------------------------------
{
  const { LOCATION_LIBRARY_BIOMES, isLocationLibraryBiome, isKnownLibraryPlanetName, LOCATION_LIBRARY_SEEDS } = await import(abs('scripts/locations/location-library-seeds.js'));
  assert.ok(LOCATION_LIBRARY_BIOMES.length >= 80, 'the real biome vocabulary should have its full ~86 entries');
  assert.equal(isLocationLibraryBiome('desert'), true, 'a real biome value must validate');
  assert.equal(isLocationLibraryBiome('arid'), false, 'a made-up procedural word must NOT validate as a real biome (this is the exact SSOT the correction pass restored)');
  assert.equal(isKnownLibraryPlanetName('Tatooine'), true, 'a real curated Library world name must be recognized');
  assert.equal(isKnownLibraryPlanetName('tatooine'), true, 'the name check must be case-insensitive');
  assert.equal(isKnownLibraryPlanetName('  Tatooine  '), true, 'the name check must trim whitespace');
  assert.equal(LOCATION_LIBRARY_SEEDS.length, 50, 'sanity: the curated Library should still have its known 50 top-level worlds');

  console.log('Location Library biome + known-planet-name authority (isLocationLibraryBiome, isKnownLibraryPlanetName) passed.');
}

// ------------------------------------------------------------
// naming ecosystem: planet/system/settlement/Faction names
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const { isKnownLibraryPlanetName } = await import(abs('scripts/locations/location-library-seeds.js'));

  // --- planet names: curated pool is PRIMARY, syllable combinator is FALLBACK only ---
  const { getRandomPlanetName, pickCuratedPlanetName, generateSyllablePlanetName, rerollPlanetName } = await import(abs('scripts/generation/names/planet-name-generator.js'));
  const { PROCEDURAL_PLANET_NAMES } = await import(abs('scripts/generation/data/procedural-planet-names.js'));

  assert.ok(PROCEDURAL_PLANET_NAMES.length >= 80, 'the curated planet-name pool should be a genuinely substantial representative catalog');
  const collisions = PROCEDURAL_PLANET_NAMES.filter((entry) => isKnownLibraryPlanetName(entry.value));
  assert.equal(collisions.length, 0, `the curated pool must never collide with a real known Library world, found: ${JSON.stringify(collisions.map((c) => c.value))}`);

  const defaultDraft = getRandomPlanetName({ rng: makeSeededRng(1) });
  assert.equal(defaultDraft.source, 'curated', 'the default/normal case must use the curated pool, not the syllable fallback');
  assert.ok(PROCEDURAL_PLANET_NAMES.some((e) => e.value === defaultDraft.name), 'a curated draft\'s name must come from the curated pool');

  const allCuratedNames = PROCEDURAL_PLANET_NAMES.map((e) => e.value);
  const exhausted = getRandomPlanetName({ rng: makeSeededRng(5), excludeNames: allCuratedNames });
  assert.match(exhausted.source, /^syllable/, 'exhausting the curated pool via excludeNames must trigger the syllable fallback');
  assert.equal(isKnownLibraryPlanetName(exhausted.name), false, 'the syllable fallback must never collide with a known Library world even when triggered');

  let neverCollided = true;
  const sweepRng = makeSeededRng(77);
  for (let i = 0; i < 500; i++) {
    if (isKnownLibraryPlanetName(generateSyllablePlanetName({ rng: sweepRng }).name)) neverCollided = false;
  }
  assert.ok(neverCollided, 'the syllable generator must never return a name colliding with a known Library world across 500 draws');

  const rerolled = rerollPlanetName(defaultDraft, { rng: makeSeededRng(2) });
  assert.notEqual(rerolled.name, defaultDraft.name, 'rerollPlanetName must exclude the previous name from reselection');

  // --- system names ---
  const { getRandomSystemName } = await import(abs('scripts/generation/names/system-name-generator.js'));
  assert.equal(getRandomSystemName({ planetName: 'Dantooine' }).name, 'Dantooine system', 'default system name must follow the "<planet> system" Library convention');
  const independentSystem = getRandomSystemName({ independent: true, rng: makeSeededRng(3) });
  assert.equal(independentSystem.independent, true, 'independent system name must set independent: true');
  assert.equal(independentSystem.planetName, '', 'independent system name must not carry a planetName');

  // --- settlement names ---
  const {
    getRandomSettlementName, rerollSettlementNamePrefix, SETTLEMENT_NAME_TEMPLATE
  } = await import(abs('scripts/generation/names/settlement-name-generator.js'));
  const sawEveryTemplate = new Set();
  const settlementSweepRng = makeSeededRng(42);
  for (let i = 0; i < 300; i++) sawEveryTemplate.add(getRandomSettlementName({ rng: settlementSweepRng }).template);
  assert.equal(sawEveryTemplate.size, 4, 'all 4 settlement-name templates must be reachable within 300 draws');
  const rootOnlyDraft = { name: 'Kalar', template: SETTLEMENT_NAME_TEMPLATE.ROOT_ONLY, prefix: null, root: { value: 'Kalar' }, suffix: null };
  assert.equal(rerollSettlementNamePrefix(rootOnlyDraft, { rng: makeSeededRng(1) }), rootOnlyDraft, 'rerolling an unused prefix slot must be a declared no-op (same reference)');

  // --- Faction names ---
  const { getRandomFactionName, rerollFactionNameTypeNoun, rerollFactionNameDescriptor, FACTION_NAME_TEMPLATE } = await import(abs('scripts/generation/names/faction-name-generator.js'));
  const { ORGANIZATION_FAMILY } = await import(abs('scripts/generation/organization-metadata.js'));
  const { FACTION_TYPE_NOUNS_BY_FAMILY } = await import(abs('scripts/generation/data/faction-name-components.js'));
  const crimeFaction = getRandomFactionName({ family: ORGANIZATION_FAMILY.CRIME_SYNDICATE, rng: makeSeededRng(5) });
  assert.ok(FACTION_TYPE_NOUNS_BY_FAMILY[ORGANIZATION_FAMILY.CRIME_SYNDICATE].some((e) => e.value === crimeFaction.typeNoun.value), 'the type noun must come from the requested family\'s own pool');
  const omittedFamily = getRandomFactionName({ rng: makeSeededRng(2) });
  assert.ok(Object.values(ORGANIZATION_FAMILY).includes(omittedFamily.family), 'an omitted family must still resolve to a real ORGANIZATION_FAMILY value');
  const withoutDescriptorDraft = { template: FACTION_NAME_TEMPLATE.WITHOUT_DESCRIPTOR, descriptor: null, root: { value: 'X' }, typeNoun: { value: 'Y' }, family: ORGANIZATION_FAMILY.CRIME_SYNDICATE, name: 'X Y' };
  assert.equal(rerollFactionNameDescriptor(withoutDescriptorDraft, { rng: makeSeededRng(1) }), withoutDescriptorDraft, 'rerolling an unused descriptor slot must be a declared no-op');
  const rerolledType = rerollFactionNameTypeNoun(crimeFaction, { rng: makeSeededRng(654) });
  assert.ok(FACTION_TYPE_NOUNS_BY_FAMILY[crimeFaction.family].some((e) => e.value === rerolledType.typeNoun.value), 'a type-noun reroll must stay scoped to the draft\'s own family');

  console.log('naming ecosystem (curated-primary + syllable-fallback planet names with known-world exclusion, system/settlement/Faction names) passed.');
}

// ------------------------------------------------------------
// procedural planet groundwork
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const { isLocationLibraryBiome, isKnownLibraryPlanetName } = await import(abs('scripts/locations/location-library-seeds.js'));

  // --- world class: biome SSOT ---
  const { pickPlanetWorldClass, WORLD_CLASS } = await import(abs('scripts/generation/planets/planet-quality-tables.js'));
  for (const entry of WORLD_CLASS) {
    for (const biome of entry.biomes) assert.equal(isLocationLibraryBiome(biome), true, `WORLD_CLASS "${entry.value}"'s biome "${biome}" must be a real Library value`);
  }
  const asteroidField = WORLD_CLASS.find((e) => e.value === 'asteroid-field');
  assert.equal(asteroidField.locationType, 'region', 'asteroid-field must declare locationType "region", not "planet" (the exact mismatch the review found)');

  // --- population: POPULATION_SCALE + habitable-aware bias + uninhabited short-circuit ---
  const { generateProceduralPlanetPopulationProfile, POPULATION_SCALE, pickPopulationScale, describePopulationEstimate } = await import(abs('scripts/generation/planets/planet-population.js'));
  const { POPULATION_DIVERSITY } = await import(abs('scripts/generation/location-population-profile.js'));

  let uninhabitedOrOutpost = 0;
  for (let seed = 0; seed < 300; seed++) {
    const scale = pickPopulationScale({ rng: makeSeededRng(seed), habitable: false });
    if (scale === POPULATION_SCALE.UNINHABITED || scale === POPULATION_SCALE.OUTPOST) uninhabitedOrOutpost++;
  }
  assert.ok(uninhabitedOrOutpost / 300 > 0.85, `habitable:false must overwhelmingly favor uninhabited/outpost, got ${uninhabitedOrOutpost}/300`);

  const pool5 = ['species-human', 'species-twi-lek', 'species-rodian', 'species-duros', 'species-zabrak'];
  const emptyPool = generateProceduralPlanetPopulationProfile({ availableSpeciesIds: [], rng: makeSeededRng(1) });
  assert.deepEqual(emptyPool.profile.speciesWeights, [], 'an empty species pool must yield an empty profile');
  assert.equal(emptyPool.profile.fallbackUsed, false, 'an empty procedural profile must NEVER silently claim the generic galactic fallback was used');

  const uninhabited = generateProceduralPlanetPopulationProfile({ availableSpeciesIds: pool5, populationScaleOverride: POPULATION_SCALE.UNINHABITED, rng: makeSeededRng(1) });
  assert.deepEqual(uninhabited.profile.speciesWeights, [], 'an UNINHABITED world must have empty demographics, never a fabricated organic population');
  assert.equal(uninhabited.character, null, 'an UNINHABITED world must have a null character (no diversity to describe)');
  assert.ok(!('droidComposition' in uninhabited), 'population profile must NEVER return a droidComposition field anymore -- droid prevalence is now planet-profile.js\'s independent PLANET_DROID_PREVALENCE, not a population-generation concern (the review\'s round-2 finding)');

  for (let seed = 0; seed < 500; seed++) {
    const { profile } = generateProceduralPlanetPopulationProfile({ availableSpeciesIds: pool5, populationScaleOverride: POPULATION_SCALE.SETTLED, rng: makeSeededRng(seed) });
    const sum = profile.speciesWeights.reduce((a, e) => a + e.weight, 0);
    assert.equal(sum, 100, `species weights must always sum to exactly 100 for an inhabited world (seed ${seed}, got ${sum})`);
  }

  const nonHumanPool = ['species-twi-lek', 'species-rodian', 'species-duros'];
  for (let seed = 0; seed < 50; seed++) {
    const { dominantSpeciesId } = generateProceduralPlanetPopulationProfile({ availableSpeciesIds: nonHumanPool, populationScaleOverride: POPULATION_SCALE.SETTLED, rng: makeSeededRng(seed) });
    assert.notEqual(dominantSpeciesId, 'species-human', 'a pool with no Human entry must never surface Human as dominant -- proves non-Human species CAN dominate');
  }

  const inhabited = generateProceduralPlanetPopulationProfile({ availableSpeciesIds: pool5, populationScaleOverride: POPULATION_SCALE.SETTLED, rng: makeSeededRng(5) });
  assert.equal(inhabited.populationEstimate, describePopulationEstimate(POPULATION_SCALE.SETTLED), 'populationEstimate must match the scale label');

  // --- planet-profile.js: region/sector/climate/hydrosphere/technology/droid-prevalence/settlementPattern ---
  const {
    pickPlanetRegion, isPlanetRegion, pickSectorName, pickPlanetClimate, isPlanetClimate, pickPlanetHydrosphere, isPlanetHydrosphere,
    pickPlanetTechnologyLevel, isPlanetTechnologyLevel, pickPlanetDroidPrevalence, isPlanetDroidPrevalence, PLANET_DROID_PREVALENCE,
    pickSettlementPattern, isSettlementPattern, SETTLEMENT_PATTERN
  } = await import(abs('scripts/generation/planets/planet-profile.js'));
  assert.equal(isPlanetRegion(pickPlanetRegion({ rng: makeSeededRng(1) })), true, 'region pick must be valid');
  assert.match(pickSectorName({ rng: makeSeededRng(1) }), / sector$/, 'sector name must end with " sector"');
  assert.equal(isPlanetClimate(pickPlanetClimate({ rng: makeSeededRng(1) })), true, 'climate pick must be valid');
  assert.equal(isPlanetHydrosphere(pickPlanetHydrosphere({ rng: makeSeededRng(1) })), true, 'hydrosphere pick must be valid');
  assert.equal(isPlanetTechnologyLevel(pickPlanetTechnologyLevel({ rng: makeSeededRng(1) })), true, 'technology-level pick must be valid');

  // --- droid prevalence: the review's round-2 fix -- an independent Location concept, NOT the Faction living/droid composition model ---
  for (let seed = 0; seed < 50; seed++) assert.equal(isPlanetDroidPrevalence(pickPlanetDroidPrevalence({ rng: makeSeededRng(seed) })), true, 'droid-prevalence pick must always be a valid PLANET_DROID_PREVALENCE value');
  assert.deepEqual(Object.values(PLANET_DROID_PREVALENCE).sort(), ['automated', 'high', 'low', 'normal', 'rare', 'very-high'].sort(), 'PLANET_DROID_PREVALENCE must expose the exact six Location-specific levels the review requested, not the Faction DROID_ONLY/ORGANIC_ONLY vocabulary');
  for (let seed = 0; seed < 20; seed++) {
    assert.equal(pickSettlementPattern({ rng: makeSeededRng(seed), populationScale: POPULATION_SCALE.UNINHABITED }), SETTLEMENT_PATTERN.NONE, 'uninhabited must ALWAYS produce settlement pattern none (never contradicts populationScale)');
    assert.equal(pickSettlementPattern({ rng: makeSeededRng(seed), populationScale: POPULATION_SCALE.HYPER_URBANIZED }), SETTLEMENT_PATTERN.ECUMENOPOLIS, 'hyper-urbanized must ALWAYS produce ecumenopolis');
  }
  assert.equal(isSettlementPattern(pickSettlementPattern({ rng: makeSeededRng(1), populationScale: POPULATION_SCALE.SETTLED })), true, 'settled scale must still produce a valid pattern');

  // --- planet-economy.js: primarySector/secondarySectors ---
  const { generatePlanetEconomySectors } = await import(abs('scripts/generation/planets/planet-economy.js'));
  const { primarySector, secondarySectors } = generatePlanetEconomySectors({ rng: makeSeededRng(9), secondaryCount: 2 });
  assert.ok(!secondarySectors.includes(primarySector), 'secondarySectors must never include the primarySector entry');
  assert.equal(new Set(secondarySectors).size, secondarySectors.length, 'secondarySectors must be mutually distinct');

  // --- planet-trade.js: the Trade Resolver against the shared Galactic Commodity Catalog ---
  const { generatePlanetTrade } = await import(abs('scripts/generation/planets/planet-trade.js'));
  const { GALACTIC_COMMODITIES, COMMODITY_CATEGORY } = await import(abs('scripts/generation/data/galactic-commodities.js'));
  assert.ok(GALACTIC_COMMODITIES.length >= 90, 'the shared commodity catalog should be a genuinely substantial representative catalog');
  const commodityIds = GALACTIC_COMMODITIES.map((c) => c.id);
  assert.equal(new Set(commodityIds).size, commodityIds.length, 'every commodity id must be unique');
  assert.equal(new Set(GALACTIC_COMMODITIES.map((c) => c.category)).size, Object.keys(COMMODITY_CATEGORY).length, 'all 14 commodity categories should be represented');

  const commodityById = new Map(GALACTIC_COMMODITIES.map((c) => [c.id, c]));
  const someWorldClass = pickPlanetWorldClass({ rng: makeSeededRng(20) });
  const trade = generatePlanetTrade({
    rng: makeSeededRng(5), primarySector, secondarySectors, worldClass: someWorldClass,
    populationScale: POPULATION_SCALE.SETTLED, settlementPattern: SETTLEMENT_PATTERN.MULTIPLE_CITIES, stabilityValue: 'stable',
    exportCount: 2, importCount: 2
  });
  assert.ok(trade.exports.every((e) => commodityById.has(e.commodityId) && typeof e.importance === 'string'), 'every export commodityId must resolve in the shared catalog and carry an importance label');
  assert.ok(trade.imports.every((i) => commodityById.has(i.commodityId)), 'every import commodityId must resolve in the shared catalog');
  assert.ok(trade.exports.every((e) => !trade.imports.some((i) => i.commodityId === e.commodityId)), 'exports and imports must never overlap');

  const uninhabitedTrade = generatePlanetTrade({ rng: makeSeededRng(1), primarySector, secondarySectors, worldClass: someWorldClass, populationScale: POPULATION_SCALE.UNINHABITED, settlementPattern: SETTLEMENT_PATTERN.NONE });
  assert.deepEqual(uninhabitedTrade, { exports: [], imports: [], shortages: [], illicitTrade: [] }, 'an UNINHABITED world must have ZERO trade of any kind -- same empty-not-fabricated discipline as demographics');

  let illicitCount = 0;
  for (let seed = 0; seed < 200; seed++) {
    const t = generatePlanetTrade({ rng: makeSeededRng(seed), primarySector, secondarySectors, worldClass: someWorldClass, populationScale: POPULATION_SCALE.SETTLED, settlementPattern: SETTLEMENT_PATTERN.MULTIPLE_CITIES, stabilityValue: 'lawless' });
    if (t.illicitTrade.length > 0) illicitCount++;
  }
  assert.ok(illicitCount / 200 > 0.3, `lawless stability should meaningfully raise the illicit-trade rate, got ${illicitCount}/200`);

  // --- planet-draft.js: the full composite, corrected ---
  const {
    createProceduralPlanetDraft, rerollPlanetWorldClass, rerollPlanetEconomy, rerollPlanetTrade, rerollPlanetPopulation, rerollPlanetStability,
    rerollPlanetGovernment, rerollPlanetTechnologyLevel, rerollPlanetDroidPrevalence
  } = await import(abs('scripts/generation/planets/planet-draft.js'));
  const { LOCATION_DRAFT_MODE, isLocationDraftMode } = await import(abs('scripts/generation/location-draft.js'));
  const { isProvenance } = await import(abs('scripts/generation/provenance.js'));

  for (let seed = 0; seed < 200; seed++) {
    const draft = createProceduralPlanetDraft({ rng: makeSeededRng(seed), availableSpeciesIds: pool5 });
    assert.ok(draft.biomes.every((b) => isLocationLibraryBiome(b)), `seed ${seed}: every draft biome must be a real Library value`);
    assert.equal(isKnownLibraryPlanetName(draft.name), false, `seed ${seed}: generated planet name must never collide with a known Library world, got "${draft.name}"`);
    assert.ok(draft.economy && Array.isArray(draft.economy.secondarySectors), `seed ${seed}: economy structure malformed`);
    assert.ok(draft.populationScale === POPULATION_SCALE.UNINHABITED || draft.economy.primarySector, `seed ${seed}: a non-uninhabited world's economy must have a real primarySector`);
    assert.ok(draft.economy.exports.every((e) => commodityById.has(e.commodityId)), `seed ${seed}: export commodityId must resolve`);
    assert.ok(draft.economy.imports.every((i) => commodityById.has(i.commodityId)), `seed ${seed}: import commodityId must resolve`);
    if (draft.populationScale === POPULATION_SCALE.UNINHABITED) {
      assert.equal(draft.settlementPattern, SETTLEMENT_PATTERN.NONE, `seed ${seed}: uninhabited must pair with settlement pattern none`);
      assert.deepEqual(draft.populationProfile.speciesWeights, [], `seed ${seed}: uninhabited must have empty demographics`);
      assert.equal(draft.economy.exports.length, 0, `seed ${seed}: uninhabited must have zero economy exports`);
      // --- round-2 fix: UNINHABITED must ALSO suppress government/stability/technologyLevel/economy sectors, not just demographics+trade ---
      assert.equal(draft.government, null, `seed ${seed}: uninhabited world must have a null government (the review's exact "no permanent population... parliamentary government" contradiction)`);
      assert.equal(draft.stability, null, `seed ${seed}: uninhabited world must have a null stability`);
      assert.equal(draft.technologyLevel, null, `seed ${seed}: uninhabited world must have a null technologyLevel`);
      assert.equal(draft.economy.primarySector, null, `seed ${seed}: uninhabited world must have a null economy.primarySector`);
      assert.deepEqual(draft.economy.secondarySectors, [], `seed ${seed}: uninhabited world must have zero economy.secondarySectors`);
    } else {
      assert.notEqual(draft.government, null, `seed ${seed}: a non-uninhabited world must still roll a real government (an OUTPOST can have a limited local administration)`);
      assert.notEqual(draft.stability, null, `seed ${seed}: a non-uninhabited world must still roll real stability`);
      assert.notEqual(draft.technologyLevel, null, `seed ${seed}: a non-uninhabited world must still roll a real technologyLevel`);
      assert.notEqual(draft.economy.primarySector, null, `seed ${seed}: a non-uninhabited world must still roll a real economy.primarySector`);
    }
    assert.equal(isPlanetDroidPrevalence(draft.droidPrevalence), true, `seed ${seed}: droidPrevalence must always be a valid, independently-rolled value regardless of populationScale`);
    assert.equal(draft.type, draft.worldClass.locationType, `seed ${seed}: type must follow worldClass.locationType exactly (asteroid-field -> region, artificial-habitat -> space-station, everything else -> planet)`);
  }

  const planetDraft = createProceduralPlanetDraft({ rng: makeSeededRng(17), availableSpeciesIds: pool5 });
  assert.equal(isLocationDraftMode(planetDraft.mode), true, 'planet draft mode must be a valid LOCATION_DRAFT_MODE');
  assert.equal(planetDraft.mode, LOCATION_DRAFT_MODE.GENERATE_NEW_PLANET, 'default includeChild=false must give GENERATE_NEW_PLANET');
  assert.match(planetDraft.draftId, /^draft:location:[0-9a-f]{12}$/, 'planet draft must carry a properly-shaped draft id');
  assert.equal(planetDraft.locationId, '', 'a planet draft must never carry a canonical Location id');
  assert.equal(isProvenance(planetDraft.provenance), true, 'planet draft must carry valid provenance');
  assert.equal(planetDraft.system, `${planetDraft.name} system`, 'default system name convention must hold on the composed draft');

  const worldClassReroll = rerollPlanetWorldClass(planetDraft, { rng: makeSeededRng(999) });
  assert.equal(worldClassReroll.name, planetDraft.name, 'a worldClass reroll must preserve the planet\'s name');
  assert.equal(worldClassReroll.populationProfile, planetDraft.populationProfile, 'a worldClass reroll must preserve the population-profile reference');

  const economyReroll = rerollPlanetEconomy(planetDraft, { rng: makeSeededRng(50) });
  assert.equal(economyReroll.name, planetDraft.name, 'an economy reroll must preserve the planet\'s name');
  assert.equal(economyReroll.hazards, planetDraft.hazards, 'an economy reroll must preserve the hazards reference');

  const tradeReroll = rerollPlanetTrade(planetDraft, { rng: makeSeededRng(60) });
  assert.equal(tradeReroll.economy.primarySector, planetDraft.economy.primarySector, 'a trade-only reroll must preserve the primarySector reference');
  assert.equal(tradeReroll.economy.secondarySectors, planetDraft.economy.secondarySectors, 'a trade-only reroll must preserve the secondarySectors reference');

  const popReroll = rerollPlanetPopulation(planetDraft, { rng: makeSeededRng(2), availableSpeciesIds: [], habitable: true });
  assert.equal(popReroll.name, planetDraft.name, 'a population reroll must preserve narrative fields');
  assert.deepEqual(popReroll.populationProfile.speciesWeights, [], 'a population reroll with an empty pool must empty speciesWeights, never fall back');
  assert.equal(isSettlementPattern(popReroll.settlementPattern), true, 'a population reroll must produce a settlementPattern consistent with its new populationScale');

  const stabilityReroll = rerollPlanetStability(planetDraft, { rng: makeSeededRng(11) });
  assert.equal(stabilityReroll.name, planetDraft.name, 'a stability reroll must preserve the planet\'s name');
  assert.ok(Array.isArray(stabilityReroll.economy.illicitTrade), 'a stability reroll must recompute economy.illicitTrade (which reads stability), never leave it stale');

  // --- round-2 fix: rerollPlanetGovernment must recompute tags (a prior version left them stale) ---
  let sawGovernmentTagsChange = false;
  for (let seed = 0; seed < 30; seed++) {
    const govReroll = rerollPlanetGovernment(planetDraft, { rng: makeSeededRng(3000 + seed) });
    if (JSON.stringify(govReroll.tags) !== JSON.stringify(planetDraft.tags)) { sawGovernmentTagsChange = true; break; }
  }
  assert.ok(sawGovernmentTagsChange, 'rerollPlanetGovernment must recompute tags (which read government.tags) at least once across 30 rerolls -- a prior version left tags stale');

  // --- round-2 fix: single-field civilization rerolls must be a no-op on an UNINHABITED draft ---
  let uninhabitedDraft = null;
  for (let seed = 0; seed < 500 && !uninhabitedDraft; seed++) {
    const d = createProceduralPlanetDraft({ rng: makeSeededRng(seed + 10000), availableSpeciesIds: pool5 });
    if (d.populationScale === POPULATION_SCALE.UNINHABITED) uninhabitedDraft = d;
  }
  assert.ok(uninhabitedDraft, 'sanity: must find at least one UNINHABITED draft within 500 seeds to test reroll no-ops against');
  assert.equal(rerollPlanetGovernment(uninhabitedDraft, { rng: makeSeededRng(1) }).government, null, 'rerollPlanetGovernment on an UNINHABITED draft must be a no-op -- there is no government to reroll');
  assert.equal(rerollPlanetStability(uninhabitedDraft, { rng: makeSeededRng(1) }).stability, null, 'rerollPlanetStability on an UNINHABITED draft must be a no-op');
  assert.equal(rerollPlanetTechnologyLevel(uninhabitedDraft, { rng: makeSeededRng(1) }).technologyLevel, null, 'rerollPlanetTechnologyLevel on an UNINHABITED draft must be a no-op');
  assert.equal(rerollPlanetEconomy(uninhabitedDraft, { rng: makeSeededRng(1) }).economy.primarySector, null, 'rerollPlanetEconomy on an UNINHABITED draft must be a no-op');
  assert.equal(rerollPlanetTrade(uninhabitedDraft, { rng: makeSeededRng(1) }).economy.exports.length, 0, 'rerollPlanetTrade on an UNINHABITED draft must be a no-op');

  // --- round-2 fix: droidPrevalence is independent of population -- untouched by a population reroll, but directly rerollable (including on an UNINHABITED draft) ---
  const popRerollSamePrevalence = rerollPlanetPopulation(planetDraft, { rng: makeSeededRng(2), availableSpeciesIds: pool5 });
  assert.equal(popRerollSamePrevalence.droidPrevalence, planetDraft.droidPrevalence, 'a population reroll must NEVER change droidPrevalence -- it is an independent Location concept, not a population characteristic');
  const prevalenceReroll = rerollPlanetDroidPrevalence(uninhabitedDraft, { rng: makeSeededRng(1) });
  assert.equal(isPlanetDroidPrevalence(prevalenceReroll.droidPrevalence), true, 'rerollPlanetDroidPrevalence must work even on an UNINHABITED draft -- a fully automated derelict facility is coherent');

  // --- round-2 fix: rerollPlanetPopulation crossing the UNINHABITED boundary must recompute the WHOLE civilization block, never leave stale government/stability/economy ---
  let crossedToUninhabited = false;
  let crossedToInhabited = false;
  for (let seed = 0; seed < 3000 && (!crossedToUninhabited || !crossedToInhabited); seed++) {
    const fromInhabited = rerollPlanetPopulation(planetDraft, { rng: makeSeededRng(20000 + seed), availableSpeciesIds: pool5 });
    if (!crossedToUninhabited && fromInhabited.populationScale === POPULATION_SCALE.UNINHABITED) {
      assert.equal(fromInhabited.government, null, 'a population reroll crossing INTO uninhabited must null out government, not leave the previous roll\'s value stale');
      assert.equal(fromInhabited.economy.primarySector, null, 'a population reroll crossing INTO uninhabited must null out economy.primarySector');
      crossedToUninhabited = true;
    }
    const fromUninhabited = rerollPlanetPopulation(uninhabitedDraft, { rng: makeSeededRng(30000 + seed), availableSpeciesIds: pool5 });
    if (!crossedToInhabited && fromUninhabited.populationScale !== POPULATION_SCALE.UNINHABITED) {
      assert.notEqual(fromUninhabited.government, null, 'a population reroll crossing OUT of uninhabited must roll a real government, not leave it null');
      assert.notEqual(fromUninhabited.economy.primarySector, null, 'a population reroll crossing OUT of uninhabited must roll a real economy');
      crossedToInhabited = true;
    }
  }
  assert.ok(crossedToUninhabited && crossedToInhabited, 'must observe rerollPlanetPopulation crossing the UNINHABITED boundary in both directions within the sweep');

  // --- round-3 fix: rerollPlanetPopulation must NOT over-cascade when staying inhabited -> inhabited -- government/stability/technologyLevel/economy sectors must be PRESERVED, only population+settlementPattern+trade change ---
  let inhabitedToInhabitedChecked = 0;
  let tradeActuallyChangedAtLeastOnce = false;
  for (let seed = 0; seed < 3000; seed++) {
    const r = rerollPlanetPopulation(planetDraft, { rng: makeSeededRng(60000 + seed), availableSpeciesIds: pool5 });
    if (r.populationScale === POPULATION_SCALE.UNINHABITED) continue;
    inhabitedToInhabitedChecked++;
    assert.equal(r.government, planetDraft.government, `seed ${seed}: an inhabited->inhabited population reroll must PRESERVE government unchanged (the review's own example: a "Reroll Population" click must never silently swap Corporate protectorate for Clan council)`);
    assert.equal(r.stability, planetDraft.stability, `seed ${seed}: an inhabited->inhabited population reroll must preserve stability unchanged`);
    assert.equal(r.technologyLevel, planetDraft.technologyLevel, `seed ${seed}: an inhabited->inhabited population reroll must preserve technologyLevel unchanged`);
    assert.equal(r.economy.primarySector, planetDraft.economy.primarySector, `seed ${seed}: an inhabited->inhabited population reroll must preserve economy.primarySector unchanged`);
    assert.equal(r.economy.secondarySectors, planetDraft.economy.secondarySectors, `seed ${seed}: an inhabited->inhabited population reroll must preserve the exact secondarySectors array reference`);
    if (JSON.stringify(r.economy.exports) !== JSON.stringify(planetDraft.economy.exports) || JSON.stringify(r.economy.imports) !== JSON.stringify(planetDraft.economy.imports)) tradeActuallyChangedAtLeastOnce = true;
  }
  assert.ok(inhabitedToInhabitedChecked > 0, 'sanity: must observe at least one inhabited->inhabited population reroll in the sweep');
  assert.ok(tradeActuallyChangedAtLeastOnce, 'trade (exports/imports) SHOULD still change across an inhabited->inhabited population reroll -- it genuinely depends on the new populationScale/settlementPattern, unlike government/stability/technologyLevel/sectors');

  // --- round-2 fix: rerollPlanetEconomy's secondaryCount must flow into sector generation BEFORE trade is resolved, never slice the sector set AFTER trade already ran against it ---
  for (let seed = 0; seed < 50; seed++) {
    const zeroSecondary = rerollPlanetEconomy(planetDraft, { rng: makeSeededRng(40000 + seed), secondaryCount: 0 });
    assert.equal(zeroSecondary.economy.secondarySectors.length, 0, `seed ${seed}: rerollPlanetEconomy secondaryCount:0 must produce zero secondary sectors`);
  }

  console.log('procedural planet groundwork (biome SSOT, population-scale/uninhabited gating INCLUDING government/stability/technology/economy, independent droid-prevalence, region/sector/climate/hydrosphere/technology/settlement-pattern, shared-catalog Trade Resolver, curated-name exclusion, per-field reroll with UNINHABITED no-ops and boundary-crossing recomputation, secondaryCount ordering fix, inhabited->inhabited population-reroll non-cascade) passed.');
}

// ------------------------------------------------------------
// procedural POI groundwork
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const { createProceduralPoiDraft, rerollPoiTemplate, rerollPoiName } = await import(abs('scripts/generation/planets/poi-generator.js'));
  const { pickPoiTemplate, filterCompatiblePoiTemplates, pickCompatiblePoiTemplate } = await import(abs('scripts/generation/planets/poi-template.js'));
  const { POI_TEMPLATES } = await import(abs('scripts/generation/data/poi-templates.js'));
  const { POPULATION_SCALE } = await import(abs('scripts/generation/planets/planet-population.js'));
  const { LOCATION_DRAFT_MODE, isLocationDraftMode } = await import(abs('scripts/generation/location-draft.js'));
  const { DIAGNOSTIC_CODE } = await import(abs('scripts/generation/lib/generator-diagnostics.js'));
  const { isLocationLibraryBiome } = await import(abs('scripts/locations/location-library-seeds.js'));

  // --- round-2 fix: POI templates must split real biomes from procedural tags, exactly like planet WORLD_CLASS ---
  // --- round-3 fix: the field is renamed biomeAffinities -- it's "where this KIND of POI is plausible," never "what this SPECIFIC POI's biome actually is" ---
  for (const entry of POI_TEMPLATES) {
    for (const biome of entry.biomeAffinities) assert.equal(isLocationLibraryBiome(biome), true, `POI_TEMPLATES "${entry.value}"'s biomeAffinities "${biome}" must be a real Library value`);
  }
  assert.ok(!POI_TEMPLATES.some((e) => e.biomeAffinities.includes('criminal') || e.biomeAffinities.includes('government-bureaucracy')), 'organization-family words like "criminal"/"government-bureaucracy" must never appear in a POI template\'s biomeAffinities field (the exact review finding)');
  const typeValues = new Set(POI_TEMPLATES.map((e) => e.type));
  assert.ok(['temple', 'base', 'facility', 'city'].every((t) => typeValues.has(t)), 'POI templates must use the richer canonical Location types (temple/base/facility/city), not default almost everything to generic poi');
  const templeTemplate = POI_TEMPLATES.find((e) => e.value === 'temple');
  assert.equal(templeTemplate.type, 'temple', 'the Temple template must use canonical type "temple"');
  const ruinsTemplate = POI_TEMPLATES.find((e) => e.value === 'ruins');
  assert.equal(ruinsTemplate.type, 'temple', 'Ruins must map to the canonical "temple" type (LOCATION_TYPES labels it "Temple / Ruin")');
  const outpostTemplate = POI_TEMPLATES.find((e) => e.value === 'military-outpost');
  assert.equal(outpostTemplate.type, 'base', 'Military Outpost must map to canonical type "base"');
  const fishingVillageTemplate = POI_TEMPLATES.find((e) => e.value === 'fishing-village');
  assert.equal(fishingVillageTemplate.type, 'city', 'Fishing Village is an actual settlement and must map to canonical type "city"');

  // --- the review's own core example: an uninhabited barren world must NEVER roll Market District ---
  const uninhabitedBarrenTags = ['wasteland', 'asteroid', 'mine'];
  let sawMarketDistrict = false;
  for (let seed = 0; seed < 500; seed++) {
    const { entry } = pickCompatiblePoiTemplate({ rng: makeSeededRng(seed), planetTags: uninhabitedBarrenTags, populationScale: POPULATION_SCALE.UNINHABITED });
    if (entry.value === 'market-district') sawMarketDistrict = true;
  }
  assert.equal(sawMarketDistrict, false, 'Market District must be STRUCTURALLY excluded on an uninhabited world, not merely deprioritized (the exact review finding)');

  const compatible = filterCompatiblePoiTemplates(POI_TEMPLATES, { planetTags: uninhabitedBarrenTags, populationScale: POPULATION_SCALE.UNINHABITED });
  assert.ok(compatible.some((c) => c.value === 'ruins'), 'ruins must remain valid on an uninhabited world (no population requirement)');
  assert.ok(!compatible.some((c) => c.value === 'farmstead'), 'farmstead must be excluded on an uninhabited barren-rock world (population + biome exclusion)');

  const mismatchProbe = filterCompatiblePoiTemplates([{ value: 'x', requiredPlanetTags: ['impossible-tag'], excludedPlanetTags: [], populationRequirements: [] }], { planetTags: ['unrelated'], populationScale: '' });
  assert.equal(mismatchProbe.length, 0, 'filterCompatiblePoiTemplates must correctly exclude a template whose requiredPlanetTags are absent from the context');

  const poi = createProceduralPoiDraft({ rng: makeSeededRng(9), parentDraftId: 'draft:location:abc123456789' });
  assert.equal(isLocationDraftMode(poi.mode), true, 'POI draft mode must validate');
  assert.equal(poi.mode, LOCATION_DRAFT_MODE.GENERATE_NEW_POI, 'a POI draft must use GENERATE_NEW_POI');
  assert.match(poi.draftId, /^draft:location:[0-9a-f]{12}$/, 'POI draft id must be properly shaped');
  assert.equal(poi.parentDraftId, 'draft:location:abc123456789', 'parentDraftId must be preserved verbatim');
  assert.ok(poi.name.endsWith(poi.template.label), 'POI display name must end with its template label');
  assert.ok(Array.isArray(poi.diagnostics), 'a POI draft must always carry a diagnostics array (empty when no context mismatch)');
  assert.deepEqual(poi.biomes, poi.template.biomeAffinities, 'with NO parent planet context at all, a POI draft\'s biomes must fall back to the template\'s own biomeAffinities (the only information available)');
  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
    const d = createProceduralPoiDraft({ rng: makeSeededRng(seed) });
    for (const b of d.biomes) assert.equal(isLocationLibraryBiome(b), true, `seed ${seed}: POI draft biomes must always be real Library values, got "${b}"`);
  }

  // --- round-3 fix: biomeAffinities is WHERE a POI kind is plausible, never automatically the SPECIFIC generated POI's actual biome -- the review's own example: Ruins (affinity desert+jungle) must never claim BOTH simultaneously ---
  assert.ok(poi.generatorContext && typeof poi.generatorContext === 'object', 'a POI draft must persist a generatorContext object recording the resolved preferTags/planetTags/populationScale it was actually generated from');
  const ruinsTpl = POI_TEMPLATES.find((e) => e.value === 'ruins');
  assert.deepEqual(ruinsTpl.biomeAffinities.sort(), ['desert', 'jungle'].sort(), 'sanity: ruins must still declare both desert and jungle as PLAUSIBLE affinities');
  let sawRuinsJungleOnly = false, sawRuinsDesertLeak = false;
  for (let seed = 0; seed < 3000; seed++) {
    const jungleParent = { worldClass: { biomes: ['jungle'], tags: [] }, economy: { primarySector: null, secondarySectors: [] }, populationScale: 'settled' };
    const d = createProceduralPoiDraft({ rng: makeSeededRng(seed + 700000), parentPlanetDraft: jungleParent, preferTags: ['jungle', 'mysterious'] });
    if (d.template.value !== 'ruins') continue;
    if (d.biomes.length === 1 && d.biomes[0] === 'jungle') sawRuinsJungleOnly = true;
    if (d.biomes.includes('desert')) sawRuinsDesertLeak = true;
  }
  assert.ok(sawRuinsJungleOnly, 'a Ruins POI generated on a jungle-only parent must resolve biomes to exactly ["jungle"]');
  assert.equal(sawRuinsDesertLeak, false, 'a Ruins POI generated on a jungle-only parent must NEVER also claim "desert" -- the exact review finding');

  let sawPrisonNonEmpty = false, sawPrison = false;
  for (let seed = 0; seed < 2000; seed++) {
    const desertParent = { worldClass: { biomes: ['desert'], tags: [] }, economy: { primarySector: null, secondarySectors: [] }, populationScale: 'settled' };
    const d = createProceduralPoiDraft({ rng: makeSeededRng(seed + 800000), parentPlanetDraft: desertParent, preferTags: ['enforcement'] });
    if (d.template.value !== 'prison') continue;
    sawPrison = true;
    if (d.biomes.length !== 0) sawPrisonNonEmpty = true;
  }
  assert.ok(sawPrison, 'sanity: must observe at least one Prison pick within the sweep');
  assert.equal(sawPrisonNonEmpty, false, 'an indoor installation (Prison, empty biomeAffinities) must always resolve to empty biomes, regardless of a real parent world');

  const poiOnUninhabited = createProceduralPoiDraft({
    rng: makeSeededRng(3),
    parentPlanetDraft: { worldClass: { biomes: uninhabitedBarrenTags, tags: [] }, economy: { primarySector: null, secondarySectors: [] }, populationScale: POPULATION_SCALE.UNINHABITED }
  });
  assert.notEqual(poiOnUninhabited.template.value, 'market-district', 'end-to-end: a POI draft on an uninhabited world must also respect the hard filter');

  let contextMatchCount = 0;
  const sweepRng = makeSeededRng(500);
  for (let i = 0; i < 200; i++) {
    const p = createProceduralPoiDraft({ rng: sweepRng, parentPlanetDraft: { worldClass: { biomes: ['lava', 'mining'], tags: ['aggressive'] }, economy: { primarySector: { tags: ['business-professional'] }, secondarySectors: [] } } });
    if (p.template.tags.some((t) => ['lava', 'mining', 'aggressive', 'business-professional'].includes(t))) contextMatchCount++;
  }
  assert.ok(contextMatchCount / 200 > 0.25, `parent-planet context tags must meaningfully bias the POI template pick (got ${contextMatchCount}/200)`);

  // --- round-2 fix: economyTags/governmentTags were declared but never actually wired into the picker; now they must meaningfully bias selection ---
  const religiousPlanet = { worldClass: { biomes: [], tags: [] }, economy: { primarySector: null, secondarySectors: [] }, government: { tags: ['religion'] }, populationScale: 'settled' };
  let religiousCount = 0;
  let baselineReligiousCount = 0;
  const N = 2000;
  for (let i = 0; i < N; i++) {
    const rng1 = makeSeededRng(i * 3 + 7);
    if (['temple', 'shrine', 'monastery'].includes(createProceduralPoiDraft({ rng: rng1, parentPlanetDraft: religiousPlanet }).template.value)) religiousCount++;
    const rng2 = makeSeededRng(i * 3 + 7);
    if (['temple', 'shrine', 'monastery'].includes(createProceduralPoiDraft({ rng: rng2 }).template.value)) baselineReligiousCount++;
  }
  assert.ok(religiousCount > baselineReligiousCount, `a planet government tagged "religion" must raise the rate of religious POI templates above baseline (governmentTags wiring) -- got ${religiousCount} vs baseline ${baselineReligiousCount} of ${N}`);

  const templateReroll = rerollPoiTemplate(poi, { rng: makeSeededRng(77) });
  assert.equal(templateReroll.parentDraftId, poi.parentDraftId, 'a template reroll must preserve parentDraftId');
  assert.deepEqual(templateReroll.biomes, templateReroll.template.biomeAffinities, 'with no parent context, a template reroll\'s biomes must fall back to the NEW template\'s own biomeAffinities');
  const nameReroll = rerollPoiName(poi, { rng: makeSeededRng(33) });
  assert.equal(nameReroll.template, poi.template, 'a name reroll must preserve the template reference');

  const soft = pickPoiTemplate({ rng: makeSeededRng(1) });
  assert.equal(typeof soft.value, 'string', 'the original soft-only pickPoiTemplate() must remain backward compatible for a caller with no planet context');

  // --- round-3 fix: rerollPoiTemplate/rerollPoiName must NOT lose parent context on a bare reroll -- they must fall back to the draft's own stored generatorContext ---
  const uninhabitedBarrenParent = { worldClass: { biomes: uninhabitedBarrenTags, tags: [] }, economy: { primarySector: null, secondarySectors: [] }, populationScale: POPULATION_SCALE.UNINHABITED };
  const contextedPoi = createProceduralPoiDraft({ rng: makeSeededRng(3), parentPlanetDraft: uninhabitedBarrenParent, parentDraftId: 'draft:location:abc123456789' });
  let sawMarketDistrictOnBareReroll = false;
  for (let seed = 0; seed < 500; seed++) {
    const r = rerollPoiTemplate(contextedPoi, { rng: makeSeededRng(seed) });
    if (r.template.value === 'market-district') sawMarketDistrictOnBareReroll = true;
    assert.deepEqual(r.generatorContext, contextedPoi.generatorContext, `seed ${seed}: a bare rerollPoiTemplate() call (no options) must leave the stored generatorContext unchanged`);
  }
  assert.equal(sawMarketDistrictOnBareReroll, false, 'a BARE rerollPoiTemplate(draft, { rng }) call -- no preferTags/planetTags/populationScale resupplied -- must still respect the original hard compatibility filter via the stored generatorContext (previously it silently dropped the filter entirely)');
  const explicitOverride = rerollPoiTemplate(contextedPoi, { rng: makeSeededRng(1), planetTags: ['urban', 'trade'], populationScale: 'settled', preferTags: ['trade'] });
  assert.equal(explicitOverride.generatorContext.populationScale, 'settled', 'an explicit override on reroll must update the stored generatorContext going forward, not just this one reroll');
  const bareNameReroll = rerollPoiName(contextedPoi, { rng: makeSeededRng(1) });
  assert.ok(typeof bareNameReroll.name === 'string' && bareNameReroll.name.length > 0, 'a bare rerollPoiName() call must still resolve a valid name using the stored generatorContext.preferTags');

  console.log('procedural POI groundwork (biome/type SSOT with richer canonical Location types, biomeAffinities-vs-actual-biome derivation, economyTags/governmentTags wired into selection, hard compatibility filter excludes incompatible combos structurally, POI_CONTEXT_MISMATCH diagnostic, draft composition, per-field reroll with persisted generatorContext) passed.');
}

// ------------------------------------------------------------
// NPC narrative-generation groundwork
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const {
    createGeneratedNpcConceptDraft, generateNpcNarrativeFacts, rerollNpcAppearance, rerollNpcSecret, rerollNpcPersonality, rerollNpcMotivation, composeNpcSuggestion
  } = await import(abs('scripts/generation/npc/npc-narrative-generator.js'));
  const { NPC_CONCEPT_KIND, hasForbiddenMechanicalFields } = await import(abs('scripts/generation/npc-concept.js'));

  const facts = generateNpcNarrativeFacts({ rng: makeSeededRng(12) });
  for (const key of ['appearance', 'personality', 'mannerisms', 'motivation', 'agenda', 'secret', 'suggestion']) {
    assert.ok(typeof facts[key] === 'string' && facts[key].length > 0, `generateNpcNarrativeFacts must fill ${key} with a nonempty string`);
  }

  const draft = createGeneratedNpcConceptDraft({ kind: NPC_CONCEPT_KIND.LIVING, name: 'Kessa Rell', speciesId: 'species-twi-lek', rng: makeSeededRng(20) });
  assert.equal(draft.name, 'Kessa Rell', 'caller-supplied base fields must pass through unchanged');
  assert.equal(hasForbiddenMechanicalFields(draft), false, 'a generated NPC concept must carry zero mechanical fields');

  const overridden = createGeneratedNpcConceptDraft({ kind: NPC_CONCEPT_KIND.DROID, name: 'R4-K2', motivation: 'a custom motivation', rng: makeSeededRng(1) });
  assert.equal(overridden.motivation, 'a custom motivation', 'an explicit caller field must override the generated default');
  assert.ok(overridden.appearance.length > 0, 'other narrative fields must still be generated when only one is overridden');

  const appearanceReroll = rerollNpcAppearance(draft, { rng: makeSeededRng(999) });
  assert.equal(appearanceReroll.personality, draft.personality, 'appearance reroll must preserve personality');
  assert.equal(appearanceReroll.motivation, draft.motivation, 'appearance reroll must preserve motivation');
  assert.equal(appearanceReroll.suggestion, draft.suggestion, 'appearance reroll must preserve suggestion (unrelated to appearance)');
  const secretReroll = rerollNpcSecret(draft, { rng: makeSeededRng(42) });
  assert.equal(secretReroll.appearance, draft.appearance, 'secret reroll must preserve appearance');

  // --- the review's stale-suggestion bug fix ---
  const personalityReroll = rerollNpcPersonality(draft, { rng: makeSeededRng(999) });
  assert.notEqual(personalityReroll.personality, draft.personality, 'personality must actually change for this test to be meaningful');
  assert.ok(personalityReroll.suggestion.includes(personalityReroll.personality), 'suggestion MUST reflect the NEW personality after a reroll -- this is the exact bug the review found');
  assert.ok(personalityReroll.suggestion.includes(personalityReroll.motivation), 'suggestion must still reflect the unchanged motivation');
  assert.equal(personalityReroll.motivation, draft.motivation, 'motivation itself must be untouched by a personality reroll');
  assert.equal(composeNpcSuggestion(personalityReroll), personalityReroll.suggestion, 'the stored suggestion must exactly match a fresh independent composeNpcSuggestion() call');

  const motivationReroll = rerollNpcMotivation(draft, { rng: makeSeededRng(42) });
  assert.ok(motivationReroll.suggestion.includes(motivationReroll.motivation), 'suggestion MUST reflect the NEW motivation after a reroll');
  assert.equal(motivationReroll.personality, draft.personality, 'personality itself must be untouched by a motivation reroll');

  console.log('NPC narrative-generation groundwork (six narrative pools, caller-override precedence, zero mechanical fields, per-field reroll isolation, composeNpcSuggestion stale-prose fix) passed.');
}

// ------------------------------------------------------------
// Faction procedural groundwork
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const { generateFactionGoalSet } = await import(abs('scripts/generation/factions/faction-goals.js'));
  const { pickFactionInternalProblems } = await import(abs('scripts/generation/factions/faction-internal-problems.js'));
  const { pickFactionInstitutionalCharacter } = await import(abs('scripts/generation/factions/faction-institutional-character.js'));
  const { pickFactionLeadershipStructure } = await import(abs('scripts/generation/factions/faction-leadership-structure.js'));
  const { describeFundingTier, generateFactionResourceProfile } = await import(abs('scripts/generation/factions/faction-resource-profile.js'));
  const { SCALE_RESOURCE_MULTIPLIER_BANDS, describeScale } = await import(abs('scripts/generation/organization-metadata.js'));
  const { createFactionDraft, updateFactionDraft } = await import(abs('scripts/generation/faction-draft.js'));
  const { ARCHETYPE_RANK_TIER_MAP, CORPORATE_RANK_TIER_MAP, FORCE_TRADITION_RANK_TIER_MAP } = await import(abs('scripts/generation/rank-metadata.js'));

  assert.equal(typeof pickFactionInstitutionalCharacter({ rng: makeSeededRng(8) }).value, 'string', 'institutional-character pick must resolve');
  assert.equal(typeof pickFactionLeadershipStructure({ rng: makeSeededRng(8) }).value, 'string', 'leadership-structure pick must resolve');

  let differCount = 0;
  const sweepRng = makeSeededRng(1);
  for (let i = 0; i < 100; i++) {
    const g = generateFactionGoalSet({ rng: sweepRng });
    if (g.publicGoal.value !== g.actualGoal.value) differCount++;
  }
  assert.ok(differCount > 50, `public and actual goals must differ most of the time (independent rolls) -- got ${differCount}/100`);

  const problems = pickFactionInternalProblems({ rng: makeSeededRng(3), count: 2 });
  assert.equal(problems.length, 2, 'pickFactionInternalProblems must respect count');
  assert.equal(new Set(problems.map((p) => p.value)).size, 2, 'pickFactionInternalProblems must return distinct entries');

  for (const band of SCALE_RESOURCE_MULTIPLIER_BANDS) {
    assert.notEqual(describeFundingTier(band.min), undefined, `every multiplier band must map to a funding tier (scale ${band.min})`);
  }
  const resourceProfile = generateFactionResourceProfile({ scale: 15, rng: makeSeededRng(4), flavorCount: 2 });
  assert.equal(resourceProfile.reachLabel, describeScale(15), 'reachLabel must exactly match the existing describeScale() authority');
  assert.equal(resourceProfile.resourceFlavors.length, 2, 'flavorCount must be respected');

  assert.equal(ARCHETYPE_RANK_TIER_MAP.corporation, CORPORATE_RANK_TIER_MAP, 'the corporation archetype must resolve to the corporate rank map');
  assert.equal(ARCHETYPE_RANK_TIER_MAP.force_order, FORCE_TRADITION_RANK_TIER_MAP, 'the force_order archetype must resolve to the Force-tradition rank map');

  const factionDraft = createFactionDraft({
    name: 'Test Faction', scale: 9, institutionalCharacter: 'secretive', leadershipStructure: 'a council',
    publicGoal: 'protect the community', actualGoal: 'accumulate wealth', currentObjective: 'securing supplies',
    internalProblems: ['a rivalry'], resourceProfile, territoryLocationIds: ['loc-real-123'], territoryLocationDraftIds: ['draft:location:abc123456789']
  });
  assert.equal(factionDraft.resourceProfile.fundingTier, resourceProfile.fundingTier, 'resourceProfile must pass through the Faction draft unchanged');
  assert.equal(factionDraft.territoryLocationIds[0], 'loc-real-123', 'territoryLocationIds must be preserved');
  const bareFaction = createFactionDraft({ name: 'Bare' });
  assert.equal(bareFaction.resourceProfile, null, 'omitted resourceProfile must default to null, never a fabricated object');
  assert.deepEqual(bareFaction.internalProblems, [], 'omitted internalProblems must default to an empty array');
  const rerolledFaction = updateFactionDraft(factionDraft, { publicGoal: 'a new public goal' });
  assert.equal(rerolledFaction.actualGoal, factionDraft.actualGoal, 'updateFactionDraft must preserve unrelated Phase 8D-2 fields, not just the original schema');

  console.log('Faction procedural groundwork (independent public/actual goal rolls, resource profile reuses the existing Scale authority verbatim, rank-metadata archetype extension, faction-draft schema extension + generic reroll) passed.');
}

// ------------------------------------------------------------
// Job/mission procedural groundwork
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const { describeJobArchetype } = await import(abs('scripts/generation/jobs/job-archetype-metadata.js'));
  const { pickObjectiveConstraints } = await import(abs('scripts/generation/jobs/objective-constraint.js'));
  const { createMissionSubjectDraft } = await import(abs('scripts/generation/jobs/mission-subject.js'));
  const { pickCargoConcept, pickCommodityCargo, pickNarrativeCargo } = await import(abs('scripts/generation/jobs/cargo-concept.js'));
  const { GALACTIC_COMMODITIES: CARGO_COMMODITIES } = await import(abs('scripts/generation/data/galactic-commodities.js'));
  const { pickIntelClues } = await import(abs('scripts/generation/jobs/intel-clue-concept.js'));
  const { pickJobComplications } = await import(abs('scripts/generation/jobs/job-complication.js'));
  const { pickJobTwist } = await import(abs('scripts/generation/jobs/job-twist.js'));
  const { generateJobConsequences } = await import(abs('scripts/generation/jobs/job-consequence.js'));
  const { hasForbiddenMechanicalFields } = await import(abs('scripts/generation/npc-concept.js'));
  const { pickJobUrgency, isJobUrgency } = await import(abs('scripts/generation/jobs/job-urgency.js'));
  const { pickJobLegality, pickJobVisibility, isJobLegality, isJobVisibility, JOB_VISIBILITY, JOB_LEGALITY } = await import(abs('scripts/generation/jobs/job-legality-visibility.js'));
  const { suggestEncounterPhaseSequence, isEncounterPhase } = await import(abs('scripts/generation/jobs/encounter-phase.js'));
  const {
    createOppositionRequest, OPPOSITION_THREAT_LEVEL, OPPOSITION_COUNT_BAND, OPPOSITION_LEADER_REQUIREMENT, OPPOSITION_SUPPORT_LEVEL
  } = await import(abs('scripts/generation/jobs/opposition-request.js'));
  const { OBJECTIVE_DIFFICULTY } = await import(abs('scripts/generation/objective-economy.js'));
  const { COMMAND_TIER } = await import(abs('scripts/generation/rank-metadata.js'));
  const { normalizeObjectiveTemplate, OBJECTIVE_TEMPLATE_FIXTURES } = await import(abs('scripts/generation/objective-template.js'));

  assert.equal(describeJobArchetype('rescue').typicalLegality, 'legal', 'a known archetype must return its curated metadata');
  assert.equal(describeJobArchetype('not-a-real-type').typicalVisibility, 'posted', 'an unknown archetype must fail safe to a neutral default, never throw');

  const constraints = pickObjectiveConstraints({ rng: makeSeededRng(6), count: 2 });
  assert.equal(constraints.length, 2, 'pickObjectiveConstraints must respect count');
  assert.equal(new Set(constraints.map((c) => c.value)).size, 2, 'pickObjectiveConstraints must return distinct entries');

  const subjectNoNpc = createMissionSubjectDraft({ rng: makeSeededRng(6) });
  assert.equal(subjectNoNpc.npcConcept, null, 'withNpcConcept must default to false (no npcConcept attached)');
  const subjectWithNpc = createMissionSubjectDraft({ rng: makeSeededRng(6), withNpcConcept: true, name: 'Dok Varane' });
  assert.equal(subjectWithNpc.npcConcept.name, 'Dok Varane', 'an attached npcConcept must carry the supplied name');
  assert.equal(subjectWithNpc.npcConcept.role, subjectWithNpc.role, 'the attached npcConcept\'s role must match the rolled subject archetype');
  assert.equal(hasForbiddenMechanicalFields(subjectWithNpc.npcConcept), false, 'an attached mission-subject npcConcept must carry zero mechanical fields');

  assert.equal(typeof pickCargoConcept({ rng: makeSeededRng(11) }).value, 'string', 'cargo-concept pick must resolve');

  // --- round-2 fix: cargo must resolve commodities against the SHARED Galactic Commodity Catalog, never its own duplicate vocabulary ---
  const commodityIdsForCargo = new Set(CARGO_COMMODITIES.map((c) => c.id));
  let commodityKindCount = 0, narrativeKindCount = 0;
  for (let seed = 0; seed < 1000; seed++) {
    const concept = pickCargoConcept({ rng: makeSeededRng(seed) });
    assert.ok(['commodity', 'narrative'].includes(concept.kind), 'every cargo concept must declare kind "commodity" or "narrative"');
    if (concept.kind === 'commodity') {
      commodityKindCount++;
      assert.ok(commodityIdsForCargo.has(concept.commodityId), `a commodity cargo concept's commodityId ("${concept.commodityId}") must resolve in the shared Galactic Commodity Catalog`);
    } else {
      narrativeKindCount++;
      assert.equal(concept.commodityId, null, 'a narrative cargo concept must never carry a commodityId');
    }
  }
  assert.ok(commodityKindCount > 0 && narrativeKindCount > 0, `pickCargoConcept must produce both kinds across 1000 draws, got commodity=${commodityKindCount} narrative=${narrativeKindCount}`);
  const narrativeOnly = pickNarrativeCargo({ rng: makeSeededRng(1) });
  assert.equal(narrativeOnly.kind, 'narrative', 'pickNarrativeCargo must always return a narrative-kind concept');

  // --- round-3 fix: Job legality (legal/gray-area/illegal/black-market) and commodity legality (legal/restricted/illegal) are DIFFERENT vocabularies -- must be explicitly translated via jobLegality, never raw-string compared ---
  for (let seed = 0; seed < 500; seed++) {
    const c = pickCommodityCargo({ rng: makeSeededRng(seed), jobLegality: JOB_LEGALITY.GRAY_AREA });
    assert.equal(c.legality, 'restricted', `seed ${seed}: jobLegality GRAY_AREA has no matching literal commodity legality -- it must translate to "restricted", never silently fall back to the unfiltered full catalog`);
  }
  for (let seed = 0; seed < 500; seed++) {
    const c = pickCommodityCargo({ rng: makeSeededRng(seed), jobLegality: JOB_LEGALITY.BLACK_MARKET });
    assert.equal(c.legality, 'illegal', `seed ${seed}: jobLegality BLACK_MARKET has no matching literal commodity legality -- it must translate to "illegal" only`);
  }
  const illegalCommodityCargo = pickCommodityCargo({ rng: makeSeededRng(1), jobLegality: JOB_LEGALITY.ILLEGAL });
  assert.ok(['illegal', 'restricted'].includes(illegalCommodityCargo.legality), 'pickCommodityCargo jobLegality ILLEGAL must translate to illegal/restricted commodities');

  // --- round-3 fix: the narrative branch previously received NO legality signal at all -- a legal-only Job could still roll an "unmarked crate" tagged illegal ---
  for (let seed = 0; seed < 500; seed++) {
    const n = pickNarrativeCargo({ rng: makeSeededRng(seed), jobLegality: JOB_LEGALITY.LEGAL });
    assert.ok(n.tags.includes('legal'), `seed ${seed}: pickNarrativeCargo jobLegality LEGAL must only pick a narrative concept whose own tags include "legal", got ${JSON.stringify(n.tags)}`);
  }
  let sawNonLegalOnLegalJob = false;
  for (let seed = 0; seed < 2000; seed++) {
    const concept = pickCargoConcept({ rng: makeSeededRng(seed), jobLegality: JOB_LEGALITY.LEGAL, narrativeChance: 0.5 });
    const isNonLegal = concept.kind === 'commodity' ? concept.legality !== 'legal' : !concept.tags.includes('legal');
    if (isNonLegal) sawNonLegalOnLegalJob = true;
  }
  assert.equal(sawNonLegalOnLegalJob, false, 'pickCargoConcept with jobLegality LEGAL must NEVER produce a non-legal item on EITHER branch across 2000 draws -- the exact review finding (narrative branch previously ignored legality entirely)');

  // --- round-3 fix: preferTags was matched only against commodity.tags, never producedBy/demandedBy (the same dead-affinity bug already fixed once for POIs) ---
  const commodityById = new Map(CARGO_COMMODITIES.map((c) => [c.id, c]));
  let miningAffinityMatches = 0, miningAffinityBaseline = 0;
  const AFFINITY_N = 3000;
  for (let i = 0; i < AFFINITY_N; i++) {
    const c1 = pickCommodityCargo({ rng: makeSeededRng(i), preferTags: ['mining', 'mountain'] });
    if ((commodityById.get(c1.commodityId)?.producedBy || []).some((t) => ['mining', 'mountain'].includes(t))) miningAffinityMatches++;
    const c2 = pickCommodityCargo({ rng: makeSeededRng(i) });
    if ((commodityById.get(c2.commodityId)?.producedBy || []).some((t) => ['mining', 'mountain'].includes(t))) miningAffinityBaseline++;
  }
  assert.ok(miningAffinityMatches > miningAffinityBaseline, `preferTags matching a commodity's producedBy (not just tags) must measurably bias selection -- got ${miningAffinityMatches} vs baseline ${miningAffinityBaseline} of ${AFFINITY_N}`);
  const clues = pickIntelClues({ rng: makeSeededRng(11), count: 2 });
  assert.equal(clues.length, 2, 'pickIntelClues must respect count');
  const jobComplications = pickJobComplications({ rng: makeSeededRng(11), count: 2 });
  assert.equal(new Set(jobComplications.map((c) => c.value)).size, 2, 'pickJobComplications must return distinct entries');
  assert.equal(typeof pickJobTwist({ rng: makeSeededRng(11) }).value, 'string', 'job-twist pick must resolve');
  const consequences = generateJobConsequences({ rng: makeSeededRng(11) });
  assert.ok(consequences.success.value && consequences.failure.value, 'generateJobConsequences must roll both success and failure consequences');

  for (let seed = 0; seed < 20; seed++) assert.equal(isJobUrgency(pickJobUrgency({ rng: makeSeededRng(seed) }).value), true, 'every urgency pick must be valid');
  assert.equal(isJobLegality(pickJobLegality({ rng: makeSeededRng(1) }).value), true, 'legality pick must be valid');
  assert.equal(isJobVisibility(pickJobVisibility({ rng: makeSeededRng(1) }).value), true, 'visibility pick must be valid');
  assert.equal(JOB_VISIBILITY.POSTED, 'posted', 'JOB_VISIBILITY.POSTED must exactly match faction-draft.js\'s jobDefaults.visibility default');

  const sequence = suggestEncounterPhaseSequence({ rng: makeSeededRng(5), count: 3 });
  assert.equal(sequence.length, 3, 'a requested phase sequence length must be respected');
  assert.equal(new Set(sequence).size, 3, 'a phase sequence must contain distinct phases');
  assert.ok(sequence.every(isEncounterPhase), 'every suggested phase must be a valid ENCOUNTER_PHASE value');

  // --- opposition-request: the expanded, less-lossy contract ---
  const request = createOppositionRequest({
    archetypeTags: ['Security Guards', 'security guards'],
    environmentTags: ['urban', 'industrial'],
    organizationTags: ['crime-syndicate'],
    requiredRoles: ['leader', 'muscle'],
    optionalRoles: ['lookout'],
    leaderRequirement: OPPOSITION_LEADER_REQUIREMENT.REQUIRED,
    specialistRequirements: ['slicer', 'sniper'],
    reinforcementLevel: OPPOSITION_SUPPORT_LEVEL.MODERATE,
    vehicleSupport: OPPOSITION_SUPPORT_LEVEL.LIGHT,
    difficulty: OBJECTIVE_DIFFICULTY.DIFFICULT,
    rankContext: COMMAND_TIER.SQUAD_COMMAND,
    speciesContext: ['species-rodian', 'species-human'],
    threatLevel: OPPOSITION_THREAT_LEVEL.DANGEROUS,
    countBand: OPPOSITION_COUNT_BAND.SQUAD,
    notes: 'guards the warehouse district'
  });
  assert.equal(request.archetypeTags.length, 1, 'archetypeTags must be normalized/deduped');
  assert.equal(request.difficulty, 'difficult', 'difficulty must reuse OBJECTIVE_DIFFICULTY verbatim, not a fourth vocabulary');
  assert.equal(request.rankContext, 'squad-command', 'rankContext must reuse COMMAND_TIER verbatim');
  assert.equal(request.leaderRequirement, 'required', 'leaderRequirement must be preserved');
  assert.equal(request.requiredRoles.length, 2, 'requiredRoles must be preserved');
  assert.equal(request.speciesContext.length, 2, 'speciesContext must be preserved as caller-supplied, unresolved (never validated against SpeciesRegistry here)');
  assert.ok(!('statblockRef' in request) && !('actorId' in request) && !('uuid' in request), 'an opposition request must NEVER reference an actual statblock/actor, even in its expanded form');
  const badRequest = createOppositionRequest({ difficulty: 'not-real', rankContext: 'not-real', leaderRequirement: 'not-real' });
  assert.equal(badRequest.difficulty, OBJECTIVE_DIFFICULTY.STANDARD, 'an invalid difficulty must fail safe to standard');
  assert.equal(badRequest.rankContext, COMMAND_TIER.NONE, 'an invalid rankContext must fail safe to none');
  assert.equal(badRequest.leaderRequirement, OPPOSITION_LEADER_REQUIREMENT.NONE, 'an invalid leaderRequirement must fail safe to none');

  // --- objective-template.js: the new optional constraints/hints fields ---
  const rescueFixture = OBJECTIVE_TEMPLATE_FIXTURES.find((t) => t.id === 'rescue-person-secured-site');
  assert.ok(rescueFixture.constraints.length > 0, 'the rescue fixture should demonstrate the new constraints field');
  assert.ok(rescueFixture.oppositionHints.length > 0, 'the rescue fixture should demonstrate the new oppositionHints field');
  assert.ok(Array.isArray(rescueFixture.locationHints), 'an unpopulated hint field must still default to an array, never undefined');
  const deliveryFixture = OBJECTIVE_TEMPLATE_FIXTURES.find((t) => t.id === 'delivery-cargo-local');
  assert.deepEqual(deliveryFixture.constraints, [], 'a fixture that never sets these new fields must still get safe empty-array defaults');
  const garbageFiltered = normalizeObjectiveTemplate({ id: 't', missionTypes: ['rescue'], tiers: ['primary'], template: 'Test {x}.', slots: { x: { type: 'location' } }, constraints: ['valid', 42, null, 'also valid'] });
  assert.equal(garbageFiltered.constraints.length, 2, 'non-string constraint entries must be filtered out, never crash normalization');

  console.log('Job/mission procedural groundwork (archetype metadata, mission-subject npcConcept attachment, urgency/legality/visibility vocab, cargo jobLegality translation + producedBy/demandedBy affinity wiring, encounter-phase suggestion, expanded opposition-request reusing existing difficulty/rank authorities, objective-template constraints/hints) passed.');
}

// ------------------------------------------------------------
// Location current-events
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const { generateLocationEvent, isLocationEventSeverity } = await import(abs('scripts/generation/location-event.js'));

  for (let seed = 0; seed < 20; seed++) {
    const event = generateLocationEvent({ rng: makeSeededRng(seed) });
    assert.ok(event.description.length > 0, 'every generated event must carry a nonempty description');
    assert.equal(isLocationEventSeverity(event.severity), true, 'every generated event must carry a valid severity');
  }

  console.log('Location current-events (deterministic description+severity generation) passed.');
}

console.log('PHASE 8D-2 procedural content ecosystem groundwork suite (including independent-review correction pass rounds 1, 2, and 3) passed.');
