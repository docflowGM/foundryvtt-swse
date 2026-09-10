/**
 * PHASE 8D-3C — full generated-Job draft contract.
 *
 * Mirrors `faction-draft.js`'s own pattern exactly: a pure shape module
 * (`createJobDraft()`/`updateJobDraft()` for the Job itself,
 * `createJobObjectiveDraft()`/`updateJobObjectiveDraft()` for its
 * per-objective sub-drafts) with no picking/rolling logic of its own —
 * the actual composer lives in `job-bundle.js`, exactly like
 * `faction-bundle.js` sits alongside `faction-draft.js`.
 *
 * See §195 of the audit doc for the full authority-table reasoning
 * behind why this is a NEW draft layer rather than a reuse of the
 * canonical Job Board schema: the canonical objective carries a review
 * WORKFLOW (status/submittedBy/reviewedBy/...) that has no meaning
 * before a Job is posted, the canonical `factionConsequences` is a REAL
 * numeric ledger this module must never touch, and the existing
 * Faction/Location job-creation "prefill draft" shape
 * (`FactionJobBridgeService`/`LocationJobBridgeService`'s shared
 * `_normalizeDraft()`) is deliberately single-objective/single-reward —
 * too thin for this phase's richer requirements.
 *
 * HARD RULE: this module never creates, posts, or otherwise mutates a
 * canonical Job. Committing a finished draft is later, explicit GM
 * action through the future `JobEngine` canonical-mutation authority
 * (see docs/audits/gm-datapad-ecosystem-redesign.md §199 -- NOT YET
 * BUILT, deferred to 8D-4) -- not a direct call from this module, or
 * from any UI/controller/bridge, to `HolonetMessengerService
 * .createJobPosting()`/`_gmCreateJobPosting()` or `HolonetStorage`.
 * Those remain the eventual PERSISTENCE/transport mechanism `JobEngine`
 * itself will call, exactly like `ActorEngine` sits in front of the
 * Foundry Document API rather than every caller hitting it directly.
 * This module does not call them and does not duplicate their
 * persistence, id-generation, status-workflow, or Faction-standing-
 * ledger logic.
 *
 * `tier` on an objective draft reuses `objective-economy.js`'s
 * `OBJECTIVE_TIER` verbatim (confirmed identical to the canonical
 * objective's own `tier` field, per `GMJobBoardSurfaceService
 * .normalizeObjective()`) — a future (non-8D-3C) commit step can map a
 * finished objective draft's `tier`/`title`/`description`/reward split
 * straight onto a canonical objective's matching fields unchanged.
 * `difficulty` has NO canonical equivalent and stays generator-only
 * metadata, per the same audit section.
 *
 * Cross-domain references (`issuerFactionId`/`issuerFactionDraftId`,
 * `issuerContactId`/`issuerContactDraftId`, `locationId`/
 * `locationDraftId`) follow the IDENTICAL "real canonical id OR draft
 * id, never both meaning the same thing" duality already established
 * three times over (`location-draft.js`, `faction-draft.js`'s
 * territory refs, `npc-concept.js`'s `locationLinks[]`) — no new
 * resolution mechanism is introduced here.
 */

import { OBJECTIVE_TIER, OBJECTIVE_DIFFICULTY, isObjectiveTier, isObjectiveDifficulty } from '../objective-economy.js';
import { isJobLegality, isJobVisibility } from './job-legality-visibility.js';
import { isJobUrgency } from './job-urgency.js';
import { ISSUER_TYPE } from '../organization-metadata.js';
import { createProvenance, isProvenance } from '../provenance.js';
import { createDraftId } from '../lib/draft-id.js';
import { resolveDualityReference } from '../lib/reference-duality.js';

function cleanString(value) {
  return String(value ?? '').trim();
}

function cleanStringArray(value) {
  return Array.isArray(value) ? value.map(cleanString).filter(Boolean) : [];
}

/**
 * CORRECTION (round 2): reuses the shared `resolveDualityReference()`
 * primitive to enforce "canonical id wins, draft id cleared" at the
 * `createJobDraft()`/`updateJobDraft()` BOUNDARY itself, not only inside
 * `job-bundle.js`'s composer. Previously `createJobDraft({locationId:
 * 'Location.real', locationDraftId: 'draft:location:other'})` produced
 * an invalid state (both set) through the public draft API; now the
 * shape itself refuses to represent it.
 */
