/**
 * PHASE 8D-3B correction pass round 3 -- thin draft-CRUD wrapper over
 * `npc-location-link.js`'s pure primitives, specialized for
 * `npc-concept.js` drafts. Mirrors the exact generic-primitive/
 * domain-wrapper split `lib/draft-field-authoring.js`/
 * `npc/npc-field-authoring.js` already established (see that pair's
 * own header docs) -- this is the ONLY file in the Location-link seam
 * that imports `updateNpcConceptDraft()`, keeping `npc-location-link.js`
 * itself free of any `npc-concept.js` dependency (no circular import).
 *
 * Every operation targets a link by its stable `linkId`, never index
 * or display label, and returns a NEW draft (immutable-safe, matching
 * this whole ecosystem's convention) with every OTHER link preserved.
 */

import { updateNpcConceptDraft } from '../npc-concept.js';
import {
  createContactLocationLink, normalizeContactLocationLinks, getPrimaryContactLocationLink,
  isMeaningfulContactLocationLink, resolveLocationDraftReferenceInLinks,
  isContactLocationLinkStatus, isContactLocationLinkScope, isContactLocationLinkCertainty,
  isContactLocationLinkRevealState, isContactLocationLinkSource,
  rollContactLocationRelationshipFlavor, CONTACT_LOCATION_LINK_STATUS, CONTACT_LOCATION_LINK_SOURCE
} from './npc-location-link.js';
import { isContactLocationRelationshipType } from '../data/npc-location-relationship-types.js';

function withLinks(draft, locationLinks) {
  return updateNpcConceptDraft(draft, { locationLinks });
}

/**
 * Strict enum validation for an explicit GM authoring PATCH
 * (independent review round 5, item 2) -- `createContactLocationLink()`
 * itself stays tolerant (coerces an invalid value to a sane default,
 * correct for bulk normalization/migration), but an explicit edit
 * should bounce on a typo like `status: 'historic'`, never silently
 * rewrite it to `'active'` while the rest of the patch applies. Returns
 * `false` the moment any EXPLICITLY-present enum key fails its own
 * validator; a key the caller never mentioned is never checked.
 */
const ENUM_FIELD_VALIDATORS = Object.freeze({
  relationshipType: isContactLocationRelationshipType,
  status: isContactLocationLinkStatus,
  scope: isContactLocationLinkScope,
  certainty: isContactLocationLinkCertainty,
  revealState: isContactLocationLinkRevealState,
  source: isContactLocationLinkSource
});

function hasOnlyValidExplicitEnums(input) {
  for (const [field, validate] of Object.entries(ENUM_FIELD_VALIDATORS)) {
    if (Object.prototype.hasOwnProperty.call(input, field) && !validate(input[field])) return false;
  }
  return true;
}

/**
 * CORRECTION (independent review round 6, item 2 -- "strict authoring
 * validation forgot that primary is a boolean input"): `addContactLocationLink()`'s
 * own `Boolean(input.primary)` coercion (a truthy NON-boolean like
 * `"false"` or `1` would silently become `true`) was exactly the kind
 * of tolerant coercion round 5's own enum-validation fix explicitly
 * rejected for the strict GM authoring layer. An explicitly-supplied
 * `primary` must be a real boolean or the whole call is rejected --
 * `primary` absent entirely is fine (defaults to not-requested).
 */
function hasValidExplicitPrimary(input) {
  return !Object.prototype.hasOwnProperty.call(input, 'primary') || typeof input.primary === 'boolean';
}

/**
 * Append one new Location relationship. Every OTHER existing link is
 * preserved untouched. A no-op (returns the draft unchanged) if
 * `input` isn't meaningful (no resolvable target/eligible snapshot, or
 * a `custom` type with no label -- see `npc-location-link.js`'s
 * `isMeaningfulContactLocationLink()`), or if any EXPLICITLY-supplied
 * enum-valued field is invalid (see `hasOnlyValidExplicitEnums()`
 * above).
 *
 * Defaults `source` to `'manual'` unless the caller explicitly
 * overrides it -- this is the GM-facing authoring action (the
 * generator constructs its own links directly via
 * `createContactLocationLink()` in `npc/npc-bundle.js`, never through
 * this action layer), so a relationship added here is GM authorship by
 * definition, exactly like `npc/npc-field-authoring.js`'s "editing a
 * generated value converts it to manual" rule elsewhere in this
 * ecosystem.
 *
 * CORRECTION (independent review round 5, item 4 -- "single primary
 * mutation authority"): `input.primary` is NEVER passed through to the
 * normalizer directly (which would leave the outcome dependent on
 * array-position tie-breaking against any existing active primary,
 * surprising the caller who explicitly asked for `primary: true`).
 * The new link is always added `primary: false` first; if the caller
 * asked for `primary: true`, it is THEN deterministically promoted via
 * `setContactLocationLinkPrimary()` -- the one authoritative operation
 * for changing primary state -- so "add B as primary" always means
 * exactly that, never "maybe primary depending on what else exists."
 * An explicitly-supplied `primary` that isn't a real boolean (e.g.
 * `"false"`, `1`) is REJECTED (see `hasValidExplicitPrimary()` above)
 * rather than tolerantly coerced -- the same strictness principle as
 * `hasOnlyValidExplicitEnums()`.
 */
