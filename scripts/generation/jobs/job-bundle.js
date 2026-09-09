/**
 * PHASE 8D-3C production — full Job draft composer + context wiring +
 * reroll/regenerate operations.
 *
 * Composes every existing Phase 8D-1/8D-2 Job sub-generator
 * (archetype metadata, legality/visibility, urgency, complications,
 * consequences, twists, objective constraints, mission subjects,
 * opposition requests, objective templates/economy, reward estimator/
 * package, party capability) plus this phase's own two new primitives
 * (`job-stake.js`, `job-hook.js`) into ONE `job-draft.js` draft.
 * Deliberately just composition, matching `faction-bundle.js`'s own
 * "avoid the procedural god object" discipline -- this module owns no
 * table data and picks nothing directly except the few small NEW glue
 * tables declared right here (mission-type roll weights, generic slot
 * descriptors, asset-objective-type-per-template map) that have no
 * other natural home.
 *
 * Still a DRAFT — no canonical Job is ever posted here. Commit remains
 * `HolonetMessengerService.createJobPosting()`'s job, exactly as
 * `job-draft.js`'s own header documents. See §195 of the audit doc for
 * the full authority-table reasoning.
 *
 * `createProceduralJobDraft()` (and every operation below that can
 * generate a full named NPC subject) is ASYNC — the one
 * Foundry-dependent step is `npc/npc-bundle.js`'s name resolution,
 * isolated behind an injectable provider exactly as that module's own
 * header documents, per §195.3's routing decision. Every OTHER Job
 * field is resolved synchronously.
 *
 * CONTEXT WIRING (`jobContext`, phase spec's central "soft weighting"
 * requirement): `jobContext.locationContext` reuses the EXACT shape
 * `npc/npc-bundle.js`/`factions/faction-bundle.js` already accept
 * (`{technologyLevel, technologyAccess, technologySpecialties,
 * economyTags, locationTags, locationId, locationDraftId,
 * suggestedOppositionTags, currentEventHints}`) — no new Location
 * context shape is invented. `jobContext.factionContext` reads a real
 * or draft Faction's OWN `jobDefaults` (never duplicated) as a soft
 * bias on legality/visibility/relationship/reward scale.
 * `jobContext.contactContext` supplies an issuer Contact's identity.
 * `jobContext.economyContext` supplies commodity bias for cargo-flavored
 * objectives, reusing `data/galactic-commodities.js` `id`s verbatim.
 * `jobContext.campaignTags` are free-form tags merged in like every
 * other `preferTags` source. Every one of these is a SOFT bias (a
 * probabilistic nudge, never a hard filter/override) — no single
 * context source can monopolize output, matching the phase spec's
 * explicit "no context should monopolize output" requirement.
 */

import { createJobDraft, updateJobDraft, createJobObjectiveDraft, updateJobObjectiveDraft } from './job-draft.js';
import { JOB_ARCHETYPE_METADATA, describeJobArchetype } from './job-archetype-metadata.js';
import { pickJobLegality, pickJobVisibility, isJobLegality, isJobVisibility, JOB_LEGALITY, JOB_VISIBILITY } from './job-legality-visibility.js';
import { pickJobUrgency } from './job-urgency.js';
import { pickJobHook } from './job-hook.js';
import { pickJobStakes } from './job-stake.js';
import { pickJobComplications } from './job-complication.js';
import { pickJobTwist } from './job-twist.js';
import { generateJobConsequences } from './job-consequence.js';
import { pickObjectiveConstraints } from './objective-constraint.js';
import { pickMissionSubjectArchetype } from './mission-subject.js';
import {
  createOppositionRequest, OPPOSITION_LEADER_REQUIREMENT, OPPOSITION_SUPPORT_LEVEL,
  OPPOSITION_THREAT_LEVEL, OPPOSITION_COUNT_BAND
} from './opposition-request.js';
import { OBJECTIVE_TEMPLATE_FIXTURES, fixturesForMissionType, renderObjectiveTemplate } from '../objective-template.js';
import { OBJECTIVE_TIER, OBJECTIVE_DIFFICULTY } from '../objective-economy.js';
import { estimateReward, ASSET_OBJECTIVE_TYPE } from '../reward-estimator.js';
import { createRewardPackage, createKeepTheTargetPackage } from '../reward-package.js';
import { computePartyCapability } from '../party-capability.js';
import { ISSUER_TYPE } from '../organization-metadata.js';
import { GALACTIC_COMMODITIES } from '../data/galactic-commodities.js';
import { createGeneratedNpcConcept, rollCommandTier } from '../npc/npc-bundle.js';
import { weightedPick, randomIntInclusive } from '../lib/weighted-random.js';
import { normalizeTags, mergeTags } from '../lib/tag-utils.js';
import { createProvenance, withWarning } from '../provenance.js';
import { DIAGNOSTIC_CODE } from '../lib/generator-diagnostics.js';

// --- mission type roll weights ------------------------------------------
// Ordinary/plausible work (delivery, recovery, escort, investigation,
// rescue) is common; constant galaxy-ending drama (assault, boarding,
// heist) is the rare exception -- matching the phase spec's explicit
// "most Jobs should be ordinary work" requirement, mirroring
// `faction-bundle.js`'s own `SCALE_ROLL_BANDS` framing for the same idea.
const MISSION_TYPE_ROLL_WEIGHT = Object.freeze({
  delivery: 6, recovery: 5, escort: 5, investigation: 4, rescue: 4,
  bounty: 3, smuggling: 3, extraction: 3, hunt: 2, sabotage: 2,
  infiltration: 2, heist: 2, assault: 1, boarding: 1
});

