import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — PHASE 8D-2: PROCEDURAL CONTENT
// ECOSYSTEM GROUNDWORK.
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
// Every module here is a PURE, RNG-injectable function set with no
// Foundry dependency (this suite installs the shim anyway to match the
// established convention). ADDITIVE DESIGN CONTRACT — none of this code
// existed before this phase, so there is no fail-before/pass-after
// cycle; draft-safety is proven by the EXISTING recursive source scan in
// `gm-generation-phase8d1-foundation.test.mjs` (it already walks all of
// `scripts/generation/` recursively, so it already covers every file
// added in this phase without needing a duplicate scan here).

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
// naming ecosystem: planet/system/settlement/Faction names
// ------------------------------------------------------------
{
  const { getRandomPlanetName, rerollPlanetNamePrefix, rerollPlanetNameSuffix } = await import(abs('scripts/generation/names/planet-name-generator.js'));
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));

  const planetName = getRandomPlanetName({ rng: makeSeededRng(7) });
  assert.equal(planetName.name, `${planetName.prefix.value}${planetName.suffix.value}`, 'planet name must be prefix+suffix joined with no space');
  const prefixReroll = rerollPlanetNamePrefix(planetName, { rng: makeSeededRng(99) });
  assert.equal(prefixReroll.suffix.value, planetName.suffix.value, 'rerollPlanetNamePrefix must preserve the suffix');
  const suffixReroll = rerollPlanetNameSuffix(planetName, { rng: makeSeededRng(123) });
  assert.equal(suffixReroll.prefix.value, planetName.prefix.value, 'rerollPlanetNameSuffix must preserve the prefix');

  const { getRandomSystemName } = await import(abs('scripts/generation/names/system-name-generator.js'));
  assert.equal(getRandomSystemName({ planetName: 'Dantooine' }).name, 'Dantooine system', 'default system name must follow the "<planet> system" Library convention');
  const independentSystem = getRandomSystemName({ independent: true, rng: makeSeededRng(3) });
  assert.equal(independentSystem.independent, true, 'independent system name must set independent: true');
  assert.equal(independentSystem.planetName, '', 'independent system name must not carry a planetName');

  const {
    getRandomSettlementName, rerollSettlementNamePrefix, rerollSettlementNameRoot, rerollSettlementNameSuffix, SETTLEMENT_NAME_TEMPLATE
  } = await import(abs('scripts/generation/names/settlement-name-generator.js'));
  let sawEveryTemplate = new Set();
  const sweepRng = makeSeededRng(42);
  for (let i = 0; i < 300; i++) sawEveryTemplate.add(getRandomSettlementName({ rng: sweepRng }).template);
  assert.equal(sawEveryTemplate.size, 4, 'all 4 settlement-name templates must be reachable within 300 draws');
  const rootOnlyDraft = { name: 'Kalar', template: SETTLEMENT_NAME_TEMPLATE.ROOT_ONLY, prefix: null, root: { value: 'Kalar' }, suffix: null };
  assert.equal(rerollSettlementNamePrefix(rootOnlyDraft, { rng: makeSeededRng(1) }), rootOnlyDraft, 'rerolling an unused prefix slot must be a declared no-op (same reference)');

  const { getRandomFactionName, rerollFactionNameRoot, rerollFactionNameTypeNoun, rerollFactionNameDescriptor, FACTION_NAME_TEMPLATE } = await import(abs('scripts/generation/names/faction-name-generator.js'));
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

  console.log('naming ecosystem (planet/system/settlement/Faction names -- deterministic reroll preservation, template no-ops, family scoping) passed.');
}