export function addContactLocationLink(draft, input = {}) {
  if (!hasOnlyValidExplicitEnums(input)) return draft;
  if (!hasValidExplicitPrimary(input)) return draft;
  const existing = Array.isArray(draft?.locationLinks) ? draft.locationLinks : [];
  const requestPrimary = input.primary === true;
  const candidate = createContactLocationLink({ source: CONTACT_LOCATION_LINK_SOURCE.MANUAL, ...input, primary: false });
  const next = normalizeContactLocationLinks([...existing, candidate]);
  if (next.length === existing.length) return draft;
  const added = withLinks(draft, next);
  if (!requestPrimary) return added;
  return setContactLocationLinkPrimary(added, candidate.linkId);
}

/** Remove one Location relationship by `linkId` (a real, permanent removal -- unlike the GM Field Authoring API's hide/restore semantics, a relationship the GM deletes is just gone, matching `removeFactionContact()`'s own list-membership-removal convention elsewhere in this ecosystem). A no-op if no link with that id exists. Every OTHER link is preserved untouched. */
export function removeContactLocationLink(draft, linkId) {
  const existing = Array.isArray(draft?.locationLinks) ? draft.locationLinks : [];
  const next = existing.filter((l) => l.linkId !== linkId);
  if (next.length === existing.length) return draft;
  return withLinks(draft, next);
}

/**
 * Patch one Location relationship's fields (label/notes/status/scope/
 * certainty/revealState/...) by `linkId`, preserving its `linkId` and
 * every OTHER link untouched. A no-op (REJECTS the whole patch, never
 * silently dropping the relationship out of the array) if:
 *  - no link with that `linkId` exists,
 *  - the patched result would no longer be meaningful (e.g. changing
 *    `relationshipType` to `custom` without also supplying a
 *    `relationshipLabel`),
 *  - any EXPLICITLY-supplied enum-valued field is invalid (a typo like
 *    `status: 'historic'` bounces rather than silently coercing to
 *    `'active'` -- see `hasOnlyValidExplicitEnums()` above), or
 *  - the patch explicitly supplies `primary` at all (see item 4 below)
 *    -- a GM's bad edit should bounce, not delete data or silently
 *    reinterpret intent.
 *
 * Three coherence rules, all scoped to THIS call only:
 *  - Defaults `source` to `'manual'` unless the patch explicitly
 *    overrides it (same GM-authorship default as `addContactLocationLink()`).
 *  - If `relationshipType` is explicitly changed and the patch does
 *    NOT also explicitly supply `relationshipLabel`, the label resets
 *    to the new type's own default label -- otherwise a type change
 *    (e.g. resident -> work) could silently leave the OLD type's label
 *    ("native") attached to the new type, an accidental semantic drift
 *    the GM never asked for. Supplying BOTH in the same patch always
 *    preserves the caller's exact label untouched.
 *  - CORRECTION (independent review round 5, item 3 -- "relinking can
 *    leave the old snapshot behind"): if the link's TARGET identity
 *    changes (`locationId`/`locationDraftId`) and the patch does NOT
 *    also explicitly supply a new `snapshot`, the old snapshot is
 *    CLEARED -- otherwise a stale "Kellin IV" snapshot could survive a
 *    relink to a wholly different Location and later lie to an orphan
 *    fallback display. Supplying an explicit `snapshot` in the same
 *    patch always wins.
 *
 * CORRECTION (independent review round 5, item 4 -- "single primary
 * mutation authority"): this function REJECTS a patch that explicitly
 * includes a `primary` key at all -- `setContactLocationLinkPrimary()`
 * is the ONE authoritative operation for changing primary state,
 * exactly like `npc-concept.js`'s own single-authority conventions
 * elsewhere. Routing "make this primary" through a generic patch would
 * let the normalizer's array-order tie-breaking silently decide the
 * outcome instead of the GM's explicit request.
 */
