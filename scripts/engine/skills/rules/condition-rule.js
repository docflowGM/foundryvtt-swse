/**
 * Condition Rule
 *
 * Applies penalties from actor's condition track and status effects.
 *
 * ✅ AUTHORITY PATTERN:
 * Reads condition state via actor methods (the canonical read API).
 * Never duplicates condition logic or calculations.
 * Never mutates condition state.
 *
 * Actor methods as authority:
 * - actor.getConditionTrackState() → { step, max, persistent, helpless }
 * - actor.getConditionPenalty(step) → numeric penalty
 *
 * Status Effects (from context, not calculated here):
 * - flatFooted: affects some skills
 * - immobilized: affects mobility skills
 * - helpless: major restrictions
 */

export function conditionRule({ actor, skillKey, context }, result) {
  // Query actor for condition track state (canonical read API)
  const conditionState = actor.getConditionTrackState?.();
  if (!conditionState) {
    result.diagnostics.rulesTriggered.push("conditionRule");
    return result;
  }

  const { step, helpless } = conditionState;

  // Query actor for condition penalty (never duplicate the calculation)
  const penalty = actor.getConditionPenalty?.(step) ?? 0;

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
