/**
 * Talent Rules Initializer
 *
 * Registers all talent-based rules into the CombatRulesRegistry.
 * Talent rules apply effects from talents like Weapon Specialization, Power Attack, etc.
 *
 * Called during system initialization by boot-register-rules.
 */

import { CombatRulesRegistry } from "/systems/foundryvtt-swse/scripts/engine/rules/rules-registry.js";
import { SWSELogger } from "/systems/foundryvtt-swse/scripts/utils/logger.js";

// Import talent rule modules
import { weaponSpecializationRule } from "/systems/foundryvtt-swse/scripts/engine/rules/modules/talents/weapon-specialization-rule.js";

/**
 * Initialize all talent rules into the registry.
 * Called during system init (boot-register-rules.js).
 *
 * @returns {number} Count of registered talent rules
 */
export function initializeTalentRules() {
  const talentRules = [
    weaponSpecializationRule
    // Future talent rules: powerAttackRule, penetratingAttackRule, etc.
  ];

  for (const rule of talentRules) {
    CombatRulesRegistry.register(rule);
  }

  SWSELogger.info(`Registered ${talentRules.length} talent rules`, {
    rules: talentRules.map(r => r.id)
  });

  return talentRules.length;
}

export default initializeTalentRules;
