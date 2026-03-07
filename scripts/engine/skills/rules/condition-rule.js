/**
 * Condition Rule
 *
 * Applies penalties from actor's condition track and status effects.
 *
 * Condition Track:
 * - Step 0: No penalty
 * - Step 1: -1
 * - Step 2: -2
 * - Step 3: -5
 * - Step 4: -10
 * - Step 5: Helpless (special)
 *
 * Status Effects:
 * - flatFooted: possible penalties
 * - immobilized: affects mobility skills
 * - helpless: major restrictions
 */

export function conditionRule({ actor, skillKey, context }, result) {
  const conditionTrack = actor.system.conditionTrack || {};
  const step = Number(conditionTrack.current ?? 0);
  const helpless = step >= 5;

  // Condition track penalties
  const conditionPenalties = [0, -1, -2, -5, -10, 0]; // helpless = no numeric penalty
  const penalty = conditionPenalties[step] ?? 0;

  if (penalty !== 0) {
    result.penalties.push({
      source: "Condition Track",
      value: penalty
    });
    result.warnings.push(`Condition track penalty: ${penalty}`);
  }

  // Helpless status: cannot attempt most skills
  if (helpless) {
    // Some skills might still be possible while helpless (perception?), but most are blocked
    // This is a soft warning; enforcement decision left to skill-specific rules
    result.warnings.push("You are helpless");
  }

  // Flat-footed affects some skills (balance, acrobatics, etc.)
  if (context.combat?.flatFooted) {
    result.warnings.push("You are flat-footed");
    // Some skills may apply additional penalties
  }

  // Immobilized affects mobility skills
  if (context.combat?.targetImmobilized) {
    result.warnings.push("Target is immobilized");
  }

  result.diagnostics.rulesTriggered.push("conditionRule");
  return result;
}
