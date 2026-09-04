/**
 * PHASE 8D-2 foundation — procedural POI template pick. Thin wrapper
 * over `data/poi-templates.js`.
 *
 * CORRECTED (Phase 8D-2 independent review, round 1): `pickPoiTemplate()`
 * alone could only ever soft-deprioritize an incompatible POI/planet
 * combination via `preferTags`, never actually exclude one (the
 * review's own example: an uninhabited barren world could still roll
 * "Market District", just less often). `pickCompatiblePoiTemplate()`
 * adds a HARD filter on top, using `data/poi-templates.js`'s
 * `requiredPlanetTags`/`excludedPlanetTags`/`populationRequirements`
 * fields (see that file's header) -- `pickPoiTemplate()` itself is
 * UNCHANGED (still soft-only) for a caller with no planet context to
 * filter against.
 *
 * CORRECTED (round 2): the soft preference match previously read only
 * `entry.tags` (via `weightedPickWithPreference()`'s default tag
 * reader), so a template's `biomes` (round 2's biome/tag split) and
 * its `economyTags`/`governmentTags` (round 1) never actually
 * influenced which template got picked -- declared metadata with no
 * effect. `preferenceWeight()` now boosts a template's weight against
 * `biomes`+`tags`+`economyTags`+`governmentTags` merged together, so a
 * caller that passes a planet's government tags (see
 * `poi-generator.js`) actually sees a Government Complex or Noble
 * Estate skew toward a matching government, not just a matching
 * economy/biome.
 */

import { POI_TEMPLATES } from '../data/poi-templates.js';
import { mergeTags } from '../lib/tag-utils.js';
import { weightedPick, weightedPickWithPreference } from '../lib/weighted-random.js';

/** Pick a random POI template entry, softly biased by `preferTags` (typically the parent planet's world-class/economy/government tags). No hard filtering -- see `pickCompatiblePoiTemplate()` for that. */
export function pickPoiTemplate({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(POI_TEMPLATES, { rng, preferTags });
}

/**
 * Filter `templates` down to those structurally COMPATIBLE with the
 * given planet context: every `requiredPlanetTags` entry present in
 * `planetTags`, no `excludedPlanetTags` entry present in `planetTags`,
 * and (when `populationScale` is supplied and the template declares
 * requirements) `populationScale` included in the template's own
 * `populationRequirements`. A template with empty requirement arrays
 * is compatible with everything (e.g. `ruins`, `cave-network`).
 */
export function filterCompatiblePoiTemplates(templates, { planetTags = [], populationScale = '' } = {}) {
  return (Array.isArray(templates) ? templates : []).filter((entry) => {
    if (entry.requiredPlanetTags?.length && !entry.requiredPlanetTags.every((tag) => planetTags.includes(tag))) return false;
    if (entry.excludedPlanetTags?.length && entry.excludedPlanetTags.some((tag) => planetTags.includes(tag))) return false;
    if (populationScale && entry.populationRequirements?.length && !entry.populationRequirements.includes(populationScale)) return false;
    return true;
  });
}

/**
 * Weighted pick over `pool`, boosting an entry whose merged
 * `biomes`+`tags`+`economyTags`+`governmentTags` intersects
 * `preferTags` -- unlike `weightedPickWithPreference()`'s default tag
 * reader (`entry.tags` only), this actually honors all four soft-
 * preference fields a POI template declares.
 */
function pickTemplateWithPreference(pool, { rng, preferTags = [], preferenceBoost = 3 } = {}) {
  const weightOf = (entry) => {
    const base = Number(entry?.weight ?? 1);
    if (!preferTags.length) return base;
    const tags = mergeTags(entry.biomes, entry.tags, entry.economyTags, entry.governmentTags);
    return base * (preferTags.some((tag) => tags.includes(tag)) ? preferenceBoost : 1);
  };
  return weightedPick(pool, { rng, weightOf });
}

/**
 * Pick a POI template with the HARD compatibility filter applied
 * first, then a soft `preferTags` weighted pick (against
 * `biomes`+`tags`+`economyTags`+`governmentTags` together -- see
 * `pickTemplateWithPreference()`) among whatever survives. Returns
 * `{ entry, contextMismatch }`: when the hard filter would eliminate
 * EVERY template (an over-constrained context), this falls back to
 * picking from the FULL pool rather than returning `null` (a POI
 * generator should never simply fail to produce anything), and
 * `contextMismatch` is `true` so the caller can attach a
 * `DIAGNOSTIC_CODE.POI_CONTEXT_MISMATCH` note rather than silently
 * hiding the fact that nothing actually fit.
 */
export function pickCompatiblePoiTemplate({ rng, preferTags = [], planetTags = [], populationScale = '' } = {}) {
  const compatible = filterCompatiblePoiTemplates(POI_TEMPLATES, { planetTags, populationScale });
  const contextMismatch = compatible.length === 0;
  const pool = contextMismatch ? POI_TEMPLATES : compatible;
  return { entry: pickTemplateWithPreference(pool, { rng, preferTags }), contextMismatch };
}
