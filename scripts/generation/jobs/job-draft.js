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
 * canonical Job. Posting a draft is later, explicit GM action through
 * the EXISTING `HolonetMessengerService.createJobPosting()` /
 * `_gmCreateJobPosting()` — this module does not call it and does not
 * duplicate its persistence, id-generation, status-workflow, or
 * Faction-standing-ledger logic.
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

function cleanString(value) {
  return String(value ?? '').trim();
}

function cleanStringArray(value) {
  return Array.isArray(value) ? value.map(cleanString).filter(Boolean) : [];
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
  description = '',
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
    // Matches the canonical objective's own default (GMJobBoardSurfaceService.normalizeObjective()): primary is always required, everything else defaults to optional unless explicitly overridden.
    required: required === undefined ? resolvedTier === OBJECTIVE_TIER.PRIMARY : Boolean(required),
    title: cleanString(title),
    description: cleanString(description),
    slotValues: slotValues && typeof slotValues === 'object' ? { ...slotValues } : {},
    constraints: Array.isArray(constraints) ? [...constraints] : [],
    subjectRole: cleanString(subjectRole),
    subjectArchetype: subjectArchetype && typeof subjectArchetype === 'object' ? subjectArchetype : null,
    subjectNpcConcept: subjectNpcConcept && typeof subjectNpcConcept === 'object' ? subjectNpcConcept : null,
    oppositionRequest: oppositionRequest && typeof oppositionRequest === 'object' ? oppositionRequest : null,
    assetObjective: assetObjective && typeof assetObjective === 'object' ? assetObjective : null,
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
  missionType = '',
  legality = '',
  visibility = '',
  urgency = '',
  hook = '',
  stakes = '',
  briefing = '',
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
  issuerScale,
  issuerRelationship = 'neutral',
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
  // The merged soft-weighting tags (missionType + jobContext-derived
  // tags) `job-bundle.js`'s composer resolved this draft against --
  // persisted so targeted reroll wrappers have a natural default tag
  // source, exactly like `faction-draft.js`'s doctrine.environmentAffinities
  // serves the same role for Faction rerolls.
  contextTags = [],
  narrativeFields,
  provenance
} = {}) {
  return {
    // PHASE 8D-3C: a domain-namespaced DRAFT id (`lib/draft-id.js`),
    // matching every other draft type in this ecosystem. Never a
    // canonical Job identity -- a posted Job has no id of its own at
    // all (it's addressed by its Holonet thread), so this draftId is
    // meaningful only within this generation/editing session, exactly
    // like every other draft's id.
    draftId: cleanString(draftId) || createDraftId('job'),
    title: cleanString(title),
    missionType: cleanString(missionType),
    legality: isJobLegality(legality) ? legality : '',
    visibility: isJobVisibility(visibility) ? visibility : '',
    urgency: isJobUrgency(urgency) ? urgency : '',
    hook: cleanString(hook),
    stakes: cleanString(stakes),
    briefing: cleanString(briefing),
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
    issuerFactionId: cleanString(issuerFactionId),
    issuerFactionDraftId: cleanString(issuerFactionDraftId),
    issuerContactId: cleanString(issuerContactId),
    issuerContactDraftId: cleanString(issuerContactDraftId),
    issuerScale: issuerType === ISSUER_TYPE.FACTION ? clampScale(issuerScale) : null,
    issuerRelationship: isRelationshipKey(issuerRelationship) ? issuerRelationship : 'neutral',
    locationId: cleanString(locationId),
    locationDraftId: cleanString(locationDraftId),
    locationName: cleanString(locationName),
    // Multiple, independently rerollable objectives with stable
    // per-objective draftIds -- see createJobObjectiveDraft() above.
    objectives: Array.isArray(objectives) ? [...objectives] : [],
    complications: Array.isArray(complications) ? [...complications] : [],
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