const MISSION_TYPE_ENTRIES = Object.freeze(
  Object.keys(JOB_ARCHETYPE_METADATA).map((missionType) => ({
    value: missionType,
    weight: MISSION_TYPE_ROLL_WEIGHT[missionType] ?? 1,
    tags: [missionType]
  }))
);

/** Roll a mission type. Soft-biased by `preferTags` containing a mission-type name (e.g. a Faction whose doctrine tags happen to name one); never a hard filter. */
export function rollJobMissionType({ rng, preferTags = [] } = {}) {
  const preferred = preferTags.filter((tag) => MISSION_TYPE_ROLL_WEIGHT[tag] !== undefined);
  const pool = preferred.length
    ? MISSION_TYPE_ENTRIES.map((entry) => (preferred.includes(entry.value) ? { ...entry, weight: entry.weight * 3 } : entry))
    : MISSION_TYPE_ENTRIES;
  return weightedPick(pool, { rng })?.value ?? 'delivery';
}

// --- generic narrative slot descriptors ----------------------------------
// Small, generator-only descriptive vocabulary for rendering an objective
// template's non-NPC/non-Faction slots into readable text BEFORE any real
// canonical Location/vehicle exists to name -- these are narrative
// placeholders ("the compound"), never a claim about a real record, per
// the same discipline `opposition-request.js`'s free-text tags already
// establish. Deliberately small (a handful of rotation options per slot
// type), not a new large catalog.
const GENERIC_SLOT_DESCRIPTORS = Object.freeze({
  location: ['the target site', 'the drop point', 'the meeting location', 'the rendezvous point'],
  facility: ['the facility', 'the compound', 'the installation', 'the complex'],
  poi: ['the site', 'the outpost', 'the station'],
  planet: ["the world below", 'the planet'],
  structure: ['the structure', 'the building'],
  ship: ['the ship', 'the vessel'],
  vehicle: ['the vehicle', 'the transport'],
  item: ['the item', 'the equipment'],
  weapon: ['the weapon'],
  device: ['the device', 'the equipment'],
  data: ['the data', 'the files', 'the records'],
  creature: ['the creature'],
  'sabotage-target': ['the target', 'the installation', 'the equipment']
});

function pickGenericSlotDescriptor(slotType, { rng } = {}) {
  const pool = GENERIC_SLOT_DESCRIPTORS[slotType] ?? ['the target'];
  return pool[randomIntInclusive(0, pool.length - 1, { rng })];
}

/** Pick a commodity display name for a CARGO slot -- reuses `data/galactic-commodities.js` `id`s verbatim (never a duplicated commodity list). `preferredCommodityIds` (from `jobContext.economyContext`) softly biases the pick; never a hard filter. */
function pickCargoDescriptor({ rng, preferredCommodityIds = [] } = {}) {
  const preferred = preferredCommodityIds.length
    ? GALACTIC_COMMODITIES.filter((c) => preferredCommodityIds.includes(c.id))
    : [];
  const pool = preferred.length ? preferred : GALACTIC_COMMODITIES;
  const entry = pool[randomIntInclusive(0, pool.length - 1, { rng })];
  return { text: entry ? `a shipment of ${entry.name}` : 'a shipment of cargo', commodityId: entry?.id ?? '' };
}

// --- asset-objective-type per template -----------------------------------
// Only templates that concretely involve a valued ship/vehicle carry an
// asset-objective type at all -- reward-estimator.js's own
// "no double-counting" rule means an objective with no valued asset
// simply contributes nothing extra to `estimateReward()`'s asset
// component, which is the correct behavior for e.g. a plain cargo run.
const TEMPLATE_ASSET_OBJECTIVE_TYPE = Object.freeze({
  'ship-theft-deliver-intact': ASSET_OBJECTIVE_TYPE.STEAL_AND_DELIVER,
  'ship-recovery-return-owner': ASSET_OBJECTIVE_TYPE.RECOVER_FOR_OWNER,
  'recovery-cargo-wreck': ASSET_OBJECTIVE_TYPE.RECOVER_FOR_OWNER,
  'sabotage-multiple-targets': ASSET_OBJECTIVE_TYPE.SABOTAGE_OR_DESTROY,
  'faction-destroy-enemy-supplies': ASSET_OBJECTIVE_TYPE.SABOTAGE_OR_DESTROY
});

/** A representative valued-asset figure for the asset component of `estimateReward()` -- generator-only flavor, never a Store-priced figure (a future adapter would replace this with `resolveStoreCost()`, per `reward-package.js`'s own header). Scaled loosely by difficulty so a harder theft/recovery objective plausibly involves a more valuable target. */
const ASSET_VALUE_BY_DIFFICULTY = Object.freeze({
  routine: 8000, standard: 15000, difficult: 30000, severe: 60000, extreme: 120000
});

