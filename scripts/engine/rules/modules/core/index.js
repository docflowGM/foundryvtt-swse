/**
 * Core Rules Module Initialization
 *
 * Registers fundamental combat rules that are always active.
 * Import this module to boot the core rule system.
 */

import { CombatRulesRegistry } from "/systems/foundryvtt-swse/scripts/engine/rules/rules-registry.js";

// Attack rules
import { baseAttackBonusRule } from "/systems/foundryvtt-swse/scripts/engine/rules/modules/core/base-attack-bonus-rule.js";
import { proficiencyRule } from "/systems/foundryvtt-swse/scripts/engine/rules/modules/core/proficiency-rule.js";
import { abilityModifierRule } from "/systems/foundryvtt-swse/scripts/engine/rules/modules/core/ability-modifier-rule.js";
import { conditionPenaltyRule } from "/systems/foundryvtt-swse/scripts/engine/rules/modules/core/condition-penalty-rule.js";

// Critical rules
import { criticalRule } from "/systems/foundryvtt-swse/scripts/engine/rules/modules/core/critical-rule.js";
import { criticalConfirmBonusRule } from "/systems/foundryvtt-swse/scripts/engine/rules/modules/core/critical-confirm-bonus-rule.js";

// Damage rules
import { damageRule } from "/systems/foundryvtt-swse/scripts/engine/rules/modules/core/damage-rule.js";
import { strengthToDamageRule } from "/systems/foundryvtt-swse/scripts/engine/rules/modules/core/strength-to-damage-rule.js";

// Validation rules
import { reachRule } from "/systems/foundryvtt-swse/scripts/engine/rules/modules/core/reach-rule.js";

/**
 * Bootstrap core rules.
 * Call this during system initialization to register core rules.
 */
export function initializeCoreRules() {
  const coreRules = [
    // Validation rules (priority 5 - very early)
    reachRule,

    // Attack rules (in priority order)
    baseAttackBonusRule,
    proficiencyRule,
    abilityModifierRule,
    conditionPenaltyRule,

    // Critical rules
    criticalRule,
    criticalConfirmBonusRule,

    // Damage rules
    damageRule,
    strengthToDamageRule
  ];

  CombatRulesRegistry.registerBatch(coreRules);

  console.log(`[CombatRulesRegistry] Core rules initialized (${coreRules.length} rules registered)`);
}

export default initializeCoreRules;
