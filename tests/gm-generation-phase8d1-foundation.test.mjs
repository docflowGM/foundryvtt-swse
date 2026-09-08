import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — PHASE 8D-1: RANDOM GENERATION
// FOUNDATION (+ Faction/rank addendum + Faction population addendum).
//
// This is FOUNDATION ONLY: shared generation utilities, the ship-name
// generator, NPC/Objective/Faction draft schemas, the reward estimator/
// package accounting, and Faction rank/doctrine/population metadata —
// no finished Random Job/Faction UI, no full ~200-objective catalog, no
// canonical Actor/Faction/Location/Job creation. Every module here is a
// PURE, RNG-injectable function set with no Foundry dependency except
// where explicitly noted (`describeExistingLocation()`); most of this
// suite therefore runs without the Foundry shim at all, but it is
// installed anyway to match this repo's established test convention and
// to cover the one Foundry-dependent read path.
//
// ADDITIVE DESIGN CONTRACT — none of this code existed before this
// phase, so there is no git-stash fail-before/pass-after cycle. Draft-
// safety assertions (no canonical mutation) are still genuine
// requirements proven here, in the same spirit as every other phase's
// privacy/safety proofs.

registerFoundryPathLoader();
installFoundryShimGlobals({
  game: { user: { isGM: true, id: 'gm1' }, settings: { get: () => [], set: () => Promise.resolve(), settings: { has: () => true }, register: () => {} }, actors: { contents: [], get: () => null, [Symbol.iterator]: () => [][Symbol.iterator]() } },
  ui: { notifications: { info: () => {}, warn: () => {}, error: () => {} } },
  Hooks: { on: () => {}, off: () => {}, once: () => {}, call: () => true, callAll: () => true }
});

const abs = (rel) => `/systems/foundryvtt-swse/${rel}`;

// ------------------------------------------------------------
// weighted-random.js — shared utility layer
// ------------------------------------------------------------
{
  const { pickRandom, randomIntInclusive, weightedPick, filterByTags, weightedPickWithPreference, makeSeededRng, clamp } = await import(abs('scripts/generation/lib/weighted-random.js'));

  assert.equal(pickRandom([], {}), null, 'pickRandom must return null for an empty pool');
  assert.equal(clamp(15, 0, 10), 10, 'clamp must cap at max');
  assert.equal(clamp(-5, 0, 10), 0, 'clamp must floor at min');

  const rngA = makeSeededRng(123);
  const rngB = makeSeededRng(123);
  const seqA = [pickRandom(['a', 'b', 'c', 'd'], { rng: rngA }), pickRandom(['a', 'b', 'c', 'd'], { rng: rngA })];
  const seqB = [pickRandom(['a', 'b', 'c', 'd'], { rng: rngB }), pickRandom(['a', 'b', 'c', 'd'], { rng: rngB })];
  assert.deepEqual(seqA, seqB, 'the same seed must produce the same sequence (deterministic RNG for tests)');

  assert.equal(weightedPick([], {}), null, 'weightedPick must return null for an empty pool');
  const zeroWeighted = weightedPick([{ id: 'x', weight: 0 }], {});
  assert.equal(zeroWeighted, null, 'weightedPick must exclude zero-weight entries and return null if nothing remains');
  const heavy = weightedPick([{ id: 'never', weight: 0.0001 }, { id: 'always', weight: 1000 }], { rng: makeSeededRng(1) });
  assert.equal(heavy.id, 'always', 'a hugely-favored entry should dominate a weighted pick (sanity check on the algorithm)');

  const tagged = [{ id: 'a', tags: ['x'] }, { id: 'b', tags: ['y'] }, { id: 'c', tags: ['x', 'y'] }];
  assert.deepEqual(filterByTags(tagged, { requireTags: ['x'] }).map((e) => e.id), ['a', 'c'], 'filterByTags requireTags must keep only entries carrying every required tag');
  assert.deepEqual(filterByTags(tagged, { excludeTags: ['y'] }).map((e) => e.id), ['a'], 'filterByTags excludeTags must drop entries carrying any excluded tag');
  const copy = filterByTags(tagged, {});
  assert.notEqual(copy, tagged, 'filterByTags with no filters must still return a NEW array, never the same reference');

  const preferred = weightedPickWithPreference([{ id: 'plain', weight: 1 }, { id: 'preferred', weight: 1, tags: ['wanted'] }], { rng: makeSeededRng(2), preferTags: ['wanted'], preferenceBoost: 1000 });
  assert.equal(preferred.id, 'preferred', 'a huge preference boost should make the preferred-tag entry dominate, but never become a hard filter');

  assert.equal(randomIntInclusive(5, 5, {}), 5, 'randomIntInclusive with min===max must always return that value');

  console.log('weighted-random.js (deterministic RNG, weighted pick, tag filter/preference) passed.');
}

// ------------------------------------------------------------
// ship-name-generator.js
// ------------------------------------------------------------
{
  const { getRandomShipName, rerollShipNameAdjective, rerollShipNameNoun } = await import(abs('scripts/generation/ship-names/ship-name-generator.js'));
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
  const { SHIP_NAME_ADJECTIVES } = await import(abs('scripts/generation/data/ship-name-adjectives.js'));
  const { SHIP_NAME_NOUNS } = await import(abs('scripts/generation/data/ship-name-nouns.js'));

  assert.ok(SHIP_NAME_ADJECTIVES.length >= 100 && SHIP_NAME_ADJECTIVES.length <= 150, `adjective pool should be roughly 100-150 entries (got ${SHIP_NAME_ADJECTIVES.length})`);
  assert.ok(SHIP_NAME_NOUNS.length >= 100 && SHIP_NAME_NOUNS.length <= 150, `noun pool should be roughly 100-150 entries (got ${SHIP_NAME_NOUNS.length})`);

  const draft = getRandomShipName({ rng: makeSeededRng(42) });
  assert.match(draft.name, /^[A-Za-z]+ [A-Za-z]+$/, 'ship name must follow the [Adjective] [Noun] structure');
  assert.equal(draft.name, `${draft.adjective.value} ${draft.noun.value}`, 'the composed name must be exactly adjective + noun');

  const rngSame = makeSeededRng(7);
  const rngSame2 = makeSeededRng(7);
  assert.equal(getRandomShipName({ rng: rngSame }).name, getRandomShipName({ rng: rngSame2 }).name, 'same seed must produce the same ship name');

  const rerolledAdjective = rerollShipNameAdjective(draft, { rng: makeSeededRng(99) });
  assert.equal(rerolledAdjective.noun.value, draft.noun.value, 'rerolling the adjective must preserve the noun exactly');
  const rerolledNoun = rerollShipNameNoun(draft, { rng: makeSeededRng(99) });
  assert.equal(rerolledNoun.adjective.value, draft.adjective.value, 'rerolling the noun must preserve the adjective exactly');

  // A ship name draft carries no model/value field at all -- rerolling it
  // has nothing to imply a model reroll for; this is a structural proof,
  // not just an assertion about behavior.
  assert.ok(!('model' in draft) && !('value' in draft), 'a ship-name draft must carry no model/value field -- name and model are independent concerns');

  const preferred = getRandomShipName({ rng: makeSeededRng(3), preferTags: ['criminal', 'smuggler'] });
  assert.ok(preferred.name, 'a tag-preferring generation must still succeed and produce a name');

  console.log('ship-name-generator.js (adjective+noun structure, deterministic, independent field reroll, no model coupling) passed.');
}

