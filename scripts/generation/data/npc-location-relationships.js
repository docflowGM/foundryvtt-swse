/**
 * PHASE 8D-3B production — NPC location-relationship catalog: how this
 * NPC relates to the Location they're generated on/near ("native" vs.
 * "just passing through"). Feeds species/flavor locality weighting the
 * SAME way `recruitment-profile.js`'s `localityBias` already does for
 * Faction membership -- this is the individual-NPC analog, not a
 * competing authority. Representative catalog (phase target: 30-50).
 */
export const NPC_LOCATION_RELATIONSHIPS = Object.freeze([
  { value: 'native', weight: 4, tags: [] },
  { value: 'lifelong resident', weight: 3, tags: [] },
  { value: 'recent arrival', weight: 2, tags: [] },
  { value: 'visitor', weight: 2, tags: [] },
  { value: 'traveler passing through', weight: 2, tags: ['frontier', 'trade'] },
  { value: 'stationed here', weight: 2, tags: ['military-paramilitary', 'government-bureaucracy'] },
  { value: 'refugee', weight: 1, tags: [] },
  { value: 'immigrant', weight: 1, tags: [] },
  { value: 'exile', weight: 0.5, tags: [] },
  { value: 'prisoner', weight: 0.5, tags: ['enforcement'] },
  { value: 'contract worker', weight: 2, tags: ['business-professional', 'mining'] },
  { value: 'pilgrim', weight: 0.5, tags: ['religion'] },
  { value: 'student', weight: 1, tags: ['education'] },
  { value: 'diplomatic visitor', weight: 0.5, tags: ['government-bureaucracy', 'noble-house'] },
  { value: 'merchant transient', weight: 1, tags: ['trade'] },
  { value: 'settler', weight: 1, tags: ['frontier'] },
  { value: 'returning after a long absence', weight: 1, tags: [] },
  { value: 'displaced by conflict elsewhere', weight: 0.5, tags: ['military-paramilitary'] },
  { value: 'here on temporary assignment', weight: 1, tags: ['business-professional', 'government-bureaucracy'] },
  { value: 'born elsewhere, considers this place home now', weight: 1, tags: [] }
]);
