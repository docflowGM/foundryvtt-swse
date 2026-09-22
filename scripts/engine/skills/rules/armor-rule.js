/**
 * Armor Rule
 *
 * SWSE Rule: Some armor (and an active Energy Shield) imposes penalties on
 * certain skills.
 *
 * Skills with armorPenalty: true are affected by armor check penalties.
 *
 * Examples:
 * - Acrobatics: affected
 * - Stealth: affected
 * - Swim: affected
 * - Some KS checks: not affected
 *
 * CONFIRMED DEAD CODE as of the Math Integrity Freeze's Batch 2A audit:
 * CONFIG.SWSE.skills is never populated anywhere in this codebase, so
 * skillDef.armorPenalty above is always falsy and this rule always
 * early-returns before reaching the math below. ModifierEngine's own
 * skill.<key> ACP modifiers (see armor-usage-resolver.js) are the live
 * authority for armor/shield ACP on skills. This function's own formula is
 * still kept correct (matching that shared authority) rather than left as a
 * second, wrong implementation, in case CONFIG.SWSE.skills is ever
 * populated and this rule becomes live again.
 */

import { resolveArmorUsageEffects } from "/systems/foundryvtt-swse/scripts/engine/effects/armor-usage-resolver.js";

export function armorRule({ actor, skillKey }, result) {
  const skillDef = CONFIG.SWSE?.skills?.[skillKey] || {};

  // If skill is not affected by armor penalties, skip
  if (!skillDef.armorPenalty) {
    result.diagnostics.rulesTriggered.push("armorRule");
    return result;
  }

  // Single shared authority for body-armor and active-Energy-Shield ACP:
  // proficiency suppresses ordinary armor's ACP entirely, but never
  // suppresses an active Energy Shield's ACP.
  const armorCheckPenalty = resolveArmorUsageEffects(actor).skillCheckPenalty;

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