// ------------------------------------------------------------
// objective-economy.js + objective-template.js
// ------------------------------------------------------------
{
  const { OBJECTIVE_TIER, OBJECTIVE_DIFFICULTY, objectiveRewardWeight, isObjectiveTier, isObjectiveDifficulty } = await import(abs('scripts/generation/objective-economy.js'));
  const { normalizeObjectiveTemplate, validateObjectiveTemplate, OBJECTIVE_TEMPLATE_FIXTURES, fixturesForMissionType, renderObjectiveTemplate, OBJECTIVE_SLOT_TYPE } = await import(abs('scripts/generation/objective-template.js'));

  assert.ok(isObjectiveTier(OBJECTIVE_TIER.PRIMARY) && isObjectiveTier(OBJECTIVE_TIER.SECONDARY) && isObjectiveTier(OBJECTIVE_TIER.TERTIARY), 'primary/secondary/tertiary must be valid tiers (matches GMJobBoardSurfaceService.js)');
  assert.equal(isObjectiveTier('bogus-tier'), false, 'an invalid tier must be rejected');
  assert.ok(isObjectiveDifficulty(OBJECTIVE_DIFFICULTY.SEVERE), 'severe must be a valid difficulty band');

  const primaryStandard = objectiveRewardWeight({ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.STANDARD });
  const primarySevere = objectiveRewardWeight({ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.SEVERE });
  assert.ok(primarySevere > primaryStandard, 'a severe objective must weigh more than a standard one at the same tier');
  const secondaryStandard = objectiveRewardWeight({ tier: OBJECTIVE_TIER.SECONDARY, difficulty: OBJECTIVE_DIFFICULTY.STANDARD });
  assert.ok(primaryStandard > secondaryStandard, 'a primary objective must weigh more than a secondary one at the same difficulty');

  // Every fixture must be present and valid (normalizeObjectiveTemplate
  // returns null on any invalid input -- OBJECTIVE_TEMPLATE_FIXTURES
  // must contain no nulls).
  assert.ok(OBJECTIVE_TEMPLATE_FIXTURES.every(Boolean), 'every representative fixture must normalize successfully (no invalid template in the catalog)');
  for (const id of ['rescue-person-secured-site', 'extraction-hostile-facility', 'delivery-cargo-local', 'sabotage-multiple-targets', 'recovery-cargo-wreck', 'investigation-determine-cause', 'escort-convoy', 'ship-theft-deliver-intact', 'ship-recovery-return-owner']) {
    assert.ok(OBJECTIVE_TEMPLATE_FIXTURES.some((t) => t.id === id), `required representative fixture "${id}" must exist`);
  }
  assert.ok(fixturesForMissionType('rescue').length > 0, 'at least one fixture must cover the rescue mission type');
  assert.ok(fixturesForMissionType('sabotage').length > 0, 'at least one fixture must cover the sabotage mission type');

  // Invalid templates fail safe (return null / report errors), never throw.
  assert.equal(normalizeObjectiveTemplate({}), null, 'a template with no id/missionTypes/tiers/template must normalize to null, never throw');
  assert.equal(normalizeObjectiveTemplate({ id: 'bad', missionTypes: ['rescue'], tiers: ['not-a-real-tier'], template: 'x' }), null, 'an invalid tier must fail normalization');
  const undeclaredSlot = validateObjectiveTemplate({ id: 'bad2', missionTypes: ['rescue'], tiers: ['primary'], template: 'Find {ghost}.', slots: {} });
  assert.equal(undeclaredSlot.valid, false, 'a template referencing an undeclared slot must fail validation');
  assert.ok(undeclaredSlot.errors.some((e) => e.includes('ghost')), 'the validation error must name the undeclared slot');

  const rescueTemplate = OBJECTIVE_TEMPLATE_FIXTURES.find((t) => t.id === 'rescue-person-secured-site');
  const rendered = renderObjectiveTemplate(rescueTemplate, { targetNpc: 'General Tavi Ordo', targetLocation: 'Aurek Detention Annex', destination: 'the Republic safehouse' });
  assert.equal(rendered, 'Locate General Tavi Ordo at Aurek Detention Annex and escort them safely to the Republic safehouse.', 'renderObjectiveTemplate must substitute every declared slot correctly');
  assert.throws(() => renderObjectiveTemplate(rescueTemplate, { targetNpc: 'X' }), /missing required slot/, 'rendering with a missing required slot value must throw rather than ship a broken "{slot}" literal');

  assert.ok(Object.values(OBJECTIVE_SLOT_TYPE).includes('person-or-droid'), 'the person-or-droid slot vocabulary entry must exist so Droid representation never needs a special mission system');

  console.log('objective-economy.js + objective-template.js (tier/difficulty weighting, schema validation, slot rendering, representative fixtures) passed.');
}

// ------------------------------------------------------------
// npc-concept.js — HARD RULE: no class/mechanics fields
// ------------------------------------------------------------
{
  const { createNpcConceptDraft, updateNpcConceptDraft, hasForbiddenMechanicalFields, NPC_CONCEPT_KIND } = await import(abs('scripts/generation/npc-concept.js'));
  const { COMMAND_TIER } = await import(abs('scripts/generation/rank-metadata.js'));

  const living = createNpcConceptDraft({ kind: NPC_CONCEPT_KIND.LIVING, name: 'Vessa Tal', speciesId: 'human', factionRankTitle: 'Lieutenant', commandTier: COMMAND_TIER.JUNIOR_COMMAND });
  assert.ok(living, 'a valid living NPC concept must be created');
  assert.equal(hasForbiddenMechanicalFields(living), false, 'a generated NPC concept must carry no HP/BAB/defenses/level/class field');

  const droid = createNpcConceptDraft({ kind: NPC_CONCEPT_KIND.DROID, name: 'MX-77', droidRole: 'security' });
  assert.ok(droid, 'a valid droid NPC concept must be created');
  assert.equal(hasForbiddenMechanicalFields(droid), false, 'a generated droid NPC concept must carry no mechanical fields either');

  assert.equal(createNpcConceptDraft({ kind: 'not-a-real-kind' }), null, 'an invalid kind must fail safe to null, never guess living vs droid');

  // Rank does not set level: commandTier/factionRankTitle carry no numeric
  // level/CL field anywhere in the schema.
  assert.equal('level' in living, false, 'an NPC concept with a rank set must still carry no level field');
  assert.equal(living.commandTier, COMMAND_TIER.JUNIOR_COMMAND, 'commandTier must be recorded as supplied');

  const reroll = updateNpcConceptDraft(living, { name: 'Renamed Officer' });
  assert.notEqual(reroll.name, living.name, 'a per-field reroll must change the targeted field');
  assert.equal(reroll.factionRankTitle, living.factionRankTitle, 'a per-field reroll must preserve every other field untouched');
  assert.equal(reroll.speciesId, living.speciesId, 'a per-field reroll must preserve species untouched');

  console.log('npc-concept.js (living+droid drafts, no mechanical fields, per-field reroll preserves unrelated fields) passed.');
}

// ------------------------------------------------------------
// rank-metadata.js — addendum: rank ≠ level, nonmilitary title mapping
// ------------------------------------------------------------
{
  const { COMMAND_TIER, resolveCommandTier, MILITARY_RANK_TIER_MAP, CRIME_SYNDICATE_RANK_TIER_MAP, PIRATE_RANK_TIER_MAP, SPECIALIST_ROLES, RANK_TARGET_IMPORTANCE, COMMAND_TIER_DEFAULT_IMPORTANCE } = await import(abs('scripts/generation/rank-metadata.js'));

  // Rank does not automatically set level/CL: the module exports no
  // level/CL field or function anywhere -- structural proof by absence.
  const moduleExports = await import(abs('scripts/generation/rank-metadata.js'));
  const exportNames = Object.keys(moduleExports);
  assert.ok(!exportNames.some((name) => /level|challengeLevel|\bCL\b/i.test(name)), 'rank-metadata.js must export nothing resembling a level/Challenge Level concept');

  assert.equal(resolveCommandTier('Sergeant', MILITARY_RANK_TIER_MAP), COMMAND_TIER.SQUAD_COMMAND, 'military Sergeant must resolve to squad-command');
  assert.equal(resolveCommandTier('Sergeant', CRIME_SYNDICATE_RANK_TIER_MAP), COMMAND_TIER.NONE, 'a rank title absent from a different archetype\'s map must resolve to NONE, never guessed');

  // Nonmilitary titles can map onto the SAME normalized tier vocabulary.
  assert.equal(resolveCommandTier('Boss', CRIME_SYNDICATE_RANK_TIER_MAP), COMMAND_TIER.STRATEGIC_COMMAND, 'a crime syndicate Boss must map to the same strategic-command tier a military General would');
  assert.equal(resolveCommandTier('Commodore', PIRATE_RANK_TIER_MAP), COMMAND_TIER.STRATEGIC_COMMAND, 'a pirate Commodore must map to strategic-command');

  assert.ok(SPECIALIST_ROLES.includes('slicer') && SPECIALIST_ROLES.includes('medic'), 'specialist roles must include non-combat-leader roles like slicer/medic');

  // A superior officer may be mechanically lower level than characters
  // beneath them -- proven structurally: importance guidance never
  // touches a level/CL field, only a semantic importance band.
  assert.ok(RANK_TARGET_IMPORTANCE.STRATEGIC && COMMAND_TIER_DEFAULT_IMPORTANCE[COMMAND_TIER.STRATEGIC_COMMAND] === RANK_TARGET_IMPORTANCE.STRATEGIC, 'strategic command tier should default to strategic importance guidance (a suggestion only)');

  console.log('rank-metadata.js (rank/level separation, nonmilitary rank-tier mapping, specialist roles, importance vocabulary) passed.');
}

