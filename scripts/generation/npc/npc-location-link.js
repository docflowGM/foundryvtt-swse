/**
 * PHASE 8D-3B correction pass round 3 (independent review addendum) --
 * Contact <-> Location relationship model. Multi-valued, stable-id
 * relationships (`locationLinks[]`) replace a single scalar Location
 * reference as `npc-concept.js`'s real authority -- an NPC can
 * simultaneously be a resident of one place, work at another, and have
 * last been seen at a third; there is no single correct answer to
 * "NPC.location".
 *
 * PURE PRIMITIVE LAYER: this module knows nothing about
 * `npc-concept.js` drafts or `updateNpcConceptDraft()` -- it only
 * builds/validates/queries plain `locationLinks` arrays. See
 * `npc-location-link-actions.js` for the thin draft-CRUD wrapper that
 * imports `updateNpcConceptDraft()` (mirrors the exact
 * generic-primitive/domain-wrapper split `lib/draft-field-authoring.js`/
 * `npc/npc-field-authoring.js` already established -- avoids a
 * circular import between this module and `npc-concept.js`, and keeps
 * this module trivially unit-testable against bare arrays).
 *
 * IDENTITY: every link has a stable `linkId` -- never a Location's
 * name, its array index, or its `locationId`/`locationDraftId` itself
 * (an NPC could have two links to the SAME Location with different
 * relationshipTypes, e.g. "used to work here" + "hiding here now"). A
 * reroll/edit/remove operation always targets `linkId`.
 *
 * DRAFT/CANONICAL DUALITY: a link's target is EITHER a real canonical
 * `locationId` OR a pre-commit `locationDraftId`, never both actively
 * at once -- `createContactLocationLink()` enforces this: a supplied
 * `locationId` always wins and clears any `locationDraftId` in the
 * SAME call (see `lib/draft-id.js`'s own draft/canonical framing).
 *
 * RESOLUTION FAILS SAFE, NEVER FUZZY: `resolveContactLocationLink()`
 * takes INJECTED lookups (`findLocation`/`findLocationDraft`) -- this
 * module never guesses a Location by name/slug when an id can't be
 * resolved. Five distinct states (see `CONTACT_LOCATION_LINK_RESOLUTION_STATE`)
 * keep "nobody supplied a resolver yet" (`unresolved`) from being
 * confused with "a resolver definitively found nothing"
 * (`orphaned`) -- a UI must never show "⚠ Missing Location" when the
 * real story is "nobody asked the resolver." An unresolvable/
 * not-yet-resolved link always falls back to its own `snapshot` for
 * display, never a silent name-based relink.
 *
 * DEFERRED (explicitly, per this correction round's own scope note):
 * a universal cross-domain relationship registry, `validFrom`/
 * `validUntil` timestamps, a generation-context fingerprint, and the
 * Foundry-dependent `LocationRegistryService` hierarchy-traversal
 * wiring for `findContactsForLocationRef()`'s `isDescendant` predicate
 * -- this module supplies the pure algorithm only; a later UI-layer
 * bridge (mirroring `scripts/ui/shell/gm/LocationJobBridgeService.js`'s
 * existing pattern) supplies the real predicate.
 */

import { stableHexId } from '../../utils/stable-id.js';
import {
  CONTACT_LOCATION_RELATIONSHIP, isContactLocationRelationshipType, CONTACT_LOCATION_RELATIONSHIP_DEFAULT_LABEL
} from '../data/npc-location-relationship-types.js';
import { NPC_LOCATION_RELATIONSHIPS, relationshipTypeForNpcLocationRelationshipValue } from '../data/npc-location-relationships.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

export { CONTACT_LOCATION_RELATIONSHIP };

export const CONTACT_LOCATION_LINK_STATUS = Object.freeze({ ACTIVE: 'active', HISTORICAL: 'historical', PLANNED: 'planned', UNKNOWN: 'unknown' });
export const CONTACT_LOCATION_LINK_SCOPE = Object.freeze({ EXACT: 'exact', DESCENDANTS: 'descendants' });
export const CONTACT_LOCATION_LINK_CERTAINTY = Object.freeze({ CONFIRMED: 'confirmed', REPORTED: 'reported', SUSPECTED: 'suspected', DISPUTED: 'disputed' });
export const CONTACT_LOCATION_LINK_SOURCE = Object.freeze({ GENERATED: 'generated', MANUAL: 'manual', RESOLVED: 'resolved', IMPORTED: 'imported' });

