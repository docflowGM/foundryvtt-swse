/**
 * PHASE 8D-1 — objective tier/difficulty economy constants.
 *
 * Centralized, configurable generator/economy tuning constants consumed
 * by `reward-estimator.js`. These are NOT official SWSE combat/economy
 * rules — they are this generator's payout curve, kept in one place so
 * later balancing never requires rewriting business logic elsewhere.
 *
 * Confirmed by reconnaissance: `GMJobBoardSurfaceService.js` already
 * establishes `primary`/`secondary`/`tertiary` as the real Job objective
 * tiers (see `normalizeObjective()`/`objectiveTypeLabel()`), which this
 * module's `OBJECTIVE_TIER` reuses verbatim rather than inventing new
 * tier names. No existing "difficulty" concept was found anywhere in the
 * Job Board code — difficulty is new generator-only metadata that lives
 * on a generated objective DRAFT, not on the real Job objective schema
 * (which has no difficulty field and is not being extended here).
 *
 * HARD RULE (per the phase spec, §7): Objective Difficulty and Faction
 * Scale are separate concepts and must never be conflated. A Scale-19
 * government can issue a routine courier mission; a Scale-3 cult can
 * issue an extreme tomb-delving mission. Difficulty feeds
 * `reward-estimator.js` through `DIFFICULTY_REWARD_MODIFIER`; Scale
 * feeds it through `organization-metadata.js`'s
 * `scaleResourceMultiplier()`. They are multiplied together, never
 * merged into one input.
 */

/** Real Job Board objective tiers (matches GMJobBoardSurfaceService.js). */
export const OBJECTIVE_TIER = Object.freeze({
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  TERTIARY: 'tertiary'
});

export const OBJECTIVE_TIERS = Object.freeze([OBJECTIVE_TIER.PRIMARY, OBJECTIVE_TIER.SECONDARY, OBJECTIVE_TIER.TERTIARY]);

export function isObjectiveTier(value) {
  return OBJECTIVE_TIERS.includes(value);
}

/**
 * Baseline compensation weight per tier — a mission's total "objective
 * weight" is the sum of `TIER_REWARD_WEIGHT[tier] * DIFFICULTY_REWARD_MODIFIER[difficulty]`
 * across every generated objective, so more objectives (and harder
 * objectives) both increase suggested payout.
 */
export const TIER_REWARD_WEIGHT = Object.freeze({
  [OBJECTIVE_TIER.PRIMARY]: 1.00,
  [OBJECTIVE_TIER.SECONDARY]: 0.45,
  [OBJECTIVE_TIER.TERTIARY]: 0.20
});

/** Difficulty bands, routine (easiest) through extreme (hardest). */
export const OBJECTIVE_DIFFICULTY = Object.freeze({
  ROUTINE: 'routine',
  STANDARD: 'standard',
  DIFFICULT: 'difficult',
  SEVERE: 'severe',
  EXTREME: 'extreme'
});

export const OBJECTIVE_DIFFICULTIES = Object.freeze([
  OBJECTIVE_DIFFICULTY.ROUTINE,
  OBJECTIVE_DIFFICULTY.STANDARD,
  OBJECTIVE_DIFFICULTY.DIFFICULT,
  OBJECTIVE_DIFFICULTY.SEVERE,
  OBJECTIVE_DIFFICULTY.EXTREME
]);

export function isObjectiveDifficulty(value) {
  return OBJECTIVE_DIFFICULTIES.includes(value);
}

export const DIFFICULTY_REWARD_MODIFIER = Object.freeze({
  [OBJECTIVE_DIFFICULTY.ROUTINE]: 0.75,
  [OBJECTIVE_DIFFICULTY.STANDARD]: 1.00,
  [OBJECTIVE_DIFFICULTY.DIFFICULT]: 1.35,
  [OBJECTIVE_DIFFICULTY.SEVERE]: 1.75,
  [OBJECTIVE_DIFFICULTY.EXTREME]: 2.25
});

/**
 * Combined per-objective reward weight: tier baseline × difficulty
 * modifier. This is the one function `reward-estimator.js` calls per
 * generated objective — never re-derive the multiplication elsewhere.
 */
export function objectiveRewardWeight({ tier, difficulty }) {
  const tierWeight = TIER_REWARD_WEIGHT[tier] ?? TIER_REWARD_WEIGHT[OBJECTIVE_TIER.SECONDARY];
  const difficultyModifier = DIFFICULTY_REWARD_MODIFIER[difficulty] ?? DIFFICULTY_REWARD_MODIFIER[OBJECTIVE_DIFFICULTY.STANDARD];
  return tierWeight * difficultyModifier;
}
