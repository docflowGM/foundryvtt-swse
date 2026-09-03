/**
 * PHASE 8D-2 foundation — procedural planet hazard generator. Thin
 * wrapper over `data/planet-hazards.js`. See that file's header for the
 * GENERATE-tier-only (never a real encounter/statblock) scope note.
 */

import { PLANET_HAZARDS } from '../data/planet-hazards.js';
import { weightedPickUniqueN } from '../lib/weighted-random.js';

/** Pick up to `count` distinct hazard entries (0 is valid -- "no notable hazards" is also a real table entry). */
export function pickPlanetHazards({ rng, preferTags = [], count = 1 } = {}) {
  return weightedPickUniqueN(PLANET_HAZARDS, count, { rng, preferTags });
}
