/**
 * PHASE 8D-3C correction round 1 — Job generation context normalization.
 *
 * `job-bundle.js`'s original `jobContext` handling read ad-hoc fields
 * (`factionContext?.factionId`) that matched neither a real canonical
 * Faction record (`id`) nor a Faction draft (`draftId`), never enforced
 * the explicit/context duality invariant `npc/npc-bundle.js` already
 * hardened for Location, and never consumed the REAL fields
 * `suggestedJobArchetypeTags`/`suggestedOppositionTags`/`currentEvents`
 * Phase 8D-3A's Location layer and Phase 8D-3B's NPC layer already
 * produce (it read a nonexistent `currentEventHints` instead). This
 * module is the fix: one small, pure adapter layer between whatever real
 * Faction/NPC/Location object a caller has and the Job composer's own
 * needs — reusing `resolveDualityReference()` (`lib/reference-duality.js`)
 * for identity, never re-deriving it.
 *
 * `factionContext` accepts EITHER a real canonical Faction record
 * (`{id, type, jobDefaults, ...}`, `FactionRegistryService`'s own shape)
 * OR a `faction-draft.js` draft (`{draftId, archetype, organizationFamily,
 * jobDefaults, ...}`) — both carry `jobDefaults` under the identical
 * field name, so no branching is needed there. `contactContext` accepts
 * EITHER a canonical Faction Contact record (`{id, actorId, actorUuid,
 * actorName, ...}`) OR an `npc-concept.js` draft (`{draftId, actorId,
 * actorUuid, suggestedJobArchetypeTags, suggestedOppositionTags, ...}`).
 */

import { resolveDualityReference } from '../lib/reference-duality.js';
import { normalizeTags, mergeTags } from '../lib/tag-utils.js';

function cleanString(value) {
  return String(value ?? '').trim();
}

/**
 * Resolve the Location identity duality + whether `locationContext`
 * should be consumed at all, mirroring
 * `resolveNpcLocationGenerationContext()` exactly (same shared
 * primitive, same semantics, Job-side field names).
 */
export function resolveJobLocationContext({ locationId = '', locationDraftId = '', locationContext = null } = {}) {
  const { ref, conflict } = resolveDualityReference({
    explicitId: locationId, explicitDraftId: locationDraftId,
    contextId: locationContext?.locationId, contextDraftId: locationContext?.locationDraftId
  });
  return {
    locationRef: { locationId: ref.id, locationDraftId: ref.draftId },
    context: conflict ? null : locationContext,
    contextMismatch: conflict
  };
}

/**
 * Resolve the issuer Faction identity duality against `factionContext`
 * (a real Faction record OR a Faction draft, see header). Also carries
 * through `jobDefaults`/`scale`/`relationship`/a soft tag set derived
 * from whichever shape was supplied — `null` (context dropped) on a
 * genuine identity conflict, exactly like Location.
 */
export function resolveJobIssuerFactionContext({ issuerFactionId = '', issuerFactionDraftId = '', factionContext = null } = {}) {
  const { ref, conflict } = resolveDualityReference({
    explicitId: issuerFactionId, explicitDraftId: issuerFactionDraftId,
    contextId: factionContext?.id, contextDraftId: factionContext?.draftId
  });
  const effectiveContext = conflict ? null : factionContext;
  const tags = effectiveContext
    ? normalizeTags([effectiveContext.archetype, effectiveContext.organizationFamily, effectiveContext.type].filter(Boolean))
    : [];
  return {
    factionRef: { factionId: ref.id, factionDraftId: ref.draftId },
    context: effectiveContext,
    contextMismatch: conflict,
    name: cleanString(effectiveContext?.name),
    scale: effectiveContext?.scale,
    jobDefaults: effectiveContext?.jobDefaults ?? null,
    contextTags: tags
  };
}

/**
 * Resolve the issuer Contact identity duality against `contactContext`
 * (a canonical Faction Contact OR an npc-concept.js draft, see header).
 * Surfaces Actor identity (`actorId`/`actorUuid`/`actorName`) when the
 * contact is already a promoted/real Actor — the canonical Job schema's
 * own `contactActorId`/`contactActorUuid`/`contactActorName` fields
 * this draft previously had no equivalent for at all.
 */
export function resolveJobIssuerContactContext({ issuerContactId = '', issuerContactDraftId = '', contactContext = null } = {}) {
  const { ref, conflict } = resolveDualityReference({
    explicitId: issuerContactId, explicitDraftId: issuerContactDraftId,
    contextId: contactContext?.id, contextDraftId: contactContext?.draftId
  });
  const effectiveContext = conflict ? null : contactContext;
  return {
    contactRef: { contactId: ref.id, contactDraftId: ref.draftId },
    context: effectiveContext,
    contextMismatch: conflict,
    name: cleanString(effectiveContext?.name),
    role: cleanString(effectiveContext?.role),
    actorId: cleanString(effectiveContext?.actorId),
    actorUuid: cleanString(effectiveContext?.actorUuid),
    actorName: cleanString(effectiveContext?.actorName),
    suggestedJobArchetypeTags: normalizeTags(effectiveContext?.suggestedJobArchetypeTags ?? []),
    suggestedOppositionTags: normalizeTags(effectiveContext?.suggestedOppositionTags ?? [])
  };
}

/**
 * The one real narrative current-event seed, if any -- reads the REAL
 * `location-event.js` shape (`{description, severity}`), never the
 * nonexistent `currentEventHints` the original composer looked for.
 * Read-only: never mutates `locationContext.currentEvents`.
 */
export function resolveJobCurrentEventText(locationContext) {
  const events = Array.isArray(locationContext?.currentEvents) ? locationContext.currentEvents : [];
  const first = events[0];
  return first?.description ? String(first.description) : '';
}

/**
 * Merge every soft-weighting tag source into ONE preferTags array, plus
 * the Location's OWN `suggestedJobArchetypeTags` kept SEPARATE (these
 * are real mission-type ids, the exact vocabulary `rollJobMissionType()`
 * biases against — folding them into the generic tag soup the way the
 * original composer did made them indistinguishable from an ordinary
 * economy/technology tag and meant they never actually reached the
 * mission-type roll). `locationContext`/`factionContext` here are
 * already the POST-conflict-resolution values (`null` when suppressed
 * by a mismatch) — callers pass what `resolveJobLocationContext()`/
 * `resolveJobIssuerFactionContext()` returned, never the raw input.
 */
export function deriveJobContextTags({ preferTags = [], campaignTags = [], locationContext = null, factionContextTags = [], contactSuggestedJobArchetypeTags = [], contactSuggestedOppositionTags = [] } = {}) {
  const generalTags = mergeTags(
    preferTags, campaignTags,
    locationContext?.locationTags ?? [], locationContext?.economyTags ?? [], locationContext?.technologySpecialties ?? [],
    factionContextTags
  );
  const missionTypeTags = mergeTags(locationContext?.suggestedJobArchetypeTags ?? [], contactSuggestedJobArchetypeTags);
  const oppositionSeedTags = mergeTags(locationContext?.suggestedOppositionTags ?? [], contactSuggestedOppositionTags);
  return { generalTags, missionTypeTags, oppositionSeedTags };
}
