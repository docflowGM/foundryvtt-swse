/**
 * PHASE 8D-3B production — full Faction draft composer + reroll/
 * regenerate operations (`GENERATE_NEW_FACTION` support).
 *
 * Composes every existing Phase 8D-1/8D-2 Faction sub-generator plus
 * this phase's own new pieces (`faction-archetype.js`,
 * `data/faction-presets.js`, `npc/npc-bundle.js`) into ONE
 * `faction-draft.js` draft. Deliberately just composition, matching
 * `planets/planet-draft.js`/`planet-bundle.js`'s own "avoid the
 * procedural god object" discipline -- this module owns no table data
 * and picks nothing directly except the few small NEW glue tables
 * declared right here (scale band, contact count, problem count,
 * leadership-boost curve) that have no other natural home.
 *
 * Still a DRAFT — no canonical Faction record is created here. Commit
 * remains `FactionRegistryService.upsertFaction()`'s job, exactly as
 * `faction-draft.js`'s own header documents; `contacts` stay
 * `npc-concept.js` drafts, promoted individually later via
 * `FactionRegistryService.promoteFactionContactToActor()`.
 *
 * `createProceduralFactionDraft()` (and every operation below that
 * touches `contacts`) is ASYNC — the one Foundry-dependent step is
 * `npc/npc-bundle.js`'s name resolution, isolated behind an injectable
 * provider exactly as that module's own header documents. Every
 * OTHER Faction field is resolved synchronously before that point.
 */

import { createFactionDraft, updateFactionDraft } from '../faction-draft.js';
import { createFactionDoctrineDraft, suggestDoctrineUsageForScale, DOCTRINE_USAGE_LEVEL } from '../faction-doctrine-draft.js';
import { getRandomFactionName } from '../names/faction-name-generator.js';
import { pickFactionArchetype } from './faction-archetype.js';
import { getFactionPreset, getFactionPresetForArchetype } from '../data/faction-presets.js';
import { ORGANIZATION_FAMILY, FACTION_ARCHETYPE_FAMILY, describeScale } from '../organization-metadata.js';
import { generateFactionGoalSet } from './faction-goals.js';
import { pickFactionInstitutionalCharacter } from './faction-institutional-character.js';
import { pickFactionLeadershipStructure } from './faction-leadership-structure.js';
import { pickFactionInternalProblems } from './faction-internal-problems.js';
import { generateFactionResourceProfile } from './faction-resource-profile.js';
import {
  pickPopulationModeForArchetype, createPopulationProfile, MEMBERSHIP_POLICY, isMembershipPolicy
} from '../population-profile.js';
import { defaultLocalityBiasForArchetype, createRecruitmentProfile } from '../recruitment-profile.js';
import {
  createFactionRelationshipDraftSet, addFactionRelationship, createGeneratedFactionRelationshipConcept, FACTION_RELATIONSHIP_KIND
} from '../faction-relationship-draft.js';
import { createGeneratedNpcConcept } from '../npc/npc-bundle.js';
import { rerollNpcFlavorNotes, rerollNpcFlavorNote } from '../npc/npc-flavor.js';
import { NPC_ROLES } from '../data/npc-roles.js';
import { ARCHETYPE_RANK_TIER_MAP, MILITARY_RANK_TIER_MAP } from '../rank-metadata.js';
import { weightedPick, weightedPickUniqueN, randomIntInclusive } from '../lib/weighted-random.js';
import { createProvenance, withWarning } from '../provenance.js';
import { DIAGNOSTIC_CODE } from '../lib/generator-diagnostics.js';
import { createDraftId } from '../lib/draft-id.js';

function clampScale(scale) {
  const n = Number(scale);
  if (!Number.isFinite(n)) return 1;
  return Math.min(20, Math.max(1, Math.round(n)));
}