function normalizeIdDraftIdPair(id, draftId) {
  return resolveDualityReference({ explicitId: id, explicitDraftId: draftId }).ref;
}

function clampScale(scale) {
  const n = Number(scale);
  if (!Number.isFinite(n)) return null;
  return Math.min(20, Math.max(1, Math.round(n)));
}

const RELATIONSHIP_KEYS = Object.freeze(['hostile', 'poor', 'neutral', 'good', 'excellent']);

function isRelationshipKey(value) {
  return RELATIONSHIP_KEYS.includes(value);
}

const ISSUER_TYPE_VALUES = Object.freeze(Object.values(ISSUER_TYPE));

function isIssuerType(value) {
  return ISSUER_TYPE_VALUES.includes(value);
}

/** `derived` (default: recomposed automatically by the relevant reroll) or `manual` (a GM explicitly wrote this text; recompose becomes a no-op) -- mirrors `npc-concept.js`'s `PUBLIC_DESCRIPTION_SOURCE` pattern exactly, applied to `title`/`briefing`, the two composed-from-other-fields Job fields, and (round 2) each objective's own `title`/`description`. */
export const JOB_DERIVED_TEXT_SOURCE = Object.freeze({ DERIVED: 'derived', MANUAL: 'manual' });
const DERIVED_TEXT_SOURCE_VALUES = Object.freeze(Object.values(JOB_DERIVED_TEXT_SOURCE));
function isDerivedTextSource(value) {
  return DERIVED_TEXT_SOURCE_VALUES.includes(value);
}

/**
 * CORRECTION (round 2): `generated` (default: every reward-affecting
 * operation -- objective add/remove/reroll, `rerollJobReward()` itself,
 * whole regeneration's own fresh computation -- may recompute it) or
 * `manual` (a GM explicitly overrode the package via `setJobReward()`;
 * every OTHER operation that would otherwise recompute the reward
 * becomes a no-op on it, matching the same "manual wins until an
 * EXPLICIT reroll of that exact fact" rule `JOB_DERIVED_TEXT_SOURCE`
 * already established). `rerollJobReward()` itself is the one
 * exception -- an explicit ask to reroll the reward always wins and
 * resets the source back to `generated`, exactly like a GM explicitly
 * re-rolling a locked title/briefing would.
 */
export const JOB_REWARD_SOURCE = Object.freeze({ GENERATED: 'generated', MANUAL: 'manual' });
const REWARD_SOURCE_VALUES = Object.freeze(Object.values(JOB_REWARD_SOURCE));
function isRewardSource(value) {
  return REWARD_SOURCE_VALUES.includes(value);
}

/**
 * CORRECTION (round 2, item 6): narrative-only reward-suggestion types.
 * `rewardEstimate`/`rewardPackage` (above) remain the ONLY authority for
 * credits and priced material assets -- these types cover everything the
 * phase spec asked for beyond that (favor/standing/access/information/
 * transport/safePassage/clearance/debtForgiveness/salvageRights/service/
 * medical/repairs/training/introduction/equipment/commodity), plus
 * `none` for "no additional favor is offered" as an explicit, pickable
 * catalog entry rather than an implicit empty state.
 */
export const JOB_REWARD_SUGGESTION_TYPE = Object.freeze({
  FAVOR: 'favor', STANDING: 'standing', ACCESS: 'access', INFORMATION: 'information',
  TRANSPORT: 'transport', SAFE_PASSAGE: 'safePassage', CLEARANCE: 'clearance',
  DEBT_FORGIVENESS: 'debtForgiveness', SALVAGE_RIGHTS: 'salvageRights', SERVICE: 'service',
  MEDICAL: 'medical', REPAIRS: 'repairs', TRAINING: 'training', INTRODUCTION: 'introduction',
  EQUIPMENT: 'equipment', COMMODITY: 'commodity', NONE: 'none'
});
const REWARD_SUGGESTION_TYPE_VALUES = Object.freeze(Object.values(JOB_REWARD_SUGGESTION_TYPE));
function isRewardSuggestionType(value) {
  return REWARD_SUGGESTION_TYPE_VALUES.includes(value);
}

/**
 * `source`: `'generated'` (default; a broad reroll of the suggestion list
 * may replace it) or `'manual'` (a GM wrote/edited this suggestion; every
 * broad-reroll operation leaves it untouched, matching every other
 * generated/manual ownership flag in this module). `factionId`/
 * `factionDraftId` follow the SAME canonical-id-first duality as the
 * Job's own issuer refs -- set only for a `standing`-typed suggestion
 * tied to a real Faction issuer; never a mutation of that Faction, only
 * a stable reference a GM could later act on.
 */