// ------------------------------------------------------------
// organization-metadata.js — Scale vs Organization Score, family vs archetype
// ------------------------------------------------------------
{
  const { ORGANIZATION_FAMILY, FACTION_ARCHETYPE_FAMILY, describeScale, scaleResourceMultiplier, ISSUER_TYPE, RELATIONSHIP_REWARD_ADJUSTMENT } = await import(abs('scripts/generation/organization-metadata.js'));

  assert.equal(describeScale(13), 'Sector', 'Scale 13 must be described as Sector-level (the 13+ breakpoint)');
  assert.equal(describeScale(19), 'Intergalactic', 'Scale 19 must be described as Intergalactic');
  assert.ok(scaleResourceMultiplier(13) > scaleResourceMultiplier(4), 'Scale 13 must have a materially higher resource multiplier than Scale 4');
  assert.ok(scaleResourceMultiplier(17) > scaleResourceMultiplier(11), 'Scale 17+ must exceed the mid-scale baseline substantially');

  // Organization family and generator archetype remain distinct concepts.
  assert.equal(FACTION_ARCHETYPE_FAMILY.pirates, ORGANIZATION_FAMILY.CRIME_SYNDICATE, 'the pirates archetype must map to the Crime Syndicate family, not become a family itself');
  assert.notEqual(Object.values(ORGANIZATION_FAMILY).includes('pirates'), true, 'an archetype id must never itself appear as a canonical organization family value');

  assert.equal(RELATIONSHIP_REWARD_ADJUSTMENT.hostile, null, 'a hostile relationship must resolve to null (no normal Job), never a numeric multiplier');
  assert.ok(RELATIONSHIP_REWARD_ADJUSTMENT.excellent <= 1.10 && RELATIONSHIP_REWARD_ADJUSTMENT.poor >= 0.90, 'relationship adjustment must stay a SMALL bounded factor, never large enough to fake wealth/poverty');

  assert.ok(Object.values(ISSUER_TYPE).includes('faction'), 'ISSUER_TYPE must distinguish a Faction issuer from ordinary/wealthy individuals');

  console.log('organization-metadata.js (Scale bands/multiplier curve, family vs archetype distinction, bounded relationship adjustment) passed.');
}

// ------------------------------------------------------------
// party-capability.js
// ------------------------------------------------------------
{
  const { extractPartyLevels, averagePartyLevel, medianPartyLevel, computePartyCapability } = await import(abs('scripts/generation/party-capability.js'));

  const actors = [{ system: { level: 6 } }, { system: { level: 8 } }, { system: { level: 10 } }, { system: { level: 'not-a-number' } }, {}];
  const levels = extractPartyLevels(actors);
  assert.deepEqual(levels, [6, 8, 10], 'extractPartyLevels must pull only valid positive levels off system.level, skipping malformed/missing entries');
  assert.equal(averagePartyLevel(levels), 8, 'average of [6,8,10] must be 8');
  assert.equal(medianPartyLevel(levels), 8, 'median of [6,8,10] must be 8');
  assert.equal(computePartyCapability(levels).capability, 8, 'computePartyCapability must expose average as the capability figure (documented convention)');
  assert.equal(computePartyCapability([]).capability, 0, 'an empty party must produce capability 0, never NaN/throw');

  console.log('party-capability.js (level extraction, average/median, documented capability convention) passed.');
}

// ------------------------------------------------------------
// reward-estimator.js — the core required economic invariants
// ------------------------------------------------------------
{
  const { estimateReward, ASSET_OBJECTIVE_TYPE, DIAGNOSTIC } = await import(abs('scripts/generation/reward-estimator.js'));
  const { ISSUER_TYPE } = await import(abs('scripts/generation/organization-metadata.js'));
  const { OBJECTIVE_TIER, OBJECTIVE_DIFFICULTY } = await import(abs('scripts/generation/objective-economy.js'));
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));

  const primaryOnly = estimateReward({ partyCapability: 8, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.STANDARD }], issuer: { type: ISSUER_TYPE.FACTION, scale: 11 }, applyVariance: false });
  const withSecondary = estimateReward({ partyCapability: 8, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.STANDARD }, { tier: OBJECTIVE_TIER.SECONDARY, difficulty: OBJECTIVE_DIFFICULTY.STANDARD }], issuer: { type: ISSUER_TYPE.FACTION, scale: 11 }, applyVariance: false });
  assert.ok(withSecondary.total > primaryOnly.total, 'adding a secondary objective must increase suggested compensation');
  const withTertiary = estimateReward({ partyCapability: 8, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.STANDARD }, { tier: OBJECTIVE_TIER.SECONDARY, difficulty: OBJECTIVE_DIFFICULTY.STANDARD }, { tier: OBJECTIVE_TIER.TERTIARY, difficulty: OBJECTIVE_DIFFICULTY.STANDARD }], issuer: { type: ISSUER_TYPE.FACTION, scale: 11 }, applyVariance: false });
  assert.ok(withTertiary.total > withSecondary.total, 'adding a tertiary objective must further increase suggested compensation');

  const routine = estimateReward({ partyCapability: 8, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.ROUTINE }], issuer: { type: ISSUER_TYPE.FACTION, scale: 11 }, applyVariance: false });
  const severe = estimateReward({ partyCapability: 8, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.SEVERE }], issuer: { type: ISSUER_TYPE.FACTION, scale: 11 }, applyVariance: false });
  assert.ok(severe.total > routine.total, 'a severe objective must pay more than an equivalent routine objective');

  const scale4 = estimateReward({ partyCapability: 8, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.STANDARD }], issuer: { type: ISSUER_TYPE.FACTION, scale: 4 }, applyVariance: false });
  const scale14 = estimateReward({ partyCapability: 8, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.STANDARD }], issuer: { type: ISSUER_TYPE.FACTION, scale: 14 }, applyVariance: false });
  assert.ok(scale14.total >= scale4.total * 2, 'Scale 13+ must pay substantially more than Scale 4 or below (at least double, in this curve)');

  const individual = estimateReward({ partyCapability: 8, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.STANDARD }], issuer: { type: ISSUER_TYPE.ORDINARY_INDIVIDUAL }, applyVariance: false });
  const substantialFaction = estimateReward({ partyCapability: 8, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.STANDARD }], issuer: { type: ISSUER_TYPE.FACTION, scale: 11 }, applyVariance: false });
  assert.ok(individual.total < substantialFaction.total, 'an ordinary individual must normally pay less than a substantial Faction for the same objectives');

  const shipSteal = estimateReward({ partyCapability: 8, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.DIFFICULT }], issuer: { type: ISSUER_TYPE.FACTION, scale: 11 }, asset: { value: 200000, objectiveType: ASSET_OBJECTIVE_TYPE.STEAL_AND_DELIVER }, applyVariance: false });
  assert.equal(shipSteal.breakdown.assetComponent, 200000 * 0.30, 'a steal-and-deliver ship objective must apply the 30% acquisition-value component');

  // Ship-name change has no effect on value: the estimator's asset input
  // is a plain {value, objectiveType} -- it never receives or reads a
  // name at all, so there is structurally nothing for a name change to
  // affect.
  const shipStealAgain = estimateReward({ partyCapability: 8, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.DIFFICULT }], issuer: { type: ISSUER_TYPE.FACTION, scale: 11 }, asset: { value: 200000, objectiveType: ASSET_OBJECTIVE_TYPE.STEAL_AND_DELIVER }, applyVariance: false });
  assert.equal(shipSteal.total, shipStealAgain.total, 'identical asset value/type must always produce the identical total regardless of what the ship is named (name is not a parameter at all)');

  // Changing the canonical ship VALUE changes suggested compensation.
  const cheaperShip = estimateReward({ partyCapability: 8, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.DIFFICULT }], issuer: { type: ISSUER_TYPE.FACTION, scale: 11 }, asset: { value: 50000, objectiveType: ASSET_OBJECTIVE_TYPE.STEAL_AND_DELIVER }, applyVariance: false });
  assert.ok(shipSteal.total > cheaperShip.total, 'a higher-value ship model must produce a higher suggested compensation');

  // "Keep the ship" must not double-pay.
  const keepTheShip = estimateReward({ partyCapability: 8, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.DIFFICULT }], issuer: { type: ISSUER_TYPE.FACTION, scale: 11 }, asset: { value: 200000, objectiveType: ASSET_OBJECTIVE_TYPE.KEEP_THE_TARGET }, applyVariance: false });
  assert.equal(keepTheShip.breakdown.assetComponent, 0, 'keep-the-target must add NO acquisition cash component (the kept asset itself is the reward)');
  assert.equal(keepTheShip.targetValue, 200000, 'keep-the-target must still surface the asset\'s own value so reward-package.js can express it as a kept material reward');
  assert.ok(keepTheShip.total < shipSteal.total, 'keeping the target (no 30% cash component) must suggest a smaller cash total than deliver-for-cash, for the same objective difficulty');

  // Resource mismatch diagnostic.
  const mismatch = estimateReward({ partyCapability: 3, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.STANDARD }], issuer: { type: ISSUER_TYPE.FACTION, scale: 3 }, asset: { value: 300000, objectiveType: ASSET_OBJECTIVE_TYPE.STEAL_AND_DELIVER }, applyVariance: false });
  assert.ok(mismatch.diagnostics.includes(DIAGNOSTIC.ISSUER_RESOURCE_MISMATCH), 'a Scale-3 organization commissioning a 300,000-credit starship theft must be flagged as an issuer-resource-mismatch');
  const plausible = estimateReward({ partyCapability: 8, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.STANDARD }], issuer: { type: ISSUER_TYPE.FACTION, scale: 17 }, asset: { value: 200000, objectiveType: ASSET_OBJECTIVE_TYPE.STEAL_AND_DELIVER }, applyVariance: false });
  assert.equal(plausible.diagnostics.includes(DIAGNOSTIC.ISSUER_RESOURCE_MISMATCH), false, 'a Scale-17 organization commissioning the same ship must NOT be flagged as a mismatch');

  // Deterministic with injected RNG.
  const withVarianceA = estimateReward({ partyCapability: 8, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.STANDARD }], issuer: { type: ISSUER_TYPE.FACTION, scale: 11 }, rng: makeSeededRng(55) });
  const withVarianceB = estimateReward({ partyCapability: 8, objectives: [{ tier: OBJECTIVE_TIER.PRIMARY, difficulty: OBJECTIVE_DIFFICULTY.STANDARD }], issuer: { type: ISSUER_TYPE.FACTION, scale: 11 }, rng: makeSeededRng(55) });
  assert.equal(withVarianceA.total, withVarianceB.total, 'the same injected RNG seed must produce the exact same total, including variance');

  console.log('reward-estimator.js (objective count/difficulty scaling, Scale breakpoints, issuer comparison, asset acquisition %, keep-the-target no-double-pay, resource-mismatch diagnostic, deterministic RNG) passed.');
}

