/**
 * Condition Penalty Rule — DEPRECATED / UNUSED
 *
 * This rule was part of the early CombatRulesRegistry architecture.
 * However, the WeaponsEngine.evaluateAttack() system that uses this registry
 * is not currently integrated into the live attack rolling pipeline.
 *
 * CURRENT BEHAVIOR (Phase 1 Consolidation):
 * - Condition Track penalties are applied in TWO places:
 *   1. DerivedCalculator.computeAll() (line 339-340): For skill totals
 *   2. computeAttackBonus() in attacks.js (line 45-47): For attack rolls
 * - Both read from actor.system.derived.damage.conditionPenalty (canonical source)
 * - This rule remains registered but unused to maintain registry structure
 * - Future migration: Either activate WeaponsEngine fully OR remove this rule
 *
 * planned: Phase 2 - Decide between:
 * A) Activate WeaponsEngine.evaluateAttack() as primary combat path + remove computeAttackBonus()
 * B) Deprecated this rule and clean up CombatRulesRegistry
 */

import { RuleCategories } from "/systems/foundryvtt-swse/scripts/engine/rules/rules-registry.js";

export const conditionPenaltyRule = {
  id: "core.condition-penalty",
  type: RuleCategories.ATTACK,
  priority: 70,  // Late in pipeline

  applies: ({ actor }) => {
    return !!actor;
  },

  apply: (payload, result) => {
    // NOTE: This rule is currently unused. Condition penalties are applied
    // directly in computeAttackBonus() and DerivedCalculator.
    // This rule exists only to maintain registry structure for future migration.

    const { actor } = payload;

    const ctPenalty = actor.system?.derived?.damage?.conditionPenalty ??
                      actor.system?.conditionTrack?.penalty ??
                      0;
    if (ctPenalty !== 0) {
      result.attack.penalties.push({
        source: 'Condition Track',
        value: ctPenalty
      });
      result.diagnostics.rulesTriggered.push("core.condition-penalty");
    }

    return result;
  }
};

export default conditionPenaltyRule;
