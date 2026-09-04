/**
 * PHASE 8D-2 foundation (restructured in the correction pass) —
 * procedural planet economic-sector generator. Thin wrapper over
 * `data/planet-economies.js`.
 *
 * CORRECTED: a world now has a `primarySector` (single, dominant focus)
 * plus 0-2 `secondarySectors` (distinct from the primary and from each
 * other), matching the requested `primarySector`/`secondarySectors`
 * economy contract, rather than an undifferentiated flat list.
 */

import { PLANET_ECONOMIES } from '../data/planet-economies.js';
import { weightedPickWithPreference, weightedPickUniqueN } from '../lib/weighted-random.js';

/** Pick a single random economy-sector entry. */
export function pickPlanetEconomySector({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(PLANET_ECONOMIES, { rng, preferTags });
}

/** Pick the primary sector, then up to `secondaryCount` distinct secondary sectors (never the same entry as the primary or each other). */
export function generatePlanetEconomySectors({ rng, preferTags = [], secondaryCount = 1 } = {}) {
  const primarySector = pickPlanetEconomySector({ rng, preferTags });
  const remainder = PLANET_ECONOMIES.filter((entry) => entry !== primarySector);
  const secondarySectors = weightedPickUniqueN(remainder, secondaryCount, { rng, preferTags });
  return { primarySector, secondarySectors };
}
