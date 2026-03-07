/**
 * Rule Pipeline Composer
 *
 * Composable, ordered rule execution.
 * Each rule reads actor + context, returns partial result.
 * Early block stops pipeline.
 *
 * Order matters:
 * 1. Training (hard blocks)
 * 2. Substitution (rewrite skill)
 * 3. Retry (gated attempts)
 * 4. Conditions (status effects)
 * 5. Armor (equipment penalties)
 * 6. Environment (lighting, terrain, concealment)
 * 7. Feats/Species (gating, bonuses)
 */

import { trainingRule } from "./training-rule.js";
import { substitutionRule } from "./substitution-rule.js";
import { retryRule } from "./retry-rule.js";
import { conditionRule } from "./condition-rule.js";
import { armorRule } from "./armor-rule.js";
import { environmentRule } from "./environment-rule.js";
import { featSpeciesRule } from "./feat-species-rule.js";

const RULES = [
  trainingRule,
  substitutionRule,
  retryRule,
  conditionRule,
  armorRule,
  environmentRule,
  featSpeciesRule
];

/**
 * Run all rules in order.
 *
 * @param {Object} payload - Rule execution context
 * @param {Actor} payload.actor
 * @param {string} payload.skillKey
 * @param {string} payload.actionType
 * @param {Object} payload.context
 * @param {Object} payload.registry - SkillAttemptRegistry (injected)
 * @param {Object} payload.result - Result object to populate
 *
 * @returns {Object} Final result
 */
export function runRulePipeline(payload) {
  let result = payload.result;

  for (const rule of RULES) {
    result = rule(payload, result);

    // Hard stop on block
    if (!result.allowed) {
      break;
    }
  }

  return result;
}