// --- opposition profile per difficulty ------------------------------------
const OPPOSITION_PROFILE_BY_DIFFICULTY = Object.freeze({
  routine: { threatLevel: OPPOSITION_THREAT_LEVEL.TRIVIAL, countBand: OPPOSITION_COUNT_BAND.PAIR, leaderRequirement: OPPOSITION_LEADER_REQUIREMENT.NONE, reinforcementLevel: OPPOSITION_SUPPORT_LEVEL.NONE },
  standard: { threatLevel: OPPOSITION_THREAT_LEVEL.STANDARD, countBand: OPPOSITION_COUNT_BAND.SMALL_GROUP, leaderRequirement: OPPOSITION_LEADER_REQUIREMENT.NONE, reinforcementLevel: OPPOSITION_SUPPORT_LEVEL.LIGHT },
  difficult: { threatLevel: OPPOSITION_THREAT_LEVEL.DANGEROUS, countBand: OPPOSITION_COUNT_BAND.SQUAD, leaderRequirement: OPPOSITION_LEADER_REQUIREMENT.OPTIONAL, reinforcementLevel: OPPOSITION_SUPPORT_LEVEL.MODERATE },
  severe: { threatLevel: OPPOSITION_THREAT_LEVEL.DANGEROUS, countBand: OPPOSITION_COUNT_BAND.SQUAD, leaderRequirement: OPPOSITION_LEADER_REQUIREMENT.REQUIRED, reinforcementLevel: OPPOSITION_SUPPORT_LEVEL.MODERATE },
  extreme: { threatLevel: OPPOSITION_THREAT_LEVEL.DEADLY, countBand: OPPOSITION_COUNT_BAND.HORDE, leaderRequirement: OPPOSITION_LEADER_REQUIREMENT.REQUIRED, reinforcementLevel: OPPOSITION_SUPPORT_LEVEL.HEAVY }
});

function pickObjectiveDifficulty({ rng } = {}) {
  const entries = [
    { value: OBJECTIVE_DIFFICULTY.ROUTINE, weight: 3 },
    { value: OBJECTIVE_DIFFICULTY.STANDARD, weight: 5 },
    { value: OBJECTIVE_DIFFICULTY.DIFFICULT, weight: 3 },
    { value: OBJECTIVE_DIFFICULTY.SEVERE, weight: 1 },
    { value: OBJECTIVE_DIFFICULTY.EXTREME, weight: 0.3 }
  ];
  return weightedPick(entries, { rng })?.value ?? OBJECTIVE_DIFFICULTY.STANDARD;
}

/** How many objectives a Job gets -- most Jobs have just one primary objective; secondary/tertiary objectives are the exception, not the rule. */
function rollObjectiveCount({ rng } = {}) {
  const entries = [{ value: 1, weight: 6 }, { value: 2, weight: 3 }, { value: 3, weight: 1 }];
  return weightedPick(entries, { rng })?.value ?? 1;
}

function pickObjectiveTemplate({ missionType, tier, rng }) {
  const byMissionAndTier = fixturesForMissionType(missionType).filter((t) => t.tiers.includes(tier));
  if (byMissionAndTier.length) return weightedPick(byMissionAndTier, { rng, weightOf: (t) => t.weight });
  const byMission = fixturesForMissionType(missionType);
  if (byMission.length) return weightedPick(byMission, { rng, weightOf: (t) => t.weight });
  const byTier = OBJECTIVE_TEMPLATE_FIXTURES.filter((t) => t.tiers.includes(tier));
  if (byTier.length) return weightedPick(byTier, { rng, weightOf: (t) => t.weight });
  return weightedPick(OBJECTIVE_TEMPLATE_FIXTURES, { rng, weightOf: (t) => t.weight });
}

/**
 * Build one opposition request for an objective, per §195's reuse
 * decision: `suggestedOppositionTags` (locationContext, already shared
 * cross-domain) + the template's own `oppositionHints` feed
 * `archetypeTags`; `rankContext` reuses `npc/npc-bundle.js`'s existing
 * `rollCommandTier()` rather than inventing a second distribution.
 */
function buildOppositionRequest({ template, missionType, difficulty, locationContext, organizationTags, rng }) {
  const profile = OPPOSITION_PROFILE_BY_DIFFICULTY[difficulty] ?? OPPOSITION_PROFILE_BY_DIFFICULTY.standard;
  const archetypeTags = normalizeTags([...(template?.oppositionHints ?? []), missionType, ...(locationContext?.suggestedOppositionTags ?? [])]);
  return createOppositionRequest({
    archetypeTags,
    environmentTags: normalizeTags(locationContext?.locationTags ?? []),
    organizationTags: normalizeTags(organizationTags ?? []),
    difficulty,
    rankContext: rollCommandTier({ rng, leadershipBoost: difficulty === 'severe' || difficulty === 'extreme' ? 1.4 : 1 }),
    threatLevel: profile.threatLevel,
    countBand: profile.countBand,
    leaderRequirement: profile.leaderRequirement,
    reinforcementLevel: profile.reinforcementLevel,
    notes: template?.oppositionHints?.length ? `Suggested by template "${template.id}": ${template.oppositionHints.join(', ')}` : ''
  });
}

/**
 * Resolve one template slot into display text + structured metadata.
 * NPC-shaped slots ALWAYS get a lightweight archetype label
 * (`mission-subject.js`'s `pickMissionSubjectArchetype()`); a full named
 * NPC concept is only generated when `withNamedSubjects` is true AND the
 * template declares `creates.npcConcepts > 0` AND a soft 40% roll hits --
 * most objective subjects stay archetype-only, matching "most Jobs
 * should be ordinary" (a fully named, fleshed-out subject is the
 * occasional exception a GM can also request explicitly via
 * `rerollJobObjectiveSubject(..., { forceNamedSubject: true })`).
 */