/** Weighted Scale-band roll: most generated Factions land small-to-mid; a truly galactic-scale organization is the rare exception, matching `organization-metadata.js`'s own SCALE_BANDS framing ("Small Localized Group" through "Entire Galaxy"). */
const SCALE_ROLL_BANDS = Object.freeze([
  { min: 1, max: 4, weight: 5 },
  { min: 5, max: 8, weight: 4 },
  { min: 9, max: 12, weight: 2 },
  { min: 13, max: 16, weight: 1 },
  { min: 17, max: 20, weight: 0.3 }
]);

/** Roll a Scale value (1-20), see `SCALE_ROLL_BANDS` above. */
export function rollFactionScale({ rng } = {}) {
  const band = weightedPick(SCALE_ROLL_BANDS, { rng, weightOf: (b) => b.weight });
  const resolved = band || SCALE_ROLL_BANDS[0];
  return randomIntInclusive(resolved.min, resolved.max, { rng });
}

/** How many generated Contacts a Faction of the given Scale gets, banded (never a hard formula) -- larger organizations plausibly have more named personnel worth tracking, but this is a GM-facing starting point, not a headcount simulation. */
function contactCountForScale(scale, { rng } = {}) {
  if (scale <= 4) return randomIntInclusive(2, 3, { rng });
  if (scale <= 10) return randomIntInclusive(3, 5, { rng });
  if (scale <= 16) return randomIntInclusive(4, 6, { rng });
  return randomIntInclusive(5, 8, { rng });
}

/** How many internal problems a Faction rolls -- larger, more scrutinized organizations plausibly accumulate more. */
function problemCountForScale(scale, { rng } = {}) {
  if (scale <= 4) return 1;
  if (scale <= 12) return randomIntInclusive(1, 2, { rng });
  return randomIntInclusive(2, 3, { rng });
}

/** `DOCTRINE_USAGE_LEVEL` -> `npc-bundle.js`'s `leadershipBoost` multiplier -- a Faction with high elite availability generates a roster that skews (softly, never exclusively) toward more leaders/specialists. */
const LEADERSHIP_BOOST_BY_USAGE = Object.freeze({
  [DOCTRINE_USAGE_LEVEL.NONE]: 0.5,
  [DOCTRINE_USAGE_LEVEL.LOW]: 0.85,
  [DOCTRINE_USAGE_LEVEL.MODERATE]: 1.3,
  [DOCTRINE_USAGE_LEVEL.HIGH]: 2.0
});

function rolesByTier(tier) {
  return NPC_ROLES.filter((entry) => entry.tier === tier);
}

/** Roll a Faction's doctrine (see `faction-doctrine-draft.js`), including this phase's new commonRoles/specialistRoles/leadershipRoles picks from the SAME `data/npc-roles.js` pool `npc/npc-role.js` uses for individual NPCs -- one role vocabulary shared by both the Faction-level doctrine summary and the per-Contact role roll, never two. */
function generateFactionDoctrine({ scale, preferTags, rng, archetype, family }) {
  const base = suggestDoctrineUsageForScale(scale);
  const commonRoles = weightedPickUniqueN(rolesByTier('common'), 3, { rng, preferTags }).map((e) => e.value);
  const specialistRoles = weightedPickUniqueN(rolesByTier('specialist'), 2, { rng, preferTags }).map((e) => e.value);
  const leadershipRoles = weightedPickUniqueN(rolesByTier('leadership'), scale >= 9 ? 2 : 1, { rng, preferTags }).map((e) => e.value);
  return createFactionDoctrineDraft({
    ...base,
    commonRoles,
    specialistRoles,
    leadershipRoles,
    preferredProfileTags: [...new Set([archetype, family, ...preferTags])].slice(0, 8),
    environmentAffinities: [...preferTags],
    doctrineTags: [archetype, family]
  });
}

