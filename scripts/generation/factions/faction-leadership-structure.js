/**
 * PHASE 8D-2 foundation — Faction leadership-structure generator.
 * Thin wrapper over `data/faction-leadership-structures.js`. This
 * describes the SHAPE of power (`rank-metadata.js` stays the internal
 * ladder members climb -- the two are independent and both may be
 * rolled onto the same Faction draft).
 */

import { FACTION_LEADERSHIP_STRUCTURES } from '../data/faction-leadership-structures.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

/** Pick a random leadership-structure entry, optionally biased by organization-family tags. */
export function pickFactionLeadershipStructure({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(FACTION_LEADERSHIP_STRUCTURES, { rng, preferTags });
}
