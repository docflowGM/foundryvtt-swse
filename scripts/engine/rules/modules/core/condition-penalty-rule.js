/**
 * Condition Penalty Rule — Condition Track Impact
 *
 * Applies Condition Track penalties to attack rolls.
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