/** Roll 0-2 generated (unresolved) ally/enemy relationship concepts -- most Factions get one of each, some get none, a few get an extra rival. Never references a real canonical Faction (see `faction-relationship-draft.js`'s own "generated concept, never a fake id" rule). */
function generateFactionRelationships({ rng, family }) {
  let set = createFactionRelationshipDraftSet();
  const allyRoll = (rng ?? Math.random)();
  if (allyRoll < 0.65) {
    const allyName = getRandomFactionName({ family, rng }).name;
    set = addFactionRelationship(set, createGeneratedFactionRelationshipConcept({ kind: FACTION_RELATIONSHIP_KIND.ALLY, name: allyName, note: 'Generated ally concept -- not yet a canonical Faction.' }));
  }
  const enemyRoll = (rng ?? Math.random)();
  if (enemyRoll < 0.70) {
    const enemyName = getRandomFactionName({ family, rng }).name;
    set = addFactionRelationship(set, createGeneratedFactionRelationshipConcept({ kind: FACTION_RELATIONSHIP_KIND.ENEMY, name: enemyName, note: 'Generated enemy concept -- not yet a canonical Faction.' }));
  }
  return set;
}

/** Small archetypes (street gangs, secret societies, clans) at a huge Scale, or normally-large archetypes (governments, militaries, corporations) at a tiny Scale, are unusual-but-not-impossible combinations -- flagged via the existing `FACTION_RESOURCE_MISMATCH`/`FACTION_POPULATION_MISMATCH` diagnostic codes (`lib/generator-diagnostics.js`, reserved in Phase 8D-2 but never implemented until now), never blocked. */
const TYPICALLY_SMALL_ARCHETYPES = new Set(['street_gang', 'secret_society', 'clan', 'bounty_hunters']);
const TYPICALLY_LARGE_ARCHETYPES = new Set(['government', 'military', 'corporation']);

function attachFactionDiagnostics(draft, { archetype }) {
  let provenance = draft.provenance;
  if (TYPICALLY_SMALL_ARCHETYPES.has(archetype) && draft.scale >= 15) {
    provenance = withWarning(provenance, DIAGNOSTIC_CODE.FACTION_RESOURCE_MISMATCH);
  }
  if (TYPICALLY_LARGE_ARCHETYPES.has(archetype) && draft.scale <= 2) {
    provenance = withWarning(provenance, DIAGNOSTIC_CODE.FACTION_RESOURCE_MISMATCH);
  }
  const droidOnlyPolicy = draft.membershipPolicy === MEMBERSHIP_POLICY.DROID_ONLY;
  const droidOnlyPopulation = draft.populationProfile?.livingDroidComposition?.droidWeight >= 1;
  if (droidOnlyPolicy !== droidOnlyPopulation && (droidOnlyPolicy || droidOnlyPopulation)) {
    provenance = withWarning(provenance, DIAGNOSTIC_CODE.FACTION_POPULATION_MISMATCH);
  }
  return provenance === draft.provenance ? draft : { ...draft, provenance };
}

/**
 * Generate the full set of Faction contacts for a draft-in-progress.
 * `rankTierMap` biases display titles by archetype (`ARCHETYPE_RANK_TIER_MAP`,
 * falling back to the military example map for an archetype with no
 * dedicated ladder) -- never invents a new title vocabulary.
 */
async function generateFactionContacts({
  count, preferTags, populationProfile, locationPopulationProfile, recruitmentProfile,
  droidPrevalence, availableSpeciesIds, leadershipBoost, rankTierMap, rng, nameProvider, droidNameProvider, factionDraftId
}) {
  const contacts = [];
  for (let i = 0; i < count; i++) {
    // eslint-disable-next-line no-await-in-loop -- sequential by design: each contact's name-provider call should not race a shared deterministic rng.
    const contact = await createGeneratedNpcConcept({
      rng, preferTags, populationProfile, locationPopulationProfile, recruitmentProfile,
      droidPrevalence, availableSpeciesIds, leadershipBoost, rankTierMap, nameProvider, droidNameProvider, factionDraftId
    });
    contacts.push(contact);
  }
  return contacts;
}