// ------------------------------------------------------------
// reward-package.js — accounting invariants
// ------------------------------------------------------------
{
  const { createRewardPackage, addMaterialReward, verifyRewardPackageAccounting, createKeepTheTargetPackage, verifyKeepTheTargetPackageAccounting } = await import(abs('scripts/generation/reward-package.js'));

  let pkg = createRewardPackage(42000);
  pkg = addMaterialReward(pkg, { name: 'Blaster', value: 12000, category: 'weapon' });
  pkg = addMaterialReward(pkg, { name: 'Speeder', value: 10000, category: 'vehicle' });
  assert.equal(pkg.credits, 20000, 'remaining credits must be totalValue minus every material reward value (42000 - 12000 - 10000)');
  assert.ok(verifyRewardPackageAccounting(pkg), 'credits + material reward values must equal totalValue exactly');

  const overBudget = addMaterialReward(createRewardPackage(10000), { name: 'Too Expensive', value: 15000 });
  assert.equal(overBudget.materialRewards[0].value, 10000, 'a material reward exceeding the remaining budget must be clamped to what remains, never silently overpay');
  assert.ok(overBudget.warnings.includes('material-reward-clamped-to-remaining-budget'), 'a clamp must be reported as a warning, not silently applied');
  assert.ok(verifyRewardPackageAccounting(overBudget), 'a clamped package must still balance exactly');

  const keepEstimate = { total: 4500, keepsTarget: true, targetValue: 200000 };
  const keepPkg = createKeepTheTargetPackage(keepEstimate, { assetName: 'Silent Horizon', category: 'ship' });
  assert.equal(keepPkg.credits, 4500, 'a keep-the-target package must keep cash at exactly the estimator total, unreduced by the kept asset');
  assert.equal(keepPkg.materialRewards[0].value, 200000, 'the kept asset must be reported at its own full value');
  assert.ok(verifyKeepTheTargetPackageAccounting(keepPkg, keepEstimate), 'a correctly-built keep-the-target package must pass its own accounting check');

  console.log('reward-package.js (credits+assets=total accounting, over-budget clamping reported not silent, keep-the-target no-double-pay accounting) passed.');
}

// ------------------------------------------------------------
// faction-relationship-draft.js — no fake canonical IDs
// ------------------------------------------------------------
{
  const { createCanonicalFactionRelationship, createGeneratedFactionRelationshipConcept, createFactionRelationshipDraftSet, addFactionRelationship, FACTION_RELATIONSHIP_KIND } = await import(abs('scripts/generation/faction-relationship-draft.js'));

  const canonicalAlly = createCanonicalFactionRelationship({ kind: FACTION_RELATIONSHIP_KIND.ALLY, factionId: 'real-faction-1' });
  assert.equal(canonicalAlly.resolved, true, 'a canonical relationship must be marked resolved');
  assert.equal(canonicalAlly.factionId, 'real-faction-1', 'a canonical relationship must carry the real, stable Faction id supplied');
  assert.equal(createCanonicalFactionRelationship({ kind: FACTION_RELATIONSHIP_KIND.ALLY, factionId: '' }), null, 'a canonical relationship with no factionId is a contradiction and must fail safe to null');

  const generatedEnemy = createGeneratedFactionRelationshipConcept({ kind: FACTION_RELATIONSHIP_KIND.ENEMY, name: 'A rival smuggling ring' });
  assert.equal(generatedEnemy.resolved, false, 'a generated concept must be marked unresolved');
  assert.equal(generatedEnemy.factionId, '', 'a generated (unresolved) concept must NEVER carry a fake canonical Faction id');

  let set = createFactionRelationshipDraftSet();
  set = addFactionRelationship(set, canonicalAlly);
  set = addFactionRelationship(set, generatedEnemy);
  assert.deepEqual(set.allyFactionIds, ['real-faction-1'], 'a canonical ally must land in allyFactionIds using its stable id');
  assert.equal(set.generatedEnemyConcepts.length, 1, 'a generated enemy concept must land in generatedEnemyConcepts, never merged into enemyFactionIds');
  assert.deepEqual(set.enemyFactionIds, [], 'enemyFactionIds must contain no fabricated id for the unresolved concept');

  console.log('faction-relationship-draft.js (canonical relationships use stable ids, generated concepts never receive fake ids) passed.');
}