// ------------------------------------------------------------
// procedural planet groundwork
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const { generateProceduralPlanetPopulationProfile, CHARACTER_DOMINANT_WEIGHT_RANGE } = await import(abs('scripts/generation/planets/planet-population.js'));
  const { POPULATION_DIVERSITY } = await import(abs('scripts/generation/location-population-profile.js'));

  const emptyPool = generateProceduralPlanetPopulationProfile({ availableSpeciesIds: [], rng: makeSeededRng(1) });
  assert.deepEqual(emptyPool.profile.speciesWeights, [], 'an empty species pool must yield an empty profile');
  assert.equal(emptyPool.profile.fallbackUsed, false, 'an empty procedural profile must NEVER silently claim the generic galactic fallback was used');

  const pool5 = ['species-human', 'species-twi-lek', 'species-rodian', 'species-duros', 'species-zabrak'];
  for (let seed = 0; seed < 500; seed++) {
    const { profile } = generateProceduralPlanetPopulationProfile({ availableSpeciesIds: pool5, rng: makeSeededRng(seed) });
    const sum = profile.speciesWeights.reduce((a, e) => a + e.weight, 0);
    assert.equal(sum, 100, `species weights must always sum to exactly 100 (seed ${seed}, got ${sum})`);
    assert.ok(profile.speciesWeights.every((e) => pool5.includes(e.speciesId)), 'every species must come from the supplied pool, never invented');
  }

  const nonHumanPool = ['species-twi-lek', 'species-rodian', 'species-duros'];
  for (let seed = 0; seed < 50; seed++) {
    const { dominantSpeciesId } = generateProceduralPlanetPopulationProfile({ availableSpeciesIds: nonHumanPool, rng: makeSeededRng(seed) });
    assert.notEqual(dominantSpeciesId, 'species-human', 'a pool with no Human entry must never surface Human as dominant -- proves non-Human species CAN dominate');
  }

  const pinned = generateProceduralPlanetPopulationProfile({
    availableSpeciesIds: pool5, characterOverride: POPULATION_DIVERSITY.HOMOGENEOUS, dominantSpeciesIdOverride: 'species-zabrak', rng: makeSeededRng(42)
  });
  assert.equal(pinned.dominantSpeciesId, 'species-zabrak', 'dominantSpeciesIdOverride must be honored exactly');
  const dominantEntry = pinned.profile.speciesWeights.find((e) => e.speciesId === 'species-zabrak');
  assert.ok(dominantEntry.weight >= CHARACTER_DOMINANT_WEIGHT_RANGE[POPULATION_DIVERSITY.HOMOGENEOUS].min, 'a pinned homogeneous character must respect its weight band');

  const { pickPlanetGovernment } = await import(abs('scripts/generation/planets/planet-government.js'));
  const { pickPlanetEconomies } = await import(abs('scripts/generation/planets/planet-economy.js'));
  const { pickPlanetHazards } = await import(abs('scripts/generation/planets/planet-hazards.js'));
  const { pickPlanetHistoryHooks } = await import(abs('scripts/generation/planets/planet-history-hooks.js'));
  const { pickPlanetTraits } = await import(abs('scripts/generation/planets/planet-traits.js'));
  assert.ok(typeof pickPlanetGovernment({ rng: makeSeededRng(5) }).value === 'string', 'planet government pick must resolve');
  assert.equal(pickPlanetEconomies({ rng: makeSeededRng(5), count: 2 }).length, 2, 'planet economies count must be respected');
  assert.equal(pickPlanetHazards({ rng: makeSeededRng(5), count: 0 }).length, 0, 'planet hazards count 0 must return an empty array');
  assert.equal(pickPlanetHistoryHooks({ rng: makeSeededRng(5), count: 1 }).length, 1, 'planet history-hooks count must be respected');
  assert.equal(new Set(pickPlanetTraits({ rng: makeSeededRng(5), count: 3 }).map((t) => t.value)).size, 3, 'planet traits must return distinct entries');

  const {
    createProceduralPlanetDraft, rerollPlanetWorldClass, rerollPlanetGovernment, rerollPlanetPopulation
  } = await import(abs('scripts/generation/planets/planet-draft.js'));
  const { LOCATION_DRAFT_MODE, isLocationDraftMode } = await import(abs('scripts/generation/location-draft.js'));
  const { isProvenance } = await import(abs('scripts/generation/provenance.js'));

  const planetDraft = createProceduralPlanetDraft({ rng: makeSeededRng(17), availableSpeciesIds: pool5 });
  assert.equal(isLocationDraftMode(planetDraft.mode), true, 'planet draft mode must be a valid LOCATION_DRAFT_MODE');
  assert.equal(planetDraft.mode, LOCATION_DRAFT_MODE.GENERATE_NEW_PLANET, 'default includeChild=false must give GENERATE_NEW_PLANET');
  assert.match(planetDraft.draftId, /^draft:location:[0-9a-f]{12}$/, 'planet draft must carry a properly-shaped draft id');
  assert.equal(planetDraft.locationId, '', 'a planet draft must never carry a canonical Location id');
  assert.equal(isProvenance(planetDraft.provenance), true, 'planet draft must carry valid provenance');
  assert.equal(planetDraft.system, `${planetDraft.name} system`, 'default system name convention must hold on the composed draft');

  const withChild = createProceduralPlanetDraft({ rng: makeSeededRng(3), availableSpeciesIds: pool5, includeChild: true });
  assert.equal(withChild.mode, LOCATION_DRAFT_MODE.GENERATE_NEW_PLANET_AND_POI, 'includeChild=true must give GENERATE_NEW_PLANET_AND_POI');

  const worldClassReroll = rerollPlanetWorldClass(planetDraft, { rng: makeSeededRng(999) });
  assert.equal(worldClassReroll.name, planetDraft.name, 'a worldClass reroll must preserve the planet\'s name');
  assert.equal(worldClassReroll.populationProfile, planetDraft.populationProfile, 'a worldClass reroll must preserve the population-profile reference');
  const govReroll = rerollPlanetGovernment(planetDraft, { rng: makeSeededRng(55) });
  assert.equal(govReroll.tags, planetDraft.tags, 'a government reroll must not touch tags (government is not read by the tag composer)');
  const popReroll = rerollPlanetPopulation(planetDraft, { rng: makeSeededRng(2), availableSpeciesIds: [] });
  assert.equal(popReroll.name, planetDraft.name, 'a population reroll must preserve narrative fields');
  assert.deepEqual(popReroll.populationProfile.speciesWeights, [], 'a population reroll with an empty pool must empty speciesWeights, never fall back');

  console.log('procedural planet groundwork (quality tables, no-fallback population generation, sum-to-100 invariant, non-Human dominance, draft composition, per-field reroll) passed.');
}

