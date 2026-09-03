/**
 * PHASE 8D-2 foundation — Faction goals generator.
 *
 * `generateFactionGoalSet()` rolls THREE independent goal facts:
 * `publicGoal`/`actualGoal` (both from `FACTION_LONG_TERM_GOALS`,
 * rolled separately -- they coincide only when the same entry happens
 * to come up twice, which is the deliberate design: most Factions end
 * up with a public goal that at least slightly differs from their real
 * one) and `currentObjective` (from the separate, short-term
 * `FACTION_CURRENT_OBJECTIVES` pool). See `data/faction-goals.js`'s
 * header for the full rationale.
 */

import { FACTION_LONG_TERM_GOALS, FACTION_CURRENT_OBJECTIVES } from '../data/faction-goals.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';

/** Pick a single random long-term-goal entry (used for both public and actual goal rolls). */
export function pickFactionLongTermGoal({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(FACTION_LONG_TERM_GOALS, { rng, preferTags });
}

/** Pick a single random current-objective entry. */
export function pickFactionCurrentObjective({ rng, preferTags = [] } = {}) {
  return weightedPickWithPreference(FACTION_CURRENT_OBJECTIVES, { rng, preferTags });
}

/**
 * Roll a full goal set: `{ publicGoal, actualGoal, currentObjective }`
 * (each `{ value, weight, tags }`), rolled in that exact order.
 */
export function generateFactionGoalSet({ rng, preferTags = [] } = {}) {
  const publicGoal = pickFactionLongTermGoal({ rng, preferTags });
  const actualGoal = pickFactionLongTermGoal({ rng, preferTags });
  const currentObjective = pickFactionCurrentObjective({ rng, preferTags });
  return { publicGoal, actualGoal, currentObjective };
}
