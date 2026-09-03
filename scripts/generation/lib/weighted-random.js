/**
 * PHASE 8D-1 — shared weighted-random-selection primitives.
 *
 * Confirmed by reconnaissance before writing this file: no shared,
 * exported, RNG-injectable weighted-selection utility exists anywhere in
 * this repo. `chargen-shared.js` has private, unexported `_pickRandom()`/
 * `_pickWeightedSource()` helpers that call `Math.random()` directly and
 * are not reusable or testable in isolation. This module is therefore new
 * primitive, not a duplicate of existing authority.
 *
 * Every function accepts an explicit `rng` (a zero-arg function returning
 * a float in [0,1)) so callers — and this module's own tests — can inject
 * a deterministic RNG instead of `Math.random()`. Pure functions only: no
 * module-level state, no Foundry dependency, safe to import from a bare
 * Node process.
 */

const defaultRng = () => Math.random();

/** Clamp `value` into [min, max]. */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/** Uniform pick from `items`. Returns null for an empty/non-array input. */
export function pickRandom(items, { rng = defaultRng } = {}) {
  if (!Array.isArray(items) || items.length === 0) return null;
  const index = clamp(Math.floor(rng() * items.length), 0, items.length - 1);
  return items[index];
}

/** Uniform inclusive integer in [min, max] (order-independent). */
export function randomIntInclusive(min, max, { rng = defaultRng } = {}) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return lo + Math.floor(rng() * (hi - lo + 1));
}

/**
 * Weighted pick over entries carrying a numeric weight (default reader:
 * `entry.weight`, default value 1 when absent). Entries with a resolved
 * weight <= 0 are excluded from the roll. Returns null when the pool is
 * empty or every entry weighs zero or less.
 */
export function weightedPick(entries, { rng = defaultRng, weightOf = (entry) => Number(entry?.weight ?? 1) } = {}) {
  const pool = (Array.isArray(entries) ? entries : []).filter((entry) => weightOf(entry) > 0);
  if (!pool.length) return null;
  const total = pool.reduce((sum, entry) => sum + weightOf(entry), 0);
  let roll = rng() * total;
  for (const entry of pool) {
    roll -= weightOf(entry);
    if (roll <= 0) return entry;
  }
  // Floating-point fallback: the roll should always land inside the loop
  // above, but guard against a rounding edge case landing just past total.
  return pool[pool.length - 1];
}

/**
 * Filter entries by tag: `requireTags` (every listed tag must be present
 * on `entry.tags`) and/or `excludeTags` (no listed tag may be present).
 * Returns a NEW array; never mutates the input. With no filters supplied,
 * returns a shallow copy of the pool unchanged.
 */
export function filterByTags(entries, { requireTags = [], excludeTags = [] } = {}) {
  const pool = Array.isArray(entries) ? entries : [];
  if (!requireTags.length && !excludeTags.length) return pool.slice();
  return pool.filter((entry) => {
    const tags = Array.isArray(entry?.tags) ? entry.tags : [];
    if (requireTags.length && !requireTags.every((tag) => tags.includes(tag))) return false;
    if (excludeTags.length && excludeTags.some((tag) => tags.includes(tag))) return false;
    return true;
  });
}

/**
 * Weighted pick with a soft tag preference: an entry carrying any tag in
 * `preferTags` has its weight multiplied by `preferenceBoost` (default 3)
 * before the roll. This is a SOFT bias, never a hard filter — an entry
 * without a preferred tag stays eligible, matching the design goal that
 * "the generator can still occasionally ignore the tags to keep things
 * from becoming predictable."
 */
export function weightedPickWithPreference(entries, {
  rng = defaultRng,
  preferTags = [],
  preferenceBoost = 3,
  weightOf = (entry) => Number(entry?.weight ?? 1)
} = {}) {
  const pool = Array.isArray(entries) ? entries : [];
  if (!pool.length) return null;
  const boosted = pool.map((entry) => {
    const tags = Array.isArray(entry?.tags) ? entry.tags : [];
    const matches = preferTags.length > 0 && preferTags.some((tag) => tags.includes(tag));
    return { entry, weight: weightOf(entry) * (matches ? preferenceBoost : 1) };
  });
  const picked = weightedPick(boosted, { rng, weightOf: (boostedEntry) => boostedEntry.weight });
  return picked ? picked.entry : null;
}

/**
 * A small, seedable deterministic RNG (mulberry32) for tests only. NOT a
 * cryptographic RNG and never appropriate as a production default — every
 * exported function above defaults to `Math.random()` and only uses this
 * when a caller explicitly injects it via `{ rng }`.
 */
export function makeSeededRng(seed) {
  let state = seed >>> 0;
  return function seededRng() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
