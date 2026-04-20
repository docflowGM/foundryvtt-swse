/**
 * Substitution Rule
 *
 * Determines if an alternative skill can be rolled instead.
 *
 * Examples:
 * - "Insight of the Force" (Force substitutes for Knowledge)
 * - Droid programming alternatives
 * - Skill substitution talents
 *
 * Currently placeholder. Substitutions should be:
 * - Defined in talent database or feat data
 * - Checked against actor's known talents/feats
 * - Validated for context (e.g., in Force-rich environment)
 */

export function substitutionRule({ actor, skillKey, context }, result) {
  // planned: Implement once substitution talent database is available
  // For now, this is a passthrough

  result.diagnostics.rulesTriggered.push("substitutionRule");
  return result;
}
