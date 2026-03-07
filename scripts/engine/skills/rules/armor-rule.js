/**
 * Armor Rule
 *
 * SWSE Rule: Some armor imposes penalties on certain skills.
 *
 * Skills with armorPenalty: true are affected by armor check penalties.
 *
 * Examples:
 * - Acrobatics: affected
 * - Stealth: affected
 * - Swim: affected
 * - Some KS checks: not affected
 *
 * Armor check penalty comes from:
 * - actor.system.derived.armor?.checkPenalty
 * or
 * - actor.system.armor?.checkPenalty
 */

export function armorRule({ actor, skillKey }, result) {
  const skillDef = CONFIG.SWSE?.skills?.[skillKey] || {};

  // If skill is not affected by armor penalties, skip
  if (!skillDef.armorPenalty) {
    result.diagnostics.rulesTriggered.push("armorRule");
    return result;
  }

  // Get armor check penalty from actor
  const armorCheckPenalty =
    actor.system.derived?.armor?.checkPenalty ||
    actor.system.armor?.checkPenalty ||
    0;

  if (armorCheckPenalty !== 0) {
    result.penalties.push({
      source: "Armor Check Penalty",
      value: armorCheckPenalty
    });
    result.warnings.push(`Armor check penalty: ${armorCheckPenalty}`);
  }

  result.diagnostics.rulesTriggered.push("armorRule");
  return result;
}