export function createJobRewardSuggestionInstance(entry = {}) {
  // Reference-preserving fast path, mirroring createJobComplicationInstance().
  if (entry && typeof entry === 'object' && typeof entry.rewardId === 'string' && entry.rewardId
    && typeof entry.value === 'string' && isRewardSuggestionType(entry.type)) {
    return entry;
  }
  const factionRef = normalizeIdDraftIdPair(entry.factionId, entry.factionDraftId);
  return {
    rewardId: cleanString(entry.rewardId) || createDraftId('job-reward-suggestion'),
    type: isRewardSuggestionType(entry.type) ? entry.type : JOB_REWARD_SUGGESTION_TYPE.NONE,
    value: cleanString(entry.value),
    source: entry.source === JOB_REWARD_SOURCE.MANUAL ? JOB_REWARD_SOURCE.MANUAL : JOB_REWARD_SOURCE.GENERATED,
    commodityId: cleanString(entry.commodityId) || '',
    itemTags: cleanStringArray(entry.itemTags),
    factionId: factionRef.id,
    factionDraftId: factionRef.draftId
  };
}

function normalizeRewardSuggestions(list) {
  return (Array.isArray(list) ? list : []).map((entry) => createJobRewardSuggestionInstance(entry));
}

/**
 * Normalize one complication instance: `{ instanceId, value, tags }`.
 * `instanceId` is minted (`draft:job-complication:<hex>`) the first
 * time a picked catalog entry (`{value, weight, tags}` from
 * `jobs/job-complication.js`) is attached to a Job draft, then
 * preserved across every reroll that doesn't specifically touch THAT
 * instance -- the same stable-identity discipline every other
 * multi-entry list in this ecosystem (objectives, locationLinks, field-
 * authoring entries) already uses, extended here so a Job can finally
 * support "reroll only complication #2" instead of only the whole list.
 */
export function createJobComplicationInstance(entry = {}) {
  // Reference-preserving fast path: `createJobDraft()`/`updateJobDraft()`
  // re-normalize the WHOLE complications array on every call (unlike
  // objectives, which a caller maps by index and therefore controls
  // reference identity for directly) -- an already-fully-shaped instance
  // is returned UNCHANGED so an untouched complication survives an
  // unrelated draft update as the exact same object reference, matching
  // every other "untouched sibling" guarantee in this ecosystem.
  if (entry && typeof entry === 'object' && typeof entry.instanceId === 'string' && entry.instanceId && Array.isArray(entry.tags) && typeof entry.value === 'string') {
    return entry;
  }
  return {
    instanceId: cleanString(entry.instanceId) || createDraftId('job-complication'),
    value: cleanString(entry.value),
    tags: Array.isArray(entry.tags) ? [...entry.tags] : []
  };
}

function normalizeComplications(list) {
  return (Array.isArray(list) ? list : []).map((entry) => createJobComplicationInstance(entry));
}

/**
 * Normalize an asset-objective descriptor. `value`/`valueSource`
 * matches `reward-estimator.js`/`reward-package.js`'s own explicit
 * documented contract: a caller resolves a REAL price through the
 * future Store/pricing authority and passes it in; absent that, `value`
 * stays `null` (`valueSource: 'unresolved'`) rather than a fabricated
 * number, so `estimateReward()`'s asset component is 0 until a real
 * price exists -- never a second, invented economy.
 */
function normalizeAssetObjective(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const hasValue = Number.isFinite(Number(raw.value)) && raw.valueSource === 'resolved';
  return {
    objectiveType: cleanString(raw.objectiveType),
    name: cleanString(raw.name),
    referenceId: cleanString(raw.referenceId),
    value: hasValue ? Math.max(0, Number(raw.value)) : null,
    valueSource: hasValue ? 'resolved' : 'unresolved'
  };
}