/**
 * Generate a full procedural Faction draft.
 *
 * @param {object} [options]
 * @param {() => number} [options.rng]
 * @param {string} [options.archetype] - explicit archetype id; overrides preset/context roll.
 * @param {string} [options.presetId] - `data/faction-presets.js` id.
 * @param {string[]} [options.preferTags] - Location context tags (e.g. a planet draft's own merged `tags`), combined with the resolved preset's `preferTags`.
 * @param {number} [options.scale] - explicit Scale (1-20); rolled via `rollFactionScale()` if omitted.
 * @param {string[]} [options.availableSpeciesIds]
 * @param {object} [options.locationPopulationProfile] - a Location's `location-population-profile.js` profile, for locality-biased Contact species selection.
 * @param {string} [options.droidPrevalence] - a `PLANET_DROID_PREVALENCE` string, forwarded to `npc-bundle.js` for droid Contacts when the rolled `populationProfile` mode leaves it ambiguous.
 * @param {string} [options.originLocationId]
 * @param {string} [options.headquartersLocationId]
 * @param {string} [options.currentLocationId]
 * @param {string[]} [options.territoryLocationIds]
 * @param {string[]} [options.territoryLocationDraftIds]
 * @param {number} [options.localityBias] - explicit override; defaults to the preset's or archetype's default.
 * @param {string} [options.membershipPolicy] - explicit override; defaults to the preset's `membershipPolicyDefault` or `'open'`.
 * @param {number} [options.contactCount] - explicit override; defaults to a Scale-banded roll.
 * @param {object} [options.nameProvider] / {object} [options.droidNameProvider] - forwarded to `npc-bundle.js`.
 */
