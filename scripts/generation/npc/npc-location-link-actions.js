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
  rollContactLocationRelationshipFlavor, CONTACT_LOCATION_LINK_STATUS, CONTACT_LOCATION_LINK_SOURCE
} from './npc-location-link.js';

function withLinks(draft, locationLinks) {
  return updateNpcConceptDraft(draft, { locationLinks });
}

/** Append one new Location relationship. Every OTHER existing link is preserved untouched. A no-op (returns the draft unchanged) if `input` carries no resolvable target/snapshot -- see `npc-location-link.js`'s `hasTarget()`. */
export function addContactLocationLink(draft, input = {}) {
  const existing = Array.isArray(draft?.locationLinks) ? draft.locationLinks : [];
  const next = normalizeContactLocationLinks([...existing, input]);
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

/** Patch one Location relationship's fields (label/notes/status/scope/certainty/revealState/...) by `linkId`, preserving its `linkId` and every OTHER link untouched. A no-op if no link with that id exists. */
export function updateContactLocationLink(draft, linkId, patch = {}) {
  const existing = Array.isArray(draft?.locationLinks) ? draft.locationLinks : [];
  const index = existing.findIndex((l) => l.linkId === linkId);
  if (index === -1) return draft;
  const merged = createContactLocationLink({ ...existing[index], ...patch, linkId });
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
