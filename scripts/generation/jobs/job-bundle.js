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
 * descriptors, asset-objective-type-per-template map, independent
 * opposition-facet roll weights) that have no other natural home.
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
 * CORRECTION (round 1, independent review of PR #965's initial head):
 * this file was substantially reworked to fix several real defects the
 * review found:
 *  - `jobContext.factionContext`/`contactContext` identity was read via
 *    ad-hoc field names (`factionContext?.factionId`) that matched
 *    neither a real Faction record (`id`) nor a Faction draft
 *    (`draftId`) -- now routed through `job-context.js`'s
 *    `resolveJobIssuerFactionContext()`/`resolveJobIssuerContactContext()`,
 *    which also enforce the SAME explicit/context duality invariant
 *    Location already had (`resolveDualityReference()`,
 *    `lib/reference-duality.js`) and surface Actor identity
 *    (`issuerContactActorId`/`ActorUuid`/`ActorName`) the canonical
 *    Job schema itself already expects.
 *  - `locationContext.currentEventHints` never matched the real
 *    `location-event.js` shape (`currentEvents: [{description,
 *    severity}]`) -- fixed via `resolveJobCurrentEventText()`.
 *  - `locationContext.suggestedJobArchetypeTags` (the REAL mission-type
 *    bias signal Phase 8D-3A's Location layer already produces) was
 *    never read at all -- now flows into `rollJobMissionType()`
 *    through `deriveJobContextTags()`.
 *  - a context-identity CONFLICT was diagnosed but the conflicting
 *    context's tags/bias were still consumed anyway -- now the
 *    resolvers above return `context: null` on conflict and every
 *    downstream tag/bias derivation reads ONLY the post-resolution
 *    value, never the raw input, exactly like `npc/npc-bundle.js`'s own
 *    discipline.
 *  - `regenerateJobDraft()` created a WHOLLY NEW draft (new draftId),
 *    silently discarding every GM edit -- fixed to preserve `draftId`
 *    and every GM-authored field (see its own doc below).
 *  - a fabricated `ASSET_VALUE_BY_DIFFICULTY` price table fed
 *    `estimateReward()` an invented number, contradicting
 *    `reward-estimator.js`/`reward-package.js`'s own explicit "the
 *    caller resolves a REAL price through a future Store/pricing
 *    authority" contract -- removed; an asset objective now carries
 *    `value: null` until a real price is supplied.
 *  - opposition's `threatLevel`/`countBand`/`leaderRequirement`/
 *    `reinforcementLevel` were hard-mapped 1:1 from objective
 *    difficulty, re-coupling facets `opposition-request.js`'s own
 *    header explicitly keeps independent ("a deadly/horde fight can
 *    still be routine difficulty") -- now rolled independently;
 *    `rankContext`'s leadership boost no longer scales with difficulty
 *    either (opposition rank is not an encounter-balancing signal).
 *  - `title`/`briefing` were computed once at creation and never
 *    refreshed by a later mission-type/objective reroll -- fixed via
 *    `recomposeJobTitle()`/`recomposeJobBriefing()`, mirroring
 *    `npc-concept.js`'s `publicDescriptionSource`/
 *    `recomposeNpcPublicDescription()` pattern (respects a GM's manual
 *    edit, never overwrites it).
 *  - a Primary objective's `required` flag could be overridden to
 *    `false` -- `job-draft.js`'s `createJobObjectiveDraft()` now forces
 *    it; `removeJobObjective()` here now promotes another objective to
 *    Primary when the Primary is removed, so a Job can never end up
 *    with no Primary objective.
 *  - complications had no stable per-instance identity -- now wrapped
 *    via `job-draft.js`'s `createJobComplicationInstance()`, with new
 *    single-instance `rerollJobComplication()`/`addJobComplication()`/
 *    `removeJobComplication()` operations; a Job may now legitimately
 *    have zero complications.
 *
 * CONTEXT WIRING (`jobContext`, phase spec's central "soft weighting"
 * requirement): `jobContext.locationContext` reuses the EXACT shape
 * `npc/npc-bundle.js`/`factions/faction-bundle.js` already accept
 * (`{technologyLevel, technologyAccess, technologySpecialties,
 * economyTags, locationTags, locationId, locationDraftId,
 * suggestedJobArchetypeTags, suggestedOppositionTags, currentEvents}`)
 * — no new Location context shape is invented. `jobContext.factionContext`
 * reads a real-or-draft Faction's OWN `jobDefaults` (never duplicated)
 * as a soft bias. `jobContext.contactContext` supplies an issuer
 * Contact's identity (real Contact or `npc-concept.js` draft).
 * `jobContext.economyContext` supplies commodity bias for cargo-flavored
 * objectives, reusing `data/galactic-commodities.js` `id`s verbatim.
 * `jobContext.campaignTags` are free-form tags merged in like every
 * other `preferTags` source. Every one of these is a SOFT bias (a
 * probabilistic nudge, never a hard filter/override) — no single
 * context source can monopolize output, matching the phase spec's
 * explicit "no context should monopolize output" requirement.
 */

import {
  createJobDraft, updateJobDraft, createJobObjectiveDraft, updateJobObjectiveDraft,
  createJobComplicationInstance, JOB_DERIVED_TEXT_SOURCE
} from './job-draft.js';
import {
  resolveJobLocationContext, resolveJobIssuerFactionContext, resolveJobIssuerContactContext,
  deriveJobContextTags, resolveJobCurrentEventText
} from './job-context.js';
import { JOB_ARCHETYPE_METADATA, describeJobArchetype } from './job-archetype-metadata.js';
import { pickJobLegality, pickJobVisibility, isJobLegality, isJobVisibility } from './job-legality-visibility.js';
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

/** Roll a mission type. Soft-biased by `preferTags` containing a mission-type name (e.g. a Location's own `suggestedJobArchetypeTags`, folded in by `deriveJobContextTags()`); never a hard filter. */
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

// --- opposition facets: rolled INDEPENDENTLY, never derived from difficulty
// CORRECTION (round 1): `opposition-request.js`'s own header is explicit
// that `difficulty`/`threatLevel`/`countBand` are deliberately
// overlapping-but-separate facets ("a deadly/horde fight can still be
// routine difficulty for a high-tier party") -- the original
// `OPPOSITION_PROFILE_BY_DIFFICULTY` 1:1 map violated exactly that. Each
// facet below is now its own independent weighted roll, never keyed off
// an objective's difficulty band. This also keeps 8D-3C's own explicit
// "not an encounter-balancing system" boundary -- difficulty stays a
// pure reward-economy input (`objective-economy.js`), never an opposition
// composition input.
const THREAT_LEVEL_ENTRIES = Object.freeze([
  { value: OPPOSITION_THREAT_LEVEL.TRIVIAL, weight: 3 },
  { value: OPPOSITION_THREAT_LEVEL.STANDARD, weight: 5 },
  { value: OPPOSITION_THREAT_LEVEL.DANGEROUS, weight: 3 },
  { value: OPPOSITION_THREAT_LEVEL.DEADLY, weight: 1 }
]);
const COUNT_BAND_ENTRIES = Object.freeze([
  { value: OPPOSITION_COUNT_BAND.SOLO, weight: 2 },
  { value: OPPOSITION_COUNT_BAND.PAIR, weight: 3 },
  { value: OPPOSITION_COUNT_BAND.SMALL_GROUP, weight: 4 },
  { value: OPPOSITION_COUNT_BAND.SQUAD, weight: 2 },
  { value: OPPOSITION_COUNT_BAND.HORDE, weight: 0.5 }
]);
const LEADER_REQUIREMENT_ENTRIES = Object.freeze([
  { value: OPPOSITION_LEADER_REQUIREMENT.NONE, weight: 5 },
  { value: OPPOSITION_LEADER_REQUIREMENT.OPTIONAL, weight: 3 },
  { value: OPPOSITION_LEADER_REQUIREMENT.REQUIRED, weight: 1 }
]);
const REINFORCEMENT_LEVEL_ENTRIES = Object.freeze([
  { value: OPPOSITION_SUPPORT_LEVEL.NONE, weight: 5 },
  { value: OPPOSITION_SUPPORT_LEVEL.LIGHT, weight: 3 },
  { value: OPPOSITION_SUPPORT_LEVEL.MODERATE, weight: 1.5 },
  { value: OPPOSITION_SUPPORT_LEVEL.HEAVY, weight: 0.5 }
]);

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

/** How many complications a Job gets -- 0 is a legitimate, common outcome (a clean job is not a bug), matching `planet-hooks.js`'s own `pickCurrentEventCount()` "weighted toward fewer" framing. */
function rollComplicationCount({ rng } = {}) {
  const entries = [{ value: 0, weight: 3 }, { value: 1, weight: 5 }, { value: 2, weight: 2 }];
  return weightedPick(entries, { rng })?.value ?? 0;
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
 * decision: `oppositionSeedTags` (already-resolved `suggestedOppositionTags`
 * from Location/Contact context, see `deriveJobContextTags()`) + the
 * template's own `oppositionHints` feed `archetypeTags`; `rankContext`
 * reuses `npc/npc-bundle.js`'s existing `rollCommandTier()` at a flat,
 * neutral boost -- NOT scaled by difficulty (round 1 correction, see
 * module header). `threatLevel`/`countBand`/`leaderRequirement`/
 * `reinforcementLevel` are each rolled independently (`THREAT_LEVEL_ENTRIES`
 * etc. above), never DERIVED from `difficulty` -- but `difficulty` ITSELF
 * is still a real, independent facet of `createOppositionRequest()`'s own
 * shape (round 2 correction: round 1 over-corrected by omitting it
 * entirely, silently defaulting every request to `'standard'` forever;
 * "independent" means not deterministically coupled to the other
 * facets, not deleted from the request).
 */
function buildOppositionRequest({ template, missionType, difficulty, oppositionSeedTags, environmentTags, organizationTags, rng }) {
  const archetypeTags = normalizeTags([...(template?.oppositionHints ?? []), missionType, ...oppositionSeedTags]);
  return createOppositionRequest({
    archetypeTags,
    environmentTags: normalizeTags(environmentTags ?? []),
    organizationTags: normalizeTags(organizationTags ?? []),
    difficulty,
    rankContext: rollCommandTier({ rng, leadershipBoost: 1 }),
    threatLevel: weightedPick(THREAT_LEVEL_ENTRIES, { rng })?.value ?? OPPOSITION_THREAT_LEVEL.STANDARD,
    countBand: weightedPick(COUNT_BAND_ENTRIES, { rng })?.value ?? OPPOSITION_COUNT_BAND.SMALL_GROUP,
    leaderRequirement: weightedPick(LEADER_REQUIREMENT_ENTRIES, { rng })?.value ?? OPPOSITION_LEADER_REQUIREMENT.NONE,
    reinforcementLevel: weightedPick(REINFORCEMENT_LEVEL_ENTRIES, { rng })?.value ?? OPPOSITION_SUPPORT_LEVEL.NONE,
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
  tier, missionType, preferTags, locationContext, oppositionSeedTags, factionDraftId, issuerFactionName, organizationTags,
  withNamedSubjects, economyContext, rng, nameProvider, droidNameProvider
}) {
  const difficulty = pickObjectiveDifficulty({ rng });
  const template = pickObjectiveTemplate({ missionType, tier, rng });
  const { slotValues, subjectRole, subjectArchetype, subjectNpcConcept, cargoCommodityId } = await resolveObjectiveSlots({
    template, missionType, preferTags, locationContext, factionDraftId, issuerFactionName, withNamedSubjects, economyContext, rng, nameProvider, droidNameProvider
  });
  const description = renderObjectiveTemplate(template, slotValues);
  const constraints = pickObjectiveConstraints({ rng, preferTags, count: randomIntInclusive(0, 2, { rng }) }).map((e) => e.value);
  const oppositionRequest = buildOppositionRequest({
    template, missionType, difficulty, oppositionSeedTags: oppositionSeedTags ?? [], environmentTags: locationContext?.locationTags ?? [], organizationTags, rng
  });

  // CORRECTION (round 1): no fabricated price. `value` stays `null`
  // (`valueSource: 'unresolved'`, enforced by
  // job-draft.js's normalizeAssetObjective()) until a real caller
  // supplies one via the future Store/pricing authority -- see module
  // header and reward-estimator.js/reward-package.js's own contract.
  const assetObjectiveType = TEMPLATE_ASSET_OBJECTIVE_TYPE[template.id];
  const assetObjective = assetObjectiveType
    ? { objectiveType: assetObjectiveType, name: slotValues.ship || slotValues.cargo || 'the valued asset', referenceId: cargoCommodityId }
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

/** Compute `objectiveRewardWeight()`-ready summaries for `estimateReward()`, plus resolve the reward package. An objective's `assetObjective` only contributes to the estimate once it carries a REAL resolved `value` (see `buildJobObjective()`'s doc) -- an unresolved asset objective is treated as no asset at all, never a fabricated figure. */
function computeJobReward({ objectives, issuer, relationship, rng, applyVariance, partyCapability }) {
  const objectiveInputs = objectives.map((o) => ({ tier: o.tier, difficulty: o.difficulty }));
  const primaryAsset = objectives.find((o) => o.assetObjective?.value !== null && o.assetObjective?.value !== undefined)?.assetObjective ?? null;
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
 * Resolve every context input ONCE: Location/Faction/Contact identity
 * duality (explicit id wins on conflict, conflicting context dropped
 * entirely) plus the merged soft-weighting tag sets. Every caller below
 * (`createProceduralJobDraft()` and every reroll/regenerate operation
 * that accepts context) routes through this ONE function so the
 * "explicit wins, mismatched context never silently biases anything"
 * invariant can never drift between call sites.
 */
function resolveJobGenerationContext({ preferTags, jobContext, issuer, locationId, locationDraftId }) {
  const locationContext = jobContext?.locationContext ?? null;
  const factionContext = jobContext?.factionContext ?? null;
  const contactContext = jobContext?.contactContext ?? null;
  const economyContext = jobContext?.economyContext ?? null;
  const campaignTags = jobContext?.campaignTags ?? [];

  const locationResolution = resolveJobLocationContext({ locationId, locationDraftId, locationContext });
  const factionResolution = resolveJobIssuerFactionContext({
    issuerFactionId: issuer?.factionId ?? '', issuerFactionDraftId: issuer?.factionDraftId ?? '', factionContext
  });
  const contactResolution = resolveJobIssuerContactContext({
    issuerContactId: issuer?.contactId ?? '', issuerContactDraftId: issuer?.contactDraftId ?? '', contactContext
  });

  const { generalTags, missionTypeTags, oppositionSeedTags } = deriveJobContextTags({
    preferTags, campaignTags,
    locationContext: locationResolution.context,
    factionContextTags: factionResolution.contextTags,
    contactSuggestedJobArchetypeTags: contactResolution.suggestedJobArchetypeTags,
    contactSuggestedOppositionTags: contactResolution.suggestedOppositionTags
  });
  const mergedPreferTags = mergeTags(generalTags, missionTypeTags);

  const resolvedIssuer = {
    type: issuer?.type ?? (factionResolution.context ? ISSUER_TYPE.FACTION : ISSUER_TYPE.ORDINARY_INDIVIDUAL),
    name: issuer?.name ?? contactResolution.name ?? factionResolution.name ?? '',
    factionId: factionResolution.factionRef.factionId,
    factionDraftId: factionResolution.factionRef.factionDraftId,
    contactId: contactResolution.contactRef.contactId,
    contactDraftId: contactResolution.contactRef.contactDraftId,
    contactActorId: contactResolution.actorId,
    contactActorUuid: contactResolution.actorUuid,
    contactActorName: contactResolution.actorName,
    scale: issuer?.scale ?? factionResolution.scale,
    relationship: issuer?.relationship ?? factionResolution.context?.relationship ?? 'neutral'
  };

  return {
    locationContext: locationResolution.context,
    locationRef: locationResolution.locationRef,
    locationContextMismatch: locationResolution.contextMismatch,
    factionContextMismatch: factionResolution.contextMismatch,
    contactContextMismatch: contactResolution.contextMismatch,
    jobDefaults: factionResolution.jobDefaults,
    // CORRECTION (round 2): the issuer Faction's own tags, kept as a
    // SEPARATE set from `mergedPreferTags` so opposition-request build
    // sites can pass them as `organizationTags` specifically -- see
    // `job-draft.js`'s `issuerOrganizationTags` field doc.
    issuerOrganizationTags: factionResolution.contextTags,
    economyContext,
    mergedPreferTags,
    oppositionSeedTags,
    resolvedIssuer
  };
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
  const {
    locationContext, locationRef, locationContextMismatch, factionContextMismatch, contactContextMismatch,
    jobDefaults, issuerOrganizationTags, economyContext, mergedPreferTags, oppositionSeedTags, resolvedIssuer
  } = resolveJobGenerationContext({ preferTags, jobContext, issuer, locationId, locationDraftId });

  const resolvedMissionType = missionType || rollJobMissionType({ rng, preferTags: mergedPreferTags });
  const archetypeMeta = describeJobArchetype(resolvedMissionType);

  // --- legality/visibility: explicit > Faction jobDefaults (soft) > archetype typical (soft) > random.
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
  const complications = pickJobComplications({ rng, preferTags: mergedPreferTags, count: rollComplicationCount({ rng }) });
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
      oppositionSeedTags,
      factionDraftId: resolvedIssuer.factionDraftId,
      issuerFactionName: resolvedIssuer.name,
      organizationTags: issuerOrganizationTags,
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
  if (locationContextMismatch || factionContextMismatch || contactContextMismatch) {
    provenance = withWarning(provenance, DIAGNOSTIC_CODE.JOB_CONTEXT_MISMATCH);
  }

  // Location current-events are read-only narrative seeds -- never
  // mutated, only referenced as flavor. Reads the REAL location-event.js
  // shape (round 1 correction; the original `currentEventHints` field
  // never existed on any real locationContext).
  const currentEventText = resolveJobCurrentEventText(locationContext);
  const notes = currentEventText ? `Local current-events seed: ${currentEventText}` : '';

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
    issuerContactActorId: resolvedIssuer.contactActorId,
    issuerContactActorUuid: resolvedIssuer.contactActorUuid,
    issuerContactActorName: resolvedIssuer.contactActorName,
    issuerScale: resolvedIssuer.scale,
    issuerRelationship: resolvedIssuer.relationship,
    issuerOrganizationTags,
    locationId: locationRef.locationId,
    locationDraftId: locationRef.locationDraftId,
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

// --- derived-text recompose (title/briefing) ------------------------------

/** Recompute `title` from the draft's current `missionType` -- a no-op if the GM has manually edited it (`titleSource === 'manual'`), mirroring `npc-concept.js`'s `recomposeNpcPublicDescription()`. */
export function recomposeJobTitle(draft) {
  if (!draft || draft.titleSource === JOB_DERIVED_TEXT_SOURCE.MANUAL) return draft;
  const missionType = draft.missionType || '';
  const title = missionType ? `${missionType.charAt(0).toUpperCase()}${missionType.slice(1)} job` : draft.title;
  return updateJobDraft(draft, { title });
}

/** Recompute `briefing` from the draft's current primary objective's description -- a no-op if the GM has manually edited it. */
export function recomposeJobBriefing(draft) {
  if (!draft || draft.briefingSource === JOB_DERIVED_TEXT_SOURCE.MANUAL) return draft;
  const primary = draft.objectives.find((o) => o.tier === OBJECTIVE_TIER.PRIMARY) ?? draft.objectives[0];
  return updateJobDraft(draft, { briefing: primary?.description ?? draft.briefing });
}

/** Explicit GM authorship action: overwrite `title` with GM-written text and lock it against recompose. */
export function setJobTitle(draft, text) {
  if (!draft) return draft;
  return updateJobDraft(draft, { title: String(text ?? '').trim(), titleSource: JOB_DERIVED_TEXT_SOURCE.MANUAL });
}

/** The "↻ Recompose" action for title: hand it back to the derived regime and immediately recompute, discarding manual text. */
export function resetJobTitleToDerived(draft) {
  if (!draft) return draft;
  return recomposeJobTitle(updateJobDraft(draft, { titleSource: JOB_DERIVED_TEXT_SOURCE.DERIVED }));
}

/** Explicit GM authorship action: overwrite `briefing` with GM-written text and lock it against recompose. */
export function setJobBriefing(draft, text) {
  if (!draft) return draft;
  return updateJobDraft(draft, { briefing: String(text ?? '').trim(), briefingSource: JOB_DERIVED_TEXT_SOURCE.MANUAL });
}

/** The "↻ Recompose" action for briefing: hand it back to the derived regime and immediately recompute, discarding manual text. */
export function resetJobBriefingToDerived(draft) {
  if (!draft) return draft;
  return recomposeJobBriefing(updateJobDraft(draft, { briefingSource: JOB_DERIVED_TEXT_SOURCE.DERIVED }));
}

// --- reroll / regenerate operations --------------------------------------

/**
 * Regenerate THIS Job's generated content -- SAME `draftId`, and every
 * GM-authored fact survives: manual `title`/`briefing` (their
 * `*Source === 'manual'` lock is preserved as-is, so a manually-written
 * title is NOT recomposed even though the mission type may change), a
 * manually-owned objective `title`/`description` (round 2: preserved by
 * position when the objective count is unchanged -- see below), a
 * manually-overridden reward (`rewardSource === 'manual'`, round 2:
 * preserved wholesale), every `narrativeFields` entry the GM marked
 * `'manual'` or removed (hidden), custom fields, the explicit issuer/
 * Location links AND the issuer Contact's Actor identity (round 2: the
 * original version silently dropped `issuerContactActorId`/`ActorUuid`/
 * `ActorName` because the issuer-override object it rebuilt never
 * carried them -- fixed by restoring them from the OLD draft
 * unconditionally, since a promoted Actor's identity is exactly the
 * kind of stable relationship a regenerate must never sever) -- unless
 * the caller explicitly overrides any of these. ONLY the generated
 * facts (mission type roll, legality/visibility/urgency, hook/stakes,
 * objectives, complications, twist, consequences, reward) are rerolled.
 *
 * `preferTags` defaults to the draft's own persisted `contextTags`
 * (round 2: previously `undefined` unless the caller re-supplied one,
 * silently making a plain `regenerateJobDraft(draft, { rng })` call
 * genericize a Job that was originally biased by real Location/Faction/
 * Contact context). Reconstructing the FULL `jobContext` (Faction
 * `jobDefaults`, opposition seed tags, etc.) is NOT attempted here --
 * this module has no live Faction/Location object to re-derive it from,
 * only the ids/tags the draft itself persisted; a caller that wants
 * those to keep influencing regeneration must deliberately re-supply
 * `jobContext`, same as any other `job-bundle.js` operation.
 *
 * This is "regenerate THIS Job," never "create a new Job" -- use
 * `createProceduralJobDraft()` directly for a wholly new draft. Distinct
 * from `regenerateJobObjectives()` (objectives only) and the single-field
 * reroll wrappers below (one fact at a time).
 */
export async function regenerateJobDraft(draft, options = {}) {
  const fresh = await createProceduralJobDraft({
    missionType: options.missionType ?? '',
    preferTags: options.preferTags ?? draft.contextTags,
    jobContext: options.jobContext,
    issuer: options.issuer ?? {
      type: draft.issuerType, name: draft.issuerName, factionId: draft.issuerFactionId, factionDraftId: draft.issuerFactionDraftId,
      contactId: draft.issuerContactId, contactDraftId: draft.issuerContactDraftId, scale: draft.issuerScale, relationship: draft.issuerRelationship
    },
    locationId: options.locationId ?? draft.locationId,
    locationDraftId: options.locationDraftId ?? draft.locationDraftId,
    locationName: options.locationName ?? draft.locationName,
    objectiveCount: options.objectiveCount ?? draft.objectives.length,
    withNamedSubjects: options.withNamedSubjects,
    applyVariance: options.applyVariance,
    nameProvider: options.nameProvider,
    droidNameProvider: options.droidNameProvider,
    partyCapability: options.partyCapability,
    partyLevels: options.partyLevels
  });

  // Preserve GM-authored derived-text locks: if the OLD draft's
  // title/briefing were manually authored, keep them (and their
  // 'manual' source) verbatim rather than taking the fresh generated
  // ones. Actor identity and issuerOrganizationTags are restored
  // unconditionally UNLESS the caller explicitly asked to re-resolve
  // the issuer/context (options.issuer or options.jobContext supplied).
  const keepActorIdentity = !options.issuer;
  const keepOrganizationTags = !options.jobContext?.factionContext;
  let result = updateJobDraft(fresh, {
    draftId: draft.draftId,
    title: draft.titleSource === JOB_DERIVED_TEXT_SOURCE.MANUAL ? draft.title : fresh.title,
    titleSource: draft.titleSource,
    briefing: draft.briefingSource === JOB_DERIVED_TEXT_SOURCE.MANUAL ? draft.briefing : fresh.briefing,
    briefingSource: draft.briefingSource,
    issuerContactActorId: keepActorIdentity ? draft.issuerContactActorId : fresh.issuerContactActorId,
    issuerContactActorUuid: keepActorIdentity ? draft.issuerContactActorUuid : fresh.issuerContactActorUuid,
    issuerContactActorName: keepActorIdentity ? draft.issuerContactActorName : fresh.issuerContactActorName,
    issuerOrganizationTags: (keepOrganizationTags && !fresh.issuerOrganizationTags.length) ? draft.issuerOrganizationTags : fresh.issuerOrganizationTags
  });

  // Preserve a manually-owned objective's IDENTITY + title/description BY
  // POSITION when the objective count did not change (the common case: a
  // plain `regenerateJobDraft(draft, { rng })` call) -- preserving the
  // draftId too (not just the text) so a GM-locked objective is
  // recognizably the SAME objective across a regenerate, not a
  // differently-identified one that merely happens to carry the same
  // words. A count CHANGE has no well-defined positional correspondence,
  // so this preservation is skipped in that case -- an explicit
  // objectiveCount override is itself the caller choosing to reshape the
  // objective list.
  if (draft.objectives.length === result.objectives.length) {
    const mergedObjectives = result.objectives.map((freshObjective, i) => {
      const oldObjective = draft.objectives[i];
      const manualTitle = oldObjective?.titleSource === JOB_DERIVED_TEXT_SOURCE.MANUAL;
      const manualDescription = oldObjective?.descriptionSource === JOB_DERIVED_TEXT_SOURCE.MANUAL;
      if (!manualTitle && !manualDescription) return freshObjective;
      return updateJobObjectiveDraft(freshObjective, {
        draftId: oldObjective.draftId,
        title: manualTitle ? oldObjective.title : freshObjective.title,
        titleSource: manualTitle ? oldObjective.titleSource : freshObjective.titleSource,
        description: manualDescription ? oldObjective.description : freshObjective.description,
        descriptionSource: manualDescription ? oldObjective.descriptionSource : freshObjective.descriptionSource
      });
    });
    result = updateJobDraft(result, { objectives: mergedObjectives });
    // The merge above may have restored a DIFFERENT primary-objective
    // description than the one `fresh.briefing` was computed from --
    // recompose (a no-op if briefing is itself manually locked) so
    // briefing never goes stale relative to the objectives it was just
    // merged against.
    result = recomposeJobBriefing(result);
  }

  // Preserve a manually-overridden reward WHOLESALE -- the fresh
  // computation is discarded entirely rather than merged, matching
  // `applyRewardRecompute()`'s own "manual wins until an explicit
  // reroll" rule.
  if (draft.rewardSource === 'manual') {
    result = updateJobDraft(result, { rewardEstimate: draft.rewardEstimate, rewardPackage: draft.rewardPackage, rewardSource: 'manual' });
  }

  // Preserve every GM-authored `narrativeFields` entry (manual value OR
  // removed/hidden) field-by-field; a field the GM never touched is left
  // to the fresh draft's own lazily-uninitialized state (no
  // narrativeFields at all until the GM opens field-authoring, exactly
  // like a freshly generated Job).
  if (draft.narrativeFields) {
    const preservedFields = {};
    for (const [fieldId, field] of Object.entries(draft.narrativeFields.fields)) {
      const isManual = field.hidden || field.values.some((v) => v.source === 'manual');
      if (isManual) preservedFields[fieldId] = field;
    }
    if (Object.keys(preservedFields).length) {
      const baseState = result.narrativeFields ?? { order: draft.narrativeFields.order, fields: {} };
      const mergedState = { order: baseState.order, fields: { ...baseState.fields, ...preservedFields } };
      result = { ...result, narrativeFields: mergedState };
      // Mirror the preserved manual/hidden primaries back onto the
      // plain scalars, so a consumer that reads `draft.hook` (not
      // `draft.narrativeFields`) still sees the GM's authored text
      // immediately, without requiring a field-authoring op first.
      for (const fieldId of Object.keys(preservedFields)) {
        const field = preservedFields[fieldId];
        const primary = field.hidden ? '' : (field.values[0]?.value ?? '');
        result = updateJobDraft(result, { [fieldId]: primary });
        result = { ...result, narrativeFields: mergedState };
      }
    }
  }

  return result;
}

/** Reroll ONLY the mission type (and its typical legality/visibility defaults, which are DIRECTLY derived from it) -- objectives/opposition/reward are left untouched; use `regenerateJobObjectives()` afterward if they should follow the new mission type. Recomposes `title` (respecting a manual lock). */
export function rerollJobMissionType(draft, { rng, preferTags } = {}) {
  const missionType = rollJobMissionType({ rng, preferTags: preferTags ?? draft.contextTags });
  const meta = describeJobArchetype(missionType);
  const next = updateJobDraft(draft, {
    missionType,
    legality: meta.typicalLegality && isJobLegality(meta.typicalLegality) ? meta.typicalLegality : draft.legality,
    visibility: meta.typicalVisibility && isJobVisibility(meta.typicalVisibility) ? meta.typicalVisibility : draft.visibility
  });
  return recomposeJobTitle(next);
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

/** Reroll the WHOLE complication list (count defaults to the draft's current count; 0 is a legitimate target). For a single-instance reroll see `rerollJobComplication()`. */
export function rerollJobComplications(draft, { rng, preferTags, count } = {}) {
  const complications = pickJobComplications({ rng, preferTags: preferTags ?? draft.contextTags, count: count ?? draft.complications.length });
  return updateJobDraft(draft, { complications });
}

/** Reroll ONE complication instance by `instanceId`, preserving its identity and every OTHER complication untouched. A no-op if no complication with that `instanceId` exists. */
export function rerollJobComplication(draft, instanceId, { rng, preferTags } = {}) {
  const index = draft.complications.findIndex((c) => c.instanceId === instanceId);
  if (index === -1) return draft;
  const [picked] = pickJobComplications({ rng, preferTags: preferTags ?? draft.contextTags, count: 1 });
  const rerolled = createJobComplicationInstance({ ...picked, instanceId });
  const complications = draft.complications.map((c, i) => (i === index ? rerolled : c));
  return updateJobDraft(draft, { complications });
}

/** Add one new complication instance. Every existing complication is preserved untouched. */
export function addJobComplication(draft, { rng, preferTags } = {}) {
  const [picked] = pickJobComplications({ rng, preferTags: preferTags ?? draft.contextTags, count: 1 });
  if (!picked) return draft;
  return updateJobDraft(draft, { complications: [...draft.complications, createJobComplicationInstance(picked)] });
}

/** Remove one complication instance by `instanceId`. A no-op if no complication with that id exists. A Job may legitimately end up with zero complications. */
export function removeJobComplication(draft, instanceId) {
  const complications = draft.complications.filter((c) => c.instanceId !== instanceId);
  if (complications.length === draft.complications.length) return draft;
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

function computeAndApplyReward(draft, { rng, partyCapability, partyLevels, applyVariance = true } = {}) {
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

/**
 * CORRECTION (round 2): every objective-touching operation below
 * (add/remove/reroll an objective, regenerate all objectives) used to
 * call `rerollJobReward()` directly, silently overwriting a GM's manual
 * reward override the moment ANY objective changed -- the identical
 * class of bug `JOB_DERIVED_TEXT_SOURCE` already fixed for title/
 * briefing. This is the internal "recompute the reward, UNLESS the GM
 * owns it" gate every one of those operations now goes through instead;
 * only the EXPLICIT `rerollJobReward()` call below is allowed to
 * override a manual reward (a GM asking to reroll the reward IS the
 * explicit ask, matching `resetJobTitleToDerived()`'s own precedent).
 */
function applyRewardRecompute(draft, opts) {
  if (draft.rewardSource === 'manual') return draft;
  return computeAndApplyReward(draft, opts);
}

/** Recompute ONLY the reward estimate/package from the draft's CURRENT objectives/issuer -- e.g. after editing objectives or the party roster, without rerolling anything narrative. An EXPLICIT ask: always recomputes and resets `rewardSource` back to `'generated'`, even if a GM had previously overridden it via `setJobReward()` -- see `applyRewardRecompute()`'s doc for how every OTHER (non-explicit) reward-affecting operation instead respects a manual override. */
export function rerollJobReward(draft, opts = {}) {
  return updateJobDraft(computeAndApplyReward(draft, opts), { rewardSource: 'generated' });
}

/** Explicit GM authorship action: merge `patch` onto the current `rewardPackage` (e.g. `{ credits: 50000 }`) and mark the reward `'manual'` -- every OTHER objective-touching operation becomes a no-op on it until `resetJobRewardToDerived()`/`rerollJobReward()` is called. */
export function setJobReward(draft, patch = {}) {
  if (!draft) return draft;
  return updateJobDraft(draft, { rewardPackage: { ...draft.rewardPackage, ...patch }, rewardSource: 'manual' });
}

/** The "↻ Recompose" action for the reward: hand it back to the generated regime and immediately recompute from the draft's current objectives/issuer, discarding the manual override. */
export function resetJobRewardToDerived(draft, opts = {}) {
  if (!draft) return draft;
  return rerollJobReward(updateJobDraft(draft, { rewardSource: 'generated' }), opts);
}

/** Resolve `locationContext` against the draft's OWN current Location identity (explicit wins, a mismatched context is dropped) -- the same discipline `createProceduralJobDraft()` applies at creation time, reused by every reroll below that accepts a fresh `locationContext`. */
function resolveRerollLocationContext(draft, locationContext) {
  return resolveJobLocationContext({ locationId: draft.locationId, locationDraftId: draft.locationDraftId, locationContext }).context;
}

/** Regenerate EVERY objective against the draft's current mission type/context -- the "reroll all objectives" bundle operation, mirroring `faction-bundle.js`'s `regenerateFactionContacts()`. Automatically recomputes the reward and recomposes `briefing` (respecting a manual lock) from the fresh objective set. */
export async function regenerateJobObjectives(draft, { rng, count, preferTags, locationContext, withNamedSubjects = false, economyContext, nameProvider, droidNameProvider, partyCapability, partyLevels, applyVariance = true } = {}) {
  const resolvedLocationContext = resolveRerollLocationContext(draft, locationContext);
  const resolvedCount = Number.isFinite(count) ? Math.max(1, count) : draft.objectives.length || 1;
  const tiersForCount = [OBJECTIVE_TIER.PRIMARY, OBJECTIVE_TIER.SECONDARY, OBJECTIVE_TIER.TERTIARY];
  const objectives = [];
  for (let i = 0; i < resolvedCount; i++) {
    // eslint-disable-next-line no-await-in-loop -- sequential by design, matching faction-bundle.js's own precedent.
    const objective = await buildJobObjective({
      tier: tiersForCount[i] ?? OBJECTIVE_TIER.TERTIARY, missionType: draft.missionType, preferTags: preferTags ?? draft.contextTags,
      locationContext: resolvedLocationContext, oppositionSeedTags: resolvedLocationContext?.suggestedOppositionTags ?? [],
      factionDraftId: draft.issuerFactionDraftId, issuerFactionName: draft.issuerName, organizationTags: draft.issuerOrganizationTags,
      withNamedSubjects, economyContext, rng, nameProvider, droidNameProvider
    });
    objectives.push(objective);
  }
  const withReward = updateJobDraft(draft, { objectives });
  const rewarded = applyRewardRecompute(withReward, { rng, partyCapability, partyLevels, applyVariance });
  return recomposeJobBriefing(rewarded);
}

/** Reroll ONE objective by `draftId`, preserving every OTHER objective untouched -- the core "never silently destroy sibling objectives" guarantee, matching `faction-bundle.js`'s `rerollFactionContact()`. Recomputes the reward and recomposes `briefing` (if the reroll touched the Primary objective) afterward. A no-op if no objective with that `draftId` exists. */
export async function rerollJobObjective(draft, objectiveDraftId, { rng, preferTags, locationContext, withNamedSubjects = false, economyContext, nameProvider, droidNameProvider, partyCapability, partyLevels, applyVariance = true } = {}) {
  const index = draft.objectives.findIndex((o) => o.draftId === objectiveDraftId);
  if (index === -1) return draft;
  const target = draft.objectives[index];
  const resolvedLocationContext = resolveRerollLocationContext(draft, locationContext);
  const replacement = await buildJobObjective({
    tier: target.tier, missionType: draft.missionType, preferTags: preferTags ?? draft.contextTags,
    locationContext: resolvedLocationContext, oppositionSeedTags: resolvedLocationContext?.suggestedOppositionTags ?? [],
    factionDraftId: draft.issuerFactionDraftId, issuerFactionName: draft.issuerName, organizationTags: draft.issuerOrganizationTags,
    withNamedSubjects, economyContext, rng, nameProvider, droidNameProvider
  });
  const rerolled = { ...replacement, draftId: objectiveDraftId };
  const objectives = draft.objectives.map((o, i) => (i === index ? rerolled : o));
  const withObjectives = updateJobDraft(draft, { objectives });
  const rewarded = applyRewardRecompute(withObjectives, { rng, partyCapability, partyLevels, applyVariance });
  return recomposeJobBriefing(rewarded);
}

/** Add one new objective (tertiary by default), generated against the draft's current mission type/context. Every existing objective is preserved untouched. Recomputes the reward afterward. */
export async function addJobObjective(draft, { rng, tier = OBJECTIVE_TIER.TERTIARY, preferTags, locationContext, withNamedSubjects = false, economyContext, nameProvider, droidNameProvider, partyCapability, partyLevels, applyVariance = true } = {}) {
  const resolvedLocationContext = resolveRerollLocationContext(draft, locationContext);
  const objective = await buildJobObjective({
    tier, missionType: draft.missionType, preferTags: preferTags ?? draft.contextTags,
    locationContext: resolvedLocationContext, oppositionSeedTags: resolvedLocationContext?.suggestedOppositionTags ?? [],
    factionDraftId: draft.issuerFactionDraftId, issuerFactionName: draft.issuerName, organizationTags: draft.issuerOrganizationTags,
    withNamedSubjects, economyContext, rng, nameProvider, droidNameProvider
  });
  const withObjectives = updateJobDraft(draft, { objectives: [...draft.objectives, objective] });
  return applyRewardRecompute(withObjectives, { rng, partyCapability, partyLevels, applyVariance });
}

/**
 * Remove one objective by `draftId`. A no-op if no objective with that
 * id exists, OR if it is the draft's only objective (a Job must have at
 * least one objective). If the REMOVED objective was the Primary, the
 * next remaining objective (in list order) is PROMOTED to Primary/
 * required=true -- a Job may never end up with zero Primary objectives
 * (round 1 correction: the original version allowed exactly that).
 * Every OTHER objective is preserved untouched. Recomputes the reward
 * and recomposes `briefing` afterward.
 */
export function removeJobObjective(draft, objectiveDraftId, { rng, partyCapability, partyLevels, applyVariance = true } = {}) {
  if (draft.objectives.length <= 1) return draft;
  const removedIndex = draft.objectives.findIndex((o) => o.draftId === objectiveDraftId);
  if (removedIndex === -1) return draft;
  const wasPrimary = draft.objectives[removedIndex].tier === OBJECTIVE_TIER.PRIMARY;
  let objectives = draft.objectives.filter((o) => o.draftId !== objectiveDraftId);
  if (wasPrimary && objectives.length) {
    objectives = objectives.map((o, i) => (i === 0 ? updateJobObjectiveDraft(o, { tier: OBJECTIVE_TIER.PRIMARY }) : o));
  }
  const withObjectives = updateJobDraft(draft, { objectives });
  const rewarded = applyRewardRecompute(withObjectives, { rng, partyCapability, partyLevels, applyVariance });
  return recomposeJobBriefing(rewarded);
}

/** Explicit GM authorship action: overwrite one objective's `title` with GM-written text and lock it against a whole-Job regenerate replacing it (round 2). A no-op if no objective with that `draftId` exists. Recomposes `briefing` if this was the Primary objective and briefing is not itself manually locked (title changes alone do not affect briefing text). */
export function setJobObjectiveTitle(draft, objectiveDraftId, text) {
  const index = draft.objectives.findIndex((o) => o.draftId === objectiveDraftId);
  if (index === -1) return draft;
  const objectives = draft.objectives.map((o, i) => (i === index ? updateJobObjectiveDraft(o, { title: String(text ?? '').trim(), titleSource: JOB_DERIVED_TEXT_SOURCE.MANUAL }) : o));
  return updateJobDraft(draft, { objectives });
}

/** Explicit GM authorship action: overwrite one objective's `description` with GM-written text and lock it against a whole-Job regenerate replacing it (round 2). A no-op if no objective with that `draftId` exists. Recomposes the Job's `briefing` (respecting ITS OWN manual lock) since a Primary objective's description feeds it directly. */
export function setJobObjectiveDescription(draft, objectiveDraftId, text) {
  const index = draft.objectives.findIndex((o) => o.draftId === objectiveDraftId);
  if (index === -1) return draft;
  const objectives = draft.objectives.map((o, i) => (i === index ? updateJobObjectiveDraft(o, { description: String(text ?? '').trim(), descriptionSource: JOB_DERIVED_TEXT_SOURCE.MANUAL }) : o));
  return recomposeJobBriefing(updateJobDraft(draft, { objectives }));
}

/** Reroll ONLY one objective's opposition request, leaving every other field of that objective (and every other objective) untouched -- the finest-grained opposition reroll this system offers. A no-op if no objective with that `draftId` exists. */
export function rerollJobObjectiveOpposition(draft, objectiveDraftId, { rng, locationContext, organizationTags } = {}) {
  const index = draft.objectives.findIndex((o) => o.draftId === objectiveDraftId);
  if (index === -1) return draft;
  const target = draft.objectives[index];
  const template = OBJECTIVE_TEMPLATE_FIXTURES.find((t) => t.id === target.templateId) ?? null;
  const resolvedLocationContext = resolveRerollLocationContext(draft, locationContext);
  const oppositionRequest = buildOppositionRequest({
    template, missionType: target.missionType, difficulty: target.difficulty, oppositionSeedTags: resolvedLocationContext?.suggestedOppositionTags ?? [],
    environmentTags: resolvedLocationContext?.locationTags ?? [], organizationTags: organizationTags ?? draft.issuerOrganizationTags, rng
  });
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
  const resolvedLocationContext = resolveRerollLocationContext(draft, locationContext);
  const { slotValues, subjectRole, subjectArchetype, subjectNpcConcept } = await resolveObjectiveSlots({
    template, missionType: target.missionType, preferTags: preferTags ?? draft.contextTags, locationContext: resolvedLocationContext,
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
  const withObjectives = updateJobDraft(draft, { objectives });
  return target.tier === OBJECTIVE_TIER.PRIMARY ? recomposeJobBriefing(withObjectives) : withObjectives;
}
