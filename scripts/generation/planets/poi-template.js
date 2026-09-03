/**
 * PHASE 8D-2 foundation — procedural POI template pick. Thin wrapper
 * over `data/poi-templates.js`.
 */

import { POI_TEMPLATES } from '../data/poi-templates.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

/** Pick a random POI template entry, softly biased by `preferTags` (typically the parent planet's world-class/economy/government tags). */
export function pickPoiTemplate({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(POI_TEMPLATES, { rng, preferTags });
}