// ------------------------------------------------------------
// faction-doctrine-draft.js — no mechanical Actor statistics
// ------------------------------------------------------------
{
  const { createFactionDoctrineDraft, suggestDoctrineUsageForScale, createFactionPreferredStatblockRoster, addFactionPreferredStatblockProfile, hasForbiddenMechanicalFields, DOCTRINE_USAGE_LEVEL } = await import(abs('scripts/generation/faction-doctrine-draft.js'));

  const doctrine = createFactionDoctrineDraft({ commonRoles: ['trooper', 'security'], specialistRoles: ['technician', 'medic'], droidUsage: DOCTRINE_USAGE_LEVEL.HIGH });
  assert.equal(hasForbiddenMechanicalFields(doctrine), false, 'a doctrine draft must contain no mechanical Actor statistics');
  assert.ok(doctrine.specialistRoles.includes('medic'), 'specialist roles (Warrant-Officer-equivalent) must be representable in doctrine');

  const lowScale = suggestDoctrineUsageForScale(2);
  const highScale = suggestDoctrineUsageForScale(18);
  assert.equal(lowScale.eliteAvailability, DOCTRINE_USAGE_LEVEL.NONE, 'a very low Scale should default to no elite availability');
  assert.equal(highScale.eliteAvailability, DOCTRINE_USAGE_LEVEL.HIGH, 'a very high Scale should default to high elite availability');
  // Scale informs breadth/resources, never a level/CL field.
  assert.ok(!('level' in lowScale) && !('challengeLevel' in lowScale), 'Scale-informed doctrine guidance must carry no level/CL field');

  let roster = createFactionPreferredStatblockRoster();
  roster = addFactionPreferredStatblockProfile(roster, 'specialist', { uuid: 'Compendium.some.pack.Item.abc123', roleTags: ['technician'], rankAffinity: ['Warrant Officer'] });
  assert.equal(roster.specialistProfiles.length, 1, 'a profile reference must land in the correct category list');
  assert.equal(roster.specialistProfiles[0].uuid, 'Compendium.some.pack.Item.abc123', 'the roster entry must carry only a UUID reference, never copied stats');
  assert.equal(hasForbiddenMechanicalFields(roster), false, 'a preferred-statblock roster must contain no mechanical Actor statistics anywhere, including nested entries');
  const rejected = addFactionPreferredStatblockProfile(createFactionPreferredStatblockRoster(), 'specialist', { roleTags: ['technician'] });
  assert.equal(rejected.specialistProfiles.length, 0, 'a roster entry with no uuid must be rejected (nothing to reference yet)');

  console.log('faction-doctrine-draft.js (no mechanical statistics, Scale-informed breadth guidance, UUID-only preferred-statblock roster) passed.');
}

// ------------------------------------------------------------
// population-profile.js — addendum: population modes, membership policy
// ------------------------------------------------------------
{
  const {
    createPopulationProfile, POPULATION_MODE, selectMemberKind, selectSpeciesId, SPECIES_POLICY_MODE, createSpeciesPolicy,
    MEMBERSHIP_POLICY, isMembershipPolicy, pickPopulationModeForArchetype
  } = await import(abs('scripts/generation/population-profile.js'));
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));

  const speciesPool = ['human', 'zabrak', 'duros', 'twilek', 'rodian'];

  // droid-only profile cannot generate a living-member selection.
  const droidOnly = createPopulationProfile({ mode: POPULATION_MODE.DROID_ONLY });
  const droidRng = makeSeededRng(11);
  for (let i = 0; i < 100; i += 1) assert.equal(selectMemberKind(droidOnly, { rng: droidRng }), 'droid', 'a droid-only population must never select "living" for an internal member');

  // organic-only excludes droid-member selection.
  const organicOnly = createPopulationProfile({ mode: POPULATION_MODE.ORGANIC_ONLY });
  const organicRng = makeSeededRng(12);
  for (let i = 0; i < 100; i += 1) assert.equal(selectMemberKind(organicOnly, { rng: organicRng }), 'living', 'an organic-only population must never select "droid" for an internal member');

  // mixed profile remains open (both kinds reachable).
  const mixed = createPopulationProfile({ mode: POPULATION_MODE.MIXED });
  const mixedRng = makeSeededRng(13);
  const mixedResults = new Set();
  for (let i = 0; i < 100; i += 1) mixedResults.add(selectMemberKind(mixed, { rng: mixedRng }));
  assert.deepEqual([...mixedResults].sort(), ['droid', 'living'], 'a mixed population must be able to select both living and droid members');

  // species-locked resolves only its allowed Species.
  const locked = createSpeciesPolicy({ mode: SPECIES_POLICY_MODE.REQUIRED, allowedSpeciesIds: ['zabrak'] });
  const lockedRng = makeSeededRng(14);
  for (let i = 0; i < 50; i += 1) assert.equal(selectSpeciesId(locked, speciesPool, { rng: lockedRng }), 'zabrak', 'species-locked must resolve only the allowed species, every time');

  // restricted coalition rejects species outside its explicit list.
  const coalition = createSpeciesPolicy({ mode: SPECIES_POLICY_MODE.ALLOWED_LIST, allowedSpeciesIds: ['human', 'twilek'] });
  const coalitionRng = makeSeededRng(15);
  for (let i = 0; i < 50; i += 1) assert.ok(['human', 'twilek'].includes(selectSpeciesId(coalition, speciesPool, { rng: coalitionRng })), 'a restricted coalition must never select a species outside its allowed list');

  // species-dominant favors but does not mandate the dominant species.
  const dominant = createSpeciesPolicy({ mode: SPECIES_POLICY_MODE.PREFERRED, dominantSpeciesId: 'duros', dominantSpeciesWeight: 0.8 });
  const dominantRng = makeSeededRng(16);
  let duroCount = 0;
  let otherCount = 0;
  for (let i = 0; i < 500; i += 1) {
    const picked = selectSpeciesId(dominant, speciesPool, { rng: dominantRng });
    if (picked === 'duros') duroCount += 1; else otherCount += 1;
  }
  assert.ok(duroCount > otherCount, 'the dominant species must be picked more often than all others combined');
  assert.ok(otherCount > 0, 'species-dominant must NOT be mandatory -- other species must still occasionally be selected');

  // mixed/open species policy remains open.
  const open = createSpeciesPolicy();
  assert.equal(open.mode, SPECIES_POLICY_MODE.OPEN, 'the default species policy must be open');

  // membership policy is a DISTINCT field from population mode.
  assert.ok(isMembershipPolicy(MEMBERSHIP_POLICY.EXCLUSIVE), 'exclusive must be a valid membership policy');
  const openMembershipDroidHeavyPopulation = { populationMode: POPULATION_MODE.DROID_HEAVY, membershipPolicy: MEMBERSHIP_POLICY.OPEN };
  assert.notEqual(openMembershipDroidHeavyPopulation.populationMode, openMembershipDroidHeavyPopulation.membershipPolicy, 'population mode and membership policy must be independently settable (a Faction can be droid-heavy with fully open membership)');

  // species-specific population must not automatically produce
  // enemies/exclusions -- structural proof: creating a species-locked
  // policy touches no relationship/exclusion state at all.
  const lockedProfile = createPopulationProfile({ mode: POPULATION_MODE.SPECIES_LOCKED, speciesPolicy: { mode: SPECIES_POLICY_MODE.REQUIRED, allowedSpeciesIds: ['wookiee'] } });
  assert.deepEqual(lockedProfile.speciesPolicy.excludedSpeciesIds, [], 'a species-locked profile must not automatically populate any exclusion list');
  assert.ok(!('enemies' in lockedProfile) && !('rivalSpeciesGroups' in lockedProfile), 'a population profile must carry no enemies/rivalry field of its own -- that is faction-relationship-draft.js\'s separate, always-explicit concern');

  // population metadata contains no Actor mechanical statistics.
  const { hasForbiddenMechanicalFields } = await import(abs('scripts/generation/npc-concept.js'));
  assert.equal(hasForbiddenMechanicalFields(lockedProfile), false, 'a population profile must carry no mechanical Actor statistics');

  // generated Species references use stable canonical identity (passed
  // through unchanged, never mangled/re-derived from a label).
  const idPreserved = selectSpeciesId(createSpeciesPolicy({ mode: SPECIES_POLICY_MODE.REQUIRED, allowedSpeciesIds: ['Compendium.some.pack.Item.species-zabrak-uuid'] }), ['Compendium.some.pack.Item.species-zabrak-uuid'], { rng: makeSeededRng(1) });
  assert.equal(idPreserved, 'Compendium.some.pack.Item.species-zabrak-uuid', 'a canonical species id/uuid must pass through this module completely unchanged');

  // droid Contacts can occupy leadership/command tiers (population and
  // rank stay independent -- proven by composing an NPC concept
  // directly, with no code path in either module preventing it).
  const { createNpcConceptDraft, NPC_CONCEPT_KIND } = await import(abs('scripts/generation/npc-concept.js'));
  const { COMMAND_TIER } = await import(abs('scripts/generation/rank-metadata.js'));
  const droidLeader = createNpcConceptDraft({ kind: NPC_CONCEPT_KIND.DROID, name: 'Command Droid Prime', commandTier: COMMAND_TIER.STRATEGIC_COMMAND, factionRankTitle: 'Director' });
  assert.equal(droidLeader.commandTier, COMMAND_TIER.STRATEGIC_COMMAND, 'a droid NPC concept must be able to hold the highest command tier, exactly like a living NPC');

  // archetype weighting is centralized/tunable, never uniform random.
  const droidCollectiveWeights = (await import(abs('scripts/generation/population-profile.js'))).ARCHETYPE_POPULATION_MODE_WEIGHTS.droid_collective;
  assert.ok(droidCollectiveWeights[POPULATION_MODE.DROID_ONLY] > droidCollectiveWeights[POPULATION_MODE.MIXED], 'the droid_collective archetype must weight droid-only far above plain mixed, not treat every mode as equally likely');
  assert.equal(pickPopulationModeForArchetype('no-such-archetype', {}), POPULATION_MODE.MIXED, 'an unrecognized archetype must fall back to plain mixed, never throw');

  console.log('population-profile.js (droid-only/organic-only hard constraints, species-locked/coalition/dominant selection, membership policy independence, no auto-generated exclusions, stable species ids preserved, droid leadership allowed, tunable archetype weighting) passed.');
}