export async function createProceduralFactionDraft({
  rng,
  archetype = '',
  presetId = '',
  preferTags = [],
  scale,
  availableSpeciesIds = [],
  locationPopulationProfile = null,
  droidPrevalence = 'normal',
  originLocationId = '',
  headquartersLocationId = '',
  currentLocationId = '',
  territoryLocationIds = [],
  territoryLocationDraftIds = [],
  localityBias,
  membershipPolicy,
  contactCount,
  nameProvider,
  droidNameProvider
} = {}) {
  // CORRECTION (independent review of PR #964's initial head): reserve
  // the Faction's OWN draftId before generating any Contact, so every
  // generated Contact's `factionDraftId` can point back to the EXACT
  // same draftId the finished Faction draft carries -- previously
  // Contacts were generated before the Faction draft existed at all,
  // so `factionDraftId` was never set and the Faction->Contact graph
  // was unaddressable pre-commit, undermining the whole point of
  // giving both draft types a stable id in the first place.
  const reservedDraftId = createDraftId('faction');
  const explicitPreset = presetId ? getFactionPreset(presetId) : null;
  const resolvedArchetype = pickFactionArchetype({
    rng,
    preferTags: [...(explicitPreset?.preferTags ?? []), ...preferTags],
    archetype: archetype || explicitPreset?.archetype || ''
  });
  const effectivePreset = explicitPreset || getFactionPresetForArchetype(resolvedArchetype);
  const mergedPreferTags = [...new Set([...(effectivePreset?.preferTags ?? []), ...preferTags])];
  const family = FACTION_ARCHETYPE_FAMILY[resolvedArchetype] || ORGANIZATION_FAMILY.BUSINESS_PROFESSIONAL;

  const nameDraft = getRandomFactionName({ family, rng, preferTags: mergedPreferTags });
  const resolvedScale = Number.isFinite(scale) ? clampScale(scale) : rollFactionScale({ rng });

  const doctrine = generateFactionDoctrine({ scale: resolvedScale, preferTags: mergedPreferTags, rng, archetype: resolvedArchetype, family });

  const goalSet = generateFactionGoalSet({ rng, preferTags: mergedPreferTags });
  const institutionalCharacterEntry = pickFactionInstitutionalCharacter({ rng, preferTags: mergedPreferTags });
  const leadershipStructureEntry = pickFactionLeadershipStructure({ rng, preferTags: mergedPreferTags });
  const internalProblems = pickFactionInternalProblems({ rng, preferTags: mergedPreferTags, count: problemCountForScale(resolvedScale, { rng }) }).map((e) => e.value);
  const resourceProfile = generateFactionResourceProfile({ scale: resolvedScale, rng, preferTags: mergedPreferTags, flavorCount: randomIntInclusive(1, 2, { rng }) });

  const populationMode = pickPopulationModeForArchetype(resolvedArchetype, { rng });
  const populationProfile = createPopulationProfile({ mode: populationMode });
  const resolvedMembershipPolicy = isMembershipPolicy(membershipPolicy)
    ? membershipPolicy
    : (isMembershipPolicy(effectivePreset?.membershipPolicyDefault) ? effectivePreset.membershipPolicyDefault : MEMBERSHIP_POLICY.OPEN);

  const resolvedLocalityBias = Number.isFinite(localityBias)
    ? localityBias
    : (Number.isFinite(effectivePreset?.localityBiasOverride) ? effectivePreset.localityBiasOverride : defaultLocalityBiasForArchetype(resolvedArchetype));
  const recruitmentProfile = createRecruitmentProfile({ originLocationId, headquartersLocationId, currentLocationId, localityBias: resolvedLocalityBias });

  const relationships = generateFactionRelationships({ rng, family });

  const rankTierMap = ARCHETYPE_RANK_TIER_MAP[resolvedArchetype] || MILITARY_RANK_TIER_MAP;
  const leadershipBoost = LEADERSHIP_BOOST_BY_USAGE[doctrine.eliteAvailability] ?? 1;
  const resolvedContactCount = Number.isFinite(contactCount) ? Math.max(0, contactCount) : contactCountForScale(resolvedScale, { rng });
  const contacts = await generateFactionContacts({
    count: resolvedContactCount, preferTags: mergedPreferTags, populationProfile, locationPopulationProfile, recruitmentProfile,
    droidPrevalence, availableSpeciesIds, leadershipBoost, rankTierMap, rng, nameProvider, droidNameProvider, factionDraftId: reservedDraftId
  });

  const provenance = createProvenance({ presetId: effectivePreset?.id ?? '', tags: [resolvedArchetype, family] });

  let draft = createFactionDraft({
    draftId: reservedDraftId,
    name: nameDraft.name,
    organizationFamily: family,
    archetype: resolvedArchetype,
    scale: resolvedScale,
    contacts,
    doctrine,
    populationProfile,
    membershipPolicy: resolvedMembershipPolicy,
    recruitmentProfile,
    institutionalCharacter: institutionalCharacterEntry?.value ?? '',
    leadershipStructure: leadershipStructureEntry?.value ?? '',
    publicGoal: goalSet.publicGoal?.value ?? '',
    actualGoal: goalSet.actualGoal?.value ?? '',
    currentObjective: goalSet.currentObjective?.value ?? '',
    internalProblems,
    resourceProfile,
    territoryLocationIds,
    territoryLocationDraftIds,
    relationships,
    provenance
  });

  draft = attachFactionDiagnostics(draft, { archetype: resolvedArchetype });
  return draft;
}

/** GM-facing Scale label -- thin passthrough to `describeScale()` so a caller never needs a second import just to display a generated draft's Scale. */
export function factionDraftScaleLabel(draft) {
  return describeScale(draft?.scale);
}

// --- reroll / regenerate operations -----------------------------------

/** Full regenerate: a wholly new draft. Preserves the EXISTING draft's presetId (via its provenance) unless the caller explicitly overrides it, matching `planet-bundle.js`'s `regeneratePlanetAndPois()` convention. */
export async function regenerateFactionDraft(draft, options = {}) {
  return createProceduralFactionDraft({ ...options, presetId: options.presetId ?? draft?.provenance?.presetId ?? '' });
}