export function updateContactLocationLink(draft, linkId, patch = {}) {
  if (Object.prototype.hasOwnProperty.call(patch, 'primary')) return draft;
  if (!hasOnlyValidExplicitEnums(patch)) return draft;
  const existing = Array.isArray(draft?.locationLinks) ? draft.locationLinks : [];
  const index = existing.findIndex((l) => l.linkId === linkId);
  if (index === -1) return draft;
  const current = existing[index];
  const typeChanged = Object.prototype.hasOwnProperty.call(patch, 'relationshipType') && patch.relationshipType !== current.relationshipType;
  const labelExplicit = Object.prototype.hasOwnProperty.call(patch, 'relationshipLabel');
  const effectivePatch = (typeChanged && !labelExplicit) ? { ...patch, relationshipLabel: '' } : patch;
  let merged = createContactLocationLink({ ...current, source: CONTACT_LOCATION_LINK_SOURCE.MANUAL, ...effectivePatch, linkId });
  // Compare the FINAL resolved target (not the raw patch fields) --
  // createContactLocationLink()'s own locationId-wins-over-locationDraftId
  // precedence means a patch touching only ONE of the two id fields can
  // still change the link's actual resolved target (or, conversely,
  // leave it unchanged even though a field was mentioned); resolved-value
  // comparison is correct in every case, raw-field comparison isn't.
  const targetChanged = merged.locationId !== current.locationId || merged.locationDraftId !== current.locationDraftId;
  if (targetChanged && !Object.prototype.hasOwnProperty.call(patch, 'snapshot')) {
    merged = { ...merged, snapshot: { name: '', type: '' } };
  }
  if (!isMeaningfulContactLocationLink(merged)) return draft;
  const next = normalizeContactLocationLinks(existing.map((l, i) => (i === index ? merged : l)));
  return withLinks(draft, next);
}

/** Mark exactly one ACTIVE link `primary`, demoting every other ACTIVE link's `primary` flag (`normalizeContactLocationLinks()`'s own "at most one active primary" invariant does the actual enforcement). A no-op if no link with that id exists or it is not ACTIVE. */
export function setContactLocationLinkPrimary(draft, linkId) {
  const existing = Array.isArray(draft?.locationLinks) ? draft.locationLinks : [];
  const target = existing.find((l) => l.linkId === linkId);
  if (!target || target.status !== CONTACT_LOCATION_LINK_STATUS.ACTIVE) return draft;
  const next = normalizeContactLocationLinks(existing.map((l) => (l.linkId === linkId ? { ...l, primary: true } : { ...l, primary: false })));
  return withLinks(draft, next);
}

/** Reroll ONE link's narrative flavor (relationshipType/relationshipLabel) by `linkId`, preserving its target identity, status, primary flag, scope, certainty, revealState, notes, and every OTHER link. Marks the rerolled link `source:'generated'` (a plain reroll, not a manual GM edit). A no-op if no link with that id exists. */
export function rerollContactLocationLink(draft, linkId, { rng, preferTags = [] } = {}) {
  const existing = Array.isArray(draft?.locationLinks) ? draft.locationLinks : [];
  const index = existing.findIndex((l) => l.linkId === linkId);
  if (index === -1) return draft;
  const flavor = rollContactLocationRelationshipFlavor({ rng, preferTags });
  const rerolled = createContactLocationLink({ ...existing[index], ...flavor, source: CONTACT_LOCATION_LINK_SOURCE.GENERATED });
  const next = existing.map((l, i) => (i === index ? rerolled : l));
  return withLinks(draft, next);
}

/**
 * Reroll the PRIMARY active Location relationship's flavor -- the
 * direct replacement for the old `rerollNpcLocationRelationship()`
 * behavior (which used to patch a single scalar field). A no-op if the
 * draft has no primary active link (no Location association at all),
 * exactly like the old wrapper had nothing to reroll without one.
 */
export function rerollPrimaryContactLocationLink(draft, { rng, preferTags = [] } = {}) {
  const existing = Array.isArray(draft?.locationLinks) ? draft.locationLinks : [];
  const primary = getPrimaryContactLocationLink(existing);
  if (!primary) return draft;
  return rerollContactLocationLink(draft, primary.linkId, { rng, preferTags });
}

/**
 * Draft -> canonical promotion: the moment a `draft:location:...` this
 * NPC relates to is actually committed, every link pointing at it must
 * follow -- see `npc-location-link.js`'s `resolveLocationDraftReferenceInLinks()`
 * for the full rationale (this is NOT the universal cross-domain
 * relationship registry deliberately deferred elsewhere; it only
 * finishes THIS relationship type's own draft/canonical lifecycle). A
 * no-op if no link on this draft carries the given `locationDraftId`.
 */
export function resolveContactLocationDraftReference(draft, { locationDraftId, locationId, snapshot } = {}) {
  const existing = Array.isArray(draft?.locationLinks) ? draft.locationLinks : [];
  const next = resolveLocationDraftReferenceInLinks(existing, { locationDraftId, locationId, snapshot });
  if (next === existing) return draft;
  return withLinks(draft, next);
}