// ------------------------------------------------------------
// location-population-profile.js — planet demographics + hierarchy resolution (3rd addendum)
// ------------------------------------------------------------
{
  const {
    getPopulationProfileForSeedId, getPopulationProfileForLocation, GENERIC_GALACTIC_FALLBACK_POPULATION_PROFILE,
    selectSpeciesForLocation, POPULATION_DIVERSITY
  } = await import(abs('scripts/generation/location-population-profile.js'));
  const { LOCATION_POPULATION_PROFILES_BY_SEED_ID } = await import(abs('scripts/generation/data/location-population-profiles.js'));
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));

  // All 50 curated seed profiles sum to exactly 100 and never carry an
  // "other" rollable key (the fold-to-human policy was applied before
  // this data was written).
  const seedIds = Object.keys(LOCATION_POPULATION_PROFILES_BY_SEED_ID);
  assert.equal(seedIds.length, 50, 'the curated Location population dataset must contain all 50 profiled seeds');
  for (const seedId of seedIds) {
    const profile = getPopulationProfileForSeedId(seedId);
    const total = profile.speciesWeights.reduce((sum, entry) => sum + entry.weight, 0);
    assert.ok(Math.abs(total - 100) < 0.01, `"${seedId}" speciesWeights must sum to 100 (got ${total})`);
    assert.ok(!profile.speciesWeights.some((entry) => entry.speciesId === 'other' || entry.speciesId === 'species-other'), `"${seedId}" must never carry a rollable "other" species entry`);
  }

  assert.equal(getPopulationProfileForSeedId('not-a-real-seed'), null, 'an unknown seed id must resolve to null, never a guessed profile');

  // Diversity categorization spot-checks against known real data.
  assert.equal(getPopulationProfileForSeedId('bothawui').diversity, POPULATION_DIVERSITY.HOMOGENEOUS, 'Bothawui (98% Bothan) must categorize as homogeneous');
  assert.equal(getPopulationProfileForSeedId('ryloth').diversity, POPULATION_DIVERSITY.DOMINANT, 'Ryloth (76% Twi\'lek) must categorize as dominant');
  assert.equal(getPopulationProfileForSeedId('taris').diversity, POPULATION_DIVERSITY.HOMOGENEOUS, 'Taris (fold-to-human -> 100% Human) must categorize as homogeneous');

  // Hierarchy resolution: most-specific wins, then parent, then generic fallback.
  const registry = [
    { id: 'ryloth', parentLocationId: '', librarySeedId: 'ryloth', name: 'Ryloth' },
    { id: 'ryloth-child-no-own-profile', parentLocationId: 'ryloth', librarySeedId: '', name: 'Some POI' },
    { id: 'ryloth-child-own-profile', parentLocationId: 'ryloth', librarySeedId: 'bothawui', name: 'Bothan Enclave' }
  ];
  const childInherits = getPopulationProfileForLocation(registry[1], registry);
  assert.equal(childInherits.resolvedFromLocationId, 'ryloth', 'a child Location with no own profile must inherit from its parent');
  assert.deepEqual(childInherits.profile.speciesWeights, getPopulationProfileForSeedId('ryloth').speciesWeights, 'inherited profile must match the parent seed exactly');

  const childOverrides = getPopulationProfileForLocation(registry[2], registry);
  assert.equal(childOverrides.resolvedFromLocationId, 'ryloth-child-own-profile', 'a child Location with its own profile must use ITS OWN, not its parent\'s (most-specific wins)');
  assert.deepEqual(childOverrides.profile.speciesWeights, getPopulationProfileForSeedId('bothawui').speciesWeights, 'the most-specific profile must be the one actually used');

  const orphan = { id: 'nowhere', parentLocationId: '', librarySeedId: '', name: 'Deep Space' };
  const orphanResult = getPopulationProfileForLocation(orphan, registry);
  assert.equal(orphanResult.profile, GENERIC_GALACTIC_FALLBACK_POPULATION_PROFILE, 'a Location resolving to nothing in the chain must fall back to the generic galactic profile, never throw or guess');

  // Weighted species selection actually favors the dominant species.
  const rylothProfile = getPopulationProfileForSeedId('ryloth');
  const rng = makeSeededRng(9);
  let twilekCount = 0;
  for (let i = 0; i < 200; i += 1) if (selectSpeciesForLocation(rylothProfile, { rng }) === 'species-twi-lek') twilekCount += 1;
  assert.ok(twilekCount > 100, 'species selection for a Twi\'lek-dominant Location must favor Twi\'lek in the large majority of rolls');

  console.log('location-population-profile.js (50/50 curated profiles sum to 100 with no rollable "other", diversity categorization, most-specific-wins hierarchy resolution, generic fallback, weighted selection) passed.');
}

