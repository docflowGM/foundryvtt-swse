/**
 * PHASE 8D-2 foundation — procedural planet government generator.
 * Thin wrapper over `data/planet-governments.js` + the shared
 * weighted-pick primitives — no logic of its own beyond the pick.
 */

import { PLANET_GOVERNMENTS } from '../data/planet-governments.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

/** Pick a random government entry, optionally softly biased by organization-family tags. */
export function pickPlanetGovernment({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(PLANET_GOVERNMENTS, { rng, preferTags });
}