/** Reroll ONLY the name (same family/archetype). */
export function rerollFactionName(draft, { rng } = {}) {
  const nameDraft = getRandomFactionName({ family: draft.organizationFamily, rng });
  return updateFactionDraft(draft, { name: nameDraft.name });
}

/** Reroll the archetype cluster: archetype, organizationFamily, and name all change together (a name's type-noun is family-specific, so this can never be a single-field reroll without producing an incoherent name). Scale/doctrine/goals/etc. are left untouched -- use `regenerateFactionDraft()` for a fully new Faction. */
export function rerollFactionArchetype(draft, { rng, preferTags = [] } = {}) {
  const resolvedArchetype = pickFactionArchetype({ rng, preferTags });
  const family = FACTION_ARCHETYPE_FAMILY[resolvedArchetype] || ORGANIZATION_FAMILY.BUSINESS_PROFESSIONAL;
  const nameDraft = getRandomFactionName({ family, rng, preferTags });
  return updateFactionDraft(draft, { archetype: resolvedArchetype, organizationFamily: family, name: nameDraft.name });
}

/** Reroll the Scale cluster: Scale, doctrine's scale-informed defaults, and resourceProfile (both DIRECTLY derived from Scale) together -- mirrors `planet-bundle.js`'s dependency-aware cluster rerolls. Doctrine's rolled roles are preserved (they are archetype-context-derived, not Scale-derived); only its scale-informed usage levels are refreshed. */
export function rerollFactionScale(draft, { rng, scale, preferTags } = {}) {
  const resolvedScale = Number.isFinite(scale) ? clampScale(scale) : rollFactionScale({ rng });
  const usage = suggestDoctrineUsageForScale(resolvedScale);
  const doctrine = { ...draft.doctrine, ...usage };
  const resourceProfile = generateFactionResourceProfile({ scale: resolvedScale, rng, preferTags: preferTags ?? draft.doctrine?.environmentAffinities ?? [] });
  const next = updateFactionDraft(draft, { scale: resolvedScale, doctrine, resourceProfile });
  return attachFactionDiagnostics(next, { archetype: next.archetype });
}

/** Reroll ONLY the goal set (`publicGoal`/`actualGoal`/`currentObjective`). */
export function rerollFactionGoals(draft, { rng, preferTags } = {}) {
  const goalSet = generateFactionGoalSet({ rng, preferTags: preferTags ?? draft.doctrine?.environmentAffinities ?? [] });
  return updateFactionDraft(draft, { publicGoal: goalSet.publicGoal?.value ?? '', actualGoal: goalSet.actualGoal?.value ?? '', currentObjective: goalSet.currentObjective?.value ?? '' });
}

/** Reroll ONLY the institutional character. */
export function rerollFactionInstitutionalCharacter(draft, { rng, preferTags } = {}) {
  const entry = pickFactionInstitutionalCharacter({ rng, preferTags: preferTags ?? draft.doctrine?.environmentAffinities ?? [] });
  return updateFactionDraft(draft, { institutionalCharacter: entry?.value ?? '' });
}

/** Reroll ONLY the leadership structure. */
export function rerollFactionLeadershipStructure(draft, { rng, preferTags } = {}) {
  const entry = pickFactionLeadershipStructure({ rng, preferTags: preferTags ?? draft.doctrine?.environmentAffinities ?? [] });
  return updateFactionDraft(draft, { leadershipStructure: entry?.value ?? '' });
}

/** Reroll ONLY the internal-problem list. */
export function rerollFactionInternalProblems(draft, { rng, preferTags, count } = {}) {
  const problems = pickFactionInternalProblems({ rng, preferTags: preferTags ?? draft.doctrine?.environmentAffinities ?? [], count: count ?? problemCountForScale(draft.scale, { rng }) }).map((e) => e.value);
  return updateFactionDraft(draft, { internalProblems: problems });
}

