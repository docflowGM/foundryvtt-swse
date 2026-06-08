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
 * Armor check penalty comes from the armor SSOT resolver when possible, with
 * derived actor data retained as compatibility fallback.
 */

import { isEnergyShieldItem, resolveArmorData } from "/systems/foundryvtt-swse/scripts/items/armor-data-resolver.js";

export function armorRule({ actor, skillKey }, result) {
  const skillDef = CONFIG.SWSE?.skills?.[skillKey] || {};

  // If skill is not affected by armor penalties, skip
  if (!skillDef.armorPenalty) {
    result.diagnostics.rulesTriggered.push("armorRule");
    return result;
  }

  // Get armor check penalty from equipped body armor through the armor SSOT.
  const equippedArmor = actor?.items?.find?.(item => item?.type === "armor" && item?.system?.equipped && !isEnergyShieldItem(item));
  const armorCheckPenalty = equippedArmor
    ? resolveArmorData(equippedArmor).armorCheckPenalty
    : actor.system.derived?.armor?.checkPenalty || actor.system.armor?.checkPenalty || 0;

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