async function resolveObjectiveSlots({ template, missionType, preferTags, locationContext, factionDraftId, issuerFactionName, withNamedSubjects, forceNamedSubject, economyContext, rng, nameProvider, droidNameProvider }) {
  const slotValues = {};
  let subjectRole = '';
  let subjectArchetype = null;
  let subjectNpcConcept = null;
  let cargoCommodityId = '';

  for (const [slotName, slotDef] of Object.entries(template.slots)) {
    switch (slotDef.type) {
      case 'person-or-droid':
      case 'living-npc':
      case 'droid':
      case 'npc': {
        subjectArchetype = pickMissionSubjectArchetype({ rng, preferTags });
        subjectRole = subjectArchetype?.value ?? '';
        const shouldName = withNamedSubjects && template.creates.npcConcepts > 0 && (forceNamedSubject || (rng ?? Math.random)() < 0.4);
        if (shouldName) {
          // eslint-disable-next-line no-await-in-loop -- sequential by design, matching faction-bundle.js's own generateFactionContacts() precedent: a shared deterministic rng should not race itself across concurrent awaits.
          subjectNpcConcept = await createGeneratedNpcConcept({
            rng, preferTags, factionDraftId, locationContext, nameProvider, droidNameProvider
          });
        }
        slotValues[slotName] = subjectNpcConcept?.name || `the ${subjectRole || 'subject'}`;
        break;
      }
      case 'faction':
        slotValues[slotName] = issuerFactionName || 'a rival organization';
        break;
      case 'cargo': {
        const cargo = pickCargoDescriptor({ rng, preferredCommodityIds: economyContext?.preferredCommodityIds ?? [] });
        slotValues[slotName] = cargo.text;
        cargoCommodityId = cargo.commodityId;
        break;
      }
      default:
        slotValues[slotName] = pickGenericSlotDescriptor(slotDef.type, { rng });
    }
  }

  return { slotValues, subjectRole, subjectArchetype, subjectNpcConcept, cargoCommodityId };
}

/** Build one objective draft, composing every existing primitive above. */
async function buildJobObjective({
  tier, missionType, preferTags, locationContext, factionDraftId, issuerFactionName, organizationTags,
  withNamedSubjects, economyContext, rng, nameProvider, droidNameProvider
}) {
  const difficulty = pickObjectiveDifficulty({ rng });
  const template = pickObjectiveTemplate({ missionType, tier, rng });
  const { slotValues, subjectRole, subjectArchetype, subjectNpcConcept, cargoCommodityId } = await resolveObjectiveSlots({
    template, missionType, preferTags, locationContext, factionDraftId, issuerFactionName, withNamedSubjects, economyContext, rng, nameProvider, droidNameProvider
  });
  const description = renderObjectiveTemplate(template, slotValues);
  const constraints = pickObjectiveConstraints({ rng, preferTags, count: randomIntInclusive(0, 2, { rng }) }).map((e) => e.value);
  const oppositionRequest = buildOppositionRequest({ template, missionType, difficulty, locationContext, organizationTags, rng });

  const assetObjectiveType = TEMPLATE_ASSET_OBJECTIVE_TYPE[template.id];
  const assetObjective = assetObjectiveType
    ? { objectiveType: assetObjectiveType, value: ASSET_VALUE_BY_DIFFICULTY[difficulty] ?? ASSET_VALUE_BY_DIFFICULTY.standard, name: slotValues.ship || slotValues.cargo || 'the valued asset', referenceId: cargoCommodityId }
    : null;

  return createJobObjectiveDraft({
    templateId: template.id,
    missionType,
    tier,
    difficulty,
    title: `${tier === OBJECTIVE_TIER.PRIMARY ? 'Primary' : tier === OBJECTIVE_TIER.SECONDARY ? 'Secondary' : 'Tertiary'} objective (${missionType})`,
    description,
    slotValues,
    constraints,
    subjectRole,
    subjectArchetype,
    subjectNpcConcept,
    oppositionRequest,
    assetObjective
  });
}

/** Compute `objectiveRewardWeight()`-ready summaries for `estimateReward()`, plus resolve the reward package. */
function computeJobReward({ objectives, issuer, relationship, rng, applyVariance, partyCapability }) {
  const objectiveInputs = objectives.map((o) => ({ tier: o.tier, difficulty: o.difficulty }));
  const primaryAsset = objectives.find((o) => o.assetObjective)?.assetObjective ?? null;
  const estimate = estimateReward({
    partyCapability,
    objectives: objectiveInputs,
    issuer,
    relationship,
    asset: primaryAsset ? { value: primaryAsset.value, objectiveType: primaryAsset.objectiveType } : null,
    rng,
    applyVariance
  });

  let rewardPackage;
  if (estimate.keepsTarget) {
    rewardPackage = createKeepTheTargetPackage(estimate, { assetName: primaryAsset?.name ?? '', referenceId: primaryAsset?.referenceId ?? '' });
  } else {
    rewardPackage = createRewardPackage(estimate.total);
  }
  return { estimate, rewardPackage };
}