/** `resolveContactLocationLink()`'s five distinct resolution states -- see this module's header for why `unresolved` and `orphaned` must never be conflated. */
export const CONTACT_LOCATION_LINK_RESOLUTION_STATE = Object.freeze({
  CANONICAL: 'canonical', DRAFT: 'draft', UNRESOLVED: 'unresolved', ORPHANED: 'orphaned', EMPTY: 'empty'
});

/**
 * Deliberately duplicated from `npc-concept.js`'s own `NPC_REVEAL_STATE`
 * (same 4-value "known to players or not" vocabulary) rather than
 * imported -- importing it would pull this pure primitive module into
 * a dependency on `npc-concept.js`, exactly the circular import this
 * module's header explains avoiding. Matches this whole ecosystem's
 * existing "deliberately duplicated as plain values" precedent (e.g.
 * `npc/npc-bundle.js`'s own `DROID_LIKELIHOOD_BY_PREVALENCE` doc).
 */
const LOCATION_LINK_REVEAL_STATE = Object.freeze(['hidden', 'hinted', 'known', 'compromised']);

const STATUS_VALUES = new Set(Object.values(CONTACT_LOCATION_LINK_STATUS));
const SCOPE_VALUES = new Set(Object.values(CONTACT_LOCATION_LINK_SCOPE));
const CERTAINTY_VALUES = new Set(Object.values(CONTACT_LOCATION_LINK_CERTAINTY));
const SOURCE_VALUES = new Set(Object.values(CONTACT_LOCATION_LINK_SOURCE));

/**
 * Exported enum validators (independent review round 5 -- "strict
 * authoring-patch validation"): `createContactLocationLink()` itself
 * stays intentionally TOLERANT (an invalid enum value silently
 * coerces to a sane default), which is correct for bulk normalization/
 * migration/loading of possibly-messy data. An explicit GM authoring
 * PATCH is a different situation -- a typo like `status: 'historic'`
 * should bounce, not silently succeed as `'active'` while the rest of
 * the edit applies. `npc-location-link-actions.js`'s
 * `addContactLocationLink()`/`updateContactLocationLink()` use these to
 * reject a patch that explicitly supplies an invalid enum value,
 * rather than letting `createContactLocationLink()`'s own tolerant
 * coercion silently rewrite the GM's mistake into something else.
 */
export function isContactLocationLinkStatus(value) { return STATUS_VALUES.has(value); }
export function isContactLocationLinkScope(value) { return SCOPE_VALUES.has(value); }
export function isContactLocationLinkCertainty(value) { return CERTAINTY_VALUES.has(value); }
export function isContactLocationLinkSource(value) { return SOURCE_VALUES.has(value); }
export function isContactLocationLinkRevealState(value) { return LOCATION_LINK_REVEAL_STATE.includes(value); }

function cleanString(value) {
  return String(value ?? '').trim();
}

function mintLinkId() {
  return `contact-location-${stableHexId(`${Date.now()}:${Math.random()}:contact-location`).slice(0, 12)}`;
}

/**
 * Build one normalized link entry. `locationId` always wins over
 * `locationDraftId` when BOTH are supplied in the SAME call (the
 * draft/canonical duality invariant) -- a caller migrating a draft
 * Location to canonical should supply ONLY the new `locationId`, never
 * both. Idempotent and content-preserving: re-running this on an
 * already-normalized link reproduces the same `linkId` and field
 * values (a fresh object each time, per this whole ecosystem's
 * immutable-draft convention).
 */
