/**
 * Condition Track Adapter
 *
 * Collects condition track entries for the effects display.
 * Preserves all existing behavior: step detection, penalty text, persistent warnings.
 */

import {
  getConditionStep,
  isPersistentCondition,
  conditionPenaltyForStep,
  severityForStep
} from "./effect-card-utils.js";

export class ConditionTrackAdapter {
  /**
   * Collect condition track entries.
   * @param {Actor} actor - The actor
   * @param {Object} context - Aggregator context (unused in this adapter)
   * @returns {Array} Array of condition track cards (0 or 1 card)
   */
  static collect(actor, context = {}) {
    const step = getConditionStep(actor);
    const persistent = isPersistentCondition(actor);
    if (step <= 0 && !persistent) return [];

    const label = step > 0 ? `Condition Track ${conditionPenaltyForStep(step)}` : "Persistent Condition";
    const details = [];
    if (step > 0) details.push(`Current condition step: ${conditionPenaltyForStep(step)}`);
    if (persistent) details.push("Persistent until recovered or removed by the GM/system.");

    return [{
      id: "condition-track-current",
      label,
      type: "conditionTrack",
      severity: severityForStep(step),
      source: "Condition Track",
      text: details.join(" "),
      details,
      gmEnforced: false,
      mechanical: true
    }];
  }
}

export default ConditionTrackAdapter;