/**
 * Generate a full procedural Job draft.
 *
 * @param {object} [options]
 * @param {() => number} [options.rng]
 * @param {string} [options.missionType] - explicit override; rolled (soft-biased) if omitted.
 * @param {string[]} [options.preferTags]
 * @param {object} [options.jobContext] - `{ locationContext, factionContext, contactContext, economyContext, campaignTags }`, see module header.
 * @param {object} [options.issuer] - explicit override: `{ type, name, factionId, factionDraftId, scale, relationship, contactId, contactDraftId }`.
 * @param {string} [options.locationId] / {string} [options.locationDraftId] / {string} [options.locationName]
 * @param {number} [options.partyCapability] - explicit override; else `jobContext.partyLevels` via `computePartyCapability()`, else 5.
 * @param {number[]} [options.partyLevels]
 * @param {number} [options.objectiveCount] - explicit override; defaults to a weighted roll (mostly 1).
 * @param {boolean} [options.withNamedSubjects] - allow full `npc/npc-bundle.js` NPC concepts for objective subjects (soft 40% roll per eligible objective); defaults false (archetype-only, cheaper, matches "most Jobs are ordinary").
 * @param {boolean} [options.applyVariance]
 * @param {object} [options.nameProvider] / {object} [options.droidNameProvider]
 */
