import assert from 'node:assert/strict';
import { registerFoundryPathLoader } from './helpers/foundry-shim/register.mjs';
import { installFoundryShimGlobals } from './helpers/foundry-shim/globals.mjs';

// GM Datapad ecosystem redesign — PHASE 8D-3B: NPC + FACTION
// PRODUCTIONIZATION.
//
// Builds on Phase 8D-1/8D-2's Faction/NPC foundation (independently
// reviewed and closed) and Phase 8D-3A's Location productionization by
// composing the previously-unwired pieces into full generators:
//
//  - `npc/npc-role.js` + `data/npc-roles.js`/`data/npc-droid-roles.js`
//    (NEW): a role/occupation catalog, narrative only -- role never
//    implies a class.
//  - `npc/npc-bundle.js` (NEW): the full NPC-concept composer --
//    wires `population-profile.js`/`recruitment-profile.js`'s existing
//    species/droid selectors (built in Phase 8D-1, never called from a
//    generator until now) together with role/rank/narrative facts and
//    `chargen-shared.js` name generation (the one Foundry-dependent
//    step, isolated behind an injectable async provider).
//  - `data/faction-presets.js` (NEW): 20 presets, one per existing
//    `organization-metadata.js` archetype.
//  - `factions/faction-archetype.js` (NEW): reuses Phase 8D-3A's own
//    `FACTION_ARCHETYPE_TAGS` table in the OTHER direction (context ->
//    archetype pick).
//  - `factions/faction-bundle.js` (NEW): the full Faction draft
//    composer + reroll/regenerate operations, mirroring
//    `planets/planet-bundle.js`'s sibling-preserving discipline for
//    generated Contacts.
//  - `npc/npc-flavor.js` + `data/npc-flavor-qualities-organic.js`/
//    `-droid.js` (NEW, user-requested addendum): small, memorable
//    sensory/behavioral NPC quirks ("smells faintly like soup"). TWO
//    STRUCTURALLY SEPARATE content pools (organic vs. droid) behind ONE
//    shared selection/conflict/reroll engine -- the boundary is
//    enforced by which pool a `kind` looks up, never by a per-entry
//    exclusion tag. Pure narrative flavor: never a mechanical modifier.
//
// This phase generates Faction/NPC FACTS only -- exactly like every
// prior GM Datapad generation phase, it NEVER creates a canonical
// Faction/Actor record (`FactionRegistryService`/`game.actors` are
// never called anywhere in this phase's new/changed files), and the
// GENERATE/SUGGEST/RESOLVE boundary holds throughout: a generated
// Faction's `contacts` are `npc-concept.js` drafts, not canonical
// records, and `preferredProfileTags`/`profileAffinity` stay soft
// hints only.

registerFoundryPathLoader();
installFoundryShimGlobals();

const abs = (rel) => `/systems/foundryvtt-swse/${rel}`;

const { makeSeededRng } = await import(abs('scripts/generation/lib/weighted-random.js'));
const stubNameProvider = async () => 'Test Living Name';
const stubDroidNameProvider = async () => 'TX-1';

// ------------------------------------------------------------
// Catalog quality
// ------------------------------------------------------------
{
  const { NPC_ROLES, NPC_ROLE_TIER } = await import(abs('scripts/generation/data/npc-roles.js'));
  const { NPC_DROID_ROLES } = await import(abs('scripts/generation/data/npc-droid-roles.js'));
  const { FACTION_PRESETS, isFactionPresetId, getFactionPreset, getFactionPresetForArchetype } = await import(abs('scripts/generation/data/faction-presets.js'));
  const { FACTION_ARCHETYPE_FAMILY, ORGANIZATION_FAMILY } = await import(abs('scripts/generation/organization-metadata.js'));
  const { isMembershipPolicy } = await import(abs('scripts/generation/population-profile.js'));

  assert.ok(NPC_ROLES.length >= 75 && NPC_ROLES.length <= 150, `NPC_ROLES must land in the 75-150 production target, got ${NPC_ROLES.length}`);
  assert.ok(NPC_DROID_ROLES.length >= 20, `NPC_DROID_ROLES must be 20+, got ${NPC_DROID_ROLES.length}`);
  for (const [name, pool] of [['NPC_ROLES', NPC_ROLES], ['NPC_DROID_ROLES', NPC_DROID_ROLES]]) {
    const seen = new Set();
    for (const entry of pool) {
      assert.ok(!seen.has(entry.value), `${name} must contain no duplicate values (dup: "${entry.value}")`);
      seen.add(entry.value);
      assert.ok(['common', 'specialist', 'leadership'].includes(entry.tier), `${name} entry "${entry.value}" must carry a valid tier`);
      assert.ok(Array.isArray(entry.tags) && entry.tags.length > 0, `${name} entry "${entry.value}" must carry at least one context tag`);
    }
  }
  assert.ok(Object.values(NPC_ROLE_TIER).every((t) => ['common', 'specialist', 'leadership'].includes(t)), 'NPC_ROLE_TIER must only ever contain the 3 known tier values');
  for (const tier of ['common', 'specialist', 'leadership']) {
    assert.ok(NPC_ROLES.some((e) => e.tier === tier), `NPC_ROLES must contain at least one "${tier}" entry`);
  }

  // Faction presets: exactly 20, one per FACTION_ARCHETYPE_FAMILY archetype (1:1, no gaps, no duplicates, no strays).
  assert.equal(FACTION_PRESETS.length, 20, `FACTION_PRESETS must have exactly 20 entries (one per existing archetype), got ${FACTION_PRESETS.length}`);
  const presetIds = new Set(FACTION_PRESETS.map((p) => p.id));
  assert.equal(presetIds.size, FACTION_PRESETS.length, 'FACTION_PRESETS ids must be unique');
  const presetArchetypes = FACTION_PRESETS.map((p) => p.archetype);
  const archetypeKeys = Object.keys(FACTION_ARCHETYPE_FAMILY);
  assert.deepEqual([...presetArchetypes].sort(), [...archetypeKeys].sort(), 'FACTION_PRESETS must map 1:1 onto every FACTION_ARCHETYPE_FAMILY archetype, no more and no fewer');
  for (const preset of FACTION_PRESETS) {
    assert.ok(Object.values(ORGANIZATION_FAMILY).includes(FACTION_ARCHETYPE_FAMILY[preset.archetype]), `preset "${preset.id}"'s archetype must resolve to a real ORGANIZATION_FAMILY`);
    if (preset.membershipPolicyDefault) assert.equal(isMembershipPolicy(preset.membershipPolicyDefault), true, `preset "${preset.id}"'s membershipPolicyDefault must be a real MEMBERSHIP_POLICY value`);
  }
  assert.equal(isFactionPresetId('crime-syndicate'), true, 'isFactionPresetId must recognize a known preset id');
  assert.equal(isFactionPresetId('not-a-real-preset'), false, 'isFactionPresetId must fail safe on an unknown id');
  assert.equal(getFactionPreset('not-a-real-preset'), null, 'getFactionPreset must return null (never throw) on an unknown id, matching planet-presets.js\'s contract');
  assert.equal(getFactionPresetForArchetype('not-a-real-archetype'), null, 'getFactionPresetForArchetype must return null on an unrecognized archetype');
  assert.ok(getFactionPresetForArchetype('government'), 'getFactionPresetForArchetype must resolve a known archetype to its 1:1 preset');

  // Expanded existing Phase 8D-2 catalogs: production growth over the foundation-scale (20-46) baseline, still zero duplicates.
  const { FACTION_LONG_TERM_GOALS, FACTION_CURRENT_OBJECTIVES } = await import(abs('scripts/generation/data/faction-goals.js'));
  const { FACTION_INSTITUTIONAL_CHARACTERS } = await import(abs('scripts/generation/data/faction-institutional-characters.js'));
  const { FACTION_INTERNAL_PROBLEMS } = await import(abs('scripts/generation/data/faction-internal-problems.js'));
  const { FACTION_LEADERSHIP_STRUCTURES } = await import(abs('scripts/generation/data/faction-leadership-structures.js'));
  const { FACTION_RESOURCE_FLAVORS } = await import(abs('scripts/generation/data/faction-resource-flavors.js'));
  const { NPC_AGENDAS } = await import(abs('scripts/generation/data/npc-agendas.js'));
  const { NPC_APPEARANCE_TRAITS } = await import(abs('scripts/generation/data/npc-appearance-traits.js'));
  const { NPC_MANNERISMS } = await import(abs('scripts/generation/data/npc-mannerisms.js'));
  const { NPC_MOTIVATIONS } = await import(abs('scripts/generation/data/npc-motivations.js'));
  const { NPC_PERSONALITY_TRAITS } = await import(abs('scripts/generation/data/npc-personality-traits.js'));
  const { NPC_SECRETS } = await import(abs('scripts/generation/data/npc-secrets.js'));

  const expandedPools = {
    FACTION_LONG_TERM_GOALS, FACTION_CURRENT_OBJECTIVES, FACTION_INSTITUTIONAL_CHARACTERS,
    FACTION_INTERNAL_PROBLEMS, FACTION_LEADERSHIP_STRUCTURES, FACTION_RESOURCE_FLAVORS,
    NPC_AGENDAS, NPC_APPEARANCE_TRAITS, NPC_MANNERISMS, NPC_MOTIVATIONS, NPC_PERSONALITY_TRAITS, NPC_SECRETS
  };
  const priorFoundationCount = { // 8D-2 foundation counts, confirmed by direct count before this phase's expansion
    FACTION_LONG_TERM_GOALS: 24, FACTION_CURRENT_OBJECTIVES: 22, FACTION_INSTITUTIONAL_CHARACTERS: 25,
    FACTION_INTERNAL_PROBLEMS: 25, FACTION_LEADERSHIP_STRUCTURES: 20, FACTION_RESOURCE_FLAVORS: 20,
    NPC_AGENDAS: 25, NPC_APPEARANCE_TRAITS: 30, NPC_MANNERISMS: 25, NPC_MOTIVATIONS: 25, NPC_PERSONALITY_TRAITS: 30, NPC_SECRETS: 25
  };
  for (const [name, pool] of Object.entries(expandedPools)) {
    assert.ok(pool.length > priorFoundationCount[name], `${name} must have grown beyond its Phase 8D-2 foundation count of ${priorFoundationCount[name]}, got ${pool.length}`);
    const seen = new Set();
    for (const entry of pool) {
      assert.ok(!seen.has(entry.value), `${name} must contain no duplicate values (dup: "${entry.value}")`);
      seen.add(entry.value);
    }
  }

  console.log('PHASE 8D-3B catalog quality (NPC role/droid-role catalogs, 20 Faction presets mapped 1:1 onto every existing archetype, expanded Phase 8D-2 catalogs, zero duplicates throughout) passed.');
}

