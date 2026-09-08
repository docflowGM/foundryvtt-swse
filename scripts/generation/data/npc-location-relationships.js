/**
 * PHASE 8D-3B production -- NPC location-relationship catalog: how this
 * NPC relates to the Location they're generated on/near ("native" vs.
 * "just passing through"). Feeds species/flavor locality weighting the
 * SAME way `recruitment-profile.js`'s `localityBias` already does for
 * Faction membership -- this is the individual-NPC analog, not a
 * competing authority. Representative catalog (phase target: 30-50).
 *
 * CORRECTION (independent review round 3 -- Contact<->Location
 * hardening): each entry now also carries a `linkType`, one of
 * `data/npc-location-relationship-types.js`'s stable
 * `CONTACT_LOCATION_RELATIONSHIP` vocabulary. This is a REUSE mapping,
 * not a second narrative catalog: `linkType` classifies WHAT KIND of
 * structural relationship this narrative flavor represents (so
 * `npc/npc-location-link.js`'s `locationLinks[]` entries get a
 * queryable `relationshipType` alongside their narrative
 * `relationshipLabel`), while `value`/`weight`/`tags` keep doing
 * exactly what they always did for locality/species selection bias.
 */
import { CONTACT_LOCATION_RELATIONSHIP } from './npc-location-relationship-types.js';

export const NPC_LOCATION_RELATIONSHIPS = Object.freeze([
  { value: 'native', weight: 4, tags: [], linkType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT },
  { value: 'lifelong resident', weight: 3, tags: [], linkType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT },
  { value: 'recent arrival', weight: 2, tags: [], linkType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT },
  { value: 'visitor', weight: 2, tags: [], linkType: CONTACT_LOCATION_RELATIONSHIP.TRANSIT },
  { value: 'traveler passing through', weight: 2, tags: ['frontier', 'trade'], linkType: CONTACT_LOCATION_RELATIONSHIP.TRANSIT },
  { value: 'stationed here', weight: 2, tags: ['military-paramilitary', 'government-bureaucracy'], linkType: CONTACT_LOCATION_RELATIONSHIP.STATIONED },
  { value: 'refugee', weight: 1, tags: [], linkType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT },
  { value: 'immigrant', weight: 1, tags: [], linkType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT },
  { value: 'exile', weight: 0.5, tags: [], linkType: CONTACT_LOCATION_RELATIONSHIP.FORMER },
  { value: 'prisoner', weight: 0.5, tags: ['enforcement'], linkType: CONTACT_LOCATION_RELATIONSHIP.IMPRISONED },
  { value: 'contract worker', weight: 2, tags: ['business-professional', 'mining'], linkType: CONTACT_LOCATION_RELATIONSHIP.WORK },
  { value: 'pilgrim', weight: 0.5, tags: ['religion'], linkType: CONTACT_LOCATION_RELATIONSHIP.TRANSIT },
  { value: 'student', weight: 1, tags: ['education'], linkType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT },
  { value: 'diplomatic visitor', weight: 0.5, tags: ['government-bureaucracy', 'noble-house'], linkType: CONTACT_LOCATION_RELATIONSHIP.TRANSIT },
  { value: 'merchant transient', weight: 1, tags: ['trade'], linkType: CONTACT_LOCATION_RELATIONSHIP.TRANSIT },
  { value: 'settler', weight: 1, tags: ['frontier'], linkType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT },
  { value: 'returning after a long absence', weight: 1, tags: [], linkType: CONTACT_LOCATION_RELATIONSHIP.RESIDENT },
  { value: 'displaced by conflict elsewhere', weight: 0.5, tags: ['military-paramilitary'], linkType: CONTACT_LOCATION_RELATIONSHIP.TRANSIT },
  { value: 'here on temporary assignment', weight: 1, tags: ['business-professional', 'government-bureaucracy'], linkType: CONTACT_LOCATION_RELATIONSHIP.ASSIGNED },
  { value: 'born elsewhere, considers this place home now', weight: 1, tags: [], linkType: CONTACT_LOCATION_RELATIONSHIP.HOME }
]);

const LINK_TYPE_BY_VALUE = new Map(NPC_LOCATION_RELATIONSHIPS.map((entry) => [entry.value, entry.linkType]));

/** Map a `NPC_LOCATION_RELATIONSHIPS` narrative `value` onto its `CONTACT_LOCATION_RELATIONSHIP` type, or `''` for a value this catalog doesn't recognize (e.g. GM-authored free text) -- callers fall back to `ASSOCIATED` in that case, never guess. */
export function relationshipTypeForNpcLocationRelationshipValue(value) {
  return LINK_TYPE_BY_VALUE.get(value) ?? '';
}
