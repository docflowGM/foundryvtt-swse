/**
 * Feat/Species Rule
 *
 * Checks for feat or species-based gating and bonuses.
 *
 * Examples:
 * - Skill Focus feat: grants bonus
 * - Species trait bonuses: "Twileks get +2 to Deception"
 * - Required feat: "Cannot use this advanced technique without Feat X"
 * - Species trait restrictions: "Only available to [Species]"
 *
 * Currently placeholder. Implementation depends on:
 * - Feat database integration
 * - Species trait engine
 * - Actor's feat/talent inventory
 */

export function featSpeciesRule({ actor, skillKey, context }, result) {
  // planned: Implement once feat/species gate definitions are available
  // For now, this is a passthrough

  result.diagnostics.rulesTriggered.push("featSpeciesRule");
  return result;
}