/** Reroll ONLY the resource profile (independent of a Scale reroll -- e.g. "same size, different funding flavor"). */
export function rerollFactionResourceProfile(draft, { rng, preferTags, flavorCount } = {}) {
  const resourceProfile = generateFactionResourceProfile({ scale: draft.scale, rng, preferTags: preferTags ?? draft.doctrine?.environmentAffinities ?? [], flavorCount: flavorCount ?? randomIntInclusive(1, 2, { rng }) });
  return updateFactionDraft(draft, { resourceProfile });
}

/** Reroll relationship CONCEPTS (allies/enemies) -- replaces the whole generated set with a fresh roll. Any CANONICAL relationships the draft already carries (real `allyFactionIds`/`enemyFactionIds`, e.g. a GM manually linked one in) are preserved, only the unresolved generated concepts are replaced. */
export function rerollFactionRelationships(draft, { rng } = {}) {
  const fresh = generateFactionRelationships({ rng, family: draft.organizationFamily });
  const relationships = { ...draft.relationships, generatedAllyConcepts: fresh.generatedAllyConcepts, generatedEnemyConcepts: fresh.generatedEnemyConcepts };
  return updateFactionDraft(draft, { relationships });
}

/** Regenerate EVERY Contact against the draft's CURRENT population/recruitment/doctrine context -- the "reroll all contacts" bundle operation, mirroring `planet-bundle.js`'s `regenerateAllPois()`. Defaults to the same contact count the draft already has. */
export async function regenerateFactionContacts(draft, { rng, count, preferTags, locationPopulationProfile, availableSpeciesIds = [], droidPrevalence = 'normal', nameProvider, droidNameProvider } = {}) {
  const rankTierMap = ARCHETYPE_RANK_TIER_MAP[draft.archetype] || MILITARY_RANK_TIER_MAP;
  const leadershipBoost = LEADERSHIP_BOOST_BY_USAGE[draft.doctrine?.eliteAvailability] ?? 1;
  const resolvedCount = Number.isFinite(count) ? Math.max(0, count) : draft.contacts.length;
  const contacts = await generateFactionContacts({
    count: resolvedCount, preferTags: preferTags ?? draft.doctrine?.environmentAffinities ?? [], populationProfile: draft.populationProfile,
    locationPopulationProfile, recruitmentProfile: draft.recruitmentProfile, droidPrevalence, availableSpeciesIds,
    leadershipBoost, rankTierMap, rng, nameProvider, droidNameProvider, factionDraftId: draft.draftId
  });
  return updateFactionDraft(draft, { contacts });
}

/** Reroll ONE Contact by `draftId`, preserving every OTHER Contact untouched (same object reference) -- the core "never silently destroy sibling Contacts" guarantee, matching `planet-bundle.js`'s `rerollPoiInBundle()`. A no-op (returns the draft unchanged) if no Contact with that `draftId` exists. */
export async function rerollFactionContact(draft, contactDraftId, { rng, preferTags, locationPopulationProfile, availableSpeciesIds = [], droidPrevalence = 'normal', nameProvider, droidNameProvider } = {}) {
  const index = draft.contacts.findIndex((c) => c.draftId === contactDraftId);
  if (index === -1) return draft;
  const rankTierMap = ARCHETYPE_RANK_TIER_MAP[draft.archetype] || MILITARY_RANK_TIER_MAP;
  const leadershipBoost = LEADERSHIP_BOOST_BY_USAGE[draft.doctrine?.eliteAvailability] ?? 1;
  const replacement = await createGeneratedNpcConcept({
    rng, preferTags: preferTags ?? draft.doctrine?.environmentAffinities ?? [], populationProfile: draft.populationProfile,
    locationPopulationProfile, recruitmentProfile: draft.recruitmentProfile, droidPrevalence, availableSpeciesIds,
    leadershipBoost, rankTierMap, nameProvider, droidNameProvider, factionDraftId: draft.draftId,
    // Preserve the SAME draftId across a reroll so the Contact stays
    // addressable by the GM/UI afterward -- this is a reroll of one
    // Contact's facts, not a replacement of its identity.
    draftId: contactDraftId
  });
  const contacts = draft.contacts.map((c, i) => (i === index ? replacement : c));
  return updateFactionDraft(draft, { contacts });
}