export async function createProceduralJobDraft({
  rng,
  missionType = '',
  preferTags = [],
  jobContext = null,
  issuer = null,
  locationId = '',
  locationDraftId = '',
  locationName = '',
  partyCapability,
  partyLevels,
  objectiveCount,
  withNamedSubjects = false,
  applyVariance = true,
  nameProvider,
  droidNameProvider
} = {}) {
  const locationContext = jobContext?.locationContext ?? null;
  const factionContext = jobContext?.factionContext ?? null;
  const contactContext = jobContext?.contactContext ?? null;
  const economyContext = jobContext?.economyContext ?? null;
  const campaignTags = jobContext?.campaignTags ?? [];

  const mergedPreferTags = mergeTags(
    preferTags,
    campaignTags,
    locationContext?.locationTags ?? [],
    locationContext?.economyTags ?? [],
    locationContext?.technologySpecialties ?? [],
    factionContext?.jobDefaults?.tone ? [factionContext.jobDefaults.tone] : []
  );

  const resolvedMissionType = missionType || rollJobMissionType({ rng, preferTags: mergedPreferTags });
  const archetypeMeta = describeJobArchetype(resolvedMissionType);

  // --- issuer resolution: explicit override wins; else factionContext/
  // contactContext soft-derive one; else a generic ordinary individual.
  // Canonical-id-first, draft-id-fallback -- never both meaning the same
  // Faction/Contact (see job-draft.js's own header for the discipline).
  const resolvedIssuer = {
    type: issuer?.type ?? (factionContext ? ISSUER_TYPE.FACTION : ISSUER_TYPE.ORDINARY_INDIVIDUAL),
    name: issuer?.name ?? contactContext?.name ?? factionContext?.name ?? '',
    factionId: issuer?.factionId ?? factionContext?.factionId ?? '',
    factionDraftId: issuer?.factionDraftId ?? factionContext?.factionDraftId ?? '',
    contactId: issuer?.contactId ?? contactContext?.contactId ?? '',
    contactDraftId: issuer?.contactDraftId ?? contactContext?.contactDraftId ?? '',
    scale: issuer?.scale ?? factionContext?.scale,
    relationship: issuer?.relationship ?? factionContext?.relationship ?? 'neutral'
  };

  // --- legality/visibility: explicit > Faction jobDefaults (soft) > archetype typical (soft) > random.
  const jobDefaults = factionContext?.jobDefaults ?? null;
  const legalityRoll = (rng ?? Math.random)();
  const resolvedLegality = isJobLegality(jobDefaults?.legality) && legalityRoll < 0.5
    ? jobDefaults.legality
    : (archetypeMeta.typicalLegality && isJobLegality(archetypeMeta.typicalLegality) && legalityRoll < 0.8
      ? archetypeMeta.typicalLegality
      : pickJobLegality({ rng }).value);
  const visibilityRoll = (rng ?? Math.random)();
  const resolvedVisibility = isJobVisibility(jobDefaults?.visibility) && visibilityRoll < 0.5
    ? jobDefaults.visibility
    : (archetypeMeta.typicalVisibility && isJobVisibility(archetypeMeta.typicalVisibility) && visibilityRoll < 0.8
      ? archetypeMeta.typicalVisibility
      : pickJobVisibility({ rng }).value);

  const urgency = pickJobUrgency({ rng }).value;
  const hook = pickJobHook({ rng, preferTags: mergedPreferTags }).value;
  const stakes = pickJobStakes({ rng, preferTags: mergedPreferTags }).value;
  const complications = pickJobComplications({ rng, preferTags: mergedPreferTags, count: randomIntInclusive(1, 2, { rng }) });
  // Twists are rare, optional flavor -- see job-twist.js's own header. Roll one only ~20% of the time.
  const twist = (rng ?? Math.random)() < 0.2 ? pickJobTwist({ rng, preferTags: mergedPreferTags }) : null;
  const { success: successConsequence, failure: failureConsequence } = generateJobConsequences({ rng, preferTags: mergedPreferTags });

  const resolvedObjectiveCount = Number.isFinite(objectiveCount) ? Math.max(1, Math.round(objectiveCount)) : rollObjectiveCount({ rng });
  const objectives = [];
  const tiersForCount = [OBJECTIVE_TIER.PRIMARY, OBJECTIVE_TIER.SECONDARY, OBJECTIVE_TIER.TERTIARY];
  for (let i = 0; i < resolvedObjectiveCount; i++) {
    // eslint-disable-next-line no-await-in-loop -- sequential by design, matching faction-bundle.js's generateFactionContacts() precedent.
    const objective = await buildJobObjective({
      tier: tiersForCount[i] ?? OBJECTIVE_TIER.TERTIARY,
      missionType: resolvedMissionType,
      preferTags: mergedPreferTags,
      locationContext,
      factionDraftId: resolvedIssuer.factionDraftId,
      issuerFactionName: resolvedIssuer.name,
      organizationTags: factionContext?.doctrineTags ?? [],
      withNamedSubjects,
      economyContext,
      rng,
      nameProvider,
      droidNameProvider
    });
    objectives.push(objective);
  }

  const resolvedPartyCapability = Number.isFinite(partyCapability)
    ? partyCapability
    : (Array.isArray(partyLevels) && partyLevels.length ? computePartyCapability(partyLevels).capability : 5);

  const { estimate, rewardPackage } = computeJobReward({
    objectives, issuer: { type: resolvedIssuer.type, scale: resolvedIssuer.scale }, relationship: resolvedIssuer.relationship,
    rng, applyVariance, partyCapability: resolvedPartyCapability
  });
  const objectivesWithReward = objectives.map((o, i) => (i === 0 ? updateJobObjectiveDraft(o, { rewardCredits: rewardPackage.credits }) : o));

  let provenance = createProvenance({ presetId: resolvedMissionType, tags: [resolvedMissionType, resolvedLegality, resolvedVisibility] });
  if (estimate.diagnostics.includes('hostile-relationship-no-normal-job')) {
    provenance = withWarning(provenance, DIAGNOSTIC_CODE.HOSTILE_RELATIONSHIP_NO_NORMAL_JOB);
  }
  if (estimate.diagnostics.includes('issuer-resource-mismatch')) {
    provenance = withWarning(provenance, DIAGNOSTIC_CODE.ISSUER_RESOURCE_MISMATCH);
  }
  // Faction/Location context conflict: an explicit locationId/locationDraftId disagrees with locationContext's own declared identity -- flagged, never silently overridden (matches NPC_LOCATION_CONTEXT_MISMATCH's precedent).
  if (locationContext && (locationContext.locationId || locationContext.locationDraftId)) {
    const contextTarget = locationContext.locationId || locationContext.locationDraftId;
    const explicitTarget = locationId || locationDraftId;
    if (explicitTarget && contextTarget && explicitTarget !== contextTarget) {
      provenance = withWarning(provenance, DIAGNOSTIC_CODE.JOB_CONTEXT_MISMATCH);
    }
  }

  let notes = '';
  if (Array.isArray(locationContext?.currentEventHints) && locationContext.currentEventHints.length) {
    // Location current-events are read-only narrative seeds -- never mutated, only referenced as flavor.
    notes = `Local current-events seed: ${locationContext.currentEventHints[0]}`;
  }

  const draft = createJobDraft({
    title: `${resolvedMissionType.charAt(0).toUpperCase()}${resolvedMissionType.slice(1)} job`,
    missionType: resolvedMissionType,
    legality: resolvedLegality,
    visibility: resolvedVisibility,
    urgency,
    hook,
    stakes,
    briefing: objectivesWithReward[0]?.description ?? '',
    notes,
    issuerType: resolvedIssuer.type,
    issuerName: resolvedIssuer.name,
    issuerFactionId: resolvedIssuer.factionId,
    issuerFactionDraftId: resolvedIssuer.factionDraftId,
    issuerContactId: resolvedIssuer.contactId,
    issuerContactDraftId: resolvedIssuer.contactDraftId,
    issuerScale: resolvedIssuer.scale,
    issuerRelationship: resolvedIssuer.relationship,
    locationId: locationId || locationContext?.locationId || '',
    locationDraftId: locationDraftId || locationContext?.locationDraftId || '',
    locationName,
    objectives: objectivesWithReward,
    complications,
    twist,
    successConsequence,
    failureConsequence,
    successDelta: jobDefaults?.successDelta ?? 1,
    failureDelta: jobDefaults?.failureDelta ?? -1,
    rewardEstimate: estimate,
    rewardPackage,
    contextTags: mergedPreferTags,
    provenance
  });

  return draft;
}

// --- reroll / regenerate operations --------------------------------------

/** Full regenerate: a wholly new draft, preserving the caller's context inputs unless explicitly overridden. */
export async function regenerateJobDraft(draft, options = {}) {
  return createProceduralJobDraft({ ...options, missionType: options.missionType ?? '' });
}

/** Reroll ONLY the mission type (and its typical legality/visibility defaults, which are DIRECTLY derived from it) -- objectives/opposition/reward are left untouched; use `regenerateJobObjectives()` afterward if they should follow the new mission type. */
export function rerollJobMissionType(draft, { rng, preferTags } = {}) {
  const missionType = rollJobMissionType({ rng, preferTags: preferTags ?? draft.contextTags });
  const meta = describeJobArchetype(missionType);
  return updateJobDraft(draft, {
    missionType,
    legality: meta.typicalLegality && isJobLegality(meta.typicalLegality) ? meta.typicalLegality : draft.legality,
    visibility: meta.typicalVisibility && isJobVisibility(meta.typicalVisibility) ? meta.typicalVisibility : draft.visibility
  });
}