export function createContactLocationLink(input = {}) {
  const locationId = cleanString(input.locationId);
  const locationDraftId = locationId ? '' : cleanString(input.locationDraftId);
  const relationshipType = isContactLocationRelationshipType(input.relationshipType) ? input.relationshipType : CONTACT_LOCATION_RELATIONSHIP.ASSOCIATED;
  const relationshipLabel = cleanString(input.relationshipLabel) || CONTACT_LOCATION_RELATIONSHIP_DEFAULT_LABEL[relationshipType] || '';
  return {
    linkId: cleanString(input.linkId) || mintLinkId(),
    locationId,
    locationDraftId,
    relationshipType,
    relationshipLabel,
    status: STATUS_VALUES.has(input.status) ? input.status : CONTACT_LOCATION_LINK_STATUS.ACTIVE,
    primary: Boolean(input.primary),
    scope: SCOPE_VALUES.has(input.scope) ? input.scope : CONTACT_LOCATION_LINK_SCOPE.EXACT,
    certainty: CERTAINTY_VALUES.has(input.certainty) ? input.certainty : CONTACT_LOCATION_LINK_CERTAINTY.CONFIRMED,
    revealState: LOCATION_LINK_REVEAL_STATE.includes(input.revealState) ? input.revealState : 'hidden',
    source: SOURCE_VALUES.has(input.source) ? input.source : CONTACT_LOCATION_LINK_SOURCE.GENERATED,
    notes: cleanString(input.notes),
    snapshot: {
      name: cleanString(input.snapshot?.name),
      type: cleanString(input.snapshot?.type)
    },
    provenance: (input.provenance && typeof input.provenance === 'object') ? { ...input.provenance } : {}
  };
}

/**
 * A link's `relationshipType` may be `custom` ONLY with a GM-written
 * `relationshipLabel` -- `data/npc-location-relationship-types.js`'s
 * own `CONTACT_LOCATION_RELATIONSHIP_DEFAULT_LABEL` documents this
 * ("CUSTOM has no default; custom without GM-written label is
 * contradictory"); this is where that contract is actually enforced,
 * not merely documented.
 *
 * Snapshot-only entries (no `locationId`/`locationDraftId` at all) are
 * permitted ONLY for the one case that genuinely never had a resolvable
 * id -- a migrated `lastKnownLocation` (`relationshipType: LAST_SEEN`)
 * -- or explicitly `IMPORTED` legacy data whose original source system
 * may not have carried an id either. A normal CURRENT relationship
 * (resident/work/stationed/owns/hiding/...) always requires a real
 * target; without this restriction the API would silently reintroduce
 * name-only relationships as a back door around the whole point of
 * `locationId`/`locationDraftId` being the real identity.
 */
const SNAPSHOT_ONLY_ELIGIBLE_TYPES = new Set([CONTACT_LOCATION_RELATIONSHIP.LAST_SEEN]);

export function isMeaningfulContactLocationLink(link) {
  if (!link) return false;
  if (link.relationshipType === CONTACT_LOCATION_RELATIONSHIP.CUSTOM && !link.relationshipLabel) return false;
  if (link.locationId || link.locationDraftId) return true;
  if (!link.snapshot?.name) return false;
  return SNAPSHOT_ONLY_ELIGIBLE_TYPES.has(link.relationshipType) || link.source === CONTACT_LOCATION_LINK_SOURCE.IMPORTED;
}

/**
 * Clean/validate a whole `locationLinks` array: drop entries that
 * aren't meaningful (see `isMeaningfulContactLocationLink()`), dedupe
 * by `linkId` (first occurrence wins), and enforce two invariants --
 * "primary is only ever meaningful on an ACTIVE link" (a historical/
 * planned/unknown link's `primary` flag is always forced `false`,
 * never left dangling from a status change) and "at most one ACTIVE
 * link may be primary" (the first ACTIVE link flagged primary wins;
 * later ones are demoted, never dropped -- they keep their own link,
 * just lose the primary flag).
 */
export function normalizeContactLocationLinks(value) {
  const raw = Array.isArray(value) ? value : [];
  const seenIds = new Set();
  const out = [];
  for (const entry of raw) {
    const incomingId = cleanString(entry?.linkId);
    if (incomingId && seenIds.has(incomingId)) continue;
    const link = createContactLocationLink(entry);
    if (!isMeaningfulContactLocationLink(link)) continue;
    if (seenIds.has(link.linkId)) continue;
    seenIds.add(link.linkId);
    out.push(link);
  }
  let sawActivePrimary = false;
  for (let i = 0; i < out.length; i++) {
    const link = out[i];
    if (link.status !== CONTACT_LOCATION_LINK_STATUS.ACTIVE) {
      if (link.primary) out[i] = { ...link, primary: false };
      continue;
    }
    if (link.primary) {
      if (sawActivePrimary) out[i] = { ...link, primary: false };
      else sawActivePrimary = true;
    }
  }
  return out;
}