/** Add one new Contact, generated against the draft's own current context. Every existing Contact is preserved untouched. */
export async function addFactionContact(draft, { rng, preferTags, locationPopulationProfile, availableSpeciesIds = [], droidPrevalence = 'normal', nameProvider, droidNameProvider } = {}) {
  const rankTierMap = ARCHETYPE_RANK_TIER_MAP[draft.archetype] || MILITARY_RANK_TIER_MAP;
  const leadershipBoost = LEADERSHIP_BOOST_BY_USAGE[draft.doctrine?.eliteAvailability] ?? 1;
  const contact = await createGeneratedNpcConcept({
    rng, preferTags: preferTags ?? draft.doctrine?.environmentAffinities ?? [], populationProfile: draft.populationProfile,
    locationPopulationProfile, recruitmentProfile: draft.recruitmentProfile, droidPrevalence, availableSpeciesIds,
    leadershipBoost, rankTierMap, nameProvider, droidNameProvider, factionDraftId: draft.draftId
  });
  return updateFactionDraft(draft, { contacts: [...draft.contacts, contact] });
}

/** Remove one Contact by `draftId`. A no-op if no Contact with that id exists. Every OTHER Contact is preserved untouched. */
export function removeFactionContact(draft, contactDraftId) {
  const contacts = draft.contacts.filter((c) => c.draftId !== contactDraftId);
  if (contacts.length === draft.contacts.length) return draft;
  return updateFactionDraft(draft, { contacts });
}

/**
 * Reroll ONLY one Contact's flavor notes (`npc/npc-flavor.js`) -- the
 * most targeted possible reroll: name/species/role/rank/agenda/secret/
 * every other Contact field, and every OTHER Contact, all stay
 * untouched. Matches the phase's targeted-reroll philosophy exactly:
 * "reroll flavor notes" must never imply "reroll the whole Contact." A
 * no-op if no Contact with that `draftId` exists.
 */
export function rerollFactionContactFlavorNotes(draft, contactDraftId, { rng, preferTags, roleTags, count } = {}) {
  const index = draft.contacts.findIndex((c) => c.draftId === contactDraftId);
  if (index === -1) return draft;
  const target = draft.contacts[index];
  const rerolled = rerollNpcFlavorNotes(target, {
    rng,
    preferTags: preferTags ?? draft.doctrine?.environmentAffinities ?? [],
    roleTags: roleTags ?? target.profileAffinity?.roleTags ?? [],
    count
  });
  const contacts = draft.contacts.map((c, i) => (i === index ? rerolled : c));
  return updateFactionDraft(draft, { contacts });
}

/**
 * Reroll ONE flavor note on ONE Contact (by `contactDraftId` +
 * `qualityIdOrIndex`) -- the finest-grained reroll this system offers.
 * A no-op if no Contact with that `draftId` exists; delegates
 * unknown-quality handling to `npc-flavor.js`'s own no-op contract.
 */
export function rerollFactionContactFlavorNote(draft, contactDraftId, qualityIdOrIndex, { rng, preferTags, roleTags } = {}) {
  const index = draft.contacts.findIndex((c) => c.draftId === contactDraftId);
  if (index === -1) return draft;
  const target = draft.contacts[index];
  const rerolled = rerollNpcFlavorNote(target, qualityIdOrIndex, {
    rng,
    preferTags: preferTags ?? draft.doctrine?.environmentAffinities ?? [],
    roleTags: roleTags ?? target.profileAffinity?.roleTags ?? []
  });
  const contacts = draft.contacts.map((c, i) => (i === index ? rerolled : c));
  return updateFactionDraft(draft, { contacts });
}
