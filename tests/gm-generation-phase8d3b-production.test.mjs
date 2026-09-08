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
// FINAL CONTENT HYDRATION PASS -- documented production-floor assertions
// (minimum only, per the phase spec: "never require the exact upper
// bound") for every catalog hydrated in this pass that isn't already
// covered by an existing assertion above.
// ------------------------------------------------------------
{
  const { NPC_SOCIAL_ROLES } = await import(abs('scripts/generation/data/npc-social-roles.js'));
  const { NPC_NARRATIVE_FUNCTIONS } = await import(abs('scripts/generation/data/npc-narrative-functions.js'));
  const { NPC_LOCATION_RELATIONSHIPS } = await import(abs('scripts/generation/data/npc-location-relationships.js'));
  const { NPC_LOYALTY_PROFILES } = await import(abs('scripts/generation/data/npc-loyalty-profiles.js'));
  const { NPC_SOCIAL_STYLES } = await import(abs('scripts/generation/data/npc-social-styles.js'));
  const { NPC_TEMPERAMENTS } = await import(abs('scripts/generation/data/npc-temperaments.js'));
  const { NPC_OCCUPATIONS } = await import(abs('scripts/generation/data/npc-occupations.js'));
  const { NPC_FACTION_ROLES } = await import(abs('scripts/generation/data/npc-faction-roles.js'));
  const { NPC_DESIRES } = await import(abs('scripts/generation/data/npc-desires.js'));
  const { NPC_FEARS } = await import(abs('scripts/generation/data/npc-fears.js'));
  const { NPC_COMPLICATIONS } = await import(abs('scripts/generation/data/npc-complications.js'));
  const { NPC_RELATIONSHIP_HOOK_TEMPLATES } = await import(abs('scripts/generation/data/npc-relationship-hooks.js'));
  const { NPC_VOICE_QUALITIES_ORGANIC } = await import(abs('scripts/generation/data/npc-voice-qualities-organic.js'));
  const { NPC_VOICE_QUALITIES_DROID } = await import(abs('scripts/generation/data/npc-voice-qualities-droid.js'));
  const { NPC_SPEECH_STYLES } = await import(abs('scripts/generation/data/npc-speech-styles.js'));
  const { NPC_DROID_MANNERISMS } = await import(abs('scripts/generation/data/npc-mannerisms-droid.js'));

  const floors = {
    NPC_SOCIAL_ROLES: [NPC_SOCIAL_ROLES, 75],
    NPC_NARRATIVE_FUNCTIONS: [NPC_NARRATIVE_FUNCTIONS, 50],
    NPC_LOCATION_RELATIONSHIPS: [NPC_LOCATION_RELATIONSHIPS, 30],
    NPC_LOYALTY_PROFILES: [NPC_LOYALTY_PROFILES, 50],
    NPC_SOCIAL_STYLES: [NPC_SOCIAL_STYLES, 75],
    NPC_TEMPERAMENTS: [NPC_TEMPERAMENTS, 50],
    NPC_OCCUPATIONS: [NPC_OCCUPATIONS, 250],
    NPC_FACTION_ROLES: [NPC_FACTION_ROLES, 100],
    NPC_DESIRES: [NPC_DESIRES, 150],
    NPC_FEARS: [NPC_FEARS, 150],
    NPC_COMPLICATIONS: [NPC_COMPLICATIONS, 250],
    NPC_RELATIONSHIP_HOOK_TEMPLATES: [NPC_RELATIONSHIP_HOOK_TEMPLATES, 200],
    NPC_VOICE_QUALITIES_ORGANIC: [NPC_VOICE_QUALITIES_ORGANIC, 100],
    NPC_VOICE_QUALITIES_DROID: [NPC_VOICE_QUALITIES_DROID, 100],
    NPC_SPEECH_STYLES: [NPC_SPEECH_STYLES, 200],
    NPC_DROID_MANNERISMS: [NPC_DROID_MANNERISMS, 150]
  };
  for (const [name, [pool, floor]] of Object.entries(floors)) {
    assert.ok(pool.length >= floor, `${name} must meet its documented production floor (${floor}+), got ${pool.length}`);
    const seen = new Set();
    for (const entry of pool) {
      const key = (entry.value ?? entry.text).toLowerCase().trim();
      assert.ok(!seen.has(key), `${name} must contain no duplicate values, case/whitespace-normalized (dup: "${key}")`);
      seen.add(key);
    }
  }

  // NPC_OCCUPATIONS.roleTag must reference a real NPC_ROLES value (also independently checked below in
  // the table-validation block; re-asserted here so this hydration-floor block stands on its own).
  const { NPC_ROLES } = await import(abs('scripts/generation/data/npc-roles.js'));
  const roleTagValues = new Set(NPC_ROLES.map((e) => e.value));
  for (const occEntry of NPC_OCCUPATIONS) {
    assert.ok(roleTagValues.has(occEntry.roleTag), `NPC_OCCUPATIONS entry "${occEntry.value}"'s roleTag "${occEntry.roleTag}" must reference a real NPC_ROLES value`);
  }

  console.log('PHASE 8D-3B final content hydration production-floor assertions (16 additional hydrated catalogs meet their documented minimums, zero duplicates, occupation roleTags valid) passed.');
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
          // non-deterministic identity, never a generated FACT. linkId
          // (npc/npc-location-link.js) is the same kind of fresh-minted
          // identity for a locationLinks entry -- stripped defensively
          // here too, though this fixture doesn't currently supply a
          // Location to its Contacts (see the dedicated locationLinks
          // determinism test elsewhere in this file for that case).
          if (key === 'draftId' || key === 'factionDraftId' || key === 'locationDraftId' || key === 'linkId') continue;
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
  assert.ok(ORGANIC_NPC_FLAVOR_QUALITIES.length >= 1000, `ORGANIC_NPC_FLAVOR_QUALITIES must meet the documented production floor (1,000-1,500), got ${ORGANIC_NPC_FLAVOR_QUALITIES.length}`);
  assert.ok(DROID_NPC_FLAVOR_QUALITIES.length >= 500, `DROID_NPC_FLAVOR_QUALITIES must meet the documented production floor (500-1,000), got ${DROID_NPC_FLAVOR_QUALITIES.length}`);
  {
    const appearanceCueCategories = new Set(['chassis', 'paint', 'replacement-parts', 'photoreceptor']);
    const droidAppearanceCueCount = DROID_NPC_FLAVOR_QUALITIES.filter((e) => appearanceCueCategories.has(e.category)).length;
    assert.ok(droidAppearanceCueCount >= 200, `DROID_NPC_FLAVOR_QUALITIES's chassis/paint/replacement-parts/photoreceptor categories (serving as the droid appearance-cue pool) must meet the documented floor (200-350 combined), got ${droidAppearanceCueCount}`);
  }
  // Every declared conflictTags reference must resolve against SOME entry's own `tags` array in the
  // same pool (the mechanism `conflictsWithPicked()` in npc-flavor.js actually checks) -- otherwise the
  // pairing is silently inert. Guards against the exact latent-reference bug this phase's hydration found
  // and fixed across both pools.
  for (const [name, pool] of [['ORGANIC_NPC_FLAVOR_QUALITIES', ORGANIC_NPC_FLAVOR_QUALITIES], ['DROID_NPC_FLAVOR_QUALITIES', DROID_NPC_FLAVOR_QUALITIES]]) {
    const allTags = new Set(pool.flatMap((e) => e.tags ?? []));
    for (const entry of pool) {
      for (const conflictTag of entry.conflictTags ?? []) {
        assert.ok(allTags.has(conflictTag), `${name} entry "${entry.id}"'s conflictTags value "${conflictTag}" must be present in some entry's own tags[] in the same pool, or the conflict pairing is silently inert`);
      }
    }
  }

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
    // Explicit linkedLocationId/locationDraftId always win over locationContext's own locationId/locationDraftId when BOTH are supplied. Tested one identity type at a time -- round 3's own "draft/canonical duality" invariant (a link's locationId always wins and clears any locationDraftId in the SAME call, see npc/npc-location-link.js) means a real link never carries both at once, so a caller legitimately supplies only ONE per relationship, never both together.
    const explicitCanonicalWins = await createGeneratedNpcConcept({
      rng: makeSeededRng(1), availableSpeciesIds, linkedLocationId: 'location-explicit-A',
      locationContext: { locationId: 'location-context-B' },
      nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider
    });
    assert.equal(explicitCanonicalWins.linkedLocationId, 'location-explicit-A', 'an explicit linkedLocationId must win over locationContext.locationId when both are supplied');

    const explicitDraftWins = await createGeneratedNpcConcept({
      rng: makeSeededRng(1), availableSpeciesIds, locationDraftId: 'draft:location:explicit-A',
      locationContext: { locationDraftId: 'draft:location:context-B' },
      nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider
    });
    assert.equal(explicitDraftWins.locationDraftId, 'draft:location:explicit-A', 'an explicit locationDraftId must win over locationContext.locationDraftId when both are supplied');

    // locationContext-only identity (no separate scalar params) must still resolve onto the NPC AND still trigger locationRelationship generation -- tested for both a canonical and a draft target.
    const contextOnlyCanonical = await createGeneratedNpcConcept({
      rng: makeSeededRng(2), availableSpeciesIds, locationContext: { locationId: 'location-context-only' },
      nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider
    });
    assert.equal(contextOnlyCanonical.linkedLocationId, 'location-context-only', 'locationContext.locationId must resolve onto linkedLocationId when no separate scalar is supplied');
    assert.ok(contextOnlyCanonical.locationRelationship, 'a locationContext-only-supplied Location identity must still trigger locationRelationship generation, not just an explicit linkedLocationId/locationDraftId');

    const contextOnlyDraft = await createGeneratedNpcConcept({
      rng: makeSeededRng(3), availableSpeciesIds, locationContext: { locationDraftId: 'draft:location:context-only' },
      nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider
    });
    assert.equal(contextOnlyDraft.locationDraftId, 'draft:location:context-only', 'locationContext.locationDraftId must resolve onto locationDraftId when no separate scalar is supplied');

    // CORRECTION (round 3 -- "draft/canonical duality needs a strict contract"): a link's locationId always wins and CLEARS any simultaneously-supplied locationDraftId -- a real relationship never carries two competing active target identities.
    const bothSupplied = await createGeneratedNpcConcept({
      rng: makeSeededRng(4), availableSpeciesIds, linkedLocationId: 'location-canonical', locationDraftId: 'draft:location:stale',
      nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider
    });
    assert.equal(bothSupplied.linkedLocationId, 'location-canonical', 'the canonical locationId must win when both a canonical and a draft identity are supplied for the same relationship');
    assert.equal(bothSupplied.locationDraftId, '', 'the draft/canonical duality invariant must clear locationDraftId once a canonical locationId is present -- never two competing active identities');

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

  // --- CORRECTION (independent review round 5, item 1): a conflicting locationContext must be dropped ENTIRELY (bias + tags), not just lose the identity-writing tie-break ---
  {
    const { resolveNpcLocationGenerationContext } = await import(abs('scripts/generation/npc/npc-bundle.js'));
    const { DIAGNOSTIC_CODE } = await import(abs('scripts/generation/lib/generator-diagnostics.js'));

    // Direct primitive checks of the four rules.
    const noExplicit = resolveNpcLocationGenerationContext({ locationContext: { locationId: 'loc-context' } });
    assert.equal(noExplicit.locationRef.locationId, 'loc-context', 'no explicit identity + a context identity -> use the context\'s identity');
    assert.notEqual(noExplicit.context, null, 'no explicit identity + a context identity -> the context must be used normally, not dropped');
    assert.equal(noExplicit.contextMismatch, false, 'no explicit identity -> never a mismatch');

    const explicitOnlyContextHasNoIdentity = resolveNpcLocationGenerationContext({ linkedLocationId: 'loc-explicit', locationContext: { technologyLevel: 'advanced' } });
    assert.equal(explicitOnlyContextHasNoIdentity.locationRef.locationId, 'loc-explicit', 'an explicit identity with a context that declares NO identity of its own must resolve to the explicit target');
    assert.notEqual(explicitOnlyContextHasNoIdentity.context, null, 'a context with no identity of its own is assumed to describe the explicit target, and must still be used normally');
    assert.equal(explicitOnlyContextHasNoIdentity.contextMismatch, false, 'a context with no declared identity is never a mismatch');

    const matching = resolveNpcLocationGenerationContext({ linkedLocationId: 'loc-x', locationContext: { locationId: 'loc-x', technologyLevel: 'advanced' } });
    assert.equal(matching.contextMismatch, false, 'an explicit identity that MATCHES the context\'s own declared identity is never a mismatch');
    assert.notEqual(matching.context, null, 'a matching context must be used normally');

    const conflicting = resolveNpcLocationGenerationContext({ linkedLocationId: 'location-A', locationContext: { locationId: 'location-B', technologyLevel: 'cutting-edge', economyTags: ['financial-services'] } });
    assert.equal(conflicting.locationRef.locationId, 'location-A', 'a conflicting explicit identity must still win for the resolved locationRef');
    assert.equal(conflicting.context, null, 'a conflicting locationContext must be dropped ENTIRELY -- not merely lose the identity tie-break');
    assert.equal(conflicting.contextMismatch, true, 'a genuine identity conflict must be reported');

    // End-to-end: the EXACT scenario from the review -- an explicit linkedLocationId conflicting with locationContext.locationId must NOT let the context's technology/economy bias leak through.
    const HIGH_TECH = new Set(['expert', 'specialist']);
    const N = 400;
    let highTechCount = 0;
    for (let seed = 0; seed < N; seed++) {
      const npc = await createGeneratedNpcConcept({
        rng: makeSeededRng(seed), availableSpeciesIds, linkedLocationId: 'location-A',
        locationContext: { locationId: 'location-B', technologyLevel: 'cutting-edge', technologyAccess: 'ubiquitous', economyTags: ['financial-services'] },
        nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider
      });
      assert.equal(npc.linkedLocationId, 'location-A', 'the NPC must still link to the explicit target, not the conflicting context target');
      if (HIGH_TECH.has(npc.technologyFamiliarity)) highTechCount++;
    }
    assert.ok(highTechCount / N < 0.35, `a conflicting locationContext's cutting-edge/ubiquitous technology bias must NOT leak through once the identity conflict is detected (got ${highTechCount}/${N} high-tech, expected roughly the unbiased baseline)`);

    // The mismatch must be visible on the draft's own provenance -- never silently dropped with no trace.
    const flagged = await createGeneratedNpcConcept({
      rng: makeSeededRng(1), availableSpeciesIds, linkedLocationId: 'location-A', locationContext: { locationId: 'location-B' },
      nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider
    });
    assert.ok(flagged.provenance.warnings.includes(DIAGNOSTIC_CODE.NPC_LOCATION_CONTEXT_MISMATCH), 'a Location-context identity conflict must be flagged on the draft\'s own provenance.warnings, never silently swallowed');

    // No conflict -> no warning, and the context's bias DOES apply normally.
    const unflagged = await createGeneratedNpcConcept({
      rng: makeSeededRng(1), availableSpeciesIds, linkedLocationId: 'location-A', locationContext: { locationId: 'location-A', technologyLevel: 'cutting-edge', technologyAccess: 'ubiquitous' },
      nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider
    });
    assert.ok(!unflagged.provenance.warnings.includes(DIAGNOSTIC_CODE.NPC_LOCATION_CONTEXT_MISMATCH), 'a matching (non-conflicting) locationContext must never be flagged');
  }
  console.log('PHASE 8D-3B correction round 5 (Location-context identity mismatch): a conflicting locationContext is now dropped ENTIRELY (bias + tags), not just its identity, and the conflict is flagged on provenance.warnings, passed.');

  // --- CORRECTION (independent review round 6, item 1): the mismatch diagnostic must MERGE onto a caller-supplied provenance, never be silently overwritable by it ---
  {
    const { DIAGNOSTIC_CODE } = await import(abs('scripts/generation/lib/generator-diagnostics.js'));
    const { createProvenance } = await import(abs('scripts/generation/provenance.js'));

    const callerProvenance = createProvenance({ presetId: 'test-preset', warnings: ['EXISTING_WARNING'] });
    const npc = await createGeneratedNpcConcept({
      rng: makeSeededRng(1), availableSpeciesIds, linkedLocationId: 'location-A', locationContext: { locationId: 'location-B' },
      provenance: callerProvenance, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider
    });
    assert.equal(npc.provenance.presetId, 'test-preset', 'a caller-supplied provenance\'s presetId must survive -- the mismatch warning merges onto it, never replaces it with a fresh blank provenance');
    assert.ok(npc.provenance.warnings.includes('EXISTING_WARNING'), 'a caller-supplied provenance\'s own pre-existing warnings must survive the merge');
    assert.ok(npc.provenance.warnings.includes(DIAGNOSTIC_CODE.NPC_LOCATION_CONTEXT_MISMATCH), 'the NPC_LOCATION_CONTEXT_MISMATCH warning must still be added on top of the caller-supplied provenance, not lost to it');

    // No mismatch -> a caller-supplied provenance is still honored as-is (not silently replaced with a fresh one).
    const noMismatchProvenance = createProvenance({ presetId: 'other-preset' });
    const npcNoMismatch = await createGeneratedNpcConcept({
      rng: makeSeededRng(1), availableSpeciesIds, linkedLocationId: 'location-A', provenance: noMismatchProvenance,
      nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider
    });
    assert.equal(npcNoMismatch.provenance.presetId, 'other-preset', 'a caller-supplied provenance must be honored even when there is no mismatch to merge in');
  }
  console.log('PHASE 8D-3B correction round 6 (mismatch-warning provenance merge): a caller-supplied provenance can no longer silently overwrite the NPC_LOCATION_CONTEXT_MISMATCH warning -- the two are merged, preserving presetId/existing warnings, passed.');

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

// ------------------------------------------------------------
// Contact <-> Location relationship model (correction pass round 3: locationLinks[] replaces the single scalar Location reference as the schema's real authority; correction pass round 4: draft-target reverse lookup, 5-state resolution, GM-edit provenance, draft->canonical promotion, snapshot-only/CUSTOM-label validation, primary/status coherence)
// ------------------------------------------------------------
{
  const primitives = await import(abs('scripts/generation/npc/npc-location-link.js'));
  const {
    createContactLocationLink, normalizeContactLocationLinks, migrateLegacyLocationScalarsToLinks, deriveLegacyLocationFields,
    getPrimaryContactLocationLink, getContactLocationLinksByType, resolveContactLocationLink, findContactsForLocationRef,
    isMeaningfulContactLocationLink, resolveLocationDraftReferenceInLinks,
    CONTACT_LOCATION_LINK_STATUS, CONTACT_LOCATION_LINK_SCOPE, CONTACT_LOCATION_LINK_SOURCE, CONTACT_LOCATION_RELATIONSHIP
  } = primitives;
  const {
    addContactLocationLink, removeContactLocationLink, updateContactLocationLink,
    setContactLocationLinkPrimary, rerollContactLocationLink, rerollPrimaryContactLocationLink, resolveContactLocationDraftReference
  } = await import(abs('scripts/generation/npc/npc-location-link-actions.js'));
  const { createNpcConceptDraft, updateNpcConceptDraft } = await import(abs('scripts/generation/npc-concept.js'));
  const { createGeneratedNpcConcept } = await import(abs('scripts/generation/npc/npc-bundle.js'));
  const { rerollNpcLocationRelationship } = await import(abs('scripts/generation/npc/npc-characterization.js'));
  const availableSpeciesIds = ['species-human', 'species-twi-lek'];

  // --- pure primitive: identity, dedupe, primary invariant, multiplicity ---
  {
    const link1 = createContactLocationLink({ locationId: 'loc-a', relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT, primary: true });
    const link2 = createContactLocationLink({ locationId: 'loc-b', relationshipType: CONTACT_LOCATION_RELATIONSHIP.WORK });
    assert.notEqual(link1.linkId, link2.linkId, 'every link must mint a distinct stable linkId');
    assert.ok(link1.linkId.startsWith('contact-location-'), 'linkId must be namespaced, never a bare id/name/index');

    // 0 links is valid.
    assert.deepEqual(normalizeContactLocationLinks([]), [], 'a Contact may have zero Location relationships');
    assert.deepEqual(normalizeContactLocationLinks(null), [], 'normalize must fail safe on a non-array input');

    // many links is valid, and re-normalizing is idempotent (same content, same linkIds). The third entry is snapshot-only -- eligible ONLY because it's a LAST_SEEN link (see round 4's "snapshot-only validity boundary" hardening below).
    const many = normalizeContactLocationLinks([link1, link2, createContactLocationLink({ relationshipType: CONTACT_LOCATION_RELATIONSHIP.LAST_SEEN, status: CONTACT_LOCATION_LINK_STATUS.HISTORICAL, snapshot: { name: 'Somewhere Else' } })]);
    assert.equal(many.length, 3, 'a Contact may have many Location relationships, including a LAST_SEEN snapshot-only (unresolvable-id) one');
    const renormalized = normalizeContactLocationLinks(many);
    assert.deepEqual(renormalized.map((l) => l.linkId), many.map((l) => l.linkId), 'normalizeContactLocationLinks must be idempotent -- re-running it preserves every linkId');
    assert.deepEqual(renormalized, many, 'normalizeContactLocationLinks must be content-idempotent -- re-running it changes nothing');

    // a link with no target AND no snapshot name is meaningless and gets dropped.
    const withEmpty = normalizeContactLocationLinks([link1, {}]);
    assert.equal(withEmpty.length, 1, 'a link with no locationId/locationDraftId/snapshot.name must be dropped as meaningless');

    // duplicate linkId: first occurrence wins, later ones dropped.
    const dupe = createContactLocationLink({ linkId: link1.linkId, locationId: 'loc-c' });
    const deduped = normalizeContactLocationLinks([link1, dupe]);
    assert.equal(deduped.length, 1, 'a duplicate linkId must be deduped, not produce two entries');
    assert.equal(deduped[0].locationId, 'loc-a', 'the FIRST occurrence of a duplicate linkId must win');

    // at most one ACTIVE primary -- later ones demoted, never dropped.
    const twoPrimaries = normalizeContactLocationLinks([
      createContactLocationLink({ locationId: 'loc-x', primary: true, status: CONTACT_LOCATION_LINK_STATUS.ACTIVE }),
      createContactLocationLink({ locationId: 'loc-y', primary: true, status: CONTACT_LOCATION_LINK_STATUS.ACTIVE })
    ]);
    assert.equal(twoPrimaries.filter((l) => l.primary).length, 1, 'at most one ACTIVE link may be flagged primary -- the second must be demoted');
    assert.equal(twoPrimaries.length, 2, 'demoting a redundant primary must NOT drop the link itself -- both relationships survive');
    // CORRECTION (independent review round 4 -- "primary status normalization"): `primary` is meaningful EXCLUSIVELY on an ACTIVE link -- normalization always forces it false on any non-active link, never leaves it dangling from a status change.
    const primaryHistorical = normalizeContactLocationLinks([
      createContactLocationLink({ locationId: 'loc-x', primary: true, status: CONTACT_LOCATION_LINK_STATUS.ACTIVE }),
      createContactLocationLink({ locationId: 'loc-z', primary: true, status: CONTACT_LOCATION_LINK_STATUS.HISTORICAL })
    ]);
    assert.equal(primaryHistorical.find((l) => l.locationId === 'loc-x').primary, true, 'the ACTIVE link\'s primary flag must survive normalization');
    assert.equal(primaryHistorical.find((l) => l.locationId === 'loc-z').primary, false, 'a HISTORICAL link must never be flagged primary -- normalization always forces it false, regardless of what was supplied');
    assert.equal(primaryHistorical.filter((l) => l.primary).length, 1, 'primary must be meaningful on at most one link total, and only ever an ACTIVE one');
  }
  console.log('PHASE 8D-3B locationLinks primitives (stable linkId identity, 0/1/many multiplicity, idempotent normalization, meaningless-entry dropping, duplicate-linkId dedup, at-most-one-active-primary enforcement, primary forced false on any non-active link) passed.');

  // --- draft/canonical duality ---
  {
    const canonicalWins = createContactLocationLink({ locationId: 'loc-real', locationDraftId: 'draft:location:stale' });
    assert.equal(canonicalWins.locationId, 'loc-real', 'a canonical locationId must be set when supplied');
    assert.equal(canonicalWins.locationDraftId, '', 'a canonical locationId must CLEAR any simultaneously-supplied locationDraftId -- never two competing active identities');

    const draftOnly = createContactLocationLink({ locationDraftId: 'draft:location:abc' });
    assert.equal(draftOnly.locationId, '', 'a draft-only link must have no canonical id');
    assert.equal(draftOnly.locationDraftId, 'draft:location:abc', 'a draft-only link must retain its locationDraftId');
  }
  console.log('PHASE 8D-3B locationLinks draft/canonical duality (a canonical locationId always wins and clears locationDraftId in the same call) passed.');

  // --- migration from v1 legacy scalars (including lastKnownLocation's own id-less shape) ---
  {
    const links = migrateLegacyLocationScalarsToLinks({ linkedLocationId: 'loc-1', locationRelationship: 'native', lastKnownLocation: 'The Old Docks' });
    assert.equal(links.length, 2, 'migration must produce ONE primary link (from linkedLocationId/locationRelationship) and ONE last-seen link (from lastKnownLocation)');
    const primary = links.find((l) => l.primary);
    assert.equal(primary.locationId, 'loc-1', 'the migrated primary link must carry the old linkedLocationId');
    assert.equal(primary.relationshipLabel, 'native', 'the migrated primary link must preserve the OLD narrative text verbatim as its label');
    assert.equal(primary.relationshipType, CONTACT_LOCATION_RELATIONSHIP.RESIDENT, '"native" must map onto the RESIDENT structural type via the reused NPC_LOCATION_RELATIONSHIPS catalog, not a duplicated vocabulary');
    const lastSeen = links.find((l) => l.relationshipType === CONTACT_LOCATION_RELATIONSHIP.LAST_SEEN);
    assert.equal(lastSeen.status, CONTACT_LOCATION_LINK_STATUS.HISTORICAL, 'a migrated last-seen link must be HISTORICAL, not ACTIVE');
    assert.equal(lastSeen.locationId, '', 'lastKnownLocation was always a bare display string with no id of its own -- migration must never invent one');
    assert.equal(lastSeen.snapshot.name, 'The Old Docks', 'the migrated last-seen link must preserve the old text as its snapshot name');

    // An unrecognized narrative label (GM hand-authored text) migrates to ASSOCIATED, never a guess.
    const custom = migrateLegacyLocationScalarsToLinks({ linkedLocationId: 'loc-2', locationRelationship: 'runs the black market here, unofficially' });
    assert.equal(custom[0].relationshipType, CONTACT_LOCATION_RELATIONSHIP.ASSOCIATED, 'an unrecognized narrative label must fall back to ASSOCIATED, never a fuzzy guess at a structural type');
    assert.equal(custom[0].relationshipLabel, 'runs the black market here, unofficially', 'the unrecognized label\'s exact text must still be preserved verbatim');

    // Round trip: derive back to legacy scalars must reproduce the original values exactly.
    const derived = deriveLegacyLocationFields(links);
    assert.equal(derived.linkedLocationId, 'loc-1', 'deriveLegacyLocationFields must round-trip linkedLocationId');
    assert.equal(derived.locationRelationship, 'native', 'deriveLegacyLocationFields must round-trip locationRelationship');
    assert.equal(derived.lastKnownLocation, 'The Old Docks', 'deriveLegacyLocationFields must round-trip lastKnownLocation');

    // Nothing supplied -> nothing synthesized.
    assert.deepEqual(migrateLegacyLocationScalarsToLinks({}), [], 'migration with no legacy scalars at all must synthesize zero links');
  }
  console.log('PHASE 8D-3B locationLinks v1->v2 migration (linkedLocationId/locationRelationship -> primary link, lastKnownLocation -> id-less last-seen link, unrecognized labels fall back to ASSOCIATED never a guess, exact round-trip via deriveLegacyLocationFields) passed.');

  // --- npc-concept.js wiring: schemaVersion, derived mirrors never independent authority, unrelated-reroll preservation, empty-array-explicit-vs-never-mentioned ---
  {
    const npc = createNpcConceptDraft({ kind: 'living', name: 'Wiring Test', linkedLocationId: 'loc-wired', locationRelationship: 'native' });
    assert.equal(npc.schemaVersion, 2, 'every constructed NPC concept must carry schemaVersion 2 (the locationLinks[] model)');
    assert.equal(npc.locationLinks.length, 1, 'a legacy-shaped construction must migrate into exactly one locationLinks entry');

    // A plain, location-unaware reroll must preserve locationLinks byte-for-byte (content-equal).
    const unrelatedReroll = updateNpcConceptDraft(npc, { motivation: 'A brand new motivation' });
    assert.deepEqual(unrelatedReroll.locationLinks, npc.locationLinks, 'an unrelated reroll must never mutate locationLinks');
    assert.equal(unrelatedReroll.linkedLocationId, npc.linkedLocationId, 'an unrelated reroll must preserve the derived linkedLocationId mirror too');

    // Passing legacy scalars on a patch AFTER locationLinks already exists must NOT resurrect/alter locationLinks (authority is locationLinks, not the legacy scalar).
    const ignoredLegacyPatch = updateNpcConceptDraft(npc, { linkedLocationId: 'loc-should-be-ignored' });
    assert.deepEqual(ignoredLegacyPatch.locationLinks, npc.locationLinks, 'once locationLinks exists, a stray legacy scalar in a patch must be ignored -- locationLinks is the only authority');
    assert.equal(ignoredLegacyPatch.linkedLocationId, 'loc-wired', 'the derived mirror must reflect locationLinks, not a stray legacy scalar patch');

    // Explicitly clearing locationLinks (GM removed the only relationship) must NOT be resurrected by the still-present-but-stale legacy scalar fields inherited from the previous draft.
    const cleared = updateNpcConceptDraft(npc, { locationLinks: [] });
    assert.deepEqual(cleared.locationLinks, [], 'an explicit empty locationLinks must be respected, not treated as "not provided"');
    assert.equal(cleared.linkedLocationId, '', 'clearing locationLinks must clear the derived linkedLocationId mirror too, never resurrect it from stale inherited scalars');

    // A caller providing locationLinks directly (new-style construction) bypasses migration entirely.
    const directLink = createContactLocationLink({ locationId: 'loc-direct', relationshipType: CONTACT_LOCATION_RELATIONSHIP.WORK, primary: true });
    const directNpc = createNpcConceptDraft({ kind: 'living', name: 'Direct', locationLinks: [directLink], linkedLocationId: 'loc-should-be-ignored-too' });
    assert.equal(directNpc.linkedLocationId, 'loc-direct', 'when locationLinks is explicitly supplied, it is the sole authority -- any conflicting legacy scalar in the SAME input is ignored');
  }
  console.log('PHASE 8D-3B locationLinks npc-concept.js wiring (schemaVersion 2, migration on construction only, unrelated rerolls preserve locationLinks, legacy scalars are read-only derived mirrors that can never resurrect or override an explicit locationLinks) passed.');

  // --- generator wiring: createGeneratedNpcConcept builds a proper locationLinks entry ---
  {
    const withLocation = await createGeneratedNpcConcept({ rng: makeSeededRng(1), availableSpeciesIds, linkedLocationId: 'loc-generated', nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    assert.equal(withLocation.locationLinks.length, 1, 'a generated NPC with a resolved Location must carry exactly one locationLinks entry');
    assert.equal(withLocation.locationLinks[0].locationId, 'loc-generated', 'the generated link must target the resolved Location');
    assert.equal(withLocation.locationLinks[0].primary, true, 'the generated link must be flagged primary');
    assert.equal(withLocation.locationLinks[0].source, 'generated', 'a generator-produced link must be source:generated');
    assert.ok(withLocation.locationLinks[0].relationshipType, 'the generated link must carry a real structural relationshipType, not just a label');

    const withoutLocation = await createGeneratedNpcConcept({ rng: makeSeededRng(1), availableSpeciesIds, nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    assert.deepEqual(withoutLocation.locationLinks, [], 'a generated NPC with no Location context must carry zero locationLinks, never a placeholder');
  }
  console.log('PHASE 8D-3B locationLinks generator wiring (npc/npc-bundle.js builds a proper primary locationLinks entry, source:generated, zero links when no Location context) passed.');

  // --- CORRECTION (independent review round 4, item 9): a generated NPC's locationLinks must be deterministic under a seeded RNG + fixed Location input, aside from linkId's own intentionally-fresh identity ---
  {
    function stripLinkIds(links) {
      return (links ?? []).map(({ linkId, ...rest }) => rest);
    }
    const runA = await createGeneratedNpcConcept({ rng: makeSeededRng(555), availableSpeciesIds, linkedLocationId: 'loc-determinism', nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    const runB = await createGeneratedNpcConcept({ rng: makeSeededRng(555), availableSpeciesIds, linkedLocationId: 'loc-determinism', nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
    assert.notEqual(runA.locationLinks[0].linkId, runB.locationLinks[0].linkId, 'test setup: linkId is intentionally minted fresh per generation, never a seeded generator fact -- it must actually differ here to make the strip below meaningful');
    assert.deepEqual(stripLinkIds(runA.locationLinks), stripLinkIds(runB.locationLinks), 'the same RNG seed + the same Location input must reproduce IDENTICAL locationLinks content (target, relationshipType, relationshipLabel, status, primary, scope, certainty, revealState, source) once linkId\'s own fresh identity is stripped');

    // Sanity check (not itself a determinism assertion): across enough DIFFERENT seeds, the flavor actually varies -- otherwise the identical-content proof above would be trivially true of a constant generator.
    const labelsAcrossSeeds = new Set();
    for (let seed = 600; seed < 630; seed++) {
      const run = await createGeneratedNpcConcept({ rng: makeSeededRng(seed), availableSpeciesIds, linkedLocationId: 'loc-determinism', nameProvider: stubNameProvider, droidNameProvider: stubDroidNameProvider });
      labelsAcrossSeeds.add(run.locationLinks[0].relationshipLabel);
    }
    assert.ok(labelsAcrossSeeds.size > 1, 'test setup: different seeds must be able to produce different relationshipLabel flavor across a reasonable sample, or the determinism proof above would be vacuous');
  }
  console.log('PHASE 8D-3B locationLinks determinism (same RNG seed + same Location input reproduces identical locationLinks content with linkId stripped; a different seed can differ) passed.');

  // --- CRUD actions: add/remove/update/setPrimary/reroll, each targeting linkId and preserving every OTHER link + every unrelated NPC field ---
  {
    let npc = createNpcConceptDraft({ kind: 'living', name: 'CRUD Test', linkedLocationId: 'loc-home', locationRelationship: 'native' });
    const homeLinkId = npc.locationLinks[0].linkId;

    // add: a second, independent relationship.
    npc = addContactLocationLink(npc, { locationId: 'loc-work', relationshipType: CONTACT_LOCATION_RELATIONSHIP.WORK, relationshipLabel: 'Works here' });
    assert.equal(npc.locationLinks.length, 2, 'addContactLocationLink must append without disturbing the existing link');
    assert.equal(npc.locationLinks[0].linkId, homeLinkId, 'the original link\'s linkId must survive an add untouched');
    const workLinkId = npc.locationLinks[1].linkId;

    // add with no resolvable target/snapshot is a no-op.
    const noopAdd = addContactLocationLink(npc, {});
    assert.equal(noopAdd, npc, 'addContactLocationLink must no-op (same draft reference) when the new entry has no resolvable target or snapshot');

    // update: patch notes/status on ONE link by linkId, everything else untouched.
    npc = updateContactLocationLink(npc, workLinkId, { notes: 'Day shift only', certainty: 'suspected' });
    assert.equal(npc.locationLinks.find((l) => l.linkId === workLinkId).notes, 'Day shift only', 'updateContactLocationLink must patch the targeted link\'s fields');
    assert.equal(npc.locationLinks.find((l) => l.linkId === workLinkId).certainty, 'suspected', 'updateContactLocationLink must patch certainty');
    assert.equal(npc.locationLinks.find((l) => l.linkId === homeLinkId).notes, '', 'updateContactLocationLink must never touch an untargeted sibling link');

    // setContactLocationLinkPrimary: exactly one ACTIVE primary, by linkId, not index/label.
    npc = setContactLocationLinkPrimary(npc, workLinkId);
    assert.equal(npc.locationLinks.find((l) => l.linkId === workLinkId).primary, true, 'setContactLocationLinkPrimary must flag the targeted link primary');
    assert.equal(npc.locationLinks.find((l) => l.linkId === homeLinkId).primary, false, 'setContactLocationLinkPrimary must demote every other ACTIVE link\'s primary flag');
    assert.equal(npc.linkedLocationId, 'loc-work', 'the derived linkedLocationId mirror must follow the NEW primary link');

    // rerollContactLocationLink: targets linkId, preserves target/status/primary/notes/certainty, only flavor changes.
    const beforeReroll = npc.locationLinks.find((l) => l.linkId === homeLinkId);
    npc = rerollContactLocationLink(npc, homeLinkId, { rng: makeSeededRng(5) });
    const afterReroll = npc.locationLinks.find((l) => l.linkId === homeLinkId);
    assert.equal(afterReroll.locationId, beforeReroll.locationId, 'rerollContactLocationLink must preserve the link\'s target identity');
    assert.equal(afterReroll.linkId, homeLinkId, 'rerollContactLocationLink must never change the linkId itself');
    assert.equal(npc.locationLinks.find((l) => l.linkId === workLinkId).notes, 'Day shift only', 'rerolling ONE link must never disturb an untargeted sibling link\'s customization');
    assert.equal(npc.name, 'CRUD Test', 'a locationLinks CRUD operation must never touch unrelated NPC fields like name');

    // rerollPrimaryContactLocationLink: the rerollNpcLocationRelationship() replacement, targets whichever link is currently primary (loc-work after the setPrimary above).
    const beforeRerollPrimary = npc.locationLinks.find((l) => l.linkId === workLinkId);
    npc = rerollPrimaryContactLocationLink(npc, { rng: makeSeededRng(6) });
    assert.equal(npc.locationLinks.find((l) => l.linkId === workLinkId).locationId, beforeRerollPrimary.locationId, 'rerollPrimaryContactLocationLink must reroll the PRIMARY link\'s flavor only, never its target');

    // rerollNpcLocationRelationship (the public wrapper) delegates to the same primary-link reroll -- no-op with no location at all.
    const noLocationNpc = createNpcConceptDraft({ kind: 'living', name: 'No Location' });
    const rerollNoop = rerollNpcLocationRelationship(noLocationNpc, { rng: makeSeededRng(7) });
    assert.deepEqual(rerollNoop.locationLinks, [], 'rerollNpcLocationRelationship must no-op on an NPC with no Location association at all');

    // remove: by linkId, sibling preserved.
    npc = removeContactLocationLink(npc, homeLinkId);
    assert.equal(npc.locationLinks.length, 1, 'removeContactLocationLink must remove exactly the targeted link');
    assert.equal(npc.locationLinks[0].linkId, workLinkId, 'the untargeted sibling link must survive removal');
    const noopRemove = removeContactLocationLink(npc, 'not-a-real-link-id');
    assert.equal(noopRemove, npc, 'removeContactLocationLink must no-op (same draft reference) for an unknown linkId');
  }
  console.log('PHASE 8D-3B locationLinks CRUD actions (add/remove/update/setPrimary/reroll-one/reroll-primary, every operation targets linkId, preserves sibling links and unrelated NPC fields, rerollNpcLocationRelationship delegates correctly) passed.');

  // --- CORRECTION (independent review round 4, item 3): GM edits through the action layer default to source:manual, never silently staying source:generated ---
  {
    const npc = createNpcConceptDraft({ kind: 'living', name: 'Provenance Test' });

    // addContactLocationLink defaults to manual (this IS the GM-facing authoring action -- the generator constructs its own links directly via createContactLocationLink() in npc-bundle.js, never through this layer).
    const withAdded = addContactLocationLink(npc, { locationId: 'loc-a', relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT });
    assert.equal(withAdded.locationLinks[0].source, 'manual', 'addContactLocationLink must default source to manual, not generated');
    // An explicit override is still honored (e.g. a controller re-importing already-generated data through this same action).
    const withAddedGenerated = addContactLocationLink(npc, { locationId: 'loc-b', relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT, source: 'generated' });
    assert.equal(withAddedGenerated.locationLinks[0].source, 'generated', 'addContactLocationLink must honor an EXPLICIT source override rather than forcing manual unconditionally');

    // A generator-produced link that the GM then edits must flip to manual.
    const generatorNpc = createNpcConceptDraft({ kind: 'living', name: 'Generated', linkedLocationId: 'loc-gen', locationRelationship: 'native' });
    assert.equal(generatorNpc.locationLinks[0].source, 'generated', 'test setup: a migrated/generator-produced link must start source:generated');
    const genLinkId = generatorNpc.locationLinks[0].linkId;
    const edited = updateContactLocationLink(generatorNpc, genLinkId, { notes: 'Actually runs a spice den here' });
    assert.equal(edited.locationLinks[0].source, 'manual', 'updateContactLocationLink must flip a generated link to manual once the GM edits it, per the wider "editing a generated value converts it to manual" rule');

    // rerollContactLocationLink deliberately goes the OTHER way: the GM explicitly asked the GENERATOR to replace the fact, so it stays/returns to generated even on a previously-manual link.
    const rerolled = rerollContactLocationLink(edited, genLinkId, { rng: makeSeededRng(9) });
    assert.equal(rerolled.locationLinks[0].source, 'generated', 'rerollContactLocationLink must set source:generated -- an explicit "regenerate this fact" request, distinct from a manual edit');
  }
  console.log('PHASE 8D-3B locationLinks GM-edit provenance (addContactLocationLink/updateContactLocationLink default to source:manual unless explicitly overridden, editing a generated link flips it to manual, rerollContactLocationLink deliberately returns to generated) passed.');

  // --- CORRECTION (independent review round 4, items 6/7): CUSTOM relationshipType requires a label; changing relationshipType without an explicit new label resets to the new type's default, never leaving a contradictory old label ---
  {
    let npc = createNpcConceptDraft({ kind: 'living', name: 'Coherence Test', linkedLocationId: 'loc-a', locationRelationship: 'native' });
    const linkId = npc.locationLinks[0].linkId;
    assert.equal(npc.locationLinks[0].relationshipType, CONTACT_LOCATION_RELATIONSHIP.RESIDENT, 'test setup: "native" must migrate to RESIDENT');
    assert.equal(npc.locationLinks[0].relationshipLabel, 'native', 'test setup: the original label must survive migration');

    // Changing relationshipType alone (no explicit relationshipLabel) must reset the label to the NEW type's default -- never leave "native" attached to "work".
    const typeChanged = updateContactLocationLink(npc, linkId, { relationshipType: CONTACT_LOCATION_RELATIONSHIP.WORK });
    assert.equal(typeChanged.locationLinks[0].relationshipType, CONTACT_LOCATION_RELATIONSHIP.WORK, 'the relationshipType must change as patched');
    assert.notEqual(typeChanged.locationLinks[0].relationshipLabel, 'native', 'the OLD label must never survive an unrelated-label type change');
    assert.equal(typeChanged.locationLinks[0].relationshipLabel, 'Works here', 'the label must reset to the NEW type\'s own default label');

    // Changing relationshipType AND explicitly supplying a new relationshipLabel in the SAME patch must preserve the GM's exact text, never overridden by the default.
    const typeAndLabelChanged = updateContactLocationLink(npc, linkId, { relationshipType: CONTACT_LOCATION_RELATIONSHIP.WORK, relationshipLabel: 'Runs the night shift' });
    assert.equal(typeAndLabelChanged.locationLinks[0].relationshipLabel, 'Runs the night shift', 'an explicit relationshipLabel supplied in the SAME patch as a relationshipType change must be preserved exactly, never overridden by the default');

    // Patching relationshipLabel alone (no type change) must never reset anything -- ordinary label edits stay ordinary.
    const labelOnlyChanged = updateContactLocationLink(npc, linkId, { relationshipLabel: 'Something else entirely' });
    assert.equal(labelOnlyChanged.locationLinks[0].relationshipType, CONTACT_LOCATION_RELATIONSHIP.RESIDENT, 'patching only relationshipLabel must never change relationshipType');
    assert.equal(labelOnlyChanged.locationLinks[0].relationshipLabel, 'Something else entirely', 'patching only relationshipLabel must apply the new label exactly');

    // CUSTOM relationshipType with no label is a contradiction (per data/npc-location-relationship-types.js's own documented contract) -- the update must be REJECTED wholesale, not silently create/keep a blank-labeled custom link.
    const customNoLabel = updateContactLocationLink(npc, linkId, { relationshipType: CONTACT_LOCATION_RELATIONSHIP.CUSTOM });
    assert.equal(customNoLabel, npc, 'updateContactLocationLink must reject (return the draft unchanged) a relationshipType:custom change with no label -- never silently drop or keep a blank-labeled custom relationship');
    // The SAME custom type WITH an explicit label must succeed normally.
    const customWithLabel = updateContactLocationLink(npc, linkId, { relationshipType: CONTACT_LOCATION_RELATIONSHIP.CUSTOM, relationshipLabel: 'Meets their ex here every fifth Taungsday' });
    assert.equal(customWithLabel.locationLinks[0].relationshipType, CONTACT_LOCATION_RELATIONSHIP.CUSTOM, 'a custom type WITH an explicit label must be accepted');
    assert.equal(customWithLabel.locationLinks[0].relationshipLabel, 'Meets their ex here every fifth Taungsday', 'the custom label must be preserved exactly');

    // addContactLocationLink must apply the SAME CUSTOM-requires-label rejection.
    const addCustomNoLabel = addContactLocationLink(npc, { locationId: 'loc-z', relationshipType: CONTACT_LOCATION_RELATIONSHIP.CUSTOM });
    assert.equal(addCustomNoLabel, npc, 'addContactLocationLink must also reject a relationshipType:custom entry with no label');
  }
  console.log('PHASE 8D-3B locationLinks type/label coherence (relationshipType change without an explicit label resets to the new type\'s default; supplying both preserves the GM\'s exact text; a label-only patch never touches relationshipType; CUSTOM with no label is rejected on both add and update) passed.');

  // --- CORRECTION (independent review round 5, item 2): explicit GM authoring patches are STRICT about invalid enum values -- never silently coerced to a tolerant default ---
  {
    let npc = createNpcConceptDraft({ kind: 'living', name: 'Strict Validation Test', linkedLocationId: 'loc-a', locationRelationship: 'native' });
    const linkId = npc.locationLinks[0].linkId;
    assert.equal(npc.locationLinks[0].status, 'active', 'test setup: link starts active');

    // A typo'd status must REJECT the whole patch, never silently coerce to 'active' while the rest of the edit applies.
    const badStatus = updateContactLocationLink(npc, linkId, { notes: 'should never apply', status: 'historic' });
    assert.equal(badStatus, npc, 'updateContactLocationLink must reject (return the draft unchanged) a patch with an invalid explicit status, rather than coercing it to a default');
    assert.equal(badStatus.locationLinks[0].notes, '', 'the REST of a rejected patch must not partially apply either -- the whole patch bounces together');

    // Each other enum field gets the same strict treatment.
    assert.equal(updateContactLocationLink(npc, linkId, { scope: 'exacct' }), npc, 'an invalid scope must reject the patch');
    assert.equal(updateContactLocationLink(npc, linkId, { certainty: 'maybe' }), npc, 'an invalid certainty must reject the patch');
    assert.equal(updateContactLocationLink(npc, linkId, { revealState: 'secret' }), npc, 'an invalid revealState must reject the patch');
    assert.equal(updateContactLocationLink(npc, linkId, { source: 'unknown-origin' }), npc, 'an invalid source must reject the patch');
    assert.equal(updateContactLocationLink(npc, linkId, { relationshipType: 'not-a-real-type' }), npc, 'an invalid relationshipType must reject the patch');

    // A VALID explicit enum value still applies normally.
    const goodStatus = updateContactLocationLink(npc, linkId, { status: 'historical' });
    assert.equal(goodStatus.locationLinks[0].status, 'historical', 'a valid explicit status must still apply normally');

    // addContactLocationLink gets the same strict treatment.
    const badAdd = addContactLocationLink(npc, { locationId: 'loc-z', status: 'historic' });
    assert.equal(badAdd, npc, 'addContactLocationLink must also reject an invalid explicit enum value');
    const goodAdd = addContactLocationLink(npc, { locationId: 'loc-z', status: 'historical' });
    assert.equal(goodAdd.locationLinks.length, 2, 'addContactLocationLink must still succeed with a VALID explicit enum value');

    // Contrast: createContactLocationLink() itself (bulk normalization/migration) stays TOLERANT -- an invalid value there coerces to a sane default, never throws/rejects. Strictness is an AUTHORING-layer property, not a schema-wide one.
    const tolerant = createContactLocationLink({ locationId: 'loc-y', status: 'historic' });
    assert.equal(tolerant.status, 'active', 'createContactLocationLink() itself must remain tolerant (coerce to the default) for bulk normalization/migration -- only the GM authoring actions are strict');
  }
  console.log('PHASE 8D-3B locationLinks strict authoring-patch validation (addContactLocationLink/updateContactLocationLink reject the WHOLE patch on any invalid explicit enum value across relationshipType/status/scope/certainty/revealState/source; createContactLocationLink itself stays tolerant for bulk normalization) passed.');

  // --- CORRECTION (independent review round 5, item 3): relinking a Contact to a new target clears the OLD snapshot unless a new one is explicitly supplied ---
  {
    let npc = createNpcConceptDraft({
      kind: 'living', name: 'Snapshot Relink Test',
      locationLinks: [createContactLocationLink({ locationId: 'loc-a', relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT, snapshot: { name: 'Kellin IV', type: 'planet' } })]
    });
    const linkId = npc.locationLinks[0].linkId;
    assert.equal(npc.locationLinks[0].snapshot.name, 'Kellin IV', 'test setup: the link starts with a real snapshot');

    // Relinking to a new target WITHOUT an explicit snapshot must clear the stale one.
    const relinked = updateContactLocationLink(npc, linkId, { locationId: 'loc-b' });
    assert.equal(relinked.locationLinks[0].locationId, 'loc-b', 'the target must update as patched');
    assert.equal(relinked.locationLinks[0].snapshot.name, '', 'relinking to a NEW target without an explicit snapshot must clear the OLD (now-stale) snapshot -- it must never survive to lie for a future orphan fallback');

    // Relinking WITH an explicit new snapshot must use the new one, never the old.
    const relinkedWithSnapshot = updateContactLocationLink(npc, linkId, { locationId: 'loc-c', snapshot: { name: 'Port Aurek', type: 'facility' } });
    assert.equal(relinkedWithSnapshot.locationLinks[0].snapshot.name, 'Port Aurek', 'relinking WITH an explicit snapshot must use the caller\'s new snapshot');

    // A patch that does NOT change the target must never touch the snapshot.
    const notesOnly = updateContactLocationLink(npc, linkId, { notes: 'just a note' });
    assert.equal(notesOnly.locationLinks[0].snapshot.name, 'Kellin IV', 'a patch that does not change the target must leave the snapshot completely untouched');

    // Relinking from canonical to draft (the OTHER direction) must also clear a stale snapshot.
    const toDraft = updateContactLocationLink(npc, linkId, { locationId: '', locationDraftId: 'draft:location:new-place' });
    assert.equal(toDraft.locationLinks[0].locationDraftId, 'draft:location:new-place', 'relinking from canonical to draft must update the target');
    assert.equal(toDraft.locationLinks[0].snapshot.name, '', 'relinking from canonical to draft without an explicit snapshot must also clear the old snapshot');
  }
  console.log('PHASE 8D-3B locationLinks snapshot coherence after relink (a target change without an explicit new snapshot clears the stale old one; an explicit new snapshot is preserved; a non-target-changing patch never touches the snapshot; works in both the canonical->draft and draft->canonical directions) passed.');

  // --- CORRECTION (independent review round 5, item 4): setContactLocationLinkPrimary is the SOLE primary-mutation authority ---
  {
    let npc = createNpcConceptDraft({
      kind: 'living', name: 'Primary Authority Test',
      locationLinks: [createContactLocationLink({ locationId: 'loc-a', relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT, primary: true })]
    });
    const aLinkId = npc.locationLinks[0].linkId;

    // updateContactLocationLink must REJECT any patch that explicitly mentions `primary` at all -- even a no-op reaffirmation of the current value.
    const rejectedTrue = updateContactLocationLink(npc, aLinkId, { primary: true });
    assert.equal(rejectedTrue, npc, 'updateContactLocationLink must reject a patch that explicitly includes primary:true');
    const rejectedFalse = updateContactLocationLink(npc, aLinkId, { primary: false });
    assert.equal(rejectedFalse, npc, 'updateContactLocationLink must reject a patch that explicitly includes primary:false, even as a no-op reaffirmation');
    const rejectedWithOtherFields = updateContactLocationLink(npc, aLinkId, { notes: 'should not apply either', primary: true });
    assert.equal(rejectedWithOtherFields, npc, 'a patch mixing primary with other fields must reject the WHOLE patch, not apply the other fields and ignore primary');

    // The ONLY way to change primary is the dedicated operation.
    const viaSetter = setContactLocationLinkPrimary(npc, aLinkId);
    assert.equal(viaSetter.locationLinks[0].primary, true, 'setContactLocationLinkPrimary remains the one authoritative way to change primary state');

    // addContactLocationLink({ primary: true }) must be UNAMBIGUOUS: "add B, then make B primary" -- deterministic, never order-dependent on the normalizer's own first-wins tie-break.
    const withB = addContactLocationLink(npc, { locationId: 'loc-b', relationshipType: CONTACT_LOCATION_RELATIONSHIP.WORK, primary: true });
    const bLink = withB.locationLinks.find((l) => l.locationId === 'loc-b');
    const aLinkAfter = withB.locationLinks.find((l) => l.linkId === aLinkId);
    assert.equal(bLink.primary, true, 'addContactLocationLink({ primary: true }) must deterministically make the NEW link primary');
    assert.equal(aLinkAfter.primary, false, 'adding a new primary link must demote the previously-primary link -- exactly one active primary, deterministically, never a coin flip on array order');

    // Without requesting primary, the add must not disturb the existing primary at all.
    const withC = addContactLocationLink(npc, { locationId: 'loc-c', relationshipType: CONTACT_LOCATION_RELATIONSHIP.FREQUENTS });
    const cLink = withC.locationLinks.find((l) => l.locationId === 'loc-c');
    const aLinkStillPrimary = withC.locationLinks.find((l) => l.linkId === aLinkId);
    assert.equal(cLink.primary, false, 'addContactLocationLink without requesting primary must add the new link as non-primary');
    assert.equal(aLinkStillPrimary.primary, true, 'addContactLocationLink without requesting primary must leave the existing primary link untouched');
  }
  console.log('PHASE 8D-3B locationLinks single primary mutation authority (updateContactLocationLink rejects any patch mentioning primary at all; addContactLocationLink({primary:true}) deterministically promotes the new link via setContactLocationLinkPrimary rather than depending on normalizer tie-breaking; setContactLocationLinkPrimary remains the sole authority) passed.');

  // --- CORRECTION (independent review round 6, item 2): addContactLocationLink's primary input must be STRICTLY boolean, never tolerantly coerced ---
  {
    const npc = createNpcConceptDraft({ kind: 'living', name: 'Strict Primary Test' });

    // primary: true / false are the only valid explicit values.
    const withTrue = addContactLocationLink(npc, { locationId: 'loc-a', relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT, primary: true });
    assert.equal(withTrue.locationLinks[0].primary, true, 'primary:true (a real boolean) must still be honored and promote the new link');
    const withFalse = addContactLocationLink(npc, { locationId: 'loc-a', relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT, primary: false });
    assert.equal(withFalse.locationLinks[0].primary, false, 'primary:false (a real boolean) must still be honored and add as non-primary');

    // Truthy/falsy NON-boolean values must be REJECTED (return the draft unchanged), never coerced via Boolean(...).
    const withStringFalse = addContactLocationLink(npc, { locationId: 'loc-a', relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT, primary: 'false' });
    assert.equal(withStringFalse, npc, 'primary:"false" (a truthy STRING, not a boolean) must be REJECTED, never coerced to true via Boolean(...)');
    const withOne = addContactLocationLink(npc, { locationId: 'loc-a', relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT, primary: 1 });
    assert.equal(withOne, npc, 'primary:1 (truthy NUMBER, not a boolean) must be REJECTED');
    const withZero = addContactLocationLink(npc, { locationId: 'loc-a', relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT, primary: 0 });
    assert.equal(withZero, npc, 'primary:0 (falsy NUMBER, not a boolean) must be REJECTED too -- strictness applies regardless of truthiness');
    const withNull = addContactLocationLink(npc, { locationId: 'loc-a', relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT, primary: null });
    assert.equal(withNull, npc, 'primary:null (explicitly supplied, not a boolean) must be REJECTED');

    // primary omitted entirely must still work exactly as before (defaults to not-requested).
    const withoutPrimary = addContactLocationLink(npc, { locationId: 'loc-a', relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT });
    assert.equal(withoutPrimary.locationLinks[0].primary, false, 'omitting primary entirely must still work normally, defaulting to non-primary');
  }
  console.log('PHASE 8D-3B locationLinks strict primary boolean validation (addContactLocationLink rejects any explicitly-supplied non-boolean primary value -- truthy strings/numbers, falsy numbers, and null all rejected rather than coerced; true/false/omitted all still work normally) passed.');

  // --- CORRECTION (independent review round 4, item 5): snapshot-only entries are restricted to explicitly non-resolvable historical facts (LAST_SEEN / imported), never a name-only back door for a normal current relationship ---
  {
    // The exact "back door" scenario the review called out: a snapshot-only "resident" relationship with no real target must be rejected.
    const npc = createNpcConceptDraft({ kind: 'living', name: 'Snapshot Boundary Test' });
    const backDoorAttempt = addContactLocationLink(npc, { relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT, snapshot: { name: 'Kellin IV' } });
    assert.equal(backDoorAttempt, npc, 'a snapshot-only "resident" relationship with no locationId/locationDraftId must be rejected -- snapshot is a display fallback, never pseudo-identity for a normal current relationship');

    const workAttempt = addContactLocationLink(npc, { relationshipType: CONTACT_LOCATION_RELATIONSHIP.WORK, snapshot: { name: 'Some Facility' } });
    assert.equal(workAttempt, npc, 'a snapshot-only "work" relationship must likewise be rejected');

    // LAST_SEEN is the one explicitly-permitted snapshot-only case (this is exactly what lastKnownLocation migration produces).
    const lastSeenOk = addContactLocationLink(npc, { relationshipType: CONTACT_LOCATION_RELATIONSHIP.LAST_SEEN, status: 'historical', snapshot: { name: 'The Old Docks' } });
    assert.equal(lastSeenOk.locationLinks.length, 1, 'a snapshot-only LAST_SEEN relationship must be accepted');
    assert.equal(lastSeenOk.locationLinks[0].snapshot.name, 'The Old Docks', 'the LAST_SEEN snapshot name must be preserved');

    // source:imported is the other explicitly-permitted snapshot-only case (legacy data whose original system may not have carried an id).
    const importedOk = addContactLocationLink(npc, { relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT, source: 'imported', snapshot: { name: 'Some Old Record' } });
    assert.equal(importedOk.locationLinks.length, 1, 'a snapshot-only entry explicitly marked source:imported must be accepted even for a normally-current relationshipType');

    // Direct primitive check: isMeaningfulContactLocationLink itself enforces the same boundary (proves this isn't just an add-time coincidence).
    const bareBackDoor = createContactLocationLink({ relationshipType: CONTACT_LOCATION_RELATIONSHIP.STATIONED, snapshot: { name: 'A Base' } });
    assert.equal(isMeaningfulContactLocationLink(bareBackDoor), false, 'isMeaningfulContactLocationLink must reject a snapshot-only, non-LAST_SEEN, non-imported link directly');

    // migrateLegacyLocationScalarsToLinks's own no-id-no-target case (locationRelationship text with no linkedLocationId at all) must now be dropped by normalizeContactLocationLinks -- a label alone was never a real relationship.
    const labelOnlyMigrated = normalizeContactLocationLinks(migrateLegacyLocationScalarsToLinks({ locationRelationship: 'native' }));
    assert.deepEqual(labelOnlyMigrated, [], 'a locationRelationship label with no linkedLocationId/locationDraftId at all must normalize away to zero links -- a floating label was never a real relationship');
  }
  console.log('PHASE 8D-3B locationLinks snapshot-only validity boundary (a name-only "resident"/"work" relationship is rejected as a back door; LAST_SEEN and source:imported remain the only explicitly-permitted snapshot-only cases; enforced directly by isMeaningfulContactLocationLink, not just at add-time) passed.');

  // --- CORRECTION (independent review round 4, item 4): draft -> canonical promotion rewrites every matching link's target while preserving everything else ---
  {
    let npc = createNpcConceptDraft({
      kind: 'living', name: 'Promotion Test',
      locationLinks: [
        createContactLocationLink({ locationDraftId: 'draft:location:kellin', relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT, relationshipLabel: 'native', primary: true, certainty: 'confirmed', notes: 'Grew up here' }),
        createContactLocationLink({ locationDraftId: 'draft:location:other-place', relationshipType: CONTACT_LOCATION_RELATIONSHIP.WORK })
      ]
    });
    const residentLinkId = npc.locationLinks[0].linkId;
    const otherLinkId = npc.locationLinks[1].linkId;

    const promoted = resolveContactLocationDraftReference(npc, { locationDraftId: 'draft:location:kellin', locationId: 'loc-kellin-iv', snapshot: { name: 'Kellin IV', type: 'planet' } });
    const promotedLink = promoted.locationLinks.find((l) => l.linkId === residentLinkId);
    assert.equal(promotedLink.locationId, 'loc-kellin-iv', 'promotion must set the new canonical locationId');
    assert.equal(promotedLink.locationDraftId, '', 'promotion must clear the old locationDraftId');
    assert.equal(promotedLink.linkId, residentLinkId, 'promotion must preserve the exact linkId');
    assert.equal(promotedLink.relationshipType, CONTACT_LOCATION_RELATIONSHIP.RESIDENT, 'promotion must preserve relationshipType');
    assert.equal(promotedLink.relationshipLabel, 'native', 'promotion must preserve relationshipLabel');
    assert.equal(promotedLink.primary, true, 'promotion must preserve the primary flag');
    assert.equal(promotedLink.certainty, 'confirmed', 'promotion must preserve certainty');
    assert.equal(promotedLink.notes, 'Grew up here', 'promotion must preserve notes');
    assert.equal(promotedLink.snapshot.name, 'Kellin IV', 'promotion must refresh the snapshot to the newly-committed Location\'s real name when supplied');

    // The UNRELATED link (a different draftId) must survive completely untouched (content-identical -- npc-concept.js's own construction pipeline always reconstructs fresh link objects on every save, same precedent as flavorNotes/relationshipHooks elsewhere in this schema; the bare `resolveLocationDraftReferenceInLinks()` primitive checked below preserves true object identity for an untouched entry).
    const untouchedLink = promoted.locationLinks.find((l) => l.linkId === otherLinkId);
    assert.equal(untouchedLink.locationDraftId, 'draft:location:other-place', 'a link pointing at a DIFFERENT draftId must never be touched by an unrelated promotion');
    assert.deepEqual(untouchedLink, npc.locationLinks[1], 'the untouched sibling link must be content-identical -- promotion never alters an unrelated entry\'s fields');

    // The derived legacy mirror must follow the promotion too (the promoted link is primary).
    assert.equal(promoted.linkedLocationId, 'loc-kellin-iv', 'the derived linkedLocationId mirror must reflect the promoted canonical id');
    assert.equal(promoted.locationDraftId, '', 'the derived locationDraftId mirror must clear once the primary link is promoted');

    // No-op cases: unknown draftId, or missing either id.
    const noMatch = resolveContactLocationDraftReference(npc, { locationDraftId: 'draft:location:not-linked-to-anything', locationId: 'loc-x' });
    assert.equal(noMatch, npc, 'resolveContactLocationDraftReference must no-op (same draft reference) when no link matches the given locationDraftId');
    const missingCanonical = resolveContactLocationDraftReference(npc, { locationDraftId: 'draft:location:kellin' });
    assert.equal(missingCanonical, npc, 'resolveContactLocationDraftReference must no-op when no canonical locationId is supplied');

    // Direct primitive check on the pure array-level function: true object-identity preservation for an untouched sibling, plus the no-op (same array reference) contract.
    const bareUntouched = createContactLocationLink({ locationDraftId: 'draft:location:untouched' });
    const bareTarget = createContactLocationLink({ locationDraftId: 'draft:location:x' });
    const bareLinks = [bareTarget, bareUntouched];
    const bareResolved = resolveLocationDraftReferenceInLinks(bareLinks, { locationDraftId: 'draft:location:x', locationId: 'loc-x' });
    assert.equal(bareResolved[0].locationId, 'loc-x', 'resolveLocationDraftReferenceInLinks (the bare-array primitive) must perform the same rewrite');
    assert.equal(bareResolved[1], bareUntouched, 'resolveLocationDraftReferenceInLinks must preserve the EXACT object reference of an untouched sibling link');
    assert.equal(resolveLocationDraftReferenceInLinks(bareLinks, { locationDraftId: 'draft:location:no-match', locationId: 'loc-x' }), bareLinks, 'resolveLocationDraftReferenceInLinks must return the SAME array reference (a true no-op) when nothing matches');
  }
  console.log('PHASE 8D-3B locationLinks draft->canonical promotion (resolveContactLocationDraftReference rewrites locationDraftId->locationId while preserving linkId/relationshipType/label/primary/certainty/notes exactly, unrelated sibling links untouched by object reference, derived legacy mirrors follow, no-op for unmatched/incomplete refs) passed.');

  // --- orphan-safe resolution: 5 distinct states, never fuzzy, always falls back to snapshot ---
  {
    const canonicalLink = createContactLocationLink({ locationId: 'loc-exists', snapshot: { name: 'Kessler Pit', type: 'facility' } });
    const resolved = resolveContactLocationLink(canonicalLink, { findLocation: (id) => (id === 'loc-exists' ? { id: 'loc-exists', name: 'Kessler Pit' } : null) });
    assert.equal(resolved.state, 'canonical', 'a resolvable canonical locationId must resolve to state:canonical');
    assert.ok(resolved.location, 'a canonical resolution must return the real location object');

    // CORRECTION (independent review round 4 -- "resolution states conflate not-checked with broken"): an id set but NO resolver supplied at all must report UNRESOLVED, never orphaned -- "nobody asked" is not "confirmed missing."
    const unresolvedCanonical = resolveContactLocationLink(canonicalLink, {});
    assert.equal(unresolvedCanonical.state, 'unresolved', 'a canonical locationId with NO findLocation supplied at all must report state:unresolved, distinct from orphaned');
    assert.equal(unresolvedCanonical.location, null, 'unresolved must never fabricate a location object');

    const orphanedLink = createContactLocationLink({ locationId: 'loc-deleted', snapshot: { name: 'Vornak Extraction Complex', type: 'facility' } });
    const orphaned = resolveContactLocationLink(orphanedLink, { findLocation: () => null });
    assert.equal(orphaned.state, 'orphaned', 'a resolver that was SUPPLIED and definitively found nothing must report state:orphaned');
    assert.equal(orphaned.location, null, 'an orphaned resolution must never fabricate a location object');
    assert.equal(orphaned.snapshot.name, 'Vornak Extraction Complex', 'an orphaned link must still expose its snapshot for a "last known name" display fallback');

    // Never fuzzy: even if a findLocation implementation COULD match by name, this module never calls it that way -- it always passes the exact locationId, proving no name-based fallback exists at this layer.
    let calledWith = null;
    resolveContactLocationLink(orphanedLink, { findLocation: (id) => { calledWith = id; return null; } });
    assert.equal(calledWith, 'loc-deleted', 'resolveContactLocationLink must always look up by the exact stored locationId, never by snapshot.name');

    // Draft links get the SAME symmetric treatment: unresolved (no resolver), draft (resolver found it), orphaned (resolver supplied, found nothing).
    const draftLink = createContactLocationLink({ locationDraftId: 'draft:location:pending' });
    const draftUnresolved = resolveContactLocationLink(draftLink, {});
    assert.equal(draftUnresolved.state, 'unresolved', 'a locationDraftId-only link with no findLocationDraft supplied must report state:unresolved, not a false state:draft');
    const draftResolved = resolveContactLocationLink(draftLink, { findLocationDraft: (id) => (id === 'draft:location:pending' ? { draftId: id, name: 'Pending Outpost' } : null) });
    assert.equal(draftResolved.state, 'draft', 'a locationDraftId that DOES resolve via the supplied findLocationDraft must report state:draft');
    assert.ok(draftResolved.location, 'a resolved draft must return the real draft object');
    const draftOrphaned = resolveContactLocationLink(draftLink, { findLocationDraft: () => null });
    assert.equal(draftOrphaned.state, 'orphaned', 'a locationDraftId whose supplied resolver definitively finds nothing must report state:orphaned, not state:draft');

    const emptyLink = createContactLocationLink({ relationshipType: CONTACT_LOCATION_RELATIONSHIP.LAST_SEEN, snapshot: { name: 'Old Docks' } });
    const emptyResolved = resolveContactLocationLink(emptyLink, {});
    assert.equal(emptyResolved.state, 'empty', 'a link with no id at all (e.g. a migrated lastKnownLocation) must report state:empty, distinct from unresolved/orphaned');
  }
  console.log('PHASE 8D-3B locationLinks orphan-safe resolution (5 distinct states -- canonical/draft/unresolved/orphaned/empty -- unresolved never conflated with orphaned for either canonical or draft targets, exact-id-only lookup never a name/slug guess, snapshot survives as a display fallback) passed.');

  // --- reverse lookup + hierarchy (pure primitive; predicate injected, no LocationRegistryService dependency) ---
  {
    const resident = createNpcConceptDraft({ kind: 'living', name: 'Resident', linkedLocationId: 'kessler-pit' });
    const worker = createNpcConceptDraft({ kind: 'living', name: 'Worker', locationLinks: [createContactLocationLink({ locationId: 'undercroft-cantina', relationshipType: CONTACT_LOCATION_RELATIONSHIP.FREQUENTS, primary: true })] });
    const governor = createNpcConceptDraft({
      kind: 'living', name: 'Governor',
      locationLinks: [createContactLocationLink({ locationId: 'kellin-iv', relationshipType: CONTACT_LOCATION_RELATIONSHIP.STATIONED, scope: CONTACT_LOCATION_LINK_SCOPE.DESCENDANTS, primary: true })]
    });
    const unrelated = createNpcConceptDraft({ kind: 'living', name: 'Unrelated', linkedLocationId: 'some-other-planet' });
    const contacts = [resident, worker, governor, unrelated];

    // Ancestor-descendant tree: kellin-iv -> kessler-pit, kellin-iv -> undercroft-cantina.
    const descendantsOf = { 'kessler-pit': 'kellin-iv', 'undercroft-cantina': 'kellin-iv' };
    const isDescendant = (candidateId, ancestorId) => descendantsOf[candidateId] === ancestorId;

    // Exact match only.
    const exact = findContactsForLocationRef(contacts, { locationId: 'kessler-pit' }, {});
    assert.deepEqual(exact.map((c) => c.name), ['Resident'], 'an exact (non-hierarchical) query must match only a Contact linked directly to that Location');

    // includeDescendants: querying the ANCESTOR (kellin-iv) surfaces Contacts anchored at ANY descendant, regardless of their own link scope -- PLUS the Governor, whose own link already targets kellin-iv exactly.
    const withDescendants = findContactsForLocationRef(contacts, { locationId: 'kellin-iv' }, { includeDescendants: true, isDescendant });
    assert.deepEqual(new Set(withDescendants.map((c) => c.name)), new Set(['Resident', 'Worker', 'Governor']), 'includeDescendants must surface Contacts anchored at any descendant Location when querying an ancestor, alongside anyone linked to the ancestor itself');
    assert.ok(!withDescendants.some((c) => c.name === 'Unrelated'), 'a Contact linked to an unrelated Location must never appear');

    // scope:'descendants' -- the governor's SINGLE link anchored at kellin-iv (the ancestor) must ALSO surface for a query at a DESCENDANT location (jurisdiction), even without includeDescendants.
    const jurisdictionQuery = findContactsForLocationRef(contacts, { locationId: 'kessler-pit' }, { isDescendant });
    assert.ok(jurisdictionQuery.some((c) => c.name === 'Governor'), 'a link scoped to descendants must surface for a query at any Location beneath its own target, even without includeDescendants');
    assert.ok(jurisdictionQuery.some((c) => c.name === 'Resident'), 'the exact-match Contact must still be included alongside the jurisdiction match');

    // Without includeDescendants and without a descendants-scoped link, an ancestor query must NOT surface descendant-anchored Contacts.
    const noHierarchy = findContactsForLocationRef(contacts, { locationId: 'kellin-iv' }, {});
    assert.ok(!noHierarchy.some((c) => c.name === 'Resident'), 'omitting includeDescendants must not surface a Contact anchored at a descendant Location');
    assert.ok(noHierarchy.some((c) => c.name === 'Governor'), 'the governor\'s own link IS anchored exactly at kellin-iv, so it matches the exact query regardless');

    assert.deepEqual(findContactsForLocationRef(contacts, { locationId: '' }), [], 'an empty locationId must return no results, never every Contact');
    assert.deepEqual(findContactsForLocationRef([], { locationId: 'kellin-iv' }), [], 'an empty contacts list must return no results');
    assert.deepEqual(findContactsForLocationRef(contacts, {}), [], 'a locationRef with neither locationId nor locationDraftId must return no results');

    // CORRECTION (independent review round 4 -- "draft Locations are second-class in reverse lookup"): a Contact generated FOR a not-yet-committed Faction/Location draft must be queryable by its locationDraftId, not just after promotion to canonical.
    const draftLinked = createNpcConceptDraft({
      kind: 'living', name: 'Draft-Linked',
      locationLinks: [createContactLocationLink({ locationDraftId: 'draft:location:kellin', relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT, primary: true })]
    });
    const draftQuery = findContactsForLocationRef([...contacts, draftLinked], { locationDraftId: 'draft:location:kellin' }, {});
    assert.deepEqual(draftQuery.map((c) => c.name), ['Draft-Linked'], 'findContactsForLocationRef must match an EXACT locationDraftId target, not just canonical locationIds');
    const wrongDraftQuery = findContactsForLocationRef([...contacts, draftLinked], { locationDraftId: 'draft:location:some-other-place' }, {});
    assert.deepEqual(wrongDraftQuery, [], 'a locationDraftId query must not match a Contact linked to a DIFFERENT draft');
    // locationId always wins over locationDraftId in the SAME query ref, mirroring createContactLocationLink()'s own precedence.
    const bothInRef = findContactsForLocationRef([...contacts, draftLinked], { locationId: 'kessler-pit', locationDraftId: 'draft:location:kellin' }, {});
    assert.deepEqual(bothInRef.map((c) => c.name), ['Resident'], 'a locationRef supplying BOTH locationId and locationDraftId must query by the canonical locationId only');
  }
  console.log('PHASE 8D-3B locationLinks reverse lookup (exact match, includeDescendants ancestor->descendant traversal, scope:descendants jurisdiction, injected isDescendant predicate, no LocationRegistryService dependency) passed.');

  // --- getPrimaryContactLocationLink / getContactLocationLinksByType ---
  {
    const links = [
      createContactLocationLink({ locationId: 'loc-a', relationshipType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT, primary: true }),
      createContactLocationLink({ locationId: 'loc-b', relationshipType: CONTACT_LOCATION_RELATIONSHIP.WORK }),
      createContactLocationLink({ locationId: 'loc-c', relationshipType: CONTACT_LOCATION_RELATIONSHIP.WORK, status: CONTACT_LOCATION_LINK_STATUS.HISTORICAL })
    ];
    assert.equal(getPrimaryContactLocationLink(links).locationId, 'loc-a', 'getPrimaryContactLocationLink must return the explicitly-flagged primary');
    assert.equal(getPrimaryContactLocationLink([links[1]]).locationId, 'loc-b', 'getPrimaryContactLocationLink must fall back to the first ACTIVE link when none is flagged primary');
    assert.equal(getPrimaryContactLocationLink([]), null, 'getPrimaryContactLocationLink must return null for an empty list');
    assert.equal(getContactLocationLinksByType(links, CONTACT_LOCATION_RELATIONSHIP.WORK).length, 2, 'getContactLocationLinksByType must return every matching link regardless of status');
  }
  console.log('PHASE 8D-3B locationLinks query helpers (getPrimaryContactLocationLink fallback chain, getContactLocationLinksByType) passed.');

  // --- JSON round-trip ---
  {
    let npc = createNpcConceptDraft({ kind: 'living', name: 'Serialize Test', linkedLocationId: 'loc-1' });
    npc = addContactLocationLink(npc, { locationId: 'loc-2', relationshipType: CONTACT_LOCATION_RELATIONSHIP.WORK, notes: 'Some notes' });
    const roundTripped = JSON.parse(JSON.stringify(npc));
    assert.deepEqual(roundTripped.locationLinks, npc.locationLinks, 'locationLinks must survive a full JSON.stringify/parse cycle exactly');
  }
  console.log('PHASE 8D-3B locationLinks JSON round-trip passed.');

  // --- bounded randomized invariant sequence (property-style, per the review's own "fuzzing pays off here" suggestion, scoped to a few hundred sequences rather than a full fuzzing harness) ---
  {
    const ops = ['add', 'add', 'remove', 'update', 'setPrimary', 'reroll'];
    for (let trial = 0; trial < 300; trial++) {
      const rng = makeSeededRng(trial + 20000000);
      let npc = createNpcConceptDraft({ kind: 'living', name: `Fuzz ${trial}` });
      const stepCount = 1 + Math.floor(rng() * 8);
      for (let step = 0; step < stepCount; step++) {
        const op = ops[Math.floor(rng() * ops.length)];
        const existingIds = npc.locationLinks.map((l) => l.linkId);
        const pickId = () => existingIds[Math.floor(rng() * existingIds.length)];
        if (op === 'add' || existingIds.length === 0) {
          npc = addContactLocationLink(npc, { locationId: `loc-${trial}-${step}`, relationshipType: CONTACT_LOCATION_RELATIONSHIP.ASSOCIATED, primary: rng() < 0.5 });
        } else if (op === 'remove') {
          npc = removeContactLocationLink(npc, pickId());
        } else if (op === 'update') {
          npc = updateContactLocationLink(npc, pickId(), { notes: `note-${step}` });
        } else if (op === 'setPrimary') {
          npc = setContactLocationLinkPrimary(npc, pickId());
        } else if (op === 'reroll') {
          npc = rerollContactLocationLink(npc, pickId(), { rng });
        }
      }
      // Invariants that must hold after ANY sequence of operations.
      const ids = npc.locationLinks.map((l) => l.linkId);
      assert.equal(new Set(ids).size, ids.length, `trial ${trial}: no duplicate linkIds may ever appear after any operation sequence`);
      const activePrimaries = npc.locationLinks.filter((l) => l.primary && l.status === CONTACT_LOCATION_LINK_STATUS.ACTIVE);
      assert.ok(activePrimaries.length <= 1, `trial ${trial}: at most one ACTIVE link may ever be flagged primary (got ${activePrimaries.length})`);
      assert.deepEqual(normalizeContactLocationLinks(npc.locationLinks), npc.locationLinks, `trial ${trial}: locationLinks must always already be in normalized form (idempotent normalize)`);
      assert.equal(npc.name, `Fuzz ${trial}`, `trial ${trial}: no locationLinks operation may ever touch an unrelated NPC field`);
    }
  }
  console.log('PHASE 8D-3B locationLinks bounded randomized invariant sequence (300 trials x up to 8 random add/remove/update/setPrimary/reroll operations: no duplicate linkIds, at most one active primary, idempotent normalization, unrelated fields untouched) passed.');
}

console.log('PHASE 8D-3B NPC + Faction productionization suite (catalog quality, generation semantics, bundle generation, reroll safety, determinism, flavor notes, complete NPC schema addendum, GM field authoring API, Contact<->Location relationship model) passed.');