/** First ACTIVE link flagged `primary`; falls back to the first ACTIVE link if none is explicitly primary; `null` if there are no active links at all. */
export function getPrimaryContactLocationLink(locationLinks) {
  const links = Array.isArray(locationLinks) ? locationLinks : [];
  const active = links.filter((l) => l.status === CONTACT_LOCATION_LINK_STATUS.ACTIVE);
  return active.find((l) => l.primary) ?? active[0] ?? null;
}

/** Every link of a given `relationshipType`, in order. */
export function getContactLocationLinksByType(locationLinks, relationshipType) {
  const links = Array.isArray(locationLinks) ? locationLinks : [];
  return links.filter((l) => l.relationshipType === relationshipType);
}

/**
 * ONE-TIME v1 -> v2 migration: synthesize a `locationLinks` array from
 * the OLD scalar shape (`linkedLocationId`/`locationDraftId`/
 * `locationRelationship`/`lastKnownLocation`) for a caller that still
 * constructs an NPC concept the pre-hardening way. `locationRelationship`
 * was always free narrative text (e.g. "native"), never a stable
 * `relationshipType` -- this maps it through
 * `relationshipTypeForNpcLocationRelationshipValue()` when the value is
 * a recognized `NPC_LOCATION_RELATIONSHIPS` entry, falling back to
 * `ASSOCIATED` for a value this catalog doesn't recognize (e.g.
 * hand-authored GM text), and PRESERVES the original text verbatim as
 * `relationshipLabel` either way -- migration never loses the actual
 * words. `lastKnownLocation` was ALWAYS a bare display string with no
 * id of its own -- it migrates to a `LAST_SEEN`/`historical` link with
 * no `locationId`/`locationDraftId`, carrying the old text as its
 * `snapshot.name` only (never a resolvable target, matching what the
 * old field actually was).
 */
export function migrateLegacyLocationScalarsToLinks({ linkedLocationId = '', locationDraftId = '', locationRelationship = '', lastKnownLocation = '' } = {}) {
  const links = [];
  const primaryId = cleanString(linkedLocationId);
  const primaryDraftId = cleanString(locationDraftId);
  const primaryLabel = cleanString(locationRelationship);
  if (primaryId || primaryDraftId || primaryLabel) {
    links.push(createContactLocationLink({
      locationId: primaryId,
      locationDraftId: primaryDraftId,
      relationshipType: relationshipTypeForNpcLocationRelationshipValue(primaryLabel) || CONTACT_LOCATION_RELATIONSHIP.ASSOCIATED,
      relationshipLabel: primaryLabel,
      status: CONTACT_LOCATION_LINK_STATUS.ACTIVE,
      primary: true,
      source: CONTACT_LOCATION_LINK_SOURCE.GENERATED
    }));
  }
  const lastSeenName = cleanString(lastKnownLocation);
  if (lastSeenName) {
    links.push(createContactLocationLink({
      relationshipType: CONTACT_LOCATION_RELATIONSHIP.LAST_SEEN,
      status: CONTACT_LOCATION_LINK_STATUS.HISTORICAL,
      source: CONTACT_LOCATION_LINK_SOURCE.GENERATED,
      snapshot: { name: lastSeenName }
    }));
  }
  return links;
}

/**
 * Derive the OLD scalar fields from the CURRENT `locationLinks[]` --
 * these are compatibility MIRRORS for every pre-existing consumer that
 * still reads `contact.linkedLocationId` etc. as a plain string, never
 * a second authority. `linkedLocationId`/`locationDraftId`/
 * `locationRelationship` mirror the PRIMARY active link (see
 * `getPrimaryContactLocationLink()`); `lastKnownLocation` mirrors the
 * most-recently-added `LAST_SEEN`-type link's display name (its
 * `snapshot.name`, since the legacy field never carried an id in the
 * first place).
 */