// ------------------------------------------------------------
// Generation semantics (statistically-verified context weighting)
// ------------------------------------------------------------
{
  const { pickFactionArchetype } = await import(abs('scripts/generation/factions/faction-archetype.js'));
  const { createGeneratedNpcConcept, droidLikelihoodForPrevalence, rollCommandTier } = await import(abs('scripts/generation/npc/npc-bundle.js'));
  const { pickNpcRole } = await import(abs('scripts/generation/npc/npc-role.js'));
  const { createProceduralFactionDraft } = await import(abs('scripts/generation/factions/faction-bundle.js'));
  const { createPopulationProfile, createSpeciesPolicy, SPECIES_POLICY_MODE } = await import(abs('scripts/generation/population-profile.js'));
  const { createLocationPopulationProfile } = await import(abs('scripts/generation/location-population-profile.js'));
  const { COMMAND_TIER } = await import(abs('scripts/generation/rank-metadata.js'));
  const { hasForbiddenMechanicalFields: doctrineForbidden } = await import(abs('scripts/generation/faction-doctrine-draft.js'));
  const { hasForbiddenMechanicalFields: npcForbidden } = await import(abs('scripts/generation/npc-concept.js'));

  const availableSpeciesIds = ['species-human', 'species-twi-lek', 'species-rodian', 'species-duros'];

  // 1. Faction archetype: mining-flavored Location context must meaningfully raise mining-adjacent archetype picks over an unbiased roll.
  {
    const N = 2000;
    const miningArchetypes = new Set(['corporation', 'guild', 'criminal_syndicate']);
    let withMiningContext = 0, baseline = 0;
    for (let i = 0; i < N; i++) {
      if (miningArchetypes.has(pickFactionArchetype({ rng: makeSeededRng(i), preferTags: ['mining', 'industrial', 'business-professional'] }))) withMiningContext++;
      if (miningArchetypes.has(pickFactionArchetype({ rng: makeSeededRng(i + 5000000) }))) baseline++;
    }
    assert.ok(withMiningContext > baseline * 1.15, `mining/industrial Location context must meaningfully raise mining-adjacent archetype picks (got ${withMiningContext}/${N} vs baseline ${baseline}/${N})`);
  }

  // 2. Faction archetype: an explicit archetype always short-circuits the roll, regardless of preferTags.
  for (let i = 0; i < 50; i++) {
    assert.equal(pickFactionArchetype({ rng: makeSeededRng(i), archetype: 'noble_house', preferTags: ['crime-syndicate'] }), 'noble_house', 'an explicit archetype must always win over a context roll');
  }

  // 3. Faction contacts: a crime-syndicate-preset Faction's contacts must roll crime-syndicate-tagged roles measurably more often than an unbiased roll.
  {
    const N = 600;
    let crimeSyndicateContacts = 0, crimeSyndicateTrials = 0, baselineContacts = 0, baselineTrials = 0;
    for (let seed = 0; seed < N; seed++) {
      const rng = makeSeededRng(seed);
      const crimeDraft = await createProceduralFactionDraft({ rng, presetId: 'crime-syndicate', availableSpeciesIds, contactCount: 3, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      for (const contact of crimeDraft.contacts) {
        crimeSyndicateTrials++;
        if (contact.profileAffinity.roleTags.includes('crime-syndicate')) crimeSyndicateContacts++;
      }
      const baseRng = makeSeededRng(seed + 9000000);
      const baseDraft = await createProceduralFactionDraft({ rng: baseRng, presetId: 'government-agency', availableSpeciesIds, contactCount: 3, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      for (const contact of baseDraft.contacts) {
        baselineTrials++;
        if (contact.profileAffinity.roleTags.includes('crime-syndicate')) baselineContacts++;
      }
    }
    const crimeRate = crimeSyndicateContacts / crimeSyndicateTrials;
    const baselineRate = baselineContacts / baselineTrials;
    assert.ok(crimeRate > baselineRate * 1.3, `a crime-syndicate-preset Faction's Contacts must roll crime-syndicate-tagged roles measurably more often than a government-agency-preset Faction's (got ${crimeRate.toFixed(3)} vs ${baselineRate.toFixed(3)})`);
  }

  // 4. Droid prevalence: droidLikelihoodForPrevalence() is monotonically increasing across the PLANET_DROID_PREVALENCE band order, and 'automated' NPCs are measurably more common than 'rare'.
  {
    const order = ['rare', 'low', 'normal', 'high', 'very-high', 'automated'];
    for (let i = 1; i < order.length; i++) {
      assert.ok(droidLikelihoodForPrevalence(order[i]) > droidLikelihoodForPrevalence(order[i - 1]), `droidLikelihoodForPrevalence must increase monotonically: ${order[i - 1]} -> ${order[i]}`);
    }
    const N = 500;
    let automatedDroids = 0, rareDroids = 0;
    for (let i = 0; i < N; i++) {
      const rng = makeSeededRng(i);
      const automated = await createGeneratedNpcConcept({ rng, availableSpeciesIds, droidPrevalence: 'automated', nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      if (automated.kind === 'droid') automatedDroids++;
      const rareRng = makeSeededRng(i + 7000000);
      const rare = await createGeneratedNpcConcept({ rng: rareRng, availableSpeciesIds, droidPrevalence: 'rare', nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      if (rare.kind === 'droid') rareDroids++;
    }
    assert.ok(automatedDroids > rareDroids * 3, `'automated' droid prevalence must produce measurably more droid NPCs than 'rare' (got ${automatedDroids}/${N} vs ${rareDroids}/${N})`);
  }

  // 5. Locality bias: a Faction with an OPEN species policy, given a strongly Twi'lek-dominant Location population profile, must select the local dominant species measurably more often at high localityBias than at low localityBias.
  {
    const location = createLocationPopulationProfile({ speciesWeights: [{ speciesId: 'species-twi-lek', weight: 80 }, { speciesId: 'species-human', weight: 20 }] });
    const openProfile = createPopulationProfile({ speciesPolicy: createSpeciesPolicy({ mode: SPECIES_POLICY_MODE.OPEN }) });
    const N = 800;
    let localAtHighBias = 0, livingHighTrials = 0, localAtLowBias = 0, livingLowTrials = 0;
    for (let i = 0; i < N; i++) {
      const high = await createGeneratedNpcConcept({
        rng: makeSeededRng(i), availableSpeciesIds, populationProfile: openProfile, locationPopulationProfile: location,
        recruitmentProfile: { localityBias: 0.95 }, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider
      });
      if (high.kind === 'living') { livingHighTrials++; if (high.speciesId === 'species-twi-lek') localAtHighBias++; }
      const low = await createGeneratedNpcConcept({
        rng: makeSeededRng(i + 3000000), availableSpeciesIds, populationProfile: openProfile, locationPopulationProfile: location,
        recruitmentProfile: { localityBias: 0.05 }, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider
      });
      if (low.kind === 'living') { livingLowTrials++; if (low.speciesId === 'species-twi-lek') localAtLowBias++; }
    }
    const highRate = localAtHighBias / livingHighTrials;
    const lowRate = localAtLowBias / livingLowTrials;
    assert.ok(highRate > lowRate * 1.5, `high localityBias (0.95) must select the Location's dominant species measurably more often than low localityBias (0.05) (got ${highRate.toFixed(3)} vs ${lowRate.toFixed(3)})`);
  }

  // 6. Explicit species exclusion: an OPEN policy that explicitly excludes a species must NEVER select it, at ANY localityBias, even when that species is the Location's overwhelming majority.
  {
    const location = createLocationPopulationProfile({ speciesWeights: [{ speciesId: 'species-twi-lek', weight: 99 }, { speciesId: 'species-human', weight: 1 }] });
    const excludingProfile = createPopulationProfile({ speciesPolicy: createSpeciesPolicy({ mode: SPECIES_POLICY_MODE.OPEN, excludedSpeciesIds: ['species-twi-lek'] }) });
    for (let i = 0; i < 300; i++) {
      const npc = await createGeneratedNpcConcept({
        rng: makeSeededRng(i), availableSpeciesIds: ['species-human', 'species-twi-lek'], populationProfile: excludingProfile,
        locationPopulationProfile: location, recruitmentProfile: { localityBias: 1 }, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider
      });
      if (npc.kind === 'living') assert.notEqual(npc.speciesId, 'species-twi-lek', `seed ${i}: an explicitly excluded species must NEVER be selected, even as the Location's 99% majority at localityBias 1`);
    }
  }

  // 7. Rank: a high leadershipBoost must roll leadership-tier commandTiers measurably more often than the unboosted default.
  {
    const N = 3000;
    const leadershipTiers = new Set(['fireteam-leadership', 'squad-command', 'senior-specialist', 'junior-command', 'tactical-command', 'operational-command', 'strategic-command']);
    let boosted = 0, unboosted = 0;
    for (let i = 0; i < N; i++) {
      if (leadershipTiers.has(rollCommandTier({ rng: makeSeededRng(i), leadershipBoost: 3 }))) boosted++;
      if (leadershipTiers.has(rollCommandTier({ rng: makeSeededRng(i + 4000000) }))) unboosted++;
    }
    assert.ok(boosted > unboosted * 1.5, `leadershipBoost:3 must meaningfully raise leadership-tier commandTier rolls (got ${boosted}/${N} vs ${unboosted}/${N})`);
  }

  // 8. Role tier bias: a STRATEGIC_COMMAND commandTier must roll a 'leadership'-tier role measurably more often than COMMAND_TIER.NONE.
  {
    const N = 1000;
    let leaderRoleAtStrategic = 0, leaderRoleAtNone = 0;
    for (let i = 0; i < N; i++) {
      if (pickNpcRole({ rng: makeSeededRng(i), commandTier: COMMAND_TIER.STRATEGIC_COMMAND })?.tier === 'leadership') leaderRoleAtStrategic++;
      if (pickNpcRole({ rng: makeSeededRng(i + 2000000), commandTier: COMMAND_TIER.NONE })?.tier === 'leadership') leaderRoleAtNone++;
    }
    assert.ok(leaderRoleAtStrategic > leaderRoleAtNone * 1.5, `STRATEGIC_COMMAND must meaningfully raise leadership-tier role picks over COMMAND_TIER.NONE (got ${leaderRoleAtStrategic}/${N} vs ${leaderRoleAtNone}/${N})`);
  }

  // 9. Scale banding: contact counts stay within the documented bands across many seeds, and a very small/very large Scale produces a proportionally smaller/larger roster.
  {
    let smallTotal = 0, smallTrials = 0, largeTotal = 0, largeTrials = 0;
    for (let seed = 0; seed < 200; seed++) {
      const small = await createProceduralFactionDraft({ rng: makeSeededRng(seed), scale: 2, availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      assert.ok(small.contacts.length >= 2 && small.contacts.length <= 3, `Scale 2 Faction must roll 2-3 contacts, got ${small.contacts.length}`);
      smallTotal += small.contacts.length; smallTrials++;
      const large = await createProceduralFactionDraft({ rng: makeSeededRng(seed + 1000000), scale: 19, availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      assert.ok(large.contacts.length >= 5 && large.contacts.length <= 8, `Scale 19 Faction must roll 5-8 contacts, got ${large.contacts.length}`);
      largeTotal += large.contacts.length; largeTrials++;
    }
    assert.ok((largeTotal / largeTrials) > (smallTotal / smallTrials), 'a Scale-19 Faction must average a larger generated roster than a Scale-2 Faction');
  }

  // 10. Diagnostics: both new Phase 8D-3B codes (FACTION_RESOURCE_MISMATCH, FACTION_POPULATION_MISMATCH) are reachable, never blocking generation.
  {
    const { DIAGNOSTIC_CODE } = await import(abs('scripts/generation/lib/generator-diagnostics.js'));
    let sawResourceMismatch = false;
    for (let seed = 0; seed < 200; seed++) {
      const d = await createProceduralFactionDraft({ rng: makeSeededRng(seed), archetype: 'street_gang', scale: 18, availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      assert.ok(d, 'an unusual archetype/scale combination must still generate successfully, never blocked');
      if (d.provenance.warnings.includes(DIAGNOSTIC_CODE.FACTION_RESOURCE_MISMATCH)) { sawResourceMismatch = true; break; }
    }
    assert.ok(sawResourceMismatch, 'FACTION_RESOURCE_MISMATCH must be reachable for a typically-small archetype (street_gang) forced to a high Scale (18)');

    const droidCollective = await createProceduralFactionDraft({ rng: makeSeededRng(1), archetype: 'droid_collective', membershipPolicy: 'organic-only', availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    assert.ok(droidCollective.provenance.warnings.includes(DIAGNOSTIC_CODE.FACTION_POPULATION_MISMATCH), 'FACTION_POPULATION_MISMATCH must fire when membershipPolicy contradicts the rolled population composition');
  }

  // 11. Mechanical-field guard: a fully generated Faction draft's doctrine and every generated Contact carry no forbidden mechanical field.
  {
    const draft = await createProceduralFactionDraft({ rng: makeSeededRng(42), presetId: 'mercenary-company', availableSpeciesIds, contactCount: 6, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    assert.equal(doctrineForbidden(draft.doctrine), false, 'a generated Faction doctrine must carry no HP/BAB/defenses/level/class field');
    for (const contact of draft.contacts) assert.equal(npcForbidden(contact), false, `generated Contact "${contact.name}" must carry no forbidden mechanical field`);
  }

  console.log('PHASE 8D-3B generation semantics (archetype context weighting, role context weighting, droid prevalence, locality bias, explicit species exclusion enforced absolutely, rank/leadership boost, Scale-banded roster size, diagnostics reachability, mechanical-field guard) passed.');
}

// ------------------------------------------------------------
// Bundle generation, reroll safety, and determinism
// ------------------------------------------------------------
{
  const {
    createProceduralFactionDraft, regenerateFactionDraft, rerollFactionName, rerollFactionArchetype, rerollFactionScale,
    rerollFactionGoals, rerollFactionInstitutionalCharacter, rerollFactionLeadershipStructure, rerollFactionInternalProblems,
    rerollFactionResourceProfile, rerollFactionRelationships, regenerateFactionContacts, rerollFactionContact,
    addFactionContact, removeFactionContact, factionDraftScaleLabel
  } = await import(abs('scripts/generation/factions/faction-bundle.js'));

  const availableSpeciesIds = ['species-human', 'species-twi-lek', 'species-rodian'];
  const baseOptions = { availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider };

  // `createFactionDraft()`/`updateFactionDraft()` (Phase 8D-1 foundation) always shallow-copy the `contacts` ARRAY itself (`[...contacts]`) even when no Contact changed -- exactly like `planet-bundle.js`'s own POI arrays -- so "preserved" is verified by per-element object identity, never by whole-array reference equality.
  function sameElements(a, b) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((entry, i) => entry === b[i]);
  }

  // Every generated Contact carries a unique draft:npc:... draftId.
  {
    const draft = await createProceduralFactionDraft({ rng: makeSeededRng(1), presetId: 'corporation', contactCount: 8, ...baseOptions });
    const ids = draft.contacts.map((c) => c.draftId);
    assert.equal(new Set(ids).size, ids.length, 'every generated Contact must carry a unique draftId');
    for (const id of ids) assert.ok(id.startsWith('draft:npc:'), `Contact draftId "${id}" must be domain-namespaced draft:npc:...`);
  }

  // CORRECTION (independent review): every generated Contact's factionDraftId must point back to the EXACT parent Faction draft's own draftId -- this is the pre-commit Faction<->Contact graph edge the schema addendum introduced factionDraftId/draftId specifically to support.
  {
    const draft = await createProceduralFactionDraft({ rng: makeSeededRng(2), presetId: 'noble-house', contactCount: 5, ...baseOptions });
    assert.ok(draft.draftId.startsWith('draft:faction:'), `Faction draftId "${draft.draftId}" must be domain-namespaced draft:faction:...`);
    for (const contact of draft.contacts) {
      assert.equal(contact.factionDraftId, draft.draftId, `Contact "${contact.name}"'s factionDraftId must equal the parent Faction draft's own draftId`);
    }
    // addFactionContact/regenerateFactionContacts/rerollFactionContact must ALL wire the same link, not just initial generation.
    const added = await addFactionContact(draft, { rng: makeSeededRng(3), ...baseOptions });
    assert.equal(added.contacts[added.contacts.length - 1].factionDraftId, draft.draftId, 'addFactionContact must set factionDraftId to the parent draft\'s draftId');
    const regenerated = await regenerateFactionContacts(draft, { rng: makeSeededRng(4), ...baseOptions });
    assert.ok(regenerated.contacts.every((c) => c.factionDraftId === draft.draftId), 'regenerateFactionContacts must set factionDraftId on every regenerated Contact');
    const rerolledOne = await rerollFactionContact(draft, draft.contacts[0].draftId, { rng: makeSeededRng(5), ...baseOptions });
    assert.equal(rerolledOne.contacts[0].factionDraftId, draft.draftId, 'rerollFactionContact must preserve factionDraftId on the rerolled Contact');
  }

  // CORRECTION (independent review round 2 -- "Location -> Faction -> Contact context"): a Faction's own generated Contacts must be reachable by the SAME locationContext technology/economy signal a directly-generated standalone NPC already receives -- createProceduralFactionDraft/regenerateFactionContacts/rerollFactionContact/addFactionContact must all forward it.
  {
    const HIGH_TECH = new Set(['expert', 'specialist']);
    const LOW_TECH = new Set(['unfamiliar', 'basic']);
    const N = 300;
    let advancedHigh = 0, frontierLow = 0;
    for (let seed = 0; seed < N; seed++) {
      const advancedDraft = await createProceduralFactionDraft({
        rng: makeSeededRng(seed), presetId: 'corporation', contactCount: 2,
        locationContext: { technologyLevel: 'cutting-edge', technologyAccess: 'ubiquitous' }, ...baseOptions
      });
      for (const c of advancedDraft.contacts) if (HIGH_TECH.has(c.technologyFamiliarity)) advancedHigh++;
      const frontierDraft = await createProceduralFactionDraft({
        rng: makeSeededRng(seed + 7000000), presetId: 'corporation', contactCount: 2,
        locationContext: { technologyLevel: 'primitive', technologyAccess: 'isolated' }, ...baseOptions
      });
      for (const c of frontierDraft.contacts) if (LOW_TECH.has(c.technologyFamiliarity)) frontierLow++;
    }
    assert.ok(advancedHigh / (N * 2) > 0.3, `Faction Contacts generated under a cutting-edge/ubiquitous locationContext must skew toward expert/specialist technologyFamiliarity (got ${advancedHigh}/${N * 2})`);
    assert.ok(frontierLow / (N * 2) > 0.6, `Faction Contacts generated under a primitive/isolated locationContext must skew toward unfamiliar/basic technologyFamiliarity (got ${frontierLow}/${N * 2})`);

    // regenerateFactionContacts / rerollFactionContact / addFactionContact all forward locationContext too (reachability, not just initial generation).
    const draft = await createProceduralFactionDraft({ rng: makeSeededRng(11), presetId: 'corporation', contactCount: 3, locationContext: { technologyLevel: 'cutting-edge', technologyAccess: 'ubiquitous' }, ...baseOptions });
    let anyHigh = 0;
    for (let seed = 0; seed < 200; seed++) {
      const regenerated = await regenerateFactionContacts(draft, { rng: makeSeededRng(seed + 12000000), locationContext: { technologyLevel: 'cutting-edge', technologyAccess: 'ubiquitous' }, ...baseOptions });
      if (regenerated.contacts.some((c) => HIGH_TECH.has(c.technologyFamiliarity))) anyHigh++;
      const added = await addFactionContact(draft, { rng: makeSeededRng(seed + 13000000), locationContext: { technologyLevel: 'cutting-edge', technologyAccess: 'ubiquitous' }, ...baseOptions });
      if (HIGH_TECH.has(added.contacts[added.contacts.length - 1].technologyFamiliarity)) anyHigh++;
      const rerolled = await rerollFactionContact(draft, draft.contacts[0].draftId, { rng: makeSeededRng(seed + 14000000), locationContext: { technologyLevel: 'cutting-edge', technologyAccess: 'ubiquitous' }, ...baseOptions });
      if (HIGH_TECH.has(rerolled.contacts[0].technologyFamiliarity)) anyHigh++;
    }
    assert.ok(anyHigh > 0, 'regenerateFactionContacts/addFactionContact/rerollFactionContact must all forward locationContext through to createGeneratedNpcConcept (at least SOME high-tech Contacts must appear under a cutting-edge locationContext)');
  }
  console.log('PHASE 8D-3B correction round 2 (Location -> Faction -> generated Contacts): locationContext now reaches every Faction Contact-generating operation, not just direct standalone NPC generation, passed.');

  // rerollFactionName changes ONLY the name (family/archetype/scale/contacts all untouched, contacts preserved by object identity).
  {
    const draft = await createProceduralFactionDraft({ rng: makeSeededRng(2), presetId: 'noble-house', ...baseOptions });
    const rerolled = rerollFactionName(draft, { rng: makeSeededRng(3) });
    assert.equal(rerolled.organizationFamily, draft.organizationFamily, 'rerollFactionName must preserve organizationFamily');
    assert.equal(rerolled.archetype, draft.archetype, 'rerollFactionName must preserve archetype');
    assert.equal(rerolled.scale, draft.scale, 'rerollFactionName must preserve scale');
    assert.ok(sameElements(rerolled.contacts, draft.contacts), 'rerollFactionName must preserve every Contact by object identity');
  }

  // rerollFactionArchetype changes archetype+family+name together, coherently (name's type noun always matches the NEW family's pool).
  {
    const draft = await createProceduralFactionDraft({ rng: makeSeededRng(4), archetype: 'corporation', ...baseOptions });
    const rerolled = rerollFactionArchetype(draft, { rng: makeSeededRng(5), preferTags: ['noble-house'] });
    const { FACTION_ARCHETYPE_FAMILY } = await import(abs('scripts/generation/organization-metadata.js'));
    assert.equal(FACTION_ARCHETYPE_FAMILY[rerolled.archetype], rerolled.organizationFamily, 'rerollFactionArchetype must keep organizationFamily consistent with the new archetype');
    assert.equal(rerolled.scale, draft.scale, 'rerollFactionArchetype must preserve scale');
    assert.ok(sameElements(rerolled.contacts, draft.contacts), 'rerollFactionArchetype must preserve every Contact by object identity');
  }

  // rerollFactionScale is the SCALE CLUSTER: scale, doctrine's scale-informed usage levels, and resourceProfile all update together; doctrine's rolled role lists are preserved (context-derived, not scale-derived).
  {
    const draft = await createProceduralFactionDraft({ rng: makeSeededRng(6), scale: 3, ...baseOptions });
    const rerolled = rerollFactionScale(draft, { rng: makeSeededRng(7), scale: 19 });
    assert.equal(rerolled.scale, 19, 'rerollFactionScale must apply the explicit scale override');
    assert.equal(rerolled.resourceProfile.scale, 19, 'rerollFactionScale must refresh resourceProfile against the NEW scale');
    assert.deepEqual(rerolled.doctrine.commonRoles, draft.doctrine.commonRoles, 'rerollFactionScale must preserve the doctrine\'s already-rolled role lists');
    assert.ok(sameElements(rerolled.contacts, draft.contacts), 'rerollFactionScale must preserve every Contact by object identity (a Contact roster resize is a SEPARATE, explicit operation)');
    assert.equal(factionDraftScaleLabel(rerolled), 'Intergalactic', 'factionDraftScaleLabel must reflect the new scale via organization-metadata.js\'s describeScale()');
  }

  // Single-field rerolls (goals/institutional character/leadership structure/internal problems/resource profile/relationships) each change ONLY their own field.
  {
    const draft = await createProceduralFactionDraft({ rng: makeSeededRng(8), presetId: 'research-organization', ...baseOptions });
    const goalsRerolled = rerollFactionGoals(draft, { rng: makeSeededRng(9) });
    assert.equal(goalsRerolled.institutionalCharacter, draft.institutionalCharacter, 'rerollFactionGoals must not touch institutionalCharacter');
    assert.ok(sameElements(goalsRerolled.contacts, draft.contacts), 'rerollFactionGoals must preserve every Contact by object identity');

    const icRerolled = rerollFactionInstitutionalCharacter(draft, { rng: makeSeededRng(10) });
    assert.equal(icRerolled.publicGoal, draft.publicGoal, 'rerollFactionInstitutionalCharacter must not touch publicGoal');

    const lsRerolled = rerollFactionLeadershipStructure(draft, { rng: makeSeededRng(11) });
    assert.equal(lsRerolled.institutionalCharacter, draft.institutionalCharacter, 'rerollFactionLeadershipStructure must not touch institutionalCharacter');

    const problemsRerolled = rerollFactionInternalProblems(draft, { rng: makeSeededRng(12) });
    assert.equal(problemsRerolled.leadershipStructure, draft.leadershipStructure, 'rerollFactionInternalProblems must not touch leadershipStructure');

    const resourceRerolled = rerollFactionResourceProfile(draft, { rng: makeSeededRng(13) });
    assert.equal(resourceRerolled.scale, draft.scale, 'rerollFactionResourceProfile must not touch scale');
    assert.deepEqual(resourceRerolled.internalProblems, draft.internalProblems, 'rerollFactionResourceProfile must preserve internalProblems');

    const relationshipsRerolled = rerollFactionRelationships(draft, { rng: makeSeededRng(14) });
    assert.deepEqual(relationshipsRerolled.relationships.allyFactionIds, draft.relationships.allyFactionIds, 'rerollFactionRelationships must preserve any CANONICAL relationship ids untouched');
  }

  // Contact-level operations: addFactionContact/removeFactionContact/rerollFactionContact/regenerateFactionContacts never silently destroy a sibling Contact -- verified by OBJECT IDENTITY, not merely count.
  {
    const draft = await createProceduralFactionDraft({ rng: makeSeededRng(15), contactCount: 4, ...baseOptions });

    const added = await addFactionContact(draft, { rng: makeSeededRng(16), ...baseOptions });
    assert.equal(added.contacts.length, draft.contacts.length + 1, 'addFactionContact must add exactly one Contact');
    for (let i = 0; i < draft.contacts.length; i++) assert.equal(added.contacts[i], draft.contacts[i], `addFactionContact must preserve existing sibling Contact at index ${i} by object identity`);

    const targetId = draft.contacts[2].draftId;
    const removed = removeFactionContact(draft, targetId);
    assert.equal(removed.contacts.length, draft.contacts.length - 1, 'removeFactionContact must remove exactly one Contact');
    assert.ok(!removed.contacts.some((c) => c.draftId === targetId), 'removeFactionContact must remove the targeted Contact');
    for (const c of draft.contacts.filter((c) => c.draftId !== targetId)) assert.ok(removed.contacts.includes(c), 'removeFactionContact must preserve every OTHER Contact by object identity');
    assert.equal(removeFactionContact(draft, 'draft:npc:does-not-exist'), draft, 'removeFactionContact must be a no-op (same object) for an unknown draftId');

    const rerolledOne = await rerollFactionContact(draft, draft.contacts[1].draftId, { rng: makeSeededRng(17), ...baseOptions });
    for (let i = 0; i < draft.contacts.length; i++) {
      if (i === 1) continue;
      assert.equal(rerolledOne.contacts[i], draft.contacts[i], `rerollFactionContact must preserve sibling Contact at index ${i} by object identity`);
    }
    assert.equal(rerolledOne.contacts[1].draftId, draft.contacts[1].draftId, 'rerollFactionContact must preserve the SAME draftId across a reroll (identity persists, facts change)');
    assert.equal(rerolledOne, await rerollFactionContact(rerolledOne, 'draft:npc:does-not-exist', { rng: makeSeededRng(18), ...baseOptions }), 'rerollFactionContact must be a no-op for an unknown draftId');

    const regenerated = await regenerateFactionContacts(draft, { rng: makeSeededRng(19), ...baseOptions });
    assert.equal(regenerated.contacts.length, draft.contacts.length, 'regenerateFactionContacts must default to the same contact count');
    assert.ok(regenerated.contacts.every((c, i) => c.draftId !== draft.contacts[i].draftId), 'regenerateFactionContacts must replace EVERY Contact (a wholly new draftId for each)');
  }

  // regenerateFactionDraft: a full regenerate preserves the EXISTING draft's presetId unless explicitly overridden.
  {
    const draft = await createProceduralFactionDraft({ rng: makeSeededRng(20), presetId: 'pirate-crew', ...baseOptions });
    const regenerated = await regenerateFactionDraft(draft, { rng: makeSeededRng(21), ...baseOptions });
    assert.equal(regenerated.provenance.presetId, 'pirate-crew', 'regenerateFactionDraft must preserve the prior presetId when none is explicitly supplied');
    const overridden = await regenerateFactionDraft(draft, { rng: makeSeededRng(22), presetId: 'noble-house', ...baseOptions });
    assert.equal(overridden.provenance.presetId, 'noble-house', 'regenerateFactionDraft must apply an explicit presetId override');
  }

  // Whole-draft seeded determinism: the SAME seed produces byte-for-byte identical generated facts across two independent runs (draftId/timestamps excluded, matching planet-bundle.js's own determinism-test convention).
  {
    // Recursively blanks every `generatedAt` timestamp (provenance stamps appear at multiple nesting levels -- the draft itself, each Contact, and each generated ally/enemy relationship concept) and strips each Contact's `draftId` (intentionally non-deterministic, minted fresh per generation) -- everything else must match exactly.
    function stripNonDeterministic(value) {
      if (Array.isArray(value)) return value.map(stripNonDeterministic);
      if (value && typeof value === 'object') {
        const out = {};
        for (const [key, v] of Object.entries(value)) {
          if (key === 'generatedAt') { out[key] = ''; continue; }
          // draftId/factionDraftId/locationDraftId are all minted fresh
          // per generation call (lib/draft-id.js) -- intentionally
          // non-deterministic identity, never a generated FACT.
          if (key === 'draftId' || key === 'factionDraftId' || key === 'locationDraftId') continue;
          out[key] = stripNonDeterministic(v);
        }
        return out;
      }
      return value;
    }
    const runA = await createProceduralFactionDraft({ rng: makeSeededRng(999), presetId: 'smuggler-network', ...baseOptions });
    const runB = await createProceduralFactionDraft({ rng: makeSeededRng(999), presetId: 'smuggler-network', ...baseOptions });
    assert.deepEqual(stripNonDeterministic(runA), stripNonDeterministic(runB), 'the SAME seed must produce byte-for-byte identical generated facts across two independent runs');

    const runC = await createProceduralFactionDraft({ rng: makeSeededRng(1000), presetId: 'smuggler-network', ...baseOptions });
    assert.notDeepEqual(stripNonDeterministic(runA), stripNonDeterministic(runC), 'sanity check: a DIFFERENT seed must produce a different result, guarding against a vacuously-passing determinism comparison');
  }

  console.log('PHASE 8D-3B bundle generation (unique addressable Contact draftIds, name/archetype/scale-cluster/single-field rerolls, sibling-preserving Contact add/remove/reroll-one/regenerate-all verified by object identity, full-regenerate presetId stickiness, whole-draft seeded determinism) passed.');
}

// ------------------------------------------------------------
// NPC flavor notes (organic/droid catalogs, structural pool separation, conflict handling, context/role weighting, targeted rerolls)
// ------------------------------------------------------------
{
  const { ORGANIC_NPC_FLAVOR_QUALITIES } = await import(abs('scripts/generation/data/npc-flavor-qualities-organic.js'));
  const { DROID_NPC_FLAVOR_QUALITIES } = await import(abs('scripts/generation/data/npc-flavor-qualities-droid.js'));
  const {
    selectNpcFlavorQualities, generateNpcFlavorNotes, rerollNpcFlavorNotes, rerollNpcFlavorNote, rollFlavorNoteCount
  } = await import(abs('scripts/generation/npc/npc-flavor.js'));
  const { createGeneratedNpcConcept } = await import(abs('scripts/generation/npc/npc-bundle.js'));

  // 1/2. Organic and droid quality ids are each unique; entries carry non-empty display text.
  for (const [name, pool] of [['ORGANIC_NPC_FLAVOR_QUALITIES', ORGANIC_NPC_FLAVOR_QUALITIES], ['DROID_NPC_FLAVOR_QUALITIES', DROID_NPC_FLAVOR_QUALITIES]]) {
    const ids = pool.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, `${name} ids must be unique`);
    for (const entry of pool) {
      assert.ok(entry.text && entry.text.trim().length > 0, `${name} entry "${entry.id}" must carry non-empty display text`);
      assert.ok(entry.id.startsWith(name.startsWith('ORGANIC') ? 'organic.' : 'droid.'), `${name} entry "${entry.id}" must carry its pool's namespace prefix`);
    }
  }
  assert.ok(ORGANIC_NPC_FLAVOR_QUALITIES.length >= 100, `ORGANIC_NPC_FLAVOR_QUALITIES must be a substantial representative catalog (100+), got ${ORGANIC_NPC_FLAVOR_QUALITIES.length}`);
  assert.ok(DROID_NPC_FLAVOR_QUALITIES.length >= 75, `DROID_NPC_FLAVOR_QUALITIES must be a substantial representative catalog (75+), got ${DROID_NPC_FLAVOR_QUALITIES.length}`);

  // 3. No namespace collision between the two pools if a resolver ever addresses both by id.
  const organicIds = new Set(ORGANIC_NPC_FLAVOR_QUALITIES.map((e) => e.id));
  const droidIds = new Set(DROID_NPC_FLAVOR_QUALITIES.map((e) => e.id));
  const collisions = [...organicIds].filter((id) => droidIds.has(id));
  assert.deepEqual(collisions, [], 'organic and droid flavor-quality ids must never collide with each other');

  // 4/5. Structural pool separation: selecting for kind:'living' returns ONLY organic.* ids across many draws; kind:'droid' returns ONLY droid.* ids. Never merely "usually" -- ALWAYS, checked over a large sample.
  for (let seed = 0; seed < 300; seed++) {
    const organicPick = selectNpcFlavorQualities({ kind: 'living', count: 3, rng: makeSeededRng(seed) });
    assert.ok(organicPick.every((q) => q.id.startsWith('organic.')), `seed ${seed}: a 'living' selection must NEVER include a droid.* quality`);
    const droidPick = selectNpcFlavorQualities({ kind: 'droid', count: 3, rng: makeSeededRng(seed + 1000000) });
    assert.ok(droidPick.every((q) => q.id.startsWith('droid.')), `seed ${seed}: a 'droid' selection must NEVER include an organic.* quality`);
  }
  // An unrecognized kind resolves to an EMPTY pool (fails safe, never falls back to either real catalog).
  assert.deepEqual(selectNpcFlavorQualities({ kind: 'not-a-real-kind', count: 3, rng: makeSeededRng(0) }), [], 'an unrecognized kind must select from no pool at all, never fall back to organic or droid');

  // 6. No duplicate quality is ever selected within one NPC (across many seeds and count values).
  for (let seed = 0; seed < 500; seed++) {
    const picks = selectNpcFlavorQualities({ kind: 'living', count: 3, rng: makeSeededRng(seed) });
    assert.equal(new Set(picks.map((p) => p.id)).size, picks.length, `seed ${seed}: no duplicate quality may be selected on one NPC`);
  }

  // 7. Declared conflict metadata is honored: 'organic.intense-eye-contact' and 'organic.avoids-eye-contact' (explicit conflictTags pair) never co-occur, verified over many seeds with count forced high enough that both WOULD often collide absent the guard.
  {
    let coOccurrence = 0;
    const N = 2000;
    for (let seed = 0; seed < N; seed++) {
      const picks = selectNpcFlavorQualities({ kind: 'living', count: 3, preferTags: ['social'], rng: makeSeededRng(seed) });
      const ids = new Set(picks.map((p) => p.id));
      if (ids.has('organic.intense-eye-contact') && ids.has('organic.avoids-eye-contact')) coOccurrence++;
    }
    assert.equal(coOccurrence, 0, `declared-conflicting qualities (intense-eye-contact / avoids-eye-contact) must NEVER co-occur on the same NPC (saw ${coOccurrence}/${N})`);
  }

  // 8. Context weighting has a measurable effect (organic pool): mining/industrial context tags must raise mining-flavored quality selection over an unbiased roll.
  {
    const miningIds = new Set(['organic.smells-like-motor-oil', 'organic.dust-covered-clothing', 'organic.hearing-protection-around-neck']);
    let withContext = 0, baseline = 0;
    const N = 1500;
    for (let seed = 0; seed < N; seed++) {
      const picks = selectNpcFlavorQualities({ kind: 'living', count: 3, contextTags: ['mining', 'industrial'], rng: makeSeededRng(seed) });
      if (picks.some((p) => miningIds.has(p.id))) withContext++;
      const base = selectNpcFlavorQualities({ kind: 'living', count: 3, rng: makeSeededRng(seed + 5000000) });
      if (base.some((p) => miningIds.has(p.id))) baseline++;
    }
    assert.ok(withContext > baseline * 1.5, `mining/industrial contextTags must meaningfully raise mining-flavored quality selection (got ${withContext}/${N} vs baseline ${baseline}/${N})`);
  }

  // 9. Role weighting has a measurable effect (organic pool): a 'mechanic' roleTag must raise mechanic-flavored quality selection.
  {
    const mechanicIds = new Set(['organic.names-their-tools', 'organic.spare-parts-in-pockets', 'organic.battered-hydrospanner']);
    let withRole = 0, baseline = 0;
    const N = 1500;
    for (let seed = 0; seed < N; seed++) {
      const picks = selectNpcFlavorQualities({ kind: 'living', count: 3, roleTags: ['mechanic'], rng: makeSeededRng(seed) });
      if (picks.some((p) => mechanicIds.has(p.id))) withRole++;
      const base = selectNpcFlavorQualities({ kind: 'living', count: 3, rng: makeSeededRng(seed + 6000000) });
      if (base.some((p) => mechanicIds.has(p.id))) baseline++;
    }
    assert.ok(withRole > baseline * 1.5, `a 'mechanic' roleTag must meaningfully raise mechanic-flavored quality selection (got ${withRole}/${N} vs baseline ${baseline}/${N})`);
  }

  // 8'/9' (droid pool): context and role weighting also have a measurable effect on the SEPARATE droid catalog.
  {
    const frontierIds = new Set(['droid.servo-squeaks-left', 'droid.mismatched-panel', 'droid.faded-paint', 'droid.obsolete-replacement-parts', 'droid.jury-rigged-tool-mount', 'droid.salvaged-part-visible']);
    let withContext = 0, baseline = 0;
    const N = 1500;
    for (let seed = 0; seed < N; seed++) {
      const picks = selectNpcFlavorQualities({ kind: 'droid', count: 3, contextTags: ['frontier'], rng: makeSeededRng(seed) });
      if (picks.some((p) => frontierIds.has(p.id))) withContext++;
      const base = selectNpcFlavorQualities({ kind: 'droid', count: 3, rng: makeSeededRng(seed + 7000000) });
      if (base.some((p) => frontierIds.has(p.id))) baseline++;
    }
    assert.ok(withContext > baseline * 1.3, `'frontier' contextTags must meaningfully raise frontier-flavored droid quality selection (got ${withContext}/${N} vs baseline ${baseline}/${N})`);

    const protocolIds = new Set(['droid.corrects-organic-arithmetic', 'droid.overly-formal-diction', 'droid.uses-full-legal-names', 'droid.excessive-etiquette', 'droid.overly-polite-to-hostiles', 'droid.social-awkwardness', 'droid.verbose-explanations']);
    let withRole = 0, roleBaseline = 0;
    for (let seed = 0; seed < N; seed++) {
      const picks = selectNpcFlavorQualities({ kind: 'droid', count: 3, roleTags: ['protocol'], rng: makeSeededRng(seed) });
      if (picks.some((p) => protocolIds.has(p.id))) withRole++;
      const base = selectNpcFlavorQualities({ kind: 'droid', count: 3, rng: makeSeededRng(seed + 8000000) });
      if (base.some((p) => protocolIds.has(p.id))) roleBaseline++;
    }
    assert.ok(withRole > roleBaseline * 1.5, `a 'protocol' roleTag must meaningfully raise protocol-flavored droid quality selection (got ${withRole}/${N} vs ${roleBaseline}/${N})`);
  }

  // 10. Both pools are fully deterministic under an injected seeded RNG: the SAME seed produces the SAME picks, twice.
  for (const kind of ['living', 'droid']) {
    const a = selectNpcFlavorQualities({ kind, count: 3, rng: makeSeededRng(4242) }).map((e) => e.id);
    const b = selectNpcFlavorQualities({ kind, count: 3, rng: makeSeededRng(4242) }).map((e) => e.id);
    assert.deepEqual(a, b, `${kind} flavor selection must be deterministic under the same injected seed`);
  }

  // Default note-count distribution: 0-3 only, all four values reachable, roughly matching the documented weights (0/10%, 1/45%, 2/35%, 3/10%) within a generous tolerance.
  {
    const counts = { 0: 0, 1: 0, 2: 0, 3: 0 };
    const N = 4000;
    for (let seed = 0; seed < N; seed++) counts[rollFlavorNoteCount({ rng: makeSeededRng(seed) })]++;
    assert.ok(Object.values(counts).every((c) => c > 0), `all 4 note-count values (0-3) must be reachable, got ${JSON.stringify(counts)}`);
    assert.ok(counts[1] > counts[0] && counts[1] > counts[3], `count 1 (45%) must be meaningfully more common than count 0 (10%) or count 3 (10%), got ${JSON.stringify(counts)}`);
  }

  // Full NPC generation attaches flavorNotes of the CORRECT kind, and every note is well-formed {qualityId, text}.
  for (let seed = 0; seed < 100; seed++) {
    const npc = await createGeneratedNpcConcept({ rng: makeSeededRng(seed), availableSpeciesIds: ['species-human'], nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    assert.ok(Array.isArray(npc.flavorNotes), `seed ${seed}: a generated NPC must carry a flavorNotes array`);
    const expectedPrefix = npc.kind === 'droid' ? 'droid.' : 'organic.';
    for (const note of npc.flavorNotes) {
      assert.ok(note.qualityId.startsWith(expectedPrefix), `seed ${seed}: a ${npc.kind} NPC's flavorNotes must all carry ${expectedPrefix}* ids`);
      assert.ok(note.text.length > 0, `seed ${seed}: every flavor note must carry non-empty text`);
    }
  }

  // 8''/9''/13. rerollNpcFlavorNotes() (whole set) preserves every other field, including kind (so a reroll can never accidentally cross pools).
  {
    const npc = await createGeneratedNpcConcept({ rng: makeSeededRng(77), availableSpeciesIds: ['species-human'], nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    const rerolled = rerollNpcFlavorNotes(npc, { rng: makeSeededRng(78) });
    assert.equal(rerolled.name, npc.name, 'rerollNpcFlavorNotes must preserve name');
    assert.equal(rerolled.kind, npc.kind, 'rerollNpcFlavorNotes must preserve kind');
    assert.equal(rerolled.speciesId, npc.speciesId, 'rerollNpcFlavorNotes must preserve speciesId');
    assert.equal(rerolled.role, npc.role, 'rerollNpcFlavorNotes must preserve role');
    assert.equal(rerolled.factionId, npc.factionId, 'rerollNpcFlavorNotes must preserve factionId');
    assert.equal(rerolled.agenda, npc.agenda, 'rerollNpcFlavorNotes must preserve agenda');
    assert.equal(rerolled.secret, npc.secret, 'rerollNpcFlavorNotes must preserve secret');
    const expectedPrefix = npc.kind === 'droid' ? 'droid.' : 'organic.';
    assert.ok(rerolled.flavorNotes.every((n) => n.qualityId.startsWith(expectedPrefix)), 'rerollNpcFlavorNotes must never cross pools -- a reroll stays within the NPC\'s own kind');
  }

  // rerollNpcFlavorNote() (single note, by qualityId) preserves every other note and every other field; the droid case specifically proves a droid reroll cannot cross into the organic pool.
  {
    let droidNpc = null;
    for (let seed = 0; seed < 50 && !droidNpc; seed++) {
      const candidate = await createGeneratedNpcConcept({ rng: makeSeededRng(seed), droidPrevalence: 'automated', availableSpeciesIds: ['species-human'], nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      if (candidate.kind === 'droid' && candidate.flavorNotes.length) droidNpc = candidate;
    }
    assert.ok(droidNpc, 'test setup: must find a droid NPC with at least one flavor note within 50 seeds');
    const targetId = droidNpc.flavorNotes[0].qualityId;
    const otherNotes = droidNpc.flavorNotes.slice(1);
    const rerolled = rerollNpcFlavorNote(droidNpc, targetId, { rng: makeSeededRng(999) });
    assert.deepEqual(rerolled.flavorNotes.slice(1), otherNotes, 'rerollNpcFlavorNote must preserve every OTHER note untouched');
    assert.ok(rerolled.flavorNotes[0].qualityId.startsWith('droid.'), 'a droid Contact\'s single-note reroll must draw ONLY from the droid pool, never organic');
    assert.equal(rerolled.name, droidNpc.name, 'rerollNpcFlavorNote must preserve name');
    assert.equal(rerolled.role, droidNpc.role, 'rerollNpcFlavorNote must preserve role');
    assert.equal(rerolled.agenda, droidNpc.agenda, 'rerollNpcFlavorNote must preserve agenda');
    // A no-op for an unknown qualityId.
    assert.equal(rerollNpcFlavorNote(droidNpc, 'droid.does-not-exist', { rng: makeSeededRng(1) }), droidNpc, 'rerollNpcFlavorNote must be a no-op for an unknown target qualityId');
  }

  // Anatomy gate: an organic-only physical quality tagged requiresTags:['organic-hands'] is excluded entirely when traitTags declares none.
  {
    const withoutHands = selectNpcFlavorQualities({ kind: 'living', count: 100, traitTags: [], rng: makeSeededRng(1) });
    assert.ok(!withoutHands.some((q) => (q.requiresTags ?? []).includes('organic-hands')), 'an explicit traitTags:[] (no organic hands declared) must exclude every requiresTags:["organic-hands"] quality');
  }

  console.log('PHASE 8D-3B NPC flavor notes (structurally separate organic/droid catalogs, zero cross-pool selection ever, conflict-tag exclusion, context/role weighting on BOTH pools, deterministic seeded selection, targeted whole-set/single-note rerolls preserving every unrelated field) passed.');
}

// ------------------------------------------------------------
// Complete NPC concept schema addendum: competence level, unified
// hand-created/generated schema, new characterization/context fields,
// kind-dispatch fixes (mannerism/appearance), reuse-mapping
// (specialistRole/describeFactionRankBand/provenance.warnings), public
// description, targeted rerolls.
// ------------------------------------------------------------
{
  const {
    NPC_COMPETENCE_LEVEL, NPC_COMPETENCE_CREW_QUALITY_EQUIVALENT, isNpcCompetenceLevel,
    rollNpcCompetence, rerollNpcCompetence, COMPETENCE_CONTEXT_WEIGHTS
  } = await import(abs('scripts/generation/npc/npc-competence.js'));
  const { describeFactionRankBand, FACTION_RANK_BAND, COMMAND_TIER } = await import(abs('scripts/generation/rank-metadata.js'));
  const { composeNpcPublicDescription } = await import(abs('scripts/generation/lib/description-composer.js'));
  const { createGeneratedNpcConcept } = await import(abs('scripts/generation/npc/npc-bundle.js'));
  const { createProceduralFactionDraft } = await import(abs('scripts/generation/factions/faction-bundle.js'));
  const {
    rerollNpcVoice, rerollNpcSpeechStyle, rerollNpcMannerism, rerollNpcAppearanceCues, rerollNpcDesire, rerollNpcFear,
    rerollNpcLoyalty, rerollNpcComplication, rerollNpcRelationshipHooks, rerollNpcPersonalityTraits,
    rerollNpcTemperament, rerollNpcSocialStyle, rerollNpcFactionRole, pickNpcAppearanceForKind, pickNpcMannerismForKind
  } = await import(abs('scripts/generation/npc/npc-characterization.js'));
  const { rerollNpcOccupation, pickNpcOccupation } = await import(abs('scripts/generation/npc/npc-occupation.js'));
  const { hasForbiddenMechanicalFields } = await import(abs('scripts/generation/npc-concept.js'));
  const { NPC_OCCUPATIONS } = await import(abs('scripts/generation/data/npc-occupations.js'));
  const { NPC_ROLES } = await import(abs('scripts/generation/data/npc-roles.js'));
  const { NPC_RELATIONSHIP_HOOK_TEMPLATES, isRelationshipHookType } = await import(abs('scripts/generation/data/npc-relationship-hooks.js'));
  const { DROID_NPC_FLAVOR_QUALITIES } = await import(abs('scripts/generation/data/npc-flavor-qualities-droid.js'));

  const availableSpeciesIds = ['species-human', 'species-twi-lek'];

  // §53.1/§53.2 -- all five competence values are reachable; the enum has exactly 5 unique values.
  {
    const seen = new Set();
    for (let i = 0; i < 500; i++) seen.add(rollNpcCompetence({ rng: makeSeededRng(i), preset: 'ordinaryCivilian' }));
    for (let i = 0; i < 500; i++) seen.add(rollNpcCompetence({ rng: makeSeededRng(i + 1000000), preset: 'specializedProfessional' }));
    for (let i = 0; i < 500; i++) seen.add(rollNpcCompetence({ rng: makeSeededRng(i + 2000000), preset: 'seniorFactionSpecialist' }));
    assert.equal(seen.size, 5, `all 5 NPC_COMPETENCE_LEVEL values must be reachable across presets, saw: ${[...seen].join(', ')}`);
    assert.equal(new Set(Object.values(NPC_COMPETENCE_LEVEL)).size, 5, 'NPC_COMPETENCE_LEVEL must have exactly 5 unique values');
  }

  // §53.9 -- exact Crew Quality equivalence mapping.
  assert.deepEqual(NPC_COMPETENCE_CREW_QUALITY_EQUIVALENT, {
    untrained: 'Untrained', capable: 'Normal', skilled: 'Skilled', expert: 'Expert', elite: 'Ace'
  }, 'NPC_COMPETENCE_CREW_QUALITY_EQUIVALENT must map exactly onto SWSE Crew Quality (untrained/capable/skilled/expert/elite -> Untrained/Normal/Skilled/Expert/Ace)');

  // §53.3/§53.5 -- default (ordinaryCivilian) context favors capable/skilled over elite, and elite stays rare.
  {
    const N = 3000;
    const counts = { untrained: 0, capable: 0, skilled: 0, expert: 0, elite: 0 };
    for (let i = 0; i < N; i++) counts[rollNpcCompetence({ rng: makeSeededRng(i), preset: 'ordinaryCivilian' })]++;
    assert.ok(counts.capable + counts.skilled > counts.untrained + counts.expert + counts.elite, `ordinary-civilian context must favor capable/skilled overall, got ${JSON.stringify(counts)}`);
    assert.ok(counts.elite / N < 0.05, `elite must stay rare (<5%) under ordinary-civilian context, got ${(counts.elite / N * 100).toFixed(1)}%`);
  }

  // §53.4 -- specialized-professional context measurably raises Skilled/Expert/Elite over ordinary-civilian.
  {
    const N = 2000;
    let proTier = 0, civTier = 0;
    const HIGH_TIERS = new Set([NPC_COMPETENCE_LEVEL.SKILLED, NPC_COMPETENCE_LEVEL.EXPERT, NPC_COMPETENCE_LEVEL.ELITE]);
    for (let i = 0; i < N; i++) {
      if (HIGH_TIERS.has(rollNpcCompetence({ rng: makeSeededRng(i), preset: 'specializedProfessional' }))) proTier++;
      if (HIGH_TIERS.has(rollNpcCompetence({ rng: makeSeededRng(i + 3000000), preset: 'ordinaryCivilian' }))) civTier++;
    }
    assert.ok(proTier > civTier * 1.2, `specializedProfessional context must meaningfully raise Skilled+/Expert+/Elite rate over ordinaryCivilian (got ${proTier}/${N} vs ${civTier}/${N})`);
  }

  // §53.6 -- Faction Scale never deterministically sets competence: two Faction drafts differing ONLY in scale must show statistically similar competence distributions among their contacts (rollNpcCompetence itself takes no scale parameter at all -- verified structurally by the function signature already; this proves it empirically end-to-end too).
  {
    const eliteOrExpert = new Set([NPC_COMPETENCE_LEVEL.EXPERT, NPC_COMPETENCE_LEVEL.ELITE]);
    let smallScaleHigh = 0, smallScaleTotal = 0, hugeScaleHigh = 0, hugeScaleTotal = 0;
    for (let seed = 0; seed < 150; seed++) {
      const small = await createProceduralFactionDraft({ rng: makeSeededRng(seed), archetype: 'government', scale: 2, contactCount: 4, availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      for (const c of small.contacts) { smallScaleTotal++; if (eliteOrExpert.has(c.competenceLevel)) smallScaleHigh++; }
      const huge = await createProceduralFactionDraft({ rng: makeSeededRng(seed + 8000000), archetype: 'government', scale: 19, contactCount: 4, availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      for (const c of huge.contacts) { hugeScaleTotal++; if (eliteOrExpert.has(c.competenceLevel)) hugeScaleHigh++; }
    }
    const smallRate = smallScaleHigh / smallScaleTotal;
    const hugeRate = hugeScaleHigh / hugeScaleTotal;
    assert.ok(Math.abs(smallRate - hugeRate) < 0.15, `Faction Scale must NOT deterministically drive competence -- a Scale-2 and a Scale-19 government's generated contacts must show similar Expert+/Elite rates (got ${(smallRate * 100).toFixed(1)}% vs ${(hugeRate * 100).toFixed(1)}%), not "every member = Elite" at high Scale`);
  }

  // §53.7 -- rerollNpcCompetence preserves every unrelated field.
  {
    const npc = await createGeneratedNpcConcept({ rng: makeSeededRng(50), availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    const rerolled = rerollNpcCompetence(npc, { rng: makeSeededRng(51) });
    assert.equal(rerolled.name, npc.name, 'rerollNpcCompetence must preserve name');
    assert.equal(rerolled.role, npc.role, 'rerollNpcCompetence must preserve role');
    assert.equal(rerolled.draftId, npc.draftId, 'rerollNpcCompetence must preserve draftId');
    assert.equal(rerolled.secret, npc.secret, 'rerollNpcCompetence must preserve secret');
    assert.equal(isNpcCompetenceLevel(rerolled.competenceLevel), true, 'rerollNpcCompetence must produce a valid NPC_COMPETENCE_LEVEL value');
  }

  // §53.8 -- competence produces no mechanical Actor statistics anywhere on the draft.
  {
    const npc = await createGeneratedNpcConcept({ rng: makeSeededRng(60), availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    assert.equal(hasForbiddenMechanicalFields(npc), false, 'a competence-bearing NPC concept must carry no forbidden mechanical field');
    assert.equal('level' in npc, false, 'competenceLevel must never introduce a "level" field');
    assert.equal('bab' in npc, false, 'competenceLevel must never introduce a "bab" field');
  }

  console.log('PHASE 8D-3B NPC competence level (all 5 values reachable, exact SWSE Crew Quality mapping, ordinary/specialist/Faction-Scale-independent context weighting, elite rarity, targeted reroll, no mechanical fields) passed.');

  // --- reuse-mapping validation -----------------------------------------
  {
    // describeFactionRankBand() is a DERIVED view over the EXISTING commandTier, never a second stored field -- npc-concept.js has no `factionRank` field at all.
    const npc = await createGeneratedNpcConcept({ rng: makeSeededRng(70), availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider, commandTier: COMMAND_TIER.STRATEGIC_COMMAND });
    assert.equal('factionRank' in npc, false, 'npc-concept.js must NOT carry a separate factionRank field -- describeFactionRankBand(commandTier) is the derived view');
    assert.equal(describeFactionRankBand(npc.commandTier), FACTION_RANK_BAND.COMMAND, 'describeFactionRankBand() must derive the broad band directly from commandTier');
    assert.equal(describeFactionRankBand(COMMAND_TIER.NONE), FACTION_RANK_BAND.OUTSIDER, 'describeFactionRankBand(NONE) must be "outsider"');
    assert.equal(new Set(Object.values(FACTION_RANK_BAND)).size, 7, 'FACTION_RANK_BAND must have exactly the 7 broad bands the phase spec named');

    // specialistRole is the reused "factionRole" slot -- no separate field exists.
    assert.equal('factionRole' in npc, false, 'npc-concept.js must NOT carry a separate factionRole field -- specialistRole is reused for this');

    // diagnostics live in provenance.warnings -- no separate `diagnostics` array field.
    assert.equal('diagnostics' in npc, false, 'npc-concept.js must NOT carry a separate diagnostics field -- provenance.warnings is the existing, reused mechanism');
    assert.ok(Array.isArray(npc.provenance.warnings), 'provenance.warnings must exist as the NPC diagnostics home');

    // suggestedNarrativeFunction is NOT a separate field from narrativeFunction (dedup decision).
    assert.equal('suggestedNarrativeFunction' in npc, false, 'npc-concept.js must NOT carry a redundant suggestedNarrativeFunction field distinct from narrativeFunction');
  }
  console.log('PHASE 8D-3B reuse-mapping validation (no duplicate factionRank/factionRole/diagnostics/suggestedNarrativeFunction fields -- each maps onto an existing authority) passed.');

  // --- kind-dispatch fixes (mannerism, appearance, voice, speechStyle never cross organic/droid pools) ---
  {
    const organicMannerismIds = new Set((await import(abs('scripts/generation/data/npc-mannerisms.js'))).NPC_MANNERISMS.map((e) => e.value));
    const droidMannerismIds = new Set((await import(abs('scripts/generation/data/npc-mannerisms-droid.js'))).NPC_DROID_MANNERISMS.map((e) => e.value));
    const droidAppearanceTexts = new Set(DROID_NPC_FLAVOR_QUALITIES.filter((e) => ['chassis', 'paint', 'replacement-parts', 'photoreceptor'].includes(e.category)).map((e) => e.text));
    let droidSamples = 0, livingSamples = 0;
    for (let seed = 0; seed < 400 && (droidSamples < 40 || livingSamples < 40); seed++) {
      const npc = await createGeneratedNpcConcept({ rng: makeSeededRng(seed), droidPrevalence: 'normal', availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      if (npc.kind === 'droid' && droidSamples < 40) {
        droidSamples++;
        assert.ok(!organicMannerismIds.has(npc.mannerisms), `seed ${seed}: a droid NPC's mannerisms must NEVER come from the organic-only pool (got "${npc.mannerisms}")`);
        if (npc.mannerisms) assert.ok(droidMannerismIds.has(npc.mannerisms), `seed ${seed}: a droid NPC's mannerisms must come from the droid pool`);
        if (npc.appearanceCues.length) assert.ok(droidAppearanceTexts.has(npc.appearanceCues[0]), `seed ${seed}: a droid NPC's appearanceCues must come from the droid visual-flavor subset, never the organic pool`);
      }
      if (npc.kind === 'living' && livingSamples < 40) {
        livingSamples++;
        assert.ok(!droidMannerismIds.has(npc.mannerisms) || npc.mannerisms === '', `seed ${seed}: a living NPC's mannerisms must never come from the droid-only pool`);
      }
    }
    assert.ok(droidSamples >= 10 && livingSamples >= 10, `test needs enough samples of both kinds within 400 seeds (got ${droidSamples} droid, ${livingSamples} living)`);
  }
  console.log('PHASE 8D-3B kind-dispatch fixes (mannerism and appearanceCues now correctly kind-locked -- no organic content on droids or vice versa) passed.');

  // --- table validation (§54) --------------------------------------------
  {
    // Every NPC_OCCUPATIONS.roleTag must reference a REAL NPC_ROLES value -- catches drift between the two catalogs.
    const roleValues = new Set(NPC_ROLES.map((e) => e.value));
    for (const occEntry of NPC_OCCUPATIONS) {
      assert.ok(roleValues.has(occEntry.roleTag), `NPC_OCCUPATIONS entry "${occEntry.value}"'s roleTag "${occEntry.roleTag}" must reference a real NPC_ROLES value`);
    }
    // Every relationship-hook template's type must be a real RELATIONSHIP_HOOK_TYPE value.
    for (const template of NPC_RELATIONSHIP_HOOK_TEMPLATES) {
      assert.equal(isRelationshipHookType(template.type), true, `relationship-hook template "${template.text}" must carry a valid type, got "${template.type}"`);
    }
  }
  console.log('PHASE 8D-3B table validation (NPC_OCCUPATIONS.roleTag references real NPC_ROLES values, every relationship-hook type is valid) passed.');

  // --- weighting (§55, representative subset) -----------------------------
  {
    // occupation: role-filtered pick only ever returns an occupation tagged for that role, when matches exist.
    for (let seed = 0; seed < 200; seed++) {
      const entry = pickNpcOccupation({ rng: makeSeededRng(seed), roleValue: 'mechanic' });
      assert.equal(entry.roleTag, 'mechanic', `seed ${seed}: pickNpcOccupation({roleValue:'mechanic'}) must always return a mechanic-tagged occupation when matches exist`);
    }

    // technologyFamiliarity: positive contextBias measurably raises "expert"/"specialist" over the neutral default.
    const { pickNpcTechnologyFamiliarity } = await import(abs('scripts/generation/npc/npc-characterization.js'));
    const HIGH_TECH = new Set(['expert', 'specialist']);
    let highBiasCount = 0, neutralCount = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) {
      if (HIGH_TECH.has(pickNpcTechnologyFamiliarity({ rng: makeSeededRng(i), contextBias: 2 }))) highBiasCount++;
      if (HIGH_TECH.has(pickNpcTechnologyFamiliarity({ rng: makeSeededRng(i + 9000000), contextBias: 0 }))) neutralCount++;
    }
    assert.ok(highBiasCount > neutralCount * 1.5, `contextBias:2 must meaningfully raise expert/specialist technologyFamiliarity over the neutral default (got ${highBiasCount}/${N} vs ${neutralCount}/${N})`);
  }
  console.log('PHASE 8D-3B weighting (representative subset: role-filtered occupation always matches, technology-familiarity context bias has measurable effect) passed.');

  // --- CORRECTION (independent review): locationContext reaches technologyFamiliarity/lifestyle end-to-end ---
  {
    const { resolveLocationContextBias } = await import(abs('scripts/generation/npc/npc-bundle.js'));
    assert.deepEqual(resolveLocationContextBias(null), { technologyBias: null, lifestyleBias: null }, 'resolveLocationContextBias(null) must signal "no Location context" distinctly from a neutral bias');
    assert.deepEqual(resolveLocationContextBias({}), { technologyBias: null, lifestyleBias: null }, 'an empty locationContext must also resolve to null (nothing relevant supplied), not a false neutral 0');

    const HIGH_TECH = new Set(['expert', 'specialist']);
    const LOW_TECH = new Set(['unfamiliar', 'basic']);
    const WEALTHY_LIFESTYLE = new Set(['affluent', 'wealthy', 'elite']);
    const N = 1500;
    let advancedHigh = 0, frontierLow = 0, wealthyLifestyle = 0, modestLifestyle = 0;
    for (let seed = 0; seed < N; seed++) {
      const advanced = await createGeneratedNpcConcept({ rng: makeSeededRng(seed), availableSpeciesIds, locationContext: { technologyLevel: 'cutting-edge', technologyAccess: 'ubiquitous' }, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      if (HIGH_TECH.has(advanced.technologyFamiliarity)) advancedHigh++;
      const frontier = await createGeneratedNpcConcept({ rng: makeSeededRng(seed + 4000000), availableSpeciesIds, locationContext: { technologyLevel: 'primitive', technologyAccess: 'isolated' }, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      if (LOW_TECH.has(frontier.technologyFamiliarity)) frontierLow++;
      const wealthy = await createGeneratedNpcConcept({ rng: makeSeededRng(seed + 5000000), availableSpeciesIds, locationContext: { economyTags: ['financial-services', 'trade'] }, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      if (WEALTHY_LIFESTYLE.has(wealthy.lifestyle)) wealthyLifestyle++;
      const modest = await createGeneratedNpcConcept({ rng: makeSeededRng(seed + 6000000), availableSpeciesIds, locationContext: { economyTags: ['mining', 'frontier'] }, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      if (WEALTHY_LIFESTYLE.has(modest.lifestyle)) modestLifestyle++;
    }
    assert.ok(advancedHigh / N > 0.4, `a cutting-edge/ubiquitous locationContext must produce mostly expert/specialist technologyFamiliarity (got ${advancedHigh}/${N})`);
    assert.ok(frontierLow / N > 0.7, `a primitive/isolated locationContext must produce mostly unfamiliar/basic technologyFamiliarity (got ${frontierLow}/${N})`);
    assert.ok(wealthyLifestyle > modestLifestyle * 5, `financial-services/trade economyTags must produce measurably more affluent+ lifestyle than mining/frontier economyTags (got ${wealthyLifestyle}/${N} vs ${modestLifestyle}/${N})`);

    // locationContext's tags also flow into the general preferTags mechanism (occupation weighting proof, mirroring the existing mining-context test elsewhere).
    const miningIds = new Set(['mineral surveyor', 'drilling rig operator', 'ore refinery operator', 'mining foreman']);
    let miningOccupations = 0;
    for (let seed = 0; seed < 400; seed++) {
      const npc = await createGeneratedNpcConcept({ rng: makeSeededRng(seed), availableSpeciesIds, locationContext: { economyTags: ['mining', 'industrial'] }, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      if (miningIds.has(npc.occupation)) miningOccupations++;
    }
    assert.ok(miningOccupations > 0, 'locationContext.economyTags must reach the occupation pick via the shared preferTags mechanism (a mining-tagged locationContext must be able to produce a mining-flavored occupation)');

    // Absent locationContext, generation still works exactly as before (backward compatible).
    const noContext = await createGeneratedNpcConcept({ rng: makeSeededRng(1), availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    assert.ok(noContext.technologyFamiliarity && noContext.lifestyle, 'omitting locationContext entirely must still produce valid technologyFamiliarity/lifestyle values');
  }
  console.log('PHASE 8D-3B locationContext wiring (technologyFamiliarity/lifestyle measurably driven by Location technology/economy signal, additive with role-derived bias, tags reach the shared preferTags mechanism, backward compatible when omitted) passed.');

  // --- CORRECTION (independent review round 2): duplicate Location identity inputs must be normalized, not left free to disagree ---
  {
    // Explicit linkedLocationId/locationDraftId always win over locationContext's own locationId/locationDraftId when BOTH are supplied.
    const explicitWins = await createGeneratedNpcConcept({
      rng: makeSeededRng(1), availableSpeciesIds, linkedLocationId: 'location-explicit-A', locationDraftId: 'draft:location:explicit-A',
      locationContext: { locationId: 'location-context-B', locationDraftId: 'draft:location:context-B' },
      nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider
    });
    assert.equal(explicitWins.linkedLocationId, 'location-explicit-A', 'an explicit linkedLocationId must win over locationContext.locationId when both are supplied');
    assert.equal(explicitWins.locationDraftId, 'draft:location:explicit-A', 'an explicit locationDraftId must win over locationContext.locationDraftId when both are supplied');

    // locationContext-only identity (no separate scalar params) must still resolve onto the NPC AND still trigger locationRelationship generation.
    const contextOnly = await createGeneratedNpcConcept({
      rng: makeSeededRng(2), availableSpeciesIds, locationContext: { locationId: 'location-context-only', locationDraftId: 'draft:location:context-only' },
      nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider
    });
    assert.equal(contextOnly.linkedLocationId, 'location-context-only', 'locationContext.locationId must resolve onto linkedLocationId when no separate scalar is supplied');
    assert.equal(contextOnly.locationDraftId, 'draft:location:context-only', 'locationContext.locationDraftId must resolve onto locationDraftId when no separate scalar is supplied');
    assert.ok(contextOnly.locationRelationship, 'a locationContext-only-supplied Location identity must still trigger locationRelationship generation, not just an explicit linkedLocationId/locationDraftId');

    // isFactionContext must recognize a pre-commit factionDraftId, not only a committed factionId/populationProfile -- a Contact generated FOR a not-yet-committed Faction draft is real Faction context.
    const { NPC_FACTION_ROLES } = await import(abs('scripts/generation/data/npc-faction-roles.js'));
    const factionRoleValues = new Set(NPC_FACTION_ROLES.map((e) => e.value));
    let sawFactionRole = false;
    for (let seed = 0; seed < 100 && !sawFactionRole; seed++) {
      const npc = await createGeneratedNpcConcept({ rng: makeSeededRng(seed + 15000000), availableSpeciesIds, factionDraftId: 'draft:faction:not-yet-committed', nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      if (npc.specialistRole && factionRoleValues.has(npc.specialistRole)) sawFactionRole = true;
    }
    assert.ok(sawFactionRole, 'a factionDraftId alone (no factionId/populationProfile) must be recognized as real Faction context and roll a specialistRole -- confirms isFactionContext now includes factionDraftId');
  }
  console.log('PHASE 8D-3B correction round 2 (duplicate Location identity inputs normalized: explicit linkedLocationId/locationDraftId win over locationContext, locationContext-only identity still resolves + triggers locationRelationship, factionDraftId alone now counts as real Faction context) passed.');

  // --- publicDescription: derived, safe-to-reveal only -------------------
  {
    const description = composeNpcPublicDescription({
      name: 'Test NPC', ageImpression: 'weathered', occupation: 'smuggler',
      appearanceCues: ['a scarred hand'], voice: 'gravelly', speechStyle: 'blunt',
      mannerism: 'never sits with their back to a door', flavorNotes: ['Smells faintly of engine coolant.']
    });
    for (const forbidden of ['secret', 'complication', 'loyalty', 'agenda', 'motivation', 'fear', 'desire', 'gmNotes']) {
      assert.equal(Object.keys(composeNpcPublicDescription).includes(forbidden), false, `composeNpcPublicDescription must not accept a "${forbidden}" parameter at all`);
    }
    assert.ok(description.length > 0, 'composeNpcPublicDescription must produce non-empty prose from safe facts');
    assert.equal(composeNpcPublicDescription({}), '', 'composeNpcPublicDescription must degrade to an empty string when given no facts, never throw');
  }
  console.log('PHASE 8D-3B publicDescription (derived from safe-to-reveal structured facts only, degrades gracefully) passed.');

  // --- CORRECTION (independent review): publicDescription freshness/GM-sovereignty seam ---
  {
    const { setNpcPublicDescription, resetNpcPublicDescriptionToDerived, recomposeNpcPublicDescription, PUBLIC_DESCRIPTION_SOURCE } = await import(abs('scripts/generation/npc-concept.js'));
    const npc = await createGeneratedNpcConcept({ rng: makeSeededRng(90), availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    assert.equal(npc.publicDescriptionSource, PUBLIC_DESCRIPTION_SOURCE.DERIVED, 'a freshly generated NPC\'s publicDescription must default to derived');

    // A reroll that touches one of composeNpcPublicDescription()'s own inputs must refresh publicDescription to match the NEW facts.
    const rerolled = rerollNpcAppearanceCues(npc, { rng: makeSeededRng(91) });
    assert.notEqual(rerolled.appearance, npc.appearance, 'test setup: this seed pair must actually change appearance');
    assert.notEqual(rerolled.publicDescription, npc.publicDescription, 'publicDescription must be recomposed after a reroll that changes one of its own inputs (appearanceCues)');
    assert.ok(rerolled.publicDescription.length === 0 || !npc.appearance || rerolled.publicDescription !== npc.publicDescription, 'recomposed publicDescription must never describe stale facts');

    // GM sovereignty: once manually set, publicDescription survives EVERY relevant reroll untouched.
    const manual = setNpcPublicDescription(npc, 'A hand-written GM description that must never be silently overwritten.');
    assert.equal(manual.publicDescriptionSource, PUBLIC_DESCRIPTION_SOURCE.MANUAL, 'setNpcPublicDescription must mark the source manual');
    const relevantRerollers = [
      ['appearanceCues', () => rerollNpcAppearanceCues(manual, { rng: makeSeededRng(1) })],
      ['mannerism', () => rerollNpcMannerism(manual, { rng: makeSeededRng(1) })],
      ['voice', () => rerollNpcVoice(manual, { rng: makeSeededRng(1) })],
      ['speechStyle', () => rerollNpcSpeechStyle(manual, { rng: makeSeededRng(1) })],
      ['occupation', () => rerollNpcOccupation(manual, { rng: makeSeededRng(1) })]
    ];
    for (const [label, run] of relevantRerollers) {
      const result = run();
      assert.equal(result.publicDescription, manual.publicDescription, `reroll${label} must NEVER overwrite a manually-set publicDescription`);
      assert.equal(result.publicDescriptionSource, PUBLIC_DESCRIPTION_SOURCE.MANUAL, `reroll${label} must leave publicDescriptionSource as manual`);
    }
    // recomposeNpcPublicDescription() called directly must also be a no-op while manual.
    assert.equal(recomposeNpcPublicDescription(manual).publicDescription, manual.publicDescription, 'recomposeNpcPublicDescription must be a no-op on a manual-source draft');

    // The explicit "Recompose" action overrides manual and returns to derived.
    const reset = resetNpcPublicDescriptionToDerived(manual);
    assert.equal(reset.publicDescriptionSource, PUBLIC_DESCRIPTION_SOURCE.DERIVED, 'resetNpcPublicDescriptionToDerived must switch the source back to derived');
    assert.notEqual(reset.publicDescription, manual.publicDescription, 'resetNpcPublicDescriptionToDerived must discard the manual text and recompose fresh');
    // And once back to derived, a relevant reroll refreshes it again.
    const rerolledAfterReset = rerollNpcMannerism(reset, { rng: makeSeededRng(2) });
    assert.equal(rerolledAfterReset.publicDescriptionSource, PUBLIC_DESCRIPTION_SOURCE.DERIVED, 'a reroll after explicit recompose must keep the source derived');
  }
  console.log('PHASE 8D-3B publicDescription freshness (derived recomposes after every relevant reroll, manual text survives every reroll untouched, explicit recompose overrides manual) passed.');

  // --- remaining targeted rerolls preserve unrelated fields (batch check) ---
  {
    const npc = await createGeneratedNpcConcept({ rng: makeSeededRng(80), availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    const rerollers = [
      ['voice', () => rerollNpcVoice(npc, { rng: makeSeededRng(1) })],
      ['mannerism', () => rerollNpcMannerism(npc, { rng: makeSeededRng(1) })],
      ['appearanceCues', () => rerollNpcAppearanceCues(npc, { rng: makeSeededRng(1) })],
      ['desire', () => rerollNpcDesire(npc, { rng: makeSeededRng(1) })],
      ['fear', () => rerollNpcFear(npc, { rng: makeSeededRng(1) })],
      ['loyalty', () => rerollNpcLoyalty(npc, { rng: makeSeededRng(1) })],
      ['complication', () => rerollNpcComplication(npc, { rng: makeSeededRng(1) })],
      ['relationshipHooks', () => rerollNpcRelationshipHooks(npc, { rng: makeSeededRng(1) })],
      ['personalityTraits', () => rerollNpcPersonalityTraits(npc, { rng: makeSeededRng(1) })],
      ['temperament', () => rerollNpcTemperament(npc, { rng: makeSeededRng(1) })],
      ['socialStyle', () => rerollNpcSocialStyle(npc, { rng: makeSeededRng(1) })],
      ['factionRole', () => rerollNpcFactionRole(npc, { rng: makeSeededRng(1) })],
      ['occupation', () => rerollNpcOccupation(npc, { rng: makeSeededRng(1) })]
    ];
    for (const [label, run] of rerollers) {
      const result = run();
      assert.equal(result.name, npc.name, `rerollNpc${label} must preserve name`);
      assert.equal(result.draftId, npc.draftId, `rerollNpc${label} must preserve draftId`);
      assert.equal(result.role, npc.role, `rerollNpc${label} must preserve role`);
      assert.equal(result.secret, npc.secret, `rerollNpc${label} must preserve secret`);
    }
  }
  console.log('PHASE 8D-3B targeted reroll wrappers (13 new field rerolls, each preserving name/draftId/role/secret) passed.');
}

// ------------------------------------------------------------
// GM Field Authoring API (correction pass: draft-field-authoring.js + npc/npc-field-authoring.js)
// ------------------------------------------------------------
{
  const engine = await import(abs('scripts/generation/lib/draft-field-authoring.js'));
  const {
    npcRemoveDraftField, npcRestoreDraftField, npcRenameDraftField,
    npcSetFieldValue, npcAddFieldValue, npcRemoveFieldValue, npcDuplicateFieldValue, npcAddCustomField
  } = await import(abs('scripts/generation/npc/npc-field-authoring.js'));
  const { createGeneratedNpcConcept } = await import(abs('scripts/generation/npc/npc-bundle.js'));
  const { rerollNpcAppearanceCues } = await import(abs('scripts/generation/npc/npc-characterization.js'));
  const availableSpeciesIds = ['species-human', 'species-twi-lek'];

  // §53 -- the generic engine imports NOTHING domain-specific (no NPC/Faction/Planet/Species catalogs). Read its own source and confirm every import target is either a Node builtin-adjacent utility or has no domain-content vocabulary in its path.
  {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const sourcePath = path.default.join(process.cwd(), 'scripts/generation/lib/draft-field-authoring.js');
    const source = fs.default.readFileSync(sourcePath, 'utf8');
    const importLines = [...source.matchAll(/^import .* from '([^']+)';$/gm)].map((m) => m[1]);
    assert.deepEqual(importLines, ['../../utils/stable-id.js'], `draft-field-authoring.js must import ONLY the generic stable-id utility, no domain catalogs -- found: ${JSON.stringify(importLines)}`);
  }

  // §48/§49 -- core operations, exercised directly on a bare fields-state (no NPC involved at all -- proves the engine's own genericness).
  {
    const defs = { motivation: { defaultLabel: 'Motivation', multiValue: true }, gmNotes: { defaultLabel: 'GM Notes', multiValue: false } };
    let draft = { narrativeFields: engine.buildFieldsStateFromScalars(defs, { motivation: 'Protect family', gmNotes: '' }) };
    assert.equal(engine.getFieldPrimaryValue(draft.narrativeFields, 'motivation'), 'Protect family', 'buildFieldsStateFromScalars must seed the initial value');

    // add value / identity
    draft = engine.addDraftFieldValue(draft, 'motivation', 'Leave the planet');
    draft = engine.addDraftFieldValue(draft, 'motivation', 'Get revenge');
    assert.equal(draft.narrativeFields.fields.motivation.values.length, 3, 'addDraftFieldValue must append, not replace');
    const ids3 = draft.narrativeFields.fields.motivation.values.map((v) => v.entryId);
    assert.equal(new Set(ids3).size, 3, 'every added value must get a unique entryId');

    // remove middle
    const middleId = draft.narrativeFields.fields.motivation.values[1].entryId;
    draft = engine.removeDraftFieldValue(draft, 'motivation', middleId);
    assert.equal(draft.narrativeFields.fields.motivation.values.length, 2, 'removeDraftFieldValue must remove exactly one entry');
    assert.ok(draft.narrativeFields.fields.motivation.values.every((v) => v.entryId !== middleId), 'the removed entryId must be gone');

    // duplicate first -> new id
    const firstId = draft.narrativeFields.fields.motivation.values[0].entryId;
    draft = engine.duplicateDraftFieldValue(draft, 'motivation', firstId);
    assert.equal(draft.narrativeFields.fields.motivation.values.length, 3, 'duplicateDraftFieldValue must add one entry');
    const dupIds = draft.narrativeFields.fields.motivation.values.map((v) => v.entryId);
    assert.equal(new Set(dupIds).size, 3, 'a duplicated value must receive a NEW entryId, never reuse the original');
    assert.equal(draft.narrativeFields.fields.motivation.values.filter((v) => v.value === 'Protect family').length, 2, 'the duplicate must carry the same VALUE as the original');
    assert.equal(draft.narrativeFields.fields.motivation.values[1].source, 'manual', 'a duplicated entry must be source:manual, even duplicating a generated entry');

    // reorder value does not change ids
    const idsBeforeMove = draft.narrativeFields.fields.motivation.values.map((v) => v.entryId);
    const lastId = idsBeforeMove[idsBeforeMove.length - 1];
    const targetBeforeId = idsBeforeMove[0];
    draft = engine.moveDraftFieldValue(draft, 'motivation', lastId, targetBeforeId);
    const idsAfterMove = draft.narrativeFields.fields.motivation.values.map((v) => v.entryId);
    assert.equal(new Set(idsAfterMove).size, new Set(idsBeforeMove).size, 'moveDraftFieldValue must not change entry count');
    assert.deepEqual([...idsAfterMove].sort(), [...idsBeforeMove].sort(), 'moveDraftFieldValue must never change any entryId, only order');
    assert.equal(idsAfterMove[0], lastId, 'the moved entry must now sit before its target');

    // rename / reset label
    draft = engine.renameDraftField(draft, 'motivation', 'Goal');
    assert.equal(draft.narrativeFields.fields.motivation.label, 'Goal', 'renameDraftField must change the display label');
    assert.equal(draft.narrativeFields.fields.motivation.fieldId, 'motivation', 'renameDraftField must NEVER change the semantic fieldId');
    draft = engine.resetDraftFieldLabel(draft, 'motivation');
    assert.equal(draft.narrativeFields.fields.motivation.label, 'Motivation', 'resetDraftFieldLabel must restore the original defaultLabel');

    // remove/restore field (empty vs. deleted, §52)
    draft = engine.setDraftFieldValue(draft, 'gmNotes', 'Some GM notes');
    let removed = engine.removeDraftField(draft, 'gmNotes');
    assert.equal(removed.narrativeFields.fields.gmNotes.hidden, true, 'removeDraftField must mark the field hidden');
    assert.equal(removed.narrativeFields.fields.gmNotes.values.length, 1, 'removeDraftField must PRESERVE the field\'s values, not discard them');
    let restored = engine.restoreDraftField(removed, 'gmNotes');
    assert.equal(restored.narrativeFields.fields.gmNotes.hidden, false, 'restoreDraftField must unhide the field');
    assert.equal(restored.narrativeFields.fields.gmNotes.values[0].value, 'Some GM notes', 'restoreDraftField must bring back the SAME values (never regenerate)');
    // Now genuinely empty a field (remove its only value) vs. remove/hide it -- two different states.
    const onlyValueId = restored.narrativeFields.fields.gmNotes.values[0].entryId;
    const emptied = engine.removeDraftFieldValue(restored, 'gmNotes', onlyValueId);
    assert.equal(emptied.narrativeFields.fields.gmNotes.hidden, false, 'a field with its last value removed must stay VISIBLE (present, awaiting input) -- not the same as removeDraftField()');
    assert.equal(emptied.narrativeFields.fields.gmNotes.values.length, 0, 'an emptied field must have zero values');
    const hiddenInstead = engine.removeDraftField(restored, 'gmNotes');
    assert.equal(hiddenInstead.narrativeFields.fields.gmNotes.hidden, true, 'a REMOVED field must be hidden regardless of whether it still has values');

    // custom fields
    let withCustom = engine.addCustomDraftField(draft, { label: 'Favorite Drink', value: 'Spiced caf' });
    const customId = withCustom.narrativeFields.order[withCustom.narrativeFields.order.length - 1];
    assert.ok(customId.startsWith('custom-field-'), 'a custom field must get a custom-field-... id, never reuse a built-in fieldId');
    assert.equal(withCustom.narrativeFields.fields[customId].isCustom, true, 'a custom field must be flagged isCustom');
    assert.equal(withCustom.narrativeFields.fields[customId].values[0].value, 'Spiced caf', 'addCustomDraftField must accept an initial value in one call');
    const duplicatedField = engine.duplicateDraftField(withCustom, customId);
    const newCustomIds = duplicatedField.narrativeFields.order.filter((id) => id.startsWith('custom-field-'));
    assert.equal(newCustomIds.length, 2, 'duplicateDraftField must add a second custom field');
    assert.notEqual(newCustomIds[0], newCustomIds[1], 'duplicateDraftField must mint a NEW fieldId for the copy, never reuse the original');
    const afterCustomRemoval = engine.removeCustomDraftField(duplicatedField, customId);
    assert.ok(!(customId in afterCustomRemoval.narrativeFields.fields), 'removeCustomDraftField must PERMANENTLY delete a custom field (unlike removeDraftField, which only hides a built-in)');
    assert.equal(engine.removeCustomDraftField(draft, 'motivation'), draft, 'removeCustomDraftField must be a no-op on a built-in (non-custom) field');

    // reorder field
    const orderBefore = withCustom.narrativeFields.order.slice();
    const reordered = engine.moveDraftField(withCustom, customId, orderBefore[0]);
    assert.equal(reordered.narrativeFields.order[0], customId, 'moveDraftField must place the field before its target');
    assert.deepEqual([...reordered.narrativeFields.order].sort(), [...orderBefore].sort(), 'moveDraftField must never add/remove/rename a fieldId, only reorder');

    // §54 -- unknown/structural fieldIds fail safe (no-op), never throw, never touched.
    assert.equal(engine.removeDraftField(draft, 'draftId'), draft, 'removeDraftField("draftId") must no-op -- draftId is never a registered field');
    assert.equal(engine.renameDraftField(draft, 'kind', 'Type'), draft, 'renameDraftField("kind") must no-op -- structural fields are simply never addressable');
    assert.equal(engine.setDraftFieldValue(draft, 'provenance', 'hacked'), draft, 'setDraftFieldValue("provenance") must no-op');
    assert.equal(engine.addDraftFieldValue(draft, 'not-a-real-field', 'x'), draft, 'an operation on a completely unknown fieldId must fail safe, never throw');
  }
  console.log('PHASE 8D-3B GM Field Authoring API core operations (add/remove/restore/rename/reset-label fields, add/remove/duplicate/reorder values with stable identity, custom field add/duplicate/remove, structural-field protection, no domain imports in the generic engine) passed.');

  // §50/§51 -- full NPC walkthrough: GM ownership, unrelated-reroll preservation, custom fields, structural id/kind untouched, matching the review's own end-to-end example.
  {
    const npc = await createGeneratedNpcConcept({ rng: makeSeededRng(3), availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    assert.equal(npc.narrativeFields, null, 'a freshly generated NPC must carry NO narrativeFields until a GM touches field authoring -- zero cost for the common case');

    let d = npcAddFieldValue(npc, 'motivation', 'Leave the planet');
    d = npcAddFieldValue(d, 'motivation', 'Get revenge');
    assert.equal(d.narrativeFields.fields.motivation.values.length, 3, 'two npcAddFieldValue calls onto the one generated entry must yield 3 total entries');
    assert.equal(d.motivation, npc.motivation, 'the scalar mirror stays the PRIMARY (first/original) value while only additional entries are appended');

    const middleId = d.narrativeFields.fields.motivation.values[1].entryId;
    d = npcRemoveFieldValue(d, 'motivation', middleId);
    assert.equal(d.narrativeFields.fields.motivation.values.length, 2, 'npcRemoveFieldValue must remove exactly the targeted entry');

    const firstId = d.narrativeFields.fields.motivation.values[0].entryId;
    d = npcDuplicateFieldValue(d, 'motivation', firstId);
    assert.equal(d.narrativeFields.fields.motivation.values.length, 3, 'npcDuplicateFieldValue must add one new entry');

    d = npcRenameDraftField(d, 'motivation', 'Goal');
    assert.equal(d.narrativeFields.fields.motivation.label, 'Goal', 'npcRenameDraftField must update the label');

    d = npcRemoveFieldValue(d, 'motivation', d.narrativeFields.fields.motivation.values[0].entryId);
    assert.equal(d.narrativeFields.fields.motivation.label, 'Goal', 'removing a value must not reset a customized label');

    d = npcAddCustomField(d, { label: 'Favorite Drink', value: 'Spiced Caf' });
    d = npcRemoveDraftField(d, 'fear');

    // THE FINAL INVARIANT (review's own wording): after ALL of the above, a reroll of an UNRELATED field must preserve every one of these GM choices.
    const beforeReroll = d;
    const afterReroll = rerollNpcAppearanceCues(d, { rng: makeSeededRng(77) });
    assert.notEqual(afterReroll.appearance, beforeReroll.appearance, 'test setup: appearance must actually change for this to be a meaningful check');
    assert.equal(afterReroll.narrativeFields.fields.motivation.label, 'Goal', 'reroll Appearance must preserve the renamed Goal label');
    assert.deepEqual(afterReroll.narrativeFields.fields.motivation.values, beforeReroll.narrativeFields.fields.motivation.values, 'reroll Appearance must preserve every Goal entry exactly');
    assert.equal(afterReroll.narrativeFields.fields.fear.hidden, true, 'reroll Appearance must NOT restore the deleted Fear field');
    const customFieldId = Object.keys(afterReroll.narrativeFields.fields).find((id) => afterReroll.narrativeFields.fields[id].label === 'Favorite Drink');
    assert.ok(customFieldId, 'reroll Appearance must preserve the custom Favorite Drink field');
    assert.equal(afterReroll.narrativeFields.fields[customFieldId].values[0].value, 'Spiced Caf', 'reroll Appearance must preserve the custom field\'s value');
    assert.equal(afterReroll.draftId, npc.draftId, 'reroll Appearance must never touch draftId');
    assert.equal(afterReroll.kind, npc.kind, 'reroll Appearance must never touch kind');

    // GM Notes: manual edit + survives an unrelated reroll.
    let withNotes = npcSetFieldValue(npc, 'gmNotes', 'A note only the GM should see.');
    assert.equal(withNotes.gmNotes, 'A note only the GM should see.', 'npcSetFieldValue must sync the gmNotes scalar mirror');
    assert.equal(withNotes.narrativeFields.fields.gmNotes.values[0].source, 'manual', 'npcSetFieldValue must mark the entry manual');
    const rerolledWithNotes = rerollNpcAppearanceCues(withNotes, { rng: makeSeededRng(78) });
    assert.equal(rerolledWithNotes.gmNotes, withNotes.gmNotes, 'GM Notes must survive an unrelated reroll');

    // A TARGETED reroll of the SAME field (a plain scalar patch, not through the field-authoring API) replaces the value but preserves the custom label.
    const { updateNpcConceptDraft } = await import(abs('scripts/generation/npc-concept.js'));
    const targetedReroll = updateNpcConceptDraft(afterReroll, { motivation: 'A wholly new generated motivation' });
    assert.equal(targetedReroll.narrativeFields.fields.motivation.label, 'Goal', 'a targeted reroll of motivation itself must still preserve the customized label');
    assert.equal(targetedReroll.narrativeFields.fields.motivation.values.length, 1, 'a targeted reroll of motivation must collapse back to one fresh generated entry');
    assert.equal(targetedReroll.narrativeFields.fields.motivation.values[0].value, 'A wholly new generated motivation', 'the fresh entry must carry the new value');
    assert.equal(targetedReroll.narrativeFields.fields.motivation.values[0].source, 'generated', 'the fresh entry from a plain reroll must be source:generated');
    assert.equal(targetedReroll.narrativeFields.fields.fear.hidden, true, 'a targeted reroll of motivation must not affect the unrelated (already-removed) fear field');
  }
  console.log('PHASE 8D-3B GM Field Authoring API full walkthrough (multi-value motivation add/remove/duplicate/rename, custom field, field removal, ALL preserved across an unrelated reroll -- the review\'s own final invariant; a targeted reroll of the SAME field replaces its value while preserving its custom label) passed.');

  // §55 -- save/load round-trip: narrativeFields is plain, JSON-safe state -- a full JSON.stringify/parse cycle must preserve it exactly.
  {
    const npc = await createGeneratedNpcConcept({ rng: makeSeededRng(4), availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    let d = npcAddFieldValue(npc, 'motivation', 'Escape the planet');
    d = npcRenameDraftField(d, 'motivation', 'Goal');
    d = npcRemoveDraftField(d, 'fear');
    d = npcAddCustomField(d, { label: 'Favorite Drink', value: 'Spiced caf' });
    const roundTripped = JSON.parse(JSON.stringify(d));
    assert.deepEqual(roundTripped.narrativeFields, d.narrativeFields, 'narrativeFields must round-trip through JSON exactly (custom label, removed field, multi-values, custom field all preserved)');
  }
  console.log('PHASE 8D-3B GM Field Authoring API save/load round-trip (narrativeFields survives JSON serialize/deserialize exactly) passed.');

  // --- CORRECTION (independent review round 2, item 1) -- "Delete field" must mean semantically ABSENT to every consumer, not just UI-hidden with the old value still live on the scalar every generator/composer actually reads.
  {
    const npc = await createGeneratedNpcConcept({ rng: makeSeededRng(5), availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    assert.ok(npc.fear, 'test setup: a freshly generated NPC must have a non-empty fear to make this a meaningful check');
    const originalFear = npc.fear;

    const removed = npcRemoveDraftField(npc, 'fear');
    assert.equal(removed.narrativeFields.fields.fear.hidden, true, 'npcRemoveDraftField must mark the field hidden');
    assert.equal(removed.fear, '', 'the SEMANTIC scalar mirror (draft.fear) must become empty once Fear is removed -- a future generator/composer reading draft.fear directly must see nothing, not the GM-removed value');
    assert.equal(engine.getFieldPrimaryValue(removed.narrativeFields, 'fear'), '', 'getFieldPrimaryValue must also report empty for a hidden field -- every reader, not just the NPC scalar mirror, must agree a removed field is absent');
    assert.deepEqual(engine.getFieldValues(removed.narrativeFields, 'fear'), [], 'getFieldValues must report an empty list for a hidden field');

    // The retained value must survive PRIVATELY in the authoring state, ready for an explicit Restore -- never actually discarded.
    assert.equal(removed.narrativeFields.fields.fear.values[0]?.value, originalFear, 'the field-authoring state must PRIVATELY retain the original value after removal, for Restore Field');

    const restored = npcRestoreDraftField(removed, 'fear');
    assert.equal(restored.narrativeFields.fields.fear.hidden, false, 'npcRestoreDraftField must unhide the field');
    assert.equal(restored.fear, originalFear, 'restoring Fear must bring the ORIGINAL value back onto the scalar mirror -- never regenerate a new one');

    // An unrelated reroll while Fear is removed must never smuggle the old value back onto the scalar, and must never auto-restore the field.
    const { rerollNpcSpeechStyle } = await import(abs('scripts/generation/npc/npc-characterization.js'));
    const rerolledWhileRemoved = rerollNpcSpeechStyle(removed, { rng: makeSeededRng(21) });
    assert.equal(rerolledWhileRemoved.fear, '', 'an unrelated reroll must not resurrect a removed field\'s scalar value');
    assert.equal(rerolledWhileRemoved.narrativeFields.fields.fear.hidden, true, 'an unrelated reroll must not auto-restore a removed field');
    assert.equal(rerolledWhileRemoved.narrativeFields.fields.fear.values[0]?.value, originalFear, 'an unrelated reroll must still preserve the removed field\'s privately-retained value for a later Restore');
  }
  console.log('PHASE 8D-3B correction round 2 (deleted-field semantic sovereignty): removing a field now clears its scalar mirror for every consumer while privately retaining the value for Restore; an unrelated reroll neither resurrects nor auto-restores it, passed.');

  // --- CORRECTION (independent review round 2, item 2) -- field-definition capabilities (multiValue/removable/renameable) must be ENFORCED by the mutation functions, not merely recorded.
  {
    const npc = await createGeneratedNpcConcept({ rng: makeSeededRng(6), availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });

    // gmNotes is declared multiValue:false -- adding a second value must be a no-op. (Note: the NPC wrapper's own scalar-mirror sync always rebuilds the draft object, per `syncAndNormalize()`'s own doc, so "no-op" is verified by CONTENT here, not draft reference identity -- the direct-engine block below verifies reference-identity no-ops on the underlying primitive itself.)
    let withNotes = npcSetFieldValue(npc, 'gmNotes', 'First note');
    assert.equal(withNotes.narrativeFields.fields.gmNotes.values.length, 1, 'test setup: gmNotes must start with exactly one value');
    const afterAddAttempt = npcAddFieldValue(withNotes, 'gmNotes', 'Second note');
    assert.equal(afterAddAttempt.narrativeFields.fields.gmNotes.values.length, 1, 'npcAddFieldValue on a single-value (multiValue:false) field that already has a value must be a no-op -- gmNotes must still carry exactly one value');
    assert.equal(afterAddAttempt.narrativeFields.fields.gmNotes.values[0].value, 'First note', 'the blocked add attempt must not alter the existing value');
    assert.equal(afterAddAttempt.gmNotes, 'First note', 'the blocked add attempt must not alter the scalar mirror');

    // Duplicating a value on a single-value field must likewise be a no-op.
    const gmNotesEntryId = withNotes.narrativeFields.fields.gmNotes.values[0].entryId;
    const afterDupAttempt = npcDuplicateFieldValue(withNotes, 'gmNotes', gmNotesEntryId);
    assert.equal(afterDupAttempt.narrativeFields.fields.gmNotes.values.length, 1, 'npcDuplicateFieldValue on a multiValue:false field must be a no-op -- gmNotes must still carry exactly one value after a blocked duplicate attempt');

    // Direct-engine-level no-op reference-identity check (no NPC scalar-mirror sync involved): both operations must return the EXACT SAME fields-state object when blocked.
    {
      const defs = { gmNotes: { defaultLabel: 'GM Notes', multiValue: false } };
      let bare = { narrativeFields: engine.buildFieldsStateFromScalars(defs, { gmNotes: 'Only note' }) };
      const bareAfterAdd = engine.addDraftFieldValue(bare, 'gmNotes', 'Second note');
      assert.equal(bareAfterAdd, bare, 'the generic engine\'s addDraftFieldValue must return the identical draft reference when blocked by multiValue:false');
      const bareEntryId = bare.narrativeFields.fields.gmNotes.values[0].entryId;
      const bareAfterDup = engine.duplicateDraftFieldValue(bare, 'gmNotes', bareEntryId);
      assert.equal(bareAfterDup, bare, 'the generic engine\'s duplicateDraftFieldValue must return the identical draft reference when blocked by multiValue:false');
    }

    // setDraftFieldValue (REPLACE, not append) must still work normally on a single-value field -- capability enforcement blocks accumulation, not editing.
    const replaced = npcSetFieldValue(withNotes, 'gmNotes', 'Replaced note');
    assert.equal(replaced.narrativeFields.fields.gmNotes.values.length, 1, 'setDraftFieldValue must still be able to REPLACE a single-value field\'s one entry');
    assert.equal(replaced.gmNotes, 'Replaced note', 'the replaced value must reach the scalar mirror');

    // motivation is declared multiValue:true -- the same two operations must work normally there (proves this is real capability-driven enforcement, not a blanket restriction).
    let withMotivation = npcAddFieldValue(npc, 'motivation', 'A second motivation');
    assert.equal(withMotivation.narrativeFields.fields.motivation.values.length, 2, 'npcAddFieldValue must still work normally on a multiValue:true field');
    const motivationEntryId = withMotivation.narrativeFields.fields.motivation.values[0].entryId;
    const dupMotivation = npcDuplicateFieldValue(withMotivation, 'motivation', motivationEntryId);
    assert.equal(dupMotivation.narrativeFields.fields.motivation.values.length, 3, 'npcDuplicateFieldValue must still work normally on a multiValue:true field');

    // Direct engine-level checks: a field definition's removable:false/renameable:false, once threaded into field state, must actually block removeDraftField/renameDraftField -- not merely be recorded metadata.
    {
      const defs = { locked: { defaultLabel: 'Locked Field', multiValue: false, removable: false, renameable: false } };
      let draft = { narrativeFields: engine.buildFieldsStateFromScalars(defs, { locked: 'Cannot touch this' }) };
      assert.equal(engine.createFieldState({ fieldId: 'locked', defaultLabel: 'Locked Field', removable: false, renameable: false }).removable, false, 'createFieldState must actually store removable:false when supplied, not silently default to true');
      const removeAttempt = engine.removeDraftField(draft, 'locked');
      assert.equal(removeAttempt, draft, 'removeDraftField must no-op on a field whose removable capability is false');
      const renameAttempt = engine.renameDraftField(draft, 'locked', 'New Label');
      assert.equal(renameAttempt, draft, 'renameDraftField must no-op on a field whose renameable capability is false');
    }
  }
  console.log('PHASE 8D-3B correction round 2 (field capability enforcement): multiValue:false fields now reject a second value via add/duplicate while still allowing replace via set; removable:false/renameable:false fields now actually block remove/rename, not merely record the capability, passed.');
}

console.log('PHASE 8D-3B NPC + Faction productionization suite (catalog quality, generation semantics, bundle generation, reroll safety, determinism, flavor notes, complete NPC schema addendum, GM field authoring API) passed.');