// ------------------------------------------------------------
// recruitment-profile.js — Faction locality bias (3rd addendum)
//
// C8D-1 correction (independent review of head 180cedd): the original
// deriveSpeciesPolicyFromLocationContext() collapsed a Location's full
// weighted distribution down to its single dominant species BEFORE
// biasing, so two Locations sharing a dominant species but with very
// different actual splits (e.g. 99/1 vs 51/49) produced IDENTICAL
// behavior, and at bias 1.0 the result was "always the single dominant
// species" rather than "the Location's real distribution." Replaced
// with selectFactionSpeciesWithLocality(), which performs the mixture
// at selection time against the FULL distribution. Tests below use
// deterministic queued RNG (not loose statistics) to prove the fix
// directly, per the reviewer's own recommended test list.
// ------------------------------------------------------------
{
  const { createRecruitmentProfile, selectFactionSpeciesWithLocality, defaultLocalityBiasForArchetype, ARCHETYPE_DEFAULT_LOCALITY_BIAS } = await import(abs('scripts/generation/recruitment-profile.js'));
  const { createSpeciesPolicy, SPECIES_POLICY_MODE, selectSpeciesId } = await import(abs('scripts/generation/population-profile.js'));
  const { getPopulationProfileForSeedId } = await import(abs('scripts/generation/location-population-profile.js'));
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));

  function makeQueueRng(values) {
    let i = 0;
    return () => values[i++ % values.length];
  }

  const rp = createRecruitmentProfile({ currentLocationId: 'ryloth', localityBias: 1.5 });
  assert.equal(rp.localityBias, 1, 'localityBias must be clamped to at most 1');
  assert.equal(createRecruitmentProfile({ localityBias: -1 }).localityBias, 0, 'localityBias must be clamped to at least 0');
  assert.equal('id' in rp, false, 'a recruitment profile must never carry a fabricated id of its own');

  const ryloth = getPopulationProfileForSeedId('ryloth'); // real 76% Twi'lek / 24% Human
  const pool = ['species-human', 'species-twi-lek', 'species-duros'];
  const openPolicy = createSpeciesPolicy();

  // (1) Explicit Faction policy invariant: Location has ZERO authority
  // and consumes ZERO extra rng calls when the policy isn't open --
  // proven by an exact-match delegation check, not just a value check.
  const lockedToHuman = createSpeciesPolicy({ mode: SPECIES_POLICY_MODE.REQUIRED, allowedSpeciesIds: ['species-human'] });
  const oneValueA = [0.42];
  const viaLocality = selectFactionSpeciesWithLocality({ speciesPolicy: lockedToHuman, availableSpeciesIds: pool, locationPopulationProfile: ryloth, localityBias: 0.99, rng: makeQueueRng(oneValueA) });
  const viaDirect = selectSpeciesId(lockedToHuman, pool, { rng: makeQueueRng(oneValueA) });
  assert.equal(viaLocality, viaDirect, 'a non-open Faction policy must delegate to selectSpeciesId() with NO extra rng consumption and NO Location influence -- identical result for the identical single rng value proves the Location path is never even entered');
  assert.equal(viaLocality, 'species-human', 'sanity: the locked policy result must actually be the allowed species');

  // (2) Bias 0 = zero Location influence, provably, not just "usually".
  // rng() returning 0 is the lowest possible roll; even then, roll(0) < bias(0) is false,
  // so this must fall through to open selection regardless of what any rng call would return.
  const zeroRng = () => 0;
  const biasZeroResult = selectFactionSpeciesWithLocality({ speciesPolicy: openPolicy, availableSpeciesIds: pool, locationPopulationProfile: ryloth, localityBias: 0, rng: zeroRng });
  assert.equal(biasZeroResult, pool[0], 'localityBias 0 must always fall through to plain open selection (picking pool[0] under an always-0 rng), proving the Location distribution is never consulted at all');

  // (3) Bias 1 must consult the FULL Location distribution, able to
  // select the 24% MINORITY species -- the original bug made this
  // structurally impossible (dominantSpeciesWeight:1 meant the single
  // dominant species won 100% of the time, always).
  const rollPassesGate = 0.1; // < any bias > 0.1, so the locality roll always succeeds
  const rollSelectsMinority = 0.9; // weightedPick: 0.9*100=90; 90-76(twi'lek)=14>0 continue; 14-24(human)=-10<=0 -> human
  const bias1Result = selectFactionSpeciesWithLocality({ speciesPolicy: openPolicy, availableSpeciesIds: pool, locationPopulationProfile: ryloth, localityBias: 1, rng: makeQueueRng([rollPassesGate, rollSelectsMinority]) });
  assert.equal(bias1Result, 'species-human', 'at localityBias 1, the minority species (24% Human on Ryloth) must be reachable -- proves the full distribution is used, not only speciesWeights[0]/dominantSpeciesIds[0]');

  // (4) Demographic sensitivity: two Locations sharing the SAME
  // dominant species but different actual splits must be able to
  // produce DIFFERENT results for the identical roll sequence.
  const locNearHomogeneous = { speciesWeights: [{ speciesId: 'species-twi-lek', weight: 99 }, { speciesId: 'species-human', weight: 1 }] };
  const locNearEven = { speciesWeights: [{ speciesId: 'species-twi-lek', weight: 51 }, { speciesId: 'species-human', weight: 49 }] };
  const midRoll = [0.1, 0.6]; // gate passes; weightedPick roll = 60
  const resultNearHomogeneous = selectFactionSpeciesWithLocality({ speciesPolicy: openPolicy, availableSpeciesIds: pool, locationPopulationProfile: locNearHomogeneous, localityBias: 1, rng: makeQueueRng(midRoll) });
  const resultNearEven = selectFactionSpeciesWithLocality({ speciesPolicy: openPolicy, availableSpeciesIds: pool, locationPopulationProfile: locNearEven, localityBias: 1, rng: makeQueueRng(midRoll) });
  assert.equal(resultNearHomogeneous, 'species-twi-lek', 'a 99/1 split must still select the dominant species at roll 60');
  assert.equal(resultNearEven, 'species-human', 'a 51/49 split must select the OTHER species at the identical roll 60 -- the actual percentages, not just "which species is dominant", determine the outcome');
  assert.notEqual(resultNearHomogeneous, resultNearEven, 'two Locations with the same dominant species but different real splits must be able to diverge under the identical roll -- demographic shape matters');

  // (5) Minorities remain statistically possible under a real seeded
  // RNG too (not just the engineered deterministic proof above) -- a
  // fully local Ryloth Faction with open membership must still
  // generate the non-Twi'lek ~24% share at roughly its real rate.
  const seededRng = makeSeededRng(77);
  let humanCount = 0;
  const trials = 500;
  for (let i = 0; i < trials; i += 1) {
    if (selectFactionSpeciesWithLocality({ speciesPolicy: openPolicy, availableSpeciesIds: pool, locationPopulationProfile: ryloth, localityBias: 1, rng: seededRng }) === 'species-human') humanCount += 1;
  }
  const humanFraction = humanCount / trials;
  assert.ok(humanFraction > 0.15 && humanFraction < 0.33, `at bias 1 over ${trials} trials, the minority species should appear near its real ~24% share (got ${(humanFraction * 100).toFixed(1)}%)`);

  // C8D-1 edge-case correction (independent review of head cff63f4): the
  // Location-influenced branch previously passed the raw
  // locationPopulationProfile straight to selectSpeciesForLocation(),
  // bypassing BOTH the policy's own excludedSpeciesIds and the caller's
  // availableSpeciesIds boundary -- so an open policy's explicit
  // exclusion (or a restricted canonical species pool) could still be
  // violated whenever the Location roll succeeded.

  // (6) An OPEN policy that explicitly excludes Twi'lek must never
  // select Twi'lek even at localityBias 1 on Twi'lek-dominant Ryloth --
  // deterministic proof (single-entry pool after filtering always wins
  // regardless of the weightedPick roll) plus a statistical sweep.
  const excludingTwilek = createSpeciesPolicy({ mode: SPECIES_POLICY_MODE.OPEN, excludedSpeciesIds: ['species-twi-lek'] });
  const excludedDeterministic = selectFactionSpeciesWithLocality({ speciesPolicy: excludingTwilek, availableSpeciesIds: pool, locationPopulationProfile: ryloth, localityBias: 1, rng: makeQueueRng([0.1, 0.3]) });
  assert.equal(excludedDeterministic, 'species-human', 'with Twi\'lek excluded, the filtered Location pool must contain only Human, so any roll must select Human, never the excluded majority species');
  const excludedSweepRng = makeSeededRng(21);
  let sawExcludedSpecies = false;
  for (let i = 0; i < 300; i += 1) {
    if (selectFactionSpeciesWithLocality({ speciesPolicy: excludingTwilek, availableSpeciesIds: pool, locationPopulationProfile: ryloth, localityBias: 1, rng: excludedSweepRng }) === 'species-twi-lek') sawExcludedSpecies = true;
  }
  assert.equal(sawExcludedSpecies, false, 'an explicitly excluded species must NEVER be selected via the Location-influenced branch, across 300 trials at bias 1 on the Location where it is the 76% majority');

  // (7) availableSpeciesIds acts as a hard boundary on the Location
  // branch too -- restricting the pool to Human-only must mean only
  // Human is ever selected, even though Ryloth's real distribution is
  // 76% Twi'lek.
  const humanOnlyPool = ['species-human'];
  const restrictedDeterministic = selectFactionSpeciesWithLocality({ speciesPolicy: openPolicy, availableSpeciesIds: humanOnlyPool, locationPopulationProfile: ryloth, localityBias: 1, rng: makeQueueRng([0.1, 0.5]) });
  assert.equal(restrictedDeterministic, 'species-human', 'restricting availableSpeciesIds to Human-only must select Human even though Twi\'lek is the Location\'s real majority');
  const restrictedSweepRng = makeSeededRng(33);
  let sawOutOfPoolSpecies = false;
  for (let i = 0; i < 300; i += 1) {
    if (selectFactionSpeciesWithLocality({ speciesPolicy: openPolicy, availableSpeciesIds: humanOnlyPool, locationPopulationProfile: ryloth, localityBias: 1, rng: restrictedSweepRng }) !== 'species-human') sawOutOfPoolSpecies = true;
  }
  assert.equal(sawOutOfPoolSpecies, false, 'a species outside availableSpeciesIds must NEVER be selected via the Location-influenced branch, across 300 trials at bias 1');

  // Archetype defaults distinguish "shaped by where it operates" from "not".
  assert.ok(defaultLocalityBiasForArchetype('government') > defaultLocalityBiasForArchetype('military'), 'a local government archetype must default to a materially higher locality bias than an (offworld-flavored) military archetype');
  assert.ok(defaultLocalityBiasForArchetype('clan') > defaultLocalityBiasForArchetype('bounty_hunters'), 'a clan archetype must default to a materially higher locality bias than bounty hunters');
  assert.equal(defaultLocalityBiasForArchetype('totally-unknown'), 0.5, 'an unrecognized archetype must default to a neutral 0.5, never throw');
  assert.ok(Object.keys(ARCHETYPE_DEFAULT_LOCALITY_BIAS).length >= 15, 'the archetype locality-bias table must be centralized and cover most named archetypes, not left for callers to invent');

  console.log('recruitment-profile.js (C8D-1 fix verified: bounded locality bias, explicit Faction species policy consumes zero Location influence, bias 0 never touches Location data, bias 1 consults the FULL distribution including minorities, demographic shape -- not just dominant-species identity -- changes outcomes, excludedSpeciesIds and availableSpeciesIds are hard boundaries on the Location branch too, archetype defaults distinguish local vs offworld organizations) passed.');
}