export function deriveLegacyLocationFields(locationLinks) {
  const links = Array.isArray(locationLinks) ? locationLinks : [];
  const primary = getPrimaryContactLocationLink(links);
  const lastSeen = [...links].reverse().find((l) => l.relationshipType === CONTACT_LOCATION_RELATIONSHIP.LAST_SEEN);
  return {
    linkedLocationId: primary?.locationId ?? '',
    locationDraftId: primary?.locationDraftId ?? '',
    locationRelationship: primary?.relationshipLabel ?? '',
    lastKnownLocation: lastSeen?.snapshot?.name ?? ''
  };
}

/**
 * Pick a fresh narrative relationship value (reusing the EXISTING
 * `data/npc-location-relationships.js` catalog -- see that file's own
 * doc for why this is not a second/duplicate narrative vocabulary) and
 * its mapped stable `relationshipType`, for constructing or rerolling
 * ONE link's flavor.
 */
export function rollContactLocationRelationshipFlavor({ rng, preferTags = [] } = {}) {
  const label = weightedPickWithPreference(NPC_LOCATION_RELATIONSHIPS, { rng, preferTags })?.value ?? '';
  return { relationshipLabel: label, relationshipType: relationshipTypeForNpcLocationRelationshipValue(label) || CONTACT_LOCATION_RELATIONSHIP.ASSOCIATED };
}

/**
 * Resolve a link against INJECTED lookups -- never a name/slug guess
 * (see this module's header). Returns `{ state, location, snapshot }`
 * with one of `CONTACT_LOCATION_LINK_RESOLUTION_STATE`'s five states:
 *
 *  - `CANONICAL` -- a canonical `locationId`, and `findLocation()` found it.
 *  - `DRAFT` -- a `locationDraftId`, and `findLocationDraft()` found it.
 *  - `UNRESOLVED` -- an id is set, but no resolver function was supplied
 *    at all -- "nobody asked," never "confirmed missing."
 *  - `ORPHANED` -- an id is set, a resolver WAS supplied, and it
 *    definitively returned nothing.
 *  - `EMPTY` -- the link carries no target id at all (e.g. a migrated
 *    `lastKnownLocation` with only a snapshot name).
 *
 * `UNRESOLVED` and `ORPHANED` must never be conflated -- a UI showing
 * "⚠ Missing Location" for a link nobody has even tried to resolve yet
 * would be actively misleading (and the reverse: an unresolved draft
 * link would otherwise look identical to a live one forever).
 */
export function resolveContactLocationLink(link, { findLocation, findLocationDraft } = {}) {
  const S = CONTACT_LOCATION_LINK_RESOLUTION_STATE;
  if (!link) return { state: S.EMPTY, location: null, snapshot: null };
  if (link.locationId) {
    if (typeof findLocation !== 'function') return { state: S.UNRESOLVED, location: null, snapshot: link.snapshot ?? null };
    const location = findLocation(link.locationId) ?? null;
    return { state: location ? S.CANONICAL : S.ORPHANED, location, snapshot: link.snapshot ?? null };
  }
  if (link.locationDraftId) {
    if (typeof findLocationDraft !== 'function') return { state: S.UNRESOLVED, location: null, snapshot: link.snapshot ?? null };
    const location = findLocationDraft(link.locationDraftId) ?? null;
    return { state: location ? S.DRAFT : S.ORPHANED, location, snapshot: link.snapshot ?? null };
  }
  return { state: S.EMPTY, location: null, snapshot: link.snapshot ?? null };
}