// ------------------------------------------------------------
// procedural POI groundwork
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const { pickPoiTemplate } = await import(abs('scripts/generation/planets/poi-template.js'));
  assert.ok(typeof pickPoiTemplate({ rng: makeSeededRng(9) }).value === 'string', 'POI template pick must resolve');

  const { createProceduralPoiDraft, rerollPoiTemplate, rerollPoiName } = await import(abs('scripts/generation/planets/poi-generator.js'));
  const { LOCATION_DRAFT_MODE, isLocationDraftMode } = await import(abs('scripts/generation/location-draft.js'));

  const poi = createProceduralPoiDraft({ rng: makeSeededRng(9), parentDraftId: 'draft:location:abc123456789' });
  assert.equal(isLocationDraftMode(poi.mode), true, 'POI draft mode must validate');
  assert.equal(poi.mode, LOCATION_DRAFT_MODE.GENERATE_NEW_POI, 'a POI draft must use GENERATE_NEW_POI');
  assert.match(poi.draftId, /^draft:location:[0-9a-f]{12}$/, 'POI draft id must be properly shaped');
  assert.equal(poi.parentDraftId, 'draft:location:abc123456789', 'parentDraftId must be preserved verbatim');
  assert.ok(poi.name.endsWith(poi.template.label), 'POI display name must end with its template label');

  let contextMatchCount = 0;
  const sweepRng = makeSeededRng(500);
  for (let i = 0; i < 200; i++) {
    const p = createProceduralPoiDraft({ rng: sweepRng, parentPlanetDraft: { worldClass: { tags: ['volcanic', 'mountain'] }, economies: [{ tags: ['business-professional'] }] } });
    if (p.template.tags.some((t) => ['volcanic', 'mountain', 'business-professional'].includes(t))) contextMatchCount++;
  }
  assert.ok(contextMatchCount / 200 > 0.25, `parent-planet context tags must meaningfully bias the POI template pick (got ${contextMatchCount}/200)`);

  const templateReroll = rerollPoiTemplate(poi, { rng: makeSeededRng(77) });
  assert.equal(templateReroll.parentDraftId, poi.parentDraftId, 'a template reroll must preserve parentDraftId');
  const nameReroll = rerollPoiName(poi, { rng: makeSeededRng(33) });
  assert.equal(nameReroll.template, poi.template, 'a name reroll must preserve the template reference');

  console.log('procedural POI groundwork (draft composition, deterministic context weighting, per-field reroll) passed.');
}

