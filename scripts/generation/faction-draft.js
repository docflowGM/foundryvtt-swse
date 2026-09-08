/**
 * PHASE 8D-1 addendum — full generated-Faction draft contract.
 *
 * Composes `organization-metadata.js` (family/scale),
 * `faction-relationship-draft.js` (allies/enemies),
 * `faction-doctrine-draft.js` (opposition-readiness metadata),
 * `population-profile.js` (demographic composition + membership policy,
 * addendum), and `provenance.js` into the one draft shape a future
 * Random Faction generator (Phase 8D-2+) will produce and a GM edits
 * before committing.
 *
 * `populationProfile` (who tends to belong) and `membershipPolicy` (who
 * is ALLOWED to join) are kept as two separate fields per the addendum's
 * hard rule — a Faction can be demographically dominated by one species
 * with fully open membership, or the reverse; this module never infers
 * one from the other and defaults `membershipPolicy` to `'open'`
 * regardless of population composition.
 *
 * `recruitmentProfile` (`recruitment-profile.js`, 3rd addendum) carries
 * a Faction's origin/operating-Location context and how strongly that
 * context should bias its (still explicitly-set) `populationProfile` —
 * see that module's header for the "explicit Faction identity always
 * wins" rule. This module does not itself call
 * `selectFactionSpeciesWithLocality()`; that per-member selection
 * happens in the future generator (Phase 8D-2+) when it actually rolls
 * a Contact's species, so this module only stores the
 * `populationProfile`/`recruitmentProfile` it's given, never performs
 * selection itself.
 *
 * HARD RULE: this module never creates, upserts, or otherwise mutates a
 * canonical Faction. Committing a draft to a real Faction record is
 * later, explicit GM action through the EXISTING
 * `FactionRegistryService.upsertFaction()` — this module does not call
 * it and does not duplicate its persistence, id-generation, or
 * normalization logic. `jobDefaults` below reuses the EXACT field names
 * `FactionRegistryService`'s own `normalizeJobDefaults()` already
 * produces (confirmed by reconnaissance), so a draft's jobDefaults can
 * be handed to `upsertFaction()` unchanged at commit time.
 */

import { createFactionRelationshipDraftSet } from './faction-relationship-draft.js';
import { createFactionDoctrineDraft, createFactionPreferredStatblockRoster } from './faction-doctrine-draft.js';
import { createPopulationProfile, isMembershipPolicy, MEMBERSHIP_POLICY } from './population-profile.js';
import { createRecruitmentProfile } from './recruitment-profile.js';
import { createProvenance, isProvenance } from './provenance.js';

function cleanString(value) {
  return String(value ?? '').trim();
}

function cleanStringArray(value) {
  return Array.isArray(value) ? value.map(cleanString).filter(Boolean) : [];
}

function clampScale(scale) {
  const n = Number(scale);
  if (!Number.isFinite(n)) return 1;
  return Math.min(20, Math.max(1, Math.round(n)));
}

/**
 * Faction.jobDefaults' exact field set, verbatim from
 * `FactionRegistryService.normalizeJobDefaults()` — reused, not
 * reinvented, so a generated draft's jobDefaults is already in the
 * shape `upsertFaction()` expects at commit time.
 */
function normalizeJobDefaultsDraft(input = {}) {
  return {
    tone: cleanString(input.tone),
    rewardStyle: cleanString(input.rewardStyle),
    objective: cleanString(input.objective),
    briefing: cleanString(input.briefing),
    instructions: cleanString(input.instructions),
    credits: Math.max(0, Number(input.credits) || 0),
    xp: Math.max(0, Number(input.xp) || 0),
    successDelta: Number.isFinite(Number(input.successDelta)) ? Number(input.successDelta) : 1,
    failureDelta: Number.isFinite(Number(input.failureDelta)) ? Number(input.failureDelta) : -1,
    visibility: cleanString(input.visibility) || 'posted',
    legality: cleanString(input.legality),
    payStyle: cleanString(input.payStyle),
    rivalFactionName: cleanString(input.rivalFactionName),
    rivalSuccessDelta: Number.isFinite(Number(input.rivalSuccessDelta)) ? Number(input.rivalSuccessDelta) : -1,
    rivalFailureDelta: Number.isFinite(Number(input.rivalFailureDelta)) ? Number(input.rivalFailureDelta) : 1,
    consequenceNotes: cleanString(input.consequenceNotes)
  };
}

/**
 * Build a full generated-Faction draft. Every field defaults to an
 * empty/neutral value — a caller (Phase 8D-2+'s actual generator) fills
 * in as much or as little as it can. `contacts` holds `npc-concept.js`
 * drafts (unvalidated here — this module trusts its own draft
 * boundary, not a general-purpose re-validator); `relationships` holds
 * a `faction-relationship-draft.js` set; `doctrine`/
 * `preferredStatblockRoster` hold `faction-doctrine-draft.js` shapes.
 */
