/**
 * PHASE 8D-3B correction pass round 3 (independent review addendum) --
 * stable STRUCTURAL vocabulary for a Contact<->Location relationship's
 * `relationshipType` (`npc/npc-location-link.js`'s link primitive).
 *
 * Distinct from `data/npc-location-relationships.js`'s existing
 * NARRATIVE catalog ("native"/"recent arrival"/"traveler passing
 * through"/...), which biases locality/species SELECTION and supplies
 * a link's human-readable `relationshipLabel` -- this enum classifies
 * WHAT KIND of relationship a link represents (work vs. resident vs.
 * hiding vs. last-seen...), so a future Location Datapad/Job/Intel
 * consumer can query "who works here" or "who's hiding here" without
 * parsing free text. `data/npc-location-relationships.js` maps each of
 * its own narrative entries onto ONE of these types (`linkType`) --
 * see that file's own doc -- rather than this module duplicating a
 * second narrative vocabulary.
 *
 * `CUSTOM` exists for GM sovereignty: a link's `relationshipType` may
 * be `'custom'` with any `relationshipLabel` the GM writes, exactly
 * like the rest of this schema stays GM-overridable via manual fields.
 */
export const CONTACT_LOCATION_RELATIONSHIP = Object.freeze({
  CURRENT: 'current',
  RESIDENT: 'resident',
  ORIGIN: 'origin',
  HOME: 'home',
  WORK: 'work',
  STATIONED: 'stationed',
  ASSIGNED: 'assigned',
  FREQUENTS: 'frequents',
  OPERATES: 'operates',
  OWNS: 'owns',
  HIDING: 'hiding',
  IMPRISONED: 'imprisoned',
  TRANSIT: 'transit',
  LAST_SEEN: 'last-seen',
  FORMER: 'former',
  ASSOCIATED: 'associated',
  CUSTOM: 'custom'
});

const RELATIONSHIP_TYPE_VALUES = new Set(Object.values(CONTACT_LOCATION_RELATIONSHIP));

export function isContactLocationRelationshipType(value) {
  return RELATIONSHIP_TYPE_VALUES.has(value);
}

/** Default human-readable label per type -- used only when a link supplies no explicit `relationshipLabel` of its own. `CUSTOM` has no default (a custom type without a GM-written label is a contradiction, matching `addCustomDraftField()`'s same discipline elsewhere in this schema). */
export const CONTACT_LOCATION_RELATIONSHIP_DEFAULT_LABEL = Object.freeze({
  [CONTACT_LOCATION_RELATIONSHIP.CURRENT]: 'Currently here',
  [CONTACT_LOCATION_RELATIONSHIP.RESIDENT]: 'Lives here',
  [CONTACT_LOCATION_RELATIONSHIP.ORIGIN]: 'Originally from here',
  [CONTACT_LOCATION_RELATIONSHIP.HOME]: 'Home',
  [CONTACT_LOCATION_RELATIONSHIP.WORK]: 'Works here',
  [CONTACT_LOCATION_RELATIONSHIP.STATIONED]: 'Stationed here',
  [CONTACT_LOCATION_RELATIONSHIP.ASSIGNED]: 'Assigned here',
  [CONTACT_LOCATION_RELATIONSHIP.FREQUENTS]: 'Frequents here',
  [CONTACT_LOCATION_RELATIONSHIP.OPERATES]: 'Operates here',
  [CONTACT_LOCATION_RELATIONSHIP.OWNS]: 'Owns this',
  [CONTACT_LOCATION_RELATIONSHIP.HIDING]: 'Hiding here',
  [CONTACT_LOCATION_RELATIONSHIP.IMPRISONED]: 'Imprisoned here',
  [CONTACT_LOCATION_RELATIONSHIP.TRANSIT]: 'Passing through',
  [CONTACT_LOCATION_RELATIONSHIP.LAST_SEEN]: 'Last seen here',
  [CONTACT_LOCATION_RELATIONSHIP.FORMER]: 'Formerly here',
  [CONTACT_LOCATION_RELATIONSHIP.ASSOCIATED]: 'Associated with here',
  [CONTACT_LOCATION_RELATIONSHIP.CUSTOM]: ''
});
