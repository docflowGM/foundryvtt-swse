/**
 * PHASE 8D-1 — pure party capability calculator.
 *
 * Confirmed by reconnaissance: `GMPartyRosterService.getPartyActors()`
 * returns raw Foundry Actor documents; no normalized "party level/
 * capability" exists anywhere in this codebase, and `actor.system.level`
 * is the established read path elsewhere (`houserule-mechanics.js`,
 * `mentor-chat-dialog.js`). This module deliberately accepts already-
 * extracted LEVEL NUMBERS as its core input (`averagePartyLevel()`/
 * `medianPartyLevel()`/`computePartyCapability()`), so the calculation
 * itself stays pure and testable without Foundry; `extractPartyLevels()`
 * is the one small adapter that reads `actor.system.level` off real
 * Actor documents (e.g. the output of `GMPartyRosterService
 * .getPartyActors()`) when a caller has them.
 *
 * Documented choice (phase spec §9: "choose/document a sensible
 * aggregate ... rather than inventing hidden behavior"): AVERAGE level
 * is the party capability figure `reward-estimator.js` consumes. Median
 * is computed and exposed alongside it for a future UI, not used by the
 * estimator itself.
 */

function cleanLevels(levels) {
  return (Array.isArray(levels) ? levels : []).filter((level) => Number.isFinite(level) && level > 0);
}

/** Extract positive, finite `system.level` values from an array of Actor documents. */
export function extractPartyLevels(actors) {
  return (Array.isArray(actors) ? actors : [])
    .map((actor) => Number(actor?.system?.level))
    .filter((level) => Number.isFinite(level) && level > 0);
}

/** Arithmetic mean of positive levels; 0 for an empty/all-invalid input. */
export function averagePartyLevel(levels) {
  const clean = cleanLevels(levels);
  if (!clean.length) return 0;
  return clean.reduce((sum, level) => sum + level, 0) / clean.length;
}

/** Median of positive levels; 0 for an empty/all-invalid input. */
export function medianPartyLevel(levels) {
  const clean = cleanLevels(levels).sort((a, b) => a - b);
  if (!clean.length) return 0;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

/**
 * The party capability figure `reward-estimator.js` reads
 * (`capability` === `average`), plus `median`/`partySize` for display.
 */
export function computePartyCapability(levels) {
  const clean = cleanLevels(levels);
  const average = averagePartyLevel(clean);
  return { average, median: medianPartyLevel(clean), capability: average, partySize: clean.length };
}
