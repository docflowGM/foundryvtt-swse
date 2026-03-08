/**
 * Core Rules Module Initialization
 *
 * Registers fundamental combat rules that are always active.
 * Import this module to boot the core rule system.
 */

import { CombatRulesRegistry } from "/systems/foundryvtt-swse/scripts/engine/rules/rules-registry.js";
import { proficiencyRule } from "/systems/foundryvtt-swse/scripts/engine/rules/modules/core/proficiency-rule.js";
import { criticalRule } from "/systems/foundryvtt-swse/scripts/engine/rules/modules/core/critical-rule.js";

/**
 * Bootstrap core rules.
 * Call this during system initialization to register core rules.
 */
export function initializeCoreRules() {
  CombatRulesRegistry.registerBatch([
    proficiencyRule,
    criticalRule
  ]);

  console.log("[CombatRulesRegistry] Core rules initialized");
}

export default initializeCoreRules;
