/**
 * PHASE 8D-2 foundation — shared tag helpers.
 *
 * `weighted-random.js` already provides `filterByTags()` (require/exclude)
 * and `weightedPickWithPreference()` (soft tag preference). This module
 * adds the smaller string-hygiene helpers those two build on —
 * normalizing/deduping a tag list — so every generator that stamps tags
 * on a draft (Location, Faction, NPC, Job, POI, ...) does it the same
 * way, without a giant global tag enum (existing systems in this repo
 * intentionally use flexible free-text tags, e.g. Location Library's
 * `tags`/`biomes` arrays — this module does not replace that).
 */

/** Lowercase, trim, dedupe a list of tags. Never throws on non-string entries (coerced). */
export function normalizeTags(tags) {
  const seen = new Set();
  const out = [];
  for (const raw of Array.isArray(tags) ? tags : []) {
    const clean = String(raw ?? '').trim().toLowerCase();
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
  }
  return out;
}

/** True if `tags` contains every tag in `required` (case-insensitive). */
export function hasAllTags(tags, required) {
  const pool = new Set(normalizeTags(tags));
  return normalizeTags(required).every((tag) => pool.has(tag));
}

/** True if `tags` contains any tag in `candidates` (case-insensitive). */
export function hasAnyTag(tags, candidates) {
  const pool = new Set(normalizeTags(tags));
  return normalizeTags(candidates).some((tag) => pool.has(tag));
}

/** Merge multiple tag lists into one normalized, deduped list. */
export function mergeTags(...tagLists) {
  return normalizeTags(tagLists.flat());
}