/**
 * Build one objective sub-draft. `tier`/`difficulty` are the two
 * separate, never-merged concepts documented above (§7 of the phase
 * spec, restated at `objective-economy.js`'s own header). `subject`
 * holds the WHO/WHAT of the objective: `subjectRole`/`subjectArchetype`
 * (from `mission-subject.js`'s lightweight archetype picker — always
 * present when a subject exists) plus an OPTIONAL full
 * `subjectNpcConcept` (an `npc/npc-bundle.js` draft, per §195.3's
 * routing decision — never `npc-narrative-generator.js`) for a subject
 * important enough to need a name and full concept.
 * `assetObjective` is `null` unless this objective is one of
 * `reward-estimator.js`'s `ASSET_OBJECTIVE_TYPE`s (steal-and-deliver /
 * hijack-for-buyer / recover-for-owner / keep-the-target /
 * sabotage-or-destroy); it carries `{ objectiveType, value, name,
 * referenceId }`, where `referenceId` is a `data/galactic-commodities.js`
 * `commodityId` when the valued asset is a commodity shipment, reused
 * verbatim, never a duplicated id.
 */
export function createJobObjectiveDraft({
  draftId = '',
  templateId = '',
  missionType = '',
  tier = OBJECTIVE_TIER.SECONDARY,
  difficulty = OBJECTIVE_DIFFICULTY.STANDARD,
  required,
  title = '',
  // CORRECTION (round 2): mirrors the Job-level title/briefing
  // derived/manual ownership exactly (see JOB_DERIVED_TEXT_SOURCE
  // above) -- a GM-rewritten objective title/description must survive
  // a whole-Job regenerate, not just a Job-level field. A fresh/rerolled
  // objective (built by job-bundle.js's buildJobObjective()) always
  // defaults both to 'derived'; only an explicit
  // setJobObjectiveTitle()/setJobObjectiveDescription() call sets
  // 'manual'.
  titleSource = JOB_DERIVED_TEXT_SOURCE.DERIVED,
  description = '',
  descriptionSource = JOB_DERIVED_TEXT_SOURCE.DERIVED,
  slotValues = {},
  constraints = [],
  subjectRole = '',
  subjectArchetype = null,
  subjectNpcConcept = null,
  oppositionRequest = null,
  assetObjective = null,
  rewardCredits = 0,
  rewardXp = 0,
  notes = ''
} = {}) {
  const resolvedTier = isObjectiveTier(tier) ? tier : OBJECTIVE_TIER.SECONDARY;
  return {
    draftId: cleanString(draftId) || createDraftId('job-objective'),
    templateId: cleanString(templateId),
    missionType: cleanString(missionType),
    tier: resolvedTier,
    difficulty: isObjectiveDifficulty(difficulty) ? difficulty : OBJECTIVE_DIFFICULTY.STANDARD,
    // CORRECTION (round 1): a Primary objective is ALWAYS required --
    // matches the canonical objective's own hard rule
    // (GMJobBoardSurfaceService.normalizeObjective(): `lowerType ===
    // 'primary' ? true : Boolean(raw?.required)`, no override permitted
    // either direction). Previously an explicit `required:false` could
    // override this for a Primary objective, which the canonical schema
    // itself never allows.
    required: resolvedTier === OBJECTIVE_TIER.PRIMARY ? true : (required === undefined ? false : Boolean(required)),
    title: cleanString(title),
    titleSource: isDerivedTextSource(titleSource) ? titleSource : JOB_DERIVED_TEXT_SOURCE.DERIVED,
    description: cleanString(description),
    descriptionSource: isDerivedTextSource(descriptionSource) ? descriptionSource : JOB_DERIVED_TEXT_SOURCE.DERIVED,
    slotValues: slotValues && typeof slotValues === 'object' ? { ...slotValues } : {},
    constraints: Array.isArray(constraints) ? [...constraints] : [],
    subjectRole: cleanString(subjectRole),
    subjectArchetype: subjectArchetype && typeof subjectArchetype === 'object' ? subjectArchetype : null,
    subjectNpcConcept: subjectNpcConcept && typeof subjectNpcConcept === 'object' ? subjectNpcConcept : null,
    oppositionRequest: oppositionRequest && typeof oppositionRequest === 'object' ? oppositionRequest : null,
    assetObjective: normalizeAssetObjective(assetObjective),
    rewardCredits: Math.max(0, Math.floor(Number(rewardCredits) || 0)),
    rewardXp: Math.max(0, Math.floor(Number(rewardXp) || 0)),
    notes: cleanString(notes)
  };
}

/** Return a NEW objective draft with `patch` shallow-merged in, preserving its `draftId`. */
export function updateJobObjectiveDraft(objective, patch = {}) {
  if (!objective || typeof objective !== 'object') return objective;
  return createJobObjectiveDraft({ ...objective, ...patch });
}

