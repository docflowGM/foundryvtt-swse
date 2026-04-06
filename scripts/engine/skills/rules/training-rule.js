/**
 * Training Rule
 *
 * SWSE Rule: Some skills cannot be used untrained.
 *
 * Skill definition:
 * - untrained: true = untrained use allowed
 * - untrained: false = 
 *
 * Actor skill state:
 * - trained: true = actor has training
 * - trained: false = actor untrained
 *
 * If skill.untrained === false AND actor.trained === false:
 *   ❌ HARD BLOCK
 */

export function trainingRule({ actor, skillKey }, result) {
  const skill = actor.system.skills?.[skillKey];
  if (!skill) {
    return result; // Skill not found, let other rules handle
  }

  // Get skill definition (whether untrained use is allowed)
  const skillDef = CONFIG.SWSE?.skills?.[skillKey] || {};
  const allowedUntrained = skillDef.untrained !== false; // Default to true
  const actorTrained = skill.trained === true;

  // If skill  and actor isn't trained
  if (!allowedUntrained && !actorTrained) {
    result.allowed = false;
    result.reason = `This skill `;
    result.diagnostics.blockedBy = "RequiresTraining";
    result.diagnostics.rulesTriggered.push("trainingRule");
    return result;
  }

  // Untrained penalty
  if (!actorTrained && allowedUntrained) {
    result.warnings.push("You are untrained in this skill");
    // Untrained penalty is typically -5, applied by RollEngine via skill data
  }

  result.diagnostics.rulesTriggered.push("trainingRule");
  return result;
}
