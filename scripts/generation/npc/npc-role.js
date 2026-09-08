/**
 * PHASE 8D-3B production — NPC role/occupation picker (living + droid).
 *
 * Thin composition over `data/npc-roles.js`/`data/npc-droid-roles.js`,
 * matching every other Phase 8D-2 "pool wrapper" module's shape
 * (`factions/faction-goals.js` etc.) — this module owns no table data
 * of its own, only pick logic.
 *
 * `commandTier` (an OPTIONAL `rank-metadata.js` `COMMAND_TIER` value)
 * softly informs which role TIER (`common`/`specialist`/`leadership`)
 * is more plausible via `COMMAND_TIER_TO_ROLE_TIER_BIAS` below — never a
 * hard filter (a `RANK_AND_FILE` sentry with an unusual specialist
 * background is still possible), and never itself a mechanical/level
 * derivation — this only shifts which role-tier bucket is weighted
 * favorably before the ordinary `weightedPickWithPreference()` tag
 * roll runs.
 */

import { NPC_ROLES, NPC_ROLE_TIER } from '../data/npc-roles.js';
import { NPC_DROID_ROLES } from '../data/npc-droid-roles.js';
import { weightedPickWithPreference } from '../lib/weighted-random.js';
import { COMMAND_TIER } from '../rank-metadata.js';

/**
 * Default role-tier bias per command tier — which tier(s) get a soft
 * weight multiplier before the tag-preference roll. Deliberately a
 * SOFT multiplier (applied the same way `weightedPickWithPreference()`
 * already boosts tag matches), not an exclusion: every role stays
 * reachable regardless of commandTier.
 */
const COMMAND_TIER_TO_ROLE_TIER_BIAS = Object.freeze({
  [COMMAND_TIER.NONE]: NPC_ROLE_TIER.COMMON,
  [COMMAND_TIER.RANK_AND_FILE]: NPC_ROLE_TIER.COMMON,
  [COMMAND_TIER.FIRETEAM_LEADERSHIP]: NPC_ROLE_TIER.COMMON,
  [COMMAND_TIER.SQUAD_COMMAND]: NPC_ROLE_TIER.LEADERSHIP,
  [COMMAND_TIER.SPECIALIST]: NPC_ROLE_TIER.SPECIALIST,
  [COMMAND_TIER.SENIOR_SPECIALIST]: NPC_ROLE_TIER.SPECIALIST,
  [COMMAND_TIER.JUNIOR_COMMAND]: NPC_ROLE_TIER.LEADERSHIP,
  [COMMAND_TIER.TACTICAL_COMMAND]: NPC_ROLE_TIER.LEADERSHIP,
  [COMMAND_TIER.OPERATIONAL_COMMAND]: NPC_ROLE_TIER.LEADERSHIP,
  [COMMAND_TIER.STRATEGIC_COMMAND]: NPC_ROLE_TIER.LEADERSHIP
});

function boostedPool(pool, tierBias, tierBoost) {
  if (!tierBias) return pool;
  return pool.map((entry) => (entry.tier === tierBias ? { ...entry, weight: Number(entry.weight ?? 1) * tierBoost } : entry));
}

/**
 * Pick one living-NPC role entry `{ value, weight, tags, tier }`.
 * `preferTags` softly biases by organization-family/economy-context tags
 * (same mechanism as every other Phase 8D pool); `commandTier` softly
 * biases which role TIER bucket is favored (see module doc).
 */
export function pickNpcRole({ rng, preferTags = [], commandTier = COMMAND_TIER.NONE, tierBoost = 4 } = {}) {
  const tierBias = COMMAND_TIER_TO_ROLE_TIER_BIAS[commandTier] || null;
  const pool = boostedPool(NPC_ROLES, tierBias, tierBoost);
  return weightedPickWithPreference(pool, { rng, preferTags });
}

/**
 * Pick one droid role entry `{ value, weight, tags, chassisSuggestion,
 * tier }`. Same soft-bias mechanism as `pickNpcRole()`.
 */
export function pickNpcDroidRole({ rng, preferTags = [], commandTier = COMMAND_TIER.NONE, tierBoost = 4 } = {}) {
  const tierBias = COMMAND_TIER_TO_ROLE_TIER_BIAS[commandTier] || null;
  const pool = boostedPool(NPC_DROID_ROLES, tierBias, tierBoost);
  return weightedPickWithPreference(pool, { rng, preferTags });
}