/**
 * Build a full generated-Job draft. Every field defaults to an empty/
 * neutral value — `job-bundle.js`'s composer fills in as much as it
 * can; a GM edits the rest before a future (non-8D-3C) commit step maps
 * this onto `HolonetMessengerService.createJobPosting()`'s parameters.
 *
 * `successDelta`/`failureDelta` reuse `Faction.jobDefaults`' exact
 * field names for shape consistency (per the audit table), but are a
 * pure narrative SUGGESTION here — this module never applies them to a
 * real Faction's standing; only an explicit, separate GM commit action
 * could ever do that, and no such action exists in this phase.
 */
export function createJobDraft({
  draftId = '',
  title = '',
  titleSource = JOB_DERIVED_TEXT_SOURCE.DERIVED,
  missionType = '',
  legality = '',
  visibility = '',
  urgency = '',
  hook = '',
  stakes = '',
  briefing = '',
  briefingSource = JOB_DERIVED_TEXT_SOURCE.DERIVED,
  instructions = '',
  notes = '',
  gmNotes = '',
  secret = '',
  issuerType = ISSUER_TYPE.ORDINARY_INDIVIDUAL,
  issuerName = '',
  issuerFactionId = '',
  issuerFactionDraftId = '',
  issuerContactId = '',
  issuerContactDraftId = '',
  // CORRECTION (round 1): the canonical Job's own issuer already
  // supports a promoted/real Actor reference
  // (`contactActorId`/`contactActorUuid`/`contactActorName`, confirmed
  // in HolonetMessengerService.createJobPosting()'s draft prefill
  // shape) -- the procedural draft previously had no equivalent, so an
  // issuer Contact who is ALREADY a real Actor could never be
  // represented at its strongest identity.
  issuerContactActorId = '',
  issuerContactActorUuid = '',
  issuerContactActorName = '',
  issuerScale,
  issuerRelationship = 'neutral',
  // CORRECTION (round 2): the issuer Faction's OWN soft context tags
  // (archetype/organizationFamily for a Faction draft, `type` for a
  // canonical Faction record -- see `job-context.js`'s
  // `resolveJobIssuerFactionContext()`), persisted separately from the
  // general `contextTags` pool so every opposition-request build site
  // (including a later targeted reroll, which has no live Faction
  // object to re-derive tags from) can read them as
  // `oppositionRequest.organizationTags` without re-fetching the
  // Faction. Previously this Faction identity reached generic
  // `preferTags` but never actually reached `organizationTags` itself.
  issuerOrganizationTags = [],
  locationId = '',
  locationDraftId = '',
  locationName = '',
  objectives = [],
  complications = [],
  twist = null,
  successConsequence = null,
  failureConsequence = null,
  successDelta = 1,
  failureDelta = -1,
  rewardEstimate = null,
  rewardPackage = null,
  rewardSource = JOB_REWARD_SOURCE.GENERATED,
  rewardSuggestions = [],
  // The merged soft-weighting tags (missionType + jobContext-derived
  // tags) `job-bundle.js`'s composer resolved this draft against --
  // persisted so targeted reroll wrappers have a natural default tag
  // source, exactly like `faction-draft.js`'s doctrine.environmentAffinities
  // serves the same role for Faction rerolls.
  contextTags = [],
  narrativeFields,
  provenance
} = {}) {
  const factionRef = normalizeIdDraftIdPair(issuerFactionId, issuerFactionDraftId);
  const contactRef = normalizeIdDraftIdPair(issuerContactId, issuerContactDraftId);
  const locationRef = normalizeIdDraftIdPair(locationId, locationDraftId);
  return {
    // PHASE 8D-3C: a domain-namespaced DRAFT id (`lib/draft-id.js`),
    // matching every other draft type in this ecosystem. Never a
    // canonical Job identity -- a posted Job has no id of its own at
    // all (it's addressed by its Holonet thread), so this draftId is
    // meaningful only within this generation/editing session, exactly
    // like every other draft's id.
    draftId: cleanString(draftId) || createDraftId('job'),
    title: cleanString(title),
    // See createJobComplicationInstance()'s doc above -- 'derived'
    // (default) means the next relevant reroll may recompose this text;
    // 'manual' means a GM wrote it and every recompose call becomes a
    // no-op until explicitly reset, mirroring npc-concept.js's
    // publicDescriptionSource pattern exactly.
    titleSource: isDerivedTextSource(titleSource) ? titleSource : JOB_DERIVED_TEXT_SOURCE.DERIVED,
    missionType: cleanString(missionType),
    legality: isJobLegality(legality) ? legality : '',
    visibility: isJobVisibility(visibility) ? visibility : '',
    urgency: isJobUrgency(urgency) ? urgency : '',
    hook: cleanString(hook),
    stakes: cleanString(stakes),
    briefing: cleanString(briefing),
    briefingSource: isDerivedTextSource(briefingSource) ? briefingSource : JOB_DERIVED_TEXT_SOURCE.DERIVED,
    instructions: cleanString(instructions),
    notes: cleanString(notes),
    gmNotes: cleanString(gmNotes),
    secret: cleanString(secret),
    // Issuer identity: canonical-id-first, draft-id-fallback, exactly
    // like every other cross-domain reference in this ecosystem. Never
    // both a real id and a draft id pointing at "the same" Faction/
    // Contact simultaneously -- job-bundle.js's context-wiring enforces
    // that, this shape only stores what it's given.
    issuerType: isIssuerType(issuerType) ? issuerType : ISSUER_TYPE.ORDINARY_INDIVIDUAL,
    issuerName: cleanString(issuerName),
    issuerFactionId: factionRef.id,
    issuerFactionDraftId: factionRef.draftId,
    issuerContactId: contactRef.id,
    issuerContactDraftId: contactRef.draftId,
    issuerContactActorId: cleanString(issuerContactActorId),
    issuerContactActorUuid: cleanString(issuerContactActorUuid),
    issuerContactActorName: cleanString(issuerContactActorName),
    issuerScale: issuerType === ISSUER_TYPE.FACTION ? clampScale(issuerScale) : null,
    issuerRelationship: isRelationshipKey(issuerRelationship) ? issuerRelationship : 'neutral',
    issuerOrganizationTags: cleanStringArray(issuerOrganizationTags),
    locationId: locationRef.id,
    locationDraftId: locationRef.draftId,
    locationName: cleanString(locationName),
    // Multiple, independently rerollable objectives with stable
    // per-objective draftIds -- see createJobObjectiveDraft() above.
    objectives: Array.isArray(objectives) ? [...objectives] : [],
    // Each complication is now a stable-identity instance -- see
    // createJobComplicationInstance()'s doc above.
    complications: normalizeComplications(complications),
    twist: twist && typeof twist === 'object' ? twist : null,
    successConsequence: successConsequence && typeof successConsequence === 'object' ? successConsequence : null,
    failureConsequence: failureConsequence && typeof failureConsequence === 'object' ? failureConsequence : null,
    // Narrative-only Faction-standing SUGGESTION, reusing jobDefaults'
    // exact field names -- never applied to a real Faction (see header).
    successDelta: Number.isFinite(Number(successDelta)) ? Number(successDelta) : 1,
    failureDelta: Number.isFinite(Number(failureDelta)) ? Number(failureDelta) : -1,
    // reward-estimator.js / reward-package.js outputs, stored verbatim
    // -- this module performs no reward math of its own.
    rewardEstimate: rewardEstimate && typeof rewardEstimate === 'object' ? rewardEstimate : null,
    rewardPackage: rewardPackage && typeof rewardPackage === 'object' ? rewardPackage : null,
    rewardSource: isRewardSource(rewardSource) ? rewardSource : JOB_REWARD_SOURCE.GENERATED,
    // Narrative-only reward suggestions (favor/standing/access/etc.) --
    // see createJobRewardSuggestionInstance() above. Never credits, never
    // applied to a real Faction/Item on its own.
    rewardSuggestions: normalizeRewardSuggestions(rewardSuggestions),
    contextTags: cleanStringArray(contextTags),
    narrativeFields: narrativeFields && typeof narrativeFields === 'object' ? narrativeFields : undefined,
    // Draft-only status vocabulary, deliberately distinct from the
    // canonical Job's own posted-thread lifecycle (see header).
    source: 'generator-draft',
    status: 'draft',
    provenance: isProvenance(provenance) ? provenance : createProvenance({ presetId: missionType })
  };
}

/** Return a NEW draft with `patch` shallow-merged in (per-field reroll readiness, matching `updateFactionDraft()`'s own convention). */
export function updateJobDraft(draft, patch = {}) {
  if (!draft || typeof draft !== 'object') return draft;
  return createJobDraft({ ...draft, ...patch });
}

export { cleanStringArray };