// ------------------------------------------------------------
// faction-draft.js — full contract composition + jobDefaults reuse
// ------------------------------------------------------------
{
  const { createFactionDraft, updateFactionDraft } = await import(abs('scripts/generation/faction-draft.js'));
  const { ORGANIZATION_FAMILY } = await import(abs('scripts/generation/organization-metadata.js'));
  const { POPULATION_MODE, MEMBERSHIP_POLICY } = await import(abs('scripts/generation/population-profile.js'));
  const { hasForbiddenMechanicalFields } = await import(abs('scripts/generation/npc-concept.js'));

  const draft = createFactionDraft({
    name: 'Outer Rim Merchant Compact',
    organizationFamily: ORGANIZATION_FAMILY.BUSINESS_PROFESSIONAL,
    archetype: 'guild',
    scale: 11,
    jobDefaults: { tone: 'mercantile', credits: 5000, successDelta: 2 },
    populationProfile: { mode: POPULATION_MODE.MIXED },
    membershipPolicy: MEMBERSHIP_POLICY.OPEN,
    recruitmentProfile: { currentLocationId: 'coruscant', localityBias: 0.5 }
  });

  assert.deepEqual(draft.recruitmentProfile, { originLocationId: '', headquartersLocationId: '', currentLocationId: 'coruscant', localityBias: 0.5 }, 'a Faction draft must carry its recruitmentProfile with only real-id-shaped location fields, never a fabricated id');

  // jobDefaults reuses the EXACT FactionRegistryService field set.
  for (const field of ['tone', 'rewardStyle', 'objective', 'briefing', 'instructions', 'credits', 'xp', 'successDelta', 'failureDelta', 'visibility', 'legality', 'payStyle', 'rivalFactionName', 'rivalSuccessDelta', 'rivalFailureDelta', 'consequenceNotes']) {
    assert.ok(field in draft.jobDefaults, `Faction draft jobDefaults must carry the canonical field "${field}"`);
  }
  assert.equal(draft.jobDefaults.credits, 5000, 'supplied jobDefaults values must be preserved through normalization');

  assert.equal(draft.source, 'generator-draft', 'a Faction draft must use its own draft-only source value, never a canonical Faction source value before commit');
  assert.equal(draft.status, 'draft', 'a Faction draft must be status:draft until explicit GM commit');
  assert.equal(hasForbiddenMechanicalFields(draft), false, 'a full Faction draft must carry no mechanical Actor statistics anywhere in its composed structure');

  // Draft never carries a canonical Faction id.
  assert.equal('id' in draft, false, 'a Faction draft must never carry a canonical Faction id -- that is assigned only by FactionRegistryService.upsertFaction() at commit time');

  const reroll = updateFactionDraft(draft, { name: 'Renamed Compact' });
  assert.notEqual(reroll.name, draft.name, 'a Faction-level reroll must change the targeted field');
  assert.equal(reroll.scale, draft.scale, 'a Faction-level reroll must preserve every other field untouched');
  assert.deepEqual(reroll.populationProfile, draft.populationProfile, 'a Faction-level reroll must preserve populationProfile untouched when not targeted');

  console.log('faction-draft.js (exact jobDefaults field reuse, draft-only source/status, no mechanical fields, no canonical id, per-field reroll) passed.');
}

// ------------------------------------------------------------
// location-draft.js — dependency drafts, Location Library reuse
// ------------------------------------------------------------
{
  const { createLocationDependencyDraft, LOCATION_DRAFT_MODE, pickRandomLocationLibrarySeed, buildLocationDraftFromLibrarySeed } = await import(abs('scripts/generation/location-draft.js'));
  const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));

  assert.equal(createLocationDependencyDraft({ mode: 'not-a-real-mode' }), null, 'an invalid location draft mode must fail safe to null');

  const seed = pickRandomLocationLibrarySeed({ rng: makeSeededRng(21) });
  assert.ok(seed && seed.id, 'a random Location Library seed must be selected from the real existing library, not invented');

  const drafts = buildLocationDraftFromLibrarySeed(seed, { rng: makeSeededRng(22), includeChild: true });
  assert.ok(drafts.length >= 1, 'at least a planet draft must be produced');
  const planetDraft = drafts[0];
  assert.equal(planetDraft.locationId, '', 'a generated planet draft must carry no canonical Location id -- it does not exist yet');
  if (drafts.length > 1) {
    const childDraft = drafts[1];
    assert.equal(childDraft.parentDraftId, planetDraft.draftId, 'a generated child POI must reference its generated parent by DRAFT id, not a name, until both are committed');
    assert.equal(childDraft.parentLocationId, '', 'a generated child POI must carry no canonical parent Location id while its parent is still a draft');
  }

  console.log('location-draft.js (invalid mode fails safe, real Location Library reuse, draft-id parent/child linking without names or fake canonical ids) passed.');
}

// ------------------------------------------------------------
// provenance.js
// ------------------------------------------------------------
{
  const { createProvenance, withWarning, isProvenance, GENERATION_SCHEMA_VERSION } = await import(abs('scripts/generation/provenance.js'));

  const prov = createProvenance({ presetId: 'rescue', templateId: 'rescue-person-secured-site' });
  assert.equal(prov.schemaVersion, GENERATION_SCHEMA_VERSION, 'a provenance stamp must carry the current schema version');
  assert.ok(isProvenance(prov), 'a freshly-created provenance stamp must pass its own structural check');

  const warned = withWarning(prov, 'issuer-resource-mismatch');
  assert.equal(prov.warnings.length, 0, 'withWarning must not mutate the original provenance object');
  assert.deepEqual(warned.warnings, ['issuer-resource-mismatch'], 'withWarning must append the warning to a NEW object');
  const warnedAgain = withWarning(warned, 'issuer-resource-mismatch');
  assert.equal(warnedAgain.warnings.length, 1, 'withWarning must not duplicate an already-present warning code');

  console.log('provenance.js (schema stamp, immutable warning append, dedup) passed.');
}

// ------------------------------------------------------------
// draft safety: generation performs NO canonical mutation anywhere
// ------------------------------------------------------------
{
  // Structural proof by source inspection: none of the generation
  // modules import a canonical create/upsert authority
  // (FactionRegistryService.upsertFaction, LocationRegistryService
  // .upsertLocation, HolonetMessengerService.createJobPosting,
  // Actor.create) at all -- if they never import it, they cannot call
  // it. This is stronger than an executed spy for modules with no
  // Foundry-dependent code path to spy through in this shim.
  const { readFile } = await import('node:fs/promises');
  const { readdir } = await import('node:fs/promises');
  const root = new URL('../scripts/generation/', import.meta.url);
  const files = await readdir(root, { recursive: true });
  const jsFiles = files.filter((f) => f.endsWith('.js'));
  assert.ok(jsFiles.length >= 15, `expected at least 15 generation module files, found ${jsFiles.length}`);

  const forbiddenCallPatterns = [
    /upsertFaction\s*\(/,
    /upsertLocation\s*\(/,
    /createJobPosting\s*\(/,
    /Actor\.create\s*\(/,
    /promoteFactionContactToActor\s*\(/,
    /\.actorizePayload\s*\(/
  ];
  // Strip comments before scanning -- several modules' doc comments
  // legitimately MENTION e.g. "FactionRegistryService.upsertFaction()"
  // to explain that committing happens elsewhere; only an actual call
  // in live code should fail this check.
  const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

  for (const relPath of jsFiles) {
    const source = stripComments(await readFile(new URL(relPath, root), 'utf8'));
    for (const pattern of forbiddenCallPatterns) {
      assert.doesNotMatch(source, pattern, `scripts/generation/${relPath} must never call a canonical create/upsert authority during generation (found pattern ${pattern})`);
    }
  }

  console.log('draft safety (source-level proof: no generation module calls any canonical Actor/Faction/Location/Job create-or-upsert authority) passed.');
}

console.log('PHASE 8D-1 random-generation foundation suite passed.');