/** Reroll ONLY legality + visibility. */
export function rerollJobLegalityVisibility(draft, { rng } = {}) {
  return updateJobDraft(draft, { legality: pickJobLegality({ rng }).value, visibility: pickJobVisibility({ rng }).value });
}

/** Reroll ONLY urgency. */
export function rerollJobUrgency(draft, { rng } = {}) {
  return updateJobDraft(draft, { urgency: pickJobUrgency({ rng }).value });
}

/** Reroll ONLY the opening hook. */
export function rerollJobHook(draft, { rng, preferTags } = {}) {
  return updateJobDraft(draft, { hook: pickJobHook({ rng, preferTags: preferTags ?? draft.contextTags }).value });
}

/** Reroll ONLY the stakes. */
export function rerollJobStakes(draft, { rng, preferTags } = {}) {
  return updateJobDraft(draft, { stakes: pickJobStakes({ rng, preferTags: preferTags ?? draft.contextTags }).value });
}

/** Reroll the complication list. */
export function rerollJobComplications(draft, { rng, preferTags, count } = {}) {
  const complications = pickJobComplications({ rng, preferTags: preferTags ?? draft.contextTags, count: count ?? Math.max(1, draft.complications.length) });
  return updateJobDraft(draft, { complications });
}

/** Reroll the twist (or generate one if the draft had none). */
export function rerollJobTwist(draft, { rng, preferTags } = {}) {
  return updateJobDraft(draft, { twist: pickJobTwist({ rng, preferTags: preferTags ?? draft.contextTags }) });
}

/** Remove the twist entirely (a GM decision that this Job has no twist). */
export function removeJobTwist(draft) {
  return updateJobDraft(draft, { twist: null });
}

/** Reroll success/failure consequences. */
export function rerollJobConsequences(draft, { rng, preferTags } = {}) {
  const { success, failure } = generateJobConsequences({ rng, preferTags: preferTags ?? draft.contextTags });
  return updateJobDraft(draft, { successConsequence: success, failureConsequence: failure });
}

/** Recompute ONLY the reward estimate/package from the draft's CURRENT objectives/issuer -- e.g. after editing objectives or the party roster, without rerolling anything narrative. */
export function rerollJobReward(draft, { rng, partyCapability, partyLevels, applyVariance = true } = {}) {
  const resolvedPartyCapability = Number.isFinite(partyCapability)
    ? partyCapability
    : (Array.isArray(partyLevels) && partyLevels.length ? computePartyCapability(partyLevels).capability : 5);
  const { estimate, rewardPackage } = computeJobReward({
    objectives: draft.objectives, issuer: { type: draft.issuerType, scale: draft.issuerScale }, relationship: draft.issuerRelationship,
    rng, applyVariance, partyCapability: resolvedPartyCapability
  });
  const objectives = draft.objectives.map((o, i) => (i === 0 ? updateJobObjectiveDraft(o, { rewardCredits: rewardPackage.credits }) : o));
  return updateJobDraft(draft, { objectives, rewardEstimate: estimate, rewardPackage });
}

/** Regenerate EVERY objective against the draft's current mission type/context -- the "reroll all objectives" bundle operation, mirroring `faction-bundle.js`'s `regenerateFactionContacts()`. Automatically recomputes the reward from the fresh objective set. */
export async function regenerateJobObjectives(draft, { rng, count, preferTags, locationContext, withNamedSubjects = false, economyContext, nameProvider, droidNameProvider, partyCapability, partyLevels, applyVariance = true } = {}) {
  const resolvedCount = Number.isFinite(count) ? Math.max(1, count) : draft.objectives.length || 1;
  const tiersForCount = [OBJECTIVE_TIER.PRIMARY, OBJECTIVE_TIER.SECONDARY, OBJECTIVE_TIER.TERTIARY];
  const objectives = [];
  for (let i = 0; i < resolvedCount; i++) {
    // eslint-disable-next-line no-await-in-loop -- sequential by design, matching faction-bundle.js's own precedent.
    const objective = await buildJobObjective({
      tier: tiersForCount[i] ?? OBJECTIVE_TIER.TERTIARY, missionType: draft.missionType, preferTags: preferTags ?? draft.contextTags,
      locationContext, factionDraftId: draft.issuerFactionDraftId, issuerFactionName: draft.issuerName, organizationTags: [],
      withNamedSubjects, economyContext, rng, nameProvider, droidNameProvider
    });
    objectives.push(objective);
  }
  const withReward = updateJobDraft(draft, { objectives });
  return rerollJobReward(withReward, { rng, partyCapability, partyLevels, applyVariance });
}

/** Reroll ONE objective by `draftId`, preserving every OTHER objective untouched -- the core "never silently destroy sibling objectives" guarantee, matching `faction-bundle.js`'s `rerollFactionContact()`. Recomputes the reward afterward. A no-op if no objective with that `draftId` exists. */
export async function rerollJobObjective(draft, objectiveDraftId, { rng, preferTags, locationContext, withNamedSubjects = false, economyContext, nameProvider, droidNameProvider, partyCapability, partyLevels, applyVariance = true } = {}) {
  const index = draft.objectives.findIndex((o) => o.draftId === objectiveDraftId);
  if (index === -1) return draft;
  const target = draft.objectives[index];
  const replacement = await buildJobObjective({
    tier: target.tier, missionType: draft.missionType, preferTags: preferTags ?? draft.contextTags,
    locationContext, factionDraftId: draft.issuerFactionDraftId, issuerFactionName: draft.issuerName, organizationTags: [],
    withNamedSubjects, economyContext, rng, nameProvider, droidNameProvider
  });
  const rerolled = { ...replacement, draftId: objectiveDraftId };
  const objectives = draft.objectives.map((o, i) => (i === index ? rerolled : o));
  const withObjectives = updateJobDraft(draft, { objectives });
  return rerollJobReward(withObjectives, { rng, partyCapability, partyLevels, applyVariance });
}

