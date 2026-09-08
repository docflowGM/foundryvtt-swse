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
  rollContactLocationRelationshipFlavor, CONTACT_LOCATION_LINK_STATUS, CONTACT_LOCATION_LINK_SOURCE
} from './npc-location-link.js';

function withLinks(draft, locationLinks) {
  return updateNpcConceptDraft(draft, { locationLinks });
}

/**
 * Append one new Location relationship. Every OTHER existing link is
 * preserved untouched. A no-op (returns the draft unchanged) if `input`
 * isn't meaningful (no resolvable target/eligible snapshot, or a
 * `custom` type with no label) -- see `npc-location-link.js`'s
 * `isMeaningfulContactLocationLink()`.
 *
 * Defaults `source` to `'manual'` unless the caller explicitly
 * overrides it -- this is the GM-facing authoring action (the
 * generator constructs its own links directly via
 * `createContactLocationLink()` in `npc/npc-bundle.js`, never through
 * this action layer), so a relationship added here is GM authorship by
 * definition, exactly like `npc/npc-field-authoring.js`'s "editing a
 * generated value converts it to manual" rule elsewhere in this
 * ecosystem.
 */
export function addContactLocationLink(draft, input = {}) {
  const existing = Array.isArray(draft?.locationLinks) ? draft.locationLinks : [];
  const next = normalizeContactLocationLinks([...existing, { source: CONTACT_LOCATION_LINK_SOURCE.MANUAL, ...input }]);
  if (next.length === existing.length) return draft;
  return withLinks(draft, next);
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
 * every OTHER link untouched. A no-op if no link with that id exists,
 * OR if the patched result would no longer be meaningful (e.g.
 * changing `relationshipType` to `custom` without also supplying a
 * `relationshipLabel`) -- the update is REJECTED wholesale in that
 * case, never silently dropping the relationship out of the array
 * (a GM's bad edit should bounce, not delete data).
 *
 * Two coherence rules, both scoped to THIS call only:
 *  - Defaults `source` to `'manual'` unless the patch explicitly
 *    overrides it (same GM-authorship default as `addContactLocationLink()`).
 *  - If `relationshipType` is explicitly changed and the patch does
 *    NOT also explicitly supply `relationshipLabel`, the label resets
 *    to the new type's own default label -- otherwise a type change
 *    (e.g. resident -> work) could silently leave the OLD type's label
 *    ("native") attached to the new type, an accidental semantic drift
 *    the GM never asked for. Supplying BOTH in the same patch always
 *    preserves the caller's exact label untouched.
 */
export function updateContactLocationLink(draft, linkId, patch = {}) {
  const existing = Array.isArray(draft?.locationLinks) ? draft.locationLinks : [];
  const index = existing.findIndex((l) => l.linkId === linkId);
  if (index === -1) return draft;
  const current = existing[index];
  const typeChanged = Object.prototype.hasOwnProperty.call(patch, 'relationshipType') && patch.relationshipType !== current.relationshipType;
  const labelExplicit = Object.prototype.hasOwnProperty.call(patch, 'relationshipLabel');
  const effectivePatch = (typeChanged && !labelExplicit) ? { ...patch, relationshipLabel: '' } : patch;
  const merged = createContactLocationLink({ ...current, source: CONTACT_LOCATION_LINK_SOURCE.MANUAL, ...effectivePatch, linkId });
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
