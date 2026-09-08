/**
 * PHASE 8D-3A correction pass — galactic-region generation bias.
 *
 * `planet-profile.js`'s `pickPlanetRegion()` result was previously pure
 * decoration: rolled, stored on the draft, and never read by anything
 * else -- population density, technology, economy, government, world
 * class, and droid prevalence all rolled completely independently of
 * which region a world was said to belong to. This is the fix: one
 * small, centralized, generator-only bias table (never a lore
 * authority, never a hard requirement) mapping each of
 * `planet-profile.js`'s 7 canonical `PLANET_REGION` values to a
 * `preferTags` bundle and an optional `densityBias` -- reusing EXACTLY
 * the same soft-preference/density mechanisms `data/planet-presets.js`
 * already established, never a parallel biasing system.
 *
 * These are SOFT skews, not stereotypes -- a Core Worlds roll makes a
 * dense, institutional, high-tech result somewhat MORE likely, never
 * mandatory (an isolated failed colony in the Core, or a bustling
 * trade hub on the Outer Rim, both remain fully reachable). Mid Rim
 * and Inner Rim are deliberately left with no `preferTags`/`densityBias`
 * at all -- a genuinely neutral middle, not a diluted version of their
 * neighbors.
 */

import { PLANET_REGION } from '../planets/planet-profile.js';

export const REGION_GENERATION_BIAS = Object.freeze({
  'Core Worlds': Object.freeze({ densityBias: 'dense', preferTags: Object.freeze(['urban', 'trade', 'government-bureaucracy', 'technology', 'industrial']) }),
  Colonies: Object.freeze({ densityBias: 'dense', preferTags: Object.freeze(['urban', 'trade']) }),
  'Inner Rim': Object.freeze({ densityBias: '', preferTags: Object.freeze([]) }),
  'Mid Rim': Object.freeze({ densityBias: '', preferTags: Object.freeze([]) }),
  'Outer Rim': Object.freeze({ densityBias: 'sparse', preferTags: Object.freeze(['frontier', 'rural']) }),
  'Wild Space': Object.freeze({ densityBias: 'sparse', preferTags: Object.freeze(['remote', 'isolated', 'frontier']) }),
  'Unknown Regions': Object.freeze({ densityBias: 'sparse', preferTags: Object.freeze(['remote', 'isolated', 'mysterious', 'frontier']) })
});

// Self-check at module load: every PLANET_REGION value must have an
// entry here (even if that entry is intentionally neutral, like Inner
// Rim/Mid Rim) -- catches the table silently drifting out of sync with
// its authority if `planet-profile.js`'s region vocabulary ever
// changes, the same discipline every other Phase 8D catalog enforces.
for (const region of Object.values(PLANET_REGION)) {
  if (!(region in REGION_GENERATION_BIAS)) {
    throw new Error(`planet-region-bias.js: REGION_GENERATION_BIAS is missing an entry for PLANET_REGION value "${region}"`);
  }
}

const EMPTY_BIAS = Object.freeze({ densityBias: '', preferTags: Object.freeze([]) });

/** The region's soft preference tags, or `[]` for an unrecognized/empty region. */
export function regionPreferTagsFor(region) {
  return REGION_GENERATION_BIAS[region]?.preferTags ?? EMPTY_BIAS.preferTags;
}

/** The region's density bias (`'dense'`/`'sparse'`/`''`), or `''` for an unrecognized/empty region. */
export function regionDensityBiasFor(region) {
  return REGION_GENERATION_BIAS[region]?.densityBias ?? EMPTY_BIAS.densityBias;
}