export function createFactionDraft({
  name = '',
  organizationFamily = '',
  archetype = '',
  scale = 1,
  planetSystem = '',
  leaderConcept = null,
  startingScore = 0,
  benefits = '',
  notes = '',
  gmNotes = '',
  agenda = '',
  secret = '',
  image = '',
  jobDefaults = {},
  contacts = [],
  relationships,
  doctrine,
  preferredStatblockRoster,
  populationProfile,
  membershipPolicy = MEMBERSHIP_POLICY.OPEN,
  recruitmentProfile,
  // Phase 8D-2 addendum: institutional character/leadership/goals/
  // problems/resources are all plain narrative facts (strings, or a
  // small structured resourceProfile) -- see `factions/faction-*.js`
  // for the generators that roll them. This module only stores what
  // it's given, exactly like every other narrative field above.
  institutionalCharacter = '',
  leadershipStructure = '',
  publicGoal = '',
  actualGoal = '',
  currentObjective = '',
  internalProblems = [],
  resourceProfile = null,
  // Territory refs use IDs only, never visible names -- matching the
  // exact-id-only discipline `location-draft.js`'s own header
  // documents. `territoryLocationIds` are real canonical Location ids;
  // `territoryLocationDraftIds` link to another draft (e.g. a
  // `planet-draft.js` planet) in the same generation batch that hasn't
  // been committed yet -- never both meaning the same territory entry,
  // but a Faction can hold some of each simultaneously.
  territoryLocationIds = [],
  territoryLocationDraftIds = [],
  provenance
} = {}) {
  return {
    // Draft never carries a canonical Faction id — one is assigned only
    // by FactionRegistryService.upsertFaction() at commit time.
    name: cleanString(name),
    organizationFamily: cleanString(organizationFamily),
    archetype: cleanString(archetype),
    scale: clampScale(scale),
    planetSystem: cleanString(planetSystem),
    leaderConcept: leaderConcept && typeof leaderConcept === 'object' ? leaderConcept : (cleanString(leaderConcept) || null),
    startingScore: Number.isFinite(Number(startingScore)) ? Number(startingScore) : 0,
    benefits: cleanString(benefits),
    notes: cleanString(notes),
    gmNotes: cleanString(gmNotes),
    agenda: cleanString(agenda),
    secret: cleanString(secret),
    image: cleanString(image),
    jobDefaults: normalizeJobDefaultsDraft(jobDefaults),
    contacts: Array.isArray(contacts) ? [...contacts] : [],
    // relationships/preferredStatblockRoster are normally built up
    // incrementally via their own addFactionRelationship()/
    // addFactionPreferredStatblockProfile() helpers (which already
    // return a correctly-shaped object), so an already-shaped object is
    // accepted as-is; only a missing/invalid value falls back to an
    // empty one.
    relationships: relationships && typeof relationships === 'object' ? relationships : createFactionRelationshipDraftSet(),
    preferredStatblockRoster: preferredStatblockRoster && typeof preferredStatblockRoster === 'object' ? preferredStatblockRoster : createFactionPreferredStatblockRoster(),
    // doctrine/populationProfile DO have factories that fill in
    // defaults for omitted sub-fields (e.g. {mode:'droid-only'} alone
    // should still get a full livingDroidComposition/speciesPolicy) --
    // always route through the factory rather than trusting a raw
    // passthrough, so a partially-specified input is still fully shaped.
    doctrine: createFactionDoctrineDraft(doctrine || {}),
    // Addendum: demographic composition (who tends to belong) kept
    // strictly separate from membership policy (who is allowed to
    // join) — see this file's header comment.
    populationProfile: createPopulationProfile(populationProfile || {}),
    membershipPolicy: isMembershipPolicy(membershipPolicy) ? membershipPolicy : MEMBERSHIP_POLICY.OPEN,
    // 3rd addendum: origin/operating-Location context + how strongly it
    // should bias the (already explicitly-set) populationProfile above.
    // See recruitment-profile.js's header for why this module never
    // performs that blend itself.
    recruitmentProfile: createRecruitmentProfile(recruitmentProfile || {}),
    // Phase 8D-2 addendum fields -- see the destructured-parameter
    // comment above for the full rationale on each.
    institutionalCharacter: cleanString(institutionalCharacter),
    leadershipStructure: cleanString(leadershipStructure),
    publicGoal: cleanString(publicGoal),
    actualGoal: cleanString(actualGoal),
    currentObjective: cleanString(currentObjective),
    internalProblems: cleanStringArray(internalProblems),
    resourceProfile: resourceProfile && typeof resourceProfile === 'object' ? resourceProfile : null,
    territoryLocationIds: cleanStringArray(territoryLocationIds),
    territoryLocationDraftIds: cleanStringArray(territoryLocationDraftIds),
    // Draft-only status vocabulary — deliberately DISTINCT from the
    // canonical Faction record's own `source`/`status` fields (which
    // use 'gm'/'job'/'organization'/'player-suggested' and become
    // meaningful only once a real Faction exists). A draft is always
    // 'generator-draft' until a GM commits it.
    source: 'generator-draft',
    status: 'draft',
    provenance: isProvenance(provenance) ? provenance : createProvenance({ presetId: archetype })
  };
}

/**
 * Return a NEW draft with `patch` shallow-merged in (per-field reroll
 * readiness, phase spec §14, applied at the Faction level — "reroll
 * name"/"reroll type"/"reroll scale"/"reroll leader"/"reroll agenda"/
 * "reroll secret" are all just `updateFactionDraft(draft, {field:
 * newValue})`; "reroll all NPCs" replaces `contacts` wholesale).
 */
export function updateFactionDraft(draft, patch = {}) {
  if (!draft || typeof draft !== 'object') return draft;
  return createFactionDraft({ ...draft, ...patch });
}