// ------------------------------------------------------------
// NPC narrative-generation groundwork
// ------------------------------------------------------------
{
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const { createGeneratedNpcConceptDraft, generateNpcNarrativeFacts, rerollNpcAppearance, rerollNpcSecret } = await import(abs('scripts/generation/npc/npc-narrative-generator.js'));
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
  assert.equal(appearanceReroll.agenda, draft.agenda, 'appearance reroll must preserve agenda');
  assert.equal(appearanceReroll.secret, draft.secret, 'appearance reroll must preserve secret');
  assert.equal(appearanceReroll.name, draft.name, 'appearance reroll must preserve base fields too');
  const secretReroll = rerollNpcSecret(draft, { rng: makeSeededRng(42) });
  assert.equal(secretReroll.appearance, draft.appearance, 'secret reroll must preserve appearance');

  console.log('NPC narrative-generation groundwork (six narrative pools, caller-override precedence, zero mechanical fields, per-field reroll isolation) passed.');
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

  assert.ok(typeof pickFactionInstitutionalCharacter({ rng: makeSeededRng(8) }).value === 'string', 'institutional-character pick must resolve');
  assert.ok(typeof pickFactionLeadershipStructure({ rng: makeSeededRng(8) }).value === 'string', 'leadership-structure pick must resolve');
  const { describeFundingTier, generateFactionResourceProfile } = await import(abs('scripts/generation/factions/faction-resource-profile.js'));
  const { SCALE_RESOURCE_MULTIPLIER_BANDS, describeScale } = await import(abs('scripts/generation/organization-metadata.js'));
  const { createFactionDraft, updateFactionDraft } = await import(abs('scripts/generation/faction-draft.js'));
  const { ARCHETYPE_RANK_TIER_MAP, CORPORATE_RANK_TIER_MAP, FORCE_TRADITION_RANK_TIER_MAP } = await import(abs('scripts/generation/rank-metadata.js'));

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

  assert.equal(ARCHETYPE_RANK_TIER_MAP.corporation, CORPORATE_RANK_TIER_MAP, 'the corporation archetype must resolve to the new corporate rank map');
  assert.equal(ARCHETYPE_RANK_TIER_MAP.force_order, FORCE_TRADITION_RANK_TIER_MAP, 'the force_order archetype must resolve to the new Force-tradition rank map');

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
  const { pickCargoConcept } = await import(abs('scripts/generation/jobs/cargo-concept.js'));
  const { pickIntelClues } = await import(abs('scripts/generation/jobs/intel-clue-concept.js'));
  const { pickJobComplications } = await import(abs('scripts/generation/jobs/job-complication.js'));
  const { pickJobTwist } = await import(abs('scripts/generation/jobs/job-twist.js'));
  const { generateJobConsequences } = await import(abs('scripts/generation/jobs/job-consequence.js'));

  const constraints = pickObjectiveConstraints({ rng: makeSeededRng(6), count: 2 });
  assert.equal(constraints.length, 2, 'pickObjectiveConstraints must respect count');
  assert.equal(new Set(constraints.map((c) => c.value)).size, 2, 'pickObjectiveConstraints must return distinct entries');

  assert.ok(typeof pickCargoConcept({ rng: makeSeededRng(11) }).value === 'string', 'cargo-concept pick must resolve');
  const clues = pickIntelClues({ rng: makeSeededRng(11), count: 2 });
  assert.equal(clues.length, 2, 'pickIntelClues must respect count');
  const jobComplications = pickJobComplications({ rng: makeSeededRng(11), count: 2 });
  assert.equal(new Set(jobComplications.map((c) => c.value)).size, 2, 'pickJobComplications must return distinct entries');
  assert.ok(typeof pickJobTwist({ rng: makeSeededRng(11) }).value === 'string', 'job-twist pick must resolve');
  const consequences = generateJobConsequences({ rng: makeSeededRng(11) });
  assert.ok(consequences.success.value && consequences.failure.value, 'generateJobConsequences must roll both success and failure consequences');
  const { hasForbiddenMechanicalFields } = await import(abs('scripts/generation/npc-concept.js'));
  const { pickJobUrgency, isJobUrgency } = await import(abs('scripts/generation/jobs/job-urgency.js'));
  const { pickJobLegality, pickJobVisibility, isJobLegality, isJobVisibility, JOB_VISIBILITY } = await import(abs('scripts/generation/jobs/job-legality-visibility.js'));
  const { suggestEncounterPhaseSequence, isEncounterPhase } = await import(abs('scripts/generation/jobs/encounter-phase.js'));
  const { createOppositionRequest, OPPOSITION_THREAT_LEVEL, OPPOSITION_COUNT_BAND } = await import(abs('scripts/generation/jobs/opposition-request.js'));

  assert.equal(describeJobArchetype('rescue').typicalLegality, 'legal', 'a known archetype must return its curated metadata');
  assert.equal(describeJobArchetype('not-a-real-type').typicalVisibility, 'posted', 'an unknown archetype must fail safe to a neutral default, never throw');

  const subjectNoNpc = createMissionSubjectDraft({ rng: makeSeededRng(6) });
  assert.equal(subjectNoNpc.npcConcept, null, 'withNpcConcept must default to false (no npcConcept attached)');
  const subjectWithNpc = createMissionSubjectDraft({ rng: makeSeededRng(6), withNpcConcept: true, name: 'Dok Varane' });
  assert.equal(subjectWithNpc.npcConcept.name, 'Dok Varane', 'an attached npcConcept must carry the supplied name');
  assert.equal(subjectWithNpc.npcConcept.role, subjectWithNpc.role, 'the attached npcConcept\'s role must match the rolled subject archetype');
  assert.equal(hasForbiddenMechanicalFields(subjectWithNpc.npcConcept), false, 'an attached mission-subject npcConcept must carry zero mechanical fields');

  for (let seed = 0; seed < 20; seed++) assert.equal(isJobUrgency(pickJobUrgency({ rng: makeSeededRng(seed) }).value), true, 'every urgency pick must be valid');
  assert.equal(isJobLegality(pickJobLegality({ rng: makeSeededRng(1) }).value), true, 'legality pick must be valid');
  assert.equal(isJobVisibility(pickJobVisibility({ rng: makeSeededRng(1) }).value), true, 'visibility pick must be valid');
  assert.equal(JOB_VISIBILITY.POSTED, 'posted', 'JOB_VISIBILITY.POSTED must exactly match faction-draft.js\'s jobDefaults.visibility default');

  const sequence = suggestEncounterPhaseSequence({ rng: makeSeededRng(5), count: 3 });
  assert.equal(sequence.length, 3, 'a requested phase sequence length must be respected');
  assert.equal(new Set(sequence).size, 3, 'a phase sequence must contain distinct phases');
  assert.ok(sequence.every(isEncounterPhase), 'every suggested phase must be a valid ENCOUNTER_PHASE value');

  const request = createOppositionRequest({ archetypeTags: ['Security Guards', 'security guards'], threatLevel: OPPOSITION_THREAT_LEVEL.DANGEROUS, countBand: OPPOSITION_COUNT_BAND.SQUAD });
  assert.equal(request.archetypeTags.length, 1, 'archetypeTags must be normalized/deduped');
  assert.equal(request.threatLevel, 'dangerous', 'threatLevel must be preserved');
  assert.ok(!('statblockRef' in request) && !('actorId' in request) && !('uuid' in request), 'an opposition request must NEVER reference an actual statblock/actor -- it is a semantic request only');
  const badRequest = createOppositionRequest({ threatLevel: 'not-real', countBand: 'not-real' });
  assert.equal(badRequest.threatLevel, OPPOSITION_THREAT_LEVEL.STANDARD, 'an invalid threatLevel must fail safe to the standard default');

  console.log('Job/mission procedural groundwork (archetype metadata, mission-subject npcConcept attachment, urgency/legality/visibility vocab, encounter-phase suggestion, opposition-request never references an actual statblock) passed.');
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

console.log('PHASE 8D-2 procedural content ecosystem groundwork suite passed.');
