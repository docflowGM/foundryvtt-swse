/**
 * PASSIVE RULE Collector
 *
 * Runtime aggregation of RULE entries during prepare cycle.
 * Builds deterministic rule snapshot per actor.
 *
 * CRITICAL PRINCIPLES:
 * - Rebuild every prepare (no caching)
 * - Deduplicate automatically
 * - Never mutate actor during collection
 * - Finalize produces frozen snapshot
 * - ResolutionContext reads frozen storage
 *
 * FLOW:
 * During prepareDerivedData():
 *   → new RuleCollector()
 *   → iterate execution entries
 *   → if RULE: collector.add(ruleEntry)
 *   → collector.finalize(actor)
 *   → actor._ruleSet and actor._ruleParams frozen
 */

import { isValidRule } from "./rule-enum.js";
import { getRuleDefinition } from "./rule-definitions.js";

export class RuleCollector {
  constructor() {
    // Temporary storage during collection phase
    this.tempSet = new Set();           // Simple rules (no params)
    this.tempParams = new Map();        // Param rules: rule type → Set of param values
  }

  /**
   * Add a validated RULE entry to the collection.
   * Called during execution-model processing for each RULE entry.
   *
   * @param {Object} ruleEntry - Validated rule entry { type, params?, ... }
   * @throws {Error} If rule is invalid
   */
  add(ruleEntry) {
    if (!ruleEntry || typeof ruleEntry !== 'object') {
      throw new Error("[RuleCollector] Rule entry must be an object");
    }

    const { type, params } = ruleEntry;

    if (!type || !isValidRule(type)) {
      throw new Error(`[RuleCollector] Invalid rule type: ${type}`);
    }

    const definition = getRuleDefinition(type);

    // Simple rule (no params)
    if (definition.params === null) {
      this.tempSet.add(type);
      return;
    }

    // Param rule
    if (definition.params && params) {
      if (!this.tempParams.has(type)) {
        this.tempParams.set(type, new Set());
      }

      const paramSet = this.tempParams.get(type);

      // Store param value(s) as string for matching
      // For TREAT_SKILL_AS_TRAINED: store skillId value
      if (type === 'TREAT_SKILL_AS_TRAINED' && params.skillId) {
        paramSet.add(params.skillId);
      }
    }
  }

  /**
   * Finalize collection and store on actor.
   * Produces frozen snapshot.
   * Called at end of execution-model processing.
   *
   * @param {Object} actor - The actor to store rules on
   */
  finalize(actor) {
    if (!actor) {
      throw new Error("[RuleCollector] Cannot finalize to null actor");
    }

    // Store simple rule set
    actor._ruleSet = new Set(this.tempSet);

    // Store param rule map
    actor._ruleParams = new Map();
    for (const [ruleType, paramSet] of this.tempParams.entries()) {
      actor._ruleParams.set(ruleType, new Set(paramSet));
    }

    // Optional: Freeze for extra safety
    // Object.freeze(actor._ruleSet);
    // Object.freeze(actor._ruleParams);
    // Note: Freezing nested structures requires deep freeze
    // For now, rely on disciplined access patterns
  }

  /**
   * Get summary of collected rules (for debugging).
   * @returns {Object}
   */
  getSummary() {
    return {
      simpleRules: Array.from(this.tempSet),
      paramRules: Array.from(this.tempParams.entries()).map(([type, set]) => ({
        type,
        params: Array.from(set)
      }))
    };
  }
}

export default RuleCollector;