/**
 * Pure reverse-lookup primitive: which of `contacts` (an array of
 * `npc-concept.js` drafts) carry an ACTIVE `locationLinks` entry
 * reaching `locationRef` -- `{ locationId }` for a canonical target OR
 * `{ locationDraftId }` for a pre-commit one (mirrors `createContactLocationLink()`'s
 * own draft/canonical precedence: a supplied `locationId` always wins
 * when both are present). A DRAFT Location is a first-class query
 * target, not a second-class one -- the exact GENERATE -> Faction ->
 * Contacts -> "open the not-yet-committed Location's Datapad" workflow
 * this whole draft-first architecture is built around would otherwise
 * have no way to see its own just-generated relationships.
 *
 * Two independent hierarchy features, both driven by ONE injected
 * `isDescendant(candidateLocationId, ancestorLocationId)` predicate
 * (this module never talks to `LocationRegistryService` directly --
 * see this module's header) -- CANONICAL-ONLY for now, since a draft
 * batch's own hierarchy isn't necessarily available to a caller yet;
 * an exact draft-target match always works regardless:
 *
 *  - `includeDescendants: true` -- querying an ANCESTOR canonical
 *    location (e.g. a planet) also surfaces Contacts anchored at any
 *    location BENEATH it, regardless of that link's own `scope`.
 *  - a link's own `scope: 'descendants'` -- a SINGLE link anchored at
 *    a high-level canonical location (e.g. a governor's link to a
 *    planet) also covers a query at any location BENEATH it, even
 *    without `includeDescendants` (jurisdiction, not physical
 *    presence).
 */
export function findContactsForLocationRef(contacts, locationRef, { includeDescendants = false, isDescendant } = {}) {
  const targetId = cleanString(locationRef?.locationId);
  const targetDraftId = targetId ? '' : cleanString(locationRef?.locationDraftId);
  if (!targetId && !targetDraftId) return [];
  const list = Array.isArray(contacts) ? contacts : [];
  const descendantOf = (candidateId, ancestorId) => Boolean(candidateId && ancestorId && typeof isDescendant === 'function' && isDescendant(candidateId, ancestorId));
  return list.filter((contact) => {
    const links = Array.isArray(contact?.locationLinks) ? contact.locationLinks : [];
    return links.some((link) => {
      if (link.status !== CONTACT_LOCATION_LINK_STATUS.ACTIVE) return false;
      if (targetDraftId) return link.locationDraftId === targetDraftId;
      if (!link.locationId) return false;
      if (link.locationId === targetId) return true;
      if (includeDescendants && descendantOf(link.locationId, targetId)) return true;
      if (link.scope === CONTACT_LOCATION_LINK_SCOPE.DESCENDANTS && descendantOf(targetId, link.locationId)) return true;
      return false;
    });
  });
}

/**
 * Draft -> canonical promotion for Location targets: replace EVERY
 * link whose `locationDraftId` equals `fromLocationDraftId` with the
 * new canonical `toLocationId`, preserving `linkId`/`relationshipType`/
 * `relationshipLabel`/`status`/`primary`/`scope`/`certainty`/
 * `revealState`/`source`/`notes`/`provenance` EXACTLY -- only the
 * target identity changes. This is NOT the universal cross-domain
 * relationship registry deliberately deferred elsewhere -- it only
 * finishes the draft/canonical lifecycle THIS relationship type
 * already promises (see this module's header's draft/canonical duality
 * invariant): the moment a draft Location is committed, every
 * relationship pointing at it must follow, and that transition belongs
 * to this module, not to ad hoc `patch.locationId = ...` writes
 * scattered across whatever controller happens to run the commit.
 *
 * A link with a DIFFERENT (or no) `locationDraftId` is returned
 * completely untouched (same object reference) -- an unrelated
 * promotion never disturbs a sibling relationship. Returns the
 * ORIGINAL array reference (a true no-op) if nothing matched, or if
 * either id is blank.
 */
export function resolveLocationDraftReferenceInLinks(locationLinks, { locationDraftId, locationId, snapshot } = {}) {
  const fromDraftId = cleanString(locationDraftId);
  const toLocationId = cleanString(locationId);
  const links = Array.isArray(locationLinks) ? locationLinks : [];
  if (!fromDraftId || !toLocationId) return links;
  let changed = false;
  const next = links.map((link) => {
    if (link.locationDraftId !== fromDraftId) return link;
    changed = true;
    return createContactLocationLink({
      ...link,
      locationId: toLocationId,
      locationDraftId: '',
      snapshot: snapshot ? { name: snapshot.name, type: snapshot.type } : link.snapshot
    });
  });
  return changed ? next : links;
}