/** Add one new objective (tertiary by default), generated against the draft's current mission type/context. Every existing objective is preserved untouched. Recomputes the reward afterward. */
export async function addJobObjective(draft, { rng, tier = OBJECTIVE_TIER.TERTIARY, preferTags, locationContext, withNamedSubjects = false, economyContext, nameProvider, droidNameProvider, partyCapability, partyLevels, applyVariance = true } = {}) {
  const objective = await buildJobObjective({
    tier, missionType: draft.missionType, preferTags: preferTags ?? draft.contextTags,
    locationContext, factionDraftId: draft.issuerFactionDraftId, issuerFactionName: draft.issuerName, organizationTags: [],
    withNamedSubjects, economyContext, rng, nameProvider, droidNameProvider
  });
  const withObjectives = updateJobDraft(draft, { objectives: [...draft.objectives, objective] });
  return rerollJobReward(withObjectives, { rng, partyCapability, partyLevels, applyVariance });
}

/** Remove one objective by `draftId`. A no-op if no objective with that id exists, OR if it is the draft's only objective (a Job must have at least one objective). Every OTHER objective is preserved untouched. Recomputes the reward afterward. */
export function removeJobObjective(draft, objectiveDraftId, { rng, partyCapability, partyLevels, applyVariance = true } = {}) {
  if (draft.objectives.length <= 1) return draft;
  const objectives = draft.objectives.filter((o) => o.draftId !== objectiveDraftId);
  if (objectives.length === draft.objectives.length) return draft;
  const withObjectives = updateJobDraft(draft, { objectives });
  return rerollJobReward(withObjectives, { rng, partyCapability, partyLevels, applyVariance });
}

/** Reroll ONLY one objective's opposition request, leaving every other field of that objective (and every other objective) untouched -- the finest-grained opposition reroll this system offers. A no-op if no objective with that `draftId` exists. */
export function rerollJobObjectiveOpposition(draft, objectiveDraftId, { rng, locationContext, organizationTags } = {}) {
  const index = draft.objectives.findIndex((o) => o.draftId === objectiveDraftId);
  if (index === -1) return draft;
  const target = draft.objectives[index];
  const template = OBJECTIVE_TEMPLATE_FIXTURES.find((t) => t.id === target.templateId) ?? null;
  const oppositionRequest = buildOppositionRequest({ template, missionType: target.missionType, difficulty: target.difficulty, locationContext, organizationTags, rng });
  const objectives = draft.objectives.map((o, i) => (i === index ? updateJobObjectiveDraft(o, { oppositionRequest }) : o));
  return updateJobDraft(draft, { objectives });
}

/** Reroll ONLY one objective's subject (archetype label, or a full named NPC concept when `forceNamedSubject`/`withNamedSubjects` apply) -- every other field stays untouched. A no-op if no objective with that `draftId` exists. */
export async function rerollJobObjectiveSubject(draft, objectiveDraftId, { rng, preferTags, locationContext, withNamedSubjects = false, forceNamedSubject = false, nameProvider, droidNameProvider } = {}) {
  const index = draft.objectives.findIndex((o) => o.draftId === objectiveDraftId);
  if (index === -1) return draft;
  const target = draft.objectives[index];
  const template = OBJECTIVE_TEMPLATE_FIXTURES.find((t) => t.id === target.templateId) ?? null;
  if (!template) return draft;
  const { slotValues, subjectRole, subjectArchetype, subjectNpcConcept } = await resolveObjectiveSlots({
    template, missionType: target.missionType, preferTags: preferTags ?? draft.contextTags, locationContext,
    factionDraftId: draft.issuerFactionDraftId, issuerFactionName: draft.issuerName, withNamedSubjects, forceNamedSubject, economyContext: null, rng, nameProvider, droidNameProvider
  });
  // Only the NPC-shaped slot(s) actually change on a subject reroll --
  // resolveObjectiveSlots() re-resolves every slot as a side effect of
  // reuse, but every OTHER slot (location/cargo/faction/...) must stay
  // exactly as it was, matching this function's own "finest-grained
  // reroll" contract.
  const npcSlotNames = Object.entries(template.slots)
    .filter(([, def]) => ['person-or-droid', 'living-npc', 'droid', 'npc'].includes(def.type))
    .map(([name]) => name);
  const changedSlotValues = Object.fromEntries(npcSlotNames.map((name) => [name, slotValues[name]]));
  const mergedSlotValues = { ...target.slotValues, ...changedSlotValues };
  const description = renderObjectiveTemplate(template, mergedSlotValues);
  const objectives = draft.objectives.map((o, i) => (i === index ? updateJobObjectiveDraft(o, { slotValues: mergedSlotValues, description, subjectRole, subjectArchetype, subjectNpcConcept }) : o));
  return updateJobDraft(draft, { objectives });
}
